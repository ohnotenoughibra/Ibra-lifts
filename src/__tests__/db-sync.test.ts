import { describe, it, expect } from 'vitest';
import { resolveConflicts, normalizeWorkoutLogs } from '@/lib/db-sync';

// Helper to create minimal valid data objects
function makeData(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { lastSyncAt: Date.now(), ...overrides };
}

// ─── Array union merge ─────────────────────────────────────────────────────

describe('resolveConflicts — array union merge', () => {
  it('merges workoutLogs by id, keeping entries from both sides', () => {
    const local = makeData({
      workoutLogs: [
        { id: 'w1', date: '2026-01-01', exercises: [] },
        { id: 'w2', date: '2026-01-03', exercises: [] },
      ],
    });
    const remote = makeData({
      workoutLogs: [
        { id: 'w1', date: '2026-01-01', exercises: [] },
        { id: 'w3', date: '2026-01-05', exercises: [] },
      ],
    });

    const result = resolveConflicts(local, remote);
    const logs = result.workoutLogs as Array<Record<string, unknown>>;
    expect(logs).toHaveLength(3);
    expect(logs.map(l => l.id).sort()).toEqual(['w1', 'w2', 'w3']);
  });

  it('merges meals by id without duplicates', () => {
    const local = makeData({
      meals: [
        { id: 'm1', name: 'Breakfast' },
        { id: 'm2', name: 'Lunch' },
      ],
    });
    const remote = makeData({
      meals: [
        { id: 'm2', name: 'Lunch' },
        { id: 'm3', name: 'Dinner' },
      ],
    });

    const result = resolveConflicts(local, remote);
    const meals = result.meals as Array<Record<string, unknown>>;
    expect(meals).toHaveLength(3);
  });

  it('handles primitive arrays (string[]) with set union', () => {
    const local = makeData({
      seenInsights: ['insight-1', 'insight-2', 'insight-3'],
    });
    const remote = makeData({
      seenInsights: ['insight-2', 'insight-4'],
    });

    const result = resolveConflicts(local, remote);
    const seen = result.seenInsights as string[];
    expect(seen).toHaveLength(4);
    expect(new Set(seen)).toEqual(new Set(['insight-1', 'insight-2', 'insight-3', 'insight-4']));
  });

  it('prefers the newer entry when same id exists on both sides', () => {
    const local = makeData({
      workoutLogs: [
        { id: 'w1', date: '2026-01-01', updatedAt: '2026-01-05T00:00:00Z', notes: 'updated' },
      ],
    });
    const remote = makeData({
      workoutLogs: [
        { id: 'w1', date: '2026-01-01', updatedAt: '2026-01-02T00:00:00Z', notes: 'old' },
      ],
    });

    const result = resolveConflicts(local, remote);
    const logs = result.workoutLogs as Array<Record<string, unknown>>;
    expect(logs).toHaveLength(1);
    expect(logs[0].notes).toBe('updated');
  });

  it('keeps local array when remote has no array', () => {
    const local = makeData({ workoutLogs: [{ id: 'w1' }] });
    const remote = makeData({});

    const result = resolveConflicts(local, remote);
    expect(result.workoutLogs).toHaveLength(1);
  });

  it('keeps remote array when local has no array', () => {
    const local = makeData({});
    const remote = makeData({ workoutLogs: [{ id: 'w1' }] });

    const result = resolveConflicts(local, remote);
    expect(result.workoutLogs).toHaveLength(1);
  });
});

// ─── Gamification: XP never regresses ──────────────────────────────────────

