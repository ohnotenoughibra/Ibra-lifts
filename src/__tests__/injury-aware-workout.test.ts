import { describe, it, expect } from 'vitest';
import {
  generateInjuryAwareWorkout,
  suggestConstraintsFromActiveInjuries,
} from '@/lib/injury-aware-workout';

describe('generateInjuryAwareWorkout', () => {
  it('no_overhead removes overhead-pressing exercises', () => {
    const result = generateInjuryAwareWorkout({
      bodyRegions: [],
      constraints: ['no_overhead'],
      durationMinutes: 45,
      workoutType: 'strength',
      equipment: 'full_gym',
    });
    expect(
      result.session.exercises.every(e =>
        !/overhead|press.*shoulder|pull.up|chin.up|lat.pulldown/i.test(e.exercise.id)
      )
    ).toBe(true);
    expect(result.excludedExerciseCount).toBeGreaterThan(0);
  });

  it('left_knee region excludes loaded knee work', () => {
    const result = generateInjuryAwareWorkout({
      bodyRegions: ['left_knee'],
      constraints: [],
      durationMinutes: 45,
      workoutType: 'strength',
      equipment: 'full_gym',
    });
    expect(
      result.session.exercises.every(e =>
        !/back.squat|front.squat|leg.press|leg.extension|lunge/i.test(e.exercise.id)
      )
    ).toBe(true);
  });

  it('no_spinal_loading excludes back squat', () => {
    const result = generateInjuryAwareWorkout({
      bodyRegions: [],
      constraints: ['no_spinal_loading'],
      durationMinutes: 60,
      workoutType: 'strength',
      equipment: 'full_gym',
    });
    const ids = result.session.exercises.map(e => e.exercise.id);
    expect(ids.some(id => /back.squat/i.test(id))).toBe(false);
  });

  it('compound count scales with duration', () => {
    const short = generateInjuryAwareWorkout({
      bodyRegions: [],
      constraints: [],
      durationMinutes: 20,
      workoutType: 'hypertrophy',
      equipment: 'full_gym',
    });
    const long = generateInjuryAwareWorkout({
      bodyRegions: [],
      constraints: [],
      durationMinutes: 60,
      workoutType: 'hypertrophy',
      equipment: 'full_gym',
    });
    expect(long.session.exercises.length).toBeGreaterThan(short.session.exercises.length);
  });

  it('emits notes when bodyRegions are restricted', () => {
    const result = generateInjuryAwareWorkout({
      bodyRegions: ['left_knee'],
      constraints: [],
      durationMinutes: 30,
      workoutType: 'strength',
      equipment: 'full_gym',
    });
    expect(result.notes.some(n => /Avoiding Left Knee/i.test(n))).toBe(true);
  });

  it('records appliedConstraints in result', () => {
    const result = generateInjuryAwareWorkout({
      bodyRegions: [],
      constraints: ['no_impact', 'no_overhead'],
      durationMinutes: 30,
      workoutType: 'strength',
      equipment: 'full_gym',
    });
    expect(result.appliedConstraints).toContain('no_impact');
    expect(result.appliedConstraints).toContain('no_overhead');
  });
});

describe('suggestConstraintsFromActiveInjuries', () => {
  it('lower_back triggers no_spinal_loading + no_hinging', () => {
    const c = suggestConstraintsFromActiveInjuries(['lower_back']);
    expect(c).toContain('no_spinal_loading');
    expect(c).toContain('no_hinging');
  });

  it('knee + ankle dedupes no_impact', () => {
    const c = suggestConstraintsFromActiveInjuries(['left_knee', 'right_ankle']);
    expect(c.filter(x => x === 'no_impact').length).toBe(1);
  });

  it('shoulder triggers no_overhead', () => {
    const c = suggestConstraintsFromActiveInjuries(['right_shoulder']);
    expect(c).toContain('no_overhead');
  });

  it('returns empty array for unknown / non-mapped regions', () => {
    const c = suggestConstraintsFromActiveInjuries([]);
    expect(c).toEqual([]);
  });
});
