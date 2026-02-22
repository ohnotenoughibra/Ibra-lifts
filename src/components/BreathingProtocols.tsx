'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ArrowLeft, Play, Pause, Square, Wind, Plus, Minus,
  Clock, Repeat, ChevronRight, CheckCircle2, Waves,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BreathingPhase {
  label: string;
  displayLabel: string;
  duration: number; // seconds — 0 means user-controlled (tap to advance)
  scale: number;    // circle transform scale
}

interface BreathingProtocol {
  id: string;
  name: string;
  shortName: string;
  description: string;
  useCase: string;
  color: string;       // tailwind color name (blue, indigo, etc.)
  defaultCycles: number;
  durationEstimate: string;
  phases: BreathingPhase[];
  isWimHof?: boolean;
}

type Mode = 'select' | 'detail' | 'active' | 'complete';

type WimHofStage = 'rapid' | 'retention' | 'recovery';

// ---------------------------------------------------------------------------
// Protocol definitions
// ---------------------------------------------------------------------------

const PROTOCOLS: BreathingProtocol[] = [
  {
    id: 'box',
    name: 'Box Breathing',
    shortName: '4-4-4-4',
    description: 'Equal-duration inhale, hold, exhale, hold. Used by Navy SEALs to stay calm under pressure.',
    useCase: 'Pre-competition, anxiety reduction',
    color: 'blue',
    defaultCycles: 10,
    durationEstimate: '4 min',
    phases: [
      { label: 'inhale', displayLabel: 'Breathe In', duration: 4, scale: 1.5 },
      { label: 'hold', displayLabel: 'Hold', duration: 4, scale: 1.5 },
      { label: 'exhale', displayLabel: 'Breathe Out', duration: 4, scale: 1.0 },
      { label: 'hold', displayLabel: 'Hold', duration: 4, scale: 1.0 },
    ],
  },
  {
    id: '478',
    name: '4-7-8 Relaxation',
    shortName: '4-7-8',
    description: 'Extended exhale activates the parasympathetic nervous system. Developed by Dr. Andrew Weil.',
    useCase: 'Post-training wind-down, sleep prep',
    color: 'indigo',
    defaultCycles: 4,
    durationEstimate: '1.5 min',
    phases: [
      { label: 'inhale', displayLabel: 'Breathe In', duration: 4, scale: 1.5 },
      { label: 'hold', displayLabel: 'Hold', duration: 7, scale: 1.5 },
      { label: 'exhale', displayLabel: 'Breathe Out', duration: 8, scale: 1.0 },
    ],
  },
  {
    id: 'tactical',
    name: 'Tactical Breathing',
    shortName: 'Combat 4-4-4',
    description: 'Rapid-reset breathing pattern for high-stress situations. Clears the mind between rounds.',
    useCase: 'Between rounds, sparring breaks',
    color: 'emerald',
    defaultCycles: 6,
    durationEstimate: '1.5 min',
    phases: [
      { label: 'inhale', displayLabel: 'Breathe In', duration: 4, scale: 1.5 },
      { label: 'hold', displayLabel: 'Hold', duration: 4, scale: 1.5 },
      { label: 'exhale', displayLabel: 'Breathe Out', duration: 4, scale: 1.0 },
    ],
  },
  {
    id: 'wimhof',
    name: 'Wim Hof Power Breathing',
    shortName: '30 breaths + hold',
    description: '30 rapid breaths followed by a breath-hold on empty lungs, then a recovery breath. Floods the body with oxygen and builds mental resilience.',
    useCase: 'Morning activation, cold exposure prep',
    color: 'orange',
    defaultCycles: 3,
    durationEstimate: '~11 min',
    isWimHof: true,
    phases: [], // Wim Hof uses custom state machine
  },
  {
    id: 'sigh',
    name: 'Physiological Sigh',
    shortName: 'Quick Reset',
    description: 'Double inhale through the nose, long exhale through the mouth. The fastest known method to reduce stress in real-time.',
    useCase: 'Quick calm-down between sets, before a lift',
    color: 'teal',
    defaultCycles: 3,
    durationEstimate: '30s',
    phases: [
      { label: 'inhale', displayLabel: 'Inhale (Nose)', duration: 2, scale: 1.3 },
      { label: 'inhale', displayLabel: 'Top-Up Inhale', duration: 1, scale: 1.5 },
      { label: 'exhale', displayLabel: 'Long Exhale (Mouth)', duration: 6, scale: 1.0 },
    ],
  },
  {
    id: 'nasal',
    name: 'Nasal-Only Endurance',
    shortName: '5-5 Nasal',
    description: 'Slow nasal breathing builds CO2 tolerance and improves oxygen delivery to muscles. Foundation for endurance performance.',
    useCase: 'Zone 2 cardio prep, CO2 tolerance',
    color: 'cyan',
    defaultCycles: 20,
    durationEstimate: '3.5 min',
    phases: [
      { label: 'inhale', displayLabel: 'Inhale (Nose)', duration: 5, scale: 1.5 },
      { label: 'exhale', displayLabel: 'Exhale (Nose)', duration: 5, scale: 1.0 },
    ],
  },
];

