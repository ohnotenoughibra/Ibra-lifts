import {
  Exercise,
  ExercisePrescription,
  WorkoutSession,
  WorkoutType,
  MesocycleWeek,
  Mesocycle,
  GoalFocus,
  SplitType,
  Equipment,
  EquipmentType,
  SetPrescription,
  BaselineLifts,
  MuscleGroup,
  MuscleGroupConfig,
  MuscleEmphasis,
  ExperienceLevel,
  TrainingIdentity,
  CombatSport,
  BiologicalSex,
  DietGoal,
  WorkoutLog
} from './types';
import { exercises, getExercisesByEquipment, getExerciseById } from './exercises';
import { v4 as uuidv4 } from 'uuid';

// Volume landmarks per muscle group (weekly direct sets)
// Updated to Israetel / RP 2023 values ("Scientific Principles of Hypertrophy Training")
// MEV = Minimum Effective Volume, MAV = Maximum Adaptive Volume, MRV = Maximum Recoverable Volume
// These population defaults are overridden by individualized landmarks from volume-landmarks.ts
export const VOLUME_LANDMARKS: Record<string, { mev: number; mav: number; mrv: number }> = {
  chest: { mev: 8, mav: 16, mrv: 22 },
  back: { mev: 10, mav: 18, mrv: 25 },      // back tolerates and needs more volume
  shoulders: { mev: 8, mav: 18, mrv: 26 },   // delts recover fast, high MRV
  biceps: { mev: 5, mav: 16, mrv: 26 },      // small muscles recover fast, high MRV
  triceps: { mev: 4, mav: 12, mrv: 18 },
  quadriceps: { mev: 8, mav: 16, mrv: 20 },  // quads need higher MEV
  hamstrings: { mev: 4, mav: 12, mrv: 20 },
  glutes: { mev: 4, mav: 14, mrv: 20 },
  calves: { mev: 6, mav: 14, mrv: 20 },      // calves are volume-resistant
  core: { mev: 4, mav: 10, mrv: 16 },
  forearms: { mev: 2, mav: 8, mrv: 14 },
  traps: { mev: 4, mav: 12, mrv: 18 },
  full_body: { mev: 4, mav: 10, mrv: 16 },
};

// Science-based rep/set/intensity prescriptions
const WORKOUT_PRESCRIPTIONS: Record<WorkoutType, {
  sets: [number, number];
  reps: [number, number];
  rpe: [number, number];
  percentageOf1RM: [number, number];
  restSeconds: [number, number];
  tempo?: string;
}> = {
  strength: {
    sets: [3, 6],
    reps: [3, 5],
    rpe: [8, 9.5],
    percentageOf1RM: [85, 95],
    restSeconds: [180, 300],
    tempo: '2-1-X-0' // Controlled eccentric, pause, explosive concentric
  },
  hypertrophy: {
    sets: [3, 5],
    reps: [6, 12],
    rpe: [7, 9],
    percentageOf1RM: [65, 85],
    restSeconds: [90, 150],
    tempo: '3-1-2-0' // Slow eccentric for max hypertrophy (2025 research)
  },
  power: {
    sets: [3, 5],
    reps: [2, 5],
    rpe: [6, 8],
    percentageOf1RM: [60, 80],
    restSeconds: [120, 180],
    tempo: '1-0-X-0' // Fast eccentric, explosive concentric
  },
  strength_endurance: {
    sets: [3, 4],
    reps: [12, 20],
    rpe: [6, 8],
    percentageOf1RM: [40, 65],
    restSeconds: [45, 75],
    tempo: '2-0-2-0' // Controlled tempo, sustained output
  }
};

/**
 * Sex-based programming modifiers — evidence-based.
 *
 * Women vs Men differences (Hunter, 2014; Ansdell et al., 2020; Roberts et al., 2020):
 * - Women are more fatigue-resistant (higher Type I fiber %, lower absolute loads = less CNS fatigue)
 * - Women recover faster between sets AND sessions
 * - Women can do more reps at a given %1RM (flatter strength-endurance curve)
 * - Women tolerate higher relative volume (MEV/MAV/MRV all higher)
 * - Women need less aggressive deloads
 * - Women benefit from slightly higher rep ranges for hypertrophy
 * - Women's upper body responds well to higher frequency + volume (proportionally weaker)
 *
 * Men defaults match existing prescriptions (most exercise science was done on men).
 */
const SEX_MODIFIERS: Record<BiologicalSex, {
  volumeScale: number;        // Multiplier for weekly volume landmarks
  restScale: number;           // Multiplier for rest periods
  repRangeShift: number;       // Add to rep range for hypertrophy (e.g., 6-12 → 8-15)
  deloadVolumeMultiplier: number; // Deload volume (women: less aggressive)
  rpeOffset: number;           // Women can sustain slightly higher RPE
  upperBodyVolumeBoost: number; // Extra sets for upper body (women need proportionally more)
}> = {
  male: {
    volumeScale: 1.0,
    restScale: 1.0,
    repRangeShift: 0,
    deloadVolumeMultiplier: 0.6,
    rpeOffset: 0,
    upperBodyVolumeBoost: 0,
  },
  female: {
    volumeScale: 1.15,             // ~15% more volume tolerated (Haff & Triplett, 2016)
    restScale: 0.75,               // ~25% shorter rest needed (faster phosphocreatine recovery)
    repRangeShift: 2,              // +2 reps — hypertrophy 8-15 vs 6-12 (flatter strength curve)
    deloadVolumeMultiplier: 0.7,   // Less aggressive deload (faster recovery)
    rpeOffset: 0.3,               // Can sustain slightly higher RPE
    upperBodyVolumeBoost: 2,       // +2 sets/week for upper body (proportionally weaker)
  },
};

/** Get workout prescriptions adjusted for biological sex */
function getSexAdjustedPrescription(type: WorkoutType, sex?: BiologicalSex): typeof WORKOUT_PRESCRIPTIONS[WorkoutType] {
  const base = WORKOUT_PRESCRIPTIONS[type];
  if (!sex || sex === 'male') return base;

  const mod = SEX_MODIFIERS[sex];
  const adjustedRest: [number, number] = [
    Math.round(base.restSeconds[0] * mod.restScale),
    Math.round(base.restSeconds[1] * mod.restScale),
  ];

  if (type === 'hypertrophy') {
    // Women: shift rep range up (8-15 instead of 6-12) and shorter rest
    return {
      ...base,
      reps: [base.reps[0] + mod.repRangeShift, base.reps[1] + mod.repRangeShift] as [number, number],
      rpe: [base.rpe[0] + mod.rpeOffset, Math.min(10, base.rpe[1] + mod.rpeOffset)] as [number, number],
      percentageOf1RM: [base.percentageOf1RM[0] - 5, base.percentageOf1RM[1] - 5] as [number, number], // Slightly lower %1RM for higher reps
      restSeconds: adjustedRest,
    };
  }

  if (type === 'strength') {
    // Women: same rep range but can tolerate slightly higher RPE, shorter rest
    return {
      ...base,
      rpe: [base.rpe[0] + mod.rpeOffset, Math.min(10, base.rpe[1] + mod.rpeOffset)] as [number, number],
      restSeconds: adjustedRest,
    };
  }

  // Power: same rep scheme, shorter rest
  return {
    ...base,
    restSeconds: adjustedRest,
  };
}

/**
 * Diet phase training modifiers — evidence-based.
 *
 * During a caloric deficit, recovery capacity is reduced. The goal shifts from
 * BUILDING muscle to RETAINING it. Key evidence:
 *
 *   Murphy & Koehler 2022: deficit impairs lean mass gains but NOT strength gains
 *   Roth et al. 2023: moderate volume (3 sets) = high volume (5 sets) for LM retention in a cut
 *   Helms et al. 2015: maintain intensity, reduce volume ~33%, heavy compounds 4-8 reps
 *   2024 Delphi consensus: deload every 4-5 weeks during restriction (vs 6-8 normally)
 *
 * During a surplus, recovery is enhanced. More volume and metabolic work is tolerated.
 */
const DIET_PHASE_MODIFIERS: Record<DietGoal | 'none', {
  volumeScale: number;           // Multiplier for weekly volume
  rpeOffset: number;             // Shift RPE target (negative = easier)
  restScale: number;             // Multiplier for rest periods (>1 = longer)
}> = {
  cut: {
    volumeScale: 0.80,           // Reduce volume ~20% (retain 10-15 sets/muscle/wk minimum)
    rpeOffset: -0.5,             // RPE 7-8.5 instead of 7-9 (fatigue buffer)
    restScale: 1.25,             // +25% rest — glycogen-depleted, need more recovery between sets
  },
  maintain: {
    volumeScale: 1.0,
    rpeOffset: 0,
    restScale: 1.0,
  },
  bulk: {
    volumeScale: 1.10,           // +10% volume — surplus supports higher training stress
    rpeOffset: 0.3,              // Can push closer to failure with better recovery
    restScale: 0.90,             // Slightly shorter rest tolerated (better energy availability)
  },
  none: {
    volumeScale: 1.0,
    rpeOffset: 0,
    restScale: 1.0,
  },
};

