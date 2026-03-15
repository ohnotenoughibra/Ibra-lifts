'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Droplets, Scale, Moon, Zap, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn, toLocalDateStr} from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { calculateReadiness, type ReadinessScore } from '@/lib/nudge-engine';
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

const COMPONENT_EXPLAINERS: Record<string, { what: string; action: string }> = {
  nutrition: {
    what: 'Calorie & protein adherence today. Under-fuelling cuts strength and recovery.',
    action: 'Hit your protein target across 3-4 meals. Log everything.',
  },
  hydration: {
    what: 'Water intake vs your daily target. 2% dehydration = measurable strength loss.',
    action: 'Drink a glass now. Aim for 8-10 glasses spread through the day.',
  },
  weight: {
    what: 'Body weight trend relative to your goal. Plateau detection included.',
    action: 'Weigh in consistently (morning, fasted). One reading per week minimum.',
  },
  recovery: {
    what: 'Sleep quality and wearable recovery data. Poor sleep = 4× injury risk.',
    action: 'Aim for 7-9h tonight. Log sleep if no wearable connected.',
  },
  energy: {
    what: 'Energy availability — are you eating enough to fuel training and recovery?',
    action: 'Don\'t cut calories too aggressively. Minimum 30 kcal/kg lean mass.',
  },
};

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-blue-400';
  return 'text-red-400';
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-blue-500';
  return 'bg-red-500';
}

function getScoreDot(score: number): string {
  if (score >= 80) return 'bg-green-400';
  if (score >= 60) return 'bg-yellow-400';
  if (score >= 40) return 'bg-blue-400';
  return 'bg-red-400';
}

