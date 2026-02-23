/**
 * Sleep Quality Score Engine
 *
 * Computes a composite sleep quality score (0-100) from three evidence-based
 * dimensions: duration, consistency, and efficiency.
 *
 * Science:
 * - Walker 2017: 7-9h optimal for adults; <6h impairs strength by 10-30%
 * - Lunsford-Avery et al. 2018: Sleep regularity index (SRI) predicts
 *   cardiometabolic health independent of duration
 * - Fullagar et al. 2015: Sleep quality is the #1 modifiable recovery factor
 *   for athletic performance
 * - Vitale et al. 2019: Circadian alignment affects power output by up to 10%
 *
 * All functions are pure — no side effects, no store, no React.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SleepEntry {
  date: string;           // ISO date
  hoursSlept: number;     // Total hours (e.g. 7.5)
  bedTime?: string;       // HH:MM (24h format)
  wakeTime?: string;      // HH:MM (24h format)
  /** Wearable-provided efficiency (0-100). Null if no wearable. */
  efficiency?: number;
  /** Wearable-provided sleep score (0-100). Null if no wearable. */
  wearableScore?: number;
}

export interface SleepQualityScore {
  /** Composite score (0-100). */
  composite: number;
  /** Duration sub-score (0-100). */
  duration: number;
  /** Consistency sub-score (0-100). Based on regularity of bed/wake times. */
  consistency: number;
  /** Efficiency sub-score (0-100). From wearable or estimated. */
  efficiency: number;
  /** Human-readable status. */
  status: 'optimal' | 'good' | 'fair' | 'poor' | 'critical';
  /** Actionable recommendation based on weakest dimension. */
  recommendation: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Weights for composite score. Duration dominates per Walker 2017. */
const WEIGHTS = {
  duration: 0.45,
  consistency: 0.30,
  efficiency: 0.25,
} as const;

// ─── Duration Score ──────────────────────────────────────────────────────────

/**
 * Score sleep duration using a double-sigmoid.
 * - 7-9h = 100 (optimal zone per Walker 2017)
 * - <6h = steep penalty (strength impairment threshold)
 * - >10h = mild penalty (potential sleep disorder marker)
 */
export function scoreDuration(hours: number): number {
  if (hours >= 7 && hours <= 9) return 100;

  if (hours < 7) {
    // Steep sigmoid below 7h — 6h = ~70, 5h = ~35, 4h = ~10
    const deficit = 7 - hours;
    return Math.max(0, Math.round(100 * Math.exp(-0.5 * deficit * deficit)));
  }

  // >9h: mild penalty — sleep >10h may indicate poor quality or health issues
  const excess = hours - 9;
  return Math.max(40, Math.round(100 - excess * 15));
}

// ─── Consistency Score ───────────────────────────────────────────────────────

/**
 * Score sleep timing consistency using the Sleep Regularity Index (SRI).
 *
 * Lunsford-Avery et al. 2018: Irregular sleep-wake timing is associated with
 * metabolic abnormalities independent of sleep duration and quality.
 *
 * We compute: 100 - mean absolute deviation of bed/wake times over the window.
 * Perfect consistency = 100. Each minute of average deviation costs points.
 */
export function scoreConsistency(entries: SleepEntry[]): number {
  // Need at least 3 days to measure consistency
  if (entries.length < 3) return 75; // Neutral default

  // Use bed times and wake times
  const bedMinutes: number[] = [];
  const wakeMinutes: number[] = [];

  for (const entry of entries) {
    if (entry.bedTime) {
      bedMinutes.push(timeToMinutes(entry.bedTime));
    }
    if (entry.wakeTime) {
      wakeMinutes.push(timeToMinutes(entry.wakeTime));
    }
  }

  // If no timing data, fall back to duration consistency
  if (bedMinutes.length < 3 && wakeMinutes.length < 3) {
    return scoreDurationConsistency(entries);
  }

  let totalDeviation = 0;
  let count = 0;

  if (bedMinutes.length >= 3) {
    totalDeviation += meanAbsoluteDeviation(bedMinutes);
    count++;
  }

  if (wakeMinutes.length >= 3) {
    totalDeviation += meanAbsoluteDeviation(wakeMinutes);
    count++;
  }

  const avgDeviation = count > 0 ? totalDeviation / count : 0;

  // 0 min deviation = 100, 30 min = ~85, 60 min = ~65, 90 min = ~45, 120+ min = ~25
  return Math.max(0, Math.min(100, Math.round(100 - avgDeviation * 0.55)));
}

// ─── Efficiency Score ────────────────────────────────────────────────────────

/**
 * Score sleep efficiency.
 * If wearable provides efficiency: use directly (0-100 scale).
 * Otherwise: estimate from hours + consistency (a rough proxy).
 *
 * Normal sleep efficiency is 85-95% (AASM standard).
 */
export function scoreEfficiency(
  entry: SleepEntry,
  consistencyScore: number,
): number {
  // Use wearable data if available (most accurate)
  if (entry.efficiency != null) {
    return Math.min(100, Math.max(0, entry.efficiency));
  }

  if (entry.wearableScore != null) {
    return Math.min(100, Math.max(0, entry.wearableScore));
  }

  // Estimate: duration quality × consistency proxy
  // People with consistent schedules have higher efficiency (Lunsford-Avery 2018)
  const durationScore = scoreDuration(entry.hoursSlept);
  return Math.round(durationScore * 0.6 + consistencyScore * 0.4);
}

// ─── Composite Score ─────────────────────────────────────────────────────────

/**
 * Compute the full sleep quality score from recent sleep data.
 *
 * @param entries - Last 7-14 days of sleep data (most recent first)
 * @returns SleepQualityScore with composite and sub-scores
 */
export function calculateSleepQualityScore(entries: SleepEntry[]): SleepQualityScore {
  if (entries.length === 0) {
    return {
      composite: 50,
      duration: 50,
      consistency: 50,
      efficiency: 50,
      status: 'fair',
      recommendation: 'Start logging sleep to unlock personalized insights.',
    };
  }

  // Use up to 14 days for consistency, most recent entry for duration/efficiency
  const recent = entries.slice(0, 14);
  const latest = entries[0];

  // Sub-scores
  const durationScore = scoreDuration(latest.hoursSlept);
  const consistencyScoreVal = scoreConsistency(recent);
  const efficiencyScore = scoreEfficiency(latest, consistencyScoreVal);

  // Weighted composite
  const composite = Math.round(
    durationScore * WEIGHTS.duration +
    consistencyScoreVal * WEIGHTS.consistency +
    efficiencyScore * WEIGHTS.efficiency
  );

  // Status thresholds
  const status = composite >= 85 ? 'optimal'
    : composite >= 70 ? 'good'
    : composite >= 50 ? 'fair'
    : composite >= 30 ? 'poor'
    : 'critical';

  // Recommendation based on weakest dimension
  const recommendation = generateRecommendation(durationScore, consistencyScoreVal, efficiencyScore);

  return {
    composite,
    duration: durationScore,
    consistency: consistencyScoreVal,
    efficiency: efficiencyScore,
    status,
    recommendation,
  };
}

// ─── Recovery Impact Estimate ────────────────────────────────────────────────

/**
 * Estimate how sleep quality affects next-day recovery capacity.
 *
 * Returns a multiplier (0.5 - 1.2) applied to recovery projections.
 * Based on: Fullagar et al. 2015, Vitale et al. 2019.
 *
 * - Sleep score ≥ 85: 1.1-1.2 (supercompensatory sleep)
 * - Sleep score 70-84: 1.0 (baseline)
 * - Sleep score 50-69: 0.85 (impaired recovery)
 * - Sleep score < 50: 0.6-0.75 (significantly impaired)
 */
export function sleepRecoveryMultiplier(sleepScore: number): number {
  if (sleepScore >= 90) return 1.15;
  if (sleepScore >= 85) return 1.10;
  if (sleepScore >= 70) return 1.0;
  if (sleepScore >= 50) return 0.85;
  if (sleepScore >= 30) return 0.70;
  return 0.55;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert "HH:MM" to minutes since midnight, handling overnight. */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  const mins = h * 60 + m;
  // Bedtimes after midnight (00:00-04:00) are "late night" — normalize to >1440
  if (mins < 240) return mins + 1440;
  return mins;
}

/** Mean absolute deviation (robust to outliers). */
function meanAbsoluteDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return values.reduce((s, v) => s + Math.abs(v - mean), 0) / values.length;
}

