/**
 * Meal slots, recipe fitting and suggestions (2026-09 nutrition rebuild).
 */
import { describe, it, expect } from 'vitest';
import { planSlots, redistribute, fitRecipe, suggestMeals, shoppingList, entryFromFitted } from '@/lib/meal-plan';
import { RECIPES, recipeFits } from '@/lib/recipes-at';
import { builtinFood } from '@/lib/foods-at';
import { DEFAULT_NUTRITION_PREFS } from '@/lib/nutrition-targets';
import type { MealEntry, NutritionPrefs } from '@/lib/types';

const prefs = (over: Partial<NutritionPrefs> = {}): NutritionPrefs => ({ ...DEFAULT_NUTRITION_PREFS, ...over });
const day = (kind: string) => ({ calories: 0, protein: 180, carbs: 300, fat: 75, day: { kind } }) as never;

describe('recipe library', () => {
  it('every ingredient exists in the food library', () => {
    for (const r of RECIPES) for (const [id] of r.ingredients) expect(builtinFood(`at:${id}`), `${r.id}: ${id}`).toBeTruthy();
  });
  it('diet flags come from ingredients', () => {
    const byId = (id: string) => RECIPES.find(r => r.id === id)!;
    expect(recipeFits(byId('lentil-dal'), ['vegan'])).toBe(true);
    expect(recipeFits(byId('tofu-stirfry'), ['vegan', 'gluten_free'])).toBe(true);
    expect(recipeFits(byId('fit-groestl'), ['halal'])).toBe(false);   // pork
    expect(recipeFits(byId('chicken-rice-bowl'), ['halal', 'gluten_free', 'dairy_free'])).toBe(true);
    expect(recipeFits(byId('overnight-oats'), ['gluten_free'])).toBe(false);
    expect(recipeFits(byId('couscous-feta'), ['vegetarian'])).toBe(true);
  });
});

describe('planSlots', () => {
  it('splits the day and the slots add back up to the day', () => {
    const slots = planSlots(day('double'), prefs({ mealsPerDay: 4, trainingTime: 'evening' }));
    expect(slots.map(s => s.id)).toEqual(['breakfast', 'lunch', 'pre', 'dinner']);
    const sum = slots.reduce((s, x) => ({ p: s.p + x.protein, c: s.c + x.carbs, f: s.f + x.fat }), { p: 0, c: 0, f: 0 });
    expect(Math.abs(sum.p - 180)).toBeLessThanOrEqual(2);
    expect(Math.abs(sum.c - 300)).toBeLessThanOrEqual(2);
    expect(Math.abs(sum.f - 75)).toBeLessThanOrEqual(2);
  });
  it('fuel around training: pre is carb-heavy and low fat, post has the most carbs', () => {
    const slots = planSlots(day('lift'), prefs({ mealsPerDay: 5, trainingTime: 'evening' }));
    const pre = slots.find(s => s.id === 'pre')!;
    const post = slots.find(s => s.kind === 'post')!;
    const bf = slots.find(s => s.id === 'breakfast')!;
    expect(pre.fat).toBeLessThan(bf.fat / 3);
    expect(pre.carbs / pre.calories).toBeGreaterThan(bf.carbs / bf.calories);
    expect(post.carbs).toBe(Math.max(...slots.map(s => s.carbs)));
    expect(post.time).toBe('20:30');
  });
  it('rest day: no pre/post slots; meals-per-day respected (3–6)', () => {
    expect(planSlots(day('rest'), prefs({ mealsPerDay: 3 })).map(s => s.id)).toEqual(['breakfast', 'lunch', 'dinner']);
    expect(planSlots(day('rest'), prefs({ mealsPerDay: 5 })).length).toBe(5);
    expect(planSlots(day('lift'), prefs({ mealsPerDay: 6, trainingTime: 'morning' }))[0].id).toBe('pre');
  });
});

describe('redistribute', () => {
  it('spreads what is left over the meals still to come', () => {
    const slots = planSlots(day('lift'), prefs({ mealsPerDay: 4, trainingTime: 'evening' }));
    const bigBreakfast: MealEntry = { id: 'm', date: new Date(), mealType: 'breakfast', name: 'x', calories: 1200, protein: 90, carbs: 120, fat: 40 };
    const st = redistribute(slots, [bigBreakfast], '09:00');
    expect(st[0]).toMatchObject({ id: 'breakfast', done: true });
    const upcoming = st.filter(s => !s.done);
    const left = upcoming.reduce((s, x) => s + x.remaining.protein, 0);
    expect(Math.abs(left - (180 - 90))).toBeLessThanOrEqual(2);
    expect(st[0].remaining.protein).toBe(0);
  });
});

