/**
 * Tool Affinity Engine
 *
 * Turns raw featureFeedback (thumbs up/down on overlay close) into
 * per-tool affinity scores that reshape the app experience:
 *
 * - Quick Access dock suggestions for empty slots
 * - "Your Top Tools" row in Explore tab
 * - Smart ordering in the dock picker
 *
 * Scoring: each thumbs-up = +1, each thumbs-down = -1.
 * Recent votes weighted 2× (last 14 days).
 * Tools the user has never voted on score 0 (neutral).
 */

import type { FeatureFeedback } from './types';

export interface ToolAffinity {
  toolId: string;
  score: number;       // net score (ups - downs, recency-weighted)
  totalVotes: number;  // total interactions
  lastUsed: number;    // ms timestamp of most recent feedback
}

const RECENCY_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const RECENCY_MULTIPLIER = 2;

/**
 * Compute affinity scores from raw feedback.
 * Returns sorted array (highest affinity first), excluding tools with 0 interactions.
 */
export function computeToolAffinity(feedback: FeatureFeedback[]): ToolAffinity[] {
  if (feedback.length === 0) return [];

  const now = Date.now();
  const map = new Map<string, { ups: number; downs: number; recentUps: number; recentDowns: number; total: number; lastUsed: number }>();

  for (const f of feedback) {
    const entry = map.get(f.feature) || { ups: 0, downs: 0, recentUps: 0, recentDowns: 0, total: 0, lastUsed: 0 };
    const ts = new Date(f.timestamp).getTime();
    const isRecent = (now - ts) < RECENCY_WINDOW_MS;

    if (f.rating === 'up') {
      entry.ups++;
      if (isRecent) entry.recentUps++;
    } else {
      entry.downs++;
      if (isRecent) entry.recentDowns++;
    }
    entry.total++;
    entry.lastUsed = Math.max(entry.lastUsed, ts);
    map.set(f.feature, entry);
  }

  const results: ToolAffinity[] = [];
  map.forEach((e, toolId) => {
    // Base score: net votes
    const baseScore = e.ups - e.downs;
    // Recency bonus: recent votes count extra
    const recentBonus = (e.recentUps - e.recentDowns) * (RECENCY_MULTIPLIER - 1);
    const score = baseScore + recentBonus;

    results.push({ toolId, score, totalVotes: e.total, lastUsed: e.lastUsed });
  });

  // Sort: highest score first, then by recency (most recent first)
  results.sort((a, b) => b.score - a.score || b.lastUsed - a.lastUsed);
  return results;
}

/**
 * Get top N tools the user loves (positive affinity only).
 */
export function getTopTools(feedback: FeatureFeedback[], n: number = 6): ToolAffinity[] {
  return computeToolAffinity(feedback).filter(t => t.score > 0).slice(0, n);
}

/**
 * Get smart suggestions for Quick Access dock empty slots.
 * Returns tool IDs the user loves that aren't already pinned.
 */
/** Starter suggestions so an empty dock offers something useful on day one. */
const STARTER_COMBAT = ['grappling', 'nutrition', 'competition', 'conditioning'];
const STARTER_GENERAL = ['nutrition', 'conditioning', 'mobility', 'builder'];

export function getDockSuggestions(
  feedback: FeatureFeedback[],
  pinnedIds: string[],
  maxSuggestions: number = 4,
  identity?: 'combat' | 'general' | string,
): string[] {
  const pinned = new Set(pinnedIds);
  const liked = computeToolAffinity(feedback)
    .filter(t => t.score > 0 && !pinned.has(t.toolId))
    .map(t => t.toolId);
  // Disliked tools are never suggested, even as a starter
  const disliked = new Set(computeToolAffinity(feedback).filter(t => t.score < 0).map(t => t.toolId));
  const starters = (identity === 'combat' ? STARTER_COMBAT : STARTER_GENERAL)
    .filter(id => !pinned.has(id) && !disliked.has(id) && !liked.includes(id));
  return [...liked, ...starters].slice(0, maxSuggestions);
}

/**
 * Sort tools by affinity, keeping the original order for unvoted tools.
 * Loved tools bubble up, disliked tools sink down.
 */
export function sortByAffinity<T extends { id: string }>(
  tools: T[],
  feedback: FeatureFeedback[]
): T[] {
  const affinity = computeToolAffinity(feedback);
  const scoreMap = new Map(affinity.map(a => [a.toolId, a.score]));

  return [...tools].sort((a, b) => {
    const sa = scoreMap.get(a.id) ?? 0;
    const sb = scoreMap.get(b.id) ?? 0;
    return sb - sa; // Higher score first
  });
}
