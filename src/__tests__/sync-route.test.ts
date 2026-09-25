/**
 * /api/sync POST against an in-memory fake Postgres that honours row locks.
 * Reproduces the lost-update race (two pushes merging against the same old
 * row) and the richness guard throwing away trimmed-device pushes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/sync/route'; // vi.mock calls below are hoisted above this

// ── Fake Postgres: one table, FOR UPDATE row lock, BEGIN/COMMIT/ROLLBACK ──
const db = { row: null as null | Record<string, unknown>, lockHeld: false, waiters: [] as (() => void)[], writes: 0 };
function lockAcquire() {
  if (!db.lockHeld) { db.lockHeld = true; return Promise.resolve(); }
  return new Promise<void>(res => db.waiters.push(() => { db.lockHeld = true; res(); }));
}
function lockRelease() {
  db.lockHeld = false;
  const next = db.waiters.shift();
  if (next) next();
}
function makeClient() {
  let holds = false;
  let pending: Record<string, unknown> | null | undefined;
  const sqlFn = async (strings: TemplateStringsArray, ...vals: unknown[]) => {
    const q = strings.join('?');
    await new Promise(r => setTimeout(r, 1)); // interleave concurrent requests
    if (/^\s*BEGIN/.test(q)) return { rows: [] };
    if (/INSERT INTO user_store/.test(q)) { if (!db.row) db.row = {}; return { rows: [] }; }
    if (/SELECT data FROM user_store/.test(q)) {
      if (/FOR UPDATE/.test(q)) { await lockAcquire(); holds = true; }
      return { rows: [{ data: JSON.parse(JSON.stringify(db.row)) }] };
    }
    if (/UPDATE user_store SET data/.test(q)) { pending = JSON.parse(vals[0] as string); return { rows: [] }; }
    if (/^\s*COMMIT/.test(q)) {
      if (pending !== undefined) { db.row = pending; db.writes++; }
      if (holds) { holds = false; lockRelease(); }
      return { rows: [] };
    }
    if (/^\s*ROLLBACK/.test(q)) { pending = undefined; if (holds) { holds = false; lockRelease(); } return { rows: [] }; }
    return { rows: [] }; // gamification upsert, backups, CREATE TABLE
  };
  return { sql: sqlFn, release: () => {} };
}

vi.mock('@vercel/postgres', () => ({
  sql: async () => ({ rows: [] }),
  db: { connect: async () => makeClient() },
}));
vi.mock('@/lib/auth', () => ({ auth: async () => ({ user: { id: 'u1' } }) }));
vi.mock('@/lib/db-backup', () => ({ createBackupIfEligible: async () => {} }));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: () => ({ limited: false }), getClientIP: () => '1.1.1.1' }));


const push = (data: Record<string, unknown>) => POST(new Request('http://x/api/sync', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ userId: 'u1', data }),
}));
const log = (id: string, day: number) => ({ id, date: new Date(2026, 8, day).toISOString(), exercises: [] });

beforeEach(() => { db.row = null; db.lockHeld = false; db.waiters = []; db.writes = 0; });

describe('/api/sync POST', () => {
  it('two concurrent pushes both survive (no lost update)', async () => {
    db.row = { workoutLogs: [log('base', 1)], lastSyncAt: 1 };
    const [a, b] = await Promise.all([
      push({ workoutLogs: [log('base', 1), log('phone', 2)], lastSyncAt: 10 }),
      push({ workoutLogs: [log('base', 1), log('laptop', 3)], lastSyncAt: 11 }),
    ]);
    expect((await a.json()).success).toBe(true);
    expect((await b.json()).success).toBe(true);
    const ids = (db.row!.workoutLogs as { id: string }[]).map(l => l.id).sort();
    expect(ids).toEqual(['base', 'laptop', 'phone']);
  });

  it('a device holding only its trimmed slice is merged, not rejected', async () => {
    db.row = { isOnboarded: true, user: {}, workoutLogs: Array.from({ length: 60 }, (_, i) => log(`w${i}`, 1 + (i % 28))), lastSyncAt: 1 };
    const res = await push({ isOnboarded: true, user: {}, workoutLogs: [log('w59', 4), log('new', 25)], lastSyncAt: 5 });
    expect((await res.json()).success).toBe(true);
    expect((db.row!.workoutLogs as unknown[]).length).toBe(61);
  });

  it('first push for a new user is written as-is, and plaintext tokens are never stored', async () => {
    const res = await push({ user: { name: 'I' }, _whoopTokens: { accessToken: 'x' }, lastSyncAt: 2 });
    expect((await res.json()).success).toBe(true);
    expect(db.row!.user).toEqual({ name: 'I' });
    expect(db.row!._whoopTokens).toBeUndefined();
  });

  it('a push for another user is forbidden', async () => {
    const res = await POST(new Request('http://x/api/sync', { method: 'POST', body: JSON.stringify({ userId: 'someone-else', data: {} }) }));
    expect(res.status).toBe(403);
  });
});
