'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Zap, ChevronRight, Brain, TrendingUp, AlertTriangle,
  Shield, Flame, Moon, Droplets, Activity,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { getReadinessSummary } from '@/lib/performance-engine';
import { hapticLight, hapticMedium } from '@/lib/haptics';
import { cn, toLocalDateStr} from '@/lib/utils';

const LEVEL_CONFIG = {
  peak: { label: 'Go Hard', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', ring: 'stroke-emerald-400', msg: 'You\'re fresh — push it today' },
  good: { label: 'Solid', color: 'text-green-400', bg: 'bg-green-500/15', border: 'border-green-500/30', ring: 'stroke-green-400', msg: 'Good to go — train with intent' },
  moderate: { label: 'Moderate', color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', ring: 'stroke-yellow-400', msg: 'Solid baseline — focus on technique and controlled effort' },
  low: { label: 'Easy Day', color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/30', ring: 'stroke-orange-400', msg: 'Accumulated load is high — back off volume today' },
  critical: { label: 'Recover', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30', ring: 'stroke-red-400', msg: 'Your body needs rest — consider a recovery session instead' },
} as const;

const FACTOR_ICONS: Record<string, React.ElementType> = {
  sleep: Moon,
  nutrition: Droplets,
  stress: Brain,
  recovery: Shield,
  injury: AlertTriangle,
  training_load: Flame,
  hydration: Droplets,
  hrv: Activity,
  soreness: TrendingUp,
};

export default function ReadyForThis({ onProceed, onSkip }: {
  onProceed: () => void;
  onSkip: () => void;
}) {
  const {
    user, workoutLogs, trainingSessions, latestWhoopData, wearableHistory,
    meals, macroTargets, waterLog, injuryLog, quickLogs, mentalCheckIns,
    activeWorkout,
  } = useAppStore(useShallow(s => ({
    user: s.user,
    workoutLogs: s.workoutLogs,
    trainingSessions: s.trainingSessions,
    latestWhoopData: s.latestWhoopData,
    wearableHistory: s.wearableHistory,
    meals: s.meals.filter(m => !m._deleted),
    macroTargets: s.macroTargets,
    waterLog: s.waterLog,
    injuryLog: s.injuryLog,
    quickLogs: s.quickLogs,
    mentalCheckIns: (s.mentalCheckIns ?? []).filter((c: any) => !c._deleted),
    activeWorkout: s.activeWorkout,
  })));

  const [dismissed, setDismissed] = useState(false);

  // Auto-proceed after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!dismissed) {
        setDismissed(true);
        onProceed();
      }
    }, 8000);
    return () => clearTimeout(timer);
  }, [dismissed, onProceed]);

  const readiness = useMemo(() => getReadinessSummary({
    user, workoutLogs, trainingSessions, wearableData: latestWhoopData,
    wearableHistory, meals, macroTargets, waterLog, injuryLog, quickLogs,
  }), [user, workoutLogs, trainingSessions, latestWhoopData, wearableHistory, meals, macroTargets, waterLog, injuryLog, quickLogs]);

  // Mental state from recent check-ins
  const recentMental = useMemo(() => {
    const today = toLocalDateStr();
    const recent = mentalCheckIns
      .filter(c => c.date === today || (Date.now() - new Date(c.timestamp).getTime() < 24 * 60 * 60 * 1000))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (recent.length === 0) return null;
    const last = recent[0];
    return {
      score: Math.round(((last.energy + last.focus + last.confidence + last.composure) / 20) * 100),
      energy: last.energy,
      focus: last.focus,
      confidence: last.confidence,
      composure: last.composure,
    };
  }, [mentalCheckIns]);

  // Session info
  const sessionName = activeWorkout?.session?.exercises
    ?.slice(0, 2).map(e => e.exercise?.name || '').filter(Boolean).join(', ') || 'Workout';
  const exerciseCount = activeWorkout?.session?.exercises?.length || 0;

  const level = readiness?.level || 'moderate';
  const config = LEVEL_CONFIG[level as keyof typeof LEVEL_CONFIG] || LEVEL_CONFIG.moderate;
  const score = readiness?.score ?? 65;

  const handleProceed = () => {
    hapticMedium();
    setDismissed(true);
    onProceed();
  };

  const handleSkip = () => {
    hapticLight();
    setDismissed(true);
    onSkip();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-grappler-950 z-50 flex flex-col items-center justify-center px-6"
    >
      {/* Readiness Ring */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 20 }}
        className="relative w-32 h-32 mb-6"
      >
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor" className="text-grappler-800" strokeWidth="6" />
          <circle
            cx="64" cy="64" r="56" fill="none"
            className={config.ring}
            strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 351.9} 351.9`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-grappler-100">{score}</span>
          <span className="text-xs text-grappler-400 -mt-0.5">readiness</span>
        </div>
      </motion.div>

      {/* Level label + message */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="text-center mb-6 max-w-xs"
      >
        <span className={cn('text-sm font-black uppercase tracking-wider', config.color)}>
          {config.label}
        </span>
        <p className="text-sm text-grappler-300 mt-1.5">{config.msg}</p>
      </motion.div>

      {/* Key factors */}
      {readiness && readiness.allFactors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          className="w-full max-w-xs mb-6 space-y-1.5"
        >
          {readiness.allFactors.slice(0, 4).map((factor, i) => {
            const Icon = FACTOR_ICONS[factor.source] || Zap;
            return (
              <div key={i} className="flex items-center gap-2.5">
                <Icon className="w-3.5 h-3.5 text-grappler-500 flex-shrink-0" />
                <span className="text-xs text-grappler-400 flex-1">{factor.label}</span>
                <div className="w-16 h-1.5 bg-grappler-800 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', factor.score >= 70 ? 'bg-emerald-400' : factor.score >= 40 ? 'bg-yellow-400' : 'bg-red-400')}
                    style={{ width: `${factor.score}%` }}
                  />
                </div>
                <span className={cn('text-xs font-medium w-7 text-right', factor.score >= 70 ? 'text-emerald-400' : factor.score >= 40 ? 'text-yellow-400' : 'text-red-400')}>
                  {factor.score}
                </span>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Mental state if available */}
      {recentMental && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.3 }}
          className="w-full max-w-xs mb-6"
        >
          <div className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2">
            <Brain className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
            <span className="text-xs text-violet-300">
              Mental: {recentMental.score}% — {recentMental.score >= 70 ? 'locked in' : recentMental.score >= 50 ? 'steady' : 'check in with yourself'}
            </span>
          </div>
        </motion.div>
      )}

      {/* Recommendation */}
      {readiness?.topRecommendation && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.3 }}
          className="text-xs text-grappler-500 text-center max-w-xs mb-8 italic"
        >
          {readiness.topRecommendation}
        </motion.p>
      )}

      {/* Session info */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="text-xs text-grappler-500 mb-3"
      >
        {exerciseCount} exercises · {sessionName}
      </motion.p>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65, duration: 0.4 }}
        className="w-full max-w-xs space-y-2"
      >
        <button
          onClick={handleProceed}
          className={cn(
            'w-full py-3.5 rounded-xl text-sm font-bold transition-all active:scale-[0.97] flex items-center justify-center gap-2',
            level === 'critical'
              ? 'bg-grappler-800 text-grappler-300 border border-grappler-700'
              : 'bg-gradient-to-r from-primary-500 to-primary-400 text-white'
          )}
        >
          <Zap className="w-4 h-4" />
          {level === 'critical' ? 'Start Anyway' : 'Let\'s Go'}
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={handleSkip}
          className="w-full py-2.5 text-xs text-grappler-500 hover:text-grappler-300 transition-colors"
        >
          Skip next time
        </button>
      </motion.div>

      {/* Auto-proceed timer */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 8, ease: 'linear' }}
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-grappler-700 origin-left"
      />
    </motion.div>
  );
}
