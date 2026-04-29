'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Zap,
  ShieldAlert,
  Lightbulb,
  ArrowRight,
  Minus,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getExerciseById, getExercisesByMuscle } from '@/lib/exercises';
import { VOLUME_LANDMARKS } from '@/lib/workout-generator';
import { cn } from '@/lib/utils';
import type { MuscleGroup, WorkoutLog } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

interface SplitAnalyzerProps {
  onClose: () => void;
}

type TimeRange = '4weeks' | '8weeks' | 'block';

type MovementPattern = 'push' | 'pull' | 'squat' | 'hinge' | 'carry' | 'rotation' | 'explosive';

type VolumeZone = 'untrained' | 'below_mev' | 'mev_to_mav' | 'mav_to_mrv' | 'above_mrv';

const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'quadriceps', 'hamstrings', 'glutes', 'calves',
  'core', 'forearms', 'traps',
];

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quadriceps: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
  forearms: 'Forearms',
  traps: 'Traps',
};

const UPPER_MUSCLES: MuscleGroup[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'traps'];
const LOWER_MUSCLES: MuscleGroup[] = ['quadriceps', 'hamstrings', 'glutes', 'calves'];
const ANTERIOR_MUSCLES: MuscleGroup[] = ['chest', 'quadriceps', 'biceps', 'core', 'shoulders'];
const POSTERIOR_MUSCLES: MuscleGroup[] = ['back', 'hamstrings', 'glutes', 'traps', 'calves'];

const MOVEMENT_PATTERN_LABELS: Record<MovementPattern, string> = {
  push: 'Push',
  pull: 'Pull',
  squat: 'Squat',
  hinge: 'Hinge',
  carry: 'Carry',
  rotation: 'Rotation',
  explosive: 'Explosive',
};

const MOVEMENT_PATTERN_COLORS: Record<MovementPattern, string> = {
  push: '#ef4444',
  pull: '#3b82f6',
  squat: '#22c55e',
  hinge: '#f59e0b',
  carry: '#a855f7',
  rotation: '#ec4899',
  explosive: '#06b6d4',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

// ---------------------------------------------------------------------------
// Helper: get volume zone
// ---------------------------------------------------------------------------

function getVolumeZone(sets: number, landmarks: { mev: number; mav: number; mrv: number }): VolumeZone {
  if (sets === 0) return 'untrained';
  if (sets < landmarks.mev) return 'below_mev';
  if (sets <= landmarks.mav) return 'mev_to_mav';
  if (sets <= landmarks.mrv) return 'mav_to_mrv';
  return 'above_mrv';
}

function getZoneBarColor(zone: VolumeZone): string {
  switch (zone) {
    case 'untrained': return 'bg-grappler-600';
    case 'below_mev': return 'bg-red-500';
    case 'mev_to_mav': return 'bg-yellow-500';
    case 'mav_to_mrv': return 'bg-emerald-500';
    case 'above_mrv': return 'bg-orange-500';
  }
}

function getZoneTextColor(zone: VolumeZone): string {
  switch (zone) {
    case 'untrained': return 'text-grappler-500';
    case 'below_mev': return 'text-red-400';
    case 'mev_to_mav': return 'text-yellow-400';
    case 'mav_to_mrv': return 'text-emerald-400';
    case 'above_mrv': return 'text-orange-400';
  }
}

function getZoneLabel(zone: VolumeZone): string {
  switch (zone) {
    case 'untrained': return 'No Data';
    case 'below_mev': return 'Under MEV';
    case 'mev_to_mav': return 'Maintenance';
    case 'mav_to_mrv': return 'Optimal';
    case 'above_mrv': return 'Overreaching';
  }
}

// ---------------------------------------------------------------------------
// Helper: suggest exercises for a muscle
// ---------------------------------------------------------------------------

function getExerciseSuggestionsForMuscle(muscle: MuscleGroup): string[] {
  const available = getExercisesByMuscle(muscle);
  const primary = available.filter(e => e.primaryMuscles.includes(muscle));
  const sorted = primary.sort((a, b) => (b.strengthValue || 0) - (a.strengthValue || 0));
  return sorted.slice(0, 2).map(e => e.name);
}

// ---------------------------------------------------------------------------
// Core analysis functions
// ---------------------------------------------------------------------------

interface WeekBucket {
  weekLabel: string;
  startDate: Date;
  endDate: Date;
  muscleVolumes: Record<string, number>;
  totalSets: number;
  movementPatterns: Record<MovementPattern, number>;
}

function getFilteredLogs(
  workoutLogs: WorkoutLog[],
  timeRange: TimeRange,
  mesocycleStartDate: Date | null,
): WorkoutLog[] {
  const now = new Date();
  let cutoff: Date;

  if (timeRange === 'block' && mesocycleStartDate) {
    cutoff = new Date(mesocycleStartDate);
  } else if (timeRange === '8weeks') {
    cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 56);
  } else {
    cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 28);
  }

  return workoutLogs.filter(
    log => log.completed && new Date(log.date).getTime() >= cutoff.getTime()
  );
}

