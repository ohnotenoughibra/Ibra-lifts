/**
 * nutrition-targets — THE answer to "what should I eat today?".
 *
 * Every screen used to transform `macroTargets` its own way (dashboard ring,
 * Home strip, directive, fight-camp card at bodyweight × 33, weight-cut
 * dashboard…) so the same day showed different numbers. This resolver is the
 * one place a day's targets come from, for ANY date:
 *
 *   1. Base (per week):
 *        adaptive — measured expenditure (adaptive-tdee) + your phase's rate
 *                   (e.g. −0.5 kg/week) → calculateMacros for protein/fat/EA floor
 *        fixed    — the macros you set (Diet Coach / manual)
 *   2. Day shape: training days get more carbs, rest days fewer — normalised
 *      over your scheduled week so the week still averages the base (the old
 *      +10–40 % on top of a TDEE that already counted training ate half the
 *      deficit). Lift + BJJ on one day is a double day.
 *   3. Fight week: only when you actually have to make weight — days to
 *      weigh-in drive the weight-cut protocols (carbs, water, sodium). No cut
 *      needed → no deficit, carbs up before the fight.
 *   4. Illness: never below maintenance.
 *
 * Pure. Pass state in; nothing reads the store.
 */
import type {
  BodyWeightEntry, CompetitionEvent, CompetitionType, DietPhase, IllnessLog, MacroTargets,
  MealEntry, Mesocycle, NutritionPrefs, TrainingSession, UserProfile, WeightCutPlan, WorkoutLog,
  WearableData, BodyCompositionEntry, WeighInType,
} from './types';
import { calculateMacros, analyzeWeightTrend } from './diet-coach';
import { estimateExpenditure, weekStartKey, type ExpenditureEstimate } from './adaptive-tdee';
import {
  getWaterProtocol, getSodiumProtocol, getCarbProtocol, rehydrationHoursFor, waterCutCapForHours,
  type WaterProtocol, type SodiumProtocol,
} from './weight-cut-engine';
import { localDayKey, safeDayKey, asLocalDate } from './utils';

const LB = 0.45359237;
const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_NUTRITION_PREFS: NutritionPrefs = {
  targetMode: 'adaptive',
  mealsPerDay: 4,
  trainingTime: 'evening',
  diet: [],
  dislikes: [],
  cookingTime: 'normal',
};

export interface TargetsInput {
  user: UserProfile | null;
  macroTargets: MacroTargets;
  activeDietPhase?: DietPhase | null;
  nutritionPrefs?: NutritionPrefs | null;
  bodyWeightLog?: BodyWeightEntry[];
  bodyComposition?: BodyCompositionEntry[];
  meals?: MealEntry[];
  workoutLogs?: WorkoutLog[];
  trainingSessions?: TrainingSession[];
  currentMesocycle?: Mesocycle | null;
  competitions?: CompetitionEvent[];
  weightCutPlans?: WeightCutPlan[];
  latestWhoopData?: WearableData | null;
  activeIllness?: IllnessLog | null;
}

export type DayKind =
  | 'rest' | 'light' | 'lift' | 'hard' | 'double'
  | 'fight_week' | 'weigh_in' | 'rehydration' | 'competition' | 'illness';

export interface DayShape {
  kind: DayKind;
  label: string;
  lift: boolean;
  liftType?: 'strength' | 'hypertrophy' | 'power' | 'strength_endurance';
  combatSessions: number;
  hardCombat: boolean;
  /** true when read from the schedule (nothing logged for that day yet). */
  planned: boolean;
}

export interface FightWeekInfo {
  competitionId: string;
  competitionName: string;
  daysToWeighIn: number;
  daysToCompetition: number;
  weighInType: WeighInType;
  needsCut: boolean;
  kgToCut: number;
  cutPercent: number;
  /** 'none' = no cut needed; 'light' ≤ 1.5 % (diet + low residue only); 'full' protocol. */
  protocol: 'none' | 'light' | 'full';
  water?: WaterProtocol;
  sodium?: SodiumProtocol;
  fiberMaxG?: number;
  notes: string[];
}

