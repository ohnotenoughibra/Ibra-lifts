'use client';

import { motion } from 'framer-motion';
import {
  X, Battery, ArrowDown, Shield, Zap, Moon, Activity, Clock, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const LEVELS = [
  {
    level: 'Peak Day',
    range: '85-100',
    color: 'emerald',
    icon: Zap,
    volume: '+5%',
    rpe: '10',
    rest: 'Normal',
    isolation: 'Kept',
    note: 'PR attempts unlocked. Your body is primed — send it.',
  },
  {
    level: 'All Systems Go',
    range: '70-84',
    color: 'green',
    icon: Shield,
    volume: 'Normal',
    rpe: '10',
    rest: 'Normal',
    isolation: 'Kept',
    note: 'Follow the program as prescribed. No modifications needed.',
  },
  {
    level: 'Throttled',
    range: '50-69',
    color: 'yellow',
    icon: ArrowDown,
    volume: '-15%',
    rpe: '7 cap',
    rest: '+20%',
    isolation: 'Kept',
    note: 'Some recovery factors are low. Quality over ego today.',
  },
  {
    level: 'Low Power',
    range: '30-49',
    color: 'orange',
    icon: AlertTriangle,
    volume: '-30%',
    rpe: '6 cap',
    rest: '+40%',
    isolation: 'Dropped',
    note: 'Compounds only. Focus on movement quality, not destruction.',
  },
  {
    level: 'Recovery Mode',
    range: '<30',
    color: 'red',
    icon: Moon,
    volume: '-60%',
    rpe: '5 cap',
    rest: '+50%',
    isolation: 'Dropped',
    note: 'Light technique work only. Consider a full rest day.',
  },
];

const colorMap: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: 'text-emerald-400' },
  green: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', icon: 'text-green-400' },
  yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', icon: 'text-yellow-400' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', icon: 'text-orange-400' },
  red: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: 'text-red-400' },
};

export default function AutoThrottleInfo({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-grappler-900 flex flex-col"
    >
      <header className="sticky top-0 z-10 bg-grappler-900/95 backdrop-blur-sm border-b border-grappler-800 p-4 flex items-center justify-between safe-area-top">
        <button onClick={onClose} className="btn btn-ghost btn-sm">
          <X className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-grappler-50">Readiness Auto-Throttle</h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-4">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Battery className="w-7 h-7 text-cyan-400" />
          </div>
          <p className="text-sm text-grappler-400 max-w-xs mx-auto">
            Your workout automatically scales based on readiness. Sleep, stress, nutrition, recovery, HRV, and soreness all factor in.
          </p>
        </div>

        <h2 className="text-xs font-semibold text-grappler-400 uppercase tracking-wide">How It Works</h2>
        <div className="space-y-2">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-grappler-800/50">
            <span className="text-sm font-bold text-grappler-300 mt-0.5">1.</span>
            <p className="text-sm text-grappler-300">Complete your pre-workout check-in (feeling, sleep, soreness)</p>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-xl bg-grappler-800/50">
            <span className="text-sm font-bold text-grappler-300 mt-0.5">2.</span>
            <p className="text-sm text-grappler-300">Your readiness score is calculated from 10 factors (Whoop data used if connected)</p>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-xl bg-grappler-800/50">
            <span className="text-sm font-bold text-grappler-300 mt-0.5">3.</span>
            <p className="text-sm text-grappler-300">Sets, RPE, rest periods, and exercises are automatically adjusted before you start</p>
          </div>
        </div>

        <h2 className="text-xs font-semibold text-grappler-400 uppercase tracking-wide pt-2">Throttle Levels</h2>
        <div className="space-y-3">
          {LEVELS.map((l) => {
            const c = colorMap[l.color];
            const Icon = l.icon;
            return (
              <div key={l.level} className={cn('rounded-xl p-3.5 border', c.bg, c.border)}>
                <div className="flex items-center gap-2.5 mb-2">
                  <Icon className={cn('w-4 h-4', c.icon)} />
                  <span className={cn('text-sm font-bold', c.text)}>{l.level}</span>
                  <span className="text-xs text-grappler-400 ml-auto">Score {l.range}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  <div>
                    <p className="text-xs text-grappler-400 uppercase">Volume</p>
                    <p className="text-xs font-medium text-grappler-300">{l.volume}</p>
                  </div>
                  <div>
                    <p className="text-xs text-grappler-400 uppercase">RPE</p>
                    <p className="text-xs font-medium text-grappler-300">{l.rpe}</p>
                  </div>
                  <div>
                    <p className="text-xs text-grappler-400 uppercase">Rest</p>
                    <p className="text-xs font-medium text-grappler-300">{l.rest}</p>
                  </div>
                  <div>
                    <p className="text-xs text-grappler-400 uppercase">Isolation</p>
                    <p className="text-xs font-medium text-grappler-300">{l.isolation}</p>
                  </div>
                </div>
                <p className="text-xs text-grappler-400">{l.note}</p>
              </div>
            );
          })}
        </div>

        <h2 className="text-xs font-semibold text-grappler-400 uppercase tracking-wide pt-2">Readiness Factors</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Moon, label: 'Sleep', weight: '20%' },
            { icon: Activity, label: 'Recovery', weight: '14%' },
            { icon: Activity, label: 'Nutrition', weight: '14%' },
            { icon: Activity, label: 'Training Load', weight: '11%' },
            { icon: Activity, label: 'Stress', weight: '11%' },
            { icon: Shield, label: 'Injury', weight: '9%' },
            { icon: Zap, label: 'Soreness', weight: '8%' },
            { icon: Clock, label: 'Age', weight: '5%' },
            { icon: Activity, label: 'HRV', weight: '4%' },
            { icon: Activity, label: 'Hydration', weight: '4%' },
          ].map(f => (
            <div key={f.label} className="flex items-center gap-2 p-2.5 rounded-lg bg-grappler-800/40">
              <f.icon className="w-3.5 h-3.5 text-grappler-500" />
              <span className="text-xs text-grappler-300 flex-1">{f.label}</span>
              <span className="text-xs text-grappler-400">{f.weight}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
