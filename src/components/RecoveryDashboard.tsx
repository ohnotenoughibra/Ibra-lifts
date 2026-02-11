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

export default function RecoveryDashboard({ onClose }: RecoveryDashboardProps) {
  const { workoutLogs, bodyWeightLog } = useAppStore();
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

  // Training load calculations
  const trainingLoad = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twentyEightDaysAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const last7DaysLogs = sortedLogs.filter(
      log => new Date(log.date).getTime() >= sevenDaysAgo.getTime()
    );
    const last28DaysLogs = sortedLogs.filter(
      log => new Date(log.date).getTime() >= twentyEightDaysAgo.getTime()
    );

    const acuteLoad = last7DaysLogs.reduce((sum, log) => sum + (log.totalVolume || 0), 0);
    const chronicTotalVolume = last28DaysLogs.reduce((sum, log) => sum + (log.totalVolume || 0), 0);
    const chronicLoad = chronicTotalVolume / 4; // average weekly volume over 4 weeks

    const ratio = chronicLoad > 0 ? acuteLoad / chronicLoad : 0;

    return {
      acute: acuteLoad,
      chronic: chronicLoad,
      ratio: Math.round(ratio * 100) / 100,
      isOptimal: ratio >= 0.8 && ratio <= 1.3,
      isTooHigh: ratio > 1.3,
      isTooLow: ratio < 0.8 && ratio > 0,
    };
  }, [sortedLogs]);

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
        text: 'Consider a deload or active recovery day',
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
          text: 'Prioritize sleep - 7-9 hours minimum',
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
          text: 'Extra mobility work recommended',
          severity: 'warning',
        });
      }
    }

    // Check training load ratio
    if (trainingLoad.isTooHigh) {
      recs.push({
        icon: Activity,
        text: 'Volume increased too fast - reduce by 20%',
        severity: 'warning',
      });
    }

    if (recs.length === 0) {
      recs.push({
        icon: Check,
        text: 'Recovery looks good - keep up the consistent work!',
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

  // SVG gauge parameters
  const gaugeRadius = 70;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeFill = (recoveryScore / 100) * gaugeCircumference;

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
              {/* Recovery Score Gauge */}
              <motion.div variants={itemVariants} className="card p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="w-5 h-5 text-primary-400" />
                  <h2 className="text-base font-semibold text-grappler-50">Recovery Score</h2>
                </div>

                <div className="flex flex-col items-center py-4">
                  <div className="relative w-44 h-44">
                    <svg
                      className="w-full h-full -rotate-90"
                      viewBox="0 0 160 160"
                    >
                      {/* Background ring */}
                      <circle
                        cx="80"
                        cy="80"
                        r={gaugeRadius}
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="10"
                      />
                      {/* Score ring */}
                      <motion.circle
                        cx="80"
                        cy="80"
                        r={gaugeRadius}
                        fill="none"
                        stroke={scoreColor}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={gaugeCircumference}
                        initial={{ strokeDashoffset: gaugeCircumference }}
                        animate={{ strokeDashoffset: gaugeCircumference - gaugeFill }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                      />
                    </svg>
                    {/* Center score text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <motion.span
                        className="text-4xl font-bold"
                        style={{ color: scoreColor }}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                      >
                        {recoveryScore}
                      </motion.span>
                      <span className="text-xs text-grappler-400 mt-1">{scoreLabel}</span>
                    </div>
                  </div>

                  {/* Score breakdown pills */}
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {logsWithCheckIn.length > 0 && (
                      <>
                        <div className="flex items-center gap-1.5 bg-grappler-800 rounded-full px-3 py-1">
                          <Moon className="w-3 h-3 text-indigo-400" />
                          <span className="text-xs text-grappler-200">
                            Sleep {logsWithCheckIn[0].preCheckIn!.sleepQuality}/5
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-grappler-800 rounded-full px-3 py-1">
                          <Thermometer className="w-3 h-3 text-blue-400" />
                          <span className="text-xs text-grappler-200">
                            Soreness {logsWithCheckIn[0].preCheckIn!.soreness}/5
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-grappler-800 rounded-full px-3 py-1">
                          <Brain className="w-3 h-3 text-purple-400" />
                          <span className="text-xs text-grappler-200">
                            Stress {logsWithCheckIn[0].preCheckIn!.stress}/5
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Readiness Indicator */}
              <motion.div variants={itemVariants}>
                <div className={`card p-4 border ${readiness.border}`}>
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full`}
                      style={{ backgroundColor: readiness.color, boxShadow: `0 0 12px ${readiness.color}40` }}
                    />
                    <div>
                      <h3 className="text-sm font-semibold text-grappler-50">Today&apos;s Readiness</h3>
                      <p className="text-xs" style={{ color: readiness.color }}>{readiness.label}</p>
                    </div>
                    <div className="ml-auto">
                      {recoveryScore > 67 ? (
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                      ) : recoveryScore >= 34 ? (
                        <Minus className="w-5 h-5 text-yellow-400" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Training Load */}
              <motion.div variants={itemVariants} className="card p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-primary-400" />
                  <h2 className="text-base font-semibold text-grappler-50">Training Load</h2>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-grappler-800 rounded-xl p-3 text-center">
                    <p className="text-xs text-grappler-400 mb-1">Acute (7d)</p>
                    <p className="text-lg font-bold text-grappler-50">
                      {trainingLoad.acute > 1000
                        ? `${(trainingLoad.acute / 1000).toFixed(1)}k`
                        : trainingLoad.acute.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-grappler-800 rounded-xl p-3 text-center">
                    <p className="text-xs text-grappler-400 mb-1">Chronic (28d)</p>
                    <p className="text-lg font-bold text-grappler-50">
                      {trainingLoad.chronic > 1000
                        ? `${(trainingLoad.chronic / 1000).toFixed(1)}k`
                        : Math.round(trainingLoad.chronic).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-grappler-800 rounded-xl p-3 text-center">
                    <p className="text-xs text-grappler-400 mb-1">A:C Ratio</p>
                    <p
                      className="text-lg font-bold"
                      style={{
                        color: trainingLoad.isOptimal
                          ? '#34d399'
                          : trainingLoad.isTooHigh
                          ? '#f87171'
                          : '#fbbf24',
                      }}
                    >
                      {trainingLoad.ratio.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Load ratio bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-grappler-400">
                    <span>Low</span>
                    <span className="text-emerald-400">Optimal (0.8-1.3)</span>
                    <span>High</span>
                  </div>
                  <div className="relative h-3 bg-grappler-800 rounded-full overflow-hidden">
                    {/* Optimal zone indicator */}
                    <div
                      className="absolute h-full bg-emerald-500/20 rounded-full"
                      style={{ left: '32%', width: '28%' }}
                    />
                    {/* Current position marker */}
                    <motion.div
                      className="absolute top-0 h-full w-2 rounded-full"
                      style={{
                        backgroundColor: trainingLoad.isOptimal ? '#34d399' : trainingLoad.isTooHigh ? '#f87171' : '#fbbf24',
                        left: `${Math.min(Math.max((trainingLoad.ratio / 2.5) * 100, 2), 98)}%`,
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                    />
                  </div>
                </div>

                {!trainingLoad.isOptimal && trainingLoad.ratio > 0 && (
                  <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    <p className="text-xs text-yellow-200">
                      {trainingLoad.isTooHigh
                        ? 'Training load is ramping up too fast. Consider reducing volume this week.'
                        : 'Training load is below baseline. Gradually increase volume if feeling recovered.'}
                    </p>
                  </div>
                )}
              </motion.div>

              {/* Recovery Recommendations */}
              <motion.div variants={itemVariants} className="card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Wind className="w-5 h-5 text-primary-400" />
                  <h2 className="text-base font-semibold text-grappler-50">Recommendations</h2>
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
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
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
