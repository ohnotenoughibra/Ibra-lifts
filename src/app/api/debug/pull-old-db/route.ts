import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { Pool } from '@neondatabase/serverless';

/**
 * POST /api/debug/pull-old-db
 *
 * Connects to the OLD Neon database using a provided connection string,
 * reads all user data, and writes it to the CURRENT database.
 *
 * Body: { connectionString: "postgresql://..." }
 *
 * This is a one-time recovery endpoint.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    }

    const userId = session.user.id;
    const email = session.user.email;
    const body = await request.json();
    const { connectionString } = body;

    if (!connectionString || !connectionString.startsWith('postgresql://')) {
      return NextResponse.json({ error: 'Valid PostgreSQL connection string required' }, { status: 400 });
    }

    // Connect to the OLD database
    const oldPool = new Pool({ connectionString });

    const results: Record<string, unknown> = { userId, email };

    // 1. Find the user in the old DB (by email since UUID might differ)
    let oldUserId: string | null = null;
    try {
      const userResult = await oldPool.query(
        'SELECT id, email, name FROM auth_users WHERE email = $1',
        [(email || '').toLowerCase().trim()]
      );
      if (userResult.rows.length > 0) {
        oldUserId = userResult.rows[0].id;
        results.oldUser = userResult.rows[0];
      } else {
        // Try all users if email doesn't match
        const allUsers = await oldPool.query('SELECT id, email, name FROM auth_users LIMIT 10');
        results.allUsersInOldDb = allUsers.rows;
        // If there's only one user, use that
        if (allUsers.rows.length === 1) {
          oldUserId = allUsers.rows[0].id;
          results.oldUser = allUsers.rows[0];
          results.note = 'Used the only user in the old database';
        }
      }
    } catch (e) {
      results.authUsersError = e instanceof Error ? e.message : String(e);
    }

    if (!oldUserId) {
      await oldPool.end();
      return NextResponse.json({
        error: 'Could not find your user in the old database',
        details: results,
      }, { status: 404 });
    }

    // 2. Pull user_store (the main sync blob)
    let oldStoreData: Record<string, unknown> | null = null;
    try {
      const storeResult = await oldPool.query(
        'SELECT data, updated_at FROM user_store WHERE user_id = $1',
        [oldUserId]
      );
      if (storeResult.rows.length > 0) {
        oldStoreData = storeResult.rows[0].data;
        results.userStore = {
          found: true,
          updatedAt: storeResult.rows[0].updated_at,
          workoutLogs: Array.isArray(oldStoreData?.workoutLogs) ? (oldStoreData.workoutLogs as unknown[]).length : 0,
          isOnboarded: oldStoreData?.isOnboarded,
          hasUser: !!oldStoreData?.user,
        };
      } else {
        results.userStore = { found: false };
      }
    } catch (e) {
      results.userStoreError = e instanceof Error ? e.message : String(e);
    }

    // 3. Pull individual tables
    const tableResults: Record<string, unknown> = {};

    // Profiles
    try {
      const r = await oldPool.query('SELECT * FROM profiles WHERE id = $1', [oldUserId]);
      tableResults.profiles = r.rows[0] || null;
    } catch (e) { tableResults.profilesError = e instanceof Error ? e.message : String(e); }

    // Workout logs
    try {
      const r = await oldPool.query('SELECT * FROM workout_logs WHERE user_id = $1 ORDER BY date DESC', [oldUserId]);
      tableResults.workoutLogs = { count: r.rows.length, rows: r.rows };
    } catch (e) { tableResults.workoutLogsError = e instanceof Error ? e.message : String(e); }

    // Mesocycles
    try {
      const r = await oldPool.query('SELECT * FROM mesocycles WHERE user_id = $1 ORDER BY created_at DESC', [oldUserId]);
      tableResults.mesocycles = { count: r.rows.length, rows: r.rows };
    } catch (e) { tableResults.mesocyclesError = e instanceof Error ? e.message : String(e); }

    // Gamification
    try {
      const r = await oldPool.query('SELECT * FROM gamification_stats WHERE user_id = $1', [oldUserId]);
      tableResults.gamification = r.rows[0] || null;
    } catch (e) { tableResults.gamificationError = e instanceof Error ? e.message : String(e); }

    // Baseline lifts
    try {
      const r = await oldPool.query('SELECT * FROM baseline_lifts WHERE user_id = $1', [oldUserId]);
      tableResults.baselineLifts = r.rows[0] || null;
    } catch (e) { tableResults.baselineLiftsError = e instanceof Error ? e.message : String(e); }

    // Badges
    try {
      const r = await oldPool.query('SELECT * FROM user_badges WHERE user_id = $1', [oldUserId]);
      tableResults.badges = { count: r.rows.length, rows: r.rows };
    } catch (e) { tableResults.badgesError = e instanceof Error ? e.message : String(e); }

    // Strength progress
    try {
      const r = await oldPool.query('SELECT * FROM strength_progress WHERE user_id = $1 ORDER BY date DESC', [oldUserId]);
      tableResults.strengthProgress = { count: r.rows.length, rows: r.rows };
    } catch (e) { tableResults.strengthProgressError = e instanceof Error ? e.message : String(e); }

    // Subscriptions
    try {
      const r = await oldPool.query('SELECT * FROM subscriptions WHERE user_id = $1', [oldUserId]);
      tableResults.subscriptions = r.rows[0] || null;
    } catch (e) { tableResults.subscriptionsError = e instanceof Error ? e.message : String(e); }

    results.tables = tableResults;

    await oldPool.end();

    // 4. Write the old user_store data to the CURRENT database
    if (oldStoreData) {
      const jsonData = JSON.stringify(oldStoreData);
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
      results.restoredToCurrentDb = true;
    } else {
      results.restoredToCurrentDb = false;
      results.restoreNote = 'No user_store data found in old DB. Check the tables data above.';
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Pull old DB error:', error);
    return NextResponse.json({
      error: 'Failed to connect to old database',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
