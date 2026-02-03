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
import { SessionTemplate, WorkoutSession, EquipmentType } from '@/lib/types';
import { formatDate, getRelativeTime } from '@/lib/utils';
import { exercises as allExercises } from '@/lib/exercises';
import { Shield } from 'lucide-react';

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
    useTemplate
  } = useAppStore();

  const [activeSection, setActiveSection] = useState<'templates' | 'presets' | 'save' | 'history'>('templates');
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [templateNameInputs, setTemplateNameInputs] = useState<Record<string, string>>({});
  const [savingSessionId, setSavingSessionId] = useState<string | null>(null);
  const [historyNameInputs, setHistoryNameInputs] = useState<Record<string, string>>({});
  const [savingHistoryId, setSavingHistoryId] = useState<string | null>(null);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

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

  const sectionTabs = [
    { id: 'templates' as const, label: 'My Templates', icon: Star },
    { id: 'presets' as const, label: 'Grappling', icon: Shield },
    { id: 'save' as const, label: 'Save Current', icon: Save },
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
            <h1 className="text-xl font-bold text-grappler-50">Templates</h1>
            <p className="text-xs text-grappler-400">Pick a template to start a workout instantly</p>
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
