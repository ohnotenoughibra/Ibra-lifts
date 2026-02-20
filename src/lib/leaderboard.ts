import { v4 as uuidv4 } from 'uuid';
import type { GamificationStats, CombatSport } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A gym community that groups athletes together for leaderboards & battles. */
export interface GymProfile {
  id: string;
  name: string;
  sport: CombatSport | 'mixed';
  memberIds: string[];
  createdAt: string;
  inviteCode: string;
}

/** A single row in a ranked leaderboard. */
export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  level: number;
  weeklyXP: number;
  weeklyWorkouts: number;
  weeklyVolume: number;
  currentStreak: number;
  rank: number;
  /** Movement vs the previous week's rank. */
  trend: 'up' | 'down' | 'same';
}

/** A head-to-head battle between two athletes. */
export interface ChallengeBattle {
  id: string;
  type: 'volume' | 'workouts' | 'consistency' | 'prs';
  challengerId: string;
  opponentId: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'active' | 'completed';
  challengerScore: number;
  opponentScore: number;
  winner?: string;
  /** XP awarded to the winner (loser gets half). */
  xpReward: number;
}

/** Available sorting dimensions for the leaderboard. */
export type LeaderboardCategory =
  | 'weekly_xp'
  | 'volume'
  | 'consistency'
  | 'prs'
  | 'training_sessions';

/** Aggregate statistics for an entire gym. */
export interface GymStats {
  totalMembers: number;
  totalWorkouts: number;
  averageLevel: number;
  totalPRs: number;
  totalVolume: number;
  averageStreak: number;
  totalTrainingSessions: number;
  totalChallengesCompleted: number;
  mostActiveMemberIndex: number;
}

// ---------------------------------------------------------------------------
// Input helper types (not exported — used only in function signatures)
// ---------------------------------------------------------------------------

interface LeaderboardMember {
  userId: string;
  displayName: string;
  stats: GamificationStats;
  weeklyXP: number;
  previousRank?: number;
}

interface GymMember {
  stats: GamificationStats;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INVITE_CODE_LENGTH = 6;
const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/1/O/0 to avoid ambiguity

const XP_REWARD_MAP: Record<number, number> = {
  7: 200,
  14: 400,
  30: 750,
};
const DEFAULT_XP_REWARD = 200;

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Generate a 6-character alphanumeric invite code.
 *
 * Uses an ambiguity-free character set (no I/1/O/0) so codes are easy to
 * share verbally or via screenshots.
 */
export function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_CODE_CHARS.charAt(
      Math.floor(Math.random() * INVITE_CODE_CHARS.length)
    );
  }
  return code;
}

/**
 * Rank a list of gym members by the chosen leaderboard category.
 *
 * Returns a sorted `LeaderboardEntry[]` with rank and trend computed
 * relative to each member's `previousRank` (if provided).
 *
 * @param members  - The members to rank, each carrying their current stats
 *                   and an optional `previousRank` from the prior period.
 * @param category - The dimension to sort by.
 * @returns Sorted leaderboard entries, rank 1 = best.
 */
export function computeLeaderboard(
  members: LeaderboardMember[],
  category: LeaderboardCategory
): LeaderboardEntry[] {
  // Build sortable entries with the metric that corresponds to the category.
  const entries = members.map((m) => ({
    userId: m.userId,
    displayName: m.displayName,
    level: m.stats.level,
    weeklyXP: m.weeklyXP,
    weeklyWorkouts: m.stats.totalWorkouts,
    weeklyVolume: m.stats.totalVolume,
    currentStreak: m.stats.currentStreak,
    previousRank: m.previousRank,
    sortValue: getSortValue(m, category),
  }));

  // Sort descending — higher is better for every category.
  entries.sort((a, b) => b.sortValue - a.sortValue);

  return entries.map((entry, index) => {
    const rank = index + 1;
    let trend: LeaderboardEntry['trend'] = 'same';

    if (entry.previousRank !== undefined) {
      if (rank < entry.previousRank) trend = 'up';
      else if (rank > entry.previousRank) trend = 'down';
    }

    return {
      userId: entry.userId,
      displayName: entry.displayName,
      level: entry.level,
      weeklyXP: entry.weeklyXP,
      weeklyWorkouts: entry.weeklyWorkouts,
      weeklyVolume: entry.weeklyVolume,
      currentStreak: entry.currentStreak,
      rank,
      trend,
    };
  });
}

/**
 * Create a head-to-head challenge battle between two athletes.
 *
 * XP reward scales with duration:
 * - 7 days  = 200 XP
 * - 14 days = 400 XP
 * - 30 days = 750 XP
 *
 * Durations that don't match a predefined tier default to 200 XP.
 *
 * @param type          - The metric being competed on.
 * @param challengerId  - User ID of the challenger.
 * @param opponentId    - User ID of the opponent.
 * @param durationDays  - Length of the challenge in days.
 * @returns A new `ChallengeBattle` in `'pending'` status.
 */
