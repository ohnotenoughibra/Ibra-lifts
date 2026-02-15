'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Moon,
  Activity,
  Heart,
  Thermometer,
  Wind,
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Check
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { useAppStore } from '@/lib/store';
import { calculateEnhancedACWR } from '@/lib/fatigue-metrics';

interface RecoveryDashboardProps {
  onClose: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function getScoreColor(score: number): string {
  if (score > 67) return '#34d399';  // green
  if (score >= 34) return '#fbbf24'; // yellow
  return '#f87171';                  // red
}

function getScoreLabel(score: number): string {
  if (score > 67) return 'Good';
  if (score >= 34) return 'Moderate';
  return 'Low';
}

function formatSessionDate(date: Date | string): string {
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function sleepLabel(v: number): string { return v >= 4 ? 'Good' : v >= 3 ? 'Fair' : 'Poor'; }
function sorenessLabel(v: number): string { return v <= 2 ? 'Low' : v <= 3 ? 'Moderate' : 'High'; }
function stressLabel(v: number): string { return v <= 2 ? 'Low' : v <= 3 ? 'Moderate' : 'High'; }
function metricColor(good: boolean, mid: boolean): string {
  return good ? 'text-green-400' : mid ? 'text-yellow-400' : 'text-red-400';
}

export default function RecoveryDashboard({ onClose }: RecoveryDashboardProps) {
  const { workoutLogs, bodyWeightLog, trainingSessions } = useAppStore();
  const [selectedTab, setSelectedTab] = useState<'overview' | 'trends'>('overview');

  // Sort logs by date descending
  const sortedLogs = useMemo(() => {
    return [...workoutLogs]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [workoutLogs]);

  // Get logs with pre-check-in data
  const logsWithCheckIn = useMemo(() => {
    return sortedLogs.filter(log => log.preCheckIn);
  }, [sortedLogs]);

  // Last 10 sessions for sleep trend
  const sleepTrendData = useMemo(() => {
    return logsWithCheckIn
      .slice(0, 10)
      .reverse()
      .map(log => ({
        date: formatSessionDate(log.date),
        sleep: log.preCheckIn!.sleepQuality,
        hours: log.preCheckIn!.sleepHours,
      }));
  }, [logsWithCheckIn]);

  // Stress & soreness trend (last 10)
  const stressSorenessTrendData = useMemo(() => {
    return logsWithCheckIn
      .slice(0, 10)
      .reverse()
      .map(log => ({
        date: formatSessionDate(log.date),
        stress: log.preCheckIn!.stress,
        soreness: log.preCheckIn!.soreness,
      }));
  }, [logsWithCheckIn]);

  // Training load calculations (sRPE-weighted ACWR)
  const trainingLoad = useMemo(() => {
    const acwr = calculateEnhancedACWR(workoutLogs, trainingSessions);
    return {
      acute: acwr.acute,
      chronic: acwr.chronic,
      ratio: acwr.ratio,
      isOptimal: acwr.status === 'optimal',
      isTooHigh: acwr.status === 'high' || acwr.status === 'very_high',
      isTooLow: acwr.status === 'low',
    };
  }, [workoutLogs, trainingSessions]);

  // Compute composite recovery score (0-100)
  const recoveryScore = useMemo(() => {
    if (logsWithCheckIn.length === 0) return 50; // default neutral

    // Use the most recent 3 check-ins for averaging
    const recent = logsWithCheckIn.slice(0, 3);

    // Average sleep quality (1-5 scale) -> normalize to 0-100
    const avgSleep = recent.reduce((sum, l) => sum + l.preCheckIn!.sleepQuality, 0) / recent.length;
    const sleepScore = ((avgSleep - 1) / 4) * 100;

    // Average soreness (1-5 scale, lower is better) -> invert and normalize
    const avgSoreness = recent.reduce((sum, l) => sum + l.preCheckIn!.soreness, 0) / recent.length;
    const sorenessScore = ((5 - avgSoreness) / 4) * 100;

    // Average stress (1-5 scale, lower is better) -> invert and normalize
    const avgStress = recent.reduce((sum, l) => sum + l.preCheckIn!.stress, 0) / recent.length;
    const stressScore = ((5 - avgStress) / 4) * 100;

    // RPE trend from recent workouts (lower recent RPE = better recovery)
    const recentRPE = sortedLogs.slice(0, 5);
    let rpeScore = 50;
    if (recentRPE.length > 0) {
      const avgRPE = recentRPE.reduce((sum, l) => sum + l.overallRPE, 0) / recentRPE.length;
      // RPE 1-10, ideal around 7. Score penalizes very high RPE
      rpeScore = Math.max(0, Math.min(100, (10 - avgRPE) / 4 * 100));
    }

    // Training load ratio contribution
    let loadScore = 50;
    if (trainingLoad.ratio > 0) {
      if (trainingLoad.isOptimal) {
        loadScore = 80;
      } else if (trainingLoad.isTooHigh) {
        loadScore = Math.max(0, 80 - (trainingLoad.ratio - 1.3) * 100);
      } else {
        loadScore = 60;
      }
    }

    // Weighted composite
    const composite = (
      sleepScore * 0.30 +
      sorenessScore * 0.25 +
      stressScore * 0.20 +
      rpeScore * 0.15 +
      loadScore * 0.10
    );

    return Math.round(Math.max(0, Math.min(100, composite)));
  }, [logsWithCheckIn, sortedLogs, trainingLoad]);

  // Recovery recommendations
  const recommendations = useMemo(() => {
    const recs: { icon: typeof AlertTriangle; text: string; severity: 'warning' | 'info' | 'success' }[] = [];

    if (recoveryScore < 34) {
      recs.push({
        icon: AlertTriangle,
        text: 'Your body needs rest. Take a recovery day \u2014 light stretching, walking, or mobility work.',
        severity: 'warning',
      });
    }

    // Check sleep trend
    if (sleepTrendData.length >= 3) {
      const recentSleep = sleepTrendData.slice(-3);
      const avgRecent = recentSleep.reduce((s, d) => s + d.sleep, 0) / recentSleep.length;
      if (avgRecent < 3) {
        recs.push({
          icon: Moon,
          text: 'Sleep has been below average lately. Aim for 7\u20139 hours \u2014 it\u2019s the single biggest recovery factor.',
          severity: 'warning',
        });
      }
    }

    // Check soreness
    if (logsWithCheckIn.length > 0) {
      const latestSoreness = logsWithCheckIn[0].preCheckIn!.soreness;
      if (latestSoreness >= 4) {
        recs.push({
          icon: Thermometer,
          text: 'Soreness is elevated. Add 10\u201315 min of foam rolling or stretching before your next session.',
          severity: 'warning',
        });
      }
    }

    // Check training load ratio
    if (trainingLoad.isTooHigh) {
      recs.push({
        icon: Activity,
        text: 'Training volume spiked this week. Drop 1\u20132 sets per exercise to let your body adapt.',
        severity: 'warning',
      });
    }

    if (recs.length === 0) {
      recs.push({
        icon: Check,
        text: 'Recovery looks solid. Stay consistent and trust the process.',
        severity: 'success',
      });
    }

    return recs;
  }, [recoveryScore, sleepTrendData, logsWithCheckIn, trainingLoad]);

  // Readiness indicator
  const readiness = useMemo(() => {
    if (recoveryScore > 67) return { color: '#34d399', label: 'Ready to Train', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40' };
    if (recoveryScore >= 34) return { color: '#fbbf24', label: 'Train with Caution', bg: 'bg-yellow-500/20', border: 'border-yellow-500/40' };
    return { color: '#f87171', label: 'Rest Recommended', bg: 'bg-red-500/20', border: 'border-red-500/40' };
  }, [recoveryScore]);

  const scoreColor = getScoreColor(recoveryScore);
  const scoreLabel = getScoreLabel(recoveryScore);

  // Sparkline data for overview (last 5 points)
  const sleepSparkData = useMemo(() => sleepTrendData.slice(-5), [sleepTrendData]);
  const rpeSparkData = useMemo(() =>
    sortedLogs.slice(0, 5).reverse().map(l => ({ rpe: l.overallRPE })),
  [sortedLogs]);

  const hasData = workoutLogs.length > 0;

  return (
    <motion.div
      className="min-h-screen bg-grappler-900 pb-24"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-grappler-900/95 backdrop-blur-sm border-b border-grappler-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <button aria-label="Go back"
            onClick={onClose}
            className="p-2 -ml-2 rounded-lg hover:bg-grappler-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-grappler-200" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-grappler-50">Recovery Dashboard</h1>
            <p className="text-xs text-grappler-400">Sleep, stress & training load insights</p>
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <Heart className="w-12 h-12 text-grappler-600 mb-4" />
          <h2 className="text-lg font-semibold text-grappler-200 mb-2">No Data Yet</h2>
          <p className="text-grappler-400 text-sm max-w-xs">
            Complete some workouts with pre-workout check-ins to see your recovery insights here.
          </p>
        </div>
      ) : (
        <motion.div
          className="px-4 py-4 space-y-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Tab Selector */}
          <motion.div variants={itemVariants} className="flex gap-2">
            <button
              onClick={() => setSelectedTab('overview')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                selectedTab === 'overview'
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/40'
                  : 'bg-grappler-800 text-grappler-400 border border-grappler-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setSelectedTab('trends')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                selectedTab === 'trends'
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/40'
                  : 'bg-grappler-800 text-grappler-400 border border-grappler-700'
              }`}
            >
              Trends
            </button>
          </motion.div>

          {selectedTab === 'overview' ? (
            <>
              {/* Readiness Hero — the one thing they need to know */}
              <motion.div variants={itemVariants}>
                <div className={`card p-4 border ${readiness.border}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: readiness.color, boxShadow: `0 0 12px ${readiness.color}40` }}
                      />
                      <div>
                        <p className="text-sm font-semibold text-grappler-50">{readiness.label}</p>
                        <p className="text-[11px] text-grappler-400">Based on sleep, stress & training load</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <motion.p
                        className="text-2xl font-bold"
                        style={{ color: scoreColor }}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                      >
                        {recoveryScore}
                      </motion.p>
                      <p className="text-[10px] text-grappler-500 uppercase">{scoreLabel}</p>
                    </div>
                  </div>

                  {/* Breakdown with context labels */}
                  {logsWithCheckIn.length > 0 && (() => {
                    const latest = logsWithCheckIn[0].preCheckIn!;
                    return (
                      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-grappler-700/40">
                        <div className="text-center">
                          <Moon className="w-3.5 h-3.5 text-indigo-400 mx-auto mb-1" />
                          <p className="text-xs font-medium text-grappler-200">Sleep</p>
                          <p className={`text-[11px] font-medium ${metricColor(latest.sleepQuality >= 4, latest.sleepQuality >= 3)}`}>
                            {sleepLabel(latest.sleepQuality)} ({latest.sleepQuality}/5)
                          </p>
                        </div>
                        <div className="text-center">
                          <Thermometer className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
                          <p className="text-xs font-medium text-grappler-200">Soreness</p>
                          <p className={`text-[11px] font-medium ${metricColor(latest.soreness <= 2, latest.soreness <= 3)}`}>
                            {sorenessLabel(latest.soreness)} ({latest.soreness}/5)
                          </p>
                        </div>
                        <div className="text-center">
                          <Brain className="w-3.5 h-3.5 text-purple-400 mx-auto mb-1" />
                          <p className="text-xs font-medium text-grappler-200">Stress</p>
                          <p className={`text-[11px] font-medium ${metricColor(latest.stress <= 2, latest.stress <= 3)}`}>
                            {stressLabel(latest.stress)} ({latest.stress}/5)
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </motion.div>

              {/* Training Intensity — plain English, no jargon */}
              <motion.div variants={itemVariants} className="card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-5 h-5 text-primary-400" />
                  <h2 className="text-base font-semibold text-grappler-50">Training Intensity</h2>
                </div>

                <p className="text-sm text-grappler-200 mb-3">
                  {trainingLoad.ratio === 0
                    ? 'Not enough data to assess your training load yet.'
                    : trainingLoad.isOptimal
                    ? 'Your training volume is well balanced with what your body is used to.'
                    : trainingLoad.isTooHigh
                    ? <>You&apos;re pushing <span className="font-bold text-red-400">{trainingLoad.ratio.toFixed(1)}x</span> harder than your 4-week average. That&apos;s above the safe zone.</>
                    : <>You&apos;re at <span className="font-bold text-yellow-400">{Math.round(trainingLoad.ratio * 100)}%</span> of your usual effort &mdash; below your baseline.</>
                  }
                </p>

                {trainingLoad.ratio > 0 && (
                  <>
                    {/* Visual ratio bar */}
                    <div className="space-y-1.5">
                      <div className="relative h-3 bg-grappler-800 rounded-full overflow-hidden">
                        <div className="absolute h-full bg-emerald-500/20 rounded-full" style={{ left: '32%', width: '28%' }} />
                        <motion.div
                          className="absolute top-0 h-full w-2 rounded-full"
                          style={{
                            backgroundColor: trainingLoad.isOptimal ? '#34d399' : trainingLoad.isTooHigh ? '#f87171' : '#fbbf24',
                            left: `${Math.min(Math.max((trainingLoad.ratio / 2.5) * 100, 2), 98)}%`,
                          }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-grappler-500">
                        <span>Under-training</span>
                        <span className="text-emerald-400/80">Sweet spot</span>
                        <span>Overreaching</span>
                      </div>
                    </div>

                    {/* This week vs average */}
                    <div className="flex gap-2 mt-3">
                      <div className="flex-1 bg-grappler-800/60 rounded-lg px-3 py-2 flex justify-between items-center">
                        <span className="text-[11px] text-grappler-500">This week</span>
                        <span className="text-xs font-medium text-grappler-200">
                          {trainingLoad.acute > 1000 ? `${(trainingLoad.acute / 1000).toFixed(1)}k` : trainingLoad.acute.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex-1 bg-grappler-800/60 rounded-lg px-3 py-2 flex justify-between items-center">
                        <span className="text-[11px] text-grappler-500">Avg/week</span>
                        <span className="text-xs font-medium text-grappler-200">
                          {trainingLoad.chronic > 1000 ? `${(trainingLoad.chronic / 1000).toFixed(1)}k` : Math.round(trainingLoad.chronic).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {!trainingLoad.isOptimal && trainingLoad.ratio > 0 && (
                  <div className="flex items-start gap-2 mt-3 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-200">
                      {trainingLoad.isTooHigh
                        ? 'Your body hasn\u2019t adapted to this volume yet. Drop 1\u20132 sets per exercise this week to stay in the safe zone.'
                        : 'You\u2019re training less than your body is used to. If you feel recovered, gradually add volume back.'}
                    </p>
                  </div>
                )}
              </motion.div>

              {/* Quick Trends — inline sparklines so users don't need Trends tab */}
              {(sleepSparkData.length > 1 || rpeSparkData.length > 1) && (
                <motion.div variants={itemVariants} className="card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-primary-400" />
                    <h2 className="text-base font-semibold text-grappler-50">Recent Trends</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {sleepSparkData.length > 1 && (
                      <div>
                        <p className="text-[11px] text-grappler-400 mb-1">Sleep Quality</p>
                        <div className="h-10">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sleepSparkData}>
                              <defs>
                                <linearGradient id="sparkSleepG" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <YAxis domain={[1, 5]} hide />
                              <Area type="monotone" dataKey="sleep" stroke="#818cf8" strokeWidth={1.5} fill="url(#sparkSleepG)" dot={false} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="text-[10px] text-grappler-500 mt-0.5">
                          Avg: {(sleepSparkData.reduce((s, d) => s + d.sleep, 0) / sleepSparkData.length).toFixed(1)}/5
                        </p>
                      </div>
                    )}
                    {rpeSparkData.length > 1 && (
                      <div>
                        <p className="text-[11px] text-grappler-400 mb-1">Workout Effort</p>
                        <div className="h-10">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={rpeSparkData}>
                              <defs>
                                <linearGradient id="sparkRpeG" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <YAxis domain={[1, 10]} hide />
                              <Area type="monotone" dataKey="rpe" stroke="#34d399" strokeWidth={1.5} fill="url(#sparkRpeG)" dot={false} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="text-[10px] text-grappler-500 mt-0.5">
                          Avg RPE: {(rpeSparkData.reduce((s, d) => s + d.rpe, 0) / rpeSparkData.length).toFixed(1)}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* What to Do */}
              <motion.div variants={itemVariants} className="card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Wind className="w-5 h-5 text-primary-400" />
                  <h2 className="text-base font-semibold text-grappler-50">What to Do</h2>
                </div>

                <div className="space-y-2">
                  {recommendations.map((rec, i) => {
                    const Icon = rec.icon;
                    return (
                      <motion.div
                        key={i}
                        className={`flex items-start gap-3 p-3 rounded-lg ${
                          rec.severity === 'warning'
                            ? 'bg-yellow-500/10 border border-yellow-500/20'
                            : rec.severity === 'success'
                            ? 'bg-emerald-500/10 border border-emerald-500/20'
                            : 'bg-grappler-800 border border-grappler-700'
                        }`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                      >
                        <Icon
                          className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                            rec.severity === 'warning'
                              ? 'text-yellow-400'
                              : rec.severity === 'success'
                              ? 'text-emerald-400'
                              : 'text-grappler-400'
                          }`}
                        />
                        <p
                          className={`text-sm ${
                            rec.severity === 'warning'
                              ? 'text-yellow-200'
                              : rec.severity === 'success'
                              ? 'text-emerald-200'
                              : 'text-grappler-200'
                          }`}
                        >
                          {rec.text}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </>
          ) : (
            <>
              {/* Sleep Trend Chart */}
              <motion.div variants={itemVariants} className="card p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Moon className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-base font-semibold text-grappler-50">Sleep Trend</h2>
                  <span className="text-xs text-grappler-400 ml-auto">Last 10 sessions</span>
                </div>

                {sleepTrendData.length > 1 ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sleepTrendData}>
                        <defs>
                          <linearGradient id="sleepGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: '#9ca3af' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[1, 5]}
                          tick={{ fontSize: 10, fill: '#9ca3af' }}
                          axisLine={false}
                          tickLine={false}
                          width={24}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          labelStyle={{ color: '#e5e7eb' }}
                          itemStyle={{ color: '#818cf8' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="sleep"
                          stroke="#818cf8"
                          strokeWidth={2}
                          fill="url(#sleepGradient)"
                          name="Sleep Quality"
                        />
                        <Line
                          type="monotone"
                          dataKey="hours"
                          stroke="#34d399"
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#34d399' }}
                          name="Hours"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-grappler-400 text-sm">
                    Need at least 2 sessions with check-in data
                  </div>
                )}

                {/* Sleep summary */}
                {sleepTrendData.length > 0 && (
                  <div className="flex gap-3 mt-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                      <span className="text-xs text-grappler-400">Quality (1-5)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span className="text-xs text-grappler-400">Hours</span>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Stress & Soreness Trend */}
              <motion.div variants={itemVariants} className="card p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Thermometer className="w-5 h-5 text-blue-400" />
                  <h2 className="text-base font-semibold text-grappler-50">Stress & Soreness</h2>
                  <span className="text-xs text-grappler-400 ml-auto">Last 10 sessions</span>
                </div>

                {stressSorenessTrendData.length > 1 ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stressSorenessTrendData}>
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: '#9ca3af' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[1, 5]}
                          tick={{ fontSize: 10, fill: '#9ca3af' }}
                          axisLine={false}
                          tickLine={false}
                          width={24}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          labelStyle={{ color: '#e5e7eb' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="stress"
                          stroke="#818cf8"
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#818cf8' }}
                          name="Stress"
                        />
                        <Line
                          type="monotone"
                          dataKey="soreness"
                          stroke="#f97316"
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#f97316' }}
                          name="Soreness"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-grappler-400 text-sm">
                    Need at least 2 sessions with check-in data
                  </div>
                )}

                {stressSorenessTrendData.length > 0 && (
                  <div className="flex gap-3 mt-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                      <span className="text-xs text-grappler-400">Stress</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                      <span className="text-xs text-grappler-400">Soreness</span>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* RPE Trend */}
              <motion.div variants={itemVariants} className="card p-4">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-primary-400" />
                  <h2 className="text-base font-semibold text-grappler-50">RPE Trend</h2>
                  <span className="text-xs text-grappler-400 ml-auto">Last 10 sessions</span>
                </div>

                {sortedLogs.length > 1 ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={sortedLogs
                          .slice(0, 10)
                          .reverse()
                          .map(log => ({
                            date: formatSessionDate(log.date),
                            rpe: log.overallRPE,
                          }))}
                      >
                        <defs>
                          <linearGradient id="rpeGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: '#9ca3af' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[1, 10]}
                          tick={{ fontSize: 10, fill: '#9ca3af' }}
                          axisLine={false}
                          tickLine={false}
                          width={24}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          labelStyle={{ color: '#e5e7eb' }}
                          itemStyle={{ color: '#34d399' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="rpe"
                          stroke="#34d399"
                          strokeWidth={2}
                          fill="url(#rpeGradient)"
                          name="RPE"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-grappler-400 text-sm">
                    Need at least 2 workouts to show trends
                  </div>
                )}
              </motion.div>

              {/* Volume Trend */}
              <motion.div variants={itemVariants} className="card p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-primary-400" />
                  <h2 className="text-base font-semibold text-grappler-50">Volume Trend</h2>
                  <span className="text-xs text-grappler-400 ml-auto">Last 10 sessions</span>
                </div>

                {sortedLogs.length > 1 ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={sortedLogs
                          .slice(0, 10)
                          .reverse()
                          .map(log => ({
                            date: formatSessionDate(log.date),
                            volume: log.totalVolume || 0,
                          }))}
                      >
                        <defs>
                          <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: '#9ca3af' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#9ca3af' }}
                          axisLine={false}
                          tickLine={false}
                          width={40}
                          tickFormatter={(v: number) => v > 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          labelStyle={{ color: '#e5e7eb' }}
                          itemStyle={{ color: '#818cf8' }}
                          formatter={(value: number) => [value.toLocaleString(), 'Volume']}
                        />
                        <Area
                          type="monotone"
                          dataKey="volume"
                          stroke="#818cf8"
                          strokeWidth={2}
                          fill="url(#volumeGradient)"
                          name="Volume"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-grappler-400 text-sm">
                    Need at least 2 workouts to show trends
                  </div>
                )}
              </motion.div>
            </>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