describe('resolveConflicts — gamification stats', () => {
  it('keeps the higher XP when local has more', () => {
    const local = makeData({
      gamificationStats: { totalPoints: 8000, level: 14, currentStreak: 29, longestStreak: 29, badges: [] },
    });
    const remote = makeData({
      gamificationStats: { totalPoints: 5000, level: 12, currentStreak: 10, longestStreak: 20, badges: [] },
    });

    const result = resolveConflicts(local, remote);
    const gam = result.gamificationStats as Record<string, unknown>;
    expect(gam.totalPoints).toBe(8000);
    expect(gam.currentStreak).toBe(29);
    expect(gam.longestStreak).toBe(29);
  });

  it('keeps the higher XP when remote has more', () => {
    const local = makeData({
      gamificationStats: { totalPoints: 3000, level: 8, currentStreak: 5, longestStreak: 10, badges: [] },
    });
    const remote = makeData({
      gamificationStats: { totalPoints: 8000, level: 14, currentStreak: 20, longestStreak: 25, badges: [] },
    });

    const result = resolveConflicts(local, remote);
    const gam = result.gamificationStats as Record<string, unknown>;
    expect(gam.totalPoints).toBe(8000);
    expect(gam.currentStreak).toBe(20);
    expect(gam.longestStreak).toBe(25);
  });

  it('recalculates level from maxPoints (never regresses)', () => {
    const local = makeData({
      gamificationStats: { totalPoints: 8178, level: 1, currentStreak: 0, longestStreak: 0, badges: [] },
    });
    const remote = makeData({
      gamificationStats: { totalPoints: 100, level: 1, currentStreak: 0, longestStreak: 0, badges: [] },
    });

    const result = resolveConflicts(local, remote);
    const gam = result.gamificationStats as Record<string, unknown>;
    expect(gam.totalPoints).toBe(8178);
    // Level should be recalculated from 8178 points, not taken from either side
    expect(Number(gam.level)).toBeGreaterThan(1);
  });

  it('union-merges badges by badgeId', () => {
    const local = makeData({
      gamificationStats: {
        totalPoints: 100, level: 1, currentStreak: 0, longestStreak: 0,
        badges: [
          { badgeId: 'first-workout', name: 'First Workout' },
          { badgeId: 'streak-7', name: '7-Day Streak' },
        ],
      },
    });
    const remote = makeData({
      gamificationStats: {
        totalPoints: 100, level: 1, currentStreak: 0, longestStreak: 0,
        badges: [
          { badgeId: 'first-workout', name: 'First Workout' },
          { badgeId: 'volume-king', name: 'Volume King' },
        ],
      },
    });

    const result = resolveConflicts(local, remote);
    const gam = result.gamificationStats as Record<string, unknown>;
    const badges = gam.badges as Array<Record<string, unknown>>;
    expect(badges).toHaveLength(3);
    const ids = badges.map(b => b.badgeId);
    expect(ids).toContain('first-workout');
    expect(ids).toContain('streak-7');
    expect(ids).toContain('volume-king');
  });

  it('keeps local gamification when remote has none', () => {
    const local = makeData({
      gamificationStats: { totalPoints: 500, level: 3, currentStreak: 5, longestStreak: 5, badges: [] },
    });
    const remote = makeData({});

    const result = resolveConflicts(local, remote);
    const gam = result.gamificationStats as Record<string, unknown>;
    expect(gam.totalPoints).toBe(500);
  });
});

// ─── updatedAt-based object fields ─────────────────────────────────────────

describe('resolveConflicts — updatedAt-based fields', () => {
  it('prefers newer currentMesocycle', () => {
    const local = makeData({
      currentMesocycle: { id: 'meso1', currentWeek: 4, updatedAt: '2026-03-05T00:00:00Z' },
    });
    const remote = makeData({
      currentMesocycle: { id: 'meso1', currentWeek: 2, updatedAt: '2026-02-20T00:00:00Z' },
    });

    const result = resolveConflicts(local, remote);
    const meso = result.currentMesocycle as Record<string, unknown>;
    expect(meso.currentWeek).toBe(4);
  });

  it('prefers newer macroTargets', () => {
    const local = makeData({
      macroTargets: { protein: 180, updatedAt: '2026-01-01T00:00:00Z' },
    });
    const remote = makeData({
      macroTargets: { protein: 200, updatedAt: '2026-03-01T00:00:00Z' },
    });

    const result = resolveConflicts(local, remote);
    const macros = result.macroTargets as Record<string, unknown>;
    expect(macros.protein).toBe(200);
  });

  it('falls back to lastSyncAt when no updatedAt', () => {
    const local = makeData({
      lastSyncAt: 2000,
      currentMesocycle: { id: 'meso1', currentWeek: 4 },
    });
    const remote = makeData({
      lastSyncAt: 1000,
      currentMesocycle: { id: 'meso1', currentWeek: 2 },
    });

    const result = resolveConflicts(local, remote);
    const meso = result.currentMesocycle as Record<string, unknown>;
    expect(meso.currentWeek).toBe(4);
  });

  it('keeps local when remote has no value', () => {
    const local = makeData({
      activeDietPhase: { phase: 'cut', updatedAt: '2026-01-01T00:00:00Z' },
    });
    const remote = makeData({});

    const result = resolveConflicts(local, remote);
    expect(result.activeDietPhase).toEqual({ phase: 'cut', updatedAt: '2026-01-01T00:00:00Z' });
  });
});

