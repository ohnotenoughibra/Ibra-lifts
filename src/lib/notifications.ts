import { toLocalDateStr } from './utils';
// ── Push Notification Utilities ────────────────────────────────────────────
// Client-side notification management: permission, scheduling, local alerts

/**
 * Request notification permission from the user.
 * Returns the resulting permission state.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

/**
 * Check if notifications are supported and permitted.
 */
export function canNotify(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

/**
 * Show a local notification (no server push needed).
 */
export function showLocalNotification(
  title: string,
  body: string,
  options?: { tag?: string; data?: Record<string, unknown> }
) {
  if (!canNotify()) return;

  // Use service worker registration if available (works in background)
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: options?.tag || 'default',
        data: { url: '/', ...options?.data },
      } as NotificationOptions);
    });
  } else {
    // Fallback to Notification API (foreground only)
    new Notification(title, { body, icon: '/icon-192.png', tag: options?.tag });
  }
}

// ── Notification Content Templates ─────────────────────────────────────────

export function getStreakReminderNotification(streak: number) {
  return {
    title: `${streak}-day streak at risk!`,
    body: "Don't lose your streak — even a quick session counts.",
    tag: 'streak-reminder',
  };
}

export function getTrainingReminderNotification(sessionName?: string) {
  return {
    title: 'Time to train!',
    body: sessionName ? `${sessionName} is scheduled today.` : 'Your workout is waiting.',
    tag: 'training-reminder',
  };
}

export function getDailyLoginNotification(day: number) {
  const xp = getLoginBonusXP(day);
  return {
    title: 'Daily bonus waiting!',
    body: `Open the app to claim your day-${day} bonus (${xp} XP${day === 7 ? ' + mystery reward!' : ''}).`,
    tag: 'daily-login',
  };
}

export function getChallengeCompleteNotification() {
  return {
    title: 'Weekly challenge complete!',
    body: 'You crushed all 3 goals this week. Bonus XP awarded!',
    tag: 'challenge-complete',
  };
}

// ── Daily Login Bonus XP Schedule ──────────────────────────────────────────
// Escalating XP: 10, 15, 20, 25, 30, 40, 50 over 7 consecutive days

const LOGIN_BONUS_SCHEDULE = [10, 15, 20, 25, 30, 40, 50] as const;

export function getLoginBonusXP(consecutiveDay: number): number {
  const idx = Math.min(Math.max(consecutiveDay, 1), 7) - 1;
  return LOGIN_BONUS_SCHEDULE[idx];
}

/**
 * Check whether the user should get a daily login bonus today.
 * Returns null if already claimed, or the bonus details.
 */
export function checkDailyLoginBonus(
  lastClaimedDate: string | null,
  consecutiveDays: number
): { points: number; day: number; isMysteryDay: boolean } | null {
  const today = toLocalDateStr();

  // Already claimed today
  if (lastClaimedDate === today) return null;

  // Determine consecutive day
  let newConsecutive: number;
  if (!lastClaimedDate) {
    newConsecutive = 1;
  } else {
    const lastDate = new Date(lastClaimedDate);
    const todayDate = new Date(today);
    const diffMs = todayDate.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Consecutive day
      newConsecutive = consecutiveDays >= 7 ? 1 : consecutiveDays + 1;
    } else {
      // Gap — reset streak
      newConsecutive = 1;
    }
  }

  const points = getLoginBonusXP(newConsecutive);
  return {
    points,
    day: newConsecutive,
    isMysteryDay: newConsecutive === 7,
  };
}

// ── Scheduled Notification Helpers ─────────────────────────────────────────

let streakReminderTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Schedule a streak-at-risk notification for later today (e.g. 8 PM).
 * Call this on app open if the user has a streak but hasn't trained today.
 */
export function scheduleStreakReminder(streak: number, reminderHour = 20) {
  if (!canNotify() || streak <= 0) return;

  // Clear existing
  if (streakReminderTimeout) clearTimeout(streakReminderTimeout);

  const now = new Date();
  const target = new Date();
  target.setHours(reminderHour, 0, 0, 0);

  if (target.getTime() <= now.getTime()) return; // Already past reminder time

  const delay = target.getTime() - now.getTime();
  streakReminderTimeout = setTimeout(() => {
    const { title, body, tag } = getStreakReminderNotification(streak);
    showLocalNotification(title, body, { tag });
  }, delay);
}

/**
 * Schedule a training reminder for a specific time today.
 */
export function scheduleTrainingReminder(timeStr: string, sessionName?: string) {
  if (!canNotify()) return;

  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);

  if (target.getTime() <= now.getTime()) return;

  const delay = target.getTime() - now.getTime();
  setTimeout(() => {
    const { title, body, tag } = getTrainingReminderNotification(sessionName);
    showLocalNotification(title, body, { tag });
  }, delay);
}
