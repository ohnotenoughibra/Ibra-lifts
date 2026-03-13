'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Target,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Award,
  Leaf,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MealEntry, MacroTargets } from '@/lib/types';
import type { HistoryFood } from '@/hooks/useNutrition';
import { PRESET_FOODS } from '@/lib/food-database';

interface NutritionInsightsProps {
  todayMeals: MealEntry[];
  allMeals: MealEntry[];
  targets: { calories: number; protein: number; carbs: number; fat: number };
  remaining: { calories: number; protein: number; carbs: number; fat: number };
  totals: { calories: number; protein: number; carbs: number; fat: number };
  macroTargets: MacroTargets;
  mealHistoryIndex: Map<string, HistoryFood>;
}

// ── Protein Distribution Score ──────────────────────────────────────

interface ProteinGrade {
  grade: string;
  color: string;
  cv: number;
  perMeal: number[];
  mealLabels: string[];
  nudge: string;
}

const MEAL_TYPE_SHORT: Record<string, string> = {
  breakfast: 'Bkfst',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  pre_workout: 'Pre',
  post_workout: 'Post',
};

function analyzeProteinDistribution(meals: MealEntry[]): ProteinGrade | null {
  if (meals.length < 2) return null;

  // Group meals by mealType and sum protein
  const grouped = new Map<string, number>();
  const typeOrder = ['breakfast', 'pre_workout', 'lunch', 'snack', 'post_workout', 'dinner'];
  meals.forEach(m => {
    const key = m.mealType;
    grouped.set(key, (grouped.get(key) || 0) + m.protein);
  });

  // Sort by meal time order
  const sortedKeys = Array.from(grouped.keys()).sort(
    (a, b) => (typeOrder.indexOf(a) === -1 ? 99 : typeOrder.indexOf(a)) -
              (typeOrder.indexOf(b) === -1 ? 99 : typeOrder.indexOf(b))
  );

  if (sortedKeys.length < 2) return null;

  const perMeal = sortedKeys.map(k => grouped.get(k)!);
  const mealLabels = sortedKeys.map(k => MEAL_TYPE_SHORT[k] || k);
  const totalProtein = perMeal.reduce((s, p) => s + p, 0);

  if (totalProtein < 20) return null; // Not enough data to grade

  const mean = totalProtein / perMeal.length;
  const variance = perMeal.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / perMeal.length;
  const sd = Math.sqrt(variance);
  const cv = mean > 0 ? sd / mean : 0;

  let grade: string;
  let color: string;
  if (cv < 0.15) { grade = 'A'; color = 'text-green-400'; }
  else if (cv < 0.25) { grade = 'A-'; color = 'text-green-400'; }
  else if (cv < 0.35) { grade = 'B+'; color = 'text-emerald-400'; }
  else if (cv < 0.45) { grade = 'B'; color = 'text-blue-400'; }
  else if (cv < 0.55) { grade = 'C+'; color = 'text-yellow-400'; }
  else if (cv < 0.7) { grade = 'C'; color = 'text-yellow-400'; }
  else if (cv < 0.85) { grade = 'D'; color = 'text-orange-400'; }
  else { grade = 'F'; color = 'text-red-400'; }

  // Generate nudge
  const maxIdx = perMeal.indexOf(Math.max(...perMeal));
  const minIdx = perMeal.indexOf(Math.min(...perMeal));
  const maxVal = perMeal[maxIdx];
  const minVal = perMeal[minIdx];
  let nudge = '';

  if (cv >= 0.35 && maxVal > 0 && minVal < mean * 0.6) {
    const deficit = Math.round(mean - minVal);
    nudge = `Add ~${deficit}g protein to ${mealLabels[minIdx].toLowerCase()}. ${mealLabels[maxIdx]} has ${Math.round(maxVal)}g — spread it out for better recovery.`;
  } else if (cv >= 0.25) {
    nudge = 'Total daily protein (1.6-2.2g/kg) matters most. Aim for 0.25-0.4g/kg per meal across 3-6 meals based on preference.';
  } else {
    nudge = 'Excellent protein spread across meals. This maximizes muscle protein synthesis.';
  }

  return { grade, color, cv, perMeal, mealLabels, nudge };
}

