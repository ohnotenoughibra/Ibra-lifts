/**
 * Fatigue Metrics Engine — Advanced Training Load & Nervous System Analysis
 *
 * Pure functions for combat-sport-focused fatigue intelligence.
 * No React, no store, no side effects.
 *
 * Science references:
 * - Gabbett 2016: ACWR and injury risk in team sports
 * - Hulin et al. 2014: sRPE as a valid measure of training load
 * - Plews et al. 2013: HRV-guided training in elite athletes
 * - Buchheit 2014: Sympathetic/parasympathetic balance monitoring
 * - Uth et al. 2004: VO2max estimation from HR ratio
 * - Goodall et al. 2018: Neuromuscular fatigue (89-study review; 'CNS fatigue' as distinct entity disputed)
 */

import type {
  WorkoutLog,
  WearableData,
  TrainingSession,
  WhoopWorkout,
  ActivityCategory,
} from './types';
import { toLocalDateStr } from './utils';

// ─── Exported Interfaces ────────────────────────────────────────────────────

export interface EnhancedACWR {
  acute: number;
  chronic: number;
  ratio: number;
  status: 'optimal' | 'high' | 'low' | 'very_high' | 'no_data';
}

export interface IntensityDay {
  date: string;
  intensity: number; // 0-100
  sessions: number;
}

export interface ZoneDistribution {
  zone: number;
  label: string;
  minutes: number;
  pct: number;
  color: string;
}

export interface RHRTrend {
  current: number | null;
  baseline: number | null;
  delta: number;
  status: 'normal' | 'elevated' | 'high';
}

export interface HRVDeviation {
  current: number | null;
  baseline: number | null;
  deviationPct: number;
  status: 'normal' | 'suppressed' | 'elevated';
}

export interface SleepConsistencyResult {
  score: number;
  status: 'consistent' | 'moderate' | 'irregular';
}

export interface NervousSystemMetrics {
  sympatheticLoad: number;
  neuromuscularStrain: number;
  rhrTrend: RHRTrend;
  hrvDeviation: HRVDeviation;
  sleepConsistency: SleepConsistencyResult;
}

export interface VO2MaxEstimate {
  value: number | null;
  classification: string;
  trend: { date: string; vo2max: number }[];
}

