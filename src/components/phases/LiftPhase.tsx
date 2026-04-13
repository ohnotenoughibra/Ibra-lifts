'use client';

import { motion } from 'framer-motion';
import {
  Dumbbell, Play, TrendingUp, Clock, Target, Zap,
  Moon, Apple, Droplets, HeartPulse, Shield, Check, X,
  AlertTriangle, SkipForward,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OverlayView } from '../dashboard-types';
import type { SkipReason } from '@/lib/types';

interface CombatSession {
  type: string;
  duration: number;
  intensity: string;
  logged: boolean;
}

interface LiftPhaseProps {
  directive: {
    todayType: string;
    isDeload: boolean;
    sessionLabel?: string | null;
    subline: string;
    overloadTeaser?: string | null;
    trainingModification?: string | null;
    todayCombatSessions: CombatSession[];
  };
  nextWorkout: {
    id: string;
    name: string;
    exercises: { exercise: { name: string }; sets: number; prescription: { targetReps: number } }[];
    estimatedDuration: number;
  };
  mesocycleProgress: { total: number; completed: number; percent: number } | null;
  mesocycleQueue: { name: string; weeks: number; periodization?: string }[];
  sleepHours: number | null;
  todayProtein: number;
  macroTargets: { protein: number };
  waterTodayL: number;
  waterTodayGlasses: number;
  recoveryScore: number | null;
  weightUnit: string;
  workoutLogsLength: number;
  onStartWorkout: (session: any) => void;
  onQuickWorkout: () => void;
  onSkipWorkout: (skip: { date: string; scheduledSessionId: string; reason: SkipReason; rescheduled: boolean }) => void;
  onNavigate: (view: OverlayView) => void;
  onDismissCard: (id: string) => void;
  onShowSkipDialog: () => void;
  showToast: (msg: string, type?: string) => void;
}

