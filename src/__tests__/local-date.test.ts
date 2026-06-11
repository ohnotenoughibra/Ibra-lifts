import { describe, it, expect, beforeEach } from 'vitest';
import {
  localDayKey,
  localDaysAgoKey,
  localMondayKey,
  parseLocalDate,
  asLocalDate,
  safeDayKey,
} from '@/lib/utils';
import { estimate1RM } from '@/lib/weight-estimator';
import { useAppStore } from '@/lib/store';
import type { UserProfile, ExerciseLog } from '@/lib/types';

// ─── localDayKey ────────────────────────────────────────────────────────────
// All Dates are constructed with LOCAL components so these tests pass in any
// timezone — they assert local-day semantics without touching process TZ.

describe('localDayKey', () => {
  it('keys by local calendar day, not UTC', () => {
    // 23:30 local on Jan 15 — in any west-of-UTC zone toISOString() would
    // say Jan 16; localDayKey must say Jan 15 everywhere.
    const lateNight = new Date(2026, 0, 15, 23, 30, 0);
    expect(localDayKey(lateNight)).toBe('2026-01-15');

    // 00:30 local — east-of-UTC zones would shift backwards via toISOString.
    const earlyMorning = new Date(2026, 0, 15, 0, 30, 0);
    expect(localDayKey(earlyMorning)).toBe('2026-01-15');
  });

  it('pads month and day', () => {
    expect(localDayKey(new Date(2026, 2, 5, 12))).toBe('2026-03-05');
  });

  it('defaults to now', () => {
    expect(localDayKey()).toBe(localDayKey(new Date()));
  });

  it('disagrees with toISOString exactly when the local/UTC day differs', () => {
    const d = new Date(2026, 0, 15, 23, 30, 0);
    const utcKey = d.toISOString().split('T')[0];
    const offsetMin = d.getTimezoneOffset();
    if (offsetMin > 30) {
      // West of UTC: 23:30 local is already "tomorrow" in UTC
      expect(utcKey).not.toBe('2026-01-15');
    }
    expect(localDayKey(d)).toBe('2026-01-15');
  });
});

describe('localDaysAgoKey', () => {
  it('returns today for n=0', () => {
    expect(localDaysAgoKey(0)).toBe(localDayKey());
  });

  it('returns the local key n days back', () => {
    const expected = new Date();
    expected.setDate(expected.getDate() - 3);
    expect(localDaysAgoKey(3)).toBe(localDayKey(expected));
  });
});

describe('parseLocalDate', () => {
  it('parses date-only strings as LOCAL midnight', () => {
    const d = parseLocalDate('2026-01-15');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(0);
  });

  it('round-trips with localDayKey', () => {
    expect(localDayKey(parseLocalDate('2026-01-15'))).toBe('2026-01-15');
    // new Date('2026-01-15') parses UTC midnight — west of UTC the local day
    // is Jan 14 and the round-trip breaks. parseLocalDate must not.
    expect(localDayKey(parseLocalDate('2026-12-31'))).toBe('2026-12-31');
  });

  it('passes full timestamps through to the normal parser', () => {
    const iso = '2026-01-15T12:34:56.000Z';
    expect(parseLocalDate(iso).getTime()).toBe(new Date(iso).getTime());
  });
});

describe('asLocalDate', () => {
  it('passes Date instances through', () => {
    const d = new Date(2026, 0, 15, 9);
    expect(asLocalDate(d)).toBe(d);
  });

  it('parses date-only strings as local midnight', () => {
    expect(localDayKey(asLocalDate('2026-01-15'))).toBe('2026-01-15');
  });
});

describe('localMondayKey', () => {
  it('maps every day of a week to that week\'s local Monday', () => {
    // 2026-06-08 is a Monday
    expect(localMondayKey(new Date(2026, 5, 8, 10))).toBe('2026-06-08');   // Mon
    expect(localMondayKey(new Date(2026, 5, 10, 23, 30))).toBe('2026-06-08'); // Wed late night
    expect(localMondayKey(new Date(2026, 5, 14, 0, 10))).toBe('2026-06-08'); // Sun just after midnight
  });

  it('Monday 00:00 local stays in its own week (toISOString would drift west of UTC)', () => {
    expect(localMondayKey(new Date(2026, 5, 8, 0, 0, 0))).toBe('2026-06-08');
  });
});

describe('safeDayKey (local semantics)', () => {
  it('uses local components for timestamps', () => {
    const lateNight = new Date(2026, 0, 15, 23, 30);
    expect(safeDayKey(lateNight)).toBe('2026-01-15');
  });

  it('passes valid date-only strings through unshifted', () => {
    expect(safeDayKey('2026-01-15')).toBe('2026-01-15');
  });

  it('still returns null for invalid input', () => {
    expect(safeDayKey('garbage')).toBeNull();
    expect(safeDayKey(null)).toBeNull();
    expect(safeDayKey(undefined)).toBeNull();
  });
});

// ─── estimate1RM ────────────────────────────────────────────────────────────

