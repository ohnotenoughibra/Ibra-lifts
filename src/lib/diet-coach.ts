/**
 * Evidence-based diet coaching engine.
 *
 * Implements an RP Diet / MacroFactor–style adaptive nutrition system:
 *   1. Goal-based macro calculation (set protein first, fat floor, carbs fill)
 *   2. Weekly adaptive adjustment based on weight trend vs target rate
 *   3. Diet phase management with break/transition prompts
 *
 * References:
 *   - Helms et al. 2014: protein 1.6–2.2 g/kg for muscle gain
 *   - Longland et al. 2016: 2.4 g/kg preserves LBM in aggressive deficit
 *   - Garthe et al. 2011: 0.7% BW/week optimal cutting rate
 *   - Byrne et al. 2017 (MATADOR): intermittent dieting benefits
 */

import { MacroTargets, DietGoal, DietPhase, WeeklyCheckIn, BodyWeightEntry, BiologicalSex } from './types';

// ── Macro Calculation ────────────────────────────────────────────────────────

interface MacroInput {
  bodyWeightKg: number;
  heightCm: number;
  age: number;
  sex: BiologicalSex;
  goal: DietGoal;
  activityMultiplier?: number; // 1.2 sedentary → 1.9 very active; default 1.55
}

/**
 * Calculate evidence-based macros using Mifflin-St Jeor BMR.
 * Validated as most accurate by ADA (2005). Priority: protein → fat floor → carbs fill.
 *
 * Mifflin-St Jeor (1990):
 *   Male:   BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age + 5
 *   Female: BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age − 161
 *
 * Sex-based macro adjustments (Melin et al. 2019; Trexler et al. 2014):
 *   - Women: higher fat floor (1.0 g/kg minimum) — hormonal health / RED-S prevention
 *   - Women: slightly lower protein ceiling during cuts (2.0 vs 2.4 g/kg)
 *   - Women: more conservative surplus during bulk (10% vs 12%)
 */
export function calculateMacros({ bodyWeightKg, heightCm, age, sex, goal, activityMultiplier = 1.55 }: MacroInput): MacroTargets {
  const bw = bodyWeightKg;
  const isFemale = sex === 'female';

  // Step 1: Mifflin-St Jeor BMR
  const sexConstant = sex === 'male' ? 5 : -161;
  const bmr = 10 * bw + 6.25 * heightCm - 5 * age + sexConstant;
  const maintenance = Math.round(bmr * activityMultiplier);

  // Step 2: Apply caloric target based on goal + sex
  let calories: number;
  let proteinPerKg: number;
  let fatPerKg: number;

  switch (goal) {
    case 'cut':
      calories = Math.round(maintenance * 0.8);    // ~20% deficit (same for both sexes)
      // Women: slightly lower protein ceiling (adequate with lower absolute loads)
      // Men: higher protein preserves more LBM in aggressive deficit
      proteinPerKg = isFemale ? 2.0 : 2.4;
      // Women: higher fat floor for hormonal health (estrogen, menstrual function)
      fatPerKg = isFemale ? 1.0 : 0.8;
      break;
    case 'bulk':
      // Women: more conservative surplus (gain muscle slower, lower risk of excess fat)
      calories = Math.round(maintenance * (isFemale ? 1.10 : 1.12));
      proteinPerKg = isFemale ? 1.8 : 2.0;
      fatPerKg = isFemale ? 1.0 : 1.0;
      break;
    case 'maintain':
    default:
      calories = maintenance;
      proteinPerKg = isFemale ? 1.8 : 2.0;
      fatPerKg = isFemale ? 1.0 : 0.9;
      break;
  }

  // Step 3: Set protein and fat, fill rest with carbs
  const protein = Math.round(bw * proteinPerKg);
  const fat = Math.round(bw * fatPerKg);
  const proteinCal = protein * 4;
  const fatCal = fat * 9;
  const carbCal = Math.max(0, calories - proteinCal - fatCal);
  const carbs = Math.round(carbCal / 4);

  return { calories, protein, carbs, fat };
}

// ── Target Rate of Change ────────────────────────────────────────────────────

/**
 * Get recommended weekly weight change (kg) based on goal, body weight, and sex.
 * Positive = gaining, negative = losing.
 *
 * Sex-based adjustments:
 *   - Women cut slower: ~0.5% BW/week vs ~0.7% for men (Garthe et al. 2011)
 *     Reason: aggressive deficits more likely to disrupt menstrual function,
 *     thyroid, and cortisol in women (Melin et al. 2019 — RED-S / LEA)
 *   - Women bulk slower: ~0.15-0.2% BW/week vs ~0.25-0.35% for men
 *     Reason: lower testosterone = slower rate of muscle protein synthesis,
 *     so a smaller surplus minimizes fat gain (Phillips et al. 2012)
 */
