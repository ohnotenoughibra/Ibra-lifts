'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Dumbbell,
  Star,
  Target,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useAppStore } from '@/lib/store';

interface ProgressiveOverloadProps {
  onClose: () => void;
}

interface SessionDataPoint {
  date: string;
  timestamp: number;
  estimated1RM: number;
  bestWeight: number;
  bestReps: number;
}

interface ExerciseSummary {
  exerciseId: string;
  exerciseName: string;
  sessions: SessionDataPoint[];
  current1RM: number;
  starting1RM: number;
  totalGain: number;
  totalGainPercent: number;
  trend: 'up' | 'down' | 'stable';
  bestSet: { weight: number; reps: number };
  weeklyRate: number;
}

// Brzycki 1993, validated across all rep ranges (Reynolds et al. 2006, Pereira et al. 2020)
function brzycki1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight / (1.0278 - 0.0278 * reps));
}

function formatShortDate(dateStr: string | Date): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function ProgressiveOverload({ onClose }: ProgressiveOverloadProps) {
  const { workoutLogs, user } = useAppStore();
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const weightUnit = user?.weightUnit || 'lbs';

  // Build per-exercise data from all workout logs
  const exerciseMap = useMemo(() => {
    const map = new Map<string, ExerciseSummary>();

    // Sort logs by date ascending
    const sortedLogs = [...workoutLogs].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sortedLogs.forEach((log) => {
      log.exercises.forEach((ex) => {
        if (!map.has(ex.exerciseId)) {
          map.set(ex.exerciseId, {
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            sessions: [],
            current1RM: 0,
            starting1RM: 0,
            totalGain: 0,
            totalGainPercent: 0,
            trend: 'stable',
            bestSet: { weight: 0, reps: 0 },
            weeklyRate: 0,
          });
        }

        const summary = map.get(ex.exerciseId)!;

        // Find the best set for e1RM this session
        let sessionBest1RM = 0;
        let sessionBestWeight = 0;
        let sessionBestReps = 0;

        ex.sets.forEach((set) => {
          if (!set.completed || set.weight <= 0) return;
          const e1rm = brzycki1RM(set.weight, set.reps);
          if (e1rm > sessionBest1RM) {
            sessionBest1RM = e1rm;
            sessionBestWeight = set.weight;
            sessionBestReps = set.reps;
          }
          // Track all-time best set by raw volume potential (weight x reps)
          const setScore = set.weight * set.reps;
          const bestScore = summary.bestSet.weight * summary.bestSet.reps;
          if (setScore > bestScore) {
            summary.bestSet = { weight: set.weight, reps: set.reps };
          }
        });

        if (sessionBest1RM > 0) {
          summary.sessions.push({
            date: formatShortDate(log.date),
            timestamp: new Date(log.date).getTime(),
            estimated1RM: sessionBest1RM,
            bestWeight: sessionBestWeight,
            bestReps: sessionBestReps,
          });
        }
      });
    });

    // Compute derived stats for each exercise
    map.forEach((summary) => {
      if (summary.sessions.length === 0) return;

      summary.starting1RM = summary.sessions[0].estimated1RM;
      summary.current1RM = summary.sessions[summary.sessions.length - 1].estimated1RM;
      summary.totalGain = summary.current1RM - summary.starting1RM;
      summary.totalGainPercent =
        summary.starting1RM > 0
          ? Math.round((summary.totalGain / summary.starting1RM) * 100)
          : 0;

      // Determine trend from last 3 sessions
      const recent = summary.sessions.slice(-3);
      if (recent.length >= 2) {
        const first = recent[0].estimated1RM;
        const last = recent[recent.length - 1].estimated1RM;
        const diff = last - first;
        const threshold = first * 0.02; // 2% threshold for "stable"
        if (diff > threshold) {
          summary.trend = 'up';
        } else if (diff < -threshold) {
          summary.trend = 'down';
        } else {
          summary.trend = 'stable';
        }
      }

      // Weekly rate of gain
      if (summary.sessions.length >= 2) {
        const firstTs = summary.sessions[0].timestamp;
        const lastTs = summary.sessions[summary.sessions.length - 1].timestamp;
        const weeks = Math.max((lastTs - firstTs) / (7 * 24 * 60 * 60 * 1000), 1);
        summary.weeklyRate = parseFloat((summary.totalGain / weeks).toFixed(1));
      }
    });

    return map;
  }, [workoutLogs]);

  // All exercises sorted by session count descending
  const allExercises = useMemo(() => {
    return Array.from(exerciseMap.values())
      .filter((e) => e.sessions.length > 0)
      .sort((a, b) => b.sessions.length - a.sessions.length);
  }, [exerciseMap]);

  // Filtered list for search dropdown
  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) return allExercises;
    const q = searchQuery.toLowerCase();
    return allExercises.filter((e) => e.exerciseName.toLowerCase().includes(q));
  }, [allExercises, searchQuery]);

  // Auto-select the first exercise if none selected
  const selectedExercise = useMemo(() => {
    if (selectedExerciseId && exerciseMap.has(selectedExerciseId)) {
      return exerciseMap.get(selectedExerciseId)!;
    }
    return allExercises.length > 0 ? allExercises[0] : null;
  }, [selectedExerciseId, exerciseMap, allExercises]);

  // Build chart data with prediction points
  const chartData = useMemo(() => {
    if (!selectedExercise || selectedExercise.sessions.length === 0) return [];

    const actual = selectedExercise.sessions.map((s) => ({
      date: s.date,
      estimated1RM: s.estimated1RM,
      predicted1RM: null as number | null,
    }));

    // Add predicted trajectory at 4, 8, and 12 weeks
    if (selectedExercise.sessions.length >= 2 && selectedExercise.weeklyRate !== 0) {
      const lastSession = selectedExercise.sessions[selectedExercise.sessions.length - 1];
      const lastTs = lastSession.timestamp;
      const rate = selectedExercise.weeklyRate;

      // Connect prediction to last actual point
      actual[actual.length - 1].predicted1RM = lastSession.estimated1RM;

      [4, 8, 12].forEach((weeks) => {
        const futureTs = lastTs + weeks * 7 * 24 * 60 * 60 * 1000;
        const futureDate = new Date(futureTs);
        const projected = Math.round(lastSession.estimated1RM + rate * weeks);
        actual.push({
          date: `+${weeks}w`,
          estimated1RM: null as unknown as number,
          predicted1RM: Math.max(projected, 0),
        });
      });
    }

    return actual;
  }, [selectedExercise]);

  // Compute trend line (simple linear regression) for the reference line
  const trendLineValue = useMemo(() => {
    if (!selectedExercise || selectedExercise.sessions.length < 2) return null;
    const values = selectedExercise.sessions.map((s) => s.estimated1RM);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return Math.round(avg);
  }, [selectedExercise]);

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-grappler-400" />;
  };

  const trendColor = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return 'text-green-400';
    if (trend === 'down') return 'text-red-400';
    return 'text-grappler-400';
  };

  // Empty state
  if (workoutLogs.length === 0 || allExercises.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        className="min-h-screen bg-grappler-900 px-4 py-6 safe-area-top safe-area-bottom"
      >
        <div className="flex items-center gap-3 mb-6">
          <button aria-label="Go back" onClick={onClose} className="btn btn-secondary btn-sm">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-grappler-50">Progressive Overload</h2>
            <p className="text-sm text-grappler-400">Track weight progression over time</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Dumbbell className="w-16 h-16 text-grappler-500 mb-4" />
          <h3 className="text-lg font-semibold text-grappler-200 mb-2">
            No Workout Data Yet
          </h3>
          <p className="text-sm text-grappler-400 max-w-xs">
            Complete some workouts to see your progressive overload trends, estimated 1RM
            progression, and predicted trajectory.
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
      className="min-h-screen bg-grappler-900 px-4 py-6 safe-area-top safe-area-bottom"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button aria-label="Go back" onClick={onClose} className="btn btn-secondary btn-sm">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-grappler-50">Progressive Overload</h2>
          <p className="text-sm text-grappler-400">Track weight progression over time</p>
        </div>
      </div>

      {/* Exercise Selector */}
      <div className="relative mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grappler-400" />
          <input
            type="text"
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            className="w-full bg-grappler-800 border border-grappler-700 rounded-xl pl-10 pr-4 py-3 text-grappler-50 placeholder-grappler-500 focus-visible:outline-none focus-visible:border-primary-500 transition-colors"
          />
        </div>

        <AnimatePresence>
          {showDropdown && filteredExercises.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute z-20 w-full mt-1 bg-grappler-800 border border-grappler-700 rounded-xl overflow-hidden shadow-xl max-h-60 overflow-y-auto"
            >
              {filteredExercises.map((ex) => (
                <button
                  key={ex.exerciseId}
                  onClick={() => {
                    setSelectedExerciseId(ex.exerciseId);
                    setSearchQuery(ex.exerciseName);
                    setShowDropdown(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-grappler-700 transition-colors ${
                    selectedExercise?.exerciseId === ex.exerciseId
                      ? 'bg-grappler-700/50'
                      : ''
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-grappler-100">{ex.exerciseName}</p>
                    <p className="text-xs text-grappler-400">
                      {ex.sessions.length} session{ex.sessions.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendIcon trend={ex.trend} />
                    <span className="text-sm font-medium text-grappler-200">
                      {ex.current1RM} {weightUnit}
                    </span>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dismiss dropdown on outside click */}
        {showDropdown && (
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
        )}
      </div>

      {/* Selected Exercise Label */}
      {selectedExercise && (
        <div className="flex items-center gap-2 mb-4">
          <Dumbbell className="w-5 h-5 text-primary-400" />
          <h3 className="text-lg font-bold text-grappler-50">
            {selectedExercise.exerciseName}
          </h3>
          <TrendIcon trend={selectedExercise.trend} />
        </div>
      )}

      {/* Main Chart */}
      {selectedExercise && chartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4 mb-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-grappler-200">Estimated 1RM Over Time</h4>
            <span className="text-xs text-grappler-400">Brzycki Formula</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  domain={['dataMin - 10', 'dataMax + 10']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                  }}
                  formatter={(value: any, name: string) => {
                    if (value === null || value === undefined) return ['-', name];
                    const label =
                      name === 'predicted1RM'
                        ? 'Predicted 1RM'
                        : 'Estimated 1RM';
                    return [`${value} ${weightUnit}`, label];
                  }}
                />
                {/* Average reference line */}
                {trendLineValue && (
                  <ReferenceLine
                    y={trendLineValue}
                    stroke="#475569"
                    strokeDasharray="3 3"
                    label={{
                      value: `Avg: ${trendLineValue}`,
                      position: 'insideTopRight',
                      fill: '#64748b',
                      fontSize: 10,
                    }}
                  />
                )}
                {/* Actual data line */}
                <Line
                  type="monotone"
                  dataKey="estimated1RM"
                  stroke="#818cf8"
                  strokeWidth={2}
                  dot={{ fill: '#818cf8', r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#818cf8', stroke: '#c7d2fe', strokeWidth: 2 }}
                  connectNulls={false}
                />
                {/* Predicted trajectory line */}
                <Line
                  type="monotone"
                  dataKey="predicted1RM"
                  stroke="#818cf8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#818cf8', r: 3, strokeWidth: 0, opacity: 0.6 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {selectedExercise.weeklyRate !== 0 && selectedExercise.sessions.length >= 2 && (
            <p className="text-xs text-grappler-400 mt-2 text-center">
              Dotted line shows projected trajectory at current rate of{' '}
              <span className={trendColor(selectedExercise.trend)}>
                {selectedExercise.weeklyRate > 0 ? '+' : ''}
                {selectedExercise.weeklyRate} {weightUnit}/week
              </span>
            </p>
          )}
        </motion.div>
      )}

      {/* Stats Card */}
      {selectedExercise && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card p-4 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-primary-400" />
            <h4 className="font-medium text-grappler-200">Progression Stats</h4>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Starting 1RM */}
            <div className="bg-grappler-800 rounded-xl p-3">
              <p className="text-xs text-grappler-400 mb-1">Starting 1RM</p>
              <p className="text-lg font-bold text-grappler-50">
                {selectedExercise.starting1RM}{' '}
                <span className="text-xs font-normal text-grappler-400">{weightUnit}</span>
              </p>
            </div>

            {/* Current 1RM */}
            <div className="bg-grappler-800 rounded-xl p-3">
              <p className="text-xs text-grappler-400 mb-1">Current 1RM</p>
              <p className="text-lg font-bold text-grappler-50">
                {selectedExercise.current1RM}{' '}
                <span className="text-xs font-normal text-grappler-400">{weightUnit}</span>
              </p>
            </div>

            {/* Total Gain */}
            <div className="bg-grappler-800 rounded-xl p-3">
              <p className="text-xs text-grappler-400 mb-1">Total Gain</p>
              <div className="flex items-center gap-2">
                <p className={`text-lg font-bold ${trendColor(selectedExercise.trend)}`}>
                  {selectedExercise.totalGain > 0 ? '+' : ''}
                  {selectedExercise.totalGain}{' '}
                  <span className="text-xs font-normal">{weightUnit}</span>
                </p>
                <span className={`text-xs ${trendColor(selectedExercise.trend)}`}>
                  ({selectedExercise.totalGainPercent > 0 ? '+' : ''}
                  {selectedExercise.totalGainPercent}%)
                </span>
              </div>
            </div>

            {/* Trend Direction */}
            <div className="bg-grappler-800 rounded-xl p-3">
              <p className="text-xs text-grappler-400 mb-1">Trend</p>
              <div className="flex items-center gap-2">
                <TrendIcon trend={selectedExercise.trend} />
                <span className={`text-lg font-bold capitalize ${trendColor(selectedExercise.trend)}`}>
                  {selectedExercise.trend}
                </span>
              </div>
            </div>

            {/* Best Single Set */}
            <div className="bg-grappler-800 rounded-xl p-3">
              <p className="text-xs text-grappler-400 mb-1">Best Set</p>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400" />
                <p className="text-lg font-bold text-grappler-50">
                  {selectedExercise.bestSet.weight}
                  <span className="text-xs font-normal text-grappler-400"> {weightUnit}</span>
                  {' x '}
                  {selectedExercise.bestSet.reps}
                </p>
              </div>
            </div>

            {/* Weekly Rate */}
            <div className="bg-grappler-800 rounded-xl p-3">
              <p className="text-xs text-grappler-400 mb-1">Weekly Rate</p>
              <p className={`text-lg font-bold ${trendColor(selectedExercise.trend)}`}>
                {selectedExercise.weeklyRate > 0 ? '+' : ''}
                {selectedExercise.weeklyRate}{' '}
                <span className="text-xs font-normal">{weightUnit}/wk</span>
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* All Exercises Overview */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Dumbbell className="w-4 h-4 text-primary-400" />
          <h4 className="font-medium text-grappler-200">All Exercises</h4>
          <span className="text-xs text-grappler-400">({allExercises.length})</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {allExercises.map((ex, index) => (
            <motion.button
              key={ex.exerciseId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => {
                setSelectedExerciseId(ex.exerciseId);
                setSearchQuery(ex.exerciseName);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`bg-grappler-800 rounded-xl p-4 text-left transition-all hover:bg-grappler-700 ${
                selectedExercise?.exerciseId === ex.exerciseId
                  ? 'ring-1 ring-primary-500'
                  : ''
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <p className="text-sm font-medium text-grappler-100 leading-tight line-clamp-2">
                  {ex.exerciseName}
                </p>
                <TrendIcon trend={ex.trend} />
              </div>

              <p className="text-lg font-bold text-grappler-50 mb-1">
                {ex.current1RM}{' '}
                <span className="text-xs font-normal text-grappler-400">{weightUnit}</span>
              </p>

              <p className="text-xs text-grappler-400">
                {ex.sessions.length} session{ex.sessions.length !== 1 ? 's' : ''}
                {ex.totalGain !== 0 && (
                  <span className={`ml-1 ${trendColor(ex.trend)}`}>
                    ({ex.totalGain > 0 ? '+' : ''}{ex.totalGain})
                  </span>
                )}
              </p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Predicted Trajectory Summary */}
      {selectedExercise && selectedExercise.sessions.length >= 2 && selectedExercise.weeklyRate > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-4 bg-gradient-to-br from-primary-500/10 to-accent-500/10 border-primary-500/20 mb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-primary-400" />
            <h4 className="font-medium text-grappler-200">Predicted Trajectory</h4>
          </div>
          <p className="text-xs text-grappler-400 mb-3">
            Based on your current weekly rate of{' '}
            <span className="text-green-400">
              +{selectedExercise.weeklyRate} {weightUnit}/week
            </span>
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[4, 8, 12].map((weeks) => {
              const projected = Math.round(
                selectedExercise.current1RM + selectedExercise.weeklyRate * weeks
              );
              return (
                <div key={weeks} className="bg-grappler-800/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-grappler-400 mb-1">{weeks} Weeks</p>
                  <p className="text-lg font-bold text-grappler-50">
                    {projected}
                  </p>
                  <p className="text-xs text-grappler-400">{weightUnit}</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
