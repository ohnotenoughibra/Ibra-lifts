/**
 * AI Corner Coach — Real-Time In-Workout Coaching Voice
 *
 * Like a corner coach in a fight, this engine watches your live performance
 * and calls out actionable cues between sets. It reacts to:
 *   - RPE spikes (you're grinding harder than expected)
 *   - Weight vs history (heavier or lighter than last time)
 *   - Rep drops (fatigue accumulation across sets)
 *   - Readiness context (throttled day → different tone)
 *   - Exercise cues (technique reminders from exercise data)
 *   - Session pacing (too fast, too slow, time alerts)
 *
 * All rule-based, no LLM calls. Designed to feel like a coach in your ear.
 */

import type {
  SetLog,
  ExerciseLog,
  ExercisePrescription,
  WorkoutLog,
  PreWorkoutCheckIn,
  Exercise,
} from './types';
import type { ThrottleLevel } from './readiness-throttle';

// ── Types ────────────────────────────────────────────────────────────────

export type CoachTone = 'hype' | 'calm' | 'warning' | 'tactical' | 'celebrate';

export interface CoachMessage {
  id: string;
  text: string;
  tone: CoachTone;
  priority: number;       // 0 = highest, 10 = lowest
  icon: string;           // lucide icon name
  dismissAfterMs: number; // auto-dismiss time
  trigger: string;        // what caused this message (for dedup)
}

export interface CoachContext {
  // Current exercise state
  currentExercise: ExercisePrescription;
  currentExerciseLog: ExerciseLog;
  currentSetIndex: number;
  justCompletedSet: SetLog | null;

  // Session state
  allExerciseLogs: ExerciseLog[];
  exerciseIndex: number;
  totalExercises: number;
  sessionStartTime: Date;
  completedSets: number;
  totalSets: number;

  // Historical data
  previousLogs: WorkoutLog[];

  // Readiness context
  throttleLevel: ThrottleLevel;
  preCheckIn: PreWorkoutCheckIn | null;

  // What we've already said (to avoid repeating)
  recentMessageTriggers: Set<string>;
}

// ── Main Entry Point ─────────────────────────────────────────────────────

/**
 * Generate coaching messages based on current workout context.
 * Called after each set completion and during rest periods.
 * Returns 0-2 messages (never spam the athlete).
 */
export function getCoachMessages(ctx: CoachContext): CoachMessage[] {
  const candidates: CoachMessage[] = [];

  // Run all analyzers
  candidates.push(...analyzeRPE(ctx));
  candidates.push(...analyzeRepDrop(ctx));
  candidates.push(...analyzeWeightVsHistory(ctx));
  candidates.push(...analyzeSessionPacing(ctx));
  candidates.push(...analyzeThrottleContext(ctx));
  candidates.push(...analyzeExerciseTransition(ctx));
  candidates.push(...analyzeMilestones(ctx));
  candidates.push(...analyzeFormCues(ctx));

  // Filter already-seen triggers
  const fresh = candidates.filter(m => !ctx.recentMessageTriggers.has(m.trigger));

  // Sort by priority (lower = more important)
  fresh.sort((a, b) => a.priority - b.priority);

  // Return top 1-2 messages max
  return fresh.slice(0, 2);
}

// ── Analyzers ────────────────────────────────────────────────────────────

function makeId(): string {
  return Math.random().toString(36).slice(2, 9);
}

/**
 * React to RPE relative to target.
 */
function analyzeRPE(ctx: CoachContext): CoachMessage[] {
  const { justCompletedSet, currentExercise } = ctx;
  if (!justCompletedSet) return [];

  const targetRpe = currentExercise.prescription.rpe;
  const actualRpe = justCompletedSet.rpe;
  const diff = actualRpe - targetRpe;

  // RPE much higher than target (grinding)
  if (diff >= 2) {
    return [{
      id: makeId(),
      text: `RPE ${actualRpe} on a target-${targetRpe} set. Drop 5-10% or take an extra 30s rest. No ego reps.`,
      tone: 'warning',
      priority: 1,
      icon: 'AlertTriangle',
      dismissAfterMs: 15000,
      trigger: `rpe-high-${ctx.currentSetIndex}`,
    }];
  }

  // RPE much lower than target (too light)
  if (diff <= -2 && actualRpe <= 5 && ctx.currentSetIndex >= 1) {
    return [{
      id: makeId(),
      text: `RPE ${actualRpe} — you've got more in the tank. Bump weight ${ctx.currentExercise.exercise.equipmentTypes.includes('barbell') ? '5-10 lbs' : '2.5-5 lbs'} next set.`,
      tone: 'hype',
      priority: 4,
      icon: 'TrendingUp',
      dismissAfterMs: 12000,
      trigger: `rpe-low-${ctx.currentSetIndex}`,
    }];
  }

  // Perfect execution
  if (actualRpe === targetRpe && ctx.currentSetIndex === ctx.currentExerciseLog.sets.length - 1) {
    return [{
      id: makeId(),
      text: 'Nailed the target RPE every set. That\'s how you build.',
      tone: 'celebrate',
      priority: 7,
      icon: 'Check',
      dismissAfterMs: 12000,
      trigger: `rpe-perfect-${ctx.exerciseIndex}`,
    }];
  }

  return [];
}

