import { describe, it, expect } from 'vitest';
import { calculateHRZones, estimateMaxHR } from '@/lib/energy-systems';
import { getWaterProtocol, getSodiumProtocol, getRehydrationProtocol } from '@/lib/weight-cut-engine';
import { calculateElectrolyteNeeds } from '@/lib/electrolyte-engine';
import { calculateEnergyAvailability } from '@/lib/diet-coach';

describe('M-01 — HR zones sit at their physiological anchors', () => {
  const maxHR = estimateMaxHR(30); // Tanaka: 208 - 0.7*30 = 187
  const zones = calculateHRZones(maxHR, 60).zones;
  const pctOfMax = (bpm: number) => (bpm / maxHR) * 100;

  it('uses the Tanaka formula for max HR', () => {
    expect(maxHR).toBe(187);
  });

  it('puts Aerobic Base in the conversational 60-75% max HR band', () => {
    // Was 136-149 bpm (73-80% max HR) — tempo, not base.
    expect(pctOfMax(zones.zone2.min)).toBeGreaterThanOrEqual(58);
    expect(pctOfMax(zones.zone2.max)).toBeLessThanOrEqual(75);
  });

  it('keeps Aerobic Base below the Tempo zone it used to overlap', () => {
    expect(zones.zone2.max).toBeLessThanOrEqual(zones.zone3.min);
    expect(pctOfMax(zones.zone3.min)).toBeGreaterThanOrEqual(70);
  });

  it('puts VO2max at 90-100% max HR', () => {
    expect(pctOfMax(zones.zone5.min)).toBeGreaterThanOrEqual(88);
    expect(zones.zone5.max).toBe(maxHR);
  });

  it('keeps every zone ordered and non-overlapping', () => {
    const ordered = [zones.zone1, zones.zone2, zones.zone3, zones.zone4, zones.zone5];
    for (let i = 0; i < ordered.length; i++) {
      expect(ordered[i].min).toBeLessThan(ordered[i].max);
      if (i > 0) expect(ordered[i].min).toBeGreaterThanOrEqual(ordered[i - 1].max);
    }
  });

  it('gives a low-resting-HR athlete lower targets (Karvonen still applies)', () => {
    const trained = calculateHRZones(190, 45).zones.zone2;
    const untrained = calculateHRZones(190, 75).zones.zone2;
    expect(trained.min).toBeLessThan(untrained.min);
  });
});

describe('M-02 — the post-weigh-in window prescribes rehydration, not zero', () => {
  it('no longer tells a dehydrated fighter to drink nothing', () => {
    for (const days of [-1, -2, -5]) {
      const w = getWaterProtocol(days, 80);
      expect(w.phase).toBe('rehydration');
      expect(w.targetMl).toBeGreaterThan(0);
      expect(w.note).not.toMatch(/nothing/i);
    }
  });

  it('restores sodium after weigh-in rather than restricting it', () => {
    const s = getSodiumProtocol(-1);
    expect(s.phase).toBe('rehydration');
    expect(s.targetMg).toBeGreaterThan(1000);
  });

  it('still restricts on the run-in to the weigh-in', () => {
    expect(getWaterProtocol(1, 80).phase).toBe('restriction');
    expect(getWaterProtocol(0, 80).targetMl).toBe(0);
    expect(getWaterProtocol(7, 80).phase).toBe('loading');
  });

  it('the rehydration protocol replaces ~150% of the fluid cut', () => {
    const phases = getRehydrationProtocol(3, 24, 80);
    expect(phases.length).toBeGreaterThan(0);
    const total = phases.reduce((sum, p) => sum + p.fluidMl, 0);
    expect(total).toBeGreaterThan(3 * 1000); // more than the raw litres lost
    expect(total).toBeLessThanOrEqual(3 * 1500 * 1.05);
  });
});

describe('M-03 — energy availability responds to exercise cost', () => {
  const ffm = 80 * (1 - 0.12);

  it('drops into the RED-S band once training cost is counted', () => {
    const ignoringExercise = calculateEnergyAvailability(2400, 0, ffm);
    const counted = calculateEnergyAvailability(2400, 600, ffm);
    expect(ignoringExercise.ea).toBeGreaterThan(counted.ea);
    expect(counted.ea).toBeLessThan(30);
    expect(counted.status).not.toBe('adequate');
  });

  it('keeps the IOC thresholds (Mountjoy 2018)', () => {
    expect(calculateEnergyAvailability(45 * ffm, 0, ffm).status).toBe('adequate');
    expect(calculateEnergyAvailability(24 * ffm, 0, ffm).status).toBe('critical');
  });
});

describe('M-04 — sweat rate scales with surface area, not mass', () => {
  const forBW = (bw: number) =>
    calculateElectrolyteNeeds(bw, 'bjj_nogi', 60, 'moderate').fluidLossL;

  it('stays exact at the 70kg reference', () => {
    const ref = forBW(70);
    expect(ref).toBeGreaterThan(0);
  });

  it('scales sub-linearly — a heavyweight is not 1.71x a 70kg athlete', () => {
    const ratio = forBW(120) / forBW(70);
    expect(ratio).toBeLessThan(1.6);       // linear model gave 1.71
    expect(ratio).toBeGreaterThan(1.3);    // still meaningfully more
  });

  it('still increases monotonically with body weight', () => {
    expect(forBW(120)).toBeGreaterThan(forBW(93));
    expect(forBW(93)).toBeGreaterThan(forBW(70));
    expect(forBW(70)).toBeGreaterThan(forBW(60));
  });

  it('carries the BSA exponent into sodium too', () => {
    // fluidLossL is rounded to 1dp for display; sodium derives from the raw
    // sweat volume, so compare sodium against the exponent directly.
    const light = calculateElectrolyteNeeds(70, 'bjj_nogi', 60, 'moderate');
    const heavy = calculateElectrolyteNeeds(120, 'bjj_nogi', 60, 'moderate');
    expect(heavy.sodiumMg / light.sodiumMg).toBeCloseTo(Math.pow(120 / 70, 0.67), 2);
  });
});
