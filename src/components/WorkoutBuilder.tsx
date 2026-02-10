'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { exercises as allExercises, getExercisesByEquipment } from '@/lib/exercises';
import { generateQuickWorkout } from '@/lib/workout-generator';
import {
  Search,
  Filter,
  Plus,
  X,
  Dumbbell,
  Play,
  ChevronDown,
  ChevronUp,
  Minus,
  Zap,
  Heart,
  Flame,
  Target,
  Shuffle,
  Layers,
  GripVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Exercise,
  MuscleGroup,
  ExerciseCategory,
  MovementPattern,
  WorkoutType,
  SetPrescription,
  ExercisePrescription,
  WorkoutSession
} from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

type BuilderView = 'browse' | 'build' | 'templates';

interface BuiltExercise {
  exercise: Exercise;
  sets: number;
  reps: number;
  rpe: number;
  restSeconds: number;
}

// Preset mesocycle templates
const MESOCYCLE_TEMPLATES = [
  {
    id: 'push_pull_legs',
    name: 'Push / Pull / Legs',
    description: 'Classic 3-day split targeting push muscles, pull muscles, and legs separately',
    sessions: 3,
    focus: 'hypertrophy' as const,
    muscleGroups: ['chest', 'shoulders', 'triceps', 'back', 'biceps', 'quadriceps', 'hamstrings', 'glutes'],
    icon: '💪'
  },
  {
    id: 'upper_lower',
    name: 'Upper / Lower',
    description: 'Alternating upper and lower body days. Great for 2-day schedules',
    sessions: 2,
    focus: 'balanced' as const,
    muscleGroups: ['chest', 'back', 'shoulders', 'quadriceps', 'hamstrings', 'glutes'],
    icon: '⬆️'
  },
  {
    id: 'full_body_strength',
    name: 'Full Body Strength',
    description: 'Heavy compound lifts every session. Maximum strength gains',
    sessions: 3,
    focus: 'strength' as const,
    muscleGroups: ['full_body'],
    icon: '🏋️'
  },
  {
    id: 'grappler_hybrid',
    name: 'Rootsler Hybrid',
    description: 'Strength + power + grip work designed around mat time. Our recommended split',
    sessions: 3,
    focus: 'balanced' as const,
    muscleGroups: ['full_body'],
    icon: '🥋'
  },
  {
    id: 'chest_back',
    name: 'Chest & Back Focus',
    description: 'Prioritize pushing and pulling muscles for upper body development',
    sessions: 3,
    focus: 'hypertrophy' as const,
    muscleGroups: ['chest', 'back', 'shoulders'],
    icon: '🎯'
  },
  {
    id: 'leg_day_focus',
    name: 'Leg Day Specialist',
    description: 'Extra lower body volume for wrestlers and takedown artists',
    sessions: 3,
    focus: 'hypertrophy' as const,
    muscleGroups: ['quadriceps', 'hamstrings', 'glutes', 'calves'],
    icon: '🦵'
  },
  {
    id: 'power_athlete',
    name: 'Power Athlete',
    description: 'Explosive training for speed, power, and athletic performance',
    sessions: 3,
    focus: 'power' as const,
    muscleGroups: ['full_body'],
    icon: '⚡'
  },
  {
    id: 'minimalist',
    name: 'Minimalist (2x/week)',
    description: 'Maximum results with minimum time. 2 sessions of key compounds',
    sessions: 2,
    focus: 'strength' as const,
    muscleGroups: ['full_body'],
    icon: '⏱️'
  }
];

const MUSCLE_GROUP_LABELS: Record<string, string> = {
  chest: 'Chest', back: 'Back', shoulders: 'Shoulders', biceps: 'Biceps',
  triceps: 'Triceps', quadriceps: 'Quads', hamstrings: 'Hamstrings',
  glutes: 'Glutes', calves: 'Calves', core: 'Core', forearms: 'Forearms',
  traps: 'Traps', full_body: 'Full Body'
};

