/**
 * Progress Analytics Engine
 *
 * Provides: PR Timeline, Synthetic Recovery, Plateau Detection,
 * Combat Benchmarks, Hard Metrics (Strength/Volume/Readiness),
 * and per-muscle volume tracking with MEV/MAV/MRV zones.
 */

import type { WorkoutLog, MuscleGroup } from './types';
import { getExerciseById } from './exercises';
import { VOLUME_LANDMARKS } from './workout-generator';
import { toLocalDateStr } from './utils';

// ── Types ──────────────────────────────────────────────────────────────────

export interface PREvent {
  date: Date;
  exerciseId: string;
  exerciseName: string;
  type: 'weight' | 'e1rm' | 'reps';
  value: number;
  previousBest: number;
  delta: number;
  deltaPct: number;
  blockWeek: number | null; // week within current block
  recoveryContext: 'fresh' | 'fatigued' | 'unknown';
}

export interface SyntheticRecovery {
  score: number; // 0-100
  trend: 'improving' | 'declining' | 'stable';
  components: {
    rpeLoad: number;      // 0-100 (lower RPE = higher recovery)
    soreness: number;     // 0-100
    sleepQuality: number; // 0-100
    energy: number;       // 0-100
  };
  weeklyScores: { week: string; score: number }[];
}

export interface PlateauAnalysis {
  exerciseId: string;
  exerciseName: string;
  weeksStalled: number;
  currentE1RM: number;
  rootCause: 'volume_low' | 'volume_high' | 'poor_recovery' | 'low_frequency' | 'stale_stimulus' | 'possible_fatigue_masking';
  prescription: string;
}

export interface CombatBenchmark {
  exerciseName: string;
  exerciseId: string;
  current1RM: number;
  weightClass: string;
  percentile: number; // 0-100
  nextTier: string;
  nextTierValue: number;
  gap: number;
}

export interface HardMetrics {
  strengthTrend: { value: number; label: string; direction: 'up' | 'down' | 'flat'; pct: number };
  volumeCapacity: { current: number; mav: number; pctOfMAV: number; zone: 'below_mev' | 'productive' | 'near_mrv' | 'over_mrv' };
  fightReadiness: { score: number; label: string; factors: { name: string; value: number }[] };
}

export interface MuscleVolumeGauge {
  muscle: MuscleGroup;
  label: string;
  currentSets: number;
  mev: number;
  mav: number;
  mrv: number;
  zone: 'below_mev' | 'productive' | 'near_mrv' | 'over_mrv';
  pctOfRange: number; // 0-100 within MEV-MRV range
}

/** Filter out soft-deleted items */
function active<T>(arr: T[]): T[] {
  return arr.filter(item => !(item as Record<string, unknown>)._deleted);
}

// ── Helpers ────────────────────────────────────────────────────────────────

// Brzycki 1993, validated across all rep ranges (Reynolds et al. 2006, Pereira et al. 2020)
function calc1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight / (1.0278 - 0.0278 * reps));
}

