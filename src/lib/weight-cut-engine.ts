/**
 * Weight Cut Engine — safe, guided weight manipulation for combat athletes.
 *
 * Implements a 4-phase protocol:
 *   Phase 1 — Chronic Loss (10-4 weeks out): caloric deficit for fat loss
 *   Phase 2 — Acute Reduction (7-2 days out): low-residue, glycogen depletion, water/sodium loading
 *   Phase 3 — Water Cut (24-2hrs before weigh-in): controlled dehydration
 *   Phase 4 — Rehydration (post weigh-in): fluid + glycogen recovery
 *
 * Safety principles:
 *   - Maximum 6% BW via water manipulation (hard cap)
 *   - Age gating: water manipulation locked for users under 18
 *   - Eating disorder history: aggressive cut features disabled
 *   - Amenorrhea: flags RED-S, prevents further restriction
 *   - First-time cutters: limited to 3% BW water cut
 *   - Minimum 6hr rehydration time recommended
 *
 * References:
 *   - Reale et al. 2017: Acute weight management in combat sports
 *   - Barley et al. 2018: Water loading for weight cutting
 *   - Sawka et al. 2007: Exercise and fluid replacement (ACSM position stand)
 *   - Petrizzo et al. 2017: Combat athlete nutrition review
 */

import type {
  WeightCutPhase, WeightCutPlan, WeightCutDailyLog, WeightCutSafetyLevel,
  WeighInType, CutExperience, MenstrualStatus, BiologicalSex,
} from './types';
import { toLocalDateStr } from './utils';

// ── Safety Thresholds ────────────────────────────────────────────────────────

export const WEIGHT_CUT_LIMITS = {
  /** Maximum total BW% that can be cut via water manipulation. */
  maxWaterCutPercent: 6,
  /** Maximum for first-time cutters. */
  maxWaterCutFirstTime: 3,
  /** Minimum recommended rehydration time (hours). */
  minRehydrationHours: 6,
  /** BW% above which we strongly warn against the cut. */
  dangerTotalCutPercent: 10,
  /** Weekly loss rate thresholds. */
  weeklyLossWarning: 1.0,  // % BW/week
  weeklyLossDanger: 1.5,   // % BW/week
  /** Minimum age for water manipulation protocols. */
  minAgeForWaterCut: 18,
  /** Maximum sauna time per day (minutes). */
  maxSaunaMinutesPerDay: 60,
  /** Resting HR that triggers emergency stop. */
  emergencyHRThreshold: 100,
} as const;

// ── Phase Detection ──────────────────────────────────────────────────────────

/**
 * Determine which weight cut phase the athlete should be in based on days to weigh-in.
 */
export function detectWeightCutPhase(
  daysToWeighIn: number,
  hasStarted: boolean,
): WeightCutPhase {
  if (!hasStarted) return 'not_started';
  if (daysToWeighIn > 28) return 'chronic_loss';
  if (daysToWeighIn > 7) return 'chronic_loss';
  if (daysToWeighIn > 1) return 'acute_reduction';
  if (daysToWeighIn >= 0) return 'water_cut';
  // Negative days = past weigh-in
  return 'rehydration';
}

// ── Water Loading Protocol ───────────────────────────────────────────────────

export interface WaterProtocol {
  targetMl: number;
  targetMlPerKg: number;
  note: string;
  phase: 'normal' | 'loading' | 'taper' | 'restriction' | 'zero';
}

/**
 * Get the water intake protocol for a given day relative to weigh-in.
 * Water loading → taper creates a "flush" effect as the body continues
 * excreting at the elevated rate even after intake drops.
 *
 * Reference: Barley et al. 2018 — water loading protocols in combat sports.
 */
