'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  X, Activity, TrendingUp, TrendingDown, AlertTriangle,
  Shield, Zap, BarChart3, Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import {
  calculateEnhancedACWR,
  calculateIntensityHeatmap,
  type EnhancedACWR,
  type IntensityDay,
} from '@/lib/fatigue-metrics';

// ── ACWR Zone Config ─────────────────────────────────────────────────────

const ACWR_ZONES = [
  { min: 0, max: 0.8, label: 'Undertraining', color: 'blue', icon: TrendingDown, desc: 'Training load is below your baseline. Ramp up gradually to avoid detraining.' },
  { min: 0.8, max: 1.3, label: 'Sweet Spot', color: 'green', icon: Shield, desc: 'Optimal load — injury risk is lowest here. Keep stacking quality sessions.' },
  { min: 1.3, max: 1.5, label: 'Caution', color: 'yellow', icon: AlertTriangle, desc: 'Elevated load. You can push through short-term but watch for fatigue signals.' },
  { min: 1.5, max: 99, label: 'Danger Zone', color: 'red', icon: Zap, desc: 'High injury risk. Consider a deload or drop volume this week.' },
];

function getACWRZone(ratio: number) {
  return ACWR_ZONES.find(z => ratio >= z.min && ratio < z.max) || ACWR_ZONES[3];
}

// ── Component ────────────────────────────────────────────────────────────