const CATEGORY_LABELS: Record<string, string> = {
  compound: 'Compound', isolation: 'Isolation', power: 'Power',
  grappling_specific: 'Grappling', grip: 'Grip'
};

interface WorkoutBuilderProps {
  onClose: () => void;
}

export default function WorkoutBuilder({ onClose }: WorkoutBuilderProps) {
  const { user, startWorkout, generateNewMesocycle } = useAppStore();
  const [view, setView] = useState<BuilderView>('templates');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Builder state
  const [builtExercises, setBuiltExercises] = useState<BuiltExercise[]>([]);
  const [workoutName, setWorkoutName] = useState('Custom Workout');
  const [workoutType, setWorkoutType] = useState<WorkoutType>('hypertrophy');
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);

  const equipment = user?.equipment || 'full_gym';

  // Filtered exercises
  const filteredExercises = useMemo(() => {
    let result = getExercisesByEquipment(equipment);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.primaryMuscles.some(m => m.toLowerCase().includes(q)) ||
        e.category.toLowerCase().includes(q) ||
        e.movementPattern.toLowerCase().includes(q)
      );
    }

    if (selectedMuscle !== 'all') {
      result = result.filter(e =>
        e.primaryMuscles.includes(selectedMuscle) ||
        e.secondaryMuscles.includes(selectedMuscle)
      );
    }

    if (selectedCategory !== 'all') {
      result = result.filter(e => e.category === selectedCategory);
    }

    return result;
  }, [equipment, searchQuery, selectedMuscle, selectedCategory]);

  const addExercise = (exercise: Exercise) => {
    if (builtExercises.find(e => e.exercise.id === exercise.id)) return;
    const defaults = workoutType === 'strength'
      ? { sets: 4, reps: 5, rpe: 8.5, restSeconds: 180 }
      : workoutType === 'power'
      ? { sets: 4, reps: 3, rpe: 7, restSeconds: 150 }
      : { sets: 3, reps: 10, rpe: 8, restSeconds: 90 };

    setBuiltExercises([...builtExercises, { exercise, ...defaults }]);
    // Switch to build view when first exercise added
    if (builtExercises.length === 0) setView('build');
  };

  const removeExercise = (exerciseId: string) => {
    setBuiltExercises(builtExercises.filter(e => e.exercise.id !== exerciseId));
  };

  const updateBuiltExercise = (exerciseId: string, field: keyof BuiltExercise, value: number) => {
    setBuiltExercises(builtExercises.map(e =>
      e.exercise.id === exerciseId ? { ...e, [field]: value } : e
    ));
  };

  const startCustomWorkout = () => {
    if (builtExercises.length === 0) return;

    const session: WorkoutSession = {
      id: uuidv4(),
      name: workoutName,
      type: workoutType,
      dayNumber: 1,
      exercises: builtExercises.map(be => ({
        exerciseId: be.exercise.id,
        exercise: be.exercise,
        sets: be.sets,
        prescription: {
          targetReps: be.reps,
          minReps: Math.max(1, be.reps - 2),
          maxReps: be.reps + 2,
          rpe: be.rpe,
          restSeconds: be.restSeconds
        }
      })),
      estimatedDuration: builtExercises.reduce((sum, e) =>
        sum + (e.sets * 2) + (e.sets * e.restSeconds / 60), 5
      ),
      warmUp: ['5 min light cardio', 'Dynamic stretching', 'Warm-up sets at 50% weight'],
      coolDown: ['Static stretching', 'Foam rolling target muscles']
    };

    startWorkout(session);
    onClose();
  };

  const startFromTemplate = (templateId: string) => {
    const template = MESOCYCLE_TEMPLATES.find(t => t.id === templateId);
    if (!template || !user) return;

    // Generate a mesocycle with the user's settings
    generateNewMesocycle(5);
    onClose();
  };

  const startQuickFromTemplate = (templateId: string) => {
    if (!user) return;
    const quickSession = generateQuickWorkout(user.equipment, 45, user.goalFocus);
    startWorkout(quickSession);
    onClose();
  };

  // Calculate total stats for built workout
  const totalSets = builtExercises.reduce((sum, e) => sum + e.sets, 0);
  const estDuration = builtExercises.reduce((sum, e) =>
    sum + (e.sets * 2) + (e.sets * e.restSeconds / 60), 5
  );

  return (
    <div className="fixed inset-0 z-50 bg-grappler-900 overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-grappler-900/95 backdrop-blur-xl border-b border-grappler-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            <X className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-grappler-50">
            {view === 'browse' ? 'Exercise Database' : view === 'build' ? 'Build Workout' : 'Program Templates'}
          </h1>
          {view === 'build' && builtExercises.length > 0 ? (
            <button onClick={startCustomWorkout} className="btn btn-primary btn-sm gap-1">
              <Play className="w-4 h-4" />
              Go
            </button>
          ) : (
            <div className="w-16" />
          )}
        </div>

        {/* View Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'templates', label: 'Templates', icon: Layers },
            { id: 'browse', label: 'Exercises', icon: Search },
            { id: 'build', label: `Build${builtExercises.length > 0 ? ` (${builtExercises.length})` : ''}`, icon: Dumbbell }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id as BuilderView)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                view === tab.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-grappler-800 text-grappler-400 hover:text-grappler-200'
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="p-4 pb-32">
        {/* Templates View */}
        {view === 'templates' && (
          <div className="space-y-3">
            <p className="text-sm text-grappler-400 mb-2">
              Choose a program template or build your own from the exercise database
            </p>

            {MESOCYCLE_TEMPLATES.map((template) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-grappler-700 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                    {template.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-grappler-100">{template.name}</h3>
                      <span className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-medium',
                        template.focus === 'strength' ? 'bg-red-500/20 text-red-400' :
                        template.focus === 'hypertrophy' ? 'bg-purple-500/20 text-purple-400' :
                        template.focus === 'power' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-primary-500/20 text-primary-400'
                      )}>
                        {template.focus}
                      </span>
                    </div>
                    <p className="text-xs text-grappler-400 mb-2">{template.description}</p>
                    <div className="flex items-center gap-3 text-xs text-grappler-500 mb-3">
                      <span>{template.sessions}x/week</span>
                      <span>5-week block</span>
                    </div>
                    <button
                      onClick={() => startFromTemplate(template.id)}
                      className="btn btn-primary btn-sm w-full gap-1"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Generate This Program
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Exercise Browser View */}
        {view === 'browse' && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grappler-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search exercises, muscles, or patterns..."
                className="input pl-10 pr-10"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-grappler-500" />
                </button>
              )}
            </div>

            {/* Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm text-grappler-400 hover:text-grappler-200"
            >
              <Filter className="w-4 h-4" />
              Filters
              {(selectedMuscle !== 'all' || selectedCategory !== 'all') && (
                <span className="w-2 h-2 bg-primary-500 rounded-full" />
              )}
              {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Filter Options */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-3"
                >
                  <div>
                    <p className="text-xs text-grappler-500 uppercase tracking-wide mb-2">Muscle Group</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setSelectedMuscle('all')}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-xs font-medium',
                          selectedMuscle === 'all' ? 'bg-primary-500 text-white' : 'bg-grappler-800 text-grappler-400'
                        )}
                      >
                        All
                      </button>
                      {Object.entries(MUSCLE_GROUP_LABELS).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setSelectedMuscle(key as MuscleGroup)}
                          className={cn(
                            'px-2.5 py-1 rounded-full text-xs font-medium',
                            selectedMuscle === key ? 'bg-primary-500 text-white' : 'bg-grappler-800 text-grappler-400'
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-grappler-500 uppercase tracking-wide mb-2">Category</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setSelectedCategory('all')}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-xs font-medium',
                          selectedCategory === 'all' ? 'bg-primary-500 text-white' : 'bg-grappler-800 text-grappler-400'
                        )}
                      >
                        All
                      </button>
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setSelectedCategory(key as ExerciseCategory)}
                          className={cn(
                            'px-2.5 py-1 rounded-full text-xs font-medium',
                            selectedCategory === key ? 'bg-primary-500 text-white' : 'bg-grappler-800 text-grappler-400'
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results Count */}
            <p className="text-xs text-grappler-500">
              {filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''} found
            </p>

            {/* Exercise List */}
            <div className="space-y-2">
              {filteredExercises.map((exercise) => {
                const isAdded = builtExercises.some(e => e.exercise.id === exercise.id);
                const isExpanded = expandedExercise === exercise.id;

                return (
                  <div key={exercise.id} className="card overflow-hidden">
                    <button
                      onClick={() => setExpandedExercise(isExpanded ? null : exercise.id)}
                      className="w-full p-3 flex items-center gap-3 text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-grappler-100 truncate">{exercise.name}</p>
                          {exercise.grapplerFriendly && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-500/20 text-primary-400 flex-shrink-0">
                              Rootsler
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-grappler-400">
                          {exercise.primaryMuscles.map(m => MUSCLE_GROUP_LABELS[m] || m).join(', ')} · {CATEGORY_LABELS[exercise.category] || exercise.category}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); addExercise(exercise); }}
                        disabled={isAdded}
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                          isAdded
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-primary-500/20 text-primary-400 hover:bg-primary-500/30'
                        )}
                      >
                        {isAdded ? '✓' : <Plus className="w-4 h-4" />}
                      </button>
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="border-t border-grappler-700 p-3 space-y-2"
                      >
                        <p className="text-xs text-grappler-300">{exercise.description}</p>

                        <div className="flex flex-wrap gap-1.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-grappler-700 text-grappler-300">
                            {exercise.movementPattern}
                          </span>
                          {exercise.secondaryMuscles.map(m => (
                            <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-grappler-700 text-grappler-400">
                              {MUSCLE_GROUP_LABELS[m] || m}
                            </span>
                          ))}
                        </div>

                        <div className="flex gap-4 text-xs text-grappler-400">
                          <span>Strength: {exercise.strengthValue}/10</span>
                          <span>Aesthetic: {exercise.aestheticValue}/10</span>
                        </div>

                        {exercise.cues.length > 0 && (
                          <div>
                            <p className="text-[10px] text-grappler-500 uppercase mb-1">Form Cues</p>
                            <ul className="space-y-0.5">
                              {exercise.cues.map((cue, i) => (
                                <li key={i} className="text-xs text-grappler-400 flex items-start gap-1.5">
                                  <span className="w-1 h-1 bg-primary-400 rounded-full mt-1.5 flex-shrink-0" />
                                  {cue}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {!isAdded && (
                          <button
                            onClick={() => addExercise(exercise)}
                            className="btn btn-primary btn-sm w-full gap-1 mt-2"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add to Workout
                          </button>
                        )}
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Build View */}
        {view === 'build' && (
          <div className="space-y-4">
            {/* Workout Config */}
            <div className="card p-4 space-y-3">
              <input
                type="text"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                className="input text-lg font-bold"
                placeholder="Workout Name"
              />

              <div>
                <p className="text-xs text-grappler-500 mb-2">Workout Type</p>
                <div className="flex gap-2">
                  {([
                    { type: 'strength', label: 'Strength', icon: Zap, color: 'bg-red-500' },
                    { type: 'hypertrophy', label: 'Hypertrophy', icon: Heart, color: 'bg-purple-500' },
                    { type: 'power', label: 'Power', icon: Flame, color: 'bg-orange-500' }
                  ] as const).map((opt) => (
                    <button
                      key={opt.type}
                      onClick={() => setWorkoutType(opt.type)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all',
                        workoutType === opt.type
                          ? `${opt.color} text-white`
                          : 'bg-grappler-800 text-grappler-400'
                      )}
                    >
                      <opt.icon className="w-3.5 h-3.5" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {builtExercises.length > 0 && (
                <div className="flex gap-4 text-xs text-grappler-400 pt-1">
                  <span>{builtExercises.length} exercises</span>
                  <span>{totalSets} total sets</span>
                  <span>~{Math.round(estDuration)} min</span>
                </div>
              )}
            </div>

            {/* Exercise List */}
            {builtExercises.length === 0 ? (
              <div className="text-center py-12">
                <Dumbbell className="w-12 h-12 text-grappler-600 mx-auto mb-3" />
                <p className="text-grappler-400 mb-2">No exercises added yet</p>
                <button
                  onClick={() => setView('browse')}
                  className="btn btn-primary btn-sm gap-1"
                >
                  <Search className="w-3.5 h-3.5" />
                  Browse Exercises
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {builtExercises.map((be, index) => (
                  <motion.div
                    key={be.exercise.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="card p-3"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs text-grappler-500 font-mono w-5">{index + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-grappler-100 truncate">{be.exercise.name}</p>
                        <p className="text-[10px] text-grappler-500">
                          {be.exercise.primaryMuscles.map(m => MUSCLE_GROUP_LABELS[m] || m).join(', ')}
                        </p>
                      </div>
                      <button
                        onClick={() => removeExercise(be.exercise.id)}
                        className="p-1.5 rounded hover:bg-grappler-700 text-grappler-500 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Editable parameters */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="bg-grappler-800/50 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-grappler-500 mb-1">Sets</p>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => updateBuiltExercise(be.exercise.id, 'sets', Math.max(1, be.sets - 1))}
                            className="text-grappler-500 hover:text-grappler-200"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-bold text-grappler-100 w-5 text-center">{be.sets}</span>
                          <button
                            onClick={() => updateBuiltExercise(be.exercise.id, 'sets', Math.min(10, be.sets + 1))}
                            className="text-grappler-500 hover:text-grappler-200"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="bg-grappler-800/50 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-grappler-500 mb-1">Reps</p>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => updateBuiltExercise(be.exercise.id, 'reps', Math.max(1, be.reps - 1))}
                            className="text-grappler-500 hover:text-grappler-200"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-bold text-grappler-100 w-5 text-center">{be.reps}</span>
                          <button
                            onClick={() => updateBuiltExercise(be.exercise.id, 'reps', Math.min(30, be.reps + 1))}
                            className="text-grappler-500 hover:text-grappler-200"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="bg-grappler-800/50 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-grappler-500 mb-1">RPE</p>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => updateBuiltExercise(be.exercise.id, 'rpe', Math.max(5, be.rpe - 0.5))}
                            className="text-grappler-500 hover:text-grappler-200"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-bold text-grappler-100 w-5 text-center">{be.rpe}</span>
                          <button
                            onClick={() => updateBuiltExercise(be.exercise.id, 'rpe', Math.min(10, be.rpe + 0.5))}
                            className="text-grappler-500 hover:text-grappler-200"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="bg-grappler-800/50 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-grappler-500 mb-1">Rest</p>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => updateBuiltExercise(be.exercise.id, 'restSeconds', Math.max(30, be.restSeconds - 15))}
                            className="text-grappler-500 hover:text-grappler-200"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-[11px] font-bold text-grappler-100 w-7 text-center">
                            {be.restSeconds >= 60 ? `${Math.floor(be.restSeconds / 60)}m` : `${be.restSeconds}s`}
                          </span>
                          <button
                            onClick={() => updateBuiltExercise(be.exercise.id, 'restSeconds', Math.min(300, be.restSeconds + 15))}
                            className="text-grappler-500 hover:text-grappler-200"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Add More Button */}
                <button
                  onClick={() => setView('browse')}
                  className="w-full p-3 rounded-xl border-2 border-dashed border-grappler-700 hover:border-primary-500/50 text-grappler-400 hover:text-primary-400 flex items-center justify-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">Add Exercise</span>
                </button>

                {/* Start Button */}
                <button
                  onClick={startCustomWorkout}
                  className="btn btn-primary btn-lg w-full gap-2 mt-4"
                >
                  <Play className="w-5 h-5" />
                  Start Workout ({builtExercises.length} exercises, ~{Math.round(estDuration)} min)
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
