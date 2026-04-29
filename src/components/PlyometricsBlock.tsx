'use client';

/**
 * PlyometricsBlock — speed-strength block UI
 *
 * Plyo block setup, session viewer, and RSI test protocol. Sessions can be
 * pushed into the normal workout execution flow via plyoSessionToWorkoutSession.
 */

import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Zap, ArrowRight, Check, Info, Youtube, AlertTriangle, Activity,
  PlayCircle, BarChart3, ChevronDown, ChevronUp, Target, Calendar, Sparkles,
} from 'lucide-react';
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

interface Props { onClose: () => void }

// Legacy localStorage keys — only used during one-time migration from pre-store version
const LEGACY_BLOCK_KEY = 'roots-plyo-block';
const LEGACY_RSI_KEY = 'roots-plyo-rsi-history';

export default function PlyometricsBlock({ onClose }: Props) {
  const { showToast } = useToast();
  const startWorkout = useAppStore(s => s.startWorkout);
  const block = useAppStore(s => s.activePlyoBlock);
  const setActivePlyoBlock = useAppStore(s => s.setActivePlyoBlock);
  const addRsiEntry = useAppStore(s => s.addRsiEntry);

  const [view, setView] = useState<'overview' | 'setup' | 'sessions' | 'rsi'>('overview');

  // One-time migration from legacy localStorage keys (pre-store version)
  useEffect(() => {
    try {
      const legacyBlock = localStorage.getItem(LEGACY_BLOCK_KEY);
      if (legacyBlock && !block) {
        setActivePlyoBlock(JSON.parse(legacyBlock) as PlyoBlock);
      }
      if (legacyBlock) localStorage.removeItem(LEGACY_BLOCK_KEY);

      const legacyRsi = localStorage.getItem(LEGACY_RSI_KEY);
      if (legacyRsi) {
        const entries = JSON.parse(legacyRsi) as RSIEntry[];
        for (const entry of entries) addRsiEntry(entry);
        localStorage.removeItem(LEGACY_RSI_KEY);
      }
    } catch {
      // ignore corrupt legacy data
    }
    // intentionally only runs once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveBlock = (b: PlyoBlock | null) => {
    setActivePlyoBlock(b);
  };

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

  return (
    <div className="fixed inset-0 z-50 bg-grappler-950 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-grappler-950 border-b border-grappler-800 px-4 py-3 safe-area-top flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <div>
            <h1 className="text-lg font-bold text-white">Speed-Strength Block</h1>
            <p className="text-[11px] text-grappler-400">Plyometrics for combat athletes</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" className="p-3 -mr-1 hover:bg-grappler-800 rounded-lg active:scale-95 transition">
          <X className="w-5 h-5 text-grappler-300" />
        </button>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-3 flex gap-1.5 overflow-x-auto">
        {([
          { id: 'overview', label: 'Overview' },
          { id: 'sessions', label: 'Sessions' },
          { id: 'rsi',      label: 'RSI Test' },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            disabled={!block && t.id === 'sessions'}
            className={cn(
              'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wide transition',
              view === t.id
                ? 'bg-grappler-100 text-grappler-950'
                : 'bg-grappler-800/50 text-grappler-300 hover:bg-grappler-800',
              !block && t.id === 'sessions' && 'opacity-40 cursor-not-allowed'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 pb-24 max-w-xl mx-auto">
        <AnimatePresence mode="wait">
          {view === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {block
                ? <ActiveBlockOverview block={block} onShowSessions={() => setView('sessions')} onReset={() => saveBlock(null)} />
                : <Setup onCreate={(b) => { saveBlock(b); setView('sessions'); }} />}
            </motion.div>
          )}
          {view === 'sessions' && block && (
            <motion.div key="sessions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SessionList block={block} onStart={startSession} />
            </motion.div>
          )}
          {view === 'rsi' && (
            <motion.div key="rsi" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <RSIView />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────

function Setup({ onCreate }: { onCreate: (b: PlyoBlock) => void }) {
  const [bodyFocus, setBodyFocus] = useState<PlyoBodyFocus>('full');
  const [experience, setExperience] = useState<PlyoExperience>('intermediate');
  const [weeks, setWeeks] = useState(6);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(2);

  const create = () => {
    const block = generatePlyoBlock({ bodyFocus, experience, weeks, sessionsPerWeek, trainingIdentity: 'combat' });
    onCreate(block);
  };

  return (
    <div className="space-y-4 mt-2">
      <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <h2 className="font-bold text-white">What you're getting</h2>
        </div>
        <p className="text-xs text-grappler-200 leading-relaxed">
          A periodized plyometric program — <strong>extensive → intensive → reactive → contrast</strong> — to build the
          rate of force development (RFD) and reactive strength that translate to striking power, takedown speed, and shot reaction.
        </p>
      </div>

      <Section title="Body Focus" icon={Target}>
        <div className="grid grid-cols-3 gap-2">
          {(['lower', 'upper', 'full'] as PlyoBodyFocus[]).map(b => (
            <button
              key={b}
              onClick={() => setBodyFocus(b)}
              className={cn(
                'p-2.5 rounded-lg border text-sm font-medium capitalize transition',
                bodyFocus === b ? 'bg-grappler-100 border-grappler-100 text-grappler-950' : 'bg-grappler-800/40 border-grappler-800 text-grappler-200'
              )}
            >{b}</button>
          ))}
        </div>
      </Section>

      <Section title="Experience" icon={Activity}>
        <div className="grid grid-cols-3 gap-2">
          {(['beginner', 'intermediate', 'advanced'] as PlyoExperience[]).map(e => (
            <button
              key={e}
              onClick={() => setExperience(e)}
              className={cn(
                'p-2.5 rounded-lg border text-sm font-medium capitalize transition',
                experience === e ? 'bg-grappler-100 border-grappler-100 text-grappler-950' : 'bg-grappler-800/40 border-grappler-800 text-grappler-200'
              )}
            >{e}</button>
          ))}
        </div>
        {experience === 'beginner' && (
          <p className="text-[11px] text-amber-400 mt-2">
            Beginners cap at 4 weeks. Extensive base for the first run.
          </p>
        )}
      </Section>

      <Section title="Block Length" icon={Calendar}>
        <div className="grid grid-cols-3 gap-2">
          {[4, 6, 8].map(w => (
            <button
              key={w}
              onClick={() => setWeeks(w)}
              disabled={experience === 'beginner' && w > 4}
              className={cn(
                'p-2.5 rounded-lg border text-sm font-bold transition',
                weeks === w ? 'bg-amber-500 border-amber-500 text-grappler-950' : 'bg-grappler-800/40 border-grappler-800 text-grappler-200',
                experience === 'beginner' && w > 4 && 'opacity-30 cursor-not-allowed'
              )}
            >{w} weeks</button>
          ))}
        </div>
      </Section>

      <Section title="Sessions/Week" icon={BarChart3}>
        <div className="grid grid-cols-3 gap-2">
          {[2, 3].map(s => (
            <button
              key={s}
              onClick={() => setSessionsPerWeek(s)}
              className={cn(
                'p-2.5 rounded-lg border text-sm font-bold transition',
                sessionsPerWeek === s ? 'bg-amber-500 border-amber-500 text-grappler-950' : 'bg-grappler-800/40 border-grappler-800 text-grappler-200'
              )}
            >{s}/wk</button>
          ))}
          <button
            disabled
            className="p-2.5 rounded-lg border border-grappler-800 text-grappler-500 opacity-30 cursor-not-allowed text-xs"
          >
            More = overtraining
          </button>
        </div>
        <p className="text-[11px] text-grappler-500 mt-2">
          Combat athletes can\'t recover from 4+ plyo sessions/week alongside sport practice.
        </p>
      </Section>

      <button
        onClick={create}
        className="w-full px-5 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-grappler-950 font-bold transition flex items-center justify-center gap-2"
      >
        Generate Block
        <Sparkles className="w-5 h-5" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Active Block Overview
// ─────────────────────────────────────────────────────────────────────────

function ActiveBlockOverview({ block, onShowSessions, onReset }: {
  block: PlyoBlock;
  onShowSessions: () => void;
  onReset: () => void;
}) {
  const totalContacts = block.sessions.reduce((s, x) => s + x.totalContacts, 0);
  const startedDays = Math.floor((Date.now() - new Date(block.startedAt).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-4 mt-2">
      <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-5">
        <h2 className="text-xl font-bold text-white mb-1">{block.name}</h2>
        <p className="text-xs text-grappler-300">
          {block.weeks} weeks · {block.sessionsPerWeek} sessions/week · {block.bodyFocus} focus
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-grappler-950/40 p-2">
            <div className="text-lg font-bold text-amber-300">{block.sessions.length}</div>
            <div className="text-[10px] text-grappler-400 uppercase">Sessions</div>
          </div>
          <div className="rounded-lg bg-grappler-950/40 p-2">
            <div className="text-lg font-bold text-amber-300">{totalContacts}</div>
            <div className="text-[10px] text-grappler-400 uppercase">Contacts</div>
          </div>
          <div className="rounded-lg bg-grappler-950/40 p-2">
            <div className="text-lg font-bold text-amber-300">D{startedDays}</div>
            <div className="text-[10px] text-grappler-400 uppercase">Day</div>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-grappler-900/60 border border-grappler-800 p-4">
        <h3 className="text-sm font-semibold text-grappler-100 uppercase tracking-wider mb-2">Prerequisites</h3>
        <ul className="space-y-1.5 text-sm text-grappler-200">
          {block.prerequisites.map((p, i) => (
            <li key={i} className="flex gap-2"><Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" /> {p}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl bg-grappler-900/60 border border-grappler-800 p-4">
        <h3 className="text-sm font-semibold text-grappler-100 uppercase tracking-wider mb-2">Expected Adaptations</h3>
        <ul className="space-y-1.5 text-sm text-grappler-200">
          {block.expectedAdaptations.map((a, i) => (
            <li key={i} className="flex gap-2"><Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" /> {a}</li>
          ))}
        </ul>
      </div>

      <button
        onClick={onShowSessions}
        className="w-full px-5 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-grappler-950 font-bold transition flex items-center justify-center gap-2"
      >
        View Sessions
        <ArrowRight className="w-5 h-5" />
      </button>

      <button
        onClick={onReset}
        className="w-full px-4 py-2 rounded-xl bg-grappler-800/60 hover:bg-grappler-800 text-grappler-300 text-xs transition"
      >
        Reset & Start Over
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Session List
// ─────────────────────────────────────────────────────────────────────────

function SessionList({ block, onStart }: { block: PlyoBlock; onStart: (s: PlyoSession) => void }) {
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
    <div className="space-y-2 mt-2">
      {Object.entries(byWeek).map(([w, sessions]) => {
        const week = Number(w);
        const isOpen = openWeek === week;
        const phase = sessions[0].phase;
        return (
          <div key={week} className="rounded-xl bg-grappler-900/60 border border-grappler-800 overflow-hidden">
            <button
              onClick={() => setOpenWeek(isOpen ? null : week)}
              className="w-full flex items-center justify-between gap-3 p-4 hover:bg-grappler-800/40 transition"
            >
              <div className="text-left">
                <div className="text-sm font-bold text-white">Week {week}</div>
                <div className="text-[11px] text-amber-400">{sessions[0].phaseLabel}</div>
              </div>
              <div className="flex items-center gap-3">
                <PhasePill phase={phase} />
                {isOpen ? <ChevronUp className="w-4 h-4 text-grappler-400" /> : <ChevronDown className="w-4 h-4 text-grappler-400" />}
              </div>
            </button>
            {isOpen && (
              <div className="border-t border-grappler-800 p-2 space-y-2">
                {sessions.map(s => (
                  <SessionCard key={s.id} session={s} onStart={() => onStart(s)} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PhasePill({ phase }: { phase: PlyoSession['phase'] }) {
  const colors = {
    extensive: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    intensive: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    reactive: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    contrast: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  };
  return (
    <span className={cn('text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border', colors[phase])}>
      {phase}
    </span>
  );
}

function SessionCard({ session, onStart }: { session: PlyoSession; onStart: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-lg bg-grappler-950/40 border border-grappler-800">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between gap-3 hover:bg-grappler-900/60 transition"
      >
        <div className="text-left">
          <div className="text-sm font-semibold text-white">Session {session.sessionNumber}</div>
          <div className="text-[11px] text-grappler-400">
            {session.totalContacts} contacts · ~{session.estimatedMinutes} min
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-grappler-400" /> : <ChevronDown className="w-4 h-4 text-grappler-400" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-grappler-800 pt-3">
          <div>
            <div className="text-[10px] uppercase text-grappler-500 font-bold mb-1">Warm-Up</div>
            <ul className="text-xs text-grappler-300 space-y-0.5">
              {session.warmUp.map((w, i) => <li key={i}>• {w}</li>)}
            </ul>
          </div>

          <div>
            <div className="text-[10px] uppercase text-grappler-500 font-bold mb-1">Main Work</div>
            <div className="space-y-2">
              {session.exercises.map(ex => (
                <div key={ex.id} className="rounded-md bg-grappler-900/40 p-2 border border-grappler-800">
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-white">{ex.name}</span>
                    <span className="text-xs font-mono text-amber-300">{ex.sets} × {ex.reps}</span>
                  </div>
                  <p className="text-[11px] text-grappler-400">{ex.loadGuidance} · rest {ex.restSeconds}s</p>
                  {ex.cues.length > 0 && (
                    <p className="text-[11px] text-grappler-500 mt-1 italic">{ex.cues.slice(0, 2).join(' · ')}</p>
                  )}
                  {ex.videoSearch && (
                    <a
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.videoSearch)}`}
                      target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 mt-1"
                    >
                      <Youtube className="w-3 h-3" /> demo
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {session.notes.length > 0 && (
            <div className="rounded-md bg-grappler-900/40 border border-grappler-800 p-2">
              <div className="flex items-center gap-1.5 mb-1">
                <Info className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] uppercase text-grappler-300 font-bold">Coaching Notes</span>
              </div>
              {session.notes.map((n, i) => (
                <p key={i} className="text-[11px] text-grappler-300">• {n}</p>
              ))}
            </div>
          )}

          <button
            onClick={onStart}
            className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm flex items-center justify-center gap-2 transition"
          >
            <PlayCircle className="w-4 h-4" />
            Start Session
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// RSI Test View
// ─────────────────────────────────────────────────────────────────────────

function RSIView() {
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

  const tier = rsi >= protocol.goodScoreRange.excellent ? 'Excellent (elite)' :
              rsi >= protocol.goodScoreRange.good ? 'Good (well-trained)' :
              rsi >= protocol.goodScoreRange.fair ? 'Fair (recreational)' : 'Building';

  return (
    <div className="space-y-4 mt-2">
      <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4">
        <h2 className="font-bold text-white mb-1">Reactive Strength Index</h2>
        <p className="text-xs text-rose-200 leading-relaxed">{protocol.formula}</p>
      </div>

      <Section title="Setup" icon={Info}>
        <ul className="space-y-1 text-sm text-grappler-200">
          {protocol.setupCues.map((c, i) => <li key={i}>• {c}</li>)}
        </ul>
      </Section>

      <Section title="Performance" icon={Activity}>
        <ul className="space-y-1 text-sm text-grappler-200">
          {protocol.performance.map((c, i) => <li key={i}>• {c}</li>)}
        </ul>
      </Section>

      <Section title="Log Your RSI" icon={BarChart3}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-grappler-300 block mb-1">Jump height (m)</label>
            <input
              type="number" step="0.01" min={0} max={1.5}
              value={height}
              onChange={e => setHeight(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-grappler-950 border border-grappler-800 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-grappler-300 block mb-1">Ground contact time (s)</label>
            <input
              type="number" step="0.01" min={0.05} max={1}
              value={contactTime}
              onChange={e => setContactTime(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-grappler-950 border border-grappler-800 text-white"
            />
          </div>
          <div className="rounded-lg bg-grappler-950/60 border border-amber-500/20 p-3 text-center">
            <div className="text-3xl font-bold text-amber-300 font-mono">{rsi.toFixed(2)}</div>
            <div className="text-[11px] text-grappler-300 mt-1">RSI · {tier}</div>
          </div>
          <button
            onClick={log}
            className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-grappler-950 font-bold text-sm transition"
          >
            Log Test
          </button>
        </div>
      </Section>

      {history.length > 0 && (
        <Section title={`History (${history.length})`} icon={Calendar}>
          <div className="space-y-1.5 text-xs">
            {history.slice(-10).reverse().map((e, i) => (
              <div key={i} className="flex justify-between p-2 rounded bg-grappler-950/40">
                <span className="text-grappler-300">{e.date}</span>
                <span className="font-mono text-amber-300">RSI {e.rsi.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-grappler-900/60 border border-grappler-800 p-4">
      <h3 className="text-sm font-semibold text-grappler-100 uppercase tracking-wider mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4 text-amber-400" />
        {title}
      </h3>
      {children}
    </div>
  );
}
