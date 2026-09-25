'use client';
/* Extracted verbatim from ActiveWorkout.tsx (showFinishModal block) — no behavior change. */
import type * as React from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { recommendFinisher, totalSeconds as sprintTotalSeconds } from '@/lib/sprint-protocols';
import { sessionDeltas } from '@/lib/live-session';
import { Check, Trophy, Zap, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkoutSession, ExerciseLog, PreWorkoutCheckIn, WeightUnit, WearableData, MuscleGroup, PostWorkoutFeedback } from '@/lib/types';
import type { ActiveWorkoutThrottle } from '@/lib/store';
import type { ReadinessScore } from '@/lib/auto-adjust';

export interface FinishWorkoutModalProps {
  /** Always set here — ActiveWorkout returns early without one. */
  activeWorkout: NonNullable<{ session: WorkoutSession; baseSession: WorkoutSession; exerciseLogs: ExerciseLog[]; startTime: Date; mesocycleId: string; weekNumber?: number | undefined; dayNumber?: number | undefined; preCheckIn?: PreWorkoutCheckIn | undefined; pausedAt?: Date | undefined; totalPausedMs?: number | undefined; throttle?: ActiveWorkoutThrottle | undefined; overviewDone?: boolean | undefined; position?: { exerciseIndex: number; setIndex: number; } | undefined; swapUndo?: { session: WorkoutSession; exerciseLogs: ExerciseLog[]; } | undefined; matAdjust?: { kind: "taper" | "mat"; reason: string; summary: string; original: WorkoutSession; undone?: boolean | undefined; } | undefined; } | null>;
  durationOverride: number | null;
  totalVolumeCompleted: number;
  weightUnit: WeightUnit;
  completedSets: number;
  totalSets: number;
  finisherLogged: boolean;
  latestWhoopData: WearableData | null;
  readiness: ReadinessScore | null;
  finisherMatContext: () => { daysToCompetition: number | undefined; hardMatWithin24h: boolean; };
  setShowFinishModal: (v: boolean) => void;
  setShowFinisher: React.Dispatch<React.SetStateAction<boolean>>;
  postWorkoutVolumeGaps: { muscle: MuscleGroup; deficit: number; currentSets: number; mev: number; recommendedExercise: string | null; }[];
  volumeGapDismissed: boolean;
  setShowVolumeGapPrompt: React.Dispatch<React.SetStateAction<boolean>>;
  sessionRpeTouched: React.MutableRefObject<boolean>;
  setFeedback: React.Dispatch<React.SetStateAction<{ overallRPE: number; soreness: number; energy: number; notes: string; overallPerformance: "as_expected" | "worse_than_expected" | "better_than_expected"; mood: number; wouldRepeat: boolean; }>>;
  feedback: { overallRPE: number; soreness: number; energy: number; notes: string; overallPerformance: "as_expected" | "worse_than_expected" | "better_than_expected"; mood: number; wouldRepeat: boolean; };
  setShowMoreFeedback: React.Dispatch<React.SetStateAction<boolean>>;
  showMoreFeedback: boolean;
  setDurationOverride: React.Dispatch<React.SetStateAction<number | null>>;
  completeWorkout: (feedback: { overallRPE: number; soreness: number; energy: number; notes?: string | undefined; postFeedback?: PostWorkoutFeedback | undefined; durationOverride?: number | undefined; }) => void;
}

