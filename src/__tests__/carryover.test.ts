import { describe, it, expect } from 'vitest';
import { detectCarryover, buildE1RMTimeline, areRelated, logWeightUnit } from '@/lib/carryover';
import { getExerciseById } from '@/lib/exercises';
import type { WorkoutLog, WeightUnit } from '@/lib/types';

const DAY = 86400000;
const ago = (days: number) => new Date(Date.now() - days * DAY);

const mkLog = (
  date: Date,
  entries: { id: string; weight: number; reps?: number; rpe?: number }[],
  weightUnit: WeightUnit | undefined = 'kg'
): WorkoutLog => ({
  id: `log-${date.getTime()}-${entries[0].id}`,
  userId: 'u', mesocycleId: 'm', sessionId: 's',
  date,
  weightUnit,
  exercises: entries.map(e => ({
    exerciseId: e.id,
    exerciseName: e.id,
    sets: [{ setNumber: 1, weight: e.weight, reps: e.reps ?? 5, rpe: e.rpe ?? 8, completed: true }],
    personalRecord: false,
  })),
  totalVolume: 0, duration: 60, overallRPE: 8, soreness: 3, energy: 7, completed: true,
} as unknown as WorkoutLog);

// Trap bar and conventional deadlift: both hinge, both share glutes + back.
const TRAP = 'trap-bar-deadlift';
const CONV = 'deadlift';

describe('relatedness is conservative', () => {
  it('links the two deadlifts', () => {
    expect(areRelated(getExerciseById(TRAP)!, getExerciseById(CONV)!)).toBe(true);
  });

  it('does not link a hinge to a press', () => {
    const bench = getExerciseById('bench-press');
    if (bench) expect(areRelated(getExerciseById(CONV)!, bench)).toBe(false);
  });

  it('never relates an exercise to itself', () => {
    expect(areRelated(getExerciseById(CONV)!, getExerciseById(CONV)!)).toBe(false);
  });
});

describe('e1RM timelines', () => {
  it('normalizes lbs logs to kg before comparing', () => {
    const kg = buildE1RMTimeline(CONV, [mkLog(ago(10), [{ id: CONV, weight: 100 }], 'kg')]);
    const lbs = buildE1RMTimeline(CONV, [mkLog(ago(10), [{ id: CONV, weight: 220 }], 'lbs')]);
    // 220 lbs ≈ 99.8 kg — these should land within a couple of kg of each other.
    expect(Math.abs(kg[0].e1RMKg - lbs[0].e1RMKg)).toBeLessThan(3);
  });

  it('falls back to the athlete unit for logs written before the field existed', () => {
    const legacy = mkLog(ago(5), [{ id: CONV, weight: 100 }]);
    delete (legacy as { weightUnit?: WeightUnit }).weightUnit;
    expect(logWeightUnit(legacy, 'lbs')).toBe('lbs');
    expect(logWeightUnit(legacy, 'kg')).toBe('kg');
  });

  it('skips incomplete sets rather than scoring them as zero', () => {
    const log = mkLog(ago(5), [{ id: CONV, weight: 100 }]);
    (log.exercises[0].sets as { completed: boolean }[])[0].completed = false;
    expect(buildE1RMTimeline(CONV, [log])).toHaveLength(0);
  });
});

describe('detectCarryover — the trap bar story', () => {
  // Trap bar trained then dropped ~4 months ago; conventional kept climbing.
  const logs: WorkoutLog[] = [
    mkLog(ago(200), [{ id: TRAP, weight: 140 }, { id: CONV, weight: 120 }]),
    mkLog(ago(180), [{ id: TRAP, weight: 145 }, { id: CONV, weight: 125 }]),
    mkLog(ago(160), [{ id: TRAP, weight: 150 }, { id: CONV, weight: 130 }]),
    mkLog(ago(90),  [{ id: CONV, weight: 155 }]),
    mkLog(ago(40),  [{ id: CONV, weight: 170 }]),
    mkLog(ago(5),   [{ id: CONV, weight: 180 }]),
  ];

  it('reports the dropped lift and the gain on the one that replaced it', () => {
    const out = detectCarryover(logs, getExerciseById, 'kg');
    const hit = out.find(i => i.dormantExerciseId === TRAP && i.relatedExerciseId === CONV);
    expect(hit).toBeTruthy();
    expect(hit!.relatedGain).toBeGreaterThan(20);
    expect(hit!.daysDormant).toBeGreaterThanOrEqual(150);
    expect(hit!.headline).toMatch(/up [\d.]+ kg/);
  });

  it('names the shared muscles and the movement pattern', () => {
    const [hit] = detectCarryover(logs, getExerciseById, 'kg');
    expect(hit.movementPattern).toBe('hinge');
    expect(hit.sharedMuscles.length).toBeGreaterThan(0);
    expect(hit.detail).toContain('hinge');
  });

  it('reports in the athlete display unit', () => {
    const [kgHit] = detectCarryover(logs, getExerciseById, 'kg');
    const [lbsHit] = detectCarryover(logs, getExerciseById, 'lbs');
    expect(kgHit.unit).toBe('kg');
    expect(lbsHit.unit).toBe('lbs');
    expect(lbsHit.relatedGain).toBeGreaterThan(kgHit.relatedGain);
  });

  it('stays silent when the related lift did not actually move', () => {
    const flat: WorkoutLog[] = [
      mkLog(ago(200), [{ id: TRAP, weight: 140 }, { id: CONV, weight: 150 }]),
      mkLog(ago(180), [{ id: TRAP, weight: 145 }, { id: CONV, weight: 150 }]),
      mkLog(ago(160), [{ id: TRAP, weight: 150 }, { id: CONV, weight: 150 }]),
      mkLog(ago(20),  [{ id: CONV, weight: 150 }]),
      mkLog(ago(5),   [{ id: CONV, weight: 150 }]),
    ];
    expect(detectCarryover(flat, getExerciseById, 'kg')).toHaveLength(0);
  });

  it('stays silent when both lifts were dropped', () => {
    const abandoned: WorkoutLog[] = [
      mkLog(ago(300), [{ id: TRAP, weight: 140 }, { id: CONV, weight: 120 }]),
      mkLog(ago(280), [{ id: TRAP, weight: 145 }, { id: CONV, weight: 130 }]),
      mkLog(ago(260), [{ id: TRAP, weight: 150 }, { id: CONV, weight: 150 }]),
    ];
    expect(detectCarryover(abandoned, getExerciseById, 'kg')).toHaveLength(0);
  });

  it('says nothing about a lift that is still being trained', () => {
    const current: WorkoutLog[] = [
      mkLog(ago(60), [{ id: TRAP, weight: 140 }, { id: CONV, weight: 150 }]),
      mkLog(ago(30), [{ id: TRAP, weight: 145 }, { id: CONV, weight: 160 }]),
      mkLog(ago(3),  [{ id: TRAP, weight: 150 }, { id: CONV, weight: 175 }]),
    ];
    expect(detectCarryover(current, getExerciseById, 'kg')).toHaveLength(0);
  });

  it('needs real history before calling anything dormant', () => {
    const thin: WorkoutLog[] = [
      mkLog(ago(200), [{ id: TRAP, weight: 150 }]),
      mkLog(ago(40),  [{ id: CONV, weight: 170 }]),
      mkLog(ago(5),   [{ id: CONV, weight: 185 }]),
    ];
    expect(detectCarryover(thin, getExerciseById, 'kg')).toHaveLength(0);
  });

  it('handles an empty history without throwing', () => {
    expect(detectCarryover([], getExerciseById, 'kg')).toEqual([]);
  });
});
