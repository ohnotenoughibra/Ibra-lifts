'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import {
  X, Play, Check, ChevronDown, ChevronUp, Clock, Dumbbell,
  Minus, Plus, Undo2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Mesocycle, WorkoutSession, ExercisePrescription, MAX_BLOCK_WEEKS, MIN_BLOCK_WEEKS } from '@/lib/types';
import { VolumeWave } from './MesocycleTimeline';
import ProgramExerciseCard from './ProgramExerciseCard';
import { getWorkoutTypeUI } from './workout-type-ui';
import { useToast } from './Toast';

interface ScheduleSheetProps {
  mesocycle: Mesocycle;
  completedSessionIds: Set<string>;
  currentWeekIndex: number; // -1 if all done
  onClose: () => void;
  onSwap: (weekIndex: number, sessionId: string, exerciseIndex: number, newExerciseId: string) => void;
  onBlockAction: (label: string) => void; // surfaces the parent's undo toast
}

export default function ScheduleSheet({ mesocycle, completedSessionIds, currentWeekIndex, onClose, onSwap, onBlockAction }: ScheduleSheetProps) {
  const { startWorkout, user, addWeekToMesocycle, removeWeekFromMesocycle, removeExerciseFromSession, insertExerciseIntoSession } = useAppStore(
    useShallow(s => ({
      startWorkout: s.startWorkout, user: s.user,
      addWeekToMesocycle: s.addWeekToMesocycle, removeWeekFromMesocycle: s.removeWeekFromMesocycle,
      removeExerciseFromSession: s.removeExerciseFromSession,
      insertExerciseIntoSession: s.insertExerciseIntoSession,
    }))
  );
  const { showToast } = useToast();

  const [openWeek, setOpenWeek] = useState<number>(currentWeekIndex >= 0 ? currentWeekIndex : 0);
  const [openSession, setOpenSession] = useState<string | null>(null);
  // Removing an exercise is destructive — keep it undoable like every other edit
  const [removedExercise, setRemovedExercise] = useState<{ weekIndex: number; sessionId: string; index: number; exercise: ExercisePrescription } | null>(null);

  useEffect(() => {
    if (!removedExercise) return;
    const timer = setTimeout(() => setRemovedExercise(null), 5000);
    return () => clearTimeout(timer);
  }, [removedExercise]);

  // Backdrop onKeyDown only fires when focus is inside the sheet — a document
  // listener makes Escape work no matter where focus sits
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleRemoveExercise = (weekIndex: number, sessionId: string, index: number, exercise: ExercisePrescription) => {
    removeExerciseFromSession(weekIndex, sessionId, index);
    setRemovedExercise({ weekIndex, sessionId, index, exercise });
  };

  const handleUndoRemove = () => {
    if (!removedExercise) return;
    insertExerciseIntoSession(removedExercise.weekIndex, removedExercise.sessionId, removedExercise.index, removedExercise.exercise);
    setRemovedExercise(null);
  };

  const sortedWeeks = useMemo(
    () => [...mesocycle.weeks].sort((a, b) => a.weekNumber - b.weekNumber),
    [mesocycle.weeks]
  );

  const handleStart = (session: WorkoutSession) => {
    if (startWorkout(session) === false) {
      showToast('Finish your current workout first', 'warning');
      return;
    }
    onClose();
  };

  // Removing a TRAINED week renumbers the rest, and orphaned logs then
  // position-match different weeks (can falsely flip sessions to complete).
  // Prefer the last UNTRAINED training week; if every removable week has
  // logged sessions, require an explicit confirm.
  const [confirmRemoveWeek, setConfirmRemoveWeek] = useState<number | null>(null);

  const handleRemoveWeek = () => {
    const trainingWeeks = mesocycle.weeks
      .map((w, i) => ({ week: w, idx: i }))
      .filter(({ week }) => !week.isDeload);
    if (trainingWeeks.length <= 1) return;

    const isUntrained = ({ week }: typeof trainingWeeks[number]) =>
      !week.sessions.some(s => completedSessionIds.has(s.id));
    const lastUntrained = [...trainingWeeks].reverse().find(isUntrained);

    if (lastUntrained) {
      removeWeekFromMesocycle(lastUntrained.idx);
      onBlockAction('Week removed');
      setConfirmRemoveWeek(null);
    } else {
      // All removable weeks have logged work — make the user say yes
      setConfirmRemoveWeek(trainingWeeks[trainingWeeks.length - 1].idx);
    }
  };

  const handleConfirmRemoveTrainedWeek = () => {
    if (confirmRemoveWeek === null) return;
    removeWeekFromMesocycle(confirmRemoveWeek);
    onBlockAction('Week removed');
    setConfirmRemoveWeek(null);
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
      aria-label="Block schedule"
      onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
    >
      <div className="w-full max-w-lg max-h-[88dvh] overflow-y-auto rounded-t-2xl bg-grappler-900 border-t border-grappler-700 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-grappler-900 px-4 pt-3 pb-2 border-b border-grappler-800">
          <div className="w-10 h-1 bg-grappler-700 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-grappler-50 truncate">{mesocycle.name}</h2>
              <p className="text-xs text-grappler-400 capitalize">
                {mesocycle.goalFocus.replace(/_/g, ' ')} · {mesocycle.weeks.length} weeks · {mesocycle.splitType.replace(/_/g, ' ')}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close schedule"
              className="w-8 h-8 rounded-full bg-grappler-800 flex items-center justify-center text-grappler-400 hover:text-grappler-200 flex-shrink-0"
              data-tight
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Volume arc of the block */}
          {mesocycle.weeks.length >= 2 && (
            <VolumeWave
              weeks={mesocycle.weeks}
              currentWeekIndex={currentWeekIndex}
              completedSessionIds={completedSessionIds}
            />
          )}

          {/* Weeks accordion — display order is sorted, but store mutations and the
              currentWeekIndex comparison key off the RAW array index. If a sync
              merge ever de-sorts the weeks array, edits still land in the right week. */}
          <div className="space-y-2">
            {sortedWeeks.map((week) => {
              const weekIndex = mesocycle.weeks.indexOf(week);
              const completedCount = week.sessions.filter(s => completedSessionIds.has(s.id)).length;
              const allDone = completedCount === week.sessions.length && week.sessions.length > 0;
              const isOpen = openWeek === weekIndex;
              const isCurrent = weekIndex === currentWeekIndex;
              return (
                <div key={week.weekNumber} className={cn('card overflow-hidden', isCurrent && 'border border-primary-500/40')}>
                  <button
                    onClick={() => setOpenWeek(isOpen ? -1 : weekIndex)}
                    className="w-full p-3.5 flex items-center justify-between gap-3"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0',
                        allDone ? 'bg-green-500/20 text-green-400'
                          : week.isDeload ? 'bg-teal-500/15 text-teal-400'
                          : isCurrent ? 'bg-primary-500/20 text-primary-300'
                          : 'bg-grappler-800 text-grappler-300'
                      )}>
                        {allDone ? <Check className="w-4 h-4" /> : `W${week.weekNumber}`}
                      </span>
                      <div className="text-left min-w-0">
                        <p className="text-sm font-semibold text-grappler-100">
                          Week {week.weekNumber}
                          {week.isDeload && <span className="ml-1.5 text-xs font-bold text-teal-400 uppercase">Deload</span>}
                          {isCurrent && !week.isDeload && <span className="ml-1.5 text-xs font-bold text-primary-400 uppercase">Now</span>}
                        </p>
                        <p className="text-xs text-grappler-400">{completedCount}/{week.sessions.length} sessions done</p>
                      </div>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-grappler-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-grappler-400 flex-shrink-0" />}
                  </button>

                  {isOpen && (
                    <div className="border-t border-grappler-800 p-3 space-y-2">
                      {week.sessions.map(session => {
                        const typeUI = getWorkoutTypeUI(session.type);
                        const Icon = typeUI.icon;
                        const isCompleted = completedSessionIds.has(session.id);
                        const isExpanded = openSession === session.id;
                        return (
                          <div key={session.id} className={cn('rounded-xl bg-grappler-800/50 overflow-hidden', isCompleted && 'opacity-60')}>
                            <div className="p-3 flex items-center gap-3">
                              <button
                                onClick={() => setOpenSession(isExpanded ? null : session.id)}
                                className="flex items-center gap-3 flex-1 min-w-0 text-left"
                                aria-expanded={isExpanded}
                              >
                                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 relative', typeUI.color)}>
                                  {/* w-4.5 is not on Tailwind's scale — arbitrary value for a real 18px icon */}
                                  <Icon className="w-[18px] h-[18px]" />
                                  {isCompleted && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                      <Check className="w-2.5 h-2.5 text-white" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-grappler-100 truncate">{session.name}</p>
                                  <p className="text-xs text-grappler-400 flex items-center gap-2">
                                    <span className="flex items-center gap-1"><Dumbbell className="w-3 h-3" />{session.exercises.length}</span>
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{session.estimatedDuration}m</span>
                                  </p>
                                </div>
                              </button>
                              {!isCompleted && (
                                <button
                                  onClick={() => handleStart(session)}
                                  className="btn btn-primary btn-sm gap-1 flex-shrink-0"
                                >
                                  <Play className="w-3.5 h-3.5" />
                                  Start
                                </button>
                              )}
                            </div>
                            {isExpanded && (
                              <div className="border-t border-grappler-700/50 p-2.5 space-y-2">
                                {session.exercises.map((ex, i) => (
                                  <ProgramExerciseCard
                                    key={`${session.id}-${i}-${ex.exerciseId}`}
                                    exercise={ex}
                                    index={i}
                                    weekIndex={weekIndex}
                                    sessionId={session.id}
                                    onSwap={onSwap}
                                    onRemove={handleRemoveExercise}
                                    userEquipment={user?.equipment || 'full_gym'}
                                    totalExercises={session.exercises.length}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Week add/remove — bounds mirror the store guards via shared constants */}
          {confirmRemoveWeek !== null && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
              <p className="text-xs text-grappler-300">
                Every removable week has logged workouts. Removing one renumbers the
                remaining weeks, so past sessions may show under a different week.
                Your logs themselves are never deleted.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmRemoveWeek(null)} className="btn btn-secondary btn-sm flex-1">Keep week</button>
                <button onClick={handleConfirmRemoveTrainedWeek} className="btn btn-sm flex-1 bg-amber-600 text-white hover:bg-amber-500">Remove anyway</button>
              </div>
            </div>
          )}
          <div className="flex items-center justify-center gap-3 pt-1">
            {mesocycle.weeks.length > MIN_BLOCK_WEEKS && (
              <button
                onClick={handleRemoveWeek}
                className="btn btn-ghost btn-sm gap-1.5 text-grappler-400 hover:text-red-400"
                data-tight
              >
                <Minus className="w-3.5 h-3.5" />
                Remove week
              </button>
            )}
            {mesocycle.weeks.length < MAX_BLOCK_WEEKS && (
              <button
                onClick={() => { addWeekToMesocycle(); onBlockAction('Week added'); }}
                className="btn btn-ghost btn-sm gap-1.5 text-grappler-400 hover:text-primary-300"
                data-tight
              >
                <Plus className="w-3.5 h-3.5" />
                Add week
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Exercise removed — undo toast (sheet-scoped) */}
      {removedExercise && (
        <div
          className="fixed bottom-24 left-4 right-4 z-[60] mx-auto max-w-sm flex items-center justify-between gap-3 rounded-xl bg-grappler-800 border border-grappler-600 px-4 py-2 shadow-2xl"
          role="status"
        >
          <span className="text-sm text-grappler-200 flex-1 min-w-0 truncate">
            Removed <span className="font-semibold text-grappler-100">{removedExercise.exercise.exercise?.name || 'exercise'}</span>
          </span>
          <button
            onClick={handleUndoRemove}
            className="btn btn-ghost btn-sm gap-1 text-primary-400 hover:text-primary-300 flex-shrink-0"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Undo
          </button>
        </div>
      )}
    </motion.div>
  );
}
