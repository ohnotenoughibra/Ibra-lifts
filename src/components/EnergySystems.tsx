'use client';

/**
 * EnergySystems — structured cardio for combat athletes.
 *
 * Editorial brutalist refactor: uses _ToolShell primitives, kills the
 * 5-color zone rainbow, removes the 3-view internal nav (protocol detail
 * is now its own full ToolShell with sticky Start CTA).
 */

import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import {
  ENERGY_SYSTEM_PROTOCOLS,
  protocolToWorkoutSession,
  estimateMaxHR,
  calculateHRZones,
  prettyModality,
  type EnergySystemProtocol,
  type CardioModality,
} from '@/lib/energy-systems';
import { cn } from '@/lib/utils';
import { useToast } from './Toast';
import { ToolShell, Section, HeroMetric, PrimaryCTA, Stat } from './_ToolShell';

interface Props { onClose: () => void }

const MODALITIES: CardioModality[] = ['bike', 'run', 'row', 'jump_rope', 'shadow', 'swim'];

const SYSTEM_LABEL: Record<EnergySystemProtocol['energySystem'], string> = {
  aerobic: 'Aerobic',
  aerobic_anaerobic: 'Mixed',
  anaerobic_alactic: 'Alactic',
  anaerobic_lactic: 'Lactic',
};