/** Fall-back consistency: just check if sleep hours are regular. */
function scoreDurationConsistency(entries: SleepEntry[]): number {
  if (entries.length < 3) return 75;
  const hours = entries.map(e => e.hoursSlept);
  const mad = meanAbsoluteDeviation(hours);
  // 0h deviation = 100, 1h = ~70, 2h = ~40
  return Math.max(0, Math.min(100, Math.round(100 - mad * 30)));
}

function generateRecommendation(
  duration: number,
  consistency: number,
  efficiency: number,
): string | null {
  // Find weakest dimension
  const min = Math.min(duration, consistency, efficiency);

  if (min >= 80) return null; // All good

  if (min === duration) {
    if (duration < 40) {
      return 'Sleep duration is critically low. Aim for 7-9 hours — even 30 extra minutes improves recovery significantly (Walker 2017).';
    }
    return 'Try to get closer to 7-9 hours. Each additional hour below 7 reduces strength output by ~10%.';
  }

  if (min === consistency) {
    if (consistency < 40) {
      return 'Sleep timing is very irregular. Set a fixed bedtime — consistency matters as much as duration for recovery (Lunsford-Avery 2018).';
    }
    return 'Keep bed and wake times within 30 minutes of your target. Regularity improves deep sleep quality.';
  }

  if (efficiency < 40) {
    return 'Sleep efficiency is low — you may be spending too long in bed awake. Avoid screens 1h before bed and keep the room cool (18-20°C).';
  }
  return 'Sleep efficiency could improve. Limit caffeine after 2 PM and create a consistent wind-down routine.';
}
