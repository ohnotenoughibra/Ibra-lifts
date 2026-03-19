/**
 * Wearable Engine — Unified multi-wearable abstraction layer
 *
 * Normalizes data from Whoop, Apple Health, Garmin, and Oura into a common
 * format. Provider-specific API calls live in dedicated files (whoop.ts, etc.).
 * This engine handles normalization, merging, and readiness derivation.
 *
 * Architecture:
 *   Provider API client (whoop.ts) → raw data
 *   → this engine normalizes → NormalizedWearableData
 *   → sync hook consumes → store
 *
 * Science:
 * - Plews et al. 2013: ln(rMSSD) is the gold standard for autonomic readiness
 * - Buchheit 2014: HRV-guided training outperforms fixed periodization
 * - Bellenger et al. 2016: RHR elevation >5bpm from baseline = systemic fatigue
 * - Lastella et al. 2018: Sleep efficiency >85% threshold for athlete recovery
 * - Halson 2014: Multi-metric recovery models outperform single-variable
 *
 * All functions are pure — no side effects, no store, no React.
 */

import type { WearableProvider } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface NormalizedWearableData {
  provider: WearableProvider;
  timestamp: string; // ISO datetime
  // Recovery
  recoveryScore?: number;      // 0-100 normalized
  hrvMs?: number;              // HRV in milliseconds (rMSSD)
  restingHeartRate?: number;   // bpm
  respiratoryRate?: number;    // breaths/min
  spo2?: number;               // blood oxygen %
  skinTemp?: number;           // celsius delta from baseline
  // Sleep
  sleepDurationMinutes?: number;
  sleepEfficiency?: number;    // 0-100%
  remMinutes?: number;
  deepSleepMinutes?: number;
  lightSleepMinutes?: number;
  sleepLatencyMinutes?: number;
  // Activity
  strain?: number;             // 0-21 (Whoop scale, normalized from others)
  calories?: number;
  activeMinutes?: number;
  steps?: number;
  // Heart rate zones (minutes spent in each zone)
  hrZones?: { zone1: number; zone2: number; zone3: number; zone4: number; zone5: number };
}

export interface WearableCapabilities {
  provider: WearableProvider;
  hasRecovery: boolean;
  hasHRV: boolean;
  hasRHR: boolean;
  hasSleep: boolean;
  hasStrain: boolean;
  hasHRZones: boolean;
  hasSteps: boolean;
  hasSPO2: boolean;
  hasSkinTemp: boolean;
  hasRespiratoryRate: boolean;
  authType: 'oauth2' | 'health_kit' | 'api_key';
  syncInterval: number;  // minutes between syncs
  dataDelay: number;     // minutes before data becomes available after recording
}

// ═══════════════════════════════════════════════════════════════════════════════
// Provider Capabilities
// ═══════════════════════════════════════════════════════════════════════════════

const CAPABILITIES: Record<WearableProvider, WearableCapabilities> = {
  whoop: {
    provider: 'whoop',
    hasRecovery: true,
    hasHRV: true,
    hasRHR: true,
    hasSleep: true,
    hasStrain: true,
    hasHRZones: true,
    hasSteps: false,
    hasSPO2: false,
    hasSkinTemp: false,
    hasRespiratoryRate: false,
    authType: 'oauth2',
    syncInterval: 30,
    dataDelay: 15,
  },
  apple_health: {
    provider: 'apple_health',
    hasRecovery: false,
    hasHRV: true,
    hasRHR: true,
    hasSleep: true,
    hasStrain: false,
    hasHRZones: true,
    hasSteps: true,
    hasSPO2: false,
    hasSkinTemp: false,
    hasRespiratoryRate: false,
    authType: 'health_kit',
    syncInterval: 5,
    dataDelay: 0,
  },
  garmin: {
    provider: 'garmin',
    hasRecovery: true,
    hasHRV: true,
    hasRHR: true,
    hasSleep: true,
    hasStrain: true,
    hasHRZones: true,
    hasSteps: true,
    hasSPO2: true,
    hasSkinTemp: false,
    hasRespiratoryRate: true,
    authType: 'oauth2',
    syncInterval: 60,
    dataDelay: 30,
  },
  oura: {
    provider: 'oura',
    hasRecovery: true,
    hasHRV: true,
    hasRHR: true,
    hasSleep: true,
    hasStrain: false,
    hasHRZones: false,
    hasSteps: false,
    hasSPO2: true,
    hasSkinTemp: true,
    hasRespiratoryRate: true,
    authType: 'oauth2',
    syncInterval: 60,
    dataDelay: 60,
  },
};

