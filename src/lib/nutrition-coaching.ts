/**
 * Nutrition Coaching Engine — Sprint 8
 *
 * Pure-function module providing practical, evidence-based nutrition guidance
 * for a fitness PWA. No React, no store imports, no side effects.
 *
 * Capabilities:
 *   1. Protein timing recommendations — when to eat protein relative to workouts
 *   2. Caloric periodization — higher cals on training days, lower on rest days
 *   3. Meal suggestions — simple, practical ideas based on remaining macros
 *   4. Hydration coaching — daily water targets based on bodyweight + activity
 *   5. Weekly nutrition score — adherence grading across protein, cals, hydration
 *   6. Nutrition insights — top-level summary with actionable tips
 *
 * Evidence base:
 *   - Schoenfeld & Aragon 2018: protein timing/distribution meta-analysis
 *   - Areta et al. 2013: 20-40g per meal for optimal MPS
 *   - Helms et al. 2014: protein 1.6-2.2 g/kg for athletes
 *   - Kerksick et al. 2017 (ISSN position stand): nutrient timing
 *   - Popkin et al. 2010: water intake recommendations
 *   - Burke et al. 2011: carb periodization for glycogen
 *   - Impey et al. 2018: "fuel for the work required"
 */

import type {
  UserProfile,
  MealEntry,
  MacroTargets,
  WeightUnit,
  WorkoutLog,
  WearableData,
} from './types';

// ─── Exported Types ─────────────────────────────────────────────────────────

export interface NutritionTiming {
  window: 'pre_workout' | 'post_workout' | 'morning' | 'evening' | 'before_bed';
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}

export interface CaloricPeriodization {
  trainingDayCals: number;
  restDayCals: number;
  weeklyAvgCals: number;
  surplus: number;
  rationale: string;
}

export interface MealSuggestion {
  name: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  timing: string;
  tags: string[];
}

export interface HydrationTarget {
  dailyMl: number;
  dailyOz: number;
  perWorkoutExtra: number;
  currentIntake: number;
  adherencePercent: number;
}

