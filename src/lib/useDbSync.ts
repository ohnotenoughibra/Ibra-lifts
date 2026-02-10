'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from './store';
import { loadFromDatabase, saveToDatabase, resolveConflicts, initDatabase } from './db-sync';
import { SyncConflict, buildConflictFields } from '@/components/SyncConflictResolver';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

// Minimum interval between re-syncs on focus (30 seconds)
const RESYNC_COOLDOWN_MS = 30_000;

// Fields to restore from the database
const RESTORE_FIELDS = [
  'user', 'isAuthenticated', 'onboardingData', 'baselineLifts',
  'currentMesocycle', 'mesocycleHistory', 'mesocycleQueue', 'workoutLogs', 'gamificationStats',
  'bodyWeightLog', 'injuryLog', 'customExercises', 'sessionTemplates',
  'hrSessions', 'trainingSessions', 'themeMode', 'meals', 'macroTargets',
  'waterLog', 'activeDietPhase', 'weeklyCheckIns', 'bodyComposition',
  'muscleEmphasis', 'competitions', 'subscription', 'quickLogs',
  'gripTests', 'gripExerciseLogs', 'activeEquipmentProfile',
  'notificationPreferences', 'workoutSkips', 'illnessLogs',
  'mealReminders', 'dailyLoginBonus', 'lastSyncAt',
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
): boolean {
  const store = useAppStore.getState();
  const dbUpdated = new Date((dbData.user as Record<string, unknown>)?.updatedAt as string || 0).getTime();
  const localUpdated = new Date(store.user?.updatedAt || 0).getTime();
  const localIsEmpty = !store.isOnboarded && !store.user;
  const dbHasProfile = dbData.isOnboarded === true && dbData.user;

  // Check for conflicts (skip if local is empty)
  if (!localIsEmpty) {
    const localLogs = store.workoutLogs || [];
    const remoteLogs = Array.isArray(dbData.workoutLogs) ? dbData.workoutLogs : [];
    const hasLocalUniqueData = localLogs.some(
      l => !remoteLogs.find((r: Record<string, unknown>) => r.id === l.id)
    );
    const hasRemoteUniqueData = remoteLogs.some(
      (r: Record<string, unknown>) => !localLogs.find(l => l.id === r.id)
    );

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

    // On re-sync with no conflict: if remote is newer, silently merge arrays
    if (isResync && hasRemoteUniqueData && !hasLocalUniqueData) {
      // Remote has new data we don't have — safe to merge
      const merged = resolveConflicts(
        { workoutLogs: localLogs, lastSyncAt: store.lastSyncAt || 0 },
        dbData,
      );
      const fieldsToMerge: Record<string, unknown> = {};
      for (const field of RESTORE_FIELDS) {
        if (merged[field] !== undefined) fieldsToMerge[field] = merged[field];
      }
      if (dbData.isOnboarded !== undefined) fieldsToMerge.isOnboarded = dbData.isOnboarded;
      if (Object.keys(fieldsToMerge).length > 0) {
        useAppStore.setState(fieldsToMerge);
      }
      return true;
    }
  }

  // Force-restore: if local is empty but DB has a completed profile, always restore
  // Also restore normally when DB is newer than local
  if ((localIsEmpty && dbHasProfile) || dbUpdated > localUpdated) {
    const fieldsToMerge: Record<string, unknown> = {};
    for (const field of RESTORE_FIELDS) {
      if (dbData[field] !== undefined) fieldsToMerge[field] = dbData[field];
    }
    if (dbData.isOnboarded !== undefined) fieldsToMerge.isOnboarded = dbData.isOnboarded;

    if (Object.keys(fieldsToMerge).length > 0) {
      useAppStore.setState(fieldsToMerge);
      if (process.env.NODE_ENV === 'development') {
        console.log(`[db-sync] Loaded data from database (${localIsEmpty ? 'local was empty' : 'DB was newer'})`);
      }
    }

    // Restore Whoop tokens from DB backup if local tokens are missing
    const whoopTokens = dbData._whoopTokens as Record<string, string> | undefined;
    if (whoopTokens && typeof window !== 'undefined') {
      if (!localStorage.getItem('whoop_access_token') && whoopTokens.accessToken) {
        localStorage.setItem('whoop_access_token', whoopTokens.accessToken);
        if (whoopTokens.refreshToken) localStorage.setItem('whoop_refresh_token', whoopTokens.refreshToken);
        if (whoopTokens.tokenExpires) localStorage.setItem('whoop_token_expires', whoopTokens.tokenExpires);
      }
    }
  } else if (process.env.NODE_ENV === 'development') {
    console.log('[db-sync] Local data is current, no merge needed');
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
  const pullFromCloud = useCallback(async (userId: string, isResync: boolean) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncStatus('offline');
      return;
    }
    setSyncStatus('syncing');
    try {
      const dbData = await loadFromDatabase(userId);
      if (dbData) {
        applyRemoteData(dbData, isResync);
      }
      setSyncStatus('success');
      setLastSyncedAt(new Date());

      // Clear success status after 3 seconds
      setTimeout(() => setSyncStatus(prev => prev === 'success' ? 'idle' : prev), 3000);
    } catch (err) {
      console.error('[db-sync] Sync failed:', err);
      setSyncStatus('error');
      // Clear error status after 5 seconds
      setTimeout(() => setSyncStatus(prev => prev === 'error' ? 'idle' : prev), 5000);
    }
  }, []);

  // Load from database on mount (if user exists)
  useEffect(() => {
    if (!effectiveUserId || initialLoadDone.current) return;

    pullFromCloud(effectiveUserId, false).then(() => {
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
        console.log('[db-sync] App regained focus — re-syncing from cloud');
      }
      pullFromCloud(effectiveUserId, true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [effectiveUserId, pullFromCloud]);

  // ── Update sync status on online/offline changes ──────────────
  useEffect(() => {
    const handleOnline = () => setSyncStatus(prev => prev === 'offline' ? 'idle' : prev);
    const handleOffline = () => setSyncStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Manual force-sync function for the UI
  const forceSync = useCallback(() => {
    if (!effectiveUserId) return;
    lastResyncAt.current = Date.now();
    pullFromCloud(effectiveUserId, true);
  }, [effectiveUserId, pullFromCloud]);

  // Save to database on meaningful state changes (debounced)
  useEffect(() => {
    if (!effectiveUserId || !initialLoadDone.current) return;

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
      mealReminders: store.mealReminders,
      dailyLoginBonus: store.dailyLoginBonus,
      lastSyncAt: store.lastSyncAt,
      // Device metadata for multi-device awareness
      _lastDevice: deviceType,
      _lastDeviceUA: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : '',
    };

    // Backup Whoop tokens so they survive cache clears
    if (typeof window !== 'undefined') {
      const whoopAccess = localStorage.getItem('whoop_access_token');
      if (whoopAccess) {
        syncData._whoopTokens = {
          accessToken: whoopAccess,
          refreshToken: localStorage.getItem('whoop_refresh_token') || '',
          tokenExpires: localStorage.getItem('whoop_token_expires') || '',
        };
      }
    }

    const fingerprint = JSON.stringify(syncData);
    if (fingerprint !== lastSyncRef.current) {
      lastSyncRef.current = fingerprint;
      saveToDatabase(effectiveUserId, syncData);
      setLastSyncedAt(new Date());
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
    store.mealReminders,
    store.dailyLoginBonus,
    store.lastSyncAt,
    deviceType,
  ]);

  return {
    isInitialLoadComplete,
    syncStatus,
    lastSyncedAt,
    deviceType,
    forceSync,
    isAuthenticated: !!effectiveUserId,
  };
}
