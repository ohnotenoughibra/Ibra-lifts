/**
 * smart-pick — generate a single workout recommendation that considers
 * injury state + readiness + scheduled plan + recent training load.
 *
 * Two paths:
 *   1. Scheduled session exists → adapt it (the store's startWorkout already
 *      auto-applies injury adaptations + autoregulation; we surface what's
 *      changing so the user sees *why* this is the right session right now).
 *   2. No scheduled session → generate from scratch via the existing
 *      injury-aware-workout engine, with constraints auto-derived from
 *      active injuries.
 *
 * This is the "Smart pick" option in WorkoutStartChooser.
 */

import type { WorkoutSession, UserProfile, InjuryEntry, BodyRegion, ReadinessLevel } from './types';
import {
  generateInjuryAwareWorkout,
  suggestConstraintsFromActiveInjuries,
  prettyConstraint,
  type MovementConstraint,
} from './injury-aware-workout';
import { getActiveInjuryAdaptations } from './injury-science';
import { getReadinessSummary } from './performance-engine';

export interface SmartPickOptions {
  user: UserProfile | null;
  injuryLog: InjuryEntry[];
  scheduledSession?: WorkoutSession | null;
  readinessOpts: Parameters<typeof getReadinessSummary>[0];
  durationMinutes?: number;
}

export interface SmartPickResult {
  session: WorkoutSession;
  /** Human-readable reasons shown to the user before they commit. */
  rationale: string[];
  /** 'scheduled-adapted' = your plan with auto-tweaks. 'generated' = built from scratch. */
  source: 'scheduled-adapted' | 'generated';
  readinessScore: number | null;
  readinessLevel: ReadinessLevel | null;
  /** Pretty constraint labels actually applied (e.g. "No deep knee flexion"). */
  injuryConstraints: string[];
}

export function generateSmartPick(opts: SmartPickOptions): SmartPickResult | null {
  const { user, injuryLog, scheduledSession, readinessOpts, durationMinutes = 45 } = opts;

  if (!user) return null;

  const readiness = getReadinessSummary(readinessOpts);
  const injuryAdaptations = getActiveInjuryAdaptations(injuryLog);
  const activeRegions: BodyRegion[] = injuryAdaptations.classifications.map(c => c.bodyRegion);
  const constraints: MovementConstraint[] = suggestConstraintsFromActiveInjuries(activeRegions);
  const prettyConstraints = constraints.map(prettyConstraint);

  const rationale: string[] = [];

  if (scheduledSession) {
    // The store's startWorkout already auto-applies these. We surface them.
    rationale.push(`Today's session: ${scheduledSession.name}`);
    if (readiness) {
      const v = Math.round(readiness.volumeModifier * 100);
      const i = Math.round(readiness.intensityModifier * 100);
      if (v !== 100 || i !== 100) {
        rationale.push(`Readiness ${readiness.score}% (${readiness.level}) — auto-scaling volume to ${v}%, intensity to ${i}%`);
      } else {
        rationale.push(`Readiness ${readiness.score}% (${readiness.level}) — full intensity green-lit`);
      }
    }
    if (injuryAdaptations.allAvoidExercises.length > 0) {
      rationale.push(`Avoiding ${injuryAdaptations.allAvoidExercises.length} exercise${injuryAdaptations.allAvoidExercises.length > 1 ? 's' : ''} due to active injury`);
    }
    if (prettyConstraints.length > 0) {
      rationale.push(`Movement limits: ${prettyConstraints.slice(0, 3).join(', ')}${prettyConstraints.length > 3 ? `, +${prettyConstraints.length - 3} more` : ''}`);
    }
    return {
      session: scheduledSession,
      rationale,
      source: 'scheduled-adapted',
      readinessScore: readiness?.score ?? null,
      readinessLevel: readiness?.level ?? null,
      injuryConstraints: prettyConstraints,
    };
  }

  // No scheduled session — generate from scratch.
  const generated = generateInjuryAwareWorkout({
    bodyRegions: activeRegions,
    constraints,
    durationMinutes,
    workoutType: 'hypertrophy', // safe default; user can tweak via Custom path if they want strength/power
    equipment: user.equipment,
    availableEquipment: user.availableEquipment,
    trainingIdentity: user.trainingIdentity,
  });

  rationale.push(`Generated ${durationMinutes}-min session — no scheduled plan today`);
  if (readiness) {
    rationale.push(`Readiness ${readiness.score}% (${readiness.level})`);
  }
  if (prettyConstraints.length > 0) {
    rationale.push(`Working around: ${prettyConstraints.slice(0, 3).join(', ')}${prettyConstraints.length > 3 ? `, +${prettyConstraints.length - 3} more` : ''}`);
  }
  if (generated.excludedExerciseCount > 0) {
    rationale.push(`Filtered out ${generated.excludedExerciseCount} exercises that conflict with active injuries`);
  }

  return {
    session: generated.session,
    rationale,
    source: 'generated',
    readinessScore: readiness?.score ?? null,
    readinessLevel: readiness?.level ?? null,
    injuryConstraints: prettyConstraints,
  };
}
