'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';

export default function TrainingCalendar() {
  const { workoutLogs, user } = useAppStore();
  const weightUnit = user?.weightUnit || 'lbs';
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

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
    const map: Record<number, { rpe: number; volume: number; count: number }> = {};
    workoutLogs.forEach(log => {
      const d = new Date(log.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        const day = d.getDate();
        if (!map[day]) map[day] = { rpe: 0, volume: 0, count: 0 };
        map[day].rpe = Math.max(map[day].rpe, log.overallRPE);
        map[day].volume += log.totalVolume;
        map[day].count += 1;
      }
    });
    return map;
  }, [workoutLogs, currentMonth, currentYear]);

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
    const totalWorkouts = logs.length;
    const totalVolume = logs.reduce((s, l) => s + l.totalVolume, 0);
    const avgRPE = logs.length > 0 ? logs.reduce((s, l) => s + l.overallRPE, 0) / logs.length : 0;
    return { totalWorkouts, totalVolume, avgRPE };
  }, [workoutLogs, currentMonth, currentYear]);

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
          const workout = workoutMap[day];
          const isToday = isCurrentMonth && day === today;
          return (
            <div
              key={i}
              className={cn(
                'aspect-square rounded-lg flex flex-col items-center justify-center text-xs relative',
                workout
                  ? workout.rpe >= 9 ? 'bg-red-500/20 text-red-400'
                    : workout.rpe >= 7 ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-green-500/20 text-green-400'
                  : 'bg-grappler-800/50 text-grappler-500',
                isToday && 'ring-1 ring-primary-500'
              )}
            >
              <span className="font-medium">{day}</span>
              {workout && (
                <span className="w-1.5 h-1.5 rounded-full bg-current mt-0.5" />
              )}
            </div>
          );
        })}
      </div>

      {/* Monthly stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 text-center">
          <p className="text-lg font-bold text-grappler-50">{monthStats.totalWorkouts}</p>
          <p className="text-xs text-grappler-400">Workouts</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-lg font-bold text-grappler-50">{formatNumber(Math.round(monthStats.totalVolume))}</p>
          <p className="text-xs text-grappler-400">Volume ({weightUnit})</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-lg font-bold text-grappler-50">{monthStats.avgRPE > 0 ? monthStats.avgRPE.toFixed(1) : '-'}</p>
          <p className="text-xs text-grappler-400">Avg RPE</p>
        </div>
      </div>
    </div>
  );
}
