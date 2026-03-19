/**
 * Dashboard Insights Engine — Surfaces analysis tool intelligence on the home dashboard.
 *
 * Pure functions. No React, no store, no side effects.
 *
 * Takes data that's already computed (ACWR, fatigue, strength metrics, plateaus,
 * volume gauges, PRs) and produces a ranked list of compact "insight tiles"
 * that preview what the deep-dive overlay tools have found.
 *
 * Design principle: every insight answers "so what?" — not just a number,
 * but what it means and what to do about it.
 */

import type { WorkoutLog, TrainingSession, WearableData, Mesocycle } from './types';
import type { EnhancedACWR } from './fatigue-metrics';
import type { FatigueDebt } from './smart-deload';
import type { HardMetrics, PlateauAnalysis, MuscleVolumeGauge, PREvent } from './progress-analytics';
import type { OverlayView } from '@/components/dashboard-types';

/** Filter out soft-deleted items */
function active<T>(arr: T[]): T[] {
  return arr.filter(item => !(item as Record<string, unknown>)._deleted);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardInsight {
  id: string;
  /** Lower = higher priority (show first) */
  priority: number;
  /** Lucide icon name */
  icon: 'activity' | 'zap' | 'trending_up' | 'trending_down' | 'shield' | 'alert_triangle' | 'target' | 'trophy' | 'bar_chart' | 'heart_pulse' | 'brain' | 'dumbbell';
  /** Tailwind color scheme */
  color: 'green' | 'blue' | 'yellow' | 'red' | 'purple' | 'amber' | 'emerald' | 'sky' | 'orange';
  /** Short label, e.g. "Training Load" */
  headline: string;
  /** Key metric value, e.g. "1.12" */
  value: string;
  /** Status interpretation, e.g. "Sweet Spot" */
  status: string;
  /** One-line explanation */
  body: string;
  /** Overlay to open on tap */
  target: OverlayView;
}

// ─── Input type ───────────────────────────────────────────────────────────────

export interface DashboardInsightsInput {
  acwr: EnhancedACWR | null;
  fatigueDebt: FatigueDebt | null;
  hardMetrics: HardMetrics | null;
  plateaus: PlateauAnalysis[];
  volumeGauges: MuscleVolumeGauge[];
  recentPRs: PREvent[];
  recoveryScore: number | null; // from wearable
  workoutCount: number; // total logs
  weeklyWorkoutCount: number; // this week
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACWR_ZONES = [
  { min: 0, max: 0.8, status: 'Undertraining', color: 'blue' as const, icon: 'trending_down' as const, body: 'Training load is below your baseline. Ramping up gradually could help you maintain your gains.' },
  { min: 0.8, max: 1.3, status: 'Sweet Spot', color: 'green' as const, icon: 'shield' as const, body: 'Optimal load zone — injury risk is lowest. Keep stacking quality sessions.' },
  { min: 1.3, max: 1.5, status: 'Caution', color: 'yellow' as const, icon: 'alert_triangle' as const, body: 'Elevated load. You can push short-term but watch for fatigue signals.' },
  { min: 1.5, max: 99, status: 'Danger Zone', color: 'red' as const, icon: 'alert_triangle' as const, body: 'Injury risk 2-4x higher. A deload or volume reduction could bring you back to the sweet spot.' },
];

// ─── Main function ────────────────────────────────────────────────────────────

export function generateDashboardInsights(input: DashboardInsightsInput): DashboardInsight[] {
  const insights: DashboardInsight[] = [];

  // Minimum data threshold — need at least 3 workouts for meaningful insights
  if (input.workoutCount < 3) return insights;

  // 1. ACWR (Training Load)
  if (input.acwr && input.acwr.status !== 'no_data') {
    const zone = ACWR_ZONES.find(z => input.acwr!.ratio >= z.min && input.acwr!.ratio < z.max) || ACWR_ZONES[3];
    const isUrgent = input.acwr.ratio >= 1.5;
    const isLow = input.acwr.ratio < 0.8;

    insights.push({
      id: 'acwr',
      priority: isUrgent ? 1 : isLow ? 8 : 5,
      icon: zone.icon,
      color: zone.color,
      headline: 'Training Load',
      value: input.acwr.ratio.toFixed(2),
      status: zone.status,
      body: zone.body,
      target: 'training_load',
    });
  }

  // 2. Fatigue Debt
  if (input.fatigueDebt && input.fatigueDebt.currentDebt > 25) {
    const debt = input.fatigueDebt.currentDebt;
    const trend = input.fatigueDebt.debtTrend;
    const trendArrow = trend === 'accumulating' ? '↑' : trend === 'recovering' ? '↓' : '→';
    const isHigh = debt >= 60;
    const isCritical = debt >= 80;

    insights.push({
      id: 'fatigue',
      priority: isCritical ? 1 : isHigh ? 3 : 7,
      icon: isCritical ? 'alert_triangle' : 'zap',
      color: isCritical ? 'red' : isHigh ? 'amber' : 'yellow',
      headline: 'Fatigue',
      value: `${debt}${trendArrow}`,
      status: isCritical ? 'Critical' : isHigh ? 'High' : trend === 'accumulating' ? 'Rising' : 'Moderate',
      body: isCritical
        ? `Fatigue at ${debt}/100 — a deload or rest period could help you recover and come back stronger.`
        : isHigh
          ? `Fatigue ${debt}/100 and ${trend}. Scheduling a deload within 1-2 weeks could keep progress on track.`
          : `Fatigue ${debt}/100 — normal for progressive training. ${trend === 'accumulating' ? 'Worth keeping an eye on the trend.' : 'Recovery on track.'}`,
      target: 'fatigue',
    });
  }

  // 3. Strength Trend
  if (input.hardMetrics) {
    const st = input.hardMetrics.strengthTrend;
    const isGaining = st.direction === 'up' && st.pct > 1;
    const isDeclining = st.direction === 'down';

    insights.push({
      id: 'strength',
      priority: isDeclining ? 4 : isGaining ? 6 : 9,
      icon: isDeclining ? 'trending_down' : 'trending_up',
      color: isDeclining ? 'red' : isGaining ? 'emerald' : 'sky',
      headline: 'Strength',
      value: `${st.pct > 0 ? '+' : ''}${st.value}%`,
      status: st.label,
      body: isDeclining
        ? 'Strength trending down — dialing in recovery, sleep, and nutrition could turn this around.'
        : isGaining
          ? `Strength up ${st.value}% over 4 weeks. Progressive overload working.`
          : 'Strength holding steady. Adding stimulus could spark new progress.',
      target: 'strength',
    });
  }

  // 4. Volume Zone — show the most critical muscle
  if (input.volumeGauges.length > 0) {
    // Prioritize: over_mrv > near_mrv > below_mev > productive
    const zonePriority = { over_mrv: 0, near_mrv: 1, below_mev: 2, productive: 3 };
    const sorted = [...input.volumeGauges].sort((a, b) => zonePriority[a.zone] - zonePriority[b.zone]);
    const top = sorted[0];

    if (top.zone !== 'productive') {
      const zoneConfig = {
        over_mrv: { color: 'red' as const, icon: 'alert_triangle' as const, status: 'Over MRV', body: `${top.label} at ${top.currentSets} sets/wk — exceeds recovery capacity (MRV: ${top.mrv}). Reducing volume could improve recovery and growth.` },
        near_mrv: { color: 'amber' as const, icon: 'bar_chart' as const, status: 'Near MRV', body: `${top.label} approaching max recoverable volume (${top.currentSets}/${top.mrv} sets). Worth monitoring fatigue closely.` },
        below_mev: { color: 'blue' as const, icon: 'bar_chart' as const, status: 'Below MEV', body: `${top.label} at ${top.currentSets} sets/wk — ${top.mev - top.currentSets} more sets to hit MEV (${top.mev}). Adding sets could drive growth.` },
      };
      const config = zoneConfig[top.zone];

      insights.push({
        id: 'volume',
        priority: top.zone === 'over_mrv' ? 2 : top.zone === 'near_mrv' ? 6 : 10,
        icon: config.icon,
        color: config.color,
        headline: top.label,
        value: `${top.currentSets} sets`,
        status: config.status,
        body: config.body,
        target: 'volume_map',
      });
    }
  }

  // 5. Plateau Detection — show the most stalled exercise
  if (input.plateaus.length > 0) {
    const worst = input.plateaus.sort((a, b) => b.weeksStalled - a.weeksStalled)[0];

    insights.push({
      id: 'plateau',
      priority: worst.weeksStalled >= 4 ? 3 : 7,
      icon: 'target',
      color: worst.weeksStalled >= 4 ? 'orange' : 'yellow',
      headline: worst.exerciseName.length > 16 ? worst.exerciseName.slice(0, 14) + '…' : worst.exerciseName,
      value: `${worst.weeksStalled}wk`,
      status: 'Stalled',
      body: `${worst.exerciseName} stalled for ${worst.weeksStalled} weeks. ${worst.prescription}`,
      target: 'strength',
    });
  }

  // 6. PR Velocity — recent PRs this week
  if (input.recentPRs.length > 0) {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeekPRs = input.recentPRs.filter(pr => pr.date.getTime() >= weekAgo);

    if (thisWeekPRs.length > 0) {
      const topPR = thisWeekPRs[0];
      const prNames = thisWeekPRs.slice(0, 2).map(p => p.exerciseName);

      insights.push({
        id: 'prs',
        priority: thisWeekPRs.length >= 3 ? 2 : 5,
        icon: 'trophy',
        color: thisWeekPRs.length >= 3 ? 'orange' : 'emerald',
        headline: 'PRs This Week',
        value: `${thisWeekPRs.length}`,
        status: thisWeekPRs.length >= 3 ? 'On Fire' : 'Progressing',
        body: thisWeekPRs.length === 1
          ? `PR on ${topPR.exerciseName} — ${topPR.type === 'weight' ? `+${topPR.delta}` : `+${topPR.delta} reps`}`
          : `${thisWeekPRs.length} PRs: ${prNames.join(', ')}${thisWeekPRs.length > 2 ? ` +${thisWeekPRs.length - 2} more` : ''}`,
        target: 'strength',
      });
    }
  }

  // 7. Wearable Recovery
  if (input.recoveryScore != null) {
    const score = input.recoveryScore;
    const isLow = score < 34;
    const isHigh = score >= 67;

    insights.push({
      id: 'recovery',
      priority: isLow ? 2 : isHigh ? 11 : 8,
      icon: 'heart_pulse',
      color: isLow ? 'red' : isHigh ? 'green' : 'yellow',
      headline: 'Recovery',
      value: `${score}%`,
      status: isLow ? 'Low' : isHigh ? 'Green' : 'Moderate',
      body: isLow
        ? 'Recovery is low — technique work or a lighter session could be a smart play today.'
        : isHigh
          ? 'Recovery is high — great day to push intensity.'
          : 'Moderate recovery — a good day to train smart and listen to your body.',
      target: 'recovery',
    });
  }

  // Sort by priority (lower = first) and cap at 5
  return insights.sort((a, b) => a.priority - b.priority).slice(0, 5);
}
