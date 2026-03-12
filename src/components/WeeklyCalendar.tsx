'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { buildWeekPlan } from '@/lib/smart-schedule';
import type { CombatTrainingDay, WorkoutSession, Mesocycle, WorkoutLog } from '@/lib/types';
import { Dumbbell, Shield, Zap, Flame, Battery } from 'lucide-react';

// ─── Types ───

interface WeeklyCalendarProps {
  trainingDays: number[];
  combatTrainingDays: CombatTrainingDay[];
  currentMesocycle: Mesocycle | null;
  workoutLogs: WorkoutLog[];
}

// Short day labels starting Monday (most training calendars are Mon-based)
const DAYS_MON_START = [
  { label: 'M', idx: 1 },
  { label: 'T', idx: 2 },
  { label: 'W', idx: 3 },
  { label: 'T', idx: 4 },
  { label: 'F', idx: 5 },
  { label: 'S', idx: 6 },
  { label: 'S', idx: 0 },
];

const TYPE_META: Record<string, { icon: typeof Dumbbell; color: string; bg: string; label: string }> = {
  strength:           { icon: Dumbbell, color: 'text-red-400',    bg: 'bg-red-500/15 border-red-500/30',    label: 'STR' },
  power:              { icon: Zap,      color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30', label: 'PWR' },
  hypertrophy:        { icon: Flame,    color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30', label: 'HYP' },
  strength_endurance: { icon: Shield,   color: 'text-teal-400',   bg: 'bg-teal-500/15 border-teal-500/30',  label: 'END' },
  combat:             { icon: Shield,   color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/30', label: 'MAT' },
  rest:               { icon: Battery,  color: 'text-grappler-600', bg: 'bg-grappler-800/40 border-grappler-700/30', label: 'REST' },
};

// ─── Component ───

export default function WeeklyCalendar({
  trainingDays,
  combatTrainingDays,
  currentMesocycle,
  workoutLogs,
}: WeeklyCalendarProps) {
  const today = new Date().getDay(); // 0=Sun

  // Build sessions from current mesocycle week to feed into buildWeekPlan
  const sessions: WorkoutSession[] = useMemo(() => {
    if (!currentMesocycle || currentMesocycle.weeks.length === 0) return [];
    // Determine current week index in the mesocycle
    const startMs = new Date(currentMesocycle.startDate).getTime();
    const nowMs = Date.now();
    const weekIdx = Math.min(
      currentMesocycle.weeks.length - 1,
      Math.max(0, Math.floor((nowMs - startMs) / (7 * 24 * 60 * 60 * 1000)))
    );
    return currentMesocycle.weeks[weekIdx]?.sessions ?? [];
  }, [currentMesocycle]);

  const weekPlan = useMemo(
    () => buildWeekPlan(trainingDays, combatTrainingDays, sessions),
    [trainingDays, combatTrainingDays, sessions]
  );

  // Which days this week already have a completed workout?
  const completedDays = useMemo(() => {
    const now = new Date();
    // Get start of current week (Monday)
    const dayOfWeek = now.getDay(); // 0=Sun
    const diffToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - diffToMon);

    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const done = new Set<number>();
    for (const log of workoutLogs) {
      const d = new Date(log.date);
      if (d >= monday && d <= sunday) {
        done.add(d.getDay());
      }
    }
    return done;
  }, [workoutLogs]);

  return (
    <div className="px-1">
      <div className="grid grid-cols-7 gap-1.5">
        {DAYS_MON_START.map(({ label, idx }) => {
          const dayPlan = weekPlan.days[idx];
          const isToday = idx === today;
          const isDone = completedDays.has(idx);

          // Determine what to show
          let typeKey: string;
          if (dayPlan.isLiftDay && dayPlan.suggestedWorkoutType) {
            typeKey = dayPlan.suggestedWorkoutType;
          } else if (dayPlan.combatTraining) {
            typeKey = 'combat';
          } else {
            typeKey = 'rest';
          }

          // If it's a lift day without a specific type (no mesocycle), show generic lift
          if (dayPlan.isLiftDay && !dayPlan.suggestedWorkoutType) {
            typeKey = 'strength'; // fallback
          }

          const meta = TYPE_META[typeKey] ?? TYPE_META.rest;
          const Icon = meta.icon;

          return (
            <div
              key={idx}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1.5 px-0.5 rounded-lg border transition-all',
                meta.bg,
                isToday && 'ring-1 ring-primary-400/60 shadow-[0_0_8px_rgba(var(--color-primary-400),0.15)]',
                isDone && typeKey !== 'rest' && 'opacity-60',
              )}
            >
              {/* Day label */}
              <span className={cn(
                'text-[10px] font-bold leading-none',
                isToday ? 'text-primary-300' : 'text-grappler-500',
              )}>
                {label}
              </span>

              {/* Icon */}
              <Icon className={cn('w-3.5 h-3.5', meta.color)} />

              {/* Type label */}
              <span className={cn(
                'text-[9px] font-semibold leading-none',
                meta.color,
              )}>
                {meta.label}
              </span>

              {/* Done checkmark */}
              {isDone && typeKey !== 'rest' && (
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              )}
            </div>
          );
        })}
      </div>

      {/* Intensity warning strip */}
      {weekPlan.warnings.length > 0 && (
        <p className="text-[10px] text-amber-400/70 mt-1.5 px-0.5 leading-tight truncate">
          {weekPlan.warnings[0]}
        </p>
      )}
    </div>
  );
}
