/**
 * Live RPE Auto-Regulator
 *
 * Watches RPE across sets WITHIN the current workout and auto-suggests
 * weight adjustments mid-session. Unlike the between-session auto-adjust,
 * this reacts in real-time to how the athlete is performing RIGHT NOW.
 *
 * Rules:
 * - If RPE exceeds target by 1.5+ on 2 consecutive sets → suggest drop
 * - If RPE is 2+ below target for 2 consecutive sets → suggest bump
 * - Respects throttle level (no bump suggestions on orange/red days)
 * - Calculates exact weight suggestions based on RPE-to-percentage mapping
 */

import type { SetLog, ExercisePrescription } from './types';
import type { ThrottleLevel } from './readiness-throttle';

// ── Types ────────────────────────────────────────────────────────────────

export interface RPERegulation {
  type: 'drop' | 'bump' | 'hold';
  currentWeight: number;
  suggestedWeight: number;
  message: string;
  reason: string;
  confidence: 'high' | 'medium';
}

// ── RPE × Reps to %1RM mapping (Helms et al. 2016, Zourdos et al. 2016) ──
// 2D table: RPE_TO_PCT[reps][rpe] = %1RM
// Row = reps (1-12), Column = RPE (5-10 in 0.5 steps)
// Values from the validated Helms/Zourdos RPE chart

const RPE_TABLE: Record<number, Record<number, number>> = {
  1:  { 10: 1.00, 9.5: 0.977, 9: 0.955, 8.5: 0.939, 8: 0.922, 7.5: 0.906, 7: 0.890, 6.5: 0.874, 6: 0.858, 5.5: 0.842, 5: 0.826 },
  2:  { 10: 0.955, 9.5: 0.939, 9: 0.922, 8.5: 0.906, 8: 0.890, 7.5: 0.874, 7: 0.858, 6.5: 0.842, 6: 0.826, 5.5: 0.810, 5: 0.793 },
  3:  { 10: 0.922, 9.5: 0.906, 9: 0.890, 8.5: 0.874, 8: 0.858, 7.5: 0.842, 7: 0.826, 6.5: 0.810, 6: 0.793, 5.5: 0.777, 5: 0.762 },
  4:  { 10: 0.890, 9.5: 0.874, 9: 0.858, 8.5: 0.842, 8: 0.826, 7.5: 0.810, 7: 0.793, 6.5: 0.777, 6: 0.762, 5.5: 0.746, 5: 0.731 },
  5:  { 10: 0.858, 9.5: 0.842, 9: 0.826, 8.5: 0.810, 8: 0.793, 7.5: 0.777, 7: 0.762, 6.5: 0.746, 6: 0.731, 5.5: 0.716, 5: 0.701 },
  6:  { 10: 0.826, 9.5: 0.810, 9: 0.793, 8.5: 0.777, 8: 0.762, 7.5: 0.746, 7: 0.731, 6.5: 0.716, 6: 0.701, 5.5: 0.686, 5: 0.671 },
  7:  { 10: 0.793, 9.5: 0.777, 9: 0.762, 8.5: 0.746, 8: 0.731, 7.5: 0.716, 7: 0.701, 6.5: 0.686, 6: 0.671, 5.5: 0.656, 5: 0.641 },
  8:  { 10: 0.762, 9.5: 0.746, 9: 0.731, 8.5: 0.716, 8: 0.701, 7.5: 0.686, 7: 0.671, 6.5: 0.656, 6: 0.641, 5.5: 0.627, 5: 0.613 },
  9:  { 10: 0.731, 9.5: 0.716, 9: 0.701, 8.5: 0.686, 8: 0.671, 7.5: 0.656, 7: 0.641, 6.5: 0.627, 6: 0.613, 5.5: 0.599, 5: 0.586 },
  10: { 10: 0.701, 9.5: 0.686, 9: 0.671, 8.5: 0.656, 8: 0.641, 7.5: 0.627, 7: 0.613, 6.5: 0.599, 6: 0.586, 5.5: 0.573, 5: 0.560 },
  11: { 10: 0.671, 9.5: 0.656, 9: 0.641, 8.5: 0.627, 8: 0.613, 7.5: 0.599, 7: 0.586, 6.5: 0.573, 6: 0.560, 5.5: 0.547, 5: 0.535 },
  12: { 10: 0.641, 9.5: 0.627, 9: 0.613, 8.5: 0.599, 8: 0.586, 7.5: 0.573, 7: 0.560, 6.5: 0.547, 6: 0.535, 5.5: 0.523, 5: 0.511 },
};

