'use client';

import { EyeOff, X } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { getAllExercises } from '@/lib/exercises';

/** Settings row: the athlete's "don't recommend" list, with one-tap unhide. */
export default function HiddenExercisesSetting() {
  const { ids, unhideExercise } = useAppStore(useShallow(s => ({
    ids: s.hiddenExercises?.ids ?? [],
    unhideExercise: s.unhideExercise,
  })));
  const byId = new Map(getAllExercises().map(e => [e.id, e.name]));

  return (
    <div>
      <p className="text-xs text-grappler-400 mb-2 flex items-center gap-1.5">
        <EyeOff className="w-3.5 h-3.5" /> Hidden exercises
      </p>
      {ids.length === 0 ? (
        <p className="text-xs text-grappler-500">
          None. Tap the eye icon in the swap sheet to stop an exercise being recommended.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {ids.map(id => (
            <button
              key={id}
              onClick={() => unhideExercise(id)}
              className="flex items-center gap-1.5 pl-3 pr-2 min-h-[36px] rounded-full bg-grappler-800 border border-grappler-700 text-xs text-grappler-200 hover:border-grappler-500"
              aria-label={`Unhide ${byId.get(id) ?? id}`}
            >
              {byId.get(id) ?? id}
              <X className="w-3.5 h-3.5 text-grappler-400" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