/**
 * Detect rep drop-off across sets (fatigue signal).
 */
function analyzeRepDrop(ctx: CoachContext): CoachMessage[] {
  const completedSets = ctx.currentExerciseLog.sets.filter(s => s.completed);
  if (completedSets.length < 3) return [];

  const firstSetReps = completedSets[0].reps;
  const lastSetReps = completedSets[completedSets.length - 1].reps;
  const dropPercent = ((firstSetReps - lastSetReps) / firstSetReps) * 100;

  // Significant rep drop (>30%) across sets
  if (dropPercent > 30 && firstSetReps > 3) {
    return [{
      id: makeId(),
      text: `Reps dropped ${Math.round(dropPercent)}% from set 1 to set ${completedSets.length}. Weight might be too high — consider dropping 5% next session.`,
      tone: 'tactical',
      priority: 2,
      icon: 'ArrowDown',
      dismissAfterMs: 15000,
      trigger: `rep-drop-${ctx.exerciseIndex}`,
    }];
  }

  // No drop at all across 3+ sets → machine mode
  if (dropPercent <= 0 && completedSets.length >= 3 && firstSetReps >= 6) {
    return [{
      id: makeId(),
      text: `${firstSetReps} reps on every set — clean consistency. This weight is dialed in.`,
      tone: 'calm',
      priority: 8,
      icon: 'Target',
      dismissAfterMs: 12000,
      trigger: `rep-consistent-${ctx.exerciseIndex}`,
    }];
  }

  return [];
}

/**
 * Compare current weight/reps to the last time you did this exercise.
 */
function analyzeWeightVsHistory(ctx: CoachContext): CoachMessage[] {
  const { currentExercise, justCompletedSet, previousLogs } = ctx;
  if (!justCompletedSet || ctx.currentSetIndex !== 0) return []; // only on first set

  // Find last session with this exercise
  const lastLog = findLastExerciseLog(currentExercise.exerciseId, previousLogs);
  if (!lastLog || lastLog.sets.length === 0) return [];

  const lastWeight = Math.max(...lastLog.sets.filter(s => s.completed).map(s => s.weight));
  const currentWeight = justCompletedSet.weight;
  const weightDiff = currentWeight - lastWeight;

  if (weightDiff > 0) {
    return [{
      id: makeId(),
      text: `+${weightDiff} ${currentWeight > 100 ? 'lbs' : 'lbs'} vs last time. Stronger. Keep this energy.`,
      tone: 'hype',
      priority: 5,
      icon: 'TrendingUp',
      dismissAfterMs: 12000,
      trigger: `weight-up-${ctx.exerciseIndex}`,
    }];
  }

  if (weightDiff < 0 && ctx.throttleLevel !== 'yellow' && ctx.throttleLevel !== 'orange' && ctx.throttleLevel !== 'red') {
    return [{
      id: makeId(),
      text: `${Math.abs(weightDiff)} less than last session. Bad day or strategic deload? Either way — own the reps.`,
      tone: 'calm',
      priority: 6,
      icon: 'Info',
      dismissAfterMs: 12000,
      trigger: `weight-down-${ctx.exerciseIndex}`,
    }];
  }

  return [];
}

/**
 * Monitor session pacing (time between sets, total duration).
 */
function analyzeSessionPacing(ctx: CoachContext): CoachMessage[] {
  const elapsed = (Date.now() - ctx.sessionStartTime.getTime()) / 60000; // minutes
  const messages: CoachMessage[] = [];

  // Session running long (> 75 min)
  if (elapsed > 75 && ctx.completedSets < ctx.totalSets && !ctx.recentMessageTriggers.has('pacing-long')) {
    messages.push({
      id: makeId(),
      text: `${Math.round(elapsed)} min in — tighten up rest periods or cut your last isolation. Quality > volume.`,
      tone: 'tactical',
      priority: 3,
      icon: 'Clock',
      dismissAfterMs: 15000,
      trigger: 'pacing-long',
    });
  }

  // Halfway milestone
  if (ctx.completedSets === Math.floor(ctx.totalSets / 2) && ctx.totalSets >= 10) {
    messages.push({
      id: makeId(),
      text: `Halfway — ${ctx.completedSets}/${ctx.totalSets} sets in the bag. Second half is where it counts.`,
      tone: 'hype',
      priority: 8,
      icon: 'Zap',
      dismissAfterMs: 12000,
      trigger: 'halfway',
    });
  }

  return messages;
}

