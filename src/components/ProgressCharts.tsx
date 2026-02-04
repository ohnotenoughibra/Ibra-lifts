'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
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
  AreaChart
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
import { cn, formatNumber, formatDate, percentageChange } from '@/lib/utils';
import { calculate1RM } from '@/lib/workout-generator';
import { getExerciseById } from '@/lib/exercises';

type ChartView = 'strength' | 'volume' | 'distribution' | 'frequency' | 'recovery';

interface ProgressChartsProps {
  onViewReport?: (mesoId: string) => void;
}

export default function ProgressCharts({ onViewReport }: ProgressChartsProps = {}) {
  const { workoutLogs, gamificationStats, mesocycleHistory, currentMesocycle, user, wearableHistory, bodyWeightLog } = useAppStore();
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

  // Calculate muscle group distribution
  const muscleDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};

    const muscleNameMap: Record<string, string> = {
      chest: 'Chest', back: 'Back', shoulders: 'Shoulders', biceps: 'Arms',
      triceps: 'Arms', quadriceps: 'Legs', hamstrings: 'Legs', glutes: 'Legs',
      calves: 'Legs', core: 'Core', forearms: 'Arms', traps: 'Back',
      lats: 'Back', full_body: 'Full Body'
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
  }, [workoutLogs]);

  // Calculate recovery trend from wearable history
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
    if (gamificationStats.currentStreak >= 7) {
      results.push({
        type: 'positive',
        message: `${gamificationStats.currentStreak} day streak! Consistency is your superpower.`
      });
    }

    // PRs
    if (gamificationStats.personalRecords > 0) {
      results.push({
        type: 'positive',
        message: `${gamificationStats.personalRecords} personal records crushed! Strength is building.`
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

    // Default insight
    if (results.length === 0) {
      results.push({
        type: 'neutral',
        message: 'Keep logging workouts to unlock personalized insights!'
      });
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
          <p className="stat-value">{formatNumber(gamificationStats.totalVolume)} {weightUnit}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-400" />
            <span className="stat-label">Personal Records</span>
          </div>
          <p className="stat-value">{gamificationStats.personalRecords}</p>
        </div>
      </div>

      {/* Relative Strength (strength-to-bodyweight ratios) */}
      {strengthRatios && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-primary-400" />
            <h3 className="font-medium text-grappler-200 text-sm">Relative Strength</h3>
            <span className="text-xs text-grappler-500 ml-auto">{strengthRatios.bodyWeight} {weightUnit} BW</span>
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

      {/* Chart Tabs */}
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
                    {Object.entries(strengthData).slice(0, 4).map(([exercise, data], i) => (
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
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-grappler-500 gap-2">
                <TrendingUp className="w-8 h-8 text-grappler-600" />
                <p className="font-medium">No strength data yet</p>
                <p className="text-xs text-grappler-600">Complete a few workouts to track your estimated 1RM over time</p>
              </div>
            )}
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
              <div className="h-64 flex flex-col items-center justify-center text-grappler-500 gap-2">
                <BarChart3 className="w-8 h-8 text-grappler-600" />
                <p className="font-medium">No volume data yet</p>
                <p className="text-xs text-grappler-600">Log sets and reps to see your weekly volume trends</p>
              </div>
            )}
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
              <div className="h-64 flex flex-col items-center justify-center text-grappler-500 gap-2">
                <PieChartIcon className="w-8 h-8 text-grappler-600" />
                <p className="font-medium">No distribution data yet</p>
                <p className="text-xs text-grappler-600">Train different muscle groups to see your split breakdown</p>
              </div>
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
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-grappler-500 gap-2">
                <Calendar className="w-8 h-8 text-grappler-600" />
                <p className="font-medium">No frequency data yet</p>
                <p className="text-xs text-grappler-600">Train consistently to see your workout frequency over time</p>
              </div>
            )}
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
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                      <YAxis yAxisId="left" stroke="#22c55e" fontSize={11} domain={[0, 100]} />
                      <YAxis yAxisId="right" orientation="right" stroke="#0ea5e9" fontSize={11} />
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
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                      <YAxis yAxisId="left" stroke="#f59e0b" fontSize={11} domain={[0, 21]} />
                      <YAxis yAxisId="right" orientation="right" stroke="#d946ef" fontSize={11} domain={[0, 12]} />
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
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-grappler-500 gap-2">
                <Heart className="w-8 h-8 text-grappler-600" />
                <p className="font-medium">No wearable data yet</p>
                <p className="text-xs text-grappler-600">Connect Whoop or add manual entries to track recovery trends</p>
              </div>
            )}
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
              return (
                <button
                  key={meso.id}
                  onClick={() => onViewReport?.(meso.id)}
                  className="w-full flex items-center justify-between py-2.5 border-b border-grappler-700 last:border-0 text-left hover:bg-grappler-800/30 rounded-lg px-2 -mx-2 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-grappler-200 truncate">{meso.name}</p>
                    <p className="text-xs text-grappler-500">
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
