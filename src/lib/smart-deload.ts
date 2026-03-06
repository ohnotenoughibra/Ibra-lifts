/**
 * Smart Deloads & Fatigue Debt Engine — Sprint 7
 *
 * Replaces the crude shouldDeload() heuristic in auto-adjust.ts with a
 * multi-signal fatigue model that tracks accumulated training debt over time,
 * recommends context-appropriate deload protocols, and predicts
 * supercompensation windows post-deload.
 *
 * All pure functions — no React, no store, no side effects.
 *
 * Science references:
 * - Halson 2014: Overtraining syndrome markers and detection
 * - Meeusen et al. 2013: ECSS position statement on overtraining
 * - Pritchard et al. 2015: Tapering and supercompensation models
 * - Zourdos et al. 2016: RPE-based autoregulation in resistance training
 * - Banister 1991: Fitness-fatigue model for training load management
 */

import type {
  WorkoutLog,
  WearableData,
  TrainingSession,
  Mesocycle,
} from './types';
import type { ExercisePerformanceProfile } from './performance-model';

// ─── Exported Interfaces ────────────────────────────────────────────────────

export interface FatigueDebt {
  /** Overall fatigue on a 0-100 scale (higher = more accumulated fatigue) */
  currentDebt: number;
  /** Direction of fatigue over recent weeks */
  debtTrend: 'accumulating' | 'stable' | 'recovering';
  /** Per-week fatigue scores for the last 6 weeks */
  weeklyFatigueScores: { week: number; score: number }[];
  /** Estimated rest days needed to clear current debt */
  estimatedRecoveryDays: number;
  /** Primary factors driving fatigue */
  primaryContributors: string[];
}

export interface DeloadProtocol {
  /** Type of deload strategy */
  type: 'volume' | 'intensity' | 'frequency' | 'active_recovery' | 'full_rest';
  /** Human-readable protocol name */
  name: string;
  /** Description of the protocol */
  description: string;
  /** Duration in days */
  durationDays: number;
  /** Volume multiplier (e.g., 0.5 = 50% of normal volume) */
  volumeMultiplier: number;
  /** Intensity multiplier (e.g., 0.85 = 85% of normal intensity) */
  intensityMultiplier: number;
  /** Actionable recommendations for the user */
  recommendations: string[];
}

export interface DeloadRecommendation {
  /** Whether a deload is needed */
  needed: boolean;
  /** How urgently the deload is needed */
  urgency: 'optional' | 'recommended' | 'critical';
  /** Human-readable reason for the recommendation */
  reason: string;
  /** The selected deload protocol */
  protocol: DeloadProtocol;
  /** When the deload should happen */
  timing: 'now' | 'next_week' | 'end_of_block';
  /** Full fatigue debt analysis */
  fatigueDebt: FatigueDebt;
}

export interface PostDeloadPrediction {
  /** Expected strength rebound as percentage (e.g., 2-5% above pre-deload) */
  expectedStrengthBounce: number;
  /** Days after deload start when peak performance is expected */
  estimatedPeakDay: number;
  /** Confidence in the prediction */
  confidence: 'high' | 'medium' | 'low';
}