export function getWaterProtocol(daysToWeighIn: number, bodyWeightKg: number): WaterProtocol {
  if (daysToWeighIn > 7) {
    return { targetMl: Math.round(bodyWeightKg * 35), targetMlPerKg: 35, note: 'Normal hydration — not in water load phase', phase: 'normal' };
  }
  if (daysToWeighIn === 7) {
    return { targetMl: Math.round(bodyWeightKg * 100), targetMlPerKg: 100, note: 'Begin water loading — body will upregulate excretion over 3-5 days', phase: 'loading' };
  }
  if (daysToWeighIn === 6) {
    return { targetMl: Math.round(bodyWeightKg * 100), targetMlPerKg: 100, note: 'Maintain high water intake', phase: 'loading' };
  }
  if (daysToWeighIn === 5) {
    return { targetMl: Math.round(bodyWeightKg * 100), targetMlPerKg: 100, note: 'Maintain — excretion rate is increasing', phase: 'loading' };
  }
  if (daysToWeighIn === 4) {
    return { targetMl: Math.round(bodyWeightKg * 80), targetMlPerKg: 80, note: 'Begin slight taper — excretion still elevated', phase: 'taper' };
  }
  if (daysToWeighIn === 3) {
    return { targetMl: Math.round(bodyWeightKg * 40), targetMlPerKg: 40, note: 'Significant reduction — body still excreting at high rate', phase: 'taper' };
  }
  if (daysToWeighIn === 2) {
    return { targetMl: Math.round(bodyWeightKg * 25), targetMlPerKg: 25, note: 'Restriction phase — excretion exceeds intake', phase: 'restriction' };
  }
  if (daysToWeighIn === 1) {
    return { targetMl: Math.round(bodyWeightKg * 15), targetMlPerKg: 15, note: 'Minimal intake — sips only', phase: 'restriction' };
  }
  // Weigh-in day
  return { targetMl: 0, targetMlPerKg: 0, note: 'Nothing until after weigh-in', phase: 'zero' };
}

// ── Sodium Manipulation Protocol ─────────────────────────────────────────────

export interface SodiumProtocol {
  targetMg: number;
  note: string;
  phase: 'normal' | 'loading' | 'taper' | 'restriction' | 'zero';
}

/**
 * Get sodium intake protocol. Paired with water loading — sodium loading
 * drives additional excretion upregulation, then restriction causes net loss.
 */
export function getSodiumProtocol(daysToWeighIn: number): SodiumProtocol {
  if (daysToWeighIn > 7) {
    return { targetMg: 2500, note: 'Normal sodium intake', phase: 'normal' };
  }
  if (daysToWeighIn >= 5) {
    return { targetMg: 4500, note: 'Sodium LOAD — paired with water loading drives excretion upregulation', phase: 'loading' };
  }
  if (daysToWeighIn === 4) {
    return { targetMg: 3000, note: 'Begin sodium taper', phase: 'taper' };
  }
  if (daysToWeighIn === 3) {
    return { targetMg: 1500, note: 'Moderate restriction — body still excreting at loaded rate', phase: 'taper' };
  }
  if (daysToWeighIn === 2) {
    return { targetMg: 500, note: 'Heavy restriction — maximum sodium excretion', phase: 'restriction' };
  }
  if (daysToWeighIn === 1) {
    return { targetMg: 250, note: 'Near-zero sodium', phase: 'restriction' };
  }
  return { targetMg: 0, note: 'Nothing until after weigh-in', phase: 'zero' };
}

// ── Carb Depletion Protocol ──────────────────────────────────────────────────

export interface CarbProtocol {
  targetG: number;
  fiberG: number;
  note: string;
}

/**
 * Carb depletion + low-fiber protocol to reduce glycogen stores and gut content.
 * Each gram of glycogen holds ~3g water, so depleting glycogen drops 1-3kg.
 */
