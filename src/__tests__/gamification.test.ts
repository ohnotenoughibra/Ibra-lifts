import { describe, it, expect } from 'vitest';
import {
  calculateLevel,
  pointsToNextLevel,
  levelProgress,
  calculateWorkoutPoints,
  checkNewBadges,
  calculateStreak,
  getLevelTitle,
  detectComeback,
  shouldRefillShield,
  generateWeeklyChallenge,
  isCurrentWeek,
  getBadgeById,
  getBadgesByCategory,
  levelThresholds,
  badges,
  pointRewards,
} from '@/lib/gamification';
import type { GamificationStats, WorkoutLog } from '@/lib/types';

// ── calculateLevel ──────────────────────────────────────────────────────────

describe('calculateLevel', () => {
  it('returns level 1 for 0 points', () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it('returns level 1 for negative points', () => {
    expect(calculateLevel(-10)).toBe(1);
  });

  it('returns level 2 at exactly 100 points', () => {
    expect(calculateLevel(100)).toBe(2);
  });

  it('returns level 2 at 249 points (just below level 3)', () => {
    expect(calculateLevel(249)).toBe(2);
  });

  it('returns level 3 at exactly 250 points', () => {
    expect(calculateLevel(250)).toBe(3);
  });

  it('returns level 10 at 3200 points', () => {
    expect(calculateLevel(3200)).toBe(10);
  });

  it('returns max level (50) at threshold', () => {
    expect(calculateLevel(770000)).toBe(50);
  });

  it('returns max level for points way above max threshold', () => {
    expect(calculateLevel(1000000)).toBe(50);
  });

  it('handles every threshold boundary exactly', () => {
    for (let i = 0; i < levelThresholds.length; i++) {
      expect(calculateLevel(levelThresholds[i])).toBe(i + 1);
    }
  });
});

// ── pointsToNextLevel ───────────────────────────────────────────────────────

describe('pointsToNextLevel', () => {
  it('returns 100 for 0 points (need 100 to reach level 2)', () => {
    expect(pointsToNextLevel(0)).toBe(100);
  });

  it('returns 50 for 50 points', () => {
    expect(pointsToNextLevel(50)).toBe(50);
  });

  it('returns 150 for 100 points (level 2, need 250 for level 3)', () => {
    expect(pointsToNextLevel(100)).toBe(150);
  });

  it('returns 0 at max level', () => {
    expect(pointsToNextLevel(770000)).toBe(0);
  });

  it('returns 0 above max level', () => {
    expect(pointsToNextLevel(999999)).toBe(0);
  });
});

// ── levelProgress ───────────────────────────────────────────────────────────

describe('levelProgress', () => {
  it('returns 0% at the start of a level', () => {
    expect(levelProgress(0)).toBe(0);
  });

  it('returns 50% halfway through level 1', () => {
    expect(levelProgress(50)).toBe(50);
  });

  it('returns 0% at the start of level 2', () => {
    expect(levelProgress(100)).toBe(0);
  });

  it('returns 100% at max level', () => {
    expect(levelProgress(770000)).toBe(100);
  });

  it('never exceeds 100 or goes below 0', () => {
    for (let pts = 0; pts <= 800000; pts += 5000) {
      const progress = levelProgress(pts);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(100);
    }
  });
});

// ── getLevelTitle ────────────────────────────────────────────────────────────

describe('getLevelTitle', () => {
  it('returns Novice for level 1', () => {
    expect(getLevelTitle(1)).toBe('Novice');
  });

  it('returns Apprentice for level 3', () => {
    expect(getLevelTitle(3)).toBe('Apprentice');
  });

  it('returns Rising Warrior for level 5', () => {
    expect(getLevelTitle(5)).toBe('Rising Warrior');
  });

  it('returns Dedicated Lifter for level 10', () => {
    expect(getLevelTitle(10)).toBe('Dedicated Lifter');
  });

  it('returns Master for level 25', () => {
    expect(getLevelTitle(25)).toBe('Master');
  });

  it('returns Living Legend for level 50', () => {
    expect(getLevelTitle(50)).toBe('Living Legend');
  });

  it('returns Living Legend for levels above 50', () => {
    expect(getLevelTitle(99)).toBe('Living Legend');
  });
});

// ── calculateWorkoutPoints ──────────────────────────────────────────────────

describe('calculateWorkoutPoints', () => {
  const baseLog: WorkoutLog = {
    id: 'test-log',
    date: new Date().toISOString(),
    exercises: [
      {
        exerciseId: 'ex1',
        exerciseName: 'Bench Press',
        sets: [
          { weight: 100, reps: 8, rpe: 7, completed: true },
          { weight: 100, reps: 8, rpe: 8, completed: true },
        ],
        feedback: undefined,
      },
    ],
    totalVolume: 1600,
    duration: 45,
    overallRPE: 7,
    energy: 4,
    soreness: 2,
    notes: '',
  } as WorkoutLog;

  it('awards base points for a completed workout', () => {
    const { points, breakdown } = calculateWorkoutPoints(baseLog, false, 0);
    expect(points).toBe(pointRewards.completeWorkout + pointRewards.completeAllSets);
    expect(breakdown.some(b => b.reason === 'Workout completed')).toBe(true);
  });

  it('awards PR bonus when hadPR is true', () => {
    const { points, breakdown } = calculateWorkoutPoints(baseLog, true, 0);
    expect(breakdown.some(b => b.reason === 'Personal Record!')).toBe(true);
    expect(points).toBeGreaterThanOrEqual(pointRewards.completeWorkout + pointRewards.hitPR);
  });

  it('awards all-sets-completed bonus when all sets completed', () => {
    const { breakdown } = calculateWorkoutPoints(baseLog, false, 0);
    expect(breakdown.some(b => b.reason === 'All sets completed')).toBe(true);
  });

  it('does NOT award all-sets bonus when some sets incomplete', () => {
    const incompleteSets = {
      ...baseLog,
      exercises: [{
        ...baseLog.exercises[0],
        sets: [
          { weight: 100, reps: 8, rpe: 7, completed: true },
          { weight: 100, reps: 8, rpe: 8, completed: false },
        ],
      }],
    } as WorkoutLog;
    const { breakdown } = calculateWorkoutPoints(incompleteSets, false, 0);
    expect(breakdown.some(b => b.reason === 'All sets completed')).toBe(false);
  });

  it('awards notes bonus for detailed notes (>20 chars)', () => {
    const withNotes = { ...baseLog, notes: 'Felt good today, grip was strong and energy was high throughout' };
    const { breakdown } = calculateWorkoutPoints(withNotes as WorkoutLog, false, 0);
    expect(breakdown.some(b => b.reason === 'Detailed notes')).toBe(true);
  });

  it('awards streak bonus scaled by streak length', () => {
    const { breakdown } = calculateWorkoutPoints(baseLog, false, 5);
    const streakEntry = breakdown.find(b => b.reason.includes('streak'));
    expect(streakEntry).toBeDefined();
    expect(streakEntry!.points).toBe(50); // 5 * 10 = 50
  });

  it('caps streak bonus at 100 points', () => {
    const { breakdown } = calculateWorkoutPoints(baseLog, false, 20);
    const streakEntry = breakdown.find(b => b.reason.includes('streak'));
    expect(streakEntry!.points).toBe(100);
  });

  it('does not award streak bonus for streak of 1 or 0', () => {
    const { breakdown } = calculateWorkoutPoints(baseLog, false, 1);
    expect(breakdown.some(b => b.reason.includes('streak'))).toBe(false);
  });

  it('awards comeback bonus', () => {
    const { breakdown, points } = calculateWorkoutPoints(baseLog, false, 0, true);
    expect(breakdown.some(b => b.reason === 'Comeback bonus!')).toBe(true);
    expect(points).toBeGreaterThanOrEqual(pointRewards.comebackBonus);
  });

  it('awards zero for workout with no exercises', () => {
    const emptyLog = { ...baseLog, exercises: [] } as unknown as WorkoutLog;
    const { points } = calculateWorkoutPoints(emptyLog, false, 0);
    expect(points).toBe(pointRewards.completeAllSets); // 0 base + allSets (vacuously true)
  });
});

// ── checkNewBadges ──────────────────────────────────────────────────────────

describe('checkNewBadges', () => {
  const emptyStats: GamificationStats = {
    id: 'test',
    userId: 'test',
    totalPoints: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    totalWorkouts: 0,
    totalVolume: 0,
    personalRecords: 0,
    badges: [],
    weeklyChallenge: null,
    streakShield: { available: 1, lastRefillDate: '', usedDates: [] },
    comebackCount: 0,
    totalTrainingSessions: 0,
    dualTrainingDays: 0,
    challengesCompleted: 0,
    lastActiveDate: null,
  };

  const baseMetrics = {
    personalRecords: 0,
    totalWorkouts: 0,
    currentStreak: 0,
    totalVolume: 0,
    mesocyclesCompleted: 0,
    gripExercises: 0,
    turkishGetups: 0,
    earlyWorkouts: 0,
    lateWorkouts: 0,
    perfectWeeks: 0,
    oneRMIncreases: {} as Record<string, number>,
    totalTrainingSessions: 0,
    dualTrainingDays: 0,
    comebackCount: 0,
    challengesCompleted: 0,
  };

  it('awards first-workout badge at 1 workout', () => {
    const newBadges = checkNewBadges(emptyStats, { ...baseMetrics, totalWorkouts: 1 });
    expect(newBadges.some(b => b.id === 'first-workout')).toBe(true);
  });

  it('awards first-pr badge at 1 PR', () => {
    const newBadges = checkNewBadges(emptyStats, { ...baseMetrics, personalRecords: 1 });
    expect(newBadges.some(b => b.id === 'first-pr')).toBe(true);
  });

  it('awards streak-7 badge at 7-day streak', () => {
    const newBadges = checkNewBadges(emptyStats, { ...baseMetrics, currentStreak: 7 });
    expect(newBadges.some(b => b.id === 'streak-7')).toBe(true);
  });

  it('awards multiple badges at once when thresholds are met', () => {
    const newBadges = checkNewBadges(emptyStats, {
      ...baseMetrics,
      totalWorkouts: 10,
      personalRecords: 5,
      currentStreak: 7,
    });
    expect(newBadges.length).toBeGreaterThanOrEqual(3);
  });

  it('does not re-award already earned badges', () => {
    const statsWithBadge: GamificationStats = {
      ...emptyStats,
      badges: [{
        id: 'ub1',
        userId: 'test',
        badgeId: 'first-workout',
        earnedAt: new Date(),
        badge: badges.find(b => b.id === 'first-workout')!,
      }],
    };
    const newBadges = checkNewBadges(statsWithBadge, { ...baseMetrics, totalWorkouts: 1 });
    expect(newBadges.some(b => b.id === 'first-workout')).toBe(false);
  });

  it('awards volume badges at correct thresholds', () => {
    const newBadges = checkNewBadges(emptyStats, { ...baseMetrics, totalVolume: 100000 });
    expect(newBadges.some(b => b.id === 'volume-10k')).toBe(true);
    expect(newBadges.some(b => b.id === 'volume-50k')).toBe(true);
    expect(newBadges.some(b => b.id === 'volume-100k')).toBe(true);
    expect(newBadges.some(b => b.id === 'volume-250k')).toBe(false);
  });

  it('awards combat badges for training sessions', () => {
    const newBadges = checkNewBadges(emptyStats, { ...baseMetrics, totalTrainingSessions: 10 });
    expect(newBadges.some(b => b.id === 'mat-rat-10')).toBe(true);
  });

  it('awards comeback badge', () => {
    const newBadges = checkNewBadges(emptyStats, { ...baseMetrics, comebackCount: 1 });
    expect(newBadges.some(b => b.id === 'comeback-1')).toBe(true);
  });
});

// ── calculateStreak ─────────────────────────────────────────────────────────

describe('calculateStreak', () => {
  it('returns 0 for empty logs', () => {
    expect(calculateStreak([])).toBe(0);
  });

  it('returns 1 for a single workout today', () => {
    const logs: WorkoutLog[] = [
      { id: '1', date: new Date().toISOString() } as WorkoutLog,
    ];
    expect(calculateStreak(logs)).toBe(1);
  });

  it('counts consecutive days', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const logs = [
      { id: '1', date: today.toISOString() },
      { id: '2', date: yesterday.toISOString() },
      { id: '3', date: twoDaysAgo.toISOString() },
    ] as WorkoutLog[];

    expect(calculateStreak(logs)).toBe(3);
  });

  it('breaks streak after gap > 2 days', () => {
    const today = new Date();
    const fourDaysAgo = new Date(today);
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

    const logs = [
      { id: '1', date: today.toISOString() },
      { id: '2', date: fourDaysAgo.toISOString() },
    ] as WorkoutLog[];

    expect(calculateStreak(logs)).toBe(1);
  });
});

