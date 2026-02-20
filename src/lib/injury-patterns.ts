/**
 * Injury Pattern Detection Engine
 *
 * Correlates injury data with workout and training session data to identify
 * recurring patterns, assess risk for upcoming workouts, and provide
 * recovery insights. All functions are pure with no side effects.
 */

import type {
  BodyRegion,
  InjuryEntry,
  WorkoutLog,
  ExerciseLog,
  TrainingSession,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A trigger that precedes or correlates with an injury event. */
export interface InjuryTrigger {
  /** Category of the trigger. */
  type: 'exercise' | 'sport_session' | 'volume_spike' | 'rpe_threshold' | 'combined';
  /** Human-readable explanation of the trigger. */
  details: string;
  /** Correlation strength between 0 (none) and 1 (perfect). */
  correlation: number;
}

/** A detected pattern linking a body region's injuries to training activity. */
export interface InjuryPattern {
  /** Unique identifier for the pattern. */
  id: string;
  /** The body region this pattern applies to. */
  bodyRegion: BodyRegion;
  /** Confidence level based on the number of supporting data points. */
  confidence: 'low' | 'medium' | 'high';
  /** Number of injury events that support this pattern. */
  dataPoints: number;
  /** Human-readable summary of the pattern. */
  pattern: string;
  /** Individual triggers that contribute to this pattern. */
  triggers: InjuryTrigger[];
  /** Actionable recommendation to mitigate the pattern. */
  recommendation: string;
}

/** Risk assessment for a single body region. */
export interface BodyRegionRisk {
  region: BodyRegion;
  risk: 'low' | 'moderate' | 'high';
  reason: string;
}

/** Overall injury risk assessment for a planned workout. */
export interface InjuryRiskAssessment {
  /** Aggregate risk level across all body regions. */
  overallRisk: 'low' | 'moderate' | 'high';
  /** Per-region risk breakdown. */
  bodyRegionRisks: BodyRegionRisk[];
  /** Specific warning messages about high-risk conditions. */
  warnings: string[];
  /** Suggestions to reduce injury risk. */
  suggestions: string[];
}

/** Recovery insight for a body region, derived from historical injury data. */
export interface RecoveryInsight {
  bodyRegion: BodyRegion;
  /** Average recovery time in days for resolved injuries. */
  avgRecoveryDays: number | null;
  /** Number of resolved injuries used to compute the average. */
  resolvedCount: number;
  /** Total injuries (resolved + unresolved) for this region. */
  totalOccurrences: number;
  /** Whether this qualifies as a chronic / recurring issue (3+ occurrences). */
  isChronic: boolean;
  /** Average severity across all injuries in this region. */
  avgSeverity: number;
  /** Actionable insight text. */
  insight: string;
}

// ---------------------------------------------------------------------------
// Constants & Helpers
// ---------------------------------------------------------------------------

/** 48-hour look-back window in milliseconds. */
const LOOKBACK_MS = 48 * 60 * 60 * 1000;

/**
 * Maps common exercise name keywords / ids to the body regions they load.
 * This is intentionally broad — it matches substrings so "incline bench press"
 * still maps to chest/shoulders.
 */
const EXERCISE_BODY_REGION_MAP: { keywords: string[]; regions: BodyRegion[] }[] = [
  { keywords: ['bench press', 'bench'], regions: ['chest', 'left_shoulder', 'right_shoulder'] },
  { keywords: ['incline press', 'incline bench'], regions: ['chest', 'left_shoulder', 'right_shoulder'] },
  { keywords: ['overhead press', 'ohp', 'shoulder press', 'military press'], regions: ['left_shoulder', 'right_shoulder'] },
  { keywords: ['lateral raise', 'lat raise', 'side raise'], regions: ['left_shoulder', 'right_shoulder'] },
  { keywords: ['deadlift', 'rdl', 'romanian deadlift'], regions: ['lower_back', 'left_hip', 'right_hip'] },
  { keywords: ['squat'], regions: ['left_knee', 'right_knee', 'left_hip', 'right_hip', 'lower_back'] },
  { keywords: ['leg press'], regions: ['left_knee', 'right_knee', 'left_hip', 'right_hip'] },
  { keywords: ['lunge', 'split squat', 'bulgarian'], regions: ['left_knee', 'right_knee', 'left_hip', 'right_hip'] },
  { keywords: ['pull-up', 'pullup', 'pull up', 'chin-up', 'chinup', 'chin up'], regions: ['left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow'] },
  { keywords: ['row', 'barbell row', 'dumbbell row', 'cable row', 'pendlay'], regions: ['upper_back', 'lower_back'] },
  { keywords: ['lat pulldown', 'pulldown'], regions: ['left_shoulder', 'right_shoulder', 'upper_back'] },
  { keywords: ['bicep curl', 'curl', 'hammer curl', 'preacher curl'], regions: ['left_elbow', 'right_elbow'] },
  { keywords: ['tricep', 'skull crusher', 'pushdown', 'dip'], regions: ['left_elbow', 'right_elbow'] },
  { keywords: ['fly', 'flye', 'pec deck', 'cable fly'], regions: ['chest', 'left_shoulder', 'right_shoulder'] },
  { keywords: ['shrug', 'upright row'], regions: ['neck', 'upper_back'] },
  { keywords: ['calf raise', 'calf'], regions: ['left_ankle', 'right_ankle'] },
  { keywords: ['leg curl', 'hamstring curl'], regions: ['left_knee', 'right_knee'] },
  { keywords: ['leg extension'], regions: ['left_knee', 'right_knee'] },
  { keywords: ['hip thrust', 'glute bridge'], regions: ['left_hip', 'right_hip', 'lower_back'] },
  { keywords: ['plank', 'crunch', 'sit-up', 'ab wheel', 'leg raise'], regions: ['core'] },
  { keywords: ['face pull'], regions: ['left_shoulder', 'right_shoulder', 'upper_back'] },
  { keywords: ['wrist curl', 'wrist extension'], regions: ['left_wrist', 'right_wrist'] },
  { keywords: ['clean', 'snatch', 'jerk'], regions: ['left_shoulder', 'right_shoulder', 'lower_back', 'left_wrist', 'right_wrist'] },
];

/** Body regions commonly loaded by combat sport categories. */
const SPORT_BODY_REGION_MAP: Record<string, BodyRegion[]> = {
  grappling: ['neck', 'left_shoulder', 'right_shoulder', 'lower_back', 'left_knee', 'right_knee', 'left_elbow', 'right_elbow'],
  striking: ['left_shoulder', 'right_shoulder', 'left_wrist', 'right_wrist', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle', 'core'],
  mma: ['neck', 'left_shoulder', 'right_shoulder', 'lower_back', 'left_knee', 'right_knee', 'left_wrist', 'right_wrist', 'left_elbow', 'right_elbow', 'core'],
  cardio: [],
  outdoor: ['left_knee', 'right_knee', 'left_ankle', 'right_ankle'],
  recovery: [],
  other: [],
};

/**
 * Returns the set of body regions loaded by a given exercise, determined by
 * substring-matching the exercise name (case-insensitive) against known patterns.
 */
function getExerciseBodyRegions(exerciseName: string): BodyRegion[] {
  const name = exerciseName.toLowerCase();
  const regions = new Set<BodyRegion>();

  for (const mapping of EXERCISE_BODY_REGION_MAP) {
    if (mapping.keywords.some((kw) => name.includes(kw))) {
      for (const r of mapping.regions) regions.add(r);
    }
  }

  return Array.from(regions);
}

/** Returns a deterministic hash-like id from a string (simple, no crypto needed). */
function makePatternId(bodyRegion: BodyRegion, index: number): string {
  return `pattern_${bodyRegion}_${index}`;
}

/** Returns the absolute difference in milliseconds between two dates. */
function msBetween(a: Date, b: Date): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime());
}

