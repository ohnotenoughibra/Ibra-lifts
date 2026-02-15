// Combat sports focused mobility & recovery database
// Exercises organized by body region with combat-sport-specific recommendations

export type SorenessArea =
  | 'neck' | 'shoulders' | 'upper_back' | 'lower_back' | 'chest'
  | 'biceps' | 'triceps' | 'forearms' | 'hips' | 'glutes'
  | 'quads' | 'hamstrings' | 'calves' | 'core' | 'full_body';

export type SorenessSeverity = 'mild' | 'moderate' | 'severe';

export interface MobilityDrill {
  name: string;
  duration: number;       // seconds per side/set
  sets: number;
  description: string;
  breathingCue?: string;
  combatBenefit: string;  // why this matters for combat athletes
  tags: SorenessArea[];
}

export interface SorenessEntry {
  id: string;
  date: string;           // ISO date
  areas: { area: SorenessArea; severity: SorenessSeverity }[];
  timestamp: string;      // ISO datetime
  context: 'rest_day' | 'post_workout';
}

// ── Soreness area display config ──

export const SORENESS_AREAS: { id: SorenessArea; label: string; emoji: string; group: 'upper' | 'lower' | 'core' }[] = [
  { id: 'neck',       label: 'Neck',        emoji: '🦴', group: 'upper' },
  { id: 'shoulders',  label: 'Shoulders',   emoji: '💪', group: 'upper' },
  { id: 'chest',      label: 'Chest',       emoji: '🫁', group: 'upper' },
  { id: 'upper_back', label: 'Upper Back',  emoji: '🔙', group: 'upper' },
  { id: 'biceps',     label: 'Biceps',      emoji: '💪', group: 'upper' },
  { id: 'triceps',    label: 'Triceps',     emoji: '💪', group: 'upper' },
  { id: 'forearms',   label: 'Forearms',    emoji: '✊', group: 'upper' },
  { id: 'core',       label: 'Core',        emoji: '🧱', group: 'core' },
  { id: 'lower_back', label: 'Lower Back',  emoji: '⬇️', group: 'core' },
  { id: 'hips',       label: 'Hips',        emoji: '🦵', group: 'lower' },
  { id: 'glutes',     label: 'Glutes',      emoji: '🍑', group: 'lower' },
  { id: 'quads',      label: 'Quads',       emoji: '🦵', group: 'lower' },
  { id: 'hamstrings', label: 'Hamstrings',  emoji: '🦵', group: 'lower' },
  { id: 'calves',     label: 'Calves',      emoji: '🦶', group: 'lower' },
];

// ── Mobility drills database ──
// Evidence-based drills used by combat sport S&C coaches
// Sources: Kelly Starrett (MobilityWOD), Dr. Andreo Spina (FRC), Phil Daru (UFC Performance)

