'use client';

/**
 * AthleticBenchmarks — quantified combat athleticism dashboard
 *
 * Six tested attributes with tier classification, progression tracking, and
 * targeted program suggestions for the user's weakest area.
 */

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, BarChart3, Target, ArrowRight, Plus, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Minus, Zap, Flame, Sparkles,
  Trash2, Activity,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import {
  BENCHMARK_SPECS,
  classifyTier,
  tierLabel,
  bestResult,
  summarize,
  findWeakestAttribute,
  shouldRetest,
  buildResult,
  type BenchmarkSpec,
  type BenchmarkSummary,
  type BenchmarkId,
} from '@/lib/athletic-benchmarks';
import { cn } from '@/lib/utils';
import { useToast } from './Toast';
import type { OverlayView } from './dashboard-types';

interface Props {
  onClose: () => void;
  onNavigate?: (view: OverlayView) => void;
}

const TIER_COLOR: Record<BenchmarkSummary['tier'], { bg: string; text: string; border: string }> = {
  elite:        { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  advanced:     { bg: 'bg-sky-500/15',     text: 'text-sky-300',     border: 'border-sky-500/30' },
  intermediate: { bg: 'bg-amber-500/15',   text: 'text-amber-300',   border: 'border-amber-500/30' },
  beginner:     { bg: 'bg-rose-500/15',    text: 'text-rose-300',    border: 'border-rose-500/30' },
  untested:     { bg: 'bg-grappler-800/40',text: 'text-grappler-400',border: 'border-grappler-700/50' },
};

export default function AthleticBenchmarks({ onClose, onNavigate }: Props) {
  const benchmarkResults = useAppStore(s => s.benchmarkResults ?? []);
  const addBenchmarkResult = useAppStore(s => s.addBenchmarkResult);

  const [logId, setLogId] = useState<BenchmarkId | null>(null);
  const [detailId, setDetailId] = useState<BenchmarkId | null>(null);

  const summaries = useMemo(
    () => BENCHMARK_SPECS.map(spec => summarize(spec.id, benchmarkResults)),
    [benchmarkResults]
  );

  const weakest = useMemo(() => findWeakestAttribute(summaries), [summaries]);
  const tested = summaries.filter(s => s.tier !== 'untested').length;

  return (
    <div className="fixed inset-0 z-50 bg-grappler-950 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-grappler-950 border-b border-grappler-800 px-4 py-3 safe-area-top flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-400" />
          <div>
            <h1 className="text-lg font-bold text-white">Athletic Benchmarks</h1>
            <p className="text-[11px] text-grappler-400">Combat athleticism, tested</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" className="p-3 -mr-1 hover:bg-grappler-800 rounded-lg active:scale-95 transition">
          <X className="w-5 h-5 text-grappler-300" />
        </button>
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto pb-24 space-y-4">
        {/* Header card */}
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4">
          <h2 className="font-bold text-white">{tested} of {BENCHMARK_SPECS.length} tested</h2>
          <p className="text-xs text-emerald-200/90 mt-1">
            Re-test every 4-6 weeks. The numbers tell you what training is working — and what isn't.
          </p>
        </div>

        {/* Weakest attribute call-out */}
        {weakest && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-5 h-5 text-rose-400" />
              <h3 className="font-bold text-white">Your weakest link</h3>
            </div>
            <p className="text-sm text-rose-100 mb-3">
              <strong>{weakest.name}</strong> — {weakest.reason}
            </p>
            <div className="space-y-1.5 mb-3">
              {weakest.suggestedTraining.slice(0, 3).map((s, i) => (
                <div key={i} className="text-xs text-grappler-200 flex gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                  {s}
                </div>
              ))}
            </div>
            {onNavigate && weakest.suggestedToolId && (
              <button
                onClick={() => onNavigate(weakest.suggestedToolId as OverlayView)}
                className="w-full py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-sm font-semibold transition flex items-center justify-center gap-2"
              >
                Open targeted program
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Benchmark cards */}
        <div className="space-y-2">
          {summaries.map(summary => {
            const spec = BENCHMARK_SPECS.find(s => s.id === summary.benchmarkId)!;
            const isOpen = detailId === summary.benchmarkId;
            const colors = TIER_COLOR[summary.tier];
            const retest = shouldRetest(summary);
            return (
              <div key={spec.id} className="rounded-xl bg-grappler-900/60 border border-grappler-800 overflow-hidden">
                <button
                  onClick={() => setDetailId(isOpen ? null : spec.id)}
                  className="w-full p-4 flex items-start gap-3 hover:bg-grappler-900/80 transition text-left"
                >
                  <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 border', colors.bg, colors.border)}>
                    <CategoryIcon category={spec.category} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                      <h3 className="text-sm font-bold text-white truncate">{spec.name}</h3>
                      {summary.tier !== 'untested' ? (
                        <span className={cn('text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border whitespace-nowrap', colors.bg, colors.text, colors.border)}>
                          {tierLabel(summary.tier)}
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase text-grappler-500">Not tested</span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2">
                      {summary.best > 0 && (
                        <span className="text-xl font-bold text-white font-mono">
                          {summary.best.toFixed(spec.unit === 's' ? 2 : spec.unit === 'm' ? 2 : 0)}
                          <span className="text-xs text-grappler-400 ml-0.5 font-sans">{spec.unit}</span>
                        </span>
                      )}
                      {summary.changeAllTime !== 0 && summary.results.length > 1 && (
                        <span className={cn('text-xs font-mono', summary.changeAllTime > 0 ? 'text-emerald-400' : 'text-rose-400')}>
                          {summary.changeAllTime > 0 ? '+' : ''}
                          {summary.changeAllTime.toFixed(spec.unit === 's' ? 2 : spec.unit === 'm' ? 2 : 0)}
                        </span>
                      )}
                      {retest && summary.tier !== 'untested' && (
                        <span className="text-[10px] text-amber-400 ml-auto">Time to re-test</span>
                      )}
                    </div>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-grappler-400 mt-1" /> : <ChevronDown className="w-4 h-4 text-grappler-400 mt-1" />}
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                      className="overflow-hidden border-t border-grappler-800"
                    >
                      <BenchmarkDetail
                        spec={spec}
                        summary={summary}
                        onLog={() => setLogId(spec.id)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {logId && (
          <LogModal
            spec={BENCHMARK_SPECS.find(s => s.id === logId)!}
            onClose={() => setLogId(null)}
            onLog={(value, notes) => {
              addBenchmarkResult(buildResult({
                benchmarkId: logId,
                date: new Date().toISOString(),
                value,
                notes,
              }));
              setLogId(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Detail panel
// ─────────────────────────────────────────────────────────────────────────

function BenchmarkDetail({ spec, summary, onLog }: { spec: BenchmarkSpec; summary: BenchmarkSummary; onLog: () => void }) {
  const deleteBenchmarkResult = useAppStore(s => s.deleteBenchmarkResult);

  return (
    <div className="p-4 space-y-3">
      <p className="text-xs text-grappler-300 leading-relaxed">{spec.description}</p>

      <div className="rounded-lg bg-grappler-950/60 border border-grappler-800 p-3">
        <div className="text-[10px] uppercase text-grappler-500 font-bold mb-1">Combat Relevance</div>
        <p className="text-xs text-grappler-200">{spec.combatRelevance}</p>
      </div>

      {/* Tier ladder */}
      <div className="rounded-lg bg-grappler-950/60 border border-grappler-800 p-3">
        <div className="text-[10px] uppercase text-grappler-500 font-bold mb-2">Tier Thresholds</div>
        <div className="space-y-1 text-xs">
          {(['elite', 'advanced', 'intermediate', 'beginner'] as const).map(t => {
            const v = spec.tiers[t];
            const isCurrent = summary.tier === t;
            return (
              <div
                key={t}
                className={cn(
                  'flex items-center justify-between px-2 py-1 rounded',
                  isCurrent ? 'bg-grappler-800 ring-1 ring-emerald-500/50' : ''
                )}
              >
                <span className="capitalize text-grappler-300">{t}</span>
                <span className="font-mono text-grappler-200">
                  {spec.higherIsBetter ? '≥' : '≤'} {v} {spec.unit}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Protocol */}
      <details className="rounded-lg bg-grappler-950/60 border border-grappler-800 p-3">
        <summary className="text-[10px] uppercase text-grappler-300 font-bold cursor-pointer">How to test</summary>
        <ul className="mt-2 space-y-1 text-xs text-grappler-300">
          {spec.protocol.map((p, i) => <li key={i}>• {p}</li>)}
        </ul>
      </details>

      {/* History */}
      {summary.results.length > 0 && (
        <div className="rounded-lg bg-grappler-950/60 border border-grappler-800 p-3">
          <div className="text-[10px] uppercase text-grappler-500 font-bold mb-2">History ({summary.results.length})</div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {[...summary.results].reverse().map(r => (
              <div key={r.id} className="flex items-center justify-between text-xs py-1">
                <span className="text-grappler-400">{new Date(r.date).toLocaleDateString()}</span>
                <span className="font-mono text-grappler-200">{r.value} {spec.unit}</span>
                <button
                  onClick={() => deleteBenchmarkResult(r.id)}
                  className="text-grappler-500 hover:text-rose-400 transition"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onLog}
        className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm transition flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Log {spec.shortName} Test
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Log modal
// ─────────────────────────────────────────────────────────────────────────

function LogModal({ spec, onClose, onLog }: {
  spec: BenchmarkSpec;
  onClose: () => void;
  onLog: (value: number, notes?: string) => void;
}) {
  const [value, setValue] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const { showToast } = useToast();

  const submit = () => {
    if (value <= 0) {
      showToast('Enter a value', 'error');
      return;
    }
    onLog(value, notes.trim() || undefined);
    showToast('Test logged', 'success');
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
        className="w-full max-w-md bg-grappler-900 rounded-lg border border-grappler-800 max-h-[85vh] flex flex-col"
      >
        {/* Sticky header */}
        <div className="px-5 pt-5 pb-3 border-b border-grappler-800">
          <div className="flex items-baseline justify-between mb-1">
            <h2 className="text-lg font-bold text-white">Log {spec.name}</h2>
            <button onClick={onClose} aria-label="Close" className="p-2 -mr-1 hover:bg-grappler-800 rounded-lg active:scale-95 transition">
              <X className="w-5 h-5 text-grappler-400" />
            </button>
          </div>
          <p className="text-xs text-grappler-300">{spec.description}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <div>
            <label className="text-xs text-grappler-300 block mb-1">Result ({spec.unit})</label>
            <input
              type="number"
              step={spec.unit === 's' ? 0.01 : spec.unit === 'm' ? 0.01 : 1}
              value={value || ''}
              onChange={e => setValue(Number(e.target.value))}
              placeholder={`e.g. ${spec.tiers.intermediate}`}
              className="w-full px-3 py-2.5 rounded-lg bg-grappler-950 border border-grappler-800 text-white text-lg font-mono focus:border-emerald-500 outline-none"
              autoFocus
            />
          </div>

          {value > 0 && (
            <div className="text-xs text-grappler-300">
              Tier: <strong className="text-white">{tierLabel(classifyTier(spec, value))}</strong>
            </div>
          )}

          <div>
            <label className="text-xs text-grappler-300 block mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-grappler-950 border border-grappler-800 text-sm text-white placeholder-grappler-500 resize-none focus:border-emerald-500 outline-none"
              placeholder="Conditions, attempts, anything notable…"
            />
          </div>
        </div>

        {/* Sticky footer */}
        <div className="px-5 pt-3 pb-5 border-t border-grappler-800 safe-area-bottom">
          <button
            onClick={submit}
            className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold transition active:scale-[0.98]"
          >
            Log Test
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function CategoryIcon({ category }: { category: BenchmarkSpec['category'] }) {
  switch (category) {
    case 'force':      return <Target className="w-5 h-5 text-emerald-400" />;
    case 'velocity':   return <Zap className="w-5 h-5 text-amber-400" />;
    case 'capacity':   return <Activity className="w-5 h-5 text-sky-400" />;
    case 'durability': return <Flame className="w-5 h-5 text-rose-400" />;
  }
}
