/**
 * Food search + gram maths (2026-09 nutrition rebuild).
 */
import { describe, it, expect } from 'vitest';
import {
  fold, matchScore, macrosFor, per100From, recipePer100g, parseAmount, mealTypeForHour,
  historyIndex, searchFoods, entryFromHit,
} from '@/lib/food-search';
import { BUILTIN_FOODS } from '@/lib/foods-at';
import type { FoodItem, MealEntry } from '@/lib/types';

describe('text', () => {
  it('folds umlauts, ß and ae/oe/ue spellings the same way', () => {
    expect(fold('Käsespätzle')).toBe(fold('Kaesespaetzle'));
    expect(fold('Erdäpfel')).toBe('erdapfel');
    expect(fold('Grieß')).toBe('griess');
  });
  it('word-prefix matching: "reis" is rice, not ice cream; "boiled" is not "oil"', () => {
    expect(matchScore('reis', 'Eis Vanille ice cream')).toBe(0);
    expect(matchScore('reis', 'Reis (gekocht) rice')).toBeGreaterThan(0);
    expect(matchScore('boiled', 'Olive oil')).toBe(0);
    // German compounds: "brust" inside "Hühnerbrust" counts (a weaker match than a prefix)
    expect(matchScore('hüh brust', 'Hühnerbrust (roh) chicken breast')).toBeGreaterThan(0);
    expect(matchScore('brust', 'Hühnerbrust')).toBeLessThan(matchScore('brust', 'Brust'));
    expect(matchScore('chicken breast', 'Hühnerbrust chicken breast')).toBeGreaterThan(0);
  });
});

describe('library', () => {
  it('every built-in food has sane per-100 g values and a default serving', () => {
    expect(BUILTIN_FOODS.length).toBeGreaterThan(150);
    const ids = new Set<string>();
    for (const f of BUILTIN_FOODS) {
      expect(ids.has(f.id), f.id).toBe(false);
      ids.add(f.id);
      const p = f.per100g;
      expect(p.protein + p.carbs + p.fat, f.name).toBeLessThanOrEqual(100.5);
      // kcal roughly match the macros (alcohol / fibre aside)
      // EU labels: carbs exclude fibre, which counts ~2 kcal/g
      const fromMacros = p.protein * 4 + p.carbs * 4 + p.fat * 9 + (p.fiber ?? 0) * 2;
      if (!f.tags?.includes('alcohol') && p.calories > 20) {
        expect(Math.abs(fromMacros - p.calories) / p.calories, f.name).toBeLessThan(0.2);
      }
      expect(f.servings.length, f.name).toBeGreaterThan(0);
      expect(f.servings[0].grams, f.name).toBeGreaterThan(0);
    }
  });
});

describe('gram maths', () => {
  it('scales per-100 g to any amount', () => {
    expect(macrosFor({ calories: 165, protein: 31, carbs: 0, fat: 3.6 }, 200)).toEqual({ calories: 330, protein: 62, carbs: 0, fat: 7.2 });
  });
  it('round-trips a logged amount back to per-100 g', () => {
    expect(per100From({ calories: 330, protein: 62, carbs: 0, fat: 7.2 }, 200)).toEqual({ calories: 165, protein: 31, carbs: 0, fat: 3.6 });
  });
  it('recipe per-100 g uses the cooked weight when given', () => {
    const ing = [
      { grams: 200, per100g: { calories: 350, protein: 7, carbs: 78, fat: 0.6 } }, // raw rice
      { grams: 400, per100g: { calories: 110, protein: 23.5, carbs: 0, fat: 1.5 } }, // raw chicken
    ];
    const raw = recipePer100g(ing);
    const cooked = recipePer100g(ing, 900); // rice absorbs water
    expect(raw.calories).toBe(Math.round((700 + 440) / 6));
    expect(cooked.calories).toBe(Math.round((700 + 440) / 9));
    expect(cooked.protein).toBeCloseTo((14 + 94) / 9, 1);
  });
  it('parses amounts as typed on a German keyboard', () => {
    expect(parseAmount('250')).toEqual({ value: 250, unit: 'g' });
    expect(parseAmount('250 g')).toEqual({ value: 250, unit: 'g' });
    expect(parseAmount('0,5 l')).toEqual({ value: 500, unit: 'ml' });
    expect(parseAmount('1,5x')).toEqual({ value: 1.5, unit: 'x' });
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('0')).toBeNull();
  });
  it('one meal-type rule', () => {
    expect(mealTypeForHour(7)).toBe('breakfast');
    expect(mealTypeForHour(12)).toBe('lunch');
    expect(mealTypeForHour(16)).toBe('snack');
    expect(mealTypeForHour(19)).toBe('dinner');
  });
});