export function getCarbProtocol(daysToWeighIn: number, bodyWeightKg: number): CarbProtocol {
  if (daysToWeighIn > 7) {
    return { targetG: Math.round(bodyWeightKg * 4), fiberG: 25, note: 'Normal carb intake' };
  }
  if (daysToWeighIn >= 5) {
    return { targetG: Math.round(bodyWeightKg * 1.5), fiberG: 10, note: 'Reduce carbs to begin glycogen depletion. Low fiber to reduce gut content.' };
  }
  if (daysToWeighIn >= 3) {
    return { targetG: 50, fiberG: 5, note: 'Minimal carbs — deep glycogen depletion. Very low fiber.' };
  }
  if (daysToWeighIn >= 1) {
    return { targetG: 20, fiberG: 0, note: 'Near-zero carbs. Protein-only meals or shakes.' };
  }
  return { targetG: 0, fiberG: 0, note: 'Nothing until after weigh-in' };
}

// ── Rehydration Protocol ─────────────────────────────────────────────────────

export interface RehydrationPhase {
  name: string;
  startMinutes: number;  // minutes after weigh-in
  endMinutes: number;
  fluidMl: number;
  sodiumMg: number;
  potassiumMg: number;
  carbsG: number;
  proteinG: number;
  foods: string[];
  avoid: string[];
  notes: string;
}

/**
 * Generate a timed rehydration protocol based on how much water was cut
 * and how much time is available before competition.
 *
 * Goal: regain 100% of water weight + glycogen supercompensation.
 * Reference: Sawka et al. 2007 — replace 150% of fluid lost.
 */
export function getRehydrationProtocol(
  waterCutKg: number,
  rehydrationTimeHours: number,
  bodyWeightKg: number,
): RehydrationPhase[] {
  const totalFluidNeeded = waterCutKg * 1500; // 150% of water cut in ml

  const phases: RehydrationPhase[] = [
    {
      name: 'Immediate (0-30 min)',
      startMinutes: 0,
      endMinutes: 30,
      fluidMl: Math.min(500, totalFluidNeeded * 0.1),
      sodiumMg: 500,
      potassiumMg: 200,
      carbsG: 20,
      proteinG: 0,
      foods: ['Oral rehydration solution (water + 1/2 tsp salt + 6 tsp sugar + lemon)'],
      avoid: ['Solid food (stomach needs to re-adapt)', 'Chugging (hyponatremia risk)'],
      notes: 'Sip slowly. Do not chug — risk of hyponatremia and GI distress.',
    },
    {
      name: 'Early Recovery (30 min - 2 hrs)',
      startMinutes: 30,
      endMinutes: 120,
      fluidMl: Math.round(totalFluidNeeded * 0.25),
      sodiumMg: 1000,
      potassiumMg: 400,
      carbsG: Math.round(bodyWeightKg * 1.5),
      proteinG: 25,
      foods: ['White rice', 'Banana', 'Sports drink', 'Lean protein (chicken, turkey)'],
      avoid: ['Fiber', 'Dairy', 'High fat (slows gastric emptying)'],
      notes: 'Easy-to-digest carbs + moderate protein. Continue sipping fluids.',
    },
    {
      name: 'Mid Recovery (2-6 hrs)',
      startMinutes: 120,
      endMinutes: 360,
      fluidMl: Math.round(totalFluidNeeded * 0.4),
      sodiumMg: 1500,
      potassiumMg: 500,
      carbsG: Math.round(bodyWeightKg * 3),
      proteinG: Math.round(bodyWeightKg * 0.5),
      foods: ['Rice + chicken', 'Pasta + lean meat', 'Fruit', 'Electrolyte drinks', 'Potatoes'],
      avoid: ['Spicy food', 'Alcohol', 'Very high fat meals'],
      notes: 'Eat every 1-2 hours. Target glycogen supercompensation with 8-10 g/kg carbs over 12-24hrs total.',
    },
  ];

  if (rehydrationTimeHours > 6) {
    phases.push({
      name: 'Full Recovery (6-24 hrs)',
      startMinutes: 360,
      endMinutes: rehydrationTimeHours * 60,
      fluidMl: Math.round(totalFluidNeeded * 0.25),
      sodiumMg: 1000,
      potassiumMg: 300,
      carbsG: Math.round(bodyWeightKg * 4),
      proteinG: Math.round(bodyWeightKg * 0.8),
      foods: ['Normal meals — high carb, moderate protein, low-moderate fat', 'Familiar foods only'],
      avoid: ['New foods', 'Excessive fiber', 'Alcohol'],
      notes: 'Continue eating normal meals. Prioritize sleep (8-9hrs). Magnesium before bed.',
    });
  }

  return phases;
}

