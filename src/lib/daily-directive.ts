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
  CombatTrainingDay,
  WorkoutSkip,
} from './types';
import { calculateReadiness } from './performance-engine';
import { detectFightCampPhase, getPhaseConfig } from './fight-camp-engine';
import { INTENSITY_LABELS, type TrainingIntensity } from './types';

export type TodayType = 'lift' | 'combat' | 'both' | 'rest' | 'recovery';

export interface TodayCombatSession {
  type: string;
  category: string;
  duration: number;
  intensity: string;
  /** Whether this session has already been logged (completed) vs scheduled */
  logged: boolean;
}

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
  /** What's actually happening today */
  todayType: TodayType;
  /** Today's combat/training sessions */
  todayCombatSessions: TodayCombatSession[];
  /** Is today a scheduled lifting day per user.trainingDays */
  isScheduledLiftDay: boolean;
  /** Scheduled combat sessions for today (from the weekly plan, not logged) */
  scheduledCombatToday: CombatTrainingDay[];
  /** Today's completed workout performance (when user already trained) */
  todayPerformance: TodayPerformance | null;
  /** Context banner — strategic awareness line above the card */
  contextBanner: string | null;
  /** Forward-looking momentum line — what's next */
  forwardLook: string | null;
  /** Progressive overload teaser for lift days */
  overloadTeaser: string | null;
  /** Training modification guidance when readiness is low */
  trainingModification: string | null;
  /** Label for the next scheduled lift day, e.g. "Wed" or "tomorrow" */
  nextLiftDayLabel: string | null;
  /** Combat sessions skipped today (names, for UI context) */
  skippedSessions: string[];
}

export type SessionGrade = 'S' | 'A' | 'B' | 'C';

export interface TodayPerformance {
  totalVolume: number;
  totalSets: number;
  exerciseCount: number;
  avgRPE: number;
  duration: number; // minutes
  topExercise: string | null;
  topExerciseVolume: number;
  /** Session quality grade (S/A/B/C) */
  grade: SessionGrade;
  /** One-sentence verdict for the session */
  verdict: string;
  /** Number of personal records set today */
  prs: number;
  /** PR exercise names */
  prExercises: string[];
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
  workoutSkips?: WorkoutSkip[];
}

