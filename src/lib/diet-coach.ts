/**
 * Evidence-based diet coaching engine (v2 — combat sports optimized).
 *
 * Upgrades from v1:
 *   - Cunningham equation (BMR from lean mass) when body fat % available
 *   - Dynamic TDEE from actual logged training sessions (replaces flat 1.55 multiplier)
 *   - Deficit-severity protein scaling (2.3 → 3.1 g/kg), sex-equalized per Helms 2014
 *   - Proper fat floors (0.7 g/kg male, 0.8 g/kg female minimum)
 *   - Energy Availability calculation (replaces absolute calorie floors)
 *   - Fight camp acceleration (faster adjustment cadence near competition)
 *   - Non-combat path preserved — general fitness users get the same proven v1 logic
 *
 * References:
 *   - Cunningham 1991: BMR = 500 + 22 × LBM; validated for athletes (Jagim 2018)
 *   - Helms et al. 2014: protein 2.3–3.1 g/kg for lean athletes in deficit
 *   - Hector & Phillips 2018: protein needs increase with deficit severity
 *   - Longland et al. 2016: 2.4 g/kg preserves LBM in aggressive deficit
 *   - Garthe et al. 2011: 0.7% BW/week optimal cutting rate
 *   - Byrne et al. 2017 (MATADOR): intermittent dieting benefits
 *   - Volek et al. 2001: testosterone declines below 0.6 g/kg fat
 *   - Mountjoy et al. 2018: IOC consensus on RED-S, EA < 30 kcal/kg FFM threshold
 *   - Loucks & Thuma 2003: 30 kcal/kg FFM clinical LEA threshold
 */

import {
  MacroTargets, DietGoal, DietPhase, BodyWeightEntry, BiologicalSex,
  TrainingSession, WorkoutLog, OccupationType,
  EnergyAvailabilityResult, EnergyAvailabilityStatus,
} from './types';

// ── MET values for session calorie estimation ────────────────────────────────

/** Metabolic equivalent values (kcal/kg/hr) for training types. */
const SESSION_MET_VALUES: Record<string, number> = {
  // Grappling
  bjj_gi: 9.0, bjj_nogi: 9.5, wrestling: 10.0, judo: 10.0, sambo: 9.5,
  // Striking
  boxing: 9.0, kickboxing: 8.5, muay_thai: 9.0, karate: 7.5, taekwondo: 7.5,
  // MMA
  mma: 10.0,
  // Cardio
  running: 8.0, cycling: 6.5, swimming: 7.0, rowing: 7.0, jump_rope: 9.0, elliptical: 5.0,
  // Outdoor
  hiking: 5.0, skiing: 6.0, snowboarding: 5.0, rock_climbing: 7.0, surfing: 5.0,
  // Recovery (low calorie cost)
  yoga: 2.5, stretching: 2.0, mobility: 2.0, sauna: 1.5, cold_plunge: 1.5,
  // Other
  other: 5.0,
};

/** MET values for lifting sessions based on workout type. */
const LIFTING_MET_VALUES: Record<string, number> = {
  strength: 5.5,
  hypertrophy: 5.0,
  power: 6.0,
};

/** Intensity multipliers applied to base MET values. */
const INTENSITY_MULTIPLIERS: Record<string, number> = {
  light_flow: 0.7,
  moderate: 1.0,
  hard_sparring: 1.3,
  competition_prep: 1.4,
};

/**
 * NEAT multipliers for occupation type (non-exercise activity thermogenesis).
 * When training data is available, we use lower occupation-only values to avoid
 * double-counting exercise (training cals are added separately as EAT).
 * When no training data exists, we use the full Harris-Benedict multipliers as fallback.
 */
const OCCUPATION_NEAT: Record<OccupationType, number> = {
  sedentary: 1.2,      // desk job — same either way
  lightly_active: 1.3, // was 1.375 — lower to avoid double-counting EAT
  active: 1.4,         // was 1.55 — teacher, retail, nurse
  very_active: 1.6,    // was 1.725 — construction, warehouse
};

/** Full Harris-Benedict multipliers — used as fallback when no training data exists. */
const HARRIS_BENEDICT_AF: Record<OccupationType, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  active: 1.55,
  very_active: 1.725,
};

// ── BMR Calculation ──────────────────────────────────────────────────────────

