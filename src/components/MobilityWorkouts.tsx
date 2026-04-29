'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Play,
  Pause,
  SkipForward,
  Clock,
  Wind,
  Heart,
  Leaf,
  RotateCcw,
  Timer,
  Check,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMobilityRoutines, generateActiveRecoverySession } from '@/lib/mobility';
import { MobilityFocus, MobilityRoutine, MobilityExercise } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import SorenessCheck from './SorenessCheck';
import type { SorenessArea, SorenessSeverity } from '@/lib/mobility-data';
import { Sparkles } from 'lucide-react';

interface MobilityWorkoutsProps {
  onClose: () => void;
}

type FilterOption = 'all' | MobilityFocus | 'grappler';

const focusIcons: Record<MobilityFocus, React.ReactNode> = {
  hips: <RotateCcw className="w-4 h-4" />,
  shoulders: <Heart className="w-4 h-4" />,
  thoracic: <Wind className="w-4 h-4" />,
  ankles: <Timer className="w-4 h-4" />,
  full_body: <Leaf className="w-4 h-4" />,
  neck: <RotateCcw className="w-4 h-4" />,
  wrists: <Heart className="w-4 h-4" />,
};

const focusLabels: Record<MobilityFocus, string> = {
  hips: 'Hips',
  shoulders: 'Shoulders',
  thoracic: 'Thoracic',
  ankles: 'Ankles',
  full_body: 'Full Body',
  neck: 'Neck',
  wrists: 'Wrists',
};

