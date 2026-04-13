'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkoutLog, TrainingSession, WeightUnit, CombatTrainingDay } from '@/lib/types';

// ─── Types ───

interface WeeklyMomentumProps {
  currentStreak: number;
  weekDone: number;
  weekTarget: number;
  liftDays: number[];
  combatDays: CombatTrainingDay[];
  workoutLogs: WorkoutLog[];
  trainingSessions: TrainingSession[];
  weekStats: {
    workouts: number;
    prs: number;
    avgRPE: number;
    totalVolume: number;
    combatSessions: number;
    combatMinutes: number;
    combatLoad: number;
    proteinAdherence: number | null;
  };
  weekTrends: {
    volume: 'up' | 'down' | 'stable';
    prs: 'up' | 'down' | 'stable';
    consistency: 'up' | 'down' | 'stable';
  };
  lastWeekVolume: number;
  lastCombatLoad: number;
  weightUnit: WeightUnit;
  nextBadgeDistance: number | null;
}

const DAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
const JS_TO_MON = [6, 0, 1, 2, 3, 4, 5] as const;

type CellType = 'lift' | 'combat' | 'both' | 'pr' | 'recovery' | 'empty' | 'today_empty';

interface DayCell {
  type: CellType;
  isToday: boolean;
}

// ─── Helpers ───

