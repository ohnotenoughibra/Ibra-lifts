/**
 * Concurrent Training Engine — Combat Sport / Lifting Interference Management
 *
 * Makes combat sport training a first-class citizen in programming decisions.
 * When a user logs a hard sparring session, the next day's lifting is
 * automatically adjusted for volume, intensity, and exercise selection.
 *
 * Pure functions only — no React, no store, no side effects.
 *
 * Science references:
 * - Wilson et al. 2012: Meta-analysis of concurrent training interference
 * - Gabbett 2016: ACWR (Acute:Chronic Workload Ratio) and injury risk
 * - Hickson 1980: Interference effect in concurrent strength/endurance training
 * - Doma & Deakin 2013: Residual fatigue from aerobic training on strength
 * - Schumann et al. 2015: Order effects in concurrent training
 * - Murlasits et al. 2018: 6-8 hours between sessions eliminates interference
 */

import type {
  TrainingSession,
  TrainingIntensity,
  ActivityCategory,
  WorkoutType,
} from '@/lib/types';

// ─── Exported Types ─────────────────────────────────────────────────────────

/** Describes the type of neuromuscular fatigue induced by a combat session. */
export type FatigueType = 'central' | 'peripheral' | 'both';

/** Risk classification for acute:chronic workload ratio. */
export type ACRRiskLevel = 'undertrained' | 'optimal' | 'caution' | 'danger';

/** Quantified fatigue footprint of a single combat training session. */
export interface SportLoadScore {
  /** Composite load score normalized to 0-100. */
  score: number;
  /** Whether fatigue is central nervous system, peripheral (muscular), or both. */
  fatigueType: FatigueType;
  /** Muscle groups most heavily taxed by this session. */
  peakMuscleGroups: string[];
}

/** A single day's load contribution within a rolling window. */
export interface DailyLoad {
  /** ISO date string (YYYY-MM-DD). */
  date: string;
  /** Summed sport load score for that day. */
  load: number;
}

/** Cumulative sport load across a rolling time window with ACWR analysis. */
export interface CumulativeLoad {
  /** Raw sum of all decayed loads in the window. */
  totalLoad: number;
  /** Per-day breakdown of loads. */
  dailyLoads: DailyLoad[];
  /** Rolling 7-day average load (acute). */
  acuteLoad: number;
  /** Rolling 28-day average load (chronic). */
  chronicLoad: number;
  /** Acute : Chronic workload ratio. */
  acuteChronicRatio: number;
  /** Risk classification derived from the ACR. */
  riskLevel: ACRRiskLevel;
}

/** Per-muscle-group volume/intensity modifier for a planned lifting session. */
export interface MuscleGroupAdjustment {
  /** Muscle group identifier (e.g. 'grip', 'shoulders', 'core'). */
  muscleGroup: string;
  /** Multiplier for working sets (e.g. 0.75 = 25% reduction). */
  volumeMultiplier: number;
  /** Multiplier for load / RPE (e.g. 0.92 = 8% reduction). */
  intensityMultiplier: number;
  /** Human-readable reason for the adjustment. */
  reason: string;
}

/** Complete set of adjustments to apply to a planned lifting session. */
export interface SessionAdjustment {
  /** Overall volume multiplier (worst-case across muscle groups). */
  overallVolumeMultiplier: number;
  /** Overall intensity multiplier (worst-case across muscle groups). */
  overallIntensityMultiplier: number;
  /** Per-muscle-group adjustments. */
  muscleGroupAdjustments: MuscleGroupAdjustment[];
  /** Human-readable warnings or coaching notes. */
  warnings: string[];
  /** Whether the session should be skipped entirely (extreme fatigue). */
  shouldSkip: boolean;
}

