'use client';
/* Extracted verbatim from ActiveWorkout.tsx (showVolumeGapPrompt block) — no behavior change. */
import type * as React from 'react';
import { motion } from 'framer-motion';
import { Check, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exercises as exerciseLibrary } from '@/lib/exercises';
import type { MuscleGroup, Exercise, WorkoutSession, ExerciseLog, PreWorkoutCheckIn } from '@/lib/types';
import type { ActiveWorkoutThrottle } from '@/lib/store';

export interface VolumeGapPromptProps {
  postWorkoutVolumeGaps: { muscle: MuscleGroup; deficit: number; currentSets: number; mev: number; recommendedExercise: string | null; }[];
  selectedVolumeGaps: Set<string>;
  setSelectedVolumeGaps: React.Dispatch<React.SetStateAction<Set<string>>>;
  setShowVolumeGapPrompt: React.Dispatch<React.SetStateAction<boolean>>;
  setVolumeGapDismissed: React.Dispatch<React.SetStateAction<boolean>>;
  setShowFinishModal: (v: boolean) => void;
  addBonusExercise: (exercise: Exercise, sets: number, reps: number) => void;
  /** Always set here — ActiveWorkout returns early without one. */
  activeWorkout: NonNullable<{ session: WorkoutSession; baseSession: WorkoutSession; exerciseLogs: ExerciseLog[]; startTime: Date; mesocycleId: string; weekNumber?: number | undefined; dayNumber?: number | undefined; preCheckIn?: PreWorkoutCheckIn | undefined; pausedAt?: Date | undefined; totalPausedMs?: number | undefined; throttle?: ActiveWorkoutThrottle | undefined; overviewDone?: boolean | undefined; position?: { exerciseIndex: number; setIndex: number; } | undefined; swapUndo?: { session: WorkoutSession; exerciseLogs: ExerciseLog[]; } | undefined; matAdjust?: { kind: "taper" | "mat"; reason: string; summary: string; original: WorkoutSession; undone?: boolean | undefined; } | undefined; } | null>;
  setCurrentExerciseIndex: React.Dispatch<React.SetStateAction<number>>;
  setCurrentSetIndex: React.Dispatch<React.SetStateAction<number>>;
}

export default function VolumeGapPrompt({ postWorkoutVolumeGaps, selectedVolumeGaps, setSelectedVolumeGaps, setShowVolumeGapPrompt, setVolumeGapDismissed, setShowFinishModal, addBonusExercise, activeWorkout, setCurrentExerciseIndex, setCurrentSetIndex }: VolumeGapPromptProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="card p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center gap-2 mb-1">
          <Dumbbell className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-grappler-50">Add a finisher</h2>
        </div>
        <p className="text-sm text-grappler-400 mb-4">
          {postWorkoutVolumeGaps.length} muscle group{postWorkoutVolumeGaps.length !== 1 ? 's' : ''} still below minimum effective volume this week.
        </p>

        <div className="space-y-2 mb-5">
          {postWorkoutVolumeGaps.slice(0, 5).map((gap) => {
            const exercise = gap.recommendedExercise
              ? exerciseLibrary.find(e => e.name === gap.recommendedExercise)
              : null;
            const setsNeeded = Math.min(gap.deficit, 3);
            const checked = selectedVolumeGaps.has(gap.muscle);
            const selectable = !!exercise;
            return (
              <button
                type="button"
                key={gap.muscle}
                disabled={!selectable}
                onClick={() => {
                  if (!selectable) return;
                  setSelectedVolumeGaps(prev => {
                    const next = new Set(prev);
                    if (next.has(gap.muscle)) next.delete(gap.muscle);
                    else next.add(gap.muscle);
                    return next;
                  });
                }}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                  checked
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-grappler-700 bg-grappler-800/50 hover:border-grappler-600',
                  !selectable && 'opacity-50 cursor-not-allowed',
                )}
              >
                <div className={cn(
                  'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                  checked
                    ? 'bg-primary-500 border-primary-500'
                    : 'border-grappler-600',
                )}>
                  {checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-grappler-100 capitalize">
                    {gap.muscle}
                    <span className="ml-2 text-xs font-normal text-amber-400">
                      {gap.currentSets}/{gap.mev} sets
                    </span>
                  </p>
                  {gap.recommendedExercise && (
                    <p className="text-xs text-grappler-400 truncate mt-0.5">
                      {gap.recommendedExercise} · {setsNeeded} sets × 10-12 reps
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {postWorkoutVolumeGaps.length > 5 && (
          <p className="text-xs text-grappler-500 mb-4 text-center">
            +{postWorkoutVolumeGaps.length - 5} more below MEV
          </p>
        )}

        {/* Quick select-all / clear */}
        {(() => {
          const selectableGaps = postWorkoutVolumeGaps.slice(0, 5).filter(g => g.recommendedExercise);
          const allSelected = selectableGaps.length > 0 && selectableGaps.every(g => selectedVolumeGaps.has(g.muscle));
          return selectableGaps.length > 1 ? (
            <button
              onClick={() => {
                if (allSelected) {
                  setSelectedVolumeGaps(new Set());
                } else {
                  setSelectedVolumeGaps(new Set(selectableGaps.map(g => g.muscle)));
                }
              }}
              className="text-xs text-primary-400 hover:text-primary-300 underline mb-3"
            >
              {allSelected ? 'Clear all' : `Select all (${selectableGaps.length})`}
            </button>
          ) : null;
        })()}

        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowVolumeGapPrompt(false);
              setVolumeGapDismissed(true);
              setSelectedVolumeGaps(new Set());
              setShowFinishModal(true);
            }}
            className="btn btn-secondary btn-md flex-1"
          >
            Not today
          </button>
          <button
            disabled={selectedVolumeGaps.size === 0}
            onClick={() => {
              // Add only the checked gaps
              const added: string[] = [];
              for (const gap of postWorkoutVolumeGaps.slice(0, 5)) {
                if (!selectedVolumeGaps.has(gap.muscle)) continue;
                const exercise = gap.recommendedExercise
                  ? exerciseLibrary.find(e => e.name === gap.recommendedExercise)
                  : null;
                if (exercise) {
                  const setsNeeded = Math.min(gap.deficit, 3);
                  addBonusExercise(exercise, setsNeeded, 10);
                  added.push(exercise.name);
                }
              }
              if (added.length > 0 && activeWorkout) {
                setTimeout(() => {
                  setCurrentExerciseIndex(activeWorkout.session.exercises.length);
                  setCurrentSetIndex(0);
                }, 50);
              }
              setShowVolumeGapPrompt(false);
              setVolumeGapDismissed(true);
              setSelectedVolumeGaps(new Set());
            }}
            className={cn(
              'btn btn-primary btn-md flex-1',
              selectedVolumeGaps.size === 0 && 'opacity-50 cursor-not-allowed',
            )}
          >
            {selectedVolumeGaps.size === 0
              ? 'Add Selected'
              : `Add ${selectedVolumeGaps.size}`}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
