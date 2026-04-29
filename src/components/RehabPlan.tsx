'use client';

/**
 * RehabPlan — phased return-to-training program for a logged injury.
 *
 * Editorial brutalist refactor: each view (Start, Plan, Session, Check-In,
 * Advance, RTS) is its own ToolShell with a sticky CTA. The 5-color phase
 * rainbow is replaced with a single accent based on healing tier
 * (caution → info → go) and a tracked phase label.
 */

import { useMemo, useState } from 'react';
import {
  ChevronRight, Check, AlertTriangle, Circle, CheckCircle2, Youtube, ArrowLeft, PlayCircle,
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
import { ToolShell, Section, HeroMetric, PrimaryCTA, Stat } from './_ToolShell';

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

const PHASE_NAMES: Record<RehabPhaseNumber, string> = {
  1: 'Protected Movement',
  2: 'Controlled Loading',
  3: 'Progressive Strengthening',
  4: 'Integration',
  5: 'Return to Sport',
};

type View = 'plan' | 'session' | 'checkin' | 'advance' | 'rts';

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

  // Empty state
  if (activeInjuries.length === 0 || !selected) {
    return (
      <ToolShell
        onClose={onClose}
        eyebrow="IBRA / 04 · REHAB"
        title="No injuries."
        description="Rehab plans appear here when you log an injury. Stay healthy out there."
      >
        <Section title="Status">
          <div className="flex items-center gap-3 py-2">
            <Check className="w-5 h-5 text-emerald-400" />
            <span className="text-sm text-grappler-200">Cleared. No active injuries.</span>
          </div>
        </Section>
      </ToolShell>
    );
  }

  const state = rehabStates[selected.id];
  const hasStarted = !!state;

  if (!hasStarted) {
    return (
      <StartScreen
        injury={selected}
        onClose={onClose}
        onStart={() => {
          startRehab(selected.id);
          showToast('Rehab plan started', 'success');
        }}
      />
    );
  }

  const switcher = activeInjuries.length > 1 && (
    <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
      {activeInjuries.map(inj => (
        <button
          key={inj.id}
          onClick={() => { setSelectedId(inj.id); setView('plan'); }}
          className={cn(
            'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition active:scale-[0.97]',
            inj.id === selected.id
              ? 'bg-white border-white text-grappler-950'
              : 'bg-transparent border-grappler-800 text-grappler-300'
          )}
        >
          {REGION_LABELS[inj.bodyRegion]}
        </button>
      ))}
    </div>
  );

  if (view === 'session') return <SessionView injury={selected} switcher={switcher} onClose={onClose} onBack={() => setView('plan')} />;
  if (view === 'checkin') return (
    <CheckInView
      injury={selected}
      switcher={switcher}
      onBack={() => setView('plan')}
      onSubmit={(c) => {
        addRehabCheckIn(selected.id, buildCheckIn(c));
        showToast('Check-in logged', 'success');
        setView('advance');
      }}
    />
  );
  if (view === 'advance') return (
    <AdvanceView
      injury={selected}
      switcher={switcher}
      onBack={() => setView('plan')}
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
      onShowRTS={() => setView('rts')}
    />
  );
  if (view === 'rts') return <RTSTestsView region={selected.bodyRegion} onBack={() => setView('advance')} />;

  return (
    <PlanView
      injury={selected}
      switcher={switcher}
      onClose={onClose}
      onShowSession={() => setView('session')}
      onShowCheckIn={() => setView('checkin')}
      onShowAdvance={() => setView('advance')}
    />
  );
}

// ─── Start Screen ────────────────────────────────────────────────────────