describe('searchFoods', () => {
  const now = Date.parse('2026-09-27T12:00:00Z');
  const meal = (name: string, daysAgo: number, f: Partial<MealEntry> = {}): MealEntry => ({
    id: `${name}-${daysAgo}`, date: new Date(now - daysAgo * 864e5), mealType: 'lunch', name,
    calories: 300, protein: 30, carbs: 20, fat: 10, ...f,
  });

  it('finds German and English names; Reis first for "reis"', () => {
    const r = searchFoods('reis', { now });
    expect(r[0].name).toMatch(/^Reis/);
    expect(r.some(h => /eis/i.test(h.name) && !/reis/i.test(h.name))).toBe(false);
    expect(searchFoods('chicken breast', { now })[0].name).toMatch(/Hühnerbrust/);
    expect(searchFoods('topfen', { now })[0].name).toMatch(/topfen/i);
  });

  it('your custom foods rank above the library', () => {
    const custom: FoodItem = {
      id: 'c1', kind: 'food', name: 'Reis-Bowl vom Spar', per100g: { calories: 150, protein: 8, carbs: 22, fat: 3 },
      servings: [{ label: '1 Bowl', grams: 400 }], source: 'custom', createdAt: '2026-09-01',
    };
    expect(searchFoods('reis', { customFoods: [custom], now })[0].key).toBe('c1');
  });

  it('things you log often and recently rank higher, and remember your amount', () => {
    const history = historyIndex([
      meal('Hühnerbrust (gegart)', 1, { foodId: 'at:chicken-breast-cooked', grams: 180, per100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6 } }),
      meal('Hühnerbrust (gegart)', 2, { foodId: 'at:chicken-breast-cooked', grams: 180, per100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6 } }),
    ]);
    const r = searchFoods('huhn', { history, now });
    expect(r[0].foodId).toBe('at:chicken-breast-cooked');
    expect(r[0].lastGrams).toBe(180);
    expect(r[0].count).toBe(2);
  });

  it('history entries without per-100 g log their fixed portion', () => {
    const history = historyIndex([meal('Mamas Gulasch', 3, { portion: '1 Teller' })]);
    const [hit] = searchFoods('gulasch', { history, now });
    expect(hit.source).toBe('history');
    const e = entryFromHit(hit, { servings: 1.5 }, new Date(now), 'dinner');
    expect(e).toMatchObject({ calories: 450, protein: 45, portion: '1.5× 1 Teller' });
  });

  it('gram-based entries carry grams + per-100 g so an edit can rescale', () => {
    const [hit] = searchFoods('magertopfen', { now });
    const e = entryFromHit(hit, { grams: 250 }, new Date(now), 'snack');
    expect(e).toMatchObject({ grams: 250, calories: 168, protein: 30, portion: '250 g', source: 'builtin' });
    expect(e.per100g?.protein).toBe(12);
  });

  it('supplement auto-logs and deleted meals stay out of history', () => {
    const idx = historyIndex([meal('Creatine (supplement)', 1), meal('Gone', 1, { _deleted: true })]);
    expect(idx.size).toBe(0);
  });
});

describe('how people actually type', () => {
  it('ignores amounts and filler words, understands plurals', () => {
    expect(searchFoods('2 Semmeln', {})[0].name).toBe('Kaisersemmel');
    expect(searchFoods('3 Eier', {})[0].name).toBe('Ei');
    expect(searchFoods('200g nudeln', {})[0].name).toMatch(/Nudeln/);
    expect(searchFoods('ein Krügerl Bier', {})[0].name).toMatch(/Bier/);
  });
});
