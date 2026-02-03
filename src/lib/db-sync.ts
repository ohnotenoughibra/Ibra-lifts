// Database sync utility - syncs Zustand store with Vercel Postgres
// Falls back gracefully to localStorage-only when DB is not configured

const SYNC_DEBOUNCE_MS = 3000; // Debounce saves to avoid hammering the DB
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingSyncQueue: Array<{ userId: string; data: any }> = [];

export async function loadFromDatabase(userId: string): Promise<any | null> {
  try {
    const res = await fetch(`/api/sync?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return null;
    const { data } = await res.json();
    return data;
  } catch {
    // DB not configured or network error - that's fine, use localStorage
    console.log('[db-sync] Database not available, using localStorage only');
    return null;
  }
}

/**
 * Resolve conflicts between local and remote data.
 * Strategy: merge arrays by union on IDs, prefer newest for scalars via lastSyncAt.
 */
export function resolveConflicts(local: any, remote: any): any {
  if (!remote) return local;
  if (!local) return remote;

  const merged = { ...remote };

  // For array fields, merge by ID (union), preferring entries with newer dates
  const arrayFields = [
    'workoutLogs', 'meals', 'bodyWeightLog', 'bodyComposition',
    'injuryLog', 'hrSessions', 'grapplingSessions', 'customExercises', 'sessionTemplates',
  ];
  for (const field of arrayFields) {
    if (Array.isArray(local[field]) && Array.isArray(remote[field])) {
      const map = new Map<string, any>();
      for (const item of remote[field]) {
        map.set(item.id, item);
      }
      for (const item of local[field]) {
        const existing = map.get(item.id);
        if (!existing) {
          map.set(item.id, item);
        } else {
          // Prefer the newer entry
          const localDate = new Date(item.updatedAt || item.date || 0).getTime();
          const remoteDate = new Date(existing.updatedAt || existing.date || 0).getTime();
          if (localDate > remoteDate) {
            map.set(item.id, item);
          }
        }
      }
      merged[field] = Array.from(map.values());
    } else if (Array.isArray(local[field])) {
      merged[field] = local[field];
    }
  }

  // For scalar fields, prefer the data with the later lastSyncAt
  const localSync = local.lastSyncAt || 0;
  const remoteSync = remote.lastSyncAt || 0;
  if (localSync > remoteSync) {
    merged.user = local.user || merged.user;
    merged.currentMesocycle = local.currentMesocycle || merged.currentMesocycle;
    merged.gamificationStats = local.gamificationStats || merged.gamificationStats;
    merged.macroTargets = local.macroTargets || merged.macroTargets;
    merged.waterLog = { ...merged.waterLog, ...local.waterLog };
  }

  return merged;
}

export function saveToDatabase(userId: string, data: any): void {
  // Debounce to avoid too many writes
  if (syncTimeout) clearTimeout(syncTimeout);

  syncTimeout = setTimeout(async () => {
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        pendingSyncQueue.push({ userId, data });
        console.log('[db-sync] Offline — queued for later sync');
        return;
      }

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, data, lastSyncAt: Date.now() }),
      });
      if (res.ok) {
        console.log('[db-sync] Data synced to database');
      }
    } catch {
      pendingSyncQueue.push({ userId, data });
      console.log('[db-sync] Database sync failed, data safe in localStorage (queued)');
    }
  }, SYNC_DEBOUNCE_MS);
}

/** Flush any pending syncs that queued while offline */
export async function flushSyncQueue(): Promise<void> {
  if (pendingSyncQueue.length === 0) return;
  const queue = [...pendingSyncQueue];
  pendingSyncQueue = [];

  // Only sync the latest entry per userId
  const latestByUser = new Map<string, any>();
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
      console.log(`[db-sync] Flushed queued sync for ${userId}`);
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
