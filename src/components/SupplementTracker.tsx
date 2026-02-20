'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import {
  Pill,
  Check,
  ChevronDown,
  Plus,
  X,
  Flame,
  Beef,
  TrendingUp,
  Settings,
  Sparkles,
  AlertTriangle,
  Info,
  Clock,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SUPPLEMENT_DATABASE,
  SUPPLEMENT_MACROS,
  getSupplementPlan,
  buildDefaultStack,
  getTodayChecklist,
  getSupplementAdherence,
} from '@/lib/supplement-engine';
import type { UserSupplement, SupplementMacros } from '@/lib/types';

export default function SupplementTracker() {
  const user = useAppStore(s => s.user);
  const supplementStack = useAppStore(s => s.supplementStack);
  const supplementIntakes = useAppStore(s => s.supplementIntakes);
  const setSupplementStack = useAppStore(s => s.setSupplementStack);
  const updateSupplementInStack = useAppStore(s => s.updateSupplementInStack);
  const logSupplementIntake = useAppStore(s => s.logSupplementIntake);
  const removeSupplementIntake = useAppStore(s => s.removeSupplementIntake);
  const activeDietPhase = useAppStore(s => s.activeDietPhase);
  const competitions = useAppStore(s => s.competitions);
  const combatNutritionProfile = useAppStore(s => s.combatNutritionProfile);
  const activeWorkout = useAppStore(s => s.activeWorkout);
  const workoutLogs = useAppStore(s => s.workoutLogs);

  const [showSetup, setShowSetup] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [customizingId, setCustomizingId] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

  // Determine training context
  const isTrainingDay = useMemo(() => {
    const todayWorkout = workoutLogs.some(l =>
      new Date(l.date).toISOString().split('T')[0] === today
    );
    return !!activeWorkout || todayWorkout;
  }, [activeWorkout, workoutLogs, today]);

  // Days to competition
  const daysToComp = useMemo(() => {
    if (!competitions?.length) return undefined;
    const upcoming = competitions
      .map(c => ({ ...c, days: Math.ceil((new Date(c.date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) }))
      .filter(c => c.days > 0)
      .sort((a, b) => a.days - b.days);
    return upcoming[0]?.days;
  }, [competitions, now]);

  // Generate recommended plan
  const recommendedPlan = useMemo(() => {
    return getSupplementPlan({
      isCombatAthlete: user?.trainingIdentity === 'combat',
      isTestedAthlete: combatNutritionProfile?.isTestedAthlete ?? false,
      isInCut: activeDietPhase?.goal === 'cut',
      daysToCompetition: daysToComp,
      trainingDayType: user?.combatSport ?? undefined,
      sex: user?.sex,
    });
  }, [user, combatNutritionProfile, activeDietPhase, daysToComp]);

  // Auto-setup stack from plan if empty
  const handleSetupStack = useCallback(() => {
    const stack = buildDefaultStack(recommendedPlan);
    setSupplementStack(stack);
    setShowSetup(false);
  }, [recommendedPlan, setSupplementStack]);

  // Today's intakes
  const todayIntakes = useMemo(() =>
    supplementIntakes.filter(i => i.date === today),
    [supplementIntakes, today]
  );

  // Today's checklist
  const checklist = useMemo(() =>
    getTodayChecklist(supplementStack, todayIntakes, isTrainingDay),
    [supplementStack, todayIntakes, isTrainingDay]
  );

  // Adherence stats
  const adherence = useMemo(() =>
    getSupplementAdherence(supplementStack, supplementIntakes, 7),
    [supplementStack, supplementIntakes]
  );

  // Total macros from supplements today
  const todaySupplementMacros = useMemo(() => {
    return todayIntakes.reduce<SupplementMacros>(
      (acc, intake) => {
        if (!intake.macrosPerServing) return acc;
        return {
          calories: acc.calories + Math.round(intake.macrosPerServing.calories * intake.servings),
          protein: acc.protein + Math.round(intake.macrosPerServing.protein * intake.servings * 10) / 10,
          carbs: acc.carbs + Math.round(intake.macrosPerServing.carbs * intake.servings * 10) / 10,
          fat: acc.fat + Math.round(intake.macrosPerServing.fat * intake.servings * 10) / 10,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }, [todayIntakes]);

  // Quick-log a supplement
  const handleLog = useCallback((supp: UserSupplement) => {
    logSupplementIntake({
      supplementId: supp.supplementId,
      name: supp.name,
      date: today,
      time: timeStr,
      servings: supp.servingsPerDose,
      macrosPerServing: supp.macrosPerServing,
    });
  }, [logSupplementIntake, today, timeStr]);

  // Undo a logged supplement
  const handleUndo = useCallback((intakeId: string) => {
    removeSupplementIntake(intakeId);
  }, [removeSupplementIntake]);

  // No stack set up yet — show setup prompt
  if (supplementStack.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Pill className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-grappler-200 uppercase tracking-wide">
            Supplements
          </h2>
        </div>
        <p className="text-xs text-grappler-400 mb-3">
          Set up your supplement stack and track daily intake. Macros from supplements like
          collagen peptides are auto-added to your nutrition.
        </p>
        <button
          onClick={handleSetupStack}
          className="btn btn-primary btn-sm w-full gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Build My Stack
        </button>
        {recommendedPlan.warnings.length > 0 && (
          <div className="mt-3 space-y-1">
            {recommendedPlan.warnings.slice(0, 2).map((w, i) => (
              <p key={i} className="text-xs text-yellow-400/80 flex items-start gap-1">
                <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                {w}
              </p>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  // Flatten checklist for counting
  const totalSupps = checklist.reduce((s, g) => s + g.supplements.length, 0);
  const takenSupps = checklist.reduce((s, g) => s + g.supplements.filter(ss => ss.taken).length, 0);
  const allDone = totalSupps > 0 && takenSupps === totalSupps;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full p-4 flex items-center gap-3 text-left"
      >
        <div className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center',
          allDone ? 'bg-emerald-500/20' : 'bg-grappler-800'
        )}>
          {allDone
            ? <Check className="w-4 h-4 text-emerald-400" />
            : <Pill className="w-4 h-4 text-emerald-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-grappler-200">
              Supplements
            </h2>
            <span className={cn(
              'text-xs font-medium px-1.5 py-0.5 rounded-full',
              allDone
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-grappler-700 text-grappler-400'
            )}>
              {takenSupps}/{totalSupps}
            </span>
          </div>
          {/* Macro contribution summary */}
          {todaySupplementMacros.protein > 0 && (
            <p className="text-xs text-grappler-400 mt-0.5">
              +{todaySupplementMacros.protein}g protein · {todaySupplementMacros.calories} cal from supps
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {adherence.streak > 0 && (
            <span className="text-xs text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              {adherence.streak}d
            </span>
          )}
          <ChevronDown className={cn(
            'w-4 h-4 text-grappler-500 transition-transform',
            showDetails && 'rotate-180'
          )} />
        </div>
      </button>

      {/* Quick toggle row — always visible */}
      {!showDetails && !allDone && (
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-1.5">
            {checklist.flatMap(group =>
              group.supplements
                .filter(s => !s.taken)
                .slice(0, 6)
                .map(s => (
                  <button
                    key={s.supplement.supplementId}
                    onClick={() => handleLog(s.supplement)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-grappler-800/60 border border-grappler-700/50 hover:border-emerald-500/30 hover:bg-emerald-500/10 active:scale-95 transition-all text-xs text-grappler-400 hover:text-emerald-400"
                  >
                    <Plus className="w-3 h-3" />
                    {s.supplement.name.split(' ')[0]}
                    {s.macros && s.macros.protein > 0 && (
                      <span className="text-[9px] text-primary-400 ml-0.5">
                        +{Math.round(s.macros.protein * s.supplement.servingsPerDose)}p
                      </span>
                    )}
                  </button>
                ))
            )}
          </div>
        </div>
      )}

      {/* Expanded detail view */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Timing groups */}
              {checklist.map(group => (
                <div key={group.slot}>
                  <p className="text-xs text-grappler-400 uppercase tracking-wide font-medium mb-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {group.slot}
                  </p>
                  <div className="space-y-1">
                    {group.supplements.map(({ supplement: s, taken, intakeId, macros }) => (
                      <div
                        key={s.supplementId}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all',
                          taken ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-grappler-800/40'
                        )}
                      >
                        <button
                          onClick={() => taken && intakeId ? handleUndo(intakeId) : handleLog(s)}
                          className={cn(
                            'w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all',
                            taken ? 'bg-emerald-500 text-white' : 'border border-grappler-600 hover:border-emerald-500/50'
                          )}
                        >
                          {taken && <Check className="w-3 h-3" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'text-xs font-medium truncate',
                            taken ? 'text-grappler-400 line-through' : 'text-grappler-200'
                          )}>
                            {s.name}
                          </p>
                          <p className="text-xs text-grappler-400">
                            {s.customDose || SUPPLEMENT_DATABASE.find(d => d.id === s.supplementId)?.doseRange}
                          </p>
                        </div>
                        {/* Macro badge */}
                        {macros && macros.protein > 0 && (
                          <span className={cn(
                            'text-xs px-1.5 py-0.5 rounded-full flex-shrink-0',
                            taken ? 'bg-emerald-500/15 text-emerald-400' : 'bg-primary-500/10 text-primary-400'
                          )}>
                            {Math.round(macros.protein * s.servingsPerDose)}g protein
                          </span>
                        )}
                        {macros && macros.protein === 0 && macros.calories > 0 && (
                          <span className="text-xs text-grappler-400 flex-shrink-0">
                            {Math.round(macros.calories * s.servingsPerDose)} cal
                          </span>
                        )}
                        {/* Customize button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCustomizingId(customizingId === s.supplementId ? null : s.supplementId);
                          }}
                          className="text-grappler-600 hover:text-grappler-400 transition-colors"
                        >
                          <Settings className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Inline customization for a supplement */}
                  <AnimatePresence>
                    {group.supplements.some(s => s.supplement.supplementId === customizingId) && (
                      <CustomizePanel
                        supp={supplementStack.find(s => s.supplementId === customizingId)!}
                        onUpdate={(updates) => {
                          updateSupplementInStack(customizingId!, updates);
                          setCustomizingId(null);
                        }}
                        onClose={() => setCustomizingId(null)}
                      />
                    )}
                  </AnimatePresence>
                </div>
              ))}

              {/* Macro auto-log summary */}
              {todaySupplementMacros.protein > 0 || todaySupplementMacros.calories > 0 ? (
                <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-3">
                  <p className="text-xs text-primary-400 font-medium mb-1 flex items-center gap-1">
                    <Flame className="w-3 h-3" /> Auto-logged to Nutrition
                  </p>
                  <div className="flex items-center gap-3 text-xs">
                    {todaySupplementMacros.calories > 0 && (
                      <span className="text-grappler-300">
                        {todaySupplementMacros.calories} cal
                      </span>
                    )}
                    {todaySupplementMacros.protein > 0 && (
                      <span className="text-primary-400 font-medium flex items-center gap-0.5">
                        <Beef className="w-3 h-3" />
                        {todaySupplementMacros.protein}g protein
                      </span>
                    )}
                    {todaySupplementMacros.carbs > 0 && (
                      <span className="text-grappler-400">{todaySupplementMacros.carbs}g carbs</span>
                    )}
                    {todaySupplementMacros.fat > 0 && (
                      <span className="text-grappler-400">{todaySupplementMacros.fat}g fat</span>
                    )}
                  </div>
                </div>
              ) : null}

              {/* 7-day adherence */}
              {adherence.perSupplement.length > 0 && (
                <div>
                  <p className="text-xs text-grappler-400 uppercase tracking-wide font-medium mb-1.5">
                    7-Day Adherence: {adherence.overall}%
                  </p>
                  <div className="flex gap-0.5 mb-2">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const d = new Date();
                      d.setDate(d.getDate() - (6 - i));
                      const dateStr = d.toISOString().split('T')[0];
                      const dayEnabled = supplementStack.filter(s => s.enabled);
                      const dayDone = dayEnabled.every(s =>
                        supplementIntakes.some(ii => ii.supplementId === s.supplementId && ii.date === dateStr)
                      );
                      const partialDone = dayEnabled.some(s =>
                        supplementIntakes.some(ii => ii.supplementId === s.supplementId && ii.date === dateStr)
                      );
                      return (
                        <div
                          key={i}
                          className={cn(
                            'flex-1 h-1.5 rounded-full',
                            dayDone ? 'bg-emerald-500' :
                            partialDone ? 'bg-yellow-500/50' :
                            'bg-grappler-700'
                          )}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {recommendedPlan.warnings.length > 0 && (
                <div className="space-y-1">
                  {recommendedPlan.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-yellow-400/70 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      {w}
                    </p>
                  ))}
                </div>
              )}

              {/* Reset / rebuild stack */}
              <button
                onClick={handleSetupStack}
                className="text-xs text-grappler-400 hover:text-grappler-300 transition-colors flex items-center gap-1"
              >
                <Settings className="w-3 h-3" /> Rebuild stack from recommendations
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Inline Customize Panel ──────────────────────────────────────────────────

function CustomizePanel({
  supp,
  onUpdate,
  onClose,
}: {
  supp: UserSupplement;
  onUpdate: (updates: Partial<UserSupplement>) => void;
  onClose: () => void;
}) {
  const [protein, setProtein] = useState(supp.macrosPerServing?.protein?.toString() ?? '');
  const [calories, setCals] = useState(supp.macrosPerServing?.calories?.toString() ?? '');
  const [servings, setServings] = useState(supp.servingsPerDose.toString());

  const dbSupp = SUPPLEMENT_DATABASE.find(d => d.id === supp.supplementId);

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="overflow-hidden"
    >
      <div className="mt-1 bg-grappler-800/60 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-grappler-200">{supp.name}</p>
          <button onClick={onClose} className="text-grappler-500 hover:text-grappler-300">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Science note */}
        {dbSupp && (
          <p className="text-xs text-grappler-400 flex items-start gap-1">
            <Info className="w-3 h-3 flex-shrink-0 mt-0.5 text-primary-400" />
            {dbSupp.evidence.split(' — ')[1] || dbSupp.evidence}
          </p>
        )}

        {/* Servings per dose */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-grappler-400 w-16">Servings</label>
          <input
            type="number"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            min="0.5"
            step="0.5"
            className="flex-1 bg-grappler-700 rounded px-2 py-1 text-xs text-grappler-200 border border-grappler-600 focus:border-primary-500 outline-none"
          />
        </div>

        {/* Custom macros per serving */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-grappler-400 w-16">Protein/srv</label>
          <input
            type="number"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            placeholder="g"
            className="flex-1 bg-grappler-700 rounded px-2 py-1 text-xs text-grappler-200 border border-grappler-600 focus:border-primary-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-grappler-400 w-16">Cal/srv</label>
          <input
            type="number"
            value={calories}
            onChange={(e) => setCals(e.target.value)}
            placeholder="kcal"
            className="flex-1 bg-grappler-700 rounded px-2 py-1 text-xs text-grappler-200 border border-grappler-600 focus:border-primary-500 outline-none"
          />
        </div>

        {/* Toggle enabled */}
        <div className="flex items-center justify-between pt-1 border-t border-grappler-700/50">
          <label className="text-xs text-grappler-400">Include in daily stack</label>
          <button
            onClick={() => onUpdate({ enabled: !supp.enabled })}
            className={cn(
              'w-8 h-4 rounded-full transition-colors relative',
              supp.enabled ? 'bg-emerald-500' : 'bg-grappler-600'
            )}
          >
            <div className={cn(
              'w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform',
              supp.enabled ? 'translate-x-4' : 'translate-x-0.5'
            )} />
          </button>
        </div>

        {/* Save */}
        <button
          onClick={() => {
            const prot = parseFloat(protein) || 0;
            const cal = parseFloat(calories) || 0;
            const srv = parseFloat(servings) || 1;
            const hasMacros = prot > 0 || cal > 0;
            onUpdate({
              servingsPerDose: srv,
              macrosPerServing: hasMacros ? {
                protein: prot,
                calories: cal,
                carbs: supp.macrosPerServing?.carbs ?? 0,
                fat: supp.macrosPerServing?.fat ?? 0,
              } : null,
            });
          }}
          className="btn btn-primary btn-sm w-full"
        >
          Save
        </button>
      </div>
    </motion.div>
  );
}