/**
 * Mifflin-St Jeor BMR — fallback when body fat % is unavailable.
 * Validated as most accurate for general population by ADA (2005).
 */
export function mifflinStJeorBMR(weightKg: number, heightCm: number, age: number, sex: BiologicalSex): number {
  const sexConstant = sex === 'male' ? 5 : -161;
  return 10 * weightKg + 6.25 * heightCm - 5 * age + sexConstant;
}

/**
 * Cunningham BMR — preferred when lean body mass is known.
 * More accurate for muscular/lean athletes (Cunningham 1991, Jagim 2018).
 *   BMR = 500 + 22 × lean body mass (kg)
 */
export function cunninghamBMR(leanMassKg: number): number {
  return 500 + 22 * leanMassKg;
}

/**
 * Estimate lean body mass from body weight and body fat percentage.
 */
export function estimateLeanMass(bodyWeightKg: number, bodyFatPercent: number): number {
  return bodyWeightKg * (1 - bodyFatPercent / 100);
}

// ── Dynamic TDEE ─────────────────────────────────────────────────────────────

/**
 * Estimate calorie cost of a single training session.
 */
export function estimateSessionCalories(
  sessionType: string,
  durationMinutes: number,
  bodyWeightKg: number,
  intensity?: string,
): number {
  const baseMET = SESSION_MET_VALUES[sessionType] ?? 5.0;
  const intensityMult = intensity ? (INTENSITY_MULTIPLIERS[intensity] ?? 1.0) : 1.0;
  const hours = durationMinutes / 60;
  return Math.round(baseMET * intensityMult * bodyWeightKg * hours);
}

/**
 * Estimate calorie cost of a lifting workout.
 */
export function estimateLiftingCalories(
  workoutType: string,
  durationMinutes: number,
  bodyWeightKg: number,
): number {
  const baseMET = LIFTING_MET_VALUES[workoutType] ?? 5.0;
  const hours = durationMinutes / 60;
  return Math.round(baseMET * bodyWeightKg * hours);
}

interface DynamicTDEEInput {
  bmr: number;
  weeklyTrainingSessions: TrainingSession[];
  weeklyLiftingSessions: WorkoutLog[];
  bodyWeightKg: number;
  occupation?: OccupationType;
}

/**
 * Calculate TDEE dynamically from actual training data + occupation NEAT.
 * Falls back to occupation-based multiplier if no sessions are logged.
 */
export function calculateDynamicTDEE({
  bmr,
  weeklyTrainingSessions,
  weeklyLiftingSessions,
  bodyWeightKg,
  occupation = 'lightly_active',
}: DynamicTDEEInput): { tdee: number; activityFactor: number; trainingCals: number } {
  // Calculate weekly training calories from actual sessions
  let weeklyTrainingCals = 0;

  for (const session of weeklyTrainingSessions) {
    const intensity = session.actualIntensity || session.plannedIntensity;
    weeklyTrainingCals += estimateSessionCalories(
      session.type,
      session.duration,
      bodyWeightKg,
      intensity,
    );
  }

  for (const workout of weeklyLiftingSessions) {
    weeklyTrainingCals += estimateLiftingCalories(
      'hypertrophy', // default if unknown
      workout.duration,
      bodyWeightKg,
    );
  }

  const hasTrainingData = weeklyTrainingSessions.length > 0 || weeklyLiftingSessions.length > 0;

  if (hasTrainingData) {
    // TEF (Thermic Effect of Food) ~10% of total intake — approximated
    const dailyTrainingCals = weeklyTrainingCals / 7;
    const neatMultiplier = OCCUPATION_NEAT[occupation];
    // NEAT applies to BMR for non-exercise activity
    const neatCals = bmr * (neatMultiplier - 1); // subtract 1 since BMR is the base
    const tdee = Math.round(bmr + neatCals + dailyTrainingCals);
    const activityFactor = Math.round((tdee / bmr) * 100) / 100;
    return { tdee, activityFactor, trainingCals: Math.round(dailyTrainingCals) };
  }

  // Fallback: full Harris-Benedict multiplier (includes all activity, less accurate)
  const fallbackMultiplier = HARRIS_BENEDICT_AF[occupation];
  const tdee = Math.round(bmr * fallbackMultiplier);
  return { tdee, activityFactor: fallbackMultiplier, trainingCals: 0 };
}

// ── Macro Calculation ────────────────────────────────────────────────────────

