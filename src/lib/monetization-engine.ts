// ── Monetization Refinement Engine (Sprint 9) ─────────────────────────────
// Pure-function module — no React, no store imports.
// Extends the existing free/pro subscription model with a three-tier
// (free / pro / elite) feature-gate, paywall, value-demonstration,
// upgrade-prompt, trial, and pricing system.
//
// NOTE: The canonical SubscriptionTier in types.ts is 'free' | 'pro'.
// This engine introduces 'elite' as a forward-looking tier. We define a
// local MonetizationTier union so we don't touch shared types until the
// backend is ready for 3-tier billing.

import type { WorkoutLog, GamificationStats, Subscription } from './types';

// ── Pricing Constants (single source of truth — easy to adjust) ───────────
export const PRICE_PRO_MONTHLY = 9.99;
export const PRICE_PRO_YEARLY = 95.88; // 12 * 7.99 (20% off monthly)
export const PRICE_ELITE_MONTHLY = 19.99;
export const PRICE_ELITE_YEARLY = 191.88; // 12 * 15.99 (20% off monthly)
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

// Master feature registry — authoritative list of every gated capability.
const FEATURE_GATE_LIST: FeatureGate[] = [
  // ── Free tier (generous — hook them) ───────────────────────────────────
  { id: 'workout-tracking',       name: 'Workout Tracking',              tier: 'free',  category: 'core',          description: 'Log sets, reps, weight, and RPE for every session' },
  { id: 'manual-logging',         name: 'Manual Logging',                tier: 'free',  category: 'core',          description: 'Manually log any workout, even outside a program' },
  { id: 'mesocycle-basic',        name: 'Mesocycle Programming',         tier: 'free',  category: 'programming',   description: 'Generate and run up to 2 mesocycles' },
  { id: 'basic-progress-charts',  name: 'Basic Progress Charts',         tier: 'free',  category: 'analytics',     description: 'See your strength and volume trends over time' },
  { id: 'exercise-library-basic', name: 'Exercise Library (Core)',       tier: 'free',  category: 'exercises',     description: 'Access up to 3 exercises per muscle group' },
  { id: 'community-sharing',      name: 'Community Sharing',             tier: 'free',  category: 'social',        description: 'Share workouts and PRs with friends' },
  { id: 'streaks-badges',         name: 'Streaks & Badges',              tier: 'free',  category: 'gamification',  description: 'Earn streaks, XP, and collect badges' },
  { id: '1rm-calculator',         name: '1RM Calculator',                tier: 'free',  category: 'tools',         description: 'Estimate your one-rep max from any set' },
  { id: 'quick-log',              name: 'Quick Log',                     tier: 'free',  category: 'core',          description: 'Log water, sleep, energy, and readiness quickly' },
  { id: 'training-log',           name: 'Training Session Log',          tier: 'free',  category: 'core',          description: 'Track combat sport and cardio sessions' },

  // ── Pro tier ($9.99/mo) ────────────────────────────────────────────────
  { id: 'unlimited-mesocycles',   name: 'Unlimited Mesocycles',          tier: 'pro',   category: 'programming',   description: 'Save, switch, and queue unlimited training programs' },
  { id: 'exercise-library-full',  name: 'Full Exercise Library',         tier: 'pro',   category: 'exercises',     description: 'Access every exercise with alternatives and swaps' },
  { id: 'ai-coach',               name: 'AI Coach',                      tier: 'pro',   category: 'coaching',      description: 'Personalized weekly summaries and training recommendations' },
  { id: 'smart-schedule',         name: 'Smart Schedule',                tier: 'pro',   category: 'programming',   description: 'Auto-adjust sessions around your real-life schedule' },
  { id: 'injury-tracking',        name: 'Injury & Pain Tracking',        tier: 'pro',   category: 'health',        description: 'Log injuries with return-to-training protocols' },
  { id: 'recovery-ai',            name: 'Recovery AI',                   tier: 'pro',   category: 'health',        description: 'Readiness scoring and auto-regulation from recovery data' },
  { id: 'performance-model',      name: 'Performance Model',             tier: 'pro',   category: 'analytics',     description: 'Exercise response profiling and sticking-point analysis' },
  { id: 'block-suggestions',      name: 'Block Suggestions',             tier: 'pro',   category: 'programming',   description: 'AI-powered next-block recommendations based on your history' },
  { id: 'weekly-narrative',       name: 'Weekly Coaching Narrative',     tier: 'pro',   category: 'coaching',      description: 'In-depth weekly review with strengths and areas to improve' },
  { id: 'custom-exercises',       name: 'Custom Exercises',              tier: 'pro',   category: 'exercises',     description: 'Create and save your own exercises' },
  { id: 'session-templates',      name: 'Session Templates',             tier: 'pro',   category: 'programming',   description: 'Save and reuse your favorite workout templates' },
  { id: 'data-export',            name: 'Data Export',                   tier: 'pro',   category: 'tools',         description: 'Export your workout history as CSV or PDF' },
  { id: 'advanced-gamification',  name: 'Advanced Gamification',         tier: 'pro',   category: 'gamification',  description: 'Weekly challenges, variable rewards, and bonus XP events' },
  { id: 'illness-tracking',       name: 'Illness Tracking',              tier: 'pro',   category: 'health',        description: 'Smart return-to-training protocols after illness' },
  { id: 'mobility-routines',      name: 'Mobility Routines',             tier: 'pro',   category: 'health',        description: 'Guided mobility and flexibility routines' },
  { id: 'strength-analysis',      name: 'Strength Analysis',             tier: 'pro',   category: 'analytics',     description: 'Sticking-point analysis and exercise profiling' },
  { id: 'body-composition',       name: 'Body Composition Tracking',     tier: 'pro',   category: 'health',        description: 'Track body fat, measurements, and recomp progress' },
  { id: 'cloud-sync',             name: 'Cloud Sync',                    tier: 'pro',   category: 'tools',         description: 'Sync your data securely across all your devices' },

  // ── Elite tier ($19.99/mo) ─────────────────────────────────────────────
  { id: 'wearable-whoop',         name: 'Whoop Integration',             tier: 'elite', category: 'wearables',     description: 'Auto-import recovery, strain, and sleep from Whoop' },
  { id: 'wearable-garmin',        name: 'Garmin Integration',            tier: 'elite', category: 'wearables',     description: 'Sync workouts and health data from Garmin devices' },
  { id: 'wearable-oura',          name: 'Oura Integration',              tier: 'elite', category: 'wearables',     description: 'Import readiness, sleep, and activity from Oura Ring' },
  { id: 'fatigue-debt',           name: 'Fatigue Debt Tracking',         tier: 'elite', category: 'analytics',     description: 'Track accumulated fatigue across training blocks' },
  { id: 'female-athlete-intel',   name: 'Female Athlete Intelligence',   tier: 'elite', category: 'health',        description: 'Cycle-aware programming and recovery adjustments' },
  { id: 'competition-prep',       name: 'Competition Prep',              tier: 'elite', category: 'programming',   description: 'Peaking, tapering, and weight-cut planning for events' },
  { id: 'caloric-periodization',  name: 'Caloric Periodization',         tier: 'elite', category: 'nutrition',     description: 'Auto-adjust calories and macros around training days' },
  { id: 'nutrition-coaching',     name: 'Nutrition Coaching',            tier: 'elite', category: 'nutrition',     description: 'AI-driven macro adjustments based on body composition trends' },
  { id: 'hr-zones',               name: 'Heart Rate Zone Training',      tier: 'elite', category: 'wearables',     description: 'Personalised HR zones with time-in-zone tracking' },
  { id: 'grip-tracking',          name: 'Grip Strength Tracking',        tier: 'elite', category: 'analytics',     description: 'Dynamometer and dead-hang tracking with trends' },
  { id: 'advanced-analytics',     name: 'Advanced Analytics Dashboard',  tier: 'elite', category: 'analytics',     description: '1RM trends, volume heatmaps, and deep training insights' },

  // ── Combat Nutrition (Pro tier) ─────────────────────────────────────────
  { id: 'weight-cut-protocol',   name: 'Weight Cut Protocol',           tier: 'pro',   category: 'nutrition',     description: 'Safe, phased weight cut planning for combat athletes' },
  { id: 'fight-camp-nutrition',  name: 'Fight Camp Nutrition',          tier: 'pro',   category: 'nutrition',     description: 'Periodized nutrition across fight camp phases' },
  { id: 'supplement-protocol',   name: 'Supplement Protocol',           tier: 'pro',   category: 'nutrition',     description: 'Evidence-based supplement recommendations with pre-comp pauses' },
  { id: 'performance-readiness', name: 'Performance Readiness',         tier: 'pro',   category: 'nutrition',     description: 'Composite nutrition readiness scoring with bottleneck detection' },
  { id: 'energy-availability',   name: 'Energy Availability',           tier: 'pro',   category: 'nutrition',     description: 'EA tracking with RED-S warning system' },
  { id: 'intra-training-fuel',   name: 'Intra-Training Fueling',       tier: 'pro',   category: 'nutrition',     description: 'Real-time fueling recommendations during training sessions' },
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
  if (!gate) return true; // Unknown features default to allowed
  return TIER_RANK[userTier] >= TIER_RANK[gate.tier];
}

