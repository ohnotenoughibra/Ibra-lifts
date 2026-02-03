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
  MuscleEmphasis
} from './types';
import { exercises, getExercisesByEquipment, getExerciseById } from './exercises';
import { v4 as uuidv4 } from 'uuid';

// Volume landmarks per muscle group (weekly sets)
// Based on RP/scientific literature: MEV = Minimum Effective Volume, MAV = Maximum Adaptive Volume, MRV = Maximum Recoverable Volume
export const VOLUME_LANDMARKS: Record<string, { mev: number; mav: number; mrv: number }> = {
  chest: { mev: 8, mav: 16, mrv: 22 },
  back: { mev: 8, mav: 16, mrv: 22 },
  shoulders: { mev: 6, mav: 14, mrv: 20 },
  biceps: { mev: 4, mav: 12, mrv: 18 },
  triceps: { mev: 4, mav: 10, mrv: 16 },
  quadriceps: { mev: 6, mav: 14, mrv: 20 },
  hamstrings: { mev: 4, mav: 12, mrv: 18 },
  glutes: { mev: 4, mav: 12, mrv: 18 },
  calves: { mev: 6, mav: 12, mrv: 18 },
  core: { mev: 4, mav: 10, mrv: 16 },
  forearms: { mev: 2, mav: 8, mrv: 14 },
  traps: { mev: 4, mav: 10, mrv: 16 },
  lats: { mev: 6, mav: 14, mrv: 20 },
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
    reps: [3, 6],
    rpe: [6, 8],
    percentageOf1RM: [40, 60],
    restSeconds: [120, 180],
    tempo: '1-0-X-0' // Fast eccentric, explosive concentric
  }
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

// Exercise selection per workout type
const EXERCISE_PRIORITIES: Record<WorkoutType, {
  compounds: number;
  accessories: number;
  grapplingSpecific: number;
  isolation: number;
}> = {
  strength: { compounds: 4, accessories: 2, grapplingSpecific: 1, isolation: 1 },
  hypertrophy: { compounds: 3, accessories: 2, grapplingSpecific: 1, isolation: 3 },
  power: { compounds: 2, accessories: 1, grapplingSpecific: 2, isolation: 1 }
};

