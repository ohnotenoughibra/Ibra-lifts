/**
 * Injury Intelligence Engine — Sprint 3
 *
 * Analyses injury log entries and workout pain reports to build per-region
 * injury profiles, recommend exercise substitutions, assess exercise risk,
 * and surface coaching insights.  All exports are pure functions with no
 * React or store dependencies.
 */

import type {
  BodyRegion,
  InjuryEntry,
  MuscleGroup,
  Exercise,
  WorkoutLog,
  EquipmentType,
} from './types';
import { exercises, getExerciseById } from './exercises';
import { toLocalDateStr } from './utils';

/** Filter out soft-deleted items */
function active<T>(arr: T[]): T[] {
  return arr.filter(item => !(item as Record<string, unknown>)._deleted);
}

// ── Refined Movement Sub-patterns ──────────────────────────────────────────
// The existing MovementPattern type is coarse ('push', 'pull', etc.).
// For injury mapping we need finer resolution — vertical vs horizontal
// push / pull matters enormously for shoulder and elbow injuries.

export type MovementSubPattern =
  | 'vertical_push'
  | 'horizontal_push'
  | 'vertical_pull'
  | 'horizontal_pull'
  | 'hip_hinge'
  | 'squat'
  | 'lunge'
  | 'carry'
  | 'rotation'
  | 'explosive'
  | 'isolation_curl'
  | 'isolation_extension'
  | 'isolation_raise';

// ── Body Region → Affected Muscle Groups ───────────────────────────────────

export const BODY_REGION_MUSCLES: Record<BodyRegion, MuscleGroup[]> = {
  neck:            ['traps'],
  left_shoulder:   ['shoulders', 'chest', 'traps'],
  right_shoulder:  ['shoulders', 'chest', 'traps'],
  upper_back:      ['back', 'traps'],
  lower_back:      ['back', 'core', 'glutes'],
  left_elbow:      ['biceps', 'triceps', 'forearms'],
  right_elbow:     ['biceps', 'triceps', 'forearms'],
  left_wrist:      ['forearms'],
  right_wrist:     ['forearms'],
  left_hip:        ['glutes', 'hamstrings', 'quadriceps'],
  right_hip:       ['glutes', 'hamstrings', 'quadriceps'],
  left_knee:       ['quadriceps', 'hamstrings', 'calves'],
  right_knee:      ['quadriceps', 'hamstrings', 'calves'],
  left_ankle:      ['calves'],
  right_ankle:     ['calves'],
  chest:           ['chest', 'shoulders'],
  core:            ['core'],
};

// ── Body Region → Risky Movement Sub-patterns ──────────────────────────────

const REGION_RISKY_PATTERNS: Record<BodyRegion, MovementSubPattern[]> = {
  neck:            ['carry', 'vertical_push'],
  left_shoulder:   ['vertical_push', 'horizontal_push', 'vertical_pull'],
  right_shoulder:  ['vertical_push', 'horizontal_push', 'vertical_pull'],
  upper_back:      ['horizontal_pull', 'hip_hinge', 'carry'],
  lower_back:      ['hip_hinge', 'squat', 'carry'],
  left_elbow:      ['horizontal_push', 'vertical_push', 'isolation_curl', 'isolation_extension'],
  right_elbow:     ['horizontal_push', 'vertical_push', 'isolation_curl', 'isolation_extension'],
  left_wrist:      ['horizontal_push', 'isolation_curl', 'carry'],
  right_wrist:     ['horizontal_push', 'isolation_curl', 'carry'],
  left_hip:        ['hip_hinge', 'squat', 'lunge'],
  right_hip:       ['hip_hinge', 'squat', 'lunge'],
  left_knee:       ['squat', 'lunge', 'explosive'],
  right_knee:      ['squat', 'lunge', 'explosive'],
  left_ankle:      ['squat', 'lunge', 'explosive'],
  right_ankle:     ['squat', 'lunge', 'explosive'],
  chest:           ['horizontal_push'],
  core:            ['rotation', 'hip_hinge'],
};

// ── Exercise ID → Movement Sub-pattern Lookup Sets ─────────────────────────
// Precise classification for exercises where the coarse MovementPattern
// alone is insufficient.

const VERTICAL_PUSH_IDS = new Set([
  'overhead-press', 'push-press', 'dumbbell-shoulder-press', 'arnold-press',
  'behind-neck-press', 'z-press', 'landmine-press', 'kettlebell-bottoms-up-press',
  'cable-overhead-tricep-extension', 'overhead-tricep-extension',
  'kettlebell-clean-press', 'lu-raises',
]);

