import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { auth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import {
  ensureCrewTables, generateJoinCode, sanitizeName,
  MAX_CREWS_PER_USER, MAX_CREW_SIZE,
} from '@/lib/crews-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STALE_MS = 8 * 24 * 60 * 60 * 1000;

interface MemberRow {
  crew_id: string;
  user_id: string;
  display_name: string;
  week_key: string | null;
  sessions_this_week: number;
  current_streak: number;
  total_points: number;
  metrics_updated_at: string | null;
}

// GET /api/crews?weekKey=YYYY-MM-DD — the caller's crews with ranked standings.
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;
    await ensureCrewTables();

    const weekKey = new URL(request.url).searchParams.get('weekKey') || '';

    const { rows: myCrews } = await sql`
      SELECT c.id, c.name, c.join_code, c.owner_id
      FROM crews c
      JOIN crew_members m ON m.crew_id = c.id
      WHERE m.user_id = ${userId}
      ORDER BY c.created_at ASC
    `;
    if (myCrews.length === 0) return NextResponse.json({ success: true, data: { crews: [] } });

    const crewIds = myCrews.map(c => c.id as string);
    // Array param needs the non-template query form (tagged-template params are
    // Primitive-only). $1::text[] binds the crew-id array safely.
    const { rows } = await sql.query(
      `SELECT crew_id, user_id, display_name, week_key, sessions_this_week, current_streak, total_points, metrics_updated_at
       FROM crew_members WHERE crew_id = ANY($1::text[])`,
      [crewIds]
    );
    const members = rows as unknown as MemberRow[];

    // Most recent finalized winner per crew.
    const { rows: winnerRows } = await sql.query(
      `SELECT DISTINCT ON (crew_id) crew_id, week_key, winner_name, sessions
       FROM crew_week_winners WHERE crew_id = ANY($1::text[])
       ORDER BY crew_id, week_key DESC`,
      [crewIds]
    );
    const winnerByCrew = new Map<string, { weekKey: string; name: string; sessions: number }>();
    for (const w of winnerRows) {
      winnerByCrew.set(w.crew_id as string, { weekKey: w.week_key as string, name: w.winner_name as string, sessions: w.sessions as number });
    }

    const now = Date.now();
    const crews = myCrews.map(c => {
      const roster = members
        .filter(m => m.crew_id === c.id)
        .map(m => {
          const updatedMs = m.metrics_updated_at ? new Date(m.metrics_updated_at).getTime() : 0;
          // "Stale" = hasn't synced in 8+ days OR their metrics are for a prior
          // week. Stale members count as 0 sessions THIS week (so they sink) but
          // stay on the board (greyed) instead of vanishing.
          const stale = !m.week_key || m.week_key !== weekKey || (now - updatedMs) > STALE_MS;
          // Note: we deliberately do NOT return m.user_id — crewmates never
          // receive each other's stable auth ids. isYou is computed server-side.
          return {
            displayName: m.display_name,
            sessionsThisWeek: stale ? 0 : m.sessions_this_week,
            currentStreak: m.current_streak,
            totalPoints: m.total_points,
            isYou: m.user_id === userId,
            stale,
          };
        })
        .sort((a, b) => b.sessionsThisWeek - a.sessionsThisWeek || b.currentStreak - a.currentStreak || b.totalPoints - a.totalPoints);

      return {
        id: c.id,
        name: c.name,
        joinCode: c.join_code,
        isOwner: c.owner_id === userId,
        memberCount: roster.length,
        members: roster.map((r, i) => ({ ...r, rank: i + 1 })),
        lastWinner: winnerByCrew.get(c.id as string) ?? null,
      };
    });

    return NextResponse.json({ success: true, data: { crews } });
  } catch (err) {
    console.error('[crews GET]', err);
    return NextResponse.json({ error: 'Failed to load crews' }, { status: 500 });
  }
}

// POST /api/crews — create a crew. Body: { name, displayName }
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;

    const { limited } = rateLimit(`crews-create:${userId}`, 10, 60 * 60 * 1000);
    if (limited) return NextResponse.json({ error: 'Too many crews created. Try later.' }, { status: 429 });

    await ensureCrewTables();
    const body = await request.json().catch(() => ({}));
    const name = sanitizeName(body.name);
    const displayName = sanitizeName(body.displayName) || 'Athlete';
    if (!name) return NextResponse.json({ error: 'Crew name is required' }, { status: 400 });

    // Membership cap (a crew you create counts as a membership)
    const { rows: countRows } = await sql`SELECT COUNT(*)::int AS n FROM crew_members WHERE user_id = ${userId}`;
    if ((countRows[0]?.n ?? 0) >= MAX_CREWS_PER_USER) {
      return NextResponse.json({ error: `You can be in at most ${MAX_CREWS_PER_USER} crews.` }, { status: 400 });
    }

    // Unique join code — retry on the rare collision (UNIQUE constraint is the guard)
    const id = crypto.randomUUID();
    let joinCode = '';
    for (let attempt = 0; attempt < 6; attempt++) {
      joinCode = generateJoinCode();
      try {
        await sql`INSERT INTO crews (id, name, join_code, owner_id) VALUES (${id}, ${name}, ${joinCode}, ${userId})`;
        break;
      } catch (e) {
        if (attempt === 5) throw e; // give up after 6 tries
        joinCode = '';
      }
    }
    if (!joinCode) return NextResponse.json({ error: 'Could not allocate a join code' }, { status: 500 });

    await sql`
      INSERT INTO crew_members (crew_id, user_id, display_name)
      VALUES (${id}, ${userId}, ${displayName})
    `;

    return NextResponse.json({ success: true, data: { id, name, joinCode } });
  } catch (err) {
    console.error('[crews POST]', err);
    return NextResponse.json({ error: 'Failed to create crew' }, { status: 500 });
  }
}
