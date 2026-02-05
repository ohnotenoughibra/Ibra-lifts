import type { MacroTargets, WorkoutSession, GrapplingSession, WearableData, UserProfile } from './types';

export type TrainingDayType = 'strength' | 'hypertrophy' | 'power' | 'grappling_hard' | 'grappling_light' | 'cardio' | 'rest' | 'deload';

export interface ContextualMacros {
  baseTargets: MacroTargets;
  adjustedTargets: MacroTargets;
  dayType: TrainingDayType;
  recommendations: string[];
  preworkoutTiming?: string;
  postworkoutTiming?: string;
  hydrationGoal: number; // oz
  carbCycleNote?: string;
}

/**
 * Get contextual nutrition recommendations based on today's training.
 */
export function getContextualNutrition(
  baseMacros: MacroTargets,
  bodyWeightLbs: number,
  todaySession: WorkoutSession | null,
  todayGrappling: GrapplingSession[],
  whoopData: WearableData | null,
  user: UserProfile | null
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

  // Determine training day type
  const hasGrappling = todayGrappling.length > 0;
  const grapplingMinutes = todayGrappling.reduce((sum, g) => sum + g.duration, 0);
  const hasHardGrappling = todayGrappling.some(g =>
    g.intensity === 'hard_sparring' || g.intensity === 'competition_prep'
  );

  if (hasHardGrappling || grapplingMinutes >= 60) {
    dayType = 'grappling_hard';
  } else if (hasGrappling) {
    dayType = 'grappling_light';
  } else if (todaySession) {
    dayType = todaySession.type;
  }

  // Recovery-based adjustments from Whoop
  let recoveryBonus = 0;
  if (whoopData) {
    if (whoopData.recoveryScore < 33) {
      // Low recovery - reduce training intensity, focus on recovery nutrition
      recommendations.push('Low recovery detected - prioritize anti-inflammatory foods and extra protein');
      proteinMultiplier += 0.1;
      recoveryBonus = -200; // Reduce calories slightly for rest
    } else if (whoopData.recoveryScore >= 67) {
      // High recovery - can push harder, fuel appropriately
      recommendations.push('High recovery - good day to push intensity, fuel with extra carbs');
      carbMultiplier += 0.1;
      recoveryBonus = 100;
    }

    // Sleep quality affects recovery
    if (whoopData.sleepHours < 6) {
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
      postworkoutTiming = 'Protein + carbs within 1 hour';
      carbCycleNote = 'Moderate carb day - focus on complex carbs around training';
      recommendations.push('Pre-workout: 30-50g carbs + 20g protein');
      recommendations.push('Post-workout: 40g protein + 50g fast carbs');
      break;

    case 'hypertrophy':
      calorieMultiplier = 1.15;
      proteinMultiplier = 1.2;
      carbMultiplier = 1.2;
      preworkoutTiming = 'Eat 1.5-2 hours before for pump';
      postworkoutTiming = 'High protein + carbs within 30 min';
      carbCycleNote = 'High carb day - maximize muscle glycogen';
      recommendations.push('Target 4-5 meals with 30-40g protein each');
      recommendations.push('Post-workout: 40-50g protein + 60-80g carbs');
      break;

    case 'power':
      calorieMultiplier = 1.05;
      proteinMultiplier = 1.1;
      carbMultiplier = 1.05;
      preworkoutTiming = 'Light meal 2-3 hours before';
      postworkoutTiming = 'Protein within 1 hour';
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
      recommendations.push('Hydration is critical - aim for 100+ oz water');
      recommendations.push('Include electrolytes during/after training');
      recommendations.push('Post-training: fast digesting carbs + protein');
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

    case 'cardio':
      calorieMultiplier = 1.05;
      proteinMultiplier = 1.0;
      carbMultiplier = 1.1;
      fatMultiplier = 0.95;
      preworkoutTiming = 'Can train fasted or with light carbs';
      postworkoutTiming = 'Replenish carbs and fluids';
      carbCycleNote = 'Moderate-high carb day';
      break;

    case 'deload':
      calorieMultiplier = 0.95;
      proteinMultiplier = 1.0;
      carbMultiplier = 0.9;
      carbCycleNote = 'Low carb day - let body recover';
      recommendations.push('Focus on anti-inflammatory foods');
      recommendations.push('Extra vegetables and omega-3s');
      break;

    case 'rest':
    default:
      calorieMultiplier = 0.9;
      proteinMultiplier = 1.0;
      carbMultiplier = 0.8;
      carbCycleNote = 'Low carb day - minimize carbs, maintain protein';
      recommendations.push('Keep protein high for recovery');
      recommendations.push('Good day for meal prep');
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

  // Calculate adjusted macros
  const adjustedTargets: MacroTargets = {
    calories: Math.round((baseMacros.calories * calorieMultiplier) + recoveryBonus),
    protein: Math.round(baseMacros.protein * proteinMultiplier),
    carbs: Math.round(baseMacros.carbs * carbMultiplier),
    fat: Math.round(baseMacros.fat * fatMultiplier),
  };

  // Hydration goal based on body weight and training
  let hydrationGoal = Math.round(bodyWeightLbs * 0.5); // 0.5 oz per lb baseline
  if (dayType === 'grappling_hard') {
    hydrationGoal += 32; // Extra 32 oz for hard training
  } else if (dayType !== 'rest') {
    hydrationGoal += 16; // Extra 16 oz for any training
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
    cardio: ['Electrolytes', 'Optional: caffeine'],
    rest: ['Focus on food over supplements', 'Magnesium and zinc for recovery'],
    deload: ['Collagen for joint health', 'Focus on anti-inflammatory support'],
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
