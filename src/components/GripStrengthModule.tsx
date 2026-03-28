'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import {
  X,
  Grip,
  Plus,
  Minus,
  Check,
  TrendingUp,
  Timer,
  Dumbbell,
  Target,
  Info,
  ChevronDown,
  ChevronUp,
  Star,
  Flame,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GripTest, GripExerciseLog } from '@/lib/types';

interface GripStrengthModuleProps {
  onClose: () => void;
}

// Grip exercises optimized for grapplers
const GRIP_EXERCISES = [
  {
    id: 'dead-hang',
    name: 'Dead Hang',
    description: 'Fundamental grip endurance - hold the bar as long as possible',
    targetMuscles: ['Forearms', 'Grip', 'Lats'],
    trackingType: 'time' as const,
    unit: 'seconds',
    grapplingBenefit: 'Essential for maintaining grips during extended scrambles',
    difficulty: 'beginner',
    icon: Timer,
  },
  {
    id: 'towel-hang',
    name: 'Towel Hang',
    description: 'Gi-grip simulation - hang from a towel draped over a bar',
    targetMuscles: ['Forearms', 'Fingers', 'Grip'],
    trackingType: 'time' as const,
    unit: 'seconds',
    grapplingBenefit: 'Directly transfers to gi gripping strength',
    difficulty: 'intermediate',
    icon: Timer,
  },
  {
    id: 'farmers-walk',
    name: "Farmer's Walk",
    description: 'Loaded carry for crushing grip and full-body stability',
    targetMuscles: ['Forearms', 'Traps', 'Core', 'Grip'],
    trackingType: 'weight_distance' as const,
    unit: 'lbs x feet',
    grapplingBenefit: 'Builds the crushing grip needed for underhooks and body locks',
    difficulty: 'intermediate',
    icon: Dumbbell,
  },
  {
    id: 'plate-pinch',
    name: 'Plate Pinch Hold',
    description: 'Pinch grip for thumb strength and finger coordination',
    targetMuscles: ['Fingers', 'Thumb', 'Forearms'],
    trackingType: 'time' as const,
    unit: 'seconds',
    grapplingBenefit: 'Critical for collar ties, sleeve grips, and wrist control',
    difficulty: 'intermediate',
    icon: Timer,
  },
  {
    id: 'wrist-curl',
    name: 'Wrist Curls',
    description: 'Forearm flexor strengthening for grip crushing power',
    targetMuscles: ['Forearm Flexors'],
    trackingType: 'weight_reps' as const,
    unit: 'lbs x reps',
    grapplingBenefit: 'Increases squeeze strength for guillotines and RNCs',
    difficulty: 'beginner',
    icon: Dumbbell,
  },
  {
    id: 'reverse-wrist-curl',
    name: 'Reverse Wrist Curls',
    description: 'Forearm extensor strengthening for grip balance',
    targetMuscles: ['Forearm Extensors'],
    trackingType: 'weight_reps' as const,
    unit: 'lbs x reps',
    grapplingBenefit: 'Prevents imbalances and elbow issues from gripping',
    difficulty: 'beginner',
    icon: Dumbbell,
  },
  {
    id: 'gi-pull-ups',
    name: 'Gi/Towel Pull-ups',
    description: 'Pull-ups gripping a gi or towel',
    targetMuscles: ['Lats', 'Grip', 'Biceps', 'Forearms'],
    trackingType: 'reps' as const,
    unit: 'reps',
    grapplingBenefit: 'Simulates pulling opponent while gripping the gi',
    difficulty: 'advanced',
    icon: Dumbbell,
  },
  {
    id: 'rice-bucket',
    name: 'Rice Bucket Training',
    description: 'Hand/finger dexterity and forearm pump',
    targetMuscles: ['Fingers', 'Forearms', 'Wrists'],
    trackingType: 'time' as const,
    unit: 'seconds',
    grapplingBenefit: 'Rehabilitation and prehab for grip-intensive training',
    difficulty: 'beginner',
    icon: Timer,
  },
];

