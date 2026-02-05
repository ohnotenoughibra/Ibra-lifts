'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { ChevronLeft, ChevronRight, Dumbbell, Target, Zap, TrendingUp } from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';

export default function TrainingCalendar() {
  const { workoutLogs, trainingSessions, user, addTrainingSession, addPastWorkout } = useAppStore();
  const weightUnit = user?.weightUnit || 'lbs';
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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

    // Add lifting workouts
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

    // Add training sessions
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

      {/* Add Activity Modal */}
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
              className="bg-grappler-800 rounded-2xl p-5 w-full max-w-xs shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-white mb-1">Add Activity</h3>
              <p className="text-sm text-grappler-400 mb-4">
                {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
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

              <button
                onClick={() => setSelectedDate(null)}
                className="w-full mt-4 py-2 text-sm text-grappler-400 hover:text-grappler-200 transition-colors"
              >
                Cancel
              </button>
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
