import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sync/force-fix/backups
 *
 * Returns backups with detailed stats (level, XP, meals, meso week)
 * for the force-fix backup browser.
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
        SELECT id, data, workout_count, created_at
        FROM user_store_backups
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 30
      `;

      const backups = rows.map(row => {
        const data = row.data as Record<string, unknown>;
        const gam = (data.gamificationStats || {}) as Record<string, unknown>;
        const meso = data.currentMesocycle as Record<string, unknown> | undefined;
        const meals = Array.isArray(data.meals) ? data.meals.length : 0;

        return {
          id: row.id,
          created_at: row.created_at,
          workout_count: row.workout_count || (Array.isArray(data.workoutLogs) ? data.workoutLogs.length : 0),
          level: gam.level || '?',
          total_points: gam.totalPoints || 0,
          meal_count: meals,
          meso_week: meso?.currentWeek || null,
          streak: gam.currentStreak || 0,
        };
      });

      return NextResponse.json({ backups }, {
        headers: { 'Cache-Control': 'no-store' },
      });
    } catch {
      return NextResponse.json({ backups: [] });
    }
  } catch (error) {
    console.error('Force-fix backups error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
