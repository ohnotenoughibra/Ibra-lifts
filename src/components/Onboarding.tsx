'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import {
  Dumbbell,
  ChevronRight,
  ChevronLeft,
  Zap,
  Heart,
  Scale,
  Flame,
  Swords,
  Shield,
  Target,
  Sparkles,
  Eye,
  Trophy,
} from 'lucide-react';
import { BiologicalSex, ExperienceLevel, GoalFocus, SessionsPerWeek, OnboardingData, TrainingIdentity, CombatSport, CombatTrainingDay, DEFAULT_EQUIPMENT_PROFILES } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CalendarDays, Check } from 'lucide-react';

// ─── 2-Step Onboarding ─────────────────────────────────────────────────────
// Step 1: About You (identity + goal + stats — one scrollable card)
// Step 2: Schedule + disclaimer → go
const TOTAL_STEPS = 2;

export default function Onboarding({ authUserId }: { authUserId?: string }) {
  const { onboardingData, updateOnboardingData, completeOnboarding } = useAppStore();
  const currentStep = onboardingData.step || 1;
  // Clamp legacy step values (users mid-onboarding on old 4-step flow)
  const safeStep = Math.min(currentStep, TOTAL_STEPS);
  const setCurrentStep = (step: number) => updateOnboardingData({ step });

  // Apply smart defaults for deferred fields on mount
  useEffect(() => {
    const defaults: Partial<OnboardingData> = {};
    if (!onboardingData.equipment) defaults.equipment = 'full_gym';
    if (!onboardingData.availableEquipment || onboardingData.availableEquipment.length === 0) {
      defaults.availableEquipment = DEFAULT_EQUIPMENT_PROFILES[0].equipment;
    }
    if (!onboardingData.sessionDurationMinutes) defaults.sessionDurationMinutes = 60;
    if (!onboardingData.mesoCycleWeeks) defaults.mesoCycleWeeks = 5;
    if (!onboardingData.weightUnit) defaults.weightUnit = 'kg';
    // Clamp legacy step
    if (currentStep > TOTAL_STEPS) defaults.step = TOTAL_STEPS;
    if (Object.keys(defaults).length > 0) updateOnboardingData(defaults);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nextStep = () => {
    if (safeStep < TOTAL_STEPS) {
      setCurrentStep(safeStep + 1);
    } else {
      completeOnboarding(authUserId);
    }
  };

  const prevStep = () => {
    if (safeStep > 1) {
      setCurrentStep(safeStep - 1);
    }
  };

  const canProceed = () => {
    switch (safeStep) {
      case 1:
        // Identity + goal + name + weight + sex
        if (!onboardingData.trainingIdentity) return false;
        if (onboardingData.trainingIdentity === 'combat' && !onboardingData.combatSport && !(onboardingData.combatSports && onboardingData.combatSports.length > 0)) return false;
        if (!onboardingData.goalFocus) return false;
        if (onboardingData.name.length < 2) return false;
        if (!onboardingData.bodyWeightKg || onboardingData.bodyWeightKg <= 0) return false;
        if (!onboardingData.sex) return false;
        return true;
      case 2:
        // Schedule + disclaimer
        if ((onboardingData.trainingDays?.length || 0) < onboardingData.sessionsPerWeek) return false;
        if (!onboardingData.disclaimerAccepted) return false;
        return true;
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-grappler-900 bg-mesh px-4 py-8">
      {/* Progress bar */}
      <div className="max-w-lg mx-auto mb-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-grappler-400">Step {safeStep} of {TOTAL_STEPS}</p>
          <p className="text-xs text-grappler-400">{Math.round((safeStep / TOTAL_STEPS) * 100)}%</p>
        </div>
        <div className="h-1.5 bg-grappler-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(safeStep / TOTAL_STEPS) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={safeStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="card p-6"
          >
            {safeStep === 1 && (
              <Step1_AboutYou data={onboardingData} update={updateOnboardingData} />
            )}
            {safeStep === 2 && (
              <Step2_ScheduleAndGo data={onboardingData} update={updateOnboardingData} />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={prevStep}
            disabled={safeStep === 1}
            className={cn(
              'btn btn-secondary btn-md gap-2',
              safeStep === 1 && 'opacity-0 pointer-events-none invisible'
            )}
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          <button
            onClick={nextStep}
            disabled={!canProceed()}
            className="btn btn-primary btn-md gap-2"
          >
            {safeStep === TOTAL_STEPS ? "Let's Go" : 'Continue'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: About You (Identity + Goal + Name + Weight + Sex + Experience) ──
function Step1_AboutYou({
  data,
  update,
}: {
  data: OnboardingData;
  update: (data: Partial<OnboardingData>) => void;
}) {
  const identities: { value: TrainingIdentity; icon: any; title: string; desc: string; color: string }[] = [
    { value: 'combat', icon: Swords, title: 'Combat Sports', desc: 'MMA, BJJ, Wrestling, Striking', color: 'red' },
    { value: 'recreational', icon: Dumbbell, title: 'Recreational Lifter', desc: 'I lift because I enjoy it', color: 'primary' },
    { value: 'general_fitness', icon: Heart, title: 'General Fitness', desc: 'Feel better, look better', color: 'green' },
  ];

  const combatSports: { value: CombatSport; title: string; desc: string }[] = [
    { value: 'mma', title: 'MMA', desc: 'Mixed martial arts' },
    { value: 'grappling_gi', title: 'Grappling (Gi)', desc: 'BJJ, Judo with Gi' },
    { value: 'grappling_nogi', title: 'Grappling (No-Gi)', desc: 'No-Gi BJJ, Wrestling' },
    { value: 'striking', title: 'Striking', desc: 'Kickboxing, Muay Thai' },
  ];

  const isCombat = data.trainingIdentity === 'combat';
  const isRecreational = data.trainingIdentity === 'recreational';

  type GoalOption = { value: GoalFocus; icon: any; title: string; color: string };

  const combatGoals: GoalOption[] = [
    { value: 'balanced', icon: Shield, title: 'Sport Performance', color: 'red' },
    { value: 'strength', icon: Zap, title: 'Get Stronger', color: 'orange' },
    { value: 'hypertrophy', icon: Flame, title: 'Build Muscle', color: 'purple' },
    { value: 'power', icon: Trophy, title: 'Competition Prep', color: 'yellow' },
  ];

  const recreationalGoals: GoalOption[] = [
    { value: 'strength', icon: Zap, title: 'Get Stronger', color: 'red' },
    { value: 'hypertrophy', icon: Flame, title: 'Build Muscle', color: 'purple' },
    { value: 'balanced', icon: Eye, title: 'Look Better', color: 'primary' },
    { value: 'power', icon: Sparkles, title: 'Surprise Me', color: 'green' },
  ];

  const generalGoals: GoalOption[] = [
    { value: 'balanced', icon: Scale, title: 'Feel Better', color: 'green' },
    { value: 'strength', icon: Zap, title: 'Get Stronger', color: 'red' },
    { value: 'hypertrophy', icon: Flame, title: 'Tone Up', color: 'purple' },
    { value: 'power', icon: Sparkles, title: 'Surprise Me', color: 'primary' },
  ];

  const goals = isCombat ? combatGoals : isRecreational ? recreationalGoals : generalGoals;

  const colorMap: Record<string, { border: string; bg: string; text: string }> = {
    red: { border: 'border-red-500', bg: 'bg-red-500/10', text: 'text-red-400' },
    orange: { border: 'border-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-400' },
    purple: { border: 'border-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-400' },
    yellow: { border: 'border-yellow-500', bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
    green: { border: 'border-green-500', bg: 'bg-green-500/10', text: 'text-green-400' },
    primary: { border: 'border-primary-500', bg: 'bg-primary-500/10', text: 'text-primary-400' },
  };

  return (
    <div className="space-y-5">
      <div className="text-center mb-2">
        <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Target className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-xl font-bold text-grappler-50">About you</h2>
        <p className="text-grappler-400 text-sm">Your path, goal, and starting point</p>
      </div>

      {/* Identity selection */}
      <div>
        <label className="block text-xs font-medium text-grappler-400 mb-1.5 uppercase tracking-wide">I train</label>
        <div className="space-y-1.5">
          {identities.map((id) => (
            <button
              key={id.value}
              onClick={() => {
                update({ trainingIdentity: id.value });
                if (id.value !== 'combat') update({ combatSport: undefined, combatSports: undefined });
              }}
              className={cn(
                'w-full p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3',
                data.trainingIdentity === id.value
                  ? id.color === 'red' ? 'border-red-500 bg-red-500/10'
                    : id.color === 'green' ? 'border-green-500 bg-green-500/10'
                    : 'border-primary-500 bg-primary-500/10'
                  : 'border-grappler-700 hover:border-grappler-600'
              )}
            >
              <div className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                data.trainingIdentity === id.value
                  ? id.color === 'red' ? 'bg-red-500/20'
                    : id.color === 'green' ? 'bg-green-500/20'
                    : 'bg-primary-500/20'
                  : 'bg-grappler-700/50'
              )}>
                <id.icon className={cn(
                  'w-4 h-4',
                  data.trainingIdentity === id.value
                    ? id.color === 'red' ? 'text-red-400'
                      : id.color === 'green' ? 'text-green-400'
                      : 'text-primary-400'
                    : 'text-grappler-500'
                )} />
              </div>
              <div>
                <p className="font-semibold text-sm text-grappler-100">{id.title}</p>
                <p className="text-xs text-grappler-400">{id.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Combat sport sub-selection */}
      <AnimatePresence>
        {data.trainingIdentity === 'combat' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <label className="block text-xs font-medium text-grappler-400 mb-1.5 uppercase tracking-wide">What do you train?</label>
            <div className="grid grid-cols-2 gap-1.5">
              {combatSports.map((sport) => {
                const selected = (data.combatSports || []).includes(sport.value) || data.combatSport === sport.value;
                return (
                  <button
                    key={sport.value}
                    onClick={() => {
                      const current = data.combatSports || (data.combatSport ? [data.combatSport] : []);
                      let updated: CombatSport[];
                      if (current.includes(sport.value)) {
                        updated = current.filter(s => s !== sport.value);
                      } else {
                        updated = [...current, sport.value];
                      }
                      const primary = updated.length > 0 ? updated[0] : undefined;
                      update({ combatSports: updated, combatSport: primary });
                    }}
                    className={cn(
                      'p-2.5 rounded-lg border-2 text-left transition-all',
                      selected
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-grappler-700 hover:border-grappler-600'
                    )}
                  >
                    <p className="text-sm font-medium text-grappler-100">{sport.title}</p>
                    <p className="text-xs text-grappler-400">{sport.desc}</p>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goal — shown once identity is selected */}
      <AnimatePresence>
        {data.trainingIdentity && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <label className="block text-xs font-medium text-grappler-400 mb-1.5 uppercase tracking-wide">My #1 goal</label>
            <div className="grid grid-cols-2 gap-1.5">
              {goals.map((g) => {
                const colors = colorMap[g.color] || colorMap.primary;
                const selected = data.goalFocus === g.value;
                return (
                  <button
                    key={g.value}
                    onClick={() => update({ goalFocus: g.value })}
                    className={cn(
                      'p-2.5 rounded-lg border-2 text-left transition-all flex items-center gap-2',
                      selected ? `${colors.border} ${colors.bg}` : 'border-grappler-700 hover:border-grappler-600'
                    )}
                  >
                    <g.icon className={cn('w-4 h-4 flex-shrink-0', selected ? colors.text : 'text-grappler-500')} />
                    <span className="text-sm font-medium text-grappler-100">{g.title}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Quick Stats (inline, no separate step) ── */}
      <AnimatePresence>
        {data.trainingIdentity && data.goalFocus && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-4"
          >
            <div className="border-t border-grappler-700/50 pt-4">
              <p className="text-xs font-medium text-grappler-400 uppercase tracking-wide mb-3">Quick stats</p>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-grappler-400 mb-1.5 uppercase tracking-wide">Name</label>
              <input
                type="text"
                value={data.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="Your name"
                className="input"
                autoComplete="given-name"
              />
            </div>

            {/* Bodyweight */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-grappler-400 uppercase tracking-wide">
                  Body weight
                </label>
                <button
                  type="button"
                  onClick={() => update({ weightUnit: data.weightUnit === 'kg' ? 'lbs' : 'kg' })}
                  className="text-xs font-bold px-2 py-0.5 rounded-full bg-grappler-700 text-grappler-300 hover:bg-grappler-600 transition-colors"
                >
                  {data.weightUnit === 'kg' ? 'kg' : 'lbs'}
                </button>
              </div>
              <input
                type="number"
                value={
                  data.bodyWeightKg
                    ? data.weightUnit === 'kg'
                      ? Math.round(data.bodyWeightKg)
                      : Math.round(data.bodyWeightKg * 2.205)
                    : ''
                }
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  const kg = data.weightUnit === 'kg' ? val : val / 2.205;
                  update({ bodyWeightKg: kg > 0 ? Math.round(kg * 10) / 10 : undefined });
                }}
                placeholder={data.weightUnit === 'kg' ? '75' : '165'}
                min={1}
                className="input"
                inputMode="decimal"
              />
            </div>

            {/* Sex + Experience — side by side to save vertical space */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-grappler-400 mb-1.5 uppercase tracking-wide">Sex</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {([
                    { value: 'male' as BiologicalSex, label: 'M' },
                    { value: 'female' as BiologicalSex, label: 'F' },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => update({ sex: opt.value })}
                      className={cn(
                        'py-2.5 rounded-lg text-center transition-all border-2',
                        data.sex === opt.value
                          ? 'bg-primary-500/10 border-primary-500 text-white'
                          : 'bg-grappler-700 border-grappler-700 text-grappler-400'
                      )}
                    >
                      <p className="text-sm font-medium">{opt.label}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-grappler-400 mb-1.5 uppercase tracking-wide">Experience</label>
                <div className="grid grid-cols-3 gap-1">
                  {([
                    { value: 'beginner' as ExperienceLevel, label: '<1y' },
                    { value: 'intermediate' as ExperienceLevel, label: '1-3y' },
                    { value: 'advanced' as ExperienceLevel, label: '3y+' },
                  ]).map((level) => (
                    <button
                      key={level.value}
                      onClick={() => update({ experienceLevel: level.value })}
                      className={cn(
                        'py-2.5 rounded-lg text-center transition-all text-xs font-medium',
                        data.experienceLevel === level.value
                          ? 'bg-primary-500 text-white'
                          : 'bg-grappler-700 text-grappler-400'
                      )}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Step 2: Schedule + Disclaimer → Go ──────────────────────────────────────
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getRecommendedLiftingDays(sessionsPerWeek: number, identity?: TrainingIdentity): number[] {
  switch (sessionsPerWeek) {
    case 1: return [3];
    case 2: return [1, 4];
    case 3: return [1, 3, 5];
    case 4: return identity === 'combat' ? [1, 2, 4, 5] : [1, 2, 4, 5];
    case 5: return identity === 'combat' ? [1, 2, 3, 5, 6] : [1, 2, 3, 5, 6];
    case 6: return [1, 2, 3, 4, 5, 6];
    default: return [1, 3, 5];
  }
}

function getRecommendedCombatDays(combatSport: CombatSport | undefined): CombatTrainingDay[] {
  if (combatSport === 'striking') {
    return [
      { day: 2, intensity: 'moderate', timeOfDay: 'afternoon' },
      { day: 3, intensity: 'hard', timeOfDay: 'afternoon' },
      { day: 5, intensity: 'moderate', timeOfDay: 'afternoon' },
      { day: 6, intensity: 'light', timeOfDay: 'morning' },
    ];
  }
  if (combatSport === 'mma') {
    return [
      { day: 1, intensity: 'moderate', timeOfDay: 'afternoon' },
      { day: 2, intensity: 'moderate', timeOfDay: 'afternoon' },
      { day: 3, intensity: 'hard', timeOfDay: 'afternoon' },
      { day: 5, intensity: 'moderate', timeOfDay: 'afternoon' },
      { day: 6, intensity: 'light', timeOfDay: 'morning' },
    ];
  }
  return [
    { day: 2, intensity: 'moderate', timeOfDay: 'afternoon' },
    { day: 3, intensity: 'hard', timeOfDay: 'afternoon' },
    { day: 4, intensity: 'moderate', timeOfDay: 'afternoon' },
    { day: 6, intensity: 'light', timeOfDay: 'morning' },
  ];
}

function Step2_ScheduleAndGo({
  data,
  update,
}: {
  data: OnboardingData;
  update: (data: Partial<OnboardingData>) => void;
}) {
  const isCombat = data.trainingIdentity === 'combat';
  const liftDays = data.trainingDays || [];
  const combatDays = data.combatTrainingDays || [];

  // Auto-prefill on mount / when sessions change
  const prevSessionsRef = useRef(data.sessionsPerWeek);
  const didInitialPrefill = useRef(false);

  useEffect(() => {
    const sessionsChanged = prevSessionsRef.current !== data.sessionsPerWeek;
    prevSessionsRef.current = data.sessionsPerWeek;

    if (sessionsChanged || (!didInitialPrefill.current && liftDays.length === 0)) {
      const recommended = getRecommendedLiftingDays(data.sessionsPerWeek, data.trainingIdentity);
      const updates: Partial<OnboardingData> = { trainingDays: recommended };
      if (isCombat && combatDays.length === 0) {
        updates.combatTrainingDays = getRecommendedCombatDays(data.combatSport);
      }
      update(updates);
      didInitialPrefill.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.sessionsPerWeek]);

  const toggleLift = (day: number) => {
    const current = [...liftDays];
    const idx = current.indexOf(day);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      if (current.length >= data.sessionsPerWeek) return;
      current.push(day);
    }
    current.sort((a, b) => a - b);
    update({ trainingDays: current });
  };

  const combatSessionsForDay = (day: number) => combatDays.filter((s) => s.day === day);

  const getSplitLabel = () => {
    if (data.sessionsPerWeek <= 3) return 'Full body each session';
    if (data.sessionsPerWeek <= 4) return 'Upper/lower split';
    return 'Push/pull/legs split';
  };

  return (
    <div className="space-y-5">
      <div className="text-center mb-2">
        <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CalendarDays className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-xl font-bold text-grappler-50">When do you train?</h2>
        <p className="text-grappler-400 text-sm">Tap days to toggle — you can change this anytime</p>
      </div>

      {/* Sessions per week */}
      <div>
        <label className="block text-xs font-medium text-grappler-400 mb-1.5 uppercase tracking-wide">
          Lifting days per week
          <span className="text-grappler-500 ml-1 normal-case">({liftDays.length}/{data.sessionsPerWeek})</span>
        </label>
        <div className="grid grid-cols-6 gap-2">
          {([1, 2, 3, 4, 5, 6] as SessionsPerWeek[]).map((n) => (
            <button
              key={n}
              onClick={() => update({ sessionsPerWeek: n })}
              className={cn(
                'py-3 min-h-[48px] rounded-lg text-lg font-bold transition-all',
                data.sessionsPerWeek === n
                  ? 'bg-primary-500 text-white'
                  : 'bg-grappler-700 text-grappler-400'
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-xs text-grappler-400 mt-1.5 text-center">{getSplitLabel()}</p>
      </div>

      {/* Week grid */}
      <div>
        <div className="grid grid-cols-7 gap-1">
          {DAY_NAMES.map((name, dayIdx) => {
            const hasLift = liftDays.includes(dayIdx);
            const dayCombat = combatSessionsForDay(dayIdx);
            const hasCombat = dayCombat.length > 0;
            const isRest = !hasLift && !hasCombat;

            return (
              <button
                key={dayIdx}
                onClick={() => toggleLift(dayIdx)}
                className={cn(
                  'rounded-lg text-center transition-all py-2 min-h-[60px] flex flex-col items-center justify-start gap-1 border-2',
                  hasLift ? 'border-primary-500/50 bg-primary-500/10' : 'border-transparent',
                  isRest && !hasLift && 'bg-grappler-800/50',
                  !isRest && !hasLift && 'bg-grappler-700'
                )}
              >
                <span className={cn(
                  'text-xs font-medium',
                  hasLift ? 'text-primary-300' : 'text-grappler-400'
                )}>{name}</span>
                <div className="flex flex-col gap-0.5 items-center">
                  {hasLift && (
                    <div className="w-5 h-1.5 rounded-full bg-primary-400" title="Lift" />
                  )}
                  {dayCombat.map((_, ci) => (
                    <div key={ci} className="w-5 h-1.5 rounded-full bg-red-400" title="Combat" />
                  ))}
                  {isRest && (
                    <span className="text-xs text-grappler-600 mt-0.5">Rest</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-1.5 rounded-full bg-primary-400" />
            <span className="text-xs text-grappler-400">Lift</span>
          </div>
          {isCombat && (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-1.5 rounded-full bg-red-400" />
              <span className="text-xs text-grappler-400">Combat (auto-scheduled)</span>
            </div>
          )}
        </div>
      </div>

      {isCombat && (
        <p className="text-xs text-grappler-400 text-center">
          Combat sessions are auto-optimized around your lifts. Fine-tune in Settings.
        </p>
      )}

      {/* Disclaimer — compact, inline */}
      <div className="border-t border-grappler-700/50 pt-4">
        <button
          onClick={() => update({ disclaimerAccepted: !data.disclaimerAccepted })}
          className={cn(
            'w-full p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3',
            data.disclaimerAccepted
              ? 'border-green-500 bg-green-500/10'
              : 'border-grappler-700 hover:border-grappler-600'
          )}
        >
          <div className={cn(
            'w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all',
            data.disclaimerAccepted
              ? 'border-green-500 bg-green-500'
              : 'border-grappler-600'
          )}>
            {data.disclaimerAccepted && (
              <Check className="w-4 h-4 text-white" />
            )}
          </div>
          <div>
            <span className="text-sm text-grappler-200">I train at my own risk</span>
            <p className="text-xs text-grappler-500 mt-0.5">Not medical advice — consult a physician first</p>
          </div>
        </button>
      </div>
    </div>
  );
}
