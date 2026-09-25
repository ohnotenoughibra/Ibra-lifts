'use client';
/* Extracted verbatim from ActiveWorkout.tsx (showRestTips block) — no behavior change. */
import type * as React from 'react';
import { motion } from 'framer-motion';
import { X, Trophy, Lightbulb, Shuffle, Brain, Zap, AlertTriangle, TrendingUp, Video, ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WeightUnit, WorkoutSession, ExerciseLog, PreWorkoutCheckIn, KnowledgeTip } from '@/lib/types';
import type { RPERegulation } from '@/lib/rpe-regulator';
import type { ActiveWorkoutThrottle } from '@/lib/store';
import type { CoachMessage } from '@/lib/corner-coach';

export interface RestTipsPanelProps {
  weightSuggestion: { message: string; suggestedWeight: number; } | null;
  setExactValue: (field: "weight" | "reps" | "rpe" | "duration", value: number) => void;
  setWeightSuggestion: React.Dispatch<React.SetStateAction<{ message: string; suggestedWeight: number; } | null>>;
  weightUnit: WeightUnit;
  rpeRegulation: RPERegulation | null;
  setRpeRegulation: React.Dispatch<React.SetStateAction<RPERegulation | null>>;
  lastCompletedExerciseIndex: number | null;
  allExercisesDone: boolean;
  /** Always set here — ActiveWorkout returns early without one. */
  activeWorkout: NonNullable<{ session: WorkoutSession; baseSession: WorkoutSession; exerciseLogs: ExerciseLog[]; startTime: Date; mesocycleId: string; weekNumber?: number | undefined; dayNumber?: number | undefined; preCheckIn?: PreWorkoutCheckIn | undefined; pausedAt?: Date | undefined; totalPausedMs?: number | undefined; throttle?: ActiveWorkoutThrottle | undefined; overviewDone?: boolean | undefined; position?: { exerciseIndex: number; setIndex: number; } | undefined; swapUndo?: { session: WorkoutSession; exerciseLogs: ExerciseLog[]; } | undefined; matAdjust?: { kind: "taper" | "mat"; reason: string; summary: string; original: WorkoutSession; undone?: boolean | undefined; } | undefined; } | null>;
  currentExerciseIndex: number;
  setShowSwapModal: (v: boolean) => void;
  coachMessages: CoachMessage[];
  setCoachMessages: React.Dispatch<React.SetStateAction<CoachMessage[]>>;
  showTip: boolean;
  tip: KnowledgeTip;
}

