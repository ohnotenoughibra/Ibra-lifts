/**
 * /api/cron/notify — secret-gated, sends due reminders once, drops dead endpoints.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/cron/notify/route';

const state = { rows: [] as any[], updates: [] as any[], deletes: [] as string[] };
vi.mock('@vercel/postgres', () => ({
  sql: async (strings: TemplateStringsArray, ...vals: unknown[]) => {
    const q = strings.join('?');
    if (/SELECT p.endpoint/.test(q)) return { rows: state.rows };
    if (/UPDATE push_subscriptions SET last_sent/.test(q)) { state.updates.push({ sent: JSON.parse(vals[0] as string), endpoint: vals[1] }); return { rows: [] }; }
    if (/DELETE FROM push_subscriptions/.test(q)) { state.deletes.push(vals[0] as string); return { rows: [] }; }
    return { rows: [] };
  },
}));
const sendNotification = vi.fn();
vi.mock('web-push', () => ({ default: { setVapidDetails: vi.fn(), sendNotification: (...a: unknown[]) => sendNotification(...a) } }));

const data = {
  user: { trainingDays: [0, 1, 2, 3, 4, 5, 6] },
  notificationPreferences: { pushEnabled: true, trainingReminders: true, reminderTime: '07:00', timeZone: 'UTC' },
  workoutLogs: [], currentMesocycle: null, gamificationStats: { currentStreak: 0 }, competitions: [],
};
const req = (auth?: string) => new Request('http://x/api/cron/notify', { headers: auth ? { authorization: auth } : {} });

describe('cron notify route', () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-23T12:00:00Z'));
    process.env.CRON_SECRET = 's3cret'; process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'p'; process.env.VAPID_PRIVATE_KEY = 'k';
    state.rows = [{ endpoint: 'e1', p256dh: 'a', auth: 'b', last_sent: {}, data }];
    state.updates = []; state.deletes = []; sendNotification.mockReset();
  });

  it('rejects calls without the secret', async () => {
    expect((await GET(req())).status).toBe(401);
    expect((await GET(req('Bearer nope'))).status).toBe(401);
  });

  it('sends a due reminder and records it for today', async () => {
    const res = await (await GET(req('Bearer s3cret'))).json();
    expect(res.sent).toBe(1);
    expect(JSON.parse(sendNotification.mock.calls[0][1]).tag).toBe('training-reminder');
    expect(state.updates[0]).toEqual({ sent: { 'training-reminder': '2026-09-23' }, endpoint: 'e1' });
  });

  it('does not resend what was already sent today', async () => {
    state.rows[0].last_sent = { 'training-reminder': '2026-09-23' };
    const res = await (await GET(req('Bearer s3cret'))).json();
    expect(res.sent).toBe(0);
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it('deletes a gone endpoint', async () => {
    sendNotification.mockRejectedValueOnce(Object.assign(new Error('gone'), { statusCode: 410 }));
    const res = await (await GET(req('Bearer s3cret'))).json();
    expect(res.removed).toBe(1);
    expect(state.deletes).toEqual(['e1']);
  });
});
