'use client';

import { formatTarget } from '@/lib/prescription-format';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, type ActiveWorkoutThrottle } from '@/lib/store';
import { useToast } from './Toast';
import ExerciseSwapSheet from './ExerciseSwapSheet';
import { suggestNextLoad, getLoadProfile, formatLoad, nextLoadStep, roundForImplement } from '@/lib/next-load';
import { useWakeLock } from '@/lib/use-wake-lock';
import { recommendFinisher } from '@/lib/sprint-protocols';
import { matContext } from '@/lib/mat-aware';
import dynamic from 'next/dynamic';
import WorkoutHistoryModal from './active-workout/WorkoutHistoryModal';
import FinishWorkoutModal from './active-workout/FinishWorkoutModal';
import VolumeGapPrompt from './active-workout/VolumeGapPrompt';
import RestTipsPanel from './active-workout/RestTipsPanel';
import AddExerciseModal from './active-workout/AddExerciseModal';
import WorkoutOverview from './active-workout/WorkoutOverview';
import MiniPlateCalc from './active-workout/MiniPlateCalc';
const SprintTimer = dynamic(() => import('./SprintTimer'), { ssr: false });
import { quickAdjustOptions, stepWeight, personalBest, repsToBeat, lastTimeSets, warmupRamp, sessionEta } from '@/lib/live-session';
import { useShallow } from 'zustand/react/shallow';
import { useSwipe } from '@/lib/use-swipe';
import { useRestTimer } from '@/hooks/useRestTimer';
import {
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Timer,
  Plus,
  Minus,
  Trophy,
  Lightbulb,
  RotateCcw,
  Save,
  Shuffle,
  SkipForward,
  Zap,
  AlertTriangle,
  TrendingUp,
  Video,
  ListChecks,
  Dumbbell,
  ChevronDown,
  Info,
  Pause,
  ArrowLeftRight,} from 'lucide-react';
import { cn, formatTime, chrono } from '@/lib/utils';
import { resolveWeightUnit, convertWeight } from '@/lib/units';
import { carryOverLoad, prescribedPercentOf1RM } from '@/lib/load-model';
import { BufferedNumberInput } from './BufferedNumberInput';
import { calculate1RM, getVolumeGaps } from '@/lib/workout-generator';
import { getRandomTip } from '@/lib/knowledge';
import { exercises as exerciseLibrary, getAlternativesForExercise, searchExercises } from '@/lib/exercises';
import { calculateReadiness, whoopRecoveryToReadiness, calculatePersonalBaseline } from '@/lib/auto-adjust';
import { SetLog, PreWorkoutCheckIn, ExerciseFeedback, WeightUnit, WorkoutLog, EquipmentProfileName, DEFAULT_EQUIPMENT_PROFILES } from '@/lib/types';
import { getSuggestedWeight } from '@/lib/auto-adjust';
import { estimateFirstTimeWeight, WeightEstimate } from '@/lib/weight-estimator';
import { applyThrottle, type ThrottleLevel } from '@/lib/readiness-throttle';
import { calculateReadiness as calcFullReadiness } from '@/lib/performance-engine';
import { getCoachMessages, type CoachMessage, type CoachContext } from '@/lib/corner-coach';
import { regulateRPE, type RPERegulation } from '@/lib/rpe-regulator';
import { generateSmartWarmUp, type WarmUpProtocol } from '@/lib/warmup-generator';
import { detectSupersetCandidates } from '@/lib/superset-engine';
import { parseTempo, initTempoState, tickTempo, formatTUT, PHASE_LABELS, PHASE_COLORS, PHASE_BG_COLORS, type TempoState, type TempoPrescription } from '@/lib/tempo-engine';
import { getActiveInjuryAdaptations } from '@/lib/injury-science';
import { StickyNote, Trash2 } from 'lucide-react';
import YouTubeEmbed from '@/components/YouTubeEmbed';

// Stable fallbacks for store selectors — an inline `?? []` / `?? {}` returns a
// fresh reference every evaluation and forces a re-render on every store update.
const EMPTY_ARR: never[] = [];
const EMPTY_WATER_LOG: Record<string, number> = {};
const DEFAULT_MACRO_TARGETS = { calories: 2500, protein: 180, carbs: 300, fat: 80 };


