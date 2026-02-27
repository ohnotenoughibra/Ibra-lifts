'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Plus,
  Copy,
  Star,
  Clock,
  Zap,
  ChevronDown,
  Check,
  Trash2,
} from 'lucide-react';
import { MealType } from '@/lib/types';
import { PRESET_FOODS } from '@/lib/food-database';
import { cn } from '@/lib/utils';
import type { useNutrition, AutocompleteItem } from '@/hooks/useNutrition';

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  pre_workout: 'Pre-Workout',
  post_workout: 'Post-Workout',
};

interface NutritionLogSheetProps {
  nutrition: ReturnType<typeof useNutrition>;
  selectedDate: string;
}

export default function NutritionLogSheet({ nutrition, selectedDate }: NutritionLogSheetProps) {
  const {
    mealStamps,
    addMeal,
    addMealStamp,
    deleteMealStamp,
    useMealStamp,
    copyYesterdayMeals,
    searchFoods,
    estimateFood,
    autoMealType,
    yesterdayMeals,
    favoriteFoods,
    todayPatternMeals,
    remaining,
    isToday,
  } = nutrition;

  // ── State ──
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AutocompleteItem[]>([]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showStampManager, setShowStampManager] = useState(false);
  const [loggedFeedback, setLoggedFeedback] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Quick add state
  const [quickCal, setQuickCal] = useState('');
  const [quickProtein, setQuickProtein] = useState('');
  const [quickName, setQuickName] = useState('');

  // Manual entry state
  const [manualName, setManualName] = useState('');
  const [manualCal, setManualCal] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');
  const [manualPortion, setManualPortion] = useState('');
  const [manualMealType, setManualMealType] = useState<MealType>(autoMealType());
  const [saveAsStamp, setSaveAsStamp] = useState(false);

  // Search handler
  useEffect(() => {
    if (query.length >= 1) {
      setResults(searchFoods(query));
    } else {
      setResults([]);
    }
  }, [query, searchFoods]);

  // Log a food item
  const logFood = useCallback((item: { name: string; calories: number; protein: number; carbs: number; fat: number; portion?: string }, mealType?: MealType) => {
    addMeal({
      date: new Date(selectedDate + 'T12:00:00'),
      mealType: mealType || autoMealType(),
      name: item.name,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      portion: item.portion,
    });
    setLoggedFeedback(item.name);
    setTimeout(() => setLoggedFeedback(null), 1500);
    setQuery('');
    setResults([]);
  }, [addMeal, selectedDate, autoMealType]);

  // Log a stamp
  const logStamp = useCallback((stamp: typeof mealStamps[number]) => {
    useMealStamp(stamp.id);
    logFood({
      name: stamp.name,
      calories: stamp.calories,
      protein: stamp.protein,
      carbs: stamp.carbs,
      fat: stamp.fat,
    }, stamp.mealType);
  }, [useMealStamp, logFood]);

  // Quick add submit
  const handleQuickAdd = () => {
    const cal = parseFloat(quickCal) || 0;
    const pro = parseFloat(quickProtein) || 0;
    if (cal === 0) return;
    logFood({
      name: quickName.trim() || `Quick add (${cal} kcal)`,
      calories: cal,
      protein: pro,
      carbs: 0,
      fat: 0,
    });
    setQuickCal('');
    setQuickProtein('');
    setQuickName('');
    setShowQuickAdd(false);
  };

  // Manual entry submit
  const handleManualAdd = () => {
    const cal = parseFloat(manualCal) || 0;
    if (!manualName.trim() || cal === 0) return;
    const food = {
      name: manualName.trim(),
      calories: cal,
      protein: parseFloat(manualProtein) || 0,
      carbs: parseFloat(manualCarbs) || 0,
      fat: parseFloat(manualFat) || 0,
      portion: manualPortion.trim() || undefined,
    };
    logFood(food, manualMealType);
    if (saveAsStamp) {
      addMealStamp({
        name: food.name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        mealType: manualMealType,
      });
    }
    setManualName('');
    setManualCal('');
    setManualProtein('');
    setManualCarbs('');
    setManualFat('');
    setManualPortion('');
    setSaveAsStamp(false);
    setShowManual(false);
  };

  // Copy yesterday
  const handleCopyYesterday = () => {
    copyYesterdayMeals(selectedDate);
    setLoggedFeedback(`Copied ${yesterdayMeals.length} meals`);
    setTimeout(() => setLoggedFeedback(null), 1500);
  };

  // Sorted stamps: most used first, then most recent
  const sortedStamps = [...mealStamps].sort((a, b) => {
    const scoreA = a.timesUsed + (a.lastUsed && (Date.now() - new Date(a.lastUsed).getTime()) < 14 * 86400000 ? 3 : 0);
    const scoreB = b.timesUsed + (b.lastUsed && (Date.now() - new Date(b.lastUsed).getTime()) < 14 * 86400000 ? 3 : 0);
    return scoreB - scoreA;
  });

  return (
    <div className="space-y-4">
      {/* Logged feedback toast */}
      <AnimatePresence>
        {loggedFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-green-500/90 text-white text-sm font-medium rounded-full shadow-lg"
          >
            <Check className="w-3.5 h-3.5 inline mr-1.5" />
            {loggedFeedback} logged
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick actions row */}
      <div className="flex gap-2">
        {yesterdayMeals.length > 0 && (
          <button
            onClick={handleCopyYesterday}
            className="flex items-center gap-1.5 px-3 py-2 bg-grappler-800 hover:bg-grappler-700 rounded-xl text-xs text-grappler-300 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy Yesterday
          </button>
        )}
        <button
          onClick={() => setShowQuickAdd(!showQuickAdd)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-colors',
            showQuickAdd ? 'bg-primary-500/20 text-primary-300' : 'bg-grappler-800 hover:bg-grappler-700 text-grappler-300'
          )}
        >
          <Zap className="w-3.5 h-3.5" />
          Quick Add
        </button>
        <button
          onClick={() => setShowManual(!showManual)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-colors',
            showManual ? 'bg-primary-500/20 text-primary-300' : 'bg-grappler-800 hover:bg-grappler-700 text-grappler-300'
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          Manual
        </button>
      </div>

      {/* Quick Add form */}
      <AnimatePresence>
        {showQuickAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="card p-4 space-y-3">
              <p className="text-xs text-grappler-400">Just calories + protein. Fast.</p>
              <input
                value={quickName}
                onChange={e => setQuickName(e.target.value)}
                placeholder="Name (optional)"
                className="w-full bg-grappler-800 rounded-lg px-3 py-2 text-sm text-grappler-100 placeholder-grappler-600 outline-none focus:ring-1 focus:ring-primary-500/50"
              />
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-grappler-500 mb-1 block">Calories</label>
                  <input value={quickCal} onChange={e => setQuickCal(e.target.value)} type="number" inputMode="numeric"
                    placeholder="0"
                    className="w-full bg-grappler-800 rounded-lg px-3 py-2 text-sm text-grappler-100 outline-none focus:ring-1 focus:ring-primary-500/50" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-grappler-500 mb-1 block">Protein (g)</label>
                  <input value={quickProtein} onChange={e => setQuickProtein(e.target.value)} type="number" inputMode="numeric"
                    placeholder="0"
                    className="w-full bg-grappler-800 rounded-lg px-3 py-2 text-sm text-grappler-100 outline-none focus:ring-1 focus:ring-primary-500/50" />
                </div>
              </div>
              <button
                onClick={handleQuickAdd}
                disabled={!quickCal || parseFloat(quickCal) === 0}
                className="w-full py-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-30 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Log It
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Entry form */}
      <AnimatePresence>
        {showManual && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="card p-4 space-y-3">
              <input
                value={manualName}
                onChange={e => setManualName(e.target.value)}
                placeholder="Food name"
                className="w-full bg-grappler-800 rounded-lg px-3 py-2.5 text-sm text-grappler-100 placeholder-grappler-600 outline-none focus:ring-1 focus:ring-primary-500/50"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-grappler-500 mb-1 block">Calories</label>
                  <input value={manualCal} onChange={e => setManualCal(e.target.value)} type="number" inputMode="numeric"
                    className="w-full bg-grappler-800 rounded-lg px-3 py-2 text-sm text-grappler-100 outline-none focus:ring-1 focus:ring-primary-500/50" />
                </div>
                <div>
                  <label className="text-xs text-grappler-500 mb-1 block">Protein (g)</label>
                  <input value={manualProtein} onChange={e => setManualProtein(e.target.value)} type="number" inputMode="decimal"
                    className="w-full bg-grappler-800 rounded-lg px-3 py-2 text-sm text-grappler-100 outline-none focus:ring-1 focus:ring-primary-500/50" />
                </div>
                <div>
                  <label className="text-xs text-grappler-500 mb-1 block">Carbs (g)</label>
                  <input value={manualCarbs} onChange={e => setManualCarbs(e.target.value)} type="number" inputMode="decimal"
                    className="w-full bg-grappler-800 rounded-lg px-3 py-2 text-sm text-grappler-100 outline-none focus:ring-1 focus:ring-primary-500/50" />
                </div>
                <div>
                  <label className="text-xs text-grappler-500 mb-1 block">Fat (g)</label>
                  <input value={manualFat} onChange={e => setManualFat(e.target.value)} type="number" inputMode="decimal"
                    className="w-full bg-grappler-800 rounded-lg px-3 py-2 text-sm text-grappler-100 outline-none focus:ring-1 focus:ring-primary-500/50" />
                </div>
              </div>

              <input
                value={manualPortion}
                onChange={e => setManualPortion(e.target.value)}
                placeholder="Portion (optional, e.g. 200g)"
                className="w-full bg-grappler-800 rounded-lg px-3 py-2 text-sm text-grappler-100 placeholder-grappler-600 outline-none focus:ring-1 focus:ring-primary-500/50"
              />

              {/* Meal type selector */}
              <div className="flex gap-1.5 flex-wrap">
                {(Object.keys(MEAL_TYPE_LABELS) as MealType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setManualMealType(type)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs transition-colors',
                      manualMealType === type ? 'bg-primary-500/20 text-primary-300 font-medium' : 'bg-grappler-800 text-grappler-400'
                    )}
                  >
                    {MEAL_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 text-xs text-grappler-400">
                <input type="checkbox" checked={saveAsStamp} onChange={e => setSaveAsStamp(e.target.checked)}
                  className="rounded border-grappler-600 bg-grappler-800" />
                Save as favorite stamp
              </label>

              <button
                onClick={handleManualAdd}
                disabled={!manualName.trim() || !manualCal || parseFloat(manualCal) === 0}
                className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-30 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Log Meal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Meal Stamps */}
      {sortedStamps.length > 0 && !showManual && !showQuickAdd && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wide">Favorites</h3>
            <button
              onClick={() => setShowStampManager(!showStampManager)}
              className="text-xs text-grappler-500 hover:text-grappler-300"
            >
              {showStampManager ? 'Done' : 'Edit'}
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {sortedStamps.slice(0, showStampManager ? undefined : 6).map(stamp => (
              <button
                key={stamp.id}
                onClick={() => showStampManager ? deleteMealStamp(stamp.id) : logStamp(stamp)}
                className={cn(
                  'group relative px-3 py-2 rounded-xl text-xs transition-all',
                  showStampManager
                    ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                    : 'bg-grappler-800 hover:bg-grappler-700 text-grappler-200 active:scale-95'
                )}
              >
                <span className="font-medium">{stamp.name}</span>
                <span className="text-grappler-500 ml-1.5">{stamp.calories}</span>
                {showStampManager && (
                  <Trash2 className="w-3 h-3 inline ml-1.5 text-red-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Day-of-week pattern suggestions */}
      {todayPatternMeals.length > 0 && !showManual && !showQuickAdd && query.length === 0 && (
        <div>
          <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wide mb-2">
            Your {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]} regulars
          </h3>
          <div className="space-y-1">
            {todayPatternMeals.slice(0, 4).map((food, i) => (
              <button
                key={i}
                onClick={() => logFood(food)}
                className="w-full flex items-center gap-3 p-2.5 bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/10 rounded-xl transition-colors"
              >
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm text-grappler-200 truncate">{food.name}</p>
                </div>
                <span className="text-xs text-grappler-400 shrink-0">{food.calories} kcal · {food.protein}p</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grappler-500" />
          <input
            ref={searchRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search foods..."
            className="w-full bg-grappler-800 rounded-xl pl-10 pr-10 py-3 text-sm text-grappler-100 placeholder-grappler-600 outline-none focus:ring-1 focus:ring-primary-500/50"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-grappler-500 hover:text-grappler-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search results */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mt-2 space-y-1"
            >
              {results.map((item, i) => (
                <button
                  key={`${item.name}-${i}`}
                  onClick={() => logFood(item)}
                  className="w-full flex items-center gap-3 p-2.5 bg-grappler-800/50 hover:bg-grappler-800 rounded-xl transition-colors"
                >
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-grappler-200 truncate">{item.name}</p>
                      {item.dayPattern && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded-full shrink-0">
                          {item.dayPattern}
                        </span>
                      )}
                      {item.source === 'history' && !item.dayPattern && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-sky-500/20 text-sky-300 rounded-full shrink-0">
                          {item.count}x
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-grappler-400 shrink-0">
                    {item.calories} kcal · {item.protein}p
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* No results + estimation attempt */}
        {query.length >= 2 && results.length === 0 && (
          <div className="mt-2 p-3 bg-grappler-800/50 rounded-xl">
            <p className="text-xs text-grappler-500">No matches found. Try a different name or use Manual entry.</p>
          </div>
        )}
      </div>

      {/* Remaining macros hint */}
      {!showManual && !showQuickAdd && query.length === 0 && (
        <div className="card p-3">
          <p className="text-xs text-grappler-500 mb-1.5">Still need today:</p>
          <div className="flex gap-4 text-xs">
            <span className="text-blue-300">{Math.round(nutrition.remaining.calories)} kcal</span>
            <span className="text-red-300">{Math.round(nutrition.remaining.protein)}g P</span>
            <span className="text-amber-300">{Math.round(nutrition.remaining.carbs)}g C</span>
            <span className="text-purple-300">{Math.round(nutrition.remaining.fat)}g F</span>
          </div>
        </div>
      )}
    </div>
  );
}
