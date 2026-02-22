/**
 * Performance Engine — Holistic Readiness System
 *
 * Integrates all tracked metrics into a single readiness score that modifies
 * workout volume and intensity prescriptions. Gracefully degrades when users
 * don't track certain metrics (redistributes weights to available factors).
 *
 * Science references:
 * - Walker 2017: Sleep <6h → 4× injury risk
 * - Dattilo 2011: Sleep deprivation reduces anabolic hormones (GH, testosterone)
 * - Schoenfeld & Aragon 2018: Protein distribution 0.4g/kg per meal, 4+ meals/day
 * - Helms 2014: 2.3-3.1g/kg FFM during caloric deficit
 * - Stults-Kolehmainen & Sinha 2014: Psychosocial stress impairs recovery
 * - Fell & Williams 2008: Masters athletes require longer recovery
 * - Kiviniemi 2007: HRV-guided training outperforms fixed programming
 * - Gabbett 2016: ACWR sweet spot 0.8-1.3
 */

import type {
  ReadinessScore,
  ReadinessFactor,
  ReadinessLevel,
  WorkoutLog,
  TrainingSession,
  WearableData,
  MealEntry,
  MacroTargets,
  InjuryEntry,
  PreWorkoutCheckIn,
  UserProfile,
  QuickLog,
} from './types';

// ── Factor Weights (default, redistributed if unavailable) ──────────────
const DEFAULT_WEIGHTS: Record<ReadinessFactor['source'], number> = {
  sleep:         0.20,
  nutrition:     0.14,
  stress:        0.11,
  recovery:      0.14,  // wearable recovery score
  injury:        0.09,
  training_load: 0.11,
  hydration:     0.04,
  age:           0.05,
  hrv:           0.04,
  soreness:      0.08,
};

// ── Main Entry Point ────────────────────────────────────────────────────
export function calculateReadiness(opts: {
  user: UserProfile | null;
  workoutLogs: WorkoutLog[];
  trainingSessions: TrainingSession[];
  wearableData: WearableData | null;
  wearableHistory: WearableData[];
  meals: MealEntry[];
  macroTargets: MacroTargets;
  waterLog: Record<string, number>;
  injuryLog: InjuryEntry[];
  quickLogs: QuickLog[];
  preCheckIn?: PreWorkoutCheckIn;
}): ReadinessScore {
  const factors: ReadinessFactor[] = [];
  const recommendations: string[] = [];

  // 1. Sleep
  factors.push(assessSleep(opts.wearableData, opts.preCheckIn, opts.quickLogs));

  // 2. Nutrition
  factors.push(assessNutrition(opts.meals, opts.macroTargets, opts.user));

  // 3. Stress
  factors.push(assessStress(opts.preCheckIn, opts.quickLogs));

  // 4. Recovery (wearable)
  factors.push(assessRecovery(opts.wearableData));

  // 5. Injury
  factors.push(assessInjury(opts.injuryLog));

  // 6. Training load
  factors.push(assessTrainingLoad(opts.workoutLogs, opts.trainingSessions));

  // 7. Hydration
  factors.push(assessHydration(opts.waterLog));

  // 8. Age
  factors.push(assessAge(opts.user));

  // 9. HRV
  factors.push(assessHRV(opts.wearableData, opts.wearableHistory));

  // 10. Soreness
  factors.push(assessSoreness(opts.quickLogs));

  // Redistribute weights from unavailable factors to available ones
  const availableFactors = factors.filter(f => f.available);
  const unavailableWeight = factors
    .filter(f => !f.available)
    .reduce((sum, f) => sum + f.weight, 0);

  if (availableFactors.length > 0 && unavailableWeight > 0) {
    const totalAvailableWeight = availableFactors.reduce((sum, f) => sum + f.weight, 0);
    for (const f of availableFactors) {
      f.weight += (f.weight / totalAvailableWeight) * unavailableWeight;
    }
  }

  // Calculate weighted overall score
  let overall = 0;
  let totalWeight = 0;
  for (const f of factors) {
    if (f.available) {
      overall += f.score * f.weight;
      totalWeight += f.weight;
    }
  }
  overall = totalWeight > 0 ? Math.round(overall / totalWeight) : 70;

  // ── Critical limiter cap ──────────────────────────────────────────────
  // First principles: a single red-zone factor should override a "peak" signal.
  // If you trained 9 sessions this week, it doesn't matter that you slept 9 hours —
  // the overall score should NOT say "all green, push today."
  const worstAvailableFactor = factors
    .filter(f => f.available)
    .reduce((worst, f) => f.score < worst.score ? f : worst, { score: 100 } as ReadinessFactor);

  if (worstAvailableFactor.score < 40) {
    // Cap overall at 69 max — prevents "peak" or "good" when a factor is in crisis
    overall = Math.min(overall, 69);
  } else if (worstAvailableFactor.score < 50) {
    // Cap at 79 — prevents "peak" readiness
    overall = Math.min(overall, 79);
  }

  // Determine level
  const level = scoreToLevel(overall);

  // Volume & intensity modifiers based on readiness
  const { volumeModifier, intensityModifier } = getModifiers(overall);

  // Generate recommendations based on low-scoring factors
  for (const f of factors.filter(f => f.available && f.score < 50)) {
    const rec = getRecommendation(f);
    if (rec) recommendations.push(rec);
  }

  // Critical warnings
  if (overall < 30) {
    recommendations.unshift('Consider a rest day or very light session — multiple recovery factors are compromised');
  }

  return { overall, level, factors, volumeModifier, intensityModifier, recommendations };
}

