'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import {
  Dumbbell,
  Calendar,
  BarChart3,
  User,
  Plus,
  Flame,
  Star,
  Zap,
  Compass,
  Target,
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import SyncConflictResolver from './SyncConflictResolver';
import SyncStatusIndicator from './SyncStatusIndicator';
import VersionUpgradePopup from './VersionUpgradePopup';
import { getLevelTitle, levelProgress, pointsToNextLevel } from '@/lib/gamification';
import { getEffectiveTier, hasFeatureAccess } from '@/lib/subscription';
import UpgradePrompt from './UpgradePrompt';
import ThemeToggle from './ThemeToggle';
import { ToastProvider } from './Toast';
import { HomeTabSkeleton, ProgramTabSkeleton, ExploreTabSkeleton, ProgressTabSkeleton } from './Skeleton';
import { hapticLight } from '@/lib/haptics';
import type { OverlayView } from './dashboard-types';
import type { TabType } from './dashboard-types';
import type { SyncStatus } from '@/lib/useDbSync';

// Core tabs — lazy loaded for smaller initial bundle
const HomeTab = dynamic(() => import('./HomeTab'), { loading: () => <HomeTabSkeleton /> });
const WorkoutView = dynamic(() => import('./WorkoutView'), { loading: () => <ProgramTabSkeleton /> });
const ExploreTab = dynamic(() => import('./ExploreTab'), { loading: () => <ExploreTabSkeleton /> });
const ProgressAndHistoryTab = dynamic(() => import('./ProgressTab'), { loading: () => <ProgressTabSkeleton /> });
// These are lightweight enough to keep eager
import ProfileSettings from './ProfileSettings';
import ActiveWorkout from './ActiveWorkout';

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
const BlockSuggestionView = dynamic(() => import('./BlockSuggestion'), { loading: () => <OverlaySkeleton /> });
const NewUserGuide = dynamic(() => import('./NewUserGuide'), { loading: () => <OverlaySkeleton /> });
const IllnessLogger = dynamic(() => import('./IllnessLogger'), { loading: () => <OverlaySkeleton /> });
const CycleTracking = dynamic(() => import('./CycleTracking'), { loading: () => <OverlaySkeleton /> });
const FatigueOverlay = dynamic(() => import('./FatigueOverlay'), { loading: () => <OverlaySkeleton /> });
const FightCampNutrition = dynamic(() => import('./FightCampNutrition'), { loading: () => <OverlaySkeleton /> });
const BadgeShowcase = dynamic(() => import('./BadgeShowcase'), { loading: () => <OverlaySkeleton /> });

// Map overlay views to their required feature gate key (null = free)
const OVERLAY_FEATURE_MAP: Partial<Record<NonNullable<OverlayView>, string>> = {
  nutrition: 'nutrition-tracking',
  wearable: 'wearable-integration',
  competition: 'competition-prep',
  mobility: 'mobility-routines',
  coach: 'ai-coach',
  profiler: 'strength-analysis',
  strength: 'strength-analysis',
  injury: 'injury-illness',
  illness: 'injury-illness',
  custom_exercise: 'custom-exercises',
  templates: 'session-templates',
  grip_strength: 'grip-tracking',
  recovery_coach: 'ai-coach',
  block_suggestion: 'block-suggestions',
  volume_map: 'advanced-analytics',
  periodization: 'advanced-analytics',
  overload: 'advanced-analytics',
  recovery: 'advanced-analytics',
  hr_zones: 'wearable-integration',
  cycle_tracking: 'advanced-analytics',
  fatigue: 'advanced-analytics',
  fight_camp: 'fight-camp-nutrition',
  grappling: 'competition-prep',
};

