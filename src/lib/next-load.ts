/**
 * next-load — the ONE place that decides what weight goes on the bar.
 *
 * Before v2.14 three code paths disagreed: the input box copied last session's
 * sets verbatim (ignoring rating, rep range, RPE target, deloads), an on-screen
 * hint used e1RM, and a third path applied flat ±5 jumps (lateral raise
 * 8 → 13 kg on "too easy"). Everything rounded to barbell steps, so an 8 kg
 * dumbbell marked "too easy" was suggested at 7.5 kg.
 *
 * Model: last performed session → best set's e1RM (RPE-aware; untouched
 * prefilled RPE is treated as unknown) → re-expressed at today's target reps
 * and RPE → adjusted for the athlete's rating and time off → rounded to what
 * the implement can actually be loaded to → guard-railed against the rating.
 */
import type { Exercise, ExerciseFeedback, SetLog, WeightUnit, WorkoutLog } from './types';
import { estimateE1RM, rpeToPercentage } from './load-model';
import { convertWeight } from './units';
import { isBodyweightLoadedExercise } from './weight-estimator';

// ── How an exercise is loaded ──────────────────────────────────────────────

export type Implement = 'barbell' | 'dumbbell' | 'kettlebell' | 'machine' | 'cable' | 'plate' | 'band' | 'bodyweight';

export interface LoadProfile {
  implement: Implement;
  /** Implements held at once. 2 → the logged weight is PER HAND ("2 × 12 kg"). */
  count: 1 | 2;
}

// One implement even though "dumbbell": named single-arm moves plus a few
// classics whose names don't say so. isUnilateral means single-LIMB (lunges,
// split squats are usually done holding two dumbbells), so it's not used here.
const SINGLE_IMPLEMENT = /\b(single[- ]arm|one[- ]arm|single[- ]hand|suitcase|goblet|concentration|meadows|kroc|pistol|turkish|landmine|windmill)\b/i;
const SINGLE_IMPLEMENT_IDS = new Set(['dumbbell-row', 'suitcase-carry', 'goblet-squat', 'dumbbell-pullover']);

export function getLoadProfile(ex: Pick<Exercise, 'id' | 'name' | 'equipmentTypes' | 'isUnilateral'>): LoadProfile {
  const eq = ex.equipmentTypes ?? [];
  const name = ex.name ?? '';
  const single = SINGLE_IMPLEMENT.test(name) || SINGLE_IMPLEMENT_IDS.has(ex.id);
  if (eq.includes('barbell') || eq.includes('trap_bar') || eq.includes('ez_bar') || eq.includes('landmine')) {
    return { implement: 'barbell', count: 1 };
  }
  if (eq.includes('dumbbell')) return { implement: 'dumbbell', count: single ? 1 : 2 };
  if (eq.includes('kettlebell')) {
    return { implement: 'kettlebell', count: /\b(double|two)\b/i.test(name) ? 2 : 1 };
  }
  if (eq.includes('machine')) return { implement: 'machine', count: 1 };
  if (eq.includes('cable')) return { implement: 'cable', count: 1 };
  if (eq.includes('resistance_band')) return { implement: 'band', count: 1 };
  if (/\bplate\b/i.test(name)) return { implement: 'plate', count: 1 };
  return { implement: 'bodyweight', count: 1 };
}

// ── What loads actually exist ──────────────────────────────────────────────

const KB_KG = [4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 48];
const KB_LB = [9, 13, 18, 26, 35, 44, 53, 62, 70, 80, 88, 97, 106];
const PLATES_KG = [1.25, 2.5, 5, 10, 15, 20, 25];
const PLATES_LB = [2.5, 5, 10, 25, 35, 45];

function nearest(list: number[], w: number): number {
  return list.reduce((best, x) => (Math.abs(x - w) < Math.abs(best - w) ? x : best), list[0]);
}
function step(w: number, inc: number): number {
  return Math.max(inc, Math.round(w / inc) * inc);
}

/** Round to a load the implement can really be set to (per hand for pairs). */
export function roundForImplement(w: number, p: LoadProfile, unit: WeightUnit): number {
  if (!Number.isFinite(w) || w <= 0) return 0;
  const kg = unit === 'kg';
  switch (p.implement) {
    case 'barbell': return step(w, kg ? 2.5 : 5);
    case 'dumbbell': return kg ? (w <= 10 ? step(w, 1) : step(w, 2)) : step(w, 5);
    case 'kettlebell': return nearest(kg ? KB_KG : KB_LB, w);
    case 'plate': return nearest(kg ? PLATES_KG : PLATES_LB, w);
    case 'machine':
    case 'cable': return step(w, kg ? 2.5 : 5);
    default: return step(w, kg ? 1.25 : 2.5);
  }
}

/** Next load up / down from `w` on this implement (for "too easy" floors etc.). */
export function nextLoadStep(w: number, p: LoadProfile, unit: WeightUnit, dir: 1 | -1): number {
  for (let k = 1; k <= 40; k++) {
    const candidate = roundForImplement(w + dir * k * (unit === 'kg' ? 0.5 : 1), p, unit);
    if (dir === 1 ? candidate > w : candidate < w) return candidate;
  }
  return w;
}

/** "2 × 12 kg" for pairs, "100 kg" otherwise. */
export function formatLoad(w: number, p: LoadProfile, unit: WeightUnit): string {
  const n = Number.isInteger(w) ? `${w}` : w.toFixed(w * 10 % 1 === 0 ? 1 : 2).replace(/0$/, '');
  return p.count === 2 ? `2 × ${n} ${unit}` : `${n} ${unit}`;
}

// ── The suggestion ─────────────────────────────────────────────────────────