/**
 * Returns a persuasive but honest reason the user would benefit from upgrading
 * to access a specific feature.
 */
export function getUpgradeReason(featureId: string): string {
  const reasons: Record<string, string> = {
    // Pro features
    'unlimited-mesocycles':   'Remove the 2-program limit and queue your entire training year.',
    'exercise-library-full':  'Get access to every exercise variation with smart alternatives for your equipment.',
    'ai-coach':               'Let the AI analyze your training data and give you a personalized game plan each week.',
    'smart-schedule':         'Life happens. Smart Schedule reshuffles your week so you never miss the important sessions.',
    'injury-tracking':        'Log injuries and get evidence-based return-to-training protocols so you come back stronger.',
    'recovery-ai':            'Auto-adjust today\'s workout intensity based on your sleep, stress, and soreness data.',
    'performance-model':      'Discover which exercises drive the most growth for YOUR body and which rep ranges work best.',
    'block-suggestions':      'Take the guesswork out of periodization with AI-powered next-block recommendations.',
    'weekly-narrative':       'Get a detailed weekly coaching review highlighting what went well and what to focus on next.',
    'custom-exercises':       'Build and save your own exercises so your program fits your gym perfectly.',
    'session-templates':      'Save your favorite sessions and load them in one tap for faster workout starts.',
    'data-export':            'Export your training history to CSV or PDF for coaches, physios, or your own records.',
    'advanced-gamification':  'Unlock weekly challenges and variable rewards that keep training fun and competitive.',
    'illness-tracking':       'Smart protocols help you know exactly when and how hard to train after being sick.',
    'mobility-routines':      'Follow guided mobility routines tailored to grapplers and lifters.',
    'strength-analysis':      'Identify sticking points in your lifts and get targeted accessory recommendations.',
    'body-composition':       'Track body fat, measurements, and visualise your recomposition progress over time.',
    'cloud-sync':             'Never lose your data. Sync securely across all your devices.',

    // Elite features
    'wearable-whoop':         'Auto-import Whoop recovery and strain so your program adapts to how your body actually feels.',
    'wearable-garmin':        'Sync Garmin workouts and health metrics for a complete picture of your training load.',
    'wearable-oura':          'Import Oura Ring readiness and sleep scores to fine-tune recovery-based programming.',
    'fatigue-debt':           'Track cumulative fatigue across blocks to prevent overtraining before it happens.',
    'female-athlete-intel':   'Cycle-aware programming that adjusts volume and intensity with your hormonal phases.',
    'competition-prep':       'Peaking, tapering, and weight-cut tools designed for fight week and competition day.',
    'caloric-periodization':  'Automatically cycle calories and macros around training and rest days for optimal fueling.',
    'nutrition-coaching':     'AI-driven macro adjustments that evolve with your body composition and training goals.',
    'hr-zones':               'Personalised heart rate zones with time-in-zone tracking for conditioning and recovery.',
    'grip-tracking':          'Dedicated grip strength tracking with dynamometer and dead-hang trend analysis.',
    'advanced-analytics':     'Deep-dive analytics: 1RM trends, volume heatmaps, muscle-group balance, and more.',

    // Combat nutrition
    'weight-cut-protocol':    'Safe, science-backed weight cuts with daily tracking and safety alerts built for fighters.',
    'fight-camp-nutrition':   'Phase-specific nutrition targets that auto-adjust as you move through fight camp.',
    'supplement-protocol':    'Evidence-based supplement timing with auto-pauses before weigh-ins for banned substance safety.',
    'performance-readiness':  'A composite readiness score showing exactly what to fix before your next session.',
    'energy-availability':    'Track energy availability to prevent RED-S and keep performance on track.',
    'intra-training-fuel':    'Real-time fueling cues during training so you never bonk in hard sessions.',
  };

  return reasons[featureId] || 'Upgrade to unlock this feature and take your training to the next level.';
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
    featureId: 'ai-coach',
    tier: 'pro',
    message: 'You get 3 free AI Coach queries per week. Upgrade to Pro for unlimited coaching insights.',
    ctaText: 'Unlock Unlimited Coaching',
    freePreview: '3 queries/week',
  },
  {
    featureId: 'block-suggestions',
    tier: 'pro',
    message: 'You get 1 free block suggestion per month. Upgrade to see recommendations after every mesocycle.',
    ctaText: 'Unlock Smart Programming',
    freePreview: '1 suggestion/month',
  },
  {
    featureId: 'performance-model',
    tier: 'pro',
    message: 'Your performance model shows the last 4 weeks. Upgrade to Pro for full historical analysis.',
    ctaText: 'See Full Performance History',
    freePreview: 'Last 4 weeks only',
  },
  {
    featureId: 'weekly-narrative',
    tier: 'pro',
    message: 'You can see this week\'s coaching narrative. Upgrade to Pro for full weekly history and deeper insights.',
    ctaText: 'Unlock Full Coaching History',
    freePreview: 'Current week only',
  },
  {
    featureId: 'advanced-analytics',
    tier: 'elite',
    message: 'You\'re seeing a summary view. Upgrade to Elite for 1RM trends, volume heatmaps, and deep insights.',
    ctaText: 'Unlock Advanced Analytics',
    freePreview: 'Summary view only',
  },
  {
    featureId: 'performance-readiness',
    tier: 'pro',
    message: 'You can see your overall score. Upgrade to Pro for component breakdown and action items.',
    ctaText: 'Unlock Full Readiness',
    freePreview: 'Overall score only',
  },
  {
    featureId: 'fight-camp-nutrition',
    tier: 'pro',
    message: 'You can see your current phase. Upgrade to Pro for full macro targets and phase recommendations.',
    ctaText: 'Unlock Fight Camp Nutrition',
    freePreview: 'Current phase only',
  },
];

