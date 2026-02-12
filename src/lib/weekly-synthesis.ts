/**
 * Weekly Synthesis — The Coaching Voice
 *
 * Generates a human-readable narrative connecting training, recovery,
 * and nutrition into a single paragraph. This is what a great coach
 * would say to you on Sunday evening.
 */

import type {
  WorkoutLog,
  TrainingSession,
  WearableData,
  MealEntry,
  MacroTargets,
  UserProfile,
  WeightUnit,
} from './types';

export interface WeeklySynthesisData {
  /** Full coaching narrative paragraph */
  narrative: string;
  /** Key stats for the card */
  stats: {
    workouts: number;
    prs: number;
    avgReadiness: number | null;
    proteinAdherence: number | null; // percentage of days hitting target
    avgRPE: number;
    totalVolume: number;
  };
  /** Trend compared to last week */
  trends: {
    volume: 'up' | 'down' | 'stable';
    prs: 'up' | 'down' | 'stable';
    consistency: 'up' | 'down' | 'stable';
  };
  /** Whether there's enough data to show */
  hasData: boolean;
}

export function generateWeeklySynthesis(opts: {
  user: UserProfile | null;
  workoutLogs: WorkoutLog[];
  trainingSessions: TrainingSession[];
  wearableHistory: WearableData[];
  meals: MealEntry[];
  macroTargets: MacroTargets;
  weightUnit: WeightUnit;
}): WeeklySynthesisData {
  const { user, workoutLogs, wearableHistory, meals, macroTargets, weightUnit } = opts;

  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - now.getDay());
  startOfThisWeek.setHours(0, 0, 0, 0);

  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  // ─── This week's data ───
  const thisWeekLogs = workoutLogs.filter(l => {
    const d = new Date(l.date);
    return d >= startOfThisWeek && d <= now;
  });

  const lastWeekLogs = workoutLogs.filter(l => {
    const d = new Date(l.date);
    return d >= startOfLastWeek && d < startOfThisWeek;
  });

  const thisWorkouts = thisWeekLogs.length;
  const lastWorkouts = lastWeekLogs.length;

  const thisPRs = thisWeekLogs.reduce(
    (sum, l) => sum + l.exercises.filter(e => e.personalRecord).length, 0
  );
  const lastPRs = lastWeekLogs.reduce(
    (sum, l) => sum + l.exercises.filter(e => e.personalRecord).length, 0
  );

  const thisVolume = thisWeekLogs.reduce((s, l) => s + l.totalVolume, 0);
  const lastVolume = lastWeekLogs.reduce((s, l) => s + l.totalVolume, 0);

  const avgRPE = thisWorkouts > 0
    ? Math.round((thisWeekLogs.reduce((s, l) => s + l.overallRPE, 0) / thisWorkouts) * 10) / 10
    : 0;

  // ─── Recovery data ───
  const thisWeekRecovery = wearableHistory.filter(w => {
    const d = new Date(w.date);
    return d >= startOfThisWeek && d <= now && w.recoveryScore != null;
  });
  const avgReadiness = thisWeekRecovery.length > 0
    ? Math.round(thisWeekRecovery.reduce((s, w) => s + (w.recoveryScore ?? 0), 0) / thisWeekRecovery.length)
    : null;

  // ─── Protein adherence ───
  let proteinAdherence: number | null = null;
  if (macroTargets.protein > 0) {
    const daysSoFar = Math.max(1, Math.ceil((now.getTime() - startOfThisWeek.getTime()) / (1000 * 60 * 60 * 24)));
    let daysHit = 0;
    for (let i = 0; i < daysSoFar; i++) {
      const dayDate = new Date(startOfThisWeek);
      dayDate.setDate(dayDate.getDate() + i);
      const dayStr = dayDate.toDateString();
      const dayProtein = meals
        .filter(m => new Date(m.date).toDateString() === dayStr)
        .reduce((s, m) => s + (m.protein || 0), 0);
      if (dayProtein >= macroTargets.protein * 0.85) daysHit++;
    }
    proteinAdherence = Math.round((daysHit / daysSoFar) * 100);
  }

  // ─── Trends ───
  const volumeTrend = thisVolume > lastVolume * 1.05 ? 'up' as const
    : thisVolume < lastVolume * 0.95 ? 'down' as const : 'stable' as const;
  const prTrend = thisPRs > lastPRs ? 'up' as const
    : thisPRs < lastPRs ? 'down' as const : 'stable' as const;
  const consistencyTrend = thisWorkouts > lastWorkouts ? 'up' as const
    : thisWorkouts < lastWorkouts ? 'down' as const : 'stable' as const;

  // ─── Build narrative ───
  const hasData = thisWorkouts > 0;
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
  const isMidWeek = dayOfWeek <= 3; // Sun–Wed: week is still early/mid
  const daysLeft = 6 - dayOfWeek; // days remaining (Sat = end of week)

  const narrative = hasData
    ? buildNarrative({
        workouts: thisWorkouts,
        prs: thisPRs,
        avgRPE,
        totalVolume: thisVolume,
        lastVolume,
        avgReadiness,
        proteinAdherence,
        proteinTarget: macroTargets.protein,
        weightUnit,
        user,
        stalledExercises: findStalledExercises(thisWeekLogs, lastWeekLogs),
        isMidWeek,
        daysLeft,
        lastWorkouts,
      })
    : 'Start logging workouts this week to get your personalized coaching summary.';

  return {
    narrative,
    stats: {
      workouts: thisWorkouts,
      prs: thisPRs,
      avgReadiness,
      proteinAdherence,
      avgRPE,
      totalVolume: thisVolume,
    },
    trends: {
      volume: volumeTrend,
      prs: prTrend,
      consistency: consistencyTrend,
    },
    hasData,
  };
}