export interface WeeklyNutritionScore {
  overall: number;
  proteinScore: number;
  calorieScore: number;
  hydrationScore: number;
  consistencyScore: number;
  improvements: string[];
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

/** Clamp a value between min and max. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Round to one decimal place. */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Get YYYY-MM-DD string from a Date. */
function toDateStr(d: Date): string {
  return new Date(d).toISOString().split('T')[0];
}

/** Sum a numeric field across an array of MealEntry. */
function sumMealField(meals: MealEntry[], field: 'calories' | 'protein' | 'carbs' | 'fat'): number {
  return meals.reduce((sum, m) => sum + (m[field] || 0), 0);
}

/** Filter meals to those matching a given YYYY-MM-DD date string. */
function mealsOnDate(meals: MealEntry[], dateStr: string): MealEntry[] {
  return meals.filter(m => toDateStr(m.date) === dateStr);
}

/** Bodyweight in kg, falling back to 75 if not set. */
function bwKg(user: UserProfile | null): number {
  return user?.bodyWeightKg || 75;
}

/** Convert ml to US fluid oz (1 oz = 29.5735 ml). */
function mlToOz(ml: number): number {
  return Math.round(ml / 29.5735);
}

/**
 * Infer whether the user is cutting, bulking, or maintaining based on
 * their macro targets relative to estimated maintenance. This is a rough
 * heuristic since we don't import DietPhase here — components that have
 * access to the active phase can adjust behavior upstream.
 */
function inferGoalFromMacros(user: UserProfile | null, macros: MacroTargets): 'cut' | 'bulk' | 'maintain' {
  const weight = bwKg(user);
  // Rough Mifflin-St Jeor estimate assuming moderate activity (x1.55)
  const age = user?.age || 25;
  const sexConst = user?.sex === 'female' ? -161 : 5;
  const height = user?.heightCm || 175;
  const bmr = 10 * weight + 6.25 * height - 5 * age + sexConst;
  const estimatedMaintenance = bmr * 1.55;

  const ratio = macros.calories / estimatedMaintenance;
  if (ratio < 0.88) return 'cut';
  if (ratio > 1.08) return 'bulk';
  return 'maintain';
}

// ─── 1. Protein Timing Recommendations ──────────────────────────────────────

/**
 * Generate protein timing recommendations based on the user's profile,
 * daily macro targets, meals already eaten today, and whether today
 * includes a workout.
 *
 * Evidence: Areta et al. 2013 found 4x20g protein feedings optimised MPS
 * over 12 hours. Schoenfeld & Aragon 2018 meta-analysis supports spreading
 * protein across 4+ meals at 0.4 g/kg/meal. Pre-sleep casein (Res et al.
 * 2012) improves overnight MPS.
 */
export function getProteinTimingPlan(
  user: UserProfile | null,
  macroTargets: MacroTargets,
  todayMeals: MealEntry[],
  hasWorkoutToday: boolean
): NutritionTiming[] {
  const totalTarget = macroTargets.protein || 150;
  const consumed = sumMealField(todayMeals, 'protein');
  const remaining = Math.max(0, totalTarget - consumed);
  const bodyWeight = bwKg(user);
  const perMealOptimal = clamp(Math.round(bodyWeight * 0.4), 20, 50);

  const timings: NutritionTiming[] = [];

  // ── Morning ──
  const hasBreakfast = todayMeals.some(m => m.mealType === 'breakfast');
  if (!hasBreakfast) {
    timings.push({
      window: 'morning',
      recommendation:
        `Aim for ${perMealOptimal}g protein at breakfast. ` +
        'Ideas: eggs + Greek yogurt, protein oatmeal, or a whey shake with fruit.',
      priority: remaining > totalTarget * 0.6 ? 'high' : 'medium',
    });
  } else {
    const breakfastProtein = todayMeals
      .filter(m => m.mealType === 'breakfast')
      .reduce((s, m) => s + (m.protein || 0), 0);
    if (breakfastProtein < perMealOptimal * 0.6) {
      timings.push({
        window: 'morning',
        recommendation:
          `Breakfast was light on protein (${Math.round(breakfastProtein)}g). ` +
          `Try to hit ${perMealOptimal}g next time — add eggs, yogurt, or a shake.`,
        priority: 'low',
      });
    }
  }

  // ── Pre-Workout ──
  if (hasWorkoutToday) {
    const hasPreWo = todayMeals.some(m => m.mealType === 'pre_workout');
    if (!hasPreWo) {
      timings.push({
        window: 'pre_workout',
        recommendation:
          `Eat 25-30g protein with moderate carbs 1-2 hours before training. ` +
          'Good options: chicken + rice, protein shake + banana, or turkey sandwich.',
        priority: 'high',
      });
    } else {
      timings.push({
        window: 'pre_workout',
        recommendation:
          'Pre-workout meal logged — good. Ensure it included 25-30g protein and some carbs for fuel.',
        priority: 'low',
      });
    }

    // ── Post-Workout ──
    const hasPostWo = todayMeals.some(m => m.mealType === 'post_workout');
    if (!hasPostWo) {
      timings.push({
        window: 'post_workout',
        recommendation:
          `Get 30-40g protein within 2 hours after training. ` +
          'Whey + banana is the fastest option. A full meal (chicken, rice, veggies) works too.',
        priority: 'high',
      });
    } else {
      timings.push({
        window: 'post_workout',
        recommendation:
          'Post-workout nutrition handled. Protein + carbs after training supports recovery and glycogen replenishment.',
        priority: 'low',
      });
    }
  }

  // ── Evening ──
  if (remaining > perMealOptimal) {
    timings.push({
      window: 'evening',
      recommendation:
        `You still need ~${Math.round(remaining)}g protein today. ` +
        'Have a solid dinner with lean protein (chicken thighs, salmon, steak) and a side.',
      priority: remaining > totalTarget * 0.4 ? 'high' : 'medium',
    });
  } else if (remaining > 0) {
    timings.push({
      window: 'evening',
      recommendation:
        `About ${Math.round(remaining)}g protein left for the day. ` +
        'A normal dinner should cover it — add a small snack if needed.',
      priority: 'medium',
    });
  }

  // ── Before Bed ──
  // Pre-sleep casein benefits MPS overnight (Res et al. 2012)
  if (totalTarget >= 140) {
    const hasBedSnack = todayMeals.some(m => m.mealType === 'snack' &&
      new Date(m.date).getHours() >= 20);
    if (!hasBedSnack && remaining > 15) {
      timings.push({
        window: 'before_bed',
        recommendation:
          'Consider a slow-digesting protein before bed: cottage cheese, casein shake, ' +
          'or Greek yogurt. Supports overnight muscle protein synthesis.',
        priority: 'medium',
      });
    } else if (totalTarget >= 180) {
      timings.push({
        window: 'before_bed',
        recommendation:
          'With a high protein target, a casein-rich snack before bed helps ' +
          'distribute intake and supports overnight recovery.',
        priority: 'low',
      });
    }
  }

  return timings;
}

// ─── 2. Caloric Periodization ───────────────────────────────────────────────

/**
 * Calculate training-day vs rest-day calorie targets with goal-aware
 * adjustments. Carb cycling is the primary lever — protein and fat stay
 * relatively constant across days.
 *
 * Evidence:
 *   - Burke et al. 2011: higher carbs on training days fuels glycogen
 *   - Impey et al. 2018: "fuel for the work required" — match intake to output
 *   - Surplus concentrates on training days (anabolic signal); rest days
 *     return closer to maintenance to limit fat gain
 *
 * @param user            The user's profile (used for BMR estimation)
 * @param macroTargets    The user's daily macro targets (weekly average basis)
 * @param weeklySchedule  Array of training-day booleans [Mon..Sun], or just
 *                        a count (e.g. 4 means 4 training days per week)
 */
export function getCaloricPeriodization(
  user: UserProfile | null,
  macroTargets: MacroTargets,
  weeklySchedule: boolean[] | number
): CaloricPeriodization {
  const baseCals = macroTargets.calories;
  const goal = inferGoalFromMacros(user, macroTargets);

  // Determine number of training and rest days per week
  let trainingDays: number;
  let restDays: number;
  if (typeof weeklySchedule === 'number') {
    trainingDays = clamp(weeklySchedule, 1, 7);
    restDays = 7 - trainingDays;
  } else {
    trainingDays = weeklySchedule.filter(Boolean).length || 4;
    restDays = 7 - trainingDays;
  }

  // To keep the weekly average at baseCals, we solve:
  //   trainingDays * trainingCals + restDays * restCals = 7 * baseCals
  // We define a "delta" that shifts cals from rest to training days.
  let deltaPercent: number;
  let rationale: string;

  switch (goal) {
    case 'cut':
      // Cutting: preserve performance on training days, deeper deficit on rest
      deltaPercent = 0.10;
      rationale =
        'Cutting: training days get extra carbs to fuel performance and protect muscle. ' +
        'Rest days run a deeper deficit. Protein stays constant both days.';
      break;
    case 'bulk':
      // Bulking: concentrate surplus around training for anabolic stimulus,
      // near-maintenance on rest days to minimise fat spillover
      deltaPercent = 0.12;
      rationale =
        'Bulking: larger surplus on training days when your body is primed for growth. ' +
        'Rest days stay closer to maintenance to limit unnecessary fat gain.';
      break;
    case 'maintain':
    default:
      // Maintenance: mild cycling for recomposition effect
      deltaPercent = 0.08;
      rationale =
        'Maintenance: slight calorie cycling supports body recomposition — more fuel ' +
        'on training days, mild deficit on rest days, same weekly average.';
      break;
  }

  // Calculate the absolute delta that preserves the weekly total
  // training * (base + delta) + rest * (base - X) = 7 * base
  // Solve for X: X = (trainingDays * delta) / restDays
  const trainingDelta = Math.round(baseCals * deltaPercent);
  const restDelta = restDays > 0
    ? Math.round((trainingDays * trainingDelta) / restDays)
    : 0;

  const trainingDayCals = baseCals + trainingDelta;
  const restDayCals = baseCals - restDelta;

  // Verify weekly average
  const weeklyTotal = trainingDays * trainingDayCals + restDays * restDayCals;
  const weeklyAvgCals = Math.round(weeklyTotal / 7);

  // Surplus relative to the base target
  const surplus = trainingDayCals - baseCals;

  return {
    trainingDayCals,
    restDayCals,
    weeklyAvgCals,
    surplus,
    rationale,
  };
}

// ─── 3. Meal Suggestions ────────────────────────────────────────────────────

/** Remaining macros after what the user has already eaten. */
interface RemainingMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

type TimeOfDay = 'morning' | 'midday' | 'afternoon' | 'evening' | 'post_workout';

/** Internal meal entry with extra metadata for scoring/filtering. */
interface InternalMeal {
  name: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  timing: string;
  tags: string[];
  _times: TimeOfDay[];
}

/**
 * Suggest simple, practical meals based on macro targets, remaining macros
 * for the day, time of day, and optional dietary preferences.
 *
 * Returns up to 5 suggestions, sorted by how well they fit the remaining
 * macro budget. These are grab-and-go ideas, not complex recipes.
 */
export function getMealSuggestions(
  macroTargets: MacroTargets,
  remainingMacros: RemainingMacros,
  timeOfDay: TimeOfDay,
  dietaryPrefs?: { vegetarian?: boolean; dairyFree?: boolean; glutenFree?: boolean }
): MealSuggestion[] {
  // If the user has already met their targets, acknowledge it
  if (remainingMacros.calories < 100 && remainingMacros.protein < 10) {
    return [{
      name: 'Targets reached',
      protein: 0,
      carbs: 0,
      fat: 0,
      calories: 0,
      timing: 'none',
      tags: ['complete'],
    }];
  }

  // Build and filter the meal database
  let db = buildMealDatabase();

  if (dietaryPrefs?.vegetarian) {
    const meatKeywords = ['chicken', 'steak', 'turkey', 'salmon', 'tuna', 'beef', 'jerky', 'deli'];
    db = db.filter(m => {
      const lower = m.name.toLowerCase();
      return !meatKeywords.some(k => lower.includes(k));
    });
  }
  if (dietaryPrefs?.dairyFree) {
    db = db.filter(m =>
      !m.tags.includes('dairy') && !m.name.toLowerCase().includes('cheese') &&
      !m.name.toLowerCase().includes('yogurt')
    );
  }
  if (dietaryPrefs?.glutenFree) {
    db = db.filter(m => {
      const lower = m.name.toLowerCase();
      return !lower.includes('toast') && !lower.includes('pasta') && !lower.includes('wrap') &&
             !lower.includes('sandwich') && !lower.includes('oat') && !lower.includes('bread');
    });
  }

  // Filter by time of day
  const timeSuitable = db.filter(m => m._times.includes(timeOfDay));

  // Score each meal by macro fit
  const scored = timeSuitable.map(meal => {
    // Protein fit: how well does this meal's protein fill the remaining need?
    let proteinFit = 0;
    if (remainingMacros.protein > 10) {
      const ratio = meal.protein / remainingMacros.protein;
      // Ideal: covers 20-40% of remaining protein in one meal
      proteinFit = ratio >= 0.15 && ratio <= 0.6
        ? 1.0
        : ratio < 0.15
          ? ratio / 0.15
          : Math.max(0.3, 1.0 - (ratio - 0.6));
    } else {
      // User has nearly hit protein — prefer lower-protein options
      proteinFit = meal.protein < 15 ? 0.9 : 0.3;
    }

    // Calorie fit: prefer meals that don't blow past remaining cals
    let calorieFit = 0;
    if (remainingMacros.calories > 100) {
      const ratio = meal.calories / remainingMacros.calories;
      calorieFit = ratio <= 0.5
        ? 0.8 + ratio * 0.4
        : ratio <= 0.8
          ? 1.0
          : Math.max(0.1, 1.0 - (ratio - 0.8) * 2);
    } else {
      calorieFit = meal.calories < 200 ? 0.8 : 0.2;
    }

    const score = proteinFit * 0.55 + calorieFit * 0.45;
    return { meal, score: clamp(score, 0, 1) };
  });

  // Sort by score descending, take top 5
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 5).map(({ meal }) => ({
    name: meal.name,
    protein: meal.protein,
    carbs: meal.carbs,
    fat: meal.fat,
    calories: meal.calories,
    timing: meal.timing,
    tags: meal.tags,
  }));
}