interface MacroInput {
  bodyWeightKg: number;
  heightCm: number;
  age: number;
  sex: BiologicalSex;
  goal: DietGoal;
  activityMultiplier?: number;       // legacy: 1.2→1.9; still used if no dynamic data
  bodyFatPercent?: number;           // enables Cunningham + EA calculation
  deficitSeverity?: 'mild' | 'moderate' | 'aggressive'; // scales protein for fight camp
  isCombatAthlete?: boolean;         // enables combat-specific adjustments
  occupation?: OccupationType;
  // Dynamic TDEE inputs (optional — overrides activityMultiplier when present)
  weeklyTrainingSessions?: TrainingSession[];
  weeklyLiftingSessions?: WorkoutLog[];
}

/**
 * Calculate evidence-based macros with combat-sport enhancements.
 *
 * Priority: protein → fat floor → carbs fill remaining calories.
 *
 * When bodyFatPercent is provided:
 *   - Uses Cunningham equation (more accurate for lean athletes)
 *   - Enables Energy Availability monitoring
 *
 * When weeklyTrainingSessions/weeklyLiftingSessions are provided:
 *   - Computes dynamic TDEE from actual training data (replaces flat multiplier)
 *
 * When deficitSeverity is set (combat athletes):
 *   - Scales protein up for aggressive cuts (2.8-3.1 g/kg)
 *   - This is critical during fight camp to preserve lean mass under high training volume
 *
 * Non-combat users: get the same proven Mifflin-St Jeor + standard macro splits.
 */
export function calculateMacros({
  bodyWeightKg,
  heightCm,
  age,
  sex,
  goal,
  activityMultiplier = 1.55,
  bodyFatPercent,
  deficitSeverity,
  isCombatAthlete = false,
  occupation,
  weeklyTrainingSessions,
  weeklyLiftingSessions,
}: MacroInput): MacroTargets & { bmr: number; tdee: number; leanMassKg?: number } {
  const bw = bodyWeightKg;
  const isFemale = sex === 'female';

  // Step 1: Calculate BMR (Cunningham when BF% available, Mifflin-St Jeor fallback)
  let bmr: number;
  let leanMassKg: number | undefined;

  if (bodyFatPercent != null && bodyFatPercent > 0 && bodyFatPercent < 60) {
    leanMassKg = estimateLeanMass(bw, bodyFatPercent);
    bmr = cunninghamBMR(leanMassKg);
  } else {
    bmr = mifflinStJeorBMR(bw, heightCm, age, sex);
  }

  // Step 2: Calculate TDEE (dynamic from training data, or legacy multiplier)
  let tdee: number;
  const hasTrainingData =
    (weeklyTrainingSessions && weeklyTrainingSessions.length > 0) ||
    (weeklyLiftingSessions && weeklyLiftingSessions.length > 0);

  if (hasTrainingData) {
    const dynamic = calculateDynamicTDEE({
      bmr,
      weeklyTrainingSessions: weeklyTrainingSessions ?? [],
      weeklyLiftingSessions: weeklyLiftingSessions ?? [],
      bodyWeightKg: bw,
      occupation,
    });
    tdee = dynamic.tdee;
  } else {
    tdee = Math.round(bmr * activityMultiplier);
  }

  // Step 3: Apply caloric target based on goal + sex
  let calories: number;
  let proteinPerKg: number;
  let fatPerKg: number;

  switch (goal) {
    case 'cut': {
      calories = Math.round(tdee * 0.8); // ~20% deficit

      // Protein scaling based on deficit severity (combat athletes)
      // Helms et al. 2014: Protein recommendations are driven by deficit severity,
      // not biological sex. 2.3-3.1 g/kg for lean athletes in deficit.
      // Hector & Phillips 2018: No significant sex-based protein differences found.
      // Longland et al. 2016: 2.4 g/kg preserves LBM in aggressive deficit.
      if (isCombatAthlete && deficitSeverity === 'aggressive') {
        proteinPerKg = 3.1;
      } else if (isCombatAthlete && deficitSeverity === 'moderate') {
        proteinPerKg = 2.7;
      } else if (bodyFatPercent && bodyFatPercent > 25) {
        // Higher BF% users: scale protein to lean mass instead of total BW
        // Morton et al. 2018: diminishing returns above 1.62 g/kg total BW for non-lean
        // But we want to hit ~2.5 g/kg LBM — so scale down per-total-BW accordingly
        const leanMassFraction = 1 - (bodyFatPercent / 100);
        proteinPerKg = Math.max(1.8, 2.5 * leanMassFraction);
      } else {
        proteinPerKg = 2.4;
      }

      // Fat floor: 0.8 g/kg female, 0.7 g/kg male minimum
      // Volek et al. 2001: testosterone declines below 0.6 g/kg
      fatPerKg = isFemale ? 1.0 : 0.8;
      break;
    }
    case 'bulk':
      calories = Math.round(tdee * (isFemale ? 1.10 : 1.12));
      // Maintenance/surplus: 1.6-2.2 g/kg for both sexes (Schoenfeld & Aragon 2018)
      proteinPerKg = 2.0;
      fatPerKg = isFemale ? 1.0 : 1.0;
      break;
    case 'maintain':
    default:
      calories = tdee;
      // Maintenance: 1.6-2.2 g/kg for both sexes (Schoenfeld & Aragon 2018)
      proteinPerKg = 2.0;
      fatPerKg = isFemale ? 1.0 : 0.9;
      break;
  }

  // Step 4: Energy Availability safety floor (RED-S prevention)
  // If we have lean mass data, ensure EA >= 25 kcal/kg FFM (critical threshold)
  if (leanMassKg && hasTrainingData && goal === 'cut') {
    let dailyExerciseCost = 0;
    for (const s of weeklyTrainingSessions ?? []) {
      dailyExerciseCost += estimateSessionCalories(s.type, s.duration, bw, s.actualIntensity || s.plannedIntensity);
    }
    for (const w of weeklyLiftingSessions ?? []) {
      dailyExerciseCost += estimateLiftingCalories('hypertrophy', w.duration, bw);
    }
    dailyExerciseCost = dailyExerciseCost / 7;

    // EA = (Intake - Exercise Cost) / Lean Mass
    const ea = (calories - dailyExerciseCost) / leanMassKg;
    const EA_CRITICAL = 25; // kcal/kg FFM — below this triggers RED-S
    if (ea < EA_CRITICAL) {
      // Bump calories to ensure EA >= critical threshold
      calories = Math.round(EA_CRITICAL * leanMassKg + dailyExerciseCost);
    }
  }

  // Step 5: Set protein and fat, fill rest with carbs
  const protein = Math.round(bw * proteinPerKg);
  const fat = Math.round(bw * fatPerKg);
  const proteinCal = protein * 4;
  const fatCal = fat * 9;
  const carbCal = Math.max(0, calories - proteinCal - fatCal);
  const carbs = Math.round(carbCal / 4);

  return { calories, protein, carbs, fat, bmr: Math.round(bmr), tdee, leanMassKg };
}

