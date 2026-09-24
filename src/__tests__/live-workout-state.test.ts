/**
 * Live-workout state correctness (audit 2026-09-24, C4/C5).
 *
 * C4: the readiness throttle replaced the exercise list but kept the old
 *     per-index logs — at orange, dropping an isolation shifted every later
 *     exercise's sets onto the wrong lift.
 * C5: pausing unmounted ActiveWorkout; resuming re-ran the throttle on the
 *     already-throttled session (rest 180 → 216 → 259s, sets 3 → 2).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore, reconcileLogsToExercises } from '@/lib/store';
import { applyThrottle } from '@/lib/readiness-throttle';
import { getPreviousSessionSets, getSuggestedWeight } from '@/lib/auto-adjust';
import { regulateRPE } from '@/lib/rpe-regulator';
import type { UserProfile, WorkoutSession, ReadinessScore } from '@/lib/types';

const user = {
  id: 'u', name: 'T', age: 30, weight: 80, height: 180, sex: 'male', weightUnit: 'kg',
  experienceLevel: 'beginner', goalFocus: 'strength', equipment: 'full_gym',
  sessionsPerWeek: 3, trainingIdentity: 'combat',
} as unknown as UserProfile;

const ex = (id: string, category: 'compound' | 'isolation', sets = 3) => ({
  exerciseId: id,
  exercise: {
    id, name: id, category, primaryMuscles: ['back'], secondaryMuscles: [], movementPattern: 'hinge',
    equipmentRequired: ['full_gym'], equipmentTypes: ['barbell'], grapplerFriendly: true,
    aestheticValue: 5, strengthValue: 5, description: '', cues: [],
  },
  sets,
  prescription: { targetReps: 5, minReps: 3, maxReps: 6, rpe: 8, restSeconds: 180 },
}) as unknown as WorkoutSession['exercises'][number];

const session: WorkoutSession = {
  id: 's1', name: 'Pull', type: 'strength', dayNumber: 1,
  exercises: [ex('deadlift', 'compound', 4), ex('bicep-curl', 'isolation', 4), ex('sumo-deadlift', 'compound', 4)],
  estimatedDuration: 60, warmUp: [], coolDown: [],
} as unknown as WorkoutSession;

const readiness = (overall: number): ReadinessScore => ({
  overall, level: 'moderate' as ReadinessScore['level'], factors: [],
  volumeModifier: 1, intensityModifier: 1, recommendations: [],
});

beforeEach(() => {
  useAppStore.setState({ user: { ...user }, workoutLogs: [], activeWorkout: null, currentMesocycle: null, injuryLog: [] });
  useAppStore.getState().startWorkout(session);
});

const aw = () => useAppStore.getState().activeWorkout!;

describe('C4 — throttle keeps logs aligned with exercises', () => {
  it('orange: dropping an isolation does not shift sets onto the wrong exercise', () => {
    // log a set on deadlift before throttle is applied (edge: already-completed work)
    const log0 = aw().exerciseLogs[0];
    useAppStore.getState().updateExerciseLog(0, { ...log0, sets: log0.sets.map((s, i) => i === 0 ? { ...s, weight: 140, reps: 5, completed: true } : s) });

    useAppStore.getState().applyReadinessThrottle(applyThrottle(aw().session, readiness(40)));
    const { session: s, exerciseLogs: logs } = aw();

    expect(s.exercises.map(e => e.exerciseId)).not.toContain('bicep-curl');
    expect(logs.map(l => l.exerciseId)).toEqual(s.exercises.map(e => e.exerciseId));
    s.exercises.forEach((e, i) => expect(logs[i].sets.length).toBe(Math.max(e.sets, logs[i].sets.filter(x => x.completed).length)));
    // the completed deadlift set survived
    expect(logs[0].sets[0]).toMatchObject({ weight: 140, reps: 5, completed: true });
  });

  it('yellow: set counts in logs match the throttled prescription', () => {
    useAppStore.getState().applyReadinessThrottle(applyThrottle(aw().session, readiness(60)));
    aw().session.exercises.forEach((e, i) => expect(aw().exerciseLogs[i].sets.length).toBe(e.sets));
  });
});

describe('C5 — throttle applies once; position survives remount', () => {
  it('a second throttle (resume after pause) is a no-op', () => {
    useAppStore.getState().applyReadinessThrottle(applyThrottle(aw().session, readiness(60)));
    const after1 = JSON.stringify(aw().session);
    useAppStore.getState().applyReadinessThrottle(applyThrottle(aw().session, readiness(60)));
    expect(JSON.stringify(aw().session)).toBe(after1);
    expect(aw().throttle?.config.level).toBe('yellow');
  });

  it('green still records that readiness was evaluated', () => {
    useAppStore.getState().applyReadinessThrottle(applyThrottle(aw().session, readiness(75)));
    expect(aw().throttle?.config.level).toBe('green');
    expect(aw().session.exercises).toHaveLength(3);
  });

  it('overview + position are persisted on the active workout', () => {
    useAppStore.getState().markWorkoutOverviewDone();
    useAppStore.getState().setWorkoutPosition(2, 1);
    expect(aw().overviewDone).toBe(true);
    expect(aw().position).toEqual({ exerciseIndex: 2, setIndex: 1 });
  });
});

describe('reconcileLogsToExercises', () => {
  it('matches duplicates of the same exercise in order, never by index', () => {
    const logs = [
      { exerciseId: 'a', exerciseName: 'a', personalRecord: false, sets: [{ setNumber: 1, weight: 1, reps: 1, rpe: 8, completed: true }] },
      { exerciseId: 'b', exerciseName: 'b', personalRecord: false, sets: [{ setNumber: 1, weight: 2, reps: 1, rpe: 8, completed: false }] },
      { exerciseId: 'a', exerciseName: 'a', personalRecord: false, sets: [{ setNumber: 1, weight: 3, reps: 1, rpe: 8, completed: false }] },
    ];
    const out = reconcileLogsToExercises(logs, [ex('a', 'compound', 1), ex('a', 'compound', 2)]);
    expect(out.map(l => l.sets[0].weight)).toEqual([1, 3]);
    expect(out[1].sets).toHaveLength(2);
    expect(out[1].sets.map(s => s.setNumber)).toEqual([1, 2]);
  });
});

const past = (id: string, sets: object[], extra: object = {}) => ({
  id: `log-${Math.random()}`, date: new Date(Date.now() - 86400000), completed: true,
  duration: 60, totalVolume: 0, overallRPE: 7, soreness: 3, energy: 7,
  exercises: [{ exerciseId: id, exerciseName: id, personalRecord: false, sets }], ...extra,
}) as any;

describe('C6 — skipping never poisons history', () => {
  it('skipped sets are not completed and carry no fake feedback', () => {
    const log = aw().exerciseLogs[1];
    // what handleSkipExercise now writes
    useAppStore.getState().updateExerciseLog(1, { ...log, sets: log.sets.map(s => ({ ...s, skipped: true, completed: false })) });
    const after = aw().exerciseLogs[1];
    expect(after.sets.every(s => !s.completed && s.skipped)).toBe(true);
    expect(after.feedback).toBeUndefined();
  });

  it('history lookups skip skipped / 0×0 sets and fall back to the last real session', () => {
    const logs = [
      past('bench-press', [{ setNumber: 1, weight: 100, reps: 5, rpe: 8, completed: true }]),
      // legacy shape: skip stored as completed 0×0
      past('bench-press', [{ setNumber: 1, weight: 0, reps: 0, rpe: 0, completed: true, notes: 'Skipped' }]),
      // new shape
      past('bench-press', [{ setNumber: 1, weight: 0, reps: 5, rpe: 8, completed: false, skipped: true }]),
    ];
    expect(getPreviousSessionSets('bench-press', logs)).toEqual([{ weight: 100, reps: 5, duration: undefined }]);
    expect(getSuggestedWeight('bench-press', logs)).toBe(100);
  });
});

describe('unit-aware history', () => {
  it('converts a lbs log into kg for a kg athlete', () => {
    const logs = [past('bench-press', [{ setNumber: 1, weight: 225, reps: 5, rpe: 8, completed: true }], { weightUnit: 'lbs' })];
    expect(getPreviousSessionSets('bench-press', logs, 'kg')![0].weight).toBeCloseTo(102.1, 1);
    expect(getSuggestedWeight('bench-press', logs, 'kg')).toBeCloseTo(102.1, 1);
    // no unit on the log → value passes through untouched (legacy)
    const legacy = [past('bench-press', [{ setNumber: 1, weight: 100, reps: 5, rpe: 8, completed: true }])];
    expect(getSuggestedWeight('bench-press', legacy, 'lbs')).toBe(100);
  });

  it('bodyweight prefill falls back to kg when the profile has no unit', () => {
    useAppStore.setState({ user: { ...user, weightUnit: undefined, bodyWeightKg: 80 } as any, activeWorkout: null });
    const pull = { ...session, exercises: [ex('pull-up', 'compound', 2)] } as WorkoutSession;
    useAppStore.getState().startWorkout(pull);
    expect(aw().exerciseLogs[0].sets[0].weight).toBe(80);
  });
});

describe('swap keeps performed work', () => {
  it('mid-exercise swap keeps completed sets on the old lift and continues on the new one', () => {
    const log0 = aw().exerciseLogs[0];
    useAppStore.getState().updateExerciseLog(0, { ...log0, sets: log0.sets.map((s, i) => i < 2 ? { ...s, weight: 140, reps: 5, completed: true } : s) });
    const total = log0.sets.length;
    const at = useAppStore.getState().swapExercise(0, 'trap-bar-deadlift', 'Trap Bar Deadlift');
    expect(at).toBe(1);
    const { session: s, exerciseLogs: logs } = aw();
    expect(logs[0].exerciseId).toBe('deadlift');
    expect(logs[0].sets).toHaveLength(2);
    expect(logs[0].sets.every(x => x.completed && x.weight === 140)).toBe(true);
    expect(logs[1].exerciseId).toBe('trap-bar-deadlift');
    expect(logs[1].sets).toHaveLength(total - 2);
    expect(s.exercises.map(e => e.exerciseId)).toEqual(logs.map(l => l.exerciseId));
  });

  it('swap before any set replaces in place; undo restores exactly', () => {
    const before = JSON.stringify({ s: aw().session.exercises.map(e => e.exerciseId), l: aw().exerciseLogs });
    const at = useAppStore.getState().swapExercise(1, 'hammer-curl', 'Hammer Curl');
    expect(at).toBe(1);
    expect(aw().exerciseLogs[1].exerciseId).toBe('hammer-curl');
    expect(aw().exerciseLogs).toHaveLength(3);
    expect(useAppStore.getState().undoSwap()).toBe(true);
    expect(JSON.stringify({ s: aw().session.exercises.map(e => e.exerciseId), l: aw().exerciseLogs })).toBe(before);
    expect(useAppStore.getState().undoSwap()).toBe(false);
  });
});

describe('RPE source', () => {
  it('new sets are marked prefill; the regulator ignores prefilled RPE', () => {
    expect(aw().exerciseLogs[0].sets.every(s => s.rpeSource === 'prefill')).toBe(true);
    const presc = aw().session.exercises[0];
    const grind = (src: 'user' | 'prefill') => [1, 2].map(n => ({ setNumber: n, weight: 140, reps: 5, rpe: 10, completed: true, rpeSource: src }));
    expect(regulateRPE(grind('prefill') as any, presc, 'green', 'kg')).toBeNull();
    expect(regulateRPE(grind('user') as any, presc, 'green', 'kg')).not.toBeNull();
  });
});
