'use client';

import { useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import {
  Dumbbell,
  Calendar,
  Trophy,
  BarChart3,
  BookOpen,
  User,
  Play,
  ChevronRight,
  Flame,
  Target,
  Zap,
  Star,
  TrendingUp,
  Clock,
  AlertTriangle,
  Download,
  FileJson,
  FileSpreadsheet,
  History,
  Brain,
  Activity,
  Apple,
  Leaf,
  Crosshair,
  Scaling,
  HeartPulse,
  Siren,
  Calculator,
  ListPlus,
  Layers,
  LayoutGrid,
  Sun,
  Moon,
  Shield,
  Share2,
  Copy,
  Check,
  Users,
  CalendarDays,
  Plus,
  X,
  Scale,
  RefreshCw,
  Sparkles,
  Grip,
  Watch,
  ClipboardCheck,
  Award,
} from 'lucide-react';
import { cn, formatNumber, formatDate } from '@/lib/utils';
import type { WorkoutLog, MealEntry } from '@/lib/types';
import { getExerciseById } from '@/lib/exercises';
import SyncConflictResolver from './SyncConflictResolver';
import { getMotivationalMessage, getLevelTitle, levelProgress, pointsToNextLevel } from '@/lib/gamification';
import { shouldDeload } from '@/lib/auto-adjust';
import { generateQuickWorkout } from '@/lib/workout-generator';
import { getTodayRecommendation } from '@/lib/smart-schedule';
import { exportToCSV, exportToJSON, downloadFile, exportFullBackup, importFullBackup, readFileAsText } from '@/lib/data-export';
// Core tabs — always loaded
import WorkoutView from './WorkoutView';
import ProgressCharts from './ProgressCharts';
import KnowledgeHub from './KnowledgeHub';
import ProfileSettings from './ProfileSettings';
import ActiveWorkout from './ActiveWorkout';
import WorkoutHistory from './WorkoutHistory';
import TrainingCalendar from './TrainingCalendar';
import ThemeToggle from './ThemeToggle';

// Overlay components — lazy-loaded (only when opened)
function OverlaySkeleton() {
  return (
    <div className="min-h-screen bg-grappler-950 animate-pulse">
      <div className="sticky top-0 z-10 bg-grappler-950/95 border-b border-grappler-800 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-grappler-800" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-40 bg-grappler-800 rounded" />
          <div className="h-3 w-56 bg-grappler-800/60 rounded" />
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div className="h-32 bg-grappler-800/50 rounded-xl" />
        <div className="h-24 bg-grappler-800/50 rounded-xl" />
        <div className="h-24 bg-grappler-800/50 rounded-xl" />
      </div>
    </div>
  );
}

const BodyWeightTracker = dynamic(() => import('./BodyWeightTracker'), { loading: () => <OverlaySkeleton /> });
const WorkoutBuilder = dynamic(() => import('./WorkoutBuilder'), { loading: () => <OverlaySkeleton /> });
const NutritionTracker = dynamic(() => import('./NutritionTracker'), { loading: () => <OverlaySkeleton /> });
const WearableIntegration = dynamic(() => import('./WearableIntegration'), { loading: () => <OverlaySkeleton /> });
const CompetitionPrep = dynamic(() => import('./CompetitionPrep'), { loading: () => <OverlaySkeleton /> });
const MobilityWorkouts = dynamic(() => import('./MobilityWorkouts'), { loading: () => <OverlaySkeleton /> });
const WeeklyCoach = dynamic(() => import('./WeeklyCoach'), { loading: () => <OverlaySkeleton /> });
const ExerciseProfiler = dynamic(() => import('./ExerciseProfiler'), { loading: () => <OverlaySkeleton /> });
const StrengthAnalysis = dynamic(() => import('./StrengthAnalysis'), { loading: () => <OverlaySkeleton /> });
const PeriodizationCalendar = dynamic(() => import('./PeriodizationCalendar'), { loading: () => <OverlaySkeleton /> });
const RecoveryDashboard = dynamic(() => import('./RecoveryDashboard'), { loading: () => <OverlaySkeleton /> });
const InjuryLogger = dynamic(() => import('./InjuryLogger'), { loading: () => <OverlaySkeleton /> });
const ProgressiveOverload = dynamic(() => import('./ProgressiveOverload'), { loading: () => <OverlaySkeleton /> });
const CustomExerciseCreator = dynamic(() => import('./CustomExerciseCreator'), { loading: () => <OverlaySkeleton /> });
const OneRepMaxCalc = dynamic(() => import('./OneRepMaxCalc'), { loading: () => <OverlaySkeleton /> });
const HRZoneTraining = dynamic(() => import('./HRZoneTraining'), { loading: () => <OverlaySkeleton /> });
const SessionTemplates = dynamic(() => import('./SessionTemplates'), { loading: () => <OverlaySkeleton /> });
const VolumeHeatMap = dynamic(() => import('./VolumeHeatMap'), { loading: () => <OverlaySkeleton /> });
const GrapplingTracker = dynamic(() => import('./GrapplingTracker'), { loading: () => <OverlaySkeleton /> });
const CommunityShare = dynamic(() => import('./CommunityShare'), { loading: () => <OverlaySkeleton /> });
const MesocycleReportView = dynamic(() => import('./MesocycleReport'), { loading: () => <OverlaySkeleton /> });
const QuickActions = dynamic(() => import('./QuickActions'), { loading: () => <OverlaySkeleton /> });
const GripStrengthModule = dynamic(() => import('./GripStrengthModule'), { loading: () => <OverlaySkeleton /> });
const RecoveryCoach = dynamic(() => import('./RecoveryCoach'), { loading: () => <OverlaySkeleton /> });

type TabType = 'home' | 'program' | 'progress' | 'history' | 'learn' | 'profile';
type OverlayView = 'builder' | 'nutrition' | 'wearable' | 'competition' | 'mobility' | 'coach' | 'profiler' | 'strength' | 'periodization' | 'recovery' | 'injury' | 'overload' | 'custom_exercise' | 'one_rm' | 'hr_zones' | 'templates' | 'volume_map' | 'grappling' | 'community_share' | 'quick_actions' | 'grip_strength' | 'recovery_coach' | null;

function StreakHeatmap({ workoutLogs, onDayClick }: { workoutLogs: WorkoutLog[]; onDayClick?: (date: Date) => void }) {
  const trainingSessions = useAppStore(s => s.trainingSessions);
  const user = useAppStore(s => s.user);
  const weeks = 12;

  // Use toDateString() for comparison - avoids all timezone issues
  // "Mon Jan 15 2024" format is unambiguous and based on local time
  const toDateKey = (d: Date | string): string => {
    if (typeof d === 'string') {
      return new Date(d).toDateString();
    }
    return d.toDateString();
  };

  // Memoize today to avoid recreating on each render
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0); // Noon to avoid any edge cases
    return d;
  }, []);
  const todayKey = today.toDateString();

  // Build sets for lifting dates using toDateString keys
  const liftingDateKeys = useMemo(() => {
    const keys = new Set<string>();
    if (!workoutLogs || workoutLogs.length === 0) return keys;

    workoutLogs.forEach(log => {
      if (log.date) {
        keys.add(toDateKey(log.date));
      }
    });
    return keys;
  }, [workoutLogs]);

  // Include training sessions if user does combat/general fitness
  const includeOtherSessions = user && (user.trainingIdentity === 'combat' || user.trainingIdentity === 'general_fitness');

  const sessionDateKeys = useMemo(() => {
    const keys = new Set<string>();
    if (!includeOtherSessions || !trainingSessions) return keys;

    trainingSessions.forEach(s => {
      if (s.date) {
        keys.add(toDateKey(s.date));
      }
    });
    return keys;
  }, [trainingSessions, includeOtherSessions]);

  // Calculate streak by walking backwards from today
  const calculateStreak = useCallback((dateKeys: Set<string>) => {
    if (dateKeys.size === 0) return 0;

    // Check if today or yesterday has activity
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toDateString();

    const hasToday = dateKeys.has(todayKey);
    const hasYesterday = dateKeys.has(yesterdayKey);

    if (!hasToday && !hasYesterday) return 0;

    // Start counting from today or yesterday
    let streak = 0;
    const checkDate = new Date(today);

    // If no activity today, start from yesterday
    if (!hasToday) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Walk backwards counting consecutive days
    while (dateKeys.has(checkDate.toDateString())) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
  }, [today, todayKey]);

  const liftingStreak = calculateStreak(liftingDateKeys);
  const trainingStreak = includeOtherSessions ? calculateStreak(sessionDateKeys) : 0;

  // Generate grid: 12 weeks x 7 days
  type DayData = {
    date: Date;
    dateKey: string;
    hasLifting: boolean;
    hasSession: boolean;
    isToday: boolean;
    isFuture: boolean;
  };

  const grid = useMemo(() => {
    const result: DayData[][] = [];

    // Start from the Sunday of (weeks) weeks ago
    const startDate = new Date(today);
    startDate.setHours(0, 0, 0, 0);
    // Go back to start of current week (Sunday), then back (weeks-1) more weeks
    const daysFromSunday = startDate.getDay(); // 0=Sun, 1=Mon, etc.
    startDate.setDate(startDate.getDate() - daysFromSunday - (weeks - 1) * 7);

    for (let w = 0; w < weeks; w++) {
      const week: DayData[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + w * 7 + d);
        const dateKey = date.toDateString();
        const isFuture = date.getTime() > today.getTime();

        week.push({
          date,
          dateKey,
          hasLifting: liftingDateKeys.has(dateKey),
          hasSession: sessionDateKeys.has(dateKey),
          isToday: dateKey === todayKey,
          isFuture,
        });
      }
      result.push(week);
    }
    return result;
  }, [today, liftingDateKeys, sessionDateKeys, todayKey]);

  // Get day color based on activity type
  const getDayColor = (day: DayData) => {
    if (day.isFuture) return 'bg-grappler-800/30';
    if (day.hasLifting && day.hasSession) return 'bg-gradient-to-br from-green-500 to-blue-500'; // Both
    if (day.hasLifting) return 'bg-green-500'; // Lifting only
    if (day.hasSession) return 'bg-blue-500'; // Session only (grappling/cardio)
    return 'bg-grappler-700/40'; // No activity
  };

  const getDayTitle = (day: DayData) => {
    const dateStr = day.date.toLocaleDateString();
    if (day.hasLifting && day.hasSession) return `${dateStr} — lifting + training`;
    if (day.hasLifting) return `${dateStr} — lifting`;
    if (day.hasSession) return `${dateStr} — training`;
    return dateStr;
  };

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-grappler-200 uppercase tracking-wide flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" />
          Training Streaks
        </h3>
        <div className="flex items-center gap-3">
          {/* Lifting streak */}
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-green-500" />
            <span className="text-lg font-black text-green-400">{liftingStreak}</span>
          </div>
          {/* Training streak (only show if user does combat/fitness) */}
          {includeOtherSessions && (
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
              <span className="text-lg font-black text-blue-400">{trainingStreak}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-[3px]">
        {grid.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day, di) => {
              const canClick = onDayClick && !day.isFuture;
              return (
                <div
                  key={di}
                  onClick={() => canClick && onDayClick(day.date)}
                  className={cn(
                    'w-3 h-3 rounded-sm transition-colors',
                    getDayColor(day),
                    day.isToday && 'ring-1 ring-primary-400',
                    canClick && 'cursor-pointer hover:ring-1 hover:ring-white/40'
                  )}
                  title={getDayTitle(day)}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-grappler-500">{weeks * 7} days</span>
        {includeOtherSessions ? (
          <div className="flex items-center gap-2 text-xs text-grappler-500">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-green-500" />
              <span>Lifting</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
              <span>Training</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-grappler-500">
            <span>Less</span>
            <div className="w-2.5 h-2.5 rounded-sm bg-grappler-700/40" />
            <div className="w-2.5 h-2.5 rounded-sm bg-green-500/40" />
            <div className="w-2.5 h-2.5 rounded-sm bg-green-500/70" />
            <div className="w-2.5 h-2.5 rounded-sm bg-green-500" />
            <span>More</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [overlayView, setOverlayView] = useState<OverlayView>(null);
  const [reportMesocycleId, setReportMesocycleId] = useState<string | null>(null);
  const [fabOpen, setFabOpen] = useState(false);
  // Use individual selectors to avoid full re-renders when unrelated state changes
  const user = useAppStore(s => s.user);
  const gamificationStats = useAppStore(s => s.gamificationStats);
  const currentMesocycle = useAppStore(s => s.currentMesocycle);
  const activeWorkout = useAppStore(s => s.activeWorkout);
  const workoutLogs = useAppStore(s => s.workoutLogs);
  const mesocycleHistory = useAppStore(s => s.mesocycleHistory);
  const deleteMesocycle = useAppStore(s => s.deleteMesocycle);
  const syncConflict = useAppStore(s => s.syncConflict);
  const resolveSyncConflict = useAppStore(s => s.resolveSyncConflict);
  const dismissSyncConflict = useAppStore(s => s.dismissSyncConflict);

  if (activeWorkout) {
    return <ActiveWorkout />;
  }

  // Full-screen overlay views
  if (overlayView === 'builder') {
    return <WorkoutBuilder onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'nutrition') {
    return <NutritionTracker onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'wearable') {
    return <WearableIntegration onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'competition') {
    return <CompetitionPrep onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'mobility') {
    return <MobilityWorkouts onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'coach') {
    return <WeeklyCoach onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'profiler') {
    return <ExerciseProfiler onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'strength') {
    return <StrengthAnalysis onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'periodization') {
    return <PeriodizationCalendar onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'recovery') {
    return <RecoveryDashboard onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'injury') {
    return <InjuryLogger onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'overload') {
    return <ProgressiveOverload onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'custom_exercise') {
    return <CustomExerciseCreator onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'one_rm') {
    return <OneRepMaxCalc onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'hr_zones') {
    return <HRZoneTraining onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'templates') {
    return <SessionTemplates onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'volume_map') {
    return <VolumeHeatMap onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'grappling') {
    return <GrapplingTracker onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'community_share') {
    return <CommunityShare onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'quick_actions') {
    return <QuickActions onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'grip_strength') {
    return <GripStrengthModule onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'recovery_coach') {
    return <RecoveryCoach onClose={() => setOverlayView(null)} />;
  }

  // Mesocycle report overlay
  if (reportMesocycleId) {
    const allMesos = [...mesocycleHistory, ...(currentMesocycle ? [currentMesocycle] : [])];
    const targetMeso = allMesos.find(m => m.id === reportMesocycleId);
    if (targetMeso) {
      const targetIdx = allMesos.indexOf(targetMeso);
      const prevMeso = targetIdx > 0 ? allMesos[targetIdx - 1] : null;
      return (
        <MesocycleReportView
          mesocycle={targetMeso}
          workoutLogs={workoutLogs}
          previousMesocycle={prevMeso}
          weightUnit={user?.weightUnit || 'lbs'}
          onClose={() => setReportMesocycleId(null)}
          onDelete={(id) => { deleteMesocycle(id); setReportMesocycleId(null); }}
        />
      );
    }
  }

  return (
    <div className="min-h-screen bg-grappler-900 bg-mesh pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-grappler-900/80 backdrop-blur-xl border-b border-grappler-800">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-grappler-50">Roots Gains</h1>
              <p className="text-xs text-grappler-400">
                Level {gamificationStats.level} {getLevelTitle(gamificationStats.level)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="flex items-center gap-1 bg-grappler-800 px-3 py-1.5 rounded-full">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-grappler-200">
                {gamificationStats.currentStreak}
              </span>
            </div>
            <div className="flex items-center gap-1 bg-grappler-800 px-3 py-1.5 rounded-full">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-grappler-200">
                {formatNumber(gamificationStats.totalPoints)}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6">
        <AnimatePresence mode="popLayout">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <HomeTab onNavigate={setOverlayView} onViewReport={setReportMesocycleId} />
            </motion.div>
          )}
          {activeTab === 'program' && (
            <motion.div
              key="program"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <WorkoutView onOpenBuilder={() => setOverlayView('builder')} />
            </motion.div>
          )}
          {activeTab === 'progress' && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ProgressCharts onViewReport={setReportMesocycleId} />
            </motion.div>
          )}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <HistoryTab />
            </motion.div>
          )}
          {activeTab === 'learn' && (
            <motion.div
              key="learn"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <KnowledgeHub />
            </motion.div>
          )}
          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ProfileSettings />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Quick-Log FAB */}
      <div className="fixed bottom-20 right-4 z-50 flex flex-col-reverse items-end gap-2">
        <AnimatePresence>
          {fabOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setFabOpen(false)}
                className="fixed inset-0 bg-black/40 -z-10"
              />
              {/* FAB Options */}
              <motion.button
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                transition={{ delay: 0.05 }}
                onClick={() => { setFabOpen(false); setOverlayView('grappling'); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-lime-500 text-grappler-900 rounded-full shadow-lg font-medium text-sm"
              >
                <Shield className="w-4 h-4" />
                {user?.combatSport === 'striking' ? 'Log Striking' :
                 user?.combatSport === 'mma' ? 'Log MMA' :
                 user?.combatSport === 'grappling_nogi' ? 'Log No-Gi' :
                 'Log Training'}
              </motion.button>
              <motion.button
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                transition={{ delay: 0.1 }}
                onClick={() => { setFabOpen(false); setOverlayView('nutrition'); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-full shadow-lg font-medium text-sm"
              >
                <Apple className="w-4 h-4" />
                Log Meal
              </motion.button>
              <motion.button
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                transition={{ delay: 0.15 }}
                onClick={() => { setFabOpen(false); setActiveTab('history'); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 text-white rounded-full shadow-lg font-medium text-sm"
              >
                <Scale className="w-4 h-4" />
                Log Weight
              </motion.button>
              <motion.button
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                transition={{ delay: 0.2 }}
                onClick={() => { setFabOpen(false); setOverlayView('injury'); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-rose-500 text-white rounded-full shadow-lg font-medium text-sm"
              >
                <Siren className="w-4 h-4" />
                Log Injury
              </motion.button>
            </>
          )}
        </AnimatePresence>

        {/* FAB Button */}
        <motion.button
          onClick={() => setFabOpen(!fabOpen)}
          animate={{ rotate: fabOpen ? 45 : 0 }}
          aria-label={fabOpen ? 'Close quick log menu' : 'Open quick log menu'}
          className={cn(
            'w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-colors',
            fabOpen
              ? 'bg-grappler-700 text-grappler-300'
              : 'bg-gradient-to-br from-primary-500 to-accent-500 text-white'
          )}
        >
          {fabOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </motion.button>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-grappler-900/95 backdrop-blur-xl border-t border-grappler-800 safe-area-bottom">
        <div className="flex items-center justify-around py-2">
          {[
            { id: 'home', icon: Dumbbell, label: 'Home' },
            { id: 'program', icon: Calendar, label: 'Program' },
            { id: 'progress', icon: BarChart3, label: 'Progress' },
            { id: 'history', icon: History, label: 'History' },
            { id: 'learn', icon: BookOpen, label: 'Learn' },
            { id: 'profile', icon: User, label: 'Profile' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              aria-label={tab.label}
              aria-selected={activeTab === tab.id}
              role="tab"
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all',
                activeTab === tab.id
                  ? 'text-primary-400'
                  : 'text-grappler-500 hover:text-grappler-300'
              )}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 w-10 h-0.5 bg-primary-500 rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Sync Conflict Resolver */}
      {syncConflict && (
        <SyncConflictResolver
          conflict={syncConflict}
          onResolve={resolveSyncConflict}
          onDismiss={dismissSyncConflict}
        />
      )}
    </div>
  );
}

// History Tab - combines workout history, calendar, body weight, and data export/import
function HistoryTab() {
  const { workoutLogs, user } = useAppStore();
  const [historyView, setHistoryView] = useState<'log' | 'calendar' | 'weight'>('log');
  const [showExport, setShowExport] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmImport, setConfirmImport] = useState(false);
  const weightUnit = user?.weightUnit || 'lbs';

  const handleExportCSV = () => {
    const csv = exportToCSV(workoutLogs, weightUnit);
    const date = new Date().toISOString().split('T')[0];
    downloadFile(csv, `roots-gains-${date}.csv`, 'text/csv');
  };

  const handleExportJSON = () => {
    const json = exportToJSON(workoutLogs);
    const date = new Date().toISOString().split('T')[0];
    downloadFile(json, `roots-gains-${date}.json`, 'application/json');
  };

  const handleExportBackup = () => {
    const backup = exportFullBackup();
    const date = new Date().toISOString().split('T')[0];
    downloadFile(backup, `roots-gains-backup-${date}.json`, 'application/json');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file format and size
    if (!file.name.endsWith('.json')) {
      setImportStatus({ type: 'error', message: 'Only .json backup files are supported' });
      e.target.value = '';
      setTimeout(() => setImportStatus(null), 5000);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setImportStatus({ type: 'error', message: 'File too large (max 10MB)' });
      e.target.value = '';
      setTimeout(() => setImportStatus(null), 5000);
      return;
    }

    try {
      const text = await readFileAsText(file);
      // Validate it's parseable JSON before importing
      try { JSON.parse(text); } catch {
        setImportStatus({ type: 'error', message: 'File is not valid JSON' });
        e.target.value = '';
        setTimeout(() => setImportStatus(null), 5000);
        return;
      }
      const result = importFullBackup(text);

      if (result.success) {
        setImportStatus({
          type: 'success',
          message: `Restored ${result.stats?.workouts ?? 0} workouts, ${result.stats?.templates ?? 0} templates`
        });
      } else {
        setImportStatus({ type: 'error', message: result.error || 'Import failed' });
      }
    } catch {
      setImportStatus({ type: 'error', message: 'Could not read file' });
    }

    // Reset file input so the same file can be re-selected
    e.target.value = '';
    setConfirmImport(false);
    setTimeout(() => setImportStatus(null), 5000);
  };

  return (
    <div className="space-y-4">
      {/* Sub-navigation */}
      <div className="flex gap-2">
        {[
          { id: 'log', label: 'Workouts' },
          { id: 'calendar', label: 'Calendar' },
          { id: 'weight', label: 'Body Weight' }
        ].map((view) => (
          <button
            key={view.id}
            onClick={() => setHistoryView(view.id as typeof historyView)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              historyView === view.id
                ? 'bg-primary-500 text-white'
                : 'bg-grappler-800 text-grappler-400 hover:text-grappler-200'
            )}
          >
            {view.label}
          </button>
        ))}
        <button
          onClick={() => setShowExport(!showExport)}
          className="ml-auto p-2 rounded-lg bg-grappler-800 text-grappler-400 hover:text-grappler-200"
          title="Export / Import Data"
          aria-label="Export or import data"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Import status toast */}
      <AnimatePresence>
        {importStatus && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              'rounded-xl px-4 py-3 text-sm font-medium',
              importStatus.type === 'success'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            )}
          >
            {importStatus.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export / Import options */}
      <AnimatePresence>
        {showExport && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="card p-4 space-y-4">
              {/* Export section */}
              <div>
                <p className="text-sm text-grappler-300 mb-2 font-medium">Export workout logs</p>
                <div className="flex gap-3">
                  <button
                    onClick={handleExportCSV}
                    disabled={workoutLogs.length === 0}
                    className="btn btn-secondary btn-sm flex-1 gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    CSV
                  </button>
                  <button
                    onClick={handleExportJSON}
                    disabled={workoutLogs.length === 0}
                    className="btn btn-secondary btn-sm flex-1 gap-2"
                  >
                    <FileJson className="w-4 h-4" />
                    JSON
                  </button>
                </div>
                {workoutLogs.length === 0 && (
                  <p className="text-xs text-grappler-500 mt-2 text-center">Complete a workout first to export data</p>
                )}
              </div>

              {/* Full backup section */}
              <div className="border-t border-grappler-700 pt-4">
                <p className="text-sm text-grappler-300 mb-1 font-medium">Full backup</p>
                <p className="text-xs text-grappler-500 mb-3">Export everything — workouts, programs, templates, nutrition, settings. Use this to transfer data to another device or keep a backup.</p>
                <div className="flex gap-3">
                  <button
                    onClick={handleExportBackup}
                    className="btn btn-secondary btn-sm flex-1 gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Backup
                  </button>
                </div>
              </div>

              {/* Import section */}
              <div className="border-t border-grappler-700 pt-4">
                <p className="text-sm text-grappler-300 mb-1 font-medium">Restore from backup</p>
                <p className="text-xs text-grappler-500 mb-3">Import a backup file to restore your data. This will overwrite your current data.</p>
                {!confirmImport ? (
                  <button
                    onClick={() => setConfirmImport(true)}
                    className="btn btn-sm w-full gap-2 bg-grappler-700 text-grappler-200 hover:bg-grappler-600"
                  >
                    <FileJson className="w-4 h-4" />
                    Import Backup File
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
                      This will replace all your current data. Make sure to download a backup first.
                    </p>
                    <label className="btn btn-primary btn-sm w-full gap-2 cursor-pointer">
                      <FileJson className="w-4 h-4" />
                      Choose File
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportFile}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={() => setConfirmImport(false)}
                      className="btn btn-sm w-full bg-grappler-700 text-grappler-400 hover:bg-grappler-600"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {historyView === 'log' && <WorkoutHistory />}
      {historyView === 'calendar' && <TrainingCalendar />}
      {historyView === 'weight' && <BodyWeightTracker />}
    </div>
  );
}

// Rest day tips by training identity / sport
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

// Meal Reminder Banner — shows an in-app nudge when it's meal time and user hasn't logged
function MealReminderBanner({ meals, onNavigate }: { meals: MealEntry[]; onNavigate: (view: OverlayView) => void }) {
  const { mealReminders, activeDietPhase, macroTargets } = useAppStore();

  if (!mealReminders.enabled || !activeDietPhase) return null;

  const now = new Date();
  const hour = now.getHours();
  const currentMin = hour * 60 + now.getMinutes();

  // Find which meal slot we're in
  const slots = ['breakfast', 'lunch', 'dinner'] as const;
  let activeMeal: typeof slots[number] | null = null;

  for (const slot of slots) {
    if (!mealReminders.enabledMeals[slot]) continue;
    const [rH, rM] = mealReminders.reminderTimes[slot].split(':').map(Number);
    const reminderMin = rH * 60 + rM;
    // Show for 2 hours after reminder time
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
            <p className="text-[10px] text-grappler-400">
              {totalCal > 0
                ? `${totalCal} kcal logged | ~${Math.max(0, remaining)} remaining`
                : 'No meals logged yet today'}
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('nutrition')}
          className="px-3 py-1.5 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 text-[10px] font-medium rounded-lg transition-colors"
        >
          Log meal
        </button>
      </div>
    </motion.div>
  );
}

// Home Tab Content
function HomeTab({ onNavigate, onViewReport }: { onNavigate: (view: OverlayView) => void; onViewReport: (mesoId: string) => void }) {
  const {
    user, gamificationStats, currentMesocycle, workoutLogs, startWorkout,
    lastCompletedWorkout, dismissWorkoutSummary, generateNewMesocycle,
    mesocycleHistory, competitions, bodyWeightLog,
    trainingSessions, latestWhoopData, meals,
    migrateWorkoutLogsToMesocycle, getCurrentMesocycleLogCount,
    addTrainingSession, addPastWorkout
  } = useAppStore();
  const [showMoreTools, setShowMoreTools] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [showMigrateDialog, setShowMigrateDialog] = useState(false);
  const [previousMesocycleId, setPreviousMesocycleId] = useState<string | null>(null);
  const [heatmapSelectedDate, setHeatmapSelectedDate] = useState<Date | null>(null);
  const weightUnit = user?.weightUnit || 'lbs';

  // ─── Today's Summary Data ───
  const today = new Date();
  const todayStr = today.toDateString();

  // Today's training sessions (combat, cardio, etc.)
  const todayTraining = trainingSessions.filter(s =>
    new Date(s.date).toDateString() === todayStr
  );

  // Today's strength workouts
  const todayWorkouts = workoutLogs.filter(log =>
    new Date(log.date).toDateString() === todayStr
  );

  // Today's meals/nutrition
  const todayMeals = meals.filter(m =>
    new Date(m.date).toDateString() === todayStr
  );
  const todayProtein = todayMeals.reduce((sum, m) => sum + (m.protein || 0), 0);
  const todayCalories = todayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);

  // Whoop recovery data (most recent)
  const recoveryScore = latestWhoopData?.recoveryScore;
  const strain = latestWhoopData?.strain;
  const sleepHours = latestWhoopData?.sleepHours;

  // Share workout summary handler
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

  const motivationalMessage = getMotivationalMessage(gamificationStats);
  const progress = levelProgress(gamificationStats.totalPoints);
  const pointsNeeded = pointsToNextLevel(gamificationStats.totalPoints);

  // Deload detection
  const deloadCheck = workoutLogs.length >= 3 ? shouldDeload(workoutLogs.slice(-5)) : null;

  // Get next workout — find the first uncompleted session in the mesocycle
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

  // Mesocycle progress calculation
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

  // Weekly consistency: how many days this week had a workout
  const weeklyConsistency = (() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const daysThisWeek = new Set(
      workoutLogs
        .filter(log => new Date(log.date) >= startOfWeek)
        .map(log => new Date(log.date).toDateString())
    );
    return { done: daysThisWeek.size, target: user?.sessionsPerWeek || 3 };
  })();

  // Training load warning for combat athletes
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

  // Check if today is a rest day (no workout logged today)
  const isRestDay = !workoutLogs.some(log => new Date(log.date).toDateString() === todayStr) && !nextWorkoutInfo;
  const restDayTip = isRestDay ? getRestDayTip(user?.trainingIdentity, user?.combatSport) : null;

  // Estimated 1RM trends — dynamically finds the user's most frequently performed lifts
  const e1rmTrends = (() => {
    // Count how many times each exercise appears across all workout logs
    const exerciseFreq: Record<string, number> = {};
    for (const log of workoutLogs) {
      for (const ex of log.exercises) {
        exerciseFreq[ex.exerciseId] = (exerciseFreq[ex.exerciseId] || 0) + 1;
      }
    }

    // Sort by frequency and take the top exercises that have at least 2 occurrences
    const topExercises = Object.entries(exerciseFreq)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id]) => id);

    const trends: { name: string; current: number; previous: number; exerciseId: string }[] = [];

    for (const liftId of topExercises) {
      const logsWithLift = workoutLogs
        .filter(log => log.exercises.some(ex => ex.exerciseId === liftId))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (logsWithLift.length >= 1) {
        const getE1rm = (log: WorkoutLog) => {
          const ex = log.exercises.find(e => e.exerciseId === liftId);
          if (!ex) return 0;
          const bestSet = ex.sets.filter(s => s.completed).sort((a, b) => {
            const a1rm = a.weight / (1.0278 - 0.0278 * a.reps);
            const b1rm = b.weight / (1.0278 - 0.0278 * b.reps);
            return b1rm - a1rm;
          })[0];
          if (!bestSet || bestSet.weight === 0) return 0;
          return bestSet.reps === 1 ? bestSet.weight : Math.round(bestSet.weight / (1.0278 - 0.0278 * bestSet.reps));
        };

        const current = getE1rm(logsWithLift[0]);
        const previous = logsWithLift.length >= 2 ? getE1rm(logsWithLift[1]) : current;
        if (current > 0) {
          const exercise = getExerciseById(liftId);
          const name = exercise?.name || liftId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          trends.push({ name, current, previous, exerciseId: liftId });
        }
      }
    }
    return trends;
  })();

  // Mesocycle comparison: compare current block to previous
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

  // Competition countdown (nearest active event)
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

  // Body recomp: weight trend vs volume trend (last 4 weeks)
  const recompData = (() => {
    if (bodyWeightLog.length < 2 && workoutLogs.length < 2) return null;
    const fourWeeksAgo = Date.now() - 28 * 24 * 60 * 60 * 1000;

    // Weight trend
    const recentWeights = bodyWeightLog
      .filter(e => new Date(e.date).getTime() > fourWeeksAgo)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let weightDelta: number | null = null;
    if (recentWeights.length >= 2) {
      weightDelta = +(recentWeights[recentWeights.length - 1].weight - recentWeights[0].weight).toFixed(1);
    }

    // Volume trend
    const recentLogs = workoutLogs
      .filter(l => new Date(l.date).getTime() > fourWeeksAgo)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let volumeDelta: number | null = null;
    if (recentLogs.length >= 4) {
      const half = Math.floor(recentLogs.length / 2);
      const firstHalfAvg = recentLogs.slice(0, half).reduce((s, l) => s + l.totalVolume, 0) / half;
      const secondHalfAvg = recentLogs.slice(half).reduce((s, l) => s + l.totalVolume, 0) / (recentLogs.length - half);
      volumeDelta = Math.round(secondHalfAvg - firstHalfAvg);
    }

    if (weightDelta === null && volumeDelta === null) return null;
    return { weightDelta, volumeDelta, latestWeight: recentWeights.length > 0 ? recentWeights[recentWeights.length - 1].weight : null };
  })();

  // Training period summaries (weekly, monthly, yearly)
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

    // Include training sessions if user does combat/general fitness
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

  // Quick workout handler
  const handleQuickWorkout = () => {
    if (!user) return;
    const quickSession = generateQuickWorkout(user.equipment, 30, user.goalFocus, user.availableEquipment, user.trainingIdentity);
    startWorkout(quickSession);
  };

  // Handle mesocycle completion — auto-generate next with migration check
  const handleGenerateNext = () => {
    // Get fresh state from store to avoid stale closure issues
    const state = useAppStore.getState();
    const currentLogCount = state.getCurrentMesocycleLogCount();
    const activeMesocycle = state.currentMesocycle;

    if (activeMesocycle && currentLogCount > 0) {
      setPreviousMesocycleId(activeMesocycle.id);
      setShowMigrateDialog(true);
    } else {
      generateNewMesocycle();
    }
  };

  // Handle migration dialog response
  const handleMigrateResponse = (shouldMigrate: boolean) => {
    const oldMesocycleId = previousMesocycleId;
    generateNewMesocycle();

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

  // Tools split into featured (top 5) and more
  // Featured: Core tools for combat athletes - quick actions, combat training, wearable, nutrition, recovery
  // Dynamic label based on combat sport
  const getCombatLabel = () => {
    if (!user?.combatSport) return 'Combat';
    switch (user.combatSport) {
      case 'mma': return 'MMA';
      case 'grappling_gi': return 'Grappling';
      case 'grappling_nogi': return 'Grappling';
      case 'striking': return 'Striking';
      default: return 'Combat';
    }
  };

  // Wearable-adaptive tool label and icon
  const getWearableTool = () => {
    if (user?.wearableUsage === 'whoop') {
      return { icon: Activity, label: 'Whoop', view: 'wearable' as OverlayView, color: 'text-green-400 bg-green-500/20' };
    }
    if (user?.wearableUsage === 'other_wearable') {
      const providerLabel = user?.wearableProvider === 'apple_health' ? 'Apple' :
        user?.wearableProvider === 'oura' ? 'Oura' :
        user?.wearableProvider === 'garmin' ? 'Garmin' : 'Wearable';
      return { icon: Watch, label: providerLabel, view: 'wearable' as OverlayView, color: 'text-blue-400 bg-blue-500/20' };
    }
    // No wearable - show manual check-in focused view
    return { icon: ClipboardCheck, label: 'Check-In', view: 'quick_actions' as OverlayView, color: 'text-amber-400 bg-amber-500/20' };
  };

  const featuredTools = [
    { icon: Sparkles, label: 'Quick Log', view: 'quick_actions' as OverlayView, color: 'text-cyan-400 bg-cyan-500/20' },
    { icon: Shield, label: getCombatLabel(), view: 'grappling' as OverlayView, color: 'text-lime-400 bg-lime-500/20' },
    getWearableTool(),
    { icon: Zap, label: 'Recovery AI', view: 'recovery_coach' as OverlayView, color: 'text-primary-400 bg-primary-500/20' },
    { icon: Apple, label: 'Nutrition', view: 'nutrition' as OverlayView, color: 'text-red-400 bg-red-500/20' },
  ];
  const moreTools = [
    { icon: Brain, label: 'AI Coach', view: 'coach' as OverlayView, color: 'text-blue-400 bg-blue-500/20' },
    { icon: Siren, label: 'Injuries', view: 'injury' as OverlayView, color: 'text-rose-400 bg-rose-500/20' },
    { icon: Trophy, label: 'Comp Prep', view: 'competition' as OverlayView, color: 'text-yellow-400 bg-yellow-500/20' },
    { icon: HeartPulse, label: 'Recovery', view: 'recovery' as OverlayView, color: 'text-pink-400 bg-pink-500/20' },
    { icon: HeartPulse, label: 'HR Zones', view: 'hr_zones' as OverlayView, color: 'text-red-400 bg-red-500/20' },
    { icon: Leaf, label: 'Mobility', view: 'mobility' as OverlayView, color: 'text-emerald-400 bg-emerald-500/20' },
    // Show wearable in "more" if user doesn't have one configured (so they can set up later)
    ...(user?.wearableUsage === 'no_wearable' || !user?.wearableUsage
      ? [{ icon: Activity, label: 'Wearables', view: 'wearable' as OverlayView, color: 'text-green-400 bg-green-500/20' }]
      : []),
    { icon: Users, label: 'Share', view: 'community_share' as OverlayView, color: 'text-violet-400 bg-violet-500/20' },
    { icon: Crosshair, label: 'Profiler', view: 'profiler' as OverlayView, color: 'text-purple-400 bg-purple-500/20' },
    { icon: Scaling, label: 'Strength', view: 'strength' as OverlayView, color: 'text-orange-400 bg-orange-500/20' },
    { icon: Grip, label: 'Grip', view: 'grip_strength' as OverlayView, color: 'text-amber-400 bg-amber-500/20' },
    { icon: Dumbbell, label: 'Builder', view: 'builder' as OverlayView, color: 'text-accent-400 bg-accent-500/20' },
    { icon: Calendar, label: 'Periodize', view: 'periodization' as OverlayView, color: 'text-sky-400 bg-sky-500/20' },
    { icon: TrendingUp, label: 'Overload', view: 'overload' as OverlayView, color: 'text-cyan-400 bg-cyan-500/20' },
    { icon: ListPlus, label: 'Custom Ex', view: 'custom_exercise' as OverlayView, color: 'text-indigo-400 bg-indigo-500/20' },
    { icon: Calculator, label: '1RM Calc', view: 'one_rm' as OverlayView, color: 'text-amber-400 bg-amber-500/20' },
    { icon: Layers, label: 'Templates', view: 'templates' as OverlayView, color: 'text-teal-400 bg-teal-500/20' },
    { icon: LayoutGrid, label: 'Vol Map', view: 'volume_map' as OverlayView, color: 'text-fuchsia-400 bg-fuchsia-500/20' },
  ];

  const ToolButton = ({ tool }: { tool: typeof featuredTools[0] }) => (
    <button
      onClick={() => onNavigate(tool.view)}
      className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-grappler-800/60 hover:bg-grappler-700/60 transition-colors"
    >
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', tool.color)}>
        <tool.icon className="w-4.5 h-4.5" />
      </div>
      <span className="text-xs font-medium text-grappler-300">{tool.label}</span>
    </button>
  );

  return (
    <div className="space-y-5">
      {/* Post-Workout Summary Card */}
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
                <button
                  onClick={handleShareWorkout}
                  className="text-green-400 hover:text-green-300 p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-colors"
                  title="Share workout"
                >
                  {shareCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={dismissWorkoutSummary}
                  className="text-grappler-500 hover:text-grappler-300 text-xs px-2 py-1"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="text-center">
                <p className="text-lg font-bold text-grappler-100">{lastCompletedWorkout.log.exercises.length}</p>
                <p className="text-xs text-grappler-400">Exercises</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-grappler-100">{formatNumber(lastCompletedWorkout.log.totalVolume)}</p>
                <p className="text-xs text-grappler-400">Volume ({weightUnit})</p>
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
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 bg-purple-500/10 rounded-lg px-3 py-2"
                  >
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
            <div className="mt-3 flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-grappler-300">{lastCompletedWorkout.newStreak} day streak</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Training Load Warning for Combat Athletes */}
      {trainingLoadWarning && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-300 text-sm">Training Load</h3>
              <p className="text-xs text-amber-400/80 mt-1">{trainingLoadWarning}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Competition Countdown */}
      {nextCompetition && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-yellow-500/15 to-orange-500/10 border border-yellow-500/30 rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                <Trophy className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-yellow-400/70 uppercase tracking-wide font-medium">{nextCompetition.type.replace(/_/g, ' ')}</p>
                <h3 className="font-bold text-yellow-300 text-sm">{nextCompetition.name}</h3>
                <p className="text-xs text-grappler-400 mt-0.5">
                  {new Date(nextCompetition.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  {nextCompetition.weightClass ? ` | ${nextCompetition.weightClass} ${weightUnit}` : ''}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-yellow-400">{nextCompetition.daysUntil}</p>
              <p className="text-xs text-yellow-400/70">days out</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Deload Alert */}
      {deloadCheck && deloadCheck.needed && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-orange-300 text-sm">Deload Recommended</h3>
              <p className="text-xs text-orange-400/80 mt-1">{deloadCheck.reason}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Meal Reminder Banner */}
      <MealReminderBanner
        meals={todayMeals}
        onNavigate={onNavigate}
      />

      {/* Smart Daily Recommendation */}
      {user?.trainingDays && user.trainingDays.length > 0 && (() => {
        const latestWhoop = useAppStore.getState().latestWhoopData;
        const wearableHistory = useAppStore.getState().wearableHistory;
        // Compute 7-day average recovery from wearable history
        const recentRecoveries = wearableHistory
          .filter(w => w.recoveryScore != null)
          .slice(-7)
          .map(w => w.recoveryScore!);
        const avgRecovery7d = recentRecoveries.length > 0
          ? Math.round(recentRecoveries.reduce((a, b) => a + b, 0) / recentRecoveries.length)
          : undefined;
        // Sleep debt = actual sleep - needed sleep (negative means debt)
        const sleepDebtHours = (latestWhoop?.sleepHours != null && latestWhoop?.sleepNeededHours != null)
          ? latestWhoop.sleepHours - latestWhoop.sleepNeededHours
          : undefined;
        // HRV Coefficient of Variation (research-backed overreaching signal)
        const hrvValues = wearableHistory
          .filter(w => w.hrv != null)
          .slice(-7)
          .map(w => w.hrv!);
        let hrvCV: number | undefined;
        if (hrvValues.length >= 4) {
          const mean = hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length;
          if (mean > 0) {
            const variance = hrvValues.reduce((sum, v) => sum + (v - mean) ** 2, 0) / hrvValues.length;
            hrvCV = (Math.sqrt(variance) / mean) * 100;
          }
        }
        const rec = getTodayRecommendation(
          user.trainingDays,
          user.combatTrainingDays || [],
          latestWhoop?.recoveryScore ?? undefined,
          latestWhoop?.sleepHours ?? undefined,
          {
            deepSleepMinutes: latestWhoop?.deepSleepMinutes ?? undefined,
            sleepEfficiency: latestWhoop?.sleepEfficiency ?? undefined,
            spo2: latestWhoop?.spo2 ?? undefined,
            strain: latestWhoop?.strain ?? undefined,
            sleepDebtHours,
            avgRecovery7d,
            hrvCV,
          },
        );
        const bgClass = rec.intensity === 'full'
          ? 'from-green-500/15 to-emerald-500/10 border-green-500/30'
          : rec.intensity === 'reduced'
          ? 'from-yellow-500/15 to-orange-500/10 border-yellow-500/30'
          : 'from-grappler-700/40 to-grappler-800/40 border-grappler-700';
        const iconColor = rec.intensity === 'full' ? 'text-green-400' : rec.intensity === 'reduced' ? 'text-yellow-400' : 'text-grappler-400';
        return (
          <div className={cn('rounded-xl p-3.5 border bg-gradient-to-r', bgClass)}>
            <div className="flex items-center gap-3">
              <CalendarDays className={cn('w-5 h-5 flex-shrink-0', iconColor)} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-grappler-200">
                  {new Date().toLocaleDateString(undefined, { weekday: 'long' })}
                </p>
                <p className="text-xs text-grappler-400 mt-0.5 leading-relaxed">{rec.message}</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Hero: Start Next Workout */}
      {nextWorkout ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
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
              </div>
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <Play className="w-7 h-7 text-white" />
              </div>
            </div>
          </button>
        </motion.div>
      ) : currentMesocycle && mesocycleProgress && mesocycleProgress.completed === mesocycleProgress.total ? (
        /* Mesocycle Complete — Prompt to generate next */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-5 bg-gradient-to-br from-primary-500/10 to-accent-500/10 border border-primary-500/20"
        >
          <div className="text-center">
            <Trophy className="w-10 h-10 text-primary-400 mx-auto mb-2" />
            <h3 className="font-bold text-grappler-100 text-sm">Block Complete!</h3>
            <p className="text-xs text-grappler-400 mt-1 mb-4">
              You finished all {mesocycleProgress.total} sessions in {currentMesocycle.name}.
            </p>
          </div>

          {/* Mesocycle comparison */}
          {mesocycleComparison && (
            <div className="bg-grappler-800/40 rounded-xl p-3 mb-4 space-y-2">
              <p className="text-xs text-grappler-500 uppercase tracking-wide">vs {mesocycleComparison.prevName}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-grappler-400">Sessions</p>
                  <p className="text-sm font-bold text-grappler-100">{mesocycleComparison.sessions.current}</p>
                  <p className="text-xs text-grappler-500">prev: {mesocycleComparison.sessions.prev}</p>
                </div>
                <div>
                  <p className="text-xs text-grappler-400">Avg Volume</p>
                  <p className="text-sm font-bold text-grappler-100">{formatNumber(mesocycleComparison.avgVolume.current)}</p>
                  <p className={cn('text-xs font-medium', mesocycleComparison.avgVolume.delta > 0 ? 'text-green-400' : mesocycleComparison.avgVolume.delta < 0 ? 'text-red-400' : 'text-grappler-500')}>
                    {mesocycleComparison.avgVolume.delta > 0 ? '+' : ''}{formatNumber(mesocycleComparison.avgVolume.delta)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-grappler-400">Avg RPE</p>
                  <p className="text-sm font-bold text-grappler-100">{mesocycleComparison.avgRPE.current}</p>
                  <p className="text-xs text-grappler-500">prev: {mesocycleComparison.avgRPE.prev}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => onViewReport(currentMesocycle.id)}
              className="btn btn-md gap-2 bg-grappler-700 text-grappler-200 hover:bg-grappler-600"
            >
              <BarChart3 className="w-4 h-4" />
              View Report
            </button>
            <button
              onClick={handleGenerateNext}
              className="btn btn-primary btn-md gap-2"
            >
              <Zap className="w-4 h-4" />
              Generate Next Block
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-5 text-center"
        >
          <Dumbbell className="w-10 h-10 text-grappler-600 mx-auto mb-2" />
          <p className="text-sm text-grappler-400 mb-3">No program yet — generate one to get started</p>
          <button
            onClick={handleQuickWorkout}
            className="btn btn-primary btn-md gap-2"
          >
            <Zap className="w-4 h-4" />
            Quick 30-Min Workout
          </button>
        </motion.div>
      )}

      {/* Quick Workout (secondary, only if next workout exists) */}
      {nextWorkout && (
        <button
          onClick={handleQuickWorkout}
          className="w-full card p-3.5 flex items-center gap-3 hover:bg-grappler-700/50 transition-colors"
        >
          <div className="w-10 h-10 bg-accent-500/20 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-accent-400" />
          </div>
          <div className="text-left flex-1">
            <p className="font-medium text-grappler-100 text-sm">Quick 30-Min Workout</p>
            <p className="text-xs text-grappler-500">4 compound exercises</p>
          </div>
          <ChevronRight className="w-4 h-4 text-grappler-500" />
        </button>
      )}

      {/* Mesocycle Progress Bar */}
      {mesocycleProgress && currentMesocycle && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-grappler-200 flex items-center gap-2">
              <Target className="w-4 h-4 text-primary-400" />
              {currentMesocycle.name}
            </h3>
            <span className="text-xs text-grappler-400">{mesocycleProgress.completed}/{mesocycleProgress.total} sessions</span>
          </div>
          <div className="w-full h-2.5 bg-grappler-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${mesocycleProgress.percent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
            />
          </div>
          <p className="text-xs text-grappler-500 mt-1.5">{mesocycleProgress.percent}% complete</p>
        </div>
      )}

      {/* Estimated 1RM Trends */}
      {e1rmTrends.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-grappler-200 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent-400" />
            Estimated 1RM
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {e1rmTrends.map((lift) => {
              const diff = lift.current - lift.previous;
              const isUp = diff > 0;
              return (
                <div key={lift.exerciseId} className="flex items-center justify-between bg-grappler-800/50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-xs text-grappler-400 capitalize">{lift.name}</p>
                    <p className="text-sm font-bold text-grappler-100">{lift.current} {weightUnit}</p>
                  </div>
                  {diff !== 0 && (
                    <span className={cn('text-xs font-medium', isUp ? 'text-green-400' : 'text-red-400')}>
                      {isUp ? '+' : ''}{diff}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Body Recomp Tracking */}
      {recompData && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-grappler-200 mb-3 flex items-center gap-2">
            <Scaling className="w-4 h-4 text-purple-400" />
            Body Recomp (4 weeks)
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {recompData.latestWeight !== null && (
              <div className="bg-grappler-800/50 rounded-lg px-3 py-2">
                <p className="text-xs text-grappler-400">Weight</p>
                <p className="text-sm font-bold text-grappler-100">{recompData.latestWeight} {weightUnit}</p>
                {recompData.weightDelta !== null && (
                  <p className={cn('text-xs font-medium', recompData.weightDelta > 0 ? 'text-amber-400' : recompData.weightDelta < 0 ? 'text-blue-400' : 'text-grappler-500')}>
                    {recompData.weightDelta > 0 ? '+' : ''}{recompData.weightDelta} {weightUnit}
                  </p>
                )}
              </div>
            )}
            {recompData.volumeDelta !== null && (
              <div className="bg-grappler-800/50 rounded-lg px-3 py-2">
                <p className="text-xs text-grappler-400">Avg Volume</p>
                <p className={cn('text-sm font-bold', recompData.volumeDelta > 0 ? 'text-green-400' : recompData.volumeDelta < 0 ? 'text-red-400' : 'text-grappler-100')}>
                  {recompData.volumeDelta > 0 ? '+' : ''}{formatNumber(recompData.volumeDelta)}
                </p>
                <p className="text-xs text-grappler-500">vs first 2 weeks</p>
              </div>
            )}
          </div>
          {recompData.weightDelta !== null && recompData.volumeDelta !== null && (
            <p className="text-xs text-grappler-500 mt-2">
              {recompData.weightDelta <= 0 && recompData.volumeDelta > 0
                ? 'Losing weight while lifting more — solid recomp!'
                : recompData.weightDelta > 0 && recompData.volumeDelta > 0
                ? 'Weight and volume both up — lean bulk territory.'
                : recompData.weightDelta < 0 && recompData.volumeDelta < 0
                ? 'Both trending down — make sure you\'re fueling enough.'
                : 'Tracking trends — keep logging to see patterns.'}
            </p>
          )}
        </div>
      )}

      {/* Rest Day Tip */}
      {restDayTip && (
        <div className="card p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Leaf className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-emerald-400 font-medium uppercase tracking-wide">{restDayTip.category}</p>
              <p className="text-sm text-grappler-300 mt-1">{restDayTip.tip}</p>
            </div>
          </div>
        </div>
      )}

      {/* Training Streak Heatmap */}
      <StreakHeatmap workoutLogs={workoutLogs} onDayClick={(date) => setHeatmapSelectedDate(date)} />

      {/* Add Session Modal from Heatmap */}
      <AnimatePresence>
        {heatmapSelectedDate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            role="dialog"
            aria-modal="true"
            onClick={() => setHeatmapSelectedDate(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-grappler-800 rounded-2xl p-5 w-full max-w-xs shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-white mb-1">Add Activity</h3>
              <p className="text-sm text-grappler-400 mb-4">{heatmapSelectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>

              <div className="space-y-2">
                {/* Lifting option */}
                <button
                  onClick={() => {
                    addPastWorkout({
                      date: heatmapSelectedDate,
                      exercises: [{
                        exerciseId: 'general-lifting',
                        exerciseName: 'Lifting Session',
                        sets: [{ setNumber: 1, weight: 0, reps: 1, rpe: 7, completed: true }],
                        personalRecord: false,
                      }],
                      duration: 60,
                      overallRPE: 7,
                      notes: 'Quick logged from calendar',
                    });
                    setHeatmapSelectedDate(null);
                  }}
                  className="w-full flex items-center gap-3 p-3 bg-grappler-700/50 hover:bg-grappler-700 rounded-xl transition-colors"
                >
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <Dumbbell className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-white">Lifting</p>
                    <p className="text-xs text-grappler-400">Strength training</p>
                  </div>
                </button>

                {/* Grappling option */}
                <button
                  onClick={() => {
                    addTrainingSession({
                      date: heatmapSelectedDate,
                      category: 'grappling',
                      type: 'bjj_nogi',
                      plannedIntensity: 'moderate',
                      duration: 60,
                      timing: 'standalone',
                      perceivedExertion: 6,
                    });
                    setHeatmapSelectedDate(null);
                  }}
                  className="w-full flex items-center gap-3 p-3 bg-grappler-700/50 hover:bg-grappler-700 rounded-xl transition-colors"
                >
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Target className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-white">Grappling</p>
                    <p className="text-xs text-grappler-400">BJJ / Wrestling</p>
                  </div>
                </button>

                {/* Striking option */}
                <button
                  onClick={() => {
                    addTrainingSession({
                      date: heatmapSelectedDate,
                      category: 'striking',
                      type: 'boxing',
                      plannedIntensity: 'moderate',
                      duration: 60,
                      timing: 'standalone',
                      perceivedExertion: 6,
                    });
                    setHeatmapSelectedDate(null);
                  }}
                  className="w-full flex items-center gap-3 p-3 bg-grappler-700/50 hover:bg-grappler-700 rounded-xl transition-colors"
                >
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-orange-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-white">Striking</p>
                    <p className="text-xs text-grappler-400">Boxing / Kickboxing</p>
                  </div>
                </button>

                {/* Cardio option */}
                <button
                  onClick={() => {
                    addTrainingSession({
                      date: heatmapSelectedDate,
                      category: 'cardio',
                      type: 'running',
                      plannedIntensity: 'moderate',
                      duration: 30,
                      timing: 'standalone',
                      perceivedExertion: 5,
                    });
                    setHeatmapSelectedDate(null);
                  }}
                  className="w-full flex items-center gap-3 p-3 bg-grappler-700/50 hover:bg-grappler-700 rounded-xl transition-colors"
                >
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-white">Cardio</p>
                    <p className="text-xs text-grappler-400">Running / Cycling</p>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setHeatmapSelectedDate(null)}
                className="w-full mt-4 py-2 text-sm text-grappler-400 hover:text-grappler-200 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Training Roundup ─── */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-grappler-200 uppercase tracking-wide flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-primary-400" />
          Training Roundup
        </h3>
        <div className="space-y-3">
          {/* This Week */}
          <div className="bg-grappler-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-grappler-300">This Week</span>
              {periodSummaries.lastWeek.trainingDays > 0 && (
                <span className={cn(
                  'text-xs font-medium',
                  periodSummaries.thisWeek.trainingDays > periodSummaries.lastWeek.trainingDays ? 'text-green-400' :
                  periodSummaries.thisWeek.trainingDays < periodSummaries.lastWeek.trainingDays ? 'text-amber-400' : 'text-grappler-500'
                )}>
                  vs last week
                </span>
              )}
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

          {/* This Month */}
          <div className="bg-grappler-800/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-grappler-400">This Month</span>
              <span className="text-xs text-grappler-500">{formatNumber(periodSummaries.thisMonth.volume)} {weightUnit} vol</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-grappler-300">
                <span className="font-bold text-grappler-100">{periodSummaries.thisMonth.trainingDays}</span> training days
              </span>
              <span className="text-grappler-400">•</span>
              <span className="text-grappler-300">
                <span className="font-bold text-yellow-400">{periodSummaries.thisMonth.prs}</span> PRs
              </span>
              {periodSummaries.lastMonth.trainingDays > 0 && (
                <>
                  <span className="text-grappler-400">•</span>
                  <span className={cn(
                    'text-xs',
                    periodSummaries.thisMonth.trainingDays > periodSummaries.lastMonth.trainingDays ? 'text-green-400' : 'text-grappler-500'
                  )}>
                    {periodSummaries.thisMonth.trainingDays > periodSummaries.lastMonth.trainingDays ? '+' : ''}
                    {periodSummaries.thisMonth.trainingDays - periodSummaries.lastMonth.trainingDays} vs last
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Year to Date */}
          <div className="bg-grappler-800/20 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-grappler-400">{today.getFullYear()} Year to Date</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="text-grappler-300">
                <span className="font-bold text-grappler-100">{periodSummaries.thisYear.workouts}</span> workouts
              </span>
              {periodSummaries.thisYear.sessions > 0 && (
                <span className="text-grappler-300">
                  <span className="font-bold text-blue-400">{periodSummaries.thisYear.sessions}</span> sessions
                </span>
              )}
              <span className="text-grappler-300">
                <span className="font-bold text-yellow-400">{periodSummaries.thisYear.prs}</span> PRs
              </span>
              <span className="text-grappler-300">
                <span className="font-bold text-primary-400">{formatNumber(periodSummaries.thisYear.volume)}</span> {weightUnit}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Today at a Glance ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-grappler-100 text-sm flex items-center gap-2">
            <Sun className="w-4 h-4 text-yellow-400" />
            Today
          </h3>
          <span className="text-xs text-grappler-500">
            {today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>

        {/* Recovery + Readiness (if Whoop connected) */}
        {recoveryScore != null && (
          <div className={cn(
            'rounded-xl p-3 mb-3 border',
            recoveryScore >= 67 ? 'bg-green-500/10 border-green-500/30' :
            recoveryScore >= 34 ? 'bg-yellow-500/10 border-yellow-500/30' :
            'bg-red-500/10 border-red-500/30'
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-400" />
                <span className="text-xs text-grappler-400">Recovery</span>
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
                  <span className="text-xs text-grappler-500">
                    {sleepHours.toFixed(1)}h sleep
                  </span>
                )}
                {strain != null && (
                  <span className="text-xs text-grappler-500">
                    {strain.toFixed(1)} strain
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-grappler-400 mt-1.5">
              {recoveryScore >= 67 ? 'Ready to train hard today' :
               recoveryScore >= 34 ? 'Moderate intensity recommended' :
               'Consider recovery work or light flow'}
            </p>
          </div>
        )}

        {/* Activity Summary Row */}
        <div className="grid grid-cols-3 gap-2">
          {/* Grappling */}
          <button
            onClick={() => onNavigate('grappling')}
            className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-grappler-800/60 hover:bg-grappler-700/60 transition-colors"
          >
            <Shield className="w-4 h-4 text-lime-400" />
            <span className="text-lg font-bold text-grappler-100">{todayTraining.length}</span>
            <span className="text-xs text-grappler-500">Grappling</span>
          </button>

          {/* Strength */}
          <button
            onClick={() => currentMesocycle && nextWorkout ? startWorkout(nextWorkout) : onNavigate('builder')}
            className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-grappler-800/60 hover:bg-grappler-700/60 transition-colors"
          >
            <Dumbbell className="w-4 h-4 text-primary-400" />
            <span className="text-lg font-bold text-grappler-100">{todayWorkouts.length}</span>
            <span className="text-xs text-grappler-500">Lifting</span>
          </button>

          {/* Nutrition */}
          <button
            onClick={() => onNavigate('nutrition')}
            className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-grappler-800/60 hover:bg-grappler-700/60 transition-colors"
          >
            <Apple className="w-4 h-4 text-red-400" />
            <span className="text-lg font-bold text-grappler-100">{todayProtein}g</span>
            <span className="text-xs text-grappler-500">Protein</span>
          </button>
        </div>

        {/* Quick insight if no activity yet */}
        {todayTraining.length === 0 && todayWorkouts.length === 0 && todayMeals.length === 0 && (
          <p className="text-xs text-grappler-500 text-center mt-3 py-2 border-t border-grappler-800">
            No activity logged yet today. Tap above to get started!
          </p>
        )}
      </motion.div>

      {/* Featured Tools (4) + expandable More */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="grid grid-cols-4 gap-2">
          {featuredTools.map((tool) => (
            <ToolButton key={tool.label} tool={tool} />
          ))}
        </div>

        {/* More Tools toggle */}
        <button
          onClick={() => setShowMoreTools(!showMoreTools)}
          className="w-full mt-2 py-2 flex items-center justify-center gap-1 text-xs text-grappler-500 hover:text-grappler-300 transition-colors"
        >
          {showMoreTools ? 'Show Less' : `More Tools (${moreTools.length})`}
          <ChevronRight className={cn('w-3 h-3 transition-transform', showMoreTools && 'rotate-90')} />
        </button>

        <AnimatePresence>
          {showMoreTools && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-4 gap-2 pt-1">
                {moreTools.map((tool) => (
                  <ToolButton key={tool.label} tool={tool} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

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
