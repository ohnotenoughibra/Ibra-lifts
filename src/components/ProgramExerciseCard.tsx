'use client';

import { formatTarget, formatSetsTarget } from '@/lib/prescription-format';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Video, Shuffle, Trash2, Minus, Plus, Pencil, TrendingUp, MoreHorizontal, ArrowUp, ArrowDown } from 'lucide-react';
import { useToast } from './Toast';
import { cn } from '@/lib/utils';
import { ExercisePrescription, Equipment } from '@/lib/types';
import { getRecommendedAlternatives, ExerciseRecommendation } from '@/lib/exercises';
import YouTubeEmbed from '@/components/YouTubeEmbed';
import { resolveWeightUnit } from '@/lib/units';
import { prescribedPercentOf1RM } from '@/lib/load-model';
import type { EditScope } from '@/lib/plan-edit';

/** "This week / Rest of block" — every block edit says how far it reaches. */
function ScopeToggle({ value, onChange, weeksLeft }: { value: EditScope; onChange: (s: EditScope) => void; weeksLeft: number }) {
  if (weeksLeft <= 1) return null;
  return (
    <div className="flex rounded-md bg-grappler-800 p-0.5 text-[11px] mb-2" role="radiogroup" aria-label="Apply to" data-testid="scope-toggle">
      {(['week', 'remaining'] as const).map(sc => (
        <button
          key={sc}
          role="radio"
          aria-checked={value === sc}
          onClick={() => onChange(sc)}
          className={cn('flex-1 rounded py-1.5 font-medium', value === sc ? 'bg-grappler-600 text-grappler-50' : 'text-grappler-400')}
        >
          {sc === 'week' ? 'This week' : `Rest of block (${weeksLeft} wks)`}
        </button>
      ))}
    </div>
  );
}

interface ProgramExerciseCardProps {
  exercise: ExercisePrescription;
  index: number;
  weekIndex: number;
  sessionId: string;
  onSwap: (weekIndex: number, sessionId: string, exerciseIndex: number, newExerciseId: string, scope?: EditScope) => void;
  // When provided, removal goes through the parent (which owns the undo toast)
  onRemove?: (weekIndex: number, sessionId: string, exerciseIndex: number, exercise: ExercisePrescription) => void;
  userEquipment: Equipment;
  totalExercises: number;
}

