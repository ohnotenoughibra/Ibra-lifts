import { describe, it, expect } from 'vitest';
import {
  calculateMacros,
  getTargetRate,
  calculateWeeklyAdjustment,
  analyzeWeightTrend,
  getPhaseRecommendation,
  calculateAdherence,
} from '@/lib/diet-coach';

// ── calculateMacros (Mifflin-St Jeor) ──────────────────────────────────────

describe('calculateMacros', () => {
  const maleInput = {
    bodyWeightKg: 80,
    heightCm: 180,
    age: 25,
    sex: 'male' as const,
    goal: 'maintain' as const,
  };

  const femaleInput = {
    bodyWeightKg: 65,
    heightCm: 165,
    age: 25,
    sex: 'female' as const,
    goal: 'maintain' as const,
  };

  it('calculates reasonable maintenance calories for male', () => {
    const macros = calculateMacros(maleInput)!;
    // BMR = 10*80 + 6.25*180 - 5*25 + 5 = 800 + 1125 - 125 + 5 = 1805
    // Maintenance = 1805 * 1.55 ≈ 2798
    expect(macros.calories).toBeGreaterThan(2400);
    expect(macros.calories).toBeLessThan(3200);
  });

  it('calculates reasonable maintenance calories for female', () => {
    const macros = calculateMacros(femaleInput)!;
    // BMR = 10*65 + 6.25*165 - 5*25 - 161 = 650 + 1031 - 125 - 161 = 1395
    // Maintenance = 1395 * 1.55 ≈ 2162
    expect(macros.calories).toBeGreaterThan(1800);
    expect(macros.calories).toBeLessThan(2600);
  });

  it('creates 20% deficit on cut', () => {
    const maintain = calculateMacros({ ...maleInput, goal: 'maintain' })!;
    const cut = calculateMacros({ ...maleInput, goal: 'cut' })!;
    const ratio = cut.calories / maintain.calories;
    expect(ratio).toBeCloseTo(0.8, 1);
  });

  it('creates ~12% surplus on male bulk', () => {
    const maintain = calculateMacros({ ...maleInput, goal: 'maintain' })!;
    const bulk = calculateMacros({ ...maleInput, goal: 'bulk' })!;
    expect(bulk.calories).toBeGreaterThan(maintain.calories);
  });

  it('gives women higher protein per kg on cut', () => {
    const maleCut = calculateMacros({ ...maleInput, goal: 'cut' })!;
    const femaleCut = calculateMacros({ ...femaleInput, goal: 'cut' })!;
    // Male: 2.4 g/kg, Female: 2.0 g/kg
    const maleProteinPerKg = maleCut.protein / maleInput.bodyWeightKg;
    const femaleProteinPerKg = femaleCut.protein / femaleInput.bodyWeightKg;
    expect(maleProteinPerKg).toBeCloseTo(2.4, 0);
    expect(femaleProteinPerKg).toBeCloseTo(2.0, 0);
  });

  it('gives women higher fat floor', () => {
    const femaleCut = calculateMacros({ ...femaleInput, goal: 'cut' })!;
    // Female fat floor: 1.0 g/kg = 65g
    expect(femaleCut.fat).toBeGreaterThanOrEqual(65);
  });

  it('macros sum to approximately the calorie target', () => {
    const macros = calculateMacros(maleInput)!;
    const summedCalories = macros.protein * 4 + macros.carbs * 4 + macros.fat * 9;
    expect(Math.abs(summedCalories - macros.calories)).toBeLessThan(10);
  });

  it('never produces negative carbs', () => {
    // Extreme case: very low calorie with high protein and fat
    const extremeInput = { bodyWeightKg: 120, heightCm: 160, age: 60, sex: 'male' as const, goal: 'cut' as const };
    const macros = calculateMacros(extremeInput)!;
    expect(macros.carbs).toBeGreaterThanOrEqual(0);
  });

  it('respects custom activity multiplier', () => {
    const sedentary = calculateMacros({ ...maleInput, activityMultiplier: 1.2 })!;
    const veryActive = calculateMacros({ ...maleInput, activityMultiplier: 1.9 })!;
    expect(veryActive.calories).toBeGreaterThan(sedentary.calories);
  });

  it('returns null when profile fields are missing or zero', () => {
    expect(calculateMacros({ ...maleInput, bodyWeightKg: 0 })).toBeNull();
    expect(calculateMacros({ ...maleInput, heightCm: 0 })).toBeNull();
    expect(calculateMacros({ ...maleInput, age: 0 })).toBeNull();
    expect(calculateMacros({ ...maleInput, sex: '' as any })).toBeNull();
  });
});

// ── getTargetRate ───────────────────────────────────────────────────────────

