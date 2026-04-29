'use client';

import { motion } from 'framer-motion';
import { X, Sunrise, Thermometer, Zap, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const PHASES = [
  {
    icon: Thermometer,
    title: 'General Cardio',
    desc: '5 minutes of light cardio — bike, row, or jump rope to break a sweat and raise core temperature.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Sunrise,
    title: 'Dynamic Stretches',
    desc: 'Targeted stretches for the muscle groups in your session — hip swings, arm circles, cat-cow, and more.',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
  },
  {
    icon: Zap,
    title: 'Activation Drills',
    desc: 'Movement-pattern-specific activation — push-up walkouts for push days, goblet squats for squat days, etc.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
  },
  {
    icon: BarChart3,
    title: 'Ramp-Up Sets',
    desc: 'Progressive loading for your first compound lift — empty bar to 85% of working weight to prime the CNS.',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
  },
];

export default function WarmUpInfo({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-grappler-900 flex flex-col safe-area-top"
    >
      <header className="sticky top-0 z-10 bg-grappler-900 border-b border-grappler-800 p-4 flex items-center justify-between">
        <button onClick={onClose} className="btn btn-ghost btn-sm">
          <X className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-grappler-50">Smart Warm-Up</h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-5">
        {/* Hero */}
        <div className="rounded-lg p-5 bg-gradient-to-br from-orange-500/15 to-orange-500/5 border border-orange-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Sunrise className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-orange-300">Auto-Generated Warm-Up</h2>
              <p className="text-xs text-grappler-400">Personalized for every session</p>
            </div>
          </div>
          <p className="text-sm text-grappler-300">
            When you start a workout, the warm-up generator analyzes your exercises and builds a 4-phase protocol targeting the exact muscles and movement patterns you need.
          </p>
        </div>

        {/* Phases */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wide">4-Phase Protocol</h3>
          {PHASES.map((phase, i) => {
            const Icon = phase.icon;
            return (
              <div key={i} className={cn('rounded-xl p-4 border border-grappler-700/40', phase.bg)}>
                <div className="flex items-center gap-3 mb-2">
                  <Icon className={cn('w-5 h-5', phase.color)} />
                  <h4 className={cn('font-semibold text-sm', phase.color)}>{phase.title}</h4>
                </div>
                <p className="text-xs text-grappler-400">{phase.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Info */}
        <div className="rounded-xl p-3.5 bg-grappler-800/30 border border-grappler-700/30">
          <p className="text-xs text-grappler-400">
            The warm-up appears automatically at the top of your workout overview when you start a session. Tap each step to mark it done as you go.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
