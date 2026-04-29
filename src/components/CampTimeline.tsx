'use client';

/**
 * CampTimeline — top-level fight camp visualization. The 10-week run-up,
 * matched phase by phase to the engine's prescriptions.
 */

import { useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { detectFightCampPhase, getPhaseConfig } from '@/lib/fight-camp-engine';
import { cn } from '@/lib/utils';
import { ToolShell, Section, HeroMetric, Stat } from './_ToolShell';

interface Props { onClose: () => void }

const PHASE_LABEL: Record<string, string> = {
  off_season: 'Off-Season',
  base_camp: 'Base Camp',
  intensification: 'Intensification',
  fight_camp_peak: 'Peak',
  fight_week: 'Fight Week',
  weigh_in_day: 'Weigh-In',
  fight_day: 'Fight Day',
  tournament_day: 'Tournament Day',
  post_competition: 'Recovery',
};

const PHASE_ACCENT: Record<string, 'go' | 'info' | 'caution' | 'danger'> = {
  off_season:       'info',
  base_camp:        'go',
  intensification:  'info',
  fight_camp_peak:  'caution',
  fight_week:       'caution',
  weigh_in_day:     'danger',
  fight_day:        'danger',
  tournament_day:   'danger',
  post_competition: 'go',
};

const TIMELINE: { phase: string; daysFrom: number; daysTo: number; label: string; description: string }[] = [
  { phase: 'off_season',       daysFrom: 999, daysTo: 71, label: 'Off-Season',       description: 'No camp triggered yet. Build the engine, accumulate volume, fix weak links.' },
  { phase: 'base_camp',        daysFrom: 70,  daysTo: 57, label: 'Base Camp',        description: 'Build aerobic + max-strength foundation. Highest training volume of the camp.' },
  { phase: 'intensification',  daysFrom: 56,  daysTo: 29, label: 'Intensification',  description: 'Sport-specific load + threshold cardio. Volume drops, intensity climbs.' },
  { phase: 'fight_camp_peak',  daysFrom: 28,  daysTo: 8,  label: 'Peak',             description: 'Sharp work. Speed-strength + sparring. Volume drops to ~70%.' },
  { phase: 'fight_week',       daysFrom: 7,   daysTo: 2,  label: 'Fight Week',       description: 'Taper hard. Movement only. Carb load + water cut begins.' },
  { phase: 'weigh_in_day',     daysFrom: 1,   daysTo: 1,  label: 'Weigh-In Day',     description: 'Make weight. Rehydrate. Food strategy executes.' },
  { phase: 'fight_day',        daysFrom: 0,   daysTo: 0,  label: 'Fight Day',        description: 'Game day.' },
  { phase: 'post_competition', daysFrom: -1,  daysTo: -14, label: 'Recovery',        description: 'Active recovery, mobility, full eat. Reset before the next camp.' },
];

export default function CampTimeline({ onClose }: Props) {
  const competitions = useAppStore(s => s.competitions ?? []);

  const upcoming = useMemo(() => {
    const now = Date.now();
    const future = competitions
      .filter(c => new Date(c.date).getTime() >= now - 14 * 24 * 60 * 60 * 1000)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return future[0] ?? null;
  }, [competitions]);

  const daysToFight = useMemo(() => {
    if (!upcoming) return null;
    const ms = new Date(upcoming.date).getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  }, [upcoming]);

  const currentPhase = useMemo(
    () => detectFightCampPhase(daysToFight, daysToFight !== null && daysToFight < 0),
    [daysToFight]
  );
  const phaseConfig = useMemo(() => getPhaseConfig(currentPhase), [currentPhase]);

  if (!upcoming) {
    return (
      <ToolShell
        onClose={onClose}
        eyebrow="IBRA / 06 · CAMP TIMELINE"
        title="No camp."
        description="Add a competition in Fight Prep. The 10-week camp triggers automatically at 70 days out."
      >
        <Section title="Status">
          <p className="text-sm text-grappler-300 py-2">
            No upcoming competition logged. Camp phases will activate when one is added.
          </p>
        </Section>
      </ToolShell>
    );
  }

  const accent = PHASE_ACCENT[currentPhase] ?? 'info';

  return (
    <ToolShell
      onClose={onClose}
      eyebrow={`IBRA / 06 · ${upcoming.type.toUpperCase()} · ${new Date(upcoming.date).toLocaleDateString()}`}
      title={PHASE_LABEL[currentPhase]}
      description={TIMELINE.find(t => t.phase === currentPhase)?.description ?? ''}
    >
      {daysToFight !== null && daysToFight >= 0 && (
        <Section title="Countdown">
          <HeroMetric
            value={daysToFight}
            label="Days to fight"
            state={PHASE_LABEL[currentPhase]}
            accent={accent}
          />
        </Section>
      )}

      <Section title="Phase Prescription">
        <div className="space-y-2 text-sm">
          {phaseConfig.calorieStrategy && (
            <Row label="Calories" value={phaseConfig.calorieStrategy} />
          )}
          <Row label="Protein" value={`${phaseConfig.proteinGKg.min}-${phaseConfig.proteinGKg.max} g/kg`} />
          <Row label="Training focus" value={(phaseConfig as { trainingFocus?: string }).trainingFocus ?? '—'} />
        </div>
      </Section>

      {phaseConfig.warnings && phaseConfig.warnings.length > 0 && (
        <Section title="Watch For">
          <ul className="space-y-1 text-xs text-grappler-300">
            {phaseConfig.warnings.map((a: string, i: number) => (
              <li key={i} className="flex gap-2"><span className="text-amber-400">·</span>{a}</li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="All Phases">
        <div className="space-y-1">
          {TIMELINE.map(t => {
            const isCurrent = t.phase === currentPhase;
            const isPassed = daysToFight !== null && daysToFight < t.daysFrom && daysToFight >= 0;
            return (
              <div
                key={t.phase}
                className={cn(
                  'flex items-start gap-3 py-2 border-b border-grappler-800 last:border-0',
                  isCurrent && 'border-l-2 border-l-white pl-3 -ml-1',
                  isPassed && !isCurrent && 'opacity-50'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <span className={cn('text-sm', isCurrent ? 'text-white font-bold' : 'text-grappler-300')}>
                      {t.label}
                    </span>
                    <span className="text-[10px] font-mono tabular-nums text-grappler-500">
                      {t.daysFrom > 0 ? `D-${t.daysFrom} → D-${t.daysTo}` : t.phase === 'fight_day' ? 'D-0' : 'post'}
                    </span>
                  </div>
                  <p className="text-[11px] text-grappler-500 leading-snug">{t.description}</p>
                </div>
                {isCurrent && <span className="text-[10px] uppercase tracking-[0.18em] text-white mt-1">Now</span>}
              </div>
            );
          })}
        </div>
      </Section>

      <p className="text-[10px] text-grappler-500 text-center px-4 leading-relaxed">
        Camp phases drive training volume, nutrition macros, supplements, and deload alignment automatically across the app.
      </p>
    </ToolShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 border-b border-grappler-800 last:border-0">
      <span className="text-[11px] uppercase tracking-[0.18em] text-grappler-500">{label}</span>
      <span className="text-sm text-white text-right">{value}</span>
    </div>
  );
}
