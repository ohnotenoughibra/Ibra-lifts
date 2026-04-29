'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
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
  Sun,
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
import CardErrorBoundary from './CardErrorBoundary';
import MorningRitual, { shouldShowRitual } from './MorningRitual';
import { hapticLight } from '@/lib/haptics';
import type { OverlayView } from './dashboard-types';
import type { TabType } from './dashboard-types';
import type { ContentCategory } from '@/lib/types';
import type { SyncStatus } from '@/lib/useDbSync';
import { useComputedGamification } from '@/lib/computed-gamification';

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
const RehabPlan = dynamic(() => import('./RehabPlan'), { loading: () => <OverlaySkeleton /> });
const InjuryAwareWorkout = dynamic(() => import('./InjuryAwareWorkout'), { loading: () => <OverlaySkeleton /> });
const PlyometricsBlock = dynamic(() => import('./PlyometricsBlock'), { loading: () => <OverlaySkeleton /> });
const AthleticBenchmarks = dynamic(() => import('./AthleticBenchmarks'), { loading: () => <OverlaySkeleton /> });
const EnergySystems = dynamic(() => import('./EnergySystems'), { loading: () => <OverlaySkeleton /> });
const TechniqueLog = dynamic(() => import('./TechniqueLog'), { loading: () => <OverlaySkeleton /> });
const CampTimeline = dynamic(() => import('./CampTimeline'), { loading: () => <OverlaySkeleton /> });
const CoachReport = dynamic(() => import('./CoachReport'), { loading: () => <OverlaySkeleton /> });
const SparringTracker = dynamic(() => import('./SparringTracker'), { loading: () => <OverlaySkeleton /> });
const ToolLauncher = dynamic(() => import('./ToolLauncher'), { loading: () => null });
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
const RecoveryHubView = dynamic(() => import('./RecoveryHub'), { loading: () => <OverlaySkeleton /> });
const ProgramBrowserView = dynamic(() => import('./ProgramBrowser'), { loading: () => <OverlaySkeleton /> });
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
  // block_suggestion and program_browser are free — no gate
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
      onKeyDown={(e) => { if (e.key === 'Escape') onDismiss(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`Level up — Level ${level}`}
      tabIndex={-1}
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
          className="w-20 h-20 bg-gradient-to-br from-sky-400 to-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4 shadow-lg shadow-yellow-500/30"
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
  { id: 'home',  icon: Sun,       label: 'Today' },
  { id: 'train', icon: Calendar,  label: 'Train' },
  { id: 'body',  icon: BarChart3, label: 'Body' },
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
  const computed = useComputedGamification();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [overlayView, setOverlayViewRaw] = useState<OverlayView>(null);
  const [overlayContext, setOverlayContext] = useState<string | undefined>(undefined);
  // Stack of previous overlays for back-navigation (e.g. InjuryLogger → Rehab → tap close → goes back to InjuryLogger)
  const [overlayHistory, setOverlayHistory] = useState<{ view: NonNullable<OverlayView>; context?: string }[]>([]);
  // Universal Tool Launcher (4th nav slot). Bottom sheet with recents + pinned + all tools + quick log.
  const [showToolLauncher, setShowToolLauncher] = useState(false);
  const scrollPositionRef = useRef(0);

  // iOS-correct body scroll lock. Plain `overflow:hidden` resets scroll on iOS
  // Safari (the visible page jumps to top when you close the overlay).
  // Canonical pattern: snapshot scrollY, fix the body at top:-scrollY, restore on close.
  useEffect(() => {
    if (!overlayView) return;
    const savedY = window.scrollY;
    const body = document.body;
    body.style.position = 'fixed';
    body.style.top = `-${savedY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    return () => {
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.width = '';
      // Defer to next frame so layout settles before scroll restoration
      requestAnimationFrame(() => window.scrollTo(0, savedY));
    };
  }, [overlayView]);
  const subscription = useAppStore(s => s.subscription);
  const { data: session } = useSession();
  const [upgradeFeature, setUpgradeFeature] = useState<string | null>(null);
  const [showReadyScreen, setShowReadyScreen] = useState(false);
  const readyScreenSkipped = useRef(false);

  // ── Morning Ritual — once-per-day readiness reveal ──
  const [showMorningRitual, setShowMorningRitual] = useState(false);
  useEffect(() => {
    // Only show on home tab, only when user exists (onboarding complete)
    if (user && activeTab === 'home' && shouldShowRitual()) {
      setShowMorningRitual(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [feedbackOverlay, setFeedbackOverlay] = useState<string | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackShownThisSession = useRef(false);
  const addFeatureFeedback = useAppStore(s => s.addFeatureFeedback);
  const featureFeedback = useAppStore(s => s.featureFeedback);

  // ── Swipe-down-to-dismiss for overlays ──
  const [overlayDragY, setOverlayDragY] = useState(0);
  const overlayTouchStartY = useRef(0);
  const overlayDragging = useRef(false);

  const handleOverlayTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    const container = target.closest('[data-overlay-container]');
    if (container && container.scrollTop <= 0) {
      overlayTouchStartY.current = e.touches[0].clientY;
      overlayDragging.current = true;
    }
  }, []);

  const handleOverlayTouchMove = useCallback((e: React.TouchEvent) => {
    if (!overlayDragging.current) return;
    const deltaY = e.touches[0].clientY - overlayTouchStartY.current;
    if (deltaY > 0) {
      setOverlayDragY(deltaY);
    }
  }, []);

  const handleOverlayTouchEnd = useCallback(() => {
    if (overlayDragY > 150) {
      setOverlayView(null);
    }
    setOverlayDragY(0);
    overlayDragging.current = false;
  }, [overlayDragY]); // eslint-disable-line react-hooks/exhaustive-deps

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
      // If there's already an overlay open, push it onto the back stack
      // so that closing the new one returns to the previous (e.g. Injury → Rehab → back).
      if (overlayView && overlayView !== view) {
        setOverlayHistory(prev => [...prev, { view: overlayView, context: overlayContext }]);
      }
      // Save scroll position before opening overlay
      scrollPositionRef.current = window.scrollY;
    } else {
      // Closing — clear the back stack since user explicitly chose to exit
      setOverlayHistory([]);
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
    // Scroll restoration is handled by the body-scroll-lock useEffect cleanup,
    // which uses the canonical iOS position:fixed pattern (more reliable than scrollTo).
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
      workoutLogs: s.workoutLogs, mesocycleHistory: s.mesocycleHistory.filter(m => !m._deleted), deleteMesocycle: s.deleteMesocycle,
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

  // FAB "+" tooltip — shown once for new users who haven't tapped it yet
  const [fabTooltipDismissed, setFabTooltipDismissed] = useState(true); // default true to avoid flash
  const [showFabTooltip, setShowFabTooltip] = useState(false);
  useEffect(() => {
    const alreadyShown = localStorage.getItem('roots-fab-tooltip-shown');
    if (!alreadyShown && user) {
      setFabTooltipDismissed(false);
      // Slight delay so the nav renders first, then tooltip appears
      const timer = setTimeout(() => setShowFabTooltip(true), 1200);
      // Auto-dismiss after 6 seconds if user doesn't interact
      const autoDismiss = setTimeout(() => {
        setShowFabTooltip(false);
        setFabTooltipDismissed(true);
        localStorage.setItem('roots-fab-tooltip-shown', 'true');
      }, 7200);
      return () => { clearTimeout(timer); clearTimeout(autoDismiss); };
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  // When dismissed, hide the tooltip
  useEffect(() => {
    if (fabTooltipDismissed) setShowFabTooltip(false);
  }, [fabTooltipDismissed]);

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
    if (user && computed.totalWorkouts > 0) {
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
      computed.totalWorkouts >= 3 &&
      !localStorage.getItem('roots-notif-prompt-dismissed')
    ) {
      const timer = setTimeout(() => setShowNotifPrompt(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [computed.totalWorkouts, notificationPreferences.enabled]);

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
  const prevLevelRef = useRef(computed.level);
  useEffect(() => {
    if (computed.level > prevLevelRef.current && prevLevelRef.current > 0) {
      setLevelUpDisplay(computed.level);
    }
    prevLevelRef.current = computed.level;
  }, [computed.level]);

  // ── Escape key closes any open overlay ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (overlayView) {
          setOverlayView(null);
        } else if (upgradeFeature) {
          setUpgradeFeature(null);
        } else if (levelUpDisplay) {
          setLevelUpDisplay(null);
        } else if (reportMesocycleId) {
          setReportMesocycleId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [overlayView, upgradeFeature, levelUpDisplay, reportMesocycleId]);

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
  const streakAtRisk = computed.currentStreak > 0 && (() => {
    const todayStr = new Date().toDateString();
    const trainedToday = workoutLogs.some(l => new Date(l.date).toDateString() === todayStr);
    return !trainedToday;
  })();

  // ── Schedule streak reminder if at risk ──
  useEffect(() => {
    if (streakAtRisk && notificationPreferences.enabled && notificationPreferences.streakAlerts) {
      import('@/lib/notifications').then(({ scheduleStreakReminder }) => {
        scheduleStreakReminder(computed.currentStreak);
      });
    }
  }, [streakAtRisk, notificationPreferences.enabled, notificationPreferences.streakAlerts, computed.currentStreak]);

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
    const closeOverlay = () => {
      // If there's a back-stack entry, pop to it (Injury → Rehab → close goes back to Injury)
      if (overlayHistory.length > 0) {
        const previous = overlayHistory[overlayHistory.length - 1];
        setOverlayHistory(prev => prev.slice(0, -1));
        setOverlayContext(previous.context);
        setOverlayViewRaw(previous.view);
        return;
      }
      setOverlayView(null);
    };
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
      recovery: <RecoveryHubView onClose={closeOverlay} initialTab="analytics" />,
      injury: <InjuryLogger onClose={closeOverlay} onNavigate={setOverlayView} />,
      rehab: <RehabPlan onClose={closeOverlay} preselectedInjuryId={overlayContext} />,
      injury_aware_workout: <InjuryAwareWorkout onClose={closeOverlay} />,
      plyometrics: <PlyometricsBlock onClose={closeOverlay} />,
      athletic_benchmarks: <AthleticBenchmarks onClose={closeOverlay} onNavigate={setOverlayView} />,
      energy_systems: <EnergySystems onClose={closeOverlay} />,
      technique_log: <TechniqueLog onClose={closeOverlay} />,
      camp_timeline: <CampTimeline onClose={closeOverlay} />,
      coach_report: <CoachReport onClose={closeOverlay} />,
      sparring_tracker: <SparringTracker onClose={closeOverlay} />,
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
      recovery_coach: <RecoveryHubView onClose={closeOverlay} />,
      recovery_hub: <RecoveryHubView onClose={closeOverlay} />,
      block_suggestion: <ProgramBrowserView onClose={closeOverlay} onNavigate={setOverlayView} />,
      program_browser: <ProgramBrowserView onClose={closeOverlay} onNavigate={setOverlayView} />,
      user_guide: <NewUserGuide onComplete={closeOverlay} />,
      illness: <IllnessLogger onClose={closeOverlay} />,
      cycle_tracking: <CycleTracking onClose={closeOverlay} />,
      fatigue: <RecoveryHubView onClose={closeOverlay} initialTab="deload" />,
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
      knowledge_hub: <KnowledgeHub onClose={closeOverlay} initialCategory={overlayContext as ContentCategory | undefined} onNavigate={setOverlayView} />,
      profile_settings: <ProfileSettings onClose={closeOverlay} />,
    };
    const overlayContent = overlayView ? OVERLAY_COMPONENTS[overlayView] : null;
    if (overlayContent) return (
      <div
        className="overlay-safe"
        data-overlay-container
        style={{
          transform: overlayDragY > 0 ? `translateY(${overlayDragY}px)` : undefined,
          transition: overlayDragY === 0 ? 'transform 0.3s ease' : 'none',
        }}
        onTouchStart={handleOverlayTouchStart}
        onTouchMove={handleOverlayTouchMove}
        onTouchEnd={handleOverlayTouchEnd}
      >
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-grappler-600" />
        </div>
        {overlayContent}
      </div>
    );
  }

  // Mesocycle report overlay
  if (reportMesocycleId) {
    const allMesos = [...mesocycleHistory, ...(currentMesocycle ? [currentMesocycle] : [])];
    const targetMeso = allMesos.find(m => m.id === reportMesocycleId);
    if (targetMeso) {
      const targetIdx = allMesos.indexOf(targetMeso);
      const prevMeso = targetIdx > 0 ? allMesos[targetIdx - 1] : null;
      return (
        <div
          className="overlay-safe"
          data-overlay-container
          style={{
            transform: overlayDragY > 0 ? `translateY(${overlayDragY}px)` : undefined,
            transition: overlayDragY === 0 ? 'transform 0.3s ease' : 'none',
          }}
          onTouchStart={handleOverlayTouchStart}
          onTouchMove={handleOverlayTouchMove}
          onTouchEnd={handleOverlayTouchEnd}
        >
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-grappler-600" />
          </div>
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

  // Sidebar nav items (matches TABS + profile)
  const sidebarNav = [
    { id: 'home'  as TabType, icon: Sun,       label: 'Today' },
    { id: 'train' as TabType, icon: Calendar,  label: 'Train' },
    { id: 'body'  as TabType, icon: BarChart3, label: 'Body' },
  ];

  return (
    <MotionConfig reducedMotion="user">
    <ToastProvider>
    <div className="min-h-[100dvh] w-full overflow-x-hidden bg-grappler-900 bg-mesh pb-40 safe-area-bottom lg:pb-0">
      {/* Morning Ritual — once-per-day readiness reveal animation */}
      <AnimatePresence>
        {showMorningRitual && activeTab === 'home' && (
          <MorningRitual
            onComplete={() => setShowMorningRitual(false)}
          />
        )}
      </AnimatePresence>

      <div className="max-w-screen-2xl mx-auto lg:flex lg:min-h-[100dvh]">

        {/* ── Desktop Sidebar (lg+) ── */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:flex-shrink-0 lg:sticky lg:top-0 lg:h-[100dvh] lg:border-r lg:border-grappler-800 lg:bg-grappler-950/80 lg:backdrop-blur-xl lg:z-40">
          {/* Editorial wordmark — no logo glyph, no glow shadow, no gradient */}
          <div className="px-5 pt-6 pb-5">
            <div className="font-display text-2xl font-black tracking-tight leading-none text-white">
              IBRA<br />LIFTS<span className="text-primary-500">.</span>
            </div>
            <div className="h-px bg-grappler-800 mt-4" />
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-2 space-y-1" role="tablist" aria-label="Main navigation" onKeyDown={handleTabKeyDown}>
            {sidebarNav.map((tab) => (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                aria-label={tab.label}
                aria-selected={activeTab === tab.id}
                role="tab"
                tabIndex={activeTab === tab.id ? 0 : -1}
                data-tab-id={tab.id}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2',
                  activeTab === tab.id
                    ? 'bg-primary-500/15 text-primary-400'
                    : 'text-grappler-400 hover:text-grappler-200 hover:bg-grappler-800/60'
                )}
              >
                <tab.icon className="w-5 h-5 flex-shrink-0" />
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="sidebarActive"
                    className="absolute left-0 w-1 h-6 bg-primary-500 rounded-r-full"
                  />
                )}
              </button>
            ))}

            {/* Quick Actions button */}
            <button
              onClick={() => setOverlayView('quick_actions')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-grappler-400 hover:text-grappler-200 hover:bg-grappler-800/60 transition-all mt-2"
            >
              <div className="w-5 h-5 flex-shrink-0 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Plus className="w-3 h-3 text-white" />
              </div>
              <span>Quick Log</span>
            </button>
          </nav>

          {/* Sidebar Footer: Level + XP + Settings */}
          <div className="px-3 pb-4 space-y-3 border-t border-grappler-800/60 pt-3">
            {/* XP Progress */}
            <div className="px-2">
              <div className="flex items-center justify-between mb-1.5">
                <button
                  onClick={() => setOverlayView('badge_showcase')}
                  className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                  title="View badges"
                >
                  <Star className="w-3.5 h-3.5 text-yellow-500" />
                  <span className="text-xs font-bold text-grappler-300">Lv.{computed.level}</span>
                </button>
                <span className="text-xs text-grappler-500 tabular-nums">{formatNumber(computed.totalPoints)} XP</span>
              </div>
              <div className="h-1.5 bg-grappler-800 rounded-full overflow-hidden" title={`${formatNumber(computed.totalPoints)} total XP · ${pointsToNextLevel(computed.totalPoints)} to Lv.${computed.level + 1}`}>
                <motion.div
                  className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
                  initial={false}
                  animate={{ width: `${levelProgress(computed.totalPoints)}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
              <p className="text-xs text-grappler-600 mt-1">{getLevelTitle(computed.level)}</p>
            </div>

            {/* Streak + Sync + Settings row */}
            <div className="flex items-center justify-between px-2">
              <div className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-lg transition-colors',
                computed.currentStreak >= 7
                  ? 'bg-orange-500/20 border border-orange-500/30'
                  : streakAtRisk
                    ? 'bg-blue-500/20 border border-blue-500/40 animate-pulse'
                    : 'bg-grappler-800/80'
              )}>
                <Flame className={cn(
                  'w-3.5 h-3.5',
                  computed.currentStreak >= 7 ? 'text-orange-400' : streakAtRisk ? 'text-blue-400' : 'text-orange-500'
                )} />
                <span className={cn(
                  'text-xs font-bold tabular-nums',
                  computed.currentStreak >= 7 ? 'text-orange-300' : streakAtRisk ? 'text-blue-300' : 'text-grappler-100'
                )}>
                  {computed.currentStreak}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <SyncStatusIndicator
                  syncStatus={syncStatus}
                  lastSyncedAt={lastSyncedAt}
                  deviceType={deviceType}
                  isAuthenticated={isAuthenticated}
                  onForceSync={onForceSync || (() => {})}
                  syncFailureCount={syncFailureCount}
                />
                <button
                  onClick={() => setOverlayView('profile_settings')}
                  className="w-8 h-8 rounded-lg bg-grappler-800/80 flex items-center justify-center hover:bg-grappler-700 transition-colors active:scale-95"
                  title="Profile & Settings"
                  aria-label="Profile & Settings"
                >
                  <Settings className="w-4 h-4 text-grappler-400" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main Content Column ── */}
        <div className="flex-1 min-w-0 lg:flex">
          <div className="flex-1 min-w-0 lg:max-w-4xl">
            {/* Mobile Header (hidden on desktop — sidebar replaces it) */}
            <header className="sticky top-0 z-40 bg-grappler-900 border-b border-grappler-800 safe-area-top lg:hidden">
              {/* Row 1: Editorial wordmark + key actions */}
              <div className="px-4 pt-3 pb-1.5 flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <div className="font-display font-black text-lg leading-none tracking-tight text-white">
                    IBRA / LIFTS<span className="text-primary-500">.</span>
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-grappler-500">{getLevelTitle(computed.level)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Streak — the hero motivator */}
                  <div className={cn(
                    'flex items-center gap-1 px-2.5 py-1.5 rounded-xl transition-colors',
                    computed.currentStreak >= 7
                      ? 'bg-orange-500/20 border border-orange-500/30'
                      : streakAtRisk
                        ? 'bg-blue-500/20 border border-blue-500/40 animate-pulse'
                        : 'bg-grappler-800/80'
                  )}>
                    <Flame className={cn(
                      'w-4 h-4',
                      computed.currentStreak >= 7 ? 'text-orange-400' : streakAtRisk ? 'text-blue-400' : 'text-orange-500'
                    )} />
                    <span className={cn(
                      'text-sm font-bold tabular-nums',
                      computed.currentStreak >= 7 ? 'text-orange-300' : streakAtRisk ? 'text-blue-300' : 'text-grappler-100'
                    )}>
                      {computed.currentStreak}
                    </span>
                  </div>
                  {/* Cloud sync — moved here for PWA visibility (was hidden in XP bar) */}
                  <SyncStatusIndicator
                    syncStatus={syncStatus}
                    lastSyncedAt={lastSyncedAt}
                    deviceType={deviceType}
                    isAuthenticated={isAuthenticated}
                    onForceSync={onForceSync || (() => {})}
                    syncFailureCount={syncFailureCount}
                  />
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
                  <span className="text-xs font-bold text-grappler-300">Lv.{computed.level}</span>
                </button>
                <div className="flex-1 h-1.5 bg-grappler-800 rounded-full overflow-hidden" title={`${formatNumber(computed.totalPoints)} total XP · ${pointsToNextLevel(computed.totalPoints)} to Lv.${computed.level + 1}`}>
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
                    initial={false}
                    animate={{ width: `${levelProgress(computed.totalPoints)}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-xs text-grappler-500 tabular-nums flex-shrink-0">{formatNumber(computed.totalPoints)} XP</span>
              </div>
            </header>

            {/* Desktop: minimal top bar with sync + streak (no full header) */}
            <header className="hidden lg:flex sticky top-0 z-40 bg-grappler-900 border-b border-grappler-800 px-6 py-3 items-center justify-between">
              <h2 className="text-lg font-bold text-grappler-100">
                {TABS.find(t => t.id === activeTab)?.label ?? 'Home'}
              </h2>
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 rounded-xl transition-colors',
                  computed.currentStreak >= 7
                    ? 'bg-orange-500/20 border border-orange-500/30'
                    : streakAtRisk
                      ? 'bg-blue-500/20 border border-blue-500/40 animate-pulse'
                      : 'bg-grappler-800/80'
                )}>
                  <Flame className={cn(
                    'w-4 h-4',
                    computed.currentStreak >= 7 ? 'text-orange-400' : streakAtRisk ? 'text-blue-400' : 'text-orange-500'
                  )} />
                  <span className={cn(
                    'text-sm font-bold tabular-nums',
                    computed.currentStreak >= 7 ? 'text-orange-300' : streakAtRisk ? 'text-blue-300' : 'text-grappler-100'
                  )}>
                    {computed.currentStreak}
                  </span>
                </div>
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

            {/* Main Content — pb-32 clears the 67px fixed bottom nav + safe-area + breathing room. lg:pb-6 because desktop sidebar replaces the bottom nav. */}
            <main className="px-4 pt-4 pb-32 lg:px-6 lg:pt-6 lg:pb-6">
              <AnimatePresence mode="wait">
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
                {activeTab === 'train' && (
                  <motion.div
                    key="train"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <CardErrorBoundary fallbackLabel="Train tab">
                      <WorkoutView onSwitchTab={setActiveTab} />
                    </CardErrorBoundary>
                    <div className="mt-6">
                      <ExploreTab onNavigate={setOverlayView} filterTab="train" />
                    </div>
                  </motion.div>
                )}
                {activeTab === 'body' && (
                  <motion.div
                    key="body"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <ProgressAndHistoryTab onViewReport={setReportMesocycleId} onNavigate={setOverlayView} />
                    <div className="mt-6">
                      <ExploreTab onNavigate={setOverlayView} filterTab="body" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </main>
          </div>

          {/* ── Desktop Right Sidebar (lg+, Home tab only) ── */}
          {activeTab === 'home' && (
            <aside className="hidden lg:block lg:w-80 lg:flex-shrink-0 lg:border-l lg:border-grappler-800 lg:sticky lg:top-0 lg:h-[100dvh] lg:overflow-y-auto">
              <div className="p-5 space-y-5">
                {/* Quick Stats */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-grappler-500 uppercase tracking-wider">Quick Stats</h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-grappler-800/50 rounded-xl p-3 border border-grappler-800">
                      <p className="text-xs text-grappler-500">Workouts</p>
                      <p className="text-lg font-bold text-grappler-100 tabular-nums">{computed.totalWorkouts}</p>
                    </div>
                    <div className="bg-grappler-800/50 rounded-xl p-3 border border-grappler-800">
                      <p className="text-xs text-grappler-500">Streak</p>
                      <p className="text-lg font-bold text-grappler-100 tabular-nums flex items-center gap-1">
                        <Flame className="w-4 h-4 text-orange-500" />
                        {computed.currentStreak}
                      </p>
                    </div>
                    <div className="bg-grappler-800/50 rounded-xl p-3 border border-grappler-800">
                      <p className="text-xs text-grappler-500">Level</p>
                      <p className="text-lg font-bold text-grappler-100 tabular-nums flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500" />
                        {computed.level}
                      </p>
                    </div>
                    <div className="bg-grappler-800/50 rounded-xl p-3 border border-grappler-800">
                      <p className="text-xs text-grappler-500">Total XP</p>
                      <p className="text-lg font-bold text-grappler-100 tabular-nums">{formatNumber(computed.totalPoints)}</p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-grappler-500 uppercase tracking-wider">Quick Actions</h3>
                  <div className="space-y-1.5">
                    <button
                      onClick={() => setOverlayView('quick_actions')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-primary-500/10 to-accent-500/10 border border-primary-500/20 text-sm font-medium text-primary-400 hover:from-primary-500/20 hover:to-accent-500/20 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Start Workout
                    </button>
                    <button
                      onClick={() => setOverlayView('nutrition')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-grappler-800/50 border border-grappler-800 text-sm text-grappler-400 hover:text-grappler-200 hover:bg-grappler-800/80 transition-all"
                    >
                      <Zap className="w-4 h-4" />
                      Log Nutrition
                    </button>
                    <button
                      onClick={() => setOverlayView('training_journal')}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-grappler-800/50 border border-grappler-800 text-sm text-grappler-400 hover:text-grappler-200 hover:bg-grappler-800/80 transition-all"
                    >
                      <Calendar className="w-4 h-4" />
                      Training Journal
                    </button>
                  </div>
                </div>

                {/* Current Block */}
                {currentMesocycle && (() => {
                  const totalWeeks = currentMesocycle.weeks.length;
                  const currentWeek = Math.min(totalWeeks, Math.ceil(((Date.now() - new Date(currentMesocycle.startDate).getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1));
                  return (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-grappler-500 uppercase tracking-wider">Current Block</h3>
                      <div className="bg-grappler-800/50 rounded-xl p-3 border border-grappler-800">
                        <p className="text-sm font-medium text-grappler-200">{currentMesocycle.name}</p>
                        <p className="text-xs text-grappler-500 mt-0.5">
                          Week {currentWeek} of {totalWeeks}
                        </p>
                        <div className="mt-2 h-1.5 bg-grappler-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-500 rounded-full transition-all"
                            style={{ width: `${(currentWeek / totalWeeks) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Paused Workout Resume Banner */}
      {activeWorkout && workoutMinimized && (
        <button
          onClick={resumeWorkout}
          className="fixed bottom-[68px] lg:bottom-4 lg:left-[272px] left-3 right-3 z-30 safe-area-bottom will-change-transform"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between bg-primary-500 hover:bg-primary-600 active:scale-[0.98] transition-all rounded-lg px-4 py-3 shadow-lg shadow-primary-500/30"
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

      {/* Bottom Navigation — Mobile only (hidden on lg+) */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-20 bg-grappler-900 border-t border-grappler-800 safe-area-bottom will-change-transform lg:hidden"
        role="tablist"
        aria-label="Main navigation"
        onKeyDown={handleTabKeyDown}
      >
        <div className="grid grid-cols-4 items-center py-1 px-2 sm:px-4">
          {/* All 3 tabs as equal flat slots */}
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
                'relative flex flex-col items-center gap-0.5 py-2.5 rounded-lg transition-all focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2',
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

          {/* 4th slot: Universal Tools launcher — opens a bottom-sheet with recents/pinned/all + quick log shortcuts */}
          <div className="relative">
            <button
              onClick={() => {
                setShowToolLauncher(true);
                if (!fabTooltipDismissed) {
                  setFabTooltipDismissed(true);
                  localStorage.setItem('roots-fab-tooltip-shown', 'true');
                }
              }}
              aria-label="Tools"
              className="w-full flex flex-col items-center gap-0.5 py-2.5 rounded-lg text-primary-400 hover:text-primary-300 active:scale-95 transition-all"
            >
              <Plus className="w-5 h-5" />
              <span className="text-xs font-medium">Tools</span>
            </button>
            {/* First-time tooltip */}
            <AnimatePresence>
              {showFabTooltip && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute -top-16 left-1/2 -translate-x-1/2 whitespace-nowrap z-50"
                  onClick={() => {
                    setFabTooltipDismissed(true);
                    localStorage.setItem('roots-fab-tooltip-shown', 'true');
                  }}
                >
                  <div className="bg-grappler-50 text-grappler-900 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg">
                    All tools, one tap
                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-grappler-50 rotate-45" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>

      {/* Universal Tool Launcher — bottom sheet from the 4th nav slot */}
      <ToolLauncher
        open={showToolLauncher}
        onClose={() => setShowToolLauncher(false)}
        onNavigate={(view, ctx) => {
          setShowToolLauncher(false);
          setOverlayView(view, ctx);
        }}
      />

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
            <div className="flex items-center gap-3 bg-grappler-800 border border-grappler-700/50 rounded-lg px-4 py-2.5 shadow-2xl">
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
            <button
              className={cn(
                'px-5 py-3 rounded-lg shadow-2xl border flex items-center gap-3 cursor-pointer text-left',
                loginBonusToast.isMysteryDay
                  ? 'bg-gradient-to-r from-sky-500/20 to-purple-500/20 border-sky-500/30'
                  : 'bg-grappler-800 border-grappler-700/50'
              )}
              onClick={() => setLoginBonusToast(null)}
              aria-label="Dismiss login bonus notification"
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
            </button>
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
            <div className="bg-grappler-800 rounded-lg p-4 border border-grappler-700/50 shadow-2xl">
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
    </MotionConfig>
  );
}
