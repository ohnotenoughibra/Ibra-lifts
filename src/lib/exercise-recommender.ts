/**
 * Exercise Recommender — bridges the Performance Model with the Workout Generator.
 *
 * Uses per-exercise performance profiles (e1RM trends, volume response, fatigue
 * sensitivity) to produce scoring adjustments that the workout generator can
 * apply when selecting exercises for a session.
 *
 * All functions are pure — no React, no store, no side-effects.
 */

import type { WorkoutLog, MovementPattern } from './types';
import {
  buildPerformanceProfiles,
  findStrongestLifts,
  findWeakLinks,
  getProgressionRate,
  type ExercisePerformanceProfile,
  type WeakLink,
} from './performance-model';
import { getExerciseById } from './exercises';

// ─── Exported Interfaces ────────────────────────────────────────────────────

/**
 * A scoring adjustment for a single exercise, applied on top of the workout
 * generator's base `scoreExercise` logic. Values range from -5 to +5.
 */
export interface ExerciseScoreAdjustment {
  exerciseId: string;
  exerciseName: string;
  /** Additive modifier applied to the exercise selection score (-5 to +5). */
  adjustment: number;
  /** Human-readable explanation for why the adjustment was made. */
  reason: string;
}

/**
 * Controls which recommendation strategies are active.
 * All flags default to `true` when omitted.
 */
export interface RecommendationContext {
  /** Boost exercises the user responds well to (rising e1RM trend). */
  prioritizeResponders: boolean;
  /** Boost exercises that target identified weak points / imbalances. */
  addressWeakLinks: boolean;
  /** Penalize exercises that have stalled or are declining. */
  avoidPlateaus: boolean;
  /** Boost exercises not used recently; penalize overused ones. */
  freshnessBias: boolean;
}

