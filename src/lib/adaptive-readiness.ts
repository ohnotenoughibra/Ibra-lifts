/**
 * Adaptive Readiness Decay Model
 *
 * Learns individual recovery curves from historical workout data instead of
 * relying on population averages. Tracks how fast THIS user recovers based on
 * intensity, sleep quality, soreness patterns, and time between sessions.
 *
 * All functions are pure with no side effects.
 */

import type { WorkoutLog, TrainingSession } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Learned recovery characteristics for a specific user. */
export interface RecoveryProfile {
  userId: string;
  /** Average hours to return to baseline readiness. */
  avgRecoveryHours: number;
  /** Recovery hours segmented by intensity bucket. */
  recoveryByIntensity: {
    light: number;    // hours
    moderate: number;
    hard: number;
    max: number;
  };
  /** 0-1. How much residual soreness degrades next-session performance. */
  sorenessSensitivity: number;
  /** 0-1. How much sleep quality accelerates or impairs recovery. */
  sleepImpact: number;
  /** 1.0 = baseline. Values > 1 indicate slower recovery (e.g. age-related). */
  ageDecayFactor: number;
  /** Number of workout-pair observations used to build this profile. */
  dataPoints: number;
  /** Confidence in the profile based on data volume. */
  confidence: 'low' | 'medium' | 'high';
  /** ISO-8601 timestamp of the last profile update. */
  lastUpdated: string;
}

/** A single projected readiness value at a future point in time. */
export interface ReadinessProjection {
  /** Hours from now for this projection. */
  hoursFromNow: number;
  /** Projected readiness score (0-100). */
  projectedReadiness: number;
  /** Confidence in the projection (0-1). */
  confidence: number;
}

/** When the user will be recovered enough to train again. */
export interface RecoveryWindow {
  /** Estimated hours until readiness exceeds the threshold (default 70). */
  estimatedRecoveryTime: number;
  /** Optimal training window expressed as hours from now. */
  optimalTrainingWindow: { start: number; end: number };
  /** Current readiness score (0-100). */
  currentReadiness: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Map an RPE value (1-10) to an intensity bucket used by RecoveryProfile.
 */
function rpeToIntensityBucket(rpe: number): keyof RecoveryProfile['recoveryByIntensity'] {
  if (rpe <= 4) return 'light';
  if (rpe <= 6) return 'moderate';
  if (rpe <= 8) return 'hard';
  return 'max';
}

/**
 * Derive a 0-100 readiness score from a PreWorkoutCheckIn.
 *
 * Weighting:
 *   soreness  — 35 % (inverted: low soreness = high readiness)
 *   energy    — 25 % (from WorkoutLog.energy, 1-10 scale)
 *   sleep     — 20 %
 *   motivation — 10 %
 *   stress    — 10 % (inverted)
 */
function deriveReadinessFromCheckIn(
  log: WorkoutLog,
): number {
  const checkIn = log.preCheckIn;

  // When there is a full check-in, use it together with log-level fields.
  if (checkIn) {
    const soreness = checkIn.soreness ?? 3;
    const energy = log.energy ?? 5;
    const sleep = checkIn.sleepQuality ?? 3;
    const motivation = checkIn.motivation ?? 3;
    const stress = checkIn.stress ?? 3;

    const sorenessScore = (1 - (soreness - 1) / 4) * 100;   // 1-5 → 100-0
    const energyScore = ((energy - 1) / 9) * 100;            // 1-10 → 0-100
    const sleepScore = ((sleep - 1) / 4) * 100;              // 1-5 → 0-100
    const motivationScore = ((motivation - 1) / 4) * 100;    // 1-5 → 0-100
    const stressScore = (1 - (stress - 1) / 4) * 100;        // 1-5 → 100-0

    return (
      sorenessScore * 0.35 +
      energyScore * 0.25 +
      sleepScore * 0.20 +
      motivationScore * 0.10 +
      stressScore * 0.10
    );
  }

  // Fallback: only log-level fields are available.
  // soreness on WorkoutLog is 1-10, energy is 1-10. Default to midpoint if missing.
  const soreness = log.soreness ?? 5;
  const energy = log.energy ?? 5;
  const sorenessScore = (1 - (soreness - 1) / 9) * 100;
  const energyScore = ((energy - 1) / 9) * 100;

  return sorenessScore * 0.55 + energyScore * 0.45;
}

/**
 * Compute the elapsed hours between two Dates.
 */
function hoursBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60);
}

/**
 * Clamp a numeric value between min and max (inclusive).
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Determine confidence level from the number of data points.
 */
