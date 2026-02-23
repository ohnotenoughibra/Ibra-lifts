'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import {
  Apple,
  Droplets,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Flame,
  Beef,
  Wheat,
  Droplet,
  Zap,
  Cookie,
  Egg,
  Fish,
  Milk,
  Salad,
  Trash2,
  AlertCircle,
  Sparkles,
  Clock,
  Target,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Shield,
  Star,
  ArrowRightLeft,
  Pencil,
  Check,
} from 'lucide-react';
import { MealType, MealEntry } from '@/lib/types';
import { getContextualNutrition, getSupplementRecommendations, type ContextualMacros } from '@/lib/contextual-nutrition';
import { calculateElectrolyteNeeds, getIntraTrainingFuel, assessHydrationStatus } from '@/lib/electrolyte-engine';
import { PRESET_FOODS, FOOD_DB, estimateLocally } from '@/lib/food-database';
import { cn } from '@/lib/utils';
import DietCoach from './DietCoach';
import SupplementTracker from './SupplementTracker';
import NutritionTrends from './NutritionTrends';

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  pre_workout: 'Pre-Workout',
  post_workout: 'Post-Workout',
};

const MEAL_TYPE_ICONS: Record<MealType, React.ReactNode> = {
  breakfast: <Egg className="w-4 h-4" />,
  lunch: <Salad className="w-4 h-4" />,
  dinner: <Beef className="w-4 h-4" />,
  snack: <Cookie className="w-4 h-4" />,
  pre_workout: <Zap className="w-4 h-4" />,
  post_workout: <Milk className="w-4 h-4" />,
};

const MEAL_TYPE_ORDER: MealType[] = [
  'breakfast',
  'pre_workout',
  'lunch',
  'snack',
  'post_workout',
  'dinner',
];

