import { describe, it, expect } from 'vitest';
import {
  performNeckCheck,
  autoDetectSeverity,
  getIllnessDurationDays,
  getReturnPhase,
  getIllnessTrainingRecommendation,
  shouldMarkRecovering,
  shouldMarkResolved,
  getMesocycleImpact,
  getStreakProtection,
  getSymptomLabel,
  getSymptomLocation,
  getSymptomsByLocation,
} from '@/lib/illness-engine';
import type { IllnessLog, IllnessDailyCheckin } from '@/lib/types';

// ── performNeckCheck (The Neck Check Algorithm) ─────────────────────────────

describe('performNeckCheck', () => {
  it('allows light training for mild above-neck-only symptoms', () => {
    const result = performNeckCheck(['runny_nose', 'sneezing'], 'mild');
    expect(result.canTrain).toBe(true);
    expect(result.maxIntensity).toBe('light');
    expect(result.classification).toBe('above_neck_mild');
  });

  it('blocks training for moderate above-neck symptoms', () => {
    const result = performNeckCheck(['runny_nose', 'sore_throat'], 'moderate');
    expect(result.canTrain).toBe(false);
    expect(result.classification).toBe('above_neck_moderate');
  });

  it('blocks training with fever (myocarditis risk)', () => {
    const result = performNeckCheck(['fever', 'runny_nose'], 'mild');
    expect(result.canTrain).toBe(false);
    expect(result.maxIntensity).toBe('none');
    expect(result.classification).toBe('systemic');
    expect(result.message).toContain('myocarditis');
  });

  it('blocks training with below-neck symptoms (cough, chest)', () => {
    const result = performNeckCheck(['cough', 'chest_congestion'], 'moderate');
    expect(result.canTrain).toBe(false);
    expect(result.classification).toBe('below_neck');
  });

  it('blocks training with GI symptoms (dehydration risk)', () => {
    const result = performNeckCheck(['nausea', 'diarrhea'], 'moderate');
    expect(result.canTrain).toBe(false);
    expect(result.classification).toBe('gi_symptoms');
    expect(result.message).toContain('dehydration');
  });

  it('blocks training with systemic symptoms (body aches, chills)', () => {
    const result = performNeckCheck(['body_aches', 'chills', 'fatigue'], 'moderate');
    expect(result.canTrain).toBe(false);
    expect(result.classification).toBe('systemic');
  });

  it('prioritizes fever over other symptoms', () => {
    const result = performNeckCheck(['runny_nose', 'fever', 'sneezing'], 'mild');
    expect(result.canTrain).toBe(false);
    expect(result.classification).toBe('systemic');
  });

  it('returns safe fallback for empty symptoms', () => {
    const result = performNeckCheck([], 'mild');
    expect(result.canTrain).toBe(true);
  });
});

// ── autoDetectSeverity ──────────────────────────────────────────────────────

describe('autoDetectSeverity', () => {
  it('returns severe for fever', () => {
    expect(autoDetectSeverity(['runny_nose'], true)).toBe('severe');
  });

  it('returns severe for 3+ systemic symptoms', () => {
    expect(autoDetectSeverity(['fatigue', 'body_aches', 'chills'], false)).toBe('severe');
  });

  it('returns moderate for any systemic symptom', () => {
    expect(autoDetectSeverity(['fatigue'], false)).toBe('moderate');
  });

  it('returns moderate for below-neck symptoms', () => {
    expect(autoDetectSeverity(['cough'], false)).toBe('moderate');
  });

  it('returns moderate for 3+ above-neck symptoms', () => {
    expect(autoDetectSeverity(['runny_nose', 'sore_throat', 'headache'], false)).toBe('moderate');
  });

  it('returns mild for 1-2 above-neck symptoms', () => {
    expect(autoDetectSeverity(['runny_nose'], false)).toBe('mild');
    expect(autoDetectSeverity(['runny_nose', 'sneezing'], false)).toBe('mild');
  });
});

// ── getReturnPhase (Return-to-Training Protocol) ────────────────────────────