export interface NextLoadInput {
  exercise: Pick<Exercise, 'id' | 'name' | 'equipmentTypes' | 'isUnilateral' | 'measurementType'>;
  logs: WorkoutLog[];
  targetReps: number;
  targetRPE: number;
  unit: WeightUnit;
  now?: Date;
}

export interface NextLoadResult {
  weight: number;
  /** One line the athlete can read: why this number. */
  reason: string;
  basis: 'history' | 'none';
  profile: LoadProfile;
  last?: { weight: number; reps: number; rpe?: number; date: Date; feedback?: ExerciseFeedback['difficulty'] };
}

const performed = (s: SetLog) => s.completed && !s.skipped && (s.reps > 0 || (s.duration ?? 0) > 0);

export function suggestNextLoad({ exercise, logs, targetReps, targetRPE, unit, now = new Date() }: NextLoadInput): NextLoadResult | null {
  const profile = getLoadProfile(exercise as Exercise);
  if (exercise.measurementType && exercise.measurementType !== 'reps') {
    // Carries/holds: progress load only when the last effort was rated easy; else repeat.
    return suggestRepeatLoad(exercise, logs, unit, profile);
  }
  const sorted = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  for (const log of sorted) {
    const exLog = log.exercises.find(e => e.exerciseId === exercise.id);
    if (!exLog) continue;
    const sets = exLog.sets.filter(performed).filter(s => s.weight > 0);
    if (sets.length === 0) continue;

    const conv = (w: number) => (log.weightUnit && log.weightUnit !== unit ? convertWeight(w, log.weightUnit, unit) : w);
    // Best set by e1RM. A prefilled (untouched) RPE is not information.
    let best = sets[0];
    let bestE1 = 0;
    for (const s of sets) {
      // Unknown effort → assume the set landed on today's target, so an
      // unrated repeat of the same scheme suggests the same load.
      const rpe = s.rpeSource === 'prefill' ? undefined : (s.rpe > 0 ? s.rpe : undefined);
      const e1 = estimateE1RM(conv(s.weight), s.reps, rpe ?? targetRPE);
      if (e1 > bestE1) { bestE1 = e1; best = s; }
    }
    const lastRpe = best.rpeSource === 'prefill' || !(best.rpe > 0) ? undefined : best.rpe;
    const lastWeight = conv(best.weight);
    const fb = exLog.feedback?.difficulty;

    let factor = 1;
    const notes: string[] = [];
    if (fb === 'too_easy') { factor *= 1.05; notes.push('rated too easy'); }
    if (fb === 'too_hard') { factor *= 0.93; notes.push('rated too hard'); }
    const days = Math.floor((now.getTime() - new Date(log.date).getTime()) / 864e5);
    if (days > 90) { factor *= 0.85; notes.push(`${days} days off`); }
    else if (days > 42) { factor *= 0.9; notes.push(`${days} days off`); }
    else if (days > 21) { factor *= 0.95; notes.push(`${days} days off`); }

    const raw = bestE1 * rpeToPercentage(targetRPE, targetReps) * factor;
    let weight = roundForImplement(raw, profile, unit);

    // Guardrails: the rating's direction always wins over rounding noise.
    const sameScheme = best.reps === targetReps;
    if (fb === 'too_easy' && sameScheme && weight <= lastWeight) weight = nextLoadStep(lastWeight, profile, unit, 1);
    if (fb === 'too_hard' && sameScheme && weight >= lastWeight) weight = nextLoadStep(lastWeight, profile, unit, -1);
    // Never more than +10% on the same scheme in one jump.
    // (…but always allow one real implement step — +10% of 8 kg is less than one dumbbell jump.)
    const cap = Math.max(roundForImplement(lastWeight * 1.1, profile, unit), nextLoadStep(lastWeight, profile, unit, 1));
    if (sameScheme && weight > cap) weight = cap;

    const lastTxt = `${formatLoad(roundForImplement(lastWeight, profile, unit), profile, unit)} × ${best.reps}${lastRpe ? ` @ RPE ${lastRpe}` : ''}`;
    return {
      weight,
      basis: 'history',
      profile,
      last: { weight: lastWeight, reps: best.reps, rpe: lastRpe, date: new Date(log.date), feedback: fb },
      reason: `Last ${lastTxt}${notes.length ? ` (${notes.join(', ')})` : ''} → today ${targetReps} @ RPE ${targetRPE}`,
    };
  }
  return null;
}

function suggestRepeatLoad(
  exercise: NextLoadInput['exercise'], logs: WorkoutLog[], unit: WeightUnit, profile: LoadProfile,
): NextLoadResult | null {
  const sorted = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  for (const log of sorted) {
    const exLog = log.exercises.find(e => e.exerciseId === exercise.id);
    const sets = exLog?.sets.filter(performed) ?? [];
    if (!exLog || sets.length === 0) continue;
    const conv = (w: number) => (log.weightUnit && log.weightUnit !== unit ? convertWeight(w, log.weightUnit, unit) : w);
    const top = Math.max(...sets.map(s => conv(s.weight)));
    if (top <= 0) return { weight: 0, basis: 'history', profile, reason: 'Bodyweight' };
    const fb = exLog.feedback?.difficulty;
    let weight = roundForImplement(top, profile, unit);
    if (fb === 'too_easy') weight = nextLoadStep(weight, profile, unit, 1);
    if (fb === 'too_hard') weight = nextLoadStep(weight, profile, unit, -1);
    return {
      weight, basis: 'history', profile,
      reason: `Last ${formatLoad(roundForImplement(top, profile, unit), profile, unit)}${fb === 'too_easy' ? ' (rated too easy)' : fb === 'too_hard' ? ' (rated too hard)' : ''}`,
    };
  }
  return null;
}

/** Bodyweight-loaded lifts log total load (bodyweight + belt); re-export for callers. */
export { isBodyweightLoadedExercise };