export interface FatigueMetricsData {
  acwr: EnhancedACWR;
  heatmap: IntensityDay[];
  highIntensityMinutes: number;
  zones: ZoneDistribution[];
  matTimeMinutes: number;
  matSessionCount: number;
  nervousSystem: NervousSystemMetrics;
  vo2max: VO2MaxEstimate;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

const COMBAT_CATEGORIES: ActivityCategory[] = ['grappling', 'striking', 'mma'];

// Whoop sport IDs for combat disciplines (v2 API)
const COMBAT_SPORT_IDS = new Set([
  38,  // Wrestling
  39,  // Boxing
  57,  // Martial Arts
  70,  // Brazilian Jiu Jitsu
  71,  // Kickboxing
  84,  // MMA
]);

// Name-based fallback — Whoop sport IDs can change between API versions,
// but sportName is always reliable. Matches combat sport names case-insensitively.
const COMBAT_SPORT_NAME_PATTERNS = /\b(jiu[\s-]?jitsu|bjj|wrestling|boxing|kickboxing|muay[\s-]?thai|mma|mixed[\s-]?martial|martial[\s-]?arts?|judo|karate|taekwondo|sambo|grappling)\b/i;

function isCombatWhoopWorkout(w: WhoopWorkout): boolean {
  if (COMBAT_SPORT_IDS.has(w.sportId)) return true;
  if (w.sportName && COMBAT_SPORT_NAME_PATTERNS.test(w.sportName)) return true;
  return false;
}

const ZONE_LABELS: Record<number, string> = {
  1: 'Recovery',
  2: 'Base',
  3: 'Aerobic',
  4: 'Threshold',
  5: 'Max',
};

const ZONE_COLORS: Record<number, string> = {
  1: '#94a3b8', // slate
  2: '#22c55e', // green
  3: '#3b82f6', // blue
  4: '#f59e0b', // amber
  5: '#ef4444', // red
};

// ─── Training Load Functions ────────────────────────────────────────────────

/**
 * Enhanced Acute:Chronic Workload Ratio using EWMA (Exponentially Weighted Moving Average).
 * Williams et al. 2017: EWMA avoids mathematical artefacts of coupled rolling averages.
 * Gabbett 2016: optimal ACWR 0.8–1.3, injury risk spikes >1.5
 *
 * Acute lambda  = 2 / (7 + 1)  = 0.25
 * Chronic lambda = 2 / (28 + 1) = ~0.069
 */
export function calculateEnhancedACWR(
  workoutLogs: WorkoutLog[],
  trainingSessions?: TrainingSession[],
): EnhancedACWR {
  // Collect all daily sRPE loads for the last 28 days
  const now = Date.now();
  const twentyEightDaysAgo = now - 28 * DAY_MS;

  // Build daily load map (day offset 0 = today, 27 = 28 days ago)
  const dailyLoad = new Array(28).fill(0);

  // Sanitize duration: if >300 min (5h), assume it was stored in seconds and convert
  const sanitizeDuration = (d: number): number => d > 300 ? Math.round(d / 60) : d;

  const addLoad = (dateStr: string | Date, duration: number, rpe: number) => {
    const t = new Date(dateStr).getTime();
    if (t < twentyEightDaysAgo || t > now) return;
    const dayIndex = Math.floor((now - t) / DAY_MS);
    if (dayIndex >= 0 && dayIndex < 28) {
      dailyLoad[dayIndex] += rpe * sanitizeDuration(duration);
    }
  };

  // Track daily timestamps to prevent double-counting when the same session
  // appears in both workoutLogs and trainingSessions (e.g. combat athletes
  // logging BJJ in grappling tracker AND as a completed workout)
  const seenSlots = new Set<string>();

  workoutLogs.forEach(log => {
    const slot = `${new Date(log.date).toDateString()}-${log.duration || 60}`;
    seenSlots.add(slot);
    addLoad(log.date, log.duration || 60, log.overallRPE || 5);
  });

  if (trainingSessions) {
    trainingSessions.forEach(s => {
      const slot = `${new Date(s.date).toDateString()}-${s.duration || 60}`;
      if (seenSlots.has(slot)) return; // Skip duplicate
      addLoad(s.date, s.duration || 60, s.perceivedExertion || 5);
    });
  }

  // Check if any data exists
  const totalLoad = dailyLoad.reduce((a, b) => a + b, 0);
  if (totalLoad === 0) {
    return { acute: 0, chronic: 0, ratio: 0, status: 'no_data' };
  }

  // EWMA calculation — iterate from oldest (day 27) to newest (day 0)
  const lambdaAcute = 2 / (7 + 1);   // 0.25
  const lambdaChronic = 2 / (28 + 1); // ~0.069

  let ewmaAcute = 0;
  let ewmaChronic = 0;

  // Seed with first day's value to avoid cold-start bias
  const oldest = dailyLoad[27];
  ewmaAcute = oldest;
  ewmaChronic = oldest;

  for (let i = 26; i >= 0; i--) {
    const load = dailyLoad[i];
    ewmaAcute = load * lambdaAcute + ewmaAcute * (1 - lambdaAcute);
    ewmaChronic = load * lambdaChronic + ewmaChronic * (1 - lambdaChronic);
  }

  // Ratio — chronic near zero means very little training history
  const ratio = ewmaChronic > 0
    ? Math.round((ewmaAcute / ewmaChronic) * 100) / 100
    : ewmaAcute > 0 ? 2.0 : 0;

  // Clamp to reasonable range for display
  const clampedRatio = Math.min(ratio, 3.0);

  let status: EnhancedACWR['status'];
  if (clampedRatio >= 0.8 && clampedRatio <= 1.3) status = 'optimal';
  else if (clampedRatio > 1.5) status = 'very_high';
  else if (clampedRatio > 1.3) status = 'high';
  else status = 'low';

  // Return acute as 7-day sum (for display compatibility) and chronic as weekly equivalent
  const acute7dSum = dailyLoad.slice(0, 7).reduce((a, b) => a + b, 0);
  const chronic28dSum = dailyLoad.reduce((a, b) => a + b, 0);
  // Count actual 7-day windows that have training (max 4)
  const activeWeeks = Math.max(1, [0, 1, 2, 3].filter(w =>
    dailyLoad.slice(w * 7, (w + 1) * 7).some(d => d > 0)
  ).length);

  return {
    acute: Math.round(acute7dSum),
    chronic: Math.round(chronic28dSum / activeWeeks),
    ratio: clampedRatio,
    status,
  };
}

/**
 * 28-day rolling intensity heatmap.
 * Each day gets an intensity score (0-100) from combined volume × RPE.
 */
export function calculateIntensityHeatmap(
  workoutLogs: WorkoutLog[],
  trainingSessions?: TrainingSession[],
  days: number = 28,
): IntensityDay[] {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  const result: IntensityDay[] = [];

  // Pre-index logs by date string
  const logsByDate = new Map<string, WorkoutLog[]>();
  workoutLogs.forEach(log => {
    const key = toLocalDateStr(log.date);
    if (!logsByDate.has(key)) logsByDate.set(key, []);
    logsByDate.get(key)!.push(log);
  });

  const sessionsByDate = new Map<string, TrainingSession[]>();
  if (trainingSessions) {
    trainingSessions.forEach(s => {
      const key = toLocalDateStr(s.date);
      if (!sessionsByDate.has(key)) sessionsByDate.set(key, []);
      sessionsByDate.get(key)!.push(s);
    });
  }

  // Find max sRPE across all days for normalization
  let maxDayLoad = 0;
  const dayLoads: { date: string; load: number; sessions: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY_MS);
    const key = toLocalDateStr(d);
    const dayLogs = logsByDate.get(key) || [];
    const daySessions = sessionsByDate.get(key) || [];

    let load = 0;
    let sessionCount = 0;

    dayLogs.forEach(log => {
      load += (log.overallRPE || 5) * (log.duration || 60);
      sessionCount++;
    });
    daySessions.forEach(s => {
      load += (s.perceivedExertion || 5) * (s.duration || 60);
      sessionCount++;
    });

    if (load > maxDayLoad) maxDayLoad = load;
    dayLoads.push({ date: key, load, sessions: sessionCount });
  }