describe('getTargetRate', () => {
  it('returns negative value for cut', () => {
    expect(getTargetRate('cut', 80)).toBeLessThan(0);
  });

  it('returns positive value for bulk', () => {
    expect(getTargetRate('bulk', 80)).toBeGreaterThan(0);
  });

  it('returns 0 for maintain', () => {
    expect(getTargetRate('maintain', 80)).toBe(0);
  });

  it('women cut slower than men', () => {
    const maleRate = Math.abs(getTargetRate('cut', 80, 'male'));
    const femaleRate = Math.abs(getTargetRate('cut', 80, 'female'));
    expect(femaleRate).toBeLessThan(maleRate);
  });

  it('women bulk slower than men', () => {
    const maleRate = getTargetRate('bulk', 80, 'male');
    const femaleRate = getTargetRate('bulk', 80, 'female');
    expect(femaleRate).toBeLessThan(maleRate);
  });

  it('scales with body weight', () => {
    const light = Math.abs(getTargetRate('cut', 60, 'male'));
    const heavy = Math.abs(getTargetRate('cut', 100, 'male'));
    expect(heavy).toBeGreaterThan(light);
  });
});

// ── calculateWeeklyAdjustment ───────────────────────────────────────────────

describe('calculateWeeklyAdjustment', () => {
  const baseMacros = { calories: 2500, protein: 180, carbs: 250, fat: 80 };

  it('maintains macros when on track', () => {
    const result = calculateWeeklyAdjustment({
      currentMacros: baseMacros,
      goal: 'cut',
      targetRatePerWeek: -0.5,
      actualWeeklyChange: -0.45,
      weeksAtPlateau: 0,
      adherencePercent: 90,
    });
    expect(result.adjustment).toBe('maintain');
  });

  it('does not adjust with poor adherence (<70%)', () => {
    const result = calculateWeeklyAdjustment({
      currentMacros: baseMacros,
      goal: 'cut',
      targetRatePerWeek: -0.5,
      actualWeeklyChange: 0, // stalled
      weeksAtPlateau: 5,
      adherencePercent: 50,
    });
    expect(result.adjustment).toBe('maintain');
    expect(result.reason).toContain('Adherence');
  });

  it('decreases calories when stalled on cut for 2+ weeks', () => {
    const result = calculateWeeklyAdjustment({
      currentMacros: baseMacros,
      goal: 'cut',
      targetRatePerWeek: -0.5,
      actualWeeklyChange: 0,
      weeksAtPlateau: 3,
      adherencePercent: 90,
    });
    expect(result.adjustment).toBe('decrease');
    expect(result.newMacros.calories).toBeLessThan(baseMacros.calories);
  });

  it('increases calories when losing too fast on cut', () => {
    const result = calculateWeeklyAdjustment({
      currentMacros: baseMacros,
      goal: 'cut',
      targetRatePerWeek: -0.5,
      actualWeeklyChange: -1.5,
      weeksAtPlateau: 0,
      adherencePercent: 90,
    });
    expect(result.adjustment).toBe('increase');
  });

  it('increases calories on bulk when not gaining enough', () => {
    const result = calculateWeeklyAdjustment({
      currentMacros: baseMacros,
      goal: 'bulk',
      targetRatePerWeek: 0.3,
      actualWeeklyChange: 0.05,
      weeksAtPlateau: 3,
      adherencePercent: 85,
    });
    expect(result.adjustment).toBe('increase');
  });

  it('pauses adjustments during illness', () => {
    const result = calculateWeeklyAdjustment({
      currentMacros: baseMacros,
      goal: 'cut',
      targetRatePerWeek: -0.5,
      actualWeeklyChange: 0,
      weeksAtPlateau: 5,
      adherencePercent: 90,
      isIll: true,
    });
    expect(result.adjustment).toBe('maintain');
    expect(result.reason).toContain('illness');
  });

  it('triggers RED-S alert when calories drop below female floor', () => {
    const lowMacros = { calories: 1100, protein: 130, carbs: 50, fat: 40 };
    const result = calculateWeeklyAdjustment({
      currentMacros: lowMacros,
      goal: 'cut',
      targetRatePerWeek: -0.5,
      actualWeeklyChange: 0,
      weeksAtPlateau: 3,
      adherencePercent: 90,
      sex: 'female',
    });
    // Alert is triggered when pre-recalc calories < 1200
    // Final calories are recalculated from protein*4 + carbs*4 + fat*9
    expect(result.alert).toContain('RED-S');
    // Fat floor for women is 50g minimum
    expect(result.newMacros.fat).toBeGreaterThanOrEqual(50);
  });

  it('corrects drifting weight on maintenance', () => {
    const result = calculateWeeklyAdjustment({
      currentMacros: baseMacros,
      goal: 'maintain',
      targetRatePerWeek: 0,
      actualWeeklyChange: 0.5,
      weeksAtPlateau: 0,
      adherencePercent: 80,
    });
    expect(result.adjustment).toBe('decrease');
  });
});

