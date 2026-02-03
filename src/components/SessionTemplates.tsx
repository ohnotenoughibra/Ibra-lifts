'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Save,
  Play,
  Trash2,
  Clock,
  Dumbbell,
  Star,
  Copy,
  Plus,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { SessionTemplate, WorkoutSession, EquipmentType, GoalFocus, SessionsPerWeek } from '@/lib/types';
import { formatDate, getRelativeTime } from '@/lib/utils';
import { exercises as allExercises } from '@/lib/exercises';
import { Shield, BookOpen, Filter, Zap, Heart, Scale, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper to build a preset session from exercise IDs
function buildPresetSession(
  name: string,
  type: 'strength' | 'hypertrophy' | 'power',
  exerciseIds: string[],
  setsPerExercise: number,
  reps: number,
  rpe: number,
  restSeconds: number
): WorkoutSession {
  const exs = exerciseIds
    .map(id => allExercises.find(e => e.id === id))
    .filter(Boolean) as typeof allExercises;

  return {
    id: `preset-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
    name,
    type,
    dayNumber: 1,
    exercises: exs.map(ex => ({
      exerciseId: ex.id,
      exercise: ex,
      sets: setsPerExercise,
      prescription: {
        targetReps: reps,
        minReps: Math.max(1, reps - 2),
        maxReps: reps + 2,
        rpe,
        restSeconds,
      },
    })),
    estimatedDuration: Math.round(exs.length * setsPerExercise * (30 + restSeconds) / 60),
    warmUp: ['5 min light cardio', 'Dynamic stretching', 'Movement-specific warm-up'],
    coolDown: ['Light stretching', 'Foam rolling'],
  };
}

// Built-in grappling-focused templates
const GRAPPLING_PRESETS: { name: string; description: string; build: () => WorkoutSession }[] = [
  {
    name: 'BJJ Strength',
    description: 'Grip, posterior chain & rotational power for grappling',
    build: () => buildPresetSession('BJJ Strength', 'strength',
      ['deadlift', 'barbell-row', 'overhead-press', 'pull-up', 'farmers-walk', 'turkish-getup'],
      4, 5, 8, 180),
  },
  {
    name: 'Grappler Conditioning',
    description: 'High-rep compound work to build mat endurance',
    build: () => buildPresetSession('Grappler Conditioning', 'hypertrophy',
      ['front-squat', 'dumbbell-row', 'push-up', 'kettlebell-swing', 'plank', 'hip-thrust'],
      3, 12, 7, 90),
  },
  {
    name: 'Competition Prep',
    description: 'Explosive power & grip for tournament readiness',
    build: () => buildPresetSession('Competition Prep', 'power',
      ['power-clean', 'push-press', 'pull-up', 'box-jump', 'farmers-walk', 'cable-row'],
      4, 4, 9, 150),
  },
  {
    name: 'Home Mat Work',
    description: 'Bodyweight strength for grapplers — no equipment needed',
    build: () => buildPresetSession('Home Mat Work', 'hypertrophy',
      ['push-up', 'jump-squat', 'glute-bridge', 'plank', 'side-plank', 'ab-wheel-rollout'],
      4, 15, 7, 60),
  },
  {
    name: 'Neck & Grip Fortress',
    description: 'Bulletproof your neck and grip — essential injury prevention for grapplers',
    build: () => buildPresetSession('Neck & Grip Fortress', 'strength',
      ['neck-curl', 'neck-extension', 'dead-hang', 'towel-pull-up', 'farmers-walk', 'plate-pinch', 'wrist-curl'],
      3, 12, 7, 90),
  },
  {
    name: 'Grappler Power Circuit',
    description: 'Explosive rotational power & hip drive for takedowns and sweeps',
    build: () => buildPresetSession('Grappler Power Circuit', 'power',
      ['hang-clean', 'med-ball-rotational-throw', 'kettlebell-swing', 'box-jump', 'turkish-getup', 'pallof-press'],
      3, 6, 8, 120),
  },
];

// General quick workout presets (not grappling-specific)
type PresetCategory = 'push' | 'pull' | 'legs' | 'full_body' | 'upper' | 'lower' | 'arms';
const QUICK_PRESETS: { name: string; description: string; category: PresetCategory; build: () => WorkoutSession }[] = [
  {
    name: 'Push Day',
    category: 'push',
    description: 'Chest, shoulders & triceps — classic push session',
    build: () => buildPresetSession('Push Day', 'hypertrophy',
      ['bench-press', 'overhead-press', 'incline-bench-press', 'lateral-raise', 'tricep-pushdown', 'cable-fly'],
      4, 10, 7, 120),
  },
  {
    name: 'Pull Day',
    category: 'pull',
    description: 'Back & biceps — rows, pulldowns, and curls',
    build: () => buildPresetSession('Pull Day', 'hypertrophy',
      ['barbell-row', 'pull-up', 'lat-pulldown', 'face-pull', 'hammer-curl', 'rear-delt-fly'],
      4, 10, 7, 120),
  },
  {
    name: 'Leg Day — Quad Focus',
    category: 'legs',
    description: 'Squat-dominant with quad isolation and calves',
    build: () => buildPresetSession('Leg Day — Quad Focus', 'hypertrophy',
      ['back-squat', 'leg-press', 'split-squat', 'leg-extension', 'calf-raise', 'hanging-leg-raise'],
      4, 10, 7, 120),
  },
  {
    name: 'Leg Day — Posterior Chain',
    category: 'legs',
    description: 'Deadlift-dominant with hamstrings and glutes',
    build: () => buildPresetSession('Leg Day — Posterior Chain', 'hypertrophy',
      ['romanian-deadlift', 'hip-thrust', 'leg-curl', 'good-morning', 'nordic-curl', 'seated-calf-raise'],
      4, 10, 7, 120),
  },
  {
    name: 'Upper Body Strength',
    category: 'upper',
    description: 'Heavy compounds for upper body — bench, press, rows',
    build: () => buildPresetSession('Upper Body Strength', 'strength',
      ['bench-press', 'overhead-press', 'barbell-row', 'weighted-pull-up', 'parallel-bar-dip', 'face-pull'],
      4, 5, 8, 180),
  },
  {
    name: 'Lower Body Strength',
    category: 'lower',
    description: 'Heavy squats and deadlifts with accessories',
    build: () => buildPresetSession('Lower Body Strength', 'strength',
      ['back-squat', 'deadlift', 'split-squat', 'leg-curl', 'calf-raise', 'hanging-leg-raise'],
      4, 5, 8, 180),
  },
  {
    name: 'Full Body Express',
    category: 'full_body',
    description: '30-minute full body — one push, pull, squat, hinge, and core',
    build: () => buildPresetSession('Full Body Express', 'hypertrophy',
      ['back-squat', 'bench-press', 'barbell-row', 'romanian-deadlift', 'plank'],
      3, 8, 7, 90),
  },
  {
    name: 'Full Body Heavy',
    category: 'full_body',
    description: 'Big 3 + accessories — squat, bench, deadlift in one session',
    build: () => buildPresetSession('Full Body Heavy', 'strength',
      ['back-squat', 'bench-press', 'deadlift', 'pull-up', 'overhead-press', 'face-pull'],
      4, 5, 8, 180),
  },
  {
    name: 'Arms & Delts',
    category: 'arms',
    description: 'Biceps, triceps, and shoulder isolation for the pump',
    build: () => buildPresetSession('Arms & Delts', 'hypertrophy',
      ['bicep-curl', 'skull-crusher', 'lateral-raise', 'hammer-curl', 'overhead-tricep-extension', 'rear-delt-fly', 'cable-lateral-raise'],
      3, 12, 7, 75),
  },
  {
    name: 'Bodyweight Only',
    category: 'full_body',
    description: 'No equipment needed — push-ups, squats, core',
    build: () => buildPresetSession('Bodyweight Only', 'hypertrophy',
      ['push-up', 'pull-up', 'jump-squat', 'lunges', 'plank', 'dead-bug', 'side-plank'],
      4, 15, 7, 60),
  },
  {
    name: 'Back & Biceps Classic',
    category: 'pull',
    description: 'Classic bodybuilding pull day with heavy rows and curls',
    build: () => buildPresetSession('Back & Biceps Classic', 'hypertrophy',
      ['barbell-row', 'weighted-pull-up', 'dumbbell-row', 'lat-pulldown', 'bicep-curl', 'incline-dumbbell-curl', 'face-pull'],
      4, 10, 7, 90),
  },
  {
    name: 'Chest & Shoulders',
    category: 'push',
    description: 'Pressing volume for chest and deltoid development',
    build: () => buildPresetSession('Chest & Shoulders', 'hypertrophy',
      ['bench-press', 'incline-bench-press', 'dumbbell-shoulder-press', 'cable-fly', 'lateral-raise', 'tricep-pushdown'],
      4, 10, 7, 90),
  },
];

// Science-based program templates
// Based on periodization research (Schoenfeld 2016, Helms 2014, Israetel RP guidelines)
interface ProgramTemplate {
  id: string;
  name: string;
  description: string;
  science: string; // Brief evidence basis
  goalFocus: GoalFocus;
  sessionsPerWeek: SessionsPerWeek[];  // Which frequencies this works for
  weeks: number[];                      // Which block durations this works for
  periodization: 'undulating' | 'block';
  tags: string[];
}

const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  {
    id: 'strength-base',
    name: 'Strength Foundation',
    description: 'Heavy compound lifts with progressive overload. Build raw strength with 3-5 rep ranges and long rest periods.',
    science: 'Based on Schoenfeld et al. (2017): 3-5 rep ranges with >80% 1RM produce superior strength gains vs higher rep training.',
    goalFocus: 'strength',
    sessionsPerWeek: [3, 4],
    weeks: [4, 5, 6],
    periodization: 'undulating',
    tags: ['Beginner-friendly', 'Compound focus'],
  },
  {
    id: 'hypertrophy-volume',
    name: 'Hypertrophy Volume Block',
    description: 'High-volume training in the 8-12 rep range. Accumulation phase with systematic overload across the block.',
    science: 'Schoenfeld (2010): 8-12 reps at 65-85% 1RM maximizes mechanical tension and metabolic stress — the two primary hypertrophy drivers.',
    goalFocus: 'hypertrophy',
    sessionsPerWeek: [3, 4, 5],
    weeks: [4, 5, 6],
    periodization: 'undulating',
    tags: ['Muscle growth', 'Volume focus'],
  },
  {
    id: 'grappler-balanced',
    name: "Grappler's Edge",
    description: 'Balanced strength, power, and grip work. Designed around a grappling schedule with recovery in mind.',
    science: 'James et al. (2016): Concurrent strength and mat training requires careful volume management — 3-4 sessions/week is optimal for grapplers.',
    goalFocus: 'balanced',
    sessionsPerWeek: [3, 4],
    weeks: [4, 5, 6],
    periodization: 'undulating',
    tags: ['BJJ/Wrestling', 'Recovery-aware'],
  },
  {
    id: 'power-peaking',
    name: 'Power Peaking Block',
    description: 'Explosive movements with lower volume. Focus on rate of force development and speed-strength.',
    science: 'Cormie et al. (2011): Power training at 30-60% 1RM with maximal velocity produces the highest power outputs for athletic performance.',
    goalFocus: 'power',
    sessionsPerWeek: [3, 4],
    weeks: [3, 4],
    periodization: 'block',
    tags: ['Athletic', 'Competition prep'],
  },
  {
    id: 'minimalist-strength',
    name: 'Minimalist Strength',
    description: 'Maximum results from minimum time. 2-3 sessions of heavy compounds — ideal for busy schedules.',
    science: 'Ralston et al. (2017): 2-3 sessions/week produces 80-90% of the gains of higher frequencies when volume is equated.',
    goalFocus: 'strength',
    sessionsPerWeek: [2, 3],
    weeks: [4, 5, 6, 8],
    periodization: 'undulating',
    tags: ['Time-efficient', 'Busy schedule'],
  },
  {
    id: 'high-frequency',
    name: 'High Frequency Hypertrophy',
    description: 'Train each muscle 3x/week with moderate volume per session. Spreads volume across more sessions for better recovery.',
    science: 'Schoenfeld et al. (2015): Training muscles 2-3x/week produces superior hypertrophy vs 1x/week at equal weekly volume.',
    goalFocus: 'hypertrophy',
    sessionsPerWeek: [5, 6],
    weeks: [4, 5],
    periodization: 'undulating',
    tags: ['Advanced', 'Full body'],
  },
  {
    id: 'block-periodization',
    name: 'Block Periodization',
    description: 'Each week focuses on one quality: accumulation → intensification → realization. Classic Eastern European approach.',
    science: 'Issurin (2010): Block periodization concentrates training stimuli for stronger adaptive signals — especially effective for intermediate+ athletes.',
    goalFocus: 'strength',
    sessionsPerWeek: [3, 4, 5],
    weeks: [4, 5, 6],
    periodization: 'block',
    tags: ['Intermediate+', 'Periodized'],
  },
  {
    id: 'long-accumulation',
    name: 'Long Accumulation Phase',
    description: '8-week volume accumulation with gradual progressive overload. More time to build work capacity before deload.',
    science: 'Helms et al. (2014): Longer mesocycles (6-8 weeks) allow greater total volume accumulation before fatigue management becomes necessary.',
    goalFocus: 'hypertrophy',
    sessionsPerWeek: [3, 4],
    weeks: [6, 8],
    periodization: 'undulating',
    tags: ['Patient approach', 'Volume build'],
  },
  {
    id: 'comp-prep',
    name: 'Competition Prep',
    description: 'Short, intense blocks focused on peaking strength and power. Tapers volume while maintaining intensity.',
    science: 'Pritchard et al. (2015): 3-week intensification + taper produces peak strength expression for competition-day performance.',
    goalFocus: 'power',
    sessionsPerWeek: [3, 4, 5],
    weeks: [3, 4],
    periodization: 'block',
    tags: ['Peaking', 'Competition'],
  },
  {
    id: 'grappler-offseason',
    name: 'Grappler Off-Season',
    description: 'Higher volume training when mat time is reduced. Build muscle and strength for the next competition cycle.',
    science: 'Kraemer & Ratamess (2004): Off-season phases should prioritize hypertrophy and GPP to build a larger strength base for later peaking.',
    goalFocus: 'hypertrophy',
    sessionsPerWeek: [4, 5],
    weeks: [5, 6, 8],
    periodization: 'undulating',
    tags: ['Off-season', 'BJJ/Wrestling'],
  },
  {
    id: '531-inspired',
    name: '5/3/1 Progression',
    description: 'Wendler-inspired 4-week waves — heavy singles/triples on main lifts with submaximal volume. Proven long-term strength builder.',
    science: 'Wendler (2011): Submaximal training with planned progression avoids early plateaus. 90% training max allows consistent progress over months.',
    goalFocus: 'strength',
    sessionsPerWeek: [3, 4],
    weeks: [4, 8],
    periodization: 'undulating',
    tags: ['Long-term', 'Sustainable'],
  },
  {
    id: 'upper-lower-hypertrophy',
    name: 'Upper/Lower Hypertrophy',
    description: '4-day split hitting each muscle 2x/week. Ideal balance of frequency and recovery for muscle growth.',
    science: 'Schoenfeld et al. (2016): Training each muscle 2x/week produces significantly more hypertrophy than 1x/week when volume is equated.',
    goalFocus: 'hypertrophy',
    sessionsPerWeek: [4],
    weeks: [4, 5, 6],
    periodization: 'undulating',
    tags: ['Popular split', '2x frequency'],
  },
  {
    id: 'dup-strength',
    name: 'Daily Undulating Periodization',
    description: 'Vary intensity and volume within each week: heavy day, volume day, speed day. Prevents staleness and drives adaptation.',
    science: 'Zourdos et al. (2016): DUP produces equal or greater strength gains than linear periodization while reducing monotony and overuse risk.',
    goalFocus: 'strength',
    sessionsPerWeek: [3, 4],
    weeks: [4, 5, 6],
    periodization: 'undulating',
    tags: ['Varied intensity', 'Anti-plateau'],
  },
  {
    id: 'push-pull-legs',
    name: 'Push/Pull/Legs Classic',
    description: '6-day rotation hitting each muscle 2x/week. The gold standard bodybuilding split for advanced lifters.',
    science: 'Wernbom et al. (2007): Higher training frequencies allow more weekly volume without excessive per-session fatigue, driving better hypertrophy.',
    goalFocus: 'hypertrophy',
    sessionsPerWeek: [5, 6],
    weeks: [4, 5, 6],
    periodization: 'undulating',
    tags: ['Advanced', 'Bodybuilding'],
  },
  {
    id: 'strength-skill',
    name: 'Strength as Skill',
    description: 'High frequency, low fatigue — practice heavy singles and doubles frequently. Neural efficiency over volume.',
    science: 'Mattocks et al. (2017): Frequent exposure to heavy loads (>85% 1RM) with low volume improves neuromuscular efficiency without excessive fatigue.',
    goalFocus: 'strength',
    sessionsPerWeek: [4, 5, 6],
    weeks: [3, 4, 5],
    periodization: 'undulating',
    tags: ['Neurological', 'Low fatigue'],
  },
  {
    id: 'deload-recovery',
    name: 'Active Recovery / Deload',
    description: 'Strategic deload week — 50-60% of normal volume at reduced intensity. Use between hard training blocks.',
    science: 'Pritchard et al. (2015): Planned deloads every 4-6 weeks prevent accumulated fatigue and allow supercompensation for the next training block.',
    goalFocus: 'balanced',
    sessionsPerWeek: [2, 3],
    weeks: [1, 2],
    periodization: 'block',
    tags: ['Recovery', 'Deload'],
  },
];

interface SessionTemplatesProps {
  onClose: () => void;
}

export default function SessionTemplates({ onClose }: SessionTemplatesProps) {
  const {
    sessionTemplates,
    currentMesocycle,
    workoutLogs,
    saveAsTemplate,
    deleteTemplate,
    useTemplate,
    generateNewMesocycle,
    setMuscleEmphasis,
    user,
  } = useAppStore();

  const [activeSection, setActiveSection] = useState<'programs' | 'quick' | 'templates' | 'presets' | 'save' | 'history'>('programs');
  const [quickFilter, setQuickFilter] = useState<PresetCategory | null>(null);
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [templateNameInputs, setTemplateNameInputs] = useState<Record<string, string>>({});
  const [savingSessionId, setSavingSessionId] = useState<string | null>(null);
  const [historyNameInputs, setHistoryNameInputs] = useState<Record<string, string>>({});
  const [savingHistoryId, setSavingHistoryId] = useState<string | null>(null);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);
  const [programFilterWeeks, setProgramFilterWeeks] = useState<number | null>(null);
  const [programFilterSessions, setProgramFilterSessions] = useState<number | null>(null);
  const [programFilterGoal, setProgramFilterGoal] = useState<GoalFocus | null>(null);
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);

  // Get current week sessions from mesocycle
  const currentWeekSessions = currentMesocycle
    ? currentMesocycle.weeks[0]?.sessions ?? []
    : [];

  // Get last 5 unique workout sessions from logs
  const recentUniqueLogs = (() => {
    const seen = new Set<string>();
    const unique: typeof workoutLogs = [];
    const sorted = [...workoutLogs].reverse();
    for (const log of sorted) {
      const exerciseKey = log.exercises.map(e => e.exerciseId).sort().join(',');
      if (!seen.has(exerciseKey) && unique.length < 5) {
        seen.add(exerciseKey);
        unique.push(log);
      }
    }
    return unique;
  })();

  const handleSaveFromSession = (sessionId: string, sessionName: string) => {
    const session = currentWeekSessions.find(s => s.id === sessionId);
    if (!session) return;

    const name = templateNameInputs[sessionId]?.trim() || sessionName;
    saveAsTemplate(name, session);
    setSavingSessionId(null);
    setTemplateNameInputs(prev => ({ ...prev, [sessionId]: '' }));
    showSavedFeedback(name);
  };

  const handleSaveFromHistory = (logId: string) => {
    const log = workoutLogs.find(l => l.id === logId);
    if (!log) return;

    const name = historyNameInputs[logId]?.trim() || `Workout ${formatDate(log.date)}`;

    // Reconstruct a WorkoutSession from the log
    const session = {
      id: `template-${Date.now()}`,
      name,
      type: 'hypertrophy' as const,
      dayNumber: 1,
      exercises: log.exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        exercise: {
          id: ex.exerciseId,
          name: ex.exerciseName,
          category: 'compound' as const,
          primaryMuscles: [],
          secondaryMuscles: [],
          movementPattern: 'push' as const,
          equipmentRequired: [],
          equipmentTypes: [],
          grapplerFriendly: true,
          aestheticValue: 5,
          strengthValue: 5,
          description: '',
          cues: []
        },
        sets: ex.sets.length,
        prescription: {
          targetReps: ex.sets[0]?.reps ?? 8,
          minReps: Math.max(1, (ex.sets[0]?.reps ?? 8) - 2),
          maxReps: (ex.sets[0]?.reps ?? 8) + 2,
          rpe: ex.sets[0]?.rpe ?? 7,
          restSeconds: 120
        }
      })),
      estimatedDuration: log.duration,
      warmUp: ['General warm-up'],
      coolDown: ['Light stretching']
    };

    saveAsTemplate(name, session);
    setSavingHistoryId(null);
    setHistoryNameInputs(prev => ({ ...prev, [logId]: '' }));
    showSavedFeedback(name);
  };

  const showSavedFeedback = (name: string) => {
    setSavedFeedback(name);
    setTimeout(() => setSavedFeedback(null), 2000);
  };

  const handleDeleteTemplate = (id: string) => {
    deleteTemplate(id);
    setConfirmDeleteId(null);
    setExpandedTemplateId(null);
  };

  const handleUseTemplate = (id: string) => {
    useTemplate(id);
  };

  const estimateDuration = (template: SessionTemplate): number => {
    if (template.session.estimatedDuration) return template.session.estimatedDuration;
    const totalSets = template.session.exercises.reduce((sum, ex) => sum + ex.sets, 0);
    return Math.round(totalSets * 3);
  };

  const { startWorkout: storeStartWorkout } = useAppStore();

  // Filter programs
  const filteredPrograms = PROGRAM_TEMPLATES.filter(p => {
    if (programFilterGoal && p.goalFocus !== programFilterGoal) return false;
    if (programFilterSessions && !p.sessionsPerWeek.includes(programFilterSessions as SessionsPerWeek)) return false;
    if (programFilterWeeks && !p.weeks.includes(programFilterWeeks)) return false;
    return true;
  });

  const handleStartProgram = (template: ProgramTemplate, weeks: number, sessions: SessionsPerWeek) => {
    // Update user's goal and sessions if needed
    if (user) {
      useAppStore.setState({
        user: { ...user, goalFocus: template.goalFocus, sessionsPerWeek: sessions, updatedAt: new Date() }
      });
    }
    generateNewMesocycle(weeks);
    onClose();
  };

  const goalIcons: Record<GoalFocus, any> = {
    strength: Zap,
    hypertrophy: Heart,
    balanced: Scale,
    power: Target,
  };

  const goalColors: Record<GoalFocus, string> = {
    strength: 'text-red-400 bg-red-500/20 border-red-500/30',
    hypertrophy: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
    balanced: 'text-primary-400 bg-primary-500/20 border-primary-500/30',
    power: 'text-orange-400 bg-orange-500/20 border-orange-500/30',
  };

  const filteredQuickPresets = quickFilter
    ? QUICK_PRESETS.filter(p => p.category === quickFilter)
    : QUICK_PRESETS;

  const sectionTabs = [
    { id: 'programs' as const, label: 'Programs', icon: BookOpen },
    { id: 'quick' as const, label: 'Quick', icon: Zap },
    { id: 'presets' as const, label: 'Grappling', icon: Shield },
    { id: 'templates' as const, label: 'Saved', icon: Star },
    { id: 'save' as const, label: 'Save', icon: Save },
    { id: 'history' as const, label: 'History', icon: Clock }
  ];

  return (
    <div className="min-h-screen bg-grappler-950 text-grappler-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-grappler-950/95 backdrop-blur-sm border-b border-grappler-800">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-grappler-800 flex items-center justify-center hover:bg-grappler-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-grappler-300" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-grappler-50">Templates & Programs</h1>
            <p className="text-xs text-grappler-400">Pick a program or start a quick workout</p>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-1 px-4 pb-3">
          {sectionTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeSection === tab.id
                  ? 'bg-primary-500/20 text-primary-400'
                  : 'bg-grappler-800/50 text-grappler-400 hover:text-grappler-300'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Saved Feedback Toast */}
      <AnimatePresence>
        {savedFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl px-4 py-2 text-sm font-medium"
          >
            Saved &quot;{savedFeedback}&quot; as template
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 space-y-4 pb-20">
        {/* === PROGRAMS SECTION === */}
        {activeSection === 'programs' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Filters */}
            <div className="bg-grappler-800 rounded-xl p-3 space-y-3">
              <div className="flex items-center gap-2 text-xs text-grappler-400 font-medium">
                <Filter className="w-3.5 h-3.5" />
                Filter Programs
              </div>

              {/* Goal filter */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => setProgramFilterGoal(null)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                    !programFilterGoal ? 'bg-grappler-600 text-grappler-100' : 'bg-grappler-700/50 text-grappler-400'
                  )}
                >
                  All Goals
                </button>
                {(['strength', 'hypertrophy', 'balanced', 'power'] as GoalFocus[]).map(g => (
                  <button
                    key={g}
                    onClick={() => setProgramFilterGoal(programFilterGoal === g ? null : g)}
                    className={cn(
                      'px-2.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-all',
                      programFilterGoal === g ? goalColors[g] : 'bg-grappler-700/50 text-grappler-400'
                    )}
                  >
                    {g === 'hypertrophy' ? 'Muscle' : g}
                  </button>
                ))}
              </div>

              {/* Sessions/week filter */}
              <div className="flex gap-1.5 items-center">
                <span className="text-[10px] text-grappler-500 mr-1">Days/wk:</span>
                <button
                  onClick={() => setProgramFilterSessions(null)}
                  className={cn(
                    'w-8 py-1 rounded text-xs font-medium transition-all text-center',
                    !programFilterSessions ? 'bg-grappler-600 text-grappler-100' : 'bg-grappler-700/50 text-grappler-400'
                  )}
                >
                  Any
                </button>
                {[2, 3, 4, 5, 6].map(n => (
                  <button
                    key={n}
                    onClick={() => setProgramFilterSessions(programFilterSessions === n ? null : n)}
                    className={cn(
                      'w-8 py-1 rounded text-xs font-medium transition-all text-center',
                      programFilterSessions === n ? 'bg-primary-500 text-white' : 'bg-grappler-700/50 text-grappler-400'
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>

              {/* Weeks filter */}
              <div className="flex gap-1.5 items-center">
                <span className="text-[10px] text-grappler-500 mr-1">Weeks:</span>
                <button
                  onClick={() => setProgramFilterWeeks(null)}
                  className={cn(
                    'w-8 py-1 rounded text-xs font-medium transition-all text-center',
                    !programFilterWeeks ? 'bg-grappler-600 text-grappler-100' : 'bg-grappler-700/50 text-grappler-400'
                  )}
                >
                  Any
                </button>
                {[1, 2, 3, 4, 5, 6, 8].map(n => (
                  <button
                    key={n}
                    onClick={() => setProgramFilterWeeks(programFilterWeeks === n ? null : n)}
                    className={cn(
                      'w-8 py-1 rounded text-xs font-medium transition-all text-center',
                      programFilterWeeks === n ? 'bg-accent-500 text-white' : 'bg-grappler-700/50 text-grappler-400'
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Results count */}
            <p className="text-xs text-grappler-500">
              {filteredPrograms.length} of {PROGRAM_TEMPLATES.length} programs
            </p>

            {/* Program cards */}
            {filteredPrograms.map(program => {
              const GoalIcon = goalIcons[program.goalFocus];
              const isExpanded = expandedProgram === program.id;
              // Pick default values based on what the program supports
              const defaultWeeks = programFilterWeeks && program.weeks.includes(programFilterWeeks)
                ? programFilterWeeks
                : program.weeks[Math.floor(program.weeks.length / 2)];
              const defaultSessions = (programFilterSessions && program.sessionsPerWeek.includes(programFilterSessions as SessionsPerWeek)
                ? programFilterSessions
                : program.sessionsPerWeek[0]) as SessionsPerWeek;

              return (
                <div key={program.id} className="bg-grappler-800 rounded-xl overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-2">
                      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border', goalColors[program.goalFocus])}>
                        <GoalIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-grappler-50">{program.name}</h3>
                        <p className="text-xs text-grappler-400 mt-0.5">{program.description}</p>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full border capitalize', goalColors[program.goalFocus])}>
                        {program.goalFocus}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-grappler-700 text-grappler-300">
                        {program.sessionsPerWeek.join('-')}x/week
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-grappler-700 text-grappler-300">
                        {program.weeks.join('/')} weeks
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-grappler-700 text-grappler-300 capitalize">
                        {program.periodization}
                      </span>
                      {program.tags.map((tag, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-grappler-700/50 text-grappler-400">
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStartProgram(program, defaultWeeks, defaultSessions)}
                        className="btn btn-primary btn-sm flex-1 gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Start {defaultWeeks}w / {defaultSessions}x
                      </button>
                      <button
                        onClick={() => setExpandedProgram(isExpanded ? null : program.id)}
                        className="w-9 h-9 rounded-lg bg-grappler-700 flex items-center justify-center hover:bg-grappler-600 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-grappler-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-grappler-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded: science + custom start */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-grappler-700"
                      >
                        <div className="p-4 space-y-3">
                          {/* Science basis */}
                          <div className="bg-grappler-900/50 rounded-lg p-3">
                            <p className="text-[10px] font-medium text-grappler-400 uppercase tracking-wide mb-1">Evidence Basis</p>
                            <p className="text-xs text-grappler-300">{program.science}</p>
                          </div>

                          {/* Custom week/session picker */}
                          <div>
                            <p className="text-[10px] font-medium text-grappler-400 uppercase tracking-wide mb-2">Customize & Start</p>
                            <div className="grid grid-cols-2 gap-2">
                              {program.weeks.map(w =>
                                program.sessionsPerWeek.map(s => (
                                  <button
                                    key={`${w}-${s}`}
                                    onClick={() => handleStartProgram(program, w, s)}
                                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-grappler-700 hover:bg-grappler-600 text-grappler-200 text-xs font-medium transition-colors"
                                  >
                                    <Play className="w-3 h-3" />
                                    {w} weeks / {s}x week
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {filteredPrograms.length === 0 && (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-grappler-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-grappler-300 mb-2">No matching programs</h3>
                <p className="text-sm text-grappler-500">Try adjusting your filters</p>
                <button
                  onClick={() => { setProgramFilterGoal(null); setProgramFilterSessions(null); setProgramFilterWeeks(null); }}
                  className="mt-3 text-primary-400 text-sm font-medium hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* === QUICK WORKOUTS SECTION === */}
        {activeSection === 'quick' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="text-center mb-2">
              <p className="text-sm text-grappler-400">
                Ready-made sessions. Tap <span className="text-primary-400 font-medium">Start</span> to begin or <span className="text-grappler-300 font-medium">Save</span> to keep it.
              </p>
            </div>

            {/* Category filter */}
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setQuickFilter(null)}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                  !quickFilter ? 'bg-primary-500/20 text-primary-400' : 'bg-grappler-700/50 text-grappler-400'
                )}
              >
                All
              </button>
              {([
                ['push', 'Push'],
                ['pull', 'Pull'],
                ['legs', 'Legs'],
                ['upper', 'Upper'],
                ['lower', 'Lower'],
                ['full_body', 'Full Body'],
                ['arms', 'Arms'],
              ] as [PresetCategory, string][]).map(([cat, label]) => (
                <button
                  key={cat}
                  onClick={() => setQuickFilter(quickFilter === cat ? null : cat)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                    quickFilter === cat ? 'bg-primary-500/20 text-primary-400' : 'bg-grappler-700/50 text-grappler-400'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {filteredQuickPresets.map((preset, idx) => {
              const session = preset.build();
              return (
                <div key={idx} className="bg-grappler-800 rounded-xl overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Dumbbell className="w-4 h-4 text-primary-400" />
                      <h3 className="font-bold text-grappler-50">{preset.name}</h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-grappler-700/50 text-grappler-400 capitalize ml-auto">
                        {preset.category.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-grappler-400 mb-3">{preset.description}</p>

                    <div className="flex items-center gap-3 text-xs text-grappler-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Dumbbell className="w-3 h-3" />
                        {session.exercises.length} exercises
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        ~{session.estimatedDuration}m
                      </span>
                      <span className="capitalize text-xs px-1.5 py-0.5 rounded bg-grappler-700/50">
                        {session.type}
                      </span>
                    </div>

                    {/* Exercise list preview */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {session.exercises.map((ex, i) => (
                        <span key={i} className="text-[10px] bg-grappler-700/60 text-grappler-300 px-2 py-0.5 rounded-full">
                          {ex.exercise.name}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const s = preset.build();
                          storeStartWorkout(s);
                        }}
                        className="btn btn-primary btn-sm flex-1 gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Start Workout
                      </button>
                      <button
                        onClick={() => {
                          const s = preset.build();
                          saveAsTemplate(preset.name, s);
                          showSavedFeedback(preset.name);
                        }}
                        className="btn btn-secondary btn-sm gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredQuickPresets.length === 0 && (
              <div className="text-center py-12">
                <Dumbbell className="w-12 h-12 text-grappler-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-grappler-300 mb-2">No matching workouts</h3>
                <button
                  onClick={() => setQuickFilter(null)}
                  className="mt-2 text-primary-400 text-sm font-medium hover:underline"
                >
                  Show all
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* === MY TEMPLATES SECTION === */}
        {activeSection === 'templates' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {sessionTemplates.length === 0 ? (
              <div className="text-center py-12">
                <Star className="w-12 h-12 text-grappler-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-grappler-300 mb-2">No templates saved yet</h3>
                <p className="text-sm text-grappler-500 max-w-xs mx-auto mb-4">
                  Templates let you start a workout instantly — outside your regular program. Useful for days you want to do your own thing.
                </p>
                <div className="space-y-2 max-w-xs mx-auto">
                  <button
                    onClick={() => setActiveSection('presets')}
                    className="btn btn-primary btn-sm w-full gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    Browse Grappling Templates
                  </button>
                  <p className="text-[10px] text-grappler-500">
                    Or save sessions from your program using the &quot;Save Current&quot; tab
                  </p>
                </div>
              </div>
            ) : (
              sessionTemplates.map(template => {
                const isExpanded = expandedTemplateId === template.id;
                const duration = estimateDuration(template);
                const exerciseCount = template.session.exercises.length;

                return (
                  <motion.div
                    key={template.id}
                    layout
                    className="bg-grappler-800 rounded-xl overflow-hidden"
                  >
                    {/* Template Card Header */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-grappler-50 truncate">{template.name}</h3>
                          <p className="text-xs text-grappler-400 mt-0.5">
                            Created {formatDate(template.createdAt)}
                          </p>
                        </div>
                        {template.timesUsed > 0 && (
                          <span className="bg-primary-500/20 text-primary-400 text-xs px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
                            Used {template.timesUsed}x
                          </span>
                        )}
                      </div>

                      {/* Stats Row */}
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-1.5 text-xs text-grappler-300">
                          <Dumbbell className="w-3.5 h-3.5 text-grappler-400" />
                          <span>{exerciseCount} exercises</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-grappler-300">
                          <Clock className="w-3.5 h-3.5 text-grappler-400" />
                          <span>~{duration} min</span>
                        </div>
                        {template.lastUsed && (
                          <div className="text-xs text-grappler-400">
                            Last: {getRelativeTime(template.lastUsed)}
                          </div>
                        )}
                      </div>

                      {/* Exercise Pills */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {template.session.exercises.slice(0, 4).map((ex, i) => (
                          <span
                            key={i}
                            className="bg-grappler-700 text-grappler-300 px-2 py-0.5 rounded text-xs"
                          >
                            {ex.exercise.name}
                          </span>
                        ))}
                        {template.session.exercises.length > 4 && (
                          <span className="bg-grappler-700 text-grappler-400 px-2 py-0.5 rounded text-xs">
                            +{template.session.exercises.length - 4} more
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUseTemplate(template.id)}
                          className="btn btn-primary btn-sm flex-1 gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Start Workout
                        </button>
                        <button
                          onClick={() =>
                            setExpandedTemplateId(isExpanded ? null : template.id)
                          }
                          className="w-9 h-9 rounded-lg bg-grappler-700 flex items-center justify-center hover:bg-grappler-600 transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-grappler-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-grappler-400" />
                          )}
                        </button>
                        {confirmDeleteId === template.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-3 py-1.5 rounded-lg bg-grappler-700 text-grappler-400 text-xs hover:bg-grappler-600 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(template.id)}
                            className="w-9 h-9 rounded-lg bg-grappler-700 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-grappler-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Exercise Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-grappler-700"
                        >
                          <div className="p-4 space-y-2">
                            <p className="text-xs font-medium text-grappler-400 uppercase tracking-wide mb-2">
                              Exercise Details
                            </p>
                            {template.session.exercises.map((ex, i) => (
                              <div
                                key={i}
                                className="bg-grappler-900/50 rounded-lg p-3 flex items-center justify-between"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-grappler-200 truncate">
                                    {ex.exercise.name}
                                  </p>
                                  <p className="text-xs text-grappler-400 mt-0.5">
                                    {ex.sets} sets x {ex.prescription.targetReps} reps @ RPE {ex.prescription.rpe}
                                  </p>
                                </div>
                                <div className="text-xs text-grappler-500 flex-shrink-0 ml-2">
                                  Rest {Math.round(ex.prescription.restSeconds / 60)}min
                                </div>
                              </div>
                            ))}

                            {/* Warm-up / Cool-down */}
                            {template.session.warmUp.length > 0 && (
                              <div className="mt-3 pt-2 border-t border-grappler-700">
                                <p className="text-xs text-grappler-400 mb-1">Warm-up:</p>
                                <div className="flex flex-wrap gap-1">
                                  {template.session.warmUp.map((item, i) => (
                                    <span key={i} className="bg-grappler-700 text-grappler-300 px-2 py-0.5 rounded text-xs">
                                      {item}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}

        {/* === GRAPPLING PRESETS SECTION === */}
        {activeSection === 'presets' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="text-center mb-2">
              <p className="text-sm text-grappler-400">
                Ready-made sessions for grapplers. Tap <span className="text-primary-400 font-medium">Start</span> to begin immediately or <span className="text-grappler-300 font-medium">Save</span> to keep it.
              </p>
            </div>

            {GRAPPLING_PRESETS.map((preset, idx) => {
              const session = preset.build();
              return (
                <div key={idx} className="bg-grappler-800 rounded-xl overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-4 h-4 text-lime-400" />
                      <h3 className="font-bold text-grappler-50">{preset.name}</h3>
                    </div>
                    <p className="text-xs text-grappler-400 mb-3">{preset.description}</p>

                    <div className="flex items-center gap-3 text-xs text-grappler-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Dumbbell className="w-3 h-3" />
                        {session.exercises.length} exercises
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        ~{session.estimatedDuration}m
                      </span>
                      <span className="capitalize text-xs px-1.5 py-0.5 rounded bg-grappler-700/50">
                        {session.type}
                      </span>
                    </div>

                    {/* Exercise list preview */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {session.exercises.map((ex, i) => (
                        <span key={i} className="text-[10px] bg-grappler-700/60 text-grappler-300 px-2 py-0.5 rounded-full">
                          {ex.exercise.name}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const s = preset.build();
                          storeStartWorkout(s);
                        }}
                        className="btn btn-primary btn-sm flex-1 gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Start Workout
                      </button>
                      <button
                        onClick={() => {
                          const s = preset.build();
                          saveAsTemplate(preset.name, s);
                          showSavedFeedback(preset.name);
                        }}
                        className="btn btn-secondary btn-sm gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* === SAVE CURRENT SECTION === */}
        {activeSection === 'save' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {!currentMesocycle ? (
              <div className="text-center py-16">
                <Dumbbell className="w-12 h-12 text-grappler-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-grappler-300 mb-2">No Active Program</h3>
                <p className="text-sm text-grappler-500">
                  Generate a mesocycle first to save sessions as templates.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-2">
                  <h2 className="text-sm font-semibold text-grappler-200">Current Week Sessions</h2>
                  <p className="text-xs text-grappler-400 mt-0.5">
                    Tap &quot;Save as Template&quot; to save any session for reuse
                  </p>
                </div>

                {currentWeekSessions.map(session => (
                  <div key={session.id} className="bg-grappler-800 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-grappler-50">{session.name}</h3>
                        <p className="text-xs text-grappler-400 mt-0.5">
                          Day {session.dayNumber} &middot; {session.type} &middot; {session.exercises.length} exercises
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-grappler-300">
                        <Clock className="w-3.5 h-3.5 text-grappler-400" />
                        <span>~{session.estimatedDuration} min</span>
                      </div>
                    </div>

                    {/* Exercise Pills */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {session.exercises.map((ex, i) => (
                        <span
                          key={i}
                          className="bg-grappler-700 text-grappler-300 px-2 py-0.5 rounded text-xs"
                        >
                          {ex.exercise.name}
                        </span>
                      ))}
                    </div>

                    {/* Save Action */}
                    {savingSessionId === session.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder={session.name}
                          value={templateNameInputs[session.id] || ''}
                          onChange={(e) =>
                            setTemplateNameInputs(prev => ({
                              ...prev,
                              [session.id]: e.target.value
                            }))
                          }
                          className="w-full bg-grappler-900 border border-grappler-700 rounded-lg px-3 py-2 text-sm text-grappler-100 placeholder:text-grappler-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveFromSession(session.id, session.name)}
                            className="btn btn-primary btn-sm flex-1 gap-1.5"
                          >
                            <Save className="w-3.5 h-3.5" />
                            Save Template
                          </button>
                          <button
                            onClick={() => setSavingSessionId(null)}
                            className="btn btn-sm bg-grappler-700 text-grappler-300 hover:bg-grappler-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSavingSessionId(session.id)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-grappler-700 text-grappler-200 text-sm font-medium hover:bg-grappler-600 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Save as Template
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}
          </motion.div>
        )}

        {/* === FROM HISTORY SECTION === */}
        {activeSection === 'history' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {recentUniqueLogs.length === 0 ? (
              <div className="text-center py-16">
                <Clock className="w-12 h-12 text-grappler-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-grappler-300 mb-2">No Workout History</h3>
                <p className="text-sm text-grappler-500">
                  Complete some workouts first, then you can save them as templates here.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-2">
                  <h2 className="text-sm font-semibold text-grappler-200">Recent Workouts</h2>
                  <p className="text-xs text-grappler-400 mt-0.5">
                    Last {recentUniqueLogs.length} unique sessions from your history
                  </p>
                </div>

                {recentUniqueLogs.map(log => (
                  <div key={log.id} className="bg-grappler-800 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-grappler-100">
                          {log.exercises.length} exercises
                        </h3>
                        <p className="text-xs text-grappler-400 mt-0.5">
                          {formatDate(log.date)} &middot; {log.duration} min &middot; RPE {log.overallRPE}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-sm font-medium text-grappler-200">
                          {Math.round(log.totalVolume).toLocaleString()} vol
                        </p>
                      </div>
                    </div>

                    {/* Exercise Pills */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {log.exercises.map((ex, i) => (
                        <span
                          key={i}
                          className="bg-grappler-700 text-grappler-300 px-2 py-0.5 rounded text-xs"
                        >
                          {ex.exerciseName}
                        </span>
                      ))}
                    </div>

                    {/* Save Action */}
                    {savingHistoryId === log.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder={`Workout ${formatDate(log.date)}`}
                          value={historyNameInputs[log.id] || ''}
                          onChange={(e) =>
                            setHistoryNameInputs(prev => ({
                              ...prev,
                              [log.id]: e.target.value
                            }))
                          }
                          className="w-full bg-grappler-900 border border-grappler-700 rounded-lg px-3 py-2 text-sm text-grappler-100 placeholder:text-grappler-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveFromHistory(log.id)}
                            className="btn btn-primary btn-sm flex-1 gap-1.5"
                          >
                            <Save className="w-3.5 h-3.5" />
                            Save Template
                          </button>
                          <button
                            onClick={() => setSavingHistoryId(null)}
                            className="btn btn-sm bg-grappler-700 text-grappler-300 hover:bg-grappler-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSavingHistoryId(log.id)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-grappler-700 text-grappler-200 text-sm font-medium hover:bg-grappler-600 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Save as Template
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