function bucketIntoWeeks(logs: WorkoutLog[], timeRange: TimeRange, mesocycleStartDate: Date | null): WeekBucket[] {
  const now = new Date();
  let rangeStart: Date;

  if (timeRange === 'block' && mesocycleStartDate) {
    rangeStart = new Date(mesocycleStartDate);
  } else if (timeRange === '8weeks') {
    rangeStart = new Date(now);
    rangeStart.setDate(rangeStart.getDate() - 56);
  } else {
    rangeStart = new Date(now);
    rangeStart.setDate(rangeStart.getDate() - 28);
  }

  // Build week buckets from rangeStart to now
  const buckets: WeekBucket[] = [];
  const current = new Date(rangeStart);
  let weekNum = 1;

  while (current.getTime() < now.getTime()) {
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const muscleVolumes: Record<string, number> = {};
    for (const mg of MUSCLE_GROUPS) muscleVolumes[mg] = 0;

    const movementPatterns: Record<MovementPattern, number> = {
      push: 0, pull: 0, squat: 0, hinge: 0, carry: 0, rotation: 0, explosive: 0,
    };

    let totalSets = 0;

    // Gather logs for this week
    const weekLogs = logs.filter(log => {
      const d = new Date(log.date).getTime();
      return d >= current.getTime() && d < weekEnd.getTime();
    });

    for (const log of weekLogs) {
      for (const ex of log.exercises) {
        const exerciseData = getExerciseById(ex.exerciseId);
        if (!exerciseData) continue;

        const completedSets = ex.sets.filter(s => s.completed).length;
        if (completedSets === 0) continue;

        totalSets += completedSets;

        // Movement pattern
        const pattern = exerciseData.movementPattern as MovementPattern;
        if (pattern in movementPatterns) {
          movementPatterns[pattern] += completedSets;
        }

        // full_body handling
        const isPrimaryFullBody = exerciseData.primaryMuscles.includes('full_body');
        const isSecondaryFullBody = exerciseData.secondaryMuscles.includes('full_body');

        if (isPrimaryFullBody) {
          for (const mg of MUSCLE_GROUPS) {
            muscleVolumes[mg] += completedSets * 0.5;
          }
        } else {
          for (const muscle of exerciseData.primaryMuscles) {
            if (muscle !== 'full_body' && muscle in muscleVolumes) {
              muscleVolumes[muscle] += completedSets;
            }
          }
        }

        if (isSecondaryFullBody) {
          for (const mg of MUSCLE_GROUPS) {
            muscleVolumes[mg] += completedSets * 0.25;
          }
        } else {
          for (const muscle of exerciseData.secondaryMuscles) {
            if (muscle !== 'full_body' && muscle in muscleVolumes) {
              muscleVolumes[muscle] += completedSets * 0.5;
            }
          }
        }
      }
    }

    buckets.push({
      weekLabel: `W${weekNum}`,
      startDate: new Date(current),
      endDate: new Date(weekEnd),
      muscleVolumes,
      totalSets,
      movementPatterns,
    });

    current.setDate(current.getDate() + 7);
    weekNum++;
  }

  return buckets;
}

interface MuscleAnalysis {
  muscle: MuscleGroup;
  label: string;
  avgWeeklySets: number;
  landmarks: { mev: number; mav: number; mrv: number };
  zone: VolumeZone;
  deficit: number; // negative = below MEV, positive = above MRV, 0 = in range
}

function analyzeMuscles(weekBuckets: WeekBucket[]): MuscleAnalysis[] {
  const weekCount = Math.max(weekBuckets.length, 1);

  return MUSCLE_GROUPS.map(mg => {
    const totalSets = weekBuckets.reduce((sum, w) => sum + (w.muscleVolumes[mg] || 0), 0);
    const avgWeeklySets = Math.round((totalSets / weekCount) * 10) / 10;
    const landmarks = VOLUME_LANDMARKS[mg] || { mev: 4, mav: 10, mrv: 16 };
    const zone = getVolumeZone(avgWeeklySets, landmarks);

    let deficit = 0;
    if (avgWeeklySets < landmarks.mev) {
      deficit = avgWeeklySets - landmarks.mev; // negative
    } else if (avgWeeklySets > landmarks.mrv) {
      deficit = avgWeeklySets - landmarks.mrv; // positive
    }

    return {
      muscle: mg,
      label: MUSCLE_LABELS[mg] || mg,
      avgWeeklySets,
      landmarks,
      zone,
      deficit,
    };
  });
}

