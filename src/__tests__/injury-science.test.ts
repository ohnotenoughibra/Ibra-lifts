import { describe, it, expect } from 'vitest';
import {
  classifyInjury,
  getActiveInjuryAdaptations,
  applyInjuryAdaptationsToExercises,
  getInjuryTimeline,
} from '@/lib/injury-science';
import type { InjuryEntry, BodyRegion, PainType, PainSeverity } from '@/lib/types';

// ── Helper factories ──────────────────────────────────────────────────────

function makeInjury(overrides: Partial<InjuryEntry> = {}): InjuryEntry {
  return {
    id: 'inj-1',
    bodyRegion: 'left_knee' as BodyRegion,
    painType: 'sharp' as PainType,
    severity: 2 as PainSeverity,
    date: new Date(Date.now() - 3 * 86400000), // 3 days ago
    description: 'Felt a tweak during squats',
    resolved: false,
    ...overrides,
  } as InjuryEntry;
}

// ── classifyInjury ────────────────────────────────────────────────────────

describe('classifyInjury', () => {
  it('should classify knee injury as ligament tissue', () => {
    const injury = makeInjury({ bodyRegion: 'left_knee', painType: 'sharp' });
    const result = classifyInjury(injury);
    // Knee primary tissue is ligament; sharp override only applies for burning/numbness
    expect(result.tissueType).toBe('ligament');
  });

  it('should classify shoulder injury as joint tissue', () => {
    const injury = makeInjury({ bodyRegion: 'left_shoulder', painType: 'stiffness' });
    const result = classifyInjury(injury);
    expect(result.tissueType).toBe('joint');
  });

  it('should override to nerve for burning pain', () => {
    const injury = makeInjury({ bodyRegion: 'lower_back', painType: 'burning' });
    const result = classifyInjury(injury);
    expect(result.tissueType).toBe('nerve');
  });

  it('should override to nerve for numbness', () => {
    const injury = makeInjury({ bodyRegion: 'left_elbow', painType: 'numbness' });
    const result = classifyInjury(injury);
    expect(result.tissueType).toBe('nerve');
  });

  it('should override to tendon for clicking pain', () => {
    const injury = makeInjury({ bodyRegion: 'right_knee', painType: 'clicking' });
    const result = classifyInjury(injury);
    expect(result.tissueType).toBe('tendon');
  });

  it('should classify mild severity (1-2) correctly', () => {
    const injury = makeInjury({ severity: 1 as PainSeverity });
    const result = classifyInjury(injury);
    expect(result.estimatedHealDays.min).toBeLessThan(result.estimatedHealDays.max);
  });

  it('should classify moderate severity (3) correctly', () => {
    const injury = makeInjury({ severity: 3 as PainSeverity });
    const result = classifyInjury(injury);
    // Moderate should have longer heal time than mild
    expect(result.estimatedHealDays.max).toBeGreaterThan(14);
  });

  it('should classify severe severity (4-5) correctly', () => {
    const injury = makeInjury({ severity: 5 as PainSeverity });
    const result = classifyInjury(injury);
    expect(result.estimatedHealDays.max).toBeGreaterThan(42);
  });

  it('should determine acute phase for very recent injury', () => {
    const injury = makeInjury({
      date: new Date(), // today
      severity: 3 as PainSeverity,
    });
    const result = classifyInjury(injury);
    expect(result.currentPhase).toBe('acute');
  });

  it('should determine later phases for older injuries', () => {
    // Mild muscle: heal max = 14 days, 85% = ~12 days
    const injury = makeInjury({
      bodyRegion: 'chest',
      painType: 'dull',
      severity: 1 as PainSeverity,
      date: new Date(Date.now() - 15 * 86400000), // 15 days ago
    });
    const result = classifyInjury(injury);
    expect(result.currentPhase).toBe('return_to_sport');
  });

  it('should provide loading guidelines', () => {
    const injury = makeInjury();
    const result = classifyInjury(injury);
    expect(result.loadingGuidelines.length).toBeGreaterThan(0);
  });

  it('should provide exercise avoidance list for knee injuries', () => {
    const injury = makeInjury({ bodyRegion: 'left_knee' });
    const result = classifyInjury(injury);
    expect(result.avoidExerciseIds.length).toBeGreaterThan(0);
    expect(result.avoidExerciseIds).toContain('leg-extension');
    expect(result.avoidExerciseIds).toContain('back-squat');
  });

  it('should provide exercise avoidance list for shoulder injuries', () => {
    const injury = makeInjury({ bodyRegion: 'left_shoulder' });
    const result = classifyInjury(injury);
    expect(result.avoidExerciseIds).toContain('overhead-press');
  });

  it('should provide modified exercises', () => {
    const injury = makeInjury({ bodyRegion: 'lower_back' });
    const result = classifyInjury(injury);
    expect(result.modifiedExercises.length).toBeGreaterThan(0);
    expect(result.modifiedExercises[0]).toHaveProperty('exerciseId');
    expect(result.modifiedExercises[0]).toHaveProperty('modification');
  });

  it('should generate return-to-training protocol', () => {
    const injury = makeInjury();
    const result = classifyInjury(injury);
    expect(result.returnProtocol.length).toBeGreaterThan(0);
    // Protocol should have multiple phases
    expect(result.returnProtocol.length).toBeGreaterThanOrEqual(3);
    // Each phase should have criteria and allowed activities
    for (const phase of result.returnProtocol) {
      expect(phase.criteria.length).toBeGreaterThan(0);
      expect(phase.allowedActivities.length).toBeGreaterThan(0);
      expect(phase.volumeLimit).toBeGreaterThanOrEqual(0);
      expect(phase.volumeLimit).toBeLessThanOrEqual(100);
      expect(phase.intensityLimit).toBeGreaterThanOrEqual(0);
      expect(phase.intensityLimit).toBeLessThanOrEqual(100);
    }
  });

  it('should cover all body regions without error', () => {
    const regions: BodyRegion[] = [
      'neck', 'left_shoulder', 'right_shoulder', 'chest', 'upper_back',
      'lower_back', 'core', 'left_elbow', 'right_elbow', 'left_wrist',
      'right_wrist', 'left_hip', 'right_hip', 'left_knee', 'right_knee',
      'left_ankle', 'right_ankle',
    ];
    for (const region of regions) {
      const injury = makeInjury({ bodyRegion: region });
      const result = classifyInjury(injury);
      expect(result).toBeDefined();
      expect(result.tissueType).toBeTruthy();
    }
  });
});

