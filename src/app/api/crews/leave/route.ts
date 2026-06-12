import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { auth } from '@/lib/auth';
import { ensureCrewTables } from '@/lib/crews-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/crews/leave — body { crewId }
// If the owner leaves, ownership transfers to the earliest-joined remaining
// member; if they were the last member, the crew is deleted. Avoids trapping
// the owner and avoids silently nuking everyone else.
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;

    await ensureCrewTables();
    const body = await request.json().catch(() => ({}));
    const crewId = String(body.crewId ?? '');
    if (!crewId) return NextResponse.json({ error: 'crewId required' }, { status: 400 });

    const { rows: crewRows } = await sql`SELECT owner_id FROM crews WHERE id = ${crewId}`;
    const crew = crewRows[0];
    if (!crew) return NextResponse.json({ success: true }); // already gone — idempotent

    await sql`DELETE FROM crew_members WHERE crew_id = ${crewId} AND user_id = ${userId}`;

    if (crew.owner_id === userId) {
      const { rows: next } = await sql`
        SELECT user_id FROM crew_members WHERE crew_id = ${crewId} ORDER BY joined_at ASC LIMIT 1
      `;
      if (next.length > 0) {
        await sql`UPDATE crews SET owner_id = ${next[0].user_id} WHERE id = ${crewId}`;
      } else {
        await sql`DELETE FROM crews WHERE id = ${crewId}`; // cascade clears members
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[crews leave]', err);
    return NextResponse.json({ error: 'Failed to leave crew' }, { status: 500 });
  }
}
