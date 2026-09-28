'use client';

/**
 * FoodLogger — every way to log, in one sheet:
 *   Search    your foods + history + the built-in library instantly,
 *             packaged products from OpenFoodFacts underneath
 *   Describe  "2 Semmeln mit Schinken, Melange" or a photo → Claude splits it
 *             into items with grams; review, adjust, log all
 *   Quick     kcal + macros
 *   Scan      barcode
 * Every log returns ids so the parent can offer Undo.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Search, Sparkles, Zap, ScanBarcode, Camera, Loader2, Trash2, Star } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { searchFoods, foodToHit, historyToHit, type FoodHit } from '@/lib/food-search';
import type { FoodItem, MealEntry, MealType } from '@/lib/types';
import type { NutritionDay } from '@/hooks/useNutritionDay';
import { cn } from '@/lib/utils';
import AmountPicker from './AmountPicker';
import { Chip, MacroLine, MEAL_LABEL, num, fmt } from './ui';

const BarcodeScanner = dynamic(() => import('@/components/BarcodeScanner'), { ssr: false });

type Mode = 'search' | 'ai' | 'quick' | 'scan';

interface AiItem { name: string; grams: number; calories: number; protein: number; carbs: number; fat: number; fiber: number; confidence: string; note: string }

export default function FoodLogger({ day, mealType, when, onLogged, initialMode = 'search' }: {
  day: NutritionDay;
  mealType: MealType;
  /** Date the entry is logged at (today: now; other days: the slot time). */
  when: Date;
  onLogged: (ids: string[], label: string) => void;
  initialMode?: Mode;
}) {
  const addMeals = useAppStore(s => s.addMeals);
  const addCustomFood = useAppStore(s => s.addCustomFood);
  const touchCustomFood = useAppStore(s => s.touchCustomFood);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [picked, setPicked] = useState<FoodHit | null>(null);

  const log = (entries: Omit<MealEntry, 'id'>[], label: string) => {
    const ids = addMeals(entries);
    for (const e of entries) if (e.foodId && !e.foodId.startsWith('at:') && !e.foodId.startsWith('recipe:')) touchCustomFood(e.foodId);
    onLogged(ids, label);
    setPicked(null);
  };

  if (picked) {
    return (
      <div>
        <button onClick={() => setPicked(null)} className="text-xs text-primary-400 mb-3">← Back to search</button>
        <AmountPicker
          hit={picked} date={when} defaultMealType={mealType}
          onLog={e => log([e], `${e.name} · ${e.calories} kcal`)}
          onSaveFood={picked.source === 'openfoodfacts' && picked.per100g ? () => {
            const id = addCustomFood({
              kind: 'food', name: picked.name, brand: picked.subtitle, per100g: picked.per100g!,
              servings: picked.servings ?? [{ label: '100 g', grams: 100 }], source: 'openfoodfacts',
              barcode: picked.key.startsWith('off:') ? picked.key.slice(4) : undefined,
            });
            setPicked({ ...picked, source: 'custom', foodId: id, key: id });
          } : undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-1 bg-grappler-800/60 p-1 rounded-xl" role="tablist">
        {([
          ['search', 'Search', Search], ['ai', 'Describe', Sparkles], ['quick', 'Quick', Zap], ['scan', 'Scan', ScanBarcode],
        ] as const).map(([m, label, Icon]) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
            className={cn('flex flex-col items-center gap-0.5 py-2 rounded-lg text-[11px] font-medium transition-colors min-h-[44px]',
              mode === m ? 'bg-grappler-700 text-grappler-50' : 'text-grappler-400')}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {mode === 'search' && <SearchPane day={day} onPick={setPicked} />}
      {mode === 'ai' && <AiPane when={when} mealType={mealType} onLog={log} />}
      {mode === 'quick' && <QuickPane when={when} mealType={mealType} onLog={log} />}
      {mode === 'scan' && (
        <BarcodeScanner
          defaultMealType={mealType}
          onClose={() => setMode('search')}
          onAdd={(item, mt) => log([{
            date: when, mealType: mt ?? mealType, name: item.name, calories: item.calories,
            protein: item.protein, carbs: item.carbs, fat: item.fat, portion: item.portion, source: 'openfoodfacts',
          }], `${item.name} · ${item.calories} kcal`)}
        />
      )}
    </div>
  );
}

// ── Search ──────────────────────────────────────────────────────────────────

function SearchPane({ day, onPick }: { day: NutritionDay; onPick: (h: FoodHit) => void }) {
  const [q, setQ] = useState('');
  const [off, setOff] = useState<{ q: string; hits: FoodHit[]; loading: boolean; error?: string }>({ q: '', hits: [], loading: false });
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const local = useMemo(() => searchFoods(q, { customFoods: day.customFoods, history: day.history, limit: 25 }), [q, day.customFoods, day.history]);

  // Packaged products, debounced.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 3) { setOff({ q: term, hits: [], loading: false }); return; }
    setOff(o => ({ ...o, loading: true }));
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal, credentials: 'include' });
        const data = await res.json();
        const hits: FoodHit[] = (data.foods ?? []).map((f: { barcode: string; name: string; brand?: string; per100g: FoodItem['per100g']; servings: FoodItem['servings'] }) => ({
          key: `off:${f.barcode || f.name}`, name: f.name, subtitle: f.brand, source: 'openfoodfacts' as const,
          per100g: f.per100g, servings: f.servings, score: 0,
        }));
        setOff({ q: term, hits, loading: false, error: res.ok ? undefined : data.error });
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setOff({ q: term, hits: [], loading: false, error: 'Offline — showing your foods only' });
      }
    }, 450);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  const favorites = useMemo(() => {
    const now = Date.now();
    const fromHistory = Array.from(day.history.values())
      .sort((a, b) => (b.count + (now - b.lastUsed < 14 * 864e5 ? 3 : 0)) - (a.count + (now - a.lastUsed < 14 * 864e5 ? 3 : 0)))
      .slice(0, 8)
      .map(h => historyToHit(h));
    const mine = day.customFoods
      .slice().sort((a, b) => (b.timesUsed ?? 0) - (a.timesUsed ?? 0)).slice(0, 6)
      .map(f => foodToHit(f));
    const seen = new Set<string>();
    return [...mine, ...fromHistory].filter(h => (seen.has(h.name) ? false : (seen.add(h.name), true)));
  }, [day.history, day.customFoods]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="w-4 h-4 text-grappler-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Food, dish or brand — e.g. Skyr, Gröstl, Semmel"
          aria-label="Search food" enterKeyHint="search"
          className="w-full pl-9 pr-3 py-3 bg-grappler-800 border border-grappler-700 rounded-xl text-sm text-grappler-100 placeholder:text-grappler-500" />
      </div>

      {!q.trim() && favorites.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wide text-grappler-500 mb-2 flex items-center gap-1"><Star className="w-3 h-3" /> Your usual</p>
          <div className="space-y-1">{favorites.map(h => <HitRow key={h.key} hit={h} onPick={onPick} />)}</div>
        </div>
      )}

      {q.trim() && (
        <div className="space-y-1">
          {local.map(h => <HitRow key={h.key} hit={h} onPick={onPick} />)}
          {local.length === 0 && !off.loading && off.hits.length === 0 && (
            <p className="text-xs text-grappler-500 py-2">Nothing yet — try Describe to log it in words.</p>
          )}
        </div>
      )}

      {q.trim().length >= 3 && (
        <div>
          <p className="text-[11px] uppercase tracking-wide text-grappler-500 mb-2 flex items-center gap-2">
            Products {off.loading && <Loader2 className="w-3 h-3 animate-spin" />}
          </p>
          {off.error && <p className="text-xs text-grappler-500">{off.error}</p>}
          <div className="space-y-1">{off.hits.map(h => <HitRow key={h.key} hit={h} onPick={onPick} />)}</div>
        </div>
      )}
    </div>
  );
}

