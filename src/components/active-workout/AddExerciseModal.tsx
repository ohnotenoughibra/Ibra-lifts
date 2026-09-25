'use client';
/* Extracted verbatim from ActiveWorkout.tsx (showAddExerciseModal block) — no behavior change. */
import type * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';
import type { Exercise, WorkoutSession, ExerciseLog, PreWorkoutCheckIn } from '@/lib/types';
import type { ActiveWorkoutThrottle } from '@/lib/store';

export interface AddExerciseModalProps {
  addExerciseSearch: string;
  setAddExerciseSearch: React.Dispatch<React.SetStateAction<string>>;
  setAddExerciseFilter: React.Dispatch<React.SetStateAction<string>>;
  addExerciseFilter: string;
  addExerciseList: Exercise[];
  addBonusExercise: (exercise: Exercise, sets: number, reps: number) => void;
  setShowAddExerciseModal: (v: boolean) => void;
  setCurrentExerciseIndex: React.Dispatch<React.SetStateAction<number>>;
  /** Always set here — ActiveWorkout returns early without one. */
  activeWorkout: NonNullable<{ session: WorkoutSession; baseSession: WorkoutSession; exerciseLogs: ExerciseLog[]; startTime: Date; mesocycleId: string; weekNumber?: number | undefined; dayNumber?: number | undefined; preCheckIn?: PreWorkoutCheckIn | undefined; pausedAt?: Date | undefined; totalPausedMs?: number | undefined; throttle?: ActiveWorkoutThrottle | undefined; overviewDone?: boolean | undefined; position?: { exerciseIndex: number; setIndex: number; } | undefined; swapUndo?: { session: WorkoutSession; exerciseLogs: ExerciseLog[]; } | undefined; matAdjust?: { kind: "taper" | "mat"; reason: string; summary: string; original: WorkoutSession; undone?: boolean | undefined; } | undefined; } | null>;
  setCurrentSetIndex: React.Dispatch<React.SetStateAction<number>>;
}

export default function AddExerciseModal({ addExerciseSearch, setAddExerciseSearch, setAddExerciseFilter, addExerciseFilter, addExerciseList, addBonusExercise, setShowAddExerciseModal, setCurrentExerciseIndex, activeWorkout, setCurrentSetIndex }: AddExerciseModalProps) {
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
        className="card p-6 w-full max-w-md max-h-[85vh] flex flex-col"
      >
        <h2 className="text-lg font-bold text-grappler-50 mb-3">Add Exercise</h2>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grappler-500" />
          <input
            type="text"
            value={addExerciseSearch}
            onChange={(e) => setAddExerciseSearch(e.target.value)}
            placeholder="Search exercises..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-grappler-800 border border-grappler-700 text-sm text-grappler-100 placeholder-grappler-500 focus-visible:outline-none focus-visible:border-primary-500"
            autoFocus
          />
        </div>

        {/* Muscle filter chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {['all', 'chest', 'back', 'shoulders', 'quadriceps', 'hamstrings', 'glutes', 'biceps', 'triceps', 'core'].map(muscle => (
            <button
              key={muscle}
              onClick={() => setAddExerciseFilter(muscle)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-full transition-colors capitalize',
                addExerciseFilter === muscle
                  ? 'bg-primary-600 text-white'
                  : 'bg-grappler-700 text-grappler-400 hover:bg-grappler-600'
              )}
            >
              {muscle === 'all' ? 'All' : muscle}
            </button>
          ))}
        </div>

        {/* Exercise list */}
        <div className="overflow-y-auto flex-1 space-y-1.5 min-h-0">
          {addExerciseList.length > 0 ? addExerciseList.slice(0, 30).map((ex) => (
            <button
              key={ex.id}
              onClick={() => {
                addBonusExercise(ex, 3, 10);
                setShowAddExerciseModal(false);
                // Navigate to the newly added exercise
                setTimeout(() => {
                  setCurrentExerciseIndex(activeWorkout.session.exercises.length);
                  setCurrentSetIndex(0);
                }, 50);
              }}
              className="w-full p-3 rounded-xl border border-grappler-700 hover:border-primary-500 text-left transition-all group"
            >
              <p className="font-semibold text-sm text-grappler-100 group-hover:text-primary-300 transition-colors">
                {ex.name}
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="text-xs px-1.5 py-0.5 rounded bg-grappler-700/80 text-grappler-400 capitalize">
                  {ex.category}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-grappler-700/80 text-grappler-400 capitalize">
                  {ex.movementPattern}
                </span>
              </div>
              <p className="text-xs text-grappler-400 mt-1 capitalize">
                {ex.primaryMuscles.join(', ')}
              </p>
            </button>
          )) : (
            <p className="text-sm text-grappler-400 text-center py-6">
              No exercises found
            </p>
          )}
        </div>

        <button
          onClick={() => setShowAddExerciseModal(false)}
          className="btn btn-secondary btn-md w-full mt-4"
        >
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}
