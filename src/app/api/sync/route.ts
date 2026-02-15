import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

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
      SELECT data FROM user_store WHERE user_id = ${userId}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({ data: rows[0].data });
  } catch (error: any) {
    // If table doesn't exist yet, return null (first use)
    if (error.message?.includes('does not exist')) {
      return NextResponse.json({ data: null });
    }
    console.error('Sync GET error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

// POST - Save user data to database
export async function POST(request: Request) {
  try {
    // Verify auth session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
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

    const jsonData = JSON.stringify(data);

    // ── Safety: refuse to overwrite rich data with empty/fresh data ──
    // If incoming data has no workoutLogs and no user profile, but server
    // already has real data, reject the write to prevent accidental data loss
    // from a new device syncing blank state before pulling existing data.
    const incomingLogs = Array.isArray(data.workoutLogs) ? data.workoutLogs.length : 0;
    const incomingHasProfile = data.isOnboarded === true && data.user;
    if (incomingLogs === 0 && !incomingHasProfile) {
      const { rows: existing } = await sql`
        SELECT data FROM user_store WHERE user_id = ${userId}
      `;
      if (existing.length > 0 && existing[0].data) {
        const serverData = existing[0].data as Record<string, unknown>;
        const serverLogs = Array.isArray(serverData.workoutLogs) ? serverData.workoutLogs.length : 0;
        const serverHasProfile = serverData.isOnboarded === true && serverData.user;
        if (serverLogs > 0 || serverHasProfile) {
          console.warn(`[sync] Blocked empty-data overwrite for user ${userId} (server has ${serverLogs} logs)`);
          return NextResponse.json({ success: true, blocked: true });
        }
      }
    }

    // ── Backup: snapshot existing data before overwriting ──
    // Keeps up to 7 days of hourly backups so data is always recoverable.
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS user_store_backups (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          data JSONB NOT NULL,
          workout_count INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      // Only backup if: existing data exists, and we haven't backed up in the last hour
      const { rows: existing } = await sql`
        SELECT data FROM user_store WHERE user_id = ${userId}
      `;
      if (existing.length > 0 && existing[0].data) {
        const existingData = existing[0].data as Record<string, unknown>;
        const existingLogs = Array.isArray(existingData.workoutLogs) ? existingData.workoutLogs.length : 0;
        const existingHasProfile = existingData.isOnboarded === true && existingData.user;
        // Only backup if the existing data has something worth saving
        if (existingLogs > 0 || existingHasProfile) {
          const { rows: recentBackup } = await sql`
            SELECT id FROM user_store_backups
            WHERE user_id = ${userId} AND created_at > NOW() - INTERVAL '1 hour'
            LIMIT 1
          `;
          if (recentBackup.length === 0) {
            const existingJson = JSON.stringify(existing[0].data);
            await sql`
              INSERT INTO user_store_backups (user_id, data, workout_count)
              VALUES (${userId}, ${existingJson}::jsonb, ${existingLogs})
            `;
            // Prune backups older than 7 days
            await sql`
              DELETE FROM user_store_backups
              WHERE user_id = ${userId} AND created_at < NOW() - INTERVAL '7 days'
            `;
          }
        }
      }
    } catch (backupErr) {
      // Backup failure should never block the sync write
      console.error('[sync] Backup failed (non-fatal):', backupErr);
    }

    // Upsert data
    await sql`
      INSERT INTO user_store (user_id, data, updated_at)
      VALUES (${userId}, ${jsonData}::jsonb, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET data = ${jsonData}::jsonb, updated_at = NOW()
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Sync POST error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