function rpeToPercentage(rpe: number, reps: number = 1): number {
  const clampedRpe = Math.max(5, Math.min(10, rpe));
  const roundedRpe = Math.round(clampedRpe * 2) / 2;
  const clampedReps = Math.max(1, Math.min(12, Math.round(reps)));
  return RPE_TABLE[clampedReps]?.[roundedRpe] ?? RPE_TABLE[1]?.[roundedRpe] ?? 0.9;
}

// ── Main Entry Point ─────────────────────────────────────────────────────

/**
 * Analyze completed sets and determine if weight should be adjusted.
 * Call after each set completion.
 */
export function regulateRPE(
  completedSets: SetLog[],
  prescription: ExercisePrescription,
  throttleLevel: ThrottleLevel,
  weightUnit: 'lbs' | 'kg' = 'lbs',
): RPERegulation | null {
  const done = completedSets.filter(s => s.completed);
  if (done.length < 2) return null; // need at least 2 sets to regulate

  const targetRpe = prescription.prescription.rpe;
  const targetReps = prescription.prescription.targetReps || 1;
  const lastTwo = done.slice(-2);
  const avgRpe = (lastTwo[0].rpe + lastTwo[1].rpe) / 2;
  const avgReps = Math.round((lastTwo[0].reps + lastTwo[1].reps) / 2) || targetReps;
  const currentWeight = lastTwo[lastTwo.length - 1].weight;
  const increment = weightUnit === 'kg' ? 2.5 : 5;
  const roundTo = (w: number) => Math.round(w / increment) * increment;

  // ── Detect grinding (RPE too high) ──
  if (avgRpe >= targetRpe + 1.5) {
    // Calculate suggested weight using rep-count-aware RPE-to-%1RM mapping
    const currentPct = rpeToPercentage(avgRpe, avgReps);
    const targetPct = rpeToPercentage(targetRpe, targetReps);
    const estimated1RM = currentWeight / currentPct;
    const suggestedWeight = roundTo(estimated1RM * targetPct);
    const dropAmount = currentWeight - suggestedWeight;

    if (dropAmount > 0) {
      return {
        type: 'drop',
        currentWeight,
        suggestedWeight,
        message: `Drop to ${suggestedWeight} ${weightUnit}`,
        reason: `Avg RPE ${avgRpe.toFixed(1)} over last 2 sets (target ${targetRpe}). ${dropAmount} ${weightUnit} lighter should bring you to target.`,
        confidence: avgRpe >= targetRpe + 2 ? 'high' : 'medium',
      };
    }
  }

  // ── Detect too easy (RPE too low) — only on green/peak days ──
  if (throttleLevel !== 'yellow' && throttleLevel !== 'orange' && throttleLevel !== 'red') {
    if (avgRpe <= targetRpe - 2) {
      const currentPct = rpeToPercentage(avgRpe, avgReps);
      const targetPct = rpeToPercentage(targetRpe, targetReps);
      const estimated1RM = currentWeight / currentPct;
      const suggestedWeight = roundTo(estimated1RM * targetPct);
      const bumpAmount = suggestedWeight - currentWeight;

      if (bumpAmount > 0) {
        return {
          type: 'bump',
          currentWeight,
          suggestedWeight,
          message: `Bump to ${suggestedWeight} ${weightUnit}`,
          reason: `Avg RPE ${avgRpe.toFixed(1)} over last 2 sets — you have headroom. +${bumpAmount} ${weightUnit} should hit RPE ${targetRpe}.`,
          confidence: avgRpe <= targetRpe - 2.5 ? 'high' : 'medium',
        };
      }
    }
  }

  // ── Dialed in ──
  return null;
}

/**
 * Quick check: should we show a regulation nudge after this set?
 */
export function shouldShowRegulation(
  completedSets: SetLog[],
  prescription: ExercisePrescription,
): boolean {
  const done = completedSets.filter(s => s.completed);
  if (done.length < 2) return false;
  const targetRpe = prescription.prescription.rpe;
  const lastTwo = done.slice(-2);
  const avgRpe = (lastTwo[0].rpe + lastTwo[1].rpe) / 2;
  return Math.abs(avgRpe - targetRpe) >= 1.5;
}
