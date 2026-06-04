import { describe, it, expect } from 'vitest';
import { safeDayKey, isValidDate } from '@/lib/utils';

describe('safeDayKey / isValidDate', () => {
  it('returns a YYYY-MM-DD key for valid dates', () => {
    expect(safeDayKey('2026-06-04T12:00:00')).toBe('2026-06-04');
    expect(safeDayKey(new Date('2026-06-04T12:00:00Z'))).toBe('2026-06-04');
  });

  it('returns null for invalid / missing dates instead of throwing', () => {
    expect(safeDayKey(undefined)).toBeNull();
    expect(safeDayKey(null)).toBeNull();
    expect(safeDayKey('')).toBeNull();
    expect(safeDayKey('not-a-date')).toBeNull();
    // The exact crash that tripped the error boundary: an Invalid Date.
    expect(safeDayKey('2026-06-04Tundefined')).toBeNull();
    expect(() => safeDayKey('garbage')).not.toThrow();
  });

  it('isValidDate matches', () => {
    expect(isValidDate('2026-06-04')).toBe(true);
    expect(isValidDate(undefined)).toBe(false);
    expect(isValidDate('nope')).toBe(false);
  });
});
