'use client';

// ── Background Whoop Sync ─────────────────────────────────────────────────
// Keeps Whoop data fresh without opening the Wearable screen: on app open,
// whenever the app comes back to the foreground, when the network returns,
// and every 15 minutes while open. All the real work (token restore/refresh,
// transform, mat-session auto-import, error recording) lives in
// lib/whoop-sync.ts and is shared with the Wearable screen.

import { useEffect } from 'react';
import { syncWhoop } from './whoop-sync';

const SYNC_INTERVAL_MS = 15 * 60 * 1000;

export function useWhoopSync() {
  useEffect(() => {
    const run = () => { void syncWhoop(); };
    run();
    const interval = setInterval(run, SYNC_INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') run(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', run);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', run);
    };
  }, []);
}
