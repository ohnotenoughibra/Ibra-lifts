import { sql, db } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { planSyncWrite } from '@/lib/sync-write';
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
    console.error('Sync GET error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
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

    // ── Read-merge-write under a row lock ──
    // The read used to happen outside the transaction: two pushes at once
    // (keep-alive flush, queue replay, a second device) both merged against
    // the same old row and the later write dropped the other's entries.
    // Now: make sure the row exists, lock it (SELECT … FOR UPDATE), merge,
    // write — all in one transaction, so concurrent pushes serialize.
    const client = await db.connect();
    let mergedData: Record<string, unknown>;
    try {
      await client.sql`BEGIN`;
      await client.sql`
        INSERT INTO user_store (user_id, data, updated_at)
        VALUES (${userId}, '{}'::jsonb, NOW())
        ON CONFLICT (user_id) DO NOTHING
      `;
      const { rows: existingRows } = await client.sql`
        SELECT data FROM user_store WHERE user_id = ${userId} FOR UPDATE
      `;
      const serverData = (existingRows[0]?.data ?? null) as Record<string, unknown> | null;

      const plan = planSyncWrite(data, serverData);
      if (plan.blocked) {
        await client.sql`ROLLBACK`;
        console.warn(
          `[sync] BLOCKED data regression for user ${userId}: ` +
          `server score ${plan.serverScore} → merged score ${plan.mergedScore}`
        );
        return NextResponse.json({
          success: false,
          blocked: true,
          reason: 'data_regression',
          serverScore: plan.serverScore,
          incomingScore: plan.mergedScore,
        });
      }
      mergedData = plan.merged;
      const jsonData = JSON.stringify(mergedData);

      // Backup: snapshot existing data before overwriting (15-min rate limit, smart pruning)
      if (serverData && Object.keys(serverData).length > 0) {
        await createBackupIfEligible(client, userId, serverData);
      }

      await client.sql`
        UPDATE user_store SET data = ${jsonData}::jsonb, updated_at = NOW()
        WHERE user_id = ${userId}
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
  } catch (error) {
    console.error('Sync POST error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
