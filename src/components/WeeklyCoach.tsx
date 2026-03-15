'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Brain,
  TrendingUp,
  Check,
  AlertTriangle,
  Lightbulb,
  Target,
  RefreshCw,
  Dumbbell,
  Zap,
  Star,
  MessageCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { generateWeeklySummary, getCoachMessage } from '@/lib/ai-coach';
import { useAppStore } from '@/lib/store';
import { useComputedGamification } from '@/lib/computed-gamification';
import { WeeklySummary } from '@/lib/types';
import { formatNumber, formatDate } from '@/lib/utils';

interface WeeklyCoachProps {
  onClose: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export default function WeeklyCoach({ onClose }: WeeklyCoachProps) {
  const { workoutLogs, user, gamificationStats } = useAppStore();
  const computed = useComputedGamification();
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [coachMessage, setCoachMessage] = useState('');

  const weightUnit = user?.weightUnit || 'lbs';
  const hasWorkouts = workoutLogs.length > 0;

  // Generate the weekly summary on mount
  useEffect(() => {
    if (!hasWorkouts) {
      setLoading(false);
      return;
    }
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get a contextual coach greeting
  useEffect(() => {
    const message = getCoachMessage(workoutLogs, computed.currentStreak);
    setCoachMessage(message);
  }, [workoutLogs, computed.currentStreak]);

  async function loadSummary() {
    setLoading(true);
    try {
      const result = await generateWeeklySummary(workoutLogs);
      setSummary(result);
    } catch {
      // Fail silently; the empty state will show
    } finally {
      setLoading(false);
    }
  }

  // Build daily volume data for the bar chart
  const dailyVolumeData = useMemo(() => {
    if (!summary) return [];

    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const volumeByDay: Record<string, number> = {};
    dayLabels.forEach((d) => (volumeByDay[d] = 0));

    const weekStart = new Date(summary.weekStart);
    const weekEnd = new Date(summary.weekEnd);

    workoutLogs.forEach((log) => {
      const logDate = new Date(log.date);
      if (logDate >= weekStart && logDate <= weekEnd) {
        const dayIndex = (logDate.getDay() + 6) % 7; // Monday = 0
        const label = dayLabels[dayIndex];
        volumeByDay[label] += log.totalVolume;
      }
    });

    return dayLabels.map((day) => ({
      day,
      volume: Math.round(volumeByDay[day]),
    }));
  }, [summary, workoutLogs]);

  // -------- Empty state --------
  if (!hasWorkouts && !loading) {
    return (
      <div className="fixed inset-0 z-50 bg-grappler-900 overflow-y-auto safe-area-top safe-area-bottom">
        <div className="min-h-screen px-4 py-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <button aria-label="Go back" onClick={onClose} className="btn btn-secondary btn-sm">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-grappler-50">AI Coach</h1>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center text-center py-24"
          >
            <div className="w-20 h-20 rounded-full bg-primary-500/20 flex items-center justify-center mb-6">
              <Brain className="w-10 h-10 text-primary-400" />
            </div>
            <h2 className="text-lg font-bold text-grappler-200 mb-2">
              Your AI Coach is Ready
            </h2>
            <p className="text-sm text-grappler-400 max-w-xs mb-8">
              Complete your first workout to get coaching insights and
              personalized weekly summaries.
            </p>
            <div className="flex items-center gap-2 text-primary-400">
              <Dumbbell className="w-5 h-5" />
              <span className="text-sm font-medium">
                Let&apos;s get to work
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // -------- Loading state --------
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-grappler-900 overflow-y-auto safe-area-top safe-area-bottom">
        <div className="min-h-screen px-4 py-6">
          <div className="flex items-center gap-3 mb-8">
            <button aria-label="Go back" onClick={onClose} className="btn btn-secondary btn-sm">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-grappler-50">AI Coach</h1>
          </div>

          <div className="flex flex-col items-center justify-center py-24">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            >
              <Brain className="w-12 h-12 text-primary-400" />
            </motion.div>
            <p className="text-sm text-grappler-400 mt-4">
              Analyzing your training data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // -------- Main coach view --------
  return (
    <div className="fixed inset-0 z-50 bg-grappler-900 overflow-y-auto safe-area-top safe-area-bottom">
      <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button aria-label="Go back" onClick={onClose} className="btn btn-secondary btn-sm">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-grappler-50">AI Coach</h1>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-5"
        >
          {/* Coach Avatar & Greeting */}
          <motion.div variants={itemVariants} className="card p-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-6 h-6 text-primary-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-primary-400 mb-1">
                  Coach
                </p>
                <p className="text-sm text-grappler-200 leading-relaxed">
                  {coachMessage}
                </p>
              </div>
            </div>
          </motion.div>

          {summary && (
            <>
              {/* Weekly Summary Card */}
              <motion.div variants={itemVariants} className="card p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 text-primary-400" />
                  <h2 className="font-bold text-grappler-50">Weekly Summary</h2>
                </div>

                <p className="text-xs text-grappler-400 mb-4">
                  {formatDate(summary.weekStart)} &mdash;{' '}
                  {formatDate(summary.weekEnd)}
                </p>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-grappler-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Dumbbell className="w-4 h-4 text-primary-400" />
                      <span className="text-xs text-grappler-400">
                        Sessions
                      </span>
                    </div>
                    <p className="text-lg font-bold text-grappler-50">
                      {summary.totalSessions}
                    </p>
                  </div>

                  <div className="bg-grappler-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-primary-400" />
                      <span className="text-xs text-grappler-400">
                        Total Volume
                      </span>
                    </div>
                    <p className="text-lg font-bold text-grappler-50">
                      {formatNumber(Math.round(summary.totalVolume))}{' '}
                      <span className="text-xs font-normal text-grappler-400">
                        {weightUnit}
                      </span>
                    </p>
                  </div>

                  <div className="bg-grappler-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-4 h-4 text-primary-400" />
                      <span className="text-xs text-grappler-400">
                        Avg RPE
                      </span>
                    </div>
                    <p className="text-lg font-bold text-grappler-50">
                      {summary.avgRPE.toFixed(1)}
                    </p>
                  </div>

                  <div className="bg-grappler-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span className="text-xs text-grappler-400">
                        PRs Hit
                      </span>
                    </div>
                    <p className="text-lg font-bold text-grappler-50">
                      {summary.prsHit}
                    </p>
                  </div>
                </div>

                {/* Wearable Data */}
                {(summary.avgRecoveryScore !== null ||
                  summary.avgSleepScore !== null) && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {summary.avgRecoveryScore !== null && (
                      <div className="bg-grappler-800 rounded-xl p-4">
                        <span className="text-xs text-grappler-400">
                          Avg Recovery
                        </span>
                        <p className="text-lg font-bold text-grappler-50">
                          {summary.avgRecoveryScore.toFixed(0)}%
                        </p>
                      </div>
                    )}
                    {summary.avgSleepScore !== null && (
                      <div className="bg-grappler-800 rounded-xl p-4">
                        <span className="text-xs text-grappler-400">
                          Avg Sleep Score
                        </span>
                        <p className="text-lg font-bold text-grappler-50">
                          {summary.avgSleepScore.toFixed(0)}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>

              {/* Strengths */}
              {summary.strengths.length > 0 && (
                <motion.div variants={itemVariants} className="card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <h3 className="font-bold text-grappler-50">Strengths</h3>
                  </div>
                  <ul className="space-y-2">
                    {summary.strengths.map((strength, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="mt-0.5 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-green-400" />
                        </div>
                        <span className="text-sm text-grappler-200">
                          {strength}
                        </span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Areas to Improve */}
              {summary.areasToImprove.length > 0 && (
                <motion.div variants={itemVariants} className="card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-blue-400" />
                    <h3 className="font-bold text-grappler-50">
                      Areas to Improve
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {summary.areasToImprove.map((area, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="mt-0.5 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="w-3 h-3 text-blue-400" />
                        </div>
                        <span className="text-sm text-grappler-200">
                          {area}
                        </span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Coach's Recommendation */}
              {summary.recommendation && (
                <motion.div variants={itemVariants} className="card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-primary-400" />
                    <h3 className="font-bold text-grappler-50">
                      Coach&apos;s Recommendation
                    </h3>
                  </div>
                  <div className="bg-grappler-800 rounded-xl p-4 border-l-4 border-l-primary-500">
                    <p className="text-sm text-grappler-200 leading-relaxed italic">
                      &ldquo;{summary.recommendation}&rdquo;
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Next Week Focus */}
              {summary.nextWeekFocus && (
                <motion.div
                  variants={itemVariants}
                  className="bg-grappler-800 rounded-xl p-4 border border-primary-500/30"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-primary-400" />
                    <h3 className="font-bold text-grappler-50">
                      Next Week Focus
                    </h3>
                  </div>
                  <p className="text-sm text-grappler-200 leading-relaxed">
                    {summary.nextWeekFocus}
                  </p>
                </motion.div>
              )}

              {/* Weekly Volume Chart */}
              {dailyVolumeData.some((d) => d.volume > 0) && (
                <motion.div variants={itemVariants} className="card p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-primary-400" />
                    <h3 className="font-bold text-grappler-50">
                      Daily Volume
                    </h3>
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyVolumeData}>
                        <XAxis
                          dataKey="day"
                          stroke="#64748b"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#64748b"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v: number) =>
                            v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                          }
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => [
                            `${formatNumber(value)} ${weightUnit}`,
                            'Volume',
                          ]}
                        />
                        <Bar
                          dataKey="volume"
                          fill="#0ea5e9"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}

              {/* Generate New Summary Button */}
              <motion.div variants={itemVariants} className="pt-2 pb-8">
                <button
                  onClick={loadSummary}
                  disabled={loading}
                  className="btn btn-primary btn-sm w-full gap-2"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                  />
                  Generate New Summary
                </button>
              </motion.div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