const MOBILITY_DRILLS: MobilityDrill[] = [
  // ─── NECK ───
  {
    name: 'Neck CARs (Controlled Articular Rotations)',
    duration: 30,
    sets: 2,
    description: 'Slow, full-range neck circles. Chin to chest → ear to shoulder → look up → other ear to shoulder. Keep shoulders still.',
    breathingCue: 'Breathe out during the tightest part of the rotation',
    combatBenefit: 'Reduces submission vulnerability, prevents neck cranks and can-openers from causing injury',
    tags: ['neck'],
  },
  {
    name: 'Prone Neck Extensions',
    duration: 20,
    sets: 3,
    description: 'Lie face down on bench with head off edge. Slowly lift head up against gravity, hold 2s, lower. Add light plate for progression.',
    combatBenefit: 'Builds neck endurance for defending chokes and maintaining posture in clinch',
    tags: ['neck', 'upper_back'],
  },
  {
    name: 'Lateral Neck Stretch with Overpressure',
    duration: 30,
    sets: 2,
    description: 'Ear toward shoulder, gently press with same-side hand. Keep opposite shoulder down. Hold and breathe.',
    breathingCue: 'Deep inhale through nose, slow exhale to deepen stretch',
    combatBenefit: 'Relieves tension from guillotines and head-and-arm chokes',
    tags: ['neck', 'shoulders'],
  },

  // ─── SHOULDERS ───
  {
    name: 'Shoulder CARs',
    duration: 30,
    sets: 2,
    description: 'Standing, make the largest possible circle with your arm, keeping elbow locked. Go forward and backward.',
    breathingCue: 'Inhale on the way up, exhale on the way down',
    combatBenefit: 'Maintains throwing range and protects against kimura/americana-type shoulder locks',
    tags: ['shoulders'],
  },
  {
    name: 'Band Pull-Aparts',
    duration: 20,
    sets: 3,
    description: 'Hold resistance band at shoulder width, arms straight. Pull apart until band touches chest. Control the return.',
    combatBenefit: 'Bulletproofs rear delts for frame defense and underhooks',
    tags: ['shoulders', 'upper_back'],
  },
  {
    name: 'Sleeper Stretch',
    duration: 45,
    sets: 2,
    description: 'Lie on sore side, arm at 90°. Gently push forearm toward floor with other hand. Stop at first tension.',
    breathingCue: 'Exhale to let the arm sink deeper',
    combatBenefit: 'Opens internal rotation — critical after heavy bench or sprawl-heavy sessions',
    tags: ['shoulders'],
  },
  {
    name: 'Wall Slides',
    duration: 30,
    sets: 3,
    description: 'Back flat against wall, arms in "goalpost" position. Slide arms up overhead while keeping contact with wall.',
    combatBenefit: 'Restores overhead mobility for takedown defense and Thai clinch entries',
    tags: ['shoulders', 'upper_back'],
  },
  {
    name: 'Cross-Body Shoulder Stretch',
    duration: 30,
    sets: 2,
    description: 'Pull one arm across body at shoulder height with the other hand. Keep shoulder blade down.',
    combatBenefit: 'Relieves posterior shoulder tightness from punching and gripping',
    tags: ['shoulders'],
  },

  // ─── UPPER BACK ───
  {
    name: 'Thoracic Spine Extensions on Foam Roller',
    duration: 45,
    sets: 2,
    description: 'Foam roller across upper back, hands behind head. Extend over the roller, pause 3s, then curl up. Move roller up/down spine.',
    breathingCue: 'Exhale as you extend, inhale as you curl',
    combatBenefit: 'Unlocks rotation for hooks and elbows, prevents hunched posture from guard play',
    tags: ['upper_back', 'chest'],
  },
  {
    name: 'Cat-Cow',
    duration: 30,
    sets: 3,
    description: 'On all fours, alternate arching (cow) and rounding (cat) the spine. Move slowly through full range.',
    breathingCue: 'Inhale on arch (cow), exhale on round (cat)',
    combatBenefit: 'Spinal segmental mobility for bridging, shrimping, and scrambles',
    tags: ['upper_back', 'lower_back', 'core'],
  },
  {
    name: 'Thread the Needle',
    duration: 30,
    sets: 3,
    description: 'On all fours, reach one arm under your body toward the opposite side, rotating torso. Then open up toward ceiling.',
    breathingCue: 'Exhale as you thread through, inhale as you open up',
    combatBenefit: 'Thoracic rotation for back takes, turtle attacks, and spinning techniques',
    tags: ['upper_back', 'shoulders'],
  },

  // ─── LOWER BACK ───
  {
    name: 'Child\'s Pose with Lat Bias',
    duration: 45,
    sets: 2,
    description: 'Kneel, sit back on heels, walk hands forward. Walk both hands to one side to bias the lat/QL. Hold each side.',
    breathingCue: 'Deep belly breaths — feel the ribcage expand laterally',
    combatBenefit: 'Decompresses spine after heavy deadlifts and wrestling scrambles',
    tags: ['lower_back', 'hips'],
  },
  {
    name: 'Dead Hang',
    duration: 30,
    sets: 3,
    description: 'Hang from pull-up bar with relaxed shoulders. Let gravity decompress the spine. Gently sway side to side.',
    combatBenefit: 'Decompresses lumbar spine, strengthens grip endurance for gi work',
    tags: ['lower_back', 'forearms', 'shoulders'],
  },
  {
    name: 'Supine Twist',
    duration: 40,
    sets: 2,
    description: 'Lie on back, pull one knee across body to opposite side. Keep both shoulders on ground. Look away from the knee.',
    breathingCue: 'Long exhales, let gravity pull the knee down',
    combatBenefit: 'Restores rotation after heavy squat days and closed guard work',
    tags: ['lower_back', 'hips', 'glutes'],
  },

  // ─── CHEST ───
  {
    name: 'Doorway Pec Stretch',
    duration: 30,
    sets: 2,
    description: 'Forearm on doorframe at 90°, step through until you feel a stretch across the chest. Do both high (upper pec) and low positions.',
    combatBenefit: 'Opens up chest after bench pressing, improves underhook and frame ability',
    tags: ['chest', 'shoulders'],
  },
  {
    name: 'Floor Angels',
    duration: 30,
    sets: 3,
    description: 'Lie on back, arms at sides. Slide arms along floor overhead like a snow angel, keeping contact with ground.',
    breathingCue: 'Exhale as arms go overhead',
    combatBenefit: 'Counteracts forward posture from computer use and guard playing',
    tags: ['chest', 'shoulders', 'upper_back'],
  },

  // ─── BICEPS / TRICEPS ───
  {
    name: 'Wall Bicep Stretch',
    duration: 30,
    sets: 2,
    description: 'Place palm flat on wall behind you, fingers pointing down. Gently turn body away from the wall.',
    combatBenefit: 'Prevents bicep tears from armbar-style positions and heavy curls',
    tags: ['biceps', 'forearms'],
  },
  {
    name: 'Overhead Tricep Stretch',
    duration: 30,
    sets: 2,
    description: 'Reach one arm overhead, bend elbow so hand goes behind head. Use other hand to gently pull elbow toward midline.',
    combatBenefit: 'Relieves tricep tightness from pressing movements and posting during scrambles',
    tags: ['triceps', 'shoulders'],
  },

  // ─── FOREARMS ───
  {
    name: 'Wrist Flexor/Extensor Stretch',
    duration: 30,
    sets: 2,
    description: 'Extend arm, pull fingers back (extensors) then push fingers down (flexors). Hold each direction.',
    combatBenefit: 'Essential for gi grapplers — prevents golfer\'s/tennis elbow from death grips',
    tags: ['forearms'],
  },
  {
    name: 'Rice Bucket Circles',
    duration: 60,
    sets: 2,
    description: 'Submerge hands in a bucket of rice. Make circles, open/close fists, and spread fingers against resistance.',
    combatBenefit: 'Builds tendon resilience for grip fighting and wrist locks defense',
    tags: ['forearms'],
  },
  {
    name: 'Wrist CARs',
    duration: 20,
    sets: 2,
    description: 'Make a fist, slowly circle the wrist through its full range in both directions. Keep forearm still.',
    combatBenefit: 'Maintains wrist health for striking and posting during grappling',
    tags: ['forearms'],
  },

  // ─── HIPS ───
  {
    name: '90/90 Hip Switches',
    duration: 30,
    sets: 3,
    description: 'Sit with both knees at 90°. Rotate both knees to the other side in a windshield-wiper motion. Sit tall.',
    breathingCue: 'Exhale during the transition',
    combatBenefit: 'Hip mobility for guard retention, butterfly guard, and hip escapes',
    tags: ['hips', 'glutes'],
  },
  {
    name: 'Pigeon Stretch',
    duration: 60,
    sets: 2,
    description: 'From push-up position, bring one knee forward behind same-side wrist. Lower hips toward ground. Back leg straight.',
    breathingCue: 'Deep belly breaths, relax into the stretch on each exhale',
    combatBenefit: 'Opens external rotation — critical for rubber guard, triangle setups, and high kicks',
    tags: ['hips', 'glutes'],
  },
  {
    name: 'Couch Stretch (Rear Foot Elevated Hip Flexor)',
    duration: 60,
    sets: 2,
    description: 'Kneel with back foot elevated on couch/wall. Front foot forward in lunge. Drive hips forward, squeeze glute.',
    breathingCue: 'Breathe into the hip flexor — long exhales',
    combatBenefit: 'Opens hip flexors for powerful kicks, sprawls, and takedown shots',
    tags: ['hips', 'quads'],
  },
  {
    name: 'Cossack Squats',
    duration: 30,
    sets: 3,
    description: 'Wide stance, shift weight to one leg and squat deep while straightening the other leg. Alternate sides.',
    combatBenefit: 'Lateral hip mobility for takedown defense, single-legs, and stance switches',
    tags: ['hips', 'hamstrings', 'glutes'],
  },
  {
    name: 'Hip CARs',
    duration: 30,
    sets: 2,
    description: 'Standing on one leg, lift knee to chest, open to side, extend behind, and reverse. Biggest circle possible.',
    breathingCue: 'Breathe normally, focus on control over range',
    combatBenefit: 'Full hip articulation for guard play, rubber guard, and kick chambers',
    tags: ['hips'],
  },
  {
    name: 'Deep Squat Hold (Malasana)',
    duration: 60,
    sets: 2,
    description: 'Feet shoulder width or wider, squat all the way down. Elbows press knees open, palms together. Hold.',
    breathingCue: 'Breathe into the belly, relax the pelvic floor',
    combatBenefit: 'Resting squat position mirrors bottom of guard — essential for BJJ',
    tags: ['hips', 'calves', 'lower_back'],
  },

  // ─── GLUTES ───
  {
    name: 'Glute Bridge with Hold',
    duration: 30,
    sets: 3,
    description: 'Lie on back, feet flat. Drive hips up, squeeze glutes hard at top. Hold 5s, lower slowly.',
    combatBenefit: 'Activates glutes for bridging escapes, hip bumps, and explosive standup',
    tags: ['glutes', 'hips', 'lower_back'],
  },
  {
    name: 'Figure-4 Stretch',
    duration: 45,
    sets: 2,
    description: 'Lie on back, cross ankle over opposite knee. Pull the bottom leg toward chest. Keep hips on ground.',
    breathingCue: 'Exhale to deepen the pull',
    combatBenefit: 'Releases piriformis and deep external rotators tight from guard play',
    tags: ['glutes', 'hips'],
  },

  // ─── QUADS ───
  {
    name: 'Standing Quad Stretch with Posterior Pelvic Tilt',
    duration: 30,
    sets: 2,
    description: 'Stand, pull one foot to glute. Tuck pelvis under (posterior tilt) to increase the stretch on rectus femoris.',
    combatBenefit: 'Relieves quad tightness from wrestling stance and heavy squatting',
    tags: ['quads', 'hips'],
  },
  {
    name: 'Half-Kneeling Quad Stretch',
    duration: 45,
    sets: 2,
    description: 'In half-kneeling, grab back foot and pull toward glute. Keep torso upright and pelvis tucked.',
    breathingCue: 'Breathe into the stretch, exhale to tuck pelvis deeper',
    combatBenefit: 'Opens rectus femoris for explosive knee strikes and sprawls',
    tags: ['quads', 'hips'],
  },

  // ─── HAMSTRINGS ───
  {
    name: 'Romanian Deadlift Stretch (Bodyweight)',
    duration: 30,
    sets: 3,
    description: 'Feet hip-width, soft knees. Hinge at hips, slide hands down shins until stretch is felt. Hold, then stand.',
    combatBenefit: 'Hamstring length for high kicks and prevents pulls during explosive movements',
    tags: ['hamstrings', 'lower_back'],
  },
  {
    name: 'Active Straight Leg Raises',
    duration: 20,
    sets: 3,
    description: 'Lie on back, one leg flat. Raise the other leg as high as possible keeping it straight. Use a band for assistance.',
    combatBenefit: 'Active hamstring flexibility for head kicks, triangle chokes, and rubber guard',
    tags: ['hamstrings'],
  },
  {
    name: 'Seated Straddle Stretch',
    duration: 60,
    sets: 2,
    description: 'Sit with legs wide apart. Walk hands forward, keeping back flat. Go to center, then toward each foot.',
    breathingCue: 'Exhale to melt deeper each breath cycle',
    combatBenefit: 'Adductor and hamstring flexibility for wide guard and defensive grappling',
    tags: ['hamstrings', 'hips'],
  },

  // ─── CALVES ───
  {
    name: 'Wall Calf Stretch (Straight + Bent Knee)',
    duration: 30,
    sets: 2,
    description: 'Hands on wall, one foot back. Straight leg = gastroc, bent knee = soleus. Do both positions per side.',
    combatBenefit: 'Calf flexibility for footwork, level changes, and deep squat positions',
    tags: ['calves'],
  },
  {
    name: 'Eccentric Calf Drops',
    duration: 20,
    sets: 3,
    description: 'Stand on edge of step on one foot. Slowly lower heel below step level over 3-4 seconds. Push up with both feet.',
    combatBenefit: 'Builds calf tendon resilience — prevents Achilles issues from mat work and footwork',
    tags: ['calves'],
  },

  // ─── CORE ───
  {
    name: 'Dead Bug',
    duration: 30,
    sets: 3,
    description: 'Lie on back, arms up, knees at 90°. Extend opposite arm and leg while pressing lower back into floor.',
    breathingCue: 'Exhale as you extend, inhale to return',
    combatBenefit: 'Anti-extension core control for guard retention and body lock defense',
    tags: ['core', 'hips'],
  },
  {
    name: 'Prone Cobra',
    duration: 20,
    sets: 3,
    description: 'Lie face down, lift chest and arms off ground. Squeeze shoulder blades together, thumbs pointing up.',
    combatBenefit: 'Posterior chain activation for wrestling posture and preventing round-back',
    tags: ['core', 'upper_back'],
  },
  {
    name: 'Side-Lying Windmill',
    duration: 30,
    sets: 2,
    description: 'Lie on side, knees stacked at 90°. Top arm traces an arc from front to back, following with eyes. Rotate through thoracic spine.',
    breathingCue: 'Inhale as arm opens, exhale back to start',
    combatBenefit: 'Rotational mobility for guard passing and side control transitions',
    tags: ['core', 'upper_back', 'chest'],
  },

  // ─── FULL BODY ───
  {
    name: 'World\'s Greatest Stretch',
    duration: 30,
    sets: 3,
    description: 'Lunge forward, plant opposite hand, rotate open arm to ceiling. Drive rear hip forward. Add hamstring extension by straightening front leg.',
    breathingCue: 'Exhale into each position',
    combatBenefit: 'The #1 combat athlete warm-up — hits hips, t-spine, hamstrings, and shoulders in one move',
    tags: ['full_body', 'hips', 'upper_back', 'hamstrings'],
  },
  {
    name: 'Inchworm to Scorpion',
    duration: 30,
    sets: 3,
    description: 'Walk hands out to push-up position, lift one leg and rotate to touch opposite hand (scorpion). Walk hands back to standing.',
    combatBenefit: 'Full-chain mobility drill — mimics the multi-directional demands of scrambles',
    tags: ['full_body', 'hips', 'shoulders', 'core'],
  },
  {
    name: 'Bear Crawl',
    duration: 30,
    sets: 3,
    description: 'On all fours, knees 1 inch off ground. Crawl forward with opposite hand/foot. Keep hips level, core braced.',
    combatBenefit: 'Primal movement pattern that builds shoulder stability and hip coordination for grappling',
    tags: ['full_body', 'shoulders', 'core', 'hips'],
  },
];

