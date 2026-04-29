'use client';

/**
 * TechniqueLog — combat-athlete drilling tracker. Greg Jackson 10000-rep
 * mastery tiers, made trackable.
 *
 * Editorial brutalist refactor: kills the 5-tier rainbow, log modal becomes
 * its own ToolShell with sticky CTA.
 */

import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
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
import { ToolShell, Section, PrimaryCTA, Stat } from './_ToolShell';

interface Props { onClose: () => void }

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
  const totalReps = techniqueLog.reduce((s, e) => s + e.reps, 0);

  if (showLog) {
    return (
      <LogView
        onBack={() => setShowLog(false)}
        onLog={(entry) => {
          addTechniqueEntry(buildTechniqueEntry(entry));
          showToast('Technique logged', 'success');
          setShowLog(false);
        }}
      />
    );
  }

  return (
    <ToolShell
      onClose={onClose}
      eyebrow="IBRA / 04 · TECHNIQUE LOG"
      title={<>Reps compound<br/>into skill.</>}
      description="Log drilling reps. Greg Jackson&apos;s 10000-rep rule, made visible."
      footer={<PrimaryCTA onClick={() => setShowLog(true)}>Log Technique</PrimaryCTA>}
    >
      <div className="grid grid-cols-3 gap-2">
        <Stat value={repsLast7} label="Last 7d" />
        <Stat value={repsLast30} label="Last 30d" />
        <Stat value={totalReps} label="All-time" />
      </div>

      {neglected.length > 0 && (
        <Section title="Cold Zones" hint="14+ days">
          <p className="text-sm text-grappler-200 leading-relaxed">
            <strong className="text-amber-400">{neglected.map(c => TECHNIQUE_CATEGORIES.find(t => t.id === c)?.label).join(', ')}</strong>
          </p>
          <p className="text-[11px] text-grappler-500 mt-1">Skill rusts faster than strength.</p>
        </Section>
      )}

      {progress.length === 0 ? (
        <Section title="By Technique">
          <p className="text-sm text-grappler-400 text-center py-4">Nothing logged yet. Log a session to start tracking.</p>
        </Section>
      ) : (
        <Section title="By Technique" hint={`${progress.length}`}>
          <div className="space-y-2">
            {progress.map(p => {
              const tier = getMasteryTier(p.totalReps);
              const cat = TECHNIQUE_CATEGORIES.find(c => c.id === p.category);
              return (
                <div key={`${p.category}-${p.technique}`} className="border-t border-grappler-800 first:border-0 pt-2.5 first:pt-0">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{p.technique}</div>
                      <div className="text-[11px] text-grappler-500">{cat?.label}</div>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-grappler-400 whitespace-nowrap">
                      {tierLabel(tier)}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3 text-[11px] font-mono tabular-nums text-grappler-400">
                    <span><span className="text-white">{p.totalReps}</span> reps</span>
                    <span><span className="text-white">{p.sessionsCount}</span> sessions</span>
                    <span><span className="text-white">{p.averageRepsPerSession}</span>/avg</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {techniqueLog.length > 0 && (
        <Section title="Recent" hint={`${techniqueLog.length}`}>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {[...techniqueLog].reverse().slice(0, 30).map(e => (
              <div key={e.id} className="flex items-center justify-between py-1.5 border-b border-grappler-800 last:border-0 text-xs">
                <div className="min-w-0 flex-1">
                  <div className="text-white truncate">{e.technique}</div>
                  <div className="text-grappler-500 text-[10px] font-mono tabular-nums">
                    {new Date(e.date).toLocaleDateString()} · {e.reps} reps {e.withResistance ? '· w/ resistance' : ''}
                  </div>
                </div>
                <button
                  onClick={() => deleteTechniqueEntry(e.id)}
                  className="text-grappler-600 hover:text-rose-400 transition p-1 ml-2"
                  aria-label="Delete entry"
                >
                  <Trash2 className="w-3.5 h-3.5" />
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

function LogView({ onBack, onLog }: {
  onBack: () => void;
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
    <ToolShell
      onClose={onBack}
      eyebrow="IBRA / 04 · LOG TECHNIQUE"
      title="Log a session"
      description="Drilling reps compound. Be honest about what you actually did."
      footer={<PrimaryCTA onClick={submit}>Log</PrimaryCTA>}
    >
      <Section title="Technique">
        <input
          type="text"
          value={technique}
          onChange={e => setTechnique(e.target.value)}
          placeholder="e.g. Single-leg takedown"
          className="w-full px-3 py-3 rounded-lg bg-grappler-950 border border-grappler-800 text-white focus:border-grappler-500 outline-none"
          autoFocus
        />
      </Section>

      <Section title="Category">
        <div className="grid grid-cols-3 gap-1.5">
          {TECHNIQUE_CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                'px-2 py-1.5 rounded-lg text-xs font-medium border transition active:scale-[0.97]',
                category === c.id
                  ? 'bg-white border-white text-grappler-950'
                  : 'bg-transparent border-grappler-800 text-grappler-300'
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-grappler-500 mt-2">{TECHNIQUE_CATEGORIES.find(c => c.id === category)?.example}</p>
      </Section>

      <Section title="Reps">
        <input
          type="number" inputMode="decimal" enterKeyHint="done"
          min={1} step={1}
          value={reps || ''}
          onChange={e => setReps(Number(e.target.value))}
          className="w-full px-3 py-3 rounded-lg bg-grappler-950 border border-grappler-800 text-white text-2xl font-mono tabular-nums focus:border-grappler-500 outline-none"
        />
      </Section>

      <Section title="Resistance">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={withResistance}
            onChange={e => setWithResistance(e.target.checked)}
            className="w-4 h-4 accent-white"
          />
          <span className="text-sm text-grappler-200">Partial-resisting partner</span>
        </label>
      </Section>

      <Section title="Partner" hint="optional">
        <input
          type="text"
          value={partner}
          onChange={e => setPartner(e.target.value)}
          placeholder="Name or initials"
          className="w-full px-3 py-2 rounded-lg bg-grappler-950 border border-grappler-800 text-sm text-white focus:border-grappler-500 outline-none"
        />
      </Section>

      <Section title="Notes" hint="optional">
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="What clicked, what didn't, setups…"
          className="w-full px-3 py-2 rounded-lg bg-grappler-950 border border-grappler-800 text-sm text-white resize-none focus:border-grappler-500 outline-none"
        />
      </Section>
    </ToolShell>
  );
}
