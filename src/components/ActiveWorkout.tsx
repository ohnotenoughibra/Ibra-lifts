'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
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
  Moon,
  Utensils,
  Brain,
  Zap,
  Heart,
  AlertTriangle,
  TrendingUp,
  Video,
  ListChecks,
  Dumbbell,
  ChevronDown,
  Clock,
  Activity,
  Battery,
  Shield,
  ArrowDown,
  ArrowUp,
  Info,
} from 'lucide-react';
import { cn, formatTime } from '@/lib/utils';
import { calculate1RM } from '@/lib/workout-generator';
import { getRandomTip } from '@/lib/knowledge';
import { exercises as exerciseLibrary, getAlternativesForExercise, getRecommendedAlternatives, ExerciseRecommendation } from '@/lib/exercises';
import { calculateReadiness, whoopRecoveryToReadiness, calculatePersonalBaseline } from '@/lib/auto-adjust';
import { ExerciseLog, SetLog, PreWorkoutCheckIn, ExerciseFeedback, PostWorkoutFeedback, WeightUnit, WorkoutLog, EquipmentProfileName, DEFAULT_EQUIPMENT_PROFILES } from '@/lib/types';
import { getSuggestedWeight } from '@/lib/auto-adjust';
import { estimateFirstTimeWeight, WeightEstimate } from '@/lib/weight-estimator';
import { applyThrottle, getThrottleConfig, getThrottleInsights, getThrottleSummary, type ThrottleResult, type ThrottleLevel } from '@/lib/readiness-throttle';
import { calculateReadiness as calcFullReadiness } from '@/lib/performance-engine';
import { getCoachMessages, type CoachMessage, type CoachContext } from '@/lib/corner-coach';
import { regulateRPE, type RPERegulation } from '@/lib/rpe-regulator';
import { generateSmartWarmUp, type WarmUpProtocol, type WarmUpStep } from '@/lib/warmup-generator';
import { detectSupersetCandidates } from '@/lib/superset-engine';
import { parseTempo, initTempoState, tickTempo, stopTempo, formatTUT, PHASE_LABELS, PHASE_COLORS, PHASE_BG_COLORS, type TempoState, type TempoPrescription } from '@/lib/tempo-engine';
import { getActiveInjuryAdaptations } from '@/lib/injury-science';
import { Building2, Home, Backpack, Search } from 'lucide-react';
import Confetti from 'react-confetti';
import YouTubeEmbed from '@/components/YouTubeEmbed';