// Movement pattern templates for balanced programming
const MOVEMENT_PATTERNS_PER_SESSION = {
  full_body: {
    strength: ['hinge', 'squat', 'push', 'pull', 'carry'],
    hypertrophy: ['squat', 'push', 'pull', 'hinge', 'rotation'],
    power: ['explosive', 'hinge', 'squat', 'push', 'pull']
  },
  upper_lower: {
    upper: ['push', 'pull', 'push', 'pull'],
    lower: ['squat', 'hinge', 'carry', 'squat']
  },
  grappler_hybrid: {
    strength: ['hinge', 'squat', 'push', 'pull', 'carry'],
    hypertrophy: ['push', 'pull', 'squat', 'hinge'],
    power: ['explosive', 'rotation', 'hinge', 'carry']
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
  periodizationType?: 'undulating' | 'block';
  muscleEmphasis?: MuscleGroupConfig;
  sessionDurationMinutes?: number; // Max session time (e.g. 60, 75, 90)
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
// Some MuscleGroup values (forearms, traps, lats, full_body) don't have
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
  return 1.0; // default for muscles not in config (forearms, traps, lats, full_body)
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

function createSetPrescription(type: WorkoutType): SetPrescription {
  const config = WORKOUT_PRESCRIPTIONS[type];
  return {
    targetReps: randomBetween(config.reps[0], config.reps[1]),
    minReps: config.reps[0],
    maxReps: config.reps[1],
    rpe: randomBetween(config.rpe[0] * 10, config.rpe[1] * 10) / 10,
    restSeconds: randomBetween(config.restSeconds[0], config.restSeconds[1]),
    tempo: config.tempo,
    percentageOf1RM: randomBetween(config.percentageOf1RM[0], config.percentageOf1RM[1])
  };
}

function selectExercisesForType(
  type: WorkoutType,
  equipment: Equipment,
  goalFocus: GoalFocus,
  usedExerciseIds: Set<string>,
  muscleEmphasis?: MuscleGroupConfig,
  availableEquipment?: EquipmentType[]
): Exercise[] {
  // Use granular equipment filtering when available, fallback to tier-only
  const availableExercises = getExercisesByGranularEquipment(equipment, availableEquipment);
  const priorities = EXERCISE_PRIORITIES[type];
  const selected: Exercise[] = [];

  // Track which muscles are already covered by selected exercises
  const coveredMuscles = new Set<string>();

  // Priority scoring based on goal focus + muscle emphasis + muscle coverage
  const scoreExercise = (ex: Exercise): number => {
    let score = 0;
    if (goalFocus === 'strength') {
      score = ex.strengthValue * 2 + ex.aestheticValue;
    } else if (goalFocus === 'hypertrophy') {
      score = ex.aestheticValue * 2 + ex.strengthValue;
    } else if (goalFocus === 'power') {
      score = ex.strengthValue * 1.5 + ex.aestheticValue + (ex.movementPattern === 'explosive' || ex.movementPattern === 'rotation' ? 4 : 0);
    } else {
      score = ex.strengthValue + ex.aestheticValue + (ex.grapplerFriendly ? 3 : 0);
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

  // Get target movement patterns for this session type to ensure balance
  const patterns = MOVEMENT_PATTERNS_PER_SESSION.grappler_hybrid;
  const targetPatterns: string[] = type in patterns
    ? (patterns as any)[type] as string[]
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

  // Add grip work for grapplers
  if (goalFocus === 'balanced' || goalFocus === 'strength') {
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
  maxDurationMinutes?: number
): WorkoutSession {
  const selectedExercises = selectExercisesForType(type, equipment, goalFocus, usedExerciseIds, muscleEmphasis, availableEquipment);
  const config = WORKOUT_PRESCRIPTIONS[type];

  let exercisePrescriptions: ExercisePrescription[] = selectedExercises.map(exercise => {
    // Adjust sets based on exercise category
    let sets = randomBetween(config.sets[0], config.sets[1]);
    if (exercise.category === 'isolation') {
      sets = Math.min(sets, 4); // Cap isolation sets
    }
    if (exercise.category === 'compound' && type === 'strength') {
      sets = Math.max(sets, 4); // Ensure enough compound volume for strength
    }

    return {
      exerciseId: exercise.id,
      exercise,
      sets,
      prescription: createSetPrescription(type),
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
    power: ['Explosive Power', 'Athletic Performance', 'Speed Strength', 'Dynamic Effort']
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
  periodizationType: 'undulating' | 'block' = 'undulating',
  weekIndex: number = 0,
  muscleEmphasis?: MuscleGroupConfig,
  availableEquipment?: EquipmentType[],
  sessionDurationMinutes?: number
): MesocycleWeek {
  const workoutTypes = periodizationType === 'block'
    ? (BLOCK_SCHEMES[sessionsPerWeek]?.[weekIndex] || UNDULATING_SCHEMES[sessionsPerWeek])
    : UNDULATING_SCHEMES[sessionsPerWeek];
  const usedExerciseIds = new Set<string>();

  // Adjust volume and intensity for deload
  const volumeMultiplier = isDeload ? 0.6 : 1 + (weekNumber - 1) * 0.05; // Progressive overload
  const intensityMultiplier = isDeload ? 0.85 : 1 + (weekNumber - 1) * 0.02;

  const sessions: WorkoutSession[] = workoutTypes.map((type, index) => {
    const session = generateWorkoutSession(
      type,
      index + 1,
      equipment,
      goalFocus,
      usedExerciseIds,
      muscleEmphasis,
      availableEquipment,
      sessionDurationMinutes
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

      const adjustedRPE = isDeload
        ? Math.max(5, ex.prescription.rpe - 2)
        : Math.min(10, +(ex.prescription.rpe * intensityMultiplier).toFixed(1));

      return {
        ...ex,
        sets: adjustedSets,
        prescription: {
          ...ex.prescription,
          percentageOf1RM: adjustedPercentage,
          rpe: adjustedRPE,
        },
      };
    });

    if (isDeload) {
      session.name = `Deload - ${session.name}`;
    }

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
  const { userId, goalFocus, equipment, availableEquipment, sessionsPerWeek, weeks, muscleEmphasis, sessionDurationMinutes } = options;

  const mesocycleWeeks: MesocycleWeek[] = [];

  const periodizationType = options.periodizationType || 'undulating';

  for (let i = 1; i <= weeks; i++) {
    // Last week is typically a deload
    const isDeload = i === weeks;
    const weekIndex = i - 1;
    mesocycleWeeks.push(
      generateMesocycleWeek(i, isDeload, sessionsPerWeek, equipment, goalFocus, periodizationType, weekIndex, muscleEmphasis, availableEquipment, sessionDurationMinutes)
    );
  }

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + weeks * 7);

  const mesocycleNames: Record<GoalFocus, string[]> = {
    strength: ['Strength Foundation', 'Power Block', 'Max Effort Phase'],
    hypertrophy: ['Growth Phase', 'Muscle Building Block', 'Hypertrophy Wave'],
    balanced: ['Grappler\'s Edge', 'Combat Ready', 'Functional Power'],
    power: ['Explosive Phase', 'Athletic Power', 'Speed Strength Block']
  };

  return {
    id: uuidv4(),
    userId,
    name: pickRandom(mesocycleNames[goalFocus]),
    startDate,
    endDate,
    weeks: mesocycleWeeks,
    goalFocus,
    splitType: 'grappler_hybrid',
    status: 'active',
    createdAt: new Date()
  };
}

// Calculate estimated 1RM from weight and reps
export function calculate1RM(weight: number, reps: number): number {
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
export function suggestAdjustments(
  lastSessionRPE: number,
  soreness: number,
  performanceRating: number
): { volumeAdjustment: number; intensityAdjustment: number; message: string } {
  let volumeAdjustment = 0;
  let intensityAdjustment = 0;
  let message = '';

  // High RPE + high soreness = need to back off
  if (lastSessionRPE > 9 && soreness > 7) {
    volumeAdjustment = -0.15; // Reduce volume 15%
    intensityAdjustment = -0.1; // Reduce intensity 10%
    message = 'Your body needs more recovery. Reducing load this session for optimal adaptation.';
  }
  // Low RPE + low soreness = can progress
  else if (lastSessionRPE < 7 && soreness < 4) {
    volumeAdjustment = 0.05; // Increase volume 5%
    intensityAdjustment = 0.05; // Increase intensity 5%
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

// Generate a quick workout for time-crunched grapplers
export function generateQuickWorkout(
  equipment: Equipment,
  durationMinutes: number = 30,
  goalFocus: GoalFocus = 'balanced'
): WorkoutSession {
  const type: WorkoutType = goalFocus === 'strength' ? 'strength' :
                            goalFocus === 'hypertrophy' ? 'hypertrophy' : 'power';

  const availableExercises = getExercisesByEquipment(equipment)
    .filter(e => e.grapplerFriendly && e.category === 'compound');

  // Select 3-4 key compounds
  const selected = shuffleArray(availableExercises).slice(0, 4);

  const exercisePrescriptions: ExercisePrescription[] = selected.map(exercise => ({
    exerciseId: exercise.id,
    exercise,
    sets: 3,
    prescription: createSetPrescription(type),
    notes: 'Keep rest periods short for time efficiency'
  }));

  return {
    id: uuidv4(),
    name: 'Quick Grappler Session',
    type,
    dayNumber: 1,
    exercises: exercisePrescriptions,
    estimatedDuration: durationMinutes,
    warmUp: ['3 min jump rope', 'Dynamic stretches'],
    coolDown: ['2 min deep breathing']
  };
}

// Get muscle group volume analysis
export function analyzeMuscleGroupVolume(
  sessions: WorkoutSession[]
): Record<MuscleGroup, number> {
  const volumeByMuscle: Record<MuscleGroup, number> = {
    chest: 0, back: 0, shoulders: 0, biceps: 0, triceps: 0,
    quadriceps: 0, hamstrings: 0, glutes: 0, calves: 0,
    core: 0, forearms: 0, traps: 0, lats: 0, full_body: 0
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
