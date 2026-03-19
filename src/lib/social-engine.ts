/**
 * Social Engine — Community features for combat sports athletes
 *
 * Gym leaderboards, friend challenges, and activity feed generation.
 * Designed for local-first architecture: data structures stored in user state,
 * synced via existing JSONB sync system, resolved server-side.
 *
 * Pure functions only — no React, no store, no side effects.
 */

import { v4 as uuidv4 } from 'uuid';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface GymProfile {
  id: string;
  name: string;
  createdBy: string; // userId
  memberCount: number;
  isPublic: boolean;
  createdAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  level: number;
  weeklyXP: number;
  totalXP: number;
  streak: number;
  topLift?: { exercise: string; weight: number; unit: string };
  weeklyVolume: number; // total sets
  sport?: string;
}

export type ChallengeType = 'volume' | 'strength' | 'consistency' | 'conditioning';
export type ChallengeStatus = 'pending' | 'active' | 'completed' | 'expired';

export interface Challenge {
  id: string;
  type: ChallengeType;
  title: string;
  description: string;
  creatorId: string;
  participantIds: string[];
  target: number;
  unit: string;
  startDate: string;
  endDate: string;
  status: ChallengeStatus;
  leaderboard: ChallengeProgress[];
}

export interface ChallengeProgress {
  userId: string;
  progress: number;
  completedAt?: string;
}

export type ActivityFeedType =
  | 'pr'
  | 'badge'
  | 'streak'
  | 'challenge_complete'
  | 'workout'
  | 'level_up';

export interface ActivityFeedItem {
  id: string;
  userId: string;
  displayName: string;
  type: ActivityFeedType;
  title: string;
  detail: string;
  timestamp: string;
  reactions: { userId: string; emoji: string }[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const ACTIVITY_TITLES: Record<ActivityFeedType, string> = {
  pr: 'New Personal Record',
  badge: 'Badge Earned',
  streak: 'Streak Milestone',
  challenge_complete: 'Challenge Completed',
  workout: 'Workout Completed',
  level_up: 'Level Up',
};

// ═══════════════════════════════════════════════════════════════════════════════
// Leaderboard
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Rank leaderboard entries by the given criteria.
 * Returns a new sorted array (does not mutate input).
 *
 * Sort strategies:
 *  - xp: weeklyXP desc, then totalXP desc as tiebreaker
 *  - volume: weeklyVolume desc, then weeklyXP desc
 *  - streak: streak desc, then weeklyXP desc
 *  - strength: topLift weight desc (entries without topLift sorted last)
 */
export function rankLeaderboard(
  entries: LeaderboardEntry[],
  sortBy: 'xp' | 'volume' | 'streak' | 'strength',
): LeaderboardEntry[] {
  const sorted = [...entries];

  switch (sortBy) {
    case 'xp':
      sorted.sort((a, b) => b.weeklyXP - a.weeklyXP || b.totalXP - a.totalXP);
      break;

    case 'volume':
      sorted.sort((a, b) => b.weeklyVolume - a.weeklyVolume || b.weeklyXP - a.weeklyXP);
      break;

    case 'streak':
      sorted.sort((a, b) => b.streak - a.streak || b.weeklyXP - a.weeklyXP);
      break;

    case 'strength': {
      sorted.sort((a, b) => {
        const aWeight = a.topLift?.weight ?? -1;
        const bWeight = b.topLift?.weight ?? -1;
        return bWeight - aWeight || b.weeklyXP - a.weeklyXP;
      });
      break;
    }
  }

  return sorted;
}

/**
 * Build a leaderboard entry from user stats.
 * Convenience constructor — avoids callers having to assemble the shape manually.
 */
export function getWeeklyLeaderboardEntry(params: {
  userId: string;
  displayName: string;
  level: number;
  weeklyXP: number;
  totalXP: number;
  streak: number;
  weeklyVolume: number;
  topLift?: { exercise: string; weight: number; unit: string };
  sport?: string;
}): LeaderboardEntry {
  return {
    userId: params.userId,
    displayName: params.displayName,
    level: params.level,
    weeklyXP: params.weeklyXP,
    totalXP: params.totalXP,
    streak: params.streak,
    weeklyVolume: params.weeklyVolume,
    topLift: params.topLift,
    sport: params.sport,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Challenges
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new challenge. Generates ID, sets dates, initializes empty leaderboard.
 * The creator is automatically added as the first participant.
 */
export function createChallenge(params: {
  type: ChallengeType;
  title: string;
  description: string;
  target: number;
  unit: string;
  durationDays: number;
  creatorId: string;
}): Challenge {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + params.durationDays);

  return {
    id: uuidv4(),
    type: params.type,
    title: params.title,
    description: params.description,
    creatorId: params.creatorId,
    participantIds: [params.creatorId],
    target: params.target,
    unit: params.unit,
    startDate: now.toISOString(),
    endDate: end.toISOString(),
    status: 'active',
    leaderboard: [{ userId: params.creatorId, progress: 0 }],
  };
}

/**
 * Update a participant's progress in a challenge.
 * If the user isn't in the leaderboard yet, they're added.
 * If progress meets/exceeds target, completedAt is stamped.
 * If all participants have completed, challenge status flips to 'completed'.
 *
 * Returns a new Challenge object (immutable update).
 */
export function updateChallengeProgress(
  challenge: Challenge,
  userId: string,
  newProgress: number,
): Challenge {
  const now = new Date().toISOString();
  const clampedProgress = Math.max(0, newProgress);

  // Find or create entry
  let found = false;
  const updatedLeaderboard = challenge.leaderboard.map((entry) => {
    if (entry.userId !== userId) return entry;
    found = true;
    const completed = clampedProgress >= challenge.target;
    return {
      ...entry,
      progress: clampedProgress,
      completedAt: completed ? (entry.completedAt ?? now) : entry.completedAt,
    };
  });

  if (!found) {
    const completed = clampedProgress >= challenge.target;
    updatedLeaderboard.push({
      userId,
      progress: clampedProgress,
      completedAt: completed ? now : undefined,
    });
  }

  // Add to participants if not already there
  const participantIds = challenge.participantIds.includes(userId)
    ? challenge.participantIds
    : [...challenge.participantIds, userId];

  // Check if all participants completed
  const allDone =
    participantIds.length > 0 &&
    participantIds.every((pid) =>
      updatedLeaderboard.some((e) => e.userId === pid && e.completedAt),
    );

  return {
    ...challenge,
    participantIds,
    leaderboard: updatedLeaderboard,
    status: allDone ? 'completed' : challenge.status,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Activity Feed
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a single activity feed item. Title is inferred from type.
 * The caller provides userId, displayName, type, and a human-readable detail string.
 */
export function generateActivityFeedItem(params: {
  userId: string;
  displayName: string;
  type: ActivityFeedType;
  detail: string;
}): ActivityFeedItem {
  return {
    id: uuidv4(),
    userId: params.userId,
    displayName: params.displayName,
    type: params.type,
    title: ACTIVITY_TITLES[params.type],
    detail: params.detail,
    timestamp: new Date().toISOString(),
    reactions: [],
  };
}