export default function ActiveWorkout() {
  const {
    activeWorkout, user, updateExerciseLog, completeWorkout, cancelWorkout,
    setPreCheckIn, updateExerciseFeedback, swapExercise, addBonusExercise, adaptWorkoutToProfile,
    activeEquipmentProfile, latestWhoopData, wearableHistory, applyWhoopAdjustment,
    baselineLifts
  } = useAppStore();

  // Calculate personal baseline from wearable history for accurate HRV/RHR analysis
  const personalBaseline = useMemo(() =>
    calculatePersonalBaseline(wearableHistory),
    [wearableHistory]
  );
  // Store selectors for full readiness (used by throttle engine)
  const storeWorkoutLogs = useAppStore(s => s.workoutLogs);
  const trainingSessions = useAppStore(s => s.trainingSessions ?? []);
  const meals = useAppStore(s => s.meals ?? []);
  const macroTargets = useAppStore(s => s.macroTargets ?? { calories: 2500, protein: 180, carbs: 300, fat: 80 });
  const waterLog = useAppStore(s => s.waterLog ?? {});
  const quickLogs = useAppStore(s => s.quickLogs ?? []);

  // Active injury adaptations — for per-exercise warnings
  const injuryLog = useAppStore(s => s.injuryLog);
  const injuryAdaptations = useMemo(() => getActiveInjuryAdaptations(injuryLog), [injuryLog]);
  const hasActiveInjuries = injuryAdaptations.classifications.length > 0;
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restMinimized, setRestMinimized] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [tip, setTip] = useState(getRandomTip());
  const [showPRCelebration, setShowPRCelebration] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showOverview, setShowOverview] = useState(true);
  const [feeling, setFeeling] = useState<'great' | 'good' | 'okay' | 'rough'>('good');
  const [showCheckInDetail, setShowCheckInDetail] = useState(false);
  const [showExerciseFeedback, setShowExerciseFeedback] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapShowAll, setSwapShowAll] = useState(false);
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [addExerciseSearch, setAddExerciseSearch] = useState('');
  const [addExerciseFilter, setAddExerciseFilter] = useState<string>('all');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [feedbackExerciseIndex, setFeedbackExerciseIndex] = useState(0);
  const [inlineFeedbackIndex, setInlineFeedbackIndex] = useState<number | null>(null);
  const [weightSuggestion, setWeightSuggestion] = useState<{ message: string; suggestedWeight: number } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showLocationConfirm, setShowLocationConfirm] = useState<EquipmentProfileName | null>(null);
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [showRPEInfo, setShowRPEInfo] = useState(false);
  const [grapplingReduction, setGrapplingReduction] = useState<{ level: string; setsRemoved: number; rpeReduced: number } | null>(null);
  const [overviewSwapIndex, setOverviewSwapIndex] = useState<number | null>(null);
  const [formCheckExercise, setFormCheckExercise] = useState<{ name: string; videoUrl?: string } | null>(null);
  const [lastCompletedExerciseIndex, setLastCompletedExerciseIndex] = useState<number | null>(null);
  const [undoInfo, setUndoInfo] = useState<{ exerciseIndex: number; setIndex: number; previousSets: SetLog[]; previousPR: boolean; previousE1RM: number } | null>(null);

  // ── Readiness Auto-Throttle state ──
  const [throttleResult, setThrottleResult] = useState<ThrottleResult | null>(null);
  const [throttleApplied, setThrottleApplied] = useState(false);
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
  const [criticalReadinessAcknowledged, setCriticalReadinessAcknowledged] = useState(false);

  const weightUnit: WeightUnit = user?.weightUnit || 'lbs';
  const weightIncrement = weightUnit === 'kg' ? 2.5 : 5;

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
  const [durationOverride, setDurationOverride] = useState<number | null>(null);

  // Workout timer — uses startTime timestamp so it survives app backgrounding
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      forceUpdate(n => n + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Rest timer — timestamp-based so it keeps counting while app is backgrounded
  const [restEndTime, setRestEndTime] = useState<number | null>(null);
  const restTimer = restEndTime ? Math.max(0, Math.ceil((restEndTime - Date.now()) / 1000)) : 0;
  const warned10sRef = useRef(false);

  useEffect(() => {
    if (!isResting || !restEndTime) return;
    warned10sRef.current = false; // Reset warning flag for new rest period
    const interval = setInterval(() => {
      const remaining = Math.ceil((restEndTime - Date.now()) / 1000);

      // 10-second warning — vibrate + notification when app may be backgrounded
      if (remaining <= 10 && remaining > 0 && !warned10sRef.current) {
        warned10sRef.current = true;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
        // Send push notification if app is backgrounded
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
          new Notification('Rest almost done!', {
            body: '10 seconds left — get ready for your next set',
            tag: 'rest-warning',
            silent: false,
          });
        }
      }

      if (remaining <= 0) {
        setIsResting(false);
        setRestEndTime(null);
        setLastCompletedExerciseIndex(null);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([200, 100, 200, 100, 300]);
        }
        // Send push notification if app is backgrounded
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
          new Notification('Rest complete!', {
            body: 'Time to lift — next set is ready',
            tag: 'rest-complete',
            silent: false,
          });
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isResting, restEndTime]);

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

  // Real-time PR detection - check if current input would beat historical best
  const prDetection = useMemo(() => {
    if (!currentLog || currentSet.weight <= 0 || currentSet.reps <= 0) {
      return { isPotentialPR: false, currentE1RM: 0, bestE1RM: 0 };
    }

    const currentE1RM = calculate1RM(currentSet.weight, currentSet.reps);
    const workoutLogs = useAppStore.getState().workoutLogs;

    let bestE1RM = 0;
    let hasHistory = false;

    for (const log of workoutLogs) {
      for (const ex of log.exercises) {
        if (ex.exerciseId === currentLog.exerciseId && ex.estimated1RM) {
          hasHistory = true;
          bestE1RM = Math.max(bestE1RM, ex.estimated1RM);
        }
      }
    }

    // It's a potential PR if: first time doing this exercise OR beating historical best
    const isPotentialPR = !hasHistory || currentE1RM > bestE1RM;

    return { isPotentialPR, currentE1RM, bestE1RM, isFirstTime: !hasHistory };
  }, [currentLog, currentSet.weight, currentSet.reps]);

  const updateSetValue = (field: 'weight' | 'reps' | 'rpe', delta: number) => {
    const newSets = [...currentLog.sets];
    newSets[currentSetIndex] = {
      ...newSets[currentSetIndex],
      [field]: Math.max(0, newSets[currentSetIndex][field] + delta)
    };
    updateExerciseLog(currentExerciseIndex, { ...currentLog, sets: newSets });
  };

  const setExactValue = (field: 'weight' | 'reps' | 'rpe', value: number) => {
    const newSets = [...currentLog.sets];
    newSets[currentSetIndex] = {
      ...newSets[currentSetIndex],
      [field]: Math.max(0, value)
    };
    updateExerciseLog(currentExerciseIndex, { ...currentLog, sets: newSets });
  };

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

  // Stop tempo when exercise changes or rest starts
  useEffect(() => {
    if (isResting && tempoState) {
      stopTempoMetronome();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResting]);

  const completeSet = () => {
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

    // Carry forward weight/reps to next set so the user doesn't have to re-enter
    if (currentSetIndex + 1 < newSets.length && !newSets[currentSetIndex + 1].completed) {
      newSets[currentSetIndex + 1] = {
        ...newSets[currentSetIndex + 1],
        weight: newSets[currentSetIndex].weight,
        reps: newSets[currentSetIndex].reps,
      };
    }

    // Check for PR - compare against all previous logs for this exercise
    const estimated1RM = calculate1RM(currentSet.weight, currentSet.reps);
    const workoutLogs = useAppStore.getState().workoutLogs;
    let previousBest1RM = 0;
    let hasHistoryForExercise = false;
    for (const log of workoutLogs) {
      for (const ex of log.exercises) {
        if (ex.exerciseId === currentLog.exerciseId && ex.estimated1RM) {
          hasHistoryForExercise = true;
          previousBest1RM = Math.max(previousBest1RM, ex.estimated1RM);
        }
      }
    }
    // PR if: weight > 0 AND (first ever lift for this exercise OR beat previous best)
    const isPR = currentSet.weight > 0 && (!hasHistoryForExercise || estimated1RM > previousBest1RM);

    updateExerciseLog(currentExerciseIndex, {
      ...currentLog,
      sets: newSets,
      personalRecord: currentLog.personalRecord || isPR,
      estimated1RM: Math.max(currentLog.estimated1RM || 0, estimated1RM)
    });

    if (isPR) {
      setShowPRCelebration(true);
      setTimeout(() => setShowPRCelebration(false), 3000);
    }

    // Start rest timer — store end timestamp so it survives backgrounding
    setRestEndTime(Date.now() + currentExercise.prescription.restSeconds * 1000);
    setIsResting(true);
    setRestMinimized(false);

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
        setCurrentExerciseIndex(currentExerciseIndex + 1);
        setCurrentSetIndex(0);
      }
    } else {
      // Set-level auto-regulation: suggest weight adjustment for next set
      const targetReps = currentExercise.prescription.targetReps;
      const actualReps = currentSet.reps;
      const currentWeight = currentSet.weight;

      if (currentWeight > 0 && actualReps > 0) {
        if (actualReps >= targetReps + 3) {
          const bump = weightUnit === 'kg' ? 2.5 : 5;
          setWeightSuggestion({
            message: `You hit ${actualReps} reps (target ${targetReps}) — consider bumping up`,
            suggestedWeight: currentWeight + bump,
          });
        } else if (actualReps <= targetReps - 3 && currentSet.rpe >= 9) {
          const drop = weightUnit === 'kg' ? 2.5 : 5;
          setWeightSuggestion({
            message: `Only ${actualReps} reps at RPE ${currentSet.rpe} — consider dropping weight`,
            suggestedWeight: Math.max(0, currentWeight - drop),
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

  const handleSwapExercise = (newExerciseId: string, newExerciseName: string) => {
    swapExercise(currentExerciseIndex, newExerciseId, newExerciseName);
    setShowSwapModal(false);
  };

  const handleSkipExercise = () => {
    // Mark all remaining (incomplete) sets as completed with 0 weight/reps
    const skippedSets = currentLog.sets.map(s =>
      s.completed ? s : { ...s, weight: 0, reps: 0, rpe: 0, completed: true, notes: 'Skipped' }
    );
    updateExerciseLog(currentExerciseIndex, {
      ...currentLog,
      sets: skippedSets,
      feedback: {
        exerciseId: currentLog.exerciseId,
        pumpRating: 0,
        difficulty: 'too_hard' as const,
        jointPain: false,
        wantToSwap: false,
      },
    });
    // Move to next exercise if not on last one
    if (currentExerciseIndex < activeWorkout.session.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setCurrentSetIndex(0);
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
        const result = applyThrottle(activeWorkout.session, fullReadiness);
        setThrottleResult(result);

        // Auto-apply if not green (green = no changes)
        if (result.config.level !== 'green') {
          useAppStore.setState({
            activeWorkout: {
              ...activeWorkout,
              session: result.adjustedSession,
            },
          });
          setThrottleApplied(true);
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
    setRestEndTime(null);
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
    setRestEndTime(null);
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
    setRestEndTime(null);
    setLastCompletedExerciseIndex(null);
  };

  const formatRestTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalSets = activeWorkout.exerciseLogs.reduce((sum, log) => sum + log.sets.length, 0);
  const completedSets = activeWorkout.exerciseLogs.reduce(
    (sum, log) => sum + log.sets.filter(s => s.completed).length,
    0
  );
  const progress = (completedSets / totalSets) * 100;

  const isLastSet = currentSetIndex === currentLog.sets.length - 1;
  const isLastExercise = currentExerciseIndex === activeWorkout.session.exercises.length - 1;
  // Check if ALL exercises are fully completed (not just current index position)
  const allExercisesDone = activeWorkout.exerciseLogs.every(
    log => log.sets.every(s => s.completed)
  );
  const hasIncompleteExercises = activeWorkout.exerciseLogs.some(
    (log, i) => i !== currentExerciseIndex && log.sets.some(s => !s.completed)
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

  // Enhanced recommendations with scores and reasons
  const recommendations: ExerciseRecommendation[] = user ? getRecommendedAlternatives(
    currentExercise.exerciseId,
    user.equipment,
    8,
    profileEquipment
  ) : [];

  // Filtered exercises for Add Exercise modal
  const addExerciseList = useMemo(() => {
    if (!activeWorkout) return [];
    const usedIds = new Set(activeWorkout.session.exercises.map(e => e.exerciseId));
    const userEquipment = user?.equipment;
    return exerciseLibrary.filter(ex => {
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
      if (addExerciseSearch) {
        const q = addExerciseSearch.toLowerCase();
        return ex.name.toLowerCase().includes(q) || ex.primaryMuscles.some(m => m.includes(q));
      }
      return true;
    });
  }, [activeWorkout, user, addExerciseSearch, addExerciseFilter, profileEquipment]);

  // Get previous performance for an alternative exercise
  const getAltHistory = (exerciseId: string) => {
    const allLogs: WorkoutLog[] = useAppStore.getState().workoutLogs;
    const sorted = [...allLogs].reverse();
    for (const log of sorted) {
      const ex = log.exercises.find(e => e.exerciseId === exerciseId);
      if (ex && ex.sets.length > 0) {
        const bestSet = ex.sets
          .filter(s => s.completed)
          .reduce((best, s) => (s.weight > best.weight ? s : best), ex.sets[0]);
        return { weight: bestSet.weight, reps: bestSet.reps, date: new Date(log.date) };
      }
    }
    return null;
  };

  // Get per-exercise history from previous sessions
  const getExerciseHistory = (exerciseId: string) => {
    const allLogs: WorkoutLog[] = useAppStore.getState().workoutLogs;
    const sorted = [...allLogs].reverse();
    for (const log of sorted) {
      const ex = log.exercises.find(e => e.exerciseId === exerciseId);
      if (ex && ex.sets.length > 0) {
        const bestSet = ex.sets
          .filter(s => s.completed)
          .reduce((best, s) => (s.weight > best.weight ? s : best), ex.sets[0]);
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
  const previousSetHistory = useMemo(() => {
    const allLogs: WorkoutLog[] = useAppStore.getState().workoutLogs;
    const sorted = [...allLogs].reverse();
    for (const log of sorted) {
      const ex = log.exercises.find(e => e.exerciseId === currentLog.exerciseId);
      if (ex && ex.sets.length > 0) {
        return ex.sets.filter(s => s.completed).map(s => ({ weight: s.weight, reps: s.reps }));
      }
    }
    return null;
  }, [currentLog.exerciseId]);

  // Get full history for an exercise (last 5 sessions)
  const getExerciseFullHistory = (exerciseId: string) => {
    const allLogs: WorkoutLog[] = useAppStore.getState().workoutLogs;
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

  // RPE-based weight suggestion: uses last session's data + target RPE
  const getRPEWeightSuggestion = () => {
    if (!previousPerformance || previousPerformance.weight === 0) return null;
    const targetRPE = currentExercise.prescription.rpe;
    const targetReps = currentExercise.prescription.targetReps;
    const lastRPE = previousPerformance.rpe || 7;
    const lastWeight = previousPerformance.weight;

    // RPE difference → approximate % adjustment (each RPE point ≈ 2-3% of load)
    const rpeDiff = targetRPE - lastRPE;
    const repsDiff = targetReps - previousPerformance.reps;
    // Each rep difference ≈ 2.5% change, each RPE point ≈ 2.5% change
    const pctAdjust = (rpeDiff * 0.025) - (repsDiff * 0.025);
    let suggested = Math.round(lastWeight * (1 + pctAdjust));

    // Factor in feedback from last time
    if (previousPerformance.feedback) {
      if (previousPerformance.feedback.difficulty === 'too_easy') suggested = Math.round(suggested * 1.05);
      if (previousPerformance.feedback.difficulty === 'too_hard') suggested = Math.round(suggested * 0.90);
    }

    // Round to nearest increment
    const increment = weightUnit === 'kg' ? 2.5 : 5;
    suggested = Math.round(suggested / increment) * increment;
    if (suggested <= 0) suggested = increment;

    return { suggested, lastWeight, lastRPE, targetRPE };
  };

  const rpeSuggestion = getRPEWeightSuggestion();

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

    const allLogs: WorkoutLog[] = useAppStore.getState().workoutLogs;
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
    <div className="min-h-screen bg-grappler-900 bg-mesh">
      {/* PR Celebration */}
      {showPRCelebration && (
        <>
          <Confetti
            width={typeof window !== 'undefined' ? window.innerWidth : 400}
            height={typeof window !== 'undefined' ? window.innerHeight : 800}
            recycle={false}
            numberOfPieces={200}
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          >
            <div className="bg-gradient-to-br from-sky-400 to-blue-500 rounded-2xl p-8 text-center">
              <Trophy className="w-16 h-16 text-white mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">NEW PR!</h2>
              <p className="text-white/80">You&apos;re getting stronger!</p>
            </div>
          </motion.div>
        </>
      )}

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
              className="bg-grappler-800 border border-red-500/30 rounded-2xl p-6 max-w-sm w-full space-y-4"
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-grappler-900 flex flex-col"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex-1 overflow-y-auto p-4 pb-40">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => cancelWorkout()}
                  className="btn btn-ghost btn-sm"
                >
                  <X className="w-5 h-5" />
                </button>
                <h1 className="text-lg font-bold text-grappler-50">Today&apos;s Workout</h1>
                <div className="w-10" />
              </div>

              {/* Draft Recovery Banner */}
              {showDraftRecovery && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-sky-500/20 to-blue-500/10 border border-sky-500/30 rounded-xl p-4 mb-5"
                >
                  <div className="flex items-start gap-3">
                    <RotateCcw className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-bold text-sky-300 text-sm">Workout Recovered</h3>
                      <p className="text-xs text-sky-400/80 mt-1">
                        You had an in-progress workout. Your sets and data have been preserved.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setShowDraftRecovery(false)}
                      className="flex-1 btn btn-sm bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30"
                    >
                      Continue Workout
                    </button>
                    <button
                      onClick={() => {
                        setShowDraftRecovery(false);
                        cancelWorkout();
                      }}
                      className="btn btn-sm btn-secondary"
                    >
                      Discard
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Session Info */}
              <div className={cn(
                'rounded-xl p-5 mb-5 border text-center',
                activeWorkout.session.type === 'strength' && 'bg-red-500/10 border-red-500/30',
                activeWorkout.session.type === 'hypertrophy' && 'bg-purple-500/10 border-purple-500/30',
                activeWorkout.session.type === 'power' && 'bg-blue-500/10 border-blue-500/30',
              )}>
                <h2 className="text-2xl font-black text-grappler-50 mb-1">
                  {activeWorkout.session.name}
                </h2>
                <p className={cn(
                  'text-sm font-medium capitalize mb-3',
                  activeWorkout.session.type === 'strength' && 'text-red-400',
                  activeWorkout.session.type === 'hypertrophy' && 'text-purple-400',
                  activeWorkout.session.type === 'power' && 'text-blue-400',
                )}>
                  {activeWorkout.session.type} Session
                </p>
                <div className="flex items-center justify-center gap-4 text-sm text-grappler-400">
                  <span className="flex items-center gap-1">
                    <Dumbbell className="w-4 h-4" />
                    {activeWorkout.session.exercises.length} exercises
                  </span>
                  <span className="flex items-center gap-1">
                    <ListChecks className="w-4 h-4" />
                    {totalSets} sets
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    ~{activeWorkout.session.estimatedDuration} min
                  </span>
                </div>
              </div>

              {/* Quick Readiness — moved above exercises so it's visible on mobile */}
              <div className="mb-5">
                <p className="text-xs text-grappler-400 mb-2 font-medium flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5" /> How are you feeling?
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { id: 'great' as const, label: 'Great', color: 'green' },
                    { id: 'good' as const, label: 'Good', color: 'primary' },
                    { id: 'okay' as const, label: 'Okay', color: 'yellow' },
                    { id: 'rough' as const, label: 'Rough', color: 'red' },
                  ]).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setFeeling(opt.id)}
                      className={cn(
                        'py-2.5 rounded-xl text-center transition-all',
                        feeling === opt.id
                          ? opt.color === 'green' ? 'bg-green-500/20 border border-green-500/50 ring-1 ring-green-500/20'
                          : opt.color === 'primary' ? 'bg-primary-500/20 border border-primary-500/50 ring-1 ring-primary-500/20'
                          : opt.color === 'yellow' ? 'bg-yellow-500/20 border border-yellow-500/50 ring-1 ring-yellow-500/20'
                          : 'bg-red-500/20 border border-red-500/50 ring-1 ring-red-500/20'
                          : 'bg-grappler-800/60 border border-grappler-700/50'
                      )}
                    >
                      <p className={cn('text-xs font-medium',
                        feeling === opt.id ? 'text-grappler-100' : 'text-grappler-500'
                      )}>{opt.label}</p>
                    </button>
                  ))}
                </div>

                {/* Optional fine-tune toggle */}
                <button
                  onClick={() => setShowCheckInDetail(!showCheckInDetail)}
                  className="w-full mt-2 text-[11px] text-grappler-500 hover:text-grappler-300 py-1 flex items-center justify-center gap-1"
                >
                  Fine-tune
                  <ChevronDown className={cn('w-3 h-3 transition-transform', showCheckInDetail && 'rotate-180')} />
                </button>

                <AnimatePresence>
                  {showCheckInDetail && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2 space-y-2">
                        {/* Sleep row */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-grappler-800/40 rounded-lg p-2.5">
                            <label className="text-[10px] text-grappler-400 mb-1 flex items-center gap-1">
                              <Moon className="w-3 h-3" /> Sleep
                            </label>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((v) => (
                                <button
                                  key={v}
                                  onClick={() => setCheckIn({ ...checkIn, sleepQuality: v })}
                                  className={cn(
                                    'flex-1 py-1 rounded text-xs font-medium',
                                    checkIn.sleepQuality === v
                                      ? v <= 2 ? 'bg-red-500 text-white' : v >= 4 ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
                                      : 'bg-grappler-700 text-grappler-500'
                                  )}
                                >{v}</button>
                              ))}
                            </div>
                          </div>
                          <div className="bg-grappler-800/40 rounded-lg p-2.5">
                            <label className="text-[10px] text-grappler-400 mb-1 block">Hours</label>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => setCheckIn({ ...checkIn, sleepHours: Math.max(0, checkIn.sleepHours - 0.5) })}
                                className="w-6 h-6 rounded bg-grappler-700 flex items-center justify-center">
                                <Minus className="w-2.5 h-2.5 text-grappler-300" />
                              </button>
                              <span className="text-sm font-bold text-grappler-50 flex-1 text-center">{checkIn.sleepHours}h</span>
                              <button onClick={() => setCheckIn({ ...checkIn, sleepHours: Math.min(12, checkIn.sleepHours + 0.5) })}
                                className="w-6 h-6 rounded bg-grappler-700 flex items-center justify-center">
                                <Plus className="w-2.5 h-2.5 text-grappler-300" />
                              </button>
                            </div>
                          </div>
                        </div>
                        {/* Stress + Soreness compact row */}
                        <div className="grid grid-cols-2 gap-2">
                          {([
                            { label: 'Stress', key: 'stress' as const, icon: Brain },
                            { label: 'Soreness', key: 'soreness' as const, icon: Heart },
                          ]).map(({ label, key, icon: Icon }) => (
                            <div key={key} className="bg-grappler-800/40 rounded-lg p-2.5">
                              <label className="text-[10px] text-grappler-400 mb-1 flex items-center gap-1">
                                <Icon className="w-3 h-3" /> {label}
                              </label>
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((v) => (
                                  <button
                                    key={v}
                                    onClick={() => setCheckIn({ ...checkIn, [key]: v })}
                                    className={cn(
                                      'flex-1 py-1 rounded text-xs font-medium',
                                      checkIn[key] === v
                                        ? v >= 4 ? 'bg-red-500 text-white' : v <= 2 ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
                                        : 'bg-grappler-700 text-grappler-500'
                                    )}
                                  >{v}</button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Whoop Readiness Card */}
              {latestWhoopData && whoopReadiness && !whoopApplied && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'rounded-xl p-4 mb-4 border',
                    whoopReadiness.score >= 67
                      ? 'bg-green-500/10 border-green-500/30'
                      : whoopReadiness.score >= 34
                        ? 'bg-yellow-500/10 border-yellow-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                  )}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-semibold text-grappler-100">Whoop Recovery</span>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <div className="text-center">
                      <Battery className={cn('w-4 h-4 mx-auto mb-0.5',
                        (latestWhoopData.recoveryScore ?? 0) >= 67 ? 'text-green-400' :
                        (latestWhoopData.recoveryScore ?? 0) >= 34 ? 'text-yellow-400' : 'text-red-400'
                      )} />
                      <p className={cn('text-lg font-bold',
                        (latestWhoopData.recoveryScore ?? 0) >= 67 ? 'text-green-400' :
                        (latestWhoopData.recoveryScore ?? 0) >= 34 ? 'text-yellow-400' : 'text-red-400'
                      )}>
                        {latestWhoopData.recoveryScore ?? '--'}%
                      </p>
                      <p className="text-xs text-grappler-500">Recovery</p>
                    </div>
                    <div className="text-center">
                      <Zap className="w-4 h-4 mx-auto mb-0.5 text-blue-400" />
                      <p className="text-lg font-bold text-grappler-100">
                        {latestWhoopData.strain?.toFixed(1) ?? '--'}
                      </p>
                      <p className="text-xs text-grappler-500">Strain</p>
                    </div>
                    <div className="text-center">
                      <Moon className="w-4 h-4 mx-auto mb-0.5 text-indigo-400" />
                      <p className="text-lg font-bold text-grappler-100">
                        {latestWhoopData.sleepHours?.toFixed(1) ?? '--'}h
                      </p>
                      <p className="text-xs text-grappler-500">Sleep</p>
                    </div>
                    <div className="text-center">
                      <Zap className="w-4 h-4 mx-auto mb-0.5 text-blue-400" />
                      <p className="text-lg font-bold text-grappler-100">
                        {latestWhoopData.caloriesBurned?.toLocaleString() ?? '--'}
                      </p>
                      <p className="text-xs text-grappler-500">kcal</p>
                    </div>
                  </div>

                  {/* Recommendation + Visual Diff */}
                  <div className={cn(
                    'rounded-lg p-3 mb-3 text-sm',
                    whoopReadiness.recommendation === 'reduce' ? 'bg-red-500/10' :
                    whoopReadiness.recommendation === 'increase' ? 'bg-green-500/10' : 'bg-grappler-800/50'
                  )}>
                    {whoopReadiness.recommendation === 'reduce' && (
                      <div className="flex items-start gap-2">
                        <ArrowDown className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-300">Lower intensity suggested</p>
                          <p className="text-xs text-red-400/80 mt-0.5">
                            -1 set per exercise, RPE reduced by 1
                          </p>
                        </div>
                      </div>
                    )}
                    {whoopReadiness.recommendation === 'increase' && (
                      <div className="flex items-start gap-2">
                        <ArrowUp className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-green-300">Push harder today</p>
                          <p className="text-xs text-green-400/80 mt-0.5">
                            +1 set per exercise, RPE bumped +0.5
                          </p>
                        </div>
                      </div>
                    )}
                    {whoopReadiness.recommendation === 'maintain' && (
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-grappler-300 flex-shrink-0 mt-0.5" />
                        <p className="font-medium text-grappler-300">On track — follow the plan as-is</p>
                      </div>
                    )}
                  </div>

                  {/* Follow Whoop vs Follow Plan */}
                  {whoopReadiness.recommendation !== 'maintain' && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          if (activeWorkout) {
                            preWhoopSnapshot.current = {
                              session: activeWorkout.session,
                              exerciseLogs: activeWorkout.exerciseLogs,
                            };
                          }
                          applyWhoopAdjustment();
                          setWhoopFollowed(true);
                          setWhoopApplied(true);
                        }}
                        className={cn(
                          'btn btn-sm gap-1.5 font-medium',
                          whoopReadiness.recommendation === 'reduce'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30'
                            : 'bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30'
                        )}
                      >
                        <Activity className="w-3.5 h-3.5" />
                        Follow Whoop
                      </button>
                      <button
                        onClick={() => setWhoopApplied(true)}
                        className="btn btn-sm btn-secondary gap-1.5 font-medium"
                      >
                        <Dumbbell className="w-3.5 h-3.5" />
                        Follow Plan
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Whoop Applied Confirmation */}
              {whoopApplied && latestWhoopData && (
                <div className={cn(
                  'rounded-lg px-3 py-2 mb-4 flex items-center justify-between text-xs',
                  whoopReadiness?.recommendation === 'reduce'
                    ? 'bg-red-500/10 text-red-300'
                    : whoopReadiness?.recommendation === 'increase'
                      ? 'bg-green-500/10 text-green-300'
                      : 'bg-grappler-800/50 text-grappler-300'
                )}>
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5" />
                    Recovery {latestWhoopData.recoveryScore}% &middot; Strain {latestWhoopData.strain?.toFixed(1)} &middot; {latestWhoopData.caloriesBurned} kcal
                  </div>
                  <button
                    onClick={() => {
                      // If Whoop adjustment was applied, restore original workout
                      if (whoopFollowed && preWhoopSnapshot.current && activeWorkout) {
                        useAppStore.setState({
                          activeWorkout: {
                            ...activeWorkout,
                            session: preWhoopSnapshot.current.session,
                            exerciseLogs: preWhoopSnapshot.current.exerciseLogs,
                          },
                        });
                      }
                      setWhoopFollowed(false);
                      setWhoopApplied(false);
                    }}
                    className="text-grappler-400 hover:text-grappler-200 underline underline-offset-2 ml-2 flex-shrink-0"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Grappling Question */}
              {showGrapplingQ && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl p-4 mb-4 bg-grappler-800/60 border border-grappler-700/50"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-lime-400" />
                    <span className="text-sm font-semibold text-grappler-100">Grappling today?</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {([
                      { v: 'none' as const, label: 'No', color: 'bg-grappler-700 text-grappler-300' },
                      { v: 'light' as const, label: 'Light', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
                      { v: 'moderate' as const, label: 'Moderate', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
                      { v: 'hard' as const, label: 'Hard', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
                    ]).map(opt => (
                      <button
                        key={opt.v}
                        onClick={() => {
                          setGrapplingToday(opt.v);
                          setShowGrapplingQ(false);
                          // Auto-reduce volume for moderate/hard grappling
                          if (opt.v === 'hard' || opt.v === 'moderate') {
                            const { activeWorkout: aw } = useAppStore.getState();
                            if (aw) {
                              const setReduction = opt.v === 'hard' ? 2 : 1;
                              const rpeReduction = opt.v === 'hard' ? 2 : 1;
                              let totalSetsRemoved = 0;
                              let totalRpeReduced = 0;

                              const reduced = aw.session.exercises.map(ex => {
                                const newSets = Math.max(2, ex.sets - setReduction);
                                const newRpe = Math.max(5, ex.prescription.rpe - rpeReduction);
                                totalSetsRemoved += ex.sets - newSets;
                                if (ex.prescription.rpe !== newRpe) totalRpeReduced++;
                                return {
                                  ...ex,
                                  sets: newSets,
                                  prescription: { ...ex.prescription, rpe: newRpe },
                                };
                              });
                              const reducedLogs = aw.exerciseLogs.map((log, i) => ({
                                ...log,
                                sets: log.sets.slice(0, reduced[i].sets).map(s => ({
                                  ...s, rpe: reduced[i].prescription.rpe
                                })),
                              }));
                              useAppStore.setState({
                                activeWorkout: {
                                  ...aw,
                                  session: { ...aw.session, exercises: reduced },
                                  exerciseLogs: reducedLogs,
                                },
                              });
                              setGrapplingReduction({
                                level: opt.v,
                                setsRemoved: totalSetsRemoved,
                                rpeReduced: totalRpeReduced,
                              });
                            }
                          }
                        }}
                        className={cn(
                          'py-2 rounded-lg text-xs font-medium border transition-all',
                          grapplingToday === opt.v
                            ? opt.color
                            : 'bg-grappler-800/50 text-grappler-500 border-grappler-700'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {grapplingToday !== 'none' && !showGrapplingQ && (
                    <p className="text-xs text-grappler-500 mt-2">
                      Volume adjusted for {grapplingToday} grappling session
                    </p>
                  )}
                </motion.div>
              )}

              {/* Grappling "No" Banner - Allow changing */}
              {!showGrapplingQ && grapplingToday === 'none' && (
                <div className="rounded-xl px-3 py-2.5 mb-4 text-xs bg-grappler-800/50 border border-grappler-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-grappler-500" />
                      <span className="font-medium text-grappler-400">No grappling today</span>
                    </div>
                    <button
                      onClick={() => setShowGrapplingQ(true)}
                      className="text-grappler-400 hover:text-grappler-200 text-xs underline"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}

              {/* Grappling Applied Banner */}
              {!showGrapplingQ && grapplingToday !== 'none' && (
                <div className={cn(
                  'rounded-xl px-3 py-2.5 mb-4 text-xs',
                  grapplingToday === 'hard' ? 'bg-red-500/10 border border-red-500/20' :
                  grapplingToday === 'moderate' ? 'bg-yellow-500/10 border border-yellow-500/20' :
                  'bg-lime-500/10 border border-lime-500/20'
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className={cn('w-3.5 h-3.5',
                        grapplingToday === 'hard' ? 'text-red-400' :
                        grapplingToday === 'moderate' ? 'text-yellow-400' : 'text-lime-400'
                      )} />
                      <span className={cn('font-medium',
                        grapplingToday === 'hard' ? 'text-red-300' :
                        grapplingToday === 'moderate' ? 'text-yellow-300' : 'text-lime-300'
                      )}>
                        {grapplingToday === 'light' ? 'Light' : grapplingToday === 'moderate' ? 'Moderate' : 'Hard'} grappling planned
                      </span>
                    </div>
                    <button
                      onClick={() => setShowGrapplingQ(true)}
                      className="text-grappler-400 hover:text-grappler-200 text-xs underline"
                    >
                      Change
                    </button>
                  </div>
                  {grapplingReduction && (grapplingReduction.setsRemoved > 0 || grapplingReduction.rpeReduced > 0) && (
                    <div className="mt-1.5 ml-5.5 flex items-center gap-3 text-grappler-400">
                      {grapplingReduction.setsRemoved > 0 && (
                        <span className="flex items-center gap-1">
                          <ArrowDown className="w-3 h-3" />
                          {grapplingReduction.setsRemoved} sets removed
                        </span>
                      )}
                      {grapplingReduction.rpeReduced > 0 && (
                        <span className="flex items-center gap-1">
                          <ArrowDown className="w-3 h-3" />
                          RPE lowered on {grapplingReduction.rpeReduced} exercises
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Location Quick-Switch (minimal) */}
              <div className="flex items-center gap-1.5 bg-grappler-800/50 rounded-xl p-1.5 mb-5">
                {DEFAULT_EQUIPMENT_PROFILES.map((profile) => {
                  const IconMap: Record<string, any> = { gym: Building2, home: Home, travel: Backpack };
                  const PIcon = IconMap[profile.name] || Dumbbell;
                  const isActive = activeEquipmentProfile === profile.name;
                  const isPending = showLocationConfirm === profile.name;
                  return (
                    <button
                      key={profile.name}
                      onClick={() => {
                        if (isActive) return;
                        if (isPending) {
                          // Second tap confirms
                          adaptWorkoutToProfile(profile.name);
                          setShowLocationConfirm(null);
                        } else {
                          setShowLocationConfirm(profile.name);
                        }
                      }}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all',
                        isActive
                          ? 'bg-primary-500 text-white shadow-md'
                          : isPending
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 animate-pulse'
                          : 'text-grappler-400 hover:text-grappler-200 hover:bg-grappler-700/50'
                      )}
                    >
                      <PIcon className="w-3.5 h-3.5" />
                      {isPending ? 'Tap to confirm' : profile.label}
                    </button>
                  );
                })}
              </div>
              {/* Minimal hint when pending */}
              <AnimatePresence>
                {showLocationConfirm && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-xs text-grappler-500 text-center -mt-4 mb-4"
                  >
                    Exercises will adapt to {showLocationConfirm} equipment
                    <button
                      onClick={() => setShowLocationConfirm(null)}
                      className="ml-2 text-grappler-400 hover:text-grappler-300 underline"
                    >
                      cancel
                    </button>
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Injury Warning Banner */}
              {hasActiveInjuries && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/30 rounded-xl p-3.5 mb-4"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4.5 h-4.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-amber-300">
                        {injuryAdaptations.classifications.length === 1
                          ? `Active injury: ${injuryAdaptations.classifications[0].bodyRegion.replace(/_/g, ' ')}`
                          : `${injuryAdaptations.classifications.length} active injuries`
                        }
                      </h4>
                      <p className="text-xs text-amber-400/80 mt-0.5">
                        {injuryAdaptations.allAvoidExercises.length > 0
                          ? `${injuryAdaptations.allAvoidExercises.length} exercises flagged — look for warning icons below`
                          : 'Volume and intensity have been auto-adjusted'
                        }
                      </p>
                      {injuryAdaptations.allModifiedExercises.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {injuryAdaptations.allModifiedExercises.slice(0, 3).map((mod, mi) => (
                            <p key={mi} className="text-xs text-amber-400/70 flex items-start gap-1.5">
                              <span className="text-amber-500 mt-px">-</span>
                              <span><span className="text-amber-300 font-medium">{mod.exerciseId.replace(/-/g, ' ')}</span>: {mod.modification}</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Readiness Auto-Throttle Banner */}
              {throttleResult && throttleResult.config.level !== 'green' && !throttleDismissed && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'rounded-xl p-4 mb-4 border',
                    throttleResult.config.level === 'peak' ? 'bg-emerald-500/10 border-emerald-500/30' :
                    throttleResult.config.level === 'yellow' ? 'bg-yellow-500/10 border-yellow-500/30' :
                    throttleResult.config.level === 'orange' ? 'bg-orange-500/10 border-orange-500/30' :
                    'bg-red-500/10 border-red-500/30'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 flex-1">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        throttleResult.config.level === 'peak' ? 'bg-emerald-500/20' :
                        throttleResult.config.level === 'yellow' ? 'bg-yellow-500/20' :
                        throttleResult.config.level === 'orange' ? 'bg-orange-500/20' :
                        'bg-red-500/20'
                      )}>
                        <Battery className={cn(
                          'w-4 h-4',
                          throttleResult.config.level === 'peak' ? 'text-emerald-400' :
                          throttleResult.config.level === 'yellow' ? 'text-yellow-400' :
                          throttleResult.config.level === 'orange' ? 'text-orange-400' :
                          'text-red-400'
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={cn(
                          'text-sm font-bold',
                          throttleResult.config.level === 'peak' ? 'text-emerald-300' :
                          throttleResult.config.level === 'yellow' ? 'text-yellow-300' :
                          throttleResult.config.level === 'orange' ? 'text-orange-300' :
                          'text-red-300'
                        )}>
                          Auto-Throttle: {throttleResult.config.label}
                        </h4>
                        <p className="text-xs text-grappler-400 mt-0.5">
                          {throttleResult.config.message}
                        </p>
                        <p className="text-xs text-grappler-500 mt-1">
                          {getThrottleSummary(throttleResult)}
                        </p>
                        {throttleResult.droppedExercises.length > 0 && (
                          <p className="text-xs text-grappler-500 mt-1">
                            Dropped: {throttleResult.droppedExercises.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setThrottleDismissed(true)}
                      className="text-grappler-500 hover:text-grappler-300 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Smart Warm-Up Card */}
              {warmUpProtocol && warmUpProtocol.steps.length > 0 && (
                <div className="mb-4">
                  <button
                    onClick={() => setShowWarmUp(!showWarmUp)}
                    className="w-full rounded-xl p-3.5 bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-amber-300">Smart Warm-Up</p>
                        <p className="text-[11px] text-grappler-400">
                          {warmUpProtocol.totalDuration} min · {warmUpProtocol.steps.length} steps · {warmUpProtocol.rampUpSets.length} ramp-up sets
                        </p>
                      </div>
                    </div>
                    <ChevronDown className={cn('w-4 h-4 text-grappler-500 transition-transform', showWarmUp && 'rotate-180')} />
                  </button>
                  <AnimatePresence>
                    {showWarmUp && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-2 space-y-1.5">
                          {warmUpProtocol.steps.map((step, i) => (
                            <div
                              key={i}
                              className={cn(
                                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs',
                                step.type === 'cardio' ? 'bg-blue-500/10 text-blue-300' :
                                step.type === 'dynamic_stretch' ? 'bg-teal-500/10 text-teal-300' :
                                step.type === 'activation' ? 'bg-violet-500/10 text-violet-300' :
                                'bg-amber-500/10 text-amber-300'
                              )}
                            >
                              <span className="w-5 h-5 rounded-full bg-grappler-800 flex items-center justify-center text-[10px] font-bold text-grappler-400 flex-shrink-0">
                                {i + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <span className="font-medium">{step.name}</span>
                                {step.cue && <span className="text-grappler-500 ml-1">— {step.cue}</span>}
                              </div>
                              <span className="text-[10px] text-grappler-500 flex-shrink-0">
                                {step.duration >= 60 ? `${Math.round(step.duration / 60)}m` : `${step.duration}s`}
                                {step.sets && step.sets > 1 ? ` ×${step.sets}` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Superset Suggestions */}
              {supersetCandidates.length > 0 && (
                <div className="mb-4 rounded-xl p-3 bg-violet-500/10 border border-violet-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Shuffle className="w-3.5 h-3.5 text-violet-400" />
                    <p className="text-xs font-bold text-violet-300">Superset Opportunities</p>
                  </div>
                  {supersetCandidates.map((pair, i) => (
                    <p key={i} className="text-[11px] text-violet-300/80 mt-1">
                      {pair.reason}
                    </p>
                  ))}
                </div>
              )}

              {/* Exercise List */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-grappler-300 uppercase tracking-wide px-1">
                  Exercise Plan
                </h3>
                {activeWorkout.session.exercises.map((ex, i) => {
                  const prevPerf = getExerciseHistory(ex.exerciseId);
                  const exIdLower = ex.exerciseId.toLowerCase();
                  const isInjuryFlagged = hasActiveInjuries && injuryAdaptations.allAvoidExercises.some(
                    avoidId => exIdLower.includes(avoidId.toLowerCase())
                  );
                  const injuryMod = hasActiveInjuries
                    ? injuryAdaptations.allModifiedExercises.find(
                        m => exIdLower.includes(m.exerciseId.toLowerCase())
                      )
                    : undefined;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={cn(
                        'bg-grappler-800/60 rounded-xl p-4 border',
                        isInjuryFlagged ? 'border-amber-500/40' : 'border-grappler-700/50'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0',
                            isInjuryFlagged ? 'bg-amber-500/20 text-amber-400' :
                            activeWorkout.session.type === 'strength' ? 'bg-red-500/20 text-red-400' :
                            activeWorkout.session.type === 'hypertrophy' ? 'bg-purple-500/20 text-purple-400' :
                            'bg-blue-500/20 text-blue-400',
                          )}>
                            {isInjuryFlagged ? <AlertTriangle className="w-4 h-4" /> : i + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-grappler-100">{ex.exercise.name}</p>
                            <p className="text-xs text-grappler-400 mt-0.5">
                              {ex.sets} x {ex.prescription.targetReps} reps @ RPE {ex.prescription.rpe}
                              {ex.prescription.percentageOf1RM && (
                                <span className="text-primary-400 ml-1">~{ex.prescription.percentageOf1RM}% 1RM</span>
                              )}
                            </p>
                            <p className="text-xs text-grappler-500 mt-0.5">
                              Rest: {Math.floor(ex.prescription.restSeconds / 60)}:{(ex.prescription.restSeconds % 60).toString().padStart(2, '0')}
                              {' '}| {ex.exercise.primaryMuscles.slice(0, 2).join(', ')}
                            </p>
                            {/* Injury modification hint */}
                            {injuryMod && (
                              <p className="text-xs text-amber-400/80 mt-1 flex items-center gap-1">
                                <Shield className="w-3 h-3 flex-shrink-0" />
                                {injuryMod.modification}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                          <button
                            onClick={() => setFormCheckExercise({ name: ex.exercise.name, videoUrl: ex.exercise.videoUrl })}
                            className="p-2 rounded-lg bg-grappler-700/50 hover:bg-grappler-600/50 text-grappler-400 hover:text-primary-400 transition-colors"
                            title="Check form"
                          >
                            <Video className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setOverviewSwapIndex(i)}
                            className={cn(
                              'p-2 rounded-lg transition-colors',
                              isInjuryFlagged
                                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                                : 'bg-grappler-700/50 hover:bg-grappler-600/50 text-grappler-400 hover:text-primary-400'
                            )}
                            title={isInjuryFlagged ? 'Swap — flagged for injury' : 'Swap exercise'}
                          >
                            <Shuffle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {prevPerf && (
                        <div className="mt-2 ml-11 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-primary-400" />
                          <p className="text-xs text-primary-400">
                            Last: {prevPerf.weight} {weightUnit} x {prevPerf.reps}
                            {prevPerf.rpe ? ` @ RPE ${prevPerf.rpe}` : ''}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Bottom CTA — always submits check-in */}
            <div className="fixed bottom-0 left-0 right-0 bg-grappler-900/95 backdrop-blur-sm border-t border-grappler-800 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                onClick={() => {
                  submitPreCheckIn();
                  setShowOverview(false);
                }}
                className="btn btn-primary btn-lg w-full gap-2"
              >
                <Zap className="w-5 h-5" />
                Start Workout
              </button>
            </div>
          </motion.div>
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
        {overviewSwapIndex !== null && (() => {
          const targetEx = activeWorkout.session.exercises[overviewSwapIndex];
          if (!targetEx) return null;
          const overviewRecs: ExerciseRecommendation[] = user ? getRecommendedAlternatives(
            targetEx.exerciseId,
            user.equipment,
            8,
            profileEquipment
          ) : [];
          const handleOverviewSwap = (newExerciseId: string, newExerciseName: string) => {
            swapExercise(overviewSwapIndex, newExerciseId, newExerciseName);
            setOverviewSwapIndex(null);
          };
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/70 flex items-end sm:items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              onClick={(e) => { if (e.target === e.currentTarget) setOverviewSwapIndex(null); }}
            >
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="card p-6 w-full max-w-md max-h-[85vh] overflow-y-auto"
              >
                <h2 className="text-lg font-bold text-grappler-50 mb-1">Swap Exercise</h2>
                <p className="text-xs text-grappler-400 mb-1">
                  Replace <span className="text-grappler-200 font-medium">{targetEx.exercise.name}</span>
                </p>
                <div className="flex items-center gap-2 mb-4">
                  <p className="text-xs text-grappler-500">
                    Sorted by match score — how well each exercise replaces the current one
                  </p>
                  {activeEquipmentProfile !== 'gym' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 whitespace-nowrap flex-shrink-0">
                      {DEFAULT_EQUIPMENT_PROFILES.find(p => p.name === activeEquipmentProfile)?.label || activeEquipmentProfile}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {overviewRecs.length > 0 ? overviewRecs.map((rec) => (
                    <button
                      key={rec.exercise.id}
                      onClick={() => handleOverviewSwap(rec.exercise.id, rec.exercise.name)}
                      className="w-full p-3 rounded-xl border border-grappler-700 hover:border-primary-500 text-left transition-all group"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-semibold text-grappler-100 group-hover:text-primary-300 transition-colors">
                          {rec.exercise.name}
                        </p>
                        <span className={cn(
                          'text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2',
                          rec.matchScore >= 80 ? 'bg-green-500/20 text-green-400' :
                          rec.matchScore >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-grappler-700 text-grappler-400'
                        )}>
                          {rec.matchScore}%
                        </span>
                      </div>
                      {rec.reasons.length > 0 && (
                        <p className="text-xs text-grappler-400 mb-1.5">
                          {rec.reasons[0]}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {rec.tags.slice(0, 4).map((tag, ti) => (
                          <span key={ti} className="text-xs px-1.5 py-0.5 rounded bg-grappler-700/80 text-grappler-300">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-grappler-500 mt-1">
                        {rec.exercise.primaryMuscles.join(', ')}
                        {rec.exercise.secondaryMuscles.length > 0 && (
                          <span> + {rec.exercise.secondaryMuscles.slice(0, 2).join(', ')}</span>
                        )}
                      </p>
                    </button>
                  )) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-grappler-400 mb-3">
                        No alternatives match your {DEFAULT_EQUIPMENT_PROFILES.find(p => p.name === activeEquipmentProfile)?.label || 'current'} equipment
                      </p>
                      {activeEquipmentProfile !== 'gym' && (() => {
                        const allRecs = user ? getRecommendedAlternatives(targetEx.exerciseId, user.equipment, 8) : [];
                        if (allRecs.length === 0) return null;
                        return (
                          <>
                            <p className="text-xs text-yellow-400/70 mb-2">These require additional equipment:</p>
                            <div className="space-y-2 text-left">
                              {allRecs.map((rec) => (
                                <button
                                  key={rec.exercise.id}
                                  onClick={() => handleOverviewSwap(rec.exercise.id, rec.exercise.name)}
                                  className="w-full p-3 rounded-xl border border-yellow-500/30 hover:border-primary-500 text-left transition-all group"
                                >
                                  <div className="flex items-start justify-between mb-1">
                                    <p className="font-semibold text-grappler-100 group-hover:text-primary-300 transition-colors">
                                      {rec.exercise.name}
                                    </p>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 flex-shrink-0 ml-2">
                                      Needs equipment
                                    </span>
                                  </div>
                                  <p className="text-xs text-grappler-500 mt-1">
                                    {rec.exercise.primaryMuscles.join(', ')}
                                  </p>
                                </button>
                              ))}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setOverviewSwapIndex(null)}
                  className="btn btn-secondary btn-md w-full mt-4"
                >
                  Keep Current Exercise
                </button>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Exercise Swap Modal */}
      <AnimatePresence>
        {showSwapModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="card p-6 w-full max-w-md max-h-[85vh] overflow-y-auto"
            >
              <h2 className="text-lg font-bold text-grappler-50 mb-1">Swap Exercise</h2>
              <p className="text-xs text-grappler-400 mb-1">
                Replace <span className="text-grappler-200 font-medium">{currentExercise.exercise.name}</span>
              </p>
              <div className="flex items-center gap-2 mb-4">
                <p className="text-xs text-grappler-500">
                  Sorted by match score — how well each exercise replaces the current one
                </p>
                {activeEquipmentProfile !== 'gym' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 whitespace-nowrap flex-shrink-0">
                    {DEFAULT_EQUIPMENT_PROFILES.find(p => p.name === activeEquipmentProfile)?.label || activeEquipmentProfile}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {recommendations.length > 0 ? recommendations.map((rec) => {
                  const altHistory = getAltHistory(rec.exercise.id);
                  return (
                    <button
                      key={rec.exercise.id}
                      onClick={() => handleSwapExercise(rec.exercise.id, rec.exercise.name)}
                      className="w-full p-3 rounded-xl border border-grappler-700 hover:border-primary-500 text-left transition-all group"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-semibold text-grappler-100 group-hover:text-primary-300 transition-colors">
                          {rec.exercise.name}
                        </p>
                        <span className={cn(
                          'text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2',
                          rec.matchScore >= 80 ? 'bg-green-500/20 text-green-400' :
                          rec.matchScore >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-grappler-700 text-grappler-400'
                        )}>
                          {rec.matchScore}%
                        </span>
                      </div>

                      {/* Reason */}
                      {rec.reasons.length > 0 && (
                        <p className="text-xs text-grappler-400 mb-1.5">
                          {rec.reasons[0]}
                        </p>
                      )}

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {rec.tags.slice(0, 4).map((tag, i) => (
                          <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-grappler-700/80 text-grappler-300">
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Previous performance if available */}
                      {altHistory && (
                        <div className="flex items-center gap-1 mt-1">
                          <TrendingUp className="w-3 h-3 text-primary-400" />
                          <p className="text-xs text-primary-400">
                            You did {altHistory.weight} {weightUnit} x {altHistory.reps} on {altHistory.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      )}

                      {/* Muscle info */}
                      <p className="text-xs text-grappler-500 mt-1">
                        {rec.exercise.primaryMuscles.join(', ')}
                        {rec.exercise.secondaryMuscles.length > 0 && (
                          <span> + {rec.exercise.secondaryMuscles.slice(0, 2).join(', ')}</span>
                        )}
                      </p>
                    </button>
                  );
                }) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-grappler-400 mb-3">
                      No alternatives match your {DEFAULT_EQUIPMENT_PROFILES.find(p => p.name === activeEquipmentProfile)?.label || 'current'} equipment
                    </p>
                    {activeEquipmentProfile !== 'gym' && (
                      <button
                        onClick={() => {
                          // Temporarily show unfiltered results
                          setSwapShowAll(true);
                        }}
                        className="text-xs text-primary-400 hover:text-primary-300 underline transition-colors"
                      >
                        Show all exercises (ignoring equipment)
                      </button>
                    )}
                  </div>
                )}
                {/* Show-all unfiltered results when user clicks fallback */}
                {recommendations.length === 0 && swapShowAll && (() => {
                  const allRecs = user ? getRecommendedAlternatives(currentExercise.exerciseId, user.equipment, 8) : [];
                  return allRecs.map((rec) => (
                    <button
                      key={rec.exercise.id}
                      onClick={() => handleSwapExercise(rec.exercise.id, rec.exercise.name)}
                      className="w-full p-3 rounded-xl border border-yellow-500/30 hover:border-primary-500 text-left transition-all group"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-semibold text-grappler-100 group-hover:text-primary-300 transition-colors">
                          {rec.exercise.name}
                        </p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 flex-shrink-0 ml-2">
                          Needs equipment
                        </span>
                      </div>
                      <p className="text-xs text-grappler-500 mt-1">
                        {rec.exercise.primaryMuscles.join(', ')}
                      </p>
                    </button>
                  ));
                })()}
              </div>

              <button
                onClick={() => { setShowSwapModal(false); setSwapShowAll(false); }}
                className="btn btn-secondary btn-md w-full mt-4"
              >
                Keep Current Exercise
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Exercise Modal */}
      <AnimatePresence>
        {showAddExerciseModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="card p-6 w-full max-w-md max-h-[85vh] flex flex-col"
            >
              <h2 className="text-lg font-bold text-grappler-50 mb-3">Add Exercise</h2>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grappler-500" />
                <input
                  type="text"
                  value={addExerciseSearch}
                  onChange={(e) => setAddExerciseSearch(e.target.value)}
                  placeholder="Search exercises..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-grappler-800 border border-grappler-700 text-sm text-grappler-100 placeholder-grappler-500 focus-visible:outline-none focus-visible:border-primary-500"
                  autoFocus
                />
              </div>

              {/* Muscle filter chips */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {['all', 'chest', 'back', 'shoulders', 'quadriceps', 'hamstrings', 'glutes', 'biceps', 'triceps', 'core'].map(muscle => (
                  <button
                    key={muscle}
                    onClick={() => setAddExerciseFilter(muscle)}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full transition-colors capitalize',
                      addExerciseFilter === muscle
                        ? 'bg-primary-500 text-white'
                        : 'bg-grappler-700 text-grappler-400 hover:bg-grappler-600'
                    )}
                  >
                    {muscle === 'all' ? 'All' : muscle}
                  </button>
                ))}
              </div>

              {/* Exercise list */}
              <div className="overflow-y-auto flex-1 space-y-1.5 min-h-0">
                {addExerciseList.length > 0 ? addExerciseList.slice(0, 30).map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => {
                      addBonusExercise(ex, 3, 10);
                      setShowAddExerciseModal(false);
                      // Navigate to the newly added exercise
                      setTimeout(() => {
                        setCurrentExerciseIndex(activeWorkout.session.exercises.length);
                        setCurrentSetIndex(0);
                      }, 50);
                    }}
                    className="w-full p-3 rounded-xl border border-grappler-700 hover:border-primary-500 text-left transition-all group"
                  >
                    <p className="font-semibold text-sm text-grappler-100 group-hover:text-primary-300 transition-colors">
                      {ex.name}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-grappler-700/80 text-grappler-400 capitalize">
                        {ex.category}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-grappler-700/80 text-grappler-400 capitalize">
                        {ex.movementPattern}
                      </span>
                    </div>
                    <p className="text-xs text-grappler-500 mt-1 capitalize">
                      {ex.primaryMuscles.join(', ')}
                    </p>
                  </button>
                )) : (
                  <p className="text-sm text-grappler-400 text-center py-6">
                    No exercises found
                  </p>
                )}
              </div>

              <button
                onClick={() => setShowAddExerciseModal(false)}
                className="btn btn-secondary btn-md w-full mt-4"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Exercise History Modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowHistoryModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-grappler-900 rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-hidden"
            >
              {/* Handle bar */}
              <div className="flex justify-center py-3">
                <div className="w-12 h-1.5 bg-grappler-700 rounded-full" />
              </div>

              <div className="px-5 pb-8 overflow-y-auto max-h-[calc(85vh-3rem)]">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-grappler-50">{currentExercise.exercise.name}</h2>
                    <p className="text-xs text-grappler-400">Exercise History</p>
                  </div>
                  <button
                    onClick={() => setShowHistoryModal(false)}
                    className="p-2 text-grappler-400 hover:text-grappler-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* All-Time Best Card */}
                {extendedHistory.allTimeBest && (
                  <div className="bg-gradient-to-r from-yellow-500/20 to-blue-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-yellow-500/30 rounded-xl flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-xs text-yellow-400/80 uppercase tracking-wide">All-Time Best</p>
                        <p className="text-xl font-bold text-yellow-300">
                          {extendedHistory.allTimeBest.weight} {weightUnit} x {extendedHistory.allTimeBest.reps}
                        </p>
                        <p className="text-xs text-grappler-400">
                          Est. 1RM: {Math.round(extendedHistory.allTimeBest.estimated1RM)} {weightUnit} •{' '}
                          {extendedHistory.allTimeBest.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Progress Chart */}
                {extendedHistory.sessions.length >= 2 && (
                  <div className="bg-grappler-800/50 rounded-xl p-4 mb-4">
                    <p className="text-xs text-grappler-400 uppercase tracking-wide mb-3">Estimated 1RM Progression</p>
                    <div className="h-32 flex items-end gap-1">
                      {(() => {
                        const reversed = [...extendedHistory.sessions].reverse();
                        const maxE1RM = Math.max(...reversed.map(s => s.estimated1RM));
                        const minE1RM = Math.min(...reversed.map(s => s.estimated1RM));
                        const range = maxE1RM - minE1RM || 1;

                        return reversed.map((session, i) => {
                          const heightPct = ((session.estimated1RM - minE1RM) / range) * 70 + 30; // 30-100% height
                          const isLatest = i === reversed.length - 1;
                          const isPeak = session.estimated1RM === maxE1RM;

                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                              <div
                                className={cn(
                                  'w-full rounded-t-md transition-all',
                                  isPeak ? 'bg-yellow-500' : isLatest ? 'bg-primary-500' : 'bg-grappler-600'
                                )}
                                style={{ height: `${heightPct}%` }}
                              />
                              <p className="text-xs text-grappler-500 truncate w-full text-center">
                                {session.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                          );
                        });
                      })()}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-grappler-500">
                      <span>Oldest</span>
                      <span>Most Recent</span>
                    </div>
                  </div>
                )}

                {/* Session List */}
                <div className="space-y-2">
                  <p className="text-xs text-grappler-400 uppercase tracking-wide mb-2">
                    Recent Sessions ({extendedHistory.sessions.length})
                  </p>
                  {extendedHistory.sessions.map((session, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg',
                        i === 0 ? 'bg-primary-500/10 border border-primary-500/30' : 'bg-grappler-800/50'
                      )}
                    >
                      <div>
                        <p className={cn(
                          'text-sm font-medium',
                          i === 0 ? 'text-primary-300' : 'text-grappler-200'
                        )}>
                          {session.weight} {weightUnit} x {session.reps}
                        </p>
                        <p className="text-xs text-grappler-500">
                          {session.sets} sets @ RPE {session.rpe}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-grappler-400">
                          {session.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-xs text-grappler-500">
                          e1RM: {Math.round(session.estimated1RM)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {extendedHistory.sessions.length === 0 && (
                    <p className="text-sm text-grappler-500 text-center py-6">
                      No history yet for this exercise
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-grappler-900/90 backdrop-blur-xl border-b border-grappler-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => {
            if (completedSets > 0) {
              setShowCancelConfirm(true);
            } else {
              cancelWorkout();
            }
          }} className="btn btn-ghost btn-sm">
            <X className="w-5 h-5" />
          </button>
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
        <p className="text-xs text-grappler-500 mt-1 text-center">
          {completedSets}/{totalSets} sets completed
        </p>
      </header>

      {/* Rest Timer — Full Overlay or Minimized Floating Bar */}
      <AnimatePresence>
        {isResting && !restMinimized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-grappler-900/95 flex flex-col items-center justify-center"
          >
            {/* Minimize button */}
            <button
              onClick={() => setRestMinimized(true)}
              className="absolute top-4 right-4 safe-area-top flex items-center gap-1.5 px-3 py-2 rounded-xl bg-grappler-700/80 border border-grappler-600/50 text-grappler-200 hover:bg-grappler-600/80 active:scale-95 transition-all"
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
                  strokeDashoffset={2 * Math.PI * 96 * (1 - restTimer / Math.max(currentExercise.prescription.restSeconds, 1))}
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
                <p className="text-xs text-grappler-500 mt-1">
                  of {Math.floor(currentExercise.prescription.restSeconds / 60)}:{(currentExercise.prescription.restSeconds % 60).toString().padStart(2, '0')}
                </p>
              </div>
            </div>

            {/* Weight bump suggestion — shown inside rest overlay */}
            {weightSuggestion && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 mx-6 bg-primary-500/15 border border-primary-500/30 rounded-xl p-3 flex items-center justify-between gap-3 max-w-sm"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <TrendingUp className="w-4 h-4 text-primary-400 flex-shrink-0" />
                  <p className="text-xs text-primary-300">{weightSuggestion.message}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
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
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* RPE Auto-Regulator suggestion */}
            {rpeRegulation && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'mb-4 mx-6 rounded-xl p-3 flex items-center justify-between gap-3 max-w-sm border',
                  rpeRegulation.type === 'drop'
                    ? 'bg-orange-500/15 border-orange-500/30'
                    : 'bg-emerald-500/15 border-emerald-500/30'
                )}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {rpeRegulation.type === 'drop'
                    ? <ArrowDown className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    : <ArrowUp className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                  <div className="min-w-0">
                    <p className={cn('text-xs font-medium', rpeRegulation.type === 'drop' ? 'text-orange-300' : 'text-emerald-300')}>
                      {rpeRegulation.message}
                    </p>
                    <p className="text-[10px] text-grappler-500 mt-0.5">{rpeRegulation.reason}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => {
                      setExactValue('weight', rpeRegulation.suggestedWeight);
                      setRpeRegulation(null);
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium text-white',
                      rpeRegulation.type === 'drop' ? 'bg-orange-500' : 'bg-emerald-500'
                    )}
                  >
                    {rpeRegulation.suggestedWeight} {weightUnit}
                  </button>
                  <button
                    onClick={() => setRpeRegulation(null)}
                    className="text-grappler-500 hover:text-grappler-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Volume tracker during rest */}
            <div className="flex items-center gap-4 mb-4">
              <div className="text-center">
                <p className="text-lg font-bold text-grappler-200">{totalVolumeCompleted.toLocaleString()}</p>
                <p className="text-xs text-grappler-500">Volume ({weightUnit})</p>
              </div>
              <div className="w-px h-8 bg-grappler-700" />
              <div className="text-center">
                <p className="text-lg font-bold text-grappler-200">{completedSets}/{totalSets}</p>
                <p className="text-xs text-grappler-500">Sets</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={skipRest} className="btn btn-secondary btn-lg px-8">
                Skip Rest
              </button>
              {undoInfo && (
                <button onClick={undoLastSet} className="btn btn-secondary btn-lg px-4" title="Undo last set">
                  <RotateCcw className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* What's next during rest */}
            {!isLastSet && (
              <div className="mt-6 text-center">
                <p className="text-xs text-grappler-500 mb-1">Up Next</p>
                <p className="text-sm font-medium text-grappler-200">
                  Set {currentSetIndex + 2} of {currentLog.sets.length}
                </p>
                <p className="text-xs text-grappler-500">
                  {currentExercise.exercise.name} &middot; {currentExercise.prescription.targetReps} reps
                </p>
              </div>
            )}
            {isLastSet && !allExercisesDone && (
              <div className="mt-6 text-center">
                <p className="text-xs text-grappler-500 mb-1">Up Next</p>
                <p className="text-sm font-medium text-grappler-200">
                  {activeWorkout.session.exercises[currentExerciseIndex]?.exercise.name}
                </p>
                <p className="text-xs text-grappler-500">
                  {activeWorkout.session.exercises[currentExerciseIndex]?.sets} sets x{' '}
                  {activeWorkout.session.exercises[currentExerciseIndex]?.prescription.targetReps} reps
                </p>
              </div>
            )}
            {/* Form Video + Swap for next exercise — shown during rest after last set */}
            {lastCompletedExerciseIndex !== null && !allExercisesDone && (
              <div className="mt-4 flex items-center justify-center gap-2">
                {activeWorkout.session.exercises[currentExerciseIndex]?.exercise.videoUrl && (
                  <a
                    href={activeWorkout.session.exercises[currentExerciseIndex].exercise.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 transition-all text-red-400 hover:text-red-300"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Form Video</span>
                  </a>
                )}
                <button
                  onClick={() => setShowSwapModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-grappler-800 hover:bg-grappler-700 border border-grappler-700 hover:border-primary-500/50 transition-all text-grappler-400 hover:text-primary-400"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Swap Exercise</span>
                </button>
              </div>
            )}
            {allExercisesDone && (
              <div className="mt-6 text-center">
                <p className="text-sm font-medium text-green-400">
                  All exercises done — ready to finish!
                </p>
              </div>
            )}
            {isLastExercise && !allExercisesDone && hasIncompleteExercises && (
              <div className="mt-4 text-center">
                <p className="text-xs text-yellow-400">
                  Some exercises still have incomplete sets
                </p>
              </div>
            )}

            {/* Add Extra Set option — shown after completing last set of an exercise */}
            {lastCompletedExerciseIndex !== null && (
              <button
                onClick={() => addExtraSet(lastCompletedExerciseIndex)}
                className="mt-5 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Extra Set — {activeWorkout.exerciseLogs[lastCompletedExerciseIndex]?.exerciseName}
              </button>
            )}

            {/* Corner Coach Messages during rest */}
            {coachMessages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-20 left-4 right-4 space-y-2"
              >
                {coachMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'rounded-xl p-3.5 border backdrop-blur-sm flex items-start gap-3',
                      msg.tone === 'hype' ? 'bg-emerald-500/15 border-emerald-500/30' :
                      msg.tone === 'warning' ? 'bg-red-500/15 border-red-500/30' :
                      msg.tone === 'celebrate' ? 'bg-yellow-500/15 border-yellow-500/30' :
                      msg.tone === 'tactical' ? 'bg-blue-500/15 border-blue-500/30' :
                      'bg-grappler-800/80 border-grappler-700/50'
                    )}
                  >
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                      msg.tone === 'hype' ? 'bg-emerald-500/20' :
                      msg.tone === 'warning' ? 'bg-red-500/20' :
                      msg.tone === 'celebrate' ? 'bg-yellow-500/20' :
                      msg.tone === 'tactical' ? 'bg-blue-500/20' :
                      'bg-grappler-700/50'
                    )}>
                      {msg.tone === 'celebrate' ? <Trophy className="w-3.5 h-3.5 text-yellow-400" /> :
                       msg.tone === 'warning' ? <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> :
                       msg.tone === 'hype' ? <Zap className="w-3.5 h-3.5 text-emerald-400" /> :
                       msg.tone === 'tactical' ? <Brain className="w-3.5 h-3.5 text-blue-400" /> :
                       <Lightbulb className="w-3.5 h-3.5 text-grappler-400" />}
                    </div>
                    <p className={cn(
                      'text-sm flex-1',
                      msg.tone === 'hype' ? 'text-emerald-300' :
                      msg.tone === 'warning' ? 'text-red-300' :
                      msg.tone === 'celebrate' ? 'text-yellow-300' :
                      msg.tone === 'tactical' ? 'text-blue-300' :
                      'text-grappler-300'
                    )}>{msg.text}</p>
                    <button
                      onClick={() => setCoachMessages(prev => prev.filter(m => m.id !== msg.id))}
                      className="text-grappler-600 hover:text-grappler-400 flex-shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Tip during rest (hidden when coach messages are showing) */}
            {showTip && coachMessages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-20 left-4 right-4 card p-4"
              >
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                  <p className="text-sm text-grappler-300">{tip.content}</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimized Rest Timer — subtle floating pill */}
      <AnimatePresence>
        {isResting && restMinimized && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed top-4 right-4 z-50 safe-area-top"
          >
            <button
              onClick={() => setRestMinimized(false)}
              className="flex items-center gap-2.5 pl-1.5 pr-3.5 py-1.5 rounded-full bg-grappler-900/90 backdrop-blur-lg border border-grappler-700/50 shadow-lg shadow-black/30 active:scale-95 transition-transform"
            >
              {/* Mini circular progress timer */}
              <div className="relative w-9 h-9 flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(100,116,139,0.2)" strokeWidth="2.5" />
                  <circle
                    cx="18" cy="18" r="15" fill="none"
                    strokeWidth="2.5" strokeLinecap="round"
                    className={cn(
                      'transition-colors',
                      restTimer <= 10 && restTimer > 0 ? 'stroke-red-400' : restTimer <= 30 && restTimer > 0 ? 'stroke-yellow-400' : 'stroke-primary-400'
                    )}
                    strokeDasharray={2 * Math.PI * 15}
                    strokeDashoffset={2 * Math.PI * 15 * (1 - restTimer / Math.max(currentExercise.prescription.restSeconds, 1))}
                  />
                </svg>
                <span className={cn(
                  'absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular-nums',
                  restTimer <= 10 && restTimer > 0 ? 'text-red-400' : restTimer <= 30 && restTimer > 0 ? 'text-yellow-400' : 'text-primary-400'
                )}>
                  {restTimer}
                </span>
              </div>
              <span className={cn(
                'text-xs font-semibold',
                restTimer <= 10 && restTimer > 0 ? 'text-red-400' : 'text-grappler-300'
              )}>
                {restTimer <= 10 && restTimer > 0 ? 'Go!' : 'Rest'}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="p-4 pb-32">
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
                setCurrentExerciseIndex(currentExerciseIndex - 1);
                setCurrentSetIndex(0);
              }
            }}
            disabled={currentExerciseIndex === 0}
            className="btn btn-ghost btn-sm"
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
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={() => {
              if (currentExerciseIndex < activeWorkout.session.exercises.length - 1) {
                setCurrentExerciseIndex(currentExerciseIndex + 1);
                setCurrentSetIndex(0);
              }
            }}
            disabled={currentExerciseIndex === activeWorkout.session.exercises.length - 1}
            className="btn btn-ghost btn-sm"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Exercise Card */}
        <motion.div
          key={currentExerciseIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card p-6 mb-6"
        >
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-grappler-50">
                {currentExercise.exercise.name}
              </h2>
            </div>
            <div className="flex items-center justify-center gap-2 mt-1">
              {currentExercise.exercise.videoUrl && (
                <a
                  href={currentExercise.exercise.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 transition-all text-red-400 hover:text-red-300"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Form Video</span>
                </a>
              )}
              <button
                onClick={() => setShowSwapModal(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-grappler-800 hover:bg-grappler-700 border border-grappler-700 hover:border-primary-500/50 transition-all text-grappler-400 hover:text-primary-400"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Swap Exercise</span>
              </button>
              <button
                onClick={handleSkipExercise}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-grappler-800 hover:bg-grappler-700 border border-grappler-700 hover:border-blue-500/50 transition-all text-grappler-400 hover:text-blue-400"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Skip</span>
              </button>
            </div>
            {/* Workout Type Context Explanation */}
            {activeWorkout?.session.type && (
              <div className={cn(
                'mt-2 px-3 py-1.5 rounded-lg text-xs text-center',
                activeWorkout.session.type === 'strength' && 'bg-red-500/10 text-red-400',
                activeWorkout.session.type === 'hypertrophy' && 'bg-purple-500/10 text-purple-400',
                activeWorkout.session.type === 'power' && 'bg-blue-500/10 text-blue-400'
              )}>
                {activeWorkout.session.type === 'strength' && (
                  <>Heavy weight, low reps ({currentExercise.prescription.minReps}-{currentExercise.prescription.maxReps}). Build max strength. Full recovery between sets.</>
                )}
                {activeWorkout.session.type === 'hypertrophy' && (
                  <>Moderate weight, controlled reps ({currentExercise.prescription.minReps}-{currentExercise.prescription.maxReps}). Build muscle. Focus on the squeeze and stretch.</>
                )}
                {activeWorkout.session.type === 'power' && (
                  <>Explosive reps ({currentExercise.prescription.minReps}-{currentExercise.prescription.maxReps}). Move the weight fast. Quality over fatigue.</>
                )}
              </div>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-sm text-grappler-300">
                {currentExercise.sets} sets x {currentExercise.prescription.targetReps} reps
              </span>
              <span className="px-2 py-0.5 rounded-md bg-primary-500/15 text-sm font-semibold text-primary-400">
                RPE {currentExercise.prescription.rpe}
              </span>
              {currentExercise.prescription.percentageOf1RM && (
                <span className="text-sm text-primary-400">~{currentExercise.prescription.percentageOf1RM}% 1RM</span>
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
            <p className="text-xs text-grappler-500 mt-1">
              Rest: {Math.floor(currentExercise.prescription.restSeconds / 60)}:{(currentExercise.prescription.restSeconds % 60).toString().padStart(2, '0')} between sets
            </p>

            {/* RPE-based weight suggestion */}
            {rpeSuggestion && (
              <div className="mt-3 px-4 py-3 bg-primary-500/10 border border-primary-500/30 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
                      <Lightbulb className="w-4 h-4 text-primary-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary-300">{rpeSuggestion.suggested} {weightUnit}</p>
                      <p className="text-xs text-grappler-500">suggested weight</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setExactValue('weight', rpeSuggestion.suggested);
                    }}
                    className="text-sm font-medium text-primary-400 bg-primary-500/20 px-3 py-1.5 rounded-lg hover:bg-primary-500/30 transition-colors"
                  >
                    Use
                  </button>
                </div>
                <p className="text-xs text-grappler-400 mt-2">
                  Last session: {rpeSuggestion.lastWeight}{weightUnit} @ RPE {rpeSuggestion.lastRPE}
                  {rpeSuggestion.targetRPE !== rpeSuggestion.lastRPE && ` — adjusted to RPE ${rpeSuggestion.targetRPE}`}
                </p>
              </div>
            )}

            {/* Per-exercise history from last session */}
            {previousPerformance ? (
              <div className="mt-2 flex items-center gap-2">
                <div className="px-3 py-1.5 bg-grappler-800/60 rounded-lg">
                  <p className="text-xs text-grappler-400">
                    Last: <span className="text-grappler-200 font-medium">{previousPerformance.weight} {weightUnit} x {previousPerformance.reps}</span>
                    <span className="text-grappler-500 ml-1">@ RPE {previousPerformance.rpe}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-grappler-800/50"
                >
                  <TrendingUp className="w-3 h-3" />
                  Full History
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowHistoryModal(true)}
                className="mt-2 text-xs text-grappler-500 hover:text-grappler-400 flex items-center gap-1 transition-colors"
              >
                <Clock className="w-3 h-3" />
                View History
              </button>
            )}

            {/* Full exercise history panel */}
            <AnimatePresence>
              {showHistory && exerciseHistory.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-2 overflow-hidden"
                >
                  <div className="bg-grappler-800/40 rounded-lg p-3 space-y-2">
                    <p className="text-xs text-grappler-500 uppercase tracking-wide font-medium">Last {exerciseHistory.length} sessions</p>
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
                        <p className="text-xs text-grappler-500">
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
                  <p className="text-xs text-grappler-500 mt-0.5">{firstTimeEstimate.source}</p>
                </div>
              ) : (
                <div className="mt-2 px-3 py-1.5 bg-grappler-800/60 rounded-lg">
                  <p className="text-xs text-grappler-400">
                    No history yet. Start with a weight you can handle for {currentExercise.prescription.targetReps} reps
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

          {/* Set Indicator */}
          <div className="flex justify-center gap-2.5 mb-2">
            {currentLog.sets.map((set, i) => (
              <button
                key={i}
                onClick={() => setCurrentSetIndex(i)}
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
          {/* Per-set history from last session */}
          {previousSetHistory && previousSetHistory.length > 0 ? (
            <p className="text-center text-xs text-grappler-500 mb-6">
              Last: {previousSetHistory.slice(0, currentLog.sets.length).map((s, i) => (
                <span key={i} className={cn(i === currentSetIndex && 'text-grappler-300 font-medium')}>
                  {i > 0 && ' · '}{s.weight}×{s.reps}
                </span>
              ))}
            </p>
          ) : <div className="mb-4" />}

          {/* PR Detection Banner */}
          <AnimatePresence>
            {prDetection.isPotentialPR && currentSet.weight > 0 && currentSet.reps > 0 && !currentSet.completed && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="mb-4 bg-gradient-to-r from-yellow-500/20 to-blue-500/20 border border-yellow-500/50 rounded-xl p-3 flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-yellow-500/30 rounded-lg flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-yellow-300">PR Territory!</p>
                  <p className="text-xs text-yellow-400/80">
                    {prDetection.isFirstTime
                      ? 'First time doing this exercise — set a benchmark!'
                      : `Est. 1RM: ${Math.round(prDetection.currentE1RM)} ${weightUnit} (prev best: ${Math.round(prDetection.bestE1RM)})`}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input Fields */}
          <div className="space-y-4">
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
                )}>Weight ({weightUnit})</label>
                {currentSet.weight > 0 && previousPerformance && (
                  <span className="text-xs text-primary-400">
                    {currentSet.weight > previousPerformance.weight ? '+' : ''}{Math.round(currentSet.weight - previousPerformance.weight)} vs last
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-2">
                <button
                  onClick={() => updateSetValue('weight', -weightIncrement)}
                  className="w-14 h-14 rounded-xl bg-grappler-700 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Minus className="w-6 h-6 text-grappler-300" />
                </button>
                <input
                  type="number"
                  inputMode="decimal"
                  value={currentSet.weight || ''}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setExactValue('weight', parseFloat(e.target.value) || 0)}
                  className={cn(
                    'w-28 text-center text-4xl font-black bg-transparent focus-visible:outline-none placeholder:text-grappler-600',
                    prDetection.isPotentialPR && currentSet.weight > 0 && currentSet.reps > 0 && !currentSet.completed
                      ? 'text-yellow-300'
                      : 'text-grappler-50'
                  )}
                />
                <button
                  onClick={() => updateSetValue('weight', weightIncrement)}
                  className="w-14 h-14 rounded-xl bg-grappler-700 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Plus className="w-6 h-6 text-grappler-300" />
                </button>
              </div>
            </div>

            {/* Reps */}
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
                )}>{isTimeBased ? 'Seconds' : 'Reps'}</label>
                <span className="text-sm font-medium text-grappler-400">
                  Target: {isTimeBased
                    ? `${currentExercise.prescription.targetReps}s`
                    : `${currentExercise.prescription.minReps}-${currentExercise.prescription.maxReps}`
                  }
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <button
                  onClick={() => updateSetValue('reps', -1)}
                  className="w-14 h-14 rounded-xl bg-grappler-700 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Minus className="w-6 h-6 text-grappler-300" />
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  value={currentSet.reps || ''}
                  placeholder="0"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setExactValue('reps', parseInt(e.target.value) || 0)}
                  className={cn(
                    'w-28 text-center text-4xl font-black bg-transparent focus-visible:outline-none placeholder:text-grappler-600',
                    prDetection.isPotentialPR && currentSet.weight > 0 && currentSet.reps > 0 && !currentSet.completed
                      ? 'text-yellow-300'
                      : 'text-grappler-50'
                  )}
                />
                <button
                  onClick={() => updateSetValue('reps', 1)}
                  className="w-14 h-14 rounded-xl bg-grappler-700 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Plus className="w-6 h-6 text-grappler-300" />
                </button>
              </div>
            </div>

            {/* RPE */}
            <div className="bg-grappler-800/50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <label className="text-xs text-grappler-400 uppercase tracking-wide">RPE (1-10)</label>
                <button
                  onClick={() => setShowRPEInfo(prev => !prev)}
                  className="text-grappler-500 hover:text-grappler-300 transition-colors"
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
                <p className="text-xs text-grappler-500 text-center mt-2">
                  Target RPE {currentExercise.prescription.rpe} = {+(10 - currentExercise.prescription.rpe).toFixed(1)} reps in reserve
                </p>
              )}
            </div>
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
                    'rounded-2xl border p-4 bg-gradient-to-br transition-all duration-300',
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
                        <span className="text-xs text-grappler-500">TUT: {formatTUT(tempoState.tut)}</span>
                      </div>
                      <button
                        onClick={stopTempoMetronome}
                        className="text-xs text-grappler-500 hover:text-grappler-300 transition-colors"
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
                            <p className="text-grappler-500 text-[10px] capitalize">{phase === 'lockout' ? 'top' : phase === 'pause' ? 'bottom' : phase}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  key="tempo-start"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={startTempo}
                  className="w-full rounded-xl border border-grappler-700 bg-grappler-800/50 p-3 flex items-center justify-center gap-2 hover:bg-grappler-700/50 transition-colors active:scale-[0.98]"
                >
                  <Timer className="w-4 h-4 text-primary-400" />
                  <span className="text-sm font-medium text-grappler-300">Start Tempo Guide</span>
                  <span className="text-xs text-grappler-500 ml-1">{currentExercise.prescription.tempo}</span>
                </motion.button>
              )}
            </AnimatePresence>
          )}

          {/* Complete Set Button */}
          <button
            onClick={completeSet}
            disabled={currentSet.completed}
            className={cn(
              'btn btn-lg w-full mt-6 gap-2',
              currentSet.completed ? 'btn-secondary opacity-50' : 'btn-primary'
            )}
          >
            {currentSet.completed ? (
              <>
                <Check className="w-5 h-5" />
                Set Completed
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Complete Set
              </>
            )}
          </button>
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

        {/* Cues */}
        {currentExercise.exercise.cues.length > 0 && (
          <div className="card p-4">
            <h3 className="font-medium text-grappler-200 text-sm mb-2">Form Cues</h3>
            <ul className="text-sm text-grappler-400 space-y-1">
              {currentExercise.exercise.cues.slice(0, 3).map((cue, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
                  {cue}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Up Next / Workout Progress Hint */}
        <div className="card p-4 mt-4">
          <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <ListChecks className="w-3.5 h-3.5" />
            Workout Progress
          </h3>
          <div className="space-y-2">
            {activeWorkout.session.exercises.map((ex, i) => {
              const log = activeWorkout.exerciseLogs[i];
              const doneSets = log.sets.filter(s => s.completed).length;
              const isCurrent = i === currentExerciseIndex;
              const isDone = doneSets === log.sets.length;
              return (
                <button
                  key={i}
                  onClick={() => { setCurrentExerciseIndex(i); setCurrentSetIndex(0); }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all',
                    isCurrent && 'bg-primary-500/10 border border-primary-500/30',
                    isDone && !isCurrent && 'opacity-50',
                    !isCurrent && !isDone && 'hover:bg-grappler-800/50',
                  )}
                >
                  <div className={cn(
                    'w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0',
                    isDone ? 'bg-green-500/20 text-green-400' :
                    isCurrent ? 'bg-primary-500/20 text-primary-400' :
                    'bg-grappler-700/50 text-grappler-500'
                  )}>
                    {isDone ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm truncate',
                      isCurrent ? 'text-grappler-100 font-medium' :
                      isDone ? 'text-grappler-500 line-through' :
                      'text-grappler-400'
                    )}>
                      {ex.exercise.name}
                    </p>
                    <p className="text-xs text-grappler-500">
                      {doneSets}/{log.sets.length} sets
                      {isCurrent && !isDone && (
                        <span className="text-primary-400 ml-1">— in progress</span>
                      )}
                      {isDone && (
                        <span className="text-green-400 ml-1">— complete</span>
                      )}
                    </p>
                  </div>
                  {i === currentExerciseIndex + 1 && !isDone && (
                    <span className="text-xs bg-grappler-700 text-grappler-300 px-2 py-0.5 rounded-full flex-shrink-0">
                      up next
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </main>

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
              <h2 className="text-lg font-bold text-grappler-50 mb-2">Cancel Workout?</h2>
              <p className="text-sm text-grappler-400 mb-6">
                You have {completedSets} completed set{completedSets !== 1 ? 's' : ''}. All progress will be lost.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="btn btn-secondary btn-md flex-1"
                >
                  Keep Going
                </button>
                <button
                  onClick={() => { setShowCancelConfirm(false); cancelWorkout(); }}
                  className="btn btn-md flex-1 bg-red-500 hover:bg-red-600 text-white"
                >
                  Discard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Finish Workout Modal */}
      <AnimatePresence>
        {showFinishModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="card p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
            >
              <h2 className="text-xl font-bold text-grappler-50 mb-4">Finish Workout</h2>

              <div className="space-y-4">
                {/* Overall RPE */}
                <div>
                  <label className="text-sm text-grappler-400 mb-2 block">
                    Session RPE
                  </label>
                  <div className="flex gap-2">
                    {[5, 6, 7, 8, 9, 10].map((rpe) => (
                      <button
                        key={rpe}
                        onClick={() => setFeedback({ ...feedback, overallRPE: rpe })}
                        className={cn(
                          'flex-1 py-2 rounded-lg font-medium text-sm',
                          feedback.overallRPE === rpe
                            ? 'bg-primary-500 text-white'
                            : 'bg-grappler-700 text-grappler-400'
                        )}
                      >
                        {rpe}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Performance vs Expectations */}
                <div>
                  <label className="text-sm text-grappler-400 mb-2 block">
                    How was performance vs expectations?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: 'worse_than_expected', label: 'Worse' },
                      { value: 'as_expected', label: 'As Expected' },
                      { value: 'better_than_expected', label: 'Better' }
                    ] as const).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setFeedback({ ...feedback, overallPerformance: opt.value })}
                        className={cn(
                          'py-2 px-2 rounded-lg text-xs font-medium',
                          feedback.overallPerformance === opt.value
                            ? opt.value === 'worse_than_expected' ? 'bg-red-500 text-white' :
                              opt.value === 'better_than_expected' ? 'bg-green-500 text-white' :
                              'bg-primary-500 text-white'
                            : 'bg-grappler-700 text-grappler-400'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Soreness */}
                <div>
                  <label className="text-sm text-grappler-400 mb-2 block">
                    Soreness (1-10)
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={feedback.soreness}
                    onChange={(e) => setFeedback({ ...feedback, soreness: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-grappler-500">
                    <span>Fresh</span>
                    <span>{feedback.soreness}</span>
                    <span>Very Sore</span>
                  </div>
                </div>

                {/* Energy */}
                <div>
                  <label className="text-sm text-grappler-400 mb-2 block">
                    Energy (1-10)
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={feedback.energy}
                    onChange={(e) => setFeedback({ ...feedback, energy: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-grappler-500">
                    <span>Exhausted</span>
                    <span>{feedback.energy}</span>
                    <span>Energized</span>
                  </div>
                </div>

                {/* Mood */}
                <div>
                  <label className="text-sm text-grappler-400 mb-2 block">Mood</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button
                        key={v}
                        onClick={() => setFeedback({ ...feedback, mood: v })}
                        className={cn(
                          'flex-1 py-2 rounded-lg text-sm font-medium',
                          feedback.mood === v
                            ? 'bg-primary-500 text-white'
                            : 'bg-grappler-700 text-grappler-400'
                        )}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-grappler-500 mt-1">
                    <span>Bad</span>
                    <span>Great</span>
                  </div>
                </div>

                {/* Would Repeat */}
                <div className="flex items-center justify-between">
                  <label className="text-sm text-grappler-300">Enjoyed this session?</label>
                  <button
                    onClick={() => setFeedback({ ...feedback, wouldRepeat: !feedback.wouldRepeat })}
                    className={cn(
                      'px-4 py-1.5 rounded-lg text-sm font-medium',
                      feedback.wouldRepeat
                        ? 'bg-green-500 text-white'
                        : 'bg-grappler-700 text-grappler-400'
                    )}
                  >
                    {feedback.wouldRepeat ? 'Yes' : 'No'}
                  </button>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-sm text-grappler-400 mb-2 block">
                    Notes (optional)
                  </label>
                  <textarea
                    value={feedback.notes}
                    onChange={(e) => setFeedback({ ...feedback, notes: e.target.value })}
                    placeholder="How did it go? Any PRs? Issues?"
                    className="input min-h-[80px] resize-none"
                  />
                </div>

                {/* Duration override — show when elapsed time is unrealistically short */}
                {(() => {
                  const elapsedMs = Date.now() - new Date(activeWorkout!.startTime).getTime();
                  const elapsedMin = Math.round(elapsedMs / 1000 / 60);
                  const totalSets = activeWorkout!.exerciseLogs.reduce(
                    (s, ex) => s + ex.sets.filter(set => set.completed).length, 0
                  );
                  const exerciseCount = activeWorkout!.exerciseLogs.length;
                  // Detect retroactive logging: < 15 min with 3+ exercises or 6+ completed sets
                  const isFastLog = elapsedMin < 15 && (exerciseCount >= 3 || totalSets >= 6);
                  if (!isFastLog && durationOverride === null) return null;
                  // Estimate: ~2.5 min per set (includes rest)
                  const estimated = Math.max(20, Math.round(totalSets * 2.5));
                  const currentVal = durationOverride ?? estimated;
                  // Auto-set on first render
                  if (durationOverride === null) {
                    setTimeout(() => setDurationOverride(estimated), 0);
                  }
                  return (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                      <label className="text-sm text-yellow-300 mb-1 block font-medium">
                        Actual workout duration
                      </label>
                      <p className="text-xs text-grappler-500 mb-2">
                        Looks like you logged this after the session. How long did it actually take?
                      </p>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={5}
                          max={300}
                          value={currentVal}
                          onChange={(e) => setDurationOverride(Math.max(5, parseInt(e.target.value) || 5))}
                          className="input w-24 text-center text-lg font-bold"
                        />
                        <span className="text-sm text-grappler-400">minutes</span>
                        <button
                          onClick={() => setDurationOverride(null)}
                          className="ml-auto text-xs text-grappler-500 underline"
                        >
                          Use actual time ({elapsedMin}m)
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowFinishModal(false)}
                  className="btn btn-secondary btn-md flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => completeWorkout({
                    overallRPE: feedback.overallRPE,
                    soreness: feedback.soreness,
                    energy: feedback.energy,
                    notes: feedback.notes,
                    postFeedback: {
                      overallRPE: feedback.overallRPE,
                      overallPerformance: feedback.overallPerformance,
                      soreness: feedback.soreness,
                      energy: feedback.energy,
                      mood: feedback.mood,
                      wouldRepeat: feedback.wouldRepeat,
                      notes: feedback.notes
                    },
                    ...(durationOverride !== null ? { durationOverride } : {})
                  })}
                  className="btn btn-primary btn-md flex-1"
                >
                  Save Workout
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
