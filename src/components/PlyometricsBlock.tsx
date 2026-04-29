'use client';

/**
 * PlyometricsBlock — speed-strength block UI.
 *
 * Editorial brutalist refactor: kills the tab strip, the 4-color phase
 * rainbow, the accordion-in-accordion. Three top-level destinations
 * (Setup, Sessions, RSI) each get their own ToolShell with a sticky CTA.
 * Phase identity is a tracked uppercase label, not a colored pill.
 */

import { useMemo, useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, ChevronRight, Youtube } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import {
  generatePlyoBlock,
  getRSIProtocol,
  plyoSessionToWorkoutSession,
  type PlyoBlock,
  type PlyoBodyFocus,
  type PlyoExperience,
  type PlyoSession,
  type RSIEntry,
} from '@/lib/plyometric-engine';
import { cn } from '@/lib/utils';
import { useToast } from './Toast';
import { ToolShell, Section, HeroMetric, PrimaryCTA, Stat } from './_ToolShell';

interface Props { onClose: () => void }

const LEGACY_BLOCK_KEY = 'roots-plyo-block';
const LEGACY_RSI_KEY = 'roots-plyo-rsi-history';

type View = 'overview' | 'sessions' | 'rsi' | 'session-detail';

export default function PlyometricsBlock({ onClose }: Props) {
  const { showToast } = useToast();
  const startWorkout = useAppStore(s => s.startWorkout);
  const block = useAppStore(s => s.activePlyoBlock);
  const setActivePlyoBlock = useAppStore(s => s.setActivePlyoBlock);
  const addRsiEntry = useAppStore(s => s.addRsiEntry);

  const [view, setView] = useState<View>('overview');
  const [activeSession, setActiveSession] = useState<PlyoSession | null>(null);

  useEffect(() => {
    try {
      const legacyBlock = localStorage.getItem(LEGACY_BLOCK_KEY);
      if (legacyBlock && !block) setActivePlyoBlock(JSON.parse(legacyBlock) as PlyoBlock);
      if (legacyBlock) localStorage.removeItem(LEGACY_BLOCK_KEY);

      const legacyRsi = localStorage.getItem(LEGACY_RSI_KEY);
      if (legacyRsi) {
        const entries = JSON.parse(legacyRsi) as RSIEntry[];
        for (const entry of entries) addRsiEntry(entry);
        localStorage.removeItem(LEGACY_RSI_KEY);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startSession = (session: PlyoSession) => {
    const workoutSession = plyoSessionToWorkoutSession(session);
    const ok = startWorkout(workoutSession);
    if (ok === false) {
      showToast('Finish your current workout first', 'error');
      return;
    }
    showToast('Plyo session started', 'success');
    onClose();
  };

  if (view === 'session-detail' && activeSession) {
    return (
      <SessionDetail
        session={activeSession}
        onBack={() => { setActiveSession(null); setView('sessions'); }}
        onStart={() => startSession(activeSession)}
      />
    );
  }

  if (view === 'sessions' && block) {
    return (
      <SessionsView
        block={block}
        onBack={() => setView('overview')}
        onClose={onClose}
        onPickSession={(s) => { setActiveSession(s); setView('session-detail'); }}
      />
    );
  }

  if (view === 'rsi') {
    return <RSIView onBack={() => setView('overview')} onClose={onClose} />;
  }

  if (block) {
    return (
      <ActiveBlockOverview
        block={block}
        onClose={onClose}
        onShowSessions={() => setView('sessions')}
        onShowRSI={() => setView('rsi')}
        onReset={() => setActivePlyoBlock(null)}
      />
    );
  }

  return (
    <SetupView
      onClose={onClose}
      onCreate={(b) => { setActivePlyoBlock(b); setView('sessions'); }}
      onShowRSI={() => setView('rsi')}
    />
  );
}

// ─── Setup ───────────────────────────────────────────────────────────────

function SetupView({ onClose, onCreate, onShowRSI }: {
  onClose: () => void;
  onCreate: (b: PlyoBlock) => void;
  onShowRSI: () => void;
}) {
  const [bodyFocus, setBodyFocus] = useState<PlyoBodyFocus>('full');
  const [experience, setExperience] = useState<PlyoExperience>('intermediate');
  const [weeks, setWeeks] = useState(6);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(2);

  const create = () => {
    const block = generatePlyoBlock({ bodyFocus, experience, weeks, sessionsPerWeek, trainingIdentity: 'combat' });
    onCreate(block);
  };

  return (
    <ToolShell
      onClose={onClose}
      eyebrow="IBRA / 02 · SPEED-STRENGTH"
      title={<>Build your<br/>plyo block.</>}
      description="Periodized speed-strength: extensive → intensive → reactive → contrast. Built for combat power transfer."
      footer={<PrimaryCTA onClick={create} variant="go">Generate Block</PrimaryCTA>}
    >
      <Section title="Body Focus">
        <ChoiceGrid
          options={(['lower', 'upper', 'full'] as PlyoBodyFocus[]).map(b => ({ id: b, label: b }))}
          selected={bodyFocus}
          onSelect={(v) => setBodyFocus(v as PlyoBodyFocus)}
        />
      </Section>

      <Section title="Experience">
        <ChoiceGrid
          options={(['beginner', 'intermediate', 'advanced'] as PlyoExperience[]).map(e => ({ id: e, label: e }))}
          selected={experience}
          onSelect={(v) => setExperience(v as PlyoExperience)}
        />
        {experience === 'beginner' && (
          <p className="text-[11px] text-amber-400 mt-2">Beginners cap at 4 weeks. Extensive base for the first run.</p>
        )}
      </Section>

      <Section title="Block Length">
        <ChoiceGrid
          options={[4, 6, 8].map(w => ({ id: String(w), label: `${w} wk`, disabled: experience === 'beginner' && w > 4 }))}
          selected={String(weeks)}
          onSelect={(v) => setWeeks(Number(v))}
        />
      </Section>

      <Section title="Sessions per Week" hint="≥4 = overtraining">
        <ChoiceGrid
          options={[2, 3].map(s => ({ id: String(s), label: `${s}/wk` }))}
          selected={String(sessionsPerWeek)}
          onSelect={(v) => setSessionsPerWeek(Number(v))}
        />
        <p className="text-[10px] text-grappler-500 mt-2 leading-relaxed">
          Combat athletes can&apos;t recover from 4+ plyo sessions/week alongside sport practice.
        </p>
      </Section>

      <button
        onClick={onShowRSI}
        className="w-full flex items-center justify-between gap-3 p-3 rounded-lg bg-grappler-900/60 border border-grappler-800 hover:bg-grappler-800/60 transition active:scale-[0.99]"
      >
        <div className="text-left">
          <div className="text-sm font-bold text-white">Test your RSI first</div>
          <div className="text-[11px] text-grappler-500">Reactive Strength Index baseline</div>
        </div>
        <ChevronRight className="w-4 h-4 text-grappler-500" />
      </button>
    </ToolShell>
  );
}

// ─── Active Block Overview ──────────────────────────────────────────────

function ActiveBlockOverview({ block, onClose, onShowSessions, onShowRSI, onReset }: {
  block: PlyoBlock;
  onClose: () => void;
  onShowSessions: () => void;
  onShowRSI: () => void;
  onReset: () => void;
}) {
  const totalContacts = block.sessions.reduce((s, x) => s + x.totalContacts, 0);
  const startedDays = Math.floor((Date.now() - new Date(block.startedAt).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <ToolShell
      onClose={onClose}
      eyebrow="IBRA / 02 · SPEED-STRENGTH"
      title={block.name}
      description={`${block.weeks} weeks · ${block.sessionsPerWeek}/wk · ${block.bodyFocus} focus`}
      footer={<PrimaryCTA onClick={onShowSessions} variant="go">View Sessions</PrimaryCTA>}
    >
      <div className="grid grid-cols-3 gap-2">
        <Stat value={block.sessions.length} label="Sessions" />
        <Stat value={totalContacts} label="Contacts" />
        <Stat value={`D${startedDays}`} label="Day" />
      </div>

      <Section title="Prerequisites">
        <ul className="space-y-1.5 text-sm text-grappler-200">
          {block.prerequisites.map((p, i) => (
            <li key={i} className="flex gap-2"><span className="text-emerald-400">·</span>{p}</li>
          ))}
        </ul>
      </Section>

      <Section title="Expected Adaptations">
        <ul className="space-y-1.5 text-sm text-grappler-200">
          {block.expectedAdaptations.map((a, i) => (
            <li key={i} className="flex gap-2"><span className="text-grappler-600">·</span>{a}</li>
          ))}
        </ul>
      </Section>

      <button
        onClick={onShowRSI}
        className="w-full flex items-center justify-between gap-3 p-3 rounded-lg bg-grappler-900/60 border border-grappler-800 hover:bg-grappler-800/60 transition active:scale-[0.99]"
      >
        <div className="text-left">
          <div className="text-sm font-bold text-white">Log RSI test</div>
          <div className="text-[11px] text-grappler-500">Reactive Strength Index check-in</div>
        </div>
        <ChevronRight className="w-4 h-4 text-grappler-500" />
      </button>

      <button
        onClick={onReset}
        className="block mx-auto text-[11px] uppercase tracking-[0.2em] text-grappler-500 hover:text-rose-400 mt-4"
      >
        Reset block
      </button>
    </ToolShell>
  );
}

// ─── Sessions View ──────────────────────────────────────────────────────

function SessionsView({ block, onBack, onClose, onPickSession }: {
  block: PlyoBlock;
  onBack: () => void;
  onClose: () => void;
  onPickSession: (s: PlyoSession) => void;
}) {
  const [openWeek, setOpenWeek] = useState<number | null>(1);

  const byWeek = useMemo(() => {
    const groups: Record<number, PlyoSession[]> = {};
    for (const s of block.sessions) {
      if (!groups[s.weekNumber]) groups[s.weekNumber] = [];
      groups[s.weekNumber].push(s);
    }
    return groups;
  }, [block.sessions]);

  return (
    <ToolShell
      onClose={onBack}
      eyebrow="IBRA / 02 · PLYO SESSIONS"
      title={block.name}
      description={`${block.sessions.length} sessions across ${block.weeks} weeks. Tap a week, pick a session.`}
    >
      {Object.entries(byWeek).map(([w, sessions]) => {
        const week = Number(w);
        const isOpen = openWeek === week;
        return (
          <Section key={week} title={`Week ${week}`} hint={sessions[0].phaseLabel}>
            <button
              onClick={() => setOpenWeek(isOpen ? null : week)}
              className="w-full flex items-center justify-between gap-3 -my-1 py-1 hover:opacity-80 transition"
            >
              <span className="text-[11px] uppercase tracking-[0.18em] text-grappler-500">
                {sessions.length} sessions · {sessions[0].phase}
              </span>
              {isOpen
                ? <ChevronUp className="w-4 h-4 text-grappler-500" />
                : <ChevronDown className="w-4 h-4 text-grappler-500" />}
            </button>
            {isOpen && (
              <div className="mt-3 space-y-2 border-t border-grappler-800 pt-3">
                {sessions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => onPickSession(s)}
                    className="w-full flex items-center justify-between gap-3 p-2 -mx-1 rounded-lg hover:bg-grappler-800/40 transition active:scale-[0.99] text-left"
                  >
                    <div>
                      <div className="text-sm font-bold text-white">Session {s.sessionNumber}</div>
                      <div className="text-[11px] text-grappler-500 font-mono tabular-nums">
                        {s.totalContacts} contacts · ~{s.estimatedMinutes}m
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-grappler-500" />
                  </button>
                ))}
              </div>
            )}
          </Section>
        );
      })}

      <button
        onClick={onClose}
        className="block mx-auto text-[11px] uppercase tracking-[0.2em] text-grappler-500 hover:text-grappler-300 mt-2"
      >
        Close tool
      </button>
    </ToolShell>
  );
}

// ─── Single Session Detail ──────────────────────────────────────────────

function SessionDetail({ session, onBack, onStart }: {
  session: PlyoSession;
  onBack: () => void;
  onStart: () => void;
}) {
  return (
    <ToolShell
      onClose={onBack}
      eyebrow={`IBRA / 02 · WK ${session.weekNumber} · ${session.phase.toUpperCase()}`}
      title={`Session ${session.sessionNumber}`}
      description={session.phaseLabel}
      footer={<PrimaryCTA onClick={onStart} variant="go">Start Session</PrimaryCTA>}
    >
      <div className="grid grid-cols-2 gap-2">
        <Stat value={session.totalContacts} label="Contacts" />
        <Stat value={session.estimatedMinutes} label="Minutes" />
      </div>

      <Section title="Warm-Up">
        <ul className="space-y-1 text-sm text-grappler-200">
          {session.warmUp.map((w, i) => <li key={i} className="flex gap-2"><span className="text-grappler-600">·</span>{w}</li>)}
        </ul>
      </Section>

      <Section title="Main Work">
        <div className="space-y-3">
          {session.exercises.map(ex => (
            <div key={ex.id} className="border-t border-grappler-800 first:border-0 pt-3 first:pt-0">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-sm font-bold text-white">{ex.name}</span>
                <span className="text-xs font-mono tabular-nums text-white">{ex.sets} × {ex.reps}</span>
              </div>
              <p className="text-[11px] text-grappler-400">{ex.loadGuidance} · rest {ex.restSeconds}s</p>
              {ex.cues.length > 0 && (
                <p className="text-[11px] text-grappler-500 mt-1 italic">{ex.cues.slice(0, 2).join(' · ')}</p>
              )}
              {ex.videoSearch && (
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.videoSearch)}`}
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-grappler-400 hover:text-white mt-1"
                >
                  <Youtube className="w-3 h-3" /> demo
                </a>
              )}
            </div>
          ))}
        </div>
      </Section>

      {session.notes.length > 0 && (
        <Section title="Coaching Notes">
          <ul className="space-y-1 text-xs text-grappler-300">
            {session.notes.map((n, i) => <li key={i} className="flex gap-2"><span className="text-grappler-600">·</span>{n}</li>)}
          </ul>
        </Section>
      )}
    </ToolShell>
  );
}

// ─── RSI View ───────────────────────────────────────────────────────────

function RSIView({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const protocol = getRSIProtocol();
  const history = useAppStore(s => s.rsiHistory ?? []);
  const addRsiEntry = useAppStore(s => s.addRsiEntry);
  const [height, setHeight] = useState(0.4);
  const [contactTime, setContactTime] = useState(0.22);

  const rsi = contactTime > 0 ? height / contactTime : 0;

  const log = () => {
    const entry: RSIEntry = {
      date: new Date().toISOString().slice(0, 10),
      rsi: Number(rsi.toFixed(2)),
      height,
      contactTime,
    };
    addRsiEntry(entry);
  };

  const tier = rsi >= protocol.goodScoreRange.excellent ? 'Excellent · elite' :
              rsi >= protocol.goodScoreRange.good ? 'Good · well-trained' :
              rsi >= protocol.goodScoreRange.fair ? 'Fair · recreational' : 'Building';

  const accent: 'go' | 'caution' | 'danger' | 'info' =
    rsi >= protocol.goodScoreRange.good ? 'go' :
    rsi >= protocol.goodScoreRange.fair ? 'caution' : 'info';

  return (
    <ToolShell
      onClose={onBack}
      eyebrow="IBRA / 02 · RSI TEST"
      title="Reactive Strength Index"
      description={protocol.formula}
      footer={<PrimaryCTA onClick={log}>Log Test</PrimaryCTA>}
    >
      <Section title="Current">
        <HeroMetric value={rsi.toFixed(2)} label="RSI" state={tier} accent={accent} />
      </Section>

      <Section title="Setup">
        <ul className="space-y-1 text-sm text-grappler-200">
          {protocol.setupCues.map((c, i) => <li key={i} className="flex gap-2"><span className="text-grappler-600">·</span>{c}</li>)}
        </ul>
      </Section>

      <Section title="Performance">
        <ul className="space-y-1 text-sm text-grappler-200">
          {protocol.performance.map((c, i) => <li key={i} className="flex gap-2"><span className="text-grappler-600">·</span>{c}</li>)}
        </ul>
      </Section>

      <Section title="Inputs">
        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-[0.18em] text-grappler-500 block mb-1">Jump height (m)</label>
            <input
              type="number" step="0.01" min={0} max={1.5}
              value={height}
              onChange={e => setHeight(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-grappler-950 border border-grappler-800 text-white font-mono tabular-nums"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.18em] text-grappler-500 block mb-1">Ground contact time (s)</label>
            <input
              type="number" step="0.01" min={0.05} max={1}
              value={contactTime}
              onChange={e => setContactTime(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-grappler-950 border border-grappler-800 text-white font-mono tabular-nums"
            />
          </div>
        </div>
      </Section>

      {history.length > 0 && (
        <Section title="History" hint={`${history.length} tests`}>
          <div className="space-y-1 text-xs">
            {history.slice(-10).reverse().map((e, i) => (
              <div key={i} className="flex justify-between py-1.5 border-b border-grappler-800 last:border-0">
                <span className="text-grappler-300 font-mono tabular-nums">{e.date}</span>
                <span className="font-mono tabular-nums text-white">RSI {e.rsi.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      <button
        onClick={onClose}
        className="block mx-auto text-[11px] uppercase tracking-[0.2em] text-grappler-500 hover:text-grappler-300 mt-2"
      >
        Close tool
      </button>
    </ToolShell>
  );
}

// ─── Shared ChoiceGrid ──────────────────────────────────────────────────

function ChoiceGrid({ options, selected, onSelect }: {
  options: { id: string; label: string; disabled?: boolean }[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => !opt.disabled && onSelect(opt.id)}
          disabled={opt.disabled}
          className={cn(
            'py-2.5 rounded-lg border text-sm font-medium capitalize transition active:scale-[0.97]',
            selected === opt.id
              ? 'bg-white border-white text-grappler-950'
              : 'bg-transparent border-grappler-800 text-grappler-200 hover:bg-grappler-800/40',
            opt.disabled && 'opacity-30 cursor-not-allowed'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
