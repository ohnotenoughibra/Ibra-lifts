'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, Dumbbell, Shield, Moon, TrendingUp, TrendingDown,
  Minus, Award, ChevronDown, Target, Zap,
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import type { WorkoutLog, TrainingSession, WeightUnit, CombatTrainingDay } from '@/lib/types';

// ─── Types ───

interface WeeklyMomentumProps {
  currentStreak: number;
  weekDone: number;
  weekTarget: number;
  /** 0=Sun … 6=Sat planned lift days */
  liftDays: number[];
  /** planned combat days */
  combatDays: CombatTrainingDay[];
  workoutLogs: WorkoutLog[];
  trainingSessions: TrainingSession[];
  /** Synthesis stats from weekly-synthesis engine */
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

// ─── Day label config ───

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
// Map JS day (0=Sun) → our Monday-based index (0=Mon)
const JS_TO_MON = [6, 0, 1, 2, 3, 4, 5] as const;

type DayActivity = 'lift' | 'combat' | 'both' | 'rest_planned' | 'rest_unplanned' | 'future_lift' | 'future_combat' | 'future_rest';

// ─── Component ───

export default function WeeklyMomentum(props: WeeklyMomentumProps) {
  const [expanded, setExpanded] = useState(false);

  const now = new Date();
  const todayJsDay = now.getDay(); // 0=Sun … 6=Sat
  const todayMonIdx = JS_TO_MON[todayJsDay];

  // Build Mon-based week start
  const startOfWeek = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() - todayMonIdx);
    d.setHours(0, 0, 0, 0);
    return d;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayMonIdx]);

  // ─── Per-day activity ───
  const dayActivities: { label: string; activity: DayActivity; detail: string; isToday: boolean; rpe?: number }[] = useMemo(() => {
    const combatDaySet = new Set(props.combatDays.map(c => c.day));
    const liftDaySet = new Set(props.liftDays);

    return DAY_LABELS.map((label, monIdx) => {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(dayDate.getDate() + monIdx);
      const dateStr = dayDate.toDateString();
      const jsDay = dayDate.getDay(); // 0=Sun … 6=Sat

      const isToday = monIdx === todayMonIdx;
      const isFuture = monIdx > todayMonIdx;

      // Find actual activity
      const lifts = props.workoutLogs.filter(l => {
        try { return new Date(l.date).toDateString() === dateStr; } catch { return false; }
      });
      const sessions = props.trainingSessions.filter(s => {
        try { return new Date(s.date).toDateString() === dateStr; } catch { return false; }
      });

      const didLift = lifts.length > 0;
      const didCombat = sessions.length > 0;
      const avgRpe = didLift && lifts.length > 0
        ? Math.round(lifts.reduce((s, l) => s + (l.overallRPE || 0), 0) / lifts.length * 10) / 10
        : undefined;

      if (isFuture) {
        const plannedLift = liftDaySet.has(jsDay);
        const plannedCombat = combatDaySet.has(jsDay);
        if (plannedLift && plannedCombat) return { label, activity: 'future_lift' as const, detail: 'Lift + Mat', isToday, rpe: undefined };
        if (plannedLift) return { label, activity: 'future_lift' as const, detail: 'Lift day', isToday, rpe: undefined };
        if (plannedCombat) return { label, activity: 'future_combat' as const, detail: 'Mat day', isToday, rpe: undefined };
        return { label, activity: 'future_rest' as const, detail: 'Rest', isToday, rpe: undefined };
      }

      if (didLift && didCombat) return { label, activity: 'both' as const, detail: `Lift + Mat${avgRpe ? ` · RPE ${avgRpe}` : ''}`, isToday, rpe: avgRpe };
      if (didLift) return { label, activity: 'lift' as const, detail: `${lifts[0].exercises?.length || 0} exercises${avgRpe ? ` · RPE ${avgRpe}` : ''}`, isToday, rpe: avgRpe };
      if (didCombat) {
        const totalMins = sessions.reduce((s, t) => s + (t.duration || 0), 0);
        return { label, activity: 'combat' as const, detail: `${totalMins}min on the mats`, isToday, rpe: undefined };
      }

      // Rest day — was it planned?
      const wasPlannedRest = !liftDaySet.has(jsDay) && !combatDaySet.has(jsDay);
      return {
        label,
        activity: wasPlannedRest ? 'rest_planned' as const : 'rest_unplanned' as const,
        detail: wasPlannedRest ? 'Rest' : 'Missed',
        isToday,
        rpe: undefined,
      };
    });
  }, [props.workoutLogs, props.trainingSessions, props.liftDays, props.combatDays, startOfWeek, todayMonIdx]);

  // ─── Pace calculation ───
  const paceInfo = useMemo(() => {
    // How many sessions should be done by end of today based on schedule
    const combatDaySet = new Set(props.combatDays.map(c => c.day));
    const liftDaySet = new Set(props.liftDays);
    let expectedByNow = 0;
    for (let monIdx = 0; monIdx <= todayMonIdx; monIdx++) {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(dayDate.getDate() + monIdx);
      const jsDay = dayDate.getDay();
      if (liftDaySet.has(jsDay)) expectedByNow++;
      if (combatDaySet.has(jsDay)) expectedByNow++;
    }

    const diff = props.weekDone - expectedByNow;
    const remaining = Math.max(0, props.weekTarget - props.weekDone);
    if (diff > 0) return { status: 'ahead' as const, text: `${diff} ahead`, color: 'text-green-400' };
    if (diff < 0 && props.weekDone === 0) return { status: 'fresh' as const, text: `${remaining} to go`, color: 'text-grappler-400' };
    if (diff < 0) return { status: 'behind' as const, text: `${remaining} to go`, color: 'text-amber-400' };
    return { status: 'on_track' as const, text: 'On pace', color: 'text-primary-400' };
  }, [props.weekDone, props.liftDays, props.combatDays, todayMonIdx, startOfWeek]);

  // ─── Adaptive one-liner ───
  const adaptiveInsight = useMemo(() => {
    const weekRemaining = Math.max(0, props.weekTarget - props.weekDone);
    const dayOfWeek = todayMonIdx; // 0=Mon … 6=Sun

    // Weekend synthesis
    if (dayOfWeek >= 5) {
      if (props.weekDone >= props.weekTarget) return 'Full send this week. Recovery is earned.';
      if (weekRemaining === 1) return '1 session from a perfect week. Finish strong.';
      return `${weekRemaining} sessions left — don't let the weekend steal your gains.`;
    }
    // Mid-week pace check (Wed/Thu)
    if (dayOfWeek >= 2 && dayOfWeek <= 3) {
      if (paceInfo.status === 'ahead') return 'Ahead of pace — momentum is everything.';
      if (paceInfo.status === 'behind') return 'Behind pace. Today matters more than you think.';
      return 'Tracking perfectly. Keep the rhythm.';
    }
    // Early week motivation (Mon/Tue)
    if (props.weekDone === 0) return 'Clean slate. First session sets the tone for the week.';
    if (props.weekDone === 1) return 'Day 1 done. Consistency beats intensity.';
    return paceInfo.text;
  }, [props.weekDone, props.weekTarget, todayMonIdx, paceInfo]);

  // ─── Volume delta ───
  const volumeDelta = useMemo(() => {
    if (props.lastWeekVolume === 0 || props.weekStats.totalVolume === 0) return null;
    const pct = Math.round(((props.weekStats.totalVolume - props.lastWeekVolume) / props.lastWeekVolume) * 100);
    return pct;
  }, [props.weekStats.totalVolume, props.lastWeekVolume]);

  // ─── Combat load delta (sRPE: duration × RPE) ───
  const combatLoadDelta = useMemo(() => {
    if (props.lastCombatLoad === 0 || props.weekStats.combatLoad === 0) return null;
    return Math.round(((props.weekStats.combatLoad - props.lastCombatLoad) / props.lastCombatLoad) * 100);
  }, [props.weekStats.combatLoad, props.lastCombatLoad]);

  // ─── Day cell styling ───
  const getDayStyle = (activity: DayActivity, isToday: boolean) => {
    const base = isToday ? 'ring-2 ring-primary-400/60' : '';
    switch (activity) {
      case 'lift': return { bg: 'bg-green-500', icon: Dumbbell, iconColor: 'text-green-900', base };
      case 'combat': return { bg: 'bg-purple-500', icon: Shield, iconColor: 'text-purple-900', base };
      case 'both': return { bg: 'bg-gradient-to-br from-green-500 to-purple-500', icon: Zap, iconColor: 'text-white', base };
      case 'rest_planned': return { bg: 'bg-grappler-700/60', icon: Moon, iconColor: 'text-grappler-500', base };
      case 'rest_unplanned': return { bg: 'bg-transparent border-2 border-dashed border-amber-500/40', icon: null, iconColor: '', base };
      case 'future_lift': return { bg: 'bg-green-500/15 border border-green-500/30', icon: Dumbbell, iconColor: 'text-green-500/50', base };
      case 'future_combat': return { bg: 'bg-purple-500/15 border border-purple-500/30', icon: Shield, iconColor: 'text-purple-500/50', base };
      case 'future_rest': return { bg: 'bg-grappler-800/40', icon: null, iconColor: '', base };
    }
  };

  const TrendIcon = props.weekTrends.volume === 'up' ? TrendingUp : props.weekTrends.volume === 'down' ? TrendingDown : Minus;
  const trendColor = props.weekTrends.volume === 'up' ? 'text-green-400' : props.weekTrends.volume === 'down' ? 'text-red-400' : 'text-grappler-500';

  return (
    <div className="space-y-2">
      {/* ─── Compact Strip ─── */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full"
      >
        <div className="flex items-center gap-2 px-1">
          {/* Streak */}
          {props.currentStreak > 0 && (
            <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg px-2.5 py-1.5 flex-shrink-0">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-xs font-bold text-orange-300">{props.currentStreak}</span>
            </div>
          )}

          {/* 7-day rhythm bar */}
          <div className="flex-1 flex items-center gap-1 bg-grappler-800/60 border border-grappler-700/50 rounded-lg px-2 py-1.5">
            <div className="flex gap-1 flex-1">
              {dayActivities.map((day, i) => {
                const style = getDayStyle(day.activity, day.isToday);
                return (
                  <div key={i} className="flex flex-col items-center gap-0.5 flex-1">
                    <span className={cn('text-[8px] font-medium', day.isToday ? 'text-primary-400' : 'text-grappler-600')}>{day.label}</span>
                    <div className={cn(
                      'w-5 h-5 rounded-md flex items-center justify-center transition-all',
                      style.bg, style.base,
                    )}>
                      {style.icon && <style.icon className={cn('w-2.5 h-2.5', style.iconColor)} />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Score + pace + days left */}
            <div className="flex flex-col items-end pl-2 border-l border-grappler-700/50 min-w-[44px]">
              <span className="text-xs font-bold text-grappler-100">{props.weekDone}/{props.weekTarget}</span>
              <span className={cn('text-[9px] font-medium', paceInfo.color)}>
                {paceInfo.status === 'on_track' ? 'On pace' : paceInfo.status === 'ahead' ? '↑ Ahead' : paceInfo.status === 'fresh' ? 'Fresh week' : `${Math.max(0, props.weekTarget - props.weekDone)} to go`}
              </span>
              {todayMonIdx < 6 && (
                <span className="text-[8px] text-grappler-600">{6 - todayMonIdx}d left</span>
              )}
            </div>
          </div>

          {/* Next milestone */}
          {props.nextBadgeDistance != null && props.nextBadgeDistance <= 5 && (
            <div className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg px-2.5 py-1.5 flex-shrink-0">
              <Award className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs text-purple-300">{props.nextBadgeDistance}</span>
            </div>
          )}

          <ChevronDown className={cn('w-3.5 h-3.5 text-grappler-600 flex-shrink-0 transition-transform', expanded && 'rotate-180')} />
        </div>

        {/* Adaptive insight */}
        <p className="text-xs text-grappler-400 mt-1.5 px-1 text-left">{adaptiveInsight}</p>
      </button>

      {/* ─── Expanded Scorecard ─── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="card p-4 space-y-3">
              {/* Day detail row */}
              <div className="grid grid-cols-7 gap-1.5">
                {dayActivities.map((day, i) => {
                  const style = getDayStyle(day.activity, day.isToday);
                  const isFuture = day.activity.startsWith('future');
                  return (
                    <div key={i} className={cn(
                      'flex flex-col items-center gap-1 rounded-lg py-2 px-1',
                      day.isToday ? 'bg-primary-500/10 border border-primary-500/20' : 'bg-grappler-800/40',
                    )}>
                      <span className={cn('text-[9px] font-semibold', day.isToday ? 'text-primary-400' : 'text-grappler-500')}>
                        {day.label}
                      </span>
                      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', style.bg, style.base)}>
                        {style.icon && <style.icon className={cn('w-3.5 h-3.5', style.iconColor)} />}
                      </div>
                      {day.rpe && !isFuture && (
                        <span className={cn(
                          'text-[8px] font-bold',
                          day.rpe >= 9 ? 'text-red-400' : day.rpe >= 7 ? 'text-yellow-400' : 'text-green-400'
                        )}>{day.rpe}</span>
                      )}
                      {isFuture && (
                        <span className="text-[8px] text-grappler-600">—</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Stats grid */}
              <div className={cn(
                'grid gap-2 text-center',
                props.weekStats.totalVolume > 0 && props.weekStats.combatLoad > 0
                  ? 'grid-cols-6'
                  : props.weekStats.combatSessions > 0
                    ? 'grid-cols-5'
                    : 'grid-cols-4'
              )}>
                <div>
                  <p className="text-lg font-bold text-primary-400">{props.weekStats.workouts}</p>
                  <p className="text-xs text-grappler-400">Lifts</p>
                </div>
                {props.weekStats.combatSessions > 0 && (
                  <div>
                    <p className="text-lg font-bold text-purple-400">{props.weekStats.combatSessions}</p>
                    <p className="text-xs text-grappler-400">Mat</p>
                  </div>
                )}
                <div>
                  <p className="text-lg font-bold text-yellow-400">{props.weekStats.prs}</p>
                  <p className="text-xs text-grappler-400">PRs</p>
                </div>
                <div>
                  <p className={cn('text-lg font-bold', props.weekStats.avgRPE >= 9 ? 'text-red-400' : props.weekStats.avgRPE >= 7 ? 'text-yellow-400' : 'text-grappler-100')}>
                    {props.weekStats.avgRPE > 0 ? props.weekStats.avgRPE : '—'}
                  </p>
                  <p className="text-xs text-grappler-400">Avg RPE</p>
                </div>
                <div>
                  {props.weekStats.totalVolume > 0 ? (
                    <>
                      <div className="flex items-center justify-center gap-1">
                        <p className="text-lg font-bold text-grappler-100">
                          {formatNumber(props.weekStats.totalVolume)}
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-0.5">
                        <p className="text-xs text-grappler-400">{props.weightUnit}</p>
                        {volumeDelta !== null && (
                          <span className={cn('text-[9px] font-medium', volumeDelta > 0 ? 'text-green-400' : volumeDelta < 0 ? 'text-red-400' : 'text-grappler-500')}>
                            {volumeDelta > 0 ? '+' : ''}{volumeDelta}%
                          </span>
                        )}
                      </div>
                    </>
                  ) : props.weekStats.combatLoad > 0 ? (
                    <>
                      <div className="flex items-center justify-center gap-1">
                        <p className="text-lg font-bold text-purple-400">
                          {formatNumber(props.weekStats.combatLoad)}
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-0.5">
                        <p className="text-xs text-grappler-400">load</p>
                        {combatLoadDelta !== null && (
                          <span className={cn('text-[9px] font-medium', combatLoadDelta > 0 ? 'text-green-400' : combatLoadDelta < 0 ? 'text-red-400' : 'text-grappler-500')}>
                            {combatLoadDelta > 0 ? '+' : ''}{combatLoadDelta}%
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-bold text-grappler-100">—</p>
                      <p className="text-xs text-grappler-400">volume</p>
                    </>
                  )}
                </div>
                {/* Combat load (shown alongside lifting volume when both exist) */}
                {props.weekStats.totalVolume > 0 && props.weekStats.combatLoad > 0 && (
                  <div>
                    <div className="flex items-center justify-center gap-1">
                      <p className="text-lg font-bold text-purple-400">
                        {formatNumber(props.weekStats.combatLoad)}
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-0.5">
                      <p className="text-xs text-grappler-400">load</p>
                      {combatLoadDelta !== null && (
                        <span className={cn('text-[9px] font-medium', combatLoadDelta > 0 ? 'text-green-400' : combatLoadDelta < 0 ? 'text-red-400' : 'text-grappler-500')}>
                          {combatLoadDelta > 0 ? '+' : ''}{combatLoadDelta}%
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Trends + protein */}
              <div className="flex items-center gap-3 pt-2 border-t border-grappler-700/40">
                {props.weekStats.workouts > 0 ? (
                  <div className="flex items-center gap-1">
                    <TrendIcon className={cn('w-3 h-3', trendColor)} />
                    <span className={cn('text-xs font-medium', trendColor)}>
                      Volume {props.weekTrends.volume === 'up' ? '↑' : props.weekTrends.volume === 'down' ? '↓' : '→'}
                    </span>
                  </div>
                ) : props.weekStats.combatLoad > 0 ? (
                  <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-purple-400" />
                    <span className="text-xs font-medium text-purple-400">
                      Mat load {combatLoadDelta !== null ? (combatLoadDelta > 0 ? '↑' : combatLoadDelta < 0 ? '↓' : '→') : '→'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Minus className="w-3 h-3 text-grappler-600" />
                    <span className="text-xs text-grappler-600">Volume —</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Target className="w-3 h-3 text-grappler-500" />
                  <span className="text-xs text-grappler-400">
                    Protein {props.weekStats.proteinAdherence !== null && props.weekStats.proteinAdherence > 0 ? `${props.weekStats.proteinAdherence}%` : '—'}
                  </span>
                </div>
                {props.weekTrends.consistency !== 'stable' && props.weekStats.workouts > 0 && (
                  <div className="flex items-center gap-1">
                    <span className={cn('text-xs font-medium', props.weekTrends.consistency === 'up' ? 'text-green-400' : 'text-amber-400')}>
                      Consistency {props.weekTrends.consistency === 'up' ? '↑' : '↓'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
