/**
 * Composite Wellness Score Engine
 *
 * Unifies all wellness dimensions into a single daily score (0-100).
 * This is the "meta-health" number — the daily anchor metric.
 *
 * Science:
 * - McEwen 1998: Allostatic load theory — cumulative physiological burden
 *   from chronic stress degrades performance and health
 * - Meijman & Mulder 1998: Effort-Recovery Model — recovery must match
 *   effort or performance declines
 * - Halson 2014: Monitoring training load + recovery indicators predicts
 *   injury and overtraining
 * - Kellmann 2010: Recovery-Stress Questionnaire validates multi-domain
 *   wellness tracking for athletes
 *
 * All functions are pure — no side effects, no store, no React.
 */

import type { WellnessDomain, WellnessDay, WellnessStreaks } from './types';
import type { SleepQualityScore } from './sleep-score';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WellnessInput {
  /** Today's completed wellness domains. */
  domainsCompleted: WellnessDomain[];
  /** Sleep quality score (from sleep-score.ts). Null if not logged today. */
  sleepScore: SleepQualityScore | null;
  /** Wearable recovery score (0-100). Null if no wearable. */
  wearableRecovery: number | null;
  /** Wearable HRV status: deviation from baseline. Null if unavailable. */
  hrvDeviationPct: number | null;
  /** Resting heart rate trend: delta from baseline. Null if unavailable. */
  rhrDelta: number | null;
  /** Current wellness streaks. */
  streaks: WellnessStreaks;
  /** Recent wellness days for trend analysis (last 7-14 days). */
  recentDays: WellnessDay[];
}

export interface CompositeWellnessScore {
  /** Overall score (0-100). */
  score: number;
  /** Human-readable tier. */
  tier: 'thriving' | 'good' | 'moderate' | 'struggling' | 'depleted';
  /** Sub-scores for each dimension. */
  dimensions: {
    sleep: number;
    nutrition: number;
    hydration: number;
    mobility: number;
    mental: number;
    breathing: number;
    supplements: number;
    /** Wearable-informed recovery (or estimated). */
    recovery: number;
  };
  /** 7-day trend direction. */
  trend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  /** Training XP multiplier derived from this score. */
  multiplier: number;
  /** Single most impactful action the user can take right now. */
  topAction: string | null;
}

// ─── Dimension Weights ───────────────────────────────────────────────────────
//
// Weights derived from recovery impact literature:
// - Sleep: strongest predictor of recovery (Fullagar 2015, Walker 2017)
// - Nutrition: protein timing and energy availability (Murphy & Koehler 2022)
// - Hydration: 2% dehydration = 10% performance loss (Cheuvront & Kenefick 2014)
// - Recovery (wearable): HRV/recovery proxy for ANS readiness (Plews 2013)
// - Mobility: injury prevention, ROM maintenance (Behm et al. 2016)
// - Mental: psychological readiness, RPE accuracy (Marcora 2009)
// - Breathing: parasympathetic activation, HRV improvement (Zaccaro 2018)
// - Supplements: creatine, vitamin D, omega-3 compliance (Rawson & Volek 2003)
//

const DIMENSION_WEIGHTS = {
  sleep: 0.25,
  nutrition: 0.18,
  hydration: 0.12,
  recovery: 0.15,
  mobility: 0.10,
  mental: 0.08,
  breathing: 0.06,
  supplements: 0.06,
} as const;

// ─── Core Score Calculation ──────────────────────────────────────────────────

/**
 * Calculate the composite wellness score.
 *
 * Each dimension scores 0-100 based on:
 * 1. Domain completion (binary: did you do it today?)
 * 2. Quality data when available (sleep hours, wearable recovery, etc.)
 * 3. Streak bonus (consistency amplifies score)
 */