// ─── User profile merge ────────────────────────────────────────────────────

describe('resolveConflicts — user profile', () => {
  it('prefers newer user profile by updatedAt', () => {
    const local = makeData({
      user: { name: 'Ibra', trainingDays: ['Mon', 'Wed', 'Fri'], updatedAt: '2026-03-05T00:00:00Z' },
    });
    const remote = makeData({
      user: { name: 'Ibra', trainingDays: ['Tue', 'Thu'], updatedAt: '2026-02-01T00:00:00Z' },
    });

    const result = resolveConflicts(local, remote);
    const user = result.user as Record<string, unknown>;
    expect(user.trainingDays).toEqual(['Mon', 'Wed', 'Fri']);
  });

  it('keeps local user when remote has none', () => {
    const local = makeData({ user: { name: 'Test' } });
    const remote = makeData({});

    const result = resolveConflicts(local, remote);
    expect((result.user as Record<string, unknown>).name).toBe('Test');
  });
});

// ─── waterLog deep merge ───────────────────────────────────────────────────

describe('resolveConflicts — waterLog deep merge', () => {
  it('merges water entries from both sides', () => {
    const local = makeData({
      lastSyncAt: 2000,
      waterLog: {
        '2026-03-01': { amount: 2000 },
        '2026-03-02': { amount: 2500 },
      },
    });
    const remote = makeData({
      lastSyncAt: 1000,
      waterLog: {
        '2026-03-01': { amount: 1800 },
        '2026-03-03': { amount: 3000 },
      },
    });

    const result = resolveConflicts(local, remote);
    const water = result.waterLog as Record<string, unknown>;
    // Should have all 3 dates
    expect(Object.keys(water).sort()).toEqual(['2026-03-01', '2026-03-02', '2026-03-03']);
    // Same-date conflict: local is newer (higher lastSyncAt), so local wins
    expect((water['2026-03-01'] as Record<string, unknown>).amount).toBe(2000);
  });

  it('keeps local waterLog when remote has none', () => {
    const local = makeData({
      waterLog: { '2026-03-01': { amount: 2000 } },
    });
    const remote = makeData({});

    const result = resolveConflicts(local, remote);
    expect(result.waterLog).toEqual({ '2026-03-01': { amount: 2000 } });
  });
});

// ─── Edge cases ────────────────────────────────────────────────────────────

