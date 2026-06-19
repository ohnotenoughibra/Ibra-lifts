import type { ScheduledWorkout } from './types';

/**
 * Pure helpers for assigning a user's own workout (a SessionTemplate) to
 * weekdays. Rule: a weekday holds AT MOST ONE workout — assigning a different
 * workout to a day that's already taken replaces it, so "your plan" never shows
 * two of your workouts fighting for the same day.
 */

/** Toggle a template on/off a given weekday. */
export function toggleScheduledWorkout(
  list: ScheduledWorkout[],
  day: number,
  templateId: string,
): ScheduledWorkout[] {
  const here = list.find(s => s.day === day);
  if (here && here.templateId === templateId) {
    // Already this workout on this day → unschedule it.
    return list.filter(s => s.day !== day);
  }
  // Replace whatever was on that day (if anything) with this workout.
  return [...list.filter(s => s.day !== day), { day, templateId }].sort((a, b) => a.day - b.day);
}

/** The weekdays a given template is scheduled on. */
export function daysForTemplate(list: ScheduledWorkout[], templateId: string): number[] {
  return list.filter(s => s.templateId === templateId).map(s => s.day).sort((a, b) => a - b);
}

/** The template (if any) scheduled on a given weekday. */
export function templateForDay(list: ScheduledWorkout[], day: number): string | undefined {
  return list.find(s => s.day === day)?.templateId;
}

/** Drop any schedule entries pointing at templates that no longer exist. */
export function pruneScheduledWorkouts(
  list: ScheduledWorkout[],
  existingTemplateIds: Set<string>,
): ScheduledWorkout[] {
  return list.filter(s => existingTemplateIds.has(s.templateId));
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Short labels for a set of weekday indices, in week order. */
export function formatScheduledDays(days: number[]): string {
  return days.slice().sort((a, b) => a - b).map(d => WEEKDAY_LABELS[d]).join(' · ');
}
