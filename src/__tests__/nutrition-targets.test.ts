/**
 * The one daily-target resolver + adaptive expenditure (2026-09 nutrition rebuild).
 */
import { describe, it, expect } from 'vitest';
import { estimateExpenditure, dailyIntake, isCompleteDay, weekStartKey } from '@/lib/adaptive-tdee';
import {
  resolveDailyTargets, resolveWeek, shapeDay, scheduledWeekMean, fightWeekFor, DEFAULT_NUTRITION_PREFS,
  type TargetsInput,
} from '@/lib/nutrition-targets';
import { localDayKey } from '@/lib/utils';
import type { BodyWeightEntry, MealEntry, UserProfile } from '@/lib/types';

const DAY = 864e5;
const TODAY = '2026-09-23'; // a Wednesday
const at = (dayKey: string, h = 12) => { const d = new Date(`${dayKey}T12:00:00`); d.setHours(h); return d; };
const shift = (dayKey: string, n: number) => { const d = new Date(`${dayKey}T12:00:00`); d.setDate(d.getDate() + n); return localDayKey(d); };

function meal(day: string, kcal: number, h = 12): MealEntry {
  return { id: `${day}-${h}`, date: at(day, h), mealType: 'lunch', name: 'x', calories: kcal, protein: kcal * 0.075, carbs: kcal * 0.1, fat: kcal * 0.033 };
}
function weigh(day: string, kg: number): BodyWeightEntry {
  return { id: `w-${day}`, date: at(day, 7), weight: kg, unit: 'kg' };
}
/** `days` days ending the day before `end`, eating `kcal`, weight moving `kgPerWeek`. */
function history(end: string, days: number, kcal: number, startKg: number, kgPerWeek: number) {
  const meals: MealEntry[] = [];
  const weights: BodyWeightEntry[] = [];
  for (let i = days; i >= 1; i--) {
    const d = shift(end, -i);
    meals.push(meal(d, kcal / 2, 9), meal(d, kcal / 2, 19));
    weights.push(weigh(d, startKg + ((days - i) / 7) * kgPerWeek));
  }
  return { meals, weights };
}

const user: UserProfile = {
  id: 'u', name: 'I', email: 'i@x', age: 30, sex: 'male', bodyWeightKg: 80, heightCm: 180,
  experienceLevel: 'intermediate', trainingIdentity: 'combat', goalFocus: 'strength', weightUnit: 'kg',
  trainingDays: [1, 3, 5], combatTrainingDays: [{ day: 2, intensity: 'hard' }, { day: 3, intensity: 'moderate' }, { day: 4, intensity: 'light' }],
  sessionsPerWeek: 3,
} as unknown as UserProfile;

const base = (over: Partial<TargetsInput> = {}): TargetsInput => ({
  user, macroTargets: { calories: 2500, protein: 200, carbs: 280, fat: 80 },
  nutritionPrefs: DEFAULT_NUTRITION_PREFS, meals: [], bodyWeightLog: [weigh(shift(TODAY, -1), 80)], ...over,
});

describe('adaptive expenditure', () => {
  it('measures expenditure from intake + trend: eating 2,500 and losing 0.5 kg/wk ≈ 3,050 kcal', () => {
    const { meals, weights } = history(TODAY, 35, 2500, 82, -0.5);
    const e = estimateExpenditure({ meals, bodyWeightLog: weights, formulaKcal: 2800, asOf: TODAY });
    expect(e.measuredKcal).not.toBeNull();
    expect(e.measuredKcal!).toBeGreaterThan(2900);
    expect(e.measuredKcal!).toBeLessThan(3200);
    expect(e.trendKgPerWeek!).toBeCloseTo(-0.5, 0);
    expect(e.confidence).toBeGreaterThan(0.9);
    expect(e.source).toBe('measured');
  });

  it('stable weight → expenditure ≈ intake', () => {
    const { meals, weights } = history(TODAY, 35, 2700, 80, 0);
    const e = estimateExpenditure({ meals, bodyWeightLog: weights, formulaKcal: 2500, asOf: TODAY });
    expect(Math.abs(e.measuredKcal! - 2700)).toBeLessThan(60);
  });

  it('falls back to the formula with too little data, blends in between', () => {
    expect(estimateExpenditure({ meals: [], bodyWeightLog: [], formulaKcal: 2600, asOf: TODAY }))
      .toMatchObject({ kcal: 2600, source: 'formula', measuredKcal: null });
    const { meals, weights } = history(TODAY, 12, 2000, 80, 0);
    const e = estimateExpenditure({ meals, bodyWeightLog: weights, formulaKcal: 2600, asOf: TODAY });
    expect(e.source).toBe('blended');
    expect(e.kcal).toBeGreaterThan(2000);
    expect(e.kcal).toBeLessThan(2600);
  });

  it('clamps an implausible measurement and flags under-logging', () => {
    const { meals, weights } = history(TODAY, 30, 1100, 80, 0); // "eating" 1,100 at stable weight
    const e = estimateExpenditure({ meals, bodyWeightLog: weights, formulaKcal: 2800, asOf: TODAY });
    expect(e.underLoggingSuspected).toBe(true);
    expect(e.clamped).toBe(true);
    expect(e.measuredKcal!).toBeGreaterThanOrEqual(2800 * 0.65 - 10);
  });

  it('half-logged days do not count', () => {
    const intake = dailyIntake([meal(TODAY, 400), meal(shift(TODAY, -1), 900, 9), meal(shift(TODAY, -1), 900, 19)]);
    expect(isCompleteDay(intake.get(TODAY))).toBe(false);
    expect(isCompleteDay(intake.get(shift(TODAY, -1)))).toBe(true);
  });

  it('week anchor is Monday', () => {
    expect(weekStartKey('2026-09-23')).toBe('2026-09-21');
    expect(weekStartKey('2026-09-27')).toBe('2026-09-21');
    expect(weekStartKey('2026-09-21')).toBe('2026-09-21');
  });
});

