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
  Activity
} from 'lucide-react';
import { cn, formatNumber, formatDate, percentageChange } from '@/lib/utils';
import { calculate1RM } from '@/lib/workout-generator';

type ChartView = 'strength' | 'volume' | 'distribution' | 'frequency';

export default function ProgressCharts() {
  const { workoutLogs, gamificationStats, mesocycleHistory, currentMesocycle } = useAppStore();
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

  // Calculate volume progress data
  const volumeData = useMemo(() => {
    const weeklyVolume: { week: string; volume: number; workouts: number }[] = [];

    // Group by week
    const volumeByWeek: Record<string, { volume: number; workouts: number }> = {};

    workoutLogs.forEach(log => {
      const date = new Date(log.date);
      const weekKey = `Week ${Math.ceil((date.getDate()) / 7)}`;

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

    workoutLogs.forEach(log => {
      log.exercises.forEach(ex => {
        // Simplified - would need to look up exercise details in real app
        const muscle = ex.exerciseName.toLowerCase().includes('squat') ? 'Legs' :
                      ex.exerciseName.toLowerCase().includes('deadlift') ? 'Back' :
                      ex.exerciseName.toLowerCase().includes('bench') ? 'Chest' :
                      ex.exerciseName.toLowerCase().includes('row') ? 'Back' :
                      ex.exerciseName.toLowerCase().includes('press') ? 'Shoulders' :
                      ex.exerciseName.toLowerCase().includes('curl') ? 'Arms' :
                      'Other';

        distribution[muscle] = (distribution[muscle] || 0) + ex.sets.filter(s => s.completed).length;
      });
    });

    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }, [workoutLogs]);

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

    // Default insight
    if (results.length === 0) {
      results.push({
        type: 'neutral',
        message: 'Keep logging workouts to unlock personalized insights!'
      });
    }

    return results;
  }, [volumeData, gamificationStats]);

  const COLORS = ['#0ea5e9', '#d946ef', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

  const tabs = [
    { id: 'strength', label: 'Strength', icon: TrendingUp },
    { id: 'volume', label: 'Volume', icon: BarChart3 },
    { id: 'distribution', label: 'Distribution', icon: PieChartIcon },
    { id: 'frequency', label: 'Frequency', icon: Calendar },
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
          <p className="stat-value">{formatNumber(gamificationStats.totalVolume)} lbs</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-400" />
            <span className="stat-label">Personal Records</span>
          </div>
          <p className="stat-value">{gamificationStats.personalRecords}</p>
        </div>
      </div>

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
              <div className="h-64 flex items-center justify-center text-grappler-500">
                Complete workouts to see strength progress
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
                      formatter={(value: number) => [`${formatNumber(value)} lbs`, 'Volume']}
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
              <div className="h-64 flex items-center justify-center text-grappler-500">
                Complete workouts to see volume trends
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
              <div className="h-64 flex items-center justify-center text-grappler-500">
                Complete workouts to see distribution
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
              <div className="h-64 flex items-center justify-center text-grappler-500">
                Complete workouts to see frequency data
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
            {mesocycleHistory.map((meso, i) => (
              <div
                key={meso.id}
                className="flex items-center justify-between py-2 border-b border-grappler-700 last:border-0"
              >
                <div>
                  <p className="font-medium text-grappler-200">{meso.name}</p>
                  <p className="text-xs text-grappler-500">
                    {meso.weeks.length} weeks • {meso.goalFocus} focus
                  </p>
                </div>
                <span className="badge badge-success">Completed</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