/**
 * Get the capabilities of a given wearable provider.
 * Use this to decide which UI elements to show and which data to expect.
 */
export function getProviderCapabilities(provider: WearableProvider): WearableCapabilities {
  return CAPABILITIES[provider];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Provider Normalization
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalize Whoop API response into our common format.
 *
 * Whoop data shape (from /developer/v2 endpoints):
 *   recovery: { score, hrv.rmssd_milli, resting_heart_rate, spo2_percentage, skin_temp_celsius }
 *   sleep: { score.total_in_bed_time_milli, score.sleep_efficiency_percentage, ... }
 *   cycle: { strain.score, strain.kilojoule }
 */
export function normalizeWhoopData(whoopData: any): NormalizedWearableData {
  const recovery = whoopData?.recovery || {};
  const sleep = whoopData?.sleep || {};
  const cycle = whoopData?.cycle || {};
  const sleepScore = sleep?.score || {};

  return {
    provider: 'whoop',
    timestamp: whoopData?.timestamp || new Date().toISOString(),
    // Recovery
    recoveryScore: clampOpt(recovery?.score, 0, 100),
    hrvMs: positiveOpt(recovery?.hrv?.rmssd_milli),
    restingHeartRate: positiveOpt(recovery?.resting_heart_rate),
    respiratoryRate: positiveOpt(recovery?.respiratory_rate),
    spo2: clampOpt(recovery?.spo2_percentage, 0, 100),
    skinTemp: recovery?.skin_temp_celsius ?? undefined,
    // Sleep — Whoop reports durations in milliseconds
    sleepDurationMinutes: msToMinOpt(sleepScore?.total_in_bed_time_milli),
    sleepEfficiency: clampOpt(sleepScore?.sleep_efficiency_percentage, 0, 100),
    remMinutes: msToMinOpt(sleepScore?.rem_sleep_time_milli),
    deepSleepMinutes: msToMinOpt(sleepScore?.slow_wave_sleep_time_milli),
    lightSleepMinutes: msToMinOpt(sleepScore?.light_sleep_time_milli),
    sleepLatencyMinutes: msToMinOpt(sleepScore?.latency_milli),
    // Activity — Whoop strain is already 0-21 scale
    strain: clampOpt(cycle?.strain?.score, 0, 21),
    calories: positiveOpt(cycle?.strain?.kilojoule ? cycle.strain.kilojoule * 0.239006 : undefined),
    // Whoop doesn't track steps or active minutes natively
    activeMinutes: undefined,
    steps: undefined,
    hrZones: normalizeWhoopZones(cycle?.strain?.zone_durations),
  };
}

/**
 * Normalize Apple Health data into our common format.
 *
 * Apple Health exports structured data via HealthKit queries.
 * Expected shape mirrors HealthKit sample types:
 *   { hrv, restingHeartRate, sleepAnalysis, stepCount, activeEnergyBurned, workoutMinutes }
 */
export function normalizeAppleHealthData(healthData: any): NormalizedWearableData {
  const sleep = healthData?.sleepAnalysis || {};

  return {
    provider: 'apple_health',
    timestamp: healthData?.timestamp || new Date().toISOString(),
    // Recovery — Apple Health doesn't compute a recovery score
    recoveryScore: undefined,
    hrvMs: positiveOpt(healthData?.hrv),
    restingHeartRate: positiveOpt(healthData?.restingHeartRate),
    respiratoryRate: positiveOpt(healthData?.respiratoryRate),
    spo2: undefined,
    skinTemp: undefined,
    // Sleep — Apple Health reports in minutes
    sleepDurationMinutes: positiveOpt(sleep?.totalMinutes),
    sleepEfficiency: clampOpt(sleep?.efficiency, 0, 100),
    remMinutes: positiveOpt(sleep?.remMinutes),
    deepSleepMinutes: positiveOpt(sleep?.deepMinutes),
    lightSleepMinutes: positiveOpt(sleep?.coreMinutes),
    sleepLatencyMinutes: positiveOpt(sleep?.latencyMinutes),
    // Activity — Apple Health is king for step/activity tracking
    strain: undefined,
    calories: positiveOpt(healthData?.activeEnergyBurned),
    activeMinutes: positiveOpt(healthData?.workoutMinutes),
    steps: positiveOpt(healthData?.stepCount),
    hrZones: healthData?.heartRateZones ? {
      zone1: healthData.heartRateZones.zone1 ?? 0,
      zone2: healthData.heartRateZones.zone2 ?? 0,
      zone3: healthData.heartRateZones.zone3 ?? 0,
      zone4: healthData.heartRateZones.zone4 ?? 0,
      zone5: healthData.heartRateZones.zone5 ?? 0,
    } : undefined,
  };
}

/**
 * Normalize Garmin Connect data into our common format.
 *
 * Garmin API shape (Health API & Wellness):
 *   { dailySummary, sleepData, bodyBattery, hrvStatus, respiration, spo2, stressLevel }
 */
export function normalizeGarminData(garminData: any): NormalizedWearableData {
  const daily = garminData?.dailySummary || {};
  const sleep = garminData?.sleepData || {};
  const hrv = garminData?.hrvStatus || {};

  // Garmin Body Battery (0-100) maps well to recovery score
  const bodyBattery = garminData?.bodyBattery;

  // Garmin Training Status intensity maps to Whoop-like strain
  // Garmin intensity minutes × scaling factor → approximate 0-21 strain
  const intensityMinutes = (daily?.moderateIntensityMinutes ?? 0) +
    (daily?.vigorousIntensityMinutes ?? 0) * 2;
  const estimatedStrain = intensityMinutes > 0
    ? Math.min(21, (intensityMinutes / 180) * 21)
    : undefined;

  return {
    provider: 'garmin',
    timestamp: garminData?.timestamp || new Date().toISOString(),
    // Recovery
    recoveryScore: clampOpt(bodyBattery, 0, 100),
    hrvMs: positiveOpt(hrv?.lastNightAvg ?? hrv?.weeklyAvg),
    restingHeartRate: positiveOpt(daily?.restingHeartRate),
    respiratoryRate: positiveOpt(garminData?.respiration?.avgBreathingRate),
    spo2: clampOpt(garminData?.spo2?.avgSpo2, 0, 100),
    skinTemp: undefined, // Garmin doesn't expose skin temp via API
    // Sleep — Garmin reports in seconds
    sleepDurationMinutes: garminData?.sleepData?.totalSleepSeconds
      ? Math.round(garminData.sleepData.totalSleepSeconds / 60)
      : undefined,
    sleepEfficiency: clampOpt(sleep?.sleepScores?.efficiency, 0, 100),
    remMinutes: secToMinOpt(sleep?.remSleepSeconds),
    deepSleepMinutes: secToMinOpt(sleep?.deepSleepSeconds),
    lightSleepMinutes: secToMinOpt(sleep?.lightSleepSeconds),
    sleepLatencyMinutes: secToMinOpt(sleep?.sleepOnsetLatencySeconds),
    // Activity
    strain: estimatedStrain,
    calories: positiveOpt(daily?.activeCalories),
    activeMinutes: positiveOpt(
      (daily?.moderateIntensityMinutes ?? 0) + (daily?.vigorousIntensityMinutes ?? 0) || undefined
    ),
    steps: positiveOpt(daily?.steps),
    hrZones: daily?.heartRateZones ? {
      zone1: daily.heartRateZones.zone1Minutes ?? 0,
      zone2: daily.heartRateZones.zone2Minutes ?? 0,
      zone3: daily.heartRateZones.zone3Minutes ?? 0,
      zone4: daily.heartRateZones.zone4Minutes ?? 0,
      zone5: daily.heartRateZones.zone5Minutes ?? 0,
    } : undefined,
  };
}

/**
 * Normalize Oura Ring data into our common format.
 *
 * Oura API v2 shape:
 *   { daily_readiness, daily_sleep, daily_activity, daily_spo2, heartrate }
 * Oura excels at nocturnal HRV (averaged over full sleep — Plews et al. 2013
 * recommends morning measurement, Oura's overnight average is equivalent).
 */
export function normalizeOuraData(ouraData: any): NormalizedWearableData {
  const readiness = ouraData?.daily_readiness || {};
  const sleep = ouraData?.daily_sleep || {};
  const activity = ouraData?.daily_activity || {};
  const contributors = readiness?.contributors || {};

  return {
    provider: 'oura',
    timestamp: ouraData?.timestamp || new Date().toISOString(),
    // Recovery — Oura readiness score is 0-100
    recoveryScore: clampOpt(readiness?.score, 0, 100),
    hrvMs: positiveOpt(sleep?.average_hrv ?? ouraData?.hrv?.average),
    restingHeartRate: positiveOpt(sleep?.lowest_heart_rate),
    respiratoryRate: positiveOpt(sleep?.average_breathing_rate),
    spo2: clampOpt(ouraData?.daily_spo2?.spo2_percentage?.average, 0, 100),
    skinTemp: ouraData?.daily_sleep?.temperature_delta ?? undefined,
    // Sleep — Oura reports in seconds
    sleepDurationMinutes: secToMinOpt(sleep?.total_sleep_duration),
    sleepEfficiency: clampOpt(sleep?.efficiency, 0, 100),
    remMinutes: secToMinOpt(sleep?.rem_sleep_duration),
    deepSleepMinutes: secToMinOpt(sleep?.deep_sleep_duration),
    lightSleepMinutes: secToMinOpt(sleep?.light_sleep_duration),
    sleepLatencyMinutes: secToMinOpt(sleep?.latency),
    // Activity — Oura's activity tracking is limited compared to wrist-worn devices
    strain: undefined, // Oura doesn't produce a strain metric
    calories: positiveOpt(activity?.active_calories),
    activeMinutes: positiveOpt(activity?.high_activity_time
      ? Math.round(activity.high_activity_time / 60)
      : undefined),
    steps: positiveOpt(activity?.steps),
    hrZones: undefined, // Oura doesn't track HR zones during activity
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Multi-Provider Merge
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Merge data from multiple wearable providers using sensor-quality priority.
 *
 * Priority rationale (based on sensor accuracy in peer-reviewed validations):
 * - HRV: Oura > Whoop > Garmin > Apple Health
 *   (Stone et al. 2021: Oura's overnight rMSSD correlates r=0.99 with ECG)
 * - Sleep: Oura > Whoop > Garmin > Apple Health
 *   (de Zambotti et al. 2019: Oura has highest sleep staging accuracy)
 * - Activity/Steps: Apple Health > Garmin > Whoop > Oura
 *   (Apple Watch step accuracy within 2% — Bunn et al. 2019)
 *
 * Falls back to the next-best source when the preferred one is missing data.
 */
export function mergeMultiProviderData(sources: NormalizedWearableData[]): NormalizedWearableData {
  if (sources.length === 0) {
    return {
      provider: 'whoop', // arbitrary default
      timestamp: new Date().toISOString(),
    };
  }
  if (sources.length === 1) return sources[0];

  // Priority orderings by data category
  const hrvPriority: WearableProvider[] = ['oura', 'whoop', 'garmin', 'apple_health'];
  const sleepPriority: WearableProvider[] = ['oura', 'whoop', 'garmin', 'apple_health'];
  const activityPriority: WearableProvider[] = ['apple_health', 'garmin', 'whoop', 'oura'];
  const recoveryPriority: WearableProvider[] = ['oura', 'whoop', 'garmin', 'apple_health'];

  const byProvider = new Map<WearableProvider, NormalizedWearableData>();
  for (const s of sources) {
    byProvider.set(s.provider, s);
  }

  /** Pick the first non-undefined value from sources ordered by priority. */
  function pickByPriority<K extends keyof NormalizedWearableData>(
    field: K,
    priority: WearableProvider[],
  ): NormalizedWearableData[K] {
    for (const p of priority) {
      const src = byProvider.get(p);
      if (src && src[field] !== undefined && src[field] !== null) {
        return src[field];
      }
    }
    return undefined as NormalizedWearableData[K];
  }

  // Use the most recent timestamp
  const latestSource = sources.reduce((a, b) =>
    new Date(b.timestamp).getTime() > new Date(a.timestamp).getTime() ? b : a
  );

  return {
    provider: latestSource.provider,
    timestamp: latestSource.timestamp,
    // Recovery metrics — prefer devices with dedicated recovery algorithms
    recoveryScore: pickByPriority('recoveryScore', recoveryPriority),
    hrvMs: pickByPriority('hrvMs', hrvPriority),
    restingHeartRate: pickByPriority('restingHeartRate', hrvPriority),
    respiratoryRate: pickByPriority('respiratoryRate', hrvPriority),
    spo2: pickByPriority('spo2', recoveryPriority),
    skinTemp: pickByPriority('skinTemp', recoveryPriority),
    // Sleep metrics — prefer dedicated sleep trackers
    sleepDurationMinutes: pickByPriority('sleepDurationMinutes', sleepPriority),
    sleepEfficiency: pickByPriority('sleepEfficiency', sleepPriority),
    remMinutes: pickByPriority('remMinutes', sleepPriority),
    deepSleepMinutes: pickByPriority('deepSleepMinutes', sleepPriority),
    lightSleepMinutes: pickByPriority('lightSleepMinutes', sleepPriority),
    sleepLatencyMinutes: pickByPriority('sleepLatencyMinutes', sleepPriority),
    // Activity metrics — prefer devices worn during activity with accelerometers
    strain: pickByPriority('strain', activityPriority),
    calories: pickByPriority('calories', activityPriority),
    activeMinutes: pickByPriority('activeMinutes', activityPriority),
    steps: pickByPriority('steps', activityPriority),
    hrZones: pickByPriority('hrZones', activityPriority),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Readiness Calculation
// ═══════════════════════════════════════════════════════════════════════════════

export interface WearableReadinessResult {
  /** Overall readiness score 0-100. */
  score: number;
  /** Individual factors contributing to the score. */
  factors: { name: string; value: number; weight: number }[];
  /** Confidence 0-1 based on how many data points are available. */
  confidence: number;
}

/**
 * Calculate training readiness from wearable data.
 *
 * Uses baseline-relative scoring where available:
 * - HRV 20%+ below baseline = low readiness (Buchheit 2014)
 * - RHR 5+ bpm above baseline = systemic fatigue (Bellenger et al. 2016)
 * - Sleep efficiency <85% = impaired recovery (Lastella et al. 2018)
 *
 * Graceful degradation: when data points are missing, remaining factors
 * redistribute weights proportionally (same pattern as performance-engine.ts).
 */
export function calculateReadinessFromWearable(
  data: NormalizedWearableData,
  baselineHRV?: number,
  baselineRHR?: number,
): WearableReadinessResult {
  const factors: { name: string; value: number; weight: number }[] = [];

  // ── Factor definitions with base weights ──
  // Weights sum to 1.0 when all data available.
  // HRV is the strongest single predictor (Plews et al. 2013).

  // 1. HRV (heaviest weight — strongest readiness signal)
  if (data.hrvMs !== undefined) {
    let hrvScore: number;
    if (baselineHRV && baselineHRV > 0) {
      // Baseline-relative: Buchheit 2014 — SWC is ~0.5 × CV(ln rMSSD)
      // Simplified: >baseline = good, <80% baseline = poor
      const ratio = data.hrvMs / baselineHRV;
      hrvScore = clamp(ratio * 100, 0, 100);
    } else {
      // Absolute scoring fallback — population norms
      // 50-100ms rMSSD is typical for trained athletes (Plews et al. 2013)
      hrvScore = clamp(((data.hrvMs - 20) / 80) * 100, 0, 100);
    }
    factors.push({ name: 'HRV', value: hrvScore, weight: 0.30 });
  }

  // 2. Resting Heart Rate (inversely related to readiness)
  if (data.restingHeartRate !== undefined) {
    let rhrScore: number;
    if (baselineRHR && baselineRHR > 0) {
      // Bellenger et al. 2016: >5bpm above baseline = fatigue
      const delta = data.restingHeartRate - baselineRHR;
      rhrScore = clamp(100 - (delta / 10) * 100, 0, 100);
    } else {
      // Absolute fallback — lower is better for trained athletes
      rhrScore = clamp(((80 - data.restingHeartRate) / 40) * 100, 0, 100);
    }
    factors.push({ name: 'Resting HR', value: rhrScore, weight: 0.15 });
  }

  // 3. Sleep duration (Walker 2017: <6h = significant impairment)
  if (data.sleepDurationMinutes !== undefined) {
    const hours = data.sleepDurationMinutes / 60;
    let sleepDurationScore: number;
    if (hours >= 7) sleepDurationScore = 100;
    else if (hours >= 6) sleepDurationScore = 60 + (hours - 6) * 40;
    else sleepDurationScore = Math.max(0, hours * 10);
    factors.push({ name: 'Sleep Duration', value: sleepDurationScore, weight: 0.15 });
  }

  // 4. Sleep efficiency (Lastella et al. 2018: >85% threshold)
  if (data.sleepEfficiency !== undefined) {
    const effScore = data.sleepEfficiency >= 85
      ? 80 + ((data.sleepEfficiency - 85) / 15) * 20
      : (data.sleepEfficiency / 85) * 80;
    factors.push({ name: 'Sleep Efficiency', value: clamp(effScore, 0, 100), weight: 0.10 });
  }

  // 5. Recovery score (if provider computes one natively)
  if (data.recoveryScore !== undefined) {
    factors.push({ name: 'Recovery Score', value: data.recoveryScore, weight: 0.15 });
  }

  // 6. SpO2 (normal is 95-100%, below 93% is concerning)
  if (data.spo2 !== undefined) {
    const spo2Score = data.spo2 >= 95 ? 100 : Math.max(0, (data.spo2 - 88) / 7 * 100);
    factors.push({ name: 'Blood Oxygen', value: clamp(spo2Score, 0, 100), weight: 0.05 });
  }

  // 7. Previous day strain (high strain = need more recovery)
  if (data.strain !== undefined) {
    // Whoop scale 0-21. Strain 10-14 = moderate, >18 = very high
    const strainRecoveryScore = clamp(100 - (data.strain / 21) * 60, 20, 100);
    factors.push({ name: 'Strain Recovery', value: strainRecoveryScore, weight: 0.10 });
  }

  // ── Redistribute weights if some factors are missing ──
  if (factors.length === 0) {
    return { score: 50, factors: [], confidence: 0 };
  }

  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const normalizedFactors = factors.map(f => ({
    ...f,
    weight: f.weight / totalWeight, // Normalize to sum = 1.0
  }));

  const score = Math.round(
    normalizedFactors.reduce((sum, f) => sum + f.value * f.weight, 0)
  );

  // Confidence: based on coverage of maximum possible factors (7)
  // 1 factor = 0.2, 4+ factors = high confidence
  const confidence = Math.min(1, factors.length / 5);

  return {
    score: clamp(score, 0, 100),
    factors: normalizedFactors,
    confidence: Math.round(confidence * 100) / 100,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Internal Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/** Clamp a number to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Clamp if defined, otherwise return undefined. */
function clampOpt(value: any, min: number, max: number): number | undefined {
  if (value === undefined || value === null || typeof value !== 'number' || isNaN(value)) {
    return undefined;
  }
  return clamp(value, min, max);
}

/** Return number if positive and defined, otherwise undefined. */
function positiveOpt(value: any): number | undefined {
  if (value === undefined || value === null || typeof value !== 'number' || isNaN(value) || value <= 0) {
    return undefined;
  }
  return value;
}

/** Convert milliseconds to minutes, returning undefined if input is falsy. */
function msToMinOpt(ms: any): number | undefined {
  if (ms === undefined || ms === null || typeof ms !== 'number' || ms <= 0) return undefined;
  return Math.round(ms / 60_000);
}

/** Convert seconds to minutes, returning undefined if input is falsy. */
function secToMinOpt(sec: any): number | undefined {
  if (sec === undefined || sec === null || typeof sec !== 'number' || sec <= 0) return undefined;
  return Math.round(sec / 60);
}

/**
 * Normalize Whoop zone durations (array of ms values, zones 0-4)
 * into our standard 5-zone format in minutes.
 */
function normalizeWhoopZones(
  zoneDurations: any
): NormalizedWearableData['hrZones'] | undefined {
  if (!Array.isArray(zoneDurations) || zoneDurations.length < 5) return undefined;
  return {
    zone1: Math.round((zoneDurations[0] ?? 0) / 60_000),
    zone2: Math.round((zoneDurations[1] ?? 0) / 60_000),
    zone3: Math.round((zoneDurations[2] ?? 0) / 60_000),
    zone4: Math.round((zoneDurations[3] ?? 0) / 60_000),
    zone5: Math.round((zoneDurations[4] ?? 0) / 60_000),
  };
}
