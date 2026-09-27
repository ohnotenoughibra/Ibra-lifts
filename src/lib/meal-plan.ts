/**
 * meal-plan — turn a day's targets into meals you can actually cook.
 *
 *   planSlots      split the day's macros into meal slots around your
 *                  training time (carbs before/after, fat away from the
 *                  pre-training snack, protein spread evenly)
 *   redistribute   what's left after what you've already eaten, spread over
 *                  the slots still to come
 *   fitRecipe      scale a recipe's protein / carb / fat ingredients to land
 *                  on a slot's macros (veg fixed), rounded to shoppable amounts
 *   suggestMeals   the best-fitting recipes for a slot, honouring diet,
 *                  dislikes and cooking time, avoiding what you just ate
 *   shoppingList   ingredients for chosen meals, grouped by aisle
 *
 * Pure.
 */
import type { MealEntry, MealType, NutritionPrefs, Per100g } from './types';
import type { DailyTargets } from './nutrition-targets';
import { RECIPES, recipeFits, aisleFor, type RecipeDef, type RecipeSlot, type IngredientRole } from './recipes-at';
import { builtinFood } from './foods-at';
import { macrosFor, fold, type Macros } from './food-search';

export interface MealSlot {
  id: string;
  mealType: MealType;
  kind: RecipeSlot;
  label: string;
  /** "07:30" */
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

type Weights = { p: number; c: number; f: number };
interface SlotDef { id: string; mealType: MealType; kind: RecipeSlot; label: string; time: string; w: Weights }

const MAIN: Weights = { p: 1, c: 1, f: 1 };
const SNACK: Weights = { p: 0.6, c: 0.5, f: 0.5 };
const PRE: Weights = { p: 0.3, c: 0.8, f: 0.15 };
const POST: Weights = { p: 1.1, c: 1.5, f: 0.6 };

/** Slot templates by training time; trimmed/extended to the meals-per-day preference. */
function templateFor(prefs: NutritionPrefs, training: boolean): SlotDef[] {
  const t = prefs.trainingTime;
  const bf = (time = '07:30', w: Weights = MAIN): SlotDef => ({ id: 'breakfast', mealType: 'breakfast', kind: 'breakfast', label: 'Breakfast', time, w });
  const lunch = (time = '12:30', w: Weights = MAIN): SlotDef => ({ id: 'lunch', mealType: 'lunch', kind: 'main', label: 'Lunch', time, w });
  const dinner = (time = '19:00', w: Weights = MAIN): SlotDef => ({ id: 'dinner', mealType: 'dinner', kind: 'main', label: 'Dinner', time, w });
  const snack = (id: string, time: string): SlotDef => ({ id, mealType: 'snack', kind: 'snack', label: 'Snack', time, w: SNACK });
  const pre = (time: string): SlotDef => ({ id: 'pre', mealType: 'pre_workout', kind: 'pre', label: 'Pre-training', time, w: PRE });
  const postMain = (base: SlotDef): SlotDef => ({ ...base, kind: base.kind === 'breakfast' ? 'breakfast' : 'post', label: `${base.label} · after training`, w: POST });

  if (!training) {
    return [bf(), lunch(), snack('snack', '16:00'), dinner(), snack('evening', '21:00')];
  }
  switch (t) {
    case 'morning':
      return [pre('06:15'), postMain(bf('08:30')), lunch(), snack('snack', '16:00'), dinner(), snack('evening', '21:00')];
    case 'midday':
      return [bf(), pre('10:30'), postMain(lunch('13:30')), snack('snack', '16:30'), dinner(), snack('evening', '21:30')];
    case 'afternoon':
      return [bf(), lunch('12:00'), pre('14:30'), postMain(dinner('18:30')), snack('evening', '21:00'), snack('snack', '10:00')];
    case 'evening':
    default:
      return [bf(), lunch(), pre('16:30'), postMain(dinner('20:30')), snack('snack', '10:00'), snack('evening', '22:00')];
  }
}

/** Which template slots survive for N meals — training slots are kept first. */
function pick(defs: SlotDef[], n: number): SlotDef[] {
  const priority = (d: SlotDef) =>
    d.kind === 'post' ? 0 : d.id === 'breakfast' ? 1 : d.id === 'lunch' || d.id === 'dinner' ? 2 : d.kind === 'pre' ? 3 : d.id === 'snack' ? 4 : 5;
  const keep = new Set([...defs].sort((a, b) => priority(a) - priority(b)).slice(0, Math.max(3, Math.min(6, n))).map(d => d.id));
  return defs.filter(d => keep.has(d.id)).sort((a, b) => (a.time < b.time ? -1 : 1));
}

function split(total: Macros, defs: SlotDef[]): MealSlot[] {
  const sum = defs.reduce((s, d) => ({ p: s.p + d.w.p, c: s.c + d.w.c, f: s.f + d.w.f }), { p: 0, c: 0, f: 0 });
  return defs.map(d => {
    const protein = Math.round((total.protein * d.w.p) / (sum.p || 1));
    const carbs = Math.round((total.carbs * d.w.c) / (sum.c || 1));
    const fat = Math.round((total.fat * d.w.f) / (sum.f || 1));
    return { id: d.id, mealType: d.mealType, kind: d.kind, label: d.label, time: d.time,
      protein, carbs, fat, calories: protein * 4 + carbs * 4 + fat * 9 };
  });
}

/** The day's targets split into meal slots. */
export function planSlots(targets: Pick<DailyTargets, 'protein' | 'carbs' | 'fat' | 'calories' | 'day'>, prefs: NutritionPrefs): MealSlot[] {
  const training = !['rest', 'illness', 'weigh_in'].includes(targets.day.kind);
  const defs = pick(templateFor(prefs, training), prefs.mealsPerDay || 4);
  return split(targets, defs);
}

export interface SlotStatus extends MealSlot {
  /** Logged meals that fall in this slot. */
  eaten: Macros;
  done: boolean;
  /** Slot target after spreading today's remaining macros over upcoming slots. */
  remaining: Macros;
}

const SLOT_OF: Record<MealType, string[]> = {
  breakfast: ['breakfast'], lunch: ['lunch'], dinner: ['dinner'],
  snack: ['snack', 'evening'], pre_workout: ['pre'], post_workout: ['dinner', 'lunch', 'breakfast'],
};

/** Which slot a logged meal belongs to (the same rule redistribute uses). */
export function slotIdForMeal(slots: Pick<MealSlot, 'id' | 'mealType'>[], m: Pick<MealEntry, 'mealType'>): string | undefined {
  const candidates = SLOT_OF[m.mealType] ?? [];
  return (slots.find(s => candidates.includes(s.id)) ?? slots.find(s => s.mealType === 'snack') ?? slots[slots.length - 1])?.id;
}

/**
 * Map what's been eaten onto slots and spread what's left over the slots still
 * to come (by the same weights). A slot is done once something is logged in it.
 */
export function redistribute(slots: MealSlot[], meals: MealEntry[], nowHHMM: string): SlotStatus[] {
  const eatenBy = new Map<string, Macros>();
  const zero = (): Macros => ({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  for (const m of meals) {
    if (m._deleted) continue;
    const slotId = slotIdForMeal(slots, m);
    if (!slotId) continue;
    const e = eatenBy.get(slotId) ?? zero();
    e.calories += m.calories; e.protein += m.protein; e.carbs += m.carbs; e.fat += m.fat;
    eatenBy.set(slotId, e);
  }
  const total = slots.reduce((s, x) => ({ calories: s.calories + x.calories, protein: s.protein + x.protein, carbs: s.carbs + x.carbs, fat: s.fat + x.fat }), zero());
  const eatenTotal = Array.from(eatenBy.values()).reduce((s, x) => ({ calories: s.calories + x.calories, protein: s.protein + x.protein, carbs: s.carbs + x.carbs, fat: s.fat + x.fat }), zero());
  const left = {
    protein: Math.max(0, total.protein - eatenTotal.protein),
    carbs: Math.max(0, total.carbs - eatenTotal.carbs),
    fat: Math.max(0, total.fat - eatenTotal.fat),
  };
  const done = (s: MealSlot) => eatenBy.has(s.id);
  // Upcoming = not done; slots whose time has passed without a log still count
  // (you can eat a late lunch) unless a later slot is already done.
  const lastDoneTime = slots.filter(done).map(s => s.time).sort().pop() ?? '';
  const upcoming = slots.filter(s => !done(s) && (s.time > lastDoneTime || nowHHMM < s.time || !lastDoneTime));
  const w = upcoming.reduce((s, x) => ({ p: s.p + x.protein, c: s.c + x.carbs, f: s.f + x.fat }), { p: 0, c: 0, f: 0 });

  return slots.map(s => {
    const eaten = eatenBy.get(s.id) ?? zero();
    let remaining = zero();
    if (upcoming.includes(s)) {
      const protein = Math.round(w.p ? (left.protein * s.protein) / w.p : 0);
      const carbs = Math.round(w.c ? (left.carbs * s.carbs) / w.c : 0);
      const fat = Math.round(w.f ? (left.fat * s.fat) / w.f : 0);
      remaining = { protein, carbs, fat, calories: protein * 4 + carbs * 4 + fat * 9 };
    }
    return { ...s, eaten: roundM(eaten), done: done(s), remaining };
  });
}

function roundM(m: Macros): Macros {
  return { calories: Math.round(m.calories), protein: Math.round(m.protein), carbs: Math.round(m.carbs), fat: Math.round(m.fat) };
}

// ── Recipe fitting ──────────────────────────────────────────────────────────

export interface FittedIngredient { foodId: string; name: string; grams: number; per100g: Per100g; role: IngredientRole; aisle: string }
export interface FittedMeal {
  recipe: RecipeDef;
  ingredients: FittedIngredient[];
  macros: Macros;
  /** 0 = perfect; relative macro error. */
  error: number;
}

/** Foods you buy in units — round to whole eggs, rolls, wraps, scoops. */
const UNIT_G: Record<string, number> = {
  egg: 55, kaisersemmel: 50, vollkornweckerl: 70, tortilla: 60, 'rice-cakes': 8, dates: 8, whey: 15, casein: 15,
  banana: 60, 'protein-bar': 60, kaspressknoedel: 90, 'egg-white': 33,
};

function roundGrams(foodId: string, grams: number): number {
  const u = UNIT_G[foodId];
  if (u) return Math.max(u, Math.round(grams / u) * u);
  if (grams < 20) return Math.max(1, Math.round(grams));
  return Math.round(grams / 5) * 5;
}

function per100(foodId: string): Per100g | null {
  return builtinFood(`at:${foodId}`)?.per100g ?? null;
}

/** Solve a small symmetric linear system (Gaussian elimination). */
function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    if (Math.abs(M[piv][c]) < 1e-9) return null;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const k = M[r][c] / M[c][c];
      for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.2;

export function fitRecipe(recipe: RecipeDef, target: Pick<Macros, 'protein' | 'carbs' | 'fat'>): FittedMeal | null {
  const rows = recipe.ingredients.map(([id, grams, role]) => ({ id, grams, role, p100: per100(id) }));
  if (rows.some(r => !r.p100)) return null;
  // Macro vector [p, c, f] contributed by each role at scale 1.
  const roleVec: Record<IngredientRole, [number, number, number]> = { p: [0, 0, 0], c: [0, 0, 0], f: [0, 0, 0], v: [0, 0, 0] };
  for (const r of rows) {
    const m = macrosFor(r.p100!, r.grams);
    const v = roleVec[r.role];
    v[0] += m.protein; v[1] += m.carbs; v[2] += m.fat;
  }
  const t = [target.protein - roleVec.v[0], target.carbs - roleVec.v[1], target.fat - roleVec.v[2]];
  // Weight macros by energy so a gram of fat counts like 2.25 g of carbs.
  const W = [4, 4, 9];
  const roles = (['p', 'c', 'f'] as const).filter(r => roleVec[r].some(x => x > 0.5));
  const A = roles.map(ri => roles.map(rj => [0, 1, 2].reduce((s, k) => s + W[k] * W[k] * roleVec[ri][k] * roleVec[rj][k], 0)));
  const b = roles.map(ri => [0, 1, 2].reduce((s, k) => s + W[k] * W[k] * roleVec[ri][k] * t[k], 0));
  const x = solve(A, b) ?? roles.map(() => 1);
  const scale: Record<IngredientRole, number> = { p: 1, c: 1, f: 1, v: 1 };
  roles.forEach((r, i) => { scale[r] = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Number.isFinite(x[i]) ? x[i] : 1)); });

  const ingredients: FittedIngredient[] = rows.map(r => ({
    foodId: r.id,
    name: builtinFood(`at:${r.id}`)!.name,
    grams: roundGrams(r.id, r.grams * scale[r.role]),
    per100g: r.p100!,
    role: r.role,
    aisle: aisleFor(r.id),
  }));
  const macros = ingredients.reduce<Macros>((acc, i) => {
    const m = macrosFor(i.per100g, i.grams);
    return { calories: acc.calories + m.calories, protein: acc.protein + m.protein, carbs: acc.carbs + m.carbs, fat: acc.fat + m.fat };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  const rounded = roundM(macros);
  const targetKcal = target.protein * 4 + target.carbs * 4 + target.fat * 9;
  const err = targetKcal > 0
    ? (4 * Math.abs(rounded.protein - target.protein) + 4 * Math.abs(rounded.carbs - target.carbs) + 9 * Math.abs(rounded.fat - target.fat)) / targetKcal
    : 1;
  return { recipe, ingredients, macros: rounded, error: Math.round(err * 1000) / 1000 };
}

// ── Suggestions ─────────────────────────────────────────────────────────────

function dislikesHit(r: RecipeDef, dislikes: string[]): boolean {
  if (!dislikes?.length) return false;
  const text = fold([r.name, r.nameEn, ...r.ingredients.map(([id]) => {
    const f = builtinFood(`at:${id}`);
    return `${f?.name ?? ''} ${f?.nameEn ?? ''} ${id}`;
  })].join(' '));
  return dislikes.some(d => d.trim() && text.includes(fold(d.trim())));
}

export function recipeIdFromFoodId(foodId?: string): string | null {
  return foodId?.startsWith('recipe:') ? foodId.slice('recipe:'.length) : null;
}

export function suggestMeals(
  slot: Pick<MealSlot, 'kind'> & Pick<Macros, 'protein' | 'carbs' | 'fat'>,
  prefs: NutritionPrefs,
  opts: { recentMeals?: MealEntry[]; limit?: number; seed?: number; recipes?: RecipeDef[] } = {},
): FittedMeal[] {
  const recipes = opts.recipes ?? RECIPES;
  const recent = new Set((opts.recentMeals ?? []).map(m => recipeIdFromFoodId(m.foodId)).filter(Boolean) as string[]);
  const kinds: RecipeSlot[] = slot.kind === 'post' ? ['post', 'main'] : slot.kind === 'breakfast' ? ['breakfast'] : [slot.kind];
  const seed = opts.seed ?? 0;
  const scored: { fit: FittedMeal; score: number }[] = [];
  recipes.forEach((r, i) => {
    if (!r.slots.some(s => kinds.includes(s))) return;
    if (!recipeFits(r, prefs.diet ?? [])) return;
    if (dislikesHit(r, prefs.dislikes ?? [])) return;
    const fit = fitRecipe(r, slot);
    if (!fit) return;
    let score = fit.error;
    if (recent.has(r.id)) score += 0.25;                         // variety
    if (prefs.cookingTime === 'quick' && r.minutes > 15) score += 0.3;
    if (prefs.cookingTime === 'meal_prep' && r.mealPrep) score -= 0.05;
    score += (((i * 7919 + seed * 104729) % 97) / 97) * 0.04;    // stable daily shuffle among equals
    scored.push({ fit, score });
  });
  return scored.sort((a, b) => a.score - b.score).slice(0, opts.limit ?? 3).map(s => s.fit);
}

// ── Shopping list ───────────────────────────────────────────────────────────

export interface ShoppingItem { foodId: string; name: string; grams: number; aisle: string }

export function shoppingList(meals: FittedMeal[]): { aisle: string; items: ShoppingItem[] }[] {
  const byFood = new Map<string, ShoppingItem>();
  for (const m of meals) {
    for (const i of m.ingredients) {
      const prev = byFood.get(i.foodId);
      if (prev) prev.grams += i.grams;
      // You buy "Erdäpfel", not "Erdäpfel (gekocht)".
      else byFood.set(i.foodId, { foodId: i.foodId, name: i.name.replace(/\s*\((roh|gekocht|gegart|abgetropft|Dose, abgetropft|TK)\)\s*$/i, ''), grams: i.grams, aisle: i.aisle });
    }
  }
  const order = ['Obst & Gemüse', 'Fleisch & Fisch', 'Kühlregal', 'Brot & Gebäck', 'Tiefkühl', 'Vorrat'];
  const groups = new Map<string, ShoppingItem[]>();
  for (const it of Array.from(byFood.values())) groups.set(it.aisle, [...(groups.get(it.aisle) ?? []), it]);
  return order.filter(a => groups.has(a)).map(aisle => ({
    aisle, items: groups.get(aisle)!.sort((a, b) => a.name.localeCompare(b.name, 'de')),
  }));
}

/** Log-ready entry for a fitted meal (one entry, per-100 g of the whole dish). */
export function entryFromFitted(fit: FittedMeal, date: Date, mealType: MealType): Omit<MealEntry, 'id'> {
  const grams = fit.ingredients.reduce((s, i) => s + i.grams, 0);
  const k = 100 / (grams || 1);
  return {
    date, mealType, name: fit.recipe.name,
    calories: fit.macros.calories, protein: fit.macros.protein, carbs: fit.macros.carbs, fat: fit.macros.fat,
    grams,
    per100g: {
      calories: Math.round(fit.macros.calories * k), protein: Math.round(fit.macros.protein * k * 10) / 10,
      carbs: Math.round(fit.macros.carbs * k * 10) / 10, fat: Math.round(fit.macros.fat * k * 10) / 10,
    },
    portion: fit.ingredients.map(i => `${i.grams} g ${i.name}`).join(', '),
    foodId: `recipe:${fit.recipe.id}`,
    source: 'recipe',
  };
}
