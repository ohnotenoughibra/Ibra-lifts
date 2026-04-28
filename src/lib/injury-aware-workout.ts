/**
 * Injury-Aware Workout — generate a session that respects user-described
 * limitations *for today*. This is different from rehab: the user wants to
 * train normally but has a constraint ("knee can't bend deeply", "shoulder
 * pinches overhead"). We filter the exercise pool through their constraints
 * and produce a workable session.
 *
 * Sits on top of:
 *   - `exercises.ts` (the catalog)
 *   - `injury-science.ts` (region → avoid/modify maps)
 *   - `injury-intelligence.ts` (assessExerciseRisk)
 *   - `workout-generator.ts` (createSetPrescription via type)
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Exercise, MuscleGroup, MovementPattern, BodyRegion, Equipment,
  EquipmentType, WorkoutSession, ExercisePrescription, WorkoutType,
  TrainingIdentity,
} from './types';
import { exercises as ALL_EXERCISES, getExercisesByEquipment } from './exercises';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Concrete movement constraints. These map to exercise filters that are more
 * granular than just "don't load this body region." A grappler with a tweaky
 * knee can deadlift heavy — they just can't squat to depth.
 */
export type MovementConstraint =
  | 'no_deep_knee_flexion'      // no deep squats, lunges to depth
  | 'no_knee_loading'           // no leg press, no heavy squats
  | 'no_overhead'               // no OHP, no pull-up
  | 'no_horizontal_press'       // no bench, no push-up
  | 'no_pulling_load'           // no rows, no deadlifts
  | 'no_hinging'                // no deadlift, no RDL, no good morning
  | 'no_spinal_loading'         // no back squat, no overhead with bar
  | 'no_rotation'               // no Russian twists, no woodchops
  | 'no_impact'                 // no jumps, no running, no plyo
  | 'no_grip_intensive'         // no farmers, no deadlifts, no pull-ups
  | 'no_static_holds'           // no planks, no carries
  | 'no_neck_loading'           // no shrugs, no heavy traps
  | 'no_wrist_extension';       // no bench (full grip), no front squat rack

export interface InjuryAwareWorkoutOptions {
  bodyRegions: BodyRegion[];                    // affected regions
  constraints: MovementConstraint[];            // movement limits
  durationMinutes: number;                      // 20 / 30 / 45 / 60
  workoutType: WorkoutType;                     // strength / hypertrophy / power / strength_endurance
  equipment: Equipment;                         // full_gym / home_gym / minimal
  availableEquipment?: EquipmentType[];         // granular equipment
  trainingIdentity?: TrainingIdentity;
  focusMuscles?: MuscleGroup[];                 // optional: prioritize these (e.g. "I want upper body")
}

export interface InjuryAwareWorkoutResult {
  session: WorkoutSession;
  excludedExerciseCount: number;
  appliedConstraints: MovementConstraint[];
  notes: string[];
}

// ---------------------------------------------------------------------------
// Constraint → exercise-id and movement-pattern filters
// ---------------------------------------------------------------------------

/**
 * Constraint filters. Each constraint returns true if the exercise should be
 * REMOVED. Conservative: when in doubt, exclude.
 */
