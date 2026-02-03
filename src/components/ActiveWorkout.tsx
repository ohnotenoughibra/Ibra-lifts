'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { cn, formatTime } from '@/lib/utils';
import { calculate1RM } from '@/lib/workout-generator';
import { getRandomTip } from '@/lib/knowledge';
import { getAlternativesForExercise, getRecommendedAlternatives, ExerciseRecommendation } from '@/lib/exercises';
import { calculateReadiness, whoopRecoveryToReadiness } from '@/lib/auto-adjust';
import { ExerciseLog, SetLog, PreWorkoutCheckIn, ExerciseFeedback, PostWorkoutFeedback, WeightUnit, WorkoutLog, EquipmentProfileName, DEFAULT_EQUIPMENT_PROFILES } from '@/lib/types';
import { getSuggestedWeight } from '@/lib/auto-adjust';
import { Building2, Home, Backpack } from 'lucide-react';
import Confetti from 'react-confetti';

export default function ActiveWorkout() {
  const {
    activeWorkout, user, updateExerciseLog, completeWorkout, cancelWorkout,
    setPreCheckIn, updateExerciseFeedback, swapExercise, adaptWorkoutToProfile,
    activeEquipmentProfile, latestWhoopData, applyWhoopAdjustment
  } = useAppStore();
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [restTimer, setRestTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [tip, setTip] = useState(getRandomTip());
  const [showPRCelebration, setShowPRCelebration] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showOverview, setShowOverview] = useState(true);
  const [showCheckInSection, setShowCheckInSection] = useState(false);
  const [showExerciseFeedback, setShowExerciseFeedback] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [feedbackExerciseIndex, setFeedbackExerciseIndex] = useState(0);
  const [inlineFeedbackIndex, setInlineFeedbackIndex] = useState<number | null>(null);
  const [weightSuggestion, setWeightSuggestion] = useState<{ message: string; suggestedWeight: number } | null>(null);

  const [whoopApplied, setWhoopApplied] = useState(false);
  const [grapplingToday, setGrapplingToday] = useState<'none' | 'light' | 'moderate' | 'hard'>('none');
  const [showGrapplingQ, setShowGrapplingQ] = useState(true);

  const weightUnit: WeightUnit = user?.weightUnit || 'lbs';
  const weightIncrement = weightUnit === 'kg' ? 2.5 : 5;

  // Compute Whoop readiness for display
  const whoopReadiness = latestWhoopData ? whoopRecoveryToReadiness({
    recoveryScore: latestWhoopData.recoveryScore ?? undefined,
    hrvMs: latestWhoopData.hrv ?? undefined,
    sleepScore: latestWhoopData.sleepScore ?? undefined,
    strainScore: latestWhoopData.strain ?? undefined,
  }) : null;

  // Pre-workout check-in state
  const [checkIn, setCheckIn] = useState<PreWorkoutCheckIn>({
    sleepQuality: 3,
    sleepHours: 7,
    nutrition: 'full_meal',
    stress: 2,
    soreness: 2,
    motivation: 4,
    notes: ''
  });

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

  // Workout timer
  const [elapsedTime, setElapsedTime] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Rest timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isResting && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer(prev => {
          if (prev <= 1) {
            setIsResting(false);
            // Vibrate when rest is done
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate([200, 100, 200, 100, 300]);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isResting, restTimer]);

  if (!activeWorkout) return null;

  const currentExercise = activeWorkout.session.exercises[currentExerciseIndex];
  const currentLog = activeWorkout.exerciseLogs[currentExerciseIndex];
  const currentSet = currentLog.sets[currentSetIndex];

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

  const completeSet = () => {
    const newSets = [...currentLog.sets];
    newSets[currentSetIndex] = { ...newSets[currentSetIndex], completed: true };

    // Check for PR - compare against all previous logs for this exercise
    const estimated1RM = calculate1RM(currentSet.weight, currentSet.reps);
    const workoutLogs = useAppStore.getState().workoutLogs;
    let previousBest1RM = 0;
    for (const log of workoutLogs) {
      for (const ex of log.exercises) {
        if (ex.exerciseId === currentLog.exerciseId && ex.estimated1RM) {
          previousBest1RM = Math.max(previousBest1RM, ex.estimated1RM);
        }
      }
    }
    const isPR = currentSet.weight > 0 && estimated1RM > previousBest1RM && previousBest1RM > 0;

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

    // Start rest timer
    setRestTimer(currentExercise.prescription.restSeconds);
    setIsResting(true);

    // Check if this was the last set of current exercise
    const isLastSetOfExercise = currentSetIndex === currentLog.sets.length - 1;

    if (isLastSetOfExercise) {
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

  const submitPreCheckIn = () => {
    setPreCheckIn(checkIn);
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
    setRestTimer(0);
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
  const isWorkoutComplete = isLastSet && isLastExercise && currentSet.completed;

  // Get readiness for display
  const readiness = activeWorkout.preCheckIn ? calculateReadiness(activeWorkout.preCheckIn) : null;

  // Get alternatives for current exercise (basic list kept for compatibility)
  const alternatives = user ? getAlternativesForExercise(
    currentExercise.exerciseId,
    user.equipment,
    5
  ) : [];

  // Enhanced recommendations with scores and reasons
  const recommendations: ExerciseRecommendation[] = user ? getRecommendedAlternatives(
    currentExercise.exerciseId,
    user.equipment,
    8
  ) : [];

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
            <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-8 text-center">
              <Trophy className="w-16 h-16 text-white mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">NEW PR!</h2>
              <p className="text-white/80">You&apos;re getting stronger!</p>
            </div>
          </motion.div>
        </>
      )}

      {/* Workout Overview Modal */}
      <AnimatePresence>
        {showOverview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-grappler-900 flex flex-col"
          >
            <div className="flex-1 overflow-y-auto p-4 pb-32">
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

              {/* Session Info */}
              <div className={cn(
                'rounded-xl p-5 mb-5 border text-center',
                activeWorkout.session.type === 'strength' && 'bg-red-500/10 border-red-500/30',
                activeWorkout.session.type === 'hypertrophy' && 'bg-purple-500/10 border-purple-500/30',
                activeWorkout.session.type === 'power' && 'bg-orange-500/10 border-orange-500/30',
              )}>
                <h2 className="text-2xl font-black text-grappler-50 mb-1">
                  {activeWorkout.session.name}
                </h2>
                <p className={cn(
                  'text-sm font-medium capitalize mb-3',
                  activeWorkout.session.type === 'strength' && 'text-red-400',
                  activeWorkout.session.type === 'hypertrophy' && 'text-purple-400',
                  activeWorkout.session.type === 'power' && 'text-orange-400',
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
                    ~{Math.round(activeWorkout.session.exercises.reduce((sum, ex) =>
                      sum + (ex.sets * (30 + ex.prescription.restSeconds)), 0) / 60)} min
                  </span>
                </div>
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
                      <p className="text-[10px] text-grappler-500">Recovery</p>
                    </div>
                    <div className="text-center">
                      <Zap className="w-4 h-4 mx-auto mb-0.5 text-blue-400" />
                      <p className="text-lg font-bold text-grappler-100">
                        {latestWhoopData.strain?.toFixed(1) ?? '--'}
                      </p>
                      <p className="text-[10px] text-grappler-500">Strain</p>
                    </div>
                    <div className="text-center">
                      <Moon className="w-4 h-4 mx-auto mb-0.5 text-indigo-400" />
                      <p className="text-lg font-bold text-grappler-100">
                        {latestWhoopData.sleepHours?.toFixed(1) ?? '--'}h
                      </p>
                      <p className="text-[10px] text-grappler-500">Sleep</p>
                    </div>
                    <div className="text-center">
                      <Zap className="w-4 h-4 mx-auto mb-0.5 text-orange-400" />
                      <p className="text-lg font-bold text-grappler-100">
                        {latestWhoopData.caloriesBurned?.toLocaleString() ?? '--'}
                      </p>
                      <p className="text-[10px] text-grappler-500">kcal</p>
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
                          applyWhoopAdjustment();
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
                  'rounded-lg px-3 py-2 mb-4 flex items-center gap-2 text-xs',
                  whoopReadiness?.recommendation === 'reduce'
                    ? 'bg-red-500/10 text-red-300'
                    : whoopReadiness?.recommendation === 'increase'
                      ? 'bg-green-500/10 text-green-300'
                      : 'bg-grappler-800/50 text-grappler-300'
                )}>
                  <Activity className="w-3.5 h-3.5" />
                  Recovery {latestWhoopData.recoveryScore}% &middot; Strain {latestWhoopData.strain?.toFixed(1)} &middot; {latestWhoopData.caloriesBurned} kcal
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
                          if (opt.v === 'hard') {
                            // Hard grappling day — significant reduction
                            const { activeWorkout: aw } = useAppStore.getState();
                            if (aw) {
                              const reduced = aw.session.exercises.map(ex => ({
                                ...ex,
                                sets: Math.max(2, ex.sets - 2),
                                prescription: { ...ex.prescription, rpe: Math.max(5, ex.prescription.rpe - 2) },
                              }));
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
                            }
                          } else if (opt.v === 'moderate') {
                            const { activeWorkout: aw } = useAppStore.getState();
                            if (aw) {
                              const reduced = aw.session.exercises.map(ex => ({
                                ...ex,
                                sets: Math.max(2, ex.sets - 1),
                                prescription: { ...ex.prescription, rpe: Math.max(5, ex.prescription.rpe - 1) },
                              }));
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
                    <p className="text-[10px] text-grappler-500 mt-2">
                      Volume adjusted for {grapplingToday} grappling session
                    </p>
                  )}
                </motion.div>
              )}

              {/* Grappling Applied Banner */}
              {!showGrapplingQ && grapplingToday !== 'none' && (
                <div className="rounded-lg px-3 py-2 mb-4 flex items-center gap-2 text-xs bg-lime-500/10 text-lime-300">
                  <Shield className="w-3.5 h-3.5" />
                  {grapplingToday === 'light' ? 'Light' : grapplingToday === 'moderate' ? 'Moderate' : 'Hard'} grappling planned &mdash; volume adjusted
                </div>
              )}

              {/* Location Quick-Switch */}
              <div className="flex items-center gap-1.5 bg-grappler-800/50 rounded-xl p-1.5 mb-5">
                {DEFAULT_EQUIPMENT_PROFILES.map((profile) => {
                  const IconMap: Record<string, any> = { gym: Building2, home: Home, travel: Backpack };
                  const PIcon = IconMap[profile.name] || Dumbbell;
                  const isActive = activeEquipmentProfile === profile.name;
                  return (
                    <button
                      key={profile.name}
                      onClick={() => adaptWorkoutToProfile(profile.name)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all',
                        isActive
                          ? 'bg-primary-500 text-white shadow-md'
                          : 'text-grappler-400 hover:text-grappler-200 hover:bg-grappler-700/50'
                      )}
                    >
                      <PIcon className="w-3.5 h-3.5" />
                      {profile.label}
                    </button>
                  );
                })}
              </div>

              {/* Exercise List */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-grappler-300 uppercase tracking-wide px-1">
                  Exercise Plan
                </h3>
                {activeWorkout.session.exercises.map((ex, i) => {
                  const prevPerf = getExerciseHistory(ex.exerciseId);
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-grappler-800/60 rounded-xl p-4 border border-grappler-700/50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0',
                            activeWorkout.session.type === 'strength' && 'bg-red-500/20 text-red-400',
                            activeWorkout.session.type === 'hypertrophy' && 'bg-purple-500/20 text-purple-400',
                            activeWorkout.session.type === 'power' && 'bg-orange-500/20 text-orange-400',
                          )}>
                            {i + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-grappler-100">{ex.exercise.name}</p>
                            <p className="text-xs text-grappler-400 mt-0.5">
                              {ex.sets} x {ex.prescription.targetReps} reps @ RPE {ex.prescription.rpe}
                              {ex.prescription.percentageOf1RM && (
                                <span className="text-primary-400 ml-1">~{ex.prescription.percentageOf1RM}% 1RM</span>
                              )}
                            </p>
                            <p className="text-[11px] text-grappler-500 mt-0.5">
                              Rest: {Math.floor(ex.prescription.restSeconds / 60)}:{(ex.prescription.restSeconds % 60).toString().padStart(2, '0')}
                              {' '}| {ex.exercise.primaryMuscles.slice(0, 2).join(', ')}
                            </p>
                          </div>
                        </div>
                      </div>
                      {prevPerf && (
                        <div className="mt-2 ml-11 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-primary-400" />
                          <p className="text-[11px] text-primary-400">
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

            {/* Inline Check-In (collapsible) */}
            <div className="mt-5">
              <button
                onClick={() => setShowCheckInSection(!showCheckInSection)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-grappler-800/60 border border-grappler-700/50"
              >
                <span className="text-sm font-medium text-grappler-300 flex items-center gap-2">
                  <Brain className="w-4 h-4" /> Quick Check-In
                  <span className="text-[10px] text-grappler-500">(optional)</span>
                </span>
                <ChevronDown className={cn('w-4 h-4 text-grappler-400 transition-transform', showCheckInSection && 'rotate-180')} />
              </button>

              <AnimatePresence>
                {showCheckInSection && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 space-y-3">
                      {/* Sleep + Hours row */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-grappler-800/40 rounded-lg p-3">
                          <label className="text-xs text-grappler-400 mb-1.5 flex items-center gap-1">
                            <Moon className="w-3 h-3" /> Sleep Quality
                          </label>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((v) => (
                              <button
                                key={v}
                                onClick={() => setCheckIn({ ...checkIn, sleepQuality: v })}
                                className={cn(
                                  'flex-1 py-1.5 rounded text-xs font-medium',
                                  checkIn.sleepQuality === v
                                    ? v <= 2 ? 'bg-red-500 text-white' : v >= 4 ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
                                    : 'bg-grappler-700 text-grappler-500'
                                )}
                              >
                                {v}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="bg-grappler-800/40 rounded-lg p-3">
                          <label className="text-xs text-grappler-400 mb-1.5 block">Hours Slept</label>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setCheckIn({ ...checkIn, sleepHours: Math.max(0, checkIn.sleepHours - 0.5) })}
                              className="w-7 h-7 rounded bg-grappler-700 flex items-center justify-center"
                            >
                              <Minus className="w-3 h-3 text-grappler-300" />
                            </button>
                            <span className="text-lg font-bold text-grappler-50 flex-1 text-center">{checkIn.sleepHours}h</span>
                            <button
                              onClick={() => setCheckIn({ ...checkIn, sleepHours: Math.min(12, checkIn.sleepHours + 0.5) })}
                              className="w-7 h-7 rounded bg-grappler-700 flex items-center justify-center"
                            >
                              <Plus className="w-3 h-3 text-grappler-300" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Nutrition */}
                      <div className="bg-grappler-800/40 rounded-lg p-3">
                        <label className="text-xs text-grappler-400 mb-1.5 flex items-center gap-1">
                          <Utensils className="w-3 h-3" /> Nutrition
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {([
                            { value: 'fasted', label: 'Fasted' },
                            { value: 'light_meal', label: 'Light' },
                            { value: 'full_meal', label: 'Full' },
                            { value: 'heavy_meal', label: 'Heavy' }
                          ] as const).map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setCheckIn({ ...checkIn, nutrition: opt.value })}
                              className={cn(
                                'py-1.5 rounded text-xs font-medium',
                                checkIn.nutrition === opt.value
                                  ? 'bg-primary-500 text-white'
                                  : 'bg-grappler-700 text-grappler-500'
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Stress + Soreness + Motivation compact row */}
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { label: 'Stress', key: 'stress' as const, icon: Brain, lowLabel: 'Low', highLabel: 'High', invert: true },
                          { label: 'Soreness', key: 'soreness' as const, icon: Heart, lowLabel: 'None', highLabel: 'Sore', invert: true },
                          { label: 'Motivation', key: 'motivation' as const, icon: Zap, lowLabel: 'Low', highLabel: 'High', invert: false },
                        ]).map(({ label, key, icon: Icon, invert }) => (
                          <div key={key} className="bg-grappler-800/40 rounded-lg p-3">
                            <label className="text-[10px] text-grappler-400 mb-1 flex items-center gap-1">
                              <Icon className="w-3 h-3" /> {label}
                            </label>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((v) => (
                                <button
                                  key={v}
                                  onClick={() => setCheckIn({ ...checkIn, [key]: v })}
                                  className={cn(
                                    'flex-1 py-1 rounded text-[10px] font-medium',
                                    checkIn[key] === v
                                      ? invert
                                        ? v >= 4 ? 'bg-red-500 text-white' : v <= 2 ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
                                        : v >= 4 ? 'bg-green-500 text-white' : v <= 2 ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white'
                                      : 'bg-grappler-700 text-grappler-500'
                                  )}
                                >
                                  {v}
                                </button>
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

            {/* Bottom CTA */}
            <div className="fixed bottom-0 left-0 right-0 bg-grappler-900/95 backdrop-blur-sm border-t border-grappler-800 p-4">
              <button
                onClick={() => {
                  if (showCheckInSection) submitPreCheckIn();
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

      {/* Exercise Swap Modal */}
      <AnimatePresence>
        {showSwapModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4"
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
              <p className="text-[11px] text-grappler-500 mb-4">
                Sorted by match score — how well each exercise replaces the current one
              </p>

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
                        <p className="text-[11px] text-grappler-400 mb-1.5">
                          {rec.reasons[0]}
                        </p>
                      )}

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {rec.tags.slice(0, 4).map((tag, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-grappler-700/80 text-grappler-300">
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Previous performance if available */}
                      {altHistory && (
                        <div className="flex items-center gap-1 mt-1">
                          <TrendingUp className="w-3 h-3 text-primary-400" />
                          <p className="text-[11px] text-primary-400">
                            You did {altHistory.weight} {weightUnit} x {altHistory.reps} on {altHistory.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      )}

                      {/* Muscle info */}
                      <p className="text-[10px] text-grappler-500 mt-1">
                        {rec.exercise.primaryMuscles.join(', ')}
                        {rec.exercise.secondaryMuscles.length > 0 && (
                          <span> + {rec.exercise.secondaryMuscles.slice(0, 2).join(', ')}</span>
                        )}
                      </p>
                    </button>
                  );
                }) : (
                  <p className="text-sm text-grappler-400 text-center py-6">
                    No alternatives available for your equipment setup
                  </p>
                )}
              </div>

              <button
                onClick={() => setShowSwapModal(false)}
                className="btn btn-secondary btn-md w-full mt-4"
              >
                Keep Current Exercise
              </button>
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
              {formatTime(Math.floor(elapsedTime / 60))}
              {readiness && (
                <span className={cn(
                  'ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium',
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

      {/* Rest Timer Overlay */}
      <AnimatePresence>
        {isResting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-grappler-900/95 flex flex-col items-center justify-center"
          >
            <p className="text-grappler-400 mb-4">Rest Time</p>
            <motion.div
              key={restTimer}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-6xl font-bold text-primary-400 mb-6"
            >
              {formatRestTime(restTimer)}
            </motion.div>
            <button onClick={skipRest} className="btn btn-secondary btn-md">
              Skip Rest
            </button>

            {/* What's next during rest */}
            {isLastSet && !isLastExercise && (
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
            {isLastSet && isLastExercise && (
              <div className="mt-6 text-center">
                <p className="text-sm font-medium text-green-400">
                  Last exercise done — ready to finish!
                </p>
              </div>
            )}

            {/* Tip during rest */}
            {showTip && (
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
          <p className="text-sm text-grappler-400">
            Exercise {currentExerciseIndex + 1} of {activeWorkout.session.exercises.length}
          </p>
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
            </div>
            {/* Workout Type Context Explanation */}
            {activeWorkout?.session.type && (
              <div className={cn(
                'mt-2 px-3 py-1.5 rounded-lg text-xs text-center',
                activeWorkout.session.type === 'strength' && 'bg-red-500/10 text-red-400',
                activeWorkout.session.type === 'hypertrophy' && 'bg-purple-500/10 text-purple-400',
                activeWorkout.session.type === 'power' && 'bg-orange-500/10 text-orange-400'
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

            <p className="text-sm text-grappler-400 mt-2">
              {currentExercise.sets} sets x {currentExercise.prescription.targetReps} reps @ RPE {currentExercise.prescription.rpe}
              {currentExercise.prescription.percentageOf1RM && (
                <span className="ml-2 text-primary-400">~{currentExercise.prescription.percentageOf1RM}% 1RM</span>
              )}
              {currentExercise.prescription.tempo && (
                <span className="ml-2">Tempo: {currentExercise.prescription.tempo}</span>
              )}
            </p>
            <p className="text-xs text-grappler-500 mt-1">
              Rest: {Math.floor(currentExercise.prescription.restSeconds / 60)}:{(currentExercise.prescription.restSeconds % 60).toString().padStart(2, '0')} between sets
            </p>

            {/* Per-exercise history from last session */}
            {previousPerformance && (
              <div className="mt-2 px-3 py-1.5 bg-grappler-800/60 rounded-lg inline-block">
                <p className="text-xs text-grappler-400">
                  Last time: <span className="text-grappler-200 font-medium">{previousPerformance.weight} {weightUnit} x {previousPerformance.reps}</span>
                  <span className="text-grappler-500 ml-1">@ RPE {previousPerformance.rpe}</span>
                </p>
              </div>
            )}

            {/* Weight suggestion explanation */}
            {!previousPerformance && currentLog.sets[0]?.weight === 0 && (
              <div className="mt-2 px-3 py-1.5 bg-grappler-800/60 rounded-lg">
                <p className="text-xs text-grappler-400">
                  No history yet. Start with a weight you can handle for {currentExercise.prescription.targetReps} reps
                  with {10 - currentExercise.prescription.rpe} reps left in reserve.
                  {currentExercise.prescription.rpe <= 7 && ' This should feel moderate.'}
                  {currentExercise.prescription.rpe === 8 && ' This should be challenging but doable.'}
                  {currentExercise.prescription.rpe >= 9 && ' This should be near your limit.'}
                </p>
              </div>
            )}

            {/* Adjustment transparency */}
            {adjustmentReason && (
              <div className="mt-1.5 flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3 text-primary-400" />
                <p className="text-[11px] text-primary-400">{adjustmentReason}</p>
              </div>
            )}
          </div>

          {/* Set Indicator */}
          <div className="flex justify-center gap-2 mb-6">
            {currentLog.sets.map((set, i) => (
              <button
                key={i}
                onClick={() => setCurrentSetIndex(i)}
                className={cn(
                  'w-10 h-10 rounded-lg font-medium transition-all',
                  i === currentSetIndex
                    ? 'bg-primary-500 text-white'
                    : set.completed
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-grappler-700 text-grappler-400'
                )}
              >
                {set.completed ? <Check className="w-5 h-5 mx-auto" /> : i + 1}
              </button>
            ))}
          </div>

          {/* Input Fields */}
          <div className="space-y-4">
            {/* Weight */}
            <div className="bg-grappler-800/50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <label className="text-xs text-grappler-400 uppercase tracking-wide">Weight ({weightUnit})</label>
                {currentSet.weight > 0 && previousPerformance && (
                  <span className="text-[10px] text-primary-400">
                    {currentSet.weight > previousPerformance.weight ? '+' : ''}{Math.round(currentSet.weight - previousPerformance.weight)} vs last
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-2">
                <button
                  onClick={() => updateSetValue('weight', -weightIncrement)}
                  className="w-12 h-12 rounded-lg bg-grappler-700 flex items-center justify-center"
                >
                  <Minus className="w-5 h-5 text-grappler-300" />
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  value={currentSet.weight}
                  onChange={(e) => setExactValue('weight', parseFloat(e.target.value) || 0)}
                  className="w-24 text-center text-3xl font-bold bg-transparent text-grappler-50 focus:outline-none"
                />
                <button
                  onClick={() => updateSetValue('weight', weightIncrement)}
                  className="w-12 h-12 rounded-lg bg-grappler-700 flex items-center justify-center"
                >
                  <Plus className="w-5 h-5 text-grappler-300" />
                </button>
              </div>
            </div>

            {/* Reps */}
            <div className="bg-grappler-800/50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <label className="text-xs text-grappler-400 uppercase tracking-wide">Reps</label>
                <span className="text-[10px] text-grappler-500">
                  Target: {currentExercise.prescription.minReps}-{currentExercise.prescription.maxReps}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <button
                  onClick={() => updateSetValue('reps', -1)}
                  className="w-12 h-12 rounded-lg bg-grappler-700 flex items-center justify-center"
                >
                  <Minus className="w-5 h-5 text-grappler-300" />
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  value={currentSet.reps}
                  onChange={(e) => setExactValue('reps', parseInt(e.target.value) || 0)}
                  className="w-24 text-center text-3xl font-bold bg-transparent text-grappler-50 focus:outline-none"
                />
                <button
                  onClick={() => updateSetValue('reps', 1)}
                  className="w-12 h-12 rounded-lg bg-grappler-700 flex items-center justify-center"
                >
                  <Plus className="w-5 h-5 text-grappler-300" />
                </button>
              </div>
            </div>

            {/* RPE */}
            <div className="bg-grappler-800/50 rounded-xl p-4">
              <label className="text-xs text-grappler-400 uppercase tracking-wide">RPE (1-10)</label>
              <div className="flex items-center justify-center gap-2 mt-2">
                {[6, 7, 8, 9, 10].map((rpe) => (
                  <button
                    key={rpe}
                    onClick={() => setExactValue('rpe', rpe)}
                    className={cn(
                      'w-12 h-12 rounded-lg font-bold transition-all',
                      currentSet.rpe === rpe
                        ? rpe >= 9 ? 'bg-red-500 text-white' :
                          rpe >= 7 ? 'bg-yellow-500 text-white' :
                          'bg-green-500 text-white'
                        : 'bg-grappler-700 text-grappler-400'
                    )}
                  >
                    {rpe}
                  </button>
                ))}
              </div>
            </div>
          </div>

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
                    <p className="text-[10px] text-grappler-500">
                      {doneSets}/{log.sets.length} sets
                      {isCurrent && !isDone && (
                        <span className="text-primary-400 ml-1">— in progress</span>
                      )}
                    </p>
                  </div>
                  {i === currentExerciseIndex + 1 && !isDone && (
                    <span className="text-[10px] bg-grappler-700 text-grappler-300 px-2 py-0.5 rounded-full flex-shrink-0">
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
                    }
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
