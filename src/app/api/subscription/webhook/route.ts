import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// POST /api/subscription/webhook — PayPal webhook handler
// Handles subscription lifecycle events (activated, cancelled, expired, suspended)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const eventType = body.event_type;
    const resource = body.resource;

    // TODO: Verify webhook signature with PayPal webhook ID
    // For production, implement webhook signature verification:
    // https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature_post

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
