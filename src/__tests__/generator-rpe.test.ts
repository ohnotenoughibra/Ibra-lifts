/**
 * Generator intensity — week 1 starts conservative, RPE climbs steadily, stays
 * under the experience cap, and accessories/explosive lifts get their own scheme.
 */
import { describe, it, expect } from 'vitest';
import { generateMesocycle, RPE_CAP } from '@/lib/workout-generator';

const gen = (experienceLevel: 'beginner' | 'intermediate' | 'advanced', goalFocus: any = 'strength') =>
  generateMesocycle({ userId: 'u', goalFocus, equipment: 'full_gym', sessionsPerWeek: 3, weeks: 5, trainingIdentity: 'combat', combatSport: 'grappling', experienceLevel, sportSessionsPerWeek: 3 } as any);

describe('generator RPE', () => {
  for (const lvl of ['beginner', 'intermediate', 'advanced'] as const) {
    for (const goal of ['strength', 'hypertrophy', 'balanced'] as const) {
      it(`${lvl}/${goal}: week 1 ≤ 8, never above the cap, never drops week to week`, () => {
        const m = gen(lvl, goal);
        const training = m.weeks.filter(w => !w.isDeload);
        for (const ex of training[0].sessions.flatMap(s => s.exercises)) expect(ex.prescription.rpe).toBeLessThanOrEqual(8);
        for (const w of training) for (const ex of w.sessions.flatMap(s => s.exercises)) expect(ex.prescription.rpe).toBeLessThanOrEqual(RPE_CAP[lvl]);
        // same lift, same slot → RPE non-decreasing across training weeks
        training[0].sessions.forEach((s, si) => s.exercises.forEach(first => {
          let prev = first.prescription.rpe;
          for (const w of training.slice(1)) {
            const same = w.sessions[si]?.exercises.find(e => e.exerciseId === first.exerciseId);
            if (!same) continue;
            expect(same.prescription.rpe).toBeGreaterThanOrEqual(prev);
            prev = same.prescription.rpe;
          }
        }));
      });
    }
  }

  it('same lift keeps the same rest every week (no random jumps)', () => {
    const m = gen('intermediate');
    const tw = m.weeks.filter(w => !w.isDeload);
    tw[0].sessions[0].exercises.forEach(first => {
      for (const w of tw) {
        const same = w.sessions[0].exercises.find(e => e.exerciseId === first.exerciseId);
        if (same) expect(same.prescription.restSeconds).toBe(first.prescription.restSeconds);
      }
    });
  });

  it('accessories get higher reps and shorter rest than main lifts; explosive lifts stay 2–3 reps, RPE ≤ 8', () => {
    const exs = gen('intermediate').weeks.flatMap(w => w.isDeload ? [] : w.sessions.flatMap(s => s.exercises));
    for (const e of exs) {
      const repBased = !e.exercise.measurementType || e.exercise.measurementType === 'reps';
      if ((e.exercise.category === 'isolation' || e.exercise.category === 'grip') && repBased) {
        expect(e.prescription.targetReps).toBeGreaterThanOrEqual(8);
        expect(e.prescription.restSeconds).toBeLessThanOrEqual(90);
      }
      if (e.exercise.category === 'power') {
        expect(e.prescription.targetReps).toBeLessThanOrEqual(3);
        expect(e.prescription.rpe).toBeLessThanOrEqual(8);
      }
    }
  });
});