// ─── Narrative Builder ─────────────────────────────────────────────────────

function buildNarrative(data: {
  workouts: number;
  prs: number;
  avgRPE: number;
  totalVolume: number;
  lastVolume: number;
  avgReadiness: number | null;
  proteinAdherence: number | null;
  proteinTarget: number;
  weightUnit: WeightUnit;
  user: UserProfile | null;
  stalledExercises: string[];
  isMidWeek: boolean;
  daysLeft: number;
  lastWorkouts: number;
}): string {
  const parts: string[] = [];
  const midWeek = data.isMidWeek;
  const soFar = midWeek ? ' so far' : '';

  // Opening — training summary with mid-week awareness
  const volDelta = data.lastVolume > 0
    ? Math.round(((data.totalVolume - data.lastVolume) / data.lastVolume) * 100)
    : 0;

  if (data.prs > 0) {
    parts.push(
      `You've trained ${data.workouts} time${data.workouts !== 1 ? 's' : ''}${soFar} this week and hit ${data.prs} PR${data.prs !== 1 ? 's' : ''}.`
    );
  } else {
    parts.push(
      `You've trained ${data.workouts} time${data.workouts !== 1 ? 's' : ''}${soFar} this week.`
    );
  }

  // Mid-week: remind user the week isn't over
  if (midWeek && data.daysLeft >= 2) {
    parts.push(`Still ${data.daysLeft} days left to build on that.`);
  }

  // Volume context — only compare to last week if week is mostly done
  if (data.lastVolume > 0 && Math.abs(volDelta) > 5) {
    if (midWeek) {
      // Mid-week: don't compare partial to full week — that's unfair
      if (volDelta > 0) {
        parts.push(`Volume is already up ${volDelta}% and still climbing.`);
      }
      // Skip negative volume commentary mid-week — incomplete data
    } else {
      if (volDelta > 0) {
        parts.push(`Volume is up ${volDelta}% from last week — progressive overload working.`);
      } else {
        parts.push(`Volume dipped ${Math.abs(volDelta)}% from last week${data.avgRPE > 8.5 ? ' — could be accumulated fatigue' : ''}.`);
      }
    }
  }

  // Recovery/readiness
  if (data.avgReadiness !== null) {
    if (data.avgReadiness >= 67) {
      parts.push(`Recovery averaged ${data.avgReadiness}% — excellent base for progression.`);
    } else if (data.avgReadiness < 40) {
      parts.push(
        midWeek
          ? `Recovery averaging ${data.avgReadiness}% — prioritize sleep and nutrition the rest of this week.`
          : `Recovery averaged only ${data.avgReadiness}% — consider an extra rest day or lighter sessions next week.`
      );
    }
  }

  // RPE context
  if (data.avgRPE >= 9.0) {
    parts.push(
      midWeek
        ? `Average RPE is ${data.avgRPE} — you're pushing hard. Listen to your body for the remaining sessions.`
        : `Average RPE was ${data.avgRPE} — you're pushing close to your limit. Watch for fatigue signals.`
    );
  } else if (data.avgRPE <= 6.5 && data.workouts >= 3) {
    parts.push(`Average RPE was only ${data.avgRPE} — you might have room to increase intensity.`);
  }

  // Nutrition
  if (data.proteinAdherence !== null && data.proteinTarget > 0) {
    if (data.proteinAdherence >= 85) {
      parts.push(`Protein adherence: ${data.proteinAdherence}% — fueling your gains.`);
    } else if (midWeek) {
      // Mid-week: encouraging tone, not judgmental
      parts.push(
        data.proteinAdherence < 60
          ? `Protein adherence is at ${data.proteinAdherence}% — there's still time to tighten it up this week. Aim for ${data.proteinTarget}g today.`
          : `Protein adherence: ${data.proteinAdherence}% — almost there, keep pushing for 85%+.`
      );
    } else {
      if (data.proteinAdherence < 60) {
        parts.push(
          `Protein adherence was ${data.proteinAdherence}% (target: ${data.proteinTarget}g/day). ` +
          `This may limit recovery and strength gains — try adding a post-workout shake.`
        );
      } else {
        parts.push(`Protein adherence: ${data.proteinAdherence}% — close, aim for 85%+ next week.`);
      }
    }
  }

  // Stalled exercises
  if (data.stalledExercises.length > 0) {
    const names = data.stalledExercises.slice(0, 2).join(' and ');
    parts.push(`${names} may be plateauing — consider adjusting rep range or adding volume next block.`);
  }

  return parts.join(' ');
}

