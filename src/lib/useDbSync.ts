'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from './store';
import { loadFromDatabase, saveToDatabase, resolveConflicts, normalizeWorkoutLogs, initDatabase, flushPendingSync, forcePushToCloud, flushImmediateSync, flushSyncQueue } from './db-sync';
import { SyncConflict, buildConflictFields } from '@/components/SyncConflictResolver';
import { saveLatestSnapshot, onSyncFailure } from './data-safety';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

// Minimum interval between re-syncs on focus (30 seconds)
const RESYNC_COOLDOWN_MS = 30_000;

// Heartbeat: push then pull every 2 minutes to keep devices in sync
const HEARTBEAT_INTERVAL_MS = 2 * 60_000;

// Fields to restore from the database
const RESTORE_FIELDS = [
  'user', 'isAuthenticated', 'onboardingData', 'baselineLifts',
  'currentMesocycle', 'mesocycleHistory', 'mesocycleQueue', 'workoutLogs', 'gamificationStats',
  'bodyWeightLog', 'injuryLog', 'customExercises', 'sessionTemplates',
  'hrSessions', 'trainingSessions', 'themeMode', 'colorTheme', 'meals', 'macroTargets',
  'waterLog', 'activeDietPhase', 'dietPhaseHistory', 'weeklyCheckIns', 'bodyComposition',
  'muscleEmphasis', 'competitions', 'subscription', 'quickLogs',
  'gripTests', 'gripExerciseLogs', 'activeEquipmentProfile',
  'notificationPreferences', 'workoutSkips', 'illnessLogs', 'cycleLogs',
  'mealReminders', 'dailyLoginBonus', 'lastSyncAt',
  // Combat / nutrition / supplements
  'weightCutPlans', 'combatNutritionProfile', 'fightCampPlans',
  'activeSupplements', 'supplementStack', 'supplementIntakes', 'homeGymEquipment',
  // Mental / knowledge base tracking
  'mentalCheckIns', 'confidenceLedger', 'featureFeedback',
  'seenInsights', 'dismissedInsights', 'readArticles', 'bookmarkedArticles', 'lastInsightDate',
  // Nutrition planning / meal shortcuts (previously local-only)
  'nutritionPeriodPlan', 'mealStamps',
  // Illness resolution state (previously local-only — caused "recovering" on other devices)
  '_resolvedIllnessIds',
  // Wearable data (so sleep/strain/recovery shows on all devices, not just Whoop-connected one)
  'latestWhoopData', 'wearableHistory', 'whoopWorkouts',
];

/**
 * Detect device type from user agent for sync metadata.
 */
function getDeviceType(): 'phone' | 'tablet' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iPad|tablet|Kindle|PlayBook/i.test(ua)) return 'tablet';
  if (/Mobile|Android|iPhone|iPod|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua)) return 'phone';
  return 'desktop';
}

/**
 * Merge database data into the store, handling conflict detection.
 * Returns true if data was applied (either merged or no conflict), false if conflict surfaced.
 */
