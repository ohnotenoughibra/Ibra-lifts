/**
 * live-session — small, pure helpers behind the live-workout screen.
 *
 * Everything here is derived from data the app already stores (the active
 * session + workout history) so it can be unit-tested without React:
 *   - quickAdjustOptions  ± buttons that land on loads the implement can hit
 *   - personalBest        best e1RM / hold for an exercise, unit-aware
 *   - repsToBeat          "100 × 6 would be a PR"
 *   - lastTimeSets        per-set "last time" row for the current exercise
 *   - sessionEta          minutes left + finish clock, over-budget flag
 *   - warmupRamp          warm-up ladder for the first heavy lift
 *   - sessionDeltas       per-lift today vs last time for the finish sheet
 */

import type { ExerciseLog, SetLog, WeightUnit, WorkoutLog } from './types';
import { convertWeight } from './units';
import { estimate1RM } from './weight-estimator';
import { nextLoadStep, roundForImplement, type LoadProfile } from './next-load';

const e1rm = (w: number, r: number) => Math.round(estimate1RM(w, r));

/** A logged set that actually happened (skipped / empty sets never count). */
export function isRealSet(s: SetLog): boolean {
  return !!s.completed && !s.skipped && (s.reps > 0 || (s.duration ?? 0) > 0);
}

function logUnit(log: WorkoutLog, fallback: WeightUnit): WeightUnit {
  return log.weightUnit ?? fallback;
}

// ── ± quick adjust ─────────────────────────────────────────────────────────

export interface QuickAdjust {
  label: string;
  /** Absolute weight to set (already rounded for the implement). */
  value: number;
}

/**
 * Buttons under the weight field. Plates come in pairs, so a barbell moves in
 * 2.5 kg / 5 lb; dumbbells and kettlebells move by a SIZE on the rack (12 → 14
 * → 16 kg, 16 → 20 → 24 kg bells) rather than an arbitrary +2.5 that no
 * dumbbell exists for. Bands and pure bodyweight get none.
 */
export function quickAdjustOptions(w: number, p: LoadProfile, unit: WeightUnit): QuickAdjust[] {
  const kg = unit === 'kg';
  if (p.implement === 'band') return [];
  if (p.implement === 'dumbbell' || p.implement === 'kettlebell' || p.implement === 'plate') {
    const out: QuickAdjust[] = [];
    const down = w > 0 ? nextLoadStep(w, p, unit, -1) : 0;
    if (w > 0 && down < w && down > 0) out.push({ label: `${down}`, value: down });
    const up1 = nextLoadStep(w, p, unit, 1);
    const up2 = nextLoadStep(up1, p, unit, 1);
    if (up1 > w) out.push({ label: `${up1}`, value: up1 });
    if (up2 > up1) out.push({ label: `${up2}`, value: up2 });
    return out;
  }
  const deltas = p.implement === 'barbell'
    ? (kg ? [-5, -2.5, 2.5, 5, 10] : [-10, -5, 5, 10, 20])
    : p.implement === 'bodyweight'
      ? (kg ? [2.5, 5, 10] : [5, 10, 20])
      : (kg ? [-5, -2.5, 2.5, 5] : [-10, -5, 5, 10]);
  return deltas
    .map(d => ({ d, v: Math.max(0, w + d) }))
    .filter(({ d, v }) => d > 0 || (w > 0 && v < w))
    .map(({ d, v }) => ({ label: `${d > 0 ? '+' : '−'}${Math.abs(d)}`, value: v }));
}

/** The main − / + buttons: one real step on this implement. */
export function stepWeight(w: number, p: LoadProfile, unit: WeightUnit, dir: 1 | -1): number {
  if (p.implement === 'dumbbell' || p.implement === 'kettlebell' || p.implement === 'plate') {
    if (dir === -1 && w <= 0) return 0;
    const next = nextLoadStep(w, p, unit, dir);
    return dir === -1 && next >= w ? 0 : next;
  }
  const inc = unit === 'kg' ? 2.5 : 5;
  return Math.max(0, Math.round((w + dir * inc) * 100) / 100);
}

// ── Personal bests ─────────────────────────────────────────────────────────

export interface PersonalBest {
  hasHistory: boolean;
  /** Best estimated 1RM (weights) or longest hold in seconds (time work). */
  best: number;
}

