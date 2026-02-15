/**
 * Sticking Point → Accessory Exercise Mapping
 *
 * Maps each lift category + sticking point to specific accessory exercises,
 * form cues, and programming recommendations.
 */

export interface AccessoryRecommendation {
  name: string;
  why: string;
  sets: string; // e.g. "3x5-8"
  rpe: string;  // e.g. "7-8"
}

export interface StickingPointPrescription {
  accessories: AccessoryRecommendation[];
  formCues: string[];
  commonCause: string;
}

type LiftCategory = 'squat' | 'bench' | 'deadlift' | 'ohp' | 'row' | 'default';
type StickingPoint = 'bottom' | 'mid_range' | 'lockout';

/**
 * Detect the lift category from exercise name/id for targeted recommendations.
 */
export function detectLiftCategory(exerciseName: string, exerciseId: string): LiftCategory {
  const n = `${exerciseName} ${exerciseId}`.toLowerCase();
  if (n.includes('squat') || n.includes('leg press')) return 'squat';
  if (n.includes('bench') || n.includes('chest press') || n.includes('db press') || n.includes('dumbbell press')) return 'bench';
  if (n.includes('deadlift') || n.includes('rdl') || n.includes('romanian')) return 'deadlift';
  if (n.includes('ohp') || n.includes('overhead') || n.includes('military') || n.includes('shoulder press')) return 'ohp';
  if (n.includes('row') || n.includes('pull')) return 'row';
  return 'default';
}

