'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Droplets,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
} from 'lucide-react';
import { MealEntry, MealType } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { useNutrition } from '@/hooks/useNutrition';
import NutritionInsights from './NutritionInsights';

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  pre_workout: 'Pre-Workout',
  post_workout: 'Post-Workout',
};

// ── Calorie Ring ──
function CalorieRing({ current, target }: { current: number; target: number }) {
  const size = 160;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(current / Math.max(target, 1), 1);
  const offset = circumference - progress * circumference;
  const isOver = current > target;
  const remaining = Math.max(target - current, 0);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-grappler-800"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isOver ? '#ef4444' : '#3b82f6'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-3xl font-bold', isOver ? 'text-red-400' : 'text-grappler-50')}>
          {remaining > 0 ? remaining : current}
        </span>
        <span className="text-xs text-grappler-400">
          {remaining > 0 ? 'kcal left' : 'kcal eaten'}
        </span>
        {remaining > 0 && (
          <span className="text-xs text-grappler-500 mt-0.5">
            {current} / {target}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Macro Bar ──
function MacroBar({ label, current, target, color }: {
  label: string;
  current: number;
  target: number;
  color: string;
}) {
  const progress = Math.min(current / Math.max(target, 1), 1);
  const isOver = current > target;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold text-grappler-400 w-4 text-right">{label}</span>
      <div className="flex-1 h-2 bg-grappler-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: isOver ? '#ef4444' : color }}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className={cn('text-xs font-medium w-20 text-right', isOver ? 'text-red-400' : 'text-grappler-300')}>
        {current}
        <span className="text-grappler-500">/{target}g</span>
      </span>
    </div>
  );
}

// ── Water Tracker (inline) ──
function WaterRow({ glasses, target, onChange }: {
  glasses: number;
  target: number;
  onChange: (val: number) => void;
}) {
  const ml = glasses * 250;
  const targetMl = target * 250;
  const pct = target > 0 ? Math.min((glasses / target) * 100, 100) : 0;
  const overTarget = glasses > target;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-medium text-grappler-300">Water</span>
        </div>
        <span className="text-xs text-grappler-400 tabular-nums">
          <span className={cn('font-semibold', overTarget ? 'text-blue-400' : 'text-grappler-200')}>
            {ml >= 1000 ? `${(ml / 1000).toFixed(1)}L` : `${ml}ml`}
          </span>
          <span className="text-grappler-600 mx-1">/</span>
          {targetMl >= 1000 ? `${(targetMl / 1000).toFixed(1)}L` : `${targetMl}ml`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 bg-grappler-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={cn(
            'h-full rounded-full',
            overTarget ? 'bg-blue-400' : 'bg-blue-500/70'
          )}
        />
        {overTarget && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[9px] font-bold text-white drop-shadow-sm">
              +{((glasses - target) * 250) >= 1000
                ? `${(((glasses - target) * 250) / 1000).toFixed(1)}L`
                : `${(glasses - target) * 250}ml`} extra
            </span>
          </div>
        )}
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, glasses - 1))}
          disabled={glasses <= 0}
          className="p-2 bg-grappler-800 hover:bg-grappler-700 disabled:opacity-30 rounded-lg transition-colors"
        >
          <Minus className="w-3.5 h-3.5 text-grappler-300" />
        </button>
        <div className="flex-1 flex items-center justify-center gap-1.5">
          <span className="text-lg font-bold text-grappler-100 tabular-nums">{glasses}</span>
          <span className="text-xs text-grappler-500">glasses</span>
        </div>
        <button
          onClick={() => onChange(glasses + 1)}
          className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors ring-1 ring-blue-500/20"
        >
          <Plus className="w-3.5 h-3.5 text-blue-300" />
        </button>
      </div>
    </div>
  );
}

