/**
 * Superset / Circuit Timer Engine
 *
 * Manages paired and grouped exercise execution inside ActiveWorkout.
 * Uses the existing SupersetGroup type from types.ts.
 *
 * Execution flow:
 *   Superset A1/A2: A1 set 1 → (short rest) → A2 set 1 → (full rest) → A1 set 2 → ...
 *   Circuit A1/A2/A3: A1 → A2 → A3 → (full rest) → repeat
 *   Dropset: same exercise, decreasing weight, no rest between drops
 */

import type { SupersetGroup, ExercisePrescription } from './types';

// ── Types ────────────────────────────────────────────────────────────────

export interface SupersetState {
  group: SupersetGroup;
  currentRound: number;           // 0-indexed
  totalRounds: number;
  currentExerciseInGroup: number; // index within the group's exercise list
  isRestBetweenExercises: boolean;
  isRestAfterGroup: boolean;
  completedExercisesThisRound: Set<string>;
}

export interface SupersetStep {
  action: 'perform' | 'rest_between' | 'rest_after' | 'complete';
  exerciseId?: string;
  exerciseName?: string;
  restSeconds?: number;
  label: string;
  roundLabel: string;            // e.g. "Round 2 of 4"
}

// ── Superset Detection ───────────────────────────────────────────────────

/**
 * Auto-detect potential superset pairs from a flat exercise list.
 * Pairs antagonist muscle groups that are adjacent in the list.
 */
export function detectSupersetCandidates(
  exercises: ExercisePrescription[],
): { indexA: number; indexB: number; reason: string }[] {
  const pairs: { indexA: number; indexB: number; reason: string }[] = [];

  const antagonistPairs: Record<string, string[]> = {
    chest: ['back'],
    back: ['chest'],
    biceps: ['triceps'],
    triceps: ['biceps'],
    quadriceps: ['hamstrings'],
    hamstrings: ['quadriceps'],
    shoulders: ['chest'],
    abs: ['lower_back'],
  };

  for (let i = 0; i < exercises.length - 1; i++) {
    const a = exercises[i];
    const b = exercises[i + 1];
    const aPrimary = a.exercise.primaryMuscles[0];
    const bPrimary = b.exercise.primaryMuscles[0];

    if (antagonistPairs[aPrimary]?.includes(bPrimary)) {
      pairs.push({
        indexA: i,
        indexB: i + 1,
        reason: `${a.exercise.name} + ${b.exercise.name} (${aPrimary}/${bPrimary} antagonist pair)`,
      });
      i++; // skip the paired exercise
    }
  }

  return pairs;
}

/**
 * Create a SupersetGroup from exercise indices.
 */
export function createSupersetGroup(
  exercises: ExercisePrescription[],
  indices: number[],
  type: SupersetGroup['type'] = 'superset',
): SupersetGroup {
  return {
    id: Math.random().toString(36).slice(2, 9),
    exerciseIds: indices.map(i => exercises[i].exerciseId),
    type,
    restBetweenExercises: type === 'dropset' ? 0 : 15,
    restAfterGroup: type === 'circuit' ? 120 : 90,
  };
}

// ── Execution State Machine ──────────────────────────────────────────────

/**
 * Initialize superset execution state.
 */
export function initSupersetState(
  group: SupersetGroup,
  totalSetsPerExercise: number,
): SupersetState {
  return {
    group,
    currentRound: 0,
    totalRounds: totalSetsPerExercise,
    currentExerciseInGroup: 0,
    isRestBetweenExercises: false,
    isRestAfterGroup: false,
    completedExercisesThisRound: new Set(),
  };
}

/**
 * Get the next step in superset execution.
 */