// ── Safety Assessment ────────────────────────────────────────────────────────

export interface WeightCutSafetyAssessment {
  level: WeightCutSafetyLevel;
  canProceed: boolean;
  alerts: string[];
  blockers: string[];  // hard stops that prevent proceeding
  maxWaterCutPercent: number;
}

/**
 * Comprehensive safety check for a weight cut plan.
 * Returns blockers (hard stops) and alerts (warnings).
 */
export function assessWeightCutSafety({
  currentWeightKg,
  targetWeightKg,
  daysToWeighIn,
  rehydrationTimeHours,
  age,
  sex,
  cutExperience,
  menstrualStatus,
  hasEatingDisorderHistory,
}: {
  currentWeightKg: number;
  targetWeightKg: number;
  daysToWeighIn: number;
  rehydrationTimeHours: number;
  age: number;
  sex: BiologicalSex;
  cutExperience?: CutExperience;
  menstrualStatus?: MenstrualStatus;
  hasEatingDisorderHistory?: boolean;
}): WeightCutSafetyAssessment {
  const totalCutKg = currentWeightKg - targetWeightKg;
  const totalCutPercent = (totalCutKg / currentWeightKg) * 100;
  const weeklyLossPercent = daysToWeighIn > 0
    ? (totalCutPercent / (daysToWeighIn / 7))
    : totalCutPercent;

  const alerts: string[] = [];
  const blockers: string[] = [];
  let level: WeightCutSafetyLevel = 'safe';

  // Determine max water cut based on experience
  let maxWaterCut: number = WEIGHT_CUT_LIMITS.maxWaterCutPercent;
  if (cutExperience === 'none') {
    maxWaterCut = WEIGHT_CUT_LIMITS.maxWaterCutFirstTime;
    alerts.push('First weight cut — limited to 3% BW water manipulation. Do a trial run before actual competition.');
  }

  // Hard blockers
  if (hasEatingDisorderHistory) {
    blockers.push('Weight cutting protocols are not recommended for individuals with eating disorder history. Please work with a mental health professional.');
    level = 'critical';
  }

  if (age < WEIGHT_CUT_LIMITS.minAgeForWaterCut) {
    blockers.push(`Water manipulation is not safe for athletes under ${WEIGHT_CUT_LIMITS.minAgeForWaterCut}. Use chronic weight management (caloric deficit) only.`);
    level = 'critical';
  }

  if (menstrualStatus === 'amenorrheic') {
    blockers.push('Amenorrhea detected — RED-S is likely active. Do NOT cut weight. Increase caloric intake and consult a sports medicine physician.');
    level = 'critical';
  }

  // Danger thresholds
  if (totalCutPercent > WEIGHT_CUT_LIMITS.dangerTotalCutPercent) {
    alerts.push(`Attempting to cut ${totalCutPercent.toFixed(1)}% of body weight. This exceeds safe limits and risks severe muscle loss, hormonal disruption, and performance decline. Consider moving up a weight class.`);
    level = 'danger';
  }

  if (weeklyLossPercent > WEIGHT_CUT_LIMITS.weeklyLossDanger) {
    alerts.push(`Required weekly loss rate of ${weeklyLossPercent.toFixed(1)}% BW/week exceeds the danger threshold. Extreme measures would be required.`);
    level = level === 'critical' ? 'critical' : 'danger';
  } else if (weeklyLossPercent > WEIGHT_CUT_LIMITS.weeklyLossWarning) {
    alerts.push(`Weekly loss rate of ${weeklyLossPercent.toFixed(1)}% BW/week is aggressive but manageable with careful nutrition and monitoring.`);
    if (level === 'safe') level = 'caution';
  }

  if (totalCutKg > 5 && daysToWeighIn < 3) {
    alerts.push('More than 5kg to lose in under 3 days — this requires extreme water cutting. Professional supervision required.');
    level = level === 'critical' ? 'critical' : 'danger';
  }

  if (totalCutKg > 15 && daysToWeighIn < 14) {
    alerts.push('More than 15kg to lose in under 2 weeks — this is not safely achievable. Consider moving up a weight class.');
    level = 'critical';
  }

  if (rehydrationTimeHours < WEIGHT_CUT_LIMITS.minRehydrationHours) {
    alerts.push(`Only ${rehydrationTimeHours} hours between weigh-in and competition. Insufficient rehydration time — performance will be severely impaired.`);
    if (level === 'safe') level = 'caution';
  }

  if (sex === 'female' && totalCutPercent > 7) {
    alerts.push('Female athletes face higher RED-S risk with large weight cuts. Monitor menstrual function, energy levels, and mood closely.');
    if (level === 'safe') level = 'caution';
  }

  return {
    level,
    canProceed: blockers.length === 0,
    alerts,
    blockers,
    maxWaterCutPercent: maxWaterCut,
  };
}