const SOURCE_BADGE: Record<FoodHit['source'], string> = {
  custom: 'Mine', recipe: 'Recipe', builtin: '', history: 'Logged', openfoodfacts: 'Product',
};

function HitRow({ hit, onPick }: { hit: FoodHit; onPick: (h: FoodHit) => void }) {
  const ref = hit.per100g
    ? `${fmt(hit.per100g.calories)} kcal · P ${fmt(hit.per100g.protein)} /100 g`
    : hit.fixed ? `${fmt(hit.fixed.calories)} kcal · P ${fmt(hit.fixed.protein)}${hit.fixed.portion ? ` · ${hit.fixed.portion}` : ''}` : '';
  return (
    <button onClick={() => onPick(hit)} className="w-full text-left px-3 py-2.5 rounded-lg bg-grappler-800/40 hover:bg-grappler-800 flex items-center gap-2 min-h-[48px]">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-grappler-100 truncate">{hit.name}</p>
        <p className="text-[11px] text-grappler-500 truncate">{hit.subtitle ? `${hit.subtitle} · ` : ''}{ref}{hit.count ? ` · ${hit.count}×` : ''}</p>
      </div>
      {SOURCE_BADGE[hit.source] && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-grappler-700 text-grappler-300 flex-shrink-0">{SOURCE_BADGE[hit.source]}</span>
      )}
    </button>
  );
}

