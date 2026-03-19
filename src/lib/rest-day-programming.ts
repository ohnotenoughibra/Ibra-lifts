/**
 * rest-day-programming.ts — Structured rest day prescriptions
 *
 * Generates evidence-based active recovery sessions tailored to the athlete's
 * current soreness, readiness, recent training load, and fight-camp status.
 * Rest days are not "do nothing" days — they are programmed recovery sessions
 * that accelerate adaptation and reduce DOMS.
 *
 * Science references:
 * - Dupuy et al. 2018: Active recovery is superior to passive for DOMS reduction
 *   and perceived fatigue (meta-analysis of 99 studies)
 * - Behm & Chaouachi 2011: Static stretching improves ROM when used for recovery
 *   (not before performance — save it for rest days)
 * - Schoenfeld & Grgic 2020: Foam rolling reduces DOMS by ~15% and improves
 *   short-term ROM without impairing force production
 * - Beardsley & Škarabot 2015: Foam rolling mechanisms — likely neurological
 *   (pain modulation) rather than fascial release
 * - Wiewelhove et al. 2019: Active recovery at 30-60% HRmax clears lactate
 *   faster and improves next-day readiness
 *
 * Tier 1 engine — imports Tier 0 only (types.ts)
 * Pure functions only — no React, no store, no side effects.
 */

import type { MuscleGroup } from './types';

// ─── Types ───────────────────────────────────────────────────────────────────

export type RestDayActivity =
  | 'mobility_flow'
  | 'yoga'
  | 'light_cardio'
  | 'foam_rolling'
  | 'contrast_therapy'
  | 'walk'
  | 'swim'
  | 'full_rest';

export interface RestDayExercise {
  name: string;
  duration: number; // seconds
  sets?: number;
  notes: string;
}

export interface RestDaySession {
  activity: RestDayActivity;
  duration: number; // minutes
  targetAreas: MuscleGroup[];
  exercises: RestDayExercise[];
  notes: string;
}

export interface RestDayPrescription {
  primary: RestDaySession;
  optional: RestDaySession | null;
  totalDuration: number; // minutes
  rationale: string;
  intensityCap: number; // RPE 1-10 — never exceed this on a rest day
}