function getWeekKey(date: Date | string): string {
  const d = new Date(date);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  return toLocalDateStr(monday);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ── 1. PR Timeline ────────────────────────────────────────────────────────

export function extractPRTimeline(workoutLogs: WorkoutLog[]): PREvent[] {
  workoutLogs = active(workoutLogs);
  if (workoutLogs.length === 0) return [];

  const sorted = [...workoutLogs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Track best per exercise over time
  const bestWeight: Record<string, number> = {};
  const bestE1RM: Record<string, number> = {};
  const events: PREvent[] = [];

  for (const log of sorted) {
    // Determine recovery context from pre-check-in
    let recoveryContext: PREvent['recoveryContext'] = 'unknown';
    if (log.preCheckIn) {
      const avg = (log.preCheckIn.sleepQuality + (6 - log.preCheckIn.soreness) + log.preCheckIn.motivation) / 3;
      recoveryContext = avg >= 3.5 ? 'fresh' : 'fatigued';
    }

    for (const ex of log.exercises) {
      if (!ex.personalRecord) continue;

      const completedSets = ex.sets.filter(s => s.completed && s.weight > 0);
      if (completedSets.length === 0) continue;

      // Find best weight set
      const bestSet = completedSets.reduce((best, s) => {
        const e1rm = calc1RM(s.weight, s.reps);
        const bestE = calc1RM(best.weight, best.reps);
        return e1rm > bestE ? s : best;
      }, completedSets[0]);

      const e1rm = calc1RM(bestSet.weight, bestSet.reps);
      const prevBestE1RM = bestE1RM[ex.exerciseId] || 0;
      const prevBestWeight = bestWeight[ex.exerciseId] || 0;

      // Determine PR type
      let type: PREvent['type'] = 'e1rm';
      let value = e1rm;
      let previousBest = prevBestE1RM;

      if (bestSet.weight > prevBestWeight && bestSet.weight >= e1rm * 0.95) {
        type = 'weight';
        value = bestSet.weight;
        previousBest = prevBestWeight;
      }

      const delta = value - previousBest;
      const deltaPct = previousBest > 0 ? Math.round((delta / previousBest) * 100) : 0;

      if (delta > 0 || previousBest === 0) {
        events.push({
          date: new Date(log.date),
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          type,
          value,
          previousBest,
          delta,
          deltaPct,
          blockWeek: null,
          recoveryContext,
        });
      }

      // Update tracking
      if (e1rm > (bestE1RM[ex.exerciseId] || 0)) bestE1RM[ex.exerciseId] = e1rm;
      if (bestSet.weight > (bestWeight[ex.exerciseId] || 0)) bestWeight[ex.exerciseId] = bestSet.weight;
    }
  }

  return events.sort((a, b) => b.date.getTime() - a.date.getTime());
}

// ── 2. Synthetic Recovery ─────────────────────────────────────────────────

export function calculateSyntheticRecovery(workoutLogs: WorkoutLog[]): SyntheticRecovery | null {
  workoutLogs = active(workoutLogs);
  if (workoutLogs.length < 3) return null;

  const fourWeeksAgo = Date.now() - 28 * 24 * 60 * 60 * 1000;
  const recentLogs = workoutLogs
    .filter(l => new Date(l.date).getTime() > fourWeeksAgo)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (recentLogs.length < 2) return null;

  // RPE load: avg RPE mapped to recovery (RPE 6=100, RPE 10=0)
  const rpeValues = recentLogs.filter(l => l.overallRPE > 0).map(l => l.overallRPE);
  const avgRPE = rpeValues.length > 0 ? rpeValues.reduce((s, v) => s + v, 0) / rpeValues.length : 7;
  const rpeLoad = clamp(Math.round((10 - avgRPE) / 4 * 100), 0, 100);

  // Soreness: from pre-check-in (1=no soreness=100, 5=severe=0) and post-workout
  const sorenessValues: number[] = [];
  recentLogs.forEach(l => {
    if (l.preCheckIn) sorenessValues.push(l.preCheckIn.soreness);
    if (l.soreness > 0) sorenessValues.push(l.soreness / 2); // post is 1-10, normalize to 1-5
  });
  const avgSoreness = sorenessValues.length > 0 ? sorenessValues.reduce((s, v) => s + v, 0) / sorenessValues.length : 2.5;
  const sorenessScore = clamp(Math.round((5 - avgSoreness) / 4 * 100), 0, 100);

  // Sleep quality: from pre-check-in (1-5 mapped to 0-100)
  const sleepValues = recentLogs.filter(l => l.preCheckIn).map(l => l.preCheckIn!.sleepQuality);
  const avgSleep = sleepValues.length > 0 ? sleepValues.reduce((s, v) => s + v, 0) / sleepValues.length : 3;
  const sleepScore = clamp(Math.round((avgSleep - 1) / 4 * 100), 0, 100);

  // Energy: from post-workout (1-10 mapped to 0-100)
  const energyValues = recentLogs.filter(l => l.energy > 0).map(l => l.energy);
  const avgEnergy = energyValues.length > 0 ? energyValues.reduce((s, v) => s + v, 0) / energyValues.length : 5;
  const energyScore = clamp(Math.round((avgEnergy - 1) / 9 * 100), 0, 100);

  // Composite score: weighted average
  const score = Math.round(
    rpeLoad * 0.30 +
    sorenessScore * 0.25 +
    sleepScore * 0.25 +
    energyScore * 0.20
  );

  // Weekly trend
  const weeklyMap = new Map<string, number[]>();
  recentLogs.forEach(l => {
    const wk = getWeekKey(l.date);
    if (!weeklyMap.has(wk)) weeklyMap.set(wk, []);

    const components: number[] = [];
    if (l.overallRPE > 0) components.push(clamp((10 - l.overallRPE) / 4 * 100, 0, 100));
    if (l.preCheckIn) {
      components.push(clamp((5 - l.preCheckIn.soreness) / 4 * 100, 0, 100));
      components.push(clamp((l.preCheckIn.sleepQuality - 1) / 4 * 100, 0, 100));
    }
    if (l.energy > 0) components.push(clamp((l.energy - 1) / 9 * 100, 0, 100));

    if (components.length > 0) {
      weeklyMap.get(wk)!.push(components.reduce((s, v) => s + v, 0) / components.length);
    }
  });

  const weeklyScores = Array.from(weeklyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, scores]) => ({
      week,
      score: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
    }));

  // Trend: compare last 2 weeks
  let trend: SyntheticRecovery['trend'] = 'stable';
  if (weeklyScores.length >= 2) {
    const last = weeklyScores[weeklyScores.length - 1].score;
    const prev = weeklyScores[weeklyScores.length - 2].score;
    if (last - prev > 5) trend = 'improving';
    else if (prev - last > 5) trend = 'declining';
  }

  return {
    score,
    trend,
    components: { rpeLoad, soreness: sorenessScore, sleepQuality: sleepScore, energy: energyScore },
    weeklyScores,
  };
}

