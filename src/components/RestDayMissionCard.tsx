'use client';

import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Moon, Target, Zap, Play, Dumbbell, Apple,
  Droplets, Check, Move, ChevronRight, Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkoutSession, WorkoutLog, MuscleGroup } from '@/lib/types';
import type { OverlayView } from './dashboard-types';
import { pointRewards } from '@/lib/gamification';
import { getExerciseById } from '@/lib/exercises';
import ReadinessRing from './ReadinessRing';

// ─── Types ───

interface RestDayMissionCardProps {
  headline: string;
  subline: string;
  actions: string[];
  readinessScore: number;
  readinessLevel: string;
  sessionLabel: string | null;
  fightCampTag: string | null;
  proteinGap: number;
  nextWorkout: WorkoutSession | null;
  todayProtein: number;
  proteinTarget: number;
  waterToday: number;
  sleepHours: number | null;
  alreadyLoggedSoreness: boolean;
  yesterdayWorkouts: WorkoutLog[];
  twoDaysAgoWorkouts: WorkoutLog[];
  mesocycleProgress: { completed: number; total: number; percent: number } | null;
  weightUnit: string;
  onNavigate: (view: OverlayView) => void;
  onStartWorkout: (session: WorkoutSession) => void;
  onQuickWorkout: () => void;
  onReadinessToggle: () => void;
  forwardLook: string | null;
}

// ─── Muscle display config ───

const MUSCLES: { id: MuscleGroup; label: string; short: string }[] = [
  { id: 'chest', label: 'Chest', short: 'Chest' },
  { id: 'back', label: 'Back', short: 'Back' },
  { id: 'shoulders', label: 'Shoulders', short: 'Delts' },
  { id: 'quadriceps', label: 'Quads', short: 'Quads' },
  { id: 'hamstrings', label: 'Hamstrings', short: 'Hams' },
  { id: 'glutes', label: 'Glutes', short: 'Glutes' },
  { id: 'biceps', label: 'Biceps', short: 'Bi' },
  { id: 'triceps', label: 'Triceps', short: 'Tri' },
  { id: 'core', label: 'Core', short: 'Core' },
  { id: 'calves', label: 'Calves', short: 'Calves' },
];

