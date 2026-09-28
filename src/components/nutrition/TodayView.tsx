'use client';

/**
 * Today — one scroll: how much is left, why the numbers are what they are,
 * and the day as meals (planned around your training, already-eaten items in
 * place, a scaled recipe suggestion for every meal still to come).
 */
import { useMemo, useState } from 'react';
import { Plus, Minus, Droplets, ChevronRight, RefreshCw, Swords, Info, Copy, UserCog } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useToast } from '../Toast';
import { suggestMeals, slotIdForMeal, entryFromFitted, type FittedMeal, type SlotStatus } from '@/lib/meal-plan';
import type { MealEntry, MealType } from '@/lib/types';
import type { NutritionDay } from '@/hooks/useNutritionDay';
import { cn } from '@/lib/utils';
import { Ring, MacroBar, MacroLine, MACRO_COLOR, Section, fmt } from './ui';
import { RecipeSheet, WhySheet, EntrySheet } from './Sheets';

export default function TodayView({ day, onLog, onOpenSettings }: {
  day: NutritionDay;
  onLog: (mealType: MealType, when: Date) => void;
  onOpenSettings: () => void;
}) {
  const { targets: t, totals, remaining } = day;
  const updateMeal = useAppStore(s => s.updateMeal);
  const deleteMeal = useAppStore(s => s.deleteMeal);
  const restoreMeal = useAppStore(s => s.restoreMeal);
  const addMeals = useAppStore(s => s.addMeals);
  const undoMeals = useAppStore(s => s.undoMeals);
  const copyYesterdayMeals = useAppStore(s => s.copyYesterdayMeals);
  const setWaterGlasses = useAppStore(s => s.setWaterGlasses);
  const { showToast } = useToast();

  const [why, setWhy] = useState(false);
  const [recipe, setRecipe] = useState<{ fit: FittedMeal; slot: SlotStatus } | null>(null);
  const [editing, setEditing] = useState<MealEntry | null>(null);
  const [swap, setSwap] = useState<Record<string, number>>({});

  const seed = useMemo(() => Number(day.dayKey.replace(/-/g, '')) % 1000, [day.dayKey]);
  const bySlot = useMemo(() => {
    const m = new Map<string, MealEntry[]>();
    for (const e of day.meals) {
      const id = slotIdForMeal(day.slots, e);
      if (id) m.set(id, [...(m.get(id) ?? []), e]);
    }
    return m;
  }, [day.meals, day.slots]);

  const yesterdayHasMeals = useMemo(() => {
    const d = new Date(`${day.dayKey}T12:00:00`); d.setDate(d.getDate() - 1);
    const y = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return day.allMeals.some(m => {
      const md = new Date(m.date);
      return `${md.getFullYear()}-${String(md.getMonth() + 1).padStart(2, '0')}-${String(md.getDate()).padStart(2, '0')}` === y && !/\(supplement\)$/.test(m.name);
    });
  }, [day.allMeals, day.dayKey]);

  const whenFor = (slot: SlotStatus): Date => {
    if (day.isToday) return new Date();
    const [h, m] = slot.time.split(':').map(Number);
    const d = new Date(`${day.dayKey}T12:00:00`); d.setHours(h, m, 0, 0);
    return d;
  };

  const logged = (ids: string[], label: string) =>
    showToast(`Logged ${label}`, 'success', { label: 'Undo', onClick: () => undoMeals(ids) });

  const waterTargetGlasses = Math.max(1, Math.round(t.waterMl / 250));
  const waterL = (day.waterGlasses * 0.25).toLocaleString('de-AT');
  const kcalLeft = t.calories - totals.calories;

  return (
    <div className="space-y-5 pb-28">
      {/* ── Hero ── */}
      <div className="card p-4">
        <div className="flex items-center gap-4">
          <Ring value={totals.calories} target={t.calories} size={132}
            label={kcalLeft >= 0 ? fmt(kcalLeft) : `+${fmt(-kcalLeft)}`} sub={kcalLeft >= 0 ? 'kcal left' : 'kcal over'} />
          <div className="flex-1 min-w-0 space-y-2.5">
            <div>
              <p className="text-2xl font-bold tabular-nums" style={{ color: MACRO_COLOR.protein }}>{fmt(remaining.protein)} g</p>
              <p className="text-xs text-grappler-400">protein to go · {fmt(totals.protein)}/{fmt(t.protein)} g</p>
            </div>
            <MacroBar name="Carbs" value={totals.carbs} target={t.carbs} color={MACRO_COLOR.carbs} />
            <MacroBar name="Fat" value={totals.fat} target={t.fat} color={MACRO_COLOR.fat} />
          </div>
        </div>
        <button onClick={() => setWhy(true)} className="mt-3 w-full flex items-center gap-2 rounded-lg bg-grappler-800/60 px-3 py-2 text-left min-h-[44px]">
          <span className={cn('w-2 h-2 rounded-full flex-shrink-0',
            t.day.kind === 'rest' ? 'bg-grappler-500' : t.day.kind === 'fight_week' || t.day.kind === 'weigh_in' ? 'bg-red-400' : 'bg-green-400')} />
          <span className="text-xs text-grappler-200 flex-1 truncate">
            {t.day.label}{t.day.planned ? ' (planned)' : ''} · {fmt(t.calories)} kcal
            {t.mode === 'adaptive' && t.expenditure?.source !== 'formula' ? ' · measured' : ''}
            {t.mode === 'fixed' ? ' · fixed' : ''}
          </span>
          <Info className="w-3.5 h-3.5 text-grappler-500" />
        </button>
      </div>

      {t.mode === 'setup' && (
        <button onClick={onOpenSettings} className="w-full card p-3 flex items-center gap-3 text-left border border-amber-500/30">
          <UserCog className="w-5 h-5 text-amber-300 flex-shrink-0" />
          <span className="text-xs text-grappler-200 flex-1">Add your {t.missing.join(', ')} so targets are built on you (and learn from your logging).</span>
          <ChevronRight className="w-4 h-4 text-grappler-500" />
        </button>
      )}

      {/* ── Fight week ── */}
      {t.fightWeek && (
        <div className="card p-4 border border-red-500/30 space-y-2">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-red-400" />
            <p className="text-sm font-semibold text-grappler-100">{t.fightWeek.competitionName}</p>
            <span className="ml-auto text-xs text-grappler-400">
              {t.fightWeek.daysToCompetition === 0 ? 'today' : `in ${t.fightWeek.daysToCompetition} d`}
            </span>
          </div>
          {t.fightWeek.notes.map((n, i) => <p key={i} className="text-xs text-grappler-300">{n}</p>)}
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Water" value={`${(t.waterMl / 1000).toLocaleString('de-AT')} l`} />
            <Stat label="Sodium" value={t.sodiumMg != null ? `${fmt(t.sodiumMg)} mg` : 'normal'} />
            <Stat label="Fiber max" value={t.fiberMaxG != null ? `${t.fiberMaxG} g` : '—'} />
          </div>
        </div>
      )}

      {/* ── Water ── */}
      <div className="card p-3 flex items-center gap-3">
        <Droplets className="w-5 h-5 text-sky-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-grappler-100 font-medium tabular-nums">{waterL} / {(t.waterMl / 1000).toLocaleString('de-AT')} l</p>
          <div className="mt-1 h-1.5 bg-grappler-800 rounded-full overflow-hidden">
            <div className="h-full bg-sky-400 rounded-full transition-all" style={{ width: `${Math.min(100, (day.waterGlasses / waterTargetGlasses) * 100)}%` }} />
          </div>
        </div>
        <button aria-label="Remove a glass" onClick={() => setWaterGlasses(day.dayKey, Math.max(0, day.waterGlasses - 1))}
          className="w-11 h-11 rounded-lg bg-grappler-800 flex items-center justify-center text-grappler-300"><Minus className="w-4 h-4" /></button>
        <button aria-label="Add a glass (250 ml)" onClick={() => setWaterGlasses(day.dayKey, day.waterGlasses + 1)}
          className="w-11 h-11 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-300"><Plus className="w-4 h-4" /></button>
      </div>

      {/* ── Meals ── */}
      <Section title="Your day"
        action={day.meals.length === 0 && yesterdayHasMeals ? (
          <button className="text-xs text-primary-400 flex items-center gap-1 min-h-[36px]" onClick={() => {
            const ids = copyYesterdayMeals(day.dayKey);
            if (ids.length) showToast(`Copied ${ids.length} items from yesterday`, 'success', { label: 'Undo', onClick: () => undoMeals(ids) });
          }}><Copy className="w-3.5 h-3.5" /> Same as yesterday</button>
        ) : undefined}>
        <div className="space-y-2">
          {day.slots.map(slot => {
            const entries = bySlot.get(slot.id) ?? [];
            const target = slot.done ? { calories: slot.calories, protein: slot.protein, carbs: slot.carbs, fat: slot.fat } : slot.remaining;
            const showSuggestion = !slot.done && !day.isPast && target.calories > 120;
            const options = showSuggestion ? suggestMeals({ kind: slot.kind, ...target }, day.prefs, { recentMeals: day.recentMeals, limit: 4, seed }) : [];
            const pick = options.length ? options[(swap[slot.id] ?? 0) % options.length] : null;
            return (
              <div key={slot.id} className={cn('card p-3 space-y-2', slot.done && 'opacity-95')}>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] tabular-nums text-grappler-500 w-10">{slot.time}</span>
                  <p className="text-sm font-semibold text-grappler-100 flex-1 truncate">{slot.label}</p>
                  <span className="text-[11px] text-grappler-500 tabular-nums">
                    {slot.done ? `${fmt(slot.eaten.calories)} kcal` : `${fmt(target.calories)} kcal · P ${fmt(target.protein)}`}
                  </span>
                  <button aria-label={`Add to ${slot.label}`} onClick={() => onLog(slot.mealType, whenFor(slot))}
                    className="w-9 h-9 rounded-lg bg-grappler-800 flex items-center justify-center text-primary-400"><Plus className="w-4 h-4" /></button>
                </div>
                {entries.map(e => (
                  <button key={e.id} onClick={() => setEditing(e)} className="w-full flex items-center gap-2 pl-12 text-left min-h-[40px]">
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-grappler-200 truncate">{e.name}</span>
                      <span className="block text-[11px] text-grappler-500 truncate">{e.portion ?? ''}</span>
                    </span>
                    <span className="text-xs text-grappler-400 tabular-nums">{fmt(e.calories)} · P {fmt(e.protein)}</span>
                  </button>
                ))}
                {pick && (
                  <div className="ml-12 rounded-lg bg-grappler-800/50 p-2.5 flex items-center gap-2">
                    <button className="flex-1 min-w-0 text-left" onClick={() => setRecipe({ fit: pick, slot })}>
                      <span className="block text-xs text-grappler-100 truncate">{pick.recipe.name}</span>
                      <span className="block text-[11px] text-grappler-500 truncate">
                        {pick.ingredients.filter(i => i.role !== 'v').slice(0, 3).map(i => `${i.grams} g ${i.name.split(' (')[0]}`).join(' · ')}
                      </span>
                    </button>
                    {options.length > 1 && (
                      <button aria-label="Another idea" onClick={() => setSwap({ ...swap, [slot.id]: (swap[slot.id] ?? 0) + 1 })}
                        className="w-9 h-9 flex items-center justify-center text-grappler-400"><RefreshCw className="w-3.5 h-3.5" /></button>
                    )}
                    <button onClick={() => {
                      const ids = addMeals([entryFromFitted(pick, whenFor(slot), slot.mealType)]);
                      logged(ids, pick.recipe.name);
                    }} className="px-3 min-h-[36px] rounded-lg bg-primary-500/20 text-primary-300 text-xs font-medium">Log</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {totals.fiber > 0 && (
        <p className="text-[11px] text-grappler-500 text-center">Fiber logged: {fmt(totals.fiber)} g{t.fiberMaxG != null ? ` (keep under ${t.fiberMaxG} g today)` : ''}</p>
      )}

      <WhySheet t={t} open={why} onClose={() => setWhy(false)} />
      <RecipeSheet fit={recipe?.fit ?? null} open={!!recipe} onClose={() => setRecipe(null)} slotLabel={recipe?.slot.label}
        onLog={() => {
          if (!recipe) return;
          const ids = addMeals([entryFromFitted(recipe.fit, whenFor(recipe.slot), recipe.slot.mealType)]);
          logged(ids, recipe.fit.recipe.name);
          setRecipe(null);
        }} />
      <EntrySheet entry={editing} open={!!editing} onClose={() => setEditing(null)}
        onSave={u => { if (editing) updateMeal(editing.id, u); setEditing(null); }}
        onDelete={() => {
          if (!editing) return;
          const id = editing.id;
          deleteMeal(id);
          setEditing(null);
          showToast(`Deleted ${editing.name}`, 'info', { label: 'Undo', onClick: () => restoreMeal(id) });
        }}
        onCopyToToday={!day.isToday && editing ? () => {
          const { id: _id, date: _d, updatedAt: _u, ...rest } = editing;
          const ids = addMeals([{ ...rest, date: new Date() }]);
          setEditing(null);
          logged(ids, `${editing.name} (today)`);
        } : undefined}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-grappler-800/60 py-2">
      <p className="text-sm font-semibold text-grappler-100 tabular-nums">{value}</p>
      <p className="text-[10px] text-grappler-500">{label}</p>
    </div>
  );
}

export { MacroLine };
