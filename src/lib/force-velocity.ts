/**
 * Force-Velocity Profiling Engine
 *
 * Categorizes the athlete's strength profile along the force-velocity
 * continuum and prescribes corrective exercise emphasis.
 *
 * Science:
 * - Samozino et al. 2012, 2016: Force-velocity profiling determines optimal
 *   training for ballistic performance
 * - Jiménez-Reyes et al. 2017: Individualized F-V training improves jump
 *   performance 2x more than generic training
 * - Morin & Samozino 2016: The Force-Velocity-Power approach for individual
 *   exercise prescription
 * - Helms et al. 2016: RPE-based load prescription correlates with %1RM
 *
 * Without a velocity sensor: we estimate the profile from the user's
 * strength-to-speed exercise ratio — comparing maximal lifts (force end)
 * to explosive/speed exercises (velocity end).
 *
 * All functions are pure — no side effects, no store, no React.
 */

import type { WorkoutLog, BaselineLifts, GoalFocus } from './types';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ForceVelocityProfile = 'force_dominant' | 'velocity_dominant' | 'balanced';

export interface FVProfileResult {
  /** Where the athlete sits on the F-V curve. */
  profile: ForceVelocityProfile;
  /**
   * Force-Velocity Imbalance Score (-100 to +100).
   * Negative = force-dominant (strong but slow).
   * Positive = velocity-dominant (fast but weak).
   * Near 0 = balanced.
   */
  imbalance: number;
  /** Confidence in the profile. */
  confidence: 'low' | 'medium' | 'high';
  /** What to prescribe to correct the imbalance. */
  prescription: FVPrescription;
  /** Human-readable explanation. */
  explanation: string;
}

