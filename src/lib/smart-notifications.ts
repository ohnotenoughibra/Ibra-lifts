/**
 * Smart Notifications Engine — Intelligent notification scheduling with habit stacking
 *
 * Generates context-aware notifications based on training state, nutrition adherence,
 * recovery data, and time of day. Uses habit stacking (Clear, 2018) to attach new
 * behaviors to existing routines.
 *
 * "After I [CURRENT HABIT], I will [NEW HABIT]"
 *   — James Clear, Atomic Habits (2018)
 *
 * Behavior science foundations:
 * - Clear 2018: Habit stacking leverages existing neural pathways for new habit formation
 * - Fogg 2019: Tiny Habits model — anchor new behaviors to existing routines
 * - Lally et al. 2010: Habit formation takes 18-254 days (median 66); consistency > intensity
 * - Judah et al. 2013: Implementation intentions ("when X, then Y") increase follow-through 2-3×
 * - Baumeister & Tierney 2012: Decision fatigue reduces compliance; automation helps
 *
 * Notification science:
 * - Mehrotra et al. 2016: Context-aware notifications have 3× engagement vs random timing
 * - Pielot et al. 2017: >5 daily notifications cause alert fatigue and opt-out
 * - Morrison et al. 2017: Adaptive notifications improve health behavior change by 40%
 *
 * All functions are pure — no side effects, no store, no React.
 * The actual notification dispatch happens in the sync hook / service worker.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export type NotificationTrigger =
  | 'post_workout'
  | 'post_combat'
  | 'morning'
  | 'evening'
  | 'streak_risk'
  | 'meal_gap'
  | 'hydration_gap'
  | 'rest_day'
  | 'pre_workout'
  | 'weekly_review'
  | 'milestone_near';

export type HabitStackType =
  | 'log_meal_after_workout'
  | 'mobility_after_combat'
  | 'hydrate_after_wakeup'
  | 'review_after_sunday'
  | 'supplement_with_meal'
  | 'soreness_check_morning';

export interface SmartNotification {
  id: string;
  trigger: NotificationTrigger;
  title: string;
  body: string;
  priority: 'low' | 'medium' | 'high';
  habitStack?: HabitStackType;
  scheduledFor?: string;   // ISO datetime
  expiresAt?: string;      // ISO datetime — auto-dismiss after this
  actionUrl?: string;      // Deep link within app (e.g., '/nutrition', '/workout')
  dismissed: boolean;
}

export interface NotificationSchedule {
  notifications: SmartNotification[];
  nextCheckAt: string;     // ISO datetime for next evaluation
}

export interface UserNotificationPreferences {
  quietHoursStart?: number;    // Hour (0-23), e.g., 22 for 10 PM
  quietHoursEnd?: number;      // Hour (0-23), e.g., 7 for 7 AM
  maxDailyNotifications?: number;
  sentToday: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Notification Generation
// ═══════════════════════════════════════════════════════════════════════════════

interface DailyNotificationParams {
  lastWorkoutAt?: string;      // ISO datetime of last completed workout
  lastMealAt?: string;         // ISO datetime of last logged meal
  lastWaterAt?: string;        // ISO datetime of last water log
  currentStreak: number;       // Current consecutive training day streak
  readinessScore?: number;     // 0-100 from wearable or self-reported
  isTrainingDay: boolean;      // Whether today is a scheduled training day
  isRestDay: boolean;          // Explicitly scheduled rest day
  upcomingCompetition?: { daysOut: number };
  hourOfDay: number;           // 0-23
  dayOfWeek: number;           // 0 = Sunday, 6 = Saturday
  // Optional context for richer notifications
  lastWorkoutType?: string;    // e.g., 'legs', 'push', 'bjj', 'sparring'
  milestonesNear?: { name: string; remaining: number }[];
  usualTrainingHour?: number;  // 0-23, user's typical training time
}

/**
 * Generate all applicable smart notifications for the current moment.
 *
 * Evaluates multiple triggers based on time-of-day, training state, and nutrition
 * adherence. Returns unsorted — use prioritizeNotifications() to rank and cap.
 *
 * Design principle: each notification must be actionable, not just informational.
 * "Log your meal" > "Don't forget to eat" (Fogg 2019: specific > vague).
 */