// ── Factor Assessments ──────────────────────────────────────────────────

function assessSleep(
  wearable: WearableData | null,
  checkIn?: PreWorkoutCheckIn,
  quickLogs?: QuickLog[]
): ReadinessFactor {
  const base: ReadinessFactor = {
    source: 'sleep',
    label: 'Sleep',
    score: 70,
    weight: DEFAULT_WEIGHTS.sleep,
    available: false,
  };

  // Priority: Wearable > PreCheckIn > QuickLogs
  if (wearable?.sleepHours != null) {
    base.available = true;
    const hours = wearable.sleepHours;
    const quality = wearable.sleepScore ?? 50;
    const deepSleep = wearable.deepSleepMinutes ?? 0;
    const rem = wearable.remSleepMinutes ?? 0;
    const efficiency = wearable.sleepEfficiency ?? 80;

    // Hours score: <5h=15, 5h=30, 6h=50, 7h=75, 8h=95, 9+=100
    const hoursScore = Math.min(100, Math.max(0, (hours - 4) * 20));

    // Deep sleep: <20min=30, 30min=50, 45min=70, 60min=85, 90min+=100
    // Deep sleep is when GH is secreted (Dattilo 2011) — critical for muscle repair
    const deepScore = deepSleep > 0 ? Math.min(100, Math.max(0, (deepSleep - 10) * 1.5)) : 60;

    // REM: important for neural recovery (motor pattern consolidation)
    const remScore = rem > 0 ? Math.min(100, Math.max(0, (rem - 20) * 1.2)) : 60;

    // Efficiency: <70%=20, 80%=50, 85%=70, 90%+=90
    const effScore = Math.min(100, Math.max(0, (efficiency - 60) * 2.5));

    // Weighted combination: hours matter most, deep sleep second
    base.score = Math.round(hoursScore * 0.35 + deepScore * 0.25 + remScore * 0.15 + effScore * 0.1 + (quality / 100) * 15);

    // Sleep debt: check sleep needed vs actual
    if (wearable.sleepNeededHours != null && hours < wearable.sleepNeededHours - 1.5) {
      base.score = Math.max(15, base.score - 20);
      base.detail = `${Math.abs(wearable.sleepNeededHours - hours).toFixed(1)}h sleep debt`;
    } else {
      base.detail = `${hours.toFixed(1)}h sleep, ${deepSleep}min deep`;
    }
  } else if (checkIn?.sleepHours != null) {
    base.available = true;
    const hours = checkIn.sleepHours;
    const quality = checkIn.sleepQuality; // 1-5
    const hoursScore = Math.min(100, Math.max(0, (hours - 4) * 20));
    const qualityScore = (quality / 5) * 100;
    base.score = Math.round(hoursScore * 0.6 + qualityScore * 0.4);
    base.detail = `${hours}h, quality ${quality}/5`;
  } else if (quickLogs) {
    const sleepLog = quickLogs
      .filter(l => l.type === 'sleep')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    if (sleepLog) {
      base.available = true;
      const hours = Number(sleepLog.value) || 7;
      base.score = Math.min(100, Math.max(0, (hours - 4) * 20));
      base.detail = `${hours}h (quick log)`;
    }
  }

  return base;
}

