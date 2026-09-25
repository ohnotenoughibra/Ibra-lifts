/**
 * Load Model — the single source of truth for load ↔ reps ↔ RPE.
 *
 * Every "what weight should I use?" answer in the app must come from here.
 * Before this existed there were three competing models:
 *
 *   1. rpe-regulator.ts — the validated Helms/Zourdos RPE chart (correct,
 *      but only applied WITHIN a session)
 *   2. ActiveWorkout.getRPEWeightSuggestion — a flat "2.5% per rep, 2.5% per
 *      RPE point" linear guess (wrong across wide rep swings)
 *   3. workout-generator.createSetPrescription — a `percentageOf1RM` drawn at
 *      random from the workout-type band, independent of the reps and RPE it
 *      was paired with
 *
 * The linear model is what broke undulating (DUP) programming: going from a
 * power day (3 reps) to a hypertrophy day (12 reps) is a ~30% load change,
 * not the 22.5% a linear per-rep model produces — and the error grows the
 * wider the rep swing.
 *
 * The relationship between reps, RPE and %1RM is non-linear and empirically
 * mapped. We use that map in both directions:
 *
 *   load  = e1RM × pct(targetRPE, targetReps)
 *   e1RM  = load / pct(actualRPE, actualReps)
 *
 * References:
 *   - Zourdos et al. 2016, J Strength Cond Res — RPE/RIR validation
 *   - Helms et al. 2016, Strength Cond J — RPE-based load prescription
 */

import type { WeightUnit } from './types';
import { weightIncrement } from './units';

// ── RPE × Reps → %1RM ──────────────────────────────────────────────────────
// RPE_TABLE[reps][rpe] = fraction of 1RM. Row = reps (1-12), column = RPE
// 5-10 in 0.5 steps. Built from the RTS chart (Tuchscherer; the chart Helms
// et al. 2016 use): RPE 10 column below, and every half RPE point below 10 is
// half a rep more in reserve — pct(reps, rpe) = pct10(reps + 10 − rpe).
// The previous hand-typed table dropped a flat ~3.2 % per rep above 3 reps,
// so 10 reps @10 read as 70 % (RTS: 74 %) and volume-day e1RMs came out ~5 %
// high — every heavy day after them was prescribed too heavy.
const RTS_RPE10: number[] = [
  1.000, 0.955, 0.922, 0.892, 0.863, 0.837, 0.811, 0.786, 0.762, 0.739, 0.707, 0.680,
  // effective reps 13-17 (low-RPE high-rep cells): continue the 11→12 slope, easing off
  0.653, 0.627, 0.602, 0.578, 0.555,
];
function pct10(effectiveReps: number): number {
  const lo = Math.floor(effectiveReps);
  const hi = Math.ceil(effectiveReps);
  const at = (n: number) => RTS_RPE10[Math.min(RTS_RPE10.length, Math.max(1, n)) - 1];
  return lo === hi ? at(lo) : (at(lo) + at(hi)) / 2;
}

export const RPE_TABLE: Record<number, Record<number, number>> = (() => {
  const t: Record<number, Record<number, number>> = {};
  for (let reps = 1; reps <= 12; reps++) {
    t[reps] = {};
    for (let rpe = 10; rpe >= 5; rpe -= 0.5) {
      t[reps][rpe] = Math.round(pct10(reps + (10 - rpe)) * 1000) / 1000;
    }
  }
  return t;
})();

/**
 * The chart stops at 12 reps. Past that, each additional rep costs roughly
 * 1.5% of 1RM (a 20-rep max ≈ 56 % 1RM), which keeps 15-20 rep
 * strength-endurance work in a sane range instead of falling off a cliff.
 */
const PCT_PER_REP_BEYOND_TABLE = 0.015;
const MAX_TABLE_REPS = 12;
const MIN_PCT = 0.30;

/**
 * Fraction of 1RM a set of `reps` at `rpe` represents.
 * Clamps RPE to 5-10 and reps to >= 1; extrapolates past 12 reps.
 */
export function rpeToPercentage(rpe: number, reps: number = 1): number {
  if (!Number.isFinite(rpe) || !Number.isFinite(reps)) return RPE_TABLE[1][9];
  const clampedRpe = Math.max(5, Math.min(10, rpe));
  const roundedRpe = Math.round(clampedRpe * 2) / 2;
  const wholeReps = Math.max(1, Math.round(reps));

  if (wholeReps <= MAX_TABLE_REPS) {
    return RPE_TABLE[wholeReps]?.[roundedRpe] ?? RPE_TABLE[1][roundedRpe] ?? 0.9;
  }

  const base = RPE_TABLE[MAX_TABLE_REPS][roundedRpe] ?? RPE_TABLE[MAX_TABLE_REPS][9];
  const extra = (wholeReps - MAX_TABLE_REPS) * PCT_PER_REP_BEYOND_TABLE;
  return Math.max(MIN_PCT, base - extra);
}

