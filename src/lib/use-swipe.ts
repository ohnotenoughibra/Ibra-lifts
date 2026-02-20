import { useRef, useCallback } from 'react';

export interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

export interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeDown?: () => void;
  onSwipeUp?: () => void;
  threshold?: number;
  preventScroll?: boolean;
}

export function useSwipe(options: UseSwipeOptions): SwipeHandlers {
  const { onSwipeLeft, onSwipeRight, onSwipeDown, onSwipeUp, threshold = 50, preventScroll } = options;
  const startX = useRef(0);
  const startY = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!preventScroll) return;
    const deltaX = Math.abs(e.touches[0].clientX - startX.current);
    const deltaY = Math.abs(e.touches[0].clientY - startY.current);
    if (deltaX > deltaY) {
      e.preventDefault();
    }
  }, [preventScroll]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - startX.current;
    const deltaY = e.changedTouches[0].clientY - startY.current;
    const absDx = Math.abs(deltaX);
    const absDy = Math.abs(deltaY);

    if (absDx > threshold && absDx > absDy) {
      deltaX < 0 ? onSwipeLeft?.() : onSwipeRight?.();
    } else if (absDy > threshold && absDy > absDx) {
      deltaY < 0 ? onSwipeUp?.() : onSwipeDown?.();
    }
  }, [threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