const filterPills: { key: FilterOption; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'hips', label: 'Hips' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'thoracic', label: 'Thoracic' },
  { key: 'full_body', label: 'Full Body' },
  { key: 'grappler', label: 'Grappler-Specific' },
];

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function MobilityWorkouts({ onClose }: MobilityWorkoutsProps) {
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [selectedRoutine, setSelectedRoutine] = useState<MobilityRoutine | null>(null);
  const [showRecoverySession, setShowRecoverySession] = useState(false);
  const [showSorenessFlow, setShowSorenessFlow] = useState(false);
  const addQuickLog = useAppStore(s => s.addQuickLog);
  const user = useAppStore(s => s.user);

  const handleSorenessLog = useCallback((areas: { area: SorenessArea; severity: SorenessSeverity }[]) => {
    addQuickLog({
      type: 'soreness',
      value: areas.length > 0 ? areas.map(a => `${a.area}:${a.severity}`).join(',') : 'none',
      timestamp: new Date(),
      notes: areas.length > 0
        ? `Sore areas: ${areas.map(a => a.area.replace('_', ' ')).join(', ')}`
        : 'Body check: feeling good',
    });
  }, [addQuickLog]);

  // Timer state
  const [timerActive, setTimerActive] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerCompleted, setTimerCompleted] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Active recovery session data
  const recoverySession = generateActiveRecoverySession();

  // Filter routines
  const filteredRoutines = (() => {
    const all = getMobilityRoutines();
    if (activeFilter === 'all') return all;
    if (activeFilter === 'grappler') return all.filter(r => r.forGrapplers);
    return all.filter(r => r.focus.includes(activeFilter as MobilityFocus));
  })();

  // Calculate total exercise time for a routine (sum of duration * sets for all exercises)
  const getTotalTimerSeconds = useCallback((routine: MobilityRoutine): number => {
    return routine.exercises.reduce((sum, ex) => sum + ex.duration * ex.sets, 0);
  }, []);

  // Calculate elapsed time across the entire routine
  const getElapsedSeconds = useCallback(
    (routine: MobilityRoutine, exIndex: number, setNum: number, remaining: number): number => {
      let elapsed = 0;
      for (let i = 0; i < exIndex; i++) {
        elapsed += routine.exercises[i].duration * routine.exercises[i].sets;
      }
      const currentEx = routine.exercises[exIndex];
      // Add completed sets of the current exercise
      elapsed += currentEx.duration * (setNum - 1);
      // Add elapsed within the current set
      elapsed += currentEx.duration - remaining;
      return elapsed;
    },
    []
  );

  // Overall progress percentage
  const overallProgress = selectedRoutine && timerActive
    ? (getElapsedSeconds(selectedRoutine, currentExerciseIndex, currentSet, timeRemaining) /
        getTotalTimerSeconds(selectedRoutine)) *
      100
    : 0;

  // Start timer for a routine
  const startTimer = useCallback(() => {
    if (!selectedRoutine) return;
    setTimerActive(true);
    setTimerPaused(false);
    setTimerCompleted(false);
    setCurrentExerciseIndex(0);
    setCurrentSet(1);
    setTimeRemaining(selectedRoutine.exercises[0].duration);
  }, [selectedRoutine]);

  // Advance to next exercise or set
  const advanceTimer = useCallback(() => {
    if (!selectedRoutine) return;

    const currentExercise = selectedRoutine.exercises[currentExerciseIndex];

    // Vibrate on change
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    if (currentSet < currentExercise.sets) {
      // Next set of same exercise
      setCurrentSet((prev) => prev + 1);
      setTimeRemaining(currentExercise.duration);
    } else if (currentExerciseIndex < selectedRoutine.exercises.length - 1) {
      // Next exercise
      const nextIndex = currentExerciseIndex + 1;
      setCurrentExerciseIndex(nextIndex);
      setCurrentSet(1);
      setTimeRemaining(selectedRoutine.exercises[nextIndex].duration);
    } else {
      // Routine complete
      setTimerActive(false);
      setTimerPaused(false);
      setTimerCompleted(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([300, 150, 300, 150, 500]);
      }
      // Log to quickLogs so Quick Actions tile updates
      if (selectedRoutine) {
        const totalMin = Math.round(
          selectedRoutine.exercises.reduce((s, ex) => s + ex.duration * ex.sets, 0) / 60
        );
        addQuickLog({
          type: 'mobility',
          value: totalMin,
          unit: 'min',
          timestamp: new Date(),
          notes: selectedRoutine.name,
        });
      }
    }
  }, [selectedRoutine, currentExerciseIndex, currentSet, addQuickLog]);

  // Skip to next exercise
  const skipExercise = useCallback(() => {
    if (!selectedRoutine) return;
    if (currentExerciseIndex < selectedRoutine.exercises.length - 1) {
      const nextIndex = currentExerciseIndex + 1;
      setCurrentExerciseIndex(nextIndex);
      setCurrentSet(1);
      setTimeRemaining(selectedRoutine.exercises[nextIndex].duration);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    } else {
      // Skipping the last exercise — still counts as completing the routine
      setTimerActive(false);
      setTimerPaused(false);
      setTimerCompleted(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([300, 150, 300, 150, 500]);
      }
      const totalMin = Math.round(
        selectedRoutine.exercises.reduce((s, ex) => s + ex.duration * ex.sets, 0) / 60
      );
      addQuickLog({
        type: 'mobility',
        value: totalMin,
        unit: 'min',
        timestamp: new Date(),
        notes: selectedRoutine.name,
      });
    }
  }, [selectedRoutine, currentExerciseIndex, addQuickLog]);

  // Timer countdown effect
  useEffect(() => {
    if (timerActive && !timerPaused && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, timerPaused, timeRemaining]);

  // When timeRemaining hits 0, advance
  useEffect(() => {
    if (timerActive && !timerPaused && timeRemaining === 0) {
      advanceTimer();
    }
  }, [timerActive, timerPaused, timeRemaining, advanceTimer]);

  // Stop timer on close
  const handleCloseRoutine = () => {
    setTimerActive(false);
    setTimerPaused(false);
    setTimerCompleted(false);
    setCurrentExerciseIndex(0);
    setCurrentSet(1);
    setTimeRemaining(0);
    setSelectedRoutine(null);
  };

  // Render the timer overlay when active
  const renderTimer = () => {
    if (!selectedRoutine || !timerActive) return null;
    const exercise = selectedRoutine.exercises[currentExerciseIndex];

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed inset-0 z-50 bg-grappler-900 flex flex-col"
      >
        {/* Timer Header */}
        <div className="p-4 flex items-center justify-between border-b border-grappler-800">
          <button aria-label="Go back"
            onClick={() => {
              setTimerActive(false);
              setTimerPaused(false);
            }}
            className="btn btn-secondary btn-sm"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Exit
          </button>
          <span className="text-sm text-grappler-400">
            {currentExerciseIndex + 1}/{selectedRoutine.exercises.length}
          </span>
        </div>

        {/* Overall Progress Bar */}
        <div className="px-4 pt-3">
          <div className="h-2 bg-grappler-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-green-500 rounded-full"
              animate={{ width: `${Math.min(overallProgress, 100)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-xs text-grappler-400 mt-1 text-center">
            {Math.round(overallProgress)}% complete
          </p>
        </div>

        {/* Exercise Info */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.p
            key={`${currentExerciseIndex}-${currentSet}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-green-400 font-medium mb-2"
          >
            Set {currentSet} of {exercise.sets}
          </motion.p>

          <motion.h2
            key={exercise.name}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-2xl font-bold text-grappler-50 text-center mb-4"
          >
            {exercise.name}
          </motion.h2>

          <p className="text-sm text-grappler-400 text-center mb-6 max-w-sm">
            {exercise.description}
          </p>

          {exercise.breathingCue && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 bg-green-500/20 rounded-lg px-4 py-2 mb-4"
            >
              <Wind className="w-4 h-4 text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-400">{exercise.breathingCue}</p>
            </motion.div>
          )}

          {exercise.videoUrl && (
            <a
              href={exercise.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary-400 hover:text-primary-300 bg-primary-500/10 hover:bg-primary-500/20 rounded-lg px-4 py-2 mb-8 transition-colors"
            >
              <Play className="w-4 h-4 fill-current" />
              Watch Demo
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Countdown */}
          <motion.div
            key={timeRemaining}
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            className="text-7xl font-bold text-grappler-50 mb-8 tabular-nums"
          >
            {formatDuration(timeRemaining)}
          </motion.div>

          {/* Controls */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setTimerPaused(!timerPaused)}
              className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/30"
            >
              {timerPaused ? (
                <Play className="w-7 h-7 ml-1" />
              ) : (
                <Pause className="w-7 h-7" />
              )}
            </button>
            <button
              onClick={skipExercise}
              className="w-12 h-12 rounded-full bg-grappler-700 flex items-center justify-center text-grappler-300"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Upcoming Exercise */}
        {currentExerciseIndex < selectedRoutine.exercises.length - 1 && (
          <div className="p-4 border-t border-grappler-800">
            <p className="text-xs text-grappler-400 mb-1">Up next</p>
            <p className="text-sm text-grappler-200">
              {selectedRoutine.exercises[currentExerciseIndex + 1].name}
            </p>
          </div>
        )}
      </motion.div>
    );
  };

  // Render expanded routine view
  const renderRoutineDetail = () => {
    if (!selectedRoutine) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-grappler-900 overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-grappler-900 border-b border-grappler-800 p-4">
          <div className="flex items-center justify-between">
            <button onClick={handleCloseRoutine} className="btn btn-secondary btn-sm">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </button>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-grappler-400" />
              <span className="text-sm text-grappler-400">{selectedRoutine.duration} min</span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-grappler-50 mt-3">{selectedRoutine.name}</h2>
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedRoutine.focus.map((f) => (
              <span
                key={f}
                className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full"
              >
                {focusIcons[f]}
                {focusLabels[f]}
              </span>
            ))}
            {selectedRoutine.forGrapplers && (
              <span className="text-xs bg-primary-500/20 text-primary-400 px-2 py-1 rounded-full">
                For Grapplers
              </span>
            )}
          </div>
        </div>

        {/* Timer completed banner */}
        <AnimatePresence>
          {timerCompleted && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mx-4 mt-4 bg-green-500/20 border border-green-500/30 rounded-xl p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-400">Routine Complete!</p>
                <p className="text-xs text-grappler-400">
                  Great work on your mobility session.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Start Timer Button */}
        {!timerActive && !timerCompleted && (
          <div className="px-4 mt-4">
            <button onClick={startTimer} className="btn btn-primary w-full gap-2 py-3">
              <Play className="w-5 h-5" />
              Start Timer
            </button>
          </div>
        )}

        {/* Exercise List */}
        <div className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-grappler-200 uppercase tracking-wide">
            Exercises ({selectedRoutine.exercises.length})
          </h3>

          {selectedRoutine.exercises.map((exercise, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'bg-grappler-800 rounded-xl p-4',
                timerActive &&
                  index === currentExerciseIndex &&
                  'ring-2 ring-green-500 ring-offset-2 ring-offset-grappler-900'
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-grappler-400 bg-grappler-700 w-6 h-6 rounded-full flex items-center justify-center">
                    {index + 1}
                  </span>
                  <h4 className="font-medium text-grappler-50">{exercise.name}</h4>
                </div>
                <div className="flex items-center gap-2 text-xs text-grappler-400">
                  <span>{exercise.sets}x</span>
                  <span>{formatDuration(exercise.duration)}</span>
                </div>
              </div>

              <p className="text-sm text-grappler-400 ml-8 mb-2">{exercise.description}</p>

              {exercise.breathingCue && (
                <div className="ml-8 flex items-center gap-2 bg-green-500/10 rounded-lg px-3 py-1.5">
                  <Wind className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                  <p className="text-xs text-green-400">{exercise.breathingCue}</p>
                </div>
              )}

              {exercise.videoUrl && (
                <a
                  href={exercise.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-8 mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary-400 hover:text-primary-300 bg-primary-500/10 hover:bg-primary-500/20 rounded-lg px-3 py-1.5 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Play className="w-3 h-3 fill-current" />
                  Watch Demo
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </motion.div>
          ))}
        </div>

        {/* Bottom padding for safe area */}
        <div className="h-8" />
      </motion.div>
    );
  };

  // Render active recovery session view
  const renderRecoverySession = () => {
    if (!showRecoverySession) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-grappler-900 overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-grappler-900 border-b border-grappler-800 p-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setShowRecoverySession(false)} className="btn btn-secondary btn-sm">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </button>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-grappler-400" />
              <span className="text-sm text-grappler-400">{recoverySession.estimatedDuration} min</span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-grappler-50 mt-3">{recoverySession.name}</h2>
          <p className="text-sm text-grappler-400 mt-1">
            A light session to promote recovery and maintain mobility.
          </p>
        </div>

        {/* Warm-Up */}
        <div className="p-4 space-y-6">
          {recoverySession.warmUp.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-2 mb-3">
                <RotateCcw className="w-5 h-5 text-green-400" />
                <h3 className="font-semibold text-grappler-200">Warm-Up</h3>
              </div>
              <div className="space-y-2">
                {recoverySession.warmUp.map((item, i) => (
                  <div key={i} className="bg-grappler-800 rounded-xl p-4">
                    <p className="text-sm text-grappler-100">{item}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Exercises */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center gap-2 mb-3">
              <Leaf className="w-5 h-5 text-green-400" />
              <h3 className="font-semibold text-grappler-200">Exercises</h3>
            </div>
            <div className="space-y-2">
              {recoverySession.exercises.map((ex, i) => (
                <div key={i} className="bg-grappler-800 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-medium text-grappler-50 text-sm">{ex.exercise.name}</h4>
                    <span className="text-xs text-grappler-400">{ex.sets} sets x {ex.prescription.targetReps} reps</span>
                  </div>
                  <p className="text-xs text-grappler-400">{ex.exercise.description}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Cool-Down */}
          {recoverySession.coolDown.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="flex items-center gap-2 mb-3">
                <Wind className="w-5 h-5 text-green-400" />
                <h3 className="font-semibold text-grappler-200">Cool-Down & Breathing</h3>
              </div>
              <div className="space-y-2">
                {recoverySession.coolDown.map((item, i) => (
                  <div key={i} className="bg-grappler-800 rounded-xl p-4">
                    <p className="text-sm text-grappler-100">{item}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <div className="h-8" />
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-grappler-900 pb-24 safe-area-top">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-grappler-900 border-b border-grappler-800 p-4">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="btn btn-secondary btn-sm">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-grappler-50">Mobility & Recovery</h1>
            <p className="text-xs text-grappler-400">Deload, stretch, and move better</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Soreness Check — quick entry to guided session */}
        {showSorenessFlow ? (
          <SorenessCheck
            context="rest_day"
            isCombatAthlete={user?.trainingIdentity === 'combat'}
            onDismiss={() => setShowSorenessFlow(false)}
            onLog={handleSorenessLog}
          />
        ) : (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setShowSorenessFlow(true)}
            className="w-full card p-4 text-left bg-gradient-to-br from-violet-500/20 to-grappler-800 border border-violet-500/20"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-grappler-50 mb-1">Something Sore?</h3>
                <p className="text-sm text-grappler-400">
                  Tell me what hurts and I&apos;ll build a timed mobility session for you.
                </p>
              </div>
              <Play className="w-5 h-5 text-violet-400 flex-shrink-0 mt-1" />
            </div>
          </motion.button>
        )}

        {/* Active Recovery Card */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setShowRecoverySession(true)}
          className="w-full card p-4 text-left bg-gradient-to-br from-green-500/20 to-grappler-800 border border-green-500/20"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <Leaf className="w-6 h-6 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-grappler-50 mb-1">Active Recovery Day</h3>
              <p className="text-sm text-grappler-400 mb-2">
                Light session to promote recovery without taxing your body.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs bg-grappler-700/80 text-grappler-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> Foam Rolling
                </span>
                <span className="text-xs bg-grappler-700/80 text-grappler-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Heart className="w-3 h-3" /> Bands
                </span>
                <span className="text-xs bg-grappler-700/80 text-grappler-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Leaf className="w-3 h-3" /> Stretching
                </span>
                <span className="text-xs bg-grappler-700/80 text-grappler-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Wind className="w-3 h-3" /> Breathing
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-grappler-400 flex-shrink-0">
              <Clock className="w-3.5 h-3.5" />
              {recoverySession.estimatedDuration}m
            </div>
          </div>
        </motion.button>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {filterPills.map((pill) => (
            <button
              key={pill.key}
              onClick={() => setActiveFilter(pill.key)}
              className={cn(
                'px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all',
                activeFilter === pill.key
                  ? 'bg-green-500 text-white'
                  : 'bg-grappler-800 text-grappler-400 hover:text-grappler-200'
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Routine Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredRoutines.map((routine, index) => (
            <motion.button
              key={routine.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedRoutine(routine)}
              className="card p-4 text-left hover:bg-grappler-700/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-grappler-50 text-sm leading-tight">
                  {routine.name}
                </h3>
                {routine.forGrapplers && (
                  <span className="text-xs bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
                    Grappler
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-3.5 h-3.5 text-grappler-500" />
                <span className="text-xs text-grappler-400">{routine.duration} min</span>
                <span className="text-grappler-700">|</span>
                <span className="text-xs text-grappler-400">
                  {routine.exercises.length} exercises
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {routine.focus.map((f) => (
                  <span
                    key={f}
                    className="flex items-center gap-1 text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full"
                  >
                    {focusIcons[f]}
                    {focusLabels[f]}
                  </span>
                ))}
              </div>
            </motion.button>
          ))}
        </div>

        {filteredRoutines.length === 0 && (
          <div className="text-center py-12 text-grappler-500">
            <Leaf className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No routines match this filter.</p>
          </div>
        )}
      </div>

      {/* Routine Detail View */}
      <AnimatePresence>{selectedRoutine && renderRoutineDetail()}</AnimatePresence>

      {/* Timer Overlay */}
      <AnimatePresence>{timerActive && renderTimer()}</AnimatePresence>

      {/* Recovery Session View */}
      <AnimatePresence>{showRecoverySession && renderRecoverySession()}</AnimatePresence>
    </div>
  );
}
