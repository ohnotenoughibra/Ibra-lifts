import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import webpush from 'web-push';
import { dueReminders, localParts } from '@/lib/push-reminders';

/**
 * GET /api/cron/notify — send the reminders that are due right now.
 *
 * Called hourly by a scheduler (GitHub Actions workflow `notify-cron.yml`, or
 * a Vercel Cron on Pro) with `Authorization: Bearer $CRON_SECRET`. For every
 * stored push subscription it reads that athlete's synced data, works out
 * what's due in THEIR time zone (lib/push-reminders), sends it, and records
 * it per endpoint so each reminder goes out at most once a day. Dead
 * endpoints (404/410) are deleted.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return NextResponse.json({ error: 'VAPID keys missing' }, { status: 503 });
  webpush.setVapidDetails(process.env.VAPID_EMAIL || 'mailto:noreply@rootsgains.com', pub, priv);

  await sql`CREATE TABLE IF NOT EXISTS push_subscriptions (
    endpoint TEXT PRIMARY KEY, user_id TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS last_sent JSONB DEFAULT '{}'::jsonb`;

  const { rows } = await sql`
    SELECT p.endpoint, p.p256dh, p.auth, p.last_sent, u.data
    FROM push_subscriptions p JOIN user_store u ON u.user_id = p.user_id`;

  const now = new Date();
  let sent = 0; let removed = 0; let failed = 0;
  for (const row of rows) {
    const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    const lastSent: Record<string, string> = row.last_sent ?? {};
    const due = dueReminders(data ?? {}, now, lastSent);
    if (due.length === 0) continue;
    const today = localParts(now, data?.notificationPreferences?.timeZone).dateKey;
    const sub = { endpoint: row.endpoint as string, keys: { p256dh: row.p256dh as string, auth: row.auth as string } };
    const nextSent = { ...lastSent };
    let dead = false;
    for (const p of due) {
      try {
        await webpush.sendNotification(sub, JSON.stringify(p), { TTL: 3 * 3600 });
        nextSent[p.tag] = today;
        sent++;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) { dead = true; break; }
        failed++;
      }
    }
    if (dead) {
      await sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`;
      removed++;
    } else {
      await sql`UPDATE push_subscriptions SET last_sent = ${JSON.stringify(nextSent)}::jsonb WHERE endpoint = ${sub.endpoint}`;
    }
  }
  return NextResponse.json({ subscriptions: rows.length, sent, removed, failed });
}