export interface DailyTargets {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  waterMl: number;
  sodiumMg?: number;
  fiberMaxG?: number;
  day: DayShape;
  /** The weekly base the day was shaped from. */
  base: MacroTargets;
  mode: 'adaptive' | 'fixed' | 'setup';
  goal: 'cut' | 'maintain' | 'bulk';
  /** kg/week the base is built for (0 = maintain). */
  ratePerWeek: number;
  expenditure: ExpenditureEstimate | null;
  bodyWeightKg: number;
  fightWeek: FightWeekInfo | null;
  /** Plain-language lines explaining where the numbers came from. */
  reasons: string[];
  /** Missing profile fields that stop adaptive targets (height, age, sex, weight). */
  missing: string[];
}

// ── Body weight ─────────────────────────────────────────────────────────────

/** Trend body weight (kg) as of a day; falls back to latest weigh-in, then profile. */
export function trendWeightKg(input: TargetsInput, asOf: string = localDayKey()): number | null {
  const entries = (input.bodyWeightLog ?? []).filter(e => !e._deleted && (safeDayKey(e.date) ?? '') <= asOf);
  if (entries.length > 0) {
    const t = analyzeWeightTrend(entries, 'kg');
    if (t.current > 0) return t.current;
  }
  const kg = input.user?.bodyWeightKg;
  return kg && kg > 0 ? kg : null;
}

// ── Day shape ───────────────────────────────────────────────────────────────

const COMBAT_CATS = new Set(['grappling', 'striking', 'mma']);

function sessionTypeFor(log: WorkoutLog, meso?: Mesocycle | null): DayShape['liftType'] {
  for (const w of meso?.weeks ?? []) {
    const s = w.sessions.find(x => x.id === log.sessionId);
    if (s?.type && ['strength', 'hypertrophy', 'power', 'strength_endurance'].includes(s.type)) return s.type as DayShape['liftType'];
  }
  return 'hypertrophy';
}

function weekdayOf(dayKey: string): number {
  return new Date(`${dayKey}T12:00:00`).getDay();
}

/** What the day is for fueling: logged training first, then the schedule (today/future). */
export function shapeDay(input: TargetsInput, dayKey: string, today: string = localDayKey()): DayShape {
  const logs = (input.workoutLogs ?? []).filter(l => !l._deleted && safeDayKey(l.date) === dayKey);
  const sessions = (input.trainingSessions ?? []).filter(s =>
    !s._deleted && safeDayKey(s.date) === dayKey
    && (COMBAT_CATS.has(s.category) || (s.category === 'cardio' && s.duration >= 30)));
  const hardLogged = sessions.some(s => {
    const i = s.actualIntensity || s.plannedIntensity;
    return i === 'hard_sparring' || i === 'competition_prep' || (i === 'moderate' && s.duration >= 90);
  });

  let lift = logs.length > 0;
  let liftType = lift ? sessionTypeFor(logs[0], input.currentMesocycle) : undefined;
  let combatSessions = sessions.length;
  let hardCombat = hardLogged;
  let planned = false;

  // Today and future: add what's scheduled but not logged yet.
  if (dayKey >= today) {
    const dow = weekdayOf(dayKey);
    const sched = (input.user?.combatTrainingDays ?? []).filter(d => d.day === dow);
    if (!lift && input.user?.trainingDays?.includes(dow)) {
      lift = true;
      planned = true;
      liftType = input.user?.goalFocus === 'strength' ? 'strength' : input.user?.goalFocus === 'power' ? 'power' : 'hypertrophy';
    }
    if (combatSessions < sched.length) {
      planned = true;
      combatSessions = sched.length;
      hardCombat = hardCombat || sched.some(s => s.intensity === 'hard');
    }
  }

  const training = (lift ? 1 : 0) + combatSessions;
  let kind: DayKind;
  if (training >= 2) kind = 'double';
  else if (hardCombat) kind = 'hard';
  else if (lift) kind = 'lift';
  else if (combatSessions > 0) kind = 'light';
  else kind = 'rest';

  const parts: string[] = [];
  if (lift) parts.push('Lift');
  if (combatSessions > 0) parts.push(combatSessions > 1 ? `${combatSessions}× mats` : hardCombat ? 'Hard mats' : 'Mats');
  const label = parts.length ? parts.join(' + ') : 'Rest day';
  return { kind, label, lift, liftType, combatSessions, hardCombat, planned };
}

