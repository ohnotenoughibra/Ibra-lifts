'use client';

/**
 * ExerciseSwapSheet — one swap UI for the live workout.
 *
 * - Empty query: ranked alternatives (built-in + custom), minus exercises
 *   already in today's session and minus the athlete's hidden list, 8 at a
 *   time with "Show more".
 * - Typed query: searches the WHOLE library (name, muscle, pattern,
 *   equipment; aliases like "db", "rdl", "hams"). Hidden exercises still show
 *   up here — marked, with one-tap unhide — because a deliberate search is
 *   intent. Exercises that need gear you don't have are labelled, not hidden.
 * - "Don't recommend" hides an exercise from generation and suggestions.
 * - Esc and the backdrop close it.
 */

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, X, EyeOff, Eye, TrendingUp } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import {
  getRecommendedAlternatives, searchExercises, type ExerciseRecommendation,
} from '@/lib/exercises';
import type { Equipment, EquipmentType, Exercise, WeightUnit } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  currentExercise: Exercise;
  /** Exercise ids already in today's session (excluded from suggestions). */
  sessionExerciseIds: string[];
  equipment: Equipment;
  availableEquipment?: EquipmentType[];
  weightUnit: WeightUnit;
  getHistory?: (exerciseId: string) => { weight: number; reps: number; date: Date } | null;
  onPick: (exerciseId: string, exerciseName: string) => void;
  onClose: () => void;
}

const PAGE = 8;

export default function ExerciseSwapSheet({
  currentExercise, sessionExerciseIds, equipment, availableEquipment, weightUnit,
  getHistory, onPick, onClose,
}: Props) {
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);
  const { hiddenIds, hideExercise, unhideExercise } = useAppStore(useShallow(s => ({
    hiddenIds: s.hiddenExercises?.ids ?? [],
    hideExercise: s.hideExercise,
    unhideExercise: s.unhideExercise,
  })));
  const hidden = useMemo(() => new Set(hiddenIds), [hiddenIds]);
  const inSession = useMemo(() => new Set(sessionExerciseIds), [sessionExerciseIds]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const needsGear = (ex: Exercise) => {
    if (!availableEquipment || availableEquipment.length === 0) return [];
    return (ex.equipmentTypes ?? []).filter(t => t !== 'bodyweight' && !availableEquipment.includes(t));
  };

  const recommendations = useMemo<ExerciseRecommendation[]>(() =>
    getRecommendedAlternatives(currentExercise.id, equipment, 200, availableEquipment)
      .filter(r => !hidden.has(r.exercise.id) && !inSession.has(r.exercise.id)),
  [currentExercise.id, equipment, availableEquipment, hidden, inSession]);

  const results = useMemo(() =>
    query.trim() ? searchExercises(query).filter(e => e.id !== currentExercise.id) : [],
  [query, currentExercise.id]);

  const isHiddenCurrent = hidden.has(currentExercise.id);
  const total = query.trim() ? results.length : recommendations.length;

  const renderRow = (ex: Exercise, score?: number, reason?: string) => {
    const history = getHistory?.(ex.id) ?? null;
    const gear = needsGear(ex);
    const isHidden = hidden.has(ex.id);
    return (
      <div key={ex.id} className={cn(
        'w-full rounded-xl border text-left transition-all flex items-stretch',
        isHidden ? 'border-grappler-800 opacity-60' : 'border-grappler-700 hover:border-primary-500',
      )}>
        <button
          onClick={() => onPick(ex.id, ex.name)}
          className="flex-1 p-3 text-left min-w-0"
          aria-label={`Swap to ${ex.name}`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-grappler-100 truncate">{ex.name}</p>
            {score !== undefined && (
              <span className={cn(
                'text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0',
                score >= 80 ? 'bg-green-500/20 text-green-400' :
                score >= 60 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-grappler-700 text-grappler-400',
              )}>{score}%</span>
            )}
          </div>
          {reason && <p className="text-xs text-grappler-400 mt-0.5">{reason}</p>}
          <p className="text-xs text-grappler-400 mt-0.5">
            {ex.primaryMuscles.join(', ')}
            {inSession.has(ex.id) && <span className="text-sky-400"> · already in today</span>}
            {gear.length > 0 && <span className="text-yellow-400"> · needs {gear.join(', ').replace(/_/g, ' ')}</span>}
            {isHidden && <span className="text-grappler-300"> · hidden</span>}
          </p>
          {history && (
            <p className="text-xs text-primary-400 mt-0.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Last: {history.weight} {weightUnit} × {history.reps}
            </p>
          )}
        </button>
        <button
          onClick={() => (isHidden ? unhideExercise(ex.id) : hideExercise(ex.id))}
          className="px-3 flex items-center justify-center text-grappler-400 hover:text-grappler-100 border-l border-grappler-800 min-w-[44px]"
          aria-label={isHidden ? `Unhide ${ex.name}` : `Don't recommend ${ex.name}`}
          title={isHidden ? 'Unhide' : "Don't recommend"}
        >
          {isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Swap exercise"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="card p-4 w-full max-w-md max-h-[85vh] flex flex-col"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-grappler-50">Swap Exercise</h2>
            <p className="text-xs text-grappler-400 truncate">
              Replace <span className="text-grappler-200 font-medium">{currentExercise.name}</span>
            </p>
          </div>
          <button onClick={onClose} aria-label="Close swap" className="p-2 -m-1 text-grappler-400 hover:text-grappler-100 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={() => (isHiddenCurrent ? unhideExercise(currentExercise.id) : hideExercise(currentExercise.id))}
          className="self-start text-xs text-grappler-400 hover:text-grappler-100 flex items-center gap-1 mb-3 min-h-[32px]"
        >
          {isHiddenCurrent ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {isHiddenCurrent
            ? `${currentExercise.name} won't be recommended — undo`
            : `Don't recommend ${currentExercise.name} again`}
        </button>

        <div className="relative mb-3">
          <Search className="w-4 h-4 text-grappler-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setShown(PAGE); }}
            placeholder="Search all exercises — name, muscle, equipment"
            aria-label="Search exercises"
            className="input w-full pl-9 pr-9"
            type="search"
            enterKeyHint="search"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-grappler-500">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="overflow-y-auto space-y-2 -mx-1 px-1 flex-1">
          {query.trim() ? (
            results.length > 0 ? (
              <>
                <p className="text-xs text-grappler-500">{results.length} match{results.length === 1 ? '' : 'es'} in the full library</p>
                {results.slice(0, shown).map(ex => renderRow(ex))}
              </>
            ) : (
              <p className="text-sm text-grappler-400 text-center py-6">No exercise matches &ldquo;{query}&rdquo;.</p>
            )
          ) : recommendations.length > 0 ? (
            recommendations.slice(0, shown).map(r => renderRow(r.exercise, r.matchScore, r.reasons[0]))
          ) : (
            <p className="text-sm text-grappler-400 text-center py-6">
              No close alternatives with your equipment — search above to pick anything.
            </p>
          )}
          {total > shown && (
            <button onClick={() => setShown(n => n + PAGE)} className="w-full text-sm text-primary-400 py-2 min-h-[44px]">
              Show more ({total - shown} more)
            </button>
          )}
        </div>

        <button onClick={onClose} className="btn btn-secondary btn-md w-full mt-3">
          Keep Current Exercise
        </button>
      </motion.div>
    </motion.div>
  );
}
