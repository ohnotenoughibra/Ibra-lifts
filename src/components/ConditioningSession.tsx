'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import {
  X,
  Play,
  Pause,
  SkipForward,
  Timer,
  Flame,
  Dumbbell,
  Zap,
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertTriangle,
  Trophy,
  Plus,
  Activity,
  Target,
  Heart,
  Wind,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getConditioningTemplates,
  getTemplatesForSport,
  getTemplatesByDifficulty,
  estimateCaloriesBurned,
  scaleTemplate,
  ConditioningTemplate,
  ConditioningType,
  ConditioningExercise,
} from '@/lib/conditioning-templates';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ConditioningSessionProps {
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type Mode = 'browse' | 'preview' | 'active';
type SportFilter = 'all' | 'grappling' | 'striking' | 'mma' | 'general';
type DifficultyFilter = 'all' | 'beginner' | 'intermediate' | 'advanced';
type TimerPhase = 'warmup' | 'work' | 'rest' | 'cooldown' | 'complete';

const SPORT_TABS: { key: SportFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'grappling', label: 'Grappling' },
  { key: 'striking', label: 'Striking' },
  { key: 'mma', label: 'MMA' },
  { key: 'general', label: 'General' },
];

const DIFFICULTY_OPTIONS: { key: DifficultyFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'beginner', label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced', label: 'Advanced' },
];

const TYPE_COLORS: Record<ConditioningType, { bg: string; text: string }> = {
  emom: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  tabata: { bg: 'bg-red-500/20', text: 'text-red-400' },
  amrap: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  interval: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  circuit: { bg: 'bg-green-500/20', text: 'text-green-400' },
  shark_tank: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'text-green-400 bg-green-500/20',
  intermediate: 'text-amber-400 bg-amber-500/20',
  advanced: 'text-red-400 bg-red-500/20',
};

const METABOLIC_ICONS: Record<string, typeof Heart> = {
  aerobic: Heart,
  anaerobic: Zap,
  mixed: Activity,
};

