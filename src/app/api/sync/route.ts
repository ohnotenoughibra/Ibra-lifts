import { sql, db } from '@vercel/postgres';
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
      SELECT data, updated_at FROM user_store WHERE user_id = ${userId}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({
      data: rows[0].data,
      serverUpdatedAt: rows[0].updated_at,
    });
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

    // ── Safety: refuse to overwrite richer server data with poorer incoming data ──
    // Computes a "richness score" for both sides. If the incoming data is
    // significantly poorer than the server data, the write is blocked and a
    // backup is forced. This catches empty-state pushes, partial hydrations,
    // corrupted localStorage, and any other scenario where data would regress.
    const { rows: existingRows } = await sql`
      SELECT data FROM user_store WHERE user_id = ${userId}
    `;
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
        const gam = d.gamificationStats as Record<string, unknown> | undefined;
        if (gam) score += (Number(gam.totalXP) || Number(gam.totalPoints) || 0) > 0 ? 5 : 0;
        if (d.waterLog && typeof d.waterLog === 'object') score += Object.keys(d.waterLog).length;
        return score;
      };

      const serverScore = richness(serverData);
      const incomingScore = richness(data);

      // Block if incoming data loses more than 30% of the server's richness
      // (allows small fluctuations from normal edits but catches data wipes)
      if (serverScore > 10 && incomingScore < serverScore * 0.7) {
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
    }

    // ── Atomic write: backup + upsert + gamification in a single transaction ──
    // Prevents inconsistent state if the server crashes mid-write.
    const client = await db.connect();
    try {
      await client.sql`BEGIN`;

      // Ensure backup table exists
      await client.sql`
        CREATE TABLE IF NOT EXISTS user_store_backups (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          data JSONB NOT NULL,
          workout_count INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;

      // Backup: snapshot existing data before overwriting
      if (existingRows.length > 0 && existingRows[0].data) {
        const existingData = existingRows[0].data as Record<string, unknown>;
        const existingLogs = Array.isArray(existingData.workoutLogs) ? existingData.workoutLogs.length : 0;
        const existingHasProfile = existingData.isOnboarded === true && existingData.user;
        if (existingLogs > 0 || existingHasProfile) {
          const { rows: recentBackup } = await client.sql`
            SELECT id FROM user_store_backups
            WHERE user_id = ${userId} AND created_at > NOW() - INTERVAL '1 hour'
            LIMIT 1
          `;
          if (recentBackup.length === 0) {
            const existingJson = JSON.stringify(existingRows[0].data);
            await client.sql`
              INSERT INTO user_store_backups (user_id, data, workout_count)
              VALUES (${userId}, ${existingJson}::jsonb, ${existingLogs})
            `;
            // Prune backups older than 30 days
            await client.sql`
              DELETE FROM user_store_backups
              WHERE user_id = ${userId} AND created_at < NOW() - INTERVAL '30 days'
            `;
          }
        }
      }

      // Upsert data
      await client.sql`
        INSERT INTO user_store (user_id, data, updated_at)
        VALUES (${userId}, ${jsonData}::jsonb, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET data = ${jsonData}::jsonb, updated_at = NOW()
      `;

      // Dual-write gamification to its dedicated table
      const gam = data.gamificationStats as Record<string, unknown> | undefined;
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
