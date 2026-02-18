/**
 * Readiness Auto-Throttle Engine
 *
 * Automatically adjusts workout prescriptions based on the holistic readiness score.
 * Unlike the existing auto-adjust system (which reacts to previous session feedback),
 * this engine proactively modifies TODAY's session BEFORE you start, using real-time
 * readiness data from Whoop, pre-check-in, sleep, nutrition, soreness, and more.
 *
 * Throttle levels:
 *   PEAK   (85-100) → volume +5%, unlock intensity PR attempts
 *   GREEN  (70-84)  → normal prescription, no changes
 *   YELLOW (50-69)  → reduce volume 15%, cap RPE at 7, extend rest 20%
 *   ORANGE (30-49)  → reduce volume 30%, cap RPE at 6, drop isolation, extend rest 40%
 *   RED    (<30)    → active recovery only — mobility/technique, no heavy loads
 */

import type {
  ReadinessScore,
  WorkoutSession,
  ExercisePrescription,
  WorkoutAdjustment,
  ReadinessLevel,
} from './types';

// ── Throttle Levels ──────────────────────────────────────────────────────

export type ThrottleLevel = 'peak' | 'green' | 'yellow' | 'orange' | 'red';

export interface ThrottleConfig {
  level: ThrottleLevel;
  label: string;
  color: string;              // tailwind color token
  volumeMultiplier: number;   // applied to sets
  rpeCap: number;             // max RPE allowed
  restMultiplier: number;     // multiply prescribed rest by this
  dropIsolation: boolean;     // remove isolation exercises
  allowPRAttempts: boolean;   // whether to suggest going heavy
  message: string;            // shown to user
  detail: string;             // longer explanation
}

const THROTTLE_CONFIGS: Record<ThrottleLevel, ThrottleConfig> = {
  peak: {
    level: 'peak',
    label: 'Peak Day',
    color: 'emerald',
    volumeMultiplier: 1.05,
    rpeCap: 10,
    restMultiplier: 1.0,
    dropIsolation: false,
    allowPRAttempts: true,
    message: 'You\'re primed — push it today',
    detail: 'All recovery factors are high. Volume is bumped 5% and PR attempts are unlocked. Send it.',
  },
  green: {
    level: 'green',
    label: 'All Systems Go',
    color: 'green',
    volumeMultiplier: 1.0,
    rpeCap: 10,
    restMultiplier: 1.0,
    dropIsolation: false,
    allowPRAttempts: false,
    message: 'Train as prescribed',
    detail: 'Recovery is solid. Follow the program — no modifications needed.',
  },
  yellow: {
    level: 'yellow',
    label: 'Throttled',
    color: 'yellow',
    volumeMultiplier: 0.85,
    rpeCap: 7,
    restMultiplier: 1.2,
    dropIsolation: false,
    allowPRAttempts: false,
    message: 'Dialed back — volume down 15%, RPE capped at 7',
    detail: 'Some recovery factors are below optimal. Volume reduced 15%, rest extended, and RPE capped to keep quality high without digging a recovery hole.',
  },
  orange: {
    level: 'orange',
    label: 'Low Power Mode',
    color: 'orange',
    volumeMultiplier: 0.70,
    rpeCap: 6,
    restMultiplier: 1.4,
    dropIsolation: true,
    allowPRAttempts: false,
    message: 'Low power — compounds only, RPE capped at 6',
    detail: 'Multiple recovery factors are compromised. Isolation exercises dropped, volume reduced 30%, RPE capped at 6. Focus on movement quality — this session is about stimulus, not destruction.',
  },
  red: {
    level: 'red',
    label: 'Recovery Mode',
    color: 'red',
    volumeMultiplier: 0.40,
    rpeCap: 5,
    restMultiplier: 1.5,
    dropIsolation: true,
    allowPRAttempts: false,
    message: 'Recovery mode — light movement only',
    detail: 'Your body is significantly under-recovered. If you choose to train, this session is stripped to light technique work. Consider a full rest day instead.',
  },
};

// ── Main Entry Point ─────────────────────────────────────────────────────

export interface ThrottleResult {
  config: ThrottleConfig;
  adjustedSession: WorkoutSession;
  adjustments: WorkoutAdjustment[];
  droppedExercises: string[];     // names of exercises removed
  originalSetCount: number;
  adjustedSetCount: number;
}

/**
 * Determine throttle level from readiness score.
 */
export function getThrottleLevel(readiness: ReadinessScore): ThrottleLevel {
  if (readiness.overall >= 85) return 'peak';
  if (readiness.overall >= 70) return 'green';
  if (readiness.overall >= 50) return 'yellow';
  if (readiness.overall >= 30) return 'orange';
  return 'red';
}

/**
 * Get the throttle config for a readiness level (without applying to a session).
 */
export function getThrottleConfig(readiness: ReadinessScore): ThrottleConfig {
  return THROTTLE_CONFIGS[getThrottleLevel(readiness)];
}

/**
 * Apply the readiness auto-throttle to a workout session.
 * Returns the modified session, adjustments list, and metadata.
 */