export function createChallengeBattle(
  type: ChallengeBattle['type'],
  challengerId: string,
  opponentId: string,
  durationDays: number
): ChallengeBattle {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + durationDays);

  return {
    id: uuidv4(),
    type,
    challengerId,
    opponentId,
    startDate: now.toISOString(),
    endDate: end.toISOString(),
    status: 'pending',
    challengerScore: 0,
    opponentScore: 0,
    xpReward: XP_REWARD_MAP[durationDays] ?? DEFAULT_XP_REWARD,
  };
}

/**
 * Increment a participant's score in an active battle.
 *
 * Returns a **new** `ChallengeBattle` object — the original is not mutated.
 *
 * @param battle    - The battle to update.
 * @param userId    - The participant whose score should increase.
 * @param increment - The amount to add (must be >= 0).
 * @returns Updated battle with the new score.
 * @throws If the userId doesn't match either participant.
 */
export function updateBattleScore(
  battle: ChallengeBattle,
  userId: string,
  increment: number
): ChallengeBattle {
  if (userId === battle.challengerId) {
    return { ...battle, challengerScore: battle.challengerScore + increment };
  }
  if (userId === battle.opponentId) {
    return { ...battle, opponentScore: battle.opponentScore + increment };
  }
  throw new Error(
    `User "${userId}" is not a participant in battle "${battle.id}".`
  );
}

/**
 * Resolve a battle by determining the winner and marking it completed.
 *
 * - If scores are tied, no `winner` is set (draw).
 * - Returns a **new** `ChallengeBattle` object — the original is not mutated.
 *
 * @param battle - The battle to resolve.
 * @returns The completed battle with `status: 'completed'` and optional `winner`.
 */
export function resolveBattle(battle: ChallengeBattle): ChallengeBattle {
  let winner: string | undefined;

  if (battle.challengerScore > battle.opponentScore) {
    winner = battle.challengerId;
  } else if (battle.opponentScore > battle.challengerScore) {
    winner = battle.opponentId;
  }
  // Tie — winner stays undefined.

  return {
    ...battle,
    status: 'completed',
    winner,
  };
}

/**
 * Compute aggregate statistics for an entire gym.
 *
 * @param members - Array of members, each carrying their `GamificationStats`.
 * @returns A `GymStats` summary. `mostActiveMemberIndex` is the 0-based index
 *          of the member with the highest total workouts (-1 if empty).
 */
export function getGymStats(members: GymMember[]): GymStats {
  if (members.length === 0) {
    return {
      totalMembers: 0,
      totalWorkouts: 0,
      averageLevel: 0,
      totalPRs: 0,
      totalVolume: 0,
      averageStreak: 0,
      totalTrainingSessions: 0,
      totalChallengesCompleted: 0,
      mostActiveMemberIndex: -1,
    };
  }

  let totalWorkouts = 0;
  let totalLevel = 0;
  let totalPRs = 0;
  let totalVolume = 0;
  let totalStreak = 0;
  let totalTrainingSessions = 0;
  let totalChallengesCompleted = 0;
  let mostActiveMemberIndex = 0;
  let maxWorkouts = -1;

  for (let i = 0; i < members.length; i++) {
    const s = members[i].stats;
    totalWorkouts += s.totalWorkouts;
    totalLevel += s.level;
    totalPRs += s.personalRecords;
    totalVolume += s.totalVolume;
    totalStreak += s.currentStreak;
    totalTrainingSessions += s.totalTrainingSessions;
    totalChallengesCompleted += s.challengesCompleted;

    if (s.totalWorkouts > maxWorkouts) {
      maxWorkouts = s.totalWorkouts;
      mostActiveMemberIndex = i;
    }
  }

  return {
    totalMembers: members.length,
    totalWorkouts,
    averageLevel: Math.round((totalLevel / members.length) * 10) / 10,
    totalPRs,
    totalVolume,
    averageStreak: Math.round((totalStreak / members.length) * 10) / 10,
    totalTrainingSessions,
    totalChallengesCompleted,
    mostActiveMemberIndex,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Extract the numeric value used for sorting from a member, based on the
 * chosen leaderboard category.
 */
function getSortValue(
  member: LeaderboardMember,
  category: LeaderboardCategory
): number {
  switch (category) {
    case 'weekly_xp':
      return member.weeklyXP;
    case 'volume':
      return member.stats.totalVolume;
    case 'consistency':
      return member.stats.currentStreak;
    case 'prs':
      return member.stats.personalRecords;
    case 'training_sessions':
      return member.stats.totalTrainingSessions;
  }
}
