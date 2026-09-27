/**
 * whoop-training — pure maths that ties Whoop workouts to training.
 *
 *   estimateRPE             Whoop HR/strain → RPE 1-10 (moved from whoop-client
 *                           so fatigue-metrics can use it without the store)
 *   backfillLiftWhoopHR     link lifting logs to their Whoop workout AFTER Whoop
 *                           has scored it (matching only at "Finish" almost
 *                           always ran before the workout reached the API)
 *   liftWhoopInsight        strain per tonne vs your usual + HR-based RPE vs
 *                           the RPE you logged
 *   unclaimedWhoopLoad      Whoop workouts that aren't a logged lift or mat
 *                           session (runs, conditioning…) as sRPE load
 *
 * No store access — callers pass state in.
 */
import type { TrainingSession, WhoopWorkout, WorkoutLog } from './types';
import { toKg } from './units';

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_MS = 60 * 1000;

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

// ---------------------------------------------------------------------------
// Linking lifting logs to Whoop workouts
// ---------------------------------------------------------------------------

type WhoopHR = NonNullable<WorkoutLog['whoopHR']>;

function toWhoopHR(w: WhoopWorkout): WhoopHR {
  return {
    avgHR: w.avgHR ?? 0,
    maxHR: w.maxHR ?? 0,
    strain: w.strain ?? 0,
    calories: w.calories ?? 0,
    zones: w.zones.length > 0 ? w.zones : undefined,
    whoopWorkoutId: w.id,
  };
}

/** Allowed slack either side of the logged session when matching by time. */
const MATCH_TOLERANCE_MS = 30 * MIN_MS;
/** Minimum overlap to call it the same session. */
const MIN_OVERLAP_MS = 10 * MIN_MS;

/** Best-overlapping Whoop workout for a log (log.date = finish time). */
export function matchLogToWhoop(
  log: Pick<WorkoutLog, 'date' | 'duration'>,
  whoopWorkouts: WhoopWorkout[],
  excludeIds: ReadonlySet<string>,
): WhoopWorkout | undefined {
  const end = new Date(log.date).getTime();
  const start = end - Math.max(1, log.duration || 60) * MIN_MS;
  let best: WhoopWorkout | undefined;
  let bestOverlap = 0;
  for (const w of whoopWorkouts) {
    if (excludeIds.has(w.id)) continue;
    const overlap = Math.min(end + MATCH_TOLERANCE_MS, new Date(w.end).getTime())
      - Math.max(start - MATCH_TOLERANCE_MS, new Date(w.start).getTime());
    if (overlap > bestOverlap) { bestOverlap = overlap; best = w; }
  }
  return best && bestOverlap >= MIN_OVERLAP_MS ? best : undefined;
}

function changed(a: WhoopHR, w: WhoopWorkout): boolean {
  return Math.abs((w.strain ?? 0) - a.strain) > 0.2
    || Math.abs((w.avgHR ?? 0) - a.avgHR) > 1
    || Math.abs((w.maxHR ?? 0) - a.maxHR) > 1
    || Math.abs((w.calories ?? 0) - a.calories) > 10;
}

/**
 * Updates to apply to lifting logs so each carries its Whoop workout:
 *   - a log without whoopHR gets the best time match (Whoop usually scores a
 *     workout minutes after you tap Finish, so the match at Finish missed)
 *   - a log already linked by id is refreshed when Whoop re-scored it
 * A Whoop workout is claimed by at most one lift, never one already imported
 * as a mat session. Legacy whoopHR without an id is left alone.
 */
export function backfillLiftWhoopHR(
  logs: WorkoutLog[],
  whoopWorkouts: WhoopWorkout[],
  trainingSessions: TrainingSession[] = [],
): Array<{ logId: string; whoopHR: WhoopHR }> {
  if (!whoopWorkouts?.length) return [];
  const byId = new Map(whoopWorkouts.map(w => [w.id, w]));
  const claimed = new Set<string>();
  for (const s of trainingSessions) if (!s._deleted && s.whoopWorkoutId) claimed.add(s.whoopWorkoutId);
  const live = (logs ?? []).filter(l => !l._deleted);
  for (const l of live) if (l.whoopHR?.whoopWorkoutId) claimed.add(l.whoopHR.whoopWorkoutId);

  const oldest = Math.min(...whoopWorkouts.map(w => new Date(w.start).getTime()));
  const updates: Array<{ logId: string; whoopHR: WhoopHR }> = [];

  for (const log of live) {
    if (new Date(log.date).getTime() < oldest - DAY_MS) continue;
    const linkedId = log.whoopHR?.whoopWorkoutId;
    if (linkedId) {
      const w = byId.get(linkedId);
      if (w && changed(log.whoopHR!, w)) updates.push({ logId: log.id, whoopHR: toWhoopHR(w) });
      continue;
    }
    if (log.whoopHR) continue; // legacy match — no id to re-check against
    const w = matchLogToWhoop(log, whoopWorkouts, claimed);
    if (!w) continue;
    claimed.add(w.id);
    updates.push({ logId: log.id, whoopHR: toWhoopHR(w) });
  }
  return updates;
}

// ---------------------------------------------------------------------------
// Insight for one lifting session
// ---------------------------------------------------------------------------

