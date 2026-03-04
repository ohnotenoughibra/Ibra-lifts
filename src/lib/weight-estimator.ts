/**
 * Evidence-based first-time exercise weight estimation.
 *
 * Tiered approach:
 *   Tier 1 — Baseline lifts known: cross-exercise ratios from peer-reviewed studies
 *     Wong et al. 2013 (PMC3761768) — bench press → upper body accessories
 *     Ebben et al. 2008 (PubMed 18978614) — squat → lower body accessories
 *   Tier 2 — Only bodyweight/sex/experience: strength-standard BW multipliers
 *     Derived from Strength Level (153M+ lifts), ExRx, and a 2024 powerlifting
 *     normative study (PubMed 39060209, 809,986 competition entries)
 *   Tier 3 — Nothing known: conservative defaults
 *
 * All estimates are working weight for the target rep range, NOT 1RM.
 * A 5–15% safety margin is applied based on experience level.
 */

import type { Exercise, ExperienceLevel, BiologicalSex, BaselineLifts } from './types';

// ── 1RM ↔ Working Weight Conversion (Brzycki 1993) ──────────────────────────

export function workingWeightFrom1RM(oneRM: number, targetReps: number): number {
  if (oneRM <= 0) return 0;
  if (targetReps <= 1) return oneRM;
  return oneRM * (1.0278 - 0.0278 * targetReps);
}

export function estimate1RMFromReps(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps <= 1) return weight;
  // Brzycki degrades past ~12 reps — clamp to keep estimates accurate
  const clampedReps = Math.min(reps, 12);
  return weight / (1.0278 - 0.0278 * clampedReps);
}

// ── BW-based 1RM Multipliers by Sex + Experience ────────────────────────────
// Sources: Strength Level, ExRx, PubMed 39060209

interface BWMultipliers {
  squat: number;
  benchPress: number;
  deadlift: number;
  overheadPress: number;
  barbellRow: number;
}

const MALE_MULTIPLIERS: Record<ExperienceLevel, BWMultipliers> = {
  beginner:     { squat: 1.00, benchPress: 0.75, deadlift: 1.25, overheadPress: 0.55, barbellRow: 0.70 },
  intermediate: { squat: 1.50, benchPress: 1.25, deadlift: 1.75, overheadPress: 0.75, barbellRow: 1.00 },
  advanced:     { squat: 2.00, benchPress: 1.75, deadlift: 2.50, overheadPress: 1.00, barbellRow: 1.30 },
};

const FEMALE_MULTIPLIERS: Record<ExperienceLevel, BWMultipliers> = {
  beginner:     { squat: 0.75, benchPress: 0.50, deadlift: 0.90, overheadPress: 0.35, barbellRow: 0.50 },
  intermediate: { squat: 1.10, benchPress: 0.75, deadlift: 1.35, overheadPress: 0.55, barbellRow: 0.70 },
  advanced:     { squat: 1.50, benchPress: 1.00, deadlift: 1.75, overheadPress: 0.70, barbellRow: 0.90 },
};

// ── Cross-exercise Ratios (relative to reference compound 1RM) ──────────────
// Upper body ratios relative to bench press 1RM
// Lower body ratios relative to squat 1RM

interface ExerciseRatio {
  reference: 'bench' | 'squat' | 'deadlift' | 'ohp' | 'row';
  ratio: number;
}

