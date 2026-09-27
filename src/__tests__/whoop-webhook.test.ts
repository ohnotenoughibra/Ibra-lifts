/**
 * /api/whoop/webhook — signed Whoop deliveries → one recovery push per day.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signWhoopWebhook, verifyWhoopWebhook, recoveryPushPayload, parseWhoopWebhook } from '@/lib/whoop-webhook';

const db = {
  tokens: [] as any[],
  store: [] as any[],
  subs: [] as any[],
  updates: [] as any[],
  tokenUpdates: [] as any[],
  deletes: [] as string[],
};
vi.mock('@vercel/postgres', () => ({
  sql: async (strings: TemplateStringsArray, ...vals: unknown[]) => {
    const q = strings.join('?');
    if (/FROM whoop_tokens WHERE whoop_user_id/.test(q)) return { rows: db.tokens.filter(t => t.whoop_user_id === vals[0]) };
    if (/FROM user_store/.test(q)) return { rows: db.store };
    if (/FROM push_subscriptions WHERE user_id/.test(q)) return { rows: db.subs };
    if (/UPDATE push_subscriptions SET last_sent/.test(q)) { db.updates.push({ sent: JSON.parse(vals[0] as string), endpoint: vals[1] }); return { rows: [] }; }
    if (/UPDATE whoop_tokens SET access_token/.test(q)) { db.tokenUpdates.push(vals); return { rows: [] }; }
    if (/DELETE FROM push_subscriptions/.test(q)) { db.deletes.push(vals[0] as string); return { rows: [] }; }
    return { rows: [] };
  },
}));
vi.mock('@/lib/crypto', () => ({ encrypt: (t: string) => `enc:${t}`, decrypt: (t: string) => t.replace(/^enc:/, '') }));
const sendNotification = vi.fn();
vi.mock('web-push', () => ({ default: { setVapidDetails: vi.fn(), sendNotification: (...a: unknown[]) => sendNotification(...a) } }));

import { POST } from '@/app/api/whoop/webhook/route';

const SECRET = 'whoop-client-secret';
const scored = { score_state: 'SCORED', score: { recovery_score: 28.4, hrv_rmssd_milli: 41.2, resting_heart_rate: 58 } };

function signed(body: object, { secret = SECRET, ts = String(Date.now()) } = {}) {
  const raw = JSON.stringify(body);
  return new Request('http://app.test/api/whoop/webhook', {
    method: 'POST', body: raw,
    headers: { 'x-whoop-signature': signWhoopWebhook(ts, raw, secret), 'x-whoop-signature-timestamp': ts },
  });
}

let whoopCalls: string[] = [];
beforeEach(() => {
  process.env.WHOOP_CLIENT_SECRET = SECRET;
  process.env.WHOOP_CLIENT_ID = 'id';
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'p';
  process.env.VAPID_PRIVATE_KEY = 'k';
  db.tokens = [{ whoop_user_id: '10129', user_id: 'u1', access_token: 'enc:at', refresh_token: 'enc:rt', expires_at: String(Date.now() + 3600e3) }];
  db.store = [{ data: { notificationPreferences: { pushEnabled: true, recoveryAlerts: true, timeZone: 'UTC' } } }];
  db.subs = [{ endpoint: 'e1', p256dh: 'a', auth: 'b', last_sent: {} }];
  db.updates = []; db.tokenUpdates = []; db.deletes = [];
  sendNotification.mockReset();
  whoopCalls = [];
  global.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url);
    whoopCalls.push(`${init?.method ?? 'GET'} ${u}`);
    if (u.includes('/oauth/oauth2/token')) return new Response(JSON.stringify({ access_token: 'at2', refresh_token: 'rt2', expires_in: 3600 }), { status: 200 });
    if (u.includes('/recovery')) return new Response(JSON.stringify({ records: [scored] }), { status: 200 });
    return new Response('{}', { status: 404 });
  }) as typeof fetch;
});

describe('signature', () => {
  it('accepts a valid signature and rejects tampering, a wrong key, or an old timestamp', () => {
    const ts = String(Date.now());
    const raw = '{"user_id":1,"type":"recovery.updated"}';
    const sig = signWhoopWebhook(ts, raw, SECRET);
    expect(verifyWhoopWebhook(raw, sig, ts, SECRET)).toBe(true);
    expect(verifyWhoopWebhook(raw.replace('1', '2'), sig, ts, SECRET)).toBe(false);
    expect(verifyWhoopWebhook(raw, signWhoopWebhook(ts, raw, 'other'), ts, SECRET)).toBe(false);
    const old = String(Date.now() - 10 * 60e3);
    expect(verifyWhoopWebhook(raw, signWhoopWebhook(old, raw, SECRET), old, SECRET)).toBe(false);
    expect(verifyWhoopWebhook(raw, sig, ts, undefined)).toBe(false);
    expect(verifyWhoopWebhook(raw, null, ts, SECRET)).toBe(false);
  });

  it('parses the v2 payload', () => {
    expect(parseWhoopWebhook('{"user_id":10129,"id":"abc","type":"recovery.updated","trace_id":"t"}'))
      .toEqual({ user_id: '10129', id: 'abc', type: 'recovery.updated' });
    expect(parseWhoopWebhook('nope')).toBeNull();
  });
});

describe('recoveryPushPayload', () => {
  it('red / yellow / green with vitals; nothing for an unscored record', () => {
    expect(recoveryPushPayload(scored)).toMatchObject({ title: 'Recovery 28% — red', tag: 'whoop-recovery' });
    expect(recoveryPushPayload(scored)!.body).toMatch(/^HRV 41 ms · RHR 58\. /);
    expect(recoveryPushPayload({ score_state: 'SCORED', score: { recovery_score: 50 } })!.title).toBe('Recovery 50% — yellow');
    expect(recoveryPushPayload({ score_state: 'SCORED', score: { recovery_score: 80 } })!.title).toBe('Recovery 80% — green');
    expect(recoveryPushPayload({ score_state: 'PENDING_SCORE' })).toBeNull();
  });
});

describe('POST /api/whoop/webhook', () => {
  const event = { user_id: 10129, id: 'sleep-uuid', type: 'recovery.updated', trace_id: 't' };

  it('401 on a bad signature (nothing read, nothing sent)', async () => {
    const res = await POST(signed(event, { secret: 'wrong' }));
    expect(res.status).toBe(401);
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it('ignores event types other than recovery.updated', async () => {
    const res = await (await POST(signed({ ...event, type: 'workout.updated' }))).json();
    expect(res.ignored).toBe('workout.updated');
    expect(whoopCalls).toEqual([]);
  });

  it('pushes the scored recovery and records it for today', async () => {
    const res = await (await POST(signed(event))).json();
    expect(res.sent).toBe(1);
    expect(JSON.parse(sendNotification.mock.calls[0][1]).title).toBe('Recovery 28% — red');
    expect(db.updates[0].sent['whoop-recovery']).toBe(new Date().toISOString().slice(0, 10));
  });

  it('sends at most once a day (Whoop re-sends on re-score)', async () => {
    db.subs[0].last_sent = { 'whoop-recovery': new Date().toISOString().slice(0, 10) };
    const res = await (await POST(signed(event))).json();
    expect(res.skipped).toBe('already_sent');
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it('respects push / recovery-alert settings and unknown Whoop users', async () => {
    db.store = [{ data: { notificationPreferences: { pushEnabled: true, recoveryAlerts: false } } }];
    expect((await (await POST(signed(event))).json()).skipped).toBe('push_off');
    expect((await (await POST(signed({ ...event, user_id: 999 }))).json()).skipped).toBe('unknown_user');
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it('refreshes an expired token and saves the rotated pair', async () => {
    db.tokens[0].expires_at = String(Date.now() - 1000);
    const res = await (await POST(signed(event))).json();
    expect(res.sent).toBe(1);
    expect(whoopCalls.some(c => c.includes('/oauth/oauth2/token'))).toBe(true);
    expect(db.tokenUpdates[0].slice(0, 2)).toEqual(['enc:at2', 'enc:rt2']);
  });

  it('drops a gone push endpoint', async () => {
    sendNotification.mockRejectedValueOnce(Object.assign(new Error('gone'), { statusCode: 410 }));
    await POST(signed(event));
    expect(db.deletes).toEqual(['e1']);
  });
});