describe('estimate1RM', () => {
  it('returns 0 for zero/negative reps or weight', () => {
    expect(estimate1RM(100, 0)).toBe(0);
    expect(estimate1RM(100, -5)).toBe(0);
    expect(estimate1RM(0, 5)).toBe(0);
    expect(estimate1RM(-100, 5)).toBe(0);
  });

  it('returns 0 for NaN/Infinity inputs', () => {
    expect(estimate1RM(NaN, 5)).toBe(0);
    expect(estimate1RM(100, NaN)).toBe(0);
    expect(estimate1RM(Infinity, 5)).toBe(0);
  });

  it('returns the weight itself for a true single', () => {
    expect(estimate1RM(140, 1)).toBe(140);
  });

  it('matches Brzycki for normal rep ranges', () => {
    // 100kg x 5: 100 / (1.0278 - 0.139) = ~112.5
    expect(estimate1RM(100, 5)).toBeCloseTo(112.51, 1);
    expect(estimate1RM(100, 10)).toBeCloseTo(100 / (1.0278 - 0.278), 5);
  });

  it('caps effective reps at 12', () => {
    const at12 = estimate1RM(100, 12);
    expect(at12).toBeCloseTo(100 / (1.0278 - 0.0278 * 12), 5);
    // 30- and 40-rep burnout sets must not extrapolate past the 12-rep value
    expect(estimate1RM(100, 30)).toBe(at12);
    expect(estimate1RM(100, 40)).toBe(at12);
  });

  it('never returns a negative or absurd value for very high reps', () => {
    // Uncapped Brzycki goes negative past ~37 reps
    for (const reps of [13, 20, 37, 40, 100]) {
      const v = estimate1RM(100, reps);
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThanOrEqual(estimate1RM(100, 12) + 1e-9);
    }
  });
});

// ─── store: completeWorkout volume NaN guard + pause edge cases ─────────────

const testUser = {
  id: 'test-user',
  name: 'Test',
  age: 28,
  weight: 80,
  height: 180,
  sex: 'male',
  weightUnit: 'kg',
  experienceLevel: 'intermediate',
  goalFocus: 'strength',
  equipment: 'full_gym',
  sessionsPerWeek: 3,
  trainingIdentity: 'lifter',
} as unknown as UserProfile;

function seedActiveWorkout(overrides: Partial<NonNullable<ReturnType<typeof useAppStore.getState>['activeWorkout']>> = {}) {
  const session = {
    id: 'session-1',
    dayNumber: 1,
    name: 'Test Day',
    exercises: [],
  } as unknown as NonNullable<ReturnType<typeof useAppStore.getState>['activeWorkout']>['session'];

  useAppStore.setState({
    user: { ...testUser },
    currentMesocycle: null,
    workoutLogs: [],
    trainingSessions: [],
    quickLogs: [],
    activeWorkout: {
      session,
      baseSession: session,
      exerciseLogs: [],
      startTime: new Date(Date.now() - 30 * 60 * 1000), // started 30 min ago
      mesocycleId: 'standalone',
      ...overrides,
    },
  });
}

describe('completeWorkout volume guard', () => {
  beforeEach(() => {
    seedActiveWorkout();
  });

  it('ignores NaN/negative/zero sets when summing volume', () => {
    const exerciseLogs = [{
      exerciseId: 'bench',
      exerciseName: 'Bench Press',
      sets: [
        { weight: 100, reps: 5, completed: true },          // valid: 500
        { weight: NaN, reps: 5, completed: true },           // NaN weight — skip
        { weight: 100, reps: NaN, completed: true },         // NaN reps — skip
        { weight: -50, reps: 5, completed: true },           // negative — skip
        { weight: 100, reps: 0, completed: true },           // zero reps — skip
        { weight: 80, reps: 10, completed: true },           // valid: 800
        { weight: 60, reps: 10, completed: false },          // not completed — skip
      ],
    }] as unknown as ExerciseLog[];
    useAppStore.setState({
      activeWorkout: { ...useAppStore.getState().activeWorkout!, exerciseLogs },
    });

    useAppStore.getState().completeWorkout({ overallRPE: 7, soreness: 2, energy: 3 });

    const log = useAppStore.getState().workoutLogs.at(-1)!;
    expect(log.totalVolume).toBe(1300);
    expect(Number.isFinite(log.totalVolume)).toBe(true);
  });
});

describe('pause edge cases', () => {
  it('pauseWorkout is a no-op when already paused', () => {
    seedActiveWorkout();
    useAppStore.getState().pauseWorkout();
    const firstPausedAt = useAppStore.getState().activeWorkout!.pausedAt;
    expect(firstPausedAt).toBeTruthy();

    useAppStore.getState().pauseWorkout(); // double call
    expect(useAppStore.getState().activeWorkout!.pausedAt).toBe(firstPausedAt);
  });

  it('completing while paused excludes the open pause segment from duration', () => {
    // Started 30 min ago, paused 20 min ago and never resumed →
    // only ~10 min of actual training time.
    seedActiveWorkout({
      pausedAt: new Date(Date.now() - 20 * 60 * 1000),
      totalPausedMs: 0,
    });

    useAppStore.getState().completeWorkout({ overallRPE: 7, soreness: 2, energy: 3 });

    const log = useAppStore.getState().workoutLogs.at(-1)!;
    expect(log.duration).toBeGreaterThanOrEqual(9);
    expect(log.duration).toBeLessThanOrEqual(11);
  });
});
