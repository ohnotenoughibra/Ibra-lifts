/**
 * Injury Science Module — Evidence-Based Heal Times & Program Adaptation
 *
 * Classifies injuries by tissue type and severity, provides evidence-based
 * recovery timelines, and generates progressive return-to-training protocols.
 *
 * Science references:
 * - Bleakley et al. 2012: POLICE protocol (Protection, Optimal Loading, Ice, Compression, Elevation)
 * - Khan & Scott 2009: Mechanotherapy — tendon loading for recovery
 * - Järvinen et al. 2005: Muscle injury biology and treatment
 * - Mueller-Wohlfahrt et al. 2013: Muscle injury classification system
 * - Cook & Purdam 2009: Tendinopathy continuum model
 */

import type {
  InjuryEntry,
  InjuryClassification,
  TissueType,
  ReturnToTrainingPhase,
  BodyRegion,
  PainType,
  PainSeverity,
} from './types';

// ── Tissue Type Inference ───────────────────────────────────────────────
// Maps body region + pain type → most likely tissue type
// This is a heuristic; real diagnosis requires medical assessment

const REGION_PRIMARY_TISSUE: Record<BodyRegion, TissueType> = {
  neck: 'muscle',
  left_shoulder: 'joint',
  right_shoulder: 'joint',
  chest: 'muscle',
  upper_back: 'muscle',
  lower_back: 'muscle',
  core: 'muscle',
  left_elbow: 'tendon',
  right_elbow: 'tendon',
  left_wrist: 'ligament',
  right_wrist: 'ligament',
  left_hip: 'joint',
  right_hip: 'joint',
  left_knee: 'ligament',
  right_knee: 'ligament',
  left_ankle: 'ligament',
  right_ankle: 'ligament',
};

// Pain type can override or refine tissue classification
const PAIN_TISSUE_OVERRIDES: Partial<Record<PainType, TissueType>> = {
  sharp: 'muscle',       // Acute muscle strain
  burning: 'nerve',      // Nerve involvement
  stiffness: 'joint',    // Joint/capsular issue
  clicking: 'tendon',    // Tendon subluxation or cartilage
  numbness: 'nerve',     // Clear nerve compression
};

// ── Heal Time Database (days) ───────────────────────────────────────────
// Evidence-based ranges by tissue type and severity grade

interface HealTimeRange { min: number; max: number }

const HEAL_TIMES: Record<TissueType, Record<'mild' | 'moderate' | 'severe', HealTimeRange>> = {
  muscle: {
    // Järvinen et al. 2005; Mueller-Wohlfahrt et al. 2013
    mild:     { min: 5, max: 14 },     // Grade 1: micro-tears, no strength loss
    moderate: { min: 14, max: 42 },    // Grade 2: partial tear, strength deficit
    severe:   { min: 42, max: 120 },   // Grade 3: complete rupture
  },
  tendon: {
    // Cook & Purdam 2009; Khan & Scott 2009
    mild:     { min: 14, max: 42 },    // Reactive tendinopathy
    moderate: { min: 42, max: 84 },    // Tendon disrepair
    severe:   { min: 84, max: 180 },   // Degenerative tendinopathy / partial tear
  },
  ligament: {
    // Standard orthopedic timelines
    mild:     { min: 7, max: 21 },     // Grade 1: stretch, intact
    moderate: { min: 21, max: 56 },    // Grade 2: partial tear
    severe:   { min: 56, max: 180 },   // Grade 3: complete tear
  },
  joint: {
    mild:     { min: 5, max: 14 },     // Acute inflammation / synovitis
    moderate: { min: 14, max: 42 },    // Capsular irritation, labral
    severe:   { min: 42, max: 120 },   // Cartilage damage, chronic
  },
  bone: {
    mild:     { min: 21, max: 42 },    // Bone stress reaction
    moderate: { min: 42, max: 84 },    // Stress fracture
    severe:   { min: 84, max: 168 },   // Complete fracture
  },
  nerve: {
    // Seddon classification
    mild:     { min: 7, max: 28 },     // Neuropraxia (compression)
    moderate: { min: 28, max: 84 },    // Axonotmesis
    severe:   { min: 84, max: 365 },   // Neurotmesis (severe damage)
  },
};

// ── Phase Determination ─────────────────────────────────────────────────

