/**
 * Regression tests for the nutrition audit fixes (2026-09 rebuild).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { dailyExerciseCostLastWeek, estimateDailyExerciseCost, calculateWeeklyAdjustment } from '@/lib/diet-coach';
import { generateDailyChecklist } from '@/lib/weight-cut-engine';
import { detectFightCampPhase } from '@/lib/fight-camp-engine';
import { adaptiveMacroTargetsUpdate } from '@/lib/nutrition-state';
import { DEFAULT_NUTRITION_PREFS } from '@/lib/nutrition-targets';
import { useAppStore } from '@/lib/store';
import type { MealEntry, TrainingSession, UserProfile, WorkoutLog } from '@/lib/types';

const DAY = 864e5;
const now = Date.parse('2026-09-27T12:00:00Z');

describe('energy availability exercise cost', () => {
  const session = (daysAgo: number): TrainingSession => ({
    id: `s${daysAgo}`, date: new Date(now - daysAgo * DAY), category: 'grappling', type: 'bjj_nogi',
    plannedIntensity: 'moderate', duration: 60, perceivedExertion: 6,
  } as TrainingSession);
  const lift = (daysAgo: number): WorkoutLog => ({ id: `l${daysAgo}`, date: new Date(now - daysAgo * DAY), duration: 60 } as WorkoutLog);

  it('is a DAILY average over the last 7 days, lifts included (was the weekly total)', () => {
    const sessions = [1, 3, 5, 20].map(session); // the 20-day-old one is out of range
    const lifts = [2, 4].map(lift);
    const daily = dailyExerciseCostLastWeek(sessions, lifts, 80, now);
    const weeklyTotalOfThree = estimateDailyExerciseCost(sessions.slice(0, 3), lifts, 80);
    expect(daily).toBeCloseTo(weeklyTotalOfThree / 7, 5);
    expect(daily).toBeGreaterThan(0);
    expect(daily).toBeLessThan(700);
  });
});

describe('weekly check-in', () => {
  const base = {
    currentMacros: { calories: 2000, protein: 180, carbs: 180, fat: 60 }, goal: 'cut' as const, targetRatePerWeek: -0.5,
    weeksAtPlateau: 0, adherencePercent: 90, sex: 'male' as const, bodyWeightKg: 80,
  };
  it('losing slower than target (not a plateau) now adjusts, with a reason', () => {
    const r = calculateWeeklyAdjustment({ ...base, actualWeeklyChange: -0.2 });
    expect(r.adjustment).toBe('decrease');
    expect(r.reason).toMatch(/slower|Losing 0\.20/);
    expect(r.newMacros.calories).toBeLessThan(2000);
  });
  it('the calorie floor survives the macro recalculation', () => {
    const r = calculateWeeklyAdjustment({ ...base, currentMacros: { calories: 1450, protein: 180, carbs: 60, fat: 50 }, actualWeeklyChange: 0, weeksAtPlateau: 3 });
    expect(r.newMacros.calories).toBeGreaterThanOrEqual(1400);
    expect(r.newMacros.calories).toBe(r.newMacros.protein * 4 + r.newMacros.carbs * 4 + r.newMacros.fat * 9);
    expect(r.newMacros.carbs).toBeGreaterThanOrEqual(0);
  });
  it('on-track keeps a reason', () => {
    expect(calculateWeeklyAdjustment({ ...base, actualWeeklyChange: -0.5 }).reason).toMatch(/On track/);
  });
});

describe('weight cut + fight camp', () => {
  it('checklist honours the water cap (no loading for a 2 h weigh-in)', () => {
    const tasks = generateDailyChecklist(3, 80, 0).tasks.map(t => t.task).join(' | ');
    expect(tasks).toMatch(/Water intake: 3L \(Normal hydration/);
  });
  it('tournament flag goes to the tournament slot, not post-competition', () => {
    expect(detectFightCampPhase(3, false, true)).not.toBe('post_competition');
  });
});

describe('store: meals', () => {
  const at = (h: number, daysAgo = 0) => { const d = new Date(); d.setDate(d.getDate() - daysAgo); d.setHours(h, 0, 0, 0); return d; };
  const meal = (id: string, daysAgo: number, f: Partial<MealEntry> = {}): MealEntry => ({
    id, date: at(12, daysAgo), mealType: 'lunch', name: id, calories: 500, protein: 40, carbs: 50, fat: 15, ...f,
  });
  beforeEach(() => useAppStore.setState({ meals: [], user: null, bodyWeightLog: [] } as never));

  it('copy yesterday skips deleted meals and supplement logs, keeps time of day, returns ids for undo', () => {
    const y = new Date(); y.setDate(y.getDate() - 1); y.setHours(8, 30, 0, 0);
    useAppStore.setState({ meals: [
      meal('live', 1, { date: y }), meal('gone', 1, { _deleted: true, _deletedAt: 1 }), meal('Creatine (supplement)', 1),
    ] } as never);
    const today = new Date(); const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const ids = useAppStore.getState().copyYesterdayMeals(key);
    expect(ids).toHaveLength(1);
    const copy = useAppStore.getState().meals.find(m => m.id === ids[0])!;
    expect(copy.name).toBe('live');
    expect(copy._deleted).toBeUndefined();
    expect(new Date(copy.date).getHours()).toBe(8);
    useAppStore.getState().undoMeals(ids);
    expect(useAppStore.getState().meals.find(m => m.id === ids[0])!._deleted).toBe(true);
  });

  it('delete → restore revives with a newer updatedAt (beats the tombstone in sync)', () => {
    useAppStore.setState({ meals: [meal('m1', 0)] } as never);
    useAppStore.getState().deleteMeal('m1');
    useAppStore.getState().restoreMeal('m1');
    const m = useAppStore.getState().meals[0];
    expect(m._deleted).toBeUndefined();
    expect(m.updatedAt).toBeTruthy();
  });

  it('a weigh-in updates the profile weight (readiness read a stale onboarding value)', () => {
    useAppStore.setState({ user: { id: 'u', weightUnit: 'lbs', bodyWeightKg: 90 } as UserProfile } as never);
    useAppStore.getState().addBodyWeight(176.4);
    expect(useAppStore.getState().user!.bodyWeightKg).toBeCloseTo(80, 0);
  });
});

describe('adaptive autopilot', () => {
  const user = { id: 'u', age: 30, sex: 'male', heightCm: 180, bodyWeightKg: 80, trainingIdentity: 'combat', goalFocus: 'strength', weightUnit: 'kg' } as UserProfile;
  it('moves the stored macroTargets onto the adaptive base, then stops', () => {
    const s = { user, macroTargets: { calories: 2500, protein: 200, carbs: 280, fat: 80 }, nutritionPrefs: DEFAULT_NUTRITION_PREFS, bodyWeightLog: [], meals: [] };
    const next = adaptiveMacroTargetsUpdate(s, '2026-09-23');
    expect(next).not.toBeNull();
    expect(next!.calories).toBe(next!.protein * 4 + next!.carbs * 4 + next!.fat * 9);
    expect(adaptiveMacroTargetsUpdate({ ...s, macroTargets: next! }, '2026-09-23')).toBeNull();
  });
  it('never writes in fixed mode or with an incomplete profile', () => {
    const fixed = { user, macroTargets: { calories: 2500, protein: 200, carbs: 280, fat: 80 }, nutritionPrefs: { ...DEFAULT_NUTRITION_PREFS, targetMode: 'fixed' as const } };
    expect(adaptiveMacroTargetsUpdate(fixed, '2026-09-23')).toBeNull();
    expect(adaptiveMacroTargetsUpdate({ ...fixed, nutritionPrefs: DEFAULT_NUTRITION_PREFS, user: { ...user, heightCm: undefined } }, '2026-09-23')).toBeNull();
  });
});
