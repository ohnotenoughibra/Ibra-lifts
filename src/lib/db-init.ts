import { sql } from '@vercel/postgres';

// Module-level flag — runs CREATE TABLE IF NOT EXISTS at most once per server instance
let authTablesReady = false;

/**
 * Ensure auth-related tables exist. Called lazily on first auth request
 * instead of on every single authorize/register call.
 *
 * Uses a module-level flag so the SQL only runs once per cold start.
 */
export async function ensureAuthTables(): Promise<void> {
  if (authTablesReady) return;

  await sql`
    CREATE TABLE IF NOT EXISTS auth_users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      auth_provider TEXT DEFAULT 'credentials',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

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

  authTablesReady = true;
}