// ── Daily Checklist Generator ────────────────────────────────────────────────

export interface DailyChecklist {
  date: string;
  phase: WeightCutPhase;
  tasks: { task: string; critical: boolean }[];
  waterProtocol: WaterProtocol;
  sodiumProtocol: SodiumProtocol;
  carbProtocol: CarbProtocol;
}

/**
 * Generate a daily checklist for the weight cut based on days to weigh-in.
 */
export function generateDailyChecklist(
  daysToWeighIn: number,
  bodyWeightKg: number,
): DailyChecklist {
  const phase = detectWeightCutPhase(daysToWeighIn, true);
  const water = getWaterProtocol(daysToWeighIn, bodyWeightKg);
  const sodium = getSodiumProtocol(daysToWeighIn);
  const carbs = getCarbProtocol(daysToWeighIn, bodyWeightKg);

  const tasks: { task: string; critical: boolean }[] = [
    { task: 'Morning weigh-in (fasted, post-void)', critical: true },
  ];

  if (phase === 'chronic_loss') {
    tasks.push(
      { task: `Hit calorie target (20% deficit)`, critical: true },
      { task: `Protein: 2.8-3.1 g/kg minimum`, critical: true },
      { task: `Water: ${Math.round(water.targetMl / 1000)}L`, critical: false },
      { task: 'Log all meals', critical: true },
    );
  } else if (phase === 'acute_reduction') {
    tasks.push(
      { task: `Water intake: ${Math.round(water.targetMl / 1000)}L (${water.note})`, critical: true },
      { task: `Sodium: ${sodium.targetMg}mg (${sodium.note})`, critical: true },
      { task: `Carbs: ${carbs.targetG}g max`, critical: true },
      { task: `Fiber: ${carbs.fiberG}g max`, critical: true },
      { task: 'Low-residue, low-volume foods only', critical: false },
      { task: 'Reduce training volume 30%', critical: false },
    );
  } else if (phase === 'water_cut') {
    tasks.push(
      { task: `Water: SIPS ONLY (${water.note})`, critical: true },
      { task: `Sodium: ${sodium.targetMg}mg or less`, critical: true },
      { task: 'Protein-only meals or shakes (no solid food if day of)', critical: true },
      { task: 'Sauna: max 20min sessions with breaks (60min total/day)', critical: false },
      { task: 'Monitor: HR, urine color, mental clarity', critical: true },
      { task: 'STOP if: HR >100 resting, confusion, no urine >8hrs, dizziness', critical: true },
    );
  } else if (phase === 'rehydration') {
    tasks.push(
      { task: 'Begin sipping ORS immediately after weigh-in', critical: true },
      { task: 'Do NOT chug water (hyponatremia risk)', critical: true },
      { task: 'First 2hrs: 1-1.5L + electrolytes + light carbs', critical: true },
      { task: 'Eat every 1-2 hours: rice, chicken, banana, sports drink', critical: true },
      { task: `Target: ${Math.round(bodyWeightKg * 8)}g carbs over 12-24hrs (glycogen supercomp)`, critical: false },
      { task: 'Avoid: fiber, dairy, fat, spicy food', critical: false },
    );
  }

  return {
    date: toLocalDateStr(),
    phase,
    tasks,
    waterProtocol: water,
    sodiumProtocol: sodium,
    carbProtocol: carbs,
  };
}