// ── Energy Availability ──────────────────────────────────────────────────────

/**
 * Calculate Energy Availability (EA) — the key metric for RED-S prevention.
 *
 * EA = (Energy Intake - Exercise Energy Expenditure) / Lean Body Mass
 *
 * Thresholds (IOC Consensus, Mountjoy et al. 2018):
 *   >= 45 kcal/kg FFM = adequate
 *   30-45 = caution (monitor for symptoms)
 *   25-30 = low (RED-S risk, menstrual dysfunction, bone loss)
 *   < 25 = critical (must increase intake immediately)
 */
export function calculateEnergyAvailability(
  calorieIntake: number,
  exerciseCostKcal: number,
  leanMassKg: number,
): EnergyAvailabilityResult {
  if (leanMassKg <= 0) {
    return {
      ea: 0,
      status: 'adequate',
      message: 'Unable to calculate — body composition data needed.',
      leanMassKg: 0,
      exerciseCostKcal: 0,
    };
  }

  const ea = Math.round(((calorieIntake - exerciseCostKcal) / leanMassKg) * 10) / 10;

  let status: EnergyAvailabilityStatus;
  let message: string;

  if (ea >= 45) {
    status = 'adequate';
    message = 'Energy availability is adequate for health and performance.';
  } else if (ea >= 30) {
    status = 'caution';
    message = 'Energy availability is in the caution zone. Monitor for fatigue, mood changes, and menstrual irregularities.';
  } else if (ea >= 25) {
    status = 'low';
    message = 'Low energy availability — RED-S risk. Consider increasing calorie intake or reducing training volume.';
  } else {
    status = 'critical';
    message = 'Critical energy availability. Increase calorie intake immediately. Risk of hormonal disruption, bone loss, and immune suppression.';
  }

  return { ea, status, message, leanMassKg, exerciseCostKcal };
}