export function getTargetRate(goal: DietGoal, bodyWeightKg: number, sex?: BiologicalSex): number {
  const isFemale = sex === 'female';

  switch (goal) {
    case 'cut':
      // Women: ~0.5% BW/week (lower risk of hormonal disruption)
      // Men: ~0.7% BW/week (Garthe et al. 2011 optimal rate)
      return -(bodyWeightKg * (isFemale ? 0.005 : 0.007));
    case 'bulk':
      // Women: ~0.18% BW/week (muscle gain rate is ~50-60% of men's)
      // Men: ~0.3% BW/week for lean gains
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
  targetRatePerWeek: number;   // kg/week expected
  actualWeeklyChange: number;  // kg/week observed (smoothed)
  weeksAtPlateau: number;      // consecutive weeks with <0.1kg change
  adherencePercent: number;    // 0–100
  sex?: BiologicalSex;
}

interface AdjustmentResult {
  newMacros: MacroTargets;
  adjustment: 'increase' | 'decrease' | 'maintain';
  reason: string;
  alert?: string;              // diet break suggestion, phase end, etc.
}

/**
 * Weekly macro adjustment algorithm.
 *
 * Logic:
 * - If adherence < 70%, don't adjust (data is unreliable)
 * - If on track (within tolerance), keep macros
 * - If losing too fast during cut or not gaining during bulk, increase
 * - If stalled for 2+ weeks with good adherence, decrease (cut) or increase (bulk)
 * - Never reduce protein. Adjust carbs first, then fats.
 */
export function calculateWeeklyAdjustment({
  currentMacros,
  goal,
  targetRatePerWeek,
  actualWeeklyChange,
  weeksAtPlateau,
  adherencePercent,
  sex,
}: AdjustmentInput): AdjustmentResult {
  const isFemale = sex === 'female';
  // Don't adjust with poor adherence — data is unreliable
  if (adherencePercent < 70) {
    return {
      newMacros: { ...currentMacros },
      adjustment: 'maintain',
      reason: 'Adherence below 70% — log more consistently before adjusting.',
    };
  }

  const tolerance = Math.abs(targetRatePerWeek) * 0.4 || 0.15; // ±40% of target rate, min 0.15kg
  const diff = actualWeeklyChange - targetRatePerWeek;

  let adjustment: 'increase' | 'decrease' | 'maintain' = 'maintain';
  let reason = '';
  let alert: string | undefined;
  const newMacros = { ...currentMacros };

  if (goal === 'cut') {
    if (actualWeeklyChange > -tolerance * 0.5 && weeksAtPlateau >= 2) {
      // Stalled for 2+ weeks — reduce by ~7%
      adjustment = 'decrease';
      const calReduction = Math.round(currentMacros.calories * 0.07);
      newMacros.calories -= calReduction;
      // Split reduction: 60% carbs, 40% fat (protect protein)
      newMacros.carbs -= Math.round((calReduction * 0.6) / 4);
      newMacros.fat -= Math.round((calReduction * 0.4) / 9);
      reason = `Weight stalled for ${weeksAtPlateau} weeks. Reducing calories by ${calReduction}.`;
    } else if (actualWeeklyChange < targetRatePerWeek * 1.5) {
      // Losing too fast (>150% of target) — increase slightly
      adjustment = 'increase';
      newMacros.calories += 100;
      newMacros.carbs += 25; // 100 cal from carbs
      reason = 'Losing faster than target. Adding carbs to preserve muscle.';
    } else if (Math.abs(diff) <= tolerance) {
      adjustment = 'maintain';
      reason = 'On track. Keep current macros.';
    }

    // Fat floor: women need higher minimum fat for hormonal health (RED-S prevention)
    // Women: ~0.8 g/kg minimum (~50g for ~65kg), Men: ~0.5 g/kg (~35g for ~70kg)
    // (Melin et al. 2019; Mountjoy et al. 2018 — IOC consensus on RED-S)
    const fatFloor = isFemale ? 50 : 35;
    if (newMacros.fat < fatFloor) {
      newMacros.fat = fatFloor;
    }
    // Calorie floor: women more susceptible to LOW ENERGY AVAILABILITY (LEA)
    // Women: 1200 kcal minimum, Men: 1400 kcal minimum
    // Below ~30 kcal/kg FFM = clinical LEA risk (Loucks & Thuma, 2003)
    const calorieFloor = isFemale ? 1200 : 1400;
    if (newMacros.calories < calorieFloor) {
      newMacros.calories = calorieFloor;
      alert = isFemale
        ? 'Calories are very low — risk of hormonal disruption (RED-S). Take a 1-2 week diet break at maintenance.'
        : 'Calories are very low. Consider a 1-2 week diet break at maintenance.';
    }
  } else if (goal === 'bulk') {
    if (actualWeeklyChange < targetRatePerWeek * 0.5 && weeksAtPlateau >= 2) {
      // Not gaining enough for 2+ weeks — increase by ~5%
      adjustment = 'increase';
      const calIncrease = Math.round(currentMacros.calories * 0.05);
      newMacros.calories += calIncrease;
      newMacros.carbs += Math.round(calIncrease / 4); // all from carbs
      reason = `Gaining slower than target. Adding ${calIncrease} calories from carbs.`;
    } else if (actualWeeklyChange > targetRatePerWeek * 2) {
      // Gaining too fast (>200% of target) — likely too much fat gain
      adjustment = 'decrease';
      newMacros.calories -= 100;
      newMacros.carbs -= 25;
      reason = 'Gaining too fast. Reducing surplus to minimize fat gain.';
    } else {
      adjustment = 'maintain';
      reason = 'On track. Keep current macros.';
    }
  } else {
    // Maintenance: keep stable
    if (Math.abs(actualWeeklyChange) > 0.3) {
      // Drifting — small correction
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
 * Returns { current, weeklyChange, weeksAtPlateau }.
 */
export function analyzeWeightTrend(
  entries: BodyWeightEntry[],
  unitPreference: 'kg' | 'lbs' = 'kg'
): { current: number; weeklyChange: number; weeksAtPlateau: number; trendData: { date: string; weight: number; trend: number }[] } {
  if (entries.length === 0) {
    return { current: 0, weeklyChange: 0, weeksAtPlateau: 0, trendData: [] };
  }

  // Sort by date and convert to kg
  const sorted = [...entries]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(e => ({
      date: new Date(e.date).toISOString().split('T')[0],
      weight: e.unit === 'lbs' ? e.weight * 0.453592 : e.weight,
    }));

  // Exponential moving average (alpha = 0.2 for ~7-day smoothing)
  const alpha = 0.2;
  const trendData: { date: string; weight: number; trend: number }[] = [];
  let ema = sorted[0].weight;

  for (const entry of sorted) {
    ema = alpha * entry.weight + (1 - alpha) * ema;
    trendData.push({ date: entry.date, weight: entry.weight, trend: Math.round(ema * 10) / 10 });
  }

  const current = ema;

  // Weekly change: compare last 7 days trend vs previous 7 days
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

  // Weeks at plateau: consecutive weeks with <0.15kg change
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

  // Convert back to user preference for display
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
 *
 * Sex-based diet break timing (evidence-based):
 *   - Women: diet breaks every 4 weeks, max cut duration 8 weeks
 *     Reason: extended energy deficit more disruptive to female hormones
 *     (estrogen, progesterone, thyroid, cortisol) — Melin et al. 2019
 *     Byrne et al. 2017 (MATADOR) showed benefits of intermittent dieting
 *   - Men: diet breaks every 6 weeks, max cut duration 12 weeks
 *   - Women bulk max: 12 weeks (vs 16 for men) — monitor body comp more closely
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
    // Women: shorter max cut duration before mandatory transition
    const maxCutWeeks = isFemale ? 8 : 12;
    // Women: more frequent diet breaks (hormonal stress management)
    const breakInterval = isFemale ? 4 : 6;

    if (weeksCompleted >= maxCutWeeks) {
      const reason = isFemale
        ? `You've been cutting for ${weeksCompleted} weeks. Extended deficits increase RED-S risk for women. Transition to maintenance for 2-3 weeks to normalize hormones.`
        : `You've been cutting for ${weeksCompleted} weeks. Transition to maintenance for 2-3 weeks to normalize metabolism before resuming.`;
      return {
        suggestion: reason,
        shouldTakeBreak: false,
        shouldTransition: true,
        nextGoal: 'maintain',
      };
    }
    if (weeksCompleted >= breakInterval && weeksCompleted % breakInterval === 0) {
      const reason = isFemale
        ? `${weeksCompleted} weeks in. Women benefit from a 1-week diet break every ${breakInterval} weeks to protect hormonal function, thyroid output, and training performance.`
        : `${weeksCompleted} weeks in. Consider a 1-week diet break at maintenance calories to support hormones, recovery, and adherence.`;
      return {
        suggestion: reason,
        shouldTakeBreak: true,
        shouldTransition: false,
      };
    }
    return {
      suggestion: `Week ${weeksCompleted + 1} of your cut. Stay consistent with logging and training.`,
      shouldTakeBreak: false,
      shouldTransition: false,
    };
  }

  if (goal === 'bulk') {
    // Women: shorter bulk phases (monitor body comp more closely)
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
 * Calculate meal logging adherence for the past 7 days.
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
