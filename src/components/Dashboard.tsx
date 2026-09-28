'use client';

import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { loadExerciseLibrary } from '@/lib/exercises';
import dynamic from 'next/dynamic';
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
  Settings,
  Play,
  Timer,
  Sun,
  LayoutGrid,
} from 'lucide-react';
import { cn, formatNumber, formatTime } from '@/lib/utils';
import { useScrollLock } from '@/lib/scroll-lock';
import { pushLayer, removeLayer, useBackLayer, isTopLayer, LAYER_RANK } from '@/lib/back-stack';
import SyncConflictResolver from './SyncConflictResolver';
import SyncStatusIndicator from './SyncStatusIndicator';
import VersionUpgradePopup from './VersionUpgradePopup';
import { getLevelTitle, levelProgress, pointsToNextLevel } from '@/lib/gamification';
// ThemeToggle moved to Settings page — no longer in header
import { ToastProvider } from './Toast';
import ResumeWorkoutBar from './ResumeWorkoutBar';
import OverlayLayer from './OverlayLayer';
import { usePersistentState } from '@/lib/use-persistent-state';
import { HomeTabSkeleton, ProgramTabSkeleton, ExploreTabSkeleton, ProgressTabSkeleton } from './Skeleton';
import CardErrorBoundary from './CardErrorBoundary';
import MorningRitual, { shouldShowRitual } from './MorningRitual';
import { hapticLight } from '@/lib/haptics';
import type { OverlayView } from './dashboard-types';
import type { TabType } from './dashboard-types';
import type { ContentCategory } from '@/lib/types';
import type { SyncStatus } from '@/lib/useDbSync';
import { useComputedGamification } from '@/lib/computed-gamification';
import { resolveWeightUnit } from '@/lib/units';

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
const StrengthAnalysis = dynamic(() => import('./StrengthAnalysis'), { loading: () => <OverlaySkeleton /> });
const PeriodizationCalendar = dynamic(() => import('./PeriodizationCalendar'), { loading: () => <OverlaySkeleton /> });
const RecoveryDashboard = dynamic(() => import('./RecoveryDashboard'), { loading: () => <OverlaySkeleton /> });
const InjuryLogger = dynamic(() => import('./InjuryLogger'), { loading: () => <OverlaySkeleton /> });
const RehabPlan = dynamic(() => import('./RehabPlan'), { loading: () => <OverlaySkeleton /> });
const InjuryAwareWorkout = dynamic(() => import('./InjuryAwareWorkout'), { loading: () => <OverlaySkeleton /> });
const PlyometricsBlock = dynamic(() => import('./PlyometricsBlock'), { loading: () => <OverlaySkeleton /> });
const AthleticBenchmarks = dynamic(() => import('./AthleticBenchmarks'), { loading: () => <OverlaySkeleton /> });
const EnergySystems = dynamic(() => import('./EnergySystems'), { loading: () => <OverlaySkeleton /> });
const CardioPlanner = dynamic(() => import('./CardioPlanner'), { loading: () => <OverlaySkeleton /> });
const CrewsLeaderboard = dynamic(() => import('./CrewsLeaderboard'), { loading: () => <OverlaySkeleton /> });
const TechniqueLog = dynamic(() => import('./TechniqueLog'), { loading: () => <OverlaySkeleton /> });
const CampTimeline = dynamic(() => import('./CampTimeline'), { loading: () => <OverlaySkeleton /> });
const CoachReport = dynamic(() => import('./CoachReport'), { loading: () => <OverlaySkeleton /> });
const SparringTracker = dynamic(() => import('./SparringTracker'), { loading: () => <OverlaySkeleton /> });
const ToolsTab = dynamic(() => import('./ToolsTab'), { loading: () => null });
const ProgressiveOverload = dynamic(() => import('./ProgressiveOverload'), { loading: () => <OverlaySkeleton /> });
const CustomExerciseCreator = dynamic(() => import('./CustomExerciseCreator'), { loading: () => <OverlaySkeleton /> });
const SessionTemplates = dynamic(() => import('./SessionTemplates'), { loading: () => <OverlaySkeleton /> });
const VolumeHeatMap = dynamic(() => import('./VolumeHeatMap'), { loading: () => <OverlaySkeleton /> });
const GrapplingTracker = dynamic(() => import('./GrapplingTracker'), { loading: () => <OverlaySkeleton /> });
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
const WarmUpInfo = dynamic(() => import('./WarmUpInfo'), { loading: () => <OverlaySkeleton /> });
const MovementLibrary = dynamic(() => import('./MovementLibrary'), { loading: () => <OverlaySkeleton /> });
const ConditioningSession = dynamic(() => import('./ConditioningSession'), { loading: () => <OverlaySkeleton /> });
const SprintTimer = dynamic(() => import('./SprintTimer'), { loading: () => <OverlaySkeleton /> });
const TrainingJournal = dynamic(() => import('./TrainingJournal'), { loading: () => <OverlaySkeleton /> });
const KnowledgeHub = dynamic(() => import('./KnowledgeHub'), { loading: () => <OverlaySkeleton /> });