export default function LiftPhase({
  directive,
  nextWorkout,
  mesocycleProgress,
  mesocycleQueue,
  sleepHours,
  todayProtein,
  macroTargets,
  waterTodayL,
  waterTodayGlasses,
  recoveryScore,
  weightUnit,
  workoutLogsLength,
  onStartWorkout,
  onQuickWorkout,
  onSkipWorkout,
  onNavigate,
  onDismissCard,
  onShowSkipDialog,
  showToast,
}: LiftPhaseProps) {


  return (
    <motion.div
      key="zone2-lift"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      {/* Pre-Workout Intel Strip */}
      {(() => {
        const intelChips: { label: string; value: string; color: string; icon: React.ReactNode }[] = [];
        if (sleepHours != null) intelChips.push({ label: 'Sleep', value: `${sleepHours.toFixed(1)}h`, color: sleepHours >= 7 ? 'text-green-400' : sleepHours >= 5.5 ? 'text-yellow-400' : 'text-red-400', icon: <Moon className="w-3 h-3" /> });
        if (macroTargets.protein > 0) intelChips.push({ label: 'Protein', value: `${Math.round(todayProtein)}/${Math.round(macroTargets.protein)}g`, color: todayProtein >= macroTargets.protein * 0.5 ? 'text-green-400' : todayProtein > 0 ? 'text-yellow-400' : 'text-grappler-500', icon: <Apple className="w-3 h-3" /> });
        if (waterTodayL > 0 || macroTargets.protein > 0) intelChips.push({ label: 'Water', value: waterTodayL > 0 ? `${waterTodayL}L` : '—', color: waterTodayL >= 1.5 ? 'text-blue-400' : waterTodayL >= 0.75 ? 'text-blue-300' : 'text-grappler-500', icon: <Droplets className="w-3 h-3" /> });
        if (recoveryScore != null) intelChips.push({ label: 'Recovery', value: `${recoveryScore}%`, color: recoveryScore >= 67 ? 'text-green-400' : recoveryScore >= 34 ? 'text-yellow-400' : 'text-red-400', icon: <HeartPulse className="w-3 h-3" /> });
        return intelChips.length > 0 ? (
          <div className="flex items-center gap-1 px-1 overflow-x-auto no-scrollbar">
            {intelChips.map(chip => (
              <div key={chip.label} className="flex items-center gap-1.5 bg-grappler-800/60 border border-grappler-700/50 rounded-lg px-2.5 py-1.5 flex-shrink-0">
                <span className={chip.color}>{chip.icon}</span>
                <span className={cn('text-xs font-bold tabular-nums', chip.color)}>{chip.value}</span>
              </div>
            ))}
          </div>
        ) : null;
      })()}

      {/* Training modification warning */}
      {directive.trainingModification && (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-200 font-medium leading-snug">{directive.trainingModification}</p>
        </div>
      )}

      {/* Main Mission Card */}
      <div className={cn(
        "rounded-2xl overflow-hidden border",
        directive.todayType === 'both'
          ? 'border-purple-500/20 bg-gradient-to-br from-grappler-800 via-grappler-850 to-purple-950/30'
          : 'border-primary-500/20 bg-gradient-to-br from-grappler-800 via-grappler-850 to-primary-950/20'
      )}>
        {/* Card header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-1">
          <div className="flex items-center gap-2">
            <Dumbbell className={cn('w-4 h-4', directive.todayType === 'both' ? 'text-purple-400' : 'text-primary-400')} />
            <span className="text-xs font-bold uppercase tracking-widest text-grappler-400">
              {directive.todayType === 'both' ? 'Lift + Mat Day' : directive.isDeload ? 'Deload Session' : 'Training Day'}
            </span>
          </div>
          {mesocycleProgress && (
            <button
              onClick={() => onNavigate('program_browser')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              title="Browse programs"
            >
              <span className="text-xs text-grappler-500">Block</span>
              <div className="w-16 h-1 bg-grappler-700 rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full', directive.todayType === 'both' ? 'bg-purple-400/60' : 'bg-primary-400/60')} style={{ width: `${mesocycleProgress.percent}%` }} />
              </div>
              <span className="text-xs text-grappler-400 tabular-nums">{mesocycleProgress.completed}/{mesocycleProgress.total}</span>
            </button>
          )}
        </div>

        {/* Workout name + subline */}
        <div className="px-5 pb-3">
          <h2 className="text-xl font-black text-grappler-50 leading-tight">{nextWorkout.name}</h2>
          {directive.sessionLabel && (
            <p className="text-xs text-grappler-500 mt-0.5">{directive.sessionLabel}</p>
          )}
          <p className="text-xs text-grappler-400 mt-1 leading-relaxed">{directive.subline}</p>
        </div>

        {/* Overload teaser */}
        {directive.overloadTeaser && (
          <div className="mx-5 mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/8 border border-green-500/15">
            <TrendingUp className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
            <p className="text-xs text-green-300 font-semibold">{directive.overloadTeaser}</p>
          </div>
        )}

        {/* Exercise lineup */}
        <div className="mx-5 mb-3 bg-grappler-900/50 rounded-xl border border-grappler-700/40 overflow-hidden">
          {nextWorkout.exercises.slice(0, 4).map((ex, i) => (
            <div key={i} className={cn(
              'flex items-center gap-3 px-3 py-2',
              i < Math.min(3, nextWorkout.exercises.length - 1) && 'border-b border-grappler-700/30'
            )}>
              <span className="text-xs font-bold text-grappler-600 w-4 text-center tabular-nums">{i + 1}</span>
              <p className="text-xs text-grappler-200 flex-1 truncate">{ex.exercise.name}</p>
              <span className="text-xs text-grappler-400 tabular-nums">{ex.sets}×{ex.prescription.targetReps}</span>
            </div>
          ))}
          {nextWorkout.exercises.length > 4 && (
            <div className="px-3 py-1.5 text-center border-t border-grappler-700/30">
              <span className="text-xs text-grappler-400">+{nextWorkout.exercises.length - 4} more exercises</span>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="mx-5 mb-4 flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-grappler-900/40 rounded-lg px-2.5 py-1.5">
            <Dumbbell className="w-3 h-3 text-grappler-500" />
            <span className="text-xs text-grappler-300 font-medium">{nextWorkout.exercises.length}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-grappler-900/40 rounded-lg px-2.5 py-1.5">
            <Clock className="w-3 h-3 text-grappler-500" />
            <span className="text-xs text-grappler-300 font-medium">~{nextWorkout.estimatedDuration}m</span>
          </div>
          <div className="flex items-center gap-1.5 bg-grappler-900/40 rounded-lg px-2.5 py-1.5">
            <Target className="w-3 h-3 text-grappler-500" />
            <span className="text-xs text-grappler-300 font-medium">{nextWorkout.exercises.reduce((s, e) => s + e.sets, 0)} sets</span>
          </div>
        </div>

        {/* START CTA */}
        <div className="px-5 pb-5">
          <button
            onClick={() => onStartWorkout(nextWorkout)}
            className={cn(
              "w-full py-4 rounded-2xl font-bold text-white text-lg flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all shadow-lg",
              directive.todayType === 'both'
                ? 'bg-gradient-to-r from-primary-500 via-purple-500 to-indigo-500 shadow-purple-500/20'
                : 'bg-gradient-to-r from-primary-500 to-accent-500 shadow-primary-500/20',
              workoutLogsLength === 0 && "ring-2 ring-primary-400/50 ring-offset-2 ring-offset-grappler-900 animate-pulse"
            )}
          >
            <Play className="w-6 h-6" />
            Start Workout
          </button>
        </div>
      </div>

      {/* Combat callout when both */}
      {directive.todayType === 'both' && directive.todayCombatSessions.length > 0 && (
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-purple-400">Also on the mat</span>
          </div>
          {directive.todayCombatSessions.map((s, i) => (
            <div key={i} className="flex items-center gap-2.5 bg-grappler-800/40 border border-purple-500/15 rounded-lg px-3 py-2">
              {s.logged ? <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> : <Shield className="w-3.5 h-3.5 text-purple-400/60 flex-shrink-0" />}
              <p className="text-xs text-grappler-300 flex-1">{s.type}{s.duration > 0 ? ` · ${s.duration}min` : ''}</p>
              <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium',
                /hard|sparring|competition/i.test(s.intensity) ? 'bg-red-500/15 text-red-400' :
                /moderate/i.test(s.intensity) ? 'bg-yellow-500/15 text-yellow-400' :
                'bg-green-500/15 text-green-400'
              )}>{s.intensity}</span>
              {!s.logged && (
              <button
                onClick={() => {
                  onSkipWorkout({
                    date: new Date().toISOString().split('T')[0],
                    scheduledSessionId: `combat-${i}`,
                    reason: 'schedule_conflict' as SkipReason,
                    rescheduled: false,
                  });
                  onDismissCard(`combat-${i}`);
                  showToast(`Skipped ${s.type}`, 'info');
                }}
                className="text-grappler-600 hover:text-grappler-300 transition-colors"
                title="Skip this session"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Secondary actions — skip visible, quick workout accessible */}
      <div className="flex items-center justify-center gap-3">
        <button onClick={onQuickWorkout} className="flex items-center gap-1.5 py-2 text-xs text-grappler-400 hover:text-grappler-300 transition-colors"><Zap className="w-3.5 h-3.5" />Quick 30m</button>
        <span className="text-grappler-700">·</span>
        <button
          onClick={onShowSkipDialog}
          className="flex items-center gap-1.5 py-2 text-xs text-grappler-500 hover:text-grappler-300 transition-colors"
        >
          <SkipForward className="w-3.5 h-3.5" />Skip
        </button>
      </div>
    </motion.div>
  );
}
