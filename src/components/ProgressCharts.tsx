'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
  ReferenceDot,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Dumbbell,
  Calendar,
  Award,
  BarChart3,
  PieChartIcon,
  Activity,
  ChevronRight,
  Heart,
} from 'lucide-react';
import EmptyState from './EmptyState';
import { cn, formatNumber, formatDate, percentageChange } from '@/lib/utils';
import { calculate1RM } from '@/lib/workout-generator';
import { getExerciseById } from '@/lib/exercises';
import { calculateVO2MaxEstimate } from '@/lib/fatigue-metrics';
import { useComputedGamification } from '@/lib/computed-gamification';

type ChartView = 'strength' | 'volume' | 'distribution' | 'frequency' | 'recovery';

interface ProgressChartsProps {
  onViewReport?: (mesoId: string) => void;
  children?: React.ReactNode;
}

export default function ProgressCharts({ onViewReport, children }: ProgressChartsProps) {
  const { workoutLogs, mesocycleHistory: _rawMesoHistory, gamificationStats, currentMesocycle, user, wearableHistory, bodyWeightLog } = useAppStore();
  const mesocycleHistory = _rawMesoHistory.filter(m => !m._deleted);
  const computed = useComputedGamification();
  const weightUnit = user?.weightUnit || 'lbs';
  const [activeView, setActiveView] = useState<ChartView>('strength');

  // Calculate strength progress data
  const strengthData = useMemo(() => {
    const exerciseProgress: Record<string, { date: string; estimated1RM: number }[]> = {};

    workoutLogs.forEach(log => {
      log.exercises.forEach(ex => {
        if (!exerciseProgress[ex.exerciseName]) {
          exerciseProgress[ex.exerciseName] = [];
        }

        // Find max estimated 1RM from this session
        const maxSet = ex.sets.reduce((max, set) => {
          if (!set.completed || set.weight === 0) return max;
          const est1RM = calculate1RM(set.weight, set.reps);
          return est1RM > max ? est1RM : max;
        }, 0);

        if (maxSet > 0) {
          exerciseProgress[ex.exerciseName].push({
            date: formatDate(log.date),
            estimated1RM: maxSet
          });
        }
      });
    });

    return exerciseProgress;
  }, [workoutLogs]);

  // Calculate strength-to-bodyweight ratios for key lifts
  const strengthRatios = useMemo(() => {
    if (bodyWeightLog.length === 0) return null;
    // Get most recent body weight
    const sortedBW = [...bodyWeightLog].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latestBW = sortedBW[0].weight;
    if (!latestBW || latestBW <= 0) return null;

    // Find best estimated 1RM for key compound lifts
    const keyLifts = ['Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Barbell Row'];
    const ratios: { name: string; ratio: number; e1rm: number }[] = [];

    for (const liftName of keyLifts) {
      const data = strengthData[liftName];
      if (data && data.length > 0) {
        const best = Math.max(...data.map(d => d.estimated1RM));
        ratios.push({
          name: liftName.replace('Barbell ', ''),
          ratio: Math.round(best / latestBW * 100) / 100,
          e1rm: Math.round(best),
        });
      }
    }

    return ratios.length > 0 ? { ratios, bodyWeight: latestBW } : null;
  }, [strengthData, bodyWeightLog]);

  // Calculate volume progress data
  const volumeData = useMemo(() => {
    const weeklyVolume: { week: string; volume: number; workouts: number }[] = [];

    // Group by week
    const volumeByWeek: Record<string, { volume: number; workouts: number }> = {};

    workoutLogs.forEach(log => {
      const date = new Date(log.date);
      // Use ISO week number for correct week grouping
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      const weekKey = `Week ${weekNum}`;

      if (!volumeByWeek[weekKey]) {
        volumeByWeek[weekKey] = { volume: 0, workouts: 0 };
      }

      volumeByWeek[weekKey].volume += log.totalVolume;
      volumeByWeek[weekKey].workouts += 1;
    });

    Object.entries(volumeByWeek).forEach(([week, data]) => {
      weeklyVolume.push({ week, ...data });
    });

    return weeklyVolume;
  }, [workoutLogs]);

  // Calculate muscle group distribution (only when tab is active)
  const muscleDistribution = useMemo(() => {
    if (activeView !== 'distribution') return [];
    const distribution: Record<string, number> = {};

    const muscleNameMap: Record<string, string> = {
      chest: 'Chest', back: 'Back', shoulders: 'Shoulders', biceps: 'Biceps',
      triceps: 'Triceps', quadriceps: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes',
      calves: 'Calves', core: 'Core', forearms: 'Forearms', traps: 'Traps',
      full_body: 'Full Body'
    };

    workoutLogs.forEach(log => {
      log.exercises.forEach(ex => {
        const exerciseData = getExerciseById(ex.exerciseId);
        const completedSets = ex.sets.filter(s => s.completed).length;

        if (exerciseData) {
          exerciseData.primaryMuscles.forEach(m => {
            const label = muscleNameMap[m] || 'Other';
            distribution[label] = (distribution[label] || 0) + completedSets;
          });
        } else {
          distribution['Other'] = (distribution['Other'] || 0) + completedSets;
        }
      });
    });

    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }, [workoutLogs, activeView]);

  // Calculate recovery trend from wearable history (lazy — only for recovery tab + insights)
  const recoveryTrend = useMemo(() => {
    if (!wearableHistory || wearableHistory.length === 0) return [];

    return wearableHistory
      .slice(-14) // Last 14 days
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(w => ({
        date: formatDate(w.date),
        recovery: w.recoveryScore ?? undefined,
        hrv: w.hrv ?? undefined,
        strain: w.strain ?? undefined,
        sleep: w.sleepHours != null ? Math.round(w.sleepHours * 10) / 10 : undefined,
      }));
  }, [wearableHistory]); // Note: kept always computed since insights depend on it

  // VO2 max estimation trend
  const vo2maxData = useMemo(() => {
    if (!wearableHistory || wearableHistory.length === 0) return null;
    const estimate = calculateVO2MaxEstimate(wearableHistory);
    if (!estimate.value || estimate.trend.length === 0) return null;
    return estimate;
  }, [wearableHistory]);

  // Calculate insights
  const insights = useMemo(() => {
    const results: { type: 'positive' | 'negative' | 'neutral'; message: string }[] = [];

    // Volume trend
    if (volumeData.length >= 2) {
      const lastWeek = volumeData[volumeData.length - 1];
      const prevWeek = volumeData[volumeData.length - 2];
      const change = percentageChange(prevWeek.volume, lastWeek.volume);

      if (change > 0) {
        results.push({
          type: 'positive',
          message: `Volume up ${change.toFixed(0)}% from last week - great progression!`
        });
      } else if (change < -20) {
        results.push({
          type: 'negative',
          message: `Volume down ${Math.abs(change).toFixed(0)}% - consider if this was intentional deload.`
        });
      }
    }

    // Streak
    if (computed.currentStreak >= 7) {
      results.push({
        type: 'positive',
        message: `${computed.currentStreak} day streak! Consistency is your superpower.`
      });
    }

    // PRs
    if (computed.personalRecords > 0) {
      results.push({
        type: 'positive',
        message: `${computed.personalRecords} personal records crushed! Strength is building.`
      });
    }

    // Recovery trend insight
    if (recoveryTrend.length >= 3) {
      const recentRecoveries = recoveryTrend.slice(-3).filter(d => d.recovery != null);
      if (recentRecoveries.length >= 2) {
        const avg = recentRecoveries.reduce((s, d) => s + (d.recovery ?? 0), 0) / recentRecoveries.length;
        if (avg < 40) {
          results.push({
            type: 'negative',
            message: `Recovery trending low (${Math.round(avg)}% avg) — consider extra rest or a deload.`
          });
        } else if (avg >= 70) {
          results.push({
            type: 'positive',
            message: `Recovery is strong (${Math.round(avg)}% avg) — good window for high-intensity work.`
          });
        }
      }
    }

    // HRV Coefficient of Variation — research-backed overreaching detection
    if (recoveryTrend.length >= 5) {
      const hrvValues = recoveryTrend.slice(-7).filter(d => d.hrv != null).map(d => d.hrv!);
      if (hrvValues.length >= 4) {
        const mean = hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length;
        const variance = hrvValues.reduce((sum, v) => sum + (v - mean) ** 2, 0) / hrvValues.length;
        const cv = (Math.sqrt(variance) / mean) * 100;
        if (cv > 15) {
          results.push({
            type: 'negative',
            message: `HRV variability is high (CV ${cv.toFixed(0)}%) — possible overreaching. Prioritize recovery.`
          });
        } else if (cv < 5 && mean > 50) {
          results.push({
            type: 'positive',
            message: `HRV is stable and healthy (CV ${cv.toFixed(0)}%, avg ${Math.round(mean)}ms) — consistent recovery.`
          });
        }
      }
    }

    // Strain-to-Recovery ratio — overtraining indicator
    if (recoveryTrend.length >= 3) {
      const recent = recoveryTrend.slice(-5);
      const pairs = recent.filter(d => d.strain != null && d.recovery != null);
      if (pairs.length >= 3) {
        const avgStrain = pairs.reduce((s, d) => s + (d.strain ?? 0), 0) / pairs.length;
        const avgRecovery = pairs.reduce((s, d) => s + (d.recovery ?? 0), 0) / pairs.length;
        if (avgStrain > 14 && avgRecovery < 50) {
          results.push({
            type: 'negative',
            message: `High strain (${avgStrain.toFixed(1)}) with low recovery (${Math.round(avgRecovery)}%) — reduce training load.`
          });
        } else if (avgStrain > 10 && avgRecovery >= 66) {
          results.push({
            type: 'positive',
            message: `Good strain-recovery balance (${avgStrain.toFixed(1)} strain, ${Math.round(avgRecovery)}% recovery).`
          });
        }
      }
    }

    // Auto-deload suggestion — RPE creeping up over last 3 sessions
    if (workoutLogs.length >= 3) {
      const last3 = [...workoutLogs]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3);
      const rpes = last3.filter(l => l.overallRPE > 0).map(l => l.overallRPE);
      if (rpes.length >= 3 && rpes.every(r => r >= 8.5)) {
        results.push({
          type: 'negative',
          message: `RPE has been 8.5+ for 3 sessions straight — consider a deload week to prevent overreaching.`
        });
      } else if (rpes.length >= 3 && rpes[0] > rpes[2] + 1) {
        results.push({
          type: 'neutral',
          message: `RPE trending up (${rpes[2]} → ${rpes[0]}) — monitor fatigue and consider reducing intensity if it continues.`
        });
      }
    }

    // Plateau detection — flag exercises with <2% e1RM change over 3+ sessions
    const exerciseTrends: Record<string, number[]> = {};
    workoutLogs.forEach(log => {
      log.exercises.forEach(ex => {
        if (!exerciseTrends[ex.exerciseName]) exerciseTrends[ex.exerciseName] = [];
        const maxE1rm = ex.sets.reduce((max, set) => {
          if (!set.completed || set.weight === 0) return max;
          const e1rm = calculate1RM(set.weight, set.reps);
          return e1rm > max ? e1rm : max;
        }, 0);
        if (maxE1rm > 0) exerciseTrends[ex.exerciseName].push(maxE1rm);
      });
    });
    const stalledExercises: string[] = [];
    Object.entries(exerciseTrends).forEach(([name, e1rms]) => {
      if (e1rms.length >= 4) {
        const recent = e1rms.slice(-4);
        const first = recent[0];
        const last = recent[recent.length - 1];
        const pctChange = first > 0 ? Math.abs(((last - first) / first) * 100) : 0;
        if (pctChange < 2) stalledExercises.push(name);
      }
    });
    if (stalledExercises.length > 0) {
      const names = stalledExercises.slice(0, 2).join(' and ');
      results.push({
        type: 'neutral',
        message: `${names} ${stalledExercises.length > 2 ? `(+${stalledExercises.length - 2} more)` : ''} plateaued — try a variation, rep range change, or extra set.`.replace(/  +/g, ' '),
      });
    }

    // Default insight — milestone-based encouragement
    if (results.length === 0) {
      const totalW = computed.totalWorkouts;
      if (totalW < 3) {
        results.push({
          type: 'neutral',
          message: `${3 - totalW} more workout${3 - totalW === 1 ? '' : 's'} until volume trends unlock.`
        });
      } else if (totalW < 5) {
        results.push({
          type: 'neutral',
          message: `${5 - totalW} more workout${5 - totalW === 1 ? '' : 's'} until strength progression insights unlock.`
        });
      } else {
        results.push({
          type: 'neutral',
          message: 'Keep logging consistently to build your personal baseline for deeper insights.'
        });
      }
    }

    return results;
  }, [volumeData, gamificationStats, recoveryTrend]);

  const COLORS = ['#0ea5e9', '#d946ef', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

  const tabs = [
    { id: 'strength', label: 'Strength', icon: TrendingUp },
    { id: 'volume', label: 'Volume', icon: BarChart3 },
    { id: 'distribution', label: 'Distribution', icon: PieChartIcon },
    { id: 'frequency', label: 'Frequency', icon: Calendar },
    { id: 'recovery', label: 'Recovery', icon: Heart },
  ];

  // PR annotations for strength chart — mark where personal records were hit
  const prAnnotations = useMemo(() => {
    const annotations: { exerciseName: string; date: string; estimated1RM: number }[] = [];
    workoutLogs.forEach(log => {
      log.exercises.forEach(ex => {
        if (ex.personalRecord) {
          const maxE1rm = ex.sets.reduce((max, set) => {
            if (!set.completed || set.weight === 0) return max;
            const e1rm = calculate1RM(set.weight, set.reps);
            return e1rm > max ? e1rm : max;
          }, 0);
          if (maxE1rm > 0) {
            annotations.push({ exerciseName: ex.exerciseName, date: formatDate(log.date), estimated1RM: maxE1rm });
          }
        }
      });
    });
    return annotations;
  }, [workoutLogs]);

  // Deload week annotations for volume chart — mark which weeks are deloads
  const deloadWeeks = useMemo(() => {
    const deloads: string[] = [];
    const allMesos = [...mesocycleHistory, ...(currentMesocycle ? [currentMesocycle] : [])];
    allMesos.forEach(meso => {
      meso.weeks.forEach((week, wi) => {
        if (week.isDeload) {
          // Estimate the week number in the global timeline
          const mesoLogs = workoutLogs.filter(l => l.mesocycleId === meso.id);
          if (mesoLogs.length > 0) {
            const mesoStart = Math.min(...mesoLogs.map(l => new Date(l.date).getTime()));
            const deloadDate = new Date(mesoStart + wi * 7 * 24 * 60 * 60 * 1000);
            const d = new Date(Date.UTC(deloadDate.getFullYear(), deloadDate.getMonth(), deloadDate.getDate()));
            const dayNum = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
            deloads.push(`Week ${weekNum}`);
          }
        }
      });
    });
    return deloads;
  }, [mesocycleHistory, currentMesocycle, workoutLogs]);

  // Missed sessions for frequency chart — weeks where sessions < expected
  const missedWeeks = useMemo(() => {
    if (!currentMesocycle) return [];
    const sessionsPerWeek = currentMesocycle.weeks.length > 0
      ? currentMesocycle.weeks[0].sessions.length
      : 0;
    if (sessionsPerWeek === 0) return [];
    return volumeData
      .filter(d => d.workouts < sessionsPerWeek)
      .map(d => d.week);
  }, [volumeData, currentMesocycle]);

  // Build insight cards with sparkline data
  const insightCards = useMemo(() => {
    const cards: { id: string; title: string; value: string; delta: string; deltaType: 'up' | 'down' | 'flat'; sparkData: number[]; color: string; chartView: ChartView }[] = [];

    // Top exercises by frequency — strength sparklines
    const exerciseFreq: Record<string, number> = {};
    workoutLogs.forEach(log => log.exercises.forEach(ex => {
      exerciseFreq[ex.exerciseName] = (exerciseFreq[ex.exerciseName] || 0) + 1;
    }));
    const topExercises = Object.entries(exerciseFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    topExercises.forEach((name, i) => {
      const data = strengthData[name];
      if (!data || data.length < 2) return;
      const points = data.slice(-8).map(d => d.estimated1RM);
      const first = points[0];
      const last = points[points.length - 1];
      const diff = last - first;
      const pct = first > 0 ? Math.round((diff / first) * 100) : 0;
      cards.push({
        id: `strength-${i}`,
        title: name,
        value: `${Math.round(last)} ${weightUnit}`,
        delta: `${diff >= 0 ? '+' : ''}${Math.round(diff)} ${weightUnit} (${pct >= 0 ? '+' : ''}${pct}%)`,
        deltaType: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat',
        sparkData: points,
        color: COLORS[i % COLORS.length],
        chartView: 'strength',
      });
    });

    // Volume trend card
    if (volumeData.length >= 2) {
      const recent = volumeData.slice(-6);
      const vols = recent.map(d => d.volume);
      const lastV = vols[vols.length - 1];
      const prevV = vols[vols.length - 2];
      const diff = lastV - prevV;
      const pct = prevV > 0 ? Math.round((diff / prevV) * 100) : 0;
      cards.push({
        id: 'volume',
        title: 'Weekly Volume',
        value: `${formatNumber(lastV)} ${weightUnit}`,
        delta: `${pct >= 0 ? '+' : ''}${pct}% vs last week`,
        deltaType: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat',
        sparkData: vols,
        color: '#0ea5e9',
        chartView: 'volume',
      });
    }

    // Frequency card
    if (volumeData.length >= 2) {
      const recent = volumeData.slice(-6);
      const counts = recent.map(d => d.workouts);
      const lastC = counts[counts.length - 1];
      const prevC = counts.length >= 2 ? counts[counts.length - 2] : lastC;
      cards.push({
        id: 'frequency',
        title: 'Sessions This Week',
        value: `${lastC} workouts`,
        delta: lastC > prevC ? `Up from ${prevC} last week` : lastC < prevC ? `Down from ${prevC} last week` : 'Same as last week',
        deltaType: lastC > prevC ? 'up' : lastC < prevC ? 'down' : 'flat',
        sparkData: counts,
        color: '#d946ef',
        chartView: 'frequency',
      });
    }

    return cards;
  }, [strengthData, volumeData, workoutLogs, weightUnit]);

  // Extract named analytics children for context-pairing under sub-tabs.
  // Children are rendered by display name convention:
  //   SyntheticRecoveryCard → recovery tab
  //   VolumeDashboard → volume tab
  //   PRTimelineCard → strength tab
  //   PlateauAnalysisCard → strength tab
  //   CombatBenchmarksCard → strength tab
  //   TrainingTimeline → frequency tab
  //   BodyRecompCard → volume tab
  const childArray = React.Children.toArray(children);
  const getChildByName = (name: string) =>
    childArray.find(c => React.isValidElement(c) && (c.type as { name?: string })?.name === name);

  const strengthExtras = (
    <>
      {getChildByName('PRTimelineCard')}
      {getChildByName('PlateauAnalysisCard')}
      {getChildByName('CombatBenchmarksCard')}
    </>
  );
  const volumeExtras = (
    <>
      {getChildByName('VolumeDashboard')}
      {getChildByName('BodyRecompCard')}
    </>
  );
  const frequencyExtras = (
    <>
      {getChildByName('TrainingTimeline')}
    </>
  );
  const recoveryExtras = (
    <>
      {getChildByName('SyntheticRecoveryCard')}
    </>
  );

  // SVG Sparkline component
  const Sparkline = ({ data, color, width = 80, height = 28 }: { data: number[]; color: string; width?: number; height?: number }) => {
    if (data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map((v, i) =>
      `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`
    ).join(' ');
    return (
      <svg width={width} height={height} className="flex-shrink-0">
        <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-grappler-50">Progress</h2>
        <p className="text-sm text-grappler-400">Track your gains over time</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-primary-400" />
            <span className="stat-label">Total Volume</span>
          </div>
          <p className="stat-value">{formatNumber(computed.totalVolume)} {weightUnit}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-400" />
            <span className="stat-label">Personal Records</span>
          </div>
          <p className="stat-value">{computed.personalRecords}</p>
        </div>
      </div>

      {/* Relative Strength (strength-to-bodyweight ratios) */}
      {strengthRatios && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-primary-400" />
            <h3 className="font-medium text-grappler-200 text-sm">Relative Strength</h3>
            <span className="text-xs text-grappler-400 ml-auto">{strengthRatios.bodyWeight} {weightUnit} BW</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {strengthRatios.ratios.map(r => (
              <div key={r.name} className="flex items-center justify-between bg-grappler-800/50 rounded-lg px-3 py-2">
                <span className="text-xs text-grappler-400">{r.name}</span>
                <span className={cn(
                  'text-sm font-semibold',
                  r.ratio >= 2 ? 'text-green-400' : r.ratio >= 1.5 ? 'text-primary-400' : r.ratio >= 1 ? 'text-yellow-400' : 'text-grappler-300'
                )}>
                  {r.ratio}x
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insight Cards with Sparklines */}
      {insightCards.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" />
            Key Trends
          </h3>
          {insightCards.map((card) => (
            <button
              key={card.id}
              onClick={() => { setActiveView(card.chartView); }}
              className="w-full card p-4 flex items-center gap-3 text-left hover:bg-grappler-700/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-grappler-400 mb-0.5">{card.title}</p>
                <p className="text-sm font-bold text-grappler-100">{card.value}</p>
                <p className={cn(
                  'text-xs font-medium mt-0.5',
                  card.deltaType === 'up' ? 'text-green-400' : card.deltaType === 'down' ? 'text-red-400' : 'text-grappler-500'
                )}>
                  {card.delta}
                </p>
              </div>
              <Sparkline data={card.sparkData} color={card.color} />
              <ChevronRight className="w-4 h-4 text-grappler-500 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Insights */}
      <div className="space-y-2">
        {insights.map((insight, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              'card p-4 flex items-start gap-3',
              insight.type === 'positive' && 'border-l-4 border-l-green-500',
              insight.type === 'negative' && 'border-l-4 border-l-red-500',
              insight.type === 'neutral' && 'border-l-4 border-l-primary-500'
            )}
          >
            {insight.type === 'positive' ? (
              <TrendingUp className="w-5 h-5 text-green-400 flex-shrink-0" />
            ) : insight.type === 'negative' ? (
              <TrendingDown className="w-5 h-5 text-red-400 flex-shrink-0" />
            ) : (
              <Activity className="w-5 h-5 text-primary-400 flex-shrink-0" />
            )}
            <p className="text-sm text-grappler-300">{insight.message}</p>
          </motion.div>
        ))}
      </div>

      {/* Chart Sub-Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id as ChartView)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all',
              activeView === tab.id
                ? 'bg-primary-500 text-white'
                : 'bg-grappler-800 text-grappler-400 hover:text-grappler-200'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Charts */}
      <div className="card p-4">
        {activeView === 'strength' && (
          <div>
            <h3 className="font-medium text-grappler-200 mb-4">Estimated 1RM Progress</h3>
            {Object.keys(strengthData).length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    {Object.entries(strengthData)
                      .sort((a, b) => b[1].length - a[1].length)
                      .slice(0, 4).map(([exercise, data], i) => (
                      <Line
                        key={exercise}
                        data={data}
                        type="monotone"
                        dataKey="estimated1RM"
                        name={exercise}
                        stroke={COLORS[i % COLORS.length]}
                        strokeWidth={2}
                        dot={{ fill: COLORS[i % COLORS.length] }}
                      />
                    ))}
                    {/* PR annotations */}
                    {prAnnotations.slice(0, 8).map((pr, i) => (
                      <ReferenceDot
                        key={`pr-${i}`}
                        x={pr.date}
                        y={pr.estimated1RM}
                        r={5}
                        fill="#eab308"
                        stroke="#facc15"
                        strokeWidth={2}
                        label={{ value: 'PR', fontSize: 9, fill: '#facc15', position: 'top' }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                icon={TrendingUp}
                title="No strength data yet"
                description="Complete a few workouts to track your estimated 1RM over time."
              />
            )}
            {/* Context-paired analytics for Strength */}
            <div className="mt-4 space-y-4">{strengthExtras}</div>
          </div>
        )}

        {activeView === 'volume' && (
          <div>
            <h3 className="font-medium text-grappler-200 mb-4">Weekly Volume</h3>
            {volumeData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={volumeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="week" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`${formatNumber(value)} ${weightUnit}`, 'Volume']}
                    />
                    <Area
                      type="monotone"
                      dataKey="volume"
                      stroke="#0ea5e9"
                      fill="url(#volumeGradient)"
                    />
                    {/* Deload week annotations */}
                    {deloadWeeks.map((week, i) => (
                      <ReferenceLine
                        key={`deload-${i}`}
                        x={week}
                        stroke="#8b5cf6"
                        strokeDasharray="4 4"
                        strokeWidth={1}
                        label={{ value: 'Deload', fontSize: 9, fill: '#a78bfa', position: 'insideTopRight' }}
                      />
                    ))}
                    <defs>
                      <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                icon={BarChart3}
                title="No volume data yet"
                description="Log sets and reps to see your weekly volume trends."
              />
            )}
            {/* Context-paired analytics for Volume */}
            <div className="mt-4 space-y-4">{volumeExtras}</div>
          </div>
        )}

        {activeView === 'distribution' && (
          <div>
            <h3 className="font-medium text-grappler-200 mb-4">Muscle Group Distribution</h3>
            {muscleDistribution.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={muscleDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {muscleDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                icon={PieChartIcon}
                title="No distribution data yet"
                description="Train different muscle groups to see your split breakdown."
              />
            )}
          </div>
        )}

        {activeView === 'frequency' && (
          <div>
            <h3 className="font-medium text-grappler-200 mb-4">Workout Frequency</h3>
            {volumeData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volumeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="week" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="workouts" fill="#d946ef" radius={[4, 4, 0, 0]} />
                    {/* Missed session indicators */}
                    {missedWeeks.map((week, i) => (
                      <ReferenceLine
                        key={`missed-${i}`}
                        x={week}
                        stroke="#ef4444"
                        strokeDasharray="3 3"
                        strokeWidth={1}
                        label={{ value: 'Low', fontSize: 9, fill: '#f87171', position: 'insideTopRight' }}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                icon={Calendar}
                title="No frequency data yet"
                description="Train consistently to see your workout frequency over time."
              />
            )}
            {/* Context-paired analytics for Frequency */}
            <div className="mt-4 space-y-4">{frequencyExtras}</div>
          </div>
        )}

        {activeView === 'recovery' && (
          <div>
            <h3 className="font-medium text-grappler-200 mb-4">Recovery & Readiness Trends</h3>
            {recoveryTrend.length > 0 ? (
              <div className="space-y-4">
                {/* Recovery & HRV Chart */}
                <div className="h-56">
                  <p className="text-xs text-grappler-400 mb-2">Recovery % & HRV (ms)</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={recoveryTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                      <YAxis yAxisId="left" stroke="#22c55e" fontSize={12} domain={[0, 100]} />
                      <YAxis yAxisId="right" orientation="right" stroke="#0ea5e9" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="recovery"
                        name="Recovery %"
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={{ fill: '#22c55e', r: 3 }}
                        connectNulls
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="hrv"
                        name="HRV (ms)"
                        stroke="#0ea5e9"
                        strokeWidth={2}
                        dot={{ fill: '#0ea5e9', r: 3 }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Strain & Sleep Chart */}
                <div className="h-56">
                  <p className="text-xs text-grappler-400 mb-2">Strain & Sleep (hrs)</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={recoveryTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                      <YAxis yAxisId="left" stroke="#f59e0b" fontSize={12} domain={[0, 21]} />
                      <YAxis yAxisId="right" orientation="right" stroke="#d946ef" fontSize={12} domain={[0, 12]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="strain"
                        name="Strain"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={{ fill: '#f59e0b', r: 3 }}
                        connectNulls
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="sleep"
                        name="Sleep (hrs)"
                        stroke="#d946ef"
                        strokeWidth={2}
                        dot={{ fill: '#d946ef', r: 3 }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* VO2 Max Trend */}
                {vo2maxData && vo2maxData.trend.length >= 2 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-grappler-400">Est. VO2 Max Trend</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-grappler-100">{vo2maxData.value} ml/kg/min</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          vo2maxData.classification === 'Elite' || vo2maxData.classification === 'Excellent'
                            ? 'bg-green-500/20 text-green-400'
                            : vo2maxData.classification === 'Good'
                            ? 'bg-blue-500/20 text-blue-400'
                            : vo2maxData.classification === 'Average'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {vo2maxData.classification}
                        </span>
                      </div>
                    </div>
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={vo2maxData.trend}>
                          <defs>
                            <linearGradient id="vo2gradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                          <YAxis stroke="#14b8a6" fontSize={11} domain={['dataMin - 2', 'dataMax + 2']} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1e293b',
                              border: '1px solid #334155',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number) => [`${value} ml/kg/min`, 'VO2 Max']}
                          />
                          <Area
                            type="monotone"
                            dataKey="vo2max"
                            name="VO2 Max"
                            stroke="#14b8a6"
                            strokeWidth={2}
                            fill="url(#vo2gradient)"
                            dot={{ fill: '#14b8a6', r: 3 }}
                            connectNulls
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-grappler-600 mt-1">Estimated from resting HR via Uth-Sorensen formula. Track over weeks for meaningful trends.</p>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                icon={Heart}
                title="No wearable data yet"
                description="Connect Whoop or add manual entries to track recovery trends."
              />
            )}
            {/* Context-paired analytics for Recovery */}
            <div className="mt-4 space-y-4">{recoveryExtras}</div>
          </div>
        )}
      </div>

      {/* Mesocycle History */}
      {mesocycleHistory.length > 0 && (
        <div className="card p-4">
          <h3 className="font-medium text-grappler-200 mb-4">Completed Mesocycles</h3>
          <div className="space-y-3">
            {mesocycleHistory.map((meso, i) => {
              const mesoLogs = workoutLogs.filter(l => l.mesocycleId === meso.id);
              const totalVol = mesoLogs.reduce((s, l) => s + (l.totalVolume || 0), 0);
              const prs = mesoLogs.reduce((s, l) => s + l.exercises.filter(e => e.personalRecord).length, 0);
              // Hide empty blocks with no sessions logged
              if (mesoLogs.length === 0) return null;
              return (
                <button
                  key={meso.id}
                  onClick={() => onViewReport?.(meso.id)}
                  className="w-full flex items-center justify-between py-2.5 border-b border-grappler-700 last:border-0 text-left hover:bg-grappler-800/30 rounded-lg px-2 -mx-2 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-grappler-200 truncate">{meso.name}</p>
                    <p className="text-xs text-grappler-400">
                      {meso.weeks.length} weeks · {meso.goalFocus} · {mesoLogs.length} sessions · {formatNumber(totalVol)} {weightUnit}
                      {prs > 0 && <span className="text-yellow-400"> · {prs} PRs</span>}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-grappler-500 shrink-0 ml-2" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
