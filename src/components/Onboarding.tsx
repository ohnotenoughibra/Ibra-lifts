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
} from 'lucide-react';
import { ExperienceLevel, GoalFocus, SessionsPerWeek, OnboardingData, WeightUnit } from '@/lib/types';
import { cn } from '@/lib/utils';

const steps = [
  { id: 1, title: 'About You' },
  { id: 2, title: 'Your Plan' },
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
        return onboardingData.name.length >= 2 && onboardingData.age >= 16;
      case 2:
        return !!onboardingData.goalFocus && !!onboardingData.sessionsPerWeek;
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-grappler-900 bg-mesh px-4 py-8">
      {/* Simple progress dots */}
      <div className="max-w-lg mx-auto mb-8 flex items-center justify-center gap-3">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-3">
            <div
              className={cn(
                'w-2.5 h-2.5 rounded-full transition-all',
                currentStep >= step.id ? 'bg-primary-500 scale-125' : 'bg-grappler-700'
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
              <Step1_AboutYou data={onboardingData} update={updateOnboardingData} />
            )}
            {currentStep === 2 && (
              <Step2_Plan data={onboardingData} update={updateOnboardingData} />
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
            {currentStep === steps.length ? 'Generate My Plan' : 'Continue'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Step 1: Name + Age + Unit + Experience
function Step1_AboutYou({
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
        <h2 className="text-xl font-bold text-grappler-50">Let's set up your training</h2>
        <p className="text-grappler-400 text-sm">Takes 20 seconds</p>
      </div>

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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-grappler-300 mb-1.5">Age</label>
          <input
            type="number"
            inputMode="numeric"
            value={data.age}
            onChange={(e) => update({ age: parseInt(e.target.value) || 0 })}
            min={16}
            max={100}
            className="input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-grappler-300 mb-1.5">Units</label>
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
      </div>

      <div>
        <label className="block text-sm font-medium text-grappler-300 mb-1.5">Experience</label>
        <div className="grid grid-cols-3 gap-2">
          {(['beginner', 'intermediate', 'advanced'] as ExperienceLevel[]).map((level) => (
            <button
              key={level}
              onClick={() => update({ experienceLevel: level })}
              className={cn(
                'py-2 rounded-lg text-xs font-medium capitalize transition-all',
                data.experienceLevel === level
                  ? 'bg-primary-500 text-white'
                  : 'bg-grappler-700 text-grappler-400'
              )}
            >
              {level}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Step 2: Goal + Schedule (equipment defaults to full_gym, switchable in-app)
function Step2_Plan({
  data,
  update,
}: {
  data: OnboardingData;
  update: (data: Partial<OnboardingData>) => void;
}) {
  const goals: { value: GoalFocus; icon: any; title: string; color: string }[] = [
    { value: 'strength', icon: Zap, title: 'Strength', color: 'red' },
    { value: 'hypertrophy', icon: Heart, title: 'Muscle', color: 'purple' },
    { value: 'balanced', icon: Scale, title: 'Balanced', color: 'primary' },
  ];

  return (
    <div className="space-y-5">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-grappler-50">Your training plan</h2>
        <p className="text-grappler-400 text-sm">We'll build a program for you</p>
      </div>

      {/* Goal */}
      <div>
        <label className="block text-sm font-medium text-grappler-300 mb-2">Focus</label>
        <div className="grid grid-cols-3 gap-2">
          {goals.map((g) => (
            <button
              key={g.value}
              onClick={() => update({ goalFocus: g.value })}
              className={cn(
                'p-3 rounded-xl border-2 text-center transition-all',
                data.goalFocus === g.value
                  ? g.value === 'strength' ? 'border-red-500 bg-red-500/10' :
                    g.value === 'hypertrophy' ? 'border-purple-500 bg-purple-500/10' :
                    'border-primary-500 bg-primary-500/10'
                  : 'border-grappler-700 hover:border-grappler-600'
              )}
            >
              <g.icon className={cn(
                'w-5 h-5 mx-auto mb-1',
                data.goalFocus === g.value
                  ? g.value === 'strength' ? 'text-red-400' : g.value === 'hypertrophy' ? 'text-purple-400' : 'text-primary-400'
                  : 'text-grappler-500'
              )} />
              <p className="text-xs font-medium text-grappler-200">{g.title}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Sessions per week */}
      <div>
        <label className="block text-sm font-medium text-grappler-300 mb-2">Days per week</label>
        <div className="grid grid-cols-6 gap-2">
          {([1, 2, 3, 4, 5, 6] as SessionsPerWeek[]).map((n) => (
            <button
              key={n}
              onClick={() => update({ sessionsPerWeek: n })}
              className={cn(
                'py-3 rounded-lg text-lg font-bold transition-all',
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
    </div>
  );
}
