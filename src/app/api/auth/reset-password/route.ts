import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Resend } from 'resend';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { ensureAuthTables } from '@/lib/db-init';

export const runtime = 'nodejs';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// POST - Request a password reset (generates token + sends email)
export async function POST(request: Request) {
  try {
    // Rate limit: 3 reset requests per IP per minute
    const ip = getClientIP(request);
    const { limited } = rateLimit(`reset:${ip}`, 3, 60 * 1000);
    if (limited) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const trimmedEmail = email.toLowerCase().trim();

    await ensureAuthTables();

    // Check if user exists
    const { rows } = await sql`
      SELECT id, name FROM auth_users WHERE email = ${trimmedEmail}
    `;

    // Always return success to prevent email enumeration
    if (rows.length === 0) {
      return NextResponse.json({ success: true });
    }

    const userId = rows[0].id;
    const userName = rows[0].name || 'there';
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

    // Send email via Resend if configured
    if (resend) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!appUrl) {
        console.error('[reset-password] NEXT_PUBLIC_APP_URL not set — cannot generate reset link');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }
      const resetUrl = `${appUrl}/reset-password?token=${token}`;

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Roots Gains <noreply@resend.dev>',
        to: trimmedEmail,
        subject: 'Reset your Roots Gains password',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="color: #0f172a; margin-bottom: 16px;">Reset your password</h2>
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
              Hey ${userName}, we received a request to reset your password. Click the button below to choose a new one:
            </p>
            <div style="margin: 32px 0;">
              <a href="${resetUrl}" style="display: inline-block; background: #0ea5e9; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 600; font-size: 15px;">
                Reset Password
              </a>
            </div>
            <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">
              This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
            <p style="color: #cbd5e1; font-size: 12px;">Roots Gains</p>
          </div>
        `,
      });

      return NextResponse.json({ success: true, emailSent: true });
    }

    // No email service configured
    if (process.env.NODE_ENV === 'development') {
      // Dev only — return token for local testing
      return NextResponse.json({ success: true, token });
    }
    // Production without email: log warning, don't expose token
    console.warn('[reset-password] No email service configured — user cannot receive reset link');
    return NextResponse.json({ success: true });
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

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
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