/** A ranked exercise candidate with a composite score and human-readable insights. */
export interface RankedExercise {
  exerciseId: string;
  score: number;
  insights: string[];
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

/** Merge partial context with defaults (all strategies enabled). */
function resolveContext(partial?: Partial<RecommendationContext>): RecommendationContext {
  return {
    prioritizeResponders: true,
    addressWeakLinks: true,
    avoidPlateaus: true,
    freshnessBias: true,
    ...partial,
  };
}

/** Number of milliseconds in 4 weeks. */
const FOUR_WEEKS_MS = 4 * 7 * 24 * 60 * 60 * 1000;

/**
 * Build a map of exerciseId -> date of most recent use (epoch ms) and a count
 * of how many of the last N sessions include the exercise.
 */
function buildRecencyMap(
  workoutLogs: WorkoutLog[],
): Map<string, { lastUsedMs: number; recentCount: number }> {
  const map = new Map<string, { lastUsedMs: number; recentCount: number }>();

  // Sort descending so we can count the most recent sessions first
  const sorted = [...workoutLogs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  // Consider the last 8 sessions for "recent count"
  const recentSessions = sorted.slice(0, 8);

  for (const log of sorted) {
    const dateMs = new Date(log.date).getTime();
    for (const ex of log.exercises) {
      const existing = map.get(ex.exerciseId);
      if (!existing || dateMs > existing.lastUsedMs) {
        map.set(ex.exerciseId, {
          lastUsedMs: dateMs,
          recentCount: existing?.recentCount ?? 0,
        });
      }
    }
  }

  // Count appearances in the most recent 8 sessions
  for (const log of recentSessions) {
    for (const ex of log.exercises) {
      const existing = map.get(ex.exerciseId);
      if (existing) {
        existing.recentCount++;
      }
    }
  }

  return map;
}

/**
 * Map a weak link to the movement pattern it implies, so we can boost
 * exercises that address the weakness.
 */
function weakLinkToPattern(wl: WeakLink): MovementPattern | null {
  // Pattern-level imbalances reference the pattern directly
  if (wl.exerciseId === 'pattern-imbalance-pull') return 'pull';
  if (wl.exerciseId === 'pattern-imbalance-push') return 'push';
  // Muscle-level imbalances map to dominant movement patterns
  if (wl.exerciseId === 'muscle-imbalance-hamstrings') return 'hinge';
  if (wl.exerciseId === 'muscle-imbalance-quadriceps') return 'squat';
  // Per-exercise weak links: look up the exercise's movement pattern
  const exercise = getExerciseById(wl.exerciseId);
  return exercise?.movementPattern ?? null;
}

// ─── Exported Functions ─────────────────────────────────────────────────────

/**
 * Analyze the user's workout history and return exercise-specific scoring
 * adjustments that can be layered onto the workout generator's selection logic.
 *
 * Each adjustment is an additive modifier (clamped to -5..+5) with a reason
 * string explaining the recommendation.
 *
 * @param workoutLogs  - The user's complete workout history.
 * @param context      - Optional flags controlling which strategies to apply.
 * @returns An array of adjustments (one per exercise that warrants a change).
 */
export function getExerciseAdjustments(
  workoutLogs: WorkoutLog[],
  context?: Partial<RecommendationContext>,
): ExerciseScoreAdjustment[] {
  if (!workoutLogs || workoutLogs.length === 0) return [];

  const ctx = resolveContext(context);
  const adjustments: ExerciseScoreAdjustment[] = [];

  // ── Build performance profiles ──
  const profiles = buildPerformanceProfiles(workoutLogs);
  const weakLinks = ctx.addressWeakLinks ? findWeakLinks(workoutLogs) : [];
  const recencyMap = ctx.freshnessBias ? buildRecencyMap(workoutLogs) : new Map();
  const nowMs = Date.now();

  // Collect all weak-link movement patterns for cross-referencing
  const weakPatterns = new Set<MovementPattern>();
  for (const wl of weakLinks) {
    const pattern = weakLinkToPattern(wl);
    if (pattern) weakPatterns.add(pattern);
  }

  // ── Per-exercise trend-based adjustments ──
  for (const profile of profiles) {
    // Skip exercises with too little data for meaningful recommendation
    if (profile.dataPoints < 3) continue;

    let totalAdj = 0;
    const reasons: string[] = [];

    // 1. Trend-based scoring
    if (profile.estimated1RM.trend === 'rising' && ctx.prioritizeResponders) {
      totalAdj += 3;
      reasons.push('You respond well to this exercise');
    }
    if (profile.estimated1RM.trend === 'plateau' && ctx.avoidPlateaus) {
      totalAdj -= 2;
      reasons.push('Consider rotating \u2014 progress has stalled');
    }
    if (profile.estimated1RM.trend === 'declining' && ctx.avoidPlateaus) {
      totalAdj -= 3;
      reasons.push('Declining returns \u2014 try an alternative');
    }

    // 2. Weak-link pattern boost: if this exercise's movement pattern matches
    //    an identified weakness, nudge the user toward it.
    if (ctx.addressWeakLinks && weakPatterns.size > 0) {
      const exercise = getExerciseById(profile.exerciseId);
      if (exercise && weakPatterns.has(exercise.movementPattern)) {
        totalAdj += 2;
        reasons.push(`Addresses ${exercise.movementPattern} imbalance`);
      }
    }

    // 3. Freshness bias
    if (ctx.freshnessBias) {
      const recency = recencyMap.get(profile.exerciseId);
      if (recency) {
        const msSinceLastUse = nowMs - recency.lastUsedMs;
        if (msSinceLastUse >= FOUR_WEEKS_MS) {
          totalAdj += 1;
          reasons.push('Fresh stimulus');
        }
        if (recency.recentCount >= 7) {
          // Present in nearly every one of the last 8 sessions
          totalAdj -= 1;
          reasons.push('Consider variety');
        }
      }
    }

    // Only emit an adjustment if there's actually something to report
    if (totalAdj !== 0 && reasons.length > 0) {
      adjustments.push({
        exerciseId: profile.exerciseId,
        exerciseName: profile.exerciseName,
        adjustment: Math.max(-5, Math.min(5, totalAdj)),
        reason: reasons.join('; '),
      });
    }
  }

  // ── Weak-link imbalance adjustments for exercises NOT already profiled ──
  // (e.g., pattern-imbalance-pull has no real exerciseId in profiles, but we
  //  still want to emit adjustments for exercises that could help)
  // These are already handled by the weakPatterns cross-reference above.

  return adjustments;
}

/**
 * Rank a set of candidate exercises by how well the user responds to them.
 *
 * Scoring components:
 * - e1RM trend: rising +3, plateau 0, declining -2
 * - Volume response: high +2, moderate 0, low -1
 * - Fatigue sensitivity: low +1 (easier to program), high -1 (needs careful placement)
 * - Progression rate bonus: above 0.5%/week adds +1
 *
 * @param workoutLogs        - The user's complete workout history.
 * @param candidateExerciseIds - Exercise IDs to evaluate and rank.
 * @returns Candidates sorted by score (descending) with insight strings.
 */
export function getPersonalizedExerciseRanking(
  workoutLogs: WorkoutLog[],
  candidateExerciseIds: string[],
): RankedExercise[] {
  if (!workoutLogs || workoutLogs.length === 0 || candidateExerciseIds.length === 0) {
    return candidateExerciseIds.map(id => ({ exerciseId: id, score: 0, insights: ['No workout history available'] }));
  }

  const profiles = buildPerformanceProfiles(workoutLogs);
  const profileMap = new Map<string, ExercisePerformanceProfile>();
  for (const p of profiles) {
    profileMap.set(p.exerciseId, p);
  }

  const ranked: RankedExercise[] = candidateExerciseIds.map(exerciseId => {
    const profile = profileMap.get(exerciseId);
    const insights: string[] = [];
    let score = 0;

    if (!profile || profile.dataPoints < 3) {
      insights.push('Insufficient data \u2014 try this exercise to build a profile');
      return { exerciseId, score: 0, insights };
    }

    // e1RM trend
    if (profile.estimated1RM.trend === 'rising') {
      score += 3;
      insights.push('e1RM trending upward');
    } else if (profile.estimated1RM.trend === 'plateau') {
      // no score change
      insights.push('e1RM has plateaued');
    } else {
      score -= 2;
      insights.push('e1RM declining');
    }

    // Volume response
    if (profile.volumeResponse === 'high') {
      score += 2;
      insights.push('Responds well to higher volume');
    } else if (profile.volumeResponse === 'low') {
      score -= 1;
      insights.push('Diminishing returns from extra volume');
    }

    // Fatigue sensitivity
    if (profile.fatigueSensitivity === 'low') {
      score += 1;
      insights.push('Low fatigue sensitivity \u2014 versatile placement');
    } else if (profile.fatigueSensitivity === 'high') {
      score -= 1;
      insights.push('High fatigue sensitivity \u2014 place early in session');
    }

    // Progression rate bonus
    const rate = getProgressionRate(exerciseId, workoutLogs);
    if (rate.weeklyGainPercent > 0.5) {
      score += 1;
      insights.push(`Gaining ${rate.weeklyGainPercent.toFixed(1)}%/week`);
    } else if (rate.weeklyGainPercent < -0.3) {
      insights.push(`Losing ${Math.abs(rate.weeklyGainPercent).toFixed(1)}%/week`);
    }

    return { exerciseId, score, insights };
  });

  // Sort descending by score, then alphabetically by exerciseId for stability
  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.exerciseId.localeCompare(b.exerciseId);
  });