const VERTICAL_PULL_IDS = new Set([
  'pull-up', 'weighted-pull-up', 'chin-up', 'lat-pulldown',
  'close-grip-lat-pulldown', 'neutral-grip-pull-up', 'towel-pull-up',
  'straight-arm-pulldown', 'rope-climb',
]);

const LUNGE_IDS = new Set([
  'split-squat', 'lunges', 'reverse-lunge', 'weighted-jumping-lunge',
  'pistol-squat',
]);

const ISOLATION_CURL_IDS = new Set([
  'bicep-curl', 'dumbbell-curl', 'hammer-curl', 'incline-dumbbell-curl',
  'preacher-curl', 'ez-bar-curl', 'concentration-curl', 'bayesian-curl',
  'spider-curl', 'cross-body-hammer-curl', 'wrist-curl', 'finger-curl',
]);

const ISOLATION_EXTENSION_IDS = new Set([
  'tricep-pushdown', 'skull-crusher', 'overhead-tricep-extension',
  'cable-overhead-tricep-extension', 'rope-pushdown', 'tricep-kickback',
  'jm-press',
]);

const ISOLATION_RAISE_IDS = new Set([
  'lateral-raise', 'cable-lateral-raise', 'front-raise',
  'dumbbell-lateral-raise-seated', 'rear-delt-fly', 'reverse-pec-deck',
  'prone-y-raise',
]);

// ── Sub-pattern Classifier ─────────────────────────────────────────────────

function classifyMovementSubPattern(exercise: Exercise): MovementSubPattern {
  // Specific ID sets first (most precise)
  if (VERTICAL_PUSH_IDS.has(exercise.id))        return 'vertical_push';
  if (VERTICAL_PULL_IDS.has(exercise.id))         return 'vertical_pull';
  if (LUNGE_IDS.has(exercise.id))                 return 'lunge';
  if (ISOLATION_CURL_IDS.has(exercise.id))        return 'isolation_curl';
  if (ISOLATION_EXTENSION_IDS.has(exercise.id))   return 'isolation_extension';
  if (ISOLATION_RAISE_IDS.has(exercise.id))       return 'isolation_raise';

  // Fall back to coarse pattern + muscle heuristics
  switch (exercise.movementPattern) {
    case 'push':
      // Shoulder-primary push = vertical, everything else = horizontal
      if (
        exercise.primaryMuscles.includes('shoulders') &&
        !exercise.primaryMuscles.includes('chest')
      ) {
        return 'vertical_push';
      }
      return 'horizontal_push';
    case 'pull':
      return 'horizontal_pull';
    case 'hinge':
      return 'hip_hinge';
    case 'squat':
      return 'squat';
    case 'carry':
      return 'carry';
    case 'rotation':
      return 'rotation';
    case 'explosive':
      return 'explosive';
    default:
      return 'horizontal_push';
  }
}

// ── Injury Profile Types ───────────────────────────────────────────────────

export interface PainHistoryEntry {
  date: string;
  level: number;    // 1-10
  context: string;
}

export type InjurySeverity = 'mild' | 'moderate' | 'severe';
export type InjuryStatus = 'active' | 'recovering' | 'resolved';

export interface InjuryProfile {
  region: BodyRegion;
  severity: InjurySeverity;
  onsetDate: string;
  affectedMovements: string[];
  painHistory: PainHistoryEntry[];
  status: InjuryStatus;
  recommendedActions: string[];
}

// ── Substitution Types ─────────────────────────────────────────────────────

export interface ExerciseSubstitution {
  exercise: Exercise;
  reason: string;
  safetyScore: number; // 0-100, higher = safer
}

export interface SubstitutionResult {
  original: Exercise;
  substitutes: ExerciseSubstitution[];
}

// ── Risk Assessment Types ──────────────────────────────────────────────────

export type RiskLevel = 'safe' | 'caution' | 'avoid';

export interface ExerciseRiskAssessment {
  risk: RiskLevel;
  reason: string;
  modifications: string[];
}

// ── Insight Types ──────────────────────────────────────────────────────────

export type InjuryTrend = 'improving' | 'worsening' | 'stable';

export interface RecoveryProgress {
  region: BodyRegion;
  trend: InjuryTrend;
}

export interface InjuryInsights {
  insights: string[];
  alerts: string[];
  recoveryProgress: RecoveryProgress[];
}

// ── Internal Helpers ───────────────────────────────────────────────────────

/** Map PainSeverity (1-5) to the three-level label used by InjuryProfile. */
function severityFromPainLevel(level: number): InjurySeverity {
  if (level <= 2) return 'mild';
  if (level <= 3) return 'moderate';
  return 'severe';
}

/** Scale the 1-5 PainSeverity to a 1-10 range for pain history. */
function painLevelToTen(level: number): number {
  return Math.min(10, level * 2);
}

