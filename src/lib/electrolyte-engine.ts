/**
 * Electrolyte Engine — sweat-rate-based electrolyte calculation for combat athletes.
 *
 * Estimates fluid loss and electrolyte needs based on:
 *   - Body weight
 *   - Session type and intensity
 *   - Duration
 *   - Environmental temperature (self-reported)
 *
 * Also provides intra-training fueling recommendations.
 *
 * References:
 *   - Sawka et al. 2007 (ACSM position stand): fluid replacement guidelines
 *   - Baker et al. 2016: sweat sodium concentration in athletes (~20-80 mmol/L)
 *   - Thomas et al. 2016 (AND/ACSM): nutrition and athletic performance
 */

import type { ElectrolyteNeeds } from './types';

// ── Sweat Rate Estimation ────────────────────────────────────────────────────

export type TemperatureCondition = 'cool' | 'moderate' | 'hot';

/** Base sweat rates (L/hr) by temperature for a ~70kg athlete. */
const BASE_SWEAT_RATES: Record<TemperatureCondition, number> = {
  cool: 0.8,    // <20°C / <68°F — air-conditioned or cool gym
  moderate: 1.2, // 20-28°C / 68-82°F — typical indoor gym
  hot: 1.8,     // >28°C / >82°F — hot gym, outdoor training, Thailand camps
};

/** Intensity multipliers for sweat rate. */
const SWEAT_INTENSITY_MULTIPLIERS: Record<string, number> = {
  // Combat / grappling
  bjj_gi: 1.3,       // gi adds heat retention
  bjj_nogi: 1.2,
  wrestling: 1.3,
  judo: 1.3,
  sambo: 1.2,
  // Striking
  boxing: 1.1,
  kickboxing: 1.1,
  muay_thai: 1.2,
  karate: 1.0,
  taekwondo: 1.0,
  mma: 1.3,
  // Cardio
  running: 1.1,
  cycling: 0.9,       // wind cooling effect
  swimming: 0.6,      // water cooling
  rowing: 1.0,
  jump_rope: 1.1,
  // Lifting
  strength: 0.8,
  hypertrophy: 0.9,
  power: 0.8,
  // Recovery
  yoga: 0.5,
  sauna: 2.5,         // extreme fluid loss
  // Default
  other: 1.0,
};

/**
 * Estimate sweat rate and electrolyte losses for a training session.
 *
 * Sweat composition (Baker et al. 2016):
 *   - Sodium: ~20-80 mmol/L (average ~50 mmol/L ≈ 1150mg/L)
 *   - Potassium: ~3-8 mmol/L (average ~5 mmol/L ≈ 195mg/L)
 *   - Magnesium: ~0.02-0.06 mmol/L (average ~0.04 mmol/L ≈ 1mg/L, but intracellular losses are higher)
 */
export function calculateElectrolyteNeeds(
  bodyWeightKg: number,
  sessionType: string,
  durationMinutes: number,
  temperature: TemperatureCondition = 'moderate',
): ElectrolyteNeeds {
  const baseSweatRate = BASE_SWEAT_RATES[temperature];
  const intensityMult = SWEAT_INTENSITY_MULTIPLIERS[sessionType] ?? 1.0;

  // Scale sweat rate by body mass (normalized to 70kg reference)
  const sweatRateLPerHr = baseSweatRate * intensityMult * (bodyWeightKg / 70);
  const totalSweatL = sweatRateLPerHr * (durationMinutes / 60);

  return {
    fluidLossL: Math.round(totalSweatL * 10) / 10,
    replacementFluidL: Math.round(totalSweatL * 1.5 * 10) / 10, // 150% replacement
    sodiumMg: Math.round(totalSweatL * 1150),  // ~1150mg/L average
    potassiumMg: Math.round(totalSweatL * 195), // ~195mg/L average
    magnesiumMg: Math.round(totalSweatL * 15),   // intracellular + sweat loss estimate
    timing: durationMinutes > 60
      ? 'Begin replacing during session and continue for 2-4 hours post-session'
      : 'Replace within 2 hours post-session',
  };
}

// ── Intra-Training Fueling ───────────────────────────────────────────────────

export interface IntraTrainingFuel {
  carbsG: number;
  electrolyteDrink: boolean;
  sodiumMgPerL: number;
  fluidMlPerHr: number;
  foods: string[];
  notes: string;
}

/**
 * Get intra-training fueling recommendations based on session duration and context.
 *
 * Reference: Thomas et al. 2016 (AND/ACSM):
 *   - <60min: water only
 *   - 60-90min: small amounts of carbs (15-30g) if high intensity
 *   - >90min: 30-60g carbs/hr
 */