export interface PrescribeRestDayParams {
  readinessScore: number; // 0-100
  soreAreas: MuscleGroup[];
  recentTrainingLoad: number; // 0-100 (weekly load from conditioning or lifting)
  isFightCamp: boolean;
  daysSinceLastRest: number;
  preferredActivities?: RestDayActivity[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Readiness thresholds that determine rest day intensity.
 * Wiewelhove et al. 2019: active recovery only benefits when athlete is not
 * systemically overtrained — below 30 readiness, full rest is better.
 */
const READINESS_THRESHOLDS = {
  CRITICAL: 30, // Full rest, maybe contrast therapy
  LOW: 50, // Light walking or easy mobility only
  MODERATE: 70, // Standard active recovery (mobility + foam rolling)
  HIGH: 85, // Can include light cardio or yoga
} as const;

/**
 * Foam rolling duration per area in seconds.
 * Schoenfeld & Grgic 2020: 60-120s per muscle group is the effective range.
 * Going beyond 120s yields diminishing returns.
 */
const FOAM_ROLL_DURATION = {
  MIN_PER_AREA: 60,
  MAX_PER_AREA: 90,
  REST_BETWEEN: 15,
} as const;

// ─── Mobility Exercise Database ──────────────────────────────────────────────

/**
 * Mobility exercises organized by target muscle group.
 * Each exercise includes duration and coaching notes.
 * These are ROM-focused movements, not strength work.
 */
const MOBILITY_EXERCISES: Record<MuscleGroup, RestDayExercise[]> = {
  chest: [
    { name: 'Doorway Pec Stretch', duration: 30, sets: 2, notes: 'Elbow at 90° — lean forward gently until stretch is felt across the pec. Hold, breathe.' },
    { name: 'Chest Opener on Foam Roller', duration: 45, notes: 'Lie lengthwise on roller, arms out to sides, palms up. Let gravity open the chest.' },
  ],
  back: [
    { name: 'Cat-Cow', duration: 60, sets: 2, notes: 'Slow, controlled. Inhale into extension, exhale into flexion. 8-10 reps per set.' },
    { name: 'Thread the Needle', duration: 30, sets: 2, notes: 'Reach under the opposite arm, rotating through the thoracic spine. Hold end range briefly.' },
    { name: 'Child\'s Pose with Lateral Reach', duration: 45, notes: 'Walk hands to one side to bias the lats. 20s each side.' },
  ],
  shoulders: [
    { name: 'Shoulder Dislocates (band/dowel)', duration: 45, sets: 2, notes: 'Wide grip, slow arc overhead and behind. Narrow grip only if pain-free.' },
    { name: 'Wall Slides', duration: 45, sets: 2, notes: 'Back and arms flat against wall. Slide arms up/down for 10 reps. Scapular control.' },
    { name: 'Cross-Body Shoulder Stretch', duration: 30, sets: 2, notes: '15s each arm. Pull across the body at chest height.' },
  ],
  biceps: [
    { name: 'Wall Bicep Stretch', duration: 30, sets: 2, notes: 'Palm flat on wall, arm extended, rotate body away. 15s each arm.' },
  ],
  triceps: [
    { name: 'Overhead Tricep Stretch', duration: 30, sets: 2, notes: 'Reach behind head, gentle pull with opposite hand. 15s each arm.' },
  ],
  quadriceps: [
    { name: 'Couch Stretch', duration: 60, sets: 2, notes: 'Rear foot elevated on couch/wall. Squeeze glute on stretched side. 30s each leg.' },
    { name: 'Standing Quad Pull', duration: 30, sets: 2, notes: 'Pull heel to glute, keep knees together. 15s each leg.' },
  ],
  hamstrings: [
    { name: 'Seated Forward Fold', duration: 45, notes: 'Legs straight, hinge at hips. Reach for toes — don\'t round the lower back.' },
    { name: 'Single-Leg RDL Stretch', duration: 60, sets: 2, notes: 'Bodyweight only. Slow hinge, feel the hamstring lengthen. 30s each leg.' },
  ],
  glutes: [
    { name: 'Pigeon Pose', duration: 60, sets: 2, notes: '30s each side. Keep hips square. Lean forward to deepen. (Behm & Chaouachi 2011)' },
    { name: '90/90 Hip Switch', duration: 60, sets: 2, notes: 'Sit with legs in 90/90 position, rotate hips to switch sides. 8 reps per set.' },
    { name: 'Supine Figure-4 Stretch', duration: 60, sets: 2, notes: 'Ankle on opposite knee, pull thigh toward chest. 30s each side.' },
  ],
  calves: [
    { name: 'Wall Calf Stretch', duration: 40, sets: 2, notes: '20s each leg. Straight knee = gastrocnemius, bent knee = soleus.' },
    { name: 'Downward Dog Pedal', duration: 45, notes: 'Alternate bending knees to stretch each calf dynamically.' },
  ],
  core: [
    { name: 'Dead Bug', duration: 60, sets: 2, notes: 'Slow, controlled. 8 reps per set. Focus on keeping lower back pressed into the floor.' },
    { name: 'Supine Spinal Twist', duration: 60, notes: '30s each side. Let gravity pull the knee across the body. Breathe deeply.' },
    { name: 'Prone Press-Up (McKenzie)', duration: 45, sets: 2, notes: 'Press chest up from prone. Hips stay on the floor. Gentle spinal extension.' },
  ],
  forearms: [
    { name: 'Wrist Flexor Stretch', duration: 30, sets: 2, notes: 'Arm extended, palm up, pull fingers back gently. 15s each arm.' },
    { name: 'Wrist Extensor Stretch', duration: 30, sets: 2, notes: 'Arm extended, palm down, pull fingers toward you. 15s each arm.' },
    { name: 'Prayer Stretch', duration: 30, notes: 'Palms together in front of chest, lower hands until stretch is felt in wrists.' },
  ],
  traps: [
    { name: 'Upper Trap Stretch', duration: 40, sets: 2, notes: 'Tilt head to one side, gently pull with opposite hand. 20s each side.' },
    { name: 'Levator Scapulae Stretch', duration: 40, sets: 2, notes: 'Turn head 45° to one side, look down, gentle pull. 20s each side.' },
  ],
  full_body: [
    { name: 'Sun Salutation A', duration: 90, sets: 2, notes: 'Slow, breath-driven flow. Forward fold → plank → cobra → downward dog. 3 cycles per set.' },
    { name: 'World\'s Greatest Stretch', duration: 60, sets: 2, notes: 'Lunge, rotate, reach. 5 reps each side. Hits hips, thoracic spine, and hamstrings.' },
    { name: 'Inchworms', duration: 45, sets: 2, notes: 'Walk hands out to plank, walk feet to hands. 6 reps per set. Slow and controlled.' },
  ],
};

/**
 * Foam rolling exercises organized by target muscle group.
 * Beardsley & Škarabot 2015: slow rolling at moderate pressure is most effective.
 */
const FOAM_ROLL_EXERCISES: Record<MuscleGroup, RestDayExercise> = {
  chest: { name: 'Pec Roll (ball)', duration: 60, notes: 'Use a lacrosse ball against a wall. Slow passes across the pec, pausing on tender spots.' },
  back: { name: 'Thoracic Spine Roll', duration: 90, notes: 'Foam roller across upper back. Cross arms over chest. Roll from mid-back to upper traps.' },
  shoulders: { name: 'Posterior Delt Roll (ball)', duration: 60, notes: 'Lacrosse ball against wall behind the shoulder. Slow circles over the rear delt.' },
  biceps: { name: 'Bicep Roll', duration: 60, notes: 'Forearm on a foam roller, roll from elbow to shoulder. Moderate pressure.' },
  triceps: { name: 'Tricep Roll', duration: 60, notes: 'Lie on side with arm extended, roller under tricep. Roll elbow to armpit.' },
  quadriceps: { name: 'Quad Roll', duration: 90, notes: 'Face down on roller. Roll from hip to just above the knee. Pause on tight spots for 10-15s.' },
  hamstrings: { name: 'Hamstring Roll', duration: 90, notes: 'Seated on roller. Roll from glute to just above the knee. Cross one leg over the other to increase pressure.' },
  glutes: { name: 'Glute Roll (ball)', duration: 90, notes: 'Sit on a lacrosse ball. Figure-4 position for deeper access. Slow circles and sustained pressure.' },
  calves: { name: 'Calf Roll', duration: 60, notes: 'Seated with calf on roller. Rotate foot in/out to hit medial and lateral heads. Stack legs for more pressure.' },
  core: { name: 'Oblique / QL Roll', duration: 60, notes: 'Side-lying on roller. Roll from hip to lower ribs along the oblique line. Gentle pressure.' },
  forearms: { name: 'Forearm Roll', duration: 60, notes: 'Forearm on roller or ball. Roll wrist to elbow, both pronated and supinated. Grapplers: spend extra time here.' },
  traps: { name: 'Upper Trap Roll (ball)', duration: 60, notes: 'Lacrosse ball between upper trap and wall. Lean in and roll slowly. Avoid the cervical spine.' },
  full_body: { name: 'Full-Body Foam Roll Sequence', duration: 120, notes: 'Roll calves → hamstrings → glutes → quads → thoracic spine. 20s each area as a general pass.' },
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Prescribe a structured rest day based on the athlete's current state.
 *
 * Decision logic:
 * 1. Readiness < 30 (CRITICAL): Full rest or contrast therapy only.
 *    Dupuy et al. 2018 — passive recovery is acceptable when systemically fatigued.
 * 2. Readiness 30-50 (LOW): Light walking + targeted foam rolling for sore areas.
 * 3. Readiness 50-70 (MODERATE): Mobility flow + foam rolling. Standard rest day.
 * 4. Readiness 70-85 (HIGH): Mobility flow + optional light cardio or yoga.
 * 5. Readiness > 85: Full mobility flow + optional swim or light cardio.
 *
 * Fight camp modifier: During fight camp, rest days lean toward mobility and
 * light cardio (shadow boxing walkthrough) to maintain neural patterns without
 * adding CNS fatigue.
 */
export function prescribeRestDay(params: PrescribeRestDayParams): RestDayPrescription {
  const {
    readinessScore,
    soreAreas,
    recentTrainingLoad,
    isFightCamp,
    daysSinceLastRest,
    preferredActivities = [],
  } = params;

  // --- Critical readiness: full rest ---
  if (readinessScore < READINESS_THRESHOLDS.CRITICAL) {
    return {
      primary: {
        activity: 'full_rest',
        duration: 0,
        targetAreas: [],
        exercises: [],
        notes: 'Readiness is critically low. Full rest today — sleep, hydrate, eat well. ' +
          'No structured activity. If available, contrast therapy (hot/cold) can help ' +
          'parasympathetic activation (Dupuy et al. 2018).',
      },
      optional: soreAreas.length > 0
        ? {
            activity: 'contrast_therapy',
            duration: 15,
            targetAreas: soreAreas,
            exercises: [
              { name: 'Contrast Shower', duration: 600, notes: '3 cycles: 2 min warm → 30s cold. End on cold. Improves parasympathetic tone.' },
            ],
            notes: 'Only if you have the energy. No obligation.',
          }
        : null,
      totalDuration: 0,
      rationale: `Readiness score ${readinessScore}/100 is below the critical threshold. ` +
        'Forcing activity at this state delays recovery and risks overtraining syndrome.',
      intensityCap: 2,
    };
  }

  // --- Low readiness: walk + foam rolling ---
  if (readinessScore < READINESS_THRESHOLDS.LOW) {
    const foamRolling = soreAreas.length > 0
      ? generateFoamRollingProtocol(soreAreas)
      : generateFoamRollingProtocol(['full_body']);

    return {
      primary: {
        activity: 'walk',
        duration: 20,
        targetAreas: [],
        exercises: [
          { name: 'Easy Walk', duration: 1200, notes: 'Flat terrain, conversational pace. HR stays below 60% max. (Wiewelhove et al. 2019)' },
        ],
        notes: 'Low-intensity movement to promote blood flow without adding fatigue.',
      },
      optional: {
        activity: 'foam_rolling',
        duration: foamRolling.reduce((sum, e) => sum + e.duration, 0) / 60,
        targetAreas: soreAreas.length > 0 ? soreAreas : ['full_body'],
        exercises: foamRolling,
        notes: 'Target sore areas. Moderate pressure — this should feel like a 5-6/10 discomfort, not painful.',
      },
      totalDuration: 20 + Math.round(foamRolling.reduce((sum, e) => sum + e.duration, 0) / 60),
      rationale: `Readiness ${readinessScore}/100 — low but not critical. Light walking promotes ` +
        'blood flow and lymphatic drainage. Foam rolling addresses localized soreness.',
      intensityCap: 4,
    };
  }

  // --- Moderate readiness: mobility flow + foam rolling ---
  if (readinessScore < READINESS_THRESHOLDS.MODERATE) {
    const mobilityAreas = soreAreas.length > 0 ? soreAreas : ['glutes', 'hamstrings', 'shoulders'] as MuscleGroup[];
    const mobilityFlow = generateMobilityFlow(mobilityAreas, 20);
    const foamRolling = soreAreas.length > 0
      ? generateFoamRollingProtocol(soreAreas)
      : null;

    return {
      primary: {
        activity: 'mobility_flow',
        duration: 20,
        targetAreas: mobilityAreas,
        exercises: mobilityFlow,
        notes: isFightCamp
          ? 'Mobility focus for fight camp: prioritize hip and shoulder ROM for striking/grappling mechanics.'
          : 'Full mobility session targeting areas used heavily in recent training.',
      },
      optional: foamRolling
        ? {
            activity: 'foam_rolling',
            duration: Math.round(foamRolling.reduce((sum, e) => sum + e.duration, 0) / 60),
            targetAreas: soreAreas,
            exercises: foamRolling,
            notes: 'Foam roll before the mobility flow for best results (Schoenfeld & Grgic 2020).',
          }
        : null,
      totalDuration: foamRolling
        ? 20 + Math.round(foamRolling.reduce((sum, e) => sum + e.duration, 0) / 60)
        : 20,
      rationale: `Readiness ${readinessScore}/100 — moderate. Active recovery with mobility work ` +
        'improves ROM and reduces perceived soreness (Dupuy et al. 2018).',
      intensityCap: 5,
    };
  }

  // --- High readiness: mobility + optional light cardio or yoga ---
  const mobilityAreas = soreAreas.length > 0
    ? soreAreas
    : ['glutes', 'hamstrings', 'back', 'shoulders'] as MuscleGroup[];
  const mobilityFlow = generateMobilityFlow(mobilityAreas, 25);

  // Choose optional activity based on preference, fight camp status, and training load
  let optionalSession: RestDaySession | null = null;

  if (recentTrainingLoad < 70) {
    // Enough capacity for light cardio
    const prefersYoga = preferredActivities.includes('yoga');
    const prefersSwim = preferredActivities.includes('swim');

    if (isFightCamp) {
      optionalSession = {
        activity: 'light_cardio',
        duration: 20,
        targetAreas: [],
        exercises: [
          { name: 'Shadow Boxing Walkthrough', duration: 600, notes: 'Technical shadow work at 40% intensity. Focus on footwork and combinations, not power.' },
          { name: 'Easy Jump Rope', duration: 300, notes: 'Light bounce, conversational pace. Wrists only — no double-unders.' },
          { name: 'Cool-Down Walk', duration: 300, notes: 'Easy walk to bring HR down.' },
        ],
        notes: 'Fight camp active recovery: maintain neural patterns without CNS fatigue.',
      };
    } else if (prefersSwim) {
      optionalSession = {
        activity: 'swim',
        duration: 20,
        targetAreas: ['full_body'],
        exercises: [
          { name: 'Easy Laps', duration: 1200, notes: 'Mixed strokes at easy pace. Swimming is ideal active recovery — zero impact, full-body blood flow.' },
        ],
        notes: 'Swimming is one of the best active recovery modalities (Wiewelhove et al. 2019).',
      };
    } else if (prefersYoga) {
      optionalSession = {
        activity: 'yoga',
        duration: 30,
        targetAreas: ['full_body'],
        exercises: [
          { name: 'Restorative Yoga Flow', duration: 1800, notes: 'Focus on hip openers, twists, and forward folds. Hold each pose 60-90s. Breath-driven.' },
        ],
        notes: 'Restorative yoga — no power poses or inversions. This is recovery, not training.',
      };
    } else {
      optionalSession = {
        activity: 'walk',
        duration: 25,
        targetAreas: [],
        exercises: [
          { name: 'Brisk Walk', duration: 1500, notes: 'Moderate pace, flat terrain. HR at 50-60% max. Outdoors if possible for vitamin D and mood.' },
        ],
        notes: 'Walking is underrated recovery. Low stress, high parasympathetic activation.',
      };
    }
  }

  // If very high readiness and it's been a while since rest, athlete might not need much
  const daysFactor = daysSinceLastRest > 5
    ? ' You haven\'t rested in ' + daysSinceLastRest + ' days — take this seriously even though readiness is high.'
    : '';

  return {
    primary: {
      activity: 'mobility_flow',
      duration: 25,
      targetAreas: mobilityAreas,
      exercises: mobilityFlow,
      notes: 'Readiness is high, but rest days compound the gains. Full mobility flow to maintain ROM.' + daysFactor,
    },
    optional: optionalSession,
    totalDuration: 25 + (optionalSession?.duration ?? 0),
    rationale: `Readiness ${readinessScore}/100 — good shape. Structured mobility preserves the ` +
      'training adaptations. Optional light activity adds blood flow without CNS cost.' +
      (isFightCamp ? ' Fight camp: keeping neural patterns active with shadow work.' : ''),
    intensityCap: 6,
  };
}

/**
 * Generate a mobility flow for specific muscle groups within a target duration.
 *
 * Selection logic:
 * 1. Pull exercises from MOBILITY_EXERCISES for each target area.
 * 2. Include up to 2 exercises per area (prioritize the first — usually the most effective).
 * 3. If total duration exceeds the target, trim sets or drop the least important exercises.
 * 4. Always include at least one full-body movement as a warm-up.
 *
 * @param targetAreas - Muscle groups to focus on.
 * @param duration    - Target duration in minutes.
 * @returns Array of exercises fitting within the duration.
 */
export function generateMobilityFlow(
  targetAreas: MuscleGroup[],
  duration: number
): RestDayExercise[] {
  const targetSeconds = duration * 60;
  const exercises: RestDayExercise[] = [];

  // Always start with a general warm-up movement
  const fullBodyExercises = MOBILITY_EXERCISES.full_body;
  if (fullBodyExercises.length > 0) {
    exercises.push({ ...fullBodyExercises[0] }); // World's Greatest Stretch or Sun Salutation
  }

  // Add area-specific exercises (up to 2 per area)
  const dedupedAreas = Array.from(new Set(targetAreas)).filter((a): a is MuscleGroup => a !== 'full_body');
  for (const area of dedupedAreas) {
    const areaExercises = MOBILITY_EXERCISES[area] ?? [];
    const toInclude = areaExercises.slice(0, 2);
    for (const ex of toInclude) {
      exercises.push({ ...ex });
    }
  }

  // Calculate total time (duration × sets, defaulting to 1 set)
  const totalTime = exercises.reduce(
    (sum, ex) => sum + ex.duration * (ex.sets ?? 1),
    0
  );

  // If over budget, reduce sets to 1 on multi-set exercises
  if (totalTime > targetSeconds) {
    for (const ex of exercises) {
      if (ex.sets && ex.sets > 1) {
        ex.sets = 1;
      }
    }
  }

  // If still over budget after set reduction, trim from the end
  let runningTotal = 0;
  const trimmed: RestDayExercise[] = [];
  for (const ex of exercises) {
    const exTime = ex.duration * (ex.sets ?? 1);
    if (runningTotal + exTime <= targetSeconds) {
      trimmed.push(ex);
      runningTotal += exTime;
    }
  }

  return trimmed.length > 0 ? trimmed : exercises.slice(0, 1);
}

/**
 * Generate a foam rolling protocol for sore muscle groups.
 *
 * Protocol (Schoenfeld & Grgic 2020, Beardsley & Škarabot 2015):
 * - 60-90 seconds per area at moderate pressure (5-6/10 discomfort).
 * - Slow rolling speed: ~1 inch per second.
 * - Pause on tender spots for 10-15 seconds (trigger point release).
 * - Order: proximal to distal (work from the trunk outward).
 *
 * @param soreAreas - Muscle groups reporting soreness.
 * @returns Array of foam rolling exercises in recommended order.
 */
export function generateFoamRollingProtocol(soreAreas: MuscleGroup[]): RestDayExercise[] {
  // Proximal-to-distal ordering for optimal blood flow and neural downregulation
  const orderPriority: Record<MuscleGroup, number> = {
    back: 1,
    core: 2,
    glutes: 3,
    chest: 4,
    traps: 5,
    shoulders: 6,
    quadriceps: 7,
    hamstrings: 8,
    biceps: 9,
    triceps: 10,
    calves: 11,
    forearms: 12,
    full_body: 0,
  };

  const dedupedAreas: MuscleGroup[] = Array.from(new Set(soreAreas));
  const sorted = dedupedAreas.sort(
    (a, b) => (orderPriority[a] ?? 99) - (orderPriority[b] ?? 99)
  );

  const exercises: RestDayExercise[] = [];

  for (const area of sorted) {
    const exercise = FOAM_ROLL_EXERCISES[area];
    if (exercise) {
      exercises.push({
        ...exercise,
        // Scale duration based on how many areas — more areas = slightly less per area
        duration: sorted.length > 4 ? FOAM_ROLL_DURATION.MIN_PER_AREA : FOAM_ROLL_DURATION.MAX_PER_AREA,
      });
    }
  }

  return exercises;
}