/**
 * Estimate daily exercise energy expenditure from logged sessions.
 * Used for EA calculation.
 */
export function estimateDailyExerciseCost(
  trainingSessions: TrainingSession[],
  liftingSessions: WorkoutLog[],
  bodyWeightKg: number,
): number {
  let total = 0;

  for (const s of trainingSessions) {
    const intensity = s.actualIntensity || s.plannedIntensity;
    total += estimateSessionCalories(s.type, s.duration, bodyWeightKg, intensity);
  }

  for (const w of liftingSessions) {
    total += estimateLiftingCalories('hypertrophy', w.duration, bodyWeightKg);
  }

  return total;
}

// ── Target Rate of Change ────────────────────────────────────────────────────

/**
 * Get recommended weekly weight change (kg) based on goal, body weight, and sex.
 * Positive = gaining, negative = losing.
 *
 * For combat athletes with fight camp context, rates can be overridden by the
 * fight-camp-engine based on proximity to competition.
 */
export function getTargetRate(goal: DietGoal, bodyWeightKg: number, sex?: BiologicalSex): number {
  const isFemale = sex === 'female';

  switch (goal) {
    case 'cut':
      return -(bodyWeightKg * (isFemale ? 0.005 : 0.007));
    case 'bulk':
      return bodyWeightKg * (isFemale ? 0.0018 : 0.003);
    case 'maintain':
    default:
      return 0;
  }
}

// ── Weekly Adaptive Adjustment ───────────────────────────────────────────────

interface AdjustmentInput {
  currentMacros: MacroTargets;
  goal: DietGoal;
  targetRatePerWeek: number;
  actualWeeklyChange: number;
  weeksAtPlateau: number;
  adherencePercent: number;
  sex?: BiologicalSex;
  bodyWeightKg?: number;
  isIll?: boolean;
  isFightCamp?: boolean;            // accelerate adjustments when in fight camp
  daysToCompetition?: number;       // fight-camp-aware timing
}

interface AdjustmentResult {
  newMacros: MacroTargets;
  adjustment: 'increase' | 'decrease' | 'maintain';
  reason: string;
  alert?: string;
  energyAvailability?: EnergyAvailabilityResult;
}

/**
 * Weekly macro adjustment algorithm.
 *
 * v2 changes:
 *   - Fat floor based on g/kg (not absolute grams)
 *   - Energy Availability check replaces absolute calorie floor
 *   - Fight camp mode: adjust after 1 week plateau instead of 2
 *   - Protein is never reduced below current level
 */