export function personalBest(
  exerciseId: string,
  logs: WorkoutLog[],
  unit: WeightUnit,
  kind: 'e1rm' | 'duration' = 'e1rm',
): PersonalBest {
  let best = 0;
  let hasHistory = false;
  for (const log of logs) {
    if (log._deleted) continue;
    for (const ex of log.exercises) {
      if (ex.exerciseId !== exerciseId) continue;
      for (const s of ex.sets) {
        if (!isRealSet(s)) continue;
        if (kind === 'duration') {
          if ((s.duration ?? 0) > 0) { hasHistory = true; best = Math.max(best, s.duration!); }
        } else if (s.weight > 0 && s.reps > 0) {
          hasHistory = true;
          const w = convertWeight(s.weight, logUnit(log, unit), unit);
          best = Math.max(best, e1rm(w, s.reps));
        }
      }
    }
  }
  return { hasHistory, best };
}

/**
 * Fewest reps at `weight` whose e1RM beats `best` (≤ 12 — beyond that the
 * estimate stops meaning anything). null when no rep count gets there.
 */
export function repsToBeat(weight: number, best: number): number | null {
  if (weight <= 0 || best <= 0) return null;
  for (let r = 1; r <= 12; r++) if (e1rm(weight, r) > best) return r;
  return null;
}

// ── Last time ──────────────────────────────────────────────────────────────

export interface LastTimeSet { weight: number; reps: number; rpe?: number; duration?: number }

/** Sets from the most recent session that included this exercise, in order. */
export function lastTimeSets(exerciseId: string, logs: WorkoutLog[], unit: WeightUnit): LastTimeSet[] {
  const sorted = logs.filter(l => !l._deleted).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  for (const log of sorted) {
    const ex = log.exercises.find(e => e.exerciseId === exerciseId);
    const sets = ex?.sets.filter(isRealSet) ?? [];
    if (sets.length === 0) continue;
    const from = logUnit(log, unit);
    return sets.map(s => ({
      weight: Math.round(convertWeight(s.weight, from, unit) * 100) / 100,
      reps: s.reps,
      ...(s.rpeSource !== 'prefill' && s.rpe ? { rpe: s.rpe } : {}),
      ...(s.duration ? { duration: s.duration } : {}),
    }));
  }
  return [];
}

// ── ETA ────────────────────────────────────────────────────────────────────

export interface EtaExercise {
  sets: number;
  restSeconds: number;
  /** Seconds per rep-set of work; time-based work passes its hold. */
  workSeconds?: number;
}

export interface Eta { minutesLeft: number; finishAt: Date; overBudget: boolean }

const DEFAULT_WORK_S = 40;

/**
 * Remaining time = every unfinished set's work + the rest that follows it
 * (no rest after the very last set). Over budget when the projected total
 * runs more than 10% past the session's estimate.
 */
export function sessionEta(
  exercises: EtaExercise[],
  logs: Pick<ExerciseLog, 'sets'>[],
  startTime: Date | string,
  budgetMinutes: number | undefined,
  now: Date = new Date(),
): Eta {
  let seconds = 0;
  let remainingSets = 0;
  exercises.forEach((ex, i) => {
    const done = (logs[i]?.sets ?? []).filter(s => s.completed || s.skipped).length;
    const left = Math.max(0, ex.sets - done);
    remainingSets += left;
    seconds += left * ((ex.workSeconds ?? DEFAULT_WORK_S) + ex.restSeconds);
  });
  if (remainingSets > 0) {
    for (let i = exercises.length - 1; i >= 0; i--) {
      const done = (logs[i]?.sets ?? []).filter(s => s.completed || s.skipped).length;
      if (exercises[i].sets - done > 0) { seconds -= exercises[i].restSeconds; break; }
    }
  }
  const minutesLeft = Math.max(0, Math.round(seconds / 60));
  const elapsedMin = (now.getTime() - new Date(startTime).getTime()) / 60000;
  return {
    minutesLeft,
    finishAt: new Date(now.getTime() + minutesLeft * 60000),
    overBudget: !!budgetMinutes && elapsedMin + minutesLeft > budgetMinutes * 1.1,
  };
}

// ── Warm-up ramp ───────────────────────────────────────────────────────────

export interface WarmupStep { weight: number; reps: number }