function assessNutrition(
  meals: MealEntry[],
  targets: MacroTargets,
  user: UserProfile | null
): ReadinessFactor {
  const base: ReadinessFactor = {
    source: 'nutrition',
    label: 'Nutrition',
    score: 70,
    weight: DEFAULT_WEIGHTS.nutrition,
    available: false,
  };

  // Check yesterday's nutrition (today might not be complete)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  const dayMeals = meals.filter(m => {
    const mDate = new Date(m.date).toISOString().split('T')[0];
    return mDate === dateStr;
  });

  if (dayMeals.length === 0 && targets.calories === 0) return base;
  if (dayMeals.length === 0) return base;

  base.available = true;

  const totalCals = dayMeals.reduce((s, m) => s + m.calories, 0);
  const totalProtein = dayMeals.reduce((s, m) => s + m.protein, 0);

  // Calorie adherence: within ±15% of target = 100, ±30% = 60
  let calScore = 70;
  if (targets.calories > 0) {
    const calRatio = totalCals / targets.calories;
    if (calRatio >= 0.85 && calRatio <= 1.15) calScore = 100;
    else if (calRatio >= 0.70 && calRatio <= 1.30) calScore = 70;
    else calScore = 40;
  }

  // Protein score: target 1.6-2.2g/kg for resistance training (Schoenfeld & Aragon 2018)
  let proteinScore = 70;
  const weightKg = user?.heightCm
    ? estimateWeightFromHeight(user.heightCm, user.sex)
    : 80;
  const proteinPerKg = totalProtein / weightKg;

  if (proteinPerKg >= 2.0) proteinScore = 100;
  else if (proteinPerKg >= 1.6) proteinScore = 85;
  else if (proteinPerKg >= 1.2) proteinScore = 60;
  else proteinScore = 35;

  // Meal frequency: 3+ meals = good protein distribution
  const mealFreqScore = dayMeals.length >= 4 ? 100 : dayMeals.length >= 3 ? 80 : 50;

  base.score = Math.round(calScore * 0.3 + proteinScore * 0.5 + mealFreqScore * 0.2);
  base.detail = `${totalProtein}g protein (${proteinPerKg.toFixed(1)}g/kg), ${totalCals} kcal`;

  return base;
}

function assessStress(checkIn?: PreWorkoutCheckIn, quickLogs?: QuickLog[]): ReadinessFactor {
  const base: ReadinessFactor = {
    source: 'stress',
    label: 'Stress',
    score: 70,
    weight: DEFAULT_WEIGHTS.stress,
    available: false,
  };

  if (checkIn?.stress != null) {
    base.available = true;
    // Stress 1-5: 1=no stress (100), 3=moderate (60), 5=severe (10)
    // Stults-Kolehmainen & Sinha 2014: high stress impairs muscle recovery by ~20%
    base.score = Math.round(110 - (checkIn.stress * 22));
    base.detail = `Stress ${checkIn.stress}/5`;
  } else if (quickLogs) {
    const stressLog = quickLogs
      .filter(l => l.type === 'energy' || l.type === 'readiness')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    if (stressLog) {
      base.available = true;
      const val = Number(stressLog.value) || 3;
      base.score = Math.round(val * 20);
      base.detail = `Readiness ${val}/5`;
    }
  }

  return base;
}

function assessRecovery(wearable: WearableData | null): ReadinessFactor {
  const base: ReadinessFactor = {
    source: 'recovery',
    label: 'Wearable Recovery',
    score: 70,
    weight: DEFAULT_WEIGHTS.recovery,
    available: false,
  };

  if (wearable?.recoveryScore != null) {
    base.available = true;
    base.score = wearable.recoveryScore;
    base.detail = `${wearable.recoveryScore}% recovery`;
  }

  return base;
}

function assessInjury(injuries: InjuryEntry[]): ReadinessFactor {
  const base: ReadinessFactor = {
    source: 'injury',
    label: 'Injury Status',
    score: 100,
    weight: DEFAULT_WEIGHTS.injury,
    available: true, // always available — absence of injuries = 100
  };

  const active = injuries.filter(i => !i.resolved);
  if (active.length === 0) {
    base.detail = 'No active injuries';
    return base;
  }

  // Each injury reduces score based on severity
  // Severity 1-2: minor (−10 each), 3: moderate (−20), 4-5: severe (−30 each)
  let penalty = 0;
  for (const inj of active) {
    if (inj.severity <= 2) penalty += 10;
    else if (inj.severity === 3) penalty += 20;
    else penalty += 30;
  }

  base.score = Math.max(0, 100 - penalty);
  base.detail = `${active.length} active injur${active.length === 1 ? 'y' : 'ies'}`;

  return base;
}

