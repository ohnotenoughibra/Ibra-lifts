import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST() {
  try {
    // Require authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await sql`
      CREATE TABLE IF NOT EXISTS user_store (
        user_id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Ensure gamification dual-write column exists
    try {
      await sql`ALTER TABLE gamification_stats ADD COLUMN IF NOT EXISTS badges_json JSONB DEFAULT '[]'::jsonb`;
    } catch { /* table may not exist yet — that's fine, db.ts creates it */ }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DB init error:', error);
    return NextResponse.json({ error: 'Failed to init DB' }, { status: 500 });
  }
}
