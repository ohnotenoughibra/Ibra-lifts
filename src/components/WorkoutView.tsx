'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import {
  Dumbbell,
  Clock,
  Play,
  Zap,
  Heart,
  Flame,
  RefreshCw,
  X,
  Check,
  TrendingUp,
  TrendingDown,
  History,
  Undo2,
  ChevronRight,
  Target,
  Activity,
  Layers,
  ListPlus,
  Sparkles,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkoutType, MuscleGroupConfig, MuscleEmphasis, SessionsPerWeek } from '@/lib/types';
import { fireConfetti } from '@/lib/confetti';
import { suggestNextBlock, getBlockSuggestionSummary } from '@/lib/block-suggestion';
import BlockComposer, { BlockConfig, FOCUS_QUEUE_LABELS } from './BlockComposer';
import ScheduleSheet from './ScheduleSheet';
import BlockManagerSheet from './BlockManagerSheet';
import { getWorkoutTypeUI } from './workout-type-ui';
import { getCompletedSessionIds, getNextSession } from '@/lib/session-matching';
import { useToast } from './Toast';

/**
 * Train tab — today-first.
 *
 * The screen answers ONE question — "what am I doing today?" — with a single
 * primary action. Everything else lives exactly one tap away:
 *  - Block strip → ScheduleSheet (full program, exercise editing, weeks)
 *  - Blocks button / queue row → BlockManagerSheet (complete/stop/switch/queue/history)
 *  - New Block → BlockComposer
 */
