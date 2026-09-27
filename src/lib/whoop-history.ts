/**
 * whoop-history — keep a rolling Whoop history instead of a 7-day snapshot.
 *
 * Before: every sync fetched 7 days and REPLACED `wearableHistory`, and the
 * history wasn't persisted. Every "14-day baseline" (personal HRV/RHR
 * baseline, HRV deviation, RHR trend) was really a ~6-day baseline, and the
 * 28-day training load never saw a Whoop workout older than a week.
 *
 * Now: the first sync (or a sync after a gap) backfills BACKFILL_DAYS, later
 * syncs fetch a short window, and results are MERGED into the stored history
 * by day (wearable) or id (workouts). Pure — no store access.
 */
import type { WearableData, WhoopWorkout } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** How far back the first sync reaches (Whoop API pages 25 records at a time). */
export const BACKFILL_DAYS = 60;
/** Routine sync window — wide enough to pick up re-scored days/workouts. */
export const ROUTINE_DAYS = 10;
/** Days of wearable history kept locally. */
export const KEEP_HISTORY_DAYS = 90;
/** Days of Whoop workouts kept locally (28-day load + a margin). */
export const KEEP_WORKOUT_DAYS = 60;

/** Day key a wearable entry belongs to — the same UTC slice transformWhoopData keys by. */
export function wearableDayKey(d: Pick<WearableData, 'date'>): string | null {
  const t = new Date(d.date);
  return Number.isNaN(t.getTime()) ? null : t.toISOString().substring(0, 10);
}

/**
 * Merge freshly fetched days into the stored history.
 * Per field, a fetched value wins; a missing (null/undefined) fetched value
 * keeps what we had — the edge day of a short fetch window is often partial.
 */
export function mergeWearableHistory(
  existing: WearableData[],
  incoming: WearableData[],
  now: number = Date.now(),
  keepDays: number = KEEP_HISTORY_DAYS,
): WearableData[] {
  const byDay = new Map<string, WearableData>();
  for (const e of existing ?? []) {
    const k = wearableDayKey(e);
    if (k) byDay.set(k, e);
  }
  for (const inc of incoming ?? []) {
    const k = wearableDayKey(inc);
    if (!k) continue;
    const prev = byDay.get(k);
    if (!prev) { byDay.set(k, inc); continue; }
    const merged: Record<string, unknown> = { ...prev };
    for (const [field, value] of Object.entries(inc)) {
      if (value !== null && value !== undefined) merged[field] = value;
    }
    // A placeholder id ("today-…") never replaces a real Whoop cycle id.
    if (String(inc.id).startsWith('today-') && prev.id && !String(prev.id).startsWith('today-')) {
      merged.id = prev.id;
    }
    byDay.set(k, merged as unknown as WearableData);
  }
  const cutoff = now - keepDays * DAY_MS;
  return Array.from(byDay.values())
    .filter(d => new Date(d.date).getTime() >= cutoff)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Merge fetched Whoop workouts by id (fetched version wins — Whoop re-scores).
 * Newest first, the order the Whoop API returns and the UI lists them in.
 */
export function mergeWhoopWorkouts(
  existing: WhoopWorkout[],
  incoming: WhoopWorkout[],
  now: number = Date.now(),
  keepDays: number = KEEP_WORKOUT_DAYS,
): WhoopWorkout[] {
  const byId = new Map<string, WhoopWorkout>();
  for (const w of existing ?? []) if (w?.id) byId.set(w.id, w);
  for (const w of incoming ?? []) if (w?.id) byId.set(w.id, w);
  const cutoff = now - keepDays * DAY_MS;
  return Array.from(byId.values())
    .filter(w => new Date(w.start).getTime() >= cutoff)
    .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
}

/**
 * How many days the next sync should fetch: a full backfill when the stored
 * history is thin or has a gap since the last day we have, else the routine window.
 */
export function syncWindowDays(history: WearableData[], now: number = Date.now()): number {
  const days = (history ?? []).map(d => new Date(d.date).getTime()).filter(Number.isFinite);
  if (days.length < 14) return BACKFILL_DAYS;
  const newest = Math.max(...days);
  const gapDays = Math.ceil((now - newest) / DAY_MS);
  if (gapDays + 2 > ROUTINE_DAYS) return Math.min(BACKFILL_DAYS, gapDays + 2);
  return ROUTINE_DAYS;
}
