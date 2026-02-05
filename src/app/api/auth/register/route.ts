import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { rateLimit, getClientIP } from '@/lib/rate-limit';
import { ensureAuthTables } from '@/lib/db-init';

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
      INSERT INTO auth_users (id, name, email, password_hash)
      VALUES (${userId}, ${name}, ${trimmedEmail}, ${passwordHash})
    `;

    return NextResponse.json({ success: true, userId });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
