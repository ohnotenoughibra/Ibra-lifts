/**
 * /api/whoop/tokens POST stores the Whoop user id so the webhook (which only
 * knows Whoop's id) can find the athlete.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signWhoopState } from '@/lib/whoop-state';

vi.mock('@/lib/auth', () => ({ auth: async () => ({ user: { id: 'u1' } }) }));
vi.mock('@/lib/crypto', () => ({ encrypt: (t: string) => t, decrypt: (t: string) => t }));
const db = { linked: null as string | null, links: [] as unknown[] };
vi.mock('@vercel/postgres', () => ({
  sql: async (s: TemplateStringsArray, ...v: unknown[]) => {
    const q = s.join('?');
    if (/INSERT INTO whoop_tokens/.test(q)) return { rows: [{ whoop_user_id: db.linked }] };
    if (/UPDATE whoop_tokens SET whoop_user_id/.test(q)) { db.links.push(v); db.linked = v[0] as string; return { rows: [] }; }
    return { rows: [] };
  },
}));
import { POST } from '@/app/api/whoop/tokens/route';

let profileCalls = 0;
beforeEach(() => {
  process.env.AUTH_SECRET = 'test-secret-test-secret-test-secret';
  db.linked = null; db.links = []; profileCalls = 0;
  global.fetch = vi.fn(async (url: RequestInfo | URL) => {
    if (String(url).includes('/user/profile/basic')) { profileCalls++; return new Response(JSON.stringify({ user_id: 10129 }), { status: 200 }); }
    return new Response('{}', { status: 404 });
  }) as typeof fetch;
});
const post = (body: object) => POST(new Request('http://x/api/whoop/tokens', { method: 'POST', body: JSON.stringify(body) }));

describe('whoop_user_id link', () => {
  it('links on save when not linked yet, then stops asking Whoop', async () => {
    expect((await post({ access_token: 'a', refresh_token: 'r' })).status).toBe(200);
    expect(db.links).toEqual([['10129', 'u1']]);
    await post({ access_token: 'b', refresh_token: 'r2' });
    expect(profileCalls).toBe(1);
  });

  it('re-links on every connect (could be a different Whoop account)', async () => {
    db.linked = '555';
    await post({ access_token: 'a', state: signWhoopState('u1', false) });
    expect(db.linked).toBe('10129');
  });
});