// Undulating periodization schemes for 1-6 sessions/week
const UNDULATING_SCHEMES: Record<number, WorkoutType[]> = {
  1: ['strength'],
  2: ['strength', 'hypertrophy'],
  3: ['strength', 'hypertrophy', 'power'],
  4: ['strength', 'hypertrophy', 'power', 'hypertrophy'],
  5: ['strength', 'hypertrophy', 'power', 'strength', 'hypertrophy'],
  6: ['strength', 'hypertrophy', 'power', 'strength', 'hypertrophy', 'power'],
};

// Goal-focused schemes: all sessions match the goal
const HYPERTROPHY_FOCUSED_SCHEMES: Record<number, WorkoutType[]> = {
  1: ['hypertrophy'],
  2: ['hypertrophy', 'hypertrophy'],
  3: ['hypertrophy', 'hypertrophy', 'hypertrophy'],
  4: ['hypertrophy', 'hypertrophy', 'hypertrophy', 'hypertrophy'],
  5: ['hypertrophy', 'hypertrophy', 'hypertrophy', 'hypertrophy', 'hypertrophy'],
  6: ['hypertrophy', 'hypertrophy', 'hypertrophy', 'hypertrophy', 'hypertrophy', 'hypertrophy'],
};

const STRENGTH_FOCUSED_SCHEMES: Record<number, WorkoutType[]> = {
  1: ['strength'],
  2: ['strength', 'strength'],
  3: ['strength', 'strength', 'strength'],
  4: ['strength', 'strength', 'strength', 'strength'],
  5: ['strength', 'strength', 'strength', 'strength', 'strength'],
  6: ['strength', 'strength', 'strength', 'strength', 'strength', 'strength'],
};

// Linear periodization: all sessions use the same type based on goal focus
const GOAL_TO_LINEAR_TYPE: Record<GoalFocus, WorkoutType> = {
  strength: 'strength',
  hypertrophy: 'hypertrophy',
  balanced: 'hypertrophy', // safest for beginners
  power: 'power',
  strength_endurance: 'strength_endurance',
};

// Wave loading multipliers for DUP — monotonic ascending with mild undulation
// Volume increases steadily across the block; intensity ramps in the back half
// This avoids the sawtooth pattern where W3 volume dropped below W2
function getWaveMultipliers(weekNumber: number, totalWeeks?: number): { volume: number; intensity: number } {
  const trainingWeeks = Math.max(1, (totalWeeks ?? 6) - 1); // exclude deload
  const progress = (weekNumber - 1) / Math.max(1, trainingWeeks - 1); // 0→1 over training weeks
  // Volume: +0% to +15% with slight wave (never decreases week-to-week)
  const volume = 1.0 + progress * 0.15;
  // Intensity: stays flat early, ramps in back half (+0% to +6%)
  const intensity = 1.0 + Math.max(0, progress - 0.3) * 0.085;
  return { volume, intensity };
}

