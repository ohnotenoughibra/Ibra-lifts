/**
 * A spent streak shield keeps bridging the gap in every later recalculation.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { calculateStreak } from '@/lib/gamification';

const at = (d: number) => ({ date: new Date(2026, 8, d, 12) } as any);

describe('streak shield bridging', () => {
  afterEach(() => vi.useRealTimers());
  it('the gap before a shielded day is forgiven; other gaps still break', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 8, 18, 18));
    const logs = [at(10), at(11), at(12), at(16), at(17), at(18)];
    expect(calculateStreak(logs)).toBe(3);
    expect(calculateStreak(logs, [], [], ['2026-09-16'])).toBe(6);
    expect(calculateStreak(logs, [], [], ['2026-09-17'])).toBe(3); // shield on a day with no gap before it changes nothing
    const older = [at(1), ...logs]; // 1 → 10 is a separate unshielded gap
    expect(calculateStreak(older, [], [], ['2026-09-16'])).toBe(6);
  });
});
