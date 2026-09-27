'use client';

import { useMemo } from 'react';
import { Activity } from 'lucide-react';
import type { WorkoutLog } from '@/lib/types';
import { liftWhoopInsight } from '@/lib/whoop-training';
import { cn } from '@/lib/utils';

/**
 * Whoop numbers for one lifting session: strain, HR, calories, strain per
 * tonne vs your usual, and the RPE your heart rate suggests vs what you logged.
 * Renders nothing until the session is linked to a Whoop workout.
 */
export default function WhoopLiftStats({ log, allLogs }: { log: WorkoutLog; allLogs: WorkoutLog[] }) {
  const insight = useMemo(() => liftWhoopInsight(log, allLogs), [log, allLogs]);
  if (!insight) return null;

  const { vsUsualPct, rpeGap } = insight;
  const usualNote = vsUsualPct == null ? null
    : Math.abs(vsUsualPct) < 10 ? 'about your usual'
    : vsUsualPct > 0 ? `${vsUsualPct}% above your usual` : `${Math.abs(vsUsualPct)}% below your usual`;
  const rpeNote = rpeGap == null || Math.abs(rpeGap) < 1.5 ? null
    : rpeGap > 0
      ? `You logged RPE ${log.overallRPE}, your heart rate says ~${insight.hrRPE} — the effort was more muscular/neural than cardio, or fatigue is building.`
      : `You logged RPE ${log.overallRPE}, your heart rate says ~${insight.hrRPE} — it cost more than it felt.`;

  return (
    <div className="bg-grappler-800/50 rounded-lg px-3 py-2.5 space-y-2" data-testid="whoop-lift-stats">
      <div className="flex items-center gap-1.5">
        <Activity className="w-3.5 h-3.5 text-primary-400" />
        <span className="text-xs font-medium text-grappler-300">Whoop</span>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <Stat label="Strain" value={insight.strain.toFixed(1)} />
        <Stat label="Avg HR" value={insight.avgHR ? String(insight.avgHR) : '–'} />
        <Stat label="Max HR" value={insight.maxHR ? String(insight.maxHR) : '–'} />
        <Stat label="kcal" value={insight.calories ? String(insight.calories) : '–'} />
      </div>
      {insight.strainPerTonne != null && (
        <p className="text-xs text-grappler-400">
          {insight.strainPerTonne} strain per 1,000 kg lifted
          {usualNote && (
            <span className={cn(
              'ml-1',
              vsUsualPct != null && vsUsualPct >= 15 ? 'text-yellow-400' :
              vsUsualPct != null && vsUsualPct <= -15 ? 'text-green-400' : 'text-grappler-400',
            )}>· {usualNote}</span>
          )}
        </p>
      )}
      {rpeNote && <p className="text-xs text-grappler-400">{rpeNote}</p>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-grappler-200 text-sm font-medium">{value}</div>
      <div className="text-[11px] text-grappler-500">{label}</div>
    </div>
  );
}
