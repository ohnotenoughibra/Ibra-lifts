'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  AlertTriangle,
  Zap,
  BarChart3,
  Activity,
  Shield,
  Gauge,
  Dumbbell,
  Info,
} from 'lucide-react';
import {
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { useAppStore } from '@/lib/store';
import { analyzeStickingPoints } from '@/lib/ai-coach';
import { StickingPointAnalysis } from '@/lib/types';
import { getAccessoryPrescription, type StickingPointPrescription } from '@/lib/sticking-point-data';
import { estimateForceVelocityProfile, type FVProfileResult } from '@/lib/force-velocity';

interface StrengthAnalysisProps {
  onClose: () => void;
}

const stickingPointConfig: Record<
  StickingPointAnalysis['stickingPoint'],
  { label: string; color: string; bgColor: string; description: string }
> = {
  bottom: {
    label: 'Bottom',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    description: 'Weakness at the bottom of the lift',
  },
  mid_range: {
    label: 'Mid-Range',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    description: 'Stalling through the mid-range of motion',
  },
  lockout: {
    label: 'Lockout',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    description: 'Difficulty finishing the lift at lockout',
  },
  unknown: {
    label: 'Unidentified',
    color: 'text-grappler-400',
    bgColor: 'bg-grappler-700',
    description: 'More data needed to identify sticking point',
  },
};

export default function StrengthAnalysis({ onClose }: StrengthAnalysisProps) {
  const { workoutLogs, user, baselineLifts } = useAppStore();
  const weightUnit = user?.weightUnit || 'lbs';
  const [analyses, setAnalyses] = useState<StickingPointAnalysis[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<StickingPointAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  // Force-Velocity Profile
  const fvProfile: FVProfileResult | null = useMemo(() => {
    if (workoutLogs.length === 0) return null;
    const bodyWeightKg = user?.bodyWeightKg || 75;
    const sex = user?.sex || 'male';
    return estimateForceVelocityProfile(workoutLogs, baselineLifts, bodyWeightKg, sex);
  }, [workoutLogs, baselineLifts, user?.bodyWeightKg, user?.sex]);

  // Generate sticking point analyses for compound lifts with multiple sessions
  useEffect(() => {
    if (workoutLogs.length === 0) {
      setLoading(false);
      return;
    }

    // Count sessions per exercise and track names
    const exerciseSessionCount = new Map<string, number>();
    const exerciseNames = new Map<string, string>();
    workoutLogs.forEach((log) => {
      log.exercises.forEach((ex) => {
        const count = exerciseSessionCount.get(ex.exerciseId) || 0;
        exerciseSessionCount.set(ex.exerciseId, count + 1);
        if (!exerciseNames.has(ex.exerciseId)) {
          exerciseNames.set(ex.exerciseId, ex.exerciseName);
        }
      });
    });

    // Filter to exercises with at least 2 sessions (compound lifts with enough data)
    const multiSessionExercises = Array.from(exerciseSessionCount.entries())
      .filter(([, count]) => count >= 2)
      .map(([id]) => id);

    const generateAnalyses = async () => {
      const results: StickingPointAnalysis[] = [];
      for (const exerciseId of multiSessionExercises) {
        try {
          const analysis = analyzeStickingPoints(exerciseId, exerciseNames.get(exerciseId) || exerciseId, workoutLogs);
          if (analysis) {
            results.push(analysis);
          }
        } catch {
          // Skip exercises that fail analysis
        }
      }

      // Sort by avgRPE descending (hardest exercises first)
      results.sort((a, b) => b.avgRPE - a.avgRPE);
      setAnalyses(results);
      setLoading(false);
    };

    generateAnalyses();
  }, [workoutLogs]);

  // Build overall strength trend data from workout logs
  const strengthTrends = useMemo(() => {
    const weeklyData: { week: string; avgRPE: number; totalVolume: number; sessions: number }[] = [];
    const weekMap = new Map<string, { rpeSum: number; volumeSum: number; count: number }>();

    workoutLogs.forEach((log) => {
      const date = new Date(log.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - ((date.getDay() + 6) % 7)); // Monday-based
      const weekKey = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;

      const existing = weekMap.get(weekKey) || { rpeSum: 0, volumeSum: 0, count: 0 };
      existing.rpeSum += log.overallRPE;
      existing.volumeSum += log.totalVolume;
      existing.count += 1;
      weekMap.set(weekKey, existing);
    });

    weekMap.forEach((data, week) => {
      weeklyData.push({
        week,
        avgRPE: parseFloat((data.rpeSum / data.count).toFixed(1)),
        totalVolume: Math.round(data.volumeSum),
        sessions: data.count,
      });
    });

    return weeklyData;
  }, [workoutLogs]);

  // Build failure rep distribution for the selected exercise
  const failureRepData = useMemo(() => {
    if (!selectedExercise) return [];

    const repCounts = new Map<number, number>();
    selectedExercise.failureReps.forEach((rep) => {
      repCounts.set(rep, (repCounts.get(rep) || 0) + 1);
    });

    return Array.from(repCounts.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([rep, count]) => ({
        rep: `Rep ${rep}`,
        count,
      }));
  }, [selectedExercise]);

  // Derived hero metrics
  const heroMetrics = useMemo(() => {
    // Volume trend: compare last 2 weeks of total volume
    const sorted = [...strengthTrends];
    let volumeTrendPct = 0;
    let trendLabel: 'Gaining' | 'Declining' | 'Maintaining' = 'Maintaining';

    if (sorted.length >= 2) {
      const recent = sorted[sorted.length - 1];
      const previous = sorted[sorted.length - 2];
      if (previous.totalVolume > 0) {
        volumeTrendPct = ((recent.totalVolume - previous.totalVolume) / previous.totalVolume) * 100;
      }
      if (volumeTrendPct > 2) trendLabel = 'Gaining';
      else if (volumeTrendPct < -2) trendLabel = 'Declining';
      else trendLabel = 'Maintaining';
    }

    // Volume capacity zone based on latest week avg RPE
    let volumeZone: 'Under-reaching' | 'Productive' | 'Overreaching' = 'Productive';
    if (sorted.length > 0) {
      const latestRPE = sorted[sorted.length - 1].avgRPE;
      if (latestRPE < 6) volumeZone = 'Under-reaching';
      else if (latestRPE > 9) volumeZone = 'Overreaching';
      else volumeZone = 'Productive';
    }

    // Fight readiness: composite score 0-100
    let fightReadiness = 50;
    if (sorted.length > 0) {
      const latestRPE = sorted[sorted.length - 1].avgRPE;
      if (latestRPE >= 7 && latestRPE <= 8.5) fightReadiness += 20;
      else if (latestRPE >= 6 && latestRPE <= 9) fightReadiness += 10;
      else fightReadiness -= 10;
    }
    if (sorted.length >= 3) fightReadiness += 15;
    if (sorted.length >= 6) fightReadiness += 10;
    const identifiedCount = analyses.filter(a => a.stickingPoint !== 'unknown').length;
    if (identifiedCount > 0 && analyses.length > 0) {
      fightReadiness += Math.min(10, identifiedCount * 3);
    }
    const unknownRatio = analyses.length > 0
      ? analyses.filter(a => a.stickingPoint === 'unknown').length / analyses.length
      : 0;
    if (unknownRatio > 0.5) fightReadiness -= 10;
    fightReadiness = Math.max(0, Math.min(100, fightReadiness));

    return { volumeTrendPct, trendLabel, volumeZone, fightReadiness };
  }, [strengthTrends, analyses]);

  // Exercises with identified sticking points = plateaus (actionable)
  const plateauExercises = useMemo(() => {
    return analyses.filter(a => a.stickingPoint !== 'unknown');
  }, [analyses]);

  if (workoutLogs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        className="min-h-screen bg-grappler-900 px-4 py-6"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button aria-label="Go back" onClick={onClose} className="btn btn-secondary btn-sm">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-grappler-50">Strength Analysis</h2>
            <p className="text-sm text-grappler-400">
              Identify sticking points and weaknesses
            </p>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BarChart3 className="w-16 h-16 text-grappler-500 mb-4" />
          <h3 className="text-lg font-semibold text-grappler-200 mb-2">
            No Strength Data Yet
          </h3>
          <p className="text-sm text-grappler-400 max-w-xs">
            Log multiple sessions of compound lifts to unlock strength curve analysis,
            sticking point identification, and accessory recommendations.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className="min-h-screen bg-grappler-900 px-4 py-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button aria-label="Go back" onClick={onClose} className="btn btn-secondary btn-sm">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-grappler-50">Strength Analysis</h2>
          <p className="text-sm text-grappler-400">
            Identify sticking points and weaknesses
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedExercise ? (
          /* Exercise Detail View */
          <motion.div
            key="detail"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Back to list */}
            <button
              onClick={() => setSelectedExercise(null)}
              className="flex items-center gap-1 text-sm text-grappler-400 hover:text-grappler-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to analysis
            </button>

            {/* Exercise Title & Sticking Point Badge */}
            <div className="card p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-bold text-grappler-50">
                    {selectedExercise.exerciseName}
                  </h3>
                  <p className="text-sm text-grappler-400">
                    Avg RPE: {selectedExercise.avgRPE.toFixed(1)}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    stickingPointConfig[selectedExercise.stickingPoint].bgColor
                  } ${stickingPointConfig[selectedExercise.stickingPoint].color}`}
                >
                  {stickingPointConfig[selectedExercise.stickingPoint].label}
                </span>
              </div>
              <p className="text-xs text-grappler-400">
                {stickingPointConfig[selectedExercise.stickingPoint].description}
              </p>
            </div>

            {/* RPE vs Weight Scatter Chart */}
            <div className="card p-4">
              <h4 className="font-medium text-grappler-200 mb-3">RPE vs Weight</h4>
              {selectedExercise.rpeByWeight.length > 0 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis
                        type="number"
                        dataKey="weight"
                        name="Weight"
                        stroke="#64748b"
                        fontSize={12}
                        label={{
                          value: 'Weight',
                          position: 'insideBottom',
                          offset: -5,
                          style: { fill: '#64748b', fontSize: 12 },
                        }}
                      />
                      <YAxis
                        type="number"
                        dataKey="avgRPE"
                        name="RPE"
                        stroke="#64748b"
                        fontSize={12}
                        domain={[5, 10]}
                        label={{
                          value: 'RPE',
                          angle: -90,
                          position: 'insideLeft',
                          style: { fill: '#64748b', fontSize: 12 },
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number, name: string) => {
                          if (name === 'Weight') return [`${value} ${weightUnit}`, 'Weight'];
                          return [value.toFixed(1), 'RPE'];
                        }}
                      />
                      <Scatter
                        data={selectedExercise.rpeByWeight}
                        fill="#0ea5e9"
                        strokeWidth={1}
                        stroke="#0284c7"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-56 flex items-center justify-center text-grappler-500 text-sm">
                  Not enough weight/RPE data points
                </div>
              )}
            </div>

            {/* Failure Rep Distribution */}
            <div className="card p-4">
              <h4 className="font-medium text-grappler-200 mb-3">Failure Rep Distribution</h4>
              {failureRepData.length > 0 ? (
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={failureRepData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="rep" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [value, 'Failures']}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {failureRepData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index === 0 ? '#ef4444' : index === failureRepData.length - 1 ? '#f59e0b' : '#0ea5e9'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-44 flex items-center justify-center text-grappler-500 text-sm">
                  No failure data recorded yet
                </div>
              )}
              {failureRepData.length > 0 && (
                <p className="text-xs text-grappler-400 mt-2">
                  Shows which rep number you most frequently fail on, helping identify fatigue patterns.
                </p>
              )}
            </div>

            {/* Targeted Accessory Prescription */}
            {(() => {
              const prescription = getAccessoryPrescription(
                selectedExercise.exerciseName,
                selectedExercise.exerciseId,
                selectedExercise.stickingPoint
              );
              return prescription ? (
                <>
                  {/* Root Cause */}
                  <div className="card p-4 bg-gradient-to-br from-amber-500/5 to-transparent border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <h4 className="font-medium text-grappler-200">Root Cause</h4>
                    </div>
                    <p className="text-sm text-grappler-300 leading-relaxed">
                      {prescription.commonCause}
                    </p>
                  </div>

                  {/* Accessory Exercises */}
                  <div className="card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <h4 className="font-medium text-grappler-200">Fix It — Accessory Exercises</h4>
                    </div>
                    <div className="space-y-2.5">
                      {prescription.accessories.map((acc, i) => (
                        <motion.div
                          key={acc.name}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="bg-grappler-800 rounded-lg p-3"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-primary-400">{i + 1}</span>
                              </div>
                              <span className="text-sm font-medium text-grappler-100">{acc.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="px-1.5 py-0.5 rounded bg-grappler-700 text-grappler-300 font-mono">{acc.sets}</span>
                              <span className="px-1.5 py-0.5 rounded bg-grappler-700 text-grappler-300 font-mono">RPE {acc.rpe}</span>
                            </div>
                          </div>
                          <p className="text-xs text-grappler-400 ml-7">{acc.why}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Form Cues */}
                  <div className="card p-4 bg-gradient-to-br from-primary-500/5 to-transparent border-primary-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-primary-400" />
                      <h4 className="font-medium text-grappler-200">Form Cues</h4>
                    </div>
                    <ul className="space-y-1.5">
                      {prescription.formCues.map((cue, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-grappler-300">
                          <span className="text-primary-400 mt-0.5 flex-shrink-0">-</span>
                          {cue}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                /* Fallback: original generic accessories */
                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <h4 className="font-medium text-grappler-200">Suggested Accessories</h4>
                  </div>
                  {selectedExercise.suggestedAccessories.length > 0 ? (
                    <div className="space-y-2">
                      {selectedExercise.suggestedAccessories.map((accessory, i) => (
                        <motion.div
                          key={accessory}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center gap-3 bg-grappler-800 rounded-lg p-3"
                        >
                          <div className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-primary-400">{i + 1}</span>
                          </div>
                          <span className="text-sm text-grappler-200">{accessory}</span>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-grappler-500">
                      Log more sessions with RPE to unlock targeted recommendations.
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Analysis Paragraph */}
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-primary-400" />
                <h4 className="font-medium text-grappler-200">Detailed Analysis</h4>
              </div>
              <p className="text-sm text-grappler-300 leading-relaxed">
                {selectedExercise.analysis}
              </p>
            </div>
          </motion.div>
        ) : (
          /* List View */
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* 1. HERO VERDICT CARD */}
            <div className="card p-5 bg-gradient-to-br from-grappler-800 to-grappler-900 border-grappler-700">
              {/* Primary: Strength Trend */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-grappler-400 uppercase tracking-wider mb-1">Strength Trend</p>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-bold ${
                      heroMetrics.trendLabel === 'Gaining' ? 'text-emerald-400' :
                      heroMetrics.trendLabel === 'Declining' ? 'text-red-400' :
                      'text-grappler-200'
                    }`}>
                      {heroMetrics.volumeTrendPct > 0 ? '+' : ''}{heroMetrics.volumeTrendPct.toFixed(1)}%
                    </span>
                    <span className={`text-sm font-medium ${
                      heroMetrics.trendLabel === 'Gaining' ? 'text-emerald-400' :
                      heroMetrics.trendLabel === 'Declining' ? 'text-red-400' :
                      'text-grappler-400'
                    }`}>
                      {heroMetrics.trendLabel}
                    </span>
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  heroMetrics.trendLabel === 'Gaining' ? 'bg-emerald-500/20' :
                  heroMetrics.trendLabel === 'Declining' ? 'bg-red-500/20' :
                  'bg-grappler-700'
                }`}>
                  {heroMetrics.trendLabel === 'Gaining' ? (
                    <TrendingUp className="w-6 h-6 text-emerald-400" />
                  ) : heroMetrics.trendLabel === 'Declining' ? (
                    <TrendingDown className="w-6 h-6 text-red-400" />
                  ) : (
                    <Minus className="w-6 h-6 text-grappler-400" />
                  )}
                </div>
              </div>

              {/* Secondary: Volume Zone + Fight Readiness */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-grappler-800/60 rounded-lg p-3">
                  <p className="text-xs text-grappler-400 mb-1">Volume Zone</p>
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-grappler-300" />
                    <span className={`text-sm font-semibold ${
                      heroMetrics.volumeZone === 'Productive' ? 'text-emerald-400' :
                      heroMetrics.volumeZone === 'Overreaching' ? 'text-red-400' :
                      'text-yellow-400'
                    }`}>
                      {heroMetrics.volumeZone}
                    </span>
                  </div>
                </div>
                <div className="bg-grappler-800/60 rounded-lg p-3">
                  <p className="text-xs text-grappler-400 mb-1">Fight Readiness</p>
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-grappler-300" />
                    <span className={`text-sm font-semibold ${
                      heroMetrics.fightReadiness >= 70 ? 'text-emerald-400' :
                      heroMetrics.fightReadiness >= 40 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {heroMetrics.fightReadiness}/100
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. POWER PROFILE — Force-Velocity */}
            {fvProfile && <PowerProfileSection fvProfile={fvProfile} />}

            {/* 3. PLATEAUS / STICKING POINTS (actionable) */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : plateauExercises.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <h4 className="font-medium text-grappler-200">Plateaus & Sticking Points</h4>
                </div>
                {plateauExercises.map((analysis, index) => {
                  const config = stickingPointConfig[analysis.stickingPoint];
                  return (
                    <motion.button
                      key={analysis.exerciseId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => setSelectedExercise(analysis)}
                      className="w-full card p-4 text-left hover:bg-grappler-700/50 transition-colors border-amber-500/10"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <h5 className="font-medium text-grappler-100">
                          {analysis.exerciseName}
                        </h5>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}
                        >
                          {config.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-grappler-400">
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          RPE: {analysis.avgRPE.toFixed(1)}
                        </span>
                        {analysis.suggestedAccessories.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-yellow-400" />
                            {analysis.suggestedAccessories.length} accessories
                          </span>
                        )}
                        {analysis.failureReps.length > 0 && (
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            Fails at rep {analysis.failureReps[0]}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-grappler-400 mt-1.5 line-clamp-2">
                        {analysis.analysis}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
            ) : analyses.length > 0 ? (
              <div className="card p-4 bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <p className="text-sm text-grappler-200">
                    No plateaus detected — all {analyses.length} tracked exercises are progressing.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-grappler-500">
                <Target className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Need more sessions to generate analysis.</p>
                <p className="text-xs mt-1">Log at least 2 sessions per exercise.</p>
              </div>
            )}

            {/* 3. COLLAPSIBLE DETAILS SECTION */}
            {(strengthTrends.length > 1 || analyses.length > 0) && (
              <div>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full flex items-center justify-between card p-4 hover:bg-grappler-700/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-grappler-400" />
                    <span className="text-sm font-medium text-grappler-200">Show Details</span>
                    <span className="text-xs text-grappler-500">
                      Charts, weekly load & per-exercise data
                    </span>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-grappler-400 transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-4 pt-4">
                        {/* Weekly Training Load Chart */}
                        {strengthTrends.length > 1 && (
                          <div className="card p-4">
                            <h4 className="font-medium text-grappler-200 mb-3">
                              Weekly Training Load
                            </h4>
                            <div className="h-48">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={strengthTrends}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                  <XAxis dataKey="week" stroke="#64748b" fontSize={12} />
                                  <YAxis
                                    yAxisId="rpe"
                                    orientation="left"
                                    stroke="#ef4444"
                                    fontSize={12}
                                    domain={[5, 10]}
                                    label={{
                                      value: 'RPE',
                                      angle: -90,
                                      position: 'insideLeft',
                                      style: { fill: '#ef4444', fontSize: 12 },
                                    }}
                                  />
                                  <YAxis
                                    yAxisId="volume"
                                    orientation="right"
                                    stroke="#0ea5e9"
                                    fontSize={12}
                                    label={{
                                      value: 'Volume',
                                      angle: 90,
                                      position: 'insideRight',
                                      style: { fill: '#0ea5e9', fontSize: 12 },
                                    }}
                                  />
                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor: '#1e293b',
                                      border: '1px solid #334155',
                                      borderRadius: '8px',
                                    }}
                                  />
                                  <Line
                                    yAxisId="rpe"
                                    type="monotone"
                                    dataKey="avgRPE"
                                    name="Avg RPE"
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                    dot={{ fill: '#ef4444', r: 3 }}
                                  />
                                  <Line
                                    yAxisId="volume"
                                    type="monotone"
                                    dataKey="totalVolume"
                                    name="Total Volume"
                                    stroke="#0ea5e9"
                                    strokeWidth={2}
                                    dot={{ fill: '#0ea5e9', r: 3 }}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="flex items-center justify-center gap-6 mt-2 text-xs text-grappler-400">
                              <span className="flex items-center gap-1">
                                <span className="w-3 h-0.5 bg-red-500 inline-block rounded" />
                                Avg RPE
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-3 h-0.5 bg-sky-500 inline-block rounded" />
                                Total Volume
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Sticking Point Summary */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-grappler-800 rounded-xl p-3 text-center">
                            <p className="text-xs text-grappler-400 mb-1">Exercises</p>
                            <p className="text-lg font-bold text-grappler-50">{analyses.length}</p>
                          </div>
                          <div className="bg-grappler-800 rounded-xl p-3 text-center">
                            <p className="text-xs text-grappler-400 mb-1">Avg RPE</p>
                            <p className="text-lg font-bold text-grappler-50">
                              {analyses.length > 0
                                ? (analyses.reduce((sum, a) => sum + a.avgRPE, 0) / analyses.length).toFixed(1)
                                : '--'}
                            </p>
                          </div>
                          <div className="bg-grappler-800 rounded-xl p-3 text-center">
                            <p className="text-xs text-grappler-400 mb-1">Identified</p>
                            <p className="text-lg font-bold text-grappler-50">
                              {analyses.filter((a) => a.stickingPoint !== 'unknown').length}
                            </p>
                          </div>
                        </div>

                        {/* Exercise Analysis List (all exercises, including unknown) */}
                        {analyses.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-medium text-grappler-200">Exercise Breakdown</h4>
                            {analyses.map((analysis, index) => {
                              const config = stickingPointConfig[analysis.stickingPoint];

                              return (
                                <motion.button
                                  key={analysis.exerciseId}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.05 }}
                                  onClick={() => setSelectedExercise(analysis)}
                                  className="w-full card p-4 text-left hover:bg-grappler-700/50 transition-colors"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-medium text-grappler-100">
                                      {analysis.exerciseName}
                                    </h5>
                                    <span
                                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}
                                    >
                                      {config.label}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-4 text-xs text-grappler-400">
                                    <span className="flex items-center gap-1">
                                      <Target className="w-3 h-3" />
                                      RPE: {analysis.avgRPE.toFixed(1)}
                                    </span>
                                    {analysis.suggestedAccessories.length > 0 && (
                                      <span className="flex items-center gap-1">
                                        <Zap className="w-3 h-3 text-yellow-400" />
                                        {analysis.suggestedAccessories.length} accessories
                                      </span>
                                    )}
                                    {analysis.failureReps.length > 0 && (
                                      <span className="flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3 text-blue-400" />
                                        Fails at rep {analysis.failureReps[0]}
                                      </span>
                                    )}
                                  </div>

                                  {/* Mini analysis preview */}
                                  <p className="text-xs text-grappler-400 mt-2 line-clamp-2">
                                    {analysis.analysis}
                                  </p>
                                </motion.button>
                              );
                            })}
                          </div>
                        )}

                        {/* Tips Section */}
                        {analyses.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="card p-4 bg-gradient-to-br from-primary-500/10 to-accent-500/10 border-primary-500/20"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className="w-4 h-4 text-primary-400" />
                              <h4 className="font-medium text-grappler-200">Strength Tips</h4>
                            </div>
                            <ul className="space-y-2 text-sm text-grappler-300">
                              <li className="flex items-start gap-2">
                                <span className="text-primary-400 mt-0.5">-</span>
                                Address sticking points with targeted accessories 2-3x per week.
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-primary-400 mt-0.5">-</span>
                                Keep RPE between 7-9 for main lifts to balance stimulus and recovery.
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-primary-400 mt-0.5">-</span>
                                Track failure reps to identify if fatigue is muscular or technique-based.
                              </li>
                            </ul>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Power Profile Section (Force-Velocity) ─────────────────────────────────

const PROFILE_CONFIG: Record<
  FVProfileResult['profile'],
  { label: string; color: string; bg: string; icon: typeof Dumbbell }
> = {
  force_dominant: {
    label: 'Force Dominant',
    color: 'text-red-400',
    bg: 'bg-red-500/15 border-red-500/30',
    icon: Dumbbell,
  },
  velocity_dominant: {
    label: 'Velocity Dominant',
    color: 'text-sky-400',
    bg: 'bg-sky-500/15 border-sky-500/30',
    icon: Zap,
  },
  balanced: {
    label: 'Balanced',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15 border-emerald-500/30',
    icon: Target,
  },
};

const FV_CONFIDENCE = {
  low: { label: 'Low confidence', color: 'text-grappler-400' },
  medium: { label: 'Moderate confidence', color: 'text-yellow-400' },
  high: { label: 'High confidence', color: 'text-emerald-400' },
} as const;

function PowerProfileSection({ fvProfile }: { fvProfile: FVProfileResult }) {
  const [expanded, setExpanded] = useState(false);
  const { profile, imbalance, confidence, prescription, explanation } = fvProfile;
  const config = PROFILE_CONFIG[profile];
  const confConfig = FV_CONFIDENCE[confidence];

  // Imbalance bar: -100 (force) to +100 (velocity)
  // Map to 0-100% for positioning (0% = force, 50% = balanced, 100% = velocity)
  const markerPct = ((imbalance + 100) / 200) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card overflow-hidden"
    >
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-primary-400" />
            <h3 className="text-base font-semibold text-grappler-50">Power Profile</h3>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-grappler-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
        </div>

        {/* Profile badge + imbalance bar (compact) */}
        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.color}`}>
            {config.label}
          </span>
          <span className={`text-xs ${confConfig.color}`}>{confConfig.label}</span>
        </div>

        {/* Imbalance bar — always shown */}
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-grappler-500 mb-1">
            <span>Force</span>
            <span>Balanced</span>
            <span>Velocity</span>
          </div>
          <div className="relative h-3 rounded-full bg-grappler-800 overflow-hidden">
            {/* Gradient background */}
            <div className="absolute inset-0 flex">
              <div className="flex-1 bg-red-500/15" />
              <div className="flex-1 bg-emerald-500/15" />
              <div className="flex-1 bg-sky-500/15" />
            </div>
            {/* Center line */}
            <div className="absolute inset-y-0 left-1/2 w-px bg-grappler-600" />
            {/* Marker */}
            <motion.div
              className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-md z-10 ${
                profile === 'force_dominant' ? 'bg-red-400' :
                profile === 'velocity_dominant' ? 'bg-sky-400' :
                'bg-emerald-400'
              }`}
              style={{ left: `${markerPct}%`, marginLeft: '-6px' }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
            />
          </div>
          <div className="text-center mt-1">
            <span className="text-xs text-grappler-400 tabular-nums">
              Imbalance: <span className={config.color}>{imbalance > 0 ? '+' : ''}{imbalance}</span>
            </span>
          </div>
        </div>
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Explanation */}
              <div className="bg-grappler-800/40 rounded-lg p-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-grappler-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-grappler-300 leading-relaxed">{explanation}</p>
              </div>

              {/* Prescription split */}
              <div className="bg-grappler-800/40 rounded-lg p-3">
                <h4 className="text-sm font-medium text-grappler-100 mb-2">Training Prescription</h4>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-400">{prescription.forcePercent}%</div>
                    <div className="text-[10px] text-grappler-500 uppercase">Force</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-grappler-200">{prescription.balancedPercent}%</div>
                    <div className="text-[10px] text-grappler-500 uppercase">Balanced</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-sky-400">{prescription.velocityPercent}%</div>
                    <div className="text-[10px] text-grappler-500 uppercase">Velocity</div>
                  </div>
                </div>
                {/* Visual split bar */}
                <div className="h-2 rounded-full overflow-hidden flex">
                  <div className="bg-red-500/60" style={{ width: `${prescription.forcePercent}%` }} />
                  <div className="bg-grappler-400/40" style={{ width: `${prescription.balancedPercent}%` }} />
                  <div className="bg-sky-500/60" style={{ width: `${prescription.velocityPercent}%` }} />
                </div>
              </div>

              {/* Rep ranges + rest */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-grappler-800/40 rounded-lg p-3">
                  <p className="text-[10px] text-grappler-500 uppercase mb-1">Rep Ranges</p>
                  <p className="text-xs text-grappler-200">{prescription.repRanges}</p>
                </div>
                <div className="bg-grappler-800/40 rounded-lg p-3">
                  <p className="text-[10px] text-grappler-500 uppercase mb-1">Rest Periods</p>
                  <p className="text-xs text-grappler-200">{prescription.restPeriods}</p>
                </div>
              </div>

              {/* Exercise recommendations */}
              {prescription.exerciseFocus.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Dumbbell className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-medium text-grappler-100">Focus Exercises</h4>
                  </div>
                  <div className="space-y-1.5">
                    {prescription.exerciseFocus.map((exercise, i) => (
                      <motion.div
                        key={exercise}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-2 bg-grappler-800 rounded-lg p-2.5"
                      >
                        <div className="w-5 h-5 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-primary-400">{i + 1}</span>
                        </div>
                        <span className="text-xs text-grappler-200">{exercise}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
