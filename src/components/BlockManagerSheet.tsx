'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import {
  X, Check, Square, Play, Trash2, ChevronLeft, ChevronRight, Plus,
  Dumbbell, Clock, Activity, Star, BarChart3, Award, TrendingUp, Target, ListPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Mesocycle } from '@/lib/types';
import { generateMesocycleReport, formatVolume, formatDuration } from '@/lib/mesocycle-report';
import { useToast } from './Toast';

interface BlockManagerSheetProps {
  progress: { total: number; completed: number; percentage: number };
  onClose: () => void;
  onNewBlock: () => void;
  onBlockAction: (label: string) => void; // surfaces the parent's undo toast
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  completed: { label: 'Completed', cls: 'bg-green-500/15 text-green-400' },
  stopped: { label: 'Stopped', cls: 'bg-amber-500/15 text-amber-400' },
  active: { label: 'Active', cls: 'bg-primary-500/15 text-primary-300' },
  upcoming: { label: 'Upcoming', cls: 'bg-grappler-700 text-grappler-300' },
};

export default function BlockManagerSheet({ progress, onClose, onNewBlock, onBlockAction }: BlockManagerSheetProps) {
  const {
    currentMesocycle, rawMesocycleHistory, mesocycleQueue, rawWorkoutLogs, user, activeWorkout,
    completeMesocycle, stopMesocycle, advanceMesocycleQueue, switchToQueuedBlock,
    removeFromMesocycleQueue, deleteMesocycle,
  } = useAppStore(
    // Stable references only — a .filter() inside the selector defeats useShallow
    // and re-renders the open sheet on every store update
    useShallow(s => ({
      currentMesocycle: s.currentMesocycle,
      rawMesocycleHistory: s.mesocycleHistory,
      mesocycleQueue: s.mesocycleQueue,
      rawWorkoutLogs: s.workoutLogs,
      user: s.user,
      activeWorkout: s.activeWorkout,
      completeMesocycle: s.completeMesocycle,
      stopMesocycle: s.stopMesocycle,
      advanceMesocycleQueue: s.advanceMesocycleQueue,
      switchToQueuedBlock: s.switchToQueuedBlock,
      removeFromMesocycleQueue: s.removeFromMesocycleQueue,
      deleteMesocycle: s.deleteMesocycle,
    }))
  );
  const { showToast } = useToast();

  const workoutLogs = useMemo(
    () => rawWorkoutLogs.filter(l => !l._deleted),
    [rawWorkoutLogs]
  );

  const [viewingBlock, setViewingBlock] = useState<Mesocycle | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Backdrop onKeyDown only fires when focus is inside the sheet — a document
  // listener makes Escape work no matter where focus sits
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (viewingBlock) {
        setViewingBlock(null);
        setConfirmDelete(false);
      } else {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [viewingBlock, onClose]);

  // Newest first — the block you just finished is the one you want to see
  const sortedHistory = useMemo(
    () => rawMesocycleHistory.filter(m => !m._deleted)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [rawMesocycleHistory]
  );

  // Archiving the block out from under a live workout skews its report
  // (the eventual log lands on an already-archived block) — same guard
  // pattern startWorkout uses for double-starting
  const guardActiveWorkout = () => {
    if (activeWorkout) {
      showToast('Finish your current workout first', 'warning');
      return true;
    }
    return false;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Manage blocks"
      onKeyDown={e => { if (e.key === 'Escape') { if (viewingBlock) { setViewingBlock(null); setConfirmDelete(false); } else onClose(); } }}
    >
      <div className="w-full max-w-lg max-h-[88dvh] overflow-y-auto rounded-t-2xl bg-grappler-900 border-t border-grappler-700 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-grappler-900 px-4 pt-3 pb-2 border-b border-grappler-800">
          <div className="w-10 h-1 bg-grappler-700 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between gap-3">
            {viewingBlock ? (
              <button
                onClick={() => { setViewingBlock(null); setConfirmDelete(false); }}
                className="flex items-center gap-1 text-sm font-semibold text-grappler-300 hover:text-grappler-100"
                data-tight
              >
                <ChevronLeft className="w-4 h-4" />
                Blocks
              </button>
            ) : (
              <h2 className="text-lg font-bold text-grappler-50">Blocks</h2>
            )}
            <button
              onClick={onClose}
              aria-label="Close block manager"
              className="w-8 h-8 rounded-full bg-grappler-800 flex items-center justify-center text-grappler-400 hover:text-grappler-200 flex-shrink-0"
              data-tight
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {viewingBlock ? (
          <BlockReport
            block={viewingBlock}
            history={sortedHistory}
            workoutLogs={workoutLogs}
            weightUnit={user?.weightUnit === 'kg' ? 'kg' : 'lbs'}
            confirmDelete={confirmDelete}
            onRequestDelete={() => setConfirmDelete(true)}
            onCancelDelete={() => setConfirmDelete(false)}
            onConfirmDelete={() => {
              deleteMesocycle(viewingBlock.id);
              setViewingBlock(null);
              setConfirmDelete(false);
              onBlockAction('Block deleted');
            }}
          />
        ) : (
          <div className="p-4 space-y-5">
            {/* Current block */}
            <section>
              <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wider mb-2 px-1">Current</h3>
              {currentMesocycle ? (
                <div className="card p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-grappler-50 truncate">{currentMesocycle.name}</p>
                      <p className="text-xs text-grappler-400 capitalize">
                        {currentMesocycle.goalFocus.replace(/_/g, ' ')} · {currentMesocycle.weeks.length}w · {progress.completed}/{progress.total} sessions
                      </p>
                    </div>
                    <span className="text-sm font-black text-grappler-100 flex-shrink-0">{progress.percentage}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-grappler-700 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', progress.percentage >= 100 ? 'bg-green-500' : 'bg-primary-500')}
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { if (guardActiveWorkout()) return; completeMesocycle(); onBlockAction('Block completed'); }}
                      className="btn btn-primary btn-sm flex-1 gap-1.5 font-semibold"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Complete
                    </button>
                    <button
                      onClick={() => { if (guardActiveWorkout()) return; stopMesocycle(); onBlockAction('Block stopped'); }}
                      className="btn btn-sm flex-1 gap-1.5 font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/25"
                    >
                      <Square className="w-3.5 h-3.5" />
                      Stop early
                    </button>
                  </div>
                  <p className="text-[11px] text-grappler-500 text-center">
                    Complete counts as finished (+200 XP once a workout is logged). Both are undoable — your logs always stay.
                  </p>
                </div>
              ) : (
                <button onClick={onNewBlock} className="card p-4 w-full flex items-center justify-between text-left hover:bg-grappler-800/70 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-grappler-100">No active block</p>
                    <p className="text-xs text-grappler-400">Build one in under 10 seconds</p>
                  </div>
                  <Plus className="w-5 h-5 text-primary-400" />
                </button>
              )}
            </section>

            {/* Queue */}
            <section>
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wider">Up next</h3>
                <button onClick={onNewBlock} className="flex items-center gap-1 text-xs font-semibold text-primary-400 hover:text-primary-300" data-tight>
                  <ListPlus className="w-3.5 h-3.5" />
                  Plan a block
                </button>
              </div>
              {mesocycleQueue.length === 0 ? (
                <p className="text-xs text-grappler-500 px-1">Nothing queued. Plan your next block and it starts the moment this one ends.</p>
              ) : (
                <div className="space-y-2">
                  {mesocycleQueue.map((planned, i) => (
                    <div key={planned.id} className="card p-3 flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-grappler-800 text-grappler-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-grappler-100 truncate">{planned.name}</p>
                        <p className="text-xs text-grappler-400 capitalize">
                          {planned.weeks}w · {planned.focus.replace(/_/g, ' ')}
                          {planned.sessionsPerWeek ? ` · ${planned.sessionsPerWeek}×/wk` : ''}
                        </p>
                      </div>
                      {i === 0 && (
                        <button
                          onClick={() => {
                            if (guardActiveWorkout()) return;
                            if (currentMesocycle) {
                              switchToQueuedBlock();
                              onBlockAction('Switched block');
                            } else {
                              advanceMesocycleQueue();
                              onBlockAction('Queued block started');
                            }
                          }}
                          className="btn btn-secondary btn-sm gap-1 flex-shrink-0"
                          title={currentMesocycle ? 'Stop current block and start this one' : 'Start this block'}
                        >
                          <Play className="w-3.5 h-3.5" />
                          {currentMesocycle ? 'Switch' : 'Start'}
                        </button>
                      )}
                      <button
                        onClick={() => removeFromMesocycleQueue(planned.id)}
                        aria-label={`Remove ${planned.name} from queue`}
                        className="w-10 h-10 rounded-lg text-grappler-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* History */}
            <section>
              <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wider mb-2 px-1">Past blocks</h3>
              {sortedHistory.length === 0 ? (
                <p className="text-xs text-grappler-500 px-1">Finished blocks land here with a full report.</p>
              ) : (
                <div className="space-y-2">
                  {sortedHistory.map(block => {
                    const badge = STATUS_BADGE[block.status] || STATUS_BADGE.completed;
                    const totalSessions = block.weeks.reduce((s, w) => s + w.sessions.length, 0);
                    return (
                      <button
                        key={block.id}
                        onClick={() => setViewingBlock(block)}
                        className="card p-3 w-full flex items-center gap-3 text-left hover:bg-grappler-800/70 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-grappler-100 truncate">{block.name}</p>
                          <p className="text-xs text-grappler-400 capitalize">
                            {block.goalFocus.replace(/_/g, ' ')} · {block.weeks.length}w · {totalSessions} sessions
                          </p>
                        </div>
                        <span className={cn('text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0', badge.cls)}>
                          {badge.label}
                        </span>
                        <ChevronRight className="w-4 h-4 text-grappler-500 flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// --- Block report (end-of-block summary, shown inside the sheet) ---

interface BlockReportProps {
  block: Mesocycle;
  history: Mesocycle[];
  workoutLogs: ReturnType<typeof useAppStore.getState>['workoutLogs'];
  weightUnit: 'kg' | 'lbs';
  confirmDelete: boolean;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}

function BlockReport({ block, history, workoutLogs, weightUnit, confirmDelete, onRequestDelete, onCancelDelete, onConfirmDelete }: BlockReportProps) {
  // The report makes a full pass over every workout log — compute once per
  // (block, logs) pair, not on every render of the open sheet
  const { blockLogs, report } = useMemo(() => {
    const logs = workoutLogs
      .filter(l => l.mesocycleId === block.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    // history is newest-first; "previous" block = the next-older one
    const historyIndex = history.findIndex(m => m.id === block.id);
    const prevMeso = historyIndex >= 0 && historyIndex < history.length - 1 ? history[historyIndex + 1] : null;
    return {
      blockLogs: logs,
      report: generateMesocycleReport(block, workoutLogs, prevMeso, prevMeso ? workoutLogs : undefined),
    };
  }, [block, history, workoutLogs]);
  const badge = STATUS_BADGE[block.status] || STATUS_BADGE.completed;

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-grappler-100 truncate">{block.name}</h3>
          <p className="text-xs text-grappler-400 capitalize">
            {block.goalFocus.replace(/_/g, ' ')} focus · {block.weeks.length}w · {block.weeks.reduce((s, w) => s + w.sessions.length, 0)} sessions
          </p>
        </div>
        <span className={cn('text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0', badge.cls)}>
          {badge.label}
        </span>
      </div>

      {/* Completion banner */}
      <div className={cn(
        'rounded-xl p-3 text-center',
        report.completionRate >= 90
          ? 'bg-green-500/10 border border-green-500/20'
          : report.completionRate >= 70
            ? 'bg-yellow-500/10 border border-yellow-500/20'
            : report.completionRate > 0
              ? 'bg-grappler-800/50 border border-grappler-700'
              : 'bg-grappler-800/30 border border-grappler-800'
      )}>
        <div className="text-2xl font-black text-grappler-100">{report.completionRate}%</div>
        <p className="text-xs text-grappler-400">
          {report.workoutsCompleted} of {report.workoutsPlanned} sessions completed
        </p>
        {report.workoutsPlanned > 0 && (
          <div className="w-full h-1.5 bg-grappler-700 rounded-full mt-2 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                report.completionRate >= 90 ? 'bg-green-500' : report.completionRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              style={{ width: `${report.completionRate}%` }}
            />
          </div>
        )}
      </div>

      {/* Summary stats grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-grappler-800 rounded-lg p-3 text-center">
          <Dumbbell className="w-3.5 h-3.5 mx-auto mb-0.5 text-primary-400" />
          <p className="text-lg font-bold text-grappler-100">{formatVolume(report.totalVolume)}</p>
          <p className="text-xs text-grappler-400">Volume ({weightUnit})</p>
        </div>
        <div className="bg-grappler-800 rounded-lg p-3 text-center">
          <Activity className="w-3.5 h-3.5 mx-auto mb-0.5 text-blue-400" />
          <p className="text-lg font-bold text-grappler-100">{report.avgRPE || '—'}</p>
          <p className="text-xs text-grappler-400">Avg RPE</p>
        </div>
        <div className="bg-grappler-800 rounded-lg p-3 text-center">
          <Star className="w-3.5 h-3.5 mx-auto mb-0.5 text-yellow-400" />
          <p className="text-lg font-bold text-grappler-100">{report.totalPRs}</p>
          <p className="text-xs text-grappler-400">PRs Hit</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-grappler-800 rounded-lg p-3 text-center">
          <Clock className="w-3.5 h-3.5 mx-auto mb-0.5 text-sky-400" />
          <p className="text-lg font-bold text-grappler-100">{formatDuration(report.totalDuration)}</p>
          <p className="text-xs text-grappler-400">Total Time</p>
        </div>
        <div className="bg-grappler-800 rounded-lg p-3 text-center">
          <BarChart3 className="w-3.5 h-3.5 mx-auto mb-0.5 text-accent-400" />
          <p className="text-lg font-bold text-grappler-100">{formatVolume(report.avgVolumePerSession)}</p>
          <p className="text-xs text-grappler-400">Vol/Session</p>
        </div>
        <div className="bg-grappler-800 rounded-lg p-3 text-center">
          <Clock className="w-3.5 h-3.5 mx-auto mb-0.5 text-emerald-400" />
          <p className="text-lg font-bold text-grappler-100">{report.avgDuration}m</p>
          <p className="text-xs text-grappler-400">Avg Duration</p>
        </div>
      </div>

      {/* PR exercises */}
      {report.prExercises.length > 0 && (
        <div className="bg-grappler-800/50 rounded-xl p-3">
          <h4 className="text-xs font-semibold text-grappler-300 flex items-center gap-1.5 mb-2">
            <Award className="w-3.5 h-3.5 text-yellow-400" />
            Personal Records
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {report.prExercises.map(name => (
              <span key={name} className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 text-xs rounded-full border border-yellow-500/20">
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Volume by week bars */}
      {report.volumeByWeek.some(v => v > 0) && (
        <div className="bg-grappler-800/50 rounded-xl p-3">
          <h4 className="text-xs font-semibold text-grappler-300 flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-primary-400" />
            Volume by Week
          </h4>
          <div className="space-y-1.5">
            {report.weekSummaries.map((week, i) => {
              const maxWeekVol = Math.max(...report.volumeByWeek, 1);
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className={cn('text-xs w-8 text-right shrink-0', week.isDeload ? 'text-teal-400' : 'text-grappler-400')}>
                    {week.isDeload ? 'DL' : `W${week.weekNumber}`}
                  </span>
                  <div className="flex-1 h-4 bg-grappler-800 rounded-full overflow-hidden relative">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        week.isDeload ? 'bg-teal-500/60' : 'bg-gradient-to-r from-primary-500 to-accent-500'
                      )}
                      style={{ width: `${maxWeekVol > 0 ? (report.volumeByWeek[i] / maxWeekVol) * 100 : 0}%` }}
                    />
                    {report.volumeByWeek[i] > 0 && (
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-grappler-200">
                        {formatVolume(report.volumeByWeek[i])}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-grappler-500 w-8 text-right">
                    {week.workoutsCompleted}/{week.workoutsPlanned}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top exercises */}
      {report.topExercisesByVolume.length > 0 && (
        <div className="bg-grappler-800/50 rounded-xl p-3">
          <h4 className="text-xs font-semibold text-grappler-300 flex items-center gap-1.5 mb-2">
            <Target className="w-3.5 h-3.5 text-accent-400" />
            Top Exercises
          </h4>
          <div className="space-y-2">
            {report.topExercisesByVolume.slice(0, 5).map((ex, i) => (
              <div key={ex.exerciseId} className="flex items-center gap-2">
                <span className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                  i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                  i === 1 ? 'bg-grappler-400/20 text-grappler-300' :
                  i === 2 ? 'bg-blue-500/20 text-blue-400' :
                  'bg-grappler-700/50 text-grappler-500'
                )}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-grappler-200 truncate flex items-center gap-1">
                    {ex.exerciseName}
                    {ex.hadPR && <Star className="w-2.5 h-2.5 text-yellow-400 shrink-0" />}
                  </p>
                  <p className="text-[10px] text-grappler-500">
                    {ex.totalSets} sets · {formatVolume(ex.totalVolume)} {weightUnit} · Best: {ex.bestWeight}{weightUnit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-week breakdown */}
      {[...block.weeks]
        .sort((a, b) => a.weekNumber - b.weekNumber)
        .map(week => {
          const weekLogs = blockLogs.filter(l => {
            if (l.weekNumber != null) return l.weekNumber === week.weekNumber;
            return week.sessions.some(s => s.id === l.sessionId);
          });
          return (
            <div key={week.weekNumber} className="bg-grappler-800/50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className={cn('text-sm font-semibold', week.isDeload ? 'text-teal-400' : 'text-grappler-200')}>
                  Week {week.weekNumber} {week.isDeload ? '(Deload)' : ''}
                </span>
                <span className="text-xs text-grappler-400">{weekLogs.length}/{week.sessions.length} done</span>
              </div>
              {weekLogs.length > 0 ? (
                <div className="space-y-1.5">
                  {weekLogs.map(log => (
                    <div key={log.id} className="flex items-center justify-between text-xs">
                      <span className="text-grappler-300">
                        {new Date(log.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      <div className="flex items-center gap-3 text-grappler-400">
                        <span>{log.totalVolume >= 1000 ? `${(log.totalVolume / 1000).toFixed(1)}k` : log.totalVolume} {weightUnit}</span>
                        <span>RPE {log.overallRPE}</span>
                        <span>{log.duration}m</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-grappler-500 italic">No sessions logged</p>
              )}
            </div>
          );
        })}

      {blockLogs.length === 0 && (
        <p className="text-sm text-grappler-400 text-center py-4">No workout data for this block</p>
      )}

      {/* Comparison to previous block */}
      {report.comparison && (
        <div className="bg-grappler-800/50 rounded-xl p-3">
          <h4 className="text-xs font-semibold text-grappler-300 mb-2">
            vs {report.comparison.prevName}
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-grappler-800/60 rounded-lg p-2 text-center">
              <p className="text-[10px] text-grappler-500">Volume</p>
              <p className={cn('text-xs font-medium', report.comparison.volumeDeltaPct > 0 ? 'text-green-400' : report.comparison.volumeDeltaPct < 0 ? 'text-red-400' : 'text-grappler-400')}>
                {report.comparison.volumeDeltaPct > 0 ? '+' : ''}{report.comparison.volumeDeltaPct}%
              </p>
            </div>
            <div className="bg-grappler-800/60 rounded-lg p-2 text-center">
              <p className="text-[10px] text-grappler-500">RPE</p>
              <p className={cn('text-xs font-medium', report.comparison.rpeDelta < 0 ? 'text-green-400' : report.comparison.rpeDelta > 0 ? 'text-red-400' : 'text-grappler-400')}>
                {report.comparison.rpeDelta > 0 ? '+' : ''}{report.comparison.rpeDelta}
              </p>
            </div>
            <div className="bg-grappler-800/60 rounded-lg p-2 text-center">
              <p className="text-[10px] text-grappler-500">Sessions</p>
              <p className={cn('text-xs font-medium', report.comparison.sessionsDelta > 0 ? 'text-green-400' : report.comparison.sessionsDelta < 0 ? 'text-red-400' : 'text-grappler-400')}>
                {report.comparison.sessionsDelta > 0 ? '+' : ''}{report.comparison.sessionsDelta}
              </p>
            </div>
            <div className="bg-grappler-800/60 rounded-lg p-2 text-center">
              <p className="text-[10px] text-grappler-500">PRs</p>
              <p className={cn('text-xs font-medium', report.comparison.prsDelta > 0 ? 'text-green-400' : report.comparison.prsDelta < 0 ? 'text-red-400' : 'text-grappler-400')}>
                {report.comparison.prsDelta > 0 ? '+' : ''}{report.comparison.prsDelta}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Delete — permanent, so this one keeps a confirm step */}
      {confirmDelete ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 space-y-2">
          <p className="text-xs text-grappler-300">
            Permanently delete <span className="font-semibold text-grappler-100">{block.name}</span> and all its workout logs?
          </p>
          <div className="flex gap-2">
            <button onClick={onCancelDelete} className="btn btn-secondary btn-sm flex-1">Cancel</button>
            <button onClick={onConfirmDelete} className="btn btn-sm flex-1 bg-red-600 text-white hover:bg-red-500">Delete</button>
          </div>
        </div>
      ) : (
        <button
          onClick={onRequestDelete}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-grappler-500 hover:text-red-400"
          data-tight
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete this block
        </button>
      )}
    </div>
  );
}