describe('getReturnPhase', () => {
  it('short illness (<=3d): test day at day 1, full return after', () => {
    const test = getReturnPhase(2, 1);
    expect(test.phase).toBe('test_day');
    expect(test.volumePercent).toBe(50);
    expect(test.rpeCap).toBe(6);

    const full = getReturnPhase(2, 3);
    expect(full.phase).toBe('full_return');
    expect(full.volumePercent).toBe(100);
  });

  it('medium illness (4-7d): test → building → full', () => {
    const test = getReturnPhase(5, 1);
    expect(test.phase).toBe('test_day');

    const building = getReturnPhase(5, 3);
    expect(building.phase).toBe('building_back');
    expect(building.volumePercent).toBe(75);

    const full = getReturnPhase(5, 6);
    expect(full.phase).toBe('full_return');
  });

  it('long illness (>7d): extended graduated return', () => {
    const test = getReturnPhase(10, 2);
    expect(test.phase).toBe('test_day');
    expect(test.volumePercent).toBe(40);
    expect(test.rpeCap).toBe(5);

    const build1 = getReturnPhase(10, 5);
    expect(build1.phase).toBe('building_back');

    const build2 = getReturnPhase(10, 10);
    expect(build2.phase).toBe('building_back');
    expect(build2.volumePercent).toBe(85);

    const full = getReturnPhase(10, 15);
    expect(full.phase).toBe('full_return');
  });
});

// ── getIllnessDurationDays ──────────────────────────────────────────────────

describe('getIllnessDurationDays', () => {
  it('returns at least 1 day', () => {
    const illness = {
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
    } as IllnessLog;
    expect(getIllnessDurationDays(illness)).toBeGreaterThanOrEqual(1);
  });

  it('calculates days between start and end', () => {
    const start = new Date('2024-01-01');
    const end = new Date('2024-01-04');
    const illness = { startDate: start.toISOString(), endDate: end.toISOString() } as IllnessLog;
    expect(getIllnessDurationDays(illness)).toBe(3);
  });

  it('uses today as end date when endDate is null', () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const illness = { startDate: weekAgo.toISOString(), endDate: null } as unknown as IllnessLog;
    expect(getIllnessDurationDays(illness)).toBeGreaterThanOrEqual(7);
  });
});

// ── getIllnessTrainingRecommendation ────────────────────────────────────────

describe('getIllnessTrainingRecommendation', () => {
  it('blocks training for active illness with fever', () => {
    const illness: IllnessLog = {
      id: '1',
      startDate: new Date().toISOString(),
      symptoms: ['fever', 'body_aches'],
      severity: 'severe',
      status: 'active',
      dailyCheckins: [],
    } as unknown as IllnessLog;
    const rec = getIllnessTrainingRecommendation(illness);
    expect(rec.canTrain).toBe(false);
    expect(rec.rpeCap).toBe(0);
  });

  it('allows very light activity for mild active illness', () => {
    const illness: IllnessLog = {
      id: '1',
      startDate: new Date().toISOString(),
      symptoms: ['runny_nose'],
      severity: 'mild',
      status: 'active',
      dailyCheckins: [],
    } as unknown as IllnessLog;
    const rec = getIllnessTrainingRecommendation(illness);
    expect(rec.canTrain).toBe(true);
    expect(rec.rpeCap).toBeLessThanOrEqual(4);
    expect(rec.maxVolumePercent).toBeLessThanOrEqual(30);
  });

  it('fully clears resolved short illness after return phases', () => {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 5);
    const illness: IllnessLog = {
      id: '1',
      startDate: new Date(endDate.getTime() - 2 * 86400000).toISOString(),
      endDate: endDate.toISOString(),
      symptoms: ['runny_nose'],
      severity: 'mild',
      status: 'resolved',
      dailyCheckins: [],
    } as unknown as IllnessLog;
    const rec = getIllnessTrainingRecommendation(illness);
    expect(rec.canTrain).toBe(true);
    expect(rec.maxIntensityPercent).toBe(100);
  });
});

// ── shouldMarkRecovering ────────────────────────────────────────────────────

