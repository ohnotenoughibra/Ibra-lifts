/**
 * Computed Gamification Stats
 *
 * Derives streak, XP, level, totalWorkouts, totalVolume, personalRecords
 * from raw workoutLogs/trainingSessions/quickLogs — never from stored values.
 *
 * This eliminates the entire class of "streak broken on other device" bugs
 * because there's nothing to sync — stats are always computed from ground truth.
 */

import { useMemo } from 'react';
import { useAppStore } from './store';
import { useShallow } from 'zustand/react/shallow';
import { calculateWorkoutPoints, calculateLevel, pointRewards } from './gamification';
import type { WorkoutLog, TrainingSession, QuickLog, GamificationStats } from './types';

const DAY_MS = 86400000;

function fmtDateKey(d: Date): number {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt.getTime();
}

/** Compute current streak from all activity dates (2-day gap tolerance) */
function computeStreak(activeDates: Set<number>): { current: number; longest: number } {
  if (activeDates.size === 0) return { current: 0, longest: 0 };

  const sorted = Array.from(activeDates).sort((a, b) => b - a); // newest first
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  // Current streak: must have activity within last 2 days
  let current = 0;
  if ((todayMs - sorted[0]) <= 2 * DAY_MS) {
    current = 1;
    let cursor = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      const gap = (cursor - sorted[i]) / DAY_MS;
      if (gap <= 2) {
        current++;
        cursor = sorted[i];
      } else {
        break;
      }
    }
  }

  // Longest streak: scan oldest-first
  const chronological = [...sorted].reverse();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < chronological.length; i++) {
    const gap = (chronological[i] - chronological[i - 1]) / DAY_MS;
    if (gap <= 2) {
      run++;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
  }

  return { current, longest };
}

/** Replay all workout logs to compute total XP */
function computeTotalPoints(
  workoutLogs: WorkoutLog[],
  trainingSessions: TrainingSession[],
  badges: GamificationStats['badges'],
  dailyLoginTotal: number,
  wellnessXP: number,
): number {
  const chronoLogs = [...workoutLogs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let points = 0;

  for (let i = 0; i < chronoLogs.length; i++) {
    const log = chronoLogs[i];
    const hadPR = log.exercises.some(ex => ex.personalRecord);

    // Replay streak at time of this workout for streak bonus
    let streakAtTime = 1;
    if (i > 0) {
      const prevDate = new Date(chronoLogs[i - 1].date);
      const curDate = new Date(log.date);
      const diffDays = Math.floor((curDate.getTime() - prevDate.getTime()) / DAY_MS);
      if (diffDays <= 1) {
        streakAtTime = 1;
        for (let j = i - 1; j >= 0; j--) {
          const d1 = new Date(chronoLogs[j + 1].date);
          const d2 = new Date(chronoLogs[j].date);
          const gap = Math.floor((d1.getTime() - d2.getTime()) / DAY_MS);
          if (gap <= 1) streakAtTime++;
          else break;
        }
      }
    }

    const result = calculateWorkoutPoints(log, hadPR, streakAtTime, false);
    points += result.points;
  }

  // Badge points
  if (Array.isArray(badges)) {
    for (const ub of badges) {
      const badge = (ub as { badge?: { points?: number } }).badge;
      if (badge?.points) points += badge.points;
    }
  }

  // Training session points
  points += trainingSessions.length * pointRewards.trainingSession;

  // Daily login bonus
  points += dailyLoginTotal;

  // Wellness XP
  points += wellnessXP;

  return points;
}

export interface ComputedGamification {
  currentStreak: number;
  longestStreak: number;
  totalWorkouts: number;
  totalVolume: number;
  personalRecords: number;
  totalPoints: number;
  level: number;
  totalTrainingSessions: number;
  dualTrainingDays: number;
}

/**
 * Zustand selector hook: derives gamification stats from raw data.
 * Use this instead of reading gamificationStats.currentStreak, .totalPoints, etc.
 *
 * The stored gamificationStats still holds badges, streakShield, weeklyChallenge, etc.
 * but streak/XP/level are always computed fresh.
 */
export function useComputedGamification(): ComputedGamification {
  const { workoutLogs, trainingSessions, quickLogs, gamificationStats, dailyLoginBonus } = useAppStore(
    useShallow(s => ({
      workoutLogs: s.workoutLogs,
      trainingSessions: s.trainingSessions,
      quickLogs: s.quickLogs,
      gamificationStats: s.gamificationStats,
      dailyLoginBonus: s.dailyLoginBonus,
    }))
  );

  return useMemo(() => {
    // Build activity dates from all sources
    const activeDates = new Set<number>();
    for (const log of workoutLogs) {
      activeDates.add(fmtDateKey(new Date(log.date)));
    }
    for (const s of trainingSessions) {
      activeDates.add(fmtDateKey(new Date(s.date)));
    }
    if (quickLogs) {
      for (const q of quickLogs) {
        if (q.type === 'mobility') {
          activeDates.add(fmtDateKey(new Date(q.timestamp)));
        }
      }
    }

    const { current: currentStreak, longest: longestStreak } = computeStreak(activeDates);

    const totalWorkouts = workoutLogs.length;

    const totalVolume = workoutLogs.reduce((sum, log) => {
      if (log.totalVolume > 0) return sum + log.totalVolume;
      return sum + log.exercises.reduce((exSum, ex) =>
        exSum + ex.sets.reduce((setSum, set) =>
          setSum + ((set.completed !== false && set.weight > 0 && set.reps > 0) ? set.weight * set.reps : 0), 0), 0);
    }, 0);

    const personalRecords = workoutLogs.reduce((sum, log) =>
      sum + log.exercises.filter(ex => ex.personalRecord).length, 0
    );

    const totalTrainingSessions = trainingSessions.length;

    const workoutDateSet = new Set(workoutLogs.map(log => fmtDateKey(new Date(log.date))));
    const dualTrainingDays = trainingSessions.filter(s =>
      workoutDateSet.has(fmtDateKey(new Date(s.date)))
    ).length;

    const wellnessXP = (gamificationStats.wellnessStats as { totalWellnessXP?: number } | undefined)?.totalWellnessXP || 0;
    const dailyLoginTotal = (dailyLoginBonus as { totalClaimed?: number } | undefined)?.totalClaimed || 0;

    const computedPoints = computeTotalPoints(
      workoutLogs, trainingSessions, gamificationStats.badges,
      dailyLoginTotal, wellnessXP,
    );

    // Never go backwards vs stored value (badges/events may have been awarded before this logic existed)
    const totalPoints = Math.max(gamificationStats.totalPoints, computedPoints);
    const level = calculateLevel(totalPoints);

    return {
      currentStreak,
      longestStreak,
      totalWorkouts,
      totalVolume,
      personalRecords,
      totalPoints,
      level,
      totalTrainingSessions,
      dualTrainingDays,
    };
  }, [workoutLogs, trainingSessions, quickLogs, gamificationStats, dailyLoginBonus]);
}
