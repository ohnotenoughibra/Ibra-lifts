import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import webpush from 'web-push';
import { encrypt, decrypt } from '@/lib/crypto';
import { refreshAccessToken, whoopFetch } from '@/lib/whoop';
import { localParts } from '@/lib/push-reminders';
import {
  verifyWhoopWebhook, parseWhoopWebhook, recoveryPushPayload, RECOVERY_PUSH_TAG,
} from '@/lib/whoop-webhook';

/**
 * POST /api/whoop/webhook — Whoop calls this when data is scored.
 *
 * On `recovery.updated`: find the athlete by their Whoop user id, read the
 * newest recovery with their stored tokens, and push "Recovery 34% — red …"
 * to their devices (once per local day; Whoop re-sends when it re-scores).
 *
 * Setup: in the Whoop developer dashboard set the webhook URL to
 * <app>/api/whoop/webhook (model version v2). Signed with WHOOP_CLIENT_SECRET.
 *
 * Always answers 2xx once the signature checks out, so Whoop doesn't retry
 * events we deliberately skip (unknown user, push off, already sent today).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: Request) {
  const raw = await request.text();
  const ok = verifyWhoopWebhook(
    raw,
    request.headers.get('x-whoop-signature'),
    request.headers.get('x-whoop-signature-timestamp'),
    process.env.WHOOP_CLIENT_SECRET,
  );
  if (!ok) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

  const event = parseWhoopWebhook(raw);
  if (!event) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  if (event.type !== 'recovery.updated') return NextResponse.json({ ignored: event.type });

  try {
    return NextResponse.json(await handleRecovery(event.user_id));
  } catch (err) {
    // Log and 500 so Whoop retries a transient DB/API failure.
    console.error('Whoop webhook error:', err);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}

async function handleRecovery(whoopUserId: string): Promise<Record<string, unknown>> {
  let rows: Record<string, any>[];
  try {
    ({ rows } = await sql`
      SELECT user_id, access_token, refresh_token, expires_at
      FROM whoop_tokens WHERE whoop_user_id = ${whoopUserId}`);
  } catch (err: any) {
    // Column/table not created yet — nobody has saved tokens since this shipped.
    if (/does not exist/.test(err?.message ?? '')) return { skipped: 'no_link' };
    throw err;
  }
  if (rows.length === 0) return { skipped: 'unknown_user' };
  const userId = rows[0].user_id as string;

  // Only athletes who turned on push + recovery alerts.
  const { rows: storeRows } = await sql`SELECT data FROM user_store WHERE user_id = ${userId}`;
  const data = storeRows[0] ? (typeof storeRows[0].data === 'string' ? JSON.parse(storeRows[0].data) : storeRows[0].data) : {};
  const prefs = data?.notificationPreferences ?? {};
  if (!prefs.pushEnabled || prefs.recoveryAlerts === false) return { skipped: 'push_off' };

  await sql`CREATE TABLE IF NOT EXISTS push_subscriptions (
    endpoint TEXT PRIMARY KEY, user_id TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS last_sent JSONB DEFAULT '{}'::jsonb`;
  const { rows: subs } = await sql`
    SELECT endpoint, p256dh, auth, last_sent FROM push_subscriptions WHERE user_id = ${userId}`;
  if (subs.length === 0) return { skipped: 'no_devices' };
  const today = localParts(new Date(), prefs.timeZone).dateKey;
  const pending = subs.filter(s => (s.last_sent ?? {})[RECOVERY_PUSH_TAG] !== today);
  if (pending.length === 0) return { skipped: 'already_sent' };

  const accessToken = await usableAccessToken(userId, rows[0]);
  if (!accessToken) return { skipped: 'token_dead' };
  const rec = await whoopFetch('/recovery', accessToken, { limit: '1' });
  if (rec.error) throw new Error(rec.error);
  const payload = recoveryPushPayload(rec.data?.records?.[0]);
  if (!payload) return { skipped: 'not_scored' };

  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return { skipped: 'vapid_missing' };
  webpush.setVapidDetails(process.env.VAPID_EMAIL || 'mailto:noreply@rootsgains.com', pub, priv);

  let sent = 0;
  for (const s of pending) {
    const sub = { endpoint: s.endpoint as string, keys: { p256dh: s.p256dh as string, auth: s.auth as string } };
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 6 * 3600 });
      const nextSent = { ...(s.last_sent ?? {}), [RECOVERY_PUSH_TAG]: today };
      await sql`UPDATE push_subscriptions SET last_sent = ${JSON.stringify(nextSent)}::jsonb WHERE endpoint = ${sub.endpoint}`;
      sent++;
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`;
    }
  }
  return { sent };
}

/**
 * The stored access token, refreshed (and saved back) when it's expired.
 * Whoop refresh tokens are single-use: after we rotate here the app's copy is
 * dead, so whoop-sync falls back to the DB tokens before asking to reconnect.
 */
async function usableAccessToken(userId: string, row: Record<string, any>): Promise<string | null> {
  const access = decrypt(row.access_token);
  const expires = Number(row.expires_at);
  if (access && Number.isFinite(expires) && expires > Date.now() + 60_000) return access;
  const refresh = decrypt(row.refresh_token);
  if (!refresh) return access || null;
  const fresh = await refreshAccessToken(refresh);
  if (!fresh) return null;
  const expiresAt = String(Date.now() + fresh.expires_in * 1000);
  await sql`
    UPDATE whoop_tokens SET access_token = ${encrypt(fresh.access_token)},
      refresh_token = ${encrypt(fresh.refresh_token)}, expires_at = ${expiresAt}, updated_at = NOW()
    WHERE user_id = ${userId}`;
  return fresh.access_token;
}
