'use client';

/**
 * SprintTimer — air bike / sprint intervals, standalone or as a finisher.
 *
 * pick → preview → run → log. The running clock is stored as timestamps
 * (start, paused time), not a ticking counter, so leaving the app or locking
 * the phone and coming back lands on the right second. Logging writes a
 * cardio TrainingSession with the athlete's session RPE, so it feeds the
 * same RPE × minutes load model as everything else.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Play, Pause, SkipForward, Square, ChevronLeft, Zap, Info, Check } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import {
  SPRINT_PROTOCOLS, getSprintProtocol, buildTimeline, totalSeconds, workSeconds, positionAt,
  isSurge, sessionLoad, formatClock, type SprintProtocol, type SprintModality, type FinisherPick,
} from '@/lib/sprint-protocols';
import { usePersistentState } from '@/lib/use-persistent-state';
import { useWakeLock } from '@/lib/use-wake-lock';
import { beep, unlockBeeps } from '@/lib/beep';
import { cn } from '@/lib/utils';
import type { ActivityType, TrainingIntensity } from '@/lib/types';

interface Props {
  onClose: () => void;
  /** Finisher mode: shows the recommendation first and says "after lifting". */
  recommendation?: FinisherPick | null;
  mode?: 'standalone' | 'finisher';
  onLogged?: () => void;
}

interface RunState {
  protocolId: string;
  modality: SprintModality;
  startedAt: number;
  pausedMs: number;
  pausedAt: number | null;
  /** Seconds skipped forward (Skip button). */
  skippedS: number;
}

const RUN_KEY = 'sprint:run';
const RUN_TTL = 3 * 60 * 60 * 1000;

const SYSTEM_LABEL: Record<SprintProtocol['system'], { label: string; cls: string }> = {
  alactic: { label: 'Power', cls: 'bg-yellow-500/15 text-yellow-300' },
  rsa: { label: 'Repeat sprint', cls: 'bg-orange-500/15 text-orange-300' },
  glycolytic: { label: 'Anaerobic', cls: 'bg-red-500/15 text-red-300' },
  aerobic: { label: 'VO2max', cls: 'bg-sky-500/15 text-sky-300' },
  base: { label: 'Aerobic base', cls: 'bg-green-500/15 text-green-300' },
  mixed: { label: 'Fight pace', cls: 'bg-purple-500/15 text-purple-300' },
};

const MODALITY_LABEL: Record<SprintModality, string> = { air_bike: 'Air bike', run: 'Run', row: 'Row', ski: 'SkiErg' };
const MODALITY_TYPE: Record<SprintModality, ActivityType> = { air_bike: 'assault_bike', run: 'running', row: 'rowing', ski: 'other' };

function intensityFor(rpe: number): TrainingIntensity {
  return rpe <= 4 ? 'light_flow' : rpe <= 7 ? 'moderate' : 'hard_sparring';
}

