import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import { ensureAuthTables } from '@/lib/db-init';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

// POST — request magic login link
export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);
    const { limited } = rateLimit(`magic-link:${ip}`, 3, 60 * 1000);
    if (limited) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    await ensureAuthTables();

    // Check if user exists (don't reveal if they don't — always return success)
    const { rows } = await sql`
      SELECT id FROM auth_users WHERE email = ${normalizedEmail}
    `;

    if (rows.length === 0) {
      // Return success anyway to prevent email enumeration
      return NextResponse.json({ success: true });
    }

    const userId = rows[0].id;
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min expiry

    // Invalidate old magic link tokens
    await sql`
      UPDATE password_reset_tokens SET used = TRUE
      WHERE user_id = ${userId} AND used = FALSE
      AND token LIKE 'ml_%'
    `;

    // Store magic link token (reuse password_reset_tokens table with ml_ prefix)
    const mlToken = `ml_${token}`;
    await sql`
      INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
      VALUES (${uuidv4()}, ${userId}, ${mlToken}, ${expiresAt.toISOString()})
    `;

    // Send email
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Roots Gains <onboarding@resend.dev>';
    const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromEmail,
          to: normalizedEmail,
          subject: 'Your Roots Gains sign-in link',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#111;color:#eee;border-radius:12px;">
              <h2 style="margin:0 0 12px;color:#fff;">Sign in to Roots Gains</h2>
              <p style="color:#999;font-size:14px;">Tap the button below to sign in. No password needed.</p>
              <a href="${baseUrl}/login?magic=${mlToken}" style="display:inline-block;margin:24px 0;padding:12px 32px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
                Sign In
              </a>
              <p style="color:#666;font-size:12px;">This link expires in 15 minutes. If you didn't request this, ignore this email.</p>
            </div>
          `,
        }),
      });
    }

    if (!resendKey) {
      return NextResponse.json({ success: true, token: mlToken });
    }

    return NextResponse.json({ success: true, emailSent: true });
  } catch (error) {
    console.error('Magic link error:', error);
    return NextResponse.json({ error: 'Failed to send magic link' }, { status: 500 });
  }
}

// PUT — validate magic link token and return user for sign-in
export async function PUT(request: Request) {
  try {
    const { token } = await request.json();

    if (!token || !token.startsWith('ml_')) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    await ensureAuthTables();

    const { rows } = await sql`
      SELECT prt.user_id, au.email
      FROM password_reset_tokens prt
      JOIN auth_users au ON au.id = prt.user_id
      WHERE prt.token = ${token} AND prt.used = FALSE AND prt.expires_at > NOW()
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 });
    }

    // Mark token as used
    await sql`UPDATE password_reset_tokens SET used = TRUE WHERE token = ${token}`;

    // Also mark email as verified (they clicked a link sent to their email)
    await sql`UPDATE auth_users SET email_verified = TRUE WHERE id = ${rows[0].user_id}`;

    return NextResponse.json({ success: true, email: rows[0].email, userId: rows[0].user_id });
  } catch (error) {
    console.error('Magic link validation error:', error);
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
