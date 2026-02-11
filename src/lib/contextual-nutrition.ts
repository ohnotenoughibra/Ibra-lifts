import type { MacroTargets, WorkoutSession, TrainingSession, WearableData, UserProfile, CombatTrainingDay, IllnessLog } from './types';
import { getIllnessTrainingRecommendation } from './illness-engine';

export type TrainingDayType =
  | 'strength' | 'hypertrophy' | 'power'
  | 'grappling_hard' | 'grappling_light'
  | 'two_a_day'     // AM + PM sessions (combat athletes)
  | 'sparring'      // striking/MMA sparring (highest intensity)
  | 'fight_week'    // during weight cut week
  | 'tournament_day' // multiple matches in a day
  | 'travel'        // travel day (disrupted eating)
  | 'rest';

export interface ContextualMacros {
  baseTargets: MacroTargets;
  adjustedTargets: MacroTargets;
  dayType: TrainingDayType;
  recommendations: string[];
  preworkoutTiming?: string;
  postworkoutTiming?: string;
  hydrationGoal: number; // ml
  carbCycleNote?: string;
  illnessActive?: boolean;
}

/**
 * Get contextual nutrition recommendations based on today's training.
 */
export function getContextualNutrition(
  baseMacros: MacroTargets,
  bodyWeightLbs: number,
  todaySession: WorkoutSession | null,
  todayTraining: TrainingSession[],
  whoopData: WearableData | null,
  user: UserProfile | null,
  activeIllness?: IllnessLog | null,
  /** Optional combat context for fight week / tournament / travel detection */
  combatContext?: {
    daysToCompetition?: number;
    isTournamentDay?: boolean;
    isTravelDay?: boolean;
  },
): ContextualMacros {
  const recommendations: string[] = [];
  let dayType: TrainingDayType = 'rest';
  let calorieMultiplier = 1.0;
  let proteinMultiplier = 1.0;
  let carbMultiplier = 1.0;
  let fatMultiplier = 1.0;
  let preworkoutTiming: string | undefined;
  let postworkoutTiming: string | undefined;
  let carbCycleNote: string | undefined;
  let illnessActive = false;

  // Determine training day type from actual logged sessions first,
  // then fall back to the user's scheduled training days so that
  // nutrition advice matches the dashboard's smart schedule.
  const hasTraining = todayTraining.length > 0;
  const trainingMinutes = todayTraining.reduce((sum, s) => sum + s.duration, 0);
  // Check actual or planned intensity for hard sessions
  const hasHardTraining = todayTraining.some(s => {
    const intensity = s.actualIntensity || s.plannedIntensity;
    return intensity === 'hard_sparring' || intensity === 'competition_prep';
  });

  // Detect two-a-day: multiple combat/training sessions logged today
  const hasTwoADay = todayTraining.length >= 2 && trainingMinutes >= 90;

  // Detect sparring specifically (striking/MMA hard sessions)
  const hasSparring = todayTraining.some(s => {
    const intensity = s.actualIntensity || s.plannedIntensity;
    const isStriking = ['boxing', 'kickboxing', 'muay_thai', 'mma', 'karate', 'taekwondo'].includes(s.type);
    return isStriking && (intensity === 'hard_sparring' || intensity === 'competition_prep');
  });

  // Combat-specific day types (highest priority — override training detection)
  if (combatContext?.isTournamentDay) {
    dayType = 'tournament_day';
  } else if (combatContext?.isTravelDay) {
    dayType = 'travel';
  } else if (combatContext?.daysToCompetition != null && combatContext.daysToCompetition <= 7) {
    dayType = 'fight_week';
  } else if (hasTwoADay) {
    dayType = 'two_a_day';
  } else if (hasSparring) {
    dayType = 'sparring';
  } else if (hasHardTraining || trainingMinutes >= 60) {
    dayType = 'grappling_hard';
  } else if (hasTraining) {
    dayType = 'grappling_light';
  } else if (todaySession) {
    dayType = todaySession.type;
  } else {
    // Nothing logged yet — check the user's schedule so nutrition
    // matches the dashboard's daily recommendation.
    const today = new Date().getDay(); // 0=Sun … 6=Sat
    const isScheduledLift = user?.trainingDays?.includes(today);
    const scheduledCombat: CombatTrainingDay[] =
      (user?.combatTrainingDays || []).filter((d) => d.day === today);

    if (scheduledCombat.length > 0) {
      const hardest = scheduledCombat.reduce((a, b) => {
        const rank = { light: 0, moderate: 1, hard: 2 };
        return rank[b.intensity] > rank[a.intensity] ? b : a;
      });
      dayType = hardest.intensity === 'hard' ? 'grappling_hard' : 'grappling_light';
    } else if (isScheduledLift) {
      // Default to hypertrophy-style fueling for a scheduled lift day
      dayType = user?.goalFocus === 'strength' ? 'strength'
        : user?.goalFocus === 'power' ? 'power'
        : 'hypertrophy';
    }
    // else remains 'rest'
  }

  // Recovery-based adjustments from Whoop
  let recoveryBonus = 0;
  if (whoopData) {
    const recovery = whoopData.recoveryScore ?? 50;
    const sleep = whoopData.sleepHours ?? 7;

    if (recovery < 33) {
      // Low recovery - reduce training intensity, focus on recovery nutrition
      recommendations.push('Low recovery detected - prioritize anti-inflammatory foods and extra protein');
      proteinMultiplier += 0.1;
      recoveryBonus = -200; // Reduce calories slightly for rest
    } else if (recovery >= 67) {
      // High recovery - can push harder, fuel appropriately
      recommendations.push('High recovery - good day to push intensity, fuel with extra carbs');
      carbMultiplier += 0.1;
      recoveryBonus = 100;
    }

    // Sleep quality affects recovery
    if (sleep < 6) {
      recommendations.push('Poor sleep - consider extra protein and avoid processed carbs');
      proteinMultiplier += 0.05;
    }
  }

  // Day-specific adjustments
  switch (dayType) {
    case 'strength':
      calorieMultiplier = 1.1;
      proteinMultiplier = 1.15;
      carbMultiplier = 1.1;
      preworkoutTiming = 'Eat 2-3 hours before for stable energy';
      postworkoutTiming = 'Protein + carbs within 2-3 hours (flexible window)';
      carbCycleNote = 'Moderate carb day - focus on complex carbs around training';
      recommendations.push('Pre-workout: 30-50g carbs + 20g protein');
      recommendations.push('Post-workout: 40g protein + 50g carbs (within 2-3 hours)');
      break;

    case 'hypertrophy':
      calorieMultiplier = 1.15;
      proteinMultiplier = 1.2;
      carbMultiplier = 1.2;
      preworkoutTiming = 'Eat 1.5-2 hours before for pump';
      postworkoutTiming = 'High protein + carbs within 2-3 hours';
      carbCycleNote = 'High carb day - maximize muscle glycogen';
      recommendations.push('Target 4-5 meals with 30-40g protein each');
      recommendations.push('Post-workout: 40-50g protein + 60-80g carbs (timing is flexible)');
      break;

    case 'power':
      calorieMultiplier = 1.05;
      proteinMultiplier = 1.1;
      carbMultiplier = 1.05;
      preworkoutTiming = 'Light meal 2-3 hours before';
      postworkoutTiming = 'Protein within 2-3 hours';
      carbCycleNote = 'Moderate carb day';
      recommendations.push('Keep pre-workout light for explosiveness');
      break;

    case 'grappling_hard':
      calorieMultiplier = 1.2;
      proteinMultiplier = 1.15;
      carbMultiplier = 1.25;
      preworkoutTiming = 'Eat 2-3 hours before, nothing heavy';
      postworkoutTiming = 'Protein shake immediately, meal within 2 hours';
      carbCycleNote = 'High carb day - replenish glycogen from intense rolling';
      recommendations.push('Hydration is critical - aim for 3+ litres water');
      recommendations.push('Include electrolytes during/after training');
      recommendations.push('Post-training: fast digesting carbs + protein');
      break;

    case 'two_a_day':
      // Two-a-day: AM + PM sessions (common in fight camps)
      // Glycogen resynthesis rate is ~5-7%/hr — need minimum 4hrs between sessions
      calorieMultiplier = 1.4;
      proteinMultiplier = 1.2;
      carbMultiplier = 1.5;
      preworkoutTiming = 'Eat 2-3 hours before first session';
      postworkoutTiming = 'CRITICAL: 1-1.5g/kg carbs + 30g protein within 1hr of first session ending';
      carbCycleNote = 'Very high carb day — glycogen demands are extreme with two sessions';
      recommendations.push('Between sessions: easily digestible carbs + protein (rice + chicken, or shake)');
      recommendations.push('Pre-second session: light carbs 60-90 min before (banana, rice cake)');
      recommendations.push('Track hydration for BOTH sessions — cumulative fluid loss is significant');
      recommendations.push('Electrolytes are critical — sweat losses compound across sessions');
      recommendations.push('If second session is <4hrs after first: prioritize liquid nutrition');
      break;

    case 'sparring':
      // Striking/MMA sparring — highest intensity, highest injury risk
      calorieMultiplier = 1.25;
      proteinMultiplier = 1.2;
      carbMultiplier = 1.3;
      preworkoutTiming = 'Eat 2-3 hours before — nothing heavy in stomach';
      postworkoutTiming = 'Protein + carbs within 1-2 hours. Anti-inflammatory foods.';
      carbCycleNote = 'High carb day — sparring is the most glycogen-demanding activity';
      recommendations.push('Pre-sparring: avoid anything that could cause nausea if hit to the body');
      recommendations.push('Post-sparring: omega-3, tart cherry juice for inflammation');
      recommendations.push('Do NOT take NSAIDs (ibuprofen) — blocks recovery adaptation');
      recommendations.push('If you took head impacts: prioritize omega-3 (2-3g EPA+DHA) and sleep');
      break;

    case 'grappling_light':
      calorieMultiplier = 1.1;
      proteinMultiplier = 1.1;
      carbMultiplier = 1.1;
      preworkoutTiming = 'Light snack 1-2 hours before';
      postworkoutTiming = 'Normal meal within 2 hours';
      carbCycleNote = 'Moderate carb day';
      recommendations.push('Focus on whole foods for sustained energy');
      break;

    case 'fight_week':
      // During fight week — reduced training, weight manipulation active
      calorieMultiplier = 0.7;
      proteinMultiplier = 1.3; // preserve muscle at all costs
      carbMultiplier = 0.4;     // glycogen depletion
      preworkoutTiming = 'Light session only — minimal fuel needed';
      postworkoutTiming = 'Protein shake, minimal carbs unless protocol allows';
      carbCycleNote = 'Fight week: low carbs for glycogen depletion. Follow weight cut protocol.';
      recommendations.push('Follow the weight cut protocol checklist precisely');
      recommendations.push('Prioritize protein to preserve lean mass');
      recommendations.push('Reduce training to light technique only');
      recommendations.push('Monitor: weight, hydration, mood, energy, resting HR');
      break;

    case 'tournament_day':
      // Multiple matches in one day — sustained fueling is critical
      calorieMultiplier = 1.4;
      proteinMultiplier = 1.1;
      carbMultiplier = 1.6;
      preworkoutTiming = '3-4 hours before first match: 500-600cal (rice + chicken + banana)';
      postworkoutTiming = 'Between matches: 100-200cal every 30-60min (dates, rice cakes, sports drink)';
      carbCycleNote = 'Tournament day: sustained energy with frequent small feeds between matches';
      recommendations.push('Pre-first match: rice + chicken + banana (3-4 hrs before)');
      recommendations.push('Between matches: dates, rice cakes, sports drink — every 30-60 min');
      recommendations.push('Sip 200-400ml water + electrolytes between matches');
      recommendations.push('Post-final match: large recovery meal within 60 minutes');
      recommendations.push('Pack ALL food the night before — do not rely on venue food');
      break;

    case 'travel':
      // Travel day — disrupted eating, stress hormones elevated
      calorieMultiplier = 0.95;
      proteinMultiplier = 1.0;
      carbMultiplier = 0.9;
      carbCycleNote = 'Travel day: focus on protein and hydration, carbs are secondary';
      recommendations.push('Pack protein bars, jerky, rice cakes, electrolyte packets');
      recommendations.push('If flying: 500ml water per 2 hours (cabin air is 10-20% humidity)');
      recommendations.push('Avoid salty airline food (causes bloating)');
      recommendations.push('Match new local meal timing immediately on arrival');
      recommendations.push('Use caffeine strategically to shift circadian rhythm if crossing time zones');
      break;

    case 'rest':
    default:
      // REST DAY NUTRITION - Science-based approach:
      // Muscle protein synthesis (MPS) remains elevated for 24-48 hours post-training.
      // Aggressive calorie cuts on rest days can impair recovery and adaptation.
      // Adjust based on user's goal:
      if (user?.goalFocus === 'hypertrophy' || user?.goalFocus === 'balanced') {
        // Muscle building: maintain calories, slight carb reduction only
        calorieMultiplier = 0.97; // Only 3% reduction (vs old 10%)
        carbMultiplier = 0.9;     // 10% carb reduction (vs old 20%)
        carbCycleNote = 'Lower carb day - prioritize protein and fats';
        recommendations.push('MPS is still elevated from training - keep calories near maintenance');
        recommendations.push('Focus on protein distribution: 4-5 meals with 25-40g each');
      } else if (user?.goalFocus === 'strength') {
        // Strength: rest days are critical for adaptation, maintain full calories
        calorieMultiplier = 1.0;  // Maintain calories
        carbMultiplier = 0.85;    // Slight carb reduction
        carbCycleNote = 'Rest day - recovery is when strength gains happen';
        recommendations.push('Rest days are when strength adaptations occur');
        recommendations.push('Keep calories at maintenance for optimal recovery');
      } else {
        // Power/other: moderate reduction (less aggressive for combat athletes)
        calorieMultiplier = 0.95; // 5% reduction (combat athletes need recovery fuel)
        carbMultiplier = 0.85;
        carbCycleNote = 'Lower carb day - maintain protein';
        recommendations.push('Moderate calorie reduction while preserving protein');
      }
      proteinMultiplier = 1.0; // Always maintain protein on rest days
      recommendations.push('Keep protein high for ongoing recovery');
      recommendations.push('Good day for meal prep and mobility work');
      break;
  }

  // Combat sports specific recommendations
  if (dayType === 'grappling_hard' || dayType === 'grappling_light') {
    recommendations.push('Avoid heavy foods that could cause cramps');
    recommendations.push('Include anti-inflammatory foods: turmeric, ginger, berries');
  }

  // Weight class considerations
  if (user?.combatSport) {
    recommendations.push('Monitor body weight if competing');
  }

  // ── Illness override ──────────────────────────────────────────────────────
  // When sick: move calories toward maintenance, keep protein high, prioritize
  // recovery nutrition. A caloric deficit + illness = immunosuppression
  // (Nieman 1994, J-curve). The body needs fuel to fight infection.
  if (activeIllness && (activeIllness.status === 'active' || activeIllness.status === 'recovering')) {
    illnessActive = true;
    const rec = getIllnessTrainingRecommendation(activeIllness);

    // Override day-specific multipliers — illness trumps training type
    // Move calories to at least maintenance (never cut while sick)
    calorieMultiplier = Math.max(calorieMultiplier, 1.0);
    // Boost protein for immune function + muscle preservation (Calder 2013)
    proteinMultiplier = Math.max(proteinMultiplier, 1.15);
    // Keep carbs moderate — glucose fuels immune cells (Gleeson 2016)
    carbMultiplier = Math.max(carbMultiplier, 1.0);

    // Clear training-specific timing since they shouldn't be training hard
    if (!rec.canTrain) {
      preworkoutTiming = undefined;
      postworkoutTiming = undefined;
      carbCycleNote = 'Illness recovery — maintain calories, prioritize protein and micronutrients';
    } else {
      carbCycleNote = 'Light activity only — eat at maintenance to support immune function';
    }

    // Illness-specific nutrition recommendations
    recommendations.length = 0; // Clear training-specific tips
    recommendations.push('Eat at maintenance or above — your immune system needs fuel to recover');
    recommendations.push('Prioritize protein (immune cell production + muscle preservation)');
    recommendations.push('Include vitamin C rich foods: citrus, bell peppers, berries');
    recommendations.push('Anti-inflammatory foods: bone broth, ginger, turmeric, garlic');
    if (activeIllness.symptoms.includes('nausea') || activeIllness.symptoms.includes('vomiting') || activeIllness.symptoms.includes('diarrhea')) {
      recommendations.push('GI symptoms: stick to bland foods (BRAT: bananas, rice, applesauce, toast)');
      recommendations.push('Sip electrolyte drinks to prevent dehydration');
    }
    if (activeIllness.symptoms.includes('loss_of_appetite')) {
      recommendations.push('Low appetite? Try calorie-dense liquids: smoothies, protein shakes, bone broth');
    }
    if (activeIllness.hasFever) {
      recommendations.push('Fever increases metabolic rate ~10% per 1°C — eat more, not less');
    }
    recommendations.push('Sleep and hydration are your top priorities right now');
  }

  // Calculate adjusted macros
  const adjustedTargets: MacroTargets = {
    calories: Math.round((baseMacros.calories * calorieMultiplier) + recoveryBonus),
    protein: Math.round(baseMacros.protein * proteinMultiplier),
    carbs: Math.round(baseMacros.carbs * carbMultiplier),
    fat: Math.round(baseMacros.fat * fatMultiplier),
  };

  // Hydration goal based on body weight and training (in ml)
  // ~35ml per kg is a good baseline (equivalent to 0.5oz per lb)
  const bodyWeightKg = bodyWeightLbs / 2.205;
  let hydrationGoal = Math.round(bodyWeightKg * 35); // 35ml per kg baseline
  if (illnessActive) {
    // Illness increases fluid needs — fever, sweating, GI losses
    hydrationGoal += 1000;
  } else if (dayType === 'grappling_hard') {
    hydrationGoal += 1000; // Extra 1L for hard training
  } else if (dayType !== 'rest') {
    hydrationGoal += 500; // Extra 500ml for any training
  }

  return {
    baseTargets: baseMacros,
    adjustedTargets,
    dayType,
    recommendations,
    preworkoutTiming,
    postworkoutTiming,
    hydrationGoal,
    carbCycleNote,
    illnessActive,
  };
}

