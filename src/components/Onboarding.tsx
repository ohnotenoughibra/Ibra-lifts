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
  Smartphone,
  Share,
  MoreVertical,
  X,
} from 'lucide-react';
import { BiologicalSex, ExperienceLevel, GoalFocus, SessionsPerWeek, OnboardingData, TrainingIdentity, CombatSport, CombatTrainingDay, CombatTimeOfDay, DEFAULT_EQUIPMENT_PROFILES } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CalendarDays, Plus } from 'lucide-react';

const TOTAL_STEPS = 3;

/** Detect if user is on a mobile browser (not already installed as PWA) */
function useIsMobileBrowser() {
  const [state, setState] = useState<{ isMobile: boolean; isIOS: boolean; isPWA: boolean }>({
    isMobile: false,
    isIOS: false,
    isPWA: false,
  });

  useEffect(() => {
    const ua = navigator.userAgent;
    const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isPWA =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setState({ isMobile, isIOS, isPWA });
  }, []);

  return state;
}

export default function Onboarding({ authUserId }: { authUserId?: string }) {
  const { onboardingData, updateOnboardingData, completeOnboarding } = useAppStore();
  const [currentStep, setCurrentStep] = useState(1);
  const { isMobile, isIOS, isPWA } = useIsMobileBrowser();
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(false);

  // Show install guide on mobile browsers (not PWA) on step 1
  useEffect(() => {
    if (isMobile && !isPWA && currentStep === 1 && !installDismissed) {
      const dismissed = localStorage.getItem('roots-onboard-install-dismissed');
      if (!dismissed) {
        const timer = setTimeout(() => setShowInstallGuide(true), 800);
        return () => clearTimeout(timer);
      }
    } else {
      setShowInstallGuide(false);
    }
  }, [isMobile, isPWA, currentStep, installDismissed]);

  const dismissInstallGuide = () => {
    setShowInstallGuide(false);
    setInstallDismissed(true);
    localStorage.setItem('roots-onboard-install-dismissed', '1');
  };

  // Apply smart defaults for deferred fields on mount
  useEffect(() => {
    const defaults: Partial<OnboardingData> = {};
    if (!onboardingData.equipment) defaults.equipment = 'full_gym';
    if (!onboardingData.availableEquipment || onboardingData.availableEquipment.length === 0) {
      defaults.availableEquipment = DEFAULT_EQUIPMENT_PROFILES[0].equipment;
    }
    if (!onboardingData.sessionDurationMinutes) defaults.sessionDurationMinutes = 60;
    if (!onboardingData.mesoCycleWeeks) defaults.mesoCycleWeeks = 5;
    if (!onboardingData.weightUnit) defaults.weightUnit = 'lbs';
    if (Object.keys(defaults).length > 0) updateOnboardingData(defaults);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        // Identity + combat sport + goal + name + age + bodyweight + sex + experience
        if (!onboardingData.trainingIdentity) return false;
        if (onboardingData.trainingIdentity === 'combat' && !onboardingData.combatSport && !(onboardingData.combatSports && onboardingData.combatSports.length > 0)) return false;
        if (!onboardingData.goalFocus) return false;
        if (onboardingData.name.length < 2) return false;
        if (!onboardingData.age || onboardingData.age < 14) return false;
        if (!onboardingData.bodyWeightKg || onboardingData.bodyWeightKg <= 0) return false;
        if (!onboardingData.sex) return false;
        return true;
      case 2:
        // Sessions/week + lifting days
        return (onboardingData.trainingDays?.length || 0) >= onboardingData.sessionsPerWeek;
      case 3:
        return true;
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-grappler-900 bg-mesh px-4 py-8">
      {/* Add to Home Screen prompt for mobile browsers */}
      <AnimatePresence>
        {showInstallGuide && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="max-w-lg mx-auto mb-6"
          >
            <div className="relative overflow-hidden rounded-2xl border border-primary-500/30 bg-gradient-to-br from-grappler-800 via-grappler-800 to-primary-900/40">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary-500/15 rounded-full blur-2xl" />
              <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-accent-500/10 rounded-full blur-xl" />
              <div className="relative p-5">
                <button
                  onClick={dismissInstallGuide}
                  className="absolute top-3 right-3 p-1 text-grappler-500 hover:text-grappler-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/20">
                    <Smartphone className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-grappler-50 text-base">Get the full experience</h3>
                    <p className="text-xs text-grappler-400">Add to your home screen for instant access</p>
                  </div>
                </div>
                <div className="bg-grappler-900/60 rounded-xl p-4 space-y-3">
                  {isIOS ? (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-500/15 rounded-lg flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-primary-400">1</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-grappler-200">Tap</span>
                          <div className="w-7 h-7 bg-grappler-700 rounded-md flex items-center justify-center">
                            <Share className="w-4 h-4 text-primary-400" />
                          </div>
                          <span className="text-sm text-grappler-200">Share in Safari</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-500/15 rounded-lg flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-primary-400">2</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-grappler-200">Scroll down, tap</span>
                          <span className="text-xs font-medium text-primary-300 bg-primary-500/15 px-2 py-0.5 rounded-md">
                            Add to Home Screen
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-500/15 rounded-lg flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-green-400">3</span>
                        </div>
                        <span className="text-sm text-grappler-200">Open from home screen — works offline!</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-500/15 rounded-lg flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-primary-400">1</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-grappler-200">Tap</span>
                          <div className="w-7 h-7 bg-grappler-700 rounded-md flex items-center justify-center">
                            <MoreVertical className="w-4 h-4 text-primary-400" />
                          </div>
                          <span className="text-sm text-grappler-200">menu in Chrome</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-500/15 rounded-lg flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-primary-400">2</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-grappler-200">Tap</span>
                          <span className="text-xs font-medium text-primary-300 bg-primary-500/15 px-2 py-0.5 rounded-md">
                            Install app
                          </span>
                          <span className="text-sm text-grappler-200">or</span>
                          <span className="text-xs font-medium text-primary-300 bg-primary-500/15 px-2 py-0.5 rounded-md">
                            Add to Home Screen
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-500/15 rounded-lg flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-green-400">3</span>
                        </div>
                        <span className="text-sm text-grappler-200">Launch like a native app — works offline!</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center justify-center gap-4 mt-4">
                  {[
                    { label: 'Offline', icon: '📶' },
                    { label: 'Fast', icon: '⚡' },
                    { label: 'Full screen', icon: '📱' },
                  ].map((b) => (
                    <div key={b.label} className="flex items-center gap-1.5">
                      <span className="text-sm">{b.icon}</span>
                      <span className="text-[11px] text-grappler-400">{b.label}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={dismissInstallGuide}
                  className="w-full text-center text-xs text-grappler-500 hover:text-grappler-300 mt-3 transition-colors"
                >
                  I'll do this later
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <Step1_WhoAreYou data={onboardingData} update={updateOnboardingData} />
            )}
            {currentStep === 2 && (
              <Step2_HowYouTrain data={onboardingData} update={updateOnboardingData} />
            )}
            {currentStep === 3 && (
              <Step3_Ready data={onboardingData} />
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

// ─── Step 1: Who Are You? (Identity + Goal + Name + Sex + Experience) ────────
function Step1_WhoAreYou({
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
    orange: { border: 'border-orange-500', bg: 'bg-orange-500/10', text: 'text-orange-400' },
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
        <h2 className="text-xl font-bold text-grappler-50">Let&apos;s get started</h2>
        <p className="text-grappler-400 text-sm">Tell us about yourself</p>
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
                    <p className="text-[10px] text-grappler-400">{sport.desc}</p>
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

      {/* Name + Sex + Experience — compact row layout */}
      <AnimatePresence>
        {data.trainingIdentity && data.goalFocus && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-4"
          >
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-grappler-400 mb-1.5 uppercase tracking-wide">Name</label>
              <input
                type="text"
                value={data.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="Your name"
                className="input"
                autoFocus
              />
            </div>

            {/* Age + Bodyweight — side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-grappler-400 mb-1.5 uppercase tracking-wide">Age</label>
                <input
                  type="number"
                  value={data.age || ''}
                  onChange={(e) => update({ age: parseInt(e.target.value) || 0 })}
                  placeholder="25"
                  min={14}
                  max={100}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-grappler-400 mb-1.5 uppercase tracking-wide">
                  Body weight ({data.weightUnit === 'kg' ? 'kg' : 'lbs'})
                </label>
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
                />
              </div>
            </div>

            {/* Sex */}
            <div>
              <label className="block text-xs font-medium text-grappler-400 mb-1.5 uppercase tracking-wide">Biological sex</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'male' as BiologicalSex, label: 'Male' },
                  { value: 'female' as BiologicalSex, label: 'Female' },
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

            {/* Experience */}
            <div>
              <label className="block text-xs font-medium text-grappler-400 mb-1.5 uppercase tracking-wide">Lifting experience</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'beginner' as ExperienceLevel, label: 'Beginner', desc: '<1 yr' },
                  { value: 'intermediate' as ExperienceLevel, label: 'Intermediate', desc: '1-3 yr' },
                  { value: 'advanced' as ExperienceLevel, label: 'Advanced', desc: '3+ yr' },
                ]).map((level) => (
                  <button
                    key={level.value}
                    onClick={() => update({ experienceLevel: level.value })}
                    className={cn(
                      'py-2 rounded-lg text-center transition-all',
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

            {/* Program Style — lets the user choose how sessions are structured */}
            <div>
              <label className="block text-xs font-medium text-grappler-400 mb-1.5 uppercase tracking-wide">Program style</label>
              <div className="space-y-2">
                {([
                  {
                    value: 'linear' as const,
                    label: 'Repeating',
                    desc: 'Same session structure each day — simple, great for building habits',
                    rec: data.experienceLevel === 'beginner',
                  },
                  {
                    value: 'undulating' as const,
                    label: 'Varied (DUP)',
                    desc: 'Different focus each day (strength, volume, power) — keeps it fresh',
                    rec: data.experienceLevel === 'intermediate',
                  },
                  {
                    value: 'block' as const,
                    label: 'Block',
                    desc: 'Entire weeks focus on one quality, then rotate — structured peaks',
                    rec: data.experienceLevel === 'advanced',
                  },
                ]).map((style) => (
                  <button
                    key={style.value}
                    onClick={() => update({ periodizationStyle: style.value })}
                    className={cn(
                      'w-full p-3 rounded-lg text-left transition-all border',
                      (data.periodizationStyle ?? (data.experienceLevel === 'beginner' ? 'linear' : data.experienceLevel === 'advanced' ? 'block' : 'undulating')) === style.value
                        ? 'bg-primary-500/20 border-primary-500 text-white'
                        : 'bg-grappler-700 border-grappler-600 text-grappler-400'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{style.label}</p>
                      {style.rec && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-500/30 text-primary-300">Recommended</span>
                      )}
                    </div>
                    <p className="text-[11px] opacity-70 mt-0.5">{style.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Step 2: How You Train (Week Planner) ────────────────────────────────────
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_LABELS: Record<CombatTimeOfDay, string> = { morning: 'AM', afternoon: 'PM', evening: 'Eve' };
const TIME_OPTIONS: CombatTimeOfDay[] = ['morning', 'afternoon', 'evening'];

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

function Step2_HowYouTrain({
  data,
  update,
}: {
  data: OnboardingData;
  update: (data: Partial<OnboardingData>) => void;
}) {
  const isCombat = data.trainingIdentity === 'combat';
  const liftDays = data.trainingDays || [];
  const combatDays = data.combatTrainingDays || [];
  const [editingDay, setEditingDay] = useState<number | null>(null);

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

  // --- Lift helpers ---
  const toggleLift = (day: number) => {
    const current = [...liftDays];
    const idx = current.indexOf(day);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      if (current.length >= data.sessionsPerWeek) return; // at limit
      current.push(day);
    }
    current.sort((a, b) => a - b);
    update({ trainingDays: current });
  };

  // --- Combat helpers ---
  const combatSessionsForDay = (day: number) => combatDays.filter((s) => s.day === day);

  const addCombatSession = (day: number) => {
    const updated = [...combatDays, { day, intensity: 'moderate' as const, timeOfDay: 'afternoon' as CombatTimeOfDay }];
    update({ combatTrainingDays: updated });
  };

  const removeCombatSession = (day: number, sessionIdx: number) => {
    // sessionIdx is the index among sessions for this day
    let count = 0;
    const updated = combatDays.filter((s) => {
      if (s.day === day) {
        if (count === sessionIdx) { count++; return false; }
        count++;
      }
      return true;
    });
    update({ combatTrainingDays: updated });
  };

  const updateCombatTime = (day: number, sessionIdx: number, time: CombatTimeOfDay) => {
    let count = 0;
    const updated = combatDays.map((s) => {
      if (s.day === day) {
        if (count === sessionIdx) { count++; return { ...s, timeOfDay: time }; }
        count++;
      }
      return s;
    });
    update({ combatTrainingDays: updated });
  };

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
        <h2 className="text-xl font-bold text-grappler-50">Your week</h2>
        <p className="text-grappler-400 text-sm">Tap a day to edit — you can change this anytime</p>
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
        <p className="text-xs text-grappler-500 mt-1.5 text-center">{getSplitLabel()}</p>
      </div>

      {/* ── Week grid ── */}
      <div>
        <div className="grid grid-cols-7 gap-1">
          {DAY_NAMES.map((name, dayIdx) => {
            const hasLift = liftDays.includes(dayIdx);
            const dayCombat = combatSessionsForDay(dayIdx);
            const hasCombat = dayCombat.length > 0;
            const isEditing = editingDay === dayIdx;
            const isRest = !hasLift && !hasCombat;

            return (
              <button
                key={dayIdx}
                onClick={() => setEditingDay(isEditing ? null : dayIdx)}
                className={cn(
                  'rounded-lg text-center transition-all py-2 min-h-[60px] flex flex-col items-center justify-start gap-1 border-2',
                  isEditing
                    ? 'border-primary-400 bg-grappler-750'
                    : 'border-transparent',
                  isRest && !isEditing && 'bg-grappler-800/50',
                  !isRest && !isEditing && 'bg-grappler-700'
                )}
              >
                <span className={cn(
                  'text-[10px] font-medium',
                  isEditing ? 'text-primary-300' : 'text-grappler-400'
                )}>{name}</span>
                <div className="flex flex-col gap-0.5 items-center">
                  {hasLift && (
                    <div className="w-5 h-1.5 rounded-full bg-primary-400" title="Lift" />
                  )}
                  {dayCombat.map((_, ci) => (
                    <div key={ci} className="w-5 h-1.5 rounded-full bg-red-400" title="Combat" />
                  ))}
                  {isRest && (
                    <span className="text-[8px] text-grappler-600 mt-0.5">Rest</span>
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
            <span className="text-[10px] text-grappler-500">Lift</span>
          </div>
          {isCombat && (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-1.5 rounded-full bg-red-400" />
              <span className="text-[10px] text-grappler-500">Combat</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Day editor panel ── */}
      <AnimatePresence mode="wait">
        {editingDay !== null && (
          <motion.div
            key={editingDay}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-grappler-800 rounded-xl p-4 border border-grappler-700 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-grappler-100">{DAY_NAMES[editingDay]}</p>
                <button
                  onClick={() => setEditingDay(null)}
                  className="text-grappler-500 hover:text-grappler-300 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Lift toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-1.5 rounded-full bg-primary-400" />
                  <span className="text-xs text-grappler-300">Lift</span>
                </div>
                <button
                  onClick={() => toggleLift(editingDay)}
                  className={cn(
                    'relative w-10 h-6 rounded-full transition-colors',
                    liftDays.includes(editingDay) ? 'bg-primary-500' : 'bg-grappler-600'
                  )}
                >
                  <div className={cn(
                    'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                    liftDays.includes(editingDay) ? 'translate-x-5' : 'translate-x-1'
                  )} />
                </button>
              </div>
              {liftDays.includes(editingDay) && liftDays.length > data.sessionsPerWeek && (
                <p className="text-[10px] text-yellow-400/80">
                  You have more lift days than your target — remove one or increase days/week
                </p>
              )}

              {/* Combat sessions (combat users only) */}
              {isCombat && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-1.5 rounded-full bg-red-400" />
                    <span className="text-xs text-grappler-300">Combat</span>
                  </div>

                  {combatSessionsForDay(editingDay).map((session, si) => (
                    <div key={si} className="flex items-center gap-2 pl-7">
                      {/* Time of day pills */}
                      <div className="flex gap-1">
                        {TIME_OPTIONS.map((t) => (
                          <button
                            key={t}
                            onClick={() => updateCombatTime(editingDay, si, t)}
                            className={cn(
                              'px-2 py-1 rounded text-[10px] font-medium transition-all',
                              session.timeOfDay === t
                                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                : 'bg-grappler-700 text-grappler-400'
                            )}
                          >
                            {TIME_LABELS[t]}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => removeCombatSession(editingDay, si)}
                        className="ml-auto text-grappler-500 hover:text-red-400 p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => addCombatSession(editingDay)}
                    className="flex items-center gap-1.5 text-[11px] text-grappler-400 hover:text-red-300 pl-7 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Add combat session
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Step 3: Ready ───────────────────────────────────────────────────────────
function Step3_Ready({ data }: { data: OnboardingData }) {
  const getIdentityLabel = () => {
    if (data.trainingIdentity === 'combat') {
      const sportLabels: Record<string, string> = {
        mma: 'MMA',
        grappling_gi: 'Gi grappling',
        grappling_nogi: 'No-Gi grappling',
        striking: 'Striking',
      };
      return sportLabels[data.combatSport || 'mma'] || 'Combat';
    }
    if (data.trainingIdentity === 'recreational') return 'Lifting';
    return 'Fitness';
  };

  const getGoalLabel = () => {
    const isCombat = data.trainingIdentity === 'combat';
    const labels: Record<GoalFocus, string> = {
      balanced: isCombat ? 'sport performance' : 'balanced training',
      strength: 'strength',
      hypertrophy: 'muscle growth',
      power: isCombat ? 'competition prep' : 'varied training',
    };
    return labels[data.goalFocus] || data.goalFocus;
  };

  const getSplitLabel = () => {
    if (data.sessionsPerWeek <= 3) return 'Full Body';
    if (data.sessionsPerWeek === 4) return 'Upper / Lower';
    return 'Push / Pull / Legs';
  };

  const getPeriodizationLabel = () => {
    const style = data.periodizationStyle ?? (data.experienceLevel === 'beginner' ? 'linear' : data.experienceLevel === 'advanced' ? 'block' : 'undulating');
    if (style === 'linear') return 'Repeating';
    if (style === 'block') return 'Block';
    return 'Varied';
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
          className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center mx-auto mb-5"
        >
          <Sparkles className="w-8 h-8 text-white" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-bold text-grappler-50"
        >
          You&apos;re all set, {data.name}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="text-grappler-400 text-sm mt-2"
        >
          {data.sessionsPerWeek}-day {getSplitLabel()} program for {getIdentityLabel()} — focused on {getGoalLabel()}
        </motion.p>
      </div>

      {/* Quick stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="grid grid-cols-2 gap-2"
      >
        <div className="bg-grappler-800/50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-grappler-100">{data.sessionsPerWeek}</p>
          <p className="text-[10px] text-grappler-400">Days/Week</p>
        </div>
        <div className="bg-grappler-800/50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-grappler-100">{getSplitLabel()}</p>
          <p className="text-[10px] text-grappler-400">Split</p>
        </div>
        <div className="bg-grappler-800/50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-grappler-100">{getPeriodizationLabel()}</p>
          <p className="text-[10px] text-grappler-400">Style</p>
        </div>
        <div className="bg-grappler-800/50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-grappler-100">{data.sessionDurationMinutes || 60}m</p>
          <p className="text-[10px] text-grappler-400">Per Session</p>
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        className="text-xs text-grappler-500 text-center"
      >
        Customize equipment, session length, units, and more in Settings
      </motion.p>
    </div>
  );
}
