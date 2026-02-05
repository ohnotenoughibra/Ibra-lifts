'use client';

import { useState } from 'react';
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
  Smile,
  Trophy,
  Watch,
  Activity,
  X,
} from 'lucide-react';
import { ExperienceLevel, GoalFocus, SessionsPerWeek, OnboardingData, WeightUnit, TrainingIdentity, CombatSport, CombatTrainingDay, CombatIntensity, WearableUsage, WearableProvider } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CalendarDays, AlertTriangle } from 'lucide-react';

const TOTAL_STEPS = 5;

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
        if (onboardingData.trainingIdentity === 'combat' && !onboardingData.combatSport) return false;
        return true;
      case 2:
        return !!onboardingData.goalFocus;
      case 3:
        return onboardingData.name.length >= 2 && !!onboardingData.sessionsPerWeek;
      case 4:
        // Schedule step — need at least the right number of training days selected
        return (onboardingData.trainingDays?.length || 0) >= onboardingData.sessionsPerWeek;
      case 5:
        return true; // Preview — always can proceed
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-grappler-900 bg-mesh px-4 py-8">
      {/* Progress dots */}
      <div className="max-w-lg mx-auto mb-8 flex items-center justify-center gap-3">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
          <div key={step} className="flex items-center gap-3">
            <div
              className={cn(
                'w-2.5 h-2.5 rounded-full transition-all',
                currentStep >= step ? 'bg-primary-500 scale-125' : 'bg-grappler-700'
              )}
            />
          </div>
        ))}
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
              <Step3_Setup data={onboardingData} update={updateOnboardingData} />
            )}
            {currentStep === 4 && (
              <Step4_Schedule data={onboardingData} update={updateOnboardingData} />
            )}
            {currentStep === 5 && (
              <Step5_Preview data={onboardingData} />
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
            className="overflow-hidden"
          >
            <label className="block text-sm font-medium text-grappler-300 mb-2">Your sport</label>
            <div className="grid grid-cols-2 gap-2">
              {combatSports.map((sport) => (
                <button
                  key={sport.value}
                  onClick={() => update({ combatSport: sport.value })}
                  className={cn(
                    'p-3 rounded-xl border-2 text-left transition-all',
                    data.combatSport === sport.value
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-grappler-700 hover:border-grappler-600'
                  )}
                >
                  <p className="text-sm font-medium text-grappler-100">{sport.title}</p>
                  <p className="text-[10px] text-grappler-400">{sport.desc}</p>
                </button>
              ))}
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

// ─── Step 3: Setup ────────────────────────────────────────────────────
function Step3_Setup({
  data,
  update,
}: {
  data: OnboardingData;
  update: (data: Partial<OnboardingData>) => void;
}) {
  const wearableOptions: { value: WearableUsage; icon: any; title: string; desc: string; color: string }[] = [
    { value: 'whoop', icon: Activity, title: 'Whoop', desc: 'Auto-sync recovery & strain data', color: 'emerald' },
    { value: 'other_wearable', icon: Watch, title: 'Other Wearable', desc: 'Apple Watch, Oura, Garmin, etc.', color: 'blue' },
    { value: 'no_wearable', icon: X, title: 'No Wearable', desc: 'I\'ll log manually', color: 'gray' },
  ];

  return (
    <div className="space-y-5">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-grappler-50">Your setup</h2>
        <p className="text-grappler-400 text-sm">So we can build the right program</p>
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
              <p className="text-[10px] opacity-70">{level.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Days per week */}
      <div>
        <label className="block text-sm font-medium text-grappler-300 mb-1.5">Days per week</label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
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

      {/* Session duration + Units in a row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-grappler-300 mb-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-grappler-400" />
            Session
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {[45, 60, 75, 90].map((mins) => (
              <button
                key={mins}
                onClick={() => update({ sessionDurationMinutes: mins })}
                className={cn(
                  'py-2 rounded-lg text-sm font-bold transition-all',
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
        <div>
          <label className="block text-sm font-medium text-grappler-300 mb-1.5">Units</label>
          <div className="grid grid-cols-2 gap-1.5">
            {(['kg', 'lbs'] as WeightUnit[]).map((unit) => (
              <button
                key={unit}
                onClick={() => update({ weightUnit: unit })}
                className={cn(
                  'py-2 rounded-lg text-sm font-medium transition-all',
                  data.weightUnit === unit
                    ? 'bg-primary-500 text-white'
                    : 'bg-grappler-700 text-grappler-400'
                )}
              >
                {unit.toUpperCase()}
              </button>
            ))}
          </div>
          <label className="block text-sm font-medium text-grappler-300 mt-3 mb-1.5">Equipment</label>
          <div className="space-y-1.5">
            {([
              { value: 'full_gym' as const, label: 'Full Gym' },
              { value: 'home_gym' as const, label: 'Home Gym' },
              { value: 'minimal' as const, label: 'Minimal' },
            ]).map((eq) => (
              <button
                key={eq.value}
                onClick={() => update({ equipment: eq.value })}
                className={cn(
                  'w-full py-2 rounded-lg text-sm font-medium transition-all',
                  data.equipment === eq.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-grappler-700 text-grappler-400'
                )}
              >
                {eq.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Wearable Section */}
      <div className="pt-2 border-t border-grappler-700">
        <label className="block text-sm font-medium text-grappler-300 mb-2 flex items-center gap-1.5">
          <Watch className="w-3.5 h-3.5 text-grappler-400" />
          Do you use a fitness wearable?
        </label>
        <p className="text-xs text-grappler-500 mb-3">
          We can use your recovery data to optimize training recommendations
        </p>
        <div className="space-y-2">
          {wearableOptions.map((opt) => {
            const selected = data.wearableUsage === opt.value;
            const colorClasses = {
              emerald: { border: 'border-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-400', iconBg: 'bg-emerald-500/20' },
              blue: { border: 'border-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-400', iconBg: 'bg-blue-500/20' },
              gray: { border: 'border-grappler-600', bg: 'bg-grappler-700/50', text: 'text-grappler-400', iconBg: 'bg-grappler-700' },
            };
            const colors = colorClasses[opt.color as keyof typeof colorClasses];
            return (
              <button
                key={opt.value}
                onClick={() => {
                  update({ wearableUsage: opt.value });
                  // Set default provider for whoop
                  if (opt.value === 'whoop') {
                    update({ wearableProvider: 'whoop' });
                  } else if (opt.value === 'no_wearable') {
                    update({ wearableProvider: undefined });
                  }
                }}
                className={cn(
                  'w-full p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3',
                  selected ? `${colors.border} ${colors.bg}` : 'border-grappler-700 hover:border-grappler-600'
                )}
              >
                <div className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                  selected ? colors.iconBg : 'bg-grappler-700/50'
                )}>
                  <opt.icon className={cn('w-4 h-4', selected ? colors.text : 'text-grappler-500')} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-grappler-100">{opt.title}</p>
                  <p className="text-[10px] text-grappler-400">{opt.desc}</p>
                </div>
                {selected && opt.value === 'whoop' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Recommended
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {/* Other wearable provider selector */}
        <AnimatePresence>
          {data.wearableUsage === 'other_wearable' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-3"
            >
              <label className="block text-xs text-grappler-400 mb-1.5">Which wearable?</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'apple_health' as WearableProvider, label: 'Apple Watch' },
                  { value: 'oura' as WearableProvider, label: 'Oura' },
                  { value: 'garmin' as WearableProvider, label: 'Garmin' },
                ]).map((w) => (
                  <button
                    key={w.value}
                    onClick={() => update({ wearableProvider: w.value })}
                    className={cn(
                      'py-2 rounded-lg text-xs font-medium transition-all',
                      data.wearableProvider === w.value
                        ? 'bg-blue-500 text-white'
                        : 'bg-grappler-700 text-grappler-400'
                    )}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Benefit note for wearable users */}
        {(data.wearableUsage === 'whoop' || data.wearableUsage === 'other_wearable') && (
          <div className="mt-3 bg-primary-500/10 border border-primary-500/20 rounded-lg p-2.5">
            <p className="text-xs text-primary-300">
              <strong className="text-primary-200">Benefits:</strong> Auto-adjusted workout intensity,
              recovery-based suggestions, sleep tracking, and personalized readiness scores.
            </p>
          </div>
        )}
        {data.wearableUsage === 'no_wearable' && (
          <div className="mt-3 bg-grappler-800/50 border border-grappler-700 rounded-lg p-2.5">
            <p className="text-xs text-grappler-400">
              No problem! We'll use your manual check-ins (sleep, soreness, energy) to guide your training.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 4: Training Schedule ─────────────────────────────────────────
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function Step4_Schedule({
  data,
  update,
}: {
  data: OnboardingData;
  update: (data: Partial<OnboardingData>) => void;
}) {
  const isCombat = data.trainingIdentity === 'combat';
  const selectedDays = data.trainingDays || [];
  const combatDays = data.combatTrainingDays || [];

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

  const toggleCombatDay = (day: number) => {
    const current = [...combatDays];
    const idx = current.findIndex(d => d.day === day);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push({ day, intensity: 'moderate' });
    }
    current.sort((a, b) => a.day - b.day);
    update({ combatTrainingDays: current });
  };

  const setCombatIntensity = (day: number, intensity: CombatIntensity) => {
    const current = [...combatDays];
    const idx = current.findIndex(d => d.day === day);
    if (idx >= 0) {
      current[idx] = { ...current[idx], intensity };
      update({ combatTrainingDays: current });
    }
  };

  // Build a recovery analysis based on selected days
  const getScheduleAnalysis = () => {
    if (selectedDays.length < data.sessionsPerWeek) return null;

    const allTrainingDays = new Set([...selectedDays, ...combatDays.map(d => d.day)]);
    const hardCombatDays = new Set(combatDays.filter(d => d.intensity === 'hard').map(d => d.day));

    const warnings: string[] = [];
    const tips: string[] = [];

    // Check for consecutive lifting days
    for (let i = 0; i < selectedDays.length - 1; i++) {
      const gap = selectedDays[i + 1] - selectedDays[i];
      if (gap === 1) {
        warnings.push(`${DAY_NAMES[selectedDays[i]]} and ${DAY_NAMES[selectedDays[i + 1]]} are back-to-back — we'll program different muscle groups`);
        break;
      }
    }

    // Check for lifting day after hard combat
    for (const liftDay of selectedDays) {
      const prevDay = liftDay === 0 ? 6 : liftDay - 1;
      if (hardCombatDays.has(prevDay)) {
        warnings.push(`Lifting on ${DAY_NAMES[liftDay]} after hard ${DAY_NAMES[prevDay]} training — we'll auto-reduce intensity`);
        break;
      }
    }

    // Check for rest days
    const restDays = [0, 1, 2, 3, 4, 5, 6].filter(d => !allTrainingDays.has(d));
    if (restDays.length === 0) {
      warnings.push('No rest days — consider keeping at least 1 full recovery day');
    } else if (restDays.length >= 2) {
      tips.push(`${restDays.length} rest days for recovery — solid schedule`);
    }

    // Science tip
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

      {/* Lifting days */}
      <div>
        <label className="block text-sm font-medium text-grappler-300 mb-2">
          Lifting days
          <span className="text-grappler-500 ml-1">({selectedDays.length}/{data.sessionsPerWeek})</span>
        </label>
        <div className="grid grid-cols-7 gap-1.5">
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
                  'py-3 rounded-lg text-center transition-all relative',
                  isSelected
                    ? 'bg-primary-500 text-white font-bold'
                    : atLimit
                    ? 'bg-grappler-800 text-grappler-600 cursor-not-allowed'
                    : 'bg-grappler-700 text-grappler-400 hover:bg-grappler-600'
                )}
              >
                <span className="text-xs">{name}</span>
                {isCombatDay && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Combat training days */}
      {isCombat && (
        <div>
          <label className="block text-sm font-medium text-grappler-300 mb-2">
            {data.combatSport === 'mma' ? 'MMA' :
             data.combatSport === 'grappling_gi' ? 'Gi' :
             data.combatSport === 'grappling_nogi' ? 'No-Gi' :
             'Striking'} training days
            <span className="text-grappler-500 ml-1">(tap to toggle)</span>
          </label>
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {DAY_NAMES.map((name, i) => {
              const isLiftDay = selectedDays.includes(i);
              const isCombatDay = combatDays.some(d => d.day === i);
              return (
                <button
                  key={i}
                  onClick={() => toggleCombatDay(i)}
                  className={cn(
                    'py-3 rounded-lg text-center transition-all relative',
                    isCombatDay
                      ? 'bg-red-500/20 border-2 border-red-500 text-red-300 font-bold'
                      : 'bg-grappler-700 text-grappler-400 hover:bg-grappler-600'
                  )}
                >
                  <span className="text-xs">{name}</span>
                  {isLiftDay && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Intensity selectors for active combat days */}
          <AnimatePresence>
            {combatDays.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-2"
              >
                {combatDays.map((cd) => (
                  <div key={cd.day} className="flex items-center gap-2 bg-grappler-800/50 rounded-lg p-2">
                    <span className="text-xs text-grappler-300 w-10 font-medium">{DAY_NAMES[cd.day]}</span>
                    {(['light', 'moderate', 'hard'] as CombatIntensity[]).map((intensity) => (
                      <button
                        key={intensity}
                        onClick={() => setCombatIntensity(cd.day, intensity)}
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
              const combat = combatDays.find(d => d.day === i);
              return (
                <div key={i} className="text-center">
                  <p className="text-[9px] text-grappler-500 mb-1">{name}</p>
                  <div className={cn(
                    'h-6 rounded flex items-center justify-center',
                    isLift && combat ? 'bg-gradient-to-b from-primary-500/30 to-red-500/30 border border-primary-500/30'
                      : isLift ? 'bg-primary-500/20 border border-primary-500/30'
                      : combat ? combat.intensity === 'hard' ? 'bg-red-500/20 border border-red-500/30'
                        : combat.intensity === 'moderate' ? 'bg-yellow-500/15 border border-yellow-500/20'
                        : 'bg-green-500/15 border border-green-500/20'
                      : 'bg-grappler-800'
                  )}>
                    <span className="text-[8px]">
                      {isLift && combat ? 'Both' : isLift ? 'Lift' : combat ? combat.intensity[0].toUpperCase() : 'Rest'}
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

// ─── Step 5: Preview ──────────────────────────────────────────────────
function Step5_Preview({ data }: { data: OnboardingData }) {
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
        return 'Grip strength, hip explosiveness, and pulling power to dominate on the mat. Programmed to complement your rolling schedule.';
      }
      if (sport === 'striking') {
        return 'Rotational power, core stability, and explosive hips for devastating strikes. Built around your training camps.';
      }
      if (sport === 'mma') {
        return 'Complete combat strength: takedown power, ground control, striking force, and gas tank. The total package.';
      }
    }
    if (isCombat && data.goalFocus === 'strength') {
      return 'Heavy compound lifts to build raw strength that transfers directly to your sport. Low volume, high intensity.';
    }
    if (isCombat && data.goalFocus === 'hypertrophy') {
      return 'Functional muscle mass with emphasis on the muscles that matter for combat sports. Size that serves a purpose.';
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
    features.push('Lower intensity to build base');
  } else if (data.experienceLevel === 'advanced') {
    features.push('Advanced auto-regulation');
    features.push('Higher volume for growth');
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
      features.push(`Hard sport training on ${hardDays.map(d => DAY_NAMES[d.day]).join(', ')} — lifting intensity auto-adjusted`);
    }
  }
  features.push(`${data.sessionDurationMinutes} min sessions`);
  features.push('Progressive overload built in');
  features.push('Deload week for recovery');
  // Wearable-specific features
  if (data.wearableUsage === 'whoop') {
    features.push('Whoop integration — auto-sync recovery & strain');
    features.push('Workout intensity auto-adjusted to recovery score');
  } else if (data.wearableUsage === 'other_wearable') {
    const providerName = data.wearableProvider === 'apple_health' ? 'Apple Watch' :
      data.wearableProvider === 'oura' ? 'Oura' :
      data.wearableProvider === 'garmin' ? 'Garmin' : 'Wearable';
    features.push(`${providerName} data support`);
    features.push('Recovery-aware scheduling');
  } else {
    features.push('Manual check-in for recovery tracking');
    features.push('Recovery-aware scheduling');
  }

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
          <p className="font-bold text-grappler-100">5-Week Program</p>
        </div>
        <p className="text-sm text-grappler-300 leading-relaxed">{getProgramDescription()}</p>
      </div>

      {/* Features list */}
      <div className="space-y-2">
        {features.map((feature, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />
            <span className="text-grappler-300">{feature}</span>
          </div>
        ))}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-grappler-800/50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-grappler-100">{data.sessionsPerWeek}</p>
          <p className="text-[10px] text-grappler-400">Days/Week</p>
        </div>
        <div className="bg-grappler-800/50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-grappler-100">{getSplitLabel()}</p>
          <p className="text-[10px] text-grappler-400">Split</p>
        </div>
        <div className="bg-grappler-800/50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-grappler-100">{data.sessionDurationMinutes}m</p>
          <p className="text-[10px] text-grappler-400">Per Session</p>
        </div>
      </div>

      <p className="text-xs text-grappler-500 text-center">
        You can always customize exercises, volume, and emphasis later
      </p>
    </div>
  );
}
