/**
 * Personal Performance Model — Sprint 4
 *
 * Builds per-exercise performance profiles from workout history, predicts
 * future performance, identifies strongest lifts and weak links, and
 * calculates progression rates. All pure functions — no React or store deps.
 */

import type {
  WorkoutLog,
  ExerciseLog,
  SetLog,
  Exercise,
  MovementPattern,
} from './types';
import { getExerciseById } from './exercises';

// ─── Exported Interfaces ────────────────────────────────────────────────────

export interface ExercisePerformanceProfile {
  exerciseId: string;
  exerciseName: string;
  dataPoints: number;
  estimated1RM: {
    current: number;
    peak: number;
    trend: 'rising' | 'plateau' | 'declining';
  };
  strengthCurve: { date: string; e1rm: number }[];
  bestRepRange: { min: number; max: number };
  volumeResponse: 'high' | 'moderate' | 'low';
  fatigueSensitivity: 'high' | 'moderate' | 'low';
  personalNotes: string[];
}

export interface PerformancePrediction {
  predictedWeight: number;
  predictedReps: number;
  confidence: 'high' | 'medium' | 'low';
  basedOn: number;
}

export interface StrongestLift {
  exerciseId: string;
  exerciseName: string;
  estimated1RM: number;
  percentile: string;
  trend: 'rising' | 'plateau' | 'declining';
}

export interface WeakLink {
  exerciseId: string;
  exerciseName: string;
  issue: string;
  suggestion: string;
}

export interface ProgressionRate {
  weeklyGainPercent: number;
  totalGainPercent: number;
  isAccelerating: boolean;
}

// ─── Internal Types ─────────────────────────────────────────────────────────

interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number;
}

