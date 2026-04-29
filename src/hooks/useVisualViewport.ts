'use client';

/**
 * useVisualViewport — tracks the iOS keyboard height and writes it to the
 * --kb-offset CSS variable on the document root.
 *
 * Sticky footers, fixed CTAs, and toasts that use `padding-bottom:
 * var(--kb-offset)` (or class `sticky-footer-kb`) will rise above the
 * keyboard automatically.
 *
 * Mount this once at the app root.
 */

import { useEffect } from 'react';

export function useVisualViewport() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty('--kb-offset', `${offset}px`);
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      document.documentElement.style.setProperty('--kb-offset', '0px');
    };
  }, []);
}
