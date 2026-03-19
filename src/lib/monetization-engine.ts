// ── Monetization Refinement Engine (Sprint 9) ─────────────────────────────
// Pure-function module — no React, no store imports.
// Extends the existing free/pro subscription model with a three-tier
// (free / pro / elite) feature-gate, paywall, value-demonstration,
// upgrade-prompt, trial, and pricing system.
//
// NOTE: Elite tier has been collapsed back to a 2-tier model (free/pro).
// MonetizationTier is kept as a local alias for backwards compatibility
// but 'elite' maps to 'pro' in practice.

import type { WorkoutLog, GamificationStats, Subscription } from './types';

/** Filter out soft-deleted items */
function active<T>(arr: T[]): T[] {
  return arr.filter(item => !(item as Record<string, unknown>)._deleted);
}

// ── Pricing Constants (single source of truth — easy to adjust) ───────────
export const PRICE_PRO_MONTHLY = 9.99;
export const PRICE_PRO_YEARLY = 95.88; // 12 * 7.99 (20% off monthly)
// Elite tier removed — 2-tier model only
const _PRICE_ELITE_MONTHLY = 0; // Kept for type compat
const _PRICE_ELITE_YEARLY = 0;
export const YEARLY_DISCOUNT_PERCENT = 20;
export const TRIAL_DURATION_DAYS = 14;
export const TRIAL_ACTIVATION_WORKOUTS = 3;
export const CURRENCY = 'EUR';

// ── Tier Definitions ──────────────────────────────────────────────────────

export type MonetizationTier = 'free' | 'pro' | 'elite';

const TIER_RANK: Record<MonetizationTier, number> = { free: 0, pro: 1, elite: 2 };

/**
 * Map the existing 2-tier SubscriptionTier to our 3-tier model.
 * Once the backend supports 'elite' this helper can be expanded.
 */
