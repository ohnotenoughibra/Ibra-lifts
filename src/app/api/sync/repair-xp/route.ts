import { sql, db } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { calculateLevel } from '@/lib/gamification';
import { createBackupIfEligible } from '@/lib/db-backup';

export const dynamic = 'force-dynamic';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sync/repair-xp
 *
 * One-time repair: scans current data + all backups for the highest totalPoints,
 * then patches the live user_store and gamification_stats to that value.
 * This fixes XP/level regression caused by the stale-lastSyncAt bug.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Optional: accept a manual XP override from the request body
    let manualXP: number | null = null;
    try {
      const body = await request.json();
      if (body.totalPoints && typeof body.totalPoints === 'number' && body.totalPoints > 0) {
        manualXP = body.totalPoints;
      }
    } catch {
      // No body or invalid JSON — proceed with backup scan
    }

    // 1. Get current server data
    const { rows: currentRows } = await sql`
      SELECT data FROM user_store WHERE user_id = ${userId}
    `;
    if (currentRows.length === 0) {
      return NextResponse.json({ error: 'No data found' }, { status: 404 });
    }

    const currentData = currentRows[0].data as Record<string, unknown>;
    const currentGam = currentData.gamificationStats as Record<string, unknown> | undefined;
    const currentPoints = Number(currentGam?.totalPoints) || 0;

    // 2. Scan all backups for the highest totalPoints
    let maxPoints = currentPoints;
    let maxStreak = Number(currentGam?.currentStreak) || 0;
    let maxLongestStreak = Number(currentGam?.longestStreak) || 0;
    let maxTotalWorkouts = Number(currentGam?.totalWorkouts) || 0;
    let maxTotalVolume = Number(currentGam?.totalVolume) || 0;
    let maxPRs = Number(currentGam?.personalRecords) || 0;
    let bestBadges = Array.isArray(currentGam?.badges) ? currentGam.badges as Array<Record<string, unknown>> : [];
    let sourceLabel = 'current';

    try {
      const { rows: backups } = await sql`
        SELECT id, data, created_at FROM user_store_backups
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `;

      for (const backup of backups) {
        const bData = backup.data as Record<string, unknown>;
        const bGam = bData.gamificationStats as Record<string, unknown> | undefined;
        if (!bGam) continue;

        const bPoints = Number(bGam.totalPoints) || 0;
        if (bPoints > maxPoints) {
          maxPoints = bPoints;
          sourceLabel = `backup #${backup.id} (${backup.created_at})`;
        }
        maxStreak = Math.max(maxStreak, Number(bGam.currentStreak) || 0);
        maxLongestStreak = Math.max(maxLongestStreak, Number(bGam.longestStreak) || 0);
        maxTotalWorkouts = Math.max(maxTotalWorkouts, Number(bGam.totalWorkouts) || 0);
        maxTotalVolume = Math.max(maxTotalVolume, Number(bGam.totalVolume) || 0);
        maxPRs = Math.max(maxPRs, Number(bGam.personalRecords) || 0);

        // Union-merge badges
        const bBadges = Array.isArray(bGam.badges) ? bGam.badges as Array<Record<string, unknown>> : [];
        const badgeMap = new Map<string, Record<string, unknown>>();
        for (const b of bestBadges) badgeMap.set(String(b.badgeId ?? b.id), b);
        for (const b of bBadges) badgeMap.set(String(b.badgeId ?? b.id), b);
        bestBadges = Array.from(badgeMap.values());
      }
    } catch {
      // No backups table — just use current
    }

    // If manual XP provided and it's higher, use it
    if (manualXP && manualXP > maxPoints) {
      maxPoints = manualXP;
      sourceLabel = 'manual override (from device)';
    }

    const correctLevel = calculateLevel(maxPoints);

    if (maxPoints === currentPoints && correctLevel === Number(currentGam?.level)) {
      return NextResponse.json({
        repaired: false,
        message: 'XP and level are already correct',
        currentPoints,
        currentLevel: Number(currentGam?.level),
      });
    }

    // 3. Force-backup before mutating (bypasses rate limit)
    try {
      const client = await db.connect();
      try {
        await createBackupIfEligible(client, userId, currentData, { force: true });
      } finally {
        client.release();
      }
    } catch {
      // Non-fatal
    }

    // 4. Patch the live data
    const repairedGam = {
      ...(currentGam || {}),
      totalPoints: maxPoints,
      level: correctLevel,
      currentStreak: maxStreak,
      longestStreak: maxLongestStreak,
      totalWorkouts: maxTotalWorkouts,
      totalVolume: maxTotalVolume,
      personalRecords: maxPRs,
      badges: bestBadges,
    };

    const repairedData = {
      ...currentData,
      gamificationStats: repairedGam,
    };

    const jsonData = JSON.stringify(repairedData);
    await sql`
      UPDATE user_store SET data = ${jsonData}::jsonb, updated_at = NOW()
      WHERE user_id = ${userId}
    `;

    // Also update the dedicated gamification_stats table
    const badgesJson = JSON.stringify(bestBadges);
    try {
      await sql`
        INSERT INTO gamification_stats (id, user_id, total_points, level, current_streak,
          longest_streak, total_workouts, total_volume, personal_records, badges_json)
        VALUES (${userId}, ${userId}, ${maxPoints}, ${correctLevel},
          ${maxStreak}, ${maxLongestStreak}, ${maxTotalWorkouts}, ${maxTotalVolume},
          ${maxPRs}, ${badgesJson}::jsonb)
        ON CONFLICT (user_id) DO UPDATE SET
          total_points = EXCLUDED.total_points,
          level = EXCLUDED.level,
          current_streak = EXCLUDED.current_streak,
          longest_streak = EXCLUDED.longest_streak,
          total_workouts = EXCLUDED.total_workouts,
          total_volume = EXCLUDED.total_volume,
          personal_records = EXCLUDED.personal_records,
          badges_json = EXCLUDED.badges_json,
          updated_at = NOW()
      `;
    } catch {
      // Non-fatal
    }

    return NextResponse.json({
      repaired: true,
      source: sourceLabel,
      before: { totalPoints: currentPoints, level: Number(currentGam?.level) },
      after: { totalPoints: maxPoints, level: correctLevel },
      badgeCount: bestBadges.length,
    });
  } catch (error) {
    console.error('Repair XP error:', error);
    return NextResponse.json({ error: 'Failed to repair' }, { status: 500 });
  }
}