/** Build the internal meal suggestion database. */
function buildMealDatabase(): InternalMeal[] {
  return [
    // ── Shakes ──
    {
      name: 'Whey Protein Shake',
      protein: 50, carbs: 6, fat: 3, calories: 250,
      timing: 'anytime', tags: ['quick', 'shake', 'high-protein'],
      _times: ['morning', 'midday', 'afternoon', 'evening', 'post_workout'],
    },
    {
      name: 'Post-Workout Mass Shake (whey + banana + oats + PB)',
      protein: 45, carbs: 65, fat: 18, calories: 600,
      timing: 'post-workout or morning', tags: ['shake', 'high-carb', 'bulk'],
      _times: ['morning', 'post_workout'],
    },
    {
      name: 'Casein Bedtime Shake',
      protein: 30, carbs: 4, fat: 2, calories: 155,
      timing: 'before bed', tags: ['shake', 'slow-digesting', 'recovery'],
      _times: ['evening'],
    },
    // ── Snacks ──
    {
      name: 'Greek Yogurt + Banana + Honey',
      protein: 22, carbs: 35, fat: 4, calories: 265,
      timing: 'morning or snack', tags: ['dairy', 'quick'],
      _times: ['morning', 'afternoon', 'evening'],
    },
    {
      name: 'Cottage Cheese + Berries',
      protein: 28, carbs: 14, fat: 5, calories: 210,
      timing: 'afternoon or evening', tags: ['dairy', 'slow-digesting'],
      _times: ['afternoon', 'evening'],
    },
    {
      name: 'Hard-Boiled Eggs (3)',
      protein: 18, carbs: 1, fat: 15, calories: 210,
      timing: 'morning or snack', tags: ['quick', 'meal-prep'],
      _times: ['morning', 'midday', 'afternoon'],
    },
    {
      name: 'Protein Bar',
      protein: 20, carbs: 22, fat: 8, calories: 210,
      timing: 'anytime snack', tags: ['quick', 'portable'],
      _times: ['morning', 'midday', 'afternoon'],
    },
    {
      name: 'Beef Jerky',
      protein: 25, carbs: 6, fat: 3, calories: 150,
      timing: 'snack', tags: ['quick', 'portable', 'high-protein'],
      _times: ['midday', 'afternoon'],
    },
    {
      name: 'Rice Cakes + PB + Protein Scoop',
      protein: 30, carbs: 30, fat: 12, calories: 350,
      timing: 'pre-workout or snack', tags: ['quick', 'pre-workout'],
      _times: ['morning', 'midday', 'afternoon', 'post_workout'],
    },
    {
      name: 'Trail Mix + Whey Shake',
      protein: 35, carbs: 25, fat: 14, calories: 370,
      timing: 'snack', tags: ['portable', 'bulk'],
      _times: ['midday', 'afternoon'],
    },
    // ── Full Meals ──
    {
      name: 'Chicken, Rice & Broccoli',
      protein: 45, carbs: 55, fat: 8, calories: 475,
      timing: 'lunch or dinner', tags: ['meal-prep', 'lean', 'classic'],
      _times: ['midday', 'afternoon', 'evening'],
    },
    {
      name: 'Steak + Sweet Potato + Side Salad',
      protein: 42, carbs: 45, fat: 16, calories: 490,
      timing: 'dinner', tags: ['red-meat', 'iron'],
      _times: ['midday', 'evening'],
    },
    {
      name: 'Salmon + Quinoa + Roasted Veggies',
      protein: 38, carbs: 40, fat: 18, calories: 475,
      timing: 'lunch or dinner', tags: ['omega-3', 'anti-inflammatory'],
      _times: ['midday', 'evening'],
    },
    {
      name: 'Turkey Tacos (corn tortillas, salsa, avocado)',
      protein: 35, carbs: 40, fat: 14, calories: 425,
      timing: 'lunch or dinner', tags: ['quick-cook'],
      _times: ['midday', 'evening'],
    },
    {
      name: 'Egg & Avocado Toast (3 eggs, whole grain)',
      protein: 25, carbs: 30, fat: 22, calories: 420,
      timing: 'breakfast', tags: ['breakfast', 'healthy-fats'],
      _times: ['morning'],
    },
    {
      name: 'Protein Oatmeal (oats + whey + banana)',
      protein: 35, carbs: 55, fat: 8, calories: 435,
      timing: 'breakfast', tags: ['breakfast', 'high-carb'],
      _times: ['morning'],
    },
    {
      name: 'Tuna Pasta (whole wheat, olive oil, spinach)',
      protein: 40, carbs: 60, fat: 12, calories: 510,
      timing: 'lunch or post-workout', tags: ['high-carb', 'quick-cook'],
      _times: ['midday', 'evening', 'post_workout'],
    },
    {
      name: 'Ground Beef & Rice Bowl (soy sauce, green onions)',
      protein: 38, carbs: 50, fat: 15, calories: 490,
      timing: 'lunch or dinner', tags: ['meal-prep', 'bulk'],
      _times: ['midday', 'evening'],
    },
    {
      name: 'Chicken Wrap (grilled chicken, lettuce, tomato)',
      protein: 35, carbs: 35, fat: 12, calories: 390,
      timing: 'lunch', tags: ['quick-cook', 'portable'],
      _times: ['midday', 'afternoon'],
    },
    // ── Quick Meals ──
    {
      name: 'Deli Turkey Roll-Ups with Cheese',
      protein: 22, carbs: 3, fat: 8, calories: 170,
      timing: 'snack', tags: ['quick', 'low-carb'],
      _times: ['midday', 'afternoon'],
    },
    {
      name: 'Canned Tuna on Crackers with Mayo',
      protein: 30, carbs: 20, fat: 8, calories: 275,
      timing: 'lunch or snack', tags: ['quick', 'portable'],
      _times: ['midday', 'afternoon'],
    },
    {
      name: 'PB&J on Whole Wheat',
      protein: 12, carbs: 50, fat: 16, calories: 390,
      timing: 'snack or post-workout', tags: ['bulk', 'high-carb', 'quick'],
      _times: ['morning', 'midday', 'afternoon', 'post_workout'],
    },
    // ── Vegetarian-friendly ──
    {
      name: 'Tofu Stir-Fry with Rice',
      protein: 25, carbs: 50, fat: 12, calories: 410,
      timing: 'lunch or dinner', tags: ['vegetarian', 'high-carb'],
      _times: ['midday', 'evening'],
    },
    {
      name: 'Lentil Soup + Bread',
      protein: 20, carbs: 45, fat: 6, calories: 315,
      timing: 'lunch or dinner', tags: ['vegetarian', 'fiber'],
      _times: ['midday', 'evening'],
    },
    {
      name: 'Black Bean Bowl (rice, salsa, avocado, cheese)',
      protein: 22, carbs: 55, fat: 14, calories: 435,
      timing: 'lunch or dinner', tags: ['vegetarian'],
      _times: ['midday', 'evening'],
    },

    // ── Fruits ──
    {
      name: 'Banana',
      protein: 1, carbs: 27, fat: 0, calories: 105,
      timing: 'pre-workout or snack', tags: ['fruit', 'quick', 'portable'],
      _times: ['morning', 'afternoon', 'post_workout'],
    },
    {
      name: 'Apple',
      protein: 0, carbs: 25, fat: 0, calories: 95,
      timing: 'snack', tags: ['fruit', 'quick', 'portable'],
      _times: ['morning', 'afternoon'],
    },
    {
      name: 'Mixed Berries (blueberries, strawberries, raspberries)',
      protein: 1, carbs: 20, fat: 1, calories: 85,
      timing: 'morning or snack', tags: ['fruit', 'antioxidant'],
      _times: ['morning', 'afternoon'],
    },
    {
      name: 'Orange',
      protein: 1, carbs: 22, fat: 0, calories: 80,
      timing: 'snack', tags: ['fruit', 'quick', 'vitamin-c'],
      _times: ['morning', 'afternoon'],
    },
    {
      name: 'Mango (sliced)',
      protein: 1, carbs: 28, fat: 0, calories: 110,
      timing: 'snack or post-workout', tags: ['fruit', 'high-carb'],
      _times: ['afternoon', 'post_workout'],
    },
    {
      name: 'Grapes (1 cup)',
      protein: 1, carbs: 27, fat: 0, calories: 104,
      timing: 'snack', tags: ['fruit', 'quick'],
      _times: ['afternoon'],
    },

    // ── Vegetables & Mixed Veggies ──
    {
      name: 'Mixed Veggies (broccoli, carrots, bell peppers)',
      protein: 4, carbs: 12, fat: 0, calories: 65,
      timing: 'lunch or dinner side', tags: ['vegetable', 'fiber', 'low-cal'],
      _times: ['midday', 'evening'],
    },
    {
      name: 'Steamed Broccoli (large bowl)',
      protein: 5, carbs: 10, fat: 0, calories: 55,
      timing: 'lunch or dinner side', tags: ['vegetable', 'fiber', 'low-cal'],
      _times: ['midday', 'evening'],
    },
    {
      name: 'Stir-Fry Mixed Vegetables (with soy sauce)',
      protein: 5, carbs: 18, fat: 4, calories: 120,
      timing: 'lunch or dinner', tags: ['vegetable', 'quick-cook'],
      _times: ['midday', 'evening'],
    },
    {
      name: 'Side Salad (mixed greens, tomato, cucumber, olive oil)',
      protein: 2, carbs: 8, fat: 8, calories: 110,
      timing: 'lunch or dinner side', tags: ['vegetable', 'healthy-fats'],
      _times: ['midday', 'evening'],
    },
    {
      name: 'Roasted Sweet Potato',
      protein: 2, carbs: 27, fat: 0, calories: 115,
      timing: 'lunch or dinner side', tags: ['vegetable', 'high-carb', 'fiber'],
      _times: ['midday', 'evening'],
    },
    {
      name: 'Spinach & Avocado Salad',
      protein: 4, carbs: 10, fat: 15, calories: 190,
      timing: 'lunch side', tags: ['vegetable', 'healthy-fats', 'iron'],
      _times: ['midday'],
    },
    {
      name: 'Frozen Mixed Veggies (microwaved, 2 cups)',
      protein: 5, carbs: 15, fat: 0, calories: 80,
      timing: 'any meal side', tags: ['vegetable', 'quick', 'meal-prep'],
      _times: ['midday', 'evening'],
    },
    {
      name: 'Carrot Sticks & Hummus',
      protein: 5, carbs: 18, fat: 8, calories: 160,
      timing: 'snack', tags: ['vegetable', 'fiber', 'quick'],
      _times: ['afternoon'],
    },

    // ── Snacks / Treats ──
    {
      name: 'Haribo Goldbears (1 bag, 100g)',
      protein: 7, carbs: 77, fat: 0, calories: 340,
      timing: 'post-workout treat or snack', tags: ['treat', 'high-carb', 'quick'],
      _times: ['afternoon', 'post_workout'],
    },
    {
      name: 'Haribo Goldbears (small handful, 40g)',
      protein: 3, carbs: 31, fat: 0, calories: 136,
      timing: 'post-workout treat or snack', tags: ['treat', 'high-carb', 'quick'],
      _times: ['afternoon', 'post_workout'],
    },
    {
      name: 'Haribo Starmix (1 bag, 100g)',
      protein: 6, carbs: 78, fat: 1, calories: 345,
      timing: 'post-workout treat or snack', tags: ['treat', 'high-carb'],
      _times: ['afternoon', 'post_workout'],
    },

    // ── Innsbruck / Austrian & Central European Foods ──

    // Traditional Austrian
    {
      name: 'Wiener Schnitzel (veal, breadcrumbed)',
      protein: 35, carbs: 20, fat: 22, calories: 420,
      timing: 'lunch or dinner', tags: ['austrian', 'high-protein'],
      _times: ['midday', 'evening'],
    },
    {
      name: 'Kaiserschmarrn (shredded pancake with powdered sugar)',
      protein: 12, carbs: 65, fat: 15, calories: 440,
      timing: 'breakfast or post-workout treat', tags: ['austrian', 'high-carb', 'treat'],
      _times: ['morning', 'post_workout'],
    },
    {
      name: 'Tiroler Gröstl (potato, beef, onion, fried egg)',
      protein: 30, carbs: 40, fat: 20, calories: 460,
      timing: 'lunch or dinner', tags: ['austrian', 'tyrolean'],
      _times: ['midday', 'evening'],
    },
    {
      name: 'Kaspress Knödel (cheese dumpling in broth)',
      protein: 18, carbs: 35, fat: 14, calories: 340,
      timing: 'lunch', tags: ['austrian', 'tyrolean', 'soup'],
      _times: ['midday'],
    },
    {
      name: 'Käsespätzle (cheese noodles with fried onions)',
      protein: 22, carbs: 50, fat: 20, calories: 470,
      timing: 'lunch or dinner', tags: ['austrian', 'high-carb', 'bulk'],
      _times: ['midday', 'evening'],
    },
    {
      name: 'Germknödel (yeast dumpling with poppy seeds & butter)',
      protein: 10, carbs: 60, fat: 16, calories: 420,
      timing: 'post-workout or dessert', tags: ['austrian', 'high-carb', 'treat'],
      _times: ['afternoon', 'post_workout'],
    },
    {
      name: 'Leberknödelsuppe (liver dumpling soup)',
      protein: 18, carbs: 15, fat: 8, calories: 200,
      timing: 'lunch starter', tags: ['austrian', 'soup', 'iron'],
      _times: ['midday'],
    },
    {
      name: 'Apfelstrudel (apple strudel, 1 slice)',
      protein: 4, carbs: 45, fat: 10, calories: 285,
      timing: 'afternoon snack', tags: ['austrian', 'treat'],
      _times: ['afternoon'],
    },
    {
      name: 'Topfenstrudel (curd cheese strudel, 1 slice)',
      protein: 10, carbs: 35, fat: 12, calories: 290,
      timing: 'afternoon snack', tags: ['austrian', 'treat', 'dairy'],
      _times: ['afternoon'],
    },
    {
      name: 'Gulaschsuppe (beef goulash soup)',
      protein: 20, carbs: 15, fat: 10, calories: 230,
      timing: 'lunch', tags: ['austrian', 'soup', 'iron'],
      _times: ['midday'],
    },
    {
      name: 'Schweinsbraten (roast pork with sauerkraut & dumpling)',
      protein: 38, carbs: 45, fat: 22, calories: 530,
      timing: 'dinner', tags: ['austrian', 'high-protein', 'bulk'],
      _times: ['evening'],
    },
    {
      name: 'Bauernbrot with Butter & Ham (farmer bread)',
      protein: 14, carbs: 35, fat: 12, calories: 305,
      timing: 'breakfast or snack', tags: ['austrian', 'quick'],
      _times: ['morning', 'afternoon'],
    },

    // Bakery / Breakfast items common in Innsbruck
    {
      name: 'Semmel (Austrian bread roll) with Butter & Cheese',
      protein: 10, carbs: 30, fat: 12, calories: 270,
      timing: 'breakfast', tags: ['austrian', 'breakfast', 'quick'],
      _times: ['morning'],
    },
    {
      name: 'Müsli with Yogurt & Fresh Berries',
      protein: 15, carbs: 45, fat: 8, calories: 310,
      timing: 'breakfast', tags: ['breakfast', 'dairy', 'fiber'],
      _times: ['morning'],
    },
    {
      name: 'Vollkornbrot with Avocado & Egg (whole grain bread)',
      protein: 16, carbs: 28, fat: 18, calories: 340,
      timing: 'breakfast', tags: ['breakfast', 'healthy-fats'],
      _times: ['morning'],
    },

    // Kebab / Döner (very common in Innsbruck)
    {
      name: 'Döner Kebab (chicken, salad, garlic sauce)',
      protein: 32, carbs: 45, fat: 18, calories: 470,
      timing: 'lunch or dinner', tags: ['quick-cook', 'portable', 'high-protein'],
      _times: ['midday', 'evening'],
    },
    {
      name: 'Dürüm Wrap (chicken, lettuce, sauce)',
      protein: 30, carbs: 40, fat: 16, calories: 425,
      timing: 'lunch or dinner', tags: ['quick-cook', 'portable'],
      _times: ['midday', 'evening'],
    },
    {
      name: 'Falafel Wrap with Hummus',
      protein: 14, carbs: 48, fat: 16, calories: 390,
      timing: 'lunch', tags: ['vegetarian', 'portable'],
      _times: ['midday'],
    },
    {
      name: 'Lahmacun (Turkish pizza) with Salad',
      protein: 18, carbs: 42, fat: 10, calories: 330,
      timing: 'lunch', tags: ['quick-cook'],
      _times: ['midday'],
    },

    // Italian (very popular in Tyrol/Innsbruck)
    {
      name: 'Spaghetti Bolognese',
      protein: 28, carbs: 65, fat: 14, calories: 500,
      timing: 'lunch or dinner', tags: ['italian', 'high-carb', 'bulk'],
      _times: ['midday', 'evening'],
    },
    {
      name: 'Margherita Pizza (half)',
      protein: 16, carbs: 50, fat: 14, calories: 390,
      timing: 'lunch or dinner', tags: ['italian', 'high-carb'],
      _times: ['midday', 'evening'],
    },
    {
      name: 'Penne Arrabiata with Parmesan',
      protein: 16, carbs: 60, fat: 10, calories: 395,
      timing: 'lunch or dinner', tags: ['italian', 'vegetarian', 'high-carb'],
      _times: ['midday', 'evening'],
    },
    {
      name: 'Caprese Salad (mozzarella, tomato, basil)',
      protein: 14, carbs: 6, fat: 18, calories: 245,
      timing: 'lunch side or snack', tags: ['italian', 'low-carb', 'quick'],
      _times: ['midday', 'afternoon'],
    },

    // Supermarket / quick meals (SPAR, MPREIS, Hofer common in Innsbruck)
    {
      name: 'Skyr (Icelandic yogurt, 200g)',
      protein: 22, carbs: 8, fat: 0, calories: 120,
      timing: 'snack or breakfast', tags: ['dairy', 'high-protein', 'quick'],
      _times: ['morning', 'afternoon'],
    },
    {
      name: 'Topfen (Austrian quark, 250g) with Honey',
      protein: 30, carbs: 15, fat: 0, calories: 185,
      timing: 'breakfast or snack', tags: ['austrian', 'dairy', 'high-protein'],
      _times: ['morning', 'afternoon'],
    },
    {
      name: 'Leberkäse Semmel (meatloaf roll)',
      protein: 18, carbs: 30, fat: 20, calories: 370,
      timing: 'lunch or snack', tags: ['austrian', 'quick', 'portable'],
      _times: ['midday', 'afternoon'],
    },
    {
      name: 'Wurstsemmel (sausage roll)',
      protein: 14, carbs: 28, fat: 16, calories: 315,
      timing: 'snack', tags: ['austrian', 'quick', 'portable'],
      _times: ['midday', 'afternoon'],
    },
    {
      name: 'Manner Wafers (1 pack, 75g)',
      protein: 4, carbs: 48, fat: 16, calories: 350,
      timing: 'snack or treat', tags: ['austrian', 'treat'],
      _times: ['afternoon'],
    },
    {
      name: 'Knödel (bread dumpling, 2 pieces)',
      protein: 8, carbs: 40, fat: 6, calories: 245,
      timing: 'lunch or dinner side', tags: ['austrian', 'high-carb'],
      _times: ['midday', 'evening'],
    },
    {
      name: 'Erdäpfelsalat (Austrian potato salad)',
      protein: 4, carbs: 25, fat: 8, calories: 185,
      timing: 'lunch or dinner side', tags: ['austrian', 'vegetarian'],
      _times: ['midday', 'evening'],
    },

    // More fruits & produce (Alpine / Central European)
    {
      name: 'Birchermüsli (overnight oats, Swiss style)',
      protein: 10, carbs: 40, fat: 8, calories: 275,
      timing: 'breakfast', tags: ['breakfast', 'fiber', 'quick'],
      _times: ['morning'],
    },
    {
      name: 'Pear (Williams)',
      protein: 0, carbs: 25, fat: 0, calories: 95,
      timing: 'snack', tags: ['fruit', 'quick'],
      _times: ['afternoon'],
    },
    {
      name: 'Plums (5 pieces)',
      protein: 1, carbs: 19, fat: 0, calories: 75,
      timing: 'snack', tags: ['fruit', 'quick', 'fiber'],
      _times: ['afternoon'],
    },
    {
      name: 'Apricots (4 pieces)',
      protein: 1, carbs: 15, fat: 0, calories: 60,
      timing: 'snack', tags: ['fruit', 'quick'],
      _times: ['afternoon'],
    },

    // High-protein Austrian / European options
    {
      name: 'Speckknödel (bacon dumpling soup)',
      protein: 20, carbs: 30, fat: 14, calories: 330,
      timing: 'lunch', tags: ['austrian', 'tyrolean', 'soup'],
      _times: ['midday'],
    },
    {
      name: 'Forelle (trout, pan-fried) with Parsley Potatoes',
      protein: 35, carbs: 30, fat: 12, calories: 370,
      timing: 'lunch or dinner', tags: ['austrian', 'omega-3', 'lean'],
      _times: ['midday', 'evening'],
    },
    {
      name: 'Protein Pancakes (Palatschinken style, with quark)',
      protein: 30, carbs: 35, fat: 8, calories: 335,
      timing: 'breakfast or post-workout', tags: ['austrian', 'high-protein', 'breakfast'],
      _times: ['morning', 'post_workout'],
    },
  ];
}

