'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { MealEntry, MealType } from '@/lib/types';
import { getContextualNutrition, getSupplementRecommendations, type ContextualMacros } from '@/lib/contextual-nutrition';
import { calculateElectrolyteNeeds, getIntraTrainingFuel, assessHydrationStatus } from '@/lib/electrolyte-engine';
import { PRESET_FOODS, FOOD_DB, estimateLocally } from '@/lib/food-database';
import { toLocalDateStr } from '../lib/utils';

export type HistoryFood = {
  name: string;
  portion?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  count: number;
  lastUsed: number;
};

export type AutocompleteItem = HistoryFood & {
  source: 'history' | 'database' | 'preset';
  dayPattern?: string;
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function useNutrition(selectedDate: string) {
  const {
    user,
    meals,
    macroTargets,
    waterLog,
    addMeal,
    updateMeal,
    deleteMeal,
    setWaterGlasses: storeSetWater,
    bodyWeightLog,
    currentMesocycle,
    trainingSessions,
    latestWhoopData,
    workoutLogs,
    getActiveIllness,
    mealStamps,
    addMealStamp,
    deleteMealStamp,
    useMealStamp,
    copyYesterdayMeals,
    competitions,
    combatNutritionProfile,
  } = useAppStore(
    useShallow(s => ({
      user: s.user,
      meals: s.meals.filter(m => !m._deleted),
      macroTargets: s.macroTargets,
      waterLog: s.waterLog,
      addMeal: s.addMeal,
      updateMeal: s.updateMeal,
      deleteMeal: s.deleteMeal,
      setWaterGlasses: s.setWaterGlasses,
      bodyWeightLog: s.bodyWeightLog.filter(e => !e._deleted),
      currentMesocycle: s.currentMesocycle,
      trainingSessions: s.trainingSessions,
      latestWhoopData: s.latestWhoopData,
      workoutLogs: s.workoutLogs,
      getActiveIllness: s.getActiveIllness,
      mealStamps: s.mealStamps.filter(st => !st._deleted),
      addMealStamp: s.addMealStamp,
      deleteMealStamp: s.deleteMealStamp,
      useMealStamp: s.useMealStamp,
      copyYesterdayMeals: s.copyYesterdayMeals,
      competitions: s.competitions,
      combatNutritionProfile: s.combatNutritionProfile,
    }))
  );

  const activeIllness = useMemo(() => getActiveIllness(), [getActiveIllness]);
  const todayStr = toLocalDateStr();
  const isToday = selectedDate === todayStr;

  // Water
  const waterGlasses = waterLog[selectedDate] || 0;
  const setWaterGlasses = (val: number) => storeSetWater(selectedDate, val);

  // Body weight
  const latestWeight = bodyWeightLog.length > 0 ? bodyWeightLog[bodyWeightLog.length - 1] : null;
  const bodyWeightLbs = latestWeight
    ? (latestWeight?.unit === 'lbs' ? latestWeight.weight : latestWeight.weight * 2.205)
    : 175;
  const bodyWeightKg = bodyWeightLbs / 2.205;

  // Today's session from workout logs
  const todaySession = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLog = workoutLogs.find(log => {
      const logDate = new Date(log.date);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === today.getTime();
    });
    if (!todayLog || !currentMesocycle) return null;
    for (const week of currentMesocycle.weeks) {
      const session = week.sessions.find(s => s.id === todayLog.sessionId);
      if (session) return session;
    }
    return null;
  }, [workoutLogs, currentMesocycle]);

  const todayTraining = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return trainingSessions.filter(s => {
      const sDate = new Date(s.date);
      sDate.setHours(0, 0, 0, 0);
      return sDate.getTime() === today.getTime();
    });
  }, [trainingSessions]);

  // Competition context
  const nearestComp = useMemo(() => {
    const now = Date.now();
    return (competitions || [])
      .filter(c => new Date(c.date).getTime() > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] || null;
  }, [competitions]);
  const daysToComp = nearestComp
    ? Math.ceil((new Date(nearestComp.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : undefined;

  // Contextual nutrition
  const contextualNutrition = useMemo<ContextualMacros>(() => {
    return getContextualNutrition(
      macroTargets,
      bodyWeightLbs,
      todaySession,
      todayTraining,
      latestWhoopData,
      user,
      activeIllness,
      daysToComp != null ? { daysToCompetition: daysToComp } : undefined,
    );
  }, [macroTargets, bodyWeightLbs, todaySession, todayTraining, latestWhoopData, user, activeIllness, daysToComp]);

  const supplements = useMemo(() => {
    return getSupplementRecommendations(contextualNutrition.dayType);
  }, [contextualNutrition.dayType]);

  // Electrolytes
  const trainingDuration = todayTraining.reduce((sum, s) => sum + s.duration, 0);
  const electrolyteInfo = useMemo(() => {
    if (trainingDuration < 30) return null;
    const sessionType = todayTraining[0]?.type || 'other';
    return calculateElectrolyteNeeds(bodyWeightKg, sessionType, trainingDuration, 'moderate');
  }, [bodyWeightKg, trainingDuration, todayTraining]);

  const intraFuel = useMemo(() => {
    if (trainingDuration < 60) return null;
    const sessionType = todayTraining[0]?.type || 'other';
    const isInCut = combatNutritionProfile?.nutritionGoal === 'fight_prep' || combatNutritionProfile?.nutritionGoal === 'move_down';
    return getIntraTrainingFuel(trainingDuration, sessionType, !!isInCut, bodyWeightKg);
  }, [trainingDuration, todayTraining, combatNutritionProfile?.nutritionGoal, bodyWeightKg]);

  // Hydration status
  const hydrationStatus = useMemo(() => {
    const glasses = waterLog[selectedDate] || 0;
    const intakeMl = glasses * 250;
    const targetMl = contextualNutrition.hydrationGoal || 3000;
    if (intakeMl === 0) return null;
    return assessHydrationStatus(intakeMl, targetMl);
  }, [waterLog, selectedDate, contextualNutrition.hydrationGoal]);

  // Collagen nudge
  const collagenNudge = useMemo(() => {
    if (user?.trainingIdentity !== 'combat') return null;
    const grapplingTypes = ['bjj_gi', 'bjj_nogi', 'wrestling', 'judo', 'sambo', 'mma'];
    const hasGrappling = todayTraining.some(s => grapplingTypes.includes(s.type));
    if (!hasGrappling && !todaySession) return null;
    return {
      dose: '15-20g collagen + 50mg vitamin C',
      timing: '30-60 min before training',
      reason: 'Supports tendon/ligament adaptation — critical for grappling load',
    };
  }, [user?.trainingIdentity, todayTraining, todaySession]);

  // Today's meals + totals
  // Use local date comparison (not UTC) so timezone doesn't shift meals to wrong day
  const todayMeals = useMemo(
    () => meals.filter(m => {
      const d = new Date(m.date);
      const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return localDate === selectedDate;
    }),
    [meals, selectedDate]
  );

  const totals = useMemo(() => {
    const raw = todayMeals.reduce(
      (acc, m) => ({
        calories: acc.calories + m.calories,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fat: acc.fat + m.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
    return {
      calories: Math.round(raw.calories),
      protein: +raw.protein.toFixed(1),
      carbs: +raw.carbs.toFixed(1),
      fat: +raw.fat.toFixed(1),
    };
  }, [todayMeals]);

  const targets = contextualNutrition.adjustedTargets;

  const remaining = useMemo(() => ({
    calories: Math.max(targets.calories - totals.calories, 0),
    protein: Math.max(targets.protein - totals.protein, 0),
    carbs: Math.max(targets.carbs - totals.carbs, 0),
    fat: Math.max(targets.fat - totals.fat, 0),
  }), [targets, totals]);

  // Meal history index
  const mealHistoryIndex = useMemo(() => {
    const index = new Map<string, HistoryFood>();
    meals.forEach(m => {
      const key = m.name.toLowerCase().trim();
      const existing = index.get(key);
      const ts = new Date(m.date).getTime();
      if (!existing || ts > existing.lastUsed) {
        index.set(key, {
          name: m.name,
          portion: m.portion || existing?.portion,
          calories: m.calories,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
          count: (existing?.count || 0) + 1,
          lastUsed: ts,
        });
      } else {
        existing.count++;
      }
    });
    return index;
  }, [meals]);

  // Day-of-week patterns
  const todayDow = new Date().getDay();
  const dayOfWeekPatterns = useMemo(() => {
    const patterns = new Map<string, Map<number, { dayCount: number; lastUsed: number }>>();
    meals.forEach(m => {
      const key = m.name.toLowerCase().trim();
      const d = new Date(m.date);
      const dow = d.getDay();
      const ts = d.getTime();
      if (!patterns.has(key)) patterns.set(key, new Map());
      const dayMap = patterns.get(key)!;
      const existing = dayMap.get(dow);
      dayMap.set(dow, {
        dayCount: (existing?.dayCount || 0) + 1,
        lastUsed: Math.max(ts, existing?.lastUsed || 0),
      });
    });
    return patterns;
  }, [meals]);

  const todayPatternMeals = useMemo(() => {
    const results: Array<HistoryFood & { dayCount: number; dayName: string }> = [];
    dayOfWeekPatterns.forEach((dayMap, mealKey) => {
      const pattern = dayMap.get(todayDow);
      if (pattern && pattern.dayCount >= 2) {
        const historyEntry = mealHistoryIndex.get(mealKey);
        if (historyEntry) {
          results.push({ ...historyEntry, dayCount: pattern.dayCount, dayName: DAY_NAMES[todayDow] });
        }
      }
    });
    return results.sort((a, b) => b.dayCount - a.dayCount || b.lastUsed - a.lastUsed);
  }, [dayOfWeekPatterns, todayDow, mealHistoryIndex]);

  // Favorite foods (top 8 most frequent, recency-boosted)
  const favoriteFoods = useMemo(() => {
    const now = Date.now();
    return Array.from(mealHistoryIndex.values())
      .filter(f => f.count >= 1)
      .sort((a, b) => {
        const recencyA = (now - a.lastUsed) < 14 * 86400000 ? 3 : 0;
        const recencyB = (now - b.lastUsed) < 14 * 86400000 ? 3 : 0;
        return (b.count + recencyB) - (a.count + recencyA);
      })
      .slice(0, 8);
  }, [mealHistoryIndex]);

  // Autocomplete search
  const searchFoods = (query: string): AutocompleteItem[] => {
    const q = query.toLowerCase().trim();
    if (q.length < 1) return [];

    const patternKeys = new Set(todayPatternMeals.map(p => p.name.toLowerCase()));

    const fuzzyMatch = (text: string, qry: string) => {
      const lower = text.toLowerCase();
      if (lower.includes(qry)) return true;
      const words = lower.split(/[\s,()-]+/);
      return words.some(w => w.startsWith(qry));
    };

    const historyMatches = Array.from(mealHistoryIndex.values())
      .filter(f => fuzzyMatch(f.name, q))
      .sort((a, b) => {
        const aPattern = patternKeys.has(a.name.toLowerCase()) ? 100 : 0;
        const bPattern = patternKeys.has(b.name.toLowerCase()) ? 100 : 0;
        return (bPattern + b.count) - (aPattern + a.count);
      })
      .slice(0, 5)
      .map(f => ({
        ...f,
        source: 'history' as const,
        dayPattern: patternKeys.has(f.name.toLowerCase()) ? `Every ${DAY_NAMES[todayDow]}` : undefined,
      }));

    const historyNames = new Set(historyMatches.map(h => h.name.toLowerCase()));
    const dbMatches = FOOD_DB
      .filter(f => f.keywords.some(kw => kw.startsWith(q) || kw.includes(q) || q.includes(kw)) || fuzzyMatch(f.name, q))
      .filter(f => !historyNames.has(f.name.toLowerCase()))
      .slice(0, 8)
      .map(f => ({ ...f, portion: undefined, count: 0, lastUsed: 0, source: 'database' as const, dayPattern: undefined as string | undefined }));

    const usedNames = new Set(Array.from(historyNames).concat(dbMatches.map(d => d.name.toLowerCase())));
    const presetMatches = PRESET_FOODS
      .filter(p => fuzzyMatch(p.name, q) && !usedNames.has(p.name.toLowerCase()))
      .slice(0, 3)
      .map(p => ({ ...p, portion: undefined, count: 0, lastUsed: 0, source: 'preset' as const, dayPattern: undefined as string | undefined }));

    return [...historyMatches, ...dbMatches, ...presetMatches].slice(0, 12);
  };

  // Estimate food from text
  const estimateFood = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return null;

    const historyMatch = mealHistoryIndex.get(trimmed.toLowerCase());
    if (historyMatch) return { ...historyMatch, source: 'From your history' };

    const partialMatch = Array.from(mealHistoryIndex.values())
      .filter(f => f.name.toLowerCase().includes(trimmed.toLowerCase()))
      .sort((a, b) => b.count - a.count)[0];
    if (partialMatch) return { ...partialMatch, source: 'From your history' };

    const local = estimateLocally(trimmed);
    if (local) return { ...local, count: 0, lastUsed: 0, source: 'Food database' };

    return null;
  };

  // Auto-detect meal type based on time
  const autoMealType = (): MealType => {
    const h = new Date().getHours();
    return h < 10 ? 'breakfast' : h < 14 ? 'lunch' : h < 17 ? 'snack' : 'dinner';
  };

  // Yesterday's meals check
  const yesterdayStr = useMemo(() => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [selectedDate]);

  const yesterdayMeals = useMemo(
    () => meals.filter(m => {
      const d = new Date(m.date);
      const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return localDate === yesterdayStr;
    }),
    [meals, yesterdayStr]
  );

  return {
    // Store data
    user,
    meals: todayMeals,
    allMeals: meals,
    macroTargets,
    mealStamps,
    waterGlasses,
    // Computed
    totals,
    targets,
    remaining,
    contextualNutrition,
    supplements,
    electrolyteInfo,
    intraFuel,
    hydrationStatus,
    collagenNudge,
    bodyWeightLbs,
    bodyWeightKg,
    trainingDuration,
    todayTraining,
    isToday,
    todayStr,
    favoriteFoods,
    todayPatternMeals,
    yesterdayMeals,
    mealHistoryIndex,
    // Functions
    searchFoods,
    estimateFood,
    autoMealType,
    setWaterGlasses,
    addMeal,
    updateMeal,
    deleteMeal,
    addMealStamp,
    deleteMealStamp,
    useMealStamp,
    copyYesterdayMeals,
  };
}
