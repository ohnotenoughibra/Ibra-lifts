import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * POST /api/debug/restore
 *
 * Force-restores user_store from the individual database tables.
 * This rebuilds the Zustand sync blob from workout_logs, profiles,
 * mesocycles, gamification_stats, etc.
 *
 * Call this when user_store is empty/corrupted but the individual
 * tables still have data.
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not logged in. Log in first.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // ── Read current user_store ──
    let existingStoreData: Record<string, unknown> = {};
    try {
      const { rows } = await sql`SELECT data FROM user_store WHERE user_id = ${userId}`;
      if (rows.length > 0 && rows[0].data) {
        existingStoreData = rows[0].data as Record<string, unknown>;
      }
    } catch {
      // Table may not exist yet
    }

    // ── Gather data from individual tables ──

    // Profile
    let user = null;
    try {
      const { rows } = await sql`SELECT * FROM profiles WHERE id = ${userId}`;
      if (rows.length > 0) {
        const p = rows[0];
        user = {
          id: p.id,
          name: p.name || session.user.name || '',
          email: p.email || session.user.email || '',
          age: p.age,
          weight: p.weight,
          height: p.height,
          experienceLevel: p.experience_level,
          trainingGoal: p.training_goal || p.goal_focus,
          goalFocus: p.goal_focus,
          trainingIdentity: p.training_identity,
          sessionsPerWeek: p.sessions_per_week,
          trainingDays: typeof p.training_days === 'string' ? JSON.parse(p.training_days) : (p.training_days || []),
          combatTrainingDays: typeof p.combat_training_days === 'string' ? JSON.parse(p.combat_training_days) : (p.combat_training_days || []),
          equipment: typeof p.equipment === 'string' ? JSON.parse(p.equipment) : (p.equipment || []),
          updatedAt: p.updated_at || new Date().toISOString(),
        };
      }
    } catch { /* table may not exist */ }

    // Workout logs (ALL of them)
    let workoutLogs: unknown[] = [];
    try {
      const { rows } = await sql`
        SELECT * FROM workout_logs WHERE user_id = ${userId} ORDER BY date DESC
      `;
      workoutLogs = rows.map(row => ({
        id: row.id,
        mesocycleId: row.mesocycle_id,
        sessionId: row.session_id,
        date: row.date,
        exercises: typeof row.exercises === 'string' ? JSON.parse(row.exercises) : row.exercises,
        totalVolume: row.total_volume,
        duration: row.duration,
        overallRPE: row.overall_rpe,
        soreness: row.soreness,
        energy: row.energy,
        notes: row.notes,
        completed: row.completed,
      }));
    } catch { /* table may not exist */ }

    // Mesocycles
    let currentMesocycle = null;
    const mesocycleHistory: unknown[] = [];
    try {
      const { rows } = await sql`
        SELECT * FROM mesocycles WHERE user_id = ${userId} ORDER BY created_at DESC
      `;
      for (let i = 0; i < rows.length; i++) {
        const m = rows[i];
        const mesocycleData = {
          id: m.id,
          name: m.name,
          startDate: m.start_date,
          endDate: m.end_date,
          weeks: typeof m.weeks === 'string' ? JSON.parse(m.weeks) : m.weeks,
          goalFocus: m.goal_focus,
          splitType: m.split_type,
          status: m.status,
        };
        if (i === 0 && m.status === 'active') {
          currentMesocycle = mesocycleData;
        } else {
          mesocycleHistory.push(mesocycleData);
        }
      }
    } catch { /* table may not exist */ }

    // Gamification
    let gamificationStats = null;
    try {
      const { rows } = await sql`SELECT * FROM gamification_stats WHERE user_id = ${userId}`;
      if (rows.length > 0) {
        const g = rows[0];
        gamificationStats = {
          totalXP: g.total_xp || g.total_points || 0,
          totalPoints: g.total_points || 0,
          level: g.level || 1,
          currentStreak: g.current_streak || 0,
          longestStreak: g.longest_streak || 0,
          totalWorkouts: g.total_workouts || 0,
          totalVolume: g.total_volume || 0,
          personalRecords: g.personal_records || 0,
          lastWorkoutDate: g.last_workout_date || null,
        };
      }
    } catch { /* table may not exist */ }

    // Baseline lifts
    let baselineLifts = null;
    try {
      const { rows } = await sql`SELECT * FROM baseline_lifts WHERE user_id = ${userId}`;
      if (rows.length > 0) {
        const b = rows[0];
        baselineLifts = {
          squat: b.squat,
          deadlift: b.deadlift,
          benchPress: b.bench_press,
          overheadPress: b.overhead_press,
          barbellRow: b.barbell_row,
          pullUp: b.pull_up,
        };
      }
    } catch { /* table may not exist */ }

    // Badges
    let earnedBadges: string[] = [];
    try {
      const { rows } = await sql`SELECT badge_id FROM user_badges WHERE user_id = ${userId}`;
      earnedBadges = rows.map(r => r.badge_id);
    } catch { /* table may not exist */ }

    // ── Check if there's anything to recover ──
    const hasAnything = user || workoutLogs.length > 0 || gamificationStats || currentMesocycle;
    if (!hasAnything) {
      return NextResponse.json({
        restored: false,
        reason: 'No data found in any individual table either. Nothing to recover.',
      });
    }

    // ── Merge recovered data into existing store (don't blow away fields we don't recover) ──
    const mergedData: Record<string, unknown> = { ...existingStoreData };

    if (user) {
      mergedData.user = user;
      mergedData.isOnboarded = true;
    }
    if (workoutLogs.length > 0) mergedData.workoutLogs = workoutLogs;
    if (gamificationStats) mergedData.gamificationStats = gamificationStats;
    if (baselineLifts) mergedData.baselineLifts = baselineLifts;
    if (currentMesocycle) mergedData.currentMesocycle = currentMesocycle;
    if (mesocycleHistory.length > 0) mergedData.mesocycleHistory = mesocycleHistory;
    if (earnedBadges.length > 0) mergedData.earnedBadges = earnedBadges;

    // ── Write back to user_store ──
    const jsonData = JSON.stringify(mergedData);
    await sql`
      CREATE TABLE IF NOT EXISTS user_store (
        user_id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await sql`
      INSERT INTO user_store (user_id, data, updated_at)
      VALUES (${userId}, ${jsonData}::jsonb, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET data = ${jsonData}::jsonb, updated_at = NOW()
    `;

    return NextResponse.json({
      restored: true,
      stats: {
        hasProfile: !!user,
        workoutLogs: workoutLogs.length,
        hasGamification: !!gamificationStats,
        hasMesocycle: !!currentMesocycle,
        mesocycleHistory: mesocycleHistory.length,
        hasBaselineLifts: !!baselineLifts,
        badges: earnedBadges.length,
      },
      message: 'Data restored to user_store. Refresh the app to load it.',
    });
  } catch (error) {
    console.error('Debug restore error:', error);
    return NextResponse.json({ error: 'Restore failed' }, { status: 500 });
  }
}
