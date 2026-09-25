'use client';

import { useEffect } from 'react';

/**
 * Keep the screen on while `active` (the live workout). The Screen Wake Lock
 * API releases the lock whenever the page is hidden, so it's re-requested on
 * return. Silently a no-op where unsupported (older iOS) or refused.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      if (document.visibilityState !== 'visible' || (sentinel && !sentinel.released)) return;
      try {
        const s = await navigator.wakeLock.request('screen');
        if (cancelled) { void s.release(); return; }
        sentinel = s;
      } catch { /* denied (battery saver, not focused) — nothing to do */ }
    };
    void acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', acquire);
      if (sentinel && !sentinel.released) void sentinel.release();
    };
  }, [active]);
}
