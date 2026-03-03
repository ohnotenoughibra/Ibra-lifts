import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * GET /api/debug/my-data
 *
 * Debug endpoint: dumps EVERYTHING in the database for the currently
 * logged-in user.  Open this URL in your phone browser while logged in.
 *
 * Returns raw rows from every table so you can see exactly what's there
 * and when it was last updated.
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not logged in. Open the app and log in first, then visit this URL.' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const results: Record<string, unknown> = {
      _user: {
        id: userId,
        email: session.user.email,
        name: session.user.name,
      },
      _timestamp: new Date().toISOString(),
    };

    // ── 1. user_store (the main sync blob) ──
    try {
      const { rows } = await sql`
        SELECT user_id, updated_at,
               pg_column_size(data) as data_size_bytes,
               data
        FROM user_store WHERE user_id = ${userId}
      `;
      if (rows.length > 0) {
        const row = rows[0];
        const data = row.data as Record<string, unknown>;
        // Show summary + key fields so it's readable
        results.user_store = {
          updated_at: row.updated_at,
          data_size_bytes: row.data_size_bytes,
          isOnboarded: data?.isOnboarded,
          hasUser: !!data?.user,
          workoutLogsCount: Array.isArray(data?.workoutLogs) ? data.workoutLogs.length : 0,
          hasCurrentMesocycle: !!data?.currentMesocycle,
          mesocycleHistoryCount: Array.isArray(data?.mesocycleHistory) ? data.mesocycleHistory.length : 0,
          // Include the full data so you can see everything
          _fullData: data,
        };
      } else {
        results.user_store = null;
      }
    } catch (e: unknown) {
      results.user_store = { error: e instanceof Error ? e.message : 'table may not exist' };
    }

    // ── 2. profiles ──
    try {
      const { rows } = await sql`SELECT * FROM profiles WHERE id = ${userId}`;
      results.profiles = rows[0] || null;
    } catch (e: unknown) {
      results.profiles = { error: e instanceof Error ? e.message : 'table may not exist' };
    }

    // ── 3. workout_logs (most recent 100) ──
    try {
      const { rows: countRows } = await sql`
        SELECT COUNT(*) as total FROM workout_logs WHERE user_id = ${userId}
      `;
      const { rows } = await sql`
        SELECT id, mesocycle_id, session_id, date, total_volume, duration,
               overall_rpe, soreness, energy, notes, completed, created_at,
               exercises
        FROM workout_logs WHERE user_id = ${userId}
        ORDER BY date DESC LIMIT 100
      `;
      results.workout_logs = {
        total_count: countRows[0]?.total || 0,
        showing: rows.length,
        rows,
      };
    } catch (e: unknown) {
      results.workout_logs = { error: e instanceof Error ? e.message : 'table may not exist' };
    }

    // ── 4. mesocycles ──
    try {
      const { rows } = await sql`
        SELECT id, name, start_date, end_date, goal_focus, split_type, status, created_at,
               weeks
        FROM mesocycles WHERE user_id = ${userId} ORDER BY created_at DESC
      `;
      results.mesocycles = { count: rows.length, rows };
    } catch (e: unknown) {
      results.mesocycles = { error: e instanceof Error ? e.message : 'table may not exist' };
    }

    // ── 5. gamification_stats ──
    try {
      const { rows } = await sql`SELECT * FROM gamification_stats WHERE user_id = ${userId}`;
      results.gamification_stats = rows[0] || null;
    } catch (e: unknown) {
      results.gamification_stats = { error: e instanceof Error ? e.message : 'table may not exist' };
    }

    // ── 6. user_badges ──
    try {
      const { rows } = await sql`SELECT * FROM user_badges WHERE user_id = ${userId}`;
      results.user_badges = { count: rows.length, rows };
    } catch (e: unknown) {
      results.user_badges = { error: e instanceof Error ? e.message : 'table may not exist' };
    }

    // ── 7. baseline_lifts ──
    try {
      const { rows } = await sql`SELECT * FROM baseline_lifts WHERE user_id = ${userId}`;
      results.baseline_lifts = rows[0] || null;
    } catch (e: unknown) {
      results.baseline_lifts = { error: e instanceof Error ? e.message : 'table may not exist' };
    }

    // ── 8. strength_progress (most recent 50) ──
    try {
      const { rows: countRows } = await sql`
        SELECT COUNT(*) as total FROM strength_progress WHERE user_id = ${userId}
      `;
      const { rows } = await sql`
        SELECT * FROM strength_progress WHERE user_id = ${userId}
        ORDER BY date DESC LIMIT 50
      `;
      results.strength_progress = {
        total_count: countRows[0]?.total || 0,
        showing: rows.length,
        rows,
      };
    } catch (e: unknown) {
      results.strength_progress = { error: e instanceof Error ? e.message : 'table may not exist' };
    }

    // ── 9. subscriptions ──
    try {
      const { rows } = await sql`SELECT * FROM subscriptions WHERE user_id = ${userId}`;
      results.subscriptions = rows[0] || null;
    } catch (e: unknown) {
      results.subscriptions = { error: e instanceof Error ? e.message : 'table may not exist' };
    }

    // ── 10. whoop_tokens (existence only, don't leak tokens) ──
    try {
      const { rows } = await sql`
        SELECT user_id, created_at FROM whoop_tokens WHERE user_id = ${userId}
      `;
      results.whoop_tokens = rows.length > 0 ? { connected: true, created_at: rows[0].created_at } : null;
    } catch (e: unknown) {
      results.whoop_tokens = { error: e instanceof Error ? e.message : 'table may not exist' };
    }

    // ── 11. auth_users (account info, no password hash) ──
    try {
      const { rows } = await sql`
        SELECT id, email, name, auth_provider, email_verified, created_at
        FROM auth_users WHERE id = ${userId}
      `;
      results.auth_user = rows[0] || null;
    } catch (e: unknown) {
      results.auth_user = { error: e instanceof Error ? e.message : 'table may not exist' };
    }

    return NextResponse.json(results, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Debug my-data error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