function computeBalanceScore(muscles: MuscleAnalysis[]): number {
  // Score 0-100 based on how many muscles are in optimal or maintenance zone
  let totalScore = 0;

  for (const m of muscles) {
    const { avgWeeklySets, landmarks } = m;
    const optimalCenter = (landmarks.mav + landmarks.mrv) / 2;
    const optimalRange = landmarks.mrv - landmarks.mev;

    if (optimalRange === 0) {
      totalScore += 100;
      continue;
    }

    const distance = Math.abs(avgWeeklySets - optimalCenter);
    const normalizedDistance = distance / optimalRange;
    const muscleScore = Math.max(0, 100 - normalizedDistance * 100);
    totalScore += muscleScore;
  }

  return Math.round(totalScore / muscles.length);
}

function computeRatio(
  weekBuckets: WeekBucket[],
  groupA: MuscleGroup[],
  groupB: MuscleGroup[],
): { a: number; b: number; ratio: string } {
  const weekCount = Math.max(weekBuckets.length, 1);

  let aSets = 0;
  let bSets = 0;

  for (const week of weekBuckets) {
    for (const mg of groupA) aSets += week.muscleVolumes[mg] || 0;
    for (const mg of groupB) bSets += week.muscleVolumes[mg] || 0;
  }

  const aAvg = aSets / weekCount;
  const bAvg = bSets / weekCount;

  if (aAvg === 0 && bAvg === 0) return { a: 0, b: 0, ratio: '0:0' };
  if (bAvg === 0) return { a: Math.round(aAvg), b: 0, ratio: `${Math.round(aAvg)}:0` };

  const normalized = aAvg / bAvg;
  return {
    a: Math.round(aAvg * 10) / 10,
    b: Math.round(bAvg * 10) / 10,
    ratio: `${normalized.toFixed(1)}:1`,
  };
}

function computePushPullRatio(weekBuckets: WeekBucket[]): { a: number; b: number; ratio: string } {
  const weekCount = Math.max(weekBuckets.length, 1);

  let pushSets = 0;
  let pullSets = 0;

  for (const week of weekBuckets) {
    pushSets += week.movementPatterns.push || 0;
    pullSets += week.movementPatterns.pull || 0;
  }

  const pushAvg = pushSets / weekCount;
  const pullAvg = pullSets / weekCount;

  if (pushAvg === 0 && pullAvg === 0) return { a: 0, b: 0, ratio: '0:0' };
  if (pullAvg === 0) return { a: Math.round(pushAvg), b: 0, ratio: `${Math.round(pushAvg)}:0` };

  const normalized = pushAvg / pullAvg;
  return {
    a: Math.round(pushAvg * 10) / 10,
    b: Math.round(pullAvg * 10) / 10,
    ratio: `${normalized.toFixed(1)}:1`,
  };
}

interface Recommendation {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  fix: string;
}

