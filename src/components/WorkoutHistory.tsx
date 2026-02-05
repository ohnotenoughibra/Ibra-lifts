'use client';

import { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { cn, formatDate, formatNumber, formatTime } from '@/lib/utils';
import { SetLog, MuscleGroup } from '@/lib/types';
import { getExerciseById } from '@/lib/exercises';
import { exportWorkoutHistoryPdf } from '@/lib/pdf-export';

export default function WorkoutHistory() {
  const { workoutLogs, user, updateWorkoutLog, deleteWorkoutLog } = useAppStore();
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, Record<number, Partial<SetLog>>>>({});
  const [editDuration, setEditDuration] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'strength' | 'hypertrophy' | 'power'>('all');
  const [dateFilter, setDateFilter] = useState<'7d' | '30d' | '90d' | 'all'>('all');
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | 'all'>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'volume' | 'rpe'>('date');
  const weightUnit = user?.weightUnit || 'lbs';

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
      lats: 'Lats',
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
    const orderedMuscles: MuscleGroup[] = ['chest', 'back', 'lats', 'shoulders', 'biceps', 'triceps', 'quadriceps', 'hamstrings', 'glutes', 'calves', 'core', 'forearms', 'traps', 'full_body'];
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

  const saveEdits = (logId: string) => {
    const log = workoutLogs.find(l => l.id === logId);
    if (!log) return;

    const updatedExercises = log.exercises.map((ex, eIdx) => {
      const exerciseEdits = editData[eIdx];
      if (!exerciseEdits) return ex;

      const updatedSets = ex.sets.map((set, sIdx) => {
        const setEdits = exerciseEdits[sIdx];
        if (!setEdits) return set;
        return { ...set, ...setEdits };
      });

      // Recalculate total volume for this exercise
      return { ...ex, sets: updatedSets };
    });

    // Recalculate total volume
    const totalVolume = updatedExercises.reduce((sum, ex) =>
      sum + ex.sets.reduce((s, set) => s + (set.completed ? set.weight * set.reps : 0), 0), 0
    );

    const updates: Partial<typeof log> = { exercises: updatedExercises, totalVolume };
    if (editDuration !== null && editDuration !== log.duration) {
      updates.duration = editDuration;
    }
    updateWorkoutLog(logId, updates);
    setEditingLogId(null);
    setEditData({});
    setEditDuration(null);
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

      // Calculate weekly rate of gain (linear regression simplified)
      const first = liftData[0];
      const last = liftData[liftData.length - 1];
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

  if (workoutLogs.length === 0) {
    return (
      <div className="text-center py-16">
        <Dumbbell className="w-12 h-12 text-grappler-600 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-grappler-300 mb-2">No Workouts Yet</h3>
        <p className="text-sm text-grappler-500">Complete your first workout to see your history here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-grappler-50">Workout History</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => exportWorkoutHistoryPdf(workoutLogs, user?.weightUnit || 'lbs')}
            className="flex items-center gap-1 text-sm text-grappler-400 hover:text-grappler-200 transition-colors"
            title="Export as PDF"
          >
            <FileDown className="w-4 h-4" />
          </button>
          <span className="text-sm text-grappler-400">{workoutLogs.length} workouts</span>
        </div>
      </div>

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
                <p className="text-[11px] text-grappler-500 mb-2">Gaining ~{p.weeklyGain} {weightUnit}/week</p>
                <div className="flex gap-2">
                  {p.milestones.map((m, j) => (
                    <div key={j} className="flex-1 bg-grappler-700/40 rounded-lg px-3 py-2 text-center">
                      <p className="text-sm font-bold text-primary-400">{m.target} {weightUnit}</p>
                      <p className="text-[10px] text-grappler-500">~{m.weeksAway} week{m.weeksAway !== 1 ? 's' : ''}</p>
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
                  <p className="text-[10px] text-grappler-500 uppercase tracking-wide mb-1.5">Muscle Group</p>
                  <div className="flex flex-wrap gap-1.5">
                    {muscleGroups.map(mg => (
                      <button
                        key={mg.id}
                        onClick={() => setMuscleFilter(mg.id)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors',
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
                  <p className="text-[10px] text-grappler-500 uppercase tracking-wide mb-1.5">Sort By</p>
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

        <p className="text-xs text-grappler-500">{filteredLogs.length} workout{filteredLogs.length !== 1 ? 's' : ''} found</p>
      </div>

      {filteredLogs.map((log) => {
        const isExpanded = expandedLogId === log.id;

        return (
          <motion.div
            key={log.id}
            layout
            className="card overflow-hidden"
          >
            {/* Header - always visible */}
            <button
              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
              className="w-full p-4 text-left flex items-center justify-between"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-grappler-700 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Dumbbell className="w-5 h-5 text-primary-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-grappler-100 text-sm truncate">
                    {log.exercises.length} exercises
                  </p>
                  <p className="text-xs text-grappler-500">{formatDate(log.date)}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right">
                  <p className="text-sm font-medium text-grappler-200">
                    {formatNumber(Math.round(log.totalVolume))} {weightUnit}
                  </p>
                  <p className="text-xs text-grappler-500">{log.duration} min</p>
                </div>
                <div className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium',
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
            </button>

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
                            onClick={() => { setEditingLogId(null); setEditData({}); setEditDuration(null); }}
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
                        <span className="text-xs text-grappler-500">min</span>
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
                                    <span className="text-grappler-500">x</span>
                                    <input
                                      type="number"
                                      inputMode="numeric"
                                      value={editedReps !== undefined ? editedReps : set.reps}
                                      onChange={(e) => updateEditValue(i, j, 'reps', parseInt(e.target.value) || 0)}
                                      className="w-10 text-center bg-grappler-700 rounded px-1 py-0.5 text-grappler-100"
                                    />
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
                                  <span>{set.weight} {weightUnit} x {set.reps} reps</span>
                                  <span>RPE {set.rpe}</span>
                                </>
                              )}
                            </div>
                            );
                          })}
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
    </div>
  );
}
