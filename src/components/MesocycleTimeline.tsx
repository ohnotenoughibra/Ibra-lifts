'use client';

import { useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Zap, Heart, Flame, Shield, Target, Layers,
  Check, TrendingUp, TrendingDown, Minus, ChevronRight, Brain,
  Dumbbell, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Mesocycle, BlockFocus, BlockSuggestion, GoalFocus } from '@/lib/types';

// ── Block Focus Visual Mapping ────────────────────────────────────────

const FOCUS_CONFIG: Record<string, {
  label: string;
  icon: typeof Zap;
  color: string;
  bg: string;
  border: string;
  ring: string;
}> = {
  strength:      { label: 'Strength',  icon: Zap,    color: 'text-red-400',    bg: 'bg-red-500/15',    border: 'border-red-500/30',    ring: 'ring-red-500/40' },
  hypertrophy:   { label: 'Hypertrophy', icon: Heart, color: 'text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-500/30', ring: 'ring-purple-500/40' },
  power:         { label: 'Power',     icon: Flame,  color: 'text-blue-400',   bg: 'bg-blue-500/15',   border: 'border-blue-500/30',   ring: 'ring-blue-500/40' },
  balanced:      { label: 'Balanced',  icon: Layers, color: 'text-amber-400',  bg: 'bg-amber-500/15',  border: 'border-amber-500/30',  ring: 'ring-amber-500/40' },
  deload:        { label: 'Deload',    icon: Shield, color: 'text-green-400',  bg: 'bg-green-500/15',  border: 'border-green-500/30',  ring: 'ring-green-500/40' },
  peaking:       { label: 'Peaking',   icon: Target, color: 'text-amber-400',  bg: 'bg-amber-500/15',  border: 'border-amber-500/30',  ring: 'ring-amber-500/40' },
  base_building: { label: 'Base',      icon: Layers, color: 'text-teal-400',   bg: 'bg-teal-500/15',   border: 'border-teal-500/30',   ring: 'ring-teal-500/40' },
};

function getFocusConfig(focus: string) {
  return FOCUS_CONFIG[focus] || FOCUS_CONFIG.balanced;
}

// ── Block Timeline ────────────────────────────────────────────────────

interface BlockTimelineProps {
  history: Mesocycle[];
  current: Mesocycle | null;
  suggestion: BlockSuggestion | null;
  currentProgress: number; // 0-100
  daysToCompetition?: number | null; // fight countdown for combat athletes
  onAcceptSuggestion?: () => void;
  onBlockClick?: (block: Mesocycle) => void; // Tap completed/active blocks to view details
}