export function toMonetizationTier(tier: 'free' | 'pro' | 'elite'): MonetizationTier {
  if (tier === 'elite') return 'elite';
  if (tier === 'pro') return 'pro';
  return 'free';
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. FEATURE GATE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface FeatureGate {
  id: string;
  name: string;
  tier: MonetizationTier;
  category: string;
  description: string;
}

// Simplified 12-gate system aligned with subscription.ts.
// Elite tier collapsed into Pro — two tiers only.
const FEATURE_GATE_LIST: FeatureGate[] = [
  // ── Free tier (4 gates) ────────────────────────────────────────────────
  { id: 'workout-tracking', name: 'Workout Tracking',  tier: 'free',  category: 'core',      description: 'Log sets, reps, weight, and RPE. One mesocycle, manual entry.' },
  { id: 'basic-analytics',  name: 'Basic Analytics',   tier: 'free',  category: 'analytics',  description: 'Progress charts, 1RM calculator, streaks, XP, and badges.' },
  { id: 'community',        name: 'Community',         tier: 'free',  category: 'social',     description: 'Share workouts, view leaderboards, and connect with athletes.' },
  { id: 'quick-log',        name: 'Quick Log',         tier: 'free',  category: 'core',       description: 'Log water, sleep, energy, readiness, and training sessions.' },

  // ── Pro tier ($9.99/mo) — everything else ──────────────────────────────
  { id: 'full-programming', name: 'Full Programming',  tier: 'pro',   category: 'programming', description: 'Unlimited mesocycles, templates, block suggestions, smart schedule.' },
  { id: 'coaching',         name: 'AI Coaching',       tier: 'pro',   category: 'coaching',    description: 'Weekly coaching, recovery AI, conditioning programming, mobility.' },
  { id: 'nutrition',        name: 'Nutrition Suite',   tier: 'pro',   category: 'nutrition',   description: 'Meal tracking, diet coaching, fight camp nutrition, supplements, cuts.' },
  { id: 'analytics-pro',   name: 'Advanced Analytics', tier: 'pro',   category: 'analytics',   description: '1RM trends, volume heatmaps, strength analysis, body composition.' },
  { id: 'health-tracking',  name: 'Health Tracking',   tier: 'pro',   category: 'health',      description: 'Injury/illness protocols, readiness scoring, fatigue metrics.' },
  { id: 'wearables',        name: 'Wearable Sync',    tier: 'pro',   category: 'wearables',   description: 'Connect Whoop, Apple Health, Garmin, and Oura.' },
  { id: 'competition',      name: 'Competition Prep',  tier: 'pro',   category: 'competition', description: 'Fight camp, peaking, tapering, female athlete intelligence.' },
  { id: 'tools',            name: 'Pro Tools',         tier: 'pro',   category: 'tools',       description: 'Cloud sync, data export, custom exercises, barcode scanning.' },
];

/**
 * Returns the complete list of feature gates.
 */
export function getFeatureGates(): FeatureGate[] {
  return FEATURE_GATE_LIST;
}

/**
 * Check whether a feature is available for a given tier.
 */
export function isFeatureAvailable(featureId: string, userTier: MonetizationTier): boolean {
  const gate = FEATURE_GATE_LIST.find(g => g.id === featureId);
  if (!gate) return false; // Unknown features default to denied
  return TIER_RANK[userTier] >= TIER_RANK[gate.tier];
}

/**
 * Returns a persuasive but honest reason the user would benefit from upgrading
 * to access a specific feature.
 */
export function getUpgradeReason(featureId: string): string {
  const reasons: Record<string, string> = {
    'full-programming': 'Unlimited mesocycles, smart scheduling, templates, and AI block suggestions — your entire training year planned.',
    'coaching':         'Weekly AI coaching, conditioning programming, recovery recommendations, and guided mobility routines.',
    'nutrition':        'Meal tracking, macro coaching, fight camp nutrition, weight cuts, and supplements — all evidence-based.',
    'analytics-pro':    '1RM trends, volume heatmaps, strength analysis, body composition tracking, and deep insights.',
    'health-tracking':  'Injury/illness protocols, readiness scoring, fatigue metrics — train smarter, recover faster.',
    'wearables':        'Connect Whoop, Apple Health, Garmin, or Oura for recovery-driven auto-regulation.',
    'competition':      'Fight camp planning, peaking, tapering, weight cuts, and female athlete intelligence.',
    'tools':            'Cloud sync, data export, custom exercises, and barcode nutrition scanning.',
  };

  return reasons[featureId] || 'Upgrade to Pro to unlock this feature and take your training to the next level.';
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. PAYWALL TRIGGER SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

export interface PaywallTrigger {
  featureId: string;
  triggerType: 'soft' | 'hard';
  message: string;
  ctaText: string;
  tier: 'pro' | 'elite';
}

interface SoftPaywallConfig {
  featureId: string;
  tier: 'pro' | 'elite';
  message: string;
  ctaText: string;
  /** Describes what the free user still gets (UI can use this for partial-reveal) */
  freePreview: string;
}

// Soft paywalls — user sees a taste, then gets nudged
const SOFT_PAYWALLS: SoftPaywallConfig[] = [
  {
    featureId: 'coaching',
    tier: 'pro',
    message: 'You get a free coaching snapshot each week. Upgrade to Pro for full AI coaching with weekly reviews.',
    ctaText: 'Unlock Full Coaching',
    freePreview: 'Weekly snapshot',
  },
  {
    featureId: 'analytics-pro',
    tier: 'pro',
    message: 'You\'re seeing basic charts. Upgrade to Pro for 1RM trends, volume heatmaps, and deep insights.',
    ctaText: 'Unlock Advanced Analytics',
    freePreview: 'Basic charts only',
  },
  {
    featureId: 'health-tracking',
    tier: 'pro',
    message: 'You can see your overall readiness score. Upgrade to Pro for full breakdown and protocols.',
    ctaText: 'Unlock Health Tracking',
    freePreview: 'Overall score only',
  },
];

// Hard paywalls — feature is completely locked
const HARD_PAYWALL_IDS: string[] = [
  'full-programming',
  'nutrition',
  'wearables',
  'competition',
  'tools',
];

/**
 * Returns the paywall trigger for a feature given the user's tier, or null
 * if the user already has access.
 */
export function getPaywallTrigger(featureId: string, userTier: MonetizationTier): PaywallTrigger | null {
  if (isFeatureAvailable(featureId, userTier)) return null;

  const gate = FEATURE_GATE_LIST.find(g => g.id === featureId);
  if (!gate) return null;

  const targetTier = 'pro' as const; // Only 2 tiers now

  // Check soft paywalls first
  const soft = SOFT_PAYWALLS.find(s => s.featureId === featureId);
  if (soft) {
    return {
      featureId,
      triggerType: 'soft',
      message: soft.message,
      ctaText: soft.ctaText,
      tier: soft.tier,
    };
  }

  // Hard paywall
  if (HARD_PAYWALL_IDS.indexOf(featureId) !== -1) {
    return {
      featureId,
      triggerType: 'hard',
      message: getUpgradeReason(featureId),
      ctaText: 'Upgrade to Pro',
      tier: targetTier,
    };
  }

  // Default hard paywall for any remaining locked feature
  return {
    featureId,
    triggerType: 'hard',
    message: getUpgradeReason(featureId),
    ctaText: 'Upgrade to Pro',
    tier: targetTier,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. VALUE DEMONSTRATION
// ═══════════════════════════════════════════════════════════════════════════

export interface ValueMetrics {
  totalWorkouts: number;
  totalVolume: number;
  prsHit: number;
  streakDays: number;
  estimatedTimeSaved: number; // hours
  lockedFeatures: string[];
  potentialGains: string[];
}

// Average time a user saves per session by having auto-programming (minutes)
const AUTO_PROGRAM_TIME_SAVED_MIN = 7; // 5-10 minute range, use 7 as midpoint

/**
 * Calculate what the user has gained from the app and what they could unlock.
 */
export function getValueMetrics(
  workoutLogs: WorkoutLog[],
  gamificationStats: GamificationStats,
  tier: MonetizationTier,
): ValueMetrics {
  workoutLogs = active(workoutLogs);
  const totalWorkouts = gamificationStats.totalWorkouts || workoutLogs.length;
  const totalVolume = gamificationStats.totalVolume || workoutLogs.reduce((sum, l) => sum + (l.totalVolume || 0), 0);
  const prsHit = gamificationStats.personalRecords || 0;
  const streakDays = gamificationStats.currentStreak || 0;

  // Time saved: each workout skipped ~7 min of manual program design
  const estimatedTimeSaved = parseFloat(((totalWorkouts * AUTO_PROGRAM_TIME_SAVED_MIN) / 60).toFixed(1));

  // Features locked for this tier
  const lockedFeatures = FEATURE_GATE_LIST
    .filter(g => TIER_RANK[tier] < TIER_RANK[g.tier])
    .map(g => g.name);

  // Potential gains — contextual suggestions based on tier and usage
  const potentialGains: string[] = [];

  if (tier === 'free') {
    potentialGains.push('Unlock AI-powered deload detection to prevent overtraining');
    potentialGains.push('Get personalized block suggestions based on your training history');
    if (totalWorkouts >= 10) {
      potentialGains.push('Your training data is rich enough for performance modeling — see which exercises drive the most growth');
    }
    if (prsHit >= 3) {
      potentialGains.push('You\'re hitting PRs consistently. AI coaching could help you peak even faster');
    }
    if (streakDays >= 7) {
      potentialGains.push('With a streak like yours, weekly challenges would add an extra layer of motivation');
    }
  }

  // Pro users already have everything — no upsell needed

  // Always include at least one potential gain
  if (potentialGains.length === 0) {
    potentialGains.push('Explore premium features to get more from every session');
  }

  return {
    totalWorkouts,
    totalVolume,
    prsHit,
    streakDays,
    estimatedTimeSaved,
    lockedFeatures,
    potentialGains,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. UPGRADE PROMPT TIMING
// ═══════════════════════════════════════════════════════════════════════════

export interface UpgradePrompt {
  type: 'milestone' | 'feature_discovery' | 'value_recap' | 'seasonal';
  headline: string;
  body: string;
  ctaText: string;
  targetTier: 'pro' | 'elite';
}

// Minimum days between upgrade prompts
const MIN_DAYS_BETWEEN_PROMPTS = 7;
// Minimum days on the app before any prompt
const MIN_DAYS_BEFORE_FIRST_PROMPT = 7;

/**
 * Helper: days between two dates (absolute).
 */
function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Determine if an upgrade prompt should be shown, and if so, which one.
 * Returns null when the user should not be interrupted.
 *
 * Rules:
 * - Never within 7 days of the last prompt
 * - Never if the user has been on the app < 7 days
 * - Respectful: no guilt-tripping, no dark patterns
 */
export function shouldShowUpgradePrompt(
  workoutLogs: WorkoutLog[],
  gamificationStats: GamificationStats,
  tier: MonetizationTier,
  lastPromptDate?: Date | string | null,
): UpgradePrompt | null {
  workoutLogs = active(workoutLogs);
  // Already on Pro — nothing to upsell (no elite tier)
  if (tier === 'pro' || tier === 'elite') return null;

  const now = new Date();

  // ── Guard: too soon since last prompt ──────────────────────────────────
  if (lastPromptDate) {
    const lastDate = typeof lastPromptDate === 'string' ? new Date(lastPromptDate) : lastPromptDate;
    if (daysBetween(now, lastDate) < MIN_DAYS_BETWEEN_PROMPTS) return null;
  }

  // ── Guard: new user cool-off period ────────────────────────────────────
  const sortedLogs = [...workoutLogs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  if (sortedLogs.length > 0) {
    const firstWorkoutDate = new Date(sortedLogs[0].date);
    if (daysBetween(now, firstWorkoutDate) < MIN_DAYS_BEFORE_FIRST_PROMPT) return null;
  } else {
    // No workouts at all — don't prompt
    return null;
  }

  // Only one upsell target — Pro
  const targetTier = 'pro' as const;

  // ── Milestone prompts (high engagement moments) ────────────────────────

  // 10th workout milestone
  if (gamificationStats.totalWorkouts === 10) {
    return {
      type: 'milestone',
      headline: '10 workouts in the books!',
      body: 'You\'ve built real momentum. Unlock AI coaching and unlimited programs to keep the gains coming.',
      ctaText: 'Try Pro Free',
      targetTier,
    };
  }

  // First PR
  if (gamificationStats.personalRecords === 1) {
    return {
      type: 'milestone',
      headline: 'You just hit your first PR!',
      body: 'That strength increase is real. Performance modeling can help you break through even faster.',
      ctaText: 'Unlock Performance Insights',
      targetTier,
    };
  }

  // 30-day streak
  if (gamificationStats.currentStreak === 30) {
    return {
      type: 'milestone',
      headline: '30-day streak. Incredible.',
      body: 'Consistency like this is rare. Advanced tools like block suggestions and weekly narratives can help you make every session count.',
      ctaText: 'Level Up to Pro',
      targetTier,
    };
  }

  // 50th workout
  if (gamificationStats.totalWorkouts === 50) {
    return {
      type: 'milestone',
      headline: '50 workouts completed!',
      body: 'You\'re in the top tier of consistency. Your training data is now deep enough for powerful AI-driven insights.',
      ctaText: 'Unlock AI Coach',
      targetTier,
    };
  }

  // ── Monthly value recap (show roughly once a month) ────────────────────
  // Only fires if user has enough data and it's been a while
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentLogs = workoutLogs.filter(l => new Date(l.date).getTime() > thirtyDaysAgo.getTime());
  const recentPRs = recentLogs.filter(l => l.exercises.some(e => e.personalRecord)).length;

  if (recentLogs.length >= 8 && gamificationStats.totalWorkouts >= 15) {
    return {
      type: 'value_recap',
      headline: `This month: ${recentLogs.length} workouts${recentPRs > 0 ? `, ${recentPRs} PR${recentPRs > 1 ? 's' : ''}` : ''}.`,
      body: 'Imagine what AI coaching, wearable sync, and personalized block suggestions could do with this data.',
      ctaText: 'See What Pro Unlocks',
      targetTier,
    };
  }

  // No prompt conditions met
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. TRIAL SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

export interface TrialStatus {
  isInTrial: boolean;
  daysRemaining: number;
  trialTier: 'pro' | 'elite';
  features: string[];
}

export interface TrialConfig {
  durationDays: number;
  tier: 'pro';
  features: string[];
  conversionMessage: string;
}

// Features explicitly highlighted during the trial
const TRIAL_HIGHLIGHT_FEATURES = [
  'ai-coach',
  'unlimited-mesocycles',
  'block-suggestions',
  'weekly-narrative',
  'custom-exercises',
  'session-templates',
  'data-export',
  'recovery-ai',
  'advanced-gamification',
  'injury-tracking',
  'strength-analysis',
];

/**
 * Determine the user's current trial status from their subscription object.
 */
export function getTrialStatus(subscription: Subscription | null): TrialStatus {
  const noTrial: TrialStatus = {
    isInTrial: false,
    daysRemaining: 0,
    trialTier: 'pro',
    features: [],
  };

  if (!subscription) return noTrial;
  if (subscription.source !== 'trial') return noTrial;
  if (subscription.status !== 'active') return noTrial;

  const periodEnd = new Date(subscription.currentPeriodEnd);
  const now = new Date();
  const remaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  if (remaining <= 0) return noTrial;

  return {
    isInTrial: true,
    daysRemaining: remaining,
    trialTier: 'pro',
    features: TRIAL_HIGHLIGHT_FEATURES,
  };
}

/**
 * Get the trial configuration, including a personalised conversion message
 * based on which trial features the user actually engaged with.
 *
 * @param usedFeatureIds - IDs of features the user interacted with during the trial
 */
export function getTrialConfig(usedFeatureIds?: string[]): TrialConfig {
  let conversionMessage =
    'Your free trial ends soon. Subscribe to Pro to keep access to AI coaching, unlimited programs, and everything you\'ve been using.';

  if (usedFeatureIds && usedFeatureIds.length > 0) {
    // Personalise the message based on actual usage
    const usedNames: string[] = [];
    usedFeatureIds.forEach(id => {
      const gate = FEATURE_GATE_LIST.find(g => g.id === id);
      if (gate && gate.tier !== 'free') {
        usedNames.push(gate.name);
      }
    });

    if (usedNames.length >= 3) {
      conversionMessage = `You've been using ${usedNames.slice(0, 3).join(', ')} and more. Keep them all by subscribing to Pro.`;
    } else if (usedNames.length > 0) {
      conversionMessage = `You've been using ${usedNames.join(' and ')}. Subscribe to Pro so you don't lose access.`;
    }
  }

  return {
    durationDays: TRIAL_DURATION_DAYS,
    tier: 'pro',
    features: TRIAL_HIGHLIGHT_FEATURES,
    conversionMessage,
  };
}

/**
 * Determine if a user qualifies for a trial activation.
 * Requires at least TRIAL_ACTIVATION_WORKOUTS completed workouts and no
 * existing or past subscription.
 */
export function isTrialEligible(
  workoutLogs: WorkoutLog[],
  subscription: Subscription | null,
): boolean {
  // Already has or had a subscription
  if (subscription) return false;

  // Need minimum engagement before trial
  return active(workoutLogs).length >= TRIAL_ACTIVATION_WORKOUTS;
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. PRICING DISPLAY
// ═══════════════════════════════════════════════════════════════════════════

export interface PricingTier {
  id: string;
  name: string;
  price: number;
  period: 'monthly' | 'yearly';
  yearlyDiscount?: number;
  features: string[];
  highlighted: boolean;
  badge?: string;
}

/**
 * Returns structured pricing tiers ready for UI display.
 */
export function getPricingTiers(): PricingTier[] {
  return [
    // ── Free ─────────────────────────────────────────────────────────────
    {
      id: 'free-monthly',
      name: 'Free',
      price: 0,
      period: 'monthly',
      features: [
        'Basic workout tracking & logging',
        'Up to 2 mesocycles',
        'Basic progress charts',
        '3 exercises per muscle group',
        'Community sharing',
        'Streaks, badges & XP',
        '1RM calculator',
        'Quick log (water, sleep, energy)',
        'Training session log',
      ],
      highlighted: false,
    },

    // ── Pro Monthly ──────────────────────────────────────────────────────
    {
      id: 'pro-monthly',
      name: 'Pro',
      price: PRICE_PRO_MONTHLY,
      period: 'monthly',
      features: [
        'Everything in Free, plus:',
        'Unlimited mesocycles & smart scheduling',
        'AI Coach with weekly coaching reviews',
        'Conditioning programming & mobility',
        'Full nutrition suite (macros, fight camp, supplements)',
        'Wearable sync (Whoop, Apple Health, Garmin, Oura)',
        'Advanced analytics & strength analysis',
        'Health tracking (injury, illness, readiness, fatigue)',
        'Competition prep & female athlete intelligence',
        'Cloud sync, data export, custom exercises',
        'Barcode nutrition scanning',
      ],
      highlighted: true,
      badge: 'Most Popular',
    },

    // ── Pro Yearly ───────────────────────────────────────────────────────
    {
      id: 'pro-yearly',
      name: 'Pro',
      price: PRICE_PRO_YEARLY,
      period: 'yearly',
      yearlyDiscount: YEARLY_DISCOUNT_PERCENT,
      features: [
        'Everything in Free, plus:',
        'Unlimited mesocycles & smart scheduling',
        'AI Coach with weekly coaching reviews',
        'Conditioning programming & mobility',
        'Full nutrition suite (macros, fight camp, supplements)',
        'Wearable sync (Whoop, Apple Health, Garmin, Oura)',
        'Advanced analytics & strength analysis',
        'Health tracking (injury, illness, readiness, fatigue)',
        'Competition prep & female athlete intelligence',
        'Cloud sync, data export, custom exercises',
        'Barcode nutrition scanning',
      ],
      highlighted: false,
      badge: 'Save 20%',
    },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all feature gates for a specific tier.
 */
export function getFeatureGatesByTier(tier: MonetizationTier): FeatureGate[] {
  return FEATURE_GATE_LIST.filter(g => g.tier === tier);
}

/**
 * Get all feature gates in a specific category.
 */
export function getFeatureGatesByCategory(category: string): FeatureGate[] {
  return FEATURE_GATE_LIST.filter(g => g.category === category);
}

/**
 * Get the minimum tier required for a feature.
 */
export function getRequiredTier(featureId: string): MonetizationTier {
  const gate = FEATURE_GATE_LIST.find(g => g.id === featureId);
  return gate ? gate.tier : 'free';
}

/**
 * Get a list of features the user would unlock by upgrading from their
 * current tier to a target tier.
 */
export function getUnlockableFeatures(
  currentTier: MonetizationTier,
  targetTier: MonetizationTier,
): FeatureGate[] {
  return FEATURE_GATE_LIST.filter(
    g => TIER_RANK[g.tier] > TIER_RANK[currentTier] && TIER_RANK[g.tier] <= TIER_RANK[targetTier],
  );
}

/**
 * Get the monthly price for a given tier (convenience helper for UI).
 */
export function getMonthlyPrice(tier: MonetizationTier): number {
  if (tier === 'pro' || tier === 'elite') return PRICE_PRO_MONTHLY;
  return 0;
}

/**
 * Get the yearly price for a given tier (convenience helper for UI).
 */
export function getYearlyPrice(tier: MonetizationTier): number {
  if (tier === 'pro' || tier === 'elite') return PRICE_PRO_YEARLY;
  return 0;
}
