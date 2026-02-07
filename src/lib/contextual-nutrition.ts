import type { MacroTargets, WorkoutSession, TrainingSession, WearableData, UserProfile, CombatTrainingDay } from './types';

export type TrainingDayType = 'strength' | 'hypertrophy' | 'power' | 'grappling_hard' | 'grappling_light' | 'rest';

export interface ContextualMacros {
  baseTargets: MacroTargets;
  adjustedTargets: MacroTargets;
  dayType: TrainingDayType;
  recommendations: string[];
  preworkoutTiming?: string;
  postworkoutTiming?: string;
  hydrationGoal: number; // ml
  carbCycleNote?: string;
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

  if (hasHardTraining || trainingMinutes >= 60) {
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

    case 'grappling_light':
      calorieMultiplier = 1.1;
      proteinMultiplier = 1.1;
      carbMultiplier = 1.1;
      preworkoutTiming = 'Light snack 1-2 hours before';
      postworkoutTiming = 'Normal meal within 2 hours';
      carbCycleNote = 'Moderate carb day';
      recommendations.push('Focus on whole foods for sustained energy');
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
        // Power/cutting or unknown: moderate reduction
        calorieMultiplier = 0.93; // 7% reduction (compromise)
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
  if (dayType === 'grappling_hard') {
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
