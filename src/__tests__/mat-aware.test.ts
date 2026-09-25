/**
 * mat-aware — the mat schedule shapes the lifting next to it.
 */
import { describe, it, expect } from 'vitest';
import { matContext, sessionLegLoad, pickTodaysSession, planMatAdjustment } from '@/lib/mat-aware';
import { getExerciseById } from '@/lib/exercises';

// Wednesday 2026-09-23, 10:00 local
const WED = new Date(2026, 8, 23, 10, 0);
const presc = (id: string, sets: number, rpe = 8) => ({
  exerciseId: id, exercise: getExerciseById(id)!, sets,
  prescription: { targetReps: 5, minReps: 3, maxReps: 6, rpe, restSeconds: 180 },
});
const session = (name: string, ex: ReturnType<typeof presc>[]) =>
  ({ id: name, name, type: 'strength', dayNumber: 1, estimatedDuration: 50, warmUp: [], coolDown: [], exercises: ex }) as any;

const legs = session('Legs', [presc('back-squat', 4), presc('romanian-deadlift', 3), presc('farmers-walk', 3), presc('pull-up', 3)]);
const upper = session('Upper', [presc('bench-press', 4), presc('pull-up', 4), presc('overhead-press', 3), presc('dumbbell-curl', 3)]);

describe('matContext', () => {
  it('reads the weekly schedule around today', () => {
    const ctx = matContext({ user: { combatTrainingDays: [{ day: 4, intensity: 'hard' }] } as any, now: WED });
    expect(ctx).toMatchObject({ hardTomorrow: true, hardToday: false, hardYesterday: false, label: 'Hard sparring tomorrow' });
  });
  it('counts a logged hard session yesterday; deleted and light ones do not count', () => {
    const tue = new Date(2026, 8, 22, 19);
    const ctx = matContext({ user: null, now: WED, trainingSessions: [
      { id: 'a', date: tue, category: 'grappling', type: 'bjj_nogi', plannedIntensity: 'hard_sparring', duration: 90, perceivedExertion: 9 } as any,
    ] });
    expect(ctx.hardYesterday).toBe(true);
    const ctx2 = matContext({ user: null, now: WED, trainingSessions: [
      { id: 'b', date: tue, category: 'grappling', type: 'bjj_nogi', plannedIntensity: 'hard_sparring', _deleted: true } as any,
      { id: 'c', date: tue, category: 'grappling', type: 'bjj_nogi', plannedIntensity: 'light_flow' } as any,
    ] });
    expect(ctx2.hardYesterday).toBe(false);
  });
  it('finds the next competition', () => {
    const ctx = matContext({ user: null, now: WED, competitions: [
      { id: 'x', date: new Date(2026, 8, 26), isActive: true } as any,
      { id: 'old', date: new Date(2026, 8, 1), isActive: true } as any,
    ] });
    expect(ctx.daysToCompetition).toBe(3);
    expect(ctx.label).toBe('Competition in 3 days');
  });
});

describe('sessionLegLoad / pickTodaysSession', () => {
  it('scores leg-heavy sessions higher', () => {
    expect(sessionLegLoad(legs)).toBeGreaterThan(0.4);
    expect(sessionLegLoad(upper)).toBe(0);
  });
  it('next to hard mats, the lighter-legs session moves up', () => {
    const ctx = matContext({ user: { combatTrainingDays: [{ day: 4, intensity: 'hard' }] } as any, now: WED });
    const pick = pickTodaysSession([{ session: legs }, { session: upper }], ctx)!;
    expect(pick.entry.session.name).toBe('Upper');
    expect(pick.reason).toMatch(/Hard sparring tomorrow/);
  });
  it('without hard mats the plan order stands', () => {
    const ctx = matContext({ user: { combatTrainingDays: [{ day: 4, intensity: 'light' }] } as any, now: WED });
    expect(pickTodaysSession([{ session: legs }, { session: upper }], ctx)!.entry.session.name).toBe('Legs');
  });
});

describe('planMatAdjustment', () => {
  it('fight week: about half the volume, RPE capped at 8, main lifts keep 2+ sets', () => {
    const ctx = matContext({ user: null, now: WED, competitions: [{ id: 'x', date: new Date(2026, 8, 27), isActive: true } as any] });
    const p = planMatAdjustment(legs, ctx)!;
    expect(p.kind).toBe('taper');
    const total = (s: any) => s.exercises.reduce((n: number, e: any) => n + e.sets, 0);
    expect(total(p.session)).toBeLessThanOrEqual(Math.ceil(total(legs) * 0.6));
    expect(p.session.exercises[0].sets).toBeGreaterThanOrEqual(2);
    expect(p.session.exercises.every((e: any) => e.prescription.rpe <= 8)).toBe(true);
  });
  it('2 days out: heavy legs capped at RPE 7', () => {
    const ctx = matContext({ user: null, now: WED, competitions: [{ id: 'x', date: new Date(2026, 8, 25), isActive: true } as any] });
    expect(planMatAdjustment(legs, ctx)!.session.exercises[0].prescription.rpe).toBe(7);
  });
  it('hard sparring tomorrow: legs & grip −1 set, upper body untouched', () => {
    const ctx = matContext({ user: { combatTrainingDays: [{ day: 4, intensity: 'hard' }] } as any, now: WED });
    const p = planMatAdjustment(legs, ctx)!;
    expect(p.kind).toBe('mat');
    expect(p.session.exercises[0].sets).toBe(3);      // squat 4 → 3
    expect(p.session.exercises[3].sets).toBe(3);      // pull-up untouched
    expect(planMatAdjustment(upper, ctx)).toBeNull();  // nothing to ease
  });
  it('quiet week: no change', () => {
    expect(planMatAdjustment(legs, matContext({ user: null, now: WED }))).toBeNull();
  });
});

describe('store.startWorkout applies it, and "Train as planned" undoes it', async () => {
  const { useAppStore } = await import('@/lib/store');
  it('fight week tapers the started session; undo restores the plan', () => {
    const inFour = new Date(); inFour.setDate(inFour.getDate() + 4);
    useAppStore.setState({
      user: { id: 'u', weightUnit: 'kg', experienceLevel: 'beginner', bodyWeightKg: 80, combatTrainingDays: [] } as any,
      workoutLogs: [], trainingSessions: [], activeWorkout: null, injuryLog: [], currentMesocycle: null,
      competitions: [{ id: 'c', name: 'Open', type: 'bjj', date: inFour, isActive: true, peakingWeeks: 2 } as any],
    });
    useAppStore.getState().startWorkout(legs);
    const aw = useAppStore.getState().activeWorkout!;
    expect(aw.matAdjust?.kind).toBe('taper');
    expect(aw.session.exercises[0].sets).toBeLessThan(4);
    expect(aw.exerciseLogs[0].sets.length).toBe(aw.session.exercises[0].sets);
    useAppStore.getState().undoMatAdjustment();
    const back = useAppStore.getState().activeWorkout!;
    expect(back.session.exercises[0].sets).toBe(4);
    expect(back.exerciseLogs[0].sets.length).toBe(4);
    expect(back.matAdjust?.undone).toBe(true);
  });
});