// ── Meal Row ──
function MealRow({ meal, onDelete, onEdit }: {
  meal: MealEntry;
  onDelete: (id: string) => void;
  onEdit: (meal: MealEntry) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="group">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 py-2.5 px-1 hover:bg-grappler-800/50 rounded-lg transition-colors"
      >
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm text-grappler-100 truncate">{meal.name}</p>
          <p className="text-xs text-grappler-500">{MEAL_TYPE_LABELS[meal.mealType]}{meal.portion ? ` · ${meal.portion}` : ''}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-medium text-grappler-200">{meal.calories}</p>
          <p className="text-xs text-grappler-500">{meal.protein}p</p>
        </div>
        {expanded ? <ChevronUp className="w-3 h-3 text-grappler-600" /> : <ChevronDown className="w-3 h-3 text-grappler-600" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-1 pb-2 flex items-center gap-4">
              <div className="flex gap-4 text-xs text-grappler-400 flex-1">
                <span>P: {meal.protein}g</span>
                <span>C: {meal.carbs}g</span>
                <span>F: {meal.fat}g</span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(meal); }}
                  className="p-1.5 text-grappler-500 hover:text-grappler-200 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {confirming ? (
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(meal.id); }}
                      className="p-1.5 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirming(false); }}
                      className="p-1.5 text-grappler-500 hover:text-grappler-200 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
                    className="p-1.5 text-grappler-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Edit Meal Modal ──
