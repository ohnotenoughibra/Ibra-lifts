import { describe, it, expect } from 'vitest';
import { calculateMacros } from '@/lib/diet-coach';
import type { BiologicalSex, DietGoal } from '@/lib/types';

// Regression tests for the precision/correctness audit fixes.

const base = {
  bodyWeightKg: 80,
  heightCm: 180,
  age: 30,
  sex: 'male' as BiologicalSex,
};

function macroCalories(m: { protein: number; carbs: number; fat: number }) {
  return m.protein * 4 + m.carbs * 4 + m.fat * 9;
}

describe('calculateMacros — precision & reconciliation', () => {
  it('returned calories ALWAYS equal protein×4 + carbs×4 + fat×9 (no ring/macro mismatch)', () => {
    const goals: DietGoal[] = ['cut', 'bulk', 'maintain'];
    for (const goal of goals) {
      for (const sex of ['male', 'female'] as BiologicalSex[]) {
        for (const bw of [55, 80, 110]) {
          const m = calculateMacros({ ...base, bodyWeightKg: bw, sex, goal });
          expect(m).not.toBeNull();
          expect(m!.calories).toBe(macroCalories(m!));
        }
      }
    }
  });

  it('calorieFactor override is authoritative (within carb-rounding of tdee×factor)', () => {
    const m = calculateMacros({ ...base, goal: 'cut', calorieFactor: 0.78 });
    expect(m).not.toBeNull();
    expect(Math.abs(m!.calories - Math.round(m!.tdee * 0.78))).toBeLessThanOrEqual(4);
  });

  it('proteinGKg override sets protein directly (g per kg total bodyweight)', () => {
    const m = calculateMacros({ ...base, bodyWeightKg: 80, goal: 'cut', proteinGKg: 2.5 });
    expect(m).not.toBeNull();
    expect(m!.protein).toBe(200); // 80 × 2.5
  });

  it('a higher-bodyfat lightweight on an aggressive cut does NOT get an absurd protein target', () => {
    // 60kg, 35% BF, combat aggressive cut. Old bug: 3.1 g/kg total = 186g protein.
    // Fixed: anchored to lean mass (~2.6 g/kg LBM ≈ 1.7 g/kg total ≈ ~100g).
    const m = calculateMacros({
      ...base, bodyWeightKg: 60, sex: 'female', goal: 'cut',
      bodyFatPercent: 35, isCombatAthlete: true, deficitSeverity: 'aggressive',
    });
    expect(m).not.toBeNull();
    expect(m!.leanMassKg).toBeCloseTo(39, 0);
    expect(m!.protein).toBeLessThan(130);            // not 186
    expect(m!.protein).toBeLessThanOrEqual(Math.round(m!.leanMassKg! * 3.5)); // under the hard ceiling
    expect(m!.carbs).toBeGreaterThan(0);             // not clamped to zero
  });

  it('a lean athlete on an aggressive cut still gets the high-protein target (~3.1 g/kg)', () => {
    const m = calculateMacros({
      ...base, bodyWeightKg: 75, goal: 'cut',
      bodyFatPercent: 10, isCombatAthlete: true, deficitSeverity: 'aggressive',
    });
    expect(m).not.toBeNull();
    // BF<25 → total-BW scaling at 3.1 g/kg
    expect(m!.protein).toBe(Math.round(75 * 3.1));
  });

  it('returns null for an incomplete profile instead of NaN', () => {
    expect(calculateMacros({ ...base, bodyWeightKg: 0 })).toBeNull();
  });
});