export function calculateCompositeWellnessScore(input: WellnessInput): CompositeWellnessScore {
  const domains = new Set(input.domainsCompleted);

  // ── Sleep dimension ──
  const sleepDim = input.sleepScore
    ? input.sleepScore.composite
    : domains.has('sleep') ? 70 : 0; // Logged but no quality data = 70

  // ── Nutrition dimension ──
  const nutritionDim = domains.has('nutrition')
    ? applyStreakBonus(75, input.streaks.nutrition) // Base 75 for logging, streak amplifies
    : 0;

  // ── Hydration dimension ──
  const hydrationDim = domains.has('water')
    ? applyStreakBonus(80, input.streaks.water) // Binary: hit target or not
    : 0;

  // ── Recovery dimension (wearable-informed) ──
  const recoveryDim = calculateRecoveryDimension(input);

  // ── Mobility dimension ──
  const mobilityDim = domains.has('mobility')
    ? applyStreakBonus(80, input.streaks.mobility)
    : 0;

  // ── Mental dimension ──
  const mentalDim = domains.has('mental')
    ? applyStreakBonus(75, input.streaks.mental)
    : 0;

  // ── Breathing dimension ──
  const breathingDim = domains.has('breathing')
    ? applyStreakBonus(80, input.streaks.breathing ?? 0)
    : 0;

  // ── Supplements dimension ──
  const supplementsDim = domains.has('supplements')
    ? applyStreakBonus(75, input.streaks.supplements)
    : 0;

  const dimensions = {
    sleep: Math.min(100, sleepDim),
    nutrition: Math.min(100, nutritionDim),
    hydration: Math.min(100, hydrationDim),
    recovery: Math.min(100, recoveryDim),
    mobility: Math.min(100, mobilityDim),
    mental: Math.min(100, mentalDim),
    breathing: Math.min(100, breathingDim),
    supplements: Math.min(100, supplementsDim),
  };

  // Weighted composite
  const score = Math.round(
    dimensions.sleep * DIMENSION_WEIGHTS.sleep +
    dimensions.nutrition * DIMENSION_WEIGHTS.nutrition +
    dimensions.hydration * DIMENSION_WEIGHTS.hydration +
    dimensions.recovery * DIMENSION_WEIGHTS.recovery +
    dimensions.mobility * DIMENSION_WEIGHTS.mobility +
    dimensions.mental * DIMENSION_WEIGHTS.mental +
    dimensions.breathing * DIMENSION_WEIGHTS.breathing +
    dimensions.supplements * DIMENSION_WEIGHTS.supplements
  );

  // Tier
  const tier = score >= 85 ? 'thriving'
    : score >= 70 ? 'good'
    : score >= 50 ? 'moderate'
    : score >= 30 ? 'struggling'
    : 'depleted';

  // Trend from recent days
  const trend = calculateTrend(input.recentDays);

  // Multiplier: maps score to 1.0 - 1.35 range (capped to prevent XP inflation)
  const multiplier = scoreToMultiplier(score);

  // Top action: highest-weight uncompleted dimension
  const topAction = generateTopAction(domains, dimensions);

  return { score, tier, dimensions, trend, multiplier, topAction };
}

// ─── Effort-Recovery Balance ─────────────────────────────────────────────────

export interface EffortRecoveryBalance {
  /** Recovery capacity score (0-100) from wellness. */
  recoveryCapacity: number;
  /** Training effort score (0-100) from recent load. */
  trainingEffort: number;
  /** Balance ratio: recovery / effort. >1.0 = surplus, <1.0 = deficit. */
  ratio: number;
  /** Status interpretation. */
  status: 'surplus' | 'balanced' | 'deficit' | 'critical_deficit';
  /** Recommendation. */
  recommendation: string;
}

/**
 * Calculate the Effort-Recovery Balance.
 *
 * Science: Meijman & Mulder 1998 Effort-Recovery Model.
 * When effort chronically exceeds recovery, performance crashes and injury
 * risk spikes. The balance ratio is the simplest predictor.
 *
 * @param wellnessScore - Today's composite wellness score (0-100)
 * @param acwr - Acute:Chronic Workload Ratio from fatigue-metrics
 * @param recentAvgRPE - Average session RPE over last 5 sessions
 * @param wearableRecovery - Wearable recovery score (0-100), null if unavailable
 */
