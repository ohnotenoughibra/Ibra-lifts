/**
 * Weight units — single source of truth.
 *
 * The app stores lift weights in whatever unit was active when they were
 * logged (each WorkoutLog carries its own `weightUnit`), while body weight is
 * stored canonically in kg. Everything user-facing must be labelled with the
 * unit from the user's settings — never a hardcoded 'lbs'.
 *
 * Import from here instead of writing `user?.weightUnit || 'lbs'` inline.
 */

import type { WeightUnit } from './types';

export type { WeightUnit };

/**
 * Fallback when a profile has no `weightUnit` set. Matches what Onboarding
 * writes for a new user, so a legacy profile reads the same as a fresh one.
 */
export const DEFAULT_WEIGHT_UNIT: WeightUnit = 'kg';

const KG_PER_LB = 0.453592;

/** Resolve the user's unit, tolerating an undefined profile. */
export function resolveWeightUnit(unit?: WeightUnit | null): WeightUnit {
  return unit ?? DEFAULT_WEIGHT_UNIT;
}

// ── Conversion ─────────────────────────────────────────────────────────────

/** Convert a kg value into the given display unit. */
export function fromKg(kg: number, to: WeightUnit): number {
  return to === 'kg' ? kg : kg / KG_PER_LB;
}

/** Convert a value in the given unit into canonical kg. */
export function toKg(weight: number, from: WeightUnit): number {
  return from === 'kg' ? weight : weight * KG_PER_LB;
}

/** Convert between two units. */
export function convertWeight(weight: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return weight;
  return to === 'kg' ? weight * KG_PER_LB : weight / KG_PER_LB;
}

// ── Formatting ─────────────────────────────────────────────────────────────

/**
 * Format a weight already expressed in `unit`.
 * Drops a trailing ".0" so 60 reads as "60 kg", not "60.0 kg".
 */
export function formatWeight(
  weight: number,
  unit: WeightUnit,
  opts: { decimals?: number; space?: boolean } = {}
): string {
  const { decimals = 1, space = true } = opts;
  const rounded = Number(weight.toFixed(decimals));
  return `${rounded}${space ? ' ' : ''}${unit}`;
}

/** Format a kg-stored value for display in the user's unit. */
export function formatWeightFromKg(
  kg: number,
  unit: WeightUnit,
  opts?: { decimals?: number; space?: boolean }
): string {
  return formatWeight(fromKg(kg, unit), unit, opts);
}

// ── Gym-floor constants ────────────────────────────────────────────────────

/** Smallest practical jump on a barbell: 2.5 kg or 5 lbs. */
export function weightIncrement(unit: WeightUnit): number {
  return unit === 'kg' ? 2.5 : 5;
}

/** Smallest practical jump on dumbbells/machines. */
export function smallWeightIncrement(unit: WeightUnit): number {
  return unit === 'kg' ? 1.25 : 2.5;
}

/** Standard Olympic bar: 20 kg or 45 lbs. */
export function barWeight(unit: WeightUnit): number {
  return unit === 'kg' ? 20 : 45;
}

/**
 * Human-readable jump range for coaching copy, e.g. "5-10 lbs" / "2.5-5 kg".
 * `size` picks a barbell-sized or accessory-sized bump.
 */
export function incrementRange(unit: WeightUnit, size: 'barbell' | 'small' = 'barbell'): string {
  const base = size === 'barbell' ? weightIncrement(unit) : smallWeightIncrement(unit);
  return `${base}-${base * 2} ${unit}`;
}
