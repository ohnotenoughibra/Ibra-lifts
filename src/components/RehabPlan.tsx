'use client';

/**
 * RehabPlan — phased return-to-training program for a logged injury.
 * Built on rehab-engine.ts, mirrors the pattern of IllnessLogger.
 *
 * Five phases:
 *   1. Protected Movement
 *   2. Controlled Loading
 *   3. Progressive Strengthening
 *   4. Integration
 *   5. Return to Sport
 *
 * Phase advancement is gated by check-in criteria — pain, ROM, swelling,
 * 24h symptom response. The user can manually advance/regress, but the
 * gate exists to protect them from re-injury.
 */

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Shield,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertTriangle,
  Activity,
  Clock,
  Target,
  TrendingUp,
  ArrowRight,
  ArrowLeft,
  Heart,
  Flame,
  Youtube,
  CheckCircle2,
  Circle,
  Info,
  PlayCircle,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { InjuryEntry, BodyRegion } from '@/lib/types';
import {
  generateRehabSession,
  getDailyRehabPlan,
  evaluatePhaseAdvancement,
  getPhasedTimeline,
  getReturnToSportTests,
  buildCheckIn,
  type RehabPhaseNumber,
  type RehabExercise,
} from '@/lib/rehab-engine';
import { classifyInjury, getInjuryTimeline } from '@/lib/injury-science';
import { cn } from '@/lib/utils';
import { useToast } from './Toast';

interface RehabPlanProps {
  onClose: () => void;
  preselectedInjuryId?: string;
}

const REGION_LABELS: Record<BodyRegion, string> = {
  neck: 'Neck',
  left_shoulder: 'Left Shoulder', right_shoulder: 'Right Shoulder',
  chest: 'Chest', upper_back: 'Upper Back', lower_back: 'Lower Back', core: 'Core',
  left_elbow: 'Left Elbow', right_elbow: 'Right Elbow',
  left_wrist: 'Left Wrist', right_wrist: 'Right Wrist',
  left_hip: 'Left Hip', right_hip: 'Right Hip',
  left_knee: 'Left Knee', right_knee: 'Right Knee',
  left_ankle: 'Left Ankle', right_ankle: 'Right Ankle',
};

