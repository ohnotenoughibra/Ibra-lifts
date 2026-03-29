/**
 * The One Thing — time-aware single directive engine
 *
 * Pure function (Tier 1). No store imports, no side effects.
 * Returns a single, short coaching directive that changes throughout the day.
 * Messages are direct — one sentence, like a coach talking.
 */

export interface OneThing {
  /** The directive text — one sentence max */
  message: string;
  /** Optional supporting detail */
  subtext?: string;
  /** Lucide icon name */
  icon: string;
  /** Tailwind color class (text-*) */
  color: string;
  /** Optional CTA label */
  action?: string;
  /** Where the action navigates */
  actionRoute?: string;
}

export interface OneThingContext {
  /** Current hour 0-23 */
  hour: number;
  /** Readiness score 0-100 */
  readinessScore: number;
  /** Readiness level */
  readinessLevel: 'peak' | 'good' | 'moderate' | 'low' | 'critical';
  /** What type of day it is */
  todayType: 'rest' | 'lift' | 'combat' | 'both' | 'recovery';
  /** Whether user has completed a workout today */
  hasTrainedToday: boolean;
  /** Protein consumed today (grams) */
  todayProtein: number;
  /** Daily protein target (grams) */
  proteinTarget: number;
  /** Water glasses consumed today */
  waterGlasses: number;
  /** Daily water target (glasses) */
  waterTarget: number;
  /** Sleep hours from wearable (null if unavailable) */
  sleepHours: number | null;
  /** Next workout session name */
  nextWorkoutName: string | null;
  /** Next workout time hint, e.g. "afternoon" */
  nextWorkoutTime: string | null;
  /** Current training streak (days) */
  streak: number;
  /** Session grade if completed today */
  todayGrade: string | null;
  /** Whether user is in a fight camp */
  hasFightCamp: boolean;
  /** Days until competition (null if none) */
  daysToCompetition: number | null;
  /** Number of exercises in next session */
  nextWorkoutExerciseCount?: number;
  /** Estimated duration of next session (minutes) */
  nextWorkoutDuration?: number;
}

/**
 * Returns the single most important thing the user should focus on right now.
 * Time-based priority with fight camp override.
 */
