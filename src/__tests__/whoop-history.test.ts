/**
 * Whoop history (2026-09 Whoop upgrade): the store keeps a merged rolling
 * history instead of a replaced 7-day snapshot, and the API route pages
 * through Whoop collections for the backfill window.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  mergeWearableHistory, mergeWhoopWorkouts, syncWindowDays,
  BACKFILL_DAYS, ROUTINE_DAYS,
} from '@/lib/whoop-history';
import { whoopFetchAll, clampDays } from '@/lib/whoop';
import { transformWhoopData } from '@/lib/whoop-client';
import type { WearableData, WhoopWorkout } from '@/lib/types';

const DAY = 24 * 3600e3;
const NOW = Date.parse('2026-09-27T12:00:00Z');

function day(offsetDays: number, fields: Partial<WearableData> = {}): WearableData {
  return {
    id: `c${offsetDays}`, date: new Date(NOW - offsetDays * DAY), provider: 'whoop',
    hrv: null, restingHR: null, sleepScore: null, sleepHours: null, recoveryScore: null, strain: null,
    respiratoryRate: null, skinTemp: null, caloriesBurned: null, spo2: null, sleepEfficiency: null,
    deepSleepMinutes: null, remSleepMinutes: null, sleepDisturbances: null, lightSleepMinutes: null,
    sleepCycleCount: null, sleepConsistency: null, sleepNeededHours: null, avgHeartRate: null, maxHeartRate: null,
    ...fields,
  };
}
const workout = (id: string, offsetDays: number, strain = 8): WhoopWorkout => ({
  id, sportId: 45, sportName: 'Weightlifting',
  start: new Date(NOW - offsetDays * DAY), end: new Date(NOW - offsetDays * DAY + 3600e3),
  strain, avgHR: 120, maxHR: 160, calories: 400, distanceMeters: null, zones: [],
});

describe('mergeWearableHistory', () => {
  it('keeps older days a short fetch no longer returns (the old code replaced them)', () => {
    const stored = Array.from({ length: 30 }, (_, i) => day(i + 1, { hrv: 60 + i }));
    const fetched = [day(1, { hrv: 99 }), day(0, { hrv: 70 })];
    const merged = mergeWearableHistory(stored, fetched, NOW);
    expect(merged).toHaveLength(31);
    expect(merged[merged.length - 1].hrv).toBe(70);
    expect(merged.find(d => d.id === 'c1')!.hrv).toBe(99);
    expect(merged.find(d => d.id === 'c30')!.hrv).toBe(89);
  });

  it('a partial fetched day does not wipe fields it is missing', () => {
    const stored = [day(0, { recoveryScore: 71, hrv: 62, sleepHours: 7.5 })];
    const fetched = [day(0, { strain: 9.4, sleepHours: null })];
    const [d] = mergeWearableHistory(stored, fetched, NOW);
    expect(d).toMatchObject({ recoveryScore: 71, hrv: 62, sleepHours: 7.5, strain: 9.4 });
  });

  it('a "today-" placeholder id never replaces the real cycle id', () => {
    const [d] = mergeWearableHistory([day(0, { id: '123' })], [day(0, { id: 'today-2026-09-27', strain: 3 })], NOW);
    expect(d.id).toBe('123');
    expect(d.strain).toBe(3);
  });

  it('drops days beyond the keep window and sorts oldest → newest', () => {
    const merged = mergeWearableHistory([day(100), day(5)], [day(2), day(40)], NOW, 90);
    expect(merged.map(d => d.id)).toEqual(['c40', 'c5', 'c2']);
  });

  it('survives dates rehydrated from localStorage as strings', () => {
    const stored = [{ ...day(3), date: new Date(NOW - 3 * DAY).toISOString() as unknown as Date }];
    expect(mergeWearableHistory(stored, [day(3, { hrv: 50 })], NOW)).toHaveLength(1);
  });
});

describe('mergeWhoopWorkouts', () => {
  it('merges by id, fetched (re-scored) version wins, newest first', () => {
    const merged = mergeWhoopWorkouts([workout('a', 20), workout('b', 3, 8)], [workout('b', 3, 11), workout('c', 1)], NOW);
    expect(merged.map(w => w.id)).toEqual(['c', 'b', 'a']);
    expect(merged.find(w => w.id === 'b')!.strain).toBe(11);
  });
  it('drops workouts older than the keep window', () => {
    expect(mergeWhoopWorkouts([workout('old', 61)], [], NOW, 60)).toHaveLength(0);
  });
});

describe('syncWindowDays', () => {
  it('backfills when the stored history is thin', () => {
    expect(syncWindowDays([], NOW)).toBe(BACKFILL_DAYS);
    expect(syncWindowDays(Array.from({ length: 7 }, (_, i) => day(i)), NOW)).toBe(BACKFILL_DAYS);
  });
  it('uses the routine window when history is current', () => {
    expect(syncWindowDays(Array.from({ length: 30 }, (_, i) => day(i)), NOW)).toBe(ROUTINE_DAYS);
  });
  it('covers the gap after a long break (capped at the backfill)', () => {
    expect(syncWindowDays(Array.from({ length: 30 }, (_, i) => day(i + 20)), NOW)).toBe(22);
    expect(syncWindowDays(Array.from({ length: 30 }, (_, i) => day(i + 80)), NOW)).toBe(BACKFILL_DAYS);
  });
});

describe('whoopFetchAll / clampDays', () => {
  afterEach(() => vi.restoreAllMocks());

  it('follows next_token across pages', async () => {
    const seen: string[] = [];
    global.fetch = vi.fn(async (url: RequestInfo | URL) => {
      const u = new URL(String(url));
      seen.push(u.searchParams.get('nextToken') ?? '-');
      const page = u.searchParams.get('nextToken');
      const body = page === null ? { records: [1, 2], next_token: 'p2' }
        : page === 'p2' ? { records: [3], next_token: 'p3' } : { records: [4] };
      return new Response(JSON.stringify(body), { status: 200 });
    }) as typeof fetch;
    const r = await whoopFetchAll('/recovery', 'at', { start: 's', end: 'e' });
    expect(r.data?.records).toEqual([1, 2, 3, 4]);
    expect(seen).toEqual(['-', 'p2', 'p3']);
  });

  it('keeps earlier pages when a later page fails', async () => {
    let n = 0;
    global.fetch = vi.fn(async () => (n++ === 0
      ? new Response(JSON.stringify({ records: [1], next_token: 'x' }), { status: 200 })
      : new Response('boom', { status: 500 }))) as typeof fetch;
    const r = await whoopFetchAll('/cycle', 'at', { start: 's', end: 'e' });
    expect(r.data?.records).toEqual([1]);
    expect(r.error).toMatch(/500/);
  });

  it('clamps the requested window to 1–60 days (default 7)', () => {
    expect(clampDays(undefined)).toBe(7);
    expect(clampDays('abc')).toBe(7);
    expect(clampDays(0)).toBe(7);
    expect(clampDays(30)).toBe(30);
    expect(clampDays(999)).toBe(60);
  });
});

describe('transformWhoopData sleep', () => {
  it('ignores naps (they overwrote the main night) and keeps sleep start/end', () => {
    const night = { start: '2026-09-26T22:30:00Z', end: '2026-09-27T06:30:00Z', score_state: 'SCORED', nap: false,
      score: { stage_summary: { total_in_bed_time_milli: 8 * 3600e3 }, sleep_performance_percentage: 90 } };
    const nap = { start: '2026-09-27T13:00:00Z', end: '2026-09-27T13:25:00Z', score_state: 'SCORED', nap: true,
      score: { stage_summary: { total_in_bed_time_milli: 25 * 60e3 }, sleep_performance_percentage: 10 } };
    const { data } = transformWhoopData({
      connected: true, cycles: [{ id: 9, start: '2026-09-26T22:30:00Z', end: '2026-09-27T20:00:00Z', score_state: 'SCORED', score: { strain: 5 } }],
      recovery: [], sleep: [night, nap], workouts: [],
    });
    const d = data.find(x => x.id === '9')!;
    expect(d.sleepHours).toBe(8);
    expect(d.sleepScore).toBe(90);
    expect(d.sleepStart).toBe(night.start);
    expect(d.sleepEnd).toBe(night.end);
  });
});
