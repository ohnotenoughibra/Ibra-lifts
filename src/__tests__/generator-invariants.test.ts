/**
 * Generator invariants under a seeded RNG.
 *
 * The generator is intentionally stochastic (weightedShuffle etc. use
 * Math.random). Tests pin Math.random to a seeded PRNG so failures are
 * reproducible, and assert *properties* across several seeds rather than
 * exact output — so legitimate selection changes don't break them.
 *
 * `it.fails` blocks document known bugs from tasks/audit-2026-09-24-workouts.md.
 * They pass today BECAUSE the bug exists; when the fix lands they start
 * failing — convert them to plain `it` in the same PR.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateMesocycle } from '@/lib/workout-generator';
import { exercises } from '@/lib/exercises';
import type { Mesocycle } from '@/lib/types';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seeded<T>(seed: number, fn: () => T): T {
  const spy = vi.spyOn(Math, 'random').mockImplementation(mulberry32(seed));
  try { return fn(); } finally { spy.mockRestore(); }
}

afterEach(() => vi.restoreAllMocks());

type Opts = Parameters<typeof generateMesocycle>[0];
const base: Opts = {
  userId: 'u', goalFocus: 'hypertrophy', equipment: 'full_gym',
  sessionsPerWeek: 4, weeks: 5, experienceLevel: 'intermediate',
};
const PROFILES: Record<string, Opts> = {
  'hypertrophy 4d full gym': base,
  'strength 3d full gym': { ...base, goalFocus: 'strength', sessionsPerWeek: 3 },
  'grappler 3d': { ...base, goalFocus: 'strength', sessionsPerWeek: 3, trainingIdentity: 'combat', combatSport: 'grappling_nogi' },
  'home gym beginner 3d': { ...base, equipment: 'home_gym', sessionsPerWeek: 3, experienceLevel: 'beginner' },
};
const SEEDS = [1, 2, 3, 4, 5];
const libIds = new Set(exercises.map(e => e.id));
const byId = new Map(exercises.map(e => [e.id, e]));

const trainingWeeks = (m: Mesocycle) => m.weeks.filter(w => !w.isDeload);

describe('seeded RNG harness', () => {
  it('same seed → identical mesocycle exercise selection', () => {
    const pick = (m: Mesocycle) => m.weeks.map(w => w.sessions.map(s => s.exercises.map(e => e.exerciseId)));
    const a = seeded(42, () => generateMesocycle(base));
    const b = seeded(42, () => generateMesocycle(base));
    expect(pick(a)).toEqual(pick(b));
  });
});

describe.each(Object.entries(PROFILES))('invariants: %s', (_name, opts) => {
  it.each(SEEDS)('seed %i: well-formed sessions', seed => {
    const m = seeded(seed, () => generateMesocycle(opts));
    expect(m.weeks.length).toBe(opts.weeks);
    for (const w of m.weeks) {
      expect(w.sessions.length).toBe(opts.sessionsPerWeek);
      for (const s of w.sessions) {
        expect(s.exercises.length).toBeGreaterThan(0);
        const ids = s.exercises.map(e => e.exerciseId);
        // every pick is a real library exercise
        expect(ids.filter(id => !libIds.has(id))).toEqual([]);
        // no exercise twice in the same session
        expect(new Set(ids).size).toBe(ids.length);
        for (const e of s.exercises) {
          expect(e.sets).toBeGreaterThan(0);
          expect(e.prescription.targetReps).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('fixed in v2.13 (audit 2026-09-24 C1, C2)', () => {
  // C1: exercises are re-randomised every week, so week-over-week overload
  // can't be tracked. Fix (plan PR 4): select once per block.
  it('C1: each session slot keeps the same exercises across training weeks', () => {
    for (const seed of SEEDS) {
      const m = seeded(seed, () => generateMesocycle(base));
      const weeks = trainingWeeks(m);
      const slot = (wi: number, si: number) => weeks[wi].sessions[si].exercises.map(e => e.exerciseId).sort();
      for (let wi = 1; wi < weeks.length; wi++) {
        for (let si = 0; si < weeks[0].sessions.length; si++) {
          expect(slot(wi, si)).toEqual(slot(0, si));
        }
      }
    }
  });

  // C2: fitSessionToTimeLimit drops ALL isolation in one step at 60 min.
  // Fix (plan PR 4): trim one item at a time, keep ≥1 isolation.
  it('C2: 60-min hypertrophy week includes isolation work', () => {
    for (const seed of SEEDS) {
      const m = seeded(seed, () => generateMesocycle({ ...base, sessionDurationMinutes: 60 }));
      const week1 = trainingWeeks(m)[0];
      const iso = week1.sessions.flatMap(s => s.exercises)
        .filter(e => byId.get(e.exerciseId)?.category === 'isolation');
      expect(iso.length).toBeGreaterThan(0);
    }
  });
});

describe('template overrides reach the generator (audit C3)', () => {
  it('PPL at 3 days generates push / pull / legs days, not full body', () => {
    const m = seeded(7, () => generateMesocycle({ ...base, sessionsPerWeek: 3, splitType: 'push_pull_legs' }));
    expect(m.splitType).toBe('push_pull_legs');
    const names = trainingWeeks(m)[0].sessions.map(s => s.name).join(' ');
    expect(names).toMatch(/Push/);
    expect(names).toMatch(/Pull/);
    expect(names).toMatch(/Legs/);
  });

  it('bodyweight + pull-up bar programs contain no barbell/machine/cable work', () => {
    for (const seed of SEEDS) {
      const m = seeded(seed, () => generateMesocycle({
        ...base, equipment: 'minimal', availableEquipment: ['bodyweight', 'pull_up_bar'],
      }));
      const bad = m.weeks.flatMap(w => w.sessions.flatMap(s => s.exercises))
        .filter(e => (e.exercise.equipmentTypes ?? []).some(t => !['bodyweight', 'pull_up_bar'].includes(t)))
        .map(e => e.exerciseId);
      expect(bad).toEqual([]);
    }
  });

  it('excluded exercises are never selected', () => {
    const first = seeded(3, () => generateMesocycle(base));
    const picked = Array.from(new Set(first.weeks.flatMap(w => w.sessions.flatMap(s => s.exercises.map(e => e.exerciseId)))));
    const again = seeded(3, () => generateMesocycle({ ...base, excludeExerciseIds: picked }));
    const repicked = again.weeks.flatMap(w => w.sessions.flatMap(s => s.exercises.map(e => e.exerciseId)))
      .filter(id => picked.includes(id));
    expect(repicked).toEqual([]);
  });
});
