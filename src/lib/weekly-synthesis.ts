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
    combatSessions: number;
    combatMinutes: number;
  };
  /** Trend compared to last week */
  trends: {
    volume: 'up' | 'down' | 'stable';
    prs: 'up' | 'down' | 'stable';
    consistency: 'up' | 'down' | 'stable';
  };
  /** Whether there's enough data to show */
  hasData: boolean;
  /** For insights engine — last week stats */
  lastWeekVolume: number;
  lastWorkouts: number;
  stalledExercises: string[];
  isMidWeek: boolean;
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
  const { user, workoutLogs, trainingSessions, wearableHistory, meals, macroTargets, weightUnit } = opts;

  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday-based
  startOfThisWeek.setHours(0, 0, 0, 0);

  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  // ─── This week's lifting data ───
  const thisWeekLogs = workoutLogs.filter(l => {
    const d = new Date(l.date);
    return d >= startOfThisWeek && d <= now;
  });

  const lastWeekLogs = workoutLogs.filter(l => {
    const d = new Date(l.date);
    return d >= startOfLastWeek && d < startOfThisWeek;
  });

  // ─── This week's combat/training sessions ───
  const thisWeekCombat = trainingSessions.filter(s => {
    const d = new Date(s.date);
    return d >= startOfThisWeek && d <= now;
  });
  const lastWeekCombat = trainingSessions.filter(s => {
    const d = new Date(s.date);
    return d >= startOfLastWeek && d < startOfThisWeek;
  });
  const combatSessions = thisWeekCombat.length;
  const combatMinutes = thisWeekCombat.reduce((s, c) => s + (c.duration || 0), 0);
  const lastCombatSessions = lastWeekCombat.length;
  const lastCombatMinutes = lastWeekCombat.reduce((s, c) => s + (c.duration || 0), 0);

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
  const hasData = thisWorkouts > 0 || combatSessions > 0;
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
        combatSessions,
        combatMinutes,
        lastCombatSessions,
        lastCombatMinutes,
      })
    : 'Start logging workouts or training sessions this week to get your personalized coaching summary.';

  const stalledExercises = findStalledExercises(thisWeekLogs, lastWeekLogs);

  return {
    narrative,
    stats: {
      workouts: thisWorkouts,
      prs: thisPRs,
      avgReadiness,
      proteinAdherence,
      avgRPE,
      totalVolume: thisVolume,
      combatSessions,
      combatMinutes,
    },
    trends: {
      volume: volumeTrend,
      prs: prTrend,
      consistency: consistencyTrend,
    },
    hasData,
    lastWeekVolume: lastVolume,
    lastWorkouts,
    stalledExercises,
    isMidWeek,
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
  combatSessions: number;
  combatMinutes: number;
  lastCombatSessions: number;
  lastCombatMinutes: number;
}): string {
  const parts: string[] = [];
  const midWeek = data.isMidWeek;
  const soFar = midWeek ? ' so far' : '';

  // Opening — combined training summary (lifting + combat)
  const volDelta = data.lastVolume > 0
    ? Math.round(((data.totalVolume - data.lastVolume) / data.lastVolume) * 100)
    : 0;

  const hasCombat = data.combatSessions > 0;
  const hasLifting = data.workouts > 0;

  if (hasLifting && hasCombat) {
    // Combined summary
    const combatLabel = data.combatMinutes > 0 ? ` and ${data.combatSessions} mat session${data.combatSessions !== 1 ? 's' : ''} (${data.combatMinutes}min)` : ` and ${data.combatSessions} mat session${data.combatSessions !== 1 ? 's' : ''}`;
    if (data.prs > 0) {
      parts.push(
        `You've lifted ${data.workouts} time${data.workouts !== 1 ? 's' : ''}${combatLabel}${soFar} this week, hitting ${data.prs} PR${data.prs !== 1 ? 's' : ''}.`
      );
    } else {
      parts.push(
        `You've lifted ${data.workouts} time${data.workouts !== 1 ? 's' : ''}${combatLabel}${soFar} this week.`
      );
    }
  } else if (hasCombat && !hasLifting) {
    // Combat only
    const minLabel = data.combatMinutes > 0 ? ` totaling ${data.combatMinutes}min on the mats` : '';
    parts.push(
      `You've had ${data.combatSessions} training session${data.combatSessions !== 1 ? 's' : ''}${minLabel}${soFar} this week.`
    );
  } else {
    // Lifting only (original behavior)
    if (data.prs > 0) {
      parts.push(
        `You've trained ${data.workouts} time${data.workouts !== 1 ? 's' : ''}${soFar} this week and hit ${data.prs} PR${data.prs !== 1 ? 's' : ''}.`
      );
    } else {
      parts.push(
        `You've trained ${data.workouts} time${data.workouts !== 1 ? 's' : ''}${soFar} this week.`
      );
    }
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

  // Combat training insights
  if (data.combatSessions > 0) {
    // Compare to last week
    if (data.lastCombatSessions > 0) {
      const matDelta = data.combatMinutes - data.lastCombatMinutes;
      if (matDelta > 30) {
        parts.push(`Mat time is up ${matDelta}min from last week — make sure your lifting doesn't interfere with recovery.`);
      } else if (matDelta < -30 && !midWeek) {
        parts.push(`Mat time dropped ${Math.abs(matDelta)}min from last week.`);
      }
    }

    // Overtraining warning: heavy lifting + heavy combat
    if (data.workouts >= 4 && data.combatSessions >= 3) {
      parts.push(`${data.workouts} lifts + ${data.combatSessions} mat sessions is a high training load — watch for accumulated fatigue.`);
    }

    // Combat-specific intensity advice
    if (data.combatMinutes >= 300 && data.avgRPE >= 8.0) {
      parts.push(`High mat volume (${data.combatMinutes}min) combined with heavy lifting RPE — consider a lighter lift day next week.`);
    }
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
// ─── Structured Weekly Insights ─────────────────────────────────────────────

export type InsightType = 'win' | 'trend' | 'warning' | 'nutrition' | 'combat' | 'one_thing';

export interface WeeklyInsight {
  type: InsightType;
  icon: 'trophy' | 'trending' | 'alert' | 'target' | 'shield' | 'crosshair';
  label: string;
  text: string;
  color: 'gold' | 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'primary';
}

/**
 * Generate structured insight chips for the weekly coaching card.
 * Returns 3-4 prioritized insights — always ending with "One Thing" focus.
 */
export function generateWeeklyInsights(opts: {
  stats: WeeklySynthesisData['stats'];
  trends: WeeklySynthesisData['trends'];
  lastWeekVolume: number;
  lastWorkouts: number;
  weightUnit: WeightUnit;
  stalledExercises: string[];
  isMidWeek: boolean;
}): WeeklyInsight[] {
  const { stats, trends, lastWeekVolume, lastWorkouts, weightUnit, stalledExercises, isMidWeek } = opts;
  const insights: WeeklyInsight[] = [];

  // ── Big Win (gold) — lead with the positive ──
  if (stats.prs > 0) {
    const prText = stats.prs >= 3
      ? `${stats.prs} PRs this week — you're in a peak phase. Ride this wave.`
      : stats.prs === 1
        ? `PR hit this week. Small wins compound into big strength.`
        : `${stats.prs} PRs this week — the program is working.`;
    insights.push({ type: 'win', icon: 'trophy', label: 'Big Win', text: prText, color: 'gold' });
  } else if (stats.workouts >= (lastWorkouts || 0) && stats.workouts >= 3) {
    insights.push({ type: 'win', icon: 'trophy', label: 'Consistency', text: `${stats.workouts} sessions logged — showing up is the hardest part. You did it.`, color: 'gold' });
  }

  // ── Volume Trend ──
  const volDelta = lastWeekVolume > 0
    ? Math.round(((stats.totalVolume - lastWeekVolume) / lastWeekVolume) * 100)
    : 0;

  if (trends.volume === 'up' && volDelta > 0) {
    insights.push({
      type: 'trend', icon: 'trending', label: 'Volume',
      text: isMidWeek
        ? `Already +${volDelta}% volume vs last week and still climbing.`
        : `+${volDelta}% volume vs last week — progressive overload locked in.`,
      color: 'green',
    });
  } else if (trends.volume === 'down' && !isMidWeek && volDelta < 0) {
    const fatigueNote = stats.avgRPE > 8.5 ? ' RPE is high — could be accumulated fatigue.' : '';
    insights.push({
      type: 'trend', icon: 'trending', label: 'Volume',
      text: `${Math.abs(volDelta)}% less volume than last week.${fatigueNote}`,
      color: 'red',
    });
  }

  // ── RPE Warning ──
  if (stats.avgRPE >= 9.0 && stats.workouts >= 2) {
    insights.push({
      type: 'warning', icon: 'alert', label: 'Intensity',
      text: `Avg RPE ${stats.avgRPE} — you're grinding near your ceiling. ${isMidWeek ? 'Ease into the remaining sessions.' : 'Watch for fatigue signals next week.'}`,
      color: 'amber',
    });
  } else if (stats.avgRPE > 0 && stats.avgRPE <= 6.5 && stats.workouts >= 3) {
    insights.push({
      type: 'trend', icon: 'trending', label: 'Intensity',
      text: `Avg RPE ${stats.avgRPE} — there's room to push harder. Add weight or reps.`,
      color: 'green',
    });
  }

  // ── Stalled Exercises ──
  if (stalledExercises.length > 0) {
    const names = stalledExercises.slice(0, 2).join(' and ');
    insights.push({
      type: 'warning', icon: 'alert', label: 'Plateau',
      text: `${names} stalled vs last week — try different rep range or add a back-off set.`,
      color: 'amber',
    });
  }

  // ── Nutrition ──
  if (stats.proteinAdherence !== null) {
    if (stats.proteinAdherence >= 85) {
      insights.push({
        type: 'nutrition', icon: 'target', label: 'Nutrition',
        text: `Protein adherence ${stats.proteinAdherence}% — your recovery is fully fueled.`,
        color: 'green',
      });
    } else if (stats.proteinAdherence < 60) {
      insights.push({
        type: 'nutrition', icon: 'target', label: 'Nutrition',
        text: `Protein adherence at ${stats.proteinAdherence}% of days hitting target — you're leaving recovery and gains on the table.`,
        color: 'blue',
      });
    }
  }

  // ── Combat Load ──
  if (stats.combatSessions > 0 && stats.workouts >= 4 && stats.combatSessions >= 3) {
    insights.push({
      type: 'combat', icon: 'shield', label: 'Training Load',
      text: `${stats.workouts} lifts + ${stats.combatSessions} mat sessions — high total load. Monitor fatigue closely.`,
      color: 'purple',
    });
  } else if (stats.combatSessions > 0 && stats.combatMinutes > 0) {
    insights.push({
      type: 'combat', icon: 'shield', label: 'Mat Time',
      text: `${stats.combatMinutes}min across ${stats.combatSessions} session${stats.combatSessions !== 1 ? 's' : ''} on the mats.`,
      color: 'purple',
    });
  }

  // ── Recovery ──
  if (stats.avgReadiness !== null) {
    if (stats.avgReadiness < 40) {
      insights.push({
        type: 'warning', icon: 'alert', label: 'Recovery',
        text: `Recovery averaging ${stats.avgReadiness}% — ${isMidWeek ? 'prioritize sleep and nutrition this week' : 'consider an extra rest day next week'}.`,
        color: 'amber',
      });
    }
  }

  // ── One Thing (always last) — single actionable focus ──
  const oneThing = pickOneThing(stats, trends, stalledExercises, isMidWeek);
  insights.push({
    type: 'one_thing', icon: 'crosshair', label: 'Your One Thing',
    text: oneThing,
    color: 'primary',
  });

  // Limit to 4 total (3 insights + One Thing)
  if (insights.length > 4) {
    const oneThingInsight = insights[insights.length - 1];
    const topInsights = insights.slice(0, insights.length - 1).slice(0, 3);
    return [...topInsights, oneThingInsight];
  }

  return insights;
}

function pickOneThing(
  stats: WeeklySynthesisData['stats'],
  trends: WeeklySynthesisData['trends'],
  stalledExercises: string[],
  isMidWeek: boolean,
): string {
  // Priority order: biggest limiting factor first
  if (stats.proteinAdherence !== null && stats.proteinAdherence < 60) {
    return `Hit your protein target 5 of 7 days next week. Everything else follows recovery.`;
  }
  if (stats.avgRPE >= 9.0 && stats.workouts >= 3) {
    return `Leave 1-2 reps in the tank next week. RPE 7-8 builds more than RPE 10.`;
  }
  if (stalledExercises.length > 0) {
    return `Switch ${stalledExercises[0]} to a different rep range next block. Variation breaks plateaus.`;
  }
  if (stats.avgReadiness !== null && stats.avgReadiness < 40) {
    return `Add 30 min to your sleep this week. Recovery is the biggest untapped lever.`;
  }
  if (trends.volume === 'down' && !isMidWeek) {
    return `Add one extra set per exercise next week to recover volume.`;
  }
  if (stats.proteinAdherence !== null && stats.proteinAdherence < 85) {
    return `Push protein adherence from ${stats.proteinAdherence}% toward 85%+ next week.`;
  }
  if (stats.prs > 0) {
    return `Keep doing exactly this. Don't change what's working.`;
  }
  return `Stay consistent. Show up, train with intent, recover hard.`;
}

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
