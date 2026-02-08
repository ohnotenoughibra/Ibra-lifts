// ── Subscription & Feature Gate System ─────────────────────────────────────
// Free/Pro tier management with PayPal + SEPA Lastschrift support

import { Subscription, SubscriptionTier } from './types';

// ── Feature Gates ──────────────────────────────────────────────────────────
// Maps feature keys to the minimum tier required to access them.

export const FEATURE_GATES: Record<string, SubscriptionTier> = {
  // ── Free tier features ───────────────────
  'workout-execution': 'free',
  'single-mesocycle': 'free',
  'basic-progress': 'free',
  'streaks-xp': 'free',
  '1rm-calculator': 'free',
  'training-log': 'free',
  'quick-log': 'free',
  'basic-gamification': 'free',

  // ── Pro tier features ────────────────────
  'full-history': 'pro',
  'multiple-mesocycles': 'pro',
  'advanced-analytics': 'pro',
  'ai-coach': 'pro',
  'wearable-integration': 'pro',
  'nutrition-tracking': 'pro',
  'diet-coaching': 'pro',
  'body-composition': 'pro',
  'competition-prep': 'pro',
  'injury-illness': 'pro',
  'cloud-sync': 'pro',
  'export-pdf': 'pro',
  'custom-exercises': 'pro',
  'session-templates': 'pro',
  'grip-tracking': 'pro',
  'mobility-routines': 'pro',
  'strength-analysis': 'pro',
  'block-suggestions': 'pro',
};

// ── Feature Info ───────────────────────────────────────────────────────────
// Human-readable names and descriptions for upgrade prompts

export const FEATURE_INFO: Record<string, { name: string; description: string }> = {
  'full-history': { name: 'Full History', description: 'Access your complete workout history beyond 30 days' },
  'multiple-mesocycles': { name: 'Multiple Programs', description: 'Save and switch between training programs' },
  'advanced-analytics': { name: 'Advanced Analytics', description: '1RM trends, volume heatmaps, and deep insights' },
  'ai-coach': { name: 'AI Coach', description: 'Personalized weekly summaries and training recommendations' },
  'wearable-integration': { name: 'Wearable Sync', description: 'Connect Whoop, Apple Health, and other devices' },
  'nutrition-tracking': { name: 'Nutrition Tracking', description: 'Log meals and track macros' },
  'diet-coaching': { name: 'Diet Coach', description: 'Automated macro adjustments based on your progress' },
  'body-composition': { name: 'Body Composition', description: 'Track body fat, measurements, and recomp progress' },
  'competition-prep': { name: 'Competition Prep', description: 'Peaking and weight cut planning for events' },
  'injury-illness': { name: 'Injury & Illness', description: 'Smart return-to-training protocols' },
  'cloud-sync': { name: 'Cloud Sync', description: 'Sync your data across devices securely' },
  'export-pdf': { name: 'PDF Export', description: 'Export workout logs and progress reports' },
  'custom-exercises': { name: 'Custom Exercises', description: 'Create and save your own exercises' },
  'session-templates': { name: 'Session Templates', description: 'Save and reuse workout templates' },
  'grip-tracking': { name: 'Grip Tracking', description: 'Track grip strength and dead hangs' },
  'mobility-routines': { name: 'Mobility Routines', description: 'Guided mobility and flexibility work' },
  'strength-analysis': { name: 'Strength Analysis', description: 'Sticking point analysis and exercise profiling' },
  'block-suggestions': { name: 'Block Suggestions', description: 'AI-powered mesocycle focus recommendations' },
};

// ── Owner Bypass ──────────────────────────────────────────────────────────

const OWNER_EMAIL = process.env.NEXT_PUBLIC_OWNER_EMAIL?.toLowerCase().trim() || '';

export function isOwner(email: string | null | undefined): boolean {
  return !!OWNER_EMAIL && !!email && email.toLowerCase().trim() === OWNER_EMAIL;
}

// ── Tier Resolution ────────────────────────────────────────────────────────

const TIER_RANK: Record<SubscriptionTier, number> = { free: 0, pro: 1 };

/**
 * Get the user's effective subscription tier.
 * Checks owner bypass, active subscription, grace period, gym membership.
 */
export function getEffectiveTier(subscription: Subscription | null, userEmail?: string | null): SubscriptionTier {
  if (isOwner(userEmail)) return 'pro';
  if (!subscription) return 'free';

  // Active pro subscription
  if (subscription.tier === 'pro' && subscription.status === 'active') {
    return 'pro';
  }

  // Grace period (14 days after expiry)
  if (subscription.status === 'grace' && subscription.graceEndsAt) {
    const graceEnd = new Date(subscription.graceEndsAt);
    if (graceEnd.getTime() > Date.now()) {
      return 'pro';
    }
  }

  // Trial period
  if (subscription.source === 'trial' && subscription.status === 'active') {
    const periodEnd = new Date(subscription.currentPeriodEnd);
    if (periodEnd.getTime() > Date.now()) {
      return 'pro';
    }
  }

  return 'free';
}

/**
 * Check if a feature is accessible with the given tier.
 */
export function hasFeatureAccess(feature: string, tier: SubscriptionTier): boolean {
  const requiredTier = FEATURE_GATES[feature];
  if (!requiredTier) return true; // Unknown features default to allowed
  return TIER_RANK[tier] >= TIER_RANK[requiredTier];
}

/**
 * Get all features accessible at a given tier.
 */
export function getAccessibleFeatures(tier: SubscriptionTier): string[] {
  return Object.entries(FEATURE_GATES)
    .filter(([, required]) => TIER_RANK[tier] >= TIER_RANK[required])
    .map(([feature]) => feature);
}

/**
 * Get all features that require an upgrade from the current tier.
 */
export function getLockedFeatures(tier: SubscriptionTier): string[] {
  return Object.entries(FEATURE_GATES)
    .filter(([, required]) => TIER_RANK[tier] < TIER_RANK[required])
    .map(([feature]) => feature);
}

// ── Pricing ────────────────────────────────────────────────────────────────

export const PRICING = {
  pro: {
    monthly: { amount: 9.99, currency: 'EUR', label: '€9.99/mo' },
    annual: { amount: 79.99, currency: 'EUR', label: '€79.99/yr', savings: '33%' },
  },
} as const;

// ── PayPal Integration Helpers ─────────────────────────────────────────────

/**
 * Get PayPal client ID from environment (client-side safe).
 */
export function getPayPalClientId(): string {
  return process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';
}

/**
 * Check if PayPal is configured.
 */
export function isPayPalConfigured(): boolean {
  return !!getPayPalClientId();
}