/**
 * Calorie weight of a day relative to an average day. The carb swing is
 * modest — the point is fuel where the work is, not a different diet.
 */
export const DAY_WEIGHT: Record<'rest' | 'light' | 'lift' | 'hard' | 'double', number> = {
  rest: 0.92,
  light: 1.0,
  lift: 1.04,
  hard: 1.08,
  double: 1.15,
};

/** Mean day weight over the scheduled week — the normaliser that keeps the weekly average on base. */
export function scheduledWeekMean(user: UserProfile | null): number {
  let sum = 0;
  for (let dow = 0; dow < 7; dow++) {
    const lift = user?.trainingDays?.includes(dow) ?? false;
    const sched = (user?.combatTrainingDays ?? []).filter(d => d.day === dow);
    const n = (lift ? 1 : 0) + sched.length;
    const kind = n >= 2 ? 'double' : sched.some(s => s.intensity === 'hard') ? 'hard' : lift ? 'lift' : sched.length ? 'light' : 'rest';
    sum += DAY_WEIGHT[kind];
  }
  return sum / 7;
}

// ── Fight week ──────────────────────────────────────────────────────────────

const DAY_BEFORE_TYPES: CompetitionType[] = ['mma_fight', 'kickboxing_fight', 'muay_thai_fight', 'boxing_match'];

export function defaultWeighIn(type: CompetitionType): WeighInType {
  if (DAY_BEFORE_TYPES.includes(type)) return 'day_before';
  if (type === 'bjj_tournament') return '2hr_before';
  return 'same_day';
}

function dayDiff(fromKey: string, toKey: string): number {
  return Math.round((Date.parse(`${toKey}T12:00:00`) - Date.parse(`${fromKey}T12:00:00`)) / DAY_MS);
}

export function fightWeekFor(input: TargetsInput, dayKey: string, bodyWeightKg: number): FightWeekInfo | null {
  const comps = (input.competitions ?? [])
    .filter(c => !c._deleted && c.isActive !== false)
    .map(c => ({ c, key: localDayKey(asLocalDate(c.date as Date | string)) }))
    .filter(({ key }) => { const d = dayDiff(dayKey, key); return d >= -1 && d <= 10; })
    .sort((a, b) => (a.key < b.key ? -1 : 1));
  if (comps.length === 0) return null;
  const { c, key } = comps[0];
  const plan = (input.weightCutPlans ?? []).find(p => p.competitionId === c.id && p.isActive);
  const weighInType = plan?.weighInType ?? defaultWeighIn(c.type);
  const daysToCompetition = dayDiff(dayKey, key);
  const daysToWeighIn = weighInType === 'day_before' ? daysToCompetition - 1 : daysToCompetition;
  if (daysToCompetition < 0) return null; // the day after — back to normal

  const unit = input.user?.weightUnit ?? 'kg';
  const classKg = plan?.targetWeightKg
    ?? (c.weightClass != null ? (unit === 'lbs' ? c.weightClass * LB : c.weightClass) : null);
  const kgToCut = classKg != null ? Math.max(0, Math.round((bodyWeightKg - classKg) * 10) / 10) : 0;
  const cutPercent = bodyWeightKg > 0 ? (kgToCut / bodyWeightKg) * 100 : 0;
  const needsCut = cutPercent > 0.3;
  const protocol: FightWeekInfo['protocol'] = !needsCut ? 'none' : cutPercent <= 1.5 ? 'light' : 'full';

  const notes: string[] = [];
  let water: WaterProtocol | undefined;
  let sodium: SodiumProtocol | undefined;
  let fiberMaxG: number | undefined;

  if (protocol === 'full') {
    // Water manipulation only when rehydration time allows it and the athlete is an adult.
    const cap = (input.user?.age ?? 25) < 18 ? 0
      : Math.min(plan?.maxWaterCutPercent ?? 5, waterCutCapForHours(plan?.rehydrationTimeHours ?? rehydrationHoursFor(weighInType)));
    const waterNeeded = cutPercent > 3 && cap > 0;
    if (waterNeeded && daysToWeighIn <= 7) {
      water = getWaterProtocol(daysToWeighIn, bodyWeightKg, cap);
      sodium = getSodiumProtocol(daysToWeighIn);
    }
    const carbP = getCarbProtocol(daysToWeighIn, bodyWeightKg);
    fiberMaxG = carbP.fiberG;
    notes.push(`${kgToCut} kg to make weight (${cutPercent.toFixed(1)} %) — ${daysToWeighIn >= 0 ? `${daysToWeighIn} day${daysToWeighIn === 1 ? '' : 's'} to weigh-in` : 'weigh-in done'}`);
    if (!waterNeeded) notes.push('Glycogen + low residue covers it — no water cut needed');
  } else if (protocol === 'light') {
    fiberMaxG = daysToWeighIn <= 2 ? 10 : undefined;
    notes.push(`${kgToCut} kg over — a low-residue last 48 h covers it, no dehydration`);
  } else if (classKg != null) {
    notes.push('On weight — eat to perform, carbs up before the fight');
  }

  return {
    competitionId: c.id, competitionName: c.name, daysToWeighIn, daysToCompetition, weighInType,
    needsCut, kgToCut, cutPercent: Math.round(cutPercent * 10) / 10, protocol, water, sodium, fiberMaxG, notes,
  };
}

