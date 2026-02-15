import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * GET /api/sync/recover
 *
 * Deep recovery: when user_store is empty but the individual DB tables
 * (workout_logs, profiles, gamification_stats, etc.) still have data,
 * reconstruct the user's state from those tables.
 *
 * This handles the case where a blank-state sync overwrote user_store
 * but the individual tables were never touched.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Check if user_store already has data — if so, no recovery needed
    try {
      const { rows: storeRows } = await sql`
        SELECT data FROM user_store WHERE user_id = ${userId}
      `;
      if (storeRows.length > 0 && storeRows[0].data) {
        const storeData = storeRows[0].data as Record<string, unknown>;
        const hasLogs = Array.isArray(storeData.workoutLogs) && storeData.workoutLogs.length > 0;
        const hasProfile = storeData.isOnboarded === true && storeData.user;
        if (hasLogs || hasProfile) {
          return NextResponse.json({ recovered: false, reason: 'user_store has data' });
        }
      }
    } catch {
      // Table might not exist — continue with recovery
    }

    // ── Attempt recovery from individual tables ──

    // 1. Profile
    let profile = null;
    try {
      const { rows } = await sql`SELECT * FROM profiles WHERE id = ${userId}`;
      if (rows.length > 0) profile = rows[0];
    } catch { /* table may not exist */ }

    // 2. Workout logs (get ALL of them)
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

    // 3. Gamification stats
    let gamificationStats = null;
    try {
      const { rows } = await sql`SELECT * FROM gamification_stats WHERE user_id = ${userId}`;
      if (rows.length > 0) {
        const g = rows[0];
        gamificationStats = {
          totalXP: g.total_xp || 0,
          level: g.level || 1,
          currentStreak: g.current_streak || 0,
          longestStreak: g.longest_streak || 0,
          badges: typeof g.badges === 'string' ? JSON.parse(g.badges) : (g.badges || []),
          challengesCompleted: g.challenges_completed || 0,
          totalWorkouts: g.total_workouts || 0,
          totalVolume: g.total_volume || 0,
          lastWorkoutDate: g.last_workout_date || null,
        };
      }
    } catch { /* table may not exist */ }

    // 4. Baseline lifts
    let baselineLifts = null;
    try {
      const { rows } = await sql`SELECT * FROM baseline_lifts WHERE user_id = ${userId}`;
      if (rows.length > 0) {
        baselineLifts = rows[0].lifts || rows[0];
      }
    } catch { /* table may not exist */ }

    // 5. Mesocycles
    let currentMesocycle = null;
    const mesocycleHistory: unknown[] = [];
    try {
      const { rows } = await sql`
        SELECT * FROM mesocycles WHERE user_id = ${userId} ORDER BY created_at DESC
      `;
      if (rows.length > 0) {
        // Most recent is current
        const latest = rows[0];
        currentMesocycle = typeof latest.data === 'string' ? JSON.parse(latest.data) : latest.data;
        // Rest are history
        for (let i = 1; i < rows.length; i++) {
          const m = rows[i];
          mesocycleHistory.push(typeof m.data === 'string' ? JSON.parse(m.data) : m.data);
        }
      }
    } catch { /* table may not exist */ }

    // 6. Strength progress
    let strengthProgress: unknown[] = [];
    try {
      const { rows } = await sql`
        SELECT * FROM strength_progress WHERE user_id = ${userId} ORDER BY date DESC
      `;
      strengthProgress = rows;
    } catch { /* table may not exist */ }

    // 7. Subscription
    let subscription = null;
    try {
      const { rows } = await sql`SELECT * FROM subscriptions WHERE user_id = ${userId}`;
      if (rows.length > 0) {
        subscription = {
          tier: rows[0].tier,
          status: rows[0].status,
          paypalSubscriptionId: rows[0].paypal_subscription_id,
          startDate: rows[0].start_date,
          endDate: rows[0].end_date,
        };
      }
    } catch { /* table may not exist */ }

    // ── Build recovered user profile from profiles table ──
    let user = null;
    if (profile) {
      user = {
        id: profile.id,
        name: profile.name || session.user.name || '',
        email: profile.email || session.user.email || '',
        age: profile.age,
        weight: profile.weight,
        height: profile.height,
        experienceLevel: profile.experience_level,
        trainingGoal: profile.training_goal,
        trainingIdentity: profile.training_identity,
        trainingDays: typeof profile.training_days === 'string' ? JSON.parse(profile.training_days) : (profile.training_days || []),
        combatTrainingDays: typeof profile.combat_training_days === 'string' ? JSON.parse(profile.combat_training_days) : (profile.combat_training_days || []),
        equipment: typeof profile.equipment === 'string' ? JSON.parse(profile.equipment) : (profile.equipment || []),
        updatedAt: profile.updated_at || new Date().toISOString(),
      };
    }

    // ── Determine what was recovered ──
    const hasAnything = user || workoutLogs.length > 0 || gamificationStats || currentMesocycle;
    if (!hasAnything) {
      return NextResponse.json({ recovered: false, reason: 'no data found in any table' });
    }

    // Build the recovery payload (matching the Zustand store shape)
    const recoveredData: Record<string, unknown> = {};
    if (user) {
      recoveredData.user = user;
      recoveredData.isOnboarded = true;
    }
    if (workoutLogs.length > 0) recoveredData.workoutLogs = workoutLogs;
    if (gamificationStats) recoveredData.gamificationStats = gamificationStats;
    if (baselineLifts) recoveredData.baselineLifts = baselineLifts;
    if (currentMesocycle) recoveredData.currentMesocycle = currentMesocycle;
    if (mesocycleHistory.length > 0) recoveredData.mesocycleHistory = mesocycleHistory;
    if (subscription) recoveredData.subscription = subscription;

    return NextResponse.json({
      recovered: true,
      data: recoveredData,
      stats: {
        hasProfile: !!user,
        workoutLogs: workoutLogs.length,
        hasGamification: !!gamificationStats,
        hasMesocycle: !!currentMesocycle,
        mesocycleHistory: mesocycleHistory.length,
        strengthEntries: strengthProgress.length,
        hasSubscription: !!subscription,
      },
    });
  } catch (error) {
    console.error('Recovery error:', error);
    return NextResponse.json({ error: 'Recovery failed' }, { status: 500 });
  }
}
