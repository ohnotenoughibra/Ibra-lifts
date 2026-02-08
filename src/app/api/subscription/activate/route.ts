import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@vercel/postgres';

const PAYPAL_BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    throw new Error(`PayPal auth failed: ${res.status}`);
  }

  const data = await res.json();
  return data.access_token;
}

// POST /api/subscription/activate — verify and activate a PayPal subscription after client-side approval
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscriptionId } = await request.json();
    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID required' }, { status: 400 });
    }

    // Verify subscription with PayPal
    const accessToken = await getPayPalAccessToken();
    const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      console.error('PayPal subscription verification failed:', res.status);
      return NextResponse.json({ error: 'Failed to verify subscription' }, { status: 400 });
    }

    const subscription = await res.json();

    // Only activate if subscription is in ACTIVE or APPROVED status
    if (!['ACTIVE', 'APPROVED'].includes(subscription.status)) {
      return NextResponse.json(
        { error: `Subscription status is ${subscription.status}, not active` },
        { status: 400 }
      );
    }

    const periodStart = subscription.billing_info?.last_payment?.time || new Date().toISOString();
    const periodEnd = subscription.billing_info?.next_billing_time ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Upsert subscription record
    await sql`
      INSERT INTO subscriptions (user_id, tier, source, status, paypal_subscription_id, current_period_start, current_period_end)
      VALUES (${session.user.id}, 'pro', 'paypal', 'active', ${subscriptionId}, ${periodStart}, ${periodEnd})
      ON CONFLICT (user_id) DO UPDATE SET
        tier = 'pro',
        source = 'paypal',
        status = 'active',
        paypal_subscription_id = ${subscriptionId},
        current_period_start = ${periodStart},
        current_period_end = ${periodEnd},
        grace_ends_at = NULL,
        updated_at = NOW()
    `;

    return NextResponse.json({ success: true, tier: 'pro' });
  } catch (error) {
    console.error('Activate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
