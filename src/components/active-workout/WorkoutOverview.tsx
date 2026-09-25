'use client';
/* Extracted verbatim from ActiveWorkout.tsx (showOverview block) — no behavior change. */
import type * as React from 'react';
import { formatTarget } from '@/lib/prescription-format';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { X, Check, Plus, Minus, RotateCcw, Shuffle, Moon, Brain, Zap, Heart, AlertTriangle, TrendingUp, Video, ListChecks, Dumbbell, ChevronDown, Clock, Activity, Battery, Shield, ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { prescribedPercentOf1RM } from '@/lib/load-model';
import { getExerciseById } from '@/lib/exercises';
import { DEFAULT_EQUIPMENT_PROFILES } from '@/lib/types';
import { getThrottleSummary } from '@/lib/readiness-throttle';
import { Building2, Home, Backpack } from 'lucide-react';
import { getSessionAdjustments } from '@/lib/concurrent-training';
import type { WorkoutSession, ExerciseLog, PreWorkoutCheckIn, WearableData, EquipmentProfileName, InjuryEntry, InjuryClassification, UserProfile, TrainingSession, ExerciseFeedback, WeightUnit } from '@/lib/types';
import type { ActiveWorkoutThrottle } from '@/lib/store';
import type { ReadinessScore } from '@/lib/auto-adjust';
import type { WarmUpProtocol } from '@/lib/warmup-generator';

export interface WorkoutOverviewProps {
  cancelWorkout: () => void;
  showDraftRecovery: boolean;
  setShowDraftRecovery: (v: boolean) => void;
  setShowCancelConfirm: (v: boolean) => void;
  /** Always set here — ActiveWorkout returns early without one. */
  activeWorkout: NonNullable<{ session: WorkoutSession; baseSession: WorkoutSession; exerciseLogs: ExerciseLog[]; startTime: Date; mesocycleId: string; weekNumber?: number | undefined; dayNumber?: number | undefined; preCheckIn?: PreWorkoutCheckIn | undefined; pausedAt?: Date | undefined; totalPausedMs?: number | undefined; throttle?: ActiveWorkoutThrottle | undefined; overviewDone?: boolean | undefined; position?: { exerciseIndex: number; setIndex: number; } | undefined; swapUndo?: { session: WorkoutSession; exerciseLogs: ExerciseLog[]; } | undefined; matAdjust?: { kind: "taper" | "mat"; reason: string; summary: string; original: WorkoutSession; undone?: boolean | undefined; } | undefined; } | null>;
  totalSets: number;
  setFeeling: React.Dispatch<React.SetStateAction<"great" | "good" | "okay" | "rough">>;
  feeling: "great" | "good" | "okay" | "rough";
  setShowCheckInDetail: React.Dispatch<React.SetStateAction<boolean>>;
  showCheckInDetail: boolean;
  setCheckIn: React.Dispatch<React.SetStateAction<PreWorkoutCheckIn>>;
  checkIn: PreWorkoutCheckIn;
  latestWhoopData: WearableData | null;
  whoopReadiness: ReadinessScore | null;
  whoopApplied: boolean;
  preWhoopSnapshot: React.MutableRefObject<{ session: any; exerciseLogs: any; } | null>;
  applyWhoopAdjustment: () => void;
  setWhoopFollowed: React.Dispatch<React.SetStateAction<boolean>>;
  setWhoopApplied: React.Dispatch<React.SetStateAction<boolean>>;
  whoopFollowed: boolean;
  showGrapplingQ: boolean;
  setGrapplingToday: React.Dispatch<React.SetStateAction<"light" | "moderate" | "none" | "hard">>;
  setShowGrapplingQ: React.Dispatch<React.SetStateAction<boolean>>;
  setGrapplingReduction: React.Dispatch<React.SetStateAction<{ level: string; setsRemoved: number; rpeReduced: number; } | null>>;
  grapplingToday: "light" | "moderate" | "none" | "hard";
  grapplingReduction: { level: string; setsRemoved: number; rpeReduced: number; } | null;
  activeEquipmentProfile: EquipmentProfileName;
  showLocationConfirm: EquipmentProfileName | null;
  adaptWorkoutToProfile: (profile: EquipmentProfileName) => void;
  setShowLocationConfirm: React.Dispatch<React.SetStateAction<EquipmentProfileName | null>>;
  hasActiveInjuries: boolean;
  injuryAdaptations: { classifications: (InjuryEntry & { classification: InjuryClassification; })[]; allAvoidExercises: string[]; allModifiedExercises: { exerciseId: string; modification: string; }[]; worstPhase: "acute" | "subacute" | "remodeling" | "return_to_sport"; overallVolumeLimit: number; overallIntensityLimit: number; };
  undoMatAdjustment: () => void;
  throttleResult: ActiveWorkoutThrottle | null;
  throttleDismissed: boolean;
  setThrottleDismissed: React.Dispatch<React.SetStateAction<boolean>>;
  user: UserProfile | null;
  trainingSessions: TrainingSession[];
  warmUpProtocol: WarmUpProtocol | null;
  setShowWarmUp: React.Dispatch<React.SetStateAction<boolean>>;
  showWarmUp: boolean;
  supersetCandidates: { indexA: number; indexB: number; reason: string; }[];
  hasPrimer: boolean;
  handleAddPowerPrimer: () => void;
  getExerciseHistory: (exerciseId: string) => { weight: number; reps: number; rpe: number; date: Date; feedback: ExerciseFeedback | undefined; } | null;
  setFormCheckExercise: React.Dispatch<React.SetStateAction<{ name: string; videoUrl?: string | undefined; } | null>>;
  setOverviewSwapIndex: React.Dispatch<React.SetStateAction<number | null>>;
  weightUnit: WeightUnit;
  submitPreCheckIn: () => void;
  markWorkoutOverviewDone: () => void;
  setShowOverview: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function WorkoutOverview({ cancelWorkout, showDraftRecovery, setShowDraftRecovery, setShowCancelConfirm, activeWorkout, totalSets, setFeeling, feeling, setShowCheckInDetail, showCheckInDetail, setCheckIn, checkIn, latestWhoopData, whoopReadiness, whoopApplied, preWhoopSnapshot, applyWhoopAdjustment, setWhoopFollowed, setWhoopApplied, whoopFollowed, showGrapplingQ, setGrapplingToday, setShowGrapplingQ, setGrapplingReduction, grapplingToday, grapplingReduction, activeEquipmentProfile, showLocationConfirm, adaptWorkoutToProfile, setShowLocationConfirm, hasActiveInjuries, injuryAdaptations, undoMatAdjustment, throttleResult, throttleDismissed, setThrottleDismissed, user, trainingSessions, warmUpProtocol, setShowWarmUp, showWarmUp, supersetCandidates, hasPrimer, handleAddPowerPrimer, getExerciseHistory, setFormCheckExercise, setOverviewSwapIndex, weightUnit, submitPreCheckIn, markWorkoutOverviewDone, setShowOverview }: WorkoutOverviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 bg-grappler-900 flex flex-col safe-area-top"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex-1 overflow-y-auto p-4 pb-40">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => cancelWorkout()}
            className="btn btn-ghost btn-sm"
            aria-label="Close workout overview"
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
                onClick={() => setShowCancelConfirm(true)}
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
                  feeling === opt.id ? 'text-grappler-100' : 'text-grappler-400'
                )}>{opt.label}</p>
              </button>
            ))}
          </div>

          {/* Optional fine-tune toggle */}
          <button
            onClick={() => setShowCheckInDetail(!showCheckInDetail)}
            className="w-full mt-2 text-xs text-grappler-400 hover:text-grappler-300 py-1 flex items-center justify-center gap-1"
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
                      <label className="text-xs text-grappler-400 mb-1 flex items-center gap-1">
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
                      <label className="text-xs text-grappler-400 mb-1 block">Hours</label>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setCheckIn({ ...checkIn, sleepHours: Math.max(0, checkIn.sleepHours - 0.5) })}
                          className="w-6 h-6 rounded bg-grappler-700 flex items-center justify-center"
                          aria-label="Decrease sleep hours">
                          <Minus className="w-2.5 h-2.5 text-grappler-300" />
                        </button>
                        <span className="text-sm font-bold text-grappler-50 flex-1 text-center">{checkIn.sleepHours}h</span>
                        <button onClick={() => setCheckIn({ ...checkIn, sleepHours: Math.min(12, checkIn.sleepHours + 0.5) })}
                          className="w-6 h-6 rounded bg-grappler-700 flex items-center justify-center"
                          aria-label="Increase sleep hours">
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
                        <label className="text-xs text-grappler-400 mb-1 flex items-center gap-1">
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
                <p className="text-xs text-grappler-400">Recovery</p>
              </div>
              <div className="text-center">
                <Zap className="w-4 h-4 mx-auto mb-0.5 text-blue-400" />
                <p className="text-lg font-bold text-grappler-100">
                  {latestWhoopData.strain?.toFixed(1) ?? '--'}
                </p>
                <p className="text-xs text-grappler-400">Strain</p>
              </div>
              <div className="text-center">
                <Moon className="w-4 h-4 mx-auto mb-0.5 text-indigo-400" />
                <p className="text-lg font-bold text-grappler-100">
                  {latestWhoopData.sleepHours?.toFixed(1) ?? '--'}h
                </p>
                <p className="text-xs text-grappler-400">Sleep</p>
              </div>
              <div className="text-center">
                <Zap className="w-4 h-4 mx-auto mb-0.5 text-blue-400" />
                <p className="text-lg font-bold text-grappler-100">
                  {latestWhoopData.caloriesBurned?.toLocaleString() ?? '--'}
                </p>
                <p className="text-xs text-grappler-400">kcal</p>
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
              <p className="text-xs text-grappler-400 mt-2">
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
              className="text-xs text-grappler-400 text-center -mt-4 mb-4"
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

        {/* Mat-aware adjustment (fight-week taper / hard sparring nearby) */}
        {activeWorkout.matAdjust && (
          activeWorkout.matAdjust.undone ? (
            <p className="mb-4 text-xs text-grappler-500" data-testid="mat-adjust">Training as planned ({activeWorkout.matAdjust.reason.split(' — ')[0].toLowerCase()}).</p>
          ) : (
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3" data-testid="mat-adjust">
              <p className="text-sm font-semibold text-amber-200">{activeWorkout.matAdjust.reason}</p>
              <p className="text-xs text-amber-300/80 mt-0.5">{activeWorkout.matAdjust.summary}</p>
              <button onClick={undoMatAdjustment} className="mt-2 min-h-[36px] text-xs font-semibold text-amber-200 underline underline-offset-2">
                Train as planned
              </button>
            </div>
          )
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
                  <p className="text-xs text-grappler-400 mt-1">
                    {getThrottleSummary(throttleResult)}
                  </p>
                  {throttleResult.droppedExercises.length > 0 && (
                    <p className="text-xs text-grappler-400 mt-1">
                      Dropped: {throttleResult.droppedExercises.join(', ')}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setThrottleDismissed(true)}
                className="text-grappler-500 hover:text-grappler-300 p-1"
                aria-label="Dismiss auto-throttle notice"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}


        {/* ─── Combat Load Banner — concurrent training interference ─── */}
        {(() => {
          const isCombat = user?.trainingIdentity === 'combat';
          // The mat-aware adjustment above already acted on this — don't repeat it.
          if (activeWorkout.matAdjust && !activeWorkout.matAdjust.undone) return null;
          if (!isCombat || !trainingSessions || trainingSessions.length === 0) return null;
          const recent = trainingSessions.filter((s: { date: string | Date }) => {
            const d = new Date(s.date);
            const now = new Date();
            return (now.getTime() - d.getTime()) / 86_400_000 <= 2;
          });
          if (recent.length === 0) return null;
          const exercises = activeWorkout?.exerciseLogs?.map((log) => {
            const exDef = getExerciseById(log.exerciseId);
            return { muscleGroups: exDef?.primaryMuscles as string[] ?? ['full_body'] };
          }) ?? [{ muscleGroups: ['full_body'] }];
          const workoutType = activeWorkout?.session?.type ?? 'hypertrophy';
          const adj = getSessionAdjustments(recent, { type: workoutType, exercises });
          if (adj.overallVolumeMultiplier >= 0.95) return null;
          const volPct = Math.round((1 - adj.overallVolumeMultiplier) * 100);
          return (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'h-8 flex items-center justify-center gap-1.5 rounded-lg mb-3 text-xs font-medium',
                adj.shouldSkip
                  ? 'bg-red-500/15 border border-red-500/30 text-red-300'
                  : adj.overallVolumeMultiplier < 0.8
                    ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                    : 'bg-blue-500/15 border border-blue-500/30 text-blue-300'
              )}
            >
              <Shield className="w-3 h-3" />
              {adj.shouldSkip
                ? 'High combat fatigue — consider recovery instead'
                : `Combat load detected: volume -${volPct}%`}
            </motion.div>
          );
        })()}
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
                  <p className="text-xs text-grappler-400">
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
                        <span className="w-5 h-5 rounded-full bg-grappler-800 flex items-center justify-center text-xs font-bold text-grappler-400 flex-shrink-0">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{step.name}</span>
                          {step.cue && <span className="text-grappler-500 ml-1">— {step.cue}</span>}
                        </div>
                        <span className="text-xs text-grappler-400 flex-shrink-0">
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
              <p key={i} className="text-xs text-violet-300/80 mt-1">
                {pair.reason}
              </p>
            ))}
          </div>
        )}

        {/* Exercise List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-grappler-300 uppercase tracking-wide">
              Exercise Plan
            </h3>
            {!hasPrimer && (
              <button
                onClick={handleAddPowerPrimer}
                className="flex items-center gap-1 text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 min-h-[36px]"
                aria-label="Add power primer"
              >
                <Zap className="w-3.5 h-3.5" /> + Power primer · 8–10 min
              </button>
            )}
          </div>
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
                        {ex.sets} × {formatTarget(ex.prescription.targetReps, ex.exercise)}{ex.exercise.isUnilateral ? ' /side' : ''} @ RPE {ex.prescription.rpe}
                        {ex.prescription.percentageOf1RM && (
                          <span className="text-primary-400 ml-1">~{prescribedPercentOf1RM(ex.prescription.targetReps, ex.prescription.rpe)}% 1RM</span>
                        )}
                      </p>
                      <p className="text-xs text-grappler-400 mt-0.5">
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
                      aria-label="Check form video"
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
                      aria-label={isInjuryFlagged ? 'Swap exercise — flagged for injury' : 'Swap exercise'}
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
      <div className="fixed bottom-0 left-0 right-0 bg-grappler-900 border-t border-grappler-800 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          onClick={() => {
            submitPreCheckIn();
            markWorkoutOverviewDone();
            setShowOverview(false);
          }}
          className="btn btn-primary btn-lg w-full gap-2"
        >
          <Zap className="w-5 h-5" />
          Start Workout
        </button>
      </div>
    </motion.div>
  );
}
