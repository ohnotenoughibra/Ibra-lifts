import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * GET /api/sync/recover
 *
 * Deep recovery — checks ALL possible data sources in priority order:
 *
 * 1. user_store_backups  — hourly snapshots of the full store (richest source)
 * 2. user_store          — current blob (may already have partial data)
 * 3. Individual tables   — legacy workout_logs, profiles, etc.
 *
 * If the current user_store already has rich data, recovery is skipped.
 * Otherwise, the richest backup is returned — complete with gamification,
 * workout logs, mesocycles, and everything else.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // ── Richness scorer — how much useful data does a store blob contain? ──
    const richness = (d: Record<string, unknown>) => {
      let score = 0;
      if (d.isOnboarded) score += 5;
      if (d.user) score += 5;
      if (d.baselineLifts) score += 3;
      if (d.currentMesocycle) score += 3;
      score += (Array.isArray(d.workoutLogs) ? d.workoutLogs.length : 0) * 2;
      score += (Array.isArray(d.meals) ? d.meals.length : 0);
      score += (Array.isArray(d.mesocycleHistory) ? d.mesocycleHistory.length : 0) * 2;
      score += (Array.isArray(d.trainingSessions) ? d.trainingSessions.length : 0);
      score += (Array.isArray(d.bodyWeightLog) ? d.bodyWeightLog.length : 0);
      const gam = d.gamificationStats as Record<string, unknown> | undefined;
      if (gam) {
        score += (Number(gam.totalXP) || Number(gam.totalPoints) || 0) > 0 ? 5 : 0;
        score += (Number(gam.totalWorkouts) || 0) > 0 ? 3 : 0;
        const badges = (gam.badges as unknown[]);
        score += Array.isArray(badges) ? badges.length : 0;
      }
      return score;
    };

    // ── Check current user_store ──
    let currentData: Record<string, unknown> | null = null;
    let currentScore = 0;
    try {
      const { rows } = await sql`SELECT data FROM user_store WHERE user_id = ${userId}`;
      if (rows.length > 0 && rows[0].data) {
        currentData = rows[0].data as Record<string, unknown>;
        currentScore = richness(currentData);
      }
    } catch { /* table may not exist */ }

    // ── Check user_store_backups (the gold mine) ──
    let bestBackup: Record<string, unknown> | null = null;
    let bestBackupScore = 0;
    let bestBackupDate: string | null = null;
    let backupCount = 0;
    try {
      // Get all backups, ordered by workout_count (richest first), then most recent
      const { rows: backupRows } = await sql`
        SELECT data, workout_count, created_at
        FROM user_store_backups
        WHERE user_id = ${userId}
        ORDER BY workout_count DESC, created_at DESC
        LIMIT 20
      `;
      backupCount = backupRows.length;
      for (const row of backupRows) {
        const data = row.data as Record<string, unknown>;
        const score = richness(data);
        if (score > bestBackupScore) {
          bestBackup = data;
          bestBackupScore = score;
          bestBackupDate = row.created_at;
        }
      }
    } catch { /* table may not exist */ }

    // ── If current store is already richer than any backup, skip ──
    if (currentScore > 10 && currentScore >= bestBackupScore) {
      return NextResponse.json({
        recovered: false,
        reason: 'user_store has data',
        currentScore,
        backupsAvailable: backupCount,
      });
    }

    // ── If we have a rich backup, use it — this is the main recovery path ──
    if (bestBackup && bestBackupScore > currentScore) {
      return NextResponse.json({
        recovered: true,
        source: 'backup',
        backupDate: bestBackupDate,
        backupsScanned: backupCount,
        currentScore,
        backupScore: bestBackupScore,
        data: bestBackup,
        stats: {
          hasProfile: !!bestBackup.user && bestBackup.isOnboarded === true,
          workoutLogs: Array.isArray(bestBackup.workoutLogs) ? bestBackup.workoutLogs.length : 0,
          hasGamification: !!bestBackup.gamificationStats,
          hasMesocycle: !!bestBackup.currentMesocycle,
          mesocycleHistory: Array.isArray(bestBackup.mesocycleHistory) ? bestBackup.mesocycleHistory.length : 0,
          hasBaselineLifts: !!bestBackup.baselineLifts,
          badges: (() => {
            const gam = bestBackup.gamificationStats as Record<string, unknown> | undefined;
            return Array.isArray(gam?.badges) ? (gam.badges as unknown[]).length : 0;
          })(),
        },
      });
    }

    // ── Fallback: attempt recovery from individual legacy tables ──

    // 1. Profile
    let profile = null;
    try {
      const { rows } = await sql`SELECT * FROM profiles WHERE id = ${userId}`;
      if (rows.length > 0) profile = rows[0];
    } catch { /* table may not exist */ }

    // 2. Workout logs
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

    // 3. Gamification stats (dedicated table — now dual-written)
    let gamificationStats = null;
    try {
      const { rows } = await sql`SELECT * FROM gamification_stats WHERE user_id = ${userId}`;
      if (rows.length > 0) {
        const g = rows[0];
        // Read badges from badges_json (dual-write column) or fall back to badges
        const badgesRaw = g.badges_json || g.badges;
        const badges = typeof badgesRaw === 'string' ? JSON.parse(badgesRaw) : (badgesRaw || []);
        gamificationStats = {
          totalPoints: g.total_points || 0,
          level: g.level || 1,
          currentStreak: g.current_streak || 0,
          longestStreak: g.longest_streak || 0,
          badges,
          challengesCompleted: g.challenges_completed || 0,
          totalWorkouts: g.total_workouts || 0,
          totalVolume: Number(g.total_volume) || 0,
          personalRecords: g.personal_records || 0,
          lastActiveDate: g.last_workout_date || null,
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
        const latest = rows[0];
        currentMesocycle = typeof latest.data === 'string' ? JSON.parse(latest.data) : latest.data;
        for (let i = 1; i < rows.length; i++) {
          const m = rows[i];
          mesocycleHistory.push(typeof m.data === 'string' ? JSON.parse(m.data) : m.data);
        }
      }
    } catch { /* table may not exist */ }

    // 6. Subscription
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

    // Build recovered user profile
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

    const hasAnything = user || workoutLogs.length > 0 || gamificationStats || currentMesocycle;
    if (!hasAnything) {
      return NextResponse.json({
        recovered: false,
        reason: 'no data found in any source',
        sourcesChecked: ['user_store_backups', 'user_store', 'profiles', 'workout_logs', 'gamification_stats', 'mesocycles', 'baseline_lifts', 'subscriptions'],
        backupsScanned: backupCount,
      });
    }

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
      source: 'legacy_tables',
      data: recoveredData,
      stats: {
        hasProfile: !!user,
        workoutLogs: workoutLogs.length,
        hasGamification: !!gamificationStats,
        hasMesocycle: !!currentMesocycle,
        mesocycleHistory: mesocycleHistory.length,
        hasBaselineLifts: !!baselineLifts,
        hasSubscription: !!subscription,
      },
    });
  } catch (error) {
    console.error('Recovery error:', error);
    return NextResponse.json({ error: 'Recovery failed' }, { status: 500 });
  }
}
