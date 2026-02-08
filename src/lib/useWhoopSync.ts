'use client';

// ── Background Whoop Sync ─────────────────────────────────────────────────
// Lightweight hook that syncs Whoop data on app load and periodically,
// so the Home tab, ActiveWorkout, and RecoveryCoach always show fresh data
// without requiring the user to open the Wearable overlay.

import { useEffect, useRef } from 'react';
import { useAppStore } from './store';
import type { WearableData, WhoopWorkout } from './types';

const LS_KEYS = {
  accessToken: 'whoop_access_token',
  refreshToken: 'whoop_refresh_token',
  tokenExpires: 'whoop_token_expires',
};

const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const STALE_THRESHOLD_MS = 15 * 60 * 1000; // consider data stale after 15 min

function getToken(key: string): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(key) || '';
}

function setToken(key: string, value: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, value);
}

// Minimal transform: cycles → WearableData, matching WearableIntegration logic
function whoopDateKey(record: any): string | null {
  const ts = record.end || record.start || record.created_at;
  return ts?.substring(0, 10) || null;
}

function transformApiData(apiData: any): WearableData[] {
  const dataMap = new Map<string, Partial<WearableData>>();

  function mergeDay(dateKey: string, fields: Partial<WearableData>) {
    dataMap.set(dateKey, { ...(dataMap.get(dateKey) || {}), ...fields });
  }

  // Cycles (strain, calories, HR)
  if (apiData.cycles) {
    for (const cycle of apiData.cycles) {
      if (!cycle.score && cycle.score_state && cycle.score_state !== 'SCORED') continue;
      const dateKey = whoopDateKey(cycle)
        || cycle.updated_at?.substring(0, 10)
        || new Date().toISOString().substring(0, 10);
      mergeDay(dateKey, {
        id: cycle.id?.toString() || dateKey,
        date: new Date(cycle.end || cycle.updated_at || cycle.start || new Date()),
        provider: 'whoop',
        strain: cycle.score?.strain ?? null,
        caloriesBurned: cycle.score?.kilojoule ? Math.round(cycle.score.kilojoule * 0.239006) : null,
        avgHeartRate: cycle.score?.average_heart_rate ?? null,
        maxHeartRate: cycle.score?.max_heart_rate ?? null,
      });
    }
  }

  // Recovery (score, HRV, resting HR)
  if (apiData.recovery) {
    for (const rec of apiData.recovery) {
      if (rec.score_state && rec.score_state !== 'SCORED') continue;
      const dateKey = whoopDateKey(rec);
      if (!dateKey) continue;
      const existing = dataMap.get(dateKey) || {};
      let skinTemp: number | null = null;
      if (rec.score?.skin_temp_celsius != null) {
        skinTemp = Math.round((rec.score.skin_temp_celsius * 9 / 5 + 32) * 10) / 10;
      }
      mergeDay(dateKey, {
        id: existing.id || rec.cycle_id?.toString() || rec.id?.toString() || dateKey,
        date: existing.date || new Date(rec.end || rec.start || rec.created_at || dateKey),
        provider: 'whoop',
        recoveryScore: rec.score?.recovery_score ?? null,
        hrv: rec.score?.hrv_rmssd_milli ? Math.round(rec.score.hrv_rmssd_milli) : null,
        restingHR: rec.score?.resting_heart_rate ? Math.round(rec.score.resting_heart_rate) : null,
        respiratoryRate: existing.respiratoryRate ?? rec.score?.respiratory_rate ?? null,
        skinTemp,
        spo2: rec.score?.spo2_percentage ?? null,
      });
    }
  }

  // Sleep
  if (apiData.sleep) {
    for (const sl of apiData.sleep) {
      if (sl.score_state && sl.score_state !== 'SCORED') continue;
      const dateKey = whoopDateKey(sl);
      if (!dateKey) continue;
      const existing = dataMap.get(dateKey) || {};
      const totalMs = sl.score?.stage_summary?.total_in_bed_time_milli ?? 0;
      const stages = sl.score?.stage_summary;
      const need = sl.score?.sleep_needed;
      let sleepNeededHours: number | null = null;
      if (need) {
        const totalNeedMs = (need.baseline_milli || 0) + (need.need_from_sleep_debt_milli || 0)
          + (need.need_from_recent_strain_milli || 0) + (need.need_from_recent_nap_milli || 0);
        if (totalNeedMs > 0) sleepNeededHours = Math.round((totalNeedMs / 3600000) * 10) / 10;
      }
      mergeDay(dateKey, {
        date: existing.date || new Date(sl.end || sl.start || dateKey),
        provider: 'whoop',
        sleepScore: sl.score?.sleep_performance_percentage ?? null,
        sleepHours: totalMs > 0 ? Math.round((totalMs / 3600000) * 10) / 10 : null,
        respiratoryRate: sl.score?.respiratory_rate ?? existing.respiratoryRate ?? null,
        sleepEfficiency: sl.score?.sleep_efficiency_percentage ?? null,
        deepSleepMinutes: stages?.total_slow_wave_sleep_time_milli != null ? Math.round(stages.total_slow_wave_sleep_time_milli / 60000) : null,
        remSleepMinutes: stages?.total_rem_sleep_time_milli != null ? Math.round(stages.total_rem_sleep_time_milli / 60000) : null,
        lightSleepMinutes: stages?.total_light_sleep_time_milli != null ? Math.round(stages.total_light_sleep_time_milli / 60000) : null,
        sleepDisturbances: stages?.disturbance_count ?? null,
        sleepCycleCount: stages?.sleep_cycle_count ?? null,
        sleepConsistency: sl.score?.sleep_consistency_percentage ?? null,
        sleepNeededHours,
      });
    }
  }

  // Ensure today has an entry
  const todayKey = new Date().toISOString().substring(0, 10);
  if (!dataMap.has(todayKey)) {
    dataMap.set(todayKey, { id: `today-${todayKey}`, date: new Date(), provider: 'whoop' });
  }

  return Array.from(dataMap.values())
    .filter((d): d is WearableData => d.date != null && d.id != null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

const WHOOP_SPORTS: Record<number, string> = {
  0: 'Running', 1: 'Cycling', 38: 'Wrestling', 39: 'Boxing', 43: 'Pilates',
  44: 'Yoga', 47: 'HIIT', 48: 'Weightlifting', 49: 'CrossFit',
  52: 'Functional Fitness', 57: 'Martial Arts', 63: 'Stretching',
  70: 'Brazilian Jiu Jitsu', 71: 'Kickboxing', 73: 'Calisthenics',
  84: 'MMA', 85: 'Judo', 87: 'Muay Thai', 88: 'Sambo',
};

function transformWorkouts(apiData: any): WhoopWorkout[] {
  if (!apiData.workouts) return [];
  return apiData.workouts
    .filter((w: any) => w.score_state === 'SCORED' || w.score)
    .map((w: any) => ({
      id: w.id?.toString() || '',
      sportId: w.sport_id ?? -1,
      sportName: WHOOP_SPORTS[w.sport_id ?? -1] || `Sport ${w.sport_id}`,
      start: new Date(w.start),
      end: new Date(w.end),
      strain: w.score?.strain ?? null,
      avgHR: w.score?.average_heart_rate ?? null,
      maxHR: w.score?.max_heart_rate ?? null,
      calories: w.score?.kilojoule ? Math.round(w.score.kilojoule * 0.239006) : null,
      distanceMeters: w.score?.distance_meter ?? null,
      zones: (w.score?.zone_duration || []).map((_: any, i: number) => ({
        zone: i,
        minutes: Math.round(((w.score?.zone_duration?.[i] ?? 0)) / 60000),
      })),
    }));
}

/**
 * Background Whoop sync hook. Call once in page.tsx.
 * Fetches fresh data on mount and every 30 minutes.
 */
export function useWhoopSync() {
  const syncInFlight = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    async function sync() {
      if (syncInFlight.current) return;
      const accessToken = getToken(LS_KEYS.accessToken);
      if (!accessToken) return; // Whoop not connected

      // Skip if data is still fresh
      const lastSync = useAppStore.getState().latestWhoopData?.date;
      if (lastSync && Date.now() - new Date(lastSync).getTime() < STALE_THRESHOLD_MS) return;

      syncInFlight.current = true;
      try {
        const refreshToken = getToken(LS_KEYS.refreshToken);
        const res = await fetch('/api/whoop/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }),
        });

        if (!res.ok) { syncInFlight.current = false; return; }
        const data = await res.json();

        // Update tokens if refreshed
        if (data.new_access_token) {
          setToken(LS_KEYS.accessToken, data.new_access_token);
          if (data.new_refresh_token) setToken(LS_KEYS.refreshToken, data.new_refresh_token);
          if (data.new_expires_in) {
            setToken(LS_KEYS.tokenExpires, String(Date.now() + data.new_expires_in * 1000));
          }
        }

        if (data.connected) {
          const transformed = transformApiData(data);
          if (transformed.length > 0) {
            useAppStore.getState().setLatestWhoopData(transformed[transformed.length - 1]);
            useAppStore.getState().setWearableHistory(transformed);
          }
          const workouts = transformWorkouts(data);
          if (workouts.length > 0) {
            useAppStore.getState().setWhoopWorkouts(workouts);
          }
        }
      } catch {
        // Silent fail — user can still manually refresh from Wearable overlay
      } finally {
        syncInFlight.current = false;
      }
    }

    // Sync on mount
    sync();

    // Sync every 30 minutes
    intervalRef.current = setInterval(sync, SYNC_INTERVAL_MS);

    // Also sync when app regains focus (e.g., user switches back from another app)
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') sync();
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);
}
