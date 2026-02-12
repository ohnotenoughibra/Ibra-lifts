/**
 * Haptic feedback utilities for mobile PWA.
 * Uses the Vibration API when available, no-ops silently otherwise.
 */

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Silently fail — some browsers block vibrate() without user gesture
    }
  }
}

/** Soft tap — used for tab switches, toggles, selections */
export function hapticLight() {
  vibrate(6);
}

/** Medium tap — used for confirming actions, starting workouts */
export function hapticMedium() {
  vibrate(12);
}

/** Strong tap — used for destructive confirmations, errors */
export function hapticHeavy() {
  vibrate([15, 30, 15]);
}

/** Success pattern — used for completed actions */
export function hapticSuccess() {
  vibrate([8, 50, 8]);
}
