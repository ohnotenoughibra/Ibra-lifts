/**
 * sleep-plan — turn Whoop's sleep need into two things you can act on:
 *
 *   recentSleepDebt  hours short of Whoop's sleep need over the last 3 nights.
 *                    One bad night is already in the recovery score; 2-3 short
 *                    nights in a row is the signal a single morning misses.
 *   bedtimeTarget    when to be in bed tonight: your usual wake time minus
 *                    Whoop's sleep need (and a few minutes to fall asleep).
 *
 * Pure. Times are the device's local time (the app runs on the athlete's phone).
 */
import type { WearableData } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Whoop's need is time asleep; in bed you need a little longer. */
const FALL_ASLEEP_MIN = 15;

export interface SleepDebt {
  /** Nights with both sleep and need data among the last 3. */
  nights: number;
  /** Nights at least 1h short of need. */
  shortNights: number;
  /** Total hours short over those nights (never negative). */
  deficitHours: number;
}

function lastNights(history: WearableData[], now: number, count: number): WearableData[] {
  return (history ?? [])
    .filter(d => {
      const t = new Date(d.date).getTime();
      return Number.isFinite(t) && t <= now + DAY_MS && t > now - (count + 0.5) * DAY_MS;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, count);
}

/**
 * Hours actually asleep. `sleepHours` is Whoop's time IN BED; need is time
 * ASLEEP, so compare against the stage total when we have it.
 */
export function hoursAsleep(d: WearableData): number | null {
  const stages = [d.lightSleepMinutes, d.deepSleepMinutes, d.remSleepMinutes];
  if (stages.every(m => m != null)) {
    const total = stages.reduce((s, m) => s! + m!, 0)!;
    if (total > 0) return total / 60;
  }
  return d.sleepHours ?? null;
}

export function recentSleepDebt(history: WearableData[], now: number = Date.now()): SleepDebt {
  const withSleep = (history ?? [])
    .filter(d => hoursAsleep(d) != null && d.sleepNeededHours != null && d.sleepNeededHours > 0);
  const nights = lastNights(withSleep, now, 3);
  let deficit = 0;
  let shortNights = 0;
  for (const d of nights) {
    const short = d.sleepNeededHours! - hoursAsleep(d)!;
    if (short > 0) deficit += short;
    if (short >= 1) shortNights++;
  }
  return { nights: nights.length, shortNights, deficitHours: Math.round(deficit * 10) / 10 };
}

/** Sleep debt worth changing today's training for: ≥2 short nights and ≥2.5h total. */
export function isSignificantSleepDebt(debt: SleepDebt): boolean {
  return debt.shortNights >= 2 && debt.deficitHours >= 2.5;
}

export interface BedtimeTarget {
  /** "22:40" — local time to be in bed. */
  bedtime: string;
  /** "06:30" — your usual wake time (median of recent nights). */
  wake: string;
  /** Whoop's latest sleep need (hours). */
  needHours: number;
}

const fmt = (min: number) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

export function bedtimeTarget(history: WearableData[], now: number = Date.now()): BedtimeTarget | null {
  const recent = lastNights(history, now, 7);
  const need = recent.find(d => d.sleepNeededHours != null && d.sleepNeededHours > 0)?.sleepNeededHours;
  if (!need) return null;
  // Wake minute-of-day; times after noon are shifted back a day so a late
  // riser's median isn't dragged across midnight.
  const wakes = recent
    .map(d => (d.sleepEnd ? new Date(d.sleepEnd) : null))
    .filter((t): t is Date => t != null && !Number.isNaN(t.getTime()))
    .map(t => {
      const m = t.getHours() * 60 + t.getMinutes();
      return m > 12 * 60 ? m - 1440 : m;
    })
    .sort((a, b) => a - b);
  if (wakes.length < 3) return null;
  const mid = Math.floor(wakes.length / 2);
  const wake = wakes.length % 2 ? wakes[mid] : (wakes[mid - 1] + wakes[mid]) / 2;
  // Round the bedtime down to 5 minutes — "22:43" reads like false precision.
  const bed = Math.floor((wake - need * 60 - FALL_ASLEEP_MIN) / 5) * 5;
  return { bedtime: fmt(bed), wake: fmt(wake), needHours: need };
}