const CONSTRAINT_FILTERS: Record<MovementConstraint, (ex: Exercise) => boolean> = {
  no_deep_knee_flexion: (ex) => {
    const id = ex.id.toLowerCase();
    if (ex.movementPattern === 'squat') return true;
    return /lunge|split.squat|sissy|pistol|step.up.*high/.test(id);
  },
  no_knee_loading: (ex) => {
    if (ex.movementPattern === 'squat') return true;
    const id = ex.id.toLowerCase();
    return /leg.press|leg.extension|leg.curl|lunge|step.up|jump|box|sprint/.test(id);
  },
  no_overhead: (ex) => {
    const id = ex.id.toLowerCase();
    return /overhead|press.*shoulder|military|push.press|jerk|snatch|pull.up|chin.up|lat.pulldown|handstand/.test(id);
  },
  no_horizontal_press: (ex) => {
    const id = ex.id.toLowerCase();
    return /bench|push.up|fly|dip|chest.press|cable.cross/.test(id);
  },
  no_pulling_load: (ex) => {
    if (ex.movementPattern === 'pull' || ex.movementPattern === 'hinge') return true;
    return false;
  },
  no_hinging: (ex) => {
    if (ex.movementPattern === 'hinge') return true;
    const id = ex.id.toLowerCase();
    return /deadlift|romanian|good.morning|kettlebell.swing|hip.thrust/.test(id);
  },
  no_spinal_loading: (ex) => {
    const id = ex.id.toLowerCase();
    return /back.squat|front.squat|barbell.row|barbell.shrug|deadlift(?!.*trap.bar)/.test(id);
  },
  no_rotation: (ex) => {
    if (ex.movementPattern === 'rotation') return true;
    const id = ex.id.toLowerCase();
    return /russian.twist|wood.?chop|rotation|cable.twist|landmine/.test(id);
  },
  no_impact: (ex) => {
    if (ex.movementPattern === 'explosive') return true;
    const id = ex.id.toLowerCase();
    return /jump|hop|bound|sprint|plyo|box|run|skip/.test(id);
  },
  no_grip_intensive: (ex) => {
    const id = ex.id.toLowerCase();
    return /deadlift|farmer|carry|pull.up|chin.up|hang|dead.hang|towel|fat.grip/.test(id);
  },
  no_static_holds: (ex) => {
    const id = ex.id.toLowerCase();
    return /plank|carry|hold|hang|hollow|l.sit/.test(id);
  },
  no_neck_loading: (ex) => {
    const id = ex.id.toLowerCase();
    return /shrug|neck|upright.row/.test(id);
  },
  no_wrist_extension: (ex) => {
    const id = ex.id.toLowerCase();
    return /front.squat|clean|wrist.curl|push.up|handstand/.test(id);
  },
};

// ---------------------------------------------------------------------------
// Body region → exercise IDs to avoid (mirror of injury-science.ts)
// ---------------------------------------------------------------------------

const REGION_AVOID: Record<BodyRegion, RegExp> = {
  neck:            /shrug|upright.row|neck/i,
  left_shoulder:   /overhead|military|push.press|bench|dip|fly|lateral.raise|snatch|jerk/i,
  right_shoulder:  /overhead|military|push.press|bench|dip|fly|lateral.raise|snatch|jerk/i,
  chest:           /bench|push.up|dip|fly|cable.cross|chest.press/i,
  upper_back:      /barbell.row|pull.up|deadlift/i,
  lower_back:      /deadlift(?!.*trap.bar)|good.morning|barbell.row|back.squat|bent.over/i,
  core:            /sit.up|leg.raise|ab.wheel|deadlift/i,
  left_elbow:      /skull.crusher|preacher|tricep.extension|close.grip|wrist.curl/i,
  right_elbow:     /skull.crusher|preacher|tricep.extension|close.grip|wrist.curl/i,
  left_wrist:      /wrist.curl|front.squat|clean|push.up.*hand|handstand/i,
  right_wrist:     /wrist.curl|front.squat|clean|push.up.*hand|handstand/i,
  left_hip:        /back.squat|front.squat|lunge|hip.thrust|leg.press/i,
  right_hip:       /back.squat|front.squat|lunge|hip.thrust|leg.press/i,
  left_knee:       /leg.extension|back.squat|front.squat|lunge|leg.press|jump|box.jump|pistol/i,
  right_knee:      /leg.extension|back.squat|front.squat|lunge|leg.press|jump|box.jump|pistol/i,
  left_ankle:      /calf.raise|jump.rope|box.jump|sprint|run|hop/i,
  right_ankle:     /calf.raise|jump.rope|box.jump|sprint|run|hop/i,
};

