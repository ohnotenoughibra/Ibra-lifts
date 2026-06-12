import { sql } from '@vercel/postgres';

// Crews live entirely server-side (NOT in the per-user JSONB sync blob): they
// are shared, multi-user state queried live. A user opts in by joining a crew;
// only their display name + weekly consistency numbers ever become visible, and
// only to that crew.

let ready = false;
export async function ensureCrewTables(): Promise<void> {
  if (ready) return;
  await sql`
    CREATE TABLE IF NOT EXISTS crews (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      join_code  TEXT UNIQUE NOT NULL,
      owner_id   TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS crew_members (
      crew_id            TEXT NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
      user_id            TEXT NOT NULL,
      display_name       TEXT NOT NULL,
      week_key           TEXT,
      sessions_this_week INT DEFAULT 0,
      current_streak     INT DEFAULT 0,
      total_points       INT DEFAULT 0,
      metrics_updated_at TIMESTAMPTZ,
      joined_at          TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (crew_id, user_id)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_crew_members_user ON crew_members(user_id)`;
  // Finalized weekly winners — one row per crew per completed week. Lazily filled
  // when a member first syncs in the following week. PK makes finalize idempotent.
  await sql`
    CREATE TABLE IF NOT EXISTS crew_week_winners (
      crew_id      TEXT NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
      week_key     TEXT NOT NULL,
      winner_name  TEXT NOT NULL,
      sessions     INT NOT NULL,
      finalized_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (crew_id, week_key)
    )
  `;
  ready = true;
}

// The Monday-key of the week before the given week-key (both YYYY-MM-DD Mondays).
export function prevWeekKey(weekKey: string): string {
  const d = new Date(weekKey + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() - 7);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Join codes: 6 chars from an alphabet with visually-ambiguous glyphs removed
// (no 0/O, 1/I/L) so they're easy to read aloud / type at the gym.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function generateJoinCode(len = 6): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let s = '';
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return s;
}

export function normalizeJoinCode(raw: unknown): string {
  return String(raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

// Server-side clamp so a tampered client can't push absurd numbers onto a board.
export function clampInt(n: unknown, min: number, max: number): number {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, v));
}

export function sanitizeName(raw: unknown, max = 40): string {
  return String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export const MAX_CREWS_PER_USER = 5;
export const MAX_CREW_SIZE = 50;
export const MAX_SESSIONS_WEEK = 21; // 3/day ceiling — anything above is spoofed
export const MAX_STREAK = 3650;       // 10 years
