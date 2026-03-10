'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import {
  Dumbbell,
  Calendar,
  BarChart3,
  Plus,
  Flame,
  Star,
  Zap,
  Compass,
  ThumbsUp,
  ThumbsDown,
  Settings,
  Play,
  Timer,
} from 'lucide-react';
import { cn, formatNumber, formatTime } from '@/lib/utils';
import SyncConflictResolver from './SyncConflictResolver';
import SyncStatusIndicator from './SyncStatusIndicator';
import VersionUpgradePopup from './VersionUpgradePopup';
import { getLevelTitle, levelProgress, pointsToNextLevel } from '@/lib/gamification';
import { getEffectiveTier, hasFeatureAccess } from '@/lib/subscription';
import UpgradePrompt from './UpgradePrompt';
// ThemeToggle moved to Settings page — no longer in header
import { ToastProvider } from './Toast';
import { HomeTabSkeleton, ProgramTabSkeleton, ExploreTabSkeleton, ProgressTabSkeleton } from './Skeleton';
import { hapticLight } from '@/lib/haptics';
import type { OverlayView } from './dashboard-types';
import type { TabType } from './dashboard-types';
import type { ContentCategory } from '@/lib/types';
import type { SyncStatus } from '@/lib/useDbSync';

// Core tabs — lazy loaded for smaller initial bundle
const HomeTab = dynamic(() => import('./HomeTab'), { loading: () => <HomeTabSkeleton /> });
const WorkoutView = dynamic(() => import('./WorkoutView'), { loading: () => <ProgramTabSkeleton /> });
const ExploreTab = dynamic(() => import('./ExploreTab'), { loading: () => <ExploreTabSkeleton /> });
const ProgressAndHistoryTab = dynamic(() => import('./ProgressTab'), { loading: () => <ProgressTabSkeleton /> });
// Lazy-loaded — only mount when needed
const ProfileSettings = dynamic(() => import('./ProfileSettings'), { loading: () => <OverlaySkeleton /> });
const ActiveWorkout = dynamic(() => import('./ActiveWorkout'), { ssr: false });

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
const AutoThrottleInfo = dynamic(() => import('./AutoThrottleInfo'), { loading: () => <OverlaySkeleton /> });
const CornerCoachInfo = dynamic(() => import('./CornerCoachInfo'), { loading: () => <OverlaySkeleton /> });
const TrainingLoadDashboard = dynamic(() => import('./TrainingLoadDashboard'), { loading: () => <OverlaySkeleton /> });
const WarmUpInfo = dynamic(() => import('./WarmUpInfo'), { loading: () => <OverlaySkeleton /> });
const PlateCalculator = dynamic(() => import('./PlateCalculator'), { loading: () => <OverlaySkeleton /> });
const CircuitBuilder = dynamic(() => import('./CircuitBuilder'), { loading: () => <OverlaySkeleton /> });
const PhotoProgress = dynamic(() => import('./PhotoProgress'), { loading: () => <OverlaySkeleton /> });
const BreathingProtocols = dynamic(() => import('./BreathingProtocols'), { loading: () => <OverlaySkeleton /> });
const SplitAnalyzer = dynamic(() => import('./SplitAnalyzer'), { loading: () => <OverlaySkeleton /> });
const MovementLibrary = dynamic(() => import('./MovementLibrary'), { loading: () => <OverlaySkeleton /> });
const ConditioningSession = dynamic(() => import('./ConditioningSession'), { loading: () => <OverlaySkeleton /> });
const FightersMind = dynamic(() => import('./FightersMind'), { loading: () => <OverlaySkeleton /> });
const TrainingJournal = dynamic(() => import('./TrainingJournal'), { loading: () => <OverlaySkeleton /> });
const KnowledgeHub = dynamic(() => import('./KnowledgeHub'), { loading: () => <OverlaySkeleton /> });
const ReadyForThis = dynamic(() => import('./ReadyForThis'), { loading: () => <OverlaySkeleton /> });
const WellnessXPDashboardOverlay = dynamic(() => import('./WellnessXPDashboardOverlay'), { loading: () => <OverlaySkeleton /> });

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
  circuit_builder: 'advanced-analytics',
  photo_progress: 'advanced-analytics',
  breathing: 'advanced-analytics',
  split_analyzer: 'advanced-analytics',
  conditioning: 'advanced-analytics',
  fighters_mind: 'advanced-analytics',
  training_journal: 'advanced-analytics',
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
] as const;