  // Normalize to 0-100
  dayLoads.forEach(d => {
    result.push({
      date: d.date,
      intensity: maxDayLoad > 0 ? Math.round((d.load / maxDayLoad) * 100) : 0,
      sessions: d.sessions,
    });
  });

  return result;
}

/**
 * Total high-intensity minutes (Zone 4 + Zone 5) over a time window.
 * Uses Whoop zone data when available, falls back to estimating from RPE >= 8 sessions.
 */
export function calculateHighIntensityMinutes(
  whoopWorkouts: WhoopWorkout[],
  workoutLogs: WorkoutLog[],
  trainingSessions?: TrainingSession[],
  days: number = 7,
): number {
  const cutoff = Date.now() - days * DAY_MS;
  let hiMinutes = 0;

  // From Whoop workouts
  whoopWorkouts.forEach(w => {
    if (new Date(w.start).getTime() < cutoff) return;
    w.zones.forEach(z => {
      if (z.zone >= 4) hiMinutes += z.minutes;
    });
  });

  // If no Whoop zone data, estimate from high-RPE sessions
  if (hiMinutes === 0) {
    workoutLogs.forEach(log => {
      if (new Date(log.date).getTime() < cutoff) return;
      if ((log.overallRPE || 0) >= 8) {
        hiMinutes += Math.round((log.duration || 45) * 0.4); // ~40% of high-RPE session
      }
    });
    if (trainingSessions) {
      trainingSessions.forEach(s => {
        if (new Date(s.date).getTime() < cutoff) return;
        if ((s.perceivedExertion || 0) >= 8) {
          hiMinutes += Math.round((s.duration || 45) * 0.4);
        }
      });
    }
  }

  return hiMinutes;
}

/**
 * Aggregate zone distribution from Whoop workout data.
 */