export function getIntraTrainingFuel(
  durationMinutes: number,
  sessionType: string,
  isInCut: boolean,
  bodyWeightKg: number,
): IntraTrainingFuel {
  // Short sessions — water only
  if (durationMinutes < 60) {
    return {
      carbsG: 0,
      electrolyteDrink: false,
      sodiumMgPerL: 0,
      fluidMlPerHr: Math.round(bodyWeightKg * 5), // ~350-500ml/hr
      foods: [],
      notes: 'Water only. Session too short to need fueling.',
    };
  }

  // Medium sessions (60-90min)
  if (durationMinutes < 90) {
    return {
      carbsG: isInCut ? 0 : 20,
      electrolyteDrink: true,
      sodiumMgPerL: 500,
      fluidMlPerHr: Math.round(bodyWeightKg * 7),
      foods: isInCut ? [] : ['Sports drink (diluted)', 'Dates (2-3)'],
      notes: isInCut
        ? 'During a cut: electrolyte water only to preserve deficit. Prioritize sodium.'
        : 'Light carbs optional. Focus on hydration + electrolytes.',
    };
  }

  // Long sessions (90min+) — fueling is critical
  const carbsPerHr = isInCut ? 20 : 45; // reduce during cut but don't eliminate
  const totalCarbs = Math.round(carbsPerHr * (durationMinutes / 60));

  return {
    carbsG: totalCarbs,
    electrolyteDrink: true,
    sodiumMgPerL: 750,
    fluidMlPerHr: Math.round(bodyWeightKg * 10),
    foods: [
      'Sports drink (30-60g carbs/hr)',
      'Dates or rice cakes between rounds',
      'Gel packets if preferred',
      'Banana (quick energy + potassium)',
    ],
    notes: `${durationMinutes}min session — active fueling required. Practice this in training before competition day.`,
  };
}

// ── Hydration Status Assessment ──────────────────────────────────────────────

export type HydrationStatus = 'well_hydrated' | 'mild_dehydration' | 'moderate_dehydration' | 'severe_dehydration';

/**
 * Assess hydration status from available data.
 */
export function assessHydrationStatus(
  waterIntakeMl: number,
  targetMl: number,
  bodyWeightBeforeKg?: number,
  bodyWeightAfterKg?: number,
  urineColor?: number, // 1-8 scale
): { status: HydrationStatus; message: string; fluidDeficitMl: number } {
  let deficitIndicators = 0;
  let fluidDeficitMl = 0;

  // Check intake vs target
  const intakeRatio = waterIntakeMl / targetMl;
  if (intakeRatio < 0.5) deficitIndicators += 2;
  else if (intakeRatio < 0.75) deficitIndicators += 1;

  // Check body weight change (if before/after available)
  if (bodyWeightBeforeKg && bodyWeightAfterKg) {
    const weightLossKg = bodyWeightBeforeKg - bodyWeightAfterKg;
    fluidDeficitMl = Math.round(weightLossKg * 1500); // 150% replacement
    if (weightLossKg > bodyWeightBeforeKg * 0.03) deficitIndicators += 2;
    else if (weightLossKg > bodyWeightBeforeKg * 0.01) deficitIndicators += 1;
  }

  // Check urine color
  if (urineColor) {
    if (urineColor >= 6) deficitIndicators += 2;
    else if (urineColor >= 4) deficitIndicators += 1;
  }

  let status: HydrationStatus;
  let message: string;

  if (deficitIndicators >= 4) {
    status = 'severe_dehydration';
    message = 'Significant dehydration detected. Prioritize fluid replacement with electrolytes immediately.';
  } else if (deficitIndicators >= 2) {
    status = 'moderate_dehydration';
    message = 'Moderate dehydration. Increase fluid intake and include electrolytes.';
  } else if (deficitIndicators >= 1) {
    status = 'mild_dehydration';
    message = 'Slightly behind on hydration. Drink more water before your next session.';
  } else {
    status = 'well_hydrated';
    message = 'Hydration looks good. Maintain current intake.';
  }

  return { status, message, fluidDeficitMl: Math.max(0, fluidDeficitMl) };
}

// ── Tournament Day Fueling ───────────────────────────────────────────────────

export interface TournamentFuelPlan {
  preFirstMatch: { timing: string; calories: number; foods: string[] };
  betweenMatches: { timing: string; calories: number; foods: string[] };
  hydration: { mlBetweenMatches: number; electrolyteMgSodium: number };
  postFinalMatch: { timing: string; foods: string[] };
}

/**
 * Generate fueling plan for tournament day (multiple matches).
 */
export function getTournamentDayFuel(bodyWeightKg: number): TournamentFuelPlan {
  return {
    preFirstMatch: {
      timing: '3-4 hours before first match',
      calories: Math.round(bodyWeightKg * 7), // ~500-600kcal for 80kg athlete
      foods: [
        'White rice + grilled chicken (simple, familiar)',
        'Banana',
        'Small amount of honey or jam for quick energy',
        'Avoid: fiber, dairy, fat, spicy food',
      ],
    },
    betweenMatches: {
      timing: 'Every 30-60 minutes between matches',
      calories: Math.round(bodyWeightKg * 2), // ~150-200kcal
      foods: [
        'Dates (2-3) — fast energy + potassium',
        'Rice cakes with honey',
        'Sports drink (sip, don\'t chug)',
        'Banana (if >60min between matches)',
        'Gel packets for quick energy',
      ],
    },
    hydration: {
      mlBetweenMatches: Math.round(bodyWeightKg * 5), // ~300-500ml
      electrolyteMgSodium: 500, // per serving between matches
    },
    postFinalMatch: {
      timing: 'Within 60 minutes of final match',
      foods: [
        'Large recovery meal: rice + protein + vegetables',
        'Electrolyte drink',
        'Fruit for glycogen replenishment',
        'Celebrate — you earned it',
      ],
    },
  };
}
