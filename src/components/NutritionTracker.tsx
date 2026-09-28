'use client';

/**
 * Nutrition — rebuilt (2026-09).
 *
 *   Today   what's left, why, and the day as meals around your training
 *   Plan    the week, meals picked for each slot, shopping list, recipes, my foods
 *   Coach   goal + rate, adaptive vs fixed, preferences, 7-day review
 *
 * One number everywhere: every screen reads lib/nutrition-targets.
 * Logging is one sheet (search / describe / quick / scan) with Undo on every log.
 */
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, LayoutDashboard, CalendarRange, GraduationCap } from 'lucide-react';
import { usePersistentState } from '@/lib/use-persistent-state';
import { localDayKey, cn } from '@/lib/utils';
import { mealTypeForHour } from '@/lib/food-search';
import type { MealType } from '@/lib/types';
import { useNutritionDay } from '@/hooks/useNutritionDay';
import { useToast } from './Toast';
import { useAppStore } from '@/lib/store';
import TodayView from './nutrition/TodayView';
import PlanView from './nutrition/PlanView';
import CoachView from './nutrition/CoachView';
import FoodLogger from './nutrition/FoodLogger';
import { Sheet, MEAL_LABEL } from './nutrition/ui';
import { BackButton } from './_ToolShell';

type Tab = 'today' | 'plan' | 'coach';

export default function NutritionTracker({ onClose, onNavigate }: { onClose: () => void; onNavigate?: (view: string) => void }) {
  const [tab, setTab] = usePersistentState<Tab>('ui:nutrition-tab-v2', 'today');
  const [dayKey, setDayKey] = useState(() => localDayKey());
  const [logger, setLogger] = useState<{ mealType: MealType; when: Date } | null>(null);
  const day = useNutritionDay(dayKey);
  const undoMeals = useAppStore(s => s.undoMeals);
  const { showToast } = useToast();

  const shift = (n: number) => {
    const d = new Date(`${dayKey}T12:00:00`); d.setDate(d.getDate() + n);
    const k = localDayKey(d);
    if (k <= localDayKey()) setDayKey(k);
  };
  const label = useMemo(() => day.isToday ? 'Today'
    : new Date(`${dayKey}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }), [dayKey, day.isToday]);

  const openLogger = (mealType?: MealType, when?: Date) => {
    const at = when ?? (day.isToday ? new Date() : new Date(`${dayKey}T12:00:00`));
    setLogger({ mealType: mealType ?? mealTypeForHour(at.getHours() + at.getMinutes() / 60), when: at });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      className="min-h-screen bg-grappler-900 safe-area-top">
      <div className="sticky top-0 z-20 bg-grappler-900/95 backdrop-blur border-b border-grappler-800">
        <div className="flex items-center justify-between px-2 py-2">
          <BackButton onClick={onClose} className="ml-0" />
          {tab === 'today' ? (
            <div className="flex items-center gap-1">
              <button aria-label="Previous day" onClick={() => shift(-1)} className="w-11 h-11 flex items-center justify-center text-grappler-400"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setDayKey(localDayKey())} className={cn('text-sm font-semibold px-2 min-w-[96px]', day.isToday ? 'text-grappler-50' : 'text-primary-400')}>{label}</button>
              <button aria-label="Next day" onClick={() => shift(1)} disabled={day.isToday} className="w-11 h-11 flex items-center justify-center text-grappler-400 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          ) : <span className="text-sm font-semibold text-grappler-50">Nutrition</span>}
          <span className="w-11" />
        </div>
        <div className="flex px-4 gap-1" role="tablist">
          {([['today', 'Today', LayoutDashboard], ['plan', 'Plan', CalendarRange], ['coach', 'Coach', GraduationCap]] as const).map(([k, l, Icon]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={cn('flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium border-b-2 transition-colors',
                tab === k ? 'text-primary-400 border-primary-400' : 'text-grappler-500 border-transparent')}>
              <Icon className="w-4 h-4" />{l}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        {tab === 'today' && <TodayView day={day} onLog={openLogger} onOpenSettings={() => setTab('coach')} />}
        {tab === 'plan' && <PlanView day={day} />}
        {tab === 'coach' && <CoachView day={day} onNavigate={onNavigate} />}
      </div>

      {tab === 'today' && (
        <button onClick={() => openLogger()} aria-label="Log food"
          className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-30 h-14 px-6 rounded-full bg-primary-500 text-white font-semibold shadow-lg shadow-primary-500/30 flex items-center gap-2">
          <Plus className="w-5 h-5" /> Log food
        </button>
      )}

      <Sheet open={!!logger} onClose={() => setLogger(null)} title={logger ? `Log · ${MEAL_LABEL[logger.mealType]}${day.isToday ? '' : ` · ${label}`}` : 'Log'}>
        {logger && (
          <FoodLogger day={day} mealType={logger.mealType} when={logger.when}
            onLogged={(ids, what) => {
              setLogger(null);
              showToast(`Logged ${what}`, 'success', { label: 'Undo', onClick: () => undoMeals(ids) });
            }} />
        )}
      </Sheet>
    </motion.div>
  );
}
