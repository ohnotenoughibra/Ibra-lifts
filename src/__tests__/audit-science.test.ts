/**
 * Full-app audit 2026-09-25 — science & safety corrections.
 */
import { describe, it, expect } from 'vitest';
import { assessWeightCutSafety, rehydrationHoursFor, waterCutCapForHours, getWaterProtocol } from '@/lib/weight-cut-engine';
import { estimateSessionCalories } from '@/lib/diet-coach';
import { classifyInjury } from '@/lib/injury-science';
import { workingWeightFrom1RM } from '@/lib/weight-estimator';
import { generateCoachingTips } from '@/lib/sport-nutrition-engine';

describe('weight cut: water-cut ceiling follows recovery time', () => {
  it('weigh-in right before competing → no water cut', () => {
    expect(waterCutCapForHours(rehydrationHoursFor('2hr_before'))).toBe(0);
    const a = assessWeightCutSafety({ currentWeightKg: 80, targetWeightKg: 77, daysToWeighIn: 21, rehydrationTimeHours: 2, age: 30, sex: 'male', cutExperience: 'experienced' as any });
    expect(a.maxWaterCutPercent).toBe(0);
    expect(getWaterProtocol(2, 80, 0).phase).toBe('normal');
  });
  it('day-before weigh-in allows at most 5 %', () => {
    expect(waterCutCapForHours(rehydrationHoursFor('day_before'))).toBe(5);
  });
  it('no "hot bath" tip from the generic coach', () => {
    const tips = generateCoachingTips({ daysToCompetition: 1, dietGoal: 'cut', hour: 9, proteinTarget: 180, proteinSoFar: 0, bodyWeightKg: 80, todayType: 'rest' } as any);
    expect(tips.some(t => /hot bath tonight|passive water loss/i.test(t.text))).toBe(false);
  });
});

describe('calorie burn uses net METs', () => {
  it('90 min hard no-gi for 80 kg is well under the old ~1,400 kcal', () => {
    const kcal = estimateSessionCalories('bjj_nogi', 90, 80, 'hard_sparring');
    expect(kcal).toBeLessThan(1100);
    expect(kcal).toBeGreaterThan(700);
  });
});

describe('serious injuries are never auto-cleared by the calendar', () => {
  it('severe injury long ago → see a clinician, not return_to_sport', () => {
    const c = classifyInjury({ id: 'i', date: new Date(Date.now() - 400 * 864e5), bodyRegion: 'left_knee', severity: 5, painType: 'sharp', resolved: false } as any);
    expect(c.seeClinician).toBe(true);
    expect(c.currentPhase).not.toBe('return_to_sport');
    expect(c.loadingGuidelines[0]).toMatch(/physio|doctor/i);
  });
  it('mild muscle strain progresses normally', () => {
    const c = classifyInjury({ id: 'i', date: new Date(Date.now() - 60 * 864e5), bodyRegion: 'lower_back', severity: 1, painType: 'dull', resolved: false } as any);
    expect(c.seeClinician).toBe(false);
  });
});

describe('high-rep working weights', () => {
  it('a 20-rep target is ~55-60 % of 1RM, not a 12-rep load', () => {
    const w = workingWeightFrom1RM(100, 20);
    expect(w).toBeGreaterThan(54);
    expect(w).toBeLessThan(60);
  });
});