function getPhaseFromDays(daysSinceInjury: number, healTime: HealTimeRange): {
  phase: InjuryClassification['currentPhase'];
  description: string;
} {
  const totalDays = healTime.max;

  // Acute: first 0-20% of healing
  if (daysSinceInjury <= totalDays * 0.15) {
    return {
      phase: 'acute',
      description: 'Acute phase — inflammation and initial healing. Focus on protection and gentle movement.',
    };
  }
  // Subacute: 15-50% of healing
  if (daysSinceInjury <= totalDays * 0.50) {
    return {
      phase: 'subacute',
      description: 'Subacute phase — tissue repair underway. Gradual loading encouraged (Khan & Scott 2009).',
    };
  }
  // Remodeling: 50-85%
  if (daysSinceInjury <= totalDays * 0.85) {
    return {
      phase: 'remodeling',
      description: 'Remodeling phase — tissue strengthening. Progressive loading is therapeutic.',
    };
  }
  // Return to sport: 85%+
  return {
    phase: 'return_to_sport',
    description: 'Return to sport phase — graduated return to full training. Test functional movements.',
  };
}

// ── Exercise Avoidance by Region ────────────────────────────────────────
// Exported so other engines (injury-aware-workout) can consume the same source.

export const REGION_AVOID_EXERCISES: Record<BodyRegion, string[]> = {
  neck:            ['shrug', 'upright-row', 'neck-curl'],
  left_shoulder:   ['overhead-press', 'lateral-raise', 'bench-press', 'dips', 'push-press'],
  right_shoulder:  ['overhead-press', 'lateral-raise', 'bench-press', 'dips', 'push-press'],
  chest:           ['bench-press', 'dumbbell-press', 'incline-press', 'dips', 'push-up', 'cable-fly'],
  upper_back:      ['bent-row', 'barbell-row', 'pull-up', 'lat-pulldown', 'deadlift'],
  lower_back:      ['deadlift', 'romanian-deadlift', 'good-morning', 'bent-row', 'back-squat', 'barbell-row'],
  core:            ['sit-up', 'leg-raise', 'ab-wheel', 'plank', 'deadlift'],
  left_elbow:      ['skull-crusher', 'preacher-curl', 'tricep-extension', 'close-grip-bench'],
  right_elbow:     ['skull-crusher', 'preacher-curl', 'tricep-extension', 'close-grip-bench'],
  left_wrist:      ['wrist-curl', 'barbell-curl', 'front-squat', 'clean'],
  right_wrist:     ['wrist-curl', 'barbell-curl', 'front-squat', 'clean'],
  left_hip:        ['back-squat', 'front-squat', 'lunges', 'leg-press', 'hip-thrust'],
  right_hip:       ['back-squat', 'front-squat', 'lunges', 'leg-press', 'hip-thrust'],
  left_knee:       ['leg-extension', 'back-squat', 'front-squat', 'lunges', 'leg-press', 'box-jump'],
  right_knee:      ['leg-extension', 'back-squat', 'front-squat', 'lunges', 'leg-press', 'box-jump'],
  left_ankle:      ['calf-raise', 'jump-rope', 'box-jump', 'running'],
  right_ankle:     ['calf-raise', 'jump-rope', 'box-jump', 'running'],
};

const REGION_MODIFIED_EXERCISES: Record<BodyRegion, { exerciseId: string; modification: string }[]> = {
  neck:            [{ exerciseId: 'deadlift', modification: 'Reduce weight, avoid heavy straining' }],
  left_shoulder:   [{ exerciseId: 'bench-press', modification: 'Use dumbbells, limited ROM, lighter weight' }, { exerciseId: 'pull-up', modification: 'Neutral grip, partial ROM' }],
  right_shoulder:  [{ exerciseId: 'bench-press', modification: 'Use dumbbells, limited ROM, lighter weight' }, { exerciseId: 'pull-up', modification: 'Neutral grip, partial ROM' }],
  chest:           [{ exerciseId: 'push-up', modification: 'From knees, pain-free ROM only' }],
  upper_back:      [{ exerciseId: 'deadlift', modification: 'Reduce weight significantly, focus on form' }],
  lower_back:      [{ exerciseId: 'back-squat', modification: 'Switch to goblet squat or leg press' }, { exerciseId: 'bent-row', modification: 'Use chest-supported row instead' }],
  core:            [{ exerciseId: 'back-squat', modification: 'Use belt, reduce weight' }],
  left_elbow:      [{ exerciseId: 'barbell-curl', modification: 'Use hammer grip, reduce weight' }],
  right_elbow:     [{ exerciseId: 'barbell-curl', modification: 'Use hammer grip, reduce weight' }],
  left_wrist:      [{ exerciseId: 'bench-press', modification: 'Use wrist wraps, neutral grip dumbbells' }],
  right_wrist:     [{ exerciseId: 'bench-press', modification: 'Use wrist wraps, neutral grip dumbbells' }],
  left_hip:        [{ exerciseId: 'deadlift', modification: 'Trap bar deadlift, reduced ROM' }],
  right_hip:       [{ exerciseId: 'deadlift', modification: 'Trap bar deadlift, reduced ROM' }],
  left_knee:       [{ exerciseId: 'back-squat', modification: 'Box squat to parallel, no deep ROM' }],
  right_knee:      [{ exerciseId: 'back-squat', modification: 'Box squat to parallel, no deep ROM' }],
  left_ankle:      [{ exerciseId: 'back-squat', modification: 'Elevate heels, limited depth' }],
  right_ankle:     [{ exerciseId: 'back-squat', modification: 'Elevate heels, limited depth' }],
};

