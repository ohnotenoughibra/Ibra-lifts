/**
 * scroll-lock — reference-counted iOS-correct body scroll lock.
 *
 * Plain `overflow: hidden` on body resets scroll position on iOS Safari
 * (visible page jumps to top when you close the overlay). Canonical fix:
 * snapshot scrollY, fix the body at top:-scrollY, restore on close.
 *
 * The reference count means nested overlays don't fight each other —
 * Open A → Open B → Close B → page stays locked because A is still up.
 * Only when the count returns to zero do we unlock and restore scroll.
 *
 * Use via `useScrollLock(active: boolean)` hook.
 */

let lockCount = 0;
let savedScrollY = 0;

function acquire() {
  lockCount += 1;
  if (lockCount > 1) return;
  // First lock — snapshot and fix.
  savedScrollY = window.scrollY;
  const body = document.body;
  body.style.position = 'fixed';
  body.style.top = `-${savedScrollY}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';
}

function release() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0) return;
  // Last lock released — unfix and restore scroll.
  const body = document.body;
  body.style.position = '';
  body.style.top = '';
  body.style.left = '';
  body.style.right = '';
  body.style.width = '';
  // Defer to next frame so layout settles before scroll restoration
  const y = savedScrollY;
  requestAnimationFrame(() => window.scrollTo(0, y));
}

import { useEffect } from 'react';

/**
 * Lock body scroll while `active` is true. Multiple components can call
 * this concurrently — the body unlocks only when every caller releases.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    acquire();
    return release;
  }, [active]);
}
