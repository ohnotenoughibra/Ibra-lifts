import { describe, it, expect } from 'vitest';
import { backfillBodyweightInLogs } from '@/lib/weight-estimator';
import type { WorkoutLog } from '@/lib/types';

const NOW = '2026-06-04T00:00:00.000Z';

// Minimal WorkoutLog factory — only the fields the backfill reads/writes.
function log(exercises: Array<{ exerciseId: string; sets: Array<Partial<{ weight: number; reps: number; completed: boolean; duration: number }>> }>, extra: Partial<WorkoutLog> = {}): WorkoutLog {
  return {
    id: 'l1',
    date: new Date('2026-01-01'),
    exercises: exercises.map(e => ({ exerciseId: e.exerciseId, exerciseName: e.exerciseId, sets: e.sets })),
    totalVolume: 0,
    duration: 30,
    overallRPE: 7,
    soreness: 3,
    energy: 7,
    completed: true,
    ...extra,
  } as unknown as WorkoutLog;
}

describe('backfillBodyweightInLogs', () => {
  it('sets bodyweight on zero-weight pull-up sets (kg)', () => {
    const { logs, changed } = backfillBodyweightInLogs(
      [log([{ exerciseId: 'pull-up', sets: [{ weight: 0, reps: 8, completed: true }] }])],
      90, 'kg', NOW,
    );
    expect(changed).toBe(true);
    expect(logs[0].exercises[0].sets[0].weight).toBe(90);
  });

  it('converts bodyweight to lbs for lbs users', () => {
    const { logs } = backfillBodyweightInLogs(
      [log([{ exerciseId: 'dip', sets: [{ weight: 0, reps: 10, completed: true }] }])],
      90, 'lbs', NOW,
    );
    // 90 kg → ~198.4 lbs
    expect(logs[0].exercises[0].sets[0].weight).toBeCloseTo(198.4, 1);
  });

  it('leaves weighted sets (added load) untouched', () => {
    const { logs, changed } = backfillBodyweightInLogs(
      [log([{ exerciseId: 'pull-up', sets: [{ weight: 20, reps: 5, completed: true }] }])],
      90, 'kg', NOW,
    );
    expect(changed).toBe(false);
    expect(logs[0].exercises[0].sets[0].weight).toBe(20);
  });

  it('ignores non-bodyweight exercises', () => {
    const { changed } = backfillBodyweightInLogs(
      [log([{ exerciseId: 'bench-press', sets: [{ weight: 0, reps: 5, completed: true }] }])],
      90, 'kg', NOW,
    );
    expect(changed).toBe(false);
  });

  it('skips timed holds (duration set)', () => {
    const { changed } = backfillBodyweightInLogs(
      [log([{ exerciseId: 'pull-up', sets: [{ weight: 0, reps: 0, completed: true, duration: 30 }] }])],
      90, 'kg', NOW,
    );
    expect(changed).toBe(false);
  });

  it('recomputes totalVolume from completed sets only', () => {
    const { logs } = backfillBodyweightInLogs(
      [log([{ exerciseId: 'pull-up', sets: [
        { weight: 0, reps: 8, completed: true },
        { weight: 0, reps: 6, completed: false },
      ] }])],
      90, 'kg', NOW,
    );
    // Only the completed set counts: 90 × 8 = 720
    expect(logs[0].totalVolume).toBe(720);
  });

  it('stamps updatedAt on changed logs so the cloud merge keeps them', () => {
    const { logs } = backfillBodyweightInLogs(
      [log([{ exerciseId: 'chin-up', sets: [{ weight: 0, reps: 8, completed: true }] }])],
      90, 'kg', NOW,
    );
    expect(logs[0].updatedAt).toBe(NOW);
  });

  it('is idempotent — a second pass changes nothing', () => {
    const first = backfillBodyweightInLogs(
      [log([{ exerciseId: 'pull-up', sets: [{ weight: 0, reps: 8, completed: true }] }])],
      90, 'kg', NOW,
    );
    const second = backfillBodyweightInLogs(first.logs, 90, 'kg', NOW);
    expect(second.changed).toBe(false);
  });

  it('does nothing without a known bodyweight', () => {
    const { changed } = backfillBodyweightInLogs(
      [log([{ exerciseId: 'pull-up', sets: [{ weight: 0, reps: 8, completed: true }] }])],
      undefined, 'kg', NOW,
    );
    expect(changed).toBe(false);
  });

  it('skips soft-deleted logs', () => {
    const { changed } = backfillBodyweightInLogs(
      [log([{ exerciseId: 'pull-up', sets: [{ weight: 0, reps: 8, completed: true }] }], { _deleted: true })],
      90, 'kg', NOW,
    );
    expect(changed).toBe(false);
  });
});
