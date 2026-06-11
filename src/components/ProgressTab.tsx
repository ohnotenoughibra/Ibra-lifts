'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { estimate1RM } from '@/lib/weight-estimator';
import { useShallow } from 'zustand/react/shallow';
import {
  Flame,
  Target,
  TrendingUp,
  Download,
  FileSpreadsheet,
  FileJson,
  History,
  Scaling,
  MoreHorizontal,
  Trophy,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Clock,
  Award,
  Star,
  Share2,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Gauge,
  HeartPulse,
  Swords,
  Medal,
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import { useComputedGamification } from '@/lib/computed-gamification';
import type { WorkoutLog, GamificationStats, TrainingSession } from '@/lib/types';
import { getExerciseById } from '@/lib/exercises';
import { isCurrentWeek, computeChallengeProgress, badges as allBadges } from '@/lib/gamification';
import { calculate1RM, VOLUME_LANDMARKS } from '@/lib/workout-generator';
import { generateWorkoutShareCard } from '@/lib/share-card';
import {
  extractPRTimeline,
  calculateSyntheticRecovery,
  detectPlateaus,
  calculateCombatBenchmarks,
  calculateHardMetrics,
  calculateMuscleVolumeGauges,
  type PREvent,
  type MuscleVolumeGauge,
} from '@/lib/progress-analytics';
import { exportToCSV, exportToJSON, downloadFile, exportFullBackup, importFullBackup, readFileAsText } from '@/lib/data-export';
import type { OverlayView } from './dashboard-types';
import { generatePerformanceNarrative } from '@/lib/performance-narratives';
import EmptyState from './EmptyState';
import WorkoutHistory from './WorkoutHistory';

// Stable fallback for store selectors — an inline `?? []` returns a fresh
// reference every evaluation and defeats useShallow equality.
const EMPTY_ARR: never[] = [];

const BodyWeightTracker = dynamic(() => import('./BodyWeightTracker'), {
  loading: () => (
    <div className="min-h-screen bg-grappler-950 animate-pulse">
      <div className="p-4 space-y-4">
        <div className="h-32 bg-grappler-800/50 rounded-xl" />
        <div className="h-24 bg-grappler-800/50 rounded-xl" />
      </div>
    </div>
  ),
});

// ─── Widget Cards ───

/**
 * TodaySnapshot — top-of-Body-tab strip with 4 vitals.
 * Per audit: "a fighter who taps Stats out of habit gets immediate signal,
 * not a wall of charts."
 */
function TodaySnapshot({
  workoutLogs,
  trainingSessions,
  gamificationStats,
}: {
  workoutLogs: WorkoutLog[];
  trainingSessions: TrainingSession[];
  gamificationStats: GamificationStats;
}) {
  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const twoWeeks = 14 * 24 * 60 * 60 * 1000;

  const last7 = workoutLogs.filter(l => new Date(l.date).getTime() >= now - oneWeek);
  const prev7 = workoutLogs.filter(l => {
    const t = new Date(l.date).getTime();
    return t >= now - twoWeeks && t < now - oneWeek;
  });
  const last7Sessions = trainingSessions.filter(s => new Date(s.date).getTime() >= now - oneWeek);

  const last7Volume = last7.reduce((s, l) => s + (l.totalVolume ?? 0), 0);
  const prev7Volume = prev7.reduce((s, l) => s + (l.totalVolume ?? 0), 0);
  const volumeDelta = prev7Volume > 0 ? Math.round(((last7Volume - prev7Volume) / prev7Volume) * 100) : 0;
  const volumeDirection = volumeDelta > 5 ? 'up' : volumeDelta < -5 ? 'down' : 'flat';

  // Lifetime PR count comes from gamification; we approximate "this week" by
  // summing personal-records delta if recorded recently. Simpler proxy:
  // count weight-PRs by detecting any set heavier than any prior set for the same exercise.
  const priorMaxByExercise = new Map<string, number>();
  for (const log of workoutLogs) {
    if (new Date(log.date).getTime() >= now - oneWeek) continue;
    for (const ex of log.exercises ?? []) {
      const max = Math.max(...(ex.sets ?? []).map(s => s.weight ?? 0), priorMaxByExercise.get(ex.exerciseId) ?? 0);
      priorMaxByExercise.set(ex.exerciseId, max);
    }
  }
  let prsLast7 = 0;
  for (const log of last7) {
    for (const ex of log.exercises ?? []) {
      const prev = priorMaxByExercise.get(ex.exerciseId) ?? 0;
      const week = Math.max(...(ex.sets ?? []).map(s => s.weight ?? 0), 0);
      if (week > prev && prev > 0) prsLast7++;
    }
  }

  // ACWR rough zone — uses last 7d total session count vs avg of prior 4 weeks
  const fourWeekTotal = workoutLogs.filter(l => new Date(l.date).getTime() >= now - 4 * oneWeek).length;
  const chronic = fourWeekTotal / 4 || 1;
  const acwrRatio = (last7.length + last7Sessions.length) / chronic;
  const acwrZone = acwrRatio < 0.8 ? 'Under' : acwrRatio > 1.5 ? 'Spike' : acwrRatio > 1.3 ? 'High' : 'Sweet';
  const acwrColor =
    acwrZone === 'Sweet' ? 'text-emerald-400' :
    acwrZone === 'Under' ? 'text-grappler-400' :
    acwrZone === 'High' ? 'text-amber-400' :
    'text-rose-400';

  return (
    <div className="rounded-lg bg-grappler-900/40 border border-grappler-800 p-4">
      <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-grappler-500 mb-3">
        This Week
      </div>
      <div className="grid grid-cols-4 gap-3">
        <SnapshotCell label="PRs" value={String(prsLast7)} subtext={prsLast7 === 0 ? '0 logged' : 'this wk'} accent="text-emerald-400" />
        <SnapshotCell
          label="Volume"
          value={volumeDirection === 'up' ? `+${volumeDelta}%` : volumeDirection === 'down' ? `${volumeDelta}%` : '—'}
          subtext="vs last wk"
          accent={volumeDirection === 'up' ? 'text-emerald-400' : volumeDirection === 'down' ? 'text-rose-400' : 'text-grappler-400'}
        />
        <SnapshotCell label="Streak" value={String(gamificationStats?.currentStreak ?? 0)} subtext="days" accent="text-amber-400" />
        <SnapshotCell label="Load" value={acwrZone} subtext={`${acwrRatio.toFixed(2)}x`} accent={acwrColor} />
      </div>
    </div>
  );
}

function SnapshotCell({ label, value, subtext, accent }: { label: string; value: string; subtext: string; accent: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-grappler-500">{label}</div>
      <div className={cn('text-xl font-bold font-mono leading-tight', accent)}>{value}</div>
      <div className="text-[10px] text-grappler-500">{subtext}</div>
    </div>
  );
}

function E1rmTrendsCard({ workoutLogs, weightUnit }: { workoutLogs: WorkoutLog[]; weightUnit: string }) {
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [goalInput, setGoalInput] = useState('');
  const [goals, setGoals] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem('roots-lift-goals') || '{}');
    } catch { return {}; }
  });

  const saveGoal = (exerciseId: string, target: number) => {
    const updated = { ...goals, [exerciseId]: target };
    setGoals(updated);
    localStorage.setItem('roots-lift-goals', JSON.stringify(updated));
    setEditingGoal(null);
    setGoalInput('');
  };

  const trends = useMemo(() => {
    const exerciseFreq: Record<string, number> = {};
    for (const log of workoutLogs) {
      for (const ex of log.exercises) {
        exerciseFreq[ex.exerciseId] = (exerciseFreq[ex.exerciseId] || 0) + 1;
      }
    }
    const topExercises = Object.entries(exerciseFreq)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id]) => id);

    const result: { name: string; current: number; previous: number; exerciseId: string }[] = [];
    for (const liftId of topExercises) {
      const logsWithLift = workoutLogs
        .filter(log => log.exercises.some(ex => ex.exerciseId === liftId))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (logsWithLift.length >= 1) {
        const getE1rm = (log: WorkoutLog) => {
          const ex = log.exercises.find(e => e.exerciseId === liftId);
          if (!ex) return 0;
          const bestSet = ex.sets.filter(s => s.completed).sort((a, b) =>
            estimate1RM(b.weight, b.reps) - estimate1RM(a.weight, a.reps)
          )[0];
          if (!bestSet || bestSet.weight === 0) return 0;
          return Math.round(estimate1RM(bestSet.weight, bestSet.reps));
        };
        const current = getE1rm(logsWithLift[0]);
        const previous = logsWithLift.length >= 2 ? getE1rm(logsWithLift[1]) : current;
        if (current > 0) {
          const exercise = getExerciseById(liftId);
          const name = exercise?.name || liftId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          result.push({ name, current, previous, exerciseId: liftId });
        }
      }
    }
    return result;
  }, [workoutLogs]);

  if (trends.length === 0) return null;

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-grappler-200 mb-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-accent-400" />
        Estimated 1RM
        <span className="text-[9px] text-grappler-600 ml-auto">Tap to set goal</span>
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {trends.map((lift) => {
          const diff = lift.current - lift.previous;
          const isUp = diff > 0;
          const goal = goals[lift.exerciseId];
          const goalPct = goal && goal > 0 ? Math.min(100, Math.round((lift.current / goal) * 100)) : null;
          const goalReached = goal && lift.current >= goal;

          return (
            <button
              key={lift.exerciseId}
              onClick={() => {
                if (editingGoal === lift.exerciseId) {
                  setEditingGoal(null);
                } else {
                  setEditingGoal(lift.exerciseId);
                  setGoalInput(goal ? String(goal) : String(Math.round(lift.current * 1.1)));
                }
              }}
              className="text-left bg-grappler-800/50 rounded-lg px-3 py-2 hover:bg-grappler-800/70 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-grappler-400 capitalize">{lift.name}</p>
                  <p className="text-sm font-bold text-grappler-100">{lift.current} {weightUnit}</p>
                </div>
                {diff !== 0 && (
                  <span className={cn('text-xs font-medium', isUp ? 'text-green-400' : 'text-red-400')}>
                    {isUp ? '+' : ''}{diff}
                  </span>
                )}
              </div>

              {/* Goal progress bar */}
              {goal && !goalReached && goalPct !== null && (
                <div className="mt-1.5">
                  <div className="flex justify-between text-[9px] text-grappler-500 mb-0.5">
                    <span>Goal: {goal} {weightUnit}</span>
                    <span>{goalPct}%</span>
                  </div>
                  <div className="w-full h-1 bg-grappler-700 rounded-full overflow-hidden">
                    <div className="h-full bg-accent-500 rounded-full transition-all" style={{ width: `${goalPct}%` }} />
                  </div>
                </div>
              )}
              {goalReached && (
                <p className="text-[9px] text-green-400 font-semibold mt-1">Goal reached!</p>
              )}

              {/* Inline goal editor */}
              {editingGoal === lift.exerciseId && (
                <div className="mt-2 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                  <input
                    type="number" inputMode="decimal" enterKeyHint="done"
                    value={goalInput}
                    onChange={e => setGoalInput(e.target.value)}
                    className="w-20 bg-grappler-700 text-grappler-100 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder={weightUnit}
                    autoFocus
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); const v = parseInt(goalInput); if (v > 0) saveGoal(lift.exerciseId, v); }}
                    className="text-xs bg-primary-500 text-white px-2 py-1 rounded font-medium"
                  >
                    Set
                  </button>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Interpretation — what does this mean? */}
      {(() => {
        const improving = trends.filter(t => t.current > t.previous).length;
        const declining = trends.filter(t => t.current < t.previous).length;
        const total = trends.length;
        if (total === 0) return null;

        const bestGain = trends.reduce((best, t) => {
          const diff = t.current - t.previous;
          return diff > (best?.diff || 0) ? { name: t.name, diff } : best;
        }, null as { name: string; diff: number } | null);

        const message = improving > declining
          ? `${improving}/${total} lifts trending up.${bestGain && bestGain.diff > 0 ? ` Best: ${bestGain.name} +${bestGain.diff} ${weightUnit}.` : ''} Keep pushing.`
          : improving === declining
          ? `Mixed signals \u2014 ${improving} up, ${declining} down. Consider varying stimulus.`
          : `${declining}/${total} lifts down. Possible fatigue \u2014 check recovery.`;

        return (
          <p className={cn(
            'text-xs mt-2 px-1',
            improving > declining ? 'text-green-400/80' : improving === declining ? 'text-yellow-400/80' : 'text-amber-400/80'
          )}>
            {message}
          </p>
        );
      })()}
    </div>
  );
}