// ── detectComeback ──────────────────────────────────────────────────────────

describe('detectComeback', () => {
  it('returns false for null lastActiveDate', () => {
    expect(detectComeback(null)).toBe(false);
  });

  it('returns false for recent activity (3 days ago)', () => {
    const recent = new Date();
    recent.setDate(recent.getDate() - 3);
    expect(detectComeback(recent.toISOString())).toBe(false);
  });

  it('returns true for 7+ day gap', () => {
    const old = new Date();
    old.setDate(old.getDate() - 7);
    expect(detectComeback(old.toISOString())).toBe(true);
  });

  it('returns true for very long gap', () => {
    const old = new Date();
    old.setDate(old.getDate() - 30);
    expect(detectComeback(old.toISOString())).toBe(true);
  });
});

// ── generateWeeklyChallenge ─────────────────────────────────────────────────

describe('generateWeeklyChallenge', () => {
  it('generates a challenge with 3 goals', () => {
    const challenge = generateWeeklyChallenge('combat', emptyStats);
    expect(challenge.goals).toHaveLength(3);
  });

  it('includes combat goals for combat identity', () => {
    // Generate multiple to account for randomness
    const challenges = Array.from({ length: 10 }, () => generateWeeklyChallenge('combat', emptyStats));
    const hasSessionGoal = challenges.some(c => c.goals.some(g => g.type === 'sessions' || g.type === 'dual_days'));
    expect(hasSessionGoal).toBe(true);
  });

  it('does not include combat goals for lifter identity', () => {
    const challenges = Array.from({ length: 20 }, () => generateWeeklyChallenge('lifter', emptyStats));
    const hasSessionGoal = challenges.some(c => c.goals.some(g => g.type === 'sessions' || g.type === 'dual_days'));
    expect(hasSessionGoal).toBe(false);
  });

  it('scales targets based on recent performance', () => {
    const beginner = { workouts: 2, volume: 5000, prs: 0, sessions: 1, dualDays: 0 };
    const advanced = { workouts: 5, volume: 30000, prs: 2, sessions: 3, dualDays: 1 };
    const c1 = generateWeeklyChallenge('lifter', emptyStats, beginner, 2);
    const c2 = generateWeeklyChallenge('lifter', emptyStats, advanced, 5);
    // Advanced user should have higher volume targets
    const volGoal1 = c1.goals.find(g => g.type === 'volume');
    const volGoal2 = c2.goals.find(g => g.type === 'volume');
    if (volGoal1 && volGoal2) {
      expect(volGoal2.target).toBeGreaterThanOrEqual(volGoal1.target);
    }
  });

  it('caps workout targets at sessionsPerWeek', () => {
    const highAvg = { workouts: 6, volume: 40000, prs: 3, sessions: 4, dualDays: 0 };
    // User only plans 2 sessions/week — should never see workout target > 2
    const challenges = Array.from({ length: 20 }, () =>
      generateWeeklyChallenge('lifter', emptyStats, highAvg, 2)
    );
    for (const c of challenges) {
      const workoutGoal = c.goals.find(g => g.type === 'workouts');
      if (workoutGoal) {
        expect(workoutGoal.target).toBeLessThanOrEqual(2);
      }
      // PR target should always be 1
      const prGoal = c.goals.find(g => g.type === 'prs');
      if (prGoal) {
        expect(prGoal.target).toBe(1);
      }
    }
  });

  it('has a valid weekStart (Monday)', () => {
    const challenge = generateWeeklyChallenge('combat', emptyStats);
    const date = new Date(challenge.weekStart);
    // getDay(): 0=Sun, 1=Mon
    expect(date.getDay()).toBe(1);
  });
});

