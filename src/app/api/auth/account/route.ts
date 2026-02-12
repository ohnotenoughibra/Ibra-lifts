import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { ensureAuthTables } from '@/lib/db-init';
import { auth } from '@/lib/auth';

// DELETE — delete the authenticated user's account
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = session.user.id;

    await ensureAuthTables();

    // Delete related tokens first
    await sql`DELETE FROM password_reset_tokens WHERE user_id = ${userId}`;
    await sql`DELETE FROM email_verification_tokens WHERE user_id = ${userId}`;

    // Delete the user account
    const { rowCount } = await sql`DELETE FROM auth_users WHERE id = ${userId}`;

    if (rowCount === 0) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
