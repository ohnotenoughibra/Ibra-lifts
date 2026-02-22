import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Verify PayPal webhook signature to prevent forged events
async function verifyWebhookSignature(request: NextRequest, body: unknown): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.warn('[webhook] PAYPAL_WEBHOOK_ID not set — skipping signature verification');
    return true; // Allow in development, but log warning
  }

  const transmissionId = request.headers.get('paypal-transmission-id');
  const transmissionTime = request.headers.get('paypal-transmission-time');
  const certUrl = request.headers.get('paypal-cert-url');
  const transmissionSig = request.headers.get('paypal-transmission-sig');
  const authAlgo = request.headers.get('paypal-auth-algo');

  if (!transmissionId || !transmissionTime || !certUrl || !transmissionSig || !authAlgo) {
    console.error('[webhook] Missing PayPal signature headers');
    return false;
  }

  try {
    const baseUrl = process.env.PAYPAL_API_URL || 'https://api-m.paypal.com';
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.warn('[webhook] PayPal credentials not configured — skipping verification');
      return true;
    }

    // Get access token
    const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const { access_token } = await tokenRes.json();

    // Verify signature
    const verifyRes = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: body,
      }),
    });

    const result = await verifyRes.json();
    if (result.verification_status !== 'SUCCESS') {
      console.error('[webhook] PayPal signature verification FAILED:', result.verification_status);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[webhook] Signature verification error:', err);
    return false;
  }
}

// POST /api/subscription/webhook — PayPal webhook handler
// Handles subscription lifecycle events (activated, cancelled, expired, suspended)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify webhook signature before processing any events
    const isValid = await verifyWebhookSignature(request, body);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const eventType = body.event_type;
    const resource = body.resource;

    const subscriptionId = resource?.id;
    const customId = resource?.custom_id; // Our user ID

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Missing subscription ID' }, { status: 400 });
    }

    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED': {
        // Subscription activated — grant pro access
        const periodStart = resource.billing_info?.last_payment?.time || new Date().toISOString();
        const periodEnd = resource.billing_info?.next_billing_time || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        if (customId) {
          await sql`
            INSERT INTO subscriptions (user_id, tier, source, status, paypal_subscription_id, current_period_start, current_period_end)
            VALUES (${customId}, 'pro', 'paypal', 'active', ${subscriptionId}, ${periodStart}, ${periodEnd})
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
        }
        break;
      }

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.EXPIRED': {
        // Subscription ended — set 14-day grace period
        const graceEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

        await sql`
          UPDATE subscriptions
          SET status = 'grace', grace_ends_at = ${graceEnd}, updated_at = NOW()
          WHERE paypal_subscription_id = ${subscriptionId}
        `;
        break;
      }

      case 'BILLING.SUBSCRIPTION.SUSPENDED': {
        // Payment failed — set grace period
        const graceEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

        await sql`
          UPDATE subscriptions
          SET status = 'grace', grace_ends_at = ${graceEnd}, updated_at = NOW()
          WHERE paypal_subscription_id = ${subscriptionId}
        `;
        break;
      }

      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED': {
        // Payment failed — log but don't immediately revoke (grace handles it)
        console.warn(`Payment failed for subscription ${subscriptionId}`);
        break;
      }

      case 'PAYMENT.SALE.COMPLETED': {
        // Renewal payment — update period end
        const nextBilling = resource.billing_info?.next_billing_time;
        if (nextBilling) {
          await sql`
            UPDATE subscriptions
            SET status = 'active', current_period_end = ${nextBilling}, grace_ends_at = NULL, updated_at = NOW()
            WHERE paypal_subscription_id = ${subscriptionId}
          `;
        }
        break;
      }

      default:
        // Unhandled event — log and acknowledge
        console.log(`Unhandled PayPal webhook: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    // Always return 200 to PayPal to prevent retries for processing errors
    return NextResponse.json({ received: true, error: 'Processing error' });
  }
}