  return ranked;
}

/**
 * Return a one-line insight about the user's relationship with a specific
 * exercise, suitable for display in exercise selection UI.
 *
 * @param workoutLogs - The user's complete workout history.
 * @param exerciseId  - The exercise to generate an insight for.
 * @returns A single insight string, or `null` if there are fewer than 3 sessions.
 *
 * @example
 * getExerciseInsight(logs, 'bench-press')
 * // => "Bench Press: Strong responder \u2014 e1RM up 8.2% over 6 weeks"
 *
 * getExerciseInsight(logs, 'romanian-deadlift')
 * // => "Romanian Deadlift: Plateau detected \u2014 consider switching to trap bar deadlift"
 */
export function getExerciseInsight(
  workoutLogs: WorkoutLog[],
  exerciseId: string,
): string | null {
  if (!workoutLogs || workoutLogs.length === 0) return null;

  const profiles = buildPerformanceProfiles(workoutLogs);
  const profile = profiles.find(p => p.exerciseId === exerciseId);

  if (!profile || profile.dataPoints < 3) return null;

  const name = profile.exerciseName;
  const rate = getProgressionRate(exerciseId, workoutLogs);
  const trend = profile.estimated1RM.trend;

  // ── Rising trend ──
  if (trend === 'rising') {
    const gainStr = Math.abs(rate.totalGainPercent).toFixed(1);
    const weeksStr = Math.max(1, Math.round(Math.abs(rate.totalGainPercent / Math.max(0.01, rate.weeklyGainPercent))));
    return `${name}: Strong responder \u2014 e1RM up ${gainStr}% over ${weeksStr} weeks`;
  }

  // ── Declining trend ──
  if (trend === 'declining') {
    // Suggest an alternative if one is available via the exercise DB
    const exercise = getExerciseById(exerciseId);
    if (exercise) {
      // Find a same-pattern alternative to suggest
      const alternatives = findAlternativeExerciseName(exercise.movementPattern, exerciseId);
      if (alternatives) {
        return `${name}: Declining \u2014 consider switching to ${alternatives}`;
      }
    }
    return `${name}: Declining \u2014 reassess technique or try a variation`;
  }

  // ── Plateau ──
  if (trend === 'plateau') {
    const exercise = getExerciseById(exerciseId);
    if (exercise) {
      const alternatives = findAlternativeExerciseName(exercise.movementPattern, exerciseId);
      if (alternatives) {
        return `${name}: Plateau detected \u2014 consider switching to ${alternatives}`;
      }
    }
    return `${name}: Plateau detected \u2014 try varying rep ranges or adding intensity techniques`;
  }

  return null;
}

