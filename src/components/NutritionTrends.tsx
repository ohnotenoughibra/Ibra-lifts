'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import {
  TrendingUp, Calendar, ChevronDown, ChevronUp,
  Flame, Beef, Wheat, Droplet,
} from 'lucide-react';
import { cn, toLocalDateStr} from '@/lib/utils';
import type { MealEntry, MacroTargets } from '@/lib/types';

type TimeRange = '7d' | '14d' | '30d';

interface NutritionTrendsProps {
  meals: MealEntry[];
  macroTargets: MacroTargets;
}

interface DailyTotals {
  date: string;
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealCount: number;
}

function aggregateDays(meals: MealEntry[], days: number): DailyTotals[] {
  const now = new Date();
  const result: DailyTotals[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = toLocalDateStr(d);
    const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const shortLabel = i === 0 ? 'Today' : i === 1 ? 'Yday' : d.toLocaleDateString('en-US', { weekday: 'short' });

    const dayMeals = meals.filter(
      m => toLocalDateStr(m.date) === key
    );

    result.push({
      date: key,
      label: shortLabel,
      calories: dayMeals.reduce((s, m) => s + m.calories, 0),
      protein: dayMeals.reduce((s, m) => s + m.protein, 0),
      carbs: dayMeals.reduce((s, m) => s + m.carbs, 0),
      fat: dayMeals.reduce((s, m) => s + m.fat, 0),
      mealCount: dayMeals.length,
    });
  }

  return result;
}

