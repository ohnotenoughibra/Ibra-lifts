/**
 * Generator variety — accessories rotate between blocks; equipment gaps are
 * filled from the open library instead of leaving a movement out.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { generateMesocycle } from '@/lib/workout-generator';
import { loadExerciseLibrary } from '@/lib/exercises';

const base = { userId: 'u', goalFocus: 'balanced', equipment: 'full_gym', sessionsPerWeek: 3, weeks: 4, trainingIdentity: 'combat', combatSport: 'grappling_nogi', experienceLevel: 'intermediate' } as any;
const ids = (m: ReturnType<typeof generateMesocycle>, pred: (c: string) => boolean) =>
  new Set(m.weeks[0].sessions.flatMap(s => s.exercises).filter(e => pred(e.exercise.category)).map(e => e.exerciseId));

describe('generator variety', () => {
  beforeAll(async () => { await loadExerciseLibrary(); });

  it('rotates most accessories when the previous block is passed', () => {
    let overlapWith = 0; let overlapWithout = 0;
    const isAcc = (c: string) => c !== 'compound';
    for (let i = 0; i < 20; i++) {
      const prev = generateMesocycle(base);
      const prevIds = Array.from(new Set(prev.weeks[0].sessions.flatMap(s => s.exercises.map(e => e.exerciseId))));
      const acc = ids(prev, isAcc);
      const next = generateMesocycle({ ...base, previousExerciseIds: prevIds });
      const plain = generateMesocycle(base);
      overlapWith += Array.from(ids(next, isAcc)).filter(x => acc.has(x)).length;
      overlapWithout += Array.from(ids(plain, isAcc)).filter(x => acc.has(x)).length;
    }
    expect(overlapWith).toBeLessThan(overlapWithout * 0.6);
  });

  it('fills a missing movement from the library on a bands-only kit', () => {
    const m = generateMesocycle({ ...base, goalFocus: 'strength', equipment: 'minimal', availableEquipment: ['bodyweight', 'resistance_band'] });
    const exs = m.weeks[0].sessions.flatMap(s => s.exercises);
    expect(exs.length).toBeGreaterThan(0);
    for (const e of exs) expect((e.exercise.equipmentTypes ?? []).every(t => t === 'bodyweight' || t === 'resistance_band')).toBe(true);
  });

  it('a kettlebell kit borrows loadable library lifts for thin movement slots', () => {
    let lib = 0;
    for (let i = 0; i < 10; i++) {
      const m = generateMesocycle({ ...base, goalFocus: 'strength', equipment: 'minimal', availableEquipment: ['bodyweight', 'kettlebell'] });
      const exs = m.weeks[0].sessions.flatMap(s => s.exercises);
      lib += exs.filter(e => e.exerciseId.startsWith('lib-')).length;
      for (const e of exs) expect((e.exercise.equipmentTypes ?? []).every(t => t === 'bodyweight' || t === 'kettlebell')).toBe(true);
    }
    expect(lib).toBeGreaterThan(0);
  });
});
