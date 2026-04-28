'use client';

/**
 * CampTimeline — top-level fight camp visualization
 *
 * The fight-camp-engine triggers at 70 days out and cascades through
 * training/nutrition/supplements/deload, but the user had no surface to
 * see the camp at a glance. "Fight Prep" is for the cut. This is for
 * the whole 10-week run-up.
 */

import { useMemo } from 'react';
import { X, Swords, Calendar, Target, Flame, Heart, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { detectFightCampPhase, getPhaseConfig } from '@/lib/fight-camp-engine';
import { cn } from '@/lib/utils';

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

const PHASE_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  off_season:        { bg: 'bg-grappler-800/40', text: 'text-grappler-300', border: 'border-grappler-700/50' },
  base_camp:         { bg: 'bg-emerald-500/15',  text: 'text-emerald-300',  border: 'border-emerald-500/30' },
  intensification:   { bg: 'bg-sky-500/15',      text: 'text-sky-300',      border: 'border-sky-500/30' },
  fight_camp_peak:   { bg: 'bg-amber-500/15',    text: 'text-amber-300',    border: 'border-amber-500/30' },
  fight_week:        { bg: 'bg-orange-500/15',   text: 'text-orange-300',   border: 'border-orange-500/30' },
  weigh_in_day:      { bg: 'bg-rose-500/15',     text: 'text-rose-300',     border: 'border-rose-500/30' },
  fight_day:         { bg: 'bg-rose-500/25',     text: 'text-rose-200',     border: 'border-rose-500/50' },
  post_competition:  { bg: 'bg-violet-500/15',   text: 'text-violet-300',   border: 'border-violet-500/30' },
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
  const user = useAppStore(s => s.user);

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

  const currentPhase = useMemo(() => detectFightCampPhase(daysToFight, daysToFight !== null && daysToFight < 0), [daysToFight]);
  const phaseConfig = useMemo(() => getPhaseConfig(currentPhase), [currentPhase]);

  return (
    <div className="fixed inset-0 z-50 bg-grappler-950 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-grappler-950/95 backdrop-blur border-b border-grappler-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-rose-400" />
          <div>
            <h1 className="text-lg font-bold text-white">Camp Timeline</h1>
            <p className="text-[11px] text-grappler-400">10-week camp at a glance</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" className="p-2 hover:bg-grappler-800 rounded-lg">
          <X className="w-5 h-5 text-grappler-300" />
        </button>
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto pb-24 space-y-4">
        {!upcoming ? (
          <NoCampState />
        ) : (
          <>
            {/* Hero status */}
            <div className={cn('rounded-xl border p-5', PHASE_COLOR[currentPhase].bg, PHASE_COLOR[currentPhase].border)}>
              <div className="flex items-baseline justify-between mb-1">
                <span className={cn('text-[10px] uppercase font-bold tracking-wider', PHASE_COLOR[currentPhase].text)}>
                  Current Phase
                </span>
                <span className="text-xs text-grappler-400">{upcoming.type} · {new Date(upcoming.date).toLocaleDateString()}</span>
              </div>
              <h2 className="text-3xl font-display font-black text-white tracking-tight">{PHASE_LABEL[currentPhase]}</h2>
              <p className="text-sm text-grappler-300 mt-2">{TIMELINE.find(t => t.phase === currentPhase)?.description}</p>
              {daysToFight !== null && daysToFight >= 0 && (
                <div className="mt-4 pt-4 border-t border-grappler-800/40">
                  <div className="text-5xl font-mono font-bold text-white">{daysToFight}</div>
                  <div className="text-xs text-grappler-400 uppercase tracking-wider">days to fight</div>
                </div>
              )}
            </div>

            {/* Phase prescription */}
            <div className="rounded-xl bg-grappler-900/60 border border-grappler-800 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-grappler-300">Phase Prescription</h3>
              {phaseConfig.calorieStrategy && (
                <Row icon={Flame} label="Calories" value={phaseConfig.calorieStrategy} />
              )}
              <Row icon={Target} label="Protein" value={`${phaseConfig.proteinGKg.min}-${phaseConfig.proteinGKg.max} g/kg`} />
              <Row icon={Heart} label="Training focus" value={(phaseConfig as { trainingFocus?: string }).trainingFocus ?? '—'} />
              {phaseConfig.warnings && phaseConfig.warnings.length > 0 && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px] uppercase font-bold text-amber-300">Watch For</span>
                  </div>
                  {phaseConfig.warnings.map((a: string, i: number) => (
                    <p key={i} className="text-xs text-amber-100">• {a}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Full timeline */}
            <div className="rounded-xl bg-grappler-900/60 border border-grappler-800 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-grappler-300 mb-3">All Phases</h3>
              <div className="space-y-2">
                {TIMELINE.map(t => {
                  const isCurrent = t.phase === currentPhase;
                  const isPassed = daysToFight !== null && daysToFight < t.daysFrom && daysToFight >= 0;
                  const colors = PHASE_COLOR[t.phase];
                  return (
                    <div
                      key={t.phase}
                      className={cn(
                        'flex items-start gap-3 px-3 py-2 rounded-lg border',
                        isCurrent ? cn('ring-1', colors.bg, colors.border) : 'border-grappler-800',
                        isPassed && !isCurrent && 'opacity-50'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2 mb-0.5">
                          <span className={cn('text-sm font-bold', isCurrent ? colors.text : 'text-grappler-200')}>
                            {t.label}
                          </span>
                          <span className="text-[10px] text-grappler-500">
                            {t.daysFrom > 0 ? `D-${t.daysFrom} → D-${t.daysTo}` : t.phase === 'fight_day' ? 'D-0' : 'post'}
                          </span>
                        </div>
                        <p className="text-[11px] text-grappler-400 leading-snug">{t.description}</p>
                      </div>
                      {isCurrent && <span className="text-[9px] uppercase font-bold text-amber-400 mt-1">Now</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-[11px] text-grappler-500 text-center px-4">
              Camp phases drive training volume, nutrition macros, supplements, and deload alignment automatically across the app.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function NoCampState() {
  return (
    <div className="rounded-xl bg-grappler-900/40 border border-grappler-800 p-8 text-center mt-6">
      <Calendar className="w-10 h-10 text-grappler-600 mx-auto mb-3" />
      <h2 className="text-base font-bold text-white mb-1">No upcoming competition.</h2>
      <p className="text-sm text-grappler-400 max-w-sm mx-auto">
        Add a competition in <strong className="text-grappler-200">Fight Prep</strong>. The 10-week camp will trigger automatically at 70 days out.
      </p>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3 text-sm">
      <Icon className="w-3.5 h-3.5 text-grappler-400 flex-shrink-0 mt-1" />
      <span className="text-grappler-400 w-24 flex-shrink-0">{label}</span>
      <span className="text-white flex-1">{value}</span>
    </div>
  );
}