export interface LiftWhoopInsight {
  strain: number;
  avgHR: number;
  maxHR: number;
  calories: number;
  /** Whoop strain per 1,000 kg lifted (null when volume is ~0, e.g. bodyweight-only). */
  strainPerTonne: number | null;
  /** % vs your median strain-per-tonne over the previous linked sessions (≥3 needed). */
  vsUsualPct: number | null;
  /** RPE Whoop's heart-rate data suggests. */
  hrRPE: number;
  /** Logged RPE − HR RPE (positive: it felt harder than your heart said). */
  rpeGap: number | null;
}

/** Volume below this (kg) is too small for a per-tonne figure to mean anything. */
const MIN_TONNAGE_KG = 500;
const USUAL_SAMPLE = 8;

function strainPerTonneOf(log: WorkoutLog): number | null {
  if (!log.whoopHR || !(log.whoopHR.strain > 0)) return null;
  const kg = toKg(log.totalVolume || 0, log.weightUnit ?? 'kg');
  if (kg < MIN_TONNAGE_KG) return null;
  return log.whoopHR.strain / (kg / 1000);
}

export function liftWhoopInsight(log: WorkoutLog, allLogs: WorkoutLog[]): LiftWhoopInsight | null {
  const hr = log.whoopHR;
  if (!hr) return null;
  const spt = strainPerTonneOf(log);
  const t = new Date(log.date).getTime();
  const prior = (allLogs ?? [])
    .filter(l => !l._deleted && l.id !== log.id && new Date(l.date).getTime() < t)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(strainPerTonneOf)
    .filter((v): v is number => v != null)
    .slice(0, USUAL_SAMPLE)
    .sort((a, b) => a - b);
  let vsUsualPct: number | null = null;
  if (spt != null && prior.length >= 3) {
    const mid = Math.floor(prior.length / 2);
    const median = prior.length % 2 ? prior[mid] : (prior[mid - 1] + prior[mid]) / 2;
    if (median > 0) vsUsualPct = Math.round(((spt - median) / median) * 100);
  }
  const hrRPE = estimateRPE(hr.strain, hr.avgHR || null, hr.maxHR || null, log.duration || 0, hr.zones ?? [], false);
  return {
    strain: hr.strain,
    avgHR: hr.avgHR,
    maxHR: hr.maxHR,
    calories: hr.calories,
    strainPerTonne: spt != null ? Math.round(spt * 10) / 10 : null,
    vsUsualPct,
    hrRPE,
    rpeGap: log.overallRPE > 0 ? Math.round((log.overallRPE - hrRPE) * 10) / 10 : null,
  };
}

// ---------------------------------------------------------------------------
// Whoop-only training load
// ---------------------------------------------------------------------------

/**
 * Whoop workouts that no logged lift or training session accounts for, as
 * { date, duration, rpe } sRPE entries for the training-load model.
 * A Whoop workout is "accounted for" when a session links it by id, a lift
 * links it via whoopHR, or it overlaps a logged lift/session in time.
 */
export function unclaimedWhoopLoad(
  whoopWorkouts: WhoopWorkout[],
  logs: WorkoutLog[],
  trainingSessions: TrainingSession[] = [],
  combatSportIds: ReadonlySet<number> = new Set(),
): Array<{ date: Date; duration: number; rpe: number }> {
  if (!whoopWorkouts?.length) return [];
  const liveLogs = (logs ?? []).filter(l => !l._deleted);
  const liveSessions = (trainingSessions ?? []).filter(s => !s._deleted);
  const claimed = new Set<string>();
  for (const s of liveSessions) if (s.whoopWorkoutId) claimed.add(s.whoopWorkoutId);
  for (const l of liveLogs) if (l.whoopHR?.whoopWorkoutId) claimed.add(l.whoopHR.whoopWorkoutId);

  // Time windows of everything logged by hand. Log dates are finish times;
  // training-session dates are start times.
  const windows: Array<[number, number]> = [
    ...liveLogs.map(l => {
      const end = new Date(l.date).getTime();
      return [end - (l.duration || 60) * MIN_MS, end] as [number, number];
    }),
    ...liveSessions.map(s => {
      const start = new Date(s.date).getTime();
      return [start, start + (s.duration || 60) * MIN_MS] as [number, number];
    }),
  ];

  const out: Array<{ date: Date; duration: number; rpe: number }> = [];
  for (const w of whoopWorkouts) {
    if (claimed.has(w.id)) continue;
    const ws = new Date(w.start).getTime();
    const we = new Date(w.end).getTime();
    const duration = Math.round((we - ws) / MIN_MS);
    if (!(duration >= 10)) continue; // skip blips and auto-detected walks to the car
    const overlaps = windows.some(([s, e]) =>
      Math.min(e + MATCH_TOLERANCE_MS, we) - Math.max(s - MATCH_TOLERANCE_MS, ws) >= MIN_OVERLAP_MS);
    if (overlaps) continue;
    out.push({
      date: new Date(w.start),
      duration,
      rpe: estimateRPE(w.strain, w.avgHR, w.maxHR, duration, w.zones, combatSportIds.has(w.sportId)),
    });
  }
  return out;
}
