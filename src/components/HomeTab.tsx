'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { getReadinessSummary } from '@/lib/performance-engine';
import {
  Dumbbell,
  Calendar,
  Trophy,
  BarChart3,
  Play,
  Flame,
  Target,
  Zap,
  Star,
  TrendingUp,
  Clock,
  AlertTriangle,
  Brain,
  Activity,
  Apple,
  Leaf,
  Crosshair,
  HeartPulse,
  Siren,
  Sun,
  Moon,
  Shield,
  Share2,
  Check,
  Users,
  Sparkles,
  Award,
  Thermometer,
  SkipForward,
  RefreshCw,
  CheckCircle,
  Watch,
  Scale,
  X,
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import { getEffectiveTier, hasFeatureAccess } from '@/lib/subscription';
import type { MealEntry, SkipReason } from '@/lib/types';
import { getIllnessTrainingRecommendation, getIllnessDurationDays } from '@/lib/illness-engine';
import { shouldDeload } from '@/lib/auto-adjust';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import CardErrorBoundary from './CardErrorBoundary';
import { useToast } from './Toast';
import { fireConfetti } from '@/lib/confetti';
import { generateQuickWorkout } from '@/lib/workout-generator';
import { levelProgress, pointsToNextLevel, pointRewards } from '@/lib/gamification';
import { generateDailyDirective } from '@/lib/daily-directive';
import { generateWeeklySynthesis, generatePostWorkoutCoachingLine } from '@/lib/weekly-synthesis';
import { getInjuryProfiles, getInjuryInsights } from '@/lib/injury-intelligence';
import { buildPerformanceProfiles } from '@/lib/performance-model';
import { generateVariableReward, detectDisengagement, getSessionContext } from '@/lib/engagement-engine';
import { calculateFatigueDebt, getSmartDeloadRecommendation } from '@/lib/smart-deload';
import { buildCycleProfile, getCycleInsights, shouldShowCycleFeatures } from '@/lib/female-athlete';
import type { CycleLog } from '@/lib/female-athlete';
import { detectFightCampPhase, getPhaseConfig, generatePhaseMacros } from '@/lib/fight-camp-engine';
import PerformanceReadiness from './PerformanceReadiness';
import SorenessCheck from './SorenessCheck';
import RestDayMissionCard from './RestDayMissionCard';
import { generatePerformanceNarrative } from '@/lib/performance-narratives';
import type { SorenessArea, SorenessSeverity } from '@/lib/mobility-data';
import type { OverlayView } from './dashboard-types';

// ─── Factor explainer data ───
const factorExplainers: Record<string, { icon: string; what: string; action: string }> = {
  sleep: {
    icon: '😴',
    what: 'Hours, deep sleep & REM quality. Sleep <6h = 4× injury risk.',
    action: 'Aim for 7-9h tonight. No screens 30min before bed.',
  },
  nutrition: {
    icon: '🥩',
    what: 'Protein intake, calorie adherence & meal frequency.',
    action: 'Hit 1.6-2.2g/kg protein spread across 4+ meals today.',
  },
  stress: {
    icon: '🧠',
    what: 'Psychosocial stress impairs recovery by ~20%.',
    action: 'Try 5min box breathing or a 20min walk.',
  },
  recovery: {
    icon: '💚',
    what: 'Wearable recovery score — your autonomic nervous system state.',
    action: 'Low recovery = technique/skill day, not max effort.',
  },
  injury: {
    icon: '🩹',
    what: 'Active injuries and their severity.',
    action: 'Follow return-to-training protocol. Avoid aggravating movements.',
  },
  training_load: {
    icon: '📊',
    what: 'Sessions per week + consecutive training days. Sweet spot is 4-6/week.',
    action: 'Take a rest day — overtraining kills gains faster than undertraining.',
  },
  hydration: {
    icon: '💧',
    what: 'Daily water intake. Dehydration cuts strength 2-3% per 1% body mass lost.',
    action: 'Drink at least half your bodyweight (lbs) in ounces of water.',
  },
  age: {
    icon: '⏳',
    what: 'Recovery capacity decreases with age — 40+ needs 20-40% more rest.',
    action: 'Add an extra rest day or extend sleep by 30min.',
  },
  hrv: {
    icon: '❤️',
    what: 'Heart rate variability vs your personal baseline. Below = sympathetic stress.',
    action: 'Reduce intensity today. Your nervous system needs recovery.',
  },
  soreness: {
    icon: '🦵',
    what: 'Self-reported muscle soreness by body area and severity.',
    action: 'Consider swapping to a session that avoids sore muscle groups.',
  },
};

function ReadinessCard() {
  const user = useAppStore(s => s.user);
  const workoutLogs = useAppStore(s => s.workoutLogs);
  const trainingSessions = useAppStore(s => s.trainingSessions);
  const wearableData = useAppStore(s => s.latestWhoopData);
  const wearableHistory = useAppStore(s => s.wearableHistory);
  const meals = useAppStore(s => s.meals);
  const macroTargets = useAppStore(s => s.macroTargets);
  const waterLog = useAppStore(s => s.waterLog);
  const injuryLog = useAppStore(s => s.injuryLog);
  const quickLogs = useAppStore(s => s.quickLogs);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [expandedFactor, setExpandedFactor] = useState<string | null>(null);

  const summary = useMemo(() => {
    return getReadinessSummary({
      user,
      workoutLogs,
      trainingSessions,
      wearableData,
      wearableHistory,
      meals,
      macroTargets,
      waterLog,
      injuryLog,
      quickLogs,
    });
  }, [user, workoutLogs, trainingSessions, wearableData, wearableHistory, meals, macroTargets, waterLog, injuryLog, quickLogs]);

  if (!summary) return null;

  const scoreColor =
    summary.level === 'peak' ? 'text-green-400' :
    summary.level === 'good' ? 'text-blue-400' :
    summary.level === 'moderate' ? 'text-yellow-400' :
    summary.level === 'low' ? 'text-orange-400' : 'text-red-400';

  const dotColor =
    summary.level === 'peak' ? 'bg-green-400' :
    summary.level === 'good' ? 'bg-blue-400' :
    summary.level === 'moderate' ? 'bg-yellow-400' :
    summary.level === 'low' ? 'bg-orange-400' : 'bg-red-400';

  const levelLabels: Record<string, string> = {
    peak: 'Peak',
    good: 'Good',
    moderate: 'Moderate',
    low: 'Low',
    critical: 'Rest Day',
  };

  const getBarColor = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    if (score >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="px-3 pt-3 pb-1">
      {/* Header — always visible, tappable to toggle details */}
      <button
        onClick={() => { setDetailsOpen(v => !v); if (detailsOpen) setExpandedFactor(null); }}
        className="w-full flex items-center justify-between group"
      >
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-grappler-400" />
          <span className="text-sm font-semibold text-grappler-100">Readiness</span>
          <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded-full bg-grappler-700/60', scoreColor)}>
            {levelLabels[summary.level]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className={cn('w-2 h-2 rounded-full', dotColor)} />
            <span className={cn('text-lg font-bold', scoreColor)}>{summary.score}</span>
            <span className="text-xs text-grappler-500 font-medium">/100</span>
          </div>
          <span className="text-xs text-grappler-600 group-hover:text-grappler-400 transition-colors ml-1">
            {detailsOpen ? '▴' : '▾'}
          </span>
        </div>
      </button>

      {/* Auto-adjustment pill — always visible when active */}
      {summary.volumeModifier !== 1.0 && (
        <p className="text-[10px] text-grappler-500 mt-1 ml-6">
          Volume {Math.round(summary.volumeModifier * 100)}% · Intensity {Math.round(summary.intensityModifier * 100)}%
        </p>
      )}

      {/* Collapsible factor details */}
      <AnimatePresence>
        {detailsOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-1 pt-3 pb-1">
              {summary.allFactors.map(f => {
                const explainer = factorExplainers[f.source];
                const isExpanded = expandedFactor === f.source;

                return (
                  <div key={f.source}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setExpandedFactor(isExpanded ? null : f.source); }}
                      className="w-full group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] w-[72px] text-left truncate text-grappler-400 group-hover:text-grappler-200 transition-colors">
                          {f.label}
                        </span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-grappler-700/40">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(3, f.score)}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className={cn('h-full rounded-full', getBarColor(f.score))}
                          />
                        </div>
                        <span className={cn(
                          'text-[11px] font-mono w-6 text-right',
                          f.score >= 70 ? 'text-green-400' : f.score >= 50 ? 'text-yellow-400' : f.score >= 30 ? 'text-orange-400' : 'text-red-400'
                        )}>
                          {f.score}
                        </span>
                      </div>
                    </button>

                    {/* Per-factor explainer */}
                    <AnimatePresence>
                      {isExpanded && explainer && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <div className="ml-[72px] pl-2.5 mt-1 mb-1.5 border-l border-grappler-700/60 space-y-0.5">
                            {f.detail && (
                              <p className="text-[10px] text-grappler-300">{f.detail}</p>
                            )}
                            <p className="text-[10px] text-grappler-500">{explainer.what}</p>
                            <p className="text-[10px] text-primary-400">{explainer.action}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getRestDayTip(identity?: string, sport?: string): { tip: string; category: string } {
  const combatTips = [
    { tip: 'Do 10 min of light flow rolling or shadow work to keep your movement patterns sharp.', category: 'Active Recovery' },
    { tip: 'Spend 15 min on hip openers and thoracic spine mobility — your guard game will thank you.', category: 'Mobility' },
    { tip: 'Foam roll your lats, hip flexors, and calves for 10 min to speed up recovery.', category: 'Soft Tissue' },
    { tip: 'Practice breathing drills: 4-7-8 pattern for 5 min to lower cortisol and improve recovery.', category: 'Recovery' },
    { tip: 'Light grip work with a stress ball or rice bucket — maintains grip endurance without fatigue.', category: 'Maintenance' },
    { tip: 'Cold exposure (2-3 min cold shower) can reduce inflammation from training.', category: 'Recovery' },
  ];
  const strikingTips = [
    { tip: 'Shadow box at 30% intensity for 10 min — keep your timing sharp without loading the body.', category: 'Active Recovery' },
    { tip: 'Focus on shoulder and hip mobility today. Strikers lose rotation range faster than you think.', category: 'Mobility' },
    { tip: 'Foam roll your hip flexors, calves, and forearms for faster recovery between sessions.', category: 'Soft Tissue' },
  ];
  const generalTips = [
    { tip: 'A 20-min walk keeps blood flowing to recovering muscles without adding stress.', category: 'Active Recovery' },
    { tip: 'Stretch your hip flexors and chest — sitting all day tightens what lifting already loads.', category: 'Mobility' },
    { tip: 'Prioritize 7-9 hours of sleep tonight. Growth hormone peaks during deep sleep.', category: 'Recovery' },
    { tip: 'Hydrate well — aim for at least half your bodyweight (lbs) in ounces of water.', category: 'Nutrition' },
    { tip: 'Foam roll major muscle groups for 10 min — it reduces next-day soreness significantly.', category: 'Soft Tissue' },
  ];

  if (identity === 'combat') {
    const pool = sport === 'striking' ? [...combatTips, ...strikingTips] : combatTips;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return generalTips[Math.floor(Math.random() * generalTips.length)];
}

function MealReminderBanner({ meals, onNavigate }: { meals: MealEntry[]; onNavigate: (view: OverlayView) => void }) {
  const { mealReminders, activeDietPhase, macroTargets } = useAppStore();

  if (!mealReminders.enabled || !activeDietPhase) return null;

  const now = new Date();
  const hour = now.getHours();
  const currentMin = hour * 60 + now.getMinutes();

  const slots = ['breakfast', 'lunch', 'dinner'] as const;
  let activeMeal: typeof slots[number] | null = null;

  for (const slot of slots) {
    if (!mealReminders.enabledMeals[slot]) continue;
    const [rH, rM] = mealReminders.reminderTimes[slot].split(':').map(Number);
    const reminderMin = rH * 60 + rM;
    if (currentMin >= reminderMin && currentMin <= reminderMin + 120) {
      const hasLogged = meals.some(m =>
        slot === 'lunch'
          ? (m.mealType === 'lunch' || m.mealType === 'pre_workout')
          : m.mealType === slot
      );
      if (!hasLogged) {
        activeMeal = slot;
        break;
      }
    }
  }

  if (!activeMeal) return null;

  const totalCal = meals.reduce((s, m) => s + m.calories, 0);
  const remaining = macroTargets.calories - totalCal;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-violet-500/15 to-purple-500/10 border border-violet-500/30 rounded-xl p-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center">
            <Apple className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-violet-300">
              Time to log {activeMeal}
            </p>
            <p className="text-xs text-grappler-400">
              {totalCal > 0
                ? `${totalCal} kcal logged | ~${Math.max(0, remaining)} remaining`
                : 'No meals logged yet today'}
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('nutrition')}
          className="px-3 py-1.5 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 text-xs font-medium rounded-lg transition-colors"
        >
          Log meal
        </button>
      </div>
    </motion.div>
  );
}

export default function HomeTab({ onNavigate, onViewReport }: { onNavigate: (view: OverlayView) => void; onViewReport: (mesoId: string) => void }) {
  const {
    user, currentMesocycle, workoutLogs, startWorkout,
    lastCompletedWorkout, dismissWorkoutSummary, generateNewMesocycle,
    mesocycleHistory, competitions,
    trainingSessions, latestWhoopData, meals, subscription,
    migrateWorkoutLogsToMesocycle, getCurrentMesocycleLogCount,
    skipWorkout, gamificationStats, mesocycleQueue, completeMesocycle,
    deleteSkip, undoValidateBlock, awardSmartRest, addQuickLog,
  } = useAppStore();
  const { showToast } = useToast();
  const { data: session } = useSession();
  const bodyWeightLog = useAppStore(s => s.bodyWeightLog);
  const wearableHistory = useAppStore(s => s.wearableHistory);
  const macroTargets = useAppStore(s => s.macroTargets);
  const waterLog = useAppStore(s => s.waterLog);
  const injuryLog = useAppStore(s => s.injuryLog);
  const quickLogs = useAppStore(s => s.quickLogs);
  const cycleLogs = useAppStore(s => s.cycleLogs);
  const getActiveIllness = useAppStore(s => s.getActiveIllness);
  const [shareCopied, setShareCopied] = useState(false);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [showMigrateDialog, setShowMigrateDialog] = useState(false);
  const [previousMesocycleId, setPreviousMesocycleId] = useState<string | null>(null);
  const [showValidateConfirm, setShowValidateConfirm] = useState(false);
  const [dismissedCards, setDismissedCards] = useState<Set<string>>(new Set());
  const [readinessExpanded, setReadinessExpanded] = useState(false);
  const [weeklyCoachingExpanded, setWeeklyCoachingExpanded] = useState(false);
  const [sorenessCheckDismissed, setSorenessCheckDismissed] = useState(false);
  const weightUnit = user?.weightUnit || 'lbs';

  // ─── Daily Directive — single mission for today ───
  const directive = useMemo(() => {
    return generateDailyDirective({
      user, currentMesocycle, workoutLogs, trainingSessions,
      wearableData: latestWhoopData, wearableHistory, meals,
      macroTargets, waterLog, injuryLog, quickLogs, competitions,
    });
  }, [user, currentMesocycle, workoutLogs, trainingSessions, latestWhoopData, wearableHistory, meals, macroTargets, waterLog, injuryLog, quickLogs, competitions]);

  // ─── Weekly Synthesis — coaching narrative ───
  const synthesis = useMemo(() => {
    return generateWeeklySynthesis({
      user, workoutLogs, trainingSessions, wearableHistory,
      meals, macroTargets, weightUnit,
    });
  }, [user, workoutLogs, trainingSessions, wearableHistory, meals, macroTargets, weightUnit]);

  // ─── Post-workout coaching line ───
  const postWorkoutCoaching = useMemo(() => {
    if (!lastCompletedWorkout) return null;
    return generatePostWorkoutCoachingLine(
      lastCompletedWorkout.log, workoutLogs, latestWhoopData
    );
  }, [lastCompletedWorkout, workoutLogs, latestWhoopData]);

  // ─── Soreness Check — show daily on all day types ───
  const todayIso = new Date().toISOString().split('T')[0];
  const alreadyLoggedSorenessToday = useMemo(() => {
    return quickLogs.some(
      l => l.type === 'soreness' && new Date(l.timestamp).toISOString().split('T')[0] === todayIso
    );
  }, [quickLogs, todayIso]);

  const showSorenessCheck = !sorenessCheckDismissed && !alreadyLoggedSorenessToday;

  const handleSorenessLog = (areas: { area: SorenessArea; severity: SorenessSeverity }[]) => {
    addQuickLog({
      type: 'soreness',
      value: areas.length > 0 ? areas.map(a => `${a.area}:${a.severity}`).join(',') : 'none',
      timestamp: new Date(),
      notes: areas.length > 0
        ? `Sore areas: ${areas.map(a => a.area.replace('_', ' ')).join(', ')}`
        : 'Body check: feeling good',
    });
  };

  // ─── Confetti + Haptic on PR / badge unlock ───
  const confettiFired = useRef(false);
  useEffect(() => {
    if (!lastCompletedWorkout || confettiFired.current) return;
    const hasPR = lastCompletedWorkout.hadPR;
    const hasBadge = lastCompletedWorkout.newBadges && lastCompletedWorkout.newBadges.length > 0;
    if (hasPR || hasBadge) {
      confettiFired.current = true;
      // Slight delay for the card to render first
      setTimeout(() => fireConfetti(), 300);
      // Haptic feedback
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(hasPR ? [100, 50, 100] : [80]);
      }
    }
  }, [lastCompletedWorkout]);
  // Reset confetti flag when workout summary is dismissed
  useEffect(() => {
    if (!lastCompletedWorkout) confettiFired.current = false;
  }, [lastCompletedWorkout]);

  // ─── Smart Rest XP — reward resting when readiness is low ───
  const smartRestAwarded = useRef(false);
  useEffect(() => {
    if (smartRestAwarded.current) return;
    const isRestDay = directive.todayType === 'rest' || directive.todayType === 'recovery';
    const readinessLow = directive.readinessLevel === 'low' || directive.readinessLevel === 'critical';
    const todayDate = new Date().toDateString();
    const noWorkoutToday = workoutLogs.filter(l => new Date(l.date).toDateString() === todayDate).length === 0;

    if (isRestDay && readinessLow && noWorkoutToday) {
      // Award after brief delay so UI is settled
      const timer = setTimeout(() => {
        const result = awardSmartRest();
        if (result.awarded) {
          smartRestAwarded.current = true;
          showToast(`Smart Rest: +${result.points} XP — recovery is training`, 'success');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [directive.todayType, directive.readinessLevel, workoutLogs, awardSmartRest, showToast]);

  // ─── Post-workout nutrition nudge ───
  const postWorkoutNutritionNudge = useMemo(() => {
    if (!lastCompletedWorkout) return null;
    const log = lastCompletedWorkout.log;
    const duration = log.duration || 0;
    const todayStr = new Date().toDateString();
    const todayMealsCount = (meals || []).filter(m => new Date(m.date).toDateString() === todayStr).length;
    const hour = new Date().getHours();

    // Determine what to eat based on session context
    if (duration >= 90) {
      return {
        text: `${duration}min session — eat within 30min: 40g protein + fast carbs (rice, banana, dates)`,
        urgent: true,
      };
    }
    if (duration >= 45) {
      if (todayMealsCount === 0 && hour < 14) {
        return { text: 'You trained fasted — prioritize protein + carbs within the next hour', urgent: true };
      }
      return { text: 'Post-workout window: 30-40g protein + carbs to kickstart recovery', urgent: false };
    }
    return null;
  }, [lastCompletedWorkout, meals]);

  // ─── Progressive disclosure: feature unlocking based on age of account ───
  const accountAgeDays = useMemo(() => {
    if (!user?.createdAt) return 999;
    return Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  }, [user?.createdAt]);
  const showReadiness = accountAgeDays >= 7 || workoutLogs.length >= 3;
  const showNutritionCard = accountAgeDays >= 14 || workoutLogs.length >= 5;
  const showWeeklySynthesis = accountAgeDays >= 7 || workoutLogs.length >= 4;

  // ─── Injury Intelligence ───
  const injuryProfiles = useMemo(() => {
    return getInjuryProfiles(injuryLog, workoutLogs);
  }, [injuryLog, workoutLogs]);

  const injuryInsights = useMemo(() => {
    return getInjuryInsights(injuryProfiles, workoutLogs);
  }, [injuryProfiles, workoutLogs]);

  // ─── Performance Model ───
  const performanceProfiles = useMemo(() => {
    return buildPerformanceProfiles(workoutLogs);
  }, [workoutLogs]);

  // ─── Performance Narrative ───
  const narrative = useMemo(() => {
    return generatePerformanceNarrative({ workoutLogs, trainingSessions, user });
  }, [workoutLogs, trainingSessions, user]);

  // ─── Engagement Engine ───
  const disengagement = useMemo(() => {
    return detectDisengagement(workoutLogs, user);
  }, [workoutLogs, user]);

  const variableReward = useMemo(() => {
    if (!lastCompletedWorkout) return null;
    return generateVariableReward(lastCompletedWorkout.log, gamificationStats, workoutLogs);
  }, [lastCompletedWorkout, gamificationStats, workoutLogs]);

  const sessionContext = useMemo(() => {
    if (!lastCompletedWorkout) return null;
    return getSessionContext(lastCompletedWorkout.log, workoutLogs, gamificationStats);
  }, [lastCompletedWorkout, workoutLogs, gamificationStats]);

  // ─── Smart Deload & Fatigue ───
  const fatigueDebt = useMemo(() => {
    return calculateFatigueDebt(workoutLogs, wearableHistory);
  }, [workoutLogs, wearableHistory]);

  const deloadRec = useMemo(() => {
    return getSmartDeloadRecommendation(workoutLogs, wearableHistory, performanceProfiles, currentMesocycle ?? undefined);
  }, [workoutLogs, wearableHistory, performanceProfiles, currentMesocycle]);

  // ─── Female Athlete Intelligence ───
  const showCycle = shouldShowCycleFeatures(user);
  // cycleLogs now comes from store (added above)
  const cycleProfile = useMemo(() => {
    if (!showCycle || cycleLogs.length === 0) return null;
    return buildCycleProfile(cycleLogs);
  }, [showCycle, cycleLogs]);

  const cycleInsights = useMemo(() => {
    if (!cycleProfile) return null;
    return getCycleInsights(cycleProfile, workoutLogs);
  }, [cycleProfile, workoutLogs]);

  // ─── Today's Summary Data ───
  const today = new Date();
  const todayStr = today.toDateString();

  const todayTraining = trainingSessions.filter(s =>
    new Date(s.date).toDateString() === todayStr
  );

  const todayWorkouts = workoutLogs.filter(log =>
    new Date(log.date).toDateString() === todayStr
  );

  const todayMeals = meals.filter(m =>
    new Date(m.date).toDateString() === todayStr
  );
  const todayProtein = +todayMeals.reduce((sum, m) => sum + (m.protein || 0), 0).toFixed(1);

  // Yesterday's data for comparison
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();
  const yesterdayWorkouts = workoutLogs.filter(log => new Date(log.date).toDateString() === yesterdayStr);
  const yesterdayVolume = yesterdayWorkouts.reduce((s, l) => s + l.totalVolume, 0);
  const yesterdayProtein = meals.filter(m => new Date(m.date).toDateString() === yesterdayStr).reduce((sum, m) => sum + (m.protein || 0), 0);

  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const twoDaysAgoWorkouts = workoutLogs.filter(log => new Date(log.date).toDateString() === twoDaysAgo.toDateString());

  const recoveryScore = latestWhoopData?.recoveryScore;
  const strain = latestWhoopData?.strain;
  const sleepHours = latestWhoopData?.sleepHours;
  const waterToday = waterLog[todayIso] || 0;

  const handleShareWorkout = async () => {
    if (!lastCompletedWorkout) return;
    const log = lastCompletedWorkout.log;
    const exercises = log.exercises.map(ex => `  ${ex.exerciseName}`).join('\n');
    const text = [
      `Workout Complete!`,
      `${log.exercises.length} exercises | ${formatNumber(log.totalVolume)} ${weightUnit} volume | ${log.duration}m`,
      ``,
      exercises,
      lastCompletedWorkout.hadPR ? `\nNew Personal Record!` : '',
      `${lastCompletedWorkout.newStreak} day streak`,
      `\n-- Roots Gains`
    ].filter(Boolean).join('\n');

    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  const deloadCheck = workoutLogs.length >= 3 ? shouldDeload(workoutLogs.slice(-5)) : null;

  const getNextWorkout = () => {
    if (!currentMesocycle) return null;
    const completedSessionIds = new Set(
      workoutLogs
        .filter(log => log.mesocycleId === currentMesocycle.id)
        .map(log => log.sessionId)
    );
    for (const week of currentMesocycle.weeks) {
      for (const session of week.sessions) {
        if (!completedSessionIds.has(session.id)) {
          return { session, weekNumber: week.weekNumber, isDeload: week.isDeload };
        }
      }
    }
    return null;
  };

  const nextWorkoutInfo = getNextWorkout();
  const nextWorkout = nextWorkoutInfo?.session ?? null;

  const mesocycleProgress = (() => {
    if (!currentMesocycle) return null;
    const totalSessions = currentMesocycle.weeks.reduce((sum, w) => sum + w.sessions.length, 0);
    const completedSessionIds = new Set(
      workoutLogs
        .filter(log => log.mesocycleId === currentMesocycle.id)
        .map(log => log.sessionId)
    );
    const completedCount = currentMesocycle.weeks.reduce((sum, w) =>
      sum + w.sessions.filter(s => completedSessionIds.has(s.id)).length, 0
    );
    return { total: totalSessions, completed: completedCount, percent: totalSessions > 0 ? Math.round((completedCount / totalSessions) * 100) : 0 };
  })();

  const trainingLoadWarning = (() => {
    if (user?.trainingIdentity !== 'combat') return null;
    const last7Days = workoutLogs.filter(log => {
      const diff = (Date.now() - new Date(log.date).getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 7;
    });
    const avgRPE = last7Days.length > 0
      ? last7Days.reduce((sum, l) => sum + (l.overallRPE || 7), 0) / last7Days.length
      : 0;
    const highVolumeDays = last7Days.filter(l => l.totalVolume > 15000).length;

    if (avgRPE >= 9 && last7Days.length >= 3) {
      return 'High average RPE this week. Consider lighter lifting before your next mat session.';
    }
    if (highVolumeDays >= 3) {
      return 'Heavy lifting volume this week — watch for accumulated fatigue on the mats.';
    }
    if (last7Days.length >= (user?.sessionsPerWeek || 3) + 1) {
      return 'More lifting sessions than planned this week. Make sure you have enough recovery for sport training.';
    }
    return null;
  })();

  const isRestDay = !workoutLogs.some(log => new Date(log.date).toDateString() === todayStr) && !nextWorkoutInfo;
  const restDayTip = isRestDay ? getRestDayTip(user?.trainingIdentity, user?.combatSport) : null;

  const mesocycleComparison = (() => {
    if (!currentMesocycle || mesocycleHistory.length === 0) return null;
    const prevBlock = mesocycleHistory[mesocycleHistory.length - 1];
    const currentLogs = workoutLogs.filter(l => l.mesocycleId === currentMesocycle.id);
    const prevLogs = workoutLogs.filter(l => l.mesocycleId === prevBlock.id);
    if (prevLogs.length === 0) return null;

    const avgVolCurrent = currentLogs.length > 0 ? Math.round(currentLogs.reduce((s, l) => s + l.totalVolume, 0) / currentLogs.length) : 0;
    const avgVolPrev = Math.round(prevLogs.reduce((s, l) => s + l.totalVolume, 0) / prevLogs.length);
    const volDelta = avgVolCurrent - avgVolPrev;

    const avgRPECurrent = currentLogs.length > 0 ? +(currentLogs.reduce((s, l) => s + (l.overallRPE || 7), 0) / currentLogs.length).toFixed(1) : 0;
    const avgRPEPrev = +(prevLogs.reduce((s, l) => s + (l.overallRPE || 7), 0) / prevLogs.length).toFixed(1);

    return {
      prevName: prevBlock.name,
      sessions: { current: currentLogs.length, prev: prevLogs.length },
      avgVolume: { current: avgVolCurrent, prev: avgVolPrev, delta: volDelta },
      avgRPE: { current: avgRPECurrent, prev: avgRPEPrev },
    };
  })();

  const nextCompetition = (() => {
    const now = Date.now();
    const active = competitions
      .filter(c => c.isActive && new Date(c.date).getTime() > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (active.length === 0) return null;
    const event = active[0];
    const daysUntil = Math.ceil((new Date(event.date).getTime() - now) / (1000 * 60 * 60 * 24));
    return { ...event, daysUntil };
  })();

  const periodSummaries = useMemo(() => {
    const now = new Date();
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday-based
    startOfThisWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const startOfThisYear = new Date(now.getFullYear(), 0, 1);
    const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
    const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);

    const includeOtherSessions = user?.trainingIdentity === 'combat' || user?.trainingIdentity === 'general_fitness'
      || (user?.combatTrainingDays && user.combatTrainingDays.length > 0);

    const getStats = (fromDate: Date, toDate: Date) => {
      const filteredLogs = (workoutLogs || []).filter(l => {
        try {
          const d = new Date(l.date);
          return d >= fromDate && d <= toDate;
        } catch { return false; }
      });
      const filteredSessions = includeOtherSessions
        ? (trainingSessions || []).filter(s => {
            try {
              const d = new Date(s.date);
              return d >= fromDate && d <= toDate;
            } catch { return false; }
          })
        : [];
      const totalVolume = filteredLogs.reduce((sum, l) => sum + (l.totalVolume || 0), 0);
      const prs = filteredLogs.reduce((sum, l) => sum + (l.exercises?.filter(e => e.personalRecord).length || 0), 0);
      const uniqueDays = new Set([
        ...filteredLogs.map(l => new Date(l.date).toDateString()),
        ...filteredSessions.map(s => new Date(s.date).toDateString())
      ]);
      return {
        workouts: filteredLogs.length,
        sessions: filteredSessions.length,
        trainingDays: uniqueDays.size,
        volume: totalVolume,
        prs,
      };
    };

    return {
      thisWeek: getStats(startOfThisWeek, now),
      lastWeek: getStats(startOfLastWeek, new Date(startOfThisWeek.getTime() - 1)),
      thisMonth: getStats(startOfThisMonth, now),
      lastMonth: getStats(startOfLastMonth, new Date(startOfThisMonth.getTime() - 1)),
      thisYear: getStats(startOfThisYear, now),
      lastYear: getStats(startOfLastYear, endOfLastYear),
    };
  }, [workoutLogs, trainingSessions, user?.trainingIdentity, user?.combatTrainingDays]);

  const handleQuickWorkout = () => {
    if (!user) return;
    const quickSession = generateQuickWorkout(user.equipment, 30, user.goalFocus, user.availableEquipment, user.trainingIdentity);
    startWorkout(quickSession);
  };

  const handleGenerateNext = () => {
    const state = useAppStore.getState();
    const currentLogCount = state.getCurrentMesocycleLogCount();
    const activeMesocycle = state.currentMesocycle;

    if (activeMesocycle && currentLogCount > 0) {
      setPreviousMesocycleId(activeMesocycle.id);
      setShowMigrateDialog(true);
    } else {
      completeMesocycle();
    }
  };

  const handleValidateBlock = () => {
    const state = useAppStore.getState();
    const activeMesocycle = state.currentMesocycle;
    if (!activeMesocycle) return;

    const validatedId = activeMesocycle.id;
    const currentLogCount = state.getCurrentMesocycleLogCount();
    if (currentLogCount > 0) {
      setPreviousMesocycleId(activeMesocycle.id);
      setShowMigrateDialog(true);
    } else {
      completeMesocycle();
      showToast('Block validated', 'success', {
        label: 'Undo',
        onClick: () => {
          const restored = undoValidateBlock(validatedId);
          if (restored) {
            showToast('Block restored', 'success');
          } else {
            showToast('Could not undo — block not found', 'error');
          }
        },
      });
    }
    setShowValidateConfirm(false);
  };

  const handleMigrateResponse = (shouldMigrate: boolean) => {
    const oldMesocycleId = previousMesocycleId;
    completeMesocycle();

    if (shouldMigrate && oldMesocycleId) {
      setTimeout(() => {
        const newMesocycle = useAppStore.getState().currentMesocycle;
        if (newMesocycle && oldMesocycleId) {
          migrateWorkoutLogsToMesocycle(oldMesocycleId, newMesocycle.id);
        }
      }, 0);
    }

    if (oldMesocycleId) {
      showToast('Block validated', 'success', {
        label: 'Undo',
        onClick: () => {
          const restored = undoValidateBlock(oldMesocycleId);
          if (restored) {
            showToast('Block restored', 'success');
          } else {
            showToast('Could not undo — block not found', 'error');
          }
        },
      });
    }

    setShowMigrateDialog(false);
    setPreviousMesocycleId(null);
  };

  // ─── Contextual Feed: priority-ranked, max 4 cards ───
  // ─── TIERED FEED SYSTEM ───
  // Critical: non-dismissible, shown above mission card (illness, injury, deload-critical)
  // Regular: dismissible, shown below mission card (everything else)
  const criticalAlerts: React.ReactNode[] = [];
  const feedCards: React.ReactNode[] = [];

  // 1. Illness banner → CRITICAL
  const activeIllness = getActiveIllness();
  if (activeIllness) {
    const illnessRec = getIllnessTrainingRecommendation(activeIllness);
    const daysSick = getIllnessDurationDays(activeIllness);
    criticalAlerts.push(
      <motion.div key="illness" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-rose-500/20 to-blue-500/10 border border-rose-500/30 rounded-xl p-3.5">
        <div className="flex items-start gap-3">
          <Thermometer className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-rose-300 text-sm">
                {activeIllness.status === 'recovering' ? 'Recovering' : 'Feeling Sick'}
              </h3>
              <span className="text-xs text-rose-400/70">Day {daysSick}</span>
            </div>
            <p className="text-xs text-grappler-400 mt-1">{illnessRec.message}</p>
            {!illnessRec.canTrain && (
              <p className="text-xs text-rose-400/70 mt-1 font-medium">Training paused — streak frozen.</p>
            )}
            <button onClick={() => onNavigate('illness')}
              className="mt-2 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-medium rounded-lg transition-colors">
              {activeIllness.status === 'active' ? 'Daily Check-In' : 'View Status'}
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // 2. Injury alerts → CRITICAL
  if (injuryInsights.alerts.length > 0) {
    criticalAlerts.push(
      <div key="injury-alert" className="flex items-start gap-3 bg-gradient-to-r from-rose-500/15 to-red-500/10 border border-rose-500/30 rounded-xl p-3.5">
        <Siren className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-rose-300 text-sm">Injury Alert</h3>
          {injuryInsights.alerts.slice(0, 2).map((alert, i) => (
            <p key={i} className="text-xs text-rose-400/80 mt-1">{alert}</p>
          ))}
          <button onClick={() => onNavigate('injury')}
            className="mt-2 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-medium rounded-lg transition-colors">
            View Injuries
          </button>
        </div>
      </div>
    );
  }

  // 3. Deload CRITICAL → CRITICAL tier; recommended/optional → regular feed
  if (deloadRec.needed) {
    const urgencyColors = {
      optional: 'from-yellow-500/15 to-sky-500/10 border-yellow-500/30',
      recommended: 'from-blue-500/20 to-red-500/10 border-blue-500/30',
      critical: 'from-red-500/20 to-rose-500/10 border-red-500/30',
    };
    const urgencyIcon = {
      optional: 'text-yellow-400',
      recommended: 'text-blue-400',
      critical: 'text-red-400',
    };
    const deloadCard = (
      <div key="smart-deload" className={cn('rounded-xl p-3.5 border bg-gradient-to-r', urgencyColors[deloadRec.urgency])}>
        <div className="flex items-start gap-3">
          <AlertTriangle className={cn('w-5 h-5 flex-shrink-0 mt-0.5', urgencyIcon[deloadRec.urgency])} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className={cn('font-bold text-sm', urgencyIcon[deloadRec.urgency])}>
                {deloadRec.urgency === 'critical' ? 'Deload Now' : 'Deload Recommended'}
              </h3>
              <span className="text-xs text-grappler-500">Fatigue: {fatigueDebt.currentDebt}/100</span>
            </div>
            <p className="text-xs text-grappler-400 mt-1">{deloadRec.reason}</p>
            <div className="mt-2 bg-black/20 rounded-lg px-2.5 py-1.5">
              <p className="text-xs font-bold text-grappler-300 uppercase tracking-wide">{deloadRec.protocol.name}</p>
              <p className="text-xs text-grappler-500 mt-0.5">{deloadRec.protocol.description}</p>
            </div>
          </div>
        </div>
      </div>
    );
    if (deloadRec.urgency === 'critical') {
      criticalAlerts.push(deloadCard);
    } else {
      feedCards.push(deloadCard);
    }
  }

  // 4. Meal reminder → regular feed
  if (feedCards.length < 4) {
    feedCards.push(<MealReminderBanner key="meal" meals={todayMeals} onNavigate={onNavigate} />);
  }

  // 5. Body weight reminder → regular feed
  const activeDietPhase = useAppStore(s => s.activeDietPhase);
  const lastBWEntry = bodyWeightLog.length > 0 ? bodyWeightLog[bodyWeightLog.length - 1] : null;
  const daysSinceLastBW = lastBWEntry
    ? Math.floor((Date.now() - new Date(lastBWEntry.date).getTime()) / (1000 * 60 * 60 * 24))
    : Infinity;
  if (activeDietPhase?.isActive && daysSinceLastBW >= 7 && feedCards.length < 4) {
    feedCards.push(
      <motion.div key="bw-reminder" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-amber-500/15 to-yellow-500/10 border border-amber-500/30 rounded-xl p-3.5">
        <div className="flex items-start gap-3">
          <Scale className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-amber-300 text-sm">Log Your Weight</h3>
            <p className="text-xs text-grappler-400 mt-1">
              {daysSinceLastBW === Infinity
                ? 'No weight logged yet — your diet coach needs this to track progress.'
                : `Last logged ${daysSinceLastBW} days ago. Weekly weigh-ins keep your diet coach accurate.`}
            </p>
            <button onClick={() => onNavigate('nutrition' as any)}
              className="mt-2 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium rounded-lg transition-colors">
              Log Weight
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // 3. Fight camp phase detection
  const fightCampPhase = useMemo(() => {
    if (user?.trainingIdentity !== 'combat' || !nextCompetition) return null;
    const isTournament = nextCompetition.type === 'bjj_tournament' || nextCompetition.type === 'wrestling_meet';
    return detectFightCampPhase(nextCompetition.daysUntil, false, isTournament);
  }, [user?.trainingIdentity, nextCompetition]);

  const campPhaseConfig = useMemo(() => {
    if (!fightCampPhase) return null;
    return getPhaseConfig(fightCampPhase, (user?.sex || 'male') as 'male' | 'female');
  }, [fightCampPhase, user?.sex]);

  const campPhaseMacros = useMemo(() => {
    if (!fightCampPhase) return null;
    const latestW = bodyWeightLog.length > 0 ? bodyWeightLog[bodyWeightLog.length - 1] : null;
    const bwKg = latestW
      ? (latestW.unit === 'lbs' ? latestW.weight / 2.205 : latestW.weight)
      : (user?.bodyWeightKg || 80);
    const tdee = Math.round(bwKg * 33);
    return generatePhaseMacros(tdee, bwKg, fightCampPhase, (user?.sex || 'male') as 'male' | 'female');
  }, [fightCampPhase, bodyWeightLog, user?.bodyWeightKg, user?.sex]);

  // Camp Mode banner (combat athletes with competition <= 56 days / 8 weeks)
  if (fightCampPhase && fightCampPhase !== 'off_season' && nextCompetition && feedCards.length < 4) {
    const campColors: Record<string, { gradient: string; accent: string }> = {
      base_camp:        { gradient: 'from-blue-500/15 to-cyan-500/10 border-blue-500/30', accent: 'text-cyan-400' },
      intensification:  { gradient: 'from-purple-500/15 to-violet-500/10 border-purple-500/30', accent: 'text-purple-400' },
      fight_camp_peak:  { gradient: 'from-red-500/15 to-orange-500/10 border-red-500/30', accent: 'text-red-400' },
      fight_week:       { gradient: 'from-red-500/20 to-rose-500/15 border-red-500/40', accent: 'text-red-300' },
      weigh_in_day:     { gradient: 'from-yellow-500/20 to-amber-500/10 border-yellow-500/30', accent: 'text-yellow-400' },
      fight_day:        { gradient: 'from-green-500/20 to-emerald-500/10 border-green-500/30', accent: 'text-green-400' },
      tournament_day:   { gradient: 'from-green-500/20 to-emerald-500/10 border-green-500/30', accent: 'text-green-400' },
      post_competition: { gradient: 'from-slate-500/15 to-gray-500/10 border-slate-500/30', accent: 'text-slate-400' },
    };
    const colors = campColors[fightCampPhase] || campColors.base_camp;

    feedCards.push(
      <motion.div key="camp-mode" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className={cn('rounded-xl border bg-gradient-to-r overflow-hidden', colors.gradient)}>
        {/* Header row */}
        <div className="flex items-center justify-between p-3.5 pb-2">
          <div className="flex items-center gap-3">
            <Crosshair className={cn('w-5 h-5 flex-shrink-0', colors.accent)} />
            <div>
              <h3 className="font-bold text-grappler-100 text-sm flex items-center gap-1.5">
                Camp Mode
                <span className={cn('text-xs font-normal px-1.5 py-0.5 rounded-full bg-white/10', colors.accent)}>
                  {campPhaseConfig?.name?.split('(')[0].trim() || fightCampPhase.replace(/_/g, ' ')}
                </span>
              </h3>
              <p className="text-xs text-grappler-400 mt-0.5">
                {nextCompetition.name} · {new Date(nextCompetition.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                {nextCompetition.weightClass ? ` · ${nextCompetition.weightClass} ${weightUnit}` : ''}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={cn('text-2xl font-black', colors.accent)}>{nextCompetition.daysUntil}</p>
            <p className="text-xs text-grappler-500">days out</p>
          </div>
        </div>
        {/* Phase macros + focus */}
        <div className="px-3.5 pb-3.5 space-y-2">
          {campPhaseConfig && (
            <p className="text-xs text-grappler-300">{campPhaseConfig.focus}</p>
          )}
          {campPhaseMacros && (
            <div className="grid grid-cols-4 gap-1.5">
              <div className="bg-grappler-900/40 rounded-lg py-1 px-1.5 text-center">
                <p className="text-[10px] text-grappler-500">Cal</p>
                <p className="text-xs font-bold text-grappler-200">{campPhaseMacros.calories}</p>
              </div>
              <div className="bg-grappler-900/40 rounded-lg py-1 px-1.5 text-center">
                <p className="text-[10px] text-grappler-500">P</p>
                <p className="text-xs font-bold text-grappler-200">{campPhaseMacros.protein}g</p>
              </div>
              <div className="bg-grappler-900/40 rounded-lg py-1 px-1.5 text-center">
                <p className="text-[10px] text-grappler-500">C</p>
                <p className="text-xs font-bold text-grappler-200">{campPhaseMacros.carbs}g</p>
              </div>
              <div className="bg-grappler-900/40 rounded-lg py-1 px-1.5 text-center">
                <p className="text-[10px] text-grappler-500">F</p>
                <p className="text-xs font-bold text-grappler-200">{campPhaseMacros.fat}g</p>
              </div>
            </div>
          )}
          <button onClick={() => onNavigate('fight_camp')}
            className="w-full py-1.5 bg-white/5 hover:bg-white/10 text-grappler-300 text-xs font-medium rounded-lg transition-colors">
            View Fight Camp Nutrition
          </button>
        </div>
      </motion.div>
    );
  } else if (nextCompetition && nextCompetition.daysUntil <= 60 && feedCards.length < 4) {
    // Non-combat athletes or off-season: simple countdown
    feedCards.push(
      <motion.div key="competition" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-yellow-500/15 to-blue-500/10 border border-yellow-500/30 rounded-xl p-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-yellow-300 text-sm">{nextCompetition.name}</h3>
              <p className="text-xs text-grappler-400 mt-0.5">
                {new Date(nextCompetition.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                {nextCompetition.weightClass ? ` · ${nextCompetition.weightClass} ${weightUnit}` : ''}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-yellow-400">{nextCompetition.daysUntil}</p>
            <p className="text-xs text-yellow-400/70">days out</p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Training load warning → regular feed
  if (trainingLoadWarning && feedCards.length < 4) {
    feedCards.push(
      <div key="training-load" className="flex items-start gap-3 bg-gradient-to-r from-sky-500/20 to-blue-500/10 border border-sky-500/30 rounded-xl p-3.5">
        <Shield className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-sky-300 text-sm">Training Load</h3>
          <p className="text-xs text-sky-400/80 mt-1">{trainingLoadWarning}</p>
        </div>
      </div>
    );
  }

  // Rest day tip → informational (bottom)
  if (restDayTip && feedCards.length < 4) {
    feedCards.push(
      <div key="rest-tip" className="flex items-start gap-3 card p-3.5">
        <Leaf className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs text-emerald-400 font-medium uppercase tracking-wide">{restDayTip.category}</p>
          <p className="text-sm text-grappler-300 mt-1">{restDayTip.tip}</p>
        </div>
      </div>
    );
  }

  // 7. Weekly pulse
  if (feedCards.length < 4 && periodSummaries.thisWeek.trainingDays > 0) {
    feedCards.push(
      <div key="weekly-pulse" className="card p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-4 h-4 text-primary-400" />
          <span className="text-xs font-semibold text-grappler-200 uppercase tracking-wide">This Week</span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-primary-400">{periodSummaries.thisWeek.trainingDays}</p>
            <p className="text-xs text-grappler-500">Days</p>
          </div>
          <div>
            <p className="text-lg font-bold text-grappler-100">{periodSummaries.thisWeek.workouts}</p>
            <p className="text-xs text-grappler-500">Lifts</p>
          </div>
          {periodSummaries.thisWeek.sessions > 0 && (
            <div>
              <p className="text-lg font-bold text-blue-400">{periodSummaries.thisWeek.sessions}</p>
              <p className="text-xs text-grappler-500">Training</p>
            </div>
          )}
          <div>
            <p className="text-lg font-bold text-yellow-400">{periodSummaries.thisWeek.prs}</p>
            <p className="text-xs text-grappler-500">PRs</p>
          </div>
        </div>
      </div>
    );
  }

  // Cycle phase card (female athletes)
  if (cycleInsights && feedCards.length < 5) {
    feedCards.push(
      <div key="cycle-phase" className="bg-gradient-to-r from-pink-500/15 to-purple-500/10 border border-pink-500/30 rounded-xl p-3.5">
        <div className="flex items-start gap-3">
          <HeartPulse className="w-5 h-5 text-pink-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-pink-300 text-sm">{cycleInsights.headline}</h3>
              <span className="text-xs text-pink-400/70">Day {cycleInsights.dayInCycle}</span>
            </div>
            <p className="text-xs text-grappler-400 mt-1">{cycleInsights.trainingTip}</p>
            {cycleInsights.nutritionTip && (
              <p className="text-xs text-grappler-500 mt-1">{cycleInsights.nutritionTip}</p>
            )}
            <button onClick={() => onNavigate('cycle_tracking')}
              className="mt-2 px-3 py-1.5 bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 text-xs font-medium rounded-lg transition-colors">
              View Cycle
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 10. Disengagement nudge
  if (disengagement.nudgeMessage && (disengagement.status === 'at_risk' || disengagement.status === 'churned') && feedCards.length < 5) {
    feedCards.push(
      <div key="nudge" className="flex items-start gap-3 bg-gradient-to-r from-primary-500/15 to-blue-500/10 border border-primary-500/30 rounded-xl p-3.5">
        <HeartPulse className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-primary-300 text-sm">
            {disengagement.status === 'churned' ? 'Welcome Back' : 'Missing You'}
          </h3>
          <p className="text-xs text-grappler-400 mt-1">{disengagement.nudgeMessage}</p>
        </div>
      </div>
    );
  }

  // ─── Momentum data ───
  const currentStreak = gamificationStats.currentStreak || 0;
  const liftTarget = user?.trainingDays?.length || 3;
  const combatTarget = user?.combatTrainingDays?.length || 0;
  const weekTarget = liftTarget + combatTarget;
  const weekDone = periodSummaries.thisWeek.workouts + periodSummaries.thisWeek.sessions;
  const weekRemaining = Math.max(0, weekTarget - weekDone);
  const nextBadgeDistance = useMemo(() => {
    // Simple heuristic: how many more sessions to potential badge
    const totalSessions = workoutLogs.length + trainingSessions.length;
    const milestones = [5, 10, 25, 50, 100, 150, 200, 300, 500];
    const next = milestones.find(m => m > totalSessions);
    return next ? next - totalSessions : null;
  }, [workoutLogs.length, trainingSessions.length]);

  return (
    <div className="space-y-3">

      {/* ─── CRITICAL ALERTS — non-dismissible, above everything ─── */}
      {criticalAlerts.length > 0 && (
        <div className="space-y-2">
          {criticalAlerts.map(card => card)}
        </div>
      )}

      {/* ─── Post-Workout Summary — compact card ─── */}
      <AnimatePresence>
        {lastCompletedWorkout && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-r from-green-500/15 to-emerald-500/10 border border-green-500/30 rounded-xl p-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Trophy className="w-4 h-4 text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-green-300 text-sm">Done!</h3>
                  <span className="text-xs text-green-400/70">+{lastCompletedWorkout.points} XP</span>
                  {lastCompletedWorkout.hadPR && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 font-medium">PR</span>
                  )}
                  {variableReward && variableReward.type !== 'none' && (
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', {
                      'bg-blue-500/15 text-blue-400': variableReward.rarity === 'common',
                      'bg-purple-500/15 text-purple-400': variableReward.rarity === 'uncommon',
                      'bg-yellow-500/15 text-yellow-400': variableReward.rarity === 'rare',
                      'bg-cyan-500/15 text-cyan-400': variableReward.rarity === 'epic',
                    })}>+{variableReward.bonusPoints}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-grappler-400">{lastCompletedWorkout.log.exercises.length} ex</span>
                  <span className="text-xs text-grappler-400">{formatNumber(lastCompletedWorkout.log.totalVolume)} {weightUnit}</span>
                  <span className="text-xs text-grappler-400">{lastCompletedWorkout.log.duration}m</span>
                  <span className="text-xs text-grappler-500">Lv.{gamificationStats.level}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={handleShareWorkout}
                  className="text-green-400 hover:text-green-300 p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-colors"
                  title="Share workout">
                  {shareCopied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                </button>
                <button onClick={dismissWorkoutSummary}
                  className="text-grappler-500 hover:text-grappler-300 p-1.5">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {/* Coaching line + nutrition nudge — compact row */}
            {(postWorkoutCoaching || postWorkoutNutritionNudge) && (
              <div className="mt-2 pt-2 border-t border-green-500/20">
                {postWorkoutCoaching && (
                  <p className="text-xs text-grappler-400 leading-relaxed">{postWorkoutCoaching}</p>
                )}
                {postWorkoutNutritionNudge && (
                  <p className={cn('text-xs mt-1', postWorkoutNutritionNudge.urgent ? 'text-orange-400' : 'text-green-400')}>
                    {postWorkoutNutritionNudge.text}
                  </p>
                )}
              </div>
            )}
            {/* Badges — inline chips */}
            {lastCompletedWorkout.newBadges && lastCompletedWorkout.newBadges.length > 0 && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {lastCompletedWorkout.newBadges.map((badge) => (
                  <span key={badge.id} className="text-xs px-2 py-1 rounded-full bg-purple-500/15 text-purple-300">
                    {badge.icon} {badge.name}
                  </span>
                ))}
              </div>
            )}
            {/* Guest sign-up — one line */}
            {!session && (
              <div className="mt-2 pt-2 border-t border-green-500/20 flex items-center justify-between">
                <p className="text-xs text-primary-400">Save your progress?</p>
                <div className="flex gap-1.5">
                  <button onClick={() => signIn('google', { callbackUrl: '/' })}
                    className="px-2.5 py-1 text-xs font-medium bg-grappler-800 border border-grappler-700 text-grappler-100 rounded-lg">Google</button>
                  <Link href="/register" className="px-2.5 py-1 text-xs font-medium bg-primary-500/20 text-primary-300 rounded-lg">Email</Link>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── TODAY'S MISSION — unified directive + action card ─── */}
      {directive.todayPerformance && directive.todayType === 'recovery' ? (
        /* POST-SESSION: Already lifted today — show performance recap */
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/10 via-grappler-800 to-grappler-900 p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-xs text-green-400/80 font-bold uppercase tracking-wide">Session Complete</span>
              </div>
              <h2 className="text-xl font-black text-grappler-100">{directive.headline}</h2>
              <p className="text-xs text-grappler-400 mt-1">{directive.subline}</p>
            </div>
            <button onClick={() => setReadinessExpanded(v => !v)} className="text-right flex-shrink-0 ml-3 group">
              <p className="text-2xl font-black text-green-400 group-hover:opacity-80 transition-opacity">{directive.readinessScore}</p>
              <p className="text-[10px] text-grappler-500">Readiness ▾</p>
            </button>
          </div>
          {/* Performance metrics grid */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-grappler-800/60 rounded-xl p-2.5 text-center">
              <p className="text-lg font-black text-grappler-100">{formatNumber(directive.todayPerformance.totalVolume)}</p>
              <p className="text-[10px] text-grappler-500 uppercase">{weightUnit} volume</p>
            </div>
            <div className="bg-grappler-800/60 rounded-xl p-2.5 text-center">
              <p className="text-lg font-black text-grappler-100">{directive.todayPerformance.totalSets}</p>
              <p className="text-[10px] text-grappler-500 uppercase">Sets</p>
            </div>
            <div className="bg-grappler-800/60 rounded-xl p-2.5 text-center">
              <p className="text-lg font-black text-grappler-100">{directive.todayPerformance.avgRPE > 0 ? directive.todayPerformance.avgRPE : '—'}</p>
              <p className="text-[10px] text-grappler-500 uppercase">Avg RPE</p>
            </div>
          </div>
          {directive.todayPerformance.topExercise && (
            <div className="flex items-center gap-2 bg-grappler-800/40 rounded-lg px-3 py-2 mb-3">
              <Trophy className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <p className="text-xs text-grappler-300">Top lift: <span className="font-semibold text-grappler-100">{directive.todayPerformance.topExercise}</span> · {formatNumber(directive.todayPerformance.topExerciseVolume)} {weightUnit}</p>
            </div>
          )}
          {directive.actions.length > 0 && (
            <div className="space-y-1.5">
              {directive.actions.map((a, i) => (
                <div key={i} className="flex items-start gap-2"><Target className="w-3 h-3 text-grappler-500 flex-shrink-0 mt-0.5" /><p className="text-xs text-grappler-300">{a}</p></div>
              ))}
            </div>
          )}
          {mesocycleProgress && (
            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 h-1.5 bg-grappler-700 rounded-full overflow-hidden"><div className="h-full bg-green-500/60 rounded-full" style={{ width: `${mesocycleProgress.percent}%` }} /></div>
              <span className="text-xs text-grappler-500">{mesocycleProgress.completed}/{mesocycleProgress.total}</span>
            </div>
          )}
        </motion.div>

      ) : (directive.todayType === 'rest' || directive.todayType === 'recovery') ? (
        /* Rest / recovery day — interactive Mission Control card */
        <RestDayMissionCard
          headline={directive.headline}
          subline={directive.subline}
          actions={directive.actions}
          readinessScore={directive.readinessScore}
          readinessLevel={directive.readinessLevel}
          sessionLabel={directive.sessionLabel}
          fightCampTag={directive.fightCampTag}
          proteinGap={directive.proteinGap}
          nextWorkout={nextWorkout}
          todayProtein={todayProtein}
          proteinTarget={macroTargets.protein}
          waterToday={waterToday}
          sleepHours={sleepHours ?? null}
          alreadyLoggedSoreness={alreadyLoggedSorenessToday}
          yesterdayWorkouts={yesterdayWorkouts}
          twoDaysAgoWorkouts={twoDaysAgoWorkouts}
          mesocycleProgress={mesocycleProgress}
          weightUnit={weightUnit}
          onNavigate={onNavigate}
          onStartWorkout={startWorkout}
          onQuickWorkout={handleQuickWorkout}
          onReadinessToggle={() => setReadinessExpanded(v => !v)}
        />

      ) : directive.todayType === 'combat' ? (
        /* Combat day — with optional pending lift */
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          {(() => {
            const allCombatLogged = directive.todayCombatSessions.length > 0 && directive.todayCombatSessions.every(s => s.logged);
            return (
          <div className={`rounded-2xl p-5 ${allCombatLogged ? 'bg-gradient-to-r from-green-600/80 to-emerald-500/80 border border-green-500/30' : 'bg-gradient-to-r from-purple-600 to-indigo-500'}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {allCombatLogged ? <Check className="w-4 h-4 text-white/80" /> : <Shield className="w-4 h-4 text-white/80" />}
                  <span className="text-xs text-white/60 font-bold uppercase tracking-wide">{allCombatLogged ? 'Session Complete' : 'Mat Day'}</span>
                  {directive.fightCampTag && (
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-white/10 text-white/80">{directive.fightCampTag}</span>
                  )}
                </div>
                <h2 className="text-xl font-black text-white">{directive.headline}</h2>
                <p className="text-xs text-white/60 mt-1">{directive.subline}</p>
              </div>
              <button onClick={() => setReadinessExpanded(v => !v)} className="text-right flex-shrink-0 ml-3 group">
                <p className={`text-2xl font-black group-hover:opacity-80 transition-opacity ${allCombatLogged ? 'text-white' : 'text-white/90'}`}>{directive.readinessScore}</p>
                <p className="text-[10px] text-white/40">Readiness ▾</p>
              </button>
            </div>
            {directive.todayCombatSessions.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {directive.todayCombatSessions.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
                    {s.logged ? <Check className="w-3.5 h-3.5 text-green-300 flex-shrink-0" /> : <Shield className="w-3.5 h-3.5 text-white/60 flex-shrink-0" />}
                    <p className="text-xs text-white/80 flex-1">{s.type}{s.duration > 0 ? ` · ${s.duration}min` : ''} · {s.intensity}</p>
                    {!s.logged && (
                    <button
                      onClick={() => {
                        skipWorkout({
                          date: new Date().toISOString().split('T')[0],
                          scheduledSessionId: `combat-${i}`,
                          reason: 'schedule_conflict' as SkipReason,
                          rescheduled: false,
                        });
                        showToast(`Skipped ${s.type}`, 'info');
                      }}
                      className="text-white/40 hover:text-white/70 transition-colors"
                      title="Skip this session"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {directive.actions.filter(a => !a.includes(directive.todayCombatSessions[0]?.type || '§')).length > 0 && (
              <div className="mt-2 space-y-1">
                {directive.actions.filter(a => !a.includes(directive.todayCombatSessions[0]?.type || '§')).map((a, i) => (
                  <div key={i} className="flex items-start gap-2"><Target className="w-3 h-3 text-white/40 flex-shrink-0 mt-0.5" /><p className="text-xs text-white/70">{a}</p></div>
                ))}
              </div>
            )}
            {mesocycleProgress && (
              <div className="flex items-center gap-2 mt-3">
                <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-white/50 rounded-full" style={{ width: `${mesocycleProgress.percent}%` }} /></div>
                <span className="text-xs text-white/40">{mesocycleProgress.completed}/{mesocycleProgress.total}</span>
              </div>
            )}
          </div>
            );
          })()}
          {/* Secondary lift CTA only if there's a pending lift */}
          {nextWorkout && (
            <button onClick={() => startWorkout(nextWorkout)} className="w-full bg-grappler-800 hover:bg-grappler-700 border border-grappler-700 rounded-xl p-3 text-left transition-colors flex items-center gap-3">
              <Dumbbell className="w-5 h-5 text-primary-400" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-grappler-400">Also want to lift?</p>
                <p className="text-sm font-semibold text-grappler-200 truncate">{directive.sessionLabel ? `${directive.sessionLabel} — ` : ''}{nextWorkout.name} · {nextWorkout.exercises.length} exercises</p>
              </div>
              <Play className="w-4 h-4 text-grappler-500" />
            </button>
          )}
          <div className="flex items-center justify-center">
            <button onClick={handleQuickWorkout} className="flex items-center gap-1.5 py-2 text-xs text-grappler-500 hover:text-grappler-300 transition-colors"><Zap className="w-3.5 h-3.5" />Quick 30m</button>
          </div>
        </motion.div>

      ) : nextWorkout ? (
        /* Lift day (or both) — enhanced hero with exercise preview */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <button
            onClick={() => startWorkout(nextWorkout)}
            className={cn(
              "w-full rounded-2xl p-5 text-left active:scale-[0.98] transition-transform bg-gradient-to-r",
              directive.todayType === 'both' ? 'from-primary-500 via-purple-500 to-indigo-500' : 'from-primary-500 to-accent-500',
              workoutLogs.length === 0 && "ring-2 ring-primary-400/60 ring-offset-2 ring-offset-grappler-900 animate-pulse"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs text-white/70 font-medium uppercase tracking-wide">
                    {directive.sessionLabel || (nextWorkoutInfo ? `Week ${nextWorkoutInfo.weekNumber}` : 'Next Workout')}
                    {nextWorkoutInfo?.isDeload ? ' · Deload' : ''}
                  </p>
                  {directive.todayType === 'both' && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/15 text-white/80">+ Mat Time</span>
                  )}
                  {directive.fightCampTag && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/15 text-white/80">{directive.fightCampTag}</span>
                  )}
                </div>
                <h2 className="text-xl font-black text-white mt-1">{nextWorkout.name}</h2>
                <p className="text-xs text-white/50 mt-1">{directive.subline}</p>
                {/* Exercise preview */}
                <p className="text-xs text-white/60 mt-2 leading-relaxed">
                  {nextWorkout.exercises.slice(0, 3).map(e => e.exercise.name).join(' · ')}
                  {nextWorkout.exercises.length > 3 && ` · +${nextWorkout.exercises.length - 3} more`}
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-sm text-white/80">
                  <span className="flex items-center gap-1"><Dumbbell className="w-3.5 h-3.5" />{nextWorkout.exercises.length} exercises</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />~{nextWorkout.estimatedDuration}m</span>
                </div>
                {mesocycleProgress && (
                  <div className="flex items-center gap-2 mt-2.5">
                    <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-white/60 rounded-full" style={{ width: `${mesocycleProgress.percent}%` }} /></div>
                    <span className="text-xs text-white/60">{mesocycleProgress.completed}/{mesocycleProgress.total}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center gap-2 flex-shrink-0 ml-3">
                <div
                  className="text-center cursor-pointer group"
                  role="button"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); setReadinessExpanded(v => !v); }}
                >
                  <p className="text-2xl font-black text-white/90 group-hover:opacity-80 transition-opacity">{directive.readinessScore}</p>
                  <p className="text-[10px] text-white/40">Readiness ▾</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Play className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </button>
          {/* Combat callout when both — each session skippable individually */}
          {directive.todayType === 'both' && directive.todayCombatSessions.length > 0 && (
            <div className="space-y-1.5 px-1">
              {directive.todayCombatSessions.map((s, i) => (
                <div key={i} className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2">
                  {s.logged ? <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> : <Shield className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />}
                  <p className="text-xs text-grappler-300 flex-1">{s.type}{s.duration > 0 ? ` · ${s.duration}min` : ''} · {s.intensity}</p>
                  {!s.logged && (
                  <button
                    onClick={() => {
                      skipWorkout({
                        date: new Date().toISOString().split('T')[0],
                        scheduledSessionId: `combat-${i}`,
                        reason: 'schedule_conflict' as SkipReason,
                        rescheduled: false,
                      });
                      showToast(`Skipped ${s.type}`, 'info');
                    }}
                    className="text-grappler-500 hover:text-grappler-300 transition-colors"
                    title="Skip this session"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-center gap-4">
            <button onClick={handleQuickWorkout} className="flex items-center gap-1.5 py-2 text-xs text-grappler-500 hover:text-grappler-300 transition-colors"><Zap className="w-3.5 h-3.5" />Quick 30m</button>
            <span className="text-grappler-700">·</span>
            <button onClick={() => setShowSkipDialog(true)} className="flex items-center gap-1.5 py-2 text-xs text-grappler-500 hover:text-grappler-300 transition-colors"><SkipForward className="w-3.5 h-3.5" />Skip Lift</button>
            <span className="text-grappler-700">·</span>
            <button onClick={() => setShowValidateConfirm(true)} className="flex items-center gap-1.5 py-2 text-xs text-grappler-500 hover:text-green-400 transition-colors"><CheckCircle className="w-3.5 h-3.5" />Validate Block</button>
          </div>

          {/* Validate block confirmation */}
          <AnimatePresence>
            {showValidateConfirm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center">
                  <p className="text-xs text-grappler-200 mb-2">
                    Complete current block{mesocycleQueue.length > 0 ? ` and start ${mesocycleQueue[0].name}?` : ' and generate next?'}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => setShowValidateConfirm(false)} className="btn btn-sm bg-grappler-700 text-grappler-300 hover:bg-grappler-600">Cancel</button>
                    <button onClick={handleValidateBlock} className="btn btn-sm bg-green-600 text-white hover:bg-green-500 gap-1.5"><CheckCircle className="w-3.5 h-3.5" />Validate</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ) : currentMesocycle && mesocycleProgress && mesocycleProgress.completed === mesocycleProgress.total ? (
        /* Mesocycle Complete — generate next */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-5 bg-gradient-to-br from-primary-500/10 to-accent-500/10 border border-primary-500/20"
        >
          <div className="text-center">
            <Trophy className="w-10 h-10 text-primary-400 mx-auto mb-2" />
            <h3 className="font-bold text-grappler-100 text-sm">Block Complete!</h3>
            <p className="text-xs text-grappler-400 mt-1 mb-4">
              All {mesocycleProgress.total} sessions in {currentMesocycle.name} done.
            </p>
          </div>
          {mesocycleComparison && (
            <div className="bg-grappler-800/40 rounded-xl p-3 mb-4 space-y-2">
              <p className="text-xs text-grappler-500 uppercase tracking-wide">vs {mesocycleComparison.prevName}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-grappler-400">Sessions</p>
                  <p className="text-sm font-bold text-grappler-100">{mesocycleComparison.sessions.current}</p>
                </div>
                <div>
                  <p className="text-xs text-grappler-400">Avg Vol</p>
                  <p className="text-sm font-bold text-grappler-100">{formatNumber(mesocycleComparison.avgVolume.current)}</p>
                  <p className={cn('text-xs font-medium', mesocycleComparison.avgVolume.delta > 0 ? 'text-green-400' : mesocycleComparison.avgVolume.delta < 0 ? 'text-red-400' : 'text-grappler-500')}>
                    {mesocycleComparison.avgVolume.delta > 0 ? '+' : ''}{formatNumber(mesocycleComparison.avgVolume.delta)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-grappler-400">Avg RPE</p>
                  <p className="text-sm font-bold text-grappler-100">{mesocycleComparison.avgRPE.current}</p>
                </div>
              </div>
            </div>
          )}
          {mesocycleQueue.length > 0 && (
            <div className="bg-grappler-800/40 rounded-xl p-3 mb-4 text-center">
              <p className="text-xs text-grappler-500 uppercase tracking-wide mb-1">Up next from queue</p>
              <p className="text-sm font-bold text-primary-300">{mesocycleQueue[0].name}</p>
              <p className="text-xs text-grappler-500">{mesocycleQueue[0].weeks} weeks · {mesocycleQueue[0].periodization || 'auto'}</p>
            </div>
          )}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => onViewReport(currentMesocycle.id)}
              className="btn btn-md gap-2 bg-grappler-700 text-grappler-200 hover:bg-grappler-600"
            >
              <BarChart3 className="w-4 h-4" />
              Report
            </button>
            <button
              onClick={handleGenerateNext}
              className="btn btn-primary btn-md gap-2"
            >
              <Zap className="w-4 h-4" />
              {mesocycleQueue.length > 0 ? 'Start Next' : 'Next Mesocycle'}
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-5"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
              <Dumbbell className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-grappler-100">Start your first program</p>
              <p className="text-xs text-grappler-400 mt-0.5">
                AI builds a periodized plan based on your schedule, experience, and goals.
                Takes about 30 seconds.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('block_suggestion')}
              className="btn btn-primary btn-md gap-2 flex-1"
            >
              <Brain className="w-4 h-4" />
              Create Program
            </button>
            <button
              onClick={handleQuickWorkout}
              className="btn btn-secondary btn-md gap-2"
            >
              <Zap className="w-4 h-4" />
              Quick 30m
            </button>
          </div>
        </motion.div>
      )}

      {/* ─── Body Check-In — soreness & mobility, shown daily ─── */}
      {showSorenessCheck && (
        <SorenessCheck
          context={directive.todayPerformance ? 'post_workout' : (directive.todayType === 'rest' || directive.todayType === 'recovery') ? 'rest_day' : 'pre_workout'}
          isCombatAthlete={user?.trainingIdentity === 'combat'}
          onDismiss={() => setSorenessCheckDismissed(true)}
          onLog={handleSorenessLog}
        />
      )}

      {/* ─── Momentum Strip — streak, week progress, next milestone ─── */}
      <div className="flex items-center gap-2 px-1">
        {/* Streak */}
        {currentStreak > 0 && (
          <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg px-2.5 py-1.5">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-xs font-bold text-orange-300">{currentStreak}</span>
            <span className="text-[10px] text-orange-400/60">streak</span>
          </div>
        )}
        {/* Week progress */}
        <div className="flex-1 flex items-center gap-2 bg-grappler-800/60 border border-grappler-700/50 rounded-lg px-2.5 py-1.5">
          <div className="flex gap-0.5">
            {Array.from({ length: weekTarget }, (_, i) => (
              <div
                key={i}
                className={cn(
                  'w-2.5 h-2.5 rounded-full',
                  i < weekDone ? 'bg-primary-400' : 'bg-grappler-700'
                )}
              />
            ))}
          </div>
          <span className="text-[10px] text-grappler-500">
            {weekDone}/{weekTarget} this week
            {weekRemaining > 0 && ` · ${weekRemaining} left`}
          </span>
        </div>
        {/* Next milestone */}
        {nextBadgeDistance != null && nextBadgeDistance <= 5 && (
          <div className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg px-2.5 py-1.5">
            <Award className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px] text-purple-300">{nextBadgeDistance} to go</span>
          </div>
        )}
      </div>

      {/* ─── Readiness Breakdown — expandable from mission card tap ─── */}
      <AnimatePresence>
        {readinessExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="card overflow-hidden">
              <ReadinessCard />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Today at a Glance ─── */}
      <div className="card p-3.5">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="font-semibold text-grappler-100 text-sm flex items-center gap-2">
            <Sun className="w-4 h-4 text-yellow-400" />
            Today
          </h3>
          <span className="text-xs text-grappler-500">
            {today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>

        {/* Recovery (Whoop) */}
        {recoveryScore != null && (
          <div className={cn(
            'rounded-xl p-2.5 mb-2.5 border',
            recoveryScore >= 67 ? 'bg-green-500/10 border-green-500/30' :
            recoveryScore >= 34 ? 'bg-yellow-500/10 border-yellow-500/30' :
            'bg-red-500/10 border-red-500/30'
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-400" />
                <div>
                  <span className="text-xs text-grappler-400">Recovery</span>
                  <span className="text-xs text-grappler-600 ml-1.5">via Whoop HRV</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn(
                  'text-lg font-bold',
                  recoveryScore >= 67 ? 'text-green-400' :
                  recoveryScore >= 34 ? 'text-yellow-400' : 'text-red-400'
                )}>
                  {recoveryScore}%
                </span>
                {sleepHours != null && (
                  <span className="text-xs text-grappler-500">{sleepHours.toFixed(1)}h sleep</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Wearable connection CTA — show when user has feature access but no data */}
        {recoveryScore == null && (() => {
          const tier = getEffectiveTier(subscription, session?.user?.email);
          return hasFeatureAccess('wearable-integration', tier);
        })() && (
          <button
            onClick={() => onNavigate('wearable')}
            className="w-full rounded-xl p-2.5 mb-2.5 border border-purple-500/30 bg-purple-500/10 flex items-center justify-between hover:bg-purple-500/15 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Watch className="w-4 h-4 text-purple-400" />
              <div className="text-left">
                <span className="text-xs font-medium text-grappler-200">Wearable not connected</span>
                <p className="text-xs text-grappler-500">Connect Whoop for recovery, sleep & strain</p>
              </div>
            </div>
            <span className="text-xs font-medium text-purple-400 px-2 py-1 rounded-lg bg-purple-500/20">
              Connect
            </span>
          </button>
        )}

        {/* ─── Unified Readiness + Activity ─── */}
        {showReadiness && (() => {
          return (
            <div className="card overflow-hidden">
              {/* ReadinessCard integrated */}
              <ReadinessCard />

              {/* Activity row — inline horizontal with icon · value · label */}
              <div className="flex items-center gap-1 px-3 py-2.5 border-t border-grappler-700/30">
                {user?.trainingIdentity === 'combat' || user?.trainingIdentity === 'general_fitness' ? (
                  <button
                    onClick={() => onNavigate('grappling')}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-grappler-800/60 transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-sm font-bold text-grappler-100">{todayTraining.length}</span>
                    <span className="text-xs text-grappler-500">{user?.trainingIdentity === 'combat' ? 'mat' : 'sessions'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => currentMesocycle && nextWorkout ? startWorkout(nextWorkout) : onNavigate('builder')}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-grappler-800/60 transition-colors"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-sm font-bold text-grappler-100">{formatNumber(todayWorkouts.reduce((s, l) => s + l.totalVolume, 0))}</span>
                    <span className="text-xs text-grappler-500">{weightUnit}</span>
                  </button>
                )}
                <span className="text-grappler-700">·</span>
                <button
                  onClick={() => currentMesocycle && nextWorkout ? startWorkout(nextWorkout) : onNavigate('builder')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-grappler-800/60 transition-colors"
                >
                  <Dumbbell className="w-3.5 h-3.5 text-primary-400" />
                  <span className="text-sm font-bold text-grappler-100">{todayWorkouts.length}</span>
                  <span className="text-xs text-grappler-500">{todayWorkouts.length === 1 ? 'lift' : 'lifts'}</span>
                </button>
                <span className="text-grappler-700">·</span>
                <button
                  onClick={() => onNavigate('nutrition')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-grappler-800/60 transition-colors"
                >
                  <Apple className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-sm font-bold text-grappler-100">{todayProtein}g</span>
                  <span className="text-xs text-grappler-500">protein{macroTargets.protein > 0 ? ` ${Math.round((todayProtein / macroTargets.protein) * 100)}%` : ''}</span>
                </button>
              </div>
            </div>
          );
        })()}

        {/* Performance Readiness — nutrition-focused (only when ReadinessCard hidden) */}
        {!showReadiness && <PerformanceReadiness />}
      </div>

      {/* ─── Performance Narrative ─── */}
      {narrative.hasData && workoutLogs.length >= 6 && (
        <div className="card p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary-400" />
            <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wide">Your Progress Story</h3>
          </div>
          <p className="text-sm text-grappler-300 leading-relaxed">{narrative.summary}</p>
          {narrative.highlights.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2.5">
              {narrative.highlights.map((h, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs',
                    h.sentiment === 'positive' && 'bg-emerald-500/10 border border-emerald-500/20',
                    h.sentiment === 'neutral' && 'bg-grappler-700/50 border border-grappler-600/30',
                    h.sentiment === 'negative' && 'bg-red-500/10 border border-red-500/20',
                  )}
                >
                  <span className={cn(
                    'font-bold',
                    h.sentiment === 'positive' && 'text-emerald-400',
                    h.sentiment === 'neutral' && 'text-grappler-300',
                    h.sentiment === 'negative' && 'text-red-400',
                  )}>
                    {h.stat}
                  </span>
                  <span className="text-grappler-400">{h.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Contextual Feed (max 4, priority-ranked, dismissible) ─── */}
      {(() => {
        const visibleCards = feedCards.filter(card => !dismissedCards.has((card as React.ReactElement).key as string));
        return visibleCards.length > 0 ? (
          <div className="space-y-3">
            {visibleCards.map(card => {
              const key = (card as React.ReactElement).key as string;
              return (
                <div key={key} className="relative">
                  {card}
                  <button
                    onClick={() => setDismissedCards(prev => { const next = new Set(Array.from(prev)); next.add(key); return next; })}
                    className="absolute top-2 right-2 p-1 rounded-full bg-grappler-900/60 text-grappler-600 hover:text-grappler-300 transition-colors z-10"
                    aria-label="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : null;
      })()}
      {feedCards.length === 0 && workoutLogs.length > 0 && (
        <div className="flex items-center gap-3 card p-3">
          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <p className="text-xs text-grappler-400">All clear — nothing needs your attention right now.</p>
        </div>
      )}

      {/* ─── Weekly Synthesis — promoted Sun/Mon, collapsed rest of week ─── */}
      <CardErrorBoundary fallbackLabel="Weekly Coaching">
      {showWeeklySynthesis && synthesis.hasData && (() => {
        const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon
        const isPromoted = dayOfWeek === 0 || dayOfWeek === 1;
        const isExpanded = isPromoted || weeklyCoachingExpanded;

        return (
          <div className={cn('card', isPromoted ? 'p-4 border-primary-500/30 bg-gradient-to-br from-primary-500/5 to-grappler-900' : 'p-3')}>
            <button
              onClick={() => !isPromoted && setWeeklyCoachingExpanded(v => !v)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Brain className={cn('w-4 h-4', isPromoted ? 'text-primary-400' : 'text-grappler-500')} />
                <span className={cn('text-xs font-semibold uppercase tracking-wide', isPromoted ? 'text-grappler-200' : 'text-grappler-400')}>
                  Weekly Coaching
                </span>
                {isPromoted && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-500/15 text-primary-400 font-medium">New</span>
                )}
              </div>
              {!isPromoted && (
                <span className="text-xs text-grappler-600">{isExpanded ? '▴' : '▾'}</span>
              )}
            </button>
            {!isExpanded && (
              <p className="text-xs text-grappler-500 mt-1.5 truncate">
                {synthesis.stats.workouts} lifts{synthesis.stats.combatSessions > 0 ? ` · ${synthesis.stats.combatSessions} mat` : ''} · {synthesis.stats.prs} PRs this week
              </p>
            )}
            {isExpanded && (
              <>
                <p className={cn('text-sm text-grappler-300 leading-relaxed', isPromoted ? 'mt-2.5' : 'mt-2')}>{synthesis.narrative}</p>
                <div className={cn('grid gap-2 mt-3 text-center', synthesis.stats.combatSessions > 0 ? 'grid-cols-5' : 'grid-cols-4')}>
                  {synthesis.stats.workouts > 0 && (
                    <div>
                      <p className="text-lg font-bold text-primary-400">{synthesis.stats.workouts}</p>
                      <p className="text-xs text-grappler-500">Lifts</p>
                    </div>
                  )}
                  {synthesis.stats.combatSessions > 0 && (
                    <div>
                      <p className="text-lg font-bold text-purple-400">{synthesis.stats.combatSessions}</p>
                      <p className="text-xs text-grappler-500">Mat</p>
                      {synthesis.stats.combatMinutes > 0 && <p className="text-xs text-grappler-600">{synthesis.stats.combatMinutes}m</p>}
                    </div>
                  )}
                  <div>
                    <p className="text-lg font-bold text-yellow-400">{synthesis.stats.prs}</p>
                    <p className="text-xs text-grappler-500">PRs</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-grappler-100">{synthesis.stats.avgRPE || '—'}</p>
                    <p className="text-xs text-grappler-500">RPE</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-grappler-100">
                      {synthesis.stats.proteinAdherence !== null ? `${synthesis.stats.proteinAdherence}%` : '—'}
                    </p>
                    <p className="text-xs text-grappler-500">Protein</p>
                  </div>
                </div>
                {(synthesis.trends.volume !== 'stable' || synthesis.trends.prs !== 'stable') && (
                  <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-grappler-700/50">
                    {synthesis.trends.volume !== 'stable' && (
                      <span className={cn('text-xs font-medium flex items-center gap-1',
                        synthesis.trends.volume === 'up' ? 'text-green-400' : 'text-blue-400'
                      )}>
                        <TrendingUp className={cn('w-3 h-3', synthesis.trends.volume === 'down' && 'rotate-180')} />
                        Volume {synthesis.trends.volume === 'up' ? 'up' : 'down'}
                      </span>
                    )}
                    {synthesis.trends.prs !== 'stable' && (
                      <span className={cn('text-xs font-medium flex items-center gap-1',
                        synthesis.trends.prs === 'up' ? 'text-green-400' : 'text-blue-400'
                      )}>
                        <Star className="w-3 h-3" />
                        PRs {synthesis.trends.prs === 'up' ? 'up' : 'down'}
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })()}
      </CardErrorBoundary>




      {/* ─── Dialogs ─── */}

      {/* Skip Workout Dialog */}
      <AnimatePresence>
        {showSkipDialog && nextWorkout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowSkipDialog(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-grappler-900 rounded-2xl p-5 max-w-sm w-full border border-grappler-700 shadow-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-sky-500/20">
                  <SkipForward className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-grappler-100">Skip Session?</h3>
                  <p className="text-xs text-grappler-400">{nextWorkout.name}</p>
                </div>
              </div>

              <p className="text-sm text-grappler-400 mb-4">
                No stress — pick a reason and we&apos;ll adapt your program.
              </p>

              <div className="space-y-2">
                {([
                  { reason: 'schedule_conflict' as SkipReason, label: 'Schedule conflict', icon: Calendar, color: 'text-blue-400 bg-blue-500/10' },
                  { reason: 'fatigue' as SkipReason, label: 'Too tired / poor sleep', icon: Moon, color: 'text-purple-400 bg-purple-500/10' },
                  { reason: 'soreness' as SkipReason, label: 'Still sore', icon: Activity, color: 'text-blue-400 bg-blue-500/10' },
                  { reason: 'injury' as SkipReason, label: 'Injured', icon: AlertTriangle, color: 'text-amber-400 bg-amber-500/10' },
                  { reason: 'illness' as SkipReason, label: 'Feeling sick', icon: Thermometer, color: 'text-rose-400 bg-rose-500/10' },
                  { reason: 'mental_health' as SkipReason, label: 'Mental health day', icon: Brain, color: 'text-emerald-400 bg-emerald-500/10' },
                  { reason: 'travel' as SkipReason, label: 'Traveling / no gym', icon: Target, color: 'text-cyan-400 bg-cyan-500/10' },
                ]).map(({ reason, label, icon: Icon, color }) => (
                  <button
                    key={reason}
                    onClick={() => {
                      const skipId = skipWorkout({
                        date: new Date().toISOString().split('T')[0],
                        scheduledSessionId: nextWorkout.id,
                        reason,
                        rescheduled: false,
                      });
                      setShowSkipDialog(false);
                      if (reason === 'illness') {
                        onNavigate('illness');
                      } else if (reason === 'injury') {
                        onNavigate('injury');
                      }
                      showToast('Session skipped', 'info', {
                        label: 'Undo',
                        onClick: () => {
                          deleteSkip(skipId);
                          showToast('Skip undone', 'success');
                        },
                      });
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-grappler-800/60 hover:bg-grappler-700/60 rounded-xl transition-colors"
                  >
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-grappler-200">{label}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowSkipDialog(false)}
                className="w-full mt-3 py-2 text-sm text-grappler-500 hover:text-grappler-300 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Workout Migration Dialog */}
      <AnimatePresence>
        {showMigrateDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => {
              setShowMigrateDialog(false);
              setPreviousMesocycleId(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-grappler-900 rounded-2xl p-5 max-w-sm w-full border border-grappler-700 shadow-xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-primary-500/20">
                  <RefreshCw className="w-5 h-5 text-primary-400" />
                </div>
                <h3 className="text-lg font-bold text-grappler-100">Keep Workout Progress?</h3>
              </div>

              <p className="text-sm text-grappler-400 mb-2">
                You have <span className="text-primary-400 font-semibold">{getCurrentMesocycleLogCount()} workout{getCurrentMesocycleLogCount() !== 1 ? 's' : ''}</span> logged in your current program.
              </p>
              <p className="text-sm text-grappler-400 mb-5">
                Do you want to carry this progress into your new program, or start fresh?
              </p>

              <div className="space-y-2">
                <button
                  onClick={() => handleMigrateResponse(true)}
                  className="btn btn-primary w-full gap-2"
                >
                  <Check className="w-4 h-4" />
                  Keep My Progress
                </button>
                <button
                  onClick={() => handleMigrateResponse(false)}
                  className="btn btn-secondary w-full gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Start Fresh
                </button>
                <button
                  onClick={() => {
                    setShowMigrateDialog(false);
                    setPreviousMesocycleId(null);
                  }}
                  className="btn btn-ghost w-full text-grappler-500"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
