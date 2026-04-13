'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell,
  Shield,
  Clock,
  Droplets,
  Zap,
  ChevronDown,
  ChevronUp,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import DietCoach from '@/components/DietCoach';
import SupplementTracker from '@/components/SupplementTracker';
import NutritionTrends from '@/components/NutritionTrends';
import type { useNutrition } from '@/hooks/useNutrition';

interface NutritionCoachProps {
  nutrition: ReturnType<typeof useNutrition>;
}

export default function NutritionCoach({ nutrition }: NutritionCoachProps) {
  const {
    contextualNutrition,
    supplements,
    electrolyteInfo,
    intraFuel,
    hydrationStatus,
    collagenNudge,
    trainingDuration,
    allMeals,
    macroTargets,
  } = nutrition;

  const [showContextual, setShowContextual] = useState(false);
  const [showTrends, setShowTrends] = useState(false);
  const [coachTab, setCoachTab] = useState<'diet' | 'supplements' | 'trends'>('diet');

  const dayLabel = contextualNutrition.dayType === 'grappling_hard' ? 'Hard Grappling Day'
    : contextualNutrition.dayType === 'grappling_light' ? 'Light Grappling Day'
    : contextualNutrition.dayType === 'strength' ? 'Strength Training Day'
    : contextualNutrition.dayType === 'hypertrophy' ? 'Hypertrophy Training Day'
    : contextualNutrition.dayType === 'power' ? 'Power Training Day'
    : contextualNutrition.dayType === 'sparring' ? 'Sparring Day'
    : contextualNutrition.dayType === 'two_a_day' ? 'Two-a-Day'
    : contextualNutrition.dayType === 'fight_week' ? 'Fight Week'
    : contextualNutrition.dayType === 'tournament_day' ? 'Tournament Day'
    : contextualNutrition.dayType === 'travel' ? 'Travel Day'
    : 'Rest Day';

  const dayIcon = contextualNutrition.dayType.includes('grappling') || contextualNutrition.dayType === 'sparring'
    ? <Shield className="w-5 h-5 text-lime-400" />
    : contextualNutrition.dayType === 'rest'
    ? <Clock className="w-5 h-5 text-blue-400" />
    : <Dumbbell className="w-5 h-5 text-primary-400" />;

  return (
    <div className="space-y-4">
      {/* Contextual Nutrition Card */}
      <div className="card overflow-hidden">
        <button
          onClick={() => setShowContextual(!showContextual)}
          className="w-full p-3 flex items-center justify-between bg-gradient-to-r from-primary-500/20 to-transparent"
        >
          <div className="flex items-center gap-3">
            {dayIcon}
            <div className="text-left">
              <p className="text-sm font-medium text-white">{dayLabel}</p>
              {contextualNutrition.carbCycleNote && (
                <p className="text-xs text-grappler-400">{contextualNutrition.carbCycleNote}</p>
              )}
            </div>
          </div>
          {showContextual ? <ChevronUp className="w-4 h-4 text-grappler-400" /> : <ChevronDown className="w-4 h-4 text-grappler-400" />}
        </button>

        <AnimatePresence>
          {showContextual && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-3 pt-0 space-y-3">
                {/* Base vs Adjusted */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-grappler-800/50 rounded-lg">
                    <p className="text-grappler-400 mb-1">Base Targets</p>
                    <p className="text-gray-300">
                      {contextualNutrition.baseTargets.calories} kcal &middot; {contextualNutrition.baseTargets.protein}g P
                    </p>
                  </div>
                  <div className="p-2 bg-primary-500/10 border border-primary-500/30 rounded-lg">
                    <p className="text-primary-400 mb-1">Today&apos;s Adjusted</p>
                    <p className="text-white font-medium">
                      {contextualNutrition.adjustedTargets.calories} kcal &middot; {contextualNutrition.adjustedTargets.protein}g P
                    </p>
                  </div>
                </div>

                {/* Timing */}
                {(contextualNutrition.preworkoutTiming || contextualNutrition.postworkoutTiming) && (
                  <div className="space-y-2">
                    {contextualNutrition.preworkoutTiming && (
                      <div className="flex items-start gap-2 text-xs">
                        <span className="text-yellow-400 font-medium min-w-[60px]">Pre:</span>
                        <span className="text-grappler-400">{contextualNutrition.preworkoutTiming}</span>
                      </div>
                    )}
                    {contextualNutrition.postworkoutTiming && (
                      <div className="flex items-start gap-2 text-xs">
                        <span className="text-green-400 font-medium min-w-[60px]">Post:</span>
                        <span className="text-grappler-400">{contextualNutrition.postworkoutTiming}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Hydration Goal */}
                <div className="flex items-center justify-between p-2 bg-blue-500/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-gray-300">Hydration Goal</span>
                  </div>
                  <span className="text-sm font-medium text-blue-300">{(contextualNutrition.hydrationGoal / 1000).toFixed(1)} L</span>
                </div>

                {/* Electrolytes */}
                {electrolyteInfo && (
                  <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-lg space-y-1.5">
                    <p className="text-xs text-purple-300 font-medium flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Electrolyte Needs ({trainingDuration}min session)
                    </p>
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className="bg-grappler-800/40 rounded p-1">
                        <p className="text-xs text-grappler-400">Sodium</p>
                        <p className="text-xs font-medium text-grappler-200">{electrolyteInfo.sodiumMg}mg</p>
                      </div>
                      <div className="bg-grappler-800/40 rounded p-1">
                        <p className="text-xs text-grappler-400">Potassium</p>
                        <p className="text-xs font-medium text-grappler-200">{electrolyteInfo.potassiumMg}mg</p>
                      </div>
                      <div className="bg-grappler-800/40 rounded p-1">
                        <p className="text-xs text-grappler-400">Fluid Loss</p>
                        <p className="text-xs font-medium text-grappler-200">{electrolyteInfo.fluidLossL}L</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Intra-Training Fuel */}
                {intraFuel && intraFuel.carbsG > 0 && (
                  <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-xs text-blue-300 font-medium mb-1">Intra-Training Fuel</p>
                    <p className="text-xs text-grappler-400">{intraFuel.notes}</p>
                    {intraFuel.foods.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {intraFuel.foods.slice(0, 3).map((f, i) => (
                          <p key={i} className="text-xs text-grappler-400">&#x2022; {f}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Hydration Status */}
                {hydrationStatus && hydrationStatus.status !== 'well_hydrated' && (
                  <div className={cn(
                    'p-2.5 rounded-lg border',
                    hydrationStatus.status === 'severe_dehydration' ? 'bg-red-500/10 border-red-500/20' :
                    hydrationStatus.status === 'moderate_dehydration' ? 'bg-orange-500/10 border-orange-500/20' :
                    'bg-yellow-500/10 border-yellow-500/20'
                  )}>
                    <p className={cn(
                      'text-xs font-medium flex items-center gap-1',
                      hydrationStatus.status === 'severe_dehydration' ? 'text-red-300' :
                      hydrationStatus.status === 'moderate_dehydration' ? 'text-orange-300' :
                      'text-yellow-300'
                    )}>
                      <Droplets className="w-3 h-3" /> Hydration Alert
                    </p>
                    <p className="text-xs text-grappler-400 mt-1">{hydrationStatus.message}</p>
                  </div>
                )}

                {/* Collagen */}
                {collagenNudge && (
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <p className="text-xs text-emerald-300 font-medium flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Collagen Protocol
                    </p>
                    <p className="text-xs text-grappler-300 mt-1">{collagenNudge.dose}</p>
                    <p className="text-xs text-grappler-400">{collagenNudge.timing} — {collagenNudge.reason}</p>
                  </div>
                )}

                {/* Tips */}
                {contextualNutrition.recommendations.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-grappler-400 font-medium">Tips for today:</p>
                    {contextualNutrition.recommendations.slice(0, 3).map((rec, i) => (
                      <p key={i} className="text-xs text-grappler-400 flex items-start gap-2">
                        <span className="text-primary-400">&bull;</span>
                        {rec}
                      </p>
                    ))}
                  </div>
                )}

                {/* Supplement recommendations */}
                {supplements.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-grappler-400 font-medium flex items-center gap-1">
                      <Shield className="w-3 h-3 text-emerald-400" /> Supplements
                    </p>
                    {supplements.slice(0, 6).map((sup, i) => (
                      <p key={i} className="text-xs text-grappler-400 flex items-start gap-2">
                        <span className="text-emerald-400">&#x2022;</span>
                        {sup}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sub-tab navigation */}
      <div className="flex gap-1 bg-grappler-800/50 rounded-xl p-1">
        {([
          { id: 'diet' as const, label: 'Diet Coach' },
          { id: 'supplements' as const, label: 'Supplements' },
          { id: 'trends' as const, label: 'Trends' },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setCoachTab(tab.id)}
            className={cn(
              'flex-1 py-2 rounded-lg text-xs font-semibold transition-all',
              coachTab === tab.id
                ? 'bg-grappler-700 text-grappler-100'
                : 'text-grappler-500 hover:text-grappler-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {coachTab === 'diet' && <DietCoach />}
      {coachTab === 'supplements' && <SupplementTracker />}
      {coachTab === 'trends' && <NutritionTrends meals={allMeals} macroTargets={macroTargets} />}
    </div>
  );
}
