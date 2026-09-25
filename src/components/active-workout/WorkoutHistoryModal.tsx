'use client';
/* Extracted verbatim from ActiveWorkout.tsx (showHistoryModal block) — no behavior change. */
import { motion } from 'framer-motion';
import { X, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExercisePrescription, WeightUnit } from '@/lib/types';

export interface WorkoutHistoryModalProps {
  setShowHistoryModal: (v: boolean) => void;
  currentExercise: ExercisePrescription;
  extendedHistory: { sessions: { weight: number; reps: number; rpe: number; sets: number; date: Date; estimated1RM: number; }[]; allTimeBest: { weight: number; reps: number; date: Date; estimated1RM: number; } | null; bestE1RM: number; };
  weightUnit: WeightUnit;
}

export default function WorkoutHistoryModal({ setShowHistoryModal, currentExercise, extendedHistory, weightUnit }: WorkoutHistoryModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      onClick={() => setShowHistoryModal(false)}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-grappler-900 rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-hidden"
      >
        {/* Handle bar */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1.5 bg-grappler-700 rounded-full" />
        </div>

        <div className="px-5 pb-8 overflow-y-auto max-h-[calc(85vh-3rem)]">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-grappler-50">{currentExercise.exercise.name}</h2>
              <p className="text-xs text-grappler-400">Exercise History</p>
            </div>
            <button
              onClick={() => setShowHistoryModal(false)}
              className="p-2 text-grappler-400 hover:text-grappler-200"
              aria-label="Close exercise history"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* All-Time Best Card */}
          {extendedHistory.allTimeBest && (
            <div className="bg-gradient-to-r from-yellow-500/20 to-blue-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-500/30 rounded-xl flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs text-yellow-400/80 uppercase tracking-wide">All-Time Best</p>
                  <p className="text-xl font-bold text-yellow-300">
                    {extendedHistory.allTimeBest.weight} {weightUnit} x {extendedHistory.allTimeBest.reps}
                  </p>
                  <p className="text-xs text-grappler-400">
                    Est. 1RM: {Math.round(extendedHistory.allTimeBest.estimated1RM)} {weightUnit} •{' '}
                    {extendedHistory.allTimeBest.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Progress Chart */}
          {extendedHistory.sessions.length >= 2 && (
            <div className="bg-grappler-800/50 rounded-xl p-4 mb-4">
              <p className="text-xs text-grappler-400 uppercase tracking-wide mb-3">Estimated 1RM Progression</p>
              <div className="h-32 flex items-end gap-1">
                {(() => {
                  const reversed = [...extendedHistory.sessions].reverse();
                  const maxE1RM = Math.max(...reversed.map(s => s.estimated1RM));
                  const minE1RM = Math.min(...reversed.map(s => s.estimated1RM));
                  const range = maxE1RM - minE1RM || 1;

                  return reversed.map((session, i) => {
                    const heightPct = ((session.estimated1RM - minE1RM) / range) * 70 + 30; // 30-100% height
                    const isLatest = i === reversed.length - 1;
                    const isPeak = session.estimated1RM === maxE1RM;

                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className={cn(
                            'w-full rounded-t-md transition-all',
                            isPeak ? 'bg-yellow-500' : isLatest ? 'bg-primary-500' : 'bg-grappler-600'
                          )}
                          style={{ height: `${heightPct}%` }}
                        />
                        <p className="text-xs text-grappler-400 truncate w-full text-center">
                          {session.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    );
                  });
                })()}
              </div>
              <div className="flex justify-between mt-2 text-xs text-grappler-400">
                <span>Oldest</span>
                <span>Most Recent</span>
              </div>
            </div>
          )}

          {/* Session List */}
          <div className="space-y-2">
            <p className="text-xs text-grappler-400 uppercase tracking-wide mb-2">
              Recent Sessions ({extendedHistory.sessions.length})
            </p>
            {extendedHistory.sessions.map((session, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg',
                  i === 0 ? 'bg-primary-500/10 border border-primary-500/30' : 'bg-grappler-800/50'
                )}
              >
                <div>
                  <p className={cn(
                    'text-sm font-medium',
                    i === 0 ? 'text-primary-300' : 'text-grappler-200'
                  )}>
                    {session.weight} {weightUnit} x {session.reps}
                  </p>
                  <p className="text-xs text-grappler-400">
                    {session.sets} sets @ RPE {session.rpe}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-grappler-400">
                    {session.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-grappler-400">
                    e1RM: {Math.round(session.estimated1RM)}
                  </p>
                </div>
              </div>
            ))}
            {extendedHistory.sessions.length === 0 && (
              <p className="text-sm text-grappler-500 text-center py-6">
                No history yet for this exercise
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
