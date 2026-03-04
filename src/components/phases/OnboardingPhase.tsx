'use client';

import { motion } from 'framer-motion';
import { Dumbbell, Brain, Zap } from 'lucide-react';
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
      className="rounded-2xl overflow-hidden border border-grappler-700/50 bg-gradient-to-br from-grappler-800 via-grappler-850 to-primary-950/10"
    >
      {/* Welcome hero */}
      <div className="pt-8 pb-5 px-5 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 border border-primary-500/15 flex items-center justify-center mx-auto mb-4">
          <Dumbbell className="w-8 h-8 text-primary-400" />
        </div>
        <h2 className="text-lg font-black text-grappler-50">Ready to build your program?</h2>
        <p className="text-xs text-grappler-400 mt-2 leading-relaxed max-w-[280px] mx-auto">
          AI-generated periodized training built around your schedule, experience, and goals. Takes about 30 seconds.
        </p>
      </div>

      {/* Feature preview pills */}
      <div className="flex items-center justify-center gap-2 px-5 pb-4 flex-wrap">
        <span className="text-xs text-grappler-400 px-2.5 py-1 rounded-full bg-grappler-800/60 border border-grappler-700/50">Auto-periodization</span>
        <span className="text-xs text-grappler-400 px-2.5 py-1 rounded-full bg-grappler-800/60 border border-grappler-700/50">Progressive overload</span>
        <span className="text-xs text-grappler-400 px-2.5 py-1 rounded-full bg-grappler-800/60 border border-grappler-700/50">Deload timing</span>
      </div>

      {/* CTAs */}
      <div className="px-5 pb-6 space-y-2">
        <button
          onClick={() => onNavigate('block_suggestion')}
          className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 shadow-lg shadow-primary-500/20 active:scale-[0.98] transition-transform"
        >
          <Brain className="w-5 h-5" />
          Create Program
        </button>
        <button
          onClick={onQuickWorkout}
          className="w-full py-2.5 rounded-xl text-xs font-medium text-grappler-400 hover:text-grappler-200 flex items-center justify-center gap-1.5 transition-colors"
        >
          <Zap className="w-3.5 h-3.5" />
          Or just do a quick 30-minute workout
        </button>
      </div>
    </motion.div>
  );
}
