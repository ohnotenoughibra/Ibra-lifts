import { describe, it, expect, beforeEach } from 'vitest';
import { buildPowerPrimer } from '@/lib/power-primer';
import { useAppStore } from '@/lib/store';
import { getExerciseById } from '@/lib/exercises';
import type { WorkoutSession, UserProfile } from '@/lib/types';

const ALL = ['bodyweight', 'box', 'kettlebell', 'medicine_ball', 'barbell', 'dumbbell'] as const;

describe('buildPowerPrimer', () => {
  it('fresh athlete: hips + rotation + push, first in session, low contacts', () => {
    const p = buildPowerPrimer({ readiness: 'green', availableEquipment: [...ALL] })!;
    expect(p.exercises).toHaveLength(3);
    expect(p.contacts).toBeLessThanOrEqual(60);
    expect(p.exercises.every(e => e.prescription.restSeconds >= 60)).toBe(true);
  });
  it('red readiness → no primer', () => {
    expect(buildPowerPrimer({ readiness: 'red' })).toBeNull();
  });
  it('heavy mat week or orange → one drill, two sets', () => {
    const p = buildPowerPrimer({ readiness: 'green', matSessionsThisWeek: 5, availableEquipment: [...ALL] })!;
    expect(p.exercises).toHaveLength(1);
    expect(p.exercises[0].sets).toBe(2);
    expect(p.reason).toMatch(/5 mat sessions/);
  });
  it('hard sparring close → only low-impact options (no broad/depth/jump squats)', () => {
    const p = buildPowerPrimer({ hardSparringNear: true, availableEquipment: [...ALL] })!;
    const ids = p.exercises.map(e => e.exerciseId);
    expect(ids).not.toContain('broad-jump');
    expect(ids).not.toContain('depth-jump');
    expect(ids).not.toContain('jump-squat');
  });
  it('never uses reactive depth jumps', () => {
    for (const focus of ['lower', 'upper', 'full'] as const) {
      expect(buildPowerPrimer({ focus, availableEquipment: [...ALL] })!.exercises.map(e => e.exerciseId)).not.toContain('depth-jump');
    }
  });
  it('bodyweight-only athletes still get a primer', () => {
    const p = buildPowerPrimer({ availableEquipment: ['bodyweight'] })!;
    expect(p.exercises.length).toBeGreaterThan(0);
    expect(p.exercises.every(e => (e.exercise.equipmentTypes ?? []).every(t => t === 'bodyweight'))).toBe(true);
  });
  it('rotates away from last primer and respects hidden exercises', () => {
    const p = buildPowerPrimer({ focus: 'lower', availableEquipment: [...ALL], recentIds: ['broad-jump'], hiddenIds: ['box-jump'] })!;
    const ids = p.exercises.map(e => e.exerciseId);
    expect(ids).not.toContain('broad-jump');
    expect(ids).not.toContain('box-jump');
  });
  it('every drill has a form video link', () => {
    const p = buildPowerPrimer({ availableEquipment: [...ALL] })!;
    expect(p.exercises.every(e => /youtube\.com/.test(e.exercise.videoUrl ?? ''))).toBe(true);
  });
});

describe('store.addPowerPrimer', () => {
  beforeEach(() => {
    const squat = getExerciseById('back-squat')!;
    useAppStore.setState({
      user: { id: 'u', weightUnit: 'kg', experienceLevel: 'beginner', availableEquipment: [...ALL] } as unknown as UserProfile,
      workoutLogs: [], trainingSessions: [], activeWorkout: null, injuryLog: [], hiddenExercises: { ids: [], updatedAt: '' },
    });
    useAppStore.getState().startWorkout({
      id: 's', name: 'Legs', type: 'strength', dayNumber: 1, estimatedDuration: 50, warmUp: [], coolDown: [],
      exercises: [{ exerciseId: squat.id, exercise: squat, sets: 3, prescription: { targetReps: 5, minReps: 3, maxReps: 6, rpe: 8, restSeconds: 180 } }],
    } as unknown as WorkoutSession);
  });
  it('inserts before an unstarted exercise, keeps logs aligned, and is undoable', () => {
    const r = useAppStore.getState().addPowerPrimer()!;
    const aw = useAppStore.getState().activeWorkout!;
    expect(r.index).toBe(0);
    expect(aw.session.exercises.length).toBeGreaterThan(1);
    expect(aw.exerciseLogs.map(l => l.exerciseId)).toEqual(aw.session.exercises.map(e => e.exerciseId));
    expect(aw.session.exercises[aw.session.exercises.length - 1].exerciseId).toBe('back-squat');
    expect(useAppStore.getState().undoSwap()).toBe(true);
    expect(useAppStore.getState().activeWorkout!.session.exercises).toHaveLength(1);
  });
  it('skips on a red day', () => {
    const aw = useAppStore.getState().activeWorkout!;
    useAppStore.setState({ activeWorkout: { ...aw, throttle: { config: { level: 'red' } } as never } });
    expect(useAppStore.getState().addPowerPrimer()).toBeNull();
  });
});