// ── 3. Plateau Detection ──────────────────────────────────────────────────

export function detectPlateaus(workoutLogs: WorkoutLog[]): PlateauAnalysis[] {
  workoutLogs = active(workoutLogs);
  if (workoutLogs.length < 6) return [];

  const sixWeeksAgo = Date.now() - 42 * 24 * 60 * 60 * 1000;
  const threeWeeksAgo = Date.now() - 21 * 24 * 60 * 60 * 1000;
  const recentLogs = workoutLogs.filter(l => new Date(l.date).getTime() > sixWeeksAgo);

  // Track e1rm per exercise over time
  const exerciseHistory: Record<string, { date: number; e1rm: number; rpe: number }[]> = {};
  const exerciseWeeklyFreq: Record<string, Set<string>> = {};

  for (const log of recentLogs) {
    const weekKey = getWeekKey(log.date);
    for (const ex of log.exercises) {
      if (!exerciseHistory[ex.exerciseId]) {
        exerciseHistory[ex.exerciseId] = [];
        exerciseWeeklyFreq[ex.exerciseId] = new Set();
      }
      exerciseWeeklyFreq[ex.exerciseId].add(weekKey);

      const bestSet = ex.sets
        .filter(s => s.completed && s.weight > 0)
        .reduce((best, s) => {
          const e = calc1RM(s.weight, s.reps);
          return e > (best?.e1rm || 0) ? { e1rm: e, rpe: s.rpe || 0 } : best;
        }, null as { e1rm: number; rpe: number } | null);

      if (bestSet) {
        exerciseHistory[ex.exerciseId].push({
          date: new Date(log.date).getTime(),
          e1rm: bestSet.e1rm,
          rpe: bestSet.rpe,
        });
      }
    }
  }

  const plateaus: PlateauAnalysis[] = [];

  for (const [exerciseId, history] of Object.entries(exerciseHistory)) {
    if (history.length < 3) continue;

    const sorted = [...history].sort((a, b) => a.date - b.date);
    const recentEntries = sorted.filter(h => h.date > threeWeeksAgo);
    const olderEntries = sorted.filter(h => h.date <= threeWeeksAgo);

    if (recentEntries.length < 2 || olderEntries.length < 1) continue;

    const recentMax = Math.max(...recentEntries.map(h => h.e1rm));
    const olderMax = Math.max(...olderEntries.map(h => h.e1rm));

    // Variance-aware plateau detection
    const allE1RMs = sorted.map(h => h.e1rm);
    const mean = allE1RMs.reduce((s, v) => s + v, 0) / allE1RMs.length;
    const stdDev = Math.sqrt(allE1RMs.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / allE1RMs.length);
    const stagnationThreshold = Math.max(2, (stdDev * 2 / mean) * 100);

    const improvement = olderMax > 0 ? ((recentMax - olderMax) / olderMax) * 100 : 0;
    if (improvement > stagnationThreshold) continue;

    // Calculate weeks stalled
    const firstRecent = new Date(recentEntries[0].date);
    const lastOlder = new Date(olderEntries[olderEntries.length - 1].date);
    const weeksStalled = Math.max(2, Math.round(
      (firstRecent.getTime() - lastOlder.getTime()) / (7 * 24 * 60 * 60 * 1000)
    ));

    // Root cause analysis
    const weeklyFreq = exerciseWeeklyFreq[exerciseId]?.size || 0;
    const weeksInRange = 6;
    const freqPerWeek = weeklyFreq / weeksInRange;

    const avgRPE = recentEntries.filter(h => h.rpe > 0).length > 0
      ? recentEntries.filter(h => h.rpe > 0).reduce((s, h) => s + h.rpe, 0) / recentEntries.filter(h => h.rpe > 0).length
      : 0;

    // Determine muscle group for volume check
    const exercise = getExerciseById(exerciseId);
    const primaryMuscle = exercise?.primaryMuscles[0];
    const landmark = primaryMuscle ? VOLUME_LANDMARKS[primaryMuscle] : null;

    // Count weekly sets for this muscle group
    let weeklySetsForMuscle = 0;
    if (primaryMuscle) {
      const recentWeekLogs = workoutLogs.filter(l => new Date(l.date).getTime() > threeWeeksAgo);
      let totalSets = 0;
      let weekCount = new Set(recentWeekLogs.map(l => getWeekKey(l.date))).size || 1;
      for (const log of recentWeekLogs) {
        for (const ex of log.exercises) {
          const exData = getExerciseById(ex.exerciseId);
          if (exData?.primaryMuscles.includes(primaryMuscle)) {
            totalSets += ex.sets.filter(s => s.completed).length;
          }
        }
      }
      weeklySetsForMuscle = Math.round(totalSets / weekCount);
    }

    let rootCause: PlateauAnalysis['rootCause'];
    let prescription: string;

    if (landmark && weeklySetsForMuscle < landmark.mev) {
      rootCause = 'volume_low';
      prescription = `Add ${landmark.mev - weeklySetsForMuscle} more weekly sets for ${primaryMuscle}. You're below MEV (${weeklySetsForMuscle}/${landmark.mev} sets).`;
    } else if (landmark && weeklySetsForMuscle > landmark.mrv) {
      rootCause = 'volume_high';
      prescription = `Cut ${weeklySetsForMuscle - landmark.mav} sets for ${primaryMuscle}. You're over MRV — fatigue is masking fitness.`;
    } else if (avgRPE > 9) {
      rootCause = 'poor_recovery';
      prescription = `Average RPE is ${avgRPE.toFixed(1)}. Drop intensity to RPE 7-8 for 1-2 weeks, then ramp back up.`;
    } else if (freqPerWeek < 1.5) {
      rootCause = 'low_frequency';
      prescription = `Only hitting this ${freqPerWeek.toFixed(1)}×/week. Increase to 2×/week for more practice and stimulus.`;
    } else {
      // Check for possible fatigue masking: 4+ consecutive weeks without volume reduction
      const weekKeys = Array.from(exerciseWeeklyFreq[exerciseId] || new Set<string>()).sort();
      let consecutiveNoDeload = 0;
      if (weekKeys.length >= 4) {
        // Check weekly volume trend for deload detection
        const weeklyVolumes: number[] = [];
        for (const wk of weekKeys) {
          let weekVol = 0;
          for (const log of recentLogs) {
            if (getWeekKey(log.date) === wk) {
              for (const ex of log.exercises) {
                if (ex.exerciseId === exerciseId) {
                  weekVol += ex.sets.filter(s => s.completed).reduce((s, set) => s + set.weight * set.reps, 0);
                }
              }
            }
          }
          weeklyVolumes.push(weekVol);
        }
        // Count consecutive weeks without a volume reduction (deload = week volume drops by 20%+)
        consecutiveNoDeload = 0;
        for (let i = 1; i < weeklyVolumes.length; i++) {
          if (weeklyVolumes[i - 1] > 0 && weeklyVolumes[i] < weeklyVolumes[i - 1] * 0.8) {
            consecutiveNoDeload = 0;
          } else {
            consecutiveNoDeload++;
          }
        }
      }

      if (consecutiveNoDeload >= 4) {
        rootCause = 'possible_fatigue_masking';
        prescription = `A deload could reveal strength you've already built — try that before changing the exercise.`;
      } else {
        rootCause = 'stale_stimulus';
        prescription = `Try a variation — change grip, stance, or tempo. Same stimulus stops driving adaptation after ${weeksStalled} weeks.`;
      }
    }

    const exerciseName = exercise?.name || exerciseId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    plateaus.push({
      exerciseId,
      exerciseName,
      weeksStalled,
      currentE1RM: recentMax,
      rootCause,
      prescription,
    });
  }

  return plateaus.sort((a, b) => b.weeksStalled - a.weeksStalled).slice(0, 5);
}

