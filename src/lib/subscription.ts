// ── Subscription & Feature Gate System ─────────────────────────────────────
// Free/Pro tier management with PayPal + SEPA Lastschrift support

import { Subscription, SubscriptionTier } from './types';

// ── Feature Gates ──────────────────────────────────────────────────────────
// Maps feature keys to the minimum tier required to access them.

// ── Simplified Feature Gates (12 gates) ──────────────────────────────────
// Collapsed from 39 → 12. Two tiers only: free gets core tracking,
// pro gets everything else. No elite tier — keep it simple.
//
// Legacy gate IDs are mapped below for backwards compatibility.

export const FEATURE_GATES: Record<string, SubscriptionTier> = {
  // ── Free (4 gates — generous, hook them) ───
  'workout-tracking': 'free',    // Basic logging, 1 mesocycle, manual entry
  'basic-analytics': 'free',     // Progress charts, 1RM calculator, streaks/XP
  'community': 'free',           // Sharing, leaderboard viewing, activity feed
  'quick-log': 'free',           // Water, sleep, energy, readiness, training log

  // ── Pro (8 gates — everything else) ────────
  'full-programming': 'pro',     // Unlimited mesocycles, templates, block suggestions, smart schedule
  'coaching': 'pro',             // AI coach, weekly narrative, recovery AI, conditioning programming
  'nutrition': 'pro',            // Meal tracking, diet coaching, fight camp nutrition, supplements, weight cuts
  'analytics-pro': 'pro',        // Advanced analytics, strength analysis, volume heatmaps, body composition
  'health-tracking': 'pro',      // Injury/illness tracking, readiness scoring, fatigue metrics
  'wearables': 'pro',            // Whoop, Apple Health, Garmin, Oura — all wearable integrations
  'competition': 'pro',          // Competition prep, fight camp, female athlete intelligence
  'tools': 'pro',                // Cloud sync, data export, custom exercises, barcode scanner
};

// Legacy gate mapping — resolves old gate IDs to new ones for backwards compat
const LEGACY_GATE_MAP: Record<string, string> = {
  'workout-execution': 'workout-tracking', 'single-mesocycle': 'workout-tracking',
  'training-log': 'quick-log', 'manual-logging': 'workout-tracking',
  'basic-progress': 'basic-analytics', 'streaks-xp': 'basic-analytics',
  '1rm-calculator': 'basic-analytics', 'basic-gamification': 'basic-analytics',
  'streaks-badges': 'basic-analytics', 'basic-progress-charts': 'basic-analytics',
  'community-sharing': 'community', 'exercise-library-basic': 'workout-tracking',
  'mesocycle-basic': 'workout-tracking',
  'full-history': 'analytics-pro', 'multiple-mesocycles': 'full-programming',
  'unlimited-mesocycles': 'full-programming', 'advanced-analytics': 'analytics-pro',
  'ai-coach': 'coaching', 'smart-schedule': 'full-programming',
  'wearable-integration': 'wearables', 'wearable-whoop': 'wearables',
  'wearable-garmin': 'wearables', 'wearable-oura': 'wearables',
  'nutrition-tracking': 'nutrition', 'diet-coaching': 'nutrition',
  'body-composition': 'analytics-pro', 'competition-prep': 'competition',
  'injury-illness': 'health-tracking', 'injury-tracking': 'health-tracking',
  'illness-tracking': 'health-tracking', 'cloud-sync': 'tools',
  'export-pdf': 'tools', 'data-export': 'tools',
  'custom-exercises': 'tools', 'session-templates': 'full-programming',
  'mobility-routines': 'coaching', 'strength-analysis': 'analytics-pro',
  'block-suggestions': 'full-programming', 'weekly-narrative': 'coaching',
  'recovery-ai': 'health-tracking', 'advanced-gamification': 'basic-analytics',
  'exercise-library-full': 'full-programming',
  'weight-cut-protocol': 'nutrition', 'fight-camp-nutrition': 'nutrition',
  'supplement-protocol': 'nutrition', 'performance-readiness': 'health-tracking',
  'energy-availability': 'nutrition', 'intra-training-fuel': 'nutrition',
  'fatigue-debt': 'health-tracking', 'female-athlete-intel': 'competition',
  'caloric-periodization': 'nutrition', 'hr-zones': 'wearables',
  'grip-tracking': 'analytics-pro', 'nutrition-coaching': 'nutrition',
  'performance-model': 'analytics-pro',
};

/** Resolve a feature gate ID (handles legacy IDs transparently). */
export function resolveGateId(featureId: string): string {
  return LEGACY_GATE_MAP[featureId] || featureId;
}

// ── Feature Info ───────────────────────────────────────────────────────────
// Human-readable names and descriptions for upgrade prompts

export const FEATURE_INFO: Record<string, { name: string; description: string }> = {
  // Free
  'workout-tracking': { name: 'Workout Tracking', description: 'Log sets, reps, weight and RPE for every session' },
  'basic-analytics': { name: 'Basic Analytics', description: 'Progress charts, 1RM calculator, streaks and XP' },
  'community': { name: 'Community', description: 'Share workouts, view leaderboards, and connect with athletes' },
  'quick-log': { name: 'Quick Log', description: 'Log water, sleep, energy, and training sessions quickly' },
  // Pro
  'full-programming': { name: 'Full Programming', description: 'Unlimited mesocycles, templates, block suggestions, and smart scheduling' },
  'coaching': { name: 'AI Coaching', description: 'Weekly coaching summaries, recovery AI, conditioning programming, and mobility routines' },
  'nutrition': { name: 'Nutrition Suite', description: 'Meal tracking, diet coaching, fight camp nutrition, supplements, and weight cuts' },
  'analytics-pro': { name: 'Advanced Analytics', description: '1RM trends, volume heatmaps, strength analysis, and body composition tracking' },
  'health-tracking': { name: 'Health Tracking', description: 'Injury/illness protocols, readiness scoring, and fatigue metrics' },
  'wearables': { name: 'Wearable Sync', description: 'Connect Whoop, Apple Health, Garmin, and Oura devices' },
  'competition': { name: 'Competition Prep', description: 'Fight camp planning, peaking, tapering, and female athlete intelligence' },
  'tools': { name: 'Pro Tools', description: 'Cloud sync, data export, custom exercises, and barcode nutrition scanning' },
};

// ── Owner Bypass ──────────────────────────────────────────────────────────

const OWNER_EMAILS = (process.env.NEXT_PUBLIC_OWNER_EMAIL || '')
  .split(',')
  .map(e => e.toLowerCase().trim())
  .filter(Boolean);

export function isOwner(email: string | null | undefined): boolean {
  if (!email || OWNER_EMAILS.length === 0) return false;
  return OWNER_EMAILS.includes(email.toLowerCase().trim());
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
 * Transparently resolves legacy gate IDs (39 old gates → 12 new gates).
 */
export function hasFeatureAccess(feature: string, tier: SubscriptionTier): boolean {
  const resolved = resolveGateId(feature);
  const requiredTier = FEATURE_GATES[resolved];
  if (!requiredTier) return false; // Unknown features default to denied
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