const PHASE_COLORS: Record<RehabPhaseNumber, { bg: string; text: string; border: string }> = {
  1: { bg: 'bg-rose-500/15',   text: 'text-rose-300',   border: 'border-rose-500/30' },
  2: { bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border-orange-500/30' },
  3: { bg: 'bg-amber-500/15',  text: 'text-amber-300',  border: 'border-amber-500/30' },
  4: { bg: 'bg-sky-500/15',    text: 'text-sky-300',    border: 'border-sky-500/30' },
  5: { bg: 'bg-emerald-500/15',text: 'text-emerald-300',border: 'border-emerald-500/30' },
};

type View = 'plan' | 'session' | 'checkin' | 'advance' | 'rts-tests';

export default function RehabPlan({ onClose, preselectedInjuryId }: RehabPlanProps) {
  const { showToast } = useToast();
  const injuryLog = useAppStore(s => s.injuryLog ?? []);
  const rehabStates = useAppStore(s => s.rehabStates ?? {});
  const startRehab = useAppStore(s => s.startRehab);
  const addRehabCheckIn = useAppStore(s => s.addRehabCheckIn);
  const advanceRehabPhase = useAppStore(s => s.advanceRehabPhase);
  const endRehab = useAppStore(s => s.endRehab);
  const resolveInjury = useAppStore(s => s.resolveInjury);

  const activeInjuries = useMemo(
    () => injuryLog.filter(i => !i.resolved && !i._deleted),
    [injuryLog]
  );

  const [selectedId, setSelectedId] = useState<string | null>(
    preselectedInjuryId ?? activeInjuries[0]?.id ?? null
  );
  const [view, setView] = useState<View>('plan');

  const selected = useMemo(
    () => activeInjuries.find(i => i.id === selectedId) ?? null,
    [activeInjuries, selectedId]
  );

  // No active injuries — empty state
  if (activeInjuries.length === 0 || !selected) {
    return (
      <div className="fixed inset-0 z-50 bg-grappler-950 overflow-y-auto">
        <div className="sticky top-0 bg-grappler-950/95 backdrop-blur border-b border-grappler-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-sky-400" />
            <h1 className="text-lg font-bold text-white">Rehab Plan</h1>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-3 -mr-1 hover:bg-grappler-800 rounded-lg active:scale-95 transition">
            <X className="w-5 h-5 text-grappler-300" />
          </button>
        </div>
        <div className="p-6 max-w-md mx-auto text-center mt-12">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No active injuries</h2>
          <p className="text-grappler-300 text-sm mb-6">
            Rehab plans appear here when you log an injury. Stay healthy out there.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-grappler-800 text-grappler-100 hover:bg-grappler-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const state = rehabStates[selected.id];
  const hasStarted = !!state;

  return (
    <div className="fixed inset-0 z-50 bg-grappler-950 overflow-y-auto">
      <Header onClose={onClose} injury={selected} state={state} />

      {!hasStarted ? (
        <StartScreen
          injury={selected}
          onStart={() => {
            startRehab(selected.id);
            showToast('Rehab plan started', 'success');
          }}
        />
      ) : (
        <>
          {/* Injury switcher (if multiple) */}
          {activeInjuries.length > 1 && (
            <div className="px-4 pt-3 flex gap-2 overflow-x-auto">
              {activeInjuries.map(inj => (
                <button
                  key={inj.id}
                  onClick={() => { setSelectedId(inj.id); setView('plan'); }}
                  className={cn(
                    'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition',
                    inj.id === selected.id
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      : 'bg-grappler-800/50 text-grappler-300 border border-grappler-800'
                  )}
                >
                  {REGION_LABELS[inj.bodyRegion]}
                </button>
              ))}
            </div>
          )}

          {/* View tabs */}
          <div className="px-4 pt-3 pb-2 flex gap-1.5 overflow-x-auto">
            {(['plan', 'session', 'checkin', 'advance'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wide transition',
                  view === v
                    ? 'bg-grappler-100 text-grappler-950'
                    : 'bg-grappler-800/50 text-grappler-300 hover:bg-grappler-800'
                )}
              >
                {v === 'plan' ? 'Plan' : v === 'session' ? "Today's Session" : v === 'checkin' ? 'Check-In' : 'Advance'}
              </button>
            ))}
          </div>

          <div className="px-4 pb-24">
            <AnimatePresence mode="wait">
              {view === 'plan' && (
                <motion.div key="plan" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <PlanView injury={selected} stateExists />
                </motion.div>
              )}
              {view === 'session' && (
                <motion.div key="session" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <SessionView injury={selected} />
                </motion.div>
              )}
              {view === 'checkin' && (
                <motion.div key="checkin" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <CheckInView
                    injuryId={selected.id}
                    onSubmit={(c) => {
                      addRehabCheckIn(selected.id, buildCheckIn(c));
                      showToast('Check-in logged', 'success');
                      setView('advance');
                    }}
                  />
                </motion.div>
              )}
              {view === 'advance' && (
                <motion.div key="advance" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <AdvanceView
                    injury={selected}
                    onAdvance={(phase) => {
                      advanceRehabPhase(selected.id, phase);
                      showToast(`Advanced to phase ${phase}`, 'success');
                      setView('plan');
                    }}
                    onResolveInjury={() => {
                      resolveInjury(selected.id);
                      endRehab(selected.id);
                      showToast('Injury resolved — back to full training', 'success');
                      onClose();
                    }}
                    onShowRTS={() => setView('rts-tests')}
                  />
                </motion.div>
              )}
              {view === 'rts-tests' && (
                <motion.div key="rts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <RTSTestsView region={selected.bodyRegion} onBack={() => setView('advance')} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────────────────

function Header({ onClose, injury, state }: { onClose: () => void; injury: InjuryEntry; state?: { phaseOverride?: RehabPhaseNumber } }) {
  const classification = classifyInjury(injury);
  const timeline = getInjuryTimeline(injury);
  const derivedPhase = state?.phaseOverride ?? mapPhase(classification, timeline.daysSinceInjury);

  return (
    <div className="sticky top-0 z-10 bg-grappler-950/95 backdrop-blur border-b border-grappler-800 px-4 py-3 safe-area-top flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        <Shield className="w-5 h-5 text-sky-400 flex-shrink-0" />
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-white truncate">Rehab — {REGION_LABELS[injury.bodyRegion]}</h1>
          <p className="text-xs text-grappler-400">{timeline.tissueLabel} · day {timeline.daysSinceInjury}</p>
        </div>
      </div>
      <button onClick={onClose} aria-label="Close" className="p-3 -mr-1 hover:bg-grappler-800 rounded-lg active:scale-95 transition flex-shrink-0">
        <X className="w-5 h-5 text-grappler-300" />
      </button>
    </div>
  );
}

function mapPhase(classification: ReturnType<typeof classifyInjury>, days: number): RehabPhaseNumber {
  if (classification.currentPhase === 'acute') return 1;
  if (classification.currentPhase === 'subacute') return 2;
  if (classification.currentPhase === 'remodeling') {
    const total = classification.estimatedHealDays.max;
    return (days - total * 0.5) / (total * 0.35) > 0.6 ? 4 : 3;
  }
  return 5;
}

// ─────────────────────────────────────────────────────────────────────────
// Start Screen — when rehab not yet begun
// ─────────────────────────────────────────────────────────────────────────

function StartScreen({ injury, onStart }: { injury: InjuryEntry; onStart: () => void }) {
  const classification = classifyInjury(injury);
  const timeline = getInjuryTimeline(injury);

  return (
    <div className="px-4 py-6 max-w-xl mx-auto space-y-5">
      <div className="rounded-xl bg-sky-500/10 border border-sky-500/30 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-5 h-5 text-sky-400" />
          <h2 className="font-bold text-white">Phased Rehab Plan</h2>
        </div>
        <p className="text-sm text-grappler-200 leading-relaxed">
          5 phases from <strong className="text-sky-300">Protected Movement</strong> → <strong className="text-emerald-300">Return to Sport</strong>.
          Daily exercises, pain monitoring, and phase-advancement gates that keep you from re-injuring.
        </p>
      </div>

      <div className="rounded-xl bg-grappler-900/60 border border-grappler-800 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-grappler-100 uppercase tracking-wider">Your Injury</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="Tissue" value={timeline.tissueLabel} />
          <Stat label="Phase" value={timeline.phaseLabel} />
          <Stat label="Day" value={`${timeline.daysSinceInjury}`} />
          <Stat label="Healing" value={`${timeline.percentHealed}%`} />
          <Stat label="Est. remaining"
            value={`${timeline.estimatedDaysRemaining.min}–${timeline.estimatedDaysRemaining.max}d`} />
          <Stat label="Severity" value={`${injury.severity}/5`} />
        </div>
      </div>

      <div className="rounded-xl bg-grappler-900/60 border border-grappler-800 p-5">
        <h3 className="text-sm font-semibold text-grappler-100 uppercase tracking-wider mb-3">What you get</h3>
        <ul className="space-y-2.5 text-sm text-grappler-200">
          <Bullet icon={Target}>Daily session with phase-appropriate exercises</Bullet>
          <Bullet icon={Activity}>Pain + ROM check-ins (the Silbernagel 24h rule)</Bullet>
          <Bullet icon={TrendingUp}>Phase advancement gates — protect against re-injury</Bullet>
          <Bullet icon={CheckCircle2}>Return-to-sport functional tests in phase 5</Bullet>
        </ul>
      </div>

      <button
        onClick={onStart}
        className="w-full px-5 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold transition flex items-center justify-center gap-2"
      >
        Start Rehab Plan
        <ArrowRight className="w-5 h-5" />
      </button>

      <p className="text-xs text-grappler-500 text-center">
        Educational tool — not medical advice. Severe injuries warrant a clinician.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-grappler-400 uppercase tracking-wider">{label}</div>
      <div className="text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function Bullet({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <Icon className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Plan View — phase timeline + today's overview
// ─────────────────────────────────────────────────────────────────────────

function PlanView({ injury, stateExists: _stateExists }: { injury: InjuryEntry; stateExists: boolean }) {
  const rehabStates = useAppStore(s => s.rehabStates ?? {});
  const state = rehabStates[injury.id];
  const plan = useMemo(() => getDailyRehabPlan(injury, state), [injury, state]);
  const timeline = useMemo(() => getPhasedTimeline(injury, state), [injury, state]);
  const colors = PHASE_COLORS[plan.phase];

  return (
    <div className="space-y-5 mt-2">
      {/* Phase headline */}
      <div className={cn('rounded-xl border p-5', colors.bg, colors.border)}>
        <div className="flex items-center justify-between mb-2">
          <span className={cn('text-xs font-bold uppercase tracking-wider', colors.text)}>
            Phase {plan.phase} of 5
          </span>
          <span className="text-xs text-grappler-400">Day {plan.daysSinceInjury}</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">{plan.phaseName}</h2>
        <p className="text-sm text-grappler-200 leading-relaxed">{plan.todaysFocus}</p>
        <div className="mt-3 pt-3 border-t border-grappler-800/60 flex items-start gap-2">
          <Flame className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-grappler-300 italic">{plan.motivationalCue}</p>
        </div>
      </div>

      {/* Phase timeline */}
      <div className="rounded-xl bg-grappler-900/60 border border-grappler-800 p-4">
        <h3 className="text-xs font-semibold text-grappler-300 uppercase tracking-wider mb-3">Phase Timeline</h3>
        <div className="space-y-2">
          {timeline.phases.map(p => (
            <div
              key={p.phase}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg border',
                p.status === 'current' && 'bg-grappler-800/60 border-grappler-700',
                p.status === 'completed' && 'bg-emerald-500/5 border-emerald-500/20',
                p.status === 'upcoming' && 'border-grappler-800 opacity-60'
              )}
            >
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                p.status === 'current' && 'bg-sky-500 text-white',
                p.status === 'completed' && 'bg-emerald-500/30 text-emerald-300',
                p.status === 'upcoming' && 'bg-grappler-800 text-grappler-400'
              )}>
                {p.status === 'completed' ? <Check className="w-3.5 h-3.5" /> : p.phase}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{p.name}</div>
                <div className="text-[11px] text-grappler-400">~{p.estimatedDays}d</div>
              </div>
              {p.status === 'current' && (
                <span className="text-[10px] font-bold text-sky-400 uppercase">Now</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Healing progress bar */}
      <div className="rounded-xl bg-grappler-900/60 border border-grappler-800 p-4">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-xs font-semibold text-grappler-300 uppercase tracking-wider">Healing Progress</span>
          <span className="text-sm font-bold text-white">{plan.percentHealed}%</span>
        </div>
        <div className="h-2 rounded-full bg-grappler-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all"
            style={{ width: `${plan.percentHealed}%` }}
          />
        </div>
        <p className="text-xs text-grappler-400 mt-2">{plan.nextMilestone}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Session View — today's exercises with sets/reps
// ─────────────────────────────────────────────────────────────────────────

function SessionView({ injury }: { injury: InjuryEntry }) {
  const rehabStates = useAppStore(s => s.rehabStates ?? {});
  const state = rehabStates[injury.id];
  const session = useMemo(
    () => generateRehabSession(injury, state?.phaseOverride),
    [injury, state]
  );
  const colors = PHASE_COLORS[session.phase];

  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4 mt-2">
      <div className={cn('rounded-xl border p-4', colors.bg, colors.border)}>
        <div className="flex items-center justify-between mb-1">
          <span className={cn('text-xs font-bold uppercase tracking-wider', colors.text)}>
            Phase {session.phase} · {session.phaseName}
          </span>
          <span className="text-xs text-grappler-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> ~{session.estimatedMinutes} min
          </span>
        </div>
        <p className="text-xs text-grappler-300">{session.phaseGoal}</p>
        <div className="mt-2 pt-2 border-t border-grappler-800/40 flex items-center gap-2 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-grappler-300">Pain cap: <strong className="text-white">{session.painCap}/10</strong> — stop if exceeded</span>
        </div>
      </div>

      {/* Warm-up */}
      <Section title="Warm-Up" icon={Flame}>
        <ul className="space-y-1.5 text-sm text-grappler-200">
          {session.warmUp.map((w, i) => <li key={i} className="flex gap-2"><Circle className="w-3 h-3 text-grappler-500 flex-shrink-0 mt-1.5" /> {w}</li>)}
        </ul>
      </Section>

      {/* Main exercises */}
      <Section title={`Main Work (${session.exercises.length})`} icon={Target}>
        <div className="space-y-2.5">
          {session.exercises.map(ex => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              completed={completed.has(ex.id)}
              onToggle={() => toggle(ex.id)}
            />
          ))}
        </div>
      </Section>

      {/* Cool-down */}
      <Section title="Cool-Down" icon={Heart}>
        <ul className="space-y-1.5 text-sm text-grappler-200">
          {session.coolDown.map((c, i) => <li key={i} className="flex gap-2"><Circle className="w-3 h-3 text-grappler-500 flex-shrink-0 mt-1.5" /> {c}</li>)}
        </ul>
      </Section>

      {/* Post-session guidance */}
      <div className="rounded-xl bg-grappler-900/60 border border-grappler-800 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-sky-400" />
          <h3 className="text-sm font-semibold text-white">Post-Session</h3>
        </div>
        <p className="text-sm text-grappler-300 leading-relaxed">{session.postSessionGuidance}</p>
      </div>

      {/* Red flags */}
      <div className="rounded-xl bg-rose-500/5 border border-rose-500/20 p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <h3 className="text-sm font-semibold text-white">Stop If</h3>
        </div>
        <ul className="space-y-1 text-xs text-grappler-300">
          {session.redFlags.map((f, i) => <li key={i}>• {f}</li>)}
        </ul>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-grappler-900/60 border border-grappler-800 p-4">
      <h3 className="text-sm font-semibold text-grappler-100 uppercase tracking-wider mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4 text-sky-400" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function ExerciseCard({ exercise, completed, onToggle }: { exercise: RehabExercise; completed: boolean; onToggle: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const repsLabel = exercise.reps && exercise.durationSeconds
    ? `${exercise.sets} × ${exercise.reps} (${exercise.durationSeconds}s hold)`
    : exercise.reps
      ? `${exercise.sets} × ${exercise.reps}`
      : exercise.durationSeconds
        ? `${exercise.sets} × ${exercise.durationSeconds}s`
        : `${exercise.sets} sets`;

  return (
    <div className={cn(
      'rounded-lg border transition',
      completed ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-grappler-950/40 border-grappler-800'
    )}>
      <div className="p-3 flex items-start gap-3">
        <button
          onClick={onToggle}
          aria-label={completed ? 'Mark incomplete' : 'Mark complete'}
          className="flex-shrink-0 mt-0.5"
        >
          {completed ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <Circle className="w-5 h-5 text-grappler-500 hover:text-grappler-300" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <h4 className={cn('text-sm font-semibold', completed ? 'text-emerald-200 line-through' : 'text-white')}>
              {exercise.name}
            </h4>
            <span className="text-xs font-mono text-sky-300 flex-shrink-0">{repsLabel}</span>
          </div>
          <p className="text-xs text-grappler-400 mb-1">{exercise.loadGuidance}</p>
          {exercise.evidenceNote && (
            <p className="text-[11px] text-emerald-400/80 italic mb-1">{exercise.evidenceNote}</p>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"
          >
            {expanded ? 'Hide cues' : `${exercise.cues.length} cues`}
            {expanded ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
          {expanded && (
            <div className="mt-2 space-y-1">
              {exercise.cues.map((cue, i) => (
                <div key={i} className="text-xs text-grappler-300 pl-3 border-l-2 border-sky-500/40">{cue}</div>
              ))}
              {exercise.videoSearch && (
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.videoSearch)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 mt-1"
                >
                  <Youtube className="w-3.5 h-3.5" />
                  Watch demo
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Check-In View
// ─────────────────────────────────────────────────────────────────────────

function CheckInView({ injuryId, onSubmit }: {
  injuryId: string;
  onSubmit: (c: Omit<import('@/lib/rehab-engine').RehabCheckIn, 'id'>) => void;
}) {
  const [painRest, setPainRest] = useState(2);
  const [painExercise, setPainExercise] = useState(3);
  const [pain24h, setPain24h] = useState(1);
  const [rom, setRom] = useState(75);
  const [swelling, setSwelling] = useState<'none' | 'mild' | 'moderate' | 'significant'>('none');
  const [completedSession, setCompletedSession] = useState(true);
  const [notes, setNotes] = useState('');

  const submit = () => {
    onSubmit({
      injuryId,
      date: new Date().toISOString(),
      painAtRest: painRest,
      painDuringExercise: painExercise,
      painAfter24h: pain24h,
      romPercent: rom,
      swellingLevel: swelling,
      completedSession,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="space-y-4 mt-2 max-w-xl mx-auto">
      <div className="rounded-xl bg-sky-500/10 border border-sky-500/20 p-4">
        <p className="text-xs text-sky-200 leading-relaxed">
          Daily check-ins drive phase advancement. <strong>Honesty &gt; optimism</strong> — the gates exist to protect you.
        </p>
      </div>

      <Slider label="Pain at rest" value={painRest} onChange={setPainRest} description="How does the area feel right now, sitting still?" />
      <Slider label="Pain during today's session" value={painExercise} onChange={setPainExercise} description="Peak pain you felt during exercises." />
      <Slider label="Pain 24h after last session" value={pain24h} onChange={setPain24h} description="Did pain return to baseline by next morning? (Silbernagel rule)" />

      <div className="rounded-xl bg-grappler-900/60 border border-grappler-800 p-4">
        <div className="flex items-baseline justify-between mb-2">
          <label className="text-sm font-semibold text-white">Range of Motion</label>
          <span className="text-sm font-mono text-sky-400">{rom}%</span>
        </div>
        <p className="text-xs text-grappler-400 mb-3">vs your uninjured side at full ROM</p>
        <input
          type="range" min={0} max={100} step={5}
          value={rom}
          onChange={e => setRom(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="rounded-xl bg-grappler-900/60 border border-grappler-800 p-4">
        <label className="block text-sm font-semibold text-white mb-3">Swelling</label>
        <div className="grid grid-cols-4 gap-2">
          {(['none', 'mild', 'moderate', 'significant'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSwelling(s)}
              className={cn(
                'px-2 py-2 rounded-lg text-xs font-medium capitalize transition',
                swelling === s
                  ? 'bg-sky-500 text-white'
                  : 'bg-grappler-800/60 text-grappler-300 hover:bg-grappler-800'
              )}
            >{s}</button>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-grappler-900/60 border border-grappler-800 p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={completedSession}
            onChange={e => setCompletedSession(e.target.checked)}
            className="w-4 h-4 accent-sky-500"
          />
          <span className="text-sm text-white">I completed today's rehab session</span>
        </label>
      </div>

      <div className="rounded-xl bg-grappler-900/60 border border-grappler-800 p-4">
        <label className="block text-sm font-semibold text-white mb-2">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Anything noteworthy — what felt good, what didn't…"
          className="w-full px-3 py-2 rounded-lg bg-grappler-950 border border-grappler-800 text-sm text-white placeholder-grappler-500 resize-none focus:border-sky-500 outline-none"
        />
      </div>

      <button
        onClick={submit}
        className="w-full px-5 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold transition flex items-center justify-center gap-2"
      >
        Log Check-In
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}

function Slider({ label, value, onChange, description }: { label: string; value: number; onChange: (v: number) => void; description: string }) {
  const colorIntensity = value <= 2 ? 'text-emerald-400' : value <= 4 ? 'text-amber-400' : value <= 6 ? 'text-orange-400' : 'text-rose-400';
  return (
    <div className="rounded-xl bg-grappler-900/60 border border-grappler-800 p-4">
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-sm font-semibold text-white">{label}</label>
        <span className={cn('text-lg font-bold font-mono', colorIntensity)}>{value}/10</span>
      </div>
      <p className="text-xs text-grappler-400 mb-3">{description}</p>
      <input
        type="range" min={0} max={10} step={1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-[10px] text-grappler-500 mt-1">
        <span>0 none</span><span>5</span><span>10 worst</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Advance View — phase progression gate
// ─────────────────────────────────────────────────────────────────────────

function AdvanceView({ injury, onAdvance, onResolveInjury, onShowRTS }: {
  injury: InjuryEntry;
  onAdvance: (phase: RehabPhaseNumber) => void;
  onResolveInjury: () => void;
  onShowRTS: () => void;
}) {
  const rehabStates = useAppStore(s => s.rehabStates ?? {});
  const state = rehabStates[injury.id]!;
  const result = useMemo(() => evaluatePhaseAdvancement(injury, state), [injury, state]);
  const isFinalPhase = result.currentPhase === 5;

  return (
    <div className="space-y-4 mt-2 max-w-xl mx-auto">
      {result.warning && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-rose-200">{result.warning}</p>
        </div>
      )}

      <div className="rounded-xl bg-grappler-900/60 border border-grappler-800 p-5">
        <h3 className="text-xs font-semibold text-grappler-300 uppercase tracking-wider mb-2">Current Phase</h3>
        <p className="text-2xl font-bold text-white">Phase {result.currentPhase}</p>
        <p className="text-sm text-grappler-300 mt-3 leading-relaxed">{result.recommendation}</p>
      </div>

      {result.metCriteria.length > 0 && (
        <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4">
          <h3 className="text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-2">Gates Met</h3>
          <ul className="space-y-1.5">
            {result.metCriteria.map((c, i) => (
              <li key={i} className="flex gap-2 text-sm text-grappler-200">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.unmetCriteria.length > 0 && (
        <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
          <h3 className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2">Gates Remaining</h3>
          <ul className="space-y-1.5">
            {result.unmetCriteria.map((c, i) => (
              <li key={i} className="flex gap-2 text-sm text-grappler-200">
                <Circle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.canAdvance && !isFinalPhase && (
        <button
          onClick={() => onAdvance(result.proposedPhase)}
          className="w-full px-5 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold transition flex items-center justify-center gap-2"
        >
          Advance to Phase {result.proposedPhase}
          <ArrowRight className="w-5 h-5" />
        </button>
      )}

      {isFinalPhase && (
        <>
          <button
            onClick={onShowRTS}
            className="w-full px-5 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold transition flex items-center justify-center gap-2"
          >
            Take Return-to-Sport Tests
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={onResolveInjury}
            className="w-full px-4 py-2.5 rounded-xl bg-grappler-800/60 hover:bg-grappler-800 text-grappler-100 text-sm font-medium transition"
          >
            Mark Injury Resolved (back to full training)
          </button>
        </>
      )}

      <details className="rounded-xl bg-grappler-900/40 border border-grappler-800 px-4 py-3">
        <summary className="text-sm font-semibold text-grappler-200 cursor-pointer">Manual phase override</summary>
        <p className="text-xs text-grappler-400 mt-2 mb-3">
          Force a phase. Use only if you genuinely know better than the gates — e.g. you have a clinician's clearance.
        </p>
        <div className="grid grid-cols-5 gap-2">
          {([1, 2, 3, 4, 5] as RehabPhaseNumber[]).map(p => (
            <button
              key={p}
              onClick={() => onAdvance(p)}
              className={cn(
                'px-2 py-2 rounded-lg text-xs font-bold transition',
                p === result.currentPhase
                  ? 'bg-sky-500 text-white'
                  : 'bg-grappler-800/60 text-grappler-300 hover:bg-grappler-800'
              )}
            >P{p}</button>
          ))}
        </div>
      </details>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Return-to-Sport Tests
// ─────────────────────────────────────────────────────────────────────────

function RTSTestsView({ region, onBack }: { region: BodyRegion; onBack: () => void }) {
  const tests = useMemo(() => getReturnToSportTests(region), [region]);

  return (
    <div className="space-y-4 mt-2 max-w-xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-grappler-300 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4">
        <h2 className="font-bold text-white mb-1">Return-to-Sport Tests</h2>
        <p className="text-sm text-emerald-200/90">
          Pass <strong>all</strong> tests pain-free before returning to full sport. Within 90% of your uninjured side is the gold standard.
        </p>
      </div>

      <div className="space-y-3">
        {tests.map(t => (
          <div key={t.id} className="rounded-xl bg-grappler-900/60 border border-grappler-800 p-4">
            <h3 className="text-sm font-bold text-white mb-1">{t.name}</h3>
            <p className="text-xs text-grappler-300 mb-2 leading-relaxed">{t.description}</p>
            <div className="flex items-start gap-2 text-xs text-emerald-300">
              <Target className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{t.passingCriterion}</span>
            </div>
            {t.videoSearch && (
              <a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(t.videoSearch)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 mt-2"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                Watch demo
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
