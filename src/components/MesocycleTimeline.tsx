'use client';

import { cn } from '@/lib/utils';
import type { Mesocycle } from '@/lib/types';

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