export function getNextSupersetStep(
  state: SupersetState,
  exerciseNames: Map<string, string>,
): SupersetStep {
  const { group, currentRound, totalRounds, currentExerciseInGroup } = state;
  const exerciseCount = group.exerciseIds.length;

  // All rounds complete
  if (currentRound >= totalRounds) {
    return {
      action: 'complete',
      label: `${group.type === 'circuit' ? 'Circuit' : 'Superset'} complete`,
      roundLabel: `${totalRounds}/${totalRounds}`,
    };
  }

  // Rest between exercises within a round
  if (state.isRestBetweenExercises) {
    return {
      action: 'rest_between',
      restSeconds: group.restBetweenExercises,
      label: `Quick rest — next up: ${exerciseNames.get(group.exerciseIds[currentExerciseInGroup]) || 'Exercise'}`,
      roundLabel: `Round ${currentRound + 1} of ${totalRounds}`,
    };
  }

  // Rest after completing a full round
  if (state.isRestAfterGroup) {
    return {
      action: 'rest_after',
      restSeconds: group.restAfterGroup,
      label: `Round ${currentRound + 1} complete — full rest`,
      roundLabel: `Round ${currentRound + 1} of ${totalRounds}`,
    };
  }

  // Perform the current exercise
  const exerciseId = group.exerciseIds[currentExerciseInGroup];
  const typeLabel = group.type === 'superset'
    ? String.fromCharCode(65 + currentExerciseInGroup) // A, B, C...
    : `${currentExerciseInGroup + 1}`;

  return {
    action: 'perform',
    exerciseId,
    exerciseName: exerciseNames.get(exerciseId),
    label: `${typeLabel}${currentExerciseInGroup + 1 < exerciseCount ? ' →' : ''} ${exerciseNames.get(exerciseId) || 'Exercise'}`,
    roundLabel: `Round ${currentRound + 1} of ${totalRounds}`,
  };
}

/**
 * Advance the superset state after completing an exercise or rest.
 */
export function advanceSupersetState(state: SupersetState): SupersetState {
  const { group, currentRound, currentExerciseInGroup } = state;
  const exerciseCount = group.exerciseIds.length;

  // Was resting between exercises → move to next exercise
  if (state.isRestBetweenExercises) {
    return { ...state, isRestBetweenExercises: false };
  }

  // Was resting after round → advance to next round
  if (state.isRestAfterGroup) {
    return {
      ...state,
      isRestAfterGroup: false,
      currentRound: currentRound + 1,
      currentExerciseInGroup: 0,
      completedExercisesThisRound: new Set(),
    };
  }

  // Completed an exercise set
  const nextIndex = currentExerciseInGroup + 1;

  if (nextIndex < exerciseCount) {
    // More exercises in this round
    return {
      ...state,
      currentExerciseInGroup: nextIndex,
      isRestBetweenExercises: group.restBetweenExercises > 0,
    };
  }

  // Completed the round
  if (currentRound + 1 < state.totalRounds) {
    // More rounds to go
    return {
      ...state,
      isRestAfterGroup: true,
    };
  }

  // All done
  return {
    ...state,
    currentRound: state.totalRounds,
  };
}

// ── Display Helpers ──────────────────────────────────────────────────────

/**
 * Format superset group for display in workout overview.
 */
export function formatGroupLabel(group: SupersetGroup): string {
  const prefix = group.type === 'superset' ? 'Superset'
    : group.type === 'circuit' ? 'Circuit'
    : 'Dropset';
  return `${prefix} (${group.exerciseIds.length} exercises)`;
}

/**
 * Get the total time estimate for a superset group.
 */
export function estimateGroupDuration(
  group: SupersetGroup,
  setsPerExercise: number,
  avgSetDurationSec: number = 40,
): number {
  const exerciseCount = group.exerciseIds.length;
  const rounds = setsPerExercise;
  const setTime = exerciseCount * avgSetDurationSec;
  const betweenRests = (exerciseCount - 1) * group.restBetweenExercises;
  const roundTime = setTime + betweenRests + group.restAfterGroup;
  return Math.round((rounds * roundTime) / 60); // minutes
}
