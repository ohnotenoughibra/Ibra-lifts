'use client';

import { motion } from 'framer-motion';
import {
  Check, Share2, Trophy,
  TrendingUp, Flame, Dumbbell, Calendar, BarChart3, Zap,
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
    duration?: number;
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
  mesocycleProgress: { total: number; completed: number; percent: number; blockName?: string; isComplete?: boolean } | null;
  weightUnit: string;
  shareCopied: boolean;
  onShare: () => void;
  onDismiss: () => void;
  onNavigate: (view: OverlayView, context?: string) => void;
  onViewReport?: (mesoId: string) => void;
  onGenerateNext?: () => void;
  prevBlockJustCompleted?: boolean;
  blockCompleteStats?: {
    mesoId: string;
    totalVolume: number;
    totalPRs: number;
    avgRPE: number;
    totalDuration: number;
    sessionsCompleted: number;
    totalPlanned: number;
    completionRate: number;
    mesoName: string;
    volumeDelta: number | null;
    comparisonName: string | null;
    strengthGains: { name: string; current: number; prev: number; delta: number }[];
  } | null;
}

export default function PostWorkoutPhase({
  todayPerformance,
  lastCompletedWorkout,
  mesocycleProgress,
  weightUnit,
  shareCopied,
  onShare,
  onDismiss,
  onNavigate,
  onViewReport,
  onGenerateNext,
  prevBlockJustCompleted,
  blockCompleteStats,
}: PostWorkoutPhaseProps) {
  const isMesoComplete = prevBlockJustCompleted || lastCompletedWorkout?.isMesocycleComplete;
  const blockStats = blockCompleteStats;

  // ─── Block Complete Card ───
  if (isMesoComplete && blockStats) {
    const hours = Math.floor(blockStats.totalDuration / 60);
    const mins = blockStats.totalDuration % 60;
    const durationStr = hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ''}` : `${mins}m`;

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
            {blockStats.mesoName}
          </motion.h3>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.25 }}
            className="text-sm text-grappler-400 mt-1"
          >
            {blockStats.completionRate === 100
              ? <>All {blockStats.sessionsCompleted} sessions — <span className="text-green-400 font-bold">100% complete</span></>
              : <>{blockStats.sessionsCompleted}/{blockStats.totalPlanned} sessions — <span className="text-primary-300 font-bold">{blockStats.completionRate}% complete</span></>
            }
          </motion.p>
        </motion.div>

        {/* Block headline stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="grid grid-cols-4 gap-1.5 mb-3"
        >
          <div className="bg-grappler-900/60 border border-grappler-700/40 rounded-xl p-2.5 text-center">
            <Dumbbell className="w-3.5 h-3.5 text-primary-400 mx-auto mb-0.5" />
            <p className="text-base font-black text-grappler-100">{formatNumber(blockStats.totalVolume)}</p>
            <p className="text-[10px] text-grappler-500 uppercase">{weightUnit}</p>
          </div>
          <div className="bg-grappler-900/60 border border-grappler-700/40 rounded-xl p-2.5 text-center">
            <Trophy className="w-3.5 h-3.5 text-yellow-400 mx-auto mb-0.5" />
            <p className="text-base font-black text-grappler-100">{blockStats.totalPRs}</p>
            <p className="text-[10px] text-grappler-500 uppercase">PRs</p>
          </div>
          <div className="bg-grappler-900/60 border border-grappler-700/40 rounded-xl p-2.5 text-center">
            <Flame className="w-3.5 h-3.5 text-orange-400 mx-auto mb-0.5" />
            <p className="text-base font-black text-grappler-100">{blockStats.avgRPE}</p>
            <p className="text-[10px] text-grappler-500 uppercase">RPE</p>
          </div>
          <div className="bg-grappler-900/60 border border-grappler-700/40 rounded-xl p-2.5 text-center">
            <Calendar className="w-3.5 h-3.5 text-blue-400 mx-auto mb-0.5" />
            <p className="text-base font-black text-grappler-100">{durationStr}</p>
            <p className="text-[10px] text-grappler-500 uppercase">Time</p>
          </div>
        </motion.div>

        {/* Strength gains (vs previous block) */}
        {blockStats.strengthGains.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.25 }}
            className="bg-grappler-900/40 border border-grappler-700/30 rounded-xl p-3 mb-3"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs font-bold text-grappler-300 uppercase tracking-wide">
                Strength vs {blockStats.comparisonName || 'Previous'}
              </span>
            </div>
            <div className="space-y-1.5">
              {blockStats.strengthGains.map((gain, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-grappler-200 truncate flex-1 mr-2">{gain.name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-grappler-500">{gain.prev} →</span>
                    <span className="text-sm font-bold text-grappler-100">{gain.current}</span>
                    <span className={cn(
                      'text-xs font-bold px-1.5 py-0.5 rounded-full',
                      gain.delta > 0 ? 'bg-green-500/15 text-green-400' :
                      gain.delta < 0 ? 'bg-red-500/15 text-red-400' :
                      'bg-grappler-700/50 text-grappler-400'
                    )}>
                      {gain.delta > 0 ? '+' : ''}{gain.delta}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-grappler-600 mt-1.5">Estimated 1RM ({weightUnit})</p>
          </motion.div>
        )}

        {/* Volume vs previous block */}
        {blockStats.volumeDelta !== null && blockStats.comparisonName && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.25 }}
            className="flex items-center justify-between bg-grappler-900/30 border border-grappler-700/20 rounded-lg px-3 py-2 mb-3"
          >
            <span className="text-xs text-grappler-400">Avg volume/session vs {blockStats.comparisonName}</span>
            <span className={cn(
              'text-sm font-black',
              blockStats.volumeDelta > 0 ? 'text-green-400' : blockStats.volumeDelta < 0 ? 'text-red-400' : 'text-grappler-400'
            )}>
              {blockStats.volumeDelta > 0 ? '+' : ''}{blockStats.volumeDelta}%
            </span>
          </motion.div>
        )}

        {/* Today's final session (compact) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.25 }}
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
            transition={{ delay: 0.65, duration: 0.25 }}
            className="flex gap-1.5 mb-3 flex-wrap"
          >
            {lastCompletedWorkout.newBadges.map((badge) => (
              <span
                key={badge.id}
                className="text-xs px-2 py-1 rounded-full bg-purple-500/15 text-purple-300"
              >
                {badge.icon} {badge.name}
              </span>
            ))}
          </motion.div>
        )}

        {/* CTAs: Full Report + Start Next */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.25 }}
          className="flex items-center gap-2"
        >
          {onViewReport && (
            <button
              onClick={() => { onDismiss(); onViewReport(blockStats.mesoId); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold text-grappler-200 rounded-xl border border-grappler-600/40 bg-grappler-800/50 hover:bg-grappler-700/60 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              Full Report
            </button>
          )}
          {onGenerateNext && (
            <button
              onClick={() => { onDismiss(); onGenerateNext(); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold text-primary-300 rounded-xl border border-primary-500/30 bg-primary-500/10 hover:bg-primary-500/20 transition-colors"
            >
              <Zap className="w-4 h-4" />
              Next Block
            </button>
          )}
        </motion.div>
      </motion.div>
    );
  }

  // ─── Session Complete Card ───
  const duration = todayPerformance.duration || lastCompletedWorkout?.log.duration || 0;
  const durationMin = Math.round(duration);

  return (
    <motion.div
      key="zone2-recovery-perf"
      initial={{ opacity: 0, scale: 0.96, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/10 via-grappler-800 to-grappler-900 p-5 overflow-hidden"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.25 }}
        className="flex items-center justify-between mb-1"
      >
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-green-400" />
          <span className="text-xs text-green-400/80 font-bold uppercase tracking-wide">Session Complete</span>
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
      </motion.div>

      {/* Grade stamp + verdict */}
      <div className="flex items-center gap-3 mb-3 mt-2">
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

      {/* Performance metrics */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        className={cn('grid gap-2 mb-3', durationMin > 0 ? 'grid-cols-4' : 'grid-cols-3')}
      >
        <div className="bg-grappler-800/60 rounded-xl p-2.5 text-center">
          <p className="text-lg font-black text-grappler-100">{formatNumber(todayPerformance.totalVolume)}</p>
          <p className="text-[10px] text-grappler-500 uppercase">{weightUnit}</p>
        </div>
        <div className="bg-grappler-800/60 rounded-xl p-2.5 text-center">
          <p className="text-lg font-black text-grappler-100">{todayPerformance.totalSets}</p>
          <p className="text-[10px] text-grappler-500 uppercase">Sets</p>
        </div>
        <div className="bg-grappler-800/60 rounded-xl p-2.5 text-center">
          <p className="text-lg font-black text-grappler-100">{todayPerformance.avgRPE > 0 ? todayPerformance.avgRPE : '—'}</p>
          <p className="text-[10px] text-grappler-500 uppercase">RPE</p>
        </div>
        {durationMin > 0 && (
          <div className="bg-grappler-800/60 rounded-xl p-2.5 text-center">
            <p className="text-lg font-black text-grappler-100">{durationMin}</p>
            <p className="text-[10px] text-grappler-500 uppercase">Min</p>
          </div>
        )}
      </motion.div>

      {/* Block progress */}
      {mesocycleProgress && !mesocycleProgress.isComplete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.25 }}
          className="mb-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-grappler-500">Block</span>
            <div className="flex-1 h-1.5 bg-grappler-700 rounded-full overflow-hidden">
              <div className="h-full bg-green-500/60 rounded-full" style={{ width: `${mesocycleProgress.percent}%` }} />
            </div>
            <span className="text-xs text-grappler-400">{mesocycleProgress.completed}/{mesocycleProgress.total}</span>
          </div>
        </motion.div>
      )}

      {/* Done button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.25 }}
        onClick={onDismiss}
        className="w-full py-2.5 text-sm font-medium text-grappler-400 hover:text-grappler-200 rounded-xl border border-grappler-700/30 hover:border-grappler-600/40 bg-grappler-800/30 hover:bg-grappler-800/50 transition-colors"
      >
        Done
      </motion.button>
    </motion.div>
  );
}
