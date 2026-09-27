'use client';

/** RecipeSheet (a fitted meal), WhySheet (where today's numbers come from), EntrySheet (edit a logged item). */
import { useState } from 'react';
import { Clock, Trash2, Copy } from 'lucide-react';
import type { FittedMeal } from '@/lib/meal-plan';
import type { DailyTargets } from '@/lib/nutrition-targets';
import type { MealEntry, MealType } from '@/lib/types';
import { macrosFor } from '@/lib/food-search';
import { Chip, MacroLine, MEAL_LABEL, Sheet, fmt, num } from './ui';

export function RecipeSheet({ fit, open, onClose, onLog, slotLabel }: {
  fit: FittedMeal | null; open: boolean; onClose: () => void; onLog: () => void; slotLabel?: string;
}) {
  if (!fit) return null;
  return (
    <Sheet open={open} onClose={onClose} title={fit.recipe.name}
      footer={<button className="btn btn-primary w-full min-h-[48px]" onClick={onLog}>Log{slotLabel ? ` as ${slotLabel}` : ''} · {fmt(fit.macros.calories)} kcal</button>}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-xs text-grappler-400">
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{fit.recipe.minutes || '<5'} min</span>
          {fit.recipe.mealPrep && <span className="px-1.5 py-0.5 rounded bg-grappler-800">meal prep</span>}
          <span className="text-grappler-500">{fit.recipe.nameEn}</span>
        </div>
        <MacroLine m={fit.macros} className="block text-sm" />
        <div>
          <p className="text-[11px] uppercase tracking-wide text-grappler-500 mb-1.5">Ingredients · scaled to your macros</p>
          <ul className="space-y-1">
            {fit.ingredients.map(i => (
              <li key={i.foodId} className="flex items-center justify-between text-sm">
                <span className="text-grappler-200">{i.name}</span>
                <span className="text-grappler-400 tabular-nums">{fmt(i.grams)} g</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-grappler-500 mb-1.5">How</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-grappler-300">
            {fit.recipe.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>
      </div>
    </Sheet>
  );
}

export function WhySheet({ t, open, onClose }: { t: DailyTargets; open: boolean; onClose: () => void }) {
  const e = t.expenditure;
  return (
    <Sheet open={open} onClose={onClose} title="Where today's numbers come from">
      <div className="space-y-4 text-sm">
        <div className="rounded-xl bg-grappler-800/50 p-3 space-y-1">
          <p className="text-grappler-100 font-semibold">{t.day.label}</p>
          <p className="text-grappler-400 text-xs">{fmt(t.calories)} kcal · P {t.protein} · C {t.carbs} · F {t.fat} · water {(t.waterMl / 1000).toLocaleString('de-AT')} l</p>
          <p className="text-grappler-500 text-xs">Your week's base: {fmt(t.base.calories)} kcal · P {t.base.protein} · C {t.base.carbs} · F {t.base.fat}</p>
        </div>
        <ul className="space-y-2">
          {t.reasons.map((r, i) => <li key={i} className="text-grappler-300 leading-snug">• {r}</li>)}
        </ul>
        {e && (
          <div className="rounded-xl border border-grappler-800 p-3 space-y-1 text-xs text-grappler-400">
            <p className="text-grappler-200 font-medium text-sm">Expenditure</p>
            <p>Formula (profile + training): {fmt(e.formulaKcal)} kcal</p>
            <p>Measured (intake vs weight trend): {e.measuredKcal ? `${fmt(e.measuredKcal)} kcal` : 'needs ~2 weeks of logging + weigh-ins'}</p>
            {e.trendKgPerWeek != null && <p>Weight trend: {e.trendKgPerWeek > 0 ? '+' : ''}{e.trendKgPerWeek.toLocaleString('de-AT')} kg/week</p>}
            <p>Confidence in the measurement: {Math.round(e.confidence * 100)} % ({e.loggedDays} full days, {e.weighIns} weigh-ins in the last 3 weeks)</p>
            <p className="text-grappler-500">Updates every Monday, so your targets don't jump around during the week.</p>
          </div>
        )}
      </div>
    </Sheet>
  );
}

const TYPES: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner', 'pre_workout', 'post_workout'];

export function EntrySheet({ entry, open, onClose, onSave, onDelete, onCopyToToday }: {
  entry: MealEntry | null; open: boolean; onClose: () => void;
  onSave: (updates: Partial<MealEntry>) => void; onDelete: () => void; onCopyToToday?: () => void;
}) {
  const [grams, setGrams] = useState('');
  const [macros, setMacros] = useState({ calories: '', protein: '', carbs: '', fat: '' });
  const [mt, setMt] = useState<MealType>('snack');
  const [loadedId, setLoadedId] = useState<string | null>(null);
  if (entry && entry.id !== loadedId) {
    setLoadedId(entry.id);
    setGrams(entry.grams ? String(entry.grams) : '');
    setMacros({ calories: String(entry.calories), protein: String(entry.protein), carbs: String(entry.carbs), fat: String(entry.fat) });
    setMt(entry.mealType);
  }
  if (!entry) return null;
  const scalable = !!entry.per100g;
  const preview = scalable && num(grams) > 0 ? macrosFor(entry.per100g!, num(grams)) : {
    calories: num(macros.calories), protein: num(macros.protein), carbs: num(macros.carbs), fat: num(macros.fat),
  };
  const save = () => {
    const updates: Partial<MealEntry> = { mealType: mt };
    if (scalable && num(grams) > 0) {
      Object.assign(updates, macrosFor(entry.per100g!, num(grams)), { grams: num(grams), portion: `${Math.round(num(grams))} g` });
    } else {
      Object.assign(updates, { calories: Math.round(num(macros.calories)), protein: num(macros.protein), carbs: num(macros.carbs), fat: num(macros.fat) });
    }
    onSave(updates);
  };
  return (
    <Sheet open={open} onClose={onClose} title={entry.name}
      footer={
        <div className="flex gap-2">
          <button className="btn btn-primary flex-1 min-h-[48px]" onClick={save}>Save</button>
          {onCopyToToday && <button className="btn btn-secondary min-h-[48px] px-3" onClick={onCopyToToday} aria-label="Log again today"><Copy className="w-4 h-4" /></button>}
          <button className="btn btn-secondary min-h-[48px] px-3 text-red-400" onClick={onDelete} aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
        </div>
      }>
      <div className="space-y-4">
        {scalable ? (
          <label className="flex items-center gap-2">
            <span className="text-sm text-grappler-400 w-16">Amount</span>
            <input inputMode="decimal" value={grams} onChange={e => setGrams(e.target.value)} aria-label="Grams"
              className="w-28 px-3 py-2 bg-grappler-800 border border-grappler-700 rounded-lg text-lg font-semibold text-grappler-100 text-center" />
            <span className="text-sm text-grappler-400">g</span>
          </label>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {(['calories', 'protein', 'carbs', 'fat'] as const).map(k => (
              <label key={k} className="block">
                <span className="text-[11px] text-grappler-500">{k === 'calories' ? 'kcal' : `${k[0].toUpperCase()}${k.slice(1)} g`}</span>
                <input inputMode="decimal" value={macros[k]} onChange={e => setMacros({ ...macros, [k]: e.target.value })}
                  className="w-full px-2 py-2 bg-grappler-800 border border-grappler-700 rounded-lg text-sm text-grappler-100" />
              </label>
            ))}
          </div>
        )}
        <MacroLine m={preview} className="block text-sm" />
        {entry.portion && !scalable && <p className="text-xs text-grappler-500">{entry.portion}</p>}
        <div className="flex flex-wrap gap-2">
          {TYPES.map(t => <Chip key={t} active={mt === t} onClick={() => setMt(t)}>{MEAL_LABEL[t]}</Chip>)}
        </div>
      </div>
    </Sheet>
  );
}