function EditMealModal({ meal, onSave, onClose }: {
  meal: MealEntry;
  onSave: (id: string, updates: Partial<MealEntry>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(meal.name);
  const [calories, setCalories] = useState(String(meal.calories));
  const [protein, setProtein] = useState(String(meal.protein));
  const [carbs, setCarbs] = useState(String(meal.carbs));
  const [fat, setFat] = useState(String(meal.fat));
  const [portion, setPortion] = useState(meal.portion || '');

  const handleSave = () => {
    const cal = parseFloat(calories) || 0;
    if (!name.trim() || cal === 0) return;
    onSave(meal.id, {
      name: name.trim(),
      calories: Math.round(cal),
      protein: Math.round((parseFloat(protein) || 0) * 10) / 10,
      carbs: Math.round((parseFloat(carbs) || 0) * 10) / 10,
      fat: Math.round((parseFloat(fat) || 0) * 10) / 10,
      portion: portion.trim() || undefined,
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 200 }}
        animate={{ y: 0 }}
        exit={{ y: 200 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-grappler-900 rounded-t-2xl p-5 space-y-4 border-t border-grappler-700"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-grappler-200">Edit Meal</h3>
          <button onClick={onClose} className="text-grappler-500 hover:text-grappler-200"><X className="w-5 h-5" /></button>
        </div>

        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full bg-grappler-800 rounded-lg px-3 py-2.5 text-sm text-grappler-100 placeholder-grappler-600 outline-none focus:ring-1 focus:ring-primary-500/50"
          placeholder="Food name"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-grappler-500 mb-1 block">Calories</label>
            <input value={calories} onChange={e => setCalories(e.target.value)} type="number" inputMode="numeric"
              className="w-full bg-grappler-800 rounded-lg px-3 py-2 text-sm text-grappler-100 outline-none focus:ring-1 focus:ring-primary-500/50" />
          </div>
          <div>
            <label className="text-xs text-grappler-500 mb-1 block">Protein (g)</label>
            <input value={protein} onChange={e => setProtein(e.target.value)} type="number" inputMode="decimal"
              className="w-full bg-grappler-800 rounded-lg px-3 py-2 text-sm text-grappler-100 outline-none focus:ring-1 focus:ring-primary-500/50" />
          </div>
          <div>
            <label className="text-xs text-grappler-500 mb-1 block">Carbs (g)</label>
            <input value={carbs} onChange={e => setCarbs(e.target.value)} type="number" inputMode="decimal"
              className="w-full bg-grappler-800 rounded-lg px-3 py-2 text-sm text-grappler-100 outline-none focus:ring-1 focus:ring-primary-500/50" />
          </div>
          <div>
            <label className="text-xs text-grappler-500 mb-1 block">Fat (g)</label>
            <input value={fat} onChange={e => setFat(e.target.value)} type="number" inputMode="decimal"
              className="w-full bg-grappler-800 rounded-lg px-3 py-2 text-sm text-grappler-100 outline-none focus:ring-1 focus:ring-primary-500/50" />
          </div>
        </div>

        <input
          value={portion}
          onChange={e => setPortion(e.target.value)}
          className="w-full bg-grappler-800 rounded-lg px-3 py-2 text-sm text-grappler-100 placeholder-grappler-600 outline-none focus:ring-1 focus:ring-primary-500/50"
          placeholder="Portion (optional, e.g. 200g)"
        />

        <button
          onClick={handleSave}
          className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Save Changes
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Main Dashboard ──
interface NutritionDashboardProps {
  nutrition: ReturnType<typeof useNutrition>;
  onOpenLog: () => void;
}

export default function NutritionDashboard({ nutrition, onOpenLog }: NutritionDashboardProps) {
  const { meals, totals, targets, remaining, waterGlasses, setWaterGlasses, deleteMeal, updateMeal, contextualNutrition, allMeals, macroTargets, mealHistoryIndex } = nutrition;
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null);

  const waterTarget = Math.round((contextualNutrition.hydrationGoal || 3000) / 250);

  // Day type label
  const dayLabel = contextualNutrition.dayType === 'grappling_hard' ? 'Hard Grappling'
    : contextualNutrition.dayType === 'grappling_light' ? 'Light Grappling'
    : contextualNutrition.dayType === 'strength' ? 'Strength'
    : contextualNutrition.dayType === 'hypertrophy' ? 'Hypertrophy'
    : contextualNutrition.dayType === 'power' ? 'Power'
    : contextualNutrition.dayType === 'sparring' ? 'Sparring'
    : contextualNutrition.dayType === 'two_a_day' ? 'Two-a-Day'
    : contextualNutrition.dayType === 'fight_week' ? 'Fight Week'
    : contextualNutrition.dayType === 'tournament_day' ? 'Tournament'
    : contextualNutrition.dayType === 'travel' ? 'Travel'
    : 'Rest';

  const isDifferentFromBase = contextualNutrition.adjustedTargets.calories !== contextualNutrition.baseTargets.calories;

  return (
    <div className="space-y-5">
      {/* Context pill */}
      {isDifferentFromBase && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-500/10 border border-primary-500/20 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
            <span className="text-xs font-medium text-primary-300">
              {dayLabel} Day
            </span>
            <span className="text-xs text-grappler-400">
              {contextualNutrition.adjustedTargets.calories > contextualNutrition.baseTargets.calories ? '+' : ''}
              {contextualNutrition.adjustedTargets.calories - contextualNutrition.baseTargets.calories} kcal adjusted
            </span>
          </div>
        </motion.div>
      )}

      {/* Calorie ring + macro bars */}
      <div className="card p-5">
        <div className="flex items-center justify-center mb-5">
          <CalorieRing current={totals.calories} target={targets.calories} />
        </div>

        <div className="space-y-2.5">
          <MacroBar label="P" current={totals.protein} target={targets.protein} color="#ef4444" />
          <MacroBar label="C" current={totals.carbs} target={targets.carbs} color="#f59e0b" />
          <MacroBar label="F" current={totals.fat} target={targets.fat} color="#8b5cf6" />
        </div>

        {/* Water inline */}
        <div className="mt-4 pt-3 border-t border-grappler-800">
          <WaterRow glasses={waterGlasses} target={waterTarget} onChange={setWaterGlasses} />
        </div>
      </div>

      {/* Today's meals */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wide">
            Today&apos;s Meals
          </h3>
          <span className="text-xs text-grappler-500">{meals.length} logged</span>
        </div>

        {meals.length === 0 ? (
          <button
            onClick={onOpenLog}
            className="w-full py-8 flex flex-col items-center gap-2 text-grappler-500 hover:text-grappler-300 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-grappler-800 flex items-center justify-center">
              <span className="text-xl">+</span>
            </div>
            <span className="text-sm">Log your first meal</span>
          </button>
        ) : (
          <div className="divide-y divide-grappler-800/50">
            {meals.map(meal => (
              <MealRow
                key={meal.id}
                meal={meal}
                onDelete={deleteMeal}
                onEdit={setEditingMeal}
              />
            ))}
          </div>
        )}
      </div>

      {/* Smart Insights */}
      <NutritionInsights
        todayMeals={meals}
        allMeals={allMeals}
        targets={targets}
        remaining={remaining}
        totals={totals}
        macroTargets={macroTargets}
        mealHistoryIndex={mealHistoryIndex}
      />

      {/* Edit meal modal */}
      <AnimatePresence>
        {editingMeal && (
          <EditMealModal
            meal={editingMeal}
            onSave={updateMeal}
            onClose={() => setEditingMeal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
