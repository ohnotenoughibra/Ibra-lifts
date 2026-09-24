'use client';

import { useCallback, useRef } from 'react';

/**
 * Long-press (hold) for touch + mouse. Returns handlers to spread on a button
 * plus `wasLongPress()` so the following click can be ignored. Cancels if the
 * finger moves (scrolling) or lifts early. Also maps right-click / iOS
 * context-menu to the same action.
 */
export function useLongPress(onLongPress: () => void, ms = 450) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  const clear = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    fired.current = false;
    start.current = { x: e.clientX, y: e.clientY };
    clear();
    timer.current = setTimeout(() => {
      fired.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
      onLongPress();
    }, ms);
  }, [onLongPress, ms]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!start.current) return;
    if (Math.abs(e.clientX - start.current.x) > 10 || Math.abs(e.clientY - start.current.y) > 10) clear();
  }, []);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!fired.current) { fired.current = true; onLongPress(); }
  }, [onLongPress]);

  return {
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: clear,
      onPointerLeave: clear,
      onPointerCancel: clear,
      onContextMenu,
      style: { WebkitTouchCallout: 'none', userSelect: 'none' } as React.CSSProperties,
    },
    /** True if the gesture that just ended was a long-press — skip the click. */
    wasLongPress: () => { const f = fired.current; fired.current = false; return f; },
  };
}