/**
 * Get meal timing recommendations based on training schedule.
 */
export function getMealTiming(
  trainingTime: Date | null,
  dayType: TrainingDayType
): { preMeal: string; postMeal: string; snacks: string[] } {
  if (!trainingTime) {
    return {
      preMeal: 'No training scheduled',
      postMeal: 'No training scheduled',
      snacks: ['Spread meals evenly throughout the day'],
    };
  }

  const trainingHour = trainingTime.getHours();

  if (trainingHour < 10) {
    // Morning training
    return {
      preMeal: 'Light breakfast 1-1.5 hours before: oatmeal, banana, coffee',
      postMeal: 'Full breakfast after: eggs, toast, fruit',
      snacks: ['Mid-morning snack if needed', 'Larger lunch and dinner'],
    };
  } else if (trainingHour < 14) {
    // Midday training
    return {
      preMeal: 'Light lunch 2 hours before: rice, chicken, vegetables',
      postMeal: 'Post-workout shake, then larger dinner',
      snacks: ['Breakfast: eggs, oats', 'Evening: protein-rich dinner'],
    };
  } else if (trainingHour < 18) {
    // Afternoon training
    return {
      preMeal: 'Lunch 2-3 hours before: complex carbs + protein',
      postMeal: 'Dinner within 1-2 hours: protein + carbs + vegetables',
      snacks: ['Small snack 1 hour before if needed', 'Casein before bed'],
    };
  } else {
    // Evening training
    return {
      preMeal: 'Afternoon snack 2 hours before: easily digestible',
      postMeal: 'Post-workout shake, light dinner to avoid sleep issues',
      snacks: ['Larger breakfast and lunch', 'Keep dinner moderate'],
    };
  }
}

