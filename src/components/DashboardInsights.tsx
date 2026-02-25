'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, Zap, TrendingUp, TrendingDown, Shield, AlertTriangle,
  Target, Trophy, BarChart3, HeartPulse, Brain, Dumbbell, ChevronRight,
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

// ─── Color Configs ────────────────────────────────────────────────────────────

const COLOR_CONFIG = {
  green:   { bg: 'bg-green-500/10',  border: 'border-green-500/25',  icon: 'text-green-400',  status: 'text-green-400',  value: 'text-green-300' },
  blue:    { bg: 'bg-blue-500/10',   border: 'border-blue-500/25',   icon: 'text-blue-400',   status: 'text-blue-400',   value: 'text-blue-300' },
  yellow:  { bg: 'bg-yellow-500/10', border: 'border-yellow-500/25', icon: 'text-yellow-400', status: 'text-yellow-400', value: 'text-yellow-300' },
  red:     { bg: 'bg-red-500/10',    border: 'border-red-500/25',    icon: 'text-red-400',    status: 'text-red-400',    value: 'text-red-300' },
  purple:  { bg: 'bg-purple-500/10', border: 'border-purple-500/25', icon: 'text-purple-400', status: 'text-purple-400', value: 'text-purple-300' },
  amber:   { bg: 'bg-amber-500/10',  border: 'border-amber-500/25',  icon: 'text-amber-400',  status: 'text-amber-400',  value: 'text-amber-300' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', icon: 'text-emerald-400', status: 'text-emerald-400', value: 'text-emerald-300' },
  sky:     { bg: 'bg-sky-500/10',    border: 'border-sky-500/25',    icon: 'text-sky-400',    status: 'text-sky-400',    value: 'text-sky-300' },
  orange:  { bg: 'bg-orange-500/10', border: 'border-orange-500/25', icon: 'text-orange-400', status: 'text-orange-400', value: 'text-orange-300' },
} as const;

// ─── Single Tile ──────────────────────────────────────────────────────────────

function InsightTile({
  insight,
  onTap,
  index,
}: {
  insight: DashboardInsight;
  onTap: (target: OverlayView) => void;
  index: number;
}) {
  const Icon = ICON_MAP[insight.icon] || Activity;
  const colors = COLOR_CONFIG[insight.color] || COLOR_CONFIG.blue;

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => onTap(insight.target)}
      className={cn(
        'w-full rounded-xl border p-3 text-left transition-all active:scale-[0.97]',
        colors.bg, colors.border,
        'hover:brightness-110',
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* Icon + Value column */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0 min-w-[40px]">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colors.bg)}>
            <Icon className={cn('w-4 h-4', colors.icon)} />
          </div>
          <span className={cn('text-sm font-black tabular-nums leading-none', colors.value)}>
            {insight.value}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <h4 className="text-xs font-bold text-grappler-200 truncate">{insight.headline}</h4>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className={cn('text-[10px] font-semibold uppercase tracking-wide', colors.status)}>
                {insight.status}
              </span>
              <ChevronRight className="w-3 h-3 text-grappler-600" />
            </div>
          </div>
          <p className="text-[11px] text-grappler-400 leading-snug mt-0.5 line-clamp-2">
            {insight.body}
          </p>
        </div>
      </div>
    </motion.button>
  );
}

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

    // Compute analysis data
    const acwr = calculateEnhancedACWR(workoutLogs, trainingSessions);
    const fatigueDebt = calculateFatigueDebt(workoutLogs, wearableHistory);
    const hardMetrics = calculateHardMetrics(workoutLogs, currentMesocycle?.id ?? null);
    const plateaus = detectPlateaus(workoutLogs);
    const volumeGauges = calculateMuscleVolumeGauges(workoutLogs);
    const allPRs = extractPRTimeline(workoutLogs);

    // This week's workout count
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
    <section>
      <div className="flex items-center justify-between mb-2 px-0.5">
        <span className="text-[11px] font-bold uppercase tracking-widest text-grappler-500">
          Pulse
        </span>
        <span className="text-[10px] text-grappler-600">
          tap to explore
        </span>
      </div>
      <div className="space-y-1.5">
        {insights.map((insight, i) => (
          <InsightTile
            key={insight.id}
            insight={insight}
            onTap={onNavigate}
            index={i}
          />
        ))}
      </div>
    </section>
  );
}
