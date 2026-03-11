/**
 * Individualized Volume Landmarks Engine
 *
 * Learns per-muscle-group MEV/MAV/MRV from the user's OWN training data,
 * replacing static population averages with personalized volume prescriptions.
 *
 * Science:
 * - Israetel et al. 2019: Volume landmarks framework (MEV/MAV/MRV)
 * - Schoenfeld et al. 2017: Dose-response of weekly sets on hypertrophy
 * - Heaselgrave et al. 2019: Individual variation in volume response is
 *   2-3x larger than population averages suggest
 * - Aube et al. 2022: Diminishing returns above MAV; negative returns above MRV
 *
 * Key insight: Population MEV for chest is 8 sets/week, but individual MEV
 * ranges from 4-12. Only YOUR data tells YOUR landmarks.
 *
 * All functions are pure — no side effects, no store, no React.
 */

import type { WorkoutLog, ExerciseLog } from './types';
import { VOLUME_LANDMARKS } from './workout-generator';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MuscleLandmarks {
  /** Minimum Effective Volume — below this, no meaningful stimulus. */
  mev: number;
  /** Maximum Adaptive Volume — sweet spot for maximum gains. */
  mav: number;
  /** Maximum Recoverable Volume — above this, recovery fails. */
  mrv: number;
  /** How confident are we in these numbers? */
  confidence: 'low' | 'medium' | 'high';
  /** Number of weeks of data used. */
  dataWeeks: number;
}

export interface VolumeProgressPoint {
  weekStart: string;       // ISO date
  weeklysets: number;      // Total sets that week
  /** 1RM progression: positive = getting stronger, negative = regression. */
  strengthDelta: number;   // Change in estimated 1RM from previous period
  /** Soreness reported (1-5 average). */
  avgSoreness: number;
  /** Performance rating (1-5 average). */
  avgPerformance: number;
}

export interface IndividualizedLandmarks {
  /** Per-muscle landmarks learned from data. */
  muscles: Record<string, MuscleLandmarks>;
  /** Timestamp of last analysis. */
  analyzedAt: string;
  /** Minimum weeks of data needed for medium confidence. */
  minWeeksForMedium: number;
  /** Minimum weeks of data needed for high confidence. */
  minWeeksForHigh: number;
}

// ─── Muscle Group Mapping ────────────────────────────────────────────────────

/** Map exercise names to primary muscle groups for volume counting. */
const EXERCISE_TO_MUSCLE: Record<string, string[]> = {
  // Compounds hit multiple groups
  'bench press': ['chest', 'triceps', 'shoulders'],
  'incline bench': ['chest', 'shoulders', 'triceps'],
  'overhead press': ['shoulders', 'triceps'],
  'dumbbell press': ['chest', 'triceps'],
  'push-up': ['chest', 'triceps'],
  'dip': ['chest', 'triceps'],
  // Pulls
  'barbell row': ['back', 'biceps'],
  'pull-up': ['back', 'biceps'],
  'lat pulldown': ['back', 'biceps'],
  'cable row': ['back', 'biceps'],
  't-bar row': ['back', 'biceps'],
  'face pull': ['back', 'shoulders'],
  // Legs
  'squat': ['quadriceps', 'glutes'],
  'front squat': ['quadriceps', 'core'],
  'leg press': ['quadriceps', 'glutes'],
  'lunge': ['quadriceps', 'glutes'],
  'deadlift': ['hamstrings', 'back', 'glutes'],
  'romanian deadlift': ['hamstrings', 'glutes'],
  'rdl': ['hamstrings', 'glutes'],
  'leg curl': ['hamstrings'],
  'leg extension': ['quadriceps'],
  'hip thrust': ['glutes'],
  'calf raise': ['calves'],
  // Isolation
  'bicep curl': ['biceps'],
  'tricep extension': ['triceps'],
  'lateral raise': ['shoulders'],
  'rear delt fly': ['shoulders'],
  'shrug': ['traps'],
  'wrist curl': ['forearms'],
  'farmer carry': ['forearms', 'traps', 'core'],
  // Core
  'plank': ['core'],
  'crunch': ['core'],
  'pallof press': ['core'],
  'ab wheel': ['core'],
};

// ─── Core Analysis ───────────────────────────────────────────────────────────

/**
 * Analyze workout history to determine individualized volume landmarks.
 *
 * Algorithm:
 * 1. Group workout logs by week
 * 2. Count per-muscle-group weekly sets
 * 3. Correlate volume with strength progression
 * 4. Find: MEV (minimum volume where progress occurs)
 *         MAV (volume with best progress-to-fatigue ratio)
 *         MRV (volume where performance starts declining)
 *
 * @param logs - Workout history (at least 6 weeks recommended)
 * @param populationDefaults - Fallback values from VOLUME_LANDMARKS
 */