const WARMUP_DURATION = 60; // seconds for warm-up phase
const COOLDOWN_DURATION = 60; // seconds for cool-down phase
const COUNTDOWN_FLASH_THRESHOLD = 3; // seconds

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimer(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function typeLabel(type: ConditioningType): string {
  const map: Record<ConditioningType, string> = {
    emom: 'EMOM',
    tabata: 'Tabata',
    amrap: 'AMRAP',
    interval: 'Interval',
    circuit: 'Circuit',
    shark_tank: 'Shark Tank',
  };
  return map[type];
}

function exerciseDisplay(ex: ConditioningExercise): string {
  if (ex.reps) return `${ex.reps} reps`;
  if (ex.duration) return `${ex.duration}s`;
  return '';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ConditioningSession({ onClose }: ConditioningSessionProps) {
  const user = useAppStore((s) => s.user);
  const bodyweightKg = user?.bodyWeightKg ?? 80;

  // ---- Mode & selection state ----
  const [mode, setMode] = useState<Mode>('browse');
  const [sportFilter, setSportFilter] = useState<SportFilter>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<ConditioningTemplate | null>(null);
  const [scaledTemplate, setScaledTemplate] = useState<ConditioningTemplate | null>(null);

  // Preview state
  const [warmUpChecked, setWarmUpChecked] = useState<boolean[]>([]);
  const [coolDownChecked, setCoolDownChecked] = useState<boolean[]>([]);

  // Active timer state
  const [phase, setPhase] = useState<TimerPhase>('warmup');
  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [amrapRounds, setAmrapRounds] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  // Timestamp-based timer refs
  const endTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // The active template (scaled or original)
  const activeTemplate = scaledTemplate ?? selectedTemplate;

  // ---- Filtered templates ----
  const allTemplates = useMemo(() => getConditioningTemplates(), []);

  const filteredTemplates = useMemo(() => {
    let templates = allTemplates;
    if (sportFilter !== 'all') {
      templates = templates.filter(
        (t) => t.targetSport.includes(sportFilter) || t.targetSport.includes('general')
      );
    }
    if (difficultyFilter !== 'all') {
      templates = templates.filter((t) => t.difficulty === difficultyFilter);
    }
    return templates;
  }, [allTemplates, sportFilter, difficultyFilter]);

  const templateCounts = useMemo(() => {
    const counts: Record<SportFilter, number> = { all: allTemplates.length, grappling: 0, striking: 0, mma: 0, general: 0 };
    for (const t of allTemplates) {
      for (const s of t.targetSport) {
        if (s in counts) counts[s as SportFilter]++;
      }
    }
    return counts;
  }, [allTemplates]);

  // ---- Navigation helpers ----
  const openPreview = useCallback((template: ConditioningTemplate) => {
    setSelectedTemplate(template);
    setScaledTemplate(null);
    setWarmUpChecked(new Array(template.warmUp.length).fill(false));
    setCoolDownChecked(new Array(template.coolDown.length).fill(false));
    setMode('preview');
  }, []);

  const backToBrowse = useCallback(() => {
    setMode('browse');
    setSelectedTemplate(null);
    setScaledTemplate(null);
  }, []);

  // ---- Timer logic ----
  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const clearElapsedInterval = useCallback(() => {
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
  }, []);

  // Start a countdown for N seconds
  const startCountdown = useCallback((durationSecs: number) => {
    clearTimerInterval();
    const now = Date.now();
    endTimeRef.current = now + durationSecs * 1000;
    setSecondsLeft(durationSecs);

    intervalRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearTimerInterval();
      }
    }, 100);
  }, [clearTimerInterval]);

  // Pause / resume
  const pauseTimer = useCallback(() => {
    clearTimerInterval();
    clearElapsedInterval();
    setIsRunning(false);
  }, [clearTimerInterval, clearElapsedInterval]);

  const resumeTimer = useCallback(() => {
    setIsRunning(true);
    // Resume countdown with current secondsLeft
    endTimeRef.current = Date.now() + secondsLeft * 1000;
    intervalRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearTimerInterval();
      }
    }, 100);
    // Resume elapsed counter
    elapsedIntervalRef.current = setInterval(() => {
      setTotalElapsed((prev) => prev + 1);
    }, 1000);
  }, [secondsLeft, clearTimerInterval]);

  // ---- Protocol-specific phase advancement ----
  const getWorkDuration = useCallback((): number => {
    if (!activeTemplate) return 30;
    switch (activeTemplate.type) {
      case 'tabata':
        return 20;
      case 'emom':
        return activeTemplate.workInterval ?? 60;
      case 'interval':
      case 'shark_tank':
        return activeTemplate.workInterval ?? 30;
      case 'circuit': {
        const ex = activeTemplate.exercises[0];
        return ex?.duration ?? 45;
      }
      case 'amrap':
        return activeTemplate.totalDuration * 60; // single long countdown
      default:
        return 30;
    }
  }, [activeTemplate]);

  const getRestDuration = useCallback((): number => {
    if (!activeTemplate) return 10;
    switch (activeTemplate.type) {
      case 'tabata':
        return 10;
      case 'emom': {
        // Rest = remaining time in the minute after work
        const work = activeTemplate.workInterval ?? 60;
        return Math.max(0, 60 - work);
      }
      case 'interval':
      case 'shark_tank':
        return activeTemplate.restInterval ?? 30;
      case 'circuit':
        return activeTemplate.restInterval ?? 60;
      case 'amrap':
        return 0; // no rest in AMRAP
      default:
        return 10;
    }
  }, [activeTemplate]);

  const getTotalRounds = useCallback((): number => {
    if (!activeTemplate) return 1;
    if (activeTemplate.type === 'tabata') {
      // 8 rounds per exercise * number of exercises
      return 8 * activeTemplate.exercises.length;
    }
    if (activeTemplate.type === 'amrap') return 1;
    return activeTemplate.rounds;
  }, [activeTemplate]);

  const getCurrentExercise = useCallback((): ConditioningExercise | null => {
    if (!activeTemplate || activeTemplate.exercises.length === 0) return null;
    if (activeTemplate.type === 'circuit' || activeTemplate.type === 'tabata') {
      return activeTemplate.exercises[currentExerciseIdx % activeTemplate.exercises.length];
    }
    if (activeTemplate.type === 'emom') {
      // Alternate exercises per round
      return activeTemplate.exercises[(currentRound - 1) % activeTemplate.exercises.length];
    }
    return activeTemplate.exercises[0];
  }, [activeTemplate, currentExerciseIdx, currentRound]);

  const getNextExercise = useCallback((): ConditioningExercise | null => {
    if (!activeTemplate || activeTemplate.exercises.length <= 1) return null;
    if (activeTemplate.type === 'circuit' || activeTemplate.type === 'tabata') {
      const nextIdx = (currentExerciseIdx + 1) % activeTemplate.exercises.length;
      return activeTemplate.exercises[nextIdx];
    }
    if (activeTemplate.type === 'emom') {
      return activeTemplate.exercises[currentRound % activeTemplate.exercises.length];
    }
    return null;
  }, [activeTemplate, currentExerciseIdx, currentRound]);

  // Advance to next phase when timer hits 0
  useEffect(() => {
    if (secondsLeft > 0 || !isRunning || !activeTemplate) return;
    if (phase === 'complete') return;

    if (phase === 'warmup') {
      // Start first work interval
      if (activeTemplate.type === 'amrap') {
        setPhase('work');
        startCountdown(getWorkDuration());
      } else {
        setPhase('work');
        startCountdown(getWorkDuration());
      }
      return;
    }

    if (phase === 'work') {
      if (activeTemplate.type === 'amrap') {
        // AMRAP ends when time is up
        setPhase('cooldown');
        startCountdown(COOLDOWN_DURATION);
        return;
      }

      const totalRounds = getTotalRounds();

      if (activeTemplate.type === 'circuit') {
        // Cycle through exercises in current round
        const nextExIdx = currentExerciseIdx + 1;
        if (nextExIdx < activeTemplate.exercises.length) {
          // More exercises in this round
          setCurrentExerciseIdx(nextExIdx);
          const nextEx = activeTemplate.exercises[nextExIdx];
          startCountdown(nextEx.duration ?? 45);
          return;
        }
        // Finished all exercises in round
        if (currentRound >= totalRounds) {
          setPhase('cooldown');
          startCountdown(COOLDOWN_DURATION);
          return;
        }
        // Rest between rounds
        setPhase('rest');
        startCountdown(getRestDuration());
        return;
      }

      if (activeTemplate.type === 'tabata') {
        // After work → rest
        if (currentRound >= totalRounds) {
          setPhase('cooldown');
          startCountdown(COOLDOWN_DURATION);
          return;
        }
        setPhase('rest');
        startCountdown(getRestDuration());
        return;
      }

      // EMOM, interval, shark_tank
      if (currentRound >= totalRounds) {
        setPhase('cooldown');
        startCountdown(COOLDOWN_DURATION);
        return;
      }
      const restDur = getRestDuration();
      if (restDur > 0) {
        setPhase('rest');
        startCountdown(restDur);
      } else {
        // No rest — advance round immediately
        setCurrentRound((r) => r + 1);
        startCountdown(getWorkDuration());
      }
      return;
    }

    if (phase === 'rest') {
      const totalRounds = getTotalRounds();
      const nextRound = currentRound + 1;

      if (nextRound > totalRounds) {
        setPhase('cooldown');
        startCountdown(COOLDOWN_DURATION);
        return;
      }

      setCurrentRound(nextRound);

      if (activeTemplate.type === 'circuit') {
        setCurrentExerciseIdx(0);
        const firstEx = activeTemplate.exercises[0];
        setPhase('work');
        startCountdown(firstEx.duration ?? 45);
        return;
      }

      if (activeTemplate.type === 'tabata') {
        const exIdx = Math.floor((nextRound - 1) / 8) % activeTemplate.exercises.length;
        setCurrentExerciseIdx(exIdx);
      }

      setPhase('work');
      startCountdown(getWorkDuration());
      return;
    }

    if (phase === 'cooldown') {
      setPhase('complete');
      pauseTimer();
      return;
    }
  }, [secondsLeft, isRunning, phase, activeTemplate, currentRound, currentExerciseIdx, startCountdown, getWorkDuration, getRestDuration, getTotalRounds, pauseTimer]);

  // Elapsed timer
  useEffect(() => {
    if (isRunning && mode === 'active') {
      clearElapsedInterval();
      elapsedIntervalRef.current = setInterval(() => {
        setTotalElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      clearElapsedInterval();
    }
    return clearElapsedInterval;
  }, [isRunning, mode, clearElapsedInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimerInterval();
      clearElapsedInterval();
    };
  }, [clearTimerInterval, clearElapsedInterval]);

  // ---- Start session ----
  const startSession = useCallback(() => {
    if (!activeTemplate) return;
    setMode('active');
    setPhase('warmup');
    setCurrentRound(1);
    setCurrentExerciseIdx(0);
    setAmrapRounds(0);
    setTotalElapsed(0);
    setShowEndConfirm(false);
    setIsRunning(true);
    startCountdown(WARMUP_DURATION);
  }, [activeTemplate, startCountdown]);

  // Skip current interval
  const skipInterval = useCallback(() => {
    setSecondsLeft(0);
    clearTimerInterval();
    endTimeRef.current = Date.now();
  }, [clearTimerInterval]);

  // End workout early
  const endWorkout = useCallback(() => {
    setPhase('complete');
    clearTimerInterval();
    clearElapsedInterval();
    setIsRunning(false);
  }, [clearTimerInterval, clearElapsedInterval]);

  // Scale template
  const handleScale = useCallback((level: 'beginner' | 'intermediate' | 'advanced') => {
    if (!selectedTemplate) return;
    const scaled = scaleTemplate(selectedTemplate, level);
    setScaledTemplate(scaled);
  }, [selectedTemplate]);

  // ---- Phase colors ----
  const phaseColor = useMemo(() => {
    switch (phase) {
      case 'warmup':
      case 'cooldown':
        return 'text-blue-400';
      case 'work':
        return 'text-green-400';
      case 'rest':
        return 'text-red-400';
      case 'complete':
        return 'text-amber-400';
      default:
        return 'text-grappler-50';
    }
  }, [phase]);

  const phaseBgColor = useMemo(() => {
    switch (phase) {
      case 'warmup':
      case 'cooldown':
        return 'bg-blue-500/10 border-blue-500/30';
      case 'work':
        return 'bg-green-500/10 border-green-500/30';
      case 'rest':
        return 'bg-red-500/10 border-red-500/30';
      case 'complete':
        return 'bg-amber-500/10 border-amber-500/30';
      default:
        return 'bg-grappler-800';
    }
  }, [phase]);

  const phaseLabel = useMemo(() => {
    switch (phase) {
      case 'warmup': return 'WARM UP';
      case 'work':
        if (activeTemplate?.type === 'shark_tank') return `PARTNER ${currentRound}`;
        return `ROUND ${currentRound}`;
      case 'rest': return 'REST';
      case 'cooldown': return 'COOL DOWN';
      case 'complete': return 'COMPLETE';
    }
  }, [phase, currentRound, activeTemplate]);

  // ---- Calories estimate ----
  const caloriesEstimate = useMemo(() => {
    if (!activeTemplate) return 0;
    return estimateCaloriesBurned(activeTemplate, bodyweightKg);
  }, [activeTemplate, bodyweightKg]);

  // ---- Render ----

  // ========================= BROWSE MODE =========================
  if (mode === 'browse') {
    return (
      <div className="fixed inset-0 z-50 bg-grappler-950 flex flex-col overflow-hidden safe-area-top">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-grappler-800">
          <h1 className="text-lg font-bold text-grappler-50">Conditioning</h1>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-grappler-800 text-grappler-400">
            <X size={20} />
          </button>
        </div>

        {/* Sport filter tabs */}
        <div className="flex gap-1 px-4 py-3 overflow-x-auto no-scrollbar">
          {SPORT_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSportFilter(tab.key)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                sportFilter === tab.key
                  ? 'bg-blue-500 text-white'
                  : 'bg-grappler-800 text-grappler-400 hover:text-grappler-200'
              )}
            >
              {tab.label}
              <span className="ml-1 text-xs opacity-70">
                {tab.key === 'all'
                  ? templateCounts.all
                  : allTemplates.filter(
                      (t) => t.targetSport.includes(tab.key as 'grappling' | 'striking' | 'mma' | 'general') || t.targetSport.includes('general')
                    ).length}
              </span>
            </button>
          ))}
        </div>

        {/* Difficulty filter */}
        <div className="flex gap-1 px-4 pb-3 overflow-x-auto no-scrollbar">
          {DIFFICULTY_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setDifficultyFilter(opt.key)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors',
                difficultyFilter === opt.key
                  ? 'bg-grappler-50 text-grappler-950'
                  : 'bg-grappler-900 text-grappler-400 hover:text-grappler-200'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Template cards grid */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-grappler-400">
              <Target size={32} className="mb-3 opacity-50" />
              <p className="text-sm">No templates match your filters</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredTemplates.map((template) => {
                const MetIcon = METABOLIC_ICONS[template.metabolicTarget] ?? Activity;
                return (
                  <button
                    key={template.id}
                    onClick={() => openPreview(template)}
                    className="w-full text-left bg-grappler-900 rounded-xl p-4 border border-grappler-800 hover:border-grappler-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-grappler-50 leading-tight">{template.name}</h3>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-xs font-bold uppercase shrink-0',
                          TYPE_COLORS[template.type].bg,
                          TYPE_COLORS[template.type].text
                        )}
                      >
                        {typeLabel(template.type)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="flex items-center gap-1 text-xs text-grappler-400">
                        <Clock size={12} /> ~{template.totalDuration}min
                      </span>
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded text-xs font-medium',
                          DIFFICULTY_COLORS[template.difficulty]
                        )}
                      >
                        {template.difficulty}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-grappler-400">
                        <MetIcon size={12} />
                        {template.metabolicTarget}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-2">
                      {template.targetSport.map((sport) => (
                        <span key={sport} className="px-1.5 py-0.5 rounded bg-grappler-800 text-xs text-grappler-400 uppercase">
                          {sport}
                        </span>
                      ))}
                    </div>

                    {template.equipmentNeeded.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-grappler-400">
                        <Dumbbell size={10} />
                        {template.equipmentNeeded.slice(0, 3).join(', ')}
                        {template.equipmentNeeded.length > 3 && ` +${template.equipmentNeeded.length - 3}`}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ========================= PREVIEW MODE =========================
  if (mode === 'preview' && activeTemplate) {
    const displayTemplate = activeTemplate;
    const cals = estimateCaloriesBurned(displayTemplate, bodyweightKg);

    return (
      <div className="fixed inset-0 z-50 bg-grappler-950 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-grappler-800">
          <button onClick={backToBrowse} className="flex items-center gap-1 text-grappler-400 hover:text-grappler-200">
            <ChevronLeft size={20} />
            <span className="text-sm">Back</span>
          </button>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-grappler-800 text-grappler-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Template header */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-xs font-bold uppercase',
                  TYPE_COLORS[displayTemplate.type].bg,
                  TYPE_COLORS[displayTemplate.type].text
                )}
              >
                {typeLabel(displayTemplate.type)}
              </span>
              <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', DIFFICULTY_COLORS[displayTemplate.difficulty])}>
                {displayTemplate.difficulty}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-grappler-50 mb-2">{displayTemplate.name}</h2>
            <p className="text-sm text-grappler-400 leading-relaxed">{displayTemplate.description}</p>
          </div>

          {/* Workout overview */}
          <div className="bg-grappler-900 rounded-xl p-4 border border-grappler-800">
            <h3 className="text-sm font-semibold text-grappler-50 mb-3">Workout Overview</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Target size={16} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-grappler-400">Rounds</p>
                  <p className="text-sm font-bold text-grappler-50">{displayTemplate.rounds}</p>
                </div>
              </div>
              {displayTemplate.workInterval != null && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Timer size={16} className="text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-grappler-400">Work</p>
                    <p className="text-sm font-bold text-grappler-50">{displayTemplate.workInterval}s</p>
                  </div>
                </div>
              )}
              {displayTemplate.restInterval != null && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <Wind size={16} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-xs text-grappler-400">Rest</p>
                    <p className="text-sm font-bold text-grappler-50">{displayTemplate.restInterval}s</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Clock size={16} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-grappler-400">Duration</p>
                  <p className="text-sm font-bold text-grappler-50">~{displayTemplate.totalDuration}min</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Flame size={16} className="text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-grappler-400">Calories</p>
                  <p className="text-sm font-bold text-grappler-50">~{cals} kcal</p>
                </div>
              </div>
            </div>
          </div>

          {/* Exercise list */}
          <div className="bg-grappler-900 rounded-xl p-4 border border-grappler-800">
            <h3 className="text-sm font-semibold text-grappler-50 mb-3">Exercises</h3>
            <div className="space-y-3">
              {displayTemplate.exercises.map((ex, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-grappler-800 flex items-center justify-center text-xs font-bold text-grappler-400 shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-grappler-50">{ex.name}</p>
                    {exerciseDisplay(ex) && (
                      <p className="text-xs text-grappler-400">{exerciseDisplay(ex)}</p>
                    )}
                    {ex.notes && (
                      <p className="text-xs text-grappler-400 mt-0.5 italic">{ex.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warm-up checklist */}
          {displayTemplate.warmUp.length > 0 && (
            <div className="bg-grappler-900 rounded-xl p-4 border border-grappler-800">
              <h3 className="text-sm font-semibold text-grappler-50 mb-3 flex items-center gap-2">
                <Flame size={14} className="text-blue-400" /> Warm-Up
              </h3>
              <div className="space-y-2">
                {displayTemplate.warmUp.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const copy = [...warmUpChecked];
                      copy[i] = !copy[i];
                      setWarmUpChecked(copy);
                    }}
                    className="flex items-center gap-3 w-full text-left"
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors',
                        warmUpChecked[i]
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-grappler-700 bg-grappler-800'
                      )}
                    >
                      {warmUpChecked[i] && <Check size={12} className="text-white" />}
                    </div>
                    <span
                      className={cn(
                        'text-sm transition-colors',
                        warmUpChecked[i] ? 'text-grappler-400 line-through' : 'text-grappler-200'
                      )}
                    >
                      {item}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cool-down checklist */}
          {displayTemplate.coolDown.length > 0 && (
            <div className="bg-grappler-900 rounded-xl p-4 border border-grappler-800">
              <h3 className="text-sm font-semibold text-grappler-50 mb-3 flex items-center gap-2">
                <Wind size={14} className="text-blue-400" /> Cool-Down
              </h3>
              <div className="space-y-2">
                {displayTemplate.coolDown.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const copy = [...coolDownChecked];
                      copy[i] = !copy[i];
                      setCoolDownChecked(copy);
                    }}
                    className="flex items-center gap-3 w-full text-left"
                  >
                    <div
                      className={cn(
                        'w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors',
                        coolDownChecked[i]
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-grappler-700 bg-grappler-800'
                      )}
                    >
                      {coolDownChecked[i] && <Check size={12} className="text-white" />}
                    </div>
                    <span
                      className={cn(
                        'text-sm transition-colors',
                        coolDownChecked[i] ? 'text-grappler-400 line-through' : 'text-grappler-200'
                      )}
                    >
                      {item}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Difficulty scaler */}
          <div className="bg-grappler-900 rounded-xl p-4 border border-grappler-800">
            <h3 className="text-sm font-semibold text-grappler-50 mb-3">Scale Difficulty</h3>
            <div className="flex gap-2">
              {(['beginner', 'intermediate', 'advanced'] as const).map((level) => {
                const isActive = displayTemplate.difficulty === level;
                return (
                  <button
                    key={level}
                    onClick={() => handleScale(level)}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-colors',
                      isActive
                        ? 'bg-blue-500 text-white'
                        : 'bg-grappler-800 text-grappler-400 hover:text-grappler-200'
                    )}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
            {scaledTemplate && selectedTemplate && scaledTemplate.rounds !== selectedTemplate.rounds && (
              <p className="text-xs text-grappler-400 mt-2">
                Scaled: {scaledTemplate.rounds} rounds
                {scaledTemplate.restInterval != null && selectedTemplate.restInterval != null && scaledTemplate.restInterval !== selectedTemplate.restInterval
                  ? `, ${scaledTemplate.restInterval}s rest`
                  : ''}
                {' '}(~{scaledTemplate.totalDuration}min)
              </p>
            )}
          </div>
        </div>

        {/* Start session button */}
        <div className="px-4 py-4 border-t border-grappler-800">
          <button
            onClick={startSession}
            className="w-full py-3.5 rounded-xl bg-blue-500 text-white font-bold text-base hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <Play size={18} /> Start Session
          </button>
        </div>
      </div>
    );
  }

  // ========================= ACTIVE MODE =========================
  if (mode === 'active' && activeTemplate) {
    const totalRounds = getTotalRounds();
    const currentEx = getCurrentExercise();
    const nextEx = getNextExercise();
    const isCountdownFlash = secondsLeft <= COUNTDOWN_FLASH_THRESHOLD && secondsLeft > 0 && isRunning;
    const isAmrap = activeTemplate.type === 'amrap';

    // Completion screen
    if (phase === 'complete') {
      const finalCals = estimateCaloriesBurned(activeTemplate, bodyweightKg);
      return (
        <div className="fixed inset-0 z-50 bg-grappler-950 flex flex-col items-center justify-center px-6">
          <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mb-6">
            <Trophy size={40} className="text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-grappler-50 mb-2">Session Complete</h2>
          <p className="text-sm text-grappler-400 mb-8">{activeTemplate.name}</p>

          <div className="w-full max-w-xs space-y-3 mb-10">
            <div className="flex justify-between bg-grappler-900 rounded-xl p-4 border border-grappler-800">
              <span className="text-sm text-grappler-400">Total Time</span>
              <span className="text-sm font-bold text-grappler-50">{formatTimer(totalElapsed)}</span>
            </div>
            <div className="flex justify-between bg-grappler-900 rounded-xl p-4 border border-grappler-800">
              <span className="text-sm text-grappler-400">Rounds</span>
              <span className="text-sm font-bold text-grappler-50">
                {isAmrap ? amrapRounds : `${Math.min(currentRound, totalRounds)} / ${totalRounds}`}
              </span>
            </div>
            <div className="flex justify-between bg-grappler-900 rounded-xl p-4 border border-grappler-800">
              <span className="text-sm text-grappler-400">Calories (est.)</span>
              <span className="text-sm font-bold text-grappler-50">~{finalCals} kcal</span>
            </div>
          </div>

          <button
            onClick={backToBrowse}
            className="w-full max-w-xs py-3.5 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-600 transition-colors"
          >
            Done
          </button>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 bg-grappler-950 flex flex-col overflow-hidden">
        {/* Top bar with template name and close */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-grappler-800">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium text-grappler-400 truncate">{activeTemplate.name}</span>
            <span
              className={cn(
                'px-1.5 py-0.5 rounded text-xs font-bold uppercase shrink-0',
                TYPE_COLORS[activeTemplate.type].bg,
                TYPE_COLORS[activeTemplate.type].text
              )}
            >
              {typeLabel(activeTemplate.type)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-grappler-400">
            <Clock size={12} />
            {formatTimer(totalElapsed)}
          </div>
        </div>

        {/* Phase display and timer */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {/* Phase label */}
          <div className={cn('px-4 py-1.5 rounded-full border mb-4 text-sm font-bold uppercase tracking-wider', phaseBgColor, phaseColor)}>
            {phaseLabel}
          </div>

          {/* Large countdown */}
          <div className={cn(
            'text-7xl font-mono font-black tabular-nums mb-2 transition-all',
            phaseColor,
            isCountdownFlash && 'animate-pulse scale-110'
          )}>
            {formatTimer(secondsLeft)}
          </div>

          {/* Round progress */}
          {!isAmrap && (
            <div className="mb-6">
              <p className="text-sm text-grappler-400 text-center mb-2">
                Round {Math.min(currentRound, totalRounds)} of {totalRounds}
              </p>
              <div className="flex items-center gap-1.5 justify-center flex-wrap max-w-[280px]">
                {Array.from({ length: totalRounds }, (_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-2.5 h-2.5 rounded-full transition-colors',
                      i < currentRound - 1
                        ? 'bg-green-400'
                        : i === currentRound - 1
                          ? phase === 'work' ? 'bg-green-400 animate-pulse' : 'bg-amber-400 animate-pulse'
                          : 'bg-grappler-800'
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          {/* AMRAP round counter */}
          {isAmrap && phase === 'work' && (
            <div className="mb-6 flex flex-col items-center">
              <p className="text-sm text-grappler-400 mb-3">Rounds Completed</p>
              <div className="text-4xl font-bold text-grappler-50 mb-4">{amrapRounds}</div>
              <button
                onClick={() => setAmrapRounds((r) => r + 1)}
                className="px-8 py-4 rounded-lg bg-green-500 text-white font-bold text-lg hover:bg-green-600 active:scale-95 transition-all flex items-center gap-2"
              >
                <Plus size={22} /> Round
              </button>
            </div>
          )}

          {/* Current exercise */}
          {currentEx && (phase === 'work' || phase === 'rest') && (
            <div className="w-full max-w-sm bg-grappler-900 rounded-xl p-4 border border-grappler-800 mb-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-grappler-800 flex items-center justify-center text-xs font-bold text-grappler-400">
                  {(activeTemplate.type === 'circuit' || activeTemplate.type === 'tabata')
                    ? currentExerciseIdx + 1
                    : currentRound}
                </div>
                <h4 className="font-bold text-grappler-50 text-sm">{currentEx.name}</h4>
              </div>
              {exerciseDisplay(currentEx) && (
                <p className="text-xs text-grappler-400 ml-8">{exerciseDisplay(currentEx)}</p>
              )}
              {currentEx.notes && (
                <p className="text-xs text-grappler-400 ml-8 mt-0.5 italic">{currentEx.notes}</p>
              )}
            </div>
          )}

          {/* Next exercise preview */}
          {nextEx && phase === 'work' && (activeTemplate.type === 'circuit' || activeTemplate.type === 'tabata') && (
            <div className="w-full max-w-sm flex items-center gap-2 px-4 py-2 rounded-lg bg-grappler-900/50 border border-grappler-800/50">
              <ChevronRight size={14} className="text-grappler-400 shrink-0" />
              <span className="text-xs text-grappler-400">
                Next: <span className="text-grappler-200 font-medium">{nextEx.name}</span>
              </span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="px-4 py-5 border-t border-grappler-800">
          <div className="flex items-center justify-center gap-4">
            {/* End workout */}
            <button
              onClick={() => setShowEndConfirm(true)}
              className="p-3 rounded-xl bg-grappler-900 border border-grappler-800 text-grappler-400 hover:text-red-400 hover:border-red-500/30 transition-colors"
              title="End workout"
            >
              <X size={20} />
            </button>

            {/* Play/Pause */}
            <button
              onClick={isRunning ? pauseTimer : resumeTimer}
              className="w-16 h-16 rounded-lg bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 active:scale-95 transition-all"
            >
              {isRunning ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
            </button>

            {/* Skip interval */}
            {!isAmrap && (
              <button
                onClick={skipInterval}
                className="p-3 rounded-xl bg-grappler-900 border border-grappler-800 text-grappler-400 hover:text-grappler-200 transition-colors"
                title="Skip interval"
              >
                <SkipForward size={20} />
              </button>
            )}
          </div>
        </div>

        {/* End workout confirmation dialog */}
        {showEndConfirm && (
          <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center px-6">
            <div className="bg-grappler-900 rounded-lg p-6 w-full max-w-sm border border-grappler-800">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle size={24} className="text-amber-400" />
                <h3 className="text-lg font-bold text-grappler-50">End Workout?</h3>
              </div>
              <p className="text-sm text-grappler-400 mb-6">
                You have completed {isAmrap ? `${amrapRounds} rounds` : `${Math.max(0, currentRound - 1)} of ${totalRounds} rounds`}.
                Are you sure you want to end the session early?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-grappler-800 text-grappler-200 font-semibold text-sm hover:bg-grappler-700 transition-colors"
                >
                  Continue
                </button>
                <button
                  onClick={() => {
                    setShowEndConfirm(false);
                    endWorkout();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-colors"
                >
                  End Session
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Fallback (should not happen)
  return null;
}
