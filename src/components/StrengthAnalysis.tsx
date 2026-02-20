'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  Zap,
  BarChart3,
  Activity
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
  const { workoutLogs, user } = useAppStore();
  const weightUnit = user?.weightUnit || 'lbs';
  const [analyses, setAnalyses] = useState<StickingPointAnalysis[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<StickingPointAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

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
                            <div className="flex items-center gap-2 text-[11px]">
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
            {/* Overall Strength Trends */}
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

            {/* Exercise Analysis List */}
            <div className="space-y-2">
              <h4 className="font-medium text-grappler-200">Exercise Breakdown</h4>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : analyses.length === 0 ? (
                <div className="text-center py-8 text-grappler-500">
                  <Target className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Need more sessions to generate analysis.</p>
                  <p className="text-xs mt-1">Log at least 2 sessions per exercise.</p>
                </div>
              ) : (
                analyses.map((analysis, index) => {
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
                })
              )}
            </div>

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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