function confidenceFromCount(n: number): RecoveryProfile['confidence'] {
  if (n >= 25) return 'high';
  if (n >= 10) return 'medium';
  return 'low';
}

/**
 * Confidence numeric value (0-1) derived from profile confidence and hours ahead.
 * Projections further into the future are less certain.
 */
function projectionConfidence(profile: RecoveryProfile, hoursAhead: number): number {
  const base = profile.confidence === 'high' ? 0.9
    : profile.confidence === 'medium' ? 0.7
    : 0.4;
  // Decay confidence as we project further into the future (half-life 48 h).
  const decay = Math.exp(-hoursAhead / 48);
  return clamp(base * decay, 0.05, 1);
}

// ---------------------------------------------------------------------------
// Internal: data point extraction
// ---------------------------------------------------------------------------

interface RecoveryObservation {
  rpe: number;
  hoursBetween: number;
  nextReadiness: number;        // 0-100 readiness at start of next session
  sleepQuality: number | null;  // 1-5 or null if unknown
  intensityBucket: keyof RecoveryProfile['recoveryByIntensity'];
}

/**
 * Extract recovery observations from an ordered list of workout logs.
 * Each observation is a pair (current workout → next workout's check-in).
 */
function extractObservationsFromLogs(logs: WorkoutLog[]): RecoveryObservation[] {
  // Sort ascending by date to ensure correct pairing.
  const sorted = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const observations: RecoveryObservation[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    const gap = hoursBetween(new Date(current.date), new Date(next.date));
    // Skip unreasonably short gaps (< 2 h) or very long gaps (> 168 h / 7 days)
    // since they don't represent normal recovery patterns.
    if (gap < 2 || gap > 168) continue;

    const nextReadiness = deriveReadinessFromCheckIn(next);
    const sleepQuality = next.preCheckIn?.sleepQuality ?? null;

    const rpe = current.overallRPE ?? 6; // Default to moderate if missing
    if (isNaN(nextReadiness)) continue; // Skip corrupted data

    observations.push({
      rpe,
      hoursBetween: gap,
      nextReadiness,
      sleepQuality,
      intensityBucket: rpeToIntensityBucket(rpe),
    });
  }

  return observations;
}

/**
 * Extract recovery observations from training sessions (combat sport sessions).
 * Because TrainingSessions lack preCheckIn data on the *next* session we can
 * only derive limited observations — we use perceivedExertion as RPE and
 * estimate readiness from the gap between sessions.
 */
