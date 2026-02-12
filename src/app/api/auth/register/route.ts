import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { ensureAuthTables } from '@/lib/db-init';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    // Rate limit: 5 registrations per IP per minute
    const ip = getClientIP(request);
    const { limited } = rateLimit(`register:${ip}`, 5, 60 * 1000);
    if (limited) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const { name, email, password } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    const trimmedEmail = email.toLowerCase().trim();

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    await ensureAuthTables();

    // Check if user already exists
    const { rows: existing } = await sql`
      SELECT id FROM auth_users WHERE email = ${trimmedEmail}
    `;

    if (existing.length > 0) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    await sql`
      INSERT INTO auth_users (id, name, email, password_hash, email_verified)
      VALUES (${userId}, ${name}, ${trimmedEmail}, ${passwordHash}, FALSE)
    `;

    // Send verification email in the background (non-blocking)
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Roots Gains <onboarding@resend.dev>';
    const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    if (resendKey) {
      const verifyToken = uuidv4();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await sql`
        INSERT INTO email_verification_tokens (id, user_id, token, expires_at)
        VALUES (${uuidv4()}, ${userId}, ${verifyToken}, ${expiresAt})
      `;

      // Fire-and-forget email (don't block registration)
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromEmail,
          to: trimmedEmail,
          subject: 'Verify your Roots Gains email',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#111;color:#eee;border-radius:12px;">
              <h2 style="margin:0 0 12px;color:#fff;">Welcome to Roots Gains!</h2>
              <p style="color:#999;font-size:14px;">Tap below to verify your email and enable cloud sync.</p>
              <a href="${baseUrl}/verify-email?token=${verifyToken}" style="display:inline-block;margin:24px 0;padding:12px 32px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
                Verify Email
              </a>
              <p style="color:#666;font-size:12px;">This link expires in 24 hours.</p>
            </div>
          `,
        }),
      }).catch(err => console.error('Verification email send error:', err));
    }

    return NextResponse.json({ success: true, userId });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
