'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  X, Activity, TrendingUp, TrendingDown, AlertTriangle,
  Shield, Zap, BarChart3, Calendar, ChevronDown, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import {
  calculateEnhancedACWR,
  calculateIntensityHeatmap,
} from '@/lib/fatigue-metrics';

// ── ACWR Zone Config ─────────────────────────────────────────────────────

const ACWR_ZONES = [
  { min: 0, max: 0.8, label: 'Undertraining', color: 'blue', icon: TrendingDown, desc: 'Training load is below your baseline. Ramp up gradually to avoid detraining.', action: 'Add 1-2 sessions this week to build your chronic load.' },
  { min: 0.8, max: 1.3, label: 'Sweet Spot', color: 'green', icon: Shield, desc: 'Optimal load — injury risk is lowest here. Keep stacking quality sessions.', action: 'Stay the course — this is where gains happen safely.' },
  { min: 1.3, max: 1.5, label: 'Caution', color: 'yellow', icon: AlertTriangle, desc: 'Elevated load. You can push through short-term but watch for fatigue signals.', action: 'Monitor recovery closely. Consider an extra rest day if fatigued.' },
  { min: 1.5, max: 99, label: 'Danger Zone', color: 'red', icon: Zap, desc: 'High injury risk — load spiked too fast. Injury risk 2-4x higher (Gabbett 2016).', action: 'Reduce volume by 30-50% this week or take a deload.' },
];

function getACWRZone(ratio: number) {
  return ACWR_ZONES.find(z => ratio >= z.min && ratio < z.max) || ACWR_ZONES[3];
}