/** Risky sub-patterns for a given body region. */
function getRiskyPatterns(region: BodyRegion): MovementSubPattern[] {
  return REGION_RISKY_PATTERNS[region] || [];
}

/** Absolute number of days between two date strings. */
function daysBetween(a: string, b: string): number {
  const MS_PER_DAY = 86_400_000;
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / MS_PER_DAY;
}

/**
 * Best-effort match of a free-text pain location (from ExerciseFeedback.jointPainLocation)
 * to the structured BodyRegion type.
 */
function matchLocationToRegion(location: string): BodyRegion | null {
  const t = location.toLowerCase();

  // Side-specific joints
  if (t.includes('left')  && t.includes('shoulder')) return 'left_shoulder';
  if (t.includes('right') && t.includes('shoulder')) return 'right_shoulder';
  if (t.includes('shoulder'))                        return 'right_shoulder';

  if (t.includes('left')  && t.includes('elbow'))    return 'left_elbow';
  if (t.includes('right') && t.includes('elbow'))    return 'right_elbow';
  if (t.includes('elbow'))                           return 'right_elbow';

  if (t.includes('left')  && t.includes('wrist'))    return 'left_wrist';
  if (t.includes('right') && t.includes('wrist'))    return 'right_wrist';
  if (t.includes('wrist'))                           return 'right_wrist';

  if (t.includes('left')  && t.includes('knee'))     return 'left_knee';
  if (t.includes('right') && t.includes('knee'))     return 'right_knee';
  if (t.includes('knee'))                            return 'right_knee';

  if (t.includes('left')  && t.includes('hip'))      return 'left_hip';
  if (t.includes('right') && t.includes('hip'))      return 'right_hip';
  if (t.includes('hip'))                             return 'right_hip';

  if (t.includes('left')  && t.includes('ankle'))    return 'left_ankle';
  if (t.includes('right') && t.includes('ankle'))    return 'right_ankle';
  if (t.includes('ankle'))                           return 'right_ankle';

  // Spine / torso
  if (t.includes('lower back') || t.includes('low back') || t.includes('lumbar')) return 'lower_back';
  if (t.includes('upper back') || t.includes('thoracic') || t.includes('mid back')) return 'upper_back';
  if (t.includes('neck') || t.includes('cervical'))  return 'neck';
  if (t.includes('chest') || t.includes('pec'))      return 'chest';
  if (t.includes('core') || t.includes('ab') || t.includes('oblique')) return 'core';

  // Catch-all: unqualified "back" almost always means lower back
  if (t.includes('back')) return 'lower_back';

  return null;
}

// ── Recommended Actions Builder ────────────────────────────────────────────

