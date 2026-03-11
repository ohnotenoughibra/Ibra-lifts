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
  const [detailsExpanded, setDetailsExpanded] = useState(false);

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
    <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} className="min-h-screen bg-grappler-900 bg-mesh pb-20 safe-area-top">
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
            {/* ═══ HERO: Verdict + Gauge + CTA ═══ */}
            <motion.div {...fadeUp} transition={{ delay: 0.05 }} className={`rounded-2xl p-5 border ${
              debtColor === 'red' ? 'bg-red-500/10 border-red-500/30' :
              debtColor === 'orange' ? 'bg-blue-500/10 border-blue-500/30' :
              debtColor === 'yellow' ? 'bg-yellow-500/10 border-yellow-500/30' :
              'bg-green-500/10 border-green-500/30'
            }`}>
              <div className="flex items-start gap-4">
                {/* Compact gauge */}
                <div className="flex-shrink-0">
                  <svg width="80" height="50" viewBox="0 0 180 100">
                    <path d="M 10 90 A 70 70 0 0 1 170 90" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" className="text-grappler-700" />
                    <path d="M 10 90 A 70 70 0 0 1 170 90" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${gaugeFill} ${gaugeCirc}`} className={colors.ring} />
                    <text x="90" y="78" textAnchor="middle" className={`${colors.label} fill-current font-bold`} fontSize="32">{fatigueDebt.currentDebt}</text>
                  </svg>
                </div>
                {/* Verdict */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {recommendation.needed
                      ? <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      : <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />}
                    <span className="text-sm font-bold text-grappler-100">
                      {recommendation.needed ? 'Deload recommended' : 'No deload needed'}
                    </span>
                    <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded-full border ml-auto flex-shrink-0 ${URGENCY_STYLES[recommendation.urgency]}`}>
                      {recommendation.urgency}
                    </span>
                  </div>
                  <p className="text-xs text-grappler-400 leading-relaxed">{recommendation.reason}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span className="flex items-center gap-1">{trendIcon}<span className="text-grappler-300">{trendLabel}</span></span>
                    {fatigueDebt.estimatedRecoveryDays > 0 && (
                      <span className="flex items-center gap-1 text-grappler-400">
                        <BatteryCharging className="w-3.5 h-3.5" />{fatigueDebt.estimatedRecoveryDays}d to recover
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Primary contributors */}
              {fatigueDebt.primaryContributors.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-grappler-700/30">
                  <span className="text-xs uppercase tracking-wide text-grappler-500 mr-1 self-center">Drivers:</span>
                  {fatigueDebt.primaryContributors.map((c) => (
                    <span key={c} className={`text-xs px-2 py-0.5 rounded-full border ${chipStyle}`}>{c}</span>
                  ))}
                </div>
              )}
            </motion.div>

            {/* ═══ COACHING: What to do about it ═══ */}
            <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="bg-grappler-800 rounded-xl p-4 space-y-2.5">
              <p className="text-sm text-grappler-100 font-medium">{insights.headline}</p>
              {insights.actionItems.length > 0 && (
                <div className="space-y-1.5">
                  {insights.actionItems.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-grappler-300">
                      <CheckCircle className="w-3.5 h-3.5 text-primary-500 mt-0.5 shrink-0" />{a}
                    </div>
                  ))}
                </div>
              )}
              {insights.details.length > 0 && (
                <ul className="space-y-1 pt-1">
                  {insights.details.slice(0, 3).map((d, i) => (
                    <li key={i} className="text-xs text-grappler-400 flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-grappler-600 shrink-0" />{d}
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>

            {/* ═══ PROTOCOL + PREDICTION (if deload needed) ═══ */}
            {recommendation.needed && (
              <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="bg-grappler-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary-400" />
                  <span className="text-sm font-semibold text-grappler-100">{proto.name}</span>
                  <span className="text-xs text-grappler-400 bg-grappler-700 px-2 py-0.5 rounded-full">{proto.durationDays}d</span>
                  <span className="ml-auto text-xs text-grappler-400">{TIMING_LABELS[recommendation.timing] ?? recommendation.timing}</span>
                </div>
                <p className="text-xs text-grappler-400">{proto.description}</p>
                <div className="flex gap-2">
                  {(['volumeMultiplier', 'intensityMultiplier'] as const).map((k) => (
                    <div key={k} className="flex-1">
                      <div className="flex items-center justify-between text-xs text-grappler-400 mb-1">
                        <span>{k === 'volumeMultiplier' ? 'Volume' : 'Intensity'}</span>
                        <span className="text-grappler-100 font-medium">{Math.round(proto[k] * 100)}%</span>
                      </div>
                      <div className="h-2 bg-grappler-700 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${proto[k] * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                {/* Post-deload prediction inline */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-grappler-700/50">
                  <div className="text-center">
                    <div className="text-sm font-bold text-green-400">+{prediction.expectedStrengthBounce}%</div>
                    <div className="text-xs text-grappler-500">strength bounce</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-primary-400">Day {prediction.estimatedPeakDay}</div>
                    <div className="text-xs text-grappler-500">peak performance</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-sm font-bold capitalize ${CONFIDENCE_STYLES[prediction.confidence].split(' ')[1]}`}>{prediction.confidence}</div>
                    <div className="text-xs text-grappler-500">confidence</div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═══ WEEKLY TREND (compact) ═══ */}
            {fatigueDebt.weeklyFatigueScores.length > 0 && (
              <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="bg-grappler-800 rounded-xl p-4">
                <h2 className="text-xs font-semibold text-grappler-400 uppercase tracking-wide mb-3">Weekly Fatigue Trend</h2>
                <div className="flex items-end gap-2 h-20">
                  {fatigueDebt.weeklyFatigueScores.map((ws, i) => {
                    const pct = (ws.score / maxWeekly) * 100;
                    const bc = getDebtColor(ws.score);
                    const last = i === fatigueDebt.weeklyFatigueScores.length - 1;
                    return (
                      <div key={ws.week} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-grappler-500">{ws.score}</span>
                        <div className={`w-full rounded-t-md transition-all ${GAUGE_COLORS[bc].bg} ${last ? 'ring-2 ring-primary-400/50' : ''}`} style={{ height: `${Math.max(pct, 6)}%` }} />
                        <span className={`text-xs ${last ? 'text-primary-400 font-bold' : 'text-grappler-500'}`}>W{ws.week}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ═══ DETAILED METRICS (collapsible) ═══ */}
            <motion.div {...fadeUp} transition={{ delay: 0.25 }} className="bg-grappler-800 rounded-xl overflow-hidden">
              <button onClick={() => setDetailsExpanded((v) => !v)} className="w-full flex items-center justify-between p-4 text-left">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-grappler-400" />
                  <h2 className="text-sm font-semibold text-grappler-200">Training Load &amp; Nervous System</h2>
                </div>
                <ChevronDown className={`w-4 h-4 text-grappler-400 transition-transform ${detailsExpanded ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {detailsExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="px-4 pb-4 space-y-4">

                      {/* ACWR */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-grappler-900/60 rounded-lg p-2.5 text-center">
                          <p className="text-xs text-grappler-500">Acute (7d)</p>
                          <p className="text-base font-bold text-grappler-100">{metrics.acwr.acute > 1000 ? `${(metrics.acwr.acute / 1000).toFixed(1)}k` : metrics.acwr.acute}</p>
                        </div>
                        <div className="bg-grappler-900/60 rounded-lg p-2.5 text-center">
                          <p className="text-xs text-grappler-500">Chronic (28d)</p>
                          <p className="text-base font-bold text-grappler-100">{metrics.acwr.chronic > 1000 ? `${(metrics.acwr.chronic / 1000).toFixed(1)}k` : metrics.acwr.chronic}</p>
                        </div>
                        <div className="bg-grappler-900/60 rounded-lg p-2.5 text-center">
                          <p className="text-xs text-grappler-500">ACWR</p>
                          <p className="text-base font-bold" style={{ color: getACWRColor(metrics.acwr.status) }}>{metrics.acwr.ratio.toFixed(2)}</p>
                        </div>
                      </div>

                      {/* 28-Day Heatmap */}
                      {metrics.heatmap.length > 0 && (
                        <div>
                          <p className="text-xs text-grappler-400 mb-2">28-Day Intensity</p>
                          <div className="grid grid-cols-7 gap-1">
                            {metrics.heatmap.map((day) => {
                              const bg = day.intensity === 0 ? 'bg-grappler-700/40' : day.intensity < 30 ? 'bg-emerald-500/30' : day.intensity < 60 ? 'bg-yellow-500/40' : day.intensity < 85 ? 'bg-orange-500/50' : 'bg-red-500/60';
                              return <div key={day.date} className={`aspect-square rounded-sm ${bg}`} title={`${day.date}: ${day.intensity}%`} />;
                            })}
                          </div>
                        </div>
                      )}

                      {/* High-Intensity + Mat Time */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-grappler-900/60 rounded-lg p-2.5">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Zap className="w-3 h-3 text-amber-400" />
                            <span className="text-xs text-grappler-500">High-Intensity</span>
                          </div>
                          <span className="text-lg font-bold text-grappler-100">{metrics.highIntensityMinutes}</span>
                          <span className="text-xs text-grappler-400 ml-0.5">min</span>
                        </div>
                        <div className="bg-grappler-900/60 rounded-lg p-2.5">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Shield className="w-3 h-3 text-purple-400" />
                            <span className="text-xs text-grappler-500">Mat Time</span>
                          </div>
                          <span className="text-lg font-bold text-grappler-100">{metrics.matTimeMinutes}</span>
                          <span className="text-xs text-grappler-400 ml-0.5">min</span>
                        </div>
                      </div>

                      {/* Nervous System rows */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Brain className="w-3.5 h-3.5 text-purple-400" />
                          <span className="text-xs font-semibold text-grappler-300">Nervous System</span>
                        </div>
                        {[
                          { icon: <Heart className="w-3 h-3 text-red-400" />, label: 'Resting HR', value: metrics.nervousSystem.rhrTrend.current != null ? `${metrics.nervousSystem.rhrTrend.current} bpm` : '—', delta: metrics.nervousSystem.rhrTrend.delta, deltaInverse: true },
                          { icon: <Activity className="w-3 h-3 text-sky-400" />, label: 'HRV', value: metrics.nervousSystem.hrvDeviation.current != null ? `${metrics.nervousSystem.hrvDeviation.current} ms` : '—', pct: metrics.nervousSystem.hrvDeviation.deviationPct },
                        ].map(({ icon, label, value, delta, pct }) => (
                          <div key={label} className="flex items-center justify-between py-1">
                            <div className="flex items-center gap-2">
                              {icon}
                              <span className="text-xs text-grappler-400">{label}</span>
                            </div>
                            <span className="text-xs font-semibold text-grappler-200">{value}
                              {delta != null && delta !== 0 && <span className={`ml-1 ${delta > 2 ? 'text-red-400' : delta < -1 ? 'text-green-400' : 'text-grappler-500'}`}>{delta > 0 ? '+' : ''}{delta}</span>}
                              {pct != null && pct !== 0 && <span className={`ml-1 ${pct < -10 ? 'text-red-400' : pct > 10 ? 'text-green-400' : 'text-grappler-500'}`}>{pct > 0 ? '+' : ''}{pct}%</span>}
                            </span>
                          </div>
                        ))}
                        {/* Sympathetic Load bar */}
                        <div className="py-1">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Flame className="w-3 h-3 text-orange-400" />
                              <span className="text-xs text-grappler-400">Sympathetic Load</span>
                            </div>
                            <span className="text-xs font-semibold" style={{ color: getNSColor(metrics.nervousSystem.sympatheticLoad) }}>
                              {metrics.nervousSystem.sympatheticLoad}/100
                            </span>
                          </div>
                          <div className="h-1.5 bg-grappler-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${metrics.nervousSystem.sympatheticLoad}%`, backgroundColor: getNSColor(metrics.nervousSystem.sympatheticLoad) }} />
                          </div>
                        </div>
                        {/* CNS Strain bar */}
                        <div className="py-1">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Zap className="w-3 h-3 text-yellow-400" />
                              <span className="text-xs text-grappler-400">CNS Strain</span>
                            </div>
                            <span className="text-xs font-semibold" style={{ color: getNSColor(metrics.nervousSystem.cnsStrain) }}>
                              {metrics.nervousSystem.cnsStrain}/100
                            </span>
                          </div>
                          <div className="h-1.5 bg-grappler-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${metrics.nervousSystem.cnsStrain}%`, backgroundColor: getNSColor(metrics.nervousSystem.cnsStrain) }} />
                          </div>
                        </div>
                        {/* Sleep */}
                        <div className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2">
                            <Moon className="w-3 h-3 text-indigo-400" />
                            <span className="text-xs text-grappler-400">Sleep Consistency</span>
                          </div>
                          <span className="text-xs font-semibold text-grappler-200">
                            {metrics.nervousSystem.sleepConsistency.score > 0 ? `${metrics.nervousSystem.sleepConsistency.score}/100` : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* All Deload Protocols (collapsible) */}
            <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="bg-grappler-800 rounded-xl overflow-hidden">
              <button onClick={() => setProtocolsExpanded((v) => !v)} className="w-full flex items-center justify-between p-4 text-left">
                <h2 className="text-sm font-semibold text-grappler-200">All Deload Protocols ({allProtocols.length})</h2>
                <ChevronDown className={`w-4 h-4 text-grappler-400 transition-transform ${protocolsExpanded ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {protocolsExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="px-4 pb-4 space-y-3">
                      {allProtocols.map((p) => (
                        <div key={p.type} className="bg-grappler-900/60 rounded-lg p-3 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-grappler-100">{p.name}</span>
                            <span className="text-xs text-grappler-400 bg-grappler-700 px-2 py-0.5 rounded-full">{p.durationDays}d</span>
                          </div>
                          <p className="text-xs text-grappler-400">{p.description}</p>
                          <div className="flex gap-4 text-xs text-grappler-300">
                            <span>Vol: <span className="text-grappler-100 font-medium">{Math.round(p.volumeMultiplier * 100)}%</span></span>
                            <span>Int: <span className="text-grappler-100 font-medium">{Math.round(p.intensityMultiplier * 100)}%</span></span>
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
