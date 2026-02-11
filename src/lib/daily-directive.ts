/**
 * Daily Directive — "Tell me exactly what to do today"
 *
 * Synthesizes readiness, next session, nutrition status, and recovery context
 * into a single actionable payload. Replaces decision fatigue with one clear
 * mission for the day.
 */

import type {
  UserProfile,
  WorkoutLog,
  TrainingSession,
  WearableData,
  MealEntry,
  MacroTargets,
  InjuryEntry,
  QuickLog,
  Mesocycle,
  MesocycleWeek,
  WorkoutSession,
  ReadinessLevel,
  CompetitionEvent,
} from './types';
import { calculateReadiness } from './performance-engine';
import { detectFightCampPhase, getPhaseConfig } from './fight-camp-engine';

export interface DailyDirective {
  /** One-line mission headline, e.g. "Upper Body Hypertrophy" or "Rest & Recover" */
  headline: string;
  /** Motivational/contextual subline, e.g. "You slept 8hrs — push hard today" */
  subline: string;
  /** 2-3 concrete action items for today */
  actions: string[];
  /** Readiness score 0-100 */
  readinessScore: number;
  /** Readiness level for color coding */
  readinessLevel: ReadinessLevel;
  /** Whether user should train today */
  shouldTrain: boolean;
  /** The next workout session if training (null on rest days) */
  nextSession: WorkoutSession | null;
  /** Week/day label like "W2/D1" */
  sessionLabel: string | null;
  /** Whether it's a deload week */
  isDeload: boolean;
  /** Protein gap for today (grams remaining to hit target) */
  proteinGap: number;
  /** Volume/intensity modifier text */
  modifierText: string | null;
  /** Fight camp phase tag, e.g. "Intensification · 32d out" */
  fightCampTag: string | null;
}

interface DirectiveInput {
  user: UserProfile | null;
  currentMesocycle: Mesocycle | null;
  workoutLogs: WorkoutLog[];
  trainingSessions: TrainingSession[];
  wearableData: WearableData | null;
  wearableHistory: WearableData[];
  meals: MealEntry[];
  macroTargets: MacroTargets;
  waterLog: Record<string, number>;
  injuryLog: InjuryEntry[];
  quickLogs: QuickLog[];
  competitions?: CompetitionEvent[];
}