interface DashboardProps {
  syncStatus?: SyncStatus;
  lastSyncedAt?: Date | null;
  deviceType?: 'phone' | 'tablet' | 'desktop';
  isAuthenticated?: boolean;
  onForceSync?: () => void;
  syncFailureCount?: number;
}

export default function Dashboard({
  syncStatus = 'idle',
  lastSyncedAt = null,
  deviceType = 'desktop',
  isAuthenticated = false,
  onForceSync,
  syncFailureCount = 0,
}: DashboardProps = {}) {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [overlayView, setOverlayViewRaw] = useState<OverlayView>(null);
  const [overlayContext, setOverlayContext] = useState<string | undefined>(undefined);
  const scrollPositionRef = useRef(0);
  const subscription = useAppStore(s => s.subscription);
  const { data: session } = useSession();
  const [upgradeFeature, setUpgradeFeature] = useState<string | null>(null);
  const [showReadyScreen, setShowReadyScreen] = useState(false);
  const readyScreenSkipped = useRef(false);
  const [feedbackOverlay, setFeedbackOverlay] = useState<string | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackShownThisSession = useRef(false);
  const addFeatureFeedback = useAppStore(s => s.addFeatureFeedback);
  const featureFeedback = useAppStore(s => s.featureFeedback);

  // Routine overlays that never need feedback — these are core utilities
  const ROUTINE_OVERLAYS = new Set([
    'quick_actions', 'nutrition', 'profile_settings', 'builder', 'injury',
    'user_guide', 'plate_calc', 'one_rm', 'wearable',
  ]);

  const setOverlayView = (view: OverlayView, context?: string) => {
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
    // Smart feedback — only ask when it's actually useful
    if (view === null && overlayView && !ROUTINE_OVERLAYS.has(overlayView) && !feedbackShownThisSession.current) {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const alreadyRatedRecently = featureFeedback.some(
        f => f.feature === overlayView && new Date(f.timestamp).getTime() > weekAgo
      );
      if (!alreadyRatedRecently) {
        feedbackShownThisSession.current = true;
        setFeedbackOverlay(overlayView);
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = setTimeout(() => setFeedbackOverlay(null), 4000);
      }
    }
    setOverlayViewRaw(view);
    setOverlayContext(view !== null ? context : undefined);
    if (view === null) {
      // Restore scroll position after closing overlay
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPositionRef.current);
      });
    }
  };
  const [reportMesocycleId, setReportMesocycleId] = useState<string | null>(null);
  const {
    user, gamificationStats, currentMesocycle, activeWorkout, workoutMinimized, resumeWorkout,
    workoutLogs, mesocycleHistory, deleteMesocycle,
    syncConflict, resolveSyncConflict, dismissSyncConflict,
    ensureWeeklyChallenge, lastCompletedWorkout,
  } = useAppStore(
    useShallow(s => ({
      user: s.user, gamificationStats: s.gamificationStats, currentMesocycle: s.currentMesocycle, activeWorkout: s.activeWorkout,
      workoutMinimized: s.workoutMinimized, resumeWorkout: s.resumeWorkout,
      workoutLogs: s.workoutLogs, mesocycleHistory: s.mesocycleHistory, deleteMesocycle: s.deleteMesocycle,
      syncConflict: s.syncConflict, resolveSyncConflict: s.resolveSyncConflict, dismissSyncConflict: s.dismissSyncConflict,
      ensureWeeklyChallenge: s.ensureWeeklyChallenge, lastCompletedWorkout: s.lastCompletedWorkout,
    }))
  );

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

  // Show Ready for This when workout starts
  const prevActiveWorkoutRef = useRef(activeWorkout);
  useEffect(() => {
    if (activeWorkout && !prevActiveWorkoutRef.current) {
      setShowReadyScreen(true);
    }
    if (!activeWorkout) {
      readyScreenSkipped.current = false; // Reset for next workout
    }
    prevActiveWorkoutRef.current = activeWorkout;
  }, [activeWorkout]);

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

  if (activeWorkout && !workoutMinimized) {
    // Show "Ready for This" interstitial on workout start (unless skipped)
    if (showReadyScreen && !readyScreenSkipped.current && !activeWorkout.preCheckIn) {
      return (
        <ReadyForThis
          onProceed={() => setShowReadyScreen(false)}
          onSkip={() => { readyScreenSkipped.current = true; setShowReadyScreen(false); }}
        />
      );
    }
    return <ActiveWorkout />;
  }

  // Full-screen overlay views — wrapped in overlay-safe for status bar clearance
  {
    const closeOverlay = () => setOverlayView(null);
    const OVERLAY_COMPONENTS: Record<string, React.ReactNode> = {
      builder: <WorkoutBuilder onClose={closeOverlay} />,
      nutrition: <NutritionTracker onClose={closeOverlay} />,
      wearable: <WearableIntegration onClose={closeOverlay} />,
      competition: <CompetitionPrep onClose={closeOverlay} />,
      mobility: <MobilityWorkouts onClose={closeOverlay} />,
      coach: <WeeklyCoach onClose={closeOverlay} />,
      profiler: <ExerciseProfiler onClose={closeOverlay} />,
      strength: <StrengthAnalysis onClose={closeOverlay} />,
      periodization: <PeriodizationCalendar onClose={closeOverlay} />,
      recovery: <RecoveryDashboard onClose={closeOverlay} />,
      injury: <InjuryLogger onClose={closeOverlay} />,
      overload: <ProgressiveOverload onClose={closeOverlay} />,
      custom_exercise: <CustomExerciseCreator onClose={closeOverlay} />,
      one_rm: <OneRepMaxCalc onClose={closeOverlay} />,
      hr_zones: <HRZoneTraining onClose={closeOverlay} />,
      templates: <SessionTemplates onClose={closeOverlay} />,
      volume_map: <VolumeHeatMap onClose={closeOverlay} />,
      grappling: <GrapplingTracker onClose={closeOverlay} />,
      community_share: <CommunityShare onClose={closeOverlay} />,
      quick_actions: <QuickActions onClose={closeOverlay} />,
      grip_strength: <GripStrengthModule onClose={closeOverlay} />,
      recovery_coach: <RecoveryCoach onClose={closeOverlay} />,
      block_suggestion: <BlockSuggestionView onClose={closeOverlay} />,
      user_guide: <NewUserGuide onComplete={closeOverlay} />,
      illness: <IllnessLogger onClose={closeOverlay} />,
      cycle_tracking: <CycleTracking onClose={closeOverlay} />,
      fatigue: <FatigueOverlay onClose={closeOverlay} />,
      fight_camp: <FightCampNutrition onClose={closeOverlay} />,
      badge_showcase: <BadgeShowcase onClose={closeOverlay} />,
      wellness_xp: <WellnessXPDashboardOverlay onClose={closeOverlay} />,
      auto_throttle: <AutoThrottleInfo onClose={closeOverlay} />,
      corner_coach: <CornerCoachInfo onClose={closeOverlay} />,
      training_load: <TrainingLoadDashboard onClose={closeOverlay} />,
      warm_up: <WarmUpInfo onClose={closeOverlay} />,
      plate_calc: <PlateCalculator onClose={closeOverlay} />,
      circuit_builder: <CircuitBuilder onClose={closeOverlay} />,
      photo_progress: <PhotoProgress onClose={closeOverlay} />,
      breathing: <BreathingProtocols onClose={closeOverlay} />,
      split_analyzer: <SplitAnalyzer onClose={closeOverlay} />,
      movement_library: <MovementLibrary onClose={closeOverlay} />,
      conditioning: <ConditioningSession onClose={closeOverlay} />,
      fighters_mind: <FightersMind onClose={closeOverlay} />,
      training_journal: <TrainingJournal onClose={closeOverlay} />,
      knowledge_hub: <KnowledgeHub onClose={closeOverlay} initialCategory={overlayContext as ContentCategory | undefined} />,
      profile_settings: <ProfileSettings onClose={closeOverlay} />,
    };
    const overlayContent = overlayView ? OVERLAY_COMPONENTS[overlayView] : null;
    if (overlayContent) return <div className="overlay-safe">{overlayContent}</div>;
  }

  // Mesocycle report overlay
  if (reportMesocycleId) {
    const allMesos = [...mesocycleHistory, ...(currentMesocycle ? [currentMesocycle] : [])];
    const targetMeso = allMesos.find(m => m.id === reportMesocycleId);
    if (targetMeso) {
      const targetIdx = allMesos.indexOf(targetMeso);
      const prevMeso = targetIdx > 0 ? allMesos[targetIdx - 1] : null;
      return (
        <div className="overlay-safe">
        <MesocycleReportView
          mesocycle={targetMeso}
          workoutLogs={workoutLogs}
          previousMesocycle={prevMeso}
          weightUnit={user?.weightUnit || 'lbs'}
          onClose={() => setReportMesocycleId(null)}
          onDelete={(id) => { deleteMesocycle(id); setReportMesocycleId(null); }}
        />
        </div>
      );
    }
  }

  return (
    <ToastProvider>
    <div className="min-h-[100dvh] w-full overflow-x-hidden bg-grappler-900 bg-mesh pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-grappler-900/80 backdrop-blur-xl border-b border-grappler-800 safe-area-top">
        {/* Row 1: Identity + Key Actions */}
        <div className="px-4 pt-3 pb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 flex-shrink-0 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base text-grappler-50 leading-tight">Roots Gains</h1>
              <p className="text-[11px] text-grappler-400">{getLevelTitle(gamificationStats.level)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Streak — the hero motivator */}
            <div className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-xl transition-colors',
              gamificationStats.currentStreak >= 7
                ? 'bg-orange-500/20 border border-orange-500/30'
                : streakAtRisk
                  ? 'bg-blue-500/20 border border-blue-500/40 animate-pulse'
                  : 'bg-grappler-800/80'
            )}>
              <Flame className={cn(
                'w-4 h-4',
                gamificationStats.currentStreak >= 7 ? 'text-orange-400' : streakAtRisk ? 'text-blue-400' : 'text-orange-500'
              )} />
              <span className={cn(
                'text-sm font-bold tabular-nums',
                gamificationStats.currentStreak >= 7 ? 'text-orange-300' : streakAtRisk ? 'text-blue-300' : 'text-grappler-100'
              )}>
                {gamificationStats.currentStreak}
              </span>
            </div>
            {/* Settings */}
            <button
              onClick={() => setOverlayView('profile_settings')}
              className="w-9 h-9 rounded-xl bg-grappler-800/80 flex items-center justify-center hover:bg-grappler-700 transition-colors active:scale-95"
              title="Profile & Settings"
              aria-label="Profile & Settings"
            >
              <Settings className="w-[18px] h-[18px] text-grappler-400" />
            </button>
          </div>
        </div>
        {/* Row 2: Level progress — full width, compact */}
        <div className="px-4 pb-2.5 flex items-center gap-2.5">
          <button
            onClick={() => setOverlayView('badge_showcase')}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-grappler-800/60 hover:bg-grappler-700/60 transition-colors flex-shrink-0"
            title="View badges"
          >
            <Star className="w-3 h-3 text-yellow-500" />
            <span className="text-[11px] font-bold text-grappler-300">Lv.{gamificationStats.level}</span>
          </button>
          <div className="flex-1 h-1.5 bg-grappler-800 rounded-full overflow-hidden" title={`${formatNumber(gamificationStats.totalPoints)} total XP · ${pointsToNextLevel(gamificationStats.totalPoints)} to Lv.${gamificationStats.level + 1}`}>
            <motion.div
              className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
              initial={false}
              animate={{ width: `${levelProgress(gamificationStats.totalPoints)}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <span className="text-[11px] text-grappler-500 tabular-nums flex-shrink-0">{formatNumber(gamificationStats.totalPoints)} XP</span>
          <SyncStatusIndicator
            syncStatus={syncStatus}
            lastSyncedAt={lastSyncedAt}
            deviceType={deviceType}
            isAuthenticated={isAuthenticated}
            onForceSync={onForceSync || (() => {})}
            syncFailureCount={syncFailureCount}
          />
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
              <WorkoutView />
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
        </AnimatePresence>
      </main>

      {/* Paused Workout Resume Banner */}
      {activeWorkout && workoutMinimized && (
        <button
          onClick={resumeWorkout}
          className="fixed bottom-[68px] left-3 right-3 z-30 safe-area-bottom will-change-transform"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between bg-primary-500 hover:bg-primary-600 active:scale-[0.98] transition-all rounded-2xl px-4 py-3 shadow-lg shadow-primary-500/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Play className="w-5 h-5 text-white fill-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-white">{activeWorkout.session.name}</p>
                <p className="text-xs text-white/70 flex items-center gap-1">
                  <Timer className="w-3 h-3" />
                  {formatTime(Math.floor((Date.now() - new Date(activeWorkout.startTime).getTime()) / 60000))} elapsed
                </p>
              </div>
            </div>
            <span className="text-sm font-semibold text-white/90">Resume</span>
          </motion.div>
        </button>
      )}

      {/* Bottom Navigation — Home, Program, [+], Explore, Progress */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-20 bg-grappler-900/95 backdrop-blur-xl border-t border-grappler-800 safe-area-bottom will-change-transform"
        role="tablist"
        aria-label="Main navigation"
        onKeyDown={handleTabKeyDown}
      >
        <div className="grid grid-cols-5 items-center py-1 px-2 sm:px-4">
          {/* Left tabs: Home, Program */}
          {TABS.slice(0, 2).map((tab) => (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id as TabType)}
              aria-label={tab.label}
              aria-selected={activeTab === tab.id}
              role="tab"
              tabIndex={activeTab === tab.id ? 0 : -1}
              data-tab-id={tab.id}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-all focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2',
                activeTab === tab.id
                  ? 'text-primary-400'
                  : 'text-grappler-500 hover:text-grappler-300'
              )}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 w-10 h-0.5 bg-primary-500 rounded-full"
                />
              )}
            </button>
          ))}

          {/* Center: raised "+" button anchored in-flow, protruding above */}
          <div className="flex justify-center">
            <button
              onClick={() => setOverlayView('quick_actions')}
              aria-label="Quick log"
              className="relative -top-4 w-12 h-12 rounded-full shadow-lg shadow-primary-500/30 flex items-center justify-center bg-gradient-to-br from-primary-500 to-accent-500 text-white active:scale-95 transition-transform ring-[3px] ring-grappler-900"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Right tabs: Explore, Progress */}
          {TABS.slice(2).map((tab) => (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id as TabType)}
              aria-label={tab.label}
              aria-selected={activeTab === tab.id}
              role="tab"
              tabIndex={activeTab === tab.id ? 0 : -1}
              data-tab-id={tab.id}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-all focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2',
                activeTab === tab.id
                  ? 'text-primary-400'
                  : 'text-grappler-500 hover:text-grappler-300'
              )}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
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

      {/* Was This Worth It — Overlay Feedback Toast */}
      <AnimatePresence>
        {feedbackOverlay && (
          <motion.div
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 safe-area-top"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <div className="flex items-center gap-3 bg-grappler-800 border border-grappler-700/50 rounded-2xl px-4 py-2.5 shadow-2xl">
              <span className="text-xs text-grappler-400 whitespace-nowrap">Worth it?</span>
              <button
                onClick={() => {
                  hapticLight();
                  addFeatureFeedback(feedbackOverlay, 'up');
                  setFeedbackOverlay(null);
                }}
                className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-90 transition-all"
                aria-label="Thumbs up"
              >
                <ThumbsUp className="w-4 h-4 text-emerald-400" />
              </button>
              <button
                onClick={() => {
                  hapticLight();
                  addFeatureFeedback(feedbackOverlay, 'down');
                  setFeedbackOverlay(null);
                }}
                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 active:scale-90 transition-all"
                aria-label="Thumbs down"
              >
                <ThumbsDown className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </motion.div>
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