/** A recommended lifting slot within a weekly schedule. */
export interface LiftingSlot {
  /** Day of the week (0 = Sunday, 6 = Saturday). */
  day: number;
  /** Recommended workout type for this slot. */
  recommended: WorkoutType;
  /** Human-readable reason for the recommendation. */
  reason: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * Category multipliers reflect full-body demand.
 * Grappling involves wrestling, gripping, and ground work (high full-body load).
 * MMA combines both striking and grappling, so it is the highest.
 * Cardio and recovery are substantially lower.
 */
const CATEGORY_MULTIPLIERS: Record<ActivityCategory, number> = {
  grappling: 1.2,
  striking: 1.0,
  mma: 1.3,
  cardio: 0.6,
  outdoor: 0.7,
  recovery: 0.2,
  other: 0.5,
};

/**
 * Intensity multipliers scale the raw load.
 * Competition prep exceeds hard sparring because it adds psychological stress
 * and often involves multiple rounds with full intent.
 */
const INTENSITY_MULTIPLIERS: Record<TrainingIntensity, number> = {
  light_flow: 0.4,
  moderate: 0.7,
  hard_sparring: 1.0,
  competition_prep: 1.2,
};

/**
 * Fatigue type by activity category.
 * Central fatigue = CNS depression (reaction time, coordination).
 * Peripheral fatigue = local muscular (grip failure, shoulder burn).
 */
const FATIGUE_TYPE_MAP: Record<ActivityCategory, FatigueType> = {
  grappling: 'both',
  striking: 'peripheral',
  mma: 'both',
  cardio: 'peripheral',
  outdoor: 'peripheral',
  recovery: 'peripheral',
  other: 'peripheral',
};

/**
 * Peak muscle groups taxed by each activity category.
 * Used to drive targeted volume adjustments in lifting sessions.
 */
const PEAK_MUSCLE_GROUPS: Record<ActivityCategory, string[]> = {
  grappling: ['grip', 'posterior_chain', 'core'],
  striking: ['shoulders', 'core', 'calves'],
  mma: ['full_body'],
  cardio: ['quads', 'calves', 'core'],
  outdoor: ['quads', 'core'],
  recovery: [],
  other: [],
};

/**
 * Normalization constant for the score formula.
 * A 90-minute hard sparring MMA session should land near the top (~100).
 * Formula: duration × intensityMult × categoryMult, then normalize.
 * Max raw ≈ 90 × 1.2 × 1.3 = 140.4 → we use 140 as the ceiling.
 */
const SCORE_NORMALIZATION_CEILING = 140;

/** Number of days in the acute load window. */
const ACUTE_WINDOW_DAYS = 7;

/** Number of days in the chronic load window. */
const CHRONIC_WINDOW_DAYS = 28;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Returns the effective intensity of a session, preferring actual over planned.
 */
function getEffectiveIntensity(session: TrainingSession): TrainingIntensity {
  return session.actualIntensity ?? session.plannedIntensity;
}

/**
 * Strips time from a Date and returns an ISO date string (YYYY-MM-DD).
 */
function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Calculates the number of whole days between two dates (ignoring time).
 */
function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86_400_000;
  const aDay = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bDay = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.abs(Math.round((bDay - aDay) / msPerDay));
}

/**
 * Exponential decay factor for a session N days ago.
 * Half-life of ~2 days: weight = e^(-0.35 × daysAgo)
 * This means a session from yesterday still has ~70% weight,
 * while a session from 4 days ago has ~25%.
 */
function decayWeight(daysAgo: number): number {
  return Math.exp(-0.35 * daysAgo);
}

/**
 * Clamps a number to a given range.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Computes the interference attenuation factor based on time separation
 * between a sport session and a lifting session on the same day.
 *
 * Murlasits et al. 2018: 6-8 hours between sessions eliminates interference
 * Schumann et al. 2015: Strength before endurance attenuates interference
 *
 * @param sportSessionHour - Hour of day (0-23) the sport session started, or undefined if unknown.
 * @param liftingSessionHour - Hour of day (0-23) the lifting session starts, or undefined if unknown.
 * @returns A multiplier for the volume/intensity reduction:
 *          0.0 = full elimination (no interference — 6+ hours apart)
 *          0.5 = partial attenuation (3-6 hours apart)
 *          1.0 = full interference (< 3 hours apart or timing unknown)
 */
function getTimeSeparationFactor(
  sportSessionHour: number | undefined,
  liftingSessionHour: number | undefined,
): number {
  // If either hour is unavailable, assume worst case (full interference)
  if (sportSessionHour == null || liftingSessionHour == null) {
    return 1.0;
  }

  const hoursBetween = Math.abs(liftingSessionHour - sportSessionHour);

  if (hoursBetween >= 6) {
    // Murlasits et al. 2018: 6-8 hours separation eliminates interference
    return 0.0;
  } else if (hoursBetween >= 3) {
    // Partial attenuation — linear interpolation from 1.0 at 3h to 0.0 at 6h
    return 1.0 - (hoursBetween - 3) / 3;
  } else {
    // < 3 hours: full interference
    return 1.0;
  }
}

