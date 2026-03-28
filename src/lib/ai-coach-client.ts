/**
 * AI Coach Client — Tier 1 engine
 *
 * Collects relevant data from the Zustand store and calls the AI coach API route.
 * Returns a typed coaching response. Falls back to the rule-based coach when the
 * API is unavailable or rate-limited.
 *
 * Usage (from a component):
 *   const store = useAppStore.getState();
 *   const result = await getAICoaching(store);
 *   if (result.source === 'ai') { ... } else { ... }
 */

import type {
  WorkoutLog,
  WearableData,
  InjuryEntry,
  UserProfile,
  MacroTargets,
  MealEntry,
  DietPhase,
} from './types';

// --- Types ---

export interface CoachingResponse {
  narrative: string;
  adjustments: string[];
  warnings: string[];
  motivation: string;
}

export interface AICoachResult {
  source: 'ai' | 'fallback';
  data: CoachingResponse;
  remaining?: number;
  error?: string;
}

/** Minimal slice of AppState needed — avoids importing the store directly */
export interface CoachDataSlice {
  user: UserProfile | null;
  workoutLogs: WorkoutLog[];
  meals: MealEntry[];
  macroTargets: MacroTargets | null;
  wearableHistory: WearableData[];
  injuryLog: InjuryEntry[];
  activeDietPhase: DietPhase | null;
  quickLogs: Array<{ type: string; date: string; value: number }>;
}

// --- Helpers ---

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function computeNutritionAdherence(
  meals: MealEntry[],
  targets: MacroTargets | null,
  days: number
): number | null {
  if (!targets || targets.calories === 0) return null;

  const cutoff = daysAgo(days);
  const recentMeals = meals.filter(m => {
    const d = new Date(m.date);
    return d >= cutoff && !('_deleted' in m && m._deleted);
  });

  if (recentMeals.length === 0) return null;

  // Group by date
  const byDate = new Map<string, { calories: number; protein: number }>();
  for (const meal of recentMeals) {
    const dateKey = new Date(meal.date).toISOString().slice(0, 10);
    const existing = byDate.get(dateKey) ?? { calories: 0, protein: 0 };
    existing.calories += meal.calories;
    existing.protein += meal.protein;
    byDate.set(dateKey, existing);
  }

  // Adherence = % of logged days within 15% of calorie target AND hitting 80%+ protein
  let adherentDays = 0;
  let totalDays = 0;
  byDate.forEach((totals) => {
    totalDays++;
    const calorieDelta = Math.abs(totals.calories - targets.calories) / targets.calories;
    const proteinRatio = totals.protein / targets.protein;
    if (calorieDelta <= 0.15 && proteinRatio >= 0.8) {
      adherentDays++;
    }
  });

  return Math.round((adherentDays / Math.max(totalDays, 1)) * 100);
}

function computeWearableAverages(
  wearableHistory: WearableData[],
  days: number
): {
  avgSleepScore: number | null;
  avgRecoveryScore: number | null;
  avgHRV: number | null;
  avgRestingHR: number | null;
} | null {
  const cutoff = daysAgo(days);
  const recent = wearableHistory.filter(w => new Date(w.date) >= cutoff);
  if (recent.length === 0) return null;

  const avg = (arr: (number | null)[]): number | null => {
    const valid = arr.filter((v): v is number => v !== null);
    return valid.length > 0 ? Math.round(valid.reduce((s, v) => s + v, 0) / valid.length) : null;
  };

  return {
    avgSleepScore: avg(recent.map(w => w.sleepScore)),
    avgRecoveryScore: avg(recent.map(w => w.recoveryScore)),
    avgHRV: avg(recent.map(w => w.hrv)),
    avgRestingHR: avg(recent.map(w => w.restingHR)),
  };
}

function computeReadinessScores(
  quickLogs: CoachDataSlice['quickLogs'],
  days: number
): Array<{ date: string; overall: number; level: string }> {
  const cutoff = daysAgo(days);
  const readinessLogs = quickLogs.filter(
    q => q.type === 'readiness' && new Date(q.date) >= cutoff
  );

  return readinessLogs.map(q => ({
    date: q.date,
    overall: q.value,
    level: q.value >= 80 ? 'good' : q.value >= 60 ? 'moderate' : q.value >= 40 ? 'low' : 'critical',
  }));
}

// --- Main Export ---

/**
 * Collect data from the store and call the AI coach endpoint.
 * Returns { source: 'ai', data } on success, or { source: 'fallback', data, error } on failure.
 *
 * The caller is responsible for providing the fallback data (from generateWeeklySummary)
 * when source === 'fallback'.
 */
export async function getAICoaching(
  state: CoachDataSlice
): Promise<AICoachResult> {
  const { user, workoutLogs, meals, macroTargets, wearableHistory, injuryLog, activeDietPhase, quickLogs } = state;

  // Build request payload
  const cutoff = daysAgo(7);

  const recentWorkouts = workoutLogs
    .filter(l => !l._deleted && new Date(l.date) >= cutoff)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(log => ({
      date: new Date(log.date).toISOString().slice(0, 10),
      exercises: log.exercises.map(ex => ({
        exerciseName: ex.exerciseName ?? ex.exerciseId,
        totalVolume: ex.sets.reduce((s, set) => s + (set.completed ? set.weight * set.reps : 0), 0),
        avgRPE: ex.sets.length > 0
          ? Math.round((ex.sets.reduce((s, set) => s + set.rpe, 0) / ex.sets.length) * 10) / 10
          : 0,
        sets: ex.sets.filter(s => s.completed).length,
        personalRecord: ex.personalRecord ?? false,
      })),
      totalVolume: log.totalVolume,
      overallRPE: log.overallRPE,
      soreness: log.soreness,
      energy: log.energy,
      duration: log.duration,
      completed: log.completed,
    }));

  const activeInjuries = injuryLog
    .filter(i => !i.resolved && !i._deleted)
    .map(i => ({
      bodyRegion: i.bodyRegion,
      severity: i.severity,
      painType: i.painType,
      resolved: i.resolved,
    }));

  const payload = {
    workouts: recentWorkouts,
    nutritionAdherence: computeNutritionAdherence(meals, macroTargets, 7),
    macroTargets: macroTargets ?? undefined,
    readinessScores: computeReadinessScores(quickLogs, 7),
    activeInjuries,
    goals: user ? {
      goalFocus: user.goalFocus,
      combatSport: user.combatSport,
      combatSports: user.combatSports,
      experienceLevel: user.experienceLevel,
      bodyWeightKg: user.bodyWeightKg,
      sessionsPerWeek: user.sessionsPerWeek,
    } : undefined,
    wearable: computeWearableAverages(wearableHistory, 7),
    activeDietPhase: activeDietPhase ? {
      goal: activeDietPhase.goal,
      targetRatePerWeek: activeDietPhase.targetRatePerWeek,
      weeksCompleted: activeDietPhase.weeksCompleted,
    } : undefined,
  };

  try {
    const response = await fetch('/api/ai-coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await response.json();

    if (!response.ok) {
      return {
        source: 'fallback',
        data: emptyCoachingResponse(),
        error: json.error ?? `HTTP ${response.status}`,
      };
    }

    return {
      source: 'ai',
      data: json.data as CoachingResponse,
      remaining: json.remaining,
    };
  } catch (err) {
    return {
      source: 'fallback',
      data: emptyCoachingResponse(),
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

function emptyCoachingResponse(): CoachingResponse {
  return {
    narrative: '',
    adjustments: [],
    warnings: [],
    motivation: '',
  };
}
