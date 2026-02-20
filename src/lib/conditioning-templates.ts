// ============================================================================
// Conditioning Templates — GPP / conditioning programming for combat athletes
// ============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConditioningType =
  | 'emom'
  | 'tabata'
  | 'amrap'
  | 'interval'
  | 'circuit'
  | 'shark_tank';

export interface ConditioningExercise {
  name: string;
  reps?: number;
  duration?: number; // seconds
  restBetween?: number; // seconds
  notes?: string;
}

export interface ConditioningTemplate {
  id: string;
  name: string;
  type: ConditioningType;
  description: string;
  targetSport: ('grappling' | 'striking' | 'mma' | 'general')[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  totalDuration: number; // minutes
  workInterval?: number; // seconds (for EMOM/Tabata/intervals)
  restInterval?: number; // seconds
  rounds: number;
  exercises: ConditioningExercise[];
  warmUp: string[];
  coolDown: string[];
  equipmentNeeded: string[];
  metabolicTarget: 'aerobic' | 'anaerobic' | 'mixed';
}

// ---------------------------------------------------------------------------
// Built-in templates
// ---------------------------------------------------------------------------

const CONDITIONING_TEMPLATES: ConditioningTemplate[] = [
  // ---- Grappling-specific ------------------------------------------------
  {
    id: 'grappling-mat-shark',
    name: 'Mat Shark',
    type: 'shark_tank',
    description:
      'Five 5-minute rounds with a fresh partner each round. Simulates the relentless pace of a grappling tournament bracket where you must keep fighting as fatigue accumulates.',
    targetSport: ['grappling'],
    difficulty: 'advanced',
    totalDuration: 30,
    workInterval: 300,
    restInterval: 60,
    rounds: 5,
    exercises: [
      {
        name: 'Wrestling / Takedowns',
        duration: 120,
        notes: 'Start on feet each round — fight for dominant position',
      },
      {
        name: 'Guard Passing',
        duration: 90,
        notes: 'Constant pressure passing; do not stall in half-guard',
      },
      {
        name: 'Submission Chains',
        duration: 90,
        notes: 'Chain at least 2 submissions per sequence — keep attacking',
      },
    ],
    warmUp: [
      'Light jog 3 min',
      'Hip circles x 10 each direction',
      'Granby rolls x 5 each side',
      'Technical stand-ups x 10',
    ],
    coolDown: [
      'Slow flow roll 3 min',
      'Seated butterfly stretch 60s',
      'Supine spinal twist 30s each side',
      'Deep breathing 2 min',
    ],
    equipmentNeeded: ['Mats', 'Training partners (minimum 5)'],
    metabolicTarget: 'mixed',
  },
  {
    id: 'grappling-grip-killer',
    name: 'Grip Killer',
    type: 'circuit',
    description:
      'Grip-endurance circuit designed to build the crushing, sustained grip strength that grapplers need for collar ties, sleeve grips, and wrist control.',
    targetSport: ['grappling'],
    difficulty: 'intermediate',
    totalDuration: 20,
    restInterval: 90,
    rounds: 4,
    exercises: [
      { name: 'Farmer Carries', notes: 'Walk 40 m with heavy dumbbells or kettlebells' },
      { name: 'Towel Pull-Ups', reps: 8, notes: 'Drape a towel over the bar; grip both ends' },
      { name: 'Plate Pinches', duration: 30, notes: 'Pinch two plates smooth-side-out' },
      { name: 'Dead Hangs', duration: 30, notes: 'Overhand grip; relax shoulders' },
    ],
    warmUp: [
      'Arm circles x 15 each direction',
      'Wrist flexor / extensor stretches 30s each',
      'Band pull-aparts x 15',
    ],
    coolDown: [
      'Forearm foam roll 60s each arm',
      'Wrist flexor stretch 30s each side',
      'Finger extensor band work x 20',
    ],
    equipmentNeeded: ['Dumbbells or kettlebells', 'Pull-up bar', 'Towel', 'Weight plates'],
    metabolicTarget: 'mixed',
  },
  {
    id: 'grappling-scramble-drill',
    name: 'Scramble Drill',
    type: 'interval',
    description:
      'Short, all-out bursts of sprawls and shots that mimic the explosive scramble exchanges in wrestling and no-gi grappling.',
    targetSport: ['grappling'],
    difficulty: 'beginner',
    totalDuration: 12,
    workInterval: 30,
    restInterval: 30,
    rounds: 10,
    exercises: [
      {
        name: 'Sprawls & Shots',
        duration: 30,
        notes: 'Alternate between sprawling and shooting a double-leg — max effort',
      },
    ],
    warmUp: [
      'Jog in place 2 min',
      'Leg swings x 10 each leg',
      'Slow sprawls x 5',
      'Slow penetration steps x 5 each side',
    ],
    coolDown: [
      'Walk 2 min',
      'Standing quad stretch 30s each side',
      'Downward dog 45s',
    ],
    equipmentNeeded: ['Mats'],
    metabolicTarget: 'anaerobic',
  },

  // ---- Striking-specific --------------------------------------------------
  {
    id: 'striking-round-simulation',
    name: 'Round Simulation',
    type: 'interval',
    description:
      'Mimics an actual fight: 3-minute rounds with 1-minute rest. Each round rotates through heavy bag combos, footwork drills, and defensive slips to build sport-specific endurance.',
    targetSport: ['striking'],
    difficulty: 'intermediate',
    totalDuration: 20,
    workInterval: 180,
    restInterval: 60,
    rounds: 5,
    exercises: [
      {
        name: 'Heavy Bag Combos',
        duration: 60,
        notes: 'Throw 3–4 punch combos with full hip rotation',
      },
      {
        name: 'Footwork Drills',
        duration: 60,
        notes: 'Lateral movement, pivots, and angle changes — stay on the balls of your feet',
      },
      {
        name: 'Defensive Slips',
        duration: 60,
        notes: 'Slip rope or partner jab; counter after every slip',
      },
    ],
    warmUp: [
      'Jump rope 3 min',
      'Arm circles x 15 each direction',
      'Shadow boxing 2 min (light)',
    ],
    coolDown: [
      'Shadow boxing 2 min (slow, technical)',
      'Shoulder stretch 30s each side',
      'Calf stretch 30s each side',
      'Deep breathing 2 min',
    ],
    equipmentNeeded: ['Heavy bag', 'Boxing gloves', 'Slip rope (optional)'],
    metabolicTarget: 'mixed',
  },
  {
    id: 'striking-boxing-emom',
    name: 'Boxing EMOM',
    type: 'emom',
    description:
      'A beginner-friendly every-minute-on-the-minute format that alternates push-ups and straight punches to build punching endurance and upper-body stamina.',
    targetSport: ['striking'],
    difficulty: 'beginner',
    totalDuration: 12,
    workInterval: 60,
    rounds: 12,
    exercises: [
      {
        name: 'Push-Ups',
        reps: 15,
        notes: 'Even minutes (0, 2, 4 …). Full range of motion.',
      },
      {
        name: 'Straight Punches (each side)',
        reps: 20,
        notes: 'Odd minutes (1, 3, 5 …). Fast, snappy punches — 20 per hand.',
      },
    ],
    warmUp: [
      'Jumping jacks x 30',
      'Arm circles x 15 each direction',
      'Slow shadow boxing 2 min',
    ],
    coolDown: [
      'Walk in place 2 min',
      'Chest doorway stretch 30s each side',
      'Wrist circles x 10 each direction',
    ],
    equipmentNeeded: ['Hand wraps (optional)'],
    metabolicTarget: 'anaerobic',
  },
  {
    id: 'striking-muay-thai-circuit',
    name: 'Muay Thai Circuit',
    type: 'circuit',
    description:
      'Brutal multi-station circuit that covers every weapon in the Muay Thai arsenal: kicks, clinch knees, skip knees, and shadow boxing. Builds fight-length endurance.',
    targetSport: ['striking'],
    difficulty: 'advanced',
    totalDuration: 28,
    restInterval: 60,
    rounds: 4,
    exercises: [
      {
        name: 'Kick Shield Work',
        duration: 120,
        notes: 'Alternate round kicks, teeps, and switch kicks on a partner-held shield',
      },
      {
        name: 'Clinch Knees',
        duration: 60,
        notes: 'Lock a Thai plum clinch on a partner; deliver alternating knees',
      },
      {
        name: 'Skip Knees',
        duration: 60,
        notes: 'Skip forward on the rear leg and drive the lead knee — stay on the ball of your foot',
      },
      {
        name: 'Shadow Boxing',
        duration: 120,
        notes: 'Full Muay Thai shadow — include elbows, knees, and kicks',
      },
    ],
    warmUp: [
      'Skipping rope 3 min',
      'Hip circles x 10 each direction',
      'Leg swings x 10 each leg',
      'Light teeps on bag x 10 each leg',
    ],
    coolDown: [
      'Light shadow boxing 2 min',
      'Standing quad stretch 30s each side',
      'Hip flexor stretch 30s each side',
      'Seated hamstring stretch 45s',
    ],
    equipmentNeeded: ['Kick shield', 'Thai pads (optional)', 'Training partner'],
    metabolicTarget: 'mixed',
  },

  // ---- MMA ----------------------------------------------------------------
  {
    id: 'mma-fighters-amrap',
    name: "Fighter's AMRAP",
    type: 'amrap',
    description:
      '15-minute AMRAP (as many rounds as possible) combining explosive, full-body movements that replicate the varied physical demands of an MMA fight.',
    targetSport: ['mma'],
    difficulty: 'intermediate',
    totalDuration: 15,
    rounds: 1,
    exercises: [
      { name: 'Burpees', reps: 5 },
      { name: 'Kettlebell Swings', reps: 10, notes: 'Russian-style — hip hinge, eye-level' },
      { name: 'Box Jumps', reps: 15, notes: 'Step down to save the Achilles' },
      { name: '200 m Run', notes: 'Sprint pace' },
    ],
    warmUp: [
      'Jog 3 min',
      'Leg swings x 10 each leg',
      'Inchworms x 5',
      'Kettlebell deadlifts x 10 (light)',
    ],
    coolDown: [
      'Walk 3 min',
      'Pigeon stretch 45s each side',
      'Downward dog 45s',
      'Child\'s pose 45s',
    ],
    equipmentNeeded: ['Kettlebell', 'Plyo box', 'Running space'],
    metabolicTarget: 'mixed',
  },
  {
    id: 'mma-ground-and-pound-circuit',
    name: 'Ground & Pound Circuit',
    type: 'circuit',
    description:
      'A brutal MMA-specific circuit that chains together sprawls, guard passes, ground-and-pound on the bag, wall walk-ups, and tire flips to build fight-finishing power.',
    targetSport: ['mma'],
    difficulty: 'advanced',
    totalDuration: 25,
    restInterval: 90,
    rounds: 5,
    exercises: [
      {
        name: 'Sprawl to Guard Pass',
        reps: 3,
        notes: 'Sprawl, then immediately change levels and drill a guard pass on a partner or dummy',
      },
      {
        name: 'Ground & Pound on Bag',
        duration: 30,
        notes: 'Mount a heavy bag on the ground and deliver controlled GnP strikes',
      },
      {
        name: 'Wall Walk-Ups',
        reps: 5,
        notes: 'Feet on wall, walk hands toward wall until nearly vertical',
      },
      {
        name: 'Tire Flips',
        reps: 3,
        notes: 'Explode from a low deadlift position — drive with the hips',
      },
    ],
    warmUp: [
      'Jog 3 min',
      'Sprawl practice x 5 (slow)',
      'Push-ups x 10',
      'Hip bridges x 10',
    ],
    coolDown: [
      'Walk 2 min',
      'Foam roll thoracic spine 60s',
      'Supine spinal twist 30s each side',
      'Deep breathing 2 min',
    ],
    equipmentNeeded: ['Heavy bag', 'Tire', 'Wall space', 'Mats'],
    metabolicTarget: 'anaerobic',
  },

  // ---- General conditioning -----------------------------------------------
  {
    id: 'general-tabata-classic',
    name: 'Tabata Classic',
    type: 'tabata',
    description:
      'The original Tabata protocol applied to four bodyweight exercises. 20 seconds of all-out work, 10 seconds rest, repeated for 8 rounds per exercise. Pure anaerobic suffering.',
    targetSport: ['general'],
    difficulty: 'beginner',
    totalDuration: 16,
    workInterval: 20,
    restInterval: 10,
    rounds: 8,
    exercises: [
      { name: 'Burpees', duration: 20, notes: 'Full burpees — chest to floor' },
      { name: 'Mountain Climbers', duration: 20, notes: 'Drive knees fast; keep hips level' },
      { name: 'Squat Jumps', duration: 20, notes: 'Thighs below parallel before jumping' },
      { name: 'Push-Ups', duration: 20, notes: 'Full range of motion; drop to knees if needed' },
    ],
    warmUp: [
      'Jog in place 2 min',
      'Arm circles x 15 each direction',
      'Bodyweight squats x 10',
      'Inchworms x 5',
    ],
    coolDown: [
      'Walk in place 2 min',
      'Standing quad stretch 30s each side',
      'Chest doorway stretch 30s each side',
      'Deep breathing 2 min',
    ],
    equipmentNeeded: [],
    metabolicTarget: 'anaerobic',
  },
  {
    id: 'general-sled-push-emom',
    name: 'Sled Push EMOM',
    type: 'emom',
    description:
      'Every 90 seconds for 15 minutes: push a loaded sled 20 m out and 20 m back. Builds the hip-drive and leg endurance that translates to takedowns and cage work.',
    targetSport: ['general'],
    difficulty: 'intermediate',
    totalDuration: 15,
    workInterval: 90,
    rounds: 10,
    exercises: [
      {
        name: 'Sled Push',
        notes: 'Push 20 m out, turn around, push 20 m back. Stay low with arms extended.',
      },
    ],
    warmUp: [
      'Jog 3 min',
      'Leg swings x 10 each leg',
      'Bodyweight lunges x 10 each leg',
    ],
    coolDown: [
      'Walk 3 min',
      'Standing quad stretch 30s each side',
      'Standing calf stretch 30s each side',
      'Hip flexor stretch 30s each side',
    ],
    equipmentNeeded: ['Sled', 'Weight plates', '20 m runway'],
    metabolicTarget: 'mixed',
  },
  {
    id: 'general-assault-bike-intervals',
    name: 'Assault Bike Intervals',
    type: 'interval',
    description:
      'Ten rounds of 30-second max-effort sprints on the assault bike with 90 seconds of easy recovery spinning. Develops the repeated-sprint ability fighters need across multiple rounds.',
    targetSport: ['general'],
    difficulty: 'intermediate',
    totalDuration: 20,
    workInterval: 30,
    restInterval: 90,
    rounds: 10,
    exercises: [
      {
        name: 'Assault Bike Sprint',
        duration: 30,
        notes: 'Max RPM — push and pull with both arms and legs',
      },
    ],
    warmUp: [
      'Easy bike spin 3 min',
      'Leg swings x 10 each leg',
      '2 x 10s build-up sprints',
    ],
    coolDown: [
      'Easy bike spin 3 min',
      'Standing quad stretch 30s each side',
      'Hamstring stretch 30s each side',
    ],
    equipmentNeeded: ['Assault bike (or fan bike)'],
    metabolicTarget: 'anaerobic',
  },
  {
    id: 'general-the-gauntlet',
    name: 'The Gauntlet',
    type: 'circuit',
    description:
      'A five-round chipper that tests every energy system: a 400 m run, kettlebell swings, box jumps, pull-ups, and burpees. Intended to break you.',
    targetSport: ['general'],
    difficulty: 'advanced',
    totalDuration: 35,
    restInterval: 120,
    rounds: 5,
    exercises: [
      { name: '400 m Run', notes: 'Fast but sustainable — you have 5 rounds' },
      { name: 'Kettlebell Swings', reps: 20, notes: 'Russian-style — eye-level' },
      { name: 'Box Jumps', reps: 15, notes: 'Step down between reps' },
      { name: 'Pull-Ups', reps: 10, notes: 'Strict or kipping — just get your chin over' },
      { name: 'Burpees', reps: 5, notes: 'Full burpee with a jump at the top' },
    ],
    warmUp: [
      'Jog 3 min',
      'Arm circles x 15 each direction',
      'Bodyweight squats x 10',
      'Inchworms x 5',
      'Dead hang 20s',
    ],
    coolDown: [
      'Walk 3 min',
      'Pigeon stretch 45s each side',
      'Lat stretch 30s each side',
      'Child\'s pose 45s',
      'Deep breathing 2 min',
    ],
    equipmentNeeded: ['Kettlebell', 'Plyo box', 'Pull-up bar', 'Running space'],
    metabolicTarget: 'mixed',
  },
];

// ---------------------------------------------------------------------------
// MET look-up by conditioning type
// ---------------------------------------------------------------------------

const MET_VALUES: Record<ConditioningType, number> = {
  emom: 8,
  circuit: 8,
  tabata: 10,
  shark_tank: 10,
  interval: 7,
  amrap: 8,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns all built-in conditioning templates.
 *
 * Templates cover grappling, striking, MMA, and general conditioning
 * protocols including EMOM, Tabata, AMRAP, intervals, circuits, and
 * shark-tank formats.
 */
export function getConditioningTemplates(): ConditioningTemplate[] {
  return CONDITIONING_TEMPLATES;
}

/**
 * Returns templates whose `targetSport` array includes the given sport
 * **or** includes `'general'` (general conditioning is always relevant).
 *
 * @param sport - One of `'grappling'`, `'striking'`, `'mma'`, or `'general'`.
 */
export function getTemplatesForSport(sport: string): ConditioningTemplate[] {
  const normalized = sport.toLowerCase().trim();
  return CONDITIONING_TEMPLATES.filter(
    (t) =>
      t.targetSport.includes(normalized as ConditioningTemplate['targetSport'][number]) ||
      t.targetSport.includes('general')
  );
}

/**
 * Returns templates that match the given difficulty level.
 *
 * @param difficulty - One of `'beginner'`, `'intermediate'`, or `'advanced'`.
 */
export function getTemplatesByDifficulty(difficulty: string): ConditioningTemplate[] {
  const normalized = difficulty.toLowerCase().trim();
  return CONDITIONING_TEMPLATES.filter((t) => t.difficulty === normalized);
}

/**
 * Provides a rough calorie-burn estimate for a conditioning template
 * using standard MET (Metabolic Equivalent of Task) values.
 *
 * Formula: `METs × bodyweightKg × duration(hours)`
 *
 * MET assignments by type:
 * - EMOM / circuit / AMRAP ≈ 8 METs
 * - Tabata / shark_tank ≈ 10 METs
 * - Interval ≈ 7 METs
 *
 * @param template     - The conditioning template to estimate for.
 * @param bodyweightKg - The athlete's bodyweight in kilograms.
 * @returns Estimated calories burned (rounded to the nearest whole number).
 */
export function estimateCaloriesBurned(
  template: ConditioningTemplate,
  bodyweightKg: number
): number {
  const mets = MET_VALUES[template.type];
  const durationHours = template.totalDuration / 60;
  return Math.round(mets * bodyweightKg * durationHours);
}

/**
 * Returns a new template scaled to the requested fitness level.
 *
 * Scaling logic:
 * - **Beginner**: 60 % of base rounds, +50 % rest intervals.
 * - **Intermediate**: 100 % (unchanged).
 * - **Advanced**: 130 % of base rounds, −25 % rest intervals.
 *
 * Rounds are always clamped to a minimum of 1. The returned template is
 * a new object — the original is never mutated.
 *
 * @param template     - The base conditioning template to scale.
 * @param fitnessLevel - Desired fitness level.
 */
export function scaleTemplate(
  template: ConditioningTemplate,
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced'
): ConditioningTemplate {
  const scaleFactors: Record<
    'beginner' | 'intermediate' | 'advanced',
    { rounds: number; rest: number }
  > = {
    beginner: { rounds: 0.6, rest: 1.5 },
    intermediate: { rounds: 1.0, rest: 1.0 },
    advanced: { rounds: 1.3, rest: 0.75 },
  };

  const { rounds: roundsFactor, rest: restFactor } = scaleFactors[fitnessLevel];

  const scaledRounds = Math.max(1, Math.round(template.rounds * roundsFactor));
  const scaledRestInterval =
    template.restInterval !== undefined
      ? Math.round(template.restInterval * restFactor)
      : undefined;

  // Estimate the new total duration proportionally to round change
  const durationRatio = scaledRounds / template.rounds;
  const scaledDuration = Math.max(1, Math.round(template.totalDuration * durationRatio));

  return {
    ...template,
    rounds: scaledRounds,
    restInterval: scaledRestInterval,
    totalDuration: scaledDuration,
    difficulty: fitnessLevel,
  };
}