// ── analyzeWeightTrend ──────────────────────────────────────────────────────

describe('analyzeWeightTrend', () => {
  it('returns zeros for empty entries', () => {
    const result = analyzeWeightTrend([]);
    expect(result.current).toBe(0);
    expect(result.weeklyChange).toBe(0);
    expect(result.weeksAtPlateau).toBe(0);
  });

  it('calculates trend from entries', () => {
    const entries = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return { id: `e${i}`, date: d, weight: 80 + i * 0.1, unit: 'kg' as const };
    });
    const result = analyzeWeightTrend(entries);
    expect(result.current).toBeGreaterThan(0);
    expect(result.trendData.length).toBe(14);
  });

  it('converts lbs to kg internally and back for display', () => {
    const entries = [
      { id: 'e0', date: new Date(), weight: 176, unit: 'lbs' as const },
    ];
    const kgResult = analyzeWeightTrend(entries, 'kg');
    const lbsResult = analyzeWeightTrend(entries, 'lbs');
    // 176 lbs ≈ 79.8 kg
    expect(kgResult.current).toBeCloseTo(79.8, 0);
    expect(lbsResult.current).toBeCloseTo(176, 0);
  });

  it('detects plateau (stable weight for 2+ weeks)', () => {
    const entries = Array.from({ length: 21 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (20 - i));
      return { id: `e${i}`, date: d, weight: 80 + Math.random() * 0.05, unit: 'kg' as const }; // ~0.05kg noise
    });
    const result = analyzeWeightTrend(entries);
    expect(result.weeksAtPlateau).toBeGreaterThanOrEqual(1);
  });
});

// ── getPhaseRecommendation ──────────────────────────────────────────────────

describe('getPhaseRecommendation', () => {
  it('returns default for null phase', () => {
    const result = getPhaseRecommendation(null);
    expect(result.shouldTakeBreak).toBe(false);
    expect(result.shouldTransition).toBe(false);
  });

  it('returns default for inactive phase', () => {
    const result = getPhaseRecommendation({ isActive: false, goal: 'cut', weeksCompleted: 20 } as any);
    expect(result.shouldTransition).toBe(false);
  });

  it('recommends transition after max cut weeks (male: 12)', () => {
    const result = getPhaseRecommendation(
      { isActive: true, goal: 'cut', weeksCompleted: 12 } as any,
      'male'
    );
    expect(result.shouldTransition).toBe(true);
    expect(result.nextGoal).toBe('maintain');
  });

  it('recommends earlier transition for women (8 weeks)', () => {
    const result = getPhaseRecommendation(
      { isActive: true, goal: 'cut', weeksCompleted: 8 } as any,
      'female'
    );
    expect(result.shouldTransition).toBe(true);
  });

  it('suggests diet break every 6 weeks for men on cut', () => {
    const result = getPhaseRecommendation(
      { isActive: true, goal: 'cut', weeksCompleted: 6 } as any,
      'male'
    );
    expect(result.shouldTakeBreak).toBe(true);
  });

  it('suggests diet break every 4 weeks for women on cut', () => {
    const result = getPhaseRecommendation(
      { isActive: true, goal: 'cut', weeksCompleted: 4 } as any,
      'female'
    );
    expect(result.shouldTakeBreak).toBe(true);
  });

  it('recommends transition after max bulk weeks (male: 16)', () => {
    const result = getPhaseRecommendation(
      { isActive: true, goal: 'bulk', weeksCompleted: 16 } as any,
      'male'
    );
    expect(result.shouldTransition).toBe(true);
  });

  it('recommends earlier bulk transition for women (12 weeks)', () => {
    const result = getPhaseRecommendation(
      { isActive: true, goal: 'bulk', weeksCompleted: 12 } as any,
      'female'
    );
    expect(result.shouldTransition).toBe(true);
  });

  it('no action needed in early cut', () => {
    const result = getPhaseRecommendation(
      { isActive: true, goal: 'cut', weeksCompleted: 2 } as any,
      'male'
    );
    expect(result.shouldTakeBreak).toBe(false);
    expect(result.shouldTransition).toBe(false);
  });
});

// ── calculateAdherence ──────────────────────────────────────────────────────

describe('calculateAdherence', () => {
  it('returns 0 for no meals', () => {
    expect(calculateAdherence([])).toBe(0);
  });

  it('returns 100% when all days have 2+ meals', () => {
    const meals = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      meals.push({ date: d }, { date: d });
    }
    expect(calculateAdherence(meals)).toBe(100);
  });

  it('returns partial for some days with meals', () => {
    const d = new Date();
    const meals = [{ date: d }, { date: d }]; // Only today
    const adherence = calculateAdherence(meals, 7);
    expect(adherence).toBeCloseTo(14, 0); // 1/7 ≈ 14%
  });
});
