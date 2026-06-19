import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/lib/store';
import type { UserProfile, WorkoutSession } from '@/lib/types';

const testUser = {
  id: 'test-user', name: 'Test', age: 28, weight: 80, height: 180, sex: 'male',
  weightUnit: 'kg', experienceLevel: 'intermediate', goalFocus: 'strength',
  equipment: 'full_gym', sessionsPerWeek: 3, trainingIdentity: 'lifter',
} as unknown as UserProfile;

const exercise = {
  id: 'bench', name: 'Bench Press', category: 'compound',
  primaryMuscles: ['chest'], secondaryMuscles: [], movementPattern: 'push',
  equipmentRequired: ['full_gym'], equipmentTypes: ['barbell'], grapplerFriendly: false,
  aestheticValue: 5, strengthValue: 5, description: '', cues: [],
};

function makeSession(name = 'Push A'): WorkoutSession {
  return {
    id: `s-${Math.random()}`, name, type: 'hypertrophy', dayNumber: 1,
    exercises: [{
      exerciseId: 'bench', exercise: exercise as any, sets: 3,
      prescription: { targetReps: 10, minReps: 8, maxReps: 12, rpe: 8, restSeconds: 90 },
    }],
    estimatedDuration: 40, warmUp: [], coolDown: [],
  } as unknown as WorkoutSession;
}

function reset() {
  useAppStore.setState({
    user: { ...testUser },
    sessionTemplates: [],
    workoutLogs: [],
    activeWorkout: null,
    currentMesocycle: null,
  });
}

describe('My Workouts — session template actions', () => {
  beforeEach(reset);

  it('saveAsTemplate returns an id and appends with timesUsed 0', () => {
    const id = useAppStore.getState().saveAsTemplate('Push A', makeSession());
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
    const tpls = useAppStore.getState().sessionTemplates;
    expect(tpls).toHaveLength(1);
    expect(tpls[0].id).toBe(id);
    expect(tpls[0].name).toBe('Push A');
    expect(tpls[0].timesUsed).toBe(0);
  });

  it('updateTemplate edits name + session in place, preserving id/createdAt/timesUsed', () => {
    const id = useAppStore.getState().saveAsTemplate('Push A', makeSession('Push A'));
    // simulate prior usage
    useAppStore.setState({
      sessionTemplates: useAppStore.getState().sessionTemplates.map(t =>
        t.id === id ? { ...t, timesUsed: 4 } : t),
    });
    const createdAt = useAppStore.getState().sessionTemplates[0].createdAt;

    useAppStore.getState().updateTemplate(id, 'Push A (v2)', makeSession('Push A (v2)'));

    const t = useAppStore.getState().sessionTemplates.find(x => x.id === id)!;
    expect(t.name).toBe('Push A (v2)');
    expect(t.session.name).toBe('Push A (v2)');
    expect(t.id).toBe(id);            // same identity
    expect(t.timesUsed).toBe(4);      // usage preserved
    expect(t.createdAt).toBe(createdAt); // created date preserved
    expect(useAppStore.getState().sessionTemplates).toHaveLength(1); // no duplicate
  });

  it('deleteTemplate removes the workout', () => {
    const id = useAppStore.getState().saveAsTemplate('Push A', makeSession());
    useAppStore.getState().deleteTemplate(id);
    expect(useAppStore.getState().sessionTemplates).toHaveLength(0);
  });

  it('useTemplate starts a workout and bumps usage; blocks when one is active', () => {
    const id = useAppStore.getState().saveAsTemplate('Push A', makeSession());

    const ok = useAppStore.getState().useTemplate(id);
    expect(ok).toBe(true);
    expect(useAppStore.getState().activeWorkout).not.toBeNull();
    const after = useAppStore.getState().sessionTemplates.find(t => t.id === id)!;
    expect(after.timesUsed).toBe(1);
    expect(after.lastUsed).toBeTruthy();

    // A second start is blocked by the active workout, and must NOT bump usage.
    const blocked = useAppStore.getState().useTemplate(id);
    expect(blocked).toBe(false);
    expect(useAppStore.getState().sessionTemplates.find(t => t.id === id)!.timesUsed).toBe(1);
  });
});
