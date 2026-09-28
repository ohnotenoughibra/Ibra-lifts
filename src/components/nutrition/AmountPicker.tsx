'use client';

/**
 * Pick how much: serving chips (the food's servings + what you logged last
 * time) or type grams; live macros; meal slot. Works for gram-based foods and
 * for fixed history portions (×servings).
 */
import { useMemo, useState } from 'react';
import { macrosFor, entryFromHit, type FoodHit } from '@/lib/food-search';
import type { MealEntry, MealType } from '@/lib/types';
import { Chip, MacroLine, MEAL_LABEL, num } from './ui';

const TYPES: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner', 'pre_workout', 'post_workout'];

export default function AmountPicker({ hit, date, defaultMealType, onLog, onSaveFood }: {
  hit: FoodHit;
  date: Date;
  defaultMealType: MealType;
  onLog: (entry: Omit<MealEntry, 'id'>) => void;
  /** Offered for OpenFoodFacts products: keep it in "My foods". */
  onSaveFood?: () => void;
}) {
  const servings = useMemo(() => {
    const list = [...(hit.servings ?? [])];
    if (hit.lastGrams && !list.some(s => Math.abs(s.grams - hit.lastGrams!) < 1)) {
      list.unshift({ label: `${Math.round(hit.lastGrams)} g · last time`, grams: hit.lastGrams });
    }
    return list;
  }, [hit]);
  const gramBased = !!hit.per100g;
  const [grams, setGrams] = useState<string>(String(Math.round(hit.lastGrams ?? servings[0]?.grams ?? 100)));
  const [mult, setMult] = useState<number>(1);
  const [mealType, setMealType] = useState<MealType>(defaultMealType);

  const g = num(grams);
  const preview = gramBased
    ? macrosFor(hit.per100g!, g)
    : { calories: (hit.fixed?.calories ?? 0) * mult, protein: (hit.fixed?.protein ?? 0) * mult, carbs: (hit.fixed?.carbs ?? 0) * mult, fat: (hit.fixed?.fat ?? 0) * mult };
  const valid = gramBased ? g > 0 && g <= 5000 : mult > 0;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-grappler-100">{hit.name}</p>
        {hit.subtitle && <p className="text-xs text-grappler-500">{hit.subtitle}</p>}
        {gramBased && hit.per100g && (
          <p className="text-[11px] text-grappler-500 mt-0.5">per 100 g: {hit.per100g.calories} kcal · P {hit.per100g.protein} · C {hit.per100g.carbs} · F {hit.per100g.fat}</p>
        )}
      </div>

      {gramBased ? (
        <>
          <div className="flex flex-wrap gap-2">
            {servings.map(s => (
              <Chip key={`${s.label}-${s.grams}`} active={Math.abs(num(grams) - s.grams) < 0.5} onClick={() => setGrams(String(Math.round(s.grams)))}>
                {s.label}{/g/.test(s.label) ? '' : ` · ${Math.round(s.grams)} g`}
              </Chip>
            ))}
          </div>
          <label className="flex items-center gap-2">
            <input
              aria-label="Amount in grams" inputMode="decimal" enterKeyHint="done" value={grams}
              onChange={e => setGrams(e.target.value.replace(/[^\d.,]/g, ''))}
              className="w-28 px-3 py-2 bg-grappler-800 border border-grappler-700 rounded-lg text-lg font-semibold text-grappler-100 text-center tabular-nums"
            />
            <span className="text-sm text-grappler-400">g</span>
          </label>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          {[0.5, 1, 1.5, 2].map(m => <Chip key={m} active={mult === m} onClick={() => setMult(m)}>{m}× {hit.fixed?.portion ?? 'portion'}</Chip>)}
        </div>
      )}

      <MacroLine m={preview} className="block text-sm" />

      <div className="flex flex-wrap gap-2">
        {TYPES.map(t => <Chip key={t} active={mealType === t} onClick={() => setMealType(t)}>{MEAL_LABEL[t]}</Chip>)}
      </div>

      <div className="flex gap-2">
        <button disabled={!valid} onClick={() => onLog(entryFromHit(hit, gramBased ? { grams: g } : { servings: mult }, date, mealType))}
          className="btn btn-primary flex-1 min-h-[48px] disabled:opacity-40">
          Log {gramBased ? `${Math.round(g)} g` : ''}
        </button>
        {onSaveFood && (
          <button onClick={onSaveFood} className="btn btn-secondary min-h-[48px] px-3 text-xs">Save to my foods</button>
        )}
      </div>
    </div>
  );
}