function StartScreen({ injury, onClose, onStart }: { injury: InjuryEntry; onClose: () => void; onStart: () => void }) {
  const timeline = getInjuryTimeline(injury);

  return (
    <ToolShell
      onClose={onClose}
      eyebrow={`IBRA / 04 · REHAB · ${REGION_LABELS[injury.bodyRegion].toUpperCase()}`}
      title={<>Phased<br/>rehab.</>}
      description="5 phases, daily exercises, pain monitoring, advancement gates. Built to keep you from re-injuring."
      footer={<PrimaryCTA onClick={onStart}>Start Rehab Plan</PrimaryCTA>}
    >
      <div className="grid grid-cols-3 gap-2">
        <Stat value={`${timeline.daysSinceInjury}`} label="Day" />
        <Stat value={`${timeline.percentHealed}%`} label="Healed" />
        <Stat value={`${injury.severity}/5`} label="Severity" />
      </div>

      <Section title="Your Injury">
        <div className="space-y-2 text-sm">
          <Row label="Tissue" value={timeline.tissueLabel} />
          <Row label="Phase" value={timeline.phaseLabel} />
          <Row label="Est. remaining" value={`${timeline.estimatedDaysRemaining.min}–${timeline.estimatedDaysRemaining.max}d`} />
        </div>
      </Section>

      <Section title="What you get">
        <ul className="space-y-1.5 text-sm text-grappler-200">
          <li className="flex gap-2"><span className="text-grappler-600">·</span>Daily phase-appropriate exercises</li>
          <li className="flex gap-2"><span className="text-grappler-600">·</span>Pain + ROM check-ins (Silbernagel 24h rule)</li>
          <li className="flex gap-2"><span className="text-grappler-600">·</span>Phase advancement gates against re-injury</li>
          <li className="flex gap-2"><span className="text-grappler-600">·</span>Return-to-sport functional tests in phase 5</li>
        </ul>
      </Section>

      <p className="text-[10px] text-grappler-500 text-center leading-relaxed">
        Educational tool — not medical advice. Severe injuries warrant a clinician.
      </p>
    </ToolShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline py-1 border-b border-grappler-800 last:border-0">
      <span className="text-[11px] uppercase tracking-[0.18em] text-grappler-500">{label}</span>
      <span className="text-sm text-white">{value}</span>
    </div>
  );
}

// ─── Plan View ───────────────────────────────────────────────────────────

function PlanView({ injury, switcher, onClose, onShowSession, onShowCheckIn, onShowAdvance }: {
  injury: InjuryEntry;
  switcher: React.ReactNode;
  onClose: () => void;
  onShowSession: () => void;
  onShowCheckIn: () => void;
  onShowAdvance: () => void;
}) {
  const rehabStates = useAppStore(s => s.rehabStates ?? {});
  const state = rehabStates[injury.id];
  const plan = useMemo(() => getDailyRehabPlan(injury, state), [injury, state]);
  const timeline = useMemo(() => getPhasedTimeline(injury, state), [injury, state]);

  const accent: 'caution' | 'info' | 'go' =
    plan.phase <= 2 ? 'caution' : plan.phase <= 4 ? 'info' : 'go';

  return (
    <ToolShell
      onClose={onClose}
      eyebrow={`IBRA / 04 · REHAB · ${REGION_LABELS[injury.bodyRegion].toUpperCase()}`}
      title={plan.phaseName}
      description={plan.todaysFocus}
      footer={<PrimaryCTA onClick={onShowSession}>Today&apos;s Session</PrimaryCTA>}
    >
      {switcher}

      <Section title="Phase">
        <HeroMetric
          value={`P${plan.phase}`}
          unit={`/ 5`}
          label={`Day ${plan.daysSinceInjury}`}
          state={plan.motivationalCue}
          accent={accent}
        />
      </Section>

      <Section title="Healing Progress" hint={`${plan.percentHealed}%`}>
        <div className="h-1 rounded-full bg-grappler-800 overflow-hidden">
          <div
            className={cn(
              'h-full transition-all',
              accent === 'go' ? 'bg-emerald-400' : accent === 'info' ? 'bg-sky-400' : 'bg-amber-400'
            )}
            style={{ width: `${plan.percentHealed}%` }}
          />
        </div>
        <p className="text-[11px] text-grappler-500 mt-2">{plan.nextMilestone}</p>
      </Section>

      <Section title="Phase Timeline">
        <div className="space-y-2">
          {timeline.phases.map(p => (
            <div key={p.phase} className="flex items-center gap-3 py-1.5 border-b border-grappler-800 last:border-0">
              <span className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                p.status === 'current' && 'bg-white text-grappler-950',
                p.status === 'completed' && 'bg-emerald-500/30 text-emerald-300',
                p.status === 'upcoming' && 'bg-grappler-800 text-grappler-500'
              )}>
                {p.status === 'completed' ? <Check className="w-3 h-3" /> : p.phase}
              </span>
              <div className="flex-1 min-w-0">
                <div className={cn('text-sm', p.status === 'upcoming' ? 'text-grappler-500' : 'text-white')}>{p.name}</div>
              </div>
              <span className="text-[11px] font-mono tabular-nums text-grappler-500">~{p.estimatedDays}d</span>
              {p.status === 'current' && (
                <span className="text-[10px] uppercase tracking-[0.18em] text-white">Now</span>
              )}
            </div>
          ))}
        </div>
      </Section>

      <button
        onClick={onShowCheckIn}
        className="w-full flex items-center justify-between gap-3 p-3 rounded-lg bg-grappler-900/60 border border-grappler-800 hover:bg-grappler-800/60 transition active:scale-[0.99]"
      >
        <div className="text-left">
          <div className="text-sm font-bold text-white">Daily check-in</div>
          <div className="text-[11px] text-grappler-500">Pain, ROM, swelling, 24h response</div>
        </div>
        <ChevronRight className="w-4 h-4 text-grappler-500" />
      </button>

      <button
        onClick={onShowAdvance}
        className="w-full flex items-center justify-between gap-3 p-3 rounded-lg bg-grappler-900/60 border border-grappler-800 hover:bg-grappler-800/60 transition active:scale-[0.99]"
      >
        <div className="text-left">
          <div className="text-sm font-bold text-white">Advance phase</div>
          <div className="text-[11px] text-grappler-500">Review gates and progress</div>
        </div>
        <ChevronRight className="w-4 h-4 text-grappler-500" />
      </button>
    </ToolShell>
  );
}