function aggregateWeeks(meals: MealEntry[], weeks: number): DailyTotals[] {
  const now = new Date();
  const result: DailyTotals[] = [];

  for (let w = weeks - 1; w >= 0; w--) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - w * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);

    const startKey = toLocalDateStr(weekStart);
    const endKey = toLocalDateStr(weekEnd);

    const weekMeals = meals.filter(m => {
      const mKey = toLocalDateStr(m.date);
      return mKey >= startKey && mKey <= endKey;
    });

    // Count days with meals logged for accurate averaging
    const daysLogged = new Set(
      weekMeals.map(m => toLocalDateStr(m.date))
    ).size;
    const divisor = Math.max(daysLogged, 1);

    const label = w === 0 ? 'This week' : w === 1 ? 'Last week' :
      `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

    result.push({
      date: startKey,
      label,
      calories: Math.round(weekMeals.reduce((s, m) => s + m.calories, 0) / divisor),
      protein: Math.round(weekMeals.reduce((s, m) => s + m.protein, 0) / divisor),
      carbs: Math.round(weekMeals.reduce((s, m) => s + m.carbs, 0) / divisor),
      fat: Math.round(weekMeals.reduce((s, m) => s + m.fat, 0) / divisor),
      mealCount: weekMeals.length,
    });
  }

  return result;
}

const RANGE_CONFIG: Record<TimeRange, { label: string; days: number }> = {
  '7d': { label: '7 Days', days: 7 },
  '14d': { label: '14 Days', days: 14 },
  '30d': { label: '30 Days', days: 30 },
};

// Custom tooltip for charts
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-grappler-800 border border-grappler-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-grappler-300 font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold">{p.value}{p.dataKey === 'calories' ? ' kcal' : 'g'}</span>
        </p>
      ))}
    </div>
  );
}

export default function NutritionTrends({ meals, macroTargets }: NutritionTrendsProps) {
  const [expanded, setExpanded] = useState(false);
  const [range, setRange] = useState<TimeRange>('7d');
  const [activeChart, setActiveChart] = useState<'calories' | 'macros'>('calories');

  const dailyData = useMemo(
    () => aggregateDays(meals, RANGE_CONFIG[range].days),
    [meals, range]
  );

  const weeklyData = useMemo(
    () => aggregateWeeks(meals, range === '7d' ? 4 : range === '14d' ? 4 : 8),
    [meals, range]
  );

  // Summary stats for the selected period
  const stats = useMemo(() => {
    const logged = dailyData.filter(d => d.mealCount > 0);
    if (logged.length === 0) return null;
    const avg = {
      calories: Math.round(logged.reduce((s, d) => s + d.calories, 0) / logged.length),
      protein: Math.round(logged.reduce((s, d) => s + d.protein, 0) / logged.length),
      carbs: Math.round(logged.reduce((s, d) => s + d.carbs, 0) / logged.length),
      fat: Math.round(logged.reduce((s, d) => s + d.fat, 0) / logged.length),
    };
    const adherence = Math.round((logged.length / dailyData.length) * 100);
    const calDiff = avg.calories - macroTargets.calories;
    const proteinDiff = avg.protein - macroTargets.protein;
    return { avg, adherence, calDiff, proteinDiff, daysLogged: logged.length };
  }, [dailyData, macroTargets]);

  if (meals.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="bg-grappler-800 rounded-xl overflow-hidden"
    >
      {/* Toggle header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary-500/15 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary-400" />
          </div>
          <div className="text-left">
            <h2 className="text-sm font-semibold text-grappler-200">Nutrition Trends</h2>
            {stats && !expanded && (
              <p className="text-xs text-grappler-400">
                Avg {stats.avg.calories} kcal / {stats.avg.protein}g protein
              </p>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-grappler-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-grappler-500" />
        )}
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="px-4 pb-4 space-y-4"
        >
          {/* Range selector */}
          <div className="flex gap-1.5 bg-grappler-900/50 rounded-lg p-1">
            {(Object.keys(RANGE_CONFIG) as TimeRange[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  'flex-1 py-1.5 text-xs font-medium rounded-md transition-all',
                  range === r
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'text-grappler-500 hover:text-grappler-300'
                )}
              >
                {RANGE_CONFIG[r].label}
              </button>
            ))}
          </div>

          {/* Summary cards */}
          {stats && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Avg Cal', value: `${stats.avg.calories}`, icon: Flame, color: 'text-blue-400', diff: stats.calDiff },
                { label: 'Avg Pro', value: `${stats.avg.protein}g`, icon: Beef, color: 'text-red-400', diff: stats.proteinDiff },
                { label: 'Avg Carbs', value: `${stats.avg.carbs}g`, icon: Wheat, color: 'text-blue-400' },
                { label: 'Avg Fat', value: `${stats.avg.fat}g`, icon: Droplet, color: 'text-yellow-400' },
              ].map((s, i) => (
                <div key={i} className="bg-grappler-900/60 rounded-lg p-2.5 text-center">
                  <s.icon className={cn('w-3.5 h-3.5 mx-auto mb-1', s.color)} />
                  <p className={cn('text-sm font-bold', s.color)}>{s.value}</p>
                  <p className="text-xs text-grappler-400 mt-0.5">{s.label}</p>
                  {s.diff != null && (
                    <p className={cn('text-xs mt-0.5 font-medium',
                      s.diff > 0 ? 'text-green-400' : s.diff < -100 ? 'text-red-400' : 'text-grappler-400'
                    )}>
                      {s.diff > 0 ? '+' : ''}{s.diff}{s.label.includes('Cal') ? '' : 'g'} vs target
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Adherence bar */}
          {stats && (
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-grappler-500" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-grappler-400">
                    Logging adherence ({stats.daysLogged}/{dailyData.length} days)
                  </span>
                  <span className={cn('text-xs font-bold',
                    stats.adherence >= 80 ? 'text-green-400' :
                    stats.adherence >= 50 ? 'text-yellow-400' : 'text-red-400'
                  )}>
                    {stats.adherence}%
                  </span>
                </div>
                <div className="h-1.5 bg-grappler-700 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all',
                      stats.adherence >= 80 ? 'bg-green-500' :
                      stats.adherence >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    )}
                    style={{ width: `${stats.adherence}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Chart type toggle */}
          <div className="flex gap-1.5">
            <button
              onClick={() => setActiveChart('calories')}
              className={cn(
                'flex-1 py-1.5 text-xs font-medium rounded-md transition-all',
                activeChart === 'calories'
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                  : 'bg-grappler-900/40 text-grappler-500'
              )}
            >
              Calories
            </button>
            <button
              onClick={() => setActiveChart('macros')}
              className={cn(
                'flex-1 py-1.5 text-xs font-medium rounded-md transition-all',
                activeChart === 'macros'
                  ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30'
                  : 'bg-grappler-900/40 text-grappler-500'
              )}
            >
              Macros
            </button>
          </div>

          {/* Charts */}
          <div className="h-48">
            {activeChart === 'calories' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} barCategoryGap="15%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    interval={range === '30d' ? 4 : range === '14d' ? 1 : 0}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    width={35}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <ReferenceLine
                    y={macroTargets.calories}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{ value: 'Target', position: 'right', fontSize: 12, fill: '#f59e0b' }}
                  />
                  <Bar
                    dataKey="calories"
                    name="Calories"
                    fill="#f97316"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    interval={range === '30d' ? 4 : range === '14d' ? 1 : 0}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="protein"
                    name="Protein"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: '#ef4444' }}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="carbs"
                    name="Carbs"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: '#3b82f6' }}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="fat"
                    name="Fat"
                    stroke="#eab308"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: '#eab308' }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Weekly averages */}
          {weeklyData.length > 1 && (
            <div>
              <h3 className="text-xs text-grappler-400 uppercase tracking-wide font-medium mb-2">
                Weekly Averages (per day)
              </h3>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      axisLine={false}
                      tickLine={false}
                      width={30}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <ReferenceLine
                      y={macroTargets.calories}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                    />
                    <Bar dataKey="calories" name="Avg Calories" fill="#f97316" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Legend */}
          {activeChart === 'macros' && (
            <div className="flex items-center justify-center gap-4">
              {[
                { label: 'Protein', color: '#ef4444' },
                { label: 'Carbs', color: '#3b82f6' },
                { label: 'Fat', color: '#eab308' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                  <span className="text-xs text-grappler-400">{l.label}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
