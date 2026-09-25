/**
 * Full-app audit 2026-09-25 — data integrity. Each case was a measured bug:
 * deleted logs steering prescriptions/stats, log order flipping, pound-sized
 * steps for kg users.
 */
import { describe, it, expect } from 'vitest';
import { useAppStore } from '@/lib/store';
import { getExerciseById } from '@/lib/exercises';
import { getSuggestedWeight } from '@/lib/auto-adjust';
import { chrono, newestN } from '@/lib/utils';
import type { UserProfile, WorkoutSession } from '@/lib/types';

const log = (id: string, exId: string, w: number, r: number, daysAgo: number, extra: Record<string, unknown> = {}) => ({
  id, date: new Date(Date.now() - daysAgo * 864e5), completed: true, weightUnit: 'kg',
  duration: 60, totalVolume: w * r, overallRPE: 7, soreness: 3, energy: 7,
  exercises: [{ exerciseId: exId, exerciseName: exId, personalRecord: false,
    sets: [1, 2, 3].map(n => ({ setNumber: n, weight: w, reps: r, rpe: 8, rpeSource: 'user', completed: true })) }],
  ...extra,
}) as any;

const session = (exId: string) => {
  const ex = getExerciseById(exId)!;
  return {
    id: 's', name: 'S', type: 'strength', dayNumber: 1, estimatedDuration: 40, warmUp: [], coolDown: [],
    exercises: [{ exerciseId: ex.id, exercise: ex, sets: 3, prescription: { targetReps: 5, minReps: 3, maxReps: 5, rpe: 8, restSeconds: 180 } }],
  } as unknown as WorkoutSession;
};

describe('deleted workouts never steer the next session', () => {
  it('a deleted 200 kg typo does not prefill 200', () => {
    useAppStore.setState({
      user: { id: 'u', weightUnit: 'kg', experienceLevel: 'beginner', bodyWeightKg: 80 } as unknown as UserProfile,
      workoutLogs: [log('a', 'back-squat', 100, 5, 7), log('typo', 'back-squat', 200, 5, 2, { _deleted: true, _deletedAt: Date.now() })],
      activeWorkout: null, injuryLog: [], currentMesocycle: null,
    });
    useAppStore.getState().startWorkout(session('back-squat'));
    expect(useAppStore.getState().activeWorkout!.exerciseLogs[0].sets[0].weight).toBeLessThanOrEqual(105);
  });
});

describe('recalculatePRs keeps chronological order and ignores deleted logs', () => {
  it('oldest-first after recalculation; deleted log is not a PR', () => {
    useAppStore.setState({
      workoutLogs: [
        log('old', 'bench-press', 80, 5, 20),
        log('mid', 'bench-press', 85, 5, 10),
        log('del', 'bench-press', 150, 5, 5, { _deleted: true }),
        log('new', 'bench-press', 90, 5, 1),
      ],
    });
    useAppStore.getState().recalculatePRs();
    const logs = useAppStore.getState().workoutLogs;
    expect(logs.map(l => l.id)).toEqual(['old', 'mid', 'del', 'new']);
    expect(logs.find(l => l.id === 'new')!.exercises[0].personalRecord).toBe(true);
  });
});

describe('persisted slices keep the NEWEST records', () => {
  it('newestN sorts by date before slicing', () => {
    const arr = [{ id: 'new', date: new Date('2026-09-20') }, { id: 'a', date: new Date('2026-01-01') }, { id: 'b', date: new Date('2026-02-01') }];
    expect(newestN(arr, 2).map(x => x.id)).toEqual(['b', 'new']);
  });
  it('chrono drops deleted and sorts oldest-first', () => {
    const arr = [{ id: 'c', date: '2026-03-01' }, { id: 'x', date: '2026-01-01', _deleted: true }, { id: 'a', date: '2026-01-02' }];
    expect(chrono(arr).map(x => x.id)).toEqual(['a', 'c']);
  });
});

describe('getSuggestedWeight uses kg-sized steps', () => {
  const fb = (difficulty: string) => ({ exerciseId: 'x', difficulty, pumpRating: 3, jointPain: false, wantToSwap: false });
  const withFb = (w: number, difficulty: string) => [{ ...log('l', 'x', w, 10, 3), exercises: [{ ...log('l', 'x', w, 10, 3).exercises[0], feedback: fb(difficulty) }] }];
  it('10 kg "too easy" is a small step, not +5 kg', () => {
    const w = getSuggestedWeight('x', withFb(10, 'too_easy'), 'kg')!;
    expect(w).toBeGreaterThan(10);
    expect(w).toBeLessThanOrEqual(12.5);
  });
  it('"too hard" never goes UP (4 kg used to become 5)', () => {
    expect(getSuggestedWeight('x', withFb(4, 'too_hard'), 'kg')!).toBeLessThan(4);
    expect(getSuggestedWeight('x', withFb(100, 'too_hard'), 'kg')!).toBeLessThan(100);
  });
  it('ignores deleted logs', () => {
    const logs = [log('a', 'x', 50, 5, 5), { ...log('b', 'x', 500, 5, 1), _deleted: true }];
    expect(getSuggestedWeight('x', logs, 'kg')).toBe(50);
  });
});