// ── Circular progress ring ──────────────────────────────────────────────────
function MacroRing({
  label,
  current,
  target,
  unit,
  color,
  size = 80,
  strokeWidth = 6,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(current / target, 1);
  const offset = circumference - progress * circumference;
  const isOver = current > target;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-grappler-700/50"
            strokeWidth={strokeWidth}
          />
          {/* Progress ring */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={isOver ? '#ef4444' : color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`text-sm font-bold ${isOver ? 'text-red-400' : 'text-grappler-50'}`}
          >
            {current}
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-grappler-200">{label}</p>
        <p className="text-xs text-grappler-400">
          / {target}
          {unit}
        </p>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
interface NutritionTrackerProps {
  onClose: () => void;
}

export default function NutritionTracker({ onClose }: NutritionTrackerProps) {
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
  } = useAppStore(
    useShallow(s => ({
      user: s.user,
      meals: s.meals,
      macroTargets: s.macroTargets,
      waterLog: s.waterLog,
      addMeal: s.addMeal,
      updateMeal: s.updateMeal,
      deleteMeal: s.deleteMeal,
      setWaterGlasses: s.setWaterGlasses,
      bodyWeightLog: s.bodyWeightLog,
      currentMesocycle: s.currentMesocycle,
      trainingSessions: s.trainingSessions,
      latestWhoopData: s.latestWhoopData,
      workoutLogs: s.workoutLogs,
      getActiveIllness: s.getActiveIllness,
    }))
  );

  const activeIllness = useMemo(() => getActiveIllness(), [getActiveIllness]);

  // ── Selected date (allows logging for past days) ──
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;
  const isFuture = selectedDate > todayStr;

  const navigateDate = (direction: -1 | 1) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + direction);
    const newStr = d.toISOString().split('T')[0];
    if (newStr <= todayStr) setSelectedDate(newStr);
  };

  // ── Derived state from store ──
  const waterGlasses = waterLog[selectedDate] || 0;
  const setWaterGlasses = (val: number) => storeSetWater(selectedDate, val);

  // ── Dynamic macro targets based on body weight + goal ──
  const latestWeight = bodyWeightLog.length > 0 ? bodyWeightLog[bodyWeightLog.length - 1] : null;
  const bodyWeightLbs = latestWeight
    ? (latestWeight?.unit === 'lbs' ? latestWeight.weight : latestWeight.weight * 2.205)
    : 175; // Default weight if none logged

  // ── Contextual nutrition based on today's training ──
  // Check today's workout logs instead of scheduled sessions
  const todaySession = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLog = workoutLogs.find(log => {
      const logDate = new Date(log.date);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === today.getTime();
    });
    if (!todayLog || !currentMesocycle) return null;
    // Find matching session by sessionId
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

  // Combat context for nutrition detection
  const { competitions, combatNutritionProfile } = useAppStore(
    useShallow(s => ({ competitions: s.competitions, combatNutritionProfile: s.combatNutritionProfile }))
  );
  const nearestComp = useMemo(() => {
    const now = Date.now();
    return (competitions || [])
      .filter(c => new Date(c.date).getTime() > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] || null;
  }, [competitions]);
  const daysToComp = nearestComp
    ? Math.ceil((new Date(nearestComp.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : undefined;

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

  // Electrolyte needs for training days
  const bodyWeightKg = bodyWeightLbs / 2.205;
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

  // Hydration status assessment
  const hydrationStatus = useMemo(() => {
    const glasses = waterLog[selectedDate] || 0;
    const intakeMl = glasses * 250;
    const targetMl = contextualNutrition.hydrationGoal || 3000;
    if (intakeMl === 0) return null;
    return assessHydrationStatus(intakeMl, targetMl);
  }, [waterLog, selectedDate, contextualNutrition.hydrationGoal]);

  // Collagen timing nudge for grappling/combat athletes
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

  // ── UI State ──
  const [showContextual, setShowContextual] = useState(false);

  // ── Form state ──
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showMacroDetail, setShowMacroDetail] = useState(false);
  const [formMealType, setFormMealType] = useState<MealType>('lunch');
  const [formName, setFormName] = useState('');
  const [formPortion, setFormPortion] = useState('');
  const [formCalories, setFormCalories] = useState('');
  const [formProtein, setFormProtein] = useState('');
  const [formCarbs, setFormCarbs] = useState('');
  const [formFat, setFormFat] = useState('');

  // ── Autocomplete state ──
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // ── Instant log confirmation — shows a confirm card instead of filling form fields ──
  const [instantLogItem, setInstantLogItem] = useState<{
    name: string; calories: number; protein: number; carbs: number; fat: number;
    source: string; portion?: string;
  } | null>(null);

  // ── Portion scaling ──
  // Stores the "1x" base macros when a food is selected so user can scale
  const [baseServing, setBaseServing] = useState<{
    calories: number; protein: number; carbs: number; fat: number;
    portion?: string; baseGrams?: number;
  } | null>(null);

  const applyPortionScale = useCallback((multiplier: number) => {
    if (!baseServing) return;
    setFormCalories(String(Math.round(baseServing.calories * multiplier)));
    setFormProtein(String(Math.round(baseServing.protein * multiplier * 10) / 10));
    setFormCarbs(String(Math.round(baseServing.carbs * multiplier * 10) / 10));
    setFormFat(String(Math.round(baseServing.fat * multiplier * 10) / 10));
    // Update portion label
    if (baseServing.baseGrams) {
      setFormPortion(`${Math.round(baseServing.baseGrams * multiplier)}g`);
    } else if (multiplier === 1) {
      setFormPortion(baseServing.portion || '');
    } else {
      const label = multiplier === 0.5 ? '½' : multiplier === 0.75 ? '¾' : `${multiplier}x`;
      setFormPortion(baseServing.portion ? `${label} of ${baseServing.portion}` : `${label} serving`);
    }
  }, [baseServing]);

  // Extract grams from a portion string like "200g", "150g cooked", "(170g)"
  const extractGrams = (text: string): number | undefined => {
    const match = text.match(/(\d+)\s*g(?:\b|$)/i);
    return match ? parseInt(match[1]) : undefined;
  };

  // ── Meal history index ──
  // Build a frequency+recency-weighted index from all past meals
  type HistoryFood = { name: string; portion?: string; calories: number; protein: number; carbs: number; fat: number; count: number; lastUsed: number };
  const mealHistoryIndex = useMemo(() => {
    const index = new Map<string, HistoryFood>();
    meals.forEach(m => {
      const key = m.name.toLowerCase().trim();
      const existing = index.get(key);
      const ts = new Date(m.date).getTime();
      if (!existing || ts > existing.lastUsed) {
        // Keep the most recent version's macros + portion
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

  // Day-of-week meal patterns: detect meals eaten on the same weekday 2+ times
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
  type DayPattern = { dayCount: number; mealType?: string; lastUsed: number };
  const dayOfWeekPatterns = useMemo(() => {
    // Map: "mealname_lowercase" → Map<dayOfWeek(0-6), { dayCount, mealType, lastUsed }>
    const patterns = new Map<string, Map<number, DayPattern>>();
    meals.forEach(m => {
      const key = m.name.toLowerCase().trim();
      const d = new Date(m.date);
      const dow = d.getDay(); // 0=Sun..6=Sat
      const ts = d.getTime();

      if (!patterns.has(key)) patterns.set(key, new Map());
      const dayMap = patterns.get(key)!;
      const existing = dayMap.get(dow);
      dayMap.set(dow, {
        dayCount: (existing?.dayCount || 0) + 1,
        mealType: m.mealType,
        lastUsed: Math.max(ts, existing?.lastUsed || 0),
      });
    });
    return patterns;
  }, [meals]);

  // Get pattern matches for a specific day of week (default: today)
  const todayDow = new Date().getDay();
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
    // Sort by pattern strength (dayCount) then recency
    return results.sort((a, b) => b.dayCount - a.dayCount || b.lastUsed - a.lastUsed);
  }, [dayOfWeekPatterns, todayDow, mealHistoryIndex]);

  // Top 8 most-frequent foods (recency-boosted)
  const favoriteFoods = useMemo(() => {
    const now = Date.now();
    return Array.from(mealHistoryIndex.values())
      .filter(f => f.count >= 1)
      .sort((a, b) => {
        // Score: frequency + recency boost (within last 14 days = +3)
        const recencyA = (now - a.lastUsed) < 14 * 86400000 ? 3 : 0;
        const recencyB = (now - b.lastUsed) < 14 * 86400000 ? 3 : 0;
        return (b.count + recencyB) - (a.count + recencyA);
      })
      .slice(0, 8);
  }, [mealHistoryIndex]);

  // Autocomplete suggestions based on current input
  // Day-of-week pattern meals are boosted to the top when they match the query
  // Supports fuzzy matching: "chick" matches "chicken", "sal" matches "salmon"
  const autocompleteSuggestions = useMemo(() => {
    const q = formName.toLowerCase().trim();
    if (q.length < 1) return [];

    // Build a set of today's pattern meal keys for boosting
    const patternKeys = new Set(todayPatternMeals.map(p => p.name.toLowerCase()));

    // Fuzzy match helper: checks if query is a prefix/substring of text or any word in text
    const fuzzyMatch = (text: string, query: string) => {
      const lower = text.toLowerCase();
      if (lower.includes(query)) return true;
      // Also match if query is a prefix of any word in the text
      const words = lower.split(/[\s,()-]+/);
      return words.some(w => w.startsWith(query));
    };

    // 1. Search meal history first (frequency-weighted, pattern-boosted)
    const historyMatches = Array.from(mealHistoryIndex.values())
      .filter(f => fuzzyMatch(f.name, q))
      .sort((a, b) => {
        // Pattern meals for today sort first
        const aPattern = patternKeys.has(a.name.toLowerCase()) ? 100 : 0;
        const bPattern = patternKeys.has(b.name.toLowerCase()) ? 100 : 0;
        return (bPattern + b.count) - (aPattern + a.count);
      })
      .slice(0, 4)
      .map(f => ({
        ...f,
        source: 'history' as const,
        dayPattern: patternKeys.has(f.name.toLowerCase())
          ? `Every ${DAY_NAMES[todayDow]}`
          : undefined,
      }));

    // 2. Search FOOD_DB with fuzzy matching (only add items not already in history)
    const historyNames = new Set(historyMatches.map(h => h.name.toLowerCase()));
    const dbMatches = FOOD_DB
      .filter(f => f.keywords.some(kw => kw.startsWith(q) || kw.includes(q) || q.includes(kw)) || fuzzyMatch(f.name, q))
      .filter(f => !historyNames.has(f.name.toLowerCase()))
      .slice(0, 3)
      .map(f => ({ ...f, portion: undefined, count: 0, lastUsed: 0, source: 'database' as const, dayPattern: undefined as string | undefined }));

    // 3. Search preset foods (merged from Quick tab for unified search)
    const usedNames = new Set(Array.from(historyNames).concat(dbMatches.map(d => d.name.toLowerCase())));
    const presetMatches = PRESET_FOODS
      .filter(p => fuzzyMatch(p.name, q) && !usedNames.has(p.name.toLowerCase()))
      .slice(0, 2)
      .map(p => ({ ...p, portion: undefined, count: 0, lastUsed: 0, source: 'preset' as const, dayPattern: undefined as string | undefined }));

    return [...historyMatches, ...dbMatches, ...presetMatches].slice(0, 8);
  }, [formName, mealHistoryIndex, todayPatternMeals, todayDow]);

  const selectAutocomplete = useCallback((item: { name: string; portion?: string; calories: number; protein: number; carbs: number; fat: number }) => {
    setFormName(item.name);
    setFormPortion(item.portion || '');
    setFormCalories(String(item.calories));
    setFormProtein(String(item.protein));
    setFormCarbs(String(item.carbs));
    setFormFat(String(item.fat));
    setShowAutocomplete(false);
    setAnalysisResult({ ...item, confidence: 'high', notes: 'From your meal history' });
    // Store base serving for portion scaling — extract grams from name or portion
    const portionText = item.portion || item.name;
    const grams = extractGrams(portionText);
    setBaseServing({ calories: item.calories, protein: item.protein, carbs: item.carbs, fat: item.fat, portion: item.portion, baseGrams: grams });
  }, []);

  // ── Estimation state ──
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    confidence: string;
    notes: string;
  } | null>(null);

  // ── Local text-based estimation ──
  // When instant=true, shows a one-tap confirmation card; otherwise fills form fields
  const handleAIEstimate = (instant = true) => {
    const trimmed = formName.trim();
    if (!trimmed) return;

    setAnalysisError(null);
    setAnalysisResult(null);
    setShowAutocomplete(false);

    // Helper: either show instant card or fill form
    const applyMatch = (item: { name: string; calories: number; protein: number; carbs: number; fat: number; portion?: string }, source: string) => {
      if (instant) {
        setInstantLogItem({ ...item, source });
        return;
      }
      setAnalysisResult({ ...item, confidence: 'high', notes: source });
      setFormName(item.name);
      if (item.portion) setFormPortion(item.portion);
      setFormCalories(String(item.calories));
      setFormProtein(String(item.protein));
      setFormCarbs(String(item.carbs));
      setFormFat(String(item.fat));
      const portionText = item.portion || item.name;
      setBaseServing({ calories: item.calories, protein: item.protein, carbs: item.carbs, fat: item.fat, portion: item.portion, baseGrams: extractGrams(portionText) });
    };

    // 1. Check meal history first (exact match)
    const historyMatch = mealHistoryIndex.get(trimmed.toLowerCase());
    if (historyMatch) {
      applyMatch(historyMatch, 'From your history');
      return;
    }

    // 2. Check history for partial matches
    const partialMatch = Array.from(mealHistoryIndex.values())
      .filter(f => f.name.toLowerCase().includes(trimmed.toLowerCase()))
      .sort((a, b) => b.count - a.count)[0];
    if (partialMatch) {
      applyMatch(partialMatch, 'From your history');
      return;
    }

    // 3. Fall back to local food database
    const local = estimateLocally(trimmed);
    if (local) {
      applyMatch(local, 'Food database');
      return;
    }

    setInstantLogItem(null);
    setAnalysisError('No match found. Try Quick presets or enter macros manually.');
  };

  // Instant log: confirm and add
  const handleInstantLog = () => {
    if (!instantLogItem) return;
    const h = new Date().getHours();
    const autoType: MealType = h < 10 ? 'breakfast' : h < 14 ? 'lunch' : h < 17 ? 'snack' : 'dinner';
    addMeal({
      date: new Date(selectedDate + 'T12:00:00'),
      mealType: formMealType || autoType,
      name: instantLogItem.name,
      calories: instantLogItem.calories,
      protein: instantLogItem.protein,
      carbs: instantLogItem.carbs,
      fat: instantLogItem.fat,
      portion: instantLogItem.portion,
    });
    setInstantLogItem(null);
    setFormName('');
  };

  // ── Preset search ──
  const [presetSearch, setPresetSearch] = useState('');

  const filteredPresets = useMemo(() => {
    if (!presetSearch.trim()) return PRESET_FOODS;
    const q = presetSearch.toLowerCase();
    return PRESET_FOODS.filter((p) => p.name.toLowerCase().includes(q));
  }, [presetSearch]);

  // ── Computed totals ──
  const todayMeals = useMemo(
    () =>
      meals.filter(
        (m) => new Date(m.date).toISOString().split('T')[0] === selectedDate
      ),
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

  const mealsByType = useMemo(() => {
    const grouped: Partial<Record<MealType, MealEntry[]>> = {};
    todayMeals.forEach((m) => {
      if (!grouped[m.mealType]) grouped[m.mealType] = [];
      grouped[m.mealType]!.push(m);
    });
    return grouped;
  }, [todayMeals]);

  // ── Water tracking (dynamic goal from contextual hydration) ──
  const contextualHydrationMl = contextualNutrition.hydrationGoal || 2000;
  const WATER_GOAL = Math.max(8, Math.ceil(contextualHydrationMl / 250));
  const waterLiters = +(waterGlasses * 0.25).toFixed(2);
  const waterGoalLiters = +(WATER_GOAL * 0.25).toFixed(1);

  // ── Macro bar percentages ──
  const totalMacroGrams = totals.protein + totals.carbs + totals.fat;
  const proteinPct = totalMacroGrams > 0 ? (totals.protein / totalMacroGrams) * 100 : 0;
  const carbsPct = totalMacroGrams > 0 ? (totals.carbs / totalMacroGrams) * 100 : 0;
  const fatPct = totalMacroGrams > 0 ? (totals.fat / totalMacroGrams) * 100 : 0;

  // ── Smart meal suggestions based on remaining macros ──
  // Combines user's meal history + FOOD_DB, scored by how well they fill macro gaps
  // Day-of-week patterns get a significant boost so habitual meals surface first
  type SuggestionItem = { name: string; calories: number; protein: number; carbs: number; fat: number; fromHistory: boolean; dayPattern?: string };
  const mealSuggestions = useMemo((): SuggestionItem[] => {
    const targets = contextualNutrition.adjustedTargets;
    const remaining = {
      calories: targets.calories - totals.calories,
      protein: targets.protein - totals.protein,
      carbs: targets.carbs - totals.carbs,
      fat: targets.fat - totals.fat,
    };

    // Don't suggest if already hit targets (check all macros, not just calories)
    const hasAnyGap = remaining.calories >= 30 || remaining.protein >= 5 || remaining.carbs >= 10 || remaining.fat >= 5;
    if (!hasAnyGap) return [];

    // Build pattern lookup for today's day-of-week
    const patternBonus = new Map<string, number>();
    todayPatternMeals.forEach(p => patternBonus.set(p.name.toLowerCase(), p.dayCount));

    // Determine what's most needed
    const proteinRatio = totals.protein / Math.max(targets.protein, 1);
    const carbsRatio = totals.carbs / Math.max(targets.carbs, 1);
    const fatRatio = totals.fat / Math.max(targets.fat, 1);

    const scoreFood = (f: { name: string; calories: number; protein: number; carbs: number; fat: number }, historyBonus: number) => {
      let score = historyBonus;
      // Day-of-week pattern bonus: +40 base + 10 per repeat (e.g. eaten 3 Wednesdays = +70)
      const dayCount = patternBonus.get(f.name.toLowerCase()) || 0;
      if (dayCount >= 2) score += 40 + dayCount * 10;

      if (proteinRatio < carbsRatio && proteinRatio < fatRatio) {
        score += f.protein * 3;
      } else if (carbsRatio < fatRatio) {
        score += f.carbs * 2;
      } else {
        score += f.fat * 2;
      }
      score += Math.max(0, 100 - Math.abs(remaining.calories * 0.4 - f.calories));
      if (f.protein > remaining.protein + 10) score -= 30;
      if (f.carbs > remaining.carbs + 15) score -= 20;
      if (f.fat > remaining.fat + 10) score -= 20;
      return score;
    };

    // Score history items (boosted by frequency + day-of-week pattern)
    const historyScored = Array.from(mealHistoryIndex.values())
      .filter(f => f.calories <= remaining.calories + 50 && f.calories > 0)
      .map(f => {
        const dayCount = patternBonus.get(f.name.toLowerCase()) || 0;
        return {
          item: {
            name: f.name, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat,
            fromHistory: true,
            dayPattern: dayCount >= 2 ? `${DAY_NAMES[todayDow]} regular` : undefined,
          } as SuggestionItem,
          score: scoreFood(f, 20 + Math.min(f.count * 5, 30)),
        };
      });

    // Score DB items
    const historyNames = new Set(historyScored.map(h => h.item.name.toLowerCase()));
    const dbScored = FOOD_DB
      .filter(f => f.calories <= remaining.calories + 50 && !historyNames.has(f.name.toLowerCase()))
      .map(f => ({
        item: { name: f.name, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat, fromHistory: false } as SuggestionItem,
        score: scoreFood(f, 0),
      }));

    return [...historyScored, ...dbScored]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.item);
  }, [totals, contextualNutrition.adjustedTargets, mealHistoryIndex, todayPatternMeals, todayDow]);

  const handleSuggestionTap = (food: SuggestionItem) => {
    addMeal({
      date: new Date(selectedDate + 'T12:00:00'),
      mealType: formMealType,
      name: food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    });
  };

  // ── Daily meal plan generator ──
  // Generates a full day's meals from history + FOOD_DB to hit remaining macro targets
  const [showDayPlan, setShowDayPlan] = useState(false);

  type PlannedMeal = { mealType: MealType; name: string; calories: number; protein: number; carbs: number; fat: number };
  const dailyMealPlan = useMemo((): PlannedMeal[] => {
    if (!showDayPlan) return [];

    const targets = contextualNutrition.adjustedTargets;
    const remaining = {
      calories: Math.max(targets.calories - totals.calories, 0),
      protein: Math.max(targets.protein - totals.protein, 0),
      carbs: Math.max(targets.carbs - totals.carbs, 0),
      fat: Math.max(targets.fat - totals.fat, 0),
    };

    // Need at least some macro gap (any macro, not just calories)
    const hasGap = remaining.calories >= 50 || remaining.protein >= 5 || remaining.carbs >= 10 || remaining.fat >= 5;
    if (!hasGap) return [];

    // Build a pool: history (priority) + FOOD_DB
    type PoolItem = { name: string; calories: number; protein: number; carbs: number; fat: number; priority: number };
    const pool: PoolItem[] = [
      ...Array.from(mealHistoryIndex.values())
        .filter(f => f.calories > 0 && f.calories <= remaining.calories + 80)
        .map(f => ({ name: f.name, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat, priority: 10 + Math.min(f.count * 2, 20) })),
      ...FOOD_DB
        .filter(f => f.calories > 0 && f.calories <= remaining.calories + 80)
        .map(f => ({ name: f.name, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat, priority: 0 })),
    ];

    // Determine which meal slots still need filling
    const filledTypes = new Set(todayMeals.map(m => m.mealType));
    const remainingSlots: MealType[] = (['breakfast', 'lunch', 'snack', 'dinner'] as MealType[])
      .filter(t => !filledTypes.has(t));

    // ─── All slots filled: "closing snack" mode ───
    // Suggest 1-3 snacks that best fill the remaining macro gap
    if (remainingSlots.length === 0) {
      const plan: PlannedMeal[] = [];
      const usedNames = new Set<string>();
      let budgetLeft = { ...remaining };

      // Score each food by how well it fills the specific macro gap
      const scoreFoodForGap = (f: PoolItem, budget: typeof remaining) => {
        let score = f.priority;

        // Reward foods that match the macro gap profile
        // If we need 40g fat, 10g protein, 50g carbs — a fat-heavy food scores high
        const totalNeed = Math.max(1, budget.protein + budget.carbs + budget.fat);
        const proteinNeed = budget.protein / totalNeed;
        const carbsNeed = budget.carbs / totalNeed;
        const fatNeed = budget.fat / totalNeed;

        const totalMacros = Math.max(1, f.protein + f.carbs + f.fat);
        const proteinRatio = f.protein / totalMacros;
        const carbsRatio = f.carbs / totalMacros;
        const fatRatio = f.fat / totalMacros;

        // Reward similarity between food macro profile and remaining gap profile
        const profileMatch = 1 - (
          Math.abs(proteinRatio - proteinNeed) +
          Math.abs(carbsRatio - carbsNeed) +
          Math.abs(fatRatio - fatNeed)
        ) / 2; // normalize to 0-1
        score += profileMatch * 150;

        // Reward not overshooting any individual macro
        if (f.protein <= budget.protein + 5) score += 30;
        else score -= (f.protein - budget.protein) * 3;

        if (f.carbs <= budget.carbs + 10) score += 20;
        else score -= (f.carbs - budget.carbs) * 2;

        if (f.fat <= budget.fat + 5) score += 20;
        else score -= (f.fat - budget.fat) * 3;

        // Reward calorie fit (don't overshoot)
        if (f.calories <= budget.calories + 30) score += 40;
        else score -= (f.calories - budget.calories) * 0.5;

        // Penalize tiny items when gap is large
        if (budget.calories > 200 && f.calories < 80) score -= 30;

        return score;
      };

      // Pick up to 3 snacks
      const maxSnacks = budgetLeft.calories > 400 ? 3 : budgetLeft.calories > 150 ? 2 : 1;

      for (let i = 0; i < maxSnacks; i++) {
        const candidates = pool
          .filter(f => !usedNames.has(f.name) && f.calories <= budgetLeft.calories + 80)
          .map(f => ({ food: f, score: scoreFoodForGap(f, budgetLeft) }))
          .sort((a, b) => b.score - a.score);

        if (candidates.length === 0) break;

        const pick = candidates[0].food;
        plan.push({
          mealType: 'snack',
          name: pick.name,
          calories: pick.calories,
          protein: pick.protein,
          carbs: pick.carbs,
          fat: pick.fat,
        });
        usedNames.add(pick.name);
        budgetLeft.calories = Math.max(0, budgetLeft.calories - pick.calories);
        budgetLeft.protein = Math.max(0, budgetLeft.protein - pick.protein);
        budgetLeft.carbs = Math.max(0, budgetLeft.carbs - pick.carbs);
        budgetLeft.fat = Math.max(0, budgetLeft.fat - pick.fat);

        // Stop if we've essentially closed the gap
        if (budgetLeft.calories < 30 && budgetLeft.protein < 3) break;
      }

      return plan;
    }

    // ─── Normal mode: fill remaining meal slots ───
    if (remaining.calories < 100) return [];

    // Distribute remaining cals across slots
    const calPerSlot = remaining.calories / remainingSlots.length;
    const proPerSlot = remaining.protein / remainingSlots.length;

    const plan: PlannedMeal[] = [];
    const usedNames = new Set<string>();
    let budgetLeft = { ...remaining };

    for (const slot of remainingSlots) {
      // Find best fit for this slot's calorie budget
      const slotBudget = Math.min(calPerSlot * 1.3, budgetLeft.calories);
      const candidates = pool
        .filter(f => f.calories <= slotBudget + 50 && !usedNames.has(f.name))
        .map(f => {
          let score = f.priority;
          // Reward protein density for athletes
          score += (f.protein / Math.max(f.calories, 1)) * 200;
          // Reward calorie fit
          score += Math.max(0, 50 - Math.abs(calPerSlot - f.calories) * 0.2);
          // Reward protein fit
          score += Math.max(0, 30 - Math.abs(proPerSlot - f.protein) * 0.5);
          return { food: f, score };
        })
        .sort((a, b) => b.score - a.score);

      if (candidates.length > 0) {
        const pick = candidates[0].food;
        plan.push({ mealType: slot, name: pick.name, calories: pick.calories, protein: pick.protein, carbs: pick.carbs, fat: pick.fat });
        usedNames.add(pick.name);
        budgetLeft.calories -= pick.calories;
        budgetLeft.protein -= pick.protein;
        budgetLeft.carbs -= pick.carbs;
        budgetLeft.fat -= pick.fat;
      }
    }

    return plan;
  }, [showDayPlan, contextualNutrition.adjustedTargets, totals, mealHistoryIndex, todayMeals]);

  const handlePlanMealTap = (meal: PlannedMeal) => {
    addMeal({
      date: new Date(selectedDate + 'T12:00:00'),
      mealType: meal.mealType,
      name: meal.name,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
    });
  };

  // Log all planned meals at once
  const handleLogAllPlanned = () => {
    for (const meal of dailyMealPlan) {
      addMeal({
        date: new Date(selectedDate + 'T12:00:00'),
        mealType: meal.mealType,
        name: meal.name,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
      });
    }
    setShowDayPlan(false);
  };

  // ── Handlers ──
  const resetForm = () => {
    setFormName('');
    setFormPortion('');
    setFormCalories('');
    setFormProtein('');
    setFormCarbs('');
    setFormFat('');
    setAnalysisResult(null);
    setAnalysisError(null);
    setShowAutocomplete(false);
    setBaseServing(null);
  };

  const handleAddMeal = () => {
    const cal = parseFloat(formCalories) || 0;
    const pro = parseFloat(formProtein) || 0;
    const carb = parseFloat(formCarbs) || 0;
    const f = parseFloat(formFat) || 0;
    if (!formName.trim() || cal === 0) return;

    addMeal({
      date: new Date(selectedDate + 'T12:00:00'),
      mealType: formMealType,
      name: formName.trim(),
      calories: cal,
      protein: pro,
      carbs: carb,
      fat: f,
      portion: formPortion.trim() || undefined,
    });
    resetForm();
    setShowAddForm(false);
  };

  const handlePresetAdd = (preset: (typeof PRESET_FOODS)[number]) => {
    addMeal({
      date: new Date(selectedDate + 'T12:00:00'),
      mealType: formMealType,
      name: preset.name,
      calories: preset.calories,
      protein: preset.protein,
      carbs: preset.carbs,
      fat: preset.fat,
    });
    setShowPresets(false);
    setPresetSearch('');
  };

  const handleDeleteMeal = (id: string) => {
    deleteMeal(id);
    setDeletingMealId(null);
  };

  // Delete confirmation state
  const [deletingMealId, setDeletingMealId] = useState<string | null>(null);

  // Move meal to a different mealType
  const [movingMealId, setMovingMealId] = useState<string | null>(null);

  const handleMoveMeal = (id: string, newType: MealType) => {
    updateMeal(id, { mealType: newType });
    setMovingMealId(null);
  };

  // Edit meal inline
  const [editingMeal, setEditingMeal] = useState<{
    id: string; name: string; calories: string; protein: string; carbs: string; fat: string; portion: string;
    _origCal: number; _origP: number; _origC: number; _origF: number; _origGrams: number | undefined;
  } | null>(null);

  const startEditMeal = (meal: MealEntry) => {
    setEditingMeal({
      id: meal.id,
      name: meal.name,
      calories: String(meal.calories),
      protein: String(meal.protein),
      carbs: String(meal.carbs),
      fat: String(meal.fat),
      portion: meal.portion || '',
      _origCal: meal.calories,
      _origP: meal.protein,
      _origC: meal.carbs,
      _origF: meal.fat,
      _origGrams: extractGrams(meal.portion || ''),
    });
    setMovingMealId(null);
  };

  const saveEditMeal = () => {
    if (!editingMeal) return;
    const cal = parseFloat(editingMeal.calories) || 0;
    if (!editingMeal.name.trim() || cal === 0) return;
    updateMeal(editingMeal.id, {
      name: editingMeal.name.trim(),
      calories: Math.round(cal),
      protein: Math.round((parseFloat(editingMeal.protein) || 0) * 10) / 10,
      carbs: Math.round((parseFloat(editingMeal.carbs) || 0) * 10) / 10,
      fat: Math.round((parseFloat(editingMeal.fat) || 0) * 10) / 10,
      portion: editingMeal.portion.trim() || undefined,
    });
    setEditingMeal(null);
  };

  // ── Date formatting ──
  const selectedDateFormatted = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-grappler-900 pb-24"
    >
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-grappler-900/95 backdrop-blur-sm border-b border-grappler-800 px-4 py-3 safe-area-top">
        <div className="flex items-center justify-between">
          <button aria-label="Go back"
            onClick={onClose}
            className="flex items-center gap-1 text-grappler-400 hover:text-grappler-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>
          <h1 className="text-lg font-bold text-grappler-50 flex items-center gap-2">
            <Apple className="w-5 h-5 text-primary-400" />
            Nutrition
          </h1>
          <div className="w-16" /> {/* spacer */}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {/* ── Contextual Nutrition Banner ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card overflow-hidden"
        >
          <button
            onClick={() => setShowContextual(!showContextual)}
            className="w-full p-3 flex items-center justify-between bg-gradient-to-r from-primary-500/20 to-transparent"
          >
            <div className="flex items-center gap-3">
              {contextualNutrition.dayType.includes('grappling') ? (
                <Shield className="w-5 h-5 text-lime-400" />
              ) : contextualNutrition.dayType === 'rest' ? (
                <Clock className="w-5 h-5 text-blue-400" />
              ) : (
                <Dumbbell className="w-5 h-5 text-primary-400" />
              )}
              <div className="text-left">
                <p className="text-sm font-medium text-white">
                  {contextualNutrition.dayType === 'grappling_hard' ? 'Hard Grappling Day' :
                   contextualNutrition.dayType === 'grappling_light' ? 'Light Grappling Day' :
                   contextualNutrition.dayType === 'strength' ? 'Strength Training Day' :
                   contextualNutrition.dayType === 'hypertrophy' ? 'Hypertrophy Training Day' :
                   contextualNutrition.dayType === 'power' ? 'Power Training Day' :
                   'Rest Day'}
                </p>
                <p className="text-xs text-gray-400">{contextualNutrition.carbCycleNote}</p>
              </div>
            </div>
            {showContextual ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          <AnimatePresence>
            {showContextual && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 pt-0 space-y-3">
                  {/* Adjusted vs Base Macros */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-grappler-800/50 rounded-lg">
                      <p className="text-gray-500 mb-1">Base Targets</p>
                      <p className="text-gray-300">
                        {contextualNutrition.baseTargets.calories} kcal • {contextualNutrition.baseTargets.protein}g P
                      </p>
                    </div>
                    <div className="p-2 bg-primary-500/10 border border-primary-500/30 rounded-lg">
                      <p className="text-primary-400 mb-1">Today&apos;s Adjusted</p>
                      <p className="text-white font-medium">
                        {contextualNutrition.adjustedTargets.calories} kcal • {contextualNutrition.adjustedTargets.protein}g P
                      </p>
                    </div>
                  </div>

                  {/* Timing Recommendations */}
                  {(contextualNutrition.preworkoutTiming || contextualNutrition.postworkoutTiming) && (
                    <div className="space-y-2">
                      {contextualNutrition.preworkoutTiming && (
                        <div className="flex items-start gap-2 text-xs">
                          <span className="text-yellow-400 font-medium min-w-[60px]">Pre:</span>
                          <span className="text-gray-400">{contextualNutrition.preworkoutTiming}</span>
                        </div>
                      )}
                      {contextualNutrition.postworkoutTiming && (
                        <div className="flex items-start gap-2 text-xs">
                          <span className="text-green-400 font-medium min-w-[60px]">Post:</span>
                          <span className="text-gray-400">{contextualNutrition.postworkoutTiming}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hydration Goal */}
                  <div className="flex items-center justify-between p-2 bg-blue-500/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-gray-300">Hydration Goal</span>
                    </div>
                    <span className="text-sm font-medium text-blue-300">{(contextualNutrition.hydrationGoal / 1000).toFixed(1)} L</span>
                  </div>

                  {/* Electrolyte & Intra-Training Fueling */}
                  {electrolyteInfo && (
                    <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-lg space-y-1.5">
                      <p className="text-xs text-purple-300 font-medium flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Electrolyte Needs ({trainingDuration}min session)
                      </p>
                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        <div className="bg-grappler-800/40 rounded p-1">
                          <p className="text-xs text-grappler-400">Sodium</p>
                          <p className="text-xs font-medium text-grappler-200">{electrolyteInfo.sodiumMg}mg</p>
                        </div>
                        <div className="bg-grappler-800/40 rounded p-1">
                          <p className="text-xs text-grappler-400">Potassium</p>
                          <p className="text-xs font-medium text-grappler-200">{electrolyteInfo.potassiumMg}mg</p>
                        </div>
                        <div className="bg-grappler-800/40 rounded p-1">
                          <p className="text-xs text-grappler-400">Fluid Loss</p>
                          <p className="text-xs font-medium text-grappler-200">{electrolyteInfo.fluidLossL}L</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {intraFuel && intraFuel.carbsG > 0 && (
                    <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-xs text-blue-300 font-medium mb-1">Intra-Training Fuel</p>
                      <p className="text-xs text-grappler-400">{intraFuel.notes}</p>
                      {intraFuel.foods.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {intraFuel.foods.slice(0, 3).map((f, i) => (
                            <p key={i} className="text-xs text-grappler-400">&#x2022; {f}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hydration Status */}
                  {hydrationStatus && hydrationStatus.status !== 'well_hydrated' && (
                    <div className={cn(
                      'p-2.5 rounded-lg border',
                      hydrationStatus.status === 'severe_dehydration' ? 'bg-red-500/10 border-red-500/20' :
                      hydrationStatus.status === 'moderate_dehydration' ? 'bg-orange-500/10 border-orange-500/20' :
                      'bg-yellow-500/10 border-yellow-500/20'
                    )}>
                      <p className={cn(
                        'text-xs font-medium flex items-center gap-1',
                        hydrationStatus.status === 'severe_dehydration' ? 'text-red-300' :
                        hydrationStatus.status === 'moderate_dehydration' ? 'text-orange-300' :
                        'text-yellow-300'
                      )}>
                        <Droplets className="w-3 h-3" /> Hydration Alert
                      </p>
                      <p className="text-xs text-grappler-400 mt-1">{hydrationStatus.message}</p>
                    </div>
                  )}

                  {/* Collagen Timing Nudge */}
                  {collagenNudge && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <p className="text-xs text-emerald-300 font-medium flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Collagen Protocol
                      </p>
                      <p className="text-xs text-grappler-300 mt-1">{collagenNudge.dose}</p>
                      <p className="text-xs text-grappler-400">{collagenNudge.timing} — {collagenNudge.reason}</p>
                    </div>
                  )}

                  {/* Recommendations */}
                  {contextualNutrition.recommendations.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-gray-500 font-medium">Tips for today:</p>
                      {contextualNutrition.recommendations.slice(0, 3).map((rec, i) => (
                        <p key={i} className="text-xs text-gray-400 flex items-start gap-2">
                          <span className="text-primary-400">•</span>
                          {rec}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Supplement recommendations */}
                  {supplements.length > 3 && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                        <Shield className="w-3 h-3 text-emerald-400" /> Supplements
                      </p>
                      {supplements.slice(3, 6).map((sup, i) => (
                        <p key={i} className="text-xs text-gray-400 flex items-start gap-2">
                          <span className="text-emerald-400">&#x2022;</span>
                          {sup}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Diet Coach ── */}
        <DietCoach />

        {/* ── Supplement Tracker ── */}
        <SupplementTracker />

        {/* ── Daily Goals ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="card p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-grappler-200 uppercase tracking-wide">
              Daily Goals
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigateDate(-1)}
                className="p-1 text-grappler-400 hover:text-grappler-200 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => !isToday && setSelectedDate(todayStr)}
                className={cn('text-xs px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors', isToday ? 'text-primary-400 font-semibold' : 'text-grappler-400 hover:text-grappler-200 bg-grappler-800')}
              >
                <CalendarDays className="w-3 h-3" />
                {isToday ? 'Today' : selectedDateFormatted}
              </button>
              <button
                onClick={() => navigateDate(1)}
                disabled={isToday}
                className={cn('p-1 transition-colors', isToday ? 'text-grappler-700 cursor-not-allowed' : 'text-grappler-400 hover:text-grappler-200')}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          {!isToday && (
            <div className="mb-3 flex items-center gap-2 bg-sky-500/10 rounded-lg px-2.5 py-1.5">
              <CalendarDays className="w-3 h-3 text-sky-400 flex-shrink-0" />
              <p className="text-xs text-sky-300">
                Logging for {selectedDateFormatted} — meals and water will be saved to this date
              </p>
            </div>
          )}

          {/* Compact summary — always visible */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-grappler-800/50 rounded-lg p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-blue-400">{totals.calories}</span>
                <span className="text-xs text-grappler-400">/ {contextualNutrition.adjustedTargets.calories}</span>
              </div>
              <p className="text-xs text-grappler-400 mt-0.5">calories</p>
              <div className="mt-1.5 h-1.5 rounded-full bg-grappler-700 overflow-hidden">
                <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${Math.min(100, contextualNutrition.adjustedTargets.calories > 0 ? (totals.calories / contextualNutrition.adjustedTargets.calories) * 100 : 0)}%` }} />
              </div>
            </div>
            <div className="bg-grappler-800/50 rounded-lg p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-red-400">{totals.protein}g</span>
                <span className="text-xs text-grappler-400">/ {contextualNutrition.adjustedTargets.protein}g</span>
              </div>
              <p className="text-xs text-grappler-400 mt-0.5">protein</p>
              <div className="mt-1.5 h-1.5 rounded-full bg-grappler-700 overflow-hidden">
                <div className="h-full rounded-full bg-red-500 transition-all" style={{ width: `${Math.min(100, contextualNutrition.adjustedTargets.protein > 0 ? (totals.protein / contextualNutrition.adjustedTargets.protein) * 100 : 0)}%` }} />
              </div>
            </div>
          </div>

          {/* Expandable full macro rings */}
          <button
            onClick={() => setShowMacroDetail(prev => !prev)}
            className="w-full flex items-center justify-center gap-1 text-xs text-grappler-400 hover:text-grappler-300 transition-colors py-1"
          >
            {showMacroDetail ? 'Hide detail' : 'Show all macros'}
            {showMacroDetail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <AnimatePresence>
            {showMacroDetail && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-4 gap-2 pt-2">
                  <MacroRing
                    label="kcal"
                    current={totals.calories}
                    target={contextualNutrition.adjustedTargets.calories}
                    unit=""
                    color="#f97316"
                    size={76}
                  />
                  <MacroRing
                    label="Protein"
                    current={totals.protein}
                    target={contextualNutrition.adjustedTargets.protein}
                    unit="g"
                    color="#ef4444"
                    size={76}
                  />
                  <MacroRing
                    label="Carbs"
                    current={totals.carbs}
                    target={contextualNutrition.adjustedTargets.carbs}
                    unit="g"
                    color="#3b82f6"
                    size={76}
                  />
                  <MacroRing
                    label="Fat"
                    current={totals.fat}
                    target={contextualNutrition.adjustedTargets.fat}
                    unit="g"
                    color="#eab308"
                    size={76}
                  />
                </div>

                {/* Macro breakdown bar */}
                {totalMacroGrams > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-grappler-400 uppercase tracking-wide">
                      Macro Split
                    </p>
                    <div className="h-3 rounded-full overflow-hidden flex bg-grappler-700/50">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${proteinPct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="bg-red-500 h-full"
                      />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${carbsPct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                        className="bg-blue-500 h-full"
                      />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${fatPct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                        className="bg-yellow-500 h-full"
                      />
                    </div>
                    <div className="flex justify-between text-xs text-grappler-400">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                        Protein {Math.round(proteinPct)}%
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                        Carbs {Math.round(carbsPct)}%
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
                        Fat {Math.round(fatPct)}%
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Smart Suggestions ── */}
        {mealSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="card p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <h2 className="text-sm font-semibold text-grappler-200 uppercase tracking-wide">
                Suggested Next
              </h2>
              <span className="text-xs text-grappler-400 ml-auto">
                {contextualNutrition.adjustedTargets.calories - totals.calories > 0
                  ? `${contextualNutrition.adjustedTargets.calories - totals.calories} kcal left`
                  : 'Target reached'}
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {mealSuggestions.map((food) => (
                <button
                  key={food.name}
                  onClick={() => handleSuggestionTap(food)}
                  className={cn(
                    "flex-shrink-0 p-2.5 rounded-xl transition-colors text-left min-w-[140px]",
                    food.dayPattern
                      ? "bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30"
                      : food.fromHistory
                        ? "bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30"
                        : "bg-grappler-800/60 hover:bg-grappler-700/60 border border-grappler-700/50"
                  )}
                >
                  <div className="flex items-center gap-1">
                    {food.dayPattern ? (
                      <CalendarDays className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    ) : food.fromHistory ? (
                      <Clock className="w-3 h-3 text-sky-400 flex-shrink-0" />
                    ) : null}
                    <p className="text-xs font-medium text-grappler-100 truncate">{food.name}</p>
                  </div>
                  {food.dayPattern && (
                    <p className="text-xs text-amber-400/80 mt-0.5">{food.dayPattern}</p>
                  )}
                  <p className="text-xs text-grappler-400 mt-1">
                    {Math.round(food.calories)} kcal &middot; {+food.protein.toFixed(1)}g P
                  </p>
                </button>
              ))}
            </div>
            <p className="text-xs text-grappler-600 mt-2">
              Based on your remaining macros{mealSuggestions.some(s => s.dayPattern) ? ', your weekly patterns' : ''}{mealSuggestions.some(s => s.fromHistory && !s.dayPattern) ? ' & history' : ''} &middot; Tap to log
            </p>
          </motion.div>
        )}

        {/* ── Fill My Macros ── */}
        {(() => {
          const remCal = contextualNutrition.adjustedTargets.calories - totals.calories;
          const remPro = contextualNutrition.adjustedTargets.protein - totals.protein;
          const remCarbs = contextualNutrition.adjustedTargets.carbs - totals.carbs;
          const remFat = contextualNutrition.adjustedTargets.fat - totals.fat;
          // Show when there's any meaningful macro gap (not just calories)
          const hasGap = remCal >= 50 || remPro >= 5 || remCarbs >= 10 || remFat >= 5;
          if (!hasGap) return null;
          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
              className="card overflow-hidden"
            >
              {/* Header — always visible, tappable */}
              <button
                onClick={() => setShowDayPlan(!showDayPlan)}
                className="w-full p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center">
                    <Target className="w-4 h-4 text-primary-400" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-sm font-bold text-grappler-100">Fill My Macros</h2>
                    <p className="text-xs text-grappler-400">
                      {Math.round(remCal)} kcal · {Math.round(remPro)}g P · {Math.round(remCarbs)}g C · {Math.round(remFat)}g F left
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {!showDayPlan && (
                    <span className="text-xs font-medium text-primary-400">Show plan</span>
                  )}
                  {showDayPlan ? <ChevronUp className="w-4 h-4 text-grappler-400" /> : <ChevronDown className="w-4 h-4 text-grappler-400" />}
                </div>
              </button>

              {/* Remaining macro mini-bars */}
              <div className="px-4 pb-3 grid grid-cols-4 gap-2">
                {[
                  { label: 'kcal', cur: totals.calories, target: contextualNutrition.adjustedTargets.calories, color: 'bg-blue-400' },
                  { label: 'P', cur: totals.protein, target: contextualNutrition.adjustedTargets.protein, color: 'bg-red-400' },
                  { label: 'C', cur: totals.carbs, target: contextualNutrition.adjustedTargets.carbs, color: 'bg-sky-400' },
                  { label: 'F', cur: totals.fat, target: contextualNutrition.adjustedTargets.fat, color: 'bg-yellow-400' },
                ].map(m => {
                  const pct = Math.min(100, m.target > 0 ? (m.cur / m.target) * 100 : 0);
                  return (
                    <div key={m.label}>
                      <div className="h-1.5 bg-grappler-700/60 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full transition-all', m.color)} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-grappler-400 text-center mt-0.5">{m.label}</p>
                    </div>
                  );
                })}
              </div>

              {/* Expandable meal plan */}
              <AnimatePresence>
                {showDayPlan && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-grappler-700/50"
                  >
                    {dailyMealPlan.length > 0 ? (
                      <div className="p-4 space-y-2">
                        <p className="text-xs text-grappler-400">
                          {dailyMealPlan.every(m => m.mealType === 'snack') && dailyMealPlan.length <= 2
                            ? `Have ${dailyMealPlan.length === 1 ? 'this snack' : 'these snacks'} to close the gap:`
                            : `Eat these to hit your remaining ${Math.round(remPro)}g protein & ${Math.round(remCal)} kcal:`}
                        </p>
                        {dailyMealPlan.map((meal) => (
                          <div
                            key={`${meal.mealType}-${meal.name}`}
                            className="flex items-center gap-3 p-2.5 bg-grappler-800/40 rounded-lg"
                          >
                            <div className="flex items-center gap-1.5 min-w-[72px]">
                              {MEAL_TYPE_ICONS[meal.mealType]}
                              <span className="text-xs text-grappler-400 uppercase font-medium">
                                {MEAL_TYPE_LABELS[meal.mealType]}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-grappler-100 truncate">{meal.name}</p>
                              <p className="text-xs text-grappler-400">
                                {Math.round(meal.calories)} kcal · {+meal.protein.toFixed(1)}g P · {+meal.carbs.toFixed(1)}g C · {+meal.fat.toFixed(1)}g F
                              </p>
                            </div>
                            <button
                              onClick={() => handlePlanMealTap(meal)}
                              className="px-2.5 py-1 text-xs font-medium bg-grappler-700/40 text-grappler-300 border border-grappler-600 rounded-lg hover:bg-grappler-700/60 transition-colors flex-shrink-0"
                            >
                              Log
                            </button>
                          </div>
                        ))}

                        {/* Plan total + Log All */}
                        <div className="flex items-center justify-between pt-2 border-t border-grappler-700/50">
                          <div className="text-xs text-grappler-400">
                            <span className="font-medium text-grappler-300">Plan total: </span>
                            {dailyMealPlan.reduce((s, m) => s + m.calories, 0)} kcal ·{' '}
                            {dailyMealPlan.reduce((s, m) => s + m.protein, 0)}g P
                          </div>
                          <button
                            onClick={handleLogAllPlanned}
                            className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-lg active:scale-95 transition-transform"
                          >
                            Log All
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 text-xs text-grappler-400">
                        <p>No great matches found for your remaining macros.</p>
                        <p className="mt-1 text-grappler-400">
                          Remaining: {Math.round(Math.max(0, remPro))}g P · {Math.round(Math.max(0, remCarbs))}g C · {Math.round(Math.max(0, remFat))}g F
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })()}

        {/* ── Water Tracker ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="card p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-grappler-200 uppercase tracking-wide flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-400" />
              Water
            </h2>
            <span className="text-xs text-grappler-400">
              {waterLiters} L / {waterGoalLiters} L
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {Array.from({ length: Math.max(WATER_GOAL, waterGlasses) }, (_, i) => (
              <motion.button
                key={i}
                whileTap={{ scale: 0.85 }}
                onClick={() => setWaterGlasses(i < waterGlasses ? i : i + 1)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
                  i < waterGlasses
                    ? i < WATER_GOAL
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                      : 'bg-green-500/20 text-green-400 border border-green-500/40'
                    : 'bg-grappler-700/40 text-grappler-600 border border-grappler-700/60'
                }`}
              >
                <Droplet
                  className={`w-4 h-4 ${
                    i < waterGlasses ? (i < WATER_GOAL ? 'fill-blue-400' : 'fill-green-400') : ''
                  }`}
                />
              </motion.button>
            ))}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => setWaterGlasses(waterGlasses + 1)}
              className="w-9 h-9 rounded-lg flex items-center justify-center bg-grappler-700/40 text-grappler-400 border border-dashed border-grappler-600 hover:border-blue-500/50 hover:text-blue-400 transition-all"
            >
              <Plus className="w-4 h-4" />
            </motion.button>
          </div>

          <p className="text-xs text-grappler-400 mt-2">
            {waterGlasses}/{WATER_GOAL} glasses (250 ml each)
            {waterGlasses >= WATER_GOAL && (
              <span className={cn('ml-1 font-medium', waterGlasses > WATER_GOAL ? 'text-green-400' : 'text-blue-400')}>
                {waterGlasses > WATER_GOAL ? ` +${waterGlasses - WATER_GOAL} bonus!` : ' -- Goal reached!'}
              </span>
            )}
          </p>
        </motion.div>

        {/* ── Quick Add / Camera / Custom ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="card p-4"
        >
          {/* Time-of-day context */}
          <p className="text-xs text-grappler-400 mb-2">
            {(() => {
              const h = new Date().getHours();
              if (h < 10) return 'Good morning — time for breakfast';
              if (h < 12) return 'Mid-morning — snack or pre-workout fuel';
              if (h < 14) return 'Lunch time — biggest meal of the day';
              if (h < 17) return 'Afternoon — snack to stay fueled';
              if (h < 20) return 'Dinner time — protein + recovery';
              return 'Evening — light snack if needed';
            })()}
          </p>

          {/* Quick Protein — single-tap add */}
          <button
            onClick={() => {
              const h = new Date().getHours();
              const mealType: MealType = h < 10 ? 'breakfast' : h < 14 ? 'lunch' : h < 17 ? 'snack' : 'dinner';
              addMeal({
                date: new Date(selectedDate + 'T12:00:00'),
                mealType,
                name: 'Protein Shake (300ml)',
                calories: 160,
                protein: 30,
                carbs: 5,
                fat: 2,
              });
            }}
            className="w-full mb-3 py-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <Zap className="w-4 h-4" />
            Quick Add Protein (+30g)
          </button>

          {/* 1-Tap frequent foods — always visible, no form needed */}
          {favoriteFoods.length > 0 && (
            <div className="mb-3">
              <label className="text-xs text-grappler-400 mb-1.5 block uppercase tracking-wider font-semibold flex items-center gap-1">
                <Star className="w-3 h-3 text-sky-400" />
                Tap to log
              </label>
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                {favoriteFoods.map(food => {
                  const h = new Date().getHours();
                  const mealType: MealType = h < 10 ? 'breakfast' : h < 14 ? 'lunch' : h < 17 ? 'snack' : 'dinner';
                  return (
                    <button
                      key={food.name}
                      onClick={() => {
                        addMeal({
                          date: new Date(selectedDate + 'T12:00:00'),
                          mealType,
                          name: food.name,
                          calories: Math.round(food.calories),
                          protein: Math.round(food.protein),
                          carbs: Math.round(food.carbs),
                          fat: Math.round(food.fat),
                        });
                      }}
                      className="flex-shrink-0 px-2.5 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-lg transition-colors active:scale-95 text-left"
                    >
                      <p className="text-xs font-medium text-grappler-100 truncate max-w-[120px]">{food.name}</p>
                      <p className="text-xs text-grappler-400">{Math.round(food.calories)} kcal · {Math.round(food.protein)}g P</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-grappler-200 uppercase tracking-wide">
              Log Food
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPresets(!showPresets);
                  setShowAddForm(false);
                }}
                className="btn btn-secondary btn-sm gap-1"
              >
                <Zap className="w-3.5 h-3.5" />
                Quick
              </button>
              <button
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  setShowPresets(false);
                  setAnalysisResult(null);
                  setAnalysisError(null);
                              }}
                className="btn btn-primary btn-sm gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Manual
              </button>
            </div>
          </div>

          {/* Meal type selector (shared) */}
          {(showAddForm || showPresets) && (
            <div className="mb-3">
              <label className="text-xs text-grappler-400 mb-1.5 block">
                Meal
              </label>
              <div className="flex gap-1.5 flex-wrap">
                {MEAL_TYPE_ORDER.map((type) => (
                  <button
                    key={type}
                    onClick={() => setFormMealType(type)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                      formMealType === type
                        ? 'bg-primary-500/20 text-primary-400 border border-primary-500/40'
                        : 'bg-grappler-700/40 text-grappler-400 border border-grappler-700/60 hover:border-grappler-600'
                    }`}
                  >
                    {MEAL_TYPE_ICONS[type]}
                    {MEAL_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Preset foods grid with search ── */}
          <AnimatePresence>
            {showPresets && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {/* Search bar */}
                <div className="mb-2">
                  <input
                    type="text"
                    value={presetSearch}
                    onChange={(e) => setPresetSearch(e.target.value)}
                    placeholder="Search... (e.g. chicken, rice)"
                    className="input text-sm"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 pb-1 max-h-72 overflow-y-auto">
                  {filteredPresets.map((preset, idx) => (
                    <motion.button
                      key={preset.name}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      onClick={() => handlePresetAdd(preset)}
                      className="bg-grappler-700/30 hover:bg-grappler-700/60 border border-grappler-700/50 rounded-lg p-2.5 text-left transition-all group"
                    >
                      <p className="text-xs font-medium text-grappler-200 group-hover:text-grappler-50 truncate">
                        {preset.name}
                      </p>
                      <div className="flex gap-2 mt-1 text-xs text-grappler-400">
                        <span className="text-blue-400/80">
                          {preset.calories} kcal
                        </span>
                        <span className="text-red-400/80">
                          {preset.protein}p
                        </span>
                        <span className="text-blue-400/80">
                          {preset.carbs}c
                        </span>
                        <span className="text-yellow-400/80">
                          {preset.fat}f
                        </span>
                      </div>
                    </motion.button>
                  ))}
                  {filteredPresets.length === 0 && (
                    <p className="col-span-2 text-xs text-grappler-400 text-center py-4">
                      No results. Try &quot;Manual&quot; to enter macros directly.
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Custom meal form (also used for camera results) ── */}
          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-3 pb-1">
                  {/* Analysis result badge */}
                  {analysisResult && (
                    <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-green-500/10 text-green-400 border border-green-500/30">
                      <Sparkles className="w-4 h-4 flex-shrink-0" />
                      <span>{analysisResult.notes || 'Auto-filled from local database'}</span>
                    </div>
                  )}

                  {/* Analysis error */}
                  {analysisError && (
                    <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{analysisError}</span>
                    </div>
                  )}

                  {/* Recent & Favorites chips */}
                  {favoriteFoods.length > 0 && (
                    <div>
                      <label className="text-xs text-grappler-400 mb-1.5 block flex items-center gap-1">
                        <Star className="w-3 h-3 text-sky-400" />
                        Your Favorites
                      </label>
                      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                        {favoriteFoods.map(food => (
                          <button
                            key={food.name}
                            onClick={() => selectAutocomplete(food)}
                            className="flex-shrink-0 px-2.5 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-lg transition-colors text-left"
                          >
                            <p className="text-xs font-medium text-grappler-100 truncate max-w-[120px]">{food.name}</p>
                            <p className="text-xs text-grappler-400">{Math.round(food.calories)} kcal · {+food.protein.toFixed(1)}g P</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <label className="text-xs text-grappler-400 mb-1 block">
                      Name
                    </label>
                    <div className="flex gap-2">
                      <input
                        ref={nameInputRef}
                        type="text"
                        value={formName}
                        onChange={(e) => {
                          setFormName(e.target.value);
                          setShowAutocomplete(e.target.value.trim().length >= 1);
                        }}
                        onFocus={() => {
                          if (formName.trim().length >= 1) setShowAutocomplete(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && formName.trim()) {
                            e.preventDefault();
                            setShowAutocomplete(false);
                            handleAIEstimate(true);
                          }
                          if (e.key === 'Escape') setShowAutocomplete(false);
                        }}
                        placeholder="e.g. Chicken breast and rice"
                        className="input flex-1"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleAIEstimate(false)}
                        disabled={!formName.trim()}
                        className="btn btn-sm px-3 bg-violet-500/20 text-violet-400 border border-violet-500/40 hover:bg-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 whitespace-nowrap"
                        title="Auto-fill macros from database"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="text-xs">Estimate</span>
                      </button>
                    </div>

                    {/* Autocomplete dropdown */}
                    <AnimatePresence>
                      {showAutocomplete && autocompleteSuggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute z-30 left-0 right-0 mt-1 bg-grappler-800 border border-grappler-600 rounded-xl shadow-xl overflow-hidden"
                        >
                          {autocompleteSuggestions.map((item, idx) => (
                            <button
                              key={`${item.source}-${item.name}-${idx}`}
                              onClick={() => selectAutocomplete(item)}
                              className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-grappler-700/60 transition-colors text-left border-b border-grappler-700/40 last:border-b-0"
                            >
                              <span className="text-sm flex-shrink-0">
                                {item.dayPattern ? (
                                  <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
                                ) : item.source === 'history' ? (
                                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                                ) : (
                                  <Apple className="w-3.5 h-3.5 text-grappler-500" />
                                )}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-medium text-grappler-100 truncate">{item.name}</p>
                                  {item.dayPattern && (
                                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 flex-shrink-0">{item.dayPattern}</span>
                                  )}
                                </div>
                                <p className="text-xs text-grappler-400">
                                  {Math.round(item.calories)} kcal · {+item.protein.toFixed(1)}g P · {+item.carbs.toFixed(1)}g C · {+item.fat.toFixed(1)}g F
                                  {item.source === 'history' && item.count > 1 && !item.dayPattern && (
                                    <span className="text-sky-400/70 ml-1">· logged {item.count}x</span>
                                  )}
                                </p>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <p className="text-xs text-grappler-600 mt-1">
                      Type what you ate and press Enter — instant match &amp; log
                    </p>
                  </div>

                  {/* ── Instant log confirmation card ── */}
                  {instantLogItem && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-green-500/10 border border-green-500/30 rounded-xl p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-grappler-100">{instantLogItem.name}</p>
                          <p className="text-xs text-grappler-400 mt-0.5">{instantLogItem.source}</p>
                          <div className="flex gap-3 mt-1.5">
                            <span className="text-xs font-medium text-blue-400">{Math.round(instantLogItem.calories)} kcal</span>
                            <span className="text-xs font-medium text-red-400">{+instantLogItem.protein.toFixed(1)}g P</span>
                            <span className="text-xs font-medium text-sky-400">{+instantLogItem.carbs.toFixed(1)}g C</span>
                            <span className="text-xs font-medium text-yellow-400">{+instantLogItem.fat.toFixed(1)}g F</span>
                          </div>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => {
                              // Switch to manual edit mode with fields pre-filled
                              setFormName(instantLogItem.name);
                              setFormCalories(String(instantLogItem.calories));
                              setFormProtein(String(instantLogItem.protein));
                              setFormCarbs(String(instantLogItem.carbs));
                              setFormFat(String(instantLogItem.fat));
                              if (instantLogItem.portion) setFormPortion(instantLogItem.portion);
                              setInstantLogItem(null);
                            }}
                            className="px-2 py-1.5 text-xs text-grappler-400 bg-grappler-700/40 rounded-lg hover:bg-grappler-700/60 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={handleInstantLog}
                            className="px-3 py-1.5 text-xs font-semibold bg-green-500 text-white rounded-lg hover:bg-green-600 active:scale-95 transition-all"
                          >
                            Log it
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Portion size + scaling */}
                  <div>
                    <label className="text-xs text-grappler-400 mb-1 block">
                      Portion <span className="text-grappler-600">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formPortion}
                      onChange={(e) => {
                        setFormPortion(e.target.value);
                        // Auto-scale macros if base serving has grams and user types a weight
                        if (baseServing?.baseGrams) {
                          const typedGrams = extractGrams(e.target.value);
                          if (typedGrams && typedGrams > 0) {
                            const ratio = typedGrams / baseServing.baseGrams;
                            setFormCalories(String(Math.round(baseServing.calories * ratio)));
                            setFormProtein(String(Math.round(baseServing.protein * ratio * 10) / 10));
                            setFormCarbs(String(Math.round(baseServing.carbs * ratio * 10) / 10));
                            setFormFat(String(Math.round(baseServing.fat * ratio * 10) / 10));
                          }
                        }
                      }}
                      placeholder={baseServing?.baseGrams ? `e.g. ${baseServing.baseGrams}g (type weight to auto-scale)` : 'e.g. 1 cup, 200g, 2 scoops'}
                      className="input"
                    />
                    {/* Quick portion scale buttons */}
                    {baseServing && (
                      <div className="flex gap-1.5 mt-1.5">
                        {[
                          { label: '½', value: 0.5 },
                          { label: '¾', value: 0.75 },
                          { label: '1x', value: 1 },
                          { label: '1.5x', value: 1.5 },
                          { label: '2x', value: 2 },
                        ].map(opt => (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => applyPortionScale(opt.value)}
                            className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-grappler-700/40 hover:bg-primary-500/20 text-grappler-300 hover:text-primary-400 border border-grappler-700/60 hover:border-primary-500/40 transition-colors"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-grappler-400 mb-1 block flex items-center gap-1">
                        <Flame className="w-3 h-3 text-blue-400" />
                        kcal
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formCalories}
                        onChange={(e) => setFormCalories(e.target.value)}
                        placeholder="0"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-grappler-400 mb-1 block flex items-center gap-1">
                        <Beef className="w-3 h-3 text-red-400" />
                        Protein (g)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formProtein}
                        onChange={(e) => setFormProtein(e.target.value)}
                        placeholder="0"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-grappler-400 mb-1 block flex items-center gap-1">
                        <Wheat className="w-3 h-3 text-blue-400" />
                        Carbs (g)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formCarbs}
                        onChange={(e) => setFormCarbs(e.target.value)}
                        placeholder="0"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-grappler-400 mb-1 block flex items-center gap-1">
                        <Droplet className="w-3 h-3 text-yellow-400" />
                        Fat (g)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formFat}
                        onChange={(e) => setFormFat(e.target.value)}
                        placeholder="0"
                        className="input"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        resetForm();
                      }}
                      className="btn btn-secondary btn-sm flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddMeal}
                      disabled={false}
                      className="btn btn-primary btn-sm flex-1 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Meal Log ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
          className="card p-4"
        >
          <h2 className="text-sm font-semibold text-grappler-200 uppercase tracking-wide mb-3">
            Today's Meals
          </h2>

          {todayMeals.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-xl bg-green-500/15 flex items-center justify-center mx-auto mb-3">
                <Apple className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-sm font-medium text-grappler-300">
                No meals logged yet
              </p>
              <p className="text-xs text-grappler-400 mt-1 max-w-[240px] mx-auto">
                Tap "Quick Add Protein" above for a 1-tap log, or use presets to find your meal in seconds.
              </p>
              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-grappler-400">
                <span>{contextualNutrition.adjustedTargets.protein}g protein</span>
                <span className="text-grappler-700">/</span>
                <span>{contextualNutrition.adjustedTargets.calories} kcal</span>
                <span className="text-grappler-600">remaining today</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {MEAL_TYPE_ORDER.map((type) => {
                const typeMeals = mealsByType[type];
                if (!typeMeals || typeMeals.length === 0) return null;

                const typeCalories = typeMeals.reduce(
                  (sum, m) => sum + m.calories,
                  0
                );

                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 text-grappler-300">
                        {MEAL_TYPE_ICONS[type]}
                        <span className="text-xs font-semibold uppercase tracking-wide">
                          {MEAL_TYPE_LABELS[type]}
                        </span>
                      </div>
                      <span className="text-xs text-grappler-400">
                        {typeCalories} kcal
                      </span>
                    </div>

                    <div className="space-y-1">
                      {typeMeals.map((meal, idx) => (
                        <motion.div
                          key={meal.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="relative py-2 px-3 bg-grappler-800/40 rounded-lg group"
                        >
                          {editingMeal?.id === meal.id ? (
                            /* ── Inline edit mode ── */
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <input
                                  value={editingMeal.name}
                                  onChange={e => setEditingMeal({ ...editingMeal, name: e.target.value })}
                                  className="flex-1 bg-grappler-900 border border-grappler-600 rounded-lg px-2 py-1.5 text-sm text-grappler-100 focus-visible:border-primary-500 outline-none"
                                  placeholder="Name"
                                  autoFocus
                                  onKeyDown={e => { if (e.key === 'Enter') saveEditMeal(); if (e.key === 'Escape') setEditingMeal(null); }}
                                />
                                <input
                                  value={editingMeal.portion}
                                  onChange={e => {
                                    const newPortion = e.target.value;
                                    const newGrams = extractGrams(newPortion);
                                    const origGrams = editingMeal._origGrams;
                                    // Auto-scale macros when both old and new portions have gram values
                                    if (newGrams && origGrams && origGrams > 0) {
                                      const ratio = newGrams / origGrams;
                                      setEditingMeal({
                                        ...editingMeal,
                                        portion: newPortion,
                                        calories: String(Math.round(editingMeal._origCal * ratio)),
                                        protein: String(Math.round(editingMeal._origP * ratio * 10) / 10),
                                        carbs: String(Math.round(editingMeal._origC * ratio * 10) / 10),
                                        fat: String(Math.round(editingMeal._origF * ratio * 10) / 10),
                                      });
                                    } else {
                                      setEditingMeal({ ...editingMeal, portion: newPortion });
                                    }
                                  }}
                                  className="w-20 bg-grappler-900 border border-grappler-600 rounded-lg px-2 py-1.5 text-sm text-grappler-100 focus-visible:border-primary-500 outline-none"
                                  placeholder="Portion"
                                  onKeyDown={e => { if (e.key === 'Enter') saveEditMeal(); if (e.key === 'Escape') setEditingMeal(null); }}
                                />
                              </div>
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <label className="text-xs text-blue-400 font-medium">Cal</label>
                                  <input
                                    value={editingMeal.calories}
                                    onChange={e => setEditingMeal({ ...editingMeal, calories: e.target.value })}
                                    className="w-full bg-grappler-900 border border-grappler-600 rounded-lg px-2 py-1 text-xs text-grappler-100 focus-visible:border-blue-500 outline-none"
                                    type="number" inputMode="numeric"
                                    onKeyDown={e => { if (e.key === 'Enter') saveEditMeal(); if (e.key === 'Escape') setEditingMeal(null); }}
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="text-xs text-red-400 font-medium">Protein</label>
                                  <input
                                    value={editingMeal.protein}
                                    onChange={e => setEditingMeal({ ...editingMeal, protein: e.target.value })}
                                    className="w-full bg-grappler-900 border border-grappler-600 rounded-lg px-2 py-1 text-xs text-grappler-100 focus-visible:border-red-500 outline-none"
                                    type="number" inputMode="decimal"
                                    onKeyDown={e => { if (e.key === 'Enter') saveEditMeal(); if (e.key === 'Escape') setEditingMeal(null); }}
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="text-xs text-blue-400 font-medium">Carbs</label>
                                  <input
                                    value={editingMeal.carbs}
                                    onChange={e => setEditingMeal({ ...editingMeal, carbs: e.target.value })}
                                    className="w-full bg-grappler-900 border border-grappler-600 rounded-lg px-2 py-1 text-xs text-grappler-100 focus-visible:border-blue-500 outline-none"
                                    type="number" inputMode="decimal"
                                    onKeyDown={e => { if (e.key === 'Enter') saveEditMeal(); if (e.key === 'Escape') setEditingMeal(null); }}
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="text-xs text-yellow-400 font-medium">Fat</label>
                                  <input
                                    value={editingMeal.fat}
                                    onChange={e => setEditingMeal({ ...editingMeal, fat: e.target.value })}
                                    className="w-full bg-grappler-900 border border-grappler-600 rounded-lg px-2 py-1 text-xs text-grappler-100 focus-visible:border-yellow-500 outline-none"
                                    type="number" inputMode="decimal"
                                    onKeyDown={e => { if (e.key === 'Enter') saveEditMeal(); if (e.key === 'Escape') setEditingMeal(null); }}
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setEditingMeal(null)}
                                  className="px-3 py-1 text-xs rounded-lg text-grappler-400 hover:bg-grappler-700 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={saveEditMeal}
                                  className="px-3 py-1 text-xs rounded-lg bg-primary-600 text-white hover:bg-primary-500 transition-colors flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* ── Display mode ── */
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-grappler-200 font-medium truncate">
                                  {meal.name}
                                  {meal.portion && (
                                    <span className="text-grappler-500 font-normal ml-1">({meal.portion})</span>
                                  )}
                                </p>
                                <div className="flex gap-3 mt-0.5 text-xs">
                                  <span className="text-blue-400">
                                    {Math.round(meal.calories)} kcal
                                  </span>
                                  <span className="text-red-400">
                                    {+meal.protein.toFixed(1)}g P
                                  </span>
                                  <span className="text-blue-400">
                                    {+meal.carbs.toFixed(1)}g C
                                  </span>
                                  <span className="text-yellow-400">
                                    {+meal.fat.toFixed(1)}g F
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-0.5 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => startEditMeal(meal)}
                                  className="p-1.5 rounded hover:bg-grappler-700 text-grappler-500 hover:text-grappler-200 active:text-grappler-200 transition-colors"
                                  title="Edit meal"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setMovingMealId(movingMealId === meal.id ? null : meal.id)}
                                  className="p-1.5 rounded hover:bg-grappler-700 text-grappler-500 hover:text-primary-400 active:text-primary-400 transition-colors"
                                  title="Move to different meal"
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeletingMealId(deletingMealId === meal.id ? null : meal.id)}
                                  className="p-1.5 rounded hover:bg-grappler-700 text-grappler-500 hover:text-red-400 active:text-red-400 transition-colors"
                                  title="Delete meal"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              {/* Move-to dropdown */}
                              <AnimatePresence>
                                {movingMealId === meal.id && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                    className="absolute right-0 top-full mt-1 z-20 bg-grappler-800 border border-grappler-700 rounded-xl shadow-lg overflow-hidden min-w-[160px]"
                                  >
                                    <p className="px-3 py-1.5 text-xs text-grappler-400 uppercase tracking-wide font-medium">Move to</p>
                                    {MEAL_TYPE_ORDER.filter(t => t !== type).map(t => (
                                      <button
                                        key={t}
                                        onClick={() => handleMoveMeal(meal.id, t)}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-grappler-200 hover:bg-grappler-700 transition-colors"
                                      >
                                        {MEAL_TYPE_ICONS[t]}
                                        <span>{MEAL_TYPE_LABELS[t]}</span>
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                              {/* Delete confirmation */}
                              <AnimatePresence>
                                {deletingMealId === meal.id && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-2 flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2"
                                  >
                                    <span className="text-xs text-red-300 flex-1">Delete {meal.name}?</span>
                                    <button
                                      onClick={() => setDeletingMealId(null)}
                                      className="px-2.5 py-1 text-xs rounded-md bg-grappler-700 text-grappler-300 hover:bg-grappler-600 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMeal(meal.id)}
                                      className="px-2.5 py-1 text-xs rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 font-medium transition-colors"
                                    >
                                      Delete
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* ── Summary Footer ── */}
        {todayMeals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-grappler-800 rounded-xl p-4"
          >
            <h2 className="text-sm font-semibold text-grappler-200 uppercase tracking-wide mb-3">
              Daily Summary
            </h2>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-blue-400">
                  {totals.calories}
                </p>
                <p className="text-xs text-grappler-400">
                  / {contextualNutrition.adjustedTargets.calories} kcal
                </p>
                <p className="text-xs text-grappler-400 mt-0.5">
                  {Math.max(Math.round(contextualNutrition.adjustedTargets.calories - totals.calories), 0)} left
                </p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-400">
                  {totals.protein}g
                </p>
                <p className="text-xs text-grappler-400">
                  / {contextualNutrition.adjustedTargets.protein}g Pro
                </p>
                <p className="text-xs text-grappler-400 mt-0.5">
                  {+Math.max(contextualNutrition.adjustedTargets.protein - totals.protein, 0).toFixed(1)}g left
                </p>
              </div>
              <div>
                <p className="text-lg font-bold text-blue-400">
                  {totals.carbs}g
                </p>
                <p className="text-xs text-grappler-400">
                  / {contextualNutrition.adjustedTargets.carbs}g Carbs
                </p>
                <p className="text-xs text-grappler-400 mt-0.5">
                  {+Math.max(contextualNutrition.adjustedTargets.carbs - totals.carbs, 0).toFixed(1)}g left
                </p>
              </div>
              <div>
                <p className="text-lg font-bold text-yellow-400">
                  {totals.fat}g
                </p>
                <p className="text-xs text-grappler-400">
                  / {contextualNutrition.adjustedTargets.fat}g Fat
                </p>
                <p className="text-xs text-grappler-400 mt-0.5">
                  {+Math.max(contextualNutrition.adjustedTargets.fat - totals.fat, 0).toFixed(1)}g left
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Nutrition Trends */}
        <NutritionTrends meals={meals} macroTargets={macroTargets} />
      </div>
    </motion.div>
  );
}
