/**
 * Engagement Engine — Sprint 5: Behavior & Retention
 *
 * Variable rewards, streak intelligence, disengagement detection,
 * milestone tracking, and post-session context insights.
 *
 * Pure functions only — no React or store dependencies.
 * Builds on top of gamification.ts (does not replace it).
 */

import type {
  WorkoutLog,
  GamificationStats,
  UserProfile,
} from './types';

/** Filter out soft-deleted items from arrays before processing */
function active<T>(arr: T[]): T[] {
  return arr.filter(item => !(item as Record<string, unknown>)._deleted);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export type VariableRewardType =
  | 'bonus_xp'
  | 'milestone'
  | 'streak_bonus'
  | 'comeback'
  | 'consistency'
  | 'volume_record'
  | 'none';

export type RewardRarity = 'common' | 'uncommon' | 'rare' | 'epic';

export interface VariableReward {
  type: VariableRewardType;
  title: string;
  description: string;
  bonusPoints: number;
  rarity: RewardRarity;
}

export interface StreakAnalysis {
  currentStreak: number;
  longestStreak: number;
  weeklyConsistency: number;
  bestDay: string;
  averageGapDays: number;
  streakAtRisk: boolean;
  comebackStreak: number;
  message: string;
}

export type DisengagementStatus = 'engaged' | 'declining' | 'at_risk' | 'churned';
export type NudgeType = 'gentle' | 'motivational' | 'accountability';

export interface DisengagementSignal {
  status: DisengagementStatus;
  daysSinceLastWorkout: number;
  frequencyDelta: number;
  nudgeMessage: string | null;
  nudgeType: NudgeType | null;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
  points: number;
  rarity: RewardRarity;
}

export interface SessionContext {
  contextLines: string[];
  isPersonalBest: boolean;
  isMilestone: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Normalise any date-like value to midnight UTC. */
function toDateOnly(d: Date | string): Date {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

/** Sort workout logs by date descending (most recent first). */
function sortLogsDesc(logs: WorkoutLog[]): WorkoutLog[] {
  return [...logs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/** Days between two dates (absolute). */
function daysBetween(a: Date | string, b: Date | string): number {
  return Math.abs(
    Math.floor((toDateOnly(a).getTime() - toDateOnly(b).getTime()) / MS_PER_DAY)
  );
}

/** Get unique workout dates as midnight-normalised timestamps. */
function uniqueWorkoutDates(logs: WorkoutLog[]): Date[] {
  const seen = new Set<number>();
  const dates: Date[] = [];
  logs.forEach(log => {
    const d = toDateOnly(log.date);
    const t = d.getTime();
    if (!seen.has(t)) {
      seen.add(t);
      dates.push(d);
    }
  });
  return dates.sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Seeded-ish hash for deterministic-but-variable reward rolls.
 * Uses the workout log id + total volume to produce a 0-1 float.
 */
function rewardRoll(workoutLog: WorkoutLog): number {
  let hash = 0;
  const seed = workoutLog.id + String(workoutLog.totalVolume);
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  // Convert to 0-1 range
  return Math.abs((Math.sin(hash) * 10000) % 1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Variable Reward System
// ═══════════════════════════════════════════════════════════════════════════════

const NO_REWARD: VariableReward = {
  type: 'none',
  title: '',
  description: '',
  bonusPoints: 0,
  rarity: 'common',
};

/**
 * After each workout, roll for a surprise bonus beyond standard points.
 * Rewards are context-aware and tied to actual achievements.
 */
export function generateVariableReward(
  workoutLog: WorkoutLog,
  gamificationStats: GamificationStats,
  workoutLogs: WorkoutLog[]
): VariableReward {
  workoutLogs = active(workoutLogs);
  const roll = rewardRoll(workoutLog);

  // ── Context detection ──────────────────────────────────────────────────────

  // Comeback: returning after 5+ day gap
  const sorted = sortLogsDesc(workoutLogs);
  const previousLogs = sorted.filter(
    l => new Date(l.date).getTime() < new Date(workoutLog.date).getTime()
  );
  const lastPrevDate = previousLogs.length > 0 ? new Date(previousLogs[0].date) : null;
  const daysSinceLast = lastPrevDate
    ? daysBetween(workoutLog.date, lastPrevDate)
    : 0;
  const isComebackSession = daysSinceLast >= 5 && previousLogs.length > 0;

  // Volume record: highest single-session volume ever
  let isVolumeRecord = false;
  if (workoutLog.totalVolume > 0) {
    const prevMaxVolume = previousLogs.reduce(
      (max, l) => Math.max(max, l.totalVolume || 0), 0
    );
    isVolumeRecord = workoutLog.totalVolume > prevMaxVolume && previousLogs.length > 0;
  }

  // Consistency: trained on the same day-of-week for 3+ consecutive weeks
  const workoutDow = new Date(workoutLog.date).getDay();
  const workoutDateMs = toDateOnly(workoutLog.date).getTime();
  let consecutiveWeeks = 0;
  for (let w = 1; w <= 8; w++) {
    const targetDate = workoutDateMs - w * 7 * MS_PER_DAY;
    const hasMatch = previousLogs.some(l => {
      const ld = toDateOnly(l.date).getTime();
      return Math.abs(ld - targetDate) <= MS_PER_DAY && new Date(l.date).getDay() === workoutDow;
    });
    if (hasMatch) {
      consecutiveWeeks++;
    } else {
      break;
    }
  }
  const isConsistencyStreak = consecutiveWeeks >= 3;

  // ── Priority-based reward selection (context first, then random) ───────────

  // Epic-tier contextual rewards (always awarded when earned)
  if (isVolumeRecord && roll < 0.85) {
    return {
      type: 'volume_record',
      title: 'Volume Record Shattered',
      description: `${formatVolume(workoutLog.totalVolume)} — your highest session ever.`,
      bonusPoints: 150,
      rarity: 'epic',
    };
  }

  // Rare-tier contextual rewards
  if (isComebackSession) {
    return {
      type: 'comeback',
      title: 'The Comeback',
      description: `${daysSinceLast} days away, but you showed up. That takes grit.`,
      bonusPoints: 100,
      rarity: 'rare',
    };
  }

  if (isConsistencyStreak && roll < 0.7) {
    return {
      type: 'consistency',
      title: 'Creature of Habit',
      description: `${consecutiveWeeks + 1} ${DAY_NAMES[workoutDow]}s in a row. The routine is locked in.`,
      bonusPoints: 75,
      rarity: 'uncommon',
    };
  }

  // ── Probability-based rewards ──────────────────────────────────────────────
  // ~40% none, ~30% common, ~20% uncommon, ~8% rare, ~2% epic

  if (roll < 0.40) {
    return NO_REWARD;
  }

  if (roll < 0.70) {
    // Common tier
    return pickCommonReward(workoutLog, gamificationStats);
  }

  if (roll < 0.90) {
    // Uncommon tier
    return pickUncommonReward(workoutLog, gamificationStats);
  }

  if (roll < 0.98) {
    // Rare tier
    return pickRareReward(workoutLog, gamificationStats);
  }

  // Epic tier (2%)
  return pickEpicReward(workoutLog, gamificationStats);
}

function formatVolume(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}

function pickCommonReward(log: WorkoutLog, stats: GamificationStats): VariableReward {
  const options: VariableReward[] = [
    {
      type: 'bonus_xp',
      title: 'Bonus XP',
      description: 'A little extra for showing up today.',
      bonusPoints: 15,
      rarity: 'common',
    },
    {
      type: 'bonus_xp',
      title: 'Iron Dividend',
      description: 'Consistency compounds. Here\'s proof.',
      bonusPoints: 20,
      rarity: 'common',
    },
    {
      type: 'streak_bonus',
      title: 'Streak Fuel',
      description: `${stats.currentStreak || 1}-day streak — keep building.`,
      bonusPoints: 10 + Math.min(stats.currentStreak, 10),
      rarity: 'common',
    },
  ];

  const idx = Math.abs(log.totalVolume) % options.length;
  return options[idx];
}

function pickUncommonReward(log: WorkoutLog, stats: GamificationStats): VariableReward {
  const options: VariableReward[] = [
    {
      type: 'bonus_xp',
      title: 'Double Down',
      description: 'The universe rewards effort. Double XP bonus.',
      bonusPoints: 40,
      rarity: 'uncommon',
    },
    {
      type: 'streak_bonus',
      title: 'Streak Surge',
      description: `Day ${stats.currentStreak || 1} — your discipline is paying off.`,
      bonusPoints: 30 + Math.min(stats.currentStreak * 2, 30),
      rarity: 'uncommon',
    },
    {
      type: 'milestone',
      title: 'Ahead of Schedule',
      description: `Session #${stats.totalWorkouts + 1} in the books. You\'re building something.`,
      bonusPoints: 50,
      rarity: 'uncommon',
    },
  ];

  const idx = Math.abs(log.totalVolume + (stats.totalPoints || 0)) % options.length;
  return options[idx];
}

function pickRareReward(log: WorkoutLog, stats: GamificationStats): VariableReward {
  const options: VariableReward[] = [
    {
      type: 'bonus_xp',
      title: 'Jackpot Session',
      description: 'Rare bonus — the gym gods smile upon you today.',
      bonusPoints: 100,
      rarity: 'rare',
    },
    {
      type: 'milestone',
      title: 'Hidden Achievement',
      description: `Level ${stats.level} and rising. Few get this far.`,
      bonusPoints: 80,
      rarity: 'rare',
    },
  ];

  const idx = Math.abs(log.totalVolume) % options.length;
  return options[idx];
}

function pickEpicReward(_log: WorkoutLog, stats: GamificationStats): VariableReward {
  return {
    type: 'bonus_xp',
    title: 'Legendary Session',
    description: `Level ${stats.level} warrior — this one\'s for the history books. Epic XP drop.`,
    bonusPoints: 200,
    rarity: 'epic',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Streak Intelligence
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Deep analysis of training streaks, consistency patterns, and risk signals.
 *
 * Frequency-aware: a 2x/week user with 3 rest days between sessions is
 * perfectly on track — streaks and risk signals respect the user's plan.
 *
 * "Streak" here means consecutive weeks where the user hit their planned
 * session count, NOT consecutive calendar days.
 */
export function analyzeStreak(
  workoutLogs: WorkoutLog[],
  gamificationStats: GamificationStats,
  sessionsPerWeek: number = 3
): StreakAnalysis {
  workoutLogs = active(workoutLogs);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const dates = uniqueWorkoutDates(workoutLogs);

  // ── Expected gap between sessions based on plan ──────────────────────────
  // 2x/week → expect ~3.5 day gap, 3x → ~2.3, 4x → ~1.75, etc.
  const expectedGapDays = 7 / Math.max(sessionsPerWeek, 1);

  // ── Weekly consistency (last 4 weeks) ─────────────────────────────────────
  const fourWeeksAgo = new Date(now.getTime() - 28 * MS_PER_DAY);
  const recentLogs = workoutLogs.filter(
    l => toDateOnly(l.date).getTime() >= fourWeeksAgo.getTime()
  );

  // Bucket sessions by ISO week
  const weekBuckets: Record<string, number> = {};
  recentLogs.forEach(l => {
    const d = toDateOnly(l.date);
    const weekStart = getMonday(d);
    weekBuckets[weekStart] = (weekBuckets[weekStart] || 0) + 1;
  });

  // Consistency = avg sessions per week / planned sessions per week
  const avgPerWeek = recentLogs.length / 4;
  const weeklyConsistency = Math.min(
    100,
    Math.round((avgPerWeek / sessionsPerWeek) * 100)
  );

  // ── Week-streak: consecutive weeks where user hit their target ────────────
  // Walk backwards from the current week
  const weekStreak = (() => {
    let streak = 0;
    const currentMonday = getMonday(now);
    const currentWeekSessions = weekBuckets[currentMonday] || 0;

    // Check if current week is still in progress (not yet fully passed)
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // Mon=1, Sun=7
    const currentWeekOnTrack = currentWeekSessions >= Math.ceil(sessionsPerWeek * (dayOfWeek / 7) * 0.7);

    if (currentWeekOnTrack && currentWeekSessions > 0) {
      streak = 1;
    }

    // Walk back through prior weeks
    for (let w = 1; w <= 12; w++) {
      const weekStart = new Date(now.getTime() - (w * 7 + (dayOfWeek - 1)) * MS_PER_DAY);
      const key = getMonday(weekStart);
      const count = weekBuckets[key] || 0;
      // A week is "hit" if the user did at least 70% of planned sessions
      if (count >= Math.ceil(sessionsPerWeek * 0.7)) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  })();

  // Use week streak as the primary streak number — more meaningful than day-streak
  const currentStreak = weekStreak;
  const longestStreak = Math.max(gamificationStats.longestStreak, currentStreak);

  // ── Best day ──────────────────────────────────────────────────────────────
  const dayCount: number[] = [0, 0, 0, 0, 0, 0, 0];
  dates.forEach(d => {
    dayCount[d.getDay()]++;
  });
  let bestDayIdx = 0;
  dayCount.forEach((count, idx) => {
    if (count > dayCount[bestDayIdx]) {
      bestDayIdx = idx;
    }
  });
  const bestDay = DAY_NAMES[bestDayIdx];

  // ── Average gap days ──────────────────────────────────────────────────────
  let totalGap = 0;
  let gapCount = 0;
  const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
  for (let i = 1; i < sortedDates.length; i++) {
    const gap = daysBetween(sortedDates[i], sortedDates[i - 1]);
    if (gap > 0) {
      totalGap += gap;
      gapCount++;
    }
  }
  const averageGapDays = gapCount > 0 ? Math.round((totalGap / gapCount) * 10) / 10 : 0;

  // ── Streak at risk ────────────────────────────────────────────────────────
  // Only at risk if days since last session exceeds expected gap by a good margin
  // For 2x/week: expected gap = 3.5 days, threshold = ~5-6 days
  const lastWorkoutDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;
  const daysSinceLast = lastWorkoutDate ? daysBetween(now, lastWorkoutDate) : 999;
  const riskThreshold = Math.max(expectedGapDays * 2, averageGapDays * 1.8, 5);
  const streakAtRisk = daysSinceLast >= riskThreshold && currentStreak > 0;

  // ── Comeback streak (sessions since last break > 2 weeks) ─────────────────
  let comebackStreak = 0;
  if (sortedDates.length > 0) {
    comebackStreak = 1;
    for (let i = sortedDates.length - 1; i > 0; i--) {
      const gap = daysBetween(sortedDates[i], sortedDates[i - 1]);
      if (gap > 14) break; // 2-week gap = real break
      comebackStreak++;
    }
  }

  // ── Message ───────────────────────────────────────────────────────────────
  let message: string;

  if (streakAtRisk && currentStreak >= 4) {
    message = `${currentStreak}-week streak at risk. It\'s been ${daysSinceLast} days — get a session in this week.`;
  } else if (streakAtRisk && currentStreak > 0) {
    message = `${daysSinceLast} days since your last session — a bit longer than your usual rhythm.`;
  } else if (currentStreak >= 8) {
    message = `${currentStreak} weeks consistent. At this point, training is just who you are.`;
  } else if (currentStreak >= 4) {
    message = `${currentStreak} weeks on plan — this is where real progress compounds.`;
  } else if (weeklyConsistency >= 90) {
    message = `${weeklyConsistency}% weekly consistency. You\'re nailing the routine.`;
  } else if (weeklyConsistency >= 70) {
    message = `${weeklyConsistency}% consistency — solid. Keep hitting your ${sessionsPerWeek}x/week target.`;
  } else if (daysSinceLast > 14) {
    message = 'It\'s been a while. No pressure — just one session to restart.';
  } else if (daysSinceLast > 7) {
    message = 'Short break — nothing wrong with that. Ready to go again?';
  } else {
    message = 'Every session counts. Show up and the results follow.';
  }

  return {
    currentStreak,
    longestStreak,
    weeklyConsistency,
    bestDay,
    averageGapDays,
    streakAtRisk,
    comebackStreak,
    message,
  };
}

function getMonday(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Re-engagement Detection
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Analyse training frequency trends and detect disengagement risk.
 * Compares last 4 weeks vs prior 4 weeks.
 */
export function detectDisengagement(
  workoutLogs: WorkoutLog[],
  user: UserProfile | null
): DisengagementSignal {
  workoutLogs = active(workoutLogs);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const fourWeeksAgo = new Date(now.getTime() - 28 * MS_PER_DAY);
  const eightWeeksAgo = new Date(now.getTime() - 56 * MS_PER_DAY);

  // Recent period: last 4 weeks
  const recentLogs = workoutLogs.filter(l => {
    const d = toDateOnly(l.date);
    return d.getTime() >= fourWeeksAgo.getTime() && d.getTime() <= now.getTime();
  });
  const recentPerWeek = recentLogs.length / 4;

  // Prior period: 4-8 weeks ago
  const priorLogs = workoutLogs.filter(l => {
    const d = toDateOnly(l.date);
    return d.getTime() >= eightWeeksAgo.getTime() && d.getTime() < fourWeeksAgo.getTime();
  });
  const priorPerWeek = priorLogs.length / 4;

  // Days since last workout
  const sorted = sortLogsDesc(workoutLogs);
  const lastDate = sorted.length > 0 ? toDateOnly(sorted[0].date) : null;
  const daysSinceLastWorkout = lastDate
    ? Math.floor((now.getTime() - lastDate.getTime()) / MS_PER_DAY)
    : 999;

  // Frequency delta (% change)
  let frequencyDelta = 0;
  if (priorPerWeek > 0) {
    frequencyDelta = Math.round(((recentPerWeek - priorPerWeek) / priorPerWeek) * 100);
  } else if (recentPerWeek > 0) {
    frequencyDelta = 100; // Went from nothing to something
  }

  // ── Determine status ──────────────────────────────────────────────────────
  let status: DisengagementStatus;
  if (daysSinceLastWorkout >= 21) {
    status = 'churned';
  } else if (daysSinceLastWorkout >= 10 || frequencyDelta <= -50) {
    status = 'at_risk';
  } else if (frequencyDelta <= -25 || daysSinceLastWorkout >= 5) {
    status = 'declining';
  } else {
    status = 'engaged';
  }

  // ── Nudge messages ────────────────────────────────────────────────────────
  let nudgeMessage: string | null = null;
  let nudgeType: NudgeType | null = null;

  const userName = user?.name ? user.name.split(' ')[0] : null;
  const plannedPerWeek = user?.sessionsPerWeek ?? 3;

  if (status === 'churned') {
    nudgeType = 'gentle';
    nudgeMessage = 'Your body is ready when you are. A 20-minute session is enough to rebuild momentum.';
  } else if (status === 'at_risk') {
    // Choose nudge type based on context
    if (sorted.length >= 10) {
      // They have history — motivational works
      const longestRecentStreak = estimateRecentStreak(sorted);
      nudgeType = 'motivational';
      nudgeMessage = longestRecentStreak > 5
        ? `You had a ${longestRecentStreak}-session streak going. One session gets it back.`
        : 'You\'ve been building something real. One session today keeps the foundation solid.';
    } else {
      nudgeType = 'gentle';
      nudgeMessage = 'Starting is the hardest part. Even 15 minutes counts as a win today.';
    }
  } else if (status === 'declining') {
    nudgeType = 'accountability';
    const currentWeekSessions = workoutLogs.filter(l => {
      const d = toDateOnly(l.date);
      const weekAgo = new Date(now.getTime() - 7 * MS_PER_DAY);
      return d.getTime() >= weekAgo.getTime();
    }).length;
    nudgeMessage = `You set a goal of ${plannedPerWeek}x/week. This week you\'re at ${currentWeekSessions}. What\'s blocking you?`;
  }

  return {
    status,
    daysSinceLastWorkout,
    frequencyDelta,
    nudgeMessage,
    nudgeType,
  };
}

/** Estimate the longest recent consecutive-session streak from sorted logs. */
function estimateRecentStreak(sortedDesc: WorkoutLog[]): number {
  let streak = 1;
  let maxStreak = 1;
  for (let i = 1; i < sortedDesc.length && i < 30; i++) {
    const gap = daysBetween(sortedDesc[i - 1].date, sortedDesc[i].date);
    if (gap <= 2) {
      streak++;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      streak = 1;
    }
  }
  return maxStreak;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Milestone System
// ═══════════════════════════════════════════════════════════════════════════════

interface MilestoneDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  rarity: RewardRarity;
  check: (stats: GamificationStats, logCount: number) => boolean;
}

const MILESTONE_DEFINITIONS: MilestoneDefinition[] = [
  // ── Total workouts ──
  {
    id: 'ms-workouts-10',
    title: 'First Ten',
    description: 'Complete 10 workouts. The habit is forming.',
    icon: '10',
    points: 50,
    rarity: 'common',
    check: (s) => s.totalWorkouts >= 10,
  },
  {
    id: 'ms-workouts-25',
    title: 'Quarter Century',
    description: '25 workouts complete. You\'re no longer a beginner.',
    icon: '25',
    points: 100,
    rarity: 'common',
    check: (s) => s.totalWorkouts >= 25,
  },
  {
    id: 'ms-workouts-50',
    title: 'Half Century',
    description: '50 sessions of dedication. The iron remembers.',
    icon: '50',
    points: 200,
    rarity: 'uncommon',
    check: (s) => s.totalWorkouts >= 50,
  },
  {
    id: 'ms-workouts-100',
    title: 'The Hundred Club',
    description: '100 workouts. You\'ve earned your place.',
    icon: '100',
    points: 400,
    rarity: 'rare',
    check: (s) => s.totalWorkouts >= 100,
  },
  {
    id: 'ms-workouts-250',
    title: 'Iron Veteran',
    description: '250 sessions. This isn\'t a phase — it\'s a lifestyle.',
    icon: '250',
    points: 750,
    rarity: 'rare',
    check: (s) => s.totalWorkouts >= 250,
  },
  {
    id: 'ms-workouts-500',
    title: 'Hall of Fame',
    description: '500 workouts. Legendary dedication.',
    icon: '500',
    points: 1500,
    rarity: 'epic',
    check: (s) => s.totalWorkouts >= 500,
  },

  // ── Total volume ──
  {
    id: 'ms-volume-1k',
    title: 'First Thousand',
    description: '1,000 total volume moved.',
    icon: '1K',
    points: 25,
    rarity: 'common',
    check: (s) => s.totalVolume >= 1000,
  },
  {
    id: 'ms-volume-5k',
    title: 'Five Thousand',
    description: '5,000 total volume. Building momentum.',
    icon: '5K',
    points: 50,
    rarity: 'common',
    check: (s) => s.totalVolume >= 5000,
  },
  {
    id: 'ms-volume-10k',
    title: 'Ten Thousand',
    description: '10,000 total volume. Serious work.',
    icon: '10K',
    points: 100,
    rarity: 'common',
    check: (s) => s.totalVolume >= 10000,
  },
  {
    id: 'ms-volume-50k',
    title: 'Fifty Thousand',
    description: '50,000 total volume. Mountains moved.',
    icon: '50K',
    points: 300,
    rarity: 'uncommon',
    check: (s) => s.totalVolume >= 50000,
  },
  {
    id: 'ms-volume-100k',
    title: 'Hundred Thousand',
    description: '100,000 total volume. An entire gym\'s worth.',
    icon: '100K',
    points: 500,
    rarity: 'rare',
    check: (s) => s.totalVolume >= 100000,
  },

  // ── Personal records ──
  {
    id: 'ms-pr-first',
    title: 'First PR',
    description: 'Your first personal record. Many more to come.',
    icon: 'PR',
    points: 50,
    rarity: 'common',
    check: (s) => s.personalRecords >= 1,
  },
  {
    id: 'ms-pr-10',
    title: 'PR Hunter',
    description: '10 personal records broken. Strength is rising.',
    icon: 'PR10',
    points: 150,
    rarity: 'uncommon',
    check: (s) => s.personalRecords >= 10,
  },
  {
    id: 'ms-pr-50',
    title: 'PR Machine',
    description: '50 personal records. Nothing stops you.',
    icon: 'PR50',
    points: 500,
    rarity: 'rare',
    check: (s) => s.personalRecords >= 50,
  },

  // ── Streak milestones ──
  {
    id: 'ms-streak-7',
    title: 'One Week Down',
    description: '7-day training streak. The first week is the hardest.',
    icon: '7D',
    points: 75,
    rarity: 'common',
    check: (s) => s.currentStreak >= 7 || s.longestStreak >= 7,
  },
  {
    id: 'ms-streak-30',
    title: 'Thirty-Day Forge',
    description: '30-day streak. The habit is forged in iron.',
    icon: '30D',
    points: 300,
    rarity: 'uncommon',
    check: (s) => s.currentStreak >= 30 || s.longestStreak >= 30,
  },
  {
    id: 'ms-streak-100',
    title: 'Hundred-Day War',
    description: '100-day streak. You\'ve won the war against excuses.',
    icon: '100D',
    points: 1000,
    rarity: 'epic',
    check: (s) => s.currentStreak >= 100 || s.longestStreak >= 100,
  },
];

/**
 * Check for newly unlocked milestones that haven't been awarded yet.
 * Tracks unlocked milestones via gamificationStats.badges to avoid duplicates.
 */
export function checkMilestones(
  workoutLogs: WorkoutLog[],
  gamificationStats: GamificationStats
): Milestone[] {
  workoutLogs = active(workoutLogs);
  const alreadyUnlocked = new Set<string>();
  gamificationStats.badges.forEach(b => {
    alreadyUnlocked.add(b.badgeId);
  });

  const nowISO = new Date().toISOString();
  const newMilestones: Milestone[] = [];

  MILESTONE_DEFINITIONS.forEach(def => {
    if (alreadyUnlocked.has(def.id)) return;
    if (def.check(gamificationStats, workoutLogs.length)) {
      newMilestones.push({
        id: def.id,
        title: def.title,
        description: def.description,
        icon: def.icon,
        unlockedAt: nowISO,
        points: def.points,
        rarity: def.rarity,
      });
    }
  });

  return newMilestones;
}

/**
 * Get all milestone definitions (useful for progress display).
 */
export function getAllMilestoneDefinitions(): Array<{
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  rarity: RewardRarity;
}> {
  return MILESTONE_DEFINITIONS.map(def => ({
    id: def.id,
    title: def.title,
    description: def.description,
    icon: def.icon,
    points: def.points,
    rarity: def.rarity,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Session Rating Insights
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate fun/meaningful context lines after each session.
 */
export function getSessionContext(
  workoutLog: WorkoutLog,
  workoutLogs: WorkoutLog[],
  gamificationStats: GamificationStats
): SessionContext {
  workoutLogs = active(workoutLogs);
  const contextLines: string[] = [];
  let isPersonalBest = false;
  let isMilestone = false;

  const sorted = sortLogsDesc(workoutLogs);
  const previousLogs = sorted.filter(
    l => new Date(l.date).getTime() < new Date(workoutLog.date).getTime()
  );
  const sessionNumber = previousLogs.length + 1;

  // ── Personal best detection ───────────────────────────────────────────────

  // Volume PB check
  const prevMaxVolume = previousLogs.reduce(
    (max, l) => Math.max(max, l.totalVolume || 0), 0
  );
  if (workoutLog.totalVolume > prevMaxVolume && previousLogs.length > 0) {
    isPersonalBest = true;
    contextLines.push(
      `This was your highest-volume session ever (${formatVolume(workoutLog.totalVolume)})`
    );
  }

  // Duration PB check
  const prevMaxDuration = previousLogs.reduce(
    (max, l) => Math.max(max, l.duration || 0), 0
  );
  if (workoutLog.duration > prevMaxDuration && previousLogs.length > 3 && workoutLog.duration > 0) {
    contextLines.push(
      `Longest session yet at ${workoutLog.duration} minutes`
    );
  }

  // Exercise PR check
  const hadPR = workoutLog.exercises.some(e => e.personalRecord);
  if (hadPR) {
    isPersonalBest = true;
    const prExercises = workoutLog.exercises
      .filter(e => e.personalRecord)
      .map(e => e.exerciseName);
    if (prExercises.length === 1) {
      contextLines.push(`New PR on ${prExercises[0]}`);
    } else {
      contextLines.push(`${prExercises.length} PRs in one session — massive day`);
    }
  }

  // ── Muscle group volume PB (upper body vs lower body) ─────────────────────
  // Detect session "type" from exercise names for context
  const exerciseNames = workoutLog.exercises.map(e => e.exerciseName.toLowerCase());
  const isUpperHeavy = exerciseNames.some(n =>
    n.includes('bench') || n.includes('press') || n.includes('row') ||
    n.includes('pull') || n.includes('curl') || n.includes('fly')
  );
  const isLowerHeavy = exerciseNames.some(n =>
    n.includes('squat') || n.includes('deadlift') || n.includes('lunge') ||
    n.includes('leg') || n.includes('hip')
  );

  if (isUpperHeavy && !isLowerHeavy) {
    const upperLogs = previousLogs.filter(l =>
      l.exercises.some(e => {
        const name = e.exerciseName.toLowerCase();
        return name.includes('bench') || name.includes('press') || name.includes('row') ||
          name.includes('pull') || name.includes('curl') || name.includes('fly');
      })
    );
    const prevUpperMax = upperLogs.reduce((max, l) => Math.max(max, l.totalVolume || 0), 0);
    if (workoutLog.totalVolume > prevUpperMax && upperLogs.length >= 3) {
      contextLines.push('This was your highest-volume upper body session ever');
    }
  }

  if (isLowerHeavy && !isUpperHeavy) {
    const lowerLogs = previousLogs.filter(l =>
      l.exercises.some(e => {
        const name = e.exerciseName.toLowerCase();
        return name.includes('squat') || name.includes('deadlift') || name.includes('lunge') ||
          name.includes('leg') || name.includes('hip');
      })
    );
    const prevLowerMax = lowerLogs.reduce((max, l) => Math.max(max, l.totalVolume || 0), 0);
    if (workoutLog.totalVolume > prevLowerMax && lowerLogs.length >= 3) {
      contextLines.push('This was your highest-volume lower body session ever');
    }
  }

  // ── Day-of-week consistency ───────────────────────────────────────────────
  const workoutDow = new Date(workoutLog.date).getDay();
  const dayName = DAY_NAMES[workoutDow];
  const sameDayLogs = previousLogs.filter(l => new Date(l.date).getDay() === workoutDow);

  // Check consecutive weeks on this day
  const workoutDateMs = toDateOnly(workoutLog.date).getTime();
  let consecutiveWeeksOnDay = 0;
  for (let w = 1; w <= 12; w++) {
    const targetDate = workoutDateMs - w * 7 * MS_PER_DAY;
    const hasMatch = sameDayLogs.some(l => {
      const ld = toDateOnly(l.date).getTime();
      return Math.abs(ld - targetDate) <= MS_PER_DAY;
    });
    if (hasMatch) {
      consecutiveWeeksOnDay++;
    } else {
      break;
    }
  }

  if (consecutiveWeeksOnDay >= 3) {
    contextLines.push(
      `You\'ve now trained ${consecutiveWeeksOnDay + 1} ${dayName}s in a row — building a habit`
    );
  }

  // ── Milestone session numbers ─────────────────────────────────────────────
  const milestoneNumbers = [10, 25, 50, 75, 100, 150, 200, 250, 300, 365, 500];
  if (milestoneNumbers.includes(sessionNumber)) {
    isMilestone = true;
    if (sessionNumber === 50) {
      contextLines.push('That\'s session #50. Half a century of gains.');
    } else if (sessionNumber === 100) {
      contextLines.push('Session #100. Triple digits. You are the 1%.');
    } else if (sessionNumber === 365) {
      contextLines.push('Session #365. A full year\'s worth of sessions. Incredible.');
    } else if (sessionNumber === 500) {
      contextLines.push('Session #500. Half a thousand. You are a legend.');
    } else {
      contextLines.push(`That\'s session #${sessionNumber}. Every one counts.`);
    }
  }

  // ── Level-up context ──────────────────────────────────────────────────────
  if (gamificationStats.level >= 10 && gamificationStats.level % 5 === 0) {
    contextLines.push(`Level ${gamificationStats.level} — you\'re in elite territory`);
  }

  // ── Streak context ────────────────────────────────────────────────────────
  const streak = gamificationStats.currentStreak;
  if (streak === 7) {
    contextLines.push('7-day streak unlocked. First full week of consistency.');
  } else if (streak === 14) {
    contextLines.push('Two-week streak. This is becoming a lifestyle.');
  } else if (streak === 30) {
    contextLines.push('30-day streak. The habit is cemented.');
  } else if (streak > 0 && streak % 50 === 0) {
    contextLines.push(`${streak}-day streak. At this point, rest days are the exception.`);
  }

  // ── Fallback if no context lines ──────────────────────────────────────────
  if (contextLines.length === 0) {
    if (sessionNumber <= 3) {
      contextLines.push('Great start. The first few sessions are the most important.');
    } else if (workoutLog.overallRPE <= 6) {
      contextLines.push('Controlled effort today. Smart training is sustainable training.');
    } else if (workoutLog.overallRPE >= 9) {
      contextLines.push('You left it all on the floor. Respect.');
    } else {
      contextLines.push('Another one in the books. Consistency wins.');
    }
  }

  // Cap at 3 context lines to keep the UI clean
  const cappedLines = contextLines.slice(0, 3);

  return {
    contextLines: cappedLines,
    isPersonalBest,
    isMilestone,
  };
}
