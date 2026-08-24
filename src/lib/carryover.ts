/**
 * Carryover — what your dropped lifts did for the ones you kept.
 *
 * Every strength stat in the app is per-exercise, which means it cannot tell
 * the difference between two very different stories:
 *
 *   "You stopped trap bar deadlifts. Your numbers there are frozen."
 *   "You stopped trap bar deadlifts, and conventional went up 50 kg since."
 *
 * The first reads as a plateau — `detectPlateaus` will happily flag a dormant
 * lift as stalled. The second is the truth, and it is the more useful thing to
 * know: the work transferred, you did not lose it.
 *
 * Two lifts are treated as related when they share a movement pattern AND at
 * least one primary muscle. That is deliberately conservative — it links
 * trap bar to conventional deadlift (both hinge, both glutes/back) without
 * claiming a bench press carries over to a squat because both are "compound".
 *
 * All comparisons run on estimated 1RM, normalized to kilograms, using the
 * RPE-aware e1RM from the load model. Logs written before weight units were
 * recorded fall back to the athlete's current setting.
 */

import type { WorkoutLog, Exercise, WeightUnit, MuscleGroup } from './types';
import { estimateE1RM } from './load-model';
import { toKg, fromKg, DEFAULT_WEIGHT_UNIT } from './units';

// ── Tunables ────────────────────────────────────────────────────────────────

/** No sessions in this many days and a lift counts as dropped. */
const DORMANT_AFTER_DAYS = 42;
/** Below this many prior sessions there isn't a trend worth talking about. */
const MIN_SESSIONS_FOR_HISTORY = 3;
/** Ignore noise — only report a related lift that moved by at least this much. */
const MIN_MEANINGFUL_GAIN_KG = 2.5;

// ── Types ───────────────────────────────────────────────────────────────────

export interface ExerciseE1RMPoint {
  date: Date;
  e1RMKg: number;
  /** Heaviest weight actually loaded that session, in kg. */
  bestWeightKg: number;
}

