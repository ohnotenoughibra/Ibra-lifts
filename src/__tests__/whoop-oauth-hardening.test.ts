/**
 * Whoop OAuth hardening — signed state, account binding, same-origin proxy.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signWhoopState, verifyWhoopState } from '@/lib/whoop-state';

const session = { user: { id: 'victim' } as { id: string } | null };
vi.mock('@/lib/auth', () => ({ auth: async () => (session.user ? { user: session.user } : null) }));
const saved: unknown[] = [];
vi.mock('@vercel/postgres', () => ({ sql: async (s: TemplateStringsArray, ...v: unknown[]) => { if (/INSERT INTO whoop_tokens/.test(s.join('?'))) saved.push(v); return { rows: [] }; } }));
vi.mock('@/lib/crypto', () => ({ encrypt: (t: string) => `enc:${t}`, decrypt: (t: string) => t }));

import { POST as saveTokens } from '@/app/api/whoop/tokens/route';
import { POST as dataProxy } from '@/app/api/whoop/data/route';
import { GET as callback } from '@/app/api/whoop/callback/route';

beforeEach(() => { process.env.AUTH_SECRET = 'test-secret-test-secret-test-secret'; session.user = { id: 'victim' }; saved.length = 0; });

describe('signed state', () => {
  it('round-trips and rejects tampering or age', () => {
    const s = signWhoopState('u1', true, 1_000_000);
    expect(verifyWhoopState(s, 1_000_000 + 60_000)).toMatchObject({ u: 'u1', p: true });
    expect(verifyWhoopState(s, 1_000_000 + 11 * 60_000)).toBeNull();
    const [v, body, mac] = s.split('.');
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, 'base64url').toString()), u: 'attacker' })).toString('base64url');
    expect(verifyWhoopState(`${v}.${forged}.${mac}`, 1_000_000)).toBeNull();
    expect(verifyWhoopState('pwa:whoop_abcdef', 1_000_000)).toBeNull();
  });
});

describe('/api/whoop/tokens POST binding', () => {
  const post = (body: object) => saveTokens(new Request('http://x/api/whoop/tokens', { method: 'POST', body: JSON.stringify(body) }));
  it('rejects a callback save started by another account', async () => {
    const res = await post({ access_token: 'a', refresh_token: 'r', state: signWhoopState('attacker', true) });
    expect(res.status).toBe(403);
    expect(saved).toHaveLength(0);
  });
  it('rejects a callback save started while signed out', async () => {
    expect((await post({ access_token: 'a', state: signWhoopState(null, true) })).status).toBe(403);
  });
  it('accepts the signed-in user\'s own flow, and refresh saves without a state', async () => {
    expect((await post({ access_token: 'a', state: signWhoopState('victim', true) })).status).toBe(200);
    expect((await post({ access_token: 'b' })).status).toBe(200);
    expect(saved).toHaveLength(2);
  });
});

describe('/api/whoop/callback', () => {
  it('refuses an unsigned or prefix-spoofed state before using the code', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    process.env.WHOOP_CLIENT_ID = 'id'; process.env.WHOOP_CLIENT_SECRET = 'sec';
    const res = await callback(new Request('http://app.test/api/whoop/callback?code=abc&state=pwa:whoop_123') as never);
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.headers.get('location') ?? '').toContain('whoop_error');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe('/api/whoop/data proxy', () => {
  it('refuses cross-site callers', async () => {
    const req = new Request('http://app.test/api/whoop/data', { method: 'POST', headers: { origin: 'https://evil.example', host: 'app.test', 'content-type': 'application/json' }, body: JSON.stringify({ access_token: 'x' }) });
    expect((await dataProxy(req as never)).status).toBe(403);
    const req2 = new Request('http://app.test/api/whoop/data', { method: 'POST', headers: { 'sec-fetch-site': 'cross-site' }, body: '{}' });
    expect((await dataProxy(req2 as never)).status).toBe(403);
  });
});