// ── getActiveInjuryAdaptations ────────────────────────────────────────────

describe('getActiveInjuryAdaptations', () => {
  it('should return empty adaptations for no injuries', () => {
    const result = getActiveInjuryAdaptations([]);
    expect(result.classifications).toHaveLength(0);
    expect(result.allAvoidExercises).toHaveLength(0);
    expect(result.allModifiedExercises).toHaveLength(0);
  });

  it('should filter out resolved injuries', () => {
    const injuries = [
      makeInjury({ id: 'i1', resolved: true }),
      makeInjury({ id: 'i2', resolved: false }),
    ];
    const result = getActiveInjuryAdaptations(injuries);
    expect(result.classifications).toHaveLength(1);
  });

  it('should filter out soft-deleted injuries (so a removed injury stops flagging exercises)', () => {
    // Regression: a deleted injury (resolved still false) was leaking into the
    // flag engine because the active filter only checked !resolved, producing
    // "healed but still N exercises flagged".
    const injuries = [
      makeInjury({ id: 'i1', resolved: false, _deleted: true }),
      makeInjury({ id: 'i2', resolved: false, _deleted: true }),
    ];
    const result = getActiveInjuryAdaptations(injuries);
    expect(result.classifications).toHaveLength(0);
    expect(result.allAvoidExercises).toHaveLength(0);
  });

  it('treats only not-resolved AND not-deleted injuries as active', () => {
    const injuries = [
      makeInjury({ id: 'i1', resolved: true }),               // healed
      makeInjury({ id: 'i2', resolved: false, _deleted: true }), // deleted
      makeInjury({ id: 'i3', resolved: false }),              // genuinely active
    ];
    const result = getActiveInjuryAdaptations(injuries);
    expect(result.classifications).toHaveLength(1);
    expect(result.classifications[0].id).toBe('i3');
  });

  it('should combine avoidance lists from multiple injuries', () => {
    const injuries = [
      makeInjury({ id: 'i1', bodyRegion: 'left_knee', resolved: false }),
      makeInjury({ id: 'i2', bodyRegion: 'left_shoulder', resolved: false }),
    ];
    const result = getActiveInjuryAdaptations(injuries);
    // Knee avoids: leg-extension, back-squat, etc.
    // Shoulder avoids: overhead-press, bench-press, etc.
    expect(result.allAvoidExercises).toContain('leg-extension');
    expect(result.allAvoidExercises).toContain('overhead-press');
  });

  it('should deduplicate avoid exercises', () => {
    const injuries = [
      makeInjury({ id: 'i1', bodyRegion: 'left_knee', resolved: false }),
      makeInjury({ id: 'i2', bodyRegion: 'right_knee', resolved: false }),
    ];
    const result = getActiveInjuryAdaptations(injuries);
    const unique = new Set(result.allAvoidExercises);
    expect(result.allAvoidExercises.length).toBe(unique.size);
  });

  it('should determine worst phase from multiple injuries', () => {
    const injuries = [
      makeInjury({
        id: 'i1',
        bodyRegion: 'left_knee',
        resolved: false,
        date: new Date(), // acute
        severity: 4 as PainSeverity,
      }),
      makeInjury({
        id: 'i2',
        bodyRegion: 'chest',
        resolved: false,
        date: new Date(Date.now() - 20 * 86400000), // likely remodeling
        severity: 1 as PainSeverity,
      }),
    ];
    const result = getActiveInjuryAdaptations(injuries);
    expect(result.worstPhase).toBe('acute');
  });

  it('should set volume and intensity limits from worst protocol', () => {
    const injuries = [
      makeInjury({
        bodyRegion: 'left_knee',
        resolved: false,
        date: new Date(),
        severity: 4 as PainSeverity,
      }),
    ];
    const result = getActiveInjuryAdaptations(injuries);
    // In acute phase, limits should be restrictive
    expect(result.overallVolumeLimit).toBeLessThanOrEqual(100);
    expect(result.overallIntensityLimit).toBeLessThanOrEqual(100);
  });
});

