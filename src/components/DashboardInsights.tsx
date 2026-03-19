'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import type { MuscleVolumeGauge } from '@/lib/progress-analytics';
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
  const [volumeOpen, setVolumeOpen] = useState(false);

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

  const { insights, volumeGauges } = useMemo(() => {
    if (workoutLogs.length < 3) return { insights: [] as DashboardInsight[], volumeGauges: [] as MuscleVolumeGauge[] };

    const acwr = calculateEnhancedACWR(workoutLogs, trainingSessions);
    const fatigueDebt = calculateFatigueDebt(workoutLogs, wearableHistory);
    const hardMetrics = calculateHardMetrics(workoutLogs, currentMesocycle?.id ?? null);
    const plateaus = detectPlateaus(workoutLogs);
    const gauges = calculateMuscleVolumeGauges(workoutLogs);
    const allPRs = extractPRTimeline(workoutLogs);

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const weeklyWorkoutCount = workoutLogs.filter(l => new Date(l.date).getTime() >= weekAgo).length;

    const ins = generateDashboardInsights({
      acwr,
      fatigueDebt,
      hardMetrics,
      plateaus,
      volumeGauges: gauges,
      recentPRs: allPRs,
      recoveryScore: latestWhoopData?.recoveryScore ?? null,
      workoutCount: workoutLogs.length,
      weeklyWorkoutCount,
    });

    return { insights: ins, volumeGauges: gauges };
  }, [workoutLogs, trainingSessions, wearableHistory, latestWhoopData, currentMesocycle]);

  // Volume summary for collapsed header
  const volumeSummary = useMemo(() => {
    if (volumeGauges.length === 0) return null;
    const atMev = volumeGauges.filter(g => g.zone === 'productive' || g.zone === 'near_mrv').length;
    const belowMev = volumeGauges.filter(g => g.zone === 'below_mev').length;
    const overMrv = volumeGauges.filter(g => g.zone === 'over_mrv').length;
    if (overMrv > 0) return `${overMrv} over MRV`;
    if (atMev > 0) return `${atMev} at MEV+`;
    if (belowMev > 0) return `${belowMev} below MEV`;
    return `${volumeGauges.length} tracked`;
  }, [volumeGauges]);

  if (insights.length === 0 && volumeGauges.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* ─── Insight Chips ─── */}
      {insights.length > 0 && (
        <div className="relative">
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
                  <Icon className={cn('w-3.5 h-3.5', colors.text)} />
                  <span className={cn('text-xs font-bold tabular-nums whitespace-nowrap', colors.text)}>
                    {insight.value}
                  </span>
                  <span className="text-xs text-grappler-500 whitespace-nowrap">
                    {insight.status}
                  </span>
                </motion.button>
              );
            })}
          </div>
          {insights.length > 2 && (
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-grappler-950 to-transparent pointer-events-none" />
          )}
        </div>
      )}

      {/* ─── Weekly Volume Progress Bars ─── */}
      {volumeGauges.length > 0 && (
        <div className="rounded-xl border border-grappler-700/30 bg-grappler-900/40 overflow-hidden">
          {/* Collapsible header */}
          <button
            onClick={() => setVolumeOpen(v => !v)}
            className="flex items-center justify-between w-full px-3 py-2 active:bg-grappler-800/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5 text-grappler-400" />
              <span className="text-xs font-semibold text-grappler-300">Weekly Volume</span>
              {volumeSummary && (
                <span className="text-[10px] text-grappler-500">{volumeSummary}</span>
              )}
            </div>
            <motion.div
              animate={{ rotate: volumeOpen ? 90 : 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronRight className="w-3.5 h-3.5 text-grappler-500" />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {volumeOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-2.5 space-y-1.5">
                  {volumeGauges.map((g) => {
                    const setsToMev = g.mev - g.currentSets;
                    const nearMevGoal = setsToMev > 0 && setsToMev <= 3;
                    // Bar fill: percentage of MRV (capped at 100%)
                    const fillPct = Math.min(100, Math.round((g.currentSets / g.mrv) * 100));
                    // Color zone
                    const barColor =
                      g.zone === 'over_mrv' ? 'bg-red-500'
                      : g.zone === 'near_mrv' ? 'bg-amber-400'
                      : g.zone === 'productive' ? 'bg-green-500'
                      : 'bg-amber-400/70';
                    // MEV marker position on the bar
                    const mevPct = Math.round((g.mev / g.mrv) * 100);

                    return (
                      <div key={g.muscle} className="space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-medium text-grappler-400">{g.label}</span>
                          <span className="text-[10px] tabular-nums text-grappler-500">
                            {g.currentSets}/{g.mev}
                          </span>
                        </div>
                        <div className="relative h-1.5 rounded-full bg-grappler-800/60 overflow-hidden">
                          {/* MEV marker */}
                          <div
                            className="absolute top-0 bottom-0 w-px bg-grappler-500/40 z-10"
                            style={{ left: `${mevPct}%` }}
                          />
                          {/* Fill bar */}
                          <motion.div
                            className={cn('h-full rounded-full', barColor, nearMevGoal && 'shadow-[0_0_6px_rgba(251,191,36,0.5)]')}
                            initial={{ width: 0 }}
                            animate={{ width: `${fillPct}%` }}
                            transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.05 }}
                          />
                          {/* Pulsing glow overlay for near-MEV goal gradient */}
                          {nearMevGoal && (
                            <motion.div
                              className="absolute inset-0 rounded-full bg-amber-400/20"
                              animate={{ opacity: [0.2, 0.5, 0.2] }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                              style={{ width: `${fillPct}%` }}
                            />
                          )}
                        </div>
                        {/* Goal gradient nudge */}
                        {nearMevGoal && (
                          <span className="text-[9px] text-amber-400/80 font-medium">
                            {setsToMev} more {setsToMev === 1 ? 'set' : 'sets'} to reach MEV
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
