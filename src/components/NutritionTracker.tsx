'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import {
  Apple,
  Droplets,
  Plus,
  X,
  ChevronLeft,
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
} from 'lucide-react';
import { MealType, MealEntry, MacroTargets, DailyNutrition } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

// ── Preset foods with realistic macros ──────────────────────────────────────
const PRESET_FOODS: Omit<MealEntry, 'id' | 'date' | 'mealType'>[] = [
  { name: 'Chicken Breast (6oz)', calories: 280, protein: 53, carbs: 0, fat: 6 },
  { name: 'White Rice (1 cup)', calories: 206, protein: 4, carbs: 45, fat: 0 },
  { name: 'Protein Shake', calories: 160, protein: 30, carbs: 5, fat: 2 },
  { name: 'Eggs (3 large)', calories: 234, protein: 18, carbs: 2, fat: 16 },
  { name: 'Salmon Fillet (6oz)', calories: 350, protein: 38, carbs: 0, fat: 22 },
  { name: 'Greek Yogurt (1 cup)', calories: 130, protein: 22, carbs: 8, fat: 0 },
  { name: 'Banana', calories: 105, protein: 1, carbs: 27, fat: 0 },
  { name: 'Oatmeal (1 cup)', calories: 307, protein: 11, carbs: 55, fat: 5 },
  { name: 'Sweet Potato (medium)', calories: 103, protein: 2, carbs: 24, fat: 0 },
  { name: 'Peanut Butter (2 tbsp)', calories: 190, protein: 7, carbs: 7, fat: 16 },
  { name: 'Avocado (half)', calories: 160, protein: 2, carbs: 9, fat: 15 },
  { name: 'Steak (8oz sirloin)', calories: 480, protein: 56, carbs: 0, fat: 28 },
];

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

