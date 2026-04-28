'use client';

/**
 * EnergySystems — structured cardio for combat athletes
 *
 * Three distinct protocols (Zone 2 base, Norwegian 4×4, RSA) plus tempo and
 * long aerobic intervals. Pick one, pick a modality, run it.
 */

import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Heart, Activity, Timer, Flame, ArrowRight,
  PlayCircle, Info, Sparkles, ChevronDown, ChevronUp, Zap,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import {
  ENERGY_SYSTEM_PROTOCOLS,
  protocolToWorkoutSession,
  estimateMaxHR,
  calculateHRZones,
  prettyModality,
  type EnergySystemProtocol,
  type CardioModality,
  type EnergySystemId,
} from '@/lib/energy-systems';
import { cn } from '@/lib/utils';
import { useToast } from './Toast';

interface Props { onClose: () => void }

const MODALITIES: CardioModality[] = ['bike', 'run', 'row', 'jump_rope', 'shadow', 'swim'];

const ENERGY_COLOR: Record<EnergySystemId, { bg: string; text: string; border: string }> = {
  zone2_base:        { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  tempo:             { bg: 'bg-sky-500/15',     text: 'text-sky-300',     border: 'border-sky-500/30' },
  aerobic_intervals: { bg: 'bg-amber-500/15',   text: 'text-amber-300',   border: 'border-amber-500/30' },
  threshold_4x4:     { bg: 'bg-rose-500/15',    text: 'text-rose-300',    border: 'border-rose-500/30' },
  rsa:               { bg: 'bg-violet-500/15',  text: 'text-violet-300',  border: 'border-violet-500/30' },
};

export default function EnergySystems({ onClose }: Props) {
  const { showToast } = useToast();
  const startWorkout = useAppStore(s => s.startWorkout);
  const user = useAppStore(s => s.user);

  const [view, setView] = useState<'overview' | 'zones' | 'protocol'>('overview');
  const [selectedProtocol, setSelectedProtocol] = useState<EnergySystemProtocol | null>(null);

  // HR zone calculation
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

  return (
    <div className="fixed inset-0 z-50 bg-grappler-950 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-grappler-950/95 backdrop-blur border-b border-grappler-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-400" />
          <div>
            <h1 className="text-lg font-bold text-white">Energy Systems</h1>
            <p className="text-[11px] text-grappler-400">Structured cardio that actually transfers</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" className="p-2 hover:bg-grappler-800 rounded-lg">
          <X className="w-5 h-5 text-grappler-300" />
        </button>
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto pb-24">
        <AnimatePresence mode="wait">
          {view === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Overview
                protocols={ENERGY_SYSTEM_PROTOCOLS}
                onProtocol={(p) => { setSelectedProtocol(p); setView('protocol'); }}
                onShowZones={() => setView('zones')}
              />
            </motion.div>
          )}
          {view === 'zones' && (
            <motion.div key="zones" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ZonesView zones={zones} userAge={userAge} onBack={() => setView('overview')} />
            </motion.div>
          )}
          {view === 'protocol' && selectedProtocol && (
            <motion.div key="protocol" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ProtocolView
                protocol={selectedProtocol}
                zones={zones}
                onStart={(modality) => startProtocol(selectedProtocol, modality)}
                onBack={() => setView('overview')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Overview
// ─────────────────────────────────────────────────────────────────────────

function Overview({ protocols, onProtocol, onShowZones }: {
  protocols: EnergySystemProtocol[];
  onProtocol: (p: EnergySystemProtocol) => void;
  onShowZones: () => void;
}) {
  return (
    <div className="space-y-4 mt-2">
      <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Heart className="w-5 h-5 text-rose-400" />
          <h2 className="font-bold text-white">The cardio most fighters skip</h2>
        </div>
        <p className="text-xs text-grappler-200 leading-relaxed">
          Conditioning circuits build "feels-hard" cardio. Energy systems work builds <strong>actual</strong> aerobic engine,
          VO2max, and lactate clearance. Five protocols, periodized: base → threshold → peak.
        </p>
        <button
          onClick={onShowZones}
          className="mt-3 text-xs text-rose-300 hover:text-rose-200 flex items-center gap-1"
        >
          View your HR zones
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-2">
        {protocols.map(p => {
          const colors = ENERGY_COLOR[p.id];
          return (
            <button
              key={p.id}
              onClick={() => onProtocol(p)}
              className={cn(
                'w-full p-4 rounded-xl border text-left transition hover:bg-grappler-800/40',
                'bg-grappler-900/60 border-grappler-800'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 border', colors.bg, colors.border)}>
                  <SystemIcon id={p.id} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <h3 className="text-sm font-bold text-white">{p.name}</h3>
                    <span className={cn('text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border whitespace-nowrap', colors.bg, colors.text, colors.border)}>
                      {p.energySystem === 'aerobic' ? 'Aerobic' : p.energySystem === 'aerobic_anaerobic' ? 'Mixed' : 'Anaerobic'}
                    </span>
                  </div>
                  <p className="text-xs text-grappler-300 mb-1">{p.combatRelevance}</p>
                  <div className="flex items-center gap-3 text-[11px] text-grappler-500">
                    <span><Timer className="inline w-3 h-3 mr-0.5" /> {p.durationMinutes}m</span>
                    <span>·</span>
                    <span>{p.modalityRecommendations.length} modalities</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SystemIcon({ id }: { id: EnergySystemId }) {
  if (id === 'zone2_base') return <Heart className="w-5 h-5 text-emerald-400" />;
  if (id === 'tempo') return <Activity className="w-5 h-5 text-sky-400" />;
  if (id === 'aerobic_intervals') return <Flame className="w-5 h-5 text-amber-400" />;
  if (id === 'threshold_4x4') return <Zap className="w-5 h-5 text-rose-400" />;
  return <Sparkles className="w-5 h-5 text-violet-400" />;
}

// ─────────────────────────────────────────────────────────────────────────
// HR Zones View
// ─────────────────────────────────────────────────────────────────────────

function ZonesView({ zones, userAge, onBack }: { zones: ReturnType<typeof calculateHRZones>; userAge: number; onBack: () => void }) {
  const zoneMeta: { key: keyof typeof zones.zones; tag: string }[] = [
    { key: 'zone1', tag: 'Recovery' },
    { key: 'zone2', tag: 'Base' },
    { key: 'zone3', tag: 'Tempo' },
    { key: 'zone4', tag: 'Threshold' },
    { key: 'zone5', tag: 'VO2max' },
  ];
  return (
    <div className="space-y-3 mt-2">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-grappler-300 hover:text-white">
        <ChevronDown className="w-4 h-4 rotate-90" /> Back
      </button>

      <div className="rounded-xl bg-grappler-900/60 border border-grappler-800 p-4">
        <h2 className="text-base font-bold text-white mb-2">Your HR Zones</h2>
        <p className="text-xs text-grappler-300">
          Tanaka formula: max HR ≈ <strong className="text-white">{zones.maxHR} bpm</strong> for age {userAge}.
          Resting HR <strong className="text-white">{zones.restingHR} bpm</strong>. Zones use Karvonen heart-rate reserve.
        </p>
      </div>

      <div className="space-y-2">
        {zoneMeta.map(({ key, tag }) => {
          const z = zones.zones[key];
          const colors = key === 'zone1' ? 'emerald' : key === 'zone2' ? 'sky' : key === 'zone3' ? 'amber' : key === 'zone4' ? 'orange' : 'rose';
          return (
            <div key={key} className={`rounded-xl bg-${colors}-500/10 border border-${colors}-500/30 p-4`}>
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  <div className={`text-[10px] uppercase font-bold tracking-wider text-${colors}-400`}>
                    {key.toUpperCase()} · {tag}
                  </div>
                  <div className="text-xl font-bold text-white font-mono">
                    {z.min}–{z.max} <span className="text-xs text-grappler-400">bpm</span>
                  </div>
                </div>
                <div className="text-xs text-grappler-300 max-w-[60%] text-right">
                  {key === 'zone1' && 'Active recovery, walking pace'}
                  {key === 'zone2' && 'Conversational, fat-burning, aerobic base'}
                  {key === 'zone3' && 'Comfortably hard, can speak phrases'}
                  {key === 'zone4' && 'Race pace, lactate threshold'}
                  {key === 'zone5' && 'All-out, can\'t sustain >3 min'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Protocol View
// ─────────────────────────────────────────────────────────────────────────

function ProtocolView({ protocol, zones, onStart, onBack }: {
  protocol: EnergySystemProtocol;
  zones: ReturnType<typeof calculateHRZones>;
  onStart: (m: CardioModality) => void;
  onBack: () => void;
}) {
  const [modality, setModality] = useState<CardioModality>(protocol.modalityRecommendations[0]);
  const colors = ENERGY_COLOR[protocol.id];

  const totalWork = protocol.intervals.reduce((s, i) => s + i.workSeconds * i.rounds, 0);

  return (
    <div className="space-y-3 mt-2">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-grappler-300 hover:text-white">
        <ChevronDown className="w-4 h-4 rotate-90" /> Back
      </button>

      <div className={cn('rounded-xl border p-5', colors.bg, colors.border)}>
        <h2 className="text-2xl font-bold text-white mb-1">{protocol.name}</h2>
        <p className="text-xs text-grappler-300 mb-3">{protocol.combatRelevance}</p>
        <div className="flex flex-wrap gap-3 text-xs text-grappler-200">
          <span><Timer className="inline w-3.5 h-3.5 mr-0.5" /> {protocol.durationMinutes}m total</span>
          <span>· {Math.round(totalWork / 60)}m work</span>
          <span>· {protocol.intervals[0].rounds} rounds</span>
        </div>
      </div>

      {/* Intervals */}
      <Section title="Workout">
        <div className="space-y-2">
          {protocol.intervals.map((i, idx) => {
            const zoneRange = zones.zones[`zone${i.targetHRZone}` as keyof typeof zones.zones];
            return (
              <div key={idx} className="rounded-lg bg-grappler-950/60 border border-grappler-800 p-3">
                <p className="text-sm font-semibold text-white mb-1">{i.description}</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-grappler-300">
                  <span>Work: <strong className="text-white">{i.workSeconds < 60 ? `${i.workSeconds}s` : `${Math.round(i.workSeconds/60)}m`}</strong></span>
                  <span>Rest: <strong className="text-white">{i.restSeconds < 60 ? `${i.restSeconds}s` : `${Math.round(i.restSeconds/60)}m`}</strong></span>
                  <span>Rounds: <strong className="text-white">{i.rounds}</strong></span>
                  <span>Target HR: <strong className="text-white">{zoneRange.min}–{zoneRange.max}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Warm-up + cool-down */}
      <Section title="Warm-Up">
        <ul className="space-y-1 text-sm text-grappler-200">
          {protocol.warmUp.map((w, i) => <li key={i}>• {w}</li>)}
        </ul>
      </Section>

      <Section title="Cool-Down">
        <ul className="space-y-1 text-sm text-grappler-200">
          {protocol.coolDown.map((c, i) => <li key={i}>• {c}</li>)}
        </ul>
      </Section>

      {/* Modality picker */}
      <Section title="Modality">
        <div className="flex flex-wrap gap-2">
          {MODALITIES.map(m => (
            <button
              key={m}
              onClick={() => setModality(m)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition',
                modality === m
                  ? 'bg-grappler-100 border-grappler-100 text-grappler-950'
                  : protocol.modalityRecommendations.includes(m)
                    ? 'bg-grappler-800/40 border-grappler-700 text-grappler-200'
                    : 'bg-grappler-800/20 border-grappler-800 text-grappler-500'
              )}
            >
              {prettyModality(m)}
              {protocol.modalityRecommendations[0] === m && (
                <span className="ml-1 text-[9px] text-amber-400">★</span>
              )}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-grappler-500 mt-2">
          Recommended: {protocol.modalityRecommendations.map(prettyModality).join(', ')}
        </p>
      </Section>

      {/* When to use */}
      <Section title="When to Use">
        <p className="text-sm text-grappler-200">{protocol.whenToUse}</p>
      </Section>

      {/* Cautions */}
      {protocol.cautions.length > 0 && (
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Watch For</h3>
          </div>
          <ul className="space-y-1 text-xs text-grappler-300">
            {protocol.cautions.map((c, i) => <li key={i}>• {c}</li>)}
          </ul>
        </div>
      )}

      <button
        onClick={() => onStart(modality)}
        className="w-full px-5 py-3.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold transition flex items-center justify-center gap-2"
      >
        <PlayCircle className="w-5 h-5" />
        Start {protocol.shortName}
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-grappler-900/60 border border-grappler-800 p-4">
      <h3 className="text-xs font-semibold text-grappler-300 uppercase tracking-wider mb-2">{title}</h3>
      {children}
    </div>
  );
}