function generateRecommendations(
  muscles: MuscleAnalysis[],
  pushPull: { a: number; b: number },
  upperLower: { a: number; b: number },
  anteriorPosterior: { a: number; b: number },
): Recommendation[] {
  const recs: Recommendation[] = [];

  // 1. Neglected muscles (below MEV)
  const neglected = muscles
    .filter(m => m.zone === 'below_mev' || m.zone === 'untrained')
    .sort((a, b) => a.deficit - b.deficit);

  for (const m of neglected.slice(0, 2)) {
    const suggestions = getExerciseSuggestionsForMuscle(m.muscle);
    const deficitAmt = Math.abs(Math.round(m.deficit));
    recs.push({
      title: `${m.label} volume is ${deficitAmt} sets below MEV`,
      description: `You are averaging ${m.avgWeeklySets} sets/week for ${m.label.toLowerCase()}, but the minimum effective volume is ${m.landmarks.mev} sets.`,
      impact: 'high',
      fix: suggestions.length > 0
        ? `Add ${deficitAmt}+ sets of ${suggestions.join(' or ')} per week.`
        : `Add ${deficitAmt}+ direct sets for ${m.label.toLowerCase()} per week.`,
    });
  }

  // 2. Overreaching muscles
  const overreaching = muscles.filter(m => m.zone === 'above_mrv');
  for (const m of overreaching.slice(0, 1)) {
    const excess = Math.round(m.avgWeeklySets - m.landmarks.mrv);
    recs.push({
      title: `${m.label} exceeds MRV by ${excess} sets`,
      description: `${m.avgWeeklySets} sets/week exceeds the maximum recoverable volume of ${m.landmarks.mrv}. This may impair recovery.`,
      impact: 'medium',
      fix: `Reduce ${m.label.toLowerCase()} volume by ${excess} sets/week or add a deload week.`,
    });
  }

  // 3. Push/Pull imbalance
  if (pushPull.a > 0 && pushPull.b > 0) {
    const ppRatio = pushPull.a / pushPull.b;
    if (ppRatio > 1.5) {
      recs.push({
        title: 'Push-dominant imbalance detected',
        description: `Your push:pull ratio is ${ppRatio.toFixed(1)}:1. Ideally it should be close to 1:1 to prevent shoulder imbalances.`,
        impact: 'high',
        fix: 'Add more rowing and pull-up variations to balance your pressing volume.',
      });
    } else if (ppRatio < 0.67) {
      recs.push({
        title: 'Pull-dominant imbalance detected',
        description: `Your push:pull ratio is ${ppRatio.toFixed(1)}:1. You may benefit from more pressing work.`,
        impact: 'medium',
        fix: 'Add more bench press, overhead press, or push-up variations.',
      });
    }
  }

  // 4. Upper/Lower imbalance
  if (upperLower.a > 0 && upperLower.b > 0) {
    const ulRatio = upperLower.a / upperLower.b;
    if (ulRatio > 2.0) {
      recs.push({
        title: 'Upper body dominant training split',
        description: `Your upper:lower set ratio is ${ulRatio.toFixed(1)}:1. Lower body training is significantly lagging.`,
        impact: 'high',
        fix: 'Add a dedicated leg day or include more squats, lunges, and hip hinge movements.',
      });
    } else if (ulRatio < 0.5) {
      recs.push({
        title: 'Lower body dominant training split',
        description: `Your upper:lower ratio is ${ulRatio.toFixed(1)}:1. Consider adding more upper body work.`,
        impact: 'medium',
        fix: 'Add pressing and pulling movements to balance your training.',
      });
    }
  }

  // 5. Anterior/Posterior
  if (anteriorPosterior.a > 0 && anteriorPosterior.b > 0) {
    const apRatio = anteriorPosterior.a / anteriorPosterior.b;
    if (apRatio > 1.6) {
      recs.push({
        title: 'Anterior chain overdeveloped',
        description: `Front-to-back ratio is ${apRatio.toFixed(1)}:1. This can lead to postural issues and shoulder problems.`,
        impact: 'medium',
        fix: 'Prioritize posterior chain work: rows, face pulls, Romanian deadlifts, and glute bridges.',
      });
    }
  }

  // If everything looks good
  if (recs.length === 0) {
    recs.push({
      title: 'Your training split looks well-balanced',
      description: 'All muscle groups are within recommended volume ranges and ratios are healthy.',
      impact: 'low',
      fix: 'Keep up the good work! Consider progressive overload to continue making gains.',
    });
  }

  return recs.slice(0, 5);
}

// ---------------------------------------------------------------------------
// SVG Donut Chart Component
// ---------------------------------------------------------------------------

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