export function applyThrottle(
  session: WorkoutSession,
  readiness: ReadinessScore
): ThrottleResult {
  const level = getThrottleLevel(readiness);
  const config = THROTTLE_CONFIGS[level];
  const adjustments: WorkoutAdjustment[] = [];
  const droppedExercises: string[] = [];

  const originalSetCount = session.exercises.reduce((sum, ex) => sum + ex.sets, 0);

  // Filter exercises if in orange/red (drop isolation)
  let exercises: ExercisePrescription[] = [...session.exercises];

  if (config.dropIsolation) {
    const before = exercises.length;
    exercises = exercises.filter(ex => {
      const isIsolation = ex.exercise.category === 'isolation';
      if (isIsolation) {
        droppedExercises.push(ex.exercise.name);
        adjustments.push({
          exerciseId: ex.exerciseId,
          exerciseName: ex.exercise.name,
          adjustmentType: 'swap',
          oldValue: 0,
          newValue: 0,
          reason: `Dropped — ${config.label}: isolation exercises removed to conserve recovery`,
        });
      }
      return !isIsolation;
    });
    // Safety: keep at least 2 exercises even if all are isolation
    if (exercises.length < 2 && before >= 2) {
      exercises = session.exercises.slice(0, 2);
      droppedExercises.length = 0;
    }
  }

  // Apply volume and intensity modifications
  exercises = exercises.map(ex => {
    const originalSets = ex.sets;
    const originalRpe = ex.prescription.rpe;
    const originalRest = ex.prescription.restSeconds;

    // Volume: multiply sets, minimum 2
    const newSets = Math.max(2, Math.round(originalSets * config.volumeMultiplier));

    // Intensity: cap RPE
    const newRpe = Math.min(originalRpe, config.rpeCap);

    // Rest: extend
    const newRest = Math.round(originalRest * config.restMultiplier);

    // Track adjustments
    if (newSets !== originalSets) {
      adjustments.push({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exercise.name,
        adjustmentType: 'sets',
        oldValue: originalSets,
        newValue: newSets,
        reason: `${config.label}: volume ${config.volumeMultiplier < 1 ? 'reduced' : 'increased'} to ${Math.round(config.volumeMultiplier * 100)}%`,
      });
    }

    if (newRpe !== originalRpe) {
      adjustments.push({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exercise.name,
        adjustmentType: 'deload',
        oldValue: originalRpe,
        newValue: newRpe,
        reason: `${config.label}: RPE capped at ${config.rpeCap}`,
      });
    }

    return {
      ...ex,
      sets: newSets,
      prescription: {
        ...ex.prescription,
        rpe: Math.round(newRpe * 10) / 10,
        restSeconds: newRest,
      },
    };
  });

  const adjustedSession: WorkoutSession = {
    ...session,
    exercises,
  };

  const adjustedSetCount = exercises.reduce((sum, ex) => sum + ex.sets, 0);

  return {
    config,
    adjustedSession,
    adjustments,
    droppedExercises,
    originalSetCount,
    adjustedSetCount,
  };
}

// ── Factor-Specific Insights ─────────────────────────────────────────────

export interface ThrottleInsight {
  icon: string;        // lucide icon name
  label: string;
  value: string;
  severity: 'good' | 'warning' | 'critical';
}

/**
 * Extract the most impactful readiness factors for display.
 * Returns top 3 factors driving the throttle decision.
 */
export function getThrottleInsights(readiness: ReadinessScore): ThrottleInsight[] {
  const insights: ThrottleInsight[] = [];
  const available = readiness.factors.filter(f => f.available);

  // Sort by impact (weight * deviation from 100)
  const sorted = [...available].sort(
    (a, b) => (100 - a.score) * a.weight - (100 - b.score) * b.weight
  );

  // Reverse to get worst first
  sorted.reverse();

  for (const factor of sorted.slice(0, 3)) {
    const severity: 'good' | 'warning' | 'critical' =
      factor.score >= 70 ? 'good' : factor.score >= 40 ? 'warning' : 'critical';

    const iconMap: Record<string, string> = {
      sleep: 'Moon',
      nutrition: 'Utensils',
      stress: 'Brain',
      recovery: 'Heart',
      injury: 'Shield',
      training_load: 'Activity',
      hydration: 'Droplets',
      age: 'Clock',
      hrv: 'Activity',
      soreness: 'Zap',
    };

    insights.push({
      icon: iconMap[factor.source] || 'Info',
      label: factor.label,
      value: factor.detail || `${factor.score}/100`,
      severity,
    });
  }

  return insights;
}

/**
 * Get a concise summary for the throttle banner.
 */
export function getThrottleSummary(result: ThrottleResult): string {
  const { config, originalSetCount, adjustedSetCount, droppedExercises } = result;
  const parts: string[] = [];

  if (adjustedSetCount !== originalSetCount) {
    parts.push(`${originalSetCount} → ${adjustedSetCount} sets`);
  }
  if (config.rpeCap < 10) {
    parts.push(`RPE cap ${config.rpeCap}`);
  }
  if (droppedExercises.length > 0) {
    parts.push(`${droppedExercises.length} isolation dropped`);
  }
  if (config.restMultiplier > 1) {
    parts.push(`rest +${Math.round((config.restMultiplier - 1) * 100)}%`);
  }

  return parts.length > 0 ? parts.join(' · ') : 'No changes';
}
