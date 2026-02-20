import { useState, useRef, useEffect, useCallback } from 'react';

export interface UsePullRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  disabled?: boolean;
}

export interface PullRefreshState {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
}

export function usePullRefresh(
  ref: React.RefObject<HTMLElement | null>,
  options: UsePullRefreshOptions
): PullRefreshState {
  const { onRefresh, threshold = 80, disabled } = options;
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const pulling = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const el = ref.current;
    if (disabled || isRefreshing || !el || el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    pulling.current = false;
  }, [ref, disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const el = ref.current;
    if (disabled || isRefreshing || !el || el.scrollTop > 0) return;
    const distance = Math.max(0, e.touches[0].clientY - startY.current);
    if (distance > 0) {
      pulling.current = true;
      setIsPulling(true);
      setPullDistance(distance);
    }
  }, [ref, disabled, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    setIsPulling(false);
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(0);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, onRefresh]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd);
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [ref, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { isPulling, isRefreshing, pullDistance };
}
