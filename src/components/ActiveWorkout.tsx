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
  Save
} from 'lucide-react';
import { cn, formatTime } from '@/lib/utils';
import { calculate1RM } from '@/lib/workout-generator';
import { getRandomTip } from '@/lib/knowledge';
import { ExerciseLog, SetLog } from '@/lib/types';
import Confetti from 'react-confetti';

export default function ActiveWorkout() {
  const { activeWorkout, updateExerciseLog, completeWorkout, cancelWorkout } = useAppStore();
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [restTimer, setRestTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [tip, setTip] = useState(getRandomTip());
  const [showPRCelebration, setShowPRCelebration] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [feedback, setFeedback] = useState({
    overallRPE: 7,
    soreness: 5,
    energy: 7,
    notes: ''
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

    // Check for PR
    const estimated1RM = calculate1RM(currentSet.weight, currentSet.reps);
    // In a real app, we'd compare against stored PRs
    const isPR = currentSet.weight > 0 && Math.random() < 0.1; // Simulated PR chance

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

    // Move to next set or exercise
    if (currentSetIndex < currentLog.sets.length - 1) {
      setCurrentSetIndex(currentSetIndex + 1);
    } else if (currentExerciseIndex < activeWorkout.session.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setCurrentSetIndex(0);
    }

    // Show tip occasionally
    if (Math.random() < 0.3) {
      setTip(getRandomTip(currentExercise.exerciseId));
      setShowTip(true);
      setTimeout(() => setShowTip(false), 5000);
    }
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

  return (
    <div className="min-h-screen bg-grappler-900 bg-mesh">
      {/* PR Celebration */}
      {showPRCelebration && (
        <>
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
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
              <p className="text-white/80">You're getting stronger!</p>
            </div>
          </motion.div>
        </>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-grappler-900/90 backdrop-blur-xl border-b border-grappler-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={cancelWorkout} className="btn btn-ghost btn-sm">
            <X className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="font-bold text-grappler-50">{activeWorkout.session.name}</h1>
            <p className="text-xs text-grappler-400">
              <Timer className="w-3 h-3 inline mr-1" />
              {formatTime(Math.floor(elapsedTime / 60))}
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
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-grappler-50 mb-1">
              {currentExercise.exercise.name}
            </h2>
            <p className="text-sm text-grappler-400">
              {currentExercise.sets} sets × {currentExercise.prescription.targetReps} reps
              {currentExercise.prescription.tempo && (
                <span className="ml-2">• Tempo: {currentExercise.prescription.tempo}</span>
              )}
            </p>
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
              <label className="text-xs text-grappler-400 uppercase tracking-wide">Weight (lbs)</label>
              <div className="flex items-center justify-between mt-2">
                <button
                  onClick={() => updateSetValue('weight', -5)}
                  className="w-12 h-12 rounded-lg bg-grappler-700 flex items-center justify-center"
                >
                  <Minus className="w-5 h-5 text-grappler-300" />
                </button>
                <input
                  type="number"
                  value={currentSet.weight}
                  onChange={(e) => setExactValue('weight', parseInt(e.target.value) || 0)}
                  className="w-24 text-center text-3xl font-bold bg-transparent text-grappler-50 focus:outline-none"
                />
                <button
                  onClick={() => updateSetValue('weight', 5)}
                  className="w-12 h-12 rounded-lg bg-grappler-700 flex items-center justify-center"
                >
                  <Plus className="w-5 h-5 text-grappler-300" />
                </button>
              </div>
            </div>

            {/* Reps */}
            <div className="bg-grappler-800/50 rounded-xl p-4">
              <label className="text-xs text-grappler-400 uppercase tracking-wide">Reps</label>
              <div className="flex items-center justify-between mt-2">
                <button
                  onClick={() => updateSetValue('reps', -1)}
                  className="w-12 h-12 rounded-lg bg-grappler-700 flex items-center justify-center"
                >
                  <Minus className="w-5 h-5 text-grappler-300" />
                </button>
                <input
                  type="number"
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
      </main>

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
                    How hard was this session overall? (RPE)
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

                {/* Soreness */}
                <div>
                  <label className="text-sm text-grappler-400 mb-2 block">
                    Current soreness level (1-10)
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
                    Energy level (1-10)
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
                  onClick={() => completeWorkout(feedback)}
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