export function generateDailyNotifications(params: DailyNotificationParams): SmartNotification[] {
  const {
    lastWorkoutAt, lastMealAt, lastWaterAt,
    currentStreak, readinessScore,
    isTrainingDay, isRestDay,
    upcomingCompetition, hourOfDay, dayOfWeek,
    lastWorkoutType, milestonesNear, usualTrainingHour,
  } = params;

  const notifications: SmartNotification[] = [];
  const now = new Date();

  // ── Morning window (6-9 AM) ──
  if (hourOfDay >= 6 && hourOfDay < 9) {
    // Readiness check
    if (readinessScore !== undefined && readinessScore < 50) {
      notifications.push(makeNotification({
        trigger: 'morning',
        title: 'Low readiness detected',
        body: `Your readiness is ${readinessScore}/100. Consider a lighter session or active recovery today.`,
        priority: 'high',
        actionUrl: '/recovery',
      }));
    } else if (isTrainingDay) {
      notifications.push(makeNotification({
        trigger: 'morning',
        title: 'Training day',
        body: readinessScore
          ? `Readiness: ${readinessScore}/100. You're good to go.`
          : 'Check in with how you feel before training.',
        priority: 'low',
        actionUrl: '/workout',
      }));
    }

    // Hydration habit stack: "After waking up, drink water"
    notifications.push(makeNotification({
      trigger: 'morning',
      title: 'Hydrate first thing',
      body: 'Start with 500ml water before anything else. Your body is dehydrated from sleep.',
      priority: 'medium',
      habitStack: 'hydrate_after_wakeup',
      actionUrl: '/nutrition',
    }));

    // Morning soreness check habit stack
    if (lastWorkoutAt && hoursSince(lastWorkoutAt, now) < 36) {
      notifications.push(makeNotification({
        trigger: 'morning',
        title: 'Quick soreness check',
        body: 'Rate your soreness from yesterday\'s session. It takes 10 seconds and helps auto-adjust your next workout.',
        priority: 'low',
        habitStack: 'soreness_check_morning',
        actionUrl: '/recovery',
      }));
    }
  }

  // ── Pre-workout window (1 hour before usual training time) ──
  if (usualTrainingHour !== undefined && hourOfDay === usualTrainingHour - 1 && isTrainingDay) {
    notifications.push(makeNotification({
      trigger: 'pre_workout',
      title: 'Fuel up before training',
      body: 'Eat a meal with carbs + moderate protein 60-90min before training. ~1g/kg carbs for optimal performance.',
      priority: 'medium',
      actionUrl: '/nutrition',
    }));
  }

  // ── Post-workout ──
  if (lastWorkoutAt && hoursSince(lastWorkoutAt, now) < 2 && hoursSince(lastWorkoutAt, now) > 0.1) {
    const isCombat = lastWorkoutType &&
      ['bjj', 'sparring', 'wrestling', 'muay_thai', 'boxing', 'mma', 'judo'].includes(
        lastWorkoutType.toLowerCase()
      );

    if (isCombat) {
      // Post-combat: mobility prompt
      notifications.push(makeNotification({
        trigger: 'post_combat',
        title: 'Post-rolling mobility',
        body: 'Spend 10min on hip and shoulder mobility. Combat sports compress joints — open them back up now.',
        priority: 'medium',
        habitStack: 'mobility_after_combat',
        actionUrl: '/recovery',
      }));
    }

    // Post-workout meal logging
    const muscleGroup = lastWorkoutType || 'your session';
    notifications.push(makeNotification({
      trigger: 'post_workout',
      title: 'Log post-workout meal',
      body: `You just finished ${muscleGroup}. Log your post-workout meal — aim for 0.4g/kg protein within 2 hours (Schoenfeld & Aragon, 2018).`,
      priority: 'high',
      habitStack: 'log_meal_after_workout',
      actionUrl: '/nutrition',
    }));
  }

  // ── Meal gap detection ──
  if (lastMealAt && isTrainingDay) {
    const mealGapHours = hoursSince(lastMealAt, now);
    // >4 hours without eating on a training day = potential under-fueling
    if (mealGapHours > 4 && hourOfDay >= 10 && hourOfDay <= 20) {
      notifications.push(makeNotification({
        trigger: 'meal_gap',
        title: 'Time to eat',
        body: `It's been ${Math.round(mealGapHours)} hours since your last meal. Consistent fueling supports training quality.`,
        priority: 'medium',
        actionUrl: '/nutrition',
      }));
    }
  }

  // ── Hydration gap ──
  if (lastWaterAt) {
    const waterGapHours = hoursSince(lastWaterAt, now);
    if (waterGapHours > 2 && hourOfDay >= 8 && hourOfDay <= 21) {
      notifications.push(makeNotification({
        trigger: 'hydration_gap',
        title: 'Drink water',
        body: `${Math.round(waterGapHours)} hours since your last water log. Even 2% dehydration reduces performance (Cheuvront & Kenefick, 2014).`,
        priority: 'low',
        actionUrl: '/nutrition',
      }));
    }
  }

  // ── Streak risk ──
  // If streak > 7 and no workout logged by 6 PM, high-priority reminder
  if (currentStreak > 7 && !lastWorkoutAt && hourOfDay >= 18 && hourOfDay <= 21) {
    notifications.push(makeNotification({
      trigger: 'streak_risk',
      title: `${currentStreak}-day streak at risk!`,
      body: 'No workout logged today. Even 15 minutes counts — don\'t let the streak break.',
      priority: 'high',
      actionUrl: '/workout',
    }));
  } else if (currentStreak >= 3 && !lastWorkoutAt && hourOfDay >= 20) {
    notifications.push(makeNotification({
      trigger: 'streak_risk',
      title: 'Keep your streak alive',
      body: `${currentStreak} days strong. Log something today to keep it going.`,
      priority: 'medium',
      actionUrl: '/workout',
    }));
  }

  // ── Rest day ──
  if (isRestDay && hourOfDay >= 10 && hourOfDay < 14) {
    notifications.push(makeNotification({
      trigger: 'rest_day',
      title: 'Active recovery day',
      body: 'Rest days build muscle. Light mobility, walking, or foam rolling — don\'t just sit. Recovery is training.',
      priority: 'low',
      actionUrl: '/recovery',
    }));
  }

  // ── Evening (8-10 PM) ──
  if (hourOfDay >= 20 && hourOfDay < 22) {
    // Sleep prep
    notifications.push(makeNotification({
      trigger: 'evening',
      title: 'Wind down for sleep',
      body: 'Dim screens, lower room temp to 18-19°C. Sleep is the #1 recovery tool (Walker, 2017).',
      priority: 'low',
    }));

    // Supplement reminder with evening meal
    if (lastMealAt && hoursSince(lastMealAt, now) < 2) {
      notifications.push(makeNotification({
        trigger: 'evening',
        title: 'Evening supplements',
        body: 'Take magnesium and ZMA with your last meal for sleep quality support.',
        priority: 'low',
        habitStack: 'supplement_with_meal',
      }));
    }
  }

  // ── Weekly review (Sunday evening) ──
  if (dayOfWeek === 0 && hourOfDay >= 18 && hourOfDay < 21) {
    notifications.push(makeNotification({
      trigger: 'weekly_review',
      title: 'Weekly review time',
      body: 'Review your week: training volume, nutrition adherence, and recovery trends. 5 minutes of reflection improves next week\'s execution.',
      priority: 'medium',
      habitStack: 'review_after_sunday',
      actionUrl: '/progress',
    }));
  }

  // ── Milestone proximity ──
  if (milestonesNear && milestonesNear.length > 0) {
    // Pick the closest milestone
    const closest = milestonesNear.reduce((a, b) => a.remaining < b.remaining ? a : b);
    if (closest.remaining <= 3) {
      notifications.push(makeNotification({
        trigger: 'milestone_near',
        title: `Almost there: ${closest.name}`,
        body: `${closest.remaining} more to unlock "${closest.name}". Keep pushing.`,
        priority: 'medium',
        actionUrl: '/achievements',
      }));
    }
  }

  // ── Competition proximity ──
  if (upcomingCompetition && upcomingCompetition.daysOut <= 14) {
    const d = upcomingCompetition.daysOut;
    if (hourOfDay >= 8 && hourOfDay < 10) {
      notifications.push(makeNotification({
        trigger: 'morning',
        title: `${d} day${d === 1 ? '' : 's'} to competition`,
        body: d <= 3
          ? 'Taper phase — reduce volume, maintain intensity. Focus on sleep and weight management.'
          : d <= 7
            ? 'Fight week. Sharpen skills, don\'t chase new PRs. Nutrition discipline is everything now.'
            : `${d} days out. Stay the course with your camp plan.`,
        priority: d <= 3 ? 'high' : 'medium',
        actionUrl: '/workout',
      }));
    }
  }

  return notifications;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Habit Stack Messages
// ═══════════════════════════════════════════════════════════════════════════════

const HABIT_STACK_MESSAGES: Record<HabitStackType, { title: string; body: string }> = {
  log_meal_after_workout: {
    title: 'After training → Log your meal',
    body: 'You always train. Now always log. The habit stack: finish set → open nutrition tab → log what you eat next.',
  },
  mobility_after_combat: {
    title: 'After rolling → Mobilize',
    body: 'Every combat session ends with 10 minutes of hip openers and thoracic spine work. Non-negotiable for longevity.',
  },
  hydrate_after_wakeup: {
    title: 'After waking → Drink 500ml',
    body: 'Keep water on your nightstand. Eyes open → drink. You lose ~1L of water during sleep through respiration.',
  },
  review_after_sunday: {
    title: 'After Sunday dinner → Weekly review',
    body: '5-minute review: What went well? What needs adjusting? This metacognition compounds over months.',
  },
  supplement_with_meal: {
    title: 'With your meal → Take supplements',
    body: 'Pair supplements with meals for absorption and consistency. Fat-soluble vitamins (D, K) need dietary fat.',
  },
  soreness_check_morning: {
    title: 'After waking → Rate soreness',
    body: 'Before your feet hit the floor, rate yesterday\'s soreness 1-5. Takes 5 seconds, powers your auto-regulation.',
  },
};

/**
 * Get the habit stack educational message for a given stack type.
 * These are longer-form messages meant for onboarding or "why this notification?" prompts.
 */
export function getHabitStackMessage(stack: HabitStackType): { title: string; body: string } {
  return HABIT_STACK_MESSAGES[stack];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Notification Filtering & Prioritization
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determine whether a notification should be sent based on user preferences.
 *
 * Respects:
 * - Quiet hours (default 10 PM - 7 AM)
 * - Daily notification cap (default 5 per Pielot et al. 2017)
 * - Expiry time
 * - Already-dismissed state
 */
export function shouldSendNotification(
  notification: SmartNotification,
  userPreferences: UserNotificationPreferences,
): boolean {
  // Already dismissed
  if (notification.dismissed) return false;

  // Expired
  if (notification.expiresAt && new Date(notification.expiresAt).getTime() < Date.now()) {
    return false;
  }

  // Daily cap — default 5 (Pielot et al. 2017: >5 causes alert fatigue)
  const maxDaily = userPreferences.maxDailyNotifications ?? MAX_DAILY_NOTIFICATIONS;
  if (userPreferences.sentToday >= maxDaily) {
    // Exception: high-priority notifications can exceed cap by 1
    if (notification.priority !== 'high') return false;
    if (userPreferences.sentToday >= maxDaily + 1) return false;
  }

  // Quiet hours
  const quietStart = userPreferences.quietHoursStart ?? DEFAULT_QUIET_START;
  const quietEnd = userPreferences.quietHoursEnd ?? DEFAULT_QUIET_END;
  const currentHour = new Date().getHours();

  if (isInQuietHours(currentHour, quietStart, quietEnd)) {
    // High-priority notifications can break quiet hours only for streak risk
    if (notification.trigger !== 'streak_risk' || notification.priority !== 'high') {
      return false;
    }
  }

  return true;
}

/**
 * Prioritize and deduplicate notifications, returning the top N.
 *
 * Sorting:
 * 1. Priority (high > medium > low)
 * 2. Trigger relevance (time-sensitive > informational)
 * 3. Deduplication: only one notification per trigger type
 */
export function prioritizeNotifications(
  notifications: SmartNotification[],
  maxCount: number,
): SmartNotification[] {
  // Deduplicate: keep highest-priority notification per trigger
  const byTrigger = new Map<NotificationTrigger, SmartNotification>();
  for (const n of notifications) {
    const existing = byTrigger.get(n.trigger);
    if (!existing || PRIORITY_RANK[n.priority] > PRIORITY_RANK[existing.priority]) {
      byTrigger.set(n.trigger, n);
    }
  }

  const deduplicated = Array.from(byTrigger.values());

  // Sort by priority descending, then by trigger relevance
  deduplicated.sort((a, b) => {
    const priorityDiff = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return TRIGGER_RELEVANCE[b.trigger] - TRIGGER_RELEVANCE[a.trigger];
  });

  return deduplicated.slice(0, Math.max(0, maxCount));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

/** Default max daily notifications per Pielot et al. 2017 research. */
const MAX_DAILY_NOTIFICATIONS = 5;

/** Default quiet hours: 10 PM - 7 AM. */
const DEFAULT_QUIET_START = 22;
const DEFAULT_QUIET_END = 7;

/** Priority numeric ranks for sorting. */
const PRIORITY_RANK: Record<SmartNotification['priority'], number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/** Trigger relevance for secondary sort — time-sensitive triggers rank higher. */
const TRIGGER_RELEVANCE: Record<NotificationTrigger, number> = {
  streak_risk: 10,
  meal_gap: 9,
  post_workout: 8,
  post_combat: 8,
  pre_workout: 7,
  milestone_near: 6,
  hydration_gap: 5,
  morning: 4,
  weekly_review: 3,
  evening: 2,
  rest_day: 1,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Internal Helpers
// ═══════════════════════════════════════════════════════════════════════════════

let notificationCounter = 0;

/** Create a SmartNotification with a unique ID and sensible defaults. */
function makeNotification(params: {
  trigger: NotificationTrigger;
  title: string;
  body: string;
  priority: SmartNotification['priority'];
  habitStack?: HabitStackType;
  actionUrl?: string;
}): SmartNotification {
  notificationCounter++;
  return {
    id: `sn_${Date.now()}_${notificationCounter}`,
    trigger: params.trigger,
    title: params.title,
    body: params.body,
    priority: params.priority,
    habitStack: params.habitStack,
    actionUrl: params.actionUrl,
    // Notifications expire after 4 hours by default
    expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    dismissed: false,
  };
}

/** Calculate hours elapsed since a given ISO datetime. */
function hoursSince(isoDatetime: string, now: Date): number {
  const then = new Date(isoDatetime).getTime();
  if (isNaN(then)) return Infinity;
  return (now.getTime() - then) / (1000 * 60 * 60);
}

/** Check if a given hour falls within quiet hours (handles overnight wrap). */
function isInQuietHours(hour: number, start: number, end: number): boolean {
  if (start <= end) {
    // Same-day range: e.g., 1 AM to 6 AM
    return hour >= start && hour < end;
  }
  // Overnight wrap: e.g., 22 (10 PM) to 7 (7 AM)
  return hour >= start || hour < end;
}
