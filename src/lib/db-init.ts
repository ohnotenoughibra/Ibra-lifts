import { sql } from '@vercel/postgres';

// Module-level flag — runs CREATE TABLE IF NOT EXISTS at most once per server instance
let authTablesReady = false;
let authTablesPromise: Promise<void> | null = null;

/**
 * Ensure auth-related tables exist. Called lazily on first auth request
 * instead of on every single authorize/register call.
 *
 * Uses a module-level flag so the SQL only runs once per cold start.
 * Deduplicates concurrent calls via a shared promise (prevents the
 * scenario where multiple cold-start requests each run DDL in parallel).
 */
export async function ensureAuthTables(): Promise<void> {
  if (authTablesReady) return;

  // Deduplicate: if another call is already initializing, wait on it
  if (authTablesPromise) return authTablesPromise;

  authTablesPromise = _initTables();
  try {
    await authTablesPromise;
  } finally {
    authTablesPromise = null;
  }
}

async function _initTables(): Promise<void> {
  // Run DDL sequentially to avoid exhausting the connection pool on cold start.
  // These are all idempotent (IF NOT EXISTS / IF NOT EXISTS) so safe to re-run.
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
  await sql`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Migration columns (sequential to keep pool pressure low)
  await sql`ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE`;
  await sql`ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS failed_login_count INTEGER DEFAULT 0`;
  await sql`ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ`;

  authTablesReady = true;
}