export default function WorkoutView() {
  const {
    currentMesocycle, startWorkout, generateNewMesocycle, muscleEmphasis, setMuscleEmphasis,
    rawWorkoutLogs, swapProgramExercise, user, rawMesocycleHistory, trainingSessions, injuryLog,
    wearableHistory, competitions, mesocycleQueue, undoBlockAction, addToMesocycleQueue,
    advanceMesocycleQueue, activeWorkout, workoutMinimized, resumeWorkout,
  } = useAppStore(
    // Only stable references in the selector — a .filter() here would return a
    // fresh array every evaluation, defeat useShallow, and re-render the whole
    // Train tab on every store update. Derive filtered views below with useMemo.
    useShallow(s => ({
      currentMesocycle: s.currentMesocycle, startWorkout: s.startWorkout,
      generateNewMesocycle: s.generateNewMesocycle,
      muscleEmphasis: s.muscleEmphasis, setMuscleEmphasis: s.setMuscleEmphasis,
      rawWorkoutLogs: s.workoutLogs, swapProgramExercise: s.swapProgramExercise, user: s.user,
      rawMesocycleHistory: s.mesocycleHistory,
      trainingSessions: s.trainingSessions, injuryLog: s.injuryLog,
      wearableHistory: s.wearableHistory, competitions: s.competitions,
      mesocycleQueue: s.mesocycleQueue, undoBlockAction: s.undoBlockAction,
      addToMesocycleQueue: s.addToMesocycleQueue, advanceMesocycleQueue: s.advanceMesocycleQueue,
      activeWorkout: s.activeWorkout, workoutMinimized: s.workoutMinimized,
      resumeWorkout: s.resumeWorkout,
    }))
  );

  const mesocycleHistory = useMemo(
    () => rawMesocycleHistory.filter(m => !m._deleted),
    [rawMesocycleHistory]
  );
  // Tombstoned workouts must not mark sessions complete or claim "done for today"
  const workoutLogs = useMemo(
    () => rawWorkoutLogs.filter(l => !l._deleted),
    [rawWorkoutLogs]
  );

  const { showToast } = useToast();

  // Position-based session matching — survives UUID changes from regeneration/sync/migration
  const completedSessionIds = useMemo(
    () => getCompletedSessionIds(currentMesocycle, workoutLogs),
    [currentMesocycle, workoutLogs]
  );

  const progressStats = useMemo(() => {
    if (!currentMesocycle) return { total: 0, completed: 0, percentage: 0 };
    const total = currentMesocycle.weeks.reduce((sum, week) => sum + week.sessions.length, 0);
    const completed = currentMesocycle.weeks.reduce((sum, w) =>
      sum + w.sessions.filter(s => completedSessionIds.has(s.id)).length, 0
    );
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  }, [currentMesocycle, completedSessionIds]);

  const nextUpSession = useMemo(() => {
    if (!currentMesocycle) return null;
    const next = getNextSession(currentMesocycle, workoutLogs);
    if (!next) return null;
    const weekIndex = currentMesocycle.weeks.findIndex(w => w.weekNumber === next.weekNumber);
    return { session: next.session, weekIndex, weekNumber: next.weekNumber };
  }, [currentMesocycle, workoutLogs]);

  const currentWeekIndex = nextUpSession?.weekIndex ?? -1;

  // Sorted once for the block strip — not inline in JSX on every render
  const sortedWeeks = useMemo(
    () => (currentMesocycle ? [...currentMesocycle.weeks].sort((a, b) => a.weekNumber - b.weekNumber) : []),
    [currentMesocycle]
  );

  // Already trained today? Then today's job is done — rest is part of the program.
  const trainedToday = useMemo(() => {
    if (!currentMesocycle) return false;
    const today = new Date().toDateString();
    return workoutLogs.some(l => l.mesocycleId === currentMesocycle.id && new Date(l.date).toDateString() === today);
  }, [currentMesocycle, workoutLogs]);

  const blockSuggestion = useMemo(() => {
    if (!currentMesocycle) return null;
    try {
      return suggestNextBlock({
        user, currentMesocycle, mesocycleHistory,
        workoutLogs, trainingSessions, injuryLog,
        wearableHistory: wearableHistory || [],
        competitions: (competitions || []).map(c => ({ date: new Date(c.date), type: c.type })),
        mesocycleQueue,
      });
    } catch { return null; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMesocycle?.id, workoutLogs.length, mesocycleQueue]);

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

  // --- UI state: one sheet at a time ---
  const [showComposer, setShowComposer] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [showEmphasisPicker, setShowEmphasisPicker] = useState(false);
  const [blockWeeks, setBlockWeeks] = useState(4);
  const [sessionMinutes, setSessionMinutes] = useState(0); // 0 = no limit
  const [undoToast, setUndoToast] = useState<{ oldExerciseId: string; oldExerciseName: string; newExerciseName: string; weekIndex: number; sessionId: string; exerciseIndex: number } | null>(null);
  // entryId pins the toast to ONE undo entry — a lingering toast can never pop
  // a newer, unrelated action off the stack
  const [blockToast, setBlockToast] = useState<{ label: string; entryId?: number } | null>(null);

  // Confetti on block completion — once per block, re-armed when a new block starts
  const confettiFiredRef = useRef(false);
  useEffect(() => {
    confettiFiredRef.current = false;
  }, [currentMesocycle?.id]);
  useEffect(() => {
    if (progressStats.percentage >= 100 && !confettiFiredRef.current) {
      confettiFiredRef.current = true;
      setTimeout(() => fireConfetti(), 300);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100, 50, 200]);
      }
    }
  }, [progressStats.percentage]);

  // Auto-dismiss toasts
  useEffect(() => {
    if (!undoToast) return;
    const timer = setTimeout(() => setUndoToast(null), 5000);
    return () => clearTimeout(timer);
  }, [undoToast]);

  useEffect(() => {
    if (!blockToast) return;
    const timer = setTimeout(() => setBlockToast(null), 8000);
    return () => clearTimeout(timer);
  }, [blockToast]);

  // Show the undo toast bound to the entry the action just pushed
  const showBlockActionToast = (label: string) => {
    const top = useAppStore.getState().blockUndoStack.at(-1);
    setBlockToast({ label, entryId: top?.id });
  };

  const handleUndoBlockAction = (entryId?: number) => {
    const label = undoBlockAction(entryId);
    setBlockToast(null);
    if (label) showToast(`Undone: ${label}`, 'success');
  };

  // --- Migration dialog state (kept verbatim — protects workout logs on regeneration) ---
  const [showMigrateDialog, setShowMigrateDialog] = useState(false);
  const [pendingGeneration, setPendingGeneration] = useState<{ weeks: number; sessionMinutes?: number; sessionsPerWeek?: SessionsPerWeek; periodization?: 'linear' | 'undulating' | 'block' | 'conjugate' } | null>(null);
  const [previousMesocycleId, setPreviousMesocycleId] = useState<string | null>(null);

  // New block created modal — shows overview after generation
  const [blockFlash, setBlockFlash] = useState<{
    name: string; weeks: number; sessions: number; focus: string;
    split: string; deloadWeek: number | null; sessionsPerWeek: number;
    firstSessionName: string | null; deloadSkipped: boolean;
    entryId?: number; // pins the modal's Undo to the generation's own undo entry
  } | null>(null);

  // Counts feed the migrate dialog's type tiles (strength/hypertrophy/power) + total
  const getWorkoutBreakdown = () => {
    const state = useAppStore.getState();
    const { currentMesocycle: meso, workoutLogs: logs } = state;
    if (!meso) return { total: 0, strength: 0, hypertrophy: 0, power: 0 };

    const mesoLogs = logs.filter(log => !log._deleted && log.mesocycleId === meso.id);
    const breakdown = { total: mesoLogs.length, strength: 0, hypertrophy: 0, power: 0 };

    mesoLogs.forEach(log => {
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

  const showBlockCreatedFlash = () => {
    setTimeout(() => {
      const state = useAppStore.getState();
      const meso = state.currentMesocycle;
      const entryId = state.blockUndoStack.at(-1)?.id;
      if (meso) {
        const totalSessions = meso.weeks.reduce((sum, w) => sum + w.sessions.length, 0);
        const deloadWeek = meso.weeks.find(w => w.isDeload);
        const sessionsPerWeek = meso.weeks[0]?.sessions?.length || 0;
        const firstSession = meso.weeks[0]?.sessions?.[0];
        setBlockFlash({
          name: meso.name,
          weeks: meso.weeks.length,
          sessions: totalSessions,
          focus: meso.goalFocus,
          split: meso.splitType,
          deloadWeek: deloadWeek ? deloadWeek.weekNumber : null,
          sessionsPerWeek,
          firstSessionName: firstSession?.name || null,
          deloadSkipped: !deloadWeek,
          entryId,
        });
      }
    }, 100);
  };

  const handleGenerateWithMigrationCheck = (weeks: number, mins?: number, sessionsPerWeek?: SessionsPerWeek, periodization?: 'linear' | 'undulating' | 'block' | 'conjugate') => {
    const state = useAppStore.getState();
    const currentLogCount = state.getCurrentMesocycleLogCount();
    const importable = state.getImportableWorkoutLogs();
    const activeMesocycle = state.currentMesocycle;

    const hasWorkoutsToMigrate = currentLogCount > 0 || importable.importable.length > 0;

    if (hasWorkoutsToMigrate) {
      setPreviousMesocycleId(activeMesocycle?.id || null);
      setPendingGeneration({ weeks, sessionMinutes: mins, sessionsPerWeek, periodization });
      setShowMigrateDialog(true);
    } else {
      if (sessionsPerWeek && user) {
        useAppStore.getState().updateUserFields({ sessionsPerWeek });
      }
      generateNewMesocycle(weeks, mins, periodization);
      showBlockCreatedFlash();
    }
  };

  const handleMigrateResponse = (shouldMigrate: boolean, importFromHistory: boolean = false) => {
    if (!pendingGeneration) return;

    const { weeks, sessionMinutes: mins, sessionsPerWeek, periodization } = pendingGeneration;
    const oldMesocycleId = previousMesocycleId;

    const importableLogs = importFromHistory
      ? useAppStore.getState().getImportableWorkoutLogs().importable
      : [];

    if (sessionsPerWeek && user) {
      useAppStore.getState().updateUserFields({ sessionsPerWeek });
    }

    generateNewMesocycle(weeks, mins, periodization);

    setTimeout(() => {
      const state = useAppStore.getState();
      const newMesocycle = state.currentMesocycle;

      if (newMesocycle) {
        if (shouldMigrate && oldMesocycleId) {
          state.migrateWorkoutLogsToMesocycle(oldMesocycleId, newMesocycle.id);
        }
        if (importFromHistory && importableLogs.length > 0) {
          state.importWorkoutLogsToCurrentMesocycle(importableLogs.map(l => l.id));
        }
      }
    }, 0);

    setShowMigrateDialog(false);
    setPendingGeneration(null);
    setPreviousMesocycleId(null);
    showBlockCreatedFlash();
  };

  // When the picker was opened from the composer, generate with the composer's
  // full config (focus/days/wave/weeks) — not the picker-local defaults. Without
  // this, "Muscles" silently discarded everything the user just chose.
  const composerCfgRef = useRef<BlockConfig | null>(null);

  const handleGenerateWithEmphasis = () => {
    setShowEmphasisPicker(false);
    const cfg = composerCfgRef.current;
    composerCfgRef.current = null;
    if (cfg) {
      handleComposerStart(cfg);
    } else {
      handleGenerateWithMigrationCheck(blockWeeks, sessionMinutes || undefined);
    }
  };

  // Exercise swap with undo (passed down to ScheduleSheet)
  const handleSwapExercise = (weekIndex: number, sessionId: string, exerciseIndex: number, newExerciseId: string) => {
    const oldExercise = currentMesocycle?.weeks[weekIndex]?.sessions
      ?.find(s => s.id === sessionId)?.exercises?.[exerciseIndex];
    const oldExerciseId = oldExercise?.exerciseId || '';
    const oldExerciseName = oldExercise?.exercise?.name || 'exercise';

    swapProgramExercise(weekIndex, sessionId, exerciseIndex, newExerciseId);

    const newExName = useAppStore.getState().currentMesocycle?.weeks[weekIndex]?.sessions
      .find(s => s.id === sessionId)?.exercises[exerciseIndex]?.exercise?.name || 'exercise';

    setUndoToast({ oldExerciseId, oldExerciseName, newExerciseName: newExName, weekIndex, sessionId, exerciseIndex });
  };

  const handleUndoSwap = () => {
    if (!undoToast) return;
    swapProgramExercise(undoToast.weekIndex, undoToast.sessionId, undoToast.exerciseIndex, undoToast.oldExerciseId);
    setUndoToast(null);
  };

  // Block Composer handlers — shared by the empty state and the in-block sheet
  const handleComposerStart = (cfg: BlockConfig) => {
    const state = useAppStore.getState();
    if (state.user) {
      // goalFocus only — sessionsPerWeek is written by the generation path itself
      state.updateUserFields({ goalFocus: cfg.focus });
    }
    setShowComposer(false);
    handleGenerateWithMigrationCheck(cfg.weeks, cfg.sessionMinutes || undefined, cfg.days, cfg.periodization);
  };

  const handleComposerQueue = (cfg: BlockConfig) => {
    addToMesocycleQueue({
      name: `${FOCUS_QUEUE_LABELS[cfg.focus] || 'Training'} Block`,
      focus: cfg.focus,
      weeks: cfg.weeks,
      periodization: cfg.periodization,
      sessionsPerWeek: cfg.days,
      sessionDurationMinutes: cfg.sessionMinutes || undefined,
    });
    setShowComposer(false);
    showToast('Added to queue — starts after this block', 'success');
  };

  const handleStartSession = (session: NonNullable<typeof nextUpSession>['session']) => {
    if (startWorkout(session) === false) {
      showToast('Finish your current workout first', 'warning');
    }
  };

  // Undo toast for block-level actions — rendered in both empty and active states
  const blockUndoToast = (
    <AnimatePresence>
      {blockToast && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="fixed bottom-24 left-4 right-4 z-[60] mx-auto max-w-sm flex items-center justify-between gap-3 rounded-xl bg-grappler-800 border border-grappler-600 px-4 py-3 shadow-2xl"
          role="status"
        >
          <span className="text-sm font-medium text-grappler-100">{blockToast.label}</span>
          <button
            onClick={() => handleUndoBlockAction(blockToast.entryId)}
            className="btn btn-ghost btn-sm gap-1.5 font-bold text-amber-400 hover:text-amber-300 flex-shrink-0"
          >
            <Undo2 className="w-4 h-4" />
            Undo
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Shared sheets — rendered in both empty and active states
  const sheets = (
    <>
      <AnimatePresence>
        {showManager && (
          <BlockManagerSheet
            progress={progressStats}
            onClose={() => setShowManager(false)}
            onNewBlock={() => { setShowManager(false); setShowComposer(true); }}
            onBlockAction={showBlockActionToast}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showComposer && (
          <BlockComposer
            mode="sheet"
            onClose={() => setShowComposer(false)}
            onStart={handleComposerStart}
            onQueue={handleComposerQueue}
            onCustomizeMuscles={(cfg) => { composerCfgRef.current = cfg; setShowComposer(false); setShowEmphasisPicker(true); }}
            defaultFocus={user?.goalFocus}
            defaultDays={user?.sessionsPerWeek}
          />
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

      {blockUndoToast}
    </>
  );

  // ============ EMPTY STATE — no active block ============
  if (!currentMesocycle) {
    return (
      <div className="space-y-6">
        {/* Queued blocks — start the next one with one tap */}
        {mesocycleQueue.length > 0 && (
          <div className="card p-4 border border-primary-500/30 bg-primary-500/5">
            <div className="flex items-center gap-2 mb-2">
              <ListPlus className="w-4 h-4 text-primary-400" />
              <h3 className="text-sm font-bold text-grappler-100">Up Next in Queue</h3>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-grappler-50 truncate">{mesocycleQueue[0].name}</p>
                <p className="text-xs text-grappler-400">
                  {mesocycleQueue[0].weeks} weeks · {mesocycleQueue[0].focus.replace(/_/g, ' ')}
                  {mesocycleQueue.length > 1 && ` · +${mesocycleQueue.length - 1} more queued`}
                </p>
              </div>
              <button
                onClick={() => {
                  advanceMesocycleQueue();
                  showBlockActionToast('Queued block started');
                  showBlockCreatedFlash();
                }}
                className="btn btn-primary btn-sm gap-1.5 flex-shrink-0"
              >
                <Play className="w-3.5 h-3.5" />
                Start
              </button>
            </div>
          </div>
        )}

        <BlockComposer
          mode="empty"
          onStart={handleComposerStart}
          onQueue={handleComposerQueue}
          onCustomizeMuscles={(cfg) => { composerCfgRef.current = cfg; setShowEmphasisPicker(true); }}
          defaultFocus={user?.goalFocus}
          defaultDays={user?.sessionsPerWeek}
        />

        {mesocycleHistory.length > 0 && (
          <button
            onClick={() => setShowManager(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-grappler-400 hover:text-grappler-200"
            data-tight
          >
            <History className="w-4 h-4" />
            Past blocks ({mesocycleHistory.length})
          </button>
        )}

        {blockFlashModal()}
        {sheets}
      </div>
    );
  }

  // ============ ACTIVE STATE — today first ============

  const currentWeekNumber = nextUpSession?.weekNumber ?? currentMesocycle.weeks.length;

  return (
    <div className="space-y-4">
      {/* ── 1. TODAY ── */}
      {activeWorkout && workoutMinimized ? (
        // A workout is paused — resuming beats starting anything new
        <div className="card p-5 bg-gradient-to-br from-amber-500/20 to-amber-900/10 border border-amber-500/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Activity className="w-6 h-6 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-grappler-50 text-lg truncate">{activeWorkout.session.name}</h3>
              <p className="text-xs text-grappler-400">Workout in progress — pick up where you left off</p>
            </div>
          </div>
          <button onClick={resumeWorkout} className="btn btn-primary btn-md w-full gap-2 font-semibold">
            <Play className="w-4 h-4" />
            Resume Workout
          </button>
        </div>
      ) : progressStats.percentage >= 100 ? (
        // Block done — celebrate, then one tap into what's next
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-5 text-center border border-green-500/30 bg-gradient-to-b from-green-500/10 to-green-500/[0.02]"
        >
          <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Check className="w-7 h-7 text-green-400" />
          </div>
          <h3 className="font-bold text-grappler-100 text-lg mb-1">Block Complete!</h3>
          <p className="text-sm text-grappler-400 mb-4">All {progressStats.total} sessions finished. Time to level up.</p>
          {mesocycleQueue.length > 0 ? (
            <button
              onClick={() => { setShowManager(true); }}
              className="btn btn-primary btn-sm gap-2"
            >
              <Play className="w-4 h-4" />
              Start {mesocycleQueue[0].name}
            </button>
          ) : (
            <button onClick={() => setShowComposer(true)} className="btn btn-primary btn-sm gap-2">
              <Plus className="w-4 h-4" />
              Build Next Block
            </button>
          )}
        </motion.div>
      ) : trainedToday && nextUpSession ? (
        // Trained today — today's job is done; show what's coming
        <div className="card p-5 border border-green-500/25 bg-gradient-to-br from-green-500/10 to-green-500/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <Check className="w-6 h-6 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-grappler-50 text-lg">Done for today</h3>
              <p className="text-xs text-grappler-400 truncate">
                Up next: <span className="text-grappler-200 font-medium">{nextUpSession.session.name}</span> · Week {nextUpSession.weekNumber}
              </p>
            </div>
            <button
              onClick={() => handleStartSession(nextUpSession.session)}
              className="btn btn-ghost btn-sm gap-1 text-grappler-400 hover:text-grappler-200 flex-shrink-0"
              data-tight
            >
              <Play className="w-3.5 h-3.5" />
              Train anyway
            </button>
          </div>
        </div>
      ) : nextUpSession ? (
        // The main event: today's session, one big button
        (() => {
          const { session, weekNumber } = nextUpSession;
          const typeUI = getWorkoutTypeUI(session.type);
          const TypeIcon = typeUI.icon;
          const exerciseNames = session.exercises.slice(0, 3).map(ex => ex.exercise?.name).filter(Boolean);
          return (
            <div className={cn('card p-5 bg-gradient-to-br border', typeUI.heroBg)}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-grappler-400 mb-2">Today</p>
              <div className="flex items-center gap-3 mb-3">
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', typeUI.color)}>
                  <TypeIcon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold text-grappler-50 text-lg truncate">{session.name}</h3>
                    <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0', typeUI.intensityColor, typeUI.intensityBg)}>{typeUI.intensity}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-grappler-400">
                    <span>Week {weekNumber}</span>
                    <span className="flex items-center gap-1"><Dumbbell className="w-3 h-3" />{session.exercises.length}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{session.estimatedDuration}m</span>
                  </div>
                </div>
              </div>
              {exerciseNames.length > 0 && (
                <p className="text-xs text-grappler-400 mb-4 truncate">
                  {exerciseNames.join(' · ')}
                  {session.exercises.length > 3 ? ` +${session.exercises.length - 3} more` : ''}
                </p>
              )}
              <button
                onClick={() => handleStartSession(session)}
                className="btn btn-primary btn-md w-full gap-2 font-semibold"
              >
                <Play className="w-4 h-4" />
                Start Workout
              </button>
            </div>
          );
        })()
      ) : null}

      {/* ── 2. THE BLOCK — one strip, tap for everything ── */}
      <button
        onClick={() => setShowSchedule(true)}
        className="card p-4 w-full text-left hover:bg-grappler-800/70 transition-colors"
        aria-label="Open full block schedule"
      >
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <p className="text-sm font-bold text-grappler-50 truncate">{currentMesocycle.name}</p>
          <div className="flex items-center gap-2 flex-shrink-0">
            {daysToCompetition !== null && daysToCompetition <= 70 && (
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                {daysToCompetition}d to fight
              </span>
            )}
            <span className="text-xs text-grappler-400">Week {currentWeekNumber} of {currentMesocycle.weeks.length}</span>
            <ChevronRight className="w-4 h-4 text-grappler-500" />
          </div>
        </div>
        {/* Segmented per-week progress bar */}
        <div className="flex gap-1">
          {sortedWeeks.map((week, i) => {
            const done = week.sessions.filter(s => completedSessionIds.has(s.id)).length;
            const frac = week.sessions.length > 0 ? done / week.sessions.length : 0;
            return (
              <div key={week.weekNumber} className="flex-1 h-1.5 rounded-full bg-grappler-700 overflow-hidden">
                <div
                  className={cn('h-full rounded-full', week.isDeload ? 'bg-teal-400' : i === currentWeekIndex ? 'bg-primary-400' : 'bg-green-500')}
                  style={{ width: `${frac * 100}%` }}
                />
              </div>
            );
          })}
        </div>
        <p className="text-xs text-grappler-400 mt-2">
          {progressStats.completed}/{progressStats.total} sessions · <span className="capitalize">{currentMesocycle.goalFocus.replace(/_/g, ' ')}</span> · tap for full schedule
        </p>
      </button>

      {/* ── 3. UP NEXT — queued block, one row ── */}
      {mesocycleQueue.length > 0 && (
        <button
          onClick={() => setShowManager(true)}
          className="card p-3 w-full flex items-center gap-3 text-left hover:bg-grappler-800/70 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-grappler-800 flex items-center justify-center flex-shrink-0">
            <ListPlus className="w-4 h-4 text-grappler-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-grappler-500">After this block</p>
            <p className="text-sm font-semibold text-grappler-200 truncate">
              {mesocycleQueue[0].name} · {mesocycleQueue[0].weeks}w
              {mesocycleQueue.length > 1 && ` · +${mesocycleQueue.length - 1} more`}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-grappler-500 flex-shrink-0" />
        </button>
      )}

      {/* ── 4. COACH — one line, only when the block is winding down ── */}
      {blockSuggestion && !blockSuggestion.isFromQueue && progressStats.percentage >= 60 && mesocycleQueue.length === 0 && (
        <button
          onClick={() => setShowComposer(true)}
          className="card p-3 w-full flex items-center gap-3 text-left border border-accent-500/20 hover:bg-grappler-800/70 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-accent-500/15 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-accent-400" />
          </div>
          <p className="flex-1 text-xs text-grappler-300 min-w-0">{getBlockSuggestionSummary(blockSuggestion)}</p>
          <ChevronRight className="w-4 h-4 text-grappler-500 flex-shrink-0" />
        </button>
      )}

      {/* ── 5. FOOTER — block lifecycle, one tap away ── */}
      <div className="flex gap-2">
        <button onClick={() => setShowManager(true)} className="btn btn-secondary btn-sm gap-2 flex-1">
          <Layers className="w-4 h-4" />
          Blocks
        </button>
        <button onClick={() => setShowComposer(true)} className="btn btn-secondary btn-sm gap-2 flex-1">
          <Plus className="w-4 h-4" />
          New Block
        </button>
      </div>

      {/* ── Sheets & modals ── */}
      <AnimatePresence>
        {showSchedule && (
          <ScheduleSheet
            mesocycle={currentMesocycle}
            completedSessionIds={completedSessionIds}
            currentWeekIndex={currentWeekIndex}
            onClose={() => setShowSchedule(false)}
            onSwap={handleSwapExercise}
            onBlockAction={showBlockActionToast}
          />
        )}
      </AnimatePresence>

      {blockFlashModal()}
      {migrateDialog()}
      {sheets}

      {/* Undo Swap Toast */}
      <AnimatePresence>
        {undoToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-4 right-4 z-[60] flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-grappler-800 border border-grappler-600 shadow-xl"
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
    </div>
  );

  // --- Inline modal renderers (function declarations are hoisted; JSX above can call them) ---

  function blockFlashModal() {
    return (
      <AnimatePresence>
        {blockFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60"
            onClick={() => setBlockFlash(null)}
            role="dialog"
            aria-modal="true"
            aria-label="New block created"
            onKeyDown={e => { if (e.key === 'Escape') setBlockFlash(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-lg bg-grappler-900 border border-grappler-700 overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="bg-gradient-to-br from-primary-500/20 to-primary-500/5 p-5 text-center border-b border-grappler-800">
                <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6 text-primary-400" />
                </div>
                <h2 className="text-lg font-bold text-grappler-50">{blockFlash!.name}</h2>
                <p className="text-xs text-grappler-400 mt-1">New training block generated</p>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-px bg-grappler-800 mx-4 mt-4 rounded-xl overflow-hidden">
                <div className="bg-grappler-900 p-3 text-center">
                  <p className="text-lg font-black text-grappler-100">{blockFlash!.weeks}</p>
                  <p className="text-[10px] text-grappler-500 uppercase">Weeks</p>
                </div>
                <div className="bg-grappler-900 p-3 text-center">
                  <p className="text-lg font-black text-grappler-100">{blockFlash!.sessionsPerWeek}</p>
                  <p className="text-[10px] text-grappler-500 uppercase">Days/Week</p>
                </div>
                <div className="bg-grappler-900 p-3 text-center">
                  <p className="text-lg font-black text-grappler-100 capitalize">{blockFlash!.focus}</p>
                  <p className="text-[10px] text-grappler-500 uppercase">Focus</p>
                </div>
                <div className="bg-grappler-900 p-3 text-center">
                  <p className="text-lg font-black text-grappler-100 capitalize">{blockFlash!.split.replace(/_/g, ' ')}</p>
                  <p className="text-[10px] text-grappler-500 uppercase">Split</p>
                </div>
              </div>

              {/* Details */}
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-grappler-400">
                  <Activity className="w-3.5 h-3.5 text-grappler-500" />
                  <span>{blockFlash!.sessions} total sessions across {blockFlash!.weeks} weeks</span>
                </div>
                {blockFlash!.deloadWeek ? (
                  <div className="flex items-center gap-2 text-xs text-grappler-400">
                    <TrendingDown className="w-3.5 h-3.5 text-blue-400" />
                    <span>Deload in week {blockFlash!.deloadWeek} — intensity maintained, volume reduced</span>
                  </div>
                ) : blockFlash!.deloadSkipped ? (
                  <div className="flex items-center gap-2 text-xs text-grappler-400">
                    <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                    <span>No deload — fatigue is low, you&apos;re fresh to push</span>
                  </div>
                ) : null}
                <div className="flex items-center gap-2 text-xs text-grappler-400">
                  <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                  <span>Volume ramps up weekly with progressive overload</span>
                </div>
              </div>

              {/* CTA */}
              <div className="p-4 pt-1 space-y-2">
                <button
                  onClick={() => setBlockFlash(null)}
                  className="w-full py-3 rounded-xl bg-primary-500 text-white font-semibold text-sm hover:bg-primary-600 transition-colors"
                >
                  {blockFlash!.firstSessionName ? `Start with ${blockFlash!.firstSessionName}` : 'View Program'}
                </button>
                <button
                  onClick={() => {
                    const entryId = blockFlash?.entryId;
                    setBlockFlash(null);
                    handleUndoBlockAction(entryId);
                  }}
                  className="w-full py-2 rounded-xl text-grappler-400 hover:text-grappler-200 text-xs font-medium flex items-center justify-center gap-1.5"
                  data-tight
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  Undo — bring my old block back
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  function migrateDialog() {
    return (
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
              className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
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
                className="bg-grappler-900 rounded-lg p-5 max-w-sm w-full border border-grappler-700 shadow-xl max-h-[85vh] overflow-y-auto"
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
    );
  }
}

// --- Muscle emphasis picker (block generation with per-muscle focus) ---

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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Muscle emphasis"
      onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
    >
      <div className="w-full sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-grappler-900 border border-grappler-700 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-grappler-50 text-base">Muscle Emphasis</h3>
            <p className="text-xs text-grappler-400 mt-0.5">
              Tap a muscle group to cycle: Maintain &rarr; Focus &rarr; Ignore
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-grappler-700 transition-colors" aria-label="Close muscle emphasis">
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
              {[4, 5, 6, 7, 8].map((w) => (
                <button
                  key={w}
                  onClick={() => onWeeksChange(w)}
                  aria-pressed={weeks === w}
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
                  aria-pressed={sessionMinutes === opt.value}
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
      </div>
    </motion.div>
  );
}