function applyRemoteData(
  dbData: Record<string, unknown>,
  isResync: boolean,
  serverUpdatedAt?: string | null,
): boolean {
  const store = useAppStore.getState();
  const localIsEmpty = !store.isOnboarded && !store.user;
  const dbHasProfile = dbData.isOnboarded === true && dbData.user;

  // Use reliable server-side DB timestamp (set on every push from any device)
  const serverTs = serverUpdatedAt ? new Date(serverUpdatedAt).getTime() : 0;

  // Helper: build full local state snapshot for merge (prevents data loss)
  const buildFullLocal = (): Record<string, unknown> => {
    const s = useAppStore.getState();
    const result: Record<string, unknown> = {};
    for (const field of RESTORE_FIELDS) {
      const val = (s as unknown as Record<string, unknown>)[field];
      if (val !== undefined) result[field] = val;
    }
    result.isOnboarded = s.isOnboarded;
    return result;
  };

  // Helper: apply all RESTORE_FIELDS from source into the store
  const applyFields = (source: Record<string, unknown>, label: string) => {
    // Normalize workoutLogs before applying (ensures set.completed exists)
    const normalized = normalizeWorkoutLogs(source);
    const fieldsToMerge: Record<string, unknown> = {};
    for (const field of RESTORE_FIELDS) {
      if (normalized[field] !== undefined) fieldsToMerge[field] = normalized[field];
    }
    if (normalized.isOnboarded !== undefined) fieldsToMerge.isOnboarded = normalized.isOnboarded;

    if (Object.keys(fieldsToMerge).length > 0) {
      const before = useAppStore.getState();
      useAppStore.setState(fieldsToMerge);
      const after = useAppStore.getState();
      console.log(`[db-sync] ${label}:`, {
        meals: `${(before.meals ?? []).length} → ${(after.meals ?? []).length}`,
        workouts: `${(before.workoutLogs ?? []).length} → ${(after.workoutLogs ?? []).length}`,
        waterDays: `${Object.keys(before.waterLog || {}).length} → ${Object.keys(after.waterLog || {}).length}`,
      });
    }

    // Restore Whoop tokens from DB backup if local tokens are missing
    const whoopTokens = source._whoopTokens as Record<string, string> | undefined;
    if (whoopTokens && typeof window !== 'undefined') {
      if (!localStorage.getItem('whoop_access_token') && whoopTokens.accessToken) {
        localStorage.setItem('whoop_access_token', whoopTokens.accessToken);
        if (whoopTokens.refreshToken) localStorage.setItem('whoop_refresh_token', whoopTokens.refreshToken);
        if (whoopTokens.tokenExpires) localStorage.setItem('whoop_token_expires', whoopTokens.tokenExpires);
      }
    }

    // Restore Quick Access pins from server if present
    const remotePins = source._quickAccessPins;
    if (Array.isArray(remotePins) && remotePins.length > 0 && typeof window !== 'undefined') {
      const localRaw = localStorage.getItem('roots-explore-pinned') || '[]';
      // Apply server pins if they differ from local (server reflects latest from any device)
      if (JSON.stringify(remotePins) !== localRaw) {
        localStorage.setItem('roots-explore-pinned', JSON.stringify(remotePins));
        window.dispatchEvent(new Event('roots-pins-changed'));
      }
    }
  };

  // Force-restore: if local is empty but DB has a completed profile
  if (localIsEmpty && dbHasProfile) {
    applyFields(dbData, 'Local was empty — restored from server');
    return true;
  }

  // Skip conflict checks if local is empty (nothing to conflict with)
  if (localIsEmpty) {
    return true;
  }

  const localLogs = store.workoutLogs || [];
  const remoteLogs = Array.isArray(dbData.workoutLogs) ? dbData.workoutLogs : [];
  const hasLocalUniqueData = localLogs.some(
    l => !remoteLogs.find((r: Record<string, unknown>) => r.id === l.id)
  );
  const hasRemoteUniqueData = remoteLogs.some(
    (r: Record<string, unknown>) => !localLogs.find(l => l.id === r.id)
  );

  // ── CONFLICT: Both sides have unique workout logs ──
  if (hasLocalUniqueData && hasRemoteUniqueData) {
    const localData: Record<string, unknown> = {
      workoutLogs: store.workoutLogs,
      gamificationStats: store.gamificationStats,
      currentMesocycle: store.currentMesocycle,
      sessionTemplates: store.sessionTemplates,
      bodyWeightLog: store.bodyWeightLog,
    };
    const remoteData: Record<string, unknown> = {
      workoutLogs: dbData.workoutLogs,
      gamificationStats: dbData.gamificationStats,
      currentMesocycle: dbData.currentMesocycle,
      sessionTemplates: dbData.sessionTemplates,
      bodyWeightLog: dbData.bodyWeightLog,
    };
    const conflictFields = buildConflictFields(localData, remoteData);

    if (conflictFields.length > 0) {
      // Even though workout logs conflict, merge non-conflicting data immediately
      // (meals, water, supplements, etc.) so nutrition data isn't held hostage
      const fullLocal = buildFullLocal();
      const premerged = resolveConflicts(fullLocal, dbData);
      // Apply everything EXCEPT the conflicting workout fields (those wait for user resolution)
      const conflictFieldNames = new Set(conflictFields.map(f => f.field));
      const safeUpdates: Record<string, unknown> = {};
      for (const field of RESTORE_FIELDS) {
        if (!conflictFieldNames.has(field) && premerged[field] !== undefined) {
          safeUpdates[field] = premerged[field];
        }
      }
      if (Object.keys(safeUpdates).length > 0) {
        useAppStore.setState(safeUpdates);
      }

      const dbUpdated = new Date((dbData.user as Record<string, unknown>)?.updatedAt as string || 0).getTime();
      const localUpdated = new Date(store.user?.updatedAt || 0).getTime();
      useAppStore.setState({
        syncConflict: {
          localData,
          remoteData,
          localUpdatedAt: new Date(localUpdated),
          remoteUpdatedAt: new Date(dbUpdated),
          conflictFields,
        },
        pendingRemoteData: dbData,
      });
      return false;
    }
  }

  // ── NO LOCAL-UNIQUE WORKOUT LOGS: merge server + full local ──
  // Even though local has no unique *workout logs*, it may have unique
  // meals, bodyWeight entries, waterLog data, supplement intakes, etc.
  // Previously this passed only { workoutLogs, lastSyncAt } to the merge,
  // which silently dropped ALL other local data. Now we pass full state.
  if (!hasLocalUniqueData) {
    const fullLocal = buildFullLocal();
    const merged = resolveConflicts(fullLocal, dbData);
    applyFields(merged, hasRemoteUniqueData
      ? 'Applied server data (remote has new entries)'
      : 'Applied server data (scalar sync from other device)');
    return true;
  }

  // ── LOCAL HAS UNIQUE DATA, server doesn't ──
  // Local has workouts the server doesn't know about. This can happen
  // when the device was offline. Pass full local state to the merge so
  // no local data (meals, supplements, etc.) is silently dropped.
  if (serverTs > 0) {
    const fullLocal = buildFullLocal();
    const merged = resolveConflicts(fullLocal, dbData);
    applyFields(merged, 'Merged server changes with local-unique data');
  }

  return true;
}