function BodyRecompCard({ workoutLogs, bodyWeightLog, weightUnit }: { workoutLogs: WorkoutLog[]; bodyWeightLog: { date: Date | string; weight: number }[]; weightUnit: string }) {
  const activeDietPhase = useAppStore(s => s.activeDietPhase);
  const phase = activeDietPhase?.isActive ? activeDietPhase.goal : null; // 'cut' | 'maintain' | 'bulk' | null

  const data = useMemo(() => {
    if (bodyWeightLog.length < 2 && workoutLogs.length < 2) return null;
    const eightWeeksAgo = Date.now() - 56 * 24 * 60 * 60 * 1000;
    const fourWeeksAgo = Date.now() - 28 * 24 * 60 * 60 * 1000;

    // Get all recent weights (8 weeks for extended trendline)
    const allRecentWeights = bodyWeightLog
      .filter(e => new Date(e.date).getTime() > eightWeeksAgo)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 4-week window weights for delta
    const recentWeights = allRecentWeights.filter(e => new Date(e.date).getTime() > fourWeeksAgo);
    let weightDelta: number | null = null;
    if (recentWeights.length >= 2) {
      weightDelta = +(recentWeights[recentWeights.length - 1].weight - recentWeights[0].weight).toFixed(1);
    }

    // Weight sparkline over 8 weeks
    const weightTrend = allRecentWeights.map(w => w.weight);

    const recentLogs = workoutLogs
      .filter(l => new Date(l.date).getTime() > fourWeeksAgo)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let volumeDelta: number | null = null;
    if (recentLogs.length >= 4) {
      const half = Math.floor(recentLogs.length / 2);
      const firstHalfAvg = recentLogs.slice(0, half).reduce((s, l) => s + l.totalVolume, 0) / half;
      const secondHalfAvg = recentLogs.slice(half).reduce((s, l) => s + l.totalVolume, 0) / (recentLogs.length - half);
      volumeDelta = Math.round(secondHalfAvg - firstHalfAvg);
    }
    if (weightDelta === null && volumeDelta === null) return null;
    return {
      weightDelta,
      volumeDelta,
      latestWeight: recentWeights.length > 0 ? recentWeights[recentWeights.length - 1].weight : null,
      weightTrend,
    };
  }, [workoutLogs, bodyWeightLog]);

  if (!data) return null;

  // Phase-aware interpretation
  const getInterpretation = () => {
    if (data.weightDelta === null || data.volumeDelta === null) return 'Tracking trends — keep logging to see patterns.';

    if (phase === 'cut') {
      if (data.weightDelta < 0 && data.volumeDelta >= 0)
        return 'Weight dropping while maintaining volume — cut is on track!';
      if (data.weightDelta < 0 && data.volumeDelta < 0)
        return 'Losing volume on the cut — consider slowing the deficit.';
      if (data.weightDelta >= 0)
        return 'Weight not dropping — may need to tighten calories or increase activity.';
    }

    if (phase === 'bulk') {
      if (data.weightDelta > 0 && data.volumeDelta > 0)
        return 'Weight and volume both climbing — lean bulk is working!';
      if (data.weightDelta > 0 && data.volumeDelta <= 0)
        return 'Gaining weight but volume stalled — push harder in the gym.';
      if (data.weightDelta <= 0)
        return 'Weight not climbing — you may need a bigger surplus.';
    }

    if (phase === 'maintain') {
      if (Math.abs(data.weightDelta) <= 0.5 && data.volumeDelta >= 0)
        return 'Weight stable, volume maintained — perfect maintenance phase.';
      if (Math.abs(data.weightDelta) > 1)
        return 'Weight drifting more than expected — check calorie intake.';
    }

    // No phase set — default interpretations
    if (data.weightDelta <= 0 && data.volumeDelta > 0) return 'Losing weight while lifting more — solid recomp!';
    if (data.weightDelta > 0 && data.volumeDelta > 0) return 'Weight and volume both up — lean bulk territory.';
    if (data.weightDelta < 0 && data.volumeDelta < 0) return 'Both trending down — make sure you\'re fueling enough.';
    return 'Tracking trends — keep logging to see patterns.';
  };

  // Mini SVG sparkline for weight trend
  const WeightSparkline = () => {
    if (data.weightTrend.length < 2) return null;
    const pts = data.weightTrend;
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const range = max - min || 1;
    const w = 100;
    const h = 24;
    const points = pts.map((v, i) =>
      `${(i / (pts.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`
    ).join(' ');
    return (
      <svg width={w} height={h} className="mt-1">
        <polyline fill="none" className="stroke-violet-400" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
      </svg>
    );
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-grappler-200 flex items-center gap-2">
          <Scaling className="w-4 h-4 text-purple-400" />
          Body Recomp
        </h3>
        {phase && (
          <span className={cn(
            'text-xs font-semibold px-2 py-0.5 rounded-full uppercase',
            phase === 'cut' ? 'bg-red-500/15 text-red-400' :
            phase === 'bulk' ? 'bg-blue-500/15 text-blue-400' :
            'bg-green-500/15 text-green-400'
          )}>
            {phase}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {data.latestWeight !== null && (
          <div className="bg-grappler-800/50 rounded-lg px-3 py-2">
            <p className="text-xs text-grappler-400">Weight</p>
            <p className="text-sm font-bold text-grappler-100">{data.latestWeight} {weightUnit}</p>
            {data.weightDelta !== null && (
              <p className={cn('text-xs font-medium',
                phase === 'cut' ? (data.weightDelta < 0 ? 'text-green-400' : 'text-red-400') :
                phase === 'bulk' ? (data.weightDelta > 0 ? 'text-green-400' : 'text-yellow-400') :
                data.weightDelta > 0 ? 'text-sky-400' : data.weightDelta < 0 ? 'text-blue-400' : 'text-grappler-500'
              )}>
                {data.weightDelta > 0 ? '+' : ''}{data.weightDelta} {weightUnit}
              </p>
            )}
            <WeightSparkline />
          </div>
        )}
        {data.volumeDelta !== null && (
          <div className="bg-grappler-800/50 rounded-lg px-3 py-2">
            <p className="text-xs text-grappler-400">Avg Volume</p>
            <p className={cn('text-sm font-bold', data.volumeDelta > 0 ? 'text-green-400' : data.volumeDelta < 0 ? 'text-red-400' : 'text-grappler-100')}>
              {data.volumeDelta > 0 ? '+' : ''}{formatNumber(data.volumeDelta)}
            </p>
            <p className="text-xs text-grappler-400">vs first 2 weeks</p>
          </div>
        )}
      </div>
      <p className="text-xs text-grappler-400 mt-2">{getInterpretation()}</p>
    </div>
  );
}

function StreakHeatmap({ workoutLogs, onDayClick }: { workoutLogs: WorkoutLog[]; onDayClick?: (date: Date) => void }) {
  const trainingSessions = useAppStore(s => s.trainingSessions);
  const user = useAppStore(s => s.user);
  const weeks = 12;

  const toDateKey = (d: Date | string): string => {
    if (typeof d === 'string') {
      return new Date(d).toDateString();
    }
    return d.toDateString();
  };

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  }, []);
  const todayKey = today.toDateString();

  const liftingDateKeys = useMemo(() => {
    const keys = new Set<string>();
    if (!workoutLogs || workoutLogs.length === 0) return keys;
    workoutLogs.forEach(log => {
      if (log.date) {
        keys.add(toDateKey(log.date));
      }
    });
    return keys;
  }, [workoutLogs]);

  const includeOtherSessions = user && (user.trainingIdentity === 'combat' || user.trainingIdentity === 'general_fitness');

  const sessionDateKeys = useMemo(() => {
    const keys = new Set<string>();
    if (!includeOtherSessions || !trainingSessions) return keys;
    trainingSessions.forEach(s => {
      if (s.date) {
        keys.add(toDateKey(s.date));
      }
    });
    return keys;
  }, [trainingSessions, includeOtherSessions]);

  const calculateStreak = useCallback((dateKeys: Set<string>) => {
    if (dateKeys.size === 0) return 0;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toDateString();
    const hasToday = dateKeys.has(todayKey);
    const hasYesterday = dateKeys.has(yesterdayKey);
    if (!hasToday && !hasYesterday) return 0;
    let streak = 0;
    const checkDate = new Date(today);
    if (!hasToday) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    while (dateKeys.has(checkDate.toDateString())) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    return streak;
  }, [today, todayKey]);

  const liftingStreak = calculateStreak(liftingDateKeys);
  const trainingStreak = includeOtherSessions ? calculateStreak(sessionDateKeys) : 0;

  const thisWeekLiftingCount = useMemo(() => {
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);
    if (!workoutLogs || workoutLogs.length === 0) return 0;
    return workoutLogs.filter(log => {
      if (!log.date) return false;
      const d = typeof log.date === 'string' ? new Date(log.date) : log.date;
      return d >= weekAgo && d <= today;
    }).length;
  }, [workoutLogs, today]);

  const thisWeekSessionCount = useMemo(() => {
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);
    if (!includeOtherSessions || !trainingSessions) return 0;
    return trainingSessions.filter(s => {
      if (!s.date) return false;
      const d = typeof s.date === 'string' ? new Date(s.date) : s.date;
      return d >= weekAgo && d <= today;
    }).length;
  }, [trainingSessions, includeOtherSessions, today]);

  type DayData = {
    date: Date;
    dateKey: string;
    hasLifting: boolean;
    hasSession: boolean;
    isToday: boolean;
    isFuture: boolean;
  };

  const grid = useMemo(() => {
    const result: DayData[][] = [];
    const startDate = new Date(today);
    startDate.setHours(0, 0, 0, 0);
    const daysFromSunday = startDate.getDay();
    startDate.setDate(startDate.getDate() - daysFromSunday - (weeks - 1) * 7);
    for (let w = 0; w < weeks; w++) {
      const week: DayData[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + w * 7 + d);
        const dateKey = date.toDateString();
        const isFuture = date.getTime() > today.getTime();
        week.push({
          date,
          dateKey,
          hasLifting: liftingDateKeys.has(dateKey),
          hasSession: sessionDateKeys.has(dateKey),
          isToday: dateKey === todayKey,
          isFuture,
        });
      }
      result.push(week);
    }
    return result;
  }, [today, liftingDateKeys, sessionDateKeys, todayKey]);

  const getDayColor = (day: DayData) => {
    if (day.isFuture) return 'bg-grappler-800/30';
    if (day.hasLifting && day.hasSession) return 'bg-gradient-to-br from-green-500 to-blue-500';
    if (day.hasLifting) return 'bg-green-500';
    if (day.hasSession) return 'bg-blue-500';
    // Past days with no activity = rest day (amber)
    return 'bg-amber-500/40';
  };

  const getDayTitle = (day: DayData) => {
    const dateStr = day.date.toLocaleDateString();
    if (day.hasLifting && day.hasSession) return `${dateStr} — lifting + training`;
    if (day.hasLifting) return `${dateStr} — lifting`;
    if (day.hasSession) return `${dateStr} — training`;
    if (!day.isFuture) return `${dateStr} — rest day`;
    return dateStr;
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-grappler-200 uppercase tracking-wide flex items-center gap-2">
          <Flame className="w-4 h-4 text-blue-400" />
          Training Streaks
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1" title={`${liftingStreak} day streak`}>
            <div className="w-2.5 h-2.5 rounded-sm bg-green-500" />
            <span className="text-lg font-black text-green-400">{thisWeekLiftingCount}</span>
          </div>
          {includeOtherSessions && (
            <div className="flex items-center gap-1" title={`${trainingStreak} day streak`}>
              <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
              <span className="text-lg font-black text-blue-400">{thisWeekSessionCount}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-[3px]">
        {grid.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day, di) => {
              const canClick = onDayClick && !day.isFuture;
              return (
                <div
                  key={di}
                  onClick={() => canClick && onDayClick(day.date)}
                  onKeyDown={canClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDayClick!(day.date); } } : undefined}
                  tabIndex={canClick ? 0 : undefined}
                  role={canClick ? 'button' : undefined}
                  aria-label={canClick ? getDayTitle(day) : undefined}
                  className={cn(
                    'w-3 h-3 rounded-sm transition-colors',
                    getDayColor(day),
                    day.isToday && 'ring-1 ring-primary-400',
                    canClick && 'cursor-pointer hover:ring-1 hover:ring-white/40 focus-visible:ring-1 focus-visible:ring-primary-400 focus-visible:outline-none'
                  )}
                  title={getDayTitle(day)}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-grappler-400">{weeks * 7} days</span>
        <div className="flex items-center gap-2 text-xs text-grappler-400">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-green-500" />
            <span>Lifting</span>
          </div>
          {includeOtherSessions && (
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
              <span>Training</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-amber-500/40" />
            <span>Rest</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Hard Metrics (replaces Performance Score) ───

function HardMetricsCard({ workoutLogs }: { workoutLogs: WorkoutLog[] }) {
  const currentMesocycle = useAppStore(s => s.currentMesocycle);
  const metrics = useMemo(
    () => calculateHardMetrics(workoutLogs, currentMesocycle?.id || null),
    [workoutLogs, currentMesocycle]
  );

  if (!metrics) return null;

  const { strengthTrend, volumeCapacity, fightReadiness } = metrics;

  const getZoneColor = (zone: string) => {
    switch (zone) {
      case 'below_mev': return 'text-yellow-400';
      case 'productive': return 'text-green-400';
      case 'near_mrv': return 'text-orange-400';
      case 'over_mrv': return 'text-red-400';
      default: return 'text-grappler-400';
    }
  };
  const getZoneLabel = (zone: string) => {
    switch (zone) {
      case 'below_mev': return 'Below MEV';
      case 'productive': return 'Productive';
      case 'near_mrv': return 'Approaching MRV';
      case 'over_mrv': return 'Over MRV';
      default: return '';
    }
  };

  return (
    <div className="card p-4">
      <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wider flex items-center gap-2 mb-3">
        <Activity className="w-3.5 h-3.5" />
        Training Pulse
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {/* Strength Trend */}
        <div className="text-center bg-grappler-800/50 rounded-lg px-2 py-3">
          <div className="flex items-center justify-center gap-1 mb-1">
            {strengthTrend.direction === 'up'
              ? <ArrowUpRight className="w-3.5 h-3.5 text-green-400" />
              : strengthTrend.direction === 'down'
              ? <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
              : <Minus className="w-3.5 h-3.5 text-grappler-500" />}
            <span className={cn('text-lg font-black',
              strengthTrend.direction === 'up' ? 'text-green-400' :
              strengthTrend.direction === 'down' ? 'text-red-400' : 'text-grappler-300'
            )}>
              {strengthTrend.value > 0 ? '+' : ''}{strengthTrend.value}%
            </span>
          </div>
          <p className="text-xs text-grappler-500 font-medium">Strength</p>
          <p className={cn('text-[9px] font-semibold',
            strengthTrend.direction === 'up' ? 'text-green-500' :
            strengthTrend.direction === 'down' ? 'text-red-500' : 'text-grappler-500'
          )}>{strengthTrend.label}</p>
        </div>

        {/* Volume Capacity */}
        <div className="text-center bg-grappler-800/50 rounded-lg px-2 py-3">
          <p className={cn('text-lg font-black', getZoneColor(volumeCapacity.zone))}>
            {volumeCapacity.pctOfMAV}%
          </p>
          <p className="text-xs text-grappler-500 font-medium">Vol Capacity</p>
          <p className={cn('text-[9px] font-semibold', getZoneColor(volumeCapacity.zone))}>
            {getZoneLabel(volumeCapacity.zone)}
          </p>
        </div>

        {/* Fight Readiness */}
        <div className="text-center bg-grappler-800/50 rounded-lg px-2 py-3">
          <p className={cn('text-lg font-black',
            fightReadiness.score >= 80 ? 'text-green-400' :
            fightReadiness.score >= 60 ? 'text-primary-400' :
            fightReadiness.score >= 40 ? 'text-yellow-400' : 'text-red-400'
          )}>
            {fightReadiness.score}
          </p>
          <p className="text-xs text-grappler-500 font-medium">Readiness</p>
          <p className={cn('text-[9px] font-semibold',
            fightReadiness.score >= 80 ? 'text-green-500' :
            fightReadiness.score >= 60 ? 'text-primary-500' :
            fightReadiness.score >= 40 ? 'text-yellow-500' : 'text-red-500'
          )}>{fightReadiness.label}</p>
        </div>
      </div>
    </div>
  );
}

// ─── PR Timeline ───

function SessionRecapCard() {
  const lastCompleted = useAppStore(s => s.lastCompletedWorkout);
  const weightUnit = useAppStore(s => s.user?.weightUnit || 'lbs');
  const [sharing, setSharing] = useState(false);

  if (!lastCompleted) return null;

  // Show for 2 hours after completion
  const completedAt = new Date(lastCompleted.log.date).getTime();
  const hoursAgo = (Date.now() - completedAt) / (1000 * 60 * 60);
  if (hoursAgo > 2) return null;

  const { log, points, hadPR, newBadges, newStreak } = lastCompleted;
  const prCount = log.exercises.filter(e => e.personalRecord).length;

  const handleShareImage = async () => {
    setSharing(true);
    try {
      const blob = await generateWorkoutShareCard({
        exercises: log.exercises.length,
        volume: log.totalVolume,
        duration: log.duration,
        prs: prCount,
        streak: newStreak,
        xp: points,
        weightUnit,
      });
      if (!blob) return;
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        const file = new File([blob], 'workout-recap.png', { type: 'image/png' });
        await navigator.share({ files: [file], title: 'Workout Complete — Ibra Lifts' });
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'workout-recap.png'; a.click();
        URL.revokeObjectURL(url);
      }
    } catch { /* user cancelled share */ }
    setSharing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card overflow-hidden"
    >
      <div className="bg-gradient-to-r from-green-600/20 via-primary-600/20 to-purple-600/20 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-green-300">Session Complete</h3>
              <p className="text-xs text-grappler-400">{Math.round(hoursAgo * 60) < 60 ? `${Math.round(hoursAgo * 60)}m ago` : `${Math.round(hoursAgo)}h ago`}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShareImage}
              disabled={sharing}
              aria-label="Share as image"
              className="text-green-400 hover:text-green-300 p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-colors disabled:opacity-50"
              title="Share as image"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full">
              +{points} XP
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5 mb-3">
          <div className="text-center bg-grappler-800/40 rounded-lg py-2 px-1">
            <p className="text-sm font-bold text-grappler-100">{log.exercises.length}</p>
            <p className="text-[9px] text-grappler-500">Exercises</p>
          </div>
          <div className="text-center bg-grappler-800/40 rounded-lg py-2 px-1">
            <p className="text-sm font-bold text-grappler-100">{formatNumber(log.totalVolume)}</p>
            <p className="text-[9px] text-grappler-500">Vol ({weightUnit})</p>
          </div>
          <div className="text-center bg-grappler-800/40 rounded-lg py-2 px-1">
            <p className="text-sm font-bold text-grappler-100">{log.duration}m</p>
            <p className="text-[9px] text-grappler-500">Duration</p>
          </div>
          <div className="text-center bg-grappler-800/40 rounded-lg py-2 px-1">
            <p className="text-sm font-bold text-grappler-100">{newStreak}</p>
            <p className="text-[9px] text-grappler-500">Streak</p>
          </div>
        </div>

        {/* PR highlight */}
        {hadPR && prCount > 0 && (
          <div className="flex items-center gap-2 bg-yellow-500/10 rounded-lg px-3 py-2 mb-2">
            <Star className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-semibold text-yellow-300">{prCount} Personal Record{prCount > 1 ? 's' : ''} Crushed!</span>
          </div>
        )}

        {/* Badges earned */}
        {newBadges && newBadges.length > 0 && (
          <div className="space-y-1.5">
            {newBadges.map(badge => (
              <div key={badge.id} className="flex items-center gap-2 bg-purple-500/10 rounded-lg px-3 py-2">
                <span className="text-base">{badge.icon}</span>
                <span className="text-xs font-semibold text-purple-300">{badge.name}</span>
                <span className="text-xs text-purple-400 ml-auto">+{badge.points}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Progress + History Tab ───

// ─── Block Performance Card ───

function BlockPerformanceCard() {
  const { currentMesocycle, workoutLogs, rawMesocycleHistory } = useAppStore(
    useShallow(s => ({ currentMesocycle: s.currentMesocycle, workoutLogs: s.workoutLogs, rawMesocycleHistory: s.mesocycleHistory }))
  );
  const weightUnit = useAppStore((s) => s.user?.weightUnit || 'lbs');
  // Raw stable ref in the selector; derive the filtered view here (a .filter()
  // in the selector returns a fresh array and defeats useShallow).
  const mesocycleHistory = useMemo(
    () => rawMesocycleHistory.filter(m => !m._deleted),
    [rawMesocycleHistory]
  );

  // All block stats in one memo — these make ~8 passes over workoutLogs.
  const stats = useMemo(() => {
    if (!currentMesocycle) return null;

    const currentLogs = workoutLogs.filter(l => l.mesocycleId === currentMesocycle.id);
    const totalSessions = currentMesocycle.weeks.reduce((s, w) => s + w.sessions.length, 0);
    const completed = currentLogs.length;
    const percentage = totalSessions > 0 ? Math.round((completed / totalSessions) * 100) : 0;

    const totalVolume = currentLogs.reduce((s, l) => s + (l.totalVolume || 0), 0);
    const avgRPE = currentLogs.length > 0
      ? Math.round((currentLogs.reduce((s, l) => s + (l.overallRPE || 0), 0) / currentLogs.length) * 10) / 10
      : 0;
    const prs = currentLogs.reduce((s, l) => s + l.exercises.filter(e => e.personalRecord).length, 0);

    // Compare vs previous block
    const prevMeso = mesocycleHistory.length > 0 ? mesocycleHistory[mesocycleHistory.length - 1] : null;
    const prevLogs = prevMeso ? workoutLogs.filter(l => l.mesocycleId === prevMeso.id) : [];
    const prevVolume = prevLogs.reduce((s, l) => s + (l.totalVolume || 0), 0);
    const volumeDelta = prevVolume > 0 ? Math.round(((totalVolume - prevVolume) / prevVolume) * 100) : null;

    // Pace calculation
    const startDate = currentLogs.length > 0
      ? new Date(Math.min(...currentLogs.map(l => new Date(l.date).getTime())))
      : null;
    const weeksElapsed = startDate
      ? Math.max(1, Math.round((Date.now() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)))
      : 1;
    const totalWeeks = currentMesocycle.weeks.length;
    const expectedCompletion = Math.round((weeksElapsed / totalWeeks) * totalSessions);
    const paceStatus = completed >= expectedCompletion ? (completed > expectedCompletion + 1 ? 'ahead' : 'on_track') : 'behind';

    return { totalSessions, completed, percentage, totalVolume, avgRPE, prs, volumeDelta, paceStatus };
  }, [currentMesocycle, workoutLogs, mesocycleHistory]);

  if (!stats) return null;
  const { totalSessions, completed, percentage, totalVolume, avgRPE, prs, volumeDelta, paceStatus } = stats;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wider flex items-center gap-2">
          <Target className="w-3.5 h-3.5" />
          Current Block
        </h3>
        <span className={cn(
          'text-xs font-semibold px-2 py-0.5 rounded-full',
          paceStatus === 'ahead' ? 'bg-green-500/20 text-green-400' :
          paceStatus === 'on_track' ? 'bg-primary-500/20 text-primary-400' :
          'bg-yellow-500/20 text-yellow-400'
        )}>
          {paceStatus === 'ahead' ? 'Ahead' : paceStatus === 'on_track' ? 'On Track' : 'Behind'}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-grappler-400 mb-1">
          <span>{completed}/{totalSessions} sessions</span>
          <span>{percentage}%</span>
        </div>
        <div className="w-full h-2 bg-grappler-700 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', percentage >= 100 ? 'bg-green-400' : 'bg-primary-500')}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-lg font-bold text-grappler-100">{formatNumber(totalVolume)}</p>
          <p className="text-xs text-grappler-400">Volume ({weightUnit})</p>
          {volumeDelta !== null && (
            <p className={cn('text-xs font-medium', volumeDelta >= 0 ? 'text-green-400' : 'text-red-400')}>
              {volumeDelta >= 0 ? '+' : ''}{volumeDelta}% vs last
            </p>
          )}
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-grappler-100">{avgRPE || '—'}</p>
          <p className="text-xs text-grappler-400">Avg RPE</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-yellow-400">{prs}</p>
          <p className="text-xs text-grappler-400">PRs</p>
        </div>
      </div>
    </div>
  );
}

// Skeleton placeholder for overview cards
function OverviewSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="card p-4 flex items-center gap-4">
        <div className="w-24 h-24 rounded-full bg-grappler-800" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-28 bg-grappler-800 rounded" />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-1.5 w-16 bg-grappler-800 rounded" />
              <div className="flex-1 h-1.5 bg-grappler-800 rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="card p-4 space-y-3">
        <div className="h-3 w-20 bg-grappler-800 rounded" />
        <div className="h-2 w-full bg-grappler-800 rounded" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-12 bg-grappler-800 rounded-lg" />)}
        </div>
      </div>
      <div className="card p-4 space-y-2">
        <div className="h-3 w-24 bg-grappler-800 rounded" />
        {[1, 2, 3].map(i => <div key={i} className="h-10 bg-grappler-800 rounded-lg" />)}
      </div>
    </div>
  );
}

export default function ProgressAndHistoryTab({ onViewReport, onNavigate }: { onViewReport: (mesoId: string) => void; onNavigate?: (view: OverlayView, context?: string) => void }) {
  const { workoutLogs, user, rawBodyWeightLog, gamificationStats, trainingSessions } = useAppStore(
    useShallow(s => ({ workoutLogs: s.workoutLogs, user: s.user, rawBodyWeightLog: s.bodyWeightLog, gamificationStats: s.gamificationStats, trainingSessions: s.trainingSessions ?? EMPTY_ARR }))
  );
  // Raw stable ref in the selector; derive the filtered view here (a .filter()
  // in the selector returns a fresh array and defeats useShallow).
  const bodyWeightLog = useMemo(
    () => rawBodyWeightLog.filter(e => !e._deleted),
    [rawBodyWeightLog]
  );
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  const [showExport, setShowExport] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmImport, setConfirmImport] = useState(false);
  const weightUnit = user?.weightUnit || 'lbs';

  const narrative = useMemo(() => generatePerformanceNarrative({
    workoutLogs,
    trainingSessions,
    user,
  }), [workoutLogs, trainingSessions, user]);

  const handleExportCSV = () => {
    const csv = exportToCSV(workoutLogs, weightUnit);
    const date = new Date().toISOString().split('T')[0];
    downloadFile(csv, `roots-gains-${date}.csv`, 'text/csv');
  };

  const handleExportJSON = () => {
    const json = exportToJSON(workoutLogs);
    const date = new Date().toISOString().split('T')[0];
    downloadFile(json, `roots-gains-${date}.json`, 'application/json');
  };

  const handleExportBackup = () => {
    const backup = exportFullBackup();
    const date = new Date().toISOString().split('T')[0];
    downloadFile(backup, `roots-gains-backup-${date}.json`, 'application/json');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      setImportStatus({ type: 'error', message: 'Only .json backup files are supported' });
      e.target.value = '';
      setTimeout(() => setImportStatus(null), 5000);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImportStatus({ type: 'error', message: 'File too large (max 10MB)' });
      e.target.value = '';
      setTimeout(() => setImportStatus(null), 5000);
      return;
    }
    try {
      const text = await readFileAsText(file);
      try { JSON.parse(text); } catch {
        setImportStatus({ type: 'error', message: 'File is not valid JSON' });
        e.target.value = '';
        setTimeout(() => setImportStatus(null), 5000);
        return;
      }
      const result = importFullBackup(text);
      if (result.success) {
        setImportStatus({
          type: 'success',
          message: `Restored ${result.stats?.workouts ?? 0} workouts, ${result.stats?.meals ?? 0} meals, ${result.stats?.trainingSessions ?? 0} sessions`
        });
      } else {
        setImportStatus({ type: 'error', message: result.error || 'Import failed' });
      }
    } catch {
      setImportStatus({ type: 'error', message: 'Could not read file' });
    }
    e.target.value = '';
    setConfirmImport(false);
    setTimeout(() => setImportStatus(null), 5000);
  };

  return (
    <div className="space-y-4">
      {/* Single scrollable page — no sub-tabs */}
      {!hydrated && <OverviewSkeleton />}
      {hydrated && (
        <>
          {workoutLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center mb-5 ring-1 ring-primary-500/20">
                <TrendingUp className="w-10 h-10 text-primary-400" />
              </div>
              <h3 className="text-xl font-bold text-grappler-100 mb-2">Your stats live here</h3>
              <p className="text-sm text-grappler-400 max-w-[280px] mb-6">
                After your first workout you'll see strength trends, estimated 1RMs, volume analysis, and PRs.
              </p>
              <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
                {[
                  { label: 'Strength', desc: 'E1RM trends' },
                  { label: 'Volume', desc: 'Load tracking' },
                  { label: 'PRs', desc: 'Personal records' },
                ].map(item => (
                  <div key={item.label} className="bg-grappler-800/40 rounded-xl p-3 text-center ring-1 ring-grappler-700/30">
                    <p className="text-xs font-semibold text-grappler-300">{item.label}</p>
                    <p className="text-[10px] text-grappler-500 mt-0.5">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* ── TODAY SNAPSHOT — quick at-a-glance vitals before the deep-dive ── */}
              <TodaySnapshot
                workoutLogs={workoutLogs}
                trainingSessions={trainingSessions}
                gamificationStats={gamificationStats}
              />

              {/* ── SECTION 1: STRENGTH ── */}
              <h2 className="text-xl font-bold text-grappler-100">Strength</h2>

              {/* Progress Headline */}
              {narrative.hasData && (
                <div className="card p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-sm text-grappler-200 leading-relaxed">{narrative.summary}</p>
                  </div>
                  {narrative.highlights.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {narrative.highlights.slice(0, 3).map((h, i) => (
                        <div key={i} className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-medium border',
                          h.sentiment === 'positive' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          h.sentiment === 'negative' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          'bg-grappler-700/50 text-grappler-300 border-grappler-700'
                        )}>
                          <span className="font-bold">{h.stat}</span> {h.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Post-workout session recap (visible for 2h after workout) */}
              <SessionRecapCard />

              {/* E1RM Trends with goals */}
              <E1rmTrendsCard workoutLogs={workoutLogs} weightUnit={weightUnit} />

              {/* Deep-dive links */}
              {onNavigate && (
                <div className="flex gap-2">
                  <button
                    onClick={() => onNavigate('strength')}
                    className="flex-1 flex items-center gap-2 p-3 bg-grappler-800/60 border border-grappler-700/50 rounded-xl hover:bg-grappler-700/60 transition-colors"
                  >
                    <Target className="w-4 h-4 text-primary-400" />
                    <div className="text-left">
                      <p className="text-xs font-semibold text-grappler-200">Sticking Points</p>
                      <p className="text-[10px] text-grappler-500">Weak spots &amp; fixes</p>
                    </div>
                  </button>
                  <button
                    onClick={() => onNavigate('overload')}
                    className="flex-1 flex items-center gap-2 p-3 bg-grappler-800/60 border border-grappler-700/50 rounded-xl hover:bg-grappler-700/60 transition-colors"
                  >
                    <ArrowUpRight className="w-4 h-4 text-green-400" />
                    <div className="text-left">
                      <p className="text-xs font-semibold text-grappler-200">Overload Tracker</p>
                      <p className="text-[10px] text-grappler-500">Per-exercise progress</p>
                    </div>
                  </button>
                </div>
              )}

              {/* Hard Metrics — Strength, Volume, Readiness */}
              <HardMetricsCard workoutLogs={workoutLogs} />

              {/* Current block performance */}
              <BlockPerformanceCard />

              {/* Streak heatmap */}
              <StreakHeatmap workoutLogs={workoutLogs} />

              {/* ── Section divider ── */}
              <div className="h-px bg-grappler-700/40 my-6" />

              {/* ── SECTION 2: BODY ── */}
              <h2 className="text-xl font-bold text-grappler-100">Body</h2>

              <BodyWeightTracker />
              <BodyRecompCard workoutLogs={workoutLogs} bodyWeightLog={bodyWeightLog} weightUnit={weightUnit} />

              {/* ── Section divider ── */}
              <div className="h-px bg-grappler-700/40 my-6" />

              {/* ── SECTION 3: HISTORY ── */}
              <h2 className="text-xl font-bold text-grappler-100">History</h2>

              <WorkoutHistory />
            </>
          )}
        </>
      )}
    </div>
  );
}
