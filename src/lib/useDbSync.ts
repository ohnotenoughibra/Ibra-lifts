'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from './store';
import { loadFromDatabase, saveToDatabase, resolveConflicts, initDatabase } from './db-sync';
import { SyncConflict, buildConflictFields } from '@/components/SyncConflictResolver';

/**
 * Sync Zustand store with Vercel Postgres.
 * @param authUserId — The authenticated user's ID from NextAuth session.
 *                      When provided, this overrides store.user?.id for all DB operations.
 * @returns { isInitialLoadComplete } - Whether the initial database load has finished
 */
export function useDbSync(authUserId?: string | null) {
  const store = useAppStore();
  const lastSyncRef = useRef<string>('');
  const initialLoadDone = useRef(false);
  const dbInitDone = useRef(false);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

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
      });
    }
  }, []);

  // Load from database on mount (if user exists)
  useEffect(() => {
    if (!effectiveUserId || initialLoadDone.current) return;

    loadFromDatabase(effectiveUserId).then((dbData) => {
      if (dbData) {
        const dbUpdated = new Date((dbData.user as Record<string, unknown>)?.updatedAt as string || 0).getTime();
        const localUpdated = new Date(store.user?.updatedAt || 0).getTime();

        // Check if there's a real conflict (both sides have changes since last sync)
        const localLogs = store.workoutLogs || [];
        const remoteLogs = Array.isArray(dbData.workoutLogs) ? dbData.workoutLogs : [];
        const hasLocalUniqueData = localLogs.some(
          l => !remoteLogs.find((r: Record<string, unknown>) => r.id === l.id)
        );
        const hasRemoteUniqueData = remoteLogs.some(
          (r: Record<string, unknown>) => !localLogs.find(l => l.id === r.id)
        );

        // Both sides have unique data = conflict
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
            // Surface the conflict to the store for the UI to pick up
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
            initialLoadDone.current = true;
            return;
          }
        }

        if (dbUpdated > localUpdated) {
          // DB is newer - hydrate store from DB
          const fieldsToMerge: Record<string, unknown> = {};
          if (dbData.workoutLogs) fieldsToMerge.workoutLogs = dbData.workoutLogs;
          if (dbData.bodyWeightLog) fieldsToMerge.bodyWeightLog = dbData.bodyWeightLog;
          if (dbData.gamificationStats) fieldsToMerge.gamificationStats = dbData.gamificationStats;
          if (dbData.injuryLog) fieldsToMerge.injuryLog = dbData.injuryLog;
          if (dbData.customExercises) fieldsToMerge.customExercises = dbData.customExercises;
          if (dbData.sessionTemplates) fieldsToMerge.sessionTemplates = dbData.sessionTemplates;
          if (dbData.hrSessions) fieldsToMerge.hrSessions = dbData.hrSessions;
          if (dbData.trainingSessions) fieldsToMerge.trainingSessions = dbData.trainingSessions;
          if (dbData.currentMesocycle) fieldsToMerge.currentMesocycle = dbData.currentMesocycle;
          if (dbData.mesocycleHistory) fieldsToMerge.mesocycleHistory = dbData.mesocycleHistory;
          if (dbData.baselineLifts) fieldsToMerge.baselineLifts = dbData.baselineLifts;
          if (dbData.user) fieldsToMerge.user = dbData.user;
          if (dbData.isOnboarded !== undefined) fieldsToMerge.isOnboarded = dbData.isOnboarded;
          if (dbData.isAuthenticated !== undefined) fieldsToMerge.isAuthenticated = dbData.isAuthenticated;
          if (dbData.onboardingData) fieldsToMerge.onboardingData = dbData.onboardingData;
          if (dbData.themeMode) fieldsToMerge.themeMode = dbData.themeMode;

          if (Object.keys(fieldsToMerge).length > 0) {
            useAppStore.setState(fieldsToMerge);
            if (process.env.NODE_ENV === 'development') {
              console.log('[db-sync] Loaded data from database (DB was newer)');
            }
          }
        } else if (process.env.NODE_ENV === 'development') {
          console.log('[db-sync] Local data is current, no merge needed');
        }
      }
      initialLoadDone.current = true;
      setIsInitialLoadComplete(true);
    });
  }, [effectiveUserId]);

  // If no user, mark initial load as complete immediately (guest mode)
  useEffect(() => {
    if (!effectiveUserId && !initialLoadDone.current) {
      initialLoadDone.current = true;
      setIsInitialLoadComplete(true);
    }
  }, [effectiveUserId]);

  // Save to database on meaningful state changes (debounced)
  useEffect(() => {
    if (!effectiveUserId || !initialLoadDone.current) return;

    // Create a fingerprint of the data to detect actual changes
    const syncData = {
      user: store.user,
      isOnboarded: store.isOnboarded,
      isAuthenticated: store.isAuthenticated,
      onboardingData: store.onboardingData,
      baselineLifts: store.baselineLifts,
      currentMesocycle: store.currentMesocycle,
      mesocycleHistory: store.mesocycleHistory,
      workoutLogs: store.workoutLogs,
      gamificationStats: store.gamificationStats,
      bodyWeightLog: store.bodyWeightLog,
      injuryLog: store.injuryLog,
      customExercises: store.customExercises,
      sessionTemplates: store.sessionTemplates,
      hrSessions: store.hrSessions,
      trainingSessions: store.trainingSessions,
      themeMode: store.themeMode,
    };

    const fingerprint = JSON.stringify(syncData);
    if (fingerprint !== lastSyncRef.current) {
      lastSyncRef.current = fingerprint;
      saveToDatabase(effectiveUserId, syncData);
    }
  }, [
    store.user,
    store.isOnboarded,
    store.isAuthenticated,
    store.onboardingData,
    store.baselineLifts,
    store.currentMesocycle,
    store.mesocycleHistory,
    store.workoutLogs,
    store.gamificationStats,
    store.bodyWeightLog,
    store.injuryLog,
    store.customExercises,
    store.sessionTemplates,
    store.hrSessions,
    store.trainingSessions,
    store.themeMode,
  ]);

  return { isInitialLoadComplete };
}