// ── 4. Combat Athlete Benchmarks ──────────────────────────────────────────

// Strength standards by weight class (in kg) for combat athletes
// Based on powerlifting/S&C standards adjusted for combat sport population
const COMBAT_BENCHMARKS: Record<string, Record<string, number[]>> = {
  // [beginner, intermediate, advanced, elite] e1rm in kg
  'barbell-bench-press': {
    '57': [40, 60, 80, 100], '66': [50, 70, 95, 115], '74': [55, 80, 105, 130],
    '83': [60, 85, 115, 140], '93': [65, 95, 125, 155], '105': [70, 100, 135, 165],
    '120': [75, 105, 140, 175],
  },
  'barbell-squat': {
    '57': [55, 85, 115, 145], '66': [65, 100, 135, 170], '74': [75, 110, 150, 190],
    '83': [80, 120, 165, 205], '93': [90, 130, 175, 220], '105': [95, 140, 185, 235],
    '120': [100, 150, 195, 250],
  },
  'barbell-deadlift': {
    '57': [70, 105, 140, 175], '66': [80, 120, 160, 200], '74': [90, 135, 180, 225],
    '83': [100, 145, 195, 245], '93': [105, 155, 210, 265], '105': [115, 165, 220, 280],
    '120': [120, 175, 230, 290],
  },
  'barbell-overhead-press': {
    '57': [25, 40, 55, 70], '66': [30, 45, 65, 80], '74': [35, 50, 70, 90],
    '83': [40, 55, 75, 95], '93': [42, 60, 82, 105], '105': [45, 65, 88, 110],
    '120': [48, 70, 92, 115],
  },
};

