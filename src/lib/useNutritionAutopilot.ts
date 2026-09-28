'use client';

/**
 * Keeps the stored macroTargets on the adaptive weekly base (see
 * nutrition-state adaptiveMacroTargetsUpdate). Runs after the first cloud
 * pull so it never writes over data another device already moved on.
 * The base is anchored to Monday, so this writes at most once a week unless
 * the goal, profile or mode changes.
 */
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from './store';
import { adaptiveMacroTargetsUpdate } from './nutrition-state';

export function useNutritionAutopilot(enabled: boolean) {
  const s = useAppStore(useShallow(st => ({
    user: st.user, macroTargets: st.macroTargets, activeDietPhase: st.activeDietPhase, nutritionPrefs: st.nutritionPrefs,
    bodyWeightLog: st.bodyWeightLog, bodyComposition: st.bodyComposition, meals: st.meals, workoutLogs: st.workoutLogs,
    trainingSessions: st.trainingSessions, competitions: st.competitions, isOnboarded: st.isOnboarded,
  })));
  const setMacroTargets = useAppStore(st => st.setMacroTargets);
  useEffect(() => {
    if (!enabled || !s.isOnboarded) return;
    const t = setTimeout(() => {
      const next = adaptiveMacroTargetsUpdate(useAppStore.getState());
      if (next) setMacroTargets(next);
    }, 1500); // let a burst of logging settle
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, s.isOnboarded, s.user, s.activeDietPhase, s.nutritionPrefs, s.bodyWeightLog, s.bodyComposition, s.meals, s.workoutLogs, s.trainingSessions]);
}
