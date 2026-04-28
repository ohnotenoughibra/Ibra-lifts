'use client';

/**
 * SparringTracker — round-count load with CTE-aware risk assessment.
 *
 * Live sparring rounds are a top-3 concussion risk metric for combat
 * athletes (Lystad 2014, Yates 2020). Tracking total mat-time conflates
 * cooperative drilling with hard exchanges. This separates them.
 */

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, Trash2, AlertTriangle, Activity, Calendar, Shield,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import {
  buildSparringRound,
  assessSparringLoad,
  DISCIPLINES,
  INTENSITY_LABELS,
  type SparringDiscipline,
  type SparringIntensity,
  type PartnerLevel,
} from '@/lib/sparring-tracker';
import { cn } from '@/lib/utils';
import { useToast } from './Toast';

interface Props { onClose: () => void }

const RISK_COLOR: Record<ReturnType<typeof assessSparringLoad>['risk'], { bg: string; text: string; border: string }> = {
  low:       { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  moderate:  { bg: 'bg-sky-500/15',     text: 'text-sky-300',     border: 'border-sky-500/30' },
  elevated:  { bg: 'bg-amber-500/15',   text: 'text-amber-300',   border: 'border-amber-500/30' },
  critical:  { bg: 'bg-rose-500/15',    text: 'text-rose-300',    border: 'border-rose-500/30' },
};

const INTENSITY_COLOR: Record<SparringIntensity, string> = {
  technical:   'bg-grappler-700/40 text-grappler-300',
  moderate:    'bg-sky-500/15 text-sky-300',
  hard:        'bg-amber-500/15 text-amber-300',
  competition: 'bg-rose-500/15 text-rose-300',
};

export default function SparringTracker({ onClose }: Props) {
  const { showToast } = useToast();
  const sparringRounds = useAppStore(s => s.sparringRounds ?? []);
  const addSparringRound = useAppStore(s => s.addSparringRound);
  const deleteSparringRound = useAppStore(s => s.deleteSparringRound);

  const [showLog, setShowLog] = useState(false);
  const assessment = useMemo(() => assessSparringLoad(sparringRounds), [sparringRounds]);
  const colors = RISK_COLOR[assessment.risk];

  return (
    <div className="fixed inset-0 z-50 bg-grappler-950 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-grappler-950/95 backdrop-blur border-b border-grappler-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-rose-400" />
          <div>
            <h1 className="text-lg font-bold text-white">Sparring Load</h1>
            <p className="text-[11px] text-grappler-400">Round count, separate from mat time</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" className="p-2 hover:bg-grappler-800 rounded-lg">
          <X className="w-5 h-5 text-grappler-300" />
        </button>
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto pb-24 space-y-4">
        {/* Risk assessment hero */}
        <div className={cn('rounded-lg border p-5', colors.bg, colors.border)}>
          <div className="flex items-baseline justify-between mb-2">
            <span className={cn('text-[10px] font-bold uppercase tracking-[0.25em]', colors.text)}>
              Load · {assessment.risk.toUpperCase()}
            </span>
            {assessment.risk !== 'low' && <AlertTriangle className={cn('w-4 h-4', colors.text)} />}
          </div>
          <p className="text-base text-white font-semibold leading-snug mb-2">{assessment.message}</p>
          <p className="text-xs text-grappler-300 leading-relaxed">{assessment.recommendation}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Total" value={String(assessment.weeklyRounds)} sub="rounds this wk" />
          <Stat label="Hard" value={String(assessment.weeklyHardRounds)} sub="effective" />
          <Stat label="ACWR" value={assessment.acwrRatio.toFixed(2)} sub="acute / chronic" />
        </div>

        {/* Threshold reference */}
        <div className="rounded-lg bg-grappler-900/40 border border-grappler-800 p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-grappler-500 mb-2">Risk thresholds</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-grappler-300">
            <span>≤ 24/wk hard</span><span className="text-emerald-400">low</span>
            <span>25-39/wk hard</span><span className="text-amber-400">elevated</span>
            <span>40+/wk hard</span><span className="text-rose-400">critical (CTE zone)</span>
            <span>ACWR &gt; 1.5×</span><span className="text-rose-400">spike (injury zone)</span>
          </div>
        </div>

        {/* Log button */}
        <button
          onClick={() => setShowLog(true)}
          className="w-full py-3.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold transition flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Log Sparring
        </button>

        {/* Recent entries */}
        {sparringRounds.length === 0 ? (
          <div className="rounded-lg bg-grappler-900/40 border border-grappler-800 p-6 text-center">
            <Shield className="w-8 h-8 text-grappler-600 mx-auto mb-2" />
            <p className="text-sm text-grappler-300 font-semibold mb-1">No sparring logged.</p>
            <p className="text-xs text-grappler-400">Log live rounds to track CTE-relevant load.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-grappler-500 px-1 flex items-center gap-2">
              <Calendar className="w-3 h-3" /> Recent ({sparringRounds.length})
            </div>
            <div className="rounded-lg bg-grappler-900/40 border border-grappler-800">
              {[...sparringRounds].reverse().slice(0, 30).map(r => {
                const disc = DISCIPLINES.find(d => d.id === r.discipline);
                return (
                  <div key={r.id} className="flex items-center justify-between px-3 py-2.5 border-b border-grappler-800 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-white font-semibold">{r.rounds}× {r.minutesPerRound}min</span>
                        <span className={cn('text-[10px] uppercase font-bold px-1.5 py-0.5 rounded', INTENSITY_COLOR[r.intensity])}>
                          {INTENSITY_LABELS[r.intensity].label}
                        </span>
                      </div>
                      <div className="text-[11px] text-grappler-500 mt-0.5">
                        {disc?.label} · {new Date(r.date).toLocaleDateString()}
                        {r.partnerName ? ` · ${r.partnerName}` : ''}
                      </div>
                    </div>
                    <button onClick={() => deleteSparringRound(r.id)} className="text-grappler-500 hover:text-rose-400 transition p-1 ml-2">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-[11px] text-grappler-500 text-center px-4">
          Effective hard rounds = round count × intensity weight (technical 0×, moderate 0.5×, hard 1.0×, competition 1.2×).
        </p>
      </div>

      <AnimatePresence>
        {showLog && (
          <LogModal
            onClose={() => setShowLog(false)}
            onLog={(entry) => {
              addSparringRound(buildSparringRound(entry));
              showToast('Logged', 'success');
              setShowLog(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg bg-grappler-900/60 border border-grappler-800 p-3 text-center">
      <div className="text-[10px] uppercase tracking-wider text-grappler-500">{label}</div>
      <div className="text-2xl font-bold font-mono text-white">{value}</div>
      <div className="text-[10px] text-grappler-500">{sub}</div>
    </div>
  );
}

function LogModal({ onClose, onLog }: {
  onClose: () => void;
  onLog: (entry: Omit<import('@/lib/sparring-tracker').SparringRound, 'id'>) => void;
}) {
  const [discipline, setDiscipline] = useState<SparringDiscipline>('bjj_nogi');
  const [rounds, setRounds] = useState(5);
  const [minutesPerRound, setMinutesPerRound] = useState(5);
  const [intensity, setIntensity] = useState<SparringIntensity>('moderate');
  const [partnerLevel, setPartnerLevel] = useState<PartnerLevel | undefined>(undefined);
  const [partnerName, setPartnerName] = useState('');
  const [notes, setNotes] = useState('');
  const { showToast } = useToast();

  const submit = () => {
    if (rounds <= 0) {
      showToast('Enter round count', 'error');
      return;
    }
    onLog({
      date: new Date().toISOString(),
      discipline,
      rounds,
      minutesPerRound,
      intensity,
      partnerLevel,
      partnerName: partnerName.trim() || undefined,
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
          <h2 className="text-lg font-bold text-white">Log Sparring</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-grappler-400" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-grappler-300 block mb-1">Discipline</label>
            <div className="grid grid-cols-3 gap-1.5">
              {DISCIPLINES.map(d => (
                <button
                  key={d.id}
                  onClick={() => setDiscipline(d.id)}
                  className={cn(
                    'px-2 py-1.5 rounded-lg text-xs font-medium border transition',
                    discipline === d.id
                      ? 'bg-rose-500 border-rose-500 text-white'
                      : 'bg-grappler-800/40 border-grappler-800 text-grappler-300'
                  )}
                >{d.label}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-grappler-300 block mb-1">Rounds</label>
              <input
                type="number" min={1} step={1}
                value={rounds || ''}
                onChange={e => setRounds(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg bg-grappler-950 border border-grappler-800 text-white text-lg font-mono focus:border-rose-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-grappler-300 block mb-1">Min / round</label>
              <input
                type="number" min={1} step={1}
                value={minutesPerRound || ''}
                onChange={e => setMinutesPerRound(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg bg-grappler-950 border border-grappler-800 text-white text-lg font-mono focus:border-rose-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-grappler-300 block mb-1">Intensity</label>
            <div className="space-y-1.5">
              {(['technical', 'moderate', 'hard', 'competition'] as SparringIntensity[]).map(i => (
                <button
                  key={i}
                  onClick={() => setIntensity(i)}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg text-left border transition flex items-baseline justify-between',
                    intensity === i
                      ? 'bg-rose-500/15 border-rose-500/40'
                      : 'bg-grappler-800/40 border-grappler-800'
                  )}
                >
                  <span className={cn('text-sm font-semibold', intensity === i ? 'text-white' : 'text-grappler-200')}>
                    {INTENSITY_LABELS[i].label}
                  </span>
                  <span className="text-[10px] text-grappler-400">{INTENSITY_LABELS[i].description}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-grappler-300 block mb-1">Partner level (optional)</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['lower', 'similar', 'higher'] as PartnerLevel[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPartnerLevel(partnerLevel === p ? undefined : p)}
                  className={cn(
                    'px-2 py-1.5 rounded-lg text-xs font-medium border capitalize transition',
                    partnerLevel === p
                      ? 'bg-grappler-100 border-grappler-100 text-grappler-950'
                      : 'bg-grappler-800/40 border-grappler-800 text-grappler-300'
                  )}
                >{p}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-grappler-300 block mb-1">Partner name (optional)</label>
            <input
              type="text"
              value={partnerName}
              onChange={e => setPartnerName(e.target.value)}
              placeholder="Name or initials"
              className="w-full px-3 py-2 rounded-lg bg-grappler-950 border border-grappler-800 text-sm text-white focus:border-rose-500 outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-grappler-300 block mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="What worked, what didn't…"
              className="w-full px-3 py-2 rounded-lg bg-grappler-950 border border-grappler-800 text-sm text-white resize-none focus:border-rose-500 outline-none"
            />
          </div>

          <button
            onClick={submit}
            className="w-full py-3 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold transition"
          >
            Log
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
