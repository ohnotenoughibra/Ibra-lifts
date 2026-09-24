/**
 * Exercise-id integrity.
 *
 * Several engines reference library exercises by string id. A typo or a
 * renamed id doesn't throw — the lookup just silently finds nothing (e.g.
 * combat benchmarks never matched a single log because they keyed on
 * 'barbell-bench-press' while the library id is 'bench-press').
 *
 * Two kinds of reference, checked differently:
 *   - EXACT refs (lookups via getExerciseById / === on exerciseId): every id
 *     must exist in the library.
 *   - FUZZY tokens (injury avoid-lists matched by name regex or substring):
 *     every token must match at least one library exercise, otherwise it
 *     protects nobody.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { exercises } from '@/lib/exercises';
import { COMBAT_BENCHMARKS } from '@/lib/progress-analytics';
import { WELL_KNOWN_ALTERNATIVES } from '@/lib/exercise-recommender';
import { PLYO_LIBRARY } from '@/lib/plyometric-engine';
import { REGION_AVOID_EXERCISES } from '@/lib/injury-science';
import { HIGH_RISK_PATTERNS } from '@/lib/injury-prevention';

const ids = new Set(exercises.map(e => e.id));
const missing = (list: string[]) => list.filter(id => !ids.has(id));

describe('exercise library', () => {
  // Known duplicate: 'towel-pull-up' is defined twice with different
  // category/equipment. Fixing it needs a log migration (plan PR 5).
  // `it.fails` flips to a failure the day the duplicate is removed — then
  // turn it into a plain `it`.
  it.fails('has no duplicate ids', () => {
    const seen = new Set<string>();
    const dupes = exercises.map(e => e.id).filter(id => (seen.has(id) ? true : (seen.add(id), false)));
    expect(dupes).toEqual([]);
  });

  it('every exercise has the fields filters depend on', () => {
    const broken = exercises.filter(e =>
      !e.id || !e.name || !e.movementPattern || !e.category ||
      !e.primaryMuscles?.length || !e.equipmentTypes?.length,
    ).map(e => e.id || e.name);
    expect(broken).toEqual([]);
  });
});

describe('exact exercise-id references exist in the library', () => {
  it('combat benchmarks (progress-analytics)', () => {
    expect(missing(Object.keys(COMBAT_BENCHMARKS))).toEqual([]);
  });

  it('well-known alternatives (exercise-recommender)', () => {
    expect(missing(Object.values(WELL_KNOWN_ALTERNATIVES).flat())).toEqual([]);
  });

  it('plyometric contrast pairings', () => {
    const pairs = PLYO_LIBRARY.map(p => p.contrastPairWith).filter((x): x is string => !!x);
    expect(pairs.length).toBeGreaterThan(0);
    expect(missing(pairs)).toEqual([]);
  });

  it('session template specs (SessionTemplates.tsx)', () => {
    const src = readFileSync(join(__dirname, '../components/SessionTemplates.tsx'), 'utf8');
    // Two authoring formats: per-exercise specs `{ id: 'x', sets: … }` and
    // `buildPresetSession(name, type, ['a', 'b', …], …)`.
    const specRefs = Array.from(src.matchAll(/\{\s*id:\s*'([a-z0-9-]+)',\s*sets:/g)).map(m => m[1]);
    const listRefs = Array.from(src.matchAll(/buildPresetSession\([^,]+,\s*'[a-z_]+',\s*\[([^\]]+)\]/g))
      .flatMap(m => Array.from(m[1].matchAll(/'([a-z0-9-]+)'/g)).map(x => x[1]));
    const refs = [...specRefs, ...listRefs];
    // guard: if either regex stops matching, the test would pass vacuously
    expect(specRefs.length).toBeGreaterThan(30);
    expect(listRefs.length).toBeGreaterThan(30);
    expect(Array.from(new Set(missing(refs)))).toEqual([]);
  });
});

describe('fuzzy injury tokens match at least one library exercise', () => {
  // Tokens intentionally targeting non-library activities (conditioning,
  // bodyweight drills logged elsewhere). Keep this list short and honest:
  // the test also fails if one of these starts matching.
  const NON_LIBRARY_TOKENS = new Set(['sit-up', 'jump-rope', 'running']);

  it('REGION_AVOID_EXERCISES (name/id regex, same as injury-aware-workout)', () => {
    const tokens = Array.from(new Set(Object.values(REGION_AVOID_EXERCISES).flat()));
    const matches = (t: string) => {
      const re = new RegExp(t.replace(/s$/, '').replace(/-/g, '[-_ ]?'), 'i');
      return exercises.some(e => re.test(e.id) || re.test(e.name));
    };
    const dead = tokens.filter(t => !matches(t));
    expect(dead.sort()).toEqual(Array.from(NON_LIBRARY_TOKENS).sort());
  });

  it('HIGH_RISK_PATTERNS (substring of exerciseId, same as injury-prevention)', () => {
    const tokens = Object.values(HIGH_RISK_PATTERNS).flat();
    const dead = tokens.filter(t => !exercises.some(e => e.id.includes(t)));
    expect(dead).toEqual([]);
  });
});

describe('combat benchmarks actually match logged lifts', () => {
  it('a logged bench-press produces a benchmark entry', async () => {
    const { calculateCombatBenchmarks } = await import('@/lib/progress-analytics');
    const log = {
      id: 'l1', date: new Date(), completed: true, duration: 60, totalVolume: 500,
      exercises: [{ exerciseId: 'bench-press', exerciseName: 'Bench Press',
        sets: [{ setNumber: 1, weight: 100, reps: 5, completed: true, rpe: 8 }] }],
    } as any;
    const res = calculateCombatBenchmarks([log], 80, 'kg');
    expect(res.map(r => r.exerciseId)).toContain('bench-press');
  });
});

describe('measurement types', () => {
  it('carries and isometric holds are measured by time or distance, not reps', () => {
    const shouldNotBeReps = exercises.filter(e =>
      e.movementPattern === 'carry' || /\b(carry|walk|hold|hang|plank|pinch|wall sit|crawl)\b/i.test(e.name),
    ).filter(e => !/lunge|clean|gripper/i.test(e.name)); // rep-based despite the name/tag
    const wrong = shouldNotBeReps.filter(e => (e.measurementType ?? 'reps') === 'reps').map(e => e.id);
    expect(wrong).toEqual([]);
  });
});