// ── Recommendation engine ──

export interface MobilityRecommendation {
  area: SorenessArea;
  severity: SorenessSeverity;
  drills: MobilityDrill[];
  tip: string;
}

const SEVERITY_TIPS: Record<SorenessSeverity, Record<string, string>> = {
  mild: {
    default: 'Light movement and stretching will speed up recovery. DOMS peaks 24-48h post-exercise.',
    combat: 'Light flow work or shadow drilling at 30% intensity is fine alongside these drills.',
  },
  moderate: {
    default: 'Prioritize these mobility drills before training. Heat therapy (warm shower) before, ice after.',
    combat: 'Drill technique only today — avoid live sparring on sore areas. Focus on positions that don\'t stress the sore muscles.',
  },
  severe: {
    default: 'This area needs rest. Gentle stretching only — no loading. If pain persists >72h, consider seeing a physio.',
    combat: 'Skip hard rolling/sparring involving this area. Stick to positional drilling or film study today.',
  },
};

/**
 * Given a list of sore areas with severity, returns targeted mobility recommendations.
 * Picks 3-4 best drills per area, prioritizing combat-relevant movements.
 */
export function getMobilityRecommendations(
  areas: { area: SorenessArea; severity: SorenessSeverity }[],
  isCombatAthlete: boolean = true,
): MobilityRecommendation[] {
  return areas.map(({ area, severity }) => {
    // Find drills that target this area
    let matching = MOBILITY_DRILLS.filter(d => d.tags.includes(area));

    // For severe soreness, prefer gentle/stretch drills (longer holds, fewer sets)
    if (severity === 'severe') {
      matching = matching.filter(d => d.sets <= 2 || d.duration >= 40);
    }

    // Limit to 3-4 drills
    const drills = matching.slice(0, severity === 'severe' ? 3 : 4);

    const tip = isCombatAthlete
      ? SEVERITY_TIPS[severity].combat
      : SEVERITY_TIPS[severity].default;

    return { area, severity, drills, tip };
  });
}

