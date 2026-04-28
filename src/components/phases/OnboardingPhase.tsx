'use client';

import { motion } from 'framer-motion';
import { Brain, Zap } from 'lucide-react';
import type { OverlayView } from '../dashboard-types';

interface OnboardingPhaseProps {
  onNavigate: (view: OverlayView) => void;
  onQuickWorkout: () => void;
}

export default function OnboardingPhase({
  onNavigate,
  onQuickWorkout,
}: OnboardingPhaseProps) {
  return (
    <motion.div
      key="zone2-onboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-grappler-800 bg-grappler-900/40 p-6"
    >
      {/* Editorial heading — no gradient, no glow */}
      <div className="mb-5">
        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-grappler-500 mb-2">
          No program yet
        </div>
        <h2 className="font-display text-3xl font-black tracking-tight leading-none text-white mb-2">
          Build your<br />program.
        </h2>
        <p className="text-sm text-grappler-400 leading-relaxed">
          Periodized training around your schedule, experience, and goals. ~30 seconds.
        </p>
      </div>

      <div className="h-px bg-grappler-800 mb-5" />

      {/* Primary CTA */}
      <button
        onClick={() => onNavigate('program_browser')}
        className="w-full py-3.5 rounded-lg font-bold text-white text-sm flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-400 active:scale-[0.98] transition-all mb-3"
      >
        <Brain className="w-5 h-5" />
        Create Program
      </button>

      {/* Secondary actions */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <button onClick={onQuickWorkout} className="py-1.5 text-xs text-grappler-400 hover:text-grappler-200 transition-colors flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5" /> Quick 30m
        </button>
        <span className="text-grappler-700">·</span>
        <button onClick={() => onNavigate('builder')} className="py-1.5 text-xs text-grappler-400 hover:text-grappler-200 transition-colors">
          Custom
        </button>
        <span className="text-grappler-700">·</span>
        <button onClick={() => onNavigate('injury_aware_workout')} className="py-1.5 text-xs text-amber-400/80 hover:text-amber-300 transition-colors">
          Injury-aware
        </button>
      </div>
    </motion.div>
  );
}