// Standards for grip strength benchmarks (based on grappling needs)
const GRIP_BENCHMARKS = {
  'dead-hang': { beginner: 30, intermediate: 60, advanced: 90, elite: 120 },
  'towel-hang': { beginner: 15, intermediate: 30, advanced: 45, elite: 60 },
  'plate-pinch': { beginner: 15, intermediate: 30, advanced: 45, elite: 60 },
  'gi-pull-ups': { beginner: 3, intermediate: 8, advanced: 12, elite: 20 },
};

export default function GripStrengthModule({ onClose }: GripStrengthModuleProps) {
  const { gripTests = [], gripExerciseLogs = [], addGripTest, addGripExerciseLog } = useAppStore();

  const [activeTab, setActiveTab] = useState<'exercises' | 'tests' | 'progress'>('exercises');
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [showAddTest, setShowAddTest] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Log exercise inputs
  const [logTime, setLogTime] = useState(30);
  const [logWeight, setLogWeight] = useState(50);
  const [logReps, setLogReps] = useState(10);
  const [logDistance, setLogDistance] = useState(100);
  const [logNotes, setLogNotes] = useState('');

  // Test inputs
  const [testType, setTestType] = useState<'hang_time' | 'dynamometer'>('hang_time');
  const [testValue, setTestValue] = useState(60);
  const [testHand, setTestHand] = useState<'left' | 'right' | 'both'>('both');

  // Get recent logs for an exercise
  const getRecentLogs = (exerciseId: string) => {
    return gripExerciseLogs
      .filter(log => log.exerciseId === exerciseId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  };

  // Get personal best for an exercise
  const getPersonalBest = (exerciseId: string) => {
    const logs = gripExerciseLogs.filter(log => log.exerciseId === exerciseId);
    if (logs.length === 0) return null;

    const exercise = GRIP_EXERCISES.find(e => e.id === exerciseId);
    if (!exercise) return null;

    if (exercise.trackingType === 'time' || exercise.trackingType === 'reps') {
      return Math.max(...logs.map(l => l.value));
    }
    if (exercise.trackingType === 'weight_reps' || exercise.trackingType === 'weight_distance') {
      // For weighted exercises, find max weight
      return Math.max(...logs.map(l => l.weight || 0));
    }
    return null;
  };

  // Get benchmark level for an exercise
  const getBenchmarkLevel = (exerciseId: string, value: number): string => {
    const benchmarks = GRIP_BENCHMARKS[exerciseId as keyof typeof GRIP_BENCHMARKS];
    if (!benchmarks) return 'unranked';

    if (value >= benchmarks.elite) return 'elite';
    if (value >= benchmarks.advanced) return 'advanced';
    if (value >= benchmarks.intermediate) return 'intermediate';
    if (value >= benchmarks.beginner) return 'beginner';
    return 'novice';
  };

  // Calculate grip score (0-100) based on all tests and exercises
  const gripScore = useMemo(() => {
    let totalScore = 0;
    let maxScore = 0;

    // Score from tests
    const latestHangTest = gripTests
      .filter(t => t.type === 'hang_time')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (latestHangTest) {
      const hangBenchmark = GRIP_BENCHMARKS['dead-hang'];
      const hangScore = Math.min(100, (latestHangTest.value / hangBenchmark.elite) * 100);
      totalScore += hangScore * 0.4; // 40% weight
      maxScore += 40;
    }

    // Score from exercise PRs
    ['dead-hang', 'towel-hang', 'gi-pull-ups'].forEach(exId => {
      const pb = getPersonalBest(exId);
      if (pb) {
        const benchmark = GRIP_BENCHMARKS[exId as keyof typeof GRIP_BENCHMARKS];
        if (benchmark) {
          const score = Math.min(100, (pb / benchmark.elite) * 100);
          totalScore += score * 0.2; // 20% each
          maxScore += 20;
        }
      }
    });

    return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  }, [gripTests, gripExerciseLogs]);

  const handleLogExercise = () => {
    const exercise = GRIP_EXERCISES.find(e => e.id === selectedExercise);
    if (!exercise) return;

    let value = 0;
    let weight: number | undefined;
    let reps: number | undefined;
    let distance: number | undefined;

    switch (exercise.trackingType) {
      case 'time':
        value = logTime;
        break;
      case 'reps':
        value = logReps;
        break;
      case 'weight_reps':
        value = logReps;
        weight = logWeight;
        reps = logReps;
        break;
      case 'weight_distance':
        value = logDistance;
        weight = logWeight;
        distance = logDistance;
        break;
    }

    addGripExerciseLog({
      exerciseId: exercise.id,
      date: new Date(),
      value,
      weight,
      reps,
      distance,
      notes: logNotes || undefined,
    });

    setSuccessMessage(`${exercise.name} logged!`);
    setShowSuccess(true);
    setSelectedExercise(null);
    setLogNotes('');
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleAddTest = () => {
    addGripTest({
      type: testType,
      value: testValue,
      hand: testHand,
      date: new Date(),
    });

    setSuccessMessage(`Grip test recorded: ${testValue}${testType === 'hang_time' ? 's' : ' lbs'}`);
    setShowSuccess(true);
    setShowAddTest(false);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const exercise = selectedExercise ? GRIP_EXERCISES.find(e => e.id === selectedExercise) : null;

  return (
    <div className="min-h-screen bg-grappler-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-grappler-950/95 backdrop-blur border-b border-grappler-800">
        <div className="p-4 flex items-center gap-3">
          <button aria-label="Close" onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Grip className="w-5 h-5 text-blue-400" />
              Grip Strength
            </h1>
            <p className="text-sm text-grappler-400">Track and build grappling grip</p>
          </div>
          {gripScore > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded-lg">
              <span className="text-xs text-grappler-400">Score</span>
              <span className="text-lg font-bold text-blue-400">{gripScore}</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-grappler-800">
          {(['exercises', 'tests', 'progress'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium transition-colors",
                activeTab === tab
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-grappler-400 hover:text-gray-300"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-2 rounded-xl flex items-center gap-2"
          >
            <Check className="w-5 h-5" />
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 space-y-4">
        {/* Exercises Tab */}
        {activeTab === 'exercises' && !selectedExercise && (
          <>
            {/* Exercise Grid */}
            <div className="grid gap-3">
              {GRIP_EXERCISES.map((ex) => {
                const pb = getPersonalBest(ex.id);
                const level = pb ? getBenchmarkLevel(ex.id, pb) : null;
                const recentLogs = getRecentLogs(ex.id);

                return (
                  <motion.button
                    key={ex.id}
                    onClick={() => setSelectedExercise(ex.id)}
                    whileTap={{ scale: 0.98 }}
                    className="card p-4 text-left hover:border-blue-500/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        ex.difficulty === 'beginner' ? 'bg-green-500/20 text-green-400' :
                        ex.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      )}>
                        <ex.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-white">{ex.name}</h3>
                          {level && (
                            <span className={cn(
                              "text-xs px-1.5 py-0.5 rounded font-medium",
                              level === 'elite' ? 'bg-purple-500/20 text-purple-300' :
                              level === 'advanced' ? 'bg-blue-500/20 text-blue-300' :
                              level === 'intermediate' ? 'bg-green-500/20 text-green-300' :
                              'bg-gray-500/20 text-gray-300'
                            )}>
                              {level.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-grappler-400 mt-0.5 line-clamp-1">{ex.description}</p>
                        {pb && (
                          <p className="text-xs text-blue-400 mt-1">
                            PR: {pb} {ex.unit.split(' ')[0]}
                          </p>
                        )}
                      </div>
                      <ChevronDown className="w-4 h-4 text-grappler-400 -rotate-90" />
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Grip Training Tip */}
            <div className="card p-4 bg-blue-500/10 border-blue-500/30">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-300 text-sm">Grip Training for Grapplers</h4>
                  <p className="text-xs text-grappler-400 mt-1">
                    Train grip 2-3x per week. Focus on hang time for endurance, towel work for gi grips,
                    and pinch holds for no-gi control. Always balance flexor work with extensor work.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Exercise Detail/Log View */}
        {activeTab === 'exercises' && selectedExercise && exercise && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <button
              onClick={() => setSelectedExercise(null)}
              className="flex items-center gap-1 text-sm text-grappler-400 hover:text-white"
            >
              <ChevronUp className="w-4 h-4 rotate-90" />
              Back to exercises
            </button>

            <div className="card p-4">
              <h2 className="text-lg font-bold text-white">{exercise.name}</h2>
              <p className="text-sm text-grappler-400 mt-1">{exercise.description}</p>

              <div className="mt-3 p-3 bg-lime-500/10 border border-lime-500/20 rounded-lg">
                <p className="text-xs text-lime-300">
                  <strong>Grappling Benefit:</strong> {exercise.grapplingBenefit}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {exercise.targetMuscles.map(muscle => (
                  <span key={muscle} className="text-xs px-2 py-1 bg-grappler-800 rounded text-gray-300">
                    {muscle}
                  </span>
                ))}
              </div>
            </div>

            {/* Log Input */}
            <div className="card p-4 space-y-4">
              <h3 className="font-medium text-white">Log {exercise.name}</h3>

              {exercise.trackingType === 'time' && (
                <div className="space-y-2">
                  <label className="text-sm text-grappler-400">Duration (seconds)</label>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setLogTime(Math.max(5, logTime - 5))}
                      className="btn btn-circle btn-ghost"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <input
                      type="number"
                      value={logTime}
                      onChange={(e) => setLogTime(parseInt(e.target.value) || 0)}
                      className="input input-bordered w-24 text-center text-xl font-bold"
                    />
                    <button
                      onClick={() => setLogTime(logTime + 5)}
                      className="btn btn-circle btn-ghost"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {exercise.trackingType === 'reps' && (
                <div className="space-y-2">
                  <label className="text-sm text-grappler-400">Reps</label>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setLogReps(Math.max(1, logReps - 1))}
                      className="btn btn-circle btn-ghost"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <input
                      type="number"
                      value={logReps}
                      onChange={(e) => setLogReps(parseInt(e.target.value) || 0)}
                      className="input input-bordered w-24 text-center text-xl font-bold"
                    />
                    <button
                      onClick={() => setLogReps(logReps + 1)}
                      className="btn btn-circle btn-ghost"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {(exercise.trackingType === 'weight_reps' || exercise.trackingType === 'weight_distance') && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm text-grappler-400">Weight (lbs)</label>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setLogWeight(Math.max(5, logWeight - 5))}
                        className="btn btn-circle btn-ghost"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <input
                        type="number"
                        value={logWeight}
                        onChange={(e) => setLogWeight(parseInt(e.target.value) || 0)}
                        className="input input-bordered w-24 text-center text-xl font-bold"
                      />
                      <button
                        onClick={() => setLogWeight(logWeight + 5)}
                        className="btn btn-circle btn-ghost"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {exercise.trackingType === 'weight_reps' && (
                    <div className="space-y-2">
                      <label className="text-sm text-grappler-400">Reps</label>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setLogReps(Math.max(1, logReps - 1))}
                          className="btn btn-circle btn-ghost"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                        <input
                          type="number"
                          value={logReps}
                          onChange={(e) => setLogReps(parseInt(e.target.value) || 0)}
                          className="input input-bordered w-20 text-center text-xl font-bold"
                        />
                        <button
                          onClick={() => setLogReps(logReps + 1)}
                          className="btn btn-circle btn-ghost"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {exercise.trackingType === 'weight_distance' && (
                    <div className="space-y-2">
                      <label className="text-sm text-grappler-400">Distance (feet)</label>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setLogDistance(Math.max(10, logDistance - 10))}
                          className="btn btn-circle btn-ghost"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                        <input
                          type="number"
                          value={logDistance}
                          onChange={(e) => setLogDistance(parseInt(e.target.value) || 0)}
                          className="input input-bordered w-24 text-center text-xl font-bold"
                        />
                        <button
                          onClick={() => setLogDistance(logDistance + 10)}
                          className="btn btn-circle btn-ghost"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="space-y-2">
                <label className="text-sm text-grappler-400">Notes (optional)</label>
                <input
                  type="text"
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder="e.g., felt strong, grip gave out at 45s"
                  className="input input-bordered w-full text-sm"
                />
              </div>

              <button
                onClick={handleLogExercise}
                className="btn btn-primary w-full gap-2"
              >
                <Check className="w-4 h-4" />
                Log Exercise
              </button>
            </div>

            {/* Recent History */}
            {getRecentLogs(exercise.id).length > 0 && (
              <div className="card p-4">
                <h3 className="font-medium text-white mb-3">Recent History</h3>
                <div className="space-y-2">
                  {getRecentLogs(exercise.id).map((log, idx) => (
                    <div key={log.id || idx} className="flex justify-between items-center text-sm py-2 border-b border-grappler-800 last:border-0">
                      <span className="text-grappler-400">
                        {new Date(log.date).toLocaleDateString()}
                      </span>
                      <span className="font-medium text-white">
                        {exercise.trackingType === 'weight_reps' && `${log.weight}lbs x ${log.reps}`}
                        {exercise.trackingType === 'weight_distance' && `${log.weight}lbs x ${log.distance}ft`}
                        {exercise.trackingType === 'time' && `${log.value}s`}
                        {exercise.trackingType === 'reps' && `${log.value} reps`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Tests Tab */}
        {activeTab === 'tests' && (
          <div className="space-y-4">
            <button
              onClick={() => setShowAddTest(true)}
              className="btn btn-primary w-full gap-2"
            >
              <Plus className="w-4 h-4" />
              Record Grip Test
            </button>

            {/* Add Test Modal */}
            <AnimatePresence>
              {showAddTest && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="card p-4 space-y-4"
                >
                  <h3 className="font-medium text-white">Record Grip Test</h3>

                  <div className="space-y-2">
                    <label className="text-sm text-grappler-400">Test Type</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTestType('hang_time')}
                        className={cn(
                          "flex-1 py-2 rounded-lg text-sm font-medium transition-colors",
                          testType === 'hang_time'
                            ? "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500"
                            : "bg-grappler-800 text-grappler-400"
                        )}
                      >
                        Hang Time
                      </button>
                      <button
                        onClick={() => setTestType('dynamometer')}
                        className={cn(
                          "flex-1 py-2 rounded-lg text-sm font-medium transition-colors",
                          testType === 'dynamometer'
                            ? "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500"
                            : "bg-grappler-800 text-grappler-400"
                        )}
                      >
                        Grip Strength (lbs)
                      </button>
                    </div>
                  </div>

                  {testType === 'dynamometer' && (
                    <div className="space-y-2">
                      <label className="text-sm text-grappler-400">Hand</label>
                      <div className="flex gap-2">
                        {(['left', 'right', 'both'] as const).map(hand => (
                          <button
                            key={hand}
                            onClick={() => setTestHand(hand)}
                            className={cn(
                              "flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors",
                              testHand === hand
                                ? "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500"
                                : "bg-grappler-800 text-grappler-400"
                            )}
                          >
                            {hand}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm text-grappler-400">
                      {testType === 'hang_time' ? 'Time (seconds)' : 'Force (lbs)'}
                    </label>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setTestValue(Math.max(1, testValue - (testType === 'hang_time' ? 5 : 5)))}
                        className="btn btn-circle btn-ghost"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <input
                        type="number"
                        value={testValue}
                        onChange={(e) => setTestValue(parseInt(e.target.value) || 0)}
                        className="input input-bordered w-24 text-center text-xl font-bold"
                      />
                      <button
                        onClick={() => setTestValue(testValue + (testType === 'hang_time' ? 5 : 5))}
                        className="btn btn-circle btn-ghost"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddTest(false)}
                      className="btn btn-ghost flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddTest}
                      className="btn btn-primary flex-1 gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Save Test
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Test History */}
            <div className="card p-4">
              <h3 className="font-medium text-white mb-3">Test History</h3>
              {gripTests.length === 0 ? (
                <p className="text-sm text-grappler-400 text-center py-4">
                  No tests recorded yet. Record your first grip test to track progress.
                </p>
              ) : (
                <div className="space-y-2">
                  {gripTests
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 10)
                    .map((test, idx) => (
                      <div key={test.id || idx} className="flex justify-between items-center py-2 border-b border-grappler-800 last:border-0">
                        <div>
                          <span className="text-sm text-grappler-400">
                            {new Date(test.date).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-grappler-400 ml-2">
                            {test.type === 'hang_time' ? 'Hang Test' : `Dynamometer (${test.hand})`}
                          </span>
                        </div>
                        <span className="font-medium text-white">
                          {test.value}{test.type === 'hang_time' ? 's' : ' lbs'}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Benchmarks */}
            <div className="card p-4">
              <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-400" />
                Grappler Grip Benchmarks
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-grappler-800/50 rounded-lg">
                  <p className="text-sm font-medium text-white mb-2">Dead Hang</p>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-center">
                      <div className="text-grappler-400">Beginner</div>
                      <div className="font-medium text-gray-300">30s</div>
                    </div>
                    <div className="text-center">
                      <div className="text-green-500">Intermediate</div>
                      <div className="font-medium text-green-300">60s</div>
                    </div>
                    <div className="text-center">
                      <div className="text-blue-500">Advanced</div>
                      <div className="font-medium text-blue-300">90s</div>
                    </div>
                    <div className="text-center">
                      <div className="text-purple-500">Elite</div>
                      <div className="font-medium text-purple-300">120s</div>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-grappler-800/50 rounded-lg">
                  <p className="text-sm font-medium text-white mb-2">Towel Hang (Gi Grip)</p>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-center">
                      <div className="text-grappler-400">Beginner</div>
                      <div className="font-medium text-gray-300">15s</div>
                    </div>
                    <div className="text-center">
                      <div className="text-green-500">Intermediate</div>
                      <div className="font-medium text-green-300">30s</div>
                    </div>
                    <div className="text-center">
                      <div className="text-blue-500">Advanced</div>
                      <div className="font-medium text-blue-300">45s</div>
                    </div>
                    <div className="text-center">
                      <div className="text-purple-500">Elite</div>
                      <div className="font-medium text-purple-300">60s</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <div className="space-y-4">
            {/* Grip Score Card */}
            <div className="card p-4 text-center">
              <h3 className="text-sm text-grappler-400 mb-2">Your Grip Score</h3>
              <div className="text-5xl font-bold text-blue-400">{gripScore}</div>
              <p className="text-xs text-grappler-400 mt-2">
                Based on your tests and exercise PRs
              </p>
            </div>

            {/* Exercise PRs */}
            <div className="card p-4">
              <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" />
                Personal Records
              </h3>
              <div className="space-y-3">
                {GRIP_EXERCISES.map(ex => {
                  const pb = getPersonalBest(ex.id);
                  const level = pb ? getBenchmarkLevel(ex.id, pb) : null;

                  return (
                    <div key={ex.id} className="flex items-center justify-between py-2">
                      <span className="text-sm text-grappler-400">{ex.name}</span>
                      {pb ? (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">
                            {pb} {ex.unit.split(' ')[0]}
                          </span>
                          {level && (
                            <span className={cn(
                              "text-xs px-1.5 py-0.5 rounded font-medium",
                              level === 'elite' ? 'bg-purple-500/20 text-purple-300' :
                              level === 'advanced' ? 'bg-blue-500/20 text-blue-300' :
                              level === 'intermediate' ? 'bg-green-500/20 text-green-300' :
                              'bg-gray-500/20 text-gray-300'
                            )}>
                              {level.toUpperCase()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-600">No data</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Training Recommendations */}
            <div className="card p-4">
              <h3 className="font-medium text-white mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary-400" />
                Recommendations
              </h3>
              <div className="space-y-3 text-sm">
                {gripScore < 30 && (
                  <p className="text-grappler-400">
                    Focus on <span className="text-blue-300">dead hangs</span> 3x per week.
                    Start with 3 sets to failure and track your progress.
                  </p>
                )}
                {gripScore >= 30 && gripScore < 60 && (
                  <p className="text-grappler-400">
                    Add <span className="text-blue-300">towel hangs</span> and{' '}
                    <span className="text-blue-300">plate pinches</span> to develop
                    grappling-specific grip strength.
                  </p>
                )}
                {gripScore >= 60 && (
                  <p className="text-grappler-400">
                    Strong grip! Focus on <span className="text-blue-300">gi pull-ups</span>{' '}
                    and <span className="text-blue-300">farmer&apos;s walks</span> for
                    competition-level grip endurance.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
