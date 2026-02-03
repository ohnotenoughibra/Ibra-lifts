// Database sync utility - syncs Zustand store with Vercel Postgres
// Falls back gracefully to localStorage-only when DB is not configured

const SYNC_DEBOUNCE_MS = 3000; // Debounce saves to avoid hammering the DB
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

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

export function saveToDatabase(userId: string, data: any): void {
  // Debounce to avoid too many writes
  if (syncTimeout) clearTimeout(syncTimeout);

  syncTimeout = setTimeout(async () => {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, data }),
      });
      if (res.ok) {
        console.log('[db-sync] Data synced to database');
      }
    } catch {
      // Silently fail - localStorage is the primary store
      console.log('[db-sync] Database sync failed, data safe in localStorage');
    }
  }, SYNC_DEBOUNCE_MS);
}

export async function initDatabase(): Promise<boolean> {
  try {
    const res = await fetch('/api/sync/init', { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}