export default function ActiveWorkout() {
  const {
    activeWorkout, user, updateExerciseLog, completeWorkout, cancelWorkout, pauseWorkout,
    setPreCheckIn, updateExerciseFeedback, swapExercise, addBonusExercise, adaptWorkoutToProfile,
    applyReadinessThrottle, setWorkoutPosition, markWorkoutOverviewDone, undoSwap, addPowerPrimer, undoMatAdjustment,
    activeEquipmentProfile, latestWhoopData, wearableHistory, applyWhoopAdjustment,
    baselineLifts, exerciseNotes, setExerciseNote,
  } = useAppStore(
    useShallow(s => ({
      activeWorkout: s.activeWorkout, user: s.user, updateExerciseLog: s.updateExerciseLog,
      completeWorkout: s.completeWorkout, cancelWorkout: s.cancelWorkout, pauseWorkout: s.pauseWorkout,
      setPreCheckIn: s.setPreCheckIn, updateExerciseFeedback: s.updateExerciseFeedback,
      swapExercise: s.swapExercise, addBonusExercise: s.addBonusExercise, adaptWorkoutToProfile: s.adaptWorkoutToProfile,
      applyReadinessThrottle: s.applyReadinessThrottle, setWorkoutPosition: s.setWorkoutPosition,
      markWorkoutOverviewDone: s.markWorkoutOverviewDone, undoSwap: s.undoSwap, addPowerPrimer: s.addPowerPrimer, undoMatAdjustment: s.undoMatAdjustment,
      activeEquipmentProfile: s.activeEquipmentProfile, latestWhoopData: s.latestWhoopData,
      wearableHistory: s.wearableHistory, applyWhoopAdjustment: s.applyWhoopAdjustment,
      baselineLifts: s.baselineLifts,
      exerciseNotes: s.exerciseNotes, setExerciseNote: s.setExerciseNote,
    }))
  );

  // Calculate personal baseline from wearable history for accurate HRV/RHR analysis
  const personalBaseline = useMemo(() =>
    calculatePersonalBaseline(wearableHistory),
    [wearableHistory]
  );
  // Store selectors for full readiness (used by throttle engine)
  const storeWorkoutLogs = useAppStore(s => s.workoutLogs);
  const trainingSessions = useAppStore(s => s.trainingSessions ?? EMPTY_ARR);
  const rawMeals = useAppStore(s => s.meals ?? EMPTY_ARR);
  const meals = useMemo(() => rawMeals.filter(m => !m._deleted), [rawMeals]);
  const macroTargets = useAppStore(s => s.macroTargets ?? DEFAULT_MACRO_TARGETS);
  const waterLog = useAppStore(s => s.waterLog ?? EMPTY_WATER_LOG);
  const quickLogs = useAppStore(s => s.quickLogs ?? EMPTY_ARR);

  // Active injury adaptations — for per-exercise warnings
  const injuryLog = useAppStore(s => s.injuryLog);
  const injuryAdaptations = useMemo(() => getActiveInjuryAdaptations(injuryLog), [injuryLog]);
  const hasActiveInjuries = injuryAdaptations.classifications.length > 0;
  const { showToast } = useToast();
  // Position + overview state are persisted on activeWorkout so pausing
  // ("Pause & Browse" unmounts this component) or a reload resumes in place.
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(
    () => useAppStore.getState().activeWorkout?.position?.exerciseIndex ?? 0,
  );
  const [currentSetIndex, setCurrentSetIndex] = useState(
    () => useAppStore.getState().activeWorkout?.position?.setIndex ?? 0,
  );
  useEffect(() => {
    setWorkoutPosition(currentExerciseIndex, currentSetIndex);
  }, [currentExerciseIndex, currentSetIndex, setWorkoutPosition]);
  // Re-entry guard for completeSet — kills double-tap from skipping a set.
  const completingSetRef = useRef(false);
  // Ref to the active-set container so we can scrollIntoView on advance.
  const activeSetRef = useRef<HTMLDivElement>(null);

  // Rest timer — extracted to hook for testability and reuse
  const {
    isResting, restMinimized, setRestMinimized, restTimer, restDuration,
    startRest, cancelRest, setIsResting, adjustRest,
  } = useRestTimer(useCallback(() => {
    setLastCompletedExerciseIndex(null);
  }, []));
  const [showRestTips, setShowRestTips] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [tip, setTip] = useState(getRandomTip());
  // Small non-blocking PR banner (was a full-screen confetti takeover).
  // Warm-up ramp chip: expanded? + which rungs were ticked (per exercise).
  const [warmupOpen, setWarmupOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState<string | null>(null); // non-null = editing
  const [showFinisher, setShowFinisher] = useState(false);
  // Mats + competition + time left feed the finisher pick (only readiness and
  // leg sets did before, so its competition / hard-mats branches never ran).
  const finisherMatContext = () => {
    const st = useAppStore.getState();
    const m = matContext({ user: st.user, trainingSessions: st.trainingSessions, competitions: st.competitions });
    return {
      daysToCompetition: m.daysToCompetition ?? undefined,
      hardMatWithin24h: m.hardToday || m.hardTomorrow,
    };
  };
  const [finisherLogged, setFinisherLogged] = useState(false);
  const [etaNow, setEtaNow] = useState(() => Date.now());
  useWakeLock(true); // screen stays on for the whole session
  useEffect(() => { const t = setInterval(() => setEtaNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  const [warmupDone, setWarmupDone] = useState<Record<string, number[]>>({});
  const [prBanner, setPrBanner] = useState<{ name: string; from: number; to: number; unit: string } | null>(null);
  // ── Consolidated modal state — prevents impossible states (two modals open) ──
  type ModalView = 'finish' | 'swap' | 'add_exercise' | 'cancel' | 'history' | 'rpe_info' | 'draft_recovery' | 'location_confirm' | null;
  const [activeModal, setActiveModal] = useState<ModalView>(null);
  // Convenience booleans derived from activeModal (preserves existing code paths)
  const showFinishModal = activeModal === 'finish';
  const setShowFinishModal = (v: boolean) => setActiveModal(v ? 'finish' : null);
  const showSwapModal = activeModal === 'swap';
  const setShowSwapModal = (v: boolean) => setActiveModal(v ? 'swap' : null);
  const showAddExerciseModal = activeModal === 'add_exercise';
  const setShowAddExerciseModal = (v: boolean) => setActiveModal(v ? 'add_exercise' : null);
  const showCancelConfirm = activeModal === 'cancel';
  const setShowCancelConfirm = (v: boolean) => setActiveModal(v ? 'cancel' : null);
  const showHistoryModal = activeModal === 'history';
  const setShowHistoryModal = (v: boolean) => setActiveModal(v ? 'history' : null);
  const showRPEInfo = activeModal === 'rpe_info';
  const setShowRPEInfo = (v: boolean) => setActiveModal(v ? 'rpe_info' : null);
  const showDraftRecovery = activeModal === 'draft_recovery';
  const setShowDraftRecovery = (v: boolean) => setActiveModal(v ? 'draft_recovery' : null);

  const [showOverview, setShowOverview] = useState(() => !useAppStore.getState().activeWorkout?.overviewDone);
  const [feeling, setFeeling] = useState<'great' | 'good' | 'okay' | 'rough'>('good');
  const [showCheckInDetail, setShowCheckInDetail] = useState(false);
  const [showExerciseFeedback, setShowExerciseFeedback] = useState(false);
  const [addExerciseSearch, setAddExerciseSearch] = useState('');
  const [addExerciseFilter, setAddExerciseFilter] = useState<string>('all');
  const [feedbackExerciseIndex, setFeedbackExerciseIndex] = useState(0);
  const [inlineFeedbackIndex, setInlineFeedbackIndex] = useState<number | null>(null);
  const [weightSuggestion, setWeightSuggestion] = useState<{ message: string; suggestedWeight: number } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showLocationConfirm, setShowLocationConfirm] = useState<EquipmentProfileName | null>(null);
  const [grapplingReduction, setGrapplingReduction] = useState<{ level: string; setsRemoved: number; rpeReduced: number } | null>(null);
  const [overviewSwapIndex, setOverviewSwapIndex] = useState<number | null>(null);
  const [formCheckExercise, setFormCheckExercise] = useState<{ name: string; videoUrl?: string } | null>(null);
  const [lastCompletedExerciseIndex, setLastCompletedExerciseIndex] = useState<number | null>(null);
  const [undoInfo, setUndoInfo] = useState<{ exerciseIndex: number; setIndex: number; previousSets: SetLog[]; previousPR: boolean; previousE1RM: number } | null>(null);

  // ── Readiness Auto-Throttle state ──
  const [throttleResult, setThrottleResult] = useState<ActiveWorkoutThrottle | null>(
    () => useAppStore.getState().activeWorkout?.throttle ?? null,
  );
  const [throttleApplied, setThrottleApplied] = useState(() => {
    const t = useAppStore.getState().activeWorkout?.throttle;
    return !!t && t.config.level !== 'green';
  });
  const [throttleDismissed, setThrottleDismissed] = useState(false);

  // ── Corner Coach state ──
  const [coachMessages, setCoachMessages] = useState<CoachMessage[]>([]);
  const coachTriggerHistory = useRef<Set<string>>(new Set());
  const [coachDismissed, setCoachDismissed] = useState<string | null>(null);

  // ── Live RPE Regulator state ──
  const [rpeRegulation, setRpeRegulation] = useState<RPERegulation | null>(null);

  // ── Smart Warm-Up state ──
  const [warmUpProtocol, setWarmUpProtocol] = useState<WarmUpProtocol | null>(null);
  const [showWarmUp, setShowWarmUp] = useState(false);
  const [warmUpStepIndex, setWarmUpStepIndex] = useState(0);

  // ── Superset detection state ──
  const [supersetCandidates, setSupersetCandidates] = useState<{ indexA: number; indexB: number; reason: string }[]>([]);

  // ── Tempo Training state ──
  const [tempoState, setTempoState] = useState<TempoState | null>(null);
  const [tempoPrescription, setTempoPrescription] = useState<TempoPrescription | null>(null);
  const tempoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [tempoTotalTUT, setTempoTotalTUT] = useState(0);

  const [whoopApplied, setWhoopApplied] = useState(false);
  const [whoopFollowed, setWhoopFollowed] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const preWhoopSnapshot = useRef<{ session: any; exerciseLogs: any } | null>(null);
  const [grapplingToday, setGrapplingToday] = useState<'none' | 'light' | 'moderate' | 'hard'>('none');
  const [showGrapplingQ, setShowGrapplingQ] = useState(true);

  // ── Volume Gap Fill prompt state ──
  const [showVolumeGapPrompt, setShowVolumeGapPrompt] = useState(false);
  const [volumeGapDismissed, setVolumeGapDismissed] = useState(false);
  // Keyed by gap.muscle — user can check any subset of the proposed accessories.
  const [selectedVolumeGaps, setSelectedVolumeGaps] = useState<Set<string>>(new Set());
  const [criticalReadinessAcknowledged, setCriticalReadinessAcknowledged] = useState(false);

  // ── First-time swipe gesture hint ──
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [confirmZeroReps, setConfirmZeroReps] = useState(false);

  const weightUnit: WeightUnit = resolveWeightUnit(user?.weightUnit);

  // Move to an exercise and land on its first set that isn't done yet
  // (last set if all are done) — never blindly on set 1, which made you
  // re-log or overwrite work after jumping between exercises.
  const goToExercise = useCallback((index: number) => {
    const log = useAppStore.getState().activeWorkout?.exerciseLogs[index];
    const firstOpen = log ? log.sets.findIndex(s => !s.completed && !s.skipped) : 0;
    setCurrentExerciseIndex(index);
    setCurrentSetIndex(firstOpen >= 0 ? firstOpen : Math.max(0, (log?.sets.length ?? 1) - 1));
  }, []);

  // Swipe between exercises
  const swipeHandlers = useSwipe({
    onSwipeLeft: useCallback(() => {
      if (activeWorkout && currentExerciseIndex < activeWorkout.session.exercises.length - 1) {
        goToExercise(currentExerciseIndex + 1);
      }
    }, [activeWorkout, currentExerciseIndex, goToExercise]),
    onSwipeRight: useCallback(() => {
      if (currentExerciseIndex > 0) {
        goToExercise(currentExerciseIndex - 1);
      }
    }, [currentExerciseIndex, goToExercise]),
    threshold: 50,
    preventScroll: true,
  });

  // Compute Whoop readiness for display (uses personal baseline for accurate HRV/RHR analysis)
  const whoopReadiness = latestWhoopData ? whoopRecoveryToReadiness({
    recoveryScore: latestWhoopData.recoveryScore ?? undefined,
    hrvMs: latestWhoopData.hrv ?? undefined,
    restingHR: latestWhoopData.restingHR ?? undefined,
    sleepScore: latestWhoopData.sleepScore ?? undefined,
    strainScore: latestWhoopData.strain ?? undefined,
    spo2: latestWhoopData.spo2 ?? undefined,
    sleepEfficiency: latestWhoopData.sleepEfficiency ?? undefined,
    deepSleepMinutes: latestWhoopData.deepSleepMinutes ?? undefined,
    sleepHours: latestWhoopData.sleepHours ?? undefined,
    sleepNeededHours: latestWhoopData.sleepNeededHours ?? undefined,
    sleepConsistency: latestWhoopData.sleepConsistency ?? undefined,
    sleepDisturbances: latestWhoopData.sleepDisturbances ?? undefined,
  }, personalBaseline) : null;

  // Pre-workout check-in state - initialized with Whoop data if available
  // Feeling presets → auto-map to full PreWorkoutCheckIn
  const FEELING_PRESETS: Record<'great' | 'good' | 'okay' | 'rough', PreWorkoutCheckIn> = {
    great: { sleepQuality: 5, sleepHours: 8, nutrition: 'full_meal', stress: 1, soreness: 1, motivation: 5 },
    good:  { sleepQuality: 4, sleepHours: 7, nutrition: 'full_meal', stress: 2, soreness: 2, motivation: 4 },
    okay:  { sleepQuality: 3, sleepHours: 6.5, nutrition: 'light_meal', stress: 3, soreness: 3, motivation: 3 },
    rough: { sleepQuality: 2, sleepHours: 5.5, nutrition: 'light_meal', stress: 4, soreness: 4, motivation: 2 },
  };

  const [checkIn, setCheckIn] = useState<PreWorkoutCheckIn>(() => {
    const preset = FEELING_PRESETS['good'];
    return {
      ...preset,
      sleepQuality: latestWhoopData?.sleepScore
        ? Math.round((latestWhoopData.sleepScore / 100) * 5)
        : preset.sleepQuality,
      sleepHours: latestWhoopData?.sleepHours ?? preset.sleepHours,
    };
  });

  // Auto-select feeling from Whoop recovery score
  useEffect(() => {
    if (latestWhoopData?.recoveryScore) {
      const score = latestWhoopData.recoveryScore;
      const whoopFeeling = score >= 67 ? 'great' as const : score >= 34 ? 'good' as const : 'rough' as const;
      setFeeling(whoopFeeling);
    }
  }, [latestWhoopData]);

  // Sync feeling → checkIn (preserve Whoop sleep data if available)
  useEffect(() => {
    const preset = FEELING_PRESETS[feeling];
    setCheckIn(prev => ({
      ...preset,
      sleepHours: latestWhoopData?.sleepHours ?? preset.sleepHours,
      sleepQuality: latestWhoopData?.sleepScore
        ? Math.round((latestWhoopData.sleepScore / 100) * 5)
        : preset.sleepQuality,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feeling]);

  // Exercise feedback state
  const [exerciseFeedback, setExerciseFeedbackState] = useState<Partial<ExerciseFeedback>>({
    pumpRating: 3,
    difficulty: 'just_right',
    jointPain: false,
    wantToSwap: false
  });

  // Post-workout feedback
  const [feedback, setFeedback] = useState({
    overallRPE: 7,
    soreness: 5,
    energy: 7,
    notes: '',
    overallPerformance: 'as_expected' as 'worse_than_expected' | 'as_expected' | 'better_than_expected',
    mood: 3,
    wouldRepeat: true
  });
  // Session RPE starts from the sets you actually rated (was a flat 7), so
  // finishing is one tap for most sessions; tapping a value overrides it.
  const sessionRpeTouched = useRef(false);
  useEffect(() => {
    if (activeModal !== 'finish' || sessionRpeTouched.current) return;
    const rated = (useAppStore.getState().activeWorkout?.exerciseLogs ?? [])
      .flatMap(l => l.sets)
      .filter(st => st.completed && st.rpeSource === 'user' && st.rpe > 0)
      .map(st => st.rpe);
    if (rated.length === 0) return;
    const avg = Math.round(rated.reduce((a, b) => a + b, 0) / rated.length);
    setFeedback(f => ({ ...f, overallRPE: Math.max(5, Math.min(10, avg)) }));
  }, [activeModal]);
  const [durationOverride, setDurationOverride] = useState<number | null>(null);
  const [showMoreFeedback, setShowMoreFeedback] = useState(false);

  // Workout timer — uses startTime timestamp so it survives app backgrounding.
  // visibilitychange forces an immediate tick on resume so the displayed
  // elapsed value catches up after iOS throttled the interval.
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const tick = () => forceUpdate(n => n + 1);
    const timer = setInterval(tick, 1000);
    const onVisible = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // Show swipe gesture hint on first active workout — once the logger is
  // actually visible (it used to time out behind the overview).
  useEffect(() => {
    if (showOverview) return;
    if (typeof window !== 'undefined' && !localStorage.getItem('hasSeenSwipeHint')) {
      setShowSwipeHint(true);
      const hintTimer = setTimeout(() => {
        setShowSwipeHint(false);
        localStorage.setItem('hasSeenSwipeHint', 'true');
      }, 4000);
      return () => clearTimeout(hintTimer);
    }
  }, [showOverview]);

  // Rest timer managed by useRestTimer hook (see line 173)

  // Draft recovery — detect if this workout was restored from persistence
  useEffect(() => {
    if (!activeWorkout) return;
    const startTime = new Date(activeWorkout.startTime).getTime();
    const elapsed = Date.now() - startTime;
    // If more than 30 minutes have passed, show recovery prompt
    if (elapsed > 30 * 60 * 1000) {
      setShowDraftRecovery(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!activeWorkout) return null;

  const currentExercise = activeWorkout.session.exercises[currentExerciseIndex];
  const currentLog = activeWorkout.exerciseLogs[currentExerciseIndex];
  const currentSet = currentLog.sets[currentSetIndex];
  const isTimeBased = currentExercise.exercise.measurementType === 'time';
  // Distance work (bear crawl, sled, band walks) stores METRES in the reps field.
  const isDistance = currentExercise.exercise.measurementType === 'distance';

  // Real-time PR detection — same rule as logging: needs history, must beat
  // both the all-time best and this session's own best, unit-aware.
  const personalBestForLift = useMemo(
    () => personalBest(currentLog?.exerciseId ?? '', useAppStore.getState().workoutLogs, weightUnit, isTimeBased ? 'duration' : 'e1rm'),
    [currentLog?.exerciseId, weightUnit, isTimeBased], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const prDetection = useMemo(() => {
    const none = { isPotentialPR: false, currentE1RM: 0, bestE1RM: personalBestForLift.best, hasHistory: personalBestForLift.hasHistory };
    if (!currentLog || !personalBestForLift.hasHistory || isDistance) return none;
    const bar = isTimeBased
      ? Math.max(personalBestForLift.best, currentLog.bestDuration || 0)
      : Math.max(personalBestForLift.best, currentLog.estimated1RM || 0);
    const current = isTimeBased
      ? (currentSet.duration || 0)
      : (currentSet.weight > 0 && currentSet.reps > 0 ? calculate1RM(currentSet.weight, currentSet.reps) : 0);
    return { ...none, isPotentialPR: current > 0 && current > bar, currentE1RM: current, bestE1RM: bar };
  }, [currentLog, currentSet.weight, currentSet.reps, currentSet.duration, isTimeBased, isDistance, personalBestForLift]);

  const updateSetValue = (field: 'weight' | 'reps' | 'rpe' | 'duration', delta: number) => {
    const newSets = [...currentLog.sets];
    const current = newSets[currentSetIndex][field] || 0;
    newSets[currentSetIndex] = {
      ...newSets[currentSetIndex],
      [field]: Math.max(0, (current as number) + delta),
      ...(field === 'rpe' ? { rpeSource: 'user' as const } : {}),
    };
    updateExerciseLog(currentExerciseIndex, { ...currentLog, sets: newSets });
  };

  const setExactValue = (field: 'weight' | 'reps' | 'rpe' | 'duration', value: number) => {
    // Read the live log (not the render closure) so rapid edits can't clobber each other.
    const liveLog = useAppStore.getState().activeWorkout?.exerciseLogs[currentExerciseIndex] ?? currentLog;
    const newSets = [...liveLog.sets];
    newSets[currentSetIndex] = {
      ...newSets[currentSetIndex],
      [field]: Math.max(0, value),
      ...(field === 'rpe' ? { rpeSource: 'user' as const } : {}),
    };
    // Correcting a logged set: keep the session's e1RM honest.
    const done = newSets.filter(st => st.completed && st.weight > 0 && st.reps > 0);
    const e1 = !isTimeBased && !isDistance && done.length
      ? Math.max(...done.map(st => calculate1RM(st.weight, st.reps)))
      : liveLog.estimated1RM;
    updateExerciseLog(currentExerciseIndex, { ...liveLog, sets: newSets, estimated1RM: e1 });
  };

  useEffect(() => {
    if (!prBanner) return;
    const t = setTimeout(() => setPrBanner(null), 4000);
    return () => clearTimeout(t);
  }, [prBanner]);

  // ── Tempo metronome controls ──
  const startTempo = () => {
    const parsed = parseTempo(currentExercise?.prescription?.tempo);
    if (!parsed) return;
    setTempoPrescription(parsed);
    const initial = initTempoState(parsed);
    setTempoState(initial);
    // Haptic on start
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
  };

  const stopTempoMetronome = () => {
    if (tempoIntervalRef.current) {
      clearInterval(tempoIntervalRef.current);
      tempoIntervalRef.current = null;
    }
    if (tempoState) {
      setTempoTotalTUT(tempoState.tut);
    }
    setTempoState(null);
    setTempoPrescription(null);
  };

  // Tempo tick interval
  useEffect(() => {
    if (!tempoState?.active || !tempoPrescription) {
      if (tempoIntervalRef.current) {
        clearInterval(tempoIntervalRef.current);
        tempoIntervalRef.current = null;
      }
      return;
    }
    tempoIntervalRef.current = setInterval(() => {
      setTempoState(prev => {
        if (!prev || !prev.active) return prev;
        const result = tickTempo(prev, tempoPrescription);
        if (result.phaseChanged) {
          // Haptic on phase change — double pulse for rep completion
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(result.repCompleted ? [80, 40, 80] : [50]);
          }
        }
        return result.state;
      });
    }, 1000);
    return () => {
      if (tempoIntervalRef.current) {
        clearInterval(tempoIntervalRef.current);
        tempoIntervalRef.current = null;
      }
    };
  }, [tempoState?.active, tempoPrescription]);

  // Stop tempo when exercise changes or rest starts.
  // The exercise-change path was missing — swap exercise mid-tempo and the
  // metronome would keep ticking against the new exercise's reps.
  useEffect(() => {
    if (isResting && tempoState) {
      stopTempoMetronome();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResting]);

  useEffect(() => {
    return () => stopTempoMetronome();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExerciseIndex]);

  // Reset zero-reps confirmation when set changes
  useEffect(() => {
    setConfirmZeroReps(false);
  }, [currentSetIndex, currentExerciseIndex]);

  // Scroll the active set into view on advance — kills the "where did the next set go?" friction.
  useEffect(() => {
    const el = activeSetRef.current;
    if (!el) return;
    // Defer to next frame so layout is settled.
    const id = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => cancelAnimationFrame(id);
  }, [currentSetIndex, currentExerciseIndex]);

  const completeSet = () => {
    // Re-entry guard — rapid double-taps fire only once.
    if (completingSetRef.current) return;
    completingSetRef.current = true;
    // Release on next macrotask after React commits the new set state.
    setTimeout(() => { completingSetRef.current = false; }, 400);

    // Save undo info before modifying
    setUndoInfo({
      exerciseIndex: currentExerciseIndex,
      setIndex: currentSetIndex,
      previousSets: currentLog.sets.map(s => ({ ...s })),
      previousPR: currentLog.personalRecord || false,
      previousE1RM: currentLog.estimated1RM || 0,
    });

    const newSets = [...currentLog.sets];
    // Record tempo TUT if the metronome was used
    const setTUT = tempoState?.tut || tempoTotalTUT;
    const tempoNote = setTUT > 0 ? `TUT: ${formatTUT(setTUT)}` : undefined;
    newSets[currentSetIndex] = {
      ...newSets[currentSetIndex],
      completed: true,
      ...(tempoNote ? { notes: [newSets[currentSetIndex].notes, tempoNote].filter(Boolean).join(' | ') } : {}),
    };
    // Reset tempo state for next set
    if (tempoState || tempoTotalTUT > 0) {
      stopTempoMetronome();
      setTempoTotalTUT(0);
    }

    // Carry forward weight/reps/duration/rpe to next set so the user doesn't have to re-enter
    if (currentSetIndex + 1 < newSets.length && !newSets[currentSetIndex + 1].completed) {
      newSets[currentSetIndex + 1] = {
        ...newSets[currentSetIndex + 1],
        weight: newSets[currentSetIndex].weight,
        reps: newSets[currentSetIndex].reps,
        rpe: newSets[currentSetIndex + 1].rpe || newSets[currentSetIndex].rpe,
        rpeSource: 'prefill' as const,
        ...(isTimeBased && newSets[currentSetIndex].duration !== undefined
          ? { duration: newSets[currentSetIndex].duration }
          : {}),
      };
    }

    // Check for PR - compare against all previous logs for this exercise
    const workoutLogs = useAppStore.getState().workoutLogs.filter(l => !l._deleted);
    let isPR = false;
    let estimated1RM = 0;
    let bestDuration = 0;

    if (isTimeBased) {
      const currentDuration = currentSet.duration || 0;
      let previousBestDuration = 0;
      let hasHistoryForExercise = false;
      for (const log of workoutLogs) {
        for (const ex of log.exercises) {
          if (ex.exerciseId === currentLog.exerciseId) {
            for (const s of ex.sets) {
              if ((s.duration || 0) > 0) {
                hasHistoryForExercise = true;
                previousBestDuration = Math.max(previousBestDuration, s.duration || 0);
              }
            }
          }
        }
      }
      isPR = currentDuration > 0 && hasHistoryForExercise
        && currentDuration > Math.max(previousBestDuration, currentLog.bestDuration || 0);
      bestDuration = Math.max(currentLog.bestDuration || 0, currentDuration);
    } else {
      estimated1RM = calculate1RM(currentSet.weight, currentSet.reps);
      let previousBest1RM = 0;
      let hasHistoryForExercise = false;
      for (const log of workoutLogs) {
        for (const ex of log.exercises) {
          if (ex.exerciseId === currentLog.exerciseId && ex.estimated1RM) {
            hasHistoryForExercise = true;
            // History may be in the other unit (athlete switched kg↔lbs)
            const e1rm = log.weightUnit && log.weightUnit !== weightUnit
              ? convertWeight(ex.estimated1RM, log.weightUnit, weightUnit)
              : ex.estimated1RM;
            previousBest1RM = Math.max(previousBest1RM, e1rm);
          }
        }
      }
      // A first-ever lift isn't a record, and each set must beat the session's
      // own best too — otherwise every heavier set re-fires the celebration.
      isPR = !isDistance && currentSet.weight > 0 && hasHistoryForExercise
        && estimated1RM > Math.max(previousBest1RM, currentLog.estimated1RM || 0);
      if (isDistance) estimated1RM = 0; // metres aren't reps — no e1RM
    }

    updateExerciseLog(currentExerciseIndex, {
      ...currentLog,
      sets: newSets,
      personalRecord: currentLog.personalRecord || isPR,
      estimated1RM: isTimeBased
        ? currentLog.estimated1RM
        : Math.max(currentLog.estimated1RM || 0, estimated1RM),
      ...(isTimeBased ? { bestDuration } : {}),
    });

    if (isPR) {
      setPrBanner(isTimeBased
        ? { name: currentExercise.exercise.name, from: Math.max(prDetection.bestE1RM, 0), to: currentSet.duration || 0, unit: 's' }
        : { name: currentExercise.exercise.name, from: prDetection.bestE1RM, to: estimated1RM, unit: weightUnit });
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([40, 60, 40]);
    }

    // Start rest timer via hook
    const restSecs = currentExercise.prescription.restSeconds;
    if (restSecs > 0) {
      startRest(restSecs);
    }

    // ── Corner Coach: generate coaching messages after set completion ──
    try {
      const coachCtx: CoachContext = {
        currentExercise,
        currentExerciseLog: { ...currentLog, sets: newSets },
        currentSetIndex,
        justCompletedSet: newSets[currentSetIndex],
        allExerciseLogs: activeWorkout.exerciseLogs,
        exerciseIndex: currentExerciseIndex,
        totalExercises: activeWorkout.session.exercises.length,
        sessionStartTime: new Date(activeWorkout.startTime),
        completedSets: activeWorkout.exerciseLogs.reduce((s, e) => s + e.sets.filter(ss => ss.completed).length, 0) + 1,
        totalSets: activeWorkout.session.exercises.reduce((s, e) => s + e.sets, 0),
        previousLogs: storeWorkoutLogs,
        throttleLevel: (throttleResult?.config.level ?? 'green') as ThrottleLevel,
        preCheckIn: activeWorkout.preCheckIn ?? null,
        weightUnit,
        recentMessageTriggers: coachTriggerHistory.current,
      };
      const msgs = getCoachMessages(coachCtx);
      if (msgs.length > 0) {
        setCoachMessages(msgs);
        setCoachDismissed(null);
        msgs.forEach(m => coachTriggerHistory.current.add(m.trigger));
        // Auto-dismiss after the longest message duration
        const maxDuration = Math.max(...msgs.map(m => m.dismissAfterMs));
        setTimeout(() => setCoachMessages([]), maxDuration);
      }
    } catch {
      // Don't let coach errors break the workout
    }

    // ── Live RPE Regulator: check for weight adjustment suggestion ──
    try {
      const regulation = regulateRPE(
        newSets,
        currentExercise,
        (throttleResult?.config.level ?? 'green') as ThrottleLevel,
        weightUnit,
      );
      setRpeRegulation(regulation);
    } catch {
      // Don't let regulator errors break the workout
    }

    // Check if this was the last set of current exercise
    const isLastSetOfExercise = currentSetIndex === currentLog.sets.length - 1;

    if (isLastSetOfExercise) {
      // Track which exercise just had its last set completed (for "Add Extra Set" option)
      setLastCompletedExerciseIndex(currentExerciseIndex);
      // Show inline feedback bar instead of modal
      setFeedbackExerciseIndex(currentExerciseIndex);
      setExerciseFeedbackState({
        pumpRating: 3,
        difficulty: 'just_right',
        jointPain: false,
        wantToSwap: false
      });
      setInlineFeedbackIndex(currentExerciseIndex);

      // Move to next exercise
      if (currentExerciseIndex < activeWorkout.session.exercises.length - 1) {
        goToExercise(currentExerciseIndex + 1);
        setWeightSuggestion(null); // Clear stale suggestion from previous exercise
      }
    } else {
      // Set-level auto-regulation: suggest weight adjustment for next set
      const targetReps = currentExercise.prescription.targetReps;
      const actualReps = currentSet.reps;
      const currentWeight = currentSet.weight;

      if (currentWeight > 0 && actualReps > 0) {
        // Size the correction off what this set actually implies about the
        // athlete's e1RM, not a fixed plate jump — overshooting the target by
        // 5 reps needs a bigger move than overshooting by 3.
        const corrected = carryOverLoad({
          lastWeight: currentWeight,
          lastReps: actualReps,
          lastRPE: currentSet.rpe,
          targetReps,
          targetRPE: currentExercise.prescription.rpe,
          unit: weightUnit,
        });
        // Implement-aware steps: a dumbbell's next step isn't a 2.5 kg plate pair.
        const up = nextLoadStep(currentWeight, loadProfile, weightUnit, 1);
        const down = nextLoadStep(currentWeight, loadProfile, weightUnit, -1);
        if (actualReps >= targetReps + 3) {
          const suggestedWeight = Math.max(up, roundForImplement(corrected?.suggested ?? up, loadProfile, weightUnit));
          setWeightSuggestion({
            message: `You hit ${actualReps} reps (target ${targetReps}) — consider bumping up`,
            suggestedWeight,
          });
        } else if (actualReps <= targetReps - 3 && currentSet.rpe >= 9) {
          const suggestedWeight = Math.max(
            roundForImplement(0.01, loadProfile, weightUnit),
            Math.min(down, roundForImplement(corrected?.suggested ?? down, loadProfile, weightUnit))
          );
          setWeightSuggestion({
            message: `Only ${actualReps} reps at RPE ${currentSet.rpe} — consider dropping weight`,
            suggestedWeight,
          });
        } else {
          setWeightSuggestion(null);
        }
      }

      setCurrentSetIndex(currentSetIndex + 1);
    }

    // Show tip during rest — keep visible for the full rest period
    if (Math.random() < 0.5) {
      setTip(getRandomTip(currentExercise.exerciseId));
      setShowTip(true);
      // Stay visible for the entire rest or at least 20 seconds
      const tipDuration = Math.max(20000, currentExercise.prescription.restSeconds * 1000);
      setTimeout(() => setShowTip(false), tipDuration);
    }
  };

  const submitExerciseFeedback = () => {
    const fb: ExerciseFeedback = {
      exerciseId: activeWorkout.exerciseLogs[feedbackExerciseIndex].exerciseId,
      pumpRating: exerciseFeedback.pumpRating || 3,
      difficulty: exerciseFeedback.difficulty || 'just_right',
      jointPain: exerciseFeedback.jointPain || false,
      jointPainLocation: exerciseFeedback.jointPainLocation,
      wantToSwap: exerciseFeedback.wantToSwap || false
    };
    updateExerciseFeedback(feedbackExerciseIndex, fb);
    setShowExerciseFeedback(false);
  };

  const hasPrimer = activeWorkout?.session.exercises.some(e => (e.notes ?? '').startsWith('Power primer')) ?? false;
  const handleAddPowerPrimer = () => {
    const from = { ex: currentExerciseIndex, set: currentSetIndex };
    const r = addPowerPrimer();
    if (!r) {
      showToast('Power primer skipped — readiness is red today. Recover first.', 'warning');
      return;
    }
    goToExercise(r.index);
    showToast(`Power primer added. ${r.reason}`, 'success', {
      label: 'Undo',
      onClick: () => { if (undoSwap()) { setCurrentExerciseIndex(from.ex); setCurrentSetIndex(from.set); } },
    });
  };

  const handleSwapExercise = (newExerciseId: string, newExerciseName: string) => {
    const from = { ex: currentExerciseIndex, set: currentSetIndex };
    const continueAt = swapExercise(currentExerciseIndex, newExerciseId, newExerciseName);
    setShowSwapModal(false);
    if (typeof continueAt === 'number') {
      setCurrentExerciseIndex(continueAt);
      if (continueAt !== from.ex) setCurrentSetIndex(0);
    }
    showToast(`Swapped to ${newExerciseName}`, 'success', {
      label: 'Undo',
      onClick: () => {
        if (undoSwap()) {
          setCurrentExerciseIndex(from.ex);
          setCurrentSetIndex(from.set);
        }
      },
    });
  };

  const handleSkipExercise = () => {
    // Remaining sets are marked skipped — NOT completed. They used to be saved
    // as completed 0×0 with a fake 'too_hard' rating, which prefilled the next
    // session with 0×0 and fed a bogus signal to autoregulation.
    const skippedSets = currentLog.sets.map(s =>
      s.completed ? s : { ...s, skipped: true, completed: false, notes: 'Skipped' }
    );
    updateExerciseLog(currentExerciseIndex, { ...currentLog, sets: skippedSets });
    // Move to next exercise if not on last one
    if (currentExerciseIndex < activeWorkout.session.exercises.length - 1) {
      goToExercise(currentExerciseIndex + 1);
    }
    setIsResting(false);
  };

  const submitPreCheckIn = () => {
    setPreCheckIn(checkIn);

    // ── Readiness Auto-Throttle: compute full readiness and apply ──
    if (activeWorkout?.session) {
      try {
        const fullReadiness = calcFullReadiness({
          user: user ?? null,
          workoutLogs: storeWorkoutLogs,
          trainingSessions,
          wearableData: latestWhoopData,
          wearableHistory,
          meals,
          macroTargets,
          waterLog,
          injuryLog,
          quickLogs,
          preCheckIn: checkIn,
        });
        // Throttle exactly once per workout. The store action is idempotent
        // and re-aligns logs to the adjusted exercise list by exerciseId.
        if (!activeWorkout.throttle) {
          const result = applyThrottle(activeWorkout.session, fullReadiness);
          applyReadinessThrottle(result);
          const { adjustedSession: _adjusted, ...meta } = result;
          setThrottleResult(meta);
          setThrottleApplied(result.config.level !== 'green');
        }
      } catch {
        // Graceful fallback — don't block the workout if readiness calc fails
      }
    }

    // ── Smart Warm-Up: generate based on session exercises ──
    if (activeWorkout?.session) {
      try {
        // Get working weight for first compound
        const firstCompound = activeWorkout.session.exercises.find(e => e.exercise.category === 'compound');
        let workingWeight: number | undefined;
        if (firstCompound) {
          const suggested = getSuggestedWeight(firstCompound.exerciseId, storeWorkoutLogs);
          if (suggested) workingWeight = suggested;
        }
        const protocol = generateSmartWarmUp(
          activeWorkout.session.exercises,
          activeWorkout.session.type,
          workingWeight,
          weightUnit,
        );
        setWarmUpProtocol(protocol);
      } catch {
        // Non-critical
      }

      // ── Superset Detection ──
      try {
        const candidates = detectSupersetCandidates(activeWorkout.session.exercises);
        setSupersetCandidates(candidates);
      } catch {
        // Non-critical
      }
    }
  };

  const submitInlineFeedback = (difficulty: 'too_easy' | 'just_right' | 'too_hard', pain: boolean) => {
    const fb: ExerciseFeedback = {
      exerciseId: activeWorkout.exerciseLogs[feedbackExerciseIndex].exerciseId,
      pumpRating: difficulty === 'too_easy' ? 2 : difficulty === 'just_right' ? 4 : 3,
      difficulty: difficulty === 'too_hard' ? 'too_hard' : difficulty === 'too_easy' ? 'too_easy' : 'just_right',
      jointPain: pain,
      wantToSwap: pain || difficulty === 'too_hard'
    };
    updateExerciseFeedback(feedbackExerciseIndex, fb);
    setInlineFeedbackIndex(null);
  };

  const skipRest = () => {
    setIsResting(false);
    cancelRest();
    setLastCompletedExerciseIndex(null);
  };

  const undoLastSet = () => {
    if (!undoInfo) return;
    updateExerciseLog(undoInfo.exerciseIndex, {
      ...activeWorkout.exerciseLogs[undoInfo.exerciseIndex],
      sets: undoInfo.previousSets,
      personalRecord: undoInfo.previousPR,
      estimated1RM: undoInfo.previousE1RM,
    });
    setCurrentExerciseIndex(undoInfo.exerciseIndex);
    setCurrentSetIndex(undoInfo.setIndex);
    setIsResting(false);
    cancelRest();
    setLastCompletedExerciseIndex(null);
    setWeightSuggestion(null);
    setUndoInfo(null);
  };

  const addExtraSet = (exerciseIdx: number) => {
    const exerciseLog = activeWorkout.exerciseLogs[exerciseIdx];
    const lastSet = exerciseLog.sets[exerciseLog.sets.length - 1];

    const newSet: SetLog = {
      setNumber: exerciseLog.sets.length + 1,
      weight: lastSet.weight,
      reps: lastSet.reps,
      rpe: lastSet.rpe,
      completed: false,
    };

    updateExerciseLog(exerciseIdx, {
      ...exerciseLog,
      sets: [...exerciseLog.sets, newSet],
    });

    // Navigate to the new set on the correct exercise
    setCurrentExerciseIndex(exerciseIdx);
    setCurrentSetIndex(exerciseLog.sets.length); // index of the newly added set

    // End rest and clear tracking state
    setIsResting(false);
    cancelRest();
    setLastCompletedExerciseIndex(null);
  };

  // Delete the current set (wrong entry, or you won't do it). Renumbers, keeps
  // the session e1RM / PR flag honest, and never removes the last set.
  const removeCurrentSet = () => {
    const liveLog = useAppStore.getState().activeWorkout?.exerciseLogs[currentExerciseIndex] ?? currentLog;
    if (liveLog.sets.length <= 1) return;
    const sets = liveLog.sets.filter((_, i) => i !== currentSetIndex).map((st, i) => ({ ...st, setNumber: i + 1 }));
    const done = sets.filter(st => st.completed && st.weight > 0 && st.reps > 0);
    const e1 = !isTimeBased && !isDistance && done.length ? Math.max(...done.map(st => calculate1RM(st.weight, st.reps))) : 0;
    const bestHold = isTimeBased ? Math.max(0, ...sets.filter(st => st.completed).map(st => st.duration || 0)) : 0;
    const pr = personalBestForLift.hasHistory && (isTimeBased ? bestHold > personalBestForLift.best : e1 > personalBestForLift.best);
    updateExerciseLog(currentExerciseIndex, {
      ...liveLog,
      sets,
      estimated1RM: isTimeBased ? liveLog.estimated1RM : e1 || undefined,
      ...(isTimeBased ? { bestDuration: bestHold } : {}),
      personalRecord: pr,
    });
    setCurrentSetIndex(Math.min(currentSetIndex, sets.length - 1));
  };

  const formatRestTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalSets = activeWorkout.exerciseLogs.reduce((sum, log) => sum + log.sets.length, 0);
  // Header ETA — recomputed on every render plus a 30 s tick.
  const eta = sessionEta(
    activeWorkout.session.exercises.map((ex, i) => ({
      sets: activeWorkout.exerciseLogs[i]?.sets.length ?? ex.sets,
      restSeconds: ex.prescription.restSeconds,
      workSeconds: ex.exercise.measurementType === 'time' ? Math.max(10, ex.prescription.targetReps) : undefined,
    })),
    activeWorkout.exerciseLogs,
    activeWorkout.startTime,
    activeWorkout.session.estimatedDuration,
    new Date(etaNow),
  );
  // "Resolved" = performed or deliberately skipped; both count toward progress.
  const completedSets = activeWorkout.exerciseLogs.reduce(
    (sum, log) => sum + log.sets.filter(s => s.completed || s.skipped).length,
    0
  );
  const progress = (completedSets / totalSets) * 100;

  const isLastSet = currentSetIndex === currentLog.sets.length - 1;
  const isLastExercise = currentExerciseIndex === activeWorkout.session.exercises.length - 1;
  // Check if ALL exercises are fully completed (not just current index position)
  const allExercisesDone = activeWorkout.exerciseLogs.every(
    log => log.sets.every(s => s.completed || s.skipped)
  );
  const hasIncompleteExercises = activeWorkout.exerciseLogs.some(
    (log, i) => i !== currentExerciseIndex && log.sets.some(s => !s.completed && !s.skipped)
  );
  const isWorkoutComplete = allExercisesDone;

  // Total volume completed so far (for rest overlay display)
  const totalVolumeCompleted = activeWorkout.exerciseLogs.reduce((sum, log) =>
    sum + log.sets.filter(s => s.completed).reduce((s, set) => s + set.weight * set.reps, 0), 0
  );

  // Get readiness for display
  const readiness = activeWorkout.preCheckIn ? calculateReadiness(activeWorkout.preCheckIn) : null;

  // Resolve the actual equipment list from active profile for smart swap filtering
  const profileEquipment = useMemo(() => {
    const preset = DEFAULT_EQUIPMENT_PROFILES.find(p => p.name === activeEquipmentProfile);
    return preset?.equipment ?? user?.availableEquipment;
  }, [activeEquipmentProfile, user?.availableEquipment]);

  // Get alternatives for current exercise (basic list kept for compatibility)
  const alternatives = user ? getAlternativesForExercise(
    currentExercise.exerciseId,
    user.equipment,
    5,
    profileEquipment
  ) : [];


  // Filtered exercises for Add Exercise modal
  const addExerciseList = useMemo(() => {
    if (!activeWorkout) return [];
    const usedIds = new Set(activeWorkout.session.exercises.map(e => e.exerciseId));
    const userEquipment = user?.equipment;
    // Typing searches the whole library (curated + imported + custom), ranked;
    // browsing without a query stays on the curated list.
    const base = addExerciseSearch.trim() ? searchExercises(addExerciseSearch, 200) : exerciseLibrary;
    return base.filter(ex => {
      if (usedIds.has(ex.id)) return false;
      if (userEquipment && !ex.equipmentRequired.includes(userEquipment)) return false;
      // Granular equipment check from active profile
      if (profileEquipment && profileEquipment.length > 0) {
        const eqTypes = ex.equipmentTypes || [];
        if (eqTypes.length > 0 && !(eqTypes.length === 1 && eqTypes[0] === 'bodyweight')) {
          if (!eqTypes.every(et => et === 'bodyweight' || profileEquipment.includes(et))) return false;
        }
      }
      if (addExerciseFilter !== 'all' && !ex.primaryMuscles.includes(addExerciseFilter as any)) return false;
      return true;
    });
  }, [activeWorkout, user, addExerciseSearch, addExerciseFilter, profileEquipment]);

  // ── Post-workout volume gaps (includes current session's work) ──
  const postWorkoutVolumeGaps = useMemo(() => {
    if (!activeWorkout || !user) return [];
    // Build a synthetic WorkoutLog from the in-progress session so getVolumeGaps
    // counts the sets the user just did before suggesting gaps
    const syntheticLog: WorkoutLog = {
      id: 'active-session',
      userId: user.id || '',
      mesocycleId: '',
      sessionId: '',
      date: new Date(),
      exercises: activeWorkout.exerciseLogs,
      totalVolume: 0,
      duration: 0,
      overallRPE: 0,
      soreness: 0,
      energy: 0,
      completed: true,
    };
    // Mid-week the planned sessions will cover the gap — "below weekly
    // minimum" after day 1 is noise. Only flag it on the week's last session
    // (or for an ad-hoc session outside the programme).
    const meso = useAppStore.getState().currentMesocycle;
    const week = meso?.weeks.find(w => w.sessions.some(se => se.id === activeWorkout.session.id));
    if (week) {
      const stillPlanned = week.sessions.filter(se =>
        se.id !== activeWorkout.session.id && !storeWorkoutLogs.some(l => l.sessionId === se.id));
      if (stillPlanned.length > 0) return [];
    }
    return getVolumeGaps(
      [...storeWorkoutLogs, syntheticLog],
      user.equipment,
      user.availableEquipment,
    );
  }, [activeWorkout, user, storeWorkoutLogs]);

  // Get previous performance for an alternative exercise
  const getAltHistory = (exerciseId: string) => {
    const allLogs: WorkoutLog[] = chrono(useAppStore.getState().workoutLogs);
    const sorted = [...allLogs].reverse();
    for (const log of sorted) {
      const ex = log.exercises.find(e => e.exerciseId === exerciseId);
      if (ex && ex.sets.length > 0) {
        const completedSets = ex.sets.filter(s => s.completed);
        if (completedSets.length === 0) continue;
        const bestSet = completedSets.reduce((best, s) => (s.weight > best.weight ? s : best), completedSets[0]);
        return { weight: bestSet.weight, reps: bestSet.reps, date: new Date(log.date) };
      }
    }
    return null;
  };

  // Get per-exercise history from previous sessions
  const getExerciseHistory = (exerciseId: string) => {
    const allLogs: WorkoutLog[] = chrono(useAppStore.getState().workoutLogs);
    const sorted = [...allLogs].reverse();
    for (const log of sorted) {
      const ex = log.exercises.find(e => e.exerciseId === exerciseId);
      if (ex && ex.sets.length > 0) {
        const completedSets = ex.sets.filter(s => s.completed);
        if (completedSets.length === 0) continue;
        const bestSet = completedSets.reduce((best, s) => (s.weight > best.weight ? s : best), completedSets[0]);
        return {
          weight: bestSet.weight,
          reps: bestSet.reps,
          rpe: bestSet.rpe,
          date: new Date(log.date),
          feedback: ex.feedback
        };
      }
    }
    return null;
  };

  const previousPerformance = getExerciseHistory(currentExercise.exerciseId);

  // Per-set history from last session for inline display
  // Most recent session's real sets (newest by date, unit-converted, skipped
  // sets excluded) — was "last array entry", raw units, empty on skipped logs.
  const previousSetHistory = useMemo(
    () => lastTimeSets(currentLog.exerciseId, useAppStore.getState().workoutLogs, weightUnit),
    [currentLog.exerciseId, weightUnit],
  );

  // Get full history for an exercise (last 5 sessions)
  const getExerciseFullHistory = (exerciseId: string) => {
    const allLogs: WorkoutLog[] = chrono(useAppStore.getState().workoutLogs);
    const sorted = [...allLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const results: { weight: number; reps: number; rpe: number; sets: number; date: Date; feedback?: ExerciseFeedback; estimated1RM?: number }[] = [];
    for (const log of sorted) {
      const ex = log.exercises.find(e => e.exerciseId === exerciseId);
      if (ex && ex.sets.length > 0) {
        const completedSets = ex.sets.filter(s => s.completed);
        if (completedSets.length === 0) continue;
        const bestSet = completedSets.reduce((best, s) => (s.weight > best.weight ? s : best), completedSets[0]);
        results.push({
          weight: bestSet.weight,
          reps: bestSet.reps,
          rpe: bestSet.rpe,
          sets: completedSets.length,
          date: new Date(log.date),
          feedback: ex.feedback,
          estimated1RM: ex.estimated1RM,
        });
      }
      if (results.length >= 5) break;
    }
    return results;
  };

  // Weight suggestion for today's prescription, carried over from the last
  // session through the shared load model.
  //
  // Goes via e1RM rather than nudging last session's weight by a flat % per
  // rep: that's what makes undulating (DUP) blocks work. A power day logged at
  // 3 reps and a hypertrophy day prescribed at 12 reps sit at very different
  // points on the load curve, and a linear model badly under-corrects.
  // One engine decides the prefill AND explains it (lib/next-load).
  const nextLoad = useMemo(() => suggestNextLoad({
    exercise: currentExercise.exercise,
    logs: useAppStore.getState().workoutLogs,
    targetReps: currentExercise.prescription.targetReps,
    targetRPE: currentExercise.prescription.rpe,
    unit: weightUnit,
  }), [currentExercise.exerciseId, currentExercise.prescription.targetReps, currentExercise.prescription.rpe, weightUnit]); // eslint-disable-line react-hooks/exhaustive-deps
  const loadProfile = useMemo(() => getLoadProfile(currentExercise.exercise), [currentExercise.exerciseId]); // eslint-disable-line react-hooks/exhaustive-deps

  // First-time weight estimate (when no exercise history exists)
  const firstTimeEstimate: WeightEstimate | null = useMemo(() => {
    if (previousPerformance) return null; // has history, no need
    return estimateFirstTimeWeight(
      currentExercise.exercise,
      currentExercise.prescription.targetReps,
      baselineLifts,
      user?.bodyWeightKg,
      user?.sex,
      user?.experienceLevel,
      weightUnit,
    );
  }, [previousPerformance, currentExercise.exerciseId, baselineLifts, user?.bodyWeightKg, user?.sex, user?.experienceLevel, weightUnit]);

  const exerciseHistory = showHistory ? getExerciseFullHistory(currentExercise.exerciseId) : [];

  // Extended history for modal - gets last 10 sessions and computes all-time best
  const extendedHistory = useMemo(() => {
    if (!showHistoryModal) return { sessions: [], allTimeBest: null, bestE1RM: 0 };

    const allLogs: WorkoutLog[] = chrono(useAppStore.getState().workoutLogs);
    const sorted = [...allLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const sessions: { weight: number; reps: number; rpe: number; sets: number; date: Date; estimated1RM: number }[] = [];
    let allTimeBest: { weight: number; reps: number; date: Date; estimated1RM: number } | null = null;
    let bestE1RM = 0;

    for (const log of sorted) {
      const ex = log.exercises.find(e => e.exerciseId === currentLog.exerciseId);
      if (ex && ex.sets.length > 0) {
        const completedSets = ex.sets.filter(s => s.completed);
        if (completedSets.length === 0) continue;
        const bestSet = completedSets.reduce((best, s) => (s.weight > best.weight ? s : best), completedSets[0]);
        const e1RM = ex.estimated1RM || calculate1RM(bestSet.weight, bestSet.reps);

        // Track all-time best by estimated 1RM
        if (e1RM > bestE1RM) {
          bestE1RM = e1RM;
          allTimeBest = {
            weight: bestSet.weight,
            reps: bestSet.reps,
            date: new Date(log.date),
            estimated1RM: e1RM,
          };
        }

        if (sessions.length < 10) {
          sessions.push({
            weight: bestSet.weight,
            reps: bestSet.reps,
            rpe: bestSet.rpe,
            sets: completedSets.length,
            date: new Date(log.date),
            estimated1RM: e1RM,
          });
        }
      }
    }

    return { sessions, allTimeBest, bestE1RM };
  }, [showHistoryModal, currentLog.exerciseId]);

  // Get adjustment reason for this exercise's suggested weight
  const getAdjustmentReason = (): string | null => {
    if (!previousPerformance) return null;
    if (!previousPerformance.feedback) return `Based on last session: ${previousPerformance.weight} ${weightUnit}`;
    switch (previousPerformance.feedback.difficulty) {
      case 'too_easy':
        return `+5-10% — Last time was too easy (${previousPerformance.weight} ${weightUnit})`;
      case 'too_hard':
        return `Reduced — Last time was too hard (${previousPerformance.weight} ${weightUnit})`;
      case 'challenging':
        return `Small bump — Good challenge last time (${previousPerformance.weight} ${weightUnit})`;
      case 'just_right':
        return `Maintained — Last time felt right (${previousPerformance.weight} ${weightUnit})`;
      default:
        return null;
    }
  };

  const adjustmentReason = getAdjustmentReason();

  return (
    <div className="min-h-screen bg-grappler-900 bg-mesh pb-24 safe-area-top">
      {showFinisher && (() => {
        const heavyLowerSets = activeWorkout.session.exercises.reduce((n, ex, i) => {
          const lower = ex.exercise.movementPattern === 'squat' || ex.exercise.movementPattern === 'hinge';
          const done = activeWorkout.exerciseLogs[i]?.sets.filter(st => st.completed).length ?? 0;
          return n + (lower && ex.exercise.category === 'compound' ? done : 0);
        }, 0);
        const score = latestWhoopData?.recoveryScore ?? readiness?.score;
        return (
          <SprintTimer
            mode="finisher"
            recommendation={recommendFinisher({ readiness: typeof score === 'number' ? score : undefined, heavyLowerSets, ...finisherMatContext() })}
            onLogged={() => setFinisherLogged(true)}
            onClose={() => { setShowFinisher(false); setShowFinishModal(true); }}
          />
        );
      })()}

      {/* PR banner — informative, never blocks the next set */}
      <AnimatePresence>
        {prBanner && (
          <motion.div
            key="pr-banner"
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="fixed top-2 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md pointer-events-auto"
            role="status"
          >
            <button
              onClick={() => setPrBanner(null)}
              className="w-full flex items-center gap-3 rounded-xl border border-yellow-500/50 bg-grappler-900/95 backdrop-blur px-3 py-2 text-left shadow-lg"
            >
              <Trophy className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-yellow-300">New PR · {prBanner.name}</span>
                <span className="block text-xs text-yellow-400/80">
                  {prBanner.unit === 's' ? 'Longest hold' : 'Est. 1RM'} {Math.round(prBanner.from)} → {Math.round(prBanner.to)} {prBanner.unit}
                </span>
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Critical Readiness Interstitial */}
      <AnimatePresence>
        {showOverview && whoopReadiness && whoopReadiness.score < 30 && !criticalReadinessAcknowledged && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-grappler-900/95 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-grappler-800 border border-red-500/30 rounded-lg p-6 max-w-sm w-full space-y-4"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-lg font-bold text-grappler-50">Recovery is compromised</h2>
                <p className="text-sm text-grappler-400 mt-1">
                  Your readiness score is {whoopReadiness.score}%. Multiple recovery factors are low.
                </p>
              </div>
              <div className="space-y-1.5">
                {whoopReadiness.factors.map((f, i) => (
                  <p key={i} className="text-xs text-grappler-400">• {f}</p>
                ))}
              </div>
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => cancelWorkout()}
                  className="w-full btn btn-primary btn-md"
                >
                  Rest today
                </button>
                <button
                  onClick={() => setCriticalReadinessAcknowledged(true)}
                  className="w-full btn btn-ghost btn-sm text-grappler-500"
                >
                  I understand the risk — train anyway
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Workout Overview Modal */}
      <AnimatePresence mode="wait">
        {showOverview && (
          <WorkoutOverview
            cancelWorkout={cancelWorkout}
            showDraftRecovery={showDraftRecovery}
            setShowDraftRecovery={setShowDraftRecovery}
            setShowCancelConfirm={setShowCancelConfirm}
            activeWorkout={activeWorkout}
            totalSets={totalSets}
            setFeeling={setFeeling}
            feeling={feeling}
            setShowCheckInDetail={setShowCheckInDetail}
            showCheckInDetail={showCheckInDetail}
            setCheckIn={setCheckIn}
            checkIn={checkIn}
            latestWhoopData={latestWhoopData}
            whoopReadiness={whoopReadiness}
            whoopApplied={whoopApplied}
            preWhoopSnapshot={preWhoopSnapshot}
            applyWhoopAdjustment={applyWhoopAdjustment}
            setWhoopFollowed={setWhoopFollowed}
            setWhoopApplied={setWhoopApplied}
            whoopFollowed={whoopFollowed}
            showGrapplingQ={showGrapplingQ}
            setGrapplingToday={setGrapplingToday}
            setShowGrapplingQ={setShowGrapplingQ}
            setGrapplingReduction={setGrapplingReduction}
            grapplingToday={grapplingToday}
            grapplingReduction={grapplingReduction}
            activeEquipmentProfile={activeEquipmentProfile}
            showLocationConfirm={showLocationConfirm}
            adaptWorkoutToProfile={adaptWorkoutToProfile}
            setShowLocationConfirm={setShowLocationConfirm}
            hasActiveInjuries={hasActiveInjuries}
            injuryAdaptations={injuryAdaptations}
            undoMatAdjustment={undoMatAdjustment}
            throttleResult={throttleResult}
            throttleDismissed={throttleDismissed}
            setThrottleDismissed={setThrottleDismissed}
            user={user}
            trainingSessions={trainingSessions}
            warmUpProtocol={warmUpProtocol}
            setShowWarmUp={setShowWarmUp}
            showWarmUp={showWarmUp}
            supersetCandidates={supersetCandidates}
            hasPrimer={hasPrimer}
            handleAddPowerPrimer={handleAddPowerPrimer}
            getExerciseHistory={getExerciseHistory}
            setFormCheckExercise={setFormCheckExercise}
            setOverviewSwapIndex={setOverviewSwapIndex}
            weightUnit={weightUnit}
            submitPreCheckIn={submitPreCheckIn}
            markWorkoutOverviewDone={markWorkoutOverviewDone}
            setShowOverview={setShowOverview}
          />
        )}
      </AnimatePresence>

      {/* Inline Exercise Feedback is rendered in the main content area below */}

      {/* Form Check Video Modal (from exercise plan overview) */}
      {formCheckExercise && (
        <YouTubeEmbed
          exerciseName={formCheckExercise.name}
          videoUrl={formCheckExercise.videoUrl}
          onClose={() => setFormCheckExercise(null)}
        />
      )}

      {/* Overview Exercise Swap Modal — swap before starting workout */}
      <AnimatePresence>
        {overviewSwapIndex !== null && activeWorkout.session.exercises[overviewSwapIndex] && (
          <ExerciseSwapSheet
            currentExercise={activeWorkout.session.exercises[overviewSwapIndex].exercise}
            sessionExerciseIds={activeWorkout.session.exercises.map(e => e.exerciseId)}
            equipment={user?.equipment ?? 'full_gym'}
            availableEquipment={profileEquipment}
            weightUnit={weightUnit}
            getHistory={getAltHistory}
            onPick={(newExerciseId, newExerciseName) => {
              swapExercise(overviewSwapIndex, newExerciseId, newExerciseName);
              setOverviewSwapIndex(null);
              showToast(`Swapped to ${newExerciseName}`, 'success', { label: 'Undo', onClick: () => { undoSwap(); } });
            }}
            onClose={() => setOverviewSwapIndex(null)}
          />
        )}
      </AnimatePresence>

      {/* Exercise Swap Modal */}
      <AnimatePresence>
        {showSwapModal && (
          <ExerciseSwapSheet
            currentExercise={currentExercise.exercise}
            sessionExerciseIds={activeWorkout.session.exercises.map(e => e.exerciseId)}
            equipment={user?.equipment ?? 'full_gym'}
            availableEquipment={profileEquipment}
            weightUnit={weightUnit}
            getHistory={getAltHistory}
            onPick={handleSwapExercise}
            onClose={() => setShowSwapModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Add Exercise Modal */}
      <AnimatePresence>
        {showAddExerciseModal && (
          <AddExerciseModal
            addExerciseSearch={addExerciseSearch}
            setAddExerciseSearch={setAddExerciseSearch}
            setAddExerciseFilter={setAddExerciseFilter}
            addExerciseFilter={addExerciseFilter}
            addExerciseList={addExerciseList}
            addBonusExercise={addBonusExercise}
            setShowAddExerciseModal={setShowAddExerciseModal}
            setCurrentExerciseIndex={setCurrentExerciseIndex}
            activeWorkout={activeWorkout}
            setCurrentSetIndex={setCurrentSetIndex}
          />
        )}
      </AnimatePresence>

      {/* Enhanced Exercise History Modal */}
      <AnimatePresence>
        {showHistoryModal && <WorkoutHistoryModal setShowHistoryModal={setShowHistoryModal} currentExercise={currentExercise} extendedHistory={extendedHistory} weightUnit={weightUnit} />}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-grappler-900 border-b border-grappler-800 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            {/* Always confirm — a stray tap on X used to delete an unstarted workout. */}
            <button onClick={() => setShowCancelConfirm(true)} className="btn btn-ghost btn-sm" aria-label="Cancel workout">
              <X className="w-5 h-5" />
            </button>
            {/* Leave for now: everything (position, rest timer) is kept; resume from any tab. */}
            <button onClick={() => pauseWorkout()} className="btn btn-ghost btn-sm gap-1 text-grappler-300" aria-label="Leave workout for now">
              <ChevronDown className="w-5 h-5" />
              <span className="text-xs">Leave</span>
            </button>
          </div>
          <div className="text-center">
            <h1 className="font-bold text-grappler-50">{activeWorkout.session.name}</h1>
            <p className="text-xs text-grappler-400">
              <Timer className="w-3 h-3 inline mr-1" />
              {formatTime(Math.floor((Date.now() - new Date(activeWorkout.startTime).getTime()) / 60000))}
              {throttleResult ? (
                <span className={cn(
                  'ml-2 px-1.5 py-0.5 rounded text-xs font-medium',
                  throttleResult.config.level === 'peak' ? 'bg-emerald-500/20 text-emerald-400' :
                  throttleResult.config.level === 'green' ? 'bg-green-500/20 text-green-400' :
                  throttleResult.config.level === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                  throttleResult.config.level === 'orange' ? 'bg-orange-500/20 text-orange-400' :
                  'bg-red-500/20 text-red-400'
                )}>
                  {throttleResult.config.label}
                </span>
              ) : readiness && (
                <span className={cn(
                  'ml-2 px-1.5 py-0.5 rounded text-xs font-medium',
                  readiness.score >= 65 ? 'bg-green-500/20 text-green-400' :
                  readiness.score >= 35 ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                )}>
                  Readiness: {readiness.score}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => setShowFinishModal(true)}
            className="btn btn-primary btn-sm"
            aria-label="Finish workout"
          >
            <Save className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="progress-bar">
          <motion.div
            className="progress-bar-fill bg-gradient-to-r from-primary-500 to-accent-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-grappler-400 mt-1 text-center" data-testid="session-eta">
          {completedSets}/{totalSets} sets
          {eta.minutesLeft > 0 && (
            <span className={cn(eta.overBudget && 'text-amber-400')}>
              {' '}· ~{eta.minutesLeft} min left · done ~{eta.finishAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </p>
      </header>

      {/* Rest Timer — Full Overlay or Minimized Floating Bar */}
      <AnimatePresence>
        {isResting && !restMinimized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-overlay bg-grappler-950 flex flex-col items-center justify-center safe-area-top safe-area-bottom"
          >
            {/* Minimize button */}
            <button
              onClick={() => setRestMinimized(true)}
              className="absolute top-4 right-4 mt-[env(safe-area-inset-top)] flex items-center gap-1.5 px-3 py-2 rounded-xl bg-grappler-700/80 border border-grappler-600/50 text-grappler-200 hover:bg-grappler-600/80 active:scale-95 transition-all"
            >
              <ChevronDown className="w-4 h-4" />
              <span className="text-sm font-medium">Minimize</span>
            </button>

            <p className={cn(
              'text-sm font-medium mb-4 uppercase tracking-wider transition-colors',
              restTimer <= 10 && restTimer > 0 ? 'text-red-400' : 'text-grappler-400'
            )}>
              {restTimer <= 10 && restTimer > 0 ? 'Get Ready!' : 'Rest Time'}
            </p>
            {/* Circular ring timer */}
            <div className="relative w-52 h-52 mb-4">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 208 208">
                <circle cx="104" cy="104" r="96" fill="none" stroke="rgba(100,116,139,0.15)" strokeWidth="8" />
                <circle
                  cx="104" cy="104" r="96" fill="none"
                  strokeWidth="8" strokeLinecap="round"
                  className={cn(
                    'transition-colors',
                    restTimer <= 10 && restTimer > 0 ? 'stroke-red-400' : restTimer <= 30 && restTimer > 0 ? 'stroke-yellow-400' : 'stroke-primary-400'
                  )}
                  strokeDasharray={2 * Math.PI * 96}
                  strokeDashoffset={2 * Math.PI * 96 * (1 - restTimer / Math.max(restDuration, 1))}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.div
                  key={restTimer}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    'text-5xl font-black tabular-nums transition-colors',
                    restTimer <= 10 && restTimer > 0 ? 'text-red-400' : restTimer <= 30 && restTimer > 0 ? 'text-yellow-400' : 'text-primary-400'
                  )}
                >
                  {formatRestTime(restTimer)}
                </motion.div>
                <p className="text-xs text-grappler-400 mt-1">
                  of {Math.floor(restDuration / 60)}:{(restDuration % 60).toString().padStart(2, '0')}
                </p>
              </div>
            </div>

            {/* Core actions: skip + undo + stats */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm text-grappler-400">{completedSets}/{totalSets} sets</span>
              <span className="text-grappler-600">·</span>
              <span className="text-sm text-grappler-400">{totalVolumeCompleted.toLocaleString()} {weightUnit}</span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <button onClick={() => adjustRest(-15)} className="btn btn-secondary btn-md min-w-[64px]" aria-label="Rest 15 seconds less">−15s</button>
              <button onClick={() => adjustRest(15)} className="btn btn-secondary btn-md min-w-[64px]" aria-label="Rest 15 seconds more">+15s</button>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={skipRest} className="btn btn-secondary btn-lg px-8">
                Skip Rest
              </button>
              {undoInfo && (
                <button
                  onClick={undoLastSet}
                  className="btn btn-lg px-5 gap-2 bg-yellow-500/15 text-yellow-300 border border-yellow-500/40 hover:bg-yellow-500/25 active:scale-95 transition-transform"
                  title="Undo last set — revert the set you just logged"
                  aria-label="Undo last set"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span className="text-sm font-semibold">Undo</span>
                </button>
              )}
            </div>

            {/* What's next — one-line hint */}
            {!isLastSet && (
              <p className="mt-4 text-sm text-grappler-400 text-center">
                Next: Set {currentSetIndex + 1}/{currentLog.sets.length} · {formatTarget(currentExercise.prescription.targetReps, currentExercise.exercise)}
              </p>
            )}
            {isLastSet && !allExercisesDone && (
              <p className="mt-4 text-sm text-grappler-400 text-center">
                Next: {activeWorkout.session.exercises[currentExerciseIndex]?.exercise.name} · {activeWorkout.session.exercises[currentExerciseIndex]?.sets} sets
              </p>
            )}
            {allExercisesDone && (
              <div className="mt-4 text-center">
                <p className="text-sm font-medium text-green-400">
                  All exercises done — ready to finish!
                </p>
              </div>
            )}
            {isLastExercise && !allExercisesDone && hasIncompleteExercises && (
              <div className="mt-3 text-center">
                <p className="text-sm text-yellow-400">
                  Some exercises still have incomplete sets
                </p>
              </div>
            )}

            {/* Add Extra Set — always visible */}
            {lastCompletedExerciseIndex !== null && (
              <button
                onClick={() => addExtraSet(lastCompletedExerciseIndex)}
                className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Extra Set — {activeWorkout.exerciseLogs[lastCompletedExerciseIndex]?.exerciseName}
              </button>
            )}

            {/* ─── Tips & Suggestions toggle ─── */}
            {(weightSuggestion || rpeRegulation || coachMessages.length > 0 || showTip || (lastCompletedExerciseIndex !== null && !allExercisesDone)) && (
              <button
                onClick={() => setShowRestTips(v => !v)}
                className="mt-5 flex items-center gap-2 text-sm text-grappler-500 hover:text-grappler-300 transition-colors"
              >
                <Lightbulb className="w-4 h-4" />
                <span>{showRestTips ? 'Hide' : 'Show'} tips & suggestions</span>
                <motion.span animate={{ rotate: showRestTips ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="w-4 h-4" />
                </motion.span>
                {(weightSuggestion || rpeRegulation) && !showRestTips && (
                  <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
                )}
              </button>
            )}

            <AnimatePresence>
              {showRestTips && (
                <RestTipsPanel
                  weightSuggestion={weightSuggestion}
                  setExactValue={setExactValue}
                  setWeightSuggestion={setWeightSuggestion}
                  weightUnit={weightUnit}
                  rpeRegulation={rpeRegulation}
                  setRpeRegulation={setRpeRegulation}
                  lastCompletedExerciseIndex={lastCompletedExerciseIndex}
                  allExercisesDone={allExercisesDone}
                  activeWorkout={activeWorkout}
                  currentExerciseIndex={currentExerciseIndex}
                  setShowSwapModal={setShowSwapModal}
                  coachMessages={coachMessages}
                  setCoachMessages={setCoachMessages}
                  showTip={showTip}
                  tip={tip}
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimized Rest Timer — subtle floating pill */}
      <AnimatePresence>
        {isResting && restMinimized && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-grappler-900/95 backdrop-blur-lg border-t border-grappler-700 px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl shadow-black/40"
            role="region"
            aria-label="Rest timer"
          >
            {/* Row 1 — time + controls. The logger above stays usable during rest. */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRestMinimized(false)}
                className="flex items-baseline gap-1.5 min-w-[92px] text-left"
                aria-label="Expand rest timer"
              >
                <span className={cn(
                  'text-3xl font-black tabular-nums',
                  restTimer <= 10 ? 'text-red-400' : restTimer <= 30 ? 'text-yellow-400' : 'text-grappler-50',
                )}>
                  {Math.floor(restTimer / 60)}:{String(restTimer % 60).padStart(2, '0')}
                </span>
                <span className="text-xs text-grappler-400">{restTimer <= 10 ? 'Go' : 'rest'}</span>
              </button>
              <button onClick={() => adjustRest(-15)} className="btn btn-secondary btn-sm min-h-[44px] min-w-[52px]" aria-label="Rest 15 seconds less">−15</button>
              <button onClick={() => adjustRest(15)} className="btn btn-secondary btn-sm min-h-[44px] min-w-[52px]" aria-label="Rest 15 seconds more">+15</button>
              <button onClick={skipRest} className="btn btn-primary btn-sm min-h-[44px] flex-1" aria-label="Skip Rest">Skip</button>
            </div>

            {/* Row 2 — rate the set you just did (one tap, half steps) */}
            {undoInfo && activeWorkout.exerciseLogs[undoInfo.exerciseIndex]?.sets[undoInfo.setIndex] && (() => {
              const done = activeWorkout.exerciseLogs[undoInfo.exerciseIndex].sets[undoInfo.setIndex];
              const rated = done.rpeSource === 'user' ? done.rpe : null;
              return (
                <div className="mt-2">
                  <p className="text-[11px] text-grappler-400 mb-1">How hard was that set? <span className="text-grappler-500">(RPE)</span></p>
                  <div className="flex gap-1">
                    {[7, 7.5, 8, 8.5, 9, 9.5, 10].map(v => (
                      <button
                        key={v}
                        onClick={() => {
                          const log = activeWorkout.exerciseLogs[undoInfo.exerciseIndex];
                          updateExerciseLog(undoInfo.exerciseIndex, {
                            ...log,
                            sets: log.sets.map((st, i) => i === undoInfo.setIndex ? { ...st, rpe: v, rpeSource: 'user' as const } : st),
                          });
                        }}
                        className={cn(
                          'flex-1 min-h-[40px] rounded-lg text-sm font-bold tabular-nums transition-colors',
                          rated === v ? 'bg-primary-500 text-white' : 'bg-grappler-800 text-grappler-300 active:bg-grappler-700',
                        )}
                        aria-label={`Rate last set RPE ${v}`}
                        aria-pressed={rated === v}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Row 3 — what's next, with plates */}
            {!allExercisesDone && currentSet && !currentSet.completed && (
              <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                <p className="text-grappler-300 truncate">
                  <span className="text-grappler-500">Next:</span>{' '}
                  {currentExercise.exercise.name} · set {currentSetIndex + 1}/{currentLog.sets.length} ·{' '}
                  <span className="text-grappler-100 font-semibold">
                    {currentSet.weight > 0 ? `${formatLoad(currentSet.weight, loadProfile, weightUnit)} × ` : ''}
                    {formatTarget(currentExercise.prescription.targetReps, currentExercise.exercise)}
                  </span>
                </p>
              </div>
            )}
            {!allExercisesDone && currentSet && !currentSet.completed && loadProfile.implement === 'barbell' && currentSet.weight > 0 && (
              <div className="mt-1">
                <MiniPlateCalc weight={currentSet.weight} unit={weightUnit} />
              </div>
            )}
            {allExercisesDone && (
              <p className="mt-2 text-xs font-medium text-green-400">All sets done — finish when you&apos;re ready.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="p-4 pb-40">
        {/* Inline Exercise Feedback Bar */}
        <AnimatePresence>
          {inlineFeedbackIndex !== null && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 bg-grappler-800/80 backdrop-blur rounded-xl p-3 border border-grappler-700/50"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-grappler-300">
                  How was <span className="font-medium text-grappler-100">{activeWorkout.exerciseLogs[inlineFeedbackIndex]?.exerciseName}</span>?
                </p>
                <button
                  onClick={() => setInlineFeedbackIndex(null)}
                  className="text-grappler-500 hover:text-grappler-300"
                  aria-label="Dismiss exercise feedback"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => submitInlineFeedback('too_easy', false)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                >
                  Too Easy
                </button>
                <button
                  onClick={() => submitInlineFeedback('just_right', false)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                >
                  Just Right
                </button>
                <button
                  onClick={() => submitInlineFeedback('too_hard', false)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  Too Hard
                </button>
                <button
                  onClick={() => submitInlineFeedback('just_right', true)}
                  className="py-2 px-3 rounded-lg text-xs font-medium bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
                  title="Pain during this exercise"
                  aria-label="Report pain during this exercise"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Weight Suggestion Banner */}
        <AnimatePresence>
          {weightSuggestion && !isResting && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 bg-primary-500/10 border border-primary-500/30 rounded-xl p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-2 flex-1">
                <TrendingUp className="w-4 h-4 text-primary-400 flex-shrink-0" />
                <p className="text-xs text-primary-300">{weightSuggestion.message}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <button
                  onClick={() => {
                    setExactValue('weight', weightSuggestion.suggestedWeight);
                    setWeightSuggestion(null);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-500 text-white"
                >
                  {weightSuggestion.suggestedWeight} {weightUnit}
                </button>
                <button
                  onClick={() => setWeightSuggestion(null)}
                  className="text-grappler-500 hover:text-grappler-300"
                  aria-label="Dismiss weight suggestion"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Exercise Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              if (currentExerciseIndex > 0) {
                goToExercise(currentExerciseIndex - 1);
              }
            }}
            disabled={currentExerciseIndex === 0}
            className="btn btn-ghost btn-sm"
            aria-label="Previous exercise"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <p className="text-sm text-grappler-400">
              Exercise {currentExerciseIndex + 1} of {activeWorkout.session.exercises.length}
            </p>
            <button
              onClick={() => {
                setAddExerciseSearch('');
                setAddExerciseFilter('all');
                setShowAddExerciseModal(true);
              }}
              className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 flex items-center justify-center transition-colors"
              title="Add exercise"
              aria-label="Add exercise"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            {!hasPrimer && (
              <button
                onClick={handleAddPowerPrimer}
                className="h-6 px-2 rounded-full bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 flex items-center gap-1 text-xs font-semibold transition-colors"
                title="Add power primer"
                aria-label="Add power primer"
              >
                <Zap className="w-3 h-3" /> Primer
              </button>
            )}
          </div>
          <button
            onClick={() => {
              if (currentExerciseIndex < activeWorkout.session.exercises.length - 1) {
                goToExercise(currentExerciseIndex + 1);
              }
            }}
            disabled={currentExerciseIndex === activeWorkout.session.exercises.length - 1}
            className="btn btn-ghost btn-sm"
            aria-label="Next exercise"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Exercise Jump Pills — horizontal scrollable exercise picker */}
        {activeWorkout.session.exercises.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
            {activeWorkout.session.exercises.map((ex, i) => {
              const log = activeWorkout.exerciseLogs[i];
              const completedSetsCount = log?.sets.filter(s => s.completed).length ?? 0;
              const totalSetsCount = log?.sets.length ?? ex.sets;
              const resolvedCount = log?.sets.filter(s => s.completed || s.skipped).length ?? 0;
              const allDone = resolvedCount === totalSetsCount && totalSetsCount > 0;
              return (
                <button
                  key={i}
                  onClick={() => goToExercise(i)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all active:scale-95',
                    i === currentExerciseIndex
                      ? 'bg-primary-500/20 text-primary-400 border border-primary-500/40'
                      : allDone
                      ? 'bg-green-500/10 text-green-400/80 border border-green-500/20'
                      : 'bg-grappler-800/50 text-grappler-400 border border-grappler-700/30'
                  )}
                >
                  {allDone && <Check className="w-3 h-3" />}
                  <span className="max-w-[120px] truncate">{ex.exercise.name}</span>
                  <span className="text-[11px] opacity-60">{completedSetsCount}/{totalSetsCount}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Exercise Card — swipe left/right to change exercise */}
        <div className="relative">
          {showSwipeHint && (
            <div
              className="fixed inset-x-0 bottom-28 flex items-center justify-center z-40 pointer-events-none"
            >
              <div
                onClick={() => { setShowSwipeHint(false); localStorage.setItem('hasSeenSwipeHint', 'true'); }}
                className="pointer-events-auto bg-grappler-800/90 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg border border-grappler-700/50">
                <ArrowLeftRight className="w-5 h-5 text-primary-400" />
                <span className="text-sm text-grappler-200">Swipe left/right to navigate exercises</span>
              </div>
            </div>
          )}
        <motion.div
          key={currentExerciseIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card p-4 mb-4"
          {...swipeHandlers}
        >
          <div className="text-center mb-2">
            <div className="flex items-center justify-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-grappler-50">
                {currentExercise.exercise.name}
              </h2>
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              {currentExercise.exercise.videoUrl && (
                <a
                  href={currentExercise.exercise.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 flex items-center justify-center transition-all text-red-400"
                  title="Form Video"
                >
                  <Video className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                onClick={() => setShowSwapModal(true)}
                className="w-10 h-10 rounded-full bg-grappler-800 hover:bg-grappler-700 border border-grappler-700 flex items-center justify-center transition-all text-grappler-400 hover:text-primary-400"
                title="Swap Exercise"
                aria-label="Swap exercise"
              >
                <Shuffle className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleSkipExercise}
                className="w-10 h-10 rounded-full bg-grappler-800 hover:bg-grappler-700 border border-grappler-700 flex items-center justify-center transition-all text-grappler-400 hover:text-blue-400"
                title="Skip"
                aria-label="Skip exercise"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-sm text-grappler-300">
                {currentExercise.sets} sets × {formatTarget(currentExercise.prescription.targetReps, currentExercise.exercise)}{currentExercise.exercise.isUnilateral ? ' /side' : ''}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-primary-500/15 text-sm font-semibold text-primary-400">
                RPE {currentExercise.prescription.rpe}
              </span>
              {currentExercise.prescription.percentageOf1RM && (
                <span className="text-sm text-primary-400">~{prescribedPercentOf1RM(currentExercise.prescription.targetReps, currentExercise.prescription.rpe)}% 1RM</span>
              )}
              {currentExercise.prescription.tempo && (
                <button
                  onClick={!tempoState ? startTempo : stopTempoMetronome}
                  className={cn(
                    'text-sm px-2 py-0.5 rounded-md transition-colors',
                    tempoState
                      ? 'bg-primary-500/20 text-primary-400 animate-pulse'
                      : 'text-grappler-400 bg-grappler-700/50 hover:bg-grappler-700'
                  )}
                >
                  {tempoState ? '⏱ Tempo Running' : `Tempo: ${currentExercise.prescription.tempo}`}
                </button>
              )}
            </div>
            <p className="text-xs text-grappler-400 mt-0.5">
              {Math.floor(currentExercise.prescription.restSeconds / 60)}:{(currentExercise.prescription.restSeconds % 60).toString().padStart(2, '0')} rest
            </p>

            {/* Sticky setup note (seat 4, neutral grip, belt) — follows the exercise */}
            {noteDraft !== null ? (
              <form
                className="mt-1.5 flex items-center gap-2"
                onSubmit={e => { e.preventDefault(); setExerciseNote(currentExercise.exerciseId, noteDraft); setNoteDraft(null); }}
              >
                <input
                  autoFocus
                  value={noteDraft}
                  onChange={e => setNoteDraft(e.target.value)}
                  onBlur={() => { setExerciseNote(currentExercise.exerciseId, noteDraft); setNoteDraft(null); }}
                  maxLength={200}
                  placeholder="Seat 4 · neutral grip · belt on last set"
                  aria-label="Exercise setup note"
                  className="input flex-1 text-xs py-1.5"
                />
              </form>
            ) : (
              <button
                onClick={() => setNoteDraft(exerciseNotes?.notes?.[currentExercise.exerciseId] ?? '')}
                className="mt-1 flex items-center gap-1 text-xs text-left min-h-[32px]"
                aria-label={exerciseNotes?.notes?.[currentExercise.exerciseId] ? 'Edit setup note' : 'Add setup note'}
              >
                <StickyNote className="w-3 h-3 flex-shrink-0 text-amber-400/80" />
                {exerciseNotes?.notes?.[currentExercise.exerciseId]
                  ? <span className="text-amber-200/90">{exerciseNotes.notes[currentExercise.exerciseId]}</span>
                  : <span className="text-grappler-500">Add setup note</span>}
              </button>
            )}

            {/* Compact weight suggestion + last session (merged into one row) */}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {nextLoad && nextLoad.weight > 0 && (
                <button
                  onClick={() => setExactValue('weight', nextLoad.weight)}
                  className="flex items-start gap-1.5 px-2.5 py-1 bg-primary-500/10 border border-primary-500/30 rounded-lg text-xs text-left transition-colors hover:bg-primary-500/20 active:scale-95 w-full"
                  aria-label={`Use suggested ${formatLoad(nextLoad.weight, nextLoad.profile, weightUnit)}`}
                >
                  <Lightbulb className="w-3 h-3 text-primary-400 mt-0.5 flex-shrink-0" />
                  <span>
                    <span className="text-primary-300 font-semibold">{formatLoad(nextLoad.weight, nextLoad.profile, weightUnit)}</span>
                    <span className="text-grappler-400"> · {nextLoad.reason}</span>
                  </span>
                </button>
              )}
              {previousPerformance && (
                <span className="text-xs text-grappler-400">
                  Last: {previousPerformance.weight}{weightUnit} × {previousPerformance.reps} @ RPE {previousPerformance.rpe}
                </span>
              )}
              <button
                onClick={() => setShowHistoryModal(true)}
                className="text-xs text-primary-400/70 hover:text-primary-400 flex items-center gap-0.5 transition-colors ml-auto"
              >
                <TrendingUp className="w-3 h-3" />
                History
              </button>
            </div>

            {/* Full exercise history panel — removed inline, use modal via History button */}
            <AnimatePresence>
              {false && showHistory && exerciseHistory.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-2 overflow-hidden"
                >
                  <div className="bg-grappler-800/40 rounded-lg p-3 space-y-2">
                    <p className="text-xs text-grappler-400 uppercase tracking-wide font-medium">Last {exerciseHistory.length} sessions</p>
                    {exerciseHistory.map((h, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-grappler-500">
                          {h.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-grappler-200 font-medium">
                          {h.weight} {weightUnit} x {h.reps}
                        </span>
                        <span className="text-grappler-400">
                          {h.sets}s @ RPE {h.rpe}
                        </span>
                        {h.estimated1RM && h.estimated1RM > 0 && (
                          <span className="text-grappler-500">e1RM: {Math.round(h.estimated1RM)}</span>
                        )}
                        {h.feedback && (
                          <span className={cn(
                            'text-xs px-1.5 py-0.5 rounded',
                            h.feedback.difficulty === 'too_easy' && 'bg-green-500/20 text-green-400',
                            h.feedback.difficulty === 'just_right' && 'bg-blue-500/20 text-blue-400',
                            h.feedback.difficulty === 'challenging' && 'bg-yellow-500/20 text-yellow-400',
                            h.feedback.difficulty === 'too_hard' && 'bg-red-500/20 text-red-400',
                          )}>
                            {h.feedback.difficulty === 'too_easy' ? 'Easy' :
                             h.feedback.difficulty === 'just_right' ? 'Right' :
                             h.feedback.difficulty === 'challenging' ? 'Hard' :
                             h.feedback.difficulty === 'too_hard' ? 'Too hard' : ''}
                          </span>
                        )}
                      </div>
                    ))}
                    {exerciseHistory.length >= 2 && (
                      <div className="pt-1 border-t border-grappler-700/50">
                        <p className="text-xs text-grappler-400">
                          {exerciseHistory[0].weight > exerciseHistory[exerciseHistory.length - 1].weight
                            ? `↑ +${exerciseHistory[0].weight - exerciseHistory[exerciseHistory.length - 1].weight} ${weightUnit} over ${exerciseHistory.length} sessions`
                            : exerciseHistory[0].weight < exerciseHistory[exerciseHistory.length - 1].weight
                            ? `↓ ${exerciseHistory[0].weight - exerciseHistory[exerciseHistory.length - 1].weight} ${weightUnit} over ${exerciseHistory.length} sessions`
                            : `→ Maintained ${exerciseHistory[0].weight} ${weightUnit} over ${exerciseHistory.length} sessions`}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* First-time weight estimate or generic hint */}
            {!previousPerformance && currentLog.sets[0]?.weight === 0 && (
              firstTimeEstimate ? (
                <div className="mt-2 px-3 py-2 bg-primary-500/10 border border-primary-500/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-primary-400 font-medium flex items-center gap-1">
                      <Dumbbell className="w-3 h-3" />
                      Estimated: {firstTimeEstimate.weight} {weightUnit}
                      <span className={cn(
                        'ml-1 px-1.5 py-0.5 rounded-full text-xs font-medium',
                        firstTimeEstimate.confidence === 'high' && 'bg-green-500/20 text-green-400',
                        firstTimeEstimate.confidence === 'medium' && 'bg-yellow-500/20 text-yellow-400',
                        firstTimeEstimate.confidence === 'low' && 'bg-blue-500/20 text-blue-400',
                      )}>
                        {firstTimeEstimate.confidence}
                      </span>
                    </p>
                    <button
                      onClick={() => setExactValue('weight', firstTimeEstimate.weight)}
                      className="text-xs text-primary-400 bg-primary-500/20 px-2 py-0.5 rounded-full hover:bg-primary-500/30 transition-colors"
                    >
                      Use
                    </button>
                  </div>
                  <p className="text-xs text-grappler-400 mt-0.5">{firstTimeEstimate.source}</p>
                </div>
              ) : (
                <div className="mt-2 px-3 py-1.5 bg-grappler-800/60 rounded-lg">
                  <p className="text-xs text-grappler-400">
                    No history yet. Start with a weight you can handle for {formatTarget(currentExercise.prescription.targetReps, currentExercise.exercise)}
                    with {+(10 - currentExercise.prescription.rpe).toFixed(1)} reps left in reserve.
                    {currentExercise.prescription.rpe <= 7 && ' This should feel moderate.'}
                    {currentExercise.prescription.rpe === 8 && ' This should be challenging but doable.'}
                    {currentExercise.prescription.rpe >= 9 && ' This should be near your limit.'}
                  </p>
                </div>
              )
            )}

            {/* Adjustment transparency */}
            {adjustmentReason && (
              <div className="mt-1.5 flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3 text-primary-400" />
                <p className="text-xs text-primary-400">{adjustmentReason}</p>
              </div>
            )}
          </div>

          {/* Warm-up ramp — first set of a compound lift, before anything is logged.
              Warm-ups are not logged as sets (they don't count as training volume). */}
          {currentSetIndex === 0 && !currentLog.sets.some(st => st.completed) && currentExercise.exercise.category === 'compound' && !isTimeBased && !isDistance && (() => {
            const working = currentSet.weight || nextLoad?.weight || 0;
            const ramp = warmupRamp(working, currentExercise.prescription.targetReps, loadProfile, weightUnit);
            if (ramp.length === 0) return null;
            const ticked = warmupDone[currentLog.exerciseId] ?? [];
            return (
              <div className="mb-3 rounded-xl border border-grappler-700 bg-grappler-800/40">
                <button
                  onClick={() => setWarmupOpen(o => !o)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs"
                  aria-expanded={warmupOpen}
                >
                  <span className="text-grappler-300 font-medium">
                    Warm-up ramp to {formatLoad(working, loadProfile, weightUnit)}
                    <span className="text-grappler-500 font-normal"> · {ramp.length} sets{ticked.length ? `, ${ticked.length} done` : ''}</span>
                  </span>
                  <ChevronDown className={cn('w-3.5 h-3.5 text-grappler-400 transition-transform', warmupOpen && 'rotate-180')} />
                </button>
                {warmupOpen && (
                  <div className="flex flex-wrap gap-2 px-3 pb-3">
                    {ramp.map((st, i) => {
                      const on = ticked.includes(i);
                      return (
                        <button
                          key={i}
                          onClick={() => setWarmupDone(prev => ({
                            ...prev,
                            [currentLog.exerciseId]: on ? ticked.filter(x => x !== i) : [...ticked, i],
                          }))}
                          aria-pressed={on}
                          className={cn(
                            'min-h-[44px] px-3 rounded-lg text-xs font-semibold border transition-colors',
                            on ? 'bg-green-500/15 border-green-500/40 text-green-400' : 'bg-grappler-800 border-grappler-700 text-grappler-300',
                          )}
                        >
                          {on && <Check className="w-3 h-3 inline mr-1" />}
                          {formatLoad(st.weight, loadProfile, weightUnit)} × {st.reps}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Set Indicator */}
          <div className="flex justify-center gap-2.5 mb-2">
            {currentLog.sets.map((set, i) => (
              <button
                key={i}
                onClick={() => setCurrentSetIndex(i)}
                aria-label={`Set ${i + 1}${set.completed ? ` (done: ${set.weight} × ${set.reps}) — tap to edit` : set.skipped ? ' (skipped)' : ''}`}
                aria-current={i === currentSetIndex ? 'step' : undefined}
                className={cn(
                  'w-11 h-11 rounded-xl font-semibold text-sm transition-all active:scale-95',
                  i === currentSetIndex
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                    : set.completed
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-grappler-700 text-grappler-400'
                )}
              >
                {set.completed ? <Check className="w-5 h-5 mx-auto" /> : i + 1}
              </button>
            ))}
          </div>
          {/* Set count edits — add one more / remove this one */}
          <div className="flex justify-center gap-4 mb-1 -mt-1">
            <button
              onClick={() => addExtraSet(currentExerciseIndex)}
              className="min-h-[36px] px-2 text-xs text-grappler-400 hover:text-grappler-200 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add set
            </button>
            {currentLog.sets.length > 1 && (
              <button
                onClick={removeCurrentSet}
                className="min-h-[36px] px-2 text-xs text-grappler-500 hover:text-red-400 flex items-center gap-1"
                aria-label={`Remove set ${currentSetIndex + 1}`}
              >
                <Trash2 className="w-3 h-3" /> Remove set {currentSetIndex + 1}
              </button>
            )}
          </div>

          {/* This set: last time vs today's target */}
          {(() => {
            const last = previousSetHistory[currentSetIndex] ?? previousSetHistory[previousSetHistory.length - 1];
            const fmtLast = last
              ? isTimeBased ? `${last.duration ?? 0}s` : `${formatLoad(last.weight, loadProfile, weightUnit)} × ${last.reps}${isDistance ? ' m' : ''}${last.rpe ? ` @${last.rpe}` : ''}`
              : null;
            // Today's load: the engine's suggestion, else what you just did this session.
            const prevDone = [...currentLog.sets.slice(0, currentSetIndex)].reverse().find(st => st.completed && st.weight > 0);
            const targetW = !isTimeBased && !isDistance ? (nextLoad?.weight || prevDone?.weight || 0) : 0;
            const unitSfx = isTimeBased ? 's' : isDistance ? ' m' : '';
            const fmtToday = targetW > 0
              ? `${formatLoad(targetW, loadProfile, weightUnit)} × ${currentExercise.prescription.targetReps}`
              : `${currentExercise.prescription.targetReps}${unitSfx}`;
            return (
              <div className="mb-5 flex items-center justify-center gap-3 text-xs" data-testid="set-compare">
                <span className="text-grappler-400">
                  Last: <span className="text-grappler-200 font-medium">{fmtLast ?? '—'}</span>
                </span>
                <span className="text-grappler-600">→</span>
                <span className="text-grappler-400">
                  Today: <span className="text-primary-300 font-medium">{fmtToday}</span>
                  {!isTimeBased && !isDistance && <span className="text-grappler-500"> @{currentExercise.prescription.rpe}</span>}
                </span>
              </div>
            );
          })()}

          {/* PR hint — "PR territory" when the entered set beats the best, else what would */}
          {!currentSet.completed && prDetection.hasHistory && !isDistance && (() => {
            if (prDetection.isPotentialPR) {
              return (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-yellow-500/50 bg-yellow-500/10 px-3 py-2">
                  <Trophy className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <p className="text-xs text-yellow-300">
                    <span className="font-bold">PR territory</span> — {isTimeBased
                      ? `${prDetection.currentE1RM}s beats your ${prDetection.bestE1RM}s`
                      : `est. 1RM ${Math.round(prDetection.currentE1RM)} vs best ${Math.round(prDetection.bestE1RM)} ${weightUnit}`}
                  </p>
                </div>
              );
            }
            const w = currentSet.weight || nextLoad?.weight || 0;
            const r = !isTimeBased ? repsToBeat(w, prDetection.bestE1RM) : null;
            const hint = isTimeBased
              ? `Hold ${prDetection.bestE1RM + 1}s+ for a PR`
              : r ? `${formatLoad(w, loadProfile, weightUnit)} × ${r} would be a PR` : null;
            return hint ? (
              <p className="mb-3 text-center text-xs text-grappler-400 flex items-center justify-center gap-1">
                <Trophy className="w-3 h-3 text-yellow-500/70" /> {hint}
              </p>
            ) : null;
          })()}

          {/* Quick Complete — one-tap when values are pre-populated */}
          {!currentSet.completed && currentSet.weight > 0 && currentSet.reps > 0 && (
            <button
              onClick={completeSet}
              className="w-full mb-4 py-4 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-lg flex items-center justify-center gap-3 active:scale-[0.97] transition-transform shadow-lg shadow-green-500/20"
            >
              <Check className="w-6 h-6" />
              <span>
                {currentSet.weight}{weightUnit} × {currentSet.reps}
                {currentSet.rpe ? ` @ RPE ${currentSet.rpe}` : ''}
              </span>
            </button>
          )}

          {/* Repeat Last Set shortcut */}
          {currentSetIndex > 0 && !currentSet.completed && currentSet.weight === 0 && currentSet.reps === 0 && (() => {
            const prevSet = currentLog.sets[currentSetIndex - 1];
            return prevSet?.completed ? (
              <button
                onClick={() => {
                  setExactValue('weight', prevSet.weight);
                  setExactValue('reps', prevSet.reps);
                  if (prevSet.rpe) setExactValue('rpe', prevSet.rpe);
                }}
                className="w-full mb-4 py-3 rounded-xl bg-primary-500/15 border border-primary-500/30 text-primary-400 font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <RotateCcw className="w-4 h-4" />
                Repeat last set ({prevSet.weight}{weightUnit} × {prevSet.reps})
              </button>
            ) : null;
          })()}

          {/* Input Fields */}
          <div ref={activeSetRef} className="space-y-4">
            {/* Weight */}
            <div className={cn(
              'rounded-xl p-4 transition-all duration-300',
              prDetection.isPotentialPR && currentSet.weight > 0 && currentSet.reps > 0 && !currentSet.completed
                ? 'bg-yellow-500/10 border-2 border-yellow-500/50 shadow-lg shadow-yellow-500/10'
                : 'bg-grappler-800/50'
            )}>
              <div className="flex items-center justify-between">
                <label className={cn(
                  'text-xs uppercase tracking-wide',
                  prDetection.isPotentialPR && currentSet.weight > 0 && currentSet.reps > 0 && !currentSet.completed
                    ? 'text-yellow-400'
                    : 'text-grappler-400'
                )}>{loadProfile.count === 2 ? `Per hand (${weightUnit}) · 2 ${loadProfile.implement === 'kettlebell' ? 'bells' : 'dumbbells'}` : `Weight (${weightUnit})`}</label>
                {currentSet.weight > 0 && previousPerformance && (
                  <span className="text-xs text-primary-400">
                    {currentSet.weight > previousPerformance.weight ? '+' : ''}{Math.round(currentSet.weight - previousPerformance.weight)} vs last
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-2">
                <button
                  onClick={() => setExactValue('weight', stepWeight(currentSet.weight, loadProfile, weightUnit, -1))}
                  className="w-14 h-14 rounded-xl bg-grappler-700 flex items-center justify-center active:scale-95 transition-transform"
                  aria-label="Decrease weight"
                >
                  <Minus className="w-6 h-6 text-grappler-300" />
                </button>
                <BufferedNumberInput
                  key={`w-${currentExerciseIndex}-${currentSetIndex}`}
                  value={currentSet.weight}
                  onCommit={(v) => setExactValue('weight', v)}
                  kind="float"
                  placeholder="0"
                  ariaLabel="Weight"
                  className={cn(
                    'w-28 text-center text-4xl font-black bg-transparent focus-visible:outline-none placeholder:text-grappler-600',
                    prDetection.isPotentialPR && currentSet.weight > 0 && currentSet.reps > 0 && !currentSet.completed
                      ? 'text-yellow-300'
                      : 'text-grappler-50'
                  )}
                />
                <button
                  onClick={() => setExactValue('weight', stepWeight(currentSet.weight, loadProfile, weightUnit, 1))}
                  className="w-14 h-14 rounded-xl bg-grappler-700 flex items-center justify-center active:scale-95 transition-transform"
                  aria-label="Increase weight"
                >
                  <Plus className="w-6 h-6 text-grappler-300" />
                </button>
              </div>
              {/* Quick-adjust — real steps for this implement (plate pairs, next
                  dumbbell / bell size), not a generic +2.5/+25 */}
              {(() => {
                const opts = quickAdjustOptions(currentSet.weight, loadProfile, weightUnit);
                if (opts.length === 0) return null;
                const sized = loadProfile.implement === 'dumbbell' || loadProfile.implement === 'kettlebell' || loadProfile.implement === 'plate';
                return (
                  <div className="flex items-center justify-center gap-2 mt-2">
                    {opts.map(o => (
                      <button
                        key={o.label}
                        onClick={() => setExactValue('weight', o.value)}
                        aria-label={`Set weight to ${o.value} ${weightUnit}`}
                        className={cn(
                          'min-w-[44px] px-3 py-2.5 rounded-lg text-xs font-semibold active:scale-95 transition-transform',
                          sized || o.label.startsWith('+') ? 'bg-grappler-700/60 text-grappler-300' : 'bg-grappler-800 text-grappler-400',
                        )}
                      >
                        {sized ? `${o.value}` : o.label}
                      </button>
                    ))}
                  </div>
                );
              })()}
              {/* Plate breakdown — only shown for barbell exercises.
                  Landmine variations load one end only (single-sided). */}
              {currentSet.weight > 0 && !isTimeBased && currentExercise.exercise.equipmentTypes?.includes('barbell') && (
                <MiniPlateCalc
                  weight={currentSet.weight}
                  unit={weightUnit}
                  singleSided={currentExercise.exercise.equipmentTypes?.includes('landmine')}
                />
              )}
            </div>

            {/* Reps / Seconds */}
            {(() => {
              const field: 'reps' | 'duration' = isTimeBased ? 'duration' : 'reps';
              const currentValue = isTimeBased ? (currentSet.duration || 0) : currentSet.reps;
              const suggested = currentExercise.prescription.targetReps;
              const showSuggestionPill = suggested > 0 && currentValue !== suggested;
              const increments = isTimeBased ? [5, 10, 30] : isDistance ? [5, 10, 20] : [1, 2, 5];
              const unitLabel = isTimeBased ? 'Seconds' : isDistance ? 'Metres' : 'Reps';
              const prHighlight = prDetection.isPotentialPR
                && (isTimeBased ? currentValue > 0 : (currentSet.weight > 0 && currentSet.reps > 0))
                && !currentSet.completed;
              return (
                <div className={cn(
                  'rounded-xl p-4 transition-all duration-300',
                  prHighlight
                    ? 'bg-yellow-500/10 border-2 border-yellow-500/50 shadow-lg shadow-yellow-500/10'
                    : 'bg-grappler-800/50'
                )}>
                  <div className="flex items-center justify-between">
                    <label className={cn(
                      'text-xs uppercase tracking-wide',
                      prHighlight ? 'text-yellow-400' : 'text-grappler-400'
                    )}>{unitLabel}</label>
                    {/* Prominent suggestion badge */}
                    <button
                      type="button"
                      onClick={() => setExactValue(field, suggested)}
                      disabled={!showSuggestionPill}
                      className={cn(
                        'text-xs font-bold px-2.5 py-1 rounded-full transition-all',
                        showSuggestionPill
                          ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40 hover:bg-primary-500/30 active:scale-95'
                          : 'bg-grappler-700/40 text-grappler-500 border border-grappler-700 cursor-default',
                      )}
                      title={showSuggestionPill ? 'Tap to use suggestion' : 'Matches suggestion'}
                    >
                      {showSuggestionPill ? 'Use ' : 'Target '}
                      {isTimeBased
                        ? `${suggested}s`
                        : isDistance
                        ? `${suggested} m`
                        : `${currentExercise.prescription.minReps}-${currentExercise.prescription.maxReps}${currentExercise.exercise.isUnilateral ? ' /side' : ''}`}
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <button
                      onClick={() => updateSetValue(field, -(isTimeBased || isDistance ? 5 : 1))}
                      className="w-14 h-14 rounded-xl bg-grappler-700 flex items-center justify-center active:scale-95 transition-transform"
                      aria-label={`Decrease ${unitLabel.toLowerCase()}`}
                    >
                      <Minus className="w-6 h-6 text-grappler-300" />
                    </button>
                    <BufferedNumberInput
                      key={`r-${currentExerciseIndex}-${currentSetIndex}`}
                      value={currentValue}
                      onCommit={(v) => setExactValue(field, v)}
                      kind="int"
                      placeholder={isTimeBased ? `${suggested}` : '0'}
                      ariaLabel={unitLabel}
                      className={cn(
                        'w-28 text-center text-4xl font-black bg-transparent focus-visible:outline-none placeholder:text-grappler-600',
                        prHighlight ? 'text-yellow-300' : 'text-grappler-50'
                      )}
                    />
                    <button
                      onClick={() => updateSetValue(field, isTimeBased || isDistance ? 5 : 1)}
                      className="w-14 h-14 rounded-xl bg-grappler-700 flex items-center justify-center active:scale-95 transition-transform"
                      aria-label={`Increase ${unitLabel.toLowerCase()}`}
                    >
                      <Plus className="w-6 h-6 text-grappler-300" />
                    </button>
                  </div>
                  {/* Quick-adjust pills */}
                  <div className="flex items-center justify-center gap-2 mt-2">
                    {increments.map((inc) => (
                      <button
                        key={inc}
                        onClick={() => updateSetValue(field, inc)}
                        className="px-3.5 py-2.5 rounded-lg bg-grappler-700/60 text-xs font-semibold text-grappler-300 active:scale-95 transition-transform"
                      >
                        +{inc}{isTimeBased ? 's' : isDistance ? 'm' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* RPE — rated once, right after the set (rest bar). Shown here only
                when correcting a logged set; before the set it was a third RPE ask. */}
            {currentSet.completed && (
            <div className="bg-grappler-800/50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <label className="text-xs text-grappler-400 uppercase tracking-wide">RPE (1-10)</label>
                <button
                  onClick={() => setShowRPEInfo(!showRPEInfo)}
                  className="text-grappler-500 hover:text-grappler-300 transition-colors"
                  aria-label="RPE info"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              <AnimatePresence>
                {showRPEInfo && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 mb-2 p-2.5 bg-grappler-700/50 rounded-lg text-xs text-grappler-300 space-y-1">
                      <p className="font-medium text-grappler-200">Rate of Perceived Exertion (RPE)</p>
                      <p><span className="text-green-400 font-medium">6</span> — Could do 4+ more reps</p>
                      <p><span className="text-green-400 font-medium">7</span> — Could do 3 more reps</p>
                      <p><span className="text-yellow-400 font-medium">8</span> — Could do 2 more reps</p>
                      <p><span className="text-red-400 font-medium">9</span> — Could do 1 more rep</p>
                      <p><span className="text-red-400 font-medium">10</span> — Maximum effort, no reps left</p>
                      <p className="text-grappler-400 pt-1">Reps in Reserve (RIR) = 10 - RPE</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex items-center justify-center gap-2 mt-3">
                {[6, 7, 8, 9, 10].map((rpe) => (
                  <button
                    key={rpe}
                    onClick={() => setExactValue('rpe', rpe)}
                    className={cn(
                      'w-14 h-14 rounded-xl text-lg font-bold transition-all active:scale-95',
                      currentSet.rpe === rpe
                        ? rpe >= 9 ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' :
                          rpe >= 7 ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/30' :
                          'bg-green-500 text-white shadow-lg shadow-green-500/30'
                        : 'bg-grappler-700 text-grappler-400'
                    )}
                  >
                    {rpe}
                  </button>
                ))}
              </div>
              {currentExercise.prescription.rpe && (
                <p className="text-xs text-grappler-400 text-center mt-2">
                  Target RPE {currentExercise.prescription.rpe} = {+(10 - currentExercise.prescription.rpe).toFixed(1)} reps in reserve
                </p>
              )}
            </div>
            )}
          </div>

          {/* ── Tempo Metronome ── */}
          {currentExercise.prescription.tempo && !currentSet.completed && (
            <AnimatePresence>
              {tempoState ? (
                <motion.div
                  key="tempo-active"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className={cn(
                    'rounded-lg border p-4 bg-gradient-to-br transition-all duration-300',
                    PHASE_BG_COLORS[tempoState.phase],
                    tempoState.phase === 'eccentric' ? 'border-blue-500/30' :
                    tempoState.phase === 'pause' ? 'border-yellow-500/30' :
                    tempoState.phase === 'concentric' ? 'border-red-500/30' :
                    'border-green-500/30'
                  )}>
                    {/* Phase label & rep counter */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-grappler-400 uppercase">Rep {tempoState.currentRep}</span>
                        <span className="text-xs text-grappler-400">TUT: {formatTUT(tempoState.tut)}</span>
                      </div>
                      <button
                        onClick={stopTempoMetronome}
                        className="text-xs text-grappler-400 hover:text-grappler-300 transition-colors"
                      >
                        Stop
                      </button>
                    </div>

                    {/* Big phase display */}
                    <div className="text-center">
                      <motion.p
                        key={tempoState.phase}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={cn('text-3xl font-black tracking-wider', PHASE_COLORS[tempoState.phase])}
                      >
                        {PHASE_LABELS[tempoState.phase]}
                      </motion.p>
                      <motion.p
                        key={`${tempoState.phase}-${tempoState.phaseTimeLeft}`}
                        initial={{ scale: 1.3, opacity: 0.5 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-5xl font-black text-grappler-50 mt-1 tabular-nums"
                      >
                        {tempoState.phaseTimeLeft}
                      </motion.p>
                    </div>

                    {/* Phase progress bar */}
                    <div className="mt-3 h-2 bg-grappler-800/50 rounded-full overflow-hidden">
                      <motion.div
                        className={cn(
                          'h-full rounded-full',
                          tempoState.phase === 'eccentric' ? 'bg-blue-500' :
                          tempoState.phase === 'pause' ? 'bg-yellow-500' :
                          tempoState.phase === 'concentric' ? 'bg-red-500' :
                          'bg-green-500'
                        )}
                        initial={{ width: '100%' }}
                        animate={{ width: `${(tempoState.phaseTimeLeft / tempoState.phaseDuration) * 100}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>

                    {/* Phase legend */}
                    <div className="mt-3 flex justify-center gap-3">
                      {(['eccentric', 'pause', 'concentric', 'lockout'] as const).map(phase => {
                        const secs = tempoPrescription ? (
                          phase === 'eccentric' ? tempoPrescription.eccentric :
                          phase === 'pause' ? tempoPrescription.pause :
                          phase === 'concentric' ? tempoPrescription.concentric :
                          tempoPrescription.lockout
                        ) : 0;
                        if (secs === 0) return null;
                        return (
                          <div
                            key={phase}
                            className={cn(
                              'text-center px-2 py-1 rounded-lg transition-all text-xs',
                              tempoState.phase === phase
                                ? 'bg-grappler-800/60 ring-1 ring-white/20 scale-110'
                                : 'opacity-50'
                            )}
                          >
                            <span className={cn('font-bold', PHASE_COLORS[phase])}>{secs}s</span>
                            <p className="text-grappler-400 text-xs capitalize">{phase === 'lockout' ? 'top' : phase === 'pause' ? 'bottom' : phase}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          )}

          {/* Complete Set Button — handled by fixed bottom bar */}
          {/* Undo last set */}
          {undoInfo && !isResting && (
            <button
              onClick={undoLastSet}
              className="btn btn-secondary w-full mt-2 gap-2 text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Undo Last Set
            </button>
          )}
        </motion.div>
        </div>

        {/* Cues — collapsed by default */}
        {currentExercise.exercise.cues.length > 0 && (
          <details className="card overflow-hidden">
            <summary className="p-3 flex items-center gap-2 cursor-pointer text-xs font-medium text-grappler-400 hover:text-grappler-300 transition-colors list-none [&::-webkit-details-marker]:hidden">
              <Info className="w-3.5 h-3.5" />
              Form Cues ({currentExercise.exercise.cues.length})
              <ChevronDown className="w-3 h-3 ml-auto transition-transform [[open]>&]:rotate-180" />
            </summary>
            <ul className="text-sm text-grappler-400 space-y-1 px-3 pb-3">
              {currentExercise.exercise.cues.slice(0, 3).map((cue, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
                  {cue}
                </li>
              ))}
            </ul>
          </details>
        )}

        {/* Workout Progress — collapsed by default, expand to navigate */}
        <details className="card mt-4 overflow-hidden">
          <summary className="p-3 flex items-center gap-2 cursor-pointer text-xs font-semibold text-grappler-400 uppercase tracking-wide list-none [&::-webkit-details-marker]:hidden hover:text-grappler-300 transition-colors">
            <ListChecks className="w-3.5 h-3.5" />
            Workout Progress
            <span className="ml-auto text-grappler-500 normal-case font-normal">
              {activeWorkout.exerciseLogs.reduce((s, e) => s + e.sets.filter(ss => ss.completed).length, 0)}/{activeWorkout.session.exercises.reduce((s, e) => s + e.sets, 0)} sets
            </span>
            <ChevronDown className="w-3 h-3 transition-transform [[open]>&]:rotate-180" />
          </summary>
          <div className="space-y-1 px-3 pb-3">
            {activeWorkout.session.exercises.map((ex, i) => {
              const log = activeWorkout.exerciseLogs[i];
              const doneSets = log.sets.filter(s => s.completed).length;
              const isCurrent = i === currentExerciseIndex;
              const isDone = doneSets === log.sets.length;
              return (
                <button
                  key={i}
                  onClick={() => goToExercise(i)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-all',
                    isCurrent && 'bg-primary-500/10 border border-primary-500/30',
                    isDone && !isCurrent && 'opacity-50',
                    !isCurrent && !isDone && 'hover:bg-grappler-800/50',
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded flex items-center justify-center text-xs font-bold flex-shrink-0',
                    isDone ? 'bg-green-500/20 text-green-400' :
                    isCurrent ? 'bg-primary-500/20 text-primary-400' :
                    'bg-grappler-700/50 text-grappler-500'
                  )}>
                    {isDone ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                  <p className={cn(
                    'text-xs truncate flex-1',
                    isCurrent ? 'text-grappler-100 font-medium' :
                    isDone ? 'text-grappler-500 line-through' :
                    'text-grappler-400'
                  )}>
                    {ex.exercise.name}
                  </p>
                  <span className="text-xs text-grappler-400 flex-shrink-0">{doneSets}/{log.sets.length}</span>
                </button>
              );
            })}
          </div>
        </details>
      </main>

      {/* Fixed Complete Set Button */}
      {!showOverview && !isResting && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-grappler-900 border-t border-grappler-700/50 z-40">
          {(() => {
            const isZeroForCurrent = isTimeBased
              ? (currentSet.duration || 0) <= 0
              : currentSet.reps <= 0 && currentSet.weight > 0;
            return isZeroForCurrent && !confirmZeroReps && !currentSet.completed;
          })() ? (
            <button
              onClick={() => setConfirmZeroReps(true)}
              className="w-full py-4 rounded-xl font-bold text-lg bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 gap-2 flex items-center justify-center"
            >
              <AlertTriangle className="w-5 h-5" />
              {isTimeBased ? 'Complete with 0s?' : 'Complete with 0 reps?'}
            </button>
          ) : (
            <button
              onClick={completeSet}
              disabled={currentSet.completed}
              className={cn(
                'w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2',
                currentSet.completed
                  ? 'bg-grappler-700 text-grappler-400 opacity-50'
                  : 'bg-primary-500 text-white active:scale-[0.98] transition-transform'
              )}
            >
              <Check className="w-5 h-5" />
              {currentSet.completed ? 'Set logged · edits save instantly' : 'Complete Set'}
            </button>
          )}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card p-6 w-full max-w-sm text-center"
            >
              <h2 className="text-lg font-bold text-grappler-50 mb-2">Leave Workout?</h2>
              <p className="text-sm text-grappler-400 mb-5">
                You have {completedSets} completed set{completedSets !== 1 ? 's' : ''}.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="btn btn-primary btn-md w-full"
                >
                  Keep Going
                </button>
                <button
                  onClick={() => { setShowCancelConfirm(false); pauseWorkout(); }}
                  className="btn btn-md w-full bg-grappler-700 hover:bg-grappler-600 text-grappler-50 flex items-center justify-center gap-2"
                >
                  <Pause className="w-4 h-4" />
                  Pause & Browse App
                </button>
                <button
                  onClick={() => { setShowCancelConfirm(false); cancelWorkout(); }}
                  className="btn btn-md w-full bg-red-500/20 hover:bg-red-500/30 text-red-400"
                >
                  Discard Workout
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Volume Gap Fill Prompt */}
      <AnimatePresence>
        {showVolumeGapPrompt && (
          <VolumeGapPrompt
            postWorkoutVolumeGaps={postWorkoutVolumeGaps}
            selectedVolumeGaps={selectedVolumeGaps}
            setSelectedVolumeGaps={setSelectedVolumeGaps}
            setShowVolumeGapPrompt={setShowVolumeGapPrompt}
            setVolumeGapDismissed={setVolumeGapDismissed}
            setShowFinishModal={setShowFinishModal}
            addBonusExercise={addBonusExercise}
            activeWorkout={activeWorkout}
            setCurrentExerciseIndex={setCurrentExerciseIndex}
            setCurrentSetIndex={setCurrentSetIndex}
          />
        )}
      </AnimatePresence>

      {/* Finish Workout Modal */}
      <AnimatePresence>
        {showFinishModal && (
          <FinishWorkoutModal
            activeWorkout={activeWorkout}
            durationOverride={durationOverride}
            totalVolumeCompleted={totalVolumeCompleted}
            weightUnit={weightUnit}
            completedSets={completedSets}
            totalSets={totalSets}
            finisherLogged={finisherLogged}
            latestWhoopData={latestWhoopData}
            readiness={readiness}
            finisherMatContext={finisherMatContext}
            setShowFinishModal={setShowFinishModal}
            setShowFinisher={setShowFinisher}
            postWorkoutVolumeGaps={postWorkoutVolumeGaps}
            volumeGapDismissed={volumeGapDismissed}
            setShowVolumeGapPrompt={setShowVolumeGapPrompt}
            sessionRpeTouched={sessionRpeTouched}
            setFeedback={setFeedback}
            feedback={feedback}
            setShowMoreFeedback={setShowMoreFeedback}
            showMoreFeedback={showMoreFeedback}
            setDurationOverride={setDurationOverride}
            completeWorkout={completeWorkout}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
