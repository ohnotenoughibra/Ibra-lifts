'use client';

/** Shared bits for the nutrition screens: ring, macro bars, sheet, chips. */
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MealType } from '@/lib/types';

export const MEAL_LABEL: Record<MealType, string> = {
  breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack',
  pre_workout: 'Pre-training', post_workout: 'After training',
};

export const MACRO_COLOR = { protein: '#f97316', carbs: '#3b82f6', fat: '#eab308', calories: '#22c55e' } as const;

export const fmt = (n: number) => Math.round(n).toLocaleString('de-AT');
export const g1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString('de-AT');

/** Parse a number typed on a German keyboard ("12,5"). */
export function num(s: string): number {
  const v = parseFloat(s.replace(',', '.'));
  return Number.isFinite(v) ? v : 0;
}

export function Ring({ value, target, size = 150, label, sub }: { value: number; target: number; size?: number; label: string; sub?: string }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, value / Math.max(1, target));
  const over = value > target * 1.05;
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-grappler-800" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={over ? '#ef4444' : MACRO_COLOR.calories}
          strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c - p * c }} transition={{ duration: 0.7, ease: 'easeOut' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={cn('text-3xl font-bold tabular-nums', over ? 'text-red-400' : 'text-grappler-50')}>{label}</span>
        {sub && <span className="text-xs text-grappler-400">{sub}</span>}
      </div>
    </div>
  );
}

export function MacroBar({ name, value, target, color }: { name: string; value: number; target: number; color: string }) {
  const p = Math.min(1, value / Math.max(1, target));
  const over = value > target * 1.1;
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs mb-1">
        <span className="font-medium text-grappler-300">{name}</span>
        <span className={cn('tabular-nums', over ? 'text-red-400' : 'text-grappler-400')}>
          <span className="text-grappler-100 font-semibold">{fmt(value)}</span>/{fmt(target)} g
        </span>
      </div>
      <div className="h-2 bg-grappler-800 rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ backgroundColor: over ? '#ef4444' : color }}
          initial={{ width: 0 }} animate={{ width: `${p * 100}%` }} transition={{ duration: 0.5 }} />
      </div>
    </div>
  );
}

export function MacroLine({ m, className }: { m: { calories: number; protein: number; carbs: number; fat: number }; className?: string }) {
  return (
    <span className={cn('text-xs text-grappler-400 tabular-nums', className)}>
      {fmt(m.calories)} kcal · <span style={{ color: MACRO_COLOR.protein }}>P {fmt(m.protein)}</span> · C {fmt(m.carbs)} · F {fmt(m.fat)}
    </span>
  );
}

export function Chip({ active, onClick, children, className }: { active?: boolean; onClick?: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('px-3 min-h-[36px] rounded-full text-xs font-medium border transition-colors whitespace-nowrap',
        active ? 'bg-primary-500/20 border-primary-500/60 text-primary-300' : 'bg-grappler-800/60 border-grappler-700 text-grappler-300 hover:text-grappler-100',
        className)}>
      {children}
    </button>
  );
}

/** Bottom sheet over the screen; tap outside or ✕ to close. */
export function Sheet({ open, onClose, title, children, footer }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={onClose}>
          <motion.div role="dialog" aria-label={title}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-lg max-h-[90vh] bg-grappler-900 rounded-t-2xl flex flex-col overlay-safe">
            <div className="flex items-center justify-between px-4 py-3 border-b border-grappler-800 flex-shrink-0">
              <span className="text-base font-bold text-grappler-100 truncate">{title}</span>
              <button onClick={onClose} className="w-11 h-11 -mr-2 flex items-center justify-center text-grappler-400 hover:text-grappler-200" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-4 py-4 flex-1">{children}</div>
            {footer && <div className="px-4 py-3 border-t border-grappler-800 flex-shrink-0">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Section({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-grappler-400">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