/**
 * Context-aware messages based on throttle level.
 */
function analyzeThrottleContext(ctx: CoachContext): CoachMessage[] {
  // Only show throttle reminders on the first set of the session
  if (ctx.completedSets !== 1) return [];

  switch (ctx.throttleLevel) {
    case 'peak':
      return [{
        id: makeId(),
        text: 'Recovery is peak — if you\'ve been wanting to test a heavy single, today\'s the day.',
        tone: 'hype',
        priority: 5,
        icon: 'Flame',
        dismissAfterMs: 12000,
        trigger: 'throttle-peak',
      }];
    case 'yellow':
      return [{
        id: makeId(),
        text: 'Session is throttled — focus on execution, not numbers. RPE cap is your friend today.',
        tone: 'calm',
        priority: 3,
        icon: 'Shield',
        dismissAfterMs: 12000,
        trigger: 'throttle-yellow',
      }];
    case 'orange':
      return [{
        id: makeId(),
        text: 'Low power mode — compounds only, stay light. This session is about movement quality.',
        tone: 'warning',
        priority: 2,
        icon: 'Battery',
        dismissAfterMs: 14000,
        trigger: 'throttle-orange',
      }];
    case 'red':
      return [{
        id: makeId(),
        text: 'Recovery mode — keep it moving, keep it light. You showed up, that\'s enough today.',
        tone: 'calm',
        priority: 1,
        icon: 'Heart',
        dismissAfterMs: 15000,
        trigger: 'throttle-red',
      }];
    default:
      return [];
  }
}

/**
 * Cues when transitioning to a new exercise.
 */
function analyzeExerciseTransition(ctx: CoachContext): CoachMessage[] {
  // Only fire on first set of a new exercise (not the first exercise)
  if (ctx.currentSetIndex !== 0 || ctx.exerciseIndex === 0) return [];
  if (ctx.justCompletedSet) return []; // we want this during rest before first set

  const exercise = ctx.currentExercise.exercise;
  const targetSets = ctx.currentExercise.sets;
  const targetReps = ctx.currentExercise.prescription.targetReps;
  const targetRpe = ctx.currentExercise.prescription.rpe;

  return [{
    id: makeId(),
    text: `Up next: ${exercise.name} — ${targetSets}×${targetReps} @ RPE ${targetRpe}. ${getMovementCue(exercise)}`,
    tone: 'tactical',
    priority: 6,
    icon: 'Dumbbell',
    dismissAfterMs: 15000,
    trigger: `transition-${ctx.exerciseIndex}`,
  }];
}

/**
 * Celebrate milestones (PR, volume records, etc.).
 */
function analyzeMilestones(ctx: CoachContext): CoachMessage[] {
  const { justCompletedSet, currentExercise, previousLogs } = ctx;
  if (!justCompletedSet) return [];

  // Check for weight PR
  const lastLog = findLastExerciseLog(currentExercise.exerciseId, previousLogs);
  if (lastLog) {
    const allTimeBest = Math.max(...lastLog.sets.map(s => s.weight), 0);
    if (justCompletedSet.weight > allTimeBest && justCompletedSet.weight > 0) {
      return [{
        id: makeId(),
        text: `New weight PR on ${currentExercise.exercise.name}! ${justCompletedSet.weight} — that\'s never been done before.`,
        tone: 'celebrate',
        priority: 0,
        icon: 'Trophy',
        dismissAfterMs: 12000,
        trigger: `pr-${ctx.exerciseIndex}-${justCompletedSet.weight}`,
      }];
    }
  }

  // Session almost done
  const remainingSets = ctx.totalSets - ctx.completedSets;
  if (remainingSets === 1) {
    return [{
      id: makeId(),
      text: 'Last set of the session. Leave nothing in the tank.',
      tone: 'hype',
      priority: 4,
      icon: 'Flame',
      dismissAfterMs: 12000,
      trigger: 'last-set-session',
    }];
  }

  return [];
}

/**
 * Provide exercise-specific form cues.
 */
function analyzeFormCues(ctx: CoachContext): CoachMessage[] {
  // Show form cue on set 2 of each exercise (set 1 they're finding the groove)
  if (ctx.currentSetIndex !== 1) return [];

  const cues = ctx.currentExercise.exercise.cues;
  if (!cues || cues.length === 0) return [];

  // Pick a random cue
  const cue = cues[Math.floor(Math.random() * cues.length)];

  return [{
    id: makeId(),
    text: cue,
    tone: 'tactical',
    priority: 9,
    icon: 'Lightbulb',
    dismissAfterMs: 14000,
    trigger: `cue-${ctx.exerciseIndex}`,
  }];
}