function getMonday(date: Date): Date {
  const d = new Date(date);
  const monIdx = JS_TO_MON[d.getDay()];
  d.setDate(d.getDate() - monIdx);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// ─── Component ───

export default function WeeklyMomentum(props: WeeklyMomentumProps) {
  const hasAnySessions = props.workoutLogs.length > 0 || props.trainingSessions.length > 0;
  const [expanded, setExpanded] = useState(hasAnySessions);

  const now = new Date();
  const todayKey = dateKey(now);
  const currentMonday = getMonday(now);

  // Build lookup maps from all available data
  const { liftMap, combatMap, prMap } = useMemo(() => {
    const lm = new Map<string, boolean>();
    const cm = new Map<string, boolean>();
    const pm = new Map<string, boolean>();

    for (const log of props.workoutLogs) {
      try {
        const d = new Date(log.date);
        const k = dateKey(d);
        lm.set(k, true);
        if (log.exercises?.some(e => e.personalRecord)) {
          pm.set(k, true);
        }
      } catch { /* skip bad dates */ }
    }

    for (const session of props.trainingSessions) {
      try {
        const d = new Date(session.date);
        cm.set(dateKey(d), true);
      } catch { /* skip bad dates */ }
    }

    return { liftMap: lm, combatMap: cm, prMap: pm };
  }, [props.workoutLogs, props.trainingSessions]);

  // Build 4-week grid (current week at top, oldest at bottom)
  const weeks = useMemo(() => {
    const result: DayCell[][] = [];

    for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
      const weekStart = new Date(currentMonday);
      weekStart.setDate(weekStart.getDate() - weekOffset * 7);
      const row: DayCell[] = [];

      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const cellDate = new Date(weekStart);
        cellDate.setDate(cellDate.getDate() + dayIdx);
        const k = dateKey(cellDate);
        const isToday = k === todayKey;
        const isFuture = cellDate > now;

        if (isFuture) {
          row.push({ type: 'empty', isToday: false });
          continue;
        }

        const lifted = liftMap.has(k);
        const fought = combatMap.has(k);
        const hadPR = prMap.has(k);

        let type: CellType;
        if (hadPR) type = 'pr';
        else if (lifted && fought) type = 'both';
        else if (lifted) type = 'lift';
        else if (fought) type = 'combat';
        else if (isToday) type = 'today_empty';
        else type = 'empty';

        row.push({ type, isToday });
      }

      result.push(row);
    }

    return result;
  }, [currentMonday, todayKey, now, liftMap, combatMap, prMap]);

  // Stats
  const totalBlockSessions = useMemo(() => {
    let count = 0;
    for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
      const weekStart = new Date(currentMonday);
      weekStart.setDate(weekStart.getDate() - weekOffset * 7);
      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const cellDate = new Date(weekStart);
        cellDate.setDate(cellDate.getDate() + dayIdx);
        if (cellDate > now) continue;
        const k = dateKey(cellDate);
        if (liftMap.has(k) || combatMap.has(k)) count++;
      }
    }
    return count;
  }, [currentMonday, now, liftMap, combatMap]);

  const statLine = `${props.weekDone}/${props.weekTarget} this week \u00B7 ${totalBlockSessions} sessions this block`;

  return (
    <div>
      <button onClick={() => setExpanded(v => !v)} className="w-full text-left">
        <div className="card p-4">
          {/* Stat line — always visible */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-grappler-300 tabular-nums tracking-tight">
              {statLine}
            </span>
            <ChevronDown className={cn(
              'w-4 h-4 text-grappler-600 transition-transform flex-shrink-0 ml-2',
              expanded && 'rotate-180',
            )} />
          </div>

          {/* The War Board grid */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-1">
                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {DAY_HEADERS.map((d, i) => (
                      <span key={i} className="text-[10px] font-bold text-grappler-600 text-center uppercase tracking-widest">
                        {d}
                      </span>
                    ))}
                  </div>

                  {/* Week rows — current week first */}
                  {weeks.map((week, weekIdx) => (
                    <motion.div
                      key={weekIdx}
                      className="grid grid-cols-7 gap-1"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: weekIdx * 0.06, duration: 0.25 }}
                    >
                      {week.map((cell, dayIdx) => (
                        <div key={dayIdx} className="flex items-center justify-center">
                          <WarCell cell={cell} />
                        </div>
                      ))}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </button>
    </div>
  );
}

// ─── Cell Renderer ───

function WarCell({ cell }: { cell: DayCell }) {
  const base = 'w-7 h-7 rounded-full transition-all';

  // Today's unfilled — pulse to invite training
  if (cell.type === 'today_empty') {
    return (
      <motion.div
        className={cn(base, 'border-2 border-primary-500')}
        animate={{ boxShadow: ['0 0 0px rgba(99,102,241,0)', '0 0 8px rgba(99,102,241,0.5)', '0 0 0px rgba(99,102,241,0)'] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
    );
  }

  // Empty / rest
  if (cell.type === 'empty') {
    return (
      <div className={cn(base, 'border-2 border-grappler-700', cell.isToday && 'border-primary-500')} />
    );
  }

  // PR day — gold with glow
  if (cell.type === 'pr') {
    return (
      <div className={cn(
        base, 'bg-yellow-400',
        cell.isToday && 'ring-2 ring-primary-500 ring-offset-1 ring-offset-grappler-900',
      )}
        style={{ boxShadow: '0 0 6px rgba(250,204,21,0.5)' }}
      />
    );
  }

  // Dual session — split circle
  if (cell.type === 'both') {
    return (
      <div className={cn(
        base, 'overflow-hidden relative',
        cell.isToday && 'ring-2 ring-primary-500 ring-offset-1 ring-offset-grappler-900',
      )}>
        <div className="absolute inset-0 bg-green-400" style={{ clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' }} />
        <div className="absolute inset-0 bg-purple-400" style={{ clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)' }} />
      </div>
    );
  }

  // Lift
  if (cell.type === 'lift') {
    return (
      <div className={cn(
        base, 'bg-green-400',
        cell.isToday && 'ring-2 ring-primary-500 ring-offset-1 ring-offset-grappler-900',
      )} />
    );
  }

  // Combat
  if (cell.type === 'combat') {
    return (
      <div className={cn(
        base, 'bg-purple-400',
        cell.isToday && 'ring-2 ring-primary-500 ring-offset-1 ring-offset-grappler-900',
      )} />
    );
  }

  // Recovery (blue dot — smaller)
  return (
    <div className="w-7 h-7 flex items-center justify-center">
      <div className={cn(
        'w-3.5 h-3.5 rounded-full bg-blue-400',
        cell.isToday && 'ring-2 ring-primary-500 ring-offset-1 ring-offset-grappler-900',
      )} />
    </div>
  );
}