describe('resolveConflicts — edge cases', () => {
  it('returns local when remote is null/undefined', () => {
    const local = makeData({ workoutLogs: [{ id: 'w1' }] });
    const result = resolveConflicts(local, null as unknown as Record<string, unknown>);
    expect(result).toBe(local);
  });

  it('returns remote when local is null/undefined', () => {
    const remote = makeData({ workoutLogs: [{ id: 'w1' }] });
    const result = resolveConflicts(null as unknown as Record<string, unknown>, remote);
    expect(result).toBe(remote);
  });

  it('handles empty arrays on both sides', () => {
    const local = makeData({ workoutLogs: [] });
    const remote = makeData({ workoutLogs: [] });
    const result = resolveConflicts(local, remote);
    expect(result.workoutLogs).toEqual([]);
  });

  it('scalar fields prefer newer lastSyncAt side', () => {
    const local = makeData({
      lastSyncAt: 5000,
      themeMode: 'dark',
      colorTheme: 'red',
    });
    const remote = makeData({
      lastSyncAt: 1000,
      themeMode: 'light',
      colorTheme: 'blue',
    });

    const result = resolveConflicts(local, remote);
    expect(result.themeMode).toBe('dark');
    expect(result.colorTheme).toBe('red');
  });

  it('scalar fields fall back to remote when remote synced later', () => {
    const local = makeData({
      lastSyncAt: 1000,
      themeMode: 'dark',
    });
    const remote = makeData({
      lastSyncAt: 5000,
      themeMode: 'light',
    });

    const result = resolveConflicts(local, remote);
    // Remote is newer, and merged starts from remote, so remote scalars stay
    expect(result.themeMode).toBe('light');
  });

  it('preserves isOnboarded from both sides', () => {
    const local = makeData({ lastSyncAt: 2000, isOnboarded: true });
    const remote = makeData({ lastSyncAt: 1000, isOnboarded: false });

    const result = resolveConflicts(local, remote);
    // Local synced later, so local scalars win
    expect(result.isOnboarded).toBe(true);
  });

  it('merges all 30+ array fields without dropping any', () => {
    const arrayFields = [
      'workoutLogs', 'meals', 'bodyWeightLog', 'bodyComposition',
      'injuryLog', 'hrSessions', 'trainingSessions', 'customExercises', 'sessionTemplates',
      'quickLogs', 'gripTests', 'gripExerciseLogs', 'illnessLogs', 'workoutSkips',
      'cycleLogs', 'weeklyCheckIns', 'competitions', 'supplementIntakes',
      'mentalCheckIns', 'confidenceLedger', 'featureFeedback',
      'weightCutPlans', 'fightCampPlans', 'supplementStack', 'activeSupplements',
      'dietPhaseHistory', 'mesocycleHistory', 'mesocycleQueue',
      'seenInsights', 'dismissedInsights', 'readArticles', 'bookmarkedArticles',
      'mealStamps',
    ];

    const local = makeData(
      Object.fromEntries(arrayFields.map(f => [f, [{ id: `${f}-local` }]]))
    );
    const remote = makeData(
      Object.fromEntries(arrayFields.map(f => [f, [{ id: `${f}-remote` }]]))
    );

    const result = resolveConflicts(local, remote);
    for (const field of arrayFields) {
      const arr = result[field] as Array<Record<string, unknown>>;
      expect(arr, `${field} should have 2 entries`).toHaveLength(2);
    }
  });
});

// ─── normalizeWorkoutLogs ──────────────────────────────────────────────────

describe('normalizeWorkoutLogs', () => {
  it('adds completed: true to sets missing it in completed workouts', () => {
    const data = makeData({
      workoutLogs: [{
        id: 'w1',
        completed: true,
        exercises: [{
          exerciseId: 'bench-press',
          sets: [
            { weight: 80, reps: 5, rpe: 8 },        // missing completed
            { weight: 80, reps: 5, rpe: 8.5 },       // missing completed
            { weight: 80, reps: 4, rpe: 9, completed: true }, // already has it
          ],
        }],
      }],
    });

    const result = normalizeWorkoutLogs(data);
    const sets = ((result.workoutLogs as any)[0].exercises[0].sets) as Array<Record<string, unknown>>;
    expect(sets[0].completed).toBe(true);
    expect(sets[1].completed).toBe(true);
    expect(sets[2].completed).toBe(true);
  });

  it('does not touch sets in non-completed workouts', () => {
    const data = makeData({
      workoutLogs: [{
        id: 'w1',
        completed: false,
        exercises: [{
          exerciseId: 'bench-press',
          sets: [{ weight: 80, reps: 5 }],
        }],
      }],
    });

    const result = normalizeWorkoutLogs(data);
    const sets = ((result.workoutLogs as any)[0].exercises[0].sets) as Array<Record<string, unknown>>;
    expect(sets[0].completed).toBeUndefined();
  });

  it('resolveConflicts output is always normalized', () => {
    const local = makeData({
      workoutLogs: [{
        id: 'w1',
        completed: true,
        exercises: [{
          exerciseId: 'squat',
          sets: [{ weight: 100, reps: 5, rpe: 9 }],
        }],
      }],
    });
    const remote = makeData({ workoutLogs: [] });

    const result = resolveConflicts(local, remote);
    const sets = ((result.workoutLogs as any)[0].exercises[0].sets) as Array<Record<string, unknown>>;
    expect(sets[0].completed).toBe(true);
  });
});
