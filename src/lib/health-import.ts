// ---------------------------------------------------------------------------
// Apple Health XML Export Parser
// ---------------------------------------------------------------------------
// Apple Health doesn't have a web API. The standard approach for PWAs is:
//   1. User exports data from Health app (Settings > Health > Export All Health Data)
//   2. User uploads the resulting export.xml file
//   3. We parse it client-side and extract relevant metrics
//
// This module also handles Google Fit API response → WearableData mapping.
// ---------------------------------------------------------------------------

import type { WearableData } from './types';

// ---------------------------------------------------------------------------
// Apple Health XML Parsing
// ---------------------------------------------------------------------------

/** Relevant Apple Health record types we extract */
const APPLE_HEALTH_TYPES = {
  steps: 'HKQuantityTypeIdentifierStepCount',
  restingHR: 'HKQuantityTypeIdentifierRestingHeartRate',
  heartRate: 'HKQuantityTypeIdentifierHeartRate',
  hrv: 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  sleepAnalysis: 'HKCategoryTypeIdentifierSleepAnalysis',
  activeEnergy: 'HKQuantityTypeIdentifierActiveEnergyBurned',
  basalEnergy: 'HKQuantityTypeIdentifierBasalEnergyBurned',
  respiratoryRate: 'HKQuantityTypeIdentifierRespiratoryRate',
  oxygenSaturation: 'HKQuantityTypeIdentifierOxygenSaturation',
  bodyTemp: 'HKQuantityTypeIdentifierBodyTemperature',
  workout: 'HKWorkoutTypeIdentifier',
} as const;

/** Sleep analysis values in Apple Health export */
const SLEEP_VALUES = {
  inBed: '0',            // HKCategoryValueSleepAnalysisInBed
  asleepUnspecified: '1', // HKCategoryValueSleepAnalysisAsleepUnspecified
  awake: '2',            // HKCategoryValueSleepAnalysisAwake
  asleepCore: '3',       // HKCategoryValueSleepAnalysisAsleepCore (light)
  asleepDeep: '4',       // HKCategoryValueSleepAnalysisAsleepDeep
  asleepREM: '5',        // HKCategoryValueSleepAnalysisAsleepREM
} as const;

interface ParsedAppleHealthDay {
  date: string; // YYYY-MM-DD
  steps: number;
  restingHR: number | null;
  avgHeartRate: number | null;
  hrv: number | null;
  sleepHours: number | null;
  deepSleepMinutes: number | null;
  remSleepMinutes: number | null;
  lightSleepMinutes: number | null;
  sleepDisturbances: number | null;
  caloriesBurned: number | null;
  respiratoryRate: number | null;
  spo2: number | null;
  skinTemp: number | null;
  workoutMinutes: number;
}

/**
 * Parse an Apple Health export XML string.
 * Uses streaming regex parsing instead of DOM parser to handle
 * massive files (Apple Health exports can be 100MB+).
 *
 * @param xml - Raw XML string from export.xml
 * @param daysBack - Number of days to import (default 7)
 * @returns Array of WearableData entries, one per day
 */
const MAX_XML_SIZE = 50 * 1024 * 1024; // 50MB

