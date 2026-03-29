'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Dumbbell,
  Zap,
  Heart,
  Target,
  Info
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { WorkoutSession, MesocycleWeek, WorkoutType } from '@/lib/types';
import { getCompletedSessionIds } from '@/lib/session-matching';

interface PeriodizationCalendarProps {
  onClose: () => void;
}

const typeConfig: Record<WorkoutType, { label: string; color: string; bg: string; icon: typeof Dumbbell }> = {
  strength: {
    label: 'Strength',
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    icon: Dumbbell,
  },
  hypertrophy: {
    label: 'Hypertrophy',
    color: 'text-purple-400',
    bg: 'bg-purple-500/20',
    icon: Heart,
  },
  power: {
    label: 'Power',
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    icon: Zap,
  },
  strength_endurance: {
    label: 'Endurance',
    color: 'text-amber-400',
    bg: 'bg-amber-500/20',
    icon: Target,
  },
};

export default function PeriodizationCalendar({ onClose }: PeriodizationCalendarProps) {
  const { currentMesocycle, mesocycleHistory: _rawMesoHistory, workoutLogs } = useAppStore();
  const mesocycleHistory = _rawMesoHistory.filter(m => !m._deleted);
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null);
  const [showLegend, setShowLegend] = useState(false);

  // Determine which week is current based on completed workouts
  const getCurrentWeekIndex = (): number => {
    if (!currentMesocycle) return 0;
    const mesocycleLogs = workoutLogs.filter(
      (log) => log.mesocycleId === currentMesocycle.id
    );
    if (mesocycleLogs.length === 0) return 0;

    // Find the latest session completed and figure out which week it belongs to
    const sessionsPerWeek = currentMesocycle.weeks[0]?.sessions.length || 3;
    const totalSessionsDone = mesocycleLogs.length;
    const currentWeek = Math.floor(totalSessionsDone / sessionsPerWeek);
    return Math.min(currentWeek, currentMesocycle.weeks.length - 1);
  };

  const currentWeekIndex = getCurrentWeekIndex();

  // Position-based session completion check
  const completedIds = getCompletedSessionIds(currentMesocycle, workoutLogs);
  const isSessionCompleted = (sessionId: string): boolean => completedIds.has(sessionId);

  // Find the max volume multiplier for chart scaling
  const maxVolume = currentMesocycle
    ? Math.max(...currentMesocycle.weeks.map((w) => w.volumeMultiplier))
    : 1;
  const maxIntensity = currentMesocycle
    ? Math.max(...currentMesocycle.weeks.map((w) => w.intensityMultiplier))
    : 1;

  // Empty state
  if (!currentMesocycle) {
    return (
      <div className="min-h-screen bg-grappler-900 p-4 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <button aria-label="Go back" onClick={onClose} className="btn btn-ghost btn-sm">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-grappler-50">Periodization Calendar</h2>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <Calendar className="w-16 h-16 text-grappler-500 mb-4" />
          <h3 className="text-lg font-bold text-grappler-200 mb-2">No Active Program</h3>
          <p className="text-grappler-400 max-w-xs">
            Generate a new mesocycle from your dashboard to see your periodization plan laid out here.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-grappler-900 p-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button aria-label="Go back" onClick={onClose} className="btn btn-ghost btn-sm">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-grappler-50">Periodization Calendar</h2>
            <p className="text-sm text-grappler-400">{currentMesocycle.name}</p>
          </div>
        </div>
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="btn btn-secondary btn-sm"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* Legend */}
      <AnimatePresence>
        {showLegend && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-grappler-200">Color Legend</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(typeConfig).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <div key={key} className={cn('flex items-center gap-2 rounded-lg px-3 py-2', config.bg)}>
                      <Icon className={cn('w-4 h-4', config.color)} />
                      <span className={cn('text-sm font-medium', config.color)}>{config.label}</span>
                    </div>
                  );
                })}
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-teal-500/20">
                  <Target className="w-4 h-4 text-teal-400" />
                  <span className="text-sm font-medium text-teal-400">Deload</span>
                </div>
              </div>
              <p className="text-xs text-grappler-400">
                Tap any session card to view full exercise details. The current week is highlighted with a bright border.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mesocycle Overview Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-3 text-center">
          <p className="text-lg font-bold text-grappler-50">{currentMesocycle.weeks.length}</p>
          <p className="text-xs text-grappler-400">Weeks</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-lg font-bold text-grappler-50">
            {currentMesocycle.weeks.reduce((s, w) => s + w.sessions.length, 0)}
          </p>
          <p className="text-xs text-grappler-400">Sessions</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-lg font-bold text-purple-400 capitalize">{currentMesocycle.goalFocus}</p>
          <p className="text-xs text-grappler-400">Focus</p>
        </div>
      </div>

      {/* Volume / Intensity Progression Chart */}
      <div className="card p-4 mb-6">
        <h3 className="text-sm font-semibold text-grappler-200 mb-3">Volume &amp; Intensity Progression</h3>
        <div className="space-y-2">
          {currentMesocycle.weeks.map((week, idx) => {
            const volumePct = maxVolume > 0 ? (week.volumeMultiplier / maxVolume) * 100 : 0;
            const intensityPct = maxIntensity > 0 ? (week.intensityMultiplier / maxIntensity) * 100 : 0;
            const isCurrentWeek = idx === currentWeekIndex;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  'rounded-lg p-2',
                  isCurrentWeek ? 'bg-grappler-800 ring-1 ring-primary-500' : 'bg-grappler-800/50'
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={cn(
                    'text-xs font-medium',
                    week.isDeload ? 'text-teal-400' : 'text-grappler-200'
                  )}>
                    W{week.weekNumber} {week.isDeload ? '(Deload)' : ''}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-grappler-400">
                    <span>Vol: {(week.volumeMultiplier * 100).toFixed(0)}%</span>
                    <span>Int: {(week.intensityMultiplier * 100).toFixed(0)}%</span>
                  </div>
                </div>
                {/* Volume bar */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-grappler-400 w-6">Vol</span>
                  <div className="flex-1 h-2 bg-grappler-900 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${volumePct}%` }}
                      transition={{ delay: idx * 0.05 + 0.2, duration: 0.4 }}
                      className={cn(
                        'h-full rounded-full',
                        week.isDeload ? 'bg-teal-500/70' : 'bg-purple-500'
                      )}
                    />
                  </div>
                </div>
                {/* Intensity bar */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-grappler-400 w-6">Int</span>
                  <div className="flex-1 h-2 bg-grappler-900 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${intensityPct}%` }}
                      transition={{ delay: idx * 0.05 + 0.3, duration: 0.4 }}
                      className={cn(
                        'h-full rounded-full',
                        week.isDeload ? 'bg-teal-400/70' : 'bg-red-500'
                      )}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Week-by-Week Timeline */}
      <div className="space-y-3 mb-6">
        <h3 className="text-sm font-semibold text-grappler-200">Weekly Timeline</h3>
        {currentMesocycle.weeks.map((week, weekIdx) => {
          const isCurrentWeek = weekIdx === currentWeekIndex;

          return (
            <motion.div
              key={weekIdx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: weekIdx * 0.08 }}
              className={cn(
                'rounded-xl p-4 transition-all',
                week.isDeload
                  ? 'bg-teal-500/10 border border-teal-500/30'
                  : 'bg-grappler-800',
                isCurrentWeek && 'ring-2 ring-primary-500 shadow-lg shadow-primary-500/10'
              )}
            >
              {/* Week header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-sm font-bold',
                    week.isDeload ? 'text-teal-400' : 'text-grappler-50'
                  )}>
                    Week {week.weekNumber}
                  </span>
                  {week.isDeload && (
                    <span className="text-xs font-semibold uppercase tracking-wider bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded-full">
                      Deload
                    </span>
                  )}
                  {isCurrentWeek && (
                    <span className="text-xs font-semibold uppercase tracking-wider bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-grappler-400">
                  <span>{(week.volumeMultiplier * 100).toFixed(0)}% vol</span>
                  <span className="text-grappler-700">|</span>
                  <span>{(week.intensityMultiplier * 100).toFixed(0)}% int</span>
                </div>
              </div>

              {/* Session cards */}
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(week.sessions.length, 3)}, 1fr)` }}>
                {week.sessions.map((session, sessionIdx) => {
                  const config = typeConfig[session.type] || typeConfig.hypertrophy;
                  const Icon = config.icon;
                  const completed = isSessionCompleted(session.id);

                  return (
                    <motion.button
                      key={session.id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setSelectedSession(session);
                        setSelectedWeekIndex(weekIdx);
                      }}
                      className={cn(
                        'rounded-lg p-3 text-left transition-all border',
                        config.bg,
                        'border-transparent hover:border-grappler-600',
                        week.isDeload && 'opacity-75',
                        completed && 'ring-1 ring-green-500/40'
                      )}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon className={cn('w-3.5 h-3.5', config.color)} />
                        <span className={cn('text-xs font-semibold', config.color)}>
                          Day {session.dayNumber}
                        </span>
                      </div>
                      <p className="text-xs text-grappler-200 truncate">{session.name}</p>
                      <p className="text-xs text-grappler-400 mt-0.5">
                        {session.exercises.length} exercises
                      </p>
                      {completed && (
                        <div className="flex items-center gap-1 mt-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                          <span className="text-xs text-green-400">Done</span>
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Session Detail Modal */}
      <AnimatePresence>
        {selectedSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center"
            onClick={() => setSelectedSession(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-grappler-900 rounded-t-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-grappler-700" />
              </div>

              <div className="p-4 space-y-4">
                {/* Session header */}
                {(() => {
                  const config = typeConfig[selectedSession.type] || typeConfig.hypertrophy;
                  const Icon = config.icon;
                  const week = selectedWeekIndex !== null
                    ? currentMesocycle.weeks[selectedWeekIndex]
                    : null;

                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', config.bg)}>
                            <Icon className={cn('w-5 h-5', config.color)} />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-grappler-50">{selectedSession.name}</h3>
                            <p className={cn('text-sm font-medium', config.color)}>
                              {config.label} - Day {selectedSession.dayNumber}
                              {week ? ` / Week ${week.weekNumber}` : ''}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedSession(null)}
                          className="btn btn-ghost btn-sm"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Session meta */}
                      <div className="flex items-center gap-4 text-sm text-grappler-400">
                        <span>{selectedSession.exercises.length} exercises</span>
                        <span>~{selectedSession.estimatedDuration} min</span>
                        {week?.isDeload && (
                          <span className="text-teal-400 font-medium">Deload Week</span>
                        )}
                      </div>
                    </>
                  );
                })()}

                {/* Warm-up */}
                {selectedSession.warmUp.length > 0 && (
                  <div className="bg-grappler-800 rounded-xl p-3">
                    <h4 className="text-xs font-semibold text-grappler-400 uppercase tracking-wider mb-2">Warm-Up</h4>
                    <ul className="space-y-1">
                      {selectedSession.warmUp.map((item, i) => (
                        <li key={i} className="text-sm text-grappler-200 flex items-start gap-2">
                          <span className="text-grappler-500 mt-0.5">-</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Exercises */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-grappler-400 uppercase tracking-wider">Exercises</h4>
                  {selectedSession.exercises.map((ex, idx) => (
                    <motion.div
                      key={ex.exerciseId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-grappler-800 rounded-xl p-3"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-grappler-400 bg-grappler-700 w-6 h-6 rounded-lg flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-grappler-50">{ex.exercise.name}</p>
                            <p className="text-xs text-grappler-400 capitalize">{ex.exercise.category}</p>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <div className="bg-grappler-900 rounded-lg p-2 text-center">
                          <p className="text-sm font-bold text-grappler-50">{ex.sets}</p>
                          <p className="text-xs text-grappler-400">Sets</p>
                        </div>
                        <div className="bg-grappler-900 rounded-lg p-2 text-center">
                          <p className="text-sm font-bold text-grappler-50">
                            {ex.prescription.minReps === ex.prescription.maxReps
                              ? ex.prescription.targetReps
                              : `${ex.prescription.minReps}-${ex.prescription.maxReps}`}
                          </p>
                          <p className="text-xs text-grappler-400">Reps</p>
                        </div>
                        <div className="bg-grappler-900 rounded-lg p-2 text-center">
                          <p className="text-sm font-bold text-grappler-50">{ex.prescription.rpe}</p>
                          <p className="text-xs text-grappler-400">RPE</p>
                        </div>
                      </div>
                      {ex.prescription.tempo && (
                        <p className="text-xs text-grappler-400 mt-2">
                          Tempo: <span className="text-grappler-200 font-mono">{ex.prescription.tempo}</span>
                        </p>
                      )}
                      {ex.prescription.restSeconds > 0 && (
                        <p className="text-xs text-grappler-400 mt-1">
                          Rest: <span className="text-grappler-200">{ex.prescription.restSeconds}s</span>
                        </p>
                      )}
                      {ex.notes && (
                        <p className="text-xs text-grappler-400 mt-1 italic">{ex.notes}</p>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Cool-down */}
                {selectedSession.coolDown.length > 0 && (
                  <div className="bg-grappler-800 rounded-xl p-3">
                    <h4 className="text-xs font-semibold text-grappler-400 uppercase tracking-wider mb-2">Cool-Down</h4>
                    <ul className="space-y-1">
                      {selectedSession.coolDown.map((item, i) => (
                        <li key={i} className="text-sm text-grappler-200 flex items-start gap-2">
                          <span className="text-grappler-500 mt-0.5">-</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
