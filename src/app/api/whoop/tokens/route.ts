import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { encrypt, decrypt } from '@/lib/crypto';

/**
 * GET /api/whoop/tokens
 *
 * Load Whoop tokens for the authenticated user from the database.
 * Returns { access_token, refresh_token, expires_at } or { tokens: null }.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rows } = await sql`
      SELECT access_token, refresh_token, expires_at
      FROM whoop_tokens
      WHERE user_id = ${session.user.id}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ tokens: null });
    }

    return NextResponse.json({
      tokens: {
        access_token: decrypt(rows[0].access_token),
        refresh_token: decrypt(rows[0].refresh_token),
        expires_at: rows[0].expires_at,
      },
    });
  } catch (error: any) {
    if (error.message?.includes('does not exist')) {
      return NextResponse.json({ tokens: null });
    }
    console.error('Whoop tokens GET error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

/**
 * POST /api/whoop/tokens
 *
 * Save or update Whoop tokens for the authenticated user.
 * Body: { access_token, refresh_token, expires_at }
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { access_token, refresh_token, expires_at } = body;

    if (!access_token) {
      return NextResponse.json({ error: 'access_token required' }, { status: 400 });
    }

    const encryptedAccessToken = encrypt(access_token);
    const encryptedRefreshToken = encrypt(refresh_token || '');

    await sql`
      CREATE TABLE IF NOT EXISTS whoop_tokens (
        user_id TEXT PRIMARY KEY,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      INSERT INTO whoop_tokens (user_id, access_token, refresh_token, expires_at, updated_at)
      VALUES (${session.user.id}, ${encryptedAccessToken}, ${encryptedRefreshToken}, ${expires_at || ''}, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        access_token = ${encryptedAccessToken},
        refresh_token = ${encryptedRefreshToken},
        expires_at = ${expires_at || ''},
        updated_at = NOW()
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Whoop tokens POST error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

/**
 * DELETE /api/whoop/tokens
 *
 * Remove Whoop tokens for the authenticated user (disconnect).
 */
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await sql`
      DELETE FROM whoop_tokens WHERE user_id = ${session.user.id}
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message?.includes('does not exist')) {
      return NextResponse.json({ success: true });
    }
    console.error('Whoop tokens DELETE error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