// ─── 4. Hydration Coaching ──────────────────────────────────────────────────

/**
 * Calculate daily hydration target and current adherence.
 *
 * Base: ~35 ml per kg bodyweight (Popkin et al. 2010).
 * Training days add 500-750 ml for sweat losses.
 * Returned in both ml and oz for flexibility.
 *
 * @param user           User profile (for bodyweight)
 * @param waterLog       Array of water intake entries in ml for today, or a
 *                       single number representing total ml consumed today
 * @param hasWorkoutToday Whether the user has a workout scheduled/completed
 */
export function getHydrationTarget(
  user: UserProfile | null,
  waterLog: number[] | number,
  hasWorkoutToday: boolean
): HydrationTarget {
  const bodyWeight = bwKg(user);

  // Base target: 35 ml/kg
  let dailyMl = Math.round(bodyWeight * 35);

  // Extra for training sessions
  const perWorkoutExtra = hasWorkoutToday ? 600 : 0;
  dailyMl += perWorkoutExtra;

  // Current intake
  const currentIntake = typeof waterLog === 'number'
    ? waterLog
    : waterLog.reduce((sum, entry) => sum + entry, 0);

  // Adherence
  const adherencePercent = dailyMl > 0
    ? clamp(Math.round((currentIntake / dailyMl) * 100), 0, 150)
    : 0;

  return {
    dailyMl,
    dailyOz: mlToOz(dailyMl),
    perWorkoutExtra,
    currentIntake,
    adherencePercent,
  };
}

