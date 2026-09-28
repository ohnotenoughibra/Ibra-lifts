'use client';

/**
 * My foods — your own foods (from a label) and recipes (ingredients in grams,
 * weigh the pot once it's cooked, split into portions). Both land in search
 * above the library and log by the gram.
 */
import { useMemo, useState } from 'react';
import { Plus, Trash2, ChefHat, Tag } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { searchFoods, recipePer100g, macrosFor, type FoodHit } from '@/lib/food-search';
import type { FoodItem, RecipeIngredient } from '@/lib/types';
import { MacroLine, Sheet, num, fmt } from './ui';

export default function MyFoods() {
  const foods = useAppStore(s => s.customFoods);
  const deleteCustomFood = useAppStore(s => s.deleteCustomFood);
  const live = useMemo(() => (foods ?? []).filter(f => !f._deleted).sort((a, b) => a.name.localeCompare(b.name, 'de')), [foods]);
  const [editor, setEditor] = useState<'food' | 'recipe' | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button className="btn btn-secondary min-h-[48px] gap-1.5" onClick={() => setEditor('food')}><Tag className="w-4 h-4" /> New food</button>
        <button className="btn btn-secondary min-h-[48px] gap-1.5" onClick={() => setEditor('recipe')}><ChefHat className="w-4 h-4" /> New recipe</button>
      </div>
      {live.length === 0 && <p className="text-sm text-grappler-500">Save foods from a label, products you scanned, or your own recipes — they show up first in search.</p>}
      <div className="space-y-1.5">
        {live.map(f => (
          <div key={f.id} className="card p-3 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-grappler-100 truncate">{f.kind === 'recipe' ? '🍲 ' : ''}{f.name}{f.brand ? <span className="text-grappler-500"> · {f.brand}</span> : null}</p>
              <p className="text-[11px] text-grappler-500 truncate">
                {f.per100g.calories} kcal · P {f.per100g.protein} /100 g{f.servings[0] ? ` · ${f.servings[0].label} = ${fmt(f.servings[0].grams)} g` : ''}{f.timesUsed ? ` · ${f.timesUsed}×` : ''}
              </p>
            </div>
            {confirm === f.id ? (
              <button className="px-3 min-h-[36px] rounded-lg bg-red-500/20 text-red-300 text-xs" onClick={() => { deleteCustomFood(f.id); setConfirm(null); }}>Delete</button>
            ) : (
              <button aria-label={`Delete ${f.name}`} className="w-9 h-9 flex items-center justify-center text-grappler-500" onClick={() => setConfirm(f.id)}><Trash2 className="w-4 h-4" /></button>
            )}
          </div>
        ))}
      </div>
      <FoodEditor open={editor === 'food'} onClose={() => setEditor(null)} />
      <RecipeEditor open={editor === 'recipe'} onClose={() => setEditor(null)} />
    </div>
  );
}

function FoodEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addCustomFood = useAppStore(s => s.addCustomFood);
  const [v, setV] = useState({ name: '', brand: '', kcal: '', p: '', c: '', f: '', fiber: '', servingLabel: '', servingG: '' });
  const ok = v.name.trim() && num(v.kcal) > 0;
  const field = (k: keyof typeof v, label: string) => (
    <label className="block">
      <span className="text-[11px] text-grappler-500">{label}</span>
      <input inputMode={['name', 'brand', 'servingLabel'].includes(k) ? 'text' : 'decimal'} value={v[k]} onChange={e => setV({ ...v, [k]: e.target.value })}
        className="w-full px-3 py-2 bg-grappler-800 border border-grappler-700 rounded-lg text-sm text-grappler-100" />
    </label>
  );
  return (
    <Sheet open={open} onClose={onClose} title="New food (per 100 g, from the label)"
      footer={<button disabled={!ok} className="btn btn-primary w-full min-h-[48px] disabled:opacity-40" onClick={() => {
        const servings = num(v.servingG) > 0 ? [{ label: v.servingLabel.trim() || `${num(v.servingG)} g`, grams: num(v.servingG) }, { label: '100 g', grams: 100 }] : [{ label: '100 g', grams: 100 }];
        addCustomFood({
          kind: 'food', name: v.name.trim(), brand: v.brand.trim() || undefined, source: 'custom', servings,
          per100g: { calories: Math.round(num(v.kcal)), protein: num(v.p), carbs: num(v.c), fat: num(v.f), ...(v.fiber ? { fiber: num(v.fiber) } : {}) },
        });
        setV({ name: '', brand: '', kcal: '', p: '', c: '', f: '', fiber: '', servingLabel: '', servingG: '' });
        onClose();
      }}>Save</button>}>
      <div className="space-y-3">
        {field('name', 'Name')}{field('brand', 'Brand / shop (optional)')}
        <div className="grid grid-cols-5 gap-2">{field('kcal', 'kcal')}{field('p', 'Protein')}{field('c', 'Carbs')}{field('f', 'Fat')}{field('fiber', 'Fiber')}</div>
        <div className="grid grid-cols-2 gap-2">{field('servingLabel', 'Serving (e.g. 1 Becher)')}{field('servingG', 'Serving grams')}</div>
      </div>
    </Sheet>
  );
}

function RecipeEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addCustomFood = useAppStore(s => s.addCustomFood);
  const customFoods = useAppStore(s => s.customFoods);
  const [name, setName] = useState('');
  const [portions, setPortions] = useState('4');
  const [cooked, setCooked] = useState('');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [q, setQ] = useState('');
  const hits = useMemo(() => searchFoods(q, { customFoods: (customFoods ?? []).filter(f => f.kind === 'food' && !f._deleted), limit: 6 }).filter(h => h.per100g), [q, customFoods]);

  const per100 = ingredients.length ? recipePer100g(ingredients, num(cooked) || undefined) : null;
  const raw = ingredients.reduce((s, i) => s + i.grams, 0);
  const weight = num(cooked) || raw;
  const n = Math.max(1, Math.round(num(portions)) || 1);
  const portionG = weight / n;
  const portion = per100 ? macrosFor(per100, portionG) : null;

  const add = (h: FoodHit) => {
    setIngredients([...ingredients, { name: h.name, grams: h.servings?.[0]?.grams ?? 100, per100g: h.per100g!, foodId: h.foodId }]);
    setQ('');
  };

  return (
    <Sheet open={open} onClose={onClose} title="New recipe"
      footer={<button disabled={!name.trim() || ingredients.length === 0 || !per100} className="btn btn-primary w-full min-h-[48px] disabled:opacity-40" onClick={() => {
        const food: Omit<FoodItem, 'id' | 'createdAt'> = {
          kind: 'recipe', name: name.trim(), source: 'recipe', per100g: per100!, ingredients,
          yieldGrams: num(cooked) || undefined, portions: n,
          servings: [{ label: '1 portion', grams: Math.round(portionG) }, { label: '100 g', grams: 100 }],
        };
        addCustomFood(food);
        setName(''); setIngredients([]); setCooked(''); setPortions('4');
        onClose();
      }}>Save recipe{portion ? ` · ${fmt(portion.calories)} kcal/portion` : ''}</button>}>
      <div className="space-y-3">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name, e.g. Mamas Gulasch" aria-label="Recipe name"
          className="w-full px-3 py-2 bg-grappler-800 border border-grappler-700 rounded-lg text-sm text-grappler-100 placeholder:text-grappler-500" />
        <div className="space-y-1.5">
          {ingredients.map((i, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-grappler-200 truncate">{i.name}</span>
              <input inputMode="decimal" aria-label={`${i.name} grams`} value={String(i.grams)}
                onChange={e => setIngredients(ingredients.map((x, j) => j === idx ? { ...x, grams: num(e.target.value) } : x))}
                className="w-20 px-2 py-1.5 bg-grappler-800 border border-grappler-700 rounded text-sm text-grappler-100 text-center" />
              <span className="text-xs text-grappler-500">g</span>
              <button aria-label={`Remove ${i.name}`} onClick={() => setIngredients(ingredients.filter((_, j) => j !== idx))} className="w-9 h-9 flex items-center justify-center text-grappler-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
        <div className="relative">
          <Plus className="w-4 h-4 text-grappler-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Add ingredient…" aria-label="Add ingredient"
            className="w-full pl-9 pr-3 py-2 bg-grappler-800 border border-grappler-700 rounded-lg text-sm text-grappler-100 placeholder:text-grappler-500" />
        </div>
        {q && hits.map(h => (
          <button key={h.key} onClick={() => add(h)} className="w-full text-left px-3 py-2 rounded-lg bg-grappler-800/40 text-sm text-grappler-200 min-h-[44px]">
            {h.name} <span className="text-[11px] text-grappler-500">· {h.per100g!.calories} kcal/100 g</span>
          </button>
        ))}
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[11px] text-grappler-500">Portions</span>
            <input inputMode="numeric" value={portions} onChange={e => setPortions(e.target.value)} className="w-full px-3 py-2 bg-grappler-800 border border-grappler-700 rounded-lg text-sm text-grappler-100" />
          </label>
          <label className="block">
            <span className="text-[11px] text-grappler-500">Cooked weight g (optional)</span>
            <input inputMode="decimal" value={cooked} onChange={e => setCooked(e.target.value)} placeholder={raw ? String(Math.round(raw)) : ''} className="w-full px-3 py-2 bg-grappler-800 border border-grappler-700 rounded-lg text-sm text-grappler-100" />
          </label>
        </div>
        {portion && (
          <div className="rounded-lg bg-grappler-800/50 p-3 text-xs">
            <p className="text-grappler-300">1 portion ≈ {fmt(portionG)} g</p>
            <MacroLine m={portion} />
            <p className="text-grappler-500 mt-1">Weigh the pot after cooking for accurate portions — pasta and rice soak up water.</p>
          </div>
        )}
      </div>
    </Sheet>
  );
}
