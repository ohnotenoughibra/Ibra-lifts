/**
 * Imported exercise library (free-exercise-db, public domain) + the unified
 * swap engine.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  exercises, loadExerciseLibrary, getAllExercises, getExerciseById, searchExercises,
  getRecommendedAlternatives, subPattern, isLibraryExercise,
} from '@/lib/exercises';
import { generateMesocycle } from '@/lib/workout-generator';
import type { Exercise } from '@/lib/types';

let libraryExercises: Exercise[] = [];
beforeAll(async () => { libraryExercises = await loadExerciseLibrary(); });

const MUSCLES = new Set(['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quadriceps', 'hamstrings', 'glutes', 'calves', 'core', 'forearms', 'traps', 'full_body']);
const GEAR = new Set(['barbell', 'dumbbell', 'kettlebell', 'cable', 'machine', 'bodyweight', 'pull_up_bar', 'bench', 'resistance_band', 'ez_bar', 'trap_bar', 'landmine', 'dip_station', 'ab_wheel', 'medicine_ball', 'battle_ropes', 'box']);

describe('imported library', () => {
  it('is big, valid and filterable by gear', () => {
    expect(libraryExercises.length).toBeGreaterThan(400);
    for (const e of libraryExercises) {
      expect(e.id.startsWith('lib-')).toBe(true);
      expect(e.primaryMuscles.length).toBeGreaterThan(0);
      for (const m of [...e.primaryMuscles, ...e.secondaryMuscles]) expect(MUSCLES.has(m)).toBe(true);
      expect(e.equipmentTypes.length).toBeGreaterThan(0);
      for (const g of e.equipmentTypes) expect(GEAR.has(g)).toBe(true);
      expect(e.equipmentRequired.length).toBeGreaterThan(0);
    }
  });
  it('library ids are unique and never collide with curated ids', () => {
    const lib = libraryExercises.map(e => e.id);
    expect(new Set(lib).size).toBe(lib.length);
    const curated = new Set(exercises.map(e => e.id));
    expect(lib.filter(id => curated.has(id))).toEqual([]);
    expect(getAllExercises().length).toBe(exercises.length + lib.length);
  });
  it('does not duplicate curated exercises by name', () => {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const curated = new Set(exercises.map(e => norm(e.name)));
    expect(libraryExercises.filter(e => curated.has(norm(e.name)))).toEqual([]);
  });
  it('library exercises resolve by id (so logged swaps show up in history)', () => {
    const e = libraryExercises[0];
    expect(getExerciseById(e.id)?.name).toBe(e.name);
    expect(isLibraryExercise(e.id)).toBe(true);
    expect(isLibraryExercise('back-squat')).toBe(false);
  });
  it('search reaches library-only exercises', () => {
    const target = libraryExercises.find(e => /guillotine/i.test(e.name))!;
    expect(searchExercises('guillotine').map(e => e.id)).toContain(target.id);
  });
  it('the programme generator never picks imported exercises', () => {
    for (const goalFocus of ['strength', 'hypertrophy'] as const) {
      const m = generateMesocycle({ userId: 'u', goalFocus, equipment: 'full_gym', sessionsPerWeek: 4, weeks: 4, experienceLevel: 'intermediate' } as any);
      const ids = m.weeks.flatMap(w => w.sessions.flatMap(s => s.exercises.map(e => e.exerciseId)));
      expect(ids.filter(isLibraryExercise)).toEqual([]);
    }
  });
});

describe('subPattern', () => {
  const sp = (id: string) => subPattern(getExerciseById(id)!);
  it('separates movements that share a coarse pattern', () => {
    expect(sp('bench-press')).toBe('horizontal_push');
    expect(sp('overhead-press')).toBe('vertical_push');
    expect(sp('pull-up')).toBe('vertical_pull');
    expect(sp('dumbbell-curl')).toBe('elbow_flexion');
    expect(sp('hip-thrust')).toBe('hip_thrust');
    expect(sp('romanian-deadlift')).toBe('hip_hinge');
    expect(sp('lateral-raise')).toBe('shoulder_raise');
  });
});

describe('unified swap engine', () => {
  it('bench press → other horizontal presses first', () => {
    const top = getRecommendedAlternatives('bench-press', 'full_gym', 5);
    expect(top.every(r => subPattern(r.exercise) === 'horizontal_push')).toBe(true);
  });
  it('pull-up → vertical pulls first', () => {
    const top = getRecommendedAlternatives('pull-up', 'full_gym', 3);
    expect(top.every(r => subPattern(r.exercise) === 'vertical_pull')).toBe(true);
  });
  it('no more than 3 near-identical variants (same slot + gear)', () => {
    const all = getRecommendedAlternatives('bench-press', 'full_gym', 60);
    const counts = new Map<string, number>();
    for (const r of all) {
      const k = `${subPattern(r.exercise)}|${r.exercise.equipmentTypes.join('+')}`;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    expect(Math.max(...Array.from(counts.values()))).toBeLessThanOrEqual(3);
  });
  it('respects available gear', () => {
    const recs = getRecommendedAlternatives('bench-press', 'full_gym', 60, ['dumbbell', 'bodyweight', 'bench']);
    expect(recs.length).toBeGreaterThan(0);
    for (const r of recs) expect(r.exercise.equipmentTypes.every(t => ['dumbbell', 'bodyweight', 'bench'].includes(t))).toBe(true);
  });
  it('exercises you have done before rank higher', () => {
    const base = getRecommendedAlternatives('bench-press', 'full_gym', 60);
    const last = base[base.length - 1].exercise.id;
    const withHistory = getRecommendedAlternatives('bench-press', 'full_gym', 60, undefined, { familiarIds: new Set([last]) });
    expect(withHistory.findIndex(r => r.exercise.id === last)).toBeLessThan(base.length - 1);
  });
});