const COLOR_MAP: Record<string, { bg: string; text: string; ring: string; circle: string; bgSubtle: string }> = {
  blue:    { bg: 'bg-blue-500/20',    text: 'text-blue-400',    ring: 'ring-blue-500/30',    circle: '#3b82f6',  bgSubtle: 'bg-blue-500/10' },
  indigo:  { bg: 'bg-indigo-500/20',  text: 'text-indigo-400',  ring: 'ring-indigo-500/30',  circle: '#6366f1',  bgSubtle: 'bg-indigo-500/10' },
  emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', ring: 'ring-emerald-500/30', circle: '#10b981',  bgSubtle: 'bg-emerald-500/10' },
  orange:  { bg: 'bg-orange-500/20',  text: 'text-orange-400',  ring: 'ring-orange-500/30',  circle: '#f97316',  bgSubtle: 'bg-orange-500/10' },
  teal:    { bg: 'bg-teal-500/20',    text: 'text-teal-400',    ring: 'ring-teal-500/30',    circle: '#14b8a6',  bgSubtle: 'bg-teal-500/10' },
  cyan:    { bg: 'bg-cyan-500/20',    text: 'text-cyan-400',    ring: 'ring-cyan-500/30',    circle: '#06b6d4',  bgSubtle: 'bg-cyan-500/10' },
};