export default function RestTipsPanel({ weightSuggestion, setExactValue, setWeightSuggestion, weightUnit, rpeRegulation, setRpeRegulation, lastCompletedExerciseIndex, allExercisesDone, activeWorkout, currentExerciseIndex, setShowSwapModal, coachMessages, setCoachMessages, showTip, tip }: RestTipsPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden w-full max-w-sm mt-3 space-y-3"
    >
      {/* Weight bump suggestion */}
      {weightSuggestion && (
        <div className="bg-primary-500/15 border border-primary-500/30 rounded-xl p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <TrendingUp className="w-4 h-4 text-primary-400 flex-shrink-0" />
            <p className="text-sm text-primary-300">{weightSuggestion.message}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => {
                setExactValue('weight', weightSuggestion.suggestedWeight);
                setWeightSuggestion(null);
              }}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-primary-500 text-white"
            >
              {weightSuggestion.suggestedWeight} {weightUnit}
            </button>
            <button
              onClick={() => setWeightSuggestion(null)}
              className="text-grappler-500 hover:text-grappler-300"
              aria-label="Dismiss weight suggestion"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* RPE Auto-Regulator */}
      {rpeRegulation && (
        <div className={cn(
          'rounded-xl p-3 flex items-center justify-between gap-3 border',
          rpeRegulation.type === 'drop'
            ? 'bg-orange-500/15 border-orange-500/30'
            : 'bg-emerald-500/15 border-emerald-500/30'
        )}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {rpeRegulation.type === 'drop'
              ? <ArrowDown className="w-4 h-4 text-orange-400 flex-shrink-0" />
              : <ArrowUp className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
            <div className="min-w-0">
              <p className={cn('text-sm font-medium', rpeRegulation.type === 'drop' ? 'text-orange-300' : 'text-emerald-300')}>
                {rpeRegulation.message}
              </p>
              <p className="text-sm text-grappler-400 mt-0.5">{rpeRegulation.reason}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => {
                setExactValue('weight', rpeRegulation.suggestedWeight);
                setRpeRegulation(null);
              }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium text-white',
                rpeRegulation.type === 'drop' ? 'bg-orange-500' : 'bg-emerald-500'
              )}
            >
              {rpeRegulation.suggestedWeight} {weightUnit}
            </button>
            <button
              onClick={() => setRpeRegulation(null)}
              className="text-grappler-500 hover:text-grappler-300"
              aria-label="Dismiss RPE adjustment"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Form Video + Swap for next exercise */}
      {lastCompletedExerciseIndex !== null && !allExercisesDone && (
        <div className="flex items-center justify-center gap-2">
          {activeWorkout.session.exercises[currentExerciseIndex]?.exercise.videoUrl && (
            <a
              href={activeWorkout.session.exercises[currentExerciseIndex].exercise.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 transition-all text-red-400 hover:text-red-300"
            >
              <Video className="w-3.5 h-3.5" />
              <span className="text-sm font-medium">Form Video</span>
            </a>
          )}
          <button
            onClick={() => setShowSwapModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-grappler-800 hover:bg-grappler-700 border border-grappler-700 hover:border-primary-500/50 transition-all text-grappler-400 hover:text-primary-400"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span className="text-sm font-medium">Swap Exercise</span>
          </button>
        </div>
      )}

      {/* Coach Messages */}
      {coachMessages.length > 0 && (
        <div className="space-y-2">
          {coachMessages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'rounded-xl p-3 border flex items-start gap-3',
                msg.tone === 'hype' ? 'bg-emerald-500/15 border-emerald-500/30' :
                msg.tone === 'warning' ? 'bg-red-500/15 border-red-500/30' :
                msg.tone === 'celebrate' ? 'bg-yellow-500/15 border-yellow-500/30' :
                msg.tone === 'tactical' ? 'bg-blue-500/15 border-blue-500/30' :
                'bg-grappler-800/80 border-grappler-700/50'
              )}
            >
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                msg.tone === 'hype' ? 'bg-emerald-500/20' :
                msg.tone === 'warning' ? 'bg-red-500/20' :
                msg.tone === 'celebrate' ? 'bg-yellow-500/20' :
                msg.tone === 'tactical' ? 'bg-blue-500/20' :
                'bg-grappler-700/50'
              )}>
                {msg.tone === 'celebrate' ? <Trophy className="w-3.5 h-3.5 text-yellow-400" /> :
                 msg.tone === 'warning' ? <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> :
                 msg.tone === 'hype' ? <Zap className="w-3.5 h-3.5 text-emerald-400" /> :
                 msg.tone === 'tactical' ? <Brain className="w-3.5 h-3.5 text-blue-400" /> :
                 <Lightbulb className="w-3.5 h-3.5 text-grappler-400" />}
              </div>
              <p className={cn(
                'text-sm flex-1',
                msg.tone === 'hype' ? 'text-emerald-300' :
                msg.tone === 'warning' ? 'text-red-300' :
                msg.tone === 'celebrate' ? 'text-yellow-300' :
                msg.tone === 'tactical' ? 'text-blue-300' :
                'text-grappler-300'
              )}>{msg.text}</p>
              <button
                onClick={() => setCoachMessages(prev => prev.filter(m => m.id !== msg.id))}
                className="text-grappler-600 hover:text-grappler-400 flex-shrink-0"
                aria-label="Dismiss coach message"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tip */}
      {showTip && coachMessages.length === 0 && (
        <div className="card p-3">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-grappler-300">{tip.content}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
