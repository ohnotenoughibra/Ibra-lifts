'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
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
import type { WorkoutLog, GamificationStats } from '@/lib/types';
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
import EmptyState from './EmptyState';
import ProgressCharts from './ProgressCharts';
import WorkoutHistory from './WorkoutHistory';


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
          const bestSet = ex.sets.filter(s => s.completed).sort((a, b) => {
            const a1rm = a.weight / (1.0278 - 0.0278 * a.reps);
            const b1rm = b.weight / (1.0278 - 0.0278 * b.reps);
            return b1rm - a1rm;
          })[0];
          if (!bestSet || bestSet.weight === 0) return 0;
          return bestSet.reps === 1 ? bestSet.weight : Math.round(bestSet.weight / (1.0278 - 0.0278 * bestSet.reps));
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
                    type="number"
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

function WeeklyChallengeCard({ gamificationStats }: { gamificationStats: GamificationStats }) {
  const storedChallenge = gamificationStats.weeklyChallenge;
  const workoutLogs = useAppStore(s => s.workoutLogs);
  const trainingSessions = useAppStore(s => s.trainingSessions);
  if (!storedChallenge || !isCurrentWeek(storedChallenge)) return null;

  // Compute real progress from actual data — stored counters can drift
  const challenge = computeChallengeProgress(storedChallenge, workoutLogs, trainingSessions);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-grappler-200 uppercase tracking-wide flex items-center gap-2">
          <Target className="w-4 h-4 text-purple-400" />
          Weekly Challenge
        </h3>
        {challenge.goals.every(g => g.completed) ? (
          <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">ALL DONE!</span>
        ) : (
          <span className="text-xs text-grappler-400">
            {challenge.goals.filter(g => g.completed).length}/3
          </span>
        )}
      </div>
      <div className="space-y-2">
        {challenge.goals.map((goal) => (
          <div key={goal.id} className={cn(
            'flex items-center gap-3 p-2.5 rounded-lg transition-colors',
            goal.completed ? 'bg-emerald-500/10' : 'bg-grappler-800/50'
          )}>
            <div className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs',
              goal.completed ? 'bg-emerald-500 text-white' : 'border border-grappler-600 text-grappler-500'
            )}>
              {goal.completed ? '✓' : ''}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm', goal.completed ? 'text-emerald-300 line-through' : 'text-grappler-200')}>
                {goal.description}
              </p>
              {!goal.completed && (
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-grappler-700 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (goal.current / goal.target) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-grappler-400 flex-shrink-0">
                    {goal.type === 'volume' ? formatNumber(goal.current) : goal.current}/{goal.type === 'volume' ? formatNumber(goal.target) : goal.target}
                  </span>
                </div>
              )}
            </div>
            <span className={cn('text-xs font-medium flex-shrink-0', goal.completed ? 'text-emerald-400' : 'text-purple-400')}>
              +{goal.xpReward} XP
            </span>
          </div>
        ))}
      </div>
      {challenge.goals.every(g => g.completed) && !challenge.allCompleteBonusClaimed && (
        <div className="mt-2 text-center py-2 bg-purple-500/10 rounded-lg">
          <span className="text-sm font-bold text-purple-300">+{challenge.allCompleteBonus} XP Bonus!</span>
        </div>
      )}
    </div>
  );
}

// ─── Streak Heatmap ───

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

const PERF_FACTOR_EXPLAINERS: Record<string, { what: string; action: string }> = {
  Consistency: {
    what: 'Sessions per week vs target (4 ideal). Regularity matters more than intensity.',
    action: 'Show up 4× per week minimum. A mediocre session beats a skipped one.',
  },
  Strength: {
    what: 'Estimated 1RM trends across your lifts over the past 4 weeks.',
    action: 'Focus on progressive overload — add weight or reps each session.',
  },
  Volume: {
    what: 'Total training volume trend (sets × reps × weight). Volume drives hypertrophy.',
    action: 'Aim to increase total volume 5-10% per week during accumulation phases.',
  },
  Recovery: {
    what: 'Average RPE sweet spot. 7-8.5 means you\'re training hard enough without burning out.',
    action: 'Log RPE honestly after each session. Consistently >9 = back off.',
  },
  Engagement: {
    what: 'Streaks, badges earned, and challenges completed. Staying engaged = long-term gains.',
    action: 'Keep your streak alive and tackle the next challenge.',
  },
};

