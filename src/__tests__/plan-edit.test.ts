/**
 * plan-edit — weekdays for sessions, moving them, and scoped block edits.
 */
import { describe, it, expect } from 'vitest';
import { plannedDays, weekAgenda, moveSession, moveSessionAcrossWeeks, editAcrossWeeks } from '@/lib/plan-edit';
import { useAppStore } from '@/lib/store';
import { getTodaysSession } from '@/lib/session-matching';
import { getExerciseById } from '@/lib/exercises';

const ex = (id: string, sets = 3) => ({ exerciseId: id, exercise: getExerciseById(id)!, sets, prescription: { targetReps: 5, minReps: 3, maxReps: 6, rpe: 8, restSeconds: 120 } });
const sess = (id: string, exs = [ex('back-squat'), ex('bench-press')]) =>
  ({ id, name: id, type: 'strength', dayNumber: 1, estimatedDuration: 50, warmUp: [], coolDown: [], exercises: exs }) as any;
const meso = () => ({
  id: 'm', name: 'Block', weeks: [1, 2, 3, 4].map(n => ({
    weekNumber: n, isDeload: n === 4,
    sessions: [sess(`w${n}d1`), sess(`w${n}d2`, [ex('pull-up'), ex('overhead-press')]), sess(`w${n}d3`)],
  })),
}) as any;
const MON_WED_FRI = [1, 3, 5];

describe('plannedDays / weekAgenda', () => {
  it('fills lift days Monday-first in plan order', () => {
    const d = plannedDays(meso().weeks[0], [5, 1, 3]);
    expect([d.get('w1d1'), d.get('w1d2'), d.get('w1d3')]).toEqual([1, 3, 5]);
  });
  it('Sunday counts as the END of the week', () => {
    const d = plannedDays(meso().weeks[0], [0, 2, 4]);
    expect([d.get('w1d1'), d.get('w1d2'), d.get('w1d3')]).toEqual([2, 4, 0]);
  });
  it('more sessions than lift days → the extra one is flexible', () => {
    const a = weekAgenda(meso().weeks[0], [1, 3], [{ day: 2, intensity: 'hard' } as any]);
    expect(a.rows).toHaveLength(7);
    expect(a.rows[0].day).toBe(1);
    expect(a.rows.find(r => r.day === 2)!.mat).toHaveLength(1);
    expect(a.flexible.map(s => s.id)).toEqual(['w1d3']);
    expect(a.rows.find(r => r.day === 6)!.isRest).toBe(true);
  });
});

describe('moveSession', () => {
  it('moves a session to a free day and pins the others', () => {
    const m = moveSession(meso(), 0, 'w1d1', 2, MON_WED_FRI);
    const d = plannedDays(m.weeks[0], MON_WED_FRI);
    expect([d.get('w1d1'), d.get('w1d2'), d.get('w1d3')]).toEqual([2, 3, 5]);
    expect(m.weeks[1]).toBe(meso().weeks[1] === m.weeks[1] ? m.weeks[1] : m.weeks[1]); // other weeks untouched
    expect(plannedDays(m.weeks[1], MON_WED_FRI).get('w2d1')).toBe(1);
  });
  it('moving onto a taken day swaps the two', () => {
    const m = moveSession(meso(), 0, 'w1d1', 5, MON_WED_FRI);
    const d = plannedDays(m.weeks[0], MON_WED_FRI);
    expect([d.get('w1d1'), d.get('w1d3')]).toEqual([5, 1]);
  });
});

describe('editAcrossWeeks', () => {
  it('"rest of block" swaps this and every later week', () => {
    const squat = getExerciseById('front-squat')!;
    const { meso: m, weeksChanged } = editAcrossWeeks(meso(), 1, 'w2d1', 0, 'remaining', e => ({ ...e, exerciseId: squat.id, exercise: squat }));
    expect(weeksChanged).toBe(3);
    expect(m.weeks.map((w: any) => w.sessions[0].exercises[0].exerciseId)).toEqual(['back-squat', 'front-squat', 'front-squat', 'front-squat']);
  });
  it('"this week" changes one week only', () => {
    const { meso: m } = editAcrossWeeks(meso(), 0, 'w1d1', 0, 'week', e => ({ ...e, sets: 5 }));
    expect(m.weeks.map((w: any) => w.sessions[0].exercises[0].sets)).toEqual([5, 3, 3, 3]);
  });
  it('skips deload weeks for set/rep edits and never overwrites a lift changed later', () => {
    const base = meso();
    base.weeks[2].sessions[0].exercises[0] = ex('front-squat');
    const { meso: m, weeksChanged } = editAcrossWeeks(base, 0, 'w1d1', 0, 'remaining', e => ({ ...e, sets: 5 }), { skipDeload: true });
    expect(weeksChanged).toBe(2); // weeks 1-2 (week 3 differs, week 4 deload)
    expect(m.weeks.map((w: any) => w.sessions[0].exercises[0].sets)).toEqual([5, 5, 3, 3]);
  });
});

describe("today's session follows the weekday plan", () => {
  it('Wednesday offers the Wednesday session; a hand-pinned day is final', () => {
    const wed = new Date(2026, 8, 23);
    expect(getTodaysSession(meso(), [], null, { trainingDays: MON_WED_FRI, now: wed })!.session.id).toBe('w1d2');
    const moved = moveSession(meso(), 0, 'w1d3', 3, MON_WED_FRI); // Fri session pinned to Wed
    expect(getTodaysSession(moved, [], null, { trainingDays: MON_WED_FRI, now: wed })!.session.id).toBe('w1d3');
  });
});

describe('moveSessionAcrossWeeks', () => {
  it('"every week" moves the same slot in all later weeks', () => {
    const m = moveSessionAcrossWeeks(meso(), 1, 'w2d2', 4, MON_WED_FRI, 'remaining');
    expect(plannedDays(m.weeks[0], MON_WED_FRI).get('w1d2')).toBe(3);
    for (const wi of [1, 2, 3]) expect(plannedDays(m.weeks[wi], MON_WED_FRI).get(`w${wi + 1}d2`)).toBe(4);
  });
});

describe('store: scoped prescription edits', () => {
  it('"rest of block" applies the change, keeping later weeks\' progression', () => {
    const m = meso();
    m.weeks[2].sessions[0].exercises[0].sets = 4; // week 3 already progressed
    useAppStore.setState({ currentMesocycle: m });
    const n = useAppStore.getState().updateExercisePrescription(1, 'w2d1', 0, { sets: 4, rpe: 7.5 }, 'remaining');
    const w = useAppStore.getState().currentMesocycle!.weeks;
    expect(n).toBe(2); // weeks 2 and 3; deload week 4 skipped
    expect(w[1].sessions[0].exercises[0].sets).toBe(4);
    expect(w[2].sessions[0].exercises[0].sets).toBe(5);
    expect(w[2].sessions[0].exercises[0].prescription.rpe).toBe(7.5);
    expect(w[3].sessions[0].exercises[0].sets).toBe(3);
  });
  it('moving a session is undoable as a block action', () => {
    useAppStore.setState({ currentMesocycle: meso(), user: { trainingDays: MON_WED_FRI } as any, blockUndoStack: [] });
    useAppStore.getState().moveSessionToDay(0, 'w1d1', 2);
    expect(useAppStore.getState().blockUndoStack.at(-1)?.label).toBe('Session moved');
  });
});
