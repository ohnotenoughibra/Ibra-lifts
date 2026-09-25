/**
 * live-session — helpers behind the live-workout QoL batch (plan Phase 6
 * addendum). Each case pins a behaviour the athlete sees mid-session.
 */
import { describe, it, expect } from 'vitest';
import {
  quickAdjustOptions, stepWeight, personalBest, repsToBeat, lastTimeSets,
  sessionEta, warmupRamp, sessionDeltas,
} from '@/lib/live-session';

const BB = { implement: 'barbell', count: 1 } as const;
const DB2 = { implement: 'dumbbell', count: 2 } as const;
const KB = { implement: 'kettlebell', count: 1 } as const;
const MACH = { implement: 'machine', count: 1 } as const;
const BAND = { implement: 'band', count: 1 } as const;

const set = (weight: number, reps: number, extra: Record<string, unknown> = {}) =>
  ({ setNumber: 1, weight, reps, rpe: 8, completed: true, ...extra });
const wlog = (daysAgo: number, id: string, sets: any[], unit?: 'kg' | 'lbs') => ({
  id: `w${daysAgo}`, date: new Date(Date.now() - daysAgo * 864e5), weightUnit: unit,
  exercises: [{ exerciseId: id, exerciseName: id, personalRecord: false, sets }],
}) as any;

describe('quickAdjustOptions', () => {
  it('barbell kg: plate-pair steps, no +25', () => {
    expect(quickAdjustOptions(100, BB, 'kg').map(o => o.label)).toEqual(['−5', '−2.5', '+2.5', '+5', '+10']);
  });
  it('barbell lbs uses 5 lb steps', () => {
    expect(quickAdjustOptions(225, BB, 'lbs').map(o => o.value)).toEqual([215, 220, 230, 235, 245]);
  });
  it('dumbbells jump to real rack sizes, per hand', () => {
    expect(quickAdjustOptions(12, DB2, 'kg').map(o => o.value)).toEqual([10, 14, 16]);
  });
  it('kettlebells jump bell to bell', () => {
    expect(quickAdjustOptions(16, KB, 'kg').map(o => o.value)).toEqual([14, 20, 24]); // 14 kg bells exist
  });
  it('no negative buttons at zero, none for bands', () => {
    expect(quickAdjustOptions(0, MACH, 'kg').every(o => o.value > 0)).toBe(true);
    expect(quickAdjustOptions(0, BAND, 'kg')).toEqual([]);
  });
});

describe('stepWeight', () => {
  it('dumbbell + goes 12 → 14, − goes 12 → 10', () => {
    expect(stepWeight(12, DB2, 'kg', 1)).toBe(14);
    expect(stepWeight(12, DB2, 'kg', -1)).toBe(10);
  });
  it('never goes below zero', () => {
    expect(stepWeight(0, BB, 'kg', -1)).toBe(0);
    expect(stepWeight(0, KB, 'kg', -1)).toBe(0);
  });
});

describe('personalBest / repsToBeat', () => {
  it('ignores skipped and uncompleted sets', () => {
    const logs = [wlog(3, 'bench', [set(100, 5), set(140, 5, { skipped: true, completed: false }), set(150, 3, { completed: false })])];
    const pb = personalBest('bench', logs, 'kg');
    expect(pb.hasHistory).toBe(true);
    expect(pb.best).toBe(Math.round(100 / (1.0278 - 0.0278 * 5)));
  });
  it('converts history logged in lbs', () => {
    const pb = personalBest('bench', [wlog(3, 'bench', [set(220, 1)], 'lbs')], 'kg');
    expect(pb.best).toBeGreaterThan(99);
    expect(pb.best).toBeLessThan(101);
  });
  it('first-ever exercise has no history', () => {
    expect(personalBest('bench', [], 'kg').hasHistory).toBe(false);
  });
  it('fewest reps at a load that beat the best e1RM', () => {
    const best = Math.round(100 / (1.0278 - 0.0278 * 5)); // 100×5 ≈ 113
    expect(repsToBeat(100, best)).toBe(6);
    expect(repsToBeat(60, best)).toBeNull();
  });
});

describe('lastTimeSets', () => {
  it('returns the most recent session, real sets only, prefill RPE dropped', () => {
    const logs = [
      wlog(10, 'row', [set(60, 10)]),
      wlog(3, 'row', [set(70, 8, { rpe: 9, rpeSource: 'user' }), set(70, 7, { rpeSource: 'prefill' }), set(0, 0, { skipped: true, completed: false })]),
    ];
    expect(lastTimeSets('row', logs, 'kg')).toEqual([
      { weight: 70, reps: 8, rpe: 9 },
      { weight: 70, reps: 7 },
    ]);
  });
});

