/**
 * food-search — one ranked search over your foods, your history and the
 * built-in library, plus the gram maths every logging path shares.
 *
 * Matching is word-prefix on accent-folded text, every query word must hit:
 * "reis" finds Reis, not "Eis" (the old `q.includes(kw)` matched ice cream);
 * "kase" / "käse" / "kaese" all find Käse; "boiled" no longer matches "oil".
 */
import type { FoodItem, MealEntry, Per100g, FoodServing, MealType } from './types';
import { BUILTIN_FOODS } from './foods-at';

// ── Text ────────────────────────────────────────────────────────────────────

/** Lowercase, ß→ss, drop accents and the German ae/oe/ue spellings. */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u');
}

function words(s: string): string[] {
  return fold(s).split(/[^a-z0-9]+/).filter(Boolean);
}

/** Score one query word against a word list: exact 3, prefix / plural 2, inside a long word 1. */
function wordScore(q: string, ws: string[]): number {
  let best = 0;
  for (const w of ws) {
    if (w === q) return 3;
    if (w.startsWith(q)) best = Math.max(best, 2);
    // Plurals and inflections: "semmeln" → semmel, "eier" → ei, "nudeln" → nudel
    else if (w.length >= 2 && q.startsWith(w) && q.length - w.length <= 2 && /^(n|en|e|s|er|r)$/.test(q.slice(w.length))) best = Math.max(best, 2);
    else if (q.length >= 4 && w.length >= 6 && w.includes(q)) best = Math.max(best, 1);
  }
  return best;
}

/** Words that carry no food meaning in a query ("2 eier mit speck"). */
const STOP = new Set(['ein', 'eine', 'einen', 'einer', 'mit', 'und', 'dazu', 'etwas', 'bisschen', 'a', 'an', 'the', 'and', 'with', 'of', 'g', 'gr', 'ml', 'l', 'kg', 'stk', 'x']);

/** 0 = no match; otherwise higher is better. All query words must match. */
export function matchScore(query: string, haystack: string): number {
  const qs = words(query).filter(q => !STOP.has(q) && !/^\d+(g|gr|ml|l|kg|x|stk)?$/.test(q));
  if (qs.length === 0) return 0;
  const ws = words(haystack);
  let total = 0;
  for (const q of qs) {
    const s = wordScore(q, ws);
    if (s === 0) return 0;
    total += s;
  }
  return total;
}

// ── Gram maths ──────────────────────────────────────────────────────────────

export interface Macros { calories: number; protein: number; carbs: number; fat: number; fiber?: number }

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Macros for `grams` of a food given per 100 g. kcal whole, macros to 0.1 g. */
export function macrosFor(per100g: Per100g, grams: number): Macros {
  const k = Math.max(0, grams) / 100;
  const m: Macros = {
    calories: Math.round(per100g.calories * k),
    protein: r1(per100g.protein * k),
    carbs: r1(per100g.carbs * k),
    fat: r1(per100g.fat * k),
  };
  if (per100g.fiber != null) m.fiber = r1(per100g.fiber * k);
  return m;
}

/** Per-100 g from a known amount (e.g. a history entry "200 g → 330 kcal"). */
export function per100From(m: Macros, grams: number): Per100g | null {
  if (!(grams > 0)) return null;
  const k = 100 / grams;
  return {
    calories: Math.round(m.calories * k), protein: r1(m.protein * k),
    carbs: r1(m.carbs * k), fat: r1(m.fat * k),
    ...(m.fiber != null ? { fiber: r1(m.fiber * k) } : {}),
  };
}