// Exercise ID → which compound to derive from + ratio of that compound's 1RM
const EXERCISE_RATIOS: Record<string, ExerciseRatio> = {
  // ── Squat variants ──
  'back-squat':         { reference: 'squat', ratio: 1.00 },
  'front-squat':        { reference: 'squat', ratio: 0.80 },
  'goblet-squat':       { reference: 'squat', ratio: 0.35 },
  'bulgarian-split-squat': { reference: 'squat', ratio: 0.40 },
  'leg-press':          { reference: 'squat', ratio: 1.80 },
  'hack-squat':         { reference: 'squat', ratio: 0.70 },
  'leg-extension':      { reference: 'squat', ratio: 0.50 },
  'sissy-squat':        { reference: 'squat', ratio: 0.15 },

  // ── Hinge / deadlift variants ──
  'deadlift':           { reference: 'deadlift', ratio: 1.00 },
  'sumo-deadlift':      { reference: 'deadlift', ratio: 0.95 },
  'romanian-deadlift':  { reference: 'deadlift', ratio: 0.65 },
  'stiff-leg-deadlift': { reference: 'deadlift', ratio: 0.60 },
  'hip-thrust':         { reference: 'squat', ratio: 1.10 },
  'barbell-hip-thrust':    { reference: 'squat', ratio: 1.10 },
  'glute-bridge':       { reference: 'squat', ratio: 0.70 },
  'leg-curl':           { reference: 'squat', ratio: 0.35 },
  'nordic-curl':        { reference: 'squat', ratio: 0.00 }, // bodyweight
  'good-morning':       { reference: 'squat', ratio: 0.40 },

  // ── Lunge / single leg ──
  'lunge':              { reference: 'squat', ratio: 0.50 },
  'walking-lunge':      { reference: 'squat', ratio: 0.45 },
  'reverse-lunge':      { reference: 'squat', ratio: 0.45 },
  'step-up':            { reference: 'squat', ratio: 0.45 },

  // ── Calves ──
  'calf-raise':         { reference: 'squat', ratio: 0.80 },
  'standing-calf-raise':{ reference: 'squat', ratio: 0.80 },
  'seated-calf-raise':  { reference: 'squat', ratio: 0.50 },

  // ── Bench / push variants ──
  'bench-press':        { reference: 'bench', ratio: 1.00 },
  'flat-bench-press':   { reference: 'bench', ratio: 1.00 },
  'incline-bench':      { reference: 'bench', ratio: 0.80 },
  'incline-bench-press':{ reference: 'bench', ratio: 0.80 },
  'decline-bench':      { reference: 'bench', ratio: 1.05 },
  'db-bench-press':     { reference: 'bench', ratio: 0.38 }, // per hand
  'db-incline-bench':   { reference: 'bench', ratio: 0.35 }, // per hand
  'dumbbell-bench-press':  { reference: 'bench', ratio: 0.38 },
  'dumbbell-incline-bench':{ reference: 'bench', ratio: 0.35 },
  'dumbbell-fly':       { reference: 'bench', ratio: 0.20 },
  'cable-fly':          { reference: 'bench', ratio: 0.20 },
  'pec-deck':           { reference: 'bench', ratio: 0.45 },
  'chest-dip':          { reference: 'bench', ratio: 0.00 }, // bodyweight
  'push-up':            { reference: 'bench', ratio: 0.00 },

  // ── OHP / shoulder variants ──
  'overhead-press':     { reference: 'ohp', ratio: 1.00 },
  'barbell-ohp':        { reference: 'ohp', ratio: 1.00 },
  'db-shoulder-press':  { reference: 'ohp', ratio: 0.40 }, // per hand
  'dumbbell-shoulder-press': { reference: 'ohp', ratio: 0.40 },
  'arnold-press':       { reference: 'ohp', ratio: 0.35 },
  'lateral-raise':      { reference: 'ohp', ratio: 0.15 }, // per hand
  'dumbbell-lateral-raise': { reference: 'ohp', ratio: 0.15 },
  'front-raise':        { reference: 'ohp', ratio: 0.15 },
  'face-pull':          { reference: 'ohp', ratio: 0.30 },
  'cable-lateral-raise':{ reference: 'ohp', ratio: 0.15 },
  'rear-delt-fly':      { reference: 'ohp', ratio: 0.12 },
  'reverse-fly':        { reference: 'ohp', ratio: 0.12 },
  'upright-row':        { reference: 'ohp', ratio: 0.70 },

  // ── Row / pull variants ──
  'barbell-row':        { reference: 'row', ratio: 1.00 },
  'pendlay-row':        { reference: 'row', ratio: 0.90 },
  'db-row':             { reference: 'row', ratio: 0.45 }, // per hand
  'dumbbell-row':       { reference: 'row', ratio: 0.45 },
  'cable-row':          { reference: 'row', ratio: 0.60 },
  'seated-cable-row':   { reference: 'row', ratio: 0.60 },
  't-bar-row':          { reference: 'row', ratio: 0.85 },
  'chest-supported-row':{ reference: 'row', ratio: 0.35 }, // per hand (DB)
  'lat-pulldown':       { reference: 'row', ratio: 0.55 },
  'pull-up':            { reference: 'row', ratio: 0.00 }, // bodyweight
  'chin-up':            { reference: 'row', ratio: 0.00 },

  // ── Arms ──
  'barbell-curl':       { reference: 'bench', ratio: 0.35 },
  'dumbbell-curl':      { reference: 'bench', ratio: 0.17 }, // per hand
  'hammer-curl':        { reference: 'bench', ratio: 0.18 }, // per hand
  'preacher-curl':      { reference: 'bench', ratio: 0.30 },
  'incline-curl':       { reference: 'bench', ratio: 0.15 },
  'cable-curl':         { reference: 'bench', ratio: 0.25 },
  'triceps-pushdown':   { reference: 'bench', ratio: 0.30 },
  'cable-triceps-pushdown': { reference: 'bench', ratio: 0.30 },
  'overhead-triceps-extension': { reference: 'bench', ratio: 0.25 },
  'skull-crusher':      { reference: 'bench', ratio: 0.35 },
  'close-grip-bench':   { reference: 'bench', ratio: 0.85 },
  'dip':                { reference: 'bench', ratio: 0.00 }, // bodyweight

  // ── Core ──
  'cable-woodchop':     { reference: 'bench', ratio: 0.20 },
  'pallof-press':       { reference: 'bench', ratio: 0.15 },
  'ab-rollout':         { reference: 'bench', ratio: 0.00 },
  'plank':              { reference: 'bench', ratio: 0.00 },
  'hanging-leg-raise':  { reference: 'bench', ratio: 0.00 },

  // ── Traps ──
  'barbell-shrug':      { reference: 'deadlift', ratio: 0.60 },
  'dumbbell-shrug':     { reference: 'deadlift', ratio: 0.25 }, // per hand
  'farmers-walk':       { reference: 'deadlift', ratio: 0.35 }, // per hand
  'farmers-carry':      { reference: 'deadlift', ratio: 0.35 },
};

