'use client';

/**
 * SparringTracker — round-count load with CTE-aware risk assessment.
 *
 * Editorial brutalist refactor: log modal becomes a full ToolShell with
 * sticky CTA, the colored risk hero collapses into HeroMetric, intensity
 * pills lose their per-level rainbow.
 */

import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
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
import { ToolShell, Section, HeroMetric, PrimaryCTA, Stat } from './_ToolShell';

interface Props { onClose: () => void }

const RISK_ACCENT: Record<ReturnType<typeof assessSparringLoad>['risk'], 'go' | 'info' | 'caution' | 'danger'> = {
  low:      'go',
  moderate: 'info',
  elevated: 'caution',
  critical: 'danger',
};

export default function SparringTracker({ onClose }: Props) {
  const { showToast } = useToast();
  const sparringRounds = useAppStore(s => s.sparringRounds ?? []);
  const addSparringRound = useAppStore(s => s.addSparringRound);
  const deleteSparringRound = useAppStore(s => s.deleteSparringRound);

  const [showLog, setShowLog] = useState(false);
  const assessment = useMemo(() => assessSparringLoad(sparringRounds), [sparringRounds]);
  const accent = RISK_ACCENT[assessment.risk];

  if (showLog) {
    return (
      <LogView
        onBack={() => setShowLog(false)}
        onLog={(entry) => {
          addSparringRound(buildSparringRound(entry));
          showToast('Logged', 'success');
          setShowLog(false);
        }}
      />
    );
  }

  return (
    <ToolShell
      onClose={onClose}
      eyebrow="IBRA / 04 · SPARRING LOAD"
      title={<>Round count,<br/>not mat time.</>}
      description="Live exchanges separate from drilling. CTE-relevant load tracking."
      footer={<PrimaryCTA onClick={() => setShowLog(true)} variant="danger">Log Sparring</PrimaryCTA>}
    >
      <Section title="This Week">
        <HeroMetric
          value={assessment.weeklyHardRounds}
          label="Effective hard rounds"
          state={assessment.message}
          accent={accent}
        />
      </Section>

      <div className="grid grid-cols-3 gap-2">
        <Stat value={assessment.weeklyRounds} label="Total rds" />
        <Stat value={assessment.weeklyHardRounds} label="Hard rds" accent={accent} />
        <Stat value={assessment.acwrRatio.toFixed(2)} label="ACWR" accent={assessment.acwrRatio > 1.5 ? 'danger' : 'neutral'} />
      </div>

      <Section title="Recommendation">
        <p className="text-sm text-grappler-200 leading-relaxed">{assessment.recommendation}</p>
      </Section>

      <Section title="Risk Thresholds">
        <div className="space-y-1 text-[11px]">
          {[
            { label: '≤ 24 hard / wk', tier: 'low', color: 'text-emerald-400' },
            { label: '25-39 hard / wk', tier: 'elevated', color: 'text-amber-400' },
            { label: '40+ hard / wk', tier: 'critical · CTE zone', color: 'text-rose-400' },
            { label: 'ACWR > 1.5×', tier: 'spike · injury zone', color: 'text-rose-400' },
          ].map((row, i) => (
            <div key={i} className="flex justify-between py-1 border-b border-grappler-800 last:border-0">
              <span className="text-grappler-300 font-mono tabular-nums">{row.label}</span>
              <span className={row.color}>{row.tier}</span>
            </div>
          ))}
        </div>
      </Section>

      {sparringRounds.length === 0 ? (
        <Section title="Recent">
          <p className="text-sm text-grappler-400 text-center py-4">No sparring logged yet.</p>
        </Section>
      ) : (
        <Section title="Recent" hint={`${sparringRounds.length}`}>
          <div className="space-y-1">
            {[...sparringRounds].reverse().slice(0, 30).map(r => {
              const disc = DISCIPLINES.find(d => d.id === r.discipline);
              return (
                <div key={r.id} className="flex items-center justify-between gap-3 py-2 border-b border-grappler-800 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 text-sm">
                      <span className="text-white font-semibold font-mono tabular-nums">{r.rounds}× {r.minutesPerRound}m</span>
                      <span className="text-[10px] uppercase tracking-[0.18em] text-grappler-400">
                        {INTENSITY_LABELS[r.intensity].label}
                      </span>
                    </div>
                    <div className="text-[11px] text-grappler-500 mt-0.5">
                      {disc?.label} · {new Date(r.date).toLocaleDateString()}
                      {r.partnerName ? ` · ${r.partnerName}` : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteSparringRound(r.id)}
                    aria-label="Delete round"
                    className="text-grappler-600 hover:text-rose-400 transition p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <p className="text-[10px] text-grappler-500 text-center px-4 leading-relaxed">
        Effective rounds = count × intensity weight (technical 0×, moderate 0.5×, hard 1.0×, competition 1.2×).
      </p>
    </ToolShell>
  );
}

// ─── Log View ────────────────────────────────────────────────────────────

function LogView({ onBack, onLog }: {
  onBack: () => void;
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
    <ToolShell
      onClose={onBack}
      eyebrow="IBRA / 04 · LOG SPARRING"
      title="Log a session"
      description="Round count and intensity drive the load math."
      footer={<PrimaryCTA onClick={submit} variant="danger">Log</PrimaryCTA>}
    >
      <Section title="Discipline">
        <div className="grid grid-cols-3 gap-1.5">
          {DISCIPLINES.map(d => (
            <button
              key={d.id}
              onClick={() => setDiscipline(d.id)}
              className={cn(
                'px-2 py-1.5 rounded-lg text-xs font-medium border transition active:scale-[0.97]',
                discipline === d.id
                  ? 'bg-white border-white text-grappler-950'
                  : 'bg-transparent border-grappler-800 text-grappler-300'
              )}
            >{d.label}</button>
          ))}
        </div>
      </Section>

      <Section title="Volume">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-[0.18em] text-grappler-500 block mb-1">Rounds</label>
            <input
              type="number" inputMode="decimal" enterKeyHint="done" min={1} step={1}
              value={rounds || ''}
              onChange={e => setRounds(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-lg bg-grappler-950 border border-grappler-800 text-white text-xl font-mono tabular-nums focus:border-grappler-500 outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.18em] text-grappler-500 block mb-1">Min / round</label>
            <input
              type="number" inputMode="decimal" enterKeyHint="done" min={1} step={1}
              value={minutesPerRound || ''}
              onChange={e => setMinutesPerRound(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-lg bg-grappler-950 border border-grappler-800 text-white text-xl font-mono tabular-nums focus:border-grappler-500 outline-none"
            />
          </div>
        </div>
      </Section>

      <Section title="Intensity">
        <div className="space-y-1.5">
          {(['technical', 'moderate', 'hard', 'competition'] as SparringIntensity[]).map(i => (
            <button
              key={i}
              onClick={() => setIntensity(i)}
              className={cn(
                'w-full px-3 py-2 rounded-lg text-left border transition flex items-baseline justify-between active:scale-[0.99]',
                intensity === i
                  ? 'bg-grappler-800/60 border-grappler-700'
                  : 'bg-transparent border-grappler-800'
              )}
            >
              <span className={cn('text-sm font-semibold', intensity === i ? 'text-white' : 'text-grappler-200')}>
                {INTENSITY_LABELS[i].label}
              </span>
              <span className="text-[10px] text-grappler-500">{INTENSITY_LABELS[i].description}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Partner Level" hint="optional">
        <div className="grid grid-cols-3 gap-1.5">
          {(['lower', 'similar', 'higher'] as PartnerLevel[]).map(p => (
            <button
              key={p}
              onClick={() => setPartnerLevel(partnerLevel === p ? undefined : p)}
              className={cn(
                'px-2 py-1.5 rounded-lg text-xs font-medium border capitalize transition active:scale-[0.97]',
                partnerLevel === p
                  ? 'bg-white border-white text-grappler-950'
                  : 'bg-transparent border-grappler-800 text-grappler-300'
              )}
            >{p}</button>
          ))}
        </div>
      </Section>

      <Section title="Partner Name" hint="optional">
        <input
          type="text"
          value={partnerName}
          onChange={e => setPartnerName(e.target.value)}
          placeholder="Name or initials"
          className="w-full px-3 py-2 rounded-lg bg-grappler-950 border border-grappler-800 text-sm text-white focus:border-grappler-500 outline-none"
        />
      </Section>

      <Section title="Notes" hint="optional">
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="What worked, what didn't…"
          className="w-full px-3 py-2 rounded-lg bg-grappler-950 border border-grappler-800 text-sm text-white resize-none focus:border-grappler-500 outline-none"
        />
      </Section>
    </ToolShell>
  );
}
