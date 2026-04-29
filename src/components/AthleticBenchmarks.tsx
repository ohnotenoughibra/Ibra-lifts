'use client';

/**
 * AthleticBenchmarks — quantified combat athleticism dashboard.
 *
 * Editorial brutalist refactor: kills the 5-tier rainbow, the
 * accordion-in-card detail panel becomes a separate ToolShell view, the
 * log modal becomes a full ToolShell with sticky CTA.
 */

import { useMemo, useState } from 'react';
import { ChevronRight, Trash2, ArrowRight } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import {
  BENCHMARK_SPECS,
  classifyTier,
  tierLabel,
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
import { ToolShell, Section, HeroMetric, PrimaryCTA, Stat } from './_ToolShell';

interface Props {
  onClose: () => void;
  onNavigate?: (view: OverlayView) => void;
}

const TIER_ACCENT: Record<BenchmarkSummary['tier'], 'go' | 'info' | 'caution' | 'danger'> = {
  elite:        'go',
  advanced:     'go',
  intermediate: 'caution',
  beginner:     'danger',
  untested:     'info',
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
  const weakestSpec = weakest ? BENCHMARK_SPECS.find(s => s.id === weakest.benchmarkId) : null;
  const tested = summaries.filter(s => s.tier !== 'untested').length;

  if (logId) {
    const spec = BENCHMARK_SPECS.find(s => s.id === logId)!;
    return (
      <LogView
        spec={spec}
        onBack={() => setLogId(null)}
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
    );
  }

  if (detailId) {
    const spec = BENCHMARK_SPECS.find(s => s.id === detailId)!;
    const summary = summaries.find(s => s.benchmarkId === detailId)!;
    return (
      <DetailView
        spec={spec}
        summary={summary}
        onBack={() => setDetailId(null)}
        onLog={() => { setDetailId(null); setLogId(spec.id); }}
      />
    );
  }

  return (
    <ToolShell
      onClose={onClose}
      eyebrow="IBRA / 05 · BENCHMARKS"
      title={<>Test the<br/>numbers.</>}
      description="Six combat-relevant attributes. Re-test every 4-6 weeks. The numbers tell you what training is working."
    >
      <div className="grid grid-cols-2 gap-2">
        <Stat value={`${tested}/${BENCHMARK_SPECS.length}`} label="Tested" />
        <Stat value={weakestSpec?.shortName ?? '—'} label="Weakest" accent={weakest ? 'caution' : 'go'} />
      </div>

      {weakest && (
        <Section title="Weakest Link">
          <p className="text-sm text-grappler-200 mb-3">
            <strong className="text-white">{weakest.name}</strong> — {weakest.reason}
          </p>
          <ul className="space-y-1 mb-3">
            {weakest.suggestedTraining.slice(0, 3).map((s, i) => (
              <li key={i} className="text-xs text-grappler-300 flex gap-2">
                <span className="text-grappler-600">·</span>{s}
              </li>
            ))}
          </ul>
          {onNavigate && weakest.suggestedToolId && (
            <button
              onClick={() => onNavigate(weakest.suggestedToolId as OverlayView)}
              className="w-full py-2 rounded-lg bg-grappler-800/60 hover:bg-grappler-800 text-grappler-100 text-sm font-semibold transition flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              Open targeted program
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </Section>
      )}

      <Section title="Benchmarks">
        <div className="space-y-1">
          {summaries.map(summary => {
            const spec = BENCHMARK_SPECS.find(s => s.id === summary.benchmarkId)!;
            const retest = shouldRetest(summary);
            const decimals = spec.unit === 's' ? 2 : spec.unit === 'm' ? 2 : 0;
            return (
              <button
                key={spec.id}
                onClick={() => setDetailId(spec.id)}
                className="w-full flex items-center justify-between gap-3 py-3 -mx-1 px-1 border-b border-grappler-800 last:border-0 hover:bg-grappler-800/30 transition active:scale-[0.99] text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <h3 className="text-sm font-bold text-white truncate">{spec.name}</h3>
                    {summary.tier !== 'untested' && (
                      <span className="text-[10px] uppercase tracking-[0.18em] text-grappler-500">
                        {tierLabel(summary.tier)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 text-[11px] font-mono tabular-nums">
                    {summary.best > 0 ? (
                      <>
                        <span className="text-white">
                          {summary.best.toFixed(decimals)}
                          <span className="text-grappler-500 ml-0.5">{spec.unit}</span>
                        </span>
                        {summary.changeAllTime !== 0 && summary.results.length > 1 && (
                          <span className={summary.changeAllTime > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {summary.changeAllTime > 0 ? '+' : ''}{summary.changeAllTime.toFixed(decimals)}
                          </span>
                        )}
                        {retest && (
                          <span className="text-amber-400 ml-auto">re-test</span>
                        )}
                      </>
                    ) : (
                      <span className="text-grappler-500">Not tested</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-grappler-500 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </Section>
    </ToolShell>
  );
}

// ─── Detail View ─────────────────────────────────────────────────────────

function DetailView({ spec, summary, onBack, onLog }: {
  spec: BenchmarkSpec;
  summary: BenchmarkSummary;
  onBack: () => void;
  onLog: () => void;
}) {
  const deleteBenchmarkResult = useAppStore(s => s.deleteBenchmarkResult);
  const decimals = spec.unit === 's' ? 2 : spec.unit === 'm' ? 2 : 0;
  const accent = TIER_ACCENT[summary.tier];

  return (
    <ToolShell
      onClose={onBack}
      eyebrow={`IBRA / 05 · ${spec.shortName.toUpperCase()}`}
      title={spec.name}
      description={spec.description}
      footer={<PrimaryCTA onClick={onLog} variant="go">Log {spec.shortName} Test</PrimaryCTA>}
    >
      <Section title="Current">
        {summary.best > 0 ? (
          <HeroMetric
            value={summary.best.toFixed(decimals)}
            unit={spec.unit}
            label={tierLabel(summary.tier)}
            state={summary.results.length > 1
              ? `${summary.changeAllTime > 0 ? '+' : ''}${summary.changeAllTime.toFixed(decimals)} all-time`
              : undefined}
            accent={accent}
          />
        ) : (
          <p className="text-sm text-grappler-400">No results yet. Log your first test.</p>
        )}
      </Section>

      <Section title="Combat Relevance">
        <p className="text-sm text-grappler-200">{spec.combatRelevance}</p>
      </Section>

      <Section title="Tier Thresholds">
        <div className="space-y-1">
          {(['elite', 'advanced', 'intermediate', 'beginner'] as const).map(t => {
            const v = spec.tiers[t];
            const isCurrent = summary.tier === t;
            return (
              <div
                key={t}
                className={cn(
                  'flex items-center justify-between py-1.5 border-b border-grappler-800 last:border-0',
                  isCurrent && 'border-l-2 border-l-white pl-2 -ml-2'
                )}
              >
                <span className={cn('capitalize text-xs', isCurrent ? 'text-white font-bold' : 'text-grappler-400')}>{t}</span>
                <span className="font-mono tabular-nums text-xs text-white">
                  {spec.higherIsBetter ? '≥' : '≤'} {v} {spec.unit}
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="How to Test">
        <ul className="space-y-1 text-sm text-grappler-200">
          {spec.protocol.map((p, i) => <li key={i} className="flex gap-2"><span className="text-grappler-600">·</span>{p}</li>)}
        </ul>
      </Section>

      {summary.results.length > 0 && (
        <Section title="History" hint={`${summary.results.length}`}>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {[...summary.results].reverse().map(r => (
              <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-grappler-800 last:border-0">
                <span className="text-xs text-grappler-400 font-mono tabular-nums">{new Date(r.date).toLocaleDateString()}</span>
                <span className="font-mono tabular-nums text-xs text-white">{r.value} {spec.unit}</span>
                <button
                  onClick={() => deleteBenchmarkResult(r.id)}
                  className="text-grappler-600 hover:text-rose-400 transition p-1"
                  aria-label="Delete result"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}
    </ToolShell>
  );
}

// ─── Log View ────────────────────────────────────────────────────────────

function LogView({ spec, onBack, onLog }: {
  spec: BenchmarkSpec;
  onBack: () => void;
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
    <ToolShell
      onClose={onBack}
      eyebrow={`IBRA / 05 · LOG · ${spec.shortName.toUpperCase()}`}
      title={`Log ${spec.name}`}
      description={spec.description}
      footer={<PrimaryCTA onClick={submit} variant="go">Log Test</PrimaryCTA>}
    >
      <Section title="Result" hint={spec.unit}>
        <input
          type="number" inputMode="decimal" enterKeyHint="done"
          step={spec.unit === 's' ? 0.01 : spec.unit === 'm' ? 0.01 : 1}
          value={value || ''}
          onChange={e => setValue(Number(e.target.value))}
          placeholder={`e.g. ${spec.tiers.intermediate}`}
          className="w-full px-3 py-3 rounded-lg bg-grappler-950 border border-grappler-800 text-white text-2xl font-mono tabular-nums focus:border-grappler-500 outline-none"
          autoFocus
        />
        {value > 0 && (
          <p className="text-xs text-grappler-400 mt-2">
            Tier: <strong className="text-white">{tierLabel(classifyTier(spec, value))}</strong>
          </p>
        )}
      </Section>

      <Section title="Notes" hint="optional">
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded-lg bg-grappler-950 border border-grappler-800 text-sm text-white placeholder-grappler-500 resize-none focus:border-grappler-500 outline-none"
          placeholder="Conditions, attempts, anything notable…"
        />
      </Section>
    </ToolShell>
  );
}