// Block periodization: each week focuses on one training quality
const BLOCK_SCHEMES: Record<number, WorkoutType[][]> = {
  // [week1Types, week2Types, week3Types, week4Types, week5Types(deload)]
  1: [['hypertrophy'], ['strength'], ['power'], ['strength'], ['hypertrophy']],
  2: [
    ['hypertrophy', 'hypertrophy'],
    ['strength', 'strength'],
    ['power', 'power'],
    ['strength', 'power'],
    ['hypertrophy', 'hypertrophy'],
  ],
  3: [
    ['hypertrophy', 'hypertrophy', 'hypertrophy'],
    ['strength', 'strength', 'strength'],
    ['power', 'power', 'power'],
    ['strength', 'strength', 'power'],
    ['hypertrophy', 'hypertrophy', 'hypertrophy'],
  ],
  4: [
    ['hypertrophy', 'hypertrophy', 'hypertrophy', 'hypertrophy'],
    ['strength', 'strength', 'strength', 'strength'],
    ['power', 'power', 'power', 'power'],
    ['strength', 'strength', 'power', 'power'],
    ['hypertrophy', 'hypertrophy', 'hypertrophy', 'hypertrophy'],
  ],
  5: [
    ['hypertrophy', 'hypertrophy', 'strength', 'hypertrophy', 'hypertrophy'],
    ['strength', 'strength', 'power', 'strength', 'strength'],
    ['power', 'power', 'strength', 'power', 'power'],
    ['strength', 'strength', 'power', 'power', 'strength'],
    ['hypertrophy', 'hypertrophy', 'hypertrophy', 'hypertrophy', 'hypertrophy'],
  ],
  6: [
    ['hypertrophy', 'hypertrophy', 'strength', 'hypertrophy', 'hypertrophy', 'hypertrophy'],
    ['strength', 'strength', 'power', 'strength', 'strength', 'strength'],
    ['power', 'power', 'strength', 'power', 'power', 'power'],
    ['strength', 'strength', 'power', 'power', 'strength', 'strength'],
    ['hypertrophy', 'hypertrophy', 'hypertrophy', 'hypertrophy', 'hypertrophy', 'hypertrophy'],
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// CONJUGATE / CONCURRENT PERIODIZATION
// ═══════════════════════════════════════════════════════════════════════════
//
// Science:
// - Simmons 2007 (Westside Barbell): Three qualities trained every week:
//   Max Effort (ME) = work to 1-3RM on rotating exercises
//   Dynamic Effort (DE) = speed work at 50-60% with maximal acceleration
//   Repetition Effort (RE) = moderate-heavy reps for hypertrophy/GPP
// - Swinton et al. 2009: Concurrent training of multiple qualities maintains
//   all fitness components simultaneously
// - Baker 2001: Mixed methods produce strength gains comparable to linear
//   periodization with better retention of explosive qualities
//
// Why for combat athletes: fighters need strength, speed, and endurance
// simultaneously — they can't "peak" one quality at the expense of others
// because their sport demands all three on the same night.
//
// Implementation: Each session type maps to a conjugate quality.
//   strength → Max Effort (1-3RM on rotating lifts)
//   power    → Dynamic Effort (50-65% with speed, bands/chains if available)
//   hypertrophy → Repetition Effort (moderate loads, higher reps)
//
// Every week includes all three qualities regardless of session count.
// ═══════════════════════════════════════════════════════════════════════════

const CONJUGATE_SCHEMES: Record<number, WorkoutType[]> = {
  // ME = strength, DE = power, RE = hypertrophy
  1: ['strength'],                              // ME only (limited sessions)
  2: ['strength', 'power'],                     // ME + DE
  3: ['strength', 'power', 'hypertrophy'],      // ME + DE + RE (classic)
  4: ['strength', 'power', 'hypertrophy', 'strength'],  // 2× ME + DE + RE
  5: ['strength', 'power', 'hypertrophy', 'strength', 'power'],  // 2× ME + 2× DE + RE
  6: ['strength', 'power', 'hypertrophy', 'strength', 'power', 'hypertrophy'],  // 2× each
};

/**
 * Conjugate-specific volume/intensity multipliers.
 *
 * Unlike linear/undulating, conjugate doesn't wave load week-to-week.
 * Instead, exercise SELECTION rotates (different ME lift each week)
 * while volume/intensity stay relatively stable.
 *
 * The slight weekly progression is autoregulated via RPE.
 */
function getConjugateMultipliers(weekNumber: number, totalWeeks: number): { volume: number; intensity: number } {
  // Stable progression with slight intensification toward end of block
  const fraction = Math.min(1, (weekNumber - 1) / Math.max(1, totalWeeks - 2));
  return {
    volume: 1.0 + fraction * 0.04,       // +0-4% volume over block
    intensity: 1.0 + fraction * 0.03,     // +0-3% intensity over block
  };
}

// Exercise selection per workout type
const EXERCISE_PRIORITIES: Record<WorkoutType, {
  compounds: number;
  accessories: number;
  grapplingSpecific: number;
  isolation: number;
}> = {
  strength: { compounds: 4, accessories: 2, grapplingSpecific: 1, isolation: 1 },
  hypertrophy: { compounds: 3, accessories: 2, grapplingSpecific: 1, isolation: 3 },
  power: { compounds: 2, accessories: 1, grapplingSpecific: 2, isolation: 1 },
  strength_endurance: { compounds: 3, accessories: 2, grapplingSpecific: 1, isolation: 2 }
};

// Split day roles — determines which muscles a session targets
type SplitDayRole = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full_body';

// Muscles allowed per split day role — enforces proper split structure
const SPLIT_DAY_MUSCLES: Record<SplitDayRole, Set<string>> = {
  push: new Set(['chest', 'shoulders', 'triceps']),
  pull: new Set(['back', 'biceps', 'forearms', 'traps']),
  legs: new Set(['quadriceps', 'hamstrings', 'glutes', 'calves', 'core']),
  upper: new Set(['chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'traps']),
  lower: new Set(['quadriceps', 'hamstrings', 'glutes', 'calves', 'core']),
  full_body: new Set(['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quadriceps', 'hamstrings', 'glutes', 'calves', 'core', 'forearms', 'traps']),
};

// Split day role sequences for each split type
const SPLIT_DAY_ROLES: Record<string, SplitDayRole[]> = {
  // PPL: 3-session rotation, doubled for 6 days
  push_pull_legs_3: ['push', 'pull', 'legs'],
  push_pull_legs_5: ['push', 'pull', 'legs', 'push', 'pull'],
  push_pull_legs_6: ['push', 'pull', 'legs', 'push', 'pull', 'legs'],
  // Upper/Lower alternating
  upper_lower_2: ['upper', 'lower'],
  upper_lower_3: ['upper', 'lower', 'upper'],
  upper_lower_4: ['upper', 'lower', 'upper', 'lower'],
  // Full body for everything else
};

function getSplitDayRoles(splitType: SplitType, sessionsPerWeek: number): SplitDayRole[] {
  if (splitType === 'push_pull_legs') {
    return SPLIT_DAY_ROLES[`push_pull_legs_${sessionsPerWeek}`] || SPLIT_DAY_ROLES.push_pull_legs_3;
  }
  if (splitType === 'upper_lower') {
    return SPLIT_DAY_ROLES[`upper_lower_${sessionsPerWeek}`] || SPLIT_DAY_ROLES.upper_lower_4;
  }
  // All other splits (full_body, grappler_hybrid, striker_power, etc.) are full_body days
  return Array(sessionsPerWeek).fill('full_body' as SplitDayRole);
}

// Movement pattern templates for balanced programming
const MOVEMENT_PATTERNS_PER_SESSION: Record<string, Record<string, string[]>> = {
  full_body: {
    strength: ['hinge', 'squat', 'push', 'pull', 'carry'],
    hypertrophy: ['squat', 'push', 'pull', 'hinge', 'rotation'],
    power: ['explosive', 'hinge', 'squat', 'push', 'pull'],
    strength_endurance: ['squat', 'push', 'pull', 'hinge', 'carry']
  },
  push: {
    strength: ['push', 'push', 'push'],
    hypertrophy: ['push', 'push', 'push', 'push'],
    power: ['explosive', 'push', 'push'],
    strength_endurance: ['push', 'push', 'push']
  },
  pull: {
    strength: ['pull', 'pull', 'hinge'],
    hypertrophy: ['pull', 'pull', 'pull', 'pull'],
    power: ['pull', 'explosive', 'pull'],
    strength_endurance: ['pull', 'pull', 'pull']
  },
  legs: {
    strength: ['squat', 'hinge', 'squat'],
    hypertrophy: ['squat', 'hinge', 'squat', 'squat'],
    power: ['explosive', 'squat', 'hinge'],
    strength_endurance: ['squat', 'hinge', 'squat']
  },
  upper: {
    strength: ['push', 'pull', 'push', 'pull'],
    hypertrophy: ['push', 'pull', 'push', 'pull', 'push'],
    power: ['explosive', 'push', 'pull', 'push'],
    strength_endurance: ['push', 'pull', 'push', 'pull']
  },
  lower: {
    strength: ['squat', 'hinge', 'carry', 'squat'],
    hypertrophy: ['squat', 'hinge', 'squat', 'hinge', 'squat'],
    power: ['explosive', 'squat', 'hinge'],
    strength_endurance: ['squat', 'hinge', 'squat', 'carry']
  },
  grappler_hybrid: {
    strength: ['hinge', 'squat', 'push', 'pull', 'carry'],
    hypertrophy: ['push', 'pull', 'squat', 'hinge'],
    power: ['explosive', 'rotation', 'hinge', 'carry'],
    strength_endurance: ['squat', 'pull', 'hinge', 'carry']
  },
  striker_power: {
    power: ['explosive', 'rotation', 'push', 'push'],
    strength: ['push', 'pull', 'squat', 'rotation'],
    hypertrophy: ['push', 'pull', 'squat', 'push'],
    strength_endurance: ['push', 'rotation', 'squat', 'push']
  },
  wrestler_strength: {
    strength: ['hinge', 'squat', 'pull', 'carry', 'pull'],
    power: ['explosive', 'hinge', 'pull', 'carry'],
    hypertrophy: ['pull', 'squat', 'hinge', 'carry'],
    strength_endurance: ['hinge', 'pull', 'squat', 'carry']
  },
  mma_hybrid: {
    strength: ['hinge', 'squat', 'push', 'pull', 'rotation'],
    power: ['explosive', 'rotation', 'hinge', 'push'],
    hypertrophy: ['push', 'pull', 'squat', 'hinge', 'push'],
    strength_endurance: ['push', 'pull', 'squat', 'hinge']
  }
};

interface GeneratorOptions {
  userId: string;
  goalFocus: GoalFocus;
  equipment: Equipment;
  availableEquipment?: EquipmentType[];
  sessionsPerWeek: 1 | 2 | 3 | 4 | 5 | 6;
  weeks: number;
  baselineLifts?: BaselineLifts;
  periodizationType?: 'linear' | 'undulating' | 'block' | 'conjugate';
  muscleEmphasis?: MuscleGroupConfig;
  sessionDurationMinutes?: number;
  trainingIdentity?: TrainingIdentity;
  combatSport?: CombatSport;
  experienceLevel?: ExperienceLevel;
  sex?: BiologicalSex;
  dietGoal?: DietGoal;                               // Active diet phase influences volume/rest/RPE
  // Sport training load for adaptive volume scaling
  sportSessionsPerWeek?: number;           // Number of sport training sessions per week
  avgSportIntensity?: 'light' | 'moderate' | 'hard';  // Average intensity of sport sessions
  includeDeload?: boolean;  // Default true. Set false when fatigue is low (autoregulated deload)
}

// Experience-level modifiers for volume and intensity
const EXPERIENCE_MODIFIERS: Record<ExperienceLevel, { volumeScale: number; rpeOffset: number; maxSets: number }> = {
  beginner:     { volumeScale: 0.7, rpeOffset: -1.5, maxSets: 4 },
  intermediate: { volumeScale: 1.0, rpeOffset: 0,    maxSets: 6 },
  advanced:     { volumeScale: 1.15, rpeOffset: 0.5,  maxSets: 8 },
};

// Determine split type based on sessions/week and training identity
function determineSplitType(sessionsPerWeek: number, identity?: TrainingIdentity, combatSport?: CombatSport): SplitType {
  if (identity === 'combat') {
    if (sessionsPerWeek <= 3) return 'full_body';
    if (combatSport === 'striking') return 'striker_power';
    if (combatSport === 'grappling_gi' || combatSport === 'grappling_nogi') {
      return sessionsPerWeek <= 4 ? 'upper_lower' : 'grappler_hybrid';
    }
    if (combatSport === 'mma') return 'mma_hybrid';
    // wrestling uses wrestler_strength if enough sessions
    if (sessionsPerWeek <= 4) return 'upper_lower';
    return 'grappler_hybrid';
  }
  // Recreational / general fitness
  if (sessionsPerWeek <= 3) return 'full_body';
  if (sessionsPerWeek <= 4) return 'upper_lower';
  return 'push_pull_legs';
}

// Filter exercises by the user's specific equipment inventory
function getExercisesByGranularEquipment(equipment: Equipment, availableEquipment?: EquipmentType[]): Exercise[] {
  // Start with the tier-based filter for backward compatibility
  const tierFiltered = getExercisesByEquipment(equipment);

  // If no granular equipment specified, use tier-only filter
  if (!availableEquipment || availableEquipment.length === 0) {
    return tierFiltered;
  }

  // Filter further: exercise needs ALL its equipmentTypes to be in user's inventory
  // Bodyweight exercises always pass (they need no equipment)
  return tierFiltered.filter(ex => {
    if (!ex.equipmentTypes || ex.equipmentTypes.length === 0) return true;
    if (ex.equipmentTypes.length === 1 && ex.equipmentTypes[0] === 'bodyweight') return true;
    return ex.equipmentTypes.every(et => et === 'bodyweight' || availableEquipment.includes(et));
  });
}

// Weighted shuffle: adds controlled randomness to exercise selection
// instead of always picking the same top-scored exercises
function weightedShuffle<T>(items: T[], scoreFn: (item: T) => number): T[] {
  const scored = items.map(item => ({
    item,
    score: scoreFn(item) + Math.random() * 3, // Add 0-3 random points
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.item);
}

// Muscle emphasis scoring multipliers
const EMPHASIS_MULTIPLIERS: Record<MuscleEmphasis, number> = {
  focus: 1.5,
  maintain: 1.0,
  ignore: 0.2,
};

// Map from MuscleGroup to the keys in MuscleGroupConfig
// Some MuscleGroup values (forearms, traps, full_body) don't have
// direct entries in MuscleGroupConfig, so they default to 'maintain'.
function getMuscleEmphasisMultiplier(
  muscle: MuscleGroup,
  config: MuscleGroupConfig | undefined
): number {
  if (!config) return 1.0;
  const key = muscle as keyof MuscleGroupConfig;
  if (key in config) {
    return EMPHASIS_MULTIPLIERS[config[key]];
  }
  return 1.0; // default for muscles not in config (forearms, traps, full_body)
}

// Calculate the average emphasis multiplier for an exercise based on its primary muscles
function getExerciseEmphasisScore(
  exercise: Exercise,
  config: MuscleGroupConfig | undefined
): number {
  if (!config) return 1.0;
  const primaryMultipliers = exercise.primaryMuscles.map(m =>
    getMuscleEmphasisMultiplier(m, config)
  );
  if (primaryMultipliers.length === 0) return 1.0;
  // Use the maximum multiplier among primary muscles so that an exercise
  // targeting at least one "focus" muscle gets the full boost.
  return Math.max(...primaryMultipliers);
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function createSetPrescription(type: WorkoutType, sex?: BiologicalSex): SetPrescription {
  const config = getSexAdjustedPrescription(type, sex);
  // Round rest to nearest 15s — clean values like 60, 90, 120, 180 instead of 3:32, 4:43
  const rawRest = randomBetween(config.restSeconds[0], config.restSeconds[1]);
  const restSeconds = Math.round(rawRest / 15) * 15;
  return {
    targetReps: randomBetween(config.reps[0], config.reps[1]),
    minReps: config.reps[0],
    maxReps: config.reps[1],
    rpe: Math.round(randomBetween(config.rpe[0] * 2, config.rpe[1] * 2)) / 2,
    restSeconds,
    tempo: config.tempo,
    percentageOf1RM: randomBetween(config.percentageOf1RM[0], config.percentageOf1RM[1])
  };
}

// Generate warm-up sets for a compound exercise based on working weight
export function generateWarmUpSets(
  workingWeight: number,
  workingReps: number,
  weightUnit: 'kg' | 'lbs' = 'kg'
): { weight: number; reps: number; note: string }[] {
  const barWeight = weightUnit === 'kg' ? 20 : 45;
  const increment = weightUnit === 'kg' ? 2.5 : 5;
  const roundTo = (w: number) => Math.round(w / increment) * increment;

  if (workingWeight > barWeight * 2) {
    return [
      { weight: barWeight, reps: 10, note: 'Empty bar — groove the pattern' },
      { weight: roundTo(workingWeight * 0.5), reps: 5, note: 'Light warm-up' },
      { weight: roundTo(workingWeight * 0.7), reps: 3, note: 'Medium warm-up' },
      { weight: roundTo(workingWeight * 0.85), reps: 1, note: 'Heavy single — prime the nervous system' },
    ];
  } else if (workingWeight > barWeight) {
    return [
      { weight: barWeight, reps: 8, note: 'Empty bar' },
      { weight: roundTo(workingWeight * 0.7), reps: 5, note: 'Warm-up' },
    ];
  }
  return [
    { weight: 0, reps: 10, note: 'Bodyweight movement warm-up' },
  ];
}

function selectExercisesForType(
  type: WorkoutType,
  equipment: Equipment,
  goalFocus: GoalFocus,
  usedExerciseIds: Set<string>,
  muscleEmphasis?: MuscleGroupConfig,
  availableEquipment?: EquipmentType[],
  trainingIdentity?: TrainingIdentity,
  combatSport?: CombatSport,
  sessionsPerWeek: number = 3,
  splitDayRole: SplitDayRole = 'full_body'
): Exercise[] {
  // Use granular equipment filtering when available, fallback to tier-only
  const allAvailable = getExercisesByGranularEquipment(equipment, availableEquipment);
  // Filter to exercises that match the split day's target muscles
  const allowedMuscles = SPLIT_DAY_MUSCLES[splitDayRole];
  const availableExercises = splitDayRole === 'full_body'
    ? allAvailable
    : allAvailable.filter(e =>
        e.primaryMuscles.some(m => allowedMuscles.has(m)) ||
        // Keep compound exercises that secondarily hit allowed muscles (e.g., rows for pull day)
        (e.category === 'compound' && e.secondaryMuscles.some(m => allowedMuscles.has(m)))
      );
  const priorities = { ...EXERCISE_PRIORITIES[type] };

  // Adjust exercise slot counts based on training identity
  if (trainingIdentity !== 'combat') {
    // Non-combat athletes get fewer grappling-specific slots, more isolation
    priorities.grapplingSpecific = 0;
    priorities.isolation += 1;
  }

  const selected: Exercise[] = [];

  // Track which muscles are already covered by selected exercises
  const coveredMuscles = new Set<string>();

  // Priority scoring based on goal focus + identity + sport + muscle emphasis
  const scoreExercise = (ex: Exercise): number => {
    let score = 0;
    if (goalFocus === 'strength') {
      score = ex.strengthValue * 2 + ex.aestheticValue;
    } else if (goalFocus === 'hypertrophy') {
      score = ex.aestheticValue * 2 + ex.strengthValue;
    } else if (goalFocus === 'power') {
      score = ex.strengthValue * 1.5 + ex.aestheticValue + (ex.movementPattern === 'explosive' || ex.movementPattern === 'rotation' ? 4 : 0);
    } else {
      // Balanced — boost grappler-friendly only for combat athletes
      score = ex.strengthValue + ex.aestheticValue + (trainingIdentity === 'combat' && ex.grapplerFriendly ? 3 : 0);
    }

    // Sport-specific scoring boosts for combat athletes
    if (trainingIdentity === 'combat') {
      if (combatSport === 'grappling_gi' || combatSport === 'grappling_nogi') {
        // Grapplers need grip, pulling power, hip strength, and core
        if (ex.category === 'grip') score += 4;
        if (ex.movementPattern === 'pull') score += 2;
        if (ex.movementPattern === 'hinge') score += 1.5;
        if (ex.primaryMuscles.includes('core')) score += 1;
        if (ex.grapplerFriendly) score += 2;
      } else if (combatSport === 'striking') {
        // Strikers need rotational power, shoulders, and explosiveness
        if (ex.movementPattern === 'rotation') score += 4;
        if (ex.movementPattern === 'explosive') score += 3;
        if (ex.primaryMuscles.includes('shoulders')) score += 1.5;
        if (ex.primaryMuscles.includes('core')) score += 1.5;
      } else if (combatSport === 'mma') {
        // MMA is a blend — reward all-round athletic exercises
        if (ex.grapplerFriendly) score += 1.5;
        if (ex.movementPattern === 'rotation') score += 2;
        if (ex.movementPattern === 'explosive') score += 2;
        if (ex.category === 'grip') score += 2;
        if (ex.primaryMuscles.includes('core')) score += 1;
      }
    }

    // Penalty for already used exercises
    if (usedExerciseIds.has(ex.id)) {
      score -= 5;
    }

    // Prefer exercises that hit MORE muscles (bang-for-buck for busy people)
    const totalMuscles = ex.primaryMuscles.length + ex.secondaryMuscles.length * 0.5;
    score += totalMuscles * 0.5;

    // Bonus for covering NEW muscle groups not yet in the session
    const newMuscles = ex.primaryMuscles.filter(m => !coveredMuscles.has(m));
    score += newMuscles.length * 1.5;

    // Apply muscle emphasis multiplier
    score *= getExerciseEmphasisScore(ex, muscleEmphasis);
    return score;
  };

  // Pick movement pattern template based on split day role
  // For structured splits (PPL/UL), use the day role directly; for combat splits, use the split type
  const splitType = determineSplitType(sessionsPerWeek, trainingIdentity, combatSport);
  const patternKey = splitDayRole !== 'full_body' ? splitDayRole : splitType;
  const patternSource = MOVEMENT_PATTERNS_PER_SESSION[patternKey] ?? MOVEMENT_PATTERNS_PER_SESSION.full_body;
  const targetPatterns: string[] = type in patternSource
    ? (patternSource as any)[type] as string[]
    : ['hinge', 'squat', 'push', 'pull'];

  // Select compounds with weighted randomization (not always the same top picks)
  const compoundPool = weightedShuffle(
    availableExercises.filter(e => e.category === 'compound'),
    scoreExercise
  );

  const usedPatterns = new Set<string>();
  const trackMuscles = (ex: Exercise) => {
    ex.primaryMuscles.forEach(m => coveredMuscles.add(m));
    ex.secondaryMuscles.forEach(m => coveredMuscles.add(m));
  };

  for (const pattern of targetPatterns) {
    if (selected.length >= priorities.compounds) break;
    const match = compoundPool.find(
      e => e.movementPattern === pattern && !usedExerciseIds.has(e.id) && !selected.includes(e)
    );
    if (match) {
      selected.push(match);
      usedExerciseIds.add(match.id);
      usedPatterns.add(pattern);
      trackMuscles(match);
    }
  }
  // Fill remaining compound slots — re-score to prefer new muscle coverage
  const remainingCompounds = weightedShuffle(
    compoundPool.filter(e => !usedExerciseIds.has(e.id) && !selected.includes(e)),
    scoreExercise
  );
  for (const ex of remainingCompounds) {
    if (selected.length >= priorities.compounds) break;
    selected.push(ex);
    usedExerciseIds.add(ex.id);
    trackMuscles(ex);
  }

  // Add power/grappling-specific exercises — re-score for muscle coverage
  const grapplingExercises = weightedShuffle(
    availableExercises.filter(e => (e.category === 'grappling_specific' || e.category === 'power') && !usedExerciseIds.has(e.id)),
    scoreExercise
  ).slice(0, priorities.grapplingSpecific);
  selected.push(...grapplingExercises);
  grapplingExercises.forEach(e => { usedExerciseIds.add(e.id); trackMuscles(e); });

  // Add isolation exercises — prefer ones covering muscles NOT yet hit by compounds
  if (goalFocus === 'hypertrophy' || goalFocus === 'balanced') {
    const isolations = weightedShuffle(
      availableExercises.filter(e => e.category === 'isolation' && !usedExerciseIds.has(e.id)),
      scoreExercise
    ).slice(0, priorities.isolation);
    selected.push(...isolations);
    isolations.forEach(e => { usedExerciseIds.add(e.id); trackMuscles(e); });
  }

  // Add grip work for combat athletes (especially grapplers and MMA)
  if (trainingIdentity === 'combat' && (goalFocus === 'balanced' || goalFocus === 'strength')) {
    const gripPool = availableExercises.filter(e => e.category === 'grip' && !usedExerciseIds.has(e.id));
    const gripWork = gripPool.length > 0 ? [gripPool[Math.floor(Math.random() * gripPool.length)]] : [];
    selected.push(...gripWork);
  }

  return selected;
}

function generateWorkoutSession(
  type: WorkoutType,
  dayNumber: number,
  equipment: Equipment,
  goalFocus: GoalFocus,
  usedExerciseIds: Set<string>,
  muscleEmphasis?: MuscleGroupConfig,
  availableEquipment?: EquipmentType[],
  maxDurationMinutes?: number,
  trainingIdentity?: TrainingIdentity,
  combatSport?: CombatSport,
  experienceLevel?: ExperienceLevel,
  sex?: BiologicalSex,
  dietGoal?: DietGoal,
  sessionsPerWeek: number = 3,
  splitDayRole: SplitDayRole = 'full_body'
): WorkoutSession {
  const selectedExercises = selectExercisesForType(type, equipment, goalFocus, usedExerciseIds, muscleEmphasis, availableEquipment, trainingIdentity, combatSport, sessionsPerWeek, splitDayRole);
  const config = getSexAdjustedPrescription(type, sex);
  const expMod = EXPERIENCE_MODIFIERS[experienceLevel || 'intermediate'];
  const sexMod = SEX_MODIFIERS[sex || 'male'];
  const dietMod = DIET_PHASE_MODIFIERS[dietGoal || 'none'];

  let exercisePrescriptions: ExercisePrescription[] = selectedExercises.map(exercise => {
    // Adjust sets based on exercise category, experience level, and diet phase
    let sets = randomBetween(config.sets[0], config.sets[1]);
    sets = Math.round(sets * expMod.volumeScale * sexMod.volumeScale * dietMod.volumeScale);
    sets = Math.max(2, Math.min(expMod.maxSets, sets));

    // Women: boost upper body volume (evidence-based — proportionally weaker upper body)
    const isUpperBody = exercise.primaryMuscles.some(m =>
      ['chest', 'back', 'shoulders', 'biceps', 'triceps'].includes(m)
    );
    if (isUpperBody && sexMod.upperBodyVolumeBoost > 0) {
      sets = Math.min(expMod.maxSets, sets + Math.round(sexMod.upperBodyVolumeBoost / selectedExercises.filter(e =>
        e.primaryMuscles.some(m => ['chest', 'back', 'shoulders', 'biceps', 'triceps'].includes(m))
      ).length));
    }

    if (exercise.category === 'isolation') {
      sets = Math.min(sets, 4);
    }
    if (exercise.category === 'compound' && type === 'strength') {
      sets = Math.max(sets, experienceLevel === 'beginner' ? 3 : 4);
    }

    const prescription = createSetPrescription(type, sex);
    // Adjust RPE based on experience level and diet phase
    prescription.rpe = Math.max(5, Math.min(10, +(prescription.rpe + expMod.rpeOffset + dietMod.rpeOffset).toFixed(1)));
    // Adjust rest periods for diet phase (longer rest during cuts — glycogen depletion)
    // Re-round to nearest 15s after scaling to keep clean values (60, 90, 120, 180...)
    prescription.restSeconds = Math.round((prescription.restSeconds * dietMod.restScale) / 15) * 15;

    return {
      exerciseId: exercise.id,
      exercise,
      sets,
      prescription,
      alternatives: findAlternatives(exercise, equipment)
    };
  });

  // Smart time-fitting: trim session to fit within the user's time cap
  if (maxDurationMinutes && maxDurationMinutes > 0) {
    exercisePrescriptions = fitSessionToTimeLimit(exercisePrescriptions, maxDurationMinutes);
  }

  const sessionNames: Record<WorkoutType, string[]> = {
    strength: ['Heavy Foundation', 'Max Effort', 'Strength Builder', 'Power Base'],
    hypertrophy: ['Muscle Builder', 'Growth Session', 'Hypertrophy Focus', 'Volume Day'],
    power: ['Explosive Power', 'Athletic Performance', 'Speed Strength', 'Dynamic Effort'],
    strength_endurance: ['Endurance Circuit', 'Work Capacity', 'Sustained Strength', 'Muscular Endurance']
  };

  return {
    id: uuidv4(),
    name: pickRandom(sessionNames[type]),
    type,
    dayNumber,
    exercises: exercisePrescriptions,
    estimatedDuration: calculateSessionDuration(exercisePrescriptions),
    warmUp: generateWarmUp(type),
    coolDown: generateCoolDown()
  };
}

/**
 * Smart time-fitting algorithm.
 * Trims a session to fit within a time budget without losing workout quality.
 *
 * Strategy (in order):
 * 1. Drop grip/isolation exercises (lowest priority for time-crunched users)
 * 2. Reduce sets on remaining exercises (minimum 2 sets each)
 * 3. Drop accessories/grappling-specific exercises
 * 4. Reduce sets further on compounds (minimum 2)
 *
 * Compounds are always preserved because they give the most bang-for-buck —
 * one exercise hits multiple muscles instead of isolating one.
 */
function fitSessionToTimeLimit(
  prescriptions: ExercisePrescription[],
  maxMinutes: number
): ExercisePrescription[] {
  const WARMUP_COOLDOWN = 15; // 10 warmup + 5 cooldown
  const targetWorkMinutes = maxMinutes - WARMUP_COOLDOWN;
  if (targetWorkMinutes <= 0) return prescriptions.slice(0, 2);

  let current = [...prescriptions];

  // Helper: estimate work minutes for a set of prescriptions
  const estMinutes = (ps: ExercisePrescription[]) => {
    let mins = 0;
    for (const p of ps) {
      mins += (p.prescription.restSeconds / 60) * p.sets;
      mins += (p.prescription.targetReps * 4) / 60 * p.sets;
    }
    return mins;
  };

  // Step 1: Drop grip exercises if over budget
  if (estMinutes(current) > targetWorkMinutes) {
    current = current.filter(p => p.exercise.category !== 'grip');
  }

  // Step 2: Drop isolation exercises if still over
  if (estMinutes(current) > targetWorkMinutes) {
    current = current.filter(p => p.exercise.category !== 'isolation');
  }

  // Step 3: Reduce sets on all remaining (min 2 per exercise)
  if (estMinutes(current) > targetWorkMinutes) {
    current = current.map(p => ({
      ...p,
      sets: Math.max(2, p.sets - 1),
    }));
  }

  // Step 4: Drop grappling_specific/power exercises if still over
  if (estMinutes(current) > targetWorkMinutes) {
    const compounds = current.filter(p => p.exercise.category === 'compound');
    const others = current.filter(p => p.exercise.category !== 'compound');
    // Keep at least the compounds
    current = compounds.length > 0 ? compounds : current.slice(0, 3);
    // Add back others only if time allows
    for (const ex of others) {
      if (estMinutes([...current, ex]) <= targetWorkMinutes) {
        current.push(ex);
      }
    }
  }

  // Step 5: If still over, reduce all sets to 2
  if (estMinutes(current) > targetWorkMinutes) {
    current = current.map(p => ({ ...p, sets: 2 }));
  }

  // Step 6: Last resort — limit to 4 exercises max
  if (estMinutes(current) > targetWorkMinutes && current.length > 4) {
    current = current.slice(0, 4);
  }

  // Never return empty
  return current.length > 0 ? current : prescriptions.slice(0, 3);
}

function findAlternatives(exercise: Exercise, equipment: Equipment): string[] {
  return exercises
    .filter(e =>
      e.id !== exercise.id &&
      e.primaryMuscles.some(m => exercise.primaryMuscles.includes(m)) &&
      e.equipmentRequired.includes(equipment)
    )
    .slice(0, 3)
    .map(e => e.id);
}

function calculateSessionDuration(prescriptions: ExercisePrescription[]): number {
  let totalMinutes = 10; // Warm-up

  for (const p of prescriptions) {
    const setTime = (p.prescription.restSeconds / 60) * p.sets;
    const workTime = (p.prescription.targetReps * 4) / 60 * p.sets; // ~4 seconds per rep
    totalMinutes += setTime + workTime;
  }

  totalMinutes += 5; // Cool down
  return Math.round(totalMinutes);
}

function generateWarmUp(type: WorkoutType): string[] {
  const baseWarmUp = [
    '5 min light cardio (bike, row, or jump rope)',
    'Arm circles and shoulder dislocates',
    'Hip circles and leg swings',
    'Cat-cow stretches x 10',
    'World\'s greatest stretch x 5 each side'
  ];

  if (type === 'strength') {
    return [
      ...baseWarmUp,
      'Empty bar compound movements - 2 sets of 10',
      'Gradually increase load over 3-4 warm-up sets'
    ];
  } else if (type === 'power') {
    return [
      ...baseWarmUp,
      'Box jumps or explosive push-ups x 3 sets of 5',
      'Medicine ball throws x 10'
    ];
  } else if (type === 'strength_endurance') {
    return [
      ...baseWarmUp,
      'Light compound sets x 15 — build up the heart rate',
      'Band pull-aparts and band dislocates x 15'
    ];
  }

  return baseWarmUp;
}

function generateCoolDown(): string[] {
  return [
    '5 min easy walking or cycling',
    'Foam rolling major muscle groups - 60s each',
    'Static stretches for worked muscles - 30s each',
    'Deep breathing - 2 min'
  ];
}

function generateMesocycleWeek(
  weekNumber: number,
  isDeload: boolean,
  sessionsPerWeek: number,
  equipment: Equipment,
  goalFocus: GoalFocus,
  periodizationType: 'linear' | 'undulating' | 'block' | 'conjugate' = 'undulating',
  weekIndex: number = 0,
  muscleEmphasis?: MuscleGroupConfig,
  availableEquipment?: EquipmentType[],
  sessionDurationMinutes?: number,
  trainingIdentity?: TrainingIdentity,
  combatSport?: CombatSport,
  experienceLevel?: ExperienceLevel,
  sportSessionsPerWeek?: number,
  avgSportIntensity?: 'light' | 'moderate' | 'hard',
  sex?: BiologicalSex,
  dietGoal?: DietGoal,
  totalWeeks: number = 5
): MesocycleWeek {
  // Determine workout types based on periodization strategy
  let workoutTypes: WorkoutType[];
  if (periodizationType === 'linear') {
    // Linear: all sessions use the same type — ideal for beginners
    const linearType = GOAL_TO_LINEAR_TYPE[goalFocus];
    workoutTypes = Array(sessionsPerWeek).fill(linearType);
  } else if (periodizationType === 'block') {
    workoutTypes = BLOCK_SCHEMES[sessionsPerWeek]?.[weekIndex] || UNDULATING_SCHEMES[sessionsPerWeek];
  } else if (periodizationType === 'conjugate') {
    // Conjugate: all three qualities every week (ME + DE + RE)
    // Every week uses the same session-type distribution — exercise selection rotates, not type
    workoutTypes = CONJUGATE_SCHEMES[sessionsPerWeek] || CONJUGATE_SCHEMES[3];
  } else {
    // Undulating: use goal-specific schemes when goal is focused,
    // DUP rotation only for 'balanced' goal
    if (goalFocus === 'hypertrophy') {
      workoutTypes = HYPERTROPHY_FOCUSED_SCHEMES[sessionsPerWeek];
    } else if (goalFocus === 'strength') {
      workoutTypes = STRENGTH_FOCUSED_SCHEMES[sessionsPerWeek];
    } else {
      // 'balanced' and 'power' keep DUP for variety
      workoutTypes = UNDULATING_SCHEMES[sessionsPerWeek];
    }
  }
  // Safety: beginners should not do power training — replace with hypertrophy
  if (experienceLevel === 'beginner') {
    workoutTypes = workoutTypes.map(t => t === 'power' ? 'hypertrophy' : t);
  }

  const usedExerciseIds = new Set<string>();

  // Adjust volume and intensity for deload or progression
  let volumeMultiplier: number;
  let intensityMultiplier: number;

  const sexMod = SEX_MODIFIERS[sex || 'male'];

  if (isDeload) {
    // Deload: cut volume aggressively, MAINTAIN intensity (Bosquet et al. 2007, Mujika & Padilla 2003)
    // Reducing intensity causes faster detraining than reducing volume
    volumeMultiplier = sexMod.deloadVolumeMultiplier;
    intensityMultiplier = sex === 'female' ? 0.97 : 0.95;
  } else if (periodizationType === 'linear') {
    // Linear: steady 5% per week (simple, predictable for beginners)
    // 3% per week for beginners (was 5% — too aggressive for novices)
    volumeMultiplier = Math.min(1.15, 1 + (weekNumber - 1) * 0.03);
    intensityMultiplier = 1 + (weekNumber - 1) * 0.015;
  } else if (periodizationType === 'conjugate') {
    // Conjugate: stable progression, autoregulated via RPE (Simmons 2007)
    const conj = getConjugateMultipliers(weekNumber, totalWeeks);
    volumeMultiplier = conj.volume;
    intensityMultiplier = conj.intensity;
  } else {
    // DUP / Block: wave loading — undulating volume & intensity
    const wave = getWaveMultipliers(weekNumber, totalWeeks);
    volumeMultiplier = wave.volume;
    intensityMultiplier = wave.intensity;
  }

  // Combat athletes: reduce gym volume to account for sport training load
  // Volume reduction now scales based on actual sport training load (scientifically accurate)
  if (trainingIdentity === 'combat' && !isDeload) {
    // Calculate volume reduction based on sport sessions and intensity
    // Base reduction: 5% for being a combat athlete (always some recovery needed)
    // Additional reduction scales with sport load:
    // - Light sessions: +2% per session
    // - Moderate sessions: +3.5% per session
    // - Hard sessions: +5% per session
    const sportSessions = sportSessionsPerWeek ?? 3; // Default to 3 if unknown
    const intensity = avgSportIntensity ?? 'moderate';

    const intensityMultipliers = {
      light: 0.02,     // 2% per session
      moderate: 0.035, // 3.5% per session
      hard: 0.05,      // 5% per session
    };

    const baseReduction = 0.05; // 5% base reduction
    const loadReduction = sportSessions * intensityMultipliers[intensity];
    const totalReduction = Math.min(0.30, baseReduction + loadReduction); // Cap at 30%

    volumeMultiplier *= (1 - totalReduction);
    // Examples:
    // 3 light sessions: 5% + 6% = 11% reduction
    // 3 moderate sessions: 5% + 10.5% = 15.5% reduction (similar to old fixed 15%)
    // 5 hard sessions: 5% + 25% = 30% reduction (max)
    // 2 moderate sessions: 5% + 7% = 12% reduction
  }

  // Determine split day roles for proper muscle targeting (PPL, UL, etc.)
  const splitType = determineSplitType(sessionsPerWeek, trainingIdentity, combatSport);
  const dayRoles = getSplitDayRoles(splitType, sessionsPerWeek);

  const sessions: WorkoutSession[] = workoutTypes.map((type, index) => {
    const splitDayRole = dayRoles[index] || 'full_body';
    const session = generateWorkoutSession(
      type,
      index + 1,
      equipment,
      goalFocus,
      usedExerciseIds,
      muscleEmphasis,
      availableEquipment,
      sessionDurationMinutes,
      trainingIdentity,
      combatSport,
      experienceLevel,
      sex,
      dietGoal,
      sessionsPerWeek,
      splitDayRole
    );

    // Apply progressive overload (weeks 1-4) or deload reduction (week 5)
    session.exercises = session.exercises.map(ex => {
      const adjustedSets = isDeload
        ? Math.max(2, Math.floor(ex.sets * volumeMultiplier))
        : Math.min(8, Math.round(ex.sets * volumeMultiplier));

      const basePercentage = ex.prescription.percentageOf1RM ?? 75;
      const adjustedPercentage = Math.min(
        100,
        Math.round(basePercentage * intensityMultiplier)
      );

      // Deload: RPE -1 maintains neural drive while reducing fatigue (Helms et al. 2018)
      // RPE 8→7 still feels like training; -2 would be warm-up territory
      const adjustedRPE = isDeload
        ? Math.max(5, ex.prescription.rpe - 1)
        : Math.round(Math.min(10, +(ex.prescription.rpe + (intensityMultiplier - 1) * 15).toFixed(1)) * 2) / 2;

      // Progressive rep targets: Week 1 targets top of range (accumulation),
      // final training week targets bottom of range (intensification)
      const trainingWeeks = Math.max(1, totalWeeks - 1); // exclude deload week
      const progressFraction = Math.min(1, (weekNumber - 1) / Math.max(1, trainingWeeks - 1));
      const repRange = ex.prescription.maxReps - ex.prescription.minReps;
      const progressiveReps = Math.round(
        ex.prescription.maxReps - progressFraction * repRange
      );

      return {
        ...ex,
        sets: adjustedSets,
        prescription: {
          ...ex.prescription,
          targetReps: isDeload ? ex.prescription.maxReps : progressiveReps,
          percentageOf1RM: adjustedPercentage,
          rpe: adjustedRPE,
        },
      };
    });

    // Structured naming: "W2/D1 — Push (Hypertrophy)" for splits, "W2/D1 — Hypertrophy" for full body
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const roleLabel = splitDayRole !== 'full_body' ? capitalize(splitDayRole) : '';
    const typeLabel = capitalize(type.replace('_', ' '));
    const structuredName = isDeload
      ? `Deload / Day ${index + 1}`
      : roleLabel
        ? `W${weekNumber}/D${index + 1} — ${roleLabel} (${typeLabel})`
        : `W${weekNumber}/D${index + 1} — ${typeLabel}`;
    session.name = structuredName;

    return session;
  });

  return {
    weekNumber,
    isDeload,
    volumeMultiplier,
    intensityMultiplier,
    sessions
  };
}

export function generateMesocycle(options: GeneratorOptions): Mesocycle {
  const {
    userId, goalFocus, equipment, availableEquipment, sessionsPerWeek,
    weeks, muscleEmphasis, sessionDurationMinutes,
    trainingIdentity, combatSport, experienceLevel,
    sportSessionsPerWeek, avgSportIntensity, sex, dietGoal
  } = options;

  const mesocycleWeeks: MesocycleWeek[] = [];

  // Auto-select periodization by experience level if not explicitly set
  let periodizationType: 'linear' | 'undulating' | 'block' | 'conjugate';
  if (options.periodizationType) {
    periodizationType = options.periodizationType;
  } else if (experienceLevel === 'beginner') {
    periodizationType = 'linear';
  } else {
    // intermediate + advanced default to DUP
    periodizationType = 'undulating';
  }

  const includeDeload = options.includeDeload !== false; // Default true

  for (let i = 1; i <= weeks; i++) {
    const isDeload = includeDeload && i === weeks;
    const weekIndex = i - 1;
    mesocycleWeeks.push(
      generateMesocycleWeek(
        i, isDeload, sessionsPerWeek, equipment, goalFocus,
        periodizationType, weekIndex, muscleEmphasis, availableEquipment,
        sessionDurationMinutes, trainingIdentity, combatSport, experienceLevel,
        sportSessionsPerWeek, avgSportIntensity, sex, dietGoal, weeks
      )
    );
  }

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + weeks * 7);

  // Sport-specific mesocycle names
  const combatNames: Record<GoalFocus, string[]> = {
    strength: ['Combat Strength', 'Mat-Ready Power', 'Fight Strength Phase'],
    hypertrophy: ['Combat Muscle', 'Functional Size Block', 'Athletic Build Phase'],
    balanced: ['Grappler\'s Edge', 'Combat Ready', 'Fight Prep'],
    power: ['Explosive Fighter', 'Strike Power Phase', 'Athletic Power Block'],
    strength_endurance: ['Round Ready', 'Combat Endurance', 'Fight Conditioning Phase'],
  };
  const generalNames: Record<GoalFocus, string[]> = {
    strength: ['Strength Foundation', 'Power Block', 'Max Effort Phase'],
    hypertrophy: ['Growth Phase', 'Muscle Building Block', 'Hypertrophy Wave'],
    balanced: ['Balanced Fitness', 'All-Round Builder', 'Functional Power'],
    power: ['Explosive Phase', 'Athletic Power', 'Speed Strength Block'],
    strength_endurance: ['Endurance Builder', 'Work Capacity Phase', 'Sustained Strength Block'],
  };
  const namePool = trainingIdentity === 'combat' ? combatNames : generalNames;
  const splitType = determineSplitType(sessionsPerWeek, trainingIdentity, combatSport);

  // Validate per-muscle volume stays within MEV–MRV
  const allExercises = getExercisesByGranularEquipment(equipment, availableEquipment);
  const { weeks: validatedWeeks, warnings } = validateAndFixMuscleVolume(
    mesocycleWeeks, VOLUME_LANDMARKS, allExercises
  );

  return {
    id: uuidv4(),
    userId,
    name: pickRandom(namePool[goalFocus]),
    startDate,
    endDate,
    weeks: validatedWeeks,
    goalFocus,
    splitType,
    status: 'active',
    volumeWarnings: warnings.length > 0 ? warnings : undefined,
    createdAt: new Date()
  };
}

// Calculate estimated 1RM from weight and reps
export function calculate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  // Brzycki formula - accurate for reps under 10
  if (reps === 1) return weight;
  if (reps > 10) {
    // Epley formula better for higher reps
    return Math.round(weight * (1 + reps / 30));
  }
  return Math.round(weight / (1.0278 - 0.0278 * reps));
}

// Calculate working weight from 1RM and target percentage
export function calculateWorkingWeight(
  oneRM: number,
  percentageOf1RM: number,
  increment: number = 2.5
): number {
  const rawWeight = oneRM * (percentageOf1RM / 100);
  // Round to nearest increment
  return Math.round(rawWeight / increment) * increment;
}

// Suggest next session adjustments based on feedback
// Uses 3-session rolling average for RPE trending instead of single-session snapshot
// Single-session RPE is noisy; trends over 3 sessions are signal
export function suggestAdjustments(
  lastSessionRPE: number,
  soreness: number,
  performanceRating: number,
  recentSessionRPEs?: number[], // last 3 sessions' RPEs for trending
): { volumeAdjustment: number; intensityAdjustment: number; message: string } {
  let volumeAdjustment = 0;
  let intensityAdjustment = 0;
  let message = '';

  // Use 3-session rolling average if available, fallback to single session
  const rpeHistory = recentSessionRPEs && recentSessionRPEs.length >= 2
    ? recentSessionRPEs : [lastSessionRPE];
  const avgRPE = rpeHistory.reduce((s, r) => s + r, 0) / rpeHistory.length;

  // Detect RPE trend direction (rising = accumulating fatigue)
  const rpeTrend = rpeHistory.length >= 3
    ? rpeHistory[rpeHistory.length - 1] - rpeHistory[0] // positive = rising
    : 0;

  // Chronic high RPE with rising trend = strong deload signal
  if (avgRPE > 9 && rpeTrend > 0.5 && soreness > 5) {
    volumeAdjustment = -0.20;
    intensityAdjustment = -0.15;
    message = 'RPE trending upward across recent sessions with high soreness. Backing off to prevent overreach.';
  }
  // High RPE + high soreness = need to back off
  else if (avgRPE > 9 && soreness > 7) {
    volumeAdjustment = -0.15;
    intensityAdjustment = -0.1;
    message = 'Your body needs more recovery. Reducing load this session for optimal adaptation.';
  }
  // Rising RPE trend even if individual sessions seem fine
  else if (rpeTrend > 1.0 && avgRPE > 8) {
    volumeAdjustment = -0.10;
    intensityAdjustment = -0.05;
    message = 'RPE creeping up across sessions — slight reduction to stay ahead of fatigue.';
  }
  // Low RPE + low soreness = can progress
  else if (avgRPE < 7 && soreness < 4) {
    volumeAdjustment = 0.05;
    intensityAdjustment = 0.05;
    message = 'Great recovery! Adding a bit more challenge this session.';
  }
  // Poor performance despite good recovery = possible overreach
  else if (performanceRating < 5 && soreness < 5) {
    volumeAdjustment = -0.1;
    intensityAdjustment = 0;
    message = 'Performance dip detected. Slight volume reduction to optimize gains.';
  }
  // Good across the board = maintain
  else {
    message = 'On track! Maintaining current progression.';
  }

  return { volumeAdjustment, intensityAdjustment, message };
}

// Generate a quick workout
export function generateQuickWorkout(
  equipment: Equipment,
  durationMinutes: number = 30,
  goalFocus: GoalFocus = 'balanced',
  availableEquipment?: EquipmentType[],
  trainingIdentity?: TrainingIdentity,
  volumeGaps?: { muscle: MuscleGroup; deficit: number }[],
): WorkoutSession {
  const type: WorkoutType = goalFocus === 'strength' ? 'strength' :
                            goalFocus === 'hypertrophy' ? 'hypertrophy' :
                            goalFocus === 'balanced' ? 'hypertrophy' :
                            goalFocus === 'power' ? 'power' :
                            goalFocus === 'strength_endurance' ? 'strength_endurance' : 'hypertrophy';

  const allAvailable = getExercisesByGranularEquipment(equipment, availableEquipment);
  const compounds = allAvailable
    .filter(e => e.category === 'compound' && (trainingIdentity === 'combat' ? e.grapplerFriendly : true));

  // Select 3-4 key compounds
  const selected = shuffleArray(compounds).slice(0, durationMinutes <= 20 ? 3 : 4);
  const usedIds = new Set(selected.map(e => e.id));

  const exercisePrescriptions: ExercisePrescription[] = selected.map(exercise => ({
    exerciseId: exercise.id,
    exercise,
    sets: 3,
    prescription: createSetPrescription(type),
    notes: 'Keep rest periods short for time efficiency'
  }));

  // Fill volume gaps: add isolation exercises for under-MEV muscles
  if (volumeGaps && volumeGaps.length > 0) {
    // Sort by largest deficit first — prioritize the most starved muscles
    const sorted = [...volumeGaps].sort((a, b) => b.deficit - a.deficit);

    // Budget: roughly 1-2 gap exercises depending on time
    const gapBudget = durationMinutes <= 20 ? 1 : 2;
    let added = 0;

    for (const gap of sorted) {
      if (added >= gapBudget) break;

      // Check if any selected compound already hits this muscle
      const alreadyCovered = exercisePrescriptions.some(ep =>
        ep.exercise.primaryMuscles.includes(gap.muscle)
      );
      if (alreadyCovered) continue;

      // Find an isolation exercise for this muscle
      const candidate = allAvailable.find(
        e => e.primaryMuscles.includes(gap.muscle) && !usedIds.has(e.id)
      );
      if (!candidate) continue;

      const setsToAdd = Math.min(gap.deficit, 4); // Cap at 4 sets per exercise
      exercisePrescriptions.push({
        exerciseId: candidate.id,
        exercise: candidate,
        sets: setsToAdd,
        prescription: createSetPrescription('hypertrophy'), // Isolation = hypertrophy rep ranges
        notes: `Added to fill ${gap.muscle} volume gap (${gap.deficit} sets below MEV)`,
      });
      usedIds.add(candidate.id);
      added++;
    }
  }

  const hasGapFills = volumeGaps && volumeGaps.length > 0;
  const sessionName = trainingIdentity === 'combat'
    ? (hasGapFills ? 'Quick Combat + Gap Fill' : 'Quick Combat Session')
    : (hasGapFills ? 'Quick Session + Gap Fill' : 'Quick Strength Session');

  return {
    id: uuidv4(),
    name: sessionName,
    type,
    dayNumber: 1,
    exercises: exercisePrescriptions,
    estimatedDuration: durationMinutes,
    warmUp: ['3 min jump rope', 'Dynamic stretches'],
    coolDown: ['2 min deep breathing']
  };
}

/**
 * Identify muscle groups below MEV and return the deficit + recommended exercises.
 *
 * This bridges the volume tracker (which shows the problem) to the quick workout
 * generator (which can fix it). Call this with recent workout logs, then pass
 * the result to generateQuickWorkout() as volumeGaps.
 *
 * Returns muscles sorted by largest deficit first.
 */
export function getVolumeGaps(
  workoutLogs: WorkoutLog[],
  equipment: Equipment,
  availableEquipment?: EquipmentType[],
): { muscle: MuscleGroup; deficit: number; currentSets: number; mev: number; recommendedExercise: string | null }[] {
  // Calculate current weekly volume from last 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recentLogs = workoutLogs.filter(l => new Date(l.date) >= weekAgo);

  // Count sets per muscle group
  const volumeByMuscle: Record<string, number> = {};
  for (const log of recentLogs) {
    for (const ex of log.exercises) {
      const exercise = getExerciseById(ex.exerciseId);
      if (!exercise) continue;
      const completedSets = ex.sets.filter(s => s.completed).length;
      for (const m of exercise.primaryMuscles) {
        volumeByMuscle[m] = (volumeByMuscle[m] || 0) + completedSets;
      }
      for (const m of exercise.secondaryMuscles) {
        volumeByMuscle[m] = (volumeByMuscle[m] || 0) + completedSets * 0.5;
      }
    }
  }

  // Find muscles below MEV
  const allAvailable = getExercisesByGranularEquipment(equipment, availableEquipment);
  const gaps: { muscle: MuscleGroup; deficit: number; currentSets: number; mev: number; recommendedExercise: string | null }[] = [];

  // Skip 'full_body' — it's a fallback category, not a trainable muscle group
  const SKIP_MUSCLES = new Set(['full_body']);

  for (const [muscle, lm] of Object.entries(VOLUME_LANDMARKS)) {
    if (SKIP_MUSCLES.has(muscle)) continue;
    const current = Math.round(volumeByMuscle[muscle] || 0);
    if (current < lm.mev) {
      const deficit = lm.mev - current;
      // Find best exercise to fill the gap
      const candidate = allAvailable.find(
        e => e.primaryMuscles.includes(muscle as MuscleGroup)
      );
      gaps.push({
        muscle: muscle as MuscleGroup,
        deficit,
        currentSets: current,
        mev: lm.mev,
        recommendedExercise: candidate?.name || null,
      });
    }
  }

  return gaps.sort((a, b) => b.deficit - a.deficit);
}

// Get muscle group volume analysis
export function analyzeMuscleGroupVolume(
  sessions: WorkoutSession[]
): Record<MuscleGroup, number> {
  const volumeByMuscle: Record<MuscleGroup, number> = {
    chest: 0, back: 0, shoulders: 0, biceps: 0, triceps: 0,
    quadriceps: 0, hamstrings: 0, glutes: 0, calves: 0,
    core: 0, forearms: 0, traps: 0, full_body: 0
  };

  for (const session of sessions) {
    for (const ex of session.exercises) {
      const setsPerMuscle = ex.sets;

      // Primary muscles get full credit
      for (const muscle of ex.exercise.primaryMuscles) {
        volumeByMuscle[muscle] += setsPerMuscle;
      }

      // Secondary muscles get half credit
      for (const muscle of ex.exercise.secondaryMuscles) {
        volumeByMuscle[muscle] += setsPerMuscle * 0.5;
      }
    }
  }

  return volumeByMuscle;
}

// Per-muscle volume validation: ensures weekly sets stay within MEV–MRV
export function validateAndFixMuscleVolume(
  weeks: MesocycleWeek[],
  landmarks: Record<string, { mev: number; mav: number; mrv: number }>,
  availableExercises: Exercise[]
): { weeks: MesocycleWeek[]; warnings: string[] } {
  const warnings: string[] = [];
  const majorMuscles: MuscleGroup[] = [
    'chest', 'back', 'shoulders', 'quadriceps', 'hamstrings', 'glutes'
  ];

  for (const week of weeks) {
    if (week.isDeload) continue;

    const volume = analyzeMuscleGroupVolume(week.sessions);

    for (const muscle of Object.keys(landmarks) as MuscleGroup[]) {
      const lm = landmarks[muscle];
      if (!lm) continue;
      const sets = volume[muscle] || 0;

      // Undertrained: below MEV — try to add an isolation exercise
      if (sets < lm.mev && majorMuscles.includes(muscle)) {
        const deficit = Math.ceil(lm.mev - sets);
        const usedIds = new Set(
          week.sessions.flatMap(s => s.exercises.map(e => e.exerciseId))
        );
        const candidate = availableExercises.find(
          e =>
            e.category === 'isolation' &&
            e.primaryMuscles.includes(muscle) &&
            !usedIds.has(e.id)
        );
        if (candidate) {
          // Add to the session with the fewest exercises
          const target = [...week.sessions].sort(
            (a, b) => a.exercises.length - b.exercises.length
          )[0];
          const setsToAdd = Math.min(deficit, 4);
          target.exercises.push({
            exerciseId: candidate.id,
            exercise: candidate,
            sets: setsToAdd,
            prescription: createSetPrescription('hypertrophy'),
            notes: `Added to meet ${muscle} MEV`,
          });
        } else {
          warnings.push(
            `${muscle}: ${Math.round(sets)} sets/week is below MEV (${lm.mev}). No suitable isolation exercise available.`
          );
        }
      }

      // Overtrained: above MRV — trim sets from the biggest contributor
      if (sets > lm.mrv) {
        let excess = Math.ceil(sets - lm.mrv);
        // Find exercises contributing to this muscle, sorted by sets desc
        const contributors: { session: WorkoutSession; exIdx: number; sets: number }[] = [];
        for (const session of week.sessions) {
          for (let i = 0; i < session.exercises.length; i++) {
            const ex = session.exercises[i];
            const isPrimary = ex.exercise.primaryMuscles.includes(muscle);
            const isSecondary = ex.exercise.secondaryMuscles.includes(muscle);
            if (isPrimary || isSecondary) {
              contributors.push({ session, exIdx: i, sets: ex.sets });
            }
          }
        }
        contributors.sort((a, b) => b.sets - a.sets);
        for (const contrib of contributors) {
          if (excess <= 0) break;
          const ex = contrib.session.exercises[contrib.exIdx];
          const canRemove = Math.min(excess, ex.sets - 2); // keep at least 2 sets
          if (canRemove > 0) {
            ex.sets -= canRemove;
            excess -= canRemove;
          }
        }
        if (excess > 0) {
          warnings.push(
            `${muscle}: volume exceeds MRV (${lm.mrv}) — trimmed where possible but ${Math.round(sets - (sets - excess))} sets remain above limit.`
          );
        }
      }
    }
  }

  return { weeks, warnings };
}

// ── Autoregulation ──────────────────────────────────────────────────────────
// Adjusts a planned session based on recent workout feedback.
// Call this when loading a session for the user to start.

export function autoregulateSession(
  session: WorkoutSession,
  recentLogs: WorkoutLog[],
): { session: WorkoutSession; message: string } {
  if (recentLogs.length === 0) {
    return { session, message: 'No recent data — using planned prescription.' };
  }

  // Use the most recent 3 logs for feedback signals (3-session trending)
  const latest = recentLogs.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  ).slice(0, 3);

  const avgRPE = latest.reduce((s, l) => s + l.overallRPE, 0) / latest.length;
  const avgSoreness = latest.reduce((s, l) => s + l.soreness, 0) / latest.length;

  // Collect per-session RPEs for trend analysis (oldest to newest)
  const recentSessionRPEs = latest.reverse().map(l => l.overallRPE);

  // Map postFeedback performance to a numeric score
  const perfMap: Record<string, number> = {
    worse_than_expected: 3,
    as_expected: 6,
    better_than_expected: 9,
  };
  const perfScores = latest
    .filter(l => l.postFeedback?.overallPerformance)
    .map(l => perfMap[l.postFeedback!.overallPerformance] || 6);
  const avgPerf = perfScores.length > 0
    ? perfScores.reduce((s, v) => s + v, 0) / perfScores.length
    : 6;

  const { volumeAdjustment, intensityAdjustment, message } = suggestAdjustments(
    avgRPE, avgSoreness, avgPerf, recentSessionRPEs
  );

  // No adjustment needed
  if (volumeAdjustment === 0 && intensityAdjustment === 0) {
    return { session, message };
  }

  // Apply adjustments to each exercise
  const adjustedExercises = session.exercises.map(ex => {
    const newSets = Math.max(2, Math.round(ex.sets * (1 + volumeAdjustment)));
    const basePercentage = ex.prescription.percentageOf1RM ?? 75;
    const newPercentage = Math.min(100, Math.round(basePercentage * (1 + intensityAdjustment)));
    const newRPE = Math.max(5, Math.min(10, +(ex.prescription.rpe * (1 + intensityAdjustment)).toFixed(1)));

    return {
      ...ex,
      sets: newSets,
      prescription: {
        ...ex.prescription,
        percentageOf1RM: newPercentage,
        rpe: newRPE,
      },
    };
  });

  return {
    session: { ...session, exercises: adjustedExercises },
    message,
  };
}
