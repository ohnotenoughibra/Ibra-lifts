import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sql } from '@vercel/postgres';

export const dynamic = 'force-dynamic';

// GET /api/subscription/status — get current subscription for authenticated user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rows } = await sql`
      SELECT tier, source, status, current_period_start, current_period_end,
             paypal_subscription_id, grace_ends_at
      FROM subscriptions
      WHERE user_id = ${session.user.id}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({
        subscription: null,
        effectiveTier: 'free',
      });
    }

    const sub = rows[0];
    // Check if subscription is still active
    const now = new Date();
    const periodEnd = new Date(sub.current_period_end);
    const graceEnd = sub.grace_ends_at ? new Date(sub.grace_ends_at) : null;

    let effectiveTier: 'free' | 'pro' = 'free';
    if (sub.status === 'active' && periodEnd > now) {
      effectiveTier = sub.tier;
    } else if (sub.status === 'grace' && graceEnd && graceEnd > now) {
      effectiveTier = sub.tier;
    }

    return NextResponse.json({
      subscription: {
        tier: sub.tier,
        source: sub.source,
        status: sub.status,
        currentPeriodStart: sub.current_period_start,
        currentPeriodEnd: sub.current_period_end,
        paypalSubscriptionId: sub.paypal_subscription_id,
        graceEndsAt: sub.grace_ends_at,
      },
      effectiveTier,
    });
  } catch (error) {
    // Table may not exist yet — return free tier
    console.error('Subscription status error:', error);
    return NextResponse.json({
      subscription: null,
      effectiveTier: 'free',
    });
  }
}
