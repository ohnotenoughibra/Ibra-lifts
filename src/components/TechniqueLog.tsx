'use client';

/**
 * TechniqueLog — combat-athlete drilling tracker
 *
 * The missing companion to lift logging: log technique reps to track
 * where skill is compounding. Greg Jackson's "10,000 reps for mastery"
 * rule, made trackable.
 */

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, Trash2, ChevronDown, ChevronUp, Activity,
  Flame, TrendingUp, Calendar, Target,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import {
  TECHNIQUE_CATEGORIES,
  buildTechniqueEntry,
  getTechniqueProgress,
  getMasteryTier,
  tierLabel,
  getRepsInWindow,
  getNeglectedCategories,
  type TechniqueCategory,
} from '@/lib/technique-log';
import { cn } from '@/lib/utils';
import { useToast } from './Toast';

interface Props { onClose: () => void }

const TIER_COLOR: Record<ReturnType<typeof getMasteryTier>, { bg: string; text: string; border: string }> = {
  new:         { bg: 'bg-grappler-800/40',    text: 'text-grappler-400',  border: 'border-grappler-700/50' },
  familiar:    { bg: 'bg-sky-500/15',         text: 'text-sky-300',       border: 'border-sky-500/30' },
  working:     { bg: 'bg-amber-500/15',       text: 'text-amber-300',     border: 'border-amber-500/30' },
  competition: { bg: 'bg-emerald-500/15',     text: 'text-emerald-300',   border: 'border-emerald-500/30' },
  mastery:     { bg: 'bg-violet-500/15',      text: 'text-violet-300',    border: 'border-violet-500/30' },
};