// ─── 5. Weekly Nutrition Score ──────────────────────────────────────────────

/**
 * Grade the user's nutrition adherence over the past week.
 *
 * Scoring weights:
 *   - Protein adherence: 35% (most impactful for body composition)
 *   - Calorie adherence: 30%
 *   - Hydration: 15%
 *   - Consistency (days logged): 20%
 *
 * @param meals       All meal entries (will be filtered to the relevant week)
 * @param macroTargets The user's daily macro targets
 * @param waterLog    Record of date string → ml consumed, e.g. { '2025-03-01': 2500 }
 * @param daysInWeek  Number of days to evaluate (typically 7)
 */
export function getWeeklyNutritionScore(
  meals: MealEntry[],
  macroTargets: MacroTargets,
  waterLog: Record<string, number>,
  daysInWeek: number = 7
): WeeklyNutritionScore {
  const now = new Date();
  const dayCount = clamp(daysInWeek, 1, 14);
  const improvements: string[] = [];

  // Collect date strings for the evaluation window
  const dateStrings: string[] = [];
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dateStrings.push(toDateStr(d));
  }

  // ── Per-day analysis ──
  const dailyData = dateStrings.map(dateStr => {
    const dayMeals = mealsOnDate(meals, dateStr);
    const protein = sumMealField(dayMeals, 'protein');
    const calories = sumMealField(dayMeals, 'calories');
    const water = waterLog[dateStr] || 0;
    const logged = dayMeals.length > 0;
    return { dateStr, protein, calories, water, logged, mealCount: dayMeals.length };
  });

  const loggedDays = dailyData.filter(d => d.logged);
  const loggedCount = loggedDays.length;

  // ── Protein Score (0-100) ──
  let proteinScore = 0;
  if (loggedCount > 0) {
    const proteinTarget = macroTargets.protein || 1;
    const dayScores = loggedDays.map(d => {
      const ratio = d.protein / proteinTarget;
      if (ratio >= 0.9 && ratio <= 1.15) return 100;
      if (ratio < 0.9) return Math.round((ratio / 0.9) * 100);
      // Over: mild penalty
      return Math.max(50, Math.round(100 - (ratio - 1.15) * 200));
    });
    proteinScore = Math.round(dayScores.reduce((s, v) => s + v, 0) / dayScores.length);
  }
  proteinScore = clamp(proteinScore, 0, 100);

  if (proteinScore < 70) {
    improvements.push('Protein consistency is low — aim for 3-4 high-protein meals each day.');
  } else if (proteinScore < 85) {
    improvements.push('Protein is decent but not consistent. Try a shake or yogurt as a daily anchor.');
  }

  // ── Calorie Score (0-100) ──
  let calorieScore = 0;
  if (loggedCount > 0) {
    const calTarget = macroTargets.calories || 1;
    const dayScores = loggedDays.map(d => {
      const ratio = d.calories / calTarget;
      if (ratio >= 0.9 && ratio <= 1.1) return 100;
      if (ratio < 0.9) return Math.round((ratio / 0.9) * 100);
      return Math.max(30, Math.round(100 - (ratio - 1.1) * 250));
    });
    calorieScore = Math.round(dayScores.reduce((s, v) => s + v, 0) / dayScores.length);
  }
  calorieScore = clamp(calorieScore, 0, 100);

  if (calorieScore < 60) {
    improvements.push('Calorie adherence needs work. Large daily swings slow progress — aim for consistency.');
  } else if (calorieScore < 80) {
    improvements.push('Calorie tracking is close but not tight. Pre-plan meals to stay within 10% of target.');
  }

  // ── Hydration Score (0-100) ──
  let hydrationScore = 50; // Default if no water logged
  const waterEntries = dateStrings.filter(d => (waterLog[d] || 0) > 0);

  if (waterEntries.length > 0) {
    const bodyWeight = 75; // Cannot access user here; use default
    const waterTarget = bodyWeight * 35; // ml
    const dayScores = waterEntries.map(dateStr => {
      const intake = waterLog[dateStr] || 0;
      const ratio = intake / waterTarget;
      if (ratio >= 0.85) return 100;
      if (ratio >= 0.5) return Math.round(50 + ((ratio - 0.5) / 0.35) * 50);
      return Math.round((ratio / 0.5) * 50);
    });
    hydrationScore = Math.round(dayScores.reduce((s, v) => s + v, 0) / dayScores.length);
  } else {
    improvements.push('No water intake logged this week. Track hydration for a complete picture.');
  }
  hydrationScore = clamp(hydrationScore, 0, 100);

  if (hydrationScore < 60 && waterEntries.length > 0) {
    improvements.push('Hydration is falling short. Keep a water bottle within reach and sip regularly.');
  }

  // ── Consistency Score (0-100) ──
  // How many of the days had at least one meal logged?
  const consistencyRatio = loggedCount / dayCount;
  let consistencyScore: number;
  if (consistencyRatio >= 0.85) {
    consistencyScore = 100;
  } else if (consistencyRatio >= 0.7) {
    consistencyScore = 85;
  } else if (consistencyRatio >= 0.5) {
    consistencyScore = 65;
  } else if (consistencyRatio > 0) {
    consistencyScore = Math.round(consistencyRatio * 100);
  } else {
    consistencyScore = 0;
  }

  if (consistencyScore < 60) {
    improvements.push(`Only ${loggedCount} of ${dayCount} days logged. Aim for at least 5 days to get reliable data.`);
  }

  // ── Overall Score ──
  const overall = clamp(Math.round(
    proteinScore * 0.35 +
    calorieScore * 0.30 +
    hydrationScore * 0.15 +
    consistencyScore * 0.20
  ), 0, 100);

  // Add a positive note if things are going well
  if (improvements.length === 0 && overall >= 80) {
    improvements.push('Strong week of nutrition. Keep this consistency going.');
  } else if (improvements.length === 0) {
    improvements.push('Decent effort this week. Small improvements add up over time.');
  }

  return {
    overall,
    proteinScore,
    calorieScore,
    hydrationScore,
    consistencyScore,
    improvements,
  };
}