/**
 * Returns a quick 5-10 min full-body routine for days with no specific soreness.
 */
export function getGeneralMobilityRoutine(): MobilityDrill[] {
  const essentials = [
    'Hip CARs',
    'Shoulder CARs',
    'World\'s Greatest Stretch',
    'Thoracic Spine Extensions on Foam Roller',
    'Deep Squat Hold (Malasana)',
    'Dead Bug',
  ];
  return MOBILITY_DRILLS.filter(d => essentials.includes(d.name));
}

/**
 * Total estimated duration for a set of drills in minutes.
 */
export function estimateDuration(drills: MobilityDrill[]): number {
  const totalSeconds = drills.reduce((sum, d) => sum + (d.duration * d.sets * 2), 0); // *2 for both sides
  return Math.ceil(totalSeconds / 60);
}

/**
 * Estimate seconds for a single drill (both sides).
 */
export function drillSeconds(d: MobilityDrill): number {
  return d.duration * d.sets * 2;
}

/**
 * Build a time-constrained mobility plan from recommendations.
 * Distributes time fairly across sore areas, picking the highest-value drills first.
 */
export function buildTimedPlan(
  recommendations: MobilityRecommendation[],
  timeBudgetMinutes: number,
): MobilityDrill[] {
  if (recommendations.length === 0) return [];

  const budgetSeconds = timeBudgetMinutes * 60;
  let remaining = budgetSeconds;
  const plan: MobilityDrill[] = [];
  const usedNames = new Set<string>();

  // Round-robin across areas so each gets fair time
  let maxRounds = 10; // safety cap
  let added = true;
  while (added && remaining > 0 && maxRounds-- > 0) {
    added = false;
    for (const rec of recommendations) {
      for (const drill of rec.drills) {
        if (usedNames.has(drill.name)) continue;
        const cost = drillSeconds(drill);
        if (cost <= remaining + 15) { // allow 15s overflow for last drill
          plan.push(drill);
          usedNames.add(drill.name);
          remaining -= cost;
          added = true;
          break; // next area
        }
      }
    }
  }

  return plan;
}
