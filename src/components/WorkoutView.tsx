'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Undo2,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkoutSession, WorkoutType, MesocycleWeek, MuscleGroupConfig, MuscleEmphasis, ExercisePrescription, Equipment, SessionsPerWeek, GoalFocus } from '@/lib/types';
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
  // Compute progress stats for the mesocycle
  const progressStats = useMemo(() => {
    if (!currentMesocycle) return { total: 0, completed: 0, percentage: 0 };
    const total = currentMesocycle.weeks.reduce((sum, week) => sum + week.sessions.length, 0);
    const completed = completedSessionIds.size;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  }, [currentMesocycle, completedSessionIds]);

  // Find the next unfinished session
  const nextUpSession = useMemo(() => {
    if (!currentMesocycle) return null;
    for (let wIdx = 0; wIdx < currentMesocycle.weeks.length; wIdx++) {
      const week = currentMesocycle.weeks[wIdx];
      for (const session of week.sessions) {
        if (!completedSessionIds.has(session.id)) {
          return { session, weekIndex: wIdx, weekNumber: week.weekNumber };
        }
      }
    }
    return null; // All sessions completed
  }, [currentMesocycle, completedSessionIds]);

  const [expandedWeek, setExpandedWeek] = useState<number | null>(0);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [showEmphasisPicker, setShowEmphasisPicker] = useState(false);
  const [blockWeeks, setBlockWeeks] = useState(5);
  const [sessionMinutes, setSessionMinutes] = useState(0); // 0 = no limit
  const [showProgramSettings, setShowProgramSettings] = useState(false);
  const [programModified, setProgramModified] = useState(false);
  const [showSaveTemplateBanner, setShowSaveTemplateBanner] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showFullProgram, setShowFullProgram] = useState(false);
  const [showPeriodizationInfo, setShowPeriodizationInfo] = useState(true);
  const [undoToast, setUndoToast] = useState<{ oldExerciseId: string; oldExerciseName: string; newExerciseName: string; weekIndex: number; sessionId: string; exerciseIndex: number } | null>(null);

  // Check localStorage for dismissed periodization info
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('dismissedPeriodizationInfo') === 'true') {
      setShowPeriodizationInfo(false);
    }
  }, []);

  // Auto-dismiss undo toast after 5 seconds
  useEffect(() => {
    if (!undoToast) return;
    const timer = setTimeout(() => setUndoToast(null), 5000);
    return () => clearTimeout(timer);
  }, [undoToast]);

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

  // Track program modifications (exercise swaps) with undo support
  const handleSwapExercise = (weekIndex: number, sessionId: string, exerciseIndex: number, newExerciseId: string) => {
    // Capture old exercise name for undo toast
    const oldExercise = currentMesocycle?.weeks[weekIndex]?.sessions
      .find(s => s.id === sessionId)?.exercises[exerciseIndex];
    const oldExerciseId = oldExercise?.exerciseId || '';
    const oldExerciseName = oldExercise?.exercise?.name || 'exercise';

    swapProgramExercise(weekIndex, sessionId, exerciseIndex, newExerciseId);

    // Get new exercise name from the updated state
    const newExName = useAppStore.getState().currentMesocycle?.weeks[weekIndex]?.sessions
      .find(s => s.id === sessionId)?.exercises[exerciseIndex]?.exercise?.name || 'exercise';

    setUndoToast({ oldExerciseId, oldExerciseName, newExerciseName: newExName, weekIndex, sessionId, exerciseIndex });

    if (!programModified) {
      setProgramModified(true);
    }
  };

  const handleUndoSwap = () => {
    if (!undoToast) return;
    swapProgramExercise(undoToast.weekIndex, undoToast.sessionId, undoToast.exerciseIndex, undoToast.oldExerciseId);
    setUndoToast(null);
  };

  // Regenerate program with new settings
  const handleRegenerateProgram = (weeks: number, sessionsPerWeek: SessionsPerWeek) => {
    handleGenerateWithMigrationCheck(weeks, sessionMinutes || undefined, sessionsPerWeek);
  };

  // Wizard state
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardGoal, setWizardGoal] = useState<GoalFocus>('balanced');
  const [wizardDays, setWizardDays] = useState<SessionsPerWeek>(3);

  if (!currentMesocycle) {
    const goalOptions: { value: GoalFocus; label: string; desc: string; icon: typeof Zap }[] = [
      { value: 'strength', label: 'Get Stronger', desc: 'Heavy compounds, low reps, long rest', icon: Zap },
      { value: 'hypertrophy', label: 'Build Muscle', desc: 'Moderate weight, higher volume, pump focus', icon: Heart },
      { value: 'balanced', label: 'Both', desc: 'Undulating periodization — best of both worlds', icon: Flame },
    ];

    const dayOptions: SessionsPerWeek[] = [2, 3, 4, 5, 6];
    const dayLabels: Record<number, string> = {
      2: 'Full Body', 3: 'Full Body', 4: 'Upper / Lower',
      5: 'Push / Pull / Legs', 6: 'Push / Pull / Legs',
    };

    const handleWizardGenerate = () => {
      // Apply wizard goal + sessions to user before generating
      const state = useAppStore.getState();
      if (state.user) {
        state.setUser({ ...state.user, sessionsPerWeek: wizardDays, goalFocus: wizardGoal });
      }
      generateNewMesocycle(blockWeeks, sessionMinutes || undefined);
    };

    return (
      <div className="space-y-6">
        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2">
          {['Goal', 'Schedule', 'Generate'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <button
                onClick={() => i < wizardStep && setWizardStep(i)}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  wizardStep === i ? 'bg-primary-500 text-white' :
                  wizardStep > i ? 'bg-green-500 text-white' :
                  'bg-grappler-700 text-grappler-400'
                )}
              >
                {wizardStep > i ? <Check className="w-4 h-4" /> : i + 1}
              </button>
              {i < 2 && <div className={cn('w-8 h-0.5 rounded', wizardStep > i ? 'bg-green-500' : 'bg-grappler-700')} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Goal */}
          {wizardStep === 0 && (
            <motion.div key="goal" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl font-bold text-grappler-50 text-center mb-2">What&apos;s your goal?</h2>
              <p className="text-sm text-grappler-400 text-center mb-6">This shapes your rep ranges, rest times, and volume</p>
              <div className="space-y-3 max-w-sm mx-auto">
                {goalOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setWizardGoal(opt.value); setWizardStep(1); }}
                    className={cn(
                      'w-full card p-4 flex items-center gap-4 text-left transition-all border',
                      wizardGoal === opt.value ? 'border-primary-500 bg-primary-500/10' : 'border-transparent hover:bg-grappler-700/50'
                    )}
                  >
                    <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <opt.icon className="w-6 h-6 text-primary-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-grappler-100">{opt.label}</p>
                      <p className="text-xs text-grappler-400 mt-0.5">{opt.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-grappler-500 ml-auto flex-shrink-0" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: Schedule */}
          {wizardStep === 1 && (
            <motion.div key="schedule" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl font-bold text-grappler-50 text-center mb-2">How many days per week?</h2>
              <p className="text-sm text-grappler-400 text-center mb-6">We&apos;ll pick the best split for your schedule</p>
              <div className="flex justify-center gap-3 mb-4">
                {dayOptions.map((d) => (
                  <button
                    key={d}
                    onClick={() => setWizardDays(d)}
                    className={cn(
                      'w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all border font-bold text-lg',
                      wizardDays === d
                        ? 'bg-primary-500 text-white border-primary-400'
                        : 'bg-grappler-800 text-grappler-300 border-grappler-700 hover:border-grappler-500'
                    )}
                  >
                    {d}
                    <span className="text-[10px] font-normal opacity-70">days</span>
                  </button>
                ))}
              </div>
              <p className="text-center text-sm text-grappler-400 mb-6">
                Recommended split: <span className="text-primary-400 font-medium">{dayLabels[wizardDays]}</span>
              </p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setWizardStep(0)} className="btn btn-ghost btn-sm">Back</button>
                <button onClick={() => setWizardStep(2)} className="btn btn-primary btn-md gap-2">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Confirm + Advanced */}
          {wizardStep === 2 && (
            <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl font-bold text-grappler-50 text-center mb-2">Ready to go</h2>
              <p className="text-sm text-grappler-400 text-center mb-6">Here&apos;s what we&apos;ll build for you</p>
              <div className="card p-4 max-w-sm mx-auto mb-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-grappler-400">Goal</span>
                  <span className="text-grappler-100 font-medium capitalize">{wizardGoal}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-grappler-400">Days / Week</span>
                  <span className="text-grappler-100 font-medium">{wizardDays}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-grappler-400">Block Length</span>
                  <span className="text-grappler-100 font-medium">{blockWeeks} weeks</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-grappler-400">Split</span>
                  <span className="text-grappler-100 font-medium">{dayLabels[wizardDays]}</span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-3 max-w-sm mx-auto">
                <button onClick={handleWizardGenerate} className="btn btn-primary btn-md w-full gap-2 font-semibold">
                  <Play className="w-4 h-4" />
                  Generate Program
                </button>
                <button
                  onClick={() => setShowEmphasisPicker(true)}
                  className="btn btn-ghost btn-sm gap-2 text-grappler-400"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Advanced: Customize Muscle Priorities
                </button>
                <button onClick={() => setWizardStep(1)} className="btn btn-ghost btn-sm text-grappler-500">Back</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
      {/* Header with Progress Ring */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Progress Ring */}
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="4" className="text-grappler-700" />
              <circle
                cx="28" cy="28" r="24" fill="none" strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 24}`}
                strokeDashoffset={`${2 * Math.PI * 24 * (1 - progressStats.percentage / 100)}`}
                className={cn(
                  'transition-all duration-700',
                  progressStats.percentage >= 100 ? 'text-green-400' : progressStats.percentage >= 50 ? 'text-primary-400' : 'text-yellow-400'
                )}
                stroke="currentColor"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-grappler-100">
              {progressStats.percentage}%
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-grappler-50">{currentMesocycle.name}</h2>
            <p className="text-sm text-grappler-400">
              {progressStats.completed}/{progressStats.total} sessions • {currentMesocycle.goalFocus} focus
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
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

      {/* Dismissible Periodization Info */}
      <AnimatePresence>
        {showPeriodizationInfo && (
          <motion.div
            initial={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="card p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-grappler-200 text-sm">Undulating Periodization</p>
                  <p className="text-xs text-grappler-400 mt-1">
                    Each week varies intensity: <span className="text-red-400">Strength</span> (heavy, low reps),{' '}
                    <span className="text-purple-400">Hypertrophy</span> (moderate, more reps),{' '}
                    <span className="text-blue-400">Power</span> (explosive, lighter loads).
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowPeriodizationInfo(false);
                    if (typeof window !== 'undefined') localStorage.setItem('dismissedPeriodizationInfo', 'true');
                  }}
                  className="p-1 text-grappler-500 hover:text-grappler-300 flex-shrink-0"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next Up Hero Card */}
      {nextUpSession ? (() => {
        const { session, weekNumber } = nextUpSession;
        const TypeIcon = getWorkoutTypeIcon(session.type);
        const typeColor = getWorkoutTypeColor(session.type);
        const typeBg = session.type === 'strength' ? 'from-red-500/20 to-red-900/10 border-red-500/30'
          : session.type === 'hypertrophy' ? 'from-purple-500/20 to-purple-900/10 border-purple-500/30'
          : 'from-blue-500/20 to-blue-900/10 border-blue-500/30';
        return (
          <div className={cn('card p-5 bg-gradient-to-br border', typeBg)}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-grappler-400">Next Up</span>
              <span className="text-xs text-grappler-500">Week {weekNumber}</span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', typeColor)}>
                <TypeIcon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-grappler-50 text-lg truncate">{session.name}</h3>
                <div className="flex items-center gap-3 text-xs text-grappler-400">
                  <span className="flex items-center gap-1"><Dumbbell className="w-3 h-3" />{session.exercises.length} exercises</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{session.estimatedDuration}m</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {session.exercises.slice(0, 5).map((ex, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-md bg-grappler-800/60 text-grappler-300">
                  {ex.exercise.name}
                </span>
              ))}
              {session.exercises.length > 5 && (
                <span className="text-xs px-2 py-1 rounded-md bg-grappler-800/60 text-grappler-500">
                  +{session.exercises.length - 5} more
                </span>
              )}
            </div>
            <button
              onClick={() => startWorkout(session)}
              className="btn btn-primary btn-md w-full gap-2 font-semibold"
            >
              <Play className="w-4 h-4" />
              Start Workout
            </button>
          </div>
        );
      })() : (
        <div className="card p-5 text-center border border-green-500/30 bg-green-500/5">
          <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <h3 className="font-bold text-grappler-100 text-lg mb-1">Block Complete!</h3>
          <p className="text-sm text-grappler-400 mb-4">All {progressStats.total} sessions finished. Time for the next block.</p>
          <button
            onClick={() => setShowEmphasisPicker(true)}
            className="btn btn-primary btn-sm gap-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Generate Next Block
          </button>
        </div>
      )}

      {/* Full Program Toggle */}
      <button
        onClick={() => setShowFullProgram(!showFullProgram)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-grappler-800/50 hover:bg-grappler-800 transition-colors"
      >
        <span className="text-sm font-medium text-grappler-300">
          {showFullProgram ? 'Hide' : 'View'} Full Program
        </span>
        <ChevronDown className={cn('w-4 h-4 text-grappler-400 transition-transform', showFullProgram && 'rotate-180')} />
      </button>

      {/* Weeks (collapsible) */}
      <AnimatePresence>
        {showFullProgram && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-4"
          >
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Undo Swap Toast */}
      <AnimatePresence>
        {undoToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-4 right-4 z-50 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-grappler-800 border border-grappler-600 shadow-xl"
          >
            <p className="text-sm text-grappler-200 flex-1 min-w-0 truncate">
              Swapped to <span className="font-semibold text-grappler-100">{undoToast.newExerciseName}</span>
            </p>
            <button
              onClick={handleUndoSwap}
              className="btn btn-ghost btn-sm gap-1 text-primary-400 hover:text-primary-300 flex-shrink-0"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Undo
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
        return { weight: bestSet.weight, reps: bestSet.reps, rpe: bestSet.rpe || 0, date: new Date(log.date) };
      }
    }
    return null;
  };

  const lastPerf = getAltHistory(ex.exerciseId);

  // Suggest next weight based on last RPE
  const suggestedWeight = lastPerf && lastPerf.weight > 0 ? (() => {
    const step = weightUnit === 'kg' ? 2.5 : 5;
    if (lastPerf.rpe <= 6) return lastPerf.weight + step * 2;
    if (lastPerf.rpe <= 8) return lastPerf.weight + step;
    return lastPerf.weight;
  })() : null;

  return (
    <div className="bg-grappler-700/50 rounded-lg overflow-hidden">
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-grappler-100">{ex.exercise.name}</p>
            <p className="text-sm text-grappler-400">
              {ex.sets} x {ex.prescription.targetReps} reps @ RPE {ex.prescription.rpe}
            </p>
            {lastPerf && lastPerf.weight > 0 && (
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <p className="text-xs text-grappler-500">
                  Last: {lastPerf.weight} {weightUnit} x {lastPerf.reps}
                </p>
                {suggestedWeight !== null && suggestedWeight !== lastPerf.weight && (
                  <span className="text-xs font-medium text-primary-400">
                    Try {suggestedWeight} {weightUnit}
                  </span>
                )}
              </div>
            )}
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