export function calculateZoneDistribution(
  whoopWorkouts: WhoopWorkout[],
  days: number = 7,
): ZoneDistribution[] {
  const cutoff = Date.now() - days * DAY_MS;
  const zoneMins: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  whoopWorkouts.forEach(w => {
    if (new Date(w.start).getTime() < cutoff) return;
    w.zones.forEach(z => {
      if (z.zone >= 1 && z.zone <= 5) {
        zoneMins[z.zone] += z.minutes;
      }
    });
  });

  const total = Object.values(zoneMins).reduce((s, m) => s + m, 0);

  return [1, 2, 3, 4, 5].map(zone => ({
    zone,
    label: ZONE_LABELS[zone] || `Z${zone}`,
    minutes: Math.round(zoneMins[zone]),
    pct: total > 0 ? Math.round((zoneMins[zone] / total) * 100) : 0,
    color: ZONE_COLORS[zone] || '#64748b',
  }));
}

/**
 * Total combat sport mat time in minutes (not just session count).
 * Combines Whoop-tracked combat workouts + app training sessions.
 */
export function calculateMatTime(
  whoopWorkouts: WhoopWorkout[],
  trainingSessions?: TrainingSession[],
  days: number = 7,
): { minutes: number; sessions: number } {
  const cutoff = Date.now() - days * DAY_MS;
  let minutes = 0;
  let sessions = 0;
  const usedWhoopIds = new Set<string>();

  // From Whoop combat sport workouts
  whoopWorkouts.forEach(w => {
    if (new Date(w.start).getTime() < cutoff) return;
    if (isCombatWhoopWorkout(w)) {
      const dur = (new Date(w.end).getTime() - new Date(w.start).getTime()) / 60000;
      minutes += dur;
      sessions++;
      usedWhoopIds.add(w.id);
    }
  });

  // From app training sessions (combat categories, avoid double-counting Whoop-linked ones)
  if (trainingSessions) {
    trainingSessions.forEach(s => {
      if (new Date(s.date).getTime() < cutoff) return;
      if (s.whoopWorkoutId && usedWhoopIds.has(s.whoopWorkoutId)) return;
      if (COMBAT_CATEGORIES.includes(s.category)) {
        minutes += s.duration || 0;
        sessions++;
      }
    });
  }

  return { minutes: Math.round(minutes), sessions };
}

// ─── Fatigue Intelligence Functions ─────────────────────────────────────────

/**
 * Resting Heart Rate 7-day trend.
 * Positive delta = elevated RHR = incomplete recovery.
 * Buchheit 2014: RHR elevation >5 bpm suggests accumulated fatigue.
 */