export default function ProgramExerciseCard({ exercise: ex, index, weekIndex, sessionId, onSwap, onRemove, userEquipment, totalExercises }: ProgramExerciseCardProps) {
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [showFormVideo, setShowFormVideo] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const moveExercise = useAppStore((s) => s.moveProgramExercise);
  const { showToast } = useToast();
  const move = (to: number) => {
    setShowMenu(false);
    const n = moveExercise(weekIndex, sessionId, index, to, 'remaining');
    if (n > 1) showToast(`Order changed in ${n} weeks`, 'success');
  };
  const workoutLogs = useAppStore((s) => s.workoutLogs);
  const weightUnit = useAppStore((s) => resolveWeightUnit(s.user?.weightUnit));
  const updatePrescriptionRaw = useAppStore((s) => s.updateExercisePrescription);
  const removeExercise = useAppStore((s) => s.removeExerciseFromSession);
  const weeksLeft = useAppStore((s) => Math.max(0, (s.currentMesocycle?.weeks.length ?? 0) - weekIndex));
  // Swaps default to the rest of the block (you want the new lift from now on);
  // number tweaks default to this week (progression differs week to week).
  const [swapScope, setSwapScope] = useState<EditScope>('remaining');
  const [editScope, setEditScope] = useState<EditScope>('week');
  const updatePrescription = (w: number, sId: string, i: number, u: Parameters<typeof updatePrescriptionRaw>[3]) =>
    updatePrescriptionRaw(w, sId, i, u, editScope);

  // Scoring the ~250-exercise database is too heavy to redo on every render
  const hiddenIds = useAppStore((s) => s.hiddenExercises?.ids);
  const alternatives: ExerciseRecommendation[] = useMemo(
    () => (showAlternatives && ex.exerciseId
      ? getRecommendedAlternatives(ex.exerciseId, userEquipment, 40)
          .filter(r => !(hiddenIds ?? []).includes(r.exercise.id))
          .slice(0, 8)
      : []),
    [showAlternatives, ex.exerciseId, userEquipment, hiddenIds]
  );

  // Last performance per exercise from ONE reverse pass over the logs — the old
  // per-call [...workoutLogs].reverse() clone ran once per card plus once per
  // alternative row on every render
  const lastPerfByExercise = useMemo(() => {
    const map = new Map<string, { weight: number; reps: number; rpe: number; date: Date }>();
    for (let i = workoutLogs.length - 1; i >= 0; i--) {
      const log = workoutLogs[i];
      if (log._deleted) continue;
      for (const found of log.exercises) {
        if (map.has(found.exerciseId)) continue;
        // Only COMPLETED sets count as performance — an all-skipped exercise must
        // neither show as "Last: X" nor shadow an older log with real work
        const completedSets = found.sets.filter(s => s.completed);
        if (completedSets.length === 0) continue;
        const bestSet = completedSets.reduce((best, s) => (s.weight > best.weight ? s : best), completedSets[0]);
        map.set(found.exerciseId, { weight: bestSet.weight, reps: bestSet.reps, rpe: bestSet.rpe || 0, date: new Date(log.date) });
      }
    }
    return map;
  }, [workoutLogs]);

  const getAltHistory = (exerciseId: string) => lastPerfByExercise.get(exerciseId) || null;

  const lastPerf = ex.exerciseId ? getAltHistory(ex.exerciseId) : null;

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
            <p className="font-medium text-grappler-100" data-testid="exercise-name">{ex.exercise?.name || 'Unknown Exercise'}</p>
            <p className="text-sm text-grappler-400">
              {ex.sets} × {ex.prescription ? formatTarget(ex.prescription.targetReps, ex.exercise) : '?'} @ RPE {ex.prescription?.rpe ?? '?'}
            </p>
            <p className="text-xs text-grappler-400">
              Rest {Math.floor((ex.prescription?.restSeconds ?? 120) / 60)}:{((ex.prescription?.restSeconds ?? 120) % 60).toString().padStart(2, '0')}
              {ex.prescription?.percentageOf1RM ? ` · ~${prescribedPercentOf1RM(ex.prescription.targetReps, ex.prescription.rpe)}% 1RM` : ''}
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
          <div className="flex items-center gap-1 flex-shrink-0">

            <button
              onClick={() => { setShowEditor(!showEditor); setShowAlternatives(false); setShowMenu(false); }}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showEditor
                  ? 'bg-primary-500/20 text-primary-400'
                  : 'text-grappler-500 hover:text-grappler-300 hover:bg-grappler-600/50'
              )}
              title="Edit prescription"
              aria-label="Edit prescription"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setShowAlternatives(!showAlternatives); setShowEditor(false); setShowMenu(false); }}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showAlternatives
                  ? 'bg-accent-500/20 text-accent-400'
                  : 'text-grappler-500 hover:text-grappler-300 hover:bg-grappler-600/50'
              )}
              title="Swap exercise"
              aria-label="Swap exercise"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>
            <div>
              <button
                onClick={() => { setShowMenu(m => !m); setShowEditor(false); setShowAlternatives(false); }}
                className={cn('p-2 rounded-lg transition-colors', showMenu ? 'bg-grappler-600 text-grappler-100' : 'text-grappler-500 hover:text-grappler-300 hover:bg-grappler-600/50')}
                aria-label="More actions"
                aria-expanded={showMenu}
                data-testid="exercise-menu"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showMenu && (
        <div className="border-t border-grappler-600/50 px-2 py-1.5 grid grid-cols-4 gap-1" role="menu" data-testid="exercise-actions">
          <button role="menuitem" onClick={() => { setShowMenu(false); setShowFormVideo(true); }} className="flex flex-col items-center justify-center gap-0.5 rounded-md py-2 min-h-[44px] text-[11px] font-medium text-grappler-200 hover:bg-grappler-600/50">
            <Video className="w-3.5 h-3.5" /> Form
          </button>
          {index > 0 && (
            <button role="menuitem" onClick={() => move(index - 1)} className="flex flex-col items-center justify-center gap-0.5 rounded-md py-2 min-h-[44px] text-[11px] font-medium text-grappler-200 hover:bg-grappler-600/50">
              <ArrowUp className="w-3.5 h-3.5" /> Move up
            </button>
          )}
          {index < totalExercises - 1 && (
            <button role="menuitem" onClick={() => move(index + 1)} className="flex flex-col items-center justify-center gap-0.5 rounded-md py-2 min-h-[44px] text-[11px] font-medium text-grappler-200 hover:bg-grappler-600/50">
              <ArrowDown className="w-3.5 h-3.5" /> Move down
            </button>
          )}
          {totalExercises > 1 && (
            <button
              role="menuitem"
              aria-label="Remove exercise"
              onClick={() => { setShowMenu(false); if (onRemove) onRemove(weekIndex, sessionId, index, ex); else removeExercise(weekIndex, sessionId, index); }}
              className="col-start-4 flex flex-col items-center justify-center gap-0.5 rounded-md py-2 min-h-[44px] text-[11px] font-medium text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </button>
          )}
        </div>
      )}

      {/* Inline Prescription Editor */}
      <AnimatePresence>
        {showEditor && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-grappler-600/50 px-3 py-3 space-y-3">
              <ScopeToggle value={editScope} onChange={setEditScope} weeksLeft={weeksLeft} />
              {editScope === 'remaining' && (
                <p className="text-[11px] text-grappler-400 -mt-1">Changes carry into later weeks as +/− steps, so their progression stays. Deload weeks keep theirs.</p>
              )}
              <div className="grid grid-cols-3 gap-2">
                {/* Sets */}
                <div>
                  <label className="text-xs text-grappler-400 block mb-1">Sets</label>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updatePrescription(weekIndex, sessionId, index, { sets: Math.max(1, (ex.sets ?? 3) - 1) })} className="w-7 h-7 rounded bg-grappler-700 text-grappler-300 hover:bg-grappler-600 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                    <span className="text-sm font-bold text-grappler-100 w-6 text-center">{ex.sets ?? 3}</span>
                    <button onClick={() => updatePrescription(weekIndex, sessionId, index, { sets: Math.min(10, (ex.sets ?? 3) + 1) })} className="w-7 h-7 rounded bg-grappler-700 text-grappler-300 hover:bg-grappler-600 flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                  </div>
                </div>
                {/* Reps */}
                <div>
                  <label className="text-xs text-grappler-400 block mb-1">Reps</label>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { const p = ex.prescription; if (!p) return; updatePrescription(weekIndex, sessionId, index, { targetReps: Math.max(1, p.targetReps - 1), minReps: Math.max(1, p.minReps - 1), maxReps: Math.max(1, p.maxReps - 1) }); }} className="w-7 h-7 rounded bg-grappler-700 text-grappler-300 hover:bg-grappler-600 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                    <span className="text-sm font-bold text-grappler-100 w-6 text-center">{ex.prescription?.targetReps ?? '?'}</span>
                    <button onClick={() => { const p = ex.prescription; if (!p) return; updatePrescription(weekIndex, sessionId, index, { targetReps: p.targetReps + 1, minReps: p.minReps + 1, maxReps: p.maxReps + 1 }); }} className="w-7 h-7 rounded bg-grappler-700 text-grappler-300 hover:bg-grappler-600 flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                  </div>
                </div>
                {/* RPE */}
                <div>
                  <label className="text-xs text-grappler-400 block mb-1">RPE</label>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updatePrescription(weekIndex, sessionId, index, { rpe: Math.max(5, (ex.prescription?.rpe ?? 7) - 0.5) })} className="w-7 h-7 rounded bg-grappler-700 text-grappler-300 hover:bg-grappler-600 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                    <span className="text-sm font-bold text-grappler-100 w-6 text-center">{ex.prescription?.rpe ?? '?'}</span>
                    <button onClick={() => updatePrescription(weekIndex, sessionId, index, { rpe: Math.min(10, (ex.prescription?.rpe ?? 7) + 0.5) })} className="w-7 h-7 rounded bg-grappler-700 text-grappler-300 hover:bg-grappler-600 flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>
              {/* Rest time */}
              <div>
                <label className="text-xs text-grappler-400 block mb-1">Rest (seconds)</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => updatePrescription(weekIndex, sessionId, index, { restSeconds: Math.max(30, (ex.prescription?.restSeconds ?? 120) - 15) })} className="w-7 h-7 rounded bg-grappler-700 text-grappler-300 hover:bg-grappler-600 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                  <span className="text-sm font-bold text-grappler-100 w-10 text-center">{ex.prescription?.restSeconds ?? 120}s</span>
                  <button onClick={() => updatePrescription(weekIndex, sessionId, index, { restSeconds: Math.min(300, (ex.prescription?.restSeconds ?? 120) + 15) })} className="w-7 h-7 rounded bg-grappler-700 text-grappler-300 hover:bg-grappler-600 flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <ScopeToggle value={swapScope} onChange={setSwapScope} weeksLeft={weeksLeft} />
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
                          onSwap(weekIndex, sessionId, index, rec.exercise.id, swapScope);
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
                          {rec.exercise.primaryMuscles?.join(', ')}
                          {(rec.exercise.secondaryMuscles?.length ?? 0) > 0 && (
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
      {showFormVideo && ex.exercise && (
        <YouTubeEmbed
          exerciseName={ex.exercise.name}
          videoUrl={ex.exercise.videoUrl}
          onClose={() => setShowFormVideo(false)}
        />
      )}
    </div>
  );
}
