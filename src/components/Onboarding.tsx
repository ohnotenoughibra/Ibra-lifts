'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import {
  Dumbbell,
  User,
  Target,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Check,
  Home,
  Building2,
  Backpack,
  Zap,
  Heart,
  Scale,
  Trophy
} from 'lucide-react';
import { ExperienceLevel, Equipment, GoalFocus, SessionsPerWeek, OnboardingData, WeightUnit } from '@/lib/types';
import { cn } from '@/lib/utils';

const steps = [
  { id: 1, title: 'Welcome', icon: Dumbbell },
  { id: 2, title: 'About You', icon: User },
  { id: 3, title: 'Equipment', icon: Building2 },
  { id: 4, title: 'Goals', icon: Target },
  { id: 5, title: 'Schedule', icon: Calendar },
  { id: 6, title: 'Baseline', icon: Trophy },
];

export default function Onboarding() {
  const { onboardingData, updateOnboardingData, completeOnboarding } = useAppStore();
  const [currentStep, setCurrentStep] = useState(1);

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
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
        return true;
      case 2:
        return onboardingData.name.length >= 2 && onboardingData.age >= 16;
      case 3:
        return !!onboardingData.equipment;
      case 4:
        return !!onboardingData.goalFocus;
      case 5:
        return !!onboardingData.sessionsPerWeek && !!onboardingData.experienceLevel;
      case 6:
        return true; // Baseline lifts are optional
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-grappler-900 bg-mesh px-4 py-8">
      {/* Progress indicator */}
      <div className="max-w-lg mx-auto mb-8">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{
                  scale: currentStep === step.id ? 1.1 : 1,
                  backgroundColor:
                    currentStep >= step.id
                      ? 'rgb(14, 165, 233)'
                      : 'rgb(51, 65, 85)',
                }}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  currentStep >= step.id ? 'text-white' : 'text-grappler-400'
                )}
              >
                {currentStep > step.id ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <step.icon className="w-5 h-5" />
                )}
              </motion.div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-8 h-0.5 mx-1',
                    currentStep > step.id ? 'bg-primary-500' : 'bg-grappler-700'
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-grappler-400 text-sm">
          Step {currentStep} of {steps.length}: {steps[currentStep - 1].title}
        </p>
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
            {currentStep === 1 && <WelcomeStep />}
            {currentStep === 2 && (
              <AboutYouStep
                data={onboardingData}
                update={updateOnboardingData}
              />
            )}
            {currentStep === 3 && (
              <EquipmentStep
                data={onboardingData}
                update={updateOnboardingData}
              />
            )}
            {currentStep === 4 && (
              <GoalsStep data={onboardingData} update={updateOnboardingData} />
            )}
            {currentStep === 5 && (
              <ScheduleStep
                data={onboardingData}
                update={updateOnboardingData}
              />
            )}
            {currentStep === 6 && (
              <BaselineStep
                data={onboardingData}
                update={updateOnboardingData}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className={cn(
              'btn btn-secondary btn-md gap-2',
              currentStep === 1 && 'opacity-0 pointer-events-none'
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
            {currentStep === steps.length ? 'Get Started' : 'Continue'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Step 1: Welcome
function WelcomeStep() {
  return (
    <div className="text-center py-4">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.2 }}
        className="w-20 h-20 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center mx-auto mb-6"
      >
        <Dumbbell className="w-10 h-10 text-white" />
      </motion.div>
      <h1 className="text-2xl font-bold text-grappler-50 mb-3">
        Welcome to Grappler Gains
      </h1>
      <p className="text-grappler-400 mb-6">
        Science-based training designed for combat athletes. Build strength and
        muscle while optimizing for your grappling performance.
      </p>
      <div className="grid grid-cols-2 gap-3 text-left">
        {[
          { icon: Zap, text: 'Undulating periodization' },
          { icon: Target, text: 'Personalized programming' },
          { icon: Trophy, text: 'Gamified progression' },
          { icon: Heart, text: 'Grappler-specific' },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="flex items-center gap-2 text-sm text-grappler-300"
          >
            <item.icon className="w-4 h-4 text-primary-400" />
            {item.text}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Step 2: About You
function AboutYouStep({
  data,
  update,
}: {
  data: OnboardingData;
  update: (data: Partial<OnboardingData>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-grappler-50">About You</h2>
        <p className="text-grappler-400 text-sm">
          Help us personalize your training
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-grappler-300 mb-2">
          Your Name
        </label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Enter your name"
          className="input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-grappler-300 mb-2">
          Age
        </label>
        <input
          type="number"
          value={data.age}
          onChange={(e) => update({ age: parseInt(e.target.value) || 0 })}
          min={16}
          max={100}
          className="input"
        />
        <p className="text-xs text-grappler-500 mt-1">
          Used for appropriate training intensity
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-grappler-300 mb-2">
          Weight Unit
        </label>
        <div className="grid grid-cols-2 gap-3">
          {(['lbs', 'kg'] as WeightUnit[]).map((unit) => (
            <button
              key={unit}
              onClick={() => update({ weightUnit: unit })}
              className={cn(
                'p-4 rounded-xl border-2 text-center transition-all',
                data.weightUnit === unit
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-grappler-700 hover:border-grappler-600'
              )}
            >
              <p className="text-2xl font-bold text-grappler-50 mb-1">{unit.toUpperCase()}</p>
              <p className="text-xs text-grappler-400">
                {unit === 'lbs' ? 'Pounds' : 'Kilograms'}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Step 3: Equipment
function EquipmentStep({
  data,
  update,
}: {
  data: OnboardingData;
  update: (data: Partial<OnboardingData>) => void;
}) {
  const options: { value: Equipment; icon: any; title: string; desc: string }[] = [
    {
      value: 'full_gym',
      icon: Building2,
      title: 'Full Gym',
      desc: 'Barbells, machines, cables, everything',
    },
    {
      value: 'home_gym',
      icon: Home,
      title: 'Home Gym',
      desc: 'Barbells, dumbbells, rack, bench',
    },
    {
      value: 'minimal',
      icon: Backpack,
      title: 'Minimal',
      desc: 'Dumbbells, kettlebells, pull-up bar',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-grappler-50">Your Equipment</h2>
        <p className="text-grappler-400 text-sm">
          We'll customize exercises based on what you have
        </p>
      </div>

      <div className="space-y-3">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => update({ equipment: option.value })}
            className={cn(
              'w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all',
              data.equipment === option.value
                ? 'border-primary-500 bg-primary-500/10'
                : 'border-grappler-700 hover:border-grappler-600'
            )}
          >
            <div
              className={cn(
                'w-12 h-12 rounded-lg flex items-center justify-center',
                data.equipment === option.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-grappler-700 text-grappler-400'
              )}
            >
              <option.icon className="w-6 h-6" />
            </div>
            <div className="text-left">
              <p className="font-medium text-grappler-100">{option.title}</p>
              <p className="text-sm text-grappler-400">{option.desc}</p>
            </div>
            {data.equipment === option.value && (
              <Check className="w-5 h-5 text-primary-500 ml-auto" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// Step 4: Goals
function GoalsStep({
  data,
  update,
}: {
  data: OnboardingData;
  update: (data: Partial<OnboardingData>) => void;
}) {
  const options: { value: GoalFocus; icon: any; title: string; desc: string; color: string }[] = [
    {
      value: 'strength',
      icon: Zap,
      title: 'Strength Focus',
      desc: 'Maximize force production with heavier loads',
      color: 'strength',
    },
    {
      value: 'hypertrophy',
      icon: Heart,
      title: 'Aesthetics Focus',
      desc: 'Build muscle size and definition',
      color: 'hypertrophy',
    },
    {
      value: 'balanced',
      icon: Scale,
      title: 'Balanced (Recommended)',
      desc: 'Optimal blend for grapplers',
      color: 'primary',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-grappler-50">Your Goal</h2>
        <p className="text-grappler-400 text-sm">
          Choose your primary training emphasis
        </p>
      </div>

      <div className="space-y-3">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => update({ goalFocus: option.value })}
            className={cn(
              'w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all',
              data.goalFocus === option.value
                ? `border-${option.color}-500 bg-${option.color}-500/10`
                : 'border-grappler-700 hover:border-grappler-600',
              data.goalFocus === option.value && option.value === 'strength' && 'border-red-500 bg-red-500/10',
              data.goalFocus === option.value && option.value === 'hypertrophy' && 'border-purple-500 bg-purple-500/10',
              data.goalFocus === option.value && option.value === 'balanced' && 'border-primary-500 bg-primary-500/10'
            )}
          >
            <div
              className={cn(
                'w-12 h-12 rounded-lg flex items-center justify-center',
                data.goalFocus === option.value
                  ? option.value === 'strength' ? 'bg-red-500 text-white' :
                    option.value === 'hypertrophy' ? 'bg-purple-500 text-white' :
                    'bg-primary-500 text-white'
                  : 'bg-grappler-700 text-grappler-400'
              )}
            >
              <option.icon className="w-6 h-6" />
            </div>
            <div className="text-left flex-1">
              <p className="font-medium text-grappler-100">{option.title}</p>
              <p className="text-sm text-grappler-400">{option.desc}</p>
            </div>
            {data.goalFocus === option.value && (
              <Check className={cn(
                'w-5 h-5',
                option.value === 'strength' ? 'text-red-500' :
                option.value === 'hypertrophy' ? 'text-purple-500' :
                'text-primary-500'
              )} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// Step 5: Schedule
function ScheduleStep({
  data,
  update,
}: {
  data: OnboardingData;
  update: (data: Partial<OnboardingData>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-grappler-50">Training Schedule</h2>
        <p className="text-grappler-400 text-sm">
          How often can you lift each week?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {([2, 3] as SessionsPerWeek[]).map((sessions) => (
          <button
            key={sessions}
            onClick={() => update({ sessionsPerWeek: sessions })}
            className={cn(
              'p-6 rounded-xl border-2 text-center transition-all',
              data.sessionsPerWeek === sessions
                ? 'border-primary-500 bg-primary-500/10'
                : 'border-grappler-700 hover:border-grappler-600'
            )}
          >
            <p className="text-3xl font-bold text-grappler-50 mb-1">{sessions}</p>
            <p className="text-sm text-grappler-400">sessions/week</p>
          </button>
        ))}
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium text-grappler-300 mb-3">
          Experience Level
        </label>
        <div className="space-y-2">
          {(['beginner', 'intermediate', 'advanced'] as ExperienceLevel[]).map(
            (level) => (
              <button
                key={level}
                onClick={() => update({ experienceLevel: level })}
                className={cn(
                  'w-full p-3 rounded-lg border text-left transition-all flex items-center justify-between',
                  data.experienceLevel === level
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-grappler-700 hover:border-grappler-600'
                )}
              >
                <span className="capitalize text-grappler-200">{level}</span>
                {data.experienceLevel === level && (
                  <Check className="w-4 h-4 text-primary-500" />
                )}
              </button>
            )
          )}
        </div>
        <p className="text-xs text-grappler-500 mt-2">
          Intermediate: 1+ years consistent lifting. Advanced: 3+ years.
        </p>
      </div>
    </div>
  );
}

// Step 6: Baseline Lifts
function BaselineStep({
  data,
  update,
}: {
  data: OnboardingData;
  update: (data: Partial<OnboardingData>) => void;
}) {
  const updateLift = (lift: string, value: string) => {
    const numValue = parseInt(value) || null;
    update({
      baselineLifts: {
        ...data.baselineLifts,
        [lift]: numValue,
      },
    });
  };

  const unit = data.weightUnit || 'lbs';
  const lifts = unit === 'kg' ? [
    { key: 'squat', name: 'Back Squat', placeholder: 'e.g., 100' },
    { key: 'deadlift', name: 'Deadlift', placeholder: 'e.g., 140' },
    { key: 'benchPress', name: 'Bench Press', placeholder: 'e.g., 85' },
    { key: 'overheadPress', name: 'Overhead Press', placeholder: 'e.g., 60' },
  ] : [
    { key: 'squat', name: 'Back Squat', placeholder: 'e.g., 225' },
    { key: 'deadlift', name: 'Deadlift', placeholder: 'e.g., 315' },
    { key: 'benchPress', name: 'Bench Press', placeholder: 'e.g., 185' },
    { key: 'overheadPress', name: 'Overhead Press', placeholder: 'e.g., 135' },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-grappler-50">Baseline Lifts</h2>
        <p className="text-grappler-400 text-sm">
          Enter your estimated 1RM (or leave blank)
        </p>
      </div>

      <div className="space-y-4">
        {lifts.map((lift) => (
          <div key={lift.key}>
            <label className="block text-sm font-medium text-grappler-300 mb-1">
              {lift.name} ({unit})
            </label>
            <input
              type="number"
              value={(data.baselineLifts as any)[lift.key] || ''}
              onChange={(e) => updateLift(lift.key, e.target.value)}
              placeholder={lift.placeholder}
              className="input"
            />
          </div>
        ))}
      </div>

      <div className="bg-grappler-800/50 rounded-lg p-4 text-sm text-grappler-400">
        <p className="font-medium text-grappler-300 mb-1">Don't know your 1RM?</p>
        <p>
          No problem! We'll use RPE-based progression and calculate estimates as
          you train. You can skip this step.
        </p>
      </div>
    </div>
  );
}