// ---------------------------------------------------------------------------
// Set prescription
// ---------------------------------------------------------------------------

function buildPrescription(type: WorkoutType) {
  switch (type) {
    case 'strength':
      return { targetReps: 5, minReps: 3, maxReps: 6, rpe: 8, restSeconds: 180, percentageOf1RM: 85 };
    case 'hypertrophy':
      return { targetReps: 10, minReps: 8, maxReps: 12, rpe: 8, restSeconds: 90, percentageOf1RM: 70 };
    case 'power':
      return { targetReps: 4, minReps: 3, maxReps: 5, rpe: 7, restSeconds: 150, percentageOf1RM: 60 };
    case 'strength_endurance':
      return { targetReps: 12, minReps: 10, maxReps: 15, rpe: 8, restSeconds: 60, percentageOf1RM: 60 };
  }
}

// ---------------------------------------------------------------------------
// Pool selection
// ---------------------------------------------------------------------------

function buildSafePool(opts: InjuryAwareWorkoutOptions): { safe: Exercise[]; excluded: number } {
  const allAvailable = getExercisesByEquipment(opts.equipment);

  const violatesConstraint = (ex: Exercise) =>
    opts.constraints.some(c => CONSTRAINT_FILTERS[c]?.(ex));

  const inAvoidedRegion = (ex: Exercise) =>
    opts.bodyRegions.some(r => REGION_AVOID[r].test(ex.id) || REGION_AVOID[r].test(ex.name));

  const safe = allAvailable.filter((ex: Exercise) => !violatesConstraint(ex) && !inAvoidedRegion(ex));
  return { safe, excluded: allAvailable.length - safe.length };
}

// ---------------------------------------------------------------------------
// Workout assembly
// ---------------------------------------------------------------------------

/**
 * Build a session: pick compounds first (3-5), fill with isolations (1-3),
 * respect duration. Heavily weighted toward unaffected regions.
 */
export function generateInjuryAwareWorkout(opts: InjuryAwareWorkoutOptions): InjuryAwareWorkoutResult {
  const { safe, excluded } = buildSafePool(opts);
  const presc = buildPrescription(opts.workoutType);

  // How many exercises by duration
  const compoundCount = opts.durationMinutes <= 25 ? 2 : opts.durationMinutes <= 40 ? 3 : 4;
  const isolationCount = opts.durationMinutes <= 25 ? 1 : opts.durationMinutes <= 40 ? 2 : 3;

  // Score exercises higher if they hit the focus muscles
  const focusSet = new Set(opts.focusMuscles ?? []);
  const score = (ex: Exercise) => {
    let s = 0;
    if (ex.primaryMuscles.some(m => focusSet.has(m))) s += 5;
    if (ex.secondaryMuscles.some(m => focusSet.has(m))) s += 2;
    if (opts.trainingIdentity === 'combat' && ex.grapplerFriendly) s += 1;
    return s + Math.random();
  };

  const sortedSafe = [...safe].sort((a, b) => score(b) - score(a));

  const compounds = sortedSafe.filter(e => e.category === 'compound').slice(0, compoundCount);
  const usedIds = new Set(compounds.map(e => e.id));

  const isolations = sortedSafe
    .filter(e => e.category === 'isolation' && !usedIds.has(e.id))
    .slice(0, isolationCount);

  // If we couldn't get enough compounds, top up with whatever's safe
  const fillers = compounds.length + isolations.length < compoundCount + isolationCount
    ? sortedSafe.filter(e => !usedIds.has(e.id) && !isolations.some(i => i.id === e.id))
        .slice(0, (compoundCount + isolationCount) - compounds.length - isolations.length)
    : [];

  const all = [...compounds, ...isolations, ...fillers];

  const exercises: ExercisePrescription[] = all.map(exercise => ({
    exerciseId: exercise.id,
    exercise,
    sets: 3,
    prescription: presc,
    notes: '',
  }));

  const notes: string[] = [];
  if (opts.bodyRegions.length > 0) {
    const labels = opts.bodyRegions.map(prettyRegion).join(', ');
    notes.push(`Avoiding ${labels} — exercises that load these regions are excluded.`);
  }
  if (opts.constraints.length > 0) {
    notes.push(`Movement limits respected: ${opts.constraints.map(prettyConstraint).join(', ')}.`);
  }
  if (excluded > 0) {
    notes.push(`${excluded} exercises filtered out of the pool.`);
  }
  if (all.length === 0) {
    notes.push('No safe exercises matched these constraints. Loosen one or check equipment.');
  }

  const session: WorkoutSession = {
    id: uuidv4(),
    name: `Injury-Aware ${prettyWorkoutType(opts.workoutType)}`,
    type: opts.workoutType,
    dayNumber: 1,
    exercises,
    estimatedDuration: opts.durationMinutes,
    warmUp: [
      '5 min easy cardio — bike, walk, or row to warm up safely',
      'Joint circles for unaffected regions',
      'Avoid loading the affected area in warm-up',
    ],
    coolDown: [
      'Slow walking 3 min',
      'Light stretching (pain-free range only)',
    ],
  };

  return {
    session,
    excludedExerciseCount: excluded,
    appliedConstraints: opts.constraints,
    notes,
  };
}

