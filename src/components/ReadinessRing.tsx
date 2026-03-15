'use client';

import { cn } from '@/lib/utils';

interface ReadinessRingProps {
  score: number; // 0-100
  size?: number; // px, default 64
  strokeWidth?: number; // default 4.5
  /** Color mode: 'auto' picks from score, 'white' for light-on-dark cards */
  mode?: 'auto' | 'white';
  onClick?: () => void;
  className?: string;
}

const RING_LEVELS = {
  peak:     { stroke: 'stroke-green-400',  text: 'text-green-400',  word: 'SEND IT' },
  good:     { stroke: 'stroke-green-400',  text: 'text-green-400',  word: 'GO' },
  moderate: { stroke: 'stroke-yellow-400', text: 'text-yellow-400', word: 'EASY' },
  low:      { stroke: 'stroke-amber-500',  text: 'text-amber-500',  word: 'LIGHT' },
  critical: { stroke: 'stroke-red-500',    text: 'text-red-500',    word: 'REST' },
} as const;

function getLevel(score: number): keyof typeof RING_LEVELS {
  if (score >= 85) return 'peak';
  if (score >= 70) return 'good';
  if (score >= 50) return 'moderate';
  if (score >= 30) return 'low';
  return 'critical';
}

export default function ReadinessRing({ score, size = 64, strokeWidth = 4.5, mode = 'auto', onClick, className }: ReadinessRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score));
  const offset = circumference - (progress / 100) * circumference;
  const level = getLevel(score);
  const config = RING_LEVELS[level];
  const isPeak = level === 'peak' || level === 'good';

  const isWhite = mode === 'white';

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex-shrink-0 group rounded-full',
        isPeak && !isWhite && 'ring-pulse',
        className,
      )}
      style={{ width: size, height: size }}
      aria-label={`Readiness ${score} — ${config.word}`}
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
            isWhite ? 'stroke-white/90' : config.stroke
          )}
        />
      </svg>
      {/* Action word + score */}
      <div className="absolute inset-0 flex flex-col items-center justify-center group-hover:opacity-80 transition-opacity">
        <span className={cn(
          'font-black leading-none tracking-tight',
          isWhite ? 'text-white' : config.text,
          config.word.length > 5 ? 'text-[8px]' : config.word.length > 4 ? 'text-[10px]' : 'text-[11px]',
        )}>{isWhite ? score : config.word}</span>
        {!isWhite && (
          <span className="text-[9px] font-bold text-grappler-500 mt-0.5 tabular-nums">{score}</span>
        )}
      </div>
    </button>
  );
}
