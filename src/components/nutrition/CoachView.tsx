'use client';

/**
 * Coach — set it once, then it runs itself:
 *   goal + rate (the adaptive engine turns "−0.5 kg/week" into calories from
 *   what you actually burn), fixed-targets escape hatch, the profile fields
 *   the maths needs, meal preferences, and a 7-day review.
 * Deep tools (phase history + check-ins, supplements, fight camp) stay one tap away.
 */
import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ChevronRight, TrendingDown, TrendingUp, Minus as Flat } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { localDayKey, safeDayKey, cn } from '@/lib/utils';
import { resolveDailyTargets, DEFAULT_NUTRITION_PREFS } from '@/lib/nutrition-targets';
import { targetsInputFromState } from '@/lib/nutrition-state';
import type { DietaryRestriction, DietGoal, NutritionPrefs } from '@/lib/types';
import type { NutritionDay } from '@/hooks/useNutritionDay';
import { Chip, Section, Sheet, fmt, num } from './ui';

const DietCoach = dynamic(() => import('../DietCoach'), { ssr: false });
const SupplementTracker = dynamic(() => import('../SupplementTracker'), { ssr: false });

const RATES: Record<DietGoal, number[]> = { cut: [-0.25, -0.5, -0.75, -1], maintain: [0], bulk: [0.1, 0.25, 0.4] };
const DIETS: { id: DietaryRestriction; label: string }[] = [
  { id: 'vegetarian', label: 'Vegetarian' }, { id: 'vegan', label: 'Vegan' }, { id: 'halal', label: 'Halal' },
  { id: 'kosher', label: 'Kosher' }, { id: 'dairy_free', label: 'Dairy-free' }, { id: 'gluten_free', label: 'Gluten-free' },
];

