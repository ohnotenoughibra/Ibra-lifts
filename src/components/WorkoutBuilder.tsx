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
  Equipment,
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

type TemplateCategory = 'popular' | 'combat' | 'strength' | 'hypertrophy' | 'athletic' | 'lifestyle';

interface MesocycleTemplate {
  id: string;
  name: string;
  description: string;
  sessions: number;
  weeks: number;
  focus: 'strength' | 'hypertrophy' | 'balanced' | 'power';
  periodization: 'undulating' | 'block' | 'linear' | 'conjugate';
  category: TemplateCategory;
  tags: string[];
  icon: string;
}

// Preset mesocycle templates — comprehensive, evidence-based
const MESOCYCLE_TEMPLATES: MesocycleTemplate[] = [
  // ─── POPULAR ───
  {
    id: 'push_pull_legs',
    name: 'Push / Pull / Legs',
    description: 'The gold standard bodybuilding split. Each session targets push, pull, or leg muscles with high volume.',
    sessions: 3,
    weeks: 5,
    focus: 'hypertrophy',
    periodization: 'undulating',
    category: 'popular',
    tags: ['Bodybuilding', '2x frequency'],
    icon: '💪'
  },
  {
    id: 'upper_lower',
    name: 'Upper / Lower',
    description: '4-day split hitting each muscle 2x/week. Ideal balance of frequency, volume, and recovery.',
    sessions: 4,
    weeks: 5,
    focus: 'balanced',
    periodization: 'undulating',
    category: 'popular',
    tags: ['Versatile', '2x frequency'],
    icon: '⬆️'
  },
  {
    id: 'full_body_3x',
    name: 'Full Body 3x',
    description: 'Three full-body sessions per week. Compound-focused. Proven best for beginners and intermediates.',
    sessions: 3,
    weeks: 5,
    focus: 'strength',
    periodization: 'undulating',
    category: 'popular',
    tags: ['Beginner-friendly', 'Efficient'],
    icon: '🏋️'
  },
  {
    id: '531_progression',
    name: '5/3/1 Progression',
    description: 'Wendler-inspired 4-week waves. Submaximal training with planned progression — sustainable for years.',
    sessions: 4,
    weeks: 4,
    focus: 'strength',
    periodization: 'undulating',
    category: 'popular',
    tags: ['Long-term', 'Sustainable'],
    icon: '📈'
  },

  // ─── COMBAT SPORT ───
  {
    id: 'grappler_hybrid',
    name: 'Grappler Hybrid',
    description: 'Strength + power + grip built around mat time. Posterior chain emphasis for takedowns and guard retention.',
    sessions: 3,
    weeks: 5,
    focus: 'balanced',
    periodization: 'undulating',
    category: 'combat',
    tags: ['BJJ/Wrestling', 'Recovery-aware'],
    icon: '🥋'
  },
  {
    id: 'striker_power',
    name: 'Striker Power',
    description: 'Rotational power, shoulder endurance, and leg drive for boxing, Muay Thai, and kickboxing.',
    sessions: 3,
    weeks: 5,
    focus: 'power',
    periodization: 'undulating',
    category: 'combat',
    tags: ['Boxing/MT', 'Explosive'],
    icon: '🥊'
  },
  {
    id: 'mma_concurrent',
    name: 'MMA Concurrent',
    description: 'Balances striking, grappling, and lifting demands. Auto-scaled volume based on training load.',
    sessions: 3,
    weeks: 5,
    focus: 'balanced',
    periodization: 'undulating',
    category: 'combat',
    tags: ['MMA', 'Multi-sport'],
    icon: '🏟️'
  },
  {
    id: 'fight_camp_peak',
    name: 'Fight Camp Peaking',
    description: '4-week intensification block for fight prep. Taper volume, peak power, maintain strength.',
    sessions: 3,
    weeks: 4,
    focus: 'power',
    periodization: 'block',
    category: 'combat',
    tags: ['Competition', 'Peaking'],
    icon: '🏆'
  },
  {
    id: 'grappler_offseason',
    name: 'Grappler Off-Season',
    description: 'Higher volume when mat time is low. Build muscle and work capacity for the next competition cycle.',
    sessions: 4,
    weeks: 6,
    focus: 'hypertrophy',
    periodization: 'undulating',
    category: 'combat',
    tags: ['Off-season', 'Volume'],
    icon: '🔨'
  },

  // ─── STRENGTH ───
  {
    id: 'powerbuilding',
    name: 'Powerbuilding',
    description: 'Heavy compounds for strength + isolation accessories for size. Best of both worlds.',
    sessions: 4,
    weeks: 5,
    focus: 'strength',
    periodization: 'undulating',
    category: 'strength',
    tags: ['Hybrid', 'Compound focus'],
    icon: '🦍'
  },
  {
    id: 'dup_strength',
    name: 'Daily Undulating',
    description: 'Heavy day, volume day, speed day each week. Prevents staleness, drives adaptation through variation.',
    sessions: 3,
    weeks: 5,
    focus: 'strength',
    periodization: 'undulating',
    category: 'strength',
    tags: ['Anti-plateau', 'Varied'],
    icon: '🔄'
  },
  {
    id: 'block_periodization',
    name: 'Block Periodization',
    description: 'Accumulation → Intensification → Realization. Classic Eastern European approach for intermediate+ lifters.',
    sessions: 4,
    weeks: 6,
    focus: 'strength',
    periodization: 'block',
    category: 'strength',
    tags: ['Intermediate+', 'Periodized'],
    icon: '📊'
  },
  {
    id: 'conjugate_method',
    name: 'Conjugate Method',
    description: 'Max Effort + Dynamic Effort + Repetition Effort every week. Train strength, speed, and size simultaneously — ideal for fighters who need all qualities.',
    sessions: 3,
    weeks: 5,
    focus: 'strength',
    periodization: 'conjugate',
    category: 'strength',
    tags: ['Advanced', 'Westside', 'All Qualities'],
    icon: '⚡'
  },
  {
    id: 'conjugate_combat',
    name: 'Fighter Conjugate',
    description: 'Conjugate method adapted for combat athletes. Heavy lifts, explosive work, and GPP in every training week. Builds fight-ready strength without peaking one quality.',
    sessions: 3,
    weeks: 5,
    focus: 'power',
    periodization: 'conjugate',
    category: 'combat',
    tags: ['Advanced', 'MMA', 'BJJ'],
    icon: '🥊'
  },
  {
    id: 'strength_skill',
    name: 'Strength as Skill',
    description: 'Frequent heavy singles and doubles, low total volume. Neural efficiency over muscle damage.',
    sessions: 5,
    weeks: 4,
    focus: 'strength',
    periodization: 'undulating',
    category: 'strength',
    tags: ['Neurological', 'Low fatigue'],
    icon: '🧠'
  },

  // ─── HYPERTROPHY ───
  {
    id: 'volume_block',
    name: 'Volume Block',
    description: 'High-volume accumulation in the 8-12 rep range. Systematic overload across the mesocycle.',
    sessions: 4,
    weeks: 5,
    focus: 'hypertrophy',
    periodization: 'undulating',
    category: 'hypertrophy',
    tags: ['Muscle growth', 'Volume'],
    icon: '📐'
  },
  {
    id: 'high_frequency',
    name: 'High Frequency',
    description: 'Each muscle 3x/week with moderate per-session volume. Spreads work across more sessions.',
    sessions: 5,
    weeks: 4,
    focus: 'hypertrophy',
    periodization: 'undulating',
    category: 'hypertrophy',
    tags: ['Advanced', 'Full body'],
    icon: '📆'
  },
  {
    id: 'chest_back_focus',
    name: 'Chest & Back Focus',
    description: 'Extra pushing and pulling volume for upper body emphasis. Legs at maintenance.',
    sessions: 4,
    weeks: 5,
    focus: 'hypertrophy',
    periodization: 'undulating',
    category: 'hypertrophy',
    tags: ['Upper body', 'Specialization'],
    icon: '🎯'
  },
  {
    id: 'leg_specialization',
    name: 'Leg Specialization',
    description: 'Extra quad, hamstring, and glute volume. Upper body at maintenance. Wrestlers and athletes.',
    sessions: 4,
    weeks: 5,
    focus: 'hypertrophy',
    periodization: 'undulating',
    category: 'hypertrophy',
    tags: ['Lower body', 'Specialization'],
    icon: '🦵'
  },
  {
    id: 'long_accumulation',
    name: 'Long Accumulation',
    description: '6-8 week volume ramp. More time to build work capacity before deloading.',
    sessions: 4,
    weeks: 8,
    focus: 'hypertrophy',
    periodization: 'undulating',
    category: 'hypertrophy',
    tags: ['Patient', 'Volume build'],
    icon: '📈'
  },

  // ─── ATHLETIC ───
  {
    id: 'strength_endurance',
    name: 'Strength Endurance',
    description: 'High-rep, short-rest circuits for sustained output. Built for 3-5 minute rounds — train your muscles to resist fatigue under load.',
    sessions: 3,
    weeks: 5,
    focus: 'balanced',
    periodization: 'undulating',
    category: 'athletic',
    tags: ['Combat', 'Work Capacity', 'Round-Ready'],
    icon: '🔥'
  },
  {
    id: 'power_athlete',
    name: 'Power Athlete',
    description: 'Explosive training for speed, power, and athletic performance. Olympic lifts + plyometrics.',
    sessions: 3,
    weeks: 5,
    focus: 'power',
    periodization: 'undulating',
    category: 'athletic',
    tags: ['Explosive', 'Sport'],
    icon: '⚡'
  },
  {
    id: 'comp_prep',
    name: 'Competition Prep',
    description: 'Short peaking block. Taper volume, peak intensity. For meets, fights, and tournaments.',
    sessions: 3,
    weeks: 3,
    focus: 'power',
    periodization: 'block',
    category: 'athletic',
    tags: ['Peaking', 'Taper'],
    icon: '🏅'
  },

  // ─── LIFESTYLE ───
  {
    id: 'minimalist_2x',
    name: 'Minimalist 2x/Week',
    description: 'Maximum results, minimum time. 2 sessions of key compounds — for busy schedules.',
    sessions: 2,
    weeks: 6,
    focus: 'strength',
    periodization: 'undulating',
    category: 'lifestyle',
    tags: ['Time-efficient', 'Busy schedule'],
    icon: '⏱️'
  },
  {
    id: 'deload_recovery',
    name: 'Active Recovery',
    description: 'Strategic deload. 50-60% of normal volume at reduced intensity. Use between hard blocks.',
    sessions: 2,
    weeks: 1,
    focus: 'balanced',
    periodization: 'block',
    category: 'lifestyle',
    tags: ['Deload', 'Recovery'],
    icon: '🧘'
  },
  {
    id: 'home_gym',
    name: 'Home Gym Essentials',
    description: 'Optimized for limited equipment — barbell, dumbbells, pull-up bar. No machines needed.',
    sessions: 3,
    weeks: 5,
    focus: 'balanced',
    periodization: 'undulating',
    category: 'lifestyle',
    tags: ['Home gym', 'Minimal equipment'],
    icon: '🏠'
  },
  {
    id: 'bodyweight_only',
    name: 'Bodyweight Only',
    description: 'Zero equipment. Push-ups, squats, pull-ups, core. Travel-friendly and effective.',
    sessions: 4,
    weeks: 4,
    focus: 'hypertrophy',
    periodization: 'linear',
    category: 'lifestyle',
    tags: ['No equipment', 'Travel'],
    icon: '🤸'
  },
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

// Quick inline custom exercise creator — minimal, focused
function QuickCustomExercise({ onSave, onClose }: {
  onSave: (exercise: Omit<import('@/lib/types').CustomExercise, 'isCustom' | 'createdAt'>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState<import('@/lib/types').MuscleGroup>('chest');
  const [pattern, setPattern] = useState<import('@/lib/types').MovementPattern>('push');

  const muscles: import('@/lib/types').MuscleGroup[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quadriceps', 'hamstrings', 'glutes', 'calves', 'core', 'forearms', 'traps'];
  const patterns: { v: import('@/lib/types').MovementPattern; l: string }[] = [
    { v: 'push', l: 'Push' }, { v: 'pull', l: 'Pull' }, { v: 'squat', l: 'Squat' },
    { v: 'hinge', l: 'Hinge' }, { v: 'carry', l: 'Carry' }, { v: 'rotation', l: 'Rotation' }, { v: 'explosive', l: 'Explosive' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 200 }}
        animate={{ y: 0 }}
        exit={{ y: 200 }}
        className="bg-grappler-800 rounded-t-2xl p-5 max-w-md w-full space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-white">Create Exercise</h3>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Exercise name (e.g. Razor Curl)"
          className="input w-full"
          autoFocus
        />
        <div>
          <p className="text-xs text-grappler-400 mb-1.5">Primary Muscle</p>
          <div className="flex flex-wrap gap-1.5">
            {muscles.map(m => (
              <button key={m} onClick={() => setMuscle(m)}
                className={cn('px-2 py-1 rounded-full text-xs font-medium capitalize',
                  muscle === m ? 'bg-primary-500 text-white' : 'bg-grappler-700 text-grappler-400'
                )}>{m.replace('_', ' ')}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-grappler-400 mb-1.5">Movement Pattern</p>
          <div className="flex flex-wrap gap-1.5">
            {patterns.map(p => (
              <button key={p.v} onClick={() => setPattern(p.v)}
                className={cn('px-2 py-1 rounded-full text-xs font-medium',
                  pattern === p.v ? 'bg-primary-500 text-white' : 'bg-grappler-700 text-grappler-400'
                )}>{p.l}</button>
            ))}
          </div>
        </div>
        <button
          disabled={!name.trim()}
          onClick={() => {
            if (!name.trim()) return;
            onSave({
              id: `custom-${Date.now().toString(36)}`,
              name: name.trim(),
              description: `Custom exercise: ${name.trim()}`,
              category: 'isolation',
              primaryMuscles: [muscle],
              secondaryMuscles: [],
              movementPattern: pattern,
              equipmentRequired: ['full_gym'],
              equipmentTypes: [],
              strengthValue: 5,
              aestheticValue: 5,
              grapplerFriendly: false,
              cues: [],
            });
          }}
          className="btn btn-primary w-full"
        >
          Create &amp; Add to Database
        </button>
      </motion.div>
    </motion.div>
  );
}

interface WorkoutBuilderProps {
  onClose: () => void;
}

export default function WorkoutBuilder({ onClose }: WorkoutBuilderProps) {
  const { user, startWorkout, generateNewMesocycle, customExercises, addCustomExercise } = useAppStore();
  const [view, setView] = useState<BuilderView>('templates');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [templateCategory, setTemplateCategory] = useState<TemplateCategory | 'all'>('all');

  // Builder state
  const [builtExercises, setBuiltExercises] = useState<BuiltExercise[]>([]);
  const [workoutName, setWorkoutName] = useState('Custom Workout');
  const [workoutType, setWorkoutType] = useState<WorkoutType>('hypertrophy');
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [pendingTemplate, setPendingTemplate] = useState<MesocycleTemplate | null>(null);

  const equipment = user?.equipment || 'full_gym';

  const [showCustomCreator, setShowCustomCreator] = useState(false);

  // Filtered exercises (includes user's custom exercises)
  const filteredExercises = useMemo(() => {
    const customs = (customExercises || []).map(ce => ({
      ...ce,
      equipmentRequired: [ce.equipmentRequired?.[0] || equipment] as Equipment[],
      secondaryMuscles: ce.secondaryMuscles || [],
      strengthValue: ce.strengthValue ?? 5,
      aestheticValue: ce.aestheticValue ?? 5,
      grapplerFriendly: ce.grapplerFriendly ?? false,
      cues: ce.cues || [],
    }));
    let result = [...getExercisesByEquipment(equipment), ...customs];

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
  }, [equipment, searchQuery, selectedMuscle, selectedCategory, customExercises]);

  const addExercise = (exercise: Exercise) => {
    if (builtExercises.find(e => e.exercise.id === exercise.id)) return;
    const defaults = workoutType === 'strength'
      ? { sets: 4, reps: 5, rpe: 8.5, restSeconds: 180 }
      : workoutType === 'power'
      ? { sets: 4, reps: 3, rpe: 7, restSeconds: 150 }
      : workoutType === 'strength_endurance'
      ? { sets: 3, reps: 15, rpe: 7, restSeconds: 60 }
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

  const startFromTemplate = (template: MesocycleTemplate) => {
    if (!user) return;

    // Set user's goal and sessions to match the template before generating
    useAppStore.setState({
      user: {
        ...user,
        goalFocus: template.focus,
        sessionsPerWeek: template.sessions as any,
        updatedAt: new Date()
      }
    });
    generateNewMesocycle(template.weeks, undefined, template.periodization);
    onClose();
  };

  // Calculate total stats for built workout
  const totalSets = builtExercises.reduce((sum, e) => sum + e.sets, 0);
  const estDuration = builtExercises.reduce((sum, e) =>
    sum + (e.sets * 2) + (e.sets * e.restSeconds / 60), 5
  );

  return (
    <div className="fixed inset-0 z-50 bg-grappler-900 overflow-y-auto safe-area-top">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-grappler-900/95 backdrop-blur-xl border-b border-grappler-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <button aria-label="Close" onClick={onClose} className="btn btn-ghost btn-sm">
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
        {view === 'templates' && (() => {
          const CATEGORY_TABS: { id: TemplateCategory | 'all'; label: string }[] = [
            { id: 'all', label: 'All' },
            { id: 'popular', label: 'Popular' },
            { id: 'combat', label: 'Combat' },
            { id: 'strength', label: 'Strength' },
            { id: 'hypertrophy', label: 'Size' },
            { id: 'athletic', label: 'Athletic' },
            { id: 'lifestyle', label: 'Lifestyle' },
          ];

          const focusColors: Record<string, string> = {
            strength: 'bg-red-500/20 text-red-400',
            hypertrophy: 'bg-purple-500/20 text-purple-400',
            power: 'bg-blue-500/20 text-blue-400',
            balanced: 'bg-primary-500/20 text-primary-400',
          };

          const filtered = templateCategory === 'all'
            ? MESOCYCLE_TEMPLATES
            : MESOCYCLE_TEMPLATES.filter(t => t.category === templateCategory);

          return (
            <div className="space-y-3">
              {/* Category pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {CATEGORY_TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setTemplateCategory(tab.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0',
                      templateCategory === tab.id
                        ? 'bg-primary-500 text-white'
                        : 'bg-grappler-800 text-grappler-400 hover:text-grappler-200'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <p className="text-xs text-grappler-400">
                {filtered.length} program{filtered.length !== 1 ? 's' : ''}
              </p>

              {filtered.map((template) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-grappler-700 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                      {template.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-bold text-grappler-100 text-sm">{template.name}</h3>
                        <span className={cn(
                          'text-xs px-1.5 py-0.5 rounded-full font-medium capitalize',
                          focusColors[template.focus]
                        )}>
                          {template.focus}
                        </span>
                      </div>
                      <p className="text-xs text-grappler-400 mb-2">{template.description}</p>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-grappler-700/50 text-grappler-300">
                          {template.sessions}x/week
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-grappler-700/50 text-grappler-300">
                          {template.weeks}w block
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-grappler-700/50 text-grappler-300 capitalize">
                          {template.periodization}
                        </span>
                        {template.tags.map((tag, i) => (
                          <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-grappler-700/30 text-grappler-400">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={() => setPendingTemplate(template)}
                        className="btn btn-primary btn-sm w-full gap-1"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Start {template.weeks}w / {template.sessions}x Program
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          );
        })()}

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
                    <p className="text-xs text-grappler-400 uppercase tracking-wide mb-2">Muscle Group</p>
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
                    <p className="text-xs text-grappler-400 uppercase tracking-wide mb-2">Category</p>
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
            <p className="text-xs text-grappler-400">
              {filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''} found
            </p>

            {/* Exercise List */}
            <div className="space-y-2">
              {filteredExercises.map((exercise) => {
                const isAdded = builtExercises.some(e => e.exercise.id === exercise.id);
                const isExpanded = expandedExercise === exercise.id;
                const isCustom = Boolean('isCustom' in exercise && (exercise as Exercise & { isCustom?: boolean }).isCustom);

                return (
                  <div key={exercise.id} className={cn('card overflow-hidden', isCustom ? 'border border-primary-500/30' : '')}>
                    <button
                      onClick={() => setExpandedExercise(isExpanded ? null : exercise.id)}
                      className="w-full p-3 flex items-center gap-3 text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-grappler-100 truncate">{exercise.name}</p>
                          {exercise.grapplerFriendly && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-primary-500/20 text-primary-400 flex-shrink-0">
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
                          <span className="text-xs px-1.5 py-0.5 rounded bg-grappler-700 text-grappler-300">
                            {exercise.movementPattern}
                          </span>
                          {exercise.secondaryMuscles.map(m => (
                            <span key={m} className="text-xs px-1.5 py-0.5 rounded bg-grappler-700 text-grappler-400">
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
                            <p className="text-xs text-grappler-400 uppercase mb-1">Form Cues</p>
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

              {/* Can't find it? Create custom */}
              <button
                onClick={() => setShowCustomCreator(true)}
                className="w-full py-3 mt-2 rounded-lg border border-dashed border-grappler-700 text-grappler-400 text-sm hover:border-primary-500/50 hover:text-primary-400 transition-colors"
              >
                <Plus className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                Can&apos;t find it? Create custom exercise
              </button>
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
                <p className="text-xs text-grappler-400 mb-2">Workout Type</p>
                <div className="flex gap-2">
                  {([
                    { type: 'strength' as WorkoutType, label: 'Strength', icon: Zap, color: 'bg-red-500' },
                    { type: 'hypertrophy' as WorkoutType, label: 'Hypertrophy', icon: Heart, color: 'bg-purple-500' },
                    { type: 'power' as WorkoutType, label: 'Power', icon: Flame, color: 'bg-blue-500' },
                    { type: 'strength_endurance' as WorkoutType, label: 'Endurance', icon: Target, color: 'bg-amber-500' }
                  ]).map((opt) => (
                    <button
                      key={opt.type}
                      onClick={() => setWorkoutType(opt.type)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all',
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
                      <span className="text-xs text-grappler-400 font-mono w-5">{index + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-grappler-100 truncate">{be.exercise.name}</p>
                        <p className="text-xs text-grappler-400">
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
                        <p className="text-xs text-grappler-400 mb-1">Sets</p>
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
                        <p className="text-xs text-grappler-400 mb-1">Reps</p>
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
                        <p className="text-xs text-grappler-400 mb-1">RPE</p>
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
                        <p className="text-xs text-grappler-400 mb-1">Rest</p>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => updateBuiltExercise(be.exercise.id, 'restSeconds', Math.max(30, be.restSeconds - 15))}
                            className="text-grappler-500 hover:text-grappler-200"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold text-grappler-100 w-7 text-center">
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

                {/* Superset hint — shown when 2+ exercises exist */}
                {builtExercises.length >= 2 && (
                  <p className="text-xs text-grappler-500 text-center">
                    <Layers className="w-3 h-3 inline mr-1 -mt-0.5" />
                    Supersets auto-detect during the workout — pair push + pull for time-efficient training
                  </p>
                )}

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

      {/* Quick Custom Exercise Creator */}
      <AnimatePresence>
        {showCustomCreator && (
          <QuickCustomExercise
            onSave={(exercise) => {
              addCustomExercise(exercise);
              setShowCustomCreator(false);
            }}
            onClose={() => setShowCustomCreator(false)}
          />
        )}
      </AnimatePresence>

      {/* Template confirmation modal */}
      {pendingTemplate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setPendingTemplate(null)}>
          <div className="bg-grappler-800 rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-2">Start New Program?</h3>
            <p className="text-sm text-grappler-400 mb-4">
              This will start a new <span className="text-white font-medium">{pendingTemplate.name}</span> program
              ({pendingTemplate.weeks} weeks, {pendingTemplate.sessions}x/week).
              Your current mesocycle will be replaced.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingTemplate(null)}
                className="flex-1 py-2.5 rounded-xl bg-grappler-700 text-white font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => { startFromTemplate(pendingTemplate); setPendingTemplate(null); }}
                className="flex-1 py-2.5 rounded-xl bg-grappler-500 text-white font-medium"
              >
                Start Program
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
