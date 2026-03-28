'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import {
  calculateMacros,
  getTargetRate,
  calculateWeeklyAdjustment,
  analyzeWeightTrend,
  getPhaseRecommendation,
  calculateAdherence,
  calculateEnergyAvailability,
  estimateDailyExerciseCost,
  getPhaseDietParams,
} from '@/lib/diet-coach';
import { DietGoal, BiologicalSex, NutritionPhaseType } from '@/lib/types';
import { detectFightCampPhase } from '@/lib/fight-camp-engine';
import {
  generateNutritionPlan,
  getActivePhaseContext,
  advancePhase,
  insertDietBreak,
} from '@/lib/periodization-planner';
import {
  Scale,
  TrendingDown,
  TrendingUp,
  Minus,
  Target,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Flame,
  Dumbbell,
  Shield,
  Ruler,
  User,
  Bell,
  BellOff,
  Clock,
  RefreshCw,
  History,
  Share2,
  Copy,
  Trophy,
  Pencil,
  Trash2,
  X,
  Check,
} from 'lucide-react';

const GOAL_CONFIG: Record<DietGoal, { label: string; description: string; color: string; icon: React.ReactNode }> = {
  cut: {
    label: 'Fat Loss',
    description: 'Lose fat, preserve muscle',
    color: 'text-red-400',
    icon: <Flame className="w-5 h-5 text-red-400" />,
  },
  maintain: {
    label: 'Maintain',
    description: 'Stabilize weight, normalize metabolism',
    color: 'text-blue-400',
    icon: <Shield className="w-5 h-5 text-blue-400" />,
  },
  bulk: {
    label: 'Muscle Gain',
    description: 'Build muscle with minimal fat',
    color: 'text-green-400',
    icon: <Dumbbell className="w-5 h-5 text-green-400" />,
  },
};