const COMPLETION_TIPS: Record<string, string> = {
  box: 'Your cortisol levels should be dropping. Stay relaxed for the next few minutes.',
  '478': 'Your nervous system is in full recovery mode. Ideal time to stretch or sleep.',
  tactical: 'Mind is reset. You\'re ready for the next round. Stay sharp.',
  wimhof: 'Your body is flooded with oxygen and adrenaline. Perfect time for cold exposure or intense focus work.',
  sigh: 'Stress response interrupted. You\'re back in control — now go lift heavy.',
  nasal: 'CO2 tolerance improved. Nasal breathing during your session will feel easier today.',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}s`;
}

function estimateDuration(protocol: BreathingProtocol, cycles: number): number {
  if (protocol.isWimHof) {
    // ~60s rapid + ~90s hold + ~15s recovery = ~165s per round
    return cycles * 165;
  }
  const cycleTime = protocol.phases.reduce((sum, p) => sum + p.duration, 0);
  return cycleTime * cycles;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BreathingProtocols({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>('select');
  const [selectedProtocol, setSelectedProtocol] = useState<BreathingProtocol | null>(null);
  const [cycles, setCycles] = useState(0);

  // Active session state
  const [currentCycle, setCurrentCycle] = useState(1);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [totalBreaths, setTotalBreaths] = useState(0);

  // Wim Hof specific
  const [whStage, setWhStage] = useState<WimHofStage>('rapid');
  const [whBreathCount, setWhBreathCount] = useState(0);
  const [whRetentionTime, setWhRetentionTime] = useState(0);
  const [whRetentionTotal, setWhRetentionTotal] = useState(0);

  // Refs
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseTimeRef = useRef(0);
  const totalElapsedRef = useRef(0);
  const whRetentionRef = useRef(0);

  // ----- Cleanup -----
  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  // ----- Select protocol -----
  const handleSelectProtocol = (protocol: BreathingProtocol) => {
    setSelectedProtocol(protocol);
    setCycles(protocol.defaultCycles);
    setMode('detail');
  };

  // ----- Start standard protocol -----
  const startStandard = useCallback(() => {
    if (!selectedProtocol || selectedProtocol.isWimHof) return;
    setMode('active');
    setCurrentCycle(1);
    setPhaseIndex(0);
    setTotalElapsed(0);
    setTotalBreaths(0);
    totalElapsedRef.current = 0;
    const firstPhase = selectedProtocol.phases[0];
    setPhaseTimeLeft(firstPhase.duration);
    phaseTimeRef.current = firstPhase.duration * 10; // tenths of second
    setIsPaused(false);

    clearTimer();
    let breathsCounted = 0;

    let cycleIdx = 1;
    let pIdx = 0;

    intervalRef.current = setInterval(() => {
      totalElapsedRef.current += 1;
      if (totalElapsedRef.current % 10 === 0) {
        setTotalElapsed(Math.floor(totalElapsedRef.current / 10));
      }

      phaseTimeRef.current -= 1;
      const secsLeft = Math.ceil(phaseTimeRef.current / 10);
      setPhaseTimeLeft(secsLeft);

      if (phaseTimeRef.current <= 0) {
        // Count breath on exhale completion
        const currentPhase = selectedProtocol.phases[pIdx];
        if (currentPhase.label === 'exhale') {
          breathsCounted++;
          setTotalBreaths(breathsCounted);
        }

        // Advance phase
        pIdx++;
        if (pIdx >= selectedProtocol.phases.length) {
          pIdx = 0;
          cycleIdx++;
          setCurrentCycle(cycleIdx);
          if (cycleIdx > cycles) {
            // Done
            clearTimer();
            setTotalElapsed(Math.floor(totalElapsedRef.current / 10));
            setTotalBreaths(breathsCounted);
            setMode('complete');
            return;
          }
        }
        setPhaseIndex(pIdx);
        const nextPhase = selectedProtocol.phases[pIdx];
        phaseTimeRef.current = nextPhase.duration * 10;
        setPhaseTimeLeft(nextPhase.duration);
      }
    }, 100);
  }, [selectedProtocol, cycles, clearTimer]);

  // Wim Hof uses refs for stage tracking so interval closures stay in sync.
  const whStageRef = useRef<WimHofStage>('rapid');
  const whCycleRef = useRef(1);
  const whRapidCountRef = useRef(0);
  const whRapidTimerRef = useRef(0);
  const whBreathsTotalRef = useRef(0);
  const whRetentionTotalRef = useRef(0);

  const startWimHofRefactored = useCallback(() => {
    if (!selectedProtocol?.isWimHof) return;
    setMode('active');
    setCurrentCycle(1);
    setTotalElapsed(0);
    setTotalBreaths(0);
    totalElapsedRef.current = 0;
    setWhStage('rapid');
    setWhBreathCount(0);
    setWhRetentionTime(0);
    setWhRetentionTotal(0);
    whRetentionRef.current = 0;
    whStageRef.current = 'rapid';
    whCycleRef.current = 1;
    whRapidCountRef.current = 0;
    whRapidTimerRef.current = 0;
    whBreathsTotalRef.current = 0;
    whRetentionTotalRef.current = 0;
    setIsPaused(false);
    clearTimer();

    intervalRef.current = setInterval(() => {
      totalElapsedRef.current += 1;
      if (totalElapsedRef.current % 10 === 0) {
        setTotalElapsed(Math.floor(totalElapsedRef.current / 10));
      }

      const s = whStageRef.current;

      if (s === 'rapid') {
        whRapidTimerRef.current += 1;
        if (whRapidTimerRef.current % 20 === 0) {
          whRapidCountRef.current += 1;
          whBreathsTotalRef.current += 1;
          setWhBreathCount(whRapidCountRef.current);
          setTotalBreaths(whBreathsTotalRef.current);
          if (whRapidCountRef.current >= 30) {
            // Move to retention
            whStageRef.current = 'retention';
            whRetentionRef.current = 0;
            setWhStage('retention');
            setWhRetentionTime(0);
          }
        }
      } else if (s === 'retention') {
        whRetentionRef.current += 1;
        if (whRetentionRef.current % 10 === 0) {
          setWhRetentionTime(Math.floor(whRetentionRef.current / 10));
        }
      } else if (s === 'recovery') {
        phaseTimeRef.current -= 1;
        const secsLeft = Math.ceil(phaseTimeRef.current / 10);
        setPhaseTimeLeft(secsLeft);
        if (phaseTimeRef.current <= 0) {
          whBreathsTotalRef.current += 1;
          setTotalBreaths(whBreathsTotalRef.current);
          whCycleRef.current += 1;
          setCurrentCycle(whCycleRef.current);
          if (whCycleRef.current > cycles) {
            clearTimer();
            setTotalElapsed(Math.floor(totalElapsedRef.current / 10));
            setMode('complete');
            return;
          }
          // Start next rapid phase
          whStageRef.current = 'rapid';
          whRapidCountRef.current = 0;
          whRapidTimerRef.current = 0;
          setWhStage('rapid');
          setWhBreathCount(0);
        }
      }
    }, 100);
  }, [selectedProtocol, cycles, clearTimer]);

  const endRetentionRefactored = useCallback(() => {
    if (whStageRef.current !== 'retention') return;
    whRetentionTotalRef.current += Math.floor(whRetentionRef.current / 10);
    setWhRetentionTotal(whRetentionTotalRef.current);
    whStageRef.current = 'recovery';
    phaseTimeRef.current = 150;
    setWhStage('recovery');
    setPhaseTimeLeft(15);
  }, []);

  // ----- Pause/Resume -----
  const togglePause = useCallback(() => {
    if (isPaused) {
      // Resume — restart interval
      setIsPaused(false);
      if (selectedProtocol?.isWimHof) {
        intervalRef.current = setInterval(() => {
          totalElapsedRef.current += 1;
          if (totalElapsedRef.current % 10 === 0) {
            setTotalElapsed(Math.floor(totalElapsedRef.current / 10));
          }
          const s = whStageRef.current;
          if (s === 'rapid') {
            whRapidTimerRef.current += 1;
            if (whRapidTimerRef.current % 20 === 0) {
              whRapidCountRef.current += 1;
              whBreathsTotalRef.current += 1;
              setWhBreathCount(whRapidCountRef.current);
              setTotalBreaths(whBreathsTotalRef.current);
              if (whRapidCountRef.current >= 30) {
                whStageRef.current = 'retention';
                whRetentionRef.current = 0;
                setWhStage('retention');
                setWhRetentionTime(0);
              }
            }
          } else if (s === 'retention') {
            whRetentionRef.current += 1;
            if (whRetentionRef.current % 10 === 0) {
              setWhRetentionTime(Math.floor(whRetentionRef.current / 10));
            }
          } else if (s === 'recovery') {
            phaseTimeRef.current -= 1;
            const secsLeft = Math.ceil(phaseTimeRef.current / 10);
            setPhaseTimeLeft(secsLeft);
            if (phaseTimeRef.current <= 0) {
              whBreathsTotalRef.current += 1;
              setTotalBreaths(whBreathsTotalRef.current);
              whCycleRef.current += 1;
              setCurrentCycle(whCycleRef.current);
              if (whCycleRef.current > cycles) {
                clearTimer();
                setTotalElapsed(Math.floor(totalElapsedRef.current / 10));
                setMode('complete');
                return;
              }
              whStageRef.current = 'rapid';
              whRapidCountRef.current = 0;
              whRapidTimerRef.current = 0;
              setWhStage('rapid');
              setWhBreathCount(0);
            }
          }
        }, 100);
      } else if (selectedProtocol) {
        // Resume standard protocol — we re-create the interval using refs
        let cycleIdx = currentCycle;
        let pIdx = phaseIndex;
        let breathsCounted = totalBreaths;

        intervalRef.current = setInterval(() => {
          totalElapsedRef.current += 1;
          if (totalElapsedRef.current % 10 === 0) {
            setTotalElapsed(Math.floor(totalElapsedRef.current / 10));
          }
          phaseTimeRef.current -= 1;
          const secsLeft = Math.ceil(phaseTimeRef.current / 10);
          setPhaseTimeLeft(secsLeft);

          if (phaseTimeRef.current <= 0) {
            const currentPhase = selectedProtocol.phases[pIdx];
            if (currentPhase.label === 'exhale') {
              breathsCounted++;
              setTotalBreaths(breathsCounted);
            }
            pIdx++;
            if (pIdx >= selectedProtocol.phases.length) {
              pIdx = 0;
              cycleIdx++;
              setCurrentCycle(cycleIdx);
              if (cycleIdx > cycles) {
                clearTimer();
                setTotalElapsed(Math.floor(totalElapsedRef.current / 10));
                setTotalBreaths(breathsCounted);
                setMode('complete');
                return;
              }
            }
            setPhaseIndex(pIdx);
            const nextPhase = selectedProtocol.phases[pIdx];
            phaseTimeRef.current = nextPhase.duration * 10;
            setPhaseTimeLeft(nextPhase.duration);
          }
        }, 100);
      }
    } else {
      // Pause
      setIsPaused(true);
      clearTimer();
    }
  }, [isPaused, selectedProtocol, cycles, clearTimer, currentCycle, phaseIndex, totalBreaths]);

  // ----- Stop -----
  const stopSession = useCallback(() => {
    clearTimer();
    setMode('select');
    setIsPaused(false);
  }, [clearTimer]);

  // ----- Start -----
  const startSession = useCallback(() => {
    if (!selectedProtocol) return;
    if (selectedProtocol.isWimHof) {
      startWimHofRefactored();
    } else {
      startStandard();
    }
  }, [selectedProtocol, startWimHofRefactored, startStandard]);

  // ----- Derived values -----
  const colors = selectedProtocol ? COLOR_MAP[selectedProtocol.color] : null;

  const currentPhase = selectedProtocol && !selectedProtocol.isWimHof && mode === 'active'
    ? selectedProtocol.phases[phaseIndex]
    : null;

  const circleScale = (() => {
    if (mode !== 'active' || !selectedProtocol) return 1;
    if (selectedProtocol.isWimHof) {
      if (whStage === 'rapid') return 1.0 + (whBreathCount % 2 === 0 ? 0.3 : 0);
      if (whStage === 'retention') return 1.0;
      return 1.5; // recovery inhale
    }
    return currentPhase?.scale ?? 1;
  })();

  const circleTransitionDuration = (() => {
    if (mode !== 'active' || !selectedProtocol) return 0.3;
    if (selectedProtocol.isWimHof) return whStage === 'rapid' ? 0.8 : 0.5;
    return currentPhase?.duration ?? 0.3;
  })();

  const phaseLabel = (() => {
    if (mode !== 'active' || !selectedProtocol) return '';
    if (selectedProtocol.isWimHof) {
      if (whStage === 'rapid') return 'Breathe';
      if (whStage === 'retention') return 'Hold';
      return 'Recovery Breath';
    }
    return currentPhase?.displayLabel ?? '';
  })();

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-grappler-950">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-grappler-950/95 backdrop-blur-sm border-b border-grappler-800">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={mode === 'active' ? stopSession : mode === 'detail' ? () => setMode('select') : onClose}
            className="p-2 -ml-2 hover:bg-grappler-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-grappler-50" />
          </button>
          <div className="flex items-center gap-2">
            <Wind className="w-5 h-5 text-grappler-400" />
            <h1 className="text-lg font-semibold text-grappler-50">Breathing</h1>
          </div>
        </div>
      </div>

      {/* ===== SELECT MODE ===== */}
      {mode === 'select' && (
        <div className="p-4 space-y-3">
          <p className="text-sm text-grappler-400 mb-4">
            Guided breathing protocols for combat athletes. Tap a protocol to learn more.
          </p>
          {PROTOCOLS.map(protocol => {
            const c = COLOR_MAP[protocol.color];
            return (
              <button
                key={protocol.id}
                onClick={() => handleSelectProtocol(protocol)}
                className={cn(
                  'w-full text-left rounded-xl border border-grappler-800 p-4',
                  'hover:border-grappler-700 transition-colors',
                  'bg-grappler-900'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn('w-2.5 h-2.5 rounded-full', c.bg)} style={{ backgroundColor: c.circle }} />
                      <span className="font-semibold text-grappler-50">{protocol.name}</span>
                    </div>
                    <p className="text-sm text-grappler-400 mb-2">{protocol.shortName}</p>
                    <div className="flex items-center gap-3 text-xs text-grappler-400">
                      <span className={cn('px-2 py-0.5 rounded-full', c.bgSubtle, c.text)}>
                        {protocol.useCase}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {protocol.durationEstimate}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-grappler-600 mt-1 flex-shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ===== DETAIL MODE ===== */}
      {mode === 'detail' && selectedProtocol && colors && (
        <div className="p-4 space-y-6">
          {/* Protocol header */}
          <div className="text-center space-y-2">
            <div
              className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
              style={{ backgroundColor: colors.circle + '25' }}
            >
              <Waves className="w-8 h-8" style={{ color: colors.circle }} />
            </div>
            <h2 className="text-xl font-bold text-grappler-50">{selectedProtocol.name}</h2>
            <p className="text-sm text-grappler-400 max-w-sm mx-auto">{selectedProtocol.description}</p>
          </div>

          {/* Use case */}
          <div className={cn('text-center text-xs px-3 py-1.5 rounded-full mx-auto w-fit', colors.bgSubtle, colors.text)}>
            {selectedProtocol.useCase}
          </div>

          {/* Phases preview */}
          {!selectedProtocol.isWimHof && (
            <div className="bg-grappler-900 rounded-xl p-4 border border-grappler-800">
              <h3 className="text-sm font-medium text-grappler-400 mb-3">Cycle Pattern</h3>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedProtocol.phases.map((phase, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="text-center">
                      <div
                        className="text-lg font-bold"
                        style={{ color: colors.circle }}
                      >
                        {phase.duration}s
                      </div>
                      <div className="text-xs text-grappler-400">{phase.displayLabel}</div>
                    </div>
                    {i < selectedProtocol.phases.length - 1 && (
                      <span className="text-grappler-600 text-xs">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedProtocol.isWimHof && (
            <div className="bg-grappler-900 rounded-xl p-4 border border-grappler-800 space-y-3">
              <h3 className="text-sm font-medium text-grappler-400 mb-1">Each Round</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-orange-400 font-mono text-xs bg-orange-500/10 px-1.5 py-0.5 rounded">1</span>
                  <span className="text-grappler-50">30 rapid breaths — inhale fully, let go (~60s)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-orange-400 font-mono text-xs bg-orange-500/10 px-1.5 py-0.5 rounded">2</span>
                  <span className="text-grappler-50">Hold after exhale — as long as possible (target 90s)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-orange-400 font-mono text-xs bg-orange-500/10 px-1.5 py-0.5 rounded">3</span>
                  <span className="text-grappler-50">Recovery breath — inhale deep, hold 15s</span>
                </div>
              </div>
            </div>
          )}

          {/* Cycle picker */}
          <div className="bg-grappler-900 rounded-xl p-4 border border-grappler-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-grappler-50">
                  {selectedProtocol.isWimHof ? 'Rounds' : 'Cycles'}
                </h3>
                <p className="text-xs text-grappler-400 mt-0.5">
                  Est. {formatSeconds(estimateDuration(selectedProtocol, cycles))}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCycles(c => Math.max(1, c - 1))}
                  className="w-9 h-9 rounded-lg bg-grappler-800 hover:bg-grappler-700 flex items-center justify-center transition-colors"
                >
                  <Minus className="w-4 h-4 text-grappler-50" />
                </button>
                <span className="text-xl font-bold text-grappler-50 w-8 text-center">{cycles}</span>
                <button
                  onClick={() => setCycles(c => c + 1)}
                  className="w-9 h-9 rounded-lg bg-grappler-800 hover:bg-grappler-700 flex items-center justify-center transition-colors"
                >
                  <Plus className="w-4 h-4 text-grappler-50" />
                </button>
              </div>
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={startSession}
            className="w-full py-4 rounded-xl font-semibold text-white text-lg transition-colors"
            style={{ backgroundColor: colors.circle }}
          >
            Start Breathing
          </button>
        </div>
      )}

      {/* ===== ACTIVE MODE ===== */}
      {mode === 'active' && selectedProtocol && colors && (
        <div className="flex flex-col items-center justify-between min-h-[calc(var(--app-h)-64px)] p-4">
          {/* Phase + cycle info */}
          <div className="text-center space-y-2 pt-4">
            <div className="text-sm text-grappler-400">
              {selectedProtocol.isWimHof ? 'Round' : 'Cycle'} {currentCycle} / {cycles}
            </div>

            {/* Phase indicator dots (standard protocols) */}
            {!selectedProtocol.isWimHof && (
              <div className="flex items-center justify-center gap-2">
                {selectedProtocol.phases.map((phase, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-2 h-2 rounded-full transition-all duration-300',
                      i === phaseIndex ? 'w-6' : ''
                    )}
                    style={{
                      backgroundColor: i === phaseIndex ? colors.circle : colors.circle + '40',
                    }}
                  />
                ))}
              </div>
            )}

            {/* Wim Hof stage indicator */}
            {selectedProtocol.isWimHof && (
              <div className="flex items-center justify-center gap-2">
                {(['rapid', 'retention', 'recovery'] as const).map(stage => (
                  <div
                    key={stage}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs transition-all duration-300',
                      whStage === stage
                        ? 'text-white'
                        : 'text-grappler-500'
                    )}
                    style={{
                      backgroundColor: whStage === stage ? colors.circle + '40' : 'transparent',
                    }}
                  >
                    {stage === 'rapid' ? 'Rapid' : stage === 'retention' ? 'Hold' : 'Recovery'}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Central breathing circle */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Background glow */}
            <div
              className="absolute inset-0 opacity-10 transition-opacity duration-1000 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 50% 45%, ${colors.circle}40, transparent 70%)`,
              }}
            />

            <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
              {/* Outer ring */}
              <div
                className="absolute inset-0 rounded-full transition-transform"
                style={{
                  transform: `scale(${circleScale})`,
                  transitionDuration: `${circleTransitionDuration}s`,
                  transitionTimingFunction: 'ease-in-out',
                  border: `2px solid ${colors.circle}30`,
                }}
              />

              {/* Main circle */}
              <div
                className="w-full h-full rounded-full flex flex-col items-center justify-center transition-transform"
                style={{
                  transform: `scale(${circleScale})`,
                  transitionDuration: `${circleTransitionDuration}s`,
                  transitionTimingFunction: 'ease-in-out',
                  backgroundColor: colors.circle + '20',
                  border: `3px solid ${colors.circle}`,
                  boxShadow: `0 0 40px ${colors.circle}30`,
                }}
              >
                {/* Phase label */}
                <span className="text-lg font-semibold text-grappler-50">
                  {phaseLabel}
                </span>

                {/* Countdown / Info */}
                {selectedProtocol.isWimHof ? (
                  <>
                    {whStage === 'rapid' && (
                      <span className="text-3xl font-bold mt-1" style={{ color: colors.circle }}>
                        {whBreathCount}/30
                      </span>
                    )}
                    {whStage === 'retention' && (
                      <span className="text-3xl font-bold mt-1" style={{ color: colors.circle }}>
                        {formatSeconds(whRetentionTime)}
                      </span>
                    )}
                    {whStage === 'recovery' && (
                      <span className="text-3xl font-bold mt-1" style={{ color: colors.circle }}>
                        {phaseTimeLeft}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-3xl font-bold mt-1" style={{ color: colors.circle }}>
                    {phaseTimeLeft}
                  </span>
                )}
              </div>
            </div>

            {/* Wim Hof retention tap prompt */}
            {selectedProtocol.isWimHof && whStage === 'retention' && (
              <button
                onClick={endRetentionRefactored}
                className="mt-8 px-8 py-3 rounded-xl font-medium text-white transition-colors"
                style={{ backgroundColor: colors.circle }}
              >
                Tap When You Need to Breathe
              </button>
            )}
          </div>

          {/* Bottom controls */}
          <div className="w-full space-y-4 pb-6">
            {/* Elapsed time */}
            <div className="text-center text-sm text-grappler-400">
              <Clock className="w-4 h-4 inline mr-1 -mt-0.5" />
              {formatSeconds(totalElapsed)}
            </div>

            {/* Control buttons */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={togglePause}
                className="w-14 h-14 rounded-full bg-grappler-800 hover:bg-grappler-700 flex items-center justify-center transition-colors"
              >
                {isPaused ? (
                  <Play className="w-6 h-6 text-grappler-50 ml-0.5" />
                ) : (
                  <Pause className="w-6 h-6 text-grappler-50" />
                )}
              </button>
              <button
                onClick={stopSession}
                className="w-14 h-14 rounded-full bg-grappler-800 hover:bg-grappler-700 flex items-center justify-center transition-colors"
              >
                <Square className="w-5 h-5 text-grappler-50" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== COMPLETE MODE ===== */}
      {mode === 'complete' && selectedProtocol && colors && (
        <div className="flex flex-col items-center justify-center min-h-[calc(var(--app-h)-64px)] p-6 text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
            style={{ backgroundColor: colors.circle + '20' }}
          >
            <CheckCircle2 className="w-10 h-10" style={{ color: colors.circle }} />
          </div>

          <h2 className="text-2xl font-bold text-grappler-50 mb-1">Well Done</h2>
          <p className="text-grappler-400 mb-8">{selectedProtocol.name} complete</p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-xs mb-8">
            <div className="bg-grappler-900 rounded-xl p-4 border border-grappler-800">
              <Clock className="w-5 h-5 mx-auto mb-1" style={{ color: colors.circle }} />
              <div className="text-lg font-bold text-grappler-50">{formatSeconds(totalElapsed)}</div>
              <div className="text-xs text-grappler-400">Total Time</div>
            </div>
            <div className="bg-grappler-900 rounded-xl p-4 border border-grappler-800">
              <Repeat className="w-5 h-5 mx-auto mb-1" style={{ color: colors.circle }} />
              <div className="text-lg font-bold text-grappler-50">{totalBreaths}</div>
              <div className="text-xs text-grappler-400">Breaths</div>
            </div>
          </div>

          {/* Wim Hof extra stat */}
          {selectedProtocol.isWimHof && whRetentionTotal > 0 && (
            <div className="bg-grappler-900 rounded-xl p-4 border border-grappler-800 w-full max-w-xs mb-8">
              <div className="text-lg font-bold text-grappler-50">{formatSeconds(whRetentionTotal)}</div>
              <div className="text-xs text-grappler-400">Total Retention Hold</div>
            </div>
          )}

          {/* Tip */}
          <div className="bg-grappler-900 rounded-xl p-4 border border-grappler-800 w-full max-w-sm">
            <p className="text-sm text-grappler-400 italic">
              {COMPLETION_TIPS[selectedProtocol.id] ?? 'Great work. Take a moment before your next activity.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-8 w-full max-w-xs">
            <button
              onClick={() => setMode('detail')}
              className="flex-1 py-3 rounded-xl bg-grappler-800 hover:bg-grappler-700 text-grappler-50 font-medium transition-colors"
            >
              Repeat
            </button>
            <button
              onClick={() => setMode('select')}
              className="flex-1 py-3 rounded-xl text-white font-medium transition-colors"
              style={{ backgroundColor: colors.circle }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
