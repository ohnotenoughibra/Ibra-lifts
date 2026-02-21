'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, Dumbbell, Shield, Zap, ChevronDown, Trophy, Target,
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
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

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
const JS_TO_MON = [6, 0, 1, 2, 3, 4, 5] as const;

type DayType = 'lift' | 'combat' | 'both' | 'rest' | 'missed' | 'future_active' | 'future_rest';

// ─── Component ───

export default function WeeklyMomentum(props: WeeklyMomentumProps) {
  const [expanded, setExpanded] = useState(false);

  const now = new Date();
  const todayMonIdx = JS_TO_MON[now.getDay()];

  const startOfWeek = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() - todayMonIdx);
    d.setHours(0, 0, 0, 0);
    return d;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayMonIdx]);

  // ─── Per-day breakdown ───
  const days = useMemo(() => {
    const combatDaySet = new Set(props.combatDays.map(c => c.day));
    const liftDaySet = new Set(props.liftDays);

    return DAY_LABELS.map((label, monIdx) => {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(dayDate.getDate() + monIdx);
      const dateStr = dayDate.toDateString();
      const jsDay = dayDate.getDay();
      const isToday = monIdx === todayMonIdx;
      const isFuture = monIdx > todayMonIdx;

      const lifts = props.workoutLogs.filter(l => {
        try { return new Date(l.date).toDateString() === dateStr; } catch { return false; }
      });
      const sessions = props.trainingSessions.filter(s => {
        try { return new Date(s.date).toDateString() === dateStr; } catch { return false; }
      });

      const didLift = lifts.length > 0;
      const didCombat = sessions.length > 0;

      let type: DayType;
      if (isFuture) {
        type = (liftDaySet.has(jsDay) || combatDaySet.has(jsDay)) ? 'future_active' : 'future_rest';
      } else if (didLift && didCombat) {
        type = 'both';
      } else if (didLift) {
        type = 'lift';
      } else if (didCombat) {
        type = 'combat';
      } else if (liftDaySet.has(jsDay) || combatDaySet.has(jsDay)) {
        type = isToday ? 'future_active' : 'missed'; // Today not done yet = still upcoming
      } else {
        type = 'rest';
      }

      return { label, type, isToday, lifts, sessions };
    });
  }, [props.workoutLogs, props.trainingSessions, props.liftDays, props.combatDays, startOfWeek, todayMonIdx]);

  // ─── Smart headline ───
  const bonus = Math.max(0, props.weekDone - props.weekTarget);
  const headline = useMemo(() => {
    const remaining = Math.max(0, props.weekTarget - props.weekDone);
    const pct = props.weekTarget > 0 ? props.weekDone / props.weekTarget : 0;

    if (bonus > 0) return `Going beyond. +${bonus} bonus session${bonus > 1 ? 's' : ''}.`;
    if (pct >= 1) return 'Week complete. Recovery earned.';
    if (remaining === 1 && todayMonIdx >= 4) return 'One more to close out the week.';
    if (remaining === 1) return 'One session away from a full week.';
    if (pct >= 0.75) return 'Almost there. Keep the rhythm.';
    if (props.weekDone === 0 && todayMonIdx <= 1) return 'Clean slate. First session sets the tone.';
    if (props.weekDone === 0 && todayMonIdx >= 3) return `${remaining} sessions — still time to make this week count.`;
    if (todayMonIdx >= 5) return remaining > 0 ? `${remaining} left — don't let the weekend steal your gains.` : 'Strong finish. Enjoy the rest.';
    return `${remaining} to go. Tracking well.`;
  }, [props.weekDone, props.weekTarget, todayMonIdx, bonus]);

  // ─── Volume deltas (for expanded view only) ───
  const volumeDelta = useMemo(() => {
    if (props.lastWeekVolume === 0 || props.weekStats.totalVolume === 0) return null;
    return Math.round(((props.weekStats.totalVolume - props.lastWeekVolume) / props.lastWeekVolume) * 100);
  }, [props.weekStats.totalVolume, props.lastWeekVolume]);

  const combatLoadDelta = useMemo(() => {
    if (props.lastCombatLoad === 0 || props.weekStats.combatLoad === 0) return null;
    return Math.round(((props.weekStats.combatLoad - props.lastCombatLoad) / props.lastCombatLoad) * 100);
  }, [props.weekStats.combatLoad, props.lastCombatLoad]);

  const pct = props.weekTarget > 0 ? Math.min(1, props.weekDone / props.weekTarget) : 0;

  return (
    <div>
      {/* ═══════════════════════════════════════════
          THE PULSE — One glance, one feeling
          ═══════════════════════════════════════════ */}
      <button onClick={() => setExpanded(v => !v)} className="w-full text-left">
        <div className="card p-4 space-y-4">

          {/* Row 1: Progress bar + fraction */}
          <div className="flex items-center gap-3">
            {/* Streak flame */}
            {props.currentStreak > 0 && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-black text-orange-300 tabular-nums">{props.currentStreak}</span>
              </div>
            )}

            {/* The bar */}
            <div className={cn(
              'flex-1 h-3 rounded-full bg-grappler-800 overflow-hidden',
              bonus > 0 && 'ring-1 ring-emerald-400/40 shadow-[0_0_8px_rgba(52,211,153,0.25)]',
            )}>
              <motion.div
                className={cn(
                  'h-full rounded-full',
                  bonus > 0 ? 'bg-gradient-to-r from-emerald-500 via-green-400 to-cyan-400' :
                  pct >= 1 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                  pct >= 0.5 ? 'bg-gradient-to-r from-primary-500 to-primary-400' :
                  'bg-primary-600'
                )}
                initial={{ width: 0 }}
                animate={{ width: `${pct * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>

            <span className="text-sm font-black text-grappler-100 tabular-nums flex-shrink-0">
              {props.weekDone}
              <span className="text-grappler-500 font-medium">/{props.weekTarget}</span>
              {bonus > 0 && (
                <span className="text-emerald-400 font-bold text-xs ml-0.5">+{bonus}</span>
              )}
            </span>
          </div>

          {/* Row 2: Week dots — the rhythm */}
          <div className="flex items-center justify-between px-1">
            {days.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className={cn(
                  'text-[10px] font-semibold',
                  day.isToday ? 'text-primary-400' : 'text-grappler-600'
                )}>
                  {day.label}
                </span>
                <div className="relative">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                    day.type === 'lift' && 'bg-green-500',
                    day.type === 'combat' && 'bg-purple-500',
                    day.type === 'both' && 'bg-gradient-to-br from-green-500 to-purple-500',
                    day.type === 'rest' && 'bg-grappler-800/60',
                    day.type === 'missed' && 'bg-transparent border-2 border-dashed border-amber-500/30',
                    day.type === 'future_active' && 'bg-grappler-800/40 border-2 border-grappler-600/40',
                    day.type === 'future_rest' && 'bg-grappler-800/30',
                    day.isToday && 'ring-2 ring-offset-2 ring-offset-grappler-900 ring-primary-400',
                  )}>
                    {day.type === 'lift' && <Dumbbell className="w-3.5 h-3.5 text-green-950" />}
                    {day.type === 'combat' && <Shield className="w-3.5 h-3.5 text-purple-950" />}
                    {day.type === 'both' && <Zap className="w-3.5 h-3.5 text-white" />}
                    {day.type === 'future_active' && <div className="w-1.5 h-1.5 rounded-full bg-grappler-500" />}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Row 3: Smart headline + expand hint */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-grappler-300">{headline}</p>
            <ChevronDown className={cn(
              'w-4 h-4 text-grappler-600 transition-transform flex-shrink-0 ml-2',
              expanded && 'rotate-180',
            )} />
          </div>
        </div>
      </button>

      {/* ═══════════════════════════════════════════
          EXPANDED — Numbers for the curious
          ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-3 -mt-2 card rounded-t-none border-t-0">

              {/* Highlight row — PRs get celebrated */}
              {props.weekStats.prs > 0 && (
                <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-semibold text-yellow-300">
                    {props.weekStats.prs} PR{props.weekStats.prs !== 1 ? 's' : ''} this week
                  </span>
                </div>
              )}

              {/* Stats — clean vertical list, not cramped grid */}
              <div className="space-y-2">
                {props.weekStats.workouts > 0 && (
                  <StatRow
                    label="Lifting volume"
                    value={props.weekStats.totalVolume > 0 ? `${formatNumber(props.weekStats.totalVolume)} ${props.weightUnit}` : '—'}
                    delta={volumeDelta}
                    icon={<Dumbbell className="w-3.5 h-3.5 text-green-400" />}
                  />
                )}
                {props.weekStats.combatSessions > 0 && (
                  <StatRow
                    label={`${props.weekStats.combatSessions} mat session${props.weekStats.combatSessions !== 1 ? 's' : ''} · ${props.weekStats.combatMinutes}min`}
                    value={props.weekStats.combatLoad > 0 ? `${formatNumber(props.weekStats.combatLoad)} load` : '—'}
                    delta={combatLoadDelta}
                    icon={<Shield className="w-3.5 h-3.5 text-purple-400" />}
                  />
                )}
                {props.weekStats.avgRPE > 0 && (
                  <StatRow
                    label="Avg intensity"
                    value={`RPE ${props.weekStats.avgRPE}`}
                    icon={<Zap className={cn('w-3.5 h-3.5', props.weekStats.avgRPE >= 9 ? 'text-red-400' : props.weekStats.avgRPE >= 7 ? 'text-yellow-400' : 'text-grappler-400')} />}
                  />
                )}
                {props.weekStats.proteinAdherence !== null && props.weekStats.proteinAdherence > 0 && (
                  <StatRow
                    label="Protein adherence"
                    value={`${props.weekStats.proteinAdherence}%`}
                    icon={<Target className={cn('w-3.5 h-3.5', props.weekStats.proteinAdherence >= 80 ? 'text-green-400' : 'text-amber-400')} />}
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Stat Row ───

function StatRow({ label, value, delta, icon }: {
  label: string;
  value: string;
  delta?: number | null;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-7 h-7 rounded-lg bg-grappler-800 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <span className="text-sm text-grappler-400 flex-1">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold text-grappler-100">{value}</span>
        {delta != null && (
          <span className={cn(
            'text-xs font-medium',
            delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-grappler-500',
          )}>
            {delta > 0 ? '↑' : delta < 0 ? '↓' : '→'}{Math.abs(delta)}%
          </span>
        )}
      </div>
    </div>
  );
}