function ProteinDistribution({ analysis }: { analysis: ProteinGrade }) {
  const maxProtein = Math.max(...analysis.perMeal, 1);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-red-400" />
          <span className="text-xs font-semibold text-grappler-300 uppercase tracking-wide">
            Protein Distribution
          </span>
        </div>
        <span className={cn('text-lg font-bold', analysis.color)}>{analysis.grade}</span>
      </div>

      {/* Visual timeline */}
      <div className="flex items-end gap-1.5">
        {analysis.perMeal.map((protein, i) => {
          const height = Math.max((protein / maxProtein) * 48, 4);
          const isLow = protein < 20;
          const isGood = protein >= 25 && protein <= 45;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className={cn(
                'text-xs font-semibold tabular-nums',
                isGood ? 'text-green-400' : isLow ? 'text-red-400' : 'text-grappler-300'
              )}>
                {Math.round(protein)}g
              </span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={cn(
                  'w-full rounded-t',
                  isGood ? 'bg-green-500/60' : isLow ? 'bg-red-500/40' : 'bg-blue-500/50'
                )}
              />
              <span className="text-xs text-grappler-500 truncate max-w-full">
                {analysis.mealLabels[i]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Nudge */}
      <p className="text-xs text-grappler-400 leading-relaxed">{analysis.nudge}</p>
    </div>
  );
}

// ── Smart Remaining Suggestions ─────────────────────────────────────

interface FoodSuggestion {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: 'history' | 'database';
  matchScore: number;
}

function getSuggestions(
  remaining: { calories: number; protein: number; carbs: number; fat: number },
  historyIndex: Map<string, HistoryFood>,
): FoodSuggestion[] {
  if (remaining.calories < 80 && remaining.protein < 8) return [];

  const candidates: FoodSuggestion[] = [];

  // Score: how well does this food fill the remaining gap?
  const score = (food: { calories: number; protein: number; carbs: number; fat: number }) => {
    // Penalize going over, reward getting close
    const calDiff = Math.abs(food.calories - remaining.calories);
    const proDiff = Math.abs(food.protein - remaining.protein) * 4; // Weight protein heavily
    const calPenalty = food.calories > remaining.calories * 1.3 ? 200 : 0;
    return -(calDiff + proDiff + calPenalty);
  };

  // Pull from user's history (most relevant)
  historyIndex.forEach(food => {
    if (food.calories > 0 && food.calories <= remaining.calories * 1.5) {
      candidates.push({
        name: food.name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        source: 'history',
        matchScore: score(food) + (food.count * 2), // Boost frequent foods
      });
    }
  });

  // Pull from preset database as fallback
  PRESET_FOODS.forEach(food => {
    if (food.calories > 0 && food.calories <= remaining.calories * 1.5) {
      const existing = candidates.some(c => c.name.toLowerCase() === food.name.toLowerCase());
      if (!existing) {
        candidates.push({
          name: food.name,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          source: 'database',
          matchScore: score(food),
        });
      }
    }
  });

  return candidates
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);
}

function SmartRemaining({ remaining, suggestions }: {
  remaining: { calories: number; protein: number; carbs: number; fat: number };
  suggestions: FoodSuggestion[];
}) {
  const hasRemaining = remaining.calories > 80 || remaining.protein > 8;

  if (!hasRemaining) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
        <Award className="w-4 h-4 text-green-400 shrink-0" />
        <span className="text-xs text-green-300 font-medium">Targets hit! Great job today.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-yellow-400" />
          <span className="text-xs font-semibold text-grappler-300 uppercase tracking-wide">
            Still Need
          </span>
        </div>
        <span className="text-xs text-grappler-400">
          {remaining.calories > 0 && `${remaining.calories} kcal`}
          {remaining.protein > 8 && ` · ${Math.round(remaining.protein)}g P`}
        </span>
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-1.5">
          {suggestions.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2 bg-grappler-800/60 rounded-lg"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-xs text-yellow-400/70">
                  {s.source === 'history' ? '⟳' : '◆'}
                </span>
                <span className="text-xs text-grappler-200 truncate">{s.name}</span>
              </div>
              <div className="flex gap-2 text-xs text-grappler-500 shrink-0 ml-2">
                <span>{s.calories}cal</span>
                <span className="text-red-400/70">{s.protein}p</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Nutrition Report Card ────────────────────────────────────────────

type ReportRange = '7d' | '14d' | '30d' | 'all';

interface NutritionReport {
  avg: { calories: number; protein: number; carbs: number; fat: number };
  daysLogged: number;
  totalDays: number;
  hitRate: { calories: number; protein: number; carbs: number; fat: number };
  consistencyGrade: string;
  consistencyColor: string;
  topFood: { name: string; count: number } | null;
  recommendation: string;
}

function computeReport(allMeals: MealEntry[], macroTargets: MacroTargets, range: ReportRange): NutritionReport | null {
  const now = new Date();
  const dayMap = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>();

  // Group all meals by date
  allMeals.forEach(m => {
    const key = new Date(m.date).toISOString().split('T')[0];
    const existing = dayMap.get(key) || { calories: 0, protein: 0, carbs: 0, fat: 0 };
    dayMap.set(key, {
      calories: existing.calories + m.calories,
      protein: existing.protein + m.protein,
      carbs: existing.carbs + m.carbs,
      fat: existing.fat + m.fat,
    });
  });

  // Filter by range
  let rangeDays: number;
  let filteredDays: { calories: number; protein: number; carbs: number; fat: number }[];

  if (range === 'all') {
    filteredDays = Array.from(dayMap.values());
    // Total days = from first meal to now
    if (allMeals.length === 0) return null;
    const earliest = allMeals.reduce((min, m) => {
      const d = new Date(m.date).getTime();
      return d < min ? d : min;
    }, Date.now());
    rangeDays = Math.max(Math.ceil((Date.now() - earliest) / 86400000), 1);
  } else {
    rangeDays = range === '7d' ? 7 : range === '14d' ? 14 : 30;
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - rangeDays);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    filteredDays = [];
    dayMap.forEach((totals, dateKey) => {
      if (dateKey >= cutoffStr) filteredDays.push(totals);
    });
  }

  if (filteredDays.length < 2) return null;

  const avg = {
    calories: Math.round(filteredDays.reduce((s, d) => s + d.calories, 0) / filteredDays.length),
    protein: Math.round(filteredDays.reduce((s, d) => s + d.protein, 0) / filteredDays.length),
    carbs: Math.round(filteredDays.reduce((s, d) => s + d.carbs, 0) / filteredDays.length),
    fat: Math.round(filteredDays.reduce((s, d) => s + d.fat, 0) / filteredDays.length),
  };

  // Hit rate: within ±10% of target
  const withinRange = (actual: number, target: number) =>
    target > 0 && Math.abs(actual - target) / target <= 0.1;

  const hitRate = {
    calories: filteredDays.filter(d => withinRange(d.calories, macroTargets.calories)).length,
    protein: filteredDays.filter(d => withinRange(d.protein, macroTargets.protein)).length,
    carbs: filteredDays.filter(d => withinRange(d.carbs, macroTargets.carbs)).length,
    fat: filteredDays.filter(d => withinRange(d.fat, macroTargets.fat)).length,
  };

  // Consistency: coefficient of variation of daily calories
  const calMean = avg.calories;
  const calVar = filteredDays.reduce((s, d) => s + Math.pow(d.calories - calMean, 2), 0) / filteredDays.length;
  const calCV = calMean > 0 ? Math.sqrt(calVar) / calMean : 0;

  let consistencyGrade: string;
  let consistencyColor: string;
  if (calCV < 0.08) { consistencyGrade = 'A'; consistencyColor = 'text-green-400'; }
  else if (calCV < 0.12) { consistencyGrade = 'A-'; consistencyColor = 'text-green-400'; }
  else if (calCV < 0.18) { consistencyGrade = 'B+'; consistencyColor = 'text-emerald-400'; }
  else if (calCV < 0.25) { consistencyGrade = 'B'; consistencyColor = 'text-blue-400'; }
  else if (calCV < 0.35) { consistencyGrade = 'C'; consistencyColor = 'text-yellow-400'; }
  else { consistencyGrade = 'D'; consistencyColor = 'text-orange-400'; }

  // Top food in range
  const foodCounts = new Map<string, number>();
  const cutoffDate = range === 'all' ? new Date(0) : new Date(now);
  if (range !== 'all') cutoffDate.setDate(cutoffDate.getDate() - rangeDays);
  allMeals
    .filter(m => new Date(m.date) >= cutoffDate)
    .forEach(m => {
      const key = m.name.toLowerCase().trim();
      foodCounts.set(key, (foodCounts.get(key) || 0) + 1);
    });
  let topFood: { name: string; count: number } | null = null;
  foodCounts.forEach((count, key) => {
    if (!topFood || count > topFood.count) {
      const meal = allMeals.find(m => m.name.toLowerCase().trim() === key);
      topFood = { name: meal?.name || key, count };
    }
  });

  // Recommendation
  let recommendation = '';
  const proteinRate = hitRate.protein / filteredDays.length;
  const calDelta = avg.calories - macroTargets.calories;

  if (proteinRate < 0.5) {
    recommendation = `Protein target hit only ${hitRate.protein}/${filteredDays.length} days. Prioritize protein at every meal — it's the hardest macro to catch up on.`;
  } else if (calCV > 0.25) {
    recommendation = `Your calorie intake varies a lot day-to-day (${consistencyGrade} consistency). Try to keep within ±200 kcal of your target daily.`;
  } else if (calDelta < -200) {
    recommendation = `Averaging ${Math.abs(calDelta)} kcal under target. If intentional, great — if not, you're leaving gains on the table.`;
  } else if (calDelta > 200) {
    recommendation = `Averaging ${calDelta} kcal over target. Watch portion sizes or adjust targets if your goals have changed.`;
  } else if (proteinRate >= 0.7) {
    recommendation = 'Strong adherence! Protein and consistency are both solid. Keep it up.';
  } else {
    recommendation = 'Decent period. Focus on hitting protein targets more consistently for better results.';
  }

  return {
    avg,
    daysLogged: filteredDays.length,
    totalDays: rangeDays,
    hitRate,
    consistencyGrade,
    consistencyColor,
    topFood,
    recommendation,
  };
}

function HitRateBar({ label, hit, total, color }: { label: string; hit: number; total: number; color: string }) {
  const pct = total > 0 ? (hit / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-grappler-500 w-5 text-right">{label}</span>
      <div className="flex-1 h-2 bg-grappler-800 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn(
        'text-xs font-semibold tabular-nums w-10',
        pct >= 70 ? 'text-green-400' : pct >= 40 ? 'text-yellow-400' : 'text-red-400'
      )}>
        {hit}/{total}
      </span>
    </div>
  );
}