// ── Loading Guidelines by Tissue + Phase ────────────────────────────────

function getLoadingGuidelines(
  tissue: TissueType,
  phase: InjuryClassification['currentPhase'],
  severity: PainSeverity
): string[] {
  const guidelines: string[] = [];

  if (phase === 'acute') {
    guidelines.push('POLICE protocol: Protect, Optimal Loading, Ice, Compress, Elevate (Bleakley 2012)');
    guidelines.push('Avoid aggravating movements — pain-free ROM only');
    if (tissue === 'muscle') {
      guidelines.push('Light isometric contractions within pain-free range after 48h');
      guidelines.push('Gentle pain-free ROM is encouraged — complete immobilization delays healing (BJSM 2019). Avoid aggressive or weighted stretching in the first 48-72h');
    }
    if (tissue === 'tendon') {
      guidelines.push('Isometric holds (30-45s) can provide pain relief (Rio et al. 2015)');
      guidelines.push('Avoid high-speed/plyometric loading of the tendon');
    }
    if (tissue === 'ligament') {
      guidelines.push('Immobilize if severe; gentle ROM exercises if mild');
    }
    if (tissue === 'nerve') {
      guidelines.push('Avoid positions that compress the nerve (e.g., prolonged sitting for sciatica)');
      guidelines.push('Neural gliding exercises may help — consult a physio');
    }
  }

  if (phase === 'subacute') {
    guidelines.push('Progressive loading is therapeutic — tissues adapt to demands placed on them');
    if (tissue === 'muscle') {
      guidelines.push('Begin eccentric training at light load (Heiderscheit 2010)');
      guidelines.push('Gradually increase ROM through controlled movements');
      guidelines.push('Pain monitoring: exercise pain should stay below 4/10 and settle within 24h — if not, reduce load');
    }
    if (tissue === 'tendon') {
      guidelines.push('Heavy Slow Resistance (HSR) protocol: 3×15→12→10→8 over weeks (Kongsgaard 2009)');
      guidelines.push('Eccentric loading 2×/day for lower limb tendons');
      guidelines.push('Monitor pain using VAS: acceptable training pain ≤3/10, must return to baseline within 24h (Silbernagel 2007)');
    }
    if (tissue === 'ligament') {
      guidelines.push('Controlled ROM exercises, proprioception training');
      guidelines.push('Avoid end-range stress and cutting/pivoting movements');
    }
    if (tissue === 'joint') {
      guidelines.push('Low-impact movement to maintain cartilage nutrition');
      guidelines.push('Isometrics and gentle ROM through pain-free arc');
    }
  }

  if (phase === 'remodeling') {
    guidelines.push('Progressive overload through the healing tissue — builds strength and resilience');
    if (tissue === 'muscle') {
      guidelines.push('Compound movements at 50-70% normal load, increasing weekly');
      guidelines.push('Include both concentric and eccentric phases');
    }
    if (tissue === 'tendon') {
      guidelines.push('Continue HSR; begin adding sport-specific energy-storage loading');
      guidelines.push('Monitor morning stiffness — if it increases, reduce load');
    }
    guidelines.push('Full ROM training should be pain-free');
    guidelines.push('Can begin light sport-specific drills');
  }

  if (phase === 'return_to_sport') {
    guidelines.push('Test functional movements at increasing intensity before full return');
    guidelines.push('Use the 10% rule — increase weekly load by no more than 10%');
    if (tissue === 'muscle') {
      guidelines.push('Sprinting, plyometrics, and combat sport contact can be gradually reintroduced');
    }
    if (tissue === 'tendon') {
      guidelines.push('Plyometric and sport-specific loading — monitor for 24h symptom response');
    }
    guidelines.push('Return to full training when pain-free in all functional tests');
  }

  return guidelines;
}

// ── Return-to-Training Protocol ─────────────────────────────────────────

