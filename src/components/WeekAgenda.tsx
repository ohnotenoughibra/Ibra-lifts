'use client';

/**
 * WeekAgenda — the block week as a real week: Mon→Sun rows with the lift
 * session planned for each day, the mat sessions around it, and rest days.
 * Tap a session to open it; ⋯ moves it to another day (this week or every
 * week). "Edit days" changes lift and mat days without rebuilding the block.
 */
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Check, MoreHorizontal, Play, Shield, Settings2, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CombatTrainingDay, Mesocycle, WorkoutSession } from '@/lib/types';
import { weekAgenda, plannedDays, WEEK_ORDER, DAY_SHORT, DAY_LONG, type EditScope } from '@/lib/plan-edit';
import { sessionLegLoad } from '@/lib/mat-aware';
import { getWorkoutTypeUI } from './workout-type-ui';

interface Props {
  mesocycle: Mesocycle;
  /** Raw index into mesocycle.weeks of the week being trained now (-1 = done). */
  currentWeekIndex: number;
  completedSessionIds: Set<string>;
  trainingDays: number[];
  combatTrainingDays: CombatTrainingDay[];
  onOpenSession: (weekIndex: number, sessionId: string) => void;
  onStart: (session: WorkoutSession) => void;
  onMove: (weekIndex: number, sessionId: string, day: number, scope: EditScope) => void;
  onEditLayout: () => void;
  onLogMat: () => void;
}

const MAT_TONE: Record<string, string> = {
  hard: 'text-red-300 bg-red-500/10 border-red-500/25',
  moderate: 'text-purple-300 bg-purple-500/10 border-purple-500/25',
  light: 'text-sky-300 bg-sky-500/10 border-sky-500/25',
};

