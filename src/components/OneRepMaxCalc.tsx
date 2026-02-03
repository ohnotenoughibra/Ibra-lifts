'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Calculator,
  Dumbbell,
  TrendingUp,
  Target,
  Info,
  Play,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface OneRepMaxCalcProps {
  onClose: () => void;
}

type Tab = 'calculator' | 'protocol';

interface ProtocolSet {
  label: string;
  percentage: number | null;
  reps: number;
  rest: string;
  description: string;
  completed: boolean;
}

const PERCENTAGE_TABLE = [
  { pct: 100, reps: '1 rep (max)' },
  { pct: 95, reps: '1-2 reps' },
  { pct: 90, reps: '3-4 reps' },
  { pct: 85, reps: '4-6 reps' },
  { pct: 80, reps: '7-8 reps' },
  { pct: 75, reps: '8-10 reps' },
  { pct: 70, reps: '10-12 reps' },
  { pct: 65, reps: '12-15 reps' },
  { pct: 60, reps: '15-20 reps' },
];

const TESTABLE_EXERCISES = ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press'];

function buildProtocolSets(estimated1RM: number): ProtocolSet[] {
  return [
    {
      label: 'Set 1',
      percentage: null,
      reps: 10,
      rest: '2 min',
      description: 'Bar only — general warm-up',
      completed: false,
    },
    {
      label: 'Set 2',
      percentage: 40,
      reps: 5,
      rest: '2 min',
      description: `~${Math.round(estimated1RM * 0.4)} — light warm-up`,
      completed: false,
    },
    {
      label: 'Set 3',
      percentage: 60,
      reps: 3,
      rest: '2-3 min',
      description: `~${Math.round(estimated1RM * 0.6)} — moderate warm-up`,
      completed: false,
    },
    {
      label: 'Set 4',
      percentage: 75,
      reps: 2,
      rest: '3 min',
      description: `~${Math.round(estimated1RM * 0.75)} — heavier warm-up`,
      completed: false,
    },
    {
      label: 'Set 5',
      percentage: 85,
      reps: 1,
      rest: '3-5 min',
      description: `~${Math.round(estimated1RM * 0.85)} — working single`,
      completed: false,
    },
    {
      label: 'Set 6',
      percentage: 92,
      reps: 1,
      rest: '3-5 min',
      description: `~${Math.round(estimated1RM * 0.92)} — near-max single`,
      completed: false,
    },
    {
      label: 'Set 7',
      percentage: 100,
      reps: 1,
      rest: 'Done',
      description: `~${Math.round(estimated1RM)} — attempt 100%+`,
      completed: false,
    },
  ];
}

