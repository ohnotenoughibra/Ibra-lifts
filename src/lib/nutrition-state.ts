/**
 * nutrition-state — build the resolver input from store state, in one place,
 * so every caller (hook, store actions, Home) feeds the resolver the same data.
 */
import type {
  BodyCompositionEntry, BodyWeightEntry, CompetitionEvent, DietPhase, IllnessLog, MacroTargets,
  MealEntry, Mesocycle, NutritionPrefs, TrainingSession, UserProfile, WearableData, WeightCutPlan, WorkoutLog,
} from './types';
import { resolveBase, type TargetsInput } from './nutrition-targets';
import { localDayKey } from './utils';

export interface NutritionStateSlice {
  user: UserProfile | null;
  macroTargets: MacroTargets;
  activeDietPhase?: DietPhase | null;
  nutritionPrefs?: NutritionPrefs | null;
  bodyWeightLog?: BodyWeightEntry[];
  bodyComposition?: BodyCompositionEntry[];
  meals?: MealEntry[];
  workoutLogs?: WorkoutLog[];
  trainingSessions?: TrainingSession[];
  currentMesocycle?: Mesocycle | null;
  competitions?: CompetitionEvent[];
  weightCutPlans?: WeightCutPlan[];
  latestWhoopData?: WearableData | null;
  illnessLogs?: IllnessLog[];
}

export function activeIllnessOf(logs: IllnessLog[] | undefined): IllnessLog | null {
  return (logs ?? []).find(i => !(i as { _deleted?: boolean })._deleted && (i.status === 'active' || i.status === 'recovering')) ?? null;
}

export function targetsInputFromState(s: NutritionStateSlice): TargetsInput {
  return {
    user: s.user,
    macroTargets: s.macroTargets,
    activeDietPhase: s.activeDietPhase ?? null,
    nutritionPrefs: s.nutritionPrefs ?? null,
    bodyWeightLog: s.bodyWeightLog ?? [],
    bodyComposition: s.bodyComposition ?? [],
    meals: s.meals ?? [],
    workoutLogs: s.workoutLogs ?? [],
    trainingSessions: s.trainingSessions ?? [],
    currentMesocycle: s.currentMesocycle ?? null,
    competitions: s.competitions ?? [],
    weightCutPlans: s.weightCutPlans ?? [],
    latestWhoopData: s.latestWhoopData ?? null,
    activeIllness: activeIllnessOf(s.illnessLogs),
  };
}

/**
 * In adaptive mode the weekly base IS the athlete's target, so the stored
 * `macroTargets` (read by readiness, trends, energy availability, the weekly
 * summary…) must follow it. Returns the new value when it drifted, else null.
 * Fixed / setup modes never write — there macroTargets is the source.
 */
export function adaptiveMacroTargetsUpdate(s: NutritionStateSlice, today: string = localDayKey()): MacroTargets | null {
  const b = resolveBase(targetsInputFromState(s), today);
  if (b.mode !== 'adaptive') return null;
  const cur = s.macroTargets;
  const same = cur && Math.abs(cur.calories - b.base.calories) < 15
    && Math.abs(cur.protein - b.base.protein) < 2 && Math.abs(cur.carbs - b.base.carbs) < 4 && Math.abs(cur.fat - b.base.fat) < 2;
  return same ? null : { calories: b.base.calories, protein: b.base.protein, carbs: b.base.carbs, fat: b.base.fat };
}