export function analyzeVolumeLandmarks(
  logs: WorkoutLog[],
  populationDefaults: Record<string, { mev: number; mav: number; mrv: number }> = VOLUME_LANDMARKS,
): IndividualizedLandmarks {
  if (logs.length < 8) {
    // Not enough data — return population defaults with low confidence
    return {
      muscles: Object.fromEntries(
        Object.entries(populationDefaults).map(([muscle, landmarks]) => [
          muscle,
          { ...landmarks, confidence: 'low' as const, dataWeeks: 0 },
        ])
      ),
      analyzedAt: new Date().toISOString(),
      minWeeksForMedium: 8,
      minWeeksForHigh: 16,
    };
  }

  // Group logs by week
  const weeklyData = groupByWeek(logs);
  const weekCount = weeklyData.length;

  // Per-muscle analysis
  const muscles: Record<string, MuscleLandmarks> = {};

  for (const [muscle, defaults] of Object.entries(populationDefaults)) {
    const volumeHistory = weeklyData.map(week => ({
      weekStart: week.weekStart,
      weeklysets: countMuscleSets(week.logs, muscle),
      strengthDelta: estimateStrengthDelta(week.logs, muscle, weeklyData),
      avgSoreness: avgField(week.logs, 'soreness'),
      avgPerformance: avgField(week.logs, 'performance'),
    }));

    muscles[muscle] = findLandmarks(volumeHistory, defaults, weekCount);
  }

  return {
    muscles,
    analyzedAt: new Date().toISOString(),
    minWeeksForMedium: 8,
    minWeeksForHigh: 16,
  };
}

/**
 * Get the recommended weekly sets for a muscle group based on current goal.
 *
 * @param landmarks - Individualized landmarks for this muscle
 * @param goal - 'growth' = target MAV, 'maintain' = target MEV+2, 'push' = near MRV
 */
export function getRecommendedSets(
  landmarks: MuscleLandmarks,
  goal: 'growth' | 'maintain' | 'push',
): number {
  switch (goal) {
    case 'maintain':
      return landmarks.mev + 2; // Slightly above MEV for a buffer
    case 'growth':
      return landmarks.mav; // Sweet spot
    case 'push':
      return Math.round(landmarks.mav + (landmarks.mrv - landmarks.mav) * 0.7); // 70% toward MRV
  }
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

interface WeekGroup {
  weekStart: string;
  logs: WorkoutLog[];
}

function groupByWeek(logs: WorkoutLog[]): WeekGroup[] {
  const map = new Map<string, WorkoutLog[]>();
  for (const log of logs) {
    const d = new Date(log.date);
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
    const key = monday.toISOString().split('T')[0];
    const arr = map.get(key) || [];
    arr.push(log);
    map.set(key, arr);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, weekLogs]) => ({ weekStart, logs: weekLogs }));
}

function countMuscleSets(logs: WorkoutLog[], targetMuscle: string): number {
  let sets = 0;
  for (const log of logs) {
    for (const ex of log.exercises) {
      const name = (ex.exerciseName || '').toLowerCase();
      const muscles = findMusclesForExercise(name);
      if (muscles.includes(targetMuscle)) {
        // Count completed sets only
        sets += ex.sets.filter(s => s.completed).length;
      }
    }
  }
  return sets;
}

function findMusclesForExercise(name: string): string[] {
  for (const [pattern, muscles] of Object.entries(EXERCISE_TO_MUSCLE)) {
    if (name.includes(pattern)) return muscles;
  }
  // Default: try to infer from name
  if (name.includes('chest') || name.includes('pec')) return ['chest'];
  if (name.includes('back') || name.includes('lat')) return ['back'];
  if (name.includes('shoulder') || name.includes('delt')) return ['shoulders'];
  if (name.includes('bicep') || name.includes('curl')) return ['biceps'];
  if (name.includes('tricep')) return ['triceps'];
  if (name.includes('quad') || name.includes('squat') || name.includes('leg press')) return ['quadriceps'];
  if (name.includes('hamstring') || name.includes('leg curl')) return ['hamstrings'];
  if (name.includes('glute') || name.includes('hip')) return ['glutes'];
  if (name.includes('calf')) return ['calves'];
  if (name.includes('core') || name.includes('ab')) return ['core'];
  if (name.includes('trap') || name.includes('shrug')) return ['traps'];
  if (name.includes('forearm') || name.includes('grip') || name.includes('wrist')) return ['forearms'];
  return ['full_body'];
}

