import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * GET /api/sync/backups — List available backups for the current user.
 * POST /api/sync/backups — Restore a specific backup by ID.
 */

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    try {
      const { rows } = await sql`
        SELECT id, workout_count, created_at,
               pg_column_size(data) as size_bytes
        FROM user_store_backups
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 50
      `;
      return NextResponse.json({ backups: rows });
    } catch {
      return NextResponse.json({ backups: [], note: 'No backups table yet — backups will be created on next sync.' });
    }
  } catch (error) {
    console.error('Backups list error:', error);
    return NextResponse.json({ error: 'Failed to list backups' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { backupId } = body;

    if (!backupId) {
      return NextResponse.json({ error: 'backupId required' }, { status: 400 });
    }

    // Fetch the backup (ensure it belongs to this user)
    const { rows } = await sql`
      SELECT data, workout_count, created_at
      FROM user_store_backups
      WHERE id = ${backupId} AND user_id = ${userId}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
    }

    const backupData = rows[0].data;
    const jsonData = JSON.stringify(backupData);

    // Backup the CURRENT data before restoring (so we can undo)
    try {
      const { rows: current } = await sql`
        SELECT data FROM user_store WHERE user_id = ${userId}
      `;
      if (current.length > 0 && current[0].data) {
        const currentJson = JSON.stringify(current[0].data);
        const currentData = current[0].data as Record<string, unknown>;
        const currentLogs = Array.isArray(currentData.workoutLogs) ? currentData.workoutLogs.length : 0;
        await sql`
          INSERT INTO user_store_backups (user_id, data, workout_count)
          VALUES (${userId}, ${currentJson}::jsonb, ${currentLogs})
        `;
      }
    } catch {
      // Non-fatal
    }

    // Write the backup data to user_store
    await sql`
      INSERT INTO user_store (user_id, data, updated_at)
      VALUES (${userId}, ${jsonData}::jsonb, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET data = ${jsonData}::jsonb, updated_at = NOW()
    `;

    return NextResponse.json({
      restored: true,
      backupId,
      workoutCount: rows[0].workout_count,
      backupDate: rows[0].created_at,
    });
  } catch (error) {
    console.error('Backup restore error:', error);
    return NextResponse.json({ error: 'Failed to restore backup' }, { status: 500 });
  }
}
