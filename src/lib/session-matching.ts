/**
 * session-matching.ts — Position-based session completion tracking
 *
 * Replaces fragile UUID-based session matching with a multi-strategy approach:
 * 1. Direct sessionId match (fast path for correctly linked logs)
 * 2. Position match via weekNumber + dayNumber (survives mesocycle regeneration)
 * 3. Chronological position fallback (handles legacy logs without position fields)
 *
 * This eliminates the entire class of "orphaned sessionId" bugs that caused
 * program progress to show 0% despite having completed workouts.
 */

import type { Mesocycle, WorkoutLog, WorkoutSession } from './types';

export interface SessionEntry {
  session: WorkoutSession;
  weekNumber: number;
  dayNumber: number; // 1-indexed position within the week
  isDeload: boolean;
  flatIndex: number; // position in the flattened, ordered session list
}

/**
 * Build a flat, ordered list of all sessions in a mesocycle.
 */
export function flattenSessions(mesocycle: Mesocycle): SessionEntry[] {
  const entries: SessionEntry[] = [];
  const sortedWeeks = [...mesocycle.weeks].sort((a, b) => a.weekNumber - b.weekNumber);
  let flatIndex = 0;
  for (const week of sortedWeeks) {
    for (let i = 0; i < week.sessions.length; i++) {
      entries.push({
        session: week.sessions[i],
        weekNumber: week.weekNumber,
        dayNumber: i + 1,
        isDeload: week.isDeload,
        flatIndex: flatIndex++,
      });
    }
  }
  return entries;
}

/**
 * Get the set of session IDs that have been completed in a mesocycle.
 *
 * Uses three matching strategies in priority order:
 * 1. Direct UUID match (sessionId in log matches session.id in mesocycle)
 * 2. Position match (log.weekNumber + log.dayNumber matches session position)
 * 3. Chronological fallback (sort unmatched logs by date, assign to next unclaimed session)
 *
 * Returns a Set<string> of mesocycle session IDs that are completed.
 */
export function getCompletedSessionIds(
  mesocycle: Mesocycle | null,
  workoutLogs: WorkoutLog[]
): Set<string> {
  if (!mesocycle) return new Set();

  const mesoLogs = workoutLogs.filter(l => l.mesocycleId === mesocycle.id);
  if (mesoLogs.length === 0) return new Set();

  const entries = flattenSessions(mesocycle);
  const allSessionIds = new Set(entries.map(e => e.session.id));
  const completedIds = new Set<string>();
  const matchedLogIds = new Set<string>();

  // Strategy 1: Direct sessionId match
  for (const log of mesoLogs) {
    if (allSessionIds.has(log.sessionId)) {
      completedIds.add(log.sessionId);
      matchedLogIds.add(log.id);
    }
  }

  // Strategy 2: Position match (weekNumber + dayNumber)
  const unmatchedAfterUuid = mesoLogs.filter(l => !matchedLogIds.has(l.id));
  for (const log of unmatchedAfterUuid) {
    if (log.weekNumber != null && log.dayNumber != null) {
      const entry = entries.find(
        e => e.weekNumber === log.weekNumber && e.dayNumber === log.dayNumber && !completedIds.has(e.session.id)
      );
      if (entry) {
        completedIds.add(entry.session.id);
        matchedLogIds.add(log.id);
      }
    }
  }

  // Strategy 3: Chronological fallback for legacy logs without position info
  const stillUnmatched = mesoLogs.filter(l => !matchedLogIds.has(l.id));
  if (stillUnmatched.length > 0) {
    const sorted = [...stillUnmatched].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const unclaimed = entries.filter(e => !completedIds.has(e.session.id));
    for (let i = 0; i < Math.min(sorted.length, unclaimed.length); i++) {
      completedIds.add(unclaimed[i].session.id);
    }
  }

  return completedIds;
}

/**
 * Find the next uncompleted session in a mesocycle.
 */
export function getNextSession(
  mesocycle: Mesocycle | null,
  workoutLogs: WorkoutLog[]
): SessionEntry | null {
  if (!mesocycle) return null;
  const completedIds = getCompletedSessionIds(mesocycle, workoutLogs);
  const entries = flattenSessions(mesocycle);
  return entries.find(e => !completedIds.has(e.session.id)) ?? null;
}
