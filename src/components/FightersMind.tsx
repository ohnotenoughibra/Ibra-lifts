'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, X, ChevronRight, ChevronLeft, Zap, Eye, Shield,
  TrendingUp, Trophy, Flame, Target, Plus, Trash2,
  ArrowUpRight, ArrowDownRight, Minus, Sparkles,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { useComputedGamification } from '@/lib/computed-gamification';
import { hapticLight, hapticMedium } from '@/lib/haptics';
import type { MentalCheckInContext, ConfidenceEntryType } from '@/lib/types';
import { toLocalDateStr } from '@/lib/utils';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';

// ─── Types & Constants ──────────────────────────────────────────────────────

type View = 'home' | 'checkin' | 'patterns' | 'ledger' | 'add_evidence';

const MENTAL_LABELS = {
  energy: ['Drained', 'Low', 'Steady', 'Strong', 'Charged'],
  focus: ['Scattered', 'Drifting', 'Decent', 'Sharp', 'Locked In'],
  confidence: ['Doubtful', 'Shaky', 'Okay', 'Solid', 'Certain'],
  composure: ['Anxious', 'Tense', 'Calm-ish', 'Steady', 'Ice Cold'],
} as const;

const CONTEXT_OPTIONS: { value: MentalCheckInContext; label: string; emoji: string }[] = [
  { value: 'pre_training', label: 'Before Training', emoji: '🥊' },
  { value: 'post_training', label: 'After Training', emoji: '💪' },
  { value: 'standalone', label: 'Just Checking In', emoji: '🧠' },
  { value: 'pre_competition', label: 'Before Competition', emoji: '⚔️' },
  { value: 'post_competition', label: 'After Competition', emoji: '🏆' },
];

const EVIDENCE_TYPES: { value: ConfidenceEntryType; label: string; icon: React.ElementType }[] = [
  { value: 'pr', label: 'Hit a PR', icon: Trophy },
  { value: 'breakthrough', label: 'Breakthrough', icon: Sparkles },
  { value: 'win', label: 'Won a Fight/Round', icon: Shield },
  { value: 'good_round', label: 'Good Sparring Round', icon: Target },
  { value: 'technique', label: 'Technique Click', icon: Brain },
  { value: 'comeback', label: 'Came Back Strong', icon: Flame },
  { value: 'streak', label: 'Training Streak', icon: TrendingUp },
  { value: 'manual', label: 'Other', icon: Plus },
];

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

const pageVariants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, x: -40, transition: { duration: 0.15 } },
};

// ─── Scale Picker (1–5 with labels) ────────────────────────────────────────