function DonutChart({ segments, size = 180 }: { segments: DonutSegment[]; size?: number }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  const radius = size / 2 - 10;
  const center = size / 2;
  const strokeWidth = 28;
  const innerRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * innerRadius;

  let cumulativePercent = 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg, i) => {
          const percent = seg.value / total;
          const dashLength = percent * circumference;
          const dashOffset = -cumulativePercent * circumference;
          cumulativePercent += percent;

          return (
            <circle
              key={i}
              cx={center}
              cy={center}
              r={innerRadius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${center} ${center})`}
              className="transition-all duration-500"
            />
          );
        })}
        <text
          x={center}
          y={center - 6}
          textAnchor="middle"
          className="fill-grappler-50 text-sm font-bold"
          fontSize="14"
        >
          {total}
        </text>
        <text
          x={center}
          y={center + 10}
          textAnchor="middle"
          className="fill-grappler-400 text-xs"
          fontSize="10"
        >
          total sets/wk
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5">
        {segments.filter(s => s.value > 0).map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-grappler-300">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: seg.color }}
            />
            <span>{seg.label}</span>
            <span className="text-grappler-500">({Math.round((seg.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SVG Stacked Bar Chart Component
// ---------------------------------------------------------------------------

function StackedBarChart({ weekBuckets }: { weekBuckets: WeekBucket[] }) {
  if (weekBuckets.length === 0) return null;

  const maxSets = Math.max(...weekBuckets.map(w => w.totalSets), 1);
  const barWidth = Math.min(40, Math.max(20, 280 / weekBuckets.length));
  const chartHeight = 160;
  const chartWidth = weekBuckets.length * (barWidth + 8) + 40;
  const paddingLeft = 32;
  const paddingBottom = 24;

  // Choose a subset of muscle groups for coloring (top 6 by total volume)
  const muscleTotals: { muscle: string; total: number; color: string }[] = MUSCLE_GROUPS.map((mg, i) => ({
    muscle: mg,
    total: weekBuckets.reduce((sum, w) => sum + (w.muscleVolumes[mg] || 0), 0),
    color: [
      '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7',
      '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#e879f9',
      '#14b8a6', '#fb923c',
    ][i] || '#6b7280',
  }));

  const topMuscles = muscleTotals
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
  const topMuscleKeys = topMuscles.map(m => m.muscle);

  return (
    <div className="overflow-x-auto">
      <svg
        width={Math.max(chartWidth, 280)}
        height={chartHeight + paddingBottom + 8}
        viewBox={`0 0 ${Math.max(chartWidth, 280)} ${chartHeight + paddingBottom + 8}`}
      >
        {/* Y-axis grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => {
          const y = chartHeight - frac * chartHeight;
          return (
            <g key={frac}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={Math.max(chartWidth, 280) - 8}
                y2={y}
                stroke="#374151"
                strokeDasharray="2,3"
              />
              <text
                x={paddingLeft - 4}
                y={y + 3}
                textAnchor="end"
                className="fill-grappler-500"
                fontSize="9"
              >
                {Math.round(frac * maxSets)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {weekBuckets.map((week, wi) => {
          const x = paddingLeft + wi * (barWidth + 8) + 4;
          let yOffset = 0;

          return (
            <g key={wi}>
              {topMuscleKeys.map(mg => {
                const sets = week.muscleVolumes[mg] || 0;
                const height = (sets / maxSets) * chartHeight;
                const y = chartHeight - yOffset - height;
                yOffset += height;
                const color = topMuscles.find(m => m.muscle === mg)?.color || '#6b7280';

                return (
                  <rect
                    key={mg}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(height, 0)}
                    fill={color}
                    rx={2}
                    className="transition-all duration-300"
                  />
                );
              })}
              {/* Remaining ("other") muscles */}
              {(() => {
                const otherSets = MUSCLE_GROUPS
                  .filter(mg => !topMuscleKeys.includes(mg))
                  .reduce((sum, mg) => sum + (week.muscleVolumes[mg] || 0), 0);
                const height = (otherSets / maxSets) * chartHeight;
                const y = chartHeight - yOffset - height;
                return otherSets > 0 ? (
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(height, 0)}
                    fill="#4b5563"
                    rx={2}
                  />
                ) : null;
              })()}
              {/* Week label */}
              <text
                x={x + barWidth / 2}
                y={chartHeight + 14}
                textAnchor="middle"
                className="fill-grappler-400"
                fontSize="10"
              >
                {week.weekLabel}
              </text>
            </g>
          );
        })}
      </svg>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 px-1">
        {topMuscles.map(m => (
          <div key={m.muscle} className="flex items-center gap-1 text-xs text-grappler-400">
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: m.color }} />
            <span>{MUSCLE_LABELS[m.muscle] || m.muscle}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ratio Gauge Component
// ---------------------------------------------------------------------------

function RatioGauge({
  label,
  sideALabel,
  sideBLabel,
  a,
  b,
  idealMin,
  idealMax,
}: {
  label: string;
  sideALabel: string;
  sideBLabel: string;
  a: number;
  b: number;
  idealMin: number;
  idealMax: number;
}) {
  const total = a + b;
  if (total === 0) {
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-grappler-300">{label}</span>
          <span className="text-grappler-500">No data</span>
        </div>
        <div className="h-3 rounded-full bg-grappler-800" />
      </div>
    );
  }

  const ratio = b > 0 ? a / b : a;
  const isBalanced = ratio >= idealMin && ratio <= idealMax;
  const percentA = (a / total) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-grappler-300">{label}</span>
        <span className={cn(
          'font-medium',
          isBalanced ? 'text-emerald-400' : 'text-yellow-400'
        )}>
          {ratio.toFixed(1)}:1 {isBalanced ? '' : '(imbalanced)'}
        </span>
      </div>
      <div className="relative h-3 rounded-full bg-grappler-800 overflow-hidden">
        <div
          className={cn(
            'absolute left-0 top-0 h-full rounded-l-full transition-all duration-500',
            isBalanced ? 'bg-emerald-500/70' : 'bg-yellow-500/70'
          )}
          style={{ width: `${percentA}%` }}
        />
        <div
          className={cn(
            'absolute right-0 top-0 h-full rounded-r-full transition-all duration-500',
            isBalanced ? 'bg-emerald-500/40' : 'bg-blue-500/40'
          )}
          style={{ width: `${100 - percentA}%` }}
        />
        {/* Center line indicating ideal 50/50 */}
        <div className="absolute left-1/2 top-0 h-full w-px bg-grappler-400/50" />
      </div>
      <div className="flex justify-between text-xs text-grappler-500">
        <span>{sideALabel}: {Math.round(a)}</span>
        <span>{sideBLabel}: {Math.round(b)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function SplitAnalyzer({ onClose }: SplitAnalyzerProps) {
  const { workoutLogs, currentMesocycle } = useAppStore();
  const [timeRange, setTimeRange] = useState<TimeRange>('4weeks');

  const mesocycleStartDate = useMemo(() => {
    if (!currentMesocycle) return null;
    return currentMesocycle.startDate ? new Date(currentMesocycle.startDate) : null;
  }, [currentMesocycle]);

  const filteredLogs = useMemo(
    () => getFilteredLogs(workoutLogs, timeRange, mesocycleStartDate),
    [workoutLogs, timeRange, mesocycleStartDate]
  );

  const weekBuckets = useMemo(
    () => bucketIntoWeeks(filteredLogs, timeRange, mesocycleStartDate),
    [filteredLogs, timeRange, mesocycleStartDate]
  );

  const muscleAnalysis = useMemo(() => analyzeMuscles(weekBuckets), [weekBuckets]);
  const balanceScore = useMemo(() => computeBalanceScore(muscleAnalysis), [muscleAnalysis]);

  const pushPullRatio = useMemo(() => computePushPullRatio(weekBuckets), [weekBuckets]);
  const upperLowerRatio = useMemo(
    () => computeRatio(weekBuckets, UPPER_MUSCLES, LOWER_MUSCLES),
    [weekBuckets]
  );
  const anteriorPosteriorRatio = useMemo(
    () => computeRatio(weekBuckets, ANTERIOR_MUSCLES, POSTERIOR_MUSCLES),
    [weekBuckets]
  );

  const neglectedMuscles = useMemo(
    () => muscleAnalysis
      .filter(m => m.zone === 'below_mev' || m.zone === 'untrained')
      .sort((a, b) => a.deficit - b.deficit),
    [muscleAnalysis]
  );

  const movementPatternData = useMemo(() => {
    const weekCount = Math.max(weekBuckets.length, 1);
    const totals: Record<MovementPattern, number> = {
      push: 0, pull: 0, squat: 0, hinge: 0, carry: 0, rotation: 0, explosive: 0,
    };
    for (const week of weekBuckets) {
      for (const pattern of Object.keys(totals) as MovementPattern[]) {
        totals[pattern] += week.movementPatterns[pattern] || 0;
      }
    }
    return (Object.keys(totals) as MovementPattern[]).map(p => ({
      label: MOVEMENT_PATTERN_LABELS[p],
      value: Math.round((totals[p] / weekCount) * 10) / 10,
      color: MOVEMENT_PATTERN_COLORS[p],
    }));
  }, [weekBuckets]);

  const recommendations = useMemo(
    () => generateRecommendations(muscleAnalysis, pushPullRatio, upperLowerRatio, anteriorPosteriorRatio),
    [muscleAnalysis, pushPullRatio, upperLowerRatio, anteriorPosteriorRatio]
  );

  const hasData = filteredLogs.length > 0;

  const timeRangeOptions: { key: TimeRange; label: string }[] = [
    { key: '4weeks', label: 'Last 4 Weeks' },
    { key: '8weeks', label: 'Last 8 Weeks' },
    { key: 'block', label: 'Current Block' },
  ];

  const impactColors: Record<string, { text: string; bg: string }> = {
    high: { text: 'text-red-400', bg: 'bg-red-500/20' },
    medium: { text: 'text-yellow-400', bg: 'bg-yellow-500/20' },
    low: { text: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  };

  return (
    <motion.div
      className="min-h-screen bg-grappler-900 pb-24 safe-area-top"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-grappler-900 border-b border-grappler-800">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              aria-label="Go back"
              onClick={onClose}
              className="p-2 -ml-2 rounded-lg hover:bg-grappler-800 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-grappler-200" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-grappler-50">Split Analyzer</h1>
              <p className="text-xs text-grappler-400">
                Training balance and muscle group coverage
              </p>
            </div>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="px-4 pb-3">
          <div className="flex gap-1 bg-grappler-800 rounded-lg p-1">
            {timeRangeOptions.map(opt => (
              <button
                key={opt.key}
                onClick={() => setTimeRange(opt.key)}
                disabled={opt.key === 'block' && !mesocycleStartDate}
                className={cn(
                  'flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all',
                  timeRange === opt.key
                    ? 'bg-grappler-700 text-grappler-50 shadow-sm'
                    : 'text-grappler-400 hover:text-grappler-300',
                  opt.key === 'block' && !mesocycleStartDate && 'opacity-40 cursor-not-allowed'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {!hasData ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <BarChart3 className="w-12 h-12 text-grappler-600 mb-4" />
          <h2 className="text-lg font-semibold text-grappler-200 mb-2">No Training Data</h2>
          <p className="text-grappler-400 text-sm max-w-xs">
            No training data found for this period. Complete some workouts to see your split analysis.
          </p>
        </div>
      ) : (
        <motion.div
          className="px-4 py-4 space-y-5"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* ================================================================
              Section 1: Volume Distribution Heatmap
              ================================================================ */}
          <motion.div variants={itemVariants} className="card p-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-primary-400" />
              <h2 className="text-sm font-semibold text-grappler-50">Volume Distribution</h2>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 mb-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-red-500" />
                <span className="text-grappler-400">Below MEV</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-yellow-500" />
                <span className="text-grappler-400">Maintenance</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                <span className="text-grappler-400">Optimal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-orange-500" />
                <span className="text-grappler-400">Overreaching</span>
              </div>
            </div>

            <div className="space-y-2.5">
              {muscleAnalysis.map(m => {
                const barPercent = m.landmarks.mrv > 0
                  ? Math.min((m.avgWeeklySets / m.landmarks.mrv) * 100, 120)
                  : 0;

                return (
                  <div key={m.muscle} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-grappler-300 w-20 shrink-0">{m.label}</span>
                      <span className={cn('font-medium tabular-nums', getZoneTextColor(m.zone))}>
                        {m.avgWeeklySets} sets/wk
                      </span>
                      <span className="text-grappler-500 text-xs w-16 text-right">
                        {getZoneLabel(m.zone)}
                      </span>
                    </div>
                    <div className="relative h-2.5 rounded-full bg-grappler-800 overflow-hidden">
                      {/* MEV marker */}
                      {m.landmarks.mrv > 0 && (
                        <div
                          className="absolute top-0 h-full w-px bg-grappler-500/50 z-10"
                          style={{ left: `${(m.landmarks.mev / m.landmarks.mrv) * 100}%` }}
                        />
                      )}
                      {/* MAV marker */}
                      {m.landmarks.mrv > 0 && (
                        <div
                          className="absolute top-0 h-full w-px bg-grappler-500/50 z-10"
                          style={{ left: `${(m.landmarks.mav / m.landmarks.mrv) * 100}%` }}
                        />
                      )}
                      {/* MRV marker (right edge = 100%) */}
                      <div
                        className="absolute top-0 h-full w-px bg-grappler-500/50 z-10"
                        style={{ left: '100%' }}
                      />
                      {/* Volume bar */}
                      <div
                        className={cn(
                          'absolute left-0 top-0 h-full rounded-full transition-all duration-500',
                          getZoneBarColor(m.zone)
                        )}
                        style={{ width: `${Math.max(barPercent, 2)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-grappler-600 px-0.5">
                      <span>0</span>
                      <span>MEV:{m.landmarks.mev}</span>
                      <span>MAV:{m.landmarks.mav}</span>
                      <span>MRV:{m.landmarks.mrv}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* ================================================================
              Section 2: Balance Score Card
              ================================================================ */}
          <motion.div variants={itemVariants} className="card p-4">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-primary-400" />
              <h2 className="text-sm font-semibold text-grappler-50">Balance Score</h2>
            </div>

            {/* Score Ring */}
            <div className="flex items-center justify-center mb-5">
              <div className="relative">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  {/* Background ring */}
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="#1f2937"
                    strokeWidth="10"
                  />
                  {/* Score ring */}
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke={
                      balanceScore >= 75
                        ? '#22c55e'
                        : balanceScore >= 50
                        ? '#eab308'
                        : '#ef4444'
                    }
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(balanceScore / 100) * (2 * Math.PI * 50)} ${2 * Math.PI * 50}`}
                    transform="rotate(-90 60 60)"
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className={cn(
                      'text-2xl font-bold',
                      balanceScore >= 75
                        ? 'text-emerald-400'
                        : balanceScore >= 50
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    )}
                  >
                    {balanceScore}
                  </span>
                  <span className="text-xs text-grappler-400">/ 100</span>
                </div>
              </div>
            </div>

            {/* Ratio Gauges */}
            <div className="space-y-4">
              <RatioGauge
                label="Push : Pull"
                sideALabel="Push"
                sideBLabel="Pull"
                a={pushPullRatio.a}
                b={pushPullRatio.b}
                idealMin={0.7}
                idealMax={1.3}
              />
              <RatioGauge
                label="Upper : Lower"
                sideALabel="Upper"
                sideBLabel="Lower"
                a={upperLowerRatio.a}
                b={upperLowerRatio.b}
                idealMin={0.7}
                idealMax={1.5}
              />
              <RatioGauge
                label="Anterior : Posterior"
                sideALabel="Front"
                sideBLabel="Back"
                a={anteriorPosteriorRatio.a}
                b={anteriorPosteriorRatio.b}
                idealMin={0.7}
                idealMax={1.4}
              />
            </div>
          </motion.div>

          {/* ================================================================
              Section 3: Neglected Muscles Alert
              ================================================================ */}
          {neglectedMuscles.length > 0 && (
            <motion.div variants={itemVariants} className="card p-4">
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <h2 className="text-sm font-semibold text-grappler-50">Neglected Muscles</h2>
                <span className="ml-auto text-xs text-red-400 font-medium">
                  {neglectedMuscles.length} below MEV
                </span>
              </div>

              <div className="space-y-3">
                {neglectedMuscles.map(m => {
                  const suggestions = getExerciseSuggestionsForMuscle(m.muscle);
                  const deficitAmt = Math.round(Math.abs(m.deficit));

                  return (
                    <div
                      key={m.muscle}
                      className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-grappler-100">{m.label}</span>
                        <span className="text-xs text-red-400 font-medium">
                          {deficitAmt} sets deficit
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs">
                        <div>
                          <span className="text-grappler-500">Current: </span>
                          <span className="text-grappler-300">{m.avgWeeklySets} sets/wk</span>
                        </div>
                        <div>
                          <span className="text-grappler-500">MEV: </span>
                          <span className="text-grappler-300">{m.landmarks.mev} sets/wk</span>
                        </div>
                      </div>
                      {suggestions.length > 0 && (
                        <div className="flex items-start gap-1.5 text-xs">
                          <Zap className="w-3 h-3 text-yellow-400 mt-0.5 shrink-0" />
                          <span className="text-grappler-400">
                            Quick fix: Add {suggestions.join(' or ')}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ================================================================
              Section 4: Movement Pattern Breakdown
              ================================================================ */}
          <motion.div variants={itemVariants} className="card p-4">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-primary-400" />
              <h2 className="text-sm font-semibold text-grappler-50">Movement Patterns</h2>
            </div>

            <DonutChart segments={movementPatternData} size={190} />

            <div className="mt-3 text-xs text-grappler-500 text-center">
              Aim for balanced push/pull with adequate hinge and squat work
            </div>
          </motion.div>

          {/* ================================================================
              Section 5: Week-over-Week Trend
              ================================================================ */}
          <motion.div variants={itemVariants} className="card p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-primary-400" />
              <h2 className="text-sm font-semibold text-grappler-50">Weekly Volume Trend</h2>
            </div>

            {weekBuckets.length > 0 ? (
              <>
                <StackedBarChart weekBuckets={weekBuckets} />
                {/* Trend indicator */}
                {weekBuckets.length >= 2 && (() => {
                  const lastWeek = weekBuckets[weekBuckets.length - 1].totalSets;
                  const prevWeek = weekBuckets[weekBuckets.length - 2].totalSets;
                  const diff = lastWeek - prevWeek;
                  const pctChange = prevWeek > 0
                    ? Math.round((diff / prevWeek) * 100)
                    : 0;

                  return (
                    <div className="mt-3 flex items-center justify-center gap-2 text-xs">
                      {diff > 0 ? (
                        <>
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">
                            +{pctChange}% vs previous week ({Math.round(lastWeek)} sets)
                          </span>
                        </>
                      ) : diff < 0 ? (
                        <>
                          <TrendingDown className="w-3.5 h-3.5 text-yellow-400" />
                          <span className="text-yellow-400">
                            {pctChange}% vs previous week ({Math.round(lastWeek)} sets)
                          </span>
                        </>
                      ) : (
                        <>
                          <Minus className="w-3.5 h-3.5 text-grappler-400" />
                          <span className="text-grappler-400">
                            Volume steady ({Math.round(lastWeek)} sets)
                          </span>
                        </>
                      )}
                    </div>
                  );
                })()}
              </>
            ) : (
              <p className="text-xs text-grappler-500 text-center py-4">
                Not enough weeks of data to show trends.
              </p>
            )}
          </motion.div>

          {/* ================================================================
              Section 6: Smart Recommendations
              ================================================================ */}
          <motion.div variants={itemVariants} className="card p-4">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              <h2 className="text-sm font-semibold text-grappler-50">Recommendations</h2>
            </div>

            <div className="space-y-3">
              {recommendations.map((rec, i) => {
                const colors = impactColors[rec.impact] || impactColors.low;
                return (
                  <div
                    key={i}
                    className="bg-grappler-800/60 border border-grappler-700 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-start gap-2">
                      <div className={cn('shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-xs font-semibold uppercase', colors.bg, colors.text)}>
                        {rec.impact}
                      </div>
                      <span className="text-sm font-medium text-grappler-100">{rec.title}</span>
                    </div>
                    <p className="text-xs text-grappler-400 leading-relaxed">{rec.description}</p>
                    <div className="flex items-start gap-1.5 text-xs bg-grappler-900/50 rounded-md px-2.5 py-2">
                      <ArrowRight className="w-3 h-3 text-primary-400 mt-0.5 shrink-0" />
                      <span className="text-grappler-300">{rec.fix}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Footer note */}
          <motion.div variants={itemVariants} className="text-center pb-4">
            <p className="text-xs text-grappler-600">
              Volume landmarks based on Renaissance Periodization research.
              <br />
              MEV = Minimum Effective Volume, MAV = Maximum Adaptive Volume, MRV = Maximum Recoverable Volume.
            </p>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
