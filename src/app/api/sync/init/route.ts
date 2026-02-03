import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
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