// ─── 6. Nutrition Insights ──────────────────────────────────────────────────

/**
 * Generate a top-level insight and actionable tips based on the user's
 * recent nutrition data relative to their targets and training.
 *
 * This is the "coach summary" that appears on the dashboard — one headline
 * insight plus 2-4 practical tips.
 */
export function getNutritionInsights(
  user: UserProfile | null,
  meals: MealEntry[],
  macroTargets: MacroTargets,
  workoutLogs: WorkoutLog[],
  waterLog: Record<string, number>
): { topInsight: string; tips: string[] } {
  const tips: string[] = [];
  const now = new Date();
  const todayStr = toDateStr(now);

  // ── Gather recent data ──
  const last7Days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    last7Days.push(toDateStr(d));
  }

  const weekMeals = meals.filter(m => last7Days.includes(toDateStr(m.date)));
  const loggedDays = last7Days.filter(dateStr =>
    mealsOnDate(meals, dateStr).length > 0
  );

  // ── Per-day stats ──
  const dailyProtein: number[] = [];
  const dailyCals: number[] = [];
  loggedDays.forEach(dateStr => {
    const dayMeals = mealsOnDate(meals, dateStr);
    dailyProtein.push(sumMealField(dayMeals, 'protein'));
    dailyCals.push(sumMealField(dayMeals, 'calories'));
  });

  const avgProtein = dailyProtein.length > 0
    ? Math.round(dailyProtein.reduce((s, v) => s + v, 0) / dailyProtein.length)
    : 0;
  const avgCals = dailyCals.length > 0
    ? Math.round(dailyCals.reduce((s, v) => s + v, 0) / dailyCals.length)
    : 0;

  // ── Training day nutrition check ──
  const recentWorkouts = workoutLogs.filter(l => {
    const diff = now.getTime() - new Date(l.date).getTime();
    return diff >= 0 && diff < 7 * 24 * 60 * 60 * 1000;
  });
  const trainingDateStrs = recentWorkouts.map(l => toDateStr(l.date));
  const trainingDayMeals = trainingDateStrs
    .filter(d => loggedDays.includes(d))
    .map(d => ({
      cals: sumMealField(mealsOnDate(meals, d), 'calories'),
      protein: sumMealField(mealsOnDate(meals, d), 'protein'),
    }));

  const underFueledWorkouts = trainingDayMeals.filter(
    d => d.cals < macroTargets.calories * 0.8
  );

  // ── Top Insight (single most important observation) ──
  let topInsight: string;

  if (loggedDays.length === 0) {
    topInsight = 'No meals logged this week. Start tracking to unlock personalised nutrition coaching.';
  } else if (loggedDays.length < 3) {
    topInsight = `Only ${loggedDays.length} day${loggedDays.length === 1 ? '' : 's'} logged this week. ` +
      'More data means better recommendations — aim for at least 5 days.';
  } else if (underFueledWorkouts.length > 0 && trainingDayMeals.length > 0 &&
             underFueledWorkouts.length >= trainingDayMeals.length * 0.5) {
    topInsight = 'You under-ate on most training days this week. Fuel your workouts for better performance and recovery.';
  } else if (avgProtein < macroTargets.protein * 0.75) {
    topInsight = `Average daily protein (${avgProtein}g) is well below your ${macroTargets.protein}g target. ` +
      'Protein is the #1 priority for body composition — make it the focus.';
  } else if (avgProtein >= macroTargets.protein * 0.9 && avgCals >= macroTargets.calories * 0.9 &&
             avgCals <= macroTargets.calories * 1.1) {
    topInsight = 'Great adherence this week — protein and calories are both on target. Keep it up.';
  } else if (avgCals > macroTargets.calories * 1.15) {
    topInsight = `Average daily calories (${avgCals}) are running ${Math.round(((avgCals / macroTargets.calories) - 1) * 100)}% above target. ` +
      'Check portion sizes and reduce calorie-dense snacks.';
  } else if (avgCals < macroTargets.calories * 0.8) {
    topInsight = `Average daily intake (${avgCals} kcal) is significantly below your ${macroTargets.calories} target. ` +
      'Under-eating compromises recovery and training performance.';
  } else {
    topInsight = `Averaging ${avgProtein}g protein and ${avgCals} kcal/day. ` +
      'Solid — focus on consistency and hitting targets every day, not just most days.';
  }

  // ── Tips ──

  // Protein distribution
  if (loggedDays.length >= 2) {
    const proteinVariance = dailyProtein.reduce((sum, p) => {
      return sum + Math.pow(p - avgProtein, 2);
    }, 0) / dailyProtein.length;
    const proteinStdDev = Math.sqrt(proteinVariance);

    if (proteinStdDev > avgProtein * 0.3) {
      tips.push(
        'Your protein intake varies a lot day-to-day. Anchor it with one consistent ' +
        'habit — like a shake every morning or Greek yogurt every afternoon.'
      );
    }
  }

  // Weekend pattern detection
  const weekendDays = loggedDays.filter(d => {
    const dow = new Date(d + 'T12:00:00').getDay();
    return dow === 0 || dow === 6;
  });
  const weekdayDays = loggedDays.filter(d => {
    const dow = new Date(d + 'T12:00:00').getDay();
    return dow !== 0 && dow !== 6;
  });

  if (weekendDays.length >= 1 && weekdayDays.length >= 2) {
    const weekendAvgCals = weekendDays.reduce((sum, d) =>
      sum + sumMealField(mealsOnDate(meals, d), 'calories'), 0
    ) / weekendDays.length;
    const weekdayAvgCals = weekdayDays.reduce((sum, d) =>
      sum + sumMealField(mealsOnDate(meals, d), 'calories'), 0
    ) / weekdayDays.length;

    if (weekendAvgCals > weekdayAvgCals * 1.2) {
      tips.push(
        'Weekend calories tend to spike. Pre-plan your weekend meals ' +
        'or bump up protein to stay fuller with fewer total calories.'
      );
    } else if (weekendAvgCals < weekdayAvgCals * 0.7) {
      tips.push(
        'Weekend intake drops significantly. Set a meal reminder or prep ' +
        'easy options so you don\'t under-eat on rest days.'
      );
    }
  }

  // Hydration tip
  const waterDays = last7Days.filter(d => (waterLog[d] || 0) > 0);
  if (waterDays.length === 0) {
    tips.push('Start tracking water intake — dehydration impairs performance and recovery more than most people think.');
  } else {
    const avgWater = waterDays.reduce((s, d) => s + (waterLog[d] || 0), 0) / waterDays.length;
    const waterTarget = bwKg(user) * 35;
    if (avgWater < waterTarget * 0.7) {
      tips.push(
        `Average water intake (~${Math.round(avgWater)}ml) is below the ${Math.round(waterTarget)}ml target. ` +
        'Carry a bottle and drink before you feel thirsty.'
      );
    }
  }

  // Training-specific tip
  if (underFueledWorkouts.length > 0 && trainingDayMeals.length > 0) {
    tips.push(
      'On training days, eat a protein + carb meal 1-2 hours before lifting. ' +
      'This alone can meaningfully improve performance and recovery.'
    );
  }

  // General evidence-based tips as fallbacks
  if (tips.length < 2) {
    const goal = inferGoalFromMacros(user, macroTargets);
    if (goal === 'cut') {
      tips.push('During a cut, prioritise protein and fibre-rich foods to stay full. Vegetables are your best friend.');
    } else if (goal === 'bulk') {
      tips.push('If hitting calorie targets is hard, add calorie-dense foods: nuts, nut butter, olive oil, dried fruit.');
    }
  }

  if (tips.length < 2) {
    tips.push('Meal prep on Sundays sets up the whole week. Even 2-3 prepped meals makes a difference.');
  }

  // Cap at 4 tips
  return {
    topInsight,
    tips: tips.slice(0, 4),
  };
}