/**
 * Warm-up ladder to a working weight. Heavy work (≤ 6 reps) climbs higher and
 * finishes with a single; hypertrophy work needs only a couple of ramp sets.
 * Loads are rounded DOWN-ish to real implement loads and must be strictly
 * increasing and below the working weight. Empty for loads too light to ramp.
 */
export function warmupRamp(working: number, workingReps: number, p: LoadProfile, unit: WeightUnit): WarmupStep[] {
  if (working <= 0 || p.implement === 'band' || p.implement === 'bodyweight') return [];
  const kg = unit === 'kg';
  const bar = p.implement === 'barbell' ? (kg ? 20 : 45) : 0;
  const heavy = workingReps <= 6;
  const ladder: [number, number][] = heavy
    ? [[0.45, 5], [0.65, 3], [0.8, 2], [0.9, 1]]
    : [[0.5, 8], [0.7, 4]];
  const steps: WarmupStep[] = [];
  if (bar > 0 && working >= bar * 1.5) steps.push({ weight: bar, reps: heavy ? 8 : 10 });
  for (const [pct, reps] of ladder) {
    if (pct === 0.9 && working < (kg ? 80 : 175)) continue; // light top set — the 80% rung is enough
    const w = roundForImplement(working * pct, p, unit);
    const prev = steps.length ? steps[steps.length - 1].weight : 0;
    if (w > prev && w < working && w >= bar) steps.push({ weight: w, reps });
  }
  return steps;
}

// ── Finish summary ─────────────────────────────────────────────────────────

export interface LiftDelta {
  exerciseId: string;
  name: string;
  today: { weight: number; reps: number; e1rm: number } | null;
  last: { weight: number; reps: number; e1rm: number } | null;
  /** e1RM change vs last time, in the current unit (null without both). */
  change: number | null;
  pr: boolean;
}

function topSet(sets: { weight: number; reps: number }[]) {
  let top: { weight: number; reps: number; e1rm: number } | null = null;
  for (const s of sets) {
    if (s.weight <= 0 || s.reps <= 0) continue;
    const v = e1rm(s.weight, s.reps);
    if (!top || v > top.e1rm) top = { weight: s.weight, reps: s.reps, e1rm: v };
  }
  return top;
}

/** Today's best set per lift vs the best set the last time it was trained. */
export function sessionDeltas(today: ExerciseLog[], history: WorkoutLog[], unit: WeightUnit): LiftDelta[] {
  return today
    .filter(l => l.sets.some(isRealSet))
    .map(l => {
      const t = topSet(l.sets.filter(isRealSet));
      const lastSets = lastTimeSets(l.exerciseId, history, unit);
      const last = topSet(lastSets);
      return {
        exerciseId: l.exerciseId,
        name: l.exerciseName,
        today: t,
        last,
        change: t && last ? t.e1rm - last.e1rm : null,
        pr: !!l.personalRecord,
      };
    });
}

// ── Legacy default tempos ──────────────────────────────────────────────────

/** The four tempos the generator used to stamp on EVERY exercise by session type. */
export const LEGACY_DEFAULT_TEMPOS = new Set(['2-1-X-0', '3-1-2-0', '1-0-X-0', '2-0-2-0']);

type WithExercises = { exercises?: Array<{ prescription?: { tempo?: string } }> };

function stripSession(session: WithExercises | null | undefined): number {
  let n = 0;
  for (const ex of session?.exercises ?? []) {
    if (ex.prescription?.tempo && LEGACY_DEFAULT_TEMPOS.has(ex.prescription.tempo)) {
      delete ex.prescription.tempo;
      n++;
    }
  }
  return n;
}

/**
 * Remove generator-default tempos from stored programmes (mutates). Nothing in
 * the app ever wrote a tempo other than these defaults, so a match is always
 * the old default, never a choice the athlete made. Returns how many were removed.
 */
export function stripLegacyDefaultTempos(meso: { weeks?: Array<{ sessions?: WithExercises[] }> } | null | undefined): number {
  let n = 0;
  for (const w of meso?.weeks ?? []) for (const s of w.sessions ?? []) n += stripSession(s);
  return n;
}

export function stripLegacyDefaultTemposFromSession(session: WithExercises | null | undefined): number {
  return stripSession(session);
}
