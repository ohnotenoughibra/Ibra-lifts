import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';
import { ensureAuthTables } from '@/lib/db-init';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { auth } from '@/lib/auth';

// GET — check if the current user's email is verified
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await ensureAuthTables();

    const { rows } = await sql`
      SELECT email_verified FROM auth_users WHERE id = ${session.user.id}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ verified: false });
    }

    return NextResponse.json({ verified: !!rows[0].email_verified });
  } catch (error) {
    console.error('Email verification check error:', error);
    return NextResponse.json({ error: 'Check failed' }, { status: 500 });
  }
}

// POST — request verification email
export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);
    const { limited } = rateLimit(`verify-email:${ip}`, 3, 60 * 1000);
    if (limited) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const email = body.email;
    let userId = body.userId;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await ensureAuthTables();

    // If no userId provided, look it up by email
    if (!userId) {
      const { rows } = await sql`SELECT id FROM auth_users WHERE email = ${email.toLowerCase().trim()}`;
      if (rows.length === 0) {
        // Don't reveal whether user exists
        return NextResponse.json({ success: true });
      }
      userId = rows[0].id;
    }

    // Generate verification token (24h expiry)
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Invalidate previous tokens
    await sql`
      UPDATE email_verification_tokens SET used = TRUE WHERE user_id = ${userId} AND used = FALSE
    `;

    await sql`
      INSERT INTO email_verification_tokens (id, user_id, token, expires_at)
      VALUES (${uuidv4()}, ${userId}, ${token}, ${expiresAt.toISOString()})
    `;

    // Send verification email via Resend
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@rootsgains.com';
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromEmail,
          to: email.toLowerCase().trim(),
          subject: 'Verify your Roots Gains email',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#111;color:#eee;border-radius:12px;">
              <h2 style="margin:0 0 12px;color:#fff;">Verify your email</h2>
              <p style="color:#999;font-size:14px;">Tap the button below to verify your email and enable cloud sync.</p>
              <a href="${baseUrl}/verify-email?token=${token}" style="display:inline-block;margin:24px 0;padding:12px 32px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
                Verify Email
              </a>
              <p style="color:#666;font-size:12px;">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
            </div>
          `,
        }),
      });
    }

    // In dev, return token for testing
    if (!resendKey) {
      return NextResponse.json({ success: true, token });
    }

    return NextResponse.json({ success: true, emailSent: true });
  } catch (error) {
    console.error('Verify email request error:', error);
    return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 });
  }
}

// PUT — confirm verification token
export async function PUT(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    await ensureAuthTables();

    const { rows } = await sql`
      SELECT user_id FROM email_verification_tokens
      WHERE token = ${token} AND used = FALSE AND expires_at > NOW()
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired verification link' }, { status: 400 });
    }

    const userId = rows[0].user_id;

    // Mark email as verified
    await sql`UPDATE auth_users SET email_verified = TRUE WHERE id = ${userId}`;
    await sql`UPDATE email_verification_tokens SET used = TRUE WHERE token = ${token}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
