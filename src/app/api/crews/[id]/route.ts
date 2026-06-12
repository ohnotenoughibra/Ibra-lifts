import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { auth } from '@/lib/auth';
import { ensureCrewTables } from '@/lib/crews-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// DELETE /api/crews/:id — owner-only. Cascades members via FK ON DELETE CASCADE.
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;

    await ensureCrewTables();
    const crewId = params.id;

    const { rows } = await sql`SELECT owner_id FROM crews WHERE id = ${crewId}`;
    const crew = rows[0];
    if (!crew) return NextResponse.json({ success: true }); // already gone
    if (crew.owner_id !== userId) {
      return NextResponse.json({ error: 'Only the crew owner can delete it.' }, { status: 403 });
    }

    await sql`DELETE FROM crews WHERE id = ${crewId}`;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[crews DELETE]', err);
    return NextResponse.json({ error: 'Failed to delete crew' }, { status: 500 });
  }
}