export function generateDailyDirective(input: DirectiveInput): DailyDirective {
  const {
    user, currentMesocycle, workoutLogs, trainingSessions,
    wearableData, wearableHistory, meals, macroTargets,
    injuryLog, quickLogs, workoutSkips,
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
  const proteinGap = Math.round(Math.max(0, proteinTarget - todayProtein));

  // ─── Today's workouts already done ───
  const todayWorkouts = workoutLogs.filter(l => new Date(l.date).toDateString() === todayStr);
  const alreadyLiftedToday = todayWorkouts.length > 0;

  // ─── Today's logged combat/training sessions ───
  const todayCombat = trainingSessions.filter(s =>
    new Date(s.date).toDateString() === todayStr
  );
  const todayCombatSessions: TodayCombatSession[] = todayCombat.map(s => ({
    type: formatActivityType(s.type),
    category: s.category,
    duration: s.duration,
    intensity: INTENSITY_LABELS[(s.actualIntensity || s.plannedIntensity) as TrainingIntensity] || (s.actualIntensity || s.plannedIntensity),
    logged: true,
  }));
  const hasLoggedCombatToday = todayCombatSessions.length > 0;

  // ─── Day-of-week schedule awareness ───
  const todayDow = new Date().getDay(); // 0=Sun..6=Sat
  const userTrainingDays = user?.trainingDays || [];
  const userCombatDays = user?.combatTrainingDays || [];
  const isScheduledLiftDay = userTrainingDays.length > 0
    ? userTrainingDays.includes(todayDow)
    : true; // if no schedule set, assume any day is fine
  const scheduledCombatToday = userCombatDays.filter(d => d.day === todayDow);
  const hasScheduledCombat = scheduledCombatToday.length > 0;
  // Build combat session display from schedule if nothing logged yet
  if (!hasLoggedCombatToday && hasScheduledCombat) {
    scheduledCombatToday.forEach(d => {
      todayCombatSessions.push({
        type: d.label || formatActivityType(d.intensity + ' session'),
        category: 'combat',
        duration: 0, // unknown until logged
        intensity: INTENSITY_LABELS[d.intensity as TrainingIntensity] || d.intensity,
        logged: false,
      });
    });
  }

  // Filter out skipped combat sessions — match by scheduledSessionId pattern "combat-{index}"
  const todaySkips = (workoutSkips || []).filter(s => s.date === new Date().toISOString().split('T')[0]);
  const skippedCombatIds = new Set(
    todaySkips.filter(s => s.scheduledSessionId?.startsWith('combat-')).map(s => s.scheduledSessionId)
  );
  // Remove skipped unlogged sessions (keep logged ones — those are real data)
  const skippedSessionNames: string[] = [];
  for (let i = todayCombatSessions.length - 1; i >= 0; i--) {
    if (!todayCombatSessions[i].logged && skippedCombatIds.has(`combat-${i}`)) {
      skippedSessionNames.push(todayCombatSessions[i].type);
      todayCombatSessions.splice(i, 1);
    }
  }

  // Combine: either logged combat exists OR scheduled (non-skipped) combat remains
  const hasCombatToday = todayCombatSessions.length > 0;

  // ─── Today's performance (post-session metrics) ───
  let todayPerformance: TodayPerformance | null = null;
  if (alreadyLiftedToday && todayWorkouts.length > 0) {
    const totalVolume = todayWorkouts.reduce((s, l) => s + (l.totalVolume || 0), 0);
    const totalSets = todayWorkouts.reduce((s, l) => s + (l.exercises?.reduce((es, e) => es + (e.sets?.length || 0), 0) || 0), 0);
    const exerciseCount = todayWorkouts.reduce((s, l) => s + (l.exercises?.length || 0), 0);
    const rpeValues = todayWorkouts.filter(l => l.overallRPE).map(l => l.overallRPE);
    const avgRPE = rpeValues.length > 0 ? +(rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length).toFixed(1) : 0;
    const duration = todayWorkouts.reduce((s, l) => s + (l.duration || 0), 0);

    // Find top exercise by volume
    let topExercise: string | null = null;
    let topExerciseVolume = 0;
    todayWorkouts.forEach(l => {
      (l.exercises || []).forEach(e => {
        const vol = (e.sets || []).reduce((sv, set) => sv + (set.weight || 0) * (set.reps || 0), 0);
        if (vol > topExerciseVolume) {
          topExerciseVolume = vol;
          topExercise = e.exerciseName || null;
        }
      });
    });

    // PR detection
    const prExercises: string[] = [];
    todayWorkouts.forEach(l => {
      (l.exercises || []).forEach(e => {
        if (e.personalRecord) prExercises.push(e.exerciseName);
      });
    });

    // Session grade
    const grade = calculateSessionGrade(avgRPE, exerciseCount, totalSets, prExercises.length, duration);

    // Verdict
    const verdict = buildVerdict(grade, prExercises, avgRPE, totalSets);

    todayPerformance = { totalVolume, totalSets, exerciseCount, avgRPE, duration, topExercise, topExerciseVolume, grade, verdict, prs: prExercises.length, prExercises };
  }

  // ─── Determine today type ───
  const isCritical = readiness.overall < 30;
  // shouldTrain: must be a scheduled lift day, not already lifted, have a pending session, and not critical
  const shouldTrain = !isCritical && !alreadyLiftedToday && nextSession !== null && isScheduledLiftDay;

  let todayType: TodayType;
  if (alreadyLiftedToday && (!hasCombatToday || hasLoggedCombatToday)) {
    // Already lifted, and either no combat today or combat already logged → done for the day
    todayType = 'recovery';
  } else if (isCritical) {
    todayType = 'rest';
  } else if (shouldTrain && hasCombatToday) {
    todayType = 'both';
  } else if (shouldTrain) {
    todayType = 'lift';
  } else if (hasCombatToday) {
    todayType = 'combat';
  } else if (!isScheduledLiftDay && !hasCombatToday) {
    todayType = 'rest';
  } else {
    todayType = 'rest';
  }

  // ─── Next scheduled activity (for "coming up next" context) ───
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let nextLiftDayLabel: string | null = null;
  let nextCombatDayLabel: string | null = null;

  // Find next scheduled lift day (looking ahead up to 7 days)
  if (userTrainingDays.length > 0 && (todayType === 'rest' || todayType === 'combat' || todayType === 'recovery')) {
    for (let offset = 1; offset <= 7; offset++) {
      const checkDow = (todayDow + offset) % 7;
      if (userTrainingDays.includes(checkDow)) {
        nextLiftDayLabel = offset === 1 ? 'tomorrow' : shortDayNames[checkDow];
        break;
      }
    }
  }

  // Find next scheduled combat day
  if (userCombatDays.length > 0 && (todayType === 'rest' || todayType === 'lift' || todayType === 'recovery')) {
    for (let offset = 1; offset <= 7; offset++) {
      const checkDow = (todayDow + offset) % 7;
      if (userCombatDays.some(d => d.day === checkDow)) {
        nextCombatDayLabel = offset === 1 ? 'tomorrow' : shortDayNames[checkDow];
        break;
      }
    }
  }

  // ─── Session label ───
  let sessionLabel: string | null = null;
  if (nextWorkoutInfo && currentMesocycle) {
    sessionLabel = `Week ${nextWorkoutInfo.weekNumber} · Day ${nextWorkoutInfo.dayNumber}`;
  }

  // ─── Build headline ───
  let headline: string;
  switch (todayType) {
    case 'recovery':
      headline = alreadyLiftedToday ? 'Session Complete' : 'Recovery Mode';
      break;
    case 'rest':
      headline = 'Rest & Recover';
      break;
    case 'combat': {
      // Use the user's sport name when session type is generic (e.g. "Moderate Session")
      const sportLabels: Record<string, string> = {
        mma: 'MMA', grappling_gi: 'Gi Training', grappling_nogi: 'No-Gi Training', striking: 'Striking',
      };
      const sportName = user?.combatSport ? sportLabels[user.combatSport] || null : null;
      const sessionType = todayCombatSessions[0]?.type || 'Mat Day';
      const isGenericType = /^(light|moderate|hard|heavy)\s+session$/i.test(sessionType);
      const displayType = isGenericType && sportName ? sportName : sessionType;
      headline = todayCombatSessions.length === 1
        ? displayType
        : `${displayType} + ${todayCombatSessions.length - 1} more`;
      break;
    }
    case 'both':
      headline = nextSession ? nextSession.name : 'Training Day';
      break;
    case 'lift':
    default:
      if (!nextSession) {
        headline = currentMesocycle ? 'Block Complete' : 'Ready to Start';
      } else if (isDeload) {
        headline = `Deload — ${nextSession.name}`;
      } else {
        headline = nextSession.name;
      }
      break;
  }

  // ─── Build subline ───
  const subline = buildSubline(readiness.overall, readiness.level, wearableData, todayType, isDeload, todayCombatSessions);

  // ─── Build actions ───
  const actions: string[] = [];

  if (todayType === 'both' && nextSession) {
    actions.push(`${nextSession.exercises.length} exercises, ~${nextSession.estimatedDuration}min lift`);
    const combatLabel = todayCombatSessions.map(s => `${s.type} (${s.duration}min)`).join(' + ');
    actions.push(combatLabel);
  } else if (todayType === 'lift' && shouldTrain && nextSession) {
    actions.push(`${nextSession.exercises.length} exercises, ~${nextSession.estimatedDuration}min session`);
  } else if (todayType === 'combat') {
    const combatLabel = todayCombatSessions.map(s => `${s.type}${s.duration > 0 ? ` · ${s.duration}min` : ''}`).join(', ');
    actions.push(combatLabel);
    // Next lift info is handled by forwardLook + the next-workout preview card
  } else if (todayType === 'recovery' && todayPerformance) {
    actions.push(`${todayPerformance.exerciseCount} exercises · ${todayPerformance.totalSets} sets${todayPerformance.avgRPE > 0 ? ` · RPE ${todayPerformance.avgRPE}` : ''}`);
    if (todayPerformance.topExercise) {
      actions.push(`Top lift: ${todayPerformance.topExercise}`);
    }
    if (nextLiftDayLabel && nextSession) {
      actions.push(`Next lift ${nextLiftDayLabel}: ${nextSession.name}`);
    } else if (nextCombatDayLabel) {
      actions.push(`Next on the mats: ${nextCombatDayLabel}`);
    } else {
      actions.push('Focus on recovery — stretch, hydrate, eat well');
    }
  } else if (todayType === 'recovery') {
    actions.push('Focus on recovery — stretch, hydrate, eat well');
    if (nextLiftDayLabel && nextSession) {
      actions.push(`Next lift ${nextLiftDayLabel}: ${nextSession.name}`);
    } else if (nextCombatDayLabel) {
      actions.push(`Next on the mats: ${nextCombatDayLabel}`);
    }
  } else if (todayType === 'rest') {
    actions.push('Fuel up, stretch, and let adaptation happen');
    if (nextSession && nextLiftDayLabel) {
      actions.push(`Next lift ${nextLiftDayLabel}: ${nextSession.name}`);
    } else if (nextSession) {
      actions.push(`Next up: ${nextSession.name}`);
    }
    if (nextCombatDayLabel && !nextLiftDayLabel) {
      actions.push(`Back on the mats: ${nextCombatDayLabel}`);
    } else if (nextCombatDayLabel) {
      actions.push(`Mats: ${nextCombatDayLabel}`);
    }
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

  // Soreness-aware training suggestions
  const sorenessFactor = readiness.factors.find(f => f.source === 'soreness' && f.available);
  if (sorenessFactor && sorenessFactor.score < 60 && (todayType === 'lift' || todayType === 'both')) {
    // Parse which body areas are sore from the factor detail
    const detail = sorenessFactor.detail || '';
    const hasLegSoreness = /quad|hamstring|glute|calves|hip/i.test(detail);
    const hasUpperSoreness = /shoulder|chest|bicep|tricep|upper.?back/i.test(detail);
    const hasBackSoreness = /lower.?back|back/i.test(detail);

    if (sorenessFactor.score < 30) {
      actions.push('Heavy soreness — consider mobility work only today');
    } else if (hasLegSoreness && nextSession?.name?.toLowerCase().includes('leg')) {
      actions.push('Legs are sore — consider swapping to an upper body session');
    } else if (hasUpperSoreness && (nextSession?.name?.toLowerCase().includes('upper') || nextSession?.name?.toLowerCase().includes('push'))) {
      actions.push('Upper body sore — consider swapping to a lower body session');
    } else if (hasBackSoreness) {
      actions.push('Lower back is sore — go lighter on hinges and rows today');
    }
  }

  // Soreness trend detection — check for chronic patterns
  const sorenessLogs = quickLogs
    .filter(l => l.type === 'soreness' && String(l.value) !== 'none')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 14);
  if (sorenessLogs.length >= 5) {
    // Count which areas appear most frequently
    const areaCounts = new Map<string, number>();
    for (const log of sorenessLogs) {
      const entries = String(log.value).split(',');
      for (const entry of entries) {
        const [area, severity] = entry.split(':');
        if (area && (severity === 'moderate' || severity === 'severe')) {
          areaCounts.set(area.trim(), (areaCounts.get(area.trim()) || 0) + 1);
        }
      }
    }
    // If an area appears in 4+ of last 14 logs, flag it
    const areaEntries = Array.from(areaCounts.entries());
    for (let ai = 0; ai < areaEntries.length; ai++) {
      const [area, count] = areaEntries[ai];
      if (count >= 4 && actions.length < 4) {
        const areaLabel = area.replace(/_/g, ' ');
        actions.push(`${areaLabel} has been sore frequently — consider reducing volume for that area`);
        break; // Only show one chronic alert
      }
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

  // ─── Context banner — strategic awareness ───
  const contextBanner = buildContextBanner({
    todayType, sessionLabel, isDeload, fightCampTag, readinessScore: readiness.overall,
    mesocycle: currentMesocycle, nextWorkoutInfo,
    yesterdayRPE: getYesterdayRPE(workoutLogs),
  });

  // ─── Forward look — what's next ───
  const forwardLook = buildForwardLook({
    todayType, nextSession, nextLiftDayLabel, nextCombatDayLabel,
  });

  // ─── Progressive overload teaser (lift days) ───
  const overloadTeaser = (todayType === 'lift' || todayType === 'both') && nextSession
    ? buildOverloadTeaser(nextSession, workoutLogs)
    : null;

  // ─── Training modification for low readiness ───
  let trainingModification: string | null = null;
  if ((todayType === 'lift' || todayType === 'both') && readiness.overall < 55) {
    if (readiness.overall < 30) {
      trainingModification = 'Active recovery only — light mobility, no heavy lifts today';
    } else if (readiness.overall < 40) {
      trainingModification = 'Reduce to 2-3 sets per exercise, RPE 5-6 max. Skip isolation work.';
    } else {
      trainingModification = 'Keep RPE ≤7 today. Drop top sets by 10% and focus on technique.';
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
    todayType,
    todayCombatSessions,
    isScheduledLiftDay,
    scheduledCombatToday,
    todayPerformance,
    contextBanner,
    forwardLook,
    overloadTeaser,
    trainingModification,
    nextLiftDayLabel,
    skippedSessions: skippedSessionNames,
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
  todayType: TodayType,
  isDeload: boolean,
  combatSessions: TodayCombatSession[],
): string {
  if (todayType === 'recovery') {
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

  const ctx = parts.length > 0 ? `${parts.join(' · ')} — ` : '';

  if (todayType === 'rest') {
    return `${ctx}Rest day — fuel up, stretch, let your body adapt`;
  }

  if (todayType === 'combat' && combatSessions.length > 0) {
    const totalMin = combatSessions.reduce((s, c) => s + c.duration, 0);
    if (totalMin > 0) {
      return `${ctx}${totalMin}min on the mats`;
    }
    return `${ctx}${combatSessions.length} session${combatSessions.length > 1 ? 's' : ''} on the mats today`;
  }

  if (todayType === 'both' && combatSessions.length > 0) {
    return `${ctx}Lifting + mat time today — manage your energy`;
  }

  if (isDeload) {
    return `${ctx}Deload week — lighter loads, focus on form`;
  }

  // Level-based motivation for lift days
  switch (level) {
    case 'peak':
      return `${ctx}${ctx ? 'push hard today' : 'Everything is aligned — make it count'}`;
    case 'good':
      return `${ctx}${ctx ? 'solid day ahead' : 'Good shape today — train with intent'}`;
    case 'moderate':
      return `${ctx}${ctx ? 'listen to your body' : 'Moderate readiness — adjust if needed'}`;
    case 'low':
      return `${ctx}${ctx ? 'consider lighter session' : 'Low readiness — reduce intensity today'}`;
    case 'critical':
      return 'Multiple recovery factors are low — rest is the best training today';
    default:
      return score >= 65 ? 'Ready to train' : 'Take it easy today';
  }
}

function formatActivityType(type: string): string {
  const labels: Record<string, string> = {
    bjj_gi: 'BJJ Gi', bjj_nogi: 'BJJ No-Gi', wrestling: 'Wrestling',
    judo: 'Judo', sambo: 'Sambo', boxing: 'Boxing',
    kickboxing: 'Kickboxing', muay_thai: 'Muay Thai', karate: 'Karate',
    taekwondo: 'Taekwondo', mma: 'MMA', running: 'Running',
    cycling: 'Cycling', swimming: 'Swimming', rowing: 'Rowing',
    jump_rope: 'Jump Rope', elliptical: 'Elliptical',
  };
  return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Session Grade ──────────────────────────────────────────────────────────

function calculateSessionGrade(
  avgRPE: number,
  exerciseCount: number,
  totalSets: number,
  prCount: number,
  duration: number,
): SessionGrade {
  let score = 0;

  // Volume completeness (did you do a real session?)
  if (totalSets >= 15) score += 3;
  else if (totalSets >= 10) score += 2;
  else if (totalSets >= 5) score += 1;

  // RPE sweet spot (7-9 is ideal for most training)
  if (avgRPE >= 7 && avgRPE <= 9) score += 2;
  else if (avgRPE >= 6 && avgRPE <= 9.5) score += 1;

  // Exercise variety
  if (exerciseCount >= 4) score += 1;

  // PR bonus
  if (prCount >= 2) score += 3;
  else if (prCount === 1) score += 2;

  // Duration (25-90min is reasonable)
  if (duration >= 25 && duration <= 90) score += 1;

  if (score >= 9) return 'S';
  if (score >= 6) return 'A';
  if (score >= 3) return 'B';
  return 'C';
}

function buildVerdict(grade: SessionGrade, prExercises: string[], avgRPE: number, totalSets: number): string {
  if (grade === 'S') {
    if (prExercises.length > 0) return `Elite session — ${prExercises.length} PR${prExercises.length > 1 ? 's' : ''} and solid execution across the board.`;
    return 'Everything clicked today. This is what peak training looks like.';
  }
  if (grade === 'A') {
    if (prExercises.length > 0) return `Strong session with a ${prExercises[0]} PR. Keep this energy.`;
    if (avgRPE >= 8) return 'You pushed hard and got the work done. Quality session.';
    return 'Solid execution. Consistent sessions like this build champions.';
  }
  if (grade === 'B') {
    if (avgRPE < 6.5) return 'Decent session but intensity was low. Push harder next time.';
    if (totalSets < 10) return 'Short session — sometimes less is more. Recovery matters.';
    return 'Good work showing up. Room to push harder next time.';
  }
  return 'You showed up — that counts. Some days are grinders.';
}

// ─── Context Banner ─────────────────────────────────────────────────────────

function buildContextBanner(opts: {
  todayType: TodayType;
  sessionLabel: string | null;
  isDeload: boolean;
  fightCampTag: string | null;
  readinessScore: number;
  mesocycle: Mesocycle | null;
  nextWorkoutInfo: { weekNumber: number; dayNumber: number; isDeload: boolean } | null;
  yesterdayRPE: number | null;
}): string | null {
  const { todayType, sessionLabel, isDeload, fightCampTag, readinessScore, mesocycle, nextWorkoutInfo, yesterdayRPE } = opts;

  // Fight camp takes priority
  if (fightCampTag) return fightCampTag;

  // Deload context
  if (isDeload) return 'Deload week · 60-70% loads · Movement quality over intensity';

  // Block position
  if (mesocycle && nextWorkoutInfo) {
    const totalWeeks = mesocycle.weeks.length;
    const weekNum = nextWorkoutInfo.weekNumber;
    const dayNum = nextWorkoutInfo.dayNumber;

    if (todayType === 'lift' || todayType === 'both') {
      // Identify peak/ramp weeks
      const isLateBlock = weekNum >= totalWeeks - 1 && !isDeload;
      const label = sessionLabel || `W${weekNum}/D${dayNum}`;
      if (isLateBlock) return `${label} · ${mesocycle.name} · Final push week`;
      return `${label} · Week ${weekNum} of ${totalWeeks}`;
    }
  }

  // Rest/recovery context
  if (todayType === 'recovery' && yesterdayRPE && yesterdayRPE >= 8.5) {
    return `Recovery day · Yesterday's RPE ${yesterdayRPE} — you earned this`;
  }
  if (todayType === 'rest') {
    if (readinessScore < 40) return 'Scheduled rest · Recovery score is low — prioritize sleep';
    return 'Scheduled rest · Let adaptation happen';
  }

  // Combat day
  if (todayType === 'combat') {
    if (readinessScore >= 67) return `Mat day · Recovery ${readinessScore}% — go hard`;
    if (readinessScore < 40) return `Mat day · Low recovery — dial back intensity`;
    return 'Mat day';
  }

  return null;
}

function getYesterdayRPE(workoutLogs: WorkoutLog[]): number | null {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();
  const yesterdayLogs = workoutLogs.filter(l => new Date(l.date).toDateString() === yesterdayStr);
  if (yesterdayLogs.length === 0) return null;
  const rpes = yesterdayLogs.filter(l => l.overallRPE > 0).map(l => l.overallRPE);
  return rpes.length > 0 ? +(rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1) : null;
}

// ─── Forward Look ───────────────────────────────────────────────────────────

function buildForwardLook(opts: {
  todayType: TodayType;
  nextSession: WorkoutSession | null;
  nextLiftDayLabel: string | null;
  nextCombatDayLabel: string | null;
}): string | null {
  const { todayType, nextSession, nextLiftDayLabel, nextCombatDayLabel } = opts;

  if (todayType === 'recovery' || todayType === 'rest') {
    const parts: string[] = [];
    if (nextSession && nextLiftDayLabel) parts.push(`${nextSession.name} ${nextLiftDayLabel}`);
    if (nextCombatDayLabel) parts.push(`Mats ${nextCombatDayLabel}`);
    return parts.length > 0 ? `Next: ${parts.join(' · ')}` : null;
  }

  if (todayType === 'lift' || todayType === 'both') {
    // After this session, what's next?
    if (nextCombatDayLabel) return `After this: Mats ${nextCombatDayLabel}`;
    return null; // Will show after completing
  }

  if (todayType === 'combat') {
    // Next lift is shown by the standalone preview card — no need to duplicate here
    return null;
  }

  return null;
}

// ─── Progressive Overload Teaser ────────────────────────────────────────────

function buildOverloadTeaser(nextSession: WorkoutSession, workoutLogs: WorkoutLog[]): string | null {
  // Find the first compound exercise in the session and compare to last performance
  const compoundKeywords = ['squat', 'bench', 'deadlift', 'press', 'row', 'pull'];

  for (const ex of nextSession.exercises) {
    const name = ex.exercise.name.toLowerCase();
    const isCompound = compoundKeywords.some(k => name.includes(k));
    if (!isCompound) continue;

    // Find most recent log of this exercise
    for (let i = workoutLogs.length - 1; i >= 0; i--) {
      const log = workoutLogs[i];
      const matchedEx = log.exercises.find(e => e.exerciseId === ex.exerciseId);
      if (matchedEx && matchedEx.sets && matchedEx.sets.length > 0) {
        const lastBestSet = matchedEx.sets.reduce((best, set) =>
          (set.weight || 0) > (best.weight || 0) ? set : best
        , matchedEx.sets[0]);

        if (lastBestSet.weight && lastBestSet.weight > 0) {
          const targetWeight = ex.prescription.percentageOf1RM
            ? Math.round(lastBestSet.weight * 1.025) // ~2.5% increase
            : lastBestSet.weight;

          if (targetWeight > lastBestSet.weight) {
            return `↑ ${ex.exercise.name}: last ${lastBestSet.weight}×${lastBestSet.reps || '?'} → target ${targetWeight}`;
          }
          return `${ex.exercise.name}: match ${lastBestSet.weight}×${lastBestSet.reps || '?'} or beat it`;
        }
      }
    }
  }

  return null;
}
