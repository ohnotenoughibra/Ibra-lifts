/**
 * Whoop client — token storage, API → app transforms and combat-session
 * auto-import. Extracted from WearableIntegration so the background sync and
 * the Wearable screen run the SAME code (they had drifted: background sync
 * used its own transform and never auto-imported mat sessions).
 */
import { useAppStore } from './store';
import type { WearableData, WearableProvider, WhoopWorkout, WhoopBodyMeasurement, ActivityType, ActivityCategory, TrainingIntensity } from './types';

export const LS_KEYS = {
  accessToken: 'whoop_access_token',
  refreshToken: 'whoop_refresh_token',
  tokenExpires: 'whoop_token_expires',
  oauthState: 'whoop_oauth_state',
} as const;

/** Buffer before expiry to trigger proactive refresh (5 minutes) */
export const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

/** Check if the stored access token is expired or about to expire */
export function isTokenExpired(): boolean {
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
export function getToken(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Store a token in localStorage safely */
export function setToken(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch { /* best effort */ }
}

/** Clear all Whoop tokens from localStorage */
export function clearTokens(): void {
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

export interface WhoopApiResponse {
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
export function whoopDateKey(record: any): string | null {
  // Prefer end time (represents the "day" the data belongs to)
  const ts = record.end || record.start || record.created_at;
  return ts?.substring(0, 10) || null;
}

export interface TransformResult {
  data: WearableData[];
  todayStrainEstimated: boolean;
}

export function transformWhoopData(apiData: WhoopApiResponse): TransformResult {
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

  // --- Ensure today always has an entry ---
  const todayKey = new Date().toISOString().substring(0, 10);
  if (!dataMap.has(todayKey)) {
    dataMap.set(todayKey, {
      id: `today-${todayKey}`,
      date: new Date(),
      provider: 'whoop' as WearableProvider,
    });
  }

  // --- Estimate today's strain from completed workouts ---
  // Whoop's API doesn't expose running strain for PENDING_STRAIN (in-progress)
  // day cycles. Instead of showing nothing all day, pull strain from today's
  // scored workouts and combine them. Strain is logarithmic (0-21), so we
  // use root-sum-of-squares to approximate cumulative daily strain from
  // multiple activities rather than showing only the highest single one.
  let todayStrainEstimated = false;
  const todayEntry = dataMap.get(todayKey);
  if (todayEntry && todayEntry.strain == null && apiData.workouts) {
    const workoutStrains: number[] = [];
    let totalCalories = 0;
    let peakHR = 0;
    let peakAvgHR = 0;
    for (const w of apiData.workouts) {
      if (!w.score) continue;
      const wDate = (w.end || w.start || '')?.substring?.(0, 10);
      if (wDate !== todayKey) continue;
      const wStrain = w.score?.strain ?? 0;
      if (wStrain > 0) workoutStrains.push(wStrain);
      totalCalories += w.score?.kilojoule ? Math.round(w.score.kilojoule * 0.239006) : 0;
      const wMax = w.score?.max_heart_rate ?? 0;
      if (wMax > peakHR) peakHR = wMax;
      const wAvg = w.score?.average_heart_rate ?? 0;
      if (wAvg > peakAvgHR) peakAvgHR = wAvg;
    }
    // Combine strains: RSS for multiple workouts, capped at 21 (Whoop max)
    const combinedStrain = workoutStrains.length > 0
      ? Math.min(21, Math.sqrt(workoutStrains.reduce((sum, s) => sum + s * s, 0)))
      : 0;
    if (combinedStrain > 0) {
      todayStrainEstimated = true;
      const updates: Partial<WearableData> = {
        strain: Math.round(combinedStrain * 10) / 10,
      };
      if (totalCalories > 0 && todayEntry.caloriesBurned == null) updates.caloriesBurned = totalCalories;
      if (peakHR > 0 && todayEntry.maxHeartRate == null) updates.maxHeartRate = peakHR;
      if (peakAvgHR > 0 && todayEntry.avgHeartRate == null) updates.avgHeartRate = peakAvgHR;
      mergeDay(todayKey, updates);
    }
  }

  const data = Array.from(dataMap.values())
    .filter((d): d is WearableData => d.date != null && d.id != null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return { data, todayStrainEstimated };
}

// ---------------------------------------------------------------------------
// Whoop sport ID → display name
// ---------------------------------------------------------------------------

export const WHOOP_SPORTS: Record<number, string> = {
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

export function transformWhoopWorkouts(apiData: WhoopApiResponse): WhoopWorkout[] {
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

      // Prefer WHOOP's actual sport name from API, fall back to our mapping, then 'Workout'
      const sportName = w.sport_name || WHOOP_SPORTS[w.sport_id] || 'Workout';

      return {
        id: w.id?.toString() || `workout-${Date.now()}`,
        sportId: w.sport_id ?? -1,
        sportName,
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

export function transformWhoopBody(apiData: WhoopApiResponse): WhoopBodyMeasurement | null {
  if (!apiData.body) return null;
  return {
    heightMeters: apiData.body.height_meter ?? null,
    weightKg: apiData.body.weight_kilogram ?? null,
    maxHeartRate: apiData.body.max_heart_rate ?? null,
  };
}

// ---------------------------------------------------------------------------
// Whoop combat sport → ActivityType mapping
// ---------------------------------------------------------------------------

/**
 * Explicit WHOOP sport ID → ActivityType mapping.
 * These are known combat/martial arts activities that directly map.
 */
export const WHOOP_COMBAT_SPORT_MAP: Record<number, ActivityType> = {
  38: 'wrestling',
  39: 'boxing',
  57: 'other',        // Generic "Martial Arts" — could be judo, sambo, etc.
  70: 'bjj_nogi',     // Brazilian Jiu Jitsu (can't detect gi vs nogi from sport ID)
  71: 'kickboxing',
  84: 'mma',
};

/**
 * Keyword patterns for detecting grappling/combat sports from sport names.
 * This catches sports that might have unknown sport IDs but recognizable names.
 * Maps keyword patterns (lowercase) to ActivityType.
 */
export const GRAPPLING_NAME_PATTERNS: Array<{ pattern: RegExp; type: ActivityType }> = [
  { pattern: /\bjiu[\s-]?jitsu\b/i, type: 'bjj_nogi' },
  { pattern: /\bbjj\b/i, type: 'bjj_nogi' },
  { pattern: /\bbrazilian\b/i, type: 'bjj_nogi' },
  { pattern: /\bwrestling\b/i, type: 'wrestling' },
  { pattern: /\bgrappling\b/i, type: 'bjj_nogi' },
  { pattern: /\bjudo\b/i, type: 'judo' },
  { pattern: /\bmma\b/i, type: 'mma' },
  { pattern: /\bmixed\s*martial\s*arts?\b/i, type: 'mma' },
  { pattern: /\bboxing\b/i, type: 'boxing' },
  { pattern: /\bkickboxing\b/i, type: 'kickboxing' },
  { pattern: /\bmuay\s*thai\b/i, type: 'muay_thai' },
  { pattern: /\bstriking\b/i, type: 'boxing' },
  { pattern: /\bsambo\b/i, type: 'wrestling' },
  { pattern: /\bcatch\s*wrestling\b/i, type: 'wrestling' },
  { pattern: /\bsubmission\b/i, type: 'bjj_nogi' },
  { pattern: /\bno[\s-]?gi\b/i, type: 'bjj_nogi' },
  { pattern: /\bgi\s+class\b/i, type: 'bjj_gi' },
];

/**
 * Detect grappling type from sport name using keyword patterns.
 * Returns the ActivityType if a match is found, null otherwise.
 */
export function detectGrapplingFromName(sportName: string): ActivityType | null {
  for (const { pattern, type } of GRAPPLING_NAME_PATTERNS) {
    if (pattern.test(sportName)) {
      return type;
    }
  }
  return null;
}

/**
 * Sport IDs that represent generic/unspecified workout types.
 * These workouts may be grappling sessions that WHOOP didn't auto-detect correctly.
 */
export const GENERIC_WORKOUT_SPORT_IDS = new Set([
  -1,  // Activity (auto-detected unknown)
  74,  // Other (user-selected generic)
  48,  // Functional Fitness (sometimes used for combat training)
  52,  // HIIT (could be combat-style HIIT)
]);

/**
 * Heuristically detect if a generic workout is likely a grappling/combat session.
 * Uses strain, heart rate patterns, and duration to identify combat-like workouts.
 *
 * Combat sports typically have:
 * - High strain (10+ for moderate sessions, 14+ for hard sessions)
 * - High average HR (130+ bpm for active grappling)
 * - Duration in typical training ranges (30-120 minutes)
 * - Significant time in high HR zones (zone 4-5)
 */
export function isLikelyGrapplingWorkout(workout: WhoopWorkout): boolean {
  const durationMin = Math.round(
    (new Date(workout.end).getTime() - new Date(workout.start).getTime()) / 60000
  );

  // Must be a generic workout type
  if (!GENERIC_WORKOUT_SPORT_IDS.has(workout.sportId)) {
    return false;
  }

  // Minimum criteria: must have some data to analyze
  if (workout.strain == null && workout.avgHR == null) {
    return false;
  }

  // Calculate time in high HR zones (zone 4 & 5)
  const highZoneMinutes = workout.zones
    .filter(z => z.zone >= 4)
    .reduce((sum, z) => sum + z.minutes, 0);
  const totalZoneMinutes = workout.zones.reduce((sum, z) => sum + z.minutes, 0);
  const highZoneRatio = totalZoneMinutes > 0 ? highZoneMinutes / totalZoneMinutes : 0;

  // Scoring system: workout gets points for combat-like characteristics
  let score = 0;

  // High strain indicates intense activity (grappling typically 10-18+)
  if (workout.strain != null) {
    if (workout.strain >= 16) score += 3;      // Very high strain — competition/hard sparring
    else if (workout.strain >= 12) score += 2; // High strain — typical hard training
    else if (workout.strain >= 8) score += 1;  // Moderate strain — drilling or flow
  }

  // High average HR indicates sustained exertion
  if (workout.avgHR != null) {
    if (workout.avgHR >= 150) score += 2;      // Very high avg HR
    else if (workout.avgHR >= 130) score += 1; // Elevated avg HR
  }

  // Significant time in zone 4-5 is typical for combat sports
  if (highZoneRatio >= 0.3) score += 2;        // 30%+ in high zones
  else if (highZoneRatio >= 0.15) score += 1;  // 15%+ in high zones

  // Duration in typical grappling range (30-120 min)
  if (durationMin >= 45 && durationMin <= 120) score += 1;
  else if (durationMin >= 30 && durationMin <= 150) score += 0.5;

  // Threshold: need at least 3 points to consider it grappling
  // This means workout needs multiple indicators, not just one high metric
  return score >= 3;
}

/**
 * Determine the most likely grappling type for a heuristically-detected workout.
 * Since we don't know the exact sport, we use intensity indicators.
 */
export function inferActivityTypeFromWorkout(workout: WhoopWorkout): ActivityType {
  // For heuristically-detected workouts, default to bjj_nogi as it's most common
  // User can manually adjust if needed
  return 'bjj_nogi';
}

/**
 * Estimate grappling intensity from Whoop strain.
 * Whoop strain is 0-21 scale (logarithmic cardiovascular load).
 */
export function strainToIntensity(strain: number | null): TrainingIntensity {
  if (strain == null || strain < 8) return 'light_flow';
  if (strain < 13) return 'moderate';
  if (strain < 17) return 'hard_sparring';
  return 'competition_prep';
}

/**
 * Estimate RPE (1-10) from Whoop data using multiple physiological signals.
 *
 * First principles:
 * - RPE reflects total perceived effort, not just cardiovascular load
 * - Heart rate intensity ratio (avgHR/maxHR) is the strongest single predictor
 *   of how hard someone is working moment-to-moment
 * - Whoop strain is logarithmic (each point is exponentially harder) so a
 *   linear mapping to RPE is fundamentally wrong
 * - Duration matters: 90min at moderate HR feels harder than 15min at the same HR
 * - HR zone distribution captures the time spent at redline intensities
 * - Combat sports add isometric/neurological fatigue beyond what HR captures
 *
 * Signals are weighted and combined into a composite score:
 *   40% HR intensity ratio  — how close to max on average
 *   30% Strain (non-linear) — cumulative cardiovascular load
 *   15% HR zone distribution — time spent at high zones
 *   15% Duration             — session length context
 *   +0.5 combat sport bonus  — neurological fatigue not captured by HR
 */
export function estimateRPE(
  strain: number | null,
  avgHR: number | null,
  maxHR: number | null,
  durationMin: number,
  zones: { zone: number; minutes: number }[],
  isCombatSport: boolean,
): number {
  // No data at all → neutral default
  if (strain == null && avgHR == null) return 5;

  const signals: { value: number; weight: number }[] = [];

  // --- Signal 1: HR Intensity Ratio (strongest predictor) ---
  // Based on exercise physiology: %maxHR maps directly to perceived effort
  if (avgHR != null && maxHR != null && maxHR > 100) {
    const ratio = avgHR / maxHR;
    let hrRPE: number;
    if (ratio <= 0.55)      hrRPE = 1;
    else if (ratio <= 0.65) hrRPE = 2 + (ratio - 0.55) / 0.10;       // 2–3
    else if (ratio <= 0.72) hrRPE = 3 + (ratio - 0.65) / 0.07;       // 3–4
    else if (ratio <= 0.78) hrRPE = 4 + (ratio - 0.72) / 0.06;       // 4–5
    else if (ratio <= 0.83) hrRPE = 5 + ((ratio - 0.78) / 0.05) * 1.5; // 5–6.5
    else if (ratio <= 0.88) hrRPE = 6.5 + ((ratio - 0.83) / 0.05) * 1.5; // 6.5–8
    else if (ratio <= 0.93) hrRPE = 8 + (ratio - 0.88) / 0.05;       // 8–9
    else                    hrRPE = 9 + Math.min(1, (ratio - 0.93) / 0.05); // 9–10
    signals.push({ value: hrRPE, weight: 0.40 });
  }

  // --- Signal 2: Strain (non-linear / logarithmic mapping) ---
  // Whoop strain is logarithmic 0-21: each point requires exponentially more effort.
  // Piecewise mapping that respects this curve.
  if (strain != null) {
    let strainRPE: number;
    if (strain <= 4)        strainRPE = 1 + (strain / 4) * 2;               // 1–3
    else if (strain <= 8)   strainRPE = 3 + ((strain - 4) / 4) * 2;         // 3–5
    else if (strain <= 12)  strainRPE = 5 + ((strain - 8) / 4) * 1.5;       // 5–6.5
    else if (strain <= 16)  strainRPE = 6.5 + ((strain - 12) / 4) * 1.5;    // 6.5–8
    else if (strain <= 19)  strainRPE = 8 + ((strain - 16) / 3) * 1.5;      // 8–9.5
    else                    strainRPE = 9.5 + ((strain - 19) / 2) * 0.5;    // 9.5–10
    signals.push({ value: Math.min(10, strainRPE), weight: 0.30 });
  }

  // --- Signal 3: HR Zone distribution ---
  // Weighted average zone (higher zones → more effort). Zone 0-5 scale → RPE 1-10.
  if (zones.length > 0) {
    const totalMin = zones.reduce((s, z) => s + z.minutes, 0);
    if (totalMin > 0) {
      const avgZone = zones.reduce((s, z) => s + z.zone * z.minutes, 0) / totalMin;
      const zoneRPE = 1 + (avgZone / 5) * 9; // 1–10
      signals.push({ value: zoneRPE, weight: 0.15 });
    }
  }

  // --- Signal 4: Duration context ---
  // Longer sessions accumulate fatigue — same avg HR for 90min feels much harder than 15min.
  if (durationMin > 0) {
    let durationRPE: number;
    if (durationMin <= 10)      durationRPE = 3;
    else if (durationMin <= 20) durationRPE = 4;
    else if (durationMin <= 40) durationRPE = 5;
    else if (durationMin <= 60) durationRPE = 6;
    else if (durationMin <= 90) durationRPE = 7;
    else                        durationRPE = 8;
    signals.push({ value: durationRPE, weight: 0.15 });
  }

  if (signals.length === 0) return 5;

  const totalWeight = signals.reduce((s, sig) => s + sig.weight, 0);
  let rpe = signals.reduce((s, sig) => s + sig.value * sig.weight, 0) / totalWeight;

  // Combat sports: grappling/striking have neurological & isometric fatigue
  // not reflected in HR data (grip fighting, bracing, adrenaline, etc.)
  if (isCombatSport) {
    rpe += 0.5;
  }

  return Math.max(1, Math.min(10, Math.round(rpe)));
}

export interface AutoImportResult {
  imported: number;
  updated: number;
  sessions: Array<{
    type: ActivityType;
    duration: number;
    intensity: TrainingIntensity;
    detectionMethod: 'id' | 'name' | 'heuristic';
    sportName: string;
  }>;
}

/**
 * Auto-import Whoop combat sport workouts as grappling sessions.
 * Uses three detection methods (in priority order):
 * 1. Explicit sport ID mapping (wrestling, BJJ, boxing, MMA, kickboxing)
 * 2. Name-based detection (matches keywords like "jiu jitsu", "grappling", etc.)
 * 3. Heuristic detection for generic "Workout" entries that match grappling patterns
 *
 * New workouts are imported; already-imported workouts are updated if Whoop
 * re-scored them (strain, duration, HR can change after initial sync).
 */
export function autoImportCombatWorkouts(whoopWorkouts: WhoopWorkout[]): AutoImportResult {
  const store = useAppStore.getState();
  const existingSessions = store.trainingSessions;
  const importedSessions: AutoImportResult['sessions'] = [];
  let updatedCount = 0;

  /** Returns true if this Whoop workout qualifies as a combat sport session. */
  function isCombatWorkout(w: WhoopWorkout): boolean {
    if (WHOOP_COMBAT_SPORT_MAP[w.sportId]) return true;
    if (detectGrapplingFromName(w.sportName)) return true;
    if (isLikelyGrapplingWorkout(w)) return true;
    return false;
  }

  /** Derive shared fields from a Whoop workout. */
  function deriveFields(ww: WhoopWorkout) {
    const typeFromId = WHOOP_COMBAT_SPORT_MAP[ww.sportId];
    const typeFromName = detectGrapplingFromName(ww.sportName);
    const grapplingType = typeFromId ?? typeFromName ?? inferActivityTypeFromWorkout(ww);
    const detectionMethod: 'id' | 'name' | 'heuristic' = typeFromId ? 'id' : typeFromName ? 'name' : 'heuristic';
    const durationMin = Math.round(
      (new Date(ww.end).getTime() - new Date(ww.start).getTime()) / 60000
    );
    const intensity = strainToIntensity(ww.strain);
    const activityCategory: ActivityCategory = WHOOP_COMBAT_SPORT_MAP[ww.sportId]
      ? (['bjj_gi', 'bjj_nogi', 'wrestling', 'judo', 'sambo'].includes(grapplingType) ? 'grappling' :
         ['boxing', 'kickboxing', 'muay_thai'].includes(grapplingType) ? 'striking' : 'mma')
      : 'other';
    const isCombat = ['grappling', 'striking', 'mma'].includes(activityCategory);
    return { grapplingType, detectionMethod, durationMin, intensity, activityCategory, isCombat };
  }

  // --- Pass 1: Update already-imported sessions if Whoop data changed ---
  for (const ww of whoopWorkouts) {
    if (!isCombatWorkout(ww)) continue;
    const existing = existingSessions.find(s => s.whoopWorkoutId === ww.id);
    if (!existing) continue;

    // Check if any key data has changed (Whoop re-scored the workout)
    const newStrain = ww.strain ?? 0;
    const newDuration = Math.round(
      (new Date(ww.end).getTime() - new Date(ww.start).getTime()) / 60000
    );
    const oldStrain = existing.whoopHR?.strain ?? 0;
    const oldDuration = existing.duration;
    const oldAvgHR = existing.whoopHR?.avgHR ?? 0;
    const oldMaxHR = existing.whoopHR?.maxHR ?? 0;

    const strainChanged = Math.abs(newStrain - oldStrain) > 0.5;
    const durationChanged = Math.abs(newDuration - oldDuration) > 2;
    const hrChanged = (ww.avgHR != null && Math.abs((ww.avgHR ?? 0) - oldAvgHR) > 2)
                   || (ww.maxHR != null && Math.abs((ww.maxHR ?? 0) - oldMaxHR) > 2);

    if (strainChanged || durationChanged || hrChanged) {
      const { durationMin, intensity, activityCategory, isCombat } = deriveFields(ww);
      store.updateTrainingSession(existing.id, {
        duration: durationMin,
        plannedIntensity: intensity,
        perceivedExertion: estimateRPE(
          ww.strain, ww.avgHR, ww.maxHR, durationMin, ww.zones, isCombat,
        ),
        whoopHR: {
          avgHR: ww.avgHR ?? 0,
          maxHR: ww.maxHR ?? 0,
          strain: ww.strain ?? 0,
          calories: ww.calories ?? 0,
          zones: ww.zones.length > 0 ? ww.zones : undefined,
        },
      });
      updatedCount++;
    }
  }

  // --- Pass 2: Import new combat workouts ---
  const newWorkouts = whoopWorkouts.filter(w =>
    isCombatWorkout(w) && !existingSessions.some(s => s.whoopWorkoutId === w.id)
  );

  for (const ww of newWorkouts) {
    const { grapplingType, detectionMethod, durationMin, intensity, activityCategory, isCombat } = deriveFields(ww);

    const notePrefix = detectionMethod === 'heuristic'
      ? `Auto-detected from "${ww.sportName}" (based on strain/HR patterns)`
      : `Auto-imported from Whoop (${ww.sportName})`;

    store.addTrainingSession({
      date: new Date(ww.start),
      category: activityCategory,
      type: grapplingType,
      plannedIntensity: intensity,
      duration: durationMin,
      perceivedExertion: estimateRPE(
        ww.strain, ww.avgHR, ww.maxHR, durationMin, ww.zones, isCombat,
      ),
      notes: notePrefix,
      whoopHR: {
        avgHR: ww.avgHR ?? 0,
        maxHR: ww.maxHR ?? 0,
        strain: ww.strain ?? 0,
        calories: ww.calories ?? 0,
        zones: ww.zones.length > 0 ? ww.zones : undefined,
      },
      whoopWorkoutId: ww.id,
    });

    importedSessions.push({
      type: grapplingType,
      duration: durationMin,
      intensity,
      detectionMethod,
      sportName: ww.sportName,
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
      notes: detectionMethod === 'heuristic'
        ? `Whoop: ${ww.sportName} (auto-detected as grappling)`
        : `Whoop: ${ww.sportName}`,
    });
  }

  return {
    imported: importedSessions.length,
    updated: updatedCount,
    sessions: importedSessions,
  };
}
