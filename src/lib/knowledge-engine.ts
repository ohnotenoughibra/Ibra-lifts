/**
 * Knowledge Engine — Contextual Insight Delivery
 *
 * First principles:
 * 1. Context > Content — right knowledge at the right moment
 * 2. Pull > Push — spark curiosity, never force-feed
 * 3. Bite-size > Long-form — 15-second insight cards beat 10-minute articles
 * 4. Spaced repetition — important concepts resurface across days
 * 5. Connected to YOUR data — insights reference what you're actually doing
 */

import type { ContentCategory } from './types';
import type { TodayType } from './daily-directive';

// ── Types ───────────────────────────────────────────────────────────────────

export interface Insight {
  id: string;
  /** Short, punchy headline (≤8 words) */
  headline: string;
  /** 1-2 sentence body — the actual teaching moment */
  body: string;
  /** Which topic bucket */
  category: ContentCategory;
  /** When is this insight most relevant? */
  context: InsightContext[];
  /** Optional article ID for "learn more" deep-dive */
  articleId?: string;
  /** Source attribution (study, researcher, etc.) */
  source?: string;
  /** Tags for search/filtering */
  tags: string[];
}

export type InsightContext =
  | 'lift_day'       // User has a lift session today
  | 'rest_day'       // Rest/recovery day
  | 'combat_day'     // Combat training scheduled
  | 'post_workout'   // Just finished a session
  | 'morning'        // Before noon
  | 'evening'        // After 6pm
  | 'deload_week'    // In a deload
  | 'cutting'        // Active diet cut phase
  | 'bulking'        // Active bulk phase
  | 'low_readiness'  // Readiness < 50
  | 'high_readiness' // Readiness > 80
  | 'injured'        // Has active injuries
  | 'fight_camp'     // In competition prep
  | 'new_block'      // First 2 weeks of mesocycle
  | 'any';           // Always eligible

export interface InsightPickerInput {
  todayType: TodayType;
  readinessScore: number;
  isDeload: boolean;
  hasFightCamp: boolean;
  hasActiveInjury: boolean;
  activeDietPhase: 'cut' | 'bulk' | 'maintain' | null;
  mesocycleWeek: number | null; // week number within current block
  hasCompletedWorkoutToday: boolean;
  seenInsightIds: string[];
  dismissedInsightIds: string[];
  bookmarkedInsightIds: string[];
}

// ── Insight Picker ──────────────────────────────────────────────────────────

/**
 * Pick the best insight for RIGHT NOW.
 *
 * Scoring: each insight gets a relevance score based on how many of its
 * context tags match the current user state. Higher = shown first.
 * Already-seen insights get deprioritized (not excluded — spaced repetition).
 */
export function pickContextualInsight(
  insights: Insight[],
  input: InsightPickerInput
): Insight | null {
  if (insights.length === 0) return null;

  const now = new Date();
  const hour = now.getHours();

  // Build the set of active contexts
  const activeContexts = new Set<InsightContext>(['any']);

  // Day type
  if (input.todayType === 'lift' || input.todayType === 'both') activeContexts.add('lift_day');
  if (input.todayType === 'combat' || input.todayType === 'both') activeContexts.add('combat_day');
  if (input.todayType === 'rest' || input.todayType === 'recovery') activeContexts.add('rest_day');

  // Time of day
  if (hour < 12) activeContexts.add('morning');
  if (hour >= 18) activeContexts.add('evening');

  // Training state
  if (input.hasCompletedWorkoutToday) activeContexts.add('post_workout');
  if (input.isDeload) activeContexts.add('deload_week');
  if (input.hasFightCamp) activeContexts.add('fight_camp');
  if (input.hasActiveInjury) activeContexts.add('injured');

  // Readiness
  if (input.readinessScore < 50) activeContexts.add('low_readiness');
  if (input.readinessScore > 80) activeContexts.add('high_readiness');

  // Diet phase
  if (input.activeDietPhase === 'cut') activeContexts.add('cutting');
  if (input.activeDietPhase === 'bulk') activeContexts.add('bulking');

  // Mesocycle phase
  if (input.mesocycleWeek !== null && input.mesocycleWeek <= 2) activeContexts.add('new_block');

  // Score each insight
  const dismissed = new Set(input.dismissedInsightIds);
  const seen = new Set(input.seenInsightIds);

  const scored = insights
    .filter(i => !dismissed.has(i.id))
    .map(i => {
      // Context relevance: how many of this insight's contexts match?
      const matchCount = i.context.filter(c => activeContexts.has(c)).length;
      const totalContexts = i.context.length;

      // If zero matches and insight isn't "any", skip it
      if (matchCount === 0) return { insight: i, score: -1 };

      // Base score: proportion of contexts that match (0-1)
      let score = totalContexts > 0 ? matchCount / totalContexts : 0;

      // Bonus for specific (non-"any") context matches
      const specificMatches = i.context.filter(c => c !== 'any' && activeContexts.has(c)).length;
      score += specificMatches * 0.3;

      // Penalty for already-seen (spaced repetition — don't exclude, just deprioritize)
      if (seen.has(i.id)) score -= 0.5;

      return { insight: i, score };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;

  // Pick from top 3 with slight randomization (prevents same insight every time at same score)
  const topN = scored.slice(0, Math.min(3, scored.length));
  const pick = topN[Math.floor(Math.random() * topN.length)];

  return pick.insight;
}

/**
 * Get today's date string for tracking daily insight rotation.
 */
export function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Pick an insight specifically for a category (for the library's "Today's Pick" feature).
 */
export function pickCategoryInsight(
  insights: Insight[],
  category: ContentCategory,
  seenIds: string[]
): Insight | null {
  const seen = new Set(seenIds);
  const candidates = insights.filter(i => i.category === category && !seen.has(i.id));
  if (candidates.length === 0) {
    // Fall back to any in category
    const all = insights.filter(i => i.category === category);
    return all.length > 0 ? all[Math.floor(Math.random() * all.length)] : null;
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}