/**
 * Sync Zustand store with Vercel Postgres.
 * @param authUserId — The authenticated user's ID from NextAuth session.
 *                      When provided, this overrides store.user?.id for all DB operations.
 * @param sessionStatus — NextAuth session status ('loading' | 'authenticated' | 'unauthenticated')
 * @returns Sync state and controls for the UI
 */
export function useDbSync(authUserId?: string | null, sessionStatus?: string) {
  const store = useAppStore();
  const lastSyncRef = useRef<string>('');
  const initialLoadDone = useRef(false);
  const dbInitDone = useRef(false);
  const lastResyncAt = useRef<number>(0);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [deviceType] = useState(getDeviceType);

  // The effective user ID: prefer auth session ID over store ID
  const effectiveUserId = authUserId || store.user?.id;

  // Initialize database table on first mount
  useEffect(() => {
    if (!dbInitDone.current) {
      dbInitDone.current = true;
      initDatabase().then((ok) => {
        if (ok && process.env.NODE_ENV === 'development') {
          console.log('[db-sync] Database initialized');
        }
      }).catch((err) => {
        console.error('[db-sync] Database initialization failed:', err);
      });
    }
  }, []);

  // Core sync-from-cloud function (used for initial load and re-syncs)
  // Returns true if data was successfully fetched, false otherwise.
  const pullFromCloud = useCallback(async (userId: string, isResync: boolean): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncStatus('offline');
      return false;
    }
    setSyncStatus('syncing');
    try {
      const result = await loadFromDatabase(userId);
      if (result) {
        applyRemoteData(result.data, isResync, result.serverUpdatedAt);
        // CRITICAL: Set lastSyncAt to NOW after pull, not the server's stale value.
        // Without this, a device restores another device's old timestamp and the
        // scalar merge in resolveConflicts picks the wrong "winner" on next push.
        useAppStore.setState({ lastSyncAt: Date.now() });
      } else {
        // loadFromDatabase returned null — API 401 (auth not ready) or no data
        setSyncStatus('idle');
        return false;
      }

      // ── Deep recovery: if user_store was empty, try recovering from DB tables ──
      const storeAfterPull = useAppStore.getState();
      const stillEmpty = !storeAfterPull.isOnboarded && !storeAfterPull.user;
      if (stillEmpty && !isResync) {
        try {
          const recoverRes = await fetch('/api/sync/recover', { cache: 'no-store' });
          if (recoverRes.ok) {
            const recovery = await recoverRes.json();
            if (recovery.recovered && recovery.data) {
              const fieldsToMerge: Record<string, unknown> = {};
              for (const field of RESTORE_FIELDS) {
                if (recovery.data[field] !== undefined) fieldsToMerge[field] = recovery.data[field];
              }
              if (recovery.data.isOnboarded !== undefined) fieldsToMerge.isOnboarded = recovery.data.isOnboarded;
              if (Object.keys(fieldsToMerge).length > 0) {
                useAppStore.setState(fieldsToMerge);
                if (process.env.NODE_ENV === 'development') {
                  console.log('[db-sync] Deep recovery successful:', recovery.stats);
                }
              }
            }
          }
        } catch {
          // Recovery endpoint not available — not critical
        }
      }

      setSyncStatus('success');
      setLastSyncedAt(new Date());

      // Clear success status after 3 seconds
      setTimeout(() => setSyncStatus(prev => prev === 'success' ? 'idle' : prev), 3000);
      return true;
    } catch (err) {
      console.error('[db-sync] Sync failed:', err);
      setSyncStatus('error');
      // Clear error status after 5 seconds
      setTimeout(() => setSyncStatus(prev => prev === 'error' ? 'idle' : prev), 5000);
      return false;
    }
  }, []);

  // Track whether a SUCCESSFUL pull has happened (not just an attempt)
  const hasPulledSuccessfully = useRef(false);

  // Load from database on mount (if user exists)
  // CRITICAL: Only mark initialLoadDone if pull actually succeeded (got data from server).
  // Previously, a 401 (auth not ready) would mark done → push stale data → never retry pull.
  useEffect(() => {
    if (!effectiveUserId || initialLoadDone.current) return;

    pullFromCloud(effectiveUserId, false).then((success) => {
      if (success) {
        hasPulledSuccessfully.current = true;
      }
      initialLoadDone.current = true;
      setIsInitialLoadComplete(true);
    });
  }, [effectiveUserId, pullFromCloud]);

  // If no user AND session is resolved (not still loading), mark as complete (guest mode)
  useEffect(() => {
    if (!effectiveUserId && !initialLoadDone.current && sessionStatus !== 'loading') {
      initialLoadDone.current = true;
      setIsInitialLoadComplete(true);
    }
  }, [effectiveUserId, sessionStatus]);

  // ── Retry pull when auth resolves if initial pull failed ──────────────
  // Handles the race where localStorage has user.id → pull fires before
  // NextAuth resolves → API 401 → pull is a no-op → data never arrives.
  // When sessionStatus transitions to 'authenticated', retry the pull.
  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !effectiveUserId) return;
    if (hasPulledSuccessfully.current) return; // Already got data, no need

    // Auth just resolved — retry the pull that previously failed
    pullFromCloud(effectiveUserId, false).then((success) => {
      if (success) {
        hasPulledSuccessfully.current = true;
      }
    });
  }, [sessionStatus, effectiveUserId, pullFromCloud]);

  // ── Re-sync when app regains focus (multi-device support) ──────────────
  useEffect(() => {
    if (!effectiveUserId || !initialLoadDone.current) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      if (!navigator.onLine) {
        setSyncStatus('offline');
        return;
      }

      // Cooldown to prevent spamming
      const now = Date.now();
      if (now - lastResyncAt.current < RESYNC_COOLDOWN_MS) return;
      lastResyncAt.current = now;

      if (process.env.NODE_ENV === 'development') {
        console.log('[db-sync] App regained focus — flushing queue + re-syncing from cloud');
      }
      // Flush any data queued during previous page-hide before pulling
      flushSyncQueue().catch(() => {});
      pullFromCloud(effectiveUserId, true).then(success => {
        if (success && !hasPulledSuccessfully.current) {
          hasPulledSuccessfully.current = true;
        }
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [effectiveUserId, pullFromCloud]);

  // ── Flush pending sync when app goes to background (prevents data loss) ──
  useEffect(() => {
    const handlePageHide = () => {
      flushPendingSync();
    };

    // visibilitychange fires when user switches apps, locks phone, or switches tabs
    const handleHidden = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingSync();
      }
    };

    document.addEventListener('visibilitychange', handleHidden);
    // pagehide is the modern replacement for beforeunload, more reliable on mobile
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleHidden);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  // ── Update sync status on online/offline changes ──────────────
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus(prev => prev === 'offline' ? 'idle' : prev);
      // Flush any data queued while we were offline
      flushSyncQueue().catch(() => {});
    };
    const handleOffline = () => setSyncStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Build sync payload from current store state (shared between auto-sync and force-sync)
  const buildSyncPayload = useCallback((): Record<string, unknown> | null => {
    const s = useAppStore.getState();
    const hasRealData = s.isOnboarded && s.user && (s.workoutLogs?.length > 0 || s.trainingSessions?.length > 0 || s.meals?.length > 0);
    if (!hasRealData) return null;

    return {
      user: s.user, isOnboarded: s.isOnboarded, isAuthenticated: s.isAuthenticated,
      onboardingData: s.onboardingData, baselineLifts: s.baselineLifts,
      currentMesocycle: s.currentMesocycle, mesocycleHistory: s.mesocycleHistory,
      mesocycleQueue: s.mesocycleQueue, workoutLogs: s.workoutLogs,
      gamificationStats: s.gamificationStats, bodyWeightLog: s.bodyWeightLog,
      injuryLog: s.injuryLog, customExercises: s.customExercises,
      sessionTemplates: s.sessionTemplates, hrSessions: s.hrSessions,
      trainingSessions: s.trainingSessions, themeMode: s.themeMode,
      meals: s.meals, macroTargets: s.macroTargets, waterLog: s.waterLog,
      activeDietPhase: s.activeDietPhase, weeklyCheckIns: s.weeklyCheckIns,
      bodyComposition: s.bodyComposition, muscleEmphasis: s.muscleEmphasis,
      competitions: s.competitions, subscription: s.subscription,
      quickLogs: s.quickLogs, gripTests: s.gripTests, gripExerciseLogs: s.gripExerciseLogs,
      activeEquipmentProfile: s.activeEquipmentProfile,
      notificationPreferences: s.notificationPreferences,
      workoutSkips: s.workoutSkips, illnessLogs: s.illnessLogs,
      cycleLogs: s.cycleLogs, mealReminders: s.mealReminders,
      dailyLoginBonus: s.dailyLoginBonus, lastSyncAt: Date.now(),
      colorTheme: s.colorTheme, dietPhaseHistory: s.dietPhaseHistory,
      weightCutPlans: s.weightCutPlans, combatNutritionProfile: s.combatNutritionProfile,
      fightCampPlans: s.fightCampPlans, activeSupplements: s.activeSupplements,
      supplementStack: s.supplementStack, supplementIntakes: s.supplementIntakes,
      homeGymEquipment: s.homeGymEquipment, mentalCheckIns: s.mentalCheckIns,
      confidenceLedger: s.confidenceLedger, featureFeedback: s.featureFeedback,
      seenInsights: s.seenInsights, dismissedInsights: s.dismissedInsights,
      readArticles: s.readArticles, bookmarkedArticles: s.bookmarkedArticles,
      lastInsightDate: s.lastInsightDate,
      nutritionPeriodPlan: s.nutritionPeriodPlan, mealStamps: s.mealStamps,
      _resolvedIllnessIds: s._resolvedIllnessIds,
      latestWhoopData: s.latestWhoopData, wearableHistory: s.wearableHistory,
      whoopWorkouts: s.whoopWorkouts,
      _lastDevice: deviceType,
      _lastDeviceUA: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : '',
      // Quick Access pins (stored in localStorage, not Zustand)
      _quickAccessPins: typeof window !== 'undefined'
        ? (() => { try { return JSON.parse(localStorage.getItem('roots-explore-pinned') || '[]'); } catch { return []; } })()
        : [],
    };
  }, [deviceType]);

  // Manual force-sync: push local data to server FIRST, then pull latest
  const forceSync = useCallback(async () => {
    if (!effectiveUserId) return;
    lastResyncAt.current = Date.now();
    setSyncStatus('syncing');

    const before = useAppStore.getState();
    const beforeCounts = {
      meals: (before.meals ?? []).length,
      workouts: (before.workoutLogs ?? []).length,
    };
    console.log('[db-sync] Force sync START:', beforeCounts);

    try {
      // Step 1: Push local data to cloud
      const payload = buildSyncPayload();
      if (payload) {
        console.log('[db-sync] Pushing payload with', (payload.meals as unknown[])?.length ?? 0, 'meals');
        await forcePushToCloud(effectiveUserId, payload);
        console.log('[db-sync] Push complete');
      } else {
        console.warn('[db-sync] buildSyncPayload returned null — skipping push');
      }

      // Step 2: Pull latest from cloud (merges any data from other devices)
      console.log('[db-sync] Pulling from cloud...');
      const pullSuccess = await pullFromCloud(effectiveUserId, true);
      if (pullSuccess) {
        if (!hasPulledSuccessfully.current) hasPulledSuccessfully.current = true;
        setSyncStatus('success');
        setLastSyncedAt(new Date());

        const after = useAppStore.getState();
        console.log('[db-sync] Force sync DONE:', {
          meals: `${beforeCounts.meals} → ${(after.meals ?? []).length}`,
          workouts: `${beforeCounts.workouts} → ${(after.workoutLogs ?? []).length}`,
        });
      } else {
        console.warn('[db-sync] Force sync: push succeeded but pull failed');
        setSyncStatus('error');
      }
      setTimeout(() => setSyncStatus(prev => (prev === 'success' || prev === 'error') ? 'idle' : prev), 3000);
    } catch (err) {
      console.error('[db-sync] Force sync failed:', err);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus(prev => prev === 'error' ? 'idle' : prev), 5000);
    }
  }, [effectiveUserId, pullFromCloud, buildSyncPayload]);

  // Save to database on meaningful state changes (debounced)
  useEffect(() => {
    if (!effectiveUserId || !initialLoadDone.current) return;

    // CRITICAL: Don't push until we've successfully pulled from server at least once.
    // Without this, a device with stale localStorage pushes old data before the pull
    // completes (e.g., pull fails with 401 because auth isn't ready yet), and the
    // server merge uses the stale timestamps/data, corrupting other devices' state.
    if (!hasPulledSuccessfully.current) return;

    // Safety: never push empty/fresh state that could overwrite real server data
    const hasRealData = store.isOnboarded && store.user && (store.workoutLogs?.length > 0 || store.trainingSessions?.length > 0 || store.meals?.length > 0);
    if (!hasRealData) {
      return; // Don't push blank state — wait until user has real data
    }

    // Create a fingerprint of the data to detect actual changes
    const syncData: Record<string, unknown> = {
      user: store.user,
      isOnboarded: store.isOnboarded,
      isAuthenticated: store.isAuthenticated,
      onboardingData: store.onboardingData,
      baselineLifts: store.baselineLifts,
      currentMesocycle: store.currentMesocycle,
      mesocycleHistory: store.mesocycleHistory,
      mesocycleQueue: store.mesocycleQueue,
      workoutLogs: store.workoutLogs,
      gamificationStats: store.gamificationStats,
      bodyWeightLog: store.bodyWeightLog,
      injuryLog: store.injuryLog,
      customExercises: store.customExercises,
      sessionTemplates: store.sessionTemplates,
      hrSessions: store.hrSessions,
      trainingSessions: store.trainingSessions,
      themeMode: store.themeMode,
      meals: store.meals,
      macroTargets: store.macroTargets,
      waterLog: store.waterLog,
      activeDietPhase: store.activeDietPhase,
      weeklyCheckIns: store.weeklyCheckIns,
      bodyComposition: store.bodyComposition,
      muscleEmphasis: store.muscleEmphasis,
      competitions: store.competitions,
      subscription: store.subscription,
      quickLogs: store.quickLogs,
      gripTests: store.gripTests,
      gripExerciseLogs: store.gripExerciseLogs,
      activeEquipmentProfile: store.activeEquipmentProfile,
      notificationPreferences: store.notificationPreferences,
      workoutSkips: store.workoutSkips,
      illnessLogs: store.illnessLogs,
      cycleLogs: store.cycleLogs,
      mealReminders: store.mealReminders,
      dailyLoginBonus: store.dailyLoginBonus,
      lastSyncAt: Date.now(),
      // Combat / nutrition / supplements (previously missing from sync)
      colorTheme: store.colorTheme,
      dietPhaseHistory: store.dietPhaseHistory,
      weightCutPlans: store.weightCutPlans,
      combatNutritionProfile: store.combatNutritionProfile,
      fightCampPlans: store.fightCampPlans,
      activeSupplements: store.activeSupplements,
      supplementStack: store.supplementStack,
      supplementIntakes: store.supplementIntakes,
      homeGymEquipment: store.homeGymEquipment,
      // Mental / knowledge base tracking
      mentalCheckIns: store.mentalCheckIns,
      confidenceLedger: store.confidenceLedger,
      featureFeedback: store.featureFeedback,
      seenInsights: store.seenInsights,
      dismissedInsights: store.dismissedInsights,
      readArticles: store.readArticles,
      bookmarkedArticles: store.bookmarkedArticles,
      lastInsightDate: store.lastInsightDate,
      // Nutrition planning / meal shortcuts
      nutritionPeriodPlan: store.nutritionPeriodPlan,
      mealStamps: store.mealStamps,
      _resolvedIllnessIds: store._resolvedIllnessIds,
      // Wearable data (so sleep/strain shows on all devices)
      latestWhoopData: store.latestWhoopData,
      wearableHistory: store.wearableHistory,
      whoopWorkouts: store.whoopWorkouts,
      // Device metadata for multi-device awareness
      _lastDevice: deviceType,
      _lastDeviceUA: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : '',
    };

    // Backup Whoop tokens and Quick Access pins so they survive cache clears
    if (typeof window !== 'undefined') {
      const whoopAccess = localStorage.getItem('whoop_access_token');
      if (whoopAccess) {
        syncData._whoopTokens = {
          accessToken: whoopAccess,
          refreshToken: localStorage.getItem('whoop_refresh_token') || '',
          tokenExpires: localStorage.getItem('whoop_token_expires') || '',
        };
      }
      try {
        const pins = JSON.parse(localStorage.getItem('roots-explore-pinned') || '[]');
        if (Array.isArray(pins) && pins.length > 0) {
          syncData._quickAccessPins = pins;
        }
      } catch { /* ignore */ }
    }

    const fingerprint = JSON.stringify(syncData);
    if (fingerprint !== lastSyncRef.current) {
      lastSyncRef.current = fingerprint;
      saveToDatabase(effectiveUserId, syncData);
      setLastSyncedAt(new Date());

      // Write-through: if a critical mutation flagged urgent, flush immediately
      if (store._syncUrgent) {
        useAppStore.setState({ _syncUrgent: false });
        flushImmediateSync().catch(() => {});
      }
    }
  }, [
    store.user,
    store.isOnboarded,
    store.isAuthenticated,
    store.onboardingData,
    store.baselineLifts,
    store.currentMesocycle,
    store.mesocycleHistory,
    store.mesocycleQueue,
    store.workoutLogs,
    store.gamificationStats,
    store.bodyWeightLog,
    store.injuryLog,
    store.customExercises,
    store.sessionTemplates,
    store.hrSessions,
    store.trainingSessions,
    store.themeMode,
    store.meals,
    store.macroTargets,
    store.waterLog,
    store.activeDietPhase,
    store.weeklyCheckIns,
    store.bodyComposition,
    store.muscleEmphasis,
    store.competitions,
    store.subscription,
    store.quickLogs,
    store.gripTests,
    store.gripExerciseLogs,
    store.activeEquipmentProfile,
    store.notificationPreferences,
    store.workoutSkips,
    store.illnessLogs,
    store.cycleLogs,
    store.mealReminders,
    store.dailyLoginBonus,
    store.lastSyncAt,
    // Combat / nutrition / supplements
    store.colorTheme,
    store.dietPhaseHistory,
    store.weightCutPlans,
    store.combatNutritionProfile,
    store.fightCampPlans,
    store.activeSupplements,
    store.supplementStack,
    store.supplementIntakes,
    store.homeGymEquipment,
    // Mental / knowledge base tracking
    store.mentalCheckIns,
    store.confidenceLedger,
    store.featureFeedback,
    store.seenInsights,
    store.dismissedInsights,
    store.readArticles,
    store.bookmarkedArticles,
    store.lastInsightDate,
    // Nutrition planning / meal shortcuts
    store.nutritionPeriodPlan,
    store.mealStamps,
    store._resolvedIllnessIds,
    deviceType,
  ]);

  // ── Heartbeat sync: push to server every 5 minutes as a safety net ──────
  // Ensures data reaches the server even if change-based sync misses something
  useEffect(() => {
    if (!effectiveUserId || !initialLoadDone.current) return;

    const heartbeat = setInterval(async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;

      // Only push if we've pulled successfully at least once (prevents stale overwrites)
      if (hasPulledSuccessfully.current) {
        const payload = buildSyncPayload();
        if (payload) {
          try {
            await forcePushToCloud(effectiveUserId, payload);
          } catch {
            // Heartbeat push failure is logged by recordSyncFailure in doSync
          }
        }
      }
      // Pull after push so other devices' changes propagate within 2 min
      try {
        const success = await pullFromCloud(effectiveUserId, true);
        if (success && !hasPulledSuccessfully.current) {
          hasPulledSuccessfully.current = true;
        }
      } catch {
        // Non-critical — next heartbeat will retry
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(heartbeat);
  }, [effectiveUserId, buildSyncPayload, pullFromCloud]);

  // ── IndexedDB snapshot: save known-good state every 5 minutes ──────────
  // Survives localStorage clears — second line of defense after server backup
  useEffect(() => {
    if (!initialLoadDone.current) return;

    const snapshotInterval = setInterval(() => {
      const payload = buildSyncPayload();
      if (payload) {
        saveLatestSnapshot(payload).catch(() => {});
      }
    }, HEARTBEAT_INTERVAL_MS);

    // Also save an initial snapshot once load is complete
    const payload = buildSyncPayload();
    if (payload) {
      saveLatestSnapshot(payload).catch(() => {});
    }

    return () => clearInterval(snapshotInterval);
  }, [isInitialLoadComplete, buildSyncPayload]);

  // ── Sync failure listener: surface persistent failures to user ──────────
  const [syncFailureCount, setSyncFailureCount] = useState(0);
  useEffect(() => {
    const unsubscribe = onSyncFailure((failures) => {
      setSyncFailureCount(failures);
      setSyncStatus('error');
    });
    return unsubscribe;
  }, []);

  return {
    isInitialLoadComplete,
    syncStatus,
    lastSyncedAt,
    deviceType,
    forceSync,
    isAuthenticated: !!effectiveUserId,
    syncFailureCount,
  };
}
