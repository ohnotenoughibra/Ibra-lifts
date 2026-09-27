/**
 * whoop-webhook — pure pieces of the Whoop → push-notification path.
 *
 * Whoop POSTs `{ user_id, id, type, trace_id }` to /api/whoop/webhook when
 * something is scored. Each request is signed:
 *   X-WHOOP-Signature           base64( HMAC-SHA256( timestamp + rawBody, client secret ) )
 *   X-WHOOP-Signature-Timestamp ms since epoch
 * We only act on `recovery.updated`: the morning recovery arrives as a push
 * instead of waiting for the athlete to open the app.
 */
import { createHmac, timingSafeEqual } from 'crypto';
import type { PushPayload } from './push-reminders';

/** Reject deliveries whose signed timestamp is further than this from now (replay guard). */
export const MAX_SKEW_MS = 5 * 60 * 1000;

export function signWhoopWebhook(timestamp: string, rawBody: string, secret: string): string {
  return createHmac('sha256', secret).update(timestamp + rawBody).digest('base64');
}

export function verifyWhoopWebhook(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  secret: string | undefined,
  now: number = Date.now(),
): boolean {
  if (!secret || !signature || !timestamp) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > MAX_SKEW_MS) return false;
  const expected = Buffer.from(signWhoopWebhook(timestamp, rawBody, secret));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export interface WhoopWebhookEvent { user_id: string; id: string; type: string }

export function parseWhoopWebhook(rawBody: string): WhoopWebhookEvent | null {
  try {
    const b = JSON.parse(rawBody);
    if (b == null || (typeof b.user_id !== 'number' && typeof b.user_id !== 'string') || typeof b.type !== 'string') return null;
    return { user_id: String(b.user_id), id: String(b.id ?? ''), type: b.type };
  } catch {
    return null;
  }
}

export const RECOVERY_PUSH_TAG = 'whoop-recovery';

/** The morning push for a scored Whoop recovery record (null if not scored). */
export function recoveryPushPayload(record: {
  score_state?: string;
  score?: { recovery_score?: number; hrv_rmssd_milli?: number; resting_heart_rate?: number };
} | null | undefined): PushPayload | null {
  if (!record || record.score_state !== 'SCORED' || record.score?.recovery_score == null) return null;
  const score = Math.round(record.score.recovery_score);
  const hrv = record.score.hrv_rmssd_milli != null ? Math.round(record.score.hrv_rmssd_milli) : null;
  const rhr = record.score.resting_heart_rate != null ? Math.round(record.score.resting_heart_rate) : null;
  const vitals = [hrv != null ? `HRV ${hrv} ms` : null, rhr != null ? `RHR ${rhr}` : null].filter(Boolean).join(' · ');
  const [label, advice] = score >= 67
    ? ['green', 'Good day to push your top sets.']
    : score >= 34
      ? ['yellow', 'Train as planned, but let RPE — not the plan — set your top sets.']
      : ['red', 'Go lighter or swap in mobility today — open the app for the adjusted session.'];
  return {
    title: `Recovery ${score}% — ${label}`,
    body: vitals ? `${vitals}. ${advice}` : advice,
    tag: RECOVERY_PUSH_TAG,
    url: '/',
  };
}
