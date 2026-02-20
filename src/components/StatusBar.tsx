'use client';

import { cn } from '@/lib/utils';
import { Flame } from 'lucide-react';
import type { ReadinessLevel } from '@/lib/types';

interface StatusBarProps {
  readinessScore: number;
  readinessLevel: ReadinessLevel;
  streak: number;
  /** Block position label, e.g. "W2/D3" or "Deload" or "Block Complete" */
  blockPosition: string | null;
  /** Fight camp or cycle phase tag, e.g. "Peak · 12d out" */
  phaseTag: string | null;
  /** Weekly training progress: done / target */
  weekProgress?: { done: number; target: number } | null;
  onReadinessTap: () => void;
}

const DOT_COLORS: Record<ReadinessLevel, string> = {
  peak: 'bg-green-400',
  good: 'bg-green-400',
  moderate: 'bg-yellow-400',
  low: 'bg-amber-500',
  critical: 'bg-red-500',
};

const SCORE_COLORS: Record<ReadinessLevel, string> = {
  peak: 'text-green-400',
  good: 'text-green-400',
  moderate: 'text-yellow-400',
  low: 'text-amber-500',
  critical: 'text-red-500',
};

export default function StatusBar({
  readinessScore,
  readinessLevel,
  streak,
  blockPosition,
  phaseTag,
  weekProgress,
  onReadinessTap,
}: StatusBarProps) {
  return (
    <div className="flex items-center gap-2.5 px-1 py-1.5">
      {/* Readiness — tappable */}
      <button
        onClick={onReadinessTap}
        className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
        aria-label={`Readiness ${readinessScore}, tap for details`}
      >
        <div className={cn('w-2 h-2 rounded-full', DOT_COLORS[readinessLevel])} />
        <span className={cn('text-sm font-black tabular-nums', SCORE_COLORS[readinessLevel])}>
          {readinessScore}
        </span>
      </button>

      {/* Divider */}
      <span className="text-grappler-700">·</span>

      {/* Streak — only when ≥2 */}
      {streak >= 2 && (
        <div className="flex items-center gap-1 text-orange-400">
          <Flame className="w-3.5 h-3.5" />
          <span className="text-xs font-bold tabular-nums">{streak}d</span>
        </div>
      )}

      {/* Block position */}
      {blockPosition && (
        <span className="text-xs font-medium text-grappler-400 tabular-nums">{blockPosition}</span>
      )}

      {/* Spacer pushes right-side items */}
      <div className="flex-1" />

      {/* Week progress mini-bar */}
      {weekProgress && weekProgress.target > 0 && (
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {Array.from({ length: weekProgress.target }, (_, i) => (
              <div
                key={i}
                className={cn(
                  'w-1.5 h-3 rounded-sm transition-colors',
                  i < weekProgress.done ? 'bg-primary-400' : 'bg-grappler-700'
                )}
              />
            ))}
          </div>
          <span className="text-xs text-grappler-400 tabular-nums">{weekProgress.done}/{weekProgress.target}</span>
        </div>
      )}

      {/* Phase tag — fight camp, cycle, etc. */}
      {phaseTag && (
        <span className="text-xs font-medium text-grappler-400 truncate max-w-[120px]">{phaseTag}</span>
      )}
    </div>
  );
}