// ── getInjuryTimeline ─────────────────────────────────────────────────────

describe('getInjuryTimeline', () => {
  it('should calculate days since injury', () => {
    const injury = makeInjury({
      date: new Date(Date.now() - 10 * 86400000),
    });
    const timeline = getInjuryTimeline(injury);
    expect(timeline.daysSinceInjury).toBeCloseTo(10, 0);
  });

  it('should estimate remaining days', () => {
    const injury = makeInjury({
      date: new Date(Date.now() - 5 * 86400000),
      severity: 2 as PainSeverity,
    });
    const timeline = getInjuryTimeline(injury);
    expect(timeline.estimatedDaysRemaining.min).toBeGreaterThanOrEqual(0);
    expect(timeline.estimatedDaysRemaining.max).toBeGreaterThanOrEqual(
      timeline.estimatedDaysRemaining.min
    );
  });

  it('should calculate percent healed', () => {
    const injury = makeInjury({
      date: new Date(Date.now() - 5 * 86400000),
    });
    const timeline = getInjuryTimeline(injury);
    expect(timeline.percentHealed).toBeGreaterThanOrEqual(0);
    expect(timeline.percentHealed).toBeLessThanOrEqual(100);
  });

  it('should cap percent healed at 100', () => {
    // Very old mild muscle injury — should be fully healed
    const injury = makeInjury({
      bodyRegion: 'chest',
      painType: 'dull',
      severity: 1 as PainSeverity,
      date: new Date(Date.now() - 60 * 86400000), // 60 days ago, max heal = 14
    });
    const timeline = getInjuryTimeline(injury);
    expect(timeline.percentHealed).toBe(100);
  });

  it('should return remaining days as 0 when past heal time', () => {
    const injury = makeInjury({
      bodyRegion: 'chest',
      painType: 'dull',
      severity: 1 as PainSeverity,
      date: new Date(Date.now() - 30 * 86400000),
    });
    const timeline = getInjuryTimeline(injury);
    expect(timeline.estimatedDaysRemaining.min).toBe(0);
    expect(timeline.estimatedDaysRemaining.max).toBe(0);
  });

  it('should return tissue and phase labels as strings', () => {
    const injury = makeInjury();
    const timeline = getInjuryTimeline(injury);
    expect(typeof timeline.tissueLabel).toBe('string');
    expect(typeof timeline.phaseLabel).toBe('string');
    expect(timeline.tissueLabel.length).toBeGreaterThan(0);
    expect(timeline.phaseLabel.length).toBeGreaterThan(0);
  });

  it('should handle all tissue types in labels', () => {
    const configs: { region: BodyRegion; pain: PainType; expected: string }[] = [
      { region: 'chest', pain: 'dull', expected: 'Muscle strain' },
      { region: 'left_elbow', pain: 'dull', expected: 'Tendon injury' },
      { region: 'left_knee', pain: 'dull', expected: 'Ligament sprain' },
      { region: 'left_shoulder', pain: 'stiffness', expected: 'Joint issue' },
      { region: 'lower_back', pain: 'burning', expected: 'Nerve compression' },
    ];
    for (const cfg of configs) {
      const injury = makeInjury({ bodyRegion: cfg.region, painType: cfg.pain });
      const timeline = getInjuryTimeline(injury);
      expect(timeline.tissueLabel).toBe(cfg.expected);
    }
  });
});