export default function TrainingLoadDashboard({ onClose }: { onClose: () => void }) {
  const workoutLogs = useAppStore(s => s.workoutLogs);
  const trainingSessions = useAppStore(s => s.trainingSessions ?? []);

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

  // Weekly load breakdown
  const weeklyLoads = useMemo(() => {
    const weeks: { label: string; load: number }[] = [];
    const now = Date.now();
    for (let w = 0; w < 4; w++) {
      const weekStart = now - (w + 1) * 7 * 86400000;
      const weekEnd = now - w * 7 * 86400000;
      let load = 0;
      workoutLogs.forEach(log => {
        const t = new Date(log.date).getTime();
        if (t >= weekStart && t < weekEnd) {
          load += (log.overallRPE || 5) * (log.duration || 60);
        }
      });
      trainingSessions.forEach(s => {
        const t = new Date(s.date).getTime();
        if (t >= weekStart && t < weekEnd) {
          load += (s.perceivedExertion || 5) * (s.duration || 60);
        }
      });
      weeks.push({
        label: w === 0 ? 'This week' : w === 1 ? 'Last week' : `${w + 1} weeks ago`,
        load: Math.round(load),
      });
    }
    return weeks.reverse();
  }, [workoutLogs, trainingSessions]);

  const maxWeeklyLoad = Math.max(...weeklyLoads.map(w => w.load), 1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-grappler-900 flex flex-col"
    >
      <header className="sticky top-0 z-10 bg-grappler-900/95 backdrop-blur-sm border-b border-grappler-800 p-4 flex items-center justify-between safe-area-top">
        <button onClick={onClose} className="btn btn-ghost btn-sm">
          <X className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-grappler-50">Training Load</h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-5">

        {/* ACWR Gauge */}
        <div className={cn(
          'rounded-2xl p-5 border',
          zone.color === 'green' ? 'bg-green-500/10 border-green-500/30' :
          zone.color === 'blue' ? 'bg-blue-500/10 border-blue-500/30' :
          zone.color === 'yellow' ? 'bg-yellow-500/10 border-yellow-500/30' :
          'bg-red-500/10 border-red-500/30'
        )}>
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              zone.color === 'green' ? 'bg-green-500/20' :
              zone.color === 'blue' ? 'bg-blue-500/20' :
              zone.color === 'yellow' ? 'bg-yellow-500/20' :
              'bg-red-500/20'
            )}>
              <ZoneIcon className={cn(
                'w-6 h-6',
                zone.color === 'green' ? 'text-green-400' :
                zone.color === 'blue' ? 'text-blue-400' :
                zone.color === 'yellow' ? 'text-yellow-400' :
                'text-red-400'
              )} />
            </div>
            <div>
              <h2 className={cn(
                'text-lg font-bold',
                zone.color === 'green' ? 'text-green-300' :
                zone.color === 'blue' ? 'text-blue-300' :
                zone.color === 'yellow' ? 'text-yellow-300' :
                'text-red-300'
              )}>
                {acwr.status === 'no_data' ? 'No Data' : zone.label}
              </h2>
              <p className="text-xs text-grappler-400">
                ACWR: {acwr.ratio.toFixed(2)}
              </p>
            </div>
          </div>

          {/* ACWR Bar */}
          <div className="relative h-3 bg-grappler-800 rounded-full overflow-hidden mb-2">
            {/* Zone bands */}
            <div className="absolute inset-y-0 left-0 bg-blue-500/30" style={{ width: '27%' }} />
            <div className="absolute inset-y-0 bg-green-500/30" style={{ left: '27%', width: '36%' }} />
            <div className="absolute inset-y-0 bg-yellow-500/30" style={{ left: '63%', width: '14%' }} />
            <div className="absolute inset-y-0 right-0 bg-red-500/30" style={{ width: '23%' }} />
            {/* Needle */}
            {acwr.ratio > 0 && (
              <motion.div
                initial={{ left: '0%' }}
                animate={{ left: `${Math.min(100, (acwr.ratio / 2) * 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="absolute top-0 bottom-0 w-1 bg-white rounded-full shadow-lg shadow-white/30"
              />
            )}
          </div>
          <div className="flex justify-between text-xs text-grappler-400">
            <span>0</span>
            <span>0.8</span>
            <span>1.3</span>
            <span>1.5</span>
            <span>2.0</span>
          </div>

          <p className="text-xs text-grappler-400 mt-3">{zone.desc}</p>
        </div>

        {/* Load Numbers */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3.5 bg-grappler-800/50 border border-grappler-700/50">
            <p className="text-xs text-grappler-400 uppercase tracking-wide">Acute (7-day)</p>
            <p className="text-xl font-bold text-grappler-100 mt-1">{acwr.acute.toLocaleString()}</p>
            <p className="text-xs text-grappler-400">sRPE units</p>
          </div>
          <div className="rounded-xl p-3.5 bg-grappler-800/50 border border-grappler-700/50">
            <p className="text-xs text-grappler-400 uppercase tracking-wide">Chronic (weekly avg)</p>
            <p className="text-xl font-bold text-grappler-100 mt-1">{acwr.chronic.toLocaleString()}</p>
            <p className="text-xs text-grappler-400">sRPE units</p>
          </div>
        </div>

        {/* Weekly Load Bar Chart */}
        <div>
          <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> Weekly Load (4 weeks)
          </h3>
          <div className="space-y-2">
            {weeklyLoads.map((week, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[11px] text-grappler-400 w-24 flex-shrink-0">{week.label}</span>
                <div className="flex-1 h-6 bg-grappler-800/50 rounded-lg overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(week.load / maxWeeklyLoad) * 100}%` }}
                    transition={{ duration: 0.6, delay: i * 0.1 }}
                    className={cn(
                      'h-full rounded-lg',
                      i === weeklyLoads.length - 1 ? 'bg-primary-500' : 'bg-grappler-600'
                    )}
                  />
                </div>
                <span className="text-xs text-grappler-400 w-14 text-right font-medium">
                  {week.load.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 28-Day Intensity Heatmap */}
        <div>
          <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> 28-Day Intensity
          </h3>
          <div className="grid grid-cols-7 gap-1">
            {heatmap.slice(-28).map((day, i) => {
              const intensity = day.intensity;
              return (
                <div
                  key={i}
                  className={cn(
                    'aspect-square rounded-sm transition-colors',
                    intensity === 0 ? 'bg-grappler-800/40' :
                    intensity < 25 ? 'bg-green-500/20' :
                    intensity < 50 ? 'bg-green-500/40' :
                    intensity < 75 ? 'bg-yellow-500/40' :
                    'bg-red-500/40'
                  )}
                  title={`${day.date}: ${intensity}% intensity, ${day.sessions} session${day.sessions !== 1 ? 's' : ''}`}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-grappler-400">
            <span>Less</span>
            <div className="w-3 h-3 rounded-sm bg-grappler-800/40" />
            <div className="w-3 h-3 rounded-sm bg-green-500/20" />
            <div className="w-3 h-3 rounded-sm bg-green-500/40" />
            <div className="w-3 h-3 rounded-sm bg-yellow-500/40" />
            <div className="w-3 h-3 rounded-sm bg-red-500/40" />
            <span>More</span>
          </div>
        </div>

        {/* Science Note */}
        <div className="rounded-xl p-3.5 bg-grappler-800/30 border border-grappler-700/30">
          <div className="flex items-start gap-2">
            <Activity className="w-4 h-4 text-grappler-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-grappler-300">About ACWR</p>
              <p className="text-[11px] text-grappler-400 mt-1">
                Acute:Chronic Workload Ratio compares your last 7 days of training to your 28-day average.
                The sweet spot (0.8-1.3) means you&apos;re progressing safely. Above 1.5 means you&apos;ve spiked load
                too fast — injury risk increases 2-4x (Gabbett 2016).
              </p>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
