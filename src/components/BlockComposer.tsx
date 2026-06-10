'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Heart, Flame, Target, Play, ListPlus, SlidersHorizontal, X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GoalFocus, SessionsPerWeek } from '@/lib/types';

export type PeriodizationStyle = 'linear' | 'undulating' | 'block' | 'conjugate';

export interface BlockConfig {
  focus: GoalFocus;
  weeks: number;
  days: SessionsPerWeek;
  periodization: PeriodizationStyle;
  sessionMinutes: number; // 0 = no cap
}

interface BlockComposerProps {
  mode: 'empty' | 'sheet';
  onStart: (cfg: BlockConfig) => void;
  onQueue?: (cfg: BlockConfig) => void;
  onClose?: () => void;
  // Receives the composer's current config so the muscle picker can generate
  // with the user's focus/weeks/days/wave choices instead of defaults
  onCustomizeMuscles?: (cfg: BlockConfig) => void;
  defaultFocus?: GoalFocus;
  defaultDays?: SessionsPerWeek;
}

const FOCUS_OPTIONS: { value: GoalFocus; label: string; desc: string; icon: typeof Zap }[] = [
  { value: 'strength', label: 'Strength', desc: 'Heavy, low reps', icon: Zap },
  { value: 'hypertrophy', label: 'Muscle', desc: 'Volume, pump', icon: Heart },
  { value: 'balanced', label: 'Both', desc: 'Best of both', icon: Flame },
  { value: 'strength_endurance', label: 'Endurance', desc: 'High reps, short rest', icon: Target },
];

// Names for queued blocks — single source next to FOCUS_OPTIONS so the queue
// never invents labels the composer UI doesn't use
export const FOCUS_QUEUE_LABELS: Record<string, string> = {
  strength: 'Strength', hypertrophy: 'Hypertrophy', balanced: 'Balanced',
  power: 'Power', strength_endurance: 'Endurance',
};

const WEEK_OPTIONS = [4, 5, 6, 8];
const DAY_OPTIONS: SessionsPerWeek[] = [2, 3, 4, 5, 6];
const DAY_SPLITS: Record<number, string> = {
  2: 'Full Body', 3: 'Full Body', 4: 'Upper / Lower',
  5: 'Push / Pull / Legs', 6: 'Push / Pull / Legs',
};

const WAVE_OPTIONS: { value: PeriodizationStyle; label: string; desc: string }[] = [
  { value: 'linear', label: 'Linear', desc: 'Steady weekly ramp — simple and proven' },
  { value: 'undulating', label: 'Undulating', desc: 'Heavy / volume / power rotate through the week' },
  { value: 'block', label: 'Block', desc: 'Accumulate → intensify → peak in phases' },
  { value: 'conjugate', label: 'Conjugate', desc: 'Strength, size and speed trained concurrently' },
];

/** Approximates the generator's week math: a 3%/week volume ramp capped at 1.15
 *  (workout-generator.ts) and a deload around 0.6-0.7 of base volume (the exact
 *  deload multiplier is sex-dependent). Close enough for a shape preview — the
 *  generated block is the source of truth. */
function previewWeeks(weeks: number) {
  return Array.from({ length: weeks }, (_, i) => {
    const isDeload = i === weeks - 1; // last week is deload (auto-skipped when fresh)
    if (isDeload) return { volume: 0.65, isDeload };
    return { volume: Math.min(1.15, 1 + i * 0.03), isDeload };
  });
}