const TIER_NAMES = ['Untrained', 'Beginner', 'Intermediate', 'Advanced', 'Elite'];

function getWeightClass(bodyweightKg: number): string {
  const classes = [57, 66, 74, 83, 93, 105, 120];
  for (const wc of classes) {
    if (bodyweightKg <= wc) return String(wc);
  }
  return '120';
}

export function calculateCombatBenchmarks(
  workoutLogs: WorkoutLog[],
  bodyweightKg: number,
  weightUnit: string,
): CombatBenchmark[] {
  workoutLogs = active(workoutLogs);
  if (workoutLogs.length === 0 || bodyweightKg <= 0) return [];

  const wc = getWeightClass(bodyweightKg);
  const benchmarks: CombatBenchmark[] = [];
  const conversionFactor = weightUnit === 'lbs' ? 2.20462 : 1;

  // Find current e1rm for each benchmark exercise
  for (const [exerciseId, classBenchmarks] of Object.entries(COMBAT_BENCHMARKS)) {
    const standards = classBenchmarks[wc];
    if (!standards) continue;

    // Find best e1rm from all logs
    let bestE1RM = 0;
    for (const log of workoutLogs) {
      for (const ex of log.exercises) {
        if (ex.exerciseId === exerciseId) {
          for (const set of ex.sets) {
            if (set.completed && set.weight > 0) {
              const e1rm = calc1RM(set.weight, set.reps);
              // Convert to kg if user uses lbs
              const e1rmKg = weightUnit === 'lbs' ? e1rm / 2.20462 : e1rm;
              if (e1rmKg > bestE1RM) bestE1RM = e1rmKg;
            }
          }
        }
      }
    }

    if (bestE1RM === 0) continue;

    // Calculate percentile within the tier system
    let percentile = 0;
    let tierIdx = 0;
    if (bestE1RM >= standards[3]) {
      percentile = 95 + Math.min(5, ((bestE1RM - standards[3]) / standards[3]) * 10);
      tierIdx = 4;
    } else if (bestE1RM >= standards[2]) {
      percentile = 75 + ((bestE1RM - standards[2]) / (standards[3] - standards[2])) * 20;
      tierIdx = 3;
    } else if (bestE1RM >= standards[1]) {
      percentile = 40 + ((bestE1RM - standards[1]) / (standards[2] - standards[1])) * 35;
      tierIdx = 2;
    } else if (bestE1RM >= standards[0]) {
      percentile = 10 + ((bestE1RM - standards[0]) / (standards[1] - standards[0])) * 30;
      tierIdx = 1;
    } else {
      percentile = (bestE1RM / standards[0]) * 10;
      tierIdx = 0;
    }

    // Next tier
    const nextTierIdx = Math.min(4, tierIdx + 1);
    const nextTierValue = tierIdx >= 4 ? standards[3] : standards[Math.min(3, tierIdx)];
    const gap = Math.max(0, nextTierValue - bestE1RM);

    const exercise = getExerciseById(exerciseId);
    const exerciseName = exercise?.name || exerciseId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    benchmarks.push({
      exerciseName,
      exerciseId,
      current1RM: Math.round(bestE1RM * conversionFactor),
      weightClass: `${wc}kg`,
      percentile: Math.round(clamp(percentile, 0, 100)),
      nextTier: TIER_NAMES[nextTierIdx],
      nextTierValue: Math.round(nextTierValue * conversionFactor),
      gap: Math.round(gap * conversionFactor),
    });
  }

  return benchmarks.sort((a, b) => b.percentile - a.percentile);
}