// ─── Private: find a named alternative for insight text ─────────────────────

/**
 * Find the name of an alternative exercise with the same movement pattern,
 * for use in insight strings. Returns null if no alternative is found.
 */
function findAlternativeExerciseName(
  pattern: MovementPattern,
  excludeId: string,
): string | null {
  // We import exercises indirectly via getExerciseById to avoid pulling
  // the entire 3900-line file. Instead, we check a few well-known IDs.
  // This is intentionally lightweight — a full search would be expensive.
  const wellKnownAlternatives: Record<MovementPattern, string[]> = {
    push: ['barbell-bench-press', 'dumbbell-bench-press', 'overhead-press', 'incline-bench-press'],
    pull: ['barbell-row', 'pull-up', 'cable-row', 'dumbbell-row'],
    squat: ['barbell-back-squat', 'front-squat', 'goblet-squat', 'leg-press'],
    hinge: ['conventional-deadlift', 'trap-bar-deadlift', 'romanian-deadlift', 'hip-thrust'],
    carry: ['farmers-walk', 'suitcase-carry', 'overhead-carry'],
    rotation: ['cable-woodchop', 'landmine-rotation', 'russian-twist'],
    explosive: ['box-jump', 'power-clean', 'push-press', 'kettlebell-swing'],
  };

  const candidates = wellKnownAlternatives[pattern] ?? [];
  for (const id of candidates) {
    if (id === excludeId) continue;
    const ex = getExerciseById(id);
    if (ex) return ex.name;
  }

  return null;
}