export function calculateEffortRecoveryBalance(
  wellnessScore: number,
  acwr: number | null,
  recentAvgRPE: number | null,
  wearableRecovery: number | null,
): EffortRecoveryBalance {
  // Recovery capacity: composite wellness, optionally boosted by wearable
  let recoveryCapacity = wellnessScore;
  if (wearableRecovery != null) {
    // Blend: 60% wellness score + 40% wearable (wearable is objective)
    recoveryCapacity = Math.round(wellnessScore * 0.6 + wearableRecovery * 0.4);
  }

  // Training effort: from ACWR and/or RPE
  let trainingEffort: number;
  if (acwr != null && recentAvgRPE != null) {
    // ACWR > 1.5 = very high load; RPE > 8.5 = very hard perceived effort
    const acwrScore = acwrToEffortScore(acwr);
    const rpeScore = rpeToEffortScore(recentAvgRPE);
    trainingEffort = Math.round(acwrScore * 0.6 + rpeScore * 0.4);
  } else if (acwr != null) {
    trainingEffort = acwrToEffortScore(acwr);
  } else if (recentAvgRPE != null) {
    trainingEffort = rpeToEffortScore(recentAvgRPE);
  } else {
    trainingEffort = 50; // Neutral default
  }

  // Balance ratio
  const ratio = trainingEffort > 0
    ? Math.round((recoveryCapacity / trainingEffort) * 100) / 100
    : 1.5; // No effort = surplus

  // Status
  const status = ratio >= 1.2 ? 'surplus'
    : ratio >= 0.85 ? 'balanced'
    : ratio >= 0.6 ? 'deficit'
    : 'critical_deficit';

  // Recommendation
  const recommendation = status === 'surplus'
    ? 'Recovery exceeds training load — you can push harder this week.'
    : status === 'balanced'
    ? 'Training and recovery are well matched — maintain current approach.'
    : status === 'deficit'
    ? 'Recovery is falling behind training load. Prioritize sleep and nutrition, or reduce session intensity.'
    : 'Critical recovery deficit. Consider a deload day or active recovery session before your next hard workout.';

  return { recoveryCapacity, trainingEffort, ratio, status, recommendation };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Streak bonus: reward consistency (diminishing returns). */
function applyStreakBonus(baseScore: number, streak: number): number {
  // Each day of streak adds diminishing bonus: +2, +1.8, +1.6, ...
  // Capped at +20 (reached at ~14 days)
  const bonus = Math.min(20, streak * 2 * Math.exp(-streak * 0.05));
  return baseScore + bonus;
}

/** Calculate recovery dimension using wearable data when available. */
function calculateRecoveryDimension(input: WellnessInput): number {
  const { wearableRecovery, hrvDeviationPct, rhrDelta } = input;

  // Wearable recovery is the gold standard
  if (wearableRecovery != null) {
    let score = wearableRecovery;

    // Modulate with HRV (Plews 2013: suppressed HRV = impaired recovery)
    if (hrvDeviationPct != null) {
      if (hrvDeviationPct < -15) score -= 10; // Suppressed HRV
      else if (hrvDeviationPct > 10) score += 5;  // Elevated HRV (good)
    }

    // Modulate with RHR (elevated RHR = sympathetic dominance)
    if (rhrDelta != null) {
      if (rhrDelta > 5) score -= 8;  // RHR 5+ bpm above baseline
      else if (rhrDelta > 10) score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  // No wearable: estimate from sleep + domain completion
  const sleepScore = input.sleepScore?.composite ?? 50;
  const domainCount = input.domainsCompleted.length;
  // More domains = better proxy for "taking care of yourself"
  return Math.round(sleepScore * 0.6 + Math.min(100, domainCount * 14) * 0.4);
}

/** ACWR to effort score (0-100). Gabbett 2016. */
function acwrToEffortScore(acwr: number): number {
  // ACWR 0.8-1.3 = sweet spot (moderate effort)
  // ACWR > 1.5 = high effort/injury risk zone
  // ACWR < 0.5 = detraining
  if (acwr <= 0.5) return 20;
  if (acwr <= 0.8) return 35;
  if (acwr <= 1.0) return 50;
  if (acwr <= 1.3) return 65;
  if (acwr <= 1.5) return 80;
  return Math.min(100, Math.round(80 + (acwr - 1.5) * 40));
}

/** Session RPE to effort score (0-100). */
function rpeToEffortScore(avgRPE: number): number {
  // RPE 5 = 25, RPE 7 = 50, RPE 8 = 65, RPE 9 = 80, RPE 10 = 100
  return Math.min(100, Math.max(0, Math.round((avgRPE - 3) * 14.3)));
}

/** Calculate trend from recent wellness days. */
function calculateTrend(
  recentDays: WellnessDay[],
): 'improving' | 'stable' | 'declining' | 'insufficient_data' {
  if (recentDays.length < 5) return 'insufficient_data';

  // Compare average domain count of first half vs second half
  const sorted = [...recentDays].sort((a, b) => a.date.localeCompare(b.date));
  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);

  const avgFirst = firstHalf.reduce((s, d) => s + d.domains.length, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((s, d) => s + d.domains.length, 0) / secondHalf.length;

  const diff = avgSecond - avgFirst;
  if (diff > 0.5) return 'improving';
  if (diff < -0.5) return 'declining';
  return 'stable';
}

/** Map composite wellness score to training XP multiplier. */
function scoreToMultiplier(score: number): number {
  // 0-100 → 1.0-1.35 (linear interpolation, capped)
  return Math.round((1.0 + Math.min(100, Math.max(0, score)) / 100 * 0.35) * 100) / 100;
}

/** Generate the single most impactful action. */
function generateTopAction(
  completedDomains: Set<WellnessDomain>,
  dimensions: Record<string, number>,
): string | null {
  // Find highest-weight uncompleted domain
  const domainToWeight: [WellnessDomain, number][] = [
    ['sleep', DIMENSION_WEIGHTS.sleep],
    ['nutrition', DIMENSION_WEIGHTS.nutrition],
    ['water', DIMENSION_WEIGHTS.hydration],
    ['mobility', DIMENSION_WEIGHTS.mobility],
    ['mental', DIMENSION_WEIGHTS.mental],
    ['breathing', DIMENSION_WEIGHTS.breathing],
    ['supplements', DIMENSION_WEIGHTS.supplements],
  ];

  for (const [domain, _weight] of domainToWeight.sort((a, b) => b[1] - a[1])) {
    if (!completedDomains.has(domain)) {
      switch (domain) {
        case 'sleep': return 'Log your sleep — it\'s the #1 factor in recovery.';
        case 'nutrition': return 'Log a meal — protein timing matters for adaptation.';
        case 'water': return 'Hit your water target — even 2% dehydration cuts output by 10%.';
        case 'mobility': return 'Do 10 min of mobility — it prevents injury and improves ROM.';
        case 'mental': return 'Quick mental check-in — awareness improves RPE accuracy.';
        case 'breathing': return '5 min of breathing work — it activates parasympathetic recovery.';
        case 'supplements': return 'Log your supplements — consistency is key for creatine and vitamin D.';
      }
    }
  }

  // All domains completed — check for weakest dimension
  const weakest = Object.entries(dimensions).sort((a, b) => a[1] - b[1])[0];
  if (weakest && weakest[1] < 70) {
    return `Your ${weakest[0]} score is ${weakest[1]}/100 — focus here for the biggest improvement.`;
  }

  return null; // Everything is good
}