export function generateDailyDirective(input: DirectiveInput): DailyDirective {
  const {
    user, currentMesocycle, workoutLogs, trainingSessions,
    wearableData, wearableHistory, meals, macroTargets,
    injuryLog, quickLogs,
  } = input;

  // ─── Readiness ───
  const readiness = calculateReadiness({
    user, workoutLogs, trainingSessions,
    wearableData, wearableHistory, meals, macroTargets,
    waterLog: input.waterLog, injuryLog, quickLogs,
  });

  // ─── Next workout ───
  const nextWorkoutInfo = getNextWorkout(currentMesocycle, workoutLogs);
  const nextSession = nextWorkoutInfo?.session ?? null;
  const isDeload = nextWorkoutInfo?.isDeload ?? false;

  // ─── Fight camp context ───
  let fightCampTag: string | null = null;
  const competitions = input.competitions || [];
  const now = Date.now();
  const nextComp = competitions
    .filter(c => c.isActive && new Date(c.date).getTime() > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] || null;
  const daysToComp = nextComp
    ? Math.ceil((new Date(nextComp.date).getTime() - now) / (1000 * 60 * 60 * 24))
    : null;
  const isCombat = user?.trainingIdentity === 'combat';
  const campPhase = isCombat && daysToComp != null
    ? detectFightCampPhase(daysToComp)
    : null;
  if (campPhase && campPhase !== 'off_season' && daysToComp != null) {
    const cfg = getPhaseConfig(campPhase, (user?.sex || 'male') as 'male' | 'female');
    fightCampTag = `${cfg.name.split('(')[0].trim()} · ${daysToComp}d out`;
  }

  // ─── Today's nutrition ───
  const todayStr = new Date().toDateString();
  const todayMeals = meals.filter(m => new Date(m.date).toDateString() === todayStr);
  const todayProtein = todayMeals.reduce((sum, m) => sum + (m.protein || 0), 0);
  const proteinTarget = macroTargets.protein || 0;
  const proteinGap = Math.max(0, proteinTarget - todayProtein);

  // ─── Today's workouts already done ───
  const todayWorkouts = workoutLogs.filter(l => new Date(l.date).toDateString() === todayStr);
  const alreadyTrainedToday = todayWorkouts.length > 0;

  // ─── Determine if should train ───
  const isCritical = readiness.overall < 30;
  const isLow = readiness.overall < 45;
  const shouldTrain = !isCritical && !alreadyTrainedToday && nextSession !== null;

  // ─── Session label ───
  let sessionLabel: string | null = null;
  if (nextWorkoutInfo && currentMesocycle) {
    sessionLabel = `W${nextWorkoutInfo.weekNumber}/D${nextWorkoutInfo.dayNumber}`;
  }

  // ─── Build headline ───
  let headline: string;
  if (alreadyTrainedToday) {
    headline = 'Recovery Mode';
  } else if (isCritical) {
    headline = 'Rest Day';
  } else if (!nextSession) {
    headline = currentMesocycle ? 'Block Complete' : 'Ready to Start';
  } else if (isDeload) {
    headline = `Deload — ${nextSession.name}`;
  } else {
    headline = nextSession.name;
  }

  // ─── Build subline ───
  const subline = buildSubline(readiness.overall, readiness.level, wearableData, alreadyTrainedToday, isDeload);

  // ─── Build actions ───
  const actions: string[] = [];

  if (shouldTrain && nextSession) {
    const exerciseCount = nextSession.exercises.length;
    const duration = nextSession.estimatedDuration;
    actions.push(`${exerciseCount} exercises, ~${duration}min session`);
  } else if (alreadyTrainedToday) {
    actions.push('Focus on recovery — stretch, hydrate, eat well');
  } else if (isCritical) {
    actions.push('Rest today — your body needs recovery');
  } else if (!nextSession && currentMesocycle) {
    actions.push('Generate your next training block');
  }

  if (proteinTarget > 0) {
    if (proteinGap > 30) {
      actions.push(`Hit ${proteinTarget}g protein (${proteinGap}g remaining)`);
    } else if (proteinGap > 0) {
      actions.push(`Almost there — ${proteinGap}g protein to go`);
    } else {
      actions.push('Protein target hit');
    }
  }

  // Fight camp phase-specific action
  if (campPhase && campPhase !== 'off_season' && actions.length < 3) {
    const phaseActions: Record<string, string> = {
      base_camp: 'Track macros consistently — build your competition-day habits',
      intensification: 'Strict macro tracking — every meal counts this phase',
      fight_camp_peak: 'Weigh in daily (AM, fasted) — monitor your weight cut trajectory',
      fight_week: 'Follow water/sodium protocol precisely — no improvising',
      weigh_in_day: 'Weigh-in protocol active — begin rehydration immediately after',
      fight_day: 'Performance fueling — last solid meal 3-4hrs before fight',
      tournament_day: 'Pack all food tonight — fuel between matches every 30-60min',
      post_competition: 'Recovery priority — no strict dieting for at least 1 week',
    };
    if (phaseActions[campPhase]) {
      actions.push(phaseActions[campPhase]);
    }
  }

  // Sleep action based on readiness
  const sleepFactor = readiness.factors.find(f => f.source === 'sleep' && f.available);
  if (sleepFactor && sleepFactor.score < 50) {
    actions.push('Prioritize sleep tonight — aim for 7-9hrs');
  }

  // ─── Modifier text ───
  let modifierText: string | null = null;
  if (readiness.volumeModifier !== 1.0 || readiness.intensityModifier !== 1.0) {
    const volPct = Math.round(readiness.volumeModifier * 100);
    const intPct = Math.round(readiness.intensityModifier * 100);
    if (volPct < 100 || intPct < 100) {
      modifierText = `Auto-adjusted: ${volPct}% volume, ${intPct}% intensity`;
    } else if (volPct > 100) {
      modifierText = `Readiness is high — pushing ${volPct}% volume today`;
    }
  }

  return {
    headline,
    subline,
    actions,
    readinessScore: readiness.overall,
    readinessLevel: readiness.level,
    shouldTrain,
    nextSession,
    sessionLabel,
    isDeload,
    proteinGap,
    modifierText,
    fightCampTag,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getNextWorkout(
  mesocycle: Mesocycle | null,
  logs: WorkoutLog[]
): { session: WorkoutSession; weekNumber: number; dayNumber: number; isDeload: boolean } | null {
  if (!mesocycle) return null;
  const completedIds = new Set(
    logs.filter(l => l.mesocycleId === mesocycle.id).map(l => l.sessionId)
  );
  for (const week of mesocycle.weeks) {
    for (let i = 0; i < week.sessions.length; i++) {
      const session = week.sessions[i];
      if (!completedIds.has(session.id)) {
        return { session, weekNumber: week.weekNumber, dayNumber: i + 1, isDeload: week.isDeload };
      }
    }
  }
  return null;
}

function buildSubline(
  score: number,
  level: ReadinessLevel,
  wearable: WearableData | null,
  alreadyTrained: boolean,
  isDeload: boolean
): string {
  if (alreadyTrained) {
    return 'Great work today. Focus on nutrition and rest.';
  }

  // Build context-aware subline
  const parts: string[] = [];

  // Sleep context
  if (wearable?.sleepHours != null) {
    const hrs = wearable.sleepHours;
    if (hrs >= 7.5) {
      parts.push(`${hrs.toFixed(1)}hrs sleep`);
    } else if (hrs < 6) {
      parts.push(`Only ${hrs.toFixed(1)}hrs sleep`);
    }
  }

  // Recovery context
  if (wearable?.recoveryScore != null) {
    const rec = wearable.recoveryScore;
    if (rec >= 67) parts.push(`recovery ${rec}%`);
    else if (rec < 34) parts.push(`low recovery ${rec}%`);
  }

  if (isDeload) {
    return parts.length > 0
      ? `${parts.join(' · ')} — deload week, keep it light`
      : 'Deload week — lighter loads, focus on form';
  }

  // Level-based motivation
  switch (level) {
    case 'peak':
      return parts.length > 0
        ? `${parts.join(' · ')} — push hard today`
        : 'Everything is aligned — make it count';
    case 'good':
      return parts.length > 0
        ? `${parts.join(' · ')} — solid day ahead`
        : 'Good shape today — train with intent';
    case 'moderate':
      return parts.length > 0
        ? `${parts.join(' · ')} — listen to your body`
        : 'Moderate readiness — adjust if needed';
    case 'low':
      return parts.length > 0
        ? `${parts.join(' · ')} — consider lighter session`
        : 'Low readiness — reduce intensity today';
    case 'critical':
      return 'Multiple recovery factors are low — rest is the best training today';
    default:
      return score >= 65 ? 'Ready to train' : 'Take it easy today';
  }
}
