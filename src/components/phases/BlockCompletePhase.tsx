'use client';

import { motion } from 'framer-motion';
import { Trophy, BarChart3, Zap, ChevronRight, Target } from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import type { OverlayView } from '../dashboard-types';

interface BlockCompletePhaseProps {
  currentMesocycle: { id: string; name: string };
  mesocycleProgress: { total: number; completed: number; percent: number };
  mesocycleComparison: {
    prevName: string;
    sessions: { current: number; prev: number };
    avgVolume: { current: number; prev: number; delta: number };
    avgRPE: { current: number; prev: number };
  } | null;
  mesocycleQueue: { name: string; weeks: number; periodization?: string }[];
  weightUnit: string;
  onViewReport: (mesoId: string) => void;
  onGenerateNext: () => void;
  onNavigate: (view: OverlayView) => void;
}

export default function BlockCompletePhase({
  currentMesocycle,
  mesocycleProgress,
  mesocycleComparison,
  mesocycleQueue,
  weightUnit,
  onViewReport,
  onGenerateNext,
  onNavigate,
}: BlockCompletePhaseProps) {
  return (
    <motion.div
      key="zone2-block-complete"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden border border-primary-500/20 bg-gradient-to-br from-primary-500/10 via-grappler-800 to-accent-500/5"
    >
      {/* Trophy header */}
      <div className="pt-6 pb-3 text-center relative">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 border border-primary-500/20 flex items-center justify-center mx-auto mb-3">
          <Trophy className="w-8 h-8 text-primary-400" />
        </div>
        <h3 className="text-lg font-black text-grappler-50">Block Complete</h3>
        <p className="text-xs text-grappler-400 mt-1">
          All {mesocycleProgress.total} sessions in <span className="text-grappler-200 font-medium">{currentMesocycle.name}</span> done
        </p>
      </div>

      {/* Stats comparison grid */}
      {mesocycleComparison && (
        <div className="mx-5 mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-grappler-400 mb-2">vs {mesocycleComparison.prevName}</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-grappler-900/50 border border-grappler-700/40 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-grappler-100">{mesocycleComparison.sessions.current}</p>
              <p className="text-xs text-grappler-400 uppercase">Sessions</p>
            </div>
            <div className="bg-grappler-900/50 border border-grappler-700/40 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-grappler-100">{formatNumber(mesocycleComparison.avgVolume.current)}</p>
              <p className="text-xs text-grappler-400 uppercase">Avg Vol</p>
              <p className={cn('text-xs font-bold mt-0.5', mesocycleComparison.avgVolume.delta > 0 ? 'text-green-400' : mesocycleComparison.avgVolume.delta < 0 ? 'text-red-400' : 'text-grappler-400')}>
                {mesocycleComparison.avgVolume.delta > 0 ? '+' : ''}{formatNumber(mesocycleComparison.avgVolume.delta)}
              </p>
            </div>
            <div className="bg-grappler-900/50 border border-grappler-700/40 rounded-xl p-3 text-center">
              <p className="text-lg font-black text-grappler-100">{mesocycleComparison.avgRPE.current}</p>
              <p className="text-xs text-grappler-400 uppercase">Avg RPE</p>
            </div>
          </div>
        </div>
      )}

      {/* Next block preview */}
      {mesocycleQueue.length > 0 && (
        <div className="mx-5 mb-4 bg-grappler-900/40 border border-grappler-700/40 rounded-xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-500/15 flex items-center justify-center flex-shrink-0">
            <ChevronRight className="w-5 h-5 text-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-grappler-400 font-bold uppercase tracking-wide">Up next</p>
            <p className="text-sm font-bold text-primary-300 truncate">{mesocycleQueue[0].name}</p>
            <p className="text-xs text-grappler-400">{mesocycleQueue[0].weeks} weeks · {mesocycleQueue[0].periodization || 'auto'}</p>
          </div>
        </div>
      )}

      {/* CTAs */}
      <div className="px-5 pb-5 flex items-center gap-2">
        <button
          onClick={() => onViewReport(currentMesocycle.id)}
          className="btn btn-md gap-2 bg-grappler-700 text-grappler-200 hover:bg-grappler-600 flex-1"
        >
          <BarChart3 className="w-4 h-4" />
          Report
        </button>
        {mesocycleQueue.length > 0 ? (
          <button
            onClick={onGenerateNext}
            className="btn btn-primary btn-md gap-2 flex-1"
          >
            <Zap className="w-4 h-4" />
            Start Next
          </button>
        ) : (
          <button
            onClick={() => onNavigate('program_browser')}
            className="btn btn-primary btn-md gap-2 flex-1"
          >
            <Target className="w-4 h-4" />
            Browse Programs
          </button>
        )}
      </div>
    </motion.div>
  );
}