// ─── Session View ────────────────────────────────────────────────────────

function SessionView({ injury, switcher, onClose, onBack }: {
  injury: InjuryEntry;
  switcher: React.ReactNode;
  onClose: () => void;
  onBack: () => void;
}) {
  const rehabStates = useAppStore(s => s.rehabStates ?? {});
  const state = rehabStates[injury.id];
  const session = useMemo(() => generateRehabSession(injury, state?.phaseOverride), [injury, state]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allDone = completed.size === session.exercises.length && session.exercises.length > 0;

  return (
    <ToolShell
      onClose={onBack}
      eyebrow={`IBRA / 04 · P${session.phase} · ${session.phaseName.toUpperCase()}`}
      title="Today's session"
      description={session.phaseGoal}
      footer={
        <PrimaryCTA onClick={onClose} disabled={!allDone} variant={allDone ? 'go' : 'primary'}>
          {allDone ? 'Done — close' : `${completed.size} / ${session.exercises.length} complete`}
        </PrimaryCTA>
      }
    >
      {switcher}

      <div className="grid grid-cols-2 gap-2">
        <Stat value={`${session.estimatedMinutes}m`} label="Duration" />
        <Stat value={`${session.painCap}/10`} label="Pain cap" accent="caution" />
      </div>

      <Section title="Warm-Up">
        <ul className="space-y-1 text-sm text-grappler-200">
          {session.warmUp.map((w, i) => <li key={i} className="flex gap-2"><span className="text-grappler-600">·</span>{w}</li>)}
        </ul>
      </Section>

      <Section title="Main Work" hint={`${session.exercises.length} exercises`}>
        <div className="space-y-3">
          {session.exercises.map(ex => (
            <ExerciseRow key={ex.id} exercise={ex} completed={completed.has(ex.id)} onToggle={() => toggle(ex.id)} />
          ))}
        </div>
      </Section>

      <Section title="Cool-Down">
        <ul className="space-y-1 text-sm text-grappler-200">
          {session.coolDown.map((c, i) => <li key={i} className="flex gap-2"><span className="text-grappler-600">·</span>{c}</li>)}
        </ul>
      </Section>

      <Section title="Post-Session">
        <p className="text-sm text-grappler-200">{session.postSessionGuidance}</p>
      </Section>

      <Section title="Stop If">
        <ul className="space-y-1 text-xs text-grappler-300">
          {session.redFlags.map((f, i) => <li key={i} className="flex gap-2"><span className="text-rose-400">·</span>{f}</li>)}
        </ul>
      </Section>
    </ToolShell>
  );
}

function ExerciseRow({ exercise, completed, onToggle }: { exercise: RehabExercise; completed: boolean; onToggle: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const repsLabel = exercise.reps && exercise.durationSeconds
    ? `${exercise.sets} × ${exercise.reps} (${exercise.durationSeconds}s)`
    : exercise.reps
      ? `${exercise.sets} × ${exercise.reps}`
      : exercise.durationSeconds
        ? `${exercise.sets} × ${exercise.durationSeconds}s`
        : `${exercise.sets} sets`;

  return (
    <div className="border-t border-grappler-800 first:border-0 pt-3 first:pt-0">
      <div className="flex items-start gap-3">
        <button onClick={onToggle} aria-label={completed ? 'Mark incomplete' : 'Mark complete'} className="flex-shrink-0 mt-0.5">
          {completed
            ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            : <Circle className="w-5 h-5 text-grappler-600" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 mb-0.5">
            <span className={cn('text-sm font-bold', completed ? 'text-grappler-500 line-through' : 'text-white')}>
              {exercise.name}
            </span>
            <span className="text-xs font-mono tabular-nums text-white">{repsLabel}</span>
          </div>
          <p className="text-[11px] text-grappler-500">{exercise.loadGuidance}</p>
          {exercise.evidenceNote && (
            <p className="text-[10px] text-emerald-400/80 italic mt-0.5">{exercise.evidenceNote}</p>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] text-grappler-400 hover:text-white mt-1"
          >
            {expanded ? 'Hide cues' : `${exercise.cues.length} cues`}
          </button>
          {expanded && (
            <div className="mt-2 space-y-1">
              {exercise.cues.map((cue, i) => (
                <div key={i} className="text-[11px] text-grappler-300 pl-3 border-l border-grappler-700">{cue}</div>
              ))}
              {exercise.videoSearch && (
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.videoSearch)}`}
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-grappler-400 hover:text-white mt-1"
                >
                  <Youtube className="w-3 h-3" /> demo
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Check-In View ───────────────────────────────────────────────────────

function CheckInView({ injury, switcher, onBack, onSubmit }: {
  injury: InjuryEntry;
  switcher: React.ReactNode;
  onBack: () => void;
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
      injuryId: injury.id,
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
    <ToolShell
      onClose={onBack}
      eyebrow="IBRA / 04 · CHECK-IN"
      title="Today's check-in"
      description="Honesty over optimism. The gates exist to protect you."
      footer={<PrimaryCTA onClick={submit}>Log Check-In</PrimaryCTA>}
    >
      {switcher}

      <Slider label="Pain at rest" value={painRest} onChange={setPainRest} description="Sitting still, right now." />
      <Slider label="Pain during session" value={painExercise} onChange={setPainExercise} description="Peak pain during exercises." />
      <Slider label="Pain 24h after last session" value={pain24h} onChange={setPain24h} description="Did pain return to baseline by next morning? (Silbernagel rule)" />

      <Section title="Range of Motion" hint={`${rom}%`}>
        <p className="text-[11px] text-grappler-500 mb-2">vs your uninjured side at full ROM</p>
        <input
          type="range" min={0} max={100} step={5}
          value={rom}
          onChange={e => setRom(Number(e.target.value))}
          className="w-full"
        />
      </Section>

      <Section title="Swelling">
        <div className="grid grid-cols-4 gap-2">
          {(['none', 'mild', 'moderate', 'significant'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSwelling(s)}
              className={cn(
                'py-2 rounded-lg text-xs font-medium capitalize border transition active:scale-[0.97]',
                swelling === s
                  ? 'bg-white border-white text-grappler-950'
                  : 'bg-transparent border-grappler-800 text-grappler-300'
              )}
            >{s}</button>
          ))}
        </div>
      </Section>

      <Section title="Session">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={completedSession}
            onChange={e => setCompletedSession(e.target.checked)}
            className="w-4 h-4 accent-white"
          />
          <span className="text-sm text-grappler-200">I completed today&apos;s rehab session</span>
        </label>
      </Section>

      <Section title="Notes" hint="optional">
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="What felt good, what didn't…"
          className="w-full px-3 py-2 rounded-lg bg-grappler-950 border border-grappler-800 text-sm text-white placeholder-grappler-500 resize-none focus:border-grappler-500 outline-none"
        />
      </Section>
    </ToolShell>
  );
}

function Slider({ label, value, onChange, description }: { label: string; value: number; onChange: (v: number) => void; description: string }) {
  const accent: 'go' | 'caution' | 'danger' | 'info' =
    value <= 2 ? 'go' : value <= 4 ? 'caution' : value <= 6 ? 'caution' : 'danger';
  return (
    <Section title={label} hint={`${value}/10`}>
      <p className="text-[11px] text-grappler-500 mb-2">{description}</p>
      <input
        type="range" min={0} max={10} step={1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-[10px] text-grappler-600 mt-1 font-mono tabular-nums">
        <span>0</span><span>5</span><span>10</span>
      </div>
      <span className="hidden">{accent}</span>
    </Section>
  );
}

// ─── Advance View ────────────────────────────────────────────────────────

function AdvanceView({ injury, switcher, onBack, onAdvance, onResolveInjury, onShowRTS }: {
  injury: InjuryEntry;
  switcher: React.ReactNode;
  onBack: () => void;
  onAdvance: (phase: RehabPhaseNumber) => void;
  onResolveInjury: () => void;
  onShowRTS: () => void;
}) {
  const rehabStates = useAppStore(s => s.rehabStates ?? {});
  const state = rehabStates[injury.id]!;
  const result = useMemo(() => evaluatePhaseAdvancement(injury, state), [injury, state]);
  const isFinalPhase = result.currentPhase === 5;

  const footer = result.canAdvance && !isFinalPhase
    ? <PrimaryCTA onClick={() => onAdvance(result.proposedPhase)} variant="go">Advance to Phase {result.proposedPhase}</PrimaryCTA>
    : isFinalPhase
      ? <PrimaryCTA onClick={onShowRTS} variant="go">Take Return-to-Sport Tests</PrimaryCTA>
      : undefined;

  return (
    <ToolShell
      onClose={onBack}
      eyebrow="IBRA / 04 · ADVANCE"
      title={`Phase ${result.currentPhase}`}
      description={result.recommendation}
      footer={footer}
    >
      {switcher}

      {result.warning && (
        <Section title="Warning">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-rose-200">{result.warning}</p>
          </div>
        </Section>
      )}

      {result.metCriteria.length > 0 && (
        <Section title="Gates Met">
          <ul className="space-y-1.5">
            {result.metCriteria.map((c, i) => (
              <li key={i} className="flex gap-2 text-sm text-grappler-200">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                {c}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {result.unmetCriteria.length > 0 && (
        <Section title="Gates Remaining">
          <ul className="space-y-1.5">
            {result.unmetCriteria.map((c, i) => (
              <li key={i} className="flex gap-2 text-sm text-grappler-200">
                <Circle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                {c}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {isFinalPhase && (
        <button
          onClick={onResolveInjury}
          className="w-full py-3 rounded-lg bg-grappler-900/60 border border-grappler-800 text-grappler-100 text-sm font-medium hover:bg-grappler-800 transition"
        >
          Mark Injury Resolved
        </button>
      )}

      <details className="rounded-lg bg-grappler-900/40 border border-grappler-800 px-4 py-3">
        <summary className="text-sm font-semibold text-grappler-200 cursor-pointer">Manual phase override</summary>
        <p className="text-[11px] text-grappler-500 mt-2 mb-3">
          Force a phase. Use only if a clinician has cleared you.
        </p>
        <div className="grid grid-cols-5 gap-2">
          {([1, 2, 3, 4, 5] as RehabPhaseNumber[]).map(p => (
            <button
              key={p}
              onClick={() => onAdvance(p)}
              className={cn(
                'py-2 rounded-lg text-xs font-bold border transition',
                p === result.currentPhase
                  ? 'bg-white border-white text-grappler-950'
                  : 'bg-transparent border-grappler-800 text-grappler-300'
              )}
              title={PHASE_NAMES[p]}
            >P{p}</button>
          ))}
        </div>
      </details>
    </ToolShell>
  );
}

// ─── Return-to-Sport Tests ───────────────────────────────────────────────

function RTSTestsView({ region, onBack }: { region: BodyRegion; onBack: () => void }) {
  const tests = useMemo(() => getReturnToSportTests(region), [region]);

  return (
    <ToolShell
      onClose={onBack}
      eyebrow="IBRA / 04 · RTS TESTS"
      title="Return to Sport"
      description="Pass all tests pain-free. Within 90% of your uninjured side is the gold standard."
    >
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-grappler-300 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <Section title="Tests" hint={`${tests.length}`}>
        <div className="space-y-3">
          {tests.map(t => (
            <div key={t.id} className="border-t border-grappler-800 first:border-0 pt-3 first:pt-0">
              <h3 className="text-sm font-bold text-white mb-1">{t.name}</h3>
              <p className="text-xs text-grappler-300 mb-2 leading-relaxed">{t.description}</p>
              <p className="text-xs text-emerald-300">→ {t.passingCriterion}</p>
              {t.videoSearch && (
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(t.videoSearch)}`}
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-grappler-400 hover:text-white mt-1"
                >
                  <PlayCircle className="w-3 h-3" /> demo
                </a>
              )}
            </div>
          ))}
        </div>
      </Section>
    </ToolShell>
  );
}
