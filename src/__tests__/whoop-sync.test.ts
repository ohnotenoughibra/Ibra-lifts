/**
 * Shared Whoop sync (audit 2026-09-24): background + Wearable screen use one
 * path; errors are recorded, not swallowed; concurrent callers share one
 * request (Whoop refresh tokens are single-use).
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { syncWhoop } from '@/lib/whoop-sync';
import { useAppStore } from '@/lib/store';

const now = new Date();
const iso = (d: Date) => d.toISOString();
const apiOk = {
  connected: true,
  profile: { first_name: 'I' },
  recovery: [{ cycle_id: 1, sleep_id: 's1', created_at: iso(now), updated_at: iso(now), score_state: 'SCORED',
    score: { recovery_score: 71, resting_heart_rate: 50, hrv_rmssd_milli: 62, spo2_percentage: 97, skin_temp_celsius: 33.5 } }],
  cycles: [{ id: 1, start: iso(new Date(now.getTime() - 6 * 3600e3)), end: null, score_state: 'SCORED',
    score: { strain: 9.4, kilojoule: 8000, average_heart_rate: 70, max_heart_rate: 160 } }],
  sleep: [],
  workouts: [],
  body: null,
};

function mockFetch(handler: (url: string, init?: RequestInit) => unknown) {
  const calls: string[] = [];
  global.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url);
    calls.push(`${init?.method ?? 'GET'} ${u} ${typeof init?.body === 'string' ? init.body : ''}`);
    const body = handler(u, init);
    return new Response(JSON.stringify(body ?? {}), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  return calls;
}

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState({ whoopSync: {}, latestWhoopData: null, wearableHistory: [] } as never);
});
afterEach(() => vi.restoreAllMocks());

describe('syncWhoop', () => {
  it('reports not_connected when there are no tokens anywhere', async () => {
    mockFetch(u => (u.includes('/api/whoop/tokens') ? {} : apiOk));
    expect((await syncWhoop()).status).toBe('not_connected');
  });

  it('restores tokens from the server DB, syncs, and records success', async () => {
    const calls = mockFetch(u => (u.includes('/api/whoop/tokens')
      ? { tokens: { access_token: 'at', refresh_token: 'rt', expires_at: String(Date.now() + 3600e3) } }
      : apiOk));
    const r = await syncWhoop();
    expect(r.status).toBe('ok');
    expect(useAppStore.getState().latestWhoopData?.recoveryScore).toBe(71);
    expect(useAppStore.getState().whoopSync?.lastSuccessAt).toBeTruthy();
    expect(useAppStore.getState().whoopSync?.lastError).toBeUndefined();
    expect(calls.some(c => c.startsWith('POST /api/whoop/data'))).toBe(true);
  });

  it('concurrent callers share ONE data request (no refresh-token race)', async () => {
    localStorage.setItem('whoop_access_token', 'at');
    localStorage.setItem('whoop_refresh_token', 'rt');
    localStorage.setItem('whoop_token_expires', String(Date.now() + 3600e3));
    const calls = mockFetch(() => apiOk);
    const [a, b] = await Promise.all([syncWhoop(), syncWhoop({ force: true })]);
    expect(a).toBe(b);
    expect(calls.filter(c => c.startsWith('POST /api/whoop/data')).length).toBe(1);
  });

  it('refreshes an expired token BEFORE the data call and stores the rotated tokens', async () => {
    localStorage.setItem('whoop_access_token', 'old');
    localStorage.setItem('whoop_refresh_token', 'rt1');
    localStorage.setItem('whoop_token_expires', String(Date.now() - 1000));
    mockFetch((u, init) => {
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
      if (u.includes('/api/whoop/data') && body.access_token === 'expired_proactive_refresh') {
        return { connected: false, new_access_token: 'new', new_refresh_token: 'rt2', new_expires_in: 3600 };
      }
      if (u.includes('/api/whoop/data')) {
        expect(body.access_token).toBe('new');
        return apiOk;
      }
      return {};
    });
    expect((await syncWhoop()).status).toBe('ok');
    expect(localStorage.getItem('whoop_refresh_token')).toBe('rt2');
  });

  it('dead tokens → reconnect status recorded (not swallowed) and tokens cleared', async () => {
    localStorage.setItem('whoop_access_token', 'at');
    localStorage.setItem('whoop_refresh_token', 'rt');
    localStorage.setItem('whoop_token_expires', String(Date.now() + 3600e3));
    mockFetch(u => (u.includes('/api/whoop/data') ? { connected: false, requiresReconnect: true, error: 'expired' } : {}));
    const r = await syncWhoop();
    expect(r.status).toBe('reconnect');
    expect(useAppStore.getState().whoopSync?.lastError).toMatch(/reconnect/i);
    expect(localStorage.getItem('whoop_access_token')).toBeNull();
  });

  it('skips only when fresh AND today\'s recovery is already in', async () => {
    localStorage.setItem('whoop_access_token', 'at');
    localStorage.setItem('whoop_token_expires', String(Date.now() + 3600e3));
    const calls = mockFetch(() => apiOk);
    await syncWhoop();
    expect((await syncWhoop()).status).toBe('skipped');
    useAppStore.setState({ latestWhoopData: { ...useAppStore.getState().latestWhoopData!, recoveryScore: null } });
    expect((await syncWhoop()).status).toBe('ok'); // recovery not scored yet → keep checking
    expect(calls.filter(c => c.startsWith('POST /api/whoop/data')).length).toBe(2);
  });
});