// ─── Core Functions ─────────────────────────────────────────────────────────

/**
 * Quantifies the fatigue footprint of a single combat training session.
 *
 * The score is computed as: `duration × intensityMultiplier × categoryMultiplier`,
 * then normalized to a 0-100 scale. Perceived exertion (RPE) acts as a modifier
 * to account for individual variance — sessions with RPE above 5 push the score
 * slightly higher, while easy sessions pull it down.
 *
 * @param session - A completed or planned combat training session.
 * @returns A SportLoadScore with a 0-100 score, fatigue type, and peak muscle groups.
 *
 * @example
 * ```ts
 * const score = calculateSportLoadScore({
 *   id: '1', date: new Date(), category: 'grappling',
 *   type: 'bjj_nogi', plannedIntensity: 'hard_sparring',
 *   duration: 60, perceivedExertion: 8,
 * });
 * // score.score ≈ 61, fatigueType 'both', peakMuscleGroups ['grip', 'posterior_chain', 'core']
 * ```
 */
export function calculateSportLoadScore(session: TrainingSession): SportLoadScore {
  const intensity = getEffectiveIntensity(session);
  const intensityMult = INTENSITY_MULTIPLIERS[intensity];
  const categoryMult = CATEGORY_MULTIPLIERS[session.category];

  // Base load: duration scaled by intensity and category
  const rawLoad = session.duration * intensityMult * categoryMult;

  // RPE modifier: RPE 5 is neutral (1.0×), RPE 10 is +20%, RPE 1 is -20%
  const rpeMod = 1 + (session.perceivedExertion - 5) * 0.04;

  // Normalize to 0-100 with RPE adjustment
  const normalizedScore = (rawLoad / SCORE_NORMALIZATION_CEILING) * 100 * rpeMod;
  const score = clamp(Math.round(normalizedScore * 10) / 10, 0, 100);

  return {
    score,
    fatigueType: FATIGUE_TYPE_MAP[session.category],
    peakMuscleGroups: [...PEAK_MUSCLE_GROUPS[session.category]],
  };
}

/**
 * Calculates cumulative sport load over a rolling window with exponential decay.
 *
 * More recent sessions contribute more to the total load. The function also
 * computes the Acute:Chronic Workload Ratio (ACWR) using 7-day (acute) and
 * 28-day (chronic) rolling windows, a well-validated injury risk metric
 * (Gabbett 2016).
 *
 * @param sessions - All training sessions in the relevant time frame.
 * @param windowDays - Number of days to look back (default 28).
 * @returns CumulativeLoad with total, daily breakdown, ACWR, and risk level.
 *
 * @example
 * ```ts
 * const load = calculateCumulativeSportLoad(recentSessions, 28);
 * if (load.riskLevel === 'danger') {
 *   // Recommend a deload or rest day
 * }
 * ```
 */