function PerformanceScore({ workoutLogs, gamificationStats }: { workoutLogs: WorkoutLog[]; gamificationStats: GamificationStats }) {
  const computed = useComputedGamification();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [expandedFactor, setExpandedFactor] = useState<string | null>(null);

  const score = useMemo(() => {
    if (workoutLogs.length < 3) return null;

    const now = Date.now();
    const fourWeeksAgo = now - 28 * 24 * 60 * 60 * 1000;
    const recentLogs = workoutLogs.filter(l => new Date(l.date).getTime() > fourWeeksAgo);
    if (recentLogs.length === 0) return null;

    // Consistency (30%): sessions per week vs expected (4 ideal)
    const weeksInRange = Math.max(1, Math.round((now - Math.min(...recentLogs.map(l => new Date(l.date).getTime()))) / (7 * 24 * 60 * 60 * 1000)));
    const sessionsPerWeek = recentLogs.length / weeksInRange;
    const consistencyScore = Math.min(100, (sessionsPerWeek / 4) * 100);

    // Strength trend (25%): are lifts going up?
    let strengthScore = 50; // neutral default
    const exerciseData: Record<string, { date: number; e1rm: number }[]> = {};
    recentLogs.forEach(log => {
      log.exercises.forEach(ex => {
        if (!exerciseData[ex.exerciseId]) exerciseData[ex.exerciseId] = [];
        const maxE1rm = ex.sets.reduce((max, set) => {
          if (!set.completed || set.weight === 0) return max;
          const e1rm = calculate1RM(set.weight, set.reps);
          return e1rm > max ? e1rm : max;
        }, 0);
        if (maxE1rm > 0) {
          exerciseData[ex.exerciseId].push({ date: new Date(log.date).getTime(), e1rm: maxE1rm });
        }
      });
    });
    const trends: number[] = [];
    Object.values(exerciseData).forEach(data => {
      if (data.length >= 2) {
        const sorted = [...data].sort((a, b) => a.date - b.date);
        const first = sorted[0].e1rm;
        const last = sorted[sorted.length - 1].e1rm;
        if (first > 0) trends.push(((last - first) / first) * 100);
      }
    });
    if (trends.length > 0) {
      const avgTrend = trends.reduce((s, t) => s + t, 0) / trends.length;
      strengthScore = Math.min(100, Math.max(0, 50 + avgTrend * 5)); // +5% e1rm = +25 pts
    }

    // Volume progression (20%): is total volume trending up?
    let volumeScore = 50;
    if (recentLogs.length >= 4) {
      const half = Math.floor(recentLogs.length / 2);
      const sorted = [...recentLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const firstHalf = sorted.slice(0, half).reduce((s, l) => s + l.totalVolume, 0) / half;
      const secondHalf = sorted.slice(half).reduce((s, l) => s + l.totalVolume, 0) / (sorted.length - half);
      if (firstHalf > 0) {
        const pct = ((secondHalf - firstHalf) / firstHalf) * 100;
        volumeScore = Math.min(100, Math.max(0, 50 + pct * 3));
      }
    }

    // Recovery / RPE (15%): avg RPE between 7-8.5 is ideal
    let recoveryScore = 50;
    const rpeLogs = recentLogs.filter(l => l.overallRPE > 0);
    if (rpeLogs.length > 0) {
      const avgRPE = rpeLogs.reduce((s, l) => s + l.overallRPE, 0) / rpeLogs.length;
      // RPE 7.5 = 100, drops off sharply outside 6.5-9
      recoveryScore = Math.max(0, Math.min(100, 100 - Math.abs(avgRPE - 7.5) * 30));
    }

    // Engagement (10%): streak, badges, challenges
    const engagementScore = Math.min(100,
      (computed.currentStreak >= 7 ? 40 : computed.currentStreak * 5) +
      Math.min(30, gamificationStats.badges.length * 3) +
      (gamificationStats.challengesCompleted * 10)
    );

    const total = Math.round(
      consistencyScore * 0.30 +
      strengthScore * 0.25 +
      volumeScore * 0.20 +
      recoveryScore * 0.15 +
      engagementScore * 0.10
    );

    return { total, consistency: Math.round(consistencyScore), strength: Math.round(strengthScore), volume: Math.round(volumeScore), recovery: Math.round(recoveryScore), engagement: Math.round(engagementScore) };
  }, [workoutLogs, gamificationStats, computed]);

  // Animated ring fill on mount
  const [animatedValue, setAnimatedValue] = useState(0);
  useEffect(() => {
    if (!score) return;
    const timer = setTimeout(() => setAnimatedValue(score.total), 100);
    return () => clearTimeout(timer);
  }, [score]);

  if (!score) return null;

  const getGrade = (s: number) => s >= 90 ? 'A+' : s >= 80 ? 'A' : s >= 70 ? 'B+' : s >= 60 ? 'B' : s >= 50 ? 'C' : s >= 40 ? 'D' : 'F';
  const getColor = (s: number) => s >= 80 ? 'text-green-400' : s >= 60 ? 'text-primary-400' : s >= 40 ? 'text-yellow-400' : 'text-red-400';
  const getBarColor = (s: number) => s >= 80 ? 'bg-green-500' : s >= 60 ? 'bg-primary-500' : s >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  const getRingColor = (s: number) => s >= 80 ? '#22c55e' : s >= 60 ? '#0ea5e9' : s >= 40 ? '#eab308' : '#ef4444';

  const circumference = 2 * Math.PI * 42;
  const strokeDash = (animatedValue / 100) * circumference;

  const factors = [
    { label: 'Consistency', value: score.consistency, weight: '30%' },
    { label: 'Strength', value: score.strength, weight: '25%' },
    { label: 'Volume', value: score.volume, weight: '20%' },
    { label: 'Recovery', value: score.recovery, weight: '15%' },
    { label: 'Engagement', value: score.engagement, weight: '10%' },
  ];

  return (
    <div className="card overflow-hidden">
      {/* Header — tappable to toggle breakdown */}
      <button
        onClick={() => { setDetailsOpen(v => !v); if (detailsOpen) setExpandedFactor(null); }}
        className="w-full p-4 flex items-center gap-4 group"
      >
        {/* Score Ring */}
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" className="stroke-grappler-800" strokeWidth="8" />
            <circle cx="50" cy="50" r="42" fill="none" stroke={getRingColor(score.total)}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${strokeDash} ${circumference}`}
              style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className={cn('text-lg font-black', getColor(score.total))}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
            >
              {score.total}
            </motion.span>
            <span className="text-[9px] text-grappler-500 font-medium">{getGrade(score.total)}</span>
          </div>
        </div>

        {/* Title + summary */}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-grappler-100">Performance Score</span>
            <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded-full bg-grappler-700/60', getColor(score.total))}>
              {getGrade(score.total)}
            </span>
          </div>
          <p className="text-xs text-grappler-400 mt-0.5">
            {score.total >= 80 ? 'Crushing it — keep the momentum' :
             score.total >= 60 ? 'Solid progress — room to improve' :
             score.total >= 40 ? 'Getting there — stay consistent' :
             'Time to refocus — check the breakdown'}
          </p>
        </div>

        <span className="text-xs text-grappler-600 group-hover:text-grappler-400 transition-colors">
          {detailsOpen ? '▴' : '▾'}
        </span>
      </button>

      {/* Collapsible factor breakdown */}
      <AnimatePresence>
        {detailsOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-1 px-4 pb-3">
              {factors.map(item => {
                const explainer = PERF_FACTOR_EXPLAINERS[item.label];
                const isExpanded = expandedFactor === item.label;

                return (
                  <div key={item.label}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setExpandedFactor(isExpanded ? null : item.label); }}
                      className="w-full group/factor"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs w-[72px] text-left truncate text-grappler-400 group-hover/factor:text-grappler-200 transition-colors">
                          {item.label}
                        </span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-grappler-700/40">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(3, item.value)}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className={cn('h-full rounded-full', getBarColor(item.value))}
                          />
                        </div>
                        <span className={cn('text-xs font-mono w-6 text-right', getColor(item.value))}>
                          {item.value}
                        </span>
                      </div>
                    </button>

                    {/* Per-factor explainer */}
                    <AnimatePresence>
                      {isExpanded && explainer && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <div className="ml-[72px] pl-2.5 mt-1 mb-1.5 border-l border-grappler-700/60 space-y-0.5">
                            <p className="text-xs text-grappler-400">{explainer.what}</p>
                            <p className="text-xs text-primary-400">{explainer.action}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Hard Metrics Card (3 numbers: Strength Trend, Volume Capacity, Fight Readiness) ───

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

function PRTimelineCard({ workoutLogs }: { workoutLogs: WorkoutLog[] }) {
  const weightUnit = useAppStore(s => s.user?.weightUnit || 'lbs');
  const [showAll, setShowAll] = useState(false);
  const events = useMemo(() => extractPRTimeline(workoutLogs), [workoutLogs]);

  if (events.length === 0) return null;

  const visible = showAll ? events : events.slice(0, 5);

  const getTypeIcon = (type: PREvent['type']) => {
    switch (type) {
      case 'weight': return '🏋️';
      case 'e1rm': return '📈';
      case 'reps': return '🔁';
    }
  };

  const getRecoveryBadge = (ctx: PREvent['recoveryContext']) => {
    if (ctx === 'fresh') return <span className="text-[8px] bg-green-500/20 text-green-400 px-1 rounded">Fresh</span>;
    if (ctx === 'fatigued') return <span className="text-[8px] bg-orange-500/20 text-orange-400 px-1 rounded">Fatigued</span>;
    return null;
  };

  const formatDate = (d: Date) => {
    const now = Date.now();
    const diff = now - d.getTime();
    const days = Math.floor(diff / (86400000));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="card p-4">
      <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wider flex items-center gap-2 mb-3">
        <Trophy className="w-3.5 h-3.5 text-yellow-400" />
        PR Timeline
        <span className="ml-auto text-yellow-400 font-bold">{events.length}</span>
      </h3>
      <div className="space-y-1.5">
        {visible.map((pr, i) => (
          <div key={`${pr.exerciseId}-${i}`} className="flex items-center gap-2 bg-grappler-800/40 rounded-lg px-3 py-2">
            <span className="text-sm flex-shrink-0">{getTypeIcon(pr.type)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-grappler-200 truncate">{pr.exerciseName}</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-grappler-100 font-bold">
                  {pr.value} {weightUnit}
                </span>
                {pr.previousBest > 0 && (
                  <span className="text-xs text-green-400 font-medium">
                    +{pr.delta} ({pr.deltaPct > 0 ? `+${pr.deltaPct}%` : '—'})
                  </span>
                )}
                {getRecoveryBadge(pr.recoveryContext)}
              </div>
            </div>
            <span className="text-xs text-grappler-600 flex-shrink-0">{formatDate(pr.date)}</span>
          </div>
        ))}
      </div>
      {events.length > 5 && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="mt-2 text-xs text-primary-400 hover:text-primary-300 w-full text-center py-1"
        >
          {showAll ? 'Show less' : `Show all ${events.length} PRs`}
        </button>
      )}
    </div>
  );
}

// ─── Volume Dashboard (MEV/MAV/MRV gauges) ───

function VolumeDashboard({ workoutLogs }: { workoutLogs: WorkoutLog[] }) {
  const gauges = useMemo(() => calculateMuscleVolumeGauges(workoutLogs), [workoutLogs]);

  if (gauges.length === 0) return null;

  const getZoneColor = (zone: MuscleVolumeGauge['zone']) => {
    switch (zone) {
      case 'below_mev': return { bar: 'bg-yellow-500', text: 'text-yellow-400', bg: 'bg-yellow-500/10' };
      case 'productive': return { bar: 'bg-green-500', text: 'text-green-400', bg: 'bg-green-500/10' };
      case 'near_mrv': return { bar: 'bg-orange-500', text: 'text-orange-400', bg: 'bg-orange-500/10' };
      case 'over_mrv': return { bar: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-500/10' };
    }
  };

  return (
    <div className="card p-4">
      <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wider flex items-center gap-2 mb-3">
        <Gauge className="w-3.5 h-3.5 text-primary-400" />
        Volume Dashboard
        <span className="ml-auto text-[9px] text-grappler-600 font-normal normal-case">weekly sets</span>
      </h3>
      <div className="space-y-2">
        {gauges.map(g => {
          const colors = getZoneColor(g.zone);
          // Position markers as percentages
          const range = g.mrv; // use MRV as 100% of the bar width
          const mevPct = (g.mev / range) * 100;
          const mavPct = (g.mav / range) * 100;
          const currentPct = Math.min(100, (g.currentSets / range) * 100);

          return (
            <div key={g.muscle} className="group">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs text-grappler-300 font-medium">{g.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className={cn('text-xs font-bold', colors.text)}>{g.currentSets}</span>
                  <span className="text-[9px] text-grappler-600">/ {g.mav} MAV</span>
                </div>
              </div>
              {/* Gauge bar */}
              <div className="relative h-2 bg-grappler-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(2, currentPct)}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={cn('h-full rounded-full', colors.bar)}
                />
                {/* MEV marker */}
                <div
                  className="absolute top-0 h-full w-px bg-grappler-500"
                  style={{ left: `${mevPct}%` }}
                  title={`MEV: ${g.mev}`}
                />
                {/* MAV marker */}
                <div
                  className="absolute top-0 h-full w-px bg-grappler-400"
                  style={{ left: `${mavPct}%` }}
                  title={`MAV: ${g.mav}`}
                />
              </div>
              {/* Zone labels on hover/focus */}
              <div className="flex justify-between mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[8px] text-grappler-600">{g.mev} MEV</span>
                <span className="text-[8px] text-grappler-600">{g.mav} MAV</span>
                <span className="text-[8px] text-grappler-600">{g.mrv} MRV</span>
              </div>
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex gap-3 mt-3 pt-2 border-t border-grappler-800">
        <div className="flex items-center gap-1 text-[9px] text-yellow-400"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />Below MEV</div>
        <div className="flex items-center gap-1 text-[9px] text-green-400"><div className="w-1.5 h-1.5 rounded-full bg-green-500" />Productive</div>
        <div className="flex items-center gap-1 text-[9px] text-orange-400"><div className="w-1.5 h-1.5 rounded-full bg-orange-500" />Near MRV</div>
        <div className="flex items-center gap-1 text-[9px] text-red-400"><div className="w-1.5 h-1.5 rounded-full bg-red-500" />Over MRV</div>
      </div>
    </div>
  );
}

// ─── Synthetic Recovery ───

function SyntheticRecoveryCard({ workoutLogs }: { workoutLogs: WorkoutLog[] }) {
  const recovery = useMemo(() => calculateSyntheticRecovery(workoutLogs), [workoutLogs]);

  if (!recovery) return null;

  const getTrendIcon = () => {
    switch (recovery.trend) {
      case 'improving': return <ArrowUpRight className="w-3 h-3 text-green-400" />;
      case 'declining': return <ArrowDownRight className="w-3 h-3 text-red-400" />;
      default: return <Minus className="w-3 h-3 text-grappler-500" />;
    }
  };

  const getScoreColor = (s: number) =>
    s >= 75 ? 'text-green-400' : s >= 50 ? 'text-primary-400' : s >= 30 ? 'text-yellow-400' : 'text-red-400';

  const components = [
    { label: 'RPE Load', value: recovery.components.rpeLoad, icon: '⚡' },
    { label: 'Soreness', value: recovery.components.soreness, icon: '💪' },
    { label: 'Sleep', value: recovery.components.sleepQuality, icon: '😴' },
    { label: 'Energy', value: recovery.components.energy, icon: '🔋' },
  ];

  // Mini sparkline for weekly recovery trend
  const SparkLine = () => {
    if (recovery.weeklyScores.length < 2) return null;
    const pts = recovery.weeklyScores.map(w => w.score);
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const range = max - min || 1;
    const w = 80;
    const h = 20;
    const points = pts.map((v, i) =>
      `${(i / (pts.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`
    ).join(' ');
    const color = recovery.trend === 'improving' ? 'stroke-green-400' : recovery.trend === 'declining' ? 'stroke-red-400' : 'stroke-primary-400';
    return (
      <svg width={w} height={h}>
        <polyline fill="none" className={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
      </svg>
    );
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wider flex items-center gap-2">
          <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
          Recovery Score
        </h3>
        <div className="flex items-center gap-1.5">
          {getTrendIcon()}
          <span className={cn('text-lg font-black', getScoreColor(recovery.score))}>
            {recovery.score}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3">
        {components.map(c => (
          <div key={c.label} className="text-center bg-grappler-800/40 rounded-lg py-2">
            <span className="text-xs">{c.icon}</span>
            <p className={cn('text-sm font-bold', getScoreColor(c.value))}>{c.value}</p>
            <p className="text-[9px] text-grappler-600">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-grappler-500">
          {recovery.score >= 75 ? 'Well recovered — push hard today' :
           recovery.score >= 50 ? 'Moderate recovery — train smart' :
           recovery.score >= 30 ? 'Fatigued — consider lighter session' :
           'Run down — prioritize rest'}
        </p>
        <SparkLine />
      </div>
    </div>
  );
}

// ─── Plateau Analysis ───

function PlateauAnalysisCard({ workoutLogs }: { workoutLogs: WorkoutLog[] }) {
  const weightUnit = useAppStore(s => s.user?.weightUnit || 'lbs');
  const plateaus = useMemo(() => detectPlateaus(workoutLogs), [workoutLogs]);

  if (plateaus.length === 0) return null;

  const getCauseIcon = (cause: string) => {
    switch (cause) {
      case 'volume_low': return '📉';
      case 'volume_high': return '📊';
      case 'poor_recovery': return '😫';
      case 'low_frequency': return '📅';
      case 'stale_stimulus': return '🔄';
      default: return '⚠️';
    }
  };

  const getCauseLabel = (cause: string) => {
    switch (cause) {
      case 'volume_low': return 'Low Volume';
      case 'volume_high': return 'Excess Volume';
      case 'poor_recovery': return 'Poor Recovery';
      case 'low_frequency': return 'Low Frequency';
      case 'stale_stimulus': return 'Stale Stimulus';
      default: return 'Unknown';
    }
  };

  return (
    <div className="card p-4">
      <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wider flex items-center gap-2 mb-3">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
        Plateau Alert
        <span className="ml-auto text-amber-400 text-xs font-bold">{plateaus.length} stalled</span>
      </h3>
      <div className="space-y-2">
        {plateaus.map(p => (
          <div key={p.exerciseId} className="bg-grappler-800/40 rounded-lg px-3 py-2.5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm">{getCauseIcon(p.rootCause)}</span>
                <span className="text-xs font-semibold text-grappler-200">{p.exerciseName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-grappler-500">{p.currentE1RM} {weightUnit} e1RM</span>
                <span className="text-[9px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded font-medium">
                  {p.weeksStalled}w stalled
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2 mt-1.5">
              <span className={cn(
                'text-[9px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0',
                p.rootCause === 'poor_recovery' ? 'bg-red-500/15 text-red-400' :
                p.rootCause === 'volume_high' ? 'bg-orange-500/15 text-orange-400' :
                'bg-primary-500/15 text-primary-400'
              )}>
                {getCauseLabel(p.rootCause)}
              </span>
              <p className="text-xs text-grappler-400 leading-relaxed">{p.prescription}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Combat Benchmarks ───

function CombatBenchmarksCard({ workoutLogs }: { workoutLogs: WorkoutLog[] }) {
  const user = useAppStore(s => s.user);
  const bodyWeightLog = useAppStore(s => s.bodyWeightLog.filter(e => !e._deleted));
  const weightUnit = user?.weightUnit || 'lbs';

  const benchmarks = useMemo(() => {
    // Get bodyweight in kg
    let bwKg = 0;
    if (bodyWeightLog.length > 0) {
      const latest = bodyWeightLog[bodyWeightLog.length - 1].weight;
      bwKg = weightUnit === 'lbs' ? latest / 2.20462 : latest;
    } else if (user?.bodyWeightKg) {
      bwKg = user.bodyWeightKg;
    }
    if (bwKg <= 0) return [];
    return calculateCombatBenchmarks(workoutLogs, bwKg, weightUnit);
  }, [workoutLogs, bodyWeightLog, user, weightUnit]);

  if (benchmarks.length === 0) return null;

  const getPercentileColor = (p: number) =>
    p >= 80 ? 'text-green-400' : p >= 60 ? 'text-primary-400' : p >= 40 ? 'text-yellow-400' : 'text-grappler-400';

  const getPercentileBarColor = (p: number) =>
    p >= 80 ? 'bg-green-500' : p >= 60 ? 'bg-primary-500' : p >= 40 ? 'bg-yellow-500' : 'bg-grappler-600';

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wider flex items-center gap-2">
          <Medal className="w-3.5 h-3.5 text-amber-400" />
          Combat Benchmarks
        </h3>
        {benchmarks[0] && (
          <span className="text-xs text-grappler-500">{benchmarks[0].weightClass} class</span>
        )}
      </div>
      <div className="space-y-2.5">
        {benchmarks.map(b => (
          <div key={b.exerciseId}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs text-grappler-300 font-medium">{b.exerciseName}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-grappler-100 font-bold">{b.current1RM} {weightUnit}</span>
                <span className={cn('text-xs font-bold', getPercentileColor(b.percentile))}>
                  P{b.percentile}
                </span>
              </div>
            </div>
            {/* Percentile bar */}
            <div className="h-1.5 bg-grappler-800 rounded-full overflow-hidden mb-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(3, b.percentile)}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className={cn('h-full rounded-full', getPercentileBarColor(b.percentile))}
              />
            </div>
            {b.gap > 0 && (
              <p className="text-[9px] text-grappler-600">
                {b.gap} {weightUnit} to {b.nextTier}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Training Timeline ───

function TrainingTimeline({ workoutLogs, weightUnit }: { workoutLogs: WorkoutLog[]; weightUnit: string }) {
  const { mesocycleHistory, currentMesocycle } = useAppStore(
    useShallow(s => ({ mesocycleHistory: s.mesocycleHistory.filter(m => !m._deleted), currentMesocycle: s.currentMesocycle }))
  );

  const blocks = useMemo(() => {
    const allBlocks = [
      ...mesocycleHistory.map(m => ({ ...m, isCurrent: false })),
      ...(currentMesocycle ? [{ ...currentMesocycle, isCurrent: true }] : []),
    ];

    return allBlocks.map(meso => {
      const logs = workoutLogs.filter(l => l.mesocycleId === meso.id);
      const totalVol = logs.reduce((s, l) => s + (l.totalVolume || 0), 0);
      const totalSessions = meso.weeks.reduce((s, w) => s + w.sessions.length, 0);
      const completed = logs.length;
      const prs = logs.reduce((s, l) => s + l.exercises.filter(e => e.personalRecord).length, 0);
      const avgRPE = logs.length > 0
        ? Math.round((logs.reduce((s, l) => s + (l.overallRPE || 0), 0) / logs.length) * 10) / 10
        : 0;

      return {
        id: meso.id,
        name: meso.name,
        goal: meso.goalFocus,
        weeks: meso.weeks.length,
        totalSessions,
        completed,
        volume: totalVol,
        prs,
        avgRPE,
        isCurrent: meso.isCurrent,
        isDeload: meso.weeks.some(w => w.isDeload),
      };
    });
  }, [mesocycleHistory, currentMesocycle, workoutLogs]);

  if (blocks.length < 1) return null;

  // Calculate block-over-block comparison for latest vs previous
  const comparison = blocks.length >= 2 ? (() => {
    const current = blocks[blocks.length - 1];
    const prev = blocks[blocks.length - 2];
    const volumeDelta = prev.volume > 0 ? Math.round(((current.volume - prev.volume) / prev.volume) * 100) : null;
    const prDelta = current.prs - prev.prs;
    const rpeDelta = prev.avgRPE > 0 ? Math.round((current.avgRPE - prev.avgRPE) * 10) / 10 : null;
    return { volumeDelta, prDelta, rpeDelta };
  })() : null;

  const maxVol = Math.max(...blocks.map(b => b.volume), 1);

  return (
    <div className="card p-4">
      <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wider flex items-center gap-2 mb-3">
        <Clock className="w-3.5 h-3.5" />
        Training Journey
      </h3>

      {/* Timeline visualization */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {blocks.map((block, i) => (
          <div key={block.id} className="flex flex-col items-center flex-shrink-0" style={{ minWidth: '72px' }}>
            {/* Volume bar */}
            <div className="w-full h-20 flex items-end justify-center mb-1">
              <div
                className={cn(
                  'w-10 rounded-t-md transition-all',
                  block.isCurrent ? 'bg-gradient-to-t from-primary-600 to-primary-400' : 'bg-grappler-600'
                )}
                style={{ height: `${Math.max(8, (block.volume / maxVol) * 100)}%` }}
                title={`${formatNumber(block.volume)} ${weightUnit}`}
              />
            </div>
            {/* Label */}
            <p className={cn('text-xs font-medium text-center truncate w-full', block.isCurrent ? 'text-primary-400' : 'text-grappler-400')}>
              {block.isCurrent ? 'Current' : `Block ${i + 1}`}
            </p>
            <p className="text-[9px] text-grappler-600 text-center">{block.weeks}wk · {block.completed}s</p>
            {block.prs > 0 && (
              <span className="text-[9px] text-yellow-400 font-medium">{block.prs} PR{block.prs > 1 ? 's' : ''}</span>
            )}
          </div>
        ))}
      </div>

      {/* Block comparison */}
      {comparison && (
        <div className="mt-3 pt-3 border-t border-grappler-800 grid grid-cols-3 gap-2">
          {comparison.volumeDelta !== null && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                {comparison.volumeDelta >= 0
                  ? <ArrowUpRight className="w-3 h-3 text-green-400" />
                  : <ArrowDownRight className="w-3 h-3 text-red-400" />}
                <span className={cn('text-xs font-bold', comparison.volumeDelta >= 0 ? 'text-green-400' : 'text-red-400')}>
                  {comparison.volumeDelta >= 0 ? '+' : ''}{comparison.volumeDelta}%
                </span>
              </div>
              <p className="text-[9px] text-grappler-500">Volume</p>
            </div>
          )}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              {comparison.prDelta > 0
                ? <ArrowUpRight className="w-3 h-3 text-yellow-400" />
                : comparison.prDelta < 0
                ? <ArrowDownRight className="w-3 h-3 text-red-400" />
                : <Minus className="w-3 h-3 text-grappler-500" />}
              <span className={cn('text-xs font-bold', comparison.prDelta > 0 ? 'text-yellow-400' : comparison.prDelta < 0 ? 'text-red-400' : 'text-grappler-400')}>
                {comparison.prDelta > 0 ? '+' : ''}{comparison.prDelta} PRs
              </span>
            </div>
            <p className="text-[9px] text-grappler-500">vs Last Block</p>
          </div>
          {comparison.rpeDelta !== null && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                {comparison.rpeDelta <= 0
                  ? <ArrowDownRight className="w-3 h-3 text-green-400" />
                  : <ArrowUpRight className="w-3 h-3 text-yellow-400" />}
                <span className={cn('text-xs font-bold', comparison.rpeDelta <= 0 ? 'text-green-400' : 'text-yellow-400')}>
                  {comparison.rpeDelta > 0 ? '+' : ''}{comparison.rpeDelta}
                </span>
              </div>
              <p className="text-[9px] text-grappler-500">Avg RPE</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Session Recap Card (Post-Workout) ───

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
        await navigator.share({ files: [file], title: 'Workout Complete — Roots Gains' });
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
  const { currentMesocycle, workoutLogs, mesocycleHistory } = useAppStore(
    useShallow(s => ({ currentMesocycle: s.currentMesocycle, workoutLogs: s.workoutLogs, mesocycleHistory: s.mesocycleHistory.filter(m => !m._deleted) }))
  );
  const weightUnit = useAppStore((s) => s.user?.weightUnit || 'lbs');

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

export default function ProgressAndHistoryTab({ onViewReport }: { onViewReport: (mesoId: string) => void }) {
  const [view, setView] = useState<'dashboard' | 'progress' | 'log' | 'weight'>('dashboard');
  const { workoutLogs, user, bodyWeightLog, gamificationStats } = useAppStore(
    useShallow(s => ({ workoutLogs: s.workoutLogs, user: s.user, bodyWeightLog: s.bodyWeightLog.filter(e => !e._deleted), gamificationStats: s.gamificationStats }))
  );
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  const [showExport, setShowExport] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmImport, setConfirmImport] = useState(false);
  const weightUnit = user?.weightUnit || 'lbs';

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
      {/* Sub-navigation */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {[
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'progress', label: 'Progress' },
          { id: 'log', label: 'History' },
          { id: 'weight', label: 'Body' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id as typeof view)}
            className={cn(
              'px-3.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0',
              view === tab.id
                ? 'bg-primary-500 text-white'
                : 'bg-grappler-800 text-grappler-400 hover:text-grappler-200'
            )}
          >
            {tab.label}
          </button>
        ))}
        {/* Export/Import overflow menu */}
        <button
          onClick={() => setShowExport(!showExport)}
          className="ml-auto p-2 rounded-lg bg-grappler-800 text-grappler-400 hover:text-grappler-200 flex-shrink-0"
          title="Export / Import Data"
          aria-label="Export or import data"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Import status toast */}
      <AnimatePresence>
        {importStatus && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              'rounded-xl px-4 py-3 text-sm font-medium',
              importStatus.type === 'success'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            )}
          >
            {importStatus.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export / Import panel */}
      <AnimatePresence>
        {showExport && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="card p-4 space-y-4">
              <div>
                <p className="text-sm text-grappler-300 mb-2 font-medium">Export workout logs</p>
                <div className="flex gap-3">
                  <button onClick={handleExportCSV} className="btn btn-secondary gap-2 text-xs py-2 px-3">
                    <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
                  </button>
                  <button onClick={handleExportJSON} className="btn btn-secondary gap-2 text-xs py-2 px-3">
                    <FileJson className="w-3.5 h-3.5" /> JSON
                  </button>
                </div>
              </div>
              <div className="border-t border-grappler-800 pt-3">
                <p className="text-sm text-grappler-300 mb-2 font-medium">Full backup</p>
                <div className="flex gap-3">
                  <button onClick={handleExportBackup} className="btn btn-secondary gap-2 text-xs py-2 px-3">
                    <Download className="w-3.5 h-3.5" /> Export Backup
                  </button>
                  {!confirmImport ? (
                    <button
                      onClick={() => setConfirmImport(true)}
                      className="btn btn-secondary gap-2 text-xs py-2 px-3"
                    >
                      <History className="w-3.5 h-3.5" /> Import Backup
                    </button>
                  ) : (
                    <label className="btn btn-primary gap-2 text-xs py-2 px-3 cursor-pointer">
                      <History className="w-3.5 h-3.5" /> Choose File
                      <input type="file" accept=".json" className="hidden" onChange={handleImportFile} />
                    </label>
                  )}
                </div>
                {confirmImport && (
                  <p className="text-xs text-sky-400 mt-2">
                    This will replace all current data. Make sure you have a backup first.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {view === 'dashboard' && !hydrated && <OverviewSkeleton />}
      {view === 'dashboard' && hydrated && (
        <div className="space-y-4">
          {workoutLogs.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No progress data yet"
              description="Complete your first workout to unlock trends, PRs, and performance insights."
            />
          ) : (
            <>
              {/* Post-workout session recap (visible for 2h after workout) */}
              <SessionRecapCard />

              {/* E1RM Trends with goals — your lifts at a glance */}
              <E1rmTrendsCard workoutLogs={workoutLogs} weightUnit={weightUnit} />

              {/* Hard Metrics — 3 numbers: Strength, Volume, Readiness */}
              <HardMetricsCard workoutLogs={workoutLogs} />

              {/* Current block performance — bridges program and progress */}
              <BlockPerformanceCard />

              {/* Engagement hooks — challenges, streak */}
              <WeeklyChallengeCard gamificationStats={gamificationStats} />
              <StreakHeatmap workoutLogs={workoutLogs} />
            </>
          )}
        </div>
      )}
      {view === 'progress' && hydrated && (
        <ProgressCharts onViewReport={onViewReport}>
          {/* Context-paired analytics passed as children per sub-tab */}
          <SyntheticRecoveryCard workoutLogs={workoutLogs} />
          <VolumeDashboard workoutLogs={workoutLogs} />
          <PRTimelineCard workoutLogs={workoutLogs} />
          <PlateauAnalysisCard workoutLogs={workoutLogs} />
          <CombatBenchmarksCard workoutLogs={workoutLogs} />
          <TrainingTimeline workoutLogs={workoutLogs} weightUnit={weightUnit} />
          <BodyRecompCard workoutLogs={workoutLogs} bodyWeightLog={bodyWeightLog} weightUnit={weightUnit} />
        </ProgressCharts>
      )}
      {view === 'log' && <WorkoutHistory />}
      {view === 'weight' && <BodyWeightTracker />}
    </div>
  );
}
