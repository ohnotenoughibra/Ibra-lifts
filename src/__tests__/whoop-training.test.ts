/**
 * Whoop ↔ training (2026-09 Whoop upgrade): lifts get their Whoop workout
 * after Whoop scores it, per-session insight, and Whoop-only workouts count
 * in the 28-day training load.
 */
import { describe, it, expect } from 'vitest';
import { backfillLiftWhoopHR, liftWhoopInsight, unclaimedWhoopLoad } from '@/lib/whoop-training';
import { calculateEnhancedACWR } from '@/lib/fatigue-metrics';
import type { TrainingSession, WhoopWorkout, WorkoutLog } from '@/lib/types';

const MIN = 60e3;
const DAY = 24 * 60 * MIN;
const T0 = Date.parse('2026-09-20T18:00:00Z'); // a lift finishing at 18:00

function lift(id: string, finish: number, fields: Partial<WorkoutLog> = {}): WorkoutLog {
  return {
    id, userId: 'u', mesocycleId: 'm', sessionId: 's', weekNumber: 1, dayNumber: 1,
    date: new Date(finish), exercises: [], totalVolume: 10000, weightUnit: 'kg', duration: 60,
    overallRPE: 8, soreness: 3, energy: 7, completed: true, ...fields,
  } as WorkoutLog;
}
function ww(id: string, start: number, mins: number, f: Partial<WhoopWorkout> = {}): WhoopWorkout {
  return {
    id, sportId: 45, sportName: 'Weightlifting', start: new Date(start), end: new Date(start + mins * MIN),
    strain: 10, avgHR: 125, maxHR: 165, calories: 450, distanceMeters: null, zones: [{ zone: 2, minutes: 30 }], ...f,
  };
}
function mat(whoopWorkoutId: string, start: number): TrainingSession {
  return { id: `ts-${whoopWorkoutId}`, date: new Date(start), category: 'grappling', type: 'bjj_nogi',
    plannedIntensity: 'hard_sparring', duration: 60, perceivedExertion: 8, whoopWorkoutId } as unknown as TrainingSession;
}

describe('backfillLiftWhoopHR', () => {
  it('links a lift once Whoop has the workout (it was missing at Finish)', () => {
    const [u] = backfillLiftWhoopHR([lift('L1', T0)], [ww('W1', T0 - 58 * MIN, 60)]);
    expect(u).toMatchObject({ logId: 'L1', whoopHR: { strain: 10, avgHR: 125, whoopWorkoutId: 'W1' } });
  });

  it('never claims a Whoop workout already imported as a mat session', () => {
    const bjj = ww('BJJ', T0 - 60 * MIN, 60, { sportId: 70 });
    expect(backfillLiftWhoopHR([lift('L1', T0)], [bjj], [mat('BJJ', T0 - 60 * MIN)])).toEqual([]);
  });

  it('one Whoop workout goes to one lift, and linked lifts are not re-matched', () => {
    const w = ww('W1', T0 - 60 * MIN, 60);
    const already = lift('L0', T0, { whoopHR: { avgHR: 125, maxHR: 165, strain: 10, calories: 450, whoopWorkoutId: 'W1' } });
    expect(backfillLiftWhoopHR([already, lift('L1', T0 + 5 * MIN)], [w])).toEqual([]);
  });

  it('refreshes a linked lift when Whoop re-scores the workout', () => {
    const linked = lift('L1', T0, { whoopHR: { avgHR: 125, maxHR: 165, strain: 10, calories: 450, whoopWorkoutId: 'W1' } });
    const [u] = backfillLiftWhoopHR([linked], [ww('W1', T0 - 60 * MIN, 60, { strain: 11.2 })]);
    expect(u.whoopHR.strain).toBe(11.2);
  });

  it('leaves legacy matches (no id) and far-apart workouts alone', () => {
    const legacy = lift('L1', T0, { whoopHR: { avgHR: 1, maxHR: 1, strain: 1, calories: 1 } });
    expect(backfillLiftWhoopHR([legacy], [ww('W1', T0 - 60 * MIN, 60)])).toEqual([]);
    expect(backfillLiftWhoopHR([lift('L2', T0)], [ww('W2', T0 + 5 * 60 * MIN, 60)])).toEqual([]);
  });

  it('skips deleted logs', () => {
    expect(backfillLiftWhoopHR([lift('L1', T0, { _deleted: true })], [ww('W1', T0 - 60 * MIN, 60)])).toEqual([]);
  });
});