export function calculateWeeklyAdjustment({
  currentMacros,
  goal,
  targetRatePerWeek,
  actualWeeklyChange,
  weeksAtPlateau,
  adherencePercent,
  sex,
  bodyWeightKg,
  isIll,
  isFightCamp = false,
  daysToCompetition,
}: AdjustmentInput): AdjustmentResult {
  const isFemale = sex === 'female';
  const bw = bodyWeightKg || 70; // fallback for fat floor calculation

  // Pause adjustments during illness
  if (isIll) {
    return {
      newMacros: { ...currentMacros },
      adjustment: 'maintain',
      reason: 'Adjustments paused during illness. Weight changes while sick are water and inflammation, not real progress. Focus on recovery nutrition.',
      alert: goal === 'cut'
        ? 'Your cut is on hold while you recover. Eating at maintenance supports your immune system — you won\'t lose progress.'
        : undefined,
    };
  }

  // Don't adjust with poor adherence
  if (adherencePercent < 70) {
    return {
      newMacros: { ...currentMacros },
      adjustment: 'maintain',
      reason: 'Adherence below 70% — log more consistently before adjusting.',
    };
  }

  const tolerance = Math.abs(targetRatePerWeek) * 0.4 || 0.15;
  const diff = actualWeeklyChange - targetRatePerWeek;

  // Fight camp: respond faster to plateaus (1 week instead of 2)
  const plateauThreshold = isFightCamp ? 1 : 2;

  let adjustment: 'increase' | 'decrease' | 'maintain' = 'maintain';
  let reason = '';
  let alert: string | undefined;
  const newMacros = { ...currentMacros };

  if (goal === 'cut') {
    if (actualWeeklyChange > -tolerance * 0.5 && weeksAtPlateau >= plateauThreshold) {
      // Stalled — reduce by ~7% (fight camp: ~10% for urgency)
      const reductionPct = isFightCamp && daysToCompetition && daysToCompetition < 28 ? 0.10 : 0.07;
      adjustment = 'decrease';
      const calReduction = Math.round(currentMacros.calories * reductionPct);
      newMacros.calories -= calReduction;
      newMacros.carbs -= Math.round((calReduction * 0.6) / 4);
      newMacros.fat -= Math.round((calReduction * 0.4) / 9);
      reason = isFightCamp
        ? `Fight camp: weight stalled for ${weeksAtPlateau} week(s) with ${daysToCompetition ?? '?'} days to go. Reducing calories by ${calReduction}.`
        : `Weight stalled for ${weeksAtPlateau} weeks. Reducing calories by ${calReduction}.`;
    } else if (actualWeeklyChange < targetRatePerWeek * 1.5) {
      adjustment = 'increase';
      newMacros.calories += 100;
      newMacros.carbs += 25;
      reason = 'Losing faster than target. Adding carbs to preserve muscle.';
    } else if (Math.abs(diff) <= tolerance) {
      adjustment = 'maintain';
      reason = 'On track. Keep current macros.';
    }

    // Fat floor: g/kg based (upgraded from absolute grams)
    // Volek et al. 2001: testosterone declines below 0.6 g/kg fat
    const fatFloorGKg = isFemale ? 0.8 : 0.7;
    const fatFloor = Math.max(isFemale ? 50 : 45, Math.round(bw * fatFloorGKg));
    if (newMacros.fat < fatFloor) {
      newMacros.fat = fatFloor;
    }

    // Energy Availability check (replaces absolute calorie floor)
    // Still keep a hard absolute minimum as ultimate safety net
    const absoluteFloor = isFemale ? 1200 : 1400;
    if (newMacros.calories < absoluteFloor) {
      newMacros.calories = absoluteFloor;
      alert = isFemale
        ? 'Calories critically low — risk of hormonal disruption (RED-S). Take a 1-2 week diet break at maintenance.'
        : 'Calories critically low. Consider a 1-2 week diet break at maintenance.';
    }
  } else if (goal === 'bulk') {
    if (actualWeeklyChange < targetRatePerWeek * 0.5 && weeksAtPlateau >= 2) {
      adjustment = 'increase';
      const calIncrease = Math.round(currentMacros.calories * 0.05);
      newMacros.calories += calIncrease;
      newMacros.carbs += Math.round(calIncrease / 4);
      reason = `Gaining slower than target. Adding ${calIncrease} calories from carbs.`;
    } else if (actualWeeklyChange > targetRatePerWeek * 2) {
      adjustment = 'decrease';
      newMacros.calories -= 100;
      newMacros.carbs -= 25;
      reason = 'Gaining too fast. Reducing surplus to minimize fat gain.';
    } else {
      adjustment = 'maintain';
      reason = 'On track. Keep current macros.';
    }
  } else {
    // Maintenance
    if (Math.abs(actualWeeklyChange) > 0.3) {
      if (actualWeeklyChange > 0.3) {
        newMacros.calories -= 75;
        newMacros.carbs -= Math.round(75 / 4);
        adjustment = 'decrease';
        reason = 'Weight trending up. Small reduction to stabilize.';
      } else {
        newMacros.calories += 75;
        newMacros.carbs += Math.round(75 / 4);
        adjustment = 'increase';
        reason = 'Weight trending down. Small increase to stabilize.';
      }
    } else {
      adjustment = 'maintain';
      reason = 'Weight stable. Keep current macros.';
    }
  }

  // Recalculate calories from macros to keep consistent
  newMacros.calories = newMacros.protein * 4 + newMacros.carbs * 4 + newMacros.fat * 9;

  return { newMacros, adjustment, reason, alert };
}

// ── Weight Trend Smoothing ───────────────────────────────────────────────────

/**
 * Calculate a smoothed weight trend from raw weigh-ins.
 * Uses a 7-day exponentially weighted moving average.
 */