// ─── Backward-Compatible Exports ────────────────────────────────────────────
// HomeTab.tsx imports these from the previous API surface. Kept here as thin
// wrappers so existing consumers don't break.

export interface NutritionScoreBreakdown {
  protein: number;
  calories: number;
  timing: number;
  hydration: number;
}

export interface NutritionScore {
  overall: number;
  breakdown: NutritionScoreBreakdown;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  feedback: string;
}

/** Today's date as YYYY-MM-DD. */
function todayDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

function scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

/**
 * Legacy daily nutrition score used by HomeTab.
 * New code should prefer `getWeeklyNutritionScore`.
 */
export function calculateNutritionScore(
  meals: MealEntry[],
  macroTargets: MacroTargets,
  waterLog?: Record<string, number>,
  bodyWeightKg?: number
): NutritionScore {
  const today = todayDateStr();
  const todayMeals = mealsOnDate(meals, today);

  // Protein score
  const proteinConsumed = sumMealField(todayMeals, 'protein');
  const proteinTarget = macroTargets.protein || 1;
  const proteinRatio = proteinConsumed / proteinTarget;
  let proteinScore: number;
  if (proteinRatio >= 0.9 && proteinRatio <= 1.1) proteinScore = 100;
  else if (proteinRatio < 0.9) proteinScore = Math.round((proteinRatio / 0.9) * 100);
  else proteinScore = Math.max(60, Math.round(100 - (proteinRatio - 1.1) * 200));
  proteinScore = clamp(proteinScore, 0, 100);

  // Calorie score
  const calsConsumed = sumMealField(todayMeals, 'calories');
  const calTarget = macroTargets.calories || 1;
  const calRatio = calsConsumed / calTarget;
  let calorieScore: number;
  if (calRatio >= 0.9 && calRatio <= 1.1) calorieScore = 100;
  else if (calRatio < 0.9) calorieScore = Math.round((calRatio / 0.9) * 100);
  else calorieScore = Math.max(40, Math.round(100 - (calRatio - 1.1) * 250));
  calorieScore = clamp(calorieScore, 0, 100);

  // Timing score
  const mealCount = todayMeals.length;
  let timingScore: number;
  if (mealCount === 0) timingScore = 0;
  else if (mealCount >= 3 && mealCount <= 5) timingScore = 100;
  else if (mealCount === 1) timingScore = 30;
  else if (mealCount === 2) timingScore = 60;
  else timingScore = 85;

  const mealTypes = new Set<string>();
  todayMeals.forEach(m => mealTypes.add(m.mealType));
  if (mealTypes.size >= 3) timingScore = Math.min(100, timingScore + 10);

  // Hydration score
  const todayWater = waterLog?.[today] || 0;
  const waterMl = todayWater * 250;
  const waterTarget = (bodyWeightKg || 75) * 35;
  const waterRatio = waterTarget > 0 ? waterMl / waterTarget : 0;
  let hydrationScore: number;
  if (!waterLog || todayWater === 0) hydrationScore = 50;
  else if (waterRatio >= 0.85) hydrationScore = 100;
  else if (waterRatio >= 0.5) hydrationScore = Math.round(50 + ((waterRatio - 0.5) / 0.35) * 50);
  else hydrationScore = Math.round((waterRatio / 0.5) * 50);
  hydrationScore = clamp(hydrationScore, 0, 100);

  const overall = clamp(Math.round(
    proteinScore * 0.4 + calorieScore * 0.3 + timingScore * 0.2 + hydrationScore * 0.1
  ), 0, 100);

  const grade = scoreToGrade(overall);

  // Feedback
  let feedback: string;
  if (mealCount === 0) {
    feedback = 'No meals logged yet today. Start logging to get personalized feedback.';
  } else if (proteinScore >= 90 && calorieScore >= 90) {
    feedback = 'Great job hitting your protein and calorie targets.';
  } else if (proteinScore < 75) {
    feedback = 'Protein could use work — aim for 3-4 high-protein meals spread across the day.';
  } else if (calorieScore < 75) {
    feedback = calsConsumed < calTarget * 0.8
      ? 'You\'re significantly under your calorie target. Make sure you\'re eating enough to fuel recovery.'
      : 'Calories are a bit low — consider adding a snack or slightly larger portions.';
  } else {
    feedback = 'Solid nutrition today. Keep it consistent.';
  }

  return {
    overall,
    breakdown: { protein: proteinScore, calories: calorieScore, timing: timingScore, hydration: hydrationScore },
    grade,
    feedback,
  };
}

