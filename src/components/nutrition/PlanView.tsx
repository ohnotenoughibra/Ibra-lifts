'use client';

/**
 * Plan — the week ahead: each day's targets (training days carry more carbs),
 * a meal for every slot (auto-picked, swappable, pinned once you choose),
 * the shopping list for what's planned, the recipe book, and your own foods.
 */
import { useMemo, useState } from 'react';
import { RefreshCw, Pin, Check, ShoppingCart, BookOpen, Apple } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/lib/store';
import { resolveDailyTargets, DEFAULT_NUTRITION_PREFS } from '@/lib/nutrition-targets';
import { targetsInputFromState } from '@/lib/nutrition-state';
import { planSlots, suggestMeals, fitRecipe, shoppingList, entryFromFitted, type FittedMeal, type MealSlot } from '@/lib/meal-plan';
import { RECIPES, recipeFits } from '@/lib/recipes-at';
import { localDayKey } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useToast } from '../Toast';
import type { NutritionDay } from '@/hooks/useNutritionDay';
import { Chip, MacroLine, Section, fmt } from './ui';
import { RecipeSheet } from './Sheets';
import MyFoods from './MyFoods';

type Tab = 'week' | 'shop' | 'recipes' | 'mine';
const WD = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const wd = (dayKey: string) => WD[new Date(`${dayKey}T12:00:00`).getDay()];

interface PlannedSlot { slot: MealSlot; fit: FittedMeal | null; pinned: boolean; options: FittedMeal[] }

