'use client';

/**
 * WeekLayoutSheet — set lift days and mat days (with intensity) in one place.
 * Saving re-lays the current block onto the new days; nothing is regenerated,
 * and the change is undoable.
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Dumbbell, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CombatIntensity, CombatTrainingDay } from '@/lib/types';
import { WEEK_ORDER, DAY_SHORT } from '@/lib/plan-edit';

interface Props {
  trainingDays: number[];
  combatTrainingDays: CombatTrainingDay[];
  sessionsPerWeek: number;
  onSave: (trainingDays: number[], combatTrainingDays: CombatTrainingDay[]) => void;
  onClose: () => void;
}

const NEXT: Record<string, CombatIntensity | null> = { none: 'light', light: 'moderate', moderate: 'hard', hard: null };
const TONE: Record<CombatIntensity, string> = {
  light: 'bg-sky-500/20 border-sky-500/40 text-sky-200',
  moderate: 'bg-purple-500/20 border-purple-500/40 text-purple-200',
  hard: 'bg-red-500/20 border-red-500/40 text-red-200',
};

export default function WeekLayoutSheet({ trainingDays, combatTrainingDays, sessionsPerWeek, onSave, onClose }: Props) {
  const [lift, setLift] = useState<number[]>(trainingDays);
  const [mat, setMat] = useState<CombatTrainingDay[]>(combatTrainingDays);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggleLift = (d: number) => setLift(l => (l.includes(d) ? l.filter(x => x !== d) : [...l, d]));
  // One tap cycles: none → light → moderate → hard → none (keeps extra sessions / labels on other days)
  const cycleMat = (d: number) => setMat(m => {
    const cur = m.find(c => c.day === d);
    const next = NEXT[cur?.intensity ?? 'none'];
    const rest = m.filter(c => c.day !== d);
    if (!next) return rest;
    return [...rest, { ...(cur ?? {}), day: d, intensity: next }];
  });

  const flexible = Math.max(0, sessionsPerWeek - lift.length);
  const hardDays = mat.filter(c => c.intensity === 'hard').map(c => c.day);
  const liftOnHard = lift.filter(d => hardDays.includes(d)).length;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog" aria-modal="true" aria-label="Week layout"
    >
      <div className="w-full max-w-lg rounded-t-2xl bg-grappler-900 border-t border-grappler-700 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" data-testid="week-layout-sheet">
        <div className="w-10 h-1 bg-grappler-700 rounded-full mx-auto mb-3" />
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-grappler-50">Your week</h2>
            <p className="text-xs text-grappler-400">Lift days and mat days. Your block moves onto them — nothing is rebuilt.</p>
          </div>
          <button onClick={onClose} aria-label="Close week layout" className="w-8 h-8 rounded-full bg-grappler-800 flex items-center justify-center text-grappler-400 hover:text-grappler-200 flex-shrink-0" data-tight>
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs font-semibold text-grappler-300 mb-1.5 flex items-center gap-1.5"><Dumbbell className="w-3.5 h-3.5" /> Lift days</p>
        <div className="grid grid-cols-7 gap-1.5 mb-4">
          {WEEK_ORDER.map(d => (
            <button
              key={d}
              onClick={() => toggleLift(d)}
              aria-pressed={lift.includes(d)}
              className={cn('h-11 rounded-lg border text-xs font-bold',
                lift.includes(d) ? 'bg-primary-500/20 border-primary-500/50 text-primary-200' : 'border-grappler-700 text-grappler-400')}
              data-testid={`lift-day-${d}`}
            >{DAY_SHORT[d]}</button>
          ))}
        </div>

        <p className="text-xs font-semibold text-grappler-300 mb-1.5 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Mat days <span className="font-normal text-grappler-500">— tap to cycle light · moderate · hard</span></p>
        <div className="grid grid-cols-7 gap-1.5 mb-3">
          {WEEK_ORDER.map(d => {
            const c = mat.find(x => x.day === d);
            return (
              <button
                key={d}
                onClick={() => cycleMat(d)}
                className={cn('h-11 rounded-lg border text-xs font-bold flex flex-col items-center justify-center leading-tight',
                  c ? TONE[c.intensity] : 'border-grappler-700 text-grappler-400')}
                aria-label={`${DAY_SHORT[d]} mats: ${c?.intensity ?? 'none'}`}
                data-testid={`mat-day-${d}`}
              >
                {DAY_SHORT[d]}
                <span className="text-[11px] font-medium capitalize">{c?.intensity ?? ''}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-1 mb-4 text-[11px] min-h-[16px]">
          {flexible > 0 && <p className="text-amber-300">Your block has {sessionsPerWeek} sessions a week — {flexible} will be flexible (no fixed day).</p>}
          {lift.length > sessionsPerWeek && <p className="text-grappler-400">{lift.length - sessionsPerWeek} lift day{lift.length - sessionsPerWeek === 1 ? '' : 's'} will stay free.</p>}
          {liftOnHard > 0 && <p className="text-grappler-400">Lifting on a hard mat day — the app eases legs & grip on those days.</p>}
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn btn-secondary btn-md flex-1">Cancel</button>
          <button
            onClick={() => onSave(lift, mat)}
            disabled={lift.length === 0}
            className="btn btn-primary btn-md flex-1"
            data-testid="save-layout"
          >Save week</button>
        </div>
      </div>
    </motion.div>
  );
}
