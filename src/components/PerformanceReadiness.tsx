'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, Droplets, Scale, Moon, Zap, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { calculateReadiness, type ReadinessScore } from '@/lib/nudge-engine';
import { calculateAdherence } from '@/lib/diet-coach';
import { getEffectiveTier, hasFeatureAccess } from '@/lib/subscription';
import { useSession } from 'next-auth/react';

const COMPONENT_ICONS: Record<string, React.ReactNode> = {
  nutrition: <Activity className="w-3.5 h-3.5" />,
  hydration: <Droplets className="w-3.5 h-3.5" />,
  weight: <Scale className="w-3.5 h-3.5" />,
  recovery: <Moon className="w-3.5 h-3.5" />,
  energy: <Zap className="w-3.5 h-3.5" />,
};

const COMPONENT_LABELS: Record<string, string> = {
  nutrition: 'Nutrition',
  hydration: 'Hydration',
  weight: 'Weight',
  recovery: 'Recovery',
  energy: 'Energy',
};

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

export default function PerformanceReadiness() {
  const {
    meals, macroTargets, waterLog, bodyWeightLog, latestWhoopData,
    activeDietPhase, quickLogs, subscription,
  } = useAppStore();
  const { data: session } = useSession();

  const effectiveTier = getEffectiveTier(subscription, session?.user?.email);
  const hasFullAccess = hasFeatureAccess('performance-readiness', effectiveTier);

  const readiness = useMemo((): ReadinessScore => {
    // Calculate today's intake
    const today = new Date().toISOString().split('T')[0];
    const todayMeals = meals.filter(m => new Date(m.date).toISOString().split('T')[0] === today);
    const caloriesLogged = todayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
    const proteinLogged = todayMeals.reduce((sum, m) => sum + (m.protein || 0), 0);

    const calorieAdherence = macroTargets.calories > 0
      ? Math.min(100, (caloriesLogged / macroTargets.calories) * 100)
      : 0;
    const proteinAdherence = macroTargets.protein > 0
      ? Math.min(100, (proteinLogged / macroTargets.protein) * 100)
      : 0;

    // Water tracking
    const todayWater = waterLog[today] || 0;
    const waterTarget = 10; // ~10 glasses default
    const waterRatio = Math.min(1, todayWater / waterTarget);

    // Weight trend
    const onWeightTarget = !activeDietPhase || true; // simplified
    const weeksAtPlateau = 0; // would need analyzeWeightTrend

    // Recovery
    const whoopRecovery = latestWhoopData?.recoveryScore ?? undefined;
    const todaySleepLog = quickLogs.find(
      l => l.type === 'sleep' && new Date(l.timestamp).toISOString().split('T')[0] === today
    );
    const sleepHours = latestWhoopData?.sleepHours || (todaySleepLog?.value ? Number(todaySleepLog.value) * 2 : undefined);

    return calculateReadiness({
      calorieAdherence,
      proteinAdherence,
      mealsLoggedToday: todayMeals.length,
      waterRatio,
      onWeightTarget,
      weeksAtPlateau,
      whoopRecovery,
      sleepHours,
    });
  }, [meals, macroTargets, waterLog, latestWhoopData, activeDietPhase, quickLogs]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-3"
    >
      {/* Score header */}
      <div className="flex items-center gap-3 mb-3">
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black',
          readiness.level === 'ready' ? 'bg-green-500/20 text-green-400' :
          readiness.level === 'needs_attention' ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-red-500/20 text-red-400'
        )}>
          {readiness.score}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-grappler-100">Performance Readiness</p>
          <p className="text-xs text-grappler-400">
            {readiness.level === 'ready' ? 'Looking good — ready to perform' :
             readiness.level === 'needs_attention' ? 'Some areas need attention' :
             'At risk — take action'}
          </p>
          <p className="text-xs text-grappler-600 mt-0.5">
            nutrition + hydration + sleep + weight
          </p>
        </div>
        <TrendingUp className={cn('w-5 h-5', getScoreColor(readiness.score))} />
      </div>

      {/* Component bars — Pro feature */}
      {hasFullAccess ? (
        <div className="space-y-1.5">
          {(Object.keys(readiness.components) as (keyof typeof readiness.components)[]).map((key) => {
            const value = readiness.components[key];
            return (
              <div key={key} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 w-20 text-grappler-400">
                  {COMPONENT_ICONS[key]}
                  <span className="text-xs">{COMPONENT_LABELS[key]}</span>
                </div>
                <div className="flex-1 h-1.5 bg-grappler-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className={cn('h-full rounded-full', getScoreBg(value))}
                  />
                </div>
                <span className={cn('text-xs font-medium w-7 text-right', getScoreColor(value))}>
                  {value}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-1 p-2 bg-grappler-800/30 rounded-lg border border-grappler-700/50">
          <p className="text-xs text-grappler-500 text-center">
            Upgrade to Pro for component breakdown and action items
          </p>
        </div>
      )}

      {/* Bottleneck + action */}
      {hasFullAccess && readiness.level !== 'ready' && (
        <div className="mt-2.5 p-2 bg-grappler-800/40 rounded-lg">
          <div className="flex items-start gap-1.5">
            <AlertTriangle className={cn('w-3.5 h-3.5 mt-0.5 flex-shrink-0',
              readiness.level === 'at_risk' ? 'text-red-400' : 'text-yellow-400'
            )} />
            <div>
              <p className="text-xs text-grappler-300 font-medium">{readiness.bottleneck}</p>
              <p className="text-xs text-grappler-500">{readiness.actionItem}</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
