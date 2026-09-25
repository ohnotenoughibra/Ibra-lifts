/**
 * Sprint / air-bike protocols — the timer is only as good as its timeline,
 * and the finisher pick must never add fatigue the athlete can't afford.
 */
import { describe, it, expect } from 'vitest';
import {
  SPRINT_PROTOCOLS, getSprintProtocol, buildTimeline, totalSeconds, workSeconds,
  positionAt, isSurge, sessionLoad, recommendFinisher,
} from '@/lib/sprint-protocols';

describe('protocol definitions follow their energy system', () => {
  it('ids are unique and every protocol has a timeline', () => {
    const ids = SPRINT_PROTOCOLS.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of SPRINT_PROTOCOLS) expect(buildTimeline(p).length).toBeGreaterThan(0);
  });
  it('alactic work is ≤ 10 s with ≥ 1:5 work:rest (PCr needs time)', () => {
    for (const p of SPRINT_PROTOCOLS.filter(p => p.system === 'alactic')) {
      expect(p.block.workS).toBeLessThanOrEqual(10);
      expect(p.block.restS / p.block.workS).toBeGreaterThanOrEqual(5);
    }
  });
  it('RSA: sprints ≤ 10 s, recovery < 60 s', () => {
    for (const p of SPRINT_PROTOCOLS.filter(p => p.system === 'rsa')) {
      expect(p.block.workS).toBeLessThanOrEqual(10);
      expect(p.block.restS).toBeLessThan(60);
    }
  });
  it('30 s all-out SIT gets ≥ 3 min recovery and is never a finisher', () => {
    const sit = getSprintProtocol('sit-5x30')!;
    expect(sit.block.restS).toBeGreaterThanOrEqual(180);
    expect(sit.finisherOk).toBe(false);
  });
});

describe('buildTimeline', () => {
  it('8×8 s: warm-up, 8 work, 7 rests (no rest after the last), cool-down', () => {
    const t = buildTimeline(getSprintProtocol('alactic-8x8')!);
    expect(t[0].phase).toBe('warmup');
    expect(t.filter(s => s.phase === 'work')).toHaveLength(8);
    expect(t.filter(s => s.phase === 'rest')).toHaveLength(7);
    expect(t.at(-1)!.phase).toBe('cooldown');
    expect(t.at(-2)!.phase).toBe('work');
  });
  it('sets get a between-set rest and restart the rep count', () => {
    const t = buildTimeline(getSprintProtocol('rsa-2x6x6')!);
    expect(t.filter(s => s.phase === 'set_rest')).toHaveLength(1);
    const work = t.filter(s => s.phase === 'work');
    expect(work).toHaveLength(12);
    expect(work[6]).toMatchObject({ rep: 1, set: 2 });
  });
  it('totals add up', () => {
    const p = getSprintProtocol('alactic-8x8')!;
    expect(totalSeconds(p)).toBe(300 + 8 * 8 + 7 * 112 + 180);
    expect(workSeconds(p)).toBe(64);
  });
});

describe('positionAt', () => {
  const t = buildTimeline(getSprintProtocol('emom-10x10')!); // 120 warm-up, then 10/50…
  it('finds the step and time left', () => {
    expect(positionAt(t, 0)).toEqual({ index: 0, left: 120, done: false });
    expect(positionAt(t, 125)).toMatchObject({ index: 1, left: 5 });
    expect(t[1].phase).toBe('work');
  });
  it('is done past the end', () => {
    expect(positionAt(t, 10_000).done).toBe(true);
  });
});

describe('isSurge (fight rounds)', () => {
  const p = getSprintProtocol('fight-rounds-5x5')!;
  const work = buildTimeline(p).find(s => s.phase === 'work')!;
  it('last 10 s of every minute', () => {
    expect(isSurge(work, p, 49)).toBe(false);
    expect(isSurge(work, p, 50)).toBe(true);
    expect(isSurge(work, p, 59)).toBe(true);
    expect(isSurge(work, p, 60)).toBe(false);
    expect(isSurge(work, p, 115)).toBe(true);
  });
  it('never in protocols without surges', () => {
    const q = getSprintProtocol('alactic-8x8')!;
    expect(isSurge(buildTimeline(q).find(s => s.phase === 'work')!, q, 5)).toBe(false);
  });
});

describe('sessionLoad', () => {
  it('Foster sRPE: RPE × minutes', () => {
    expect(sessionLoad(8, 25)).toBe(200);
    expect(sessionLoad(-1, 10)).toBe(0);
  });
});

describe('recommendFinisher', () => {
  it('very low readiness → nothing; low → Zone 2 flush', () => {
    expect(recommendFinisher({ readiness: 20, heavyLowerSets: 0 })).toBeNull();
    expect(recommendFinisher({ readiness: 40, heavyLowerSets: 0 })!.protocol.id).toBe('zone2-flush-20');
  });
  it('competition in ≤ 3 days → alactic only', () => {
    expect(recommendFinisher({ readiness: 80, heavyLowerSets: 0, daysToCompetition: 2 })!.protocol.system).toBe('alactic');
  });
  it('heavy leg day or hard mats tomorrow → short alactic EMOM', () => {
    expect(recommendFinisher({ readiness: 80, heavyLowerSets: 8 })!.protocol.id).toBe('emom-10x10');
    expect(recommendFinisher({ readiness: 80, heavyLowerSets: 0, hardMatWithin24h: true })!.protocol.id).toBe('emom-10x10');
  });
  it('fresh with time → scramble repeats; short on time → EMOM', () => {
    expect(recommendFinisher({ readiness: 80, heavyLowerSets: 0, minutesAvailable: 30 })!.protocol.id).toBe('scramble-10x15');
    expect(recommendFinisher({ readiness: 80, heavyLowerSets: 0, minutesAvailable: 12 })!.protocol.id).toBe('emom-10x10');
  });
  it('every recommendation is finisher-safe', () => {
    for (const r of [20, 40, 60, 90]) for (const h of [0, 8]) for (const m of [10, 30]) {
      const pick = recommendFinisher({ readiness: r, heavyLowerSets: h, minutesAvailable: m });
      if (pick) expect(pick.protocol.finisherOk).toBe(true);
    }
  });
});