export function calculateCumulativeSportLoad(
  sessions: TrainingSession[],
  windowDays: number = CHRONIC_WINDOW_DAYS,
): CumulativeLoad {
  const now = new Date();
  const effectiveWindow = Math.max(windowDays, CHRONIC_WINDOW_DAYS);

  // Filter sessions within the window
  const windowSessions = sessions.filter((s) => {
    const daysAgo = daysBetween(new Date(s.date), now);
    return daysAgo <= effectiveWindow;
  });

  // Build per-day load map
  const dailyLoadMap = new Map<string, number>();

  // Initialize all days in the window
  for (let i = 0; i < effectiveWindow; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dailyLoadMap.set(toDateKey(d), 0);
  }

  // Sum session scores into their respective days
  for (const session of windowSessions) {
    const { score } = calculateSportLoadScore(session);
    const key = toDateKey(new Date(session.date));
    const existing = dailyLoadMap.get(key) ?? 0;
    dailyLoadMap.set(key, existing + score);
  }

  // Build daily loads array and compute decayed total
  const dailyLoads: DailyLoad[] = [];
  let totalLoad = 0;

  dailyLoadMap.forEach((load, dateStr) => {
    dailyLoads.push({ date: dateStr, load });
    const daysAgo = daysBetween(new Date(dateStr), now);
    totalLoad += load * decayWeight(daysAgo);
  });

  // Sort daily loads chronologically
  dailyLoads.sort((a, b) => a.date.localeCompare(b.date));

  // Acute load: average daily load over the last 7 days
  const acuteDays = dailyLoads.filter((d) => {
    const daysAgo = daysBetween(new Date(d.date), now);
    return daysAgo < ACUTE_WINDOW_DAYS;
  });
  const acuteLoad = acuteDays.length > 0
    ? acuteDays.reduce((sum, d) => sum + d.load, 0) / ACUTE_WINDOW_DAYS
    : 0;

  // Chronic load: average daily load over the last 28 days
  const chronicDays = dailyLoads.filter((d) => {
    const daysAgo = daysBetween(new Date(d.date), now);
    return daysAgo < CHRONIC_WINDOW_DAYS;
  });
  const chronicLoad = chronicDays.length > 0
    ? chronicDays.reduce((sum, d) => sum + d.load, 0) / CHRONIC_WINDOW_DAYS
    : 0;

  // ACWR — guard against division by zero
  const acuteChronicRatio = chronicLoad > 0
    ? Math.round((acuteLoad / chronicLoad) * 100) / 100
    : 0;

  // Risk classification (Gabbett 2016 thresholds)
  let riskLevel: ACRRiskLevel;
  if (acuteChronicRatio < 0.8) {
    riskLevel = 'undertrained';
  } else if (acuteChronicRatio <= 1.3) {
    riskLevel = 'optimal';
  } else if (acuteChronicRatio <= 1.5) {
    riskLevel = 'caution';
  } else {
    riskLevel = 'danger';
  }

  return {
    totalLoad: Math.round(totalLoad * 10) / 10,
    dailyLoads,
    acuteLoad: Math.round(acuteLoad * 10) / 10,
    chronicLoad: Math.round(chronicLoad * 10) / 10,
    acuteChronicRatio,
    riskLevel,
  };
}

/**
 * Computes volume and intensity adjustments for a planned lifting session
 * based on recent combat training.
 *
 * Examines sessions within the last 48 hours and determines how much each
 * muscle group has been fatigued. Hard sparring the previous day triggers
 * significant reductions; same-day combat before lifting triggers moderate
 * reductions; light flow sessions are essentially free.
 *
 * @param recentSessions - Combat sessions from the last 48 hours.
 * @param plannedWorkout - The planned lifting session with its type and muscle groups.
 * @returns SessionAdjustment with per-muscle-group modifiers and coaching warnings.
 *
 * @example
 * ```ts
 * const adjustments = getSessionAdjustments(last48hSessions, {
 *   type: 'strength',
 *   exercises: [{ muscleGroups: ['back', 'biceps', 'grip'] }],
 * });
 * // If hard grappling yesterday, grip/back exercises get ~25% volume cut
 * ```
 */