/** One data point extracted from a workout log for a single exercise. */
interface ExerciseDataPoint {
  date: string;       // ISO date string
  dateMs: number;     // epoch millis for sorting/regression
  e1rm: number;
  bestWeight: number;
  bestReps: number;
  totalSets: number;
  avgRPE: number;
  exerciseIndex: number; // position within the session (0-based)
  sessionRPE: number;    // overall session RPE
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

/**
 * Estimated 1-rep max from weight and reps.
 * Brzycki for 1-10 reps (most accurate), Epley for 11+ reps (Brzycki degrades).
 * Consistent with calc1RM in progress-analytics.ts and weight-estimator.ts.
 */
function epley1RM(weight: number, reps: number): number {
  if (weight <= 0) return 0;
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  if (reps > 10) return weight * (1 + reps / 30); // Epley for high reps
  return weight / (1.0278 - 0.0278 * reps);       // Brzycki for 2-10 reps
}

/**
 * Extract or compute the estimated 1RM from an ExerciseLog.
 * Uses the stored value when available; otherwise picks the best set
 * and applies the Epley formula.
 */
function getE1RM(log: ExerciseLog): number {
  if (log.estimated1RM && log.estimated1RM > 0) return log.estimated1RM;

  const completedSets = log.sets.filter(s => s.completed && s.weight > 0);
  if (completedSets.length === 0) return 0;

  let best = 0;
  completedSets.forEach(s => {
    const e = epley1RM(s.weight, s.reps);
    if (e > best) best = e;
  });
  return best;
}

/**
 * Simple ordinary least-squares linear regression.
 * Returns slope, intercept, and R-squared.
 * If fewer than 2 points, returns zero slope / r2.
 */
function linearRegression(points: { x: number; y: number }[]): RegressionResult {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points.length === 1 ? points[0].y : 0, r2: 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  points.forEach(p => {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
    sumY2 += p.y * p.y;
  });

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const yMean = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  points.forEach(p => {
    const predicted = slope * p.x + intercept;
    ssRes += (p.y - predicted) * (p.y - predicted);
    ssTot += (p.y - yMean) * (p.y - yMean);
  });
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

/**
 * Determine e1RM trend from a chronologically-ordered set of data points
 * using linear regression on up to the last 8 sessions.
 */
function classifyTrend(dataPoints: ExerciseDataPoint[]): 'rising' | 'plateau' | 'declining' {
  let recent = dataPoints.slice(-8);
  if (recent.length < 2) return 'plateau';

  // ── Outlier filtering (IQR method) ──
  // Warm-up sets or logging errors (e.g. 42kg when working weight is 84kg)
  // corrupt the regression and produce false "declining" signals.
  const e1rms = recent.map(dp => dp.e1rm);
  const sorted = [...e1rms].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  // Only filter if IQR is meaningful (prevents filtering when all values are similar)
  if (iqr > 0) {
    recent = recent.filter(dp => dp.e1rm >= lowerBound);
    if (recent.length < 2) return 'plateau';
  }

  // Normalise x to start at 0 (session index) for numeric stability
  const regressionPoints = recent.map((dp, i) => ({ x: i, y: dp.e1rm }));
  const { slope } = linearRegression(regressionPoints);

  // Threshold: consider slope relative to the average e1rm
  const avgE1rm = recent.reduce((s, dp) => s + dp.e1rm, 0) / recent.length;
  if (avgE1rm === 0) return 'plateau';

  const relativeSlope = slope / avgE1rm; // % change per session
  if (relativeSlope > 0.005) return 'rising';    // >0.5% per session
  if (relativeSlope < -0.005) return 'declining'; // <-0.5% per session
  return 'plateau';
}

/**
 * Collect all data points for a given exerciseId across workout logs,
 * sorted chronologically.
 */
function collectDataPoints(exerciseId: string, workoutLogs: WorkoutLog[]): ExerciseDataPoint[] {
  const points: ExerciseDataPoint[] = [];

  const sortedLogs = [...workoutLogs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  sortedLogs.forEach(log => {
    log.exercises.forEach((ex, idx) => {
      if (ex.exerciseId !== exerciseId) return;

      const e1rm = getE1RM(ex);
      if (e1rm <= 0) return;

      const completedSets = ex.sets.filter(s => s.completed && s.weight > 0);
      if (completedSets.length === 0) return;

      let bestWeight = 0;
      let bestReps = 0;
      completedSets.forEach(s => {
        if (epley1RM(s.weight, s.reps) >= epley1RM(bestWeight, bestReps)) {
          bestWeight = s.weight;
          bestReps = s.reps;
        }
      });

      const rpeValues = completedSets.filter(s => s.rpe > 0).map(s => s.rpe);
      const avgRPE = rpeValues.length > 0
        ? rpeValues.reduce((s, v) => s + v, 0) / rpeValues.length
        : 0;

      const dateObj = new Date(log.date);
      points.push({
        date: dateObj.toISOString().split('T')[0],
        dateMs: dateObj.getTime(),
        e1rm,
        bestWeight,
        bestReps,
        totalSets: completedSets.length,
        avgRPE,
        exerciseIndex: idx,
        sessionRPE: log.overallRPE || 0,
      });
    });
  });

  return points;
}

/**
 * Find the rep range where e1RM improvements were largest.
 * Buckets reps into ranges (1-3, 4-6, 6-8, 8-12, 12-15, 15+)
 * and compares first-half vs second-half average e1rm per bucket.
 */
function detectBestRepRange(dataPoints: ExerciseDataPoint[]): { min: number; max: number } {
  if (dataPoints.length < 3) return { min: 6, max: 12 }; // sensible default

  const buckets: { min: number; max: number; label: string }[] = [
    { min: 1, max: 3, label: '1-3' },
    { min: 4, max: 6, label: '4-6' },
    { min: 6, max: 8, label: '6-8' },
    { min: 8, max: 12, label: '8-12' },
    { min: 12, max: 15, label: '12-15' },
    { min: 15, max: 30, label: '15+' },
  ];

  let bestBucket = buckets[3]; // default 8-12
  let bestImprovement = -Infinity;

  buckets.forEach(bucket => {
    const bucketPoints = dataPoints.filter(
      dp => dp.bestReps >= bucket.min && dp.bestReps <= bucket.max
    );
    if (bucketPoints.length < 2) return;

    // Compare first half average vs second half average
    const mid = Math.floor(bucketPoints.length / 2);
    const firstHalf = bucketPoints.slice(0, mid);
    const secondHalf = bucketPoints.slice(mid);

    const avgFirst = firstHalf.reduce((s, dp) => s + dp.e1rm, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, dp) => s + dp.e1rm, 0) / secondHalf.length;

    const improvement = avgFirst > 0 ? (avgSecond - avgFirst) / avgFirst : 0;
    if (improvement > bestImprovement) {
      bestImprovement = improvement;
      bestBucket = bucket;
    }
  });

  return { min: bestBucket.min, max: bestBucket.max };
}

/**
 * Assess volume response: compare weeks with higher total sets to
 * the subsequent e1RM changes.  'high' means more sets correlated with
 * better gains, 'low' means diminishing returns.
 */
function assessVolumeResponse(dataPoints: ExerciseDataPoint[]): 'high' | 'moderate' | 'low' {
  if (dataPoints.length < 4) return 'moderate'; // not enough data

  // Group by week (ISO week boundary approximation: 7-day windows)
  const weeks: { sets: number; avgE1rm: number }[] = [];
  let weekStart = dataPoints[0].dateMs;
  let weekSets = 0;
  let weekE1rmSum = 0;
  let weekCount = 0;

  dataPoints.forEach(dp => {
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    if (dp.dateMs - weekStart >= WEEK_MS && weekCount > 0) {
      weeks.push({ sets: weekSets, avgE1rm: weekE1rmSum / weekCount });
      weekStart = dp.dateMs;
      weekSets = 0;
      weekE1rmSum = 0;
      weekCount = 0;
    }
    weekSets += dp.totalSets;
    weekE1rmSum += dp.e1rm;
    weekCount++;
  });
  if (weekCount > 0) {
    weeks.push({ sets: weekSets, avgE1rm: weekE1rmSum / weekCount });
  }

  if (weeks.length < 3) return 'moderate';

  // Correlate weekly sets with next-week e1rm change
  let higherVolBetter = 0;
  let higherVolWorse = 0;

  const medianSets = [...weeks].sort((a, b) => a.sets - b.sets)[Math.floor(weeks.length / 2)].sets;

  for (let i = 0; i < weeks.length - 1; i++) {
    const e1rmDelta = weeks[i + 1].avgE1rm - weeks[i].avgE1rm;
    if (weeks[i].sets > medianSets && e1rmDelta > 0) higherVolBetter++;
    if (weeks[i].sets > medianSets && e1rmDelta < 0) higherVolWorse++;
    if (weeks[i].sets <= medianSets && e1rmDelta < 0) higherVolBetter++; // lower vol = worse
    if (weeks[i].sets <= medianSets && e1rmDelta > 0) higherVolWorse++;  // lower vol = better
  }

  const total = higherVolBetter + higherVolWorse;
  if (total === 0) return 'moderate';

  const ratio = higherVolBetter / total;
  if (ratio >= 0.65) return 'high';
  if (ratio <= 0.35) return 'low';
  return 'moderate';
}

/**
 * Assess fatigue sensitivity: compare performance when exercise appears
 * later in the session (higher index) or after high-RPE sessions.
 */
function assessFatigueSensitivity(dataPoints: ExerciseDataPoint[]): 'high' | 'moderate' | 'low' {
  if (dataPoints.length < 4) return 'moderate';

  // Split into "early in session" (index 0-1) vs "late" (index 3+)
  const early = dataPoints.filter(dp => dp.exerciseIndex <= 1);
  const late = dataPoints.filter(dp => dp.exerciseIndex >= 3);

  let positionDrop = 0;
  if (early.length >= 2 && late.length >= 2) {
    const avgEarly = early.reduce((s, dp) => s + dp.e1rm, 0) / early.length;
    const avgLate = late.reduce((s, dp) => s + dp.e1rm, 0) / late.length;
    positionDrop = avgEarly > 0 ? (avgEarly - avgLate) / avgEarly : 0;
  }

  // Also check: sessions after high-RPE days vs normal days
  const sorted = [...dataPoints];
  let highRpeDrop = 0;
  let highRpeCount = 0;
  let normalCount = 0;
  let highRpeSum = 0;
  let normalSum = 0;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1].sessionRPE >= 8) {
      highRpeSum += sorted[i].e1rm;
      highRpeCount++;
    } else {
      normalSum += sorted[i].e1rm;
      normalCount++;
    }
  }

  if (highRpeCount >= 2 && normalCount >= 2) {
    const avgAfterHigh = highRpeSum / highRpeCount;
    const avgAfterNormal = normalSum / normalCount;
    highRpeDrop = avgAfterNormal > 0 ? (avgAfterNormal - avgAfterHigh) / avgAfterNormal : 0;
  }

  const combinedDrop = Math.max(positionDrop, highRpeDrop);
  if (combinedDrop >= 0.06) return 'high';    // >=6% drop
  if (combinedDrop >= 0.02) return 'moderate'; // 2-6%
  return 'low';
}

