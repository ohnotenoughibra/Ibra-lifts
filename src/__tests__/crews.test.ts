import { describe, it, expect } from 'vitest';
import { clampInt, normalizeJoinCode, generateJoinCode } from '@/lib/crews-db';
import { computeCrewMetrics } from '@/lib/crews-client';
import type { WorkoutLog, TrainingSession, GamificationStats, UserProfile } from '@/lib/types';

describe('crews-db helpers', () => {
  it('clampInt bounds values and rejects junk → min', () => {
    expect(clampInt(5, 0, 21)).toBe(5);
    expect(clampInt(99, 0, 21)).toBe(21);
    expect(clampInt(-3, 0, 21)).toBe(0);
    expect(clampInt('not-a-number', 0, 21)).toBe(0);
    expect(clampInt(3.7, 0, 21)).toBe(4); // rounds
  });

  it('normalizeJoinCode uppercases, strips non-alphanumerics, caps at 6', () => {
    expect(normalizeJoinCode(' ab-cd ef ')).toBe('ABCDEF');
    expect(normalizeJoinCode('abcdefghij')).toBe('ABCDEF');
    expect(normalizeJoinCode(null)).toBe('');
  });

  it('generateJoinCode is 6 chars from the unambiguous alphabet (no 0/O/1/I/L)', () => {
    for (let i = 0; i < 50; i++) {
      const c = generateJoinCode();
      expect(c).toHaveLength(6);
      expect(c).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
    }
  });
});

describe('computeCrewMetrics', () => {
  const stats = { currentStreak: 4, totalPoints: 1234 } as GamificationStats;
  const user = { name: 'Ibra' } as UserProfile;
  const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);

  it('counts lifting + training sessions from the current local week only', () => {
    // localMondayKey is "this Monday". A session 10 days ago is always prior week;
    // sessions "now" and "yesterday-ish within the week" should count. To stay
    // deterministic regardless of which weekday the test runs, only assert the
    // far-past one is excluded and a same-instant one is included.
    const workoutLogs = [
      { date: new Date(), _deleted: false },
      { date: daysAgo(10), _deleted: false },
    ] as unknown as WorkoutLog[];
    const trainingSessions = [
      { date: new Date(), _deleted: false },
      { date: daysAgo(20), _deleted: false },
    ] as unknown as TrainingSession[];

    const m = computeCrewMetrics({ user, workoutLogs, trainingSessions, gamificationStats: stats });
    expect(m.displayName).toBe('Ibra');
    expect(m.currentStreak).toBe(4);
    expect(m.totalPoints).toBe(1234);
    // The two "now" entries are in this week; the 10-/20-day-old ones are not.
    expect(m.sessionsThisWeek).toBe(2);
  });

  it('ignores soft-deleted entries', () => {
    const workoutLogs = [
      { date: new Date(), _deleted: true },
      { date: new Date(), _deleted: false },
    ] as unknown as WorkoutLog[];
    const m = computeCrewMetrics({ user, workoutLogs, trainingSessions: [], gamificationStats: stats });
    expect(m.sessionsThisWeek).toBe(1);
  });

  it('falls back to "Athlete" when no profile name', () => {
    const m = computeCrewMetrics({ user: null, workoutLogs: [], trainingSessions: [], gamificationStats: stats });
    expect(m.displayName).toBe('Athlete');
    expect(m.sessionsThisWeek).toBe(0);
  });
});
