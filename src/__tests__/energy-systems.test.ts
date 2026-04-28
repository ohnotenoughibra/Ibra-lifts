import { describe, it, expect } from 'vitest';
import {
  estimateMaxHR,
  calculateHRZones,
  generateEnergySystemsBlock,
  ENERGY_SYSTEM_PROTOCOLS,
} from '@/lib/energy-systems';

describe('estimateMaxHR (Tanaka)', () => {
  it('30yo: 208 - 0.7*30 = 187', () => {
    expect(estimateMaxHR(30)).toBe(187);
  });

  it('45yo: 208 - 0.7*45 = 177 (rounded from 176.5)', () => {
    expect(estimateMaxHR(45)).toBe(177);
  });

  it('20yo: 194', () => {
    expect(estimateMaxHR(20)).toBe(194);
  });
});

describe('calculateHRZones', () => {
  it('Karvonen zone2 = restingHR + reserve*0.6 to 0.7', () => {
    const z = calculateHRZones(190, 60);
    // reserve = 130; zone2.min = 60 + 0.6*130 = 138; zone2.max = 60 + 0.7*130 = 151
    expect(z.zones.zone2.min).toBe(138);
    expect(z.zones.zone2.max).toBe(151);
  });

  it('zone5 caps at maxHR', () => {
    const z = calculateHRZones(190, 60);
    expect(z.zones.zone5.max).toBe(190);
  });

  it('zones are monotonically increasing', () => {
    const z = calculateHRZones(190, 60);
    expect(z.zones.zone1.max).toBeLessThanOrEqual(z.zones.zone2.min);
    expect(z.zones.zone2.max).toBeLessThanOrEqual(z.zones.zone3.min);
    expect(z.zones.zone3.max).toBeLessThanOrEqual(z.zones.zone4.min);
    expect(z.zones.zone4.max).toBeLessThanOrEqual(z.zones.zone5.min);
  });

  it('uses default restingHR=60 when omitted', () => {
    const a = calculateHRZones(190);
    const b = calculateHRZones(190, 60);
    expect(a.zones.zone2.min).toBe(b.zones.zone2.min);
  });
});

describe('generateEnergySystemsBlock', () => {
  it('weeks=2: only base phase (zone2_base)', () => {
    const block = generateEnergySystemsBlock(2);
    expect(block.weeklySchedule.every(s => s.protocolId === 'zone2_base')).toBe(true);
  });

  it('weeks=4: includes tempo and aerobic_intervals', () => {
    const block = generateEnergySystemsBlock(4);
    expect(block.weeklySchedule.some(s => s.protocolId === 'tempo')).toBe(true);
    expect(block.weeklySchedule.some(s => s.protocolId === 'aerobic_intervals')).toBe(true);
  });

  it('weeks=6: includes threshold_4x4 and rsa', () => {
    const block = generateEnergySystemsBlock(6);
    expect(block.weeklySchedule.some(s => s.protocolId === 'threshold_4x4')).toBe(true);
    expect(block.weeklySchedule.some(s => s.protocolId === 'rsa')).toBe(true);
  });

  it('produces a name and timestamp', () => {
    const block = generateEnergySystemsBlock(6);
    expect(block.name).toContain('6-Week');
    expect(block.startedAt).toBeTruthy();
  });
});

describe('ENERGY_SYSTEM_PROTOCOLS catalog', () => {
  it('exposes all 5 expected protocol ids', () => {
    const ids = ENERGY_SYSTEM_PROTOCOLS.map(p => p.id);
    expect(ids).toContain('zone2_base');
    expect(ids).toContain('threshold_4x4');
    expect(ids).toContain('rsa');
    expect(ids).toContain('tempo');
    expect(ids).toContain('aerobic_intervals');
  });

  it('rsa is anaerobic_lactic energy system', () => {
    expect(ENERGY_SYSTEM_PROTOCOLS.find(p => p.id === 'rsa')?.energySystem).toBe('anaerobic_lactic');
  });

  it('zone2_base is aerobic with conversational pace target zone 2', () => {
    const z2 = ENERGY_SYSTEM_PROTOCOLS.find(p => p.id === 'zone2_base');
    expect(z2?.energySystem).toBe('aerobic');
    expect(z2?.intervals[0].targetHRZone).toBe(2);
  });
});