export default function PerformanceReadiness() {
  const {
    meals, macroTargets, waterLog, bodyWeightLog, latestWhoopData,
    activeDietPhase, quickLogs, subscription,
  } = useAppStore();
  const { data: session } = useSession();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [expandedFactor, setExpandedFactor] = useState<string | null>(null);

  const effectiveTier = getEffectiveTier(subscription, session?.user?.email);
  const hasFullAccess = hasFeatureAccess('performance-readiness', effectiveTier);

  const readiness = useMemo((): ReadinessScore => {
    const now = new Date();
    const hourOfDay = now.getHours();

    // Calculate today's intake
    const today = toLocalDateStr(now);
    const todayMeals = meals.filter(m => toLocalDateStr(m.date) === today);
    const caloriesLogged = todayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
    const proteinLogged = todayMeals.reduce((sum, m) => sum + (m.protein || 0), 0);

    const calorieAdherence = macroTargets.calories > 0
      ? Math.min(100, (caloriesLogged / macroTargets.calories) * 100)
      : 0;
    const proteinAdherence = macroTargets.protein > 0
      ? Math.min(100, (proteinLogged / macroTargets.protein) * 100)
      : 0;

    // Yesterday's data for morning carry-forward
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toLocalDateStr(yesterday);
    const yesterdayMeals = meals.filter(m => toLocalDateStr(m.date) === yesterdayStr);
    const yesterdayCals = yesterdayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
    const yesterdayPro = yesterdayMeals.reduce((sum, m) => sum + (m.protein || 0), 0);
    const yesterdayCalorieAdherence = macroTargets.calories > 0
      ? Math.min(100, (yesterdayCals / macroTargets.calories) * 100) : undefined;
    const yesterdayProteinAdherence = macroTargets.protein > 0
      ? Math.min(100, (yesterdayPro / macroTargets.protein) * 100) : undefined;

    // Water tracking
    const todayWater = waterLog[today] || 0;
    const waterTarget = 10; // ~10 glasses default
    const waterRatio = Math.min(1, todayWater / waterTarget);
    const yesterdayWater = waterLog[yesterdayStr] || 0;
    const yesterdayWaterRatio = Math.min(1, yesterdayWater / waterTarget);

    // Weight trend
    const onWeightTarget = !activeDietPhase || true; // simplified
    const weeksAtPlateau = 0; // would need analyzeWeightTrend

    // Recovery
    const whoopRecovery = latestWhoopData?.recoveryScore ?? undefined;
    const todaySleepLog = quickLogs.find(
      l => l.type === 'sleep' && toLocalDateStr(l.timestamp) === today
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
      hourOfDay,
      yesterdayCalorieAdherence,
      yesterdayProteinAdherence,
      yesterdayWaterRatio: yesterdayWaterRatio || undefined,
    });
  }, [meals, macroTargets, waterLog, latestWhoopData, activeDietPhase, quickLogs]);

  const levelLabel =
    readiness.level === 'ready' ? 'Ready' :
    readiness.level === 'needs_attention' ? 'Attention' : 'At Risk';

  return (
    <div className="card overflow-hidden">
      <div className="px-3 pt-3 pb-1">
        {/* Header — tappable to toggle details */}
        <button
          onClick={() => { setDetailsOpen(v => !v); if (detailsOpen) setExpandedFactor(null); }}
          className="w-full flex items-center justify-between group"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-grappler-400" />
            <span className="text-sm font-semibold text-grappler-100">Performance Score</span>
            <span className={cn(
              'text-xs font-medium px-1.5 py-0.5 rounded-full bg-grappler-700/60',
              getScoreColor(readiness.score)
            )}>
              {levelLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className={cn('w-2 h-2 rounded-full', getScoreDot(readiness.score))} />
              <span className={cn('text-lg font-bold', getScoreColor(readiness.score))}>{readiness.score}</span>
              <span className="text-xs text-grappler-400 font-medium">/100</span>
            </div>
            <span className="text-xs text-grappler-600 group-hover:text-grappler-400 transition-colors ml-1">
              {detailsOpen ? '▴' : '▾'}
            </span>
          </div>
        </button>

        {/* Subline — always visible */}
        <p className="text-xs text-grappler-400 mt-1 ml-6">
          {(() => {
            const hour = new Date().getHours();
            const isEarlyMorning = hour < 10;
            const todayStr = toLocalDateStr();
            const noDataYet = meals.filter(m => toLocalDateStr(m.date) === todayStr).length === 0
              && !(waterLog[todayStr]);
            if (isEarlyMorning && noDataYet) {
              return 'Morning check-in — log meals & water to update';
            }
            return readiness.level === 'ready' ? 'Looking good — ready to perform' :
              readiness.level === 'needs_attention' ? 'Some areas need attention' :
              'At risk — take action';
          })()}
        </p>

        {/* Collapsible factor details */}
        <AnimatePresence>
          {detailsOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              {hasFullAccess ? (
                <div className="space-y-1 pt-3 pb-1">
                  {(Object.keys(readiness.components) as (keyof typeof readiness.components)[]).map((key) => {
                    const value = readiness.components[key];
                    const explainer = COMPONENT_EXPLAINERS[key];
                    const isExpanded = expandedFactor === key;

                    return (
                      <div key={key}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedFactor(isExpanded ? null : key); }}
                          className="w-full group"
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1.5 w-20 text-left text-grappler-400 group-hover:text-grappler-200 transition-colors">
                              {COMPONENT_ICONS[key]}
                              <span className="text-xs truncate">{COMPONENT_LABELS[key]}</span>
                            </span>
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-grappler-700/40">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.max(3, value)}%` }}
                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                className={cn('h-full rounded-full', getScoreBg(value))}
                              />
                            </div>
                            <span className={cn(
                              'text-xs font-mono w-6 text-right',
                              getScoreColor(value)
                            )}>
                              {value}
                            </span>
                          </div>
                        </button>

                        {/* Per-factor explainer */}
                        <AnimatePresence>
                          {isExpanded && explainer && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.15 }}
                              className="overflow-hidden"
                            >
                              <div className="ml-20 pl-2.5 mt-1 mb-1.5 border-l border-grappler-700/60 space-y-0.5">
                                <p className="text-xs text-grappler-400">{explainer.what}</p>
                                <p className="text-xs text-primary-400">{explainer.action}</p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-3 p-2 bg-grappler-800/30 rounded-lg border border-grappler-700/50">
                  <p className="text-xs text-grappler-400 text-center">
                    Upgrade to Pro for component breakdown and action items
                  </p>
                </div>
              )}

              {/* Bottleneck + action */}
              {hasFullAccess && readiness.level !== 'ready' && (
                <div className="mt-2 mb-1 p-2 bg-grappler-800/40 rounded-lg">
                  <div className="flex items-start gap-1.5">
                    <AlertTriangle className={cn('w-3.5 h-3.5 mt-0.5 flex-shrink-0',
                      readiness.level === 'at_risk' ? 'text-red-400' : 'text-yellow-400'
                    )} />
                    <div>
                      <p className="text-xs text-grappler-300 font-medium">{readiness.bottleneck}</p>
                      <p className="text-xs text-grappler-400">{readiness.actionItem}</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
