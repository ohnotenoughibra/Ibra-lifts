/**
 * Performance Narratives — "Tell me the story of my training"
 *
 * Generates coaching-style text summaries from raw training data.
 * Replaces stat dumps with human-readable progress stories.
 */

import type { WorkoutLog, UserProfile, TrainingSession, WeightUnit } from './types';
import { calculate1RM } from './workout-generator';

export interface PerformanceNarrative {
  /** Main narrative paragraph (2-3 sentences) */
  summary: string;
  /** Key stat highlights with "why it matters" labels */
  highlights: NarrativeHighlight[];
  /** Timeframe in days this narrative covers */
  timeframeDays: number;
  /** Whether there's enough data for a meaningful narrative */
  hasData: boolean;
}

export interface NarrativeHighlight {
  label: string;     // e.g. "Deadlift"
  stat: string;      // e.g. "+15kg"
  detail: string;    // e.g. "e1RM 120→135kg in 12 weeks"
  sentiment: 'positive' | 'neutral' | 'negative';
}

/**
 * Generate a performance narrative covering the user's training history.
 * Looks back up to 90 days for trends.
 */
export function generatePerformanceNarrative(opts: {
  workoutLogs: WorkoutLog[];
  trainingSessions: TrainingSession[];
  user: UserProfile | null;
}): PerformanceNarrative {
  const { workoutLogs, trainingSessions, user } = opts;
  const weightUnit = user?.weightUnit || 'lbs';
  const now = Date.now();
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const recentLogs = workoutLogs.filter(l => new Date(l.date).getTime() >= ninetyDaysAgo);
  const last30Logs = workoutLogs.filter(l => new Date(l.date).getTime() >= thirtyDaysAgo);
  const recentSessions = trainingSessions.filter(s => new Date(s.date).getTime() >= ninetyDaysAgo);

  if (recentLogs.length < 3) {
    return {
      summary: workoutLogs.length === 0
        ? 'Start logging workouts to build your training story. Every session adds to your narrative.'
        : `You've logged ${workoutLogs.length} session${workoutLogs.length === 1 ? '' : 's'} so far. Keep going — meaningful insights unlock after a few more weeks of consistent training.`,
      highlights: [],
      timeframeDays: 90,
      hasData: false,
    };
  }

  const highlights: NarrativeHighlight[] = [];
  const storyParts: string[] = [];

  // ── Consistency ──
  const logTimes = recentLogs.map(l => new Date(l.date).getTime());
  if (logTimes.length === 0) {
    return { summary: 'Not enough data to build your training story yet.', highlights: [], timeframeDays: 90, hasData: false };
  }
  const oldestLogTime = Math.min(...logTimes);
  const totalDays = Math.ceil((now - oldestLogTime) / (1000 * 60 * 60 * 24)) || 1;
  const weeksTracked = Math.max(1, Math.round(totalDays / 7));
  const sessionsPerWeek = +(recentLogs.length / weeksTracked).toFixed(1);
  const combatPerWeek = recentSessions.length > 0 ? +(recentSessions.length / weeksTracked).toFixed(1) : 0;

  if (sessionsPerWeek >= 4) {
    storyParts.push(`Over the last ${weeksTracked} weeks, you've been incredibly consistent at ${sessionsPerWeek} lift sessions/week`);
  } else if (sessionsPerWeek >= 3) {
    storyParts.push(`Across ${weeksTracked} weeks, you've averaged ${sessionsPerWeek} sessions/week — solid consistency`);
  } else if (sessionsPerWeek >= 2) {
    storyParts.push(`You've trained ${sessionsPerWeek}x/week over the last ${weeksTracked} weeks`);
  } else {
    storyParts.push(`In the last ${weeksTracked} weeks, you've logged ${recentLogs.length} sessions`);
  }

  if (combatPerWeek > 0) {
    storyParts[0] += ` plus ${combatPerWeek} mat sessions/week`;
  }

  // ── Strength Progression (best lift) ──
  const exerciseMap = new Map<string, { name: string; firstRM: number; lastRM: number; prCount: number }>();

  for (const log of recentLogs) {
    for (const ex of log.exercises) {
      if (!ex.estimated1RM || ex.estimated1RM <= 0) continue;
      const entry = exerciseMap.get(ex.exerciseId) || {
        name: ex.exerciseName,
        firstRM: ex.estimated1RM,
        lastRM: ex.estimated1RM,
        prCount: 0,
      };
      // Keep earliest as firstRM, latest as lastRM
      const logTime = new Date(log.date).getTime();
      const existingFirst = exerciseMap.get(ex.exerciseId);
      if (!existingFirst) {
        entry.firstRM = ex.estimated1RM;
      }
      entry.lastRM = ex.estimated1RM;
      if (ex.personalRecord) entry.prCount++;
      exerciseMap.set(ex.exerciseId, entry);
    }
  }

  // For exercises with actual progression: recalculate firstRM from earliest log
  for (const log of recentLogs) {
    for (const ex of log.exercises) {
      if (!ex.estimated1RM || ex.estimated1RM <= 0) continue;
      const entry = exerciseMap.get(ex.exerciseId);
      if (entry) {
        // Only update firstRM if this is earlier than current
        entry.firstRM = Math.min(entry.firstRM, ex.estimated1RM);
        entry.lastRM = Math.max(entry.lastRM, ex.estimated1RM);
      }
    }
  }

  // Find best absolute gain and best percentage gain
  let bestGain = { name: '', delta: 0, from: 0, to: 0, pct: 0 };
  const entries = Array.from(exerciseMap.entries());
  for (let i = 0; i < entries.length; i++) {
    const [, data] = entries[i];
    const delta = data.lastRM - data.firstRM;
    if (delta > bestGain.delta) {
      bestGain = { name: data.name, delta, from: data.firstRM, to: data.lastRM, pct: data.firstRM > 0 ? Math.round((delta / data.firstRM) * 100) : 0 };
    }
  }

  if (bestGain.delta > 0) {
    const unitLabel = weightUnit === 'kg' ? 'kg' : 'lbs';
    storyParts.push(
      `Your biggest strength gain is ${bestGain.name} — up ${Math.round(bestGain.delta)}${unitLabel} (${bestGain.from}→${bestGain.to}${unitLabel}, +${bestGain.pct}%)`
    );
    highlights.push({
      label: bestGain.name,
      stat: `+${Math.round(bestGain.delta)}${unitLabel}`,
      detail: `e1RM ${bestGain.from}→${bestGain.to}${unitLabel} in ${weeksTracked}wk`,
      sentiment: 'positive',
    });
  }

  // ── Total PRs ──
  const totalPRs = recentLogs.reduce((sum, l) =>
    sum + l.exercises.filter(e => e.personalRecord).length, 0
  );
  if (totalPRs > 0) {
    highlights.push({
      label: 'Personal Records',
      stat: `${totalPRs}`,
      detail: `${totalPRs} new PR${totalPRs === 1 ? '' : 's'} in ${weeksTracked} weeks`,
      sentiment: 'positive',
    });
    storyParts.push(`You've hit ${totalPRs} personal record${totalPRs === 1 ? '' : 's'}`);
  }

  // ── Volume trend ──
  if (last30Logs.length >= 2 && recentLogs.length >= 4) {
    const olderLogs = recentLogs.filter(l => {
      const t = new Date(l.date).getTime();
      return t >= ninetyDaysAgo && t < thirtyDaysAgo;
    });
    if (olderLogs.length >= 2) {
      const olderAvgVol = olderLogs.reduce((s, l) => s + l.totalVolume, 0) / olderLogs.length;
      const recentAvgVol = last30Logs.reduce((s, l) => s + l.totalVolume, 0) / last30Logs.length;
      if (olderAvgVol > 0) {
        const volDelta = Math.round(((recentAvgVol - olderAvgVol) / olderAvgVol) * 100);
        if (Math.abs(volDelta) >= 5) {
          highlights.push({
            label: 'Volume Trend',
            stat: `${volDelta > 0 ? '+' : ''}${volDelta}%`,
            detail: `Avg volume per session ${volDelta > 0 ? 'increased' : 'decreased'} vs. earlier`,
            sentiment: volDelta > 0 ? 'positive' : 'neutral',
          });
        }
      }
    }
  }

  // ── Consistency highlight ──
  highlights.push({
    label: 'Consistency',
    stat: `${sessionsPerWeek}/wk`,
    detail: `${recentLogs.length} sessions over ${weeksTracked} weeks`,
    sentiment: sessionsPerWeek >= 3 ? 'positive' : sessionsPerWeek >= 2 ? 'neutral' : 'negative',
  });

  // ── RPE trend ──
  if (last30Logs.length >= 3) {
    const avgRPE = +(last30Logs.reduce((s, l) => s + l.overallRPE, 0) / last30Logs.length).toFixed(1);
    if (avgRPE >= 9) {
      storyParts.push('Your recent RPE has been consistently high — watch for accumulated fatigue');
    } else if (avgRPE >= 7) {
      storyParts.push('Training intensity is well-managed in the productive RPE 7-9 zone');
    }
  }

  const summary = storyParts.join('. ') + '.';

  return {
    summary,
    highlights,
    timeframeDays: totalDays,
    hasData: true,
  };
}
