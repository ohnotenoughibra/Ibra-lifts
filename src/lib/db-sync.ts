// Database sync utility - syncs Zustand store with Vercel Postgres
// Falls back gracefully to localStorage-only when DB is not configured

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

export async function loadFromDatabase(userId: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`/api/sync?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return null;
    const { data } = await res.json();
    return data;
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
 * Strategy: merge arrays by union on IDs, prefer newest for scalars via lastSyncAt.
 */
export function resolveConflicts(
  local: Record<string, unknown>,
  remote: Record<string, unknown>
): Record<string, unknown> {
  if (!remote) return local;
  if (!local) return remote;

  const merged: Record<string, unknown> = { ...remote };

  // For array fields, merge by ID (union), preferring entries with newer dates
  const arrayFields = [
    'workoutLogs', 'meals', 'bodyWeightLog', 'bodyComposition',
    'injuryLog', 'hrSessions', 'trainingSessions', 'customExercises', 'sessionTemplates',
  ];
  for (const field of arrayFields) {
    const localArr = local[field];
    const remoteArr = remote[field];
    if (Array.isArray(localArr) && Array.isArray(remoteArr)) {
      const map = new Map<string, Record<string, unknown>>();
      for (const item of remoteArr as Array<Record<string, unknown>>) {
        map.set(item.id as string, item);
      }
      for (const item of localArr as Array<Record<string, unknown>>) {
        const existing = map.get(item.id as string);
        if (!existing) {
          map.set(item.id as string, item);
        } else {
          // Prefer the newer entry
          const localDate = new Date((item.updatedAt || item.date || 0) as string).getTime();
          const remoteDate = new Date((existing.updatedAt || existing.date || 0) as string).getTime();
          if (localDate > remoteDate) {
            map.set(item.id as string, item);
          }
        }
      }
      merged[field] = Array.from(map.values());
    } else if (Array.isArray(localArr)) {
      merged[field] = localArr;
    }
  }

  // For scalar fields, prefer the data with the later lastSyncAt
  const localSync = (local.lastSyncAt || 0) as number;
  const remoteSync = (remote.lastSyncAt || 0) as number;
  if (localSync > remoteSync) {
    merged.user = local.user || merged.user;
    merged.currentMesocycle = local.currentMesocycle || merged.currentMesocycle;
    merged.gamificationStats = local.gamificationStats || merged.gamificationStats;
    merged.macroTargets = local.macroTargets || merged.macroTargets;
    merged.waterLog = { ...(merged.waterLog as object || {}), ...(local.waterLog as object || {}) };
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
    if (process.env.NODE_ENV === 'development') {
      console.log('[db-sync] Data synced to database');
    }
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

  // Only sync the latest entry per userId
  const latestByUser = new Map<string, Record<string, unknown>>();
  for (const item of queue) {
    latestByUser.set(item.userId, item.data);
  }

  const failedQueue: Array<{ userId: string; data: Record<string, unknown> }> = [];

  for (const [userId, data] of Array.from(latestByUser.entries())) {
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

export async function initDatabase(): Promise<boolean> {
  try {
    const res = await fetch('/api/sync/init', { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}
