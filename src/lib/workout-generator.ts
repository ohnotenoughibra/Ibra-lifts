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
  SetPrescription,
  BaselineLifts,
  MuscleGroup
} from './types';
import { exercises, getExercisesByEquipment, getExerciseById } from './exercises';
import { v4 as uuidv4 } from 'uuid';

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

// Undulating periodization schemes
const UNDULATING_SCHEMES: Record<number, WorkoutType[]> = {
  2: ['strength', 'hypertrophy'],
  3: ['strength', 'hypertrophy', 'power']
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
  sessionsPerWeek: 2 | 3;
  weeks: number;
  baselineLifts?: BaselineLifts;
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
  usedExerciseIds: Set<string>
): Exercise[] {
  const availableExercises = getExercisesByEquipment(equipment);
  const priorities = EXERCISE_PRIORITIES[type];
  const selected: Exercise[] = [];

  // Priority scoring based on goal focus
  const scoreExercise = (ex: Exercise): number => {
    let score = 0;
    if (goalFocus === 'strength') {
      score = ex.strengthValue * 2 + ex.aestheticValue;
    } else if (goalFocus === 'hypertrophy') {
      score = ex.aestheticValue * 2 + ex.strengthValue;
    } else {
      score = ex.strengthValue + ex.aestheticValue + (ex.grapplerFriendly ? 3 : 0);
    }
    // Penalty for already used exercises
    if (usedExerciseIds.has(ex.id)) {
      score -= 5;
    }
    return score;
  };

  // Select compounds first
  const compounds = availableExercises
    .filter(e => e.category === 'compound')
    .sort((a, b) => scoreExercise(b) - scoreExercise(a))
    .slice(0, priorities.compounds);
  selected.push(...compounds);
  compounds.forEach(e => usedExerciseIds.add(e.id));

  // Add power/grappling-specific exercises
  const grapplingExercises = availableExercises
    .filter(e => (e.category === 'grappling_specific' || e.category === 'power') && !usedExerciseIds.has(e.id))
    .sort((a, b) => scoreExercise(b) - scoreExercise(a))
    .slice(0, priorities.grapplingSpecific);
  selected.push(...grapplingExercises);
  grapplingExercises.forEach(e => usedExerciseIds.add(e.id));

  // Add isolation exercises for aesthetics
  if (goalFocus === 'hypertrophy' || goalFocus === 'balanced') {
    const isolations = availableExercises
      .filter(e => e.category === 'isolation' && !usedExerciseIds.has(e.id))
      .sort((a, b) => scoreExercise(b) - scoreExercise(a))
      .slice(0, priorities.isolation);
    selected.push(...isolations);
    isolations.forEach(e => usedExerciseIds.add(e.id));
  }

  // Add grip work for grapplers
  if (goalFocus === 'balanced' || goalFocus === 'strength') {
    const gripWork = availableExercises
      .filter(e => e.category === 'grip' && !usedExerciseIds.has(e.id))
      .slice(0, 1);
    selected.push(...gripWork);
  }

  return selected;
}

function generateWorkoutSession(
  type: WorkoutType,
  dayNumber: number,
  equipment: Equipment,
  goalFocus: GoalFocus,
  usedExerciseIds: Set<string>
): WorkoutSession {
  const selectedExercises = selectExercisesForType(type, equipment, goalFocus, usedExerciseIds);
  const config = WORKOUT_PRESCRIPTIONS[type];

  const exercisePrescriptions: ExercisePrescription[] = selectedExercises.map(exercise => {
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
  sessionsPerWeek: 2 | 3,
  equipment: Equipment,
  goalFocus: GoalFocus
): MesocycleWeek {
  const workoutTypes = UNDULATING_SCHEMES[sessionsPerWeek];
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
      usedExerciseIds
    );

    // Apply multipliers to prescriptions
    if (isDeload) {
      session.exercises = session.exercises.map(ex => ({
        ...ex,
        sets: Math.max(2, Math.floor(ex.sets * volumeMultiplier)),
        prescription: {
          ...ex.prescription,
          rpe: Math.max(5, ex.prescription.rpe - 2)
        }
      }));
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
  const { userId, goalFocus, equipment, sessionsPerWeek, weeks } = options;

  const mesocycleWeeks: MesocycleWeek[] = [];

  for (let i = 1; i <= weeks; i++) {
    // Last week is typically a deload
    const isDeload = i === weeks;
    mesocycleWeeks.push(
      generateMesocycleWeek(i, isDeload, sessionsPerWeek, equipment, goalFocus)
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