// ── Describe / photo (Claude) ──────────────────────────────────────────────

/** Downscale a photo to ≤1280 px JPEG (keeps uploads small and fast). */
async function photoToBase64(file: File): Promise<{ data: string; mediaType: 'image/jpeg' }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = url;
    });
    const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    return { data: dataUrl.split(',')[1], mediaType: 'image/jpeg' };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function AiPane({ when, mealType, onLog }: { when: Date; mealType: MealType; onLog: (e: Omit<MealEntry, 'id'>[], label: string) => void }) {
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<{ data: string; mediaType: 'image/jpeg'; preview: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AiItem[] | null>(null);
  const [clarify, setClarify] = useState('');
  const [mt, setMt] = useState<MealType>(mealType);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = async () => {
    setBusy(true); setError(null); setClarify('');
    try {
      const res = await fetch('/api/nutrition/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ mode: 'parse', text: text.trim() || undefined, image: photo ? { data: photo.data, mediaType: photo.mediaType } : undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Could not analyse that'); return; }
      setItems(data.items ?? []);
      setClarify(data.clarification ?? '');
      if (data.mealType && data.mealType !== 'unknown') setMt(data.mealType);
    } catch {
      setError('No connection — use Search or Quick instead');
    } finally {
      setBusy(false);
    }
  };

  const setGrams = (i: number, grams: number) => setItems(list => list && list.map((it, j) => {
    if (j !== i || !(it.grams > 0)) return it;
    const k = grams / it.grams;
    return { ...it, grams, calories: Math.round(it.calories * k), protein: Math.round(it.protein * k * 10) / 10,
      carbs: Math.round(it.carbs * k * 10) / 10, fat: Math.round(it.fat * k * 10) / 10, fiber: Math.round(it.fiber * k * 10) / 10 };
  }));

  if (items) {
    const total = items.reduce((a, i) => ({ calories: a.calories + i.calories, protein: a.protein + i.protein, carbs: a.carbs + i.carbs, fat: a.fat + i.fat }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    return (
      <div className="space-y-3">
        {clarify && <p className="text-xs text-amber-300 bg-amber-500/10 rounded-lg px-3 py-2">{clarify}</p>}
        {items.length === 0 && <p className="text-sm text-grappler-400">Nothing recognised — add more detail.</p>}
        {items.map((it, i) => (
          <div key={i} className="rounded-lg bg-grappler-800/50 p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <p className="flex-1 text-sm text-grappler-100">{it.name}</p>
              {it.confidence === 'low' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">rough</span>}
              <button aria-label={`Remove ${it.name}`} onClick={() => setItems(items.filter((_, j) => j !== i))} className="w-9 h-9 flex items-center justify-center text-grappler-500"><Trash2 className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-2">
              <input aria-label={`${it.name} grams`} inputMode="decimal" defaultValue={String(it.grams)}
                onBlur={e => { const g = num(e.target.value); if (g > 0) setGrams(i, g); }}
                className="w-20 px-2 py-1.5 bg-grappler-800 border border-grappler-700 rounded text-sm text-grappler-100 text-center" />
              <span className="text-xs text-grappler-500">g</span>
              <MacroLine m={it} className="ml-auto" />
            </div>
            {it.note && <p className="text-[11px] text-grappler-500">{it.note}</p>}
          </div>
        ))}
        {items.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2">
              {(['breakfast', 'lunch', 'snack', 'dinner', 'pre_workout', 'post_workout'] as MealType[]).map(t => <Chip key={t} active={mt === t} onClick={() => setMt(t)}>{MEAL_LABEL[t]}</Chip>)}
            </div>
            <button className="btn btn-primary w-full min-h-[48px]" onClick={() => onLog(items.map(it => ({
              date: when, mealType: mt, name: it.name, calories: it.calories, protein: it.protein, carbs: it.carbs, fat: it.fat,
              fiber: it.fiber, grams: it.grams || undefined, portion: it.grams ? `${it.grams} g` : undefined, source: 'ai' as const,
              per100g: it.grams > 0 ? { calories: Math.round(it.calories * 100 / it.grams), protein: Math.round(it.protein * 1000 / it.grams) / 10, carbs: Math.round(it.carbs * 1000 / it.grams) / 10, fat: Math.round(it.fat * 1000 / it.grams) / 10 } : undefined,
            })), `${items.length} item${items.length === 1 ? '' : 's'} · ${fmt(total.calories)} kcal`)}>
              Log all · {fmt(total.calories)} kcal · P {fmt(total.protein)}
            </button>
          </>
        )}
        <button className="text-xs text-primary-400" onClick={() => setItems(null)}>← Change description</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <textarea value={text} onChange={e => setText(e.target.value)} rows={3} maxLength={600}
        placeholder="What did you eat? e.g. „2 Semmeln mit Schinken, ein Skyr und eine Melange“"
        aria-label="Describe your meal"
        className="w-full px-3 py-3 bg-grappler-800 border border-grappler-700 rounded-xl text-sm text-grappler-100 placeholder:text-grappler-500" />
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={async e => {
          const f = e.target.files?.[0];
          if (!f) return;
          const p = await photoToBase64(f);
          setPhoto({ ...p, preview: `data:image/jpeg;base64,${p.data}` });
        }} />
      <div className="flex items-center gap-2">
        <button onClick={() => fileRef.current?.click()} className="btn btn-secondary min-h-[44px] gap-1.5 text-sm">
          <Camera className="w-4 h-4" /> {photo ? 'Retake' : 'Photo'}
        </button>
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.preview} alt="Meal photo" className="w-11 h-11 rounded-lg object-cover" />
        )}
        <button disabled={busy || (!text.trim() && !photo)} onClick={run} className="btn btn-primary flex-1 min-h-[44px] gap-1.5 disabled:opacity-40">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Estimate
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <p className="text-[11px] text-grappler-500">Claude splits it into foods with grams — you check it before anything is logged.</p>
    </div>
  );
}