describe('day shape', () => {
  it('lift + BJJ on one day is a double day (was "grappling_light")', () => {
    const s = shapeDay(base(), '2026-09-23', TODAY); // Wed: lift + moderate mats scheduled
    expect(s).toMatchObject({ kind: 'double', lift: true, combatSessions: 1, planned: true });
    expect(s.label).toBe('Lift + Mats');
  });
  it('hard mats alone → hard; nothing → rest; past days use only what was logged', () => {
    expect(shapeDay(base(), '2026-09-29', TODAY).kind).toBe('hard'); // Tue
    expect(shapeDay(base(), '2026-09-27', TODAY).kind).toBe('rest'); // Sun
    expect(shapeDay(base(), '2026-09-21', TODAY).kind).toBe('rest'); // past Mon, nothing logged
  });
});

describe('resolveDailyTargets', () => {
  it('builds the base from expenditure + phase rate (adaptive mode)', () => {
    const { meals, weights } = history(TODAY, 35, 2500, 82, -0.5);
    const t = resolveDailyTargets(base({
      meals, bodyWeightLog: weights,
      activeDietPhase: { id: 'p', goal: 'cut', startDate: '2026-08-01', startWeightKg: 83, targetRatePerWeek: -0.5, currentMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 }, weeksCompleted: 3, isActive: true },
    }), TODAY, TODAY);
    expect(t.mode).toBe('adaptive');
    expect(t.goal).toBe('cut');
    // ~3,050 burn − 550 → ~2,500 base
    expect(t.base.calories).toBeGreaterThan(2350);
    expect(t.base.calories).toBeLessThan(2650);
    expect(t.base.protein).toBeGreaterThanOrEqual(Math.round(t.bodyWeightKg * 2.4) - 1);
    expect(t.reasons.join(' ')).toMatch(/measured from \d+ logged days/);
  });

  it('calories always equal the macro sum', () => {
    const week = resolveWeek(base(), TODAY, TODAY);
    for (const d of week) expect(d.calories).toBe(d.protein * 4 + d.carbs * 4 + d.fat * 9);
  });

  it('the scheduled week averages the base (no double-counted training)', () => {
    const b = base();
    const week = resolveWeek(b, '2026-09-28', '2026-09-28'); // future week → all scheduled
    const mean = week.reduce((s, d) => s + d.calories, 0) / 7;
    expect(Math.abs(mean - week[0].base.calories)).toBeLessThan(15);
    const rest = week.find(d => d.day.kind === 'rest')!;
    const dbl = week.find(d => d.day.kind === 'double')!;
    expect(dbl.carbs).toBeGreaterThan(rest.carbs);
    expect(dbl.protein).toBe(rest.protein); // protein is flat — the swing is carbs
    expect(scheduledWeekMean(user)).toBeGreaterThan(1);
  });

  it('fixed mode uses macroTargets as set', () => {
    const t = resolveDailyTargets(base({ nutritionPrefs: { ...DEFAULT_NUTRITION_PREFS, targetMode: 'fixed' } }), '2026-09-27', TODAY);
    expect(t.mode).toBe('fixed');
    expect(t.base).toEqual({ calories: 2500, protein: 200, carbs: 280, fat: 80 });
  });

  it('setup mode (profile incomplete) says what is missing', () => {
    const t = resolveDailyTargets(base({ user: { ...user, heightCm: undefined } as UserProfile }), TODAY, TODAY);
    expect(t.mode).toBe('setup');
    expect(t.missing).toContain('height');
  });

  it('illness: never below maintenance', () => {
    const t = resolveDailyTargets(base({
      activeDietPhase: { id: 'p', goal: 'cut', startDate: '2026-08-01', startWeightKg: 83, targetRatePerWeek: -0.7, currentMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 }, weeksCompleted: 3, isActive: true },
      activeIllness: { id: 'i', startDate: TODAY, symptoms: [], severity: 'mild', hasFever: false, dailyCheckins: [], status: 'active', doctorVisit: false } as never,
    }), TODAY, TODAY);
    expect(t.day.kind).toBe('illness');
    expect(t.calories).toBeGreaterThanOrEqual((t.expenditure?.kcal ?? 0) - 10);
  });
});