// ── Main Estimation Function ────────────────────────────────────────────────

export interface WeightEstimate {
  weight: number;        // estimated working weight (in user's unit)
  confidence: 'high' | 'medium' | 'low';
  source: string;        // human-readable explanation
}

/**
 * Estimate a working weight for an exercise the user hasn't done before.
 *
 * @param exercise       - The exercise to estimate for
 * @param targetReps     - Target rep count for the working set
 * @param baselineLifts  - User's baseline 1RM-ish lifts (may be null/partial)
 * @param bodyWeightKg   - User's body weight in kg
 * @param sex            - Biological sex for multiplier selection
 * @param experience     - Training experience level
 * @param weightUnit     - 'kg' or 'lbs' for output rounding
 */
export function estimateFirstTimeWeight(
  exercise: Exercise,
  targetReps: number,
  baselineLifts: Partial<BaselineLifts> | null,
  bodyWeightKg: number | undefined,
  sex: BiologicalSex | undefined,
  experience: ExperienceLevel | undefined,
  weightUnit: 'kg' | 'lbs' = 'kg',
): WeightEstimate | null {
  const increment = weightUnit === 'kg' ? 2.5 : 5;
  const round = (w: number) => Math.max(increment, Math.round(w / increment) * increment);
  const safeExp = experience || 'intermediate';
  const safeSex = sex || 'male';
  const bw = bodyWeightKg || 70;

  // Bodyweight exercises — no weight to suggest
  const ratio = EXERCISE_RATIOS[exercise.id];
  if (ratio && ratio.ratio === 0) return null;

  // ── Tier 1: Derive from baseline lifts ──
  if (baselineLifts && ratio) {
    const ref1RM = getReference1RM(ratio.reference, baselineLifts);
    if (ref1RM && ref1RM > 0) {
      const estimated1RM = ref1RM * ratio.ratio;
      let working = workingWeightFrom1RM(estimated1RM, targetReps);
      // Safety margin by experience level
      if (safeExp === 'beginner') working *= 0.85;
      else if (safeExp === 'intermediate') working *= 0.90;
      else if (safeExp === 'advanced') working *= 0.95;
      const inUnit = weightUnit === 'lbs' ? working * 2.205 : working;
      return {
        weight: round(inUnit),
        confidence: 'high',
        source: `Based on your ${getReferenceLabel(ratio.reference)} (Brzycki formula)`,
      };
    }
  }

  // ── Tier 2: Bodyweight multipliers ──
  if (bw > 0) {
    // Try to find ratio → reference compound → use BW multiplier for that compound
    const multipliers = safeSex === 'female' ? FEMALE_MULTIPLIERS[safeExp] : MALE_MULTIPLIERS[safeExp];

    if (ratio) {
      const compound1RM_kg = getCompound1RM_BW(ratio.reference, multipliers, bw);
      if (compound1RM_kg > 0) {
        const estimated1RM = compound1RM_kg * ratio.ratio;
        let working = workingWeightFrom1RM(estimated1RM, targetReps);
        // Safety margin by experience level
        if (safeExp === 'beginner') working *= 0.85;
        else if (safeExp === 'intermediate') working *= 0.90;
        else if (safeExp === 'advanced') working *= 0.95;
        const inUnit = weightUnit === 'lbs' ? working * 2.205 : working;
        return {
          weight: round(inUnit),
          confidence: 'medium',
          source: `Estimated from bodyweight (${Math.round(bw)}kg, ${safeExp})`,
        };
      }
    }

    // Fallback: use movement pattern to guess a compound reference
    const fallbackRef = PATTERN_TO_REFERENCE[exercise.movementPattern];
    if (fallbackRef) {
      const compound1RM_kg = getCompound1RM_BW(fallbackRef, multipliers, bw);
      const fallbackRatio = exercise.category === 'isolation' ? 0.30 : 0.65;
      const estimated1RM = compound1RM_kg * fallbackRatio;
      let working = workingWeightFrom1RM(estimated1RM, targetReps);
      // Safety margin by experience level
      if (safeExp === 'beginner') working *= 0.85;
      else if (safeExp === 'intermediate') working *= 0.90;
      else if (safeExp === 'advanced') working *= 0.95;
      const inUnit = weightUnit === 'lbs' ? working * 2.205 : working;
      return {
        weight: round(inUnit),
        confidence: 'low',
        source: 'Rough estimate — adjust based on feel',
      };
    }
  }

  return null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const PATTERN_TO_REFERENCE: Record<string, ExerciseRatio['reference']> = {
  push: 'bench',
  pull: 'row',
  squat: 'squat',
  hinge: 'deadlift',
  carry: 'deadlift',
  rotation: 'bench',
  explosive: 'squat',
};

function getReference1RM(
  ref: ExerciseRatio['reference'],
  lifts: Partial<BaselineLifts>,
): number | null {
  switch (ref) {
    case 'bench': return lifts.benchPress ?? null;
    case 'squat': return lifts.squat ?? null;
    case 'deadlift': return lifts.deadlift ?? null;
    case 'ohp': return lifts.overheadPress ?? null;
    case 'row': return lifts.barbellRow ?? null;
  }
}

function getReferenceLabel(ref: ExerciseRatio['reference']): string {
  switch (ref) {
    case 'bench': return 'bench press';
    case 'squat': return 'squat';
    case 'deadlift': return 'deadlift';
    case 'ohp': return 'overhead press';
    case 'row': return 'barbell row';
  }
}

function getCompound1RM_BW(
  ref: ExerciseRatio['reference'],
  multipliers: BWMultipliers,
  bw: number,
): number {
  switch (ref) {
    case 'bench': return bw * multipliers.benchPress;
    case 'squat': return bw * multipliers.squat;
    case 'deadlift': return bw * multipliers.deadlift;
    case 'ohp': return bw * multipliers.overheadPress;
    case 'row': return bw * multipliers.barbellRow;
  }
}
