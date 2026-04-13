'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
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
  Minus,
  ScanBarcode,
} from 'lucide-react';
import { MealType } from '@/lib/types';
import { PRESET_FOODS } from '@/lib/food-database';
import { cn } from '@/lib/utils';
import type { useNutrition, AutocompleteItem } from '@/hooks/useNutrition';

const BarcodeScanner = dynamic(() => import('@/components/BarcodeScanner'), { ssr: false });

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
  const [showScanner, setShowScanner] = useState(false);
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

  // Portion selector state
  const [pendingFood, setPendingFood] = useState<{ name: string; calories: number; protein: number; carbs: number; fat: number; portion?: string; mealType?: MealType } | null>(null);
  const [portionMultiplier, setPortionMultiplier] = useState(1);
  const [customServings, setCustomServings] = useState('');

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

  // Select a food item for portion adjustment before logging
  const selectFood = useCallback((item: { name: string; calories: number; protein: number; carbs: number; fat: number; portion?: string; mealType?: MealType }) => {
    setPendingFood(item);
    setPortionMultiplier(1);
    setCustomServings('');
  }, []);

  // Confirm and log the pending food with portion multiplier applied
  const confirmFood = useCallback(() => {
    if (!pendingFood) return;
    const m = portionMultiplier;
    const portionLabel = m === 1 ? pendingFood.portion : `${m}× serving`;
    logFood({
      name: pendingFood.name,
      calories: Math.round(pendingFood.calories * m),
      protein: Math.round(pendingFood.protein * m),
      carbs: Math.round(pendingFood.carbs * m),
      fat: Math.round(pendingFood.fat * m),
      portion: portionLabel,
    }, pendingFood.mealType);
    setPendingFood(null);
  }, [pendingFood, portionMultiplier, logFood]);

  // Log a stamp (via portion selector)
  const logStamp = useCallback((stamp: typeof mealStamps[number]) => {
    useMealStamp(stamp.id);
    selectFood({
      name: stamp.name,
      calories: stamp.calories,
      protein: stamp.protein,
      carbs: stamp.carbs,
      fat: stamp.fat,
      mealType: stamp.mealType,
    });
  }, [useMealStamp, selectFood]);

  // Quick add submit
  const handleQuickAdd = () => {
    const cal = parseFloat(quickCal.replace(',', '.')) || 0;
    const pro = parseFloat(quickProtein.replace(',', '.')) || 0;
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
    const cal = parseFloat(manualCal.replace(',', '.')) || 0;
    if (!manualName.trim() || cal === 0) return;
    const food = {
      name: manualName.trim(),
      calories: cal,
      protein: parseFloat(manualProtein.replace(',', '.')) || 0,
      carbs: parseFloat(manualCarbs.replace(',', '.')) || 0,
      fat: parseFloat(manualFat.replace(',', '.')) || 0,
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
                  <input value={quickCal} onChange={e => setQuickCal(e.target.value.replace(/[^0-9.,]/g, ''))} type="text" inputMode="decimal"
                    placeholder="0"
                    className="w-full bg-grappler-800 rounded-lg px-3 py-2 text-sm text-grappler-100 outline-none focus:ring-1 focus:ring-primary-500/50" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-grappler-500 mb-1 block">Protein (g)</label>
                  <input value={quickProtein} onChange={e => setQuickProtein(e.target.value.replace(/[^0-9.,]/g, ''))} type="text" inputMode="decimal"
                    placeholder="0"
                    className="w-full bg-grappler-800 rounded-lg px-3 py-2 text-sm text-grappler-100 outline-none focus:ring-1 focus:ring-primary-500/50" />
                </div>
              </div>
              <button
                onClick={handleQuickAdd}
                disabled={!quickCal || parseFloat(quickCal.replace(',', '.')) === 0}
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
                  <input value={manualCal} onChange={e => setManualCal(e.target.value.replace(/[^0-9.,]/g, ''))} type="text" inputMode="decimal"
                    className="w-full bg-grappler-800 rounded-lg px-3 py-2 text-sm text-grappler-100 outline-none focus:ring-1 focus:ring-primary-500/50" />
                </div>
                <div>
                  <label className="text-xs text-grappler-500 mb-1 block">Protein (g)</label>
                  <input value={manualProtein} onChange={e => setManualProtein(e.target.value.replace(/[^0-9.,]/g, ''))} type="text" inputMode="decimal"
                    className="w-full bg-grappler-800 rounded-lg px-3 py-2 text-sm text-grappler-100 outline-none focus:ring-1 focus:ring-primary-500/50" />
                </div>
                <div>
                  <label className="text-xs text-grappler-500 mb-1 block">Carbs (g)</label>
                  <input value={manualCarbs} onChange={e => setManualCarbs(e.target.value.replace(/[^0-9.,]/g, ''))} type="text" inputMode="decimal"
                    className="w-full bg-grappler-800 rounded-lg px-3 py-2 text-sm text-grappler-100 outline-none focus:ring-1 focus:ring-primary-500/50" />
                </div>
                <div>
                  <label className="text-xs text-grappler-500 mb-1 block">Fat (g)</label>
                  <input value={manualFat} onChange={e => setManualFat(e.target.value.replace(/[^0-9.,]/g, ''))} type="text" inputMode="decimal"
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

      {/* Most-logged foods — one-tap repeat */}
      {favoriteFoods.length > 0 && sortedStamps.length === 0 && !showManual && !showQuickAdd && query.length === 0 && (
        <div>
          <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wide mb-2">
            Most logged
          </h3>
          <div className="flex gap-2 flex-wrap">
            {favoriteFoods.slice(0, 6).map((food, i) => (
              <button
                key={i}
                onClick={() => selectFood(food)}
                className="px-3 py-2 rounded-xl text-xs bg-grappler-800 hover:bg-grappler-700 text-grappler-200 active:scale-95 transition-all"
              >
                <span className="font-medium">{food.name}</span>
                <span className="text-grappler-500 ml-1.5">{food.calories}kcal</span>
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
                onClick={() => selectFood(food)}
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

      {/* Portion Selector */}
      <AnimatePresence>
        {pendingFood && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card p-4 space-y-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-grappler-100 truncate">{pendingFood.name}</p>
                <p className="text-xs text-grappler-500 mt-0.5">
                  Per serving: {pendingFood.calories} kcal · {pendingFood.protein}p · {pendingFood.carbs}c · {pendingFood.fat}f
                </p>
              </div>
              <button
                onClick={() => setPendingFood(null)}
                className="p-1.5 hover:bg-grappler-700 rounded-lg transition-colors ml-2"
              >
                <X className="w-4 h-4 text-grappler-400" />
              </button>
            </div>

            {/* Serving size selector */}
            <div>
              <p className="text-xs text-grappler-400 mb-2">Serving size</p>
              <div className="flex items-center gap-2">
                {/* Preset buttons */}
                {[
                  { label: '½', value: 0.5 },
                  { label: '¾', value: 0.75 },
                  { label: '1', value: 1 },
                  { label: '1½', value: 1.5 },
                  { label: '2', value: 2 },
                ].map(preset => (
                  <button
                    key={preset.value}
                    onClick={() => { setPortionMultiplier(preset.value); setCustomServings(''); }}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                      portionMultiplier === preset.value && !customServings
                        ? 'bg-primary-500/20 text-primary-300 ring-1 ring-primary-500/30'
                        : 'bg-grappler-800 text-grappler-400 hover:bg-grappler-700'
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Custom amount row */}
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => {
                    const next = Math.max(0.25, portionMultiplier - 0.25);
                    setPortionMultiplier(next);
                    setCustomServings(String(next));
                  }}
                  className="p-2 bg-grappler-800 hover:bg-grappler-700 rounded-lg transition-colors"
                >
                  <Minus className="w-3.5 h-3.5 text-grappler-300" />
                </button>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.25"
                  value={customServings || (portionMultiplier !== 1 && ![0.5, 0.75, 1.5, 2].includes(portionMultiplier) ? portionMultiplier : '')}
                  onChange={e => {
                    const v = e.target.value;
                    setCustomServings(v);
                    const n = parseFloat(v);
                    if (n > 0 && n <= 10) setPortionMultiplier(n);
                  }}
                  placeholder="Custom"
                  className="flex-1 bg-grappler-800 rounded-lg px-3 py-2 text-sm text-center text-grappler-100 placeholder-grappler-600 outline-none focus:ring-1 focus:ring-primary-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  onClick={() => {
                    const next = Math.min(10, portionMultiplier + 0.25);
                    setPortionMultiplier(next);
                    setCustomServings(String(next));
                  }}
                  className="p-2 bg-grappler-800 hover:bg-grappler-700 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-grappler-300" />
                </button>
              </div>
            </div>

            {/* Scaled macros preview */}
            <div className="flex items-center justify-between bg-grappler-800/50 rounded-xl p-2.5">
              <div className="flex gap-3 text-xs">
                <span className="text-blue-300 font-medium">{Math.round(pendingFood.calories * portionMultiplier)} kcal</span>
                <span className="text-red-300">{Math.round(pendingFood.protein * portionMultiplier)}p</span>
                <span className="text-amber-300">{Math.round(pendingFood.carbs * portionMultiplier)}c</span>
                <span className="text-purple-300">{Math.round(pendingFood.fat * portionMultiplier)}f</span>
              </div>
              {portionMultiplier !== 1 && (
                <span className="text-xs text-primary-400 font-bold">{portionMultiplier}× serving</span>
              )}
            </div>

            {/* Log button */}
            <button
              onClick={confirmFood}
              className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors active:scale-[0.98]"
            >
              Log It
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search + Barcode scanner */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
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
          <button
            onClick={() => setShowScanner(true)}
            className="shrink-0 w-12 flex items-center justify-center bg-grappler-800 hover:bg-grappler-700 rounded-xl transition-colors"
            aria-label="Scan barcode"
            title="Scan barcode"
          >
            <ScanBarcode className="w-5 h-5 text-primary-400" />
          </button>
        </div>

        {/* Barcode scanner modal */}
        <AnimatePresence>
          {showScanner && (
            <BarcodeScanner
              onAdd={(item, mt) => {
                logFood(item, mt);
                setShowScanner(false);
              }}
              onClose={() => setShowScanner(false)}
              defaultMealType={autoMealType()}
            />
          )}
        </AnimatePresence>

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
                  onClick={() => selectFood(item)}
                  className="w-full flex items-center gap-3 p-2.5 bg-grappler-800/50 hover:bg-grappler-800 rounded-xl transition-colors"
                >
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-grappler-200 truncate">{item.name}</p>
                      {item.dayPattern && (
                        <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded-full shrink-0">
                          {item.dayPattern}
                        </span>
                      )}
                      {item.source === 'history' && !item.dayPattern && (
                        <span className="text-xs px-1.5 py-0.5 bg-sky-500/20 text-sky-300 rounded-full shrink-0">
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
