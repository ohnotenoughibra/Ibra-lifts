'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, Zap, TrendingUp, TrendingDown, Shield, AlertTriangle,
  Target, Trophy, BarChart3, HeartPulse, Brain, Dumbbell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { calculateEnhancedACWR } from '@/lib/fatigue-metrics';
import { calculateFatigueDebt } from '@/lib/smart-deload';
import { calculateHardMetrics, detectPlateaus, calculateMuscleVolumeGauges, extractPRTimeline } from '@/lib/progress-analytics';
import { generateDashboardInsights, type DashboardInsight } from '@/lib/dashboard-insights';
import type { OverlayView } from './dashboard-types';

// ─── Icon Map ─────────────────────────────────────────────────────────────────

const ICON_MAP = {
  activity: Activity,
  zap: Zap,
  trending_up: TrendingUp,
  trending_down: TrendingDown,
  shield: Shield,
  alert_triangle: AlertTriangle,
  target: Target,
  trophy: Trophy,
  bar_chart: BarChart3,
  heart_pulse: HeartPulse,
  brain: Brain,
  dumbbell: Dumbbell,
} as const;

// ─── Chip color configs — minimal: dot + text colors ──────────────────────────

const CHIP_COLORS = {
  green:   { dot: 'bg-green-400',   text: 'text-green-300',   bg: 'bg-green-500/8',   border: 'border-green-500/20' },
  blue:    { dot: 'bg-blue-400',    text: 'text-blue-300',    bg: 'bg-blue-500/8',    border: 'border-blue-500/20' },
  yellow:  { dot: 'bg-yellow-400',  text: 'text-yellow-300',  bg: 'bg-yellow-500/8',  border: 'border-yellow-500/20' },
  red:     { dot: 'bg-red-400',     text: 'text-red-300',     bg: 'bg-red-500/8',     border: 'border-red-500/20' },
  purple:  { dot: 'bg-purple-400',  text: 'text-purple-300',  bg: 'bg-purple-500/8',  border: 'border-purple-500/20' },
  amber:   { dot: 'bg-amber-400',   text: 'text-amber-300',   bg: 'bg-amber-500/8',   border: 'border-amber-500/20' },
  emerald: { dot: 'bg-emerald-400', text: 'text-emerald-300', bg: 'bg-emerald-500/8', border: 'border-emerald-500/20' },
  sky:     { dot: 'bg-sky-400',     text: 'text-sky-300',     bg: 'bg-sky-500/8',     border: 'border-sky-500/20' },
  orange:  { dot: 'bg-orange-400',  text: 'text-orange-300',  bg: 'bg-orange-500/8',  border: 'border-orange-500/20' },
} as const;

// ─── Main Component ───────────────────────────────────────────────────────────

interface DashboardInsightsProps {
  onNavigate: (view: OverlayView) => void;
}

export default function DashboardInsights({ onNavigate }: DashboardInsightsProps) {
  const {
    workoutLogs,
    trainingSessions,
    wearableHistory,
    latestWhoopData,
    currentMesocycle,
  } = useAppStore(
    useShallow(s => ({
      workoutLogs: s.workoutLogs,
      trainingSessions: s.trainingSessions ?? [],
      wearableHistory: s.wearableHistory ?? [],
      latestWhoopData: s.latestWhoopData,
      currentMesocycle: s.currentMesocycle,
    }))
  );

  const insights = useMemo(() => {
    if (workoutLogs.length < 3) return [];

    const acwr = calculateEnhancedACWR(workoutLogs, trainingSessions);
    const fatigueDebt = calculateFatigueDebt(workoutLogs, wearableHistory);
    const hardMetrics = calculateHardMetrics(workoutLogs, currentMesocycle?.id ?? null);
    const plateaus = detectPlateaus(workoutLogs);
    const volumeGauges = calculateMuscleVolumeGauges(workoutLogs);
    const allPRs = extractPRTimeline(workoutLogs);

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const weeklyWorkoutCount = workoutLogs.filter(l => new Date(l.date).getTime() >= weekAgo).length;

    return generateDashboardInsights({
      acwr,
      fatigueDebt,
      hardMetrics,
      plateaus,
      volumeGauges,
      recentPRs: allPRs,
      recoveryScore: latestWhoopData?.recoveryScore ?? null,
      workoutCount: workoutLogs.length,
      weeklyWorkoutCount,
    });
  }, [workoutLogs, trainingSessions, wearableHistory, latestWhoopData, currentMesocycle]);

  if (insights.length === 0) return null;

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1 scrollbar-none">
      {insights.map((insight, i) => {
        const colors = CHIP_COLORS[insight.color] || CHIP_COLORS.blue;
        const Icon = ICON_MAP[insight.icon] || Activity;

        return (
          <motion.button
            key={insight.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04, duration: 0.2 }}
            onClick={() => onNavigate(insight.target)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 flex-shrink-0',
              'active:scale-95 transition-transform',
              colors.bg, colors.border,
            )}
          >
            <Icon className={cn('w-3 h-3', colors.text)} />
            <span className={cn('text-[11px] font-bold tabular-nums whitespace-nowrap', colors.text)}>
              {insight.value}
            </span>
            <span className="text-[10px] text-grappler-500 whitespace-nowrap">
              {insight.status}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