const STATUS_COLORS = {
  recovering: { bg: 'bg-red-500/15', border: 'border-red-500/30', text: 'text-red-400', dot: 'bg-red-400' },
  almost: { bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  fresh: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', dot: 'bg-green-400' },
} as const;

// ─── Component ───

export default function RestDayMissionCard(props: RestDayMissionCardProps) {
  const [activePanel, setActivePanel] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const panelCount = props.nextWorkout ? 3 : 2;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Only horizontal swipes (not vertical scroll)
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0 && activePanel < panelCount - 1) setActivePanel(p => p + 1);
      if (dx > 0 && activePanel > 0) setActivePanel(p => p - 1);
    }
  };

  // ─── Recovery Missions ───
  const missions = useMemo(() => {
    const m: { id: string; label: string; detail: string; done: boolean; action?: () => void; icon: typeof Apple }[] = [];

    // Protein
    const proteinDone = props.proteinTarget > 0 && props.todayProtein >= props.proteinTarget * 0.9;
    const proteinRemaining = Math.max(0, Math.round(props.proteinTarget - props.todayProtein));
    m.push({
      id: 'protein',
      label: `Hit ${Math.round(props.proteinTarget)}g protein`,
      detail: proteinDone ? 'On track' : `${proteinRemaining}g remaining`,
      done: proteinDone,
      action: () => props.onNavigate('nutrition'),
      icon: Apple,
    });

    // Soreness check-in
    m.push({
      id: 'soreness',
      label: 'Body check-in',
      detail: props.alreadyLoggedSoreness ? 'Logged today' : 'Tap to log soreness',
      done: props.alreadyLoggedSoreness,
      action: () => props.onNavigate('mobility'),
      icon: Move,
    });

    // Hydration
    const waterMl = props.waterToday * 250; // glasses -> ml
    const waterDone = waterMl >= 2000;
    m.push({
      id: 'water',
      label: '2L+ water',
      detail: waterDone ? 'Hit target' : waterMl > 0 ? `${(waterMl / 1000).toFixed(1)}L so far` : 'Start logging',
      done: waterDone,
      icon: Droplets,
    });

    // Sleep (only if Whoop data)
    if (props.sleepHours != null) {
      m.push({
        id: 'sleep',
        label: '7.5+ hrs sleep',
        detail: `${props.sleepHours.toFixed(1)}h last night`,
        done: props.sleepHours >= 7.5,
        icon: Moon,
      });
    }

    return m;
  }, [props.proteinTarget, props.todayProtein, props.alreadyLoggedSoreness, props.waterToday, props.sleepHours, props.onNavigate]);

  const completedCount = missions.filter(m => m.done).length;
  const missionProgress = missions.length > 0 ? Math.round((completedCount / missions.length) * 100) : 0;

  // ─── Body Status Map ───
  const muscleStatus = useMemo(() => {
    const result: { id: MuscleGroup; label: string; status: 'recovering' | 'almost' | 'fresh'; detail: string }[] = [];

    // Derive sets-per-muscle from exercise logs
    const countSetsPerMuscle = (logs: WorkoutLog[]) => {
      const counts: Record<string, number> = {};
      for (const log of logs) {
        for (const ex of log.exercises) {
          const def = getExerciseById(ex.exerciseId);
          if (!def) continue;
          const setCount = ex.sets.length;
          for (const m of def.primaryMuscles) {
            counts[m] = (counts[m] || 0) + setCount;
          }
        }
      }
      return counts;
    };
    const yesterdaySets = countSetsPerMuscle(props.yesterdayWorkouts);
    const twoDaysAgoSets = countSetsPerMuscle(props.twoDaysAgoWorkouts);

    for (const m of MUSCLES) {
      if (yesterdaySets[m.id]) {
        result.push({ id: m.id, label: m.label, status: 'recovering', detail: `${yesterdaySets[m.id]} sets yesterday` });
      } else if (twoDaysAgoSets[m.id]) {
        result.push({ id: m.id, label: m.label, status: 'almost', detail: '2 days ago' });
      } else {
        result.push({ id: m.id, label: m.label, status: 'fresh', detail: 'Ready' });
      }
    }

    return result;
  }, [props.yesterdayWorkouts, props.twoDaysAgoWorkouts]);

  const recoveringCount = muscleStatus.filter(m => m.status === 'recovering').length;
  const yesterdayTotalSets = props.yesterdayWorkouts.reduce((s, l) => s + (l.exercises?.length || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      <div
        className="rounded-2xl border border-grappler-700 bg-gradient-to-br from-grappler-800 to-grappler-900 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header — always visible */}
        <div className="p-5 pb-0">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Moon className="w-4 h-4 text-indigo-400" />
                {props.fightCampTag && (
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400">{props.fightCampTag}</span>
                )}
                {(props.readinessLevel === 'low' || props.readinessLevel === 'critical') && (
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Smart Rest +{pointRewards.smartRest} XP</span>
                )}
              </div>
              <h2 className="text-xl font-black text-grappler-100">{props.headline}</h2>
              <p className="text-xs text-grappler-400 mt-1">{props.subline}</p>
            </div>
            <ReadinessRing score={props.readinessScore} onClick={props.onReadinessToggle} />
          </div>
        </div>

        {/* Panel content */}
        <div className="px-5 pb-4 min-h-[180px]">
          <AnimatePresence mode="wait">
            {activePanel === 0 && (
              <motion.div
                key="missions"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Progress bar */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-1.5 bg-grappler-700 rounded-full overflow-hidden">
                    <motion.div
                      className={cn('h-full rounded-full', missionProgress >= 100 ? 'bg-green-500' : 'bg-indigo-500')}
                      animate={{ width: `${missionProgress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <span className="text-xs text-grappler-500 font-medium">{completedCount}/{missions.length}</span>
                </div>

                {/* Victory banner — all missions complete */}
                {completedCount === missions.length && missions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2.5 px-3 py-2.5 mb-3 rounded-xl bg-green-500/10 border border-green-500/25"
                  >
                    <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Star className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-green-300">Recovery Complete</p>
                      <p className="text-[10px] text-green-400/70">All missions hit — adaptation is happening. +{pointRewards.smartRest} XP</p>
                    </div>
                  </motion.div>
                )}

                {/* Mission items */}
                <div className="space-y-2">
                  {missions.map(m => (
                    <button
                      key={m.id}
                      onClick={m.action}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all active:scale-[0.98]',
                        m.done
                          ? 'bg-green-500/8 border border-green-500/20'
                          : 'bg-grappler-800/60 border border-grappler-700/40 hover:border-grappler-600/60'
                      )}
                    >
                      <div className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                        m.done ? 'bg-green-500/20' : 'bg-grappler-700/60'
                      )}>
                        {m.done ? (
                          <Check className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <m.icon className="w-3 h-3 text-grappler-500" />
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className={cn('text-xs font-medium', m.done ? 'text-green-300 line-through decoration-green-500/40' : 'text-grappler-200')}>
                          {m.label}
                        </p>
                        <p className="text-[10px] text-grappler-500 truncate">{m.detail}</p>
                      </div>
                      {!m.done && m.action && (
                        <ChevronRight className="w-3.5 h-3.5 text-grappler-600 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {activePanel === 1 && (
              <motion.div
                key="body"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-[10px] text-grappler-500 uppercase tracking-wider mb-2.5">Muscle Recovery Status</p>

                {/* Summary line */}
                {recoveringCount > 0 && (
                  <div className="flex items-start gap-2 mb-3 p-2.5 rounded-xl bg-grappler-800/40 border border-grappler-700/30">
                    <Target className="w-3.5 h-3.5 text-grappler-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-grappler-300 leading-relaxed">
                      {recoveringCount} muscle group{recoveringCount > 1 ? 's' : ''} still recovering.
                      {' '}Rest lets them supercompensate — you come back stronger.
                    </p>
                  </div>
                )}

                {/* Muscle grid */}
                <div className="grid grid-cols-2 gap-1.5">
                  {muscleStatus.map(m => {
                    const c = STATUS_COLORS[m.status];
                    return (
                      <div
                        key={m.id}
                        className={cn('flex items-center gap-2 px-2.5 py-2 rounded-lg border', c.bg, c.border)}
                      >
                        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', c.dot)} />
                        <div className="min-w-0">
                          <p className={cn('text-[11px] font-medium', c.text)}>{m.label}</p>
                          <p className="text-[9px] text-grappler-500 truncate">{m.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {activePanel === 2 && props.nextWorkout && (
              <motion.div
                key="tomorrow"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-[10px] text-grappler-500 uppercase tracking-wider mb-2.5">
                  Next Lift{props.sessionLabel ? ` · ${props.sessionLabel}` : ''}
                </p>

                <div className="rounded-xl border border-grappler-700/40 bg-grappler-800/40 p-3 mb-3">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Dumbbell className="w-4 h-4 text-primary-400" />
                    <p className="text-sm font-bold text-grappler-100">{props.nextWorkout.name}</p>
                  </div>
                  <div className="space-y-1.5">
                    {props.nextWorkout.exercises.slice(0, 5).map((ex, i) => (
                      <div key={ex.exerciseId + i} className="flex items-center gap-2">
                        <span className="w-4 text-[10px] text-grappler-600 text-right font-mono">{i + 1}.</span>
                        <p className="text-[11px] text-grappler-300 flex-1 truncate">{ex.exercise.name}</p>
                        <span className="text-[10px] text-grappler-500">{ex.sets}×{ex.prescription.targetReps}</span>
                      </div>
                    ))}
                    {props.nextWorkout.exercises.length > 5 && (
                      <p className="text-[10px] text-grappler-600 pl-6">+{props.nextWorkout.exercises.length - 5} more</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-2.5 pt-2 border-t border-grappler-700/30">
                    <span className="text-[10px] text-grappler-500">{props.nextWorkout.exercises.length} exercises</span>
                    <span className="text-[10px] text-grappler-500">~{props.nextWorkout.estimatedDuration}min</span>
                    <span className="text-[10px] text-grappler-500 capitalize">{props.nextWorkout.type}</span>
                  </div>
                </div>

                {/* Mental prep */}
                <div className="space-y-1.5">
                  <p className="text-[10px] text-grappler-500 uppercase tracking-wider">Pre-game</p>
                  {[
                    'Visualize your first working set — weight, grip, tempo',
                    props.proteinGap > 20 ? `Fuel up: ${Math.round(props.proteinGap)}g protein still needed today` : 'Protein on track — good fueling',
                    'Sleep by 10:30pm for max recovery',
                  ].map((tip, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Target className="w-3 h-3 text-grappler-600 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-grappler-400">{tip}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dot indicators + panel labels */}
        <div className="flex items-center justify-center gap-3 pb-3">
          {(['Missions', 'Body Map', ...(props.nextWorkout ? [`Next Lift`] : [])] as const).map((label, i) => (
            <button
              key={i}
              onClick={() => setActivePanel(i)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-full transition-all text-[10px] font-medium',
                activePanel === i
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-grappler-600 hover:text-grappler-400'
              )}
            >
              <span className={cn(
                'w-1.5 h-1.5 rounded-full transition-all',
                activePanel === i ? 'bg-indigo-400' : 'bg-grappler-600'
              )} />
              {label}
            </button>
          ))}
        </div>

        {/* Forward look */}
        {props.forwardLook && (
          <div className="flex items-center gap-2 px-5 pb-2">
            <ChevronRight className="w-3 h-3 text-grappler-600 flex-shrink-0" />
            <p className="text-[10px] text-grappler-500">{props.forwardLook}</p>
          </div>
        )}

        {/* Mesocycle progress */}
        {props.mesocycleProgress && (
          <div className="flex items-center gap-2 px-5 pb-3">
            <div className="flex-1 h-1.5 bg-grappler-700 rounded-full overflow-hidden">
              <div className="h-full bg-grappler-500 rounded-full" style={{ width: `${props.mesocycleProgress.percent}%` }} />
            </div>
            <span className="text-xs text-grappler-500">{props.mesocycleProgress.completed}/{props.mesocycleProgress.total}</span>
          </div>
        )}
      </div>

      {/* Lift anyway CTA */}
      {props.nextWorkout && (
        <button
          onClick={() => props.onStartWorkout(props.nextWorkout!)}
          className="w-full bg-grappler-800 hover:bg-grappler-700 border border-grappler-700 rounded-xl p-3 text-left transition-colors flex items-center gap-3"
        >
          <Dumbbell className="w-5 h-5 text-grappler-500" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-grappler-400">Want to lift anyway?</p>
            <p className="text-sm font-semibold text-grappler-200 truncate">
              {props.sessionLabel ? `${props.sessionLabel} — ` : ''}{props.nextWorkout.name}
            </p>
          </div>
          <Play className="w-4 h-4 text-grappler-500" />
        </button>
      )}
      <div className="flex items-center justify-center">
        <button onClick={props.onQuickWorkout} className="flex items-center gap-1.5 py-2 text-xs text-grappler-500 hover:text-grappler-300 transition-colors">
          <Zap className="w-3.5 h-3.5" />Quick 30m
        </button>
      </div>
    </motion.div>
  );
}