export default function WeekAgenda({
  mesocycle, currentWeekIndex, completedSessionIds, trainingDays, combatTrainingDays,
  onOpenSession, onStart, onMove, onEditLayout, onLogMat,
}: Props) {
  const sorted = useMemo(() => [...mesocycle.weeks].sort((a, b) => a.weekNumber - b.weekNumber), [mesocycle.weeks]);
  const startPos = Math.max(0, sorted.indexOf(mesocycle.weeks[currentWeekIndex] ?? sorted[0]));
  const [pos, setPos] = useState(startPos);
  const week = sorted[Math.min(pos, sorted.length - 1)];
  const weekIndex = mesocycle.weeks.indexOf(week);
  const isNowWeek = weekIndex === currentWeekIndex;
  const today = new Date().getDay();

  const [moving, setMoving] = useState<string | null>(null);
  const [moveScope, setMoveScope] = useState<EditScope>('week');

  if (!week) return null;
  const { rows, flexible } = weekAgenda(week, trainingDays, combatTrainingDays);
  const days = plannedDays(week, trainingDays);
  const hardMat = new Set(combatTrainingDays.filter(c => c.intensity === 'hard').map(c => c.day));
  const nextUp = week.sessions.find(s => !completedSessionIds.has(s.id));
  const done = week.sessions.filter(s => completedSessionIds.has(s.id)).length;

  const sessionRow = (s: WorkoutSession, day: number | null) => {
    const ui = getWorkoutTypeUI(s.type);
    const Icon = ui.icon;
    const isDone = completedSessionIds.has(s.id);
    const isMoving = moving === s.id;
    const legHeavy = sessionLegLoad(s) >= 0.4;
    const matClash = day != null && legHeavy && (hardMat.has(day) || hardMat.has((day + 1) % 7));
    return (
      <div key={s.id} className="flex-1 min-w-0">
        <div className={cn('flex items-center gap-2 rounded-lg px-2 py-1.5 bg-grappler-800/60', isDone && 'opacity-60')}>
          <button
            onClick={() => onOpenSession(weekIndex, s.id)}
            className="flex items-center gap-2 flex-1 min-w-0 text-left min-h-[36px]"
            data-testid={`agenda-session-${s.id}`}
          >
            <span className={cn('w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 relative', ui.color)}>
              <Icon className="w-3.5 h-3.5" />
              {isDone && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </span>
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-grappler-100 truncate">{s.name}</span>
              <span className="block text-[11px] text-grappler-400 truncate">
                {s.exercises.length} lifts · {s.estimatedDuration}m
                {matClash && <span className="text-amber-400"> · heavy legs near hard mats</span>}
              </span>
            </span>
          </button>
          {!isDone && isNowWeek && s.id === nextUp?.id && (
            <button onClick={() => onStart(s)} className="btn btn-primary btn-sm gap-1 px-2.5 flex-shrink-0" aria-label={`Start ${s.name}`}>
              <Play className="w-3.5 h-3.5" />
            </button>
          )}
          {!isDone && (
            <button
              onClick={() => { setMoving(isMoving ? null : s.id); setMoveScope('week'); }}
              className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                isMoving ? 'bg-primary-500/20 text-primary-300' : 'text-grappler-400 hover:text-grappler-200 hover:bg-grappler-700/60')}
              aria-label={`Move ${s.name} to another day`}
              aria-expanded={isMoving}
              data-testid={`agenda-move-${s.id}`}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          )}
        </div>
        {isMoving && (
          <div className="mt-1.5 rounded-lg border border-grappler-700 bg-grappler-900 p-2 space-y-2" data-testid="move-picker">
            <p className="text-[11px] text-grappler-400">Move <span className="text-grappler-200 font-medium">{s.name}</span> to…</p>
            <div className="grid grid-cols-7 gap-1">
              {WEEK_ORDER.map(d => {
                const occupant = week.sessions.find(o => o.id !== s.id && days.get(o.id) === d);
                const isCurrent = days.get(s.id) === d;
                return (
                  <button
                    key={d}
                    disabled={isCurrent}
                    onClick={() => { onMove(weekIndex, s.id, d, moveScope); setMoving(null); }}
                    className={cn(
                      'h-11 rounded-md text-[11px] font-semibold flex flex-col items-center justify-center leading-tight border',
                      isCurrent ? 'bg-primary-500/20 border-primary-500/40 text-primary-200'
                        : hardMat.has(d) ? 'border-red-500/30 text-grappler-200 hover:bg-grappler-800'
                        : 'border-grappler-700 text-grappler-200 hover:bg-grappler-800',
                    )}
                    aria-label={`${DAY_LONG[d]}${occupant ? ` (swap with ${occupant.name})` : ''}`}
                    data-testid={`move-to-${d}`}
                  >
                    {DAY_SHORT[d]}
                    <span className="text-[11px] font-normal text-grappler-400">{occupant ? '⇄' : hardMat.has(d) ? 'mat' : ''}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex rounded-md bg-grappler-800 p-0.5 text-[11px]" role="radiogroup" aria-label="Apply to">
              {(['week', 'remaining'] as const).map(sc => (
                <button
                  key={sc}
                  role="radio"
                  aria-checked={moveScope === sc}
                  onClick={() => setMoveScope(sc)}
                  className={cn('flex-1 rounded py-1.5 font-medium', moveScope === sc ? 'bg-grappler-600 text-grappler-50' : 'text-grappler-400')}
                >
                  {sc === 'week' ? 'Just this week' : 'Every week from here'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="card p-3" data-testid="week-agenda">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setPos(p => Math.max(0, p - 1)); setMoving(null); }}
            disabled={pos === 0}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-grappler-400 hover:bg-grappler-800 disabled:opacity-30"
            aria-label="Previous week"
          ><ChevronLeft className="w-4 h-4" /></button>
          <div className="text-center min-w-[88px]">
            <p className="text-xs font-bold text-grappler-100" data-testid="agenda-week-label">
              Week {week.weekNumber}{week.isDeload ? ' · Deload' : ''}
            </p>
            <p className="text-[11px] text-grappler-400">{isNowWeek ? 'this week · ' : ''}{done}/{week.sessions.length} done</p>
          </div>
          <button
            onClick={() => { setPos(p => Math.min(sorted.length - 1, p + 1)); setMoving(null); }}
            disabled={pos >= sorted.length - 1}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-grappler-400 hover:bg-grappler-800 disabled:opacity-30"
            aria-label="Next week"
          ><ChevronRight className="w-4 h-4" /></button>
        </div>
        <button onClick={onEditLayout} className="btn btn-ghost btn-sm gap-1 text-grappler-300" data-testid="edit-layout">
          <Settings2 className="w-3.5 h-3.5" /> Edit days
        </button>
      </div>

      <div className="divide-y divide-grappler-800/80">
        {rows.map(r => {
          const isToday = isNowWeek && r.day === today;
          return (
            <div key={r.day} className={cn('flex items-start gap-2 py-1.5', isToday && 'bg-primary-500/[0.06] -mx-3 px-3')} data-testid={`agenda-day-${r.day}`}>
              <div className="w-10 pt-2 flex-shrink-0">
                <p className={cn('text-xs font-bold', isToday ? 'text-primary-300' : 'text-grappler-300')}>{DAY_SHORT[r.day]}</p>
                {isToday && <p className="text-[11px] uppercase font-bold text-primary-400">today</p>}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                {r.sessions.map(s => sessionRow(s, r.day))}
                {r.mat.map((m, i) => (
                  <button
                    key={`mat-${i}`}
                    onClick={onLogMat}
                    className={cn('w-full flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs min-h-[36px]', MAT_TONE[m.intensity])}
                  >
                    <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="font-medium">{m.label || 'Mats'}</span>
                    <span className="opacity-80 capitalize">· {m.intensity}</span>
                  </button>
                ))}
                {r.isRest && (
                  <p className="flex items-center gap-1.5 pt-2 text-xs text-grappler-500"><Moon className="w-3 h-3" /> Rest</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {flexible.length > 0 && (
        <div className="mt-2 pt-2 border-t border-grappler-800">
          <p className="text-[11px] text-grappler-400 mb-1">
            Flexible — more sessions than lift days. Do it any day, or <button onClick={onEditLayout} className="underline text-grappler-300">add a lift day</button>.
          </p>
          <div className="space-y-1">{flexible.map(s => sessionRow(s, null))}</div>
        </div>
      )}
    </div>
  );
}
