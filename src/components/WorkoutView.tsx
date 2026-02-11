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
  X,
  Check,
  Shuffle,
  Star,
  ArrowRight,
  FileDown,
  TrendingUp,
  Save,
  Settings,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkoutSession, WorkoutType, MesocycleWeek, MuscleGroupConfig, MuscleEmphasis, ExercisePrescription, Equipment, SessionsPerWeek } from '@/lib/types';
import { getRecommendedAlternatives, ExerciseRecommendation } from '@/lib/exercises';
import { exportProgramPdf } from '@/lib/pdf-export';

interface WorkoutViewProps {
  onOpenBuilder?: () => void;
}

export default function WorkoutView({ onOpenBuilder }: WorkoutViewProps) {
  const { currentMesocycle, startWorkout, generateNewMesocycle, muscleEmphasis, setMuscleEmphasis, workoutLogs, swapProgramExercise, user, saveAsTemplate, migrateWorkoutLogsToMesocycle, getCurrentMesocycleLogCount } = useAppStore();

  // Track which sessions have been completed in this mesocycle
  const completedSessionIds = new Set(
    currentMesocycle
      ? workoutLogs
          .filter(log => log.mesocycleId === currentMesocycle.id)
          .map(log => log.sessionId)
      : []
  );
  const [expandedWeek, setExpandedWeek] = useState<number | null>(0);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [showEmphasisPicker, setShowEmphasisPicker] = useState(false);
  const [blockWeeks, setBlockWeeks] = useState(5);
  const [sessionMinutes, setSessionMinutes] = useState(0); // 0 = no limit
  const [showProgramSettings, setShowProgramSettings] = useState(false);
  const [programModified, setProgramModified] = useState(false);
  const [showSaveTemplateBanner, setShowSaveTemplateBanner] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Migration dialog state
  const [showMigrateDialog, setShowMigrateDialog] = useState(false);
  const [pendingGeneration, setPendingGeneration] = useState<{ weeks: number; sessionMinutes?: number; sessionsPerWeek?: SessionsPerWeek } | null>(null);
  const [previousMesocycleId, setPreviousMesocycleId] = useState<string | null>(null);

  // Get workout logs breakdown by type for the current mesocycle
  const getWorkoutBreakdown = () => {
    const state = useAppStore.getState();
    const { currentMesocycle: meso, workoutLogs: logs } = state;
    if (!meso) return { total: 0, strength: 0, hypertrophy: 0, power: 0, workouts: [] };

    const mesoLogs = logs.filter(log => log.mesocycleId === meso.id);

    // Match logs to sessions to get workout types
    const breakdown = { total: mesoLogs.length, strength: 0, hypertrophy: 0, power: 0, workouts: mesoLogs };

    mesoLogs.forEach(log => {
      // Find the session this log belongs to
      for (const week of meso.weeks) {
        const session = week.sessions.find(s => s.id === log.sessionId);
        if (session) {
          if (session.type === 'strength') breakdown.strength++;
          else if (session.type === 'hypertrophy') breakdown.hypertrophy++;
          else if (session.type === 'power') breakdown.power++;
          break;
        }
      }
    });

    return breakdown;
  };

  // Check for existing workouts and prompt migration
  const handleGenerateWithMigrationCheck = (weeks: number, sessionMinutes?: number, sessionsPerWeek?: SessionsPerWeek) => {
    // Get fresh state from store to avoid stale closure issues
    const state = useAppStore.getState();
    const currentLogCount = state.getCurrentMesocycleLogCount();
    const importable = state.getImportableWorkoutLogs();
    const activeMesocycle = state.currentMesocycle;

    console.log('[Migration Check] currentLogCount:', currentLogCount, 'importable:', importable.importable.length, 'activeMesocycle:', activeMesocycle?.id);

    // Check if there are workouts to migrate (current mesocycle OR importable from history)
    const hasWorkoutsToMigrate = currentLogCount > 0 || importable.importable.length > 0;

    if (hasWorkoutsToMigrate) {
      // Store the generation params and show migration dialog
      setPreviousMesocycleId(activeMesocycle?.id || null);
      setPendingGeneration({ weeks, sessionMinutes, sessionsPerWeek });
      setShowMigrateDialog(true);
    } else {
      // No workouts to migrate, proceed directly
      if (sessionsPerWeek && user) {
        useAppStore.getState().setUser({ ...user, sessionsPerWeek });
      }
      generateNewMesocycle(weeks, sessionMinutes);
    }
  };

  // Handle migration dialog response
  const handleMigrateResponse = (shouldMigrate: boolean, importFromHistory: boolean = false) => {
    if (!pendingGeneration) return;

    const { weeks, sessionMinutes: mins, sessionsPerWeek } = pendingGeneration;
    const oldMesocycleId = previousMesocycleId;

    // Get importable logs before generating new mesocycle
    const importableLogs = importFromHistory
      ? useAppStore.getState().getImportableWorkoutLogs().importable
      : [];

    // Update sessions per week if needed
    if (sessionsPerWeek && user) {
      useAppStore.getState().setUser({ ...user, sessionsPerWeek });
    }

    // Generate the new mesocycle
    generateNewMesocycle(weeks, mins);

    // After generation, migrate/import workouts
    setTimeout(() => {
      const state = useAppStore.getState();
      const newMesocycle = state.currentMesocycle;

      if (newMesocycle) {
        // Migrate from old mesocycle if selected
        if (shouldMigrate && oldMesocycleId) {
          state.migrateWorkoutLogsToMesocycle(oldMesocycleId, newMesocycle.id);
        }

        // Import from history if selected
        if (importFromHistory && importableLogs.length > 0) {
          state.importWorkoutLogsToCurrentMesocycle(importableLogs.map(l => l.id));
        }
      }
    }, 0);

    // Reset dialog state
    setShowMigrateDialog(false);
    setPendingGeneration(null);
    setPreviousMesocycleId(null);
    setShowProgramSettings(false);
    setProgramModified(false);
    setShowSaveTemplateBanner(false);
  };

  const handleGenerateWithEmphasis = () => {
    setShowEmphasisPicker(false);
    handleGenerateWithMigrationCheck(blockWeeks, sessionMinutes || undefined);
  };

  // Track program modifications (exercise swaps)
  const handleSwapExercise = (weekIndex: number, sessionId: string, exerciseIndex: number, newExerciseId: string) => {
    swapProgramExercise(weekIndex, sessionId, exerciseIndex, newExerciseId);
    if (!programModified) {
      setProgramModified(true);
      // Show save-as-template banner after first modification
      setTimeout(() => setShowSaveTemplateBanner(true), 500);
    }
  };

  // Regenerate program with new settings
  const handleRegenerateProgram = (weeks: number, sessionsPerWeek: SessionsPerWeek) => {
    handleGenerateWithMigrationCheck(weeks, sessionMinutes || undefined, sessionsPerWeek);
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
      case 'power': return 'text-blue-400 bg-blue-500/10';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-grappler-50">{currentMesocycle.name}</h2>
          <p className="text-sm text-grappler-400">
            {currentMesocycle.weeks.length} weeks • {currentMesocycle.weeks[0]?.sessions?.length || 0} sessions/week • {currentMesocycle.goalFocus} focus
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProgramSettings(!showProgramSettings)}
            className={cn(
              'btn btn-ghost btn-sm gap-1 no-print',
              showProgramSettings && 'bg-grappler-700/50 text-grappler-200'
            )}
            title="Program settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => exportProgramPdf(currentMesocycle, user?.weightUnit || 'lbs')}
            className="btn btn-ghost btn-sm gap-1"
            title="Export program as PDF"
          >
            <FileDown className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowEmphasisPicker(true)}
            className="btn btn-secondary btn-sm gap-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
            New Block
          </button>
        </div>
      </div>

      {/* Program Settings Panel */}
      <AnimatePresence>
        {showProgramSettings && (
          <ProgramSettingsPanel
            currentWeeks={currentMesocycle.weeks.length}
            currentSessionsPerWeek={(currentMesocycle.weeks[0]?.sessions?.length || 3) as SessionsPerWeek}
            onRegenerate={handleRegenerateProgram}
            onClose={() => setShowProgramSettings(false)}
          />
        )}
      </AnimatePresence>

      {/* Save as Template Banner */}
      <AnimatePresence>
        {showSaveTemplateBanner && currentMesocycle.weeks[0] && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="card p-4 border border-accent-500/30 bg-accent-500/5">
              <div className="flex items-start gap-3">
                <Save className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-grappler-200">Save your modifications?</p>
                  <p className="text-xs text-grappler-400 mt-0.5">
                    You&apos;ve customized exercises — save a session as a reusable template.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Template name..."
                      className="flex-1 px-3 py-1.5 rounded-lg bg-grappler-800 border border-grappler-700 text-grappler-100 placeholder:text-grappler-600 text-sm outline-none focus-visible:border-accent-500"
                    />
                    <button
                      onClick={() => {
                        if (templateName.trim() && currentMesocycle.weeks[0]) {
                          // Save the first session of week 1 as template
                          const session = currentMesocycle.weeks[0].sessions[0];
                          if (session) {
                            saveAsTemplate(templateName.trim(), session);
                            setShowSaveTemplateBanner(false);
                            setTemplateName('');
                          }
                        }
                      }}
                      disabled={!templateName.trim()}
                      className="btn btn-accent btn-sm gap-1 disabled:opacity-40"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save
                    </button>
                    <button
                      onClick={() => setShowSaveTemplateBanner(false)}
                      className="p-1.5 text-grappler-500 hover:text-grappler-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <span className="text-blue-400">Power</span> (explosive, lighter loads).
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
            completedSessionIds={completedSessionIds}
            onSwapExercise={handleSwapExercise}
            userEquipment={user?.equipment || 'full_gym'}
          />
        ))}
      </div>

      {/* Workout Migration Dialog */}
      <AnimatePresence>
        {showMigrateDialog && (() => {
          const breakdown = getWorkoutBreakdown();
          const importable = useAppStore.getState().getImportableWorkoutLogs();
          const hasCurrentWorkouts = breakdown.total > 0;
          const hasImportableHistory = importable.importable.length > 0;

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => {
                setShowMigrateDialog(false);
                setPendingGeneration(null);
                setPreviousMesocycleId(null);
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-grappler-900 rounded-2xl p-5 max-w-sm w-full border border-grappler-700 shadow-xl max-h-[85vh] overflow-y-auto"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-primary-500/20">
                    <RefreshCw className="w-5 h-5 text-primary-400" />
                  </div>
                  <h3 className="text-lg font-bold text-grappler-100">Import Workout Progress?</h3>
                </div>

                {/* Current mesocycle workouts */}
                {hasCurrentWorkouts && (
                  <>
                    <p className="text-sm text-grappler-400 mb-3">
                      <span className="text-primary-400 font-semibold">{breakdown.total} workout{breakdown.total !== 1 ? 's' : ''}</span> in current program:
                    </p>
                    <div className="flex gap-2 mb-4">
                      {breakdown.strength > 0 && (
                        <div className="flex-1 bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-center">
                          <Zap className="w-4 h-4 text-red-400 mx-auto mb-1" />
                          <p className="text-sm font-bold text-red-400">{breakdown.strength}</p>
                          <p className="text-xs text-red-400/70">Strength</p>
                        </div>
                      )}
                      {breakdown.hypertrophy > 0 && (
                        <div className="flex-1 bg-purple-500/10 border border-purple-500/30 rounded-lg p-2 text-center">
                          <Heart className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                          <p className="text-sm font-bold text-purple-400">{breakdown.hypertrophy}</p>
                          <p className="text-xs text-purple-400/70">Hypertrophy</p>
                        </div>
                      )}
                      {breakdown.power > 0 && (
                        <div className="flex-1 bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 text-center">
                          <Flame className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                          <p className="text-sm font-bold text-blue-400">{breakdown.power}</p>
                          <p className="text-xs text-blue-400/70">Power</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Importable history from other/deleted mesocycles */}
                {hasImportableHistory && (
                  <div className={cn(hasCurrentWorkouts && 'border-t border-grappler-700 pt-4 mt-4')}>
                    <p className="text-sm text-grappler-400 mb-3">
                      <span className="text-accent-400 font-semibold">{importable.importable.length} workout{importable.importable.length !== 1 ? 's' : ''}</span> from recent history (last 30 days):
                    </p>
                    <div className="bg-accent-500/10 border border-accent-500/30 rounded-lg p-3 mb-4">
                      <div className="flex items-center gap-2 text-accent-400">
                        <History className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {importable.orphaned.length > 0 && `${importable.orphaned.length} orphaned`}
                          {importable.orphaned.length > 0 && importable.otherMesocycles.length > 0 && ' + '}
                          {importable.otherMesocycles.length > 0 && `${importable.otherMesocycles.length} from previous programs`}
                        </span>
                      </div>
                      <p className="text-xs text-grappler-400 mt-1">
                        These workouts can be imported into your new program
                      </p>
                    </div>
                  </div>
                )}

                {!hasCurrentWorkouts && !hasImportableHistory && (
                  <p className="text-sm text-grappler-400 mb-4">
                    No workout history found to import.
                  </p>
                )}

                <div className="space-y-2">
                  {hasCurrentWorkouts && (
                    <button
                      onClick={() => handleMigrateResponse(true, false)}
                      className="btn btn-primary w-full gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Keep Current {breakdown.total} Workout{breakdown.total !== 1 ? 's' : ''}
                    </button>
                  )}
                  {hasImportableHistory && (
                    <button
                      onClick={() => handleMigrateResponse(hasCurrentWorkouts, true)}
                      className={cn(
                        'btn w-full gap-2',
                        hasCurrentWorkouts ? 'btn-secondary' : 'btn-primary'
                      )}
                    >
                      <History className="w-4 h-4" />
                      {hasCurrentWorkouts
                        ? `Also Import ${importable.importable.length} from History`
                        : `Import ${importable.importable.length} from History`}
                    </button>
                  )}
                  <button
                    onClick={() => handleMigrateResponse(false, false)}
                    className="btn btn-secondary w-full gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Start Fresh
                  </button>
                  <button
                    onClick={() => {
                      setShowMigrateDialog(false);
                      setPendingGeneration(null);
                      setPreviousMesocycleId(null);
                    }}
                    className="btn btn-ghost w-full text-grappler-500"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
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
        <p className="text-xs text-grappler-500 mt-1.5">
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
        <p className="text-xs text-grappler-500 mt-1.5">
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
                'text-xs font-semibold uppercase px-1.5 py-0.5 rounded-full',
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

// --- Exercise Card with Swap ---
interface ExerciseCardProps {
  exercise: ExercisePrescription;
  index: number;
  weekIndex: number;
  sessionId: string;
  onSwap: (weekIndex: number, sessionId: string, exerciseIndex: number, newExerciseId: string) => void;
  userEquipment: Equipment;
}

function ExerciseCard({ exercise: ex, index, weekIndex, sessionId, onSwap, userEquipment }: ExerciseCardProps) {
  const [showAlternatives, setShowAlternatives] = useState(false);
  const workoutLogs = useAppStore((s) => s.workoutLogs);
  const weightUnit = useAppStore((s) => s.user?.weightUnit || 'lbs');

  const alternatives: ExerciseRecommendation[] = showAlternatives
    ? getRecommendedAlternatives(ex.exerciseId, userEquipment, 8)
    : [];

  // Get previous performance for an alternative exercise (same as ActiveWorkout)
  const getAltHistory = (exerciseId: string) => {
    const sorted = [...workoutLogs].reverse();
    for (const log of sorted) {
      const found = log.exercises.find(e => e.exerciseId === exerciseId);
      if (found && found.sets.length > 0) {
        const bestSet = found.sets
          .filter(s => s.completed)
          .reduce((best, s) => (s.weight > best.weight ? s : best), found.sets[0]);
        return { weight: bestSet.weight, reps: bestSet.reps, date: new Date(log.date) };
      }
    }
    return null;
  };

  return (
    <div className="bg-grappler-700/50 rounded-lg overflow-hidden">
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-grappler-100">{ex.exercise.name}</p>
            <p className="text-sm text-grappler-400">
              {ex.sets} x {ex.prescription.targetReps} reps @ RPE {ex.prescription.rpe}
            </p>
          </div>
          <div className="flex items-center gap-2">
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
            <button
              onClick={() => setShowAlternatives(!showAlternatives)}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                showAlternatives
                  ? 'bg-accent-500/20 text-accent-400'
                  : 'text-grappler-500 hover:text-grappler-300 hover:bg-grappler-600/50'
              )}
              title="Swap exercise"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Alternatives Panel — matches workout swap quality */}
      <AnimatePresence>
        {showAlternatives && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-grappler-600/50 px-3 py-2">
              <p className="text-xs font-semibold text-grappler-400 uppercase tracking-wider mb-1">
                Swap with
              </p>
              <p className="text-xs text-grappler-500 mb-2">
                Sorted by match score — how well each exercise replaces the current one
              </p>
              {alternatives.length === 0 ? (
                <p className="text-xs text-grappler-500 py-2">No alternatives found for your equipment.</p>
              ) : (
                <div className="space-y-1.5">
                  {alternatives.map((rec) => {
                    const altHistory = getAltHistory(rec.exercise.id);
                    return (
                      <button
                        key={rec.exercise.id}
                        onClick={() => {
                          onSwap(weekIndex, sessionId, index, rec.exercise.id);
                          setShowAlternatives(false);
                        }}
                        className="w-full text-left p-2.5 rounded-lg border border-grappler-700/50 hover:border-primary-500/50 bg-grappler-800/50 hover:bg-grappler-700/50 transition-all group"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <p className="text-sm font-semibold text-grappler-200 group-hover:text-primary-300 transition-colors">
                            {rec.exercise.name}
                          </p>
                          <span className={cn(
                            'text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2',
                            rec.matchScore >= 80 ? 'bg-green-500/20 text-green-400' :
                            rec.matchScore >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-grappler-700 text-grappler-400'
                          )}>
                            {rec.matchScore}%
                          </span>
                        </div>

                        {/* Reason */}
                        {rec.reasons.length > 0 && (
                          <p className="text-xs text-grappler-400 mb-1">
                            {rec.reasons[0]}
                          </p>
                        )}

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 mb-1">
                          {rec.tags.slice(0, 4).map((tag, i) => (
                            <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-grappler-700/80 text-grappler-300">
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Previous performance */}
                        {altHistory && (
                          <div className="flex items-center gap-1 mt-1">
                            <TrendingUp className="w-3 h-3 text-primary-400" />
                            <p className="text-xs text-primary-400">
                              You did {altHistory.weight} {weightUnit} x {altHistory.reps} on {altHistory.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        )}

                        {/* Muscle info */}
                        <p className="text-xs text-grappler-500 mt-1">
                          {rec.exercise.primaryMuscles.join(', ')}
                          {rec.exercise.secondaryMuscles.length > 0 && (
                            <span> + {rec.exercise.secondaryMuscles.slice(0, 2).join(', ')}</span>
                          )}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Program Settings Panel — adjust mesocycle length and sessions per week
function ProgramSettingsPanel({
  currentWeeks,
  currentSessionsPerWeek,
  onRegenerate,
  onClose,
}: {
  currentWeeks: number;
  currentSessionsPerWeek: SessionsPerWeek;
  onRegenerate: (weeks: number, sessionsPerWeek: SessionsPerWeek) => void;
  onClose: () => void;
}) {
  const [weeks, setWeeks] = useState(currentWeeks);
  const [sessions, setSessions] = useState<SessionsPerWeek>(currentSessionsPerWeek);

  const hasChanges = weeks !== currentWeeks || sessions !== currentSessionsPerWeek;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-grappler-200 flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary-400" />
            Program Settings
          </h3>
          <button onClick={onClose} className="p-1 text-grappler-500 hover:text-grappler-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mesocycle Length */}
        <div className="mb-4">
          <label className="text-xs text-grappler-400 mb-2 block">Mesocycle Length</label>
          <div className="flex gap-2">
            {[3, 4, 5, 6, 8].map((w) => (
              <button
                key={w}
                onClick={() => setWeeks(w)}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                  weeks === w
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'bg-grappler-700/50 text-grappler-400 hover:text-grappler-200 hover:bg-grappler-700'
                )}
              >
                {w}w
              </button>
            ))}
          </div>
        </div>

        {/* Sessions Per Week */}
        <div className="mb-4">
          <label className="text-xs text-grappler-400 mb-2 block">Sessions Per Week</label>
          <div className="flex gap-2">
            {([2, 3, 4, 5, 6] as SessionsPerWeek[]).map((s) => (
              <button
                key={s}
                onClick={() => setSessions(s)}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                  sessions === s
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'bg-grappler-700/50 text-grappler-400 hover:text-grappler-200 hover:bg-grappler-700'
                )}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Always show regenerate option */}
        <div className="space-y-2">
          <button
            onClick={() => onRegenerate(weeks, sessions)}
            className="btn btn-primary btn-sm w-full gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {hasChanges ? 'Apply Changes & Regenerate' : 'Regenerate with New Exercises'}
          </button>
          {hasChanges && (
            <button
              onClick={() => {
                setWeeks(currentWeeks);
                setSessions(currentSessionsPerWeek);
              }}
              className="btn btn-ghost btn-sm w-full"
            >
              Reset Changes
            </button>
          )}
          <p className="text-xs text-grappler-500 text-center">
            {hasChanges
              ? 'This will create a new program with your updated settings'
              : 'Keep the same settings but get fresh exercise selections'}
          </p>
        </div>
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
  completedSessionIds: Set<string>;
  onSwapExercise: (weekIndex: number, sessionId: string, exerciseIndex: number, newExerciseId: string) => void;
  userEquipment: 'full_gym' | 'home_gym' | 'minimal';
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
  getWorkoutTypeColor,
  completedSessionIds,
  onSwapExercise,
  userEquipment,
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
              {week.sessions.filter(s => completedSessionIds.has(s.id)).length}/{week.sessions.length} sessions done
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
              const isCompleted = completedSessionIds.has(session.id);

              return (
                <div key={session.id} className={cn('bg-grappler-800/50 rounded-lg overflow-hidden', isCompleted && 'opacity-60')}>
                  {/* Session Header with inline Start */}
                  <div className="p-4 flex items-center gap-3">
                    <button
                      onClick={() => setExpandedSession(isSessionExpanded ? null : session.id)}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 relative', colorClass)}>
                        <Icon className="w-5 h-5" />
                        {isCompleted && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="text-left min-w-0">
                        <h4 className="font-medium text-grappler-100 truncate">{session.name}{isCompleted ? ' (Done)' : ''}</h4>
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
                          <ExerciseCard
                            key={`${session.id}-${i}-${ex.exerciseId}`}
                            exercise={ex}
                            index={i}
                            weekIndex={weekIndex}
                            sessionId={session.id}
                            onSwap={onSwapExercise}
                            userEquipment={userEquipment}
                          />
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
