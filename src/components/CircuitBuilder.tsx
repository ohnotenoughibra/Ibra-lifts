'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Play,
  Pause,
  Square,
  SkipForward,
  Timer,
  Flame,
  Zap,
  Repeat,
  Clock,
  Swords,
  Waves,
  Dumbbell,
  Target,
  Save,
  Check,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  ConditioningType,
  ConditioningExercise,
} from '@/lib/conditioning-templates';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CircuitBuilderProps {
  onClose: () => void;
}

type Mode = 'build' | 'run';
type Phase = 'idle' | 'countdown' | 'work' | 'rest' | 'complete';
type ExerciseInputMode = 'reps' | 'duration';

interface BuildExercise extends ConditioningExercise {
  id: string;
}

interface ProtocolConfig {
  type: ConditioningType;
  rounds: number;
  workInterval: number; // seconds
  restInterval: number; // seconds
  timeCap: number; // minutes (AMRAP only)
}

interface SavedTemplate {
  id: string;
  name: string;
  config: ProtocolConfig;
  exercises: BuildExercise[];
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROTOCOL_CARDS: {
  type: ConditioningType;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}[] = [
  {
    type: 'emom',
    label: 'EMOM',
    description: 'Every Minute On The Minute',
    icon: Clock,
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/15 border-sky-500/30',
  },
  {
    type: 'tabata',
    label: 'Tabata',
    description: '20s work / 10s rest',
    icon: Zap,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/15 border-rose-500/30',
  },
  {
    type: 'amrap',
    label: 'AMRAP',
    description: 'As Many Rounds As Possible',
    icon: Repeat,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/15 border-amber-500/30',
  },
  {
    type: 'interval',
    label: 'Interval',
    description: 'Custom work/rest ratio',
    icon: Timer,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/15 border-emerald-500/30',
  },
  {
    type: 'circuit',
    label: 'Circuit',
    description: 'Station-to-station rounds',
    icon: Dumbbell,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/15 border-violet-500/30',
  },
  {
    type: 'shark_tank',
    label: 'Shark Tank',
    description: 'Fresh partner each round',
    icon: Swords,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/15 border-orange-500/30',
  },
];

const MET_VALUES: Record<ConditioningType, number> = {
  emom: 8,
  circuit: 8,
  tabata: 10,
  shark_tank: 10,
  interval: 7,
  amrap: 8,
};

const DEFAULT_CONFIGS: Record<ConditioningType, Omit<ProtocolConfig, 'type'>> = {
  emom: { rounds: 10, workInterval: 60, restInterval: 0, timeCap: 0 },
  tabata: { rounds: 8, workInterval: 20, restInterval: 10, timeCap: 0 },
  amrap: { rounds: 1, workInterval: 0, restInterval: 0, timeCap: 15 },
  interval: { rounds: 8, workInterval: 40, restInterval: 20, timeCap: 0 },
  circuit: { rounds: 4, workInterval: 45, restInterval: 60, timeCap: 0 },
  shark_tank: { rounds: 5, workInterval: 300, restInterval: 60, timeCap: 0 },
};

const BODY_WEIGHT_KG = 80;

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CircuitBuilder({ onClose }: CircuitBuilderProps) {
  // ----- mode & build state ------------------------------------------------
  const [mode, setMode] = useState<Mode>('build');
  const [selectedType, setSelectedType] = useState<ConditioningType | null>(null);
  const [config, setConfig] = useState<ProtocolConfig>({
    type: 'emom',
    rounds: 10,
    workInterval: 60,
    restInterval: 0,
    timeCap: 0,
  });
  const [exercises, setExercises] = useState<BuildExercise[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  // add-exercise form
  const [exName, setExName] = useState('');
  const [exInputMode, setExInputMode] = useState<ExerciseInputMode>('reps');
  const [exReps, setExReps] = useState(10);
  const [exDuration, setExDuration] = useState(30);
  const [exNotes, setExNotes] = useState('');

  // ----- run state ---------------------------------------------------------
  const [phase, setPhase] = useState<Phase>('idle');
  const [currentRound, setCurrentRound] = useState(1);
  const [currentExIndex, setCurrentExIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [amrapRounds, setAmrapRounds] = useState(0);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [flashColor, setFlashColor] = useState<string | null>(null);

  // save template
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // refs
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<number>(0);
  const elapsedStartRef = useRef<number>(0);
  const elapsedAccRef = useRef<number>(0);

  // ----- derived -----------------------------------------------------------
  const isAmrap = config.type === 'amrap';
  const hasWorkInterval = !isAmrap;
  const hasRestInterval = !isAmrap;
  const totalRounds = isAmrap ? amrapRounds : config.rounds;

  const estimatedDurationSeconds = useMemo(() => {
    if (isAmrap) return config.timeCap * 60;
    const perRound = config.workInterval + config.restInterval;
    return config.rounds * perRound;
  }, [config, isAmrap]);

  const estimatedCalories = useMemo(() => {
    const met = MET_VALUES[config.type];
    const hours = estimatedDurationSeconds / 3600;
    return Math.round(met * BODY_WEIGHT_KG * hours);
  }, [config.type, estimatedDurationSeconds]);

  const isValid = exercises.length >= 1 && config.rounds >= 1;

  // ----- protocol selection ------------------------------------------------
  function selectProtocol(type: ConditioningType) {
    setSelectedType(type);
    const defaults = DEFAULT_CONFIGS[type];
    setConfig({ type, ...defaults });
  }

  // ----- config helpers ----------------------------------------------------
  function updateRounds(delta: number) {
    setConfig((prev) => ({
      ...prev,
      rounds: Math.max(1, Math.min(50, prev.rounds + delta)),
    }));
  }

  function updateWorkInterval(val: number) {
    setConfig((prev) => ({ ...prev, workInterval: Math.max(5, Math.min(600, val)) }));
  }

  function updateRestInterval(val: number) {
    setConfig((prev) => ({ ...prev, restInterval: Math.max(0, Math.min(300, val)) }));
  }

  function updateTimeCap(val: number) {
    setConfig((prev) => ({ ...prev, timeCap: Math.max(1, Math.min(60, val)) }));
  }

  // ----- exercise list helpers ---------------------------------------------
  function addExercise() {
    if (!exName.trim()) return;
    const newEx: BuildExercise = {
      id: uid(),
      name: exName.trim(),
      reps: exInputMode === 'reps' ? exReps : undefined,
      duration: exInputMode === 'duration' ? exDuration : undefined,
      notes: exNotes.trim() || undefined,
    };
    setExercises((prev) => [...prev, newEx]);
    setExName('');
    setExReps(10);
    setExDuration(30);
    setExNotes('');
    setShowAddForm(false);
  }

  function removeExercise(id: string) {
    setExercises((prev) => prev.filter((e) => e.id !== id));
  }

  function moveExercise(index: number, direction: 'up' | 'down') {
    setExercises((prev) => {
      const arr = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= arr.length) return arr;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  }

  // ----- timer engine ------------------------------------------------------
  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const triggerFlash = useCallback((color: string) => {
    setFlashColor(color);
    setTimeout(() => setFlashColor(null), 400);
  }, []);

  const startTimer = useCallback(
    (durationSec: number) => {
      clearTick();
      endTimeRef.current = Date.now() + durationSec * 1000;
      setTimeRemaining(durationSec);
      setIsPaused(false);

      tickRef.current = setInterval(() => {
        const remaining = Math.max(
          0,
          Math.ceil((endTimeRef.current - Date.now()) / 1000)
        );
        setTimeRemaining(remaining);

        // update total elapsed
        const elapsedNow =
          elapsedAccRef.current +
          Math.floor((Date.now() - elapsedStartRef.current) / 1000);
        setTotalElapsed(elapsedNow);

        if (remaining <= 0) {
          clearTick();
        }
      }, 100);
    },
    [clearTick]
  );

  // Phase transitions
  const advancePhase = useCallback(() => {
    // helper: called when a phase's timer hits zero
    if (phase === 'countdown') {
      setPhase('work');
      triggerFlash('bg-emerald-500/30');
      if (isAmrap) {
        startTimer(config.timeCap * 60);
      } else {
        startTimer(config.workInterval);
      }
      return;
    }

    if (phase === 'work') {
      if (isAmrap) {
        // AMRAP: work phase ending = entire workout done
        setPhase('complete');
        clearTick();
        return;
      }

      // Check if rest is 0 (e.g. EMOM) — skip rest phase
      if (config.restInterval <= 0) {
        // next round or complete
        if (currentRound >= config.rounds) {
          setPhase('complete');
          clearTick();
          triggerFlash('bg-amber-500/30');
          return;
        }
        setCurrentRound((r) => r + 1);
        setCurrentExIndex((i) => (i + 1) % exercises.length);
        triggerFlash('bg-emerald-500/30');
        startTimer(config.workInterval);
        return;
      }

      setPhase('rest');
      triggerFlash('bg-rose-500/30');
      startTimer(config.restInterval);
      return;
    }

    if (phase === 'rest') {
      if (currentRound >= config.rounds) {
        setPhase('complete');
        clearTick();
        triggerFlash('bg-amber-500/30');
        return;
      }
      setCurrentRound((r) => r + 1);
      setCurrentExIndex((i) => (i + 1) % exercises.length);
      setPhase('work');
      triggerFlash('bg-emerald-500/30');
      startTimer(config.workInterval);
    }
  }, [
    phase,
    isAmrap,
    config,
    currentRound,
    exercises.length,
    clearTick,
    startTimer,
    triggerFlash,
  ]);

  // Watch timeRemaining for auto-advance
  useEffect(() => {
    if (
      timeRemaining <= 0 &&
      (phase === 'countdown' || phase === 'work' || phase === 'rest')
    ) {
      advancePhase();
    }
  }, [timeRemaining, phase, advancePhase]);

  // Cleanup
  useEffect(() => {
    return () => clearTick();
  }, [clearTick]);

  // ----- run controls ------------------------------------------------------
  function handleStart() {
    setMode('run');
    setPhase('countdown');
    setCurrentRound(1);
    setCurrentExIndex(0);
    setTotalElapsed(0);
    setAmrapRounds(0);
    setIsPaused(false);
    elapsedAccRef.current = 0;
    elapsedStartRef.current = Date.now();
    startTimer(3); // 3-2-1 countdown
  }

  function handlePause() {
    if (isPaused) {
      // Resume — recalculate end time
      const newEnd = Date.now() + timeRemaining * 1000;
      endTimeRef.current = newEnd;
      elapsedStartRef.current = Date.now();
      setIsPaused(false);

      tickRef.current = setInterval(() => {
        const remaining = Math.max(
          0,
          Math.ceil((endTimeRef.current - Date.now()) / 1000)
        );
        setTimeRemaining(remaining);
        const elapsedNow =
          elapsedAccRef.current +
          Math.floor((Date.now() - elapsedStartRef.current) / 1000);
        setTotalElapsed(elapsedNow);
        if (remaining <= 0) clearTick();
      }, 100);
    } else {
      // Pause
      clearTick();
      elapsedAccRef.current += Math.floor(
        (Date.now() - elapsedStartRef.current) / 1000
      );
      setIsPaused(true);
    }
  }

  function handleSkip() {
    clearTick();
    setTimeRemaining(0);
    // advancePhase will fire via the effect
  }

  function handleStop() {
    clearTick();
    setPhase('complete');
  }

  function handleAmrapRoundTap() {
    if (isAmrap && phase === 'work') {
      setAmrapRounds((r) => r + 1);
    }
  }

  function handleReset() {
    clearTick();
    setMode('build');
    setPhase('idle');
    setCurrentRound(1);
    setCurrentExIndex(0);
    setTimeRemaining(0);
    setTotalElapsed(0);
    setIsPaused(false);
    setAmrapRounds(0);
    setShowStopConfirm(false);
    setShowSaveForm(false);
  }

  // ----- save template -----------------------------------------------------
  function handleSaveTemplate() {
    if (!templateName.trim()) return;
    const tpl: SavedTemplate = {
      id: uid(),
      name: templateName.trim(),
      config,
      exercises,
      createdAt: new Date().toISOString(),
    };
    try {
      const existing = JSON.parse(
        localStorage.getItem('circuit-builder-templates') || '[]'
      ) as SavedTemplate[];
      existing.push(tpl);
      localStorage.setItem(
        'circuit-builder-templates',
        JSON.stringify(existing)
      );
    } catch {
      // silently fail
    }
    setShowSaveForm(false);
    setTemplateName('');
  }

  // ----- circular timer math -----------------------------------------------
  const timerDuration = useMemo(() => {
    if (phase === 'countdown') return 3;
    if (phase === 'work') return isAmrap ? config.timeCap * 60 : config.workInterval;
    if (phase === 'rest') return config.restInterval;
    return 1;
  }, [phase, isAmrap, config]);

  const progress = timerDuration > 0 ? 1 - timeRemaining / timerDuration : 0;
  const circumference = 2 * Math.PI * 90; // r=90
  const strokeDashoffset = circumference * (1 - progress);

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="fixed inset-0 z-50 bg-grappler-950 overflow-y-auto safe-area-top"
    >
      {/* Flash overlay */}
      <AnimatePresence>
        {flashColor && (
          <motion.div
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className={cn('fixed inset-0 z-[60] pointer-events-none', flashColor)}
          />
        )}
      </AnimatePresence>

      {/* Sticky header */}
      <div className="sticky top-0 z-50 bg-grappler-950 border-b border-grappler-800">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={mode === 'run' && phase !== 'complete' ? () => setShowStopConfirm(true) : onClose}
            className="p-2 -ml-2 rounded-lg hover:bg-grappler-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-grappler-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-grappler-50">
              Circuit Builder
            </h1>
            {selectedType && mode === 'build' && (
              <p className="text-xs text-grappler-400">
                {PROTOCOL_CARDS.find((p) => p.type === selectedType)?.label} Protocol
              </p>
            )}
          </div>
          {mode === 'run' && phase !== 'complete' && (
            <span className="text-xs font-mono text-grappler-400 bg-grappler-800 px-2 py-1 rounded">
              {formatSeconds(totalElapsed)}
            </span>
          )}
        </div>
      </div>

      <div className="px-4 pb-32">
        {/* =============================================================== */}
        {/* BUILD MODE                                                      */}
        {/* =============================================================== */}
        {mode === 'build' && (
          <div className="space-y-6 pt-4">
            {/* --- Protocol Type Picker --- */}
            <section>
              <h2 className="text-sm font-semibold text-grappler-400 uppercase tracking-wider mb-3">
                Protocol Type
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {PROTOCOL_CARDS.map((p) => {
                  const Icon = p.icon;
                  const active = selectedType === p.type;
                  return (
                    <motion.button
                      key={p.type}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => selectProtocol(p.type)}
                      className={cn(
                        'relative p-4 rounded-xl border text-left transition-all',
                        active
                          ? cn(p.bgColor, 'ring-1 ring-primary-500/50')
                          : 'bg-grappler-900 border-grappler-800 hover:border-grappler-700'
                      )}
                    >
                      <Icon
                        className={cn(
                          'w-6 h-6 mb-2',
                          active ? p.color : 'text-grappler-500'
                        )}
                      />
                      <p
                        className={cn(
                          'font-bold text-sm',
                          active ? 'text-grappler-50' : 'text-grappler-300'
                        )}
                      >
                        {p.label}
                      </p>
                      <p className="text-xs text-grappler-500 mt-0.5 leading-tight">
                        {p.description}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
            </section>

            {/* --- Configuration Panel --- */}
            <AnimatePresence>
              {selectedType && (
                <motion.section
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <h2 className="text-sm font-semibold text-grappler-400 uppercase tracking-wider mb-3">
                    Configuration
                  </h2>
                  <div className="bg-grappler-900 border border-grappler-800 rounded-xl p-4 space-y-4">
                    {/* Rounds */}
                    {!isAmrap && (
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-grappler-300">Rounds</label>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => updateRounds(-1)}
                            className="w-8 h-8 rounded-lg bg-grappler-800 flex items-center justify-center text-grappler-400 hover:text-grappler-50 transition-colors"
                          >
                            <span className="text-lg font-bold">-</span>
                          </button>
                          <span className="text-grappler-50 font-bold text-lg w-8 text-center tabular-nums">
                            {config.rounds}
                          </span>
                          <button
                            onClick={() => updateRounds(1)}
                            className="w-8 h-8 rounded-lg bg-grappler-800 flex items-center justify-center text-grappler-400 hover:text-grappler-50 transition-colors"
                          >
                            <span className="text-lg font-bold">+</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Work Interval */}
                    {hasWorkInterval && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm text-grappler-300">
                            Work Interval
                          </label>
                          <span className="text-sm font-mono text-primary-400">
                            {formatSeconds(config.workInterval)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={5}
                          max={600}
                          step={5}
                          value={config.workInterval}
                          onChange={(e) =>
                            updateWorkInterval(Number(e.target.value))
                          }
                          className="w-full accent-primary-500"
                        />
                      </div>
                    )}

                    {/* Rest Interval */}
                    {hasRestInterval && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm text-grappler-300">
                            Rest Interval
                          </label>
                          <span className="text-sm font-mono text-primary-400">
                            {formatSeconds(config.restInterval)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={300}
                          step={5}
                          value={config.restInterval}
                          onChange={(e) =>
                            updateRestInterval(Number(e.target.value))
                          }
                          className="w-full accent-primary-500"
                        />
                      </div>
                    )}

                    {/* Time Cap (AMRAP) */}
                    {isAmrap && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm text-grappler-300">
                            Time Cap (min)
                          </label>
                          <span className="text-sm font-mono text-primary-400">
                            {config.timeCap} min
                          </span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={60}
                          step={1}
                          value={config.timeCap}
                          onChange={(e) =>
                            updateTimeCap(Number(e.target.value))
                          }
                          className="w-full accent-primary-500"
                        />
                      </div>
                    )}

                    {/* Total Duration */}
                    <div className="pt-2 border-t border-grappler-800 flex items-center justify-between">
                      <span className="text-xs text-grappler-500">
                        Estimated Duration
                      </span>
                      <span className="text-sm font-bold text-grappler-50">
                        {formatSeconds(estimatedDurationSeconds)}
                      </span>
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* --- Exercise List Builder --- */}
            {selectedType && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-grappler-400 uppercase tracking-wider">
                    Exercises ({exercises.length})
                  </h2>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-1.5 text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Exercise
                  </button>
                </div>

                {/* Exercise cards */}
                <div className="space-y-2">
                  <AnimatePresence>
                    {exercises.map((ex, i) => (
                      <motion.div
                        key={ex.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -80 }}
                        className="bg-grappler-900 border border-grappler-800 rounded-xl p-3 flex items-start gap-3"
                      >
                        {/* Reorder buttons */}
                        <div className="flex flex-col gap-0.5 pt-0.5">
                          <button
                            onClick={() => moveExercise(i, 'up')}
                            disabled={i === 0}
                            className="p-0.5 rounded text-grappler-600 hover:text-grappler-300 disabled:opacity-30 transition-colors"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveExercise(i, 'down')}
                            disabled={i === exercises.length - 1}
                            className="p-0.5 rounded text-grappler-600 hover:text-grappler-300 disabled:opacity-30 transition-colors"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-grappler-50 truncate">
                            {ex.name}
                          </p>
                          <p className="text-xs text-grappler-400 mt-0.5">
                            {ex.reps
                              ? `${ex.reps} reps`
                              : ex.duration
                              ? `${ex.duration}s`
                              : 'No target'}
                            {ex.notes && ` \u2022 ${ex.notes}`}
                          </p>
                        </div>

                        {/* Delete */}
                        <button
                          onClick={() => removeExercise(ex.id)}
                          className="p-1.5 rounded-lg text-grappler-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {exercises.length === 0 && (
                    <div className="text-center py-8 text-grappler-600 text-sm">
                      No exercises yet. Add at least one to continue.
                    </div>
                  )}
                </div>

                {/* Add exercise mini-form */}
                <AnimatePresence>
                  {showAddForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mt-3"
                    >
                      <div className="bg-grappler-900 border border-primary-500/30 rounded-xl p-4 space-y-3">
                        {/* Name */}
                        <input
                          type="text"
                          placeholder="Exercise name"
                          value={exName}
                          onChange={(e) => setExName(e.target.value)}
                          autoFocus
                          className="w-full bg-grappler-800 border border-grappler-700 rounded-lg px-3 py-2 text-sm text-grappler-50 placeholder:text-grappler-600 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
                        />

                        {/* Reps / Duration toggle */}
                        <div>
                          <div className="flex gap-2 mb-2">
                            <button
                              onClick={() => setExInputMode('reps')}
                              className={cn(
                                'flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors',
                                exInputMode === 'reps'
                                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                                  : 'bg-grappler-800 text-grappler-500 border border-grappler-700'
                              )}
                            >
                              Reps
                            </button>
                            <button
                              onClick={() => setExInputMode('duration')}
                              className={cn(
                                'flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors',
                                exInputMode === 'duration'
                                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                                  : 'bg-grappler-800 text-grappler-500 border border-grappler-700'
                              )}
                            >
                              Duration (sec)
                            </button>
                          </div>
                          <input
                            type="number" inputMode="decimal" enterKeyHint="done"
                            min={1}
                            value={exInputMode === 'reps' ? exReps : exDuration}
                            onChange={(e) => {
                              const val = Math.max(1, Number(e.target.value) || 1);
                              if (exInputMode === 'reps') setExReps(val);
                              else setExDuration(val);
                            }}
                            className="w-full bg-grappler-800 border border-grappler-700 rounded-lg px-3 py-2 text-sm text-grappler-50 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
                          />
                        </div>

                        {/* Notes */}
                        <input
                          type="text"
                          placeholder="Notes (optional)"
                          value={exNotes}
                          onChange={(e) => setExNotes(e.target.value)}
                          className="w-full bg-grappler-800 border border-grappler-700 rounded-lg px-3 py-2 text-sm text-grappler-50 placeholder:text-grappler-600 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
                        />

                        {/* Form actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowAddForm(false)}
                            className="flex-1 py-2 text-sm font-medium text-grappler-400 bg-grappler-800 rounded-lg hover:bg-grappler-700 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={addExercise}
                            disabled={!exName.trim()}
                            className="flex-1 py-2 text-sm font-medium text-grappler-50 bg-primary-500 rounded-lg hover:bg-primary-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            )}

            {/* --- Summary Card --- */}
            {selectedType && exercises.length > 0 && (
              <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <h2 className="text-sm font-semibold text-grappler-400 uppercase tracking-wider mb-3">
                  Summary
                </h2>
                <div className="bg-grappler-900 border border-grappler-800 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-grappler-400">Protocol</span>
                    <span className="text-grappler-50 font-medium">
                      {PROTOCOL_CARDS.find((p) => p.type === config.type)?.label}
                    </span>
                  </div>
                  {!isAmrap && (
                    <div className="flex justify-between text-sm">
                      <span className="text-grappler-400">Rounds</span>
                      <span className="text-grappler-50 font-medium">
                        {config.rounds}
                      </span>
                    </div>
                  )}
                  {hasWorkInterval && (
                    <div className="flex justify-between text-sm">
                      <span className="text-grappler-400">Work / Rest</span>
                      <span className="text-grappler-50 font-medium">
                        {formatSeconds(config.workInterval)} /{' '}
                        {formatSeconds(config.restInterval)}
                      </span>
                    </div>
                  )}
                  {isAmrap && (
                    <div className="flex justify-between text-sm">
                      <span className="text-grappler-400">Time Cap</span>
                      <span className="text-grappler-50 font-medium">
                        {config.timeCap} min
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-grappler-400">Exercises</span>
                    <span className="text-grappler-50 font-medium">
                      {exercises.length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-grappler-400">Est. Duration</span>
                    <span className="text-grappler-50 font-medium">
                      {formatSeconds(estimatedDurationSeconds)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-1 border-t border-grappler-800">
                    <span className="text-grappler-400 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      Est. Calories
                    </span>
                    <span className="text-orange-400 font-bold">
                      {estimatedCalories} kcal
                    </span>
                  </div>
                </div>
              </motion.section>
            )}

            {/* --- Start Workout Button --- */}
            {selectedType && (
              <div className="pt-2 pb-4">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleStart}
                  disabled={!isValid}
                  className={cn(
                    'w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all',
                    isValid
                      ? 'bg-primary-500 text-grappler-50 hover:bg-primary-400 shadow-lg shadow-primary-500/20'
                      : 'bg-grappler-800 text-grappler-600 cursor-not-allowed'
                  )}
                >
                  <Play className="w-5 h-5" />
                  Start Workout
                </motion.button>
              </div>
            )}
          </div>
        )}

        {/* =============================================================== */}
        {/* RUN MODE                                                        */}
        {/* =============================================================== */}
        {mode === 'run' && phase !== 'complete' && (
          <div className="flex flex-col items-center pt-6 space-y-6">
            {/* Phase label */}
            <div className="text-center">
              <span
                className={cn(
                  'inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest',
                  phase === 'countdown' && 'bg-amber-500/20 text-amber-400',
                  phase === 'work' && 'bg-emerald-500/20 text-emerald-400',
                  phase === 'rest' && 'bg-rose-500/20 text-rose-400'
                )}
              >
                {phase === 'countdown'
                  ? 'Get Ready'
                  : phase === 'work'
                  ? 'Work'
                  : 'Rest'}
              </span>
            </div>

            {/* Circular Timer */}
            <div className="relative w-56 h-56">
              <svg
                className="w-full h-full -rotate-90"
                viewBox="0 0 200 200"
              >
                {/* Background circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-grappler-800"
                />
                {/* Progress circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className={cn(
                    'transition-[stroke-dashoffset] duration-200',
                    phase === 'countdown' && 'stroke-amber-400',
                    phase === 'work' && 'stroke-emerald-400',
                    phase === 'rest' && 'stroke-rose-400'
                  )}
                />
              </svg>

              {/* Timer text (centered) */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className={cn(
                    'text-5xl font-bold tabular-nums',
                    phase === 'countdown' && 'text-amber-400',
                    phase === 'work' && 'text-emerald-400',
                    phase === 'rest' && 'text-rose-400'
                  )}
                >
                  {phase === 'countdown'
                    ? timeRemaining
                    : formatSeconds(timeRemaining)}
                </span>
                {!isAmrap && (
                  <span className="text-sm text-grappler-500 mt-1">
                    Round {currentRound} / {config.rounds}
                  </span>
                )}
                {isAmrap && phase === 'work' && (
                  <span className="text-sm text-grappler-500 mt-1">
                    Rounds: {amrapRounds}
                  </span>
                )}
              </div>
            </div>

            {/* Exercise Info */}
            {phase !== 'countdown' && exercises.length > 0 && (
              <div className="w-full bg-grappler-900 border border-grappler-800 rounded-xl p-4 text-center">
                <p className="text-xs text-grappler-500 mb-1 uppercase tracking-wider">
                  {config.type === 'circuit'
                    ? `Station ${currentExIndex + 1} of ${exercises.length}`
                    : 'Current Exercise'}
                </p>
                <p className="text-lg font-bold text-grappler-50">
                  {exercises[currentExIndex % exercises.length].name}
                </p>
                {(() => {
                  const ex = exercises[currentExIndex % exercises.length];
                  const parts: string[] = [];
                  if (ex.reps) parts.push(`${ex.reps} reps`);
                  if (ex.duration) parts.push(`${ex.duration}s`);
                  if (ex.notes) parts.push(ex.notes);
                  return parts.length > 0 ? (
                    <p className="text-sm text-grappler-400 mt-1">
                      {parts.join(' \u2022 ')}
                    </p>
                  ) : null;
                })()}
              </div>
            )}

            {/* AMRAP round counter button */}
            {isAmrap && phase === 'work' && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleAmrapRoundTap}
                className="w-full py-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400 font-bold text-sm flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Tap to Log Round ({amrapRounds})
              </motion.button>
            )}

            {/* Controls */}
            <div className="flex items-center gap-4 pt-2">
              {/* Stop */}
              <button
                onClick={() => setShowStopConfirm(true)}
                className="w-12 h-12 rounded-full bg-grappler-800 border border-grappler-700 flex items-center justify-center text-grappler-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors"
              >
                <Square className="w-5 h-5" />
              </button>

              {/* Play / Pause */}
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={handlePause}
                disabled={phase === 'countdown'}
                className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center transition-colors',
                  phase === 'countdown'
                    ? 'bg-grappler-800 text-grappler-600 cursor-not-allowed'
                    : isPaused
                    ? 'bg-emerald-500 text-grappler-50 shadow-lg shadow-emerald-500/30'
                    : 'bg-primary-500 text-grappler-50 shadow-lg shadow-primary-500/30'
                )}
              >
                {isPaused ? (
                  <Play className="w-7 h-7 ml-0.5" />
                ) : (
                  <Pause className="w-7 h-7" />
                )}
              </motion.button>

              {/* Skip */}
              <button
                onClick={handleSkip}
                disabled={phase === 'countdown'}
                className="w-12 h-12 rounded-full bg-grappler-800 border border-grappler-700 flex items-center justify-center text-grappler-400 hover:text-primary-400 hover:border-primary-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            {/* Total elapsed */}
            <p className="text-xs text-grappler-600">
              Total elapsed: {formatSeconds(totalElapsed)}
            </p>
          </div>
        )}

        {/* =============================================================== */}
        {/* COMPLETION SCREEN                                               */}
        {/* =============================================================== */}
        {mode === 'run' && phase === 'complete' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center pt-10 space-y-6"
          >
            {/* Celebration */}
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-grappler-50">
              Workout Complete
            </h2>

            {/* Stats */}
            <div className="w-full bg-grappler-900 border border-grappler-800 rounded-xl p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-grappler-400">Total Time</span>
                <span className="text-grappler-50 font-bold">
                  {formatSeconds(totalElapsed)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-grappler-400">Rounds Completed</span>
                <span className="text-grappler-50 font-bold">
                  {isAmrap ? amrapRounds : currentRound}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-grappler-400">Protocol</span>
                <span className="text-grappler-50 font-medium">
                  {PROTOCOL_CARDS.find((p) => p.type === config.type)?.label}
                </span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-grappler-800">
                <span className="text-grappler-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  Est. Calories
                </span>
                <span className="text-orange-400 font-bold">
                  {(() => {
                    const met = MET_VALUES[config.type];
                    const hours = totalElapsed / 3600;
                    return Math.round(met * BODY_WEIGHT_KG * hours);
                  })()}{' '}
                  kcal
                </span>
              </div>
            </div>

            {/* Save as template */}
            <AnimatePresence>
              {showSaveForm ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="w-full overflow-hidden"
                >
                  <div className="bg-grappler-900 border border-primary-500/30 rounded-xl p-4 space-y-3">
                    <input
                      type="text"
                      placeholder="Template name"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      autoFocus
                      className="w-full bg-grappler-800 border border-grappler-700 rounded-lg px-3 py-2 text-sm text-grappler-50 placeholder:text-grappler-600 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowSaveForm(false)}
                        className="flex-1 py-2 text-sm font-medium text-grappler-400 bg-grappler-800 rounded-lg hover:bg-grappler-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveTemplate}
                        disabled={!templateName.trim()}
                        className="flex-1 py-2 text-sm font-medium text-grappler-50 bg-primary-500 rounded-lg hover:bg-primary-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowSaveForm(true)}
                  className="w-full py-3 bg-grappler-900 border border-grappler-800 rounded-xl text-grappler-300 font-medium text-sm flex items-center justify-center gap-2 hover:border-grappler-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save as Template
                </motion.button>
              )}
            </AnimatePresence>

            {/* Done */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleReset}
              className="w-full py-4 bg-primary-500 text-grappler-50 rounded-xl font-bold text-base flex items-center justify-center gap-2 hover:bg-primary-400 shadow-lg shadow-primary-500/20 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              Done
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* ================================================================= */}
      {/* Stop Confirmation Modal                                           */}
      {/* ================================================================= */}
      <AnimatePresence>
        {showStopConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center px-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-grappler-900 border border-grappler-700 rounded-lg p-6 w-full max-w-sm space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-500/15 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-bold text-grappler-50">
                    End Workout?
                  </h3>
                  <p className="text-xs text-grappler-400">
                    Your progress will be saved to the completion screen.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowStopConfirm(false)}
                  className="flex-1 py-2.5 text-sm font-medium text-grappler-300 bg-grappler-800 rounded-xl hover:bg-grappler-700 transition-colors"
                >
                  Keep Going
                </button>
                <button
                  onClick={() => {
                    setShowStopConfirm(false);
                    handleStop();
                  }}
                  className="flex-1 py-2.5 text-sm font-medium text-grappler-50 bg-rose-500 rounded-xl hover:bg-rose-400 transition-colors"
                >
                  End Workout
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