// ── Base ────────────────────────────────────────────────────────────────────

function latestBodyFat(input: TargetsInput, asOf: string): number | undefined {
  const withBf = (input.bodyComposition ?? [])
    .filter(e => e.bodyFatPercent != null && e.bodyFatPercent > 0 && (safeDayKey(e.date) ?? '') <= asOf)
    .sort((a, b) => ((safeDayKey(a.date) ?? '') < (safeDayKey(b.date) ?? '') ? 1 : -1));
  return withBf[0]?.bodyFatPercent;
}

function missingProfile(user: UserProfile | null, bw: number | null): string[] {
  const m: string[] = [];
  if (!bw) m.push('weight');
  if (!user?.heightCm) m.push('height');
  if (!user?.age) m.push('age');
  if (!user?.sex) m.push('sex');
  return m;
}

/** Weekly base target (anchored to the Monday of the date's week). */
export function resolveBase(input: TargetsInput, dayKey: string): {
  base: MacroTargets; mode: DailyTargets['mode']; goal: DailyTargets['goal']; ratePerWeek: number;
  expenditure: ExpenditureEstimate | null; bodyWeightKg: number; missing: string[]; reasons: string[];
} {
  const anchor = weekStartKey(dayKey);
  const prefs = input.nutritionPrefs ?? DEFAULT_NUTRITION_PREFS;
  const phase = input.activeDietPhase?.isActive ? input.activeDietPhase : null;
  const goal = phase?.goal ?? 'maintain';
  const ratePerWeek = phase ? phase.targetRatePerWeek : 0;
  const bwOrNull = trendWeightKg(input, anchor) ?? trendWeightKg(input, dayKey);
  const bw = bwOrNull ?? 80;
  const missing = missingProfile(input.user, bwOrNull);
  const reasons: string[] = [];

  if (prefs.targetMode === 'fixed') {
    reasons.push('Fixed targets you set');
    return { base: input.macroTargets, mode: 'fixed', goal, ratePerWeek, expenditure: null, bodyWeightKg: bw, missing, reasons };
  }
  if (missing.length > 0 || !input.user) {
    reasons.push(`Add your ${missing.join(', ')} for targets built on you`);
    return { base: input.macroTargets, mode: 'setup', goal, ratePerWeek, expenditure: null, bodyWeightKg: bw, missing, reasons };
  }

  const user = input.user;
  const since = Date.parse(`${anchor}T12:00:00`) - 7 * DAY_MS;
  const until = Date.parse(`${anchor}T12:00:00`);
  const inWeek = (d: Date | string) => { const t = new Date(d).getTime(); return t >= since && t < until; };
  const weeklyTrainingSessions = (input.trainingSessions ?? []).filter(s => !s._deleted && inWeek(s.date));
  const weeklyLiftingSessions = (input.workoutLogs ?? []).filter(l => !l._deleted && inWeek(l.date));
  const bodyFatPercent = latestBodyFat(input, anchor);
  const common = {
    bodyWeightKg: bw, heightCm: user.heightCm!, age: user.age, sex: user.sex!,
    bodyFatPercent, isCombatAthlete: user.trainingIdentity === 'combat',
    weeklyTrainingSessions, weeklyLiftingSessions,
  };
  // Formula prior: maintenance TDEE from the profile + last week's training.
  const prior = calculateMacros({ ...common, goal: 'maintain', activityMultiplier: 1.55 });
  const formulaKcal = prior?.tdee ?? 2500;
  const expenditure = estimateExpenditure({
    meals: input.meals ?? [], bodyWeightLog: input.bodyWeightLog ?? [], formulaKcal, asOf: anchor,
  });

  // Rate → daily energy delta, capped at 25 % of expenditure (and EA floor inside calculateMacros).
  const rawDelta = (ratePerWeek * 7700) / 7;
  const delta = Math.max(-0.25 * expenditure.kcal, Math.min(0.15 * expenditure.kcal, rawDelta));
  const factor = (expenditure.kcal + delta) / expenditure.kcal;
  const macros = calculateMacros({
    ...common, goal, tdeeOverride: expenditure.kcal, calorieFactor: factor,
    deficitSeverity: ratePerWeek <= -0.75 ? 'aggressive' : ratePerWeek <= -0.4 ? 'moderate' : 'mild',
  });
  if (!macros) {
    return { base: input.macroTargets, mode: 'setup', goal, ratePerWeek, expenditure, bodyWeightKg: bw, missing, reasons };
  }

  const srcLabel = expenditure.source === 'formula'
    ? 'estimated from your profile + training (log food + weigh in to measure it)'
    : `measured from ${expenditure.loggedDays} logged days + ${expenditure.weighIns} weigh-ins`;
  reasons.push(`You burn ~${expenditure.kcal.toLocaleString('en-US')} kcal/day — ${srcLabel}`);
  if (ratePerWeek !== 0) {
    reasons.push(`${ratePerWeek > 0 ? 'Gain' : 'Lose'} ${Math.abs(ratePerWeek)} kg/week → ${delta > 0 ? '+' : '−'}${Math.abs(Math.round(delta))} kcal/day`);
  }
  if (expenditure.underLoggingSuspected) reasons.push('Intake looks under-logged vs your weight trend — log every bite for a week');
  const { bmr: _bmr, tdee: _tdee, leanMassKg: _lm, ...base } = macros;
  return { base, mode: 'adaptive', goal, ratePerWeek, expenditure, bodyWeightKg: bw, missing, reasons };
}