/** Returns true if `event` occurred within the 48h window before `injury`. */
function isWithinLookback(eventDate: Date, injuryDate: Date): boolean {
  const injuryMs = new Date(injuryDate).getTime();
  const eventMs = new Date(eventDate).getTime();
  // Event must be *before* the injury (or same day) and within 48h
  return eventMs <= injuryMs && injuryMs - eventMs <= LOOKBACK_MS;
}

/** Converts a data-point count to a confidence level. */
function toConfidence(dataPoints: number): 'low' | 'medium' | 'high' {
  if (dataPoints >= 7) return 'high';
  if (dataPoints >= 4) return 'medium';
  return 'low';
}

/** Computes the average RPE across all sets of an exercise log. */
function avgRPE(exerciseLog: ExerciseLog): number {
  const rpes = exerciseLog.sets.filter((s) => s.rpe !== undefined && s.completed).map((s) => s.rpe);
  if (rpes.length === 0) return 0;
  return rpes.reduce((sum, r) => sum + r, 0) / rpes.length;
}

/** Computes total volume (weight x reps) for a single exercise log. */
function exerciseVolume(exerciseLog: ExerciseLog): number {
  return exerciseLog.sets
    .filter((s) => s.completed)
    .reduce((sum, s) => sum + s.weight * s.reps, 0);
}

