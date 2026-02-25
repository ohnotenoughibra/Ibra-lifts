// Database sync utility - syncs Zustand store with Vercel Postgres
// Falls back gracefully to localStorage-only when DB is not configured

import { recordSyncSuccess, recordSyncFailure } from './data-safety';

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
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.data) return null;
    return { data: json.data, serverUpdatedAt: json.serverUpdatedAt || null };
  } catch {
    // DB not configured or network error - that's fine, use localStorage
    if (process.env.NODE_ENV === 'development') {
      console.log('[db-sync] Database not available, using localStorage only');
    }
    return null;
  }
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
  if (!remote) return local;
  if (!local) return remote;

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
          // Prefer the newer entry
          const localDate = new Date((item.updatedAt || item.date || 0) as string).getTime();
          const remoteDate = new Date((existing.updatedAt || existing.date || 0) as string).getTime();
          if (localDate > remoteDate) {
            map.set(key, item);
          }
        }
      }
      merged[field] = Array.from(map.values());
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

  // ── User profile: prefer whichever side has the newer updatedAt ──
  // Prevents cloud sync from overwriting local profile changes (e.g. training days)
  // when the push hasn't completed yet (sendBeacon dropped, offline, race condition).
  const localUser = local.user as Record<string, unknown> | undefined;
  const remoteUser = remote.user as Record<string, unknown> | undefined;
  if (localUser && remoteUser) {
    const localUserTs = new Date((localUser.updatedAt || 0) as string).getTime();
    const remoteUserTs = new Date((remoteUser.updatedAt || 0) as string).getTime();
    if (localUserTs > remoteUserTs) {
      merged.user = localUser;
    }
  } else if (localUser) {
    merged.user = localUser;
  }

  // ── Scalar fields: prefer whichever side synced last ──
  // Previously only 4 scalars were protected. Now ALL local scalars win when local is newer.
  const specialFields = new Set([...arrayFields, ...objectFields, 'lastSyncAt', 'user']);
  if (localSync > remoteSync) {
    for (const key of Object.keys(local)) {
      if (!specialFields.has(key) && local[key] !== undefined) {
        merged[key] = local[key];
      }
    }
  }

  return merged;
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

/** Actually perform the sync POST */
async function doSync(userId: string, data: Record<string, unknown>): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await queueForBackgroundSync(userId, data);
    return;
  }

  const res = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, data, lastSyncAt: Date.now() }),
  });
  if (res.ok) {
    const body = await res.json().catch(() => ({}));
    if (body.blocked) {
      console.warn(`[db-sync] Sync BLOCKED by server (${body.reason || 'safety guard'}) — ` +
        `server score: ${body.serverScore}, incoming: ${body.incomingScore}`);
      recordSyncFailure();
    } else {
      recordSyncSuccess();
      if (process.env.NODE_ENV === 'development') {
        console.log('[db-sync] Data synced to database');
      }
    }
  } else {
    recordSyncFailure();
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
 */
export function flushPendingSync(): void {
  if (!pendingPayload) return;
  const { userId, data } = pendingPayload;
  pendingPayload = null;

  // Clear debounce timers
  if (syncTimeout) { clearTimeout(syncTimeout); syncTimeout = null; }
  if (maxWaitTimeout) { clearTimeout(maxWaitTimeout); maxWaitTimeout = null; }

  // Use sendBeacon for reliability during page hide (fetch may be cancelled)
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const payload = JSON.stringify({ userId, data, lastSyncAt: Date.now() });
    const sent = navigator.sendBeacon('/api/sync', new Blob([payload], { type: 'application/json' }));
    if (sent) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[db-sync] Flushed pending sync via sendBeacon');
      }
      return;
    }
  }

  // Fallback: fire-and-forget fetch (may or may not complete)
  doSync(userId, data).catch(() => queueForBackgroundSync(userId, data));
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