// ── Helpers ──────────────────────────────────────────────────────────────

function findLastExerciseLog(exerciseId: string, logs: WorkoutLog[]): ExerciseLog | null {
  for (let i = logs.length - 1; i >= 0; i--) {
    const match = logs[i].exercises.find(e => e.exerciseId === exerciseId);
    if (match) return match;
  }
  return null;
}

function getMovementCue(exercise: Exercise): string {
  const cueMap: Record<string, string> = {
    push: 'Drive through the chest.',
    pull: 'Squeeze the back at the top.',
    squat: 'Brace hard, knees out.',
    hinge: 'Load the hamstrings, flat back.',
    carry: 'Shoulders packed, core tight.',
    rotation: 'Control the rotation — abs drive the movement.',
    explosive: 'Maximum intent on every rep.',
  };
  return cueMap[exercise.movementPattern] || 'Focus on controlled reps.';
}

// ── Post-Session Summary ─────────────────────────────────────────────────

export interface SessionVerdict {
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  headline: string;
  detail: string;
  highlights: string[];
}

/**
 * Generate a corner-coach style post-session verdict.
 */
export function getSessionVerdict(
  exerciseLogs: ExerciseLog[],
  prescriptions: ExercisePrescription[],
  throttleLevel: ThrottleLevel,
  durationMinutes: number,
): SessionVerdict {
  const highlights: string[] = [];

  // Calculate adherence
  const totalPrescribedSets = prescriptions.reduce((s, p) => s + p.sets, 0);
  const totalCompletedSets = exerciseLogs.reduce((s, e) => s + e.sets.filter(ss => ss.completed).length, 0);
  const setAdherence = totalPrescribedSets > 0 ? totalCompletedSets / totalPrescribedSets : 0;

  // Average RPE
  const allSets = exerciseLogs.flatMap(e => e.sets.filter(s => s.completed));
  const avgRpe = allSets.length > 0
    ? allSets.reduce((s, set) => s + set.rpe, 0) / allSets.length
    : 0;

  // PRs
  const prCount = exerciseLogs.filter(e => e.personalRecord).length;
  if (prCount > 0) highlights.push(`${prCount} PR${prCount > 1 ? 's' : ''} hit`);

  // Total volume
  const totalVolume = allSets.reduce((s, set) => s + set.weight * set.reps, 0);
  if (totalVolume > 0) highlights.push(`${Math.round(totalVolume).toLocaleString()} total volume`);

  // Duration
  highlights.push(`${durationMinutes} min`);

  // Grade
  let score = 0;
  score += setAdherence * 40;                              // 40 pts for completing prescribed sets
  score += Math.min(10, prCount * 5);                      // up to 10 pts for PRs
  score += avgRpe >= 6 && avgRpe <= 9 ? 20 : avgRpe >= 5 ? 10 : 0;  // 20 pts for appropriate RPE
  score += durationMinutes >= 30 && durationMinutes <= 90 ? 15 : 5;   // 15 pts for reasonable duration
  score += totalCompletedSets >= 10 ? 15 : totalCompletedSets >= 5 ? 10 : 5;  // 15 pts for volume

  // Adjust for throttle — be more lenient on throttled days
  if (throttleLevel === 'orange' || throttleLevel === 'red') score += 10;
  if (throttleLevel === 'yellow') score += 5;

  const grade: SessionVerdict['grade'] =
    score >= 90 ? 'S' : score >= 75 ? 'A' : score >= 55 ? 'B' : score >= 35 ? 'C' : 'D';

  const headlines: Record<SessionVerdict['grade'], string> = {
    S: 'Elite session',
    A: 'Strong work',
    B: 'Solid session',
    C: 'Got it done',
    D: 'Showed up',
  };

  const details: Record<SessionVerdict['grade'], string> = {
    S: `${totalCompletedSets} sets, ${prCount > 0 ? `${prCount} PR${prCount > 1 ? 's' : ''}, ` : ''}avg RPE ${avgRpe.toFixed(1)} — textbook execution.`,
    A: `Hit ${Math.round(setAdherence * 100)}% of prescribed volume at RPE ${avgRpe.toFixed(1)}. Keep stacking sessions like this.`,
    B: `${totalCompletedSets} sets completed. Not your best, not your worst — consistent progress beats perfection.`,
    C: `Tough day but you showed up. ${throttleLevel !== 'green' && throttleLevel !== 'peak' ? 'Recovery was working against you.' : 'Sometimes the gym wins.'} Tomorrow\'s a new day.`,
    D: `Low output today — ${throttleLevel === 'red' || throttleLevel === 'orange' ? 'your body needed this easy session' : 'consider what\'s blocking you outside the gym'}.`,
  };

  return {
    grade,
    headline: headlines[grade],
    detail: details[grade],
    highlights,
  };
}
