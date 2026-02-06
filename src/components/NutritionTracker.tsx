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
  AlertCircle,
  Sparkles,
  Clock,
  Target,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Shield,
} from 'lucide-react';
import { MealType, MealEntry } from '@/lib/types';
import { getContextualNutrition, getSupplementRecommendations, type ContextualMacros } from '@/lib/contextual-nutrition';
import { cn } from '@/lib/utils';
import DietCoach from './DietCoach';

// ── Preset foods with metric portions ──────────────────────────────────────
const PRESET_FOODS: Omit<MealEntry, 'id' | 'date' | 'mealType'>[] = [
  // Protein sources
  { name: 'Chicken Breast (170g)', calories: 280, protein: 53, carbs: 0, fat: 6 },
  { name: 'Salmon Fillet (170g)', calories: 350, protein: 38, carbs: 0, fat: 22 },
  { name: 'Eggs (3 large)', calories: 234, protein: 18, carbs: 2, fat: 16 },
  { name: 'Lean Beef (200g)', calories: 320, protein: 44, carbs: 0, fat: 16 },
  { name: 'Turkey Breast (170g)', calories: 250, protein: 50, carbs: 0, fat: 5 },
  { name: 'Tuna (1 can, 140g)', calories: 180, protein: 40, carbs: 0, fat: 2 },
  { name: 'Shrimp (150g)', calories: 140, protein: 30, carbs: 1, fat: 2 },
  { name: 'Protein Shake (300ml)', calories: 160, protein: 30, carbs: 5, fat: 2 },
  // Dairy
  { name: 'Greek Yogurt (200g)', calories: 130, protein: 20, carbs: 8, fat: 0 },
  { name: 'Cottage Cheese (200g)', calories: 180, protein: 24, carbs: 6, fat: 5 },
  { name: 'Whole Milk (250ml)', calories: 150, protein: 8, carbs: 12, fat: 8 },
  { name: 'Mozzarella (60g)', calories: 170, protein: 12, carbs: 1, fat: 13 },
  // Carb sources
  { name: 'Oats (80g dry)', calories: 307, protein: 11, carbs: 55, fat: 5 },
  { name: 'White Rice (150g cooked)', calories: 195, protein: 4, carbs: 42, fat: 1 },
  { name: 'Brown Rice (150g cooked)', calories: 180, protein: 4, carbs: 38, fat: 2 },
  { name: 'Whole Wheat Bread (2 slices)', calories: 200, protein: 8, carbs: 36, fat: 3 },
  { name: 'Potatoes (250g)', calories: 178, protein: 5, carbs: 38, fat: 0 },
  { name: 'Sweet Potato (200g)', calories: 172, protein: 3, carbs: 40, fat: 0 },
  { name: 'Pasta (150g cooked)', calories: 220, protein: 8, carbs: 42, fat: 1 },
  // Fruits
  { name: 'Banana (1 medium)', calories: 105, protein: 1, carbs: 27, fat: 0 },
  { name: 'Apple (1 medium)', calories: 95, protein: 0, carbs: 25, fat: 0 },
  { name: 'Blueberries (150g)', calories: 86, protein: 1, carbs: 22, fat: 0 },
  { name: 'Strawberries (200g)', calories: 64, protein: 1, carbs: 15, fat: 0 },
  { name: 'Orange (1 medium)', calories: 62, protein: 1, carbs: 15, fat: 0 },
  { name: 'Grapes (150g)', calories: 104, protein: 1, carbs: 27, fat: 0 },
  { name: 'Mango (1 cup, 165g)', calories: 99, protein: 1, carbs: 25, fat: 1 },
  // Vegetables
  { name: 'Broccoli (150g)', calories: 51, protein: 4, carbs: 10, fat: 0 },
  { name: 'Spinach (100g)', calories: 23, protein: 3, carbs: 4, fat: 0 },
  { name: 'Mixed Salad (200g)', calories: 30, protein: 2, carbs: 5, fat: 0 },
  // Fats & snacks
  { name: 'Peanut Butter (30g)', calories: 190, protein: 7, carbs: 7, fat: 16 },
  { name: 'Avocado (half)', calories: 160, protein: 2, carbs: 9, fat: 15 },
  { name: 'Almonds (30g)', calories: 175, protein: 6, carbs: 6, fat: 15 },
  { name: 'Olive Oil (1 tbsp)', calories: 120, protein: 0, carbs: 0, fat: 14 },
  // Quick meals
  { name: 'Chicken & Rice Bowl', calories: 480, protein: 42, carbs: 52, fat: 10 },
  { name: 'Tuna Sandwich', calories: 380, protein: 28, carbs: 36, fat: 12 },
  { name: 'Protein Bar', calories: 220, protein: 20, carbs: 24, fat: 8 },
  // Drinks
  { name: 'Latte (250ml)', calories: 80, protein: 4, carbs: 6, fat: 4 },
  { name: 'Orange Juice (250ml)', calories: 112, protein: 2, carbs: 26, fat: 0 },
];

