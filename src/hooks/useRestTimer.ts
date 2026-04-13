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

  // Countdown effect with haptic + notification
  useEffect(() => {
    if (!isResting || !restEndTime) return;
    warned10sRef.current = false;

    const interval = setInterval(() => {
      const remaining = Math.ceil((restEndTime - Date.now()) / 1000);

      // 10-second warning
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

      // Rest complete
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
    }, 500);

    return () => clearInterval(interval);
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
