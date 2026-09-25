/**
 * plan-edit — precise, scoped edits to a block (mesocycle).
 *
 * Before: swapping an exercise or changing sets/reps edited ONE week and the
 * rest of the block silently kept the old version; sessions had no weekday,
 * so "W2/D1" never said Monday and nothing could be moved.
 *
 *   plannedDayOf()      weekday of a session: explicit (moved) or from the
 *                       athlete's lift days in plan order
 *   weekAgenda()        Mon→Sun rows: lift sessions, mat sessions, rest
 *   moveSession()       put a session on another weekday (swaps if taken)
 *   editAcrossWeeks()   apply an exercise edit to this week or the rest of the block
 */
import type { CombatTrainingDay, Mesocycle, MesocycleWeek, WorkoutSession, ExercisePrescription } from './types';

export type EditScope = 'week' | 'remaining';

/** Monday-first weekday order (0 = Sun … 6 = Sat in JS). */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const byWeekOrder = (a: number, b: number) => WEEK_ORDER.indexOf(a) - WEEK_ORDER.indexOf(b);

/**
 * Weekday for each session of a week. Explicit `plannedDay` (the athlete
 * moved it) wins; the rest fill the athlete's lift days in plan order,
 * skipping days already taken. Sessions beyond the lift days stay unplanned
 * (null → "Flexible").
 */
export function plannedDays(week: Pick<MesocycleWeek, 'sessions'>, trainingDays: number[] | undefined): Map<string, number | null> {
  const out = new Map<string, number | null>();
  const taken = new Set<number>();
  for (const s of week.sessions) {
    if (typeof s.plannedDay === 'number') { out.set(s.id, s.plannedDay); taken.add(s.plannedDay); }
  }
  const free = [...(trainingDays ?? [])].filter(d => !taken.has(d)).sort(byWeekOrder);
  for (const s of week.sessions) {
    if (out.has(s.id)) continue;
    const d = free.shift();
    out.set(s.id, d === undefined ? null : d);
  }
  return out;
}

export function plannedDayOf(week: Pick<MesocycleWeek, 'sessions'>, sessionId: string, trainingDays: number[] | undefined): number | null {
  return plannedDays(week, trainingDays).get(sessionId) ?? null;
}

export interface AgendaRow {
  day: number;
  sessions: WorkoutSession[];
  mat: CombatTrainingDay[];
  isRest: boolean;
}

/** Seven rows Mon→Sun for one block week, plus sessions without a day. */
export function weekAgenda(
  week: Pick<MesocycleWeek, 'sessions'>,
  trainingDays: number[] | undefined,
  combatTrainingDays: CombatTrainingDay[] | undefined,
): { rows: AgendaRow[]; flexible: WorkoutSession[] } {
  const days = plannedDays(week, trainingDays);
  const rows = WEEK_ORDER.map(day => {
    const sessions = week.sessions.filter(s => days.get(s.id) === day);
    const mat = (combatTrainingDays ?? []).filter(c => c.day === day);
    return { day, sessions, mat, isRest: sessions.length === 0 && mat.length === 0 };
  });
  return { rows, flexible: week.sessions.filter(s => days.get(s.id) == null) };
}

/**
 * Move a session to `day` in its week. A session already on that day swaps
 * onto the moved session's old day, so the week keeps one session per day.
 * All other sessions are pinned to their current day so nothing else shifts.
 */
export function moveSession(meso: Mesocycle, weekIndex: number, sessionId: string, day: number, trainingDays: number[] | undefined): Mesocycle {
  const week = meso.weeks[weekIndex];
  if (!week) return meso;
  const current = plannedDays(week, trainingDays);
  const from = current.get(sessionId);
  const sessions = week.sessions.map(s => {
    if (s.id === sessionId) return { ...s, plannedDay: day };
    const d = current.get(s.id);
    if (d === day) return { ...s, plannedDay: from ?? undefined };
    return typeof d === 'number' ? { ...s, plannedDay: d } : s;
  });
  const weeks = meso.weeks.map((w, i) => (i === weekIndex ? { ...w, sessions } : w));
  return { ...meso, weeks, updatedAt: new Date().toISOString() };
}

/**
 * Move a session in this week, or in this week and every later week (the
 * session at the same position in the week). "Every week" is how you say
 * "legs are on Thursday now" without changing your lift days.
 */
export function moveSessionAcrossWeeks(
  meso: Mesocycle, weekIndex: number, sessionId: string, day: number,
  trainingDays: number[] | undefined, scope: EditScope = 'week',
): Mesocycle {
  const pos = meso.weeks[weekIndex]?.sessions.findIndex(s => s.id === sessionId) ?? -1;
  if (pos < 0) return meso;
  let out = moveSession(meso, weekIndex, sessionId, day, trainingDays);
  if (scope === 'remaining') {
    for (let wi = weekIndex + 1; wi < meso.weeks.length; wi++) {
      const target = out.weeks[wi]?.sessions[pos];
      if (target) out = moveSession(out, wi, target.id, day, trainingDays);
    }
  }
  return out;
}

/**
 * Apply `edit` to an exercise in this week, or this week and every later
 * week. Later weeks are matched by the session's position in the week and
 * the exercise's CURRENT id (so a lift you already changed in week 4 isn't
 * overwritten). `skipDeload` keeps deload weeks' lighter prescriptions.
 */
export function editAcrossWeeks(
  meso: Mesocycle,
  weekIndex: number,
  sessionId: string,
  exerciseIndex: number,
  scope: EditScope,
  edit: (ex: ExercisePrescription) => ExercisePrescription,
  opts: { skipDeload?: boolean } = {},
): { meso: Mesocycle; weeksChanged: number } {
  const week = meso.weeks[weekIndex];
  const pos = week?.sessions.findIndex(s => s.id === sessionId) ?? -1;
  const original = week?.sessions[pos]?.exercises[exerciseIndex];
  if (!week || pos < 0 || !original) return { meso, weeksChanged: 0 };
  let weeksChanged = 0;
  const weeks = meso.weeks.map((w, wi) => {
    if (wi < weekIndex || (scope === 'week' && wi !== weekIndex)) return w;
    if (wi !== weekIndex && opts.skipDeload && w.isDeload) return w;
    const session = w.sessions[pos];
    if (!session) return w;
    let idx = wi === weekIndex ? exerciseIndex : session.exercises.findIndex(e => e.exerciseId === original.exerciseId);
    if (idx < 0) return w;
    if (wi !== weekIndex && session.exercises[idx].exerciseId !== original.exerciseId) idx = -1;
    if (idx < 0) return w;
    weeksChanged++;
    const exercises = session.exercises.map((e, i) => (i === idx ? edit(e) : e));
    const sessions = w.sessions.map((s, si) => (si === pos ? { ...s, exercises } : s));
    return { ...w, sessions };
  });
  return { meso: { ...meso, weeks, updatedAt: new Date().toISOString() }, weeksChanged };
}
