import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// POST - Request a password reset (generates token)
// In production, this would send an email. For now, it returns the token
// so the client can use it directly (self-hosted / small-team use case).
export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const trimmedEmail = email.toLowerCase().trim();

    // Ensure reset tokens table exists
    await sql`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Check if user exists
    const { rows } = await sql`
      SELECT id FROM auth_users WHERE email = ${trimmedEmail}
    `;

    // Always return success to prevent email enumeration
    if (rows.length === 0) {
      return NextResponse.json({ success: true, message: 'If an account exists with that email, a reset link has been generated.' });
    }

    const userId = rows[0].id;
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate any existing tokens for this user
    await sql`
      UPDATE password_reset_tokens SET used = TRUE WHERE user_id = ${userId} AND used = FALSE
    `;

    await sql`
      INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
      VALUES (${uuidv4()}, ${userId}, ${token}, ${expiresAt.toISOString()})
    `;

    // In a production setup, you'd send this via email (Resend, SendGrid, etc.)
    // For now, return the token directly for the client-side flow
    return NextResponse.json({
      success: true,
      token,
      message: 'If an account exists with that email, a reset link has been generated.',
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json({ error: 'Failed to process reset request' }, { status: 500 });
  }
}

// PUT - Reset password with token
export async function PUT(request: Request) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Find valid token
    const { rows } = await sql`
      SELECT user_id FROM password_reset_tokens
      WHERE token = ${token} AND used = FALSE AND expires_at > NOW()
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }

    const userId = rows[0].user_id;
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await sql`
      UPDATE auth_users SET password_hash = ${passwordHash} WHERE id = ${userId}
    `;

    // Mark token as used
    await sql`
      UPDATE password_reset_tokens SET used = TRUE WHERE token = ${token}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