export interface HydrationPlan {
  dailyTarget: number;
  dailyMl: number;
  currentIntake: number;
  remaining: number;
  reminders: string[];
  tips: string[];
}

/**
 * Legacy hydration function used by HomeTab.
 * Overload: when called with the old 4-arg signature (user, workoutToday,
 * wearableData, currentWaterMl) it returns the old HydrationPlan shape.
 * New code should use the 3-arg getHydrationTarget.
 */
export function getHydrationTargetLegacy(
  user: import('./types').UserProfile | null,
  workoutToday: boolean,
  _wearableData?: import('./types').WearableData | null,
  currentWaterMl?: number
): HydrationPlan {
  const bodyWeight = bwKg(user);
  let dailyTarget = Math.round(bodyWeight * 35);
  if (workoutToday) dailyTarget += 600;

  const currentIntake = currentWaterMl || 0;
  const remaining = Math.max(0, dailyTarget - currentIntake);
  const progressPct = dailyTarget > 0 ? (currentIntake / dailyTarget) * 100 : 0;

  const reminders: string[] = [];
  if (progressPct < 25) {
    reminders.push('Start hydrating early — have a glass of water with breakfast');
  } else if (progressPct < 50) {
    reminders.push('Good start — keep sipping throughout the afternoon');
  } else if (progressPct < 100) {
    reminders.push(`Almost there — ${Math.round(remaining)}ml to go`);
  } else {
    reminders.push('Hydration target reached — great job');
  }

  return {
    dailyTarget,
    dailyMl: dailyTarget,
    currentIntake,
    remaining,
    reminders,
    tips: ['Carry a marked water bottle to track intake easily', 'Urine color is a quick gauge — aim for pale yellow'],
  };
}