// ── applyInjuryAdaptationsToExercises ────────────────────────────────────────

describe('applyInjuryAdaptationsToExercises', () => {
  const mkEx = (id: string) => ({
    exerciseId: id,
    sets: 4,
    prescription: { rpe: 8, percentageOf1RM: 85 },
  });
  const kneeInjury = [{
    id: 'i1', date: new Date(), bodyRegion: 'left_knee',
    severity: 4, painType: 'sharp', resolved: false,
  }] as unknown as Parameters<typeof getActiveInjuryAdaptations>[0];

  it('caps RPE instead of scaling it', () => {
    const ad = getActiveInjuryAdaptations(kneeInjury);
    const [squat] = applyInjuryAdaptationsToExercises([mkEx('back-squat')], ad);
    // Previously this multiplied RPE by the %1RM intensity limit and produced
    // RPE 1.6 — a category error on a 0-10 effort scale.
    expect(squat.prescription.rpe).toBeLessThanOrEqual(6);
    expect(squat.prescription.rpe).toBeGreaterThanOrEqual(4);
  });

  it('throttles intensity on percentageOf1RM, where it belongs', () => {
    const ad = getActiveInjuryAdaptations(kneeInjury);
    const [squat] = applyInjuryAdaptationsToExercises([mkEx('back-squat')], ad);
    expect(squat.prescription.percentageOf1RM!).toBeLessThan(85);
    expect(squat.prescription.percentageOf1RM!).toBeGreaterThan(0);
    expect(squat.sets).toBeLessThan(4);
  });

  it('is idempotent — re-running never compounds the reduction', () => {
    const ad = getActiveInjuryAdaptations(kneeInjury);
    let list = applyInjuryAdaptationsToExercises([mkEx('back-squat')], ad);
    const once = { ...list[0].prescription, sets: list[0].sets };
    for (let i = 0; i < 4; i++) list = applyInjuryAdaptationsToExercises(list, ad);
    expect(list[0].prescription.percentageOf1RM).toBe(once.percentageOf1RM);
    expect(list[0].prescription.rpe).toBe(once.rpe);
    expect(list[0].sets).toBe(once.sets);
  });

  it('leaves an uninjured exercise untouched', () => {
    const ad = getActiveInjuryAdaptations(kneeInjury);
    const [bench] = applyInjuryAdaptationsToExercises([mkEx('bench-press')], ad);
    expect(bench.sets).toBe(4);
    expect(bench.prescription.rpe).toBe(8);
    expect(bench.prescription.percentageOf1RM).toBe(85);
    expect(bench.notes).toBeUndefined();
  });

  it('fully restores a throttled exercise once the injury resolves', () => {
    const ad = getActiveInjuryAdaptations(kneeInjury);
    const throttled = applyInjuryAdaptationsToExercises([mkEx('back-squat')], ad);
    expect(throttled[0].notes).toBeTruthy();

    const cleared = applyInjuryAdaptationsToExercises(throttled, getActiveInjuryAdaptations([]));
    expect(cleared[0].sets).toBe(4);
    expect(cleared[0].prescription.rpe).toBe(8);
    expect(cleared[0].prescription.percentageOf1RM).toBe(85);
    expect(cleared[0].notes).toBeUndefined();
  });

  it('does not stack the caution note across runs', () => {
    const ad = getActiveInjuryAdaptations(kneeInjury);
    let list = applyInjuryAdaptationsToExercises([mkEx('back-squat')], ad);
    for (let i = 0; i < 3; i++) list = applyInjuryAdaptationsToExercises(list, ad);
    const occurrences = (list[0].notes ?? '').split('Caution: active injury').length - 1;
    expect(occurrences).toBe(1);
  });

  it('preserves an unrelated note while adding and removing its own', () => {
    const ad = getActiveInjuryAdaptations(kneeInjury);
    const withNote = [{ ...mkEx('back-squat'), notes: 'Use safety bars' }];
    const throttled = applyInjuryAdaptationsToExercises(withNote, ad);
    expect(throttled[0].notes).toContain('Use safety bars');
    const cleared = applyInjuryAdaptationsToExercises(throttled, getActiveInjuryAdaptations([]));
    expect(cleared[0].notes).toBe('Use safety bars');
  });
});