function LevelUpCelebration({ level, onDismiss }: { level: number; onDismiss: () => void }) {
  const title = getLevelTitle(level);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-6"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', damping: 15, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gradient-to-br from-grappler-900 via-grappler-900 to-primary-950 rounded-3xl p-6 max-w-xs w-full border border-primary-500/30 shadow-2xl text-center relative overflow-hidden"
      >
        {/* Particle burst background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: ['#facc15', '#a78bfa', '#34d399', '#f472b6', '#60a5fa'][i % 5],
                left: '50%',
                top: '50%',
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: Math.cos((i * 30 * Math.PI) / 180) * (80 + Math.random() * 60),
                y: Math.sin((i * 30 * Math.PI) / 180) * (80 + Math.random() * 60),
                opacity: 0,
                scale: 0,
              }}
              transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
            />
          ))}
        </div>

        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 10, stiffness: 200, delay: 0.1 }}
          className="w-20 h-20 bg-gradient-to-br from-sky-400 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-yellow-500/30"
        >
          <Star className="w-10 h-10 text-white" />
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
          <p className="text-xs text-yellow-400 font-semibold uppercase tracking-widest mb-1">Level Up!</p>
          <h2 className="text-3xl font-black text-white mb-1">Level {level}</h2>
          <p className="text-sm text-primary-300 font-medium">{title}</p>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
          <p className="text-xs text-grappler-400 mt-3 mb-4">Keep pushing — your consistency is paying off.</p>
          <button
            onClick={onDismiss}
            className="btn btn-primary btn-md w-full gap-2"
          >
            <Flame className="w-4 h-4" />
            Let&apos;s Go
          </button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

const TABS = [
  { id: 'home', icon: Dumbbell, label: 'Home' },
  { id: 'program', icon: Calendar, label: 'Program' },
  { id: 'explore', icon: Compass, label: 'Explore' },
  { id: 'progress', icon: BarChart3, label: 'Progress' },
  { id: 'profile', icon: User, label: 'Profile' },
] as const;

interface DashboardProps {
  syncStatus?: SyncStatus;
  lastSyncedAt?: Date | null;
  deviceType?: 'phone' | 'tablet' | 'desktop';
  isAuthenticated?: boolean;
  onForceSync?: () => void;
}

export default function Dashboard({
  syncStatus = 'idle',
  lastSyncedAt = null,
  deviceType = 'desktop',
  isAuthenticated = false,
  onForceSync,
}: DashboardProps = {}) {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [overlayView, setOverlayViewRaw] = useState<OverlayView>(null);
  const scrollPositionRef = useRef(0);
  const subscription = useAppStore(s => s.subscription);
  const { data: session } = useSession();
  const [upgradeFeature, setUpgradeFeature] = useState<string | null>(null);
  const setOverlayView = (view: OverlayView) => {
    if (view !== null) {
      // Check feature gate before opening pro overlays
      const featureKey = OVERLAY_FEATURE_MAP[view];
      if (featureKey) {
        const tier = getEffectiveTier(subscription, session?.user?.email);
        if (!hasFeatureAccess(featureKey, tier)) {
          setUpgradeFeature(featureKey);
          return;
        }
      }
      // Save scroll position before opening overlay
      scrollPositionRef.current = window.scrollY;
    }
    setOverlayViewRaw(view);
    if (view === null) {
      // Restore scroll position after closing overlay
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPositionRef.current);
      });
    }
  };
  const [reportMesocycleId, setReportMesocycleId] = useState<string | null>(null);
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
  const ensureWeeklyChallenge = useAppStore(s => s.ensureWeeklyChallenge);
  const lastCompletedWorkout = useAppStore(s => s.lastCompletedWorkout);

  // Tab switch with haptic feedback
  const switchTab = useCallback((id: TabType) => {
    hapticLight();
    setActiveTab(id);
    window.scrollTo(0, 0);
  }, []);

  // Keyboard navigation for tab bar (Left/Right arrows)
  const handleTabKeyDown = useCallback((e: React.KeyboardEvent) => {
    const tabIds = TABS.map(t => t.id);
    const currentIdx = tabIds.indexOf(activeTab);
    let nextIdx = -1;

    if (e.key === 'ArrowRight') {
      nextIdx = (currentIdx + 1) % tabIds.length;
    } else if (e.key === 'ArrowLeft') {
      nextIdx = (currentIdx - 1 + tabIds.length) % tabIds.length;
    } else if (e.key === 'Home') {
      nextIdx = 0;
    } else if (e.key === 'End') {
      nextIdx = tabIds.length - 1;
    }

    if (nextIdx >= 0) {
      e.preventDefault();
      const nextTabId = tabIds[nextIdx] as TabType;
      switchTab(nextTabId);
      // Focus the newly active tab button
      const nextBtn = (e.currentTarget as HTMLElement).querySelector(`[data-tab-id="${nextTabId}"]`) as HTMLElement;
      nextBtn?.focus();
    }
  }, [activeTab, switchTab]);

  // Show new user guide after first workout completion (not before)
  const [showNewUserGuide, setShowNewUserGuide] = useState(false);
  useEffect(() => {
    // Trigger when: first workout done, celebration dismissed, guide not yet shown
    if (user && workoutLogs.length >= 1 && !lastCompletedWorkout) {
      const guideShown = localStorage.getItem('roots-guide-shown');
      if (!guideShown) {
        setShowNewUserGuide(true);
      }
    }
  }, [user, workoutLogs.length, lastCompletedWorkout]);

  const handleGuideComplete = () => {
    setShowNewUserGuide(false);
    localStorage.setItem('roots-guide-shown', 'true');
  };

  // Ensure weekly challenge is generated on Dashboard mount
  useEffect(() => {
    if (user && gamificationStats.totalWorkouts > 0) {
      ensureWeeklyChallenge();
    }
  }, []);

  // ── Daily login bonus ──
  const claimDailyLoginBonus = useAppStore(s => s.claimDailyLoginBonus);
  const [loginBonusToast, setLoginBonusToast] = useState<{ points: number; day: number; isMysteryDay: boolean } | null>(null);
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      const result = claimDailyLoginBonus();
      if (result) {
        setLoginBonusToast(result);
        setTimeout(() => setLoginBonusToast(null), 4000);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Notification permission prompt (one-time, after 3rd workout) ──
  const notificationPreferences = useAppStore(s => s.notificationPreferences);
  const setNotificationPreferences = useAppStore(s => s.setNotificationPreferences);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'default' &&
      !notificationPreferences.enabled &&
      gamificationStats.totalWorkouts >= 3 &&
      !localStorage.getItem('roots-notif-prompt-dismissed')
    ) {
      const timer = setTimeout(() => setShowNotifPrompt(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [gamificationStats.totalWorkouts, notificationPreferences.enabled]);

  const handleEnableNotifications = async () => {
    try {
      const { requestNotificationPermission } = await import('@/lib/notifications');
      const result = await requestNotificationPermission();
      if (result === 'granted') {
        setNotificationPreferences({ enabled: true });
      }
    } catch { /* user denied */ }
    setShowNotifPrompt(false);
    localStorage.setItem('roots-notif-prompt-dismissed', 'true');
  };

  // Level-up detection
  const [levelUpDisplay, setLevelUpDisplay] = useState<number | null>(null);
  const prevLevelRef = useRef(gamificationStats.level);
  useEffect(() => {
    if (gamificationStats.level > prevLevelRef.current && prevLevelRef.current > 0) {
      setLevelUpDisplay(gamificationStats.level);
    }
    prevLevelRef.current = gamificationStats.level;
  }, [gamificationStats.level]);

  // Streak at-risk detection
  const streakAtRisk = gamificationStats.currentStreak > 0 && (() => {
    const todayStr = new Date().toDateString();
    const trainedToday = workoutLogs.some(l => new Date(l.date).toDateString() === todayStr);
    return !trainedToday;
  })();

  // ── Schedule streak reminder if at risk ──
  useEffect(() => {
    if (streakAtRisk && notificationPreferences.enabled && notificationPreferences.streakAlerts) {
      import('@/lib/notifications').then(({ scheduleStreakReminder }) => {
        scheduleStreakReminder(gamificationStats.currentStreak);
      });
    }
  }, [streakAtRisk, notificationPreferences.enabled, notificationPreferences.streakAlerts, gamificationStats.currentStreak]);

  // New user walkthrough guide
  if (showNewUserGuide) {
    return <NewUserGuide onComplete={handleGuideComplete} />;
  }

  if (activeWorkout) {
    return <ActiveWorkout />;
  }

  // Full-screen overlay views
  if (overlayView === 'builder') return <WorkoutBuilder onClose={() => setOverlayView(null)} />;
  if (overlayView === 'nutrition') return <NutritionTracker onClose={() => setOverlayView(null)} />;
  if (overlayView === 'wearable') return <WearableIntegration onClose={() => setOverlayView(null)} />;
  if (overlayView === 'competition') return <CompetitionPrep onClose={() => setOverlayView(null)} />;
  if (overlayView === 'mobility') return <MobilityWorkouts onClose={() => setOverlayView(null)} />;
  if (overlayView === 'coach') return <WeeklyCoach onClose={() => setOverlayView(null)} />;
  if (overlayView === 'profiler') return <ExerciseProfiler onClose={() => setOverlayView(null)} />;
  if (overlayView === 'strength') return <StrengthAnalysis onClose={() => setOverlayView(null)} />;
  if (overlayView === 'periodization') return <PeriodizationCalendar onClose={() => setOverlayView(null)} />;
  if (overlayView === 'recovery') return <RecoveryDashboard onClose={() => setOverlayView(null)} />;
  if (overlayView === 'injury') return <InjuryLogger onClose={() => setOverlayView(null)} />;
  if (overlayView === 'overload') return <ProgressiveOverload onClose={() => setOverlayView(null)} />;
  if (overlayView === 'custom_exercise') return <CustomExerciseCreator onClose={() => setOverlayView(null)} />;
  if (overlayView === 'one_rm') return <OneRepMaxCalc onClose={() => setOverlayView(null)} />;
  if (overlayView === 'hr_zones') return <HRZoneTraining onClose={() => setOverlayView(null)} />;
  if (overlayView === 'templates') return <SessionTemplates onClose={() => setOverlayView(null)} />;
  if (overlayView === 'volume_map') return <VolumeHeatMap onClose={() => setOverlayView(null)} />;
  if (overlayView === 'grappling') return <GrapplingTracker onClose={() => setOverlayView(null)} />;
  if (overlayView === 'community_share') return <CommunityShare onClose={() => setOverlayView(null)} />;
  if (overlayView === 'quick_actions') return <QuickActions onClose={() => setOverlayView(null)} />;
  if (overlayView === 'grip_strength') return <GripStrengthModule onClose={() => setOverlayView(null)} />;
  if (overlayView === 'recovery_coach') return <RecoveryCoach onClose={() => setOverlayView(null)} />;
  if (overlayView === 'block_suggestion') return <BlockSuggestionView onClose={() => setOverlayView(null)} />;
  if (overlayView === 'user_guide') return <NewUserGuide onComplete={() => setOverlayView(null)} />;
  if (overlayView === 'illness') return <IllnessLogger onClose={() => setOverlayView(null)} />;
  if (overlayView === 'cycle_tracking') return <CycleTracking onClose={() => setOverlayView(null)} />;
  if (overlayView === 'fatigue') return <FatigueOverlay onClose={() => setOverlayView(null)} />;
  if (overlayView === 'fight_camp') return <FightCampNutrition onClose={() => setOverlayView(null)} />;
  if (overlayView === 'badge_showcase') return <BadgeShowcase onClose={() => setOverlayView(null)} />;

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
    <ToastProvider>
    <div className="min-h-screen bg-grappler-900 bg-mesh pb-16 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-grappler-900/80 backdrop-blur-xl border-b border-grappler-800">
        <div className="px-3 py-3 flex items-center justify-between gap-2 overflow-hidden">
          <div className="flex items-center gap-2 min-w-0 flex-shrink">
            <div className="w-8 h-8 flex-shrink-0 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-sm text-grappler-50 truncate">Roots Gains</h1>
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] text-grappler-400 whitespace-nowrap">
                  Lv.{gamificationStats.level}
                </p>
                <div className="w-14 h-1 bg-grappler-700 rounded-full overflow-hidden flex-shrink-0" title={`${pointsToNextLevel(gamificationStats.totalPoints)} XP to next level`}>
                  <div className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all" style={{ width: `${levelProgress(gamificationStats.totalPoints)}%` }} />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <SyncStatusIndicator
              syncStatus={syncStatus}
              lastSyncedAt={lastSyncedAt}
              deviceType={deviceType}
              isAuthenticated={isAuthenticated}
              onForceSync={onForceSync || (() => {})}
            />
            <ThemeToggle />
            {/* Weekly Challenge mini-badge */}
            {gamificationStats.weeklyChallenge && (() => {
              const goals = gamificationStats.weeklyChallenge.goals;
              const completed = goals.filter(g => g.current >= g.target).length;
              return (
                <div className="flex items-center gap-0.5 bg-grappler-800 px-1.5 py-1 rounded-full" title={`Weekly: ${completed}/${goals.length} goals done`}>
                  <Target className="w-3 h-3 text-accent-400" />
                  <span className="text-[10px] font-semibold text-grappler-200">{completed}/{goals.length}</span>
                </div>
              );
            })()}
            <div className={cn(
              'flex items-center gap-0.5 px-1.5 py-1 rounded-full transition-colors',
              gamificationStats.currentStreak >= 7
                ? 'bg-orange-500/20 border border-orange-500/30'
                : streakAtRisk
                  ? 'bg-blue-500/20 border border-blue-500/40 animate-pulse'
                  : 'bg-grappler-800'
            )}>
              <Flame className={cn(
                'w-3.5 h-3.5',
                gamificationStats.currentStreak >= 7 ? 'text-orange-400' : streakAtRisk ? 'text-blue-400' : 'text-blue-500'
              )} />
              <span className={cn(
                'text-xs font-medium',
                gamificationStats.currentStreak >= 7 ? 'text-orange-300' : streakAtRisk ? 'text-blue-300' : 'text-grappler-200'
              )}>
                {gamificationStats.currentStreak}
              </span>
            </div>
            <button
              onClick={() => setOverlayView('badge_showcase')}
              className="flex items-center gap-0.5 bg-grappler-800 px-1.5 py-1 rounded-full hover:bg-grappler-700 transition-colors"
              title="View badges"
            >
              <Star className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-xs font-medium text-grappler-200">
                {formatNumber(gamificationStats.totalPoints)}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pt-4 pb-2">
        <AnimatePresence mode="popLayout">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <HomeTab onNavigate={setOverlayView} onViewReport={setReportMesocycleId} onSwitchTab={setActiveTab} />
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
          {activeTab === 'explore' && (
            <motion.div
              key="explore"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ExploreTab onNavigate={setOverlayView} />
            </motion.div>
          )}
          {activeTab === 'progress' && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ProgressAndHistoryTab onViewReport={setReportMesocycleId} />
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

      {/* Single-action FAB — Quick Log */}
      <button
        onClick={() => setOverlayView('quick_actions')}
        aria-label="Quick log"
        className="fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center bg-gradient-to-br from-primary-500 to-accent-500 text-white active:scale-95 transition-transform"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Bottom Navigation — 5 tabs */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-grappler-900/95 backdrop-blur-xl border-t border-grappler-800 safe-area-bottom"
        role="tablist"
        aria-label="Main navigation"
        onKeyDown={handleTabKeyDown}
      >
        <div className="flex items-center justify-around py-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id as TabType)}
              aria-label={tab.label}
              aria-selected={activeTab === tab.id}
              role="tab"
              tabIndex={activeTab === tab.id ? 0 : -1}
              data-tab-id={tab.id}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2',
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

      {/* Version Upgrade Popup */}
      <VersionUpgradePopup />

      {/* Upgrade Prompt (shown when user taps a pro feature) */}
      {upgradeFeature && (
        <UpgradePrompt
          feature={upgradeFeature}
          variant="modal"
          onDismiss={() => setUpgradeFeature(null)}
        />
      )}

      {/* Level-Up Celebration */}
      <AnimatePresence>
        {levelUpDisplay && (
          <LevelUpCelebration
            level={levelUpDisplay}
            onDismiss={() => setLevelUpDisplay(null)}
          />
        )}
      </AnimatePresence>

      {/* Daily Login Bonus Toast */}
      <AnimatePresence>
        {loginBonusToast && (
          <motion.div
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <div
              className={cn(
                'px-5 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 cursor-pointer',
                loginBonusToast.isMysteryDay
                  ? 'bg-gradient-to-r from-sky-500/20 to-purple-500/20 border-sky-500/30'
                  : 'bg-grappler-800 border-grappler-700/50'
              )}
              onClick={() => setLoginBonusToast(null)}
            >
              <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                <span className="text-lg">{loginBonusToast.isMysteryDay ? '🎁' : '✨'}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-grappler-50">
                  {loginBonusToast.isMysteryDay ? 'Mystery Bonus!' : `Day ${loginBonusToast.day} Bonus`}
                </p>
                <p className="text-xs text-grappler-400">
                  +{loginBonusToast.points} XP{loginBonusToast.isMysteryDay ? ' — 7-day streak reward!' : ''}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Permission Prompt */}
      <AnimatePresence>
        {showNotifPrompt && (
          <motion.div
            className="fixed bottom-24 left-4 right-4 z-50"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="bg-grappler-800 rounded-2xl p-4 border border-grappler-700/50 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-5 h-5 text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-grappler-50">Stay on track</p>
                  <p className="text-xs text-grappler-400 mt-0.5">
                    Get streak reminders, daily bonuses, and challenge updates.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    setShowNotifPrompt(false);
                    localStorage.setItem('roots-notif-prompt-dismissed', 'true');
                  }}
                  className="flex-1 py-2 rounded-xl text-xs font-medium text-grappler-400 bg-grappler-700/50"
                >
                  Not now
                </button>
                <button
                  onClick={handleEnableNotifications}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-colors"
                >
                  Enable notifications
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </ToastProvider>
  );
}