/** A recipe's per-100 g: total of ingredients over the cooked weight (or the raw sum). */
export function recipePer100g(ingredients: { grams: number; per100g: Per100g }[], yieldGrams?: number): Per100g {
  const tot = ingredients.reduce((acc, i) => {
    const m = macrosFor(i.per100g, i.grams);
    return {
      calories: acc.calories + m.calories, protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs, fat: acc.fat + m.fat, fiber: acc.fiber + (m.fiber ?? 0),
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
  const raw = ingredients.reduce((s, i) => s + i.grams, 0);
  const weight = yieldGrams && yieldGrams > 0 ? yieldGrams : raw;
  return per100From(tot, weight) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
}

/** Parse "250", "250g", "250 g", "0,5 l", "1.5" (servings) typed by the athlete. */
export function parseAmount(input: string): { value: number; unit: 'g' | 'ml' | 'x' } | null {
  const m = input.trim().toLowerCase().replace(',', '.').match(/^(\d+(?:\.\d+)?)\s*(g|gr|gramm|ml|l|x|×|stk|stück)?$/);
  if (!m) return null;
  const v = parseFloat(m[1]);
  if (!(v > 0)) return null;
  const u = m[2];
  if (u === 'l') return { value: v * 1000, unit: 'ml' };
  if (u === 'ml') return { value: v, unit: 'ml' };
  if (u === 'x' || u === '×' || u === 'stk' || u === 'stück') return { value: v, unit: 'x' };
  return { value: v, unit: 'g' };
}

// ── One meal-type rule ──────────────────────────────────────────────────────

/** Meal slot for a time of day — the ONE rule (there were three). */
export function mealTypeForHour(h: number): MealType {
  if (h < 10.5) return 'breakfast';
  if (h < 14.5) return 'lunch';
  if (h < 17.5) return 'snack';
  return 'dinner';
}

// ── History ─────────────────────────────────────────────────────────────────

export interface HistoryItem {
  key: string;
  name: string;
  count: number;
  lastUsed: number;
  /** Last logged amount + macros. */
  grams?: number;
  per100g?: Per100g;
  macros: Macros;
  portion?: string;
  foodId?: string;
  mealType: MealType;
}

/** Your foods from logged meals, keyed by food id (or name), newest macros win. */
export function historyIndex(meals: MealEntry[]): Map<string, HistoryItem> {
  const idx = new Map<string, HistoryItem>();
  for (const m of meals ?? []) {
    if (m._deleted || /\(supplement\)$/.test(m.name)) continue;
    const key = m.foodId ?? `name:${fold(m.name).trim()}`;
    const ts = new Date(m.date).getTime();
    const prev = idx.get(key);
    const item: HistoryItem = {
      key, name: m.name, count: (prev?.count ?? 0) + 1, lastUsed: Math.max(ts, prev?.lastUsed ?? 0),
      grams: m.grams, per100g: m.per100g, portion: m.portion, foodId: m.foodId, mealType: m.mealType,
      macros: { calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat, fiber: m.fiber },
    };
    if (!prev || ts >= prev.lastUsed) idx.set(key, item);
    else prev.count = item.count;
  }
  return idx;
}

// ── Search ──────────────────────────────────────────────────────────────────

export interface FoodHit {
  key: string;
  name: string;
  subtitle?: string;
  source: 'custom' | 'recipe' | 'builtin' | 'history' | 'openfoodfacts';
  /** Gram-based foods: per-100 g + servings. */
  per100g?: Per100g;
  servings?: FoodServing[];
  foodId?: string;
  /** History entries without per-100 g: fixed macros for the logged portion. */
  fixed?: Macros & { portion?: string };
  /** Last amount you logged of this (grams), for one-tap re-logging. */
  lastGrams?: number;
  count?: number;
  score: number;
}

export function foodToHit(f: FoodItem & { nameEn?: string }, score = 0, history?: HistoryItem): FoodHit {
  return {
    key: f.id, name: f.name,
    subtitle: f.brand ?? (f.nameEn && f.nameEn !== f.name ? f.nameEn : undefined),
    source: f.kind === 'recipe' ? 'recipe' : f.source === 'builtin' ? 'builtin' : 'custom',
    per100g: f.per100g, servings: f.servings, foodId: f.id,
    lastGrams: history?.grams, count: history?.count, score,
  };
}

export function historyToHit(h: HistoryItem, score = 0): FoodHit {
  return {
    key: h.key, name: h.name, source: 'history',
    per100g: h.per100g, servings: h.grams ? [{ label: `${Math.round(h.grams)} g (last time)`, grams: h.grams }] : undefined,
    foodId: h.foodId, fixed: h.per100g ? undefined : { ...h.macros, portion: h.portion },
    lastGrams: h.grams, count: h.count, score,
  };
}

/**
 * Ranked search. Your own foods and recipes first, then things you've logged
 * (more often + more recent = higher), then the built-in library.
 */
export function searchFoods(
  query: string,
  opts: { customFoods?: FoodItem[]; history?: Map<string, HistoryItem>; limit?: number; now?: number },
): FoodHit[] {
  const q = query.trim();
  if (!q) return [];
  const now = opts.now ?? Date.now();
  const history = opts.history ?? new Map<string, HistoryItem>();
  const hits: FoodHit[] = [];
  const seen = new Set<string>();
  const freq = (h?: HistoryItem) => {
    if (!h) return 0;
    const recent = now - h.lastUsed < 14 * 864e5 ? 2 : 0;
    return Math.min(4, Math.log2(1 + h.count)) + recent;
  };

  for (const f of opts.customFoods ?? []) {
    if (f._deleted) continue;
    const s = matchScore(q, `${f.name} ${f.brand ?? ''} ${(f.tags ?? []).join(' ')}`);
    if (!s) continue;
    const h = history.get(f.id);
    hits.push(foodToHit(f, s + 6 + freq(h), h));
    seen.add(f.id);
  }
  for (const h of Array.from(history.values())) {
    if (h.foodId && seen.has(h.foodId)) continue;
    const s = matchScore(q, h.name);
    if (!s) continue;
    // Logged a builtin food? Show it as that food, with your last amount.
    const b = h.foodId ? BUILTIN_FOODS.find(x => x.id === h.foodId) : undefined;
    hits.push(b ? foodToHit(b, s + 3 + freq(h), h) : historyToHit(h, s + 3 + freq(h)));
    if (h.foodId) seen.add(h.foodId);
    seen.add(h.key);
  }
  for (const f of BUILTIN_FOODS) {
    if (seen.has(f.id)) continue;
    const s = matchScore(q, `${f.name} ${f.nameEn} ${f.keywords}`);
    if (!s) continue;
    // Exact name-word matches beat keyword-only matches.
    const nameBonus = matchScore(q, `${f.name} ${f.nameEn}`) > 0 ? 1 : 0;
    hits.push(foodToHit(f, s + nameBonus));
  }
  return hits.sort((a, b) => b.score - a.score || a.name.length - b.name.length).slice(0, opts.limit ?? 20);
}

/** Build a MealEntry from a hit + grams (or a fixed history portion × servings). */
export function entryFromHit(
  hit: FoodHit,
  amount: { grams?: number; servings?: number },
  date: Date,
  mealType: MealType,
): Omit<MealEntry, 'id'> {
  if (hit.per100g && amount.grams != null) {
    const m = macrosFor(hit.per100g, amount.grams);
    return {
      date, mealType, name: hit.name, ...m, grams: amount.grams, per100g: hit.per100g,
      portion: `${Math.round(amount.grams)} g`, foodId: hit.foodId,
      source: hit.source === 'history' ? 'history' : hit.source,
    };
  }
  const k = amount.servings ?? 1;
  const f = hit.fixed ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
  return {
    date, mealType, name: hit.name,
    calories: Math.round(f.calories * k), protein: r1(f.protein * k), carbs: r1(f.carbs * k), fat: r1(f.fat * k),
    ...(f.fiber != null ? { fiber: r1(f.fiber * k) } : {}),
    portion: k === 1 ? f.portion : `${k}× ${f.portion ?? 'portion'}`,
    foodId: hit.foodId, source: 'history',
  };
}