const DEFAULT_TARGETS: MacroTargets = {
  calories: 2500,
  protein: 200,
  carbs: 280,
  fat: 80,
};

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
        <p className="text-[10px] text-grappler-500">
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
  const { user } = useAppStore();

  // ── Local state (nutrition not yet in zustand) ──
  const [macroTargets] = useState<MacroTargets>(DEFAULT_TARGETS);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [waterGlasses, setWaterGlasses] = useState(0);

  // ── Form state ──
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [formMealType, setFormMealType] = useState<MealType>('lunch');
  const [formName, setFormName] = useState('');
  const [formCalories, setFormCalories] = useState('');
  const [formProtein, setFormProtein] = useState('');
  const [formCarbs, setFormCarbs] = useState('');
  const [formFat, setFormFat] = useState('');

  // ── Computed totals ──
  const todayStr = new Date().toISOString().split('T')[0];

  const todayMeals = useMemo(
    () =>
      meals.filter(
        (m) => new Date(m.date).toISOString().split('T')[0] === todayStr
      ),
    [meals, todayStr]
  );

  const totals = useMemo(() => {
    return todayMeals.reduce(
      (acc, m) => ({
        calories: acc.calories + m.calories,
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fat: acc.fat + m.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [todayMeals]);

  const mealsByType = useMemo(() => {
    const grouped: Partial<Record<MealType, MealEntry[]>> = {};
    todayMeals.forEach((m) => {
      if (!grouped[m.mealType]) grouped[m.mealType] = [];
      grouped[m.mealType]!.push(m);
    });
    return grouped;
  }, [todayMeals]);

  // ── Water tracking ──
  const WATER_GOAL = 8; // glasses
  const waterLiters = +(waterGlasses * 0.25).toFixed(2);

  // ── Macro bar percentages ──
  const totalMacroGrams = totals.protein + totals.carbs + totals.fat;
  const proteinPct = totalMacroGrams > 0 ? (totals.protein / totalMacroGrams) * 100 : 0;
  const carbsPct = totalMacroGrams > 0 ? (totals.carbs / totalMacroGrams) * 100 : 0;
  const fatPct = totalMacroGrams > 0 ? (totals.fat / totalMacroGrams) * 100 : 0;

  // ── Handlers ──
  const resetForm = () => {
    setFormName('');
    setFormCalories('');
    setFormProtein('');
    setFormCarbs('');
    setFormFat('');
  };

  const handleAddMeal = () => {
    const cal = parseInt(formCalories) || 0;
    const pro = parseInt(formProtein) || 0;
    const carb = parseInt(formCarbs) || 0;
    const fat = parseInt(formFat) || 0;
    if (!formName.trim() || cal === 0) return;

    const entry: MealEntry = {
      id: uuidv4(),
      date: new Date(),
      mealType: formMealType,
      name: formName.trim(),
      calories: cal,
      protein: pro,
      carbs: carb,
      fat: fat,
    };

    setMeals((prev) => [...prev, entry]);
    resetForm();
    setShowAddForm(false);
  };

  const handlePresetAdd = (preset: (typeof PRESET_FOODS)[number]) => {
    const entry: MealEntry = {
      id: uuidv4(),
      date: new Date(),
      mealType: formMealType,
      name: preset.name,
      calories: preset.calories,
      protein: preset.protein,
      carbs: preset.carbs,
      fat: preset.fat,
    };
    setMeals((prev) => [...prev, entry]);
    setShowPresets(false);
  };

  const handleDeleteMeal = (id: string) => {
    setMeals((prev) => prev.filter((m) => m.id !== id));
  };

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
      <div className="sticky top-0 z-20 bg-grappler-900/95 backdrop-blur-sm border-b border-grappler-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
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
        {/* ── Macro Rings ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="card p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-grappler-200 uppercase tracking-wide">
              Daily Targets
            </h2>
            <p className="text-xs text-grappler-500">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <MacroRing
              label="Calories"
              current={totals.calories}
              target={macroTargets.calories}
              unit=""
              color="#f97316"
              size={76}
            />
            <MacroRing
              label="Protein"
              current={totals.protein}
              target={macroTargets.protein}
              unit="g"
              color="#ef4444"
              size={76}
            />
            <MacroRing
              label="Carbs"
              current={totals.carbs}
              target={macroTargets.carbs}
              unit="g"
              color="#3b82f6"
              size={76}
            />
            <MacroRing
              label="Fat"
              current={totals.fat}
              target={macroTargets.fat}
              unit="g"
              color="#eab308"
              size={76}
            />
          </div>

          {/* ── Macro breakdown bar ── */}
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
              <div className="flex justify-between text-[10px] text-grappler-400">
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
              Water Intake
            </h2>
            <span className="text-xs text-grappler-400">
              {waterLiters}L / {(WATER_GOAL * 0.25).toFixed(1)}L
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {Array.from({ length: WATER_GOAL }, (_, i) => (
              <motion.button
                key={i}
                whileTap={{ scale: 0.85 }}
                onClick={() => setWaterGlasses(i < waterGlasses ? i : i + 1)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
                  i < waterGlasses
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                    : 'bg-grappler-700/40 text-grappler-600 border border-grappler-700/60'
                }`}
              >
                <Droplet
                  className={`w-4 h-4 ${
                    i < waterGlasses ? 'fill-blue-400' : ''
                  }`}
                />
              </motion.button>
            ))}
          </div>

          <p className="text-xs text-grappler-500 mt-2">
            {waterGlasses}/{WATER_GOAL} glasses
            {waterGlasses >= WATER_GOAL && (
              <span className="text-blue-400 ml-1 font-medium">
                {' '}
                -- Goal reached!
              </span>
            )}
          </p>
        </motion.div>

        {/* ── Quick Add / Add Meal ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="card p-4"
        >
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
                Quick Add
              </button>
              <button
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  setShowPresets(false);
                }}
                className="btn btn-primary btn-sm gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Custom
              </button>
            </div>
          </div>

          {/* Meal type selector (shared) */}
          {(showAddForm || showPresets) && (
            <div className="mb-3">
              <label className="text-xs text-grappler-400 mb-1.5 block">
                Meal Type
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

          {/* ── Preset foods grid ── */}
          <AnimatePresence>
            {showPresets && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-2 pb-1">
                  {PRESET_FOODS.map((preset, idx) => (
                    <motion.button
                      key={preset.name}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => handlePresetAdd(preset)}
                      className="bg-grappler-700/30 hover:bg-grappler-700/60 border border-grappler-700/50 rounded-lg p-2.5 text-left transition-all group"
                    >
                      <p className="text-xs font-medium text-grappler-200 group-hover:text-grappler-50 truncate">
                        {preset.name}
                      </p>
                      <div className="flex gap-2 mt-1 text-[10px] text-grappler-500">
                        <span className="text-orange-400/80">
                          {preset.calories}cal
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
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Custom meal form ── */}
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
                  <div>
                    <label className="text-xs text-grappler-400 mb-1 block">
                      Food Name
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g., Grilled chicken salad"
                      className="input"
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-grappler-400 mb-1 block flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-400" />
                        Calories
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
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
                        type="number"
                        inputMode="numeric"
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
                        type="number"
                        inputMode="numeric"
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
                        type="number"
                        inputMode="numeric"
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
                      className="btn btn-primary btn-sm flex-1"
                    >
                      Add Meal
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
            Today&apos;s Meals
          </h2>

          {todayMeals.length === 0 ? (
            <div className="text-center py-8">
              <Apple className="w-10 h-10 text-grappler-700 mx-auto mb-2" />
              <p className="text-sm text-grappler-500">
                No meals logged yet today.
              </p>
              <p className="text-xs text-grappler-600 mt-1">
                Use Quick Add or Custom above to start tracking.
              </p>
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
                      <span className="text-xs text-grappler-500">
                        {typeCalories} cal
                      </span>
                    </div>

                    <div className="space-y-1">
                      {typeMeals.map((meal, idx) => (
                        <motion.div
                          key={meal.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-center justify-between py-2 px-3 bg-grappler-800/40 rounded-lg group"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-grappler-200 font-medium truncate">
                              {meal.name}
                            </p>
                            <div className="flex gap-3 mt-0.5 text-[10px]">
                              <span className="text-orange-400">
                                {meal.calories} cal
                              </span>
                              <span className="text-red-400">
                                {meal.protein}g P
                              </span>
                              <span className="text-blue-400">
                                {meal.carbs}g C
                              </span>
                              <span className="text-yellow-400">
                                {meal.fat}g F
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteMeal(meal.id)}
                            className="p-1.5 rounded hover:bg-grappler-700 text-grappler-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
                <p className="text-lg font-bold text-orange-400">
                  {totals.calories}
                </p>
                <p className="text-[10px] text-grappler-500">
                  / {macroTargets.calories} cal
                </p>
                <p className="text-[10px] text-grappler-400 mt-0.5">
                  {Math.max(macroTargets.calories - totals.calories, 0)} left
                </p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-400">
                  {totals.protein}g
                </p>
                <p className="text-[10px] text-grappler-500">
                  / {macroTargets.protein}g pro
                </p>
                <p className="text-[10px] text-grappler-400 mt-0.5">
                  {Math.max(macroTargets.protein - totals.protein, 0)}g left
                </p>
              </div>
              <div>
                <p className="text-lg font-bold text-blue-400">
                  {totals.carbs}g
                </p>
                <p className="text-[10px] text-grappler-500">
                  / {macroTargets.carbs}g carb
                </p>
                <p className="text-[10px] text-grappler-400 mt-0.5">
                  {Math.max(macroTargets.carbs - totals.carbs, 0)}g left
                </p>
              </div>
              <div>
                <p className="text-lg font-bold text-yellow-400">
                  {totals.fat}g
                </p>
                <p className="text-[10px] text-grappler-500">
                  / {macroTargets.fat}g fat
                </p>
                <p className="text-[10px] text-grappler-400 mt-0.5">
                  {Math.max(macroTargets.fat - totals.fat, 0)}g left
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