describe('sessionEta', () => {
  const start = new Date('2026-09-25T10:00:00Z');
  it('counts remaining work + rest, no rest after the final set', () => {
    const eta = sessionEta(
      [{ sets: 3, restSeconds: 120 }, { sets: 2, restSeconds: 60 }],
      [{ sets: [set(1, 1)] as any }, { sets: [] }],
      start, 60, new Date('2026-09-25T10:10:00Z'),
    );
    // 2×(40+120) + 2×(40+60) − 60 = 460s ≈ 8 min
    expect(eta.minutesLeft).toBe(8);
    expect(eta.overBudget).toBe(false);
  });
  it('flags over budget when projected total runs >10% long', () => {
    const eta = sessionEta([{ sets: 10, restSeconds: 180 }], [{ sets: [] }], start, 30, new Date('2026-09-25T10:20:00Z'));
    expect(eta.overBudget).toBe(true);
  });
  it('zero when everything is done or skipped', () => {
    const eta = sessionEta([{ sets: 2, restSeconds: 90 }], [{ sets: [set(1, 1), set(0, 0, { skipped: true, completed: false })] as any }], start, 45, start);
    expect(eta.minutesLeft).toBe(0);
  });
});

describe('warmupRamp', () => {
  it('heavy barbell work: bar, then rising rungs ending with a single', () => {
    const r = warmupRamp(140, 5, BB, 'kg');
    expect(r[0]).toEqual({ weight: 20, reps: 8 });
    expect(r.at(-1)!.reps).toBe(1);
    for (let i = 1; i < r.length; i++) expect(r[i].weight).toBeGreaterThan(r[i - 1].weight);
    expect(r.every(s => s.weight < 140 && s.weight % 2.5 === 0)).toBe(true);
  });
  it('hypertrophy work gets a short ramp', () => {
    expect(warmupRamp(80, 10, BB, 'kg').length).toBeLessThanOrEqual(3);
  });
  it('a working weight near the empty bar needs no ladder beyond real steps', () => {
    expect(warmupRamp(25, 8, BB, 'kg').every(s => s.weight >= 20 && s.weight < 25)).toBe(true);
  });
  it('dumbbells ramp on real sizes; bands do not ramp', () => {
    expect(warmupRamp(30, 8, DB2, 'kg').every(s => s.weight % 2 === 0)).toBe(true);
    expect(warmupRamp(30, 8, BAND, 'kg')).toEqual([]);
  });
});

describe('sessionDeltas', () => {
  it('today top set vs last time top set, e1RM change', () => {
    const today = [{ exerciseId: 'squat', exerciseName: 'Squat', personalRecord: true, sets: [set(100, 5), set(105, 5)] }] as any;
    const hist = [wlog(4, 'squat', [set(100, 5)])];
    const [d] = sessionDeltas(today, hist, 'kg');
    expect(d.today).toMatchObject({ weight: 105, reps: 5 });
    expect(d.last).toMatchObject({ weight: 100, reps: 5 });
    expect(d.change).toBeGreaterThan(0);
    expect(d.pr).toBe(true);
  });
  it('lifts without history have no change; untouched lifts are left out', () => {
    const today = [
      { exerciseId: 'new', exerciseName: 'New', personalRecord: false, sets: [set(20, 10)] },
      { exerciseId: 'skip', exerciseName: 'Skip', personalRecord: false, sets: [set(0, 0, { completed: false })] },
    ] as any;
    const out = sessionDeltas(today, [], 'kg');
    expect(out).toHaveLength(1);
    expect(out[0].change).toBeNull();
  });
});

describe('stripLegacyDefaultTempos', () => {
  it('removes the four generator defaults, keeps anything else', async () => {
    const { stripLegacyDefaultTempos, stripLegacyDefaultTemposFromSession } = await import('@/lib/live-session');
    const meso = { weeks: [{ sessions: [{ exercises: [
      { prescription: { tempo: '2-1-X-0' } }, { prescription: { tempo: '3-1-2-0' } },
      { prescription: { tempo: '4-0-1-0' } }, { prescription: {} },
    ] }] }] };
    expect(stripLegacyDefaultTempos(meso as any)).toBe(2);
    expect(meso.weeks[0].sessions[0].exercises.map(e => (e.prescription as any).tempo)).toEqual([undefined, undefined, '4-0-1-0', undefined]);
    expect(stripLegacyDefaultTempos(null)).toBe(0);
    expect(stripLegacyDefaultTemposFromSession({ exercises: [{ prescription: { tempo: '1-0-X-0' } }] })).toBe(1);
  });
});

describe('generator: no default tempo', () => {
  it('new mesocycles carry no tempo unless deliberately prescribed', async () => {
    const { generateMesocycle } = await import('@/lib/workout-generator');
    const meso: any = (generateMesocycle as any)({
      userId: 'u', goalFocus: 'strength', equipment: 'full_gym', sessionsPerWeek: 3, weeks: 4,
    });
    const tempos = meso.weeks.flatMap((w: any) => w.sessions.flatMap((s: any) => s.exercises.map((e: any) => e.prescription.tempo)));
    expect(tempos.length).toBeGreaterThan(0);
    expect(tempos.every((t: unknown) => t === undefined)).toBe(true);
  });
});
