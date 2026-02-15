import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * POST /api/debug/force-restore
 *
 * Force-writes data to user_store, bypassing the empty-data safety guard.
 * Used by the /debug/recover page to push localStorage data back to the server.
 *
 * Accepts: { data: <full Zustand state object> }
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { data } = body;

    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'data object required' }, { status: 400 });
    }

    // Sanity check: the data should have something meaningful
    const hasUser = !!data.user;
    const hasLogs = Array.isArray(data.workoutLogs) && data.workoutLogs.length > 0;
    const hasOnboarded = data.isOnboarded === true;
    if (!hasUser && !hasLogs && !hasOnboarded) {
      return NextResponse.json(
        { error: 'Refusing to write — this data appears empty too (no user, no workoutLogs, not onboarded)' },
        { status: 400 }
      );
    }

    const jsonData = JSON.stringify(data);

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
      success: true,
      stats: {
        hasUser,
        workoutLogs: Array.isArray(data.workoutLogs) ? data.workoutLogs.length : 0,
        hasMesocycle: !!data.currentMesocycle,
        isOnboarded: !!data.isOnboarded,
      },
    });
  } catch (error) {
    console.error('Force restore error:', error);
    return NextResponse.json({ error: 'Failed to write data' }, { status: 500 });
  }
}
