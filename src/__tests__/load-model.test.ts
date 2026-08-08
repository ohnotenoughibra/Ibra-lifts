import { describe, it, expect } from 'vitest';
import {
  rpeToPercentage,
  estimateE1RM,
  suggestLoad,
  carryOverLoad,
  prescribedPercentOf1RM,
  roundToIncrement,
} from '@/lib/load-model';

describe('rpeToPercentage', () => {
  it('matches the Helms/Zourdos chart at known anchors', () => {
    expect(rpeToPercentage(10, 1)).toBe(1.0);
    expect(rpeToPercentage(8, 5)).toBeCloseTo(0.793, 3);
    expect(rpeToPercentage(7, 12)).toBeCloseTo(0.56, 3);
  });

  it('falls as reps rise at a fixed RPE', () => {
    const pcts = [1, 3, 5, 8, 12].map((r) => rpeToPercentage(8, r));
    for (let i = 1; i < pcts.length; i++) {
      expect(pcts[i]).toBeLessThan(pcts[i - 1]);
    }
  });

  it('rises as RPE rises at a fixed rep count', () => {
    expect(rpeToPercentage(9, 5)).toBeGreaterThan(rpeToPercentage(7, 5));
  });

  it('extrapolates past the 12-rep table without collapsing', () => {
    const at12 = rpeToPercentage(8, 12);
    const at20 = rpeToPercentage(8, 20);
    expect(at20).toBeLessThan(at12);
    expect(at20).toBeGreaterThan(0.3);
  });

  it('clamps out-of-range RPE instead of returning undefined', () => {
    expect(rpeToPercentage(12, 5)).toBe(rpeToPercentage(10, 5));
    expect(rpeToPercentage(1, 5)).toBe(rpeToPercentage(5, 5));
  });

  it('survives NaN input', () => {
    expect(Number.isFinite(rpeToPercentage(NaN, 5))).toBe(true);
    expect(Number.isFinite(rpeToPercentage(8, NaN))).toBe(true);
  });
});

describe('estimateE1RM', () => {
  it('rates an easy set higher than a maximal one at the same load', () => {
    const easy = estimateE1RM(100, 5, 7);
    const grind = estimateE1RM(100, 5, 10);
    expect(easy).toBeGreaterThan(grind);
  });

  it('returns the load itself for a true single at RPE 10', () => {
    expect(estimateE1RM(140, 1, 10)).toBeCloseTo(140, 5);
  });

  it('assumes a near-maximal effort when RPE is missing', () => {
    expect(estimateE1RM(100, 5)).toBeCloseTo(estimateE1RM(100, 5, 9), 5);
  });

  it('returns 0 for junk input', () => {
    expect(estimateE1RM(0, 5, 8)).toBe(0);
    expect(estimateE1RM(100, 0, 8)).toBe(0);
    expect(estimateE1RM(NaN, 5, 8)).toBe(0);
  });
});

describe('suggestLoad', () => {
  it('rounds to 2.5 in kg and 5 in lbs', () => {
    expect(suggestLoad({ e1RM: 100, targetReps: 5, targetRPE: 8, unit: 'kg' }) % 2.5).toBe(0);
    expect(suggestLoad({ e1RM: 220, targetReps: 5, targetRPE: 8, unit: 'lbs' }) % 5).toBe(0);
  });

  it('never suggests zero for a positive e1RM', () => {
    expect(suggestLoad({ e1RM: 1, targetReps: 20, targetRPE: 6, unit: 'kg' })).toBeGreaterThan(0);
  });

  it('scales down with an intensity factor', () => {
    const full = suggestLoad({ e1RM: 150, targetReps: 5, targetRPE: 8, unit: 'kg' });
    const throttled = suggestLoad({ e1RM: 150, targetReps: 5, targetRPE: 8, unit: 'kg', intensityFactor: 0.85 });
    expect(throttled).toBeLessThan(full);
  });
});