function assessTrainingLoad(logs: WorkoutLog[], sessions: TrainingSession[]): ReadinessFactor {
  const base: ReadinessFactor = {
    source: 'training_load',
    label: 'Training Load',
    score: 70,
    weight: DEFAULT_WEIGHTS.training_load,
    available: false,
  };

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const weekLogs = logs.filter(l => new Date(l.date) >= oneWeekAgo);
  const weekSessions = sessions.filter(s => new Date(s.date) >= oneWeekAgo);

  if (weekLogs.length === 0 && weekSessions.length === 0) return base;

  base.available = true;

  const totalSessions = weekLogs.length + weekSessions.length;
  // Sweet spot is 4-6 sessions/week; Gabbett 2016 ACWR considerations
  if (totalSessions <= 2) {
    base.score = 90; // Undertrained but not risky
    base.detail = `${totalSessions} sessions — room for more`;
  } else if (totalSessions <= 6) {
    base.score = 85 + (6 - totalSessions) * 3; // 85-100
    base.detail = `${totalSessions} sessions — optimal zone`;
  } else if (totalSessions <= 8) {
    base.score = 60;
    base.detail = `${totalSessions} sessions — elevated load`;
  } else {
    base.score = 35;
    base.detail = `${totalSessions} sessions — very high load`;
  }

  // Check consecutive days (residual fatigue accumulation)
  const allDates = [
    ...weekLogs.map(l => new Date(l.date).toISOString().split('T')[0]),
    ...weekSessions.map(s => new Date(s.date).toISOString().split('T')[0]),
  ];
  const uniqueDates = Array.from(new Set(allDates)).sort().reverse();
  let consecutive = 0;
  const today = new Date().toISOString().split('T')[0];
  for (let i = 0; i < uniqueDates.length; i++) {
    const expected = new Date();
    expected.setDate(expected.getDate() - i);
    if (uniqueDates[i] === expected.toISOString().split('T')[0]) {
      consecutive++;
    } else break;
  }
  if (consecutive >= 4) {
    base.score = Math.max(20, base.score - consecutive * 8);
    base.detail += `, ${consecutive} days straight`;
  }

  return base;
}

function assessHydration(waterLog: Record<string, number>): ReadinessFactor {
  const base: ReadinessFactor = {
    source: 'hydration',
    label: 'Hydration',
    score: 70,
    weight: DEFAULT_WEIGHTS.hydration,
    available: false,
  };

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];
  const glasses = waterLog[dateStr];

  if (glasses == null) return base;

  base.available = true;
  // 8 glasses ≈ 2L is baseline; athletes need 10-12+
  if (glasses >= 10) base.score = 100;
  else if (glasses >= 8) base.score = 85;
  else if (glasses >= 6) base.score = 65;
  else if (glasses >= 4) base.score = 45;
  else base.score = 25;

  base.detail = `${glasses} glasses yesterday`;

  return base;
}

function assessAge(user: UserProfile | null): ReadinessFactor {
  const base: ReadinessFactor = {
    source: 'age',
    label: 'Age Factor',
    score: 85,
    weight: DEFAULT_WEIGHTS.age,
    available: false,
  };

  if (!user?.age) return base;

  base.available = true;
  const age = user.age;

  // Fell & Williams 2008: masters athletes (40+) need ~20-40% more recovery time
  // Recovery capacity model: peaks at 18-25, gradual decline after 30
  if (age < 25) base.score = 95;
  else if (age < 30) base.score = 90;
  else if (age < 35) base.score = 85;
  else if (age < 40) base.score = 78;
  else if (age < 45) base.score = 70;
  else if (age < 50) base.score = 62;
  else if (age < 55) base.score = 55;
  else base.score = 48;

  base.detail = `Age ${age} — ${age >= 40 ? 'extended recovery needed' : 'normal recovery capacity'}`;

  return base;
}