// ── The resolver ────────────────────────────────────────────────────────────

function hydrationFor(bw: number, kind: DayKind): number {
  const extra = kind === 'double' ? 1500 : kind === 'hard' ? 1000 : kind === 'rest' ? 0 : 500;
  return Math.round((bw * 35 + extra) / 250) * 250;
}

function illnessActive(i: IllnessLog | null | undefined): boolean {
  return !!i && (i.status === 'active' || i.status === 'recovering');
}

export function resolveDailyTargets(input: TargetsInput, dayKey: string = localDayKey(), today: string = localDayKey()): DailyTargets {
  const b = resolveBase(input, dayKey);
  const bw = b.bodyWeightKg;
  const shape = shapeDay(input, dayKey, today);
  const reasons = [...b.reasons];
  const base = b.base;
  const baseCarbs = base.carbs;

  let calories = base.calories;
  let protein = base.protein;
  let carbs = baseCarbs;
  let fat = base.fat;
  let waterMl = hydrationFor(bw, shape.kind);
  let sodiumMg: number | undefined;
  let fiberMaxG: number | undefined;
  let day: DayShape = shape;

  const fw = fightWeekFor(input, dayKey, bw);
  const sick = illnessActive(input.activeIllness) && dayKey === today;

  if (fw && fw.daysToCompetition === 0) {
    // Fight day — fuel. Weigh-in (if same-day) is handled by the protocol notes.
    day = { ...shape, kind: 'competition', label: `Fight day · ${fw.competitionName}` };
    carbs = Math.round(bw * 6);
    fat = Math.round(Math.min(fat, bw * 0.8));
    protein = Math.round(bw * 1.8);
    waterMl = Math.round((bw * 45) / 250) * 250;
    reasons.push('Fight day: familiar carbs, low fat and fiber, small feeds between matches');
  } else if (fw && fw.needsCut && fw.weighInType === 'day_before' && fw.daysToWeighIn === 0) {
    // Day-before weigh-in: step on the scale, then the day is about refuelling.
    day = { ...shape, kind: 'rehydration', label: 'Weigh-in day · refuel after' };
    carbs = Math.round(bw * 8);
    protein = Math.round(bw * 1.8);
    fat = Math.round(bw * 0.7);
    waterMl = Math.round((bw * 60) / 250) * 250;
    sodiumMg = 3500;
    reasons.push('Nothing until the scale — then 8 g/kg carbs and fluids with electrolytes over the evening (sip, don\'t chug)');
  } else if (fw && fw.protocol === 'full' && fw.daysToWeighIn >= 0) {
    // Make-weight days: protocol carbs, protein held high, fat moderate.
    const carbP = getCarbProtocol(fw.daysToWeighIn, bw);
    day = { ...shape, kind: fw.daysToWeighIn === 0 ? 'weigh_in' : 'fight_week', label: fw.daysToWeighIn === 0 ? 'Weigh-in day' : `Fight week · ${fw.daysToWeighIn} to weigh-in` };
    carbs = carbP.targetG;
    protein = Math.max(protein, Math.round(bw * 2.4));
    fat = Math.round(Math.max(bw * 0.6, Math.min(fat, bw * 0.9)));
    if (fw.water) waterMl = fw.water.targetMl;
    if (fw.sodium) sodiumMg = fw.sodium.targetMg;
    fiberMaxG = fw.fiberMaxG;
    reasons.push(...fw.notes, carbP.note);
    if (fw.water) reasons.push(`Water: ${fw.water.note}`);
  } else {
    // Normal (and no-cut / light-cut fight weeks) — shape the day around training.
    const kind = shape.kind as keyof typeof DAY_WEIGHT;
    const mean = scheduledWeekMean(input.user);
    const weight = DAY_WEIGHT[kind] ?? 1;
    const dayCalories = base.calories * (weight / mean);
    carbs = Math.max(Math.round(bw * 1.5), Math.round(baseCarbs + (dayCalories - base.calories) / 4));
    if (fw && fw.protocol === 'none' && fw.daysToCompetition <= 2) {
      // On weight: top up glycogen before the fight.
      carbs = Math.max(carbs, Math.round(bw * 6));
      reasons.push(...fw.notes);
    } else if (fw && fw.protocol === 'light') {
      fiberMaxG = fw.fiberMaxG;
      reasons.push(...fw.notes);
    }
    const pct = Math.round(((weight / mean) - 1) * 100);
    if (Math.abs(pct) >= 2) {
      reasons.push(`${shape.label}: ${pct > 0 ? '+' : ''}${pct} % vs your average day — the swing is carbs`);
    }
  }

  if (sick) {
    const maintenance = b.expenditure?.kcal ?? base.calories;
    const floorCarbs = Math.round((maintenance - protein * 4 - fat * 9) / 4);
    carbs = Math.max(carbs, floorCarbs);
    protein = Math.round(protein * 1.1);
    waterMl += 1000;
    day = { ...day, kind: 'illness', label: 'Sick — eat at maintenance' };
    reasons.push('Sick: never below maintenance, protein up, extra fluids');
  }

  calories = Math.round(protein * 4 + carbs * 4 + fat * 9);

  return {
    date: dayKey, calories, protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat),
    waterMl, sodiumMg, fiberMaxG, day, base, mode: b.mode, goal: b.goal, ratePerWeek: b.ratePerWeek,
    expenditure: b.expenditure, bodyWeightKg: Math.round(bw * 10) / 10, fightWeek: fw, reasons, missing: b.missing,
  };
}

/** Targets for the 7 days of the week containing `dayKey` (Mon → Sun). */
export function resolveWeek(input: TargetsInput, dayKey: string = localDayKey(), today: string = localDayKey()): DailyTargets[] {
  const start = weekStartKey(dayKey);
  const out: DailyTargets[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(`${start}T12:00:00`);
    d.setDate(d.getDate() + i);
    out.push(resolveDailyTargets(input, localDayKey(d), today));
  }
  return out;
}