export default function DietCoach() {
  const {
    user,
    activeDietPhase,
    dietPhaseHistory,
    weeklyCheckIns,
    bodyWeightLog,
    meals,
    macroTargets,
    startDietPhase,
    endDietPhase,
    addWeeklyCheckIn,
    incrementPhaseWeek,
    setMacroTargets,
    updateUserFields,
    mealReminders,
    setMealReminders,
    getActiveIllness,
    deleteDietPhaseFromHistory,
    editDietPhaseInHistory,
    combatNutritionProfile,
    trainingSessions,
    competitions,
    bodyComposition,
    workoutLogs,
    nutritionPeriodPlan,
    setNutritionPeriodPlan,
    advanceNutritionPhase,
  } = useAppStore();

  const activeIllness = useMemo(() => getActiveIllness(), [getActiveIllness]);
  const isIll = !!activeIllness && (activeIllness.status === 'active' || activeIllness.status === 'recovering');

  const [expanded, setExpanded] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [setupStep, setSetupStep] = useState<'info' | 'goal'>('info');
  const [selectedGoal, setSelectedGoal] = useState<DietGoal>('cut');
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [showSwitchGoal, setShowSwitchGoal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Setup form state — pre-fill from user profile / weight log
  const latestWeight = bodyWeightLog.length > 0 ? bodyWeightLog[bodyWeightLog.length - 1] : null;
  const defaultWeightKg = latestWeight
    ? (latestWeight.unit === 'lbs' ? latestWeight.weight * 0.453592 : latestWeight.weight)
    : 80;

  const [formWeight, setFormWeight] = useState(String(Math.round(defaultWeightKg)));
  const [formHeight, setFormHeight] = useState(String(user?.heightCm || 175));
  const [formSex, setFormSex] = useState<BiologicalSex>(user?.sex || 'male');

  // Re-sync form state when user profile is updated (e.g. from ProfileSettings)
  useEffect(() => {
    if (user?.heightCm) setFormHeight(String(user.heightCm));
    if (user?.sex) setFormSex(user.sex);
  }, [user?.heightCm, user?.sex]);

  useEffect(() => {
    if (latestWeight) {
      const wKg = latestWeight.unit === 'lbs' ? latestWeight.weight * 0.453592 : latestWeight.weight;
      setFormWeight(String(Math.round(wKg)));
    }
  }, [latestWeight?.weight, latestWeight?.unit]);

  const bodyWeightKg = parseFloat(formWeight) || defaultWeightKg;
  const heightCm = parseFloat(formHeight) || 175;
  const age = user?.age || 25;

  // Can we skip Step 1? All profile data is available from onboarding
  const hasProfileData = !!(user?.heightCm && user?.sex && (latestWeight || user?.age));

  // Analyze weight trend
  const weightTrend = useMemo(
    () => analyzeWeightTrend(bodyWeightLog, user?.weightUnit === 'lbs' ? 'lbs' : 'kg'),
    [bodyWeightLog, user?.weightUnit]
  );

  // Adherence
  const adherence = useMemo(() => calculateAdherence(meals), [meals]);

  // Phase recommendation (sex-aware — women get earlier diet break prompts)
  const phaseStatus = useMemo(
    () => getPhaseRecommendation(activeDietPhase, formSex),
    [activeDietPhase, formSex]
  );

  // Activity multiplier — fallback if no dynamic training data
  const isCombatAthlete = user?.trainingIdentity === 'combat';
  const activityMultiplier = useMemo(() => {
    const sessions = user?.sessionsPerWeek || 3;
    if (sessions <= 2) return 1.4;
    if (sessions <= 4) return 1.55;
    return 1.7;
  }, [user?.sessionsPerWeek]);

  // Last 7 days of training data for dynamic TDEE
  const recentTrainingSessions = useMemo(() => {
    if (!trainingSessions?.length) return [];
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return trainingSessions.filter(s => new Date(s.date).getTime() > weekAgo);
  }, [trainingSessions]);

  const recentLiftingSessions = useMemo(() => {
    if (!workoutLogs?.length) return [];
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return workoutLogs.filter(w => new Date(w.date).getTime() > weekAgo);
  }, [workoutLogs]);

  // Combat context: detect nearest competition & fight camp phase
  const nearestCompetition = useMemo(() => {
    if (!competitions?.length) return null;
    const now = Date.now();
    return competitions
      .filter(c => new Date(c.date).getTime() > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] || null;
  }, [competitions]);

  const daysToCompetition = nearestCompetition
    ? Math.ceil((new Date(nearestCompetition.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : undefined;

  const fightCampPhase = isCombatAthlete && daysToCompetition
    ? detectFightCampPhase(daysToCompetition)
    : null;

  // Body fat % from latest composition entry
  const latestBodyFat = bodyComposition?.length > 0
    ? bodyComposition[bodyComposition.length - 1]?.bodyFatPercent
    : undefined;

  // Periodized nutrition plan context
  const phaseContext = useMemo(() => {
    if (!nutritionPeriodPlan) return null;
    return getActivePhaseContext(
      nutritionPeriodPlan,
      bodyWeightLog,
      weeklyCheckIns,
      competitions || [],
    );
  }, [nutritionPeriodPlan, bodyWeightLog, weeklyCheckIns, competitions]);

  const handleGeneratePlan = () => {
    const plan = generateNutritionPlan({
      competitions: competitions || [],
      currentWeightKg: bodyWeightKg,
      bodyFatPercent: latestBodyFat ?? null,
      sex: formSex,
      dietPhaseHistory,
      currentTrainingFocus: null,
      isCombatAthlete,
    });
    setNutritionPeriodPlan(plan);
  };

  const handleAdvancePhase = () => {
    if (!nutritionPeriodPlan) return;
    advanceNutritionPhase();
    // Also sync the active diet phase with the new periodization phase
    const nextIdx = nutritionPeriodPlan.activePhaseIndex + 1;
    if (nextIdx < nutritionPeriodPlan.phases.length) {
      const nextPhase = nutritionPeriodPlan.phases[nextIdx];
      const params = getPhaseDietParams(nextPhase);
      const newMacros = calculateMacros({
        bodyWeightKg,
        heightCm,
        age,
        sex: formSex,
        goal: params.goal,
        activityMultiplier,
        bodyFatPercent: latestBodyFat,
        isCombatAthlete,
        occupation: combatNutritionProfile?.occupation,
        weeklyTrainingSessions: recentTrainingSessions,
        weeklyLiftingSessions: recentLiftingSessions,
      });
      if (!newMacros) return; // Profile incomplete — cannot calculate
      endDietPhase();
      startDietPhase({
        goal: params.goal,
        startDate: new Date().toISOString().split('T')[0],
        startWeightKg: bodyWeightKg,
        targetRatePerWeek: nextPhase.targetRateKgPerWeek,
        currentMacros: newMacros,
        weeksCompleted: 0,
        isActive: true,
      });
    }
  };

  const handleInsertDietBreak = () => {
    if (!nutritionPeriodPlan) return;
    const updated = insertDietBreak(nutritionPeriodPlan);
    setNutritionPeriodPlan(updated);
  };

  // Energy availability calculation (for display)
  const energyAvailability = useMemo(() => {
    if (!macroTargets?.calories || !bodyWeightKg) return null;
    const exerciseCost = estimateDailyExerciseCost(
      trainingSessions?.slice(-7) || [],
      [],
      bodyWeightKg,
    );
    const leanMassKg = latestBodyFat
      ? bodyWeightKg * (1 - latestBodyFat / 100)
      : bodyWeightKg * 0.8; // fallback estimate
    return calculateEnergyAvailability(
      macroTargets.calories,
      exerciseCost,
      leanMassKg,
    );
  }, [macroTargets?.calories, bodyWeightKg, trainingSessions, latestBodyFat]);

  // Handle starting a new diet phase
  const handleStartPhase = () => {
    // Save height & sex to user profile
    if (user) {
      updateUserFields({ heightCm, sex: formSex });
    }

    const newMacros = calculateMacros({
      bodyWeightKg,
      heightCm,
      age,
      sex: formSex,
      goal: selectedGoal,
      activityMultiplier,
      bodyFatPercent: latestBodyFat,
      isCombatAthlete,
      occupation: combatNutritionProfile?.occupation,
      weeklyTrainingSessions: recentTrainingSessions,
      weeklyLiftingSessions: recentLiftingSessions,
    });
    if (!newMacros) return; // Profile incomplete — cannot calculate
    const rate = getTargetRate(selectedGoal, bodyWeightKg, formSex);

    startDietPhase({
      goal: selectedGoal,
      startDate: new Date().toISOString().split('T')[0],
      startWeightKg: bodyWeightKg,
      targetRatePerWeek: rate,
      currentMacros: newMacros,
      weeksCompleted: 0,
      isActive: true,
    });

    setShowSetup(false);
    setSetupStep('info');
  };

  // Handle switching goal on active phase
  const handleSwitchGoal = (newGoal: DietGoal) => {
    if (activeDietPhase && newGoal === activeDietPhase.goal) {
      setShowSwitchGoal(false);
      return;
    }
    const newMacros = calculateMacros({
      bodyWeightKg,
      heightCm,
      age,
      sex: formSex,
      goal: newGoal,
      activityMultiplier,
      bodyFatPercent: latestBodyFat,
      isCombatAthlete,
      occupation: combatNutritionProfile?.occupation,
      weeklyTrainingSessions: recentTrainingSessions,
      weeklyLiftingSessions: recentLiftingSessions,
    });
    if (!newMacros) return; // Profile incomplete — cannot calculate
    const rate = getTargetRate(newGoal, bodyWeightKg, formSex);

    endDietPhase();
    startDietPhase({
      goal: newGoal,
      startDate: new Date().toISOString().split('T')[0],
      startWeightKg: bodyWeightKg,
      targetRatePerWeek: rate,
      currentMacros: newMacros,
      weeksCompleted: 0,
      isActive: true,
    });
    setShowSwitchGoal(false);
  };

  // Handle weekly check-in
  const handleCheckIn = () => {
    if (!activeDietPhase) return;

    const adjustmentResult = calculateWeeklyAdjustment({
      currentMacros: macroTargets,
      goal: activeDietPhase.goal,
      targetRatePerWeek: activeDietPhase.targetRatePerWeek,
      actualWeeklyChange: weightTrend.weeklyChange * (user?.weightUnit === 'lbs' ? 0.453592 : 1),
      weeksAtPlateau: weightTrend.weeksAtPlateau,
      adherencePercent: adherence,
      sex: formSex,
      isIll,
      bodyWeightKg,
      isFightCamp: !!fightCampPhase,
      daysToCompetition,
    });

    addWeeklyCheckIn({
      phaseId: activeDietPhase.id,
      weekNumber: activeDietPhase.weeksCompleted + 1,
      date: new Date().toISOString().split('T')[0],
      averageWeightKg: weightTrend.current * (user?.weightUnit === 'lbs' ? 0.453592 : 1),
      weightChange: weightTrend.weeklyChange * (user?.weightUnit === 'lbs' ? 0.453592 : 1),
      adherenceScore: adherence,
      adjustmentMade: adjustmentResult.adjustment,
      newMacros: adjustmentResult.newMacros,
      notes: adjustmentResult.reason,
    });

    incrementPhaseWeek();
    setShowCheckIn(false);
  };

  // Determine if check-in is due (7+ days since last)
  const checkInDue = useMemo(() => {
    if (!activeDietPhase) return false;
    const phaseCheckIns = weeklyCheckIns.filter(c => c.phaseId === activeDietPhase.id);
    if (phaseCheckIns.length === 0) {
      // Due if phase started 7+ days ago
      const daysSinceStart = Math.floor(
        (Date.now() - new Date(activeDietPhase.startDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceStart >= 7;
    }
    const lastCheckIn = phaseCheckIns[phaseCheckIns.length - 1];
    const daysSinceLast = Math.floor(
      (Date.now() - new Date(lastCheckIn.date).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceLast >= 7;
  }, [activeDietPhase, weeklyCheckIns]);

  const unitLabel = user?.weightUnit === 'lbs' ? 'lbs' : 'kg';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between bg-gradient-to-r from-violet-500/20 to-transparent"
      >
        <div className="flex items-center gap-3">
          <Scale className="w-5 h-5 text-violet-400" />
          <div className="text-left">
            <p className="text-sm font-medium text-white">Diet Coach</p>
            <p className="text-xs text-grappler-400">
              {activeDietPhase
                ? `${GOAL_CONFIG[activeDietPhase.goal].label} — Week ${activeDietPhase.weeksCompleted + 1}`
                : 'Evidence-based nutrition coaching'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {checkInDue && activeDietPhase && (
            <span className="px-2 py-0.5 text-xs font-medium bg-sky-500/20 text-sky-400 rounded-full">
              Check-in due
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-grappler-400" /> : <ChevronDown className="w-4 h-4 text-grappler-400" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-2 space-y-3">
              {/* Periodized nutrition timeline */}
              {nutritionPeriodPlan && nutritionPeriodPlan.phases.length > 0 && (
                <PhaseTimeline
                  plan={nutritionPeriodPlan}
                  phaseContext={phaseContext}
                  onAdvance={handleAdvancePhase}
                  onInsertDietBreak={handleInsertDietBreak}
                />
              )}

              {/* Generate plan CTA (when no plan exists but profile is complete) */}
              {!nutritionPeriodPlan && hasProfileData && !showSetup && activeDietPhase && (
                <button
                  onClick={handleGeneratePlan}
                  className="w-full py-2 px-3 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 rounded-lg text-xs text-violet-300 transition-colors"
                >
                  Generate annual nutrition plan
                </button>
              )}

              {/* No active phase — show setup */}
              {!activeDietPhase && !showSetup && (
                <div className="space-y-3">
                  <p className="text-xs text-grappler-400">
                    Set a nutrition goal and get adaptive macro coaching. Your macros adjust weekly based on your actual weight trend.
                  </p>
                  <button
                    onClick={() => {
                      setShowSetup(true);
                      // Skip info step if profile data is complete from onboarding
                      setSetupStep(hasProfileData ? 'goal' : 'info');
                    }}
                    className="w-full py-2.5 px-4 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 rounded-xl text-sm font-medium text-violet-300 transition-colors"
                  >
                    Start a Diet Phase
                  </button>
                </div>
              )}

              {/* Setup flow — Step 1: Your info */}
              {showSetup && setupStep === 'info' && (
                <div className="space-y-3">
                  <p className="text-xs text-grappler-400 font-medium uppercase tracking-wide">Your Info</p>
                  <p className="text-xs text-grappler-400">
                    Used for Mifflin-St Jeor BMR — the most accurate validated formula (ADA 2005).
                  </p>

                  {/* Weight */}
                  <div>
                    <label className="text-xs text-grappler-400 mb-1 block">Weight (kg)</label>
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-grappler-500" />
                      <input
                        type="number"
                        value={formWeight}
                        onChange={(e) => setFormWeight(e.target.value)}
                        className="flex-1 bg-grappler-800/60 border border-grappler-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-grappler-600 focus-visible:outline-none focus-visible:border-violet-500/50"
                        placeholder="80"
                        min="30"
                        max="250"
                      />
                    </div>
                  </div>

                  {/* Height */}
                  <div>
                    <label className="text-xs text-grappler-400 mb-1 block">Height (cm)</label>
                    <div className="flex items-center gap-2">
                      <Ruler className="w-4 h-4 text-grappler-500" />
                      <input
                        type="number"
                        value={formHeight}
                        onChange={(e) => setFormHeight(e.target.value)}
                        className="flex-1 bg-grappler-800/60 border border-grappler-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-grappler-600 focus-visible:outline-none focus-visible:border-violet-500/50"
                        placeholder="175"
                        min="120"
                        max="230"
                      />
                    </div>
                  </div>

                  {/* Sex */}
                  <div>
                    <label className="text-xs text-grappler-400 mb-1 block">Biological sex (for BMR calculation)</label>
                    <div className="flex gap-2">
                      {(['male', 'female'] as BiologicalSex[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => setFormSex(s)}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                            formSex === s
                              ? 'bg-violet-500/20 border-violet-500/50 border text-violet-300'
                              : 'bg-grappler-800/40 border border-grappler-700/30 text-grappler-400 hover:border-grappler-600/50'
                          }`}
                        >
                          <User className="w-3.5 h-3.5" />
                          {s === 'male' ? 'Male' : 'Female'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* BMR preview */}
                  {formWeight && formHeight && (
                    <div className="p-2.5 bg-grappler-800/30 rounded-lg">
                      <p className="text-xs text-grappler-400">
                        {latestBodyFat ? (
                          <>Estimated BMR (Cunningham): {Math.round(500 + 22 * bodyWeightKg * (1 - latestBodyFat / 100))} kcal/day &middot; BF {latestBodyFat}%</>
                        ) : (
                          <>Estimated BMR (Mifflin-St Jeor): {Math.round(10 * bodyWeightKg + 6.25 * heightCm - 5 * age + (formSex === 'male' ? 5 : -161))} kcal/day &middot; Age {age}</>
                        )}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowSetup(false); setSetupStep('info'); }}
                      className="flex-1 py-2 text-xs text-grappler-400 hover:text-grappler-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setSetupStep('goal')}
                      className="flex-1 py-2 bg-violet-500 hover:bg-violet-600 rounded-xl text-xs font-medium text-white transition-colors flex items-center justify-center gap-1"
                    >
                      Next <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Setup flow — Step 2: Choose goal */}
              {showSetup && setupStep === 'goal' && (
                <div className="space-y-3">
                  <p className="text-xs text-grappler-400 font-medium uppercase tracking-wide">Choose Your Goal</p>
                  <div className="space-y-2">
                    {(Object.keys(GOAL_CONFIG) as DietGoal[]).map((goal) => {
                      const config = GOAL_CONFIG[goal];
                      const isSelected = selectedGoal === goal;
                      const previewMacros = calculateMacros({ bodyWeightKg, heightCm, age, sex: formSex, goal, activityMultiplier, weeklyTrainingSessions: recentTrainingSessions, weeklyLiftingSessions: recentLiftingSessions });
                      return (
                        <button
                          key={goal}
                          onClick={() => setSelectedGoal(goal)}
                          className={`w-full p-3 rounded-xl text-left transition-all ${
                            isSelected
                              ? 'bg-violet-500/20 border-violet-500/50 border'
                              : 'bg-grappler-800/40 border border-grappler-700/30 hover:border-grappler-600/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              {config.icon}
                              <div>
                                <p className={`text-sm font-medium ${isSelected ? config.color : 'text-grappler-200'}`}>
                                  {config.label}
                                </p>
                                <p className="text-xs text-grappler-400">{config.description}</p>
                              </div>
                            </div>
                            {isSelected && previewMacros && (
                              <div className="text-right">
                                <p className="text-xs text-grappler-300">{previewMacros.calories} kcal</p>
                                <p className="text-xs text-grappler-400">
                                  {previewMacros.protein}P / {previewMacros.carbs}C / {previewMacros.fat}F
                                </p>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-2.5 bg-grappler-800/30 rounded-lg flex items-center justify-between">
                    <p className="text-xs text-grappler-400">
                      {Math.round(bodyWeightKg)}kg &middot; {Math.round(heightCm)}cm &middot; {formSex} &middot; age {age}
                    </p>
                    <button
                      onClick={() => setSetupStep('info')}
                      className="text-xs text-violet-400 hover:text-violet-300 underline ml-2 flex-shrink-0"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowSetup(false); setSetupStep('info'); }}
                      className="flex-1 py-2 text-xs text-grappler-400 hover:text-grappler-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleStartPhase}
                      className="flex-1 py-2 bg-violet-500 hover:bg-violet-600 rounded-xl text-xs font-medium text-white transition-colors"
                    >
                      Start {GOAL_CONFIG[selectedGoal].label}
                    </button>
                  </div>
                </div>
              )}

              {/* Active phase */}
              {activeDietPhase && !showSetup && (
                <div className="space-y-3">
                  {/* Phase info + macros */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 bg-grappler-800/40 rounded-lg">
                      <p className="text-xs text-grappler-400 mb-1">Current Phase</p>
                      <div className="flex items-center gap-1.5">
                        {GOAL_CONFIG[activeDietPhase.goal].icon}
                        <span className={`text-sm font-medium ${GOAL_CONFIG[activeDietPhase.goal].color}`}>
                          {GOAL_CONFIG[activeDietPhase.goal].label}
                        </span>
                      </div>
                      <p className="text-xs text-grappler-400 mt-1">Week {activeDietPhase.weeksCompleted + 1}</p>
                    </div>
                    <div className="p-2.5 bg-grappler-800/40 rounded-lg">
                      <p className="text-xs text-grappler-400 mb-1">Daily Targets</p>
                      <p className="text-sm font-medium text-white">{macroTargets.calories} kcal</p>
                      <p className="text-xs text-grappler-400">
                        {macroTargets.protein}P / {macroTargets.carbs}C / {macroTargets.fat}F
                      </p>
                    </div>
                  </div>

                  {/* Energy Availability indicator (shows when on a cut) */}
                  {energyAvailability && activeDietPhase.goal === 'cut' && (
                    <div className={`p-2.5 rounded-lg border ${
                      energyAvailability.status === 'critical' ? 'bg-red-500/10 border-red-500/30' :
                      energyAvailability.status === 'low' ? 'bg-blue-500/10 border-blue-500/30' :
                      energyAvailability.status === 'caution' ? 'bg-yellow-500/10 border-yellow-500/30' :
                      'bg-green-500/10 border-green-500/30'
                    }`}>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-grappler-400">Energy Availability</p>
                        <span className={`text-xs font-medium ${
                          energyAvailability.status === 'critical' ? 'text-red-400' :
                          energyAvailability.status === 'low' ? 'text-blue-400' :
                          energyAvailability.status === 'caution' ? 'text-yellow-400' :
                          'text-green-400'
                        }`}>
                          {Math.round(energyAvailability.ea)} kcal/kg FFM
                        </span>
                      </div>
                      <p className="text-xs text-grappler-400 mt-0.5">{energyAvailability.message}</p>
                      {energyAvailability.status === 'critical' && (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          RED-S risk: Increase intake or reduce training volume
                        </p>
                      )}
                    </div>
                  )}

                  {/* Fight Camp Phase (combat athletes) */}
                  {isCombatAthlete && fightCampPhase && nearestCompetition && (
                    <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-blue-400" />
                          <p className="text-xs font-medium text-blue-300">
                            {fightCampPhase.replace(/_/g, ' ')}
                          </p>
                        </div>
                        <span className="text-xs text-grappler-400">
                          {daysToCompetition}d to {nearestCompetition.name}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Switch Goal */}
                  {!showSwitchGoal ? (
                    <button
                      onClick={() => setShowSwitchGoal(true)}
                      className="w-full py-2 px-3 bg-grappler-800/40 hover:bg-grappler-800/60 rounded-xl text-xs text-grappler-300 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-violet-400" />
                      Switch Goal
                    </button>
                  ) : (
                    <div className="p-3 bg-grappler-800/60 rounded-xl space-y-2 border border-violet-500/20">
                      <p className="text-xs font-medium text-violet-300">Switch to a new goal</p>
                      <div className="space-y-1.5">
                        {(Object.keys(GOAL_CONFIG) as DietGoal[]).map((goal) => {
                          const config = GOAL_CONFIG[goal];
                          const isCurrent = activeDietPhase?.goal === goal;
                          const previewMacros = calculateMacros({ bodyWeightKg, heightCm, age, sex: formSex, goal, activityMultiplier, weeklyTrainingSessions: recentTrainingSessions, weeklyLiftingSessions: recentLiftingSessions });
                          return (
                            <button
                              key={goal}
                              onClick={() => handleSwitchGoal(goal)}
                              className={`w-full p-2.5 rounded-lg text-left transition-all flex items-center justify-between ${
                                isCurrent
                                  ? 'bg-violet-500/20 border border-violet-500/40'
                                  : 'bg-grappler-800/40 border border-grappler-700/30 hover:border-violet-500/30'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {config.icon}
                                <div>
                                  <p className={`text-xs font-medium ${isCurrent ? config.color : 'text-grappler-200'}`}>
                                    {config.label}
                                    {isCurrent && <span className="text-xs text-grappler-400 ml-1.5">(current)</span>}
                                  </p>
                                  <p className="text-xs text-grappler-400">{config.description}</p>
                                </div>
                              </div>
                              {!isCurrent && previewMacros && (
                                <div className="text-right flex-shrink-0">
                                  <p className="text-xs text-grappler-300">{previewMacros.calories} kcal</p>
                                  <p className="text-xs text-grappler-400">
                                    {previewMacros.protein}P / {previewMacros.carbs}C / {previewMacros.fat}F
                                  </p>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => setShowSwitchGoal(false)}
                        className="w-full py-1.5 text-xs text-grappler-400 hover:text-grappler-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Weight trend */}
                  {bodyWeightLog.length >= 3 && (
                    <div className="p-2.5 bg-grappler-800/40 rounded-lg">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-grappler-400">Weight Trend</p>
                        <div className="flex items-center gap-1">
                          {weightTrend.weeklyChange < -0.1 ? (
                            <TrendingDown className="w-3 h-3 text-red-400" />
                          ) : weightTrend.weeklyChange > 0.1 ? (
                            <TrendingUp className="w-3 h-3 text-green-400" />
                          ) : (
                            <Minus className="w-3 h-3 text-blue-400" />
                          )}
                          <span className={`text-xs font-medium ${
                            weightTrend.weeklyChange < -0.1 ? 'text-red-400' :
                            weightTrend.weeklyChange > 0.1 ? 'text-green-400' :
                            'text-blue-400'
                          }`}>
                            {weightTrend.weeklyChange > 0 ? '+' : ''}{weightTrend.weeklyChange} {unitLabel}/wk
                          </span>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-white mt-1">
                        {weightTrend.current} {unitLabel}
                      </p>
                      {weightTrend.weeksAtPlateau >= 2 && (
                        <p className="text-xs text-sky-400 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Plateau detected ({weightTrend.weeksAtPlateau} weeks)
                        </p>
                      )}
                    </div>
                  )}

                  {/* Adherence */}
                  <div className="p-2.5 bg-grappler-800/40 rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-grappler-400">7-Day Logging</p>
                      <span className={`text-xs font-medium ${
                        adherence >= 80 ? 'text-green-400' :
                        adherence >= 60 ? 'text-sky-400' :
                        'text-red-400'
                      }`}>
                        {adherence}% adherence
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 bg-grappler-700/50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${adherence}%` }}
                        className={`h-full rounded-full ${
                          adherence >= 80 ? 'bg-green-500' :
                          adherence >= 60 ? 'bg-sky-500' :
                          'bg-red-500'
                        }`}
                      />
                    </div>
                    {adherence < 70 && (
                      <p className="text-xs text-grappler-400 mt-1">
                        Log at least 2 meals/day for accurate macro adjustments
                      </p>
                    )}
                  </div>

                  {/* Phase recommendation */}
                  {(phaseStatus.shouldTakeBreak || phaseStatus.shouldTransition) && (
                    <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-sky-300">{phaseStatus.suggestion}</p>
                          {phaseStatus.shouldTransition && phaseStatus.nextGoal && (
                            <button
                              onClick={() => {
                                const newMacros = calculateMacros({
                                  bodyWeightKg,
                                  heightCm,
                                  age,
                                  sex: formSex,
                                  goal: phaseStatus.nextGoal!,
                                  activityMultiplier,
                                  weeklyTrainingSessions: recentTrainingSessions,
                                  weeklyLiftingSessions: recentLiftingSessions,
                                });
                                if (!newMacros) return; // Profile incomplete
                                endDietPhase();
                                startDietPhase({
                                  goal: phaseStatus.nextGoal!,
                                  startDate: new Date().toISOString().split('T')[0],
                                  startWeightKg: bodyWeightKg,
                                  targetRatePerWeek: getTargetRate(phaseStatus.nextGoal!, bodyWeightKg, formSex),
                                  currentMacros: newMacros,
                                  weeksCompleted: 0,
                                  isActive: true,
                                });
                              }}
                              className="mt-2 flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors"
                            >
                              Switch to {GOAL_CONFIG[phaseStatus.nextGoal].label} <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Weekly check-in — prominent CTA */}
                  {checkInDue && !showCheckIn && (
                    <button
                      onClick={() => setShowCheckIn(true)}
                      className="w-full p-4 bg-gradient-to-r from-violet-500/20 to-purple-500/20 hover:from-violet-500/30 hover:to-purple-500/30 border border-violet-500/30 rounded-xl transition-all active:scale-[0.98] group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0 animate-pulse">
                          <Target className="w-5 h-5 text-violet-400" />
                        </div>
                        <div className="text-left flex-1">
                          <p className="text-sm font-bold text-violet-200">Weekly Check-in</p>
                          <p className="text-xs text-grappler-400 mt-0.5">
                            Review your progress and adjust macros
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-violet-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  )}

                  {/* Check-in flow — full coaching card */}
                  {showCheckIn && (() => {
                    const preview = calculateWeeklyAdjustment({
                      currentMacros: macroTargets,
                      goal: activeDietPhase.goal,
                      targetRatePerWeek: activeDietPhase.targetRatePerWeek,
                      actualWeeklyChange: weightTrend.weeklyChange * (user?.weightUnit === 'lbs' ? 0.453592 : 1),
                      weeksAtPlateau: weightTrend.weeksAtPlateau,
                      adherencePercent: adherence,
                      sex: formSex,
                      isIll,
                    });
                    const changeColor = weightTrend.weeklyChange < -0.1 ? 'text-red-400' :
                      weightTrend.weeklyChange > 0.1 ? 'text-green-400' : 'text-blue-400';
                    const adjColor = preview.adjustment === 'maintain' ? 'blue' :
                      preview.adjustment === 'decrease' ? 'red' : 'green';

                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border border-violet-500/30 overflow-hidden"
                      >
                        {/* Header */}
                        <div className="p-4 bg-gradient-to-r from-violet-500/15 to-purple-500/15 border-b border-violet-500/20">
                          <div className="flex items-center gap-2 mb-1">
                            <Target className="w-4 h-4 text-violet-400" />
                            <h3 className="text-sm font-bold text-violet-200">Weekly Check-in</h3>
                          </div>
                          <p className="text-xs text-grappler-400">
                            {activeDietPhase.goal === 'cut' ? 'Cutting phase' :
                             activeDietPhase.goal === 'bulk' ? 'Building phase' : 'Maintenance'} — Week {activeDietPhase.weeksCompleted + 1}
                          </p>
                        </div>

                        {/* Stats grid */}
                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-grappler-800/60 rounded-lg p-2.5">
                              <p className="text-lg font-bold text-white">{weightTrend.current}</p>
                              <p className="text-xs text-grappler-400 uppercase">{unitLabel} trend</p>
                            </div>
                            <div className="bg-grappler-800/60 rounded-lg p-2.5">
                              <p className={`text-lg font-bold ${changeColor}`}>
                                {weightTrend.weeklyChange > 0 ? '+' : ''}{weightTrend.weeklyChange}
                              </p>
                              <p className="text-xs text-grappler-400 uppercase">{unitLabel}/wk</p>
                            </div>
                            <div className="bg-grappler-800/60 rounded-lg p-2.5">
                              <p className={`text-lg font-bold ${adherence >= 70 ? 'text-green-400' : adherence >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {adherence}%
                              </p>
                              <p className="text-xs text-grappler-400 uppercase">Logged</p>
                            </div>
                          </div>

                          {/* Adherence bar */}
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-grappler-400">Logging consistency</span>
                              <span className={adherence >= 70 ? 'text-green-400' : 'text-grappler-400'}>{adherence >= 70 ? 'Good' : adherence >= 50 ? 'Needs work' : 'Low'}</span>
                            </div>
                            <div className="h-1.5 bg-grappler-700/60 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${adherence >= 70 ? 'bg-green-400' : adherence >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
                                style={{ width: `${Math.min(100, adherence)}%` }}
                              />
                            </div>
                          </div>

                          {/* Adjustment decision card */}
                          <div className={`p-3 rounded-xl ${
                            preview.adjustment === 'maintain' ? 'bg-blue-500/10 border border-blue-500/20' :
                            preview.adjustment === 'decrease' ? 'bg-red-500/10 border border-red-500/20' :
                            'bg-green-500/10 border border-green-500/20'
                          }`}>
                            <div className="flex items-start gap-2.5">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                preview.adjustment === 'maintain' ? 'bg-blue-500/20' :
                                preview.adjustment === 'decrease' ? 'bg-red-500/20' :
                                'bg-green-500/20'
                              }`}>
                                <CheckCircle2 className={`w-4 h-4 ${
                                  preview.adjustment === 'maintain' ? 'text-blue-400' :
                                  preview.adjustment === 'decrease' ? 'text-red-400' :
                                  'text-green-400'
                                }`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold ${
                                  preview.adjustment === 'maintain' ? 'text-blue-300' :
                                  preview.adjustment === 'decrease' ? 'text-red-300' :
                                  'text-green-300'
                                }`}>
                                  {preview.adjustment === 'maintain' ? 'Stay the course' :
                                   preview.adjustment === 'decrease' ? 'Pulling back calories' :
                                   'Fueling up'}
                                </p>
                                <p className="text-xs text-grappler-400 mt-0.5 leading-relaxed">{preview.reason}</p>

                                {/* Before → After macro comparison */}
                                {preview.adjustment !== 'maintain' && (
                                  <div className="mt-2 space-y-1">
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="text-grappler-500 min-w-[40px]">Now:</span>
                                      <span className="text-grappler-300">
                                        {macroTargets.calories} kcal · {macroTargets.protein}P / {macroTargets.carbs}C / {macroTargets.fat}F
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className={`font-medium min-w-[40px] ${
                                        preview.adjustment === 'decrease' ? 'text-red-400' : 'text-green-400'
                                      }`}>New:</span>
                                      <span className={`font-medium ${
                                        preview.adjustment === 'decrease' ? 'text-red-300' : 'text-green-300'
                                      }`}>
                                        {preview.newMacros.calories} kcal · {preview.newMacros.protein}P / {preview.newMacros.carbs}C / {preview.newMacros.fat}F
                                      </span>
                                    </div>
                                    {/* Delta chips */}
                                    <div className="flex gap-1.5 mt-1 flex-wrap">
                                      {(() => {
                                        const deltas = [
                                          { label: 'kcal', delta: preview.newMacros.calories - macroTargets.calories },
                                          { label: 'P', delta: preview.newMacros.protein - macroTargets.protein },
                                          { label: 'C', delta: preview.newMacros.carbs - macroTargets.carbs },
                                          { label: 'F', delta: preview.newMacros.fat - macroTargets.fat },
                                        ].filter(d => d.delta !== 0);
                                        return deltas.map(d => (
                                          <span key={d.label} className={`text-xs px-1.5 py-0.5 rounded-full ${
                                            d.delta > 0 ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                                          }`}>
                                            {d.delta > 0 ? '+' : ''}{d.delta} {d.label}
                                          </span>
                                        ));
                                      })()}
                                    </div>
                                  </div>
                                )}

                                {preview.alert && (
                                  <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                    <p className="text-xs text-amber-300 flex items-start gap-1.5">
                                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                      {preview.alert}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => setShowCheckIn(false)}
                              className="flex-1 py-2.5 text-xs font-medium text-grappler-400 hover:text-grappler-200 bg-grappler-800/40 hover:bg-grappler-800/60 rounded-xl transition-colors"
                            >
                              Skip this week
                            </button>
                            <button
                              onClick={handleCheckIn}
                              className="flex-1 py-2.5 bg-violet-500 hover:bg-violet-600 rounded-xl text-xs font-bold text-white transition-colors active:scale-[0.98]"
                            >
                              {preview.adjustment === 'maintain' ? 'Confirm' : 'Apply Changes'}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })()}

                  {/* Meal Reminders */}
                  <button
                    onClick={() => setShowReminders(!showReminders)}
                    className="w-full py-2 px-3 bg-grappler-800/40 hover:bg-grappler-800/60 rounded-xl text-xs text-grappler-300 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {mealReminders.enabled ? (
                        <Bell className="w-3.5 h-3.5 text-violet-400" />
                      ) : (
                        <BellOff className="w-3.5 h-3.5 text-grappler-500" />
                      )}
                      <span>Meal Reminders</span>
                    </div>
                    <span className={`text-xs ${mealReminders.enabled ? 'text-violet-400' : 'text-grappler-400'}`}>
                      {mealReminders.enabled ? 'On' : 'Off'}
                    </span>
                  </button>

                  <AnimatePresence>
                    {showReminders && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-3 bg-grappler-800/30 rounded-xl space-y-3 border border-grappler-700/30">
                          {/* Master toggle */}
                          <button
                            onClick={() => setMealReminders({ enabled: !mealReminders.enabled })}
                            className={`w-full py-2 rounded-lg text-xs font-medium transition-all ${
                              mealReminders.enabled
                                ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300'
                                : 'bg-grappler-800/40 border border-grappler-700/30 text-grappler-400'
                            }`}
                          >
                            {mealReminders.enabled ? 'Reminders Enabled' : 'Enable Reminders'}
                          </button>

                          {mealReminders.enabled && (
                            <div className="space-y-2">
                              <p className="text-xs text-grappler-400">
                                Get notified when it&apos;s time to log meals. Requires notification permission.
                              </p>

                              {/* Per-meal toggles with time */}
                              {(['breakfast', 'lunch', 'dinner'] as const).map((meal) => (
                                <div key={meal} className="flex items-center justify-between gap-2">
                                  <button
                                    onClick={() =>
                                      setMealReminders({
                                        enabledMeals: {
                                          ...mealReminders.enabledMeals,
                                          [meal]: !mealReminders.enabledMeals[meal],
                                        },
                                      })
                                    }
                                    className={`flex items-center gap-2 text-xs transition-colors ${
                                      mealReminders.enabledMeals[meal] ? 'text-grappler-200' : 'text-grappler-400 line-through'
                                    }`}
                                  >
                                    <div className={`w-3 h-3 rounded border ${
                                      mealReminders.enabledMeals[meal]
                                        ? 'bg-violet-500 border-violet-500'
                                        : 'border-grappler-600'
                                    }`} />
                                    {meal.charAt(0).toUpperCase() + meal.slice(1)}
                                  </button>

                                  {mealReminders.enabledMeals[meal] && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-grappler-500" />
                                      <input
                                        type="time"
                                        value={mealReminders.reminderTimes[meal]}
                                        onChange={(e) =>
                                          setMealReminders({
                                            reminderTimes: {
                                              ...mealReminders.reminderTimes,
                                              [meal]: e.target.value,
                                            },
                                          })
                                        }
                                        className="bg-grappler-800/60 border border-grappler-700/30 rounded px-2 py-0.5 text-xs text-grappler-200 focus-visible:outline-none focus-visible:border-violet-500/50"
                                      />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Diet History + Share */}
                  <DietHistorySection
                    dietPhaseHistory={dietPhaseHistory}
                    weeklyCheckIns={weeklyCheckIns}
                    activeDietPhase={activeDietPhase}
                    showHistory={showHistory}
                    setShowHistory={setShowHistory}
                    copiedShare={copiedShare}
                    setCopiedShare={setCopiedShare}
                    unitLabel={unitLabel}
                    onDelete={deleteDietPhaseFromHistory}
                    onEdit={editDietPhaseInHistory}
                  />

                  {/* End phase */}
                  <button
                    onClick={() => {
                      endDietPhase();
                      setShowSetup(false);
                      setShowSwitchGoal(false);
                    }}
                    className="w-full text-xs text-grappler-400 hover:text-red-400 transition-colors py-1.5"
                  >
                    End current phase
                  </button>
                </div>
              )}

              {/* History shown even without active phase */}
              {!activeDietPhase && !showSetup && dietPhaseHistory.length > 0 && (
                <DietHistorySection
                  dietPhaseHistory={dietPhaseHistory}
                  weeklyCheckIns={weeklyCheckIns}
                  activeDietPhase={null}
                  showHistory={showHistory}
                  setShowHistory={setShowHistory}
                  copiedShare={copiedShare}
                  setCopiedShare={setCopiedShare}
                  unitLabel={unitLabel}
                  onDelete={deleteDietPhaseFromHistory}
                  onEdit={editDietPhaseInHistory}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Phase Timeline ───

const PHASE_COLORS: Record<NutritionPhaseType, { bg: string; border: string; text: string; label: string }> = {
  massing: { bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-400', label: 'Massing' },
  maintenance: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400', label: 'Maintenance' },
  mini_cut: { bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-400', label: 'Mini-Cut' },
  fat_loss: { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-400', label: 'Fat Loss' },
  diet_break: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/30', text: 'text-cyan-400', label: 'Diet Break' },
  fight_camp: { bg: 'bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-400', label: 'Fight Camp' },
  recovery: { bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400', label: 'Recovery' },
};

function PhaseTimeline({
  plan,
  phaseContext,
  onAdvance,
  onInsertDietBreak,
}: {
  plan: import('@/lib/types').NutritionPeriodPlan;
  phaseContext: import('@/lib/types').ActivePhaseContext | null;
  onAdvance: () => void;
  onInsertDietBreak: () => void;
}) {
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

  // Calculate total plan duration for proportional widths
  const totalWeeks = plan.phases.reduce((s, p) => s + p.plannedWeeks, 0);

  return (
    <div className="space-y-2">
      {/* Timeline bar — horizontal, scrollable */}
      <div className="flex gap-0.5 h-8 rounded-lg overflow-hidden">
        {plan.phases.map((phase, i) => {
          const colors = PHASE_COLORS[phase.type];
          const isActive = i === plan.activePhaseIndex;
          const isPast = i < plan.activePhaseIndex;
          const widthPct = Math.max(8, (phase.plannedWeeks / totalWeeks) * 100);

          return (
            <button
              key={phase.id}
              onClick={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)}
              className={`
                relative flex items-center justify-center text-xs font-medium transition-all
                ${colors.bg} ${isActive ? `${colors.border} border ring-1 ring-white/10` : 'border border-transparent'}
                ${isPast ? 'opacity-40' : ''}
                ${isActive ? 'z-10' : ''}
              `}
              style={{ width: `${widthPct}%`, minWidth: '32px' }}
              title={`${colors.label} · ${phase.plannedWeeks}w`}
            >
              <span className={`truncate px-1 ${colors.text}`}>
                {phase.plannedWeeks}w
              </span>
              {isActive && (
                <span className="absolute -bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Active phase context line */}
      {phaseContext && (
        <div className="flex items-center justify-between">
          <p className={`text-xs font-medium ${PHASE_COLORS[phaseContext.phase.type].text}`}>
            {phaseContext.label}
          </p>
          {phaseContext.lookAhead && (
            <p className="text-xs text-grappler-400">{phaseContext.lookAhead}</p>
          )}
        </div>
      )}

      {/* Phase transition alert */}
      {phaseContext?.transitionRecommended && phaseContext.transitionReason && (
        <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-amber-300">
                {phaseContext.transitionReason === 'phase_duration_complete'
                  ? 'Phase complete — ready to transition'
                  : phaseContext.transitionReason === 'metabolic_adaptation'
                  ? 'Weight stalled despite good adherence — diet break recommended'
                  : phaseContext.transitionReason === 'adherence_breakdown'
                  ? 'Adherence dropping — consider switching to maintenance'
                  : phaseContext.transitionReason === 'body_fat_threshold'
                  ? 'Weight gain rate too fast — time to reassess'
                  : 'Phase transition recommended'}
              </p>
              <div className="flex gap-2 mt-1.5">
                {phaseContext.transitionReason === 'metabolic_adaptation' ? (
                  <button
                    onClick={onInsertDietBreak}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
                  >
                    Insert diet break
                  </button>
                ) : (
                  <button
                    onClick={onAdvance}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors flex items-center gap-0.5"
                  >
                    {phaseContext.recommendedNextPhase
                      ? `Switch to ${PHASE_COLORS[phaseContext.recommendedNextPhase]?.label || phaseContext.recommendedNextPhase}`
                      : 'Advance to next phase'}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expanded phase detail */}
      <AnimatePresence>
        {expandedPhase && (() => {
          const phase = plan.phases.find(p => p.id === expandedPhase);
          if (!phase) return null;
          const colors = PHASE_COLORS[phase.type];
          const isActive = plan.phases.indexOf(phase) === plan.activePhaseIndex;

          return (
            <motion.div
              key={expandedPhase}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className={`p-2.5 ${colors.bg} ${colors.border} border rounded-lg space-y-1.5`}>
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-medium ${colors.text}`}>{colors.label}</p>
                  <p className="text-xs text-grappler-400">
                    {phase.startDate} → {phase.endDate}
                  </p>
                </div>
                <p className="text-xs text-grappler-400">{phase.reasoning}</p>
                <div className="flex gap-3 text-xs text-grappler-400">
                  <span>{phase.plannedWeeks} weeks</span>
                  <span>·</span>
                  <span>{Math.round(phase.calorieFactor * 100)}% TDEE</span>
                  <span>·</span>
                  <span>{phase.proteinGKg}g/kg protein</span>
                </div>
                <div className="flex gap-3 text-xs text-grappler-400">
                  <span>Training: {phase.pairedTrainingFocus}</span>
                  {phase.dietBreakRecommended && <span className="text-cyan-400">· Diet break at midpoint</span>}
                </div>
                {isActive && phaseContext && (
                  <div className="pt-1 border-t border-white/5">
                    <p className="text-xs text-grappler-400">
                      Week {phaseContext.weeksCompleted + 1} of {phase.plannedWeeks} · {phaseContext.weeksRemaining} weeks remaining
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

// ─── Diet History & Share Section ───

function DietHistorySection({
  dietPhaseHistory,
  weeklyCheckIns,
  activeDietPhase,
  showHistory,
  setShowHistory,
  copiedShare,
  setCopiedShare,
  unitLabel,
  onDelete,
  onEdit,
}: {
  dietPhaseHistory: import('@/lib/types').CompletedDietPhase[];
  weeklyCheckIns: import('@/lib/types').WeeklyCheckIn[];
  activeDietPhase: import('@/lib/types').DietPhase | null;
  showHistory: boolean;
  setShowHistory: (v: boolean) => void;
  copiedShare: boolean;
  setCopiedShare: (v: boolean) => void;
  unitLabel: string;
  onDelete: (id: string) => void;
  onEdit: (id: string, updates: Partial<import('@/lib/types').CompletedDietPhase>) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ endWeightKg: '', calories: '' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (dietPhaseHistory.length === 0 && !activeDietPhase) return null;

  const sortedHistory = [...dietPhaseHistory].sort(
    (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
  );

  // Aggregate stats
  const totalPhases = dietPhaseHistory.length;
  const totalWeeks = dietPhaseHistory.reduce((s, p) => s + p.weeksCompleted, 0)
    + (activeDietPhase?.weeksCompleted || 0);
  const totalLost = dietPhaseHistory
    .filter(p => p.totalWeightChangeKg < 0)
    .reduce((s, p) => s + Math.abs(p.totalWeightChangeKg), 0);
  const totalGained = dietPhaseHistory
    .filter(p => p.totalWeightChangeKg > 0)
    .reduce((s, p) => s + p.totalWeightChangeKg, 0);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatWeight = (kg: number) => {
    if (unitLabel === 'lbs') return `${Math.round(kg * 2.205 * 10) / 10} lbs`;
    return `${Math.round(kg * 10) / 10} kg`;
  };

  const parseWeightToKg = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return null;
    return unitLabel === 'lbs' ? num * 0.453592 : num;
  };

  const displayWeightValue = (kg: number) => {
    if (unitLabel === 'lbs') return (Math.round(kg * 2.205 * 10) / 10).toString();
    return (Math.round(kg * 10) / 10).toString();
  };

  const goalLabel = (goal: string) => {
    switch (goal) {
      case 'cut': return 'Fat Loss';
      case 'bulk': return 'Muscle Gain';
      default: return 'Maintain';
    }
  };

  const goalColor = (goal: string) => {
    switch (goal) {
      case 'cut': return 'text-red-400';
      case 'bulk': return 'text-green-400';
      default: return 'text-blue-400';
    }
  };

  const goalBg = (goal: string) => {
    switch (goal) {
      case 'cut': return 'bg-red-500/10 border-red-500/20';
      case 'bulk': return 'bg-green-500/10 border-green-500/20';
      default: return 'bg-blue-500/10 border-blue-500/20';
    }
  };

  const startEditing = (phase: import('@/lib/types').CompletedDietPhase) => {
    setEditingId(phase.id);
    setEditForm({
      endWeightKg: displayWeightValue(phase.endWeightKg),
      calories: phase.finalMacros.calories.toString(),
    });
    setConfirmDeleteId(null);
  };

  const saveEdit = (phase: import('@/lib/types').CompletedDietPhase) => {
    const newEndKg = parseWeightToKg(editForm.endWeightKg);
    const newCals = parseInt(editForm.calories);
    if (newEndKg === null || isNaN(newCals)) return;

    const roundedEndKg = Math.round(newEndKg * 10) / 10;
    onEdit(phase.id, {
      endWeightKg: roundedEndKg,
      totalWeightChangeKg: Math.round((roundedEndKg - phase.startWeightKg) * 10) / 10,
      finalMacros: { ...phase.finalMacros, calories: newCals },
    });
    setEditingId(null);
  };

  const handleShareProgress = async () => {
    const lines = ['Roots Gains — Diet Progress', ''];

    if (activeDietPhase) {
      lines.push(`Current: ${goalLabel(activeDietPhase.goal)} (Week ${activeDietPhase.weeksCompleted + 1})`);
      lines.push('');
    }

    if (totalPhases > 0) {
      lines.push(`${totalPhases} phase${totalPhases > 1 ? 's' : ''} completed over ${totalWeeks} weeks`);
      if (totalLost > 0) lines.push(`Total fat lost: ${formatWeight(totalLost)}`);
      if (totalGained > 0) lines.push(`Total gained: ${formatWeight(totalGained)}`);
      lines.push('');
      lines.push('History:');
      sortedHistory.slice(0, 5).forEach(p => {
        const change = p.totalWeightChangeKg;
        const sign = change > 0 ? '+' : '';
        lines.push(`  ${goalLabel(p.goal)} · ${formatDate(p.startDate)}–${formatDate(p.endDate)} · ${p.weeksCompleted}wk · ${sign}${formatWeight(change)}`);
      });
    }

    const text = lines.join('\n');

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Diet Progress', text });
        return;
      } catch {
        // fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    } catch {
      // silent fail
    }
  };

  return (
    <div className="space-y-2">
      {/* History toggle + Share */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex-1 py-2 px-3 bg-grappler-800/40 hover:bg-grappler-800/60 rounded-xl text-xs text-grappler-300 transition-colors flex items-center justify-center gap-1.5"
        >
          <History className="w-3.5 h-3.5 text-violet-400" />
          History{totalPhases > 0 && ` (${totalPhases})`}
        </button>
        {(totalPhases > 0 || activeDietPhase) && (
          <button
            onClick={handleShareProgress}
            className="py-2 px-3 bg-grappler-800/40 hover:bg-grappler-800/60 rounded-xl text-xs text-grappler-300 transition-colors flex items-center gap-1.5"
          >
            {copiedShare ? (
              <>
                <Copy className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400">Copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-violet-400" />
                Share
              </>
            )}
          </button>
        )}
      </div>

      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3">
              {/* Summary stats card */}
              {totalPhases > 0 && (
                <div className="p-3 bg-gradient-to-br from-violet-500/10 to-grappler-800/40 rounded-xl border border-violet-500/20">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Trophy className="w-4 h-4 text-violet-400" />
                    <p className="text-xs font-medium text-violet-300">Diet Journey</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{totalPhases}</p>
                      <p className="text-xs text-grappler-400">Phase{totalPhases !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{totalWeeks}</p>
                      <p className="text-xs text-grappler-400">Weeks</p>
                    </div>
                    <div className="text-center">
                      {totalLost > 0 ? (
                        <>
                          <p className="text-lg font-bold text-red-400">-{formatWeight(totalLost)}</p>
                          <p className="text-xs text-grappler-400">Lost</p>
                        </>
                      ) : totalGained > 0 ? (
                        <>
                          <p className="text-lg font-bold text-green-400">+{formatWeight(totalGained)}</p>
                          <p className="text-xs text-grappler-400">Gained</p>
                        </>
                      ) : (
                        <>
                          <p className="text-lg font-bold text-blue-400">0</p>
                          <p className="text-xs text-grappler-400">Net change</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Current phase in timeline */}
              {activeDietPhase && (
                <div className="relative pl-6">
                  <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-violet-500/40" />
                  <div className="absolute left-[5px] top-2.5 w-2.5 h-2.5 rounded-full bg-violet-500 ring-2 ring-violet-500/30 animate-pulse" />
                  <div className={`p-2.5 rounded-lg border ${goalBg(activeDietPhase.goal)}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-xs font-medium ${goalColor(activeDietPhase.goal)}`}>
                          {goalLabel(activeDietPhase.goal)}
                          <span className="text-xs text-grappler-400 ml-1.5">active</span>
                        </p>
                        <p className="text-xs text-grappler-400 mt-0.5">
                          Since {formatDate(activeDietPhase.startDate)} · Week {activeDietPhase.weeksCompleted + 1}
                        </p>
                      </div>
                      <p className="text-xs text-grappler-300">{activeDietPhase.currentMacros.calories} kcal</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Past phases timeline */}
              {sortedHistory.map((phase, i) => {
                const checkInsForPhase = weeklyCheckIns.filter(c => c.phaseId === phase.id);
                const avgAdherence = checkInsForPhase.length > 0
                  ? Math.round(checkInsForPhase.reduce((s, c) => s + c.adherenceScore, 0) / checkInsForPhase.length)
                  : null;
                const change = phase.totalWeightChangeKg;
                const sign = change > 0 ? '+' : '';
                const isEditing = editingId === phase.id;
                const isConfirmingDelete = confirmDeleteId === phase.id;

                return (
                  <div key={phase.id} className="relative pl-6">
                    <div className={`absolute left-2 top-0 w-0.5 ${i < sortedHistory.length - 1 || activeDietPhase ? 'bottom-0' : 'h-3'} bg-grappler-700/40`} />
                    <div className="absolute left-[5px] top-2.5 w-2.5 h-2.5 rounded-full bg-grappler-600 border border-grappler-500" />
                    <div className="p-2.5 bg-grappler-800/40 rounded-lg border border-grappler-700/30 group">
                      {/* Header row with actions */}
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-xs font-medium ${goalColor(phase.goal)}`}>
                          {goalLabel(phase.goal)}
                        </p>
                        <div className="flex items-center gap-1.5">
                          {!isEditing && !isConfirmingDelete && (
                            <>
                              <span className={`text-xs font-bold ${change < 0 ? 'text-red-400' : change > 0 ? 'text-green-400' : 'text-blue-400'}`}>
                                {sign}{formatWeight(change)}
                              </span>
                              <button
                                onClick={() => startEditing(phase)}
                                className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-grappler-700/50 transition-all"
                                title="Edit"
                              >
                                <Pencil className="w-3 h-3 text-grappler-400 hover:text-violet-400" />
                              </button>
                              <button
                                onClick={() => { setConfirmDeleteId(phase.id); setEditingId(null); }}
                                className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-grappler-700/50 transition-all"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3 text-grappler-400 hover:text-red-400" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Confirm delete bar */}
                      <AnimatePresence>
                        {isConfirmingDelete && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="flex items-center justify-between py-1.5 px-2 mb-1.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                              <p className="text-xs text-red-400">Remove this phase?</p>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => { onDelete(phase.id); setConfirmDeleteId(null); }}
                                  className="p-1 rounded bg-red-500/20 hover:bg-red-500/40 transition-colors"
                                  title="Confirm delete"
                                >
                                  <Trash2 className="w-3 h-3 text-red-400" />
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="p-1 rounded bg-grappler-700/40 hover:bg-grappler-700/60 transition-colors"
                                  title="Cancel"
                                >
                                  <X className="w-3 h-3 text-grappler-400" />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Edit form */}
                      <AnimatePresence>
                        {isEditing && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="py-1.5 px-2 mb-1.5 bg-violet-500/10 border border-violet-500/20 rounded-lg space-y-2">
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-grappler-400 w-16">End weight</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={editForm.endWeightKg}
                                  onChange={e => setEditForm(f => ({ ...f, endWeightKg: e.target.value }))}
                                  className="flex-1 bg-grappler-900/60 border border-grappler-700/40 rounded-md px-2 py-1 text-xs text-white focus-visible:outline-none focus-visible:border-violet-500/50"
                                />
                                <span className="text-xs text-grappler-400">{unitLabel}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-grappler-400 w-16">Calories</label>
                                <input
                                  type="number"
                                  value={editForm.calories}
                                  onChange={e => setEditForm(f => ({ ...f, calories: e.target.value }))}
                                  className="flex-1 bg-grappler-900/60 border border-grappler-700/40 rounded-md px-2 py-1 text-xs text-white focus-visible:outline-none focus-visible:border-violet-500/50"
                                />
                                <span className="text-xs text-grappler-400">kcal</span>
                              </div>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => saveEdit(phase)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-violet-500/20 hover:bg-violet-500/30 text-xs text-violet-300 transition-colors"
                                >
                                  <Check className="w-3 h-3" /> Save
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-grappler-700/40 hover:bg-grappler-700/60 text-xs text-grappler-400 transition-colors"
                                >
                                  <X className="w-3 h-3" /> Cancel
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Details */}
                      <div className="flex items-center gap-3 text-xs text-grappler-400">
                        <span>{formatDate(phase.startDate)} – {formatDate(phase.endDate)}</span>
                        <span>{phase.weeksCompleted} wk{phase.weeksCompleted !== 1 ? 's' : ''}</span>
                        {avgAdherence !== null && (
                          <span className={avgAdherence >= 70 ? 'text-green-400' : 'text-sky-400'}>
                            {avgAdherence}% adherence
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-grappler-400">
                        <span>{formatWeight(phase.startWeightKg)} → {formatWeight(phase.endWeightKg)}</span>
                        <span>·</span>
                        <span>{phase.finalMacros.calories} kcal final</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {sortedHistory.length === 0 && !activeDietPhase && (
                <p className="text-xs text-grappler-400 text-center py-2">
                  No completed phases yet. Your diet history will appear here.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