export default function OneRepMaxCalc({ onClose }: OneRepMaxCalcProps) {
  const { workoutLogs, user } = useAppStore();
  const unit = user?.weightUnit || 'lbs';

  // Calculator state
  const [weight, setWeight] = useState<number>(135);
  const [reps, setReps] = useState<number>(5);
  const [activeTab, setActiveTab] = useState<Tab>('calculator');
  const [showPercentageTable, setShowPercentageTable] = useState(false);

  // Protocol state
  const [selectedExercise, setSelectedExercise] = useState<string>(TESTABLE_EXERCISES[0]);
  const [protocolEstimate, setProtocolEstimate] = useState<number>(0);
  const [protocolSets, setProtocolSets] = useState<ProtocolSet[]>([]);
  const [protocolStarted, setProtocolStarted] = useState(false);
  const [actual1RM, setActual1RM] = useState<string>('');
  const [showExerciseDropdown, setShowExerciseDropdown] = useState(false);

  // 1RM formula calculations
  const calculations = useMemo(() => {
    if (weight <= 0 || reps <= 0) {
      return { epley: 0, brzycki: 0, lombardi: 0, average: 0 };
    }
    if (reps === 1) {
      return { epley: weight, brzycki: weight, lombardi: weight, average: weight };
    }

    const epley = weight * (1 + reps / 30);
    const brzycki = weight * (36 / (37 - reps));
    const lombardi = weight * Math.pow(reps, 0.1);
    const average = (epley + brzycki + lombardi) / 3;

    return {
      epley: Math.round(epley * 10) / 10,
      brzycki: Math.round(brzycki * 10) / 10,
      lombardi: Math.round(lombardi * 10) / 10,
      average: Math.round(average * 10) / 10,
    };
  }, [weight, reps]);

  // Best sets from recent workout history
  const recentBestSets = useMemo(() => {
    const exerciseBests = new Map<
      string,
      { exerciseName: string; weight: number; reps: number; e1rm: number; date: Date }
    >();

    const sortedLogs = [...workoutLogs].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Look at the last 20 logs
    const recentLogs = sortedLogs.slice(0, 20);

    recentLogs.forEach((log) => {
      log.exercises.forEach((ex) => {
        ex.sets.forEach((set) => {
          if (set.completed && set.weight > 0 && set.reps > 0) {
            const e1rm =
              set.reps === 1
                ? set.weight
                : Math.round(set.weight * (1 + set.reps / 30) * 10) / 10;

            const existing = exerciseBests.get(ex.exerciseId);
            if (!existing || e1rm > existing.e1rm) {
              exerciseBests.set(ex.exerciseId, {
                exerciseName: ex.exerciseName,
                weight: set.weight,
                reps: set.reps,
                e1rm,
                date: new Date(log.date),
              });
            }
          }
        });
      });
    });

    return Array.from(exerciseBests.values())
      .sort((a, b) => b.e1rm - a.e1rm)
      .slice(0, 8);
  }, [workoutLogs]);

  // Start the testing protocol
  const startProtocol = () => {
    const est = calculations.average > 0 ? calculations.average : protocolEstimate;
    if (est <= 0) return;
    setProtocolEstimate(est);
    setProtocolSets(buildProtocolSets(est));
    setProtocolStarted(true);
  };

  // Toggle set completion
  const toggleSetComplete = (index: number) => {
    setProtocolSets((prev) =>
      prev.map((s, i) => (i === index ? { ...s, completed: !s.completed } : s))
    );
  };

  // Use a history entry to populate calculator
  const useFromHistory = (w: number, r: number) => {
    setWeight(w);
    setReps(r);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      className="min-h-screen bg-grappler-900 px-4 py-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onClose} className="btn btn-secondary btn-sm">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-grappler-50">1RM Calculator</h2>
          <p className="text-sm text-grappler-400">Estimate and test your one-rep max</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('calculator')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'calculator'
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
              : 'bg-grappler-800 text-grappler-400 hover:text-grappler-200'
          }`}
        >
          <Calculator className="w-4 h-4" />
          Calculator
        </button>
        <button
          onClick={() => setActiveTab('protocol')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all ${
            activeTab === 'protocol'
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
              : 'bg-grappler-800 text-grappler-400 hover:text-grappler-200'
          }`}
        >
          <Target className="w-4 h-4" />
          Testing Protocol
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'calculator' ? (
          <motion.div
            key="calculator"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Weight Input */}
            <div className="bg-grappler-800 rounded-xl p-4">
              <label className="text-sm font-medium text-grappler-300 mb-3 block">
                Weight Lifted ({unit})
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setWeight((prev) => Math.max(0, prev - 5))}
                  className="w-12 h-12 rounded-xl bg-grappler-700 hover:bg-grappler-600 text-grappler-200 font-bold text-xl transition-colors flex items-center justify-center"
                >
                  -
                </button>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(Math.max(0, parseInt(e.target.value) || 0))}
                  className="flex-1 bg-grappler-800 border border-grappler-700 rounded-lg p-3 text-center text-2xl font-bold text-grappler-50 focus:outline-none focus:border-primary-500 transition-colors"
                />
                <button
                  onClick={() => setWeight((prev) => prev + 5)}
                  className="w-12 h-12 rounded-xl bg-grappler-700 hover:bg-grappler-600 text-grappler-200 font-bold text-xl transition-colors flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {/* Reps Input */}
            <div className="bg-grappler-800 rounded-xl p-4">
              <label className="text-sm font-medium text-grappler-300 mb-3 block">
                Reps Performed
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setReps((prev) => Math.max(1, prev - 1))}
                  className="w-12 h-12 rounded-xl bg-grappler-700 hover:bg-grappler-600 text-grappler-200 font-bold text-xl transition-colors flex items-center justify-center"
                >
                  -
                </button>
                <input
                  type="number"
                  value={reps}
                  onChange={(e) =>
                    setReps(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))
                  }
                  className="flex-1 bg-grappler-800 border border-grappler-700 rounded-lg p-3 text-center text-2xl font-bold text-grappler-50 focus:outline-none focus:border-primary-500 transition-colors"
                />
                <button
                  onClick={() => setReps((prev) => Math.min(30, prev + 1))}
                  className="w-12 h-12 rounded-xl bg-grappler-700 hover:bg-grappler-600 text-grappler-200 font-bold text-xl transition-colors flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {/* Results */}
            {calculations.average > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                {/* Primary Result */}
                <div className="bg-gradient-to-br from-primary-500/15 to-accent-500/10 border border-primary-500/20 rounded-xl p-6 text-center">
                  <p className="text-sm text-grappler-400 mb-1">Estimated 1RM (Average)</p>
                  <p className="text-4xl font-bold text-primary-400">
                    {Math.round(calculations.average)}{' '}
                    <span className="text-lg text-grappler-400">{unit}</span>
                  </p>
                </div>

                {/* Formula Breakdown */}
                <div className="bg-grappler-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-primary-400" />
                    <h4 className="text-sm font-medium text-grappler-200">Formula Breakdown</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2 border-b border-grappler-700/50">
                      <div>
                        <p className="text-sm text-grappler-200">Epley</p>
                        <p className="text-xs text-grappler-500">
                          weight x (1 + reps/30)
                        </p>
                      </div>
                      <p className="text-sm font-bold text-grappler-100">
                        {Math.round(calculations.epley)} {unit}
                      </p>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-grappler-700/50">
                      <div>
                        <p className="text-sm text-grappler-200">Brzycki</p>
                        <p className="text-xs text-grappler-500">
                          weight x 36/(37 - reps)
                        </p>
                      </div>
                      <p className="text-sm font-bold text-grappler-100">
                        {Math.round(calculations.brzycki)} {unit}
                      </p>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm text-grappler-200">Lombardi</p>
                        <p className="text-xs text-grappler-500">
                          weight x reps^0.1
                        </p>
                      </div>
                      <p className="text-sm font-bold text-grappler-100">
                        {Math.round(calculations.lombardi)} {unit}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Percentage Table Toggle */}
                <button
                  onClick={() => setShowPercentageTable(!showPercentageTable)}
                  className="w-full bg-grappler-800 rounded-xl p-4 flex items-center justify-between hover:bg-grappler-700/60 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-primary-400" />
                    <span className="text-sm font-medium text-grappler-200">
                      Percentage Chart
                    </span>
                  </div>
                  {showPercentageTable ? (
                    <ChevronUp className="w-4 h-4 text-grappler-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-grappler-400" />
                  )}
                </button>

                <AnimatePresence>
                  {showPercentageTable && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-grappler-800 rounded-xl overflow-hidden">
                        {/* Table Header */}
                        <div className="grid grid-cols-3 px-4 py-3 bg-grappler-700/50 text-xs font-medium text-grappler-400 uppercase tracking-wider">
                          <span>% of 1RM</span>
                          <span className="text-center">Weight</span>
                          <span className="text-right">Rep Range</span>
                        </div>
                        {/* Table Rows */}
                        {PERCENTAGE_TABLE.map((row, index) => {
                          const pctWeight = Math.round(
                            calculations.average * (row.pct / 100)
                          );
                          return (
                            <div
                              key={row.pct}
                              className={`grid grid-cols-3 px-4 py-3 text-sm ${
                                index % 2 === 0 ? 'bg-grappler-800/30' : ''
                              }`}
                            >
                              <span className="text-grappler-200 font-medium">{row.pct}%</span>
                              <span className="text-center text-grappler-50 font-bold">
                                {pctWeight} {unit}
                              </span>
                              <span className="text-right text-grappler-400">{row.reps}</span>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* From History */}
            {recentBestSets.length > 0 && (
              <div className="bg-grappler-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-accent-400" />
                  <h4 className="text-sm font-medium text-grappler-200">From History</h4>
                </div>
                <p className="text-xs text-grappler-500 mb-3">
                  Best sets from your recent workouts. Tap to calculate from any of them.
                </p>
                <div className="space-y-2">
                  {recentBestSets.map((entry, index) => (
                    <motion.button
                      key={`${entry.exerciseName}-${index}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.04 }}
                      onClick={() => useFromHistory(entry.weight, entry.reps)}
                      className="w-full flex items-center justify-between bg-grappler-700/40 hover:bg-grappler-700 rounded-lg p-3 transition-colors text-left"
                    >
                      <div>
                        <p className="text-sm font-medium text-grappler-100">
                          {entry.exerciseName}
                        </p>
                        <p className="text-xs text-grappler-400">
                          {entry.weight} {unit} x {entry.reps} reps
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary-400">
                          e1RM: {Math.round(entry.e1rm)}
                        </p>
                        <p className="text-xs text-grappler-500">Calculate from this</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          /* Testing Protocol Tab */
          <motion.div
            key="protocol"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Exercise Selection */}
            <div className="bg-grappler-800 rounded-xl p-4">
              <label className="text-sm font-medium text-grappler-300 mb-3 block">
                Select Exercise to Test
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowExerciseDropdown(!showExerciseDropdown)}
                  className="w-full bg-grappler-700 border border-grappler-600 rounded-lg p-3 flex items-center justify-between text-grappler-50 hover:border-primary-500 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-primary-400" />
                    <span className="font-medium">{selectedExercise}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-grappler-400" />
                </button>

                <AnimatePresence>
                  {showExerciseDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute top-full left-0 right-0 mt-1 bg-grappler-700 border border-grappler-600 rounded-lg overflow-hidden z-10 shadow-xl"
                    >
                      {TESTABLE_EXERCISES.map((exercise) => (
                        <button
                          key={exercise}
                          onClick={() => {
                            setSelectedExercise(exercise);
                            setShowExerciseDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                            selectedExercise === exercise
                              ? 'bg-primary-500/20 text-primary-400 font-medium'
                              : 'text-grappler-200 hover:bg-grappler-600'
                          }`}
                        >
                          {exercise}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Estimated 1RM for Protocol */}
            {!protocolStarted && (
              <div className="bg-grappler-800 rounded-xl p-4">
                <label className="text-sm font-medium text-grappler-300 mb-3 block">
                  Estimated 1RM for {selectedExercise} ({unit})
                </label>
                <p className="text-xs text-grappler-500 mb-3">
                  Enter your estimated max or use the Calculator tab first. This determines warm-up weights.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setProtocolEstimate((prev) => Math.max(0, prev - 5))}
                    className="w-12 h-12 rounded-xl bg-grappler-700 hover:bg-grappler-600 text-grappler-200 font-bold text-xl transition-colors flex items-center justify-center"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={protocolEstimate || ''}
                    onChange={(e) =>
                      setProtocolEstimate(Math.max(0, parseInt(e.target.value) || 0))
                    }
                    placeholder={calculations.average > 0 ? String(Math.round(calculations.average)) : '0'}
                    className="flex-1 bg-grappler-800 border border-grappler-700 rounded-lg p-3 text-center text-2xl font-bold text-grappler-50 focus:outline-none focus:border-primary-500 transition-colors placeholder:text-grappler-600"
                  />
                  <button
                    onClick={() => setProtocolEstimate((prev) => prev + 5)}
                    className="w-12 h-12 rounded-xl bg-grappler-700 hover:bg-grappler-600 text-grappler-200 font-bold text-xl transition-colors flex items-center justify-center"
                  >
                    +
                  </button>
                </div>

                {calculations.average > 0 && protocolEstimate === 0 && (
                  <button
                    onClick={() => setProtocolEstimate(Math.round(calculations.average))}
                    className="mt-3 w-full py-2 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm font-medium hover:bg-primary-500/20 transition-colors"
                  >
                    Use calculator estimate: {Math.round(calculations.average)} {unit}
                  </button>
                )}

                <button
                  onClick={startProtocol}
                  disabled={protocolEstimate <= 0 && calculations.average <= 0}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-500 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/25"
                >
                  <Play className="w-4 h-4" />
                  Start Testing Protocol
                </button>
              </div>
            )}

            {/* Safety Reminders */}
            <div className="bg-gradient-to-br from-warning/10 to-error/5 border border-warning/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-warning" />
                <h4 className="text-sm font-medium text-grappler-200">Safety Reminders</h4>
              </div>
              <ul className="space-y-2 text-sm text-grappler-300">
                <li className="flex items-start gap-2">
                  <span className="text-warning mt-0.5 flex-shrink-0">&#x2022;</span>
                  <span>Always use a spotter for squat and bench press attempts.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-warning mt-0.5 flex-shrink-0">&#x2022;</span>
                  <span>Know your bail-out technique before attempting heavy singles.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-warning mt-0.5 flex-shrink-0">&#x2022;</span>
                  <span>Stop immediately if form breaks down. A missed lift is not failure.</span>
                </li>
              </ul>
            </div>

            {/* Protocol Sets */}
            {protocolStarted && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-grappler-200">
                    Warm-Up Protocol for {selectedExercise}
                  </h4>
                  <button
                    onClick={() => {
                      setProtocolStarted(false);
                      setProtocolSets([]);
                      setActual1RM('');
                    }}
                    className="text-xs text-grappler-500 hover:text-grappler-300 transition-colors"
                  >
                    Reset
                  </button>
                </div>

                {protocolSets.map((set, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.06 }}
                    className={`rounded-xl p-4 border transition-all ${
                      set.completed
                        ? 'bg-success/10 border-success/30'
                        : 'bg-grappler-800 border-grappler-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleSetComplete(index)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                            set.completed
                              ? 'bg-success border-success text-white'
                              : 'border-grappler-600 text-grappler-600 hover:border-primary-400'
                          }`}
                        >
                          {set.completed && <Check className="w-4 h-4" />}
                        </button>
                        <div>
                          <p
                            className={`text-sm font-bold ${
                              set.completed ? 'text-success line-through' : 'text-grappler-50'
                            }`}
                          >
                            {set.label}
                            {set.percentage !== null && (
                              <span className="text-grappler-400 font-normal">
                                {' '}
                                — {set.percentage}%
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-grappler-400">{set.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-grappler-200">
                          x{set.reps} {set.reps === 1 ? 'rep' : 'reps'}
                        </p>
                        <p className="text-xs text-grappler-500">Rest: {set.rest}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Record Actual 1RM */}
                <div className="bg-grappler-800 rounded-xl p-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-primary-400" />
                    <h4 className="text-sm font-medium text-grappler-200">
                      Record Actual 1RM
                    </h4>
                  </div>
                  <p className="text-xs text-grappler-500 mb-3">
                    Enter the weight you successfully lifted for 1 rep.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={actual1RM}
                      onChange={(e) => setActual1RM(e.target.value)}
                      placeholder="Enter weight"
                      className="flex-1 bg-grappler-800 border border-grappler-700 rounded-lg p-3 text-center text-2xl font-bold text-grappler-50 focus:outline-none focus:border-primary-500 transition-colors placeholder:text-grappler-600 placeholder:text-base placeholder:font-normal"
                    />
                    <span className="text-sm text-grappler-400 font-medium">{unit}</span>
                  </div>

                  {actual1RM && parseFloat(actual1RM) > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 bg-gradient-to-br from-primary-500/15 to-accent-500/10 border border-primary-500/20 rounded-xl p-4 text-center"
                    >
                      <p className="text-xs text-grappler-400 mb-1">
                        Your {selectedExercise} 1RM
                      </p>
                      <p className="text-4xl font-bold text-primary-400">
                        {parseFloat(actual1RM)}{' '}
                        <span className="text-lg text-grappler-400">{unit}</span>
                      </p>
                      {protocolEstimate > 0 && (
                        <p className="text-xs text-grappler-500 mt-2">
                          {parseFloat(actual1RM) >= protocolEstimate
                            ? `+${Math.round(parseFloat(actual1RM) - protocolEstimate)} ${unit} above estimate`
                            : `${Math.round(protocolEstimate - parseFloat(actual1RM))} ${unit} below estimate`}
                        </p>
                      )}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