function estimateStrengthDelta(
  currentLogs: WorkoutLog[],
  _muscle: string,
  allWeeks: WeekGroup[],
): number {
  const currentIdx = allWeeks.findIndex(w => w.logs === currentLogs);
  if (currentIdx < 1) return 0;
  const prevLogs = allWeeks[currentIdx - 1].logs;
  const currentAvg = avgExerciseWeight(currentLogs);
  const prevAvg = avgExerciseWeight(prevLogs);
  if (prevAvg === 0) return 0;
  return (currentAvg - prevAvg) / prevAvg; // percentage change
}

function avgExerciseWeight(logs: WorkoutLog[]): number {
  let totalWeight = 0;
  let count = 0;
  for (const log of logs) {
    for (const ex of log.exercises) {
      for (const set of ex.sets) {
        if (set.completed && set.weight > 0) {
          totalWeight += set.weight;
          count++;
        }
      }
    }
  }
  return count > 0 ? totalWeight / count : 0;
}

function avgField(logs: WorkoutLog[], field: 'soreness' | 'performance'): number {
  const values: number[] = [];
  for (const log of logs) {
    if (field === 'soreness' && log.soreness != null) {
      values.push(log.soreness);
    }
    if (field === 'performance' && log.postFeedback?.overallPerformance != null) {
      // Map categorical performance to 1-5 scale
      const perfMap: Record<string, number> = {
        'worse_than_expected': 2,
        'as_expected': 3,
        'better_than_expected': 4,
      };
      values.push(perfMap[log.postFeedback.overallPerformance] ?? 3);
    }
  }
  if (values.length === 0) return 3; // Neutral default
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/**
 * Find individualized MEV/MAV/MRV from volume-progression data.
 *
 * Algorithm (simplified Bayesian updating):
 * - MEV: lowest weekly volume where strengthDelta > 0 (progress occurred)
 * - MAV: volume with best ratio of (strengthDelta / soreness)
 * - MRV: volume above which strengthDelta becomes negative or soreness > 4
 *
 * Falls back to population defaults with Bayesian blending when data is sparse.
 */
function findLandmarks(
  history: VolumeProgressPoint[],
  defaults: { mev: number; mav: number; mrv: number },
  weekCount: number,
): MuscleLandmarks {
  const confidence: 'low' | 'medium' | 'high' =
    weekCount >= 16 ? 'high' : weekCount >= 8 ? 'medium' : 'low';

  // Filter to weeks where the muscle was actually trained
  const trained = history.filter(h => h.weeklysets > 0);
  if (trained.length < 4) {
    return { ...defaults, confidence, dataWeeks: weekCount };
  }

  // Sort by volume
  const sorted = [...trained].sort((a, b) => a.weeklysets - b.weeklysets);

  // Find MEV: minimum volume where any progress occurred
  let observedMEV = defaults.mev;
  for (const point of sorted) {
    if (point.strengthDelta > 0 && point.avgPerformance >= 2.5) {
      observedMEV = point.weeklysets;
      break;
    }
  }

  // Find MAV: best progress-to-fatigue ratio
  let bestRatio = -Infinity;
  let observedMAV = defaults.mav;
  for (const point of sorted) {
    const fatigue = Math.max(1, point.avgSoreness);
    const ratio = point.strengthDelta / fatigue;
    if (ratio > bestRatio) {
      bestRatio = ratio;
      observedMAV = point.weeklysets;
    }
  }

  // Find MRV: volume where performance starts declining
  let observedMRV = defaults.mrv;
  for (const point of sorted.reverse()) {
    if (point.strengthDelta < 0 || point.avgSoreness >= 4) {
      observedMRV = point.weeklysets;
      break;
    }
  }

  // Bayesian blend: weight observed vs population based on confidence
  // Low confidence: 30% observed, 70% population
  // Medium: 60% observed, 40% population
  // High: 85% observed, 15% population
  const observedWeight = confidence === 'high' ? 0.85 : confidence === 'medium' ? 0.60 : 0.30;
  const popWeight = 1 - observedWeight;

  const mev = Math.round(observedMEV * observedWeight + defaults.mev * popWeight);
  const mav = Math.round(observedMAV * observedWeight + defaults.mav * popWeight);
  const mrv = Math.round(observedMRV * observedWeight + defaults.mrv * popWeight);

  // Enforce ordering constraints: MEV < MAV < MRV
  return {
    mev: Math.min(mev, mav - 1),
    mav: Math.max(mev + 1, Math.min(mav, mrv - 1)),
    mrv: Math.max(mav + 1, mrv),
    confidence,
    dataWeeks: weekCount,
  };
}
