'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { ChevronLeft, ChevronRight, Dumbbell, Target, Zap, TrendingUp, Trash2, Plus, Calendar, Edit3 } from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import { WorkoutLog, TrainingSession } from '@/lib/types';

export default function TrainingCalendar() {
  const {
    workoutLogs, trainingSessions, user,
    addTrainingSession, addPastWorkout,
    deleteWorkoutLog, deleteTrainingSession,
    updateWorkoutLog, updateTrainingSession
  } = useAppStore();
  const weightUnit = user?.weightUnit || 'lbs';
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutLog | null>(null);
  const [editingSession, setEditingSession] = useState<TrainingSession | null>(null);
  const [newDate, setNewDate] = useState('');

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

  // Build a map of date -> workout data for this month
  const workoutMap = useMemo(() => {
    const map: Record<number, { rpe: number; volume: number; liftCount: number; sessionCount: number }> = {};

    workoutLogs.forEach(log => {
      const d = new Date(log.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        const day = d.getDate();
        if (!map[day]) map[day] = { rpe: 0, volume: 0, liftCount: 0, sessionCount: 0 };
        map[day].rpe = Math.max(map[day].rpe, log.overallRPE);
        map[day].volume += log.totalVolume;
        map[day].liftCount += 1;
      }
    });

    trainingSessions.forEach(session => {
      const d = new Date(session.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        const day = d.getDate();
        if (!map[day]) map[day] = { rpe: 0, volume: 0, liftCount: 0, sessionCount: 0 };
        map[day].rpe = Math.max(map[day].rpe, session.perceivedExertion || 0);
        map[day].sessionCount += 1;
      }
    });

    return map;
  }, [workoutLogs, trainingSessions, currentMonth, currentYear]);

  // Get activities for selected date
  const selectedDateActivities = useMemo(() => {
    if (!selectedDate) return { lifts: [], sessions: [] };

    const dateStr = selectedDate.toDateString();
    const lifts = workoutLogs.filter(log => new Date(log.date).toDateString() === dateStr);
    const sessions = trainingSessions.filter(s => new Date(s.date).toDateString() === dateStr);

    return { lifts, sessions };
  }, [selectedDate, workoutLogs, trainingSessions]);

  // Build calendar grid
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today = now.getDate();
  const isCurrentMonth = now.getMonth() === currentMonth && now.getFullYear() === currentYear;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // Monthly stats
  const monthStats = useMemo(() => {
    const logs = workoutLogs.filter(l => {
      const d = new Date(l.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const sessions = trainingSessions.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const totalLifts = logs.length;
    const totalSessions = sessions.length;
    const totalVolume = logs.reduce((s, l) => s + l.totalVolume, 0);
    const avgRPE = logs.length > 0 ? logs.reduce((s, l) => s + l.overallRPE, 0) / logs.length : 0;
    return { totalLifts, totalSessions, totalVolume, avgRPE };
  }, [workoutLogs, trainingSessions, currentMonth, currentYear]);

  const formatActivityType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleEditDate = (type: 'workout' | 'session', item: WorkoutLog | TrainingSession) => {
    if (type === 'workout') {
      setEditingWorkout(item as WorkoutLog);
    } else {
      setEditingSession(item as TrainingSession);
    }
    const d = new Date(item.date);
    setNewDate(d.toISOString().split('T')[0]);
  };

  const saveNewDate = () => {
    if (!newDate) return;
    const parsedDate = new Date(newDate + 'T12:00:00');

    if (editingWorkout) {
      updateWorkoutLog(editingWorkout.id, { date: parsedDate });
      setEditingWorkout(null);
    } else if (editingSession) {
      updateTrainingSession(editingSession.id, { date: parsedDate });
      setEditingSession(null);
    }
    setNewDate('');
    setSelectedDate(null);
  };

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="btn btn-ghost btn-sm">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-bold text-grappler-50">{monthName}</h3>
        <button onClick={nextMonth} className="btn btn-ghost btn-sm">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-xs text-grappler-500 py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="aspect-square" />;
          const data = workoutMap[day];
          const isToday = isCurrentMonth && day === today;
          const hasLifting = data && data.liftCount > 0;
          const hasSession = data && data.sessionCount > 0;
          const isFuture = new Date(currentYear, currentMonth, day) > now;

          return (
            <button
              key={i}
              onClick={() => {
                const clickedDate = new Date(currentYear, currentMonth, day, 12, 0, 0);
                setSelectedDate(clickedDate);
              }}
              disabled={isFuture}
              className={cn(
                'aspect-square rounded-lg flex flex-col items-center justify-center text-xs relative transition-colors',
                hasLifting && hasSession
                  ? 'bg-gradient-to-br from-green-500/30 to-blue-500/30 text-white'
                  : hasLifting
                    ? 'bg-green-500/20 text-green-400'
                    : hasSession
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'bg-grappler-800/50 text-grappler-500',
                isToday && 'ring-1 ring-primary-500',
                !isFuture && 'hover:bg-grappler-700/60 cursor-pointer',
                isFuture && 'opacity-40 cursor-not-allowed'
              )}
            >
              <span className="font-medium">{day}</span>
              {(hasLifting || hasSession) && (
                <div className="flex gap-0.5 mt-0.5">
                  {hasLifting && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                  {hasSession && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Activity Modal */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setSelectedDate(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-grappler-800 rounded-2xl p-5 w-full max-w-sm shadow-xl max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-white mb-1">
                {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </h3>

              {/* Existing Activities */}
              {(selectedDateActivities.lifts.length > 0 || selectedDateActivities.sessions.length > 0) && (
                <div className="mb-4">
                  <p className="text-xs text-grappler-400 uppercase tracking-wide mb-2">Activities</p>
                  <div className="space-y-2">
                    {selectedDateActivities.lifts.map(lift => (
                      <div key={lift.id} className="flex items-center justify-between p-2 bg-grappler-700/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                            <Dumbbell className="w-4 h-4 text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">Lifting</p>
                            <p className="text-xs text-grappler-400">
                              {lift.exercises.length} exercises • {formatNumber(lift.totalVolume)} {weightUnit}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditDate('workout', lift)}
                            className="p-1.5 text-grappler-400 hover:text-blue-400 transition-colors"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteWorkoutLog(lift.id)}
                            className="p-1.5 text-grappler-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {selectedDateActivities.sessions.map(session => (
                      <div key={session.id} className="flex items-center justify-between p-2 bg-grappler-700/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center',
                            session.category === 'grappling' ? 'bg-blue-500/20' :
                            session.category === 'striking' ? 'bg-orange-500/20' :
                            'bg-purple-500/20'
                          )}>
                            {session.category === 'grappling' ? <Target className="w-4 h-4 text-blue-400" /> :
                             session.category === 'striking' ? <Zap className="w-4 h-4 text-orange-400" /> :
                             <TrendingUp className="w-4 h-4 text-purple-400" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{formatActivityType(session.type)}</p>
                            <p className="text-xs text-grappler-400">{session.duration}min • RPE {session.perceivedExertion}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditDate('session', session)}
                            className="p-1.5 text-grappler-400 hover:text-blue-400 transition-colors"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTrainingSession(session.id)}
                            className="p-1.5 text-grappler-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Activity */}
              <div>
                <p className="text-xs text-grappler-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add Activity
                </p>
                <div className="space-y-2">
                  {/* Lifting option */}
                  <button
                    onClick={() => {
                      addPastWorkout({
                        date: selectedDate,
                        exercises: [{
                          exerciseId: 'general-lifting',
                          exerciseName: 'Lifting Session',
                          sets: [{ setNumber: 1, weight: 0, reps: 1, rpe: 7, completed: true }],
                          personalRecord: false,
                        }],
                        duration: 60,
                        overallRPE: 7,
                        notes: 'Quick logged from calendar',
                      });
                      setSelectedDate(null);
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-grappler-700/50 hover:bg-grappler-700 rounded-xl transition-colors"
                  >
                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <Dumbbell className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-white">Lifting</p>
                      <p className="text-xs text-grappler-400">Strength training</p>
                    </div>
                  </button>

                  {/* Grappling option */}
                  <button
                    onClick={() => {
                      addTrainingSession({
                        date: selectedDate,
                        category: 'grappling',
                        type: 'bjj_nogi',
                        plannedIntensity: 'moderate',
                        duration: 60,
                        timing: 'standalone',
                        perceivedExertion: 6,
                      });
                      setSelectedDate(null);
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-grappler-700/50 hover:bg-grappler-700 rounded-xl transition-colors"
                  >
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <Target className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-white">Grappling</p>
                      <p className="text-xs text-grappler-400">BJJ / Wrestling</p>
                    </div>
                  </button>

                  {/* Striking option */}
                  <button
                    onClick={() => {
                      addTrainingSession({
                        date: selectedDate,
                        category: 'striking',
                        type: 'boxing',
                        plannedIntensity: 'moderate',
                        duration: 60,
                        timing: 'standalone',
                        perceivedExertion: 6,
                      });
                      setSelectedDate(null);
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-grappler-700/50 hover:bg-grappler-700 rounded-xl transition-colors"
                  >
                    <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                      <Zap className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-white">Striking</p>
                      <p className="text-xs text-grappler-400">Boxing / Kickboxing</p>
                    </div>
                  </button>

                  {/* Cardio option */}
                  <button
                    onClick={() => {
                      addTrainingSession({
                        date: selectedDate,
                        category: 'cardio',
                        type: 'running',
                        plannedIntensity: 'moderate',
                        duration: 30,
                        timing: 'standalone',
                        perceivedExertion: 5,
                      });
                      setSelectedDate(null);
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-grappler-700/50 hover:bg-grappler-700 rounded-xl transition-colors"
                  >
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-white">Cardio</p>
                      <p className="text-xs text-grappler-400">Running / Cycling</p>
                    </div>
                  </button>
                </div>
              </div>

              <button
                onClick={() => setSelectedDate(null)}
                className="w-full mt-4 py-2 text-sm text-grappler-400 hover:text-grappler-200 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Date Modal */}
      <AnimatePresence>
        {(editingWorkout || editingSession) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
            onClick={() => { setEditingWorkout(null); setEditingSession(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-grappler-800 rounded-2xl p-5 w-full max-w-xs shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                <Edit3 className="w-5 h-5" /> Change Date
              </h3>
              <p className="text-sm text-grappler-400 mb-4">
                Move this {editingWorkout ? 'workout' : 'session'} to a new date
              </p>

              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="w-full p-3 bg-grappler-700 border border-grappler-600 rounded-xl text-white mb-4"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => { setEditingWorkout(null); setEditingSession(null); setNewDate(''); }}
                  className="flex-1 py-2 text-sm text-grappler-400 hover:text-grappler-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveNewDate}
                  className="flex-1 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Monthly stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="card p-3 text-center">
          <p className="text-lg font-bold text-green-400">{monthStats.totalLifts}</p>
          <p className="text-[10px] text-grappler-400">Lifts</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-lg font-bold text-blue-400">{monthStats.totalSessions}</p>
          <p className="text-[10px] text-grappler-400">Sessions</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-lg font-bold text-grappler-50">{formatNumber(Math.round(monthStats.totalVolume))}</p>
          <p className="text-[10px] text-grappler-400">Vol ({weightUnit})</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-lg font-bold text-grappler-50">{monthStats.avgRPE > 0 ? monthStats.avgRPE.toFixed(1) : '-'}</p>
          <p className="text-[10px] text-grappler-400">Avg RPE</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-grappler-400">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span>Lifting</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          <span>Training</span>
        </div>
      </div>
    </div>
  );
}