const PRESCRIPTIONS: Record<LiftCategory, Record<StickingPoint, StickingPointPrescription>> = {
  squat: {
    bottom: {
      accessories: [
        { name: 'Pause Squats', why: 'Builds strength out of the hole by eliminating the stretch reflex', sets: '3x3-5', rpe: '7-8' },
        { name: 'Tempo Squats (3-1-2-0)', why: 'Time under tension in the weakest range improves motor recruitment', sets: '3x5-6', rpe: '7' },
        { name: 'Front Squats', why: 'Forces upright torso and quad-dominant drive from the bottom', sets: '3x5-8', rpe: '7-8' },
        { name: 'Pin Squats (from bottom)', why: 'Removes eccentric momentum — pure concentric strength from your sticking point', sets: '3x3-5', rpe: '8' },
        { name: 'Goblet Squats', why: 'Reinforces depth and upright positioning with lighter load', sets: '2x12-15', rpe: '6-7' },
      ],
      formCues: [
        'Brace harder before descent — fill your belly with air, push obliques out',
        'Actively spread the floor with your feet to engage glutes at the bottom',
        'Drive your back into the bar first, then extend the knees',
      ],
      commonCause: 'Weak quads at deep knee flexion, poor ankle mobility, or insufficient bracing at depth.',
    },
    mid_range: {
      accessories: [
        { name: 'Box Squats', why: 'Teaches explosive concentric drive from a dead stop at parallel', sets: '4x3-5', rpe: '7-8' },
        { name: 'Belt Squats', why: 'Isolates leg drive without spinal fatigue — targets the mid-range transition', sets: '3x8-12', rpe: '7' },
        { name: 'SSB Squats', why: 'Safety bar shifts load forward, strengthening the mid-range where your back rounds', sets: '3x5-8', rpe: '7-8' },
        { name: 'Leg Press', why: 'High volume quad work without technique as a limiter', sets: '3x10-15', rpe: '7-8' },
      ],
      formCues: [
        'Accelerate through the mid-range — think "fast" as you pass parallel',
        'Keep your chest up — if your hips rise faster than the bar, your back is the weak link',
        'Cue "knees out" to maintain leverage through the sticking zone',
      ],
      commonCause: 'Hip extensors and quads handing off poorly, or loss of torso position causing the "good morning squat."',
    },
    lockout: {
      accessories: [
        { name: 'Hip Thrusts', why: 'Direct glute strength for the lockout phase', sets: '3x8-12', rpe: '7-8' },
        { name: 'Rack Squats (above parallel)', why: 'Overloads the top range to build lockout confidence', sets: '3x3-5', rpe: '8' },
        { name: 'Walking Lunges', why: 'Unilateral glute/quad work that fixes asymmetries at lockout', sets: '3x10 each', rpe: '7' },
        { name: 'Good Mornings', why: 'Strengthens the hip extensors that finish the squat', sets: '3x8-10', rpe: '7' },
      ],
      formCues: [
        'Squeeze your glutes hard at the top — don\'t just stand up passively',
        'Think "hips through" to finish the lift',
        'Make sure you\'re not hyperextending your lower back at lockout',
      ],
      commonCause: 'Weak glutes failing to finish hip extension, or fatigue from grinding through lower portions.',
    },
  },

  bench: {
    bottom: {
      accessories: [
        { name: 'Spoto Press', why: 'Stops 1-2 inches off chest — builds strength in the weakest position without bounce', sets: '3x4-6', rpe: '7-8' },
        { name: 'Larsen Press', why: 'Removes leg drive to isolate upper body pressing from the bottom', sets: '3x5-8', rpe: '7' },
        { name: 'Wide-Grip Bench', why: 'Increases ROM and chest demand at the bottom of the press', sets: '3x5-8', rpe: '7-8' },
        { name: 'Dumbbell Bench Press', why: 'Greater stretch at the bottom builds pec strength in lengthened position', sets: '3x8-12', rpe: '7-8' },
        { name: 'Chest Dips (slow eccentric)', why: 'Eccentric overload for pec/anterior delt at a deep stretch', sets: '3x6-10', rpe: '7' },
      ],
      formCues: [
        'Retract and depress your scapulae hard — keep your back tight throughout',
        'Row the bar down to your chest — control the eccentric',
        'Drive your feet into the floor to initiate leg drive off the chest',
      ],
      commonCause: 'Weak pectorals at full stretch, insufficient scapular retraction, or no leg drive off the chest.',
    },
    mid_range: {
      accessories: [
        { name: 'Close-Grip Bench', why: 'Shifts demand to triceps which drive the mid-range', sets: '3x5-8', rpe: '7-8' },
        { name: 'Tempo Bench (3-1-2-0)', why: 'Eliminates momentum through the sticking zone', sets: '3x5-6', rpe: '7' },
        { name: 'Incline Bench Press', why: 'Strengthens the shoulder flexion component that fails mid-range', sets: '3x6-10', rpe: '7-8' },
        { name: 'Pin Press (at sticking point)', why: 'Trains the exact range where you fail', sets: '3x3-5', rpe: '8' },
      ],
      formCues: [
        'Tuck your elbows slightly (45-degree angle) to optimize leverage through mid-range',
        'Push "up and back" toward the rack — not straight up',
        'Maintain a strong arch to shorten the pressing range',
      ],
      commonCause: 'Pecs handing off to triceps poorly, or loss of arch/back tightness causing the bar to slow.',
    },
    lockout: {
      accessories: [
        { name: 'Board Press / Floor Press', why: 'Limits ROM to top half — overloads the lockout range', sets: '3x4-6', rpe: '8' },
        { name: 'Pin Press (top half)', why: 'Pure concentric lockout strength from pins', sets: '3x3-5', rpe: '8-9' },
        { name: 'JM Press', why: 'Targets the tricep long head specifically for lockout power', sets: '3x8-10', rpe: '7-8' },
        { name: 'Dips (weighted)', why: 'Heavy compound tricep work with full lockout', sets: '3x6-10', rpe: '7-8' },
        { name: 'Skull Crushers', why: 'Direct tricep isolation for the muscles that finish the bench', sets: '3x10-12', rpe: '7' },
      ],
      formCues: [
        'Drive hard through the triceps at the top — elbows fully locked',
        'Don\'t lose your back tightness as you approach lockout',
        'Think "spread the bar apart" to engage the triceps through lockout',
      ],
      commonCause: 'Weak triceps failing to finish the press, or loss of back tightness causing energy leaks.',
    },
  },

  deadlift: {
    bottom: {
      accessories: [
        { name: 'Deficit Deadlifts', why: 'Increases ROM off the floor — if you can pull from a deficit, the floor feels easier', sets: '3x3-5', rpe: '7-8' },
        { name: 'Paused Deadlifts (1" off floor)', why: 'Eliminates momentum and builds position strength at the weakest point', sets: '3x3-5', rpe: '7-8' },
        { name: 'Snatch-Grip Deadlifts', why: 'Wider grip increases upper back demand and pull from the floor', sets: '3x5-8', rpe: '7' },
        { name: 'Leg Press', why: 'Quad strength for the initial leg drive off the floor', sets: '3x10-15', rpe: '7-8' },
        { name: 'Front Squats', why: 'Builds the quad and upper back strength needed to break the floor', sets: '3x5-8', rpe: '7-8' },
      ],
      formCues: [
        'Push the floor away with your legs — don\'t yank with your back',
        'Take the slack out of the bar before you pull — tension before speed',
        'Wedge your hips closer to the bar — better leverage off the floor',
      ],
      commonCause: 'Weak quads for the initial drive, poor starting position, or failing to "wedge" properly before pulling.',
    },
    mid_range: {
      accessories: [
        { name: 'Romanian Deadlifts', why: 'Builds hip hinge strength through the exact range where the bar slows', sets: '3x6-10', rpe: '7-8' },
        { name: 'Stiff-Leg Deadlifts', why: 'Isolates posterior chain through the mid-range', sets: '3x6-10', rpe: '7' },
        { name: 'Barbell Hip Thrusts', why: 'Glute strength for the hip extension that carries through mid-range', sets: '3x8-12', rpe: '7-8' },
        { name: 'Pendlay Rows', why: 'Upper back strength to keep the bar close through the mid-range', sets: '3x5-8', rpe: '7-8' },
      ],
      formCues: [
        'Keep the bar in contact with your legs — it should scrape your shins/thighs',
        'As the bar passes the knees, drive your hips forward aggressively',
        'Don\'t let your chest drop — keep lats tight to maintain bar path',
      ],
      commonCause: 'Weak hamstrings/glutes through the hip hinge, or the bar drifting forward due to weak lats.',
    },
    lockout: {
      accessories: [
        { name: 'Rack Pulls (just below knees)', why: 'Overloads the lockout range with supramaximal weight', sets: '3x3-5', rpe: '8' },
        { name: 'Block Pulls', why: 'Same as rack pulls but allows more natural bar path', sets: '3x3-5', rpe: '8' },
        { name: 'Barbell Hip Thrusts', why: 'Direct glute lockout strength — the muscle that finishes the deadlift', sets: '3x8-12', rpe: '7-8' },
        { name: 'Farmer\'s Carries', why: 'Grip endurance and upper back stability for maintaining lockout', sets: '3x30-40m', rpe: '7-8' },
      ],
      formCues: [
        'Squeeze your glutes to finish — don\'t hyperextend your lumbar spine',
        'Pull your shoulders back at the top — stand tall and proud',
        'If grip fails first, train grip separately — it\'s limiting your lockout',
      ],
      commonCause: 'Weak glutes failing to finish hip extension, grip giving out, or upper back rounding under load.',
    },
  },

  ohp: {
    bottom: {
      accessories: [
        { name: 'Z-Press', why: 'No leg drive, no back support — pure shoulder pressing from the hardest position', sets: '3x5-8', rpe: '7-8' },
        { name: 'Seated Dumbbell Press', why: 'Increased ROM and stabilizer demand at the bottom', sets: '3x8-12', rpe: '7' },
        { name: 'Viking Press / Landmine Press', why: 'Fixed bar path allows more volume at the bottom range', sets: '3x8-12', rpe: '7' },
      ],
      formCues: [
        'Keep your elbows slightly in front of the bar at the start',
        'Initiate the press by driving your head through as the bar clears',
        'Brace your core hard — no excessive lean-back',
      ],
      commonCause: 'Weak anterior deltoids at the start of the press, or poor positioning with elbows flared too wide.',
    },
    mid_range: {
      accessories: [
        { name: 'Pin Press (at forehead height)', why: 'Trains the exact transition zone where the bar stalls', sets: '3x3-5', rpe: '8' },
        { name: 'Push Press', why: 'Overloads the mid-range with momentum so you train heavier through the sticking zone', sets: '3x3-5', rpe: '7-8' },
        { name: 'Lateral Raises', why: 'Isolates the medial delts that assist the mid-range transition', sets: '3x12-15', rpe: '7' },
      ],
      formCues: [
        'Drive your head through the window as the bar passes your face',
        'Keep the bar path close — don\'t let it drift forward',
        'Strong core brace — any lean-back is energy lost',
      ],
      commonCause: 'Bar path deviating around the head creating a mechanical disadvantage, or weak medial deltoids.',
    },
    lockout: {
      accessories: [
        { name: 'Pin Press (top half)', why: 'Pure lockout strength from the top range', sets: '3x3-5', rpe: '8' },
        { name: 'Close-Grip Bench', why: 'Builds the tricep lockout strength that finishes the press', sets: '3x5-8', rpe: '7-8' },
        { name: 'Overhead Tricep Extensions', why: 'Tricep long head isolation in the overhead position', sets: '3x10-12', rpe: '7' },
      ],
      formCues: [
        'Lock your elbows hard at the top — full extension',
        'The bar should finish directly over the crown of your head',
        'Shrug slightly at lockout to engage the traps and stabilize',
      ],
      commonCause: 'Weak triceps, particularly the long head, failing to complete the overhead lockout.',
    },
  },

  row: {
    bottom: {
      accessories: [
        { name: 'Chest-Supported Rows', why: 'Eliminates momentum — forces strict back contraction from a dead stretch', sets: '3x8-12', rpe: '7-8' },
        { name: 'Seal Rows', why: 'Full ROM rowing with no body english', sets: '3x8-12', rpe: '7' },
        { name: 'Straight-Arm Pulldowns', why: 'Builds lat engagement at the fully stretched position', sets: '3x12-15', rpe: '7' },
      ],
      formCues: [
        'Initiate with your lats, not your biceps — think "elbows back"',
        'Let the weight fully stretch your lats at the bottom before pulling',
        'Maintain a neutral spine throughout the pull',
      ],
      commonCause: 'Weak lats at full stretch, or using biceps/momentum instead of back to initiate the pull.',
    },
    mid_range: {
      accessories: [
        { name: 'Kroc Rows', why: 'Heavy single-arm rows that build mid-range pulling power', sets: '2x15-20 each', rpe: '8-9' },
        { name: 'Cable Rows (pause at peak)', why: 'Isometric hold at peak contraction builds the mid-range', sets: '3x10-12', rpe: '7-8' },
        { name: 'Face Pulls', why: 'Strengthens the rear delts and rhomboids that stabilize mid-range', sets: '3x15-20', rpe: '7' },
      ],
      formCues: [
        'Squeeze your shoulder blades together at the mid-point',
        'Don\'t let your shoulders round forward — keep chest proud',
        'Control the eccentric — don\'t just drop the weight',
      ],
      commonCause: 'Weak mid-back (rhomboids/rear delts) or over-reliance on biceps through the pulling range.',
    },
    lockout: {
      accessories: [
        { name: 'Barbell Shrugs', why: 'Traps strength for the top of the pull', sets: '3x10-12', rpe: '7-8' },
        { name: 'Inverted Rows (pause at top)', why: 'Bodyweight row with peak contraction hold', sets: '3x10-15', rpe: '7' },
        { name: 'Band Pull-Aparts', why: 'High-rep rear delt/rhomboid activation', sets: '3x20-25', rpe: '6-7' },
      ],
      formCues: [
        'Pull your elbows past your torso — don\'t stop short',
        'Squeeze and hold at the top for a full second',
        'Retract and depress your scapulae at peak contraction',
      ],
      commonCause: 'Weak scapular retractors or insufficient range of motion — stopping the pull too early.',
    },
  },

  default: {
    bottom: {
      accessories: [
        { name: 'Paused Reps (2-3s hold)', why: 'Builds strength at the bottom by eliminating the stretch reflex', sets: '3x5-6', rpe: '7-8' },
        { name: 'Tempo Work (3-1-2-0)', why: 'Time under tension in the weakest range', sets: '3x6-8', rpe: '7' },
        { name: 'Deficit / Extended ROM Variation', why: 'Increases the range of motion to strengthen the bottom position', sets: '3x5-8', rpe: '7-8' },
      ],
      formCues: [
        'Control the eccentric — own the bottom position',
        'Brace hard before initiating the concentric',
        'Focus on muscle engagement at full stretch',
      ],
      commonCause: 'Weakness at the lengthened muscle position, or poor stability and bracing at depth.',
    },
    mid_range: {
      accessories: [
        { name: 'Pin Work (at sticking point)', why: 'Trains the exact position where you fail', sets: '3x3-5', rpe: '8' },
        { name: 'Bands/Chains (accommodating resistance)', why: 'Increases load through the sticking zone', sets: '3x5-8', rpe: '7-8' },
        { name: 'Partial Reps (through sticking zone)', why: 'Extra volume in the weak range', sets: '3x6-8', rpe: '7' },
      ],
      formCues: [
        'Accelerate through the sticking zone — think "fast"',
        'Maintain technique through the hardest part',
        'Don\'t let the bar path deviate at the sticking point',
      ],
      commonCause: 'Transition between primary movers is the weak link, or technique breaks down under load.',
    },
    lockout: {
      accessories: [
        { name: 'Partial Range Overloads', why: 'Supramaximal loading at the top range builds lockout strength', sets: '3x3-5', rpe: '8' },
        { name: 'Isometric Holds at Lockout', why: 'Time under tension at full extension', sets: '3x10-15s', rpe: '8' },
        { name: 'Isolation Work (for the locking muscle)', why: 'Direct work for the muscle that finishes the lift', sets: '3x10-12', rpe: '7' },
      ],
      formCues: [
        'Finish every rep with full lockout — no lazy tops',
        'Squeeze the target muscle hard at peak contraction',
        'Don\'t sacrifice range of motion as the set gets hard',
      ],
      commonCause: 'The muscle responsible for the final portion of the lift needs more targeted work.',
    },
  },
};

/**
 * Get specific accessory recommendations for a given exercise and sticking point.
 */
export function getAccessoryPrescription(
  exerciseName: string,
  exerciseId: string,
  stickingPoint: 'bottom' | 'mid_range' | 'lockout' | 'unknown'
): StickingPointPrescription | null {
  if (stickingPoint === 'unknown') return null;
  const category = detectLiftCategory(exerciseName, exerciseId);
  return PRESCRIPTIONS[category]?.[stickingPoint] ?? PRESCRIPTIONS.default[stickingPoint];
}