// ── 5. Hard Metrics ───────────────────────────────────────────────────────

export function calculateHardMetrics(
  workoutLogs: WorkoutLog[],
  currentMesocycleId: string | null,
): HardMetrics | null {
  workoutLogs = active(workoutLogs);
  if (workoutLogs.length < 3) return null;

  const fourWeeksAgo = Date.now() - 28 * 24 * 60 * 60 * 1000;
  const recentLogs = workoutLogs
    .filter(l => new Date(l.date).getTime() > fourWeeksAgo)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (recentLogs.length < 2) return null;

  // ── Strength Trend: median e1rm change across top exercises ──
  const exerciseE1RMs: Record<string, { date: number; e1rm: number }[]> = {};
  recentLogs.forEach(log => {
    log.exercises.forEach(ex => {
      if (!exerciseE1RMs[ex.exerciseId]) exerciseE1RMs[ex.exerciseId] = [];
      const maxE1rm = ex.sets.reduce((max, set) => {
        if (!set.completed || set.weight === 0) return max;
        return Math.max(max, calc1RM(set.weight, set.reps));
      }, 0);
      if (maxE1rm > 0) {
        exerciseE1RMs[ex.exerciseId].push({ date: new Date(log.date).getTime(), e1rm: maxE1rm });
      }
    });
  });

  const trendPcts: number[] = [];
  Object.values(exerciseE1RMs).forEach(data => {
    if (data.length >= 2) {
      let sorted = [...data].sort((a, b) => a.date - b.date);
      // Filter outliers (warm-up sets / logging errors) using IQR
      const vals = sorted.map(d => d.e1rm).sort((a, b) => a - b);
      const q1 = vals[Math.floor(vals.length * 0.25)];
      const q3 = vals[Math.floor(vals.length * 0.75)];
      const iqr = q3 - q1;
      if (iqr > 0) {
        const lb = q1 - 1.5 * iqr;
        sorted = sorted.filter(d => d.e1rm >= lb);
      }
      if (sorted.length < 2) return;
      const first = sorted[0].e1rm;
      const last = sorted[sorted.length - 1].e1rm;
      if (first > 0) trendPcts.push(((last - first) / first) * 100);
    }
  });

  // Median trend (properly handles even-length arrays)
  trendPcts.sort((a, b) => a - b);
  const mid = Math.floor(trendPcts.length / 2);
  const medianTrend = trendPcts.length === 0
    ? 0
    : trendPcts.length === 1
      ? trendPcts[0]
      : trendPcts.length % 2 === 1
        ? trendPcts[mid]
        : (trendPcts[mid - 1] + trendPcts[mid]) / 2;

  const strengthTrend = {
    value: Math.round(medianTrend * 10) / 10,
    pct: medianTrend,
    label: medianTrend > 1 ? 'Gaining' : medianTrend < -1 ? 'Declining' : 'Maintaining',
    direction: (medianTrend > 1 ? 'up' : medianTrend < -1 ? 'down' : 'flat') as 'up' | 'down' | 'flat',
  };

  // ── Volume Capacity: current weekly sets vs MAV ──
  const weeklyLogs = new Map<string, WorkoutLog[]>();
  recentLogs.forEach(l => {
    const wk = getWeekKey(l.date);
    if (!weeklyLogs.has(wk)) weeklyLogs.set(wk, []);
    weeklyLogs.get(wk)!.push(l);
  });

  let totalWeeklySets = 0;
  let weekCount = 0;
  let totalMAV = 0;
  const muscleSets: Record<string, number[]> = {};

  weeklyLogs.forEach((logs) => {
    weekCount++;
    const weekMuscleSets: Record<string, number> = {};
    logs.forEach(log => {
      log.exercises.forEach(ex => {
        const exercise = getExerciseById(ex.exerciseId);
        if (!exercise) return;
        const sets = ex.sets.filter(s => s.completed).length;
        exercise.primaryMuscles.forEach(m => {
          weekMuscleSets[m] = (weekMuscleSets[m] || 0) + sets;
        });
      });
    });
    Object.entries(weekMuscleSets).forEach(([m, sets]) => {
      if (!muscleSets[m]) muscleSets[m] = [];
      muscleSets[m].push(sets);
      totalWeeklySets += sets;
    });
  });

  // Average weekly sets across weeks
  const avgWeeklySets = weekCount > 0 ? Math.round(totalWeeklySets / weekCount) : 0;

  // Total MAV across trained muscles
  const trainedMuscles = Object.keys(muscleSets);
  trainedMuscles.forEach(m => {
    const landmark = VOLUME_LANDMARKS[m];
    if (landmark) totalMAV += landmark.mav;
  });

  const pctOfMAV = totalMAV > 0 ? Math.round((avgWeeklySets / totalMAV) * 100) : 50;
  const volumeZone: HardMetrics['volumeCapacity']['zone'] =
    pctOfMAV < 50 ? 'below_mev' :
    pctOfMAV <= 100 ? 'productive' :
    pctOfMAV <= 120 ? 'near_mrv' : 'over_mrv';

  const volumeCapacity = {
    current: avgWeeklySets,
    mav: totalMAV,
    pctOfMAV,
    zone: volumeZone,
  };

  // ── Fight Readiness: composite of recovery, consistency, strength ──
  const consistencyScore = (() => {
    const weeksActive = weeklyLogs.size;
    const totalWeeks = 4;
    return Math.round((weeksActive / totalWeeks) * 100);
  })();

  const strengthScore = clamp(Math.round(50 + medianTrend * 10), 0, 100);

  // Recovery from RPE and check-ins
  const rpeValues = recentLogs.filter(l => l.overallRPE > 0).map(l => l.overallRPE);
  const avgRPE = rpeValues.length > 0 ? rpeValues.reduce((s, v) => s + v, 0) / rpeValues.length : 7.5;
  const recoveryScore = clamp(Math.round(100 - Math.abs(avgRPE - 7.5) * 25), 0, 100);

  const volumeScore = clamp(
    volumeZone === 'productive' ? 85 :
    volumeZone === 'near_mrv' ? 60 :
    volumeZone === 'below_mev' ? 40 : 30,
    0, 100
  );

  const readinessScore = Math.round(
    consistencyScore * 0.30 +
    strengthScore * 0.30 +
    recoveryScore * 0.25 +
    volumeScore * 0.15
  );

  const fightReadiness = {
    score: readinessScore,
    label: readinessScore >= 80 ? 'Fight Ready' : readinessScore >= 60 ? 'Building' : readinessScore >= 40 ? 'Developing' : 'Base Phase',
    factors: [
      { name: 'Consistency', value: consistencyScore },
      { name: 'Strength', value: strengthScore },
      { name: 'Recovery', value: recoveryScore },
      { name: 'Volume', value: volumeScore },
    ],
  };

  return { strengthTrend, volumeCapacity, fightReadiness };
}