export function getOneThing(ctx: OneThingContext): OneThing {
  const {
    hour, readinessScore, readinessLevel, todayType, hasTrainedToday,
    todayProtein, proteinTarget, waterGlasses, waterTarget,
    sleepHours, nextWorkoutName, streak,
    todayGrade, hasFightCamp, daysToCompetition,
    nextWorkoutExerciseCount, nextWorkoutDuration,
  } = ctx;

  const proteinPct = proteinTarget > 0 ? todayProtein / proteinTarget : 1;
  const waterPct = waterTarget > 0 ? waterGlasses / waterTarget : 1;
  const isRestDay = todayType === 'rest' || todayType === 'recovery';
  const isTrainingDay = !isRestDay;

  // Build the prefix for fight camp
  const fightPrefix = hasFightCamp && daysToCompetition != null && daysToCompetition <= 14
    ? `${daysToCompetition}d out — `
    : '';

  let result: OneThing;

  // ─── NIGHT (10pm - 5am) ───
  if (hour >= 22 || hour < 5) {
    result = {
      message: `${fightPrefix}Sleep is your best recovery tool.`,
      subtext: 'Aim for 7-9 hours tonight.',
      icon: 'Moon',
      color: 'text-blue-400',
    };
    return result;
  }

  // ─── WAKE (5-8am) ───
  if (hour >= 5 && hour < 8) {
    const readinessMsg = readinessScore >= 75
      ? `Readiness ${readinessScore} — you're ready to push.`
      : readinessScore >= 50
        ? `Readiness ${readinessScore} — solid, stay smart.`
        : `Readiness ${readinessScore} — take it easy today.`;

    result = {
      message: `${fightPrefix}${readinessMsg}`,
      subtext: sleepHours != null
        ? `${sleepHours.toFixed(1)}h sleep last night`
        : undefined,
      icon: readinessScore >= 75 ? 'Zap' : readinessScore >= 50 ? 'Sun' : 'Shield',
      color: readinessScore >= 75 ? 'text-green-400'
        : readinessScore >= 50 ? 'text-yellow-400'
          : 'text-amber-400',
    };
    return result;
  }

  // ─── MORNING (8-11am) ───
  if (hour >= 8 && hour < 11) {
    if (proteinPct < 0.3) {
      const needed = Math.round(proteinTarget * 0.3 - todayProtein);
      result = {
        message: `${fightPrefix}Get ${needed > 0 ? needed : 40}g protein before noon.`,
        subtext: `${Math.round(todayProtein)}/${Math.round(proteinTarget)}g so far`,
        icon: 'Apple',
        color: 'text-orange-400',
        action: 'Log meal',
        actionRoute: 'nutrition',
      };
    } else if (isRestDay) {
      result = {
        message: `${fightPrefix}Recovery day. Move, stretch, eat.`,
        subtext: readinessScore < 50 ? 'Your body needs this.' : undefined,
        icon: 'Leaf',
        color: 'text-green-400',
      };
    } else {
      result = {
        message: `${fightPrefix}${nextWorkoutName || 'Training'} session today.`,
        subtext: nextWorkoutExerciseCount
          ? `${nextWorkoutExerciseCount} exercises, ~${nextWorkoutDuration || 45}min`
          : undefined,
        icon: 'Dumbbell',
        color: 'text-primary-400',
      };
    }
    return result;
  }

  // ─── MIDDAY (11am-2pm) ───
  if (hour >= 11 && hour < 14) {
    if (proteinPct < 0.5) {
      result = {
        message: `${fightPrefix}You're behind on protein.`,
        subtext: `${Math.round(todayProtein)}/${Math.round(proteinTarget)}g — pick it up.`,
        icon: 'Target',
        color: 'text-orange-400',
        action: 'Log meal',
        actionRoute: 'nutrition',
      };
    } else if (isTrainingDay && !hasTrainedToday && nextWorkoutName) {
      result = {
        message: `${fightPrefix}${nextWorkoutName} coming up.`,
        subtext: nextWorkoutExerciseCount
          ? `${nextWorkoutExerciseCount} exercises, ~${nextWorkoutDuration || 45}min`
          : 'Fuel up and hydrate.',
        icon: 'Dumbbell',
        color: 'text-primary-400',
      };
    } else {
      result = {
        message: `${fightPrefix}Stay fueled. Hit your targets.`,
        subtext: `Protein: ${Math.round(todayProtein)}/${Math.round(proteinTarget)}g`,
        icon: 'Target',
        color: 'text-grappler-300',
      };
    }
    return result;
  }

  // ─── PRE-WORKOUT (2-5pm) ───
  if (hour >= 14 && hour < 17) {
    if (isTrainingDay && !hasTrainedToday) {
      if (nextWorkoutName) {
        result = {
          message: `${fightPrefix}${nextWorkoutName}`,
          subtext: nextWorkoutExerciseCount
            ? `${nextWorkoutExerciseCount} exercises, ~${nextWorkoutDuration || 45}min`
            : 'Time to lock in.',
          icon: 'Dumbbell',
          color: 'text-primary-400',
          action: 'Start workout',
          actionRoute: 'workout',
        };
      } else {
        result = {
          message: `${fightPrefix}Training window is open.`,
          subtext: 'Get after it.',
          icon: 'Play',
          color: 'text-primary-400',
          action: 'Start workout',
          actionRoute: 'workout',
        };
      }
    } else if (isRestDay) {
      if (waterPct < 0.6) {
        result = {
          message: `${fightPrefix}Hydration check: ${waterGlasses}/${waterTarget} glasses.`,
          subtext: 'Dehydration cuts strength 2-3%.',
          icon: 'Droplets',
          color: 'text-blue-400',
          action: 'Log water',
          actionRoute: 'nutrition',
        };
      } else {
        result = {
          message: `${fightPrefix}Recovery on track. Keep eating.`,
          subtext: `Protein: ${Math.round(todayProtein)}/${Math.round(proteinTarget)}g`,
          icon: 'Leaf',
          color: 'text-green-400',
        };
      }
    } else {
      // Already trained
      result = {
        message: `${fightPrefix}Session done. Stay on your nutrition.`,
        subtext: `Protein: ${Math.round(todayProtein)}/${Math.round(proteinTarget)}g`,
        icon: 'Check',
        color: 'text-green-400',
      };
    }
    return result;
  }

  // ─── TRAINING WINDOW (5-8pm) ───
  if (hour >= 17 && hour < 20) {
    if (hasTrainedToday && todayGrade) {
      const gradeColor = todayGrade === 'S' ? 'text-yellow-400'
        : todayGrade === 'A' ? 'text-green-400'
          : todayGrade === 'B' ? 'text-blue-400' : 'text-grappler-300';
      result = {
        message: `${fightPrefix}Session complete — Grade ${todayGrade}.`,
        subtext: streak > 1 ? `${streak}-day streak. Keep building.` : undefined,
        icon: 'Trophy',
        color: gradeColor,
      };
    } else if (isTrainingDay && !hasTrainedToday) {
      result = {
        message: `${fightPrefix}Time to train.`,
        subtext: nextWorkoutName || 'Don\'t let the day slip.',
        icon: 'Zap',
        color: 'text-amber-400',
        action: 'Start workout',
        actionRoute: 'workout',
      };
    } else {
      result = {
        message: `${fightPrefix}Rest day evening. Hydrate and wind down.`,
        subtext: waterPct < 0.8 ? `Water: ${waterGlasses}/${waterTarget} glasses` : undefined,
        icon: 'Leaf',
        color: 'text-green-400',
      };
    }
    return result;
  }

  // ─── EVENING (8-10pm) ───
  if (hasTrainedToday) {
    result = {
      message: `${fightPrefix}Recovery window open. Eat, hydrate, sleep by 11.`,
      subtext: proteinPct < 0.85
        ? `${Math.round(proteinTarget - todayProtein)}g protein still needed.`
        : 'Nutrition on point.',
      icon: 'Moon',
      color: 'text-blue-400',
    };
  } else if (isTrainingDay) {
    // Missed the window
    result = {
      message: `${fightPrefix}Missed today? Tomorrow's a new day.`,
      subtext: 'Focus on sleep and nutrition tonight.',
      icon: 'Moon',
      color: 'text-grappler-400',
    };
  } else {
    result = {
      message: `${fightPrefix}Good rest day. Wind down for sleep.`,
      subtext: 'Tomorrow starts tonight.',
      icon: 'Moon',
      color: 'text-blue-400',
    };
  }

  return result;
}
