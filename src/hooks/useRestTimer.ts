import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Extracted rest timer hook — manages countdown, haptic feedback,
 * push notifications, and auto-complete for between-set rest periods.
 *
 * Timestamp-based so it keeps counting while the app is backgrounded.
 */
export function useRestTimer(onComplete?: () => void) {
  const [isResting, setIsResting] = useState(false);
  const [restMinimized, setRestMinimized] = useState(false);
  const [restEndTime, setRestEndTime] = useState<number | null>(null);
  const [restDuration, setRestDuration] = useState(0);
  const warned10sRef = useRef(false);

  // Derived: seconds remaining
  const restTimer = restEndTime ? Math.max(0, Math.ceil((restEndTime - Date.now()) / 1000)) : 0;

  // Start a rest period
  const startRest = useCallback((durationSeconds: number) => {
    setRestEndTime(Date.now() + durationSeconds * 1000);
    setRestDuration(durationSeconds);
    setIsResting(true);
    setRestMinimized(false);
  }, []);

  // Cancel rest early
  const cancelRest = useCallback(() => {
    setIsResting(false);
    setRestEndTime(null);
  }, []);

  // Countdown effect with haptic + notification.
  // Timestamp-derived; on iOS PWA backgrounding the interval throttles or pauses,
  // so we also reconcile via a visibilitychange listener that fires an immediate tick.
  useEffect(() => {
    if (!isResting || !restEndTime) return;
    warned10sRef.current = false;

    const tick = () => {
      const remaining = Math.ceil((restEndTime - Date.now()) / 1000);

      if (remaining <= 10 && remaining > 0 && !warned10sRef.current) {
        warned10sRef.current = true;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
          new Notification('Rest almost done!', {
            body: '10 seconds left — get ready for your next set',
            tag: 'rest-warning',
            silent: false,
          });
        }
      }

      if (remaining <= 0) {
        setIsResting(false);
        setRestEndTime(null);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([200, 100, 200, 100, 300]);
        }
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
          new Notification('Rest complete!', {
            body: 'Time to lift — next set is ready',
            tag: 'rest-complete',
            silent: false,
          });
        }
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
  }, [isResting, restEndTime, onComplete]);

  return {
    isResting,
    restMinimized,
    setRestMinimized,
    restTimer,
    restDuration,
    startRest,
    cancelRest,
    setIsResting,
  };
}
