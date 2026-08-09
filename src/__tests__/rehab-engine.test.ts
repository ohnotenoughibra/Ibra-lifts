import { describe, it, expect } from 'vitest';
import { evaluatePhaseAdvancement, createInitialRehabState, type RehabState } from '@/lib/rehab-engine';
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

// ── Audit findings R-01 / R-02 ────────────────────────────────────────────────

describe('R-02 — gates are not vacuously "met" with no data', () => {
  it('reports nothing as met when zero check-ins have been logged', () => {
    const state = createInitialRehabState('i1');
    const r = evaluatePhaseAdvancement(mkInjury(), state);
    // `recent.every(...)` is true on an empty array — these used to render
    // under a green "Gates Met" heading for an athlete measured on nothing.
    expect(r.metCriteria).toEqual([]);
    expect(r.canAdvance).toBe(false);
    expect(r.unmetCriteria.some(c => /check-ins/i.test(c))).toBe(true);
  });

  it('still lists gates as met once there is real data behind them', () => {
    const state = createInitialRehabState('i1');
    state.checkIns = [1, 2, 3].map(() => mkCheckIn({
      painAtRest: 0, painDuringExercise: 0, painAfter24h: 0,
      romPercent: 100, swellingLevel: 'none', completedSession: true,
    })) as never;
    const r = evaluatePhaseAdvancement(mkInjury(), state);
    expect(r.metCriteria.length).toBeGreaterThan(0);
  });
});

describe('R-01 — a flare-up can actually move the phase down', () => {
  const flaring = () => [1, 2, 3].map(() => mkCheckIn({
    painAtRest: 6, painDuringExercise: 8, painAfter24h: 7,
    romPercent: 40, swellingLevel: 'moderate', completedSession: true,
  })) as never;

  it('proposes stepping back from an advanced phase', () => {
    const state = createInitialRehabState('i1');
    state.phaseOverride = 4;
    state.checkIns = flaring();
    const r = evaluatePhaseAdvancement(mkInjury(), state);
    expect(r.suggestedStepBackPhase).toBe(3);
    expect(r.canAdvance).toBe(false);
    expect(r.warning).toMatch(/step back/i);
  });

  it('never proposes stepping below phase 1', () => {
    const state = createInitialRehabState('i1');
    state.phaseOverride = 1;
    state.checkIns = flaring();
    const r = evaluatePhaseAdvancement(mkInjury(), state);
    expect(r.suggestedStepBackPhase).toBeUndefined();
  });

  it('does not regress on a single bad day among good ones', () => {
    const state = createInitialRehabState('i1');
    state.phaseOverride = 3;
    state.checkIns = [
      mkCheckIn({ painAtRest: 0, painDuringExercise: 1, painAfter24h: 0, romPercent: 95, swellingLevel: 'none' }),
      mkCheckIn({ painAtRest: 6, painDuringExercise: 8, painAfter24h: 7, romPercent: 60, swellingLevel: 'mild' }),
      mkCheckIn({ painAtRest: 0, painDuringExercise: 2, painAfter24h: 1, romPercent: 95, swellingLevel: 'none' }),
    ] as never;
    const r = evaluatePhaseAdvancement(mkInjury(), state);
    // One rough session out of three is not a flare-up. Demoting people for
    // honest bad days teaches them to stop logging honest bad days.
    expect(r.suggestedStepBackPhase).toBeUndefined();
    expect(r.warning).toBeTruthy(); // still flagged, just not actioned
  });

  it('does not propose a step back without enough data', () => {
    const state = createInitialRehabState('i1');
    state.phaseOverride = 4;
    state.checkIns = [mkCheckIn({ painDuringExercise: 9, painAfter24h: 8 })] as never;
    const r = evaluatePhaseAdvancement(mkInjury(), state);
    expect(r.suggestedStepBackPhase).toBeUndefined();
  });
});