export default function CoachView({ day, onNavigate }: { day: NutritionDay; onNavigate?: (view: string) => void }) {
  const store = useAppStore();
  const { user, activeDietPhase, macroTargets } = store;
  const prefs = { ...DEFAULT_NUTRITION_PREFS, ...(store.nutritionPrefs ?? {}) };
  const [deep, setDeep] = useState<'phases' | 'supplements' | null>(null);
  const t = day.targets;
  const goal: DietGoal = activeDietPhase?.isActive ? activeDietPhase.goal : 'maintain';
  const rate = activeDietPhase?.isActive ? activeDietPhase.targetRatePerWeek : 0;

  const setGoal = (g: DietGoal, r: number) => {
    if (activeDietPhase?.isActive && activeDietPhase.goal === g) { store.setDietPhaseRate(r); return; }
    if (activeDietPhase?.isActive) store.endDietPhase();
    // Maintaining is the default — no phase needed.
    if (g === 'maintain') return;
    store.startDietPhase({
      goal: g, startDate: localDayKey(), startWeightKg: t.bodyWeightKg, targetRatePerWeek: r,
      currentMacros: t.base, weeksCompleted: 0, isActive: true,
    });
  };

  const setPrefs = (u: Partial<NutritionPrefs>) => store.setNutritionPrefs(u);

  // Last 7 complete days vs that day's resolved target.
  const review = useMemo(() => {
    const input = targetsInputFromState(store);
    const out: { day: string; kcal: number; target: number; protein: number; pTarget: number }[] = [];
    for (let i = 7; i >= 1; i--) {
      const d = new Date(`${day.today}T12:00:00`); d.setDate(d.getDate() - i);
      const key = localDayKey(d);
      const eaten = day.allMeals.filter(m => safeDayKey(m.date) === key);
      if (eaten.length === 0) continue;
      const tt = resolveDailyTargets(input, key, day.today);
      out.push({
        day: key, kcal: Math.round(eaten.reduce((s, m) => s + m.calories, 0)), target: tt.calories,
        protein: Math.round(eaten.reduce((s, m) => s + m.protein, 0)), pTarget: tt.protein,
      });
    }
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.allMeals, day.today, store.bodyWeightLog, store.activeDietPhase, store.nutritionPrefs]);

  const e = t.expenditure;
  const trend = e?.trendKgPerWeek;

  return (
    <div className="space-y-5 pb-28">
      <Section title="Goal">
        <div className="card p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {(['cut', 'maintain', 'bulk'] as DietGoal[]).map(g => (
              <button key={g} onClick={() => setGoal(g, g === goal ? rate : RATES[g][g === 'cut' ? 1 : 0])}
                className={cn('rounded-lg py-3 text-sm font-semibold capitalize min-h-[48px] border',
                  goal === g ? 'bg-primary-500/15 border-primary-500 text-primary-300' : 'border-grappler-700 text-grappler-300')}>
                {g === 'cut' ? 'Lose' : g === 'bulk' ? 'Gain' : 'Maintain'}
              </button>
            ))}
          </div>
          {goal !== 'maintain' && (
            <div className="flex flex-wrap gap-2">
              {RATES[goal].map(r => (
                <Chip key={r} active={Math.abs(rate - r) < 0.01} onClick={() => setGoal(goal, r)}>
                  {r > 0 ? '+' : ''}{r.toLocaleString('de-AT')} kg/week
                </Chip>
              ))}
            </div>
          )}
          {goal === 'cut' && rate <= -1 && <p className="text-[11px] text-amber-300">Fast — fine for a short fight-camp push; protein is raised and energy availability is protected.</p>}
          <p className="text-xs text-grappler-400">
            Base target this week: <span className="text-grappler-100 font-semibold">{fmt(t.base.calories)} kcal</span> · P {t.base.protein} · C {t.base.carbs} · F {t.base.fat}
          </p>
        </div>
      </Section>

      <Section title="Your expenditure">
        <div className="card p-4 space-y-2">
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-grappler-50 tabular-nums">{e ? fmt(e.kcal) : '—'}</p>
            <p className="text-xs text-grappler-400">kcal/day {e?.source === 'measured' ? 'measured' : e?.source === 'blended' ? 'partly measured' : 'estimated'}</p>
          </div>
          {trend != null && (
            <p className="text-xs text-grappler-300 flex items-center gap-1">
              {trend < -0.05 ? <TrendingDown className="w-3.5 h-3.5 text-green-400" /> : trend > 0.05 ? <TrendingUp className="w-3.5 h-3.5 text-amber-400" /> : <Flat className="w-3.5 h-3.5 text-grappler-400" />}
              Weight trend {trend > 0 ? '+' : ''}{trend.toLocaleString('de-AT')} kg/week{rate !== 0 ? ` (goal ${rate > 0 ? '+' : ''}${rate.toLocaleString('de-AT')})` : ''}
            </p>
          )}
          <div className="h-1.5 rounded-full bg-grappler-800 overflow-hidden">
            <div className="h-full bg-green-400" style={{ width: `${Math.round((e?.confidence ?? 0) * 100)}%` }} />
          </div>
          <p className="text-[11px] text-grappler-500">
            {!e
              ? (t.mode === 'fixed' ? 'You set fixed targets — switch to Adaptive to have it measured.' : `Add your ${t.missing.join(', ')} below to get an estimate.`)
              : e.source === 'formula'
                ? 'Log everything you eat and weigh in most mornings — after ~2 weeks this switches from a formula to what you really burn.'
                : `Based on ${e.loggedDays} fully logged days and ${e.weighIns} weigh-ins. Re-measured every Monday.`}
          </p>
          {e?.underLoggingSuspected && <p className="text-[11px] text-amber-300">Your intake looks lower than your weight says — something is slipping through the log.</p>}
        </div>
      </Section>

      <Section title="Targets">
        <div className="card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Chip active={prefs.targetMode === 'adaptive'} onClick={() => setPrefs({ targetMode: 'adaptive' })}>Adaptive (recommended)</Chip>
            <Chip active={prefs.targetMode === 'fixed'} onClick={() => setPrefs({ targetMode: 'fixed' })}>Fixed — I set them</Chip>
          </div>
          {prefs.targetMode === 'fixed' && <FixedTargets initial={macroTargets} onSave={m => store.setMacroTargets(m)} />}
        </div>
      </Section>

      {t.missing.length > 0 && (
        <Section title="Profile">
          <ProfileFields user={user} missing={t.missing} onSave={f => store.updateUserFields(f)} />
        </Section>
      )}

      <Section title="Meals">
        <div className="card p-4 space-y-3">
          <Row label="Meals per day">
            {[3, 4, 5, 6].map(n => <Chip key={n} active={prefs.mealsPerDay === n} onClick={() => setPrefs({ mealsPerDay: n })}>{n}</Chip>)}
          </Row>
          <Row label="I usually train">
            {(['morning', 'midday', 'afternoon', 'evening'] as const).map(x => <Chip key={x} active={prefs.trainingTime === x} onClick={() => setPrefs({ trainingTime: x })}>{x[0].toUpperCase() + x.slice(1)}</Chip>)}
          </Row>
          <Row label="Cooking">
            {([['quick', '≤ 15 min'], ['normal', 'Normal'], ['meal_prep', 'Meal prep']] as const).map(([k, l]) => <Chip key={k} active={prefs.cookingTime === k} onClick={() => setPrefs({ cookingTime: k })}>{l}</Chip>)}
          </Row>
          <Row label="Diet">
            {DIETS.map(d => {
              const on = prefs.diet.includes(d.id);
              return <Chip key={d.id} active={on} onClick={() => setPrefs({ diet: on ? prefs.diet.filter(x => x !== d.id) : [...prefs.diet, d.id] })}>{d.label}</Chip>;
            })}
          </Row>
          <Dislikes value={prefs.dislikes} onChange={dislikes => setPrefs({ dislikes })} />
        </div>
      </Section>

      {review.length > 0 && (
        <Section title="Last 7 days">
          <div className="card p-4 space-y-2">
            {review.map(r => {
              const pct = r.target > 0 ? r.kcal / r.target : 0;
              return (
                <div key={r.day} className="flex items-center gap-2 text-xs">
                  <span className="w-12 text-grappler-500">{new Date(`${r.day}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}</span>
                  <div className="flex-1 h-2 rounded-full bg-grappler-800 overflow-hidden">
                    <div className={cn('h-full rounded-full', Math.abs(pct - 1) <= 0.1 ? 'bg-green-400' : pct > 1 ? 'bg-amber-400' : 'bg-sky-400')} style={{ width: `${Math.min(100, pct * 100)}%` }} />
                  </div>
                  <span className="w-24 text-right tabular-nums text-grappler-300">{fmt(r.kcal)}/{fmt(r.target)}</span>
                  <span className={cn('w-14 text-right tabular-nums', r.protein >= r.pTarget * 0.9 ? 'text-green-400' : 'text-grappler-400')}>P {r.protein}</span>
                </div>
              );
            })}
            <p className="text-[11px] text-grappler-500">Green = within 10 % of that day's target. Protein green = ≥ 90 %.</p>
          </div>
        </Section>
      )}

      <Section title="More">
        <div className="card divide-y divide-grappler-800">
          <LinkRow label="Diet phases & check-ins" onClick={() => setDeep('phases')} />
          <LinkRow label="Supplements" onClick={() => setDeep('supplements')} />
          {onNavigate && <LinkRow label="Fight camp & weight cut" onClick={() => onNavigate('fight_camp')} />}
        </div>
      </Section>

      <Sheet open={deep === 'phases'} onClose={() => setDeep(null)} title="Diet phases & check-ins"><DietCoach /></Sheet>
      <Sheet open={deep === 'supplements'} onClose={() => setDeep(null)} title="Supplements"><SupplementTracker /></Sheet>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-grappler-500 mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function LinkRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between px-4 py-3 text-sm text-grappler-200 min-h-[48px]">
      {label}<ChevronRight className="w-4 h-4 text-grappler-500" />
    </button>
  );
}

function Dislikes({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState('');
  return (
    <div>
      <p className="text-[11px] text-grappler-500 mb-1.5">Leave out</p>
      <div className="flex flex-wrap gap-2">
        {value.map(d => <Chip key={d} active onClick={() => onChange(value.filter(x => x !== d))}>{d} ✕</Chip>)}
        <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="e.g. Lachs, Topfen" aria-label="Add a food to leave out"
          onKeyDown={e => { if (e.key === 'Enter' && draft.trim()) { onChange([...value, draft.trim().toLowerCase()]); setDraft(''); } }}
          onBlur={() => { if (draft.trim()) { onChange([...value, draft.trim().toLowerCase()]); setDraft(''); } }}
          className="px-3 min-h-[36px] rounded-full bg-grappler-800 border border-grappler-700 text-xs text-grappler-100 placeholder:text-grappler-500 w-36" />
      </div>
    </div>
  );
}

function FixedTargets({ initial, onSave }: { initial: { calories: number; protein: number; carbs: number; fat: number }; onSave: (m: { calories: number; protein: number; carbs: number; fat: number }) => void }) {
  const [v, setV] = useState({ protein: String(initial.protein), carbs: String(initial.carbs), fat: String(initial.fat) });
  const kcal = Math.round(num(v.protein) * 4 + num(v.carbs) * 4 + num(v.fat) * 9);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {(['protein', 'carbs', 'fat'] as const).map(k => (
          <label key={k} className="block">
            <span className="text-[11px] text-grappler-500 capitalize">{k} g</span>
            <input inputMode="decimal" value={v[k]} onChange={e => setV({ ...v, [k]: e.target.value })}
              className="w-full px-3 py-2 bg-grappler-800 border border-grappler-700 rounded-lg text-sm text-grappler-100" />
          </label>
        ))}
      </div>
      <button className="btn btn-primary w-full min-h-[44px]" onClick={() => onSave({ calories: kcal, protein: num(v.protein), carbs: num(v.carbs), fat: num(v.fat) })}>
        Save · {fmt(kcal)} kcal
      </button>
      <p className="text-[11px] text-grappler-500">Training days still shift carbs around this; the week averages what you set.</p>
    </div>
  );
}

function ProfileFields({ user, missing, onSave }: { user: ReturnType<typeof useAppStore.getState>['user']; missing: string[]; onSave: (f: Record<string, unknown>) => void }) {
  const [h, setH] = useState(user?.heightCm ? String(user.heightCm) : '');
  const [a, setA] = useState(user?.age ? String(user.age) : '');
  const [sex, setSex] = useState<'male' | 'female' | undefined>(user?.sex as 'male' | 'female' | undefined);
  const [w, setW] = useState(user?.bodyWeightKg ? String(user.bodyWeightKg) : '');
  return (
    <div className="card p-4 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <label className="block"><span className="text-[11px] text-grappler-500">Height cm</span>
          <input inputMode="numeric" value={h} onChange={e => setH(e.target.value)} className="w-full px-3 py-2 bg-grappler-800 border border-grappler-700 rounded-lg text-sm text-grappler-100" /></label>
        <label className="block"><span className="text-[11px] text-grappler-500">Age</span>
          <input inputMode="numeric" value={a} onChange={e => setA(e.target.value)} className="w-full px-3 py-2 bg-grappler-800 border border-grappler-700 rounded-lg text-sm text-grappler-100" /></label>
        {missing.includes('weight') && (
          <label className="block"><span className="text-[11px] text-grappler-500">Weight kg</span>
            <input inputMode="decimal" value={w} onChange={e => setW(e.target.value)} className="w-full px-3 py-2 bg-grappler-800 border border-grappler-700 rounded-lg text-sm text-grappler-100" /></label>
        )}
      </div>
      <div className="flex gap-2">
        <Chip active={sex === 'male'} onClick={() => setSex('male')}>Male</Chip>
        <Chip active={sex === 'female'} onClick={() => setSex('female')}>Female</Chip>
      </div>
      <button className="btn btn-primary w-full min-h-[44px]" onClick={() => onSave({
        ...(num(h) > 0 ? { heightCm: Math.round(num(h)) } : {}),
        ...(num(a) > 0 ? { age: Math.round(num(a)) } : {}),
        ...(num(w) > 0 ? { bodyWeightKg: num(w) } : {}),
        ...(sex ? { sex } : {}),
      })}>Save</button>
    </div>
  );
}
