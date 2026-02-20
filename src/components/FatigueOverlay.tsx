'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, TrendingDown, TrendingUp, Battery, BatteryLow, BatteryCharging,
  AlertTriangle, CheckCircle, ChevronDown, Activity, Zap,
  Heart, Brain, Moon, Flame, Timer, Shield,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import {
  calculateFatigueDebt, getSmartDeloadRecommendation, getDeloadProtocols,
  estimatePostDeloadPerformance, getFatigueInsights,
} from '@/lib/smart-deload';
import type {
  FatigueDebt, DeloadProtocol, DeloadRecommendation, PostDeloadPrediction, FatigueInsight,
} from '@/lib/smart-deload';
import { calculateAllFatigueMetrics } from '@/lib/fatigue-metrics';
import type { FatigueMetricsData } from '@/lib/fatigue-metrics';

interface FatigueOverlayProps { onClose: () => void }

const GAUGE_COLORS = {
  green: { ring: 'text-green-400', bg: 'bg-green-500/20', label: 'text-green-400' },
  yellow: { ring: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'text-yellow-400' },
  orange: { ring: 'text-blue-400', bg: 'bg-blue-500/20', label: 'text-blue-400' },
  red: { ring: 'text-red-400', bg: 'bg-red-500/20', label: 'text-red-400' },
} as const;

function getDebtColor(debt: number): keyof typeof GAUGE_COLORS {
  if (debt < 40) return 'green';
  if (debt < 60) return 'yellow';
  if (debt < 80) return 'orange';
  return 'red';
}

const URGENCY_STYLES: Record<string, string> = {
  optional: 'bg-green-500/20 text-green-400 border-green-500/40',
  recommended: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  critical: 'bg-red-500/20 text-red-400 border-red-500/40',
};

const CONFIDENCE_STYLES: Record<string, string> = {
  high: 'bg-green-500/20 text-green-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-grappler-700 text-grappler-400',
};

const TIMING_LABELS: Record<string, string> = {
  now: 'Start immediately', next_week: 'Start next week', end_of_block: 'End of current block',
};

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

function getACWRColor(status: string): string {
  if (status === 'optimal') return '#34d399';
  if (status === 'high') return '#fbbf24';
  if (status === 'very_high') return '#ef4444';
  if (status === 'low') return '#60a5fa';
  return '#94a3b8';
}

function getNSColor(score: number): string {
  if (score < 30) return '#34d399';
  if (score < 55) return '#fbbf24';
  if (score < 75) return '#f97316';
  return '#ef4444';
}

function getNSLabel(score: number): string {
  if (score < 30) return 'Low';
  if (score < 55) return 'Moderate';
  if (score < 75) return 'High';
  return 'Critical';
}

