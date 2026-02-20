'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Dumbbell,
  Brain,
  TrendingUp,
  Heart,
  Zap,
  Target,
  Activity,
  Calendar,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewUserGuideProps {
  onComplete: () => void;
}

interface GuideStepDef {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  tip: string;
  color: string;
}

const GUIDE_STEPS: GuideStepDef[] = [
  {
    id: 'welcome',
    icon: <Dumbbell className="w-8 h-8" />,
    title: 'Welcome to Roots Gains',
    description: 'Your science-based strength training platform built for martial artists and combat athletes. Every decision is backed by peer-reviewed research.',
    features: [
      'Periodized programming (DUP, Block, Linear)',
      'Combat sport load management',
      'Smart auto-regulation based on your data',
    ],
    tip: 'The app adapts to your training — the more data you log, the smarter it gets.',
    color: 'text-primary-400 bg-primary-500/20',
  },
  {
    id: 'workout',
    icon: <Target className="w-8 h-8" />,
    title: 'Start Your Workout',
    description: 'From the Home tab, tap any scheduled session to begin. The app pre-fills weights from your last session and adjusts based on your recovery.',
    features: [
      'Pre-workout check-in (sleep, stress, soreness)',
      'Real-time PR detection with estimated 1RM tracking',
      'RPE-based auto-regulation per set',
      'Rest timer with background notifications',
    ],
    tip: 'Fill in the pre-workout check-in honestly — it directly adjusts your workout intensity.',
    color: 'text-red-400 bg-red-500/20',
  },
  {
    id: 'program',
    icon: <Calendar className="w-8 h-8" />,
    title: 'Your Program',
    description: 'The Program tab shows your full mesocycle — weeks of periodized training with progressive overload built in. Deload weeks are automatic.',
    features: [
      'View all weeks and sessions at a glance',
      'Volume and intensity progression charts',
      'Swap exercises that don\'t work for you',
      'Generate a new block when the current one ends',
    ],
    tip: 'After completing a mesocycle, the app suggests your next block based on performance data.',
    color: 'text-purple-400 bg-purple-500/20',
  },
  {
    id: 'recovery',
    icon: <Brain className="w-8 h-8" />,
    title: 'Recovery Intelligence',
    description: 'The app integrates sleep, nutrition, stress, HRV, and training load into a single Readiness Score that modifies your workout in real-time.',
    features: [
      'Holistic readiness score (sleep + nutrition + stress + more)',
      'Wearable integration (Whoop, Apple Watch, Garmin, Oura)',
      'HRV-guided training with rolling baselines',
      'Graceful degradation — works even if you only track some metrics',
    ],
    tip: 'Connect a wearable for the most accurate readiness data, or just log sleep and stress manually.',
    color: 'text-blue-400 bg-blue-500/20',
  },
  {
    id: 'injury',
    icon: <Heart className="w-8 h-8" />,
    title: 'Injury Science',
    description: 'Log injuries to get evidence-based recovery timelines, progressive return-to-training protocols, and automatic exercise modifications.',
    features: [
      'Tissue-type classification (muscle, tendon, ligament, nerve)',
      'Science-based heal time estimates',
      '4-phase return-to-training protocol',
      'Automatic exercise avoidance and modification',
    ],
    tip: 'The app classifies your injury by tissue type and pain characteristics to predict recovery.',
    color: 'text-red-400 bg-red-500/20',
  },
  {
    id: 'nutrition',
    icon: <Activity className="w-8 h-8" />,
    title: 'Nutrition & Tracking',
    description: 'Track meals, macros, water, and body composition. The nutrition data feeds back into your readiness score and workout adjustments.',
    features: [
      'Macro tracking with protein-per-kg targets',
      'Diet phase coaching (cut, bulk, maintain)',
      'Water intake tracking',
      'Body composition trends',
    ],
    tip: 'Protein is the most important macro — aim for 1.6-2.2g/kg bodyweight spread across 4+ meals.',
    color: 'text-green-400 bg-green-500/20',
  },
  {
    id: 'progress',
    icon: <TrendingUp className="w-8 h-8" />,
    title: 'Track Your Progress',
    description: 'Strength curves, volume trends, muscle distribution, and automated insights. Everything you need to see how you\'re progressing.',
    features: [
      'Estimated 1RM progression per exercise',
      'Weekly volume trends and muscle distribution',
      'Automated insights (plateaus, PRs, trends)',
      'Strength-to-bodyweight ratios',
    ],
    tip: 'Check the Progress tab weekly to spot trends early — a plateau is easier to fix early.',
    color: 'text-yellow-400 bg-yellow-500/20',
  },
  {
    id: 'gamification',
    icon: <Award className="w-8 h-8" />,
    title: 'Stay Motivated',
    description: 'Earn XP, level up, unlock badges, and complete weekly challenges. Streak tracking with shield protection keeps you consistent.',
    features: [
      'XP system with leveling',
      'Weekly challenges (workouts, volume, PRs)',
      'Training streak with streak shields',
      'Badges for milestones',
    ],
    tip: 'You get 2 streak shields per week — they auto-protect your streak if you miss a day.',
    color: 'text-blue-400 bg-blue-500/20',
  },
];

export default function NewUserGuide({ onComplete }: NewUserGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = GUIDE_STEPS[currentStep];
  const isLast = currentStep === GUIDE_STEPS.length - 1;
  const isFirst = currentStep === 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-grappler-900/95 backdrop-blur-xl flex flex-col"
    >
      {/* Top bar */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {GUIDE_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                'h-1 rounded-full transition-all duration-300',
                idx === currentStep ? 'w-6 bg-primary-400' :
                idx < currentStep ? 'w-3 bg-primary-500/40' : 'w-3 bg-grappler-700'
              )}
            />
          ))}
        </div>
        <button
          onClick={onComplete}
          className="text-xs text-grappler-400 hover:text-grappler-200 transition-colors"
        >
          Skip guide
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-6 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Icon */}
            <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center', step.color)}>
              {step.icon}
            </div>

            {/* Title & Description */}
            <div>
              <h2 className="text-2xl font-bold text-grappler-50 mb-2">
                {step.title}
              </h2>
              <p className="text-sm text-grappler-300 leading-relaxed">
                {step.description}
              </p>
            </div>

            {/* Features */}
            <div className="space-y-2">
              {step.features.map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + idx * 0.08 }}
                  className="flex items-start gap-2.5"
                >
                  <Zap className="w-4 h-4 text-primary-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-grappler-200">{feature}</span>
                </motion.div>
              ))}
            </div>

            {/* Tip */}
            <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-3">
              <p className="text-xs text-primary-300 leading-relaxed">
                <strong className="text-primary-400">Pro tip:</strong> {step.tip}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="px-6 py-6 flex items-center justify-between max-w-lg mx-auto w-full">
        <button
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          className={cn(
            'flex items-center gap-1 text-sm font-medium transition-colors',
            isFirst ? 'text-transparent pointer-events-none' : 'text-grappler-400 hover:text-grappler-200'
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <span className="text-xs text-grappler-400">
          {currentStep + 1} / {GUIDE_STEPS.length}
        </span>

        {isLast ? (
          <button
            onClick={onComplete}
            className="btn btn-primary btn-sm gap-1"
          >
            Get Started
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => setCurrentStep(Math.min(GUIDE_STEPS.length - 1, currentStep + 1))}
            className="flex items-center gap-1 text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