export default function TechniqueLog({ onClose }: Props) {
  const { showToast } = useToast();
  const techniqueLog = useAppStore(s => s.techniqueLog ?? []);
  const addTechniqueEntry = useAppStore(s => s.addTechniqueEntry);
  const deleteTechniqueEntry = useAppStore(s => s.deleteTechniqueEntry);

  const [showLog, setShowLog] = useState(false);

  const progress = useMemo(() => getTechniqueProgress(techniqueLog), [techniqueLog]);
  const repsLast7 = useMemo(() => getRepsInWindow(techniqueLog, 7), [techniqueLog]);
  const repsLast30 = useMemo(() => getRepsInWindow(techniqueLog, 30), [techniqueLog]);
  const neglected = useMemo(() => getNeglectedCategories(techniqueLog, 14), [techniqueLog]);

  return (
    <div className="fixed inset-0 z-50 bg-grappler-950 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-grappler-950/95 backdrop-blur border-b border-grappler-800 px-4 py-3 safe-area-top flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-amber-400" />
          <div>
            <h1 className="text-lg font-bold text-white">Technique Log</h1>
            <p className="text-[11px] text-grappler-400">Reps compound into skill</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" className="p-3 -mr-1 hover:bg-grappler-800 rounded-lg active:scale-95 transition">
          <X className="w-5 h-5 text-grappler-300" />
        </button>
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto pb-24 space-y-4">
        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Last 7d" value={repsLast7} suffix="reps" />
          <Stat label="Last 30d" value={repsLast30} suffix="reps" />
          <Stat label="Total reps" value={techniqueLog.reduce((s, e) => s + e.reps, 0)} suffix="" />
        </div>

        {/* Neglected callout */}
        {neglected.length > 0 && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Cold zones (14+ days)</h3>
            </div>
            <p className="text-xs text-amber-200">
              You haven&apos;t drilled: <strong>{neglected.map(c => TECHNIQUE_CATEGORIES.find(t => t.id === c)?.label).join(', ')}</strong>. Skill rusts faster than strength.
            </p>
          </div>
        )}

        {/* Log button */}
        <button
          onClick={() => setShowLog(true)}
          className="w-full px-5 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-grappler-950 font-bold transition flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Log Technique
        </button>

        {/* Progress list */}
        {progress.length === 0 ? (
          <div className="rounded-xl bg-grappler-900/40 border border-grappler-800 p-6 text-center">
            <Target className="w-8 h-8 text-grappler-600 mx-auto mb-2" />
            <p className="text-sm text-grappler-300 font-semibold mb-1">Nothing logged yet.</p>
            <p className="text-xs text-grappler-400">Log your first drilling session to start tracking the rep count behind your skill.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-grappler-400 px-1">By Technique</h3>
            {progress.map(p => {
              const tier = getMasteryTier(p.totalReps);
              const colors = TIER_COLOR[tier];
              return (
                <div key={`${p.category}-${p.technique}`} className="rounded-xl bg-grappler-900/60 border border-grappler-800 p-3">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{p.technique}</div>
                      <div className="text-[11px] text-grappler-400 capitalize">
                        {TECHNIQUE_CATEGORIES.find(c => c.id === p.category)?.label}
                      </div>
                    </div>
                    <span className={cn('text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border whitespace-nowrap', colors.bg, colors.text, colors.border)}>
                      {tierLabel(tier)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] text-grappler-400">
                    <span><strong className="text-white">{p.totalReps}</strong> reps</span>
                    <span><strong className="text-white">{p.sessionsCount}</strong> sessions</span>
                    <span><strong className="text-white">{p.averageRepsPerSession}</strong>/avg</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Recent entries */}
        {techniqueLog.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-grappler-400 px-1 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" /> Recent ({techniqueLog.length})
            </h3>
            <div className="rounded-xl bg-grappler-900/40 border border-grappler-800 p-3 max-h-80 overflow-y-auto">
              {[...techniqueLog].reverse().slice(0, 30).map(e => (
                <div key={e.id} className="flex items-center justify-between py-1.5 text-xs border-b border-grappler-800 last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="text-white truncate">{e.technique}</div>
                    <div className="text-grappler-500 text-[10px]">
                      {new Date(e.date).toLocaleDateString()} · {e.reps} reps {e.withResistance ? '· w/ resistance' : ''}
                    </div>
                  </div>
                  <button onClick={() => deleteTechniqueEntry(e.id)} className="text-grappler-500 hover:text-rose-400 transition p-1 ml-2">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showLog && (
          <LogModal
            onClose={() => setShowLog(false)}
            onLog={(entry) => {
              addTechniqueEntry(buildTechniqueEntry(entry));
              showToast('Technique logged', 'success');
              setShowLog(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────

function Stat({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <div className="rounded-xl bg-grappler-900/60 border border-grappler-800 p-3 text-center">
      <div className="text-xl font-bold font-mono text-white">{value}</div>
      <div className="text-[10px] uppercase text-grappler-400">{label} {suffix}</div>
    </div>
  );
}

function LogModal({ onClose, onLog }: {
  onClose: () => void;
  onLog: (entry: Omit<import('@/lib/technique-log').TechniqueEntry, 'id'>) => void;
}) {
  const [technique, setTechnique] = useState('');
  const [category, setCategory] = useState<TechniqueCategory>('takedown');
  const [reps, setReps] = useState(20);
  const [withResistance, setWithResistance] = useState(false);
  const [partner, setPartner] = useState('');
  const [notes, setNotes] = useState('');
  const { showToast } = useToast();

  const submit = () => {
    if (!technique.trim()) {
      showToast('Name the technique', 'error');
      return;
    }
    if (reps <= 0) {
      showToast('Enter rep count', 'error');
      return;
    }
    onLog({
      date: new Date().toISOString(),
      technique: technique.trim(),
      category,
      reps,
      withResistance,
      partnerName: partner.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-grappler-900 rounded-lg border border-grappler-800 p-5 max-h-[85vh] overflow-y-auto safe-area-bottom"
      >
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-bold text-white">Log Technique</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-grappler-400" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-grappler-300 block mb-1">Technique name</label>
            <input
              type="text"
              value={technique}
              onChange={e => setTechnique(e.target.value)}
              placeholder="e.g. Single-leg takedown"
              className="w-full px-3 py-2.5 rounded-lg bg-grappler-950 border border-grappler-800 text-white focus:border-amber-500 outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-grappler-300 block mb-1">Category</label>
            <div className="grid grid-cols-3 gap-1.5">
              {TECHNIQUE_CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    'px-2 py-1.5 rounded-lg text-xs font-medium border transition',
                    category === c.id
                      ? 'bg-amber-500 border-amber-500 text-grappler-950'
                      : 'bg-grappler-800/40 border-grappler-800 text-grappler-300 hover:border-grappler-700'
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-grappler-500 mt-1">{TECHNIQUE_CATEGORIES.find(c => c.id === category)?.example}</p>
          </div>

          <div>
            <label className="text-xs text-grappler-300 block mb-1">Reps</label>
            <input
              type="number"
              min={1} step={1}
              value={reps || ''}
              onChange={e => setReps(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-lg bg-grappler-950 border border-grappler-800 text-white text-lg font-mono focus:border-amber-500 outline-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={withResistance}
              onChange={e => setWithResistance(e.target.checked)}
              className="w-4 h-4 accent-amber-500"
            />
            <span className="text-sm text-grappler-200">With resistance (partial-resisting partner)</span>
          </label>

          <div>
            <label className="text-xs text-grappler-300 block mb-1">Partner (optional)</label>
            <input
              type="text"
              value={partner}
              onChange={e => setPartner(e.target.value)}
              placeholder="Name or initials"
              className="w-full px-3 py-2 rounded-lg bg-grappler-950 border border-grappler-800 text-sm text-white placeholder-grappler-500 focus:border-amber-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-grappler-300 block mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="What clicked, what didn't, setups…"
              className="w-full px-3 py-2 rounded-lg bg-grappler-950 border border-grappler-800 text-sm text-white placeholder-grappler-500 resize-none focus:border-amber-500 outline-none"
            />
          </div>

          <button
            onClick={submit}
            className="w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-grappler-950 font-bold transition"
          >
            Log
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