export default function PlanView({ day }: { day: NutritionDay }) {
  const [tab, setTab] = useState<Tab>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [selected, setSelected] = useState<string>(day.today);
  const [recipe, setRecipe] = useState<{ fit: FittedMeal; slot?: MealSlot; dayKey?: string } | null>(null);
  const { showToast } = useToast();

  const st = useAppStore(useShallow(s => ({
    user: s.user, macroTargets: s.macroTargets, activeDietPhase: s.activeDietPhase, nutritionPrefs: s.nutritionPrefs,
    bodyWeightLog: s.bodyWeightLog, bodyComposition: s.bodyComposition, meals: s.meals, workoutLogs: s.workoutLogs,
    trainingSessions: s.trainingSessions, currentMesocycle: s.currentMesocycle, competitions: s.competitions,
    weightCutPlans: s.weightCutPlans, latestWhoopData: s.latestWhoopData, illnessLogs: s.illnessLogs,
    mealPlan: s.mealPlan, setMealPick: s.setMealPick, toggleBought: s.toggleBought, clearBought: s.clearBought,
    addMeals: s.addMeals, undoMeals: s.undoMeals,
  })));
  const prefs = useMemo(() => ({ ...DEFAULT_NUTRITION_PREFS, ...(st.nutritionPrefs ?? {}) }), [st.nutritionPrefs]);
  const anchor = useMemo(() => {
    const d = new Date(`${day.today}T12:00:00`); d.setDate(d.getDate() + weekOffset * 7);
    return localDayKey(d);
  }, [day.today, weekOffset]);

  // Rolling 7 days from today (a calendar week is mostly in the past by Sunday).
  const week = useMemo(() => {
    const input = targetsInputFromState(st);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(`${anchor}T12:00:00`); d.setDate(d.getDate() + i);
      return resolveDailyTargets(input, localDayKey(d), day.today);
    });
  },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [anchor, day.today, st.user, st.macroTargets, st.activeDietPhase, st.nutritionPrefs, st.bodyWeightLog, st.meals, st.workoutLogs, st.trainingSessions, st.competitions, st.weightCutPlans]);

  /** Every upcoming day's slots with the pinned or best-fitting recipe. */
  const plan = useMemo(() => {
    const out = new Map<string, PlannedSlot[]>();
    week.forEach((t, i) => {
      const slots = planSlots(t, prefs);
      out.set(t.date, slots.map(slot => {
        const options = suggestMeals({ kind: slot.kind, protein: slot.protein, carbs: slot.carbs, fat: slot.fat }, prefs,
          { limit: 5, seed: i * 31 + Number(t.date.slice(-2)), recentMeals: day.recentMeals });
        const pickedId = st.mealPlan?.picks?.[`${t.date}|${slot.id}`];
        const pinnedRecipe = pickedId ? RECIPES.find(r => r.id === pickedId) : undefined;
        const fit = pinnedRecipe ? fitRecipe(pinnedRecipe, slot) : options[0] ?? null;
        return { slot, fit, pinned: !!pinnedRecipe, options };
      }));
    });
    return out;
  }, [week, prefs, st.mealPlan, day.recentMeals]);

  const upcomingDays = week.filter(t => t.date >= day.today).map(t => t.date);
  const [shopDays, setShopDays] = useState<string[] | null>(null);
  const chosenShopDays = shopDays ?? upcomingDays;
  const list = useMemo(() => shoppingList(chosenShopDays.flatMap(d => (plan.get(d) ?? []).map(p => p.fit).filter(Boolean) as FittedMeal[])),
    [chosenShopDays, plan]);

  const selectedPlan = plan.get(selected) ?? plan.get(upcomingDays[0] ?? week[0].date) ?? [];
  const selectedT = week.find(t => t.date === selected) ?? week[0];

  return (
    <div className="space-y-4 pb-28">
      <div className="grid grid-cols-4 gap-1 bg-grappler-800/60 p-1 rounded-xl">
        {([['week', 'Week', Pin], ['shop', 'Shopping', ShoppingCart], ['recipes', 'Recipes', BookOpen], ['mine', 'My foods', Apple]] as const).map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)} className={cn('flex flex-col items-center gap-0.5 py-2 rounded-lg text-[11px] font-medium min-h-[44px]', tab === k ? 'bg-grappler-700 text-grappler-50' : 'text-grappler-400')}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {tab === 'week' && (
        <>
          <div className="flex items-center justify-between">
            <button className="text-xs text-primary-400 min-h-[36px]" onClick={() => setWeekOffset(o => Math.max(0, o - 1))} disabled={weekOffset === 0}>{weekOffset > 0 ? '← Next 7 days' : ''}</button>
            <button className="text-xs text-primary-400 min-h-[36px]" onClick={() => setWeekOffset(o => o + 1)}>{weekOffset === 0 ? 'Following week →' : ''}</button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {week.map((t, i) => (
              <button key={t.date} onClick={() => setSelected(t.date)} disabled={t.date < day.today}
                className={cn('rounded-lg py-2 text-center border min-h-[64px]',
                  t.date === selectedT.date ? 'border-primary-500 bg-primary-500/10' : 'border-grappler-800 bg-grappler-800/40',
                  t.date < day.today && 'opacity-40')}>
                <p className="text-[10px] text-grappler-500">{i === 0 && weekOffset === 0 ? 'Today' : wd(t.date)}</p>
                <p className="text-xs font-semibold text-grappler-100 tabular-nums">{(t.calories / 1000).toLocaleString('de-AT', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}k</p>
                <p className={cn('text-[9px] truncate px-0.5', t.day.kind === 'rest' ? 'text-grappler-500' : 'text-green-400')}>{t.day.kind === 'rest' ? 'Rest' : t.day.kind === 'double' ? '2×' : t.day.kind === 'fight_week' ? 'Fight' : 'Train'}</p>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-grappler-500 -mt-2">kcal per day · training days get the carbs, the week averages your target</p>

          <Section title={`${selectedT.day.label} · ${fmt(selectedT.calories)} kcal · P ${selectedT.protein}`}>
            <div className="space-y-2">
              {selectedPlan.map(({ slot, fit, pinned, options }) => (
                <div key={slot.id} className="card p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] text-grappler-500 w-10 tabular-nums">{slot.time}</span>
                    <p className="text-xs font-semibold text-grappler-200 flex-1">{slot.label}</p>
                    <span className="text-[11px] text-grappler-500">{fmt(slot.calories)} kcal</span>
                  </div>
                  {fit ? (
                    <div className="flex items-center gap-2 pl-12">
                      <button className="flex-1 min-w-0 text-left" onClick={() => setRecipe({ fit, slot, dayKey: selectedT.date })}>
                        <span className="block text-sm text-grappler-100 truncate">{fit.recipe.name}</span>
                        <MacroLine m={fit.macros} className="block truncate" />
                      </button>
                      <button aria-label="Swap" className="w-9 h-9 flex items-center justify-center text-grappler-400" onClick={() => {
                        const i = options.findIndex(o => o.recipe.id === fit.recipe.id);
                        const next = options[(i + 1) % Math.max(1, options.length)];
                        if (next) st.setMealPick(selectedT.date, slot.id, next.recipe.id);
                      }}><RefreshCw className="w-3.5 h-3.5" /></button>
                      <button aria-label={pinned ? 'Unpin' : 'Pin'} className={cn('w-9 h-9 flex items-center justify-center', pinned ? 'text-primary-400' : 'text-grappler-500')}
                        onClick={() => st.setMealPick(selectedT.date, slot.id, pinned ? null : fit.recipe.id)}><Pin className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : <p className="pl-12 text-xs text-grappler-500">No recipe fits your filters — widen diet/dislikes in Coach.</p>}
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {tab === 'shop' && (
        <>
          <div className="flex flex-wrap gap-2">
            {week.filter(t => t.date >= day.today).map(t => {
              const on = chosenShopDays.includes(t.date);
              return <Chip key={t.date} active={on} onClick={() => setShopDays(on ? chosenShopDays.filter(d => d !== t.date) : [...chosenShopDays, t.date])}>
                {wd(t.date)} {t.date.slice(8)}.
              </Chip>;
            })}
          </div>
          {list.length === 0 && <p className="text-sm text-grappler-500">Nothing planned for these days.</p>}
          {list.map(group => (
            <Section key={group.aisle} title={group.aisle}>
              <div className="card divide-y divide-grappler-800">
                {group.items.map(it => {
                  const done = st.mealPlan?.bought?.includes(it.foodId);
                  return (
                    <button key={it.foodId} onClick={() => st.toggleBought(it.foodId)} className="w-full flex items-center gap-3 px-3 py-2.5 text-left min-h-[44px]">
                      <span className={cn('w-5 h-5 rounded border flex items-center justify-center', done ? 'bg-primary-500 border-primary-500' : 'border-grappler-600')}>
                        {done && <Check className="w-3.5 h-3.5 text-white" />}
                      </span>
                      <span className={cn('flex-1 text-sm', done ? 'text-grappler-500 line-through' : 'text-grappler-200')}>{it.name}</span>
                      <span className="text-xs text-grappler-400 tabular-nums">{it.grams >= 1000 ? `${(it.grams / 1000).toLocaleString('de-AT', { maximumFractionDigits: 1 })} kg` : `${fmt(it.grams)} g`}</span>
                    </button>
                  );
                })}
              </div>
            </Section>
          ))}
          {list.length > 0 && (
            <button className="text-xs text-grappler-400 min-h-[36px]" onClick={() => st.clearBought()}>Untick all</button>
          )}
        </>
      )}

      {tab === 'recipes' && <RecipeBook prefs={prefs} target={selectedT} onOpen={fit => setRecipe({ fit })} />}
      {tab === 'mine' && <MyFoods />}

      <RecipeSheet fit={recipe?.fit ?? null} open={!!recipe} onClose={() => setRecipe(null)} slotLabel={recipe?.slot?.label}
        onLog={() => {
          if (!recipe) return;
          const dk = recipe.dayKey ?? day.today;
          const when = dk === day.today ? new Date() : (() => { const d = new Date(`${dk}T12:00:00`); const [h, m] = (recipe.slot?.time ?? '12:00').split(':').map(Number); d.setHours(h, m); return d; })();
          const ids = st.addMeals([entryFromFitted(recipe.fit, when, recipe.slot?.mealType ?? 'lunch')]);
          showToast(`Logged ${recipe.fit.recipe.name}`, 'success', { label: 'Undo', onClick: () => st.undoMeals(ids) });
          setRecipe(null);
        }} />
    </div>
  );
}

function RecipeBook({ prefs, target, onOpen }: { prefs: typeof DEFAULT_NUTRITION_PREFS; target: { protein: number; carbs: number; fat: number }; onOpen: (f: FittedMeal) => void }) {
  const [kind, setKind] = useState<'all' | 'breakfast' | 'main' | 'snack' | 'pre' | 'post'>('all');
  const n = Math.max(3, prefs.mealsPerDay || 4);
  const perMeal = { protein: target.protein / n, carbs: target.carbs / n, fat: target.fat / n };
  const items = RECIPES
    .filter(r => recipeFits(r, prefs.diet ?? []))
    .filter(r => kind === 'all' || r.slots.includes(kind))
    .map(r => fitRecipe(r, r.slots.includes('pre') && !r.slots.includes('main') ? { protein: 8, carbs: 50, fat: 3 } : perMeal))
    .filter(Boolean) as FittedMeal[];
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {(['all', 'breakfast', 'main', 'snack', 'pre', 'post'] as const).map(k => (
          <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
            {k === 'all' ? 'All' : k === 'main' ? 'Mains' : k === 'pre' ? 'Pre-training' : k === 'post' ? 'After training' : k[0].toUpperCase() + k.slice(1)}
          </Chip>
        ))}
      </div>
      <p className="text-[11px] text-grappler-500">Scaled to an average meal of your day — open one to see grams.</p>
      <div className="space-y-2">
        {items.map(f => (
          <button key={f.recipe.id} onClick={() => onOpen(f)} className="w-full card p-3 text-left">
            <p className="text-sm text-grappler-100">{f.recipe.name}</p>
            <p className="text-[11px] text-grappler-500">{f.recipe.minutes || '<5'} min{f.recipe.mealPrep ? ' · meal prep' : ''} · <MacroLine m={f.macros} /></p>
          </button>
        ))}
      </div>
    </div>
  );
}
