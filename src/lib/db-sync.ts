// Database sync utility - syncs Zustand store with Vercel Postgres
// Falls back gracefully to localStorage-only when DB is not configured

const SYNC_DEBOUNCE_MS = 3000; // Debounce saves to avoid hammering the DB
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingSyncQueue: Array<{ userId: string; data: Record<string, unknown> }> = [];

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
    'injuryLog', 'hrSessions', 'grapplingSessions', 'customExercises', 'sessionTemplates',
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
 * otherwise fall back to the in-memory queue.
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
      // Background Sync not supported or failed — fall through to memory queue
    }
  }

  // Fallback: in-memory queue
  pendingSyncQueue.push({ userId, data });
  if (process.env.NODE_ENV === 'development') {
    console.log('[db-sync] Offline — queued in memory for later sync');
  }
}

export function saveToDatabase(userId: string, data: Record<string, unknown>): void {
  // Debounce to avoid too many writes
  if (syncTimeout) clearTimeout(syncTimeout);

  syncTimeout = setTimeout(async () => {
    try {
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
    } catch {
      await queueForBackgroundSync(userId, data);
    }
  }, SYNC_DEBOUNCE_MS);
}

/** Flush any pending syncs that queued while offline */
export async function flushSyncQueue(): Promise<void> {
  if (pendingSyncQueue.length === 0) return;
  const queue = [...pendingSyncQueue];
  pendingSyncQueue = [];

  // Only sync the latest entry per userId
  const latestByUser = new Map<string, Record<string, unknown>>();
  for (const item of queue) {
    latestByUser.set(item.userId, item.data);
  }

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
      pendingSyncQueue.push({ userId, data });
    }
  }
}

export async function initDatabase(): Promise<boolean> {
  try {
    const res = await fetch('/api/sync/init', { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}