export function calculateRHRTrend(wearableHistory: WearableData[]): RHRTrend {
  const withRHR = wearableHistory
    .filter(w => w.restingHR != null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (withRHR.length === 0) {
    return { current: null, baseline: null, delta: 0, status: 'normal' };
  }

  const current = withRHR[withRHR.length - 1].restingHR!;

  // 14-day rolling window baseline (Buchheit 2014), excluding the most recent value
  // Uses the last 14 entries (not the lifetime average) so it adapts to training changes
  const baselineWindow = withRHR.length >= 3
    ? withRHR.slice(-15, -1) // up to 14 entries before the current one
    : [];
  const baseline = baselineWindow.length >= 2
    ? baselineWindow.reduce((s, w) => s + w.restingHR!, 0) / baselineWindow.length
    : current;

  const delta = Math.round((current - baseline) * 10) / 10;

  let status: RHRTrend['status'] = 'normal';
  if (delta > 5) status = 'high';
  else if (delta > 2) status = 'elevated';

  return { current, baseline: Math.round(baseline * 10) / 10, delta, status };
}

/**
 * HRV deviation from personal baseline.
 * Plews et al. 2013: HRV suppression >10% from baseline indicates fatigue.
 *
 * CAVEAT: Absolute HRV thresholds vary 2-4x between individuals. These are population
 * averages; individual baseline-relative deviation is more meaningful (Beaumont et al.
 * 2022, Laborde et al. 2021). This function uses within-individual 14-day baseline
 * deviation, which is the preferred approach over absolute thresholds.
 */
export function calculateHRVDeviation(wearableHistory: WearableData[]): HRVDeviation {
  const withHRV = wearableHistory
    .filter(w => w.hrv != null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (withHRV.length === 0) {
    return { current: null, baseline: null, deviationPct: 0, status: 'normal' };
  }

  const current = withHRV[withHRV.length - 1].hrv!;

  // 14-day rolling window baseline (Plews et al. 2013), excluding the most recent value
  const baselineWindow = withHRV.length >= 3
    ? withHRV.slice(-15, -1)
    : [];
  const baseline = baselineWindow.length >= 2
    ? baselineWindow.reduce((s, w) => s + w.hrv!, 0) / baselineWindow.length
    : current;

  const deviationPct = baseline > 0
    ? Math.round(((current - baseline) / baseline) * 1000) / 10
    : 0;

  let status: HRVDeviation['status'] = 'normal';
  if (deviationPct < -15) status = 'suppressed';
  else if (deviationPct > 15) status = 'elevated';

  return {
    current: Math.round(current * 10) / 10,
    baseline: Math.round(baseline * 10) / 10,
    deviationPct,
    status,
  };
}

/**
 * Sympathetic Load Score (0-100).
 * Composite of elevated RHR, suppressed HRV, and poor sleep.
 * Higher = more sympathetic dominance = more systemic stress.
 *
 * For grapplers: chronic sympathetic dominance impairs reaction time,
 * grip endurance, and technical recall.
 */
export function calculateSympatheticLoad(wearableHistory: WearableData[]): number {
  if (wearableHistory.length === 0) return 0;

  const rhr = calculateRHRTrend(wearableHistory);
  const hrv = calculateHRVDeviation(wearableHistory);

  // RHR component (40%): delta mapped to 0-100
  // 0 delta = 0, +3 bpm = 30, +5 bpm = 60, +8+ bpm = 100
  const rhrScore = rhr.delta > 0
    ? Math.min(100, (rhr.delta / 8) * 100)
    : 0;

  // HRV component (40%): suppression mapped to 0-100
  // 0% deviation = 0, -10% = 40, -20% = 80, -25%+ = 100
  const hrvScore = hrv.deviationPct < 0
    ? Math.min(100, (Math.abs(hrv.deviationPct) / 25) * 100)
    : 0;

  // Sleep component (20%): poor sleep amplifies sympathetic load
  const withSleep = wearableHistory.filter(w => w.sleepScore != null);
  let sleepScore = 0;
  if (withSleep.length > 0) {
    const avgSleep = withSleep.reduce((s, w) => s + (w.sleepScore ?? 0), 0) / withSleep.length;
    // Low sleep score = high sympathetic contribution
    sleepScore = Math.max(0, 100 - avgSleep);
  }

  // NOTE: These weights are heuristic, not from a validated instrument. Elevated RHR +
  // suppressed HRV can indicate adaptive stress mobilization, not necessarily fatigue
  // (Melia et al. 2023, polyvagal theory). Use as one signal among many.
  return Math.round(rhrScore * 0.4 + hrvScore * 0.4 + sleepScore * 0.2);
}

/**
 * Neuromuscular Strain Indicator (0-100).
 * Reflects integrated central + peripheral loading recovery debt.
 *
 * Heavy compound lifts (RPE >= 8.5) impose disproportionate neuromuscular strain.
 * For combat athletes, this combines with sparring/competition stress.
 * Neuromuscular strain from heavy compound loading. Note: 'CNS fatigue' as a
 * distinct entity is disputed (Goodall et al. 2018, 89-study review); this metric
 * reflects integrated central + peripheral loading.
 */
export function calculateNeuromuscularStrain(
  workoutLogs: WorkoutLog[],
  wearableHistory: WearableData[],
  trainingSessions?: TrainingSession[],
  days: number = 7,
): number {
  const cutoff = Date.now() - days * DAY_MS;

  // Heavy compound volume component (50%)
  // Count sets at RPE >= 8.5 across all workouts in window
  let heavySets = 0;
  let totalSets = 0;

  workoutLogs.forEach(log => {
    if (new Date(log.date).getTime() < cutoff) return;
    log.exercises.forEach(ex => {
      ex.sets.forEach(set => {
        if (set.completed) {
          totalSets++;
          if (set.rpe >= 8.5) heavySets++;
        }
      });
    });
  });

  // Also count high-intensity combat sessions
  let combatHighIntensity = 0;
  if (trainingSessions) {
    trainingSessions.forEach(s => {
      if (new Date(s.date).getTime() < cutoff) return;
      if (COMBAT_CATEGORIES.includes(s.category) && s.perceivedExertion >= 8) {
        combatHighIntensity++;
      }
    });
  }

  // Heavy set ratio → 0-100
  const heavyRatio = totalSets > 0 ? heavySets / totalSets : 0;
  const heavyScore = Math.min(100, heavyRatio * 200 + combatHighIntensity * 15);

  // HRV suppression component (30%)
  const hrv = calculateHRVDeviation(wearableHistory);
  const hrvComponent = hrv.deviationPct < 0
    ? Math.min(100, Math.abs(hrv.deviationPct) * 4)
    : 0;

  // Session density component (20%)
  // More than 5 sessions/week in the window is high density for neuromuscular recovery
  const recentLogs = workoutLogs.filter(l => new Date(l.date).getTime() >= cutoff);
  const recentSessions = trainingSessions
    ? trainingSessions.filter(s => new Date(s.date).getTime() >= cutoff)
    : [];
  const totalSessionsInWindow = recentLogs.length + recentSessions.length;
  const densityScore = Math.min(100, (totalSessionsInWindow / 7) * 100);

  return Math.round(heavyScore * 0.5 + hrvComponent * 0.3 + densityScore * 0.2);
}

/**
 * Sleep Consistency Score (0-100).
 * Uses Whoop sleepConsistency when available, falls back to stddev of sleep hours.
 * Consistent bed/wake times improve parasympathetic recovery overnight.
 */
export function calculateSleepConsistency(
  wearableHistory: WearableData[],
): SleepConsistencyResult {
  // Try Whoop's native sleep consistency first
  const withConsistency = wearableHistory.filter(w => w.sleepConsistency != null);
  if (withConsistency.length > 0) {
    const avg = withConsistency.reduce((s, w) => s + (w.sleepConsistency ?? 0), 0) / withConsistency.length;
    const score = Math.round(avg);
    return {
      score,
      status: score >= 75 ? 'consistent' : score >= 50 ? 'moderate' : 'irregular',
    };
  }

  // Fallback: compute from sleep hours variability
  const withHours = wearableHistory.filter(w => w.sleepHours != null);
  if (withHours.length < 3) {
    return { score: 0, status: 'irregular' };
  }

  const hours = withHours.map(w => w.sleepHours!);
  const mean = hours.reduce((s, h) => s + h, 0) / hours.length;
  const variance = hours.reduce((s, h) => s + (h - mean) ** 2, 0) / hours.length;
  const stddev = Math.sqrt(variance);

  // Map stddev to score: <0.5h = 90+, 0.5-1h = 60-90, 1-1.5h = 30-60, >1.5h = <30
  const score = Math.round(Math.max(0, Math.min(100, 100 - stddev * 50)));

  return {
    score,
    status: score >= 75 ? 'consistent' : score >= 50 ? 'moderate' : 'irregular',
  };
}

// ─── VO2 Max Estimation ─────────────────────────────────────────────────────

/**
 * Estimate VO2 max from maxHR and restingHR using the Uth-Sørensen formula:
 * VO2max ≈ 15.3 × (HRmax / HRrest)
 *
 * Uth et al. 2004: validated correlation r=0.82 in healthy adults.
 * Provides a trend line from wearable history for tracking aerobic fitness.
 */
export function calculateVO2MaxEstimate(
  wearableHistory: WearableData[],
  maxHeartRate?: number | null,
): VO2MaxEstimate {
  const sorted = [...wearableHistory]
    .filter(w => w.restingHR != null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (sorted.length === 0) {
    return { value: null, classification: 'No data', trend: [] };
  }

  // Use provided maxHR, or derive from wearable data, or use age-based estimate (fallback 190)
  const derivedMaxHR = wearableHistory.filter(w => w.maxHeartRate != null).reduce((max, w) => Math.max(max, w.maxHeartRate!), 0);
  const effectiveMaxHR = maxHeartRate ?? (derivedMaxHR > 0 ? derivedMaxHR : 190);

  const trend = sorted.map(w => {
    const rhr = w.restingHR!;
    const vo2 = rhr > 0 ? Math.round((15.3 * (effectiveMaxHR / rhr)) * 10) / 10 : 0;
    return {
      date: new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      vo2max: vo2,
    };
  }).filter(d => d.vo2max > 0);

  const latest = trend.length > 0 ? trend[trend.length - 1].vo2max : null;

  return {
    value: latest,
    classification: classifyVO2Max(latest),
    trend,
  };
}

/**
 * Classify VO2max relative to age and sex using ACSM percentile-based thresholds.
 * Simplified to 3 age bands × 2 sexes. Falls back to unisex if no demographics.
 */
function classifyVO2Max(vo2: number | null, age?: number | null, sex?: string | null): string {
  if (vo2 == null) return 'No data';

  // Age/sex-adjusted thresholds: [Elite, Excellent, Good, Average, BelowAvg]
  // Based on ACSM's Guidelines for Exercise Testing and Prescription, 11th ed.
  const isFemale = sex === 'female';
  const ageGroup = !age ? 'default' : age < 30 ? 'young' : age < 50 ? 'mid' : 'senior';

  const thresholds: Record<string, number[]> = {
    // Male thresholds
    young:  [55, 48, 42, 36, 30],
    mid:    [48, 42, 36, 31, 26],
    senior: [42, 36, 31, 26, 22],
    // Female thresholds (offset ~5-8 lower)
    young_f:  [48, 42, 36, 31, 26],
    mid_f:    [42, 36, 31, 26, 22],
    senior_f: [36, 31, 26, 22, 18],
    default:  [55, 48, 42, 36, 30],
  };

  const key = ageGroup === 'default' ? 'default' : isFemale ? `${ageGroup}_f` : ageGroup;
  const t = thresholds[key];

  if (vo2 >= t[0]) return 'Elite';
  if (vo2 >= t[1]) return 'Excellent';
  if (vo2 >= t[2]) return 'Good';
  if (vo2 >= t[3]) return 'Average';
  if (vo2 >= t[4]) return 'Below avg';
  return 'Low';
}

// ─── Composite ──────────────────────────────────────────────────────────────

/**
 * Calculate all fatigue metrics in a single call.
 * Components use memoized results where overlapping.
 */
export function calculateAllFatigueMetrics(
  workoutLogs: WorkoutLog[],
  wearableHistory: WearableData[],
  whoopWorkouts: WhoopWorkout[],
  trainingSessions?: TrainingSession[],
  maxHeartRate?: number | null,
): FatigueMetricsData {
  const matTime = calculateMatTime(whoopWorkouts, trainingSessions);

  return {
    acwr: calculateEnhancedACWR(workoutLogs, trainingSessions),
    heatmap: calculateIntensityHeatmap(workoutLogs, trainingSessions),
    highIntensityMinutes: calculateHighIntensityMinutes(whoopWorkouts, workoutLogs, trainingSessions),
    zones: calculateZoneDistribution(whoopWorkouts),
    matTimeMinutes: matTime.minutes,
    matSessionCount: matTime.sessions,
    nervousSystem: {
      sympatheticLoad: calculateSympatheticLoad(wearableHistory),
      neuromuscularStrain: calculateNeuromuscularStrain(workoutLogs, wearableHistory, trainingSessions),
      rhrTrend: calculateRHRTrend(wearableHistory),
      hrvDeviation: calculateHRVDeviation(wearableHistory),
      sleepConsistency: calculateSleepConsistency(wearableHistory),
    },
    vo2max: calculateVO2MaxEstimate(wearableHistory, maxHeartRate),
  };
}