describe('liftWhoopInsight', () => {
  const hr = (strain: number) => ({ avgHR: 130, maxHR: 170, strain, calories: 400, whoopWorkoutId: 'x' });

  it('is null until the lift has Whoop data', () => {
    expect(liftWhoopInsight(lift('L', T0), [])).toBeNull();
  });

  it('strain per tonne vs the median of your previous sessions', () => {
    const history = [1, 2, 3, 4].map(i => lift(`P${i}`, T0 - i * DAY, { whoopHR: hr(10) })); // 1.0 / t
    const today = lift('L', T0, { whoopHR: hr(12) }); // 1.2 / t
    const r = liftWhoopInsight(today, [...history, today])!;
    expect(r.strainPerTonne).toBe(1.2);
    expect(r.vsUsualPct).toBe(20);
  });

  it('normalises lbs volume to kg', () => {
    const r = liftWhoopInsight(lift('L', T0, { totalVolume: 22046, weightUnit: 'lbs', whoopHR: hr(10) }), [])!;
    expect(r.strainPerTonne).toBe(1);
  });

  it('needs ≥3 prior sessions for "vs usual" and real volume for per-tonne', () => {
    const r = liftWhoopInsight(lift('L', T0, { whoopHR: hr(10) }), [lift('P', T0 - DAY, { whoopHR: hr(10) })])!;
    expect(r.vsUsualPct).toBeNull();
    expect(liftWhoopInsight(lift('B', T0, { totalVolume: 0, whoopHR: hr(10) }), [])!.strainPerTonne).toBeNull();
  });

  it('reports logged RPE minus the heart-rate RPE', () => {
    const r = liftWhoopInsight(lift('L', T0, { overallRPE: 9, whoopHR: hr(6) }), [])!;
    expect(r.hrRPE).toBeGreaterThanOrEqual(1);
    expect(r.rpeGap).toBeCloseTo(9 - r.hrRPE, 5);
  });
});

describe('unclaimedWhoopLoad + ACWR', () => {
  it('counts a Whoop-only run but not a workout that is a logged lift or mat session', () => {
    const run = ww('RUN', T0 - 2 * DAY, 45, { sportId: 0, sportName: 'Running', strain: 12, avgHR: 150 });
    const liftW = ww('LIFT', T0 - 60 * MIN, 60);
    const bjj = ww('BJJ', T0 - DAY, 60, { sportId: 70 });
    const blip = ww('BLIP', T0 - 3 * DAY, 5);
    const load = unclaimedWhoopLoad([run, liftW, bjj, blip], [lift('L1', T0)], [mat('BJJ', T0 - DAY)]);
    expect(load).toHaveLength(1);
    expect(load[0]).toMatchObject({ duration: 45 });
    expect(load[0].rpe).toBeGreaterThan(4);
  });

  it('ACWR sees Whoop-only training the app never logged', () => {
    const now = Date.now();
    const logs = Array.from({ length: 12 }, (_, i) => lift(`L${i}`, now - (i * 2 + 1) * DAY));
    const runs = Array.from({ length: 4 }, (_, i) =>
      ww(`R${i}`, now - (i + 0.5) * DAY, 60, { sportId: 0, sportName: 'Running', strain: 14, avgHR: 155 }));
    const without = calculateEnhancedACWR(logs, []);
    const withWhoop = calculateEnhancedACWR(logs, [], runs);
    expect(withWhoop.acute).toBeGreaterThan(without.acute);
    expect(withWhoop.ratio).toBeGreaterThan(without.ratio);
    // Old callers (no Whoop arg) are unchanged
    expect(calculateEnhancedACWR(logs, [], [])).toEqual(without);
  });
});