function ScalePicker({ label, value, onChange, labels }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  labels: readonly string[];
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-grappler-200">{label}</span>
        <span className="text-xs text-grappler-400">{labels[value - 1]}</span>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => { hapticLight(); onChange(n); }}
            className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-all duration-150 ${
              n <= value
                ? n <= 2 ? 'bg-red-500/30 text-red-300 ring-1 ring-red-500/40'
                  : n === 3 ? 'bg-yellow-500/30 text-yellow-300 ring-1 ring-yellow-500/40'
                  : 'bg-emerald-500/30 text-emerald-300 ring-1 ring-emerald-500/40'
                : 'bg-grappler-800 text-grappler-500'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Mental Score Calculation ───────────────────────────────────────────────

function mentalScore(c: { energy: number; focus: number; confidence: number; composure: number }) {
  return Math.round(((c.energy + c.focus + c.confidence + c.composure) / 20) * 100);
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function FightersMind({ onClose }: { onClose: () => void }) {
  const {
    mentalCheckIns, confidenceLedger, workoutLogs, trainingSessions,
    gamificationStats, addMentalCheckIn, deleteMentalCheckIn,
    addConfidenceEntry, deleteConfidenceEntry,
  } = useAppStore(useShallow(s => ({
    mentalCheckIns: (s.mentalCheckIns ?? []).filter((c: any) => !c._deleted),
    confidenceLedger: (s.confidenceLedger ?? []).filter((e: any) => !e._deleted),
    workoutLogs: s.workoutLogs,
    trainingSessions: s.trainingSessions,
    gamificationStats: s.gamificationStats,
    addMentalCheckIn: s.addMentalCheckIn,
    deleteMentalCheckIn: s.deleteMentalCheckIn,
    addConfidenceEntry: s.addConfidenceEntry,
    deleteConfidenceEntry: s.deleteConfidenceEntry,
  })));

  const computed = useComputedGamification();
  const [view, setView] = useState<View>('home');

  // ─── Check-in State ─────────────────────────────────────────────────────
  const [ciContext, setCiContext] = useState<MentalCheckInContext>('standalone');
  const [ciEnergy, setCiEnergy] = useState(3);
  const [ciFocus, setCiFocus] = useState(3);
  const [ciConfidence, setCiConfidence] = useState(3);
  const [ciComposure, setCiComposure] = useState(3);
  const [ciWord, setCiWord] = useState('');
  const [ciTriggers, setCiTriggers] = useState('');
  const [ciFlow, setCiFlow] = useState('');
  const [ciSelfTalk, setCiSelfTalk] = useState<'positive' | 'negative' | 'neutral'>('neutral');
  const [ciStep, setCiStep] = useState(0); // 0: context, 1: scales, 2: reflection

  // ─── Evidence Form State ────────────────────────────────────────────────
  const [evType, setEvType] = useState<ConfidenceEntryType>('breakthrough');
  const [evTitle, setEvTitle] = useState('');
  const [evDetail, setEvDetail] = useState('');
  const [evImpact, setEvImpact] = useState(3);

  const resetCheckIn = useCallback(() => {
    setCiContext('standalone');
    setCiEnergy(3); setCiFocus(3); setCiConfidence(3); setCiComposure(3);
    setCiWord(''); setCiTriggers(''); setCiFlow('');
    setCiSelfTalk('neutral'); setCiStep(0);
  }, []);

  const submitCheckIn = useCallback(() => {
    const now = new Date();
    addMentalCheckIn({
      date: toLocalDateStr(now),
      timestamp: now.toISOString(),
      context: ciContext,
      energy: ciEnergy,
      focus: ciFocus,
      confidence: ciConfidence,
      composure: ciComposure,
      word: ciWord || undefined,
      triggers: ciTriggers || undefined,
      flow: ciFlow || undefined,
      selfTalk: ciSelfTalk,
    });
    hapticMedium();
    resetCheckIn();
    setView('home');
  }, [ciContext, ciEnergy, ciFocus, ciConfidence, ciComposure, ciWord, ciTriggers, ciFlow, ciSelfTalk, addMentalCheckIn, resetCheckIn]);

  const submitEvidence = useCallback(() => {
    if (!evTitle.trim()) return;
    addConfidenceEntry({
      date: toLocalDateStr(),
      type: evType,
      title: evTitle.trim(),
      detail: evDetail.trim() || undefined,
      impact: evImpact,
      autoGenerated: false,
    });
    hapticMedium();
    setEvTitle(''); setEvDetail(''); setEvImpact(3); setEvType('breakthrough');
    setView('ledger');
  }, [evType, evTitle, evDetail, evImpact, addConfidenceEntry]);

  // ─── Pattern Analytics ──────────────────────────────────────────────────

  const sorted = useMemo(() =>
    [...mentalCheckIns].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [mentalCheckIns]
  );

  // Last 14 days trend data for chart
  const trendData = useMemo(() => {
    const now = Date.now();
    const twoWeeks = 14 * 24 * 60 * 60 * 1000;
    const recent = sorted.filter(c => now - new Date(c.timestamp).getTime() < twoWeeks);
    return recent.map(c => ({
      date: new Date(c.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: mentalScore(c),
      energy: c.energy,
      focus: c.focus,
      confidence: c.confidence,
      composure: c.composure,
    }));
  }, [sorted]);

  // Current averages for radar
  const radarData = useMemo(() => {
    const last7 = sorted.slice(-7);
    if (last7.length === 0) return null;
    const avg = (key: 'energy' | 'focus' | 'confidence' | 'composure') =>
      Math.round((last7.reduce((s, c) => s + c[key], 0) / last7.length) * 20);
    return [
      { dim: 'Energy', value: avg('energy') },
      { dim: 'Focus', value: avg('focus') },
      { dim: 'Confidence', value: avg('confidence') },
      { dim: 'Composure', value: avg('composure') },
    ];
  }, [sorted]);

  // Pattern insights — correlate mental state with workout performance
  const insights = useMemo(() => {
    const results: { text: string; type: 'positive' | 'negative' | 'neutral'; icon: React.ElementType }[] = [];
    if (sorted.length < 3) return results;

    // Avg mental score
    const allScores = sorted.map(mentalScore);
    const avgScore = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);

    // Trend direction (last 5 vs previous 5)
    if (sorted.length >= 6) {
      const recent5 = sorted.slice(-5).map(mentalScore);
      const prev5 = sorted.slice(-10, -5).map(mentalScore);
      if (prev5.length >= 3) {
        const recentAvg = recent5.reduce((a, b) => a + b, 0) / recent5.length;
        const prevAvg = prev5.reduce((a, b) => a + b, 0) / prev5.length;
        const delta = recentAvg - prevAvg;
        if (delta > 8) results.push({ text: `Mental state trending up +${Math.round(delta)}% vs previous sessions`, type: 'positive', icon: ArrowUpRight });
        else if (delta < -8) results.push({ text: `Mental state dipped ${Math.round(Math.abs(delta))}% — watch for overtraining`, type: 'negative', icon: ArrowDownRight });
        else results.push({ text: `Mental state is stable at ${avgScore}%`, type: 'neutral', icon: Minus });
      }
    }

    // Lowest dimension
    const dims = ['energy', 'focus', 'confidence', 'composure'] as const;
    const dimAvgs = dims.map(d => ({
      dim: d,
      avg: sorted.slice(-7).reduce((s, c) => s + c[d], 0) / Math.min(sorted.length, 7),
    }));
    const lowest = dimAvgs.reduce((a, b) => a.avg < b.avg ? a : b);
    if (lowest.avg < 3) {
      results.push({
        text: `${lowest.dim.charAt(0).toUpperCase() + lowest.dim.slice(1)} is your weakest area (avg ${lowest.avg.toFixed(1)}/5)`,
        type: 'negative',
        icon: Target,
      });
    }

    // Self-talk pattern
    const recentTalks = sorted.slice(-10).filter(c => c.selfTalk);
    const negCount = recentTalks.filter(c => c.selfTalk === 'negative').length;
    const posCount = recentTalks.filter(c => c.selfTalk === 'positive').length;
    if (negCount > posCount && negCount >= 3) {
      results.push({ text: `Negative self-talk in ${negCount}/${recentTalks.length} recent sessions — reframe the narrative`, type: 'negative', icon: Brain });
    } else if (posCount > negCount && posCount >= 3) {
      results.push({ text: `Positive self-talk dominant — that's a competitive edge`, type: 'positive', icon: Brain });
    }

    // Pre-training vs post-training mood lift
    const preTraining = sorted.filter(c => c.context === 'pre_training').slice(-5);
    const postTraining = sorted.filter(c => c.context === 'post_training').slice(-5);
    if (preTraining.length >= 2 && postTraining.length >= 2) {
      const preAvg = preTraining.map(mentalScore).reduce((a, b) => a + b, 0) / preTraining.length;
      const postAvg = postTraining.map(mentalScore).reduce((a, b) => a + b, 0) / postTraining.length;
      if (postAvg > preAvg + 5) {
        results.push({ text: `Training boosts your mental state by ~${Math.round(postAvg - preAvg)}% — use it as medicine`, type: 'positive', icon: Zap });
      }
    }

    // Correlate high mental score with PRs from workoutLogs
    const prLogs = workoutLogs.filter(w => w.exercises?.some(e => e.personalRecord));
    if (prLogs.length >= 2 && sorted.length >= 5) {
      const prDates = new Set(prLogs.map(w => toLocalDateStr(w.date)));
      const prDayCheckIns = sorted.filter(c => prDates.has(c.date));
      const nonPrCheckIns = sorted.filter(c => !prDates.has(c.date));
      if (prDayCheckIns.length >= 2 && nonPrCheckIns.length >= 2) {
        const prMentalAvg = prDayCheckIns.map(mentalScore).reduce((a, b) => a + b, 0) / prDayCheckIns.length;
        const nonPrMentalAvg = nonPrCheckIns.map(mentalScore).reduce((a, b) => a + b, 0) / nonPrCheckIns.length;
        if (prMentalAvg > nonPrMentalAvg + 5) {
          results.push({ text: `Your PRs happen when mental score is ${Math.round(prMentalAvg)}% — aim for that zone`, type: 'positive', icon: Trophy });
        }
      }
    }

    return results;
  }, [sorted, workoutLogs]);

  // Confidence ledger sorted by date desc
  const ledgerSorted = useMemo(() =>
    [...confidenceLedger].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [confidenceLedger]
  );

  // Auto-generated confidence stats
  const autoConfidence = useMemo(() => {
    const stats = {
      totalPRs: computed.personalRecords || 0,
      currentStreak: computed.currentStreak || 0,
      longestStreak: computed.longestStreak || 0,
      totalWorkouts: computed.totalWorkouts || 0,
      comebacks: gamificationStats.comebackCount || 0,
      totalTrainingSessions: trainingSessions.length,
    };
    return stats;
  }, [gamificationStats, trainingSessions]);

  // Last check-in for quick reference
  const lastCheckIn = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  const lastScore = lastCheckIn ? mentalScore(lastCheckIn) : null;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-grappler-950 z-50 overflow-y-auto safe-area-top safe-area-bottom"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-grappler-950/90 backdrop-blur-xl border-b border-grappler-800/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            {view !== 'home' && (
              <button onClick={() => { hapticLight(); setView('home'); resetCheckIn(); }} className="p-1.5 -ml-1.5 text-grappler-400">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <Brain className="w-5 h-5 text-violet-400" />
            <h1 className="text-lg font-display font-bold text-grappler-100">
              {view === 'home' ? "Fighter's Mind" : view === 'checkin' ? 'Mental Check-in' : view === 'patterns' ? 'Pattern Engine' : view === 'ledger' ? 'Confidence Ledger' : 'Add Evidence'}
            </h1>
          </div>
          <button onClick={onClose} className="p-2 text-grappler-400 hover:text-grappler-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-4 pb-24">
        <AnimatePresence mode="wait">
          {/* ═══════════════════ HOME VIEW ═══════════════════ */}
          {view === 'home' && (
            <motion.div key="home" {...pageVariants} className="space-y-5 pt-4">
              {/* Current State Card */}
              <motion.div variants={itemVariants} className="bg-grappler-900/80 rounded-2xl border border-grappler-800/50 p-4">
                {lastCheckIn ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-grappler-400 uppercase tracking-wider">Current State</span>
                      <span className="text-xs text-grappler-500">
                        {new Date(lastCheckIn.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="relative w-16 h-16">
                        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                          <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" className="text-grappler-800" strokeWidth="4" />
                          <circle
                            cx="32" cy="32" r="28" fill="none"
                            stroke="url(#mentalGrad)" strokeWidth="4" strokeLinecap="round"
                            strokeDasharray={`${(lastScore! / 100) * 175.9} 175.9`}
                          />
                          <defs>
                            <linearGradient id="mentalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#8b5cf6" />
                              <stop offset="100%" stopColor="#06b6d4" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-grappler-100">
                          {lastScore}
                        </span>
                      </div>
                      <div className="flex-1 grid grid-cols-2 gap-1.5">
                        {(['energy', 'focus', 'confidence', 'composure'] as const).map(dim => (
                          <div key={dim} className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              lastCheckIn[dim] >= 4 ? 'bg-emerald-400' : lastCheckIn[dim] >= 3 ? 'bg-yellow-400' : 'bg-red-400'
                            }`} />
                            <span className="text-xs text-grappler-300 capitalize">{dim}</span>
                            <span className="text-xs font-semibold text-grappler-200 ml-auto">{lastCheckIn[dim]}/5</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {lastCheckIn.word && (
                      <div className="text-center">
                        <span className="text-sm italic text-grappler-400">&quot;{lastCheckIn.word}&quot;</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 space-y-2">
                    <Brain className="w-8 h-8 text-violet-400/50 mx-auto" />
                    <p className="text-sm text-grappler-400">No check-ins yet</p>
                    <p className="text-xs text-grappler-500">Start tracking your mental state to unlock patterns</p>
                  </div>
                )}
              </motion.div>

              {/* Quick Actions */}
              <motion.div variants={itemVariants} className="space-y-2">
                <button
                  onClick={() => { hapticMedium(); setView('checkin'); }}
                  className="w-full flex items-center gap-3 bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border border-violet-500/30 rounded-xl p-4 text-left transition-all active:scale-[0.98]"
                >
                  <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-violet-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-grappler-100">Check In</p>
                    <p className="text-xs text-grappler-400">30-second mental state capture</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-grappler-500" />
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { hapticLight(); setView('patterns'); }}
                    className="flex items-center gap-2.5 bg-grappler-900/80 border border-grappler-800/50 rounded-xl p-3.5 text-left transition-all active:scale-[0.98]"
                  >
                    <Eye className="w-4 h-4 text-cyan-400" />
                    <div>
                      <p className="text-sm font-medium text-grappler-200">Patterns</p>
                      <p className="text-xs text-grappler-500">{sorted.length} check-ins</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { hapticLight(); setView('ledger'); }}
                    className="flex items-center gap-2.5 bg-grappler-900/80 border border-grappler-800/50 rounded-xl p-3.5 text-left transition-all active:scale-[0.98]"
                  >
                    <Shield className="w-4 h-4 text-amber-400" />
                    <div>
                      <p className="text-sm font-medium text-grappler-200">Evidence</p>
                      <p className="text-xs text-grappler-500">{confidenceLedger.length + autoConfidence.totalPRs} entries</p>
                    </div>
                  </button>
                </div>
              </motion.div>

              {/* Quick Insights */}
              {insights.length > 0 && (
                <motion.div variants={itemVariants} className="space-y-2">
                  <h3 className="text-xs text-grappler-400 uppercase tracking-wider font-semibold">Insights</h3>
                  {insights.slice(0, 3).map((insight, i) => (
                    <div key={i} className={`flex items-start gap-3 rounded-xl p-3 ${
                      insight.type === 'positive' ? 'bg-emerald-500/10 border border-emerald-500/20' :
                      insight.type === 'negative' ? 'bg-red-500/10 border border-red-500/20' :
                      'bg-grappler-800/50 border border-grappler-700/30'
                    }`}>
                      <insight.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        insight.type === 'positive' ? 'text-emerald-400' :
                        insight.type === 'negative' ? 'text-red-400' : 'text-grappler-400'
                      }`} />
                      <p className="text-sm text-grappler-200">{insight.text}</p>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Recent Check-ins */}
              {sorted.length > 0 && (
                <motion.div variants={itemVariants} className="space-y-2">
                  <h3 className="text-xs text-grappler-400 uppercase tracking-wider font-semibold">Recent</h3>
                  {sorted.slice(-5).reverse().map(c => (
                    <div key={c.id} className="flex items-center justify-between bg-grappler-900/60 rounded-lg p-3 border border-grappler-800/30">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                          mentalScore(c) >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
                          mentalScore(c) >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {mentalScore(c)}
                        </div>
                        <div>
                          <p className="text-sm text-grappler-200">
                            {CONTEXT_OPTIONS.find(o => o.value === c.context)?.label || c.context}
                          </p>
                          <p className="text-xs text-grappler-500">
                            {new Date(c.timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            {c.word && ` · "${c.word}"`}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => { hapticLight(); deleteMentalCheckIn(c.id); }} className="p-1.5 text-grappler-600 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ═══════════════════ CHECK-IN FLOW ═══════════════════ */}
          {view === 'checkin' && (
            <motion.div key="checkin" {...pageVariants} className="space-y-5 pt-4">
              {/* Step indicators */}
              <div className="flex items-center justify-center gap-2">
                {[0, 1, 2].map(s => (
                  <div key={s} className={`h-1 rounded-full transition-all duration-300 ${
                    s === ciStep ? 'w-8 bg-violet-400' : s < ciStep ? 'w-6 bg-violet-400/40' : 'w-6 bg-grappler-700'
                  }`} />
                ))}
              </div>

              <AnimatePresence mode="wait">
                {/* Step 0: Context */}
                {ciStep === 0 && (
                  <motion.div key="step0" {...pageVariants} className="space-y-4">
                    <h2 className="text-center text-lg font-display font-bold text-grappler-100">What&apos;s the situation?</h2>
                    <div className="space-y-2">
                      {CONTEXT_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => { hapticLight(); setCiContext(opt.value); setCiStep(1); }}
                          className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all active:scale-[0.98] ${
                            ciContext === opt.value
                              ? 'bg-violet-500/15 border-violet-500/40 text-grappler-100'
                              : 'bg-grappler-900/60 border-grappler-800/40 text-grappler-300 hover:border-grappler-700'
                          }`}
                        >
                          <span className="text-lg">{opt.emoji}</span>
                          <span className="text-sm font-medium">{opt.label}</span>
                          <ChevronRight className="w-4 h-4 ml-auto text-grappler-600" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step 1: Scales */}
                {ciStep === 1 && (
                  <motion.div key="step1" {...pageVariants} className="space-y-5">
                    <h2 className="text-center text-lg font-display font-bold text-grappler-100">How&apos;s the mind?</h2>
                    <ScalePicker label="Energy" value={ciEnergy} onChange={setCiEnergy} labels={MENTAL_LABELS.energy} />
                    <ScalePicker label="Focus" value={ciFocus} onChange={setCiFocus} labels={MENTAL_LABELS.focus} />
                    <ScalePicker label="Confidence" value={ciConfidence} onChange={setCiConfidence} labels={MENTAL_LABELS.confidence} />
                    <ScalePicker label="Composure" value={ciComposure} onChange={setCiComposure} labels={MENTAL_LABELS.composure} />

                    {/* Live score preview */}
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <span className="text-sm text-grappler-400">Mental Score:</span>
                      <span className={`text-lg font-bold ${
                        mentalScore({ energy: ciEnergy, focus: ciFocus, confidence: ciConfidence, composure: ciComposure }) >= 70
                          ? 'text-emerald-400' : mentalScore({ energy: ciEnergy, focus: ciFocus, confidence: ciConfidence, composure: ciComposure }) >= 50
                          ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {mentalScore({ energy: ciEnergy, focus: ciFocus, confidence: ciConfidence, composure: ciComposure })}%
                      </span>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setCiStep(0)}
                        className="flex-1 py-3 rounded-xl bg-grappler-800 text-grappler-300 text-sm font-medium"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => setCiStep(2)}
                        className="flex-1 py-3 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30 text-sm font-semibold"
                      >
                        Continue
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Reflection (optional) */}
                {ciStep === 2 && (
                  <motion.div key="step2" {...pageVariants} className="space-y-4">
                    <h2 className="text-center text-lg font-display font-bold text-grappler-100">Quick Reflection</h2>
                    <p className="text-center text-xs text-grappler-500">All optional — but this is where the patterns come from</p>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-grappler-400 mb-1 block">One word for this moment</label>
                        <input
                          type="text"
                          value={ciWord}
                          onChange={e => setCiWord(e.target.value)}
                          placeholder="focused, scattered, angry, ready..."
                          maxLength={30}
                          className="w-full bg-grappler-900 border border-grappler-700 rounded-lg px-3 py-2.5 text-sm text-grappler-200 placeholder:text-grappler-600 focus:outline-none focus:border-violet-500/50"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-grappler-400 mb-1 block">What threw you off?</label>
                        <textarea
                          value={ciTriggers}
                          onChange={e => setCiTriggers(e.target.value)}
                          placeholder="Got rocked in sparring, bad sleep, work stress..."
                          rows={2}
                          className="w-full bg-grappler-900 border border-grappler-700 rounded-lg px-3 py-2.5 text-sm text-grappler-200 placeholder:text-grappler-600 focus:outline-none focus:border-violet-500/50 resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-grappler-400 mb-1 block">When did you flow?</label>
                        <textarea
                          value={ciFlow}
                          onChange={e => setCiFlow(e.target.value)}
                          placeholder="Nailed a new sweep, hit a clean double, felt fast on the bag..."
                          rows={2}
                          className="w-full bg-grappler-900 border border-grappler-700 rounded-lg px-3 py-2.5 text-sm text-grappler-200 placeholder:text-grappler-600 focus:outline-none focus:border-violet-500/50 resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-grappler-400 mb-2 block">Self-talk today</label>
                        <div className="flex gap-2">
                          {(['positive', 'neutral', 'negative'] as const).map(t => (
                            <button
                              key={t}
                              onClick={() => { hapticLight(); setCiSelfTalk(t); }}
                              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                ciSelfTalk === t
                                  ? t === 'positive' ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                                    : t === 'negative' ? 'bg-red-500/20 text-red-300 ring-1 ring-red-500/40'
                                    : 'bg-grappler-700 text-grappler-200 ring-1 ring-grappler-600'
                                  : 'bg-grappler-800/50 text-grappler-500'
                              }`}
                            >
                              {t === 'positive' ? 'Positive' : t === 'negative' ? 'Negative' : 'Neutral'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setCiStep(1)}
                        className="flex-1 py-3 rounded-xl bg-grappler-800 text-grappler-300 text-sm font-medium"
                      >
                        Back
                      </button>
                      <button
                        onClick={submitCheckIn}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-sm font-bold transition-all active:scale-[0.97]"
                      >
                        Log It
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ═══════════════════ PATTERN ENGINE ═══════════════════ */}
          {view === 'patterns' && (
            <motion.div key="patterns" {...pageVariants} className="space-y-5 pt-4">
              {sorted.length < 3 ? (
                <div className="text-center py-12 space-y-3">
                  <Eye className="w-10 h-10 text-cyan-400/30 mx-auto" />
                  <p className="text-sm text-grappler-400">Need at least 3 check-ins to see patterns</p>
                  <p className="text-xs text-grappler-500">You have {sorted.length} — keep going</p>
                  <button
                    onClick={() => setView('checkin')}
                    className="mt-4 px-6 py-2.5 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30 text-sm font-medium"
                  >
                    Check In Now
                  </button>
                </div>
              ) : (
                <>
                  {/* Radar */}
                  {radarData && (
                    <div className="bg-grappler-900/80 rounded-2xl border border-grappler-800/50 p-4">
                      <h3 className="text-xs text-grappler-400 uppercase tracking-wider font-semibold mb-2">Mental Profile (Last 7)</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="#374151" />
                          <PolarAngleAxis dataKey="dim" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                          <Radar dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Trend Chart */}
                  {trendData.length >= 2 && (
                    <div className="bg-grappler-900/80 rounded-2xl border border-grappler-800/50 p-4">
                      <h3 className="text-xs text-grappler-400 uppercase tracking-wider font-semibold mb-2">14-Day Trend</h3>
                      <ResponsiveContainer width="100%" height={160}>
                        <AreaChart data={trendData}>
                          <defs>
                            <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                          <Tooltip
                            contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }}
                            labelStyle={{ color: '#9ca3af' }}
                          />
                          <Area type="monotone" dataKey="score" stroke="#8b5cf6" fill="url(#scoreFill)" strokeWidth={2} dot={{ r: 3, fill: '#8b5cf6' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Insights */}
                  {insights.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs text-grappler-400 uppercase tracking-wider font-semibold">Pattern Insights</h3>
                      {insights.map((insight, i) => (
                        <div key={i} className={`flex items-start gap-3 rounded-xl p-3 ${
                          insight.type === 'positive' ? 'bg-emerald-500/10 border border-emerald-500/20' :
                          insight.type === 'negative' ? 'bg-red-500/10 border border-red-500/20' :
                          'bg-grappler-800/50 border border-grappler-700/30'
                        }`}>
                          <insight.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                            insight.type === 'positive' ? 'text-emerald-400' :
                            insight.type === 'negative' ? 'text-red-400' : 'text-grappler-400'
                          }`} />
                          <p className="text-sm text-grappler-200">{insight.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Self-talk distribution */}
                  {sorted.length >= 5 && (
                    <div className="bg-grappler-900/80 rounded-2xl border border-grappler-800/50 p-4 space-y-3">
                      <h3 className="text-xs text-grappler-400 uppercase tracking-wider font-semibold">Self-Talk Distribution</h3>
                      {(() => {
                        const talks = sorted.filter(c => c.selfTalk);
                        const pos = talks.filter(c => c.selfTalk === 'positive').length;
                        const neg = talks.filter(c => c.selfTalk === 'negative').length;
                        const neu = talks.filter(c => c.selfTalk === 'neutral').length;
                        const total = talks.length || 1;
                        return (
                          <div className="space-y-2">
                            {[
                              { label: 'Positive', count: pos, color: 'bg-emerald-400', textColor: 'text-emerald-400' },
                              { label: 'Neutral', count: neu, color: 'bg-grappler-400', textColor: 'text-grappler-400' },
                              { label: 'Negative', count: neg, color: 'bg-red-400', textColor: 'text-red-400' },
                            ].map(bar => (
                              <div key={bar.label} className="flex items-center gap-3">
                                <span className={`text-xs w-16 ${bar.textColor}`}>{bar.label}</span>
                                <div className="flex-1 h-2 bg-grappler-800 rounded-full overflow-hidden">
                                  <div className={`h-full ${bar.color} rounded-full transition-all duration-500`} style={{ width: `${(bar.count / total) * 100}%` }} />
                                </div>
                                <span className="text-xs text-grappler-500 w-8 text-right">{Math.round((bar.count / total) * 100)}%</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ═══════════════════ CONFIDENCE LEDGER ═══════════════════ */}
          {view === 'ledger' && (
            <motion.div key="ledger" {...pageVariants} className="space-y-5 pt-4">
              {/* Auto-stats summary */}
              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-2xl border border-amber-500/20 p-4 space-y-3">
                <h3 className="text-xs text-amber-400 uppercase tracking-wider font-semibold">Your Evidence (Auto-Tracked)</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'PRs Hit', value: autoConfidence.totalPRs, icon: Trophy },
                    { label: 'Streak', value: `${autoConfidence.currentStreak}d`, icon: Flame },
                    { label: 'Sessions', value: autoConfidence.totalWorkouts + autoConfidence.totalTrainingSessions, icon: Target },
                  ].map(stat => (
                    <div key={stat.label} className="text-center">
                      <stat.icon className="w-4 h-4 text-amber-400/60 mx-auto mb-1" />
                      <p className="text-lg font-bold text-grappler-100">{stat.value}</p>
                      <p className="text-xs text-grappler-500">{stat.label}</p>
                    </div>
                  ))}
                </div>
                {autoConfidence.comebacks > 0 && (
                  <p className="text-xs text-amber-400/80 text-center">
                    {autoConfidence.comebacks} comeback{autoConfidence.comebacks > 1 ? 's' : ''} from 7+ day breaks — you always come back
                  </p>
                )}
              </div>

              {/* Add Evidence button */}
              <button
                onClick={() => { hapticMedium(); setView('add_evidence'); }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-sm font-semibold active:scale-[0.98] transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Evidence
              </button>

              {/* Manual ledger entries */}
              {ledgerSorted.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-xs text-grappler-400 uppercase tracking-wider font-semibold">Your Moments</h3>
                  {ledgerSorted.map(entry => {
                    const typeInfo = EVIDENCE_TYPES.find(t => t.value === entry.type);
                    const Icon = typeInfo?.icon || Plus;
                    return (
                      <div key={entry.id} className="flex items-start gap-3 bg-grappler-900/60 rounded-xl p-3 border border-grappler-800/30">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon className="w-4 h-4 text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-grappler-200">{entry.title}</p>
                          {entry.detail && <p className="text-xs text-grappler-400 mt-0.5">{entry.detail}</p>}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-grappler-500">{new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            <span className="text-xs text-grappler-600">·</span>
                            <div className="flex gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < entry.impact ? 'bg-amber-400' : 'bg-grappler-700'}`} />
                              ))}
                            </div>
                          </div>
                        </div>
                        <button onClick={() => { hapticLight(); deleteConfidenceEntry(entry.id); }} className="p-1.5 text-grappler-600 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-grappler-500">No manual entries yet</p>
                  <p className="text-xs text-grappler-600 mt-1">Log breakthroughs, wins, and moments that build your belief</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════════════════ ADD EVIDENCE FORM ═══════════════════ */}
          {view === 'add_evidence' && (
            <motion.div key="add_evidence" {...pageVariants} className="space-y-5 pt-4">
              <h2 className="text-center text-lg font-display font-bold text-grappler-100">Log Evidence</h2>
              <p className="text-center text-xs text-grappler-500">What happened that proves you belong here?</p>

              {/* Type selector */}
              <div className="grid grid-cols-2 gap-2">
                {EVIDENCE_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => { hapticLight(); setEvType(t.value); }}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                      evType === t.value
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                        : 'bg-grappler-900/60 border-grappler-800/40 text-grappler-400'
                    }`}
                  >
                    <t.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs font-medium">{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Title */}
              <div>
                <label className="text-xs text-grappler-400 mb-1 block">What happened?</label>
                <input
                  type="text"
                  value={evTitle}
                  onChange={e => setEvTitle(e.target.value)}
                  placeholder="Hit 315 squat, survived 5 rounds with a killer..."
                  className="w-full bg-grappler-900 border border-grappler-700 rounded-lg px-3 py-2.5 text-sm text-grappler-200 placeholder:text-grappler-600 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Detail */}
              <div>
                <label className="text-xs text-grappler-400 mb-1 block">More detail (optional)</label>
                <textarea
                  value={evDetail}
                  onChange={e => setEvDetail(e.target.value)}
                  placeholder="Why this matters, how it felt..."
                  rows={3}
                  className="w-full bg-grappler-900 border border-grappler-700 rounded-lg px-3 py-2.5 text-sm text-grappler-200 placeholder:text-grappler-600 focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>

              {/* Impact */}
              <ScalePicker
                label="How much does this matter?"
                value={evImpact}
                onChange={setEvImpact}
                labels={['A little', 'Some', 'Meaningful', 'Big deal', 'Life-changing']}
              />

              {/* Submit */}
              <button
                onClick={submitEvidence}
                disabled={!evTitle.trim()}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold transition-all active:scale-[0.97] disabled:opacity-30 disabled:active:scale-100"
              >
                Add to Ledger
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
