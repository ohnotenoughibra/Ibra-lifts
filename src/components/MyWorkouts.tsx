'use client';

import { useState } from 'react';
import { Dumbbell, Plus, Play, Pencil, Copy, Trash2, Clock } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '@/lib/utils';
import { useToast } from './Toast';
import type { OverlayView } from './dashboard-types';

/**
 * My Workouts — the home for workouts the user builds themselves.
 *
 * Every workout made in the builder is saved here (save-by-default), so a build
 * is something you OWN and repeat, not a throwaway. Each card: start it now,
 * edit it, duplicate it, or delete it. "New workout" opens the builder fresh.
 *
 * Storage is the existing `sessionTemplates` array — a saved workout IS a
 * session template; this is just its discoverable front door.
 */
export default function MyWorkouts({
  onNavigate,
}: {
  onNavigate?: (view: OverlayView, context?: string) => void;
}) {
  const { sessionTemplates, useTemplate, deleteTemplate, saveAsTemplate } = useAppStore(
    useShallow(s => ({
      sessionTemplates: s.sessionTemplates,
      useTemplate: s.useTemplate,
      deleteTemplate: s.deleteTemplate,
      saveAsTemplate: s.saveAsTemplate,
    }))
  );
  const { showToast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Most-recently-used first, then newest.
  const workouts = [...sessionTemplates].sort((a, b) => {
    const at = a.lastUsed ? new Date(a.lastUsed).getTime() : new Date(a.createdAt).getTime();
    const bt = b.lastUsed ? new Date(b.lastUsed).getTime() : new Date(b.createdAt).getTime();
    return bt - at;
  });

  const start = (id: string) => {
    if (useTemplate(id) === false) {
      showToast('Finish your current workout first', 'warning');
    }
  };

  const duplicate = (id: string) => {
    const t = sessionTemplates.find(w => w.id === id);
    if (!t) return;
    saveAsTemplate(`${t.name} copy`, { ...t.session, id: `${t.session.id}-copy-${Date.now()}` });
    showToast('Duplicated', 'success');
  };

  return (
    <div className="card p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-grappler-300 flex items-center gap-1.5">
          <Dumbbell className="w-3.5 h-3.5 text-primary-400" /> My Workouts
        </p>
        <button
          onClick={() => onNavigate?.('builder')}
          className="text-[11px] font-medium text-primary-400 hover:text-primary-300 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> New workout
        </button>
      </div>

      {workouts.length === 0 ? (
        <button
          onClick={() => onNavigate?.('builder')}
          className="w-full rounded-xl border border-dashed border-grappler-700 hover:border-primary-500/50 hover:bg-grappler-800/40 transition-colors px-3 py-5 text-center"
        >
          <p className="text-sm font-medium text-grappler-200">Build your own workout</p>
          <p className="text-xs text-grappler-500 mt-0.5">
            Pick any exercises, set your reps. It&apos;s saved here to repeat anytime.
          </p>
        </button>
      ) : (
        <div className="space-y-2">
          {workouts.map(w => {
            const exCount = w.session.exercises.length;
            const mins = Math.round(w.session.estimatedDuration || 0);
            return (
              <div
                key={w.id}
                className="rounded-xl bg-grappler-800/60 border border-grappler-700/60 overflow-hidden"
              >
                <button
                  onClick={() => start(w.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-grappler-800 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary-500/15 flex items-center justify-center flex-shrink-0">
                    <Play className="w-4 h-4 text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-grappler-100 truncate">{w.name}</p>
                    <p className="text-xs text-grappler-500 flex items-center gap-1">
                      {exCount} exercise{exCount === 1 ? '' : 's'}
                      {mins > 0 && (
                        <>
                          <span className="text-grappler-700">·</span>
                          <Clock className="w-3 h-3" /> ~{mins}m
                        </>
                      )}
                      {w.timesUsed > 0 && (
                        <>
                          <span className="text-grappler-700">·</span>
                          {w.timesUsed}× done
                        </>
                      )}
                    </p>
                  </div>
                </button>

                {confirmDelete === w.id ? (
                  <div className="flex items-center justify-end gap-2 px-3 pb-2.5">
                    <span className="text-xs text-grappler-400 mr-auto">Delete this workout?</span>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-xs px-2 py-1 rounded-md text-grappler-300 hover:bg-grappler-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => { deleteTemplate(w.id); setConfirmDelete(null); showToast('Deleted', 'success'); }}
                      className="text-xs px-2 py-1 rounded-md bg-red-500/20 text-red-300 hover:bg-red-500/30"
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-2 pb-2 border-t border-grappler-700/40 pt-1.5">
                    <ActionBtn icon={<Pencil className="w-3.5 h-3.5" />} label="Edit" onClick={() => onNavigate?.('builder', w.id)} />
                    <ActionBtn icon={<Copy className="w-3.5 h-3.5" />} label="Duplicate" onClick={() => duplicate(w.id)} />
                    <ActionBtn
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                      label="Delete"
                      danger
                      onClick={() => setConfirmDelete(w.id)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  icon, label, onClick, danger,
}: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-colors',
        danger ? 'text-grappler-500 hover:text-red-300 hover:bg-red-500/10' : 'text-grappler-400 hover:text-grappler-200 hover:bg-grappler-700',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
