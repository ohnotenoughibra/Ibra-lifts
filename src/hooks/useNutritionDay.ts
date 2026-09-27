'use client';

/**
 * useNutritionDay — everything the nutrition screens need for one day, from
 * the ONE resolver (lib/nutrition-targets). Raw store refs in the selector,
 * derived values in useMemo (a .filter() inside a useShallow selector returns
 * a fresh array every render and re-renders the whole screen on any change).
 */
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/lib/store';
import { resolveDailyTargets, DEFAULT_NUTRITION_PREFS, type DailyTargets } from '@/lib/nutrition-targets';
import { targetsInputFromState } from '@/lib/nutrition-state';
import { historyIndex } from '@/lib/food-search';
import { planSlots, redistribute, type SlotStatus } from '@/lib/meal-plan';
import { localDayKey, safeDayKey } from '@/lib/utils';
import type { MealEntry } from '@/lib/types';

export interface DayTotals { calories: number; protein: number; carbs: number; fat: number; fiber: number }

export function useNutritionDay(dayKey: string) {
  const s = useAppStore(useShallow(st => ({
    user: st.user,
    macroTargets: st.macroTargets,
    activeDietPhase: st.activeDietPhase,
    nutritionPrefs: st.nutritionPrefs,
    bodyWeightLog: st.bodyWeightLog,
    bodyComposition: st.bodyComposition,
    meals: st.meals,
    workoutLogs: st.workoutLogs,
    trainingSessions: st.trainingSessions,
    currentMesocycle: st.currentMesocycle,
    competitions: st.competitions,
    weightCutPlans: st.weightCutPlans,
    latestWhoopData: st.latestWhoopData,
    illnessLogs: st.illnessLogs,
    waterLog: st.waterLog,
    customFoods: st.customFoods,
  })));
  const prefs = useMemo(() => ({ ...DEFAULT_NUTRITION_PREFS, ...(s.nutritionPrefs ?? {}) }), [s.nutritionPrefs]);
  const today = localDayKey();

  const targets: DailyTargets = useMemo(
    () => resolveDailyTargets(targetsInputFromState(s), dayKey, today),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s.user, s.macroTargets, s.activeDietPhase, s.nutritionPrefs, s.bodyWeightLog, s.bodyComposition, s.meals,
      s.workoutLogs, s.trainingSessions, s.currentMesocycle, s.competitions, s.weightCutPlans, s.latestWhoopData,
      s.illnessLogs, dayKey, today],
  );

  const liveMeals = useMemo(() => (s.meals ?? []).filter(m => !m._deleted), [s.meals]);
  const dayMeals: MealEntry[] = useMemo(
    () => liveMeals.filter(m => safeDayKey(m.date) === dayKey)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [liveMeals, dayKey],
  );

  const totals: DayTotals = useMemo(() => {
    const t = dayMeals.reduce((a, m) => ({
      calories: a.calories + (m.calories || 0), protein: a.protein + (m.protein || 0),
      carbs: a.carbs + (m.carbs || 0), fat: a.fat + (m.fat || 0), fiber: a.fiber + (m.fiber || 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
    return {
      calories: Math.round(t.calories), protein: Math.round(t.protein), carbs: Math.round(t.carbs),
      fat: Math.round(t.fat), fiber: Math.round(t.fiber),
    };
  }, [dayMeals]);

  const remaining = useMemo(() => ({
    calories: Math.max(0, targets.calories - totals.calories),
    protein: Math.max(0, targets.protein - totals.protein),
    carbs: Math.max(0, targets.carbs - totals.carbs),
    fat: Math.max(0, targets.fat - totals.fat),
  }), [targets, totals]);

  const slots: SlotStatus[] = useMemo(() => {
    const now = new Date();
    const hhmm = dayKey < today ? '23:59' : dayKey > today ? '00:00'
      : `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return redistribute(planSlots(targets, prefs), dayMeals, hhmm);
  }, [targets, prefs, dayMeals, dayKey, today]);

  const history = useMemo(() => historyIndex(liveMeals), [liveMeals]);
  const recentMeals = useMemo(() => {
    const cutoff = Date.now() - 4 * 864e5;
    return liveMeals.filter(m => new Date(m.date).getTime() >= cutoff);
  }, [liveMeals]);
  const customFoods = useMemo(() => (s.customFoods ?? []).filter(f => !f._deleted), [s.customFoods]);

  const waterGlasses = s.waterLog?.[dayKey] ?? 0;

  return {
    dayKey, today, isToday: dayKey === today, isPast: dayKey < today,
    user: s.user, prefs, targets, meals: dayMeals, totals, remaining, slots,
    history, recentMeals, customFoods, waterGlasses, allMeals: liveMeals,
  };
}

export type NutritionDay = ReturnType<typeof useNutritionDay>;