describe('fitRecipe', () => {
  it('scales protein / carb / fat parts to land on the slot', () => {
    const bowl = RECIPES.find(r => r.id === 'chicken-rice-bowl')!;
    const fit = fitRecipe(bowl, { protein: 55, carbs: 90, fat: 18 })!;
    expect(Math.abs(fit.macros.protein - 55)).toBeLessThanOrEqual(5);
    expect(Math.abs(fit.macros.carbs - 90)).toBeLessThanOrEqual(8);
    expect(Math.abs(fit.macros.fat - 18)).toBeLessThanOrEqual(4);
    expect(fit.error).toBeLessThan(0.08);
    const broccoli = fit.ingredients.find(i => i.foodId === 'broccoli')!;
    expect(broccoli.grams).toBe(200); // veg fixed
  });
  it('rounds to shoppable amounts (whole eggs, 5 g steps)', () => {
    const eggs = RECIPES.find(r => r.id === 'scrambled-eggs-bread')!;
    const fit = fitRecipe(eggs, { protein: 45, carbs: 50, fat: 25 })!;
    const egg = fit.ingredients.find(i => i.foodId === 'egg')!;
    expect(egg.grams % 55).toBe(0);
    for (const i of fit.ingredients) if (i.grams >= 20 && !['egg', 'egg-white'].includes(i.foodId)) expect(i.grams % 5).toBe(0);
  });
});

describe('suggestMeals', () => {
  it('returns fitting recipes for the slot kind, honouring diet and dislikes', () => {
    const s = suggestMeals({ kind: 'main', protein: 50, carbs: 80, fat: 20 }, prefs({ diet: ['vegan'] }));
    expect(s.length).toBeGreaterThan(0);
    for (const f of s) expect(recipeFits(f.recipe, ['vegan'])).toBe(true);
    const noFish = suggestMeals({ kind: 'main', protein: 50, carbs: 80, fat: 20 }, prefs({ dislikes: ['lachs', 'thunfisch', 'forelle'] }), { limit: 30 });
    expect(noFish.some(f => /lachs|thunfisch|forelle/i.test(f.recipe.name))).toBe(false);
  });
  it('pre-training suggestions are fast carbs', () => {
    const s = suggestMeals({ kind: 'pre', protein: 8, carbs: 60, fat: 3 }, prefs());
    for (const f of s) expect(f.recipe.slots).toContain('pre');
    expect(s[0].macros.fat).toBeLessThan(8);
  });
  it('avoids what you just ate', () => {
    const first = suggestMeals({ kind: 'main', protein: 50, carbs: 80, fat: 20 }, prefs(), { limit: 1 })[0];
    const recent: MealEntry[] = [{ id: 'r', date: new Date(), mealType: 'lunch', name: first.recipe.name, calories: 0, protein: 0, carbs: 0, fat: 0, foodId: `recipe:${first.recipe.id}` }];
    const next = suggestMeals({ kind: 'main', protein: 50, carbs: 80, fat: 20 }, prefs(), { limit: 1, recentMeals: recent })[0];
    expect(next.recipe.id).not.toBe(first.recipe.id);
  });
});

describe('shopping list + logging', () => {
  it('sums ingredients across meals by aisle', () => {
    const bowl = RECIPES.find(r => r.id === 'chicken-rice-bowl')!;
    const a = fitRecipe(bowl, { protein: 50, carbs: 80, fat: 18 })!;
    const list = shoppingList([a, a]);
    const meat = list.find(g => g.aisle === 'Fleisch & Fisch')!;
    const chicken = meat.items.find(i => i.foodId === 'chicken-breast-raw')!;
    expect(chicken.grams).toBe(a.ingredients.find(i => i.foodId === 'chicken-breast-raw')!.grams * 2);
    expect(list[0].aisle).toBe('Obst & Gemüse');
  });
  it('a fitted meal logs as one entry with per-100 g of the dish', () => {
    const bowl = RECIPES.find(r => r.id === 'chicken-rice-bowl')!;
    const fit = fitRecipe(bowl, { protein: 50, carbs: 80, fat: 18 })!;
    const e = entryFromFitted(fit, new Date(), 'lunch');
    expect(e).toMatchObject({ foodId: 'recipe:chicken-rice-bowl', source: 'recipe', calories: fit.macros.calories });
    expect(e.grams).toBe(fit.ingredients.reduce((s, i) => s + i.grams, 0));
    expect(e.portion).toMatch(/g Hühnerbrust/);
  });
});
