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

// ── RPE to %1RM mapping (Helms et al. 2016) ─────────────────────────────

const RPE_TO_PCT: Record<number, number> = {
  10: 1.00,
  9.5: 0.977,
  9: 0.955,
  8.5: 0.939,
  8: 0.922,
  7.5: 0.906,
  7: 0.890,
  6.5: 0.874,
  6: 0.858,
  5.5: 0.842,
  5: 0.826,
};

function rpeToPercentage(rpe: number): number {
  const clamped = Math.max(5, Math.min(10, rpe));
  const rounded = Math.round(clamped * 2) / 2; // round to nearest 0.5
  return RPE_TO_PCT[rounded] ?? 0.9;
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
  const lastTwo = done.slice(-2);
  const avgRpe = (lastTwo[0].rpe + lastTwo[1].rpe) / 2;
  const currentWeight = lastTwo[lastTwo.length - 1].weight;
  const increment = weightUnit === 'kg' ? 2.5 : 5;
  const roundTo = (w: number) => Math.round(w / increment) * increment;

  // ── Detect grinding (RPE too high) ──
  if (avgRpe >= targetRpe + 1.5) {
    // Calculate suggested weight using RPE-to-percentage mapping
    const currentPct = rpeToPercentage(avgRpe);
    const targetPct = rpeToPercentage(targetRpe);
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
    if (avgRpe <= targetRpe - 2 && avgRpe <= 6) {
      const currentPct = rpeToPercentage(avgRpe);
      const targetPct = rpeToPercentage(targetRpe);
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