const RANGE_OPTIONS: { id: ReportRange; label: string }[] = [
  { id: '7d', label: '7D' },
  { id: '14d', label: '14D' },
  { id: '30d', label: '30D' },
  { id: 'all', label: 'All' },
];

function ReportCard({ allMeals, macroTargets }: { allMeals: MealEntry[]; macroTargets: MacroTargets }) {
  const [range, setRange] = useState<ReportRange>('all');

  const report = useMemo(
    () => computeReport(allMeals, macroTargets, range),
    [allMeals, macroTargets, range]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary-400" />
          <span className="text-xs font-semibold text-grappler-300 uppercase tracking-wide">
            Nutrition Report
          </span>
        </div>
        {report && (
          <span className={cn('text-sm font-bold', report.consistencyColor)}>
            {report.consistencyGrade}
          </span>
        )}
      </div>

      {/* Range selector */}
      <div className="flex gap-1 bg-grappler-800/50 rounded-lg p-0.5">
        {RANGE_OPTIONS.map(r => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            className={cn(
              'flex-1 py-1.5 text-xs font-medium rounded-md transition-all',
              range === r.id
                ? 'bg-primary-500/20 text-primary-400'
                : 'text-grappler-500 hover:text-grappler-300'
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {report ? (
        <div className="space-y-3">
          {/* Avg stats */}
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: 'Cal', value: report.avg.calories, unit: '' },
              { label: 'Pro', value: report.avg.protein, unit: 'g' },
              { label: 'Carb', value: report.avg.carbs, unit: 'g' },
              { label: 'Fat', value: report.avg.fat, unit: 'g' },
            ].map(s => (
              <div key={s.label} className="text-center p-1.5 bg-grappler-800/50 rounded">
                <p className="text-sm font-bold text-grappler-200">{s.value}{s.unit}</p>
                <p className="text-xs text-grappler-500">{s.label}/day</p>
              </div>
            ))}
          </div>

          {/* Macro hit rates */}
          <div className="space-y-1.5">
            <p className="text-xs text-grappler-500 uppercase tracking-wider">
              Target Hit Rate (±10%)
            </p>
            <HitRateBar label="Cal" hit={report.hitRate.calories} total={report.daysLogged} color="bg-orange-500" />
            <HitRateBar label="P" hit={report.hitRate.protein} total={report.daysLogged} color="bg-red-500" />
            <HitRateBar label="C" hit={report.hitRate.carbs} total={report.daysLogged} color="bg-blue-500" />
            <HitRateBar label="F" hit={report.hitRate.fat} total={report.daysLogged} color="bg-yellow-500" />
          </div>

          {/* Meta */}
          <div className="flex items-center justify-between text-xs text-grappler-500">
            <span>Logged {report.daysLogged}/{report.totalDays} days</span>
            {report.topFood && (
              <span>Top: {report.topFood.name.length > 18
                ? report.topFood.name.slice(0, 18) + '...'
                : report.topFood.name
              } ({report.topFood.count}x)</span>
            )}
          </div>

          {/* Recommendation */}
          <div className="p-2.5 bg-primary-500/10 border border-primary-500/20 rounded-lg">
            <p className="text-xs text-grappler-300 leading-relaxed">{report.recommendation}</p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-grappler-500">Not enough data for this range yet.</p>
      )}
    </div>
  );
}

// ── Science-Based Food Guidance ─────────────────────────────────────

// Evidence-based food categories (sources cited in comments)
// Categories are used to match against user's meal history keywords

const POWER_FOODS = [
  // High protein per calorie — Morton et al. 2018, 1.6-2.2g/kg optimal
  { keywords: ['salmon', 'mackerel', 'sardine', 'herring', 'trout'], label: 'Fatty fish (2-3x/week)', why: 'Omega-3s reduce inflammation, protect joints, improve brain health — critical for contact sports.', source: 'Calder 2017' },
  { keywords: ['berry', 'berries', 'blueberry', 'cherry', 'tart cherry'], label: 'Berries & tart cherry', why: 'Polyphenols reduce muscle soreness (DOMS) and accelerate recovery between sessions.', source: 'Howatson 2010' },
  { keywords: ['yogurt', 'kefir', 'kimchi', 'sauerkraut', 'fermented', 'kombucha'], label: 'Fermented foods', why: 'Gut microbiome diversity boosts immune function — fewer sick days, better nutrient absorption.', source: 'Sonnenburg 2016' },
  { keywords: ['spinach', 'kale', 'beet', 'beetroot', 'arugula', 'rocket'], label: 'Nitrate-rich greens', why: 'Dietary nitrates improve oxygen efficiency during training — more output, less fatigue.', source: 'Jones 2018' },
  { keywords: ['bone broth', 'gelatin', 'collagen'], label: 'Collagen / bone broth', why: 'Supports tendon and ligament adaptation — essential for grapplers and anyone training hard.', source: 'Shaw 2017' },
  { keywords: ['egg', 'eggs'], label: 'Whole eggs', why: 'Complete protein + choline for brain function. Whole eggs stimulate more MPS than egg whites alone.', source: 'van Vliet 2017' },
  { keywords: ['turmeric', 'ginger', 'curcumin'], label: 'Turmeric & ginger', why: 'Natural anti-inflammatories that reduce DOMS and joint pain without NSAID side effects.', source: 'Nicol 2015' },
  { keywords: ['oats', 'oatmeal', 'porridge'], label: 'Oats', why: 'Slow-release carbs + beta-glucan fiber. Steady energy for long sessions, supports gut health.', source: 'Rebello 2016' },
] as const;

const FOODS_TO_LIMIT = [
  { keywords: ['fried', 'fries', 'chips', 'crisp', 'deep fried', 'nugget'], label: 'Fried foods', why: 'Trans fats and advanced glycation end-products (AGEs) promote systemic inflammation and slow recovery.' },
  { keywords: ['soda', 'cola', 'fanta', 'sprite', 'soft drink', 'mountain dew', 'energy drink'], label: 'Sugary drinks', why: 'Empty calories, insulin spikes, zero satiety. Associated with increased inflammation and fat storage.' },
  { keywords: ['candy', 'sweets', 'gummy', 'haribo', 'skittles', 'chocolate bar'], label: 'Candy & sweets', why: 'Excess added sugar suppresses immune function for hours post-consumption and provides no micronutrients.' },
  { keywords: ['alcohol', 'beer', 'wine', 'vodka', 'whiskey', 'cocktail'], label: 'Alcohol', why: 'Reduces muscle protein synthesis by up to 37% post-training, disrupts sleep quality, and impairs recovery.', source: 'Parr 2014' },
  { keywords: ['pizza', 'hot dog', 'fast food', 'mcdonalds', 'burger king', 'kfc'], label: 'Ultra-processed fast food', why: 'People eat 500+ more kcal/day on ultra-processed diets — these foods override satiety signals.', source: 'Hall 2019 (NIH)' },
] as const;

interface FoodTip {
  type: 'add' | 'reduce';
  label: string;
  why: string;
  source?: string;
  found: boolean; // Is this food already in their diet?
  frequency?: number; // How often they eat it
}

function analyzeDiet(historyIndex: Map<string, HistoryFood>): FoodTip[] {
  const tips: FoodTip[] = [];
  const allNames = Array.from(historyIndex.keys());

  // Check which power foods they're missing
  for (const food of POWER_FOODS) {
    const match = allNames.find(name =>
      food.keywords.some(kw => name.includes(kw))
    );
    const freq = match ? historyIndex.get(match)?.count || 0 : 0;
    tips.push({
      type: 'add',
      label: food.label,
      why: food.why,
      source: food.source,
      found: !!match,
      frequency: freq,
    });
  }

  // Check which foods to limit they're eating
  for (const food of FOODS_TO_LIMIT) {
    const matches = allNames.filter(name =>
      food.keywords.some(kw => name.includes(kw))
    );
    const totalFreq = matches.reduce((s, name) => s + (historyIndex.get(name)?.count || 0), 0);
    if (totalFreq > 0) {
      tips.push({
        type: 'reduce',
        label: food.label,
        why: food.why,
        source: 'source' in food ? food.source : undefined,
        found: true,
        frequency: totalFreq,
      });
    }
  }

  return tips;
}

function FoodGuidance({ tips }: { tips: FoodTip[] }) {
  const [expanded, setExpanded] = useState(true);

  const missing = tips.filter(t => t.type === 'add' && !t.found);
  const eating = tips.filter(t => t.type === 'add' && t.found);
  const toReduce = tips.filter(t => t.type === 'reduce');

  return (
    <div className="space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Leaf className="w-4 h-4 text-green-400" />
          <span className="text-xs font-semibold text-grappler-300 uppercase tracking-wide">
            Food Quality Guide
          </span>
        </div>
        {expanded
          ? <ChevronUp className="w-3.5 h-3.5 text-grappler-500" />
          : <ChevronDown className="w-3.5 h-3.5 text-grappler-500" />
        }
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 pt-1">
              {/* Already eating well */}
              {eating.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-green-400/70 uppercase tracking-wider font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Already in your diet
                  </p>
                  {eating.map((tip, i) => (
                    <FoodTipRow key={i} tip={tip} />
                  ))}
                </div>
              )}

              {/* Missing power foods */}
              {missing.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-yellow-400/70 uppercase tracking-wider font-medium flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" /> Consider adding
                  </p>
                  {missing.map((tip, i) => (
                    <FoodTipRow key={i} tip={tip} />
                  ))}
                </div>
              )}

              {/* Foods to reduce */}
              {toReduce.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-red-400/70 uppercase tracking-wider font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Consider reducing
                  </p>
                  {toReduce.map((tip, i) => (
                    <FoodTipRow key={i} tip={tip} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FoodTipRow({ tip }: { tip: FoodTip }) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div>
      <button
        onClick={() => setShowDetail(!showDetail)}
        className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-grappler-800/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn(
            'text-xs font-medium',
            tip.type === 'add' && tip.found ? 'text-green-400' :
            tip.type === 'add' ? 'text-grappler-300' :
            'text-red-400'
          )}>
            {tip.label}
          </span>
          {tip.found && tip.frequency && tip.frequency > 1 && (
            <span className="text-xs text-grappler-600">{tip.frequency}x logged</span>
          )}
        </div>
        <ChevronDown className={cn(
          'w-3 h-3 text-grappler-600 transition-transform',
          showDetail && 'rotate-180'
        )} />
      </button>
      <AnimatePresence>
        {showDetail && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2">
              <p className="text-xs text-grappler-400 leading-relaxed">{tip.why}</p>
              {tip.source && (
                <p className="text-xs text-grappler-600 mt-1">Source: {tip.source}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export default function NutritionInsights({
  todayMeals,
  allMeals,
  targets,
  remaining,
  totals,
  macroTargets,
  mealHistoryIndex,
}: NutritionInsightsProps) {
  const proteinAnalysis = useMemo(
    () => analyzeProteinDistribution(todayMeals),
    [todayMeals]
  );

  const suggestions = useMemo(
    () => getSuggestions(remaining, mealHistoryIndex),
    [remaining, mealHistoryIndex]
  );

  const hasReportData = allMeals.length >= 2;

  const foodTips = useMemo(
    () => analyzeDiet(mealHistoryIndex),
    [mealHistoryIndex]
  );

  const hasAnyData = proteinAnalysis || suggestions.length > 0 ||
    remaining.calories < 80 || hasReportData || todayMeals.length > 0;

  return (
    <div className="space-y-4">
      {/* Protein Distribution */}
      {proteinAnalysis ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4"
        >
          <ProteinDistribution analysis={proteinAnalysis} />
        </motion.div>
      ) : todayMeals.length < 2 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-red-400" />
            <span className="text-xs font-semibold text-grappler-300 uppercase tracking-wide">
              Protein Distribution
            </span>
          </div>
          <p className="text-xs text-grappler-500">
            Log 2+ meals to see your protein distribution score.
          </p>
        </motion.div>
      ) : null}

      {/* Smart Remaining / Targets Hit */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card p-4"
      >
        <SmartRemaining remaining={remaining} suggestions={suggestions} />
      </motion.div>

      {/* Nutrition Report */}
      {hasReportData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-4"
        >
          <ReportCard allMeals={allMeals} macroTargets={macroTargets} />
        </motion.div>
      )}

      {/* Science-Based Food Guidance */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card p-4"
      >
        <FoodGuidance tips={foodTips} />
      </motion.div>

      {!hasAnyData && (
        <div className="text-center py-12">
          <Zap className="w-8 h-8 text-grappler-700 mx-auto mb-3" />
          <p className="text-sm text-grappler-500">
            Start logging meals to unlock insights.
          </p>
        </div>
      )}
    </div>
  );
}
