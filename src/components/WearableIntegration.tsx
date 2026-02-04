'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity,
  Heart,
  Moon,
  Zap,
  Battery,
  ChevronLeft,
  RefreshCw,
  Settings,
  TrendingUp,
  TrendingDown,
  Minus,
  Thermometer,
  Wind,
  Loader2,
  ExternalLink,
  AlertCircle,
  Droplets,
  BedDouble,
  Brain,
  Dumbbell,
  Timer,
  Gauge,
  Scale,
  Ruler,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { WearableData, WearableProvider, WhoopWorkout, WhoopBodyMeasurement, GrapplingType, GrapplingIntensity } from '@/lib/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LS_KEYS = {
  accessToken: 'whoop_access_token',
  refreshToken: 'whoop_refresh_token',
  tokenExpires: 'whoop_token_expires',
  oauthState: 'whoop_oauth_state',
} as const;

/** Buffer before expiry to trigger proactive refresh (5 minutes) */
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WearableIntegrationProps {
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function recoveryColor(score: number): string {
  if (score >= 67) return 'text-green-400';
  if (score >= 34) return 'text-yellow-400';
  return 'text-red-400';
}

function recoveryBg(score: number): string {
  if (score >= 67) return 'bg-green-500/20';
  if (score >= 34) return 'bg-yellow-500/20';
  return 'bg-red-500/20';
}

function recoveryBorder(score: number): string {
  if (score >= 67) return 'border-green-500/40';
  if (score >= 34) return 'border-yellow-500/40';
  return 'border-red-500/40';
}

function recoveryLabel(score: number): string {
  if (score >= 67) return 'Green';
  if (score >= 34) return 'Yellow';
  return 'Red';
}

function strainColor(strain: number): string {
  if (strain >= 18) return 'text-red-400';
  if (strain >= 14) return 'text-orange-400';
  if (strain >= 10) return 'text-yellow-400';
  return 'text-blue-400';
}

function trendIcon(current: number, previous: number) {
  if (current > previous) return <TrendingUp className="w-3.5 h-3.5 text-green-400" />;
  if (current < previous) return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-grappler-500" />;
}

/** Check if the stored access token is expired or about to expire */
function isTokenExpired(): boolean {
  try {
    const expiresStr = localStorage.getItem(LS_KEYS.tokenExpires);
    if (!expiresStr) return true;
    const expiresAt = parseInt(expiresStr, 10);
    if (isNaN(expiresAt)) return true;
    return Date.now() >= expiresAt - TOKEN_EXPIRY_BUFFER_MS;
  } catch {
    return true;
  }
}

/** Read a token from localStorage safely */
function getToken(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Store a token in localStorage safely */
function setToken(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch { /* best effort */ }
}

/** Clear all Whoop tokens from localStorage */
function clearTokens(): void {
  try {
    localStorage.removeItem(LS_KEYS.accessToken);
    localStorage.removeItem(LS_KEYS.refreshToken);
    localStorage.removeItem(LS_KEYS.tokenExpires);
    localStorage.removeItem(LS_KEYS.oauthState);
  } catch { /* best effort */ }
}

// ---------------------------------------------------------------------------
// Transform Whoop API data into our WearableData format
// ---------------------------------------------------------------------------

interface WhoopApiResponse {
  connected: boolean;
  profile?: any;
  recovery?: any[];
  cycles?: any[];
  sleep?: any[];
  workouts?: any[];
  body?: any;
  lastSync?: string;
  error?: string;
  requiresReconnect?: boolean;
  // Inline token refresh — no second round-trip needed
  new_access_token?: string;
  new_refresh_token?: string;
  new_expires_in?: number;
  warnings?: string[];
}

/**
 * Normalize a Whoop timestamp to a YYYY-MM-DD date key.
 *
 * Whoop cycles/sleep start at sleep onset (e.g., 23:00 Feb 2) but conceptually
 * belong to the next calendar day (Feb 3). Recovery is created at wake-up on
 * Feb 3. Using raw `start` timestamps would put cycle data on Feb 2 and recovery
 * on Feb 3 — they'd never merge.
 *
 * Fix: prefer the `end` timestamp (wake-up / cycle-end), which lands on the
 * correct calendar day. Fall back to `start`, then `created_at`.
 */
function whoopDateKey(record: any): string | null {
  // Prefer end time (represents the "day" the data belongs to)
  const ts = record.end || record.start || record.created_at;
  return ts?.substring(0, 10) || null;
}

function transformWhoopData(apiData: WhoopApiResponse): WearableData[] {
  const dataMap = new Map<string, Partial<WearableData>>();

  // Helper: merge new fields into an existing day entry
  function mergeDay(dateKey: string, fields: Partial<WearableData>) {
    const existing = dataMap.get(dateKey) || {};
    dataMap.set(dateKey, { ...existing, ...fields });
  }

  // --- Process cycles (strain, calories) ---
  // Include PENDING_STRAIN cycles — they still carry running strain/calorie data.
  // Only skip cycles with no score object at all.
  if (apiData.cycles) {
    for (const cycle of apiData.cycles) {
      if (!cycle.score && cycle.score_state && cycle.score_state !== 'SCORED') continue;
      // For ongoing cycles, `end` may be null — use `updated_at` or `start`, keyed to today
      const dateKey = whoopDateKey(cycle)
        || (cycle.updated_at?.substring(0, 10))
        || new Date().toISOString().substring(0, 10);
      mergeDay(dateKey, {
        id: cycle.id?.toString() || dateKey,
        date: new Date(cycle.end || cycle.updated_at || cycle.start || new Date()),
        provider: 'whoop' as WearableProvider,
        strain: cycle.score?.strain ?? null,
        caloriesBurned: cycle.score?.kilojoule
          ? Math.round(cycle.score.kilojoule * 0.239006)
          : null,
        avgHeartRate: cycle.score?.average_heart_rate ?? null,
        maxHeartRate: cycle.score?.max_heart_rate ?? null,
      });
    }
  }

  // --- Process recovery (recovery score, HRV, resting HR, skin temp) ---
  if (apiData.recovery) {
    for (const rec of apiData.recovery) {
      if (rec.score_state && rec.score_state !== 'SCORED') continue;
      const dateKey = whoopDateKey(rec);
      if (!dateKey) continue;
      const existing = dataMap.get(dateKey) || {};

      // Skin temp: v2 returns absolute Celsius (e.g., 33.4).
      // Convert to Fahrenheit: C * 9/5 + 32.
      let skinTemp: number | null = null;
      if (rec.score?.skin_temp_celsius != null) {
        const c = rec.score.skin_temp_celsius;
        skinTemp = Math.round((c * 9 / 5 + 32) * 10) / 10;
      }

      mergeDay(dateKey, {
        id: existing.id || rec.cycle_id?.toString() || rec.id?.toString() || dateKey,
        date: existing.date || new Date(rec.end || rec.start || rec.created_at || dateKey),
        provider: 'whoop' as WearableProvider,
        recoveryScore: rec.score?.recovery_score ?? null,
        hrv: rec.score?.hrv_rmssd_milli
          ? Math.round(rec.score.hrv_rmssd_milli)
          : null,
        restingHR: rec.score?.resting_heart_rate
          ? Math.round(rec.score.resting_heart_rate)
          : null,
        // v2 moved respiratory_rate from recovery to sleep — keep checking
        // here for backwards compat but it'll usually be null in v2
        respiratoryRate: existing.respiratoryRate ?? rec.score?.respiratory_rate ?? null,
        skinTemp,
        spo2: rec.score?.spo2_percentage ?? null,
      });
    }
  }

  // --- Process sleep (sleep score, hours, respiratory rate) ---
  if (apiData.sleep) {
    for (const sl of apiData.sleep) {
      if (sl.score_state && sl.score_state !== 'SCORED') continue;
      // Use END time (wake-up) as the date key — matches recovery's day
      const dateKey = whoopDateKey(sl);
      if (!dateKey) continue;
      const existing = dataMap.get(dateKey) || {};
      const totalSleepMs = sl.score?.stage_summary?.total_in_bed_time_milli ?? 0;
      const sleepHours = totalSleepMs > 0
        ? Math.round((totalSleepMs / 3600000) * 10) / 10
        : null;

      const stages = sl.score?.stage_summary;
      const deepMs = stages?.total_slow_wave_sleep_time_milli;
      const remMs = stages?.total_rem_sleep_time_milli;
      const lightMs = stages?.total_light_sleep_time_milli;

      // Calculate total sleep need from all components
      const need = sl.score?.sleep_needed;
      let sleepNeededHours: number | null = null;
      if (need) {
        const totalNeedMs = (need.baseline_milli || 0)
          + (need.need_from_sleep_debt_milli || 0)
          + (need.need_from_recent_strain_milli || 0)
          + (need.need_from_recent_nap_milli || 0);
        if (totalNeedMs > 0) {
          sleepNeededHours = Math.round((totalNeedMs / 3600000) * 10) / 10;
        }
      }

      mergeDay(dateKey, {
        date: existing.date || new Date(sl.end || sl.start || dateKey),
        provider: 'whoop' as WearableProvider,
        sleepScore: sl.score?.sleep_performance_percentage ?? null,
        sleepHours,
        // v2: respiratory_rate lives in sleep score, not recovery
        respiratoryRate: sl.score?.respiratory_rate ?? existing.respiratoryRate ?? null,
        sleepEfficiency: sl.score?.sleep_efficiency_percentage ?? null,
        deepSleepMinutes: deepMs != null ? Math.round(deepMs / 60000) : null,
        remSleepMinutes: remMs != null ? Math.round(remMs / 60000) : null,
        lightSleepMinutes: lightMs != null ? Math.round(lightMs / 60000) : null,
        sleepDisturbances: stages?.disturbance_count ?? null,
        sleepCycleCount: stages?.sleep_cycle_count ?? null,
        sleepConsistency: sl.score?.sleep_consistency_percentage ?? null,
        sleepNeededHours,
      });
    }
  }

  // --- Carry forward strain/calories to the latest entry ---
  // The current physiological cycle is typically PENDING_SCORE (no strain data).
  // The most recent SCORED cycle ends up on the previous date key. Recovery and
  // sleep for today land on today's key. This leaves today's entry missing
  // strain/calories even though the last scored values are from the adjacent cycle.
  const sortedKeys = Array.from(dataMap.keys()).sort();
  if (sortedKeys.length >= 2) {
    const latestEntry = dataMap.get(sortedKeys[sortedKeys.length - 1]);
    const prevEntry = dataMap.get(sortedKeys[sortedKeys.length - 2]);
    if (latestEntry && prevEntry) {
      // Carry forward cycle-derived metrics (strain, calories, HR)
      if (latestEntry.strain == null && prevEntry.strain != null) {
        latestEntry.strain = prevEntry.strain;
      }
      if (latestEntry.caloriesBurned == null && prevEntry.caloriesBurned != null) {
        latestEntry.caloriesBurned = prevEntry.caloriesBurned;
      }
      if (latestEntry.avgHeartRate == null && prevEntry.avgHeartRate != null) {
        latestEntry.avgHeartRate = prevEntry.avgHeartRate;
      }
      if (latestEntry.maxHeartRate == null && prevEntry.maxHeartRate != null) {
        latestEntry.maxHeartRate = prevEntry.maxHeartRate;
      }
    }
  }

  return Array.from(dataMap.values())
    .filter((d): d is WearableData => d.date != null && d.id != null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// ---------------------------------------------------------------------------
// Whoop sport ID → display name
// ---------------------------------------------------------------------------

const WHOOP_SPORTS: Record<number, string> = {
  [-1]: 'Activity',
  0: 'Running',
  1: 'Cycling',
  16: 'Baseball',
  17: 'Basketball',
  18: 'Rowing',
  19: 'Fencing',
  20: 'Field Hockey',
  21: 'Football',
  22: 'Golf',
  24: 'Ice Hockey',
  25: 'Lacrosse',
  27: 'Rugby',
  28: 'Sailing',
  29: 'Skiing',
  30: 'Soccer',
  31: 'Softball',
  32: 'Squash',
  33: 'Swimming',
  34: 'Tennis',
  35: 'Track & Field',
  36: 'Volleyball',
  37: 'Water Polo',
  38: 'Wrestling',
  39: 'Boxing',
  42: 'Dance',
  43: 'Pilates',
  44: 'Yoga',
  45: 'Weightlifting',
  47: 'Cross Country Skiing',
  48: 'Functional Fitness',
  49: 'Duathlon',
  51: 'Gymnastics',
  52: 'HIIT',
  53: 'Hiking',
  55: 'Horseback Riding',
  56: 'Kayaking',
  57: 'Martial Arts',
  59: 'Mountain Biking',
  60: 'Paddleboarding',
  62: 'Rock Climbing',
  63: 'Snowboarding',
  64: 'Surfing',
  65: 'Triathlon',
  66: 'Walking',
  70: 'Brazilian Jiu Jitsu',
  71: 'Kickboxing',
  73: 'Meditation',
  74: 'Other',
  75: 'Spin',
  76: 'Stairmaster',
  77: 'Stretching',
  82: 'Elliptical',
  83: 'Jump Rope',
  84: 'MMA',
  86: 'Obstacle Course Racing',
  87: 'Powerlifting',
  88: 'Sauna',
  89: 'Strength Training',
  90: 'Assault Bike',
};

// ---------------------------------------------------------------------------
// Transform Whoop workouts
// ---------------------------------------------------------------------------

function transformWhoopWorkouts(apiData: WhoopApiResponse): WhoopWorkout[] {
  if (!apiData.workouts) return [];

  return apiData.workouts
    .filter((w: any) => w.score_state === 'SCORED' && w.score)
    .map((w: any) => {
      const zones: { zone: number; minutes: number }[] = [];
      const zd = w.score?.zone_duration;
      if (zd) {
        for (let i = 0; i <= 5; i++) {
          const ms = zd[`zone_${i === 0 ? 'zero' : ['one', 'two', 'three', 'four', 'five'][i - 1]}_milli`];
          if (ms != null && ms > 0) {
            zones.push({ zone: i, minutes: Math.round(ms / 60000) });
          }
        }
      }

      return {
        id: w.id?.toString() || `workout-${Date.now()}`,
        sportId: w.sport_id ?? -1,
        sportName: WHOOP_SPORTS[w.sport_id] || 'Workout',
        start: new Date(w.start),
        end: new Date(w.end),
        strain: w.score?.strain ?? null,
        avgHR: w.score?.average_heart_rate ?? null,
        maxHR: w.score?.max_heart_rate ?? null,
        calories: w.score?.kilojoule
          ? Math.round(w.score.kilojoule * 0.239006)
          : null,
        distanceMeters: w.score?.distance_meter ?? null,
        zones,
      } satisfies WhoopWorkout;
    })
    .sort((a: WhoopWorkout, b: WhoopWorkout) =>
      new Date(b.start).getTime() - new Date(a.start).getTime()
    );
}

// ---------------------------------------------------------------------------
// Transform Whoop body measurement
// ---------------------------------------------------------------------------

function transformWhoopBody(apiData: WhoopApiResponse): WhoopBodyMeasurement | null {
  if (!apiData.body) return null;
  return {
    heightMeters: apiData.body.height_meter ?? null,
    weightKg: apiData.body.weight_kilogram ?? null,
    maxHeartRate: apiData.body.max_heart_rate ?? null,
  };
}

// ---------------------------------------------------------------------------
// Whoop combat sport → GrapplingType mapping
// ---------------------------------------------------------------------------

const WHOOP_COMBAT_SPORT_MAP: Record<number, GrapplingType> = {
  38: 'wrestling',
  39: 'boxing',
  57: 'other',        // Generic "Martial Arts"
  70: 'bjj_nogi',     // Brazilian Jiu Jitsu (can't detect gi vs nogi)
  71: 'kickboxing',
  84: 'mma',
};

/**
 * Estimate grappling intensity from Whoop strain.
 * Whoop strain is 0-21 scale (logarithmic cardiovascular load).
 */
function strainToIntensity(strain: number | null): GrapplingIntensity {
  if (strain == null || strain < 8) return 'light_flow';
  if (strain < 13) return 'moderate';
  if (strain < 17) return 'hard_sparring';
  return 'competition_prep';
}

/**
 * Auto-import Whoop combat sport workouts as grappling sessions.
 * Only imports workouts that haven't already been imported (dedup by whoopWorkoutId).
 */
function autoImportCombatWorkouts(whoopWorkouts: WhoopWorkout[]): void {
  const store = useAppStore.getState();
  const existingSessions = store.grapplingSessions;

  // Find combat sport workouts not yet imported
  const combatWorkouts = whoopWorkouts.filter(w => {
    const grapplingType = WHOOP_COMBAT_SPORT_MAP[w.sportId];
    if (!grapplingType) return false;
    // Check dedup — skip if already imported
    return !existingSessions.some(s => s.whoopWorkoutId === w.id);
  });

  for (const ww of combatWorkouts) {
    const grapplingType = WHOOP_COMBAT_SPORT_MAP[ww.sportId]!;
    const durationMin = Math.round(
      (new Date(ww.end).getTime() - new Date(ww.start).getTime()) / 60000
    );

    store.addGrapplingSession({
      date: new Date(ww.start),
      type: grapplingType,
      intensity: strainToIntensity(ww.strain),
      duration: durationMin,
      perceivedExertion: ww.strain != null ? Math.min(10, Math.round(ww.strain / 2.1)) : 5,
      notes: `Auto-imported from Whoop (${ww.sportName})`,
      whoopHR: {
        avgHR: ww.avgHR ?? 0,
        maxHR: ww.maxHR ?? 0,
        strain: ww.strain ?? 0,
        calories: ww.calories ?? 0,
        zones: ww.zones.length > 0 ? ww.zones : undefined,
      },
      whoopWorkoutId: ww.id,
    });

    // Also create an HRSession for the cardio tracking view
    const hrZones: Record<string, number> = { zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0 };
    for (const z of ww.zones) {
      if (z.zone >= 1 && z.zone <= 5) {
        hrZones[`zone${z.zone}`] = Math.round(z.minutes * 60); // seconds
      }
    }
    store.addHRSession({
      date: new Date(ww.start),
      type: 'grappling_cardio',
      duration: durationMin,
      avgHR: ww.avgHR ?? 0,
      maxHR: ww.maxHR ?? 0,
      timeInZones: hrZones as any,
      caloriesBurned: ww.calories ?? 0,
      notes: `Whoop: ${ww.sportName}`,
    });
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WearableIntegration({ onClose }: WearableIntegrationProps) {
  const user = useAppStore(s => s.user);
  const weightUnit = user?.weightUnit || 'lbs';
  const [wearableData, setWearableData] = useState<WearableData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualRecovery, setManualRecovery] = useState('');
  const [manualHRV, setManualHRV] = useState('');
  const [manualRHR, setManualRHR] = useState('');
  const [manualSleepHours, setManualSleepHours] = useState('');
  const [manualStrain, setManualStrain] = useState('');
  const [autoAdjust, setAutoAdjust] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [whoopProfile, setWhoopProfile] = useState<any>(null);
  const [whoopWorkouts, setWhoopWorkouts] = useState<WhoopWorkout[]>([]);
  const [whoopBody, setWhoopBody] = useState<WhoopBodyMeasurement | null>(null);
  const [showSleepDetails, setShowSleepDetails] = useState(false);
  const [showVitals, setShowVitals] = useState(false);
  const fetchInFlight = useRef(false);

  // ------------------------------------------------------------------
  // DB token persistence helpers (cross-device sign-in)
  // ------------------------------------------------------------------
  const loadTokensFromDb = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/whoop/tokens', { credentials: 'include' });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.tokens?.access_token) {
        setToken(LS_KEYS.accessToken, data.tokens.access_token);
        if (data.tokens.refresh_token) setToken(LS_KEYS.refreshToken, data.tokens.refresh_token);
        if (data.tokens.expires_at) setToken(LS_KEYS.tokenExpires, data.tokens.expires_at);
        return true;
      }
    } catch { /* DB unavailable */ }
    return false;
  }, []);

  const saveTokensToDb = useCallback((at: string, rt: string, exp: string) => {
    fetch('/api/whoop/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ access_token: at, refresh_token: rt, expires_at: exp }),
    }).catch(() => {});
  }, []);

  const clearTokensFromDb = useCallback(() => {
    fetch('/api/whoop/tokens', { method: 'DELETE', credentials: 'include' }).catch(() => {});
  }, []);

  // ------------------------------------------------------------------
  // Core data fetcher — handles token refresh inline
  // ------------------------------------------------------------------
  const fetchWhoopData = useCallback(async () => {
    // Prevent concurrent fetches
    if (fetchInFlight.current) return;
    fetchInFlight.current = true;

    let accessToken = getToken(LS_KEYS.accessToken);
    let refreshToken = getToken(LS_KEYS.refreshToken);

    // If localStorage is empty, try loading from DB (cross-device persistence)
    if (!accessToken) {
      const loaded = await loadTokensFromDb();
      if (loaded) {
        accessToken = getToken(LS_KEYS.accessToken);
        refreshToken = getToken(LS_KEYS.refreshToken);
      }
    }

    if (!accessToken) {
      setIsConnected(false);
      setIsLoading(false);
      fetchInFlight.current = false;
      return;
    }

    try {
      setIsSyncing(true);
      setError(null);

      const res = await fetch('/api/whoop/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        }),
      });

      // Handle non-JSON responses (e.g., 502 from Vercel)
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Server returned ${res.status}. Please try again.`);
      }

      const data: WhoopApiResponse = await res.json();

      // --- Handle inline token refresh ---
      // The server refreshed our token and still returned data — update localStorage + DB
      if (data.new_access_token) {
        const newExp = data.new_expires_in ? String(Date.now() + data.new_expires_in * 1000) : '';
        setToken(LS_KEYS.accessToken, data.new_access_token);
        if (data.new_refresh_token) {
          setToken(LS_KEYS.refreshToken, data.new_refresh_token);
        }
        if (newExp) {
          setToken(LS_KEYS.tokenExpires, newExp);
        }
        // Persist refreshed tokens to DB
        saveTokensToDb(data.new_access_token, data.new_refresh_token || refreshToken || '', newExp);
      }

      // --- Handle response ---
      if (data.connected) {
        setIsConnected(true);
        setWhoopProfile(data.profile);
        const transformed = transformWhoopData(data);
        setWearableData(transformed);
        const whoopWkts = transformWhoopWorkouts(data);
        setWhoopWorkouts(whoopWkts);
        setWhoopBody(transformWhoopBody(data));
        setLastSync(new Date());

        // Persist to the global store for workout adjustments and analytics
        if (transformed.length > 0) {
          useAppStore.getState().setLatestWhoopData(transformed[transformed.length - 1]);
          useAppStore.getState().setWearableHistory(transformed);
        }
        useAppStore.getState().setWhoopWorkouts(whoopWkts);

        // Auto-sync Whoop body weight to body weight log
        const bodyData = transformWhoopBody(data);
        if (bodyData?.weightKg) {
          const weightUnit = useAppStore.getState().user?.weightUnit || 'lbs';
          const weight = weightUnit === 'kg' ? bodyData.weightKg : Math.round(bodyData.weightKg * 2.20462 * 10) / 10;
          const bwLog = useAppStore.getState().bodyWeightLog;
          const today = new Date().toDateString();
          const alreadyLogged = bwLog.some(e => new Date(e.date).toDateString() === today && e.notes === 'Whoop sync');
          if (!alreadyLogged) {
            useAppStore.getState().addBodyWeight(weight, 'Whoop sync');
          }
        }

        // Auto-import combat sport workouts as grappling sessions + HR sessions
        if (whoopWkts.length > 0) {
          autoImportCombatWorkouts(whoopWkts);
        }

        // Show warnings if some endpoints had issues (partial data)
        if (data.warnings && data.warnings.length > 0) {
          setError(`Some data unavailable: ${data.warnings[0]}`);
        }
      } else {
        // Connection failed
        setIsConnected(false);

        if (data.requiresReconnect) {
          // Tokens are dead — clear everything and show reconnect prompt
          clearTokens();
          clearTokensFromDb();
          setError(data.error || 'Session expired. Please reconnect your Whoop.');
        } else if (data.error) {
          setError(data.error);
        }
      }
    } catch (err: any) {
      setIsConnected(false);
      setError(`Failed to fetch Whoop data: ${err.message || 'network error'}`);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
      fetchInFlight.current = false;
    }
  }, [loadTokensFromDb, saveTokensToDb, clearTokensFromDb]);

  // ------------------------------------------------------------------
  // On mount: handle OAuth callback params, then fetch data
  // ------------------------------------------------------------------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // --- Handle OAuth error ---
    if (params.get('whoop_error')) {
      const rawError = params.get('whoop_error')!;
      setError(`Whoop connection failed: ${decodeURIComponent(rawError)}`);
      // Clean up URL completely (search params + hash)
      window.history.replaceState({}, '', window.location.pathname);
      setIsLoading(false);
      return;
    }

    // --- Handle OAuth success ---
    if (params.get('whoop_connected') === 'true') {
      // Check URL hash for fallback tokens (if localStorage failed in callback page)
      if (window.location.hash && window.location.hash.length > 1) {
        try {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const at = hashParams.get('whoop_at');
          const rt = hashParams.get('whoop_rt');
          const exp = hashParams.get('whoop_exp');
          if (at) {
            setToken(LS_KEYS.accessToken, at);
            if (rt) setToken(LS_KEYS.refreshToken, rt);
            if (exp) setToken(LS_KEYS.tokenExpires, exp);
          }
        } catch {
          // Hash parse errors — tokens should already be in localStorage from callback
        }
      }
      // Clean up URL completely
      window.history.replaceState({}, '', window.location.pathname);
    }

    fetchWhoopData();
  }, [fetchWhoopData]);

  // ------------------------------------------------------------------
  // Derived data
  // ------------------------------------------------------------------
  const today = wearableData.length > 0 ? wearableData[wearableData.length - 1] : null;
  const yesterday = wearableData.length >= 2 ? wearableData[wearableData.length - 2] : null;

  const chartData = useMemo(
    () =>
      wearableData.map((d) => ({
        day: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
        recovery: d.recoveryScore ?? 0,
        hrv: d.hrv ?? 0,
        strain: d.strain ?? 0,
      })),
    [wearableData],
  );

  const avgRecovery = useMemo(() => {
    const scores = wearableData
      .map((d) => d.recoveryScore)
      .filter((s): s is number => s != null);
    return scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
  }, [wearableData]);

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------
  const handleConnect = () => {
    window.location.href = '/api/whoop/auth';
  };

  const handleDisconnect = () => {
    clearTokens();
    clearTokensFromDb();
    setIsConnected(false);
    setWearableData([]);
    setWhoopWorkouts([]);
    setWhoopBody(null);
    setWhoopProfile(null);
    setLastSync(null);
    setError(null);
    useAppStore.getState().setWhoopWorkouts([]);
  };

  const handleSync = () => {
    fetchWhoopData();
  };

  const handleManualSubmit = () => {
    const newEntry: WearableData = {
      id: `manual-${Date.now()}`,
      date: new Date(),
      provider: 'whoop' as WearableProvider,
      recoveryScore: manualRecovery ? parseInt(manualRecovery) : null,
      hrv: manualHRV ? parseInt(manualHRV) : null,
      restingHR: manualRHR ? parseInt(manualRHR) : null,
      sleepHours: manualSleepHours ? parseFloat(manualSleepHours) : null,
      sleepScore: null,
      strain: manualStrain ? parseFloat(manualStrain) : null,
      respiratoryRate: null,
      skinTemp: null,
      caloriesBurned: null,
      spo2: null,
      sleepEfficiency: null,
      deepSleepMinutes: null,
      remSleepMinutes: null,
      sleepDisturbances: null,
      lightSleepMinutes: null,
      sleepCycleCount: null,
      sleepConsistency: null,
      sleepNeededHours: null,
      avgHeartRate: null,
      maxHeartRate: null,
    };

    setWearableData((prev) => [...prev, newEntry]);
    setShowManualEntry(false);
    setManualRecovery('');
    setManualHRV('');
    setManualRHR('');
    setManualSleepHours('');
    setManualStrain('');
  };

  // ------------------------------------------------------------------
  // Training readiness (derived from today's recovery score)
  // ------------------------------------------------------------------
  const readiness = useMemo(() => {
    const score = today?.recoveryScore ?? 0;
    if (score >= 67) {
      return {
        title: 'Peak Readiness',
        message: 'Full send — your body is recovered. Hit it hard today.',
        accent: 'text-green-400',
        bg: 'bg-green-500/10 border-green-500/30',
        icon: <Zap className="w-5 h-5 text-green-400" />,
      };
    }
    if (score >= 34) {
      return {
        title: 'Moderate Readiness',
        message: 'Moderate intensity recommended. Consider lighter loads or fewer sets.',
        accent: 'text-yellow-400',
        bg: 'bg-yellow-500/10 border-yellow-500/30',
        icon: <Activity className="w-5 h-5 text-yellow-400" />,
      };
    }
    return {
      title: 'Recovery Day',
      message: 'Recovery day recommended. Consider mobility work or light cardio.',
      accent: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/30',
      icon: <Battery className="w-5 h-5 text-red-400" />,
    };
  }, [today]);

  const strainPct = today?.strain != null ? Math.min((today.strain / 21) * 100, 100) : 0;

  // ------------------------------------------------------------------
  // Loading state
  // ------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="min-h-screen bg-grappler-900 bg-mesh flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-green-400 animate-spin mx-auto mb-3" />
          <p className="text-grappler-400 text-sm">Connecting to Whoop...</p>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className="min-h-screen bg-grappler-900 bg-mesh pb-20"
    >
      {/* Header */}
      <header className="sticky top-0 z-40 bg-grappler-900/80 backdrop-blur-xl border-b border-grappler-800">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="btn btn-ghost btn-sm p-1">
              <ChevronLeft className="w-5 h-5 text-grappler-200" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <h1 className="font-bold text-grappler-50 text-lg leading-tight">Whoop</h1>
                <p className="text-xs text-grappler-500">
                  {whoopProfile
                    ? `${whoopProfile.first_name || ''} ${whoopProfile.last_name || ''}`.trim() ||
                      'Connected'
                    : 'Wearable Integration'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected && (
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="btn btn-ghost btn-sm p-1.5"
              >
                <RefreshCw
                  className={cn('w-4 h-4 text-grappler-400', isSyncing && 'animate-spin')}
                />
              </button>
            )}
            <button
              onClick={() => setShowManualEntry(!showManualEntry)}
              className="btn btn-ghost btn-sm p-1.5"
            >
              <Settings className="w-4 h-4 text-grappler-400" />
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-5">
        {/* Error Banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-3"
          >
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-300">{error}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <button
                  onClick={() => setError(null)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Dismiss
                </button>
                {!isConnected && (
                  <button
                    onClick={handleConnect}
                    className="text-xs text-green-400 hover:text-green-300 font-medium"
                  >
                    Reconnect
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Connection Status */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={cn(
            'card p-4 flex items-center justify-between',
            isConnected ? 'border-green-500/30' : 'border-red-500/30',
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-3 h-3 rounded-full',
                isConnected
                  ? 'bg-green-400 shadow-lg shadow-green-400/40'
                  : 'bg-red-400',
              )}
            />
            <div>
              <p className="text-sm font-medium text-grappler-100">
                {isConnected ? 'Connected' : 'Not Connected'}
              </p>
              {isConnected && lastSync && (
                <p className="text-xs text-grappler-500">
                  Last sync{' '}
                  {lastSync.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={isConnected ? handleDisconnect : handleConnect}
            className={cn(
              'btn btn-sm',
              isConnected ? 'btn-secondary' : 'btn-primary',
            )}
          >
            {isConnected ? 'Disconnect' : 'Connect'}
          </button>
        </motion.div>

        {/* Connected Dashboard */}
        {isConnected && today && (
          <>
            {/* ── RECOVERY HERO ── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={cn('rounded-2xl p-5 border', readiness.bg)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <span className="text-xs font-semibold text-grappler-400 uppercase tracking-wider">Recovery</span>
                  <div className="flex items-end gap-2 mt-1">
                    <span className={cn('text-5xl font-black tabular-nums', recoveryColor(today.recoveryScore ?? 0))}>
                      {today.recoveryScore ?? '--'}
                    </span>
                    <span className="text-grappler-500 text-base pb-2">%</span>
                  </div>
                  <div className="mt-3 h-2.5 bg-black/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${today.recoveryScore ?? 0}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={cn(
                        'h-full rounded-full',
                        (today.recoveryScore ?? 0) >= 67 ? 'bg-gradient-to-r from-green-500 to-green-400'
                          : (today.recoveryScore ?? 0) >= 34 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                            : 'bg-gradient-to-r from-red-500 to-red-400',
                      )}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 ml-4">
                  <span className={cn(
                    'text-xs font-semibold px-2.5 py-1 rounded-full',
                    recoveryBg(today.recoveryScore ?? 0),
                    recoveryColor(today.recoveryScore ?? 0),
                  )}>
                    {recoveryLabel(today.recoveryScore ?? 0)}
                  </span>
                </div>
              </div>
              {/* Training readiness advice inline */}
              <div className="flex items-center gap-2.5 mt-4 pt-3 border-t border-white/5">
                <div className="shrink-0">{readiness.icon}</div>
                <div>
                  <p className={cn('text-xs font-semibold', readiness.accent)}>{readiness.title}</p>
                  <p className="text-xs text-grappler-400 leading-relaxed">{readiness.message}</p>
                </div>
              </div>
            </motion.div>

            {/* ── KEY METRICS ROW ── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="grid grid-cols-3 gap-2.5"
            >
              {/* Strain */}
              <div className="bg-grappler-800 rounded-xl p-3.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Zap className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[11px] text-grappler-500">Strain</span>
                </div>
                <p className={cn('text-xl font-bold', strainColor(today.strain ?? 0))}>
                  {today.strain?.toFixed(1) ?? '--'}
                </p>
                <div className="mt-1.5 h-1 bg-grappler-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${strainPct}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 via-yellow-400 to-red-500"
                  />
                </div>
              </div>
              {/* HRV */}
              <div className="bg-grappler-800 rounded-xl p-3.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Activity className="w-3.5 h-3.5 text-primary-400" />
                  <span className="text-[11px] text-grappler-500">HRV</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xl font-bold text-grappler-50">{today.hrv ?? '--'}</p>
                  {yesterday?.hrv != null && today.hrv != null && trendIcon(today.hrv, yesterday.hrv)}
                </div>
                <span className="text-[10px] text-grappler-600">ms</span>
              </div>
              {/* Resting HR */}
              <div className="bg-grappler-800 rounded-xl p-3.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Heart className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-[11px] text-grappler-500">RHR</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xl font-bold text-grappler-50">{today.restingHR ?? '--'}</p>
                  {yesterday?.restingHR != null && today.restingHR != null && trendIcon(yesterday.restingHR, today.restingHR)}
                </div>
                <span className="text-[10px] text-grappler-600">bpm</span>
              </div>
            </motion.div>

            {/* ── SLEEP SECTION ── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-grappler-800 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setShowSleepDetails(!showSleepDetails)}
                className="w-full p-4 flex items-center justify-between hover:bg-grappler-750 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Moon className="w-4 h-4 text-purple-400" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-grappler-100">Sleep</p>
                    <p className="text-xs text-grappler-500">
                      {today.sleepHours != null ? `${today.sleepHours.toFixed(1)} hrs` : '--'}
                      {today.sleepScore != null && ` · Score ${today.sleepScore}`}
                      {today.sleepEfficiency != null && ` · ${today.sleepEfficiency.toFixed(0)}% eff.`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {today.sleepNeededHours != null && today.sleepHours != null && (
                    <span className={cn(
                      'text-xs font-semibold px-2 py-0.5 rounded-full',
                      today.sleepHours >= today.sleepNeededHours ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400',
                    )}>
                      {today.sleepHours >= today.sleepNeededHours ? '+' : ''}{(today.sleepHours - today.sleepNeededHours).toFixed(1)}h
                    </span>
                  )}
                  <motion.div animate={{ rotate: showSleepDetails ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-4 h-4 text-grappler-500" />
                  </motion.div>
                </div>
              </button>

              {/* Sleep stage bar (always visible) */}
              {(today.deepSleepMinutes != null || today.remSleepMinutes != null || today.lightSleepMinutes != null) && (
                <div className="px-4 pb-3">
                  {(() => {
                    const deep = today.deepSleepMinutes ?? 0;
                    const rem = today.remSleepMinutes ?? 0;
                    const light = today.lightSleepMinutes ?? 0;
                    const total = deep + rem + light;
                    if (total === 0) return null;
                    return (
                      <>
                        <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                          <div className="rounded-l-full bg-indigo-500" style={{ width: `${(deep / total) * 100}%` }} />
                          <div className="bg-purple-400" style={{ width: `${(rem / total) * 100}%` }} />
                          <div className="rounded-r-full bg-purple-300/40" style={{ width: `${(light / total) * 100}%` }} />
                        </div>
                        <div className="flex justify-between mt-1.5 text-[10px]">
                          <span className="text-indigo-400">Deep {deep}m</span>
                          <span className="text-purple-400">REM {rem}m</span>
                          <span className="text-purple-300/60">Light {light}m</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Expanded sleep details */}
              <AnimatePresence>
                {showSleepDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 grid grid-cols-2 gap-2.5 border-t border-grappler-700/50 pt-3">
                      {today.sleepConsistency != null && (
                        <div className="bg-grappler-900/50 rounded-lg p-3">
                          <span className="text-[10px] text-grappler-500 flex items-center gap-1"><Timer className="w-3 h-3" /> Consistency</span>
                          <p className="text-lg font-bold text-grappler-100 mt-0.5">{today.sleepConsistency.toFixed(0)}%</p>
                        </div>
                      )}
                      {today.sleepDisturbances != null && (
                        <div className="bg-grappler-900/50 rounded-lg p-3">
                          <span className="text-[10px] text-grappler-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Disturbances</span>
                          <p className="text-lg font-bold text-grappler-100 mt-0.5">{today.sleepDisturbances}</p>
                        </div>
                      )}
                      {today.sleepNeededHours != null && (
                        <div className="bg-grappler-900/50 rounded-lg p-3">
                          <span className="text-[10px] text-grappler-500 flex items-center gap-1"><BedDouble className="w-3 h-3" /> Needed</span>
                          <p className="text-lg font-bold text-grappler-100 mt-0.5">{today.sleepNeededHours.toFixed(1)} hrs</p>
                        </div>
                      )}
                      {today.sleepEfficiency != null && (
                        <div className="bg-grappler-900/50 rounded-lg p-3">
                          <span className="text-[10px] text-grappler-500 flex items-center gap-1"><Moon className="w-3 h-3" /> Efficiency</span>
                          <p className="text-lg font-bold text-grappler-100 mt-0.5">{today.sleepEfficiency.toFixed(0)}%</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ── VITALS SECTION ── */}
            {(today.respiratoryRate != null || today.spo2 != null || today.skinTemp != null || today.caloriesBurned != null) && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-grappler-800 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setShowVitals(!showVitals)}
                  className="w-full p-4 flex items-center justify-between hover:bg-grappler-750 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <p className="text-sm font-medium text-grappler-100">Vitals & Activity</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {today.caloriesBurned != null && (
                      <span className="text-xs text-grappler-400">{today.caloriesBurned.toLocaleString()} kcal</span>
                    )}
                    <motion.div animate={{ rotate: showVitals ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="w-4 h-4 text-grappler-500" />
                    </motion.div>
                  </div>
                </button>
                <AnimatePresence>
                  {showVitals && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 grid grid-cols-2 gap-2.5 border-t border-grappler-700/50 pt-3">
                        {today.respiratoryRate != null && (
                          <div className="bg-grappler-900/50 rounded-lg p-3">
                            <span className="text-[10px] text-grappler-500 flex items-center gap-1"><Wind className="w-3 h-3" /> Resp. Rate</span>
                            <p className="text-lg font-bold text-grappler-100 mt-0.5">{today.respiratoryRate.toFixed(1)} <span className="text-xs font-normal text-grappler-500">rpm</span></p>
                          </div>
                        )}
                        {today.skinTemp != null && (
                          <div className="bg-grappler-900/50 rounded-lg p-3">
                            <span className="text-[10px] text-grappler-500 flex items-center gap-1"><Thermometer className="w-3 h-3" /> Skin Temp</span>
                            <p className="text-lg font-bold text-grappler-100 mt-0.5">{today.skinTemp.toFixed(1)}&deg;F</p>
                          </div>
                        )}
                        {today.spo2 != null && (
                          <div className="bg-grappler-900/50 rounded-lg p-3">
                            <span className="text-[10px] text-grappler-500 flex items-center gap-1"><Droplets className="w-3 h-3" /> SpO2</span>
                            <p className="text-lg font-bold text-grappler-100 mt-0.5">{today.spo2.toFixed(0)}%</p>
                          </div>
                        )}
                        {today.caloriesBurned != null && (
                          <div className="bg-grappler-900/50 rounded-lg p-3">
                            <span className="text-[10px] text-grappler-500 flex items-center gap-1"><Zap className="w-3 h-3" /> Calories</span>
                            <p className="text-lg font-bold text-grappler-100 mt-0.5">{today.caloriesBurned.toLocaleString()} <span className="text-xs font-normal text-grappler-500">kcal</span></p>
                          </div>
                        )}
                        {today.avgHeartRate != null && (
                          <div className="bg-grappler-900/50 rounded-lg p-3">
                            <span className="text-[10px] text-grappler-500 flex items-center gap-1"><Heart className="w-3 h-3" /> Avg HR</span>
                            <p className="text-lg font-bold text-grappler-100 mt-0.5">{today.avgHeartRate} <span className="text-xs font-normal text-grappler-500">bpm</span></p>
                          </div>
                        )}
                        {today.maxHeartRate != null && (
                          <div className="bg-grappler-900/50 rounded-lg p-3">
                            <span className="text-[10px] text-grappler-500 flex items-center gap-1"><Heart className="w-3 h-3 text-red-400" /> Max HR</span>
                            <p className="text-lg font-bold text-grappler-100 mt-0.5">{today.maxHeartRate} <span className="text-xs font-normal text-grappler-500">bpm</span></p>
                          </div>
                        )}
                        {whoopBody && whoopBody.weightKg != null && (
                          <div className="bg-grappler-900/50 rounded-lg p-3">
                            <span className="text-[10px] text-grappler-500 flex items-center gap-1"><Scale className="w-3 h-3" /> Weight</span>
                            <p className="text-lg font-bold text-grappler-100 mt-0.5">{weightUnit === 'kg' ? Math.round(whoopBody.weightKg * 10) / 10 : Math.round(whoopBody.weightKg * 2.20462 * 10) / 10} <span className="text-xs font-normal text-grappler-500">{weightUnit}</span></p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ── 7-DAY TREND ── */}
            {chartData.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="card p-4"
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-grappler-200">7-Day Trend</h3>
                  <span className="text-xs text-grappler-500">
                    Avg <span className={cn('font-medium', recoveryColor(avgRecovery))}>{avgRecovery}%</span>
                  </span>
                </div>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="recoveryGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                        labelStyle={{ color: '#e2e8f0' }}
                        formatter={(value: any) => [`${value}%`, 'Recovery']}
                      />
                      <Area type="monotone" dataKey="recovery" stroke="#22c55e" strokeWidth={2} fill="url(#recoveryGradient)" dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            {/* ── AUTO-ADJUST ── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="card p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <p className="text-sm font-medium text-grappler-100">Auto-adjust workouts</p>
                  <p className="text-xs text-grappler-500 mt-0.5">Scale volume &amp; load based on recovery</p>
                </div>
                <button
                  onClick={() => setAutoAdjust(!autoAdjust)}
                  className={cn('relative w-12 h-7 rounded-full transition-colors duration-200 flex-shrink-0', autoAdjust ? 'bg-green-500' : 'bg-grappler-600')}
                  role="switch"
                  aria-checked={autoAdjust}
                >
                  <motion.div className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md" animate={{ x: autoAdjust ? 20 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                </button>
              </div>
            </motion.div>

            {/* ── RECENT WORKOUTS ── */}
            {whoopWorkouts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h2 className="text-sm font-semibold text-grappler-400 uppercase tracking-wider mb-3">
                  Recent Workouts
                </h2>
                <div className="space-y-2.5">
                  {whoopWorkouts.slice(0, 5).map((w) => {
                    const durationMin = Math.round((new Date(w.end).getTime() - new Date(w.start).getTime()) / 60000);
                    return (
                      <div key={w.id} className="bg-grappler-800 rounded-xl p-3.5">
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-2">
                            <Dumbbell className="w-3.5 h-3.5 text-primary-400" />
                            <span className="text-sm font-medium text-grappler-100">{w.sportName}</span>
                          </div>
                          <span className="text-[11px] text-grappler-500">
                            {new Date(w.start).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 text-center">
                          <div className="bg-grappler-900/50 rounded-lg py-1.5">
                            <p className={cn('text-sm font-bold', strainColor(w.strain ?? 0))}>{w.strain?.toFixed(1) ?? '--'}</p>
                            <p className="text-[10px] text-grappler-600">Strain</p>
                          </div>
                          <div className="bg-grappler-900/50 rounded-lg py-1.5">
                            <p className="text-sm font-bold text-grappler-100">{w.calories ?? '--'}</p>
                            <p className="text-[10px] text-grappler-600">kcal</p>
                          </div>
                          <div className="bg-grappler-900/50 rounded-lg py-1.5">
                            <p className="text-sm font-bold text-grappler-100">{w.avgHR ?? '--'}</p>
                            <p className="text-[10px] text-grappler-600">Avg HR</p>
                          </div>
                          <div className="bg-grappler-900/50 rounded-lg py-1.5">
                            <p className="text-sm font-bold text-grappler-100">{durationMin}</p>
                            <p className="text-[10px] text-grappler-600">min</p>
                          </div>
                        </div>
                        {w.zones.length > 0 && (
                          <div className="mt-2.5">
                            <div className="flex h-2 rounded-full overflow-hidden gap-px">
                              {w.zones.map((z) => {
                                const totalMin = w.zones.reduce((s, zn) => s + zn.minutes, 0);
                                const pct = totalMin > 0 ? (z.minutes / totalMin) * 100 : 0;
                                const zoneColors = ['#94a3b8', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#ef4444'];
                                return (
                                  <div key={z.zone} className="rounded-sm" style={{ width: `${pct}%`, backgroundColor: zoneColors[z.zone] || '#666' }} />
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* Not Connected State */}
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-8 text-center"
          >
            <div className="w-16 h-16 mx-auto mb-4 bg-grappler-700 rounded-full flex items-center justify-center">
              <Activity className="w-8 h-8 text-grappler-500" />
            </div>
            <h3 className="text-lg font-semibold text-grappler-200 mb-2">
              Connect Your Whoop
            </h3>
            <p className="text-sm text-grappler-400 mb-6 max-w-xs mx-auto">
              Link your Whoop strap to get real recovery data, strain scores, and
              automatic intensity adjustments based on your actual readiness.
            </p>
            <button onClick={handleConnect} className="btn btn-primary btn-md gap-2">
              <ExternalLink className="w-4 h-4" />
              Connect via Whoop
            </button>
            <p className="text-xs text-grappler-600 mt-4">
              You can also enter data manually using the settings icon above
            </p>
          </motion.div>
        )}

        {/* Manual Entry */}
        <AnimatePresence>
          {showManualEntry && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="card p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-grappler-200">Manual Entry</h3>
                  <button
                    onClick={() => setShowManualEntry(false)}
                    className="text-grappler-500 hover:text-grappler-300"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-grappler-500">
                  Log your metrics manually if you prefer not to connect your device.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-grappler-400 mb-1 block">
                      Recovery (0-100)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="76"
                      value={manualRecovery}
                      onChange={(e) => setManualRecovery(e.target.value)}
                      className="input text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-grappler-400 mb-1 block">HRV (ms)</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="58"
                      value={manualHRV}
                      onChange={(e) => setManualHRV(e.target.value)}
                      className="input text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-grappler-400 mb-1 block">
                      Resting HR (bpm)
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="54"
                      value={manualRHR}
                      onChange={(e) => setManualRHR(e.target.value)}
                      className="input text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-grappler-400 mb-1 block">Sleep (hrs)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      placeholder="7.5"
                      value={manualSleepHours}
                      onChange={(e) => setManualSleepHours(e.target.value)}
                      className="input text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-grappler-400 mb-1 block">
                      Strain (0-21)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={21}
                      step={0.1}
                      placeholder="14.5"
                      value={manualStrain}
                      onChange={(e) => setManualStrain(e.target.value)}
                      className="input text-sm"
                    />
                  </div>
                </div>

                <button
                  onClick={handleManualSubmit}
                  className="btn btn-primary btn-sm w-full"
                >
                  Save Entry
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
