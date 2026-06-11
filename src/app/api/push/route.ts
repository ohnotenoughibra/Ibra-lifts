import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { auth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import webpush from 'web-push';

// Server-side record of which push endpoints belong to which user. Without it,
// `send` had no way to verify ownership — any logged-in user could deliver a
// notification under the app's VAPID identity to ANY endpoint they supplied.
let pushTableReady = false;
async function ensurePushTable(): Promise<void> {
  if (pushTableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      endpoint TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  pushTableReady = true;
}

// ── VAPID Configuration ──────────────────────────────────────────────────────
// Generate keys with: npx web-push generate-vapid-keys
// Lazy init VAPID — avoid module-level calls that crash during build page data collection
let vapidInitialized = false;
function ensureVapid(): boolean {
  if (vapidInitialized) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  const priv = process.env.VAPID_PRIVATE_KEY || '';
  const email = process.env.VAPID_EMAIL || 'mailto:noreply@rootsgains.com';
  if (!pub || !priv) return false;
  webpush.setVapidDetails(email, pub, priv);
  vapidInitialized = true;
  return true;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ── POST /api/push ────────────────────────────────────────────────────────────
// Two actions:
//   { action: 'subscribe', subscription: PushSubscription }
//   { action: 'send', subscription: PushSubscription, payload: { title, body, tag, url } }
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!ensureVapid()) {
      return NextResponse.json(
        { error: 'Push notifications not configured. VAPID keys missing.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'subscribe') {
      // Validate subscription shape
      const { subscription } = body;
      if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        return NextResponse.json({ error: 'Invalid push subscription' }, { status: 400 });
      }

      // Send a test notification to verify the subscription works
      try {
        await webpush.sendNotification(
          subscription,
          JSON.stringify({
            title: 'Notifications enabled!',
            body: 'You\'ll now receive training reminders and updates.',
            tag: 'push-test',
            url: '/',
          })
        );
      } catch (err: unknown) {
        const pushErr = err as { statusCode?: number };
        if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
          return NextResponse.json(
            { error: 'Push subscription expired or invalid' },
            { status: 410 }
          );
        }
        throw err;
      }

      // Persist ownership so `send` can verify the caller owns the endpoint.
      // Endpoint is the PK — re-subscribing reassigns it to the current user.
      try {
        await ensurePushTable();
        await sql`
          INSERT INTO push_subscriptions (endpoint, user_id, p256dh, auth)
          VALUES (${subscription.endpoint}, ${session.user.id}, ${subscription.keys.p256dh}, ${subscription.keys.auth})
          ON CONFLICT (endpoint) DO UPDATE
            SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth
        `;
      } catch (dbErr) {
        // Notification already delivered; persistence failure is non-fatal for
        // the test send but means future self-sends to this endpoint will 403
        console.error('[push/subscribe] persist failed:', dbErr);
      }

      return NextResponse.json({ success: true, message: 'Subscription verified' });
    }

    if (action === 'send') {
      // Self-send only: the caller may push to an endpoint ONLY if it is
      // registered to their own user. Server-to-user push needs a separate
      // cron/admin flow.
      const { subscription, payload } = body;

      if (!subscription?.endpoint) {
        return NextResponse.json({ error: 'Missing or invalid subscription' }, { status: 400 });
      }

      if (!payload?.title || !payload?.body) {
        return NextResponse.json({ error: 'Missing notification payload' }, { status: 400 });
      }

      // Rate limit: max 20 push sends per user per hour
      const { limited } = rateLimit(`push-send:${session.user.id}`, 20, 60 * 60 * 1000);
      if (limited) {
        return NextResponse.json({ error: 'Too many notifications. Try again later.' }, { status: 429 });
      }

      // Ownership check — look up the stored subscription by endpoint and
      // confirm it belongs to the session user. Send to the STORED keys, never
      // to caller-supplied ones (prevents spoofing a victim's endpoint with
      // attacker keys, and pins delivery to verified data).
      await ensurePushTable();
      const { rows } = await sql`
        SELECT endpoint, p256dh, auth, user_id FROM push_subscriptions
        WHERE endpoint = ${subscription.endpoint}
      `;
      const owned = rows[0];
      if (!owned || owned.user_id !== session.user.id) {
        return NextResponse.json({ error: 'Subscription not found for this user' }, { status: 403 });
      }
      const targetSubscription = {
        endpoint: owned.endpoint as string,
        keys: { p256dh: owned.p256dh as string, auth: owned.auth as string },
      };

      // Sanitize payload — only allow expected fields with length limits
      const notificationPayload = JSON.stringify({
        title: String(payload.title).substring(0, 100),
        body: String(payload.body).substring(0, 200),
        tag: String(payload.tag || 'default').substring(0, 50),
        url: String(payload.url || '/').substring(0, 200),
        category: String(payload.category || '').substring(0, 50),
      });

      try {
        await webpush.sendNotification(targetSubscription, notificationPayload);
        return NextResponse.json({ success: true });
      } catch (err: unknown) {
        const pushErr = err as { statusCode?: number; message?: string };
        if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
          // Endpoint is dead — drop the stale row so it can't accumulate
          await sql`DELETE FROM push_subscriptions WHERE endpoint = ${subscription.endpoint}`.catch(() => {});
          return NextResponse.json(
            { error: 'Subscription expired', expired: true },
            { status: 410 }
          );
        }
        console.error('[push/send] Failed:', pushErr.message);
        return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Unknown action. Use "subscribe" or "send".' }, { status: 400 });
  } catch (error) {
    console.error('[push] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── GET /api/push ─────────────────────────────────────────────────────────────
// Returns the public VAPID key so clients can subscribe
export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  if (!publicKey) {
    return NextResponse.json(
      { error: 'Push notifications not configured' },
      { status: 503 }
    );
  }

  return NextResponse.json({ publicKey });
}
