'use client';

import { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import type { MealEntry, SkipReason } from '@/lib/types';
import { getIllnessTrainingRecommendation, getIllnessDurationDays } from '@/lib/illness-engine';
import { shouldDeload } from '@/lib/auto-adjust';
import { useSession } from 'next-auth/react';
import CardErrorBoundary from './CardErrorBoundary';
import { generateQuickWorkout } from '@/lib/workout-generator';
import { levelProgress, pointsToNextLevel } from '@/lib/gamification';
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
import type { OverlayView } from './dashboard-types';

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

  const levelColors: Record<string, string> = {
    peak: 'text-green-400 bg-green-500/10 border-green-500/30',
    good: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    moderate: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    low: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    critical: 'text-red-400 bg-red-500/10 border-red-500/30',
  };

  const levelLabels: Record<string, string> = {
    peak: 'Peak Readiness',
    good: 'Good to Train',
    moderate: 'Moderate — Adjust Load',
    low: 'Low — Reduce Intensity',
    critical: 'Rest Recommended',
  };

  return (
    <div className={cn('rounded-xl p-3 mb-3 border', levelColors[summary.level] || levelColors.moderate)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" />
          <span className="text-xs font-medium">Readiness</span>
        </div>
        <span className="text-lg font-bold">{summary.score}/100</span>
      </div>
      <p className="text-xs opacity-80 mb-2">{levelLabels[summary.level]}</p>
      {summary.topFactors.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {summary.topFactors.map(f => (
            <span key={f.label} className="text-xs bg-black/20 px-1.5 py-0.5 rounded">
              {f.label}: {f.score}/100
            </span>
          ))}
        </div>
      )}
      {summary.topRecommendation && (
        <p className="text-xs opacity-70 mt-1.5">{summary.topRecommendation}</p>
      )}
      {summary.volumeModifier !== 1.0 && (
        <p className="text-xs mt-1 opacity-60">
          Auto-adjusting: volume {Math.round(summary.volumeModifier * 100)}%, intensity {Math.round(summary.intensityModifier * 100)}%
          <span className="opacity-70"> — based on readiness score</span>
        </p>
      )}
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
    trainingSessions, latestWhoopData, meals,
    migrateWorkoutLogsToMesocycle, getCurrentMesocycleLogCount,
    skipWorkout, gamificationStats, mesocycleQueue, completeMesocycle,
  } = useAppStore();
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
  const todayProtein = todayMeals.reduce((sum, m) => sum + (m.protein || 0), 0);
  const recoveryScore = latestWhoopData?.recoveryScore;
  const strain = latestWhoopData?.strain;
  const sleepHours = latestWhoopData?.sleepHours;

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
    startOfThisWeek.setDate(now.getDate() - now.getDay());
    startOfThisWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const startOfThisYear = new Date(now.getFullYear(), 0, 1);
    const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
    const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);

    const includeOtherSessions = user?.trainingIdentity === 'combat' || user?.trainingIdentity === 'general_fitness';

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
  }, [workoutLogs, trainingSessions, user?.trainingIdentity]);

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

    const currentLogCount = state.getCurrentMesocycleLogCount();
    if (currentLogCount > 0) {
      setPreviousMesocycleId(activeMesocycle.id);
      setShowMigrateDialog(true);
    } else {
      completeMesocycle();
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

    setShowMigrateDialog(false);
    setPreviousMesocycleId(null);
  };

  // ─── Contextual Feed: priority-ranked, max 4 cards ───
  const feedCards: React.ReactNode[] = [];

  // 1. Illness banner (highest priority)
  const activeIllness = getActiveIllness();
  if (activeIllness) {
    const illnessRec = getIllnessTrainingRecommendation(activeIllness);
    const daysSick = getIllnessDurationDays(activeIllness);
    feedCards.push(
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

  // 2. Meal reminder
  if (feedCards.length < 4) {
    feedCards.push(<MealReminderBanner key="meal" meals={todayMeals} onNavigate={onNavigate} />);
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

  // 4. Training load warning (combat athletes)
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

  // 5. Smart Deload (replaces crude deload check)
  if (deloadRec.needed && feedCards.length < 4) {
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
    feedCards.push(
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
  }

  // 6. Rest day tip
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

  // 8. Injury alerts
  if (injuryInsights.alerts.length > 0 && feedCards.length < 5) {
    feedCards.push(
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

  // 9. Cycle phase card (female athletes)
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

  return (
    <div className="space-y-4">
      {/* ─── Post-Workout Summary (ephemeral) ─── */}
      <AnimatePresence>
        {lastCompletedWorkout && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/30 rounded-2xl p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="font-bold text-green-300 text-sm">Workout Complete!</h3>
                  <p className="text-xs text-green-400/70">+{lastCompletedWorkout.points} XP earned</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleShareWorkout}
                  className="text-green-400 hover:text-green-300 p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-colors"
                  title="Share workout">
                  {shareCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                </button>
                <button onClick={dismissWorkoutSummary}
                  className="text-grappler-500 hover:text-grappler-300 text-xs px-2 py-1">
                  Dismiss
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-lg font-bold text-grappler-100">{lastCompletedWorkout.log.exercises.length}</p>
                <p className="text-xs text-grappler-400">Exercises</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-grappler-100">{formatNumber(lastCompletedWorkout.log.totalVolume)}</p>
                <p className="text-xs text-grappler-400">Vol ({weightUnit})</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-grappler-100">{lastCompletedWorkout.log.duration}m</p>
                <p className="text-xs text-grappler-400">Duration</p>
              </div>
            </div>
            {lastCompletedWorkout.hadPR && (
              <div className="mt-3 flex items-center gap-2 bg-yellow-500/10 rounded-lg px-3 py-2">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-medium text-yellow-300">New Personal Record!</span>
              </div>
            )}
            {lastCompletedWorkout.newBadges && lastCompletedWorkout.newBadges.length > 0 && (
              <div className="mt-3 space-y-2">
                {lastCompletedWorkout.newBadges.map((badge) => (
                  <motion.div key={badge.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 bg-purple-500/10 rounded-lg px-3 py-2">
                    <span className="text-lg">{badge.icon}</span>
                    <div className="flex-1">
                      <span className="text-xs font-medium text-purple-300">{badge.name}</span>
                      <span className="text-xs text-purple-400/70 ml-2">+{badge.points} XP</span>
                    </div>
                    <Award className="w-4 h-4 text-purple-400" />
                  </motion.div>
                ))}
              </div>
            )}
            {postWorkoutCoaching && (
              <div className="mt-3 flex items-start gap-2 bg-grappler-800/40 rounded-lg px-3 py-2">
                <Brain className="w-3.5 h-3.5 text-primary-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-grappler-300 leading-relaxed">{postWorkoutCoaching}</p>
              </div>
            )}
            {postWorkoutNutritionNudge && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className={cn(
                  'mt-2 flex items-start gap-2 rounded-lg px-3 py-2',
                  postWorkoutNutritionNudge.urgent
                    ? 'bg-orange-500/15 border border-orange-500/30'
                    : 'bg-green-500/10 border border-green-500/20'
                )}
              >
                <Apple className={cn('w-3.5 h-3.5 flex-shrink-0 mt-0.5',
                  postWorkoutNutritionNudge.urgent ? 'text-orange-400' : 'text-green-400'
                )} />
                <p className={cn('text-xs leading-relaxed',
                  postWorkoutNutritionNudge.urgent ? 'text-orange-300' : 'text-green-300'
                )}>
                  {postWorkoutNutritionNudge.text}
                </p>
              </motion.div>
            )}
            {sessionContext && sessionContext.contextLines.length > 0 && (
              <div className="mt-2 space-y-1">
                {sessionContext.contextLines.slice(0, 2).map((line, i) => (
                  <div key={i} className="flex items-start gap-2 px-3">
                    <Sparkles className="w-3 h-3 text-grappler-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-grappler-400">{line}</p>
                  </div>
                ))}
              </div>
            )}
            {variableReward && variableReward.type !== 'none' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, duration: 0.4, ease: 'easeOut' }}
                className={cn('mt-3 rounded-lg px-3 py-2.5 border', {
                  'bg-blue-500/10 border-blue-500/30': variableReward.rarity === 'common',
                  'bg-purple-500/10 border-purple-500/30': variableReward.rarity === 'uncommon',
                  'bg-yellow-500/10 border-yellow-500/30': variableReward.rarity === 'rare',
                  'bg-gradient-to-r from-blue-500/15 to-pink-500/15 border-blue-500/30': variableReward.rarity === 'epic',
                })}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className={cn('w-4 h-4', {
                      'text-blue-400': variableReward.rarity === 'common',
                      'text-purple-400': variableReward.rarity === 'uncommon',
                      'text-yellow-400': variableReward.rarity === 'rare',
                      'text-cyan-400': variableReward.rarity === 'epic',
                    })} />
                    <div>
                      <p className="text-xs font-bold text-grappler-100">{variableReward.title}</p>
                      <p className="text-xs text-grappler-400">{variableReward.description}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-primary-400">+{variableReward.bonusPoints} XP</span>
                </div>
              </motion.div>
            )}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-grappler-300">{lastCompletedWorkout.newStreak} day streak</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-grappler-500">Lv.{gamificationStats.level}</span>
                <div className="w-16 h-1.5 bg-grappler-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${levelProgress(gamificationStats.totalPoints)}%` }}
                    transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-xs text-grappler-500">{pointsToNextLevel(gamificationStats.totalPoints)} to go</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Daily Directive — your single mission for today ─── */}
      <CardErrorBoundary fallbackLabel="Daily Directive">
      {(() => {
        const levelBg: Record<string, string> = {
          peak: 'from-green-500/15 to-emerald-500/10 border-green-500/30',
          good: 'from-blue-500/15 to-cyan-500/10 border-blue-500/30',
          moderate: 'from-yellow-500/15 to-blue-500/10 border-yellow-500/30',
          low: 'from-blue-500/15 to-red-500/10 border-blue-500/30',
          critical: 'from-red-500/15 to-rose-500/10 border-red-500/30',
        };
        const levelIcon: Record<string, string> = {
          peak: 'text-green-400',
          good: 'text-blue-400',
          moderate: 'text-yellow-400',
          low: 'text-blue-400',
          critical: 'text-red-400',
        };
        const bg = levelBg[directive.readinessLevel] || levelBg.moderate;
        const ic = levelIcon[directive.readinessLevel] || levelIcon.moderate;
        return (
          <div className={cn('rounded-xl p-4 border bg-gradient-to-r', bg)}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className={cn('w-4 h-4', ic)} />
                  {directive.sessionLabel && (
                    <span className="text-xs font-bold uppercase tracking-wider text-grappler-400">
                      {directive.sessionLabel}
                    </span>
                  )}
                  {directive.isDeload && (
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Deload</span>
                  )}
                  {directive.fightCampTag && (
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400">
                      {directive.fightCampTag}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-black text-grappler-100 leading-tight">{directive.headline}</h2>
                <p className="text-xs text-grappler-400 mt-1 leading-relaxed">{directive.subline}</p>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <p className={cn('text-2xl font-black', ic)}>{directive.readinessScore}</p>
                <p className="text-xs text-grappler-500">Readiness</p>
                <p className="text-xs text-grappler-600 mt-0.5">
                  {recoveryScore != null ? 'sleep + strain + nutrition' : 'training load + recovery'}
                </p>
              </div>
            </div>
            {directive.actions.length > 0 && (
              <div className="mt-2 space-y-1">
                {directive.actions.map((action, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Target className="w-3 h-3 text-grappler-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-grappler-300">{action}</p>
                  </div>
                ))}
              </div>
            )}
            {directive.modifierText && (
              <p className="text-xs text-grappler-500 mt-2 italic">{directive.modifierText}</p>
            )}
          </div>
        );
      })()}
      </CardErrorBoundary>

      {/* ─── HERO: Start Next Workout ─── */}
      {nextWorkout ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <button
            onClick={() => startWorkout(nextWorkout)}
            className="w-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl p-5 text-left active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/70 font-medium uppercase tracking-wide">
                  {nextWorkoutInfo ? `Week ${nextWorkoutInfo.weekNumber}${nextWorkoutInfo.isDeload ? ' · Deload' : ''}` : 'Next Workout'}
                </p>
                <h2 className="text-xl font-black text-white mt-1">{nextWorkout.name}</h2>
                <div className="flex items-center gap-3 mt-2 text-sm text-white/80">
                  <span className="flex items-center gap-1">
                    <Dumbbell className="w-3.5 h-3.5" />
                    {nextWorkout.exercises.length} exercises
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    ~{nextWorkout.estimatedDuration}m
                  </span>
                </div>
                {mesocycleProgress && (
                  <div className="flex items-center gap-2 mt-2.5">
                    <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white/60 rounded-full"
                        style={{ width: `${mesocycleProgress.percent}%` }}
                      />
                    </div>
                    <span className="text-xs text-white/60">{mesocycleProgress.completed}/{mesocycleProgress.total}</span>
                  </div>
                )}
              </div>
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <Play className="w-7 h-7 text-white" />
              </div>
            </div>
          </button>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleQuickWorkout}
              className="flex items-center gap-1.5 py-2 text-xs text-grappler-500 hover:text-grappler-300 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              Quick 30m
            </button>
            <span className="text-grappler-700">·</span>
            <button
              onClick={() => setShowSkipDialog(true)}
              className="flex items-center gap-1.5 py-2 text-xs text-grappler-500 hover:text-grappler-300 transition-colors"
            >
              <SkipForward className="w-3.5 h-3.5" />
              Skip
            </button>
            <span className="text-grappler-700">·</span>
            <button
              onClick={() => setShowValidateConfirm(true)}
              className="flex items-center gap-1.5 py-2 text-xs text-grappler-500 hover:text-green-400 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Validate Block
            </button>
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
                    <button
                      onClick={() => setShowValidateConfirm(false)}
                      className="btn btn-sm bg-grappler-700 text-grappler-300 hover:bg-grappler-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleValidateBlock}
                      className="btn btn-sm bg-green-600 text-white hover:bg-green-500 gap-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Validate
                    </button>
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

        {showReadiness && <ReadinessCard />}

        {/* Performance Readiness — nutrition-focused composite score */}
        <PerformanceReadiness />

        {/* Activity row — adaptive to training identity */}
        <div className="grid grid-cols-3 gap-2">
          {user?.trainingIdentity === 'combat' || user?.trainingIdentity === 'general_fitness' ? (
            <button
              onClick={() => onNavigate('grappling')}
              className="flex flex-col items-center gap-1 p-2 rounded-xl bg-grappler-800/60 hover:bg-grappler-700/60 transition-colors"
            >
              <Shield className="w-4 h-4 text-lime-400" />
              <span className="text-lg font-bold text-grappler-100">{todayTraining.length}</span>
              <span className="text-xs text-grappler-500">{user?.trainingIdentity === 'combat' ? 'Grappling' : 'Training'}</span>
            </button>
          ) : (
            <button
              onClick={() => currentMesocycle && nextWorkout ? startWorkout(nextWorkout) : onNavigate('builder')}
              className="flex flex-col items-center gap-1 p-2 rounded-xl bg-grappler-800/60 hover:bg-grappler-700/60 transition-colors"
            >
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-lg font-bold text-grappler-100">{formatNumber(todayWorkouts.reduce((s, l) => s + l.totalVolume, 0))}</span>
              <span className="text-xs text-grappler-500">Volume ({weightUnit})</span>
            </button>
          )}
          <button
            onClick={() => currentMesocycle && nextWorkout ? startWorkout(nextWorkout) : onNavigate('builder')}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-grappler-800/60 hover:bg-grappler-700/60 transition-colors"
          >
            <Dumbbell className="w-4 h-4 text-primary-400" />
            <span className="text-lg font-bold text-grappler-100">{todayWorkouts.length}</span>
            <span className="text-xs text-grappler-500">Lifting</span>
          </button>
          <button
            onClick={() => onNavigate('nutrition')}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-grappler-800/60 hover:bg-grappler-700/60 transition-colors"
          >
            <Apple className="w-4 h-4 text-red-400" />
            <span className="text-lg font-bold text-grappler-100">{todayProtein}g</span>
            <span className="text-xs text-grappler-500">Protein</span>
            {macroTargets.protein > 0 && (
              <span className="text-xs text-grappler-600">
                {Math.round((todayProtein / macroTargets.protein) * 100)}% of goal
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ─── Contextual Feed (max 4, priority-ranked) ─── */}
      {feedCards.length > 0 ? (
        <div className="space-y-3">
          {feedCards}
        </div>
      ) : workoutLogs.length > 0 && (
        <div className="flex items-center gap-3 card p-3">
          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <p className="text-xs text-grappler-400">All clear — nothing needs your attention right now.</p>
        </div>
      )}

      {/* ─── Weekly Synthesis — coaching narrative ─── */}
      <CardErrorBoundary fallbackLabel="Weekly Coaching">
      {showWeeklySynthesis && synthesis.hasData && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <Brain className="w-4 h-4 text-primary-400" />
            <span className="text-xs font-semibold text-grappler-200 uppercase tracking-wide">Weekly Coaching</span>
          </div>
          <p className="text-sm text-grappler-300 leading-relaxed">{synthesis.narrative}</p>
          <div className="grid grid-cols-4 gap-2 mt-3 text-center">
            <div>
              <p className="text-lg font-bold text-primary-400">{synthesis.stats.workouts}</p>
              <p className="text-xs text-grappler-500">Sessions</p>
              <p className="text-xs text-grappler-600">last 7d</p>
            </div>
            <div>
              <p className="text-lg font-bold text-yellow-400">{synthesis.stats.prs}</p>
              <p className="text-xs text-grappler-500">PRs</p>
              <p className="text-xs text-grappler-600">new bests</p>
            </div>
            <div>
              <p className="text-lg font-bold text-grappler-100">{synthesis.stats.avgRPE || '—'}</p>
              <p className="text-xs text-grappler-500">Avg RPE</p>
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
        </div>
      )}

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
                  { reason: 'illness' as SkipReason, label: 'Feeling sick', icon: Thermometer, color: 'text-rose-400 bg-rose-500/10' },
                  { reason: 'mental_health' as SkipReason, label: 'Mental health day', icon: Brain, color: 'text-emerald-400 bg-emerald-500/10' },
                  { reason: 'travel' as SkipReason, label: 'Traveling / no gym', icon: Target, color: 'text-cyan-400 bg-cyan-500/10' },
                ]).map(({ reason, label, icon: Icon, color }) => (
                  <button
                    key={reason}
                    onClick={() => {
                      skipWorkout({
                        date: new Date().toISOString().split('T')[0],
                        scheduledSessionId: nextWorkout.id,
                        reason,
                        rescheduled: false,
                      });
                      setShowSkipDialog(false);
                      if (reason === 'illness') {
                        onNavigate('illness');
                      }
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
