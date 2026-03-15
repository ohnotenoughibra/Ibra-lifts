'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Moon, Zap, Play, Dumbbell, Apple,
  Droplets, Check, Move, ChevronRight, Star, Leaf,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkoutSession } from '@/lib/types';
import type { OverlayView } from './dashboard-types';
import { pointRewards } from '@/lib/gamification';
import { useAppStore } from '@/lib/store';

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
  alreadyLoggedMobility: boolean;
  yesterdayWorkouts: unknown[];
  twoDaysAgoWorkouts: unknown[];
  mesocycleProgress: { completed: number; total: number; percent: number } | null;
  weightUnit: string;
  onNavigate: (view: OverlayView) => void;
  onStartWorkout: (session: WorkoutSession) => void;
  onQuickWorkout: () => void;
  onReadinessToggle: () => void;
  forwardLook: string | null;
}

// ─── Component ───

export default function RestDayMissionCard(props: RestDayMissionCardProps) {
  const addQuickLog = useAppStore(s => s.addQuickLog);

  // One-tap body check-in — logs soreness directly without navigating away
  const handleBodyCheckIn = () => {
    if (props.alreadyLoggedSoreness) return;
    addQuickLog({
      type: 'soreness',
      value: 'none',
      timestamp: new Date(),
      notes: 'Body check: feeling good',
    });
  };

  // ─── Recovery Missions ───
  const missions = useMemo(() => {
    const m: { id: string; label: string; detail: string; done: boolean; action?: () => void; Icon: typeof Apple }[] = [];

    // Protein
    const proteinDone = props.proteinTarget > 0 && props.todayProtein >= props.proteinTarget * 0.9;
    const proteinRemaining = Math.max(0, Math.round(props.proteinTarget - props.todayProtein));
    m.push({
      id: 'protein',
      label: `${Math.round(props.proteinTarget)}g protein`,
      detail: proteinDone ? `${Math.round(props.todayProtein)}g ✓` : `${proteinRemaining}g left`,
      done: proteinDone,
      action: () => props.onNavigate('nutrition'),
      Icon: Apple,
    });

    // Body check-in — one-tap to mark feeling good, or navigate to detailed soreness
    m.push({
      id: 'soreness',
      label: 'Body check-in',
      detail: props.alreadyLoggedSoreness ? 'Logged' : 'Tap to check in',
      done: props.alreadyLoggedSoreness,
      action: handleBodyCheckIn,
      Icon: Move,
    });

    // Mobility — one-tap to log, long-press opens guided routines
    m.push({
      id: 'mobility',
      label: 'Mobility work',
      detail: props.alreadyLoggedMobility ? 'Done' : 'Tap to log',
      done: props.alreadyLoggedMobility,
      action: () => {
        if (props.alreadyLoggedMobility) return;
        addQuickLog({
          type: 'mobility',
          value: 10,
          unit: 'min',
          timestamp: new Date(),
          notes: 'Quick log from rest day card',
        });
      },
      Icon: Leaf,
    });

    // Hydration
    const waterMl = props.waterToday * 250;
    const waterDone = waterMl >= 2000;
    m.push({
      id: 'water',
      label: '2L+ water',
      detail: waterDone ? 'Done' : waterMl > 0 ? `${(waterMl / 1000).toFixed(1)}L` : 'Start',
      done: waterDone,
      Icon: Droplets,
    });

    // Sleep
    if (props.sleepHours != null) {
      m.push({
        id: 'sleep',
        label: '7.5h+ sleep',
        detail: `${props.sleepHours.toFixed(1)}h`,
        done: props.sleepHours >= 7.5,
        Icon: Moon,
      });
    }

    return m;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.proteinTarget, props.todayProtein, props.alreadyLoggedSoreness, props.alreadyLoggedMobility, props.waterToday, props.sleepHours, props.onNavigate]);

  const completedCount = missions.filter(m => m.done).length;
  const allComplete = completedCount === missions.length;

  // Progress ring calculations
  const ringSize = 44;
  const ringStroke = 3;
  const radius = (ringSize - ringStroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = missions.length > 0 ? completedCount / missions.length : 0;
  const offset = circumference - progress * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      <div className={cn(
        'rounded-2xl border bg-gradient-to-br from-grappler-800 to-grappler-900 overflow-hidden transition-colors',
        allComplete ? 'border-green-500/40' : 'border-grappler-700',
      )}>
        {/* Header + progress ring */}
        <div className="p-5 pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {allComplete ? (
                  <Star className="w-4 h-4 text-green-400" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-400" />
                )}
                {(props.readinessLevel === 'low' || props.readinessLevel === 'critical') && (
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">+{pointRewards.smartRest} XP</span>
                )}
              </div>
              <h2 className={cn(
                'text-xl font-black',
                allComplete ? 'text-green-300' : 'text-grappler-100',
              )}>
                {allComplete ? 'Recovery Complete' : props.headline}
              </h2>
              <p className="text-xs text-grappler-400 mt-1">
                {allComplete
                  ? `${props.forwardLook || 'Ready for your next session'}`
                  : props.subline}
              </p>
            </div>

            {/* Completion ring */}
            <div className="relative flex-shrink-0" style={{ width: ringSize, height: ringSize }}>
              <svg width={ringSize} height={ringSize} className="-rotate-90">
                <circle
                  cx={ringSize / 2} cy={ringSize / 2} r={radius}
                  fill="none" strokeWidth={ringStroke}
                  className="stroke-grappler-700/60"
                />
                <circle
                  cx={ringSize / 2} cy={ringSize / 2} r={radius}
                  fill="none" strokeWidth={ringStroke}
                  strokeDasharray={circumference} strokeDashoffset={offset}
                  strokeLinecap="round"
                  className={cn('transition-all duration-700', allComplete ? 'stroke-green-400' : 'stroke-indigo-400')}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn(
                  'text-xs font-black',
                  allComplete ? 'text-green-400' : 'text-grappler-300',
                )}>
                  {completedCount}/{missions.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mission checklist */}
        <div className="px-5 pb-4 space-y-1.5">
          {missions.map((m) => {
            const MIcon = m.Icon;
            return (
              <button
                key={m.id}
                onClick={m.action}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                  m.done
                    ? 'bg-green-500/8 border border-green-500/20'
                    : 'bg-grappler-800/60 border border-grappler-700/40 hover:border-grappler-600/60',
                )}
              >
                <div className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
                  m.done ? 'bg-green-500/20' : 'bg-grappler-700/60',
                )}>
                  {m.done
                    ? <Check className="w-3 h-3 text-green-400" />
                    : <MIcon className="w-3 h-3 text-grappler-500" />
                  }
                </div>
                <span className={cn(
                  'text-xs flex-1',
                  m.done ? 'text-green-400/80' : 'text-grappler-200',
                )}>
                  {m.label}
                </span>
                <span className={cn(
                  'text-xs',
                  m.done ? 'text-green-400/60' : 'text-grappler-500',
                )}>
                  {m.detail}
                </span>
              </button>
            );
          })}
        </div>

        {/* Forward look — only when not all complete (shown in headline when complete) */}
        {!allComplete && props.forwardLook && (
          <div className="flex items-center gap-2 px-5 pb-2">
            <ChevronRight className="w-3 h-3 text-grappler-600 flex-shrink-0" />
            <p className="text-xs text-grappler-400">{props.forwardLook}</p>
          </div>
        )}

        {/* Mesocycle progress */}
        {props.mesocycleProgress && (
          <div className="flex items-center gap-2 px-5 pb-3">
            <div className="flex-1 h-1.5 bg-grappler-700 rounded-full overflow-hidden">
              <div className="h-full bg-grappler-500 rounded-full" style={{ width: `${props.mesocycleProgress.percent}%` }} />
            </div>
            <span className="text-xs text-grappler-400">{props.mesocycleProgress.completed}/{props.mesocycleProgress.total}</span>
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
        <button onClick={props.onQuickWorkout} className="flex items-center gap-1.5 py-2 text-xs text-grappler-400 hover:text-grappler-300 transition-colors">
          <Zap className="w-3.5 h-3.5" />Quick 30m
        </button>
      </div>
    </motion.div>
  );
}