export interface FVPrescription {
  /** Percentage of training that should be force-focused (heavy, slow). */
  forcePercent: number;
  /** Percentage that should be velocity-focused (light, explosive). */
  velocityPercent: number;
  /** Percentage that should be balanced/moderate. */
  balancedPercent: number;
  /** Specific exercise recommendations. */
  exerciseFocus: string[];
  /** Suggested rep ranges. */
  repRanges: string;
  /** Suggested rest periods. */
  restPeriods: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Strength standards by bodyweight ratio (intermediate male, ~80kg).
 * Used to normalize relative strength for profile calculation.
 * Female ratios are ~65-75% of male per Nuckols 2019 strength standards.
 */
const FORCE_EXERCISES = new Set([
  'deadlift', 'squat', 'bench press', 'back squat', 'front squat',
  'barbell row', 'overhead press', 'hip thrust',
]);

const VELOCITY_EXERCISES = new Set([
  'jump squat', 'box jump', 'power clean', 'hang clean', 'snatch',
  'push press', 'medicine ball throw', 'plyometric push-up',
  'jump deadlift', 'kettlebell swing', 'broad jump',
]);

// ─── Profile Estimation ──────────────────────────────────────────────────────

/**
 * Estimate the athlete's force-velocity profile from training data.
 *
 * Without velocity sensors, we use two proxies:
 * 1. Relative strength (1RM / bodyweight) — higher = more force-dominant
 * 2. Performance on explosive exercises — RPE patterns suggest speed capacity
 *
 * @param logs - Recent workout logs (8+ weeks recommended)
 * @param baseline - Current 1RM estimates
 * @param bodyWeightKg - Athlete's body weight
 * @param sex - Biological sex (adjusts standards)
 */
export function estimateForceVelocityProfile(
  logs: WorkoutLog[],
  baseline: BaselineLifts | null,
  bodyWeightKg: number,
  sex: 'male' | 'female' = 'male',
): FVProfileResult {
  // Calculate relative strength score (force side)
  const forceScore = calculateForceScore(baseline, bodyWeightKg, sex);

  // Calculate velocity/explosiveness score from exercise patterns
  const velocityScore = calculateVelocityScore(logs);

  // Imbalance: negative = force-dominant, positive = velocity-dominant
  const imbalance = velocityScore - forceScore;

  // Profile classification
  const profile: ForceVelocityProfile =
    imbalance < -15 ? 'force_dominant' :
    imbalance > 15 ? 'velocity_dominant' :
    'balanced';

  // Confidence
  const dataWeeks = estimateDataWeeks(logs);
  const confidence: 'low' | 'medium' | 'high' =
    dataWeeks >= 12 && baseline != null ? 'high' :
    dataWeeks >= 6 ? 'medium' :
    'low';

  // Prescription
  const prescription = generatePrescription(profile, imbalance);

  // Explanation
  const explanation = generateExplanation(profile, forceScore, velocityScore, confidence);

  return { profile, imbalance, confidence, prescription, explanation };
}

/**
 * Adjust exercise selection based on F-V profile.
 *
 * @param profile - The athlete's F-V profile
 * @param currentGoal - Their current training goal
 * @returns Weight to apply to force vs velocity exercises in selection
 */
export function getExerciseSelectionWeights(
  profile: ForceVelocityProfile,
  currentGoal: GoalFocus,
): { forceWeight: number; velocityWeight: number } {
  // Base weights from goal
  const goalWeights: Record<GoalFocus, { forceWeight: number; velocityWeight: number }> = {
    strength: { forceWeight: 0.7, velocityWeight: 0.3 },
    hypertrophy: { forceWeight: 0.5, velocityWeight: 0.5 },
    power: { forceWeight: 0.4, velocityWeight: 0.6 },
    balanced: { forceWeight: 0.5, velocityWeight: 0.5 },
    strength_endurance: { forceWeight: 0.4, velocityWeight: 0.6 }, // Favor velocity — sustained output > max force
  };

  const base = goalWeights[currentGoal];

  // Correct imbalance: shift toward weaker quality
  switch (profile) {
    case 'force_dominant':
      // Strong but slow → add more velocity work
      return {
        forceWeight: Math.max(0.2, base.forceWeight - 0.15),
        velocityWeight: Math.min(0.8, base.velocityWeight + 0.15),
      };
    case 'velocity_dominant':
      // Fast but weak → add more strength work
      return {
        forceWeight: Math.min(0.8, base.forceWeight + 0.15),
        velocityWeight: Math.max(0.2, base.velocityWeight - 0.15),
      };
    case 'balanced':
      return base;
  }
}

// ─── Internal Scoring ────────────────────────────────────────────────────────

function calculateForceScore(
  baseline: BaselineLifts | null,
  bodyWeightKg: number,
  sex: 'male' | 'female',
): number {
  if (!baseline || bodyWeightKg <= 0) return 50; // Neutral

  // Relative strength: sum of big 3 / bodyweight
  const squat = baseline.squat || 0;
  const bench = baseline.benchPress || 0;
  const deadlift = baseline.deadlift || 0;
  const total = squat + bench + deadlift;

  if (total === 0) return 50;

  const relativeStrength = total / bodyWeightKg;

  // Scoring: relative strength to 0-100 scale
  // Male intermediate: ~5.0 wilks-equivalent (S+B+D / BW)
  // Female intermediate: ~3.5
  const standard = sex === 'female' ? 3.5 : 5.0;
  const score = Math.min(100, Math.max(0, (relativeStrength / standard) * 60));

  return Math.round(score);
}

function calculateVelocityScore(logs: WorkoutLog[]): number {
  if (logs.length === 0) return 50;

  let velocityExerciseCount = 0;
  let totalExercises = 0;
  let avgExplosiveRPE = 0;
  let explosiveRPECount = 0;

  for (const log of logs) {
    for (const ex of log.exercises) {
      totalExercises++;
      const name = (ex.exerciseName || '').toLowerCase();

      // Check if this is a velocity-type exercise
      const isVelocity = Array.from(VELOCITY_EXERCISES).some(ve => name.includes(ve));
      if (isVelocity) {
        velocityExerciseCount++;
        // Lower RPE on explosive exercises = better speed capacity
        for (const set of ex.sets) {
          if (set.rpe) {
            avgExplosiveRPE += set.rpe;
            explosiveRPECount++;
          }
        }
      }
    }
  }

  // Two components:
  // 1. Proportion of velocity exercises in training (0-50)
  const velocityProportion = totalExercises > 0
    ? (velocityExerciseCount / totalExercises) * 100
    : 0;
  const proportionScore = Math.min(50, velocityProportion * 5);

  // 2. RPE on explosive exercises — lower RPE = better speed (0-50)
  let rpeScore = 25; // Neutral
  if (explosiveRPECount > 0) {
    const avgRPE = avgExplosiveRPE / explosiveRPECount;
    // RPE 6 = excellent speed capacity (50), RPE 9 = poor (10)
    rpeScore = Math.max(10, Math.min(50, (10 - avgRPE) * 15));
  }

  return Math.round(proportionScore + rpeScore);
}

function estimateDataWeeks(logs: WorkoutLog[]): number {
  if (logs.length === 0) return 0;
  const dates = logs.map(l => new Date(l.date).getTime());
  if (dates.length === 0) return 0;
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  return Math.round((maxDate - minDate) / (7 * 24 * 60 * 60 * 1000));
}

function generatePrescription(
  profile: ForceVelocityProfile,
  imbalance: number,
): FVPrescription {
  switch (profile) {
    case 'force_dominant':
      return {
        forcePercent: 40,
        velocityPercent: 40,
        balancedPercent: 20,
        exerciseFocus: [
          'Jump squats (40-60% 1RM)',
          'Power cleans / hang cleans',
          'Medicine ball throws',
          'Plyometric push-ups',
          'Kettlebell swings (explosive)',
          'Box jumps (max height)',
        ],
        repRanges: '2-5 reps at 50-70% 1RM with maximal intent',
        restPeriods: '2-3 min (full CNS recovery for speed quality)',
      };

    case 'velocity_dominant':
      return {
        forcePercent: 45,
        velocityPercent: 25,
        balancedPercent: 30,
        exerciseFocus: [
          'Back squat (85-95% 1RM)',
          'Deadlift (heavy singles/doubles)',
          'Bench press (3-5RM work)',
          'Barbell rows (heavy, controlled)',
          'Weighted pull-ups',
          'Heavy sled pushes',
        ],
        repRanges: '1-5 reps at 85-95% 1RM',
        restPeriods: '3-5 min (full phosphocreatine recovery)',
      };

    case 'balanced':
      return {
        forcePercent: 35,
        velocityPercent: 35,
        balancedPercent: 30,
        exerciseFocus: [
          'Maintain variety across force-velocity spectrum',
          'Alternate heavy and explosive blocks',
          'Complex training: heavy set → explosive set (same pattern)',
        ],
        repRanges: 'Mix of 1-5 heavy, 3-6 explosive, 6-12 moderate',
        restPeriods: '2-4 min based on exercise type',
      };
  }
}

function generateExplanation(
  profile: ForceVelocityProfile,
  forceScore: number,
  velocityScore: number,
  confidence: 'low' | 'medium' | 'high',
): string {
  const confidenceNote = confidence === 'low'
    ? ' (limited data — profile will sharpen with more training history)'
    : confidence === 'medium'
    ? ' (moderate confidence — getting clearer with each training block)'
    : '';

  switch (profile) {
    case 'force_dominant':
      return `You're force-dominant (strength ${forceScore}/100, speed ${velocityScore}/100). ` +
        `You can grind through heavy loads but may lack explosive snap. ` +
        `Adding velocity work (jumps, throws, dynamic effort) will unlock more power${confidenceNote}.`;

    case 'velocity_dominant':
      return `You're velocity-dominant (strength ${forceScore}/100, speed ${velocityScore}/100). ` +
        `You're explosive but may leave strength gains on the table. ` +
        `Prioritize heavy compound work (85%+ 1RM) to build the force base your speed needs${confidenceNote}.`;

    case 'balanced':
      return `Your force-velocity profile is balanced (strength ${forceScore}/100, speed ${velocityScore}/100). ` +
        `Maintain variety across the F-V spectrum — both heavy and explosive work${confidenceNote}.`;
  }
}