export default function FinishWorkoutModal({ activeWorkout, durationOverride, totalVolumeCompleted, weightUnit, completedSets, totalSets, finisherLogged, latestWhoopData, readiness, finisherMatContext, setShowFinishModal, setShowFinisher, postWorkoutVolumeGaps, volumeGapDismissed, setShowVolumeGapPrompt, sessionRpeTouched, setFeedback, feedback, setShowMoreFeedback, showMoreFeedback, setDurationOverride, completeWorkout }: FinishWorkoutModalProps) {
  return (
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
        className="card p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
      >
        <h2 className="text-xl font-bold text-grappler-50 mb-4">Finish Workout</h2>

        {/* Workout Summary */}
        {(() => {
          const elapsedMs = Date.now() - new Date(activeWorkout!.startTime).getTime();
          const durationMin = durationOverride ?? Math.round(elapsedMs / 1000 / 60);
          const exercisesCompleted = activeWorkout!.exerciseLogs.filter(
            log => log.sets.some(s => s.completed)
          ).length;
          const prCount = activeWorkout!.exerciseLogs.filter(log => log.personalRecord).length;
          return (
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-grappler-800/50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-white">{durationMin}</div>
                <div className="text-xs text-grappler-400">Minutes</div>
              </div>
              <div className="bg-grappler-800/50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-white">{totalVolumeCompleted.toLocaleString()}</div>
                <div className="text-xs text-grappler-400">{weightUnit} Volume</div>
              </div>
              <div className="bg-grappler-800/50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-white">{completedSets}/{totalSets}</div>
                <div className="text-xs text-grappler-400">Sets</div>
              </div>
              <div className="bg-grappler-800/50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-white">{exercisesCompleted}</div>
                <div className="text-xs text-grappler-400">Exercises</div>
              </div>
              {prCount > 0 && (
                <div className="col-span-2 bg-primary-500/10 border border-primary-500/30 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-primary-400">{prCount}</div>
                  <div className="text-xs text-primary-400">PR{prCount > 1 ? 's' : ''} Hit</div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Per-lift: today's top set vs last time */}
        {(() => {
          const deltas = sessionDeltas(activeWorkout!.exerciseLogs, useAppStore.getState().workoutLogs, weightUnit)
            .filter(d => d.today);
          if (deltas.length === 0) return null;
          return (
            <div className="mb-5" data-testid="finish-deltas">
              <p className="text-xs uppercase tracking-wide text-grappler-500 mb-2">vs last time</p>
              <ul className="space-y-1.5">
                {deltas.map(d => (
                  <li key={d.exerciseId} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-grappler-200 truncate flex items-center gap-1">
                      {d.pr && <Trophy className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />}
                      {d.name}
                    </span>
                    <span className="flex-shrink-0 text-xs text-grappler-400">
                      {d.today!.weight}×{d.today!.reps}
                      {d.change === null ? (
                        <span className="ml-2 text-grappler-500">first time</span>
                      ) : (
                        <span className={cn('ml-2 font-semibold',
                          d.change > 0 ? 'text-green-400' : d.change < 0 ? 'text-red-400' : 'text-grappler-400')}>
                          {d.change > 0 ? '+' : ''}{d.change} {weightUnit} e1RM
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}

        {/* Conditioning finisher — picked for today's readiness and leg load */}
        {(() => {
          if (finisherLogged) {
            return (
              <p className="mb-5 text-xs text-green-400 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Conditioning finisher logged
              </p>
            );
          }
          const heavyLowerSets = activeWorkout!.session.exercises.reduce((n, ex, i) => {
            const lower = ex.exercise.movementPattern === 'squat' || ex.exercise.movementPattern === 'hinge';
            const done = activeWorkout!.exerciseLogs[i]?.sets.filter(st => st.completed).length ?? 0;
            return n + (lower && ex.exercise.category === 'compound' ? done : 0);
          }, 0);
          const score = latestWhoopData?.recoveryScore ?? readiness?.score;
          // Offer a finisher only once the lifting is mostly done.
          if (totalSets === 0 || completedSets / totalSets < 0.6) return null;
          const pick = recommendFinisher({ readiness: typeof score === 'number' ? score : undefined, heavyLowerSets, ...finisherMatContext() });
          if (!pick) return null;
          return (
            <button
              onClick={() => { setShowFinishModal(false); setShowFinisher(true); }}
              className="w-full mb-5 flex items-center justify-between gap-2 rounded-xl border border-grappler-700 bg-grappler-800/50 px-3 py-2.5 text-left"
              aria-label="Add conditioning finisher"
            >
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-grappler-100">
                  <Zap className="w-3.5 h-3.5 inline text-amber-400 mr-1" />
                  Finisher: {pick.protocol.name} · ~{Math.round(sprintTotalSeconds(pick.protocol) / 60)} min
                </span>
                <span className="block text-[11px] text-grappler-400 mt-0.5">{pick.reason}</span>
              </span>
              <span className="text-xs font-semibold text-primary-400 flex-shrink-0">Start</span>
            </button>
          );
        })()}

        {/* Weekly volume gaps — one line, opt-in (was a blocking "Got extra time?" sheet) */}
        {postWorkoutVolumeGaps.length > 0 && !volumeGapDismissed && (
          <button
            onClick={() => { setShowFinishModal(false); setShowVolumeGapPrompt(true); }}
            className="w-full mb-5 flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-left"
          >
            <span className="text-xs text-amber-300">
              {postWorkoutVolumeGaps.slice(0, 3).map(g => g.muscle).join(', ')}
              {postWorkoutVolumeGaps.length > 3 ? ` +${postWorkoutVolumeGaps.length - 3}` : ''} below weekly minimum
            </span>
            <span className="text-xs font-semibold text-amber-400 flex-shrink-0">Add a finisher</span>
          </button>
        )}

        <div className="space-y-4">
          {/* Overall RPE */}
          <div>
            <label className="text-sm text-grappler-400 mb-2 block">
              Session RPE
            </label>
            <div className="flex gap-2">
              {[5, 6, 7, 8, 9, 10].map((rpe) => (
                <button
                  key={rpe}
                  onClick={() => { sessionRpeTouched.current = true; setFeedback({ ...feedback, overallRPE: rpe }); }}
                  className={cn(
                    'flex-1 py-2 rounded-lg font-medium text-sm',
                    feedback.overallRPE === rpe
                      ? 'bg-primary-600 text-white'
                      : 'bg-grappler-700 text-grappler-400'
                  )}
                >
                  {rpe}
                </button>
              ))}
            </div>
          </div>

          {/* More details toggle */}
          <button
            onClick={() => setShowMoreFeedback(!showMoreFeedback)}
            className="flex items-center gap-2 text-sm text-grappler-400 hover:text-grappler-300 transition-colors"
          >
            <ChevronDown className={cn('w-4 h-4 transition-transform', showMoreFeedback && 'rotate-180')} />
            {showMoreFeedback ? 'Less details' : 'More details'}
          </button>

          {showMoreFeedback && (
          <>
          {/* Performance vs Expectations */}
          <div>
            <label className="text-sm text-grappler-400 mb-2 block">
              How was performance vs expectations?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'worse_than_expected', label: 'Worse' },
                { value: 'as_expected', label: 'As Expected' },
                { value: 'better_than_expected', label: 'Better' }
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFeedback({ ...feedback, overallPerformance: opt.value })}
                  className={cn(
                    'py-2 px-2 rounded-lg text-xs font-medium',
                    feedback.overallPerformance === opt.value
                      ? opt.value === 'worse_than_expected' ? 'bg-red-500 text-white' :
                        opt.value === 'better_than_expected' ? 'bg-green-500 text-white' :
                        'bg-primary-600 text-white'
                      : 'bg-grappler-700 text-grappler-400'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Soreness */}
          <div>
            <label className="text-sm text-grappler-400 mb-2 block">
              Soreness (1-10)
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={feedback.soreness}
              onChange={(e) => setFeedback({ ...feedback, soreness: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-grappler-400">
              <span>Fresh</span>
              <span>{feedback.soreness}</span>
              <span>Very Sore</span>
            </div>
          </div>

          {/* Energy */}
          <div>
            <label className="text-sm text-grappler-400 mb-2 block">
              Energy (1-10)
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={feedback.energy}
              onChange={(e) => setFeedback({ ...feedback, energy: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-grappler-400">
              <span>Exhausted</span>
              <span>{feedback.energy}</span>
              <span>Energized</span>
            </div>
          </div>

          {/* Mood */}
          <div>
            <label className="text-sm text-grappler-400 mb-2 block">Mood</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  onClick={() => setFeedback({ ...feedback, mood: v })}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm font-medium',
                    feedback.mood === v
                      ? 'bg-primary-600 text-white'
                      : 'bg-grappler-700 text-grappler-400'
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-grappler-400 mt-1">
              <span>Bad</span>
              <span>Great</span>
            </div>
          </div>

          {/* Would Repeat */}
          <div className="flex items-center justify-between">
            <label className="text-sm text-grappler-300">Enjoyed this session?</label>
            <button
              onClick={() => setFeedback({ ...feedback, wouldRepeat: !feedback.wouldRepeat })}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-medium',
                feedback.wouldRepeat
                  ? 'bg-green-500 text-white'
                  : 'bg-grappler-700 text-grappler-400'
              )}
            >
              {feedback.wouldRepeat ? 'Yes' : 'No'}
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm text-grappler-400 mb-2 block">
              Notes (optional)
            </label>
            <textarea
              value={feedback.notes}
              onChange={(e) => setFeedback({ ...feedback, notes: e.target.value })}
              placeholder="How did it go? Any PRs? Issues?"
              className="input min-h-[80px] resize-none"
            />
          </div>
          </>
          )}

          {/* Duration override — show when elapsed time is unrealistically short */}
          {(() => {
            const elapsedMs = Date.now() - new Date(activeWorkout!.startTime).getTime();
            const elapsedMin = Math.round(elapsedMs / 1000 / 60);
            const totalSets = activeWorkout!.exerciseLogs.reduce(
              (s, ex) => s + ex.sets.filter(set => set.completed).length, 0
            );
            const exerciseCount = activeWorkout!.exerciseLogs.length;
            // Detect retroactive logging: < 15 min with 3+ exercises or 6+ completed sets
            const isFastLog = elapsedMin < 15 && (exerciseCount >= 3 || totalSets >= 6);
            if (!isFastLog && durationOverride === null) return null;
            // Estimate: ~2.5 min per set (includes rest)
            const estimated = Math.max(20, Math.round(totalSets * 2.5));
            const currentVal = durationOverride ?? estimated;
            // Auto-set on first render
            if (durationOverride === null) {
              setTimeout(() => setDurationOverride(estimated), 0);
            }
            return (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                <label className="text-sm text-yellow-300 mb-1 block font-medium">
                  Actual workout duration
                </label>
                <p className="text-xs text-grappler-400 mb-2">
                  Looks like you logged this after the session. How long did it actually take?
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="number" inputMode="decimal" enterKeyHint="done"
                    min={5}
                    max={300}
                    value={currentVal}
                    onChange={(e) => setDurationOverride(Math.max(5, parseInt(e.target.value) || 5))}
                    className="input w-24 text-center text-lg font-bold"
                  />
                  <span className="text-sm text-grappler-400">minutes</span>
                  <button
                    onClick={() => setDurationOverride(null)}
                    className="ml-auto text-xs text-grappler-400 underline"
                  >
                    Use actual time ({elapsedMin}m)
                  </button>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setShowFinishModal(false)}
            className="btn btn-secondary btn-md flex-1"
          >
            Cancel
          </button>
          <button
            onClick={() => completeWorkout({
              overallRPE: feedback.overallRPE,
              soreness: feedback.soreness,
              energy: feedback.energy,
              notes: feedback.notes,
              postFeedback: {
                overallRPE: feedback.overallRPE,
                overallPerformance: feedback.overallPerformance,
                soreness: feedback.soreness,
                energy: feedback.energy,
                mood: feedback.mood,
                wouldRepeat: feedback.wouldRepeat,
                notes: feedback.notes
              },
              ...(durationOverride !== null ? { durationOverride } : {})
            })}
            className="btn btn-primary btn-md flex-1"
          >
            Save Workout
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