export function getSessionAdjustments(
  recentSessions: TrainingSession[],
  plannedWorkout: { type: string; exercises: { muscleGroups: string[] }[] },
  /** Hour of day (0-23) the lifting session is planned. Used for time-separation interference attenuation. */
  liftingSessionHour?: number,
): SessionAdjustment {
  const now = new Date();

  if (recentSessions.length === 0) {
    return {
      overallVolumeMultiplier: 1.0,
      overallIntensityMultiplier: 1.0,
      muscleGroupAdjustments: [],
      warnings: [],
      shouldSkip: false,
    };
  }

  // Collect all unique muscle groups from the planned workout
  const targetMuscleGroups = new Set<string>();
  for (const exercise of plannedWorkout.exercises) {
    for (const mg of exercise.muscleGroups) {
      targetMuscleGroups.add(mg.toLowerCase());
    }
  }

  // Analyze each recent session's impact
  const muscleGroupImpact = new Map<string, { volumeReduction: number; intensityReduction: number; reasons: string[] }>();

  for (const session of recentSessions) {
    const intensity = getEffectiveIntensity(session);
    const daysAgo = daysBetween(new Date(session.date), now);
    const isSameDay = daysAgo === 0;
    const isYesterday = daysAgo === 1;
    const isTwoDaysAgo = daysAgo === 2;

    // Light flow sessions get no adjustment
    if (intensity === 'light_flow') {
      continue;
    }

    // Base adjustments by recency and intensity
    let baseVolumeReduction: number;
    let baseIntensityReduction: number;
    let timingLabel: string;

    if (isSameDay && session.timing === 'before_lifting') {
      // Same-day combat before lifting: 15-25% volume reduction (pre-attenuation)
      // Murlasits et al. 2018: 6-8 hours between sessions eliminates interference
      // Schumann et al. 2015: Strength before endurance attenuates interference
      const separationFactor = getTimeSeparationFactor(session.sessionHour, liftingSessionHour);

      if (separationFactor === 0) {
        timingLabel = 'same-day (6h+ separation — no interference)';
        baseVolumeReduction = 0;
        baseIntensityReduction = 0;
      } else {
        timingLabel = separationFactor < 1
          ? `same-day (before lifting, ${Math.round((1 - separationFactor) * 100)}% attenuation from time separation)`
          : 'same-day (before lifting)';

        if (intensity === 'competition_prep') {
          baseVolumeReduction = 0.25 * separationFactor;
          baseIntensityReduction = 0.10 * separationFactor;
        } else if (intensity === 'hard_sparring') {
          baseVolumeReduction = 0.22 * separationFactor;
          baseIntensityReduction = 0.08 * separationFactor;
        } else {
          // moderate
          baseVolumeReduction = 0.15 * separationFactor;
          baseIntensityReduction = 0.05 * separationFactor;
        }
      }
    } else if (isSameDay) {
      // Same-day but separate or after lifting
      // Murlasits et al. 2018: 6-8 hours between sessions eliminates interference
      // Schumann et al. 2015: Strength before endurance attenuates interference
      const separationFactor = getTimeSeparationFactor(session.sessionHour, liftingSessionHour);

      if (separationFactor === 0) {
        timingLabel = 'same-day (6h+ separation — no interference)';
        baseVolumeReduction = 0;
        baseIntensityReduction = 0;
      } else {
        timingLabel = separationFactor < 1
          ? `same-day (${Math.round((1 - separationFactor) * 100)}% attenuation from time separation)`
          : 'same-day';

        if (intensity === 'competition_prep') {
          baseVolumeReduction = 0.20 * separationFactor;
          baseIntensityReduction = 0.08 * separationFactor;
        } else if (intensity === 'hard_sparring') {
          baseVolumeReduction = 0.18 * separationFactor;
          baseIntensityReduction = 0.07 * separationFactor;
        } else {
          baseVolumeReduction = 0.12 * separationFactor;
          baseIntensityReduction = 0.04 * separationFactor;
        }
      }
    } else if (isYesterday) {
      // Hard sparring yesterday: 20-30% volume, 5-10% intensity
      timingLabel = 'yesterday';
      if (intensity === 'competition_prep') {
        baseVolumeReduction = 0.30;
        baseIntensityReduction = 0.10;
      } else if (intensity === 'hard_sparring') {
        baseVolumeReduction = 0.25;
        baseIntensityReduction = 0.08;
      } else {
        // moderate yesterday
        baseVolumeReduction = 0.12;
        baseIntensityReduction = 0.04;
      }
    } else if (isTwoDaysAgo) {
      // 2 days ago: residual fatigue, smaller adjustment
      timingLabel = '2 days ago';
      if (intensity === 'competition_prep') {
        baseVolumeReduction = 0.15;
        baseIntensityReduction = 0.05;
      } else if (intensity === 'hard_sparring') {
        baseVolumeReduction = 0.10;
        baseIntensityReduction = 0.03;
      } else {
        baseVolumeReduction = 0.05;
        baseIntensityReduction = 0.02;
      }
    } else {
      // Beyond 48h, no meaningful adjustment needed
      continue;
    }

    // Determine which muscle groups this session hit
    const sessionPeakGroups = PEAK_MUSCLE_GROUPS[session.category];

    // Apply adjustments to each target muscle group
    for (const mg of Array.from(targetMuscleGroups)) {
      const current = muscleGroupImpact.get(mg) ?? { volumeReduction: 0, intensityReduction: 0, reasons: [] };

      // If the muscle group overlaps with the session's peak groups, apply full reduction.
      // Otherwise apply a smaller "systemic fatigue" reduction.
      const isDirectOverlap = sessionPeakGroups.includes(mg) || sessionPeakGroups.includes('full_body');

      // Generalized overlap: map common aliases
      const overlapAliases: Record<string, string[]> = {
        grip: ['forearms', 'grip', 'biceps'],
        posterior_chain: ['back', 'hamstrings', 'glutes', 'posterior_chain', 'erectors'],
        core: ['core', 'abs', 'obliques'],
        shoulders: ['shoulders', 'delts', 'front_delts', 'rear_delts'],
        calves: ['calves'],
        quads: ['quads', 'legs'],
        full_body: [],
      };

      let hasOverlap = isDirectOverlap;
      if (!hasOverlap) {
        for (const peakGroup of sessionPeakGroups) {
          const aliases = overlapAliases[peakGroup] ?? [];
          if (aliases.includes(mg)) {
            hasOverlap = true;
            break;
          }
        }
      }

      let volumeReduction: number;
      let intensityReduction: number;

      if (hasOverlap) {
        // Direct overlap: full reduction
        volumeReduction = baseVolumeReduction;
        intensityReduction = baseIntensityReduction;
      } else {
        // No direct overlap: systemic fatigue only (30% of base)
        volumeReduction = baseVolumeReduction * 0.3;
        intensityReduction = baseIntensityReduction * 0.3;
      }

      // Stack reductions (diminishing returns — don't just add linearly)
      const combinedVolume = 1 - (1 - current.volumeReduction) * (1 - volumeReduction);
      const combinedIntensity = 1 - (1 - current.intensityReduction) * (1 - intensityReduction);

      const overlapLabel = hasOverlap ? 'direct overlap' : 'systemic fatigue';
      current.volumeReduction = combinedVolume;
      current.intensityReduction = combinedIntensity;
      current.reasons.push(
        `${session.category} (${intensity}) ${timingLabel} — ${overlapLabel}`,
      );

      muscleGroupImpact.set(mg, current);
    }
  }

  // Build per-muscle-group adjustments
  const muscleGroupAdjustments: MuscleGroupAdjustment[] = [];

  muscleGroupImpact.forEach((impact, mg) => {
    // Only create an adjustment entry if there's a meaningful reduction
    if (impact.volumeReduction > 0.01 || impact.intensityReduction > 0.01) {
      muscleGroupAdjustments.push({
        muscleGroup: mg,
        volumeMultiplier: Math.round((1 - impact.volumeReduction) * 100) / 100,
        intensityMultiplier: Math.round((1 - impact.intensityReduction) * 100) / 100,
        reason: impact.reasons.join('; '),
      });
    }
  });

  // Sort by largest volume reduction first
  muscleGroupAdjustments.sort((a, b) => a.volumeMultiplier - b.volumeMultiplier);

  // Overall multipliers = worst-case across all muscle groups
  const overallVolumeMultiplier = muscleGroupAdjustments.length > 0
    ? Math.min(...muscleGroupAdjustments.map((a) => a.volumeMultiplier))
    : 1.0;
  const overallIntensityMultiplier = muscleGroupAdjustments.length > 0
    ? Math.min(...muscleGroupAdjustments.map((a) => a.intensityMultiplier))
    : 1.0;

  // Generate warnings
  const warnings: string[] = [];

  if (overallVolumeMultiplier < 0.65) {
    warnings.push(
      'Heavy combat load in the last 48h. Consider a lighter session or active recovery instead.',
    );
  }

  // Check for central fatigue (grappling/MMA) affecting power/strength work
  const hasCentralFatigue = recentSessions.some((s) => {
    const intensity = getEffectiveIntensity(s);
    return (
      FATIGUE_TYPE_MAP[s.category] === 'both' &&
      (intensity === 'hard_sparring' || intensity === 'competition_prep') &&
      daysBetween(new Date(s.date), now) <= 1
    );
  });

  if (hasCentralFatigue && (plannedWorkout.type === 'strength' || plannedWorkout.type === 'power')) {
    warnings.push(
      'Central nervous system fatigue detected from recent grappling/MMA. ' +
      'Heavy strength or power work may be compromised — consider switching to hypertrophy.',
    );
  }

  // Extreme case: should we skip entirely?
  const shouldSkip = overallVolumeMultiplier < 0.50;

  if (shouldSkip) {
    warnings.push(
      'Accumulated combat load is very high. Recommend skipping this lifting session ' +
      'or replacing it with mobility/recovery work.',
    );
  }

  return {
    overallVolumeMultiplier,
    overallIntensityMultiplier,
    muscleGroupAdjustments,
    warnings,
    shouldSkip,
  };
}

