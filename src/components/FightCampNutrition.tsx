'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  Calendar,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Target,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Droplets,
  Shield,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { getEffectiveTier, hasFeatureAccess } from '@/lib/subscription';
import { useSession } from 'next-auth/react';
import {
  detectFightCampPhase,
  getPhaseConfig,
  generatePhaseMacros,
  generateFightCampTimeline,
} from '@/lib/fight-camp-engine';
import type { FightCampPhaseConfig } from '@/lib/types';
import { getSupplementPlan, getPreCompetitionPauses } from '@/lib/supplement-engine';
import { calculateElectrolyteNeeds, getIntraTrainingFuel, getTournamentDayFuel } from '@/lib/electrolyte-engine';

interface FightCampNutritionProps {
  onClose: () => void;
}

const PHASE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  off_season:       { text: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
  base_camp:        { text: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30' },
  intensification:  { text: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
  fight_camp_peak:  { text: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
  fight_week:       { text: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30' },
  weigh_in_day:     { text: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
  fight_day:        { text: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' },
  tournament_day:   { text: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' },
  post_competition: { text: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500/30' },
};

export default function FightCampNutrition({ onClose }: FightCampNutritionProps) {
  const { user, competitions, bodyWeightLog, combatNutritionProfile, activeSupplements: rawActiveSupplements, subscription } = useAppStore();
  const activeSupplements = (rawActiveSupplements ?? []).filter((s: any) => !s._deleted);
  const { data: session } = useSession();
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [showSupplements, setShowSupplements] = useState(false);
  const [showElectrolytes, setShowElectrolytes] = useState(false);

  const effectiveTier = getEffectiveTier(subscription, session?.user?.email);
  const hasFightCampAccess = hasFeatureAccess('fight-camp-nutrition', effectiveTier);

  const weightUnit = user?.weightUnit || 'lbs';
  const sex = (user?.sex || 'male') as 'male' | 'female';

  // Get current weight in kg
  const latestWeight = bodyWeightLog.length > 0 ? bodyWeightLog[bodyWeightLog.length - 1] : null;
  const bodyWeightKg = latestWeight
    ? (latestWeight.unit === 'lbs' ? latestWeight.weight / 2.205 : latestWeight.weight)
    : (user?.bodyWeightKg ? user.bodyWeightKg : 80);

  // Nearest active competition
  const nearestCompetition = useMemo(() => {
    const now = Date.now();
    return competitions
      .filter(c => new Date(c.date).getTime() > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] || null;
  }, [competitions]);

  const daysToCompetition = nearestCompetition
    ? Math.ceil((new Date(nearestCompetition.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const isTournament = nearestCompetition?.type === 'bjj_tournament' || nearestCompetition?.type === 'wrestling_meet';

  // Current fight camp phase
  const currentPhase = daysToCompetition != null && daysToCompetition > 0
    ? detectFightCampPhase(daysToCompetition, isTournament)
    : null;

  const currentConfig = currentPhase ? getPhaseConfig(currentPhase, sex) : null;

  // Full timeline
  const timeline = nearestCompetition && daysToCompetition != null && daysToCompetition > 0
    ? generateFightCampTimeline(nearestCompetition, bodyWeightKg, sex)
    : [];

  // Phase-specific macros (estimate TDEE as ~33 kcal/kg for active combat athlete)
  const estimatedTDEE = Math.round(bodyWeightKg * 33);
  const phaseMacros = currentPhase
    ? generatePhaseMacros(estimatedTDEE, bodyWeightKg, currentPhase, sex)
    : null;

  // Supplement plan
  const supplementPlan = useMemo(() => {
    return getSupplementPlan({
      isCombatAthlete: true,
      isInCut: currentPhase === 'fight_week' || currentPhase === 'fight_camp_peak',
      daysToCompetition: daysToCompetition ?? undefined,
      sex,
      isTestedAthlete: combatNutritionProfile?.isTestedAthlete,
    });
  }, [currentPhase, daysToCompetition, sex, combatNutritionProfile?.isTestedAthlete]);

  // Pre-competition supplement pauses
  const supplementPauses = daysToCompetition != null
    ? getPreCompetitionPauses(daysToCompetition)
    : [];

  // Electrolyte needs for typical training
  const electrolyteNeeds = calculateElectrolyteNeeds(bodyWeightKg, 'bjj_gi', 90, 'moderate');

  // Tournament day fuel
  const tournamentFuel = isTournament ? getTournamentDayFuel(bodyWeightKg) : null;

  if (!hasFightCampAccess) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-grappler-900 overflow-y-auto"
      >
        <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button aria-label="Go back" onClick={onClose} className="btn btn-ghost btn-sm">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-grappler-50">Fight Camp Nutrition</h1>
          </div>
          <div className="text-center py-16">
            <Shield className="w-12 h-12 text-primary-500/50 mx-auto mb-4" />
            <p className="text-grappler-300 font-semibold mb-2">Pro Feature</p>
            <p className="text-sm text-grappler-500 max-w-xs mx-auto">
              Phase-specific nutrition targets that auto-adjust through fight camp. Upgrade to Pro to unlock.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!nearestCompetition) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-grappler-900 overflow-y-auto"
      >
        <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button aria-label="Go back" onClick={onClose} className="btn btn-ghost btn-sm">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-grappler-50">Fight Camp Nutrition</h1>
          </div>
          <div className="text-center py-16">
            <Flame className="w-12 h-12 text-grappler-600 mx-auto mb-4" />
            <p className="text-grappler-400 mb-2">No upcoming competition</p>
            <p className="text-sm text-grappler-500">
              Add a competition in Event Prep to activate fight camp nutrition.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  const phaseColors = currentPhase ? PHASE_COLORS[currentPhase] || PHASE_COLORS.off_season : PHASE_COLORS.off_season;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-grappler-900 overflow-y-auto"
    >
      <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button aria-label="Go back" onClick={onClose} className="btn btn-ghost btn-sm">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-grappler-50 flex items-center gap-2">
                <Flame className="w-5 h-5 text-blue-500" />
                Fight Camp Nutrition
              </h1>
              <p className="text-sm text-grappler-400">
                {nearestCompetition.name} — {daysToCompetition}d out
              </p>
            </div>
          </div>
        </div>

        {/* Current Phase Hero */}
        {currentPhase && currentConfig && (
          <div className={cn('rounded-xl p-5 border', phaseColors.bg, phaseColors.border)}>
            <div className="flex items-center justify-between mb-3">
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', phaseColors.bg, phaseColors.text)}>
                {currentPhase.replace(/_/g, ' ').toUpperCase()}
              </span>
              <span className="text-xs text-grappler-400">
                <Calendar className="w-3 h-3 inline mr-1" />
                {new Date(nearestCompetition.date).toLocaleDateString()}
              </span>
            </div>
            <p className={cn('text-lg font-bold mb-1', phaseColors.text)}>{currentConfig.focus}</p>
            <p className="text-sm text-grappler-300">{currentConfig.calorieStrategy}</p>

            {/* Macro targets for current phase */}
            {phaseMacros && (
              <div className="grid grid-cols-4 gap-2 mt-4">
                <div className="bg-grappler-900/50 rounded-lg p-2 text-center">
                  <p className="text-xs text-grappler-400">Calories</p>
                  <p className="text-sm font-bold text-grappler-100">{phaseMacros.calories}</p>
                </div>
                <div className="bg-grappler-900/50 rounded-lg p-2 text-center">
                  <p className="text-xs text-grappler-400">Protein</p>
                  <p className="text-sm font-bold text-grappler-100">{phaseMacros.protein}g</p>
                </div>
                <div className="bg-grappler-900/50 rounded-lg p-2 text-center">
                  <p className="text-xs text-grappler-400">Carbs</p>
                  <p className="text-sm font-bold text-grappler-100">{phaseMacros.carbs}g</p>
                </div>
                <div className="bg-grappler-900/50 rounded-lg p-2 text-center">
                  <p className="text-xs text-grappler-400">Fat</p>
                  <p className="text-sm font-bold text-grappler-100">{phaseMacros.fat}g</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Phase Recommendations */}
        {currentConfig && (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-primary-400" />
              <h3 className="font-medium text-grappler-200">Phase Recommendations</h3>
            </div>
            <div className="space-y-2">
              {currentConfig.recommendations.map((rec: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <p className="text-grappler-300">{rec}</p>
                </div>
              ))}
            </div>
            {currentConfig.restrictions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-grappler-700/50">
                <p className="text-xs text-red-400 font-medium mb-2">Restrictions</p>
                {currentConfig.restrictions.map((r: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm mb-1">
                    <X className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-grappler-400">{r}</p>
                  </div>
                ))}
              </div>
            )}
            {currentConfig.warnings.length > 0 && (
              <div className="mt-3 pt-3 border-t border-grappler-700/50">
                {currentConfig.warnings.map((w: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <p className="text-yellow-300">{w}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Phase Timeline */}
        {timeline.length > 0 && (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-primary-400" />
              <h3 className="font-medium text-grappler-200">Nutrition Phase Timeline</h3>
            </div>
            <div className="space-y-1.5">
              {timeline.map((item) => {
                const colors = PHASE_COLORS[item.phase] || PHASE_COLORS.off_season;
                const isCurrent = item.phase === currentPhase;
                return (
                  <button
                    key={item.phase}
                    onClick={() => setExpandedPhase(expandedPhase === item.phase ? null : item.phase)}
                    className={cn(
                      'w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left',
                      isCurrent ? cn(colors.bg, colors.border) : 'border-transparent bg-grappler-800/30 hover:bg-grappler-800/50'
                    )}
                  >
                    <div className={cn(
                      'w-2.5 h-2.5 rounded-full flex-shrink-0',
                      isCurrent ? colors.text.replace('text-', 'bg-') : 'bg-grappler-600'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-xs font-medium', isCurrent ? colors.text : 'text-grappler-400')}>
                        {item.phase.replace(/_/g, ' ')}
                        {isCurrent && <span className="ml-2 text-xs bg-white/10 px-1.5 py-0.5 rounded-full">Now</span>}
                      </p>
                      <p className="text-xs text-grappler-400">{item.focus}</p>
                    </div>
                    <span className="text-xs text-grappler-400 flex-shrink-0">
                      {new Date(item.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Hydration & Electrolytes */}
        <div className="card p-4">
          <button
            onClick={() => setShowElectrolytes(!showElectrolytes)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-400" />
              <h3 className="font-medium text-grappler-200">Hydration & Electrolytes</h3>
            </div>
            {showElectrolytes ? <ChevronUp className="w-4 h-4 text-grappler-400" /> : <ChevronDown className="w-4 h-4 text-grappler-400" />}
          </button>
          <AnimatePresence>
            {showElectrolytes && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-grappler-800/40 rounded-lg p-2.5">
                      <p className="text-xs text-grappler-400">Est. Fluid Loss</p>
                      <p className="text-sm font-bold text-blue-300">{electrolyteNeeds.fluidLossL}L</p>
                      <p className="text-xs text-grappler-400">per 90min session</p>
                    </div>
                    <div className="bg-grappler-800/40 rounded-lg p-2.5">
                      <p className="text-xs text-grappler-400">Replace</p>
                      <p className="text-sm font-bold text-blue-300">{electrolyteNeeds.replacementFluidL}L</p>
                      <p className="text-xs text-grappler-400">150% replacement</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-grappler-800/40 rounded-lg p-2 text-center">
                      <p className="text-xs text-grappler-400">Sodium</p>
                      <p className="text-xs font-bold text-grappler-200">{electrolyteNeeds.sodiumMg}mg</p>
                    </div>
                    <div className="bg-grappler-800/40 rounded-lg p-2 text-center">
                      <p className="text-xs text-grappler-400">Potassium</p>
                      <p className="text-xs font-bold text-grappler-200">{electrolyteNeeds.potassiumMg}mg</p>
                    </div>
                    <div className="bg-grappler-800/40 rounded-lg p-2 text-center">
                      <p className="text-xs text-grappler-400">Magnesium</p>
                      <p className="text-xs font-bold text-grappler-200">{electrolyteNeeds.magnesiumMg}mg</p>
                    </div>
                  </div>
                  <p className="text-xs text-grappler-400">{electrolyteNeeds.timing}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tournament Day Fuel (if tournament) */}
        {isTournament && tournamentFuel && (
          <div className="card p-4 border border-green-500/30 bg-green-500/5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-green-400" />
              <h3 className="font-medium text-green-300">Tournament Day Fueling</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-grappler-300 mb-1">
                  Pre-First Match ({tournamentFuel.preFirstMatch.timing})
                </p>
                {tournamentFuel.preFirstMatch.foods.map((f, i) => (
                  <p key={i} className="text-xs text-grappler-400 ml-3">&#x2022; {f}</p>
                ))}
              </div>
              <div>
                <p className="text-xs font-medium text-grappler-300 mb-1">
                  Between Matches ({tournamentFuel.betweenMatches.timing})
                </p>
                {tournamentFuel.betweenMatches.foods.map((f, i) => (
                  <p key={i} className="text-xs text-grappler-400 ml-3">&#x2022; {f}</p>
                ))}
              </div>
              <div className="bg-grappler-800/40 rounded-lg p-2.5">
                <p className="text-xs text-grappler-300">
                  Hydration: {tournamentFuel.hydration.mlBetweenMatches}ml + {tournamentFuel.hydration.electrolyteMgSodium}mg sodium between matches
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Supplement Protocol */}
        <div className="card p-4">
          <button
            onClick={() => setShowSupplements(!showSupplements)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <h3 className="font-medium text-grappler-200">Supplement Protocol</h3>
              {supplementPauses.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
                  {supplementPauses.length} to pause
                </span>
              )}
            </div>
            {showSupplements ? <ChevronUp className="w-4 h-4 text-grappler-400" /> : <ChevronDown className="w-4 h-4 text-grappler-400" />}
          </button>
          <AnimatePresence>
            {showSupplements && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-3">
                  {/* Pauses needed */}
                  {supplementPauses.length > 0 && (
                    <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-xs font-medium text-yellow-300 mb-1">Pre-Competition Pauses</p>
                      {supplementPauses.map((p, i) => (
                        <p key={i} className="text-xs text-yellow-400 ml-2">
                          &#x2022; Pause {p.supplement}: {p.reason}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Tiered supplements */}
                  {(['essential', 'situational', 'optional'] as const).map(tier => {
                    const allSupps = [...supplementPlan.daily, ...supplementPlan.trainingDay];
                    const tierSupps = allSupps.filter(s => s.tier === tier);
                    // Dedupe by id
                    const seen = new Set<string>();
                    const uniqueSupps = tierSupps.filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; });
                    if (uniqueSupps.length === 0) return null;
                    return (
                      <div key={tier}>
                        <p className="text-xs font-medium text-grappler-400 uppercase tracking-wide mb-1.5">
                          {tier === 'essential' ? 'Essential' : tier === 'situational' ? 'Situational' : 'Optional'}
                        </p>
                        {uniqueSupps.map((s) => (
                          <div key={s.id} className="flex items-start gap-2 mb-1.5 text-xs">
                            <CheckCircle2 className={cn('w-3.5 h-3.5 mt-0.5 flex-shrink-0',
                              tier === 'essential' ? 'text-green-400' :
                              tier === 'situational' ? 'text-blue-400' : 'text-grappler-500'
                            )} />
                            <div>
                              <p className="text-grappler-200 font-medium">{s.name}</p>
                              <p className="text-grappler-500">{s.doseRange} — {s.timing}</p>
                              {s.combatNotes && (
                                <p className="text-grappler-500 italic">{s.combatNotes}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