/**
 * Generate auto-insights for an exercise profile.
 */
function generateInsights(
  profile: Omit<ExercisePerformanceProfile, 'personalNotes'>,
  dataPoints: ExerciseDataPoint[],
): string[] {
  const notes: string[] = [];

  // Trend insight
  if (profile.estimated1RM.trend === 'rising') {
    notes.push(`Estimated 1RM is trending upward — keep current approach.`);
  } else if (profile.estimated1RM.trend === 'declining') {
    notes.push(`Estimated 1RM is declining — consider deloading or adjusting volume.`);
  } else if (profile.dataPoints >= 6) {
    notes.push(`Strength has plateaued — try varying rep ranges or adding intensity techniques.`);
  }

  // PR recency
  if (dataPoints.length >= 2) {
    const peak = profile.estimated1RM.peak;
    const current = profile.estimated1RM.current;
    if (current >= peak * 0.98) {
      notes.push(`Currently at or near all-time best — great momentum.`);
    } else {
      const deficit = Math.round((1 - current / peak) * 100);
      notes.push(`Currently ${deficit}% below peak estimated 1RM of ${Math.round(peak)}.`);
    }
  }

  // Best rep range
  const { min, max } = profile.bestRepRange;
  notes.push(`Best progression in the ${min}-${max} rep range.`);

  // Volume response
  if (profile.volumeResponse === 'high') {
    notes.push(`Responds well to higher volume — consider adding sets.`);
  } else if (profile.volumeResponse === 'low') {
    notes.push(`More sets may not help — focus on intensity instead.`);
  }

  // Fatigue sensitivity
  if (profile.fatigueSensitivity === 'high') {
    notes.push(`Performance drops significantly when fatigued — prioritize this exercise earlier in the session.`);
  }

  return notes;
}