export default function EnergySystems({ onClose }: Props) {
  const { showToast } = useToast();
  const startWorkout = useAppStore(s => s.startWorkout);
  const user = useAppStore(s => s.user);

  const [selectedProtocol, setSelectedProtocol] = useState<EnergySystemProtocol | null>(null);

  const userAge = user?.age ?? 30;
  const userMaxHR = estimateMaxHR(userAge);
  const userRestingHR = (user as { restingHR?: number })?.restingHR ?? 60;
  const zones = useMemo(() => calculateHRZones(userMaxHR, userRestingHR), [userMaxHR, userRestingHR]);

  const startProtocol = (protocol: EnergySystemProtocol, modality: CardioModality) => {
    const session = protocolToWorkoutSession(protocol, modality);
    const ok = startWorkout(session);
    if (ok === false) {
      showToast('Finish your current workout first', 'error');
      return;
    }
    showToast(`${protocol.shortName} started`, 'success');
    onClose();
  };

  if (selectedProtocol) {
    return (
      <ProtocolDetail
        protocol={selectedProtocol}
        zones={zones}
        onBack={() => setSelectedProtocol(null)}
        onClose={onClose}
        onStart={(modality) => startProtocol(selectedProtocol, modality)}
      />
    );
  }

  return (
    <ToolShell
      onClose={onClose}
      eyebrow="IBRA / 03 · ENERGY SYSTEMS"
      title={<>Cardio that<br/>transfers.</>}
      description="Five protocols, periodized: aerobic base → threshold → peak. Pick a system, pick a modality, run it."
    >
      <Section title="Protocols">
        <div className="space-y-2">
          {ENERGY_SYSTEM_PROTOCOLS.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedProtocol(p)}
              className="w-full flex items-center justify-between gap-3 p-3 -mx-1 rounded-lg hover:bg-grappler-800/40 active:scale-[0.99] transition text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <h3 className="text-sm font-bold text-white truncate">{p.name}</h3>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-grappler-500 whitespace-nowrap">
                    {SYSTEM_LABEL[p.energySystem]}
                  </span>
                </div>
                <p className="text-xs text-grappler-400 line-clamp-2">{p.combatRelevance}</p>
                <div className="text-[11px] text-grappler-500 mt-1 font-mono tabular-nums">
                  {p.durationMinutes}m · {p.intervals[0].rounds} rd · {p.modalityRecommendations.length} modalities
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-grappler-500 flex-shrink-0" />
            </button>
          ))}
        </div>
      </Section>

      <Section title="Your HR Zones" hint={`Max ${zones.maxHR} bpm`}>
        <div className="space-y-2">
          {(['zone1', 'zone2', 'zone3', 'zone4', 'zone5'] as const).map((key, idx) => {
            const tags = ['Recovery', 'Base', 'Tempo', 'Threshold', 'VO2max'];
            const z = zones.zones[key];
            return (
              <div key={key} className="flex items-baseline justify-between gap-3 py-1.5 border-b border-grappler-800 last:border-0">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-grappler-500 font-bold w-12">
                    Z{idx + 1}
                  </span>
                  <span className="text-xs text-grappler-300">{tags[idx]}</span>
                </div>
                <span className="font-mono text-sm tabular-nums text-white">
                  {z.min}<span className="text-grappler-500">–</span>{z.max}
                  <span className="text-[10px] text-grappler-500 ml-1">bpm</span>
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-grappler-500 mt-3 leading-relaxed">
          Tanaka max HR for age {userAge}, Karvonen reserve from resting HR {userRestingHR}.
        </p>
      </Section>
    </ToolShell>
  );
}

// ─── Protocol detail ─────────────────────────────────────────────────────

function ProtocolDetail({ protocol, zones, onBack, onClose, onStart }: {
  protocol: EnergySystemProtocol;
  zones: ReturnType<typeof calculateHRZones>;
  onBack: () => void;
  onClose: () => void;
  onStart: (m: CardioModality) => void;
}) {
  const [modality, setModality] = useState<CardioModality>(protocol.modalityRecommendations[0]);
  const totalWork = protocol.intervals.reduce((s, i) => s + i.workSeconds * i.rounds, 0);

  return (
    <ToolShell
      onClose={onBack}
      eyebrow={`IBRA / 03 · ${protocol.shortName.toUpperCase()}`}
      title={protocol.name}
      description={protocol.combatRelevance}
      footer={
        <PrimaryCTA onClick={() => onStart(modality)}>
          Start with {prettyModality(modality)}
        </PrimaryCTA>
      }
    >
      <div className="grid grid-cols-3 gap-2">
        <Stat value={protocol.durationMinutes} label="Total min" />
        <Stat value={Math.round(totalWork / 60)} label="Work min" />
        <Stat value={protocol.intervals[0].rounds} label="Rounds" />
      </div>

      <Section title="Workout">
        <div className="space-y-2">
          {protocol.intervals.map((i, idx) => {
            const zoneRange = zones.zones[`zone${i.targetHRZone}` as keyof typeof zones.zones];
            const work = i.workSeconds < 60 ? `${i.workSeconds}s` : `${Math.round(i.workSeconds / 60)}m`;
            const rest = i.restSeconds < 60 ? `${i.restSeconds}s` : `${Math.round(i.restSeconds / 60)}m`;
            return (
              <div key={idx} className="border-t border-grappler-800 first:border-0 pt-3 first:pt-0">
                <p className="text-sm text-white mb-1">{i.description}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono tabular-nums text-grappler-300">
                  <span>WORK <span className="text-white">{work}</span></span>
                  <span>REST <span className="text-white">{rest}</span></span>
                  <span>RDS <span className="text-white">{i.rounds}</span></span>
                  <span>HR <span className="text-white">{zoneRange.min}–{zoneRange.max}</span></span>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Modality">
        <div className="flex flex-wrap gap-2">
          {MODALITIES.map(m => {
            const recommended = protocol.modalityRecommendations.includes(m);
            const primary = protocol.modalityRecommendations[0] === m;
            return (
              <button
                key={m}
                onClick={() => setModality(m)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition active:scale-[0.97]',
                  modality === m
                    ? 'bg-white border-white text-grappler-950'
                    : recommended
                      ? 'bg-grappler-800/50 border-grappler-700 text-grappler-100'
                      : 'bg-transparent border-grappler-800 text-grappler-500'
                )}
              >
                {prettyModality(m)}
                {primary && <span className="ml-1 text-[9px] text-amber-400">★</span>}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-grappler-500 mt-2">
          Recommended: {protocol.modalityRecommendations.map(prettyModality).join(', ')}
        </p>
      </Section>

      <Section title="Warm-Up">
        <ul className="space-y-1 text-sm text-grappler-200">
          {protocol.warmUp.map((w, i) => <li key={i} className="flex gap-2"><span className="text-grappler-600">·</span>{w}</li>)}
        </ul>
      </Section>

      <Section title="Cool-Down">
        <ul className="space-y-1 text-sm text-grappler-200">
          {protocol.coolDown.map((c, i) => <li key={i} className="flex gap-2"><span className="text-grappler-600">·</span>{c}</li>)}
        </ul>
      </Section>

      <Section title="When to Use">
        <p className="text-sm text-grappler-200">{protocol.whenToUse}</p>
      </Section>

      {protocol.cautions.length > 0 && (
        <Section title="Watch For" hint="caution">
          <ul className="space-y-1 text-xs text-grappler-300">
            {protocol.cautions.map((c, i) => <li key={i} className="flex gap-2"><span className="text-amber-400">·</span>{c}</li>)}
          </ul>
        </Section>
      )}

      <button
        onClick={onClose}
        className="block mx-auto text-[11px] uppercase tracking-[0.2em] text-grappler-500 hover:text-grappler-300 mt-2"
      >
        Close tool
      </button>
    </ToolShell>
  );
}