function generateReturnProtocol(
  tissue: TissueType,
  severity: PainSeverity,
  bodyRegion: BodyRegion
): ReturnToTrainingPhase[] {
  const isLower = ['left_hip', 'right_hip', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle'].includes(bodyRegion);
  const isUpper = ['left_shoulder', 'right_shoulder', 'chest', 'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist'].includes(bodyRegion);

  const phases: ReturnToTrainingPhase[] = [
    {
      phase: 1,
      name: 'Protected Movement',
      durationDays: severity <= 2 ? { min: 2, max: 5 } : severity <= 3 ? { min: 5, max: 10 } : { min: 7, max: 21 },
      criteria: [
        'Pain at rest below 3/10',
        'Can perform daily activities without significant pain',
        'Swelling controlled',
      ],
      allowedActivities: [
        'Pain-free ROM exercises',
        'Isometric holds in pain-free positions',
        isLower ? 'Upper body training (unaffected)' : 'Lower body training (unaffected)',
        'Walking, light cycling if pain-free',
      ],
      intensityLimit: 20,
      volumeLimit: 30,
    },
    {
      phase: 2,
      name: 'Controlled Loading',
      durationDays: severity <= 2 ? { min: 3, max: 7 } : severity <= 3 ? { min: 7, max: 21 } : { min: 14, max: 42 },
      criteria: [
        'Pain-free daily activities',
        'Pain during exercise below 4/10 and settles within 24h',
        'No increase in morning stiffness',
      ],
      allowedActivities: [
        'Light resistance training for affected area (50% normal weight)',
        tissue === 'tendon' ? 'Isometric and eccentric protocols' : 'Controlled concentric/eccentric movements',
        'Full training of unaffected areas',
        isLower ? 'Stationary bike, swimming' : 'Light cardio',
      ],
      intensityLimit: 50,
      volumeLimit: 50,
    },
    {
      phase: 3,
      name: 'Progressive Strengthening',
      durationDays: severity <= 2 ? { min: 5, max: 14 } : severity <= 3 ? { min: 14, max: 28 } : { min: 21, max: 56 },
      criteria: [
        'Can perform affected exercises at 70% load pain-free',
        'No symptom flare-ups after training (within 24h)',
        'Strength within 80% of pre-injury level',
      ],
      allowedActivities: [
        'Progressive resistance training (70-85% normal load)',
        'Compound movements with modified ROM if needed',
        'Sport-specific technique work (no contact)',
        'Light drilling and positional work',
      ],
      intensityLimit: 75,
      volumeLimit: 75,
    },
    {
      phase: 4,
      name: 'Return to Full Training',
      durationDays: severity <= 2 ? { min: 3, max: 7 } : severity <= 3 ? { min: 7, max: 14 } : { min: 14, max: 28 },
      criteria: [
        'Pain-free at 90% normal training load',
        'Full ROM achieved',
        'Strength equal to or within 90% of pre-injury level',
        'Passed sport-specific functional tests',
      ],
      allowedActivities: [
        'Full resistance training (gradually return to 100%)',
        'Sport-specific contact and sparring (graduated)',
        'Plyometrics and explosive movements',
        'Competition preparation',
      ],
      intensityLimit: 95,
      volumeLimit: 95,
    },
  ];

  return phases;
}

// ── Main API ────────────────────────────────────────────────────────────

/**
 * Classify an injury and generate evidence-based recovery information.
 */
export function classifyInjury(injury: InjuryEntry): InjuryClassification {
  // Determine tissue type from region + pain type
  let tissueType = REGION_PRIMARY_TISSUE[injury.bodyRegion];

  // Pain type can override (e.g., burning pain in knee → nerve, not ligament)
  const override = PAIN_TISSUE_OVERRIDES[injury.painType];
  if (override && (injury.painType === 'burning' || injury.painType === 'numbness')) {
    tissueType = override;
  } else if (override && injury.painType === 'clicking') {
    tissueType = 'tendon';
  }

  // Map severity (1-5) to grade
  const grade: 'mild' | 'moderate' | 'severe' =
    injury.severity <= 2 ? 'mild' : injury.severity <= 3 ? 'moderate' : 'severe';

  // Get heal times
  const healTime = HEAL_TIMES[tissueType][grade];

  // Days since injury
  const daysSinceInjury = Math.floor(
    (Date.now() - new Date(injury.date).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Determine current phase
  const { phase, description } = getPhaseFromDays(daysSinceInjury, healTime);

  // Loading guidelines for current phase
  const loadingGuidelines = getLoadingGuidelines(tissueType, phase, injury.severity);

  // Exercise avoidance/modification
  const avoidExerciseIds = REGION_AVOID_EXERCISES[injury.bodyRegion] || [];
  const modifiedExercises = REGION_MODIFIED_EXERCISES[injury.bodyRegion] || [];

  // Return-to-training protocol
  const returnProtocol = generateReturnProtocol(tissueType, injury.severity, injury.bodyRegion);

  return {
    tissueType,
    estimatedHealDays: healTime,
    currentPhase: phase,
    phaseDescription: description,
    loadingGuidelines,
    avoidExerciseIds,
    modifiedExercises,
    returnProtocol,
  };
}

/**
 * Get all active injury classifications and their combined exercise restrictions.
 */
export function getActiveInjuryAdaptations(injuries: InjuryEntry[]): {
  classifications: (InjuryEntry & { classification: InjuryClassification })[];
  allAvoidExercises: string[];
  allModifiedExercises: { exerciseId: string; modification: string }[];
  worstPhase: InjuryClassification['currentPhase'];
  overallVolumeLimit: number;
  overallIntensityLimit: number;
} {
  const active = injuries.filter(i => !i.resolved);
  const classifications = active.map(i => ({
    ...i,
    classification: classifyInjury(i),
  }));

  // Combine all restrictions
  const allAvoidExercises = Array.from(new Set(
    classifications.flatMap(c => c.classification.avoidExerciseIds)
  ));

  const modMap = new Map<string, string>();
  for (const c of classifications) {
    for (const mod of c.classification.modifiedExercises) {
      modMap.set(mod.exerciseId, mod.modification);
    }
  }
  const allModifiedExercises = Array.from(modMap.entries()).map(([exerciseId, modification]) => ({
    exerciseId,
    modification,
  }));

  // Worst phase determines overall program limits
  const phaseOrder: InjuryClassification['currentPhase'][] = [
    'acute', 'subacute', 'remodeling', 'return_to_sport',
  ];
  let worstPhaseIdx = 3; // return_to_sport
  for (const c of classifications) {
    const idx = phaseOrder.indexOf(c.classification.currentPhase);
    if (idx < worstPhaseIdx) worstPhaseIdx = idx;
  }

  const worstPhase = phaseOrder[worstPhaseIdx] || 'return_to_sport';

  // Volume and intensity limits from the most restrictive active protocol
  let overallVolumeLimit = 100;
  let overallIntensityLimit = 100;
  for (const c of classifications) {
    const protocol = c.classification.returnProtocol;
    const phaseIdx = phaseOrder.indexOf(c.classification.currentPhase);
    const currentProtocol = protocol[phaseIdx];
    if (currentProtocol) {
      overallVolumeLimit = Math.min(overallVolumeLimit, currentProtocol.volumeLimit);
      overallIntensityLimit = Math.min(overallIntensityLimit, currentProtocol.intensityLimit);
    }
  }

  return {
    classifications,
    allAvoidExercises,
    allModifiedExercises,
    worstPhase,
    overallVolumeLimit,
    overallIntensityLimit,
  };
}

/**
 * Get a human-readable timeline summary for an injury.
 */
export function getInjuryTimeline(injury: InjuryEntry): {
  daysSinceInjury: number;
  estimatedDaysRemaining: { min: number; max: number };
  percentHealed: number;
  phaseLabel: string;
  tissueLabel: string;
} {
  const classification = classifyInjury(injury);
  const daysSince = Math.floor(
    (Date.now() - new Date(injury.date).getTime()) / (1000 * 60 * 60 * 24)
  );

  const daysRemaining = {
    min: Math.max(0, classification.estimatedHealDays.min - daysSince),
    max: Math.max(0, classification.estimatedHealDays.max - daysSince),
  };

  const percentHealed = Math.min(100,
    Math.round((daysSince / classification.estimatedHealDays.max) * 100)
  );

  const tissueLabels: Record<TissueType, string> = {
    muscle: 'Muscle strain',
    tendon: 'Tendon injury',
    ligament: 'Ligament sprain',
    joint: 'Joint issue',
    bone: 'Bone stress',
    nerve: 'Nerve compression',
  };

  const phaseLabels: Record<InjuryClassification['currentPhase'], string> = {
    acute: 'Acute Phase',
    subacute: 'Sub-Acute Phase',
    remodeling: 'Remodeling Phase',
    return_to_sport: 'Return to Sport',
  };

  return {
    daysSinceInjury: daysSince,
    estimatedDaysRemaining: daysRemaining,
    percentHealed,
    phaseLabel: phaseLabels[classification.currentPhase],
    tissueLabel: tissueLabels[classification.tissueType],
  };
}