/**
 * Look up movement pattern for an exercise, falling back to 'push' if unknown.
 */
function getMovementPattern(exerciseId: string, exerciseDb?: Exercise[]): MovementPattern {
  if (exerciseDb) {
    const found = exerciseDb.find(e => e.id === exerciseId);
    if (found) return found.movementPattern;
  }
  const found = getExerciseById(exerciseId);
  return found?.movementPattern ?? 'push';
}

/**
 * Look up primary muscles for an exercise.
 */
function getPrimaryMuscles(exerciseId: string, exerciseDb?: Exercise[]): string[] {
  if (exerciseDb) {
    const found = exerciseDb.find(e => e.id === exerciseId);
    if (found) return found.primaryMuscles;
  }
  const found = getExerciseById(exerciseId);
  return found?.primaryMuscles ?? [];
}

// ─── Exported Functions ─────────────────────────────────────────────────────

/**
 * Build performance profiles for every exercise in the user's workout history.
 * Exercises with fewer than 3 data points receive a minimal profile
 * (no volume response, fatigue, or best rep range analysis).
 */
export function buildPerformanceProfiles(
  workoutLogs: WorkoutLog[],
  exerciseDb?: Exercise[],
): ExercisePerformanceProfile[] {
  if (!workoutLogs || workoutLogs.length === 0) return [];

  // Group data points by exercise id
  const exerciseMap = new Map<string, { name: string; dataPoints: ExerciseDataPoint[] }>();

  const sortedLogs = [...workoutLogs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  sortedLogs.forEach(log => {
    log.exercises.forEach((ex, idx) => {
      const e1rm = getE1RM(ex);
      if (e1rm <= 0) return;

      const completedSets = ex.sets.filter(s => s.completed && s.weight > 0);
      if (completedSets.length === 0) return;

      let bestWeight = 0;
      let bestReps = 0;
      completedSets.forEach(s => {
        if (epley1RM(s.weight, s.reps) >= epley1RM(bestWeight, bestReps)) {
          bestWeight = s.weight;
          bestReps = s.reps;
        }
      });

      const rpeValues = completedSets.filter(s => s.rpe > 0).map(s => s.rpe);
      const avgRPE = rpeValues.length > 0
        ? rpeValues.reduce((s, v) => s + v, 0) / rpeValues.length
        : 0;

      const dateObj = new Date(log.date);
      const dp: ExerciseDataPoint = {
        date: dateObj.toISOString().split('T')[0],
        dateMs: dateObj.getTime(),
        e1rm,
        bestWeight,
        bestReps,
        totalSets: completedSets.length,
        avgRPE,
        exerciseIndex: idx,
        sessionRPE: log.overallRPE || 0,
      };

      if (!exerciseMap.has(ex.exerciseId)) {
        exerciseMap.set(ex.exerciseId, { name: ex.exerciseName, dataPoints: [] });
      }
      exerciseMap.get(ex.exerciseId)!.dataPoints.push(dp);
    });
  });

  // Build profiles
  const profiles: ExercisePerformanceProfile[] = [];

  exerciseMap.forEach((value, exerciseId) => {
    const { name, dataPoints } = value;
    const count = dataPoints.length;

    // Current and peak e1rm
    const current = dataPoints[dataPoints.length - 1].e1rm;
    let peak = 0;
    dataPoints.forEach(dp => { if (dp.e1rm > peak) peak = dp.e1rm; });

    // Strength curve (last 20 data points for charting)
    const curvePoints = dataPoints.slice(-20).map(dp => ({
      date: dp.date,
      e1rm: Math.round(dp.e1rm * 10) / 10,
    }));

    if (count < 3) {
      // Minimal profile — not enough data for deep analysis
      profiles.push({
        exerciseId,
        exerciseName: name,
        dataPoints: count,
        estimated1RM: {
          current: Math.round(current * 10) / 10,
          peak: Math.round(peak * 10) / 10,
          trend: 'plateau',
        },
        strengthCurve: curvePoints,
        bestRepRange: { min: 6, max: 12 },
        volumeResponse: 'moderate',
        fatigueSensitivity: 'moderate',
        personalNotes: [`Only ${count} session(s) logged — more data needed for detailed analysis.`],
      });
      return; // forEach continue
    }

    // Full analysis for exercises with >= 3 data points
    const trend = classifyTrend(dataPoints);
    const bestRepRange = detectBestRepRange(dataPoints);
    const volumeResponse = assessVolumeResponse(dataPoints);
    const fatigueSensitivity = assessFatigueSensitivity(dataPoints);

    const partialProfile = {
      exerciseId,
      exerciseName: name,
      dataPoints: count,
      estimated1RM: {
        current: Math.round(current * 10) / 10,
        peak: Math.round(peak * 10) / 10,
        trend,
      },
      strengthCurve: curvePoints,
      bestRepRange,
      volumeResponse,
      fatigueSensitivity,
    };

    const personalNotes = generateInsights(
      partialProfile,
      dataPoints,
    );

    profiles.push({ ...partialProfile, personalNotes });
  });

  // Sort by most data points (descending), then by name
  profiles.sort((a, b) => {
    if (b.dataPoints !== a.dataPoints) return b.dataPoints - a.dataPoints;
    return a.exerciseName.localeCompare(b.exerciseName);
  });

  return profiles;
}

/**
 * Predict expected performance for the next session of a given exercise.
 * Uses trend extrapolation plus an optional readiness modifier.
 */
export function predictNextPerformance(
  exerciseId: string,
  workoutLogs: WorkoutLog[],
  readinessLevel?: 'peak' | 'good' | 'moderate' | 'low' | 'critical',
): PerformancePrediction {
  const dataPoints = collectDataPoints(exerciseId, workoutLogs);

  if (dataPoints.length === 0) {
    return { predictedWeight: 0, predictedReps: 0, confidence: 'low', basedOn: 0 };
  }

  const last = dataPoints[dataPoints.length - 1];

  if (dataPoints.length === 1) {
    return {
      predictedWeight: last.bestWeight,
      predictedReps: last.bestReps,
      confidence: 'low',
      basedOn: 1,
    };
  }

  // Use linear regression on last 8 data points to project next e1rm
  const recent = dataPoints.slice(-8);
  const regressionPoints = recent.map((dp, i) => ({ x: i, y: dp.e1rm }));
  const { slope, intercept } = linearRegression(regressionPoints);

  const nextIndex = recent.length; // one step ahead
  let projectedE1rm = slope * nextIndex + intercept;

  // Clamp: don't project more than 5% above the current value or below 80%
  const currentE1rm = last.e1rm;
  projectedE1rm = Math.max(currentE1rm * 0.8, Math.min(currentE1rm * 1.05, projectedE1rm));

  // Apply readiness modifier
  const readinessModifiers: Record<string, number> = {
    peak: 1.03,
    good: 1.0,
    moderate: 0.95,
    low: 0.88,
    critical: 0.75,
  };
  const modifier = readinessLevel ? (readinessModifiers[readinessLevel] ?? 1.0) : 1.0;
  projectedE1rm *= modifier;

  // Convert back to weight/reps at the user's typical rep range
  const typicalReps = last.bestReps > 0 ? last.bestReps : 8;
  // Inverse Epley: weight = e1rm / (1 + reps / 30)
  const predictedWeight = projectedE1rm / (1 + typicalReps / 30);

  // Confidence based on data quantity and trend stability
  let confidence: 'high' | 'medium' | 'low';
  if (dataPoints.length >= 8) {
    confidence = 'high';
  } else if (dataPoints.length >= 4) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    predictedWeight: Math.round(predictedWeight * 10) / 10,
    predictedReps: typicalReps,
    confidence,
    basedOn: dataPoints.length,
  };
}

