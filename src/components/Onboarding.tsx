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
  Clock,
  Flame,
  Swords,
  Shield,
  Target,
  Sparkles,
  Eye,
  Trophy,
  User,
  Ruler,
} from 'lucide-react';
import { BiologicalSex, ExperienceLevel, GoalFocus, SessionsPerWeek, OnboardingData, WeightUnit, TrainingIdentity, CombatSport, CombatTrainingDay, CombatIntensity, CombatTimeOfDay, EquipmentType, DEFAULT_EQUIPMENT_PROFILES } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CalendarDays, AlertTriangle, Plus, X } from 'lucide-react';

const TOTAL_STEPS = 6;

export default function Onboarding({ authUserId }: { authUserId?: string }) {
  const { onboardingData, updateOnboardingData, completeOnboarding } = useAppStore();
  const [currentStep, setCurrentStep] = useState(1);

  const nextStep = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding(authUserId);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        if (!onboardingData.trainingIdentity) return false;
        if (onboardingData.trainingIdentity === 'combat' && !onboardingData.combatSport && !(onboardingData.combatSports && onboardingData.combatSports.length > 0)) return false;
        return true;
      case 2:
        return !!onboardingData.goalFocus;
      case 3:
        return onboardingData.name.length >= 2 && !!onboardingData.sex && onboardingData.age > 0;
      case 4:
        return !!onboardingData.sessionsPerWeek && !!onboardingData.equipment;
      case 5:
        return (onboardingData.trainingDays?.length || 0) >= onboardingData.sessionsPerWeek;
      case 6:
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
          <p className="text-xs text-grappler-500">Step {currentStep} of {TOTAL_STEPS}</p>
          <p className="text-xs text-grappler-500">{Math.round((currentStep / TOTAL_STEPS) * 100)}%</p>
        </div>
        <div className="h-1.5 bg-grappler-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="card p-6"
          >
            {currentStep === 1 && (
              <Step1_Identity data={onboardingData} update={updateOnboardingData} />
            )}
            {currentStep === 2 && (
              <Step2_Goal data={onboardingData} update={updateOnboardingData} />
            )}
            {currentStep === 3 && (
              <Step3_AboutYou data={onboardingData} update={updateOnboardingData} />
            )}
            {currentStep === 4 && (
              <Step4_TrainingSetup data={onboardingData} update={updateOnboardingData} />
            )}
            {currentStep === 5 && (
              <Step5_Schedule data={onboardingData} update={updateOnboardingData} />
            )}
            {currentStep === 6 && (
              <Step6_Preview data={onboardingData} />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className={cn(
              'btn btn-secondary btn-md gap-2',
              currentStep === 1 && 'opacity-0 pointer-events-none invisible'
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
            {currentStep === TOTAL_STEPS ? 'Start Training' : 'Continue'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Identity ─────────────────────────────────────────────────
function Step1_Identity({
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

  return (
    <div className="space-y-5">
      <div className="text-center mb-4">
        <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Target className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-xl font-bold text-grappler-50">What brings you here?</h2>
        <p className="text-grappler-400 text-sm">This shapes everything we build for you</p>
      </div>

      {/* Identity selection */}
      <div className="space-y-2">
        {identities.map((id) => (
          <button
            key={id.value}
            onClick={() => {
              update({ trainingIdentity: id.value });
              if (id.value !== 'combat') update({ combatSport: undefined });
            }}
            className={cn(
              'w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4',
              data.trainingIdentity === id.value
                ? id.color === 'red' ? 'border-red-500 bg-red-500/10'
                  : id.color === 'green' ? 'border-green-500 bg-green-500/10'
                  : 'border-primary-500 bg-primary-500/10'
                : 'border-grappler-700 hover:border-grappler-600'
            )}
          >
            <div className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
              data.trainingIdentity === id.value
                ? id.color === 'red' ? 'bg-red-500/20'
                  : id.color === 'green' ? 'bg-green-500/20'
                  : 'bg-primary-500/20'
                : 'bg-grappler-700/50'
            )}>
              <id.icon className={cn(
                'w-5 h-5',
                data.trainingIdentity === id.value
                  ? id.color === 'red' ? 'text-red-400'
                    : id.color === 'green' ? 'text-green-400'
                    : 'text-primary-400'
                  : 'text-grappler-500'
              )} />
            </div>
            <div>
              <p className="font-semibold text-grappler-100">{id.title}</p>
              <p className="text-xs text-grappler-400">{id.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Combat sport sub-selection */}
      <AnimatePresence>
        {data.trainingIdentity === 'combat' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-2"
          >
            <p className="text-sm text-grappler-300 font-medium">What do you train?</p>
            <p className="text-xs text-grappler-500 mb-1">Select all that apply</p>
            <div className="grid grid-cols-2 gap-2">
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
                      // Keep combatSport as primary (first selected or the one just toggled on)
                      const primary = updated.length > 0 ? updated[0] : undefined;
                      update({ combatSports: updated, combatSport: primary });
                    }}
                    className={cn(
                      'p-3 rounded-xl border-2 text-left transition-all',
                      selected
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-grappler-700 hover:border-grappler-600'
                    )}
                  >
                    <p className="text-sm font-medium text-grappler-100">{sport.title}</p>
                    <p className="text-xs text-grappler-400">{sport.desc}</p>
                    {selected && (
                      <div className="mt-1 w-2 h-2 rounded-full bg-red-500 inline-block" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Step 2: Goal ─────────────────────────────────────────────────────
function Step2_Goal({
  data,
  update,
}: {
  data: OnboardingData;
  update: (data: Partial<OnboardingData>) => void;
}) {
  const isCombat = data.trainingIdentity === 'combat';
  const isRecreational = data.trainingIdentity === 'recreational';

  type GoalOption = { value: GoalFocus; icon: any; title: string; desc: string; color: string };

  const combatGoals: GoalOption[] = [
    { value: 'balanced', icon: Shield, title: 'Sport Performance', desc: 'Strength & power to dominate', color: 'red' },
    { value: 'strength', icon: Zap, title: 'Get Stronger', desc: 'Raw strength for the mat/ring', color: 'orange' },
    { value: 'hypertrophy', icon: Flame, title: 'Build Muscle', desc: 'Functional size & power', color: 'purple' },
    { value: 'power', icon: Trophy, title: 'Competition Prep', desc: 'Peak for your next event', color: 'yellow' },
  ];

  const recreationalGoals: GoalOption[] = [
    { value: 'strength', icon: Zap, title: 'Get Stronger', desc: 'Lift heavier, feel powerful', color: 'red' },
    { value: 'hypertrophy', icon: Flame, title: 'Build Muscle', desc: 'Size and definition', color: 'purple' },
    { value: 'balanced', icon: Eye, title: 'Look Better', desc: 'Balanced physique & aesthetics', color: 'primary' },
    { value: 'power', icon: Sparkles, title: 'Surprise Me', desc: 'Auto-pick the best program', color: 'green' },
  ];

  const generalGoals: GoalOption[] = [
    { value: 'balanced', icon: Scale, title: 'Feel Better', desc: 'Energy, health, movement', color: 'green' },
    { value: 'strength', icon: Zap, title: 'Get Stronger', desc: 'Build a foundation', color: 'red' },
    { value: 'hypertrophy', icon: Flame, title: 'Tone Up', desc: 'Shape and definition', color: 'purple' },
    { value: 'power', icon: Sparkles, title: 'Surprise Me', desc: 'We pick for you', color: 'primary' },
  ];

  const goals = isCombat ? combatGoals : isRecreational ? recreationalGoals : generalGoals;

  const getSubtitle = () => {
    if (isCombat) {
      const sportName = data.combatSport === 'mma' ? 'MMA' :
        data.combatSport === 'grappling_gi' ? 'Gi grappling' :
        data.combatSport === 'grappling_nogi' ? 'No-Gi grappling' :
        data.combatSport === 'striking' ? 'Striking' : 'your sport';
      return `We'll build your lifting around ${sportName}`;
    }
    if (isRecreational) return "What do you want from your training?";
    return "What matters most to you right now?";
  };

  const colorMap: Record<string, { border: string; bg: string; text: string }> = {
    red: { border: 'border-red-500', bg: 'bg-red-500/10', text: 'text-red-400' },
    orange: { border: 'border-orange-500', bg: 'bg-orange-500/10', text: 'text-orange-400' },
    purple: { border: 'border-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-400' },
    yellow: { border: 'border-yellow-500', bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
    green: { border: 'border-green-500', bg: 'bg-green-500/10', text: 'text-green-400' },
    primary: { border: 'border-primary-500', bg: 'bg-primary-500/10', text: 'text-primary-400' },
  };

  return (
    <div className="space-y-5">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-grappler-50">What&apos;s your #1 goal?</h2>
        <p className="text-grappler-400 text-sm">{getSubtitle()}</p>
      </div>

      <div className="space-y-2">
        {goals.map((g) => {
          const colors = colorMap[g.color] || colorMap.primary;
          const selected = data.goalFocus === g.value;
          return (
            <button
              key={g.value}
              onClick={() => update({ goalFocus: g.value })}
              className={cn(
                'w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4',
                selected ? `${colors.border} ${colors.bg}` : 'border-grappler-700 hover:border-grappler-600'
              )}
            >
              <div className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                selected ? colors.bg : 'bg-grappler-700/50'
              )}>
                <g.icon className={cn('w-5 h-5', selected ? colors.text : 'text-grappler-500')} />
              </div>
              <div>
                <p className="font-semibold text-grappler-100">{g.title}</p>
                <p className="text-xs text-grappler-400">{g.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 3: About You ───────────────────────────────────────────────
function Step3_AboutYou({
  data,
  update,
}: {
  data: OnboardingData;
  update: (data: Partial<OnboardingData>) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="text-center mb-4">
        <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <User className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-xl font-bold text-grappler-50">About you</h2>
        <p className="text-grappler-400 text-sm">Used for programming and nutrition calculations</p>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-grappler-300 mb-1.5">Name</label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Your name"
          className="input"
          autoFocus
        />
      </div>

      {/* Age + Height row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-grappler-300 mb-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-grappler-400" />
            Age
          </label>
          <input
            type="number"
            value={data.age || ''}
            onChange={(e) => update({ age: parseInt(e.target.value) || 0 })}
            placeholder="25"
            min={13}
            max={80}
            className="input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-grappler-300 mb-1.5 flex items-center gap-1.5">
            <Ruler className="w-3.5 h-3.5 text-grappler-400" />
            Height (cm)
          </label>
          <input
            type="number"
            value={data.heightCm || ''}
            onChange={(e) => update({ heightCm: parseInt(e.target.value) || 0 })}
            placeholder="175"
            min={100}
            max={230}
            className="input"
          />
        </div>
      </div>

      {/* Biological Sex */}
      <div>
        <label className="block text-sm font-medium text-grappler-300 mb-1.5">Biological sex</label>
        <p className="text-xs text-grappler-500 mb-2">We adjust volume, rest, rep ranges, and nutrition targets</p>
        <div className="grid grid-cols-2 gap-2">
          {([
            { value: 'male' as BiologicalSex, label: 'Male' },
            { value: 'female' as BiologicalSex, label: 'Female' },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ sex: opt.value })}
              className={cn(
                'py-3 rounded-xl text-center transition-all border-2',
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

      {/* Experience */}
      <div>
        <label className="block text-sm font-medium text-grappler-300 mb-1.5">Lifting experience</label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { value: 'beginner' as ExperienceLevel, label: 'Beginner', desc: '<1 year' },
            { value: 'intermediate' as ExperienceLevel, label: 'Intermediate', desc: '1-3 years' },
            { value: 'advanced' as ExperienceLevel, label: 'Advanced', desc: '3+ years' },
          ]).map((level) => (
            <button
              key={level.value}
              onClick={() => update({ experienceLevel: level.value })}
              className={cn(
                'py-2.5 rounded-lg text-center transition-all',
                data.experienceLevel === level.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-grappler-700 text-grappler-400'
              )}
            >
              <p className="text-xs font-medium">{level.label}</p>
              <p className="text-xs opacity-70">{level.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Training Setup ──────────────────────────────────────────
function Step4_TrainingSetup({
  data,
  update,
}: {
  data: OnboardingData;
  update: (data: Partial<OnboardingData>) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="text-center mb-4">
        <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Dumbbell className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-xl font-bold text-grappler-50">Training setup</h2>
        <p className="text-grappler-400 text-sm">How and where you train</p>
      </div>

      {/* Days per week */}
      <div>
        <label className="block text-sm font-medium text-grappler-300 mb-1.5">Lifting days per week</label>
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
        <p className="text-xs text-grappler-500 mt-1.5 text-center">
          {data.sessionsPerWeek <= 3 ? 'Full body each session' :
           data.sessionsPerWeek <= 4 ? 'Upper/lower split' :
           'Push/pull/legs split'}
        </p>
      </div>

      {/* Session duration */}
      <div>
        <label className="block text-sm font-medium text-grappler-300 mb-1.5 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-grappler-400" />
          Session length
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[45, 60, 75, 90].map((mins) => (
            <button
              key={mins}
              onClick={() => update({ sessionDurationMinutes: mins })}
              className={cn(
                'py-2.5 rounded-lg text-sm font-bold transition-all',
                data.sessionDurationMinutes === mins
                  ? 'bg-primary-500 text-white'
                  : 'bg-grappler-700 text-grappler-400'
              )}
            >
              {mins}m
            </button>
          ))}
        </div>
      </div>

      {/* Meso cycle length */}
      <div>
        <label className="block text-sm font-medium text-grappler-300 mb-1.5">Program length (weeks)</label>
        <div className="grid grid-cols-5 gap-2">
          {[4, 5, 6, 8, 12].map((weeks) => (
            <button
              key={weeks}
              onClick={() => update({ mesoCycleWeeks: weeks })}
              className={cn(
                'py-2.5 rounded-lg text-sm font-bold transition-all',
                (data.mesoCycleWeeks || 5) === weeks
                  ? 'bg-primary-500 text-white'
                  : 'bg-grappler-700 text-grappler-400'
              )}
            >
              {weeks}
            </button>
          ))}
        </div>
        <p className="text-xs text-grappler-500 mt-1.5 text-center">
          {(data.mesoCycleWeeks || 5) <= 4 ? 'Short block — good for peaking or testing' :
           (data.mesoCycleWeeks || 5) <= 6 ? 'Standard mesocycle — ideal for most lifters' :
           (data.mesoCycleWeeks || 5) <= 8 ? 'Extended block — more time to build volume' :
           'Long block — for patient, steady progression'}
        </p>
      </div>

      {/* Units */}
      <div>
        <label className="block text-sm font-medium text-grappler-300 mb-1.5">Weight units</label>
        <div className="grid grid-cols-2 gap-2">
          {(['kg', 'lbs'] as WeightUnit[]).map((unit) => (
            <button
              key={unit}
              onClick={() => update({ weightUnit: unit })}
              className={cn(
                'py-2.5 rounded-lg text-sm font-medium transition-all',
                data.weightUnit === unit
                  ? 'bg-primary-500 text-white'
                  : 'bg-grappler-700 text-grappler-400'
              )}
            >
              {unit.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Where do you train */}
      <div>
        <label className="block text-sm font-medium text-grappler-300 mb-1.5">Where do you train?</label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { value: 'full_gym' as const, label: 'Full Gym', desc: 'Commercial gym' },
            { value: 'home_gym' as const, label: 'Home', desc: 'Home setup' },
            { value: 'minimal' as const, label: 'Travel', desc: 'Minimal gear' },
          ]).map((eq) => (
            <button
              key={eq.value}
              onClick={() => {
                const profile = DEFAULT_EQUIPMENT_PROFILES.find(p =>
                  p.name === (eq.value === 'full_gym' ? 'gym' : eq.value === 'home_gym' ? 'home' : 'travel')
                );
                update({
                  equipment: eq.value,
                  availableEquipment: profile?.equipment || [],
                });
              }}
              className={cn(
                'py-3 rounded-lg text-center transition-all',
                data.equipment === eq.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-grappler-700 text-grappler-400'
              )}
            >
              <p className="text-xs font-medium">{eq.label}</p>
              <p className="text-[10px] opacity-70">{eq.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Equipment customization — compact chip toggles */}
      {data.equipment && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="overflow-hidden"
        >
          <p className="text-xs text-grappler-500 mb-2">
            Available equipment (tap to toggle)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {([
              { id: 'barbell' as EquipmentType, label: 'Barbell' },
              { id: 'dumbbell' as EquipmentType, label: 'Dumbbells' },
              { id: 'kettlebell' as EquipmentType, label: 'Kettlebell' },
              { id: 'bench' as EquipmentType, label: 'Bench' },
              { id: 'pull_up_bar' as EquipmentType, label: 'Pull-up Bar' },
              { id: 'cable' as EquipmentType, label: 'Cables' },
              { id: 'machine' as EquipmentType, label: 'Machines' },
              { id: 'resistance_band' as EquipmentType, label: 'Bands' },
              { id: 'dip_station' as EquipmentType, label: 'Dip Station' },
              { id: 'ez_bar' as EquipmentType, label: 'EZ Bar' },
            ]).map((item) => {
              const isSelected = data.availableEquipment?.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    const current = data.availableEquipment || [];
                    const updated = isSelected
                      ? current.filter(e => e !== item.id)
                      : [...current, item.id];
                    update({ availableEquipment: updated });
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium transition-all border',
                    isSelected
                      ? 'bg-primary-500/20 text-primary-300 border-primary-500/50'
                      : 'bg-grappler-800 text-grappler-500 border-grappler-700'
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Step 5: Training Schedule ─────────────────────────────────────────
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Generate best-practice schedule prefills based on sessions per week and identity.
 *
 * Principles:
 * - Spread lifting days for 48h recovery between same muscle groups
 * - For combat athletes: avoid stacking lifting on hard sparring days
 * - Prefer Mon-Sat training with Sunday rest (most common preference)
 * - For upper/lower or PPL splits, consecutive days are fine (different muscles)
 */
function getRecommendedLiftingDays(sessionsPerWeek: number, identity?: TrainingIdentity): number[] {
  switch (sessionsPerWeek) {
    case 1: return [3]; // Wed — mid-week
    case 2: return [1, 4]; // Mon, Thu — well-spaced
    case 3: return [1, 3, 5]; // Mon, Wed, Fri — classic, 48h between sessions
    case 4:
      return identity === 'combat'
        ? [1, 2, 4, 5]  // Mon, Tue, Thu, Fri — leaves Wed/Sat/Sun for sport
        : [1, 2, 4, 5]; // Mon, Tue, Thu, Fri
    case 5:
      return identity === 'combat'
        ? [1, 2, 3, 5, 6]  // Mon-Wed, Fri, Sat — Thu + Sun rest
        : [1, 2, 3, 5, 6]; // Mon-Wed, Fri, Sat
    case 6:
      return [1, 2, 3, 4, 5, 6]; // Mon-Sat, Sun rest
    default: return [1, 3, 5];
  }
}

/**
 * Generate recommended combat training days based on sport and lifting schedule.
 */
function getRecommendedCombatDays(
  combatSport: CombatSport | undefined,
  liftingDays: number[]
): CombatTrainingDay[] {
  // Default combat schedule: 3-4 sessions/week
  const defaultSchedule: CombatTrainingDay[] = [
    { day: 2, intensity: 'moderate', timeOfDay: 'afternoon' },
    { day: 3, intensity: 'hard', timeOfDay: 'afternoon' },
    { day: 4, intensity: 'moderate', timeOfDay: 'afternoon' },
    { day: 6, intensity: 'light', timeOfDay: 'morning' },
  ];

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

  return defaultSchedule;
}

function getTimeOrder(timeOfDay?: CombatTimeOfDay): number {
  if (timeOfDay === 'morning') return 0;
  if (timeOfDay === 'afternoon') return 1;
  if (timeOfDay === 'evening') return 2;
  return 1; // default to afternoon
}

function Step5_Schedule({
  data,
  update,
}: {
  data: OnboardingData;
  update: (data: Partial<OnboardingData>) => void;
}) {
  const isCombat = data.trainingIdentity === 'combat';
  const selectedDays = data.trainingDays || [];
  const combatDays = data.combatTrainingDays || [];

  // Auto-prefill — re-trigger when sessionsPerWeek changes
  const prevSessionsRef = useRef(data.sessionsPerWeek);
  const didInitialPrefill = useRef(false);

  useEffect(() => {
    const sessionsChanged = prevSessionsRef.current !== data.sessionsPerWeek;
    prevSessionsRef.current = data.sessionsPerWeek;

    // Re-prefill if sessions changed or this is first mount with no days selected
    if (sessionsChanged || (!didInitialPrefill.current && selectedDays.length === 0)) {
      const recommendedLifting = getRecommendedLiftingDays(data.sessionsPerWeek, data.trainingIdentity);
      const updates: Partial<OnboardingData> = { trainingDays: recommendedLifting };

      if (isCombat) {
        updates.combatTrainingDays = getRecommendedCombatDays(data.combatSport, recommendedLifting);
      }

      update(updates);
      didInitialPrefill.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.sessionsPerWeek]);

  const toggleDay = (day: number) => {
    const current = [...selectedDays];
    const idx = current.indexOf(day);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(day);
    }
    current.sort((a, b) => a - b);
    update({ trainingDays: current });
  };

  // Group combat sessions by day for multi-session support
  const combatDayMap = new Map<number, CombatTrainingDay[]>();
  for (const cd of combatDays) {
    const existing = combatDayMap.get(cd.day) || [];
    existing.push(cd);
    combatDayMap.set(cd.day, existing);
  }

  const toggleCombatDay = (day: number) => {
    const current = [...combatDays];
    const sessionsForDay = current.filter(d => d.day === day);
    if (sessionsForDay.length > 0) {
      // Remove all sessions for this day
      const filtered = current.filter(d => d.day !== day);
      filtered.sort((a, b) => a.day - b.day || getTimeOrder(a.timeOfDay) - getTimeOrder(b.timeOfDay));
      update({ combatTrainingDays: filtered });
    } else {
      current.push({ day, intensity: 'moderate', timeOfDay: 'afternoon' });
      current.sort((a, b) => a.day - b.day || getTimeOrder(a.timeOfDay) - getTimeOrder(b.timeOfDay));
      update({ combatTrainingDays: current });
    }
  };

  const addCombatSession = (day: number) => {
    const current = [...combatDays];
    const sessionsForDay = current.filter(d => d.day === day);
    // Pick the next available time slot
    const usedTimes = new Set(sessionsForDay.map(s => s.timeOfDay || 'afternoon'));
    const nextTime: CombatTimeOfDay = !usedTimes.has('morning') ? 'morning'
      : !usedTimes.has('afternoon') ? 'afternoon'
      : 'evening';
    current.push({ day, intensity: 'moderate', timeOfDay: nextTime });
    current.sort((a, b) => a.day - b.day || getTimeOrder(a.timeOfDay) - getTimeOrder(b.timeOfDay));
    update({ combatTrainingDays: current });
  };

  const removeCombatSession = (day: number, timeOfDay: CombatTimeOfDay | undefined) => {
    const current = [...combatDays];
    const idx = current.findIndex(d => d.day === day && (d.timeOfDay || 'afternoon') === (timeOfDay || 'afternoon'));
    if (idx >= 0) {
      current.splice(idx, 1);
      current.sort((a, b) => a.day - b.day || getTimeOrder(a.timeOfDay) - getTimeOrder(b.timeOfDay));
      update({ combatTrainingDays: current });
    }
  };

  const setCombatIntensity = (day: number, timeOfDay: CombatTimeOfDay | undefined, intensity: CombatIntensity) => {
    const current = [...combatDays];
    const idx = current.findIndex(d => d.day === day && (d.timeOfDay || 'afternoon') === (timeOfDay || 'afternoon'));
    if (idx >= 0) {
      current[idx] = { ...current[idx], intensity };
      update({ combatTrainingDays: current });
    }
  };

  const setCombatTimeOfDay = (day: number, oldTime: CombatTimeOfDay | undefined, newTime: CombatTimeOfDay) => {
    const current = [...combatDays];
    const idx = current.findIndex(d => d.day === day && (d.timeOfDay || 'afternoon') === (oldTime || 'afternoon'));
    if (idx >= 0) {
      current[idx] = { ...current[idx], timeOfDay: newTime };
      current.sort((a, b) => a.day - b.day || getTimeOrder(a.timeOfDay) - getTimeOrder(b.timeOfDay));
      update({ combatTrainingDays: current });
    }
  };

  // Recovery analysis
  const getScheduleAnalysis = () => {
    if (selectedDays.length < data.sessionsPerWeek) return null;

    const allTrainingDays = new Set([...selectedDays, ...combatDays.map(d => d.day)]);
    const hardCombatDays = new Set(combatDays.filter(d => d.intensity === 'hard').map(d => d.day));

    const warnings: string[] = [];
    const tips: string[] = [];

    for (let i = 0; i < selectedDays.length - 1; i++) {
      const gap = selectedDays[i + 1] - selectedDays[i];
      if (gap === 1) {
        warnings.push(`${DAY_NAMES[selectedDays[i]]} and ${DAY_NAMES[selectedDays[i + 1]]} are back-to-back — we'll program different muscle groups`);
        break;
      }
    }

    for (const liftDay of selectedDays) {
      const prevDay = liftDay === 0 ? 6 : liftDay - 1;
      if (hardCombatDays.has(prevDay)) {
        warnings.push(`Lifting on ${DAY_NAMES[liftDay]} after hard ${DAY_NAMES[prevDay]} training — we'll auto-reduce intensity`);
        break;
      }
    }

    // Warn about days with multiple hard sessions
    for (const [day, sessions] of Array.from(combatDayMap.entries())) {
      const hardCount = sessions.filter(s => s.intensity === 'hard').length;
      if (hardCount >= 2) {
        warnings.push(`${DAY_NAMES[day]} has ${hardCount} hard sessions — consider making one lighter`);
      }
    }

    // Show total weekly combat session count
    const totalCombatSessions = combatDays.length;
    const uniqueCombatDays = new Set(combatDays.map(d => d.day)).size;
    if (totalCombatSessions > uniqueCombatDays) {
      tips.push(`${totalCombatSessions} combat sessions across ${uniqueCombatDays} days — doubles accounted for`);
    }

    const restDays = [0, 1, 2, 3, 4, 5, 6].filter(d => !allTrainingDays.has(d));
    if (restDays.length === 0) {
      warnings.push('No rest days — consider keeping at least 1 full recovery day');
    } else if (restDays.length >= 2) {
      tips.push(`${restDays.length} rest days for recovery — solid schedule`);
    }

    if (data.sessionsPerWeek <= 3 && selectedDays.length >= 2) {
      const hasGoodSpacing = selectedDays.every((day, i) => {
        if (i === 0) return true;
        return selectedDays[i] - selectedDays[i - 1] >= 2;
      });
      if (hasGoodSpacing) {
        tips.push('Good spacing between sessions — optimal for recovery and growth');
      }
    }

    return { warnings, tips };
  };

  const analysis = getScheduleAnalysis();

  return (
    <div className="space-y-5">
      <div className="text-center mb-4">
        <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CalendarDays className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-xl font-bold text-grappler-50">Your weekly schedule</h2>
        <p className="text-grappler-400 text-sm">
          Pick your {data.sessionsPerWeek} lifting day{data.sessionsPerWeek > 1 ? 's' : ''}
          {isCombat ? ' and mark your sport training' : ''}
        </p>
      </div>

      {/* Prefill info */}
      {selectedDays.length > 0 && (
        <div className="flex items-center justify-between bg-primary-500/10 border border-primary-500/20 rounded-lg p-2.5">
          <p className="text-xs text-primary-300">
            <strong className="text-primary-200">Auto-suggested</strong> for optimal recovery spacing
          </p>
          <button
            onClick={() => {
              update({ trainingDays: [], combatTrainingDays: isCombat ? [] : undefined });
            }}
            className="text-xs text-grappler-400 hover:text-grappler-200 underline ml-2 flex-shrink-0"
          >
            Clear
          </button>
        </div>
      )}

      {/* Lifting days — responsive grid */}
      <div>
        <label className="block text-sm font-medium text-grappler-300 mb-2">
          Lifting days
          <span className="text-grappler-500 ml-1">({selectedDays.length}/{data.sessionsPerWeek})</span>
        </label>
        <div className="grid grid-cols-7 gap-1">
          {DAY_NAMES.map((name, i) => {
            const isSelected = selectedDays.includes(i);
            const isCombatDay = combatDays.some(d => d.day === i);
            const atLimit = selectedDays.length >= data.sessionsPerWeek && !isSelected;
            return (
              <button
                key={i}
                onClick={() => !atLimit && toggleDay(i)}
                disabled={atLimit}
                className={cn(
                  'py-2.5 sm:py-3 rounded-lg text-center transition-all relative min-w-0',
                  isSelected
                    ? 'bg-primary-500 text-white font-bold'
                    : atLimit
                    ? 'bg-grappler-800 text-grappler-600 cursor-not-allowed'
                    : 'bg-grappler-700 text-grappler-400 hover:bg-grappler-600'
                )}
              >
                <span className="text-[10px] sm:text-xs">{name}</span>
                {isCombatDay && (
                  <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Combat training days */}
      {isCombat && (
        <div>
          <label className="block text-sm font-medium text-grappler-300 mb-1">
            {(() => {
              const sports = data.combatSports && data.combatSports.length > 0 ? data.combatSports : data.combatSport ? [data.combatSport] : [];
              const labels = sports.map(s => s === 'mma' ? 'MMA' : s === 'grappling_gi' ? 'Gi' : s === 'grappling_nogi' ? 'No-Gi' : 'Striking');
              return labels.length > 0 ? labels.join(' / ') : 'Combat';
            })()} training days
            <span className="text-grappler-500 ml-1">(tap to toggle)</span>
          </label>
          <p className="text-xs text-grappler-500 mb-2">Multiple sessions per day supported</p>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAY_NAMES.map((name, i) => {
              const isLiftDay = selectedDays.includes(i);
              const sessionsForDay = combatDayMap.get(i) || [];
              const isCombatDay = sessionsForDay.length > 0;
              return (
                <button
                  key={i}
                  onClick={() => toggleCombatDay(i)}
                  className={cn(
                    'py-2.5 sm:py-3 rounded-lg text-center transition-all relative min-w-0',
                    isCombatDay
                      ? 'bg-red-500/20 border-2 border-red-500 text-red-300 font-bold'
                      : 'bg-grappler-700 text-grappler-400 hover:bg-grappler-600'
                  )}
                >
                  <span className="text-[10px] sm:text-xs">{name}</span>
                  {sessionsForDay.length > 1 && (
                    <span className="absolute -top-1.5 -left-1 text-[9px] bg-red-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center">
                      {sessionsForDay.length}
                    </span>
                  )}
                  {isLiftDay && (
                    <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Session intensity & time-of-day selectors */}
          <AnimatePresence>
            {combatDays.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-2"
              >
                {Array.from(combatDayMap.entries()).sort(([a], [b]) => a - b).map(([day, sessions]) => (
                  <div key={day} className="bg-grappler-800/50 rounded-lg p-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-grappler-300 font-medium">{DAY_NAMES[day]}</span>
                      {sessions.length < 3 && (
                        <button
                          onClick={() => addCombatSession(day)}
                          className="flex items-center gap-1 text-[10px] text-primary-400 hover:text-primary-300 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Add session
                        </button>
                      )}
                    </div>
                    {sessions.map((cd, sessionIdx) => (
                      <div key={`${cd.day}-${cd.timeOfDay || sessionIdx}`} className="flex items-center gap-1.5">
                        {/* Time of day selector */}
                        <select
                          value={cd.timeOfDay || 'afternoon'}
                          onChange={(e) => setCombatTimeOfDay(cd.day, cd.timeOfDay, e.target.value as CombatTimeOfDay)}
                          className="bg-grappler-700 text-grappler-300 text-[10px] rounded-md px-1.5 py-1.5 border-0 outline-none w-16 flex-shrink-0"
                        >
                          <option value="morning">AM</option>
                          <option value="afternoon">PM</option>
                          <option value="evening">Eve</option>
                        </select>
                        {/* Intensity buttons */}
                        {(['light', 'moderate', 'hard'] as CombatIntensity[]).map((intensity) => (
                          <button
                            key={intensity}
                            onClick={() => setCombatIntensity(cd.day, cd.timeOfDay, intensity)}
                            className={cn(
                              'flex-1 py-1.5 rounded-md text-[10px] font-medium transition-all capitalize',
                              cd.intensity === intensity
                                ? intensity === 'light' ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                                  : intensity === 'moderate' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                                  : 'bg-red-500/20 text-red-400 border border-red-500/40'
                                : 'bg-grappler-700 text-grappler-500'
                            )}
                          >
                            {intensity}
                          </button>
                        ))}
                        {/* Remove session button (only if multiple) */}
                        {sessions.length > 1 && (
                          <button
                            onClick={() => removeCombatSession(cd.day, cd.timeOfDay)}
                            className="text-grappler-600 hover:text-red-400 transition-colors flex-shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Schedule analysis */}
      {analysis && (
        <div className="space-y-2">
          {analysis.warnings.map((w, i) => (
            <div key={`w-${i}`} className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2.5">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-yellow-300">{w}</p>
            </div>
          ))}
          {analysis.tips.map((t, i) => (
            <div key={`t-${i}`} className="flex items-start gap-2 bg-green-500/10 border border-green-500/20 rounded-lg p-2.5">
              <Sparkles className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-green-300">{t}</p>
            </div>
          ))}
        </div>
      )}

      {/* Week overview */}
      {selectedDays.length >= data.sessionsPerWeek && (
        <div className="bg-grappler-800/50 rounded-xl p-3">
          <p className="text-xs font-medium text-grappler-400 mb-2">Your week at a glance</p>
          <div className="grid grid-cols-7 gap-1">
            {DAY_NAMES.map((name, i) => {
              const isLift = selectedDays.includes(i);
              const daySessions = combatDayMap.get(i) || [];
              const hasCombat = daySessions.length > 0;
              const highestIntensity = daySessions.reduce<CombatIntensity | null>((max, s) =>
                !max ? s.intensity : s.intensity === 'hard' ? 'hard' : max === 'hard' ? 'hard' : s.intensity === 'moderate' ? 'moderate' : max,
                null
              );
              return (
                <div key={i} className="text-center">
                  <p className="text-[9px] text-grappler-500 mb-1">{name}</p>
                  <div className={cn(
                    'h-6 rounded flex items-center justify-center relative',
                    isLift && hasCombat ? 'bg-gradient-to-b from-primary-500/30 to-red-500/30 border border-primary-500/30'
                      : isLift ? 'bg-primary-500/20 border border-primary-500/30'
                      : hasCombat ? highestIntensity === 'hard' ? 'bg-red-500/20 border border-red-500/30'
                        : highestIntensity === 'moderate' ? 'bg-yellow-500/15 border border-yellow-500/20'
                        : 'bg-green-500/15 border border-green-500/20'
                      : 'bg-grappler-800'
                  )}>
                    <span className="text-[8px]">
                      {isLift && hasCombat ? 'Both' : isLift ? 'Lift' : hasCombat ? (daySessions.length > 1 ? `${daySessions.length}x` : (highestIntensity || 'M')[0].toUpperCase()) : 'Rest'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 6: Preview ──────────────────────────────────────────────────
function Step6_Preview({ data }: { data: OnboardingData }) {
  const getIdentityLabel = () => {
    if (data.trainingIdentity === 'combat') {
      const sportLabels: Record<string, string> = {
        mma: 'MMA fighter',
        grappling_gi: 'Gi grappler',
        grappling_nogi: 'No-Gi grappler',
        striking: 'Striker',
      };
      return sportLabels[data.combatSport || 'mma'] || 'Combat athlete';
    }
    if (data.trainingIdentity === 'recreational') return 'Recreational lifter';
    return 'Fitness enthusiast';
  };

  const getGoalLabel = () => {
    const isCombat = data.trainingIdentity === 'combat';
    const labels: Record<GoalFocus, string> = {
      balanced: isCombat ? 'Sport Performance' : 'Balanced training',
      strength: 'Get Stronger',
      hypertrophy: 'Build Muscle',
      power: isCombat ? 'Competition Prep' : 'Varied & fun',
    };
    return labels[data.goalFocus] || data.goalFocus;
  };

  const getSplitLabel = () => {
    if (data.sessionsPerWeek <= 3) return 'Full Body';
    if (data.sessionsPerWeek === 4) return 'Upper / Lower';
    return 'Push / Pull / Legs';
  };

  const getProgramDescription = () => {
    const isCombat = data.trainingIdentity === 'combat';
    const sport = data.combatSport;

    if (isCombat && data.goalFocus === 'balanced') {
      if (sport === 'grappling_gi' || sport === 'grappling_nogi') {
        return 'Grip strength, hip explosiveness, and pulling power to dominate on the mat.';
      }
      if (sport === 'striking') {
        return 'Rotational power, core stability, and explosive hips for devastating strikes.';
      }
      if (sport === 'mma') {
        return 'Complete combat strength: takedown power, ground control, striking force, and gas tank.';
      }
    }
    if (isCombat && data.goalFocus === 'strength') {
      return 'Heavy compound lifts to build raw strength that transfers directly to your sport.';
    }
    if (isCombat && data.goalFocus === 'hypertrophy') {
      return 'Functional muscle mass with emphasis on the muscles that matter for combat sports.';
    }
    if (data.goalFocus === 'strength') {
      return 'Progressive overload on the big lifts. Structured to build serious strength week over week.';
    }
    if (data.goalFocus === 'hypertrophy') {
      return 'Volume-driven training for muscle growth. Smart exercise selection for balanced development.';
    }
    return 'A well-rounded program tailored to your schedule and goals. Adjusts as you progress.';
  };

  const features: string[] = [];
  if (data.trainingIdentity === 'combat') {
    features.push('Sport-specific exercise selection');
    if (data.combatSport === 'grappling_gi' || data.combatSport === 'grappling_nogi') {
      features.push('Grip & pulling emphasis');
    }
    if (data.combatSport === 'striking' || data.combatSport === 'mma') {
      features.push('Rotational power work');
    }
    features.push('Programmed around your sport schedule');
  }
  if (data.experienceLevel === 'beginner') {
    features.push('Beginner-friendly progression');
  } else if (data.experienceLevel === 'advanced') {
    features.push('Advanced auto-regulation');
  }
  if (data.trainingDays && data.trainingDays.length > 0) {
    const dayLabels = data.trainingDays.map(d => DAY_NAMES[d]).join(', ');
    features.push(`Lifting on ${dayLabels}`);
  } else {
    features.push(`${data.sessionsPerWeek}x/week ${getSplitLabel()} split`);
  }
  if (data.combatTrainingDays && data.combatTrainingDays.length > 0) {
    const hardDays = data.combatTrainingDays.filter(d => d.intensity === 'hard');
    if (hardDays.length > 0) {
      features.push(`Hard sport training on ${hardDays.map(d => DAY_NAMES[d.day]).join(', ')} — auto-adjusted`);
    }
  }
  if (data.sex === 'female') {
    features.push('Female-adapted: higher volume, shorter rest, upper body boost');
  }

  features.push(`${data.sessionDurationMinutes} min sessions`);
  features.push('Progressive overload built in');
  features.push('Deload week for recovery');

  return (
    <div className="space-y-5">
      <div className="text-center mb-2">
        <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-xl font-bold text-grappler-50">Your program is ready</h2>
        <p className="text-grappler-400 text-sm">Built for a {getIdentityLabel()} who wants to {getGoalLabel().toLowerCase()}</p>
      </div>

      {/* Program summary */}
      <div className="bg-gradient-to-br from-primary-500/10 to-accent-500/10 border border-primary-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Dumbbell className="w-4 h-4 text-primary-400" />
          <p className="font-bold text-grappler-100">{data.mesoCycleWeeks || 5}-Week Program</p>
        </div>
        <p className="text-sm text-grappler-300 leading-relaxed">{getProgramDescription()}</p>
      </div>

      {/* Features list */}
      <div className="space-y-2">
        {features.map((feature, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            </div>
            <span className="text-grappler-300">{feature}</span>
          </div>
        ))}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-grappler-800/50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-grappler-100">{data.sessionsPerWeek}</p>
          <p className="text-xs text-grappler-400">Days/Week</p>
        </div>
        <div className="bg-grappler-800/50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-grappler-100">{getSplitLabel()}</p>
          <p className="text-xs text-grappler-400">Split</p>
        </div>
        <div className="bg-grappler-800/50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-grappler-100">{data.sessionDurationMinutes}m</p>
          <p className="text-xs text-grappler-400">Per Session</p>
        </div>
      </div>

      <p className="text-xs text-grappler-500 text-center">
        You can always customize exercises, volume, and emphasis later
      </p>
    </div>
  );
}
