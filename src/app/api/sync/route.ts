import { sql, db } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { resolveConflicts } from '@/lib/db-sync';
import { createBackupIfEligible } from '@/lib/db-backup';

// GET - Load user data from database
export async function GET(request: Request) {
  try {
    // Verify auth session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    // Ensure the requested userId matches the authenticated user
    if (userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { rows } = await sql`
      SELECT data, updated_at FROM user_store WHERE user_id = ${userId}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ data: null }, {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      });
    }

    // Pre-pull backup: snapshot before device overwrites with potentially stale data
    try {
      const client = await db.connect();
      try {
        await createBackupIfEligible(client, userId, rows[0].data as Record<string, unknown>);
      } finally {
        client.release();
      }
    } catch {
      // Non-fatal — don't block the GET
    }

    return NextResponse.json({
      data: rows[0].data,
      serverUpdatedAt: rows[0].updated_at,
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error: any) {
    // If table doesn't exist yet, return null (first use)
    if (error.message?.includes('does not exist')) {
      return NextResponse.json({ data: null }, {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      });
    }
    const msg = (error as any)?.message || String(error);
    console.error('Sync GET error:', msg, (error as any)?.code);
    return NextResponse.json({ error: 'Database error', detail: msg.slice(0, 200) }, { status: 500 });
  }
}

// POST - Save user data to database
export async function POST(request: Request) {
  try {
    // Rate limit: 60 requests per 60 seconds per IP
    const ip = getClientIP(request);
    const { limited } = rateLimit(`sync:${ip}`, 60, 60 * 1000);
    if (limited) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Payload size limit: 5 MB
    const MAX_PAYLOAD = 5 * 1024 * 1024; // 5 MB
    const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
    if (contentLength > MAX_PAYLOAD) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    // Verify auth session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Safety net: check actual parsed body size (content-length can be missing/spoofed)
    const bodySize = new TextEncoder().encode(JSON.stringify(body)).byteLength;
    if (bodySize > MAX_PAYLOAD) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    const { userId, data } = body;

    if (!userId || !data) {
      return NextResponse.json({ error: 'userId and data required' }, { status: 400 });
    }

    // Ensure the requested userId matches the authenticated user
    if (userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create table if not exists
    await sql`
      CREATE TABLE IF NOT EXISTS user_store (
        user_id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // ── Safety: refuse to overwrite richer server data with poorer incoming data ──
    const { rows: existingRows } = await sql`
      SELECT data FROM user_store WHERE user_id = ${userId}
    `;

    let mergedData = data;

    if (existingRows.length > 0 && existingRows[0].data) {
      const serverData = existingRows[0].data as Record<string, unknown>;

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
        score += (Array.isArray(d.quickLogs) ? d.quickLogs.length : 0);
        score += (Array.isArray(d.bodyComposition) ? d.bodyComposition.length : 0);
        score += (Array.isArray(d.injuryLog) ? d.injuryLog.length : 0);
        score += (Array.isArray(d.illnessLogs) ? d.illnessLogs.length : 0);
        score += (Array.isArray(d.cycleLogs) ? d.cycleLogs.length : 0);
        score += (Array.isArray(d.competitions) ? d.competitions.length : 0);
        score += (Array.isArray(d.mealStamps) ? d.mealStamps.length : 0);
        score += (Array.isArray(d.supplementIntakes) ? d.supplementIntakes.length : 0);
        score += (Array.isArray(d.mentalCheckIns) ? d.mentalCheckIns.length : 0);
        score += (Array.isArray(d.weeklyCheckIns) ? d.weeklyCheckIns.length : 0);
        const gam = d.gamificationStats as Record<string, unknown> | undefined;
        if (gam) score += (Number(gam.totalXP) || Number(gam.totalPoints) || 0) > 0 ? 5 : 0;
        if (d.waterLog && typeof d.waterLog === 'object') score += Object.keys(d.waterLog).length;
        return score;
      };

      const serverScore = richness(serverData);
      const incomingScore = richness(data);

      // Block if incoming data loses more than 20% of the server's richness
      if (serverScore > 10 && incomingScore < serverScore * 0.8) {
        console.warn(
          `[sync] BLOCKED data regression for user ${userId}: ` +
          `server score ${serverScore} → incoming score ${incomingScore}`
        );
        return NextResponse.json({
          success: false,
          blocked: true,
          reason: 'data_regression',
          serverScore,
          incomingScore,
        });
      }

      // ── Preserve server subscription: never trust client-side subscription data ──
      data.subscription = serverData.subscription;

      // ── SERVER-SIDE MERGE: merge incoming with existing server data ──
      // This is the bulletproof fix for multi-device sync. Instead of blindly
      // overwriting, we merge so that:
      //   - Arrays are union-merged (no workout logs, meals, etc. are ever lost)
      //   - Gamification stats never regress (XP/level always take the max)
      //   - Scalar fields prefer the newer push (by lastSyncAt)
      // This prevents the race condition where phone pushes level 14, then
      // laptop pushes level 12 with stale data — the merge keeps level 14.
      mergedData = resolveConflicts(data, serverData);
    }

    const jsonData = JSON.stringify(mergedData);

    // ── Atomic write: backup + upsert + gamification in a single transaction ──
    const client = await db.connect();
    try {
      await client.sql`BEGIN`;

      // Backup: snapshot existing data before overwriting (15-min rate limit, smart pruning)
      if (existingRows.length > 0 && existingRows[0].data) {
        await createBackupIfEligible(client, userId, existingRows[0].data as Record<string, unknown>);
      }

      // Upsert merged data (not raw incoming — server-side merge ensures no data loss)
      await client.sql`
        INSERT INTO user_store (user_id, data, updated_at)
        VALUES (${userId}, ${jsonData}::jsonb, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET data = ${jsonData}::jsonb, updated_at = NOW()
      `;

      // Dual-write gamification to its dedicated table (use merged data, not raw incoming)
      const gam = mergedData.gamificationStats as Record<string, unknown> | undefined;
      if (gam && (Number(gam.totalPoints) > 0 || Number(gam.totalWorkouts) > 0)) {
        const badgesJson = JSON.stringify(gam.badges || []);
        await client.sql`
          INSERT INTO gamification_stats (id, user_id, total_points, level, current_streak,
            longest_streak, total_workouts, total_volume, personal_records, badges_json)
          VALUES (${userId}, ${userId}, ${Number(gam.totalPoints) || 0}, ${Number(gam.level) || 1},
            ${Number(gam.currentStreak) || 0}, ${Number(gam.longestStreak) || 0},
            ${Number(gam.totalWorkouts) || 0}, ${Number(gam.totalVolume) || 0},
            ${Number(gam.personalRecords) || 0}, ${badgesJson}::jsonb)
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
      }

      await client.sql`COMMIT`;
    } catch (txErr) {
      await client.sql`ROLLBACK`;
      throw txErr;
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const msg = error?.message || String(error);
    console.error('Sync POST error:', msg, error?.code, error?.detail);
    return NextResponse.json({
      error: 'Database error',
      detail: msg.slice(0, 200),
    }, { status: 500 });
  }
}
