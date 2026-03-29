'use client';

import { cn } from '@/lib/utils';

interface ReadinessRingProps {
  score: number; // 0-100
  size?: number; // px, default 64
  strokeWidth?: number; // default 6 (compact) or 8 (hero)
  /** Color mode: 'auto' picks from score, 'white' for light-on-dark cards */
  mode?: 'auto' | 'white';
  /** Display variant: 'compact' for inline, 'hero' for centerpiece */
  variant?: 'compact' | 'hero';
  onClick?: () => void;
  className?: string;
}

const RING_LEVELS = {
  peak:     { stroke: 'stroke-green-400',  text: 'text-green-400',  word: 'SEND IT', glow: 'shadow-[0_0_20px_rgba(74,222,128,0.25)]', gradFrom: '#4ade80', gradTo: '#6ee7b7' },
  good:     { stroke: 'stroke-green-400',  text: 'text-green-400',  word: 'GO',      glow: 'shadow-[0_0_20px_rgba(74,222,128,0.25)]', gradFrom: '#4ade80', gradTo: '#6ee7b7' },
  moderate: { stroke: 'stroke-yellow-400', text: 'text-yellow-400', word: 'EASY',    glow: 'shadow-[0_0_20px_rgba(250,204,21,0.2)]',  gradFrom: '#facc15', gradTo: '#fde047' },
  low:      { stroke: 'stroke-amber-500',  text: 'text-amber-500',  word: 'LIGHT',   glow: 'shadow-[0_0_20px_rgba(245,158,11,0.2)]',  gradFrom: '#f59e0b', gradTo: '#fbbf24' },
  critical: { stroke: 'stroke-red-500',    text: 'text-red-500',    word: 'REST',    glow: 'shadow-[0_0_20px_rgba(239,68,68,0.25)]',  gradFrom: '#ef4444', gradTo: '#f87171' },
} as const;

function getLevel(score: number): keyof typeof RING_LEVELS {
  if (score >= 85) return 'peak';
  if (score >= 70) return 'good';
  if (score >= 50) return 'moderate';
  if (score >= 30) return 'low';
  return 'critical';
}

export default function ReadinessRing({
  score,
  size = 64,
  strokeWidth,
  mode = 'auto',
  variant = 'compact',
  onClick,
  className,
}: ReadinessRingProps) {
  const isHero = variant === 'hero';
  const sw = strokeWidth ?? (isHero ? 8 : 6);
  const radius = (size - sw) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score));
  const offset = circumference - (progress / 100) * circumference;
  const level = getLevel(score);
  const config = RING_LEVELS[level];
  const isPeak = level === 'peak' || level === 'good';
  const isWhite = mode === 'white';

  // Unique gradient ID per instance (avoids SVG ID collisions)
  const gradientId = `ring-grad-${level}`;

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex-shrink-0 group rounded-full',
        // Breathing animation for peak/good
        isPeak && !isWhite && 'animate-ring-breathe',
        // Glow effect
        !isWhite && config.glow,
        className,
      )}
      style={{ width: size, height: size }}
      aria-label={`Readiness ${score} — ${config.word}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={config.gradFrom} />
            <stop offset="100%" stopColor={config.gradTo} />
          </linearGradient>
        </defs>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={sw}
          className={isWhite ? 'stroke-white/20' : 'stroke-grappler-700/60'}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={sw}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke={isWhite ? undefined : `url(#${gradientId})`}
          className={cn(
            'transition-all duration-700',
            isWhite && 'stroke-white/90',
          )}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center group-hover:opacity-80 transition-opacity">
        {isHero && !isWhite ? (
          <>
            <span className={cn(
              'font-bold uppercase tracking-widest leading-none text-sm',
              config.text,
            )}>
              {config.word}
            </span>
            <span className={cn(
              'font-black leading-none mt-1 text-4xl tabular-nums',
              config.text,
            )}>
              {score}
            </span>
          </>
        ) : (
          <>
            <span className={cn(
              'font-black leading-none tracking-tight',
              isWhite ? 'text-white' : config.text,
              config.word.length > 4 ? 'text-[9px]' : 'text-[11px]',
            )}>
              {isWhite ? score : config.word}
            </span>
            {!isWhite && (
              <span className="text-[9px] font-bold text-grappler-500 mt-0.5 tabular-nums">{score}</span>
            )}
          </>
        )}
      </div>
    </button>
  );
}