function assessHRV(
  latest: WearableData | null,
  history: WearableData[]
): ReadinessFactor {
  const base: ReadinessFactor = {
    source: 'hrv',
    label: 'HRV',
    score: 70,
    weight: DEFAULT_WEIGHTS.hrv,
    available: false,
  };

  if (latest?.hrv == null) return base;

  base.available = true;
  const currentHRV = latest.hrv;

  // Calculate rolling baseline from history (SWC = Smallest Worthwhile Change)
  // Kiviniemi 2007: HRV-guided training leads to better outcomes
  if (history.length >= 3) {
    const hrvValues = history
      .filter(d => d.hrv != null)
      .map(d => d.hrv!);

    if (hrvValues.length >= 3) {
      const mean = hrvValues.reduce((s, v) => s + v, 0) / hrvValues.length;
      const stdDev = Math.sqrt(
        hrvValues.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / hrvValues.length
      );
      const cv = (stdDev / mean) * 100;

      // SWC: ±0.5 SD from baseline
      const swc = stdDev * 0.5;
      const deviation = currentHRV - mean;

      if (deviation > swc) {
        // Above baseline — parasympathetic dominance → ready to train
        base.score = Math.min(100, 75 + Math.round((deviation / stdDev) * 15));
        base.detail = `HRV ${currentHRV}ms (+${deviation.toFixed(0)} above baseline)`;
      } else if (deviation < -swc) {
        // Below baseline — sympathetic dominance → reduce load
        base.score = Math.max(20, 65 + Math.round((deviation / stdDev) * 15));
        base.detail = `HRV ${currentHRV}ms (${deviation.toFixed(0)} below baseline)`;
      } else {
        base.score = 70;
        base.detail = `HRV ${currentHRV}ms (within normal range)`;
      }

      // CV > 15% = overreaching signal (Plews et al. 2013)
      if (cv > 15) {
        base.score = Math.max(20, base.score - 15);
        base.detail += ` | CV ${cv.toFixed(0)}% (instability)`;
      }

      return base;
    }
  }

  // No baseline — use absolute HRV values (less accurate, population-based)
  if (currentHRV > 80) base.score = 90;
  else if (currentHRV > 60) base.score = 75;
  else if (currentHRV > 40) base.score = 55;
  else base.score = 35;

  base.detail = `HRV ${currentHRV}ms (no baseline yet)`;

  return base;
}

function assessSoreness(quickLogs: QuickLog[]): ReadinessFactor {
  const base: ReadinessFactor = {
    source: 'soreness',
    label: 'Soreness',
    score: 90,
    weight: DEFAULT_WEIGHTS.soreness,
    available: false,
  };

  // Find the most recent soreness log (from today or yesterday)
  const sorenessLogs = quickLogs
    .filter(l => l.type === 'soreness')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (sorenessLogs.length === 0) return base;

  // Only consider logs from the last 36 hours
  const cutoff = Date.now() - 36 * 60 * 60 * 1000;
  const recent = sorenessLogs.find(l => new Date(l.timestamp).getTime() >= cutoff);
  if (!recent) return base;

  base.available = true;
  const value = String(recent.value);

  if (value === 'none' || value === '') {
    base.score = 100;
    base.detail = 'No soreness reported';
    return base;
  }

  // Parse "area:severity,area:severity" format
  const entries = value.split(',').map(e => {
    const [area, severity] = e.split(':');
    return { area: area?.trim(), severity: severity?.trim() };
  }).filter(e => e.area && e.severity);

  if (entries.length === 0) {
    base.score = 95;
    base.detail = 'Minimal soreness';
    return base;
  }

  const severeCount = entries.filter(e => e.severity === 'severe').length;
  const moderateCount = entries.filter(e => e.severity === 'moderate').length;
  const mildCount = entries.filter(e => e.severity === 'mild').length;

  // Score: each severe area = -18pts, moderate = -10pts, mild = -4pts
  let penalty = severeCount * 18 + moderateCount * 10 + mildCount * 4;
  // Cap the penalty — you can't go below 10
  penalty = Math.min(penalty, 90);
  base.score = Math.max(10, 100 - penalty);

  // Build detail string
  const parts: string[] = [];
  if (severeCount > 0) parts.push(`${severeCount} severe`);
  if (moderateCount > 0) parts.push(`${moderateCount} moderate`);
  if (mildCount > 0) parts.push(`${mildCount} mild`);
  const areaNames = entries.slice(0, 3).map(e =>
    e.area!.replace(/_/g, ' ')
  );
  base.detail = `${parts.join(', ')} soreness (${areaNames.join(', ')}${entries.length > 3 ? '...' : ''})`;

  return base;
}