function WavePreview({ weeks }: { weeks: number }) {
  const data = previewWeeks(weeks);
  const W = 280, H = 56, PAD = 14;
  const min = 0.5, max = 1.2;
  const pts = data.map((d, i) => ({
    x: PAD + (i * (W - PAD * 2)) / Math.max(1, data.length - 1),
    y: H - 8 - ((d.volume - min) / (max - min)) * (H - 16),
    isDeload: d.isDeload,
  }));
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H + 14}`} className="w-full" aria-hidden>
      <path d={`${path} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`} fill="currentColor" className="text-primary-500/15" />
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-primary-400" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" className={p.isDeload ? 'fill-teal-400' : 'fill-primary-400'} />
          <text x={p.x} y={H + 10} textAnchor="middle" className={cn('text-[8px]', p.isDeload ? 'fill-teal-400' : 'fill-grappler-400')}>
            {p.isDeload ? 'DL' : `W${i + 1}`}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function BlockComposer({
  mode, onStart, onQueue, onClose, onCustomizeMuscles, defaultFocus = 'balanced', defaultDays = 3,
}: BlockComposerProps) {
  const [focus, setFocus] = useState<GoalFocus>(defaultFocus);
  const [weeks, setWeeks] = useState(5);
  const [days, setDays] = useState<SessionsPerWeek>(defaultDays);
  const [periodization, setPeriodization] = useState<PeriodizationStyle>('linear');
  const [sessionMinutes, setSessionMinutes] = useState(0);

  const cfg: BlockConfig = useMemo(
    () => ({ focus, weeks, days, periodization, sessionMinutes }),
    [focus, weeks, days, periodization, sessionMinutes]
  );
  const totalSessions = weeks * days;
  const waveDesc = WAVE_OPTIONS.find(w => w.value === periodization)?.desc;

  const body = (
    <div className="space-y-5">
      {/* Focus */}
      <div>
        <label className="text-xs font-medium text-grappler-400 uppercase tracking-wider mb-2 block px-1">Focus</label>
        <div className="grid grid-cols-4 gap-2">
          {FOCUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFocus(opt.value)}
              aria-pressed={focus === opt.value}
              className={cn(
                'card p-2.5 flex flex-col items-center gap-1.5 text-center transition-all border',
                focus === opt.value ? 'border-primary-500 bg-primary-500/10' : 'border-transparent hover:bg-grappler-700/50'
              )}
            >
              <opt.icon className={cn('w-5 h-5', focus === opt.value ? 'text-primary-400' : 'text-grappler-400')} />
              <span className={cn('text-xs font-semibold', focus === opt.value ? 'text-grappler-50' : 'text-grappler-300')}>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Length + Days */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-grappler-400 uppercase tracking-wider mb-2 block px-1">Length</label>
          <div className="flex gap-1.5">
            {WEEK_OPTIONS.map(w => (
              <button
                key={w}
                onClick={() => setWeeks(w)}
                aria-pressed={weeks === w}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-bold transition-all border',
                  weeks === w ? 'bg-primary-500 text-white border-primary-400' : 'bg-grappler-800 text-grappler-300 border-grappler-700 hover:border-grappler-500'
                )}
              >
                {w}w
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-grappler-400 uppercase tracking-wider mb-2 block px-1">Days / Week</label>
          <div className="flex gap-1.5">
            {DAY_OPTIONS.map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                aria-pressed={days === d}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-bold transition-all border',
                  days === d ? 'bg-primary-500 text-white border-primary-400' : 'bg-grappler-800 text-grappler-300 border-grappler-700 hover:border-grappler-500'
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Periodization */}
      <div>
        <label className="text-xs font-medium text-grappler-400 uppercase tracking-wider mb-2 block px-1">Wave</label>
        <div className="grid grid-cols-4 gap-1.5">
          {WAVE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPeriodization(opt.value)}
              aria-pressed={periodization === opt.value}
              className={cn(
                'py-2 px-1 rounded-lg text-xs font-semibold transition-all border',
                periodization === opt.value ? 'bg-primary-500/15 text-primary-300 border-primary-500' : 'bg-grappler-800 text-grappler-400 border-grappler-700 hover:border-grappler-500'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-grappler-400 mt-1.5 px-1">{waveDesc}</p>
      </div>

      {/* Live preview */}
      <div className="card p-3 bg-grappler-800/40">
        <WavePreview weeks={weeks} />
        <p className="text-xs text-grappler-400 text-center mt-1">
          {weeks} weeks · {days}× / week · {totalSessions} sessions · <span className="text-teal-400">deload last week</span>
          <span className="text-grappler-500"> (skipped if you&apos;re fresh)</span> · <span className="text-grappler-300">{DAY_SPLITS[days]}</span>
        </p>
      </div>

      {/* Time cap + muscle customization */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-grappler-500" />
          {[0, 60, 90].map(m => (
            <button
              key={m}
              onClick={() => setSessionMinutes(m)}
              aria-pressed={sessionMinutes === m}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                sessionMinutes === m ? 'bg-primary-500/20 text-primary-300' : 'bg-grappler-800 text-grappler-400 hover:text-grappler-200'
              )}
            >
              {m === 0 ? 'No cap' : `${m}m`}
            </button>
          ))}
        </div>
        {onCustomizeMuscles && (
          <button onClick={() => onCustomizeMuscles(cfg)} className="btn btn-ghost btn-sm gap-1.5 text-grappler-400" data-tight>
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Muscles
          </button>
        )}
      </div>

      {/* CTAs */}
      <div className="flex gap-2">
        <button onClick={() => onStart(cfg)} className="btn btn-primary btn-md flex-1 gap-2 font-semibold">
          <Play className="w-4 h-4" />
          Start Block
        </button>
        {onQueue && (
          <button onClick={() => onQueue(cfg)} className="btn btn-secondary btn-md gap-2" aria-label="Add block to queue">
            <ListPlus className="w-4 h-4" />
            Queue
          </button>
        )}
      </div>
    </div>
  );

  if (mode === 'empty') {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-grappler-50 text-center">Build Your Block</h2>
          <p className="text-sm text-grappler-400 text-center mt-1">Four picks. One tap. Training starts today.</p>
        </div>
        {body}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
      role="dialog"
      aria-modal="true"
      aria-label="New block composer"
      onKeyDown={e => { if (e.key === 'Escape') onClose?.(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="w-full sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-grappler-900 border border-grappler-700 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-grappler-50">New Block</h2>
          <button onClick={onClose} aria-label="Close composer" className="w-8 h-8 rounded-full bg-grappler-800 flex items-center justify-center text-grappler-400 hover:text-grappler-200" data-tight>
            <X className="w-4 h-4" />
          </button>
        </div>
        {body}
      </motion.div>
    </motion.div>
  );
}