/**
 * Get supplement recommendations based on training type.
 */
export function getSupplementRecommendations(dayType: TrainingDayType): string[] {
  const baseSupplements = [
    'Creatine 5g daily',
    'Vitamin D3 (especially in winter)',
    'Omega-3 fish oil',
  ];

  const daySpecific: Record<TrainingDayType, string[]> = {
    strength: ['Caffeine pre-workout for performance', 'Beta-alanine for endurance sets'],
    hypertrophy: ['Citrulline for pump', 'EAAs during workout if fasted'],
    power: ['Caffeine if needed', 'Light on stimulants to maintain feel'],
    grappling_hard: ['Electrolytes during training', 'Tart cherry for recovery', 'Magnesium before bed'],
    grappling_light: ['Electrolytes if sweating', 'Optional: adaptogens for stress'],
    two_a_day: ['Electrolytes for BOTH sessions', 'Collagen + vitamin C before first session', 'Tart cherry post second session', 'Magnesium before bed'],
    sparring: ['Collagen + vitamin C 30-60min before', 'Electrolytes during', 'Omega-3 post (neuroprotective)', 'Tart cherry for inflammation'],
    fight_week: ['Electrolytes (but follow sodium protocol)', 'Melatonin if sleep is disrupted', 'Magnesium before bed'],
    tournament_day: ['Caffeine before first match (3-6mg/kg)', 'Electrolytes between matches', 'Tart cherry post-tournament'],
    travel: ['Melatonin if crossing time zones', 'Vitamin C for immune support', 'Electrolyte packets for hydration'],
    rest: ['Focus on food over supplements', 'Magnesium and zinc for recovery'],
  };

  return [...baseSupplements, ...daySpecific[dayType]];
}