// Color helpers to avoid repetition
const ZONE_COLORS = {
  green:  { bg: 'bg-green-500/10', border: 'border-green-500/30', icon: 'bg-green-500/20', iconText: 'text-green-400', title: 'text-green-300', action: 'bg-green-500/15 text-green-300 border-green-500/30' },
  blue:   { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: 'bg-blue-500/20', iconText: 'text-blue-400', title: 'text-blue-300', action: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: 'bg-yellow-500/20', iconText: 'text-yellow-400', title: 'text-yellow-300', action: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' },
  red:    { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: 'bg-red-500/20', iconText: 'text-red-400', title: 'text-red-300', action: 'bg-red-500/15 text-red-300 border-red-500/30' },
};

// Day labels for heatmap
const HEATMAP_DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// ── Component ────────────────────────────────────────────────────────────

export default function TrainingLoadDashboard({ onClose }: { onClose: () => void }) {
  const workoutLogs = useAppStore(s => s.workoutLogs);
  const trainingSessions = useAppStore(s => s.trainingSessions ?? []);
  const [selectedHeatmapDay, setSelectedHeatmapDay] = useState<{ date: string; intensity: number; sessions: number } | null>(null);

  const acwr = useMemo(
    () => calculateEnhancedACWR(workoutLogs, trainingSessions),
    [workoutLogs, trainingSessions]
  );

  const heatmap = useMemo(
    () => calculateIntensityHeatmap(workoutLogs, trainingSessions, 28),
    [workoutLogs, trainingSessions]
  );

  const zone = getACWRZone(acwr.ratio);
  const ZoneIcon = zone.icon;
  const colors = ZONE_COLORS[zone.color as keyof typeof ZONE_COLORS] || ZONE_COLORS.blue;

  // Weekly load breakdown
  const weeklyLoads = useMemo(() => {
    const weeks: { label: string; load: number; weekLabel: string }[] = [];
    const now = Date.now();
    for (let w = 0; w < 4; w++) {
      const weekStart = now - (w + 1) * 7 * 86400000;
      const weekEnd = now - w * 7 * 86400000;
      let load = 0;
      const seenSlots = new Set<string>();
      // Sanitize duration: if >300 min (5h), assume stored in seconds
      const sanitize = (d: number) => d > 300 ? Math.round(d / 60) : d;
      workoutLogs.forEach(log => {
        const t = new Date(log.date).getTime();
        if (t >= weekStart && t < weekEnd) {
          const dur = sanitize(log.duration || 60);
          const slot = `${new Date(log.date).toDateString()}-${dur}`;
          seenSlots.add(slot);
          load += (log.overallRPE || 5) * dur;
        }
      });
      trainingSessions.forEach(s => {
        const t = new Date(s.date).getTime();
        if (t >= weekStart && t < weekEnd) {
          const dur = sanitize(s.duration || 60);
          const slot = `${new Date(s.date).toDateString()}-${dur}`;
          if (!seenSlots.has(slot)) {
            load += (s.perceivedExertion || 5) * dur;
          }
        }
      });
      weeks.push({
        label: w === 0 ? 'This week' : w === 1 ? 'Last week' : `${w + 1}wk ago`,
        weekLabel: `W${4 - w}`,
        load: Math.round(load),
      });
    }
    return weeks.reverse();
  }, [workoutLogs, trainingSessions]);

  const maxWeeklyLoad = Math.max(...weeklyLoads.map(w => w.load), 1);

  // Week-over-week delta
  const weekDelta = weeklyLoads.length >= 2
    ? weeklyLoads[weeklyLoads.length - 1].load - weeklyLoads[weeklyLoads.length - 2].load
    : 0;
  const weekDeltaPct = weeklyLoads.length >= 2 && weeklyLoads[weeklyLoads.length - 2].load > 0
    ? Math.round((weekDelta / weeklyLoads[weeklyLoads.length - 2].load) * 100)
    : 0;

  // ACWR bar: correctly proportioned zone bands for 0-2 scale
  // 0-0.8 = 40%, 0.8-1.3 = 25%, 1.3-1.5 = 10%, 1.5-2.0 = 25%
  const needlePosition = Math.min(100, (acwr.ratio / 2) * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-grappler-900 flex flex-col safe-area-top"
    >
      <header className="sticky top-0 z-10 bg-grappler-900/95 backdrop-blur-sm border-b border-grappler-800 px-3 py-2 flex items-center justify-between">
        <button onClick={onClose} className="p-1.5 -ml-1 text-grappler-400 hover:text-grappler-200">
          <X className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-bold text-grappler-50">Training Load</h1>
        <div className="w-8" />
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-3 pb-safe space-y-4">

        {/* ── ACWR Hero Card ── */}
        <div className={cn('rounded-xl p-3.5 border', colors.bg, colors.border)}>
          {/* Zone label + ratio */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', colors.icon)}>
                <ZoneIcon className={cn('w-4.5 h-4.5', colors.iconText)} />
              </div>
              <div>
                <h2 className={cn('text-sm font-bold leading-tight', colors.title)}>
                  {acwr.status === 'no_data' ? 'No Data' : zone.label}
                </h2>
                <p className="text-[10px] text-grappler-400">ACWR</p>
              </div>
            </div>
            <p className={cn('text-2xl font-black tabular-nums', colors.title)}>
              {acwr.ratio.toFixed(2)}
            </p>
          </div>

          {/* ACWR Zone Bar */}
          <div className="relative h-3 bg-grappler-800 rounded-full overflow-hidden mb-1">
            <div className="absolute inset-y-0 left-0 bg-blue-500/30" style={{ width: '40%' }} />
            <div className="absolute inset-y-0 bg-green-500/40" style={{ left: '40%', width: '25%' }} />
            <div className="absolute inset-y-0 bg-yellow-500/35" style={{ left: '65%', width: '10%' }} />
            <div className="absolute inset-y-0 right-0 bg-red-500/30" style={{ width: '25%' }} />
            {acwr.ratio > 0 && (
              <motion.div
                initial={{ left: '0%' }}
                animate={{ left: `${needlePosition}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="absolute top-[-1px] bottom-[-1px] w-1 -ml-[0.5px] rounded-full"
                style={{
                  background: 'white',
                  boxShadow: '0 0 6px rgba(255,255,255,0.5)',
                }}
              />
            )}
          </div>
          <div className="relative h-3.5 text-[10px] text-grappler-500 font-medium">
            <span className="absolute left-0">0</span>
            <span className="absolute" style={{ left: '40%', transform: 'translateX(-50%)' }}>0.8</span>
            <span className="absolute" style={{ left: '65%', transform: 'translateX(-50%)' }}>1.3</span>
            <span className="absolute" style={{ left: '75%', transform: 'translateX(-50%)' }}>1.5</span>
            <span className="absolute right-0">2.0</span>
          </div>

          {/* Actionable CTA */}
          <div className={cn('mt-2 rounded-lg px-2.5 py-1.5 border flex items-center gap-2', colors.action)}>
            <ArrowRight className="w-3 h-3 flex-shrink-0" />
            <p className="text-[11px] font-medium leading-snug">{zone.action}</p>
          </div>
        </div>

        {/* ── Acute vs Chronic + Delta ── */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="rounded-lg p-2.5 bg-grappler-800/50 border border-grappler-700/50 text-center">
            <p className="text-[10px] text-grappler-500 uppercase">7-day</p>
            <p className="text-base font-black text-grappler-100 tabular-nums">{acwr.acute.toLocaleString()}</p>
          </div>
          <div className="rounded-lg p-2.5 bg-grappler-800/50 border border-grappler-700/50 text-center">
            <p className="text-[10px] text-grappler-500 uppercase">28-day avg</p>
            <p className="text-base font-black text-grappler-100 tabular-nums">{acwr.chronic.toLocaleString()}</p>
          </div>
          <div className="rounded-lg p-2.5 bg-grappler-800/50 border border-grappler-700/50 text-center">
            <p className="text-[10px] text-grappler-500 uppercase">Week Δ</p>
            <p className={cn('text-base font-black tabular-nums',
              weekDelta > 0 ? 'text-amber-400' : weekDelta < 0 ? 'text-blue-400' : 'text-grappler-400'
            )}>
              {weekDelta > 0 ? '+' : ''}{weekDeltaPct}%
            </p>
          </div>
        </div>

        {/* ── Weekly Load Bars ── */}
        <div>
          <h3 className="text-[10px] font-semibold text-grappler-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <BarChart3 className="w-3 h-3" /> Weekly Load
          </h3>
          <div className="space-y-1.5">
            {weeklyLoads.map((week, i) => {
              const isThisWeek = i === weeklyLoads.length - 1;
              const loadPct = (week.load / maxWeeklyLoad) * 100;
              const barColor = isThisWeek
                ? (acwr.ratio >= 1.5 ? 'bg-red-500' : acwr.ratio >= 1.3 ? 'bg-yellow-500' : 'bg-primary-500')
                : 'bg-grappler-600';

              return (
                <div key={i} className="flex items-center gap-1.5">
                  <span className={cn('text-[11px] w-14 flex-shrink-0 tabular-nums', isThisWeek ? 'text-grappler-200 font-semibold' : 'text-grappler-500')}>
                    {week.label}
                  </span>
                  <div className="flex-1 h-6 bg-grappler-800/50 rounded-md overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${loadPct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.08 }}
                      className={cn('h-full rounded-md', barColor)}
                    />
                    {loadPct > 30 && (
                      <span className="absolute inset-y-0 flex items-center text-[11px] text-white/80 font-medium pl-2">
                        {week.load.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {loadPct <= 30 && (
                    <span className="text-[11px] text-grappler-500 w-10 text-right font-medium tabular-nums">
                      {week.load.toLocaleString()}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 28-Day Intensity Heatmap ── */}
        <div>
          <h3 className="text-[10px] font-semibold text-grappler-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Calendar className="w-3 h-3" /> 28-Day Intensity
          </h3>
          {/* Day-of-week labels */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {HEATMAP_DAY_LABELS.map((d, i) => (
              <span key={i} className="text-center text-[9px] text-grappler-600 font-medium">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {heatmap.slice(-28).map((day, i) => {
              const intensity = day.intensity;
              const isSelected = selectedHeatmapDay?.date === day.date;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedHeatmapDay(isSelected ? null : day)}
                  className={cn(
                    'aspect-square rounded-md transition-all relative',
                    intensity === 0 ? 'bg-grappler-800/40' :
                    intensity < 25 ? 'bg-green-500/25' :
                    intensity < 50 ? 'bg-green-500/50' :
                    intensity < 75 ? 'bg-yellow-500/50' :
                    'bg-red-500/50',
                    isSelected && 'ring-2 ring-white/60 ring-offset-1 ring-offset-grappler-900',
                  )}
                >
                  {/* Date number for context */}
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] text-grappler-300/60 font-medium tabular-nums">
                    {new Date(day.date).getDate()}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected day detail */}
          {selectedHeatmapDay && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2 rounded-lg bg-grappler-800/60 border border-grappler-700/40 px-3 py-2 flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-medium text-grappler-200">
                  {new Date(selectedHeatmapDay.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
                <p className="text-xs text-grappler-400">
                  {selectedHeatmapDay.sessions} session{selectedHeatmapDay.sessions !== 1 ? 's' : ''} · {selectedHeatmapDay.intensity}% intensity
                </p>
              </div>
              <button onClick={() => setSelectedHeatmapDay(null)} className="p-1 text-grappler-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-2 text-xs text-grappler-400">
            <span>Rest</span>
            <div className="w-3 h-3 rounded-sm bg-grappler-800/40" />
            <div className="w-3 h-3 rounded-sm bg-green-500/25" />
            <div className="w-3 h-3 rounded-sm bg-green-500/50" />
            <div className="w-3 h-3 rounded-sm bg-yellow-500/50" />
            <div className="w-3 h-3 rounded-sm bg-red-500/50" />
            <span>Max</span>
          </div>
        </div>

        {/* ── Science Note — collapsible ── */}
        <CollapsibleSection title="About ACWR" icon={<Activity className="w-4 h-4 text-grappler-500" />}>
          <p className="text-xs text-grappler-400 leading-relaxed">
            <span className="font-semibold text-grappler-300">Acute:Chronic Workload Ratio</span> compares your last 7 days
            of training load to your 28-day rolling average. Load = session RPE × duration in minutes (sRPE method).
          </p>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm bg-blue-500/40 flex-shrink-0" />
              <span className="text-xs text-grappler-400"><span className="text-blue-300 font-medium">0-0.8</span> — Undertraining. Load is too low to adapt.</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm bg-green-500/40 flex-shrink-0" />
              <span className="text-xs text-grappler-400"><span className="text-green-300 font-medium">0.8-1.3</span> — Sweet spot. Lowest injury risk.</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm bg-yellow-500/40 flex-shrink-0" />
              <span className="text-xs text-grappler-400"><span className="text-yellow-300 font-medium">1.3-1.5</span> — Caution. Tolerable short-term.</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm bg-red-500/40 flex-shrink-0" />
              <span className="text-xs text-grappler-400"><span className="text-red-300 font-medium">&gt;1.5</span> — Danger. Injury risk 2-4× higher (Gabbett 2016).</span>
            </div>
          </div>
        </CollapsibleSection>

      </div>
    </motion.div>
  );
}

// ── Collapsible helper ───────────────────────────────────────────────────

function CollapsibleSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl bg-grappler-800/30 border border-grappler-700/30 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 p-3.5 text-left hover:bg-grappler-800/20 transition-colors"
      >
        {icon}
        <span className="text-xs font-medium text-grappler-300 flex-1">{title}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-3.5 h-3.5 text-grappler-500" />
        </motion.span>
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-3.5 pb-3.5"
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}