/**
 * Return the user's top exercises ranked by estimated 1RM.
 * Percentile is relative to the user's own lifts per movement pattern.
 */
export function findStrongestLifts(
  workoutLogs: WorkoutLog[],
  topN: number = 5,
): StrongestLift[] {
  if (!workoutLogs || workoutLogs.length === 0) return [];

  // Collect the latest e1rm for every exercise
  const latestE1rm = new Map<string, { name: string; e1rm: number }>();
  const allDataPoints = new Map<string, ExerciseDataPoint[]>();

  // Process logs chronologically so the last entry wins
  const sortedLogs = [...workoutLogs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  sortedLogs.forEach(log => {
    log.exercises.forEach(ex => {
      const e1rm = getE1RM(ex);
      if (e1rm <= 0) return;
      latestE1rm.set(ex.exerciseId, { name: ex.exerciseName, e1rm });
    });
  });

  // Build data points for trend analysis
  latestE1rm.forEach((_, exerciseId) => {
    allDataPoints.set(exerciseId, collectDataPoints(exerciseId, workoutLogs));
  });

  // Group exercises by movement pattern for percentile labelling
  const patternGroups = new Map<string, { exerciseId: string; name: string; e1rm: number }[]>();
  latestE1rm.forEach((value, exerciseId) => {
    const pattern = getMovementPattern(exerciseId);
    if (!patternGroups.has(pattern)) {
      patternGroups.set(pattern, []);
    }
    patternGroups.get(pattern)!.push({ exerciseId, name: value.name, e1rm: value.e1rm });
  });

  const patternLabels: Record<string, string> = {
    push: 'upper body push',
    pull: 'upper body pull',
    squat: 'squat pattern',
    hinge: 'hinge pattern',
    carry: 'carry/loaded movement',
    rotation: 'rotational movement',
    explosive: 'explosive movement',
  };

  // Sort each pattern group and assign percentile labels
  const percentileMap = new Map<string, string>();
  patternGroups.forEach((group, pattern) => {
    group.sort((a, b) => b.e1rm - a.e1rm);
    const label = patternLabels[pattern] || pattern;
    group.forEach((item, index) => {
      if (index === 0 && group.length > 1) {
        percentileMap.set(item.exerciseId, `Strongest ${label}`);
      } else if (group.length <= 1) {
        percentileMap.set(item.exerciseId, `Only ${label} tracked`);
      } else {
        const rank = index + 1;
        percentileMap.set(item.exerciseId, `#${rank} of ${group.length} ${label} exercises`);
      }
    });
  });

  // Build results sorted by e1rm descending
  const results: StrongestLift[] = [];
  latestE1rm.forEach((value, exerciseId) => {
    const dataPoints = allDataPoints.get(exerciseId) || [];
    const trend = dataPoints.length >= 2 ? classifyTrend(dataPoints) : 'plateau';
    results.push({
      exerciseId,
      exerciseName: value.name,
      estimated1RM: Math.round(value.e1rm * 10) / 10,
      percentile: percentileMap.get(exerciseId) || 'N/A',
      trend,
    });
  });

  results.sort((a, b) => b.estimated1RM - a.estimated1RM);
  return results.slice(0, topN);
}

/**
 * Identify exercises lagging behind — declining trends, long plateaus,
 * and push/pull or quad/hamstring imbalances.
 */
export function findWeakLinks(
  workoutLogs: WorkoutLog[],
  exerciseDb?: Exercise[],
): WeakLink[] {
  if (!workoutLogs || workoutLogs.length === 0) return [];

  const weakLinks: WeakLink[] = [];
  const exerciseIds = new Set<string>();

  workoutLogs.forEach(log => {
    log.exercises.forEach(ex => exerciseIds.add(ex.exerciseId));
  });

  // Per-exercise: detect declines and plateaus
  exerciseIds.forEach(exerciseId => {
    const dataPoints = collectDataPoints(exerciseId, workoutLogs);
    if (dataPoints.length < 3) return;

    const trend = classifyTrend(dataPoints);
    const name = dataPoints[0]
      ? workoutLogs
          .flatMap(l => l.exercises)
          .find(e => e.exerciseId === exerciseId)?.exerciseName || exerciseId
      : exerciseId;

    // Declining 1RM
    if (trend === 'declining') {
      weakLinks.push({
        exerciseId,
        exerciseName: name,
        issue: 'Estimated 1RM has been declining over recent sessions.',
        suggestion: 'Consider a deload week, reassess technique, or reduce volume on this movement.',
      });
    }

    // Long plateau (>3 weeks of flat e1rm)
    if (trend === 'plateau' && dataPoints.length >= 6) {
      const recent = dataPoints.slice(-6);
      const firstE1rm = recent[0].e1rm;
      const lastE1rm = recent[recent.length - 1].e1rm;
      const timeSpanMs = recent[recent.length - 1].dateMs - recent[0].dateMs;
      const threeWeeksMs = 21 * 24 * 60 * 60 * 1000;

      if (timeSpanMs >= threeWeeksMs && Math.abs(lastE1rm - firstE1rm) / firstE1rm < 0.02) {
        weakLinks.push({
          exerciseId,
          exerciseName: name,
          issue: 'Strength has plateaued for over 3 weeks.',
          suggestion: 'Try varying rep ranges, add intensity techniques (drop sets, pauses), or swap to a similar movement.',
        });
      }
    }
  });

  // Movement pattern imbalance analysis
  const patternE1rms = new Map<string, number[]>();
  const muscleE1rms = new Map<string, number[]>();

  exerciseIds.forEach(exerciseId => {
    const dataPoints = collectDataPoints(exerciseId, workoutLogs);
    if (dataPoints.length === 0) return;

    const latestE1rm = dataPoints[dataPoints.length - 1].e1rm;
    const pattern = getMovementPattern(exerciseId, exerciseDb);
    const muscles = getPrimaryMuscles(exerciseId, exerciseDb);

    if (!patternE1rms.has(pattern)) {
      patternE1rms.set(pattern, []);
    }
    patternE1rms.get(pattern)!.push(latestE1rm);

    muscles.forEach(m => {
      if (!muscleE1rms.has(m)) {
        muscleE1rms.set(m, []);
      }
      muscleE1rms.get(m)!.push(latestE1rm);
    });
  });

  // Push vs pull ratio check
  const pushValues = patternE1rms.get('push') || [];
  const pullValues = patternE1rms.get('pull') || [];

  if (pushValues.length > 0 && pullValues.length > 0) {
    const avgPush = pushValues.reduce((s, v) => s + v, 0) / pushValues.length;
    const avgPull = pullValues.reduce((s, v) => s + v, 0) / pullValues.length;

    if (avgPush > 0 && avgPull > 0) {
      const ratio = avgPush / avgPull;
      if (ratio > 1.4) {
        weakLinks.push({
          exerciseId: 'pattern-imbalance-pull',
          exerciseName: 'Pulling movements',
          issue: `Push-to-pull strength ratio is ${ratio.toFixed(1)}:1 — pulling is lagging.`,
          suggestion: 'Add more rowing and pull-up volume to balance upper body development.',
        });
      } else if (ratio < 0.7) {
        weakLinks.push({
          exerciseId: 'pattern-imbalance-push',
          exerciseName: 'Pushing movements',
          issue: `Push-to-pull strength ratio is ${ratio.toFixed(1)}:1 — pushing is lagging.`,
          suggestion: 'Add more pressing volume to balance upper body development.',
        });
      }
    }
  }

  // Quad vs hamstring check
  const quadValues = muscleE1rms.get('quadriceps') || [];
  const hamValues = muscleE1rms.get('hamstrings') || [];

  if (quadValues.length > 0 && hamValues.length > 0) {
    const avgQuad = quadValues.reduce((s, v) => s + v, 0) / quadValues.length;
    const avgHam = hamValues.reduce((s, v) => s + v, 0) / hamValues.length;

    if (avgQuad > 0 && avgHam > 0) {
      const ratio = avgQuad / avgHam;
      if (ratio > 1.8) {
        weakLinks.push({
          exerciseId: 'muscle-imbalance-hamstrings',
          exerciseName: 'Hamstrings',
          issue: `Quad-to-hamstring strength ratio is ${ratio.toFixed(1)}:1 — hamstrings are lagging.`,
          suggestion: 'Add Romanian deadlifts, Nordic curls, or lying leg curls.',
        });
      } else if (ratio < 0.8) {
        weakLinks.push({
          exerciseId: 'muscle-imbalance-quadriceps',
          exerciseName: 'Quadriceps',
          issue: `Quad-to-hamstring strength ratio is ${ratio.toFixed(1)}:1 — quadriceps are lagging.`,
          suggestion: 'Add front squats, leg presses, or leg extensions.',
        });
      }
    }
  }

  return weakLinks;
}

/**
 * Calculate the rate of strength gain for a specific exercise over a period.
 * Default analysis period is the last 8 weeks.
 */
export function getProgressionRate(
  exerciseId: string,
  workoutLogs: WorkoutLog[],
  periodWeeks: number = 8,
): ProgressionRate {
  const dataPoints = collectDataPoints(exerciseId, workoutLogs);

  if (dataPoints.length < 2) {
    return { weeklyGainPercent: 0, totalGainPercent: 0, isAccelerating: false };
  }

  // Filter to the requested period
  const cutoffMs = Date.now() - periodWeeks * 7 * 24 * 60 * 60 * 1000;
  const periodPoints = dataPoints.filter(dp => dp.dateMs >= cutoffMs);

  if (periodPoints.length < 2) {
    // Fall back to all available data if period is too narrow
    const first = dataPoints[0].e1rm;
    const last = dataPoints[dataPoints.length - 1].e1rm;
    const totalGain = first > 0 ? ((last - first) / first) * 100 : 0;
    const spanWeeks = Math.max(1, (dataPoints[dataPoints.length - 1].dateMs - dataPoints[0].dateMs) / (7 * 24 * 60 * 60 * 1000));
    return {
      weeklyGainPercent: Math.round((totalGain / spanWeeks) * 100) / 100,
      totalGainPercent: Math.round(totalGain * 100) / 100,
      isAccelerating: false,
    };
  }

  const firstE1rm = periodPoints[0].e1rm;
  const lastE1rm = periodPoints[periodPoints.length - 1].e1rm;
  const totalGainPercent = firstE1rm > 0
    ? ((lastE1rm - firstE1rm) / firstE1rm) * 100
    : 0;

  const spanMs = periodPoints[periodPoints.length - 1].dateMs - periodPoints[0].dateMs;
  const spanWeeks = Math.max(1, spanMs / (7 * 24 * 60 * 60 * 1000));
  const weeklyGainPercent = totalGainPercent / spanWeeks;

  // Determine if gains are accelerating by comparing first-half and second-half slopes
  let isAccelerating = false;
  if (periodPoints.length >= 4) {
    const mid = Math.floor(periodPoints.length / 2);
    const firstHalf = periodPoints.slice(0, mid);
    const secondHalf = periodPoints.slice(mid);

    const firstHalfRegression = linearRegression(
      firstHalf.map((dp, i) => ({ x: i, y: dp.e1rm }))
    );
    const secondHalfRegression = linearRegression(
      secondHalf.map((dp, i) => ({ x: i, y: dp.e1rm }))
    );

    isAccelerating = secondHalfRegression.slope > firstHalfRegression.slope * 1.1;
  }

  return {
    weeklyGainPercent: Math.round(weeklyGainPercent * 100) / 100,
    totalGainPercent: Math.round(totalGainPercent * 100) / 100,
    isAccelerating,
  };
}
