/**
 * nutrition-ai — prompts + output schemas for Claude-powered logging and
 * meal ideas. Server-only (used by /api/nutrition/ai). The route does I/O;
 * everything here is pure so it can be tested without the API.
 *
 *   parse    "2 Semmeln mit Schinken und ein Kaffee" / a photo of the plate
 *            → items with grams + macros, grounded on our per-100 g table
 *   suggest  remaining macros + preferences → meals from Austrian
 *            supermarket food, with ingredients in grams
 */
import * as z from 'zod/v4';
import { searchFoods } from './food-search';
import type { DietaryRestriction } from './types';

export const AI_MODEL = 'claude-opus-5';

// ── Schemas ─────────────────────────────────────────────────────────────────

export const ParsedItemSchema = z.object({
  name: z.string().describe('Food name as the athlete would say it (German if they wrote German)'),
  grams: z.number().describe('Estimated edible amount in grams (ml for drinks)'),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  fiber: z.number(),
  confidence: z.enum(['high', 'medium', 'low']),
  note: z.string().describe('Short assumption, e.g. "assumed 1 medium Semmel (50 g)"; empty if none'),
});

export const ParseResultSchema = z.object({
  items: z.array(ParsedItemSchema),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout', 'unknown']),
  clarification: z.string().describe('One short question if the input is too vague to estimate; empty otherwise'),
});
export type ParseResult = z.infer<typeof ParseResultSchema>;

export const SuggestedMealSchema = z.object({
  name: z.string(),
  minutes: z.number(),
  ingredients: z.array(z.object({
    name: z.string(),
    grams: z.number(),
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
  })),
  steps: z.array(z.string()),
  why: z.string().describe('One line on why this fits the slot (timing / macros)'),
});
export const SuggestResultSchema = z.object({ meals: z.array(SuggestedMealSchema) });
export type SuggestResult = z.infer<typeof SuggestResultSchema>;

// ── Request validation ──────────────────────────────────────────────────────

export const ParseRequestSchema = z.object({
  mode: z.literal('parse'),
  text: z.string().max(600).optional(),
  image: z.object({
    mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    /** base64, ≤ ~5 MB decoded */
    data: z.string().max(7_000_000),
  }).optional(),
}).refine(r => (r.text && r.text.trim().length > 0) || r.image, { message: 'text or image required' });

export const SuggestRequestSchema = z.object({
  mode: z.literal('suggest'),
  slot: z.enum(['breakfast', 'main', 'snack', 'pre', 'post']),
  macros: z.object({ protein: z.number().min(0).max(300), carbs: z.number().min(0).max(600), fat: z.number().min(0).max(200) }),
  diet: z.array(z.enum(['halal', 'kosher', 'vegetarian', 'vegan', 'dairy_free', 'gluten_free'])).max(6).default([]),
  dislikes: z.array(z.string().max(40)).max(30).default([]),
  cookingTime: z.enum(['quick', 'normal', 'meal_prep']).default('normal'),
  recent: z.array(z.string().max(80)).max(20).default([]),
  note: z.string().max(200).optional(),
});

// ── Prompts ─────────────────────────────────────────────────────────────────

export const PARSE_SYSTEM = `You estimate nutrition for a combat athlete's food log (lives in Innsbruck, Austria).
Split the input into separate foods. For each, estimate the edible amount in grams and its calories, protein, carbs, fat and fiber.
Rules:
- Use the reference table (per 100 g) when a food matches; otherwise use standard nutrition tables (BLS / USDA) and typical Austrian portion sizes (Semmel ≈ 50 g, Krügerl = 500 ml, Achtel = 125 ml).
- Carbs exclude fiber (EU labelling). Macros must be consistent with calories (4/4/9, alcohol 7).
- For a photo, estimate portion size from the plate and visible items; name hidden oil/sauce as its own item when it is likely (e.g. "Bratfett").
- Prefer the athlete's wording for names. If they give an amount, use it exactly.
- If the input is not food or far too vague, return no items and one short clarification question.`;