// ---------------------------------------------------------------------------
// Smart suggestions — based on logged active injuries
// ---------------------------------------------------------------------------

/**
 * Given the user's active injuries, suggest a sensible default constraint set.
 */
export function suggestConstraintsFromActiveInjuries(
  bodyRegions: BodyRegion[]
): MovementConstraint[] {
  const set = new Set<MovementConstraint>();
  for (const r of bodyRegions) {
    if (r === 'left_knee' || r === 'right_knee') {
      set.add('no_deep_knee_flexion');
      set.add('no_impact');
    }
    if (r === 'left_shoulder' || r === 'right_shoulder') {
      set.add('no_overhead');
    }
    if (r === 'lower_back') {
      set.add('no_spinal_loading');
      set.add('no_hinging');
    }
    if (r === 'upper_back') {
      set.add('no_spinal_loading');
    }
    if (r === 'left_ankle' || r === 'right_ankle') {
      set.add('no_impact');
    }
    if (r === 'left_wrist' || r === 'right_wrist') {
      set.add('no_wrist_extension');
    }
    if (r === 'left_elbow' || r === 'right_elbow') {
      set.add('no_grip_intensive');
    }
    if (r === 'core') {
      set.add('no_rotation');
      set.add('no_static_holds');
    }
    if (r === 'neck') {
      set.add('no_neck_loading');
      set.add('no_overhead');
    }
  }
  return Array.from(set);
}

// ---------------------------------------------------------------------------
// Pretty labels
// ---------------------------------------------------------------------------

export function prettyConstraint(c: MovementConstraint): string {
  const map: Record<MovementConstraint, string> = {
    no_deep_knee_flexion: 'No deep knee flexion',
    no_knee_loading: 'No loaded knee work',
    no_overhead: 'No overhead pressing',
    no_horizontal_press: 'No horizontal pressing',
    no_pulling_load: 'No loaded pulling',
    no_hinging: 'No hip hinging',
    no_spinal_loading: 'No spinal loading',
    no_rotation: 'No rotation',
    no_impact: 'No impact / jumping',
    no_grip_intensive: 'No grip-heavy lifts',
    no_static_holds: 'No isometric holds',
    no_neck_loading: 'No neck loading',
    no_wrist_extension: 'No loaded wrist extension',
  };
  return map[c];
}

export function prettyRegion(r: BodyRegion): string {
  return r.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function prettyWorkoutType(t: WorkoutType): string {
  return t.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Re-export so the UI doesn't need two imports
export { ALL_EXERCISES };