// ── Local food database for instant AI-free estimation ──────────────────────
// Keywords map to macros per typical serving. Used by fuzzy matcher below.
type FoodEntry = { keywords: string[]; name: string; calories: number; protein: number; carbs: number; fat: number };
const FOOD_DB: FoodEntry[] = [
  // Proteins
  { keywords: ['chicken', 'chicken breast'], name: 'Chicken Breast (170g)', calories: 280, protein: 53, carbs: 0, fat: 6 },
  { keywords: ['salmon'], name: 'Salmon Fillet (170g)', calories: 350, protein: 38, carbs: 0, fat: 22 },
  { keywords: ['egg', 'eggs'], name: 'Eggs (3 large)', calories: 234, protein: 18, carbs: 2, fat: 16 },
  { keywords: ['beef', 'steak'], name: 'Lean Beef (200g)', calories: 320, protein: 44, carbs: 0, fat: 16 },
  { keywords: ['turkey'], name: 'Turkey Breast (170g)', calories: 250, protein: 50, carbs: 0, fat: 5 },
  { keywords: ['tuna'], name: 'Tuna (1 can, 140g)', calories: 180, protein: 40, carbs: 0, fat: 2 },
  { keywords: ['shrimp', 'prawn', 'prawns'], name: 'Shrimp (150g)', calories: 140, protein: 30, carbs: 1, fat: 2 },
  { keywords: ['protein shake', 'whey', 'whey isolate', 'protein isolate', 'shake'], name: 'Whey Protein Shake (1 scoop)', calories: 120, protein: 27, carbs: 2, fat: 1 },
  { keywords: ['protein bar'], name: 'Protein Bar', calories: 220, protein: 20, carbs: 24, fat: 8 },
  { keywords: ['lamb'], name: 'Lamb (200g)', calories: 360, protein: 40, carbs: 0, fat: 22 },
  { keywords: ['pork', 'pork chop'], name: 'Pork (200g)', calories: 330, protein: 42, carbs: 0, fat: 18 },
  { keywords: ['chicken thigh', 'thigh'], name: 'Chicken Thigh (170g)', calories: 320, protein: 40, carbs: 0, fat: 18 },
  { keywords: ['ground beef', 'mince', 'ground meat'], name: 'Ground Beef (200g)', calories: 400, protein: 40, carbs: 0, fat: 26 },
  { keywords: ['cod', 'white fish', 'tilapia'], name: 'White Fish (170g)', calories: 180, protein: 38, carbs: 0, fat: 2 },
  // Dairy
  { keywords: ['greek yogurt', 'yogurt', 'yoghurt'], name: 'Greek Yogurt (200g)', calories: 130, protein: 20, carbs: 8, fat: 0 },
  { keywords: ['cottage cheese'], name: 'Cottage Cheese (200g)', calories: 180, protein: 24, carbs: 6, fat: 5 },
  { keywords: ['milk', 'whole milk'], name: 'Whole Milk (250ml)', calories: 150, protein: 8, carbs: 12, fat: 8 },
  { keywords: ['cheese', 'mozzarella', 'cheddar'], name: 'Cheese (60g)', calories: 170, protein: 12, carbs: 1, fat: 13 },
  // Carbs
  { keywords: ['rice', 'white rice'], name: 'White Rice (150g cooked)', calories: 195, protein: 4, carbs: 42, fat: 1 },
  { keywords: ['brown rice'], name: 'Brown Rice (150g cooked)', calories: 180, protein: 4, carbs: 38, fat: 2 },
  { keywords: ['oats', 'oatmeal', 'porridge'], name: 'Oats (80g dry)', calories: 307, protein: 11, carbs: 55, fat: 5 },
  { keywords: ['bread', 'toast'], name: 'Bread (2 slices)', calories: 200, protein: 8, carbs: 36, fat: 3 },
  { keywords: ['pasta', 'noodles', 'spaghetti', 'penne'], name: 'Pasta (150g cooked)', calories: 220, protein: 8, carbs: 42, fat: 1 },
  { keywords: ['potato', 'potatoes'], name: 'Potatoes (250g)', calories: 178, protein: 5, carbs: 38, fat: 0 },
  { keywords: ['sweet potato'], name: 'Sweet Potato (200g)', calories: 172, protein: 3, carbs: 40, fat: 0 },
  { keywords: ['tortilla', 'wrap'], name: 'Tortilla Wrap', calories: 180, protein: 5, carbs: 30, fat: 4 },
  { keywords: ['bagel'], name: 'Bagel', calories: 270, protein: 10, carbs: 52, fat: 2 },
  { keywords: ['cereal', 'granola'], name: 'Cereal/Granola (60g)', calories: 250, protein: 6, carbs: 44, fat: 6 },
  // Fruits
  { keywords: ['banana'], name: 'Banana (1 medium)', calories: 105, protein: 1, carbs: 27, fat: 0 },
  { keywords: ['apple'], name: 'Apple (1 medium)', calories: 95, protein: 0, carbs: 25, fat: 0 },
  { keywords: ['berries', 'blueberries', 'strawberries'], name: 'Berries (150g)', calories: 75, protein: 1, carbs: 18, fat: 0 },
  { keywords: ['orange'], name: 'Orange (1 medium)', calories: 62, protein: 1, carbs: 15, fat: 0 },
  { keywords: ['mango'], name: 'Mango (1 cup)', calories: 99, protein: 1, carbs: 25, fat: 1 },
  // Vegetables
  { keywords: ['broccoli'], name: 'Broccoli (150g)', calories: 51, protein: 4, carbs: 10, fat: 0 },
  { keywords: ['spinach'], name: 'Spinach (100g)', calories: 23, protein: 3, carbs: 4, fat: 0 },
  { keywords: ['salad'], name: 'Mixed Salad (200g)', calories: 30, protein: 2, carbs: 5, fat: 0 },
  // Fats
  { keywords: ['peanut butter', 'pb'], name: 'Peanut Butter (30g)', calories: 190, protein: 7, carbs: 7, fat: 16 },
  { keywords: ['avocado', 'avo'], name: 'Avocado (half)', calories: 160, protein: 2, carbs: 9, fat: 15 },
  { keywords: ['almonds', 'nuts'], name: 'Almonds/Nuts (30g)', calories: 175, protein: 6, carbs: 6, fat: 15 },
  { keywords: ['olive oil', 'oil'], name: 'Olive Oil (1 tbsp)', calories: 120, protein: 0, carbs: 0, fat: 14 },
  { keywords: ['butter'], name: 'Butter (1 tbsp)', calories: 102, protein: 0, carbs: 0, fat: 12 },
  // Drinks
  { keywords: ['latte', 'coffee'], name: 'Latte (250ml)', calories: 80, protein: 4, carbs: 6, fat: 4 },
  { keywords: ['orange juice', 'oj', 'juice'], name: 'Orange Juice (250ml)', calories: 112, protein: 2, carbs: 26, fat: 0 },
  { keywords: ['smoothie'], name: 'Fruit Smoothie (350ml)', calories: 220, protein: 5, carbs: 45, fat: 3 },
  { keywords: ['soda', 'coke', 'pepsi', 'sprite'], name: 'Soda (330ml)', calories: 140, protein: 0, carbs: 36, fat: 0 },
  // Quick meals
  { keywords: ['burger', 'hamburger'], name: 'Burger with Bun', calories: 540, protein: 34, carbs: 40, fat: 26 },
  { keywords: ['pizza'], name: 'Pizza (2 slices)', calories: 560, protein: 22, carbs: 64, fat: 24 },
  { keywords: ['burrito'], name: 'Burrito', calories: 550, protein: 28, carbs: 60, fat: 22 },
  { keywords: ['sandwich', 'sub'], name: 'Sandwich', calories: 400, protein: 24, carbs: 40, fat: 16 },
  { keywords: ['kebab', 'shawarma', 'gyro'], name: 'Kebab/Shawarma', calories: 500, protein: 35, carbs: 40, fat: 22 },
  { keywords: ['sushi', 'sushi roll'], name: 'Sushi (8 pieces)', calories: 350, protein: 18, carbs: 50, fat: 8 },
  { keywords: ['ramen'], name: 'Ramen Bowl', calories: 500, protein: 25, carbs: 60, fat: 18 },
  { keywords: ['fried rice'], name: 'Fried Rice (300g)', calories: 400, protein: 12, carbs: 55, fat: 14 },
  { keywords: ['stir fry', 'stir-fry'], name: 'Stir Fry with Protein', calories: 380, protein: 30, carbs: 30, fat: 14 },
  { keywords: ['acai', 'acai bowl'], name: 'Acai Bowl', calories: 380, protein: 6, carbs: 60, fat: 14 },
  { keywords: ['pancake', 'pancakes'], name: 'Pancakes (3)', calories: 350, protein: 10, carbs: 50, fat: 12 },
  { keywords: ['waffle', 'waffles'], name: 'Waffles (2)', calories: 380, protein: 8, carbs: 52, fat: 16 },
  // European / street food
  { keywords: ['currywurst', 'curry wurst'], name: 'Currywurst', calories: 450, protein: 20, carbs: 30, fat: 28 },
  { keywords: ['schnitzel', 'wiener schnitzel'], name: 'Schnitzel', calories: 520, protein: 35, carbs: 30, fat: 28 },
  { keywords: ['cordon bleu', 'cordon blue'], name: 'Cordon Bleu', calories: 620, protein: 38, carbs: 28, fat: 36 },
  { keywords: ['chicken curry', 'curry chicken'], name: 'Chicken Curry with Rice', calories: 550, protein: 35, carbs: 55, fat: 18 },
  { keywords: ['curry'], name: 'Curry (1 serving)', calories: 400, protein: 20, carbs: 40, fat: 18 },
  { keywords: ['d\u00f6ner', 'doner'], name: 'D\u00f6ner Kebab', calories: 550, protein: 35, carbs: 45, fat: 24 },
  { keywords: ['pommes', 'fries', 'french fries'], name: 'Fries (200g)', calories: 380, protein: 5, carbs: 48, fat: 20 },
  // Snacks / sweets
  { keywords: ['haribo', 'goldb\u00e4ren', 'gummy bear', 'gummy bears', 'gummi'], name: 'Haribo Goldb\u00e4ren (100g)', calories: 343, protein: 7, carbs: 77, fat: 0 },
  { keywords: ['chocolate', 'chocolate bar'], name: 'Chocolate Bar (50g)', calories: 270, protein: 4, carbs: 30, fat: 15 },
];

