// Database sync utility - syncs Zustand store with Vercel Postgres
// Falls back gracefully to localStorage-only when DB is not configured

import { recordSyncSuccess, recordSyncFailure } from './data-safety';
import { calculateLevel } from './gamification';

const SYNC_DEBOUNCE_MS = 3000; // Debounce saves to avoid hammering the DB
const SYNC_MAX_WAIT_MS = 15000; // Max wait before forcing a sync (prevents starvation)
const SYNC_QUEUE_KEY = 'roots-gains-sync-queue-v1'; // localStorage key for queue persistence

let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let maxWaitTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingPayload: { userId: string; data: Record<string, unknown> } | null = null;

// ── localStorage-backed sync queue ──────────────────────────────────────────

function loadQueueFromStorage(): Array<{ userId: string; data: Record<string, unknown> }> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueueToStorage(queue: Array<{ userId: string; data: Record<string, unknown> }>): void {
  if (typeof window === 'undefined') return;
  try {
    if (queue.length === 0) {
      localStorage.removeItem(SYNC_QUEUE_KEY);
    } else {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    }
  } catch {
    // Quota exceeded — not critical, the in-memory queue still works
  }
}

export async function loadFromDatabase(userId: string): Promise<{ data: Record<string, unknown>; serverUpdatedAt: string | null } | null> {
  try {
    const res = await fetch(`/api/sync?userId=${encodeURIComponent(userId)}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      console.error(`[db-sync] Pull failed: ${res.status} ${res.statusText}`, errorText.slice(0, 200));
      return null;
    }
    const json = await res.json();
    if (!json.data) return null;
    return { data: json.data, serverUpdatedAt: json.serverUpdatedAt || null };
  } catch (err) {
    console.error('[db-sync] Pull network error:', err);
    return null;
  }
}

/**
 * Normalize workoutLogs: ensures every set in a completed workout has `completed: true`.
 * Imported/DB-inserted workouts may lack this field, which breaks ~50 places
 * in the codebase that filter on `set.completed`.
 */
export function normalizeWorkoutLogs(data: Record<string, unknown>): Record<string, unknown> {
  const logs = data.workoutLogs;
  if (!Array.isArray(logs) || logs.length === 0) return data;

  let mutated = false;
  for (const log of logs as Array<Record<string, unknown>>) {
    // Only normalize completed workouts (active workouts may have incomplete sets)
    if (!log.completed) continue;
    const exercises = log.exercises as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(exercises)) continue;
    for (const ex of exercises) {
      const sets = ex.sets as Array<Record<string, unknown>> | undefined;
      if (!Array.isArray(sets)) continue;
      for (const set of sets) {
        if (set.completed === undefined && set.weight != null && set.reps != null) {
          set.completed = true;
          mutated = true;
        }
      }
    }
  }

  return mutated ? { ...data, workoutLogs: logs } : data;
}

/**
 * Resolve conflicts between local and remote data.
 *
 * Strategy:
 *   - Array fields: ALWAYS union merge by ID (never drop entries from either side)
 *   - Object fields (waterLog): ALWAYS deep merge (keep all date keys from both sides)
 *   - Scalar fields: prefer whichever side has the newer lastSyncAt
 */
export function resolveConflicts(
  local: Record<string, unknown>,
  remote: Record<string, unknown>
): Record<string, unknown> {
  if (!remote) return normalizeWorkoutLogs(local);
  if (!local) return normalizeWorkoutLogs(remote);

  const merged: Record<string, unknown> = { ...remote };

  // ── Array fields: union merge by ID — entries from BOTH sides are kept ──
  const arrayFields = [
    'workoutLogs', 'meals', 'bodyWeightLog', 'bodyComposition',
    'injuryLog', 'hrSessions', 'trainingSessions', 'customExercises', 'sessionTemplates',
    'quickLogs', 'gripTests', 'gripExerciseLogs', 'illnessLogs', 'workoutSkips',
    'cycleLogs', 'weeklyCheckIns', 'competitions', 'supplementIntakes',
    'mentalCheckIns', 'confidenceLedger', 'featureFeedback',
    'weightCutPlans', 'fightCampPlans', 'supplementStack', 'activeSupplements',
    'dietPhaseHistory',
    // Previously missing — remote silently overwrote local:
    'mesocycleHistory', 'mesocycleQueue',
    'seenInsights', 'dismissedInsights', 'readArticles', 'bookmarkedArticles',
    'mealStamps',
    // Illness resolution IDs (previously local-only)
    '_resolvedIllnessIds',
  ];

  for (const field of arrayFields) {
    const localArr = local[field];
    const remoteArr = remote[field];
    if (Array.isArray(localArr) && Array.isArray(remoteArr)) {
      // Primitive arrays (string[], number[]): Set union
      if (remoteArr.length > 0 && typeof remoteArr[0] !== 'object') {
        merged[field] = Array.from(new Set([...remoteArr, ...localArr]));
        continue;
      }
      if (localArr.length > 0 && typeof localArr[0] !== 'object') {
        merged[field] = Array.from(new Set([...remoteArr, ...localArr]));
        continue;
      }
      // Object arrays: union by ID, prefer newer entry for conflicts
      // Tombstone rule: if either side has _deleted, the tombstone wins
      const map = new Map<string, Record<string, unknown>>();
      const getKey = (item: Record<string, unknown>): string =>
        item.id != null ? String(item.id) : JSON.stringify(item);
      for (const item of remoteArr as Array<Record<string, unknown>>) {
        map.set(getKey(item), item);
      }
      for (const item of localArr as Array<Record<string, unknown>>) {
        const key = getKey(item);
        const existing = map.get(key);
        if (!existing) {
          map.set(key, item);
        } else {
          // Tombstone always wins — once deleted, stays deleted.
          // If EITHER side has _deleted: true, the merged result is deleted.
          // This prevents resurrection when a non-deleted version has a newer timestamp.
          const eitherDeleted = item._deleted || existing._deleted;
          if (eitherDeleted) {
            // Pick whichever version is the tombstone; if both, prefer newer
            const tombstone = item._deleted ? item : existing;
            map.set(key, tombstone);
          } else {
            // Status finality rule: "resolved" beats "active"/"recovering"
            // (same principle as tombstones — once resolved, never un-resolve)
            const itemResolved = (item as Record<string, unknown>).status === 'resolved';
            const existingResolved = (existing as Record<string, unknown>).status === 'resolved';
            if (itemResolved && !existingResolved) {
              map.set(key, item);
            } else if (!itemResolved && existingResolved) {
              // Keep existing resolved entry
            } else {
              // Neither or both resolved — prefer the newer entry
              const localDate = new Date((item.updatedAt || item.date || 0) as string).getTime();
              const remoteDate = new Date((existing.updatedAt || existing.date || 0) as string).getTime();
              if (localDate > remoteDate) {
                map.set(key, item);
              }
            }
          }
        }
      }
      // GC tombstones older than 30 days
      const gcCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const mergedArr = Array.from(map.values()).filter(item =>
        !item._deleted || !item._deletedAt || (item._deletedAt as number) > gcCutoff
      );
      merged[field] = mergedArr;
    } else if (Array.isArray(localArr)) {
      merged[field] = localArr;
    }
  }

  // ── Object fields (date-keyed): ALWAYS deep merge both sides ──
  // Keeps all date keys from both devices. For same-date conflicts,
  // the newer side wins (by lastSyncAt).
  const objectFields = ['waterLog'];
  const localSync = (local.lastSyncAt || 0) as number;
  const remoteSync = (remote.lastSyncAt || 0) as number;
  for (const field of objectFields) {
    const localObj = local[field];
    const remoteObj = remote[field];
    if (localObj && typeof localObj === 'object' && !Array.isArray(localObj) &&
        remoteObj && typeof remoteObj === 'object' && !Array.isArray(remoteObj)) {
      // Newer side goes last (overwrites conflicts)
      merged[field] = localSync > remoteSync
        ? { ...remoteObj as object, ...localObj as object }
        : { ...localObj as object, ...remoteObj as object };
    } else if (localObj && typeof localObj === 'object' && !Array.isArray(localObj)) {
      merged[field] = localObj;
    }
  }

  // ── User profile: field-level merge when _fieldTimestamps exist ──
  // Each field picks the side with the newer per-field timestamp. Falls back
  // to whole-object updatedAt comparison when no field timestamps exist.
  const localUser = local.user as Record<string, unknown> | undefined;
  const remoteUser = remote.user as Record<string, unknown> | undefined;
  if (localUser && remoteUser) {
    const localFT = (localUser._fieldTimestamps || {}) as Record<string, number>;
    const remoteFT = (remoteUser._fieldTimestamps || {}) as Record<string, number>;
    const hasFieldTimestamps = Object.keys(localFT).length > 0 || Object.keys(remoteFT).length > 0;

    if (hasFieldTimestamps) {
      // Field-level merge: start from remote, overlay local fields that are newer
      const mergedUser: Record<string, unknown> = { ...remoteUser };
      const mergedFT: Record<string, number> = { ...remoteFT };
      for (const key of Object.keys(localUser)) {
        if (key === '_fieldTimestamps') continue;
        const localTs = localFT[key] || 0;
        const remoteTs = remoteFT[key] || 0;
        if (localTs > remoteTs) {
          mergedUser[key] = localUser[key];
          mergedFT[key] = localTs;
        }
      }
      // Ensure local-only fields are preserved
      for (const key of Object.keys(localFT)) {
        if (!(key in remoteFT) || localFT[key] > (remoteFT[key] || 0)) {
          mergedFT[key] = localFT[key];
        }
      }
      mergedUser._fieldTimestamps = mergedFT;
      // updatedAt = max of both sides
      const localUpdated = new Date((localUser.updatedAt || 0) as string).getTime();
      const remoteUpdated = new Date((remoteUser.updatedAt || 0) as string).getTime();
      mergedUser.updatedAt = localUpdated > remoteUpdated ? localUser.updatedAt : remoteUser.updatedAt;
      merged.user = mergedUser;
    } else {
      // Fallback: whole-object, prefer newer updatedAt
      const localUserTs = new Date((localUser.updatedAt || 0) as string).getTime();
      const remoteUserTs = new Date((remoteUser.updatedAt || 0) as string).getTime();
      if (localUserTs > remoteUserTs) {
        merged.user = localUser;
      }
    }
  } else if (localUser) {
    merged.user = localUser;
  }

  // ── gamificationStats: merge event-based fields + union badges ──
  // Streak, XP, level, totalWorkouts, totalVolume, personalRecords are now
  // COMPUTED from workoutLogs on every render (see computed-gamification.ts).
  // The merge only needs to handle badges (union) and event counters (max).
  const localGS = local.gamificationStats as Record<string, unknown> | undefined;
  const remoteGS = remote.gamificationStats as Record<string, unknown> | undefined;
  if (localGS && remoteGS) {
    const localPts = (localGS.totalPoints as number) || 0;
    const remotePts = (remoteGS.totalPoints as number) || 0;
    // Base: pick the side with more XP as the "winner" for non-computed fields
    const winner = localPts >= remotePts ? localGS : remoteGS;
    const loser  = localPts >= remotePts ? remoteGS : localGS;

    // Union-merge badges by badgeId so no badge is ever lost
    const winnerBadges = Array.isArray(winner.badges) ? winner.badges as Array<Record<string, unknown>> : [];
    const loserBadges  = Array.isArray(loser.badges)  ? loser.badges  as Array<Record<string, unknown>> : [];
    const badgeMap = new Map<string, Record<string, unknown>>();
    for (const b of loserBadges)  badgeMap.set(String(b.badgeId ?? b.id), b);
    for (const b of winnerBadges) badgeMap.set(String(b.badgeId ?? b.id), b);

    merged.gamificationStats = {
      ...winner,
      // Keep stored totalPoints as max (computed hook takes Math.max anyway)
      totalPoints: Math.max(localPts, remotePts),
      level: calculateLevel(Math.max(localPts, remotePts)),
      badges: Array.from(badgeMap.values()),
      // Event counters: take max from both sides
      comebackCount: Math.max((localGS.comebackCount as number) || 0, (remoteGS.comebackCount as number) || 0),
      challengesCompleted: Math.max((localGS.challengesCompleted as number) || 0, (remoteGS.challengesCompleted as number) || 0),
      smartRestDays: Math.max((localGS.smartRestDays as number) || 0, (remoteGS.smartRestDays as number) || 0),
      // Streak/XP/totalWorkouts/totalVolume/personalRecords are NOT merged —
      // they're computed from workoutLogs on every render. Any value stored
      // here is just a cache that the computed hook will override.
    };
  } else if (localGS) {
    merged.gamificationStats = localGS;
  }

  // ── baselineLifts: prefer whichever side has the newer updatedAt ──
  // Prevents cloud sync from overwriting local baseline lift edits.
  const localBL = local.baselineLifts as Record<string, unknown> | undefined;
  const remoteBL = remote.baselineLifts as Record<string, unknown> | undefined;
  if (localBL && remoteBL) {
    const localBLTs = new Date((localBL.updatedAt || 0) as string).getTime();
    const remoteBLTs = new Date((remoteBL.updatedAt || 0) as string).getTime();
    if (localBLTs >= remoteBLTs) {
      merged.baselineLifts = localBL;
    }
  } else if (localBL) {
    merged.baselineLifts = localBL;
  }

  // ── Object fields with updatedAt: prefer whichever side is newer ──
  // These are critical structured fields that can regress if the wrong side wins.
  // Each gets its own updatedAt-based merge (like user and baselineLifts above).
  const updatedAtFields = ['currentMesocycle', 'activeDietPhase', 'macroTargets',
    'muscleEmphasis', 'activeEquipmentProfile', 'combatNutritionProfile',
    'notificationPreferences', 'onboardingData', 'subscription', 'nutritionPeriodPlan'];
  for (const field of updatedAtFields) {
    const localVal = local[field] as Record<string, unknown> | undefined;
    const remoteVal = remote[field] as Record<string, unknown> | undefined;
    if (localVal && remoteVal) {
      // Prefer the side with the newer updatedAt; fall back to lastSyncAt comparison
      const localTs = new Date((localVal.updatedAt || 0) as string).getTime();
      const remoteTs = new Date((remoteVal.updatedAt || 0) as string).getTime();
      if (localTs > 0 || remoteTs > 0) {
        merged[field] = localTs >= remoteTs ? localVal : remoteVal;
      } else {
        // No updatedAt on either side — fall back to lastSyncAt
        merged[field] = localSync >= remoteSync ? localVal : remoteVal;
      }
    } else if (localVal) {
      merged[field] = localVal;
    }
  }

  // ── Scalar fields: prefer whichever side synced last ──
  const specialFields = new Set([
    ...arrayFields, ...objectFields, ...updatedAtFields,
    'lastSyncAt', 'user', 'gamificationStats', 'baselineLifts',
  ]);
  if (localSync > remoteSync) {
    for (const key of Object.keys(local)) {
      if (!specialFields.has(key) && local[key] !== undefined) {
        merged[key] = local[key];
      }
    }
  }

  return normalizeWorkoutLogs(merged);
}

/**
 * Queue a sync request using Background Sync API if available,
 * otherwise fall back to a localStorage-persisted queue.
 */
async function queueForBackgroundSync(userId: string, data: Record<string, unknown>): Promise<void> {
  // Try Background Sync API (caches the request for the SW to replay)
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      // Store payload in a dedicated cache for the SW to read
      const syncCache = await caches.open('roots-gains-sync-queue');
      const key = `/api/sync?bg=${userId}-${Date.now()}`;
      await syncCache.put(
        new Request(key),
        new Response(JSON.stringify({ userId, data, lastSyncAt: Date.now() }), {
          headers: { 'Content-Type': 'application/json' },
        })
      );
      await (reg as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-store');
      if (process.env.NODE_ENV === 'development') {
        console.log('[db-sync] Queued for background sync');
      }
      return;
    } catch {
      // Background Sync not supported or failed — fall through to localStorage queue
    }
  }

  // Fallback: localStorage-persisted queue (survives page refresh)
  const queue = loadQueueFromStorage();
  queue.push({ userId, data });
  saveQueueToStorage(queue);
  if (process.env.NODE_ENV === 'development') {
    console.log('[db-sync] Offline — queued in localStorage for later sync');
  }
}

// GAP FIX: Trim old data to reduce payload size below Vercel's ~1MB limit.
// Removes workoutLogs older than 6 months and wearableHistory older than 30 days.
const PAYLOAD_MAX_BYTES = 900 * 1024; // 900KB safety margin for Vercel's ~1MB limit

function trimOldData(data: Record<string, unknown>): Record<string, unknown> {
  const trimmed = { ...data };
  const sixMonthsAgo = Date.now() - 180 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  // Trim workoutLogs older than 6 months
  if (Array.isArray(trimmed.workoutLogs)) {
    const before = trimmed.workoutLogs.length;
    trimmed.workoutLogs = (trimmed.workoutLogs as Array<Record<string, unknown>>).filter(log => {
      const logDate = new Date((log.date || log.completedAt || 0) as string).getTime();
      return isNaN(logDate) || logDate > sixMonthsAgo;
    });
    if ((trimmed.workoutLogs as unknown[]).length < before) {
      console.warn(`[db-sync] Trimmed ${before - (trimmed.workoutLogs as unknown[]).length} workoutLogs older than 6 months to reduce payload size`);
    }
  }

  // Trim wearableHistory older than 30 days
  if (Array.isArray(trimmed.wearableHistory)) {
    const before = trimmed.wearableHistory.length;
    trimmed.wearableHistory = (trimmed.wearableHistory as Array<Record<string, unknown>>).filter(entry => {
      const entryDate = new Date((entry.date || 0) as string).getTime();
      return isNaN(entryDate) || entryDate > thirtyDaysAgo;
    });
    if ((trimmed.wearableHistory as unknown[]).length < before) {
      console.warn(`[db-sync] Trimmed ${before - (trimmed.wearableHistory as unknown[]).length} wearableHistory entries older than 30 days to reduce payload size`);
    }
  }

  return trimmed;
}

/** Actually perform the sync POST */
async function doSync(userId: string, data: Record<string, unknown>): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await queueForBackgroundSync(userId, data);
    return;
  }

  // GAP FIX: Check payload size before sending. If it exceeds 900KB (Vercel's
  // ~1MB body limit), trim old data and retry to prevent silent 413 errors.
  let finalData = data;
  let body = JSON.stringify({ userId, data: finalData, lastSyncAt: Date.now() });
  const initialSize = new Blob([body]).size;

  if (initialSize > PAYLOAD_MAX_BYTES) {
    console.warn(`[db-sync] Payload too large (${(initialSize / 1024).toFixed(0)} KB > ${PAYLOAD_MAX_BYTES / 1024} KB) — trimming old data`);
    finalData = trimOldData(data);
    body = JSON.stringify({ userId, data: finalData, lastSyncAt: Date.now() });
    const trimmedSize = new Blob([body]).size;
    if (trimmedSize > PAYLOAD_MAX_BYTES) {
      console.warn(`[db-sync] Payload still large after trimming (${(trimmedSize / 1024).toFixed(0)} KB) — sending anyway`);
    } else {
      console.log(`[db-sync] Payload reduced to ${(trimmedSize / 1024).toFixed(0)} KB after trimming`);
    }
  }
  const payloadSize = new Blob([body]).size;
  console.log(`[db-sync] POST /api/sync payload: ${(payloadSize / 1024).toFixed(0)} KB`);

  const res = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  if (res.ok) {
    const resBody = await res.json().catch(() => ({}));
    if (resBody.blocked) {
      console.warn(`[db-sync] Sync BLOCKED by server (${resBody.reason || 'safety guard'}) — ` +
        `server score: ${resBody.serverScore}, incoming: ${resBody.incomingScore}`);
      recordSyncFailure();
      throw new Error(`Sync blocked: ${resBody.reason || 'data_regression'}`);
    } else {
      recordSyncSuccess();
      console.log('[db-sync] Push accepted by server');
    }
  } else {
    const errorText = await res.text().catch(() => '');
    console.error(`[db-sync] Push failed: ${res.status} ${res.statusText}`, errorText.slice(0, 200));
    recordSyncFailure();
    throw new Error(`Sync POST failed: ${res.status}`);
  }
}

/**
 * Save data to the database with debounce + max-wait to prevent starvation.
 *
 * - Resets a short debounce timer on every call (coalesces rapid changes)
 * - Guarantees a sync fires within SYNC_MAX_WAIT_MS of the first unsynced change
 */
export function saveToDatabase(userId: string, data: Record<string, unknown>): void {
  pendingPayload = { userId, data };

  // Reset the short debounce timer
  if (syncTimeout) clearTimeout(syncTimeout);

  const flush = async () => {
    if (!pendingPayload) return;
    const { userId: uid, data: payload } = pendingPayload;
    pendingPayload = null;

    // Clear both timers
    if (syncTimeout) { clearTimeout(syncTimeout); syncTimeout = null; }
    if (maxWaitTimeout) { clearTimeout(maxWaitTimeout); maxWaitTimeout = null; }

    try {
      await doSync(uid, payload);
    } catch {
      await queueForBackgroundSync(uid, payload);
    }
  };

  // Short debounce — coalesces rapid successive saves
  syncTimeout = setTimeout(flush, SYNC_DEBOUNCE_MS);

  // Max-wait — guarantees sync fires even under continuous rapid saves
  if (!maxWaitTimeout) {
    maxWaitTimeout = setTimeout(flush, SYNC_MAX_WAIT_MS);
  }
}

/** Flush any pending syncs that queued while offline (from localStorage + memory) */
export async function flushSyncQueue(): Promise<void> {
  const queue = loadQueueFromStorage();
  if (queue.length === 0) return;

  // Merge all queued entries per userId instead of keeping only the last one.
  // This prevents data loss when multiple changes are queued while offline.
  const mergedByUser = new Map<string, Record<string, unknown>>();
  for (const item of queue) {
    const existing = mergedByUser.get(item.userId);
    if (!existing) {
      mergedByUser.set(item.userId, item.data);
    } else {
      // Merge: union arrays, prefer newer scalars
      mergedByUser.set(item.userId, resolveConflicts(existing, item.data));
    }
  }

  const failedQueue: Array<{ userId: string; data: Record<string, unknown> }> = [];

  for (const [userId, data] of Array.from(mergedByUser.entries())) {
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, data, lastSyncAt: Date.now() }),
      });
      if (process.env.NODE_ENV === 'development') {
        console.log(`[db-sync] Flushed queued sync for ${userId}`);
      }
    } catch {
      failedQueue.push({ userId, data });
    }
  }

  // Persist any failed items back
  saveQueueToStorage(failedQueue);
}

/**
 * Immediately flush any pending debounced sync.
 * Called when the page is about to be hidden (app backgrounded, tab closed, etc.)
 * so we don't lose data that was waiting on the debounce timer.
 *
 * Strategy: ALWAYS persist to localStorage queue first (survives page kill),
 * then attempt network delivery as best-effort. On next visit, flushSyncQueue
 * will push any queued data that didn't make it.
 */
export function flushPendingSync(): void {
  if (!pendingPayload) return;
  const { userId, data } = pendingPayload;
  pendingPayload = null;

  // Clear debounce timers
  if (syncTimeout) { clearTimeout(syncTimeout); syncTimeout = null; }
  if (maxWaitTimeout) { clearTimeout(maxWaitTimeout); maxWaitTimeout = null; }

  // ALWAYS queue to localStorage first — this is the safety net.
  // Even if sendBeacon/fetch succeeds, flushSyncQueue on next visit
  // will harmlessly merge (server-side merge is idempotent).
  queueForBackgroundSync(userId, data);

  // Best-effort network delivery (may not complete before page kill)
  const payload = JSON.stringify({ userId, data, lastSyncAt: Date.now() });

  // Try fetch with keepalive (survives page unload, up to ~64KB in most browsers)
  // For large payloads this may fail, but the localStorage queue has our back.
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).then(async (res) => {
        if (res.ok) {
          // Success — clear the queue entry we just added
          const queue = loadQueueFromStorage();
          if (queue.length > 0) {
            // Remove the entry we just queued (last one)
            queue.pop();
            saveQueueToStorage(queue);
          }
          recordSyncSuccess();
        }
      }).catch(() => {
        // Network failed — queue already persisted, will retry on next visit
      });
    } catch {
      // fetch itself threw (e.g., page already unloading) — queue is persisted
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[db-sync] Flushed pending sync (queued + best-effort fetch)');
  }
}

/**
 * Immediately flush any pending debounced sync via fetch (not sendBeacon).
 * Called after critical mutations (completeWorkout, addMeal, etc.) to ensure
 * data reaches the server within seconds instead of waiting for debounce.
 */
export async function flushImmediateSync(): Promise<void> {
  if (!pendingPayload) return;
  const { userId, data } = pendingPayload;
  pendingPayload = null;

  if (syncTimeout) { clearTimeout(syncTimeout); syncTimeout = null; }
  if (maxWaitTimeout) { clearTimeout(maxWaitTimeout); maxWaitTimeout = null; }

  try {
    await doSync(userId, data);
  } catch {
    await queueForBackgroundSync(userId, data);
  }
}

/**
 * Force-push current data to cloud immediately (non-debounced).
 * Used by the manual "Sync Now" button to ensure local data reaches the server.
 */
export async function forcePushToCloud(userId: string, data: Record<string, unknown>): Promise<void> {
  // Cancel any pending debounced sync since we're pushing now
  if (syncTimeout) { clearTimeout(syncTimeout); syncTimeout = null; }
  if (maxWaitTimeout) { clearTimeout(maxWaitTimeout); maxWaitTimeout = null; }
  pendingPayload = null;

  await doSync(userId, data);
}

export async function initDatabase(): Promise<boolean> {
  try {
    const res = await fetch('/api/sync/init', { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}