// ── Helpers ─────────────────────────────────────────────────────────────

function scoreToLevel(score: number): ReadinessLevel {
  if (score >= 85) return 'peak';
  if (score >= 70) return 'good';
  if (score >= 50) return 'moderate';
  if (score >= 30) return 'low';
  return 'critical';
}

function getModifiers(overall: number): { volumeModifier: number; intensityModifier: number } {
  // Peak (85-100): slight volume boost allowed
  if (overall >= 85) return { volumeModifier: 1.05, intensityModifier: 1.0 };
  // Good (70-84): normal prescription
  if (overall >= 70) return { volumeModifier: 1.0, intensityModifier: 1.0 };
  // Moderate (50-69): slight reduction
  if (overall >= 50) return { volumeModifier: 0.85, intensityModifier: 0.90 };
  // Low (30-49): significant reduction
  if (overall >= 30) return { volumeModifier: 0.70, intensityModifier: 0.80 };
  // Critical (<30): minimal training
  return { volumeModifier: 0.50, intensityModifier: 0.70 };
}

function getRecommendation(factor: ReadinessFactor): string | null {
  switch (factor.source) {
    case 'sleep':
      return factor.score < 40
        ? 'Sleep is critically low — prioritize 8+ hours tonight. Consider skipping hard training.'
        : 'Sleep was below optimal — aim for consistent 7-8 hour nights.';
    case 'nutrition':
      return factor.score < 40
        ? 'Protein intake is low — aim for 1.6-2.2g/kg bodyweight spread across 4+ meals.'
        : 'Nutrition needs attention — ensure adequate protein and caloric intake for recovery.';
    case 'stress':
      return 'Elevated stress impairs recovery by ~20% — consider meditation, walks, or lighter training today.';
    case 'recovery':
      return 'Wearable recovery is low — consider a technique/skill day instead of hard training.';
    case 'injury':
      return 'Active injuries present — follow return-to-training protocol and avoid aggravating movements.';
    case 'training_load':
      return factor.score < 40
        ? 'Training load is very high — take a rest day to prevent overtraining.'
        : 'Training load is elevated — monitor fatigue and consider a lighter session.';
    case 'hydration':
      return 'Hydration was low — dehydration impairs strength by 2-3% per 1% body mass lost.';
    case 'age':
      return 'Recovery takes longer with age — ensure adequate sleep and consider extra rest days.';
    case 'hrv':
      return 'HRV is below your baseline — your nervous system needs recovery. Reduce intensity today.';
    case 'soreness':
      return factor.score < 40
        ? 'Multiple areas are severely sore — consider a full rest day or light mobility work only.'
        : 'Significant soreness detected — consider swapping to a session that avoids sore muscle groups.';
  }
  return null;
}

function estimateWeightFromHeight(heightCm: number, sex?: 'male' | 'female'): number {
  // Rough BMI 22-24 estimate for athletic population
  const heightM = heightCm / 100;
  const bmi = sex === 'female' ? 22 : 23.5;
  return heightM * heightM * bmi;
}

/**
 * Get a quick readiness summary suitable for display in a dashboard card.
 * Returns null if there's insufficient data to compute readiness.
 */
export function getReadinessSummary(opts: Parameters<typeof calculateReadiness>[0]): {
  score: number;
  level: ReadinessLevel;
  topFactors: { label: string; score: number }[];
  allFactors: { source: string; label: string; score: number; detail?: string }[];
  volumeModifier: number;
  intensityModifier: number;
  topRecommendation: string | null;
} | null {
  const readiness = calculateReadiness(opts);
  const available = readiness.factors.filter(f => f.available);

  // Need at least 2 data sources for meaningful readiness
  if (available.length < 2) return null;

  return {
    score: readiness.overall,
    level: readiness.level,
    topFactors: available
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map(f => ({ label: f.label, score: f.score })),
    allFactors: available
      .sort((a, b) => a.score - b.score)
      .map(f => ({ source: f.source, label: f.label, score: f.score, detail: f.detail })),
    volumeModifier: readiness.volumeModifier,
    intensityModifier: readiness.intensityModifier,
    topRecommendation: readiness.recommendations[0] ?? null,
  };
}