/**
 * Get pre-competition nutrition guidance.
 */
export function getCompetitionNutrition(daysOut: number, needsWeightCut: boolean): {
  focus: string;
  recommendations: string[];
  hydration: string;
} {
  if (daysOut > 7) {
    return {
      focus: needsWeightCut ? 'Gradual calorie reduction' : 'Maintain current nutrition',
      recommendations: [
        'Dial in your routine',
        'Practice your competition day meals',
        needsWeightCut ? 'Reduce carbs slightly' : 'Keep calories stable',
      ],
      hydration: needsWeightCut ? 'Start increasing water intake' : 'Normal hydration',
    };
  } else if (daysOut > 2) {
    return {
      focus: needsWeightCut ? 'Final weight adjustment' : 'Carb loading',
      recommendations: [
        needsWeightCut ? 'Low sodium, controlled carbs' : 'Increase carbs 20-30%',
        'Easy to digest foods only',
        'Avoid new foods or restaurants',
      ],
      hydration: needsWeightCut ? 'Water load then taper' : 'Extra hydration',
    };
  } else {
    return {
      focus: 'Competition prep',
      recommendations: [
        'Familiar foods only',
        'Light meals, frequent small portions',
        'Last solid meal 3-4 hours before',
      ],
      hydration: 'Sip water, dont chug. Electrolytes important.',
    };
  }
}