export interface FatigueInsight {
  /** One-line summary headline */
  headline: string;
  /** Detailed supporting observations */
  details: string[];
  /** Concrete next steps for the user */
  actionItems: string[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_WEEKS_FOR_ANALYSIS = 3;

// Fatigue component weights (Banister fitness-fatigue model adapted)
const FATIGUE_WEIGHTS = {
  trainingVolume: 0.40,
  rpeTrend: 0.25,
  recoveryScores: 0.20,
  sleepQuality: 0.15,
};

// ─── Deload Protocol Definitions ────────────────────────────────────────────

const DELOAD_PROTOCOLS: DeloadProtocol[] = [
  {
    type: 'volume',
    name: 'Volume Deload',
    description:
      'Reduce total sets by 40-50% while maintaining working weights. ' +
      'Best when fatigue is driven by accumulated training volume rather than heavy loads.',
    durationDays: 7,
    volumeMultiplier: 0.55,
    intensityMultiplier: 1.0,
    recommendations: [
      'Keep working weights the same — drop 2-3 sets per exercise',
      'Maintain compound lift technique with fewer total reps',
      'Focus on quality contractions over quantity',
      'Use the extra recovery time for mobility work',
    ],
  },
  {
    type: 'intensity',
    name: 'Intensity Deload',
    description:
      'Reduce working weights by 15-20% while keeping set counts similar. ' +
      'Best when joints are beat up or RPE has been chronically high.',
    durationDays: 7,
    volumeMultiplier: 0.90,
    intensityMultiplier: 0.82,
    recommendations: [
      'Drop working weights by 15-20% across all exercises',
      'Keep the same number of sets — focus on form and mind-muscle connection',
      'RPE should stay at 5-6 (several reps in reserve)',
      'Great time to work on weak points with lighter loads',
    ],
  },
  {
    type: 'frequency',
    name: 'Frequency Deload',
    description:
      'Reduce training days by 1-2 while keeping per-session work similar. ' +
      'Best when overall life stress is high and you need more full rest days.',
    durationDays: 7,
    volumeMultiplier: 0.75,
    intensityMultiplier: 0.95,
    recommendations: [
      'Remove 1-2 training days this week',
      'Keep remaining sessions at normal intensity',
      'Use extra rest days for sleep, nutrition, and active recovery',
      'Walk, stretch, or do light yoga on off days',
    ],
  },
  {
    type: 'active_recovery',
    name: 'Active Recovery Week',
    description:
      'Replace heavy training with light movement, mobility, and restorative work. ' +
      'Best for general burnout, high life stress, or accumulated non-gym fatigue.',
    durationDays: 5,
    volumeMultiplier: 0.30,
    intensityMultiplier: 0.60,
    recommendations: [
      'Replace lifting with 20-30min low-intensity movement (walking, swimming, yoga)',
      'Focus on mobility and foam rolling for problem areas',
      'Prioritize 8+ hours of sleep every night',
      'Eat at maintenance calories with high protein (2g/kg)',
      'Limit caffeine to morning only to improve sleep quality',
    ],
  },
  {
    type: 'full_rest',
    name: 'Complete Rest',
    description:
      'Take 2-4 days completely off from structured training. ' +
      'Reserved for critical exhaustion, illness, or when all signals point to overtraining.',
    durationDays: 3,
    volumeMultiplier: 0.0,
    intensityMultiplier: 0.0,
    recommendations: [
      'No structured training for 2-4 days',
      'Light walks and gentle stretching only',
      'Sleep 8-10 hours per night',
      'Eat at maintenance or slight surplus — your body is rebuilding',
      'Stay hydrated (3+ liters per day)',
      'Resume with a light session and reassess readiness',
    ],
  },
];

// ─── Internal Helpers ───────────────────────────────────────────────────────

/**
 * Group workout logs into calendar weeks and return them sorted oldest first.
 * Week boundaries are Monday-Sunday aligned.
 */
function groupLogsByWeek(logs: WorkoutLog[]): Map<number, WorkoutLog[]> {
  const weekMap = new Map<number, WorkoutLog[]>();

  logs.forEach(log => {
    const date = new Date(log.date);
    // Align to Monday: getDay() returns 0=Sun, so shift
    const day = date.getDay();
    const mondayOffset = day === 0 ? 6 : day - 1;
    const monday = new Date(date);
    monday.setDate(date.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const weekKey = monday.getTime();

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, []);
    }
    weekMap.get(weekKey)!.push(log);
  });

  return weekMap;
}

/**
 * Calculate a single week's training volume score (0-100).
 * Based on total volume load, set count, and session count.
 */
function weeklyVolumeScore(weekLogs: WorkoutLog[]): number {
  if (weekLogs.length === 0) return 0;

  let totalSets = 0;
  let totalVolume = 0;

  weekLogs.forEach(log => {
    totalVolume += log.totalVolume || 0;
    log.exercises.forEach(ex => {
      totalSets += ex.sets.filter(s => s.completed).length;
    });
  });

  // Normalize: sessions (0-7 → 0-30pts), sets (0-100 → 0-40pts), volume relative (0-30pts)
  const sessionScore = Math.min(30, weekLogs.length * 5);
  const setScore = Math.min(40, totalSets * 0.6);
  // Volume is relative — normalize by a typical set volume
  // Use 1000 as baseline (≈ 50kg × 10 reps or ≈ 100lbs × 10 reps) to reduce unit bias
  const avgVolumePerSet = totalSets > 0 ? totalVolume / totalSets : 0;
  const volumeScore = Math.min(30, (avgVolumePerSet / 1000) * 30);

  return Math.min(100, Math.round(sessionScore + setScore + volumeScore));
}

/**
 * Calculate average RPE for a week of workout logs.
 */
function weeklyAvgRPE(weekLogs: WorkoutLog[]): number {
  if (weekLogs.length === 0) return 0;

  let totalRPE = 0;
  let count = 0;

  weekLogs.forEach(log => {
    let logSetCount = 0;
    // Use per-set RPE when available for accuracy
    log.exercises.forEach(ex => {
      ex.sets.forEach(set => {
        if (set.completed && set.rpe > 0) {
          totalRPE += set.rpe;
          count++;
          logSetCount++;
        }
      });
    });
    // Fallback to overall RPE if no per-set data for this log
    if (logSetCount === 0 && log.overallRPE > 0) {
      totalRPE += log.overallRPE;
      count++;
    }
  });

  return count > 0 ? totalRPE / count : 0;
}

/**
 * Calculate average recovery score from wearable data for a given time range.
 */
function avgRecoveryInRange(
  wearableHistory: WearableData[],
  startMs: number,
  endMs: number,
): number | null {
  const inRange = wearableHistory.filter(w => {
    const t = new Date(w.date).getTime();
    return t >= startMs && t <= endMs && w.recoveryScore != null;
  });

  if (inRange.length === 0) return null;
  return inRange.reduce((sum, w) => sum + (w.recoveryScore ?? 0), 0) / inRange.length;
}

/**
 * Calculate average sleep score from wearable data for a given time range.
 */
function avgSleepInRange(
  wearableHistory: WearableData[],
  startMs: number,
  endMs: number,
): number | null {
  const inRange = wearableHistory.filter(w => {
    const t = new Date(w.date).getTime();
    return t >= startMs && t <= endMs;
  });

  // Use sleepScore if available, fallback to hours-based scoring
  const withSleep = inRange.filter(w => w.sleepScore != null || w.sleepHours != null);
  if (withSleep.length === 0) return null;

  let total = 0;
  withSleep.forEach(w => {
    if (w.sleepScore != null) {
      total += w.sleepScore;
    } else if (w.sleepHours != null) {
      // Sigmoid sleep scoring: steep penalty below 6h, diminishing returns above 8h
      total += Math.min(100, Math.max(0, Math.round(100 / (1 + Math.exp(-1.5 * (w.sleepHours - 6.5))))));
    }
  });

  return total / withSleep.length;
}

/**
 * Count the number of distinct weeks with training data.
 */
function countTrainingWeeks(logs: WorkoutLog[]): number {
  const weeks = new Set<string>();
  logs.forEach(log => {
    const date = new Date(log.date);
    const day = date.getDay();
    const mondayOffset = day === 0 ? 6 : day - 1;
    const monday = new Date(date);
    monday.setDate(date.getDate() - mondayOffset);
    weeks.add(monday.toISOString().split('T')[0]);
  });
  return weeks.size;
}

/**
 * Count consecutive weeks of progressive overload (no deload) from the most recent week backwards.
 */
function countConsecutiveOverloadWeeks(weeklyScores: { week: number; score: number }[]): number {
  if (weeklyScores.length < 2) return weeklyScores.length;

  const maxScore = Math.max(...weeklyScores.map(w => w.score));
  let count = 0;
  // Count backwards from most recent week — a "deload" week would show <50% of peak
  for (let i = weeklyScores.length - 1; i >= 0; i--) {
    if (weeklyScores[i].score >= maxScore * 0.50) {
      count++;
    } else {
      break;
    }
  }

  return Math.max(count, 1); // at least 1 if any data exists
}

/**
 * Determine what type of fatigue is dominant.
 */
function classifyFatigueType(
  volumeComponent: number,
  rpeComponent: number,
  recoveryComponent: number,
  sleepComponent: number,
): 'volume' | 'intensity' | 'recovery' | 'sleep' | 'general' {
  const components = [
    { type: 'volume' as const, value: volumeComponent },
    { type: 'intensity' as const, value: rpeComponent },
    { type: 'recovery' as const, value: recoveryComponent },
    { type: 'sleep' as const, value: sleepComponent },
  ];

  components.sort((a, b) => b.value - a.value);

  // If the top contributor is significantly higher than average, it's dominant
  const avg = (volumeComponent + rpeComponent + recoveryComponent + sleepComponent) / 4;
  if (components[0].value > avg * 1.4) {
    return components[0].type;
  }

  return 'general';
}

// ─── Exported Functions ─────────────────────────────────────────────────────

/**
 * Calculate the current fatigue debt from training history and wearable data.
 *
 * Uses a weighted model combining training volume trends, RPE patterns,
 * recovery scores, and sleep quality to produce a holistic fatigue metric.
 *
 * Returns a FatigueDebt with insufficient-data defaults when < 3 weeks
 * of training logs are available.
 */
export function calculateFatigueDebt(
  workoutLogs: WorkoutLog[],
  wearableHistory: WearableData[],
  trainingSessions?: TrainingSession[],
): FatigueDebt {
  const emptyDebt: FatigueDebt = {
    currentDebt: 0,
    debtTrend: 'stable',
    weeklyFatigueScores: [],
    estimatedRecoveryDays: 0,
    primaryContributors: [],
  };

  if (!workoutLogs || workoutLogs.length === 0) return emptyDebt;

  // Gate: need at least 3 weeks of training history
  const trainingWeeks = countTrainingWeeks(workoutLogs);
  if (trainingWeeks < MIN_WEEKS_FOR_ANALYSIS) {
    return {
      ...emptyDebt,
      primaryContributors: ['Insufficient training history — need 3+ weeks for fatigue analysis'],
    };
  }

  // Sort logs chronologically
  const sorted = [...workoutLogs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // Group by week
  const weekMap = groupLogsByWeek(sorted);
  const weekKeys = Array.from(weekMap.keys()).sort((a, b) => a - b);

  // Analyze last 6 weeks (or all available if fewer)
  const analysisWeeks = weekKeys.slice(-6);
  const weeklyFatigueScores: { week: number; score: number }[] = [];

  // Track individual fatigue components for contributor analysis
  let totalVolumeComponent = 0;
  let totalRPEComponent = 0;
  let totalRecoveryComponent = 0;
  let totalSleepComponent = 0;
  let componentCount = 0;

  analysisWeeks.forEach((weekKey, idx) => {
    const weekLogs = weekMap.get(weekKey) || [];
    const weekEnd = weekKey + WEEK_MS;

    // 1. Training volume component (0-100)
    const volScore = weeklyVolumeScore(weekLogs);

    // 2. RPE trend component (0-100): higher RPE = exponentially more fatigue
    // RPE 8 vs 9 is a much bigger fatigue difference than RPE 6 vs 7
    const avgRPE = weeklyAvgRPE(weekLogs);
    // Exponential mapping: RPE 5→0, 7→16, 8→36, 9→64, 10→100
    const normalizedRPE = Math.max(0, (avgRPE - 5) / 5); // 0-1 range
    const rpeScore = Math.min(100, Math.max(0, Math.round(Math.pow(normalizedRPE, 2) * 100)));

    // 3. Recovery score component (0-100): lower recovery = more fatigue
    const avgRecovery = avgRecoveryInRange(wearableHistory, weekKey, weekEnd);
    // Invert: 100% recovery = 0 fatigue, 0% recovery = 100 fatigue
    const recoveryFatigue = avgRecovery != null ? (100 - avgRecovery) : 50;

    // 4. Sleep quality component (0-100): lower sleep = more fatigue
    const avgSleep = avgSleepInRange(wearableHistory, weekKey, weekEnd);
    const sleepFatigue = avgSleep != null ? (100 - avgSleep) : 50;

    // Weighted fatigue for this week
    const weekFatigue = Math.round(
      volScore * FATIGUE_WEIGHTS.trainingVolume +
      rpeScore * FATIGUE_WEIGHTS.rpeTrend +
      recoveryFatigue * FATIGUE_WEIGHTS.recoveryScores +
      sleepFatigue * FATIGUE_WEIGHTS.sleepQuality,
    );

    // Account for non-gym stressors (training sessions like combat sports)
    let extraStressorBonus = 0;
    if (trainingSessions && trainingSessions.length > 0) {
      const weekTrainingSessions = trainingSessions.filter(s => {
        const t = new Date(s.date).getTime();
        return t >= weekKey && t < weekEnd;
      });
      // Each hard training session outside lifting adds 3-5 points of fatigue
      weekTrainingSessions.forEach(s => {
        const intensity = s.actualIntensity || s.plannedIntensity;
        if (intensity === 'hard_sparring' || intensity === 'competition_prep') {
          extraStressorBonus += 5;
        } else if (intensity === 'moderate') {
          extraStressorBonus += 3;
        } else {
          extraStressorBonus += 1;
        }
      });
    }

    const adjustedFatigue = Math.min(100, weekFatigue + extraStressorBonus);

    weeklyFatigueScores.push({ week: idx + 1, score: adjustedFatigue });

    totalVolumeComponent += volScore;
    totalRPEComponent += rpeScore;
    totalRecoveryComponent += recoveryFatigue;
    totalSleepComponent += sleepFatigue;
    componentCount++;
  });

  // Current debt: weighted recent-emphasis average (more recent weeks count more)
  let weightedSum = 0;
  let weightTotal = 0;
  weeklyFatigueScores.forEach((ws, idx) => {
    // Exponential recency weighting: most recent week = highest weight
    const weight = Math.pow(1.5, idx);
    weightedSum += ws.score * weight;
    weightTotal += weight;
  });
  const currentDebt = Math.round(Math.min(100, weightTotal > 0 ? weightedSum / weightTotal : 0));

  // Debt trend: compare first half vs second half of analyzed weeks
  let debtTrend: FatigueDebt['debtTrend'] = 'stable';
  if (weeklyFatigueScores.length >= 3) {
    const mid = Math.floor(weeklyFatigueScores.length / 2);
    const firstHalf = weeklyFatigueScores.slice(0, mid);
    const secondHalf = weeklyFatigueScores.slice(mid);

    const avgFirst = firstHalf.reduce((s, w) => s + w.score, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, w) => s + w.score, 0) / secondHalf.length;

    const delta = avgSecond - avgFirst;
    if (delta > 5) debtTrend = 'accumulating';
    else if (delta < -5) debtTrend = 'recovering';
    else debtTrend = 'stable';
  }

  // Estimated recovery days: based on debt level
  // Low debt (0-30): 0-1 day, moderate (30-50): 1-2 days, high (50-70): 2-3 days,
  // very high (70-85): 3-5 days, critical (85+): 5-7 days
  let estimatedRecoveryDays: number;
  if (currentDebt < 30) estimatedRecoveryDays = 0;
  else if (currentDebt < 50) estimatedRecoveryDays = 2;
  else if (currentDebt < 70) estimatedRecoveryDays = 3;
  else if (currentDebt < 85) estimatedRecoveryDays = 5;
  else estimatedRecoveryDays = 7;

  // Primary contributors: identify what's driving fatigue
  const primaryContributors: string[] = [];
  if (componentCount > 0) {
    const avgVolume = totalVolumeComponent / componentCount;
    const avgRPE = totalRPEComponent / componentCount;
    const avgRecovery = totalRecoveryComponent / componentCount;
    const avgSleep = totalSleepComponent / componentCount;

    const threshold = 45; // above this = noteworthy contributor

    if (avgVolume > threshold) {
      primaryContributors.push('High training volume');
    }
    if (avgRPE > threshold) {
      primaryContributors.push('Chronically high RPE (training intensity)');
    }
    if (avgRecovery > threshold) {
      primaryContributors.push('Poor wearable recovery scores');
    }
    if (avgSleep > threshold) {
      primaryContributors.push('Insufficient sleep quality');
    }

    // Check for non-gym stressors
    if (trainingSessions && trainingSessions.length > 0) {
      const recentSessions = trainingSessions.filter(s => {
        const t = new Date(s.date).getTime();
        return t >= Date.now() - 2 * WEEK_MS;
      });
      const hardSessions = recentSessions.filter(s => {
        const i = s.actualIntensity || s.plannedIntensity;
        return i === 'hard_sparring' || i === 'competition_prep';
      });
      if (hardSessions.length >= 3) {
        primaryContributors.push('High non-gym training load (combat/cardio)');
      }
    }

    if (primaryContributors.length === 0 && currentDebt > 40) {
      primaryContributors.push('General accumulated training stress');
    }
  }

  return {
    currentDebt,
    debtTrend,
    weeklyFatigueScores,
    estimatedRecoveryDays,
    primaryContributors,
  };
}

/**
 * Get a smart deload recommendation based on fatigue debt, performance trends,
 * readiness data, and mesocycle context.
 *
 * This is the main decision function that determines IF, WHEN, and HOW
 * the user should deload. Returns a full recommendation with protocol
 * selection tailored to the dominant fatigue type.
 */
export function getSmartDeloadRecommendation(
  workoutLogs: WorkoutLog[],
  wearableHistory: WearableData[],
  performanceProfiles?: ExercisePerformanceProfile[],
  currentMesocycle?: Mesocycle,
  trainingSessions?: TrainingSession[],
): DeloadRecommendation {
  const fatigueDebt = calculateFatigueDebt(workoutLogs, wearableHistory, trainingSessions);

  // Default "no deload needed" response
  const noDeload: DeloadRecommendation = {
    needed: false,
    urgency: 'optional',
    reason: 'Fatigue levels are manageable — keep training.',
    protocol: DELOAD_PROTOCOLS[0], // volume deload as default
    timing: 'end_of_block',
    fatigueDebt,
  };

  // Gate: insufficient training history
  const trainingWeeks = countTrainingWeeks(workoutLogs);
  if (trainingWeeks < MIN_WEEKS_FOR_ANALYSIS) {
    return {
      ...noDeload,
      reason: 'Not enough training history yet (need 3+ weeks) — keep building your base.',
    };
  }

  // ─── Evaluate Deload Triggers ─────────────────────────────────────────

  const triggers: { met: boolean; urgency: 'optional' | 'recommended' | 'critical'; reason: string }[] = [];

  // Trigger 1: Fatigue debt > 70 for 2+ consecutive weeks
  const recentWeeks = fatigueDebt.weeklyFatigueScores.slice(-3);
  const consecutiveHighDebt = recentWeeks.filter(w => w.score > 70).length;
  triggers.push({
    met: consecutiveHighDebt >= 2,
    urgency: consecutiveHighDebt >= 3 ? 'critical' : 'recommended',
    reason: `Fatigue debt has been above 70 for ${consecutiveHighDebt} of the last 3 weeks`,
  });

  // Trigger 2: 3+ exercises showing declining 1RM trend
  if (performanceProfiles && performanceProfiles.length > 0) {
    const decliningCount = performanceProfiles.filter(
      p => p.estimated1RM.trend === 'declining' && p.dataPoints >= 3,
    ).length;
    triggers.push({
      met: decliningCount >= 3,
      urgency: decliningCount >= 5 ? 'critical' : 'recommended',
      reason: `${decliningCount} exercises showing declining strength trends — performance is deteriorating`,
    });
  }

  // Trigger 3: Average RPE > 9.0 for last 2 weeks with no PR
  const twoWeeksAgo = Date.now() - 2 * WEEK_MS;
  const recentLogs = workoutLogs.filter(l => new Date(l.date).getTime() >= twoWeeksAgo);
  if (recentLogs.length >= 3) {
    const recentRPEs: number[] = [];
    recentLogs.forEach(log => {
      log.exercises.forEach(ex => {
        ex.sets.forEach(set => {
          if (set.completed && set.rpe > 0) recentRPEs.push(set.rpe);
        });
      });
      // Fallback to overall RPE
      if (recentRPEs.length === 0 && log.overallRPE > 0) {
        recentRPEs.push(log.overallRPE);
      }
    });

    const avgRecentRPE = recentRPEs.length > 0
      ? recentRPEs.reduce((s, r) => s + r, 0) / recentRPEs.length
      : 0;

    const recentPRs = recentLogs.reduce((count, log) => {
      return count + log.exercises.filter(e => e.personalRecord).length;
    }, 0);

    triggers.push({
      met: avgRecentRPE > 9.0 && recentPRs === 0,
      urgency: 'recommended',
      reason: `Average RPE is ${avgRecentRPE.toFixed(1)} over the last 2 weeks with no PRs — maximal effort without progress`,
    });
  }

  // Trigger 4: Recovery scores consistently < 40% for 5+ days
  if (wearableHistory.length > 0) {
    const fiveDaysAgo = Date.now() - 5 * DAY_MS;
    const recentWearable = wearableHistory.filter(w => {
      return new Date(w.date).getTime() >= fiveDaysAgo && w.recoveryScore != null;
    });
    const lowRecoveryDays = recentWearable.filter(w => (w.recoveryScore ?? 100) < 40).length;

    triggers.push({
      met: lowRecoveryDays >= 5,
      urgency: 'critical',
      reason: `Recovery score has been below 40% for ${lowRecoveryDays} of the last 5 days — your body is struggling to recover`,
    });
  }

  // Trigger 5: 4+ weeks of progressive overload without a deload
  const overloadWeeks = countConsecutiveOverloadWeeks(fatigueDebt.weeklyFatigueScores);
  triggers.push({
    met: overloadWeeks >= 4,
    urgency: overloadWeeks >= 6 ? 'recommended' : 'optional',
    reason: `${overloadWeeks} consecutive weeks of progressive overload without a deload — accumulated fatigue risk`,
  });

  // ─── Determine if deload is needed ────────────────────────────────────

  const metTriggers = triggers.filter(t => t.met);

  if (metTriggers.length === 0) {
    return noDeload;
  }

  // Select highest urgency from met triggers
  const urgencyOrder: Record<string, number> = { optional: 0, recommended: 1, critical: 2 };
  metTriggers.sort((a, b) => urgencyOrder[b.urgency] - urgencyOrder[a.urgency]);
  const highestUrgency = metTriggers[0].urgency;
  const primaryReason = metTriggers[0].reason;

  // ─── Select protocol based on dominant fatigue type ───────────────────

  // Analyze fatigue components from the weekly scores
  const weekMap = groupLogsByWeek(
    [...workoutLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
  );
  const weekKeys = Array.from(weekMap.keys()).sort((a, b) => a - b);
  const recentWeekKeys = weekKeys.slice(-4);

  let avgVolFatigue = 0;
  let avgRPEFatigue = 0;
  let avgRecFatigue = 50;
  let avgSleepFatigue = 50;
  let weekCount = 0;

  recentWeekKeys.forEach(weekKey => {
    const weekLogs = weekMap.get(weekKey) || [];
    const weekEnd = weekKey + WEEK_MS;

    avgVolFatigue += weeklyVolumeScore(weekLogs);
    const rpe = weeklyAvgRPE(weekLogs);
    avgRPEFatigue += Math.min(100, Math.max(0, (rpe - 5) * 20));

    const rec = avgRecoveryInRange(wearableHistory, weekKey, weekEnd);
    avgRecFatigue += rec != null ? (100 - rec) : 50;

    const sleep = avgSleepInRange(wearableHistory, weekKey, weekEnd);
    avgSleepFatigue += sleep != null ? (100 - sleep) : 50;

    weekCount++;
  });

  if (weekCount > 0) {
    avgVolFatigue /= weekCount;
    avgRPEFatigue /= weekCount;
    avgRecFatigue /= weekCount;
    avgSleepFatigue /= weekCount;
  }

  const fatigueType = classifyFatigueType(avgVolFatigue, avgRPEFatigue, avgRecFatigue, avgSleepFatigue);

  let selectedProtocol: DeloadProtocol;
  switch (fatigueType) {
    case 'volume':
      selectedProtocol = DELOAD_PROTOCOLS.find(p => p.type === 'volume')!;
      break;
    case 'intensity':
      selectedProtocol = DELOAD_PROTOCOLS.find(p => p.type === 'intensity')!;
      break;
    case 'sleep':
    case 'recovery':
      // Life stress / non-gym fatigue → active recovery
      selectedProtocol = DELOAD_PROTOCOLS.find(p => p.type === 'active_recovery')!;
      break;
    case 'general':
    default:
      // General burnout — choose based on urgency
      if (highestUrgency === 'critical') {
        selectedProtocol = DELOAD_PROTOCOLS.find(p => p.type === 'full_rest')!;
      } else {
        selectedProtocol = DELOAD_PROTOCOLS.find(p => p.type === 'volume')!;
      }
      break;
  }

  // Override to full rest for critical urgency regardless of fatigue type
  if (highestUrgency === 'critical' && fatigueDebt.currentDebt >= 85) {
    selectedProtocol = DELOAD_PROTOCOLS.find(p => p.type === 'full_rest')!;
  }

  // ─── Determine timing ─────────────────────────────────────────────────

  let timing: DeloadRecommendation['timing'];
  if (highestUrgency === 'critical') {
    timing = 'now';
  } else if (highestUrgency === 'recommended') {
    // If near end of mesocycle (within 1 week), finish the block first
    if (currentMesocycle) {
      const mesoEnd = new Date(currentMesocycle.endDate).getTime();
      const daysToEnd = (mesoEnd - Date.now()) / DAY_MS;
      timing = daysToEnd <= 7 ? 'end_of_block' : 'next_week';
    } else {
      timing = 'next_week';
    }
  } else {
    timing = 'end_of_block';
  }

  // Build composite reason from all met triggers
  const allReasons = metTriggers.map(t => t.reason);
  const reason = allReasons.length === 1
    ? primaryReason
    : `${primaryReason}. Additionally: ${allReasons.slice(1).join('; ')}.`;

  return {
    needed: true,
    urgency: highestUrgency,
    reason,
    protocol: selectedProtocol,
    timing,
    fatigueDebt,
  };
}

/**
 * Get all available deload protocol definitions for UI display.
 */
export function getDeloadProtocols(): DeloadProtocol[] {
  // Return copies to prevent mutation
  return DELOAD_PROTOCOLS.map(p => ({ ...p, recommendations: [...p.recommendations] }));
}

/**
 * Estimate post-deload performance based on fatigue debt level,
 * chosen protocol, and performance history.
 *
 * Models supercompensation: the temporary performance boost that occurs
 * when accumulated fatigue dissipates while fitness adaptations remain.
 *
 * Reference: Banister 1991 fitness-fatigue model — fatigue decays faster
 * than fitness, creating a window of elevated performance.
 */
export function estimatePostDeloadPerformance(
  performanceProfiles: ExercisePerformanceProfile[] | undefined,
  protocol: DeloadProtocol,
  fatigueDebt?: FatigueDebt,
): PostDeloadPrediction {
  // Default prediction
  const defaultPrediction: PostDeloadPrediction = {
    expectedStrengthBounce: 2,
    estimatedPeakDay: protocol.durationDays + 3,
    confidence: 'low',
  };

  if (!fatigueDebt || fatigueDebt.currentDebt < 20) {
    // Low fatigue = minimal supercompensation expected
    return {
      expectedStrengthBounce: 1,
      estimatedPeakDay: protocol.durationDays + 2,
      confidence: 'low',
    };
  }

  // Higher fatigue debt = greater potential supercompensation
  // Typical research shows 2-5% strength bounce after proper deload
  let bouncePercent: number;
  if (fatigueDebt.currentDebt >= 80) {
    bouncePercent = 5;
  } else if (fatigueDebt.currentDebt >= 60) {
    bouncePercent = 3.5;
  } else if (fatigueDebt.currentDebt >= 40) {
    bouncePercent = 2.5;
  } else {
    bouncePercent = 1.5;
  }

  // Protocol type affects bounce magnitude
  // Full rest → highest bounce but longer to peak
  // Volume deload → moderate bounce, faster peak
  switch (protocol.type) {
    case 'full_rest':
      bouncePercent *= 1.2;
      break;
    case 'active_recovery':
      bouncePercent *= 1.1;
      break;
    case 'volume':
      bouncePercent *= 1.0;
      break;
    case 'intensity':
      bouncePercent *= 0.9;
      break;
    case 'frequency':
      bouncePercent *= 0.95;
      break;
  }

  // Estimate peak day: fatigue dissipation typically takes 5-10 days
  // Heavier protocols need longer but produce higher peak
  let peakDay: number;
  switch (protocol.type) {
    case 'full_rest':
      peakDay = protocol.durationDays + 4; // 3 rest + 4 ramp-up
      break;
    case 'active_recovery':
      peakDay = protocol.durationDays + 3; // 5 active + 3 ramp-up
      break;
    case 'volume':
    case 'intensity':
    case 'frequency':
      peakDay = protocol.durationDays + 2; // 7 deload + 2 ramp-up
      break;
    default:
      peakDay = protocol.durationDays + 3;
  }

  // Confidence based on data quality
  let confidence: PostDeloadPrediction['confidence'] = 'medium';
  if (performanceProfiles && performanceProfiles.length > 0) {
    const dataRichProfiles = performanceProfiles.filter(p => p.dataPoints >= 6);
    if (dataRichProfiles.length >= 3 && fatigueDebt.weeklyFatigueScores.length >= 4) {
      confidence = 'high';
    } else if (dataRichProfiles.length >= 1 && fatigueDebt.weeklyFatigueScores.length >= 3) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }
  }

  // Adjust bounce if performance profiles show declining trends (more room to bounce back)
  if (performanceProfiles && performanceProfiles.length > 0) {
    const decliningProfiles = performanceProfiles.filter(
      p => p.estimated1RM.trend === 'declining' && p.dataPoints >= 3,
    );
    if (decliningProfiles.length >= 2) {
      // Declining performance despite effort = more masked fitness to unmask
      bouncePercent *= 1.15;
    }
  }

  return {
    expectedStrengthBounce: Math.round(bouncePercent * 10) / 10,
    estimatedPeakDay: peakDay,
    confidence,
  };
}

/**
 * Generate human-readable fatigue insights and coaching advice.
 *
 * Produces a headline, detail bullets, and concrete action items
 * based on the fatigue debt state and recent training patterns.
 */
export function getFatigueInsights(
  fatigueDebt: FatigueDebt,
  workoutLogs: WorkoutLog[],
  wearableHistory: WearableData[],
): FatigueInsight {
  const { currentDebt, debtTrend, weeklyFatigueScores, primaryContributors, estimatedRecoveryDays } = fatigueDebt;

  // ─── Headline ───
  let headline: string;
  if (currentDebt < 25) {
    headline = 'Fatigue is well managed — you are recovering effectively.';
  } else if (currentDebt < 45) {
    headline = 'Moderate fatigue — normal for progressive training.';
  } else if (currentDebt < 65) {
    headline = 'Fatigue is building up — monitor closely this week.';
  } else if (currentDebt < 80) {
    headline = 'Your fatigue is accumulating faster than recovery. Two options: deload this week, or reduce volume by 20% for the next two sessions.';
  } else {
    headline = 'Critical fatigue levels — a deload or rest period is strongly recommended before continuing hard training.';
  }

  // ─── Details ───
  const details: string[] = [];

  // Debt level context
  details.push(`Current fatigue debt: ${currentDebt}/100 (${debtTrend}).`);

  // Trend context
  if (debtTrend === 'accumulating' && weeklyFatigueScores.length >= 2) {
    const lastTwo = weeklyFatigueScores.slice(-2);
    const increase = lastTwo[1].score - lastTwo[0].score;
    if (increase > 0) {
      details.push(`Fatigue increased by ${increase} points from last week.`);
    }
  } else if (debtTrend === 'recovering') {
    details.push('Fatigue is trending downward — your recovery efforts are working.');
  }

  // Primary contributors
  if (primaryContributors.length > 0) {
    details.push(`Main fatigue drivers: ${primaryContributors.join(', ')}.`);
  }

  // Recovery estimate
  if (estimatedRecoveryDays > 0) {
    details.push(`Estimated ${estimatedRecoveryDays} rest days needed to clear current fatigue debt.`);
  }

  // Recent training pattern analysis
  const twoWeeksAgo = Date.now() - 2 * WEEK_MS;
  const recentLogs = workoutLogs.filter(l => new Date(l.date).getTime() >= twoWeeksAgo);
  if (recentLogs.length > 0) {
    const logsWithRPE = recentLogs.filter(l => l.overallRPE > 0);
    const avgRPE = logsWithRPE.length > 0 ? logsWithRPE.reduce((sum, l) => sum + l.overallRPE, 0) / logsWithRPE.length : 0;
    const prCount = recentLogs.reduce(
      (count, log) => count + log.exercises.filter(e => e.personalRecord).length, 0,
    );
    details.push(`Last 2 weeks: ${recentLogs.length} sessions${avgRPE > 0 ? `, avg RPE ${avgRPE.toFixed(1)}` : ''}, ${prCount} PR${prCount !== 1 ? 's' : ''}.`);
  }

  // Wearable context
  if (wearableHistory.length > 0) {
    const recentWearable = wearableHistory.filter(
      w => new Date(w.date).getTime() >= Date.now() - WEEK_MS,
    );
    const withRecovery = recentWearable.filter(w => w.recoveryScore != null);
    if (withRecovery.length > 0) {
      const avgRecovery = withRecovery.reduce((s, w) => s + (w.recoveryScore ?? 0), 0) / withRecovery.length;
      details.push(`Average wearable recovery this week: ${Math.round(avgRecovery)}%.`);
    }
    const withSleep = recentWearable.filter(w => w.sleepHours != null);
    if (withSleep.length > 0) {
      const avgSleep = withSleep.reduce((s, w) => s + (w.sleepHours ?? 0), 0) / withSleep.length;
      details.push(`Average sleep this week: ${avgSleep.toFixed(1)} hours.`);
    }
  }

  // ─── Action Items ───
  const actionItems: string[] = [];

  if (currentDebt >= 80) {
    actionItems.push('Take a deload or full rest period starting this week.');
    actionItems.push('Prioritize 8+ hours of sleep every night.');
    actionItems.push('Eat at maintenance or slight surplus with high protein (2g/kg bodyweight).');
  } else if (currentDebt >= 60) {
    actionItems.push('Consider scheduling a deload within the next 1-2 weeks.');
    actionItems.push('Reduce working sets by 1-2 per exercise for the next few sessions.');
    if (primaryContributors.some(c => c.toLowerCase().includes('sleep'))) {
      actionItems.push('Focus on sleep hygiene — consistent bedtime, cool room, no screens 1hr before bed.');
    }
    if (primaryContributors.some(c => c.toLowerCase().includes('rpe') || c.toLowerCase().includes('intensity'))) {
      actionItems.push('Cap RPE at 7-8 for the next week — leave 2-3 reps in reserve.');
    }
  } else if (currentDebt >= 40) {
    if (debtTrend === 'accumulating') {
      actionItems.push('Fatigue is rising — plan a deload at the end of this training block.');
      actionItems.push('Add an extra rest day this week if possible.');
    } else {
      actionItems.push('Continue current training — fatigue is in a normal range.');
      actionItems.push('Ensure you are getting 7+ hours of sleep consistently.');
    }
  } else {
    actionItems.push('Keep training as planned — fatigue is well controlled.');
    if (debtTrend === 'recovering') {
      actionItems.push('You are recovering well — this is a good time to push intensity.');
    }
  }

  // Universal advice when volume is a contributor
  if (primaryContributors.some(c => c.toLowerCase().includes('volume')) && currentDebt >= 50) {
    actionItems.push('Consider dropping the last 1-2 isolation exercises from each session.');
  }

  // Non-gym stressor advice
  if (primaryContributors.some(c => c.toLowerCase().includes('non-gym'))) {
    actionItems.push('Your combat/cardio training is adding significant fatigue — reduce lifting volume on heavy sparring days.');
  }

  return {
    headline,
    details,
    actionItems,
  };
}
