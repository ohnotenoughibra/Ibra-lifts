import { sql, db } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createBackupIfEligible } from '@/lib/db-backup';

export const dynamic = 'force-dynamic';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sync/force-pull
 *
 * Returns the server's raw data for the authenticated user.
 * No userId param needed — uses session auth directly.
 * Used by the "Force Pull from Cloud" button to bypass merge logic.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rows } = await sql`
      SELECT data FROM user_store WHERE user_id = ${session.user.id}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ data: null });
    }

    // Force-backup before returning data (device will overwrite local state)
    try {
      const client = await db.connect();
      try {
        await createBackupIfEligible(client, session.user.id, rows[0].data as Record<string, unknown>, { force: true });
      } finally {
        client.release();
      }
    } catch {
      // Non-fatal
    }

    return NextResponse.json({ data: rows[0].data }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('Force pull error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
