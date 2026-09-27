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
  useAppStore.setState({ whoopSync: {}, latestWhoopData: null, wearableHistory: [], whoopWorkouts: [], whoopBody: null, workoutLogs: [], trainingSessions: [] } as never);
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

  it('asks for a 60-day backfill first, then a short window, and MERGES history', async () => {
    localStorage.setItem('whoop_access_token', 'at');
    localStorage.setItem('whoop_token_expires', String(Date.now() + 3600e3));
    const old = Array.from({ length: 30 }, (_, i) => ({
      id: `old${i}`, date: new Date(now.getTime() - (i + 1) * 864e5), provider: 'whoop', hrv: 55,
    }));
    const bodies: any[] = [];
    mockFetch((u, init) => { if (u.includes('/api/whoop/data')) bodies.push(JSON.parse(String(init?.body))); return apiOk; });
    await syncWhoop({ force: true });
    expect(bodies[0].days).toBe(60);
    useAppStore.setState({ wearableHistory: old as never });
    await syncWhoop({ force: true });
    expect(bodies[1].days).toBe(10);
    const hist = useAppStore.getState().wearableHistory;
    expect(hist.length).toBe(31); // 30 stored days kept + today
    expect(hist[hist.length - 1].recoveryScore).toBe(71);
  });

  it('back-fills Whoop HR onto a lift logged before Whoop scored it', async () => {
    localStorage.setItem('whoop_access_token', 'at');
    localStorage.setItem('whoop_token_expires', String(Date.now() + 3600e3));
    const finish = new Date(now.getTime() - 3600e3);
    useAppStore.setState({ workoutLogs: [{ id: 'L1', date: finish, duration: 60, exercises: [], totalVolume: 8000, overallRPE: 8 }] as never });
    const w = { id: 'W1', sport_id: 45, sport_name: 'weightlifting', start: iso(new Date(finish.getTime() - 3600e3)), end: iso(finish),
      score_state: 'SCORED', score: { strain: 9.1, average_heart_rate: 118, max_heart_rate: 161, kilojoule: 1500, zone_durations: {} } };
    mockFetch(() => ({ ...apiOk, workouts: [w] }));
    const r = await syncWhoop({ force: true });
    expect(r.liftsLinked).toBe(1);
    const log = useAppStore.getState().workoutLogs.find(l => l.id === 'L1')!;
    expect(log.whoopHR).toMatchObject({ strain: 9.1, avgHR: 118, whoopWorkoutId: 'W1' });
    expect(log.updatedAt).toBeTruthy(); // syncs to the cloud like any edit
  });

  it('retries with the DB tokens when the server rotated ours (webhook refresh)', async () => {
    localStorage.setItem('whoop_access_token', 'stale');
    localStorage.setItem('whoop_refresh_token', 'rt-dead');
    localStorage.setItem('whoop_token_expires', String(Date.now() + 3600e3));
    mockFetch((u, init) => {
      if (u.includes('/api/whoop/tokens') && (init?.method ?? 'GET') === 'GET') {
        return { tokens: { access_token: 'fresh', refresh_token: 'rt-new', expires_at: String(Date.now() + 3600e3) } };
      }
      if (u.includes('/api/whoop/data')) {
        const body = JSON.parse(String(init?.body));
        return body.access_token === 'fresh' ? apiOk : { connected: false, requiresReconnect: true };
      }
      return {};
    });
    const r = await syncWhoop({ force: true });
    expect(r.status).toBe('ok');
    expect(localStorage.getItem('whoop_refresh_token')).toBe('rt-new');
  });
});


describe('syncWhoop mat import window', () => {
  it('backfill does not auto-import mat sessions older than a week', async () => {
    localStorage.setItem('whoop_access_token', 'at');
    localStorage.setItem('whoop_token_expires', String(Date.now() + 3600e3));
    const bjj = (id: string, daysAgo: number) => {
      const start = new Date(now.getTime() - daysAgo * 864e5);
      return { id, sport_id: 70, sport_name: 'jiu jitsu', start: iso(start), end: iso(new Date(start.getTime() + 3600e3)),
        score_state: 'SCORED', score: { strain: 14, average_heart_rate: 150, max_heart_rate: 185, kilojoule: 3000, zone_durations: {} } };
    };
    mockFetch(() => ({ ...apiOk, workouts: [bjj('recent', 2), bjj('old', 30)] }));
    await syncWhoop({ force: true });
    const ids = useAppStore.getState().trainingSessions.map(s => s.whoopWorkoutId);
    expect(ids).toContain('recent');
    expect(ids).not.toContain('old');
    // …but the old one is still stored for training load
    expect(useAppStore.getState().whoopWorkouts.map(w => w.id)).toContain('old');
  });
});