// ── 6. Per-Muscle Volume Gauges ───────────────────────────────────────────

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Chest', back: 'Back', shoulders: 'Shoulders', biceps: 'Biceps',
  triceps: 'Triceps', quadriceps: 'Quads', hamstrings: 'Hamstrings',
  glutes: 'Glutes', calves: 'Calves', core: 'Core', forearms: 'Forearms',
  traps: 'Traps',
};

export function calculateMuscleVolumeGauges(workoutLogs: WorkoutLog[]): MuscleVolumeGauge[] {
  workoutLogs = active(workoutLogs);
  if (workoutLogs.length === 0) return [];

  // Get last 7 days of logs for current weekly volume
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekLogs = workoutLogs.filter(l => new Date(l.date).getTime() > oneWeekAgo);

  if (weekLogs.length === 0) {
    // Fallback: use last 14 days divided by 2
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const biweekLogs = workoutLogs.filter(l => new Date(l.date).getTime() > twoWeeksAgo);
    if (biweekLogs.length === 0) return [];

    return calculateGaugesFromLogs(biweekLogs, 2);
  }

  return calculateGaugesFromLogs(weekLogs, 1);
}

function calculateGaugesFromLogs(logs: WorkoutLog[], weekDivisor: number): MuscleVolumeGauge[] {
  const muscleSets: Record<string, number> = {};

  for (const log of logs) {
    for (const ex of log.exercises) {
      const exercise = getExerciseById(ex.exerciseId);
      if (!exercise) continue;
      const completedSets = ex.sets.filter(s => s.completed).length;
      exercise.primaryMuscles.forEach(m => {
        muscleSets[m] = (muscleSets[m] || 0) + completedSets;
      });
    }
  }

  const gauges: MuscleVolumeGauge[] = [];

  for (const [muscle, totalSets] of Object.entries(muscleSets)) {
    if (muscle === 'full_body') continue;
    const landmark = VOLUME_LANDMARKS[muscle];
    if (!landmark) continue;

    const weekSets = Math.round(totalSets / weekDivisor);
    const { mev, mav, mrv } = landmark;

    let zone: MuscleVolumeGauge['zone'];
    if (weekSets < mev) zone = 'below_mev';
    else if (weekSets <= mav) zone = 'productive';
    else if (weekSets <= mrv) zone = 'near_mrv';
    else zone = 'over_mrv';

    // Percentage within the MEV-MRV range
    const range = mrv - mev;
    const pctOfRange = range > 0 ? clamp(Math.round(((weekSets - mev) / range) * 100), 0, 100) : 50;

    gauges.push({
      muscle: muscle as MuscleGroup,
      label: MUSCLE_LABELS[muscle] || muscle,
      currentSets: weekSets,
      mev,
      mav,
      mrv,
      zone,
      pctOfRange,
    });
  }

  return gauges.sort((a, b) => {
    // Sort by zone priority (below_mev and over_mrv first), then by name
    const zonePriority = { below_mev: 0, over_mrv: 1, near_mrv: 2, productive: 3 };
    const aDiff = zonePriority[a.zone] - zonePriority[b.zone];
    if (aDiff !== 0) return aDiff;
    return a.label.localeCompare(b.label);
  });
}