// ─── Stalled Exercise Detection ──────────────────────────────────────────

function findStalledExercises(thisWeek: WorkoutLog[], lastWeek: WorkoutLog[]): string[] {
  if (lastWeek.length === 0) return [];

  // Build max 1RM per exercise for each week
  const getMax1RMs = (logs: WorkoutLog[]): Map<string, { name: string; max1RM: number }> => {
    const map = new Map<string, { name: string; max1RM: number }>();
    for (const log of logs) {
      for (const ex of log.exercises) {
        if (ex.estimated1RM) {
          const existing = map.get(ex.exerciseId);
          if (!existing || ex.estimated1RM > existing.max1RM) {
            map.set(ex.exerciseId, { name: ex.exerciseName, max1RM: ex.estimated1RM });
          }
        }
      }
    }
    return map;
  };

  const thisMax = getMax1RMs(thisWeek);
  const lastMax = getMax1RMs(lastWeek);
  const stalled: string[] = [];

  thisMax.forEach((thisData, exId) => {
    const lastData = lastMax.get(exId);
    if (lastData && thisData.max1RM <= lastData.max1RM) {
      stalled.push(thisData.name);
    }
  });

  return stalled;
}

/**
 * Generate a contextual coaching line for the post-workout celebration modal.
 * This gives the user one meaningful insight about their just-completed session.
 */
export function generatePostWorkoutCoachingLine(
  log: WorkoutLog,
  previousLogs: WorkoutLog[],
  wearableData: WearableData | null,
): string | null {
  // PR celebration
  const prExercises = log.exercises.filter(e => e.personalRecord);
  if (prExercises.length > 0) {
    const name = prExercises[0].exerciseName;
    const e1rm = prExercises[0].estimated1RM;
    if (e1rm) {
      return `New ${name} PR — estimated 1RM: ${Math.round(e1rm)}. Your strength is trending up.`;
    }
    return `New PR on ${name}! Consistency is paying off.`;
  }

  // Volume comparison to previous same-session
  const prevSameSession = previousLogs
    .filter(l => l.sessionId === log.sessionId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  if (prevSameSession) {
    const volDelta = log.totalVolume - prevSameSession.totalVolume;
    const volPct = Math.round((volDelta / (prevSameSession.totalVolume || 1)) * 100);
    if (volPct > 5) {
      return `Volume up ${volPct}% compared to last time — progressive overload in action.`;
    }
    if (volPct < -10) {
      // Check for sleep context
      if (wearableData?.sleepHours != null && wearableData.sleepHours < 6) {
        return `Volume dipped today, likely from ${wearableData.sleepHours.toFixed(1)}hrs sleep. Your 4-week trend is still solid.`;
      }
      return `Volume was lower today. One session doesn't define your progress — your trend matters more.`;
    }
  }

  // RPE context
  if (log.overallRPE >= 9.5) {
    return `That was a grinder. High RPE signals your body is adapting — make sure to recover well tonight.`;
  }

  if (log.overallRPE <= 6 && log.exercises.length >= 4) {
    return `Felt smooth — you might be ready to push harder next session.`;
  }

  // Default encouragement
  const streak = previousLogs.filter(l => {
    const diff = (Date.now() - new Date(l.date).getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 30;
  }).length;

  if (streak >= 10) {
    return `${streak} sessions this month. You're building something real.`;
  }

  return null;
}