function buildRecommendedActions(
  region: BodyRegion,
  severity: InjurySeverity,
  status: InjuryStatus,
  daysSinceLastPain: number,
): string[] {
  const actions: string[] = [];

  // ── Severity-based universal guidance ──
  if (severity === 'severe') {
    actions.push('Consider consulting a physiotherapist or sports medicine doctor');
    actions.push('Avoid all exercises that aggravate this area');
    actions.push('Focus on pain-free range of motion only');
  } else if (severity === 'moderate') {
    actions.push('Reduce load on exercises involving this area by 30-50%');
    actions.push('Use exercise substitutions that avoid the affected movement pattern');
    if (daysSinceLastPain < 7) {
      actions.push('Monitor closely — if pain persists past 7 days, rest the affected movements entirely');
    }
  } else {
    actions.push('Monitor during training — stop if pain increases above 3/10');
    actions.push('Add extra warm-up sets with lighter weight before working sets');
  }

  // ── Region-specific advice ──
  if (region.includes('shoulder')) {
    actions.push('Add shoulder external rotation warm-ups (band pull-aparts, face pulls)');
    if (severity !== 'mild') {
      actions.push('Replace overhead pressing with incline or landmine press');
    }
  } else if (region.includes('knee')) {
    actions.push('Ensure proper knee tracking over toes during squats');
    if (severity !== 'mild') {
      actions.push('Replace deep squats with box squats or leg press (limited ROM)');
      actions.push('Add isometric wall sits for patellar tendon health');
    }
  } else if (region === 'lower_back') {
    actions.push('Prioritise core bracing and neutral spine on every rep');
    if (severity !== 'mild') {
      actions.push('Replace conventional deadlifts with trap bar deadlifts or rack pulls');
      actions.push('Use belt squats or leg press instead of back squats');
    }
  } else if (region.includes('elbow')) {
    actions.push('Check grip width on pressing movements — wider can reduce elbow stress');
    if (severity !== 'mild') {
      actions.push('Use neutral grip variations where possible');
      actions.push('Reduce isolation curl / extension volume temporarily');
    }
  } else if (region.includes('wrist')) {
    actions.push('Use wrist wraps for pressing movements');
    if (severity !== 'mild') {
      actions.push('Switch to neutral or fat-grip handles to distribute load');
      actions.push('Avoid direct wrist loading (wrist curls, front squats with clean grip)');
    }
  } else if (region.includes('hip')) {
    actions.push('Warm up with hip circles and glute activation drills');
    if (severity !== 'mild') {
      actions.push('Reduce squat depth temporarily — parallel or just above');
      actions.push('Replace barbell hip thrusts with glute bridges');
    }
  } else if (region.includes('ankle')) {
    actions.push('Use heel-elevated shoes or plates under heels for squatting');
    if (severity !== 'mild') {
      actions.push('Avoid explosive jumping movements until pain-free');
    }
  } else if (region === 'neck') {
    actions.push('Avoid heavy shrugs and direct neck loading');
    if (severity !== 'mild') {
      actions.push("Skip farmer's walks and overhead carries temporarily");
    }
  } else if (region === 'upper_back') {
    actions.push('Add thoracic mobility work (foam rolling, cat-cow)');
    if (severity !== 'mild') {
      actions.push('Reduce heavy rowing volume — use machine rows for stability');
    }
  } else if (region === 'chest') {
    actions.push('Use a controlled tempo on pressing — no bouncing off chest');
    if (severity !== 'mild') {
      actions.push('Limit pressing ROM (e.g., floor press, board press) to reduce stretch on pec');
    }
  } else if (region === 'core') {
    actions.push('Avoid heavy rotational work while symptomatic');
    if (severity !== 'mild') {
      actions.push('Stick to anti-extension holds (planks, dead bugs) instead of dynamic movements');
    }
  }

  if (status === 'recovering') {
    actions.push('Gradually reintroduce movements — increase load by no more than 10-15% per week');
  }

  return actions;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. getInjuryProfiles
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analyse the user's injury log entries and workout-level pain reports to
 * build an `InjuryProfile[]` for each body region with active or recovering
 * issues.  Resolved regions are filtered out.
 */
export function getInjuryProfiles(
  injuryLog: InjuryEntry[],
  workoutLogs: WorkoutLog[],
): InjuryProfile[] {
  injuryLog = active(injuryLog);
  workoutLogs = active(workoutLogs);

  // Accumulate all pain events keyed by BodyRegion
  const regionEvents = new Map<BodyRegion, {
    entries: InjuryEntry[];
    workoutPain: { date: string; exerciseId: string; location: string }[];
  }>();

  // ── Injury log entries ──
  injuryLog.forEach(entry => {
    if (!regionEvents.has(entry.bodyRegion)) {
      regionEvents.set(entry.bodyRegion, { entries: [], workoutPain: [] });
    }
    regionEvents.get(entry.bodyRegion)!.entries.push(entry);
  });

  // ── Workout feedback joint-pain reports ──
  workoutLogs.forEach(log => {
    log.exercises.forEach(exLog => {
      if (exLog.feedback?.jointPain && exLog.feedback.jointPainLocation) {
        const matched = matchLocationToRegion(exLog.feedback.jointPainLocation);
        if (matched) {
          if (!regionEvents.has(matched)) {
            regionEvents.set(matched, { entries: [], workoutPain: [] });
          }
          regionEvents.get(matched)!.workoutPain.push({
            date: toLocalDateStr(log.date),
            exerciseId: exLog.exerciseId,
            location: exLog.feedback.jointPainLocation,
          });
        }
      }
    });
  });

  // ── Build one InjuryProfile per region ──
  const profiles: InjuryProfile[] = [];
  const today = toLocalDateStr(new Date());

  Array.from(regionEvents.entries()).forEach(([region, data]) => {
    const { entries, workoutPain } = data;

    // Sort entries newest-first
    const sorted = [...entries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    // Onset = earliest unresolved entry, or most recent entry overall
    const unresolved = sorted.filter(e => !e.resolved);
    const onsetEntry = unresolved.length > 0
      ? unresolved[unresolved.length - 1]
      : sorted[0];
    const onsetDate = toLocalDateStr(onsetEntry.date);

    // Severity from the 3 most recent entries
    const recentSeverity = sorted.slice(0, 3).reduce((mx, e) => Math.max(mx, e.severity), 1);
    const severity = severityFromPainLevel(recentSeverity);

    // ── Pain history timeline ──
    const painHistory: PainHistoryEntry[] = [];

    sorted.forEach(entry => {
      painHistory.push({
        date: toLocalDateStr(entry.date),
        level: painLevelToTen(entry.severity),
        context: entry.duringExercise
          ? `During ${entry.duringExercise} — ${entry.painType}`
          : `${entry.painType} pain reported`,
      });
    });

    workoutPain.forEach(wp => {
      const exercise = getExerciseById(wp.exerciseId);
      painHistory.push({
        date: wp.date,
        level: 4, // workout-reported pain defaults to moderate
        context: exercise
          ? `Joint pain during ${exercise.name}`
          : 'Joint pain during exercise',
      });
    });

    // Sort combined history newest-first
    painHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // ── Affected movements ──
    const affectedMovements: string[] = getRiskyPatterns(region)
      .map(p => p.replace(/_/g, ' '));

    // Also surface the specific exercise names that provoked pain
    const painExerciseNames = new Set<string>();
    entries.forEach(e => { if (e.duringExercise) painExerciseNames.add(e.duringExercise); });
    workoutPain.forEach(wp => {
      const ex = getExerciseById(wp.exerciseId);
      if (ex) painExerciseNames.add(ex.name);
    });
    Array.from(painExerciseNames).forEach(name => {
      if (!affectedMovements.includes(name)) affectedMovements.push(name);
    });

    // ── Status ──
    const allResolved = entries.length > 0 && entries.every(e => e.resolved);
    const mostRecentPainDate = painHistory.length > 0 ? painHistory[0].date : onsetDate;
    const daysSincePain = daysBetween(today, mostRecentPainDate);

    let status: InjuryStatus;
    if (allResolved && workoutPain.length === 0) {
      status = 'resolved';
    } else if (allResolved && daysSincePain > 14) {
      status = 'resolved';
    } else if (daysSincePain > 7 && severity !== 'severe') {
      status = 'recovering';
    } else {
      status = 'active';
    }

    const recommendedActions = buildRecommendedActions(region, severity, status, daysSincePain);

    profiles.push({
      region,
      severity,
      onsetDate,
      affectedMovements,
      painHistory,
      status,
      recommendedActions,
    });
  });

  // Only return profiles that are still clinically relevant
  return profiles.filter(p => p.status !== 'resolved');
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. getExerciseSubstitutions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Given an exercise that aggravates an injury, return ranked alternatives
 * from the exercise database that:
 *  - Target the same primary muscle group(s)
 *  - Avoid the affected movement pattern
 *  - Match the user's available equipment
 *
 * Returns up to 6 substitutes, sorted by descending safetyScore.
 */
export function getExerciseSubstitutions(
  exerciseId: string,
  injuryProfiles: InjuryProfile[],
  availableEquipment: EquipmentType[],
): SubstitutionResult | null {
  const original = getExerciseById(exerciseId);
  if (!original) return null;

  const active = injuryProfiles.filter(p => p.status !== 'resolved');
  if (active.length === 0) {
    return { original, substitutes: [] };
  }

  // Collect all risky sub-patterns from active injuries
  const patternsToAvoid = new Set<MovementSubPattern>();
  active.forEach(profile => {
    getRiskyPatterns(profile.region).forEach(p => patternsToAvoid.add(p));
  });

  const originalSubPattern = classifyMovementSubPattern(original);
  const equipSet = new Set(availableEquipment);

  // ── Filter candidates ──
  const candidates = exercises.filter(ex => {
    if (ex.id === exerciseId) return false;
    // Must share at least one primary muscle with the original
    if (!ex.primaryMuscles.some(m => original.primaryMuscles.includes(m))) return false;
    // Must be performable with available equipment
    if (
      ex.equipmentTypes.length > 0 &&
      !ex.equipmentTypes.some(eq => equipSet.has(eq))
    ) {
      return false;
    }
    return true;
  });

  // ── Score each candidate ──
  const substitutes: ExerciseSubstitution[] = candidates.map(candidate => {
    const candSubPattern = classifyMovementSubPattern(candidate);
    let safetyScore = 80;
    const reasons: string[] = [];

    // Big bonus: avoids the problematic pattern while original used it
    if (patternsToAvoid.has(originalSubPattern) && !patternsToAvoid.has(candSubPattern)) {
      safetyScore += 15;
      reasons.push(`Avoids ${originalSubPattern.replace(/_/g, ' ')} pattern`);
    }

    // Penalty: candidate still uses a risky pattern
    if (patternsToAvoid.has(candSubPattern)) {
      const penalty = active.some(p => p.severity === 'severe') ? 40 : 20;
      safetyScore -= penalty;
      reasons.push(`Uses ${candSubPattern.replace(/_/g, ' ')} pattern (caution)`);
    }

    // Primary muscle overlap bonus
    const primaryOverlap = candidate.primaryMuscles.filter(m =>
      original.primaryMuscles.includes(m),
    ).length;
    safetyScore += primaryOverlap * 5;
    if (primaryOverlap === original.primaryMuscles.length) {
      reasons.push('Targets all the same primary muscles');
    } else if (primaryOverlap > 0) {
      const shared = candidate.primaryMuscles
        .filter(m => original.primaryMuscles.includes(m))
        .join(', ');
      reasons.push(`Targets ${shared}`);
    }

    // Isolation bonus (easier to control load / ROM)
    if (candidate.category === 'isolation') {
      safetyScore += 5;
      reasons.push('Isolation — easier to control load and ROM');
    }

    // Machine bonus (inherent stability)
    if (candidate.equipmentTypes.includes('machine')) {
      safetyScore += 5;
      reasons.push('Machine — guided path reduces joint stress');
    }

    // Bodyweight bonus (easy to scale)
    if (candidate.equipmentTypes.includes('bodyweight')) {
      safetyScore += 3;
    }

    // Explosive penalty (generally riskier with an active injury)
    if (candidate.movementPattern === 'explosive') {
      safetyScore -= 15;
      reasons.push('Explosive movement — higher injury risk');
    }

    const reason = reasons.length > 0
      ? reasons.slice(0, 2).join('. ')
      : `Same muscle group (${candidate.primaryMuscles[0]})`;

    return {
      exercise: candidate,
      reason,
      safetyScore: Math.max(0, Math.min(100, safetyScore)),
    };
  });

  substitutes.sort((a, b) => b.safetyScore - a.safetyScore);

  return {
    original,
    substitutes: substitutes.slice(0, 6),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. assessExerciseRisk
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Returns a risk level for a given exercise considering every active
 * injury profile.  Includes a human-readable reason and concrete
 * modification suggestions.
 */
export function assessExerciseRisk(
  exerciseId: string,
  injuryProfiles: InjuryProfile[],
): ExerciseRiskAssessment {
  const exercise = getExerciseById(exerciseId);
  if (!exercise) {
    return { risk: 'safe', reason: 'Exercise not found in database.', modifications: [] };
  }

  const active = injuryProfiles.filter(p => p.status !== 'resolved');
  if (active.length === 0) {
    return { risk: 'safe', reason: 'No active injuries.', modifications: [] };
  }

  const exSubPattern = classifyMovementSubPattern(exercise);
  const exMuscles = [...exercise.primaryMuscles, ...exercise.secondaryMuscles];

  let worstRisk: RiskLevel = 'safe';
  const reasons: string[] = [];
  const modifications: string[] = [];

  active.forEach(profile => {
    const riskyPatterns = getRiskyPatterns(profile.region);
    const affectedMuscles = BODY_REGION_MUSCLES[profile.region] || [];
    const muscleOverlap = exMuscles.filter(m => affectedMuscles.includes(m));
    const patternMatch = riskyPatterns.includes(exSubPattern);

    // No relevance to this profile
    if (!patternMatch && muscleOverlap.length === 0) return;

    const regionLabel = profile.region.replace(/_/g, ' ');
    const patternLabel = exSubPattern.replace(/_/g, ' ');

    if (profile.severity === 'severe') {
      if (patternMatch) {
        worstRisk = 'avoid';
        reasons.push(
          `${regionLabel} injury (severe) — ${patternLabel} pattern is high risk`,
        );
      } else if (muscleOverlap.length > 0) {
        if (worstRisk !== 'avoid') worstRisk = 'caution';
        reasons.push(
          `${regionLabel} injury (severe) — involves ${muscleOverlap.join(', ')}`,
        );
      }
    } else if (profile.severity === 'moderate') {
      if (patternMatch) {
        if (worstRisk !== 'avoid') worstRisk = 'caution';
        reasons.push(
          `${regionLabel} injury (moderate) — ${patternLabel} pattern may aggravate`,
        );
      } else if (
        muscleOverlap.length > 0 &&
        exercise.primaryMuscles.some(m => affectedMuscles.includes(m))
      ) {
        if (worstRisk === 'safe') worstRisk = 'caution';
        reasons.push(`${regionLabel} issue — directly loads affected area`);
      }
    } else {
      // mild
      if (patternMatch) {
        if (worstRisk === 'safe') worstRisk = 'caution';
        reasons.push(`Mild ${regionLabel} issue — monitor during this movement`);
      }
    }

    // Gather modifications when there is any relevance
    if (patternMatch || muscleOverlap.length > 0) {
      collectModifications(modifications, profile.region, profile.severity, exercise);
    }
  });

  // Deduplicate
  const uniqueMods: string[] = [];
  const seen = new Set<string>();
  modifications.forEach(m => {
    if (!seen.has(m)) { seen.add(m); uniqueMods.push(m); }
  });

  return {
    risk: worstRisk,
    reason: reasons.length > 0 ? reasons.join('. ') : 'No injury conflict detected.',
    modifications: uniqueMods.slice(0, 5),
  };
}

/** Collect modification suggestions into the provided array (mutates). */
function collectModifications(
  mods: string[],
  region: BodyRegion,
  severity: InjurySeverity,
  exercise: Exercise,
): void {
  // Universal
  mods.push('Use lighter weight (60-70% of normal working weight)');

  if (region.includes('shoulder')) {
    if (exercise.movementPattern === 'push') {
      mods.push('Reduce ROM — stop 2-3 inches above chest on pressing');
      mods.push('Use neutral-grip dumbbells instead of barbell');
      if (exercise.id.includes('overhead') || exercise.id.includes('press')) {
        mods.push('Try landmine press as a shoulder-friendly alternative');
      }
    }
    if (exercise.movementPattern === 'pull') {
      mods.push('Avoid behind-the-neck pull variations');
      mods.push('Use neutral or supinated grip for pulling');
    }
  } else if (region.includes('knee')) {
    mods.push('Limit squat depth to parallel or slightly above');
    mods.push('Use box squats to control depth');
    if (exercise.category === 'isolation') {
      mods.push('Use partial ROM on leg extensions (avoid full flexion)');
    }
    if (severity !== 'mild') {
      mods.push('Try single-leg bodyweight variants first to test tolerance');
    }
  } else if (region === 'lower_back') {
    mods.push('Maintain strict neutral spine — no rounding');
    mods.push('Use a lifting belt for compound lifts');
    if (exercise.movementPattern === 'hinge') {
      mods.push('Try trap bar deadlift or rack pulls to reduce spinal load');
    }
    if (exercise.movementPattern === 'squat') {
      mods.push('Try belt squat or leg press to unload the spine');
    }
  } else if (region.includes('elbow')) {
    mods.push('Use neutral grip where possible');
    mods.push('Avoid aggressive lockout on pressing movements');
    if (exercise.movementPattern === 'pull' || ISOLATION_CURL_IDS.has(exercise.id)) {
      mods.push('Reduce isolation curl volume — favour compound pulling');
    }
  } else if (region.includes('wrist')) {
    mods.push('Use wrist wraps for support');
    mods.push('Try fat grips to distribute load across the palm');
    mods.push('Avoid extreme wrist extension or flexion under load');
  } else if (region.includes('hip')) {
    mods.push('Reduce ROM on squats and hinges');
    mods.push('Use unilateral work to address imbalances');
  } else if (region.includes('ankle')) {
    mods.push('Use heel-elevated shoes or plates under heels for squats');
    mods.push('Avoid explosive jumping until pain-free');
  } else if (region === 'neck') {
    mods.push('Avoid heavy shrugs — use lighter weight with higher reps');
    mods.push('Skip direct neck loading exercises temporarily');
  } else if (region === 'upper_back') {
    mods.push('Use machine rows for added stability');
    mods.push('Add thoracic mobility work before training');
  } else if (region === 'chest') {
    mods.push('Limit pressing ROM (floor press, board press) to protect the pec');
    mods.push('Use controlled tempo — no bouncing off the chest');
  } else if (region === 'core') {
    mods.push('Replace dynamic rotation with anti-extension holds (planks, dead bugs)');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. getInjuryInsights
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate coaching insights from injury profiles and workout history.
 *
 * - Detects recurring injury patterns (same region flaring repeatedly).
 * - Identifies correlation with volume / intensity spikes.
 * - Returns recovery trend per region.
 */
export function getInjuryInsights(
  injuryProfiles: InjuryProfile[],
  workoutLogs: WorkoutLog[],
): InjuryInsights {
  workoutLogs = active(workoutLogs);

  const insights: string[] = [];
  const alerts: string[] = [];
  const recoveryProgress: RecoveryProgress[] = [];

  if (injuryProfiles.length === 0) {
    return {
      insights: ['No active injuries — keep up the consistent training!'],
      alerts: [],
      recoveryProgress: [],
    };
  }

  const today = toLocalDateStr(new Date());

  // ── Per-profile analysis ──
  injuryProfiles.forEach(profile => {
    const regionLabel = profile.region.replace(/_/g, ' ');

    // Recurring flare-ups
    if (profile.painHistory.length >= 3) {
      insights.push(
        `Your ${regionLabel} has had ${profile.painHistory.length} pain events — this is a recurring issue. ` +
        'Consider a dedicated rehab protocol for this area.',
      );
    }

    // Pain trend
    const trend = calculatePainTrend(profile.painHistory);
    recoveryProgress.push({ region: profile.region, trend });

    if (trend === 'worsening') {
      alerts.push(
        `${regionLabel} pain is getting worse over time. ` +
        'Reduce training load on affected movements and consider professional evaluation.',
      );
    } else if (trend === 'improving') {
      insights.push(`${regionLabel} pain is trending downward — recovery is on track.`);
    } else {
      insights.push(`${regionLabel} pain is stable. Continue current management approach.`);
    }

    // Severe + active = high-priority alert
    if (profile.severity === 'severe' && profile.status === 'active') {
      alerts.push(
        `Active severe ${regionLabel} injury. Strongly recommend avoiding all aggravating movements ` +
        'and consulting a healthcare professional.',
      );
    }
  });

  // ── Volume / intensity spike correlation ──
  if (workoutLogs.length >= 4) {
    const chronological = [...workoutLogs].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    injuryProfiles.forEach(profile => {
      if (profile.painHistory.length === 0) return;

      // Earliest pain event date for this region
      const earliestPainDate = profile.painHistory[profile.painHistory.length - 1].date;
      const twoWeeksBefore = new Date(earliestPainDate);
      twoWeeksBefore.setDate(twoWeeksBefore.getDate() - 14);
      const fourWeeksBefore = new Date(earliestPainDate);
      fourWeeksBefore.setDate(fourWeeksBefore.getDate() - 28);

      const preInjuryLogs = chronological.filter(l => {
        const d = new Date(l.date);
        return d >= twoWeeksBefore && d <= new Date(earliestPainDate);
      });
      const baselineLogs = chronological.filter(l => {
        const d = new Date(l.date);
        return d >= fourWeeksBefore && d < twoWeeksBefore;
      });

      // Volume spike check
      if (preInjuryLogs.length >= 2 && baselineLogs.length >= 2) {
        const preVol = preInjuryLogs.reduce((s, l) => s + l.totalVolume, 0) / preInjuryLogs.length;
        const baseVol = baselineLogs.reduce((s, l) => s + l.totalVolume, 0) / baselineLogs.length;

        if (baseVol > 0 && preVol / baseVol > 1.3) {
          const pct = Math.round((preVol / baseVol - 1) * 100);
          const regionLabel = profile.region.replace(/_/g, ' ');
          insights.push(
            `Volume spiked ~${pct}% in the 2 weeks before your ${regionLabel} injury onset. ` +
            'Rapid volume increases (>10-15%/week) are a common injury trigger.',
          );
        }
      }

      // RPE spike check
      if (preInjuryLogs.length >= 2 && baselineLogs.length >= 2) {
        const preRPE = preInjuryLogs.reduce((s, l) => s + l.overallRPE, 0) / preInjuryLogs.length;
        const baseRPE = baselineLogs.reduce((s, l) => s + l.overallRPE, 0) / baselineLogs.length;

        if (preRPE - baseRPE >= 1.5) {
          const regionLabel = profile.region.replace(/_/g, ' ');
          insights.push(
            `Average RPE jumped from ${baseRPE.toFixed(1)} to ${preRPE.toFixed(1)} before your ` +
            `${regionLabel} issue. Intensity spikes combined with volume increases raise injury risk.`,
          );
        }
      }
    });
  }

  // ── Multi-region alert ──
  const activeCount = injuryProfiles.filter(p => p.status === 'active').length;
  if (activeCount >= 2) {
    alerts.push(
      `You have ${activeCount} active injury areas. This may indicate systemic overtraining. ` +
      'Consider a deload week and prioritise sleep and nutrition for recovery.',
    );
  }

  // ── Long-standing injury alert ──
  injuryProfiles.forEach(profile => {
    const daysSinceOnset = daysBetween(today, profile.onsetDate);
    if (daysSinceOnset > 42 && profile.status !== 'resolved') {
      const regionLabel = profile.region.replace(/_/g, ' ');
      alerts.push(
        `${regionLabel} issue has persisted for ${Math.round(daysSinceOnset)} days. ` +
        'Chronic pain beyond 6 weeks warrants professional assessment.',
      );
    }
  });

  return { insights, alerts, recoveryProgress };
}

/** Compare recent vs older pain levels to determine a trend direction. */
function calculatePainTrend(history: PainHistoryEntry[]): InjuryTrend {
  if (history.length < 2) return 'stable';

  // History is already sorted newest-first
  const mid = Math.floor(history.length / 2);
  const recentHalf = history.slice(0, mid);
  const olderHalf = history.slice(mid);

  if (recentHalf.length === 0 || olderHalf.length === 0) return 'stable';

  const recentAvg = recentHalf.reduce((s, e) => s + e.level, 0) / recentHalf.length;
  const olderAvg = olderHalf.reduce((s, e) => s + e.level, 0) / olderHalf.length;
  const diff = recentAvg - olderAvg;

  if (diff >= 1) return 'worsening';
  if (diff <= -1) return 'improving';
  return 'stable';
}
