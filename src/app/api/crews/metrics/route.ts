import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { auth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { ensureCrewTables, sanitizeName, clampInt, MAX_SESSIONS_WEEK, MAX_STREAK } from '@/lib/crews-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/crews/metrics — push the caller's weekly consistency to every crew
// they belong to. Body { displayName, weekKey, sessionsThisWeek, currentStreak,
// totalPoints }. Values are server-clamped so a tampered client can't post
// absurd numbers. No-op if the user is in no crews.
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;

    // Lenient — fires on every successful sync.
    const { limited } = rateLimit(`crews-metrics:${userId}`, 120, 60 * 60 * 1000);
    if (limited) return NextResponse.json({ success: true }); // silently drop, not an error

    await ensureCrewTables();
    const body = await request.json().catch(() => ({}));
    const displayName = sanitizeName(body.displayName) || 'Athlete';
    const weekKey = String(body.weekKey ?? '').slice(0, 10);
    const sessions = clampInt(body.sessionsThisWeek, 0, MAX_SESSIONS_WEEK);
    const streak = clampInt(body.currentStreak, 0, MAX_STREAK);
    const points = clampInt(body.totalPoints, 0, 100_000_000);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekKey)) {
      return NextResponse.json({ error: 'Invalid weekKey' }, { status: 400 });
    }

    const { rowCount } = await sql`
      UPDATE crew_members
      SET display_name = ${displayName},
          week_key = ${weekKey},
          sessions_this_week = ${sessions},
          current_streak = ${streak},
          total_points = ${points},
          metrics_updated_at = NOW()
      WHERE user_id = ${userId}
    `;

    return NextResponse.json({ success: true, data: { crewsUpdated: rowCount ?? 0 } });
  } catch (err) {
    console.error('[crews metrics]', err);
    return NextResponse.json({ error: 'Failed to update metrics' }, { status: 500 });
  }
}
