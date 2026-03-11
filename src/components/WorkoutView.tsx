'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import {
  Dumbbell,
  Clock,
  ChevronDown,
  ChevronUp,
  Play,
  Zap,
  Heart,
  Flame,
  RefreshCw,
  SlidersHorizontal,
  X,
  Check,
  Shuffle,
  TrendingUp,
  History,
  Undo2,
  ChevronRight,
  Video,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkoutSession, WorkoutType, MuscleGroupConfig, MuscleEmphasis, ExercisePrescription, Equipment, SessionsPerWeek, GoalFocus } from '@/lib/types';
import { getRecommendedAlternatives, ExerciseRecommendation } from '@/lib/exercises';
import { fireConfetti } from '@/lib/confetti';
import { suggestNextBlock } from '@/lib/block-suggestion';
import { BlockTimeline, VolumeWave, AICoachInsight } from './MesocycleTimeline';
import YouTubeEmbed from '@/components/YouTubeEmbed';

export default function WorkoutView() {
  const { currentMesocycle, startWorkout, generateNewMesocycle, muscleEmphasis, setMuscleEmphasis, workoutLogs, swapProgramExercise, user, migrateWorkoutLogsToMesocycle, getCurrentMesocycleLogCount, mesocycleHistory, trainingSessions, injuryLog, wearableHistory, competitions } = useAppStore(
    useShallow(s => ({
      currentMesocycle: s.currentMesocycle, startWorkout: s.startWorkout, generateNewMesocycle: s.generateNewMesocycle,
      muscleEmphasis: s.muscleEmphasis, setMuscleEmphasis: s.setMuscleEmphasis, workoutLogs: s.workoutLogs,
      swapProgramExercise: s.swapProgramExercise, user: s.user,
      migrateWorkoutLogsToMesocycle: s.migrateWorkoutLogsToMesocycle, getCurrentMesocycleLogCount: s.getCurrentMesocycleLogCount,
      mesocycleHistory: s.mesocycleHistory, trainingSessions: s.trainingSessions,
      injuryLog: s.injuryLog, wearableHistory: s.wearableHistory, competitions: s.competitions,
    }))
  );

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

  // Find the next unfinished session — continue from most recently completed position
  const nextUpSession = useMemo(() => {
    if (!currentMesocycle) return null;

    // Build flat session list sorted by week then position
    const allSessions: { session: WorkoutSession; weekIndex: number; weekNumber: number }[] = [];
    for (let wIdx = 0; wIdx < currentMesocycle.weeks.length; wIdx++) {
      const week = currentMesocycle.weeks[wIdx];
      for (const session of week.sessions) {
        allSessions.push({ session, weekIndex: wIdx, weekNumber: week.weekNumber });
      }
    }
    allSessions.sort((a, b) => a.weekNumber - b.weekNumber);

    // Find the FURTHEST completed position (highest index among all completed sessions)
    let lastCompletedIndex = -1;
    for (let i = 0; i < allSessions.length; i++) {
      if (completedSessionIds.has(allSessions[i].session.id)) {
        lastCompletedIndex = i;
      }
    }

    // Look forward from the most recently completed session
    if (lastCompletedIndex >= 0) {
      for (let i = lastCompletedIndex + 1; i < allSessions.length; i++) {
        if (!completedSessionIds.has(allSessions[i].session.id)) {
          return allSessions[i];
        }
      }
    }

    // Fallback: first uncompleted from start (fresh mesocycle or wrap-around)
    for (const entry of allSessions) {
      if (!completedSessionIds.has(entry.session.id)) {
        return entry;
      }
    }

    return null; // All sessions completed
  }, [currentMesocycle, completedSessionIds, workoutLogs]);

  // Current week index (for volume wave highlight)
  const currentWeekIndex = nextUpSession?.weekIndex ?? -1;

  // AI block suggestion (computed from training data)
  const blockSuggestion = useMemo(() => {
    if (!currentMesocycle) return null;
    try {
      return suggestNextBlock({
        user, currentMesocycle, mesocycleHistory,
        workoutLogs, trainingSessions, injuryLog,
        wearableHistory: wearableHistory || [],
        competitions: (competitions || []).map(c => ({ date: new Date(c.date), type: c.type })),
      });
    } catch { return null; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMesocycle?.id, workoutLogs.length]);

  // Fight countdown for combat athletes
  const daysToCompetition = useMemo(() => {
    if (!competitions || competitions.length === 0) return null;
    const now = Date.now();
    const upcoming = competitions
      .filter(c => c.isActive && new Date(c.date).getTime() > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    if (!upcoming) return null;
    return Math.ceil((new Date(upcoming.date).getTime() - now) / (1000 * 60 * 60 * 24));
  }, [competitions]);

  const [expandedWeek, setExpandedWeek] = useState<number | null>(nextUpSession?.weekIndex ?? 0);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [showEmphasisPicker, setShowEmphasisPicker] = useState(false);
  const [blockWeeks, setBlockWeeks] = useState(4);
  const [sessionMinutes, setSessionMinutes] = useState(0); // 0 = no limit
  const [formCheckExercise, setFormCheckExercise] = useState<{ name: string; videoUrl?: string } | null>(null);
  const [undoToast, setUndoToast] = useState<{ oldExerciseId: string; oldExerciseName: string; newExerciseName: string; weekIndex: number; sessionId: string; exerciseIndex: number } | null>(null);

  // Confetti on block completion
  const confettiFiredRef = useRef(false);
  useEffect(() => {
    if (progressStats.percentage >= 100 && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      setTimeout(() => fireConfetti(), 300);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100, 50, 200]);
      }
    }
  }, [progressStats.percentage]);

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

  // New block success flash — shows summary after generation
  const [blockFlash, setBlockFlash] = useState<{ name: string; weeks: number; sessions: number; focus: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
  // Show success flash and scroll to top after block generation
  const showBlockCreatedFlash = () => {
    // Read fresh state — the mesocycle was just generated
    setTimeout(() => {
      const meso = useAppStore.getState().currentMesocycle;
      if (meso) {
        const totalSessions = meso.weeks.reduce((sum, w) => sum + w.sessions.length, 0);
        setBlockFlash({
          name: meso.name,
          weeks: meso.weeks.length,
          sessions: totalSessions,
          focus: meso.goalFocus,
        });
        // Scroll to top so user sees the new "Next Up" card
        containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100);
  };

  // Auto-dismiss block flash
  useEffect(() => {
    if (!blockFlash) return;
    const timer = setTimeout(() => setBlockFlash(null), 4000);
    return () => clearTimeout(timer);
  }, [blockFlash]);

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
        useAppStore.getState().updateUserFields({ sessionsPerWeek });
      }
      generateNewMesocycle(weeks, sessionMinutes);
      showBlockCreatedFlash();
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
      useAppStore.getState().updateUserFields({ sessionsPerWeek });
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
    showBlockCreatedFlash();
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
  };

  const handleUndoSwap = () => {
    if (!undoToast) return;
    swapProgramExercise(undoToast.weekIndex, undoToast.sessionId, undoToast.exerciseIndex, undoToast.oldExerciseId);
    setUndoToast(null);
  };

  // Wizard state
  const [wizardGoal, setWizardGoal] = useState<GoalFocus>('balanced');
  const [wizardDays, setWizardDays] = useState<SessionsPerWeek>(3);

  if (!currentMesocycle) {
    const goalOptions: { value: GoalFocus; label: string; desc: string; icon: typeof Zap }[] = [
      { value: 'strength', label: 'Strength', desc: 'Heavy, low reps', icon: Zap },
      { value: 'hypertrophy', label: 'Muscle', desc: 'Volume, pump', icon: Heart },
      { value: 'balanced', label: 'Both', desc: 'Best of both', icon: Flame },
    ];

    const dayOptions: SessionsPerWeek[] = [2, 3, 4, 5, 6];
    const dayLabels: Record<number, string> = {
      2: 'Full Body', 3: 'Full Body', 4: 'Upper / Lower',
      5: 'Push / Pull / Legs', 6: 'Push / Pull / Legs',
    };

    const handleWizardGenerate = () => {
      const state = useAppStore.getState();
      if (state.user) {
        state.updateUserFields({ sessionsPerWeek: wizardDays, goalFocus: wizardGoal });
      }
      generateNewMesocycle(blockWeeks, sessionMinutes || undefined);
      showBlockCreatedFlash();
    };

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-grappler-50 text-center">Build Your Program</h2>
          <p className="text-sm text-grappler-400 text-center mt-1">Pick a goal, pick your days, go.</p>
        </div>

        {/* Goal */}
        <div>
          <label className="text-xs font-medium text-grappler-400 uppercase tracking-wider mb-2 block px-1">Goal</label>
          <div className="grid grid-cols-3 gap-2">
            {goalOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setWizardGoal(opt.value)}
                className={cn(
                  'card p-3 flex flex-col items-center gap-2 text-center transition-all border',
                  wizardGoal === opt.value ? 'border-primary-500 bg-primary-500/10' : 'border-transparent hover:bg-grappler-700/50'
                )}
              >
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', wizardGoal === opt.value ? 'bg-primary-500/30' : 'bg-grappler-700/50')}>
                  <opt.icon className={cn('w-5 h-5', wizardGoal === opt.value ? 'text-primary-400' : 'text-grappler-400')} />
                </div>
                <div>
                  <p className={cn('text-sm font-semibold', wizardGoal === opt.value ? 'text-grappler-50' : 'text-grappler-200')}>{opt.label}</p>
                  <p className="text-xs text-grappler-400 mt-0.5">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Days per week */}
        <div>
          <label className="text-xs font-medium text-grappler-400 uppercase tracking-wider mb-2 block px-1">Days / Week</label>
          <div className="flex justify-center gap-2">
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
                <span className="text-xs font-normal opacity-70">days</span>
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-grappler-400 mt-2">
            <span className="text-primary-400 font-medium">{dayLabels[wizardDays]}</span> split
          </p>
        </div>

        {/* Generate */}
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
            Customize Muscles
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
      case 'strength_endurance': return Target;
      default: return Zap;
    }
  };

  const getWorkoutTypeColor = (type: WorkoutType) => {
    switch (type) {
      case 'strength': return 'text-red-400 bg-red-500/10';
      case 'hypertrophy': return 'text-purple-400 bg-purple-500/10';
      case 'power': return 'text-blue-400 bg-blue-500/10';
      case 'strength_endurance': return 'text-amber-400 bg-amber-500/10';
      default: return 'text-red-400 bg-red-500/10';
    }
  };

  return (
    <div ref={containerRef} className="space-y-6">
      {/* New Block Created Flash */}
      <AnimatePresence>
        {blockFlash && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onClick={() => setBlockFlash(null)}
            className="card p-4 bg-gradient-to-r from-primary-500/20 to-primary-500/5 border border-primary-500/30 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5 text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-grappler-50 text-sm">{blockFlash.name}</p>
                <p className="text-xs text-grappler-400">
                  {blockFlash.weeks} weeks &middot; {blockFlash.sessions} sessions &middot; {blockFlash.focus} focus
                </p>
              </div>
            </div>
            <p className="text-xs text-primary-400/70 mt-2">Your first session is ready below</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header with Progress Ring */}
      <div className="space-y-4">
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
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-grappler-50 truncate">{currentMesocycle.name}</h2>
            <p className="text-sm text-grappler-400">
              {progressStats.completed}/{progressStats.total} sessions • {currentMesocycle.goalFocus} focus
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowEmphasisPicker(true)}
          className="btn btn-secondary btn-sm gap-2 w-full"
        >
          <SlidersHorizontal className="w-4 h-4" />
          New Block
        </button>
      </div>

      {/* Block Timeline — training journey across mesocycles */}
      {(mesocycleHistory.length > 0 || blockSuggestion) && (
        <BlockTimeline
          history={mesocycleHistory}
          current={currentMesocycle}
          suggestion={blockSuggestion}
          currentProgress={progressStats.percentage}
          daysToCompetition={daysToCompetition}
          onAcceptSuggestion={() => setShowEmphasisPicker(true)}
        />
      )}

      {/* Volume Wave — visual arc of current block */}
      {currentMesocycle.weeks.length >= 2 && (
        <VolumeWave
          weeks={currentMesocycle.weeks}
          currentWeekIndex={currentWeekIndex}
          completedSessionIds={completedSessionIds}
        />
      )}

      {/* Next Up Hero Card — minimal, CTA-first */}
      {nextUpSession ? (() => {
        const { session, weekNumber } = nextUpSession;
        const TypeIcon = getWorkoutTypeIcon(session.type);
        const typeColor = getWorkoutTypeColor(session.type);
        const typeBg = session.type === 'strength' ? 'from-red-500/20 to-red-900/10 border-red-500/30'
          : session.type === 'hypertrophy' ? 'from-purple-500/20 to-purple-900/10 border-purple-500/30'
          : 'from-blue-500/20 to-blue-900/10 border-blue-500/30';
        const heroIntensity = session.type === 'strength' ? 'Heavy' : session.type === 'power' ? 'Explosive' : 'Moderate';
        const heroIntensityColor = session.type === 'strength' ? 'text-red-400' : session.type === 'power' ? 'text-blue-400' : 'text-purple-400';
        const muscleGroups = Array.from(new Set(session.exercises.flatMap(ex => ex.exercise.primaryMuscles || []).filter(Boolean)));
        return (
          <div className={cn('card p-5 bg-gradient-to-br border', typeBg)}>
            <div className="flex items-center gap-3 mb-4">
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', typeColor)}>
                <TypeIcon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-bold text-grappler-50 text-lg truncate">{session.name}</h3>
                  <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0', heroIntensityColor, `${session.type === 'strength' ? 'bg-red-500/15' : session.type === 'power' ? 'bg-blue-500/15' : 'bg-purple-500/15'}`)}>{heroIntensity}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-grappler-400">
                  <span>Week {weekNumber}</span>
                  <span className="flex items-center gap-1"><Dumbbell className="w-3 h-3" />{session.exercises.length}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{session.estimatedDuration}m</span>
                  {muscleGroups.length > 0 && (
                    <span className="truncate">{muscleGroups.slice(0, 3).map(mg => mg.replace(/_/g, ' ')).join(' · ')}</span>
                  )}
                </div>
              </div>
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
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-5 text-center border border-green-500/30 bg-gradient-to-b from-green-500/10 to-green-500/[0.02]"
        >
          <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Check className="w-7 h-7 text-green-400" />
          </div>
          <h3 className="font-bold text-grappler-100 text-lg mb-1">Block Complete!</h3>
          <p className="text-sm text-grappler-400 mb-1">All {progressStats.total} sessions finished.</p>
          <p className="text-xs text-grappler-400 mb-4">Great work — time to level up with the next block.</p>
          <button
            onClick={() => setShowEmphasisPicker(true)}
            className="btn btn-primary btn-sm gap-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Generate Next Block
          </button>
        </motion.div>
      )}

      {/* Week Pills — always visible */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-1 py-1">
          {currentMesocycle.weeks.map((week, weekIndex) => {
            const completedCount = week.sessions.filter(s => completedSessionIds.has(s.id)).length;
            const allDone = completedCount === week.sessions.length;
            return (
              <button
                key={weekIndex}
                onClick={() => setExpandedWeek(expandedWeek === weekIndex ? null : weekIndex)}
                className={cn(
                  'flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap',
                  expandedWeek === weekIndex
                    ? week.isDeload
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                      : 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                    : allDone
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-grappler-800 text-grappler-300 hover:bg-grappler-700'
                )}
              >
                W{week.weekNumber}
                {week.isDeload && ' 🟢'}
                <span className="ml-1.5 text-xs opacity-75">{completedCount}/{week.sessions.length}</span>
              </button>
            );
          })}
        </div>

        {/* Selected week sessions */}
        <AnimatePresence>
          {expandedWeek !== null && currentMesocycle.weeks[expandedWeek] && (
            <motion.div
              key={expandedWeek}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
                {currentMesocycle.weeks[expandedWeek].sessions.map((session) => {
                  const Icon = getWorkoutTypeIcon(session.type);
                  const colorClass = getWorkoutTypeColor(session.type);
                  const isSessionExpanded = expandedSession === session.id;
                  const isCompleted = completedSessionIds.has(session.id);
                  const intensityLabel = session.type === 'strength' ? 'Heavy' : session.type === 'power' ? 'Explosive' : 'Moderate';
                  const intensityColor = session.type === 'strength' ? 'text-red-400 bg-red-500/10' : session.type === 'power' ? 'text-blue-400 bg-blue-500/10' : 'text-purple-400 bg-purple-500/10';

                  return (
                    <div key={session.id} className={cn('card overflow-hidden', isCompleted && 'opacity-60')}>
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
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-grappler-100 truncate">{session.name}{isCompleted ? ' (Done)' : ''}</h4>
                              <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0', intensityColor)}>
                                {intensityLabel}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-grappler-400">
                              <span className="flex items-center gap-1"><Dumbbell className="w-3 h-3" />{session.exercises.length}</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{session.estimatedDuration}m</span>
                            </div>
                            {!isSessionExpanded && (
                              <p className="text-xs text-grappler-400 mt-1 truncate">
                                {session.exercises.slice(0, 3).map(ex => ex.exercise.name).join(' · ')}
                                {session.exercises.length > 3 ? ` +${session.exercises.length - 3}` : ''}
                              </p>
                            )}
                          </div>
                        </button>
                        <button
                          onClick={() => startWorkout(session)}
                          className="btn btn-primary btn-sm gap-1 flex-shrink-0"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Start
                        </button>
                        <button
                          onClick={() => setExpandedSession(isSessionExpanded ? null : session.id)}
                          className="p-1.5 flex-shrink-0"
                        >
                          {isSessionExpanded ? <ChevronUp className="w-4 h-4 text-grappler-400" /> : <ChevronDown className="w-4 h-4 text-grappler-400" />}
                        </button>
                      </div>

                      {isSessionExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="border-t border-grappler-700 p-4"
                        >
                          <div className="space-y-2">
                            {session.exercises.map((ex, i) => (
                              <ExerciseCard
                                key={`${session.id}-${i}-${ex.exerciseId}`}
                                exercise={ex}
                                index={i}
                                weekIndex={expandedWeek}
                                sessionId={session.id}
                                onSwap={handleSwapExercise}
                                userEquipment={user?.equipment || 'full_gym'}
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/* AI Coach — next block recommendation */}
      {blockSuggestion && (
        progressStats.percentage >= 100 ? (
          // Full analysis when block is done
          <AICoachInsight
            suggestion={blockSuggestion}
            onAccept={() => setShowEmphasisPicker(true)}
          />
        ) : progressStats.percentage >= 60 ? (
          // Compact preview as they approach completion
          <AICoachInsight
            suggestion={blockSuggestion}
            onAccept={() => setShowEmphasisPicker(true)}
            compact
          />
        ) : null
      )}

      {/* Muscle Emphasis Picker (New Block config) */}
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

      {/* Form Check Video Modal (from hero card / preview) */}
      {formCheckExercise && (
        <YouTubeEmbed
          exerciseName={formCheckExercise.name}
          videoUrl={formCheckExercise.videoUrl}
          onClose={() => setFormCheckExercise(null)}
        />
      )}

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
              role="dialog"
              aria-modal="true"
              aria-label="Import workout progress"
              onClick={() => {
                setShowMigrateDialog(false);
                setPendingGeneration(null);
                setPreviousMesocycleId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setShowMigrateDialog(false);
                  setPendingGeneration(null);
                  setPreviousMesocycleId(null);
                }
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

      {/* Block Duration + Time Limit — compact row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs font-medium text-grappler-400 mb-2 block">Block Length</label>
          <div className="flex gap-1.5">
            {[4, 6, 8].map((w) => (
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
        </div>
        <div>
          <label className="text-xs font-medium text-grappler-400 mb-2 block">Time Cap</label>
          <div className="flex gap-1.5">
            {[
              { value: 0, label: 'None' },
              { value: 60, label: '60m' },
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
        </div>
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
  const [showFormVideo, setShowFormVideo] = useState(false);
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
                <p className="text-xs text-grappler-400">
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
                <p className="text-xs text-grappler-400">
                  ~{ex.prescription.percentageOf1RM}% 1RM
                </p>
              )}
            </div>
            <button
              onClick={() => setShowFormVideo(true)}
              className="p-1.5 rounded-lg transition-colors text-grappler-500 hover:text-primary-300 hover:bg-primary-500/15"
              title="Check form"
            >
              <Video className="w-3.5 h-3.5" />
            </button>
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
              <p className="text-xs text-grappler-400 mb-2">
                Sorted by match score — how well each exercise replaces the current one
              </p>
              {alternatives.length === 0 ? (
                <p className="text-xs text-grappler-400 py-2">No alternatives found for your equipment.</p>
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
                        <p className="text-xs text-grappler-400 mt-1">
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

      {/* Form Check Video Modal */}
      {showFormVideo && (
        <YouTubeEmbed
          exerciseName={ex.exercise.name}
          videoUrl={ex.exercise.videoUrl}
          onClose={() => setShowFormVideo(false)}
        />
      )}
    </div>
  );
}


