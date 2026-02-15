'use client';

import { cn } from '@/lib/utils';

interface ReadinessRingProps {
  score: number; // 0-100
  size?: number; // px, default 52
  strokeWidth?: number; // default 3.5
  /** Color mode: 'auto' picks from score, 'white' for light-on-dark cards */
  mode?: 'auto' | 'white';
  onClick?: () => void;
  className?: string;
}

const RING_COLORS = {
  peak:     { stroke: 'stroke-green-400',  text: 'text-green-400' },
  good:     { stroke: 'stroke-green-400',  text: 'text-green-400' },
  moderate: { stroke: 'stroke-yellow-400', text: 'text-yellow-400' },
  low:      { stroke: 'stroke-amber-500',  text: 'text-amber-500' },
  critical: { stroke: 'stroke-red-500',    text: 'text-red-500' },
} as const;

function getLevel(score: number): keyof typeof RING_COLORS {
  if (score >= 80) return 'peak';
  if (score >= 65) return 'good';
  if (score >= 40) return 'moderate';
  if (score >= 20) return 'low';
  return 'critical';
}

export default function ReadinessRing({ score, size = 52, strokeWidth = 3.5, mode = 'auto', onClick, className }: ReadinessRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score));
  const offset = circumference - (progress / 100) * circumference;
  const level = getLevel(score);
  const colors = RING_COLORS[level];

  const isWhite = mode === 'white';

  return (
    <button
      onClick={onClick}
      className={cn('relative flex-shrink-0 group', className)}
      style={{ width: size, height: size }}
      aria-label={`Readiness ${score}%`}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={isWhite ? 'stroke-white/20' : 'stroke-grappler-700/60'}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(
            'transition-all duration-700',
            isWhite ? 'stroke-white/90' : colors.stroke
          )}
        />
      </svg>
      {/* Score */}
      <div className="absolute inset-0 flex flex-col items-center justify-center group-hover:opacity-80 transition-opacity">
        <span className={cn(
          'text-sm font-black leading-none',
          isWhite ? 'text-white' : colors.text,
        )}>{score}</span>
        <span className={cn(
          'text-[7px] mt-0.5',
          isWhite ? 'text-white/50' : 'text-grappler-600',
        )}>▾</span>
      </div>
    </button>
  );
}
