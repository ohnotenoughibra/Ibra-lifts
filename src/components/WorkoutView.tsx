'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import {
  Calendar,
  Dumbbell,
  Clock,
  ChevronDown,
  ChevronUp,
  Play,
  Zap,
  Heart,
  Flame,
  RefreshCw,
  Info,
  Wrench,
  Search,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkoutSession, WorkoutType, MesocycleWeek, MuscleGroupConfig, MuscleEmphasis, EquipmentProfileName, DEFAULT_EQUIPMENT_PROFILES } from '@/lib/types';
import { Building2, Home, Backpack } from 'lucide-react';

interface WorkoutViewProps {
  onOpenBuilder?: () => void;
}

const PROFILE_ICONS: Record<string, any> = {
  gym: Building2,
  home: Home,
  travel: Backpack,
};

export default function WorkoutView({ onOpenBuilder }: WorkoutViewProps) {
  const { currentMesocycle, startWorkout, generateNewMesocycle, muscleEmphasis, setMuscleEmphasis, activeEquipmentProfile, setActiveEquipmentProfile } = useAppStore();
  const [expandedWeek, setExpandedWeek] = useState<number | null>(0);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [showEmphasisPicker, setShowEmphasisPicker] = useState(false);
  const [blockWeeks, setBlockWeeks] = useState(5);
  const [sessionMinutes, setSessionMinutes] = useState(0); // 0 = no limit

  const handleGenerateWithEmphasis = () => {
    setShowEmphasisPicker(false);
    generateNewMesocycle(blockWeeks, sessionMinutes || undefined);
  };

  if (!currentMesocycle) {
    return (
      <div className="text-center py-12">
        <Dumbbell className="w-16 h-16 text-grappler-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-grappler-200 mb-2">No Active Program</h2>
        <p className="text-grappler-400 mb-6">Generate a new mesocycle to get started</p>
        <div className="space-y-3 max-w-sm mx-auto">
          <button onClick={() => setShowEmphasisPicker(true)} className="btn btn-primary btn-md w-full gap-2">
            <SlidersHorizontal className="w-4 h-4" />
            Customize & Generate
          </button>
          <button onClick={() => generateNewMesocycle()} className="btn btn-secondary btn-sm w-full">
            Quick Generate (Default)
          </button>
        </div>
        <AnimatePresence>
          {showEmphasisPicker && (
            <MuscleEmphasisPicker
              config={muscleEmphasis}
              onSave={setMuscleEmphasis}
              onGenerate={handleGenerateWithEmphasis}
              onClose={() => setShowEmphasisPicker(false)}
              weeks={blockWeeks}
              onWeeksChange={setBlockWeeks}
              sessionMinutes={sessionMinutes}
              onSessionMinutesChange={setSessionMinutes}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  const getWorkoutTypeIcon = (type: WorkoutType) => {
    switch (type) {
      case 'strength': return Zap;
      case 'hypertrophy': return Heart;
      case 'power': return Flame;
    }
  };

  const getWorkoutTypeColor = (type: WorkoutType) => {
    switch (type) {
      case 'strength': return 'text-red-400 bg-red-500/10';
      case 'hypertrophy': return 'text-purple-400 bg-purple-500/10';
      case 'power': return 'text-orange-400 bg-orange-500/10';
    }
  };

  return (
    <div className="space-y-6">
      {/* Equipment Profile Switcher */}
      <div className="flex items-center gap-2 bg-grappler-800/50 rounded-xl p-1.5">
        {DEFAULT_EQUIPMENT_PROFILES.map((profile) => {
          const Icon = PROFILE_ICONS[profile.name] || Dumbbell;
          const isActive = activeEquipmentProfile === profile.name;
          return (
            <button
              key={profile.name}
              onClick={() => setActiveEquipmentProfile(profile.name)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all',
                isActive
                  ? 'bg-primary-500 text-white shadow-md'
                  : 'text-grappler-400 hover:text-grappler-200 hover:bg-grappler-700/50'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {profile.label}
            </button>
          );
        })}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-grappler-50">{currentMesocycle.name}</h2>
          <p className="text-sm text-grappler-400">
            {currentMesocycle.weeks.length} weeks • {currentMesocycle.goalFocus} focus
          </p>
        </div>
        <button
          onClick={() => setShowEmphasisPicker(true)}
          className="btn btn-secondary btn-sm gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" />
          New Block
        </button>
      </div>

      {/* Muscle Emphasis Picker */}
      <AnimatePresence>
        {showEmphasisPicker && (
          <MuscleEmphasisPicker
            config={muscleEmphasis}
            onSave={setMuscleEmphasis}
            onGenerate={handleGenerateWithEmphasis}
            onClose={() => setShowEmphasisPicker(false)}
            weeks={blockWeeks}
            onWeeksChange={setBlockWeeks}
            sessionMinutes={sessionMinutes}
            onSessionMinutesChange={setSessionMinutes}
          />
        )}
      </AnimatePresence>

      {/* Build Custom / Browse */}
      {onOpenBuilder && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onOpenBuilder}
            className="card p-4 flex items-center gap-3 hover:bg-grappler-700/50 transition-colors text-left"
          >
            <div className="w-10 h-10 bg-accent-500/20 rounded-lg flex items-center justify-center">
              <Wrench className="w-5 h-5 text-accent-400" />
            </div>
            <div>
              <p className="font-medium text-grappler-100 text-sm">Build Workout</p>
              <p className="text-xs text-grappler-500">Custom session</p>
            </div>
          </button>
          <button
            onClick={onOpenBuilder}
            className="card p-4 flex items-center gap-3 hover:bg-grappler-700/50 transition-colors text-left"
          >
            <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
              <Search className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="font-medium text-grappler-100 text-sm">Browse Exercises</p>
              <p className="text-xs text-grappler-500">Full database</p>
            </div>
          </button>
        </div>
      )}

      {/* Periodization Info */}
      <div className="card p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-grappler-200 text-sm">Undulating Periodization</p>
            <p className="text-xs text-grappler-400 mt-1">
              Each week varies intensity: <span className="text-red-400">Strength</span> (heavy, low reps),{' '}
              <span className="text-purple-400">Hypertrophy</span> (moderate, more reps),{' '}
              <span className="text-orange-400">Power</span> (explosive, lighter loads).
            </p>
          </div>
        </div>
      </div>

      {/* Weeks */}
      <div className="space-y-4">
        {currentMesocycle.weeks.map((week, weekIndex) => (
          <WeekCard
            key={weekIndex}
            week={week}
            weekIndex={weekIndex}
            isExpanded={expandedWeek === weekIndex}
            onToggle={() => setExpandedWeek(expandedWeek === weekIndex ? null : weekIndex)}
            expandedSession={expandedSession}
            setExpandedSession={setExpandedSession}
            onStartWorkout={startWorkout}
            getWorkoutTypeIcon={getWorkoutTypeIcon}
            getWorkoutTypeColor={getWorkoutTypeColor}
          />
        ))}
      </div>
    </div>
  );
}

// Default config for the muscle emphasis picker
const DEFAULT_MUSCLE_CONFIG: MuscleGroupConfig = {
  chest: 'maintain',
  back: 'maintain',
  shoulders: 'maintain',
  biceps: 'maintain',
  triceps: 'maintain',
  quadriceps: 'maintain',
  hamstrings: 'maintain',
  glutes: 'maintain',
  calves: 'maintain',
  core: 'maintain',
};

const MUSCLE_GROUP_LABELS: Record<keyof MuscleGroupConfig, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quadriceps: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
};

const EMPHASIS_CYCLE: MuscleEmphasis[] = ['maintain', 'focus', 'ignore'];

const EMPHASIS_STYLES: Record<MuscleEmphasis, { bg: string; text: string; border: string; label: string }> = {
  focus: {
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    border: 'border-green-500/50',
    label: 'Focus',
  },
  maintain: {
    bg: 'bg-grappler-700/50',
    text: 'text-grappler-300',
    border: 'border-grappler-600',
    label: 'Maintain',
  },
  ignore: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/30',
    label: 'Ignore',
  },
};

interface MuscleEmphasisPickerProps {
  config: MuscleGroupConfig | null;
  onSave: (config: MuscleGroupConfig) => void;
  onGenerate: () => void;
  onClose: () => void;
  weeks: number;
  onWeeksChange: (weeks: number) => void;
  sessionMinutes: number;
  onSessionMinutesChange: (minutes: number) => void;
}

function MuscleEmphasisPicker({ config, onSave, onGenerate, onClose, weeks, onWeeksChange, sessionMinutes, onSessionMinutesChange }: MuscleEmphasisPickerProps) {
  const [localConfig, setLocalConfig] = useState<MuscleGroupConfig>(
    config || { ...DEFAULT_MUSCLE_CONFIG }
  );

  const cycleEmphasis = (muscle: keyof MuscleGroupConfig) => {
    const current = localConfig[muscle];
    const currentIndex = EMPHASIS_CYCLE.indexOf(current);
    const next = EMPHASIS_CYCLE[(currentIndex + 1) % EMPHASIS_CYCLE.length];
    const updated = { ...localConfig, [muscle]: next };
    setLocalConfig(updated);
    onSave(updated);
  };

  const resetAll = () => {
    const reset = { ...DEFAULT_MUSCLE_CONFIG };
    setLocalConfig(reset);
    onSave(reset);
  };

  const focusCount = Object.values(localConfig).filter(v => v === 'focus').length;
  const ignoreCount = Object.values(localConfig).filter(v => v === 'ignore').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="mt-6 card p-5 text-left"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-grappler-50 text-base">Muscle Emphasis</h3>
          <p className="text-xs text-grappler-400 mt-0.5">
            Tap a muscle group to cycle: Maintain &rarr; Focus &rarr; Ignore
          </p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-grappler-700 transition-colors">
          <X className="w-4 h-4 text-grappler-400" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs">
        {(['focus', 'maintain', 'ignore'] as MuscleEmphasis[]).map((emphasis) => {
          const style = EMPHASIS_STYLES[emphasis];
          return (
            <div key={emphasis} className="flex items-center gap-1.5">
              <div className={cn('w-2.5 h-2.5 rounded-full', style.bg, 'border', style.border)} />
              <span className={style.text}>{style.label}</span>
            </div>
          );
        })}
      </div>

      {/* Block Duration */}
      <div className="mb-4">
        <label className="text-xs font-medium text-grappler-400 mb-2 block">Block Duration</label>
        <div className="flex gap-1.5">
          {[3, 4, 5, 6, 8].map((w) => (
            <button
              key={w}
              onClick={() => onWeeksChange(w)}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                weeks === w
                  ? 'bg-primary-500 text-white'
                  : 'bg-grappler-700/50 text-grappler-400 hover:text-grappler-200'
              )}
            >
              {w}w
            </button>
          ))}
        </div>
        <p className="text-[10px] text-grappler-500 mt-1.5">
          Last week is always a deload. {weeks >= 6 ? 'Longer blocks build more volume.' : ''}
        </p>
      </div>

      {/* Session Time Limit */}
      <div className="mb-4">
        <label className="text-xs font-medium text-grappler-400 mb-2 block">Session Time Limit</label>
        <div className="flex gap-1.5">
          {[
            { value: 0, label: 'No limit' },
            { value: 45, label: '45m' },
            { value: 60, label: '60m' },
            { value: 75, label: '75m' },
            { value: 90, label: '90m' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => onSessionMinutesChange(opt.value)}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                sessionMinutes === opt.value
                  ? 'bg-accent-500 text-white'
                  : 'bg-grappler-700/50 text-grappler-400 hover:text-grappler-200'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-grappler-500 mt-1.5">
          {sessionMinutes > 0
            ? `Sessions will be trimmed to ~${sessionMinutes} min. Compounds kept, isolation dropped first.`
            : 'Sessions auto-sized based on workout type.'}
        </p>
      </div>

      {/* Muscle Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {(Object.keys(MUSCLE_GROUP_LABELS) as (keyof MuscleGroupConfig)[]).map((muscle) => {
          const emphasis = localConfig[muscle];
          const style = EMPHASIS_STYLES[emphasis];
          return (
            <button
              key={muscle}
              onClick={() => cycleEmphasis(muscle)}
              className={cn(
                'p-3 rounded-xl border-2 transition-all text-left flex items-center justify-between',
                style.bg,
                style.border,
                'hover:brightness-110 active:scale-[0.97]'
              )}
            >
              <span className={cn('text-sm font-medium', style.text)}>
                {MUSCLE_GROUP_LABELS[muscle]}
              </span>
              <span className={cn(
                'text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full',
                emphasis === 'focus' && 'bg-green-500/30 text-green-300',
                emphasis === 'maintain' && 'bg-grappler-600/50 text-grappler-400',
                emphasis === 'ignore' && 'bg-red-500/20 text-red-300',
              )}>
                {style.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Summary */}
      {(focusCount > 0 || ignoreCount > 0) && (
        <div className="text-xs text-grappler-400 mb-4 flex items-center gap-3">
          {focusCount > 0 && (
            <span className="text-green-400">{focusCount} focused</span>
          )}
          {ignoreCount > 0 && (
            <span className="text-red-400">{ignoreCount} ignored</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={resetAll}
          className="btn btn-secondary btn-sm flex-1"
        >
          Reset All
        </button>
        <button
          onClick={onGenerate}
          className="btn btn-primary btn-sm flex-1 gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Generate Block
        </button>
      </div>
    </motion.div>
  );
}

interface WeekCardProps {
  week: MesocycleWeek;
  weekIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
  expandedSession: string | null;
  setExpandedSession: (id: string | null) => void;
  onStartWorkout: (session: WorkoutSession) => void;
  getWorkoutTypeIcon: (type: WorkoutType) => any;
  getWorkoutTypeColor: (type: WorkoutType) => string;
}

function WeekCard({
  week,
  weekIndex,
  isExpanded,
  onToggle,
  expandedSession,
  setExpandedSession,
  onStartWorkout,
  getWorkoutTypeIcon,
  getWorkoutTypeColor
}: WeekCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: weekIndex * 0.1 }}
      className="card overflow-hidden"
    >
      {/* Week Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-grappler-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            week.isDeload ? 'bg-green-500/20' : 'bg-primary-500/20'
          )}>
            <Calendar className={cn(
              'w-5 h-5',
              week.isDeload ? 'text-green-400' : 'text-primary-400'
            )} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-grappler-100">
              Week {week.weekNumber}
              {week.isDeload && (
                <span className="ml-2 text-xs font-normal text-green-400 bg-green-500/20 px-2 py-0.5 rounded-full">
                  Deload
                </span>
              )}
            </h3>
            <p className="text-sm text-grappler-400">
              {week.sessions.length} sessions
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-grappler-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-grappler-400" />
        )}
      </button>

      {/* Week Content */}
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-grappler-700"
        >
          <div className="p-4 space-y-3">
            {week.sessions.map((session) => {
              const Icon = getWorkoutTypeIcon(session.type);
              const colorClass = getWorkoutTypeColor(session.type);
              const isSessionExpanded = expandedSession === session.id;

              return (
                <div key={session.id} className="bg-grappler-800/50 rounded-lg overflow-hidden">
                  {/* Session Header with inline Start */}
                  <div className="p-4 flex items-center gap-3">
                    <button
                      onClick={() => setExpandedSession(isSessionExpanded ? null : session.id)}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', colorClass)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="text-left min-w-0">
                        <h4 className="font-medium text-grappler-100 truncate">{session.name}</h4>
                        <div className="flex items-center gap-3 text-xs text-grappler-400">
                          <span className="flex items-center gap-1">
                            <Dumbbell className="w-3 h-3" />
                            {session.exercises.length}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {session.estimatedDuration}m
                          </span>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => onStartWorkout(session)}
                      className="btn btn-primary btn-sm gap-1 flex-shrink-0"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Start
                    </button>
                    <button
                      onClick={() => setExpandedSession(isSessionExpanded ? null : session.id)}
                      className="p-1.5 flex-shrink-0"
                    >
                      {isSessionExpanded ? (
                        <ChevronUp className="w-4 h-4 text-grappler-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-grappler-400" />
                      )}
                    </button>
                  </div>

                  {/* Session Details (expand for preview) */}
                  {isSessionExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="border-t border-grappler-700 p-4"
                    >
                      {/* Exercises */}
                      <div className="space-y-2">
                        {session.exercises.map((ex, i) => (
                          <div
                            key={i}
                            className="bg-grappler-700/50 rounded-lg p-3"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-grappler-100">{ex.exercise.name}</p>
                                <p className="text-sm text-grappler-400">
                                  {ex.sets} x {ex.prescription.targetReps} reps @ RPE {ex.prescription.rpe}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-grappler-400">
                                  Rest: {Math.floor(ex.prescription.restSeconds / 60)}:{(ex.prescription.restSeconds % 60).toString().padStart(2, '0')}
                                </p>
                                {ex.prescription.percentageOf1RM && (
                                  <p className="text-xs text-grappler-500">
                                    ~{ex.prescription.percentageOf1RM}% 1RM
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
