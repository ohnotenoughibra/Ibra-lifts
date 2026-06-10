'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import {
  X, Play, Check, ChevronDown, ChevronUp, Clock, Dumbbell,
  Zap, Heart, Flame, Target, Minus, Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Mesocycle, WorkoutSession, WorkoutType } from '@/lib/types';
import { VolumeWave } from './MesocycleTimeline';
import ProgramExerciseCard from './ProgramExerciseCard';
import { useToast } from './Toast';

interface ScheduleSheetProps {
  mesocycle: Mesocycle;
  completedSessionIds: Set<string>;
  currentWeekIndex: number; // -1 if all done
  onClose: () => void;
  onSwap: (weekIndex: number, sessionId: string, exerciseIndex: number, newExerciseId: string) => void;
  onBlockAction: (label: string) => void; // surfaces the parent's undo toast
}

const TYPE_ICON: Record<string, typeof Zap> = {
  strength: Zap, hypertrophy: Heart, power: Flame, strength_endurance: Target,
};
const TYPE_COLOR: Record<string, string> = {
  strength: 'text-red-400 bg-red-500/10',
  hypertrophy: 'text-purple-400 bg-purple-500/10',
  power: 'text-blue-400 bg-blue-500/10',
  strength_endurance: 'text-amber-400 bg-amber-500/10',
};

export default function ScheduleSheet({ mesocycle, completedSessionIds, currentWeekIndex, onClose, onSwap, onBlockAction }: ScheduleSheetProps) {
  const { startWorkout, user, addWeekToMesocycle, removeWeekFromMesocycle } = useAppStore(
    useShallow(s => ({
      startWorkout: s.startWorkout, user: s.user,
      addWeekToMesocycle: s.addWeekToMesocycle, removeWeekFromMesocycle: s.removeWeekFromMesocycle,
    }))
  );
  const { showToast } = useToast();

  const [openWeek, setOpenWeek] = useState<number>(currentWeekIndex >= 0 ? currentWeekIndex : 0);
  const [openSession, setOpenSession] = useState<string | null>(null);

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

  const handleRemoveWeek = () => {
    const trainingWeeks = mesocycle.weeks
      .map((w, i) => ({ ...w, idx: i }))
      .filter(w => !w.isDeload);
    if (trainingWeeks.length > 1) {
      const lastTraining = trainingWeeks[trainingWeeks.length - 1];
      removeWeekFromMesocycle(lastTraining.idx);
      onBlockAction('Week removed');
    }
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

          {/* Weeks accordion */}
          <div className="space-y-2">
            {sortedWeeks.map((week, weekIndex) => {
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
                        const Icon = TYPE_ICON[session.type as WorkoutType] || Zap;
                        const colorClass = TYPE_COLOR[session.type as WorkoutType] || TYPE_COLOR.strength;
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
                                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 relative', colorClass)}>
                                  <Icon className="w-4.5 h-4.5" />
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

          {/* Week add/remove */}
          <div className="flex items-center justify-center gap-3 pt-1">
            {mesocycle.weeks.length > 2 && (
              <button
                onClick={handleRemoveWeek}
                className="btn btn-ghost btn-sm gap-1.5 text-grappler-400 hover:text-red-400"
                data-tight
              >
                <Minus className="w-3.5 h-3.5" />
                Remove week
              </button>
            )}
            {mesocycle.weeks.length < 12 && (
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
    </motion.div>
  );
}