export function BlockTimeline({ history, current, suggestion, currentProgress, daysToCompetition, onAcceptSuggestion, onBlockClick }: BlockTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active block on mount
  useEffect(() => {
    if (scrollRef.current) {
      const active = scrollRef.current.querySelector('[data-active="true"]');
      if (active) {
        active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, []);

  // Show only last 4 history blocks to keep timeline compact
  const visibleHistory = history.slice(-4);

  if (!current && visibleHistory.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wider">Training Journey</h3>
        <div className="flex items-center gap-3">
          {daysToCompetition != null && daysToCompetition > 0 && (
            <span className={cn(
              'text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
              daysToCompetition <= 7 ? 'bg-red-500/20 text-red-400' :
              daysToCompetition <= 21 ? 'bg-amber-500/20 text-amber-400' :
              'bg-blue-500/20 text-blue-400'
            )}>
              {daysToCompetition <= 7 ? `${daysToCompetition}d to fight` :
               `${Math.ceil(daysToCompetition / 7)}w to fight`}
            </span>
          )}
          <span className="text-xs text-grappler-500">{history.length} block{history.length !== 1 ? 's' : ''} completed</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex items-stretch gap-2 overflow-x-auto no-scrollbar pb-1 px-0.5">
        {/* Completed blocks */}
        {visibleHistory.map((block, i) => {
          const config = getFocusConfig(block.goalFocus);
          const Icon = config.icon;
          const totalSessions = block.weeks.reduce((s, w) => s + w.sessions.length, 0);
          return (
            <button
              key={block.id}
              onClick={() => onBlockClick?.(block)}
              className={cn(
                'flex-shrink-0 w-24 rounded-xl p-2.5 border transition-all text-left',
                'bg-grappler-800/60 border-grappler-700/50 opacity-70',
                onBlockClick && 'active:scale-95 hover:opacity-90 cursor-pointer'
              )}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className={cn('w-5 h-5 rounded-md flex items-center justify-center', config.bg)}>
                  <Icon className={cn('w-3 h-3', config.color)} />
                </div>
                <Check className="w-3 h-3 text-green-400" />
              </div>
              <p className={cn('text-xs font-semibold truncate', config.color)}>{config.label}</p>
              <p className="text-xs text-grappler-500">{block.weeks.length}w · {totalSessions}s</p>
            </button>
          );
        })}

        {/* Connector */}
        {visibleHistory.length > 0 && current && (
          <div className="flex items-center flex-shrink-0 -mx-0.5">
            <div className="w-4 h-px bg-grappler-600" />
          </div>
        )}

        {/* Active block */}
        {current && (() => {
          const config = getFocusConfig(current.goalFocus);
          const Icon = config.icon;
          const totalSessions = current.weeks.reduce((s, w) => s + w.sessions.length, 0);
          return (
            <button
              data-active="true"
              onClick={() => onBlockClick?.(current)}
              className={cn(
                'flex-shrink-0 w-28 rounded-xl p-2.5 border-2 transition-all ring-2 text-left',
                config.border, config.ring, 'bg-grappler-800',
                onBlockClick && 'active:scale-95 cursor-pointer'
              )}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className={cn('w-5 h-5 rounded-md flex items-center justify-center', config.bg)}>
                  <Icon className={cn('w-3 h-3', config.color)} />
                </div>
                <span className="text-xs font-bold text-primary-400 uppercase">Active</span>
              </div>
              <p className={cn('text-xs font-bold truncate', config.color)}>{config.label}</p>
              <p className="text-xs text-grappler-400">{current.weeks.length}w · {totalSessions}s</p>
              {/* Mini progress bar */}
              <div className="mt-1.5 h-1 bg-grappler-700 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-500',
                    currentProgress >= 100 ? 'bg-green-400' : 'bg-primary-400'
                  )}
                  style={{ width: `${Math.min(100, currentProgress)}%` }}
                />
              </div>
              <p className="text-xs text-grappler-500 mt-0.5">{currentProgress}%</p>
            </button>
          );
        })()}

        {/* Connector to suggestion */}
        {suggestion && (
          <div className="flex items-center flex-shrink-0 -mx-0.5">
            <div className="w-2 h-px bg-grappler-600" />
            <ChevronRight className="w-3 h-3 text-grappler-500" />
          </div>
        )}

        {/* AI-suggested next block */}
        {suggestion && (() => {
          const config = getFocusConfig(suggestion.recommendedFocus);
          const Icon = config.icon;
          return (
            <button
              onClick={onAcceptSuggestion}
              className={cn(
                'flex-shrink-0 w-28 rounded-xl p-2.5 border border-dashed transition-all',
                'border-grappler-600 bg-grappler-850 hover:border-grappler-500 hover:bg-grappler-800',
                'text-left'
              )}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className={cn('w-5 h-5 rounded-md flex items-center justify-center bg-grappler-700')}>
                  <Brain className="w-3 h-3 text-grappler-400" />
                </div>
                <span className="text-xs font-bold text-grappler-400 uppercase">Next</span>
              </div>
              <p className={cn('text-xs font-semibold truncate', config.color)}>{config.label}</p>
              <p className="text-xs text-grappler-500">{suggestion.suggestedWeeks}w · {suggestion.confidence}% sure</p>
            </button>
          );
        })()}
      </div>
    </div>
  );
}

// ── Volume Wave Chart ─────────────────────────────────────────────────

// ── Phase Label Helper ────────────────────────────────────────────────
// Determines training phase name based on position in mesocycle wave
function getPhaseLabel(weekIndex: number, totalWeeks: number, isDeload: boolean, volume: number, maxVol: number): string {
  if (isDeload) return 'Deload';
  // Last non-deload week with high intensity = intensification
  const ratio = volume / maxVol;
  const position = weekIndex / (totalWeeks - 1);
  if (position >= 0.7 && ratio >= 0.9) return 'Peak';
  if (position >= 0.5) return 'Intensification';
  return 'Accumulation';
}

interface VolumeWaveProps {
  weeks: Mesocycle['weeks'];
  currentWeekIndex: number; // -1 if all done
  completedSessionIds: Set<string>;
}

export function VolumeWave({ weeks, currentWeekIndex, completedSessionIds }: VolumeWaveProps) {
  if (weeks.length < 2) return null;

  const width = 280;
  const height = 56; // taller to fit phase labels
  const padding = { top: 12, bottom: 14, left: 8, right: 8 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Build data points: volume multiplier per week
  const data = weeks.map((w, i) => ({
    volume: w.volumeMultiplier,
    intensity: w.intensityMultiplier,
    isDeload: w.isDeload,
    weekNum: w.weekNumber,
    isCurrent: i === currentWeekIndex,
    completedCount: w.sessions.filter(s => completedSessionIds.has(s.id)).length,
    totalSessions: w.sessions.length,
  }));

  const maxVol = Math.max(...data.map(d => d.volume), 1);

  // X positions
  const xStep = chartW / (data.length - 1 || 1);
  const points = data.map((d, i) => ({
    x: padding.left + i * xStep,
    y: padding.top + chartH - (d.volume / maxVol) * chartH,
    ...d,
  }));

  // Build smooth path
  const linePath = points.map((p, i) =>
    i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`
  ).join(' ');

  // Area path (fill under line)
  const areaPath = `${linePath} L${points[points.length - 1].x},${padding.top + chartH} L${points[0].x},${padding.top + chartH} Z`;

  // Determine current phase label
  const currentPhase = currentWeekIndex >= 0
    ? getPhaseLabel(currentWeekIndex, data.length, data[currentWeekIndex].isDeload, data[currentWeekIndex].volume, maxVol)
    : 'Complete';

  const phaseColor = currentPhase === 'Deload' ? 'text-green-400' :
    currentPhase === 'Peak' ? 'text-amber-400' :
    currentPhase === 'Intensification' ? 'text-red-400' :
    currentPhase === 'Accumulation' ? 'text-primary-400' : 'text-grappler-400';

  return (
    <div className="px-1">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-grappler-500 uppercase tracking-wider font-medium">Volume Wave</span>
          {currentWeekIndex >= 0 && (
            <span className={cn('text-xs font-bold uppercase tracking-wider', phaseColor)}>
              {currentPhase}
            </span>
          )}
        </div>
        <span className="text-xs text-grappler-500">
          {currentWeekIndex >= 0 ? `Week ${currentWeekIndex + 1} of ${weeks.length}` : 'Complete'}
        </span>
      </div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {/* Grid lines */}
        <line x1={padding.left} y1={padding.top + chartH} x2={width - padding.right} y2={padding.top + chartH} stroke="currentColor" strokeWidth="0.5" className="text-grappler-700" />

        {/* Area fill */}
        <path d={areaPath} fill="url(#volumeGradient)" opacity="0.3" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="url(#lineGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Week markers */}
        {points.map((p, i) => {
          const allDone = p.completedCount === p.totalSessions && p.totalSessions > 0;
          return (
            <g key={i}>
              {/* Vertical highlight for current week */}
              {p.isCurrent && (
                <rect
                  x={p.x - xStep * 0.4}
                  y={padding.top - 2}
                  width={xStep * 0.8}
                  height={chartH + 4}
                  rx={3}
                  fill="currentColor"
                  className="text-primary-500/10"
                />
              )}

              {/* Dot */}
              <circle
                cx={p.x}
                cy={p.y}
                r={p.isCurrent ? 4 : 2.5}
                fill={p.isDeload ? '#4ade80' : allDone ? '#4ade80' : p.isCurrent ? '#818cf8' : '#6b7280'}
                stroke={p.isCurrent ? '#818cf8' : 'none'}
                strokeWidth={p.isCurrent ? 2 : 0}
              />

              {/* Week label */}
              <text
                x={p.x}
                y={height - 2}
                textAnchor="middle"
                className={cn(
                  'text-[8px] font-medium',
                  p.isCurrent ? 'fill-primary-400' : p.isDeload ? 'fill-green-400' : 'fill-grappler-500'
                )}
              >
                {p.isDeload ? 'DL' : `W${p.weekNum}`}
              </text>
            </g>
          );
        })}

        {/* Gradients */}
        <defs>
          <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="80%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#4ade80" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// ── AI Coach Insight ──────────────────────────────────────────────────

interface AICoachInsightProps {
  suggestion: BlockSuggestion;
  onAccept: () => void;
  compact?: boolean;
}

export function AICoachInsight({ suggestion, onAccept, compact }: AICoachInsightProps) {
  const config = getFocusConfig(suggestion.recommendedFocus);
  const Icon = config.icon;

  const trendIcon = (trend: 'up' | 'down' | 'stable') =>
    trend === 'up' ? <TrendingUp className="w-3 h-3 text-green-400" /> :
    trend === 'down' ? <TrendingDown className="w-3 h-3 text-red-400" /> :
    <Minus className="w-3 h-3 text-grappler-400" />;

  if (compact) {
    return (
      <button
        onClick={onAccept}
        className="w-full card p-3 border border-dashed border-grappler-600 hover:border-grappler-500 transition-all text-left"
      >
        <div className="flex items-center gap-3">
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', config.bg)}>
            <Brain className={cn('w-4 h-4', config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-grappler-400">AI recommends next</p>
            <p className={cn('text-sm font-bold', config.color)}>{config.label} · {suggestion.suggestedWeeks} weeks</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-grappler-400">{suggestion.confidence}%</p>
            <p className="text-xs text-grappler-500">confidence</p>
          </div>
          <ChevronRight className="w-4 h-4 text-grappler-500 flex-shrink-0" />
        </div>
        {suggestion.reasoning.length > 0 && (
          <p className="text-xs text-grappler-400 mt-2 line-clamp-1">{suggestion.reasoning[0]}</p>
        )}
      </button>
    );
  }

  return (
    <div className="card p-4 border border-grappler-700 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', config.bg)}>
          <Brain className={cn('w-5 h-5', config.color)} />
        </div>
        <div className="flex-1">
          <p className="text-xs text-grappler-400 font-medium">Next Block Analysis</p>
          <div className="flex items-center gap-2">
            <p className={cn('text-base font-bold', config.color)}>{config.label}</p>
            <span className="text-xs text-grappler-500">·</span>
            <span className="text-xs text-grappler-400">{suggestion.suggestedWeeks} weeks</span>
            <span className="text-xs text-grappler-500">·</span>
            <span className="text-xs text-grappler-400">{suggestion.confidence}% confidence</span>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      {suggestion.keyMetrics.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {suggestion.keyMetrics.slice(0, 4).map((m, i) => (
            <div key={i} className="flex items-center gap-2 bg-grappler-800/50 rounded-lg px-2.5 py-1.5">
              {trendIcon(m.trend)}
              <div className="min-w-0">
                <p className="text-xs text-grappler-500 truncate">{m.label}</p>
                <p className="text-xs font-semibold text-grappler-200">{m.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reasoning */}
      <div className="space-y-1">
        {suggestion.reasoning.slice(0, 3).map((r, i) => (
          <p key={i} className="text-xs text-grappler-300 flex items-start gap-2">
            <span className="text-grappler-500 mt-0.5 flex-shrink-0">•</span>
            {r}
          </p>
        ))}
      </div>

      {/* Weak/Strong points */}
      {(suggestion.weakPoints.length > 0 || suggestion.strongPoints.length > 0) && (
        <div className="flex items-center gap-3 text-xs">
          {suggestion.weakPoints.length > 0 && (
            <span className="text-grappler-400">
              <AlertTriangle className="w-3 h-3 text-amber-400 inline mr-1" />
              {suggestion.weakPoints.slice(0, 3).map(m => m.replace(/_/g, ' ')).join(', ')}
            </span>
          )}
          {suggestion.strongPoints.length > 0 && (
            <span className="text-grappler-400">
              <TrendingUp className="w-3 h-3 text-green-400 inline mr-1" />
              {suggestion.strongPoints.slice(0, 3).map(m => m.replace(/_/g, ' ')).join(', ')}
            </span>
          )}
        </div>
      )}

      {/* Alternative */}
      {suggestion.alternativeFocus && suggestion.alternativeReason && (
        <p className="text-xs text-grappler-500 italic">
          Alt: {getFocusConfig(suggestion.alternativeFocus).label} — {suggestion.alternativeReason}
        </p>
      )}

      {/* CTA */}
      <button
        onClick={onAccept}
        className="btn btn-primary btn-sm w-full gap-2 font-semibold"
      >
        <Dumbbell className="w-3.5 h-3.5" />
        Generate {config.label} Block
      </button>
    </div>
  );
}
