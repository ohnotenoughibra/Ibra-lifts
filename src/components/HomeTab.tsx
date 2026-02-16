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
  ChevronRight,
  MoreHorizontal,
  Droplets,
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
import { generateWeeklySynthesis, generatePostWorkoutCoachingLine, generateWeeklyInsights } from '@/lib/weekly-synthesis';
import type { WeeklyInsight } from '@/lib/weekly-synthesis';
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
import WeeklyMomentum from './WeeklyMomentum';
import ReadinessRing from './ReadinessRing';
import StatusBar from './StatusBar';
import { generatePerformanceNarrative } from '@/lib/performance-narratives';
import { generateCoachingTips } from '@/lib/sport-nutrition-engine';
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
  const [skipFrictionShown, setSkipFrictionShown] = useState(false);
  const [liftOptionsExpanded, setLiftOptionsExpanded] = useState(false);
  const [showMigrateDialog, setShowMigrateDialog] = useState(false);
  const [previousMesocycleId, setPreviousMesocycleId] = useState<string | null>(null);
  const [showValidateConfirm, setShowValidateConfirm] = useState(false);
  const [dismissedCards, setDismissedCards] = useState<Set<string>>(new Set());
  const [readinessExpanded, setReadinessExpanded] = useState(false);
  const [weeklyCoachingExpanded, setWeeklyCoachingExpanded] = useState<boolean | null>(null);
  const [sorenessCheckDismissed, setSorenessCheckDismissed] = useState(false);
  const weightUnit = user?.weightUnit || 'lbs';
  const hour = new Date().getHours();

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
  // ─── Weekly Insights — structured coaching chips ───
  const weeklyInsights = useMemo(() => {
    if (!synthesis.hasData) return [];
    return generateWeeklyInsights({
      stats: synthesis.stats,
      trends: synthesis.trends,
      lastWeekVolume: synthesis.lastWeekVolume,
      lastWorkouts: synthesis.lastWorkouts,
      weightUnit,
      stalledExercises: synthesis.stalledExercises,
      isMidWeek: synthesis.isMidWeek,
    });
  }, [synthesis, weightUnit]);

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

  // ─── Victory sequence: Confetti + Haptic ───
  const confettiFired = useRef(false);
  useEffect(() => {
    if (!lastCompletedWorkout || confettiFired.current) return;
    const hasPR = lastCompletedWorkout.hadPR;
    const hasBadge = lastCompletedWorkout.newBadges && lastCompletedWorkout.newBadges.length > 0;
    const isSGrade = directive.todayPerformance?.grade === 'S';
    const manyPRs = (directive.todayPerformance?.prs ?? 0) >= 3;
    if (hasPR || hasBadge || isSGrade) {
      confettiFired.current = true;
      // Sync confetti with victory animation — elite gets delayed for dramatic reveal
      const isElite = isSGrade || manyPRs;
      setTimeout(() => fireConfetti(), isElite ? 1500 : 600);
      // Haptic at grade stamp moment
      setTimeout(() => {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(hasPR ? [100, 50, 100] : [80]);
        }
      }, 500);
    }
  }, [lastCompletedWorkout, directive.todayPerformance]);
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

  // ─── Post-workout nutrition nudge (sport-aware) ───
  const postWorkoutNutritionNudge = useMemo(() => {
    if (!lastCompletedWorkout) return null;
    const log = lastCompletedWorkout.log;
    const duration = log.duration || 0;
    const todayStr = new Date().toDateString();
    const todayMealsCount = (meals || []).filter(m => new Date(m.date).toDateString() === todayStr).length;
    const hour = new Date().getHours();
    const isCombatAthlete = user?.trainingIdentity === 'combat';

    // Sport-aware nutrition guidance
    if (duration >= 90) {
      return {
        text: isCombatAthlete
          ? `${duration}min session — rehydrate immediately. 40g protein + electrolytes + fast carbs within 30min.`
          : `${duration}min session — eat within 30min: 40g protein + fast carbs (rice, banana, dates)`,
        urgent: true,
      };
    }
    if (duration >= 45) {
      if (todayMealsCount === 0 && hour < 14) {
        return {
          text: isCombatAthlete
            ? 'Trained fasted — rehydrate first, then protein + carbs within the hour'
            : 'You trained fasted — prioritize protein + carbs within the next hour',
          urgent: true,
        };
      }
      return {
        text: isCombatAthlete
          ? 'Post-session: rehydrate (500ml+ water), 30g protein, electrolytes if you were sweating hard'
          : 'Post-workout window: 30-40g protein + carbs to kickstart recovery',
        urgent: false,
      };
    }
    return null;
  }, [lastCompletedWorkout, meals, user?.trainingIdentity]);

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
  const activeDietPhase = useAppStore(s => s.activeDietPhase);

  // ─── Time-Aware Coaching — one adaptive line that changes throughout the day ───
  const timeCoaching = useMemo(() => {
    const hasTrainedToday = directive.todayPerformance != null;
    const isRestDay = directive.todayType === 'rest' || (directive.todayType === 'recovery' && !hasTrainedToday);
    const pTarget = macroTargets.protein || 0;
    const proteinRemaining = Math.round(Math.max(0, pTarget - todayProtein));
    const proteinPct = pTarget > 0 ? Math.round((todayProtein / pTarget) * 100) : 0;
    const sleep = sleepHours;
    const phase = hour < 12 ? 'am' : hour < 18 ? 'pm' : 'eve';

    if (hasTrainedToday) {
      if (phase === 'am') return proteinRemaining > 20 ? `Session done. ${proteinRemaining}g protein to go — spread it across your meals.` : 'Done early. Nutrition on track.';
      if (phase === 'pm') return proteinRemaining > 20 ? `Refuel: ${proteinRemaining}g protein still needed today.` : 'Recovery fueling on point.';
      return proteinRemaining > 20 ? `${proteinRemaining}g protein left — last meal counts.` : 'Great day. Sleep well tonight.';
    }

    if (isRestDay) {
      if (phase === 'am') return 'Recovery day. Light movement and protein first.';
      if (phase === 'pm') return proteinPct < 60 ? `Protein at ${proteinPct}% — don't slack on rest days.` : 'Recovery on track. Stay fueled.';
      return 'Rest day done. Sleep is your best recovery tool.';
    }

    // Training day, haven't trained yet
    if (phase === 'am') {
      if (sleep != null && sleep < 6) return `${sleep.toFixed(1)}h sleep — consider lighter session.`;
      return sleep != null ? `${sleep.toFixed(1)}h sleep. Ready to go.` : 'Training day. Fuel up.';
    }
    if (phase === 'pm') return `Afternoon window. Readiness: ${directive.readinessLevel}.`;
    return directive.shouldTrain ? 'Late session or intentional rest — your call.' : 'Wind down. Sleep quality over everything.';
  }, [directive, macroTargets, todayProtein, hour, sleepHours]);

  // ─── Sport Nutrition Tip icons ───
  const tipIconMap: Record<string, typeof Zap> = {
    zap: Zap, droplets: Droplets, 'alert-triangle': AlertTriangle,
    target: Target, 'utensils-crossed': Apple, thermometer: Thermometer,
    shield: Shield, moon: Moon, heart: HeartPulse, flame: Flame,
    'trending-up': TrendingUp, clock: Clock, scale: Scale, beaker: Sparkles,
  };

  // ─── Sport Nutrition Tips — evidence-based, context-aware coaching ───
  const sportTips = useMemo(() => {
    if (!user) return [];
    const lastBW = bodyWeightLog.length > 0 ? bodyWeightLog[bodyWeightLog.length - 1] : null;
    const bwKg = lastBW
      ? (weightUnit === 'lbs' ? lastBW.weight * 0.453592 : lastBW.weight)
      : 75;

    const daysToComp = (() => {
      const now = Date.now();
      const next = competitions
        .filter(c => c.isActive && new Date(c.date).getTime() > now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
      if (!next) return null;
      return Math.ceil((new Date(next.date).getTime() - now) / (1000 * 60 * 60 * 24));
    })();

    const dietPhase = activeDietPhase;

    return generateCoachingTips({
      todayType: directive.todayType,
      hour,
      hasTrainedToday: directive.todayPerformance != null,
      sport: user.combatSport,
      trainingIdentity: user.trainingIdentity,
      goalFocus: user.goalFocus,
      fightCampPhase: directive.fightCampTag,
      dietGoal: dietPhase?.isActive ? dietPhase.goal : null,
      proteinSoFar: todayProtein,
      proteinTarget: macroTargets.protein || 0,
      waterIntake: waterToday,
      sleepHours: sleepHours ?? null,
      bodyWeightKg: bwKg,
      daysToCompetition: daysToComp,
      isDeload: directive.isDeload,
    });
  }, [user, directive, hour, bodyWeightLog, weightUnit, competitions, activeDietPhase, todayProtein, macroTargets, waterToday, sleepHours]);

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

  // 7. Weekly pulse — now handled by WeeklyMomentum component below

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

      {/* ─── ZONE 1: STATUS BAR — ambient instrument panel ─── */}
      <StatusBar
        readinessScore={directive.readinessScore}
        readinessLevel={directive.readinessLevel}
        streak={currentStreak}
        blockPosition={
          mesocycleProgress && mesocycleProgress.completed >= mesocycleProgress.total
            ? 'Block Complete'
            : directive.isDeload
              ? 'Deload'
              : directive.sessionLabel
        }
        phaseTag={directive.fightCampTag}
        weekProgress={{ done: weekDone, target: weekTarget }}
        onReadinessTap={() => setReadinessExpanded(v => !v)}
      />

      {/* ─── TIME-AWARE COACHING LINE — one sentence that changes throughout the day ─── */}
      <div className="flex items-start gap-2.5 px-1">
        <Sun className="w-3.5 h-3.5 text-grappler-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-grappler-400 leading-snug">{timeCoaching}</p>
      </div>

      {/* ─── PERSISTENT NUTRITION STRIP — protein + water always visible ─── */}
      {macroTargets.protein > 0 && (
        <div className="flex items-center gap-3 px-1">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Apple className="w-3.5 h-3.5 text-grappler-500 flex-shrink-0" />
            <div className="flex-1 h-1.5 bg-grappler-700/40 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500',
                  todayProtein >= macroTargets.protein ? 'bg-green-400' :
                  todayProtein >= macroTargets.protein * 0.7 ? 'bg-yellow-400' : 'bg-grappler-500'
                )}
                style={{ width: `${Math.min(100, Math.round((todayProtein / macroTargets.protein) * 100))}%` }}
              />
            </div>
            <span className={cn(
              'text-[10px] tabular-nums font-medium flex-shrink-0',
              todayProtein >= macroTargets.protein ? 'text-green-400' :
              todayProtein >= macroTargets.protein * 0.7 ? 'text-yellow-400' : 'text-grappler-500'
            )}>
              {Math.round(todayProtein)}/{Math.round(macroTargets.protein)}g
            </span>
          </div>
          {waterToday > 0 && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Droplets className="w-3 h-3 text-blue-400/70" />
              <span className="text-[10px] text-blue-300/70 tabular-nums font-medium">{waterToday}</span>
            </div>
          )}
        </div>
      )}

      {/* ─── SPORT NUTRITION TIPS — evidence-based coaching for today's session ─── */}
      {sportTips.length > 0 && (
        <div className="space-y-1.5 px-1">
          {sportTips.map((tip, i) => {
            const Icon = tipIconMap[tip.icon] || Zap;
            return (
              <div key={i} className="flex items-start gap-2">
                <Icon className={cn('w-3.5 h-3.5 flex-shrink-0 mt-0.5', tip.color)} />
                <p className="text-xs text-grappler-300 leading-snug">{tip.text}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── CRITICAL ALERTS — non-dismissible, above everything ─── */}
      {criticalAlerts.length > 0 && (
        <div className="space-y-2">
          {criticalAlerts.map(card => card)}
        </div>
      )}

      {/* ─── ZONE 2: THE DIRECTIVE — single adaptive card ─── */}
      {directive.todayPerformance && directive.todayType === 'recovery' ? (
        /* POST-SESSION: Victory sequence — grade stamp, staggered reveal */
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/10 via-grappler-800 to-grappler-900 p-5 overflow-hidden"
        >
          {/* Header: "Session Complete" + XP — fades in */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="flex items-center gap-2 mb-1"
          >
            <Check className="w-4 h-4 text-green-400" />
            <span className="text-xs text-green-400/80 font-bold uppercase tracking-wide">Session Complete</span>
            {currentStreak > 1 && (
              <span className="text-xs text-green-400/50">{currentStreak} day streak</span>
            )}
          </motion.div>

          {/* Grade stamp + verdict — grade stamps in from 3x scale */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 mt-2 flex-1">
              <div className="relative flex items-center justify-center" style={{ width: 48, height: 48 }}>
                {/* Color burst behind grade */}
                <motion.div
                  initial={{ scale: 0, opacity: 0.6 }}
                  animate={{ scale: 2.5, opacity: 0 }}
                  transition={{ delay: 0.55, duration: 0.8, ease: 'easeOut' }}
                  className={cn('absolute w-12 h-12 rounded-full',
                    directive.todayPerformance.grade === 'S' ? 'bg-yellow-400/30' :
                    directive.todayPerformance.grade === 'A' ? 'bg-green-400/25' :
                    'bg-primary-400/20'
                  )}
                />
                {/* Grade letter — stamps in */}
                <motion.span
                  initial={{ scale: 3, opacity: 0, rotate: -12 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 20 }}
                  className={cn(
                    'text-4xl font-black leading-none relative',
                    directive.todayPerformance.grade === 'S' ? 'text-yellow-400' :
                    directive.todayPerformance.grade === 'A' ? 'text-green-400' :
                    directive.todayPerformance.grade === 'B' ? 'text-primary-400' : 'text-grappler-400'
                  )}
                >
                  {directive.todayPerformance.grade}
                </motion.span>
              </div>
              <motion.p
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7, duration: 0.4 }}
                className="text-sm text-grappler-300 leading-snug flex-1"
              >
                {directive.todayPerformance.verdict}
              </motion.p>
            </div>
            {lastCompletedWorkout && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.8 }}
                onClick={handleShareWorkout}
                className="text-green-400 hover:text-green-300 p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-colors flex-shrink-0"
                title="Share workout"
              >
                {shareCopied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              </motion.button>
            )}
          </div>

          {/* PR callout — flies in from left */}
          {directive.todayPerformance.prs > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: 1.0, type: 'spring', stiffness: 200, damping: 25 }}
              className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 mb-3"
            >
              <Trophy className="w-4 h-4 text-yellow-400 flex-shrink-0" />
              <p className="text-xs text-yellow-300 font-medium">
                {directive.todayPerformance.prs === 1
                  ? `PR: ${directive.todayPerformance.prExercises[0]}`
                  : `${directive.todayPerformance.prs} PRs: ${directive.todayPerformance.prExercises.slice(0, 2).join(', ')}${directive.todayPerformance.prs > 2 ? ` +${directive.todayPerformance.prs - 2}` : ''}`
                }
              </p>
            </motion.div>
          )}

          {/* Badges — staggered fly-in */}
          {lastCompletedWorkout?.newBadges && lastCompletedWorkout.newBadges.length > 0 && (
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {lastCompletedWorkout.newBadges.map((badge, i) => (
                <motion.span
                  key={badge.id}
                  initial={{ opacity: 0, y: 16, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 1.1 + i * 0.1, type: 'spring', stiffness: 250, damping: 20 }}
                  className="text-xs px-2 py-1 rounded-full bg-purple-500/15 text-purple-300"
                >
                  {badge.icon} {badge.name}
                </motion.span>
              ))}
            </div>
          )}

          {/* Performance metrics grid — fades in */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3, duration: 0.4 }}
            className="grid grid-cols-3 gap-2 mb-3"
          >
            <div className="bg-grappler-800/60 rounded-xl p-2.5 text-center">
              <p className="text-lg font-black text-grappler-100">{formatNumber(directive.todayPerformance.totalVolume)}</p>
              <p className="text-[10px] text-grappler-500 uppercase">{weightUnit}</p>
            </div>
            <div className="bg-grappler-800/60 rounded-xl p-2.5 text-center">
              <p className="text-lg font-black text-grappler-100">{directive.todayPerformance.totalSets}</p>
              <p className="text-[10px] text-grappler-500 uppercase">Sets</p>
            </div>
            <div className="bg-grappler-800/60 rounded-xl p-2.5 text-center">
              <p className="text-lg font-black text-grappler-100">{directive.todayPerformance.avgRPE > 0 ? directive.todayPerformance.avgRPE : '—'}</p>
              <p className="text-[10px] text-grappler-500 uppercase">RPE</p>
            </div>
          </motion.div>

          {/* Nutrition nudge */}
          {postWorkoutNutritionNudge && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.3 }}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 mb-3',
                postWorkoutNutritionNudge.urgent ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-green-500/8 border border-green-500/15'
              )}
            >
              <Apple className="w-3.5 h-3.5 flex-shrink-0 text-green-400" />
              <p className={cn('text-xs', postWorkoutNutritionNudge.urgent ? 'text-orange-300' : 'text-green-400')}>
                {postWorkoutNutritionNudge.text}
              </p>
            </motion.div>
          )}

          {/* Forward look */}
          {directive.forwardLook && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.7, duration: 0.3 }}
              className="flex items-center gap-2 pt-2 border-t border-grappler-700/40"
            >
              <ChevronRight className="w-3 h-3 text-grappler-600 flex-shrink-0" />
              <p className="text-[11px] text-grappler-500">{directive.forwardLook}</p>
            </motion.div>
          )}

          {mesocycleProgress && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.8, duration: 0.3 }}
              className="flex items-center gap-2 mt-3"
            >
              <div className="flex-1 h-1.5 bg-grappler-700 rounded-full overflow-hidden"><div className="h-full bg-green-500/60 rounded-full" style={{ width: `${mesocycleProgress.percent}%` }} /></div>
              <span className="text-xs text-grappler-500">{mesocycleProgress.completed}/{mesocycleProgress.total}</span>
            </motion.div>
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
          forwardLook={directive.forwardLook}
        />

      ) : directive.todayType === 'combat' ? (
        /* ─── COMBAT DAY — structured session cards with intensity badges ─── */
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          {(() => {
            const allCombatLogged = directive.todayCombatSessions.length > 0 && directive.todayCombatSessions.every(s => s.logged);
            const loggedCount = directive.todayCombatSessions.filter(s => s.logged).length;
            const totalDuration = directive.todayCombatSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
            return (
          <div className={cn(
            'rounded-2xl overflow-hidden border',
            allCombatLogged
              ? 'border-green-500/30 bg-gradient-to-br from-green-500/10 via-grappler-800 to-grappler-900'
              : 'border-purple-500/20 bg-gradient-to-br from-grappler-800 via-grappler-850 to-purple-950/30'
          )}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-1">
              <div className="flex items-center gap-2">
                {allCombatLogged ? <Check className="w-4 h-4 text-green-400" /> : <Shield className="w-4 h-4 text-purple-400" />}
                <span className="text-[10px] font-bold uppercase tracking-widest text-grappler-400">
                  {allCombatLogged ? 'Sessions Complete' : 'Mat Day'}
                </span>
              </div>
              {mesocycleProgress && (
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1 bg-grappler-700 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-400/60 rounded-full" style={{ width: `${mesocycleProgress.percent}%` }} />
                  </div>
                  <span className="text-[10px] text-grappler-500 tabular-nums">{mesocycleProgress.completed}/{mesocycleProgress.total}</span>
                </div>
              )}
            </div>

            {/* Headline + subline */}
            <div className="px-5 pb-3">
              <h2 className="text-xl font-black text-grappler-50 leading-tight">{directive.headline}</h2>
              <p className="text-xs text-grappler-400 mt-1">{directive.subline}</p>
            </div>

            {/* Session cards */}
            {directive.todayCombatSessions.length > 0 && (
              <div className="mx-5 mb-3 space-y-2">
                {directive.todayCombatSessions.map((s, i) => (
                  <div key={i} className={cn(
                    'rounded-xl border px-3.5 py-2.5 flex items-center gap-3',
                    s.logged
                      ? 'bg-green-500/8 border-green-500/20'
                      : 'bg-grappler-900/50 border-grappler-700/40'
                  )}>
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                      s.logged ? 'bg-green-500/20' : 'bg-purple-500/15'
                    )}>
                      {s.logged ? <Check className="w-4 h-4 text-green-400" /> : <Shield className="w-4 h-4 text-purple-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-grappler-200">{s.type}</p>
                      <p className="text-[10px] text-grappler-500">{s.duration > 0 ? `${s.duration}min` : 'Open mat'}</p>
                    </div>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide',
                      s.intensity === 'high' ? 'bg-red-500/15 text-red-400 border border-red-500/20' :
                      s.intensity === 'moderate' ? 'bg-yellow-500/12 text-yellow-400 border border-yellow-500/20' :
                      'bg-green-500/12 text-green-400 border border-green-500/20'
                    )}>{s.intensity}</span>
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
                      className="text-grappler-600 hover:text-grappler-300 transition-colors"
                      title="Skip this session"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Stats row — session count + total duration + progress */}
            <div className="mx-5 mb-3 flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-grappler-900/40 rounded-lg px-2.5 py-1.5">
                <Shield className="w-3 h-3 text-grappler-500" />
                <span className="text-xs text-grappler-300 font-medium">{loggedCount}/{directive.todayCombatSessions.length}</span>
              </div>
              {totalDuration > 0 && (
                <div className="flex items-center gap-1.5 bg-grappler-900/40 rounded-lg px-2.5 py-1.5">
                  <Clock className="w-3 h-3 text-grappler-500" />
                  <span className="text-xs text-grappler-300 font-medium">{totalDuration}min</span>
                </div>
              )}
            </div>

            {/* Action items */}
            {directive.actions.filter(a => !a.includes(directive.todayCombatSessions[0]?.type || '§')).length > 0 && (
              <div className="mx-5 mb-3 space-y-1">
                {directive.actions.filter(a => !a.includes(directive.todayCombatSessions[0]?.type || '§')).map((a, i) => (
                  <div key={i} className="flex items-start gap-2"><Target className="w-3 h-3 text-grappler-500 flex-shrink-0 mt-0.5" /><p className="text-xs text-grappler-400">{a}</p></div>
                ))}
              </div>
            )}

            {/* Forward look */}
            {directive.forwardLook && (
              <div className="mx-5 mb-4 flex items-center gap-2 pt-2 border-t border-grappler-700/40">
                <ChevronRight className="w-3 h-3 text-grappler-600 flex-shrink-0" />
                <p className="text-[10px] text-grappler-500">{directive.forwardLook}</p>
              </div>
            )}
          </div>
            );
          })()}

          {/* Next strength session — informational preview, not a temptation */}
          {nextWorkout && (
            <div className="w-full rounded-xl border border-grappler-700/30 bg-grappler-800/30 p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                <Dumbbell className="w-4 h-4 text-primary-400/60" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-grappler-500 font-medium uppercase tracking-wide">
                  Next Strength{directive.nextLiftDayLabel ? ` · ${directive.nextLiftDayLabel}` : ''}
                </p>
                <p className="text-sm font-semibold text-grappler-300 truncate">{directive.sessionLabel && !nextWorkout.name.startsWith(directive.sessionLabel) ? `${directive.sessionLabel} — ` : ''}{nextWorkout.name}</p>
                <p className="text-[10px] text-grappler-500">{nextWorkout.exercises.length} exercises · ~{nextWorkout.estimatedDuration}m</p>
              </div>
              <button
                onClick={() => startWorkout(nextWorkout)}
                className="text-[10px] text-primary-400/60 hover:text-primary-400 px-2.5 py-1.5 rounded-lg hover:bg-primary-500/10 transition-colors flex-shrink-0"
              >
                Start
              </button>
            </div>
          )}
        </motion.div>

      ) : nextWorkout ? (
        /* ─── LIFT DAY (or both) — Mission Briefing Card ─── */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          {/* Pre-Workout Intel Strip — compact readiness context */}
          {(() => {
            const intelChips: { label: string; value: string; color: string; icon: React.ReactNode }[] = [];
            if (sleepHours != null) intelChips.push({ label: 'Sleep', value: `${sleepHours.toFixed(1)}h`, color: sleepHours >= 7 ? 'text-green-400' : sleepHours >= 5.5 ? 'text-yellow-400' : 'text-red-400', icon: <Moon className="w-3 h-3" /> });
            if (macroTargets.protein > 0) intelChips.push({ label: 'Protein', value: `${Math.round(todayProtein)}/${Math.round(macroTargets.protein)}g`, color: todayProtein >= macroTargets.protein * 0.5 ? 'text-green-400' : todayProtein > 0 ? 'text-yellow-400' : 'text-grappler-500', icon: <Apple className="w-3 h-3" /> });
            if (waterToday > 0 || macroTargets.protein > 0) intelChips.push({ label: 'Water', value: waterToday > 0 ? `${waterToday}` : '—', color: waterToday >= 6 ? 'text-blue-400' : waterToday >= 3 ? 'text-blue-300' : 'text-grappler-500', icon: <Droplets className="w-3 h-3" /> });
            if (recoveryScore != null) intelChips.push({ label: 'Recovery', value: `${recoveryScore}%`, color: recoveryScore >= 67 ? 'text-green-400' : recoveryScore >= 34 ? 'text-yellow-400' : 'text-red-400', icon: <HeartPulse className="w-3 h-3" /> });
            return intelChips.length > 0 ? (
              <div className="flex items-center gap-1 px-1 overflow-x-auto no-scrollbar">
                {intelChips.map(chip => (
                  <div key={chip.label} className="flex items-center gap-1.5 bg-grappler-800/60 border border-grappler-700/50 rounded-lg px-2.5 py-1.5 flex-shrink-0">
                    <span className={chip.color}>{chip.icon}</span>
                    <span className={cn('text-xs font-bold tabular-nums', chip.color)}>{chip.value}</span>
                  </div>
                ))}
              </div>
            ) : null;
          })()}

          {/* Training modification warning — outside the card for max visibility */}
          {directive.trainingModification && (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <p className="text-xs text-amber-200 font-medium leading-snug">{directive.trainingModification}</p>
            </div>
          )}

          {/* Main Mission Card */}
          <div className={cn(
            "rounded-2xl overflow-hidden border",
            directive.todayType === 'both'
              ? 'border-purple-500/20 bg-gradient-to-br from-grappler-800 via-grappler-850 to-purple-950/30'
              : 'border-primary-500/20 bg-gradient-to-br from-grappler-800 via-grappler-850 to-primary-950/20'
          )}>
            {/* Card header — session label + block progress */}
            <div className="flex items-center justify-between px-5 pt-4 pb-1">
              <div className="flex items-center gap-2">
                <Dumbbell className={cn('w-4 h-4', directive.todayType === 'both' ? 'text-purple-400' : 'text-primary-400')} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-grappler-400">
                  {directive.todayType === 'both' ? 'Lift + Mat Day' : directive.isDeload ? 'Deload Session' : 'Training Day'}
                </span>
              </div>
              {mesocycleProgress && (
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1 bg-grappler-700 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', directive.todayType === 'both' ? 'bg-purple-400/60' : 'bg-primary-400/60')} style={{ width: `${mesocycleProgress.percent}%` }} />
                  </div>
                  <span className="text-[10px] text-grappler-500 tabular-nums">{mesocycleProgress.completed}/{mesocycleProgress.total}</span>
                </div>
              )}
            </div>

            {/* Workout name + subline */}
            <div className="px-5 pb-3">
              <h2 className="text-xl font-black text-grappler-50 leading-tight">{nextWorkout.name}</h2>
              <p className="text-xs text-grappler-400 mt-1 leading-relaxed">{directive.subline}</p>
            </div>

            {/* Overload teaser — the "why today matters" line */}
            {directive.overloadTeaser && (
              <div className="mx-5 mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/8 border border-green-500/15">
                <TrendingUp className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                <p className="text-[11px] text-green-300 font-semibold">{directive.overloadTeaser}</p>
              </div>
            )}

            {/* Exercise lineup — structured grid */}
            <div className="mx-5 mb-3 bg-grappler-900/50 rounded-xl border border-grappler-700/40 overflow-hidden">
              {nextWorkout.exercises.slice(0, 4).map((ex, i) => (
                <div key={i} className={cn(
                  'flex items-center gap-3 px-3 py-2',
                  i < Math.min(3, nextWorkout.exercises.length - 1) && 'border-b border-grappler-700/30'
                )}>
                  <span className="text-[10px] font-bold text-grappler-600 w-4 text-center tabular-nums">{i + 1}</span>
                  <p className="text-xs text-grappler-200 flex-1 truncate">{ex.exercise.name}</p>
                  <span className="text-[10px] text-grappler-500 tabular-nums">{ex.sets}×{ex.prescription.targetReps}</span>
                </div>
              ))}
              {nextWorkout.exercises.length > 4 && (
                <div className="px-3 py-1.5 text-center border-t border-grappler-700/30">
                  <span className="text-[10px] text-grappler-500">+{nextWorkout.exercises.length - 4} more exercises</span>
                </div>
              )}
            </div>

            {/* Stats row — exercise count + duration + total sets */}
            <div className="mx-5 mb-4 flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-grappler-900/40 rounded-lg px-2.5 py-1.5">
                <Dumbbell className="w-3 h-3 text-grappler-500" />
                <span className="text-xs text-grappler-300 font-medium">{nextWorkout.exercises.length}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-grappler-900/40 rounded-lg px-2.5 py-1.5">
                <Clock className="w-3 h-3 text-grappler-500" />
                <span className="text-xs text-grappler-300 font-medium">~{nextWorkout.estimatedDuration}m</span>
              </div>
              <div className="flex items-center gap-1.5 bg-grappler-900/40 rounded-lg px-2.5 py-1.5">
                <Target className="w-3 h-3 text-grappler-500" />
                <span className="text-xs text-grappler-300 font-medium">{nextWorkout.exercises.reduce((s, e) => s + e.sets, 0)} sets</span>
              </div>
            </div>

            {/* START CTA — high-contrast, separated from info */}
            <div className="px-5 pb-5">
              <button
                onClick={() => startWorkout(nextWorkout)}
                className={cn(
                  "w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg",
                  directive.todayType === 'both'
                    ? 'bg-gradient-to-r from-primary-500 via-purple-500 to-indigo-500 shadow-purple-500/20'
                    : 'bg-gradient-to-r from-primary-500 to-accent-500 shadow-primary-500/20',
                  workoutLogs.length === 0 && "ring-2 ring-primary-400/50 ring-offset-2 ring-offset-grappler-900 animate-pulse"
                )}
              >
                <Play className="w-5 h-5" />
                Start Workout
              </button>
            </div>
          </div>

          {/* Combat callout when both — each session as a mini-card */}
          {directive.todayType === 'both' && directive.todayCombatSessions.length > 0 && (
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">Also on the mat</span>
              </div>
              {directive.todayCombatSessions.map((s, i) => (
                <div key={i} className="flex items-center gap-2.5 bg-grappler-800/40 border border-purple-500/15 rounded-lg px-3 py-2">
                  {s.logged ? <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> : <Shield className="w-3.5 h-3.5 text-purple-400/60 flex-shrink-0" />}
                  <p className="text-xs text-grappler-300 flex-1">{s.type}{s.duration > 0 ? ` · ${s.duration}min` : ''}</p>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                    s.intensity === 'high' ? 'bg-red-500/15 text-red-400' :
                    s.intensity === 'moderate' ? 'bg-yellow-500/15 text-yellow-400' :
                    'bg-green-500/15 text-green-400'
                  )}>{s.intensity}</span>
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
                    className="text-grappler-600 hover:text-grappler-300 transition-colors"
                    title="Skip this session"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Secondary CTA: Quick 30m + collapsed options */}
          <div className="flex items-center justify-center gap-3">
            <button onClick={handleQuickWorkout} className="flex items-center gap-1.5 py-2 text-xs text-grappler-500 hover:text-grappler-300 transition-colors"><Zap className="w-3.5 h-3.5" />Quick 30m</button>
            <button
              onClick={() => setLiftOptionsExpanded(v => !v)}
              className="flex items-center gap-1 py-2 text-xs text-grappler-600 hover:text-grappler-400 transition-colors"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Collapsed options: Skip + Finish Block */}
          <AnimatePresence>
            {liftOptionsExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center justify-center gap-4 py-1">
                  <button
                    onClick={() => {
                      setLiftOptionsExpanded(false);
                      setShowSkipDialog(true);
                    }}
                    className="flex items-center gap-1.5 py-1.5 text-xs text-grappler-500 hover:text-grappler-300 transition-colors"
                  >
                    <SkipForward className="w-3.5 h-3.5" />Skip Session
                  </button>
                  <span className="text-grappler-700">·</span>
                  <button
                    onClick={() => { setLiftOptionsExpanded(false); setShowValidateConfirm(true); }}
                    className="flex items-center gap-1.5 py-1.5 text-xs text-grappler-500 hover:text-green-400 transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />Finish Block
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Finish block confirmation */}
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
                    <button onClick={handleValidateBlock} className="btn btn-sm bg-green-600 text-white hover:bg-green-500 gap-1.5"><CheckCircle className="w-3.5 h-3.5" />Finish</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ) : currentMesocycle && mesocycleProgress && mesocycleProgress.completed === mesocycleProgress.total ? (
        /* ─── MESOCYCLE COMPLETE — celebration with rich stats ─── */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl overflow-hidden border border-primary-500/20 bg-gradient-to-br from-primary-500/10 via-grappler-800 to-accent-500/5"
        >
          {/* Trophy header */}
          <div className="pt-6 pb-3 text-center relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 border border-primary-500/20 flex items-center justify-center mx-auto mb-3">
              <Trophy className="w-8 h-8 text-primary-400" />
            </div>
            <h3 className="text-lg font-black text-grappler-50">Block Complete</h3>
            <p className="text-xs text-grappler-400 mt-1">
              All {mesocycleProgress.total} sessions in <span className="text-grappler-200 font-medium">{currentMesocycle.name}</span> done
            </p>
          </div>

          {/* Stats comparison grid */}
          {mesocycleComparison && (
            <div className="mx-5 mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-grappler-500 mb-2">vs {mesocycleComparison.prevName}</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-grappler-900/50 border border-grappler-700/40 rounded-xl p-3 text-center">
                  <p className="text-lg font-black text-grappler-100">{mesocycleComparison.sessions.current}</p>
                  <p className="text-[10px] text-grappler-500 uppercase">Sessions</p>
                </div>
                <div className="bg-grappler-900/50 border border-grappler-700/40 rounded-xl p-3 text-center">
                  <p className="text-lg font-black text-grappler-100">{formatNumber(mesocycleComparison.avgVolume.current)}</p>
                  <p className="text-[10px] text-grappler-500 uppercase">Avg Vol</p>
                  <p className={cn('text-xs font-bold mt-0.5', mesocycleComparison.avgVolume.delta > 0 ? 'text-green-400' : mesocycleComparison.avgVolume.delta < 0 ? 'text-red-400' : 'text-grappler-500')}>
                    {mesocycleComparison.avgVolume.delta > 0 ? '+' : ''}{formatNumber(mesocycleComparison.avgVolume.delta)}
                  </p>
                </div>
                <div className="bg-grappler-900/50 border border-grappler-700/40 rounded-xl p-3 text-center">
                  <p className="text-lg font-black text-grappler-100">{mesocycleComparison.avgRPE.current}</p>
                  <p className="text-[10px] text-grappler-500 uppercase">Avg RPE</p>
                </div>
              </div>
            </div>
          )}

          {/* Next block preview */}
          {mesocycleQueue.length > 0 && (
            <div className="mx-5 mb-4 bg-grappler-900/40 border border-grappler-700/40 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary-500/15 flex items-center justify-center flex-shrink-0">
                <ChevronRight className="w-5 h-5 text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-grappler-500 font-bold uppercase tracking-wide">Up next</p>
                <p className="text-sm font-bold text-primary-300 truncate">{mesocycleQueue[0].name}</p>
                <p className="text-[10px] text-grappler-500">{mesocycleQueue[0].weeks} weeks · {mesocycleQueue[0].periodization || 'auto'}</p>
              </div>
            </div>
          )}

          {/* CTAs */}
          <div className="px-5 pb-5 flex items-center gap-2">
            <button
              onClick={() => onViewReport(currentMesocycle.id)}
              className="btn btn-md gap-2 bg-grappler-700 text-grappler-200 hover:bg-grappler-600 flex-1"
            >
              <BarChart3 className="w-4 h-4" />
              Report
            </button>
            <button
              onClick={handleGenerateNext}
              className="btn btn-primary btn-md gap-2 flex-1"
            >
              <Zap className="w-4 h-4" />
              {mesocycleQueue.length > 0 ? 'Start Next' : 'Next Mesocycle'}
            </button>
          </div>
        </motion.div>
      ) : (
        /* ─── NO PROGRAM — welcoming onboarding card ─── */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl overflow-hidden border border-grappler-700/50 bg-gradient-to-br from-grappler-800 via-grappler-850 to-primary-950/10"
        >
          {/* Welcome hero */}
          <div className="pt-8 pb-5 px-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 border border-primary-500/15 flex items-center justify-center mx-auto mb-4">
              <Dumbbell className="w-8 h-8 text-primary-400" />
            </div>
            <h2 className="text-lg font-black text-grappler-50">Ready to build your program?</h2>
            <p className="text-xs text-grappler-400 mt-2 leading-relaxed max-w-[280px] mx-auto">
              AI-generated periodized training built around your schedule, experience, and goals. Takes about 30 seconds.
            </p>
          </div>

          {/* Feature preview pills */}
          <div className="flex items-center justify-center gap-2 px-5 pb-4 flex-wrap">
            <span className="text-[10px] text-grappler-400 px-2.5 py-1 rounded-full bg-grappler-800/60 border border-grappler-700/50">Auto-periodization</span>
            <span className="text-[10px] text-grappler-400 px-2.5 py-1 rounded-full bg-grappler-800/60 border border-grappler-700/50">Progressive overload</span>
            <span className="text-[10px] text-grappler-400 px-2.5 py-1 rounded-full bg-grappler-800/60 border border-grappler-700/50">Deload timing</span>
          </div>

          {/* CTAs */}
          <div className="px-5 pb-6 space-y-2">
            <button
              onClick={() => onNavigate('block_suggestion')}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-primary-500 to-accent-500 shadow-lg shadow-primary-500/20 active:scale-[0.98] transition-transform"
            >
              <Brain className="w-5 h-5" />
              Create Program
            </button>
            <button
              onClick={handleQuickWorkout}
              className="w-full py-2.5 rounded-xl text-xs font-medium text-grappler-400 hover:text-grappler-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              Or just do a quick 30-minute workout
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

      {/* ─── Weekly Momentum — 7-day rhythm bar, expandable scorecard ─── */}
      <WeeklyMomentum
        currentStreak={currentStreak}
        weekDone={weekDone}
        weekTarget={weekTarget}
        liftDays={user?.trainingDays || []}
        combatDays={user?.combatTrainingDays || []}
        workoutLogs={workoutLogs}
        trainingSessions={trainingSessions}
        weekStats={synthesis.stats}
        weekTrends={synthesis.trends}
        lastWeekVolume={periodSummaries.lastWeek.volume}
        weightUnit={weightUnit}
        nextBadgeDistance={nextBadgeDistance}
      />

      {/* ─── ZONE 3: INTEL FEED ─── */}
      <div className="space-y-0.5 mt-3">

        {/* Readiness breakdown — expandable via StatusBar tap */}
        <AnimatePresence>
          {readinessExpanded && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-2">
              <CardErrorBoundary fallbackLabel="Readiness">
                <ReadinessCard />
              </CardErrorBoundary>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wearable CTA — if no wearable connected */}
        {recoveryScore == null && (() => {
          const tier = getEffectiveTier(subscription, session?.user?.email);
          return hasFeatureAccess('wearable-integration', tier);
        })() && accountAgeDays >= 7 && (
          <button
            onClick={() => onNavigate('wearable')}
            className="w-full rounded-xl p-2.5 border border-purple-500/30 bg-purple-500/10 flex items-center justify-between hover:bg-purple-500/15 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Watch className="w-4 h-4 text-purple-400" />
              <div className="text-left">
                <span className="text-xs font-medium text-grappler-200">Unlock smarter readiness</span>
                <p className="text-xs text-grappler-500">Connect Whoop — auto-adjust from HRV</p>
              </div>
            </div>
            <span className="text-xs font-medium text-purple-400 px-2 py-1 rounded-lg bg-purple-500/20">Connect</span>
          </button>
        )}

        {/* Performance Readiness — nutrition-focused (only when ReadinessCard hidden) */}
        {!showReadiness && <PerformanceReadiness />}
      </div>

      {/* ─── INTEL FEED — priority-ranked compact chips ─── */}
      {(() => {
        // Build intel items ranked by signal strength
        const intelItems: { key: string; priority: number; content: React.ReactNode }[] = [];

        // P1: Weekly momentum — always shown (rendered above in its own section)

        // P2: Top coaching insight (from weekly synthesis)
        if (showWeeklySynthesis && weeklyInsights.length > 0) {
          const topInsight = weeklyInsights[0];
          const INTEL_COLORS: Record<string, string> = {
            gold: 'border-l-yellow-400', green: 'border-l-green-400', red: 'border-l-red-400',
            amber: 'border-l-amber-400', blue: 'border-l-blue-400', purple: 'border-l-purple-400',
            primary: 'border-l-primary-400',
          };
          const INTEL_ICONS: Record<string, React.ReactNode> = {
            trophy: <Trophy className="w-3.5 h-3.5 text-yellow-400" />,
            trending: <TrendingUp className="w-3.5 h-3.5 text-green-400" />,
            alert: <AlertTriangle className="w-3.5 h-3.5 text-red-400" />,
            target: <Target className="w-3.5 h-3.5 text-primary-400" />,
            shield: <Shield className="w-3.5 h-3.5 text-purple-400" />,
            crosshair: <Crosshair className="w-3.5 h-3.5 text-blue-400" />,
          };

          intelItems.push({
            key: 'coaching',
            priority: topInsight.type === 'win' || topInsight.type === 'warning' ? 2 : 5,
            content: (
              <button
                onClick={() => setWeeklyCoachingExpanded(v => v !== null ? !v : true)}
                className={cn(
                  'w-full card px-3 py-2.5 text-left border-l-2 flex items-start gap-2.5 hover:bg-grappler-800/40 transition-colors',
                  INTEL_COLORS[topInsight.color] || 'border-l-primary-400',
                )}
              >
                <span className="mt-0.5 flex-shrink-0">{INTEL_ICONS[topInsight.icon]}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-grappler-400">{topInsight.label}</span>
                  <p className="text-xs text-grappler-300 mt-0.5 leading-snug">{topInsight.text}</p>
                  {weeklyInsights.length > 1 && (
                    <p className="text-[10px] text-grappler-600 mt-1">+{weeklyInsights.length - 1} more insights ▾</p>
                  )}
                </div>
              </button>
            ),
          });

          // Expanded coaching — show all insights
          if (weeklyCoachingExpanded) {
            intelItems.push({
              key: 'coaching-expanded',
              priority: 2.5,
              content: (
                <CardErrorBoundary fallbackLabel="Weekly Coaching">
                  <div className="card p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4 text-primary-400" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-grappler-200">Weekly Coaching</span>
                      </div>
                      <button onClick={() => setWeeklyCoachingExpanded(false)} className="text-xs text-grappler-600">▴</button>
                    </div>
                    {weeklyInsights.slice(1).map((insight, i) => {
                      const INSIGHT_BG: Record<string, string> = {
                        gold: 'bg-yellow-500/8 border-yellow-500/20', green: 'bg-green-500/8 border-green-500/20',
                        red: 'bg-red-500/8 border-red-500/20', amber: 'bg-amber-500/8 border-amber-500/20',
                        blue: 'bg-blue-500/8 border-blue-500/20', purple: 'bg-purple-500/8 border-purple-500/20',
                        primary: 'bg-primary-500/10 border-primary-500/25',
                      };
                      return (
                        <div key={i} className={cn('rounded-xl px-3 py-2 border', INSIGHT_BG[insight.color] || INSIGHT_BG.primary)}>
                          <div className="flex items-start gap-2.5">
                            <span className="mt-0.5 flex-shrink-0">{INTEL_ICONS[insight.icon]}</span>
                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-grappler-400">{insight.label}</span>
                              <p className={cn('text-xs leading-relaxed mt-0.5', insight.type === 'one_thing' ? 'text-grappler-200 font-medium' : 'text-grappler-300')}>
                                {insight.text}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardErrorBoundary>
              ),
            });
          }
        }

        // P2.5: Yesterday recap — continuity between sessions
        if (yesterdayWorkouts.length > 0 && !directive.todayPerformance) {
          const ydayVolume = yesterdayWorkouts.reduce((s, l) => s + (l.totalVolume || 0), 0);
          const ydayPRs = yesterdayWorkouts.reduce((s, l) => s + (l.exercises?.filter(e => e.personalRecord).length || 0), 0);
          intelItems.push({
            key: 'yesterday-recap',
            priority: 3,
            content: (
              <div className="card px-3 py-2.5 border-l-2 border-l-blue-400 flex items-center gap-2.5">
                <Activity className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <p className="text-xs text-grappler-300">
                  <span className="font-medium text-blue-300">Yesterday:</span>{' '}
                  {formatNumber(ydayVolume)} {weightUnit}
                  {ydayPRs > 0 && <span className="text-yellow-400"> · {ydayPRs} PR{ydayPRs > 1 ? 's' : ''}</span>}
                  {yesterdayProtein > 0 && <span className="text-grappler-500"> · {Math.round(yesterdayProtein)}g protein</span>}
                </p>
              </div>
            ),
          });
        }

        // P3: Narrative one-liner
        if (narrative.hasData && workoutLogs.length >= 6 && narrative.highlights.length > 0) {
          const topHighlight = narrative.highlights[0];
          intelItems.push({
            key: 'narrative',
            priority: 6,
            content: (
              <div className="card px-3 py-2.5 border-l-2 border-l-emerald-400 flex items-center gap-2.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <p className="text-xs text-grappler-300">
                  <span className="font-bold text-emerald-400">{topHighlight.stat || topHighlight.label}</span>{' '}
                  {topHighlight.label || narrative.summary?.slice(0, 80)}
                </p>
              </div>
            ),
          });
        }

        // P4: Old feed cards (deload, meal reminder, etc.)
        const visibleFeedCards = feedCards.filter(card => !dismissedCards.has((card as React.ReactElement).key as string));
        visibleFeedCards.forEach((card, i) => {
          intelItems.push({
            key: `feed-${(card as React.ReactElement).key || i}`,
            priority: 4 + i * 0.1,
            content: card,
          });
        });

        // Sort by priority and take top 5
        const sorted = intelItems.sort((a, b) => a.priority - b.priority).slice(0, 6);

        return sorted.length > 0 ? (
          <div className="space-y-1.5">
            {sorted.map(item => (
              <div key={item.key}>{item.content}</div>
            ))}
          </div>
        ) : workoutLogs.length > 0 ? (
          <div className="flex items-center gap-3 card p-3">
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <p className="text-xs text-grappler-400">All clear — nothing needs your attention.</p>
          </div>
        ) : null;
      })()}




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
