'use client';

import { motion } from 'framer-motion';
import {
  X, Brain, AlertTriangle, Zap, Trophy, Lightbulb, ArrowDown,
  TrendingUp, Clock, Dumbbell, Target, Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ANALYZERS = [
  {
    title: 'RPE Tracker',
    icon: AlertTriangle,
    color: 'red',
    desc: 'Warns if your RPE is 2+ above target (grinding). Encourages weight bumps if RPE is too low.',
    example: '"RPE 9 on a target-7 set. Drop 5-10% or take extra rest."',
  },
  {
    title: 'Rep Drop Detector',
    icon: ArrowDown,
    color: 'orange',
    desc: 'Flags when reps drop more than 30% from set 1 to your latest set — a sign weight is too heavy.',
    example: '"Reps dropped 40% from set 1 to set 4. Consider dropping 5% next session."',
  },
  {
    title: 'Weight vs History',
    icon: TrendingUp,
    color: 'emerald',
    desc: 'Compares your current weight to the last time you did this exercise. Celebrates increases.',
    example: '"+10 lbs vs last time. Stronger. Keep this energy."',
  },
  {
    title: 'Session Pacing',
    icon: Clock,
    color: 'blue',
    desc: 'Alerts if your session runs past 75 minutes. Celebrates the halfway mark.',
    example: '"78 min in — tighten up rest periods or cut your last isolation."',
  },
  {
    title: 'Throttle Context',
    icon: Zap,
    color: 'yellow',
    desc: 'Reminds you of your readiness level on the first set. Sets the tone for the session.',
    example: '"Session is throttled — focus on execution, not numbers."',
  },
  {
    title: 'Exercise Transitions',
    icon: Dumbbell,
    color: 'violet',
    desc: 'Provides movement cues when transitioning to a new exercise.',
    example: '"Up next: Bench Press — 4×8 @ RPE 7. Drive through the chest."',
  },
  {
    title: 'Milestones',
    icon: Trophy,
    color: 'yellow',
    desc: 'Celebrates weight PRs and the last set of the session.',
    example: '"New weight PR on Squat! 315 lbs — that\'s never been done before."',
  },
  {
    title: 'Form Cues',
    icon: Lightbulb,
    color: 'cyan',
    desc: 'Pulls technique cues from the exercise database on your second set of each exercise.',
    example: '"Retract your scapulae and maintain a slight arch in your lower back."',
  },
];

const TONES = [
  { tone: 'Hype', color: 'emerald', desc: 'Encouragement and energy' },
  { tone: 'Warning', color: 'red', desc: 'Overexertion alerts' },
  { tone: 'Celebrate', color: 'yellow', desc: 'PRs and milestones' },
  { tone: 'Tactical', color: 'blue', desc: 'Actionable coaching cues' },
  { tone: 'Calm', color: 'slate', desc: 'Reassurance on tough days' },
];

const toneColorMap: Record<string, string> = {
  emerald: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
  red: 'bg-red-500/15 border-red-500/30 text-red-400',
  yellow: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400',
  blue: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
  slate: 'bg-grappler-700/50 border-grappler-600/30 text-grappler-400',
  orange: 'bg-orange-500/15 border-orange-500/30 text-orange-400',
  violet: 'bg-violet-500/15 border-violet-500/30 text-violet-400',
  cyan: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400',
};

export default function CornerCoachInfo({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-grappler-900 flex flex-col safe-area-top"
    >
      <header className="sticky top-0 z-10 bg-grappler-900/95 backdrop-blur-sm border-b border-grappler-800 p-4 flex items-center justify-between">
        <button onClick={onClose} className="btn btn-ghost btn-sm">
          <X className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-grappler-50">AI Corner Coach</h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-4">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-violet-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Brain className="w-7 h-7 text-violet-400" />
          </div>
          <p className="text-sm text-grappler-400 max-w-xs mx-auto">
            Like a corner coach in a fight — watches your live performance and calls out actionable cues between sets.
          </p>
        </div>

        <h2 className="text-xs font-semibold text-grappler-400 uppercase tracking-wide">How It Works</h2>
        <div className="space-y-2">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-grappler-800/50">
            <span className="text-sm font-bold text-grappler-300 mt-0.5">1.</span>
            <p className="text-sm text-grappler-300">Start a workout — the Corner Coach activates automatically</p>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-xl bg-grappler-800/50">
            <span className="text-sm font-bold text-grappler-300 mt-0.5">2.</span>
            <p className="text-sm text-grappler-300">After each set, 8 analyzers evaluate your performance in real-time</p>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-xl bg-grappler-800/50">
            <span className="text-sm font-bold text-grappler-300 mt-0.5">3.</span>
            <p className="text-sm text-grappler-300">1-2 coaching messages appear during your rest period (never spam)</p>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-xl bg-grappler-800/50">
            <span className="text-sm font-bold text-grappler-300 mt-0.5">4.</span>
            <p className="text-sm text-grappler-300">Messages auto-dismiss after 12-15 seconds, or tap to close early</p>
          </div>
        </div>

        <h2 className="text-xs font-semibold text-grappler-400 uppercase tracking-wide pt-2">Message Tones</h2>
        <div className="flex flex-wrap gap-2">
          {TONES.map(t => (
            <div key={t.tone} className={cn('px-3 py-1.5 rounded-full border text-xs font-medium', toneColorMap[t.color])}>
              {t.tone} — {t.desc}
            </div>
          ))}
        </div>

        <h2 className="text-xs font-semibold text-grappler-400 uppercase tracking-wide pt-2">8 Real-Time Analyzers</h2>
        <div className="space-y-3">
          {ANALYZERS.map(a => {
            const Icon = a.icon;
            return (
              <div key={a.title} className={cn('rounded-xl p-3.5 border', toneColorMap[a.color])}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-bold">{a.title}</span>
                </div>
                <p className="text-xs text-grappler-300 mb-2">{a.desc}</p>
                <p className="text-xs italic text-grappler-400">{a.example}</p>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl p-4 bg-grappler-800/50 border border-grappler-700/50 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-primary-400" />
            <h3 className="text-sm font-bold text-grappler-200">Smart Deduplication</h3>
          </div>
          <p className="text-xs text-grappler-400">
            The coach never repeats the same message twice in a session. Each trigger is tracked so you only get fresh, relevant cues — not the same advice on repeat.
          </p>
        </div>

        <div className="rounded-xl p-4 bg-grappler-800/50 border border-grappler-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-bold text-grappler-200">Readiness-Aware</h3>
          </div>
          <p className="text-xs text-grappler-400">
            On throttled days, the coach adjusts its tone — no hype to push heavy when your body needs recovery. On peak days, it encourages PR attempts.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