describe('carryOverLoad — undulating (DUP) transitions', () => {
  it('drops the load hard going from a power day to a hypertrophy day', () => {
    // Power: 100 kg × 3 @ RPE 8 → hypertrophy: 12 reps @ RPE 7
    const r = carryOverLoad({
      lastWeight: 100, lastReps: 3, lastRPE: 8,
      targetReps: 12, targetRPE: 7, unit: 'kg',
    })!;
    expect(r).not.toBeNull();
    // e1RM ≈ 100 / 0.858 ≈ 116.6; 12 reps @ RPE 7 ≈ 0.560 → ≈ 65 kg
    expect(r.suggested).toBeGreaterThan(60);
    expect(r.suggested).toBeLessThan(70);
    // The old linear model produced ~75 kg here — far too heavy for 12 reps.
    expect(r.suggested).toBeLessThan(75);
  });

  it('raises the load going from a hypertrophy day to a power day', () => {
    const r = carryOverLoad({
      lastWeight: 70, lastReps: 12, lastRPE: 8,
      targetReps: 3, targetRPE: 8, unit: 'kg',
    })!;
    // e1RM ≈ 70 / 0.586 ≈ 119.5; 3 reps @ RPE 8 ≈ 0.858 → ≈ 102.5 kg
    expect(r.suggested).toBeGreaterThan(95);
    expect(r.suggested).toBeLessThan(110);
  });

  it('holds roughly steady when reps and RPE are unchanged', () => {
    const r = carryOverLoad({
      lastWeight: 100, lastReps: 8, lastRPE: 8,
      targetReps: 8, targetRPE: 8, unit: 'kg',
    })!;
    expect(r.suggested).toBeCloseTo(100, 0);
  });

  it('reports the %1RM today actually represents', () => {
    const r = carryOverLoad({
      lastWeight: 100, lastReps: 5, lastRPE: 8,
      targetReps: 12, targetRPE: 7, unit: 'kg',
    })!;
    expect(r.targetPct).toBeCloseTo(0.56, 2);
    expect(r.lastPct).toBeCloseTo(0.793, 2);
  });

  it('applies a too_hard intensity factor on top of the rep change', () => {
    const base = carryOverLoad({
      lastWeight: 100, lastReps: 5, lastRPE: 8,
      targetReps: 5, targetRPE: 8, unit: 'kg',
    })!;
    const eased = carryOverLoad({
      lastWeight: 100, lastReps: 5, lastRPE: 8,
      targetReps: 5, targetRPE: 8, unit: 'kg', intensityFactor: 0.9,
    })!;
    expect(eased.suggested).toBeLessThan(base.suggested);
  });

  it('returns null on unusable history', () => {
    expect(carryOverLoad({ lastWeight: 0, lastReps: 5, targetReps: 5, targetRPE: 8, unit: 'kg' })).toBeNull();
    expect(carryOverLoad({ lastWeight: 100, lastReps: 0, targetReps: 5, targetRPE: 8, unit: 'kg' })).toBeNull();
  });

  it('handles a strength-endurance target beyond the chart', () => {
    const r = carryOverLoad({
      lastWeight: 100, lastReps: 3, lastRPE: 8,
      targetReps: 20, targetRPE: 7, unit: 'kg',
    })!;
    expect(r.suggested).toBeGreaterThan(0);
    expect(r.suggested).toBeLessThan(60);
  });
});

describe('prescribedPercentOf1RM', () => {
  it('agrees with the load the model suggests', () => {
    const pct = prescribedPercentOf1RM(12, 7);
    const load = suggestLoad({ e1RM: 100, targetReps: 12, targetRPE: 7, unit: 'kg' });
    expect(Math.abs(load - pct)).toBeLessThanOrEqual(2.5);
  });

  it('puts a 3-rep RPE 9 day well above a 12-rep RPE 7 day', () => {
    expect(prescribedPercentOf1RM(3, 9)).toBeGreaterThan(prescribedPercentOf1RM(12, 7) + 20);
  });
});

describe('roundToIncrement', () => {
  it('rounds to the unit increment and never returns zero', () => {
    expect(roundToIncrement(101, 'kg')).toBe(100);
    expect(roundToIncrement(102, 'kg')).toBe(102.5);
    expect(roundToIncrement(0.1, 'kg')).toBe(2.5);
    expect(roundToIncrement(223, 'lbs')).toBe(225);
  });
});
