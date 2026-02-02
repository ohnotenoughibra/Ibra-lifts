import { Exercise, Equipment } from './types';

// Comprehensive exercise database for grapplers
export const exercises: Exercise[] = [
  // COMPOUND MOVEMENTS - Strength Foundation
  {
    id: 'deadlift',
    name: 'Conventional Deadlift',
    category: 'compound',
    primaryMuscles: ['back', 'glutes', 'hamstrings'],
    secondaryMuscles: ['core', 'forearms', 'traps', 'quadriceps'],
    movementPattern: 'hinge',
    equipmentRequired: ['full_gym', 'home_gym'],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 10,
    description: 'The king of posterior chain development. Essential for grappling power.',
    cues: [
      'Hip-width stance, barbell over mid-foot',
      'Grip just outside legs',
      'Chest up, lats engaged',
      'Drive through heels, extend hips and knees together',
      'Lock out with glutes, not lower back hyperextension'
    ]
  },
  {
    id: 'sumo-deadlift',
    name: 'Sumo Deadlift',
    category: 'compound',
    primaryMuscles: ['glutes', 'quadriceps', 'back'],
    secondaryMuscles: ['hamstrings', 'core', 'forearms'],
    movementPattern: 'hinge',
    equipmentRequired: ['full_gym', 'home_gym'],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 10,
    description: 'Wide-stance deadlift variant that mimics grappling base positions.',
    cues: [
      'Wide stance, toes pointed out 45 degrees',
      'Grip inside legs',
      'Drive knees out over toes',
      'Keep torso more upright than conventional',
      'Push the floor away'
    ]
  },
  {
    id: 'back-squat',
    name: 'Back Squat',
    category: 'compound',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['hamstrings', 'core', 'back'],
    movementPattern: 'squat',
    equipmentRequired: ['full_gym', 'home_gym'],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 10,
    description: 'Foundational leg strength for shooting takedowns and maintaining base.',
    cues: [
      'Bar on upper traps (high bar) or rear delts (low bar)',
      'Feet shoulder-width, slight toe-out',
      'Break at hips and knees simultaneously',
      'Depth: at least parallel, ideally below',
      'Drive up through mid-foot, knees tracking toes'
    ]
  },
  {
    id: 'front-squat',
    name: 'Front Squat',
    category: 'compound',
    primaryMuscles: ['quadriceps', 'core'],
    secondaryMuscles: ['glutes', 'back'],
    movementPattern: 'squat',
    equipmentRequired: ['full_gym', 'home_gym'],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 9,
    description: 'Builds tremendous core strength and upright torso position for grappling.',
    cues: [
      'Bar rests on front delts, elbows high',
      'Clean grip or cross-arm grip',
      'Stay upright - elbows point forward',
      'Drive knees forward and out',
      'Maintain proud chest throughout'
    ]
  },
  {
    id: 'goblet-squat',
    name: 'Goblet Squat',
    category: 'compound',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['core', 'shoulders'],
    movementPattern: 'squat',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 6,
    description: 'Excellent squat variation for learning mechanics and high reps.',
    cues: [
      'Hold dumbbell or kettlebell at chest',
      'Elbows inside knees at bottom',
      'Sit between legs, not back',
      'Chest stays tall',
      'Push knees out'
    ]
  },
  {
    id: 'bench-press',
    name: 'Barbell Bench Press',
    category: 'compound',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['shoulders', 'triceps'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym'],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 9,
    description: 'Builds pushing power for frames and sweeps in grappling.',
    cues: [
      'Retract and depress shoulder blades',
      'Slight arch, feet planted firmly',
      'Lower to lower chest/sternum',
      'Press in slight arc back over shoulders',
      'Maintain wrist neutrality'
    ]
  },
  {
    id: 'incline-bench-press',
    name: 'Incline Bench Press',
    category: 'compound',
    primaryMuscles: ['chest', 'shoulders'],
    secondaryMuscles: ['triceps'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym'],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 8,
    description: 'Upper chest emphasis for complete chest development.',
    cues: [
      '30-45 degree incline',
      'Same scapular retraction as flat bench',
      'Lower to upper chest',
      'Keep elbows at 45-60 degree angle'
    ]
  },
  {
    id: 'overhead-press',
    name: 'Standing Overhead Press',
    category: 'compound',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['triceps', 'core', 'traps'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym'],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 9,
    description: 'Essential for shoulder strength and overhead control in grappling.',
    cues: [
      'Bar starts at front delts',
      'Brace core, squeeze glutes',
      'Press straight up, move head back then forward',
      'Lockout over mid-foot',
      'No excessive back lean'
    ]
  },
  {
    id: 'push-press',
    name: 'Push Press',
    category: 'power',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['triceps', 'quadriceps', 'core'],
    movementPattern: 'explosive',
    equipmentRequired: ['full_gym', 'home_gym'],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 9,
    description: 'Explosive overhead power transfer for grappling clinch work.',
    cues: [
      'Start like strict press',
      'Dip 4-6 inches, knees over toes',
      'Explosive hip and knee extension',
      'Drive bar overhead as hips extend',
      'Lock out fully'
    ]
  },
  {
    id: 'barbell-row',
    name: 'Barbell Row',
    category: 'compound',
    primaryMuscles: ['back', 'lats'],
    secondaryMuscles: ['biceps', 'core', 'forearms'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym'],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 9,
    description: 'Builds pulling power essential for grips and transitions.',
    cues: [
      'Hinge at hips, torso 45-70 degrees',
      'Pull bar to lower chest/upper abs',
      'Lead with elbows, squeeze shoulder blades',
      'Control the eccentric',
      'Maintain neutral spine'
    ]
  },
  {
    id: 'pendlay-row',
    name: 'Pendlay Row',
    category: 'compound',
    primaryMuscles: ['back', 'lats'],
    secondaryMuscles: ['biceps', 'core'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym'],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 9,
    description: 'Explosive row from dead stop - mimics explosive pulling in grappling.',
    cues: [
      'Torso parallel to floor',
      'Bar returns to floor each rep',
      'Explosive pull, controlled lower',
      'Reset position between reps'
    ]
  },
  {
    id: 'pull-up',
    name: 'Pull-Up',
    category: 'compound',
    primaryMuscles: ['lats', 'back'],
    secondaryMuscles: ['biceps', 'forearms', 'core'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 9,
    description: 'The ultimate upper body pull - critical for grip and back strength.',
    cues: [
      'Slightly wider than shoulder grip',
      'Start from dead hang, engage lats',
      'Pull chest to bar',
      'Full range of motion',
      'Control the descent'
    ]
  },
  {
    id: 'weighted-pull-up',
    name: 'Weighted Pull-Up',
    category: 'compound',
    primaryMuscles: ['lats', 'back'],
    secondaryMuscles: ['biceps', 'forearms'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym'],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 10,
    description: 'Progressive overload for serious pulling strength.',
    cues: [
      'Use dip belt or weighted vest',
      'Same form as bodyweight',
      'Prioritize form over weight',
      'Full ROM even with load'
    ]
  },
  {
    id: 'chin-up',
    name: 'Chin-Up',
    category: 'compound',
    primaryMuscles: ['lats', 'biceps'],
    secondaryMuscles: ['back', 'forearms'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 8,
    description: 'Supinated grip emphasizes bicep development.',
    cues: [
      'Shoulder-width supinated grip',
      'Pull chin over bar',
      'Lead with chest',
      'Full extension at bottom'
    ]
  },
  {
    id: 'dip',
    name: 'Parallel Bar Dip',
    category: 'compound',
    primaryMuscles: ['chest', 'triceps'],
    secondaryMuscles: ['shoulders'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym'],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 8,
    description: 'Excellent for pushing strength and tricep development.',
    cues: [
      'Slight forward lean for chest emphasis',
      'Lower until upper arms parallel or below',
      'Keep shoulders down and back',
      'Full lockout at top'
    ]
  },

  // GRAPPLING-SPECIFIC MOVEMENTS
  {
    id: 'turkish-getup',
    name: 'Turkish Get-Up',
    category: 'grappling_specific',
    primaryMuscles: ['full_body', 'core', 'shoulders'],
    secondaryMuscles: ['glutes', 'quadriceps'],
    movementPattern: 'rotation',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 8,
    description: 'Ultimate grappler exercise - builds strength in all ground positions.',
    cues: [
      'Start supine, KB/DB locked out overhead',
      'Roll to elbow, then to hand',
      'Bridge hips high',
      'Sweep leg through to kneeling',
      'Stand up, reverse to descend',
      'Keep eyes on weight throughout'
    ]
  },
  {
    id: 'farmers-walk',
    name: 'Farmer\'s Walk',
    category: 'grappling_specific',
    primaryMuscles: ['forearms', 'traps', 'core'],
    secondaryMuscles: ['full_body'],
    movementPattern: 'carry',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 9,
    description: 'Builds crushing grip and full-body stability for grappling.',
    cues: [
      'Pick up heavy weights at sides',
      'Stand tall, shoulders back',
      'Short, quick steps',
      'Maintain neutral spine',
      'Crush the handles'
    ]
  },
  {
    id: 'suitcase-carry',
    name: 'Suitcase Carry',
    category: 'grappling_specific',
    primaryMuscles: ['core', 'forearms'],
    secondaryMuscles: ['shoulders', 'traps'],
    movementPattern: 'carry',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    grapplerFriendly: true,
    aestheticValue: 5,
    strengthValue: 8,
    description: 'Unilateral carry builds anti-lateral flexion strength.',
    cues: [
      'Heavy weight in one hand only',
      'Resist leaning to weighted side',
      'Walk with control',
      'Switch sides'
    ]
  },
  {
    id: 'medicine-ball-slam',
    name: 'Medicine Ball Slam',
    category: 'power',
    primaryMuscles: ['core', 'lats', 'shoulders'],
    secondaryMuscles: ['full_body'],
    movementPattern: 'explosive',
    equipmentRequired: ['full_gym', 'home_gym'],
    grapplerFriendly: true,
    aestheticValue: 5,
    strengthValue: 7,
    description: 'Explosive hip extension and core power for takedowns.',
    cues: [
      'Reach ball overhead',
      'Hinge and slam with full force',
      'Use entire posterior chain',
      'Reset fully between reps'
    ]
  },
  {
    id: 'med-ball-rotational-throw',
    name: 'Med Ball Rotational Throw',
    category: 'power',
    primaryMuscles: ['core'],
    secondaryMuscles: ['shoulders', 'chest'],
    movementPattern: 'rotation',
    equipmentRequired: ['full_gym', 'home_gym'],
    grapplerFriendly: true,
    aestheticValue: 5,
    strengthValue: 7,
    description: 'Rotational power for throws and sweeps.',
    cues: [
      'Stand sideways to wall',
      'Load hips and rotate',
      'Throw from hips, not arms',
      'Full hip and shoulder rotation'
    ]
  },
  {
    id: 'hip-thrust',
    name: 'Barbell Hip Thrust',
    category: 'compound',
    primaryMuscles: ['glutes'],
    secondaryMuscles: ['hamstrings', 'core'],
    movementPattern: 'hinge',
    equipmentRequired: ['full_gym', 'home_gym'],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 8,
    description: 'Builds powerful hip extension for bridging and escapes.',
    cues: [
      'Upper back on bench',
      'Bar over hips with pad',
      'Feet flat, knees at 90 at top',
      'Drive through heels',
      'Full hip extension, squeeze glutes'
    ]
  },
  {
    id: 'romanian-deadlift',
    name: 'Romanian Deadlift',
    category: 'compound',
    primaryMuscles: ['hamstrings', 'glutes'],
    secondaryMuscles: ['back', 'core'],
    movementPattern: 'hinge',
    equipmentRequired: ['full_gym', 'home_gym'],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 8,
    description: 'Eccentric-focused hamstring builder for injury prevention.',
    cues: [
      'Start standing with bar',
      'Soft knees, hinge at hips',
      'Push hips back, bar close to legs',
      'Feel deep hamstring stretch',
      'Drive hips forward to stand'
    ]
  },

  // GRIP WORK
  {
    id: 'dead-hang',
    name: 'Dead Hang',
    category: 'grip',
    primaryMuscles: ['forearms'],
    secondaryMuscles: ['lats', 'shoulders'],
    movementPattern: 'carry',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    grapplerFriendly: true,
    aestheticValue: 3,
    strengthValue: 7,
    description: 'Grip endurance fundamental for maintaining holds.',
    cues: [
      'Hang from bar with straight arms',
      'Shoulders engaged slightly',
      'Maintain grip as long as possible',
      'Build up time progressively'
    ]
  },
  {
    id: 'towel-pull-up',
    name: 'Towel Pull-Up',
    category: 'grip',
    primaryMuscles: ['forearms', 'lats'],
    secondaryMuscles: ['biceps', 'back'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 9,
    description: 'Gi-grip simulation for superior grappling grip strength.',
    cues: [
      'Drape towel over bar',
      'Grip towel like a gi',
      'Pull up with towel grip',
      'Vary towel thickness for difficulty'
    ]
  },
  {
    id: 'plate-pinch',
    name: 'Plate Pinch Hold',
    category: 'grip',
    primaryMuscles: ['forearms'],
    secondaryMuscles: [],
    movementPattern: 'carry',
    equipmentRequired: ['full_gym', 'home_gym'],
    grapplerFriendly: true,
    aestheticValue: 2,
    strengthValue: 7,
    description: 'Pinch grip strength for collar ties and grips.',
    cues: [
      'Pinch plates together smooth sides out',
      'Hold at side for time',
      'Progressive overload with more plates'
    ]
  },
  {
    id: 'wrist-roller',
    name: 'Wrist Roller',
    category: 'grip',
    primaryMuscles: ['forearms'],
    secondaryMuscles: ['shoulders'],
    movementPattern: 'rotation',
    equipmentRequired: ['full_gym', 'home_gym'],
    grapplerFriendly: true,
    aestheticValue: 4,
    strengthValue: 7,
    description: 'Complete forearm development for crushing grip.',
    cues: [
      'Arms extended in front',
      'Roll weight up with wrists',
      'Roll both directions',
      'Control the descent'
    ]
  },

  // ISOLATION / AESTHETICS
  {
    id: 'bicep-curl',
    name: 'Barbell Curl',
    category: 'isolation',
    primaryMuscles: ['biceps'],
    secondaryMuscles: ['forearms'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym'],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 4,
    description: 'Classic arm builder for aesthetic bicep development.',
    cues: [
      'Shoulder-width grip',
      'Keep elbows pinned at sides',
      'Curl through full ROM',
      'Control the eccentric',
      'No body swing'
    ]
  },
  {
    id: 'dumbbell-curl',
    name: 'Dumbbell Curl',
    category: 'isolation',
    primaryMuscles: ['biceps'],
    secondaryMuscles: ['forearms'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 4,
    description: 'Unilateral bicep work for balanced development.',
    cues: [
      'Palms facing forward or supinate during curl',
      'Full stretch at bottom',
      'Peak contraction at top',
      'Alternate or both together'
    ]
  },
  {
    id: 'hammer-curl',
    name: 'Hammer Curl',
    category: 'isolation',
    primaryMuscles: ['biceps', 'forearms'],
    secondaryMuscles: [],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 5,
    description: 'Brachialis and forearm emphasis for complete arm development.',
    cues: [
      'Neutral grip throughout',
      'Curl straight up',
      'Keep elbows stationary',
      'Control both directions'
    ]
  },
  {
    id: 'tricep-pushdown',
    name: 'Tricep Pushdown',
    category: 'isolation',
    primaryMuscles: ['triceps'],
    secondaryMuscles: [],
    movementPattern: 'push',
    equipmentRequired: ['full_gym'],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 4,
    description: 'Isolated tricep work for arm size and lockout strength.',
    cues: [
      'Elbows pinned at sides',
      'Push down to full extension',
      'Squeeze triceps at bottom',
      'Controlled return'
    ]
  },
  {
    id: 'skull-crusher',
    name: 'Skull Crusher',
    category: 'isolation',
    primaryMuscles: ['triceps'],
    secondaryMuscles: [],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym'],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 5,
    description: 'Long head tricep emphasis for complete tricep development.',
    cues: [
      'EZ bar or dumbbells',
      'Lower to forehead or behind head',
      'Keep upper arms stationary',
      'Full extension at top'
    ]
  },
  {
    id: 'lateral-raise',
    name: 'Lateral Raise',
    category: 'isolation',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['traps'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 3,
    description: 'Builds the shoulder cap for wider aesthetic appearance.',
    cues: [
      'Slight bend in elbows',
      'Raise to shoulder height',
      'Lead with pinkies slightly',
      'Control the descent',
      'Light weight, high reps'
    ]
  },
  {
    id: 'rear-delt-fly',
    name: 'Rear Delt Fly',
    category: 'isolation',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['back', 'traps'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 4,
    description: 'Rear delt development for shoulder health and aesthetics.',
    cues: [
      'Hinge forward or use machine',
      'Lead with elbows',
      'Squeeze rear delts at top',
      'Control throughout'
    ]
  },
  {
    id: 'face-pull',
    name: 'Face Pull',
    category: 'isolation',
    primaryMuscles: ['shoulders', 'back'],
    secondaryMuscles: ['traps'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym'],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 5,
    description: 'Essential for shoulder health and posture.',
    cues: [
      'Cable at face height',
      'Pull to face, externally rotate',
      'Separate hands, squeeze rear delts',
      'High reps for health'
    ]
  },
  {
    id: 'leg-curl',
    name: 'Lying Leg Curl',
    category: 'isolation',
    primaryMuscles: ['hamstrings'],
    secondaryMuscles: [],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym'],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 5,
    description: 'Isolated hamstring work for knee health and leg aesthetics.',
    cues: [
      'Lie face down, pad above ankles',
      'Curl heels toward glutes',
      'Full contraction',
      'Control the eccentric - crucial for hypertrophy'
    ]
  },
  {
    id: 'leg-extension',
    name: 'Leg Extension',
    category: 'isolation',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: [],
    movementPattern: 'push',
    equipmentRequired: ['full_gym'],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 4,
    description: 'Isolated quad work for leg definition.',
    cues: [
      'Pad above ankles',
      'Extend fully, squeeze quads',
      'Control the descent',
      'Avoid hyperextending knee'
    ]
  },
  {
    id: 'calf-raise',
    name: 'Standing Calf Raise',
    category: 'isolation',
    primaryMuscles: ['calves'],
    secondaryMuscles: [],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 4,
    description: 'Builds lower leg aesthetics and ankle stability.',
    cues: [
      'Full stretch at bottom',
      'Rise onto balls of feet',
      'Peak contraction at top',
      'Slow eccentric'
    ]
  },
  {
    id: 'seated-calf-raise',
    name: 'Seated Calf Raise',
    category: 'isolation',
    primaryMuscles: ['calves'],
    secondaryMuscles: [],
    movementPattern: 'push',
    equipmentRequired: ['full_gym'],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 4,
    description: 'Targets soleus for complete calf development.',
    cues: [
      'Knees at 90 degrees',
      'Full ROM',
      'Emphasis on stretch and contraction'
    ]
  },

  // CORE WORK
  {
    id: 'hanging-leg-raise',
    name: 'Hanging Leg Raise',
    category: 'isolation',
    primaryMuscles: ['core'],
    secondaryMuscles: ['forearms'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 7,
    description: 'Superior ab exercise for visible abs and functional core.',
    cues: [
      'Hang from bar',
      'Raise legs with minimal swing',
      'Control the descent',
      'Keep core engaged throughout'
    ]
  },
  {
    id: 'ab-wheel-rollout',
    name: 'Ab Wheel Rollout',
    category: 'isolation',
    primaryMuscles: ['core'],
    secondaryMuscles: ['shoulders', 'lats'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 8,
    description: 'Anti-extension core strength for grappling base.',
    cues: [
      'Start kneeling',
      'Roll out keeping core tight',
      'Extend as far as control allows',
      'Pull back with abs, not arms'
    ]
  },
  {
    id: 'pallof-press',
    name: 'Pallof Press',
    category: 'grappling_specific',
    primaryMuscles: ['core'],
    secondaryMuscles: [],
    movementPattern: 'rotation',
    equipmentRequired: ['full_gym'],
    grapplerFriendly: true,
    aestheticValue: 5,
    strengthValue: 7,
    description: 'Anti-rotation core strength essential for grappling.',
    cues: [
      'Stand sideways to cable',
      'Press out and hold',
      'Resist rotation',
      'Maintain neutral spine'
    ]
  },
  {
    id: 'plank',
    name: 'Plank',
    category: 'isolation',
    primaryMuscles: ['core'],
    secondaryMuscles: ['shoulders'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    grapplerFriendly: true,
    aestheticValue: 5,
    strengthValue: 6,
    description: 'Fundamental core stability for all lifting and grappling.',
    cues: [
      'Forearms and toes on ground',
      'Body in straight line',
      'Engage glutes and core',
      'Hold for time'
    ]
  },
  {
    id: 'side-plank',
    name: 'Side Plank',
    category: 'isolation',
    primaryMuscles: ['core'],
    secondaryMuscles: ['shoulders'],
    movementPattern: 'rotation',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    grapplerFriendly: true,
    aestheticValue: 5,
    strengthValue: 6,
    description: 'Lateral core stability for grappling positions.',
    cues: [
      'Forearm and feet stacked',
      'Hips high, body straight',
      'Hold for time each side'
    ]
  },

  // ACCESSORY MOVEMENTS
  {
    id: 'cable-row',
    name: 'Seated Cable Row',
    category: 'compound',
    primaryMuscles: ['back', 'lats'],
    secondaryMuscles: ['biceps', 'forearms'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym'],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 7,
    description: 'Controlled back work for thickness and pulling endurance.',
    cues: [
      'Sit upright, slight forward lean to start',
      'Pull to waist',
      'Squeeze shoulder blades',
      'Control the stretch'
    ]
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    category: 'compound',
    primaryMuscles: ['lats', 'back'],
    secondaryMuscles: ['biceps'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym'],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 7,
    description: 'Lat width builder and pull-up progression.',
    cues: [
      'Grip wider than shoulders',
      'Pull to upper chest',
      'Lead with elbows',
      'Squeeze lats at bottom'
    ]
  },
  {
    id: 'dumbbell-row',
    name: 'Dumbbell Row',
    category: 'compound',
    primaryMuscles: ['back', 'lats'],
    secondaryMuscles: ['biceps', 'core'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 8,
    description: 'Unilateral back work for balanced development.',
    cues: [
      'One hand on bench',
      'Pull dumbbell to hip',
      'Slight rotation allowed',
      'Full stretch at bottom'
    ]
  },
  {
    id: 'dumbbell-press',
    name: 'Dumbbell Bench Press',
    category: 'compound',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['shoulders', 'triceps'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym'],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 8,
    description: 'Greater ROM than barbell for chest development.',
    cues: [
      'Dumbbells at sides of chest',
      'Press up and slightly in',
      'Full stretch at bottom',
      'Control the weight'
    ]
  },
  {
    id: 'dumbbell-shoulder-press',
    name: 'Dumbbell Shoulder Press',
    category: 'compound',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['triceps'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 7,
    description: 'Shoulder strength with natural movement path.',
    cues: [
      'Start at shoulder height',
      'Press straight up',
      'Slight arc at top',
      'Full ROM'
    ]
  },
  {
    id: 'split-squat',
    name: 'Bulgarian Split Squat',
    category: 'compound',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['hamstrings', 'core'],
    movementPattern: 'squat',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 8,
    description: 'Unilateral leg strength for grappling stance stability.',
    cues: [
      'Rear foot elevated on bench',
      'Lower until back knee near ground',
      'Keep torso upright',
      'Drive through front heel'
    ]
  },
  {
    id: 'lunges',
    name: 'Walking Lunges',
    category: 'compound',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['hamstrings', 'core'],
    movementPattern: 'squat',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 7,
    description: 'Dynamic leg strength with athletic carryover.',
    cues: [
      'Long stride forward',
      'Lower back knee toward ground',
      'Drive through front heel',
      'Step through to next rep'
    ]
  },
  {
    id: 'kettlebell-swing',
    name: 'Kettlebell Swing',
    category: 'power',
    primaryMuscles: ['glutes', 'hamstrings'],
    secondaryMuscles: ['core', 'shoulders', 'back'],
    movementPattern: 'explosive',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 7,
    description: 'Explosive hip power for takedowns and scrambles.',
    cues: [
      'Hike KB back like a football',
      'Explosive hip snap forward',
      'Arms are just along for the ride',
      'Float KB to shoulder/eye height',
      'Brace core at top'
    ]
  },
  {
    id: 'power-clean',
    name: 'Power Clean',
    category: 'power',
    primaryMuscles: ['full_body'],
    secondaryMuscles: ['quadriceps', 'glutes', 'back', 'shoulders'],
    movementPattern: 'explosive',
    equipmentRequired: ['full_gym', 'home_gym'],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 9,
    description: 'Total body explosive power development.',
    cues: [
      'Start like deadlift',
      'First pull to above knee',
      'Explosive second pull - jump and shrug',
      'Catch in front rack',
      'Stand up to complete'
    ]
  },
  {
    id: 'box-jump',
    name: 'Box Jump',
    category: 'power',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['calves', 'core'],
    movementPattern: 'explosive',
    equipmentRequired: ['full_gym', 'home_gym'],
    grapplerFriendly: true,
    aestheticValue: 4,
    strengthValue: 7,
    description: 'Lower body explosiveness for shooting and sprawling.',
    cues: [
      'Feet shoulder width',
      'Counter-movement arm swing',
      'Explode up and forward',
      'Land softly on box',
      'Step down, don\'t jump'
    ]
  },
  {
    id: 'shrug',
    name: 'Barbell Shrug',
    category: 'isolation',
    primaryMuscles: ['traps'],
    secondaryMuscles: ['forearms'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym'],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 5,
    description: 'Trap development for neck protection and aesthetics.',
    cues: [
      'Shoulder-width grip',
      'Shrug straight up, not rolling',
      'Hold at top',
      'Control the lower'
    ]
  }
];

// Helper function to get exercises by criteria
export function getExercisesByCategory(category: string): Exercise[] {
  return exercises.filter(e => e.category === category);
}

export function getExercisesByMuscle(muscle: string): Exercise[] {
  return exercises.filter(e =>
    e.primaryMuscles.includes(muscle as any) ||
    e.secondaryMuscles.includes(muscle as any)
  );
}

export function getExercisesByEquipment(equipment: Equipment): Exercise[] {
  return exercises.filter(e => e.equipmentRequired.includes(equipment));
}

export function getGrapplerExercises(): Exercise[] {
  return exercises.filter(e => e.grapplerFriendly);
}

export function getExerciseById(id: string): Exercise | undefined {
  return exercises.find(e => e.id === id);
}

// Get exercises sorted by aesthetic or strength value
export function getTopAestheticExercises(limit: number = 10): Exercise[] {
  return [...exercises].sort((a, b) => b.aestheticValue - a.aestheticValue).slice(0, limit);
}

export function getTopStrengthExercises(limit: number = 10): Exercise[] {
  return [...exercises].sort((a, b) => b.strengthValue - a.strengthValue).slice(0, limit);
}