export default function SprintTimer({ onClose, recommendation, mode = 'standalone', onLogged }: Props) {
  const addTrainingSession = useAppStore(s => s.addTrainingSession);
  const [run, setRun, clearRun] = usePersistentState<RunState | null>(RUN_KEY, null, { storage: 'local', ttlMs: RUN_TTL });
  const [selectedId, setSelectedId] = useState<string | null>(run?.protocolId ?? recommendation?.protocol.id ?? null);
  const [modality, setModality] = useState<SprintModality>(run?.modality ?? 'air_bike');
  const [view, setView] = useState<'pick' | 'preview' | 'run' | 'log'>(run ? 'run' : recommendation ? 'preview' : 'pick');
  const [now, setNow] = useState(() => Date.now());
  const [finishedEarlyAt, setFinishedEarlyAt] = useState<number | null>(null);

  const protocol = selectedId ? getSprintProtocol(selectedId) ?? null : null;
  const timeline = useMemo(() => (protocol ? buildTimeline(protocol) : []), [protocol]);

  const running = view === 'run' && !!run && run.pausedAt === null;
  useWakeLock(view === 'run');

  useEffect(() => {
    if (view !== 'run') return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [view]);

  const elapsed = run
    ? Math.max(0, (((run.pausedAt ?? now) - run.startedAt - run.pausedMs) / 1000) + run.skippedS)
    : 0;
  const pos = positionAt(timeline, elapsed);
  const step = timeline[pos.index];
  const nextStep = timeline[pos.index + 1];
  const intoStep = step ? step.seconds - pos.left : 0;
  const surge = protocol && step ? isSurge(step, protocol, Math.floor(intoStep)) : false;

  // Cues: 3-2-1 ticks before a change, GO/STOP at the change.
  const lastCue = useRef<string>('');
  useEffect(() => {
    if (!running || !step) return;
    const key = `${pos.index}:${pos.left}`;
    if (lastCue.current === key) return;
    lastCue.current = key;
    if (pos.left <= 3 && pos.left >= 1 && nextStep) beep('tick');
    if (intoStep < 0.5) beep(step.phase === 'work' ? 'go' : 'stop');
    if (surge && protocol && !isSurge(step, protocol, Math.floor(intoStep) - 1)) beep('go'); // surge starts
  }, [running, pos.index, pos.left]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reaching the end moves to the log sheet.
  useEffect(() => {
    if (view === 'run' && run && pos.done) {
      beep('stop');
      setView('log');
    }
  }, [view, run, pos.done]);

  const start = () => {
    if (!protocol) return;
    unlockBeeps();
    setRun({ protocolId: protocol.id, modality, startedAt: Date.now(), pausedMs: 0, pausedAt: null, skippedS: 0 });
    setFinishedEarlyAt(null);
    setView('run');
  };
  const togglePause = () => {
    if (!run) return;
    unlockBeeps();
    if (run.pausedAt === null) setRun({ ...run, pausedAt: Date.now() });
    else setRun({ ...run, pausedMs: run.pausedMs + (Date.now() - run.pausedAt), pausedAt: null });
  };
  const skip = () => {
    if (!run || !step) return;
    setRun({ ...run, skippedS: run.skippedS + pos.left });
  };
  const endEarly = () => {
    setFinishedEarlyAt(elapsed);
    if (run && run.pausedAt === null) setRun({ ...run, pausedAt: Date.now() });
    setView('log');
  };
  const discard = () => {
    clearRun();
    setView(recommendation ? 'preview' : 'pick');
  };

  // ── Log form ──
  const [rpe, setRpe] = useState<number | null>(null);
  const [calories, setCalories] = useState('');
  const [avgWatts, setAvgWatts] = useState('');
  const [peakWatts, setPeakWatts] = useState('');
  const [avgHR, setAvgHR] = useState('');

  const doneWorkReps = useMemo(() => {
    const until = finishedEarlyAt ?? Infinity;
    let t = 0; let n = 0;
    for (const s of timeline) {
      if (s.phase === 'work' && t + s.seconds <= until + 0.5) n++;
      t += s.seconds;
    }
    return n;
  }, [timeline, finishedEarlyAt]);

  const save = () => {
    if (!protocol) return;
    const secs = finishedEarlyAt ?? totalSeconds(protocol);
    const minutes = Math.max(1, Math.round(secs / 60));
    const r = rpe ?? protocol.rpe;
    const num = (v: string) => { const n = parseFloat(v.replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : undefined; };
    const completed = finishedEarlyAt === null;
    addTrainingSession({
      date: new Date(),
      category: 'cardio',
      type: MODALITY_TYPE[run?.modality ?? modality],
      plannedIntensity: intensityFor(r),
      timing: mode === 'finisher' ? 'after_lifting' : 'standalone',
      sessionHour: new Date().getHours(),
      duration: minutes,
      rounds: doneWorkReps,
      perceivedExertion: r,
      notes: `${protocol.name} · ${MODALITY_LABEL[run?.modality ?? modality]}${completed ? '' : ' (ended early)'}`,
      intervalData: {
        protocolId: protocol.id,
        modality: run?.modality ?? modality,
        reps: doneWorkReps,
        workSeconds: doneWorkReps * protocol.block.workS,
        calories: num(calories),
        avgWatts: num(avgWatts),
        peakWatts: num(peakWatts),
        avgHR: num(avgHR),
        completed,
      },
    });
    clearRun();
    onLogged?.();
    onClose();
  };

  // ── Views ──
  const header = (title: string, back?: () => void) => (
    <div className="flex items-center justify-between mb-4">
      {back ? (
        <button onClick={back} aria-label="Back" className="p-2 -ml-2 min-w-[44px] min-h-[44px] flex items-center text-grappler-400">
          <ChevronLeft className="w-5 h-5" />
        </button>
      ) : <div className="w-11" />}
      <h1 className="text-lg font-bold text-grappler-50">{title}</h1>
      <button onClick={onClose} aria-label="Close" className="p-2 -mr-2 min-w-[44px] min-h-[44px] flex items-center justify-end text-grappler-400">
        <X className="w-5 h-5" />
      </button>
    </div>
  );

  if (view === 'pick') {
    const list = mode === 'finisher' ? SPRINT_PROTOCOLS.filter(p => p.finisherOk) : SPRINT_PROTOCOLS;
    return (
      <div className="fixed inset-0 z-50 bg-grappler-900 overflow-y-auto safe-area-top">
        <div className="max-w-lg mx-auto p-4 pb-24">
          {header(mode === 'finisher' ? 'Conditioning finisher' : 'Air bike & sprints')}
          <p className="text-sm text-grappler-400 mb-4">Pick by what you want to train. Every session is logged with your effort and counts toward training load.</p>
          <div className="space-y-2">
            {list.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelectedId(p.id); setView('preview'); }}
                className="w-full text-left rounded-xl border border-grappler-700 bg-grappler-800/40 hover:border-primary-500 p-3"
                aria-label={`Open ${p.name}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-grappler-100">{p.name}</span>
                  <span className="text-xs text-grappler-400 flex-shrink-0">~{Math.round(totalSeconds(p) / 60)} min</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className={cn('text-[11px] font-semibold px-1.5 py-0.5 rounded', SYSTEM_LABEL[p.system].cls)}>{SYSTEM_LABEL[p.system].label}</span>
                  {recommendation?.protocol.id === p.id && <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-primary-500/20 text-primary-300">Recommended</span>}
                </div>
                <p className="text-xs text-grappler-400 mt-1.5">{p.purpose}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'preview' && protocol) {
    const b = protocol.block;
    const scheme = `${b.sets && b.sets > 1 ? `${b.sets} × ` : ''}${b.reps} × ${b.workS >= 60 ? formatClock(b.workS) : `${b.workS} s`}${b.restS ? ` / ${b.restS >= 60 ? formatClock(b.restS) : `${b.restS} s`} easy` : ''}`;
    return (
      <div className="fixed inset-0 z-50 bg-grappler-900 overflow-y-auto safe-area-top">
        <div className="max-w-lg mx-auto p-4 pb-32">
          {header(protocol.name, () => setView('pick'))}
          {recommendation?.protocol.id === protocol.id && (
            <p className="mb-3 rounded-lg bg-primary-500/10 border border-primary-500/30 px-3 py-2 text-xs text-primary-200">{recommendation.reason}</p>
          )}
          <div className="grid grid-cols-3 gap-2 mb-4 text-center">
            <div className="rounded-xl bg-grappler-800/50 p-2.5"><div className="text-lg font-bold text-grappler-50">{Math.round(totalSeconds(protocol) / 60)}</div><div className="text-[11px] text-grappler-400">min total</div></div>
            <div className="rounded-xl bg-grappler-800/50 p-2.5"><div className="text-lg font-bold text-grappler-50">{formatClock(workSeconds(protocol))}</div><div className="text-[11px] text-grappler-400">work time</div></div>
            <div className="rounded-xl bg-grappler-800/50 p-2.5"><div className="text-lg font-bold text-grappler-50">~{sessionLoad(protocol.rpe, Math.round(totalSeconds(protocol) / 60))}</div><div className="text-[11px] text-grappler-400">load (AU)</div></div>
          </div>
          <p className="text-sm font-semibold text-grappler-100">{scheme}</p>
          <p className="text-sm text-grappler-300 mt-1">{protocol.purpose}</p>
          {protocol.bikeCue && modality === 'air_bike' && <p className="text-xs text-grappler-400 mt-2">🚲 {protocol.bikeCue}</p>}

          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-grappler-500 mb-1.5">Machine</p>
            <div className="flex flex-wrap gap-2">
              {protocol.modalities.map(m => (
                <button key={m} onClick={() => setModality(m)} aria-pressed={modality === m}
                  className={cn('min-h-[40px] px-3 rounded-lg text-sm border', modality === m ? 'border-primary-500 bg-primary-500/15 text-primary-200' : 'border-grappler-700 text-grappler-300')}>
                  {MODALITY_LABEL[m]}
                </button>
              ))}
            </div>
          </div>

          <details className="mt-4 rounded-xl border border-grappler-800 bg-grappler-800/30 p-3">
            <summary className="text-xs text-grappler-300 flex items-center gap-1.5 cursor-pointer"><Info className="w-3.5 h-3.5" /> Why this works</summary>
            <p className="text-xs text-grappler-400 mt-2">{protocol.science}</p>
          </details>
          {protocol.cautions.length > 0 && (
            <ul className="mt-3 space-y-1">
              {protocol.cautions.map(c => <li key={c} className="text-xs text-amber-300/90">• {c}</li>)}
            </ul>
          )}
        </div>
        <div className="fixed bottom-0 inset-x-0 bg-grappler-900 border-t border-grappler-800 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="max-w-lg mx-auto">
            <button onClick={start} className="btn btn-primary btn-lg w-full gap-2"><Play className="w-5 h-5" /> Start</button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'run' && protocol && step) {
    const isWork = step.phase === 'work';
    const bg = surge ? 'bg-red-600' : isWork ? 'bg-green-600' : step.phase === 'warmup' || step.phase === 'cooldown' ? 'bg-grappler-800' : 'bg-sky-900';
    const repsTotal = protocol.block.reps;
    const setsTotal = protocol.block.sets ?? 1;
    return (
      <div className={cn('fixed inset-0 z-50 flex flex-col safe-area-top transition-colors duration-300', bg)} data-testid="sprint-run">
        <div className="flex items-center justify-between p-4">
          <button onClick={endEarly} className="min-h-[44px] px-3 rounded-lg bg-black/25 text-white/90 text-sm flex items-center gap-1.5" aria-label="End session">
            <Square className="w-4 h-4" /> End
          </button>
          <span className="text-white/80 text-sm font-medium truncate mx-2">{protocol.name}</span>
          <span className="text-white/70 text-xs tabular-nums">{formatClock(Math.max(0, totalSeconds(protocol) - Math.floor(elapsed)))} left</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <p className="text-white/80 text-sm uppercase tracking-widest mb-2" data-testid="sprint-phase">
            {surge ? 'SURGE' : step.phase === 'set_rest' ? 'Set rest' : step.phase}
            {step.rep ? ` · ${step.rep}/${repsTotal}` : ''}{setsTotal > 1 && step.set ? ` · set ${step.set}/${setsTotal}` : ''}
          </p>
          <p className="text-white font-black tabular-nums leading-none" style={{ fontSize: 'min(34vw, 11rem)' }}>{formatClock(pos.left)}</p>
          <p className="text-white text-2xl font-bold mt-3">{surge ? 'GO HARD — 10 s' : step.label}</p>
          {nextStep && (
            <p className="text-white/70 text-sm mt-6">
              Next: {nextStep.phase === 'work' ? `${nextStep.label} ${nextStep.seconds} s` : nextStep.phase === 'cooldown' ? 'Cool-down' : `${nextStep.label || 'rest'} ${formatClock(nextStep.seconds)}`}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button onClick={togglePause} className="min-h-[56px] rounded-xl bg-black/30 text-white font-semibold flex items-center justify-center gap-2">
            {run?.pausedAt === null ? <><Pause className="w-5 h-5" /> Pause</> : <><Play className="w-5 h-5" /> Resume</>}
          </button>
          <button onClick={skip} className="min-h-[56px] rounded-xl bg-black/30 text-white font-semibold flex items-center justify-center gap-2">
            <SkipForward className="w-5 h-5" /> Skip
          </button>
        </div>
      </div>
    );
  }

  if (view === 'log' && protocol) {
    const early = finishedEarlyAt !== null;
    const r = rpe ?? protocol.rpe;
    const minutes = Math.max(1, Math.round((finishedEarlyAt ?? totalSeconds(protocol)) / 60));
    const field = (label: string, v: string, set: (s: string) => void, unit: string) => (
      <label className="block">
        <span className="text-xs text-grappler-400">{label}</span>
        <div className="mt-1 flex items-center gap-1.5">
          <input inputMode="decimal" value={v} onChange={e => set(e.target.value)} aria-label={label}
            className="input w-full text-sm py-2" placeholder="—" />
          <span className="text-xs text-grappler-500 w-8">{unit}</span>
        </div>
      </label>
    );
    return (
      <div className="fixed inset-0 z-50 bg-grappler-900 overflow-y-auto safe-area-top">
        <div className="max-w-lg mx-auto p-4 pb-32">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-bold text-grappler-50">{early ? 'Ended early' : 'Done'} · {protocol.name}</h1>
          </div>
          <p className="text-sm text-grappler-300 mb-4">
            <Check className="w-4 h-4 inline text-green-400 mr-1" />
            {doneWorkReps} hard efforts · {minutes} min
          </p>
          <p className="text-xs uppercase tracking-wide text-grappler-500 mb-2">How hard was the whole session?</p>
          <div className="grid grid-cols-5 gap-2 mb-1">
            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
              <button key={v} onClick={() => setRpe(v)} aria-pressed={r === v}
                className={cn('min-h-[44px] rounded-lg font-semibold text-sm', r === v ? 'bg-primary-600 text-white' : 'bg-grappler-800 text-grappler-300')}>
                {v}
              </button>
            ))}
          </div>
          <p className="text-xs text-grappler-500 mb-4">Session load {sessionLoad(r, minutes)} AU (RPE × minutes)</p>
          <p className="text-xs uppercase tracking-wide text-grappler-500 mb-2">From the monitor (optional)</p>
          <div className="grid grid-cols-2 gap-3">
            {field('Calories', calories, setCalories, 'cal')}
            {field('Avg HR', avgHR, setAvgHR, 'bpm')}
            {field('Avg watts', avgWatts, setAvgWatts, 'W')}
            {field('Peak watts', peakWatts, setPeakWatts, 'W')}
          </div>
        </div>
        <div className="fixed bottom-0 inset-x-0 bg-grappler-900 border-t border-grappler-800 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="max-w-lg mx-auto flex gap-3">
            <button onClick={discard} className="btn btn-secondary btn-lg flex-1">Discard</button>
            <button onClick={save} className="btn btn-primary btn-lg flex-[2] gap-2"><Zap className="w-5 h-5" /> Save session</button>
          </div>
        </div>
      </div>
    );
  }

  // Fallback (unknown protocol id in storage)
  return (
    <div className="fixed inset-0 z-50 bg-grappler-900 p-4 safe-area-top">
      {header('Air bike & sprints')}
      <button onClick={() => { clearRun(); setView('pick'); }} className="btn btn-primary btn-md w-full">Choose a session</button>
    </div>
  );
}
