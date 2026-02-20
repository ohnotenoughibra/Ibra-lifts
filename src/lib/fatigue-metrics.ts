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
 * - Halson & Jeukendrup 2004: CNS fatigue markers in overtraining
 */

import type {
  WorkoutLog,
  WearableData,
  TrainingSession,
  WhoopWorkout,
  ActivityCategory,
} from './types';

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
  cnsStrain: number;
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

// Whoop sport IDs for combat disciplines
const COMBAT_SPORT_IDS = new Set([
  82,  // Brazilian Jiu Jitsu
  83,  // Boxing
  84,  // Kickboxing
  85,  // MMA
  86,  // Muay Thai
  87,  // Wrestling
  88,  // Martial Arts
  43,  // Judo
  44,  // Karate
  45,  // Taekwondo
]);

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
 * Enhanced Acute:Chronic Workload Ratio using sRPE (session RPE × duration).
 * Falls back to volume-only when duration data is unavailable.
 * Gabbett 2016: optimal ACWR 0.8–1.3, injury risk spikes >1.5
 */
export function calculateEnhancedACWR(
  workoutLogs: WorkoutLog[],
  trainingSessions?: TrainingSession[],
): EnhancedACWR {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * DAY_MS;
  const twentyEightDaysAgo = now - 28 * DAY_MS;

  // Collect sRPE loads from workout logs
  let acute7d = 0;
  let chronic28d = 0;

  workoutLogs.forEach(log => {
    const t = new Date(log.date).getTime();
    const duration = log.duration || 60; // default 60 min if missing
    const rpe = log.overallRPE || 5;
    const sRPE = rpe * duration;

    if (t >= sevenDaysAgo) acute7d += sRPE;
    if (t >= twentyEightDaysAgo) chronic28d += sRPE;
  });

  // Include training sessions (combat sport, cardio, etc.)
  if (trainingSessions) {
    trainingSessions.forEach(s => {
      const t = new Date(s.date).getTime();
      const duration = s.duration || 60;
      const rpe = s.perceivedExertion || 5;
      const sRPE = rpe * duration;

      if (t >= sevenDaysAgo) acute7d += sRPE;
      if (t >= twentyEightDaysAgo) chronic28d += sRPE;
    });
  }

  // Count actual active weeks (weeks with at least one session) in the 28-day window.
  // Dividing by 4 when the user has <4 weeks of data inflates the ACWR ratio
  // because empty weeks before they started training drag down the chronic average.
  const activeWeeks = (() => {
    let count = 0;
    for (let w = 0; w < 4; w++) {
      const weekStart = now - (w + 1) * 7 * DAY_MS;
      const weekEnd = now - w * 7 * DAY_MS;
      const hasWorkout = workoutLogs.some(log => {
        const t = new Date(log.date).getTime();
        return t >= weekStart && t < weekEnd;
      });
      const hasSession = trainingSessions?.some(s => {
        const t = new Date(s.date).getTime();
        return t >= weekStart && t < weekEnd;
      });
      if (hasWorkout || hasSession) count++;
    }
    return Math.max(count, 1);
  })();

  const chronicWeekly = chronic28d / activeWeeks;

  if (chronicWeekly === 0 && acute7d === 0) {
    return { acute: 0, chronic: 0, ratio: 0, status: 'no_data' };
  }

  const ratio = chronicWeekly > 0
    ? Math.round((acute7d / chronicWeekly) * 100) / 100
    : acute7d > 0 ? 2.0 : 0;

  let status: EnhancedACWR['status'];
  if (ratio >= 0.8 && ratio <= 1.3) status = 'optimal';
  else if (ratio > 1.5) status = 'very_high';
  else if (ratio > 1.3) status = 'high';
  else status = 'low';

  return { acute: Math.round(acute7d), chronic: Math.round(chronicWeekly), ratio, status };
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
    const key = new Date(log.date).toISOString().split('T')[0];
    if (!logsByDate.has(key)) logsByDate.set(key, []);
    logsByDate.get(key)!.push(log);
  });

  const sessionsByDate = new Map<string, TrainingSession[]>();
  if (trainingSessions) {
    trainingSessions.forEach(s => {
      const key = new Date(s.date).toISOString().split('T')[0];
      if (!sessionsByDate.has(key)) sessionsByDate.set(key, []);
      sessionsByDate.get(key)!.push(s);
    });
  }

  // Find max sRPE across all days for normalization
  let maxDayLoad = 0;
  const dayLoads: { date: string; load: number; sessions: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY_MS);
    const key = d.toISOString().split('T')[0];
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
    if (COMBAT_SPORT_IDS.has(w.sportId)) {
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
  const baseline = withRHR.length >= 3
    ? withRHR.slice(0, -1).reduce((s, w) => s + w.restingHR!, 0) / (withRHR.length - 1)
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
 */
export function calculateHRVDeviation(wearableHistory: WearableData[]): HRVDeviation {
  const withHRV = wearableHistory
    .filter(w => w.hrv != null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (withHRV.length === 0) {
    return { current: null, baseline: null, deviationPct: 0, status: 'normal' };
  }

  const current = withHRV[withHRV.length - 1].hrv!;
  const baseline = withHRV.length >= 3
    ? withHRV.slice(0, -1).reduce((s, w) => s + w.hrv!, 0) / (withHRV.length - 1)
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

  return Math.round(rhrScore * 0.4 + hrvScore * 0.4 + sleepScore * 0.2);
}

/**
 * CNS Strain Indicator (0-100).
 * Reflects central nervous system recovery debt.
 *
 * Heavy compound lifts (RPE >= 8.5) tax the CNS disproportionately.
 * For combat athletes, this combines with sparring/competition stress.
 * Halson & Jeukendrup 2004: CNS fatigue outlasts peripheral muscle fatigue.
 */
export function calculateCNSStrain(
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
  // More than 5 sessions/week in the window is high density for CNS
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
  const derivedMaxHR = Math.max(...wearableHistory.filter(w => w.maxHeartRate != null).map(w => w.maxHeartRate!), 0);
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

function classifyVO2Max(vo2: number | null): string {
  if (vo2 == null) return 'No data';
  if (vo2 >= 55) return 'Elite';
  if (vo2 >= 48) return 'Excellent';
  if (vo2 >= 42) return 'Good';
  if (vo2 >= 36) return 'Average';
  if (vo2 >= 30) return 'Below avg';
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
      cnsStrain: calculateCNSStrain(workoutLogs, wearableHistory, trainingSessions),
      rhrTrend: calculateRHRTrend(wearableHistory),
      hrvDeviation: calculateHRVDeviation(wearableHistory),
      sleepConsistency: calculateSleepConsistency(wearableHistory),
    },
    vo2max: calculateVO2MaxEstimate(wearableHistory, maxHeartRate),
  };
}