// Hard paywalls — feature is completely locked
const HARD_PAYWALL_IDS: string[] = [
  'wearable-whoop',
  'wearable-garmin',
  'wearable-oura',
  'competition-prep',
  'fatigue-debt',
  'nutrition-coaching',
  'caloric-periodization',
  'female-athlete-intel',
  'hr-zones',
  'grip-tracking',
  'weight-cut-protocol',
  'supplement-protocol',
  'energy-availability',
  'intra-training-fuel',
];

/**
 * Returns the paywall trigger for a feature given the user's tier, or null
 * if the user already has access.
 */
export function getPaywallTrigger(featureId: string, userTier: MonetizationTier): PaywallTrigger | null {
  if (isFeatureAvailable(featureId, userTier)) return null;

  const gate = FEATURE_GATE_LIST.find(g => g.id === featureId);
  if (!gate) return null;

  const targetTier = gate.tier as 'pro' | 'elite';

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
      ctaText: targetTier === 'elite' ? 'Upgrade to Elite' : 'Upgrade to Pro',
      tier: targetTier,
    };
  }

  // Default hard paywall for any remaining locked feature
  return {
    featureId,
    triggerType: 'hard',
    message: getUpgradeReason(featureId),
    ctaText: targetTier === 'elite' ? 'Upgrade to Elite' : 'Upgrade to Pro',
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

  if (tier === 'pro') {
    potentialGains.push('Connect your wearable for recovery-driven auto-regulation');
    potentialGains.push('Unlock caloric periodization to fuel your training days optimally');
    if (totalWorkouts >= 50) {
      potentialGains.push('With 50+ workouts logged, fatigue debt tracking can fine-tune your deload timing');
    }
    potentialGains.push('Advanced analytics give you 1RM trends and volume heatmaps for deeper insight');
  }

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
  // Already on Elite — nothing to upsell
  if (tier === 'elite') return null;

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

  // The target tier for upsell
  const targetTier: 'pro' | 'elite' = tier === 'free' ? 'pro' : 'elite';

  // ── Milestone prompts (high engagement moments) ────────────────────────

  // 10th workout milestone
  if (gamificationStats.totalWorkouts === 10) {
    return {
      type: 'milestone',
      headline: '10 workouts in the books!',
      body: 'You\'ve built real momentum. Unlock AI coaching and unlimited programs to keep the gains coming.',
      ctaText: targetTier === 'pro' ? 'Try Pro Free' : 'Explore Elite',
      targetTier,
    };
  }

  // First PR
  if (gamificationStats.personalRecords === 1) {
    return {
      type: 'milestone',
      headline: 'You just hit your first PR!',
      body: 'That strength increase is real. Performance modeling can help you break through even faster.',
      ctaText: targetTier === 'pro' ? 'Unlock Performance Insights' : 'Go Elite',
      targetTier,
    };
  }

  // 30-day streak
  if (gamificationStats.currentStreak === 30) {
    return {
      type: 'milestone',
      headline: '30-day streak. Incredible.',
      body: 'Consistency like this is rare. Advanced tools like block suggestions and weekly narratives can help you make every session count.',
      ctaText: targetTier === 'pro' ? 'Level Up to Pro' : 'Unlock Elite Features',
      targetTier,
    };
  }

  // 50th workout
  if (gamificationStats.totalWorkouts === 50) {
    return {
      type: 'milestone',
      headline: '50 workouts completed!',
      body: 'You\'re in the top tier of consistency. Your training data is now deep enough for powerful AI-driven insights.',
      ctaText: targetTier === 'pro' ? 'Unlock AI Coach' : 'Explore Elite Analytics',
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
      body: tier === 'free'
        ? 'Imagine what AI coaching and personalized block suggestions could do with this data.'
        : 'Wearable integration and fatigue tracking could take your programming to the next level.',
      ctaText: targetTier === 'pro' ? 'See What Pro Unlocks' : 'Discover Elite',
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
  'performance-model',
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
  return workoutLogs.length >= TRIAL_ACTIVATION_WORKOUTS;
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
        'Unlimited mesocycles & block queue',
        'Full exercise library with alternatives',
        'AI Coach with weekly summaries',
        'Smart Schedule auto-adjust',
        'Injury & illness tracking with RTT protocols',
        'Recovery AI & readiness scoring',
        'Performance model & sticking-point analysis',
        'Block suggestions',
        'Weekly coaching narrative',
        'Custom exercises & session templates',
        'Data export (CSV & PDF)',
        'Weekly challenges & variable rewards',
        'Body composition tracking',
        'Cloud sync',
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
        'Unlimited mesocycles & block queue',
        'Full exercise library with alternatives',
        'AI Coach with weekly summaries',
        'Smart Schedule auto-adjust',
        'Injury & illness tracking with RTT protocols',
        'Recovery AI & readiness scoring',
        'Performance model & sticking-point analysis',
        'Block suggestions',
        'Weekly coaching narrative',
        'Custom exercises & session templates',
        'Data export (CSV & PDF)',
        'Weekly challenges & variable rewards',
        'Body composition tracking',
        'Cloud sync',
      ],
      highlighted: false,
      badge: 'Save 20%',
    },

    // ── Elite Monthly ────────────────────────────────────────────────────
    {
      id: 'elite-monthly',
      name: 'Elite',
      price: PRICE_ELITE_MONTHLY,
      period: 'monthly',
      features: [
        'Everything in Pro, plus:',
        'Whoop, Garmin & Oura integrations',
        'Fatigue debt tracking',
        'Female athlete intelligence',
        'Competition prep (peaking & weight cuts)',
        'Caloric periodization',
        'AI nutrition coaching',
        'Heart rate zone training',
        'Grip strength tracking',
        'Advanced analytics dashboard',
      ],
      highlighted: false,
    },

    // ── Elite Yearly ─────────────────────────────────────────────────────
    {
      id: 'elite-yearly',
      name: 'Elite',
      price: PRICE_ELITE_YEARLY,
      period: 'yearly',
      yearlyDiscount: YEARLY_DISCOUNT_PERCENT,
      features: [
        'Everything in Pro, plus:',
        'Whoop, Garmin & Oura integrations',
        'Fatigue debt tracking',
        'Female athlete intelligence',
        'Competition prep (peaking & weight cuts)',
        'Caloric periodization',
        'AI nutrition coaching',
        'Heart rate zone training',
        'Grip strength tracking',
        'Advanced analytics dashboard',
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
  if (tier === 'pro') return PRICE_PRO_MONTHLY;
  if (tier === 'elite') return PRICE_ELITE_MONTHLY;
  return 0;
}

/**
 * Get the yearly price for a given tier (convenience helper for UI).
 */
export function getYearlyPrice(tier: MonetizationTier): number {
  if (tier === 'pro') return PRICE_PRO_YEARLY;
  if (tier === 'elite') return PRICE_ELITE_YEARLY;
  return 0;
}
