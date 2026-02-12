/**
 * Nudge Engine — smart nutrition/hydration/training reminders.
 *
 * Generates contextual nudges based on:
 *   - Time of day and upcoming training
 *   - Current nutrition adherence
 *   - Weight cut phase and proximity to competition
 *   - Hydration status
 *   - Weekend drift patterns
 *   - Supplement reminders (e.g., creatine pause before weigh-in)
 *
 * Each nudge has a priority, category, and optional action.
 * UI components consume these to show banners, cards, or notifications.
 */

import type {
  MacroTargets, MealEntry, CompetitionEvent,
  WeightCutPlan, CombatAthleteNutritionProfile,
} from './types';

// ── Nudge Types ─────────────────────────────────────────────────────────────

export type NudgeCategory =
  | 'pre_training'
  | 'post_training'
  | 'hydration'
  | 'weight_cut'
  | 'supplement'
  | 'adherence'
  | 'recovery'
  | 'competition'
  | 'safety';

export type NudgePriority = 'low' | 'medium' | 'high' | 'critical';

export interface Nudge {
  id: string;
  category: NudgeCategory;
  priority: NudgePriority;
  title: string;
  message: string;
  actionLabel?: string;
  actionRoute?: string;    // e.g., 'nutrition', 'weight-cut', 'hydration'
  dismissable: boolean;
  expiresAt?: Date;        // auto-dismiss after this time
}

// ── Nudge Generation ────────────────────────────────────────────────────────

interface NudgeContext {
  currentHour: number;                    // 0-23
  hasTrainingToday: boolean;
  trainingTimeHour?: number;              // 0-23, when training is scheduled
  trainedToday: boolean;                  // has already trained
  mealsLoggedToday: number;
  caloriesLoggedToday: number;
  proteinLoggedToday: number;
  macroTargets: MacroTargets;
  waterGlassesToday: number;
  waterTargetGlasses: number;
  bodyWeightKg: number;
  // Competition context
  nearestCompetition?: CompetitionEvent;
  daysToCompetition?: number;
  weightCutPlan?: WeightCutPlan;
  combatProfile?: CombatAthleteNutritionProfile;
  // Pattern detection
  isWeekend: boolean;
  weekendAdherenceAvg?: number;           // 0-100
  weekdayAdherenceAvg?: number;           // 0-100
  // Supplement
  activeSupplementCount: number;
  creatineActive: boolean;
  // Safety
  currentEA?: number;                     // kcal/kg FFM
}

/**
 * Generate all active nudges based on current context.
 * Returns sorted by priority (critical first).
 */
