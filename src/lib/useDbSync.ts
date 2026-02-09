'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from './store';
import { loadFromDatabase, saveToDatabase, resolveConflicts, initDatabase } from './db-sync';
import { SyncConflict, buildConflictFields } from '@/components/SyncConflictResolver';

/**
 * Sync Zustand store with Vercel Postgres.
 * @param authUserId — The authenticated user's ID from NextAuth session.
 *                      When provided, this overrides store.user?.id for all DB operations.
 * @param sessionStatus — NextAuth session status ('loading' | 'authenticated' | 'unauthenticated')
 * @returns { isInitialLoadComplete } - Whether the initial database load has finished
 */
export function useDbSync(authUserId?: string | null, sessionStatus?: string) {
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
      }).catch((err) => {
        console.error('[db-sync] Database initialization failed:', err);
      });
    }
  }, []);

  // Load from database on mount (if user exists)
  useEffect(() => {
    if (!effectiveUserId || initialLoadDone.current) return;

    loadFromDatabase(effectiveUserId).catch((err) => {
      console.error('[db-sync] Failed to load from database:', err);
      return null;
    }).then((dbData) => {
      if (dbData) {
        const dbUpdated = new Date((dbData.user as Record<string, unknown>)?.updatedAt as string || 0).getTime();
        const localUpdated = new Date(store.user?.updatedAt || 0).getTime();
        const localIsEmpty = !store.isOnboarded && !store.user;
        const dbHasProfile = dbData.isOnboarded === true && dbData.user;

        // Check if there's a real conflict (both sides have changes since last sync)
        // Skip conflict check if local is empty — just restore from DB
        if (!localIsEmpty) {
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
        }

        // Force-restore: if local is empty but DB has a completed profile, always restore
        // Also restore normally when DB is newer than local
        if (localIsEmpty && dbHasProfile || dbUpdated > localUpdated) {
          // DB is newer or local is blank — hydrate store from DB (restore all synced fields)
          const fieldsToMerge: Record<string, unknown> = {};
          const restoreFields = [
            'user', 'isAuthenticated', 'onboardingData', 'baselineLifts',
            'currentMesocycle', 'mesocycleHistory', 'workoutLogs', 'gamificationStats',
            'bodyWeightLog', 'injuryLog', 'customExercises', 'sessionTemplates',
            'hrSessions', 'trainingSessions', 'themeMode', 'meals', 'macroTargets',
            'waterLog', 'activeDietPhase', 'weeklyCheckIns', 'bodyComposition',
            'muscleEmphasis', 'competitions', 'subscription', 'quickLogs',
            'gripTests', 'gripExerciseLogs', 'activeEquipmentProfile',
            'notificationPreferences', 'workoutSkips', 'illnessLogs',
            'mealReminders', 'dailyLoginBonus', 'lastSyncAt',
          ];
          for (const field of restoreFields) {
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
      }
      initialLoadDone.current = true;
      setIsInitialLoadComplete(true);
    });
  }, [effectiveUserId]);

  // If no user AND session is resolved (not still loading), mark as complete (guest mode)
  useEffect(() => {
    if (!effectiveUserId && !initialLoadDone.current && sessionStatus !== 'loading') {
      initialLoadDone.current = true;
      setIsInitialLoadComplete(true);
    }
  }, [effectiveUserId, sessionStatus]);

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
  ]);

  return { isInitialLoadComplete };
}
