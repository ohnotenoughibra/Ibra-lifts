'use client';

import { useState } from 'react';
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
  MessageSquare
} from 'lucide-react';
import { cn, formatDate, formatNumber, formatTime } from '@/lib/utils';

export default function WorkoutHistory() {
  const { workoutLogs, user } = useAppStore();
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const weightUnit = user?.weightUnit || 'lbs';

  const sortedLogs = [...workoutLogs].reverse();

  if (sortedLogs.length === 0) {
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
        <span className="text-sm text-grappler-400">{sortedLogs.length} workouts</span>
      </div>

      {sortedLogs.map((log) => {
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
                          {ex.sets.map((set, j) => (
                            <div key={j} className={cn(
                              'flex items-center justify-between text-xs',
                              set.completed ? 'text-grappler-300' : 'text-grappler-600 line-through'
                            )}>
                              <span>Set {set.setNumber}</span>
                              <span>{set.weight} {weightUnit} x {set.reps} reps</span>
                              <span>RPE {set.rpe}</span>
                            </div>
                          ))}
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
