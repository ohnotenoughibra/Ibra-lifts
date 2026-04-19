'use client';

import EmptyState from './EmptyState';
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import {
  Calendar,
  Clock,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  Activity,
  TrendingUp,
  Search,
  MessageSquare,
  Pencil,
  Trash2,
  Save,
  X,
  Share2,
  Filter,
  ChevronRight,
  FileDown,
  Plus,
  List,
  CalendarDays,
} from 'lucide-react';
import { cn, formatDate, formatNumber, formatTime } from '@/lib/utils';
import { SetLog, ExerciseLog, MuscleGroup, Mesocycle } from '@/lib/types';
import { exercises as exerciseLibrary, getExerciseById } from '@/lib/exercises';
import { exportWorkoutHistoryPdf } from '@/lib/pdf-export';
import TrainingCalendar from './TrainingCalendar';
import { useShallow } from 'zustand/react/shallow';
import { Layers } from 'lucide-react';

export default function WorkoutHistory() {
  const { workoutLogs, user, updateWorkoutLog, deleteWorkoutLog, mesocycleHistory } = useAppStore(
    useShallow(s => ({
      workoutLogs: s.workoutLogs.filter(l => !l._deleted),
      user: s.user,
      updateWorkoutLog: s.updateWorkoutLog,
      deleteWorkoutLog: s.deleteWorkoutLog,
      mesocycleHistory: s.mesocycleHistory.filter(m => !m._deleted),
    }))
  );
  const [historyView, setHistoryView] = useState<'list' | 'calendar' | 'blocks'>('list');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, Record<number, Partial<SetLog>>>>({});
  const [editDuration, setEditDuration] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [addedSets, setAddedSets] = useState<Record<number, SetLog[]>>({});
  const [addedExercises, setAddedExercises] = useState<ExerciseLog[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [exercisePickerSearch, setExercisePickerSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'strength' | 'hypertrophy' | 'power'>('all');
  const [dateFilter, setDateFilter] = useState<'7d' | '30d' | '90d' | 'all'>('all');
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | 'all'>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'volume' | 'rpe'>('date');
  const [showEditTooltip, setShowEditTooltip] = useState(false);
  const weightUnit = user?.weightUnit || 'lbs';

  // First-visit tooltip for edit discoverability
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('historyEditTooltipSeen') && workoutLogs.length > 0) {
      setShowEditTooltip(true);
    }
  }, [workoutLogs.length]);

  // Dynamic workout types based on actual user data
  const availableTypes = useMemo(() => {
    const types = new Set<'strength' | 'hypertrophy' | 'power'>();
    workoutLogs.forEach(log => {
      // Check session ID for type
      if (log.sessionId?.toLowerCase().includes('strength')) types.add('strength');
      if (log.sessionId?.toLowerCase().includes('hypertrophy')) types.add('hypertrophy');
      if (log.sessionId?.toLowerCase().includes('power')) types.add('power');
    });
    return Array.from(types);
  }, [workoutLogs]);

  // Dynamic muscle groups based on what user has actually trained
  const muscleGroups = useMemo(() => {
    const muscleLabels: Record<MuscleGroup, string> = {
      chest: 'Chest',
      back: 'Back',
      shoulders: 'Shoulders',
      quadriceps: 'Quads',
      hamstrings: 'Hamstrings',
      glutes: 'Glutes',
      biceps: 'Biceps',
      triceps: 'Triceps',
      core: 'Core',
      calves: 'Calves',
      forearms: 'Forearms',
      traps: 'Traps',
      full_body: 'Full Body',
    };

    const foundMuscles = new Set<MuscleGroup>();
    workoutLogs.forEach(log => {
      log.exercises.forEach(ex => {
        const exerciseData = getExerciseById(ex.exerciseId);
        if (exerciseData) {
          exerciseData.primaryMuscles.forEach(m => foundMuscles.add(m));
          exerciseData.secondaryMuscles.forEach(m => foundMuscles.add(m));
        }
      });
    });

    const groups: { id: MuscleGroup | 'all'; label: string }[] = [{ id: 'all', label: 'All' }];
    // Add only muscles the user has trained, maintaining a logical order
    const orderedMuscles: MuscleGroup[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quadriceps', 'hamstrings', 'glutes', 'calves', 'core', 'forearms', 'traps', 'full_body'];
    orderedMuscles.forEach(muscle => {
      if (foundMuscles.has(muscle)) {
        groups.push({ id: muscle, label: muscleLabels[muscle] });
      }
    });

    return groups;
  }, [workoutLogs]);

  const startEditing = (logId: string) => {
    const log = workoutLogs.find(l => l.id === logId);
    setEditingLogId(logId);
    setEditData({});
    setEditDuration(log?.duration ?? null);
    setAddedSets({});
    setAddedExercises([]);
  };

  const updateEditValue = (exerciseIdx: number, setIdx: number, field: keyof SetLog, value: number) => {
    setEditData(prev => ({
      ...prev,
      [exerciseIdx]: {
        ...(prev[exerciseIdx] || {}),
        [setIdx]: {
          ...(prev[exerciseIdx]?.[setIdx] || {}),
          [field]: value
        }
      }
    }));
  };

  const addSetToExercise = (exerciseIdx: number, existingSetsCount: number) => {
    const newSet: SetLog = {
      setNumber: existingSetsCount + (addedSets[exerciseIdx]?.length || 0) + 1,
      weight: 0,
      reps: 0,
      rpe: 0,
      completed: true,
    };
    setAddedSets(prev => ({
      ...prev,
      [exerciseIdx]: [...(prev[exerciseIdx] || []), newSet],
    }));
  };

  const updateAddedSetValue = (exerciseIdx: number, addedSetIdx: number, field: keyof SetLog, value: number) => {
    setAddedSets(prev => ({
      ...prev,
      [exerciseIdx]: (prev[exerciseIdx] || []).map((s, i) =>
        i === addedSetIdx ? { ...s, [field]: value } : s
      ),
    }));
  };

  const removeAddedSet = (exerciseIdx: number, addedSetIdx: number) => {
    setAddedSets(prev => ({
      ...prev,
      [exerciseIdx]: (prev[exerciseIdx] || []).filter((_, i) => i !== addedSetIdx),
    }));
  };

  const addExerciseToLog = (exerciseId: string, exerciseName: string) => {
    const newExercise: ExerciseLog = {
      exerciseId,
      exerciseName,
      sets: [{ setNumber: 1, weight: 0, reps: 0, rpe: 0, completed: true }],
      personalRecord: false,
    };
    setAddedExercises(prev => [...prev, newExercise]);
    setShowExercisePicker(false);
    setExercisePickerSearch('');
  };

  const updateAddedExerciseSet = (addedExIdx: number, setIdx: number, field: keyof SetLog, value: number) => {
    setAddedExercises(prev => prev.map((ex, i) =>
      i === addedExIdx ? {
        ...ex,
        sets: ex.sets.map((s, j) => j === setIdx ? { ...s, [field]: value } : s),
      } : ex
    ));
  };

  const addSetToAddedExercise = (addedExIdx: number) => {
    setAddedExercises(prev => prev.map((ex, i) =>
      i === addedExIdx ? {
        ...ex,
        sets: [...ex.sets, { setNumber: ex.sets.length + 1, weight: 0, reps: 0, rpe: 0, completed: true }],
      } : ex
    ));
  };

  const removeAddedExercise = (addedExIdx: number) => {
    setAddedExercises(prev => prev.filter((_, i) => i !== addedExIdx));
  };

  const filteredPickerExercises = useMemo(() => {
    if (!exercisePickerSearch) return exerciseLibrary.slice(0, 20);
    const q = exercisePickerSearch.toLowerCase();
    return exerciseLibrary.filter(ex =>
      ex.name.toLowerCase().includes(q) || ex.primaryMuscles.some(m => m.includes(q))
    ).slice(0, 20);
  }, [exercisePickerSearch]);

  const saveEdits = (logId: string) => {
    const log = workoutLogs.find(l => l.id === logId);
    if (!log) return;

    const updatedExercises = log.exercises.map((ex, eIdx) => {
      const exerciseEdits = editData[eIdx];
      const extraSets = addedSets[eIdx] || [];

      let updatedSets = ex.sets.map((set, sIdx) => {
        const setEdits = exerciseEdits?.[sIdx];
        if (!setEdits) return set;
        return { ...set, ...setEdits };
      });

      // Append any added sets
      if (extraSets.length > 0) {
        updatedSets = [...updatedSets, ...extraSets];
      }

      return { ...ex, sets: updatedSets };
    });

    // Append added exercises
    const allExercises = [...updatedExercises, ...addedExercises];

    // Recalculate total volume
    const totalVolume = allExercises.reduce((sum, ex) =>
      sum + ex.sets.reduce((s, set) => s + (set.completed ? set.weight * set.reps : 0), 0), 0
    );

    const updates: Partial<typeof log> = { exercises: allExercises, totalVolume };
    if (editDuration !== null && editDuration !== log.duration) {
      updates.duration = editDuration;
    }
    updateWorkoutLog(logId, updates);
    setEditingLogId(null);
    setEditData({});
    setEditDuration(null);
    setAddedSets({});
    setAddedExercises([]);
  };

  const handleDelete = (logId: string) => {
    deleteWorkoutLog(logId);
    setConfirmDeleteId(null);
    setExpandedLogId(null);
  };

  const filteredLogs = useMemo(() => {
    let logs = [...workoutLogs].reverse(); // newest first

    // Date filter
    if (dateFilter !== 'all') {
      const days = dateFilter === '7d' ? 7 : dateFilter === '30d' ? 30 : 90;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      logs = logs.filter(l => new Date(l.date) >= cutoff);
    }

    // Type filter
    if (typeFilter !== 'all') {
      logs = logs.filter(l =>
        l.sessionId?.toLowerCase().includes(typeFilter) ||
        l.exercises.some(e => e.exerciseName.toLowerCase().includes(typeFilter))
      );
    }

    // Muscle group filter
    if (muscleFilter !== 'all') {
      logs = logs.filter(l =>
        l.exercises.some(ex => {
          const exerciseData = getExerciseById(ex.exerciseId);
          if (!exerciseData) return false;
          return exerciseData.primaryMuscles.includes(muscleFilter) ||
                 exerciseData.secondaryMuscles.includes(muscleFilter);
        })
      );
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      logs = logs.filter(l =>
        l.sessionId?.toLowerCase().includes(q) ||
        l.exercises.some(e => e.exerciseName.toLowerCase().includes(q)) ||
        l.notes?.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === 'volume') {
      logs.sort((a, b) => b.totalVolume - a.totalVolume);
    } else if (sortBy === 'rpe') {
      logs.sort((a, b) => (b.overallRPE || 0) - (a.overallRPE || 0));
    }
    // 'date' is already default (newest first)

    return logs;
  }, [workoutLogs, searchQuery, typeFilter, dateFilter, muscleFilter, sortBy]);

  // Calculate progress projection for main lifts
  const progressProjections = useMemo(() => {
    const mainLifts = ['squat', 'deadlift', 'bench press', 'overhead press'];
    const projections: { exercise: string; current1RM: number; weeklyGain: number; milestones: { target: number; weeksAway: number }[] }[] = [];

    for (const liftName of mainLifts) {
      // Find all logs for this exercise
      const liftData: { date: Date; estimated1RM: number }[] = [];
      for (const log of workoutLogs) {
        for (const ex of log.exercises) {
          if (ex.exerciseName.toLowerCase().includes(liftName) && ex.estimated1RM && ex.estimated1RM > 0) {
            liftData.push({ date: new Date(log.date), estimated1RM: ex.estimated1RM });
          }
        }
      }

      if (liftData.length < 2) continue;

      // Sort by date
      liftData.sort((a, b) => a.date.getTime() - b.date.getTime());

      // IQR outlier filtering — remove warm-up sets logged as working
      const e1rms = liftData.map(d => d.estimated1RM).sort((a, b) => a - b);
      const q1 = e1rms[Math.floor(e1rms.length * 0.25)];
      const q3 = e1rms[Math.floor(e1rms.length * 0.75)];
      const iqr = q3 - q1;
      let filtered = liftData;
      if (iqr > 0) {
        const lb = q1 - 1.5 * iqr;
        filtered = liftData.filter(d => d.estimated1RM >= lb);
      }
      if (filtered.length < 2) continue;

      // Calculate weekly rate of gain (linear regression simplified)
      const first = filtered[0];
      const last = filtered[filtered.length - 1];
      const weeksDiff = Math.max(1, (last.date.getTime() - first.date.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const totalGain = last.estimated1RM - first.estimated1RM;
      const weeklyGain = totalGain / weeksDiff;

      if (weeklyGain <= 0) continue;

      const current1RM = last.estimated1RM;

      // Calculate milestones (next 2 round numbers)
      const unit = current1RM > 100 ? 25 : 10;
      const milestones: { target: number; weeksAway: number }[] = [];
      let nextTarget = Math.ceil(current1RM / unit) * unit;
      if (nextTarget === current1RM) nextTarget += unit;

      for (let i = 0; i < 2; i++) {
        const weeksAway = Math.round((nextTarget - current1RM) / weeklyGain);
        if (weeksAway < 52) {
          milestones.push({ target: nextTarget, weeksAway });
        }
        nextTarget += unit;
      }

      if (milestones.length > 0) {
        projections.push({
          exercise: liftName.charAt(0).toUpperCase() + liftName.slice(1),
          current1RM: Math.round(current1RM),
          weeklyGain: Math.round(weeklyGain * 10) / 10,
          milestones,
        });
      }
    }

    return projections;
  }, [workoutLogs]);

  if (workoutLogs.length === 0 && mesocycleHistory.length === 0) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="Your history starts here"
        description="After your first workout you'll see volume trends, PRs, and strength progression over time."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-grappler-50">Workout History</h2>
        <div className="flex items-center gap-3">
          {/* List / Calendar toggle */}
          <div className="flex bg-grappler-800 rounded-lg p-0.5">
            <button
              onClick={() => setHistoryView('list')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                historyView === 'list' ? 'bg-primary-500 text-white' : 'text-grappler-400 hover:text-grappler-200'
              )}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setHistoryView('blocks')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                historyView === 'blocks' ? 'bg-primary-500 text-white' : 'text-grappler-400 hover:text-grappler-200'
              )}
              title="Training blocks"
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              onClick={() => setHistoryView('calendar')}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                historyView === 'calendar' ? 'bg-primary-500 text-white' : 'text-grappler-400 hover:text-grappler-200'
              )}
              title="Calendar view"
            >
              <CalendarDays className="w-4 h-4" />
            </button>
          </div>
          {historyView === 'list' && (
            <button
              onClick={() => exportWorkoutHistoryPdf(workoutLogs, user?.weightUnit || 'lbs')}
              className="flex items-center gap-1 text-sm text-grappler-400 hover:text-grappler-200 transition-colors"
              title="Export as PDF"
            >
              <FileDown className="w-4 h-4" />
            </button>
          )}
          <span className="text-sm text-grappler-400">
            {historyView === 'blocks' ? `${mesocycleHistory.length} blocks` : `${workoutLogs.length} workouts`}
          </span>
        </div>
      </div>

      {/* Calendar View */}
      {historyView === 'calendar' && <TrainingCalendar />}

      {/* Blocks View */}
      {historyView === 'blocks' && (
        <div className="space-y-3">
          {mesocycleHistory.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No completed blocks yet"
              description="Completed training blocks will appear here with volume, PRs, and progression data."
            />
          ) : (
            [...mesocycleHistory]
              .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
              .filter(meso => workoutLogs.some(l => l.mesocycleId === meso.id))
              .map((meso) => {
              const mesoLogs = workoutLogs.filter(l => l.mesocycleId === meso.id);
              const totalVol = mesoLogs.reduce((s, l) => s + l.totalVolume, 0);
              const totalSessions = mesoLogs.length;
              const totalWeeks = meso.weeks?.length || 0;
              const plannedSessions = meso.weeks?.reduce((s, w) => s + w.sessions.length, 0) || 0;
              const completionRate = plannedSessions > 0 ? Math.round((totalSessions / plannedSessions) * 100) : 0;
              const avgRPE = mesoLogs.length > 0 ? (mesoLogs.reduce((s, l) => s + (l.overallRPE || 0), 0) / mesoLogs.length).toFixed(1) : '-';
              const totalDuration = mesoLogs.reduce((s, l) => s + (l.duration || 0), 0);
              const prs = mesoLogs.reduce((s, l) => s + (l.exercises?.filter(ex => ex.personalRecord)?.length || 0), 0);

              return (
                <motion.div
                  key={meso.id}
                  layout
                  className="card p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-grappler-100 text-sm">{meso.name}</p>
                      <p className="text-xs text-grappler-400">
                        {formatDate(meso.startDate)} — {formatDate(meso.endDate)}
                      </p>
                    </div>
                    <div className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-medium',
                      completionRate >= 90 ? 'bg-green-500/20 text-green-400' :
                      completionRate >= 70 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    )}>
                      {completionRate}% done
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <div className="bg-grappler-800/50 rounded-lg p-2 text-center">
                      <p className="text-sm font-bold text-grappler-100">{totalSessions}</p>
                      <p className="text-[10px] text-grappler-500 uppercase">Sessions</p>
                    </div>
                    <div className="bg-grappler-800/50 rounded-lg p-2 text-center">
                      <p className="text-sm font-bold text-grappler-100">{formatNumber(Math.round(totalVol))}</p>
                      <p className="text-[10px] text-grappler-500 uppercase">{weightUnit}</p>
                    </div>
                    <div className="bg-grappler-800/50 rounded-lg p-2 text-center">
                      <p className="text-sm font-bold text-grappler-100">{avgRPE}</p>
                      <p className="text-[10px] text-grappler-500 uppercase">Avg RPE</p>
                    </div>
                    <div className="bg-grappler-800/50 rounded-lg p-2 text-center">
                      <p className="text-sm font-bold text-primary-400">{prs}</p>
                      <p className="text-[10px] text-grappler-500 uppercase">PRs</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-grappler-400">
                    <span>{totalWeeks} weeks &middot; {meso.goalFocus} &middot; {meso.splitType}</span>
                    <span>{Math.round(totalDuration / 60)}h total</span>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* List View */}
      {historyView === 'list' && (<>


      {/* Progress Projection */}
      {progressProjections.length > 0 && (
        <div className="card p-4 mb-4">
          <h3 className="text-sm font-semibold text-grappler-200 uppercase tracking-wide mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary-400" />
            Progress Projection
          </h3>
          <div className="space-y-3">
            {progressProjections.map((p, i) => (
              <div key={i} className="bg-grappler-800/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-grappler-100">{p.exercise}</p>
                  <p className="text-xs text-grappler-400">Est. 1RM: <span className="text-grappler-200 font-medium">{p.current1RM} {weightUnit}</span></p>
                </div>
                <p className="text-xs text-grappler-400 mb-2">Gaining ~{p.weeklyGain} {weightUnit}/week</p>
                <div className="flex gap-2">
                  {p.milestones.map((m, j) => (
                    <div key={j} className="flex-1 bg-grappler-700/40 rounded-lg px-3 py-2 text-center">
                      <p className="text-sm font-bold text-primary-400">{m.target} {weightUnit}</p>
                      <p className="text-xs text-grappler-400">~{m.weeksAway} week{m.weeksAway !== 1 ? 's' : ''}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="space-y-3 mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-grappler-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search exercises, sessions, notes..."
              className="input pl-10 w-full"
            />
          </div>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={cn(
              'p-2.5 rounded-lg transition-colors',
              showAdvancedFilters ? 'bg-primary-500 text-white' : 'bg-grappler-800 text-grappler-400 hover:text-grappler-200'
            )}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
        {/* Only show type filter if user has logged different workout types */}
        {availableTypes.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setTypeFilter('all')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium',
                typeFilter === 'all' ? 'bg-primary-500 text-white' : 'bg-grappler-700 text-grappler-400'
              )}
            >
              All
            </button>
            {availableTypes.map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium capitalize',
                  typeFilter === t ? 'bg-primary-500 text-white' : 'bg-grappler-700 text-grappler-400'
                )}
              >
                {t}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          {([
            { value: '7d', label: '7 days' },
            { value: '30d', label: '30 days' },
            { value: '90d', label: '90 days' },
            { value: 'all', label: 'All time' },
          ] as const).map(d => (
            <button
              key={d.value}
              onClick={() => setDateFilter(d.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium',
                dateFilter === d.value ? 'bg-primary-500 text-white' : 'bg-grappler-700 text-grappler-400'
              )}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-1">
                {/* Muscle group filter */}
                <div>
                  <p className="text-xs text-grappler-400 uppercase tracking-wide mb-1.5">Muscle Group</p>
                  <div className="flex flex-wrap gap-1.5">
                    {muscleGroups.map(mg => (
                      <button
                        key={mg.id}
                        onClick={() => setMuscleFilter(mg.id)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                          muscleFilter === mg.id
                            ? 'bg-accent-500 text-white'
                            : 'bg-grappler-700 text-grappler-400 hover:text-grappler-200'
                        )}
                      >
                        {mg.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <p className="text-xs text-grappler-400 uppercase tracking-wide mb-1.5">Sort By</p>
                  <div className="flex gap-2">
                    {([
                      { value: 'date', label: 'Date' },
                      { value: 'volume', label: 'Volume' },
                      { value: 'rpe', label: 'RPE' },
                    ] as const).map(s => (
                      <button
                        key={s.value}
                        onClick={() => setSortBy(s.value)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium',
                          sortBy === s.value ? 'bg-accent-500 text-white' : 'bg-grappler-700 text-grappler-400'
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active filters summary */}
                {(muscleFilter !== 'all' || sortBy !== 'date') && (
                  <button
                    onClick={() => { setMuscleFilter('all'); setSortBy('date'); }}
                    className="text-xs text-primary-400 hover:text-primary-300"
                  >
                    Clear advanced filters
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-xs text-grappler-400">{filteredLogs.length} workout{filteredLogs.length !== 1 ? 's' : ''} found</p>
      </div>

      {/* First-visit edit tooltip */}
      {showEditTooltip && filteredLogs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-3 flex items-center justify-between border border-primary-500/30 bg-primary-500/5"
        >
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-primary-400 flex-shrink-0" />
            <p className="text-xs text-grappler-300">Tap any workout to view details, or tap the edit icon to make corrections</p>
          </div>
          <button
            onClick={() => { setShowEditTooltip(false); if (typeof window !== 'undefined') localStorage.setItem('historyEditTooltipSeen', 'true'); }}
            className="p-1 text-grappler-500 hover:text-grappler-300 flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}

      {filteredLogs.map((log) => {
        const isExpanded = expandedLogId === log.id;

        return (
          <motion.div
            key={log.id}
            layout
            className="card overflow-hidden"
          >
            {/* Header - always visible */}
            <div className="flex items-stretch">
              <button
                onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                className="flex-1 p-3 sm:p-4 text-left min-w-0"
              >
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-grappler-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5 text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-grappler-100 text-sm truncate">
                        {log.exercises.length} exercise{log.exercises.length !== 1 ? 's' : ''}
                      </p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className={cn(
                          'px-1.5 py-0.5 rounded text-[11px] sm:text-xs font-medium',
                          log.overallRPE >= 9 ? 'bg-red-500/20 text-red-400' :
                          log.overallRPE >= 7 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        )}>
                          RPE {log.overallRPE}
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-grappler-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-grappler-500" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-xs text-grappler-400">{formatDate(log.date)}</p>
                      <span className="text-grappler-600 text-xs">·</span>
                      <p className="text-xs text-grappler-400">{formatNumber(Math.round(log.totalVolume))} {weightUnit}</p>
                      <span className="text-grappler-600 text-xs">·</span>
                      <p className="text-xs text-grappler-400">{log.duration} min</p>
                    </div>
                  </div>
                </div>
              </button>
              {/* Edit shortcut icon */}
              <button
                onClick={(e) => { e.stopPropagation(); setExpandedLogId(log.id); startEditing(log.id); }}
                className="px-3 flex items-center text-grappler-600 hover:text-grappler-300 hover:bg-grappler-800/50 transition-colors border-l border-grappler-800"
                title="Edit workout"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Expanded details */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-grappler-700"
                >
                  <div className="p-4 space-y-3">
                    {/* Edit/Delete buttons */}
                    <div className="flex items-center gap-2">
                      {editingLogId === log.id ? (
                        <>
                          <button
                            onClick={() => saveEdits(log.id)}
                            className="btn btn-primary btn-sm flex-1 gap-1"
                          >
                            <Save className="w-3.5 h-3.5" /> Save Changes
                          </button>
                          <button
                            onClick={() => { setEditingLogId(null); setEditData({}); setEditDuration(null); setAddedSets({}); setAddedExercises([]); }}
                            className="btn btn-secondary btn-sm gap-1"
                          >
                            <X className="w-3.5 h-3.5" /> Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditing(log.id)}
                            className="btn btn-secondary btn-sm flex-1 gap-1"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit Workout
                          </button>
                          {confirmDeleteId === log.id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleDelete(log.id)}
                                className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-3 py-1.5 rounded-lg bg-grappler-700 text-grappler-400 text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(log.id)}
                              className="btn btn-secondary btn-sm gap-1 text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    {/* Duration edit (visible in edit mode) */}
                    {editingLogId === log.id && (
                      <div className="flex items-center gap-3 bg-grappler-800/50 rounded-lg px-3 py-2">
                        <Clock className="w-4 h-4 text-grappler-400 flex-shrink-0" />
                        <span className="text-xs text-grappler-400">Duration</span>
                        <input
                          type="number"
                          min={1}
                          max={300}
                          value={editDuration ?? log.duration}
                          onChange={(e) => setEditDuration(Math.max(1, parseInt(e.target.value) || 0))}
                          className="w-16 px-2 py-1 bg-grappler-700 border border-grappler-600 rounded text-sm text-grappler-200 text-center"
                        />
                        <span className="text-xs text-grappler-400">min</span>
                      </div>
                    )}

                    {/* Pre-check-in summary */}
                    {log.preCheckIn && (
                      <div className="bg-grappler-800/50 rounded-lg p-3 text-xs">
                        <p className="font-medium text-grappler-300 mb-1">Pre-Workout</p>
                        <div className="flex flex-wrap gap-2 text-grappler-400">
                          <span>Sleep: {log.preCheckIn.sleepQuality}/5 ({log.preCheckIn.sleepHours}h)</span>
                          <span>Stress: {log.preCheckIn.stress}/5</span>
                          <span>Motivation: {log.preCheckIn.motivation}/5</span>
                        </div>
                      </div>
                    )}

                    {/* Exercises */}
                    {log.exercises.map((ex, i) => (
                      <div key={i} className="bg-grappler-800/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-grappler-200 text-sm">{ex.exerciseName}</p>
                          {ex.personalRecord && (
                            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">PR</span>
                          )}
                        </div>
                        <div className="space-y-1">
                          {ex.sets.map((set, j) => {
                            const isEditing = editingLogId === log.id;
                            const editedWeight = editData[i]?.[j]?.weight;
                            const editedReps = editData[i]?.[j]?.reps;
                            const editedRpe = editData[i]?.[j]?.rpe;
                            const editedDuration = (editData[i]?.[j] as Partial<SetLog> | undefined)?.duration;
                            const isTimeBasedSet = typeof set.duration === 'number';
                            return (
                            <div key={j} className={cn(
                              'flex items-center justify-between text-xs',
                              !isEditing && (set.completed ? 'text-grappler-300' : 'text-grappler-600 line-through')
                            )}>
                              <span className="w-12">Set {set.setNumber}</span>
                              {isEditing ? (
                                <>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      inputMode="decimal"
                                      value={editedWeight !== undefined ? editedWeight : set.weight}
                                      onChange={(e) => updateEditValue(i, j, 'weight', parseFloat(e.target.value) || 0)}
                                      className="w-14 text-center bg-grappler-700 rounded px-1 py-0.5 text-grappler-100"
                                    />
                                    <span className="text-grappler-500">{weightUnit}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-grappler-500">{isTimeBasedSet ? '·' : 'x'}</span>
                                    {isTimeBasedSet ? (
                                      <input
                                        type="number"
                                        inputMode="numeric"
                                        value={editedDuration !== undefined ? editedDuration : (set.duration || 0)}
                                        onChange={(e) => updateEditValue(i, j, 'duration', parseInt(e.target.value) || 0)}
                                        className="w-12 text-center bg-grappler-700 rounded px-1 py-0.5 text-grappler-100"
                                      />
                                    ) : (
                                      <input
                                        type="number"
                                        inputMode="numeric"
                                        value={editedReps !== undefined ? editedReps : set.reps}
                                        onChange={(e) => updateEditValue(i, j, 'reps', parseInt(e.target.value) || 0)}
                                        className="w-10 text-center bg-grappler-700 rounded px-1 py-0.5 text-grappler-100"
                                      />
                                    )}
                                    {isTimeBasedSet && <span className="text-grappler-500">s</span>}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-grappler-500">RPE</span>
                                    <input
                                      type="number"
                                      inputMode="decimal"
                                      value={editedRpe !== undefined ? editedRpe : set.rpe}
                                      onChange={(e) => updateEditValue(i, j, 'rpe', parseFloat(e.target.value) || 0)}
                                      className="w-10 text-center bg-grappler-700 rounded px-1 py-0.5 text-grappler-100"
                                      min={1}
                                      max={10}
                                    />
                                  </div>
                                </>
                              ) : (
                                <>
                                  <span>
                                    {isTimeBasedSet
                                      ? (set.weight > 0 ? `${set.weight} ${weightUnit} · ${set.duration}s` : `${set.duration}s hold`)
                                      : `${set.weight} ${weightUnit} x ${set.reps} reps`}
                                  </span>
                                  <span>RPE {set.rpe}</span>
                                </>
                              )}
                            </div>
                            );
                          })}

                          {/* Added sets (edit mode) */}
                          {editingLogId === log.id && addedSets[i]?.map((addedSet, aIdx) => (
                            <div key={`added-${aIdx}`} className="flex items-center justify-between text-xs">
                              <span className="w-12 text-primary-400">Set {ex.sets.length + aIdx + 1}</span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  value={addedSet.weight}
                                  onChange={(e) => updateAddedSetValue(i, aIdx, 'weight', parseFloat(e.target.value) || 0)}
                                  className="w-14 text-center bg-grappler-700 rounded px-1 py-0.5 text-grappler-100"
                                />
                                <span className="text-grappler-500">{weightUnit}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-grappler-500">x</span>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  value={addedSet.reps}
                                  onChange={(e) => updateAddedSetValue(i, aIdx, 'reps', parseInt(e.target.value) || 0)}
                                  className="w-10 text-center bg-grappler-700 rounded px-1 py-0.5 text-grappler-100"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-grappler-500">RPE</span>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  value={addedSet.rpe}
                                  onChange={(e) => updateAddedSetValue(i, aIdx, 'rpe', parseFloat(e.target.value) || 0)}
                                  className="w-10 text-center bg-grappler-700 rounded px-1 py-0.5 text-grappler-100"
                                  min={1}
                                  max={10}
                                />
                              </div>
                              <button
                                onClick={() => removeAddedSet(i, aIdx)}
                                className="text-red-400 hover:text-red-300 ml-1"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}

                          {/* Add Set button (edit mode) */}
                          {editingLogId === log.id && (
                            <button
                              onClick={() => addSetToExercise(i, ex.sets.length)}
                              className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 mt-1 transition-colors"
                            >
                              <Plus className="w-3 h-3" /> Add Set
                            </button>
                          )}
                        </div>
                        {ex.feedback && (
                          <div className="mt-2 pt-2 border-t border-grappler-700 text-xs text-grappler-400 flex flex-wrap gap-2">
                            <span>Pump: {ex.feedback.pumpRating}/5</span>
                            <span>Difficulty: {ex.feedback.difficulty.replace('_', ' ')}</span>
                            {ex.feedback.jointPain && <span className="text-red-400">Joint pain: {ex.feedback.jointPainLocation || 'yes'}</span>}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Added exercises (edit mode) */}
                    {editingLogId === log.id && addedExercises.map((addedEx, aeIdx) => (
                      <div key={`added-ex-${aeIdx}`} className="bg-primary-500/5 border border-primary-500/20 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-primary-300 text-sm">{addedEx.exerciseName}</p>
                          <button
                            onClick={() => removeAddedExercise(aeIdx)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="space-y-1">
                          {addedEx.sets.map((set, sIdx) => (
                            <div key={sIdx} className="flex items-center justify-between text-xs">
                              <span className="w-12 text-primary-400">Set {set.setNumber}</span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  value={set.weight}
                                  onChange={(e) => updateAddedExerciseSet(aeIdx, sIdx, 'weight', parseFloat(e.target.value) || 0)}
                                  className="w-14 text-center bg-grappler-700 rounded px-1 py-0.5 text-grappler-100"
                                />
                                <span className="text-grappler-500">{weightUnit}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-grappler-500">x</span>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  value={set.reps}
                                  onChange={(e) => updateAddedExerciseSet(aeIdx, sIdx, 'reps', parseInt(e.target.value) || 0)}
                                  className="w-10 text-center bg-grappler-700 rounded px-1 py-0.5 text-grappler-100"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-grappler-500">RPE</span>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  value={set.rpe}
                                  onChange={(e) => updateAddedExerciseSet(aeIdx, sIdx, 'rpe', parseFloat(e.target.value) || 0)}
                                  className="w-10 text-center bg-grappler-700 rounded px-1 py-0.5 text-grappler-100"
                                  min={1}
                                  max={10}
                                />
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={() => addSetToAddedExercise(aeIdx)}
                            className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 mt-1 transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Add Set
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Add Exercise button (edit mode) */}
                    {editingLogId === log.id && (
                      <button
                        onClick={() => { setExercisePickerSearch(''); setShowExercisePicker(true); }}
                        className="w-full py-2 rounded-lg border border-dashed border-grappler-600 hover:border-primary-500 text-xs text-grappler-400 hover:text-primary-400 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Exercise
                      </button>
                    )}

                    {/* Post-workout feedback */}
                    {log.postFeedback && (
                      <div className="bg-grappler-800/50 rounded-lg p-3 text-xs">
                        <p className="font-medium text-grappler-300 mb-1">Post-Workout</p>
                        <div className="flex flex-wrap gap-2 text-grappler-400">
                          <span>Performance: {log.postFeedback.overallPerformance.replace(/_/g, ' ')}</span>
                          <span>Mood: {log.postFeedback.mood}/5</span>
                          <span>Energy: {log.postFeedback.energy}/10</span>
                          {log.postFeedback.wouldRepeat ? <span className="text-green-400">Enjoyed</span> : <span className="text-red-400">Didn't enjoy</span>}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {log.notes && (
                      <div className="flex items-start gap-2 text-xs text-grappler-400">
                        <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <p>{log.notes}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      {/* Exercise Picker Modal */}
      <AnimatePresence>
        {showExercisePicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="card p-5 w-full max-w-md max-h-[75vh] flex flex-col"
            >
              <h2 className="text-lg font-bold text-grappler-50 mb-3">Add Exercise</h2>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grappler-500" />
                <input
                  type="text"
                  value={exercisePickerSearch}
                  onChange={(e) => setExercisePickerSearch(e.target.value)}
                  placeholder="Search exercises..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-grappler-800 border border-grappler-700 text-sm text-grappler-100 placeholder-grappler-500 focus-visible:outline-none focus-visible:border-primary-500"
                  autoFocus
                />
              </div>
              <div className="overflow-y-auto flex-1 space-y-1.5 min-h-0">
                {filteredPickerExercises.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => addExerciseToLog(ex.id, ex.name)}
                    className="w-full p-3 rounded-xl border border-grappler-700 hover:border-primary-500 text-left transition-all group"
                  >
                    <p className="font-semibold text-sm text-grappler-100 group-hover:text-primary-300 transition-colors">
                      {ex.name}
                    </p>
                    <p className="text-xs text-grappler-400 mt-0.5 capitalize">
                      {ex.primaryMuscles.join(', ')}
                    </p>
                  </button>
                ))}
                {filteredPickerExercises.length === 0 && (
                  <p className="text-sm text-grappler-400 text-center py-6">No exercises found</p>
                )}
              </div>
              <button
                onClick={() => setShowExercisePicker(false)}
                className="btn btn-secondary btn-md w-full mt-3"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </>)}
    </div>
  );
}