// ── e1RM ───────────────────────────────────────────────────────────────────

/**
 * Estimated 1RM from a set, accounting for how hard it actually was.
 *
 * This is the RPE-aware counterpart to the plain Brzycki `estimate1RM` in
 * weight-estimator.ts. 100 kg × 5 reps at RPE 7 (3 left in the tank) implies
 * a much bigger 1RM than the same set taken to RPE 10 — Brzycki alone can't
 * see that difference, so it under-rates easy sets and over-rates grinders.
 */
export function estimateE1RM(weight: number, reps: number, rpe?: number): number {
  if (!Number.isFinite(weight) || weight <= 0) return 0;
  if (!Number.isFinite(reps) || reps <= 0) return 0;
  // No RPE recorded → assume the set was taken close to failure (RPE 9),
  // which is what an athlete logging without RPE usually means.
  const effectiveRpe = Number.isFinite(rpe) && (rpe as number) > 0 ? (rpe as number) : 9;
  const pct = rpeToPercentage(effectiveRpe, reps);
  return pct > 0 ? weight / pct : 0;
}

// ── Load prescription ──────────────────────────────────────────────────────

export interface LoadSuggestionInput {
  /** Estimated 1RM to work from. */
  e1RM: number;
  targetReps: number;
  targetRPE: number;
  unit: WeightUnit;
  /** Multiplier for readiness/deload throttling, e.g. 0.9 on a red day. */
  intensityFactor?: number;
}

/** Round a load to the smallest plate jump available in the athlete's unit. */
export function roundToIncrement(weight: number, unit: WeightUnit): number {
  const inc = weightIncrement(unit);
  const rounded = Math.round(weight / inc) * inc;
  return rounded > 0 ? rounded : inc;
}

/**
 * The load that should produce `targetReps` at `targetRPE`.
 *
 * This is the function that makes undulating programming work: the same e1RM
 * yields a heavy load for a 3-rep power day and a much lighter one for a
 * 12-rep hypertrophy day, following the empirical curve rather than a
 * straight line.
 */
export function suggestLoad({
  e1RM,
  targetReps,
  targetRPE,
  unit,
  intensityFactor = 1,
}: LoadSuggestionInput): number {
  if (!Number.isFinite(e1RM) || e1RM <= 0) return 0;
  const pct = rpeToPercentage(targetRPE, targetReps);
  return roundToIncrement(e1RM * pct * intensityFactor, unit);
}

/**
 * Carry a previous session's performance onto today's prescription.
 *
 * Handles the DUP case end-to-end: read the last set in whatever rep range it
 * happened to be, convert to e1RM, then re-express it at today's target reps
 * and RPE.
 */
export interface CarryOverInput {
  lastWeight: number;
  lastReps: number;
  lastRPE?: number;
  targetReps: number;
  targetRPE: number;
  unit: WeightUnit;
  intensityFactor?: number;
}

export interface CarryOverResult {
  suggested: number;
  e1RM: number;
  /** %1RM today's prescription actually represents. */
  targetPct: number;
  /** %1RM the previous session represented. */
  lastPct: number;
}

export function carryOverLoad({
  lastWeight,
  lastReps,
  lastRPE,
  targetReps,
  targetRPE,
  unit,
  intensityFactor = 1,
}: CarryOverInput): CarryOverResult | null {
  if (!Number.isFinite(lastWeight) || lastWeight <= 0) return null;
  if (!Number.isFinite(lastReps) || lastReps <= 0) return null;

  const e1RM = estimateE1RM(lastWeight, lastReps, lastRPE);
  if (e1RM <= 0) return null;

  const targetPct = rpeToPercentage(targetRPE, targetReps);
  const lastPct = rpeToPercentage(
    Number.isFinite(lastRPE) && (lastRPE as number) > 0 ? (lastRPE as number) : 9,
    lastReps
  );

  return {
    suggested: suggestLoad({ e1RM, targetReps, targetRPE, unit, intensityFactor }),
    e1RM,
    targetPct,
    lastPct,
  };
}

/**
 * The %1RM a prescription implies — use this for the "~75% 1RM" label so the
 * number shown always agrees with the weight suggested.
 */
export function prescribedPercentOf1RM(targetReps: number, targetRPE: number): number {
  return Math.round(rpeToPercentage(targetRPE, targetReps) * 100);
}
