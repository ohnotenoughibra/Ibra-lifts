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