export function parseAppleHealthXML(xml: string, daysBack = 7): WearableData[] {
  if (xml.length > MAX_XML_SIZE) {
    throw new Error('Health export too large (>50MB). Please export a shorter date range from Apple Health.');
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);
  const cutoffStr = cutoff.toISOString().substring(0, 10);

  // Accumulate data by day
  const days = new Map<string, ParsedAppleHealthDay>();

  function getDay(dateStr: string): ParsedAppleHealthDay {
    const dateKey = dateStr.substring(0, 10);
    if (!days.has(dateKey)) {
      days.set(dateKey, {
        date: dateKey,
        steps: 0,
        restingHR: null,
        avgHeartRate: null,
        hrv: null,
        sleepHours: null,
        deepSleepMinutes: null,
        remSleepMinutes: null,
        lightSleepMinutes: null,
        sleepDisturbances: null,
        caloriesBurned: null,
        respiratoryRate: null,
        spo2: null,
        skinTemp: null,
        workoutMinutes: 0,
      });
    }
    return days.get(dateKey)!;
  }

  // Track HR values per day for averaging
  const hrValuesByDay = new Map<string, number[]>();
  // Track sleep segments per day
  const sleepSegmentsByDay = new Map<string, { value: string; startDate: string; endDate: string }[]>();

  // Parse <Record> elements using regex (streaming-friendly for large files)
  const recordRegex = /<Record\s+([^>]+)\/>/g;
  let match: RegExpExecArray | null;

  while ((match = recordRegex.exec(xml)) !== null) {
    const attrs = match[1];
    const type = extractAttr(attrs, 'type');
    const startDate = extractAttr(attrs, 'startDate');
    const endDate = extractAttr(attrs, 'endDate');
    const value = extractAttr(attrs, 'value');

    if (!startDate) continue;

    // Apple Health dates: "2024-01-15 07:30:00 -0600"
    const dateKey = startDate.substring(0, 10);
    if (dateKey < cutoffStr) continue;

    const day = getDay(dateKey);

    switch (type) {
      case APPLE_HEALTH_TYPES.steps: {
        const v = parseFloat(value);
        if (!isNaN(v)) day.steps += Math.round(v);
        break;
      }
      case APPLE_HEALTH_TYPES.restingHR: {
        const v = parseFloat(value);
        if (!isNaN(v) && v > 30 && v < 120) day.restingHR = Math.round(v);
        break;
      }
      case APPLE_HEALTH_TYPES.heartRate: {
        const v = parseFloat(value);
        if (!isNaN(v) && v > 30 && v < 220) {
          if (!hrValuesByDay.has(dateKey)) hrValuesByDay.set(dateKey, []);
          hrValuesByDay.get(dateKey)!.push(v);
        }
        break;
      }
      case APPLE_HEALTH_TYPES.hrv: {
        const v = parseFloat(value);
        if (!isNaN(v) && v > 0 && v < 300) day.hrv = Math.round(v);
        break;
      }
      case APPLE_HEALTH_TYPES.sleepAnalysis: {
        if (!sleepSegmentsByDay.has(dateKey)) sleepSegmentsByDay.set(dateKey, []);
        sleepSegmentsByDay.get(dateKey)!.push({
          value,
          startDate: startDate,
          endDate: endDate || startDate,
        });
        break;
      }
      case APPLE_HEALTH_TYPES.activeEnergy:
      case APPLE_HEALTH_TYPES.basalEnergy: {
        const v = parseFloat(value);
        if (!isNaN(v)) day.caloriesBurned = (day.caloriesBurned || 0) + Math.round(v);
        break;
      }
      case APPLE_HEALTH_TYPES.respiratoryRate: {
        const v = parseFloat(value);
        if (!isNaN(v) && v > 5 && v < 40) day.respiratoryRate = Math.round(v * 10) / 10;
        break;
      }
      case APPLE_HEALTH_TYPES.oxygenSaturation: {
        // Apple Health stores SpO2 as a decimal (0.97 = 97%)
        const v = parseFloat(value);
        if (!isNaN(v)) {
          day.spo2 = v <= 1 ? Math.round(v * 100) : Math.round(v);
        }
        break;
      }
      case APPLE_HEALTH_TYPES.bodyTemp: {
        const v = parseFloat(value);
        // Convert Celsius to Fahrenheit if needed (Apple exports in Celsius)
        if (!isNaN(v) && v > 30 && v < 42) {
          day.skinTemp = Math.round((v * 9 / 5 + 32) * 10) / 10;
        }
        break;
      }
    }
  }

  // Parse <Workout> elements
  const workoutRegex = /<Workout\s+([^>]+)(?:\/>|>)/g;
  while ((match = workoutRegex.exec(xml)) !== null) {
    const attrs = match[1];
    const startDate = extractAttr(attrs, 'startDate');
    const duration = extractAttr(attrs, 'duration');

    if (!startDate) continue;
    const dateKey = startDate.substring(0, 10);
    if (dateKey < cutoffStr) continue;

    const day = getDay(dateKey);
    const mins = parseFloat(duration);
    if (!isNaN(mins)) day.workoutMinutes += Math.round(mins);
  }

  // Process HR averages
  hrValuesByDay.forEach((values, dateKey) => {
    if (days.has(dateKey) && values.length > 0) {
      days.get(dateKey)!.avgHeartRate = Math.round(
        values.reduce((s: number, v: number) => s + v, 0) / values.length
      );
    }
  });

  // Process sleep segments
  sleepSegmentsByDay.forEach((segments, dateKey) => {
    processSleepSegments(days, dateKey, segments);
  });

  // Convert to WearableData array
  return Array.from(days.values())
    .filter((d) => d.date >= cutoffStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((day) => ({
      id: `apple_health_${day.date}`,
      date: new Date(day.date),
      provider: 'apple_health' as const,
      hrv: day.hrv,
      restingHR: day.restingHR,
      sleepScore: day.sleepHours != null ? estimateSleepScore(day.sleepHours, day.deepSleepMinutes, day.remSleepMinutes) : null,
      sleepHours: day.sleepHours,
      recoveryScore: estimateRecoveryScore(day),
      strain: null, // Apple Health doesn't have a strain metric
      respiratoryRate: day.respiratoryRate,
      skinTemp: day.skinTemp,
      caloriesBurned: day.caloriesBurned,
      spo2: day.spo2,
      sleepEfficiency: null,
      deepSleepMinutes: day.deepSleepMinutes,
      remSleepMinutes: day.remSleepMinutes,
      sleepDisturbances: day.sleepDisturbances,
      lightSleepMinutes: day.lightSleepMinutes,
      sleepCycleCount: null,
      sleepConsistency: null,
      sleepNeededHours: null,
      avgHeartRate: day.avgHeartRate,
      maxHeartRate: null,
    }));
}

/** Process sleep segments for a given day (extracted to avoid iterator issues) */
function processSleepSegments(
  days: Map<string, ParsedAppleHealthDay>,
  dateKey: string,
  segments: { value: string; startDate: string; endDate: string }[]
) {
  if (!days.has(dateKey)) return;
  const day = days.get(dateKey)!;

  let totalSleepMs = 0;
  let deepMs = 0;
  let remMs = 0;
  let lightMs = 0;
  let awakeCount = 0;

  for (const seg of segments) {
    const start = parseAppleDate(seg.startDate);
    const end = parseAppleDate(seg.endDate);
    if (!start || !end) continue;
    const durationMs = end.getTime() - start.getTime();
    if (durationMs <= 0 || durationMs > 24 * 3600000) continue;

    switch (seg.value) {
      case SLEEP_VALUES.asleepDeep:
        deepMs += durationMs;
        totalSleepMs += durationMs;
        break;
      case SLEEP_VALUES.asleepREM:
        remMs += durationMs;
        totalSleepMs += durationMs;
        break;
      case SLEEP_VALUES.asleepCore:
      case SLEEP_VALUES.asleepUnspecified:
        lightMs += durationMs;
        totalSleepMs += durationMs;
        break;
      case SLEEP_VALUES.awake:
        awakeCount++;
        break;
      case SLEEP_VALUES.inBed:
        // Total in-bed time includes all stages
        if (totalSleepMs === 0) totalSleepMs = durationMs;
        break;
    }
  }

  if (totalSleepMs > 0) {
    day.sleepHours = Math.round((totalSleepMs / 3600000) * 10) / 10;
  }
  if (deepMs > 0) day.deepSleepMinutes = Math.round(deepMs / 60000);
  if (remMs > 0) day.remSleepMinutes = Math.round(remMs / 60000);
  if (lightMs > 0) day.lightSleepMinutes = Math.round(lightMs / 60000);
  if (awakeCount > 0) day.sleepDisturbances = awakeCount;
}

// ---------------------------------------------------------------------------
// Google Fit API Response → WearableData Mapping
// ---------------------------------------------------------------------------

interface GoogleFitDay {
  date: string;
  steps: number | null;
  restingHR: number | null;
  avgHR: number | null;
  sleepHours: number | null;
  sleepEfficiency: number | null;
}

/**
 * Map Google Fit API response to WearableData array.
 */
export function mapGoogleFitToWearableData(
  days: GoogleFitDay[]
): WearableData[] {
  return days.map((day) => ({
    id: `google_fit_${day.date}`,
    date: new Date(day.date),
    provider: 'google_fit' as const,
    hrv: null, // Google Fit doesn't reliably expose HRV
    restingHR: day.restingHR,
    sleepScore: day.sleepHours != null ? estimateSleepScore(day.sleepHours, null, null) : null,
    sleepHours: day.sleepHours,
    recoveryScore: estimateRecoveryFromBasics(day.restingHR, day.sleepHours),
    strain: null, // No strain equivalent
    respiratoryRate: null,
    skinTemp: null,
    caloriesBurned: null,
    spo2: null,
    sleepEfficiency: day.sleepEfficiency,
    deepSleepMinutes: null,
    remSleepMinutes: null,
    sleepDisturbances: null,
    lightSleepMinutes: null,
    sleepCycleCount: null,
    sleepConsistency: null,
    sleepNeededHours: null,
    avgHeartRate: day.avgHR,
    maxHeartRate: null,
  }));
}

// ---------------------------------------------------------------------------
// Recovery / Sleep Score Estimation
// ---------------------------------------------------------------------------
// When we don't have a native recovery score (like Whoop provides),
// we estimate one from available biometrics. This feeds into the same
// readiness system that Whoop data does.
// ---------------------------------------------------------------------------

/**
 * Estimate sleep score (0-100) from hours and sleep stage data.
 * Based on sleep science guidelines:
 *   - 7-9 hours optimal for adults (AASM recommendation)
 *   - Deep sleep: 15-20% of total sleep is ideal
 *   - REM: 20-25% of total sleep is ideal
 */
function estimateSleepScore(
  hours: number,
  deepMinutes: number | null,
  remMinutes: number | null
): number {
  let score = 0;

  // Duration component (0-50 points)
  if (hours >= 7 && hours <= 9) {
    score += 50;
  } else if (hours >= 6) {
    score += 35 + (hours - 6) * 15;
  } else if (hours >= 5) {
    score += 20 + (hours - 5) * 15;
  } else {
    score += Math.max(0, hours * 4);
  }

  // Deep sleep component (0-25 points)
  if (deepMinutes != null && hours > 0) {
    const deepPct = deepMinutes / (hours * 60);
    if (deepPct >= 0.15 && deepPct <= 0.25) {
      score += 25;
    } else if (deepPct >= 0.10) {
      score += 15 + (deepPct - 0.10) * 200;
    } else {
      score += Math.max(0, deepPct * 150);
    }
  } else {
    // No stage data — give average credit
    score += 15;
  }

  // REM component (0-25 points)
  if (remMinutes != null && hours > 0) {
    const remPct = remMinutes / (hours * 60);
    if (remPct >= 0.20 && remPct <= 0.30) {
      score += 25;
    } else if (remPct >= 0.15) {
      score += 15 + (remPct - 0.15) * 200;
    } else {
      score += Math.max(0, remPct * 100);
    }
  } else {
    score += 15;
  }

  return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Estimate recovery score from Apple Health biometrics.
 * Uses available signals: HRV, resting HR, sleep quality, SpO2.
 * Redistributes weights if signals are missing (graceful degradation).
 */
function estimateRecoveryScore(day: ParsedAppleHealthDay): number | null {
  const signals: { value: number; weight: number }[] = [];

  // HRV: higher is better (population avg ~40-60ms, athletes 60-100+)
  if (day.hrv != null) {
    const hrvScore = Math.min(100, Math.max(0, (day.hrv / 80) * 100));
    signals.push({ value: hrvScore, weight: 35 });
  }

  // Resting HR: lower is better (athletes typically 45-65 bpm)
  if (day.restingHR != null) {
    const rhrScore = Math.min(100, Math.max(0, ((80 - day.restingHR) / 30) * 100));
    signals.push({ value: rhrScore, weight: 25 });
  }

  // Sleep: 7-9 hours is optimal
  if (day.sleepHours != null) {
    let sleepScore = 0;
    if (day.sleepHours >= 7 && day.sleepHours <= 9) sleepScore = 100;
    else if (day.sleepHours >= 6) sleepScore = 60 + (day.sleepHours - 6) * 40;
    else sleepScore = Math.max(0, day.sleepHours * 10);
    signals.push({ value: sleepScore, weight: 30 });
  }

  // SpO2: 95-100% is normal
  if (day.spo2 != null) {
    const spo2Score = day.spo2 >= 95 ? 100 : Math.max(0, (day.spo2 - 85) * 10);
    signals.push({ value: spo2Score, weight: 10 });
  }

  if (signals.length === 0) return null;

  // Redistribute weights proportionally if some signals are missing
  const totalWeight = signals.reduce((s, sig) => s + sig.weight, 0);
  const weighted = signals.reduce(
    (s, sig) => s + sig.value * (sig.weight / totalWeight),
    0
  );

  return Math.round(Math.min(100, Math.max(0, weighted)));
}

/**
 * Simplified recovery estimate from just resting HR and sleep hours.
 * Used for Google Fit where fewer signals are available.
 */
function estimateRecoveryFromBasics(
  restingHR: number | null,
  sleepHours: number | null
): number | null {
  const signals: { value: number; weight: number }[] = [];

  if (restingHR != null) {
    const rhrScore = Math.min(100, Math.max(0, ((80 - restingHR) / 30) * 100));
    signals.push({ value: rhrScore, weight: 40 });
  }

  if (sleepHours != null) {
    let sleepScore = 0;
    if (sleepHours >= 7 && sleepHours <= 9) sleepScore = 100;
    else if (sleepHours >= 6) sleepScore = 60 + (sleepHours - 6) * 40;
    else sleepScore = Math.max(0, sleepHours * 10);
    signals.push({ value: sleepScore, weight: 60 });
  }

  if (signals.length === 0) return null;

  const totalWeight = signals.reduce((s, sig) => s + sig.weight, 0);
  const weighted = signals.reduce(
    (s, sig) => s + sig.value * (sig.weight / totalWeight),
    0
  );

  return Math.round(Math.min(100, Math.max(0, weighted)));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract an XML attribute value from an attribute string */
function extractAttr(attrs: string, name: string): string {
  const regex = new RegExp(`${name}="([^"]*)"`, 'i');
  const match = regex.exec(attrs);
  return match?.[1] || '';
}

/** Parse Apple Health date format: "2024-01-15 07:30:00 -0600" */
function parseAppleDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  try {
    // Replace space before timezone offset with 'T' for ISO-like parsing
    // "2024-01-15 07:30:00 -0600" → "2024-01-15T07:30:00-06:00"
    const cleaned = dateStr
      .replace(/^(\d{4}-\d{2}-\d{2})\s/, '$1T')
      .replace(/\s([+-]\d{2})(\d{2})$/, '$1:$2');
    const d = new Date(cleaned);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}
