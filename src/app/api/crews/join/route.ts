import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { auth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { ensureCrewTables, normalizeJoinCode, sanitizeName, MAX_CREWS_PER_USER, MAX_CREW_SIZE } from '@/lib/crews-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/crews/join — body { joinCode, displayName }
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;

    const { limited } = rateLimit(`crews-join:${userId}`, 20, 60 * 60 * 1000);
    if (limited) return NextResponse.json({ error: 'Too many attempts. Try later.' }, { status: 429 });

    await ensureCrewTables();
    const body = await request.json().catch(() => ({}));
    const joinCode = normalizeJoinCode(body.joinCode);
    const displayName = sanitizeName(body.displayName) || 'Athlete';
    if (joinCode.length !== 6) return NextResponse.json({ error: 'Enter a 6-character code' }, { status: 400 });

    const { rows: crewRows } = await sql`SELECT id, name, join_code, owner_id FROM crews WHERE join_code = ${joinCode}`;
    const crew = crewRows[0];
    if (!crew) return NextResponse.json({ error: 'No crew with that code' }, { status: 404 });

    // Already a member? idempotent success.
    const { rows: existing } = await sql`SELECT 1 FROM crew_members WHERE crew_id = ${crew.id} AND user_id = ${userId}`;
    if (existing.length > 0) {
      return NextResponse.json({ success: true, data: { id: crew.id, name: crew.name, joinCode: crew.join_code } });
    }

    const { rows: myCount } = await sql`SELECT COUNT(*)::int AS n FROM crew_members WHERE user_id = ${userId}`;
    if ((myCount[0]?.n ?? 0) >= MAX_CREWS_PER_USER) {
      return NextResponse.json({ error: `You can be in at most ${MAX_CREWS_PER_USER} crews.` }, { status: 400 });
    }
    const { rows: size } = await sql`SELECT COUNT(*)::int AS n FROM crew_members WHERE crew_id = ${crew.id}`;
    if ((size[0]?.n ?? 0) >= MAX_CREW_SIZE) {
      return NextResponse.json({ error: 'This crew is full.' }, { status: 400 });
    }

    await sql`INSERT INTO crew_members (crew_id, user_id, display_name) VALUES (${crew.id}, ${userId}, ${displayName})`;
    return NextResponse.json({ success: true, data: { id: crew.id, name: crew.name, joinCode: crew.join_code } });
  } catch (err) {
    console.error('[crews join]', err);
    return NextResponse.json({ error: 'Failed to join crew' }, { status: 500 });
  }
}
