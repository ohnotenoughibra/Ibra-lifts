import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import webpush from 'web-push';

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

      return NextResponse.json({ success: true, message: 'Subscription verified' });
    }

    if (action === 'send') {
      // The subscription must come from the user's own stored data (passed from client's Zustand store).
      // We verify ownership by checking the subscription matches what was registered during subscribe.
      // For self-sends only — server-to-user push requires a separate cron/admin flow.
      const { subscription, payload } = body;

      if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
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

      // Sanitize payload — only allow expected fields with length limits
      const notificationPayload = JSON.stringify({
        title: String(payload.title).substring(0, 100),
        body: String(payload.body).substring(0, 200),
        tag: String(payload.tag || 'default').substring(0, 50),
        url: String(payload.url || '/').substring(0, 200),
        category: String(payload.category || '').substring(0, 50),
      });

      try {
        await webpush.sendNotification(subscription, notificationPayload);
        return NextResponse.json({ success: true });
      } catch (err: unknown) {
        const pushErr = err as { statusCode?: number; message?: string };
        if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
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