export interface CarryoverInsight {
  dormantExerciseId: string;
  dormantExerciseName: string;
  daysDormant: number;
  /** Best e1RM on the dormant lift, in the athlete's display unit. */
  dormantLastBest: number;
  relatedExerciseId: string;
  relatedExerciseName: string;
  /**
   * Change in the heaviest weight actually loaded, since the dormant lift was
   * dropped. This is the headline number because it's the one an athlete
   * recognises — it's the change they'd notice on the bar.
   */
  relatedGain: number;
  relatedCurrent: number;
  /** Same comparison on estimated 1RM — fairer across differing rep schemes. */
  relatedGainE1RM: number;
  relatedCurrentE1RM: number;
  sharedMuscles: MuscleGroup[];
  movementPattern: string;
  unit: WeightUnit;
  /** 'strong' when both pattern and 2+ muscles line up. */
  confidence: 'strong' | 'moderate';
  headline: string;
  detail: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Unit a log's weights are in. Older logs predate the field; the athlete's
 * current setting is the best available assumption, and is right for everyone
 * who never switched.
 */
export function logWeightUnit(log: WorkoutLog, fallback: WeightUnit = DEFAULT_WEIGHT_UNIT): WeightUnit {
  return log.weightUnit ?? fallback;
}

/**
 * Best estimated 1RM per session for one exercise, in kg, oldest first.
 * Sets with no usable weight/reps are skipped rather than counted as zero.
 */
export function buildE1RMTimeline(
  exerciseId: string,
  logs: WorkoutLog[],
  fallbackUnit: WeightUnit = DEFAULT_WEIGHT_UNIT
): ExerciseE1RMPoint[] {
  const points: ExerciseE1RMPoint[] = [];

  for (const log of logs) {
    const entry = log.exercises?.find(e => e.exerciseId === exerciseId);
    if (!entry?.sets?.length) continue;

    const unit = logWeightUnit(log, fallbackUnit);
    let best = 0;
    let bestWeight = 0;
    for (const set of entry.sets) {
      if (!set.completed) continue;
      const weightKg = toKg(set.weight, unit);
      const e1rm = estimateE1RM(weightKg, set.reps, set.rpe);
      if (e1rm > best) best = e1rm;
      if (weightKg > bestWeight) bestWeight = weightKg;
    }
    if (best > 0) points.push({ date: new Date(log.date), e1RMKg: best, bestWeightKg: bestWeight });
  }

  return points.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Same movement pattern AND at least one shared primary muscle. */
export function areRelated(a: Exercise, b: Exercise): boolean {
  if (a.id === b.id) return false;
  if (a.movementPattern !== b.movementPattern) return false;
  return sharedPrimaryMuscles(a, b).length > 0;
}

export function sharedPrimaryMuscles(a: Exercise, b: Exercise): MuscleGroup[] {
  const bSet = new Set(b.primaryMuscles);
  return a.primaryMuscles.filter(m => bSet.has(m));
}

// ── Main entry point ────────────────────────────────────────────────────────

/**
 * Find dropped lifts whose related lifts kept climbing.
 *
 * Returns strongest carryover first. Empty when nothing has been dropped, or
 * when the related lifts didn't actually move — silence is the correct answer
 * there, not a manufactured insight.
 */
export function detectCarryover(
  logs: WorkoutLog[],
  exerciseById: (id: string) => Exercise | undefined,
  displayUnit: WeightUnit = DEFAULT_WEIGHT_UNIT,
  now: Date = new Date()
): CarryoverInsight[] {
  if (!logs?.length) return [];

  // Every exercise that appears anywhere in the history.
  const exerciseIds = new Set<string>();
  for (const log of logs) for (const e of log.exercises ?? []) exerciseIds.add(e.exerciseId);

  const timelines = new Map<string, ExerciseE1RMPoint[]>();
  for (const id of Array.from(exerciseIds)) {
    const t = buildE1RMTimeline(id, logs, displayUnit);
    if (t.length > 0) timelines.set(id, t);
  }

  const insights: CarryoverInsight[] = [];

  for (const [dormantId, dormantTimeline] of Array.from(timelines.entries())) {
    if (dormantTimeline.length < MIN_SESSIONS_FOR_HISTORY) continue;

    const lastSession = dormantTimeline[dormantTimeline.length - 1].date;
    const daysDormant = Math.floor((now.getTime() - lastSession.getTime()) / 86400000);
    if (daysDormant < DORMANT_AFTER_DAYS) continue;

    const dormantEx = exerciseById(dormantId);
    if (!dormantEx) continue;
    const dormantBestKg = Math.max(...dormantTimeline.map(p => p.e1RMKg));

    for (const [relatedId, relatedTimeline] of Array.from(timelines.entries())) {
      const relatedEx = exerciseById(relatedId);
      if (!relatedEx || !areRelated(dormantEx, relatedEx)) continue;

      // Where the related lift stood when this one was dropped, vs now.
      const atDrop = relatedTimeline.filter(p => p.date <= lastSession);
      const since = relatedTimeline.filter(p => p.date > lastSession);
      if (atDrop.length === 0 || since.length === 0) continue;

      // Still training it? Otherwise both were dropped and there's no carryover.
      const relatedLast = since[since.length - 1].date;
      const relatedDaysIdle = Math.floor((now.getTime() - relatedLast.getTime()) / 86400000);
      if (relatedDaysIdle >= DORMANT_AFTER_DAYS) continue;

      // Headline on working weight (what you'd notice on the bar); e1RM kept
      // alongside because it's the fairer comparison across rep schemes.
      const baselineWeightKg = Math.max(...atDrop.map(p => p.bestWeightKg));
      const currentWeightKg = Math.max(...since.map(p => p.bestWeightKg));
      const gainWeightKg = currentWeightKg - baselineWeightKg;

      const baselineKg = Math.max(...atDrop.map(p => p.e1RMKg));
      const currentKg = Math.max(...since.map(p => p.e1RMKg));
      const gainKg = currentKg - baselineKg;

      // Require both to agree that something real happened, so a single heavy
      // low-rep single can't manufacture a carryover story on its own.
      if (gainWeightKg < MIN_MEANINGFUL_GAIN_KG || gainKg < MIN_MEANINGFUL_GAIN_KG) continue;

      const shared = sharedPrimaryMuscles(dormantEx, relatedEx);
      const round = (kg: number) => Math.round(fromKg(kg, displayUnit) * 10) / 10;
      const gain = round(gainWeightKg);
      const current = round(currentWeightKg);

      insights.push({
        dormantExerciseId: dormantId,
        dormantExerciseName: dormantEx.name,
        daysDormant,
        dormantLastBest: round(dormantBestKg),
        relatedExerciseId: relatedId,
        relatedExerciseName: relatedEx.name,
        relatedGain: gain,
        relatedCurrent: current,
        relatedGainE1RM: round(gainKg),
        relatedCurrentE1RM: round(currentKg),
        sharedMuscles: shared,
        movementPattern: dormantEx.movementPattern,
        unit: displayUnit,
        confidence: shared.length >= 2 ? 'strong' : 'moderate',
        headline: `You dropped ${dormantEx.name}, but ${relatedEx.name} is up ${gain} ${displayUnit}`,
        detail:
          `No ${dormantEx.name} in ${monthsLabel(daysDormant)}. Over the same stretch ` +
          `${relatedEx.name} went from ${round(baselineWeightKg)} to ${current} ${displayUnit} ` +
          `(estimated 1RM ${round(baselineKg)} → ${round(currentKg)}). ` +
          `Both are ${dormantEx.movementPattern} patterns sharing ${listMuscles(shared)} — ` +
          `that strength didn't go anywhere, it moved.`,
      });
    }
  }

  // Biggest carryover first, strong relationships ahead of moderate ones.
  return insights.sort((a, b) => {
    if (a.confidence !== b.confidence) return a.confidence === 'strong' ? -1 : 1;
    return b.relatedGain - a.relatedGain;
  });
}

function monthsLabel(days: number): string {
  const months = Math.round(days / 30);
  if (months < 2) return `${days} days`;
  return `${months} months`;
}

function listMuscles(muscles: MuscleGroup[]): string {
  const names = muscles.map(m => String(m).replace(/_/g, ' '));
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
