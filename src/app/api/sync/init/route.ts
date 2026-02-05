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
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DB init error:', error);
    return NextResponse.json({ error: 'Failed to init DB' }, { status: 500 });
  }
}
