/**
 * adaptive-tdee — what you actually burn, measured from what you eat and how
 * your weight moves (the MacroFactor idea), instead of a formula guess.
 *
 *   expenditure = average intake − (trend change × 7700 kcal/kg) / days
 *
 * Over a 21-day window ending yesterday. The body-weight TREND (EMA), not raw
 * weigh-ins, carries the energy balance so a salty dinner doesn't read as
 * 1,000 kcal of fat. The estimate is blended with the formula TDEE by how much
 * data backs it: few logged days or weigh-ins → mostly formula; three weeks
 * of solid logging → mostly measured.
 *
 * Pure. Dates are local day keys (YYYY-MM-DD).
 */
import type { BodyWeightEntry, MealEntry } from './types';
import { analyzeWeightTrend } from './diet-coach';
import { localDayKey } from './utils';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Energy per kg of body-mass change (mixed fat + lean tissue; Hall 2008 ≈ 7,700). */
export const KCAL_PER_KG = 7700;
export const WINDOW_DAYS = 21;

export interface DailyIntake {
  day: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  entries: number;
}

/** Sum logged meals per local day (deleted entries dropped). */
export function dailyIntake(meals: MealEntry[]): Map<string, DailyIntake> {
  const out = new Map<string, DailyIntake>();
  for (const m of meals ?? []) {
    if (m._deleted) continue;
    const t = new Date(m.date);
    if (Number.isNaN(t.getTime())) continue;
    const day = localDayKey(t);
    const d = out.get(day) ?? { day, calories: 0, protein: 0, carbs: 0, fat: 0, entries: 0 };
    d.calories += Number(m.calories) || 0;
    d.protein += Number(m.protein) || 0;
    d.carbs += Number(m.carbs) || 0;
    d.fat += Number(m.fat) || 0;
    d.entries += 1;
    out.set(day, d);
  }
  return out;
}

/**
 * A day counts as fully logged when it has 2+ entries and ≥ 800 kcal, or one
 * big quick-add (≥ 1,200 kcal). Half-logged days would read as a huge deficit.
 */
export function isCompleteDay(d: DailyIntake | undefined): boolean {
  if (!d) return false;
  return (d.entries >= 2 && d.calories >= 800) || d.calories >= 1200;
}

export interface ExpenditureEstimate {
  /** The number to plan with (blend of measured and formula). */
  kcal: number;
  /** Formula TDEE (BMR × activity / dynamic), the prior. */
  formulaKcal: number;
  /** Measured from intake + trend; null until there's enough data. */
  measuredKcal: number | null;
  /** 0–1: how much of `kcal` is the measurement. */
  confidence: number;
  source: 'formula' | 'blended' | 'measured';
  loggedDays: number;
  weighIns: number;
  /** Trend change over the window, kg per week (negative = losing). */
  trendKgPerWeek: number | null;
  /** Average logged intake on complete days in the window. */
  avgIntake: number | null;
  /** Measured value was clamped to a plausible range (likely under-logging). */
  clamped: boolean;
  underLoggingSuspected: boolean;
}

function shiftDay(dayKey: string, days: number): string {
  const d = new Date(`${dayKey}T12:00:00`);
  d.setDate(d.getDate() + days);
  return localDayKey(d);
}

/**
 * Estimate expenditure as of `asOf` (window = the 21 days BEFORE asOf, so the
 * number is stable during that day and never uses a half-logged today).
 */
export function estimateExpenditure(opts: {
  meals: MealEntry[];
  bodyWeightLog: BodyWeightEntry[];
  formulaKcal: number;
  asOf?: string;
  windowDays?: number;
}): ExpenditureEstimate {
  const { meals, bodyWeightLog, formulaKcal } = opts;
  const windowDays = opts.windowDays ?? WINDOW_DAYS;
  const asOf = opts.asOf ?? localDayKey();
  const start = shiftDay(asOf, -windowDays);
  const end = shiftDay(asOf, -1);

  const intake = dailyIntake(meals);
  const complete: DailyIntake[] = [];
  for (let i = 0; i < windowDays; i++) {
    const d = intake.get(shiftDay(start, i));
    if (isCompleteDay(d)) complete.push(d!);
  }
  const avgIntake = complete.length > 0
    ? complete.reduce((s, d) => s + d.calories, 0) / complete.length
    : null;

  // Trend over the window. Weigh-ins from 14 days before the window warm up the EMA.
  const warmStart = shiftDay(start, -14);
  const inRange = (bodyWeightLog ?? []).filter(e => {
    if (e._deleted) return false;
    const k = localDayKey(new Date(e.date));
    return k >= warmStart && k <= end;
  });
  const trend = analyzeWeightTrend(inRange, 'kg').trendData;
  const windowPoints = trend.filter(p => p.date >= start && p.date <= end);
  const weighIns = windowPoints.length;

  let trendKgPerWeek: number | null = null;
  let measured: number | null = null;
  if (windowPoints.length >= 2) {
    // Trend value at (or just before) the window start → last trend point.
    const before = trend.filter(p => p.date <= start);
    const first = before.length > 0 ? before[before.length - 1] : windowPoints[0];
    const last = windowPoints[windowPoints.length - 1];
    const spanDays = (Date.parse(last.date) - Date.parse(first.date)) / DAY_MS;
    if (spanDays >= 10) {
      const changeKg = last.trend - first.trend;
      trendKgPerWeek = Math.round((changeKg / spanDays) * 7 * 100) / 100;
      if (avgIntake != null && complete.length >= 7) {
        measured = avgIntake - (changeKg * KCAL_PER_KG) / spanDays;
      }
    }
  }

  // Plausibility clamp: outside 65–150 % of the formula is almost always
  // under-logging (or a scale change), not a real metabolism.
  let clamped = false;
  let underLoggingSuspected = false;
  if (measured != null && formulaKcal > 0) {
    const lo = formulaKcal * 0.65;
    const hi = formulaKcal * 1.5;
    if (measured < formulaKcal * 0.75 && complete.length >= 10) underLoggingSuspected = true;
    if (measured < lo) { measured = lo; clamped = true; }
    if (measured > hi) { measured = hi; clamped = true; }
  }

  let confidence = 0;
  if (measured != null) {
    confidence = Math.min(1, complete.length / 18) * Math.min(1, weighIns / 8);
    if (clamped) confidence *= 0.5;
    confidence = Math.round(confidence * 100) / 100;
  }
  const blended = measured != null
    ? confidence * measured + (1 - confidence) * formulaKcal
    : formulaKcal;
  const source: ExpenditureEstimate['source'] =
    measured == null || confidence < 0.15 ? 'formula' : confidence >= 0.85 ? 'measured' : 'blended';

  return {
    kcal: Math.round(blended / 10) * 10,
    formulaKcal: Math.round(formulaKcal),
    measuredKcal: measured != null ? Math.round(measured / 10) * 10 : null,
    confidence,
    source,
    loggedDays: complete.length,
    weighIns,
    trendKgPerWeek,
    avgIntake: avgIntake != null ? Math.round(avgIntake) : null,
    clamped,
    underLoggingSuspected,
  };
}

/** Monday (local) of the week containing `dayKey` — targets re-anchor weekly. */
export function weekStartKey(dayKey: string): string {
  const d = new Date(`${dayKey}T12:00:00`);
  const dow = (d.getDay() + 6) % 7; // Mon = 0
  d.setDate(d.getDate() - dow);
  return localDayKey(d);
}
