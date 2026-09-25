/**
 * Signed OAuth `state` for the Whoop connect flow.
 *
 * Before: the state was made in the browser and only checked against
 * localStorage — skipped when missing, and anyone could add the "pwa:" prefix
 * to skip it. A crafted link could then finish OAuth with an attacker's code
 * and save the attacker's Whoop tokens into the victim's account.
 *
 * Now the server signs {nonce, time, user, pwa} with AUTH_SECRET:
 *   - the callback rejects unsigned, tampered or stale (> 10 min) states
 *     before the code is exchanged
 *   - the PWA flag comes from the signed payload, not a guessable prefix
 *   - saving tokens to an account requires the state's user to be the
 *     signed-in user (binds the flow to the person who started it, which
 *     localStorage can't do across the iOS PWA / in-app-browser split)
 */
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

export interface WhoopState { n: string; t: number; u: string | null; p: boolean }
export const STATE_MAX_AGE_MS = 10 * 60 * 1000;

function secret(): string {
  const s = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET is required to sign the Whoop OAuth state');
  return s;
}
const b64 = (s: string) => Buffer.from(s).toString('base64url');
const sign = (body: string) => createHmac('sha256', secret()).update(`whoop-state:${body}`).digest('base64url');

export function signWhoopState(userId: string | null, pwa: boolean, now = Date.now()): string {
  const body = b64(JSON.stringify({ n: randomBytes(16).toString('hex'), t: now, u: userId, p: pwa } satisfies WhoopState));
  return `v1.${body}.${sign(body)}`;
}

/** The payload if the state is ours, untampered and fresh — otherwise null. */
export function verifyWhoopState(state: string | null | undefined, now = Date.now(), maxAgeMs = STATE_MAX_AGE_MS): WhoopState | null {
  if (!state) return null;
  const [v, body, mac] = state.split('.');
  if (v !== 'v1' || !body || !mac) return null;
  let expected: Buffer; let got: Buffer;
  try { expected = Buffer.from(sign(body)); got = Buffer.from(mac); } catch { return null; }
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString()) as WhoopState;
    if (typeof p.t !== 'number' || now - p.t > maxAgeMs || p.t - now > 60_000) return null;
    return p;
  } catch { return null; }
}
