'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import {
  Calendar,
  Dumbbell,
  Clock,
  ChevronDown,
  ChevronUp,
  Play,
  Zap,
  Heart,
  Flame,
  RefreshCw,
  Info,
  Wrench,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkoutSession, WorkoutType, MesocycleWeek } from '@/lib/types';

interface WorkoutViewProps {
  onOpenBuilder?: () => void;
}

export default function WorkoutView({ onOpenBuilder }: WorkoutViewProps) {
  const { currentMesocycle, startWorkout, generateNewMesocycle } = useAppStore();
  const [expandedWeek, setExpandedWeek] = useState<number | null>(0);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  if (!currentMesocycle) {
    return (
      <div className="text-center py-12">
        <Dumbbell className="w-16 h-16 text-grappler-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-grappler-200 mb-2">No Active Program</h2>
        <p className="text-grappler-400 mb-6">Generate a new mesocycle to get started</p>
        <button onClick={() => generateNewMesocycle()} className="btn btn-primary btn-md">
          Generate Program
        </button>
      </div>
    );
  }

  const getWorkoutTypeIcon = (type: WorkoutType) => {
    switch (type) {
      case 'strength': return Zap;
      case 'hypertrophy': return Heart;
      case 'power': return Flame;
    }
  };

  const getWorkoutTypeColor = (type: WorkoutType) => {
    switch (type) {
      case 'strength': return 'text-red-400 bg-red-500/10';
      case 'hypertrophy': return 'text-purple-400 bg-purple-500/10';
      case 'power': return 'text-orange-400 bg-orange-500/10';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-grappler-50">{currentMesocycle.name}</h2>
          <p className="text-sm text-grappler-400">
            {currentMesocycle.weeks.length} weeks • {currentMesocycle.goalFocus} focus
          </p>
        </div>
        <button
          onClick={() => generateNewMesocycle()}
          className="btn btn-secondary btn-sm gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          New Block
        </button>
      </div>

      {/* Build Custom / Browse */}
      {onOpenBuilder && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onOpenBuilder}
            className="card p-4 flex items-center gap-3 hover:bg-grappler-700/50 transition-colors text-left"
          >
            <div className="w-10 h-10 bg-accent-500/20 rounded-lg flex items-center justify-center">
              <Wrench className="w-5 h-5 text-accent-400" />
            </div>
            <div>
              <p className="font-medium text-grappler-100 text-sm">Build Workout</p>
              <p className="text-xs text-grappler-500">Custom session</p>
            </div>
          </button>
          <button
            onClick={onOpenBuilder}
            className="card p-4 flex items-center gap-3 hover:bg-grappler-700/50 transition-colors text-left"
          >
            <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
              <Search className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="font-medium text-grappler-100 text-sm">Browse Exercises</p>
              <p className="text-xs text-grappler-500">Full database</p>
            </div>
          </button>
        </div>
      )}

      {/* Periodization Info */}
      <div className="card p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-grappler-200 text-sm">Undulating Periodization</p>
            <p className="text-xs text-grappler-400 mt-1">
              Each week varies intensity: <span className="text-red-400">Strength</span> (heavy, low reps),{' '}
              <span className="text-purple-400">Hypertrophy</span> (moderate, more reps),{' '}
              <span className="text-orange-400">Power</span> (explosive, lighter loads).
            </p>
          </div>
        </div>
      </div>

      {/* Weeks */}
      <div className="space-y-4">
        {currentMesocycle.weeks.map((week, weekIndex) => (
          <WeekCard
            key={weekIndex}
            week={week}
            weekIndex={weekIndex}
            isExpanded={expandedWeek === weekIndex}
            onToggle={() => setExpandedWeek(expandedWeek === weekIndex ? null : weekIndex)}
            expandedSession={expandedSession}
            setExpandedSession={setExpandedSession}
            onStartWorkout={startWorkout}
            getWorkoutTypeIcon={getWorkoutTypeIcon}
            getWorkoutTypeColor={getWorkoutTypeColor}
          />
        ))}
      </div>
    </div>
  );
}

interface WeekCardProps {
  week: MesocycleWeek;
  weekIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
  expandedSession: string | null;
  setExpandedSession: (id: string | null) => void;
  onStartWorkout: (session: WorkoutSession) => void;
  getWorkoutTypeIcon: (type: WorkoutType) => any;
  getWorkoutTypeColor: (type: WorkoutType) => string;
}