describe('fight week', () => {
  const comp = (daysOut: number, weightClass?: number, type = 'mma_fight') => ({
    id: 'c1', name: 'Fight Night', type, date: new Date(`${shift(TODAY, daysOut)}T12:00:00`), weightClass, peakingWeeks: 2, isActive: true,
  }) as never;

  it('no weight class / on weight → no deficit, carbs up right before the fight', () => {
    const t = resolveDailyTargets(base({ competitions: [comp(2, 84)] }), TODAY, TODAY);
    expect(t.fightWeek?.protocol).toBe('none');
    expect(t.carbs).toBeGreaterThanOrEqual(Math.round(t.bodyWeightKg * 6));
  });

  it('a real cut drives carbs/water/sodium from the protocol, by days to WEIGH-IN', () => {
    // 80 kg athlete, 77 kg class = 3.75 % → full protocol with water; fight in 4 days, weigh-in day before → 3 days out
    const t = resolveDailyTargets(base({ competitions: [comp(4, 77)] }), TODAY, TODAY);
    expect(t.fightWeek).toMatchObject({ protocol: 'full', daysToWeighIn: 3, weighInType: 'day_before' });
    expect(t.carbs).toBe(50);
    expect(t.waterMl).toBe(Math.round(t.bodyWeightKg * 40));
    expect(t.sodiumMg).toBe(1500);
    expect(t.day.label).toBe('Fight week · 3 to weigh-in');
  });

  it('small cut (≤1.5 %) never dehydrates', () => {
    const t = resolveDailyTargets(base({ competitions: [comp(3, 79)] }), TODAY, TODAY);
    expect(t.fightWeek?.protocol).toBe('light');
    expect(t.fightWeek?.water).toBeUndefined();
    expect(t.waterMl).toBeGreaterThanOrEqual(Math.round(t.bodyWeightKg * 35));
  });

  it('weight class in lbs is converted (was compared as kg)', () => {
    const fw = fightWeekFor(base({ user: { ...user, weightUnit: 'lbs' } as UserProfile, competitions: [comp(5, 170)] }), TODAY, 80);
    expect(fw!.kgToCut).toBeCloseTo(80 - 170 * 0.45359237, 1);
  });

  it('deleted competitions do not trigger fight week', () => {
    const t = resolveDailyTargets(base({ competitions: [{ ...(comp(3, 77) as object), _deleted: true } as never] }), TODAY, TODAY);
    expect(t.fightWeek).toBeNull();
  });

  it('day-before weigh-in day = refuel after the scale; fight day = fuel', () => {
    const refuel = resolveDailyTargets(base({ competitions: [comp(1, 77)] }), TODAY, TODAY); // weigh-in today, fight tomorrow
    expect(refuel.day.kind).toBe('rehydration');
    expect(refuel.carbs).toBe(Math.round(refuel.bodyWeightKg * 8));
    const fight = resolveDailyTargets(base({ competitions: [comp(0, 77)] }), TODAY, TODAY);
    expect(fight.day.kind).toBe('competition');
  });

  it('BJJ tournament weighs in on the day (2 h before) → no water cut', () => {
    const fw = fightWeekFor(base({ competitions: [comp(3, 76, 'bjj_tournament')] }), TODAY, 80);
    expect(fw).toMatchObject({ weighInType: '2hr_before', daysToWeighIn: 3, protocol: 'full' });
    expect(fw!.water).toBeUndefined();
  });
});

describe('dates', () => {
  it('uses DAY constant sanity', () => { expect(DAY).toBe(86400000); });
});