// ── isCurrentWeek ───────────────────────────────────────────────────────────

describe('isCurrentWeek', () => {
  it('returns true for a challenge generated now', () => {
    const challenge = generateWeeklyChallenge('combat', emptyStats);
    expect(isCurrentWeek(challenge)).toBe(true);
  });

  it('returns false for an old challenge', () => {
    const challenge = generateWeeklyChallenge('combat', emptyStats);
    challenge.weekStart = '2024-01-01';
    expect(isCurrentWeek(challenge)).toBe(false);
  });
});

// ── getBadgeById / getBadgesByCategory ───────────────────────────────────────

describe('badge lookup', () => {
  it('finds badge by id', () => {
    const badge = getBadgeById('first-pr');
    expect(badge).toBeDefined();
    expect(badge!.name).toBe('PR Crusher');
  });

  it('returns undefined for unknown badge', () => {
    expect(getBadgeById('nonexistent')).toBeUndefined();
  });

  it('filters badges by category', () => {
    const strengthBadges = getBadgesByCategory('strength');
    expect(strengthBadges.length).toBe(10);
    strengthBadges.forEach(b => expect(b.category).toBe('strength'));
  });

  it('has 56 total badges', () => {
    expect(badges.length).toBe(56);
  });

  it('has 50 level thresholds', () => {
    expect(levelThresholds.length).toBe(50);
  });
});

// ── shouldRefillShield ──────────────────────────────────────────────────────

describe('shouldRefillShield', () => {
  it('returns true when last refill was before current Monday', () => {
    expect(shouldRefillShield('2024-01-01')).toBe(true);
  });

  it('returns false when refilled this week', () => {
    // Get current Monday
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    const monday = d.toISOString().split('T')[0];
    expect(shouldRefillShield(monday)).toBe(false);
  });
});

const emptyStats: GamificationStats = {
  id: 'test',
  userId: 'test',
  totalPoints: 0,
  level: 1,
  currentStreak: 0,
  longestStreak: 0,
  totalWorkouts: 0,
  totalVolume: 0,
  personalRecords: 0,
  badges: [],
  weeklyChallenge: null,
  streakShield: { available: 1, lastRefillDate: '', usedDates: [] },
  comebackCount: 0,
  totalTrainingSessions: 0,
  dualTrainingDays: 0,
  challengesCompleted: 0,
  lastActiveDate: null,
};
