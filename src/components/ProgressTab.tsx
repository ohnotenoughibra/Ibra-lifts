'use client';

import { useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import {
  Flame,
  Target,
  TrendingUp,
  Download,
  FileSpreadsheet,
  FileJson,
  History,
  Scaling,
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import type { WorkoutLog, GamificationStats } from '@/lib/types';
import { getExerciseById } from '@/lib/exercises';
import { isCurrentWeek } from '@/lib/gamification';
import { exportToCSV, exportToJSON, downloadFile, exportFullBackup, importFullBackup, readFileAsText } from '@/lib/data-export';
import ProgressCharts from './ProgressCharts';
import WorkoutHistory from './WorkoutHistory';
import TrainingCalendar from './TrainingCalendar';

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
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {trends.map((lift) => {
          const diff = lift.current - lift.previous;
          const isUp = diff > 0;
          return (
            <div key={lift.exerciseId} className="flex items-center justify-between bg-grappler-800/50 rounded-lg px-3 py-2">
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
          );
        })}
      </div>
    </div>
  );
}

function BodyRecompCard({ workoutLogs, bodyWeightLog, weightUnit }: { workoutLogs: WorkoutLog[]; bodyWeightLog: { date: Date | string; weight: number }[]; weightUnit: string }) {
  const data = useMemo(() => {
    if (bodyWeightLog.length < 2 && workoutLogs.length < 2) return null;
    const fourWeeksAgo = Date.now() - 28 * 24 * 60 * 60 * 1000;
    const recentWeights = bodyWeightLog
      .filter(e => new Date(e.date).getTime() > fourWeeksAgo)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let weightDelta: number | null = null;
    if (recentWeights.length >= 2) {
      weightDelta = +(recentWeights[recentWeights.length - 1].weight - recentWeights[0].weight).toFixed(1);
    }
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
    return { weightDelta, volumeDelta, latestWeight: recentWeights.length > 0 ? recentWeights[recentWeights.length - 1].weight : null };
  }, [workoutLogs, bodyWeightLog]);

  if (!data) return null;

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-grappler-200 mb-3 flex items-center gap-2">
        <Scaling className="w-4 h-4 text-purple-400" />
        Body Recomp (4 weeks)
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {data.latestWeight !== null && (
          <div className="bg-grappler-800/50 rounded-lg px-3 py-2">
            <p className="text-xs text-grappler-400">Weight</p>
            <p className="text-sm font-bold text-grappler-100">{data.latestWeight} {weightUnit}</p>
            {data.weightDelta !== null && (
              <p className={cn('text-xs font-medium', data.weightDelta > 0 ? 'text-amber-400' : data.weightDelta < 0 ? 'text-blue-400' : 'text-grappler-500')}>
                {data.weightDelta > 0 ? '+' : ''}{data.weightDelta} {weightUnit}
              </p>
            )}
          </div>
        )}
        {data.volumeDelta !== null && (
          <div className="bg-grappler-800/50 rounded-lg px-3 py-2">
            <p className="text-xs text-grappler-400">Avg Volume</p>
            <p className={cn('text-sm font-bold', data.volumeDelta > 0 ? 'text-green-400' : data.volumeDelta < 0 ? 'text-red-400' : 'text-grappler-100')}>
              {data.volumeDelta > 0 ? '+' : ''}{formatNumber(data.volumeDelta)}
            </p>
            <p className="text-xs text-grappler-500">vs first 2 weeks</p>
          </div>
        )}
      </div>
      {data.weightDelta !== null && data.volumeDelta !== null && (
        <p className="text-xs text-grappler-500 mt-2">
          {data.weightDelta <= 0 && data.volumeDelta > 0
            ? 'Losing weight while lifting more — solid recomp!'
            : data.weightDelta > 0 && data.volumeDelta > 0
            ? 'Weight and volume both up — lean bulk territory.'
            : data.weightDelta < 0 && data.volumeDelta < 0
            ? 'Both trending down — make sure you\'re fueling enough.'
            : 'Tracking trends — keep logging to see patterns.'}
        </p>
      )}
    </div>
  );
}

function WeeklyChallengeCard({ gamificationStats }: { gamificationStats: GamificationStats }) {
  const challenge = gamificationStats.weeklyChallenge;
  if (!challenge || !isCurrentWeek(challenge)) return null;

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
    return 'bg-grappler-700/40';
  };

  const getDayTitle = (day: DayData) => {
    const dateStr = day.date.toLocaleDateString();
    if (day.hasLifting && day.hasSession) return `${dateStr} — lifting + training`;
    if (day.hasLifting) return `${dateStr} — lifting`;
    if (day.hasSession) return `${dateStr} — training`;
    return dateStr;
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-grappler-200 uppercase tracking-wide flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" />
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
                  className={cn(
                    'w-3 h-3 rounded-sm transition-colors',
                    getDayColor(day),
                    day.isToday && 'ring-1 ring-primary-400',
                    canClick && 'cursor-pointer hover:ring-1 hover:ring-white/40'
                  )}
                  title={getDayTitle(day)}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-grappler-500">{weeks * 7} days</span>
        {includeOtherSessions ? (
          <div className="flex items-center gap-2 text-xs text-grappler-500">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-green-500" />
              <span>Lifting</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
              <span>Training</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-grappler-500">
            <span>Less</span>
            <div className="w-2.5 h-2.5 rounded-sm bg-grappler-700/40" />
            <div className="w-2.5 h-2.5 rounded-sm bg-green-500/40" />
            <div className="w-2.5 h-2.5 rounded-sm bg-green-500/70" />
            <div className="w-2.5 h-2.5 rounded-sm bg-green-500" />
            <span>More</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Progress + History Tab ───

export default function ProgressAndHistoryTab({ onViewReport }: { onViewReport: (mesoId: string) => void }) {
  const [view, setView] = useState<'charts' | 'log' | 'calendar' | 'weight'>('charts');
  const { workoutLogs, user, bodyWeightLog, gamificationStats } = useAppStore();
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
          { id: 'charts', label: 'Progress' },
          { id: 'log', label: 'Workouts' },
          { id: 'calendar', label: 'Calendar' },
          { id: 'weight', label: 'Body Weight' },
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
        {/* Export/Import button */}
        <button
          onClick={() => setShowExport(!showExport)}
          className="ml-auto p-2 rounded-lg bg-grappler-800 text-grappler-400 hover:text-grappler-200 flex-shrink-0"
          title="Export / Import Data"
          aria-label="Export or import data"
        >
          <Download className="w-4 h-4" />
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
                  <p className="text-xs text-amber-400 mt-2">
                    This will replace all current data. Make sure you have a backup first.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {view === 'charts' && (
        <div className="space-y-4">
          <ProgressCharts onViewReport={onViewReport} />

          {/* Insights & Trends */}
          <div className="pt-2">
            <h3 className="text-xs font-semibold text-grappler-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" />
              Insights & Trends
            </h3>
            <div className="space-y-4">
              <WeeklyChallengeCard gamificationStats={gamificationStats} />
              <E1rmTrendsCard workoutLogs={workoutLogs} weightUnit={weightUnit} />
              <BodyRecompCard workoutLogs={workoutLogs} bodyWeightLog={bodyWeightLog} weightUnit={weightUnit} />
              <StreakHeatmap workoutLogs={workoutLogs} />
            </div>
          </div>
        </div>
      )}
      {view === 'log' && <WorkoutHistory />}
      {view === 'calendar' && <TrainingCalendar />}
      {view === 'weight' && <BodyWeightTracker />}
    </div>
  );
}
