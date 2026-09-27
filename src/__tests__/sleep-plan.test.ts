/**
 * Sleep plan (2026-09 Whoop upgrade): 3-night sleep debt vs Whoop's need,
 * and a bedtime from usual wake time − need.
 */
import { describe, it, expect } from 'vitest';
import { recentSleepDebt, isSignificantSleepDebt, bedtimeTarget, hoursAsleep } from '@/lib/sleep-plan';
import type { WearableData } from '@/lib/types';

const DAY = 24 * 3600e3;
// Local-time dates so wake times read the same in any TZ the tests run in.
const NOW = new Date(2026, 8, 27, 12, 0).getTime();

function night(daysAgo: number, f: Partial<WearableData> = {}): WearableData {
  const wake = new Date(NOW - daysAgo * DAY);
  wake.setHours(6, 30, 0, 0);
  return {
    id: `n${daysAgo}`, date: wake, provider: 'whoop',
    hrv: null, restingHR: null, sleepScore: null, sleepHours: 8, recoveryScore: null, strain: null,
    respiratoryRate: null, skinTemp: null, caloriesBurned: null, spo2: null, sleepEfficiency: null,
    deepSleepMinutes: null, remSleepMinutes: null, sleepDisturbances: null, lightSleepMinutes: null,
    sleepCycleCount: null, sleepConsistency: null, sleepNeededHours: 8, avgHeartRate: null, maxHeartRate: null,
    sleepEnd: wake.toISOString(),
    ...f,
  };
}

describe('recentSleepDebt', () => {
  it('sums hours short of need over the last 3 nights', () => {
    const h = [night(3, { sleepHours: 5 }), night(2, { sleepHours: 6 }), night(1, { sleepHours: 6.5 }), night(0, { sleepHours: 7.5 })];
    const d = recentSleepDebt(h, NOW);
    expect(d).toEqual({ nights: 3, shortNights: 2, deficitHours: 4 }); // 2 + 1.5 + 0.5
    expect(isSignificantSleepDebt(d)).toBe(true);
  });

  it('one short night is not "debt" (it is already in the recovery score)', () => {
    const d = recentSleepDebt([night(2), night(1), night(0, { sleepHours: 5 })], NOW);
    expect(d.shortNights).toBe(1);
    expect(isSignificantSleepDebt(d)).toBe(false);
  });

  it('uses time asleep (stages) over time in bed when available', () => {
    const n = night(0, { sleepHours: 8, lightSleepMinutes: 240, deepSleepMinutes: 90, remSleepMinutes: 90 });
    expect(hoursAsleep(n)).toBe(7);
    expect(recentSleepDebt([n], NOW).deficitHours).toBe(1);
  });

  it('ignores days without sleep data (today\'s placeholder) and never goes negative', () => {
    const d = recentSleepDebt([night(1, { sleepHours: 9.5 }), night(0, { sleepHours: null })], NOW);
    expect(d).toEqual({ nights: 1, shortNights: 0, deficitHours: 0 });
  });
});

describe('bedtimeTarget', () => {
  it('wake time − need − 15 min, rounded down to 5', () => {
    const h = [night(3), night(2), night(1, { sleepNeededHours: 8.4 })];
    // 06:30 − 8h24 − 15 = 21:51 → 21:50
    expect(bedtimeTarget(h, NOW)).toEqual({ bedtime: '21:50', wake: '06:30', needHours: 8.4 });
  });

  it('uses the median wake time (one lie-in does not move it)', () => {
    const late = night(1);
    const lateEnd = new Date(late.sleepEnd!); lateEnd.setHours(10, 0);
    const h = [night(4), night(3), night(2), { ...late, sleepEnd: lateEnd.toISOString() }];
    expect(bedtimeTarget(h, NOW)!.wake).toBe('06:30');
  });

  it('needs Whoop need data and ≥3 wake times', () => {
    expect(bedtimeTarget([night(1), night(0)], NOW)).toBeNull();
    expect(bedtimeTarget([night(3), night(2), night(1)].map(n => ({ ...n, sleepNeededHours: null })), NOW)).toBeNull();
  });
});