describe('shouldMarkRecovering', () => {
  it('returns false for non-active illness', () => {
    expect(shouldMarkRecovering({ status: 'resolved', dailyCheckins: [] } as unknown as IllnessLog)).toBe(false);
  });

  it('returns false with fewer than 2 check-ins', () => {
    expect(shouldMarkRecovering({
      status: 'active',
      dailyCheckins: [{ symptoms: ['fever'], severity: 'severe', hasFever: true, energyLevel: 1 }],
    } as unknown as IllnessLog)).toBe(false);
  });

  it('returns true when improving (fewer symptoms + better energy)', () => {
    const result = shouldMarkRecovering({
      status: 'active',
      dailyCheckins: [
        { symptoms: ['fever', 'cough', 'fatigue'], severity: 'severe', hasFever: true, energyLevel: 1 },
        { symptoms: ['cough'], severity: 'moderate', hasFever: false, energyLevel: 3 },
      ],
    } as unknown as IllnessLog);
    expect(result).toBe(true);
  });
});

// ── shouldMarkResolved ──────────────────────────────────────────────────────

describe('shouldMarkResolved', () => {
  it('returns true when no symptoms, no fever, good energy and appetite', () => {
    expect(shouldMarkResolved({
      symptoms: [],
      hasFever: false,
      energyLevel: 4,
      appetiteLevel: 4,
    } as unknown as IllnessDailyCheckin)).toBe(true);
  });

  it('returns false when symptoms remain', () => {
    expect(shouldMarkResolved({
      symptoms: ['cough'],
      hasFever: false,
      energyLevel: 4,
      appetiteLevel: 4,
    } as unknown as IllnessDailyCheckin)).toBe(false);
  });

  it('returns false when energy is low', () => {
    expect(shouldMarkResolved({
      symptoms: [],
      hasFever: false,
      energyLevel: 2,
      appetiteLevel: 4,
    } as unknown as IllnessDailyCheckin)).toBe(false);
  });
});

// ── getMesocycleImpact ──────────────────────────────────────────────────────

describe('getMesocycleImpact', () => {
  it('no impact for 1-2 day illness', () => {
    expect(getMesocycleImpact(1).action).toBe('none');
    expect(getMesocycleImpact(2).action).toBe('none');
  });

  it('extends program for 3-5 day illness', () => {
    const result = getMesocycleImpact(4);
    expect(result.action).toBe('extend');
    expect(result.extensionDays).toBe(4);
  });

  it('restarts week for 6-14 day illness', () => {
    expect(getMesocycleImpact(10).action).toBe('restart_week');
  });

  it('restarts block for 15+ day illness', () => {
    expect(getMesocycleImpact(15).action).toBe('restart_block');
  });
});

// ── getStreakProtection ─────────────────────────────────────────────────────

describe('getStreakProtection', () => {
  it('freezes streak for active illness', () => {
    const result = getStreakProtection({ status: 'active' } as IllnessLog);
    expect(result.freezeStreak).toBe(true);
  });

  it('freezes streak for recovering illness', () => {
    const result = getStreakProtection({ status: 'recovering' } as IllnessLog);
    expect(result.freezeStreak).toBe(true);
  });

  it('does not freeze streak for resolved illness', () => {
    const result = getStreakProtection({ status: 'resolved' } as IllnessLog);
    expect(result.freezeStreak).toBe(false);
  });
});

// ── Symptom helpers ─────────────────────────────────────────────────────────

describe('symptom helpers', () => {
  it('getSymptomLabel returns human-readable label', () => {
    expect(getSymptomLabel('runny_nose')).toBe('Runny Nose');
    expect(getSymptomLabel('shortness_of_breath')).toBe('Shortness of Breath');
  });

  it('getSymptomLocation classifies correctly', () => {
    expect(getSymptomLocation('runny_nose')).toBe('above_neck');
    expect(getSymptomLocation('cough')).toBe('below_neck');
    expect(getSymptomLocation('fever')).toBe('systemic');
  });

  it('getSymptomsByLocation returns correct symptoms', () => {
    const aboveNeck = getSymptomsByLocation('above_neck');
    expect(aboveNeck).toContain('runny_nose');
    expect(aboveNeck).toContain('sore_throat');
    expect(aboveNeck).not.toContain('fever');
  });
});
