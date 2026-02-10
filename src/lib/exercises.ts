import { Exercise, Equipment, EquipmentType } from './types';

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
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 10,
    description: 'The king of posterior chain development. Essential for grappling power.',
    videoUrl: 'https://www.youtube.com/results?search_query=conventional+deadlift+proper+form+technique+short',
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
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 10,
    description: 'Wide-stance deadlift variant that mimics grappling base positions.',
    videoUrl: 'https://www.youtube.com/results?search_query=sumo+deadlift+proper+form+technique+short',
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
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 10,
    description: 'Foundational leg strength for shooting takedowns and maintaining base.',
    videoUrl: 'https://www.youtube.com/results?search_query=barbell+back+squat+proper+form+tutorial+short',
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
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 9,
    description: 'Builds tremendous core strength and upright torso position for grappling.',
    videoUrl: 'https://www.youtube.com/results?search_query=barbell+front+squat+proper+form+tutorial+short',
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
    equipmentTypes: ['dumbbell', 'kettlebell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 6,
    description: 'Excellent squat variation for learning mechanics and high reps.',
    videoUrl: 'https://www.youtube.com/results?search_query=goblet+squat+dumbbell+proper+form+tutorial+short',
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
    equipmentTypes: ['barbell', 'bench'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 9,
    description: 'Builds pushing power for frames and sweeps in grappling.',
    videoUrl: 'https://www.youtube.com/results?search_query=barbell+bench+press+proper+form+technique+short',
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
    equipmentTypes: ['barbell', 'bench'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 8,
    description: 'Upper chest emphasis for complete chest development.',
    videoUrl: 'https://www.youtube.com/results?search_query=incline+bench+press+barbell+proper+form+short',
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
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 9,
    description: 'Essential for shoulder strength and overhead control in grappling.',
    videoUrl: 'https://www.youtube.com/results?search_query=standing+overhead+press+barbell+proper+form+short',
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
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 9,
    description: 'Explosive overhead power transfer for grappling clinch work.',
    videoUrl: 'https://www.youtube.com/results?search_query=push+press+barbell+proper+form+technique+short',
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
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps', 'core', 'forearms'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 9,
    description: 'Builds pulling power essential for grips and transitions.',
    videoUrl: 'https://www.youtube.com/results?search_query=barbell+bent+over+row+proper+form+short',
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
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps', 'core'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 9,
    description: 'Explosive row from dead stop - mimics explosive pulling in grappling.',
    videoUrl: 'https://www.youtube.com/results?search_query=pendlay+row+proper+form+technique+short',
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
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps', 'forearms', 'core'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['pull_up_bar'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 9,
    description: 'The ultimate upper body pull - critical for grip and back strength.',
    videoUrl: 'https://www.youtube.com/results?search_query=pull+up+proper+form+technique+tutorial+short',
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
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps', 'forearms'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['pull_up_bar'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 10,
    description: 'Progressive overload for serious pulling strength.',
    videoUrl: 'https://www.youtube.com/results?search_query=weighted+pull+up+proper+form+technique+short',
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
    primaryMuscles: ['back', 'biceps'],
    secondaryMuscles: ['forearms'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['pull_up_bar'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 8,
    description: 'Supinated grip emphasizes bicep development.',
    videoUrl: 'https://www.youtube.com/results?search_query=chin+up+proper+form+technique+tutorial+short',
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
    equipmentTypes: ['dip_station'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 8,
    description: 'Excellent for pushing strength and tricep development.',
    videoUrl: 'https://www.youtube.com/results?search_query=parallel+bar+dip+proper+form+technique+short',
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
    equipmentTypes: ['kettlebell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 8,
    description: 'Ultimate grappler exercise - builds strength in all ground positions.',
    videoUrl: 'https://www.youtube.com/results?search_query=turkish+get+up+form+tutorial+kettlebell+short',
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
    equipmentTypes: ['dumbbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 9,
    measurementType: 'time',
    description: 'Builds crushing grip and full-body stability for grappling.',
    videoUrl: 'https://www.youtube.com/results?search_query=farmers+walk+proper+form+technique+short',
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
    equipmentTypes: ['dumbbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 5,
    strengthValue: 8,
    description: 'Unilateral carry builds anti-lateral flexion strength.',
    videoUrl: 'https://www.youtube.com/results?search_query=suitcase+carry+exercise+proper+form+technique+short',
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
    primaryMuscles: ['core', 'back', 'shoulders'],
    secondaryMuscles: ['full_body'],
    movementPattern: 'explosive',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['medicine_ball'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 5,
    strengthValue: 7,
    description: 'Explosive hip extension and core power for takedowns.',
    videoUrl: 'https://www.youtube.com/results?search_query=medicine+ball+slam+proper+form+technique+short',
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
    equipmentTypes: ['medicine_ball'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 5,
    strengthValue: 7,
    description: 'Rotational power for throws and sweeps.',
    videoUrl: 'https://www.youtube.com/results?search_query=medicine+ball+rotational+throw+proper+form+short',
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
    equipmentTypes: ['barbell', 'bench'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 8,
    description: 'Builds powerful hip extension for bridging and escapes.',
    videoUrl: 'https://www.youtube.com/results?search_query=barbell+hip+thrust+proper+form+technique+short',
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
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 8,
    description: 'Eccentric-focused hamstring builder for injury prevention.',
    videoUrl: 'https://www.youtube.com/results?search_query=romanian+deadlift+proper+form+technique+short',
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
    secondaryMuscles: ['back', 'shoulders'],
    movementPattern: 'carry',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['pull_up_bar'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 3,
    strengthValue: 7,
    measurementType: 'time',
    description: 'Grip endurance fundamental for maintaining holds.',
    videoUrl: 'https://www.youtube.com/results?search_query=dead+hang+bar+proper+form+technique+short',
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
    primaryMuscles: ['forearms', 'back'],
    secondaryMuscles: ['biceps'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['pull_up_bar'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 9,
    description: 'Gi-grip simulation for superior grappling grip strength.',
    videoUrl: 'https://www.youtube.com/results?search_query=towel+pull+up+grip+training+technique+short',
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
    equipmentTypes: ['bodyweight'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 2,
    strengthValue: 7,
    description: 'Pinch grip strength for collar ties and grips.',
    videoUrl: 'https://www.youtube.com/results?search_query=plate+pinch+hold+grip+training+technique+short',
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
    equipmentTypes: ['dumbbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 4,
    strengthValue: 7,
    description: 'Complete forearm development for crushing grip.',
    videoUrl: 'https://www.youtube.com/results?search_query=wrist+roller+exercise+proper+form+short',
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
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 4,
    description: 'Classic arm builder for aesthetic bicep development.',
    videoUrl: 'https://www.youtube.com/results?search_query=barbell+curl+proper+form+technique+short',
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
    equipmentTypes: ['dumbbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 4,
    description: 'Unilateral bicep work for balanced development.',
    videoUrl: 'https://www.youtube.com/results?search_query=dumbbell+curl+proper+form+technique+short',
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
    equipmentTypes: ['dumbbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 5,
    description: 'Brachialis and forearm emphasis for complete arm development.',
    videoUrl: 'https://www.youtube.com/results?search_query=hammer+curl+proper+form+technique+short',
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
    equipmentTypes: ['cable'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 4,
    description: 'Isolated tricep work for arm size and lockout strength.',
    videoUrl: 'https://www.youtube.com/results?search_query=tricep+pushdown+cable+proper+form+short',
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
    equipmentTypes: ['ez_bar', 'bench'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 5,
    description: 'Long head tricep emphasis for complete tricep development.',
    videoUrl: 'https://www.youtube.com/results?search_query=skull+crusher+proper+form+technique+short',
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
    equipmentTypes: ['dumbbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 3,
    description: 'Builds the shoulder cap for wider aesthetic appearance.',
    videoUrl: 'https://www.youtube.com/results?search_query=lateral+raise+dumbbell+proper+form+short',
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
    equipmentTypes: ['dumbbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 4,
    description: 'Rear delt development for shoulder health and aesthetics.',
    videoUrl: 'https://www.youtube.com/results?search_query=rear+delt+fly+dumbbell+proper+form+short',
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
    equipmentTypes: ['cable'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 5,
    description: 'Essential for shoulder health and posture.',
    videoUrl: 'https://www.youtube.com/results?search_query=face+pull+cable+proper+form+technique+short',
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
    equipmentTypes: ['machine'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 5,
    description: 'Isolated hamstring work for knee health and leg aesthetics.',
    videoUrl: 'https://www.youtube.com/results?search_query=lying+leg+curl+machine+proper+form+short',
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
    equipmentTypes: ['machine'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 4,
    description: 'Isolated quad work for leg definition.',
    videoUrl: 'https://www.youtube.com/results?search_query=leg+extension+machine+proper+form+short',
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
    equipmentTypes: ['dumbbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 4,
    description: 'Builds lower leg aesthetics and ankle stability.',
    videoUrl: 'https://www.youtube.com/results?search_query=standing+calf+raise+proper+form+technique+short',
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
    equipmentTypes: ['machine'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 4,
    description: 'Targets soleus for complete calf development.',
    videoUrl: 'https://www.youtube.com/results?search_query=seated+calf+raise+proper+form+technique+short',
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
    equipmentTypes: ['pull_up_bar'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 7,
    description: 'Superior ab exercise for visible abs and functional core.',
    videoUrl: 'https://www.youtube.com/results?search_query=hanging+leg+raise+proper+form+technique+short',
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
    secondaryMuscles: ['shoulders', 'back'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['ab_wheel'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 8,
    description: 'Anti-extension core strength for grappling base.',
    videoUrl: 'https://www.youtube.com/results?search_query=ab+wheel+rollout+proper+form+technique+short',
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
    equipmentTypes: ['cable'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 5,
    strengthValue: 7,
    description: 'Anti-rotation core strength essential for grappling.',
    videoUrl: 'https://www.youtube.com/results?search_query=pallof+press+cable+proper+form+technique+short',
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
    equipmentTypes: ['bodyweight'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 5,
    strengthValue: 6,
    measurementType: 'time',
    description: 'Fundamental core stability for all lifting and grappling.',
    videoUrl: 'https://www.youtube.com/results?search_query=plank+exercise+proper+form+technique+short',
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
    equipmentTypes: ['bodyweight'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 5,
    strengthValue: 6,
    measurementType: 'time',
    description: 'Lateral core stability for grappling positions.',
    videoUrl: 'https://www.youtube.com/results?search_query=side+plank+proper+form+technique+short',
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
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps', 'forearms'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['cable'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 7,
    description: 'Controlled back work for thickness and pulling endurance.',
    videoUrl: 'https://www.youtube.com/results?search_query=seated+cable+row+proper+form+technique+short',
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
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['cable'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 7,
    description: 'Lat width builder and pull-up progression.',
    videoUrl: 'https://www.youtube.com/results?search_query=lat+pulldown+proper+form+technique+short',
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
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps', 'core'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['dumbbell', 'bench'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 8,
    description: 'Unilateral back work for balanced development.',
    videoUrl: 'https://www.youtube.com/results?search_query=one+arm+dumbbell+row+proper+form+short',
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
    equipmentTypes: ['dumbbell', 'bench'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 8,
    description: 'Greater ROM than barbell for chest development.',
    videoUrl: 'https://www.youtube.com/results?search_query=dumbbell+bench+press+proper+form+technique+short',
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
    equipmentTypes: ['dumbbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 7,
    description: 'Shoulder strength with natural movement path.',
    videoUrl: 'https://www.youtube.com/results?search_query=dumbbell+shoulder+press+proper+form+short',
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
    equipmentTypes: ['dumbbell', 'bench'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 8,
    description: 'Unilateral leg strength for grappling stance stability.',
    videoUrl: 'https://www.youtube.com/results?search_query=bulgarian+split+squat+proper+form+tutorial+short',
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
    equipmentTypes: ['dumbbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 7,
    description: 'Dynamic leg strength with athletic carryover.',
    videoUrl: 'https://www.youtube.com/results?search_query=walking+lunges+proper+form+technique+short',
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
    equipmentTypes: ['kettlebell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 7,
    description: 'Explosive hip power for takedowns and scrambles.',
    videoUrl: 'https://www.youtube.com/results?search_query=kettlebell+swing+proper+form+technique+short',
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
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 9,
    description: 'Total body explosive power development.',
    videoUrl: 'https://www.youtube.com/results?search_query=power+clean+proper+form+technique+tutorial+short',
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
    equipmentTypes: ['box'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 4,
    strengthValue: 7,
    description: 'Lower body explosiveness for shooting and sprawling.',
    videoUrl: 'https://www.youtube.com/results?search_query=box+jump+proper+form+technique+short',
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
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 5,
    description: 'Trap development for neck protection and aesthetics.',
    videoUrl: 'https://www.youtube.com/results?search_query=barbell+shrug+proper+form+technique+short',
    cues: [
      'Shoulder-width grip',
      'Shrug straight up, not rolling',
      'Hold at top',
      'Control the lower'
    ]
  },

  // ADDITIONAL EXERCISES FOR SUBSTITUTION OPTIONS

  // More chest options
  {
    id: 'cable-crossover',
    name: 'Cable Crossover',
    category: 'isolation',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['shoulders'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['cable'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 4,
    description: 'Excellent chest isolation with constant cable tension.',
    videoUrl: 'https://www.youtube.com/results?search_query=cable+crossover+chest+proper+form+short',
    cues: ['Set cables at shoulder height', 'Step forward for stretch', 'Bring hands together with slight bend in elbows', 'Squeeze chest at peak contraction']
  },
  {
    id: 'push-up',
    name: 'Push-Up',
    category: 'compound',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['shoulders', 'triceps', 'core'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['bodyweight'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 6,
    description: 'Bodyweight pushing fundamental with core engagement.',
    videoUrl: 'https://www.youtube.com/results?search_query=push+up+proper+form+technique+tutorial+short',
    cues: ['Hands just wider than shoulders', 'Body in straight line', 'Lower chest to floor', 'Full lockout at top']
  },
  {
    id: 'landmine-press',
    name: 'Landmine Press',
    category: 'compound',
    primaryMuscles: ['chest', 'shoulders'],
    secondaryMuscles: ['triceps', 'core'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['barbell', 'landmine'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 7,
    description: 'Shoulder-friendly pressing with rotational stability demand.',
    videoUrl: 'https://www.youtube.com/results?search_query=landmine+press+proper+form+technique+short',
    cues: ['Bar in landmine or corner', 'Press with one or both hands', 'Slight lean forward', 'Great for shoulder rehab']
  },

  // More back/lat options
  {
    id: 't-bar-row',
    name: 'T-Bar Row',
    category: 'compound',
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps', 'core', 'forearms'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['barbell', 'landmine'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 9,
    description: 'Heavy rowing variation for back thickness.',
    videoUrl: 'https://www.youtube.com/results?search_query=t+bar+row+proper+form+technique+short',
    cues: ['Straddle the bar', 'Close grip for lat emphasis', 'Pull to chest', 'Keep torso at 45 degrees']
  },
  {
    id: 'meadows-row',
    name: 'Meadows Row',
    category: 'compound',
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps', 'forearms'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['barbell', 'landmine'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 8,
    description: 'Landmine row variation with excellent lat stretch and contraction.',
    videoUrl: 'https://www.youtube.com/results?search_query=meadows+row+landmine+proper+form+short',
    cues: ['Stand perpendicular to landmine', 'Overhand grip on bar end', 'Pull elbow high and back', 'Great lat stretch at bottom']
  },
  {
    id: 'chest-supported-row',
    name: 'Chest-Supported Row',
    category: 'compound',
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['dumbbell', 'bench'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 7,
    description: 'Eliminates momentum for strict back isolation.',
    videoUrl: 'https://www.youtube.com/results?search_query=chest+supported+row+dumbbell+proper+form+short',
    cues: ['Lie face down on incline bench', 'Pull dumbbells to sides', 'Squeeze shoulder blades', 'No momentum allowed']
  },
  {
    id: 'seal-row',
    name: 'Seal Row',
    category: 'compound',
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps', 'forearms'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['dumbbell', 'bench'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 8,
    description: 'Strict rowing from elevated bench, zero momentum.',
    videoUrl: 'https://www.youtube.com/results?search_query=seal+row+proper+form+technique+short',
    cues: ['Lie on elevated flat bench', 'Row from dead stop', 'Full scapular retraction', 'Eliminates all cheating']
  },

  // More shoulder options
  {
    id: 'arnold-press',
    name: 'Arnold Press',
    category: 'compound',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['triceps'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['dumbbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 7,
    description: 'Rotational press for complete deltoid development.',
    videoUrl: 'https://www.youtube.com/results?search_query=arnold+press+dumbbell+proper+form+short',
    cues: ['Start palms facing you', 'Rotate as you press up', 'Full overhead lockout', 'Reverse the rotation on descent']
  },
  {
    id: 'cable-lateral-raise',
    name: 'Cable Lateral Raise',
    category: 'isolation',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['traps'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['cable'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 3,
    description: 'Constant tension lateral raise for superior delt development.',
    videoUrl: 'https://www.youtube.com/results?search_query=cable+lateral+raise+proper+form+technique+short',
    cues: ['Cable at low position', 'Cross-body or same side', 'Raise to shoulder height', 'Slow eccentric for growth']
  },
  {
    id: 'upright-row',
    name: 'Upright Row',
    category: 'compound',
    primaryMuscles: ['shoulders', 'traps'],
    secondaryMuscles: ['biceps'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 6,
    description: 'Trap and delt builder - use wide grip for shoulder safety.',
    videoUrl: 'https://www.youtube.com/results?search_query=upright+row+barbell+proper+form+short',
    cues: ['Wide grip reduces impingement risk', 'Pull to chest level', 'Elbows lead the movement', 'Dont go above shoulder height']
  },

  // More leg options
  {
    id: 'leg-press',
    name: 'Leg Press',
    category: 'compound',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['hamstrings'],
    movementPattern: 'squat',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['machine'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 7,
    description: 'High-volume leg builder without spinal loading.',
    videoUrl: 'https://www.youtube.com/results?search_query=leg+press+machine+proper+form+technique+short',
    cues: ['Feet shoulder width on platform', 'Lower until 90 degree knee bend', 'Press through full foot', 'Dont lock knees completely']
  },
  {
    id: 'hack-squat',
    name: 'Hack Squat',
    category: 'compound',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: ['glutes', 'hamstrings'],
    movementPattern: 'squat',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['machine'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 7,
    description: 'Machine squat for quad-focused development.',
    videoUrl: 'https://www.youtube.com/results?search_query=hack+squat+machine+proper+form+short',
    cues: ['Back flat against pad', 'Feet lower on platform for quad emphasis', 'Full depth', 'Control the negative']
  },
  {
    id: 'step-up',
    name: 'Dumbbell Step-Up',
    category: 'compound',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['hamstrings', 'core'],
    movementPattern: 'squat',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['dumbbell', 'box'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 7,
    description: 'Unilateral leg work mimicking grappling level changes.',
    videoUrl: 'https://www.youtube.com/results?search_query=dumbbell+step+up+proper+form+technique+short',
    cues: ['High box for full ROM', 'Drive through front heel', 'Dont push off back foot', 'Control the descent']
  },
  {
    id: 'nordic-curl',
    name: 'Nordic Hamstring Curl',
    category: 'isolation',
    primaryMuscles: ['hamstrings'],
    secondaryMuscles: [],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['bodyweight'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 8,
    description: 'Gold standard for hamstring injury prevention - eccentric focused.',
    videoUrl: 'https://www.youtube.com/results?search_query=nordic+hamstring+curl+proper+form+tutorial+short',
    cues: ['Kneel with feet anchored', 'Slowly lower body forward', 'Resist with hamstrings', 'Use hands to catch if needed', 'Focus on the slow negative']
  },
  {
    id: 'good-morning',
    name: 'Good Morning',
    category: 'compound',
    primaryMuscles: ['hamstrings', 'back'],
    secondaryMuscles: ['glutes', 'core'],
    movementPattern: 'hinge',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 5,
    strengthValue: 8,
    description: 'Posterior chain builder for hip hinge strength.',
    videoUrl: 'https://www.youtube.com/results?search_query=good+morning+barbell+exercise+proper+form+short',
    cues: ['Bar on upper back like squat', 'Soft knees, hinge at hips', 'Lower until torso near parallel', 'Drive hips forward to stand']
  },
  {
    id: 'glute-bridge',
    name: 'Glute Bridge',
    category: 'isolation',
    primaryMuscles: ['glutes'],
    secondaryMuscles: ['hamstrings'],
    movementPattern: 'hinge',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['bodyweight'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 6,
    description: 'Accessible glute builder, great for bridging in grappling.',
    videoUrl: 'https://www.youtube.com/results?search_query=glute+bridge+proper+form+technique+short',
    cues: ['Lie on back, feet flat', 'Drive hips up', 'Squeeze glutes at top', 'Hold for 2 seconds']
  },

  // More arm options
  {
    id: 'incline-dumbbell-curl',
    name: 'Incline Dumbbell Curl',
    category: 'isolation',
    primaryMuscles: ['biceps'],
    secondaryMuscles: [],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['dumbbell', 'bench'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 4,
    description: 'Stretched position curl for long head bicep emphasis.',
    videoUrl: 'https://www.youtube.com/results?search_query=incline+dumbbell+curl+proper+form+short',
    cues: ['45 degree incline bench', 'Arms hang straight down', 'Curl without moving upper arms', 'Great stretch at bottom']
  },
  {
    id: 'preacher-curl',
    name: 'Preacher Curl',
    category: 'isolation',
    primaryMuscles: ['biceps'],
    secondaryMuscles: [],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['dumbbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 4,
    description: 'Eliminates cheating for strict bicep isolation.',
    videoUrl: 'https://www.youtube.com/results?search_query=preacher+curl+proper+form+technique+short',
    cues: ['Armpits on top of pad', 'Full extension at bottom', 'Squeeze at top', 'Control the eccentric']
  },
  {
    id: 'overhead-tricep-extension',
    name: 'Overhead Tricep Extension',
    category: 'isolation',
    primaryMuscles: ['triceps'],
    secondaryMuscles: [],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['dumbbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 5,
    description: 'Long head tricep emphasis with overhead stretch.',
    videoUrl: 'https://www.youtube.com/results?search_query=overhead+tricep+extension+proper+form+short',
    cues: ['Dumbbell or cable overhead', 'Lower behind head', 'Keep elbows close', 'Full extension at top']
  },
  {
    id: 'close-grip-bench',
    name: 'Close-Grip Bench Press',
    category: 'compound',
    primaryMuscles: ['triceps', 'chest'],
    secondaryMuscles: ['shoulders'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['barbell', 'bench'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 8,
    description: 'Heavy tricep compound for pushing strength.',
    videoUrl: 'https://www.youtube.com/results?search_query=close+grip+bench+press+proper+form+short',
    cues: ['Hands shoulder width apart', 'Elbows tucked close to body', 'Lower to mid chest', 'Full lockout at top']
  },

  // More core options
  {
    id: 'cable-woodchop',
    name: 'Cable Woodchop',
    category: 'grappling_specific',
    primaryMuscles: ['core'],
    secondaryMuscles: ['shoulders'],
    movementPattern: 'rotation',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['cable'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 5,
    strengthValue: 7,
    description: 'Rotational power for throws and guard passes.',
    videoUrl: 'https://www.youtube.com/results?search_query=cable+woodchop+proper+form+technique+short',
    cues: ['Cable high or low', 'Rotate through hips and torso', 'Arms guide, core does the work', 'Control both directions']
  },
  {
    id: 'dead-bug',
    name: 'Dead Bug',
    category: 'isolation',
    primaryMuscles: ['core'],
    secondaryMuscles: [],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['bodyweight'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 5,
    strengthValue: 6,
    description: 'Anti-extension core stability fundamental.',
    videoUrl: 'https://www.youtube.com/results?search_query=dead+bug+exercise+proper+form+technique+short',
    cues: ['Lie on back, arms up, knees at 90', 'Lower opposite arm and leg', 'Keep lower back pressed to floor', 'Slow and controlled']
  },
  {
    id: 'copenhagen-plank',
    name: 'Copenhagen Plank',
    category: 'grappling_specific',
    primaryMuscles: ['core'],
    secondaryMuscles: ['quadriceps'],
    movementPattern: 'rotation',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['bodyweight', 'bench'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 5,
    strengthValue: 7,
    measurementType: 'time',
    description: 'Adductor and lateral core strength for guard play.',
    videoUrl: 'https://www.youtube.com/results?search_query=copenhagen+plank+proper+form+technique+short',
    cues: ['Side plank with top leg on bench', 'Bottom leg hangs free', 'Lift bottom leg to bench', 'Hold or do reps']
  },

  // More grip/forearm options
  {
    id: 'fat-grip-hold',
    name: 'Fat Grip Hold',
    category: 'grip',
    primaryMuscles: ['forearms'],
    secondaryMuscles: [],
    movementPattern: 'carry',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 3,
    strengthValue: 8,
    measurementType: 'time',
    description: 'Thick bar hold for crushing grip - mimics gi grips.',
    videoUrl: 'https://www.youtube.com/results?search_query=fat+grip+hold+training+technique+short',
    cues: ['Attach fat grips to barbell or dumbbell', 'Hold at lockout', 'Squeeze as hard as possible', 'Build up hold time']
  },
  {
    id: 'finger-curl',
    name: 'Barbell Finger Curl',
    category: 'grip',
    primaryMuscles: ['forearms'],
    secondaryMuscles: [],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 3,
    strengthValue: 6,
    description: 'Isolated finger flexor work for grip endurance.',
    videoUrl: 'https://www.youtube.com/results?search_query=barbell+finger+curl+grip+training+short',
    cues: ['Sit with forearms on thighs', 'Let bar roll to fingertips', 'Curl back into palm', 'High reps for endurance']
  },

  // More power/explosive options
  {
    id: 'hang-clean',
    name: 'Hang Clean',
    category: 'power',
    primaryMuscles: ['full_body'],
    secondaryMuscles: ['quadriceps', 'glutes', 'traps', 'shoulders'],
    movementPattern: 'explosive',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 5,
    strengthValue: 9,
    description: 'Explosive hip power from hang position - simpler than full clean.',
    videoUrl: 'https://www.youtube.com/results?search_query=hang+clean+proper+form+technique+tutorial+short',
    cues: ['Start at mid-thigh', 'Explosive hip extension', 'Shrug and pull under', 'Catch in front rack']
  },
  {
    id: 'jump-squat',
    name: 'Jump Squat',
    category: 'power',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['calves', 'core'],
    movementPattern: 'explosive',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['bodyweight'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 4,
    strengthValue: 7,
    description: 'Explosive lower body power for takedown entries.',
    videoUrl: 'https://www.youtube.com/results?search_query=jump+squat+proper+form+technique+short',
    cues: ['Bodyweight or light load', 'Quarter to half squat depth', 'Explode upward maximally', 'Land soft, reset between reps']
  },
  {
    id: 'battle-ropes',
    name: 'Battle Ropes',
    category: 'grappling_specific',
    primaryMuscles: ['shoulders', 'core'],
    secondaryMuscles: ['forearms', 'back'],
    movementPattern: 'explosive',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['battle_ropes'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 5,
    strengthValue: 6,
    description: 'Conditioning and grip endurance for grappling cardio.',
    videoUrl: 'https://www.youtube.com/results?search_query=battle+ropes+exercise+proper+form+technique+short',
    cues: ['Alternating waves or slams', 'Drive from hips', 'Keep core tight', 'Maintain intensity for intervals']
  },

  // ======================================================================
  // EXPANDED EXERCISE DATABASE - RP Strength-style & Science-Based Variations
  // ======================================================================

  // SQUAT VARIATIONS
  {
    id: 'deficit-squat',
    name: 'Deficit Squat',
    category: 'compound',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['hamstrings', 'core', 'back'],
    movementPattern: 'squat',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 9,
    description: 'Standing on a plate or platform increases ROM and time under tension. Builds deep squat strength critical for wrestling level changes and guard recovery.',
    videoUrl: 'https://www.youtube.com/results?search_query=deficit+squat+barbell+proper+form+technique+short',
    cues: [
      'Stand on 1-2 inch plate or platform',
      'Same setup as back squat',
      'Increased depth demands more ankle and hip mobility',
      'Drive through mid-foot, maintain upright torso',
      'Start lighter than your normal squat'
    ]
  },
  {
    id: 'pause-squat',
    name: 'Pause Squat',
    category: 'compound',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['hamstrings', 'core', 'back'],
    movementPattern: 'squat',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 10,
    description: 'Eliminating the stretch reflex builds raw strength out of the hole. RP Strength staple for hypertrophy due to increased time under tension.',
    videoUrl: 'https://www.youtube.com/results?search_query=pause+squat+barbell+proper+form+technique+short',
    cues: [
      '2-3 second pause at the bottom',
      'Stay tight during the pause - no relaxing',
      'Maintain brace and upper back tightness',
      'Explode out of the hole after the pause',
      'Use 70-80% of normal squat weight'
    ]
  },
  {
    id: 'pin-squat',
    name: 'Pin Squat',
    category: 'compound',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['hamstrings', 'core', 'back'],
    movementPattern: 'squat',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 10,
    description: 'Squat from a dead stop on safety pins. Eliminates stretch reflex entirely and builds concentric-only strength for explosive takedown entries.',
    videoUrl: 'https://www.youtube.com/results?search_query=pin+squat+anderson+squat+proper+form+technique+short',
    cues: [
      'Set safety pins at desired depth',
      'Start from the bottom position on pins',
      'Reset fully between each rep',
      'Drive explosively from dead stop',
      'Great for overcoming sticking points'
    ]
  },
  {
    id: 'belt-squat',
    name: 'Belt Squat',
    category: 'compound',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['hamstrings', 'core'],
    movementPattern: 'squat',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['machine'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 8,
    description: 'Loads the legs without spinal compression. RP Strength favorite for accumulating quad volume without fatiguing the back - ideal when grappling is taxing your spine.',
    videoUrl: 'https://www.youtube.com/results?search_query=belt+squat+machine+proper+form+technique+short',
    cues: [
      'Attach belt around hips to weight',
      'Stand on elevated platforms',
      'Squat with upright torso',
      'Zero spinal loading',
      'Can go very high volume safely'
    ]
  },
  {
    id: 'safety-bar-squat',
    name: 'Safety Bar Squat',
    category: 'compound',
    primaryMuscles: ['quadriceps', 'glutes', 'back'],
    secondaryMuscles: ['hamstrings', 'core'],
    movementPattern: 'squat',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 9,
    description: 'The cambered bar shifts load forward, hammering upper back and quads simultaneously. Shoulder-friendly alternative when grappling beats up your shoulders.',
    videoUrl: 'https://www.youtube.com/results?search_query=safety+squat+bar+proper+form+technique+short',
    cues: [
      'Handles in front, pads on shoulders',
      'Fight to stay upright - bar wants to fold you',
      'Builds tremendous upper back strength',
      'Easier on shoulders and wrists than straight bar',
      'Expect to use 85-90% of back squat weight'
    ]
  },
  {
    id: 'sissy-squat',
    name: 'Sissy Squat',
    category: 'isolation',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: ['core'],
    movementPattern: 'squat',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['bodyweight'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 5,
    description: 'Extreme quad isolation through knee flexion with hip extension. Science shows this targets the rectus femoris uniquely. Brutal quad pump.',
    videoUrl: 'https://www.youtube.com/results?search_query=sissy+squat+proper+form+technique+short',
    cues: [
      'Hold onto something for balance',
      'Lean back, push knees forward',
      'Heels come up, deep knee flexion',
      'Feel the extreme quad stretch',
      'Start bodyweight only - this is harder than it looks'
    ]
  },
  {
    id: 'zercher-squat',
    name: 'Zercher Squat',
    category: 'compound',
    primaryMuscles: ['quadriceps', 'glutes', 'core'],
    secondaryMuscles: ['biceps', 'back', 'forearms'],
    movementPattern: 'squat',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 9,
    description: 'Bar held in the crook of the elbows mimics grappling clinch positions. Builds incredible core bracing and front-loaded squat strength for takedowns.',
    videoUrl: 'https://www.youtube.com/results?search_query=zercher+squat+proper+form+technique+short',
    cues: [
      'Bar in crook of elbows, arms squeezed tight',
      'Keep elbows close to body',
      'Squat deep with upright torso',
      'Use a pad or towel on bar for comfort',
      'Directly transfers to grappling clinch strength'
    ]
  },

  // DEADLIFT VARIATIONS
  {
    id: 'deficit-deadlift',
    name: 'Deficit Deadlift',
    category: 'compound',
    primaryMuscles: ['back', 'glutes', 'hamstrings'],
    secondaryMuscles: ['core', 'forearms', 'quadriceps'],
    movementPattern: 'hinge',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 10,
    description: 'Standing on a platform increases ROM off the floor. Builds explosive pulling power from disadvantaged positions - like pulling an opponent from the mat.',
    videoUrl: 'https://www.youtube.com/results?search_query=deficit+deadlift+proper+form+technique+short',
    cues: [
      'Stand on 1-3 inch platform',
      'Same setup as conventional deadlift',
      'Requires more quad drive off the floor',
      'Keep back flat despite greater ROM',
      'Use 80-85% of normal deadlift weight'
    ]
  },
  {
    id: 'pause-deadlift',
    name: 'Pause Deadlift',
    category: 'compound',
    primaryMuscles: ['back', 'glutes', 'hamstrings'],
    secondaryMuscles: ['core', 'forearms', 'quadriceps'],
    movementPattern: 'hinge',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 10,
    description: 'Pausing below the knee builds positional strength and reinforces perfect technique. Exposes and fixes any weakness in your pull.',
    videoUrl: 'https://www.youtube.com/results?search_query=pause+deadlift+proper+form+technique+short',
    cues: [
      '2-3 second pause just below the knee',
      'Maintain perfect back position during pause',
      'Stay tight - no relaxing at pause point',
      'Continue pull smoothly after pause',
      'Use 70-80% of normal deadlift weight'
    ]
  },
  {
    id: 'block-pull',
    name: 'Block Pull',
    category: 'compound',
    primaryMuscles: ['back', 'glutes', 'traps'],
    secondaryMuscles: ['hamstrings', 'core', 'forearms'],
    movementPattern: 'hinge',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 9,
    description: 'Deadlift from elevated blocks targets lockout strength and allows supramaximal loading. Builds tremendous trap and upper back thickness.',
    videoUrl: 'https://www.youtube.com/results?search_query=block+pull+deadlift+proper+form+technique+short',
    cues: [
      'Set bar on blocks at knee height or just below',
      'Same setup as deadlift from that position',
      'Focus on explosive hip drive through lockout',
      'Can handle more weight than full deadlift',
      'Great for grip training with heavy loads'
    ]
  },
  {
    id: 'snatch-grip-deadlift',
    name: 'Snatch-Grip Deadlift',
    category: 'compound',
    primaryMuscles: ['back', 'glutes', 'hamstrings', 'traps'],
    secondaryMuscles: ['core', 'forearms', 'quadriceps'],
    movementPattern: 'hinge',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 9,
    description: 'Wide grip increases ROM and upper back demand massively. Science shows superior trap and upper back activation compared to conventional. Builds the yoke.',
    videoUrl: 'https://www.youtube.com/results?search_query=snatch+grip+deadlift+proper+form+technique+short',
    cues: [
      'Grip as wide as a snatch - index fingers near the rings',
      'Lower hips more than conventional',
      'Increased upper back and trap demand',
      'Use straps if grip limits you',
      'Expect to use 70-80% of conventional deadlift'
    ]
  },
  {
    id: 'jefferson-deadlift',
    name: 'Jefferson Deadlift',
    category: 'compound',
    primaryMuscles: ['quadriceps', 'glutes', 'hamstrings'],
    secondaryMuscles: ['core', 'back', 'forearms'],
    movementPattern: 'hinge',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 5,
    strengthValue: 8,
    description: 'Straddle stance deadlift with anti-rotation demand. Builds rotational stability and asymmetric strength - highly functional for grappling scrambles.',
    videoUrl: 'https://www.youtube.com/results?search_query=jefferson+deadlift+proper+form+technique+short',
    cues: [
      'Straddle the bar with one foot forward, one back',
      'Mixed grip - one hand in front, one behind',
      'Drive up while resisting rotation',
      'Alternate lead leg each set',
      'Excellent anti-rotation core training'
    ]
  },
  {
    id: 'trap-bar-deadlift',
    name: 'Trap Bar Deadlift',
    category: 'compound',
    primaryMuscles: ['quadriceps', 'glutes', 'back'],
    secondaryMuscles: ['hamstrings', 'core', 'forearms', 'traps'],
    movementPattern: 'hinge',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['trap_bar'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 9,
    description: 'Neutral handles and centered load reduce shear on the spine. Research shows comparable muscle activation to conventional with lower injury risk. Perfect for grapplers.',
    videoUrl: 'https://www.youtube.com/results?search_query=trap+bar+deadlift+hex+bar+proper+form+technique+short',
    cues: [
      'Stand in center of trap bar',
      'Grip neutral handles',
      'Drive through the floor like a leg press',
      'Hips and shoulders rise together',
      'More quad-dominant than conventional'
    ]
  },

  // BENCH PRESS VARIATIONS
  {
    id: 'floor-press',
    name: 'Floor Press',
    category: 'compound',
    primaryMuscles: ['chest', 'triceps'],
    secondaryMuscles: ['shoulders'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 8,
    description: 'Pressing from the floor limits ROM to build lockout strength and tricep power. Shoulder-friendly pressing when bench aggravates shoulders from grappling.',
    videoUrl: 'https://www.youtube.com/results?search_query=floor+press+barbell+proper+form+technique+short',
    cues: [
      'Lie on floor, knees bent or legs straight',
      'Upper arms touch floor each rep',
      'Pause briefly on the floor - no bounce',
      'Press to full lockout',
      'Eliminates leg drive - pure upper body'
    ]
  },
  {
    id: 'spoto-press',
    name: 'Spoto Press',
    category: 'compound',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'shoulders'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['barbell', 'bench'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 9,
    description: 'Pausing 1-2 inches off the chest builds tremendous pec tension and strength off the chest. Named after Eric Spoto. RP Strength recommends this for hypertrophy.',
    videoUrl: 'https://www.youtube.com/results?search_query=spoto+press+bench+press+variation+proper+form+short',
    cues: [
      'Lower bar to 1-2 inches above chest',
      'Hold the pause - bar does not touch chest',
      'Maintain full tension throughout',
      '2-3 second pause in the hover position',
      'Press explosively after the pause'
    ]
  },
  {
    id: 'larsen-press',
    name: 'Larsen Press',
    category: 'compound',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'shoulders', 'core'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['barbell', 'bench'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 8,
    description: 'Bench press with feet elevated off the floor. Eliminates leg drive and forces pure pressing strength with increased core demand.',
    videoUrl: 'https://www.youtube.com/results?search_query=larsen+press+feet+up+bench+press+proper+form+short',
    cues: [
      'Set up like normal bench but lift feet off floor',
      'Legs straight out or slightly bent in air',
      'Maintain scapular retraction without leg drive',
      'Builds honest pressing strength',
      'Use 80-85% of normal bench weight'
    ]
  },
  {
    id: 'board-press',
    name: 'Board Press',
    category: 'compound',
    primaryMuscles: ['triceps', 'chest'],
    secondaryMuscles: ['shoulders'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['barbell', 'bench'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 9,
    description: 'Reducing ROM with boards on the chest allows overloading the lockout. Builds tricep strength and lockout power for bench press PRs.',
    videoUrl: 'https://www.youtube.com/results?search_query=board+press+bench+press+variation+proper+form+short',
    cues: [
      'Place 2-3 boards on chest (or use Slingshot)',
      'Lower bar to boards, pause',
      'Press to lockout',
      'Can handle 105-110% of full bench',
      'Great for building lockout confidence'
    ]
  },
  {
    id: 'db-floor-press',
    name: 'Dumbbell Floor Press',
    category: 'compound',
    primaryMuscles: ['chest', 'triceps'],
    secondaryMuscles: ['shoulders'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['dumbbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 7,
    description: 'Dumbbell pressing from the floor. Combines the joint-friendly floor press with the freedom of dumbbells. Excellent for home gym grapplers.',
    videoUrl: 'https://www.youtube.com/results?search_query=dumbbell+floor+press+proper+form+technique+short',
    cues: [
      'Lie on floor with dumbbells',
      'Upper arms touch floor each rep with brief pause',
      'Neutral or pronated grip both work',
      'Great shoulder-friendly pressing option',
      'No bench required'
    ]
  },

  // ROW VARIATIONS
  {
    id: 'helms-row',
    name: 'Helms Row',
    category: 'compound',
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps', 'forearms'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['dumbbell', 'bench'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 7,
    description: 'Chest-supported dumbbell row on an incline bench at 30-45 degrees. Dr. Eric Helms\' preferred row - eliminates cheating while allowing heavier loads than strict rows.',
    videoUrl: 'https://www.youtube.com/results?search_query=helms+row+incline+chest+supported+row+proper+form+short',
    cues: [
      'Incline bench at 30-45 degrees',
      'Chest against pad, feet on floor',
      'Row dumbbells to hips',
      'Full scapular retraction at top',
      'Let arms fully extend at bottom for stretch'
    ]
  },

  // SHOULDER VARIATIONS
  {
    id: 'lu-raises',
    name: 'Lu Raises',
    category: 'isolation',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['traps'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['dumbbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 4,
    description: 'Named after Lu Xiaojun. Front raise transitioning to lateral raise in one movement. Hits all delt heads for complete shoulder development. Science-backed for medial delt growth.',
    videoUrl: 'https://www.youtube.com/results?search_query=lu+raises+shoulder+exercise+proper+form+technique+short',
    cues: [
      'Light dumbbells - 2-7 kg / 5-15 lbs typically',
      'Front raise to shoulder height',
      'Rotate arms out to lateral raise position',
      'Lower from lateral position',
      'Reverse the movement for next rep'
    ]
  },
  {
    id: 'behind-neck-press',
    name: 'Behind-the-Neck Press',
    category: 'compound',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['triceps', 'traps'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: false,
    aestheticValue: 8,
    strengthValue: 8,
    description: 'Presses behind the neck target the lateral and rear delts more than front pressing. Requires good shoulder mobility. Use moderate weight with strict form.',
    videoUrl: 'https://www.youtube.com/results?search_query=behind+the+neck+press+proper+form+safe+technique+short',
    cues: [
      'Only perform if you have healthy shoulders',
      'Bar descends to upper trap level - not too low',
      'Wide grip, elbows under the bar',
      'Press straight up to lockout',
      'Seated is safer than standing for this variation'
    ]
  },
  {
    id: 'prone-y-raise',
    name: 'Prone Y Raise',
    category: 'isolation',
    primaryMuscles: ['shoulders', 'traps'],
    secondaryMuscles: ['back'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['dumbbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 5,
    strengthValue: 4,
    description: 'Lying face down and raising arms in a Y-pattern. Research shows excellent lower trap and rotator cuff activation. Essential for shoulder health in grapplers.',
    videoUrl: 'https://www.youtube.com/results?search_query=prone+Y+raise+exercise+proper+form+technique+short',
    cues: [
      'Lie face down on bench or floor',
      'Arms form a Y-shape - thumbs up',
      'Raise arms as high as possible',
      'Squeeze lower traps at the top',
      'Very light weight or bodyweight only'
    ]
  },
  {
    id: 'z-press',
    name: 'Z-Press',
    category: 'compound',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['triceps', 'core'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 8,
    description: 'Seated on the floor with legs extended removes all lower body assistance. Demands extreme core stability and strict pressing strength. Brutal but effective.',
    videoUrl: 'https://www.youtube.com/results?search_query=z+press+seated+floor+overhead+press+proper+form+short',
    cues: [
      'Sit on floor with legs straight out',
      'Unrack bar from pins at shoulder height',
      'Press overhead with zero leg drive',
      'Core must stabilize entire movement',
      'Expect to use 60-70% of standing OHP'
    ]
  },

  // ARM VARIATIONS
  {
    id: 'bayesian-curl',
    name: 'Bayesian Cable Curl',
    category: 'isolation',
    primaryMuscles: ['biceps'],
    secondaryMuscles: [],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['cable'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 4,
    description: 'Cable curl from behind the body with shoulder in extension. Research shows this maximally loads the long head bicep in the stretched position - the key driver of hypertrophy.',
    videoUrl: 'https://www.youtube.com/results?search_query=bayesian+cable+curl+proper+form+technique+short',
    cues: [
      'Cable set low, face away from machine',
      'Arm starts behind your body',
      'Curl forward with elbow pinned',
      'Maximum stretch on the long head',
      'The stretch is where the growth happens'
    ]
  },
  {
    id: 'jm-press',
    name: 'JM Press',
    category: 'compound',
    primaryMuscles: ['triceps'],
    secondaryMuscles: ['chest', 'shoulders'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['barbell', 'bench'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 8,
    description: 'Hybrid between close-grip bench and skull crusher. Named after JM Blakley. Allows heavy tricep loading with a compound movement pattern. Powerlifter secret weapon.',
    videoUrl: 'https://www.youtube.com/results?search_query=jm+press+tricep+exercise+proper+form+technique+short',
    cues: [
      'Close grip on bar, set up like bench press',
      'Lower bar toward chin/upper chest area',
      'Elbows drift forward as you lower',
      'Combines pressing and extension patterns',
      'Keep the movement controlled - this is technical'
    ]
  },
  {
    id: 'spider-curl',
    name: 'Spider Curl',
    category: 'isolation',
    primaryMuscles: ['biceps'],
    secondaryMuscles: [],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['dumbbell', 'bench'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 3,
    description: 'Curling face down on an incline bench. Research shows peak contraction emphasis. RP Strength uses this as a shortened-position bicep exercise for complete development.',
    videoUrl: 'https://www.youtube.com/results?search_query=spider+curl+incline+bench+proper+form+technique+short',
    cues: [
      'Lie chest-down on incline bench',
      'Arms hang straight down',
      'Curl with strict form - no swing possible',
      'Peak contraction at the top',
      'Pairs perfectly with incline curls for full ROM coverage'
    ]
  },

  // LEG VARIATIONS
  {
    id: 'single-leg-hip-thrust',
    name: 'Single-Leg Hip Thrust',
    category: 'compound',
    primaryMuscles: ['glutes'],
    secondaryMuscles: ['hamstrings', 'core'],
    movementPattern: 'hinge',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['bodyweight', 'bench'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 7,
    description: 'Unilateral hip thrust for addressing imbalances. Directly transfers to single-leg bridging escapes in grappling.',
    videoUrl: 'https://www.youtube.com/results?search_query=single+leg+hip+thrust+proper+form+technique+short',
    cues: [
      'Upper back on bench, one foot planted',
      'Other leg elevated or held up',
      'Drive through planted heel',
      'Full hip extension at top',
      'Control the eccentric - no dropping'
    ]
  },
  {
    id: 'reverse-nordic',
    name: 'Reverse Nordic Curl',
    category: 'isolation',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: ['core'],
    movementPattern: 'squat',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['bodyweight'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 6,
    description: 'The quad equivalent of the Nordic curl. Lengthened-position quad training shown in research to produce superior hypertrophy. Essential for bulletproofing knees.',
    videoUrl: 'https://www.youtube.com/results?search_query=reverse+nordic+curl+proper+form+technique+short',
    cues: [
      'Kneel on pad, upright torso',
      'Lean back slowly from the knees',
      'Keep hips extended - dont sit back',
      'Go as far as you can control',
      'Use hands behind you for assistance initially'
    ]
  },
  {
    id: 'spanish-squat',
    name: 'Spanish Squat',
    category: 'isolation',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: ['glutes'],
    movementPattern: 'squat',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['resistance_band'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 5,
    description: 'Band behind the knees allows you to sit back while loading the quads. Physical therapy gold for patellar tendon health. Perfect for grapplers with knee issues.',
    videoUrl: 'https://www.youtube.com/results?search_query=spanish+squat+band+knee+rehab+exercise+proper+form+short',
    cues: [
      'Loop band behind knees, anchored in front',
      'Sit back into the band',
      'Torso stays upright',
      'Deep knee flexion with zero knee pain',
      'Excellent for patellar tendinopathy rehab and prevention'
    ]
  },
  {
    id: 'single-leg-rdl',
    name: 'Single-Leg Romanian Deadlift',
    category: 'compound',
    primaryMuscles: ['hamstrings', 'glutes'],
    secondaryMuscles: ['core', 'back'],
    movementPattern: 'hinge',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['dumbbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 7,
    description: 'Unilateral hinge pattern building balance and proprioception. Research shows excellent hamstring activation with added stability demands. Critical for single-leg grappling positions.',
    videoUrl: 'https://www.youtube.com/results?search_query=single+leg+romanian+deadlift+proper+form+technique+short',
    cues: [
      'Stand on one leg with slight knee bend',
      'Hinge forward, free leg goes back',
      'Keep hips square - dont open up',
      'Dumbbell or kettlebell in opposite hand',
      'Squeeze glute to stand up'
    ]
  },
  {
    id: 'seated-leg-curl',
    name: 'Seated Leg Curl',
    category: 'isolation',
    primaryMuscles: ['hamstrings'],
    secondaryMuscles: [],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['machine'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 5,
    description: 'Research shows seated position puts hamstrings in a more lengthened position than lying, producing superior hypertrophy. RP Strength standard for hamstring growth.',
    videoUrl: 'https://www.youtube.com/results?search_query=seated+leg+curl+machine+proper+form+technique+short',
    cues: [
      'Adjust pad to sit above ankles',
      'Start with legs extended',
      'Curl heels under the seat',
      'Slow eccentric is crucial',
      'More stretch than lying leg curl'
    ]
  },

  // GRAPPLING-SPECIFIC: NECK WORK
  {
    id: 'neck-curl',
    name: 'Neck Curl (Flexion)',
    category: 'grappling_specific',
    primaryMuscles: ['core'],
    secondaryMuscles: [],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['bodyweight'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 4,
    strengthValue: 7,
    description: 'Neck flexion training is non-negotiable for grapplers. Builds resistance to guillotines and neck cranks. Start with bodyweight and progress slowly.',
    videoUrl: 'https://www.youtube.com/results?search_query=neck+curl+flexion+exercise+proper+form+technique+short',
    cues: [
      'Lie face up on bench, head hanging off edge',
      'Light plate on forehead with towel',
      'Curl chin toward chest',
      'Slow and controlled - never jerk',
      'Start VERY light - neck is sensitive',
      'Build up volume gradually over weeks'
    ]
  },
  {
    id: 'neck-extension',
    name: 'Neck Extension',
    category: 'grappling_specific',
    primaryMuscles: ['traps'],
    secondaryMuscles: [],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['bodyweight'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 5,
    strengthValue: 7,
    description: 'Posterior neck strength for resisting front headlocks and can openers. Builds the thick neck that protects against chokes and cranks in grappling.',
    videoUrl: 'https://www.youtube.com/results?search_query=neck+extension+exercise+proper+form+technique+short',
    cues: [
      'Lie face down on bench, head off edge',
      'Light plate on back of head with towel',
      'Extend head upward',
      'Controlled tempo throughout',
      'Can also use neck harness for progressive loading',
      'Start very light - 1-2.5 kg / 2.5-5 lbs'
    ]
  },
  {
    id: 'neck-lateral-flexion',
    name: 'Neck Lateral Flexion',
    category: 'grappling_specific',
    primaryMuscles: ['traps'],
    secondaryMuscles: [],
    movementPattern: 'rotation',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['bodyweight'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 4,
    strengthValue: 6,
    description: 'Side-to-side neck strength for resisting lateral neck cranks and maintaining head position in scrambles. Complete neck training requires all planes of movement.',
    videoUrl: 'https://www.youtube.com/results?search_query=neck+lateral+flexion+exercise+proper+form+short',
    cues: [
      'Lie on side, head off bench edge',
      'Light plate on side of head',
      'Flex neck sideways toward ceiling',
      'Train both sides equally',
      'Very light weight - focus on control'
    ]
  },

  // GRIP WORK VARIATIONS
  {
    id: 'gripper-crush',
    name: 'Hand Gripper',
    category: 'grip',
    primaryMuscles: ['forearms'],
    secondaryMuscles: [],
    movementPattern: 'carry',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['bodyweight'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 3,
    strengthValue: 7,
    description: 'Progressive crush grip training with calibrated hand grippers. Directly translates to gi gripping and no-gi wrist control.',
    videoUrl: 'https://www.youtube.com/results?search_query=hand+gripper+captains+of+crush+proper+technique+short',
    cues: [
      'Set gripper deep in the hand',
      'Squeeze to full close',
      'Hold the close for 1-2 seconds',
      'Controlled open',
      'Progress through gripper ratings over time'
    ]
  },
  {
    id: 'wrist-curl',
    name: 'Barbell Wrist Curl',
    category: 'grip',
    primaryMuscles: ['forearms'],
    secondaryMuscles: [],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['dumbbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 4,
    strengthValue: 5,
    description: 'Wrist flexor training for grip endurance and forearm size. Builds the muscles used in every grip, pull, and hold in grappling.',
    videoUrl: 'https://www.youtube.com/results?search_query=barbell+wrist+curl+proper+form+technique+short',
    cues: [
      'Forearms on thighs, wrists over knees',
      'Palms facing up',
      'Curl the barbell up with wrists only',
      'Full ROM - let bar roll to fingertips then curl back',
      'High reps for forearm pump'
    ]
  },
  {
    id: 'reverse-wrist-curl',
    name: 'Reverse Wrist Curl',
    category: 'grip',
    primaryMuscles: ['forearms'],
    secondaryMuscles: [],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['dumbbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 4,
    strengthValue: 5,
    description: 'Wrist extensor training for balanced forearm development. Prevents tennis elbow and wrist injuries common in grapplers.',
    videoUrl: 'https://www.youtube.com/results?search_query=reverse+wrist+curl+proper+form+technique+short',
    cues: [
      'Forearms on thighs, palms facing down',
      'Extend wrists upward',
      'Light weight, high reps',
      'Essential for elbow health and injury prevention',
      'Balance with regular wrist curls'
    ]
  },

  // MORE SCIENCE-BASED VARIATIONS
  {
    id: 'cable-overhead-tricep-extension',
    name: 'Cable Overhead Tricep Extension',
    category: 'isolation',
    primaryMuscles: ['triceps'],
    secondaryMuscles: [],
    movementPattern: 'push',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['cable'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 5,
    description: 'Overhead cable extension with constant tension. Research shows the long head of the triceps is best trained in the stretched overhead position. RP Strength prioritizes this.',
    videoUrl: 'https://www.youtube.com/results?search_query=cable+overhead+tricep+extension+proper+form+technique+short',
    cues: [
      'Cable set low, face away from machine',
      'Arms overhead, extend at the elbows',
      'Feel the deep stretch on the long head',
      'Keep upper arms by your ears',
      'Constant cable tension through full ROM'
    ]
  },
  {
    id: 'reverse-grip-bench',
    name: 'Reverse-Grip Bench Press',
    category: 'compound',
    primaryMuscles: ['chest', 'triceps'],
    secondaryMuscles: ['shoulders'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['barbell', 'bench'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 7,
    description: 'Supinated grip bench press shown in EMG studies to activate upper chest significantly more than incline bench. Unique stimulus for plateau-busting.',
    videoUrl: 'https://www.youtube.com/results?search_query=reverse+grip+bench+press+proper+form+technique+short',
    cues: [
      'Supinated (underhand) grip on barbell',
      'Use a spotter for unracking',
      'Elbows naturally tuck close to body',
      'Lower to lower chest',
      'Press back to lockout',
      'Start very light to learn the groove'
    ]
  },
  {
    id: 'cable-fly',
    name: 'Cable Fly',
    category: 'isolation',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['shoulders'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['cable'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 4,
    description: 'Unlike dumbbell flies, cables maintain tension at peak contraction. Research supports cable flies for chest hypertrophy due to the resistance profile matching the strength curve.',
    videoUrl: 'https://www.youtube.com/results?search_query=cable+fly+chest+exercise+proper+form+technique+short',
    cues: [
      'Cables set at various heights for different angles',
      'Slight bend in elbows throughout',
      'Bring hands together with a hugging motion',
      'Squeeze chest hard at peak contraction',
      'Control the stretch on the way back'
    ]
  },
  {
    id: 'dumbbell-pullover',
    name: 'Dumbbell Pullover',
    category: 'compound',
    primaryMuscles: ['back', 'chest'],
    secondaryMuscles: ['triceps', 'core'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['dumbbell', 'bench'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 6,
    description: 'Trains both lats and chest in the stretched position. Research shows excellent long head tricep and serratus activation. Old school exercise making a science-backed comeback.',
    videoUrl: 'https://www.youtube.com/results?search_query=dumbbell+pullover+proper+form+technique+short',
    cues: [
      'Lie across a bench, hips lower than shoulders',
      'Hold one dumbbell overhead with both hands',
      'Lower behind head with slight elbow bend',
      'Feel the deep lat and chest stretch',
      'Pull back to starting position with lats'
    ]
  },
  {
    id: 'reverse-pec-deck',
    name: 'Reverse Pec Deck',
    category: 'isolation',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['back', 'traps'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['machine'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 4,
    description: 'Machine rear delt isolation with consistent resistance. RP Strength rates machine rear delt work as the most effective for rear delt growth due to the stability it provides.',
    videoUrl: 'https://www.youtube.com/results?search_query=reverse+pec+deck+rear+delt+machine+proper+form+short',
    cues: [
      'Face the machine, chest against pad',
      'Handles at shoulder height',
      'Open arms wide, squeeze rear delts',
      'Slight pause at full contraction',
      'Control the return - dont let weights slam'
    ]
  },
  {
    id: 'hip-adductor-machine',
    name: 'Hip Adductor Machine',
    category: 'isolation',
    primaryMuscles: ['glutes'],
    secondaryMuscles: [],
    movementPattern: 'squat',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['machine'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 5,
    strengthValue: 5,
    description: 'Adductor strength is critical for closed guard, triangles, and inside control in grappling. Often neglected but research shows it reduces groin injury risk significantly.',
    videoUrl: 'https://www.youtube.com/results?search_query=hip+adductor+machine+proper+form+technique+short',
    cues: [
      'Sit in machine, pads on inner thighs',
      'Squeeze legs together',
      'Hold peak contraction briefly',
      'Control the stretch on the way back',
      'Direct transfer to closed guard strength'
    ]
  },
  {
    id: 'hip-abductor-machine',
    name: 'Hip Abductor Machine',
    category: 'isolation',
    primaryMuscles: ['glutes'],
    secondaryMuscles: [],
    movementPattern: 'squat',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['machine'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 5,
    description: 'Gluteus medius training for hip stability and lateral movement. Research shows strong abductors prevent knee valgus in squats and reduce ACL injury risk.',
    videoUrl: 'https://www.youtube.com/results?search_query=hip+abductor+machine+proper+form+technique+short',
    cues: [
      'Sit in machine, pads on outer thighs',
      'Push legs apart against resistance',
      'Hold at full abduction',
      'Lean forward slightly for more glute med activation',
      'Higher reps work well - 15-20'
    ]
  },
  {
    id: 'cross-body-hammer-curl',
    name: 'Cross-Body Hammer Curl',
    category: 'isolation',
    primaryMuscles: ['biceps', 'forearms'],
    secondaryMuscles: [],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['dumbbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 4,
    description: 'Curling across the body targets the brachialis and brachioradialis more than standard hammer curls. Builds the thickness of the outer arm that makes arms look big.',
    videoUrl: 'https://www.youtube.com/results?search_query=cross+body+hammer+curl+proper+form+technique+short',
    cues: [
      'Neutral grip, curl across your body toward opposite shoulder',
      'Keep elbow pinned at side',
      'Squeeze at the top across your chest',
      'Alternate arms',
      'Great for forearm development'
    ]
  },
  {
    id: 'kettlebell-bottoms-up-press',
    name: 'Kettlebell Bottoms-Up Press',
    category: 'grappling_specific',
    primaryMuscles: ['shoulders', 'forearms'],
    secondaryMuscles: ['core', 'triceps'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['kettlebell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 5,
    strengthValue: 7,
    description: 'Pressing a kettlebell upside down demands extreme grip and shoulder stabilizer activation. Builds the reflexive stability grapplers need for controlling opponents.',
    videoUrl: 'https://www.youtube.com/results?search_query=kettlebell+bottoms+up+press+proper+form+technique+short',
    cues: [
      'Hold KB upside down at shoulder height',
      'Crush the handle - grip creates stability',
      'Press straight up with control',
      'Core braced, no lean',
      'Start very light - this is humbling'
    ]
  },

  // ─── ADDITIONAL DEADLIFT VARIATIONS ───
  {
    id: 'stiff-leg-deadlift',
    name: 'Stiff-Leg Deadlift',
    category: 'compound',
    primaryMuscles: ['hamstrings', 'glutes'],
    secondaryMuscles: ['back', 'core'],
    movementPattern: 'hinge',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 7,
    description: 'Straighter leg variation than the RDL. Maximal hamstring stretch under load — builds the posterior chain length grapplers need for guard retention and hip flexibility.',
    videoUrl: 'https://www.youtube.com/results?search_query=stiff+leg+deadlift+proper+form+short',
    cues: [
      'Slight knee bend, kept constant throughout',
      'Hinge at hips, push butt back',
      'Bar stays close to legs',
      'Feel deep hamstring stretch at bottom',
      'Squeeze glutes to lockout'
    ]
  },
  {
    id: 'dumbbell-romanian-deadlift',
    name: 'Dumbbell Romanian Deadlift',
    category: 'compound',
    primaryMuscles: ['hamstrings', 'glutes'],
    secondaryMuscles: ['back', 'core', 'forearms'],
    movementPattern: 'hinge',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['dumbbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 6,
    description: 'Dumbbell version allows greater range of motion and unilateral loading. Excellent for addressing side-to-side imbalances common in grapplers.',
    videoUrl: 'https://www.youtube.com/results?search_query=dumbbell+romanian+deadlift+form+short',
    cues: [
      'Dumbbells at sides or in front',
      'Soft knee bend, hinge at hips',
      'Shoulders pulled back, chest proud',
      'Lower until hamstrings are fully stretched',
      'Drive hips forward to stand'
    ]
  },

  // ─── ADDITIONAL SQUAT VARIATIONS ───
  {
    id: 'box-squat',
    name: 'Box Squat',
    category: 'compound',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['hamstrings', 'core', 'back'],
    movementPattern: 'squat',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['barbell', 'box'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 9,
    description: 'Sit back to a box, pause, then explode up. Eliminates the stretch reflex and builds starting strength from a dead stop — directly transfers to explosive shots and stand-ups.',
    videoUrl: 'https://www.youtube.com/results?search_query=box+squat+proper+form+technique+short',
    cues: [
      'Set box to parallel or just below',
      'Sit back onto box with control',
      'Keep shins vertical, knees out',
      'Pause on box — release hip flexors, stay tight',
      'Explode up by driving through heels'
    ]
  },
  {
    id: 'pistol-squat',
    name: 'Pistol Squat',
    category: 'compound',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['hamstrings', 'core', 'calves'],
    movementPattern: 'squat',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['bodyweight'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 7,
    description: 'Single-leg squat to full depth. Demands balance, mobility, and unilateral strength — mimics the single-leg base recovery common in grappling scrambles.',
    videoUrl: 'https://www.youtube.com/results?search_query=pistol+squat+tutorial+progression+short',
    cues: [
      'Stand on one leg, extend the other forward',
      'Arms out front for counterbalance',
      'Descend slowly, keeping heel flat',
      'Go as deep as mobility allows',
      'Drive through whole foot to stand'
    ]
  },
  {
    id: 'reverse-lunge',
    name: 'Reverse Lunge',
    category: 'compound',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['hamstrings', 'core'],
    movementPattern: 'squat',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['dumbbell', 'barbell', 'bodyweight'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 6,
    description: 'Step back instead of forward — less knee stress and better glute activation. Trains the deceleration patterns grapplers need when pulling guard or absorbing takedowns.',
    videoUrl: 'https://www.youtube.com/results?search_query=reverse+lunge+proper+form+short',
    cues: [
      'Step back, lower until both knees at 90 degrees',
      'Keep torso upright',
      'Front shin stays vertical',
      'Drive through front heel to return',
      'Control the step back — no crashing down'
    ]
  },
  {
    id: 'hack-squat-barbell',
    name: 'Barbell Hack Squat',
    category: 'compound',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: ['glutes', 'hamstrings'],
    movementPattern: 'squat',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['barbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 7,
    description: 'Barbell held behind the legs for a quad-dominant squat. A forgotten old-school exercise that builds massive quad sweep without heavy spinal loading.',
    videoUrl: 'https://www.youtube.com/results?search_query=barbell+hack+squat+form+short',
    cues: [
      'Bar behind legs, grip just outside hips',
      'Feet slightly forward of bar',
      'Stay upright, squat down and back',
      'Push through heels, stand tall',
      'Keep bar close to legs throughout'
    ]
  },

  // ─── ADDITIONAL BENCH / CHEST VARIATIONS ───
  {
    id: 'decline-bench-press',
    name: 'Decline Bench Press',
    category: 'compound',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'shoulders'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['barbell', 'bench'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 7,
    description: 'Decline angle emphasizes lower chest fibers and typically allows heavier loads than flat bench. Builds the pushing strength for frames and bench presses in bottom positions.',
    videoUrl: 'https://www.youtube.com/results?search_query=decline+bench+press+form+short',
    cues: [
      'Secure legs in decline bench pads',
      'Retract and depress shoulder blades',
      'Unrack and lower to lower chest/sternum',
      'Press up and slightly back',
      'Stay tight — don\'t let the angle relax your arch'
    ]
  },
  {
    id: 'dumbbell-incline-bench-press',
    name: 'Dumbbell Incline Bench Press',
    category: 'compound',
    primaryMuscles: ['chest', 'shoulders'],
    secondaryMuscles: ['triceps'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['dumbbell', 'bench'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 9,
    strengthValue: 7,
    description: 'Combines the upper chest emphasis of the incline with the greater ROM of dumbbells. Superior for building the chest fullness and shoulder stability grapplers benefit from.',
    videoUrl: 'https://www.youtube.com/results?search_query=dumbbell+incline+bench+press+form+short',
    cues: [
      'Set bench to 30-45 degree angle',
      'Start with dumbbells at chest, elbows 45 degrees',
      'Press up and slightly together',
      'Control the eccentric — feel the stretch',
      'Full ROM at bottom, squeeze at top'
    ]
  },
  {
    id: 'decline-dumbbell-press',
    name: 'Decline Dumbbell Press',
    category: 'compound',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'shoulders'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['dumbbell', 'bench'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 6,
    description: 'Decline angle with dumbbells allows deeper stretch and independent arm action. Good for addressing chest imbalances while targeting the lower pec fibers.',
    videoUrl: 'https://www.youtube.com/results?search_query=decline+dumbbell+press+form+short',
    cues: [
      'Secure legs in decline bench',
      'Hold dumbbells at chest height',
      'Press up, bringing dumbbells slightly together',
      'Control the descent for a deep stretch',
      'Keep wrists stacked over elbows'
    ]
  },
  {
    id: 'dumbbell-fly',
    name: 'Dumbbell Fly',
    category: 'isolation',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['shoulders'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['dumbbell', 'bench'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 4,
    description: 'Classic chest isolation through horizontal adduction. Builds pec width and the stretch-shortening cycle used in underhooks and frames.',
    videoUrl: 'https://www.youtube.com/results?search_query=dumbbell+fly+proper+form+short',
    cues: [
      'Slight bend in elbows, locked throughout',
      'Lower in wide arc until deep chest stretch',
      'Squeeze pecs to bring dumbbells together',
      'Think hugging a tree',
      'Don\'t go too heavy — this is about stretch and squeeze'
    ]
  },
  {
    id: 'incline-dumbbell-fly',
    name: 'Incline Dumbbell Fly',
    category: 'isolation',
    primaryMuscles: ['chest', 'shoulders'],
    secondaryMuscles: [],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['dumbbell', 'bench'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 3,
    description: 'Incline angle shifts emphasis to upper chest. Great for building the clavicular pec head that creates the upper chest shelf.',
    videoUrl: 'https://www.youtube.com/results?search_query=incline+dumbbell+fly+form+short',
    cues: [
      'Bench at 30-45 degrees',
      'Slight elbow bend, fixed angle',
      'Open arms wide until deep stretch',
      'Squeeze upper chest to close',
      'Lighter weight, higher reps'
    ]
  },
  {
    id: 'pec-deck',
    name: 'Pec Deck Machine',
    category: 'isolation',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['shoulders'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['machine'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 3,
    description: 'Machine-guided chest fly for constant tension through the full range of motion. Safe to push close to failure without a spotter.',
    videoUrl: 'https://www.youtube.com/results?search_query=pec+deck+machine+form+short',
    cues: [
      'Set seat so handles are at chest height',
      'Slight forward lean, chest up',
      'Squeeze pecs to bring handles together',
      'Control the return — don\'t let it snap back',
      'Maintain constant tension, no resting at end range'
    ]
  },
  {
    id: 'machine-chest-press',
    name: 'Machine Chest Press',
    category: 'compound',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'shoulders'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['machine'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 5,
    description: 'Plate-loaded or selectorized chest press machine. Safe for pushing to failure and useful for high-volume chest work without stabilizer fatigue.',
    videoUrl: 'https://www.youtube.com/results?search_query=machine+chest+press+form+short',
    cues: [
      'Seat height: handles at mid-chest',
      'Retract shoulder blades against pad',
      'Press forward, don\'t fully lock elbows',
      'Slow, controlled return',
      'Keep feet flat on floor'
    ]
  },

  // ─── ADDITIONAL PULL VARIATIONS ───
  {
    id: 'neutral-grip-pull-up',
    name: 'Neutral-Grip Pull-Up',
    category: 'compound',
    primaryMuscles: ['back', 'biceps'],
    secondaryMuscles: ['forearms', 'core'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['pull_up_bar'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 8,
    description: 'Palms facing each other. The most shoulder-friendly pull-up variation — balances bicep and lat recruitment while reducing shoulder impingement risk.',
    videoUrl: 'https://www.youtube.com/results?search_query=neutral+grip+pull+up+form+short',
    cues: [
      'Grip parallel handles, palms facing each other',
      'Start from dead hang, engage lats',
      'Pull elbows down to sides',
      'Chin over bar height',
      'Control the descent — no kipping'
    ]
  },
  {
    id: 'straight-arm-pulldown',
    name: 'Straight-Arm Lat Pulldown',
    category: 'isolation',
    primaryMuscles: ['back'],
    secondaryMuscles: ['core', 'triceps'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['cable'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 4,
    description: 'Isolates the lats without bicep involvement. Builds the lat sweep and teaches the scapular depression pattern crucial for collar tie defense and guard sweeps.',
    videoUrl: 'https://www.youtube.com/results?search_query=straight+arm+pulldown+form+short',
    cues: [
      'Stand facing cable, slight forward lean',
      'Arms nearly straight, slight elbow bend',
      'Pull bar to thighs in an arc',
      'Squeeze lats hard at the bottom',
      'Control return — feel the lat stretch'
    ]
  },
  {
    id: 'close-grip-lat-pulldown',
    name: 'Close-Grip Lat Pulldown',
    category: 'compound',
    primaryMuscles: ['back', 'biceps'],
    secondaryMuscles: ['forearms'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['cable'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 6,
    description: 'Close or V-grip attachment increases ROM and bicep recruitment. Great for building back thickness and the pulling strength needed for collar ties.',
    videoUrl: 'https://www.youtube.com/results?search_query=close+grip+lat+pulldown+form+short',
    cues: [
      'V-handle or close-grip attachment',
      'Lean back slightly, chest up',
      'Pull to upper chest, elbows driving past sides',
      'Squeeze shoulder blades together at bottom',
      'Slow eccentric, full stretch at top'
    ]
  },
  {
    id: 'inverted-row',
    name: 'Inverted Row',
    category: 'compound',
    primaryMuscles: ['back'],
    secondaryMuscles: ['biceps', 'core', 'shoulders'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['bodyweight', 'pull_up_bar'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 5,
    description: 'Bodyweight horizontal row using a bar or rings. Scalable difficulty by adjusting body angle. Excellent for high-rep back work and grip endurance.',
    videoUrl: 'https://www.youtube.com/results?search_query=inverted+row+proper+form+short',
    cues: [
      'Set bar at waist height, hang underneath',
      'Body straight from heels to shoulders',
      'Pull chest to bar, squeeze shoulder blades',
      'Control the descent',
      'Harder: feet elevated, easier: more upright'
    ]
  },

  // ─── ADDITIONAL SHOULDER / PRESS VARIATIONS ───
  {
    id: 'dumbbell-lateral-raise-seated',
    name: 'Seated Lateral Raise',
    category: 'isolation',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: [],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['dumbbell', 'bench'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 3,
    description: 'Seated position eliminates momentum and body English, forcing the medial delts to do all the work. Builds wider shoulders and the lateral pushing strength for framing.',
    videoUrl: 'https://www.youtube.com/results?search_query=seated+lateral+raise+form+short',
    cues: [
      'Sit upright, dumbbells at sides',
      'Raise to shoulder height, slight forward lean',
      'Lead with elbows, not wrists',
      'Pause at top, slow lower',
      'No swinging — the seat keeps you honest'
    ]
  },
  {
    id: 'front-raise',
    name: 'Front Raise',
    category: 'isolation',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['chest'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['dumbbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 3,
    description: 'Targets the anterior deltoid head. Useful for building the front shoulder cap, though often already trained from pressing movements.',
    videoUrl: 'https://www.youtube.com/results?search_query=dumbbell+front+raise+form+short',
    cues: [
      'Stand tall, dumbbells in front of thighs',
      'Raise one or both arms to shoulder height',
      'Slight elbow bend, thumbs up or neutral',
      'Control the descent — no swinging',
      'Don\'t raise above shoulder height'
    ]
  },

  // ─── ADDITIONAL ARM VARIATIONS ───
  {
    id: 'ez-bar-curl',
    name: 'EZ-Bar Curl',
    category: 'isolation',
    primaryMuscles: ['biceps'],
    secondaryMuscles: ['forearms'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['ez_bar'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 4,
    description: 'Angled grip reduces wrist strain compared to straight bar. Allows heavier loads than dumbbell curls — the go-to curl for building mass.',
    videoUrl: 'https://www.youtube.com/results?search_query=ez+bar+curl+proper+form+short',
    cues: [
      'Grip on the inner or outer angles',
      'Elbows pinned at sides',
      'Curl up with control, squeeze at top',
      'Slow eccentric — 2-3 seconds down',
      'Don\'t swing the body'
    ]
  },
  {
    id: 'concentration-curl',
    name: 'Concentration Curl',
    category: 'isolation',
    primaryMuscles: ['biceps'],
    secondaryMuscles: [],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['dumbbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 3,
    description: 'Elbow braced against the inner thigh eliminates cheating. Highest peak bicep activation of any curl variation according to EMG studies.',
    videoUrl: 'https://www.youtube.com/results?search_query=concentration+curl+form+short',
    cues: [
      'Sit, brace elbow against inner thigh',
      'Start with arm fully extended',
      'Curl up, supinate hard at the top',
      'Squeeze the peak contraction',
      'Lower slowly with full control'
    ]
  },
  {
    id: 'rope-pushdown',
    name: 'Rope Pushdown',
    category: 'isolation',
    primaryMuscles: ['triceps'],
    secondaryMuscles: [],
    movementPattern: 'push',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['cable'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 4,
    description: 'Rope attachment allows wrists to rotate and split at the bottom, hitting the lateral tricep head harder than a straight bar. Builds the arm extension power for stiff-arms.',
    videoUrl: 'https://www.youtube.com/results?search_query=rope+pushdown+tricep+form+short',
    cues: [
      'Elbows pinned at sides',
      'Push down and spread the rope at the bottom',
      'Squeeze triceps hard at lockout',
      'Control the return — don\'t let it snap up',
      'Torso slightly forward, not upright'
    ]
  },
  {
    id: 'tricep-kickback',
    name: 'Tricep Kickback',
    category: 'isolation',
    primaryMuscles: ['triceps'],
    secondaryMuscles: [],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['dumbbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 3,
    description: 'Isolation at full elbow extension. EMG studies show high long-head tricep activation. Best done light with strict form for building the horseshoe.',
    videoUrl: 'https://www.youtube.com/results?search_query=tricep+kickback+form+short',
    cues: [
      'Hinge forward, upper arm parallel to floor',
      'Extend elbow until arm is fully straight',
      'Squeeze at the top for 1-2 seconds',
      'Don\'t swing — only the forearm moves',
      'Use lighter weight than you think'
    ]
  },
  {
    id: 'close-grip-pushup',
    name: 'Close-Grip Push-Up',
    category: 'compound',
    primaryMuscles: ['triceps', 'chest'],
    secondaryMuscles: ['shoulders', 'core'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['bodyweight'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 5,
    description: 'Hands shoulder-width or narrower shifts emphasis to triceps. A bodyweight staple for building pressing endurance and lockout strength with zero equipment.',
    videoUrl: 'https://www.youtube.com/results?search_query=close+grip+push+up+form+short',
    cues: [
      'Hands shoulder-width or narrower',
      'Elbows stay close to body, not flared',
      'Lower chest to hands',
      'Push through palms, lock out',
      'Body stays rigid — no sagging hips'
    ]
  },

  // ─── ADDITIONAL LEG ACCESSORIES ───
  {
    id: 'pendulum-squat',
    name: 'Pendulum Squat',
    category: 'compound',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: ['glutes'],
    movementPattern: 'squat',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['machine'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 6,
    description: 'Machine-guided arc puts the quads under maximal stretch and load without spinal compression. One of the best quad builders available.',
    videoUrl: 'https://www.youtube.com/results?search_query=pendulum+squat+machine+form+short',
    cues: [
      'Position feet low on platform for quad focus',
      'Descend deep — the machine supports you',
      'Drive through the balls of the feet',
      'Control the arc, don\'t bounce',
      'Keep back pressed against pad'
    ]
  },
  {
    id: 'v-squat',
    name: 'V-Squat / Lever Squat',
    category: 'compound',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['hamstrings'],
    movementPattern: 'squat',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['machine'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 8,
    strengthValue: 6,
    description: 'Plate-loaded lever squat with fixed path. Allows heavy loading without spinal compression. Great for high-volume quad work in a fatigued state.',
    videoUrl: 'https://www.youtube.com/results?search_query=v+squat+machine+form+short',
    cues: [
      'Shoulders under pads, feet on platform',
      'Narrow stance for quads, wide for glutes',
      'Squat deep with control',
      'Drive through whole foot',
      'Don\'t let knees cave in'
    ]
  },
  {
    id: 'standing-leg-curl',
    name: 'Standing Leg Curl',
    category: 'isolation',
    primaryMuscles: ['hamstrings'],
    secondaryMuscles: [],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['machine'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 4,
    description: 'Unilateral hamstring curl standing. Trains each leg independently and allows a strong peak contraction. Good for addressing hamstring imbalances.',
    videoUrl: 'https://www.youtube.com/results?search_query=standing+leg+curl+machine+form+short',
    cues: [
      'Stand facing the pad, one ankle behind roller',
      'Hold handles for stability',
      'Curl heel to glute with control',
      'Squeeze hamstring at the top',
      'Slow eccentric — resist the weight back down'
    ]
  },
  {
    id: 'donkey-calf-raise',
    name: 'Donkey Calf Raise',
    category: 'isolation',
    primaryMuscles: ['calves'],
    secondaryMuscles: [],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['machine', 'bodyweight'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 4,
    description: 'Hips hinged forward puts the gastrocnemius in a greater stretch than standing raises. Arnold\'s favorite calf exercise for a reason — maximal calf stretch under load.',
    videoUrl: 'https://www.youtube.com/results?search_query=donkey+calf+raise+form+short',
    cues: [
      'Hinge forward, support upper body',
      'Toes on raised surface, heels hanging',
      'Drop heels for deep stretch',
      'Rise onto toes, squeeze at top',
      'Pause at both the stretch and contraction'
    ]
  },
  {
    id: 'smith-machine-calf-raise',
    name: 'Smith Machine Calf Raise',
    category: 'isolation',
    primaryMuscles: ['calves'],
    secondaryMuscles: [],
    movementPattern: 'push',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['machine'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 4,
    description: 'Smith bar on shoulders with toes on a platform. The guided bar path lets you focus entirely on calf contraction without balancing.',
    videoUrl: 'https://www.youtube.com/results?search_query=smith+machine+calf+raise+form+short',
    cues: [
      'Bar on upper traps, toes on block/plate',
      'Drop heels below platform for full stretch',
      'Rise up onto toes as high as possible',
      'Hold the peak contraction 1-2 seconds',
      'Slow descent — no bouncing'
    ]
  },

  // ─── ADDITIONAL CORE VARIATIONS ───
  {
    id: 'cable-crunch',
    name: 'Cable Crunch',
    category: 'isolation',
    primaryMuscles: ['core'],
    secondaryMuscles: [],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['cable'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 5,
    description: 'Kneeling cable crunch allows progressive overload on the abs — something most bodyweight ab exercises can\'t offer. Builds the ab thickness visible through a gi.',
    videoUrl: 'https://www.youtube.com/results?search_query=cable+crunch+proper+form+short',
    cues: [
      'Kneel facing cable, rope behind head',
      'Hinge at the spine, not the hips',
      'Crunch rib cage toward pelvis',
      'Squeeze abs hard at the bottom',
      'Control the return — no yanking'
    ]
  },
  {
    id: 'dragon-flag',
    name: 'Dragon Flag',
    category: 'isolation',
    primaryMuscles: ['core'],
    secondaryMuscles: ['back'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['bench', 'bodyweight'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 7,
    strengthValue: 7,
    description: 'Bruce Lee\'s signature core exercise. Full-body anti-extension that demands extreme core rigidity — transfers directly to maintaining body alignment during grappling.',
    videoUrl: 'https://www.youtube.com/results?search_query=dragon+flag+tutorial+progression+short',
    cues: [
      'Grip behind head on bench edge',
      'Roll up to vertical, body straight',
      'Lower body as one rigid unit',
      'Don\'t let hips pike or sag',
      'Start with negatives if too hard'
    ]
  },
  {
    id: 'l-sit-hold',
    name: 'L-Sit Hold',
    category: 'isolation',
    primaryMuscles: ['core'],
    secondaryMuscles: ['quadriceps', 'triceps', 'shoulders'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['bodyweight', 'dip_station'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 6,
    description: 'Isometric hold with legs extended parallel to the floor. Demands hip flexor strength, core compression, and shoulder depression — all critical for guard play.',
    videoUrl: 'https://www.youtube.com/results?search_query=l+sit+hold+tutorial+progression+short',
    cues: [
      'Hands on parallettes, dip bars, or floor',
      'Lock arms straight, depress shoulders',
      'Lift legs to horizontal, toes pointed',
      'Keep lower back flat, not rounded',
      'Start with tucked knees if needed'
    ]
  },

  // ─── EXPLOSIVE / POWER ADDITIONS ───
  {
    id: 'broad-jump',
    name: 'Broad Jump',
    category: 'power',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['hamstrings', 'calves', 'core'],
    movementPattern: 'explosive',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['bodyweight'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 4,
    strengthValue: 7,
    description: 'Horizontal power from a standing start. Directly trains the explosive hip extension and forward drive used in takedown entries and sprawls.',
    videoUrl: 'https://www.youtube.com/results?search_query=standing+broad+jump+technique+short',
    cues: [
      'Feet hip-width, arms back',
      'Swing arms forward and jump out',
      'Triple extend — ankles, knees, hips',
      'Land softly, absorb with bent knees',
      'Stick the landing before resetting'
    ]
  },
  {
    id: 'plyo-push-up',
    name: 'Plyometric Push-Up',
    category: 'power',
    primaryMuscles: ['chest', 'triceps'],
    secondaryMuscles: ['shoulders', 'core'],
    movementPattern: 'push',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['bodyweight'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 5,
    strengthValue: 6,
    description: 'Explosive push-up where hands leave the ground. Builds the explosive upper body power for hand fighting, frames, and explosive escapes from bottom.',
    videoUrl: 'https://www.youtube.com/results?search_query=plyometric+push+up+form+short',
    cues: [
      'Start in push-up position',
      'Lower with control, then explode up',
      'Hands fully leave the ground',
      'Land softly, absorb into next rep',
      'Clap optional — power is the goal, not flash'
    ]
  },
  {
    id: 'kettlebell-snatch',
    name: 'Kettlebell Snatch',
    category: 'power',
    primaryMuscles: ['shoulders', 'back', 'glutes'],
    secondaryMuscles: ['hamstrings', 'core', 'forearms'],
    movementPattern: 'explosive',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['kettlebell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 5,
    strengthValue: 7,
    description: 'Full-body explosive lift taking the kettlebell from floor to overhead in one motion. Builds the hip snap, shoulder stability, and grip endurance grapplers need.',
    videoUrl: 'https://www.youtube.com/results?search_query=kettlebell+snatch+technique+short',
    cues: [
      'Start like a swing, hinge and drive hips',
      'Pull the bell close to body as it rises',
      'Punch hand through at the top',
      'Lock out overhead, arm straight',
      'Let it arc back down smoothly'
    ]
  },
  {
    id: 'kettlebell-clean-press',
    name: 'Kettlebell Clean & Press',
    category: 'power',
    primaryMuscles: ['shoulders', 'back', 'glutes'],
    secondaryMuscles: ['core', 'forearms', 'triceps'],
    movementPattern: 'explosive',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['kettlebell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 8,
    description: 'Clean the kettlebell to rack position then press overhead. Combines explosive pulling with strict pressing — the most complete kettlebell exercise for fighters.',
    videoUrl: 'https://www.youtube.com/results?search_query=kettlebell+clean+and+press+form+short',
    cues: [
      'Swing and clean to rack — bell rests on forearm',
      'Absorb with slight knee bend',
      'Press straight up from rack',
      'Lower to rack, then swing back down',
      'Keep wrist straight, don\'t let bell bang forearm'
    ]
  },

  // ─── ADDITIONAL PLYOMETRIC / SPEED-STRENGTH ───
  {
    id: 'dumbbell-jump-squat',
    name: 'Dumbbell Jump Squat',
    category: 'power',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['calves', 'core'],
    movementPattern: 'explosive',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['dumbbell'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 5,
    strengthValue: 8,
    description: 'Loaded jump squat for explosive takedown power.',
    videoUrl: 'https://www.youtube.com/results?search_query=dumbbell+jump+squat+form+short',
    cues: [
      'Hold dumbbells at sides',
      'Quarter squat then explode up',
      'Land soft with bent knees',
      'Reset between reps'
    ]
  },
  {
    id: 'weighted-jumping-lunge',
    name: 'Weighted Jumping Lunge',
    category: 'power',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['hamstrings', 'calves', 'core'],
    movementPattern: 'explosive',
    equipmentRequired: ['full_gym', 'home_gym', 'minimal'],
    equipmentTypes: ['dumbbell', 'bodyweight'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 6,
    strengthValue: 7,
    description: 'Explosive split stance power for single-leg drive and level changes.',
    videoUrl: 'https://www.youtube.com/results?search_query=weighted+jumping+lunge+form+short',
    cues: [
      'Start in lunge position',
      'Explode up and switch legs mid-air',
      'Land softly in opposite lunge',
      'Keep torso upright throughout'
    ]
  },
  {
    id: 'med-ball-chest-pass',
    name: 'Med Ball Chest Pass',
    category: 'power',
    primaryMuscles: ['chest', 'triceps'],
    secondaryMuscles: ['shoulders', 'core'],
    movementPattern: 'explosive',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['medicine_ball'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 4,
    strengthValue: 6,
    description: 'Explosive upper body push power for hand fighting and framing.',
    videoUrl: 'https://www.youtube.com/results?search_query=medicine+ball+chest+pass+wall+form+short',
    cues: [
      'Hold ball at chest height',
      'Step forward and push explosively',
      'Follow through with arms',
      'Catch and repeat or throw against wall'
    ]
  },
  {
    id: 'depth-jump',
    name: 'Depth Jump',
    category: 'power',
    primaryMuscles: ['quadriceps', 'glutes'],
    secondaryMuscles: ['calves', 'hamstrings'],
    movementPattern: 'explosive',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['box'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 4,
    strengthValue: 9,
    description: 'Advanced reactive strength — step off box, absorb, explode up. Trains stretch-shortening cycle for explosive takedowns.',
    videoUrl: 'https://www.youtube.com/results?search_query=depth+jump+technique+form+short',
    cues: [
      'Step off box (don\'t jump off)',
      'Land on both feet simultaneously',
      'Minimize ground contact time',
      'Explode up as high as possible',
      'Only for advanced — start with low boxes'
    ]
  },

  // ─── GRAPPLING-SPECIFIC ADDITIONS ───
  {
    id: 'rope-climb',
    name: 'Rope Climb',
    category: 'grappling_specific',
    primaryMuscles: ['back', 'biceps', 'forearms'],
    secondaryMuscles: ['core', 'shoulders'],
    movementPattern: 'pull',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['bodyweight'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 5,
    strengthValue: 8,
    description: 'Classic functional pulling. Builds grip endurance, pulling power, and the full-body coordination needed for climbing from bottom position and controlling opponents.',
    videoUrl: 'https://www.youtube.com/results?search_query=rope+climb+technique+tutorial+short',
    cues: [
      'Grab high, wrap rope around one foot',
      'Step up, clamp rope with feet',
      'Reach higher and repeat',
      'Legless version for advanced: arms only',
      'Control the descent — don\'t slide'
    ]
  },
  {
    id: 'sandbag-carry',
    name: 'Sandbag Bear Hug Carry',
    category: 'grappling_specific',
    primaryMuscles: ['core', 'back', 'biceps'],
    secondaryMuscles: ['forearms', 'shoulders', 'quadriceps'],
    movementPattern: 'carry',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['bodyweight'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 4,
    strengthValue: 8,
    description: 'Hug a heavy sandbag against your chest and walk. The unstable, shifting load mimics controlling a resisting opponent. One of the most grappling-specific exercises possible.',
    videoUrl: 'https://www.youtube.com/results?search_query=sandbag+bear+hug+carry+short',
    cues: [
      'Deadlift sandbag, wrap arms around it',
      'Squeeze it tight against chest',
      'Walk with short, controlled steps',
      'Keep chest up, core braced',
      'Don\'t let it slip — squeeze harder'
    ]
  },
  {
    id: 'sandbag-over-shoulder',
    name: 'Sandbag Over Shoulder',
    category: 'grappling_specific',
    primaryMuscles: ['back', 'glutes', 'core'],
    secondaryMuscles: ['hamstrings', 'shoulders', 'biceps'],
    movementPattern: 'explosive',
    equipmentRequired: ['full_gym'],
    equipmentTypes: ['bodyweight'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 4,
    strengthValue: 8,
    description: 'Lift sandbag from floor and throw it over one shoulder. Mimics the explosive hip and back drive of a takedown or throw better than any barbell movement.',
    videoUrl: 'https://www.youtube.com/results?search_query=sandbag+over+shoulder+technique+short',
    cues: [
      'Straddle the bag, grip underneath',
      'Deadlift to lap, then bear hug',
      'Explode hips and pull over shoulder',
      'Alternate shoulders each rep',
      'Reset from the ground each time'
    ]
  },
  {
    id: 'landmine-rotation',
    name: 'Landmine Rotation',
    category: 'grappling_specific',
    primaryMuscles: ['core', 'shoulders'],
    secondaryMuscles: ['back', 'chest'],
    movementPattern: 'rotation',
    equipmentRequired: ['full_gym', 'home_gym'],
    equipmentTypes: ['barbell', 'landmine'] as EquipmentType[],
    grapplerFriendly: true,
    aestheticValue: 5,
    strengthValue: 6,
    description: 'Rotate the barbell in a landmine attachment side to side. Trains anti-rotation and rotational power — the exact force vectors used in framing, sweeping, and throwing.',
    videoUrl: 'https://www.youtube.com/results?search_query=landmine+rotation+exercise+form+short',
    cues: [
      'Hold end of barbell at chest height with both hands',
      'Rotate to one side, pivoting on feet',
      'Drive the bar across to the other side',
      'Control the arc — don\'t swing wildly',
      'Core stays braced throughout'
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

// Related movement patterns — exercises from related patterns are valid alternatives
const RELATED_PATTERNS: Record<string, string[]> = {
  squat: ['hinge'],     // squats and hinges both train legs/posterior chain
  hinge: ['squat'],     // deadlifts → squats and vice versa
  push: ['pull'],       // push/pull supersets are common alternatives
  pull: ['push'],
  carry: ['squat', 'hinge'],
  rotation: ['push', 'pull'],
  explosive: ['squat', 'hinge', 'push'],
};

// Get alternative exercises that target the same primary muscles
export function getAlternativesForExercise(exerciseId: string, equipment: Equipment, limit: number = 8): Exercise[] {
  const exercise = exercises.find(e => e.id === exerciseId);
  if (!exercise) return [];

  const allMuscles = [...exercise.primaryMuscles, ...exercise.secondaryMuscles];

  return exercises
    .filter(e =>
      e.id !== exerciseId &&
      e.equipmentRequired.includes(equipment) &&
      // Match on primary-to-primary OR primary-to-secondary overlap
      (e.primaryMuscles.some(m => exercise.primaryMuscles.includes(m)) ||
       e.primaryMuscles.some(m => exercise.secondaryMuscles.includes(m)) ||
       e.secondaryMuscles.some(m => exercise.primaryMuscles.includes(m)))
    )
    .sort((a, b) => {
      // Score by primary overlap first
      const aPrimary = a.primaryMuscles.filter(m => exercise.primaryMuscles.includes(m)).length;
      const bPrimary = b.primaryMuscles.filter(m => exercise.primaryMuscles.includes(m)).length;
      if (bPrimary !== aPrimary) return bPrimary - aPrimary;
      // Total muscle overlap
      const aTotal = [...a.primaryMuscles, ...a.secondaryMuscles].filter(m => allMuscles.includes(m)).length;
      const bTotal = [...b.primaryMuscles, ...b.secondaryMuscles].filter(m => allMuscles.includes(m)).length;
      if (bTotal !== aTotal) return bTotal - aTotal;
      // Movement pattern match
      const aPattern = a.movementPattern === exercise.movementPattern ? 2 :
        (RELATED_PATTERNS[exercise.movementPattern]?.includes(a.movementPattern) ? 1 : 0);
      const bPattern = b.movementPattern === exercise.movementPattern ? 2 :
        (RELATED_PATTERNS[exercise.movementPattern]?.includes(b.movementPattern) ? 1 : 0);
      return bPattern - aPattern;
    })
    .slice(0, limit);
}

// Enhanced alternatives with recommendation scores and reasons
export interface ExerciseRecommendation {
  exercise: Exercise;
  matchScore: number; // 0-100
  reasons: string[];
  tags: string[]; // e.g., "Same movement", "Grappler friendly", "Higher aesthetic"
}

export function getRecommendedAlternatives(
  exerciseId: string,
  equipment: Equipment,
  limit: number = 12
): ExerciseRecommendation[] {
  const exercise = exercises.find(e => e.id === exerciseId);
  if (!exercise) return [];

  const allMuscles = [...exercise.primaryMuscles, ...exercise.secondaryMuscles];
  const relatedPatterns = RELATED_PATTERNS[exercise.movementPattern] || [];

  return exercises
    .filter(e => {
      if (e.id === exerciseId) return false;
      if (!e.equipmentRequired.includes(equipment)) return false;

      // Primary-to-primary overlap (strongest match)
      if (e.primaryMuscles.some(m => exercise.primaryMuscles.includes(m))) return true;
      // Primary-to-secondary overlap (e.g., BSS primary quads when current exercise has quads as secondary)
      if (e.primaryMuscles.some(m => exercise.secondaryMuscles.includes(m))) return true;
      // Secondary-to-primary overlap (e.g., lunges that have quads as primary)
      if (e.secondaryMuscles.some(m => exercise.primaryMuscles.includes(m))) return true;
      // Same or related movement pattern with any muscle overlap
      if ((e.movementPattern === exercise.movementPattern || relatedPatterns.includes(e.movementPattern)) &&
          [...e.primaryMuscles, ...e.secondaryMuscles].some(m => allMuscles.includes(m))) return true;

      return false;
    })
    .map(alt => {
      let score = 0;
      const reasons: string[] = [];
      const tags: string[] = [];

      // Primary muscle overlap (up to 40 points)
      const primaryOverlap = alt.primaryMuscles.filter(m => exercise.primaryMuscles.includes(m)).length;
      const primaryScore = (primaryOverlap / Math.max(exercise.primaryMuscles.length, 1)) * 40;
      score += primaryScore;
      if (primaryOverlap === exercise.primaryMuscles.length) {
        reasons.push('Targets all the same primary muscles');
        tags.push('Full match');
      } else if (primaryOverlap > 0) {
        reasons.push(`Targets ${alt.primaryMuscles.filter(m => exercise.primaryMuscles.includes(m)).join(', ')}`);
      }

      // Cross-muscle overlap: alt's primary hits current's secondary (up to 10 points)
      const crossOverlap = alt.primaryMuscles.filter(m => exercise.secondaryMuscles.includes(m) && !exercise.primaryMuscles.includes(m)).length;
      if (crossOverlap > 0) {
        score += Math.min(10, crossOverlap * 5);
        if (primaryOverlap === 0) {
          reasons.push(`Focuses on ${alt.primaryMuscles.filter(m => exercise.secondaryMuscles.includes(m)).join(', ')}`);
          tags.push('Synergist focus');
        }
      }

      // Secondary muscle overlap (up to 15 points)
      const secondaryOverlap = alt.secondaryMuscles.filter(m =>
        exercise.secondaryMuscles.includes(m) || exercise.primaryMuscles.includes(m)
      ).length;
      score += Math.min(15, secondaryOverlap * 5);

      // Same movement pattern (20 points)
      if (alt.movementPattern === exercise.movementPattern) {
        score += 20;
        reasons.push(`Same ${exercise.movementPattern} pattern`);
        tags.push('Same movement');
      } else if (relatedPatterns.includes(alt.movementPattern)) {
        // Related movement pattern (8 points)
        score += 8;
        tags.push('Related movement');
      }

      // Same category bonus (10 points)
      if (alt.category === exercise.category) {
        score += 10;
        tags.push(alt.category === 'compound' ? 'Compound' : alt.category === 'isolation' ? 'Isolation' : alt.category);
      }

      // Grappler-friendly bonus (10 points)
      if (alt.grapplerFriendly) {
        score += 10;
        tags.push('Grappler friendly');
      }

      // Unilateral bonus (if current exercise is bilateral)
      const unilateralKeywords = ['single', 'split', 'bulgarian', 'lunge', 'one-arm', 'one-leg', 'pistol'];
      const isAltUnilateral = unilateralKeywords.some(kw => alt.name.toLowerCase().includes(kw));
      const isCurrentBilateral = !unilateralKeywords.some(kw => exercise.name.toLowerCase().includes(kw));
      if (isAltUnilateral && isCurrentBilateral) {
        score += 3;
        tags.push('Unilateral');
      }

      // Comparable strength/aesthetic value (up to 5 points)
      const strengthDiff = Math.abs(alt.strengthValue - exercise.strengthValue);
      const aestheticDiff = Math.abs(alt.aestheticValue - exercise.aestheticValue);
      if (strengthDiff <= 1) score += 2.5;
      if (aestheticDiff <= 1) score += 2.5;

      // If higher aesthetic or strength value, note it
      if (alt.aestheticValue > exercise.aestheticValue + 1) {
        tags.push('More aesthetic');
      }
      if (alt.strengthValue > exercise.strengthValue + 1) {
        tags.push('More strength');
      }

      score = Math.min(100, Math.round(score));

      return { exercise: alt, matchScore: score, reasons, tags };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}