/**
 * Instant local macro estimation — fuzzy-matches user text against FOOD_DB.
 * Handles combos like "chicken and rice" by matching multiple items and summing.
 * Returns null if no reasonable match found (caller should fall back to AI).
 */
function estimateLocally(input: string): { name: string; calories: number; protein: number; carbs: number; fat: number } | null {
  const text = input.toLowerCase().trim();
  if (!text) return null;

  // Split on connectors: "and", "&", "+", ",", "with", "w/"
  const parts = text.split(/\s+(?:and|&|\+|with|w\/)\s+|,\s*/);

  const matched: FoodEntry[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Try exact keyword match first (longest keyword wins for specificity)
    let best: FoodEntry | null = null;
    let bestLen = 0;
    for (const food of FOOD_DB) {
      for (const kw of food.keywords) {
        if (trimmed.includes(kw) && kw.length > bestLen) {
          best = food;
          bestLen = kw.length;
        }
      }
    }
    if (best) {
      matched.push(best);
    }
  }

  // If we split into parts but matched nothing, try the whole string
  if (matched.length === 0) {
    let best: FoodEntry | null = null;
    let bestLen = 0;
    for (const food of FOOD_DB) {
      for (const kw of food.keywords) {
        if (text.includes(kw) && kw.length > bestLen) {
          best = food;
          bestLen = kw.length;
        }
      }
    }
    if (best) matched.push(best);
  }

  if (matched.length === 0) return null;

  // Sum macros from all matched items
  const totals = matched.reduce(
    (acc, f) => ({
      calories: acc.calories + f.calories,
      protein: acc.protein + f.protein,
      carbs: acc.carbs + f.carbs,
      fat: acc.fat + f.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const name = matched.map(f => f.name).join(' + ');
  return { name, ...totals };
}

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
  const {
    user,
    meals,
    macroTargets,
    waterLog,
    addMeal,
    deleteMeal,
    setWaterGlasses: storeSetWater,
    bodyWeightLog,
    currentMesocycle,
    trainingSessions,
    latestWhoopData,
    workoutLogs,
  } = useAppStore();

  // ── Derived state from store ──
  const todayStr = new Date().toISOString().split('T')[0];
  const waterGlasses = waterLog[todayStr] || 0;
  const setWaterGlasses = (val: number) => storeSetWater(todayStr, val);

  // ── Dynamic macro targets based on body weight + goal ──
  const latestWeight = bodyWeightLog.length > 0 ? bodyWeightLog[bodyWeightLog.length - 1] : null;
  const bodyWeightLbs = latestWeight
    ? (latestWeight?.unit === 'lbs' ? latestWeight.weight : latestWeight.weight * 2.205)
    : 175; // Default weight if none logged

  const computedTargets = useMemo(() => {
    if (!latestWeight || !user) return macroTargets;
    const bw = latestWeight.unit === 'lbs' ? latestWeight.weight * 0.453592 : latestWeight.weight;
    const goal = user.goalFocus;
    if (goal === 'hypertrophy') {
      return { calories: Math.round(bw * 35), protein: Math.round(bw * 2.2), carbs: Math.round(bw * 4), fat: Math.round(bw * 1) };
    } else if (goal === 'strength') {
      return { calories: Math.round(bw * 33), protein: Math.round(bw * 2), carbs: Math.round(bw * 3.5), fat: Math.round(bw * 1.1) };
    }
    return { calories: Math.round(bw * 32), protein: Math.round(bw * 2), carbs: Math.round(bw * 3.5), fat: Math.round(bw * 1) };
  }, [latestWeight, user, macroTargets]);

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

  const contextualNutrition = useMemo<ContextualMacros>(() => {
    return getContextualNutrition(
      computedTargets,
      bodyWeightLbs,
      todaySession,
      todayTraining,
      latestWhoopData,
      user
    );
  }, [computedTargets, bodyWeightLbs, todaySession, todayTraining, latestWhoopData, user]);

  const supplements = useMemo(() => {
    return getSupplementRecommendations(contextualNutrition.dayType);
  }, [contextualNutrition.dayType]);

  // ── UI State ──
  const [showContextual, setShowContextual] = useState(true);

  // ── Form state ──
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [formMealType, setFormMealType] = useState<MealType>('lunch');
  const [formName, setFormName] = useState('');
  const [formCalories, setFormCalories] = useState('');
  const [formProtein, setFormProtein] = useState('');
  const [formCarbs, setFormCarbs] = useState('');
  const [formFat, setFormFat] = useState('');

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
  const handleAIEstimate = () => {
    const trimmed = formName.trim();
    if (!trimmed) return;

    setAnalysisError(null);
    setAnalysisResult(null);

    const local = estimateLocally(trimmed);
    if (local) {
      setAnalysisResult({ ...local, confidence: 'medium', notes: 'Estimated from local database' });
      setFormName(local.name);
      setFormCalories(String(local.calories));
      setFormProtein(String(local.protein));
      setFormCarbs(String(local.carbs));
      setFormFat(String(local.fat));
      return;
    }

    setAnalysisError('No match found. Try Quick presets or enter macros manually.');
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
  const WATER_GOAL = 8; // glasses (250ml each = 2L)
  const waterLiters = +(waterGlasses * 0.25).toFixed(2);

  // ── Macro bar percentages ──
  const totalMacroGrams = totals.protein + totals.carbs + totals.fat;
  const proteinPct = totalMacroGrams > 0 ? (totals.protein / totalMacroGrams) * 100 : 0;
  const carbsPct = totalMacroGrams > 0 ? (totals.carbs / totalMacroGrams) * 100 : 0;
  const fatPct = totalMacroGrams > 0 ? (totals.fat / totalMacroGrams) * 100 : 0;

  // ── Smart meal suggestions based on remaining macros ──
  const mealSuggestions = useMemo(() => {
    const targets = contextualNutrition.adjustedTargets;
    const remaining = {
      calories: targets.calories - totals.calories,
      protein: targets.protein - totals.protein,
      carbs: targets.carbs - totals.carbs,
      fat: targets.fat - totals.fat,
    };

    // Don't suggest if already over targets
    if (remaining.calories <= 50) return [];

    // Determine what's most needed
    const proteinRatio = totals.protein / Math.max(targets.protein, 1);
    const carbsRatio = totals.carbs / Math.max(targets.carbs, 1);
    const fatRatio = totals.fat / Math.max(targets.fat, 1);

    // Score each food: how well it fills the biggest gap without exceeding remaining
    const scored = FOOD_DB
      .filter(f => f.calories <= remaining.calories + 50) // fits calorie budget
      .map(food => {
        let score = 0;
        // Reward filling the most deficient macro
        if (proteinRatio < carbsRatio && proteinRatio < fatRatio) {
          score += food.protein * 3; // protein is most needed
        } else if (carbsRatio < fatRatio) {
          score += food.carbs * 2; // carbs most needed
        } else {
          score += food.fat * 2; // fat most needed
        }
        // Reward calorie fit (closer to remaining = better)
        score += Math.max(0, 100 - Math.abs(remaining.calories * 0.4 - food.calories));
        // Penalize exceeding any remaining macro significantly
        if (food.protein > remaining.protein + 10) score -= 30;
        if (food.carbs > remaining.carbs + 15) score -= 20;
        if (food.fat > remaining.fat + 10) score -= 20;
        return { food, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(s => s.food);

    return scored;
  }, [totals, contextualNutrition.adjustedTargets]);

  const handleSuggestionTap = (food: FoodEntry) => {
    addMeal({
      date: new Date(),
      mealType: formMealType,
      name: food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    });
  };

  // ── Handlers ──
  const resetForm = () => {
    setFormName('');
    setFormCalories('');
    setFormProtein('');
    setFormCarbs('');
    setFormFat('');
    setAnalysisResult(null);
    setAnalysisError(null);
  };

  const handleAddMeal = () => {
    const cal = parseInt(formCalories) || 0;
    const pro = parseInt(formProtein) || 0;
    const carb = parseInt(formCarbs) || 0;
    const f = parseInt(formFat) || 0;
    if (!formName.trim() || cal === 0) return;

    addMeal({
      date: new Date(),
      mealType: formMealType,
      name: formName.trim(),
      calories: cal,
      protein: pro,
      carbs: carb,
      fat: f,
    });
    resetForm();
    setShowAddForm(false);
  };

  const handlePresetAdd = (preset: (typeof PRESET_FOODS)[number]) => {
    addMeal({
      date: new Date(),
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
  };

  // ── Date formatting ──
  const todayFormatted = new Date().toLocaleDateString('en-US', {
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
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Diet Coach ── */}
        <DietCoach />

        {/* ── Macro Rings ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="card p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-grappler-200 uppercase tracking-wide">
              Daily Goals
            </h2>
            <p className="text-xs text-grappler-500">{todayFormatted}</p>
          </div>

          <div className="grid grid-cols-4 gap-2">
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

        {/* ── Smart Suggestions ── */}
        {mealSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="card p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-grappler-200 uppercase tracking-wide">
                Suggested Next
              </h2>
              <span className="text-xs text-grappler-500 ml-auto">
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
                  className="flex-shrink-0 p-2.5 bg-grappler-800/60 hover:bg-grappler-700/60 border border-grappler-700/50 rounded-xl transition-colors text-left min-w-[140px]"
                >
                  <p className="text-xs font-medium text-grappler-100 truncate">{food.name}</p>
                  <p className="text-[10px] text-grappler-400 mt-1">
                    {food.calories} kcal &middot; {food.protein}g P
                  </p>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-grappler-600 mt-2">
              Based on your remaining macros &middot; Tap to log
            </p>
          </motion.div>
        )}

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
              {waterLiters} L / {(WATER_GOAL * 0.25).toFixed(1)} L
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
            {waterGlasses}/{WATER_GOAL} glasses (250 ml each)
            {waterGlasses >= WATER_GOAL && (
              <span className="text-blue-400 ml-1 font-medium">
                {' '}
                -- Goal reached!
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
                      <div className="flex gap-2 mt-1 text-[10px] text-grappler-500">
                        <span className="text-orange-400/80">
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
                    <p className="col-span-2 text-xs text-grappler-500 text-center py-4">
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
                      <span>Auto-filled from local database</span>
                    </div>
                  )}

                  {/* Analysis error */}
                  {analysisError && (
                    <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{analysisError}</span>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-grappler-400 mb-1 block">
                      Name
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && formName.trim()) {
                            e.preventDefault();
                            handleAIEstimate();
                          }
                        }}
                        placeholder="e.g. Chicken breast and rice"
                        className="input flex-1"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAIEstimate}
                        disabled={!formName.trim()}
                        className="btn btn-sm px-3 bg-violet-500/20 text-violet-400 border border-violet-500/40 hover:bg-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 whitespace-nowrap"
                        title="Auto-fill macros from database"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="text-xs">Estimate</span>
                      </button>
                    </div>
                    <p className="text-xs text-grappler-600 mt-1">
                      Type what you ate and tap AI to auto-fill macros
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-grappler-400 mb-1 block flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-400" />
                        kcal
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
            <div className="text-center py-8">
              <Apple className="w-10 h-10 text-grappler-700 mx-auto mb-2" />
              <p className="text-sm text-grappler-500">
                No meals logged yet.
              </p>
              <p className="text-xs text-grappler-600 mt-1">
                Use Quick presets or Manual to get started.
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
                          className="flex items-center justify-between py-2 px-3 bg-grappler-800/40 rounded-lg group"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-grappler-200 font-medium truncate">
                              {meal.name}
                            </p>
                            <div className="flex gap-3 mt-0.5 text-[10px]">
                              <span className="text-orange-400">
                                {meal.calories} kcal
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
                  / {contextualNutrition.adjustedTargets.calories} kcal
                </p>
                <p className="text-[10px] text-grappler-400 mt-0.5">
                  {Math.max(contextualNutrition.adjustedTargets.calories - totals.calories, 0)} left
                </p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-400">
                  {totals.protein}g
                </p>
                <p className="text-[10px] text-grappler-500">
                  / {contextualNutrition.adjustedTargets.protein}g Pro
                </p>
                <p className="text-[10px] text-grappler-400 mt-0.5">
                  {Math.max(contextualNutrition.adjustedTargets.protein - totals.protein, 0)}g left
                </p>
              </div>
              <div>
                <p className="text-lg font-bold text-blue-400">
                  {totals.carbs}g
                </p>
                <p className="text-[10px] text-grappler-500">
                  / {contextualNutrition.adjustedTargets.carbs}g Carbs
                </p>
                <p className="text-[10px] text-grappler-400 mt-0.5">
                  {Math.max(contextualNutrition.adjustedTargets.carbs - totals.carbs, 0)}g left
                </p>
              </div>
              <div>
                <p className="text-lg font-bold text-yellow-400">
                  {totals.fat}g
                </p>
                <p className="text-[10px] text-grappler-500">
                  / {contextualNutrition.adjustedTargets.fat}g Fat
                </p>
                <p className="text-[10px] text-grappler-400 mt-0.5">
                  {Math.max(contextualNutrition.adjustedTargets.fat - totals.fat, 0)}g left
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
