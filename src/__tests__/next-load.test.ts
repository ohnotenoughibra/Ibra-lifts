/**
 * next-load — the single weight-suggestion engine (audit 2026-09-24).
 * Each case was a measured failure of the old code paths.
 */
import { describe, it, expect } from 'vitest';
import { suggestNextLoad, getLoadProfile, roundForImplement, formatLoad } from '@/lib/next-load';
import { getExerciseById } from '@/lib/exercises';
import { useAppStore } from '@/lib/store';
import type { WorkoutSession, UserProfile } from '@/lib/types';

const log = (id: string, w: number, r: number, rpe: number | undefined, fb?: string, daysAgo = 3, unit: 'kg' | 'lbs' = 'kg', src?: 'prefill' | 'user') => ({
  id: `l-${id}-${daysAgo}`, date: new Date(Date.now() - daysAgo * 864e5), completed: true, weightUnit: unit,
  duration: 60, totalVolume: 0, overallRPE: 7, soreness: 3, energy: 7,
  exercises: [{ exerciseId: id, exerciseName: id, personalRecord: false,
    feedback: fb ? { exerciseId: id, difficulty: fb, pumpRating: 3, jointPain: false, wantToSwap: false } : undefined,
    sets: [1, 2, 3].map(n => ({ setNumber: n, weight: w, reps: r, rpe: rpe ?? 8, rpeSource: src, completed: true })) }],
}) as any;
const next = (id: string, logs: any[], reps: number, rpe: number, unit: 'kg' | 'lbs' = 'kg') =>
  suggestNextLoad({ exercise: getExerciseById(id)!, logs, targetReps: reps, targetRPE: rpe, unit })!;

describe('suggestNextLoad', () => {
  it('same scheme, same effort → same load', () => {
    expect(next('back-squat', [log('back-squat', 100, 5, 8)], 5, 8).weight).toBe(100);
  });
  it('last set felt easier than today\'s target → progresses', () => {
    expect(next('back-squat', [log('back-squat', 100, 5, 7)], 5, 8).weight).toBeGreaterThan(100);
  });
  it('rep-range change re-expresses load via e1RM (5 → 10 reps)', () => {
    // RTS: 5 @8 ≈ 81 % (e1RM ≈ 123) → 10 @8 ≈ 68 % ≈ 84 kg
    const w = next('back-squat', [log('back-squat', 100, 5, 8)], 10, 8).weight;
    expect(w).toBeGreaterThanOrEqual(82.5);
    expect(w).toBeLessThanOrEqual(85);
  });
  it('deload (lower RPE target) lightens the load', () => {
    expect(next('back-squat', [log('back-squat', 100, 5, 8)], 5, 7).weight).toBeLessThan(100);
  });
  it('"too easy" never suggests less — even on small dumbbells (was 8 → 7.5)', () => {
    const r = next('lateral-raise', [log('lateral-raise', 8, 12, 8, 'too_easy')], 12, 8);
    expect(r.weight).toBeGreaterThan(8);
    expect(r.weight).toBeLessThanOrEqual(10); // not the old +62% jump to 13
  });
  it('"too easy" in lbs moves one real dumbbell step', () => {
    expect(next('lateral-raise', [log('lateral-raise', 20, 12, 8, 'too_easy', 3, 'lbs')], 12, 8, 'lbs').weight).toBe(25);
  });
  it('"too hard" never suggests more, and not the old −42% (curl 12 → 7)', () => {
    const w = next('dumbbell-curl', [log('dumbbell-curl', 12, 10, 9, 'too_hard')], 10, 8).weight;
    expect(w).toBeLessThan(12);
    expect(w).toBeGreaterThanOrEqual(9);
  });
  it('time off scales the load down', () => {
    expect(next('bench-press', [log('bench-press', 100, 5, 8, undefined, 90)], 5, 8).weight).toBeLessThan(95);
  });
  it('untouched prefilled RPE is not evidence — same scheme repeats the load', () => {
    expect(next('back-squat', [log('back-squat', 100, 5, 9.5, undefined, 3, 'kg', 'prefill')], 5, 8).weight).toBe(100);
  });
  it('kettlebells land on real bell sizes', () => {
    const w = next('kettlebell-swing', [log('kettlebell-swing', 24, 15, 7, 'too_easy')], 15, 7).weight;
    expect([28, 32]).toContain(w);
  });
  it('explains itself', () => {
    expect(next('back-squat', [log('back-squat', 100, 5, 7)], 5, 8).reason).toMatch(/Last 100 kg × 5 @ RPE 7 → today 5 @ RPE 8/);
  });
  it('converts history logged in the other unit', () => {
    expect(next('bench-press', [log('bench-press', 225, 5, 8, undefined, 3, 'lbs')], 5, 8).weight).toBe(102.5);
  });
});

describe('load profiles', () => {
  const p = (id: string) => getLoadProfile(getExerciseById(id)!);
  it('pairs vs singles', () => {
    expect(p('lateral-raise')).toEqual({ implement: 'dumbbell', count: 2 });
    expect(p('dumbbell-curl').count).toBe(2);
    expect(p('dumbbell-row').count).toBe(1);
    expect(p('goblet-squat').count).toBe(1);
    expect(p('back-squat').implement).toBe('barbell');
  });
  it('formats pairs per hand', () => {
    expect(formatLoad(12, p('lateral-raise'), 'kg')).toBe('2 × 12 kg');
    expect(formatLoad(102.5, p('back-squat'), 'kg')).toBe('102.5 kg');
  });
  it('rounds to what exists', () => {
    expect(roundForImplement(8.4, { implement: 'dumbbell', count: 2 }, 'kg')).toBe(8);
    expect(roundForImplement(23, { implement: 'kettlebell', count: 1 }, 'kg')).toBe(24);
    expect(roundForImplement(101.2, { implement: 'barbell', count: 1 }, 'kg')).toBe(100);
  });
});

describe('prefill uses the engine (store.startWorkout)', () => {
  it('a rep-range change prefills the re-expressed load and today\'s reps — not last session verbatim', () => {
    const ex = getExerciseById('back-squat')!;
    useAppStore.setState({
      user: { id: 'u', weightUnit: 'kg', experienceLevel: 'beginner', bodyWeightKg: 80 } as unknown as UserProfile,
      workoutLogs: [log('back-squat', 100, 5, 8)], activeWorkout: null, injuryLog: [], currentMesocycle: null,
    });
    useAppStore.getState().startWorkout({
      id: 's', name: 'Legs', type: 'hypertrophy', dayNumber: 1, estimatedDuration: 40, warmUp: [], coolDown: [],
      exercises: [{ exerciseId: ex.id, exercise: ex, sets: 3, prescription: { targetReps: 10, minReps: 8, maxReps: 12, rpe: 8, restSeconds: 120 } }],
    } as unknown as WorkoutSession);
    const set0 = useAppStore.getState().activeWorkout!.exerciseLogs[0].sets[0];
    expect(set0.reps).toBe(10);
    expect(set0.weight).toBeLessThanOrEqual(85);
    expect(set0.weight).toBeGreaterThanOrEqual(82.5);
  });
});