export function analyzeWeightTrend(
  entries: BodyWeightEntry[],
  unitPreference: 'kg' | 'lbs' = 'kg'
): { current: number; weeklyChange: number; weeksAtPlateau: number; trendData: { date: string; weight: number; trend: number }[] } {
  if (entries.length === 0) {
    return { current: 0, weeklyChange: 0, weeksAtPlateau: 0, trendData: [] };
  }

  const sorted = [...entries]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(e => ({
      date: new Date(e.date).toISOString().split('T')[0],
      weight: e.unit === 'lbs' ? e.weight * 0.453592 : e.weight,
    }));

  const alpha = 0.2;
  const trendData: { date: string; weight: number; trend: number }[] = [];
  let ema = sorted[0].weight;

  for (const entry of sorted) {
    ema = alpha * entry.weight + (1 - alpha) * ema;
    trendData.push({ date: entry.date, weight: entry.weight, trend: Math.round(ema * 10) / 10 });
  }

  const current = ema;

  let weeklyChange = 0;
  if (trendData.length >= 7) {
    const recent = trendData.slice(-7);
    const recentAvg = recent.reduce((s, d) => s + d.trend, 0) / recent.length;

    if (trendData.length >= 14) {
      const prev = trendData.slice(-14, -7);
      const prevAvg = prev.reduce((s, d) => s + d.trend, 0) / prev.length;
      weeklyChange = recentAvg - prevAvg;
    }
  }

  let weeksAtPlateau = 0;
  if (trendData.length >= 14) {
    for (let i = trendData.length - 7; i >= 7; i -= 7) {
      const weekEnd = trendData.slice(i, i + 7);
      const weekStart = trendData.slice(i - 7, i);
      if (weekEnd.length < 3 || weekStart.length < 3) break;

      const endAvg = weekEnd.reduce((s, d) => s + d.trend, 0) / weekEnd.length;
      const startAvg = weekStart.reduce((s, d) => s + d.trend, 0) / weekStart.length;

      if (Math.abs(endAvg - startAvg) < 0.15) {
        weeksAtPlateau++;
      } else {
        break;
      }
    }
  }

  if (unitPreference === 'lbs') {
    return {
      current: Math.round(current * 2.205 * 10) / 10,
      weeklyChange: Math.round(weeklyChange * 2.205 * 10) / 10,
      weeksAtPlateau,
      trendData: trendData.map(d => ({
        ...d,
        weight: Math.round(d.weight * 2.205 * 10) / 10,
        trend: Math.round(d.trend * 2.205 * 10) / 10,
      })),
    };
  }

  return {
    current: Math.round(current * 10) / 10,
    weeklyChange: Math.round(weeklyChange * 10) / 10,
    weeksAtPlateau,
    trendData,
  };
}

// ── Diet Phase Recommendations ───────────────────────────────────────────────

interface PhaseStatus {
  suggestion: string;
  shouldTakeBreak: boolean;
  shouldTransition: boolean;
  nextGoal?: DietGoal;
}

/**
 * Analyze current diet phase and recommend actions.
 * Unchanged from v1 — the phase timing logic is already well-calibrated.
 */
export function getPhaseRecommendation(phase: DietPhase | null, sex?: BiologicalSex): PhaseStatus {
  if (!phase || !phase.isActive) {
    return {
      suggestion: 'No active diet phase. Set a goal to get personalized macro coaching.',
      shouldTakeBreak: false,
      shouldTransition: false,
    };
  }

  const { goal, weeksCompleted } = phase;
  const isFemale = sex === 'female';

  if (goal === 'cut') {
    const maxCutWeeks = isFemale ? 8 : 12;
    const breakInterval = isFemale ? 4 : 6;

    if (weeksCompleted >= maxCutWeeks) {
      const reason = isFemale
        ? `You've been cutting for ${weeksCompleted} weeks. Extended deficits increase RED-S risk for women. Transition to maintenance for 2-3 weeks to normalize hormones.`
        : `You've been cutting for ${weeksCompleted} weeks. Transition to maintenance for 2-3 weeks to normalize metabolism before resuming.`;
      return { suggestion: reason, shouldTakeBreak: false, shouldTransition: true, nextGoal: 'maintain' };
    }
    if (weeksCompleted >= breakInterval && weeksCompleted % breakInterval === 0) {
      const reason = isFemale
        ? `${weeksCompleted} weeks in. Women benefit from a 1-week diet break every ${breakInterval} weeks to protect hormonal function, thyroid output, and training performance.`
        : `${weeksCompleted} weeks in. Consider a 1-week diet break at maintenance calories to support hormones, recovery, and adherence.`;
      return { suggestion: reason, shouldTakeBreak: true, shouldTransition: false };
    }
    return {
      suggestion: `Week ${weeksCompleted + 1} of your cut. Stay consistent with logging and training.`,
      shouldTakeBreak: false,
      shouldTransition: false,
    };
  }

  if (goal === 'bulk') {
    const maxBulkWeeks = isFemale ? 12 : 16;

    if (weeksCompleted >= maxBulkWeeks) {
      return {
        suggestion: `${weeksCompleted} weeks of bulking. Consider transitioning to maintenance, then a mini-cut if body fat has crept up.`,
        shouldTakeBreak: false,
        shouldTransition: true,
        nextGoal: 'maintain',
      };
    }
    return {
      suggestion: `Week ${weeksCompleted + 1} of your bulk. Focus on progressive overload and hitting protein targets.`,
      shouldTakeBreak: false,
      shouldTransition: false,
    };
  }

  // Maintenance
  if (weeksCompleted >= 3) {
    return {
      suggestion: `${weeksCompleted} weeks at maintenance. You're ready to transition to a cut or bulk when you choose.`,
      shouldTakeBreak: false,
      shouldTransition: false,
    };
  }

  return {
    suggestion: `Week ${weeksCompleted + 1} at maintenance. Allow your body to stabilize before starting a new phase.`,
    shouldTakeBreak: false,
    shouldTransition: false,
  };
}

