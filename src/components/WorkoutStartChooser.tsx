'use client';

/**
 * WorkoutStartChooser — bottom sheet shown when the user taps Start Workout.
 * Three paths:
 *   1. My plan        — start the scheduled session (or hides if none)
 *   2. Smart pick     — generates / adapts via lib/smart-pick.ts and previews
 *                       the rationale + first exercises before commit
 *   3. Custom         — opens WorkoutBuilder
 *
 * Single source of truth used by both OneThingBanner and LiftPhase so the
 * Home tab and Today card behave identically.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Sparkles, SlidersHorizontal, X, ChevronRight, Dumbbell, Clock, Target, Activity,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { generateSmartPick, type SmartPickResult } from '@/lib/smart-pick';
import type { WorkoutSession } from '@/lib/types';
import type { OverlayView } from './dashboard-types';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  /** The user's scheduled session for today, if any. */
  scheduledSession: WorkoutSession | null;
  /** Navigate to an overlay (used to open WorkoutBuilder). */
  onNavigate: (view: OverlayView, context?: string) => void;
  /** Toast helper from the parent. */
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function WorkoutStartChooser({ open, onClose, scheduledSession, onNavigate, showToast }: Props) {
  const {
    user, injuryLog, workoutLogs, latestWhoopData, wearableHistory,
    rawMeals, macroTargets, waterLog, quickLogs, trainingSessions,
    startWorkout,
  } = useAppStore(useShallow(s => ({
    user: s.user,
    injuryLog: s.injuryLog,
    workoutLogs: s.workoutLogs,
    latestWhoopData: s.latestWhoopData,
    wearableHistory: s.wearableHistory,
    rawMeals: s.meals,
    macroTargets: s.macroTargets,
    waterLog: s.waterLog,
    quickLogs: s.quickLogs,
    trainingSessions: s.trainingSessions,
    startWorkout: s.startWorkout,
  })));
  // Raw stable ref in the selector; derive the filtered view here (a .filter()
  // in the selector returns a fresh array and defeats useShallow).
  const meals = useMemo(() => rawMeals.filter(m => !m._deleted), [rawMeals]);

  // Lazy-compute the smart pick only when user reveals it (heavy in worst case
  // due to injury-aware generation). Cached after first compute.
  const [smartPick, setSmartPick] = useState<SmartPickResult | null>(null);
  const [smartPickRequested, setSmartPickRequested] = useState(false);

  const computeSmartPick = () => {
    if (smartPickRequested) return;
    setSmartPickRequested(true);
    try {
      const result = generateSmartPick({
        user,
        injuryLog,
        scheduledSession,
        readinessOpts: {
          user,
          workoutLogs,
          trainingSessions,
          wearableData: latestWhoopData,
          wearableHistory,
          meals,
          macroTargets,
          waterLog,
          injuryLog,
          quickLogs,
        },
      });
      setSmartPick(result);
    } catch (err) {
      console.error('[WorkoutStartChooser] smart-pick threw:', err);
      showToast('Smart pick failed. Try Custom or My plan instead.', 'error');
    }
  };

  const startWithFeedback = (session: WorkoutSession) => {
    try {
      const result = startWorkout(session);
      if (result === false) {
        showToast('Finish your current workout first', 'warning');
        return;
      }
      onClose();
    } catch (err) {
      console.error('[WorkoutStartChooser] startWorkout threw:', err);
      showToast('Could not start workout. Try again or restart the app.', 'error');
    }
  };

  const exerciseCount = useMemo(() => smartPick?.session.exercises.length ?? 0, [smartPick]);
  const previewExercises = useMemo(() => smartPick?.session.exercises.slice(0, 4) ?? [], [smartPick]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          // Opacity-only — see feedback_ibra_lifts_sticky_transform: a transform
          // here would break the inner sheet's containing block.
          className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-3"
          onClick={() => { onClose(); setSmartPickRequested(false); setSmartPick(null); }}
          role="dialog"
          aria-modal="true"
          aria-label="Choose how to start your workout"
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-grappler-900 rounded-2xl border border-grappler-800 shadow-2xl overflow-hidden flex flex-col max-h-[85dvh]"
          >
            {/* Sticky chrome */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
              <h2 className="text-base font-bold text-grappler-50">Start workout</h2>
              <button
                aria-label="Close"
                onClick={() => { onClose(); setSmartPickRequested(false); setSmartPick(null); }}
                className="p-1.5 -mr-1 rounded-lg hover:bg-grappler-800 transition-colors"
              >
                <X className="w-4 h-4 text-grappler-400" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
              {/* My plan */}
              {scheduledSession && (
                <button
                  onClick={() => startWithFeedback(scheduledSession)}
                  className="w-full text-left rounded-xl bg-gradient-to-br from-primary-500/15 to-primary-500/5 border border-primary-500/30 p-4 hover:border-primary-500/50 active:scale-[0.99] transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary-500/20 flex items-center justify-center shrink-0">
                      <Play className="w-4 h-4 text-primary-300 fill-primary-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary-300">My plan</span>
                      </div>
                      <h3 className="text-sm font-bold text-grappler-50 truncate">{scheduledSession.name}</h3>
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-grappler-400">
                        <span className="flex items-center gap-1"><Dumbbell className="w-3 h-3" />{scheduledSession.exercises.length} exercises</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />~{scheduledSession.estimatedDuration}min</span>
                        <span className="flex items-center gap-1"><Target className="w-3 h-3" />{scheduledSession.exercises.reduce((s, e) => s + e.sets, 0)} sets</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-grappler-500 mt-1" />
                  </div>
                </button>
              )}

              {/* Smart pick */}
              <div className={cn(
                'rounded-xl border transition-colors',
                smartPick
                  ? 'bg-gradient-to-br from-violet-500/12 to-violet-500/5 border-violet-500/30'
                  : 'bg-grappler-800/60 border-grappler-700 hover:border-violet-500/30',
              )}>
                <button
                  onClick={computeSmartPick}
                  disabled={smartPickRequested && !smartPick}
                  className="w-full text-left p-4 active:scale-[0.99] transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-violet-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-violet-300">Smart pick</span>
                      </div>
                      <h3 className="text-sm font-bold text-grappler-50">
                        {smartPick ? smartPick.session.name : 'Pick for me'}
                      </h3>
                      <p className="mt-0.5 text-[11px] text-grappler-400 leading-snug">
                        {smartPick
                          ? `${exerciseCount} exercises · ~${smartPick.session.estimatedDuration}min`
                          : 'Built from your readiness, active injuries, and recent training.'}
                      </p>
                    </div>
                    {!smartPick && (
                      smartPickRequested
                        ? <Activity className="w-4 h-4 text-violet-400 animate-pulse mt-1" />
                        : <ChevronRight className="w-4 h-4 text-grappler-500 mt-1" />
                    )}
                  </div>
                </button>

                {smartPick && (
                  <div className="px-4 pb-4 space-y-3">
                    {/* Rationale */}
                    {smartPick.rationale.length > 0 && (
                      <ul className="space-y-1 border-t border-violet-500/15 pt-3">
                        {smartPick.rationale.map((reason, i) => (
                          <li key={i} className="text-[11px] text-grappler-400 leading-snug flex gap-1.5">
                            <span className="text-violet-400 shrink-0">·</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Exercise preview */}
                    {previewExercises.length > 0 && (
                      <div className="rounded-lg bg-black/25 border border-grappler-700/40 overflow-hidden">
                        {previewExercises.map((ex, i) => (
                          <div
                            key={i}
                            className={cn(
                              'flex items-center gap-2 px-3 py-1.5',
                              i < previewExercises.length - 1 && 'border-b border-grappler-700/30',
                            )}
                          >
                            <span className="text-[10px] font-bold text-grappler-600 w-3 tabular-nums">{i + 1}</span>
                            <span className="text-xs text-grappler-200 flex-1 truncate">{ex.exercise.name}</span>
                            <span className="text-[10px] text-grappler-500 tabular-nums">{ex.sets}×{ex.prescription.targetReps}</span>
                          </div>
                        ))}
                        {exerciseCount > previewExercises.length && (
                          <div className="px-3 py-1 text-center border-t border-grappler-700/30">
                            <span className="text-[10px] text-grappler-500">+{exerciseCount - previewExercises.length} more</span>
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => startWithFeedback(smartPick.session)}
                      className="w-full py-2.5 rounded-lg bg-violet-500 hover:bg-violet-400 text-white text-sm font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      Start this
                    </button>
                  </div>
                )}
              </div>

              {/* Custom */}
              <button
                onClick={() => { onNavigate('builder'); onClose(); }}
                className="w-full text-left rounded-xl bg-grappler-800/60 border border-grappler-700 hover:border-amber-500/30 p-4 active:scale-[0.99] transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                    <SlidersHorizontal className="w-4 h-4 text-amber-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Custom</span>
                    </div>
                    <h3 className="text-sm font-bold text-grappler-50">Build your own</h3>
                    <p className="mt-0.5 text-[11px] text-grappler-400">Pick exercises, sets, reps from scratch.</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-grappler-500 mt-1" />
                </div>
              </button>

              {/* No-plan helper text */}
              {!scheduledSession && (
                <p className="text-[11px] text-grappler-500 text-center pt-1 px-2 leading-snug">
                  No lift workout scheduled today. Smart pick will build one for you, or browse <button onClick={() => { onNavigate('program_browser'); onClose(); }} className="underline underline-offset-2 hover:text-grappler-300">Programs</button>.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