function WeekCard({
  week,
  weekIndex,
  isExpanded,
  onToggle,
  expandedSession,
  setExpandedSession,
  onStartWorkout,
  getWorkoutTypeIcon,
  getWorkoutTypeColor
}: WeekCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: weekIndex * 0.1 }}
      className="card overflow-hidden"
    >
      {/* Week Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-grappler-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            week.isDeload ? 'bg-green-500/20' : 'bg-primary-500/20'
          )}>
            <Calendar className={cn(
              'w-5 h-5',
              week.isDeload ? 'text-green-400' : 'text-primary-400'
            )} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-grappler-100">
              Week {week.weekNumber}
              {week.isDeload && (
                <span className="ml-2 text-xs font-normal text-green-400 bg-green-500/20 px-2 py-0.5 rounded-full">
                  Deload
                </span>
              )}
            </h3>
            <p className="text-sm text-grappler-400">
              {week.sessions.length} sessions
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-grappler-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-grappler-400" />
        )}
      </button>

      {/* Week Content */}
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-grappler-700"
        >
          <div className="p-4 space-y-3">
            {week.sessions.map((session) => {
              const Icon = getWorkoutTypeIcon(session.type);
              const colorClass = getWorkoutTypeColor(session.type);
              const isSessionExpanded = expandedSession === session.id;

              return (
                <div key={session.id} className="bg-grappler-800/50 rounded-lg overflow-hidden">
                  {/* Session Header */}
                  <button
                    onClick={() => setExpandedSession(isSessionExpanded ? null : session.id)}
                    className="w-full p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', colorClass)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <h4 className="font-medium text-grappler-100">{session.name}</h4>
                        <div className="flex items-center gap-3 text-xs text-grappler-400">
                          <span className="flex items-center gap-1">
                            <Dumbbell className="w-3 h-3" />
                            {session.exercises.length} exercises
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {session.estimatedDuration} min
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs px-2 py-1 rounded-full capitalize', colorClass)}>
                        {session.type}
                      </span>
                      {isSessionExpanded ? (
                        <ChevronUp className="w-4 h-4 text-grappler-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-grappler-400" />
                      )}
                    </div>
                  </button>

                  {/* Session Details */}
                  {isSessionExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="border-t border-grappler-700 p-4"
                    >
                      {/* Warm Up */}
                      <div className="mb-4">
                        <h5 className="text-xs font-medium text-grappler-400 uppercase mb-2">Warm Up</h5>
                        <ul className="text-sm text-grappler-300 space-y-1">
                          {session.warmUp.map((item, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-grappler-500 rounded-full" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Exercises */}
                      <div className="mb-4">
                        <h5 className="text-xs font-medium text-grappler-400 uppercase mb-2">Exercises</h5>
                        <div className="space-y-2">
                          {session.exercises.map((ex, i) => (
                            <div
                              key={i}
                              className="bg-grappler-700/50 rounded-lg p-3"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium text-grappler-100">{ex.exercise.name}</p>
                                  <p className="text-sm text-grappler-400">
                                    {ex.sets} sets × {ex.prescription.targetReps} reps @ RPE {ex.prescription.rpe}
                                  </p>
                                  {ex.prescription.tempo && (
                                    <p className="text-xs text-grappler-500 mt-1">
                                      Tempo: {ex.prescription.tempo}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-grappler-400">
                                    Rest: {Math.floor(ex.prescription.restSeconds / 60)}:{(ex.prescription.restSeconds % 60).toString().padStart(2, '0')}
                                  </p>
                                  {ex.prescription.percentageOf1RM && (
                                    <p className="text-xs text-grappler-500">
                                      ~{ex.prescription.percentageOf1RM}% 1RM
                                    </p>
                                  )}
                                </div>
                              </div>
                              {ex.exercise.cues && ex.exercise.cues.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-grappler-600">
                                  <p className="text-xs text-grappler-500">
                                    <span className="font-medium">Cue: </span>
                                    {ex.exercise.cues[0]}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Cool Down */}
                      <div className="mb-4">
                        <h5 className="text-xs font-medium text-grappler-400 uppercase mb-2">Cool Down</h5>
                        <ul className="text-sm text-grappler-300 space-y-1">
                          {session.coolDown.map((item, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-grappler-500 rounded-full" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Start Button */}
                      <button
                        onClick={() => onStartWorkout(session)}
                        className="btn btn-primary btn-md w-full gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Start This Workout
                      </button>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