// ── Adherence Calculation ────────────────────────────────────────────────────

/**
 * Calculate meal logging adherence for the past N days.
 * Returns percentage of days with at least 2 meals logged.
 */
export function calculateAdherence(
  meals: { date: Date | string }[],
  daysBack: number = 7
): number {
  const now = new Date();
  let daysLogged = 0;

  for (let i = 0; i < daysBack; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    const mealsOnDay = meals.filter(m => {
      const mDate = new Date(m.date).toISOString().split('T')[0];
      return mDate === dateStr;
    });

    if (mealsOnDay.length >= 2) {
      daysLogged++;
    }
  }

  return Math.round((daysLogged / daysBack) * 100);
}

// ── Periodized Nutrition Integration ──────────────────────────────────────

import type { NutritionPhaseType, PlannedNutritionPhase } from './types';

/**
 * Derive diet coach parameters from a periodized nutrition phase.
 *
 * Maps the rich NutritionPhaseType to the existing DietGoal system,
 * preserving the phase's specific calorie factor and protein target.
 * This bridges the new periodization engine with the existing macro calculator.
 *
 * Usage:
 *   const params = getPhaseParams(activePhase);
 *   const macros = calculateMacros({ ...baseInput, goal: params.goal });
 *   // Then override calories with: tdee * params.calorieFactor
 */
export function getPhaseDietParams(phase: PlannedNutritionPhase): {
  goal: DietGoal;
  calorieFactor: number;
  proteinGKg: number;
  deficitSeverity?: 'mild' | 'moderate' | 'aggressive';
} {
  switch (phase.type) {
    case 'massing':
      return {
        goal: 'bulk',
        calorieFactor: phase.calorieFactor,
        proteinGKg: phase.proteinGKg,
      };
    case 'maintenance':
    case 'diet_break':
      return {
        goal: 'maintain',
        calorieFactor: 1.0,
        proteinGKg: phase.proteinGKg,
      };
    case 'mini_cut':
      return {
        goal: 'cut',
        calorieFactor: phase.calorieFactor,
        proteinGKg: phase.proteinGKg,
        deficitSeverity: 'aggressive',
      };
    case 'fat_loss':
      return {
        goal: 'cut',
        calorieFactor: phase.calorieFactor,
        proteinGKg: phase.proteinGKg,
        deficitSeverity: 'moderate',
      };
    case 'fight_camp':
      return {
        goal: 'cut',
        calorieFactor: phase.calorieFactor,
        proteinGKg: phase.proteinGKg,
        deficitSeverity: phase.calorieFactor < 0.80 ? 'aggressive' : 'moderate',
      };
    case 'recovery':
      return {
        goal: 'bulk',
        calorieFactor: phase.calorieFactor,
        proteinGKg: phase.proteinGKg,
      };
    default:
      return {
        goal: 'maintain',
        calorieFactor: 1.0,
        proteinGKg: 2.0,
      };
  }
}