export default function FatigueOverlay({ onClose }: FatigueOverlayProps) {
  const { workoutLogs, wearableHistory, whoopWorkouts, trainingSessions, currentMesocycle } = useAppStore();
  const [protocolsExpanded, setProtocolsExpanded] = useState(false);

  const hasEnoughData = useMemo(() => {
    const weeks = new Set<string>();
    workoutLogs.forEach((log) => {
      const d = new Date(log.date);
      const off = d.getDay() === 0 ? 6 : d.getDay() - 1;
      const mon = new Date(d);
      mon.setDate(d.getDate() - off);
      weeks.add(mon.toISOString().split('T')[0]);
    });
    return weeks.size >= 3;
  }, [workoutLogs]);

  const fatigueDebt = useMemo<FatigueDebt>(
    () => calculateFatigueDebt(workoutLogs, wearableHistory, trainingSessions),
    [workoutLogs, wearableHistory, trainingSessions],
  );

  const recommendation = useMemo<DeloadRecommendation>(
    () => getSmartDeloadRecommendation(workoutLogs, wearableHistory, undefined, currentMesocycle ?? undefined, trainingSessions),
    [workoutLogs, wearableHistory, currentMesocycle, trainingSessions],
  );

  const prediction = useMemo<PostDeloadPrediction>(
    () => estimatePostDeloadPerformance(undefined, recommendation.protocol, fatigueDebt),
    [recommendation.protocol, fatigueDebt],
  );

  const insights = useMemo<FatigueInsight>(
    () => getFatigueInsights(fatigueDebt, workoutLogs, wearableHistory),
    [fatigueDebt, workoutLogs, wearableHistory],
  );

  const allProtocols = useMemo<DeloadProtocol[]>(() => getDeloadProtocols(), []);

  const metrics = useMemo<FatigueMetricsData>(
    () => calculateAllFatigueMetrics(workoutLogs, wearableHistory, whoopWorkouts, trainingSessions),
    [workoutLogs, wearableHistory, whoopWorkouts, trainingSessions],
  );

  const debtColor = useMemo(() => getDebtColor(fatigueDebt.currentDebt), [fatigueDebt.currentDebt]);
  const colors = GAUGE_COLORS[debtColor];
  const gaugeCirc = Math.PI * 70;
  const gaugeFill = (fatigueDebt.currentDebt / 100) * gaugeCirc;

  const trendIcon = useMemo(() => {
    if (fatigueDebt.debtTrend === 'accumulating') return <TrendingUp className="w-4 h-4 text-red-400" />;
    if (fatigueDebt.debtTrend === 'recovering') return <TrendingDown className="w-4 h-4 text-green-400" />;
    return <Activity className="w-4 h-4 text-yellow-400" />;
  }, [fatigueDebt.debtTrend]);

  const trendLabel = useMemo(() => {
    if (fatigueDebt.debtTrend === 'accumulating') return 'Accumulating';
    if (fatigueDebt.debtTrend === 'recovering') return 'Recovering';
    return 'Stable';
  }, [fatigueDebt.debtTrend]);

  const maxWeekly = useMemo(
    () => Math.max(1, ...fatigueDebt.weeklyFatigueScores.map((w) => w.score)),
    [fatigueDebt.weeklyFatigueScores],
  );

  const chipStyle = URGENCY_STYLES[debtColor === 'red' ? 'critical' : debtColor === 'orange' ? 'recommended' : 'optional'];
  const proto = recommendation.protocol;

  return (
    <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} className="min-h-screen bg-grappler-900 bg-mesh pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-grappler-900/80 backdrop-blur-xl border-b border-grappler-800">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary-400" />
            </div>
            <div>
              <h1 className="font-bold text-grappler-50 text-lg leading-tight">Fatigue &amp; Recovery</h1>
              <p className="text-xs text-grappler-400">Smart deload engine</p>
            </div>
          </div>
          <button aria-label="Close" onClick={onClose} className="btn btn-ghost btn-sm p-1">
            <X className="w-5 h-5 text-grappler-400" />
          </button>
        </div>
      </header>

      <div className="px-4 py-4 space-y-5">
        {!hasEnoughData ? (
          <motion.div {...fadeUp} className="bg-grappler-800 rounded-xl p-8 text-center space-y-3">
            <BatteryLow className="w-10 h-10 text-grappler-500 mx-auto" />
            <p className="text-grappler-300 font-medium">Need 3+ weeks of training data to analyze fatigue</p>
            <p className="text-grappler-500 text-sm">Keep logging workouts and check back soon.</p>
          </motion.div>
        ) : (
          <>
            {/* Fatigue Gauge */}
            <motion.div {...fadeUp} transition={{ delay: 0.05 }} className="bg-grappler-800 rounded-xl p-5">
              <div className="flex flex-col items-center">
                <svg width="180" height="100" viewBox="0 0 180 100" className="mb-2">
                  <path d="M 10 90 A 70 70 0 0 1 170 90" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" className="text-grappler-700" />
                  <path d="M 10 90 A 70 70 0 0 1 170 90" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${gaugeFill} ${gaugeCirc}`} className={colors.ring} />
                  <text x="90" y="80" textAnchor="middle" className={`${colors.label} fill-current font-bold`} fontSize="28">{fatigueDebt.currentDebt}</text>
                  <text x="90" y="95" textAnchor="middle" className="text-grappler-500 fill-current" fontSize="10">/ 100</text>
                </svg>
                <div className="flex items-center gap-4 text-sm mt-1">
                  <span className="flex items-center gap-1.5">{trendIcon}<span className="text-grappler-300">{trendLabel}</span></span>
                  {fatigueDebt.estimatedRecoveryDays > 0 && (
                    <span className="flex items-center gap-1.5 text-grappler-400">
                      <BatteryCharging className="w-4 h-4" />Est. recovery: {fatigueDebt.estimatedRecoveryDays}d
                    </span>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Weekly Fatigue Trend */}
            {fatigueDebt.weeklyFatigueScores.length > 0 && (
              <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="bg-grappler-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-grappler-200 mb-3">Weekly Fatigue Trend</h2>
                <div className="flex items-end gap-2 h-28">
                  {fatigueDebt.weeklyFatigueScores.map((ws, i) => {
                    const pct = (ws.score / maxWeekly) * 100;
                    const bc = getDebtColor(ws.score);
                    const last = i === fatigueDebt.weeklyFatigueScores.length - 1;
                    return (
                      <div key={ws.week} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-grappler-400">{ws.score}</span>
                        <div className={`w-full rounded-t-md transition-all ${GAUGE_COLORS[bc].bg} ${last ? 'ring-2 ring-primary-400/50' : ''}`} style={{ height: `${Math.max(pct, 6)}%` }} />
                        <span className={`text-xs ${last ? 'text-primary-400 font-bold' : 'text-grappler-400'}`}>W{ws.week}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── Training Load Intelligence ── */}
            <motion.div {...fadeUp} transition={{ delay: 0.12 }} className="bg-grappler-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <h2 className="text-sm font-semibold text-grappler-200">Training Load</h2>
              </div>

              {/* ACWR */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-grappler-900/60 rounded-lg p-2.5 text-center">
                  <p className="text-[11px] text-grappler-400 mb-0.5">Acute (7d)</p>
                  <p className="text-base font-bold text-grappler-100">
                    {metrics.acwr.acute > 1000 ? `${(metrics.acwr.acute / 1000).toFixed(1)}k` : metrics.acwr.acute}
                  </p>
                  <p className="text-xs text-grappler-400">sRPE</p>
                </div>
                <div className="bg-grappler-900/60 rounded-lg p-2.5 text-center">
                  <p className="text-[11px] text-grappler-400 mb-0.5">Chronic (28d)</p>
                  <p className="text-base font-bold text-grappler-100">
                    {metrics.acwr.chronic > 1000 ? `${(metrics.acwr.chronic / 1000).toFixed(1)}k` : metrics.acwr.chronic}
                  </p>
                  <p className="text-xs text-grappler-400">sRPE/wk</p>
                </div>
                <div className="bg-grappler-900/60 rounded-lg p-2.5 text-center">
                  <p className="text-[11px] text-grappler-400 mb-0.5">A:C Ratio</p>
                  <p className="text-base font-bold" style={{ color: getACWRColor(metrics.acwr.status) }}>
                    {metrics.acwr.ratio.toFixed(2)}
                  </p>
                  <p className="text-xs capitalize" style={{ color: getACWRColor(metrics.acwr.status) }}>
                    {metrics.acwr.status === 'no_data' ? '—' : metrics.acwr.status}
                  </p>
                </div>
              </div>

              {/* ACWR optimal zone bar */}
              {metrics.acwr.status !== 'no_data' && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-grappler-400">
                    <span>Low</span>
                    <span className="text-emerald-400">Optimal 0.8-1.3</span>
                    <span>High risk</span>
                  </div>
                  <div className="relative h-2 bg-grappler-700 rounded-full overflow-hidden">
                    <div className="absolute h-full bg-emerald-500/20 rounded-full" style={{ left: '32%', width: '20%' }} />
                    <div
                      className="absolute top-0 h-full w-1.5 rounded-full"
                      style={{
                        backgroundColor: getACWRColor(metrics.acwr.status),
                        left: `${Math.min(Math.max((metrics.acwr.ratio / 2.5) * 100, 1), 99)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* 28-Day Intensity Heatmap */}
              {metrics.heatmap.length > 0 && (
                <div>
                  <p className="text-xs text-grappler-400 mb-2">28-Day Intensity</p>
                  <div className="grid grid-cols-7 gap-1">
                    {metrics.heatmap.map((day) => {
                      const bg = day.intensity === 0
                        ? 'bg-grappler-700/40'
                        : day.intensity < 30 ? 'bg-emerald-500/30'
                        : day.intensity < 60 ? 'bg-yellow-500/40'
                        : day.intensity < 85 ? 'bg-orange-500/50'
                        : 'bg-red-500/60';
                      return (
                        <div key={day.date} className={`aspect-square rounded-sm ${bg}`} title={`${day.date}: ${day.intensity}% (${day.sessions} sessions)`} />
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-1.5">
                    <span className="text-xs text-grappler-400">Rest</span>
                    {['bg-grappler-700/40', 'bg-emerald-500/30', 'bg-yellow-500/40', 'bg-orange-500/50', 'bg-red-500/60'].map((c, i) => (
                      <div key={i} className={`w-2.5 h-2.5 rounded-sm ${c}`} />
                    ))}
                    <span className="text-xs text-grappler-400">Max</span>
                  </div>
                </div>
              )}

              {/* High-Intensity Minutes + Zone Distribution + Mat Time */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-grappler-900/60 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[11px] text-grappler-400">High-Intensity</span>
                  </div>
                  <span className="text-xl font-bold text-grappler-100">{metrics.highIntensityMinutes}</span>
                  <span className="text-xs text-grappler-400 ml-1">min</span>
                  <p className="text-xs text-grappler-400 mt-0.5">Z4+Z5 this week</p>
                </div>
                <div className="bg-grappler-900/60 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Shield className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-[11px] text-grappler-400">Mat Time</span>
                  </div>
                  <span className="text-xl font-bold text-grappler-100">{metrics.matTimeMinutes}</span>
                  <span className="text-xs text-grappler-400 ml-1">min</span>
                  <p className="text-xs text-grappler-400 mt-0.5">{metrics.matSessionCount} session{metrics.matSessionCount !== 1 ? 's' : ''} this week</p>
                </div>
              </div>

              {/* Zone Distribution Bar */}
              {metrics.zones.some(z => z.minutes > 0) && (
                <div>
                  <p className="text-xs text-grappler-400 mb-1.5">Zone Distribution</p>
                  <div className="flex h-3 rounded-full overflow-hidden">
                    {metrics.zones.filter(z => z.pct > 0).map(z => (
                      <div key={z.zone} style={{ width: `${z.pct}%`, backgroundColor: z.color }} title={`${z.label}: ${z.minutes}min (${z.pct}%)`} />
                    ))}
                  </div>
                  <div className="flex justify-between mt-1.5">
                    {metrics.zones.filter(z => z.pct > 0).map(z => (
                      <div key={z.zone} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: z.color }} />
                        <span className="text-xs text-grappler-400">Z{z.zone} {z.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* ── Nervous System Status ── */}
            <motion.div {...fadeUp} transition={{ delay: 0.14 }} className="bg-grappler-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-semibold text-grappler-200">Nervous System Status</h2>
              </div>

              {/* RHR Trend */}
              <div className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <Heart className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-xs text-grappler-300">Resting HR</span>
                </div>
                <div className="flex items-center gap-2">
                  {metrics.nervousSystem.rhrTrend.current != null ? (
                    <>
                      <span className="text-sm font-semibold text-grappler-100">{metrics.nervousSystem.rhrTrend.current} bpm</span>
                      <span className={`text-xs font-medium flex items-center gap-0.5 ${
                        metrics.nervousSystem.rhrTrend.delta > 2 ? 'text-red-400' : metrics.nervousSystem.rhrTrend.delta < -1 ? 'text-green-400' : 'text-grappler-400'
                      }`}>
                        {metrics.nervousSystem.rhrTrend.delta > 0 ? (
                          <><TrendingUp className="w-3 h-3" />+{metrics.nervousSystem.rhrTrend.delta}</>
                        ) : metrics.nervousSystem.rhrTrend.delta < 0 ? (
                          <><TrendingDown className="w-3 h-3" />{metrics.nervousSystem.rhrTrend.delta}</>
                        ) : (
                          <span>—</span>
                        )}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-grappler-400">No data</span>
                  )}
                </div>
              </div>

              {/* HRV Deviation */}
              <div className="flex items-center justify-between py-1.5 border-t border-grappler-700/50">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-xs text-grappler-300">HRV Deviation</span>
                </div>
                <div className="flex items-center gap-2">
                  {metrics.nervousSystem.hrvDeviation.current != null ? (
                    <>
                      <span className="text-sm font-semibold text-grappler-100">{metrics.nervousSystem.hrvDeviation.current} ms</span>
                      <span className={`text-xs font-medium ${
                        metrics.nervousSystem.hrvDeviation.deviationPct < -10 ? 'text-red-400' : metrics.nervousSystem.hrvDeviation.deviationPct > 10 ? 'text-green-400' : 'text-grappler-400'
                      }`}>
                        {metrics.nervousSystem.hrvDeviation.deviationPct > 0 ? '+' : ''}{metrics.nervousSystem.hrvDeviation.deviationPct}%
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-grappler-400">No data</span>
                  )}
                </div>
              </div>

              {/* Sympathetic Load */}
              <div className="py-1.5 border-t border-grappler-700/50">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-xs text-grappler-300">Sympathetic Load</span>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: getNSColor(metrics.nervousSystem.sympatheticLoad) }}>
                    {metrics.nervousSystem.sympatheticLoad}/100 · {getNSLabel(metrics.nervousSystem.sympatheticLoad)}
                  </span>
                </div>
                <div className="h-1.5 bg-grappler-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${metrics.nervousSystem.sympatheticLoad}%`,
                    backgroundColor: getNSColor(metrics.nervousSystem.sympatheticLoad),
                  }} />
                </div>
              </div>

              {/* CNS Strain */}
              <div className="py-1.5 border-t border-grappler-700/50">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-xs text-grappler-300">CNS Strain</span>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: getNSColor(metrics.nervousSystem.cnsStrain) }}>
                    {metrics.nervousSystem.cnsStrain}/100 · {getNSLabel(metrics.nervousSystem.cnsStrain)}
                  </span>
                </div>
                <div className="h-1.5 bg-grappler-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${metrics.nervousSystem.cnsStrain}%`,
                    backgroundColor: getNSColor(metrics.nervousSystem.cnsStrain),
                  }} />
                </div>
              </div>

              {/* Sleep Consistency */}
              <div className="flex items-center justify-between py-1.5 border-t border-grappler-700/50">
                <div className="flex items-center gap-2">
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs text-grappler-300">Sleep Consistency</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-grappler-100">
                    {metrics.nervousSystem.sleepConsistency.score > 0 ? `${metrics.nervousSystem.sleepConsistency.score}/100` : '—'}
                  </span>
                  {metrics.nervousSystem.sleepConsistency.score > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${
                      metrics.nervousSystem.sleepConsistency.status === 'consistent' ? 'bg-green-500/20 text-green-400'
                      : metrics.nervousSystem.sleepConsistency.status === 'moderate' ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-red-500/20 text-red-400'
                    }`}>
                      {metrics.nervousSystem.sleepConsistency.status}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Primary Contributors */}
            {fatigueDebt.primaryContributors.length > 0 && (
              <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="bg-grappler-800 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-grappler-200 mb-3">Primary Contributors</h2>
                <div className="flex flex-wrap gap-2">
                  {fatigueDebt.primaryContributors.map((c) => (
                    <span key={c} className={`text-xs px-3 py-1.5 rounded-full border ${chipStyle}`}>{c}</span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Deload Recommendation */}
            <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="bg-grappler-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-grappler-200">Deload Recommendation</h2>
                <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full border ${URGENCY_STYLES[recommendation.urgency]}`}>
                  {recommendation.urgency}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {recommendation.needed ? <AlertTriangle className="w-5 h-5 text-yellow-400" /> : <CheckCircle className="w-5 h-5 text-green-400" />}
                <span className="text-grappler-100 font-medium">Deload needed: {recommendation.needed ? 'YES' : 'NO'}</span>
              </div>
              <p className="text-sm text-grappler-400">{recommendation.reason}</p>
              {/* Protocol card */}
              <div className="bg-grappler-900/60 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-primary-400" />
                  <span className="text-sm font-semibold text-grappler-100">{proto.name}</span>
                  <span className="text-xs text-grappler-400 bg-grappler-700 px-2 py-0.5 rounded-full">{proto.type}</span>
                </div>
                <p className="text-xs text-grappler-400">{proto.description}</p>
                <div className="flex gap-3 mt-2 text-xs">
                  <span className="text-grappler-300">Duration: <span className="text-grappler-100 font-medium">{proto.durationDays}d</span></span>
                  <span className="text-grappler-300">Volume: <span className="text-grappler-100 font-medium">{Math.round(proto.volumeMultiplier * 100)}%</span></span>
                  <span className="text-grappler-300">Intensity: <span className="text-grappler-100 font-medium">{Math.round(proto.intensityMultiplier * 100)}%</span></span>
                </div>
                <div className="flex gap-2 mt-2">
                  {(['volumeMultiplier', 'intensityMultiplier'] as const).map((k) => (
                    <div key={k} className="flex-1">
                      <div className="text-xs text-grappler-400 mb-1">{k === 'volumeMultiplier' ? 'Volume' : 'Intensity'}</div>
                      <div className="h-2 bg-grappler-700 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${proto[k] * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-grappler-300">
                <Battery className="w-4 h-4 text-grappler-500" />
                Timing: <span className="text-grappler-100 font-medium">{TIMING_LABELS[recommendation.timing] ?? recommendation.timing}</span>
              </div>
            </motion.div>

            {/* Post-Deload Prediction */}
            <motion.div {...fadeUp} transition={{ delay: 0.25 }} className="bg-grappler-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-grappler-200 mb-3">Post-Deload Prediction</h2>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-grappler-900/60 rounded-lg p-3 text-center">
                  <TrendingUp className="w-5 h-5 text-green-400 mx-auto mb-1" />
                  <div className="text-lg font-bold text-grappler-100">+{prediction.expectedStrengthBounce}%</div>
                  <div className="text-xs text-grappler-400">Strength bounce</div>
                </div>
                <div className="bg-grappler-900/60 rounded-lg p-3 text-center">
                  <Zap className="w-5 h-5 text-primary-400 mx-auto mb-1" />
                  <div className="text-lg font-bold text-grappler-100">Day {prediction.estimatedPeakDay}</div>
                  <div className="text-xs text-grappler-400">Peak performance</div>
                </div>
                <div className="bg-grappler-900/60 rounded-lg p-3 text-center">
                  <Activity className="w-5 h-5 text-grappler-400 mx-auto mb-1" />
                  <div className="text-lg font-bold text-grappler-100 capitalize">{prediction.confidence}</div>
                  <div className="text-xs text-grappler-400">
                    <span className={`inline-block w-2 h-2 rounded-full mr-1 ${CONFIDENCE_STYLES[prediction.confidence].split(' ')[0]}`} />
                    Confidence
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Coaching Insights */}
            <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="bg-grappler-800 rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-semibold text-grappler-200">Coaching Insights</h2>
              <p className="text-sm text-grappler-100 font-medium">{insights.headline}</p>
              {insights.details.length > 0 && (
                <ul className="space-y-1">
                  {insights.details.map((d, i) => (
                    <li key={i} className="text-xs text-grappler-400 flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-grappler-600 shrink-0" />{d}
                    </li>
                  ))}
                </ul>
              )}
              {insights.actionItems.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <span className="text-xs uppercase font-bold text-grappler-400 tracking-wider">Action items</span>
                  {insights.actionItems.map((a, i) => (
                    <label key={i} className="flex items-start gap-2 text-xs text-grappler-300 cursor-pointer">
                      <CheckCircle className="w-3.5 h-3.5 text-primary-500 mt-0.5 shrink-0" />{a}
                    </label>
                  ))}
                </div>
              )}
            </motion.div>

            {/* All Deload Protocols */}
            <motion.div {...fadeUp} transition={{ delay: 0.35 }} className="bg-grappler-800 rounded-xl overflow-hidden">
              <button onClick={() => setProtocolsExpanded((v) => !v)} className="w-full flex items-center justify-between p-5 text-left">
                <h2 className="text-sm font-semibold text-grappler-200">All Deload Protocols ({allProtocols.length})</h2>
                <ChevronDown className={`w-4 h-4 text-grappler-400 transition-transform ${protocolsExpanded ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {protocolsExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="px-5 pb-5 space-y-3">
                      {allProtocols.map((p) => (
                        <div key={p.type} className="bg-grappler-900/60 rounded-lg p-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-grappler-100">{p.name}</span>
                            <span className="text-xs text-grappler-400 bg-grappler-700 px-2 py-0.5 rounded-full">{p.durationDays}d</span>
                          </div>
                          <p className="text-xs text-grappler-400">{p.description}</p>
                          <div className="flex gap-4 text-xs text-grappler-300">
                            <span>Volume: <span className="text-grappler-100 font-medium">{Math.round(p.volumeMultiplier * 100)}%</span></span>
                            <span>Intensity: <span className="text-grappler-100 font-medium">{Math.round(p.intensityMultiplier * 100)}%</span></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </div>
    </motion.div>
  );
}
