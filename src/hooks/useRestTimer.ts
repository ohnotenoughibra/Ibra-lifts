import { useState, useEffect, useRef, useCallback } from 'react';
import { usePersistentState } from '@/lib/use-persistent-state';

/**
 * Rest timer — countdown, haptics, notifications, auto-complete.
 *
 * - Timestamp-based: keeps counting while the app is backgrounded.
 * - Persisted: the end time survives "Pause & Browse", a reload or an iOS
 *   PWA resume (it used to live in component state and vanish).
 * - Notifications go through the service worker when available —
 *   `new Notification()` from page code throws on Android Chrome and does
 *   nothing from a frozen iOS page.
 */
async function notify(title: string, body: string, tag: string) {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    if (!document.hidden) return;
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg?.showNotification) {
      await reg.showNotification(title, { body, tag, silent: false, renotify: true } as NotificationOptions);
      return;
    }
    new Notification(title, { body, tag, silent: false });
  } catch { /* best effort */ }
}

export function useRestTimer(onComplete?: () => void) {
  const [rest, setRest] = usePersistentState<{ end: number; dur: number } | null>('live:rest', null, { ttlMs: 60 * 60 * 1000 });
  const [restMinimized, setRestMinimized] = useState(false);
  const [, force] = useState(0);
  const warned10sRef = useRef(false);

  const restEndTime = rest && rest.end > Date.now() ? rest.end : null;
  const isResting = !!restEndTime;
  const restDuration = rest?.dur ?? 0;
  const restTimer = restEndTime ? Math.max(0, Math.ceil((restEndTime - Date.now()) / 1000)) : 0;

  // A persisted rest that already expired (you were away) — drop it quietly.
  useEffect(() => {
    if (rest && rest.end <= Date.now()) setRest(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startRest = useCallback((durationSeconds: number) => {
    setRest({ end: Date.now() + durationSeconds * 1000, dur: durationSeconds });
    setRestMinimized(false);
  }, [setRest]);

  const cancelRest = useCallback(() => setRest(null), [setRest]);

  /** Kept for existing callers: false ends the rest. */
  const setIsResting = useCallback((v: boolean) => { if (!v) setRest(null); }, [setRest]);

  /** Adjust the running rest by ±seconds (never below 0). */
  const adjustRest = useCallback((deltaSeconds: number) => {
    setRest(r => (r ? { end: Math.max(Date.now(), r.end + deltaSeconds * 1000), dur: Math.max(0, r.dur + deltaSeconds) } : r));
  }, [setRest]);

  useEffect(() => {
    if (!restEndTime) return;
    warned10sRef.current = false;
    const tick = () => {
      const remaining = Math.ceil((restEndTime - Date.now()) / 1000);
      force(n => n + 1);
      if (remaining <= 10 && remaining > 0 && !warned10sRef.current) {
        warned10sRef.current = true;
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([100, 50, 100]);
        void notify('Rest almost done', '10 seconds — get ready for your next set', 'rest-warning');
      }
      if (remaining <= 0) {
        setRest(null);
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 300]);
        void notify('Rest complete', 'Time to lift — next set is ready', 'rest-complete');
        onComplete?.();
      }
    };
    const interval = setInterval(tick, 500);
    const onVisible = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [restEndTime, onComplete, setRest]);

  return {
    isResting,
    restMinimized,
    setRestMinimized,
    restTimer,
    restDuration,
    startRest,
    cancelRest,
    setIsResting,
    adjustRest,
  };
}
