import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { Pool } from '@neondatabase/serverless';

/**
 * POST /api/debug/pull-old-db
 *
 * Connects to the OLD Neon database, discovers all tables,
 * finds the user however possible, pulls everything, and
 * writes it to the current database.
 *
 * Body: { connectionString: "postgresql://..." }
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

    const oldPool = new Pool({ connectionString });
    const results: Record<string, unknown> = { currentUserId: userId, currentEmail: email };

    // ── Step 1: Discover all tables in the old database ──
    let allTables: string[] = [];
    try {
      const tablesResult = await oldPool.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      allTables = tablesResult.rows.map((r: { table_name: string }) => r.table_name);
      results.oldDbTables = allTables;
    } catch (e) {
      results.tableDiscoveryError = e instanceof Error ? e.message : String(e);
    }

    // ── Step 2: Find the user — try every possible user table ──
    let oldUserId: string | null = null;
    const userTableCandidates = ['auth_users', 'users', 'accounts', 'next_auth_users'];
    const emailLower = (email || '').toLowerCase().trim();

    for (const tableName of userTableCandidates) {
      if (!allTables.includes(tableName)) continue;
      try {
        // First try by email
        const r = await oldPool.query(
          `SELECT * FROM ${tableName} WHERE LOWER(email) = $1 LIMIT 1`,
          [emailLower]
        );
        if (r.rows.length > 0) {
          oldUserId = r.rows[0].id;
          results.oldUser = { table: tableName, ...r.rows[0] };
          // Remove password hash from response
          if (results.oldUser && typeof results.oldUser === 'object') {
            delete (results.oldUser as Record<string, unknown>).password_hash;
            delete (results.oldUser as Record<string, unknown>).password;
          }
          break;
        }
        // If no match by email, grab all users from this table
        const allR = await oldPool.query(`SELECT id, email, name FROM ${tableName} LIMIT 20`);
        results[`${tableName}_allUsers`] = allR.rows;
        // If only one user, use them
        if (allR.rows.length === 1) {
          oldUserId = allR.rows[0].id;
          results.oldUser = { table: tableName, ...allR.rows[0], note: 'Only user in table' };
          break;
        }
      } catch {
        // Table exists but query failed — skip
      }
    }

    // ── Step 3: If still no user, try user_store directly ──
    // (user_store might have entries we can match)
    if (!oldUserId && allTables.includes('user_store')) {
      try {
        const storeRows = await oldPool.query('SELECT user_id FROM user_store LIMIT 10');
        results.userStoreUserIds = storeRows.rows.map((r: { user_id: string }) => r.user_id);
        if (storeRows.rows.length === 1) {
          oldUserId = storeRows.rows[0].user_id;
          results.oldUserNote = 'Used the only user_store entry';
        } else if (storeRows.rows.length > 0) {
          // Try to match by current userId
          const match = storeRows.rows.find((r: { user_id: string }) => r.user_id === userId);
          if (match) {
            oldUserId = match.user_id;
            results.oldUserNote = 'Matched user_store by current userId';
          }
        }
      } catch (e) {
        results.userStoreLookupError = e instanceof Error ? e.message : String(e);
      }
    }

    if (!oldUserId) {
      await oldPool.end();
      return NextResponse.json({
        error: 'Could not find your user in the old database. See details for what was found.',
        details: results,
      }, { status: 404 });
    }

    results.resolvedOldUserId = oldUserId;

    // ── Step 4: Pull user_store (the big Zustand sync blob — has everything) ──
    let oldStoreData: Record<string, unknown> | null = null;
    if (allTables.includes('user_store')) {
      try {
        const storeResult = await oldPool.query(
          'SELECT data, updated_at FROM user_store WHERE user_id = $1',
          [oldUserId]
        );
        if (storeResult.rows.length > 0) {
          oldStoreData = storeResult.rows[0].data;
          const d = oldStoreData!;
          results.userStore = {
            found: true,
            updatedAt: storeResult.rows[0].updated_at,
            sizeKB: Math.round(JSON.stringify(d).length / 1024),
            isOnboarded: d.isOnboarded,
            hasUser: !!d.user,
            userName: (d.user as Record<string, unknown>)?.name || null,
            workoutLogs: Array.isArray(d.workoutLogs) ? d.workoutLogs.length : 0,
            meals: Array.isArray(d.meals) ? d.meals.length : 0,
            hasBaselineLifts: !!d.baselineLifts,
            hasMesocycle: !!d.currentMesocycle,
            mesocycleHistory: Array.isArray(d.mesocycleHistory) ? d.mesocycleHistory.length : 0,
            hasGamification: !!d.gamificationStats,
            gamificationLevel: (d.gamificationStats as Record<string, unknown>)?.level || 0,
            gamificationXP: (d.gamificationStats as Record<string, unknown>)?.totalXP || (d.gamificationStats as Record<string, unknown>)?.totalPoints || 0,
            personalRecords: (d.gamificationStats as Record<string, unknown>)?.personalRecords || 0,
            hasWaterLog: !!d.waterLog && Object.keys(d.waterLog as object).length > 0,
            hasMacroTargets: !!d.macroTargets,
            trainingSessions: Array.isArray(d.trainingSessions) ? d.trainingSessions.length : 0,
          };
        } else {
          results.userStore = { found: false };
        }
      } catch (e) {
        results.userStoreError = e instanceof Error ? e.message : String(e);
      }
    }

    // ── Step 5: Pull individual tables as fallback / supplementary data ──
    const tableData: Record<string, unknown> = {};
    const tablesToPull = [
      { name: 'profiles', key: 'id', single: true },
      { name: 'baseline_lifts', key: 'user_id', single: true },
      { name: 'workout_logs', key: 'user_id', single: false },
      { name: 'mesocycles', key: 'user_id', single: false },
      { name: 'gamification_stats', key: 'user_id', single: true },
      { name: 'user_badges', key: 'user_id', single: false },
      { name: 'strength_progress', key: 'user_id', single: false },
      { name: 'subscriptions', key: 'user_id', single: false },
    ];

    for (const t of tablesToPull) {
      if (!allTables.includes(t.name)) continue;
      try {
        const r = await oldPool.query(
          `SELECT * FROM ${t.name} WHERE ${t.key} = $1 ORDER BY 1 DESC LIMIT 500`,
          [oldUserId]
        );
        if (t.single) {
          tableData[t.name] = r.rows[0] || null;
        } else {
          tableData[t.name] = { count: r.rows.length, rows: r.rows };
        }
      } catch (e) {
        tableData[`${t.name}_error`] = e instanceof Error ? e.message : String(e);
      }
    }
    results.tables = tableData;

    await oldPool.end();

    // ── Step 6: Write recovered data to current database ──
    // If user_store has data, use that (it's the complete Zustand state)
    // Otherwise, reconstruct from individual tables
    let dataToRestore: Record<string, unknown> | null = oldStoreData;

    if (!dataToRestore) {
      // Reconstruct from individual tables
      dataToRestore = {};
      if (tableData.profiles) {
        const p = tableData.profiles as Record<string, unknown>;
        dataToRestore.user = {
          name: p.name || p.display_name,
          weight: p.weight,
          height: p.height,
          age: p.age,
          gender: p.gender,
          experienceLevel: p.experience_level,
          updatedAt: new Date().toISOString(),
        };
        dataToRestore.isOnboarded = true;
      }
      if (tableData.baseline_lifts) {
        dataToRestore.baselineLifts = tableData.baseline_lifts;
      }
      const wl = tableData.workout_logs as { count: number; rows: unknown[] } | undefined;
      if (wl?.rows) {
        dataToRestore.workoutLogs = wl.rows;
      }
      const mc = tableData.mesocycles as { count: number; rows: unknown[] } | undefined;
      if (mc?.rows && mc.rows.length > 0) {
        dataToRestore.currentMesocycle = mc.rows[0]; // most recent
        dataToRestore.mesocycleHistory = mc.rows.slice(1);
      }
      if (tableData.gamification_stats) {
        dataToRestore.gamificationStats = tableData.gamification_stats;
      }
      const badges = tableData.user_badges as { count: number; rows: unknown[] } | undefined;
      if (badges?.rows) {
        // Merge into gamification
        if (!dataToRestore.gamificationStats) dataToRestore.gamificationStats = {};
        (dataToRestore.gamificationStats as Record<string, unknown>).badges = badges.rows;
      }
      results.reconstructedFromTables = true;
    }

    if (dataToRestore && Object.keys(dataToRestore).length > 0) {
      const jsonData = JSON.stringify(dataToRestore);
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
      results.restoredSizeKB = Math.round(jsonData.length / 1024);
    } else {
      results.restoredToCurrentDb = false;
      results.restoreNote = 'No data found to restore in old database.';
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
