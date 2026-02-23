/**
 * IndexedDB-based data safety net.
 *
 * localStorage has a ~5 MB limit. IndexedDB typically allows 50 MB+.
 * Before any localStorage pruning, we snapshot the full data to IndexedDB
 * so it can be recovered if something goes wrong.
 *
 * Also provides a heartbeat sync mechanism and sync failure tracking.
 */

const DB_NAME = 'roots-gains-safety';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';
const SNAPSHOT_KEY = 'latest';
const PRE_PRUNE_KEY = 'pre-prune';

// ── Sync failure tracking ────────────────────────────────────────────────────

let consecutiveFailures = 0;
let lastFailureNotified = 0;
const FAILURE_NOTIFY_COOLDOWN_MS = 60_000; // Don't spam — once per minute max

type SyncFailureListener = (failures: number) => void;
const failureListeners = new Set<SyncFailureListener>();

export function onSyncFailure(listener: SyncFailureListener): () => void {
  failureListeners.add(listener);
  return () => failureListeners.delete(listener);
}

export function recordSyncSuccess(): void {
  consecutiveFailures = 0;
}

export function recordSyncFailure(): void {
  consecutiveFailures++;
  const now = Date.now();
  // Notify listeners after 3+ consecutive failures, max once per minute
  if (consecutiveFailures >= 3 && now - lastFailureNotified > FAILURE_NOTIFY_COOLDOWN_MS) {
    lastFailureNotified = now;
    failureListeners.forEach(fn => fn(consecutiveFailures));
  }
}

export function getConsecutiveFailures(): number {
  return consecutiveFailures;
}

// ── IndexedDB helpers ────────────────────────────────────────────────────────

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save a full data snapshot to IndexedDB.
 * Called before any localStorage pruning as a safety net.
 */
export async function savePrePruneSnapshot(data: unknown): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ data, timestamp: Date.now() }, PRE_PRUNE_KEY);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch {
    // IndexedDB not available — not critical, server backup is the fallback
  }
}

/**
 * Save the latest known-good state to IndexedDB.
 * Called periodically (heartbeat) so there's always a recent local copy
 * even if localStorage gets cleared.
 */
export async function saveLatestSnapshot(data: unknown): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ data, timestamp: Date.now() }, SNAPSHOT_KEY);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch {
    // Not critical
  }
}

/**
 * Load the most recent snapshot from IndexedDB.
 * Used as a recovery fallback when localStorage is empty.
 */
export async function loadSnapshot(key: string = SNAPSHOT_KEY): Promise<{ data: unknown; timestamp: number } | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => { db.close(); resolve(request.result || null); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  } catch {
    return null;
  }
}

/**
 * Load the pre-prune snapshot (saved right before emergency pruning).
 */
export async function loadPrePruneSnapshot(): Promise<{ data: unknown; timestamp: number } | null> {
  return loadSnapshot(PRE_PRUNE_KEY);
}