export function generateNudges(ctx: NudgeContext): Nudge[] {
  const nudges: Nudge[] = [];
  let idCounter = 0;
  const makeId = () => `nudge_${++idCounter}`;

  // ── Pre-Training Fuel ──────────────────────────────────────────────
  if (ctx.hasTrainingToday && !ctx.trainedToday && ctx.trainingTimeHour != null) {
    const hoursToTraining = ctx.trainingTimeHour - ctx.currentHour;

    if (hoursToTraining > 0 && hoursToTraining <= 3 && ctx.mealsLoggedToday === 0) {
      nudges.push({
        id: makeId(),
        category: 'pre_training',
        priority: 'high',
        title: 'Eat before training',
        message: `Training in ~${hoursToTraining}h. Eat a meal with 30-50g carbs + 20g protein for optimal performance.`,
        actionLabel: 'Log meal',
        actionRoute: 'nutrition',
        dismissable: true,
      });
    }

    if (hoursToTraining > 0 && hoursToTraining <= 1 && ctx.waterGlassesToday < 3) {
      nudges.push({
        id: makeId(),
        category: 'hydration',
        priority: 'medium',
        title: 'Hydrate before training',
        message: 'Training soon. Drink 300-500ml water now for optimal performance.',
        dismissable: true,
      });
    }
  }

  // ── Post-Training Recovery ─────────────────────────────────────────
  if (ctx.trainedToday && ctx.currentHour < 22) {
    const proteinRemaining = ctx.macroTargets.protein - ctx.proteinLoggedToday;
    if (proteinRemaining > 40) {
      nudges.push({
        id: makeId(),
        category: 'post_training',
        priority: 'medium',
        title: 'Recovery protein needed',
        message: `${Math.round(proteinRemaining)}g protein left today. Have a protein-rich meal or shake for recovery.`,
        actionLabel: 'Log meal',
        actionRoute: 'nutrition',
        dismissable: true,
      });
    }
  }

  // ── Hydration ──────────────────────────────────────────────────────
  const waterRatio = ctx.waterGlassesToday / Math.max(1, ctx.waterTargetGlasses);
  const expectedRatio = Math.min(1, ctx.currentHour / 20); // by 8pm should be done

  if (waterRatio < expectedRatio * 0.5 && ctx.currentHour >= 10) {
    nudges.push({
      id: makeId(),
      category: 'hydration',
      priority: 'high',
      title: 'Behind on hydration',
      message: `${ctx.waterGlassesToday}/${ctx.waterTargetGlasses} glasses. You should be at ~${Math.round(expectedRatio * ctx.waterTargetGlasses)} by now.`,
      actionLabel: 'Log water',
      actionRoute: 'nutrition',
      dismissable: true,
    });
  }

  // ── Calorie Adherence ──────────────────────────────────────────────
  if (ctx.currentHour >= 18 && ctx.mealsLoggedToday === 0) {
    nudges.push({
      id: makeId(),
      category: 'adherence',
      priority: 'high',
      title: 'No meals logged today',
      message: 'Track your meals to keep your nutrition on target. Consistency is key.',
      actionLabel: 'Log meal',
      actionRoute: 'nutrition',
      dismissable: true,
    });
  }

  if (ctx.currentHour >= 20 && ctx.caloriesLoggedToday > 0) {
    const calorieRatio = ctx.caloriesLoggedToday / ctx.macroTargets.calories;
    if (calorieRatio < 0.6) {
      nudges.push({
        id: makeId(),
        category: 'adherence',
        priority: 'medium',
        title: 'Under-eating today',
        message: `${ctx.caloriesLoggedToday}/${ctx.macroTargets.calories} kcal logged. Under-eating can hurt recovery and performance.`,
        dismissable: true,
      });
    } else if (calorieRatio > 1.3) {
      nudges.push({
        id: makeId(),
        category: 'adherence',
        priority: 'low',
        title: 'Over target today',
        message: `${ctx.caloriesLoggedToday}/${ctx.macroTargets.calories} kcal. One day over target is fine — just get back on track tomorrow.`,
        dismissable: true,
      });
    }
  }

  // ── Weekend Drift Detection ────────────────────────────────────────
  if (ctx.isWeekend && ctx.weekendAdherenceAvg != null && ctx.weekdayAdherenceAvg != null) {
    const drift = ctx.weekdayAdherenceAvg - ctx.weekendAdherenceAvg;
    if (drift > 20) {
      nudges.push({
        id: makeId(),
        category: 'adherence',
        priority: 'medium',
        title: 'Weekend pattern detected',
        message: `Your weekend adherence (${Math.round(ctx.weekendAdherenceAvg)}%) is significantly lower than weekdays (${Math.round(ctx.weekdayAdherenceAvg)}%). Plan meals ahead.`,
        dismissable: true,
      });
    }
  }

  // ── Weight Cut Phase ───────────────────────────────────────────────
  if (ctx.weightCutPlan?.isActive) {
    const phase = ctx.weightCutPlan.currentPhase;

    if (phase === 'water_cut') {
      nudges.push({
        id: makeId(),
        category: 'weight_cut',
        priority: 'critical',
        title: 'Water cut active',
        message: 'Follow protocol precisely. Monitor HR, urine color, and mental state. Stop if you feel dizzy or confused.',
        actionLabel: 'View protocol',
        actionRoute: 'weight-cut',
        dismissable: false,
      });
    }

    if (phase === 'acute_reduction' && ctx.daysToCompetition != null && ctx.daysToCompetition <= 3) {
      nudges.push({
        id: makeId(),
        category: 'weight_cut',
        priority: 'high',
        title: 'Final days of cut',
        message: 'Check today\'s water, sodium, and carb targets. Log your morning weight.',
        actionLabel: 'Open checklist',
        actionRoute: 'weight-cut',
        dismissable: true,
      });
    }

    if (phase === 'rehydration') {
      nudges.push({
        id: makeId(),
        category: 'weight_cut',
        priority: 'critical',
        title: 'Rehydration protocol active',
        message: 'Follow the rehydration timeline precisely. Sip — don\'t chug. Electrolytes first, then water.',
        actionLabel: 'View protocol',
        actionRoute: 'weight-cut',
        dismissable: false,
      });
    }
  }

  // ── Competition Proximity ──────────────────────────────────────────
  if (ctx.daysToCompetition != null) {
    if (ctx.daysToCompetition === 1) {
      nudges.push({
        id: makeId(),
        category: 'competition',
        priority: 'high',
        title: 'Competition tomorrow',
        message: 'Eat familiar foods. Stay hydrated. Pack your competition day meals tonight.',
        dismissable: true,
      });
    }

    if (ctx.daysToCompetition === 0) {
      nudges.push({
        id: makeId(),
        category: 'competition',
        priority: 'critical',
        title: 'Competition day',
        message: 'Trust your preparation. Eat your pre-planned meals. Stay focused.',
        dismissable: false,
      });
    }
  }

  // ── Supplement Reminders ───────────────────────────────────────────
  if (ctx.creatineActive && ctx.daysToCompetition != null && ctx.daysToCompetition <= 7 && ctx.daysToCompetition > 0) {
    nudges.push({
      id: makeId(),
      category: 'supplement',
      priority: 'high',
      title: 'Pause creatine',
      message: `Competition in ${ctx.daysToCompetition} days. Stop creatine now to reduce water retention before weigh-in.`,
      dismissable: true,
    });
  }

  // ── Safety: Energy Availability ────────────────────────────────────
  if (ctx.currentEA != null && ctx.currentEA < 30) {
    nudges.push({
      id: makeId(),
      category: 'safety',
      priority: ctx.currentEA < 20 ? 'critical' : 'high',
      title: 'Low Energy Availability',
      message: ctx.currentEA < 20
        ? `EA is ${Math.round(ctx.currentEA)} kcal/kg FFM — critically low. Risk of RED-S. Increase intake immediately.`
        : `EA is ${Math.round(ctx.currentEA)} kcal/kg FFM — below safe threshold. Consider eating more or reducing training.`,
      actionLabel: 'View nutrition',
      actionRoute: 'nutrition',
      dismissable: false,
    });
  }

  // Sort by priority
  const priorityOrder: Record<NudgePriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return nudges.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

// ── Performance Readiness Score ──────────────────────────────────────────────

export interface ReadinessScore {
  score: number;           // 0-100
  level: 'ready' | 'needs_attention' | 'at_risk';
  components: {
    nutrition: number;     // 0-100
    hydration: number;     // 0-100
    weight: number;        // 0-100
    recovery: number;      // 0-100
    energy: number;        // 0-100 (energy availability)
  };
  bottleneck: string;
  actionItem: string;
}

interface ReadinessContext {
  // Nutrition
  calorieAdherence: number;    // 0-100
  proteinAdherence: number;    // 0-100
  mealsLoggedToday: number;
  // Hydration
  waterRatio: number;          // 0-1 (glasses logged / target)
  // Weight
  onWeightTarget: boolean;     // within 2% of goal
  weeksAtPlateau: number;
  // Recovery
  whoopRecovery?: number;      // 0-100
  sleepHours?: number;
  // Energy
  energyAvailability?: number; // kcal/kg FFM
  // Time context
  hourOfDay?: number;          // 0-23, for morning-aware scoring
  yesterdayCalorieAdherence?: number; // carry-forward from yesterday
  yesterdayProteinAdherence?: number;
  yesterdayWaterRatio?: number;
}

/**
 * Calculate composite performance readiness score.
 *
 * Morning-aware: Before 10am with no meals/water logged, we use yesterday's
 * data or neutral defaults instead of showing alarming 0s. Readiness means
 * "ready to train" — not "how much have you eaten today at 7am."
 */
export function calculateReadiness(ctx: ReadinessContext): ReadinessScore {
  const hour = ctx.hourOfDay ?? new Date().getHours();
  const isEarlyMorning = hour < 10;
  const nothingLoggedYet = ctx.mealsLoggedToday === 0 && ctx.waterRatio === 0;

  // Nutrition: weighted avg of calorie and protein adherence
  let nutritionScore: number;
  if (isEarlyMorning && nothingLoggedYet) {
    // Morning: use yesterday's adherence if available, else neutral
    const yestCal = ctx.yesterdayCalorieAdherence ?? 60;
    const yestPro = ctx.yesterdayProteinAdherence ?? 60;
    nutritionScore = Math.min(100, (yestCal * 0.4 + yestPro * 0.4 + 20));
  } else {
    nutritionScore = Math.min(100, (ctx.calorieAdherence * 0.4 + ctx.proteinAdherence * 0.4 + (ctx.mealsLoggedToday >= 3 ? 20 : ctx.mealsLoggedToday * 7)));
  }

  // Hydration: water ratio scaled to 100
  let hydrationScore: number;
  if (isEarlyMorning && ctx.waterRatio === 0) {
    // Morning: use yesterday's hydration or neutral
    const yestWater = ctx.yesterdayWaterRatio ?? 0.6;
    hydrationScore = Math.min(100, Math.round(yestWater * 100));
  } else {
    hydrationScore = Math.min(100, Math.round(ctx.waterRatio * 100));
  }

  // Weight: on target + not plateauing
  let weightScore = ctx.onWeightTarget ? 90 : 50;
  if (ctx.weeksAtPlateau >= 3) weightScore -= 20;
  weightScore = Math.max(0, Math.min(100, weightScore));

  // Recovery: whoop if available, else sleep-based estimate
  let recoveryScore: number;
  if (ctx.whoopRecovery != null) {
    recoveryScore = ctx.whoopRecovery;
  } else if (ctx.sleepHours != null) {
    recoveryScore = ctx.sleepHours >= 8 ? 90 : ctx.sleepHours >= 7 ? 75 : ctx.sleepHours >= 6 ? 50 : 30;
  } else {
    recoveryScore = 65; // neutral default
  }

  // Energy: EA score
  let energyScore: number;
  if (ctx.energyAvailability != null) {
    if (ctx.energyAvailability >= 45) energyScore = 100;
    else if (ctx.energyAvailability >= 30) energyScore = 70;
    else if (ctx.energyAvailability >= 20) energyScore = 40;
    else energyScore = 10;
  } else {
    energyScore = 70; // neutral default
  }

  // Composite: weighted average
  const weights = { nutrition: 0.30, hydration: 0.15, weight: 0.15, recovery: 0.25, energy: 0.15 };
  const score = Math.round(
    nutritionScore * weights.nutrition +
    hydrationScore * weights.hydration +
    weightScore * weights.weight +
    recoveryScore * weights.recovery +
    energyScore * weights.energy
  );

  // Find bottleneck
  const components = { nutrition: nutritionScore, hydration: hydrationScore, weight: weightScore, recovery: recoveryScore, energy: energyScore };
  const lowestKey = (Object.keys(components) as (keyof typeof components)[])
    .reduce((a, b) => components[a] < components[b] ? a : b);

  const isMorningNoData = isEarlyMorning && nothingLoggedYet;

  const bottleneckMessages: Record<string, string> = {
    nutrition: isMorningNoData ? 'Start your day with a solid meal' : 'Nutrition tracking needs attention',
    hydration: isMorningNoData ? 'Hydrate when you\'re ready' : 'Hydration is behind target',
    weight: 'Weight management is off track',
    recovery: 'Recovery quality is low',
    energy: 'Energy availability is concerning',
  };

  const actionMessages: Record<string, string> = {
    nutrition: isMorningNoData ? 'Log breakfast to start tracking today\'s intake' : 'Log your meals consistently and hit your protein target',
    hydration: isMorningNoData ? 'Have a glass of water to kick things off' : 'Drink more water throughout the day',
    weight: 'Review your weekly check-in and adjust macros',
    recovery: 'Prioritize 7-8 hours of sleep tonight',
    energy: 'Increase caloric intake or reduce training volume',
  };

  const level: ReadinessScore['level'] =
    score >= 70 ? 'ready' : score >= 50 ? 'needs_attention' : 'at_risk';

  return {
    score,
    level,
    components: {
      nutrition: Math.round(nutritionScore),
      hydration: Math.round(hydrationScore),
      weight: Math.round(weightScore),
      recovery: Math.round(recoveryScore),
      energy: Math.round(energyScore),
    },
    bottleneck: bottleneckMessages[lowestKey],
    actionItem: actionMessages[lowestKey],
  };
}