export function referenceTable(text: string): string {
  const seen = new Set<string>();
  const rows: string[] = [];
  const chunks = text.split(/[,;+&\n]|\bund\b|\bmit\b|\band\b|\bwith\b/i).map(s => s.trim()).filter(Boolean);
  for (const chunk of [text, ...chunks]) {
    for (const hit of searchFoods(chunk, { limit: 4 })) {
      if (!hit.per100g || seen.has(hit.key)) continue;
      seen.add(hit.key);
      const p = hit.per100g;
      rows.push(`${hit.name}${hit.subtitle ? ` / ${hit.subtitle}` : ''}: ${p.calories} kcal, P ${p.protein}, C ${p.carbs}, F ${p.fat}, fiber ${p.fiber ?? 0}${hit.servings?.[0] ? ` (typical: ${hit.servings[0].label} = ${hit.servings[0].grams} g)` : ''}`);
      if (rows.length >= 20) break;
    }
    if (rows.length >= 20) break;
  }
  return rows.length ? rows.join('\n') : '(no close matches)';
}

export function parseUserText(text: string | undefined, hasImage: boolean): string {
  const t = (text ?? '').trim();
  const ref = referenceTable(t || 'mahlzeit');
  return [
    hasImage ? 'Estimate everything on this plate / in this photo.' : '',
    t ? `What I ate: ${t}` : '',
    '',
    'Reference table (per 100 g):',
    ref,
  ].filter(Boolean).join('\n');
}

const SLOT_TEXT: Record<string, string> = {
  breakfast: 'breakfast',
  main: 'a main meal (lunch or dinner)',
  snack: 'a snack (Jause)',
  pre: 'a pre-training snack 60–90 min before BJJ/MMA or lifting: fast carbs, low fat and fiber, easy on the stomach',
  post: 'the meal after training: protein + plenty of carbs',
};

export const SUGGEST_SYSTEM = `You plan meals for a combat athlete (MMA/BJJ + lifting) who lives in Innsbruck, Austria.
Suggest meals from food available at MPreis, Spar, Billa or Hofer, cooked at home. Tyrolean/Austrian dishes are welcome in a lean form.
Each meal lists ingredients with grams and per-ingredient macros; totals must land close to the requested macros (±10 %).
Respect the dietary restrictions and dislikes strictly. Names in German with Austrian words (Erdäpfel, Paradeiser, Topfen, Faschiertes).
Steps: short, practical, max 5.`;

export function suggestUserText(r: z.infer<typeof SuggestRequestSchema>): string {
  const diet = (r.diet as DietaryRestriction[]).length ? r.diet.join(', ') : 'none';
  return [
    `Suggest 3 different options for ${SLOT_TEXT[r.slot]}.`,
    `Target: ${Math.round(r.macros.protein)} g protein, ${Math.round(r.macros.carbs)} g carbs, ${Math.round(r.macros.fat)} g fat (~${Math.round(r.macros.protein * 4 + r.macros.carbs * 4 + r.macros.fat * 9)} kcal).`,
    `Dietary restrictions: ${diet}.`,
    `Dislikes: ${r.dislikes.length ? r.dislikes.join(', ') : 'none'}.`,
    `Cooking: ${r.cookingTime === 'quick' ? '≤ 15 minutes' : r.cookingTime === 'meal_prep' ? 'batch-cook friendly (keeps 3–4 days)' : 'normal weeknight'}.`,
    r.recent.length ? `Recently eaten (avoid repeating): ${r.recent.join('; ')}.` : '',
    r.note ? `Athlete's note: ${r.note}` : '',
  ].filter(Boolean).join('\n');
}

/** Clamp model numbers to sane, rounded values (and recompute kcal if macros disagree badly). */
export function sanitizeItems(items: ParseResult['items']): ParseResult['items'] {
  const r1 = (n: number) => Math.round(Math.max(0, Number(n) || 0) * 10) / 10;
  return items.slice(0, 20).map(i => {
    const protein = r1(i.protein), carbs = r1(i.carbs), fat = r1(i.fat), fiber = r1(i.fiber);
    const fromMacros = protein * 4 + carbs * 4 + fat * 9 + fiber * 2;
    let calories = Math.round(Math.max(0, Number(i.calories) || 0));
    // Keep alcohol-type gaps (kcal > macros) but never kcal far BELOW the macros.
    if (calories < fromMacros * 0.85) calories = Math.round(fromMacros);
    return { ...i, name: String(i.name).slice(0, 80), grams: Math.round(Math.max(0, Number(i.grams) || 0)), protein, carbs, fat, fiber, calories };
  }).filter(i => i.name && (i.calories > 0 || i.grams > 0));
}