// ── Emergency Triggers ───────────────────────────────────────────────────────

export interface EmergencyCheck {
  shouldStop: boolean;
  isEmergency: boolean;
  message: string;
}

/**
 * Check daily log entries for emergency conditions.
 */
export function checkEmergencyTriggers(log: WeightCutDailyLog): EmergencyCheck {
  if (log.restingHR && log.restingHR > WEIGHT_CUT_LIMITS.emergencyHRThreshold) {
    return {
      shouldStop: true,
      isEmergency: true,
      message: `Resting HR is ${log.restingHR} bpm (>100). STOP all dehydration immediately and begin rehydration. If symptoms persist, seek medical attention.`,
    };
  }

  if (log.urineColor && log.urineColor >= 7) {
    return {
      shouldStop: true,
      isEmergency: false,
      message: 'Urine is very dark (level 7-8). You are dangerously dehydrated. Begin rehydration or reduce the intensity of your water cut.',
    };
  }

  if (log.moodScore && log.moodScore <= 1 && log.energyScore && log.energyScore <= 1) {
    return {
      shouldStop: true,
      isEmergency: false,
      message: 'Extremely low mood and energy reported. Consider whether this cut is worth the health risk. Take a break and reassess.',
    };
  }

  return { shouldStop: false, isEmergency: false, message: '' };
}

// ── Weight Cut Projection ────────────────────────────────────────────────────

/**
 * Project whether the athlete will make weight based on current trajectory.
 */
export function projectWeighInWeight(
  currentWeightKg: number,
  targetWeightKg: number,
  daysToWeighIn: number,
  recentWeeklyChange: number, // kg/week (negative = losing)
): {
  projectedWeight: number;
  willMakeWeight: boolean;
  waterCutNeeded: number;  // kg that would need to come from water manipulation
  message: string;
} {
  // Project chronic loss continuation
  const dailyChange = recentWeeklyChange / 7;
  const projectedFromDiet = currentWeightKg + (dailyChange * Math.max(0, daysToWeighIn - 2));

  // Last 2 days are water cut territory
  const waterCutNeeded = Math.max(0, projectedFromDiet - targetWeightKg);
  const projectedWeight = Math.round((projectedFromDiet - waterCutNeeded) * 10) / 10;

  const waterCutPercent = (waterCutNeeded / currentWeightKg) * 100;

  let message: string;
  let willMakeWeight = true;

  if (waterCutPercent > 6) {
    message = `Projected to need ${waterCutNeeded.toFixed(1)}kg (${waterCutPercent.toFixed(1)}%) water cut — this exceeds safe limits. Intensify caloric deficit NOW.`;
    willMakeWeight = false;
  } else if (waterCutPercent > 3) {
    message = `Projected to need ${waterCutNeeded.toFixed(1)}kg water cut. Significant but achievable with proper protocol.`;
  } else if (waterCutNeeded > 0) {
    message = `On track. Only ${waterCutNeeded.toFixed(1)}kg water cut needed — very manageable.`;
  } else {
    message = 'On track to make weight through diet alone. Water cut may not be necessary.';
  }

  return { projectedWeight, willMakeWeight, waterCutNeeded, message };
}