function LevelUpCelebration({ level, onDismiss }: { level: number; onDismiss: () => void }) {
  // Non-blocking banner (was a full-screen modal that covered the workout
  // summary right after saving). Auto-dismisses; tap to close early.
  const title = getLevelTitle(level);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  useEffect(() => {
    const t = setTimeout(() => dismissRef.current(), 3500);
    return () => clearTimeout(t);
  }, [level]);
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      // Bottom slot (with the toasts), never over the header's buttons.
      className="fixed bottom-above-nav inset-x-0 mx-auto z-[60] w-[calc(100%-2rem)] max-w-sm"
      role="status"
    >
      <button
        onClick={onDismiss}
        className="w-full flex items-center gap-3 rounded-xl border border-primary-500/40 bg-grappler-900/95 backdrop-blur px-3 py-2.5 text-left shadow-lg"
        aria-label={`Level ${level} reached — dismiss`}
      >
        <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center flex-shrink-0">
          <Star className="w-5 h-5 text-white" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-bold text-grappler-50">Level {level}</span>
          <span className="block text-xs text-grappler-400 truncate">{title}</span>
        </span>
      </button>
    </motion.div>
  );
}

const TAB_FADE = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.14 } } as const;

const TABS = [
  { id: 'home',  icon: Sun,        label: 'Today' },
  { id: 'train', icon: Calendar,   label: 'Train' },
  { id: 'body',  icon: BarChart3,  label: 'Progress' },
  { id: 'tools', icon: LayoutGrid, label: 'Tools' },
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
  // Where you were survives a reload / iOS PWA resume (was: always Today).
  const [activeTab, setActiveTab] = usePersistentState<TabType>('ui:tab', 'home', { storage: 'session' });
  const [overlayView, setOverlayViewRaw] = usePersistentState<OverlayView>('ui:overlay', null, { storage: 'session' });
  const [overlayContext, setOverlayContext] = usePersistentState<string | undefined>('ui:overlay-ctx', undefined, { storage: 'session' });
  // Stack of previous overlays for back-navigation (e.g. InjuryLogger → Rehab → tap close → goes back to InjuryLogger)
  const [overlayHistory, setOverlayHistory] = useState<{ view: NonNullable<OverlayView>; context?: string }[]>([]);
  const [reportMesocycleId, setReportMesocycleId] = useState<string | null>(null);

  // Tools open as a layer OVER the tab (the tab stays mounted underneath), so
  // closing one lands exactly where you were. Body scroll is locked while a
  // layer is up — iOS-correct, reference-counted (src/lib/scroll-lock.ts).
  const layerOpen = !!overlayView || !!reportMesocycleId;
  useScrollLock(layerOpen);

  // Slide direction for the layer transition: deeper = in from the right.
  const [navDirection, setNavDirection] = useState<'push' | 'pop'>('push');

  // One level back: previous tool in the stack, else close.
  const popOverlay = () => {
    if (overlayHistory.length > 0) {
      const previous = overlayHistory[overlayHistory.length - 1];
      setNavDirection('pop');
      setOverlayHistory(prev => prev.slice(0, -1));
      setOverlayContext(previous.context);
      setOverlayViewRaw(previous.view);
    } else {
      setNavDirection('pop');
      setOverlayViewRaw(null);
      setOverlayContext(undefined);
    }
  };
  const popOverlayRef = useRef(popOverlay);
  popOverlayRef.current = popOverlay;

  // ── System back (Android back, browser back, Safari edge-swipe) ──
  // Every open tool level owns one history entry in the shared back stack
  // (src/lib/back-stack.ts), so back closes the top-most thing — a sheet
  // inside a tool first, then the tool, then the tool under it. Closing in the
  // UI is state-driven; this effect drops the matching history entries.
  // Back on Train / Progress / Tools returns to Today before leaving the app.
  // Registered before the tool layers: after a reload that restores both,
  // the tab entry must sit UNDER the tool's.
  const switchTabRef = useRef<(id: TabType) => void>(() => {});
  useBackLayer(activeTab !== 'home', () => switchTabRef.current('home'), LAYER_RANK.tab);

  const overlayLayerIds = useRef<number[]>([]);
  const overlayDepth = overlayView ? overlayHistory.length + 1 : 0;
  useEffect(() => {
    const ids = overlayLayerIds.current;
    while (ids.length < overlayDepth) {
      const id = pushLayer(() => {
        overlayLayerIds.current = overlayLayerIds.current.filter(x => x !== id);
        popOverlayRef.current();
      }, LAYER_RANK.tool);
      ids.push(id);
    }
    while (ids.length > overlayDepth) removeLayer(ids.pop()!);
  }, [overlayDepth]);
  const topOverlayLayerRef = { get current() { return overlayLayerIds.current[overlayLayerIds.current.length - 1]; } };

  // Imported exercise library (search/swap) loads after first paint.
  useEffect(() => { void loadExerciseLibrary(); }, []);
  // Keep the saved time zone current (travel, DST-zone change) so server-sent
  // reminders arrive at local times. Only matters once push is on.
  useEffect(() => {
    const s = useAppStore.getState();
    const prefs = s.notificationPreferences;
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (prefs?.pushEnabled && tz && prefs.timeZone !== tz) s.setNotificationPreferences({ timeZone: tz });
    } catch { /* no Intl zone support — server falls back to UTC */ }
  }, []);

  // ── Morning Ritual — once-per-day readiness reveal ──
  const [showMorningRitual, setShowMorningRitual] = useState(false);
  useEffect(() => {
    // Only show on home tab, only when user exists (onboarding complete)
    // No reveal of a score built from defaults (a brand-new profile saw "98").
    const hasSignal = !!useAppStore.getState().latestWhoopData
      || (useAppStore.getState().quickLogs ?? []).some(q => q.type === 'sleep' && !q._deleted);
    if (user && activeTab === 'home' && hasSignal && shouldShowRitual()) {
      setShowMorningRitual(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setOverlayView = (view: OverlayView, context?: string) => {
    if (view !== null) {
      // If there's already an overlay open, push it onto the back stack
      // so that closing the new one returns to the previous (e.g. Injury → Rehab → back).
      if (overlayView && overlayView !== view) {
        setOverlayHistory(prev => [...prev, { view: overlayView, context: overlayContext }]);
      }
      setNavDirection('push');
    } else {
      // Closing — clear the back stack since user explicitly chose to exit
      setOverlayHistory([]);
      setNavDirection('pop');
    }
    setOverlayViewRaw(view);
    setOverlayContext(view !== null ? context : undefined);
  };
  const {
    user, gamificationStats, currentMesocycle, activeWorkout, workoutMinimized, resumeWorkout, cancelWorkout,
    workoutLogs, rawMesocycleHistory, deleteMesocycle,
    syncConflict, resolveSyncConflict, dismissSyncConflict,
    ensureWeeklyChallenge, lastCompletedWorkout,
  } = useAppStore(
    useShallow(s => ({
      user: s.user, gamificationStats: s.gamificationStats, currentMesocycle: s.currentMesocycle, activeWorkout: s.activeWorkout,
      workoutMinimized: s.workoutMinimized, resumeWorkout: s.resumeWorkout, cancelWorkout: s.cancelWorkout,
      workoutLogs: s.workoutLogs, rawMesocycleHistory: s.mesocycleHistory, deleteMesocycle: s.deleteMesocycle,
      syncConflict: s.syncConflict, resolveSyncConflict: s.resolveSyncConflict, dismissSyncConflict: s.dismissSyncConflict,
      ensureWeeklyChallenge: s.ensureWeeklyChallenge, lastCompletedWorkout: s.lastCompletedWorkout,
    }))
  );
  // Back from a running workout = "Leave workout for now" (everything kept,
  // Resume bar on every tab) instead of dropping out of the app mid-set.
  const pauseWorkout = useAppStore(s => s.pauseWorkout);
  useBackLayer(!!activeWorkout && !workoutMinimized, () => pauseWorkout(), LAYER_RANK.workout);
  useBackLayer(!!reportMesocycleId, () => { setNavDirection('pop'); setReportMesocycleId(null); }, LAYER_RANK.tool);

  // Selector keeps the raw stable reference — filtering there would return a
  // fresh array every evaluation and defeat useShallow. Derive with useMemo.
  const mesocycleHistory = useMemo(
    () => rawMesocycleHistory.filter(m => !m._deleted),
    [rawMesocycleHistory]
  );

  // Tab switch with haptic feedback
  // Each tab keeps its own scroll position (was: every switch jumped to the
  // top). Tapping the tab you're already on scrolls it back to the top.
  const tabScroll = useRef<Partial<Record<TabType, number>>>({});
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const switchTab = useCallback((id: TabType) => {
    hapticLight();
    if (id === activeTabRef.current) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    tabScroll.current[activeTabRef.current] = window.scrollY;
    setActiveTab(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const firstTabRender = useRef(true);
  useLayoutEffect(() => {
    if (firstTabRender.current) { firstTabRender.current = false; return; }
    const y = tabScroll.current[activeTab] ?? 0;
    window.scrollTo(0, y);
    if (y <= 0) return;
    // The tab's content may still be streaming in (lazy chunk, skeleton) and
    // be too short to scroll that far yet — retry for a few frames, but stop
    // the moment the athlete touches the screen.
    let frames = 0;
    let cancelled = false;
    const stop = () => { cancelled = true; };
    window.addEventListener('touchstart', stop, { once: true, passive: true });
    window.addEventListener('wheel', stop, { once: true, passive: true });
    const tick = () => {
      if (cancelled || frames++ > 30 || Math.abs(window.scrollY - y) <= 2) return;
      window.scrollTo(0, y);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      window.removeEventListener('touchstart', stop);
      window.removeEventListener('wheel', stop);
    };
  }, [activeTab]);

  switchTabRef.current = switchTab;

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
        // Same as the system back button: closes the top-most layer — a sheet
        // inside the tool first, then the tool.
        if (overlayView || reportMesocycleId) {
          window.history.back();
        } else if (levelUpDisplay) {
          setLevelUpDisplay(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [overlayView, levelUpDisplay, reportMesocycleId]);


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
    // ActiveWorkout is lazy-loaded (dynamic import) and does heavy
    // work on mount (readiness summary, store derivations, autoregulation).
    // A throw or chunk-load failure used to leave the user on a frozen black
    // screen with no escape — the error boundary surfaces the actual error
    // and a "Cancel workout" escape so they can get back to the app.
    const cancelEscape = {
      label: 'Cancel workout',
      onClick: () => {
        cancelWorkout();
      },
    };

    return (
      <CardErrorBoundary fallbackLabel="Active workout" fullScreen secondaryAction={cancelEscape}>
        <ToastProvider>
          {/* Opacity only — a transform here would re-anchor the workout's
              fixed bars to this box for the length of the fade. */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }}>
            <ActiveWorkout />
          </motion.div>
        </ToastProvider>
      </CardErrorBoundary>
    );
  }

  // Full-screen tool layer — drawn OVER the tabs (they stay mounted), see OverlayLayer.
  // Closing is state-driven; the back-stack effect above drops the history entry.
  const closeOverlay = () => popOverlay();
  const OVERLAY_COMPONENTS: Record<string, React.ReactNode> = {
    builder: <WorkoutBuilder onClose={closeOverlay} editTemplateId={overlayContext} />,
    nutrition: <NutritionTracker onClose={closeOverlay} onNavigate={(v: string) => setOverlayView(v as never)} />,
    wearable: <WearableIntegration onClose={closeOverlay} />,
    competition: <CompetitionPrep onClose={closeOverlay} onNavigate={v => setOverlayView(v)} />,
    mobility: <MobilityWorkouts onClose={closeOverlay} />,
    coach: <WeeklyCoach onClose={closeOverlay} />,
    strength: <StrengthAnalysis onClose={closeOverlay} />,
    periodization: <PeriodizationCalendar onClose={closeOverlay} />,
    recovery: <RecoveryHubView onClose={closeOverlay} initialTab="analytics" />,
    injury: <InjuryLogger onClose={closeOverlay} onNavigate={setOverlayView} />,
    rehab: <RehabPlan onClose={closeOverlay} preselectedInjuryId={overlayContext} />,
    injury_aware_workout: <InjuryAwareWorkout onClose={closeOverlay} />,
    plyometrics: <PlyometricsBlock onClose={closeOverlay} />,
    athletic_benchmarks: <AthleticBenchmarks onClose={closeOverlay} onNavigate={setOverlayView} />,
    energy_systems: <EnergySystems onClose={closeOverlay} />,
    cardio_planner: <CardioPlanner onClose={closeOverlay} />,
    crews: <CrewsLeaderboard onClose={closeOverlay} />,
    technique_log: <TechniqueLog onClose={closeOverlay} />,
    camp_timeline: <CampTimeline onClose={closeOverlay} />,
    coach_report: <CoachReport onClose={closeOverlay} />,
    sparring_tracker: <SparringTracker onClose={closeOverlay} />,
    overload: <ProgressiveOverload onClose={closeOverlay} />,
    custom_exercise: <CustomExerciseCreator onClose={closeOverlay} />,
    templates: <SessionTemplates onClose={closeOverlay} />,
    volume_map: <VolumeHeatMap onClose={closeOverlay} />,
    grappling: <GrapplingTracker onClose={closeOverlay} startWithForm={overlayContext === 'log'} />,
    quick_actions: <QuickActions onClose={closeOverlay} />,
    grip_strength: <GripStrengthModule onClose={closeOverlay} />,
    program_browser: <ProgramBrowserView onClose={closeOverlay} onNavigate={setOverlayView} />,
    illness: <IllnessLogger onClose={closeOverlay} />,
    cycle_tracking: <CycleTracking onClose={closeOverlay} />,
    fatigue: <RecoveryHubView onClose={closeOverlay} initialTab="deload" />,
    fight_camp: <FightCampNutrition onClose={closeOverlay} />,
    badge_showcase: <BadgeShowcase onClose={closeOverlay} />,
    warm_up: <WarmUpInfo onClose={closeOverlay} />,
    movement_library: <MovementLibrary onClose={closeOverlay} />,
    conditioning: <ConditioningSession onClose={closeOverlay} />,
    sprints: <SprintTimer onClose={closeOverlay} />,
    training_journal: <TrainingJournal onClose={closeOverlay} />,
    knowledge_hub: <KnowledgeHub onClose={closeOverlay} initialCategory={overlayContext as ContentCategory | undefined} onNavigate={setOverlayView} />,
    profile_settings: <ProfileSettings onClose={closeOverlay} onNavigate={setOverlayView} />,
  };
  let layerNode: React.ReactNode = null;
  let layerKey = '';
  if (overlayView && OVERLAY_COMPONENTS[overlayView]) {
    layerKey = `ov:${overlayDepth}:${overlayView}`;
    // Tools get their own toast provider: toasts (and their Undo) render inside the layer.
    layerNode = <ToastProvider>{OVERLAY_COMPONENTS[overlayView]}</ToastProvider>;
  } else if (reportMesocycleId) {
    const allMesos = [...mesocycleHistory, ...(currentMesocycle ? [currentMesocycle] : [])];
    const targetMeso = allMesos.find(m => m.id === reportMesocycleId);
    if (targetMeso) {
      const targetIdx = allMesos.indexOf(targetMeso);
      const prevMeso = targetIdx > 0 ? allMesos[targetIdx - 1] : null;
      layerKey = `report:${reportMesocycleId}`;
      layerNode = (
        <MesocycleReportView
          mesocycle={targetMeso}
          workoutLogs={workoutLogs}
          previousMesocycle={prevMeso}
          weightUnit={resolveWeightUnit(user?.weightUnit)}
          onClose={() => { setNavDirection('pop'); setReportMesocycleId(null); }}
          onDelete={(id) => { deleteMesocycle(id); setNavDirection('pop'); setReportMesocycleId(null); }}
        />
      );
    }
  }
  const dismissLayer = () => {
    if (overlayView) closeOverlay();
    else { setNavDirection('pop'); setReportMesocycleId(null); }
  };

  // Sidebar nav items (matches TABS + profile)
  const sidebarNav = [
    { id: 'home'  as TabType, icon: Sun,       label: 'Today' },
    { id: 'train' as TabType, icon: Calendar,  label: 'Train' },
    { id: 'body'  as TabType, icon: BarChart3, label: 'Progress' },
  ];

  return (
    <MotionConfig reducedMotion="user">
    <ToastProvider>
    {/* The tab underneath an open tool stays mounted (scroll + state kept) but
        is inert: no focus, no taps, hidden from screen readers. */}
    <div
      className="min-h-[100dvh] w-full overflow-x-hidden bg-grappler-900 bg-mesh pb-40 safe-area-bottom lg:pb-0"
      {...(layerNode ? { inert: '', 'aria-hidden': true } as Record<string, unknown> : {})}
    >
      {/* Solid strip under the notch / clock — the header scrolls away with
          the page, and content used to scroll up into the status bar. */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-40 bg-grappler-900 lg:hidden" style={{ height: 'env(safe-area-inset-top)' }} />

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
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:flex-shrink-0 lg:sticky lg:top-0 lg:h-[100dvh] lg:border-r lg:border-grappler-800 lg:bg-grappler-950 lg:lg:z-40">
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
            <header
              className="sticky top-0 z-40 bg-grappler-900 border-b border-grappler-800 safe-area-top lg:hidden"
            >
              {/* Row 1: Editorial wordmark + key actions */}
              <div className="px-4 pt-3 pb-1.5 flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <div className="font-display font-black text-lg leading-none tracking-tight text-white">
                    IBRA / LIFTS<span className="text-primary-500">.</span>
                  </div>
                  <p className="text-[11px] uppercase tracking-wider text-grappler-500">{getLevelTitle(computed.level)}</p>
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
              {/* No exit animation: the new tab paints immediately (mode="wait"
                  held every switch for the old tab's fade-out). */}
                {activeTab === 'home' && (
                  <motion.div
                    key="home"
                    {...TAB_FADE}
                  >
                    <HomeTab onNavigate={setOverlayView} onViewReport={setReportMesocycleId} onSwitchTab={switchTab} />
                  </motion.div>
                )}
                {activeTab === 'train' && (
                  <motion.div
                    key="train"
                    {...TAB_FADE}
                  >
                    <CardErrorBoundary fallbackLabel="Train tab">
                      <WorkoutView onNavigate={setOverlayView} />
                    </CardErrorBoundary>
                    <div className="mt-6">
                      <ExploreTab onNavigate={setOverlayView} filterTab="train" compact />
                    </div>
                  </motion.div>
                )}
                {activeTab === 'body' && (
                  <motion.div
                    key="body"
                    {...TAB_FADE}
                  >
                    <ProgressAndHistoryTab onViewReport={setReportMesocycleId} onNavigate={setOverlayView} />
                    <div className="mt-6">
                      <ExploreTab onNavigate={setOverlayView} filterTab="body" compact />
                    </div>
                  </motion.div>
                )}
                {activeTab === 'tools' && (
                  <motion.div
                    key="tools"
                    {...TAB_FADE}
                  >
                    <ToolsTab onNavigate={setOverlayView} />
                  </motion.div>
                )}

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

      {/* Paused workout: where you are + one tap back in */}
      {activeWorkout && workoutMinimized && <ResumeWorkoutBar />}

      {/* Bottom Navigation — Mobile only (hidden on lg+) */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-20 bg-grappler-900 border-t border-grappler-800 safe-area-bottom will-change-transform lg:hidden"
        role="tablist"
        aria-label="Main navigation"
        onKeyDown={handleTabKeyDown}
      >
        <div className="grid grid-cols-4 items-center py-1 px-2 sm:px-4">
          {/* All 4 tabs as equal flat slots — Tools is now its own tab so
              exit-from-overlay always returns the user here. */}
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
        </div>
      </nav>

      {/* Daily Login Bonus Toast */}
      <AnimatePresence>
        {loginBonusToast && (
          <motion.div
            className="fixed bottom-above-nav inset-x-0 mx-auto w-fit z-50"
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
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

    {/* App-wide prompts stay outside the inert tab tree so they work over a tool too. */}
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

    {/* Level-Up Celebration */}
    <AnimatePresence>
      {levelUpDisplay && (
        <LevelUpCelebration
          level={levelUpDisplay}
          onDismiss={() => setLevelUpDisplay(null)}
        />
      )}
    </AnimatePresence>


    {/* Tool layer */}
    <AnimatePresence initial={false} custom={navDirection}>
      {layerNode && (
        <OverlayLayer
          key={layerKey}
          direction={navDirection}
          canDrag={() => !overlayView || isTopLayer(topOverlayLayerRef.current)}
          onDismiss={dismissLayer}
        >
          {layerNode}
        </OverlayLayer>
      )}
    </AnimatePresence>
    </ToastProvider>
    </MotionConfig>
  );
}
