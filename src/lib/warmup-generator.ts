/**
 * Smart Warm-Up Generator
 *
 * Generates a personalized warm-up protocol based on today's workout:
 *   1. General movement prep (5 min cardio)
 *   2. Dynamic stretches targeting the session's muscle groups
 *   3. Movement-pattern-specific activation drills
 *   4. Ramp-up sets for the first compound exercise
 *
 * Uses the exercise database to determine which muscles need prep
 * and the mobility-data drills for stretch selection.
 */

import type {
  ExercisePrescription,
  MuscleGroup,
  MovementPattern,
  WorkoutType,
} from './types';

// ── Types ────────────────────────────────────────────────────────────────

export interface WarmUpStep {
  name: string;
  duration: number;         // seconds
  sets?: number;
  type: 'cardio' | 'dynamic_stretch' | 'activation' | 'ramp_up';
  target: string;           // what this warms up
  cue?: string;             // coaching cue
}

export interface WarmUpProtocol {
  steps: WarmUpStep[];
  totalDuration: number;    // minutes
  musclesFocused: MuscleGroup[];
  rampUpSets: RampUpSet[];
}

export interface RampUpSet {
  weight: number;
  reps: number;
  note: string;
  percentage: number;       // % of working weight
}

// ── Drill Database ───────────────────────────────────────────────────────

const DYNAMIC_STRETCHES: Record<string, WarmUpStep[]> = {
  chest: [
    { name: 'Arm Circles', duration: 30, sets: 1, type: 'dynamic_stretch', target: 'Chest & Shoulders', cue: 'Large circles, both directions' },
    { name: 'Band Pull-Aparts', duration: 30, sets: 2, type: 'activation', target: 'Rear delts / posture', cue: 'Squeeze shoulder blades at the end range' },
  ],
  back: [
    { name: 'Cat-Cow Stretch', duration: 30, sets: 2, type: 'dynamic_stretch', target: 'Thoracic spine', cue: 'Full range — arch and round slowly' },
    { name: 'Band Pull-Aparts', duration: 30, sets: 2, type: 'activation', target: 'Scapular retractors', cue: 'High reps, light band' },
  ],
  shoulders: [
    { name: 'Shoulder Dislocates', duration: 30, sets: 2, type: 'dynamic_stretch', target: 'Shoulder ROM', cue: 'Wide grip, slow controlled arc' },
    { name: 'Face Pulls (light)', duration: 30, sets: 2, type: 'activation', target: 'Rotator cuff', cue: 'External rotate at the top' },
  ],
  quadriceps: [
    { name: 'Leg Swings (front-back)', duration: 30, sets: 1, type: 'dynamic_stretch', target: 'Hip flexors & quads', cue: 'Keep torso tall, control the swing' },
    { name: 'Bodyweight Squats', duration: 40, sets: 1, type: 'activation', target: 'Quads & glutes', cue: 'Full depth, pause at the bottom' },
  ],
  hamstrings: [
    { name: 'Leg Swings (side-side)', duration: 30, sets: 1, type: 'dynamic_stretch', target: 'Adductors & hamstrings' },
    { name: 'Inchworms', duration: 40, sets: 1, type: 'dynamic_stretch', target: 'Hamstrings & core', cue: 'Walk hands out to plank, walk feet to hands' },
  ],
  glutes: [
    { name: '90/90 Hip Switch', duration: 40, sets: 2, type: 'dynamic_stretch', target: 'Hip internal/external rotation', cue: 'Switch sides smoothly, stay tall' },
    { name: 'Glute Bridges', duration: 30, sets: 2, type: 'activation', target: 'Glute activation', cue: 'Squeeze at the top for 2 seconds' },
  ],
  core: [
    { name: 'Dead Bugs', duration: 30, sets: 2, type: 'activation', target: 'Deep core', cue: 'Press lower back into floor' },
  ],
  biceps: [
    { name: 'Arm Circles', duration: 20, sets: 1, type: 'dynamic_stretch', target: 'Biceps & shoulders' },
  ],
  triceps: [
    { name: 'Tricep Stretch', duration: 20, sets: 1, type: 'dynamic_stretch', target: 'Triceps', cue: 'Overhead, gently press elbow back' },
  ],
  forearms: [
    { name: 'Wrist CARs', duration: 20, sets: 2, type: 'dynamic_stretch', target: 'Wrists & forearms', cue: 'Full circles, controlled speed' },
  ],
  traps: [
    { name: 'Neck CARs', duration: 20, sets: 1, type: 'dynamic_stretch', target: 'Neck & traps', cue: 'Slow, full range, no forcing' },
  ],
  calves: [
    { name: 'Ankle CARs', duration: 20, sets: 1, type: 'dynamic_stretch', target: 'Ankle mobility', cue: 'Full circles both directions' },
  ],
};

