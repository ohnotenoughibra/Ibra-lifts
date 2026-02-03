'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from './store';
import { loadFromDatabase, saveToDatabase, initDatabase } from './db-sync';

export function useDbSync() {
  const store = useAppStore();
  const lastSyncRef = useRef<string>('');
  const initialLoadDone = useRef(false);
  const dbInitDone = useRef(false);

  // Initialize database table on first mount
  useEffect(() => {
    if (!dbInitDone.current) {
      dbInitDone.current = true;
      initDatabase().then((ok) => {
        if (ok) {
          console.log('[db-sync] Database initialized');
        }
      });
    }
  }, []);

  // Load from database on mount (if user exists)
  useEffect(() => {
    if (!store.user?.id || initialLoadDone.current) return;

    loadFromDatabase(store.user.id).then((dbData) => {
      if (dbData) {
        // Check if DB data is newer than localStorage data
        const dbUpdated = new Date(dbData.user?.updatedAt || 0).getTime();
        const localUpdated = new Date(store.user?.updatedAt || 0).getTime();

        if (dbUpdated > localUpdated) {
          // DB is newer - hydrate store from DB
          // Only merge specific data fields to avoid clobbering active UI state
          const fieldsToMerge: Record<string, any> = {};
          if (dbData.workoutLogs) fieldsToMerge.workoutLogs = dbData.workoutLogs;
          if (dbData.bodyWeightLog) fieldsToMerge.bodyWeightLog = dbData.bodyWeightLog;
          if (dbData.gamificationStats) fieldsToMerge.gamificationStats = dbData.gamificationStats;
          if (dbData.injuryLog) fieldsToMerge.injuryLog = dbData.injuryLog;
          if (dbData.customExercises) fieldsToMerge.customExercises = dbData.customExercises;
          if (dbData.sessionTemplates) fieldsToMerge.sessionTemplates = dbData.sessionTemplates;
          if (dbData.hrSessions) fieldsToMerge.hrSessions = dbData.hrSessions;
          if (dbData.grapplingSessions) fieldsToMerge.grapplingSessions = dbData.grapplingSessions;
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
            console.log('[db-sync] Loaded data from database (DB was newer)');
          }
        } else {
          console.log('[db-sync] Local data is current, no merge needed');
        }
      }
      initialLoadDone.current = true;
    });
  }, [store.user?.id]);

  // Save to database on meaningful state changes (debounced)
  useEffect(() => {
    if (!store.user?.id || !initialLoadDone.current) return;

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
      grapplingSessions: store.grapplingSessions,
      themeMode: store.themeMode,
    };

    const fingerprint = JSON.stringify(syncData);
    if (fingerprint !== lastSyncRef.current) {
      lastSyncRef.current = fingerprint;
      saveToDatabase(store.user.id, syncData);
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
    store.grapplingSessions,
    store.themeMode,
  ]);
}
