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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import { useAppStore } from '@/lib/store';
import { generateExerciseProfile } from '@/lib/ai-coach';
import { ExerciseResponseProfile } from '@/lib/types';

interface ExerciseProfilerProps {
  onClose: () => void;
}

const recommendationConfig: Record<
  ExerciseResponseProfile['recommendation'],
  { label: string; color: string; bgColor: string; icon: typeof TrendingUp }
> = {
  increase: {
    label: 'Increase Volume',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    icon: TrendingUp,
  },
  maintain: {
    label: 'Maintain',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    icon: Target,
  },
  decrease: {
    label: 'Reduce',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    icon: TrendingDown,
  },
  swap: {
    label: 'Consider Swapping',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    icon: AlertTriangle,
  },
};

const volumeResponseValue: Record<ExerciseResponseProfile['volumeResponse'], number> = {
  high: 100,
  moderate: 60,
  low: 30,
};

export default function ExerciseProfiler({ onClose }: ExerciseProfilerProps) {
  const { workoutLogs } = useAppStore();
  const [selectedProfile, setSelectedProfile] = useState<ExerciseResponseProfile | null>(null);
  const [profiles, setProfiles] = useState<ExerciseResponseProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Extract unique exercises from all workout logs and generate profiles
  useEffect(() => {
    if (workoutLogs.length === 0) {
      setLoading(false);
      return;
    }

    const exerciseMap = new Map<string, { id: string; name: string }>();
    workoutLogs.forEach((log) => {
      log.exercises.forEach((ex) => {
        if (!exerciseMap.has(ex.exerciseId)) {
          exerciseMap.set(ex.exerciseId, {
            id: ex.exerciseId,
            name: ex.exerciseName,
          });
        }
      });
    });

    const generateProfiles = async () => {
      const generated: ExerciseResponseProfile[] = [];
      for (const exerciseId of Array.from(exerciseMap.keys())) {
        try {
          const exerciseInfo = exerciseMap.get(exerciseId);
          const profile = generateExerciseProfile(exerciseId, exerciseInfo?.name || exerciseId, workoutLogs);
          if (profile) {
            generated.push(profile);
          }
        } catch {
          // Skip exercises that fail to generate profiles
        }
      }

      // Sort by recommendation priority: increase first, then maintain, decrease, swap
      const priority: Record<ExerciseResponseProfile['recommendation'], number> = {
        increase: 0,
        maintain: 1,
        decrease: 2,
        swap: 3,
      };
      generated.sort((a, b) => priority[a.recommendation] - priority[b.recommendation]);
      setProfiles(generated);
      setLoading(false);
    };

    generateProfiles();
  }, [workoutLogs]);

  // Build radar chart data for the selected profile
  const radarData = useMemo(() => {
    if (!selectedProfile) return [];
    return [
      { subject: 'Pump', value: (selectedProfile.avgPumpRating / 5) * 100 },
      { subject: 'Strength Gain', value: Math.min(100, selectedProfile.strengthGainRate * 20) },
      { subject: 'Volume Response', value: volumeResponseValue[selectedProfile.volumeResponse] },
      { subject: 'Joint Health', value: (1 - selectedProfile.jointPainFrequency) * 100 },
      { subject: 'Consistency', value: Math.min(100, selectedProfile.totalSessions * 10) },
    ];
  }, [selectedProfile]);

  // Build bar chart data showing all profiles by strength gain rate
  const strengthGainData = useMemo(() => {
    return profiles.slice(0, 8).map((p) => ({
      name: p.exerciseName.length > 12 ? p.exerciseName.slice(0, 12) + '...' : p.exerciseName,
      rate: parseFloat(p.strengthGainRate.toFixed(2)),
    }));
  }, [profiles]);

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
            <h2 className="text-xl font-bold text-grappler-50">Exercise Profiler</h2>
            <p className="text-sm text-grappler-400">
              Discover which exercises work best for you
            </p>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Activity className="w-16 h-16 text-grappler-500 mb-4" />
          <h3 className="text-lg font-semibold text-grappler-200 mb-2">
            No Workout Data Yet
          </h3>
          <p className="text-sm text-grappler-400 max-w-xs">
            Complete a few workouts with exercise feedback to generate your personalized
            exercise response profiles. The more data we have, the smarter your recommendations.
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
          <h2 className="text-xl font-bold text-grappler-50">Exercise Profiler</h2>
          <p className="text-sm text-grappler-400">
            Discover which exercises work best for you
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedProfile ? (
          /* Detail View */
          <motion.div
            key="detail"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Back to list */}
            <button
              onClick={() => setSelectedProfile(null)}
              className="flex items-center gap-1 text-sm text-grappler-400 hover:text-grappler-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to exercises
            </button>

            {/* Exercise Title & Badge */}
            <div className="card p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-grappler-50">
                    {selectedProfile.exerciseName}
                  </h3>
                  <p className="text-sm text-grappler-400">
                    {selectedProfile.totalSessions} sessions logged
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    recommendationConfig[selectedProfile.recommendation].bgColor
                  } ${recommendationConfig[selectedProfile.recommendation].color}`}
                >
                  {recommendationConfig[selectedProfile.recommendation].label}
                </span>
              </div>
            </div>

            {/* Radar Chart */}
            <div className="card p-4">
              <h4 className="font-medium text-grappler-200 mb-3">Response Profile</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fill: '#64748b', fontSize: 10 }}
                    />
                    <Radar
                      name="Response"
                      dataKey="value"
                      stroke="#0ea5e9"
                      fill="#0ea5e9"
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-grappler-800 rounded-xl p-4 text-center">
                <p className="text-xs text-grappler-400 mb-1">Sessions</p>
                <p className="text-lg font-bold text-grappler-50">
                  {selectedProfile.totalSessions}
                </p>
              </div>
              <div className="bg-grappler-800 rounded-xl p-4 text-center">
                <p className="text-xs text-grappler-400 mb-1">Best Rep Range</p>
                <p className="text-lg font-bold text-grappler-50">
                  {selectedProfile.bestRepRange}
                </p>
              </div>
              <div className="bg-grappler-800 rounded-xl p-4 text-center">
                <p className="text-xs text-grappler-400 mb-1">Avg Difficulty</p>
                <p className="text-lg font-bold text-grappler-50">
                  {selectedProfile.avgDifficulty.toFixed(1)}/4
                </p>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-grappler-400">Avg Pump Rating</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-grappler-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${(selectedProfile.avgPumpRating / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-grappler-200">
                    {selectedProfile.avgPumpRating.toFixed(1)}/5
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-grappler-400">Strength Gain Rate</span>
                <span className="text-sm font-medium text-grappler-200">
                  {selectedProfile.strengthGainRate.toFixed(2)}%/week
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-grappler-400">Joint Pain Frequency</span>
                <span
                  className={`text-sm font-medium ${
                    selectedProfile.jointPainFrequency > 0.3
                      ? 'text-red-400'
                      : selectedProfile.jointPainFrequency > 0.1
                      ? 'text-blue-400'
                      : 'text-green-400'
                  }`}
                >
                  {(selectedProfile.jointPainFrequency * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-grappler-400">Volume Response</span>
                <span className="text-sm font-medium text-grappler-200 capitalize">
                  {selectedProfile.volumeResponse}
                </span>
              </div>
            </div>

            {/* Recommendation */}
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <h4 className="font-medium text-grappler-200">Recommendation</h4>
              </div>
              <p className="text-sm text-grappler-300 leading-relaxed">
                {selectedProfile.recommendation === 'increase' &&
                  `You respond very well to ${selectedProfile.exerciseName}. Consider adding more volume or frequency for this exercise. Your best rep range is ${selectedProfile.bestRepRange} reps with a strong pump response and low joint stress.`}
                {selectedProfile.recommendation === 'maintain' &&
                  `${selectedProfile.exerciseName} is working well for you at current volumes. Keep the intensity steady and focus on progressive overload within the ${selectedProfile.bestRepRange} rep range.`}
                {selectedProfile.recommendation === 'decrease' &&
                  `You may be doing too much volume on ${selectedProfile.exerciseName}. Consider reducing sets or frequency to allow better recovery. Your difficulty ratings suggest accumulated fatigue.`}
                {selectedProfile.recommendation === 'swap' &&
                  `${selectedProfile.exerciseName} may not be the best fit for you right now. Joint pain frequency is ${(selectedProfile.jointPainFrequency * 100).toFixed(0)}% and difficulty is high. Consider swapping to an alternative exercise that targets the same muscles.`}
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
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-grappler-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-primary-400" />
                  <span className="text-xs text-grappler-400">Exercises Tracked</span>
                </div>
                <p className="text-xl font-bold text-grappler-50">{profiles.length}</p>
              </div>
              <div className="bg-grappler-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-grappler-400">Top Responders</span>
                </div>
                <p className="text-xl font-bold text-grappler-50">
                  {profiles.filter((p) => p.recommendation === 'increase').length}
                </p>
              </div>
            </div>

            {/* Strength Gain Comparison */}
            {strengthGainData.length > 0 && (
              <div className="card p-4">
                <h4 className="font-medium text-grappler-200 mb-3">
                  Strength Gain Rate by Exercise
                </h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={strengthGainData} layout="vertical">
                      <XAxis
                        type="number"
                        stroke="#64748b"
                        fontSize={10}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke="#64748b"
                        fontSize={10}
                        width={90}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [`${value}%/week`, 'Strength Gain']}
                      />
                      <Bar dataKey="rate" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Exercise List */}
            <div className="space-y-2">
              <h4 className="font-medium text-grappler-200">Exercise Rankings</h4>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                profiles.map((profile, index) => {
                  const config = recommendationConfig[profile.recommendation];
                  const IconComponent = config.icon;

                  return (
                    <motion.button
                      key={profile.exerciseId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => setSelectedProfile(profile)}
                      className="w-full card p-4 text-left hover:bg-grappler-700/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-grappler-700 flex items-center justify-center">
                            <span className="text-sm font-bold text-grappler-200">
                              {index + 1}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-grappler-100 truncate">
                              {profile.exerciseName}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-grappler-500">
                              <span>{profile.totalSessions} sessions</span>
                              <span>-</span>
                              <span>{profile.bestRepRange} reps</span>
                            </div>
                          </div>
                        </div>
                        <span
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color} flex-shrink-0`}
                        >
                          <IconComponent className="w-3 h-3" />
                          {config.label}
                        </span>
                      </div>

                      {/* Mini stats row */}
                      <div className="flex items-center gap-4 mt-2 ml-11 text-xs text-grappler-500">
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-purple-400" />
                          Pump: {profile.avgPumpRating.toFixed(1)}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-green-400" />
                          +{profile.strengthGainRate.toFixed(1)}%/wk
                        </span>
                        {profile.jointPainFrequency > 0.1 && (
                          <span className="flex items-center gap-1 text-blue-400">
                            <AlertTriangle className="w-3 h-3" />
                            Pain: {(profile.jointPainFrequency * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </motion.button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
