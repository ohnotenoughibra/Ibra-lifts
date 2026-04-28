import { describe, it, expect } from 'vitest';
import { evaluatePhaseAdvancement, type RehabState } from '@/lib/rehab-engine';
import type { InjuryEntry } from '@/lib/types';

const mkInjury = (overrides: Partial<InjuryEntry> = {}): InjuryEntry => ({
  id: 'i1',
  date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
  bodyRegion: 'left_knee',
  severity: 3,
  painType: 'sharp',
  resolved: false,
  ...overrides,
});

const mkCheckIn = (overrides: Record<string, unknown> = {}) => ({
  id: 'c',
  injuryId: 'i1',
  date: new Date().toISOString(),
  painAtRest: 2,
  painDuringExercise: 3,
  painAfter24h: 2,
  romPercent: 80,
  swellingLevel: 'mild' as const,
  completedSession: true,
  ...overrides,
});

describe('evaluatePhaseAdvancement', () => {
  it('blocks advancement with fewer than 3 check-ins', () => {
    const state: RehabState = { injuryId: 'i1', startedAt: new Date().toISOString(), checkIns: [mkCheckIn(), mkCheckIn()] };
    const result = evaluatePhaseAdvancement(mkInjury(), state);
    expect(result.canAdvance).toBe(false);
    expect(result.unmetCriteria.some(c => /at least 3 check-ins/.test(c))).toBe(true);
  });

  it('phase 2 → 3 advances when pain<=4, 24h<=3, ROM>=75', () => {
    const checkIns = [1, 2, 3].map(() => mkCheckIn({ painDuringExercise: 4, painAfter24h: 3, romPercent: 80 }));
    const state: RehabState = { injuryId: 'i1', startedAt: new Date().toISOString(), phaseOverride: 2, checkIns };
    const result = evaluatePhaseAdvancement(mkInjury(), state);
    expect(result.canAdvance).toBe(true);
    expect(result.proposedPhase).toBe(3);
  });

  it('phase 4 requires ROM>=95 — fails at 94', () => {
    const checkIns = [1, 2, 3].map(() => mkCheckIn({ painDuringExercise: 1, painAfter24h: 0, romPercent: 94 }));
    const state: RehabState = { injuryId: 'i1', startedAt: new Date().toISOString(), phaseOverride: 4, checkIns };
    const result = evaluatePhaseAdvancement(mkInjury(), state);
    expect(result.canAdvance).toBe(false);
    expect(result.unmetCriteria.some(c => /95%/.test(c))).toBe(true);
  });

  it('triggers high-pain warning when any recent check-in shows pain>=6 or 24h>=5', () => {
    const checkIns = [mkCheckIn(), mkCheckIn(), mkCheckIn({ painDuringExercise: 7 })];
    const state: RehabState = { injuryId: 'i1', startedAt: new Date().toISOString(), checkIns };
    const result = evaluatePhaseAdvancement(mkInjury(), state);
    expect(result.warning).toBeDefined();
  });

  it('phase 5 is terminal — never advances', () => {
    const state: RehabState = { injuryId: 'i1', startedAt: new Date().toISOString(), phaseOverride: 5, checkIns: [] };
    const result = evaluatePhaseAdvancement(mkInjury(), state);
    expect(result.canAdvance).toBe(false);
    expect(result.proposedPhase).toBe(5);
  });

  it('phase 1 advances when pain at rest <=3 AND swelling controlled', () => {
    const checkIns = [1, 2, 3].map(() => mkCheckIn({ painAtRest: 2, swellingLevel: 'none' }));
    const state: RehabState = { injuryId: 'i1', startedAt: new Date().toISOString(), phaseOverride: 1, checkIns };
    const result = evaluatePhaseAdvancement(mkInjury(), state);
    expect(result.canAdvance).toBe(true);
    expect(result.proposedPhase).toBe(2);
  });

  it('phase 1 blocks advancement on moderate swelling', () => {
    const checkIns = [1, 2, 3].map(() => mkCheckIn({ painAtRest: 1, swellingLevel: 'moderate' }));
    const state: RehabState = { injuryId: 'i1', startedAt: new Date().toISOString(), phaseOverride: 1, checkIns };
    const result = evaluatePhaseAdvancement(mkInjury(), state);
    expect(result.canAdvance).toBe(false);
    expect(result.unmetCriteria.some(c => /[Ss]welling/.test(c))).toBe(true);
  });

  it('phase 3 requires 3+ completed sessions', () => {
    const checkIns = [
      mkCheckIn({ painDuringExercise: 2, romPercent: 92, completedSession: true }),
      mkCheckIn({ painDuringExercise: 2, romPercent: 92, completedSession: true }),
      mkCheckIn({ painDuringExercise: 2, romPercent: 92, completedSession: false }),
    ];
    const state: RehabState = { injuryId: 'i1', startedAt: new Date().toISOString(), phaseOverride: 3, checkIns };
    const result = evaluatePhaseAdvancement(mkInjury(), state);
    expect(result.canAdvance).toBe(false);
    expect(result.unmetCriteria.some(c => /completed sessions/.test(c))).toBe(true);
  });
});