/**
 * Given a weekly combat training schedule, suggests optimal days and workout
 * types for lifting sessions.
 *
 * Core scheduling rules:
 * - Never place heavy lifting (strength/power) the day after hard sparring.
 * - Prefer at least 24 hours between any combat session and lifting.
 * - Power days require the most neural freshness — place them furthest from hard combat.
 * - Hypertrophy is the most fatigue-tolerant and can be placed closer to combat.
 *
 * @param combatSchedule - Weekly combat training plan (day 0 = Sunday, 6 = Saturday).
 * @param sessionsPerWeek - Number of lifting sessions to schedule (1-5).
 * @returns Ordered array of LiftingSlots with day, workout type, and reasoning.
 *
 * @example
 * ```ts
 * const slots = suggestLiftingSchedule(
 *   [
 *     { day: 1, intensity: 'moderate', category: 'grappling' },
 *     { day: 3, intensity: 'hard_sparring', category: 'mma' },
 *     { day: 5, intensity: 'moderate', category: 'striking' },
 *   ],
 *   3,
 * );
 * // Returns 3 lifting slots that avoid the day after Wednesday's hard MMA
 * ```
 */
export function suggestLiftingSchedule(
  combatSchedule: { day: number; intensity: TrainingIntensity; category: ActivityCategory }[],
  sessionsPerWeek: number,
): LiftingSlot[] {
  const clampedSessions = clamp(sessionsPerWeek, 1, 5);

  // Build a map of combat load per day (0-6)
  const combatDays = new Map<number, { intensity: TrainingIntensity; category: ActivityCategory }[]>();
  for (const entry of combatSchedule) {
    const day = entry.day % 7;
    const existing = combatDays.get(day) ?? [];
    existing.push(entry);
    combatDays.set(day, existing);
  }

  /**
   * Score each day of the week for lifting suitability.
   * Higher score = better day for lifting.
   */
  interface DayCandidate {
    day: number;
    score: number;
    hasCombat: boolean;
    previousDayIntensity: TrainingIntensity | null;
    nextDayIntensity: TrainingIntensity | null;
    reason: string;
  }

  const candidates: DayCandidate[] = [];

  for (let day = 0; day < 7; day++) {
    const prevDay = (day + 6) % 7;
    const nextDay = (day + 1) % 7;

    const hasCombatToday = combatDays.has(day);
    const prevDaySessions = combatDays.get(prevDay) ?? [];
    const nextDaySessions = combatDays.get(nextDay) ?? [];

    // Find the highest intensity from the previous day
    const prevDayMaxIntensity = getMaxIntensity(prevDaySessions);
    const nextDayMaxIntensity = getMaxIntensity(nextDaySessions);

    let score = 100;
    const reasons: string[] = [];

    // Penalty: combat on the same day
    if (hasCombatToday) {
      score -= 30;
      reasons.push('combat training same day');
    }

    // Penalty: hard/comp sparring the previous day (heaviest penalty)
    if (prevDayMaxIntensity === 'competition_prep') {
      score -= 50;
      reasons.push('competition prep was yesterday');
    } else if (prevDayMaxIntensity === 'hard_sparring') {
      score -= 40;
      reasons.push('hard sparring was yesterday');
    } else if (prevDayMaxIntensity === 'moderate') {
      score -= 15;
      reasons.push('moderate combat was yesterday');
    } else if (prevDayMaxIntensity === 'light_flow') {
      score -= 5;
      reasons.push('light combat was yesterday');
    }

    // Penalty: hard combat the next day (we don't want to be sore for sparring)
    if (nextDayMaxIntensity === 'competition_prep') {
      score -= 20;
      reasons.push('competition prep is tomorrow');
    } else if (nextDayMaxIntensity === 'hard_sparring') {
      score -= 15;
      reasons.push('hard sparring is tomorrow');
    } else if (nextDayMaxIntensity === 'moderate') {
      score -= 5;
      reasons.push('moderate combat is tomorrow');
    }

    // Bonus: clean rest day (no combat today, yesterday, or tomorrow)
    if (!hasCombatToday && prevDayMaxIntensity === null && nextDayMaxIntensity === null) {
      score += 10;
      reasons.push('full rest window — ideal for heavy lifting');
    }

    candidates.push({
      day,
      score,
      hasCombat: hasCombatToday,
      previousDayIntensity: prevDayMaxIntensity,
      nextDayIntensity: nextDayMaxIntensity,
      reason: reasons.join('; ') || 'no conflicts',
    });
  }

  // Sort by score descending, then by day for determinism
  candidates.sort((a, b) => b.score - a.score || a.day - b.day);

  // Pick the top N days
  const selectedDays = candidates.slice(0, clampedSessions);

  // Assign workout types based on freshness
  // Sort selected days by score descending: freshest day gets power, least fresh gets hypertrophy
  const sortedByFreshness = [...selectedDays].sort((a, b) => b.score - a.score);

  const workoutTypeAssignment = new Map<number, { type: WorkoutType; reason: string }>();

  for (let i = 0; i < sortedByFreshness.length; i++) {
    const candidate = sortedByFreshness[i];
    let workoutType: WorkoutType;
    let typeReason: string;

    if (i === 0 && candidate.score >= 70) {
      // Freshest day and reasonably fresh → power (needs most neural drive)
      workoutType = 'power';
      typeReason = 'Freshest available day — best for explosive/power work.';
    } else if (i === 0 && candidate.score < 70) {
      // Even the best day is compromised → default to hypertrophy
      workoutType = 'hypertrophy';
      typeReason = 'No truly fresh day available — hypertrophy is most fatigue-tolerant.';
    } else if (i === 1 && candidate.score >= 60) {
      // Second freshest and decent → strength
      workoutType = 'strength';
      typeReason = 'Second-freshest day — suitable for heavy strength work.';
    } else if (candidate.score >= 50) {
      // Moderate freshness → hypertrophy
      workoutType = 'hypertrophy';
      typeReason = 'Moderate recovery window — hypertrophy handles residual fatigue well.';
    } else {
      // Low freshness → hypertrophy with reduced volume expected
      workoutType = 'hypertrophy';
      typeReason = 'Limited recovery window — keep volume moderate, focus on pump work.';
    }

    // Override: never assign strength/power the day after hard sparring
    if (
      candidate.previousDayIntensity === 'hard_sparring' ||
      candidate.previousDayIntensity === 'competition_prep'
    ) {
      workoutType = 'hypertrophy';
      typeReason =
        'Day after hard sparring/comp — CNS recovery needed. Hypertrophy only.';
    }

    workoutTypeAssignment.set(candidate.day, { type: workoutType, reason: typeReason });
  }

  // Build final result sorted by day of week
  const liftingSlots: LiftingSlot[] = selectedDays
    .sort((a, b) => a.day - b.day)
    .map((candidate) => {
      const assignment = workoutTypeAssignment.get(candidate.day)!;
      return {
        day: candidate.day,
        recommended: assignment.type,
        reason: `${assignment.reason} (${candidate.reason})`,
      };
    });

  return liftingSlots;
}

// ─── Internal Helpers (not exported) ────────────────────────────────────────

/**
 * Returns the highest intensity from a list of combat sessions on a single day.
 * Returns null if the list is empty.
 */
function getMaxIntensity(
  sessions: { intensity: TrainingIntensity }[],
): TrainingIntensity | null {
  if (sessions.length === 0) return null;

  const order: Record<TrainingIntensity, number> = {
    light_flow: 0,
    moderate: 1,
    hard_sparring: 2,
    competition_prep: 3,
  };

  let max: TrainingIntensity = sessions[0].intensity;
  for (const s of sessions) {
    if (order[s.intensity] > order[max]) {
      max = s.intensity;
    }
  }
  return max;
}