// ── Quick add ───────────────────────────────────────────────────────────────

function QuickPane({ when, mealType, onLog }: { when: Date; mealType: MealType; onLog: (e: Omit<MealEntry, 'id'>[], label: string) => void }) {
  const [v, setV] = useState({ name: '', kcal: '', p: '', c: '', f: '' });
  const [mt, setMt] = useState<MealType>(mealType);
  const p = num(v.p), c = num(v.c), f = num(v.f);
  const fromMacros = Math.round(p * 4 + c * 4 + f * 9);
  const kcal = v.kcal ? num(v.kcal) : fromMacros;
  const field = (k: keyof typeof v, label: string, w = 'w-full') => (
    <label className="block">
      <span className="text-[11px] text-grappler-500">{label}</span>
      <input inputMode="decimal" value={v[k]} onChange={e => setV({ ...v, [k]: e.target.value })} aria-label={label}
        className={cn('px-3 py-2 bg-grappler-800 border border-grappler-700 rounded-lg text-sm text-grappler-100', w)} />
    </label>
  );
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-[11px] text-grappler-500">Name (optional)</span>
        <input value={v.name} onChange={e => setV({ ...v, name: e.target.value })} placeholder="e.g. Mensa-Menü"
          className="w-full px-3 py-2 bg-grappler-800 border border-grappler-700 rounded-lg text-sm text-grappler-100 placeholder:text-grappler-500" />
      </label>
      <div className="grid grid-cols-4 gap-2">
        {field('p', 'Protein g')}{field('c', 'Carbs g')}{field('f', 'Fat g')}{field('kcal', 'kcal')}
      </div>
      {!v.kcal && fromMacros > 0 && <p className="text-[11px] text-grappler-500">= {fromMacros} kcal from macros</p>}
      <div className="flex flex-wrap gap-2">
        {(['breakfast', 'lunch', 'snack', 'dinner'] as MealType[]).map(t => <Chip key={t} active={mt === t} onClick={() => setMt(t)}>{MEAL_LABEL[t]}</Chip>)}
      </div>
      <button disabled={!(kcal > 0)} className="btn btn-primary w-full min-h-[48px] disabled:opacity-40"
        onClick={() => onLog([{ date: when, mealType: mt, name: v.name.trim() || 'Quick add', calories: Math.round(kcal), protein: p, carbs: c, fat: f, source: 'quick' }], `${Math.round(kcal)} kcal`)}>
        Log {kcal > 0 ? `${Math.round(kcal)} kcal` : ''}
      </button>
    </div>
  );
}