function extractObservationsFromSessions(sessions: TrainingSession[]): RecoveryObservation[] {
  const sorted = [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const observations: RecoveryObservation[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    const gap = hoursBetween(new Date(current.date), new Date(next.date));
    if (gap < 2 || gap > 168) continue;

    // Without a check-in we estimate readiness: if the user trained again at
    // this gap it implies they felt ready. Assume 70 baseline (threshold)
    // with a slight boost for longer gaps (more recovery).
    const estimatedReadiness = clamp(70 + (gap - 24) * 0.5, 50, 95);

    const rpe = current.perceivedExertion ?? 6;

    observations.push({
      rpe,
      hoursBetween: gap,
      nextReadiness: estimatedReadiness,
      sleepQuality: null,
      intensityBucket: rpeToIntensityBucket(rpe),
    });
  }

  return observations;
}

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Build a personalized recovery profile by analyzing pairs of consecutive
 * workouts. For each workout we look at the *next* workout's check-in data
 * to infer how quickly the user recovered.
 *
 * @param workoutLogs  - Chronological array of strength/gym workout logs.
 * @param trainingSessions - Chronological array of combat-sport / cardio sessions.
 * @returns A `RecoveryProfile` capturing the user's individual recovery curve.
 */
export function buildRecoveryProfile(
  workoutLogs: WorkoutLog[],
  trainingSessions: TrainingSession[],
): RecoveryProfile {
  const logObs = extractObservationsFromLogs(workoutLogs);
  const sessionObs = extractObservationsFromSessions(trainingSessions);
  const allObs = [...logObs, ...sessionObs];

  // ---- Defaults (population averages used when data is sparse) ----
  const defaults: RecoveryProfile = {
    userId: '',
    avgRecoveryHours: 48,
    recoveryByIntensity: { light: 24, moderate: 36, hard: 48, max: 72 },
    sorenessSensitivity: 0.5,
    sleepImpact: 0.5,
    ageDecayFactor: 1.0,
    dataPoints: 0,
    confidence: 'low',
    lastUpdated: new Date().toISOString(),
  };

  if (allObs.length === 0) {
    return defaults;
  }

  // ---- Estimate recovery hours per intensity bucket ----
  // For each observation we estimate "time to full recovery" by extrapolating
  // from the readiness observed at the gap time using the exponential model:
  //   readiness = 100 * (1 - e^(-t / tau))
  //   tau = -t / ln(1 - readiness/100)
  // We clamp tau to avoid degenerate values.
  const bucketTaus: Record<keyof RecoveryProfile['recoveryByIntensity'], number[]> = {
    light: [],
    moderate: [],
    hard: [],
    max: [],
  };

  const allTaus: number[] = [];
  const sleepPairs: { sleepQuality: number; tau: number }[] = [];
  const sorenessPairs: { readiness: number; tau: number }[] = [];

  for (const obs of allObs) {
    if (isNaN(obs.nextReadiness) || isNaN(obs.hoursBetween) || obs.hoursBetween <= 0) continue;
    const readinessRatio = clamp(obs.nextReadiness / 100, 0.01, 0.99);
    const tau = -obs.hoursBetween / Math.log(1 - readinessRatio);
    if (!isFinite(tau) || isNaN(tau)) continue; // Skip degenerate data
    const clampedTau = clamp(tau, 4, 168); // between 4 hours and 7 days

    bucketTaus[obs.intensityBucket].push(clampedTau);
    allTaus.push(clampedTau);

    if (obs.sleepQuality !== null) {
      sleepPairs.push({ sleepQuality: obs.sleepQuality, tau: clampedTau });
    }
    sorenessPairs.push({ readiness: obs.nextReadiness, tau: clampedTau });
  }

  const mean = (arr: number[]): number =>
    arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

  const avgRecoveryHours = mean(allTaus);

  const recoveryByIntensity = {
    light: bucketTaus.light.length > 0 ? mean(bucketTaus.light) : defaults.recoveryByIntensity.light,
    moderate: bucketTaus.moderate.length > 0 ? mean(bucketTaus.moderate) : defaults.recoveryByIntensity.moderate,
    hard: bucketTaus.hard.length > 0 ? mean(bucketTaus.hard) : defaults.recoveryByIntensity.hard,
    max: bucketTaus.max.length > 0 ? mean(bucketTaus.max) : defaults.recoveryByIntensity.max,
  };

  // ---- Sleep impact (correlation between sleep quality and recovery speed) ----
  // Compute Pearson r between sleep quality and the *inverse* of tau (faster
  // recovery = smaller tau). A strong negative correlation between sleep quality
  // and tau means sleep matters a lot.
  let sleepImpact = defaults.sleepImpact;
  if (sleepPairs.length >= 5) {
    const sqArr = sleepPairs.map((p) => p.sleepQuality);
    const tauArr = sleepPairs.map((p) => p.tau);
    const sqMean = mean(sqArr);
    const tauMean = mean(tauArr);

    let numerator = 0;
    let denomSq = 0;
    let denomTau = 0;
    for (let i = 0; i < sleepPairs.length; i++) {
      const dSq = sqArr[i] - sqMean;
      const dTau = tauArr[i] - tauMean;
      numerator += dSq * dTau;
      denomSq += dSq * dSq;
      denomTau += dTau * dTau;
    }
    const denom = Math.sqrt(denomSq * denomTau);
    if (denom > 0) {
      // r will be negative when good sleep → lower tau (faster recovery).
      // We want sleepImpact 0-1 where 1 = "sleep matters a lot".
      const r = numerator / denom;
      sleepImpact = clamp(Math.abs(r), 0, 1);
    }
  }

  // ---- Soreness sensitivity ----
  // How much does low readiness (high soreness) at the next session correlate
  // with longer recovery times? We use the correlation between nextReadiness
  // and tau — a strong negative correlation means soreness predicts slow recovery.
  let sorenessSensitivity = defaults.sorenessSensitivity;
  if (sorenessPairs.length >= 5) {
    const rArr = sorenessPairs.map((p) => p.readiness);
    const tArr = sorenessPairs.map((p) => p.tau);
    const rMean = mean(rArr);
    const tMean = mean(tArr);

    let numerator = 0;
    let denomR = 0;
    let denomT = 0;
    for (let i = 0; i < sorenessPairs.length; i++) {
      const dR = rArr[i] - rMean;
      const dT = tArr[i] - tMean;
      numerator += dR * dT;
      denomR += dR * dR;
      denomT += dT * dT;
    }
    const denom = Math.sqrt(denomR * denomT);
    if (denom > 0) {
      const r = numerator / denom;
      // Negative r → higher soreness (lower readiness) correlates with longer tau.
      sorenessSensitivity = clamp(Math.abs(r), 0, 1);
    }
  }

  // ---- Age decay factor ----
  // Without explicit age data we infer from average recovery time relative to
  // population baseline. If the user consistently takes longer than 48h, the
  // factor increases.
  const ageDecayFactor = clamp(avgRecoveryHours / 48, 0.5, 2.0);

  return {
    userId: '',
    avgRecoveryHours,
    recoveryByIntensity,
    sorenessSensitivity,
    sleepImpact,
    ageDecayFactor,
    dataPoints: allObs.length,
    confidence: confidenceFromCount(allObs.length),
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Project readiness at one or more future time points using the user's
 * personalized recovery profile.
 *
 * Uses an exponential recovery curve:
 *   readiness = 100 * (1 - e^(-t / tau))
 * where `tau` (time constant) is pulled from the profile and adjusted for
 * current sleep quality and soreness.
 *
 * @param currentState - Snapshot of the user's current recovery-relevant state.
 * @param profile      - The user's learned recovery profile.
 * @param hoursAhead   - Array of future time points (hours from now) to project.
 * @returns An array of `ReadinessProjection` — one per requested hour.
 */
export function projectReadiness(
  currentState: {
    lastWorkoutDate: string;
    lastWorkoutRPE: number;
    lastWorkoutVolume: number;
    sleepQuality?: number;
    soreness?: number;
  },
  profile: RecoveryProfile,
  hoursAhead: number[],
): ReadinessProjection[] {
  const bucket = rpeToIntensityBucket(currentState.lastWorkoutRPE);
  let tau = profile.recoveryByIntensity[bucket];

  // --- Adjust tau for sleep quality ---
  // sleepQuality 1-5: 3 is neutral, below 3 lengthens tau, above 3 shortens it.
  if (currentState.sleepQuality != null) {
    const sleepDelta = (currentState.sleepQuality - 3) / 2; // range: -1 to +1
    // Scale by profile's sleep impact factor: high impact → bigger adjustment.
    tau *= 1 - sleepDelta * profile.sleepImpact * 0.3;
  }

  // --- Adjust tau for current soreness ---
  // soreness 1-5: 1 = no soreness (good), 5 = severe (bad).
  if (currentState.soreness != null) {
    const sorenessDelta = (currentState.soreness - 3) / 2; // -1 to +1
    // Positive delta = more sore → increase tau (slower recovery).
    tau *= 1 + sorenessDelta * profile.sorenessSensitivity * 0.3;
  }

  // Ensure tau stays reasonable after adjustments.
  tau = clamp(tau, 4, 168);

  // Elapsed time since last workout.
  const elapsedHours = hoursBetween(new Date(currentState.lastWorkoutDate), new Date());

  return hoursAhead.map((h) => {
    const totalHours = elapsedHours + h;
    const readiness = 100 * (1 - Math.exp(-totalHours / tau));

    return {
      hoursFromNow: h,
      projectedReadiness: clamp(Math.round(readiness * 10) / 10, 0, 100),
      confidence: projectionConfidence(profile, h),
    };
  });
}

/**
 * Find the optimal training window — when the user will be recovered enough
 * to train productively again.
 *
 * @param currentState  - Minimal snapshot of the user's current state.
 * @param profile       - The user's learned recovery profile.
 * @param minReadiness  - The readiness threshold to consider "ready" (default 70).
 * @returns A `RecoveryWindow` with estimated hours, optimal window, and current readiness.
 */
export function findOptimalTrainingWindow(
  currentState: {
    lastWorkoutDate: string;
    lastWorkoutRPE: number;
    soreness?: number;
  },
  profile: RecoveryProfile,
  minReadiness: number = 70,
): RecoveryWindow {
  const rpe = currentState.lastWorkoutRPE ?? 6;
  const bucket = rpeToIntensityBucket(rpe);
  let tau = profile.recoveryByIntensity[bucket] || 48; // Fallback to 48h if missing

  // Adjust tau for soreness.
  if (currentState.soreness != null && !isNaN(currentState.soreness)) {
    const sorenessDelta = (currentState.soreness - 3) / 2;
    tau *= 1 + sorenessDelta * profile.sorenessSensitivity * 0.3;
  }
  if (!isFinite(tau) || isNaN(tau)) tau = 48; // Hard fallback
  tau = clamp(tau, 4, 168);

  const parsedDate = new Date(currentState.lastWorkoutDate);
  const elapsedHours = isNaN(parsedDate.getTime()) ? 48 : hoursBetween(parsedDate, new Date());

  // Current readiness.
  const currentReadiness = clamp(
    100 * (1 - Math.exp(-elapsedHours / tau)),
    0,
    100,
  );

  // Solve for t where readiness >= minReadiness:
  //   minReadiness = 100 * (1 - e^(-t / tau))
  //   t = -tau * ln(1 - minReadiness / 100)
  const targetRatio = clamp(minReadiness / 100, 0.01, 0.99);
  const totalHoursNeeded = -tau * Math.log(1 - targetRatio);
  const hoursUntilReady = Math.max(0, totalHoursNeeded - elapsedHours);

  // Optimal window: from when readiness hits the threshold to when it reaches
  // ~90% (sweet spot before full supercompensation fades). The upper bound uses
  // the 90% readiness solve.
  const upperRatio = clamp(0.90, targetRatio + 0.01, 0.99);
  const totalHoursUpper = -tau * Math.log(1 - upperRatio);
  const hoursUntilUpper = Math.max(hoursUntilReady, totalHoursUpper - elapsedHours);

  return {
    estimatedRecoveryTime: Math.round(hoursUntilReady * 10) / 10,
    optimalTrainingWindow: {
      start: Math.round(hoursUntilReady * 10) / 10,
      end: Math.round(hoursUntilUpper * 10) / 10,
    },
    currentReadiness: Math.round(currentReadiness * 10) / 10,
  };
}

/**
 * Incrementally update an existing recovery profile with a single new data
 * point, using an exponential moving average (EMA) with a 10 % weight on the
 * new observation. This prevents noisy individual sessions from distorting the
 * learned curve while still allowing the profile to adapt over time.
 *
 * @param existing     - The current recovery profile.
 * @param newDataPoint - A single new recovery observation.
 * @returns A new `RecoveryProfile` incorporating the observation.
 */
export function updateRecoveryProfile(
  existing: RecoveryProfile,
  newDataPoint: {
    workoutRPE: number;
    hoursBetween: number;
    nextReadiness: number;
    sleepQuality?: number;
  },
): RecoveryProfile {
  const alpha = 0.1; // EMA weight for new data

  // Derive tau from the new data point.
  const readinessRatio = clamp(newDataPoint.nextReadiness / 100, 0.01, 0.99);
  const newTau = clamp(
    -newDataPoint.hoursBetween / Math.log(1 - readinessRatio),
    4,
    168,
  );

  // Update overall average.
  const avgRecoveryHours = existing.avgRecoveryHours * (1 - alpha) + newTau * alpha;

  // Update the relevant intensity bucket.
  const bucket = rpeToIntensityBucket(newDataPoint.workoutRPE);
  const recoveryByIntensity = { ...existing.recoveryByIntensity };
  recoveryByIntensity[bucket] = recoveryByIntensity[bucket] * (1 - alpha) + newTau * alpha;

  // Update sleep impact if sleep data is provided.
  let sleepImpact = existing.sleepImpact;
  if (newDataPoint.sleepQuality != null) {
    // If sleep was good (4-5) and recovery was fast (tau < avg), sleep matters.
    // If sleep was bad (1-2) and recovery was slow, sleep matters.
    // We nudge sleepImpact toward 1 when these correlations hold, toward 0 otherwise.
    const sleepGood = newDataPoint.sleepQuality >= 4;
    const recoveryFast = newTau < existing.avgRecoveryHours;
    const correlated = (sleepGood && recoveryFast) || (!sleepGood && !recoveryFast);
    const nudgeTarget = correlated ? 1.0 : 0.0;
    sleepImpact = clamp(existing.sleepImpact * (1 - alpha) + nudgeTarget * alpha, 0, 1);
  }

  // Update soreness sensitivity.
  // If the user came in with low readiness and recovery was slow, soreness matters.
  const lowReadiness = newDataPoint.nextReadiness < 60;
  const slowRecovery = newTau > existing.avgRecoveryHours;
  const sorenessCorrelated = (lowReadiness && slowRecovery) || (!lowReadiness && !slowRecovery);
  const sorenessTarget = sorenessCorrelated ? 1.0 : 0.0;
  const sorenessSensitivity = clamp(
    existing.sorenessSensitivity * (1 - alpha) + sorenessTarget * alpha,
    0,
    1,
  );

  // Age decay factor shifts with overall average recovery.
  const ageDecayFactor = clamp(avgRecoveryHours / 48, 0.5, 2.0);

  const dataPoints = existing.dataPoints + 1;

  return {
    ...existing,
    avgRecoveryHours,
    recoveryByIntensity,
    sorenessSensitivity,
    sleepImpact,
    ageDecayFactor,
    dataPoints,
    confidence: confidenceFromCount(dataPoints),
    lastUpdated: new Date().toISOString(),
  };
}
