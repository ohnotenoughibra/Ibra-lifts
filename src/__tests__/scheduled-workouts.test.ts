import { describe, it, expect } from 'vitest';
import {
  toggleScheduledWorkout,
  daysForTemplate,
  templateForDay,
  pruneScheduledWorkouts,
  formatScheduledDays,
} from '@/lib/scheduled-workouts';

describe('scheduled workouts', () => {
  it('assigns a workout to a day', () => {
    const next = toggleScheduledWorkout([], 1, 'a');
    expect(next).toEqual([{ day: 1, templateId: 'a' }]);
  });

  it('toggles the same workout off its day', () => {
    const next = toggleScheduledWorkout([{ day: 1, templateId: 'a' }], 1, 'a');
    expect(next).toEqual([]);
  });

  it('replaces another workout already on that day (one workout per day)', () => {
    const next = toggleScheduledWorkout([{ day: 1, templateId: 'a' }], 1, 'b');
    expect(next).toEqual([{ day: 1, templateId: 'b' }]);
  });

  it('keeps entries sorted by day', () => {
    let list = toggleScheduledWorkout([], 5, 'a');
    list = toggleScheduledWorkout(list, 1, 'a');
    list = toggleScheduledWorkout(list, 3, 'a');
    expect(list.map(s => s.day)).toEqual([1, 3, 5]);
  });

  it('daysForTemplate + templateForDay read back correctly', () => {
    const list = [{ day: 1, templateId: 'a' }, { day: 3, templateId: 'a' }, { day: 5, templateId: 'b' }];
    expect(daysForTemplate(list, 'a')).toEqual([1, 3]);
    expect(daysForTemplate(list, 'b')).toEqual([5]);
    expect(templateForDay(list, 3)).toBe('a');
    expect(templateForDay(list, 2)).toBeUndefined();
  });

  it('prunes schedules whose template was deleted', () => {
    const list = [{ day: 1, templateId: 'a' }, { day: 2, templateId: 'gone' }];
    expect(pruneScheduledWorkouts(list, new Set(['a']))).toEqual([{ day: 1, templateId: 'a' }]);
  });

  it('formats day labels in week order', () => {
    expect(formatScheduledDays([5, 1, 3])).toBe('Mon · Wed · Fri');
  });
});
