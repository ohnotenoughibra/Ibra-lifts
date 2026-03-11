'use client';

import { motion } from 'framer-motion';
import {
  Check, Share2, Trophy, Brain, ChevronRight, Shield,
  TrendingUp, Calendar, Apple, Flame, Dumbbell, Zap, BarChart3,
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import type { OverlayView } from '../dashboard-types';

interface PostWorkoutPhaseProps {
  todayPerformance: {
    grade: string;
    verdict: string;
    prs: number;
    prExercises: string[];
    totalVolume: number;
    totalSets: number;
    avgRPE: number;
  };
  lastCompletedWorkout: {
    log: { overallRPE: number; duration?: number; exercises: any[] };
    hadPR: boolean;
    newBadges?: { id: string; icon: string; name: string }[];
    newStreak: number;
    points?: number;
    isMesocycleComplete?: boolean;
    mesocycleName?: string;
    mesocycleTotalSessions?: number;
  } | null;
  postWorkoutNutritionNudge: { text: string; urgent: boolean } | null;
  mesocycleProgress: { total: number; completed: number; percent: number; blockName?: string; isComplete?: boolean } | null;
  forwardLook: string | null;
  weightUnit: string;
  shareCopied: boolean;
  onShare: () => void;
  onDismiss: () => void;
  onNavigate: (view: OverlayView, context?: string) => void;
  onViewReport?: (mesoId: string) => void;
  prevBlockJustCompleted?: boolean;
  blockCompleteStats?: {
    totalVolume: number;
    totalPRs: number;
    avgRPE: number;
    totalDuration: number;
    sessionsCompleted: number;
    mesoName: string;
    volumeDelta: number | null;
  } | null;
}

export default function PostWorkoutPhase({
  todayPerformance,
  lastCompletedWorkout,
  postWorkoutNutritionNudge,
  mesocycleProgress,
  forwardLook,
  weightUnit,
  shareCopied,
  onShare,
  onDismiss,
  onNavigate,
  onViewReport,
  prevBlockJustCompleted,
  blockCompleteStats,
}: PostWorkoutPhaseProps) {
  const isMesoComplete = prevBlockJustCompleted || lastCompletedWorkout?.isMesocycleComplete;
  const blockStats = blockCompleteStats;

  // ─── Mesocycle Complete Card ───
  if (isMesoComplete && blockStats) {
    const hours = Math.floor(blockStats.totalDuration / 60);
    const mins = blockStats.totalDuration % 60;
    return (
      <motion.div
        key="zone2-block-complete-celebration"
        initial={{ opacity: 0, scale: 0.94, y: 28 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl border border-primary-500/30 bg-gradient-to-br from-primary-500/15 via-grappler-800 to-accent-500/10 p-5 overflow-hidden"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="text-center mb-4"
        >
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 15 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/25 to-accent-500/25 border border-primary-500/20 flex items-center justify-center mx-auto mb-3"
          >
            <Trophy className="w-8 h-8 text-primary-400" />
          </motion.div>
          <motion.h3
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.3 }}
            className="text-lg font-black text-grappler-50"
          >
            Block Complete
          </motion.h3>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.25 }}
            className="text-sm text-grappler-400 mt-1"
          >
            <span className="text-primary-300 font-semibold">{blockStats.mesoName}</span> — all {blockStats.sessionsCompleted} sessions crushed
          </motion.p>
        </motion.div>

        {/* Block summary stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="grid grid-cols-2 gap-2 mb-3"
        >
          <div className="bg-grappler-900/60 border border-grappler-700/40 rounded-xl p-3 text-center">
            <Dumbbell className="w-4 h-4 text-primary-400 mx-auto mb-1" />
            <p className="text-lg font-black text-grappler-100">{formatNumber(blockStats.totalVolume)}</p>
            <p className="text-xs text-grappler-400 uppercase">Total {weightUnit}</p>
            {blockStats.volumeDelta !== null && (
              <p className={cn('text-xs font-bold mt-0.5', blockStats.volumeDelta > 0 ? 'text-green-400' : blockStats.volumeDelta < 0 ? 'text-red-400' : 'text-grappler-400')}>
                {blockStats.volumeDelta > 0 ? '+' : ''}{blockStats.volumeDelta}% vs prev
              </p>
            )}
          </div>
          <div className="bg-grappler-900/60 border border-grappler-700/40 rounded-xl p-3 text-center">
            <Trophy className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
            <p className="text-lg font-black text-grappler-100">{blockStats.totalPRs}</p>
            <p className="text-xs text-grappler-400 uppercase">PRs Set</p>
          </div>
          <div className="bg-grappler-900/60 border border-grappler-700/40 rounded-xl p-3 text-center">
            <Flame className="w-4 h-4 text-orange-400 mx-auto mb-1" />
            <p className="text-lg font-black text-grappler-100">{blockStats.avgRPE}</p>
            <p className="text-xs text-grappler-400 uppercase">Avg RPE</p>
          </div>
          <div className="bg-grappler-900/60 border border-grappler-700/40 rounded-xl p-3 text-center">
            <Calendar className="w-4 h-4 text-blue-400 mx-auto mb-1" />
            <p className="text-lg font-black text-grappler-100">{hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ''}` : `${mins}m`}</p>
            <p className="text-xs text-grappler-400 uppercase">Time Trained</p>
          </div>
        </motion.div>

        {/* Today's session summary (compact) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.25 }}
          className="bg-grappler-900/40 border border-grappler-700/30 rounded-xl p-3 mb-3"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-grappler-400 font-bold uppercase tracking-wide">Final Session</span>
            <span className={cn(
              'text-xs font-black px-2 py-0.5 rounded-full',
              todayPerformance.grade === 'S' ? 'bg-yellow-500/15 text-yellow-400' :
              todayPerformance.grade === 'A' ? 'bg-green-500/15 text-green-400' :
              'bg-primary-500/15 text-primary-400'
            )}>
              {todayPerformance.grade}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-grappler-200 font-bold">{formatNumber(todayPerformance.totalVolume)} {weightUnit}</span>
            <span className="text-grappler-400">{todayPerformance.totalSets} sets</span>
            <span className="text-grappler-400">RPE {todayPerformance.avgRPE}</span>
          </div>
          {todayPerformance.prs > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Trophy className="w-3 h-3 text-yellow-400" />
              <span className="text-xs text-yellow-300">
                {todayPerformance.prs === 1
                  ? `PR: ${todayPerformance.prExercises[0]}`
                  : `${todayPerformance.prs} PRs: ${todayPerformance.prExercises.slice(0, 2).join(', ')}${todayPerformance.prs > 2 ? ` +${todayPerformance.prs - 2}` : ''}`}
              </span>
            </div>
          )}
        </motion.div>

        {/* Badges */}
        {lastCompletedWorkout?.newBadges && lastCompletedWorkout.newBadges.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.25 }}
            className="flex gap-1.5 mb-3 flex-wrap"
          >
            {lastCompletedWorkout.newBadges.map((badge, i) => (
              <span
                key={badge.id}
                className="text-xs px-2 py-1 rounded-full bg-purple-500/15 text-purple-300"
              >
                {badge.icon} {badge.name}
              </span>
            ))}
          </motion.div>
        )}

        {/* Block progress bar — 100% */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.25 }}
          className="mb-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-grappler-500">Block</span>
            <div className="flex-1 h-2 bg-grappler-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: '80%' }}
                animate={{ width: '100%' }}
                transition={{ delay: 0.8, duration: 0.6, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-primary-500 to-accent-400 rounded-full"
              />
            </div>
            <span className="text-xs text-primary-400 font-bold">{blockStats.sessionsCompleted}/{blockStats.sessionsCompleted}</span>
          </div>
        </motion.div>

        {/* Done button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.25 }}
          onClick={onDismiss}
          className="w-full py-3 text-sm font-bold text-primary-300 rounded-xl border border-primary-500/30 bg-primary-500/10 hover:bg-primary-500/20 transition-colors"
        >
          Done
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="zone2-recovery-perf"
      initial={{ opacity: 0, scale: 0.96, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/10 via-grappler-800 to-grappler-900 p-5 overflow-hidden"
    >
      {/* Header — celebrate, don't label */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.25 }}
        className="flex items-center gap-2 mb-1"
      >
        <Check className="w-4 h-4 text-green-400" />
        <span className="text-xs text-green-400/80 font-bold uppercase tracking-wide">Session Complete</span>
      </motion.div>

      {/* Grade stamp + verdict */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 mt-2 flex-1">
          <div className="relative flex items-center justify-center" style={{ width: 48, height: 48 }}>
            <motion.div
              initial={{ scale: 0, opacity: 0.6 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ delay: 0.15, duration: 0.6, ease: 'easeOut' }}
              className={cn('absolute w-12 h-12 rounded-full',
                todayPerformance.grade === 'S' ? 'bg-yellow-400/30' :
                todayPerformance.grade === 'A' ? 'bg-green-400/25' :
                'bg-primary-400/20'
              )}
            />
            <motion.span
              initial={{ scale: 3, opacity: 0, rotate: -12 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.12, type: 'spring', stiffness: 300, damping: 20 }}
              className={cn(
                'text-4xl font-black leading-none relative',
                todayPerformance.grade === 'S' ? 'text-yellow-400' :
                todayPerformance.grade === 'A' ? 'text-green-400' :
                todayPerformance.grade === 'B' ? 'text-primary-400' : 'text-grappler-400'
              )}
            >
              {todayPerformance.grade}
            </motion.span>
          </div>
          <motion.p
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="text-sm text-grappler-300 leading-snug flex-1"
          >
            {todayPerformance.verdict}
          </motion.p>
        </div>
        {lastCompletedWorkout && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={onShare}
            className="text-green-400 hover:text-green-300 p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-colors flex-shrink-0"
            title="Share workout"
          >
            {shareCopied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
          </motion.button>
        )}
      </div>

      {/* PR callout */}
      {todayPerformance.prs > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 25 }}
          className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 mb-3"
        >
          <Trophy className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          <p className="text-xs text-yellow-300 font-medium">
            {todayPerformance.prs === 1
              ? `PR: ${todayPerformance.prExercises[0]}`
              : `${todayPerformance.prs} PRs: ${todayPerformance.prExercises.slice(0, 2).join(', ')}${todayPerformance.prs > 2 ? ` +${todayPerformance.prs - 2}` : ''}`
            }
          </p>
        </motion.div>
      )}

      {/* Badges */}
      {lastCompletedWorkout?.newBadges && lastCompletedWorkout.newBadges.length > 0 && (
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {lastCompletedWorkout.newBadges.map((badge, i) => (
            <motion.span
              key={badge.id}
              initial={{ opacity: 0, y: 16, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.35 + i * 0.05, type: 'spring', stiffness: 250, damping: 20 }}
              className="text-xs px-2 py-1 rounded-full bg-purple-500/15 text-purple-300"
            >
              {badge.icon} {badge.name}
            </motion.span>
          ))}
        </div>
      )}

      {/* Performance metrics grid */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        className="grid grid-cols-3 gap-2 mb-3"
      >
        <div className="bg-grappler-800/60 rounded-xl p-2.5 text-center">
          <p className="text-lg font-black text-grappler-100">{formatNumber(todayPerformance.totalVolume)}</p>
          <p className="text-xs text-grappler-400 uppercase">{weightUnit}</p>
        </div>
        <div className="bg-grappler-800/60 rounded-xl p-2.5 text-center">
          <p className="text-lg font-black text-grappler-100">{todayPerformance.totalSets}</p>
          <p className="text-xs text-grappler-400 uppercase">Sets</p>
        </div>
        <div className="bg-grappler-800/60 rounded-xl p-2.5 text-center">
          <p className="text-lg font-black text-grappler-100">{todayPerformance.avgRPE > 0 ? todayPerformance.avgRPE : '—'}</p>
          <p className="text-xs text-grappler-400 uppercase">RPE</p>
        </div>
      </motion.div>

      {/* Nutrition nudge */}
      {postWorkoutNutritionNudge && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.25 }}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 mb-3',
            postWorkoutNutritionNudge.urgent ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-green-500/8 border border-green-500/15'
          )}
        >
          <Apple className="w-3.5 h-3.5 flex-shrink-0 text-green-400" />
          <p className={cn('text-xs', postWorkoutNutritionNudge.urgent ? 'text-orange-300' : 'text-green-400')}>
            {postWorkoutNutritionNudge.text}
          </p>
        </motion.div>
      )}

      {/* Mental check-in nudge */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.25 }}
        onClick={() => onNavigate('fighters_mind')}
        className="w-full flex items-center gap-2 rounded-lg px-3 py-2 mb-2 bg-violet-500/10 border border-violet-500/20 text-left hover:bg-violet-500/15 transition-colors"
      >
        <Brain className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
        <p className="text-xs text-violet-300">How&apos;s the mind? Log a deeper check-in</p>
        <ChevronRight className="w-3 h-3 text-violet-400/50 ml-auto flex-shrink-0" />
      </motion.button>

      {/* Forward look */}
      {forwardLook && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.25 }}
          className="flex items-center gap-2 pt-2 border-t border-grappler-700/40"
        >
          <ChevronRight className="w-3 h-3 text-grappler-600 flex-shrink-0" />
          <p className="text-xs text-grappler-400">{forwardLook}</p>
        </motion.div>
      )}

      {mesocycleProgress && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65, duration: 0.25 }}
          className="mt-3"
        >
          {(mesocycleProgress.isComplete || prevBlockJustCompleted) ? (
            <div className="bg-gradient-to-r from-primary-500/10 to-accent-500/10 border border-primary-500/20 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-primary-400" />
                <span className="text-sm font-black text-primary-300">Block Complete!</span>
              </div>
              <p className="text-xs text-grappler-400">
                All {mesocycleProgress.total} sessions{mesocycleProgress.blockName ? ` in ${mesocycleProgress.blockName}` : ''} done
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-grappler-500">Block</span>
                <div className="flex-1 h-1.5 bg-grappler-700 rounded-full overflow-hidden"><div className="h-full bg-primary-400/80 rounded-full" style={{ width: '100%' }} /></div>
                <span className="text-xs text-primary-400 font-bold">{mesocycleProgress.total}/{mesocycleProgress.total}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-grappler-500">Block</span>
              <div className="flex-1 h-1.5 bg-grappler-700 rounded-full overflow-hidden"><div className="h-full bg-green-500/60 rounded-full" style={{ width: `${mesocycleProgress.percent}%` }} /></div>
              <span className="text-xs text-grappler-400">{mesocycleProgress.completed}/{mesocycleProgress.total}</span>
            </div>
          )}
        </motion.div>
      )}

      {/* Contextual tool suggestions */}
      {lastCompletedWorkout && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.25 }}
          className="flex gap-2 mt-3 pt-3 border-t border-grappler-700/30 overflow-x-auto"
        >
          {(() => {
            const suggestions: { id: string; label: string; icon: React.ElementType; reason: string }[] = [];
            const log = lastCompletedWorkout.log;
            const streak = lastCompletedWorkout.newStreak;
            if (log.overallRPE >= 8) suggestions.push({ id: 'recovery', label: 'Recovery', icon: Shield, reason: 'Heavy session' });
            if (lastCompletedWorkout.hadPR) suggestions.push({ id: 'strength', label: 'Strength', icon: TrendingUp, reason: 'New PR' });
            if (streak >= 5) suggestions.push({ id: 'training_journal', label: 'Journal', icon: Calendar, reason: `${streak}d streak` });
            suggestions.push({ id: 'fighters_mind', label: 'Mind', icon: Brain, reason: 'Reflect' });
            return suggestions.slice(0, 3).map(s => (
              <button
                key={s.id}
                onClick={() => onNavigate(s.id as OverlayView)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-grappler-800/60 border border-grappler-700/30 hover:bg-grappler-800 transition-colors flex-shrink-0"
              >
                <s.icon className="w-3 h-3 text-grappler-400" />
                <span className="text-xs text-grappler-300">{s.label}</span>
                <span className="text-xs text-grappler-600">{s.reason}</span>
              </button>
            ));
          })()}
        </motion.div>
      )}

      {/* Done button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.75, duration: 0.25 }}
        onClick={onDismiss}
        className="w-full mt-3 py-2.5 text-sm font-medium text-grappler-400 hover:text-grappler-200 rounded-xl border border-grappler-700/30 hover:border-grappler-600/40 bg-grappler-800/30 hover:bg-grappler-800/50 transition-colors"
      >
        Done
      </motion.button>
    </motion.div>
  );
}