const MOVEMENT_ACTIVATION: Record<MovementPattern, WarmUpStep> = {
  push: { name: 'Push-Up Walkouts', duration: 40, sets: 1, type: 'activation', target: 'Push chain', cue: 'Slow eccentric, explosive up' },
  pull: { name: 'Band Face Pulls', duration: 30, sets: 2, type: 'activation', target: 'Pull chain & scapulae', cue: 'High elbow, external rotation' },
  squat: { name: 'Goblet Squat Hold', duration: 40, sets: 2, type: 'activation', target: 'Squat pattern', cue: 'Sit in the bottom for 5 seconds, elbows push knees out' },
  hinge: { name: 'Hip Hinge w/ Dowel', duration: 30, sets: 2, type: 'activation', target: 'Hinge pattern', cue: 'Dowel on spine — maintain 3 contact points' },
  carry: { name: 'Dead Hang', duration: 30, sets: 2, type: 'activation', target: 'Grip & shoulder stability', cue: 'Active shoulders, full grip' },
  rotation: { name: 'Pallof Press', duration: 30, sets: 2, type: 'activation', target: 'Anti-rotation core', cue: 'Press out, resist the twist' },
  explosive: { name: 'Box Jump (low)', duration: 30, sets: 2, type: 'activation', target: 'CNS priming', cue: '3-4 jumps at 50% effort — wake up the nervous system' },
};

// ── Main Entry Point ─────────────────────────────────────────────────────

/**
 * Generate a smart warm-up based on today's exercises.
 */
export function generateSmartWarmUp(
  exercises: ExercisePrescription[],
  workoutType: WorkoutType,
  workingWeight?: number,
  weightUnit: 'kg' | 'lbs' = 'lbs',
): WarmUpProtocol {
  const steps: WarmUpStep[] = [];
  const musclesFocused: MuscleGroup[] = [];

  // 1. General cardio (always)
  steps.push({
    name: 'Light Cardio',
    duration: 300, // 5 min
    type: 'cardio',
    target: 'General blood flow',
    cue: 'Bike, row, or jump rope — enough to break a light sweat',
  });

  // 2. Collect target muscles from today's exercises
  const targetMuscles = new Set<MuscleGroup>();
  const targetPatterns = new Set<MovementPattern>();

  for (const ex of exercises) {
    ex.exercise.primaryMuscles.forEach(m => targetMuscles.add(m));
    // Only add first 2 secondary muscles to avoid bloat
    ex.exercise.secondaryMuscles.slice(0, 2).forEach(m => targetMuscles.add(m));
    targetPatterns.add(ex.exercise.movementPattern);
  }

  // 3. Dynamic stretches for target muscles (deduplicated)
  const addedDrills = new Set<string>();
  for (const muscle of Array.from(targetMuscles)) {
    const drills = DYNAMIC_STRETCHES[muscle];
    if (drills) {
      for (const drill of drills) {
        if (!addedDrills.has(drill.name)) {
          steps.push(drill);
          addedDrills.add(drill.name);
        }
      }
      musclesFocused.push(muscle);
    }
  }

  // 4. Movement-pattern-specific activation
  for (const pattern of Array.from(targetPatterns)) {
    const drill = MOVEMENT_ACTIVATION[pattern];
    if (drill && !addedDrills.has(drill.name)) {
      steps.push(drill);
      addedDrills.add(drill.name);
    }
  }

  // 5. Ramp-up sets for first compound exercise
  const firstCompound = exercises.find(e => e.exercise.category === 'compound');
  const rampUpSets: RampUpSet[] = [];

  if (firstCompound && workingWeight && workingWeight > 0) {
    const barWeight = weightUnit === 'kg' ? 20 : 45;
    const increment = weightUnit === 'kg' ? 2.5 : 5;
    const roundTo = (w: number) => Math.round(w / increment) * increment;

    if (workingWeight > barWeight * 2) {
      rampUpSets.push(
        { weight: barWeight, reps: 10, note: 'Empty bar — groove the pattern', percentage: Math.round((barWeight / workingWeight) * 100) },
        { weight: roundTo(workingWeight * 0.5), reps: 5, note: 'Light warm-up', percentage: 50 },
        { weight: roundTo(workingWeight * 0.7), reps: 3, note: 'Medium warm-up', percentage: 70 },
        { weight: roundTo(workingWeight * 0.85), reps: 1, note: 'Heavy single — prime the CNS', percentage: 85 },
      );
    } else if (workingWeight > barWeight) {
      rampUpSets.push(
        { weight: barWeight, reps: 8, note: 'Empty bar', percentage: Math.round((barWeight / workingWeight) * 100) },
        { weight: roundTo(workingWeight * 0.7), reps: 5, note: 'Warm-up', percentage: 70 },
      );
    } else {
      rampUpSets.push(
        { weight: 0, reps: 10, note: 'Bodyweight movement prep', percentage: 0 },
      );
    }

    // Add ramp-up steps
    for (const set of rampUpSets) {
      steps.push({
        name: `${firstCompound.exercise.name} — ${set.weight > 0 ? `${set.weight} ${weightUnit}` : 'BW'} × ${set.reps}`,
        duration: 60,
        type: 'ramp_up',
        target: firstCompound.exercise.name,
        cue: set.note,
      });
    }
  }

  // Calculate total duration
  const totalSeconds = steps.reduce((sum, s) => sum + s.duration * (s.sets || 1), 0);

  return {
    steps,
    totalDuration: Math.round(totalSeconds / 60),
    musclesFocused,
    rampUpSets,
  };
}