/** Returns a human-friendly body region label. */
function regionLabel(region: BodyRegion): string {
  return region.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// 1. detectInjuryPatterns
// ---------------------------------------------------------------------------

/**
 * Analyses injury history alongside workout and training session logs to
 * identify recurring injury patterns.
 *
 * For each body region with 2+ injuries the function examines the 48 hours
 * preceding each injury event and looks for common exercises, RPE thresholds,
 * volume spikes, and sport sessions that correlate with the injury.
 *
 * @param injuries   - Full injury history.
 * @param workoutLogs - All logged strength workouts.
 * @param trainingSessions - All logged sport / cardio sessions.
 * @returns Array of detected injury patterns, sorted by confidence (highest first).
 */
export function detectInjuryPatterns(
  injuries: InjuryEntry[],
  workoutLogs: WorkoutLog[],
  trainingSessions: TrainingSession[],
): InjuryPattern[] {
  // Group injuries by body region
  const byRegion = new Map<BodyRegion, InjuryEntry[]>();
  for (const injury of injuries) {
    const list = byRegion.get(injury.bodyRegion) ?? [];
    list.push(injury);
    byRegion.set(injury.bodyRegion, list);
  }

  const patterns: InjuryPattern[] = [];
  let patternIdx = 0;

  for (const [region, regionInjuries] of Array.from(byRegion.entries())) {
    // Need at least 2 injuries in a region to detect a pattern
    if (regionInjuries.length < 2) continue;

    const triggers: InjuryTrigger[] = [];

    // --- Exercise triggers ---
    const exerciseCounts = new Map<string, number>(); // exerciseName -> count of injuries preceded by it
    const exerciseHighRPECounts = new Map<string, number>(); // exerciseName -> count where RPE >= 8
    // --- Sport session triggers ---
    const sportCounts = new Map<string, number>(); // category -> count
    const hardSparringCounts = new Map<string, number>(); // category -> count of hard/comp-prep sessions
    // --- Volume tracking ---
    let volumeSpikeCount = 0;

    for (const injury of regionInjuries) {
      // Find workouts in the 48h window before this injury
      const precedingWorkouts = workoutLogs.filter((w) => isWithinLookback(w.date, injury.date));

      for (const workout of precedingWorkouts) {
        // Check if any exercise in this workout targets the injured region
        for (const ex of workout.exercises) {
          const exRegions = getExerciseBodyRegions(ex.exerciseName);
          if (exRegions.includes(region)) {
            exerciseCounts.set(ex.exerciseName, (exerciseCounts.get(ex.exerciseName) ?? 0) + 1);

            const exRPE = avgRPE(ex);
            if (exRPE >= 8) {
              exerciseHighRPECounts.set(
                ex.exerciseName,
                (exerciseHighRPECounts.get(ex.exerciseName) ?? 0) + 1,
              );
            }
          }
        }

        // Volume spike: overall RPE >= 8 or total volume in the top-quartile
        if (workout.overallRPE >= 8) {
          volumeSpikeCount++;
        }
      }

      // Find sport/training sessions in the 48h window before this injury
      const precedingSessions = trainingSessions.filter((s) =>
        isWithinLookback(s.date, injury.date),
      );

      for (const session of precedingSessions) {
        const cat = session.category;
        sportCounts.set(cat, (sportCounts.get(cat) ?? 0) + 1);

        const intensity = session.actualIntensity ?? session.plannedIntensity;
        if (intensity === 'hard_sparring' || intensity === 'competition_prep') {
          hardSparringCounts.set(cat, (hardSparringCounts.get(cat) ?? 0) + 1);
        }
      }
    }

    const totalInjuries = regionInjuries.length;

    // Build exercise triggers
    for (const [exerciseName, count] of Array.from(exerciseCounts.entries())) {
      const correlation = count / totalInjuries;
      if (correlation >= 0.4) {
        const highRPE = exerciseHighRPECounts.get(exerciseName) ?? 0;
        const highRPECorrelation = highRPE / totalInjuries;

        if (highRPECorrelation >= 0.3) {
          triggers.push({
            type: 'rpe_threshold',
            details: `${exerciseName} at RPE 8+ preceded ${highRPE} of ${totalInjuries} ${regionLabel(region)} injuries`,
            correlation: highRPECorrelation,
          });
        } else {
          triggers.push({
            type: 'exercise',
            details: `${exerciseName} preceded ${count} of ${totalInjuries} ${regionLabel(region)} injuries`,
            correlation,
          });
        }
      }
    }

    // Build sport session triggers
    for (const [category, count] of Array.from(sportCounts.entries())) {
      const correlation = count / totalInjuries;
      if (correlation >= 0.4) {
        const hardCount = hardSparringCounts.get(category) ?? 0;
        const hardCorrelation = hardCount / totalInjuries;

        if (hardCorrelation >= 0.3) {
          triggers.push({
            type: 'sport_session',
            details: `Hard ${category} sessions preceded ${hardCount} of ${totalInjuries} ${regionLabel(region)} injuries`,
            correlation: hardCorrelation,
          });
        } else {
          triggers.push({
            type: 'sport_session',
            details: `${category} sessions preceded ${count} of ${totalInjuries} ${regionLabel(region)} injuries`,
            correlation,
          });
        }
      }
    }

    // Build volume spike trigger
    if (totalInjuries > 0) {
      const volumeCorrelation = volumeSpikeCount / totalInjuries;
      if (volumeCorrelation >= 0.4) {
        triggers.push({
          type: 'volume_spike',
          details: `High-volume workouts (RPE 8+) preceded ${volumeSpikeCount} of ${totalInjuries} ${regionLabel(region)} injuries`,
          correlation: volumeCorrelation,
        });
      }
    }

    // Check for combined triggers (exercise + sport in same window)
    // Re-scan injuries for combined occurrences
    let combinedCount = 0;
    let combinedExercise = '';
    let combinedSport = '';

    for (const injury of regionInjuries) {
      const precedingWorkouts = workoutLogs.filter((w) => isWithinLookback(w.date, injury.date));
      const precedingSessions = trainingSessions.filter((s) =>
        isWithinLookback(s.date, injury.date),
      );

      const hadRelevantExercise = precedingWorkouts.some((w) =>
        w.exercises.some((ex) => {
          const exRegions = getExerciseBodyRegions(ex.exerciseName);
          if (exRegions.includes(region) && avgRPE(ex) >= 8) {
            combinedExercise = ex.exerciseName;
            return true;
          }
          return false;
        }),
      );

      const hadHardSession = precedingSessions.some((s) => {
        const intensity = s.actualIntensity ?? s.plannedIntensity;
        if (intensity === 'hard_sparring' || intensity === 'competition_prep') {
          combinedSport = s.category;
          return true;
        }
        return false;
      });

      if (hadRelevantExercise && hadHardSession) {
        combinedCount++;
      }
    }

    if (combinedCount >= 2) {
      const combinedCorrelation = combinedCount / totalInjuries;
      triggers.push({
        type: 'combined',
        details: `${combinedExercise} at high RPE + ${combinedSport} session within 48h preceded ${combinedCount} of ${totalInjuries} ${regionLabel(region)} injuries`,
        correlation: combinedCorrelation,
      });
    }

    // Only create a pattern if we found at least one trigger
    if (triggers.length === 0) continue;

    // Sort triggers by correlation descending
    triggers.sort((a, b) => b.correlation - a.correlation);

    // Build human-readable pattern string from the top triggers
    const patternParts: string[] = [];
    for (const trigger of triggers.slice(0, 3)) {
      patternParts.push(trigger.details);
    }
    const patternString = `${regionLabel(region)} pain correlates with: ${patternParts.join('; ')}`;

    // Build recommendation
    const recommendation = buildRecommendation(region, triggers);

    patterns.push({
      id: makePatternId(region, patternIdx++),
      bodyRegion: region,
      confidence: toConfidence(totalInjuries),
      dataPoints: totalInjuries,
      pattern: patternString,
      triggers,
      recommendation,
    });
  }

  // Sort by confidence (high > medium > low), then by data points descending
  const confidenceOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
  patterns.sort(
    (a, b) =>
      confidenceOrder[b.confidence] - confidenceOrder[a.confidence] ||
      b.dataPoints - a.dataPoints,
  );

  return patterns;
}

/**
 * Builds a recommendation string based on the top triggers for a body region.
 */
function buildRecommendation(region: BodyRegion, triggers: InjuryTrigger[]): string {
  const parts: string[] = [];

  for (const trigger of triggers) {
    switch (trigger.type) {
      case 'rpe_threshold':
        parts.push(`Cap RPE at 7 for exercises targeting ${regionLabel(region)} when fatigued`);
        break;
      case 'exercise':
        parts.push(
          `Consider substituting or reducing volume on exercises loading ${regionLabel(region)}`,
        );
        break;
      case 'sport_session':
        parts.push(
          `Reduce training intensity for ${regionLabel(region)} within 48h of hard sport sessions`,
        );
        break;
      case 'volume_spike':
        parts.push(
          `Avoid large volume spikes for ${regionLabel(region)} — increase load gradually`,
        );
        break;
      case 'combined':
        parts.push(
          `Avoid pairing high-RPE lifts targeting ${regionLabel(region)} with hard sparring in the same 48h window`,
        );
        break;
    }
  }

  // Deduplicate and join
  return Array.from(new Set(parts)).join('. ') + '.';
}

// ---------------------------------------------------------------------------
// 2. assessInjuryRisk
// ---------------------------------------------------------------------------

/** A planned exercise within an upcoming workout. */
interface PlannedExercise {
  exerciseId: string;
  exerciseName: string;
  targetRPE?: number;
}

/** The shape of an upcoming workout passed to the risk assessment function. */
interface UpcomingWorkout {
  exercises: PlannedExercise[];
}

/**
 * Assesses the injury risk for a planned workout by cross-referencing known
 * injury patterns, recent sport sessions, and injury history.
 *
 * @param upcomingWorkout - The workout the user plans to do.
 * @param recentSessions  - Training/sport sessions from the past 48 hours.
 * @param injuryHistory   - Full injury log (used for active/unresolved injuries).
 * @param patterns        - Previously detected injury patterns (from `detectInjuryPatterns`).
 * @returns A risk assessment with per-region breakdowns, warnings, and suggestions.
 */
export function assessInjuryRisk(
  upcomingWorkout: UpcomingWorkout,
  recentSessions: TrainingSession[],
  injuryHistory: InjuryEntry[],
  patterns: InjuryPattern[],
): InjuryRiskAssessment {
  const bodyRegionRisks: BodyRegionRisk[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Collect all body regions targeted by the planned workout
  const workoutRegions = new Map<BodyRegion, PlannedExercise[]>();
  for (const exercise of upcomingWorkout.exercises) {
    const regions = getExerciseBodyRegions(exercise.exerciseName);
    for (const region of regions) {
      const list = workoutRegions.get(region) ?? [];
      list.push(exercise);
      workoutRegions.set(region, list);
    }
  }

  // Check recent hard sessions
  const recentHardSession = recentSessions.some((s) => {
    const intensity = s.actualIntensity ?? s.plannedIntensity;
    return intensity === 'hard_sparring' || intensity === 'competition_prep';
  });

  const recentSessionCategories = new Set(recentSessions.map((s) => s.category));

  // Active (unresolved) injuries
  const activeInjuries = injuryHistory.filter((i) => !i.resolved);
  const activeInjuryRegions = new Set(activeInjuries.map((i) => i.bodyRegion));

  // Build a pattern lookup by region
  const patternsByRegion = new Map<BodyRegion, InjuryPattern[]>();
  for (const p of patterns) {
    const list = patternsByRegion.get(p.bodyRegion) ?? [];
    list.push(p);
    patternsByRegion.set(p.bodyRegion, list);
  }

  // Assess each targeted body region
  for (const [region, exercises] of Array.from(workoutRegions.entries())) {
    let risk: 'low' | 'moderate' | 'high' = 'low';
    const reasons: string[] = [];

    // Check 1: Active injury in this region
    if (activeInjuryRegions.has(region)) {
      const activeInRegion = activeInjuries.filter((i) => i.bodyRegion === region);
      const maxSeverity = Math.max(...activeInRegion.map((i) => i.severity));

      if (maxSeverity >= 4) {
        risk = 'high';
        reasons.push(`Active injury (severity ${maxSeverity}/5) in ${regionLabel(region)}`);
        warnings.push(
          `You have an active severity-${maxSeverity} injury in your ${regionLabel(region)}. Consider skipping exercises that load this area.`,
        );
      } else if (maxSeverity >= 2) {
        risk = elevateRisk(risk, 'moderate');
        reasons.push(`Active injury (severity ${maxSeverity}/5) in ${regionLabel(region)}`);
        warnings.push(
          `Active injury in ${regionLabel(region)} (severity ${maxSeverity}/5). Monitor closely and reduce load if pain increases.`,
        );
      }
    }

    // Check 2: Known patterns
    const regionPatterns = patternsByRegion.get(region) ?? [];
    for (const pattern of regionPatterns) {
      for (const trigger of pattern.triggers) {
        let triggered = false;

        if (trigger.type === 'exercise' || trigger.type === 'rpe_threshold') {
          // Check if any planned exercise matches the trigger details
          for (const ex of exercises) {
            const triggerExName = extractExerciseName(trigger.details);
            if (
              triggerExName &&
              ex.exerciseName.toLowerCase().includes(triggerExName.toLowerCase())
            ) {
              if (trigger.type === 'rpe_threshold' && ex.targetRPE && ex.targetRPE >= 8) {
                triggered = true;
              } else if (trigger.type === 'exercise') {
                triggered = true;
              }
            }
          }
        }

        if (trigger.type === 'sport_session') {
          // Check if a relevant sport session happened recently
          for (const cat of Array.from(recentSessionCategories)) {
            if (trigger.details.toLowerCase().includes(cat)) {
              triggered = true;
            }
          }
        }

        if (trigger.type === 'combined' && recentHardSession) {
          // Combined trigger: high-RPE exercise + recent hard session
          for (const ex of exercises) {
            if (ex.targetRPE && ex.targetRPE >= 8) {
              const exRegions = getExerciseBodyRegions(ex.exerciseName);
              if (exRegions.includes(region)) {
                triggered = true;
              }
            }
          }
        }

        if (triggered) {
          const patternRisk =
            pattern.confidence === 'high'
              ? 'high'
              : pattern.confidence === 'medium'
                ? 'moderate'
                : 'moderate'; // even low-confidence patterns warrant attention
          risk = elevateRisk(risk, patternRisk);
          reasons.push(pattern.pattern);
          suggestions.push(pattern.recommendation);
        }
      }
    }

    // Check 3: Recent hard sparring + high RPE planned for this region
    if (recentHardSession) {
      for (const ex of exercises) {
        if (ex.targetRPE && ex.targetRPE >= 8) {
          risk = elevateRisk(risk, 'moderate');
          reasons.push(
            `Planning ${ex.exerciseName} at RPE ${ex.targetRPE} after a recent hard sparring session`,
          );
          suggestions.push(
            `Consider lowering RPE target for ${ex.exerciseName} to 7 or below since you had a hard session recently.`,
          );
        }
      }
    }

    if (reasons.length > 0) {
      bodyRegionRisks.push({
        region,
        risk,
        reason: Array.from(new Set(reasons)).join('; '),
      });
    }
  }

  // Determine overall risk: highest across all regions
  let overallRisk: 'low' | 'moderate' | 'high' = 'low';
  for (const br of bodyRegionRisks) {
    overallRisk = elevateRisk(overallRisk, br.risk);
  }

  // If no specific region risks were flagged, scan for general concerns
  if (bodyRegionRisks.length === 0 && recentHardSession) {
    overallRisk = 'moderate';
    suggestions.push(
      'You trained hard recently. Consider keeping today\'s session at moderate intensity.',
    );
  }

  return {
    overallRisk,
    bodyRegionRisks,
    warnings: Array.from(new Set(warnings)),
    suggestions: Array.from(new Set(suggestions)),
  };
}

/**
 * Extracts an exercise name from a trigger details string.
 * E.g. "Bench Press at RPE 8+ preceded 3 of 4 ..." -> "Bench Press"
 */
function extractExerciseName(details: string): string | null {
  // Pattern: name comes before " at RPE" or " preceded"
  const match = details.match(/^(.+?)(?:\s+at\s+RPE|\s+preceded)/i);
  return match ? match[1].trim() : null;
}

/** Returns the higher of two risk levels. */
function elevateRisk(
  current: 'low' | 'moderate' | 'high',
  incoming: 'low' | 'moderate' | 'high',
): 'low' | 'moderate' | 'high' {
  const order: Record<string, number> = { low: 0, moderate: 1, high: 2 };
  return order[incoming] > order[current] ? incoming : current;
}

// ---------------------------------------------------------------------------
// 3. getRecoveryInsights
// ---------------------------------------------------------------------------

/**
 * Analyses an injury history to provide per-region recovery insights,
 * including average recovery time, chronic injury flags, and severity trends.
 *
 * @param injuries - Full injury history (resolved and unresolved).
 * @returns An array of recovery insights, one per body region that has injuries.
 */
export function getRecoveryInsights(injuries: InjuryEntry[]): RecoveryInsight[] {
  // Group by region
  const byRegion = new Map<BodyRegion, InjuryEntry[]>();
  for (const injury of injuries) {
    const list = byRegion.get(injury.bodyRegion) ?? [];
    list.push(injury);
    byRegion.set(injury.bodyRegion, list);
  }

  const insights: RecoveryInsight[] = [];

  for (const [region, regionInjuries] of Array.from(byRegion.entries())) {
    // Calculate average recovery time for resolved injuries
    const resolved = regionInjuries.filter((i) => i.resolved && i.resolvedDate);
    let avgRecoveryDays: number | null = null;

    if (resolved.length > 0) {
      const totalDays = resolved.reduce((sum, i) => {
        const start = new Date(i.date).getTime();
        const end = new Date(i.resolvedDate!).getTime();
        const days = Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);
      avgRecoveryDays = Math.round((totalDays / resolved.length) * 10) / 10;
    }

    const totalOccurrences = regionInjuries.length;
    const isChronic = totalOccurrences >= 3;
    const avgSeverity =
      Math.round(
        (regionInjuries.reduce((sum, i) => sum + i.severity, 0) / totalOccurrences) * 10,
      ) / 10;

    // Build insight text
    const insightParts: string[] = [];
    const label = regionLabel(region);

    if (isChronic) {
      insightParts.push(
        `${label} is a chronic issue with ${totalOccurrences} recorded injuries.`,
      );
    }

    if (avgRecoveryDays !== null) {
      insightParts.push(
        `Average recovery time for ${label}: ${avgRecoveryDays} days (based on ${resolved.length} resolved ${resolved.length === 1 ? 'injury' : 'injuries'}).`,
      );
    }

    if (avgSeverity >= 3.5) {
      insightParts.push(
        `Average severity is high (${avgSeverity}/5). Consider consulting a physiotherapist.`,
      );
    } else if (avgSeverity >= 2.5) {
      insightParts.push(
        `Average severity is moderate (${avgSeverity}/5). Prioritise prehab exercises for this area.`,
      );
    }

    const unresolved = regionInjuries.filter((i) => !i.resolved);
    if (unresolved.length > 0) {
      insightParts.push(
        `${unresolved.length} active/unresolved ${unresolved.length === 1 ? 'injury' : 'injuries'} in this region.`,
      );
    }

    if (insightParts.length === 0) {
      insightParts.push(`${label}: ${totalOccurrences} recorded ${totalOccurrences === 1 ? 'injury' : 'injuries'}, average severity ${avgSeverity}/5.`);
    }

    insights.push({
      bodyRegion: region,
      avgRecoveryDays,
      resolvedCount: resolved.length,
      totalOccurrences,
      isChronic,
      avgSeverity,
      insight: insightParts.join(' '),
    });
  }

  // Sort: chronic first, then by occurrence count descending
  insights.sort((a, b) => {
    if (a.isChronic !== b.isChronic) return a.isChronic ? -1 : 1;
    return b.totalOccurrences - a.totalOccurrences;
  });

  return insights;
}