// ── 7. RIR Confidence Scoring ──────────────────────────────────────────────

export interface RIRConfidence {
  exerciseId: string;
  exerciseName: string;
  avgRPE: number;
  rir: number;
  confidence: 'high' | 'moderate' | 'low';
  message: string;
}

export function assessRIRConfidence(workoutLogs: WorkoutLog[]): RIRConfidence[] {
  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const recentLogs = workoutLogs.filter(l => !l._deleted && new Date(l.date).getTime() > twoWeeksAgo);

  const exerciseRPEs: Record<string, { name: string; rpes: number[] }> = {};

  for (const log of recentLogs) {
    for (const ex of log.exercises) {
      if (!exerciseRPEs[ex.exerciseId]) {
        exerciseRPEs[ex.exerciseId] = { name: ex.exerciseName, rpes: [] };
      }
      for (const set of ex.sets) {
        if (set.completed && set.rpe && set.rpe > 0) {
          exerciseRPEs[ex.exerciseId].rpes.push(set.rpe);
        }
      }
    }
  }

  const results: RIRConfidence[] = [];
  for (const [id, data] of Object.entries(exerciseRPEs)) {
    if (data.rpes.length < 3) continue;
    const avg = data.rpes.reduce((s, r) => s + r, 0) / data.rpes.length;
    const rir = 10 - avg;
    const confidence = rir >= 4 ? 'low' : rir >= 2 ? 'moderate' : 'high';
    if (confidence === 'low') {
      results.push({
        exerciseId: id,
        exerciseName: data.name,
        avgRPE: Math.round(avg * 10) / 10,
        rir: Math.round(rir * 10) / 10,
        confidence,
        message: `${data.name}: avg RPE ${avg.toFixed(1)} (RIR ~${rir.toFixed(0)}). At RIR 4+, self-assessed effort becomes less reliable — pushing closer to failure or using weight targets gives more accurate data.`,
      });
    }
  }
  return results;
}
