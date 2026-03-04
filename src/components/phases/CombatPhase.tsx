'use client';

import { motion } from 'framer-motion';
import {
  Check, Shield, Clock, Target, Dumbbell, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SkipReason } from '@/lib/types';

interface CombatSession {
  type: string;
  duration: number;
  intensity: string;
  logged: boolean;
}

interface CombatPhaseProps {
  headline: string;
  subline: string;
  actions: string[];
  todayCombatSessions: CombatSession[];
  mesocycleProgress: { total: number; completed: number; percent: number } | null;
  nextWorkout: { name: string; exercises: { exercise: { name: string }; sets: number; prescription: { targetReps: number } }[]; estimatedDuration: number } | null;
  nextLiftDayLabel?: string;
  onStartWorkout: (session: any) => void;
  onSkipWorkout: (skip: { date: string; scheduledSessionId: string; reason: SkipReason; rescheduled: boolean }) => void;
  onLogSession: (session: CombatSession) => void;
  onDismissCard: (id: string) => void;
  showToast: (msg: string, type?: string) => void;
}

export default function CombatPhase({
  headline,
  subline,
  actions,
  todayCombatSessions,
  mesocycleProgress,
  nextWorkout,
  nextLiftDayLabel,
  onStartWorkout,
  onSkipWorkout,
  onLogSession,
  onDismissCard,
  showToast,
}: CombatPhaseProps) {
  const allCombatLogged = todayCombatSessions.length > 0 && todayCombatSessions.every(s => s.logged);
  const loggedCount = todayCombatSessions.filter(s => s.logged).length;
  const totalDuration = todayCombatSessions.reduce((sum, s) => sum + (s.duration || 0), 0);

  return (
    <motion.div key="zone2-combat" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
      <div className={cn(
        'rounded-2xl overflow-hidden border',
        allCombatLogged
          ? 'border-green-500/30 bg-gradient-to-br from-green-500/10 via-grappler-800 to-grappler-900'
          : 'border-purple-500/20 bg-gradient-to-br from-grappler-800 via-grappler-850 to-purple-950/30'
      )}>
        {/* Header */}
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1">
            {allCombatLogged ? <Check className="w-4 h-4 text-green-400" /> : <Shield className="w-4 h-4 text-purple-400" />}
            {todayCombatSessions.length === 1 && (
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold ml-1',
                /hard|sparring|competition/i.test(todayCombatSessions[0].intensity) ? 'bg-red-500/15 text-red-400 border border-red-500/20' :
                /moderate/i.test(todayCombatSessions[0].intensity) ? 'bg-yellow-500/12 text-yellow-400 border border-yellow-500/20' :
                'bg-green-500/12 text-green-400 border border-green-500/20'
              )}>{todayCombatSessions[0].intensity}</span>
            )}
            {mesocycleProgress && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-grappler-500">Block</span>
                <div className="w-16 h-1 bg-grappler-700 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-400/60 rounded-full" style={{ width: `${mesocycleProgress.percent}%` }} />
                </div>
                <span className="text-xs text-grappler-400 tabular-nums">{mesocycleProgress.completed}/{mesocycleProgress.total}</span>
              </div>
            )}
          </div>
          <h2 className="text-xl font-black text-grappler-50 leading-tight">{headline}</h2>
          <p className="text-xs text-grappler-400 mt-1">{subline}</p>
        </div>

        {/* Session list — only for 2+ sessions */}
        {todayCombatSessions.length > 1 && (
          <div className="mx-5 mb-3 space-y-2">
            {todayCombatSessions.map((s, i) => (
              <div key={i} className={cn(
                'rounded-xl border px-3.5 py-2.5 flex items-center gap-3',
                s.logged
                  ? 'bg-green-500/8 border-green-500/20'
                  : 'bg-grappler-900/50 border-grappler-700/40'
              )}>
                {s.logged ? <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> : <Shield className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-grappler-200">{s.type}</p>
                  <p className="text-xs text-grappler-400">{s.duration > 0 ? `${s.duration}min` : 'Open mat'}</p>
                </div>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold',
                  /hard|sparring|competition/i.test(s.intensity) ? 'bg-red-500/15 text-red-400 border border-red-500/20' :
                  /moderate/i.test(s.intensity) ? 'bg-yellow-500/12 text-yellow-400 border border-yellow-500/20' :
                  'bg-green-500/12 text-green-400 border border-green-500/20'
                )}>{s.intensity}</span>
                {!s.logged && (
                  <>
                    <button
                      onClick={() => {
                        onLogSession(s);
                        showToast(`Logged ${s.type}`, 'success');
                      }}
                      className="text-green-400 hover:text-green-300 transition-colors"
                      title="Mark as done"
                    >
                      <Check className="w-4 h-4" />
                    </button>
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
                  </>
                )}
              </div>
            ))}

            {/* Stats row */}
            <div className="flex items-center gap-2 pt-1">
              <div className="flex items-center gap-1.5 bg-grappler-900/40 rounded-lg px-2.5 py-1.5">
                <Shield className="w-3 h-3 text-grappler-500" />
                <span className="text-xs text-grappler-300 font-medium">{loggedCount}/{todayCombatSessions.length}</span>
              </div>
              {totalDuration > 0 && (
                <div className="flex items-center gap-1.5 bg-grappler-900/40 rounded-lg px-2.5 py-1.5">
                  <Clock className="w-3 h-3 text-grappler-500" />
                  <span className="text-xs text-grappler-300 font-medium">{totalDuration}min</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Single session actions */}
        {todayCombatSessions.length === 1 && !todayCombatSessions[0].logged && (
          <div className="mx-5 mb-3 flex items-center gap-3">
            <button
              onClick={() => {
                onLogSession(todayCombatSessions[0]);
                showToast(`Logged ${todayCombatSessions[0].type}`, 'success');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/15 hover:bg-green-500/25 text-green-400 text-xs font-medium rounded-lg border border-green-500/20 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Done
            </button>
            <button
              onClick={() => {
                onSkipWorkout({
                  date: new Date().toISOString().split('T')[0],
                  scheduledSessionId: 'combat-0',
                  reason: 'schedule_conflict' as SkipReason,
                  rescheduled: false,
                });
                onDismissCard('combat-0');
                showToast(`Skipped ${todayCombatSessions[0].type}`, 'info');
              }}
              className="text-xs text-grappler-500 hover:text-grappler-300 transition-colors"
            >
              Skip
            </button>
          </div>
        )}

        {/* Action items */}
        {(() => {
          const filteredActions = actions.filter(a =>
            !a.includes(todayCombatSessions[0]?.type || '§') &&
            !/protein|next lift/i.test(a)
          );
          return filteredActions.length > 0 ? (
            <div className="mx-5 mb-3 space-y-1">
              {filteredActions.map((a, i) => (
                <div key={i} className="flex items-start gap-2"><Target className="w-3 h-3 text-grappler-400 flex-shrink-0 mt-0.5" /><p className="text-xs text-grappler-400">{a}</p></div>
              ))}
            </div>
          ) : null;
        })()}
      </div>

      {/* Next strength session */}
      {nextWorkout && (
        <div className="w-full rounded-xl border border-grappler-700/30 bg-grappler-800/30 p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
            <Dumbbell className="w-4 h-4 text-primary-400/60" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-grappler-400 font-medium uppercase tracking-wide">
              Next Strength{nextLiftDayLabel ? ` · ${nextLiftDayLabel}` : ''}
            </p>
            <p className="text-sm font-semibold text-grappler-300 truncate">{nextWorkout.name}</p>
            <p className="text-xs text-grappler-400">{nextWorkout.exercises.length} exercises · ~{nextWorkout.estimatedDuration}m</p>
          </div>
          <button
            onClick={() => onStartWorkout(nextWorkout)}
            className="text-xs text-primary-400/60 hover:text-primary-400 px-2.5 py-1.5 rounded-lg hover:bg-primary-500/10 transition-colors flex-shrink-0"
          >
            Start
          </button>
        </div>
      )}
    </motion.div>
  );
}
