/**
 * Rehab Engine — phased return-to-training plans for logged injuries
 *
 * Sits on top of `injury-science.ts` (which gives us tissue type, healing
 * phase, return-to-training criteria) and adds the missing piece: the actual
 * day-to-day rehab session — what to do today, with sets and reps, plus the
 * phase-advancement check-in.
 *
 * Five-phase model (mapped to InjuryClassification):
 *   1. Protected Movement       (acute)
 *   2. Controlled Loading       (subacute)
 *   3. Progressive Strengthening (remodeling early)
 *   4. Integration              (remodeling late / RTS prep)
 *   5. Return-to-Sport          (return_to_sport)
 *
 * Evidence base:
 *   - Bleakley et al. 2012   POLICE protocol
 *   - Khan & Scott 2009      Mechanotherapy / progressive loading
 *   - Cook & Purdam 2009     Tendinopathy continuum
 *   - Kongsgaard 2009        Heavy Slow Resistance for tendons
 *   - Rio et al. 2015        Isometric loading for tendon pain
 *   - Silbernagel 2007       Pain-monitoring (24h rule, ≤3/10)
 *   - Heiderscheit 2010      Eccentric protocols for muscle injury
 *   - Al Attar et al. 2017   Nordic curls reduce hamstring re-injury
 *   - Rio et al. 2017        Tendon isometrics 5×45s @ 70% MVC
 */

import type {
  InjuryEntry,
  BodyRegion,
  TissueType,
  InjuryClassification,
} from './types';
import { classifyInjury, getInjuryTimeline } from './injury-science';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RehabPhaseNumber = 1 | 2 | 3 | 4 | 5;

export interface RehabExercise {
  id: string;
  name: string;
  sets: number;
  reps?: number;
  durationSeconds?: number;
  restSeconds?: number;
  loadGuidance: string;          // e.g. "bodyweight", "50% normal", "light band"
  cues: string[];
  evidenceNote?: string;
  videoSearch: string;           // YouTube search query
}

export interface RehabSession {
  injuryId: string;
  bodyRegion: BodyRegion;
  tissueType: TissueType;
  phase: RehabPhaseNumber;
  phaseName: string;
  phaseGoal: string;
  estimatedMinutes: number;
  painCap: number;               // stop if pain > this on 0-10 scale
  warmUp: string[];
  exercises: RehabExercise[];
  coolDown: string[];
  postSessionGuidance: string;
  redFlags: string[];            // when to stop and see a clinician
}

export interface RehabCheckIn {
  id: string;
  injuryId: string;
  date: string;                  // ISO date
  painAtRest: number;            // 0-10
  painDuringExercise: number;    // 0-10
  painAfter24h: number;          // 0-10  (Silbernagel 24h rule)
  romPercent: number;            // 0-100, vs uninjured side
  swellingLevel: 'none' | 'mild' | 'moderate' | 'significant';
  completedSession: boolean;
  notes?: string;
}

export interface PhaseAdvancementResult {
  canAdvance: boolean;
  currentPhase: RehabPhaseNumber;
  proposedPhase: RehabPhaseNumber;
  metCriteria: string[];
  unmetCriteria: string[];
  recommendation: string;
  warning?: string;              // e.g. progressing too fast
}

export interface RehabState {
  injuryId: string;
  startedAt: string;             // ISO
  phaseOverride?: RehabPhaseNumber;
  checkIns: RehabCheckIn[];
}

export interface DailyRehabPlan {
  injuryId: string;
  date: string;
  phase: RehabPhaseNumber;
  phaseName: string;
  daysSinceInjury: number;
  daysInPhase: number;
  percentHealed: number;
  session: RehabSession;
  todaysFocus: string;
  motivationalCue: string;
  nextMilestone: string;
}

// ---------------------------------------------------------------------------
// Phase mapping — InjuryClassification phase → RehabPhaseNumber
// ---------------------------------------------------------------------------

function mapClassificationToRehabPhase(
  classification: InjuryClassification,
  daysSinceInjury: number
): RehabPhaseNumber {
  switch (classification.currentPhase) {
    case 'acute':
      return 1;
    case 'subacute':
      return 2;
    case 'remodeling': {
      // Split remodeling into phase 3 (early) and phase 4 (late integration)
      const totalDays = classification.estimatedHealDays.max;
      const remodelStart = totalDays * 0.5;
      const remodelEnd = totalDays * 0.85;
      const ratio = (daysSinceInjury - remodelStart) / (remodelEnd - remodelStart);
      return ratio > 0.6 ? 4 : 3;
    }
    case 'return_to_sport':
      return 5;
  }
}

// ---------------------------------------------------------------------------
// Exercise Library — keyed by (bodyRegion → phase)
// ---------------------------------------------------------------------------

type RehabLibrary = Partial<Record<BodyRegion, Record<RehabPhaseNumber, RehabExercise[]>>>;

/**
 * The core rehab exercise database. Built from sport rehab orthopedic protocols
 * and tendon-loading literature. Conservative on phase 1, progressive on 4-5.
 */
const REHAB_LIBRARY: RehabLibrary = {
  // ── KNEE ──────────────────────────────────────────────────────────────
  left_knee: {
    1: [
      { id: 'quad-set', name: 'Quad Sets (Isometric)', sets: 3, reps: 10, durationSeconds: 5, restSeconds: 30, loadGuidance: 'bodyweight, lying down', cues: ['Press knee straight into floor', 'Squeeze quad for 5s', 'No pain — back off if sharp'], videoSearch: 'quad set isometric rehab' },
      { id: 'ankle-pumps', name: 'Ankle Pumps', sets: 2, reps: 20, restSeconds: 30, loadGuidance: 'bodyweight', cues: ['Pump foot up and down', 'Helps reduce swelling'], videoSearch: 'ankle pumps post knee injury' },
      { id: 'heel-slides', name: 'Heel Slides (Pain-Free ROM)', sets: 2, reps: 10, restSeconds: 30, loadGuidance: 'bodyweight', cues: ['Slide heel toward butt', 'Stop at first hint of pain', 'Never force range'], videoSearch: 'heel slide knee rehab' },
      { id: 'straight-leg-raise', name: 'Straight Leg Raise', sets: 3, reps: 10, restSeconds: 45, loadGuidance: 'bodyweight', cues: ['Lock knee straight first', 'Lift to 45°', 'Slow down'], videoSearch: 'straight leg raise knee rehab' },
    ],
    2: [
      { id: 'tke-band', name: 'Terminal Knee Extensions (TKE)', sets: 3, reps: 15, restSeconds: 60, loadGuidance: 'light band', cues: ['Band behind knee', 'Press knee back to lock', 'Squeeze quad hard'], evidenceNote: 'Targets VMO — key for patellar tracking', videoSearch: 'TKE terminal knee extension band' },
      { id: 'glute-bridge', name: 'Glute Bridge', sets: 3, reps: 12, restSeconds: 60, loadGuidance: 'bodyweight', cues: ['Drive through heels', 'Squeeze glutes at top', 'Avoid arching low back'], videoSearch: 'glute bridge rehab' },
      { id: 'wall-sit', name: 'Wall Sit (Isometric Quad)', sets: 3, durationSeconds: 30, restSeconds: 60, loadGuidance: 'bodyweight, partial depth', cues: ['Slide down to comfortable depth', 'Pain-free angle only', 'Keep knees over ankles'], videoSearch: 'wall sit rehab knee' },
      { id: 'mini-squat', name: 'Mini Squat (Pain-Free Depth)', sets: 3, reps: 10, restSeconds: 60, loadGuidance: 'bodyweight', cues: ['Squat only as deep as pain-free', 'Knees tracking over toes', 'Slow tempo 3s down'], videoSearch: 'mini squat rehab' },
      { id: 'side-lying-clam', name: 'Side-Lying Clams', sets: 2, reps: 15, restSeconds: 45, loadGuidance: 'bodyweight or light band', cues: ['Hips stacked', 'Open knee like a clam', 'Glute med should burn'], videoSearch: 'clam shell exercise rehab' },
    ],
    3: [
      { id: 'goblet-squat-box', name: 'Goblet Box Squat', sets: 4, reps: 8, restSeconds: 90, loadGuidance: 'light–moderate DB', cues: ['Box height = pain-free depth', 'Sit back, drive up', 'Tempo 3-1-1'], videoSearch: 'goblet box squat' },
      { id: 'eccentric-leg-curl', name: 'Eccentric Leg Curl (Slider)', sets: 3, reps: 10, restSeconds: 90, loadGuidance: 'bodyweight, slow eccentric', cues: ['Bridge up first', '5s lowering phase', 'Hamstring controls descent'], evidenceNote: 'Eccentrics build tendon resilience', videoSearch: 'eccentric leg curl slider rehab' },
      { id: 'split-squat-supported', name: 'Supported Split Squat', sets: 3, reps: 10, restSeconds: 90, loadGuidance: 'bodyweight, hand on wall', cues: ['Drop straight down', 'Front knee tracks toe', 'Use wall for balance only'], videoSearch: 'split squat rehab knee' },
      { id: 'step-up-low', name: 'Low Step-Up (10–15cm)', sets: 3, reps: 10, restSeconds: 90, loadGuidance: 'bodyweight', cues: ['Drive through full foot', 'Don\'t push off back leg', 'Slow down (3s)'], videoSearch: 'step up rehab knee' },
      { id: 'single-leg-rdl-supported', name: 'Supported Single-Leg RDL', sets: 3, reps: 8, restSeconds: 90, loadGuidance: 'bodyweight', cues: ['Hinge at hip', 'Long spine', 'Use wall/post for balance'], videoSearch: 'single leg RDL beginner' },
    ],
    4: [
      { id: 'goblet-squat-full', name: 'Goblet Squat (Full ROM)', sets: 4, reps: 8, restSeconds: 120, loadGuidance: 'moderate DB, 60–70% normal', cues: ['Full pain-free depth', 'Brace hard', 'Tempo 2-1-X'], videoSearch: 'goblet squat form' },
      { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', sets: 3, reps: 8, restSeconds: 120, loadGuidance: 'bodyweight or light DB', cues: ['Rear foot elevated', 'Front knee tracks straight', 'Drive through heel'], videoSearch: 'bulgarian split squat' },
      { id: 'nordic-curl-eccentric', name: 'Nordic Curl (Assisted)', sets: 3, reps: 6, restSeconds: 120, loadGuidance: 'bodyweight, eccentric only', cues: ['Anchor feet', '5s descent', 'Catch with hands at end'], evidenceNote: 'Nordics reduce hamstring re-injury risk by ~50% (Al Attar 2017)', videoSearch: 'nordic curl eccentric' },
      { id: 'pogo-jumps', name: 'Pogo Jumps (Low Amplitude)', sets: 3, reps: 15, restSeconds: 90, loadGuidance: 'bodyweight, ankles stiff', cues: ['Tiny bounces, 2-3 inches', 'Land soft, on balls of feet', 'Stop if any knee pain'], videoSearch: 'pogo jumps plyometric beginner' },
      { id: 'lateral-step-down', name: 'Lateral Step-Down', sets: 3, reps: 8, restSeconds: 120, loadGuidance: 'bodyweight, low box', cues: ['Slow controlled descent', 'Hover toe to floor', 'Don\'t collapse knee inward'], videoSearch: 'lateral step down knee rehab' },
    ],
    5: [
      { id: 'box-jump-low', name: 'Low Box Jump (12–18 in)', sets: 4, reps: 5, restSeconds: 120, loadGuidance: 'bodyweight', cues: ['Stick the landing', 'Step down (don\'t jump off)', 'Pain-free landing'], videoSearch: 'box jump form' },
      { id: 'broad-jump-graded', name: 'Broad Jump (75% effort)', sets: 4, reps: 4, restSeconds: 120, loadGuidance: 'bodyweight', cues: ['Stick landing for 2s', 'Test before going max', 'Soft knee on landing'], videoSearch: 'broad jump form rehab' },
      { id: 'lateral-bounds', name: 'Lateral Bounds', sets: 3, reps: 6, restSeconds: 120, loadGuidance: 'bodyweight', cues: ['Bound side to side', 'Stick each landing', 'Build distance over weeks'], videoSearch: 'lateral bounds rehab' },
      { id: 'shuttle-5-10-5', name: '5-10-5 Shuttle (Submax)', sets: 3, durationSeconds: 30, restSeconds: 120, loadGuidance: '75% effort', cues: ['Plant and cut both directions', 'Form over speed', 'Time it weekly'], videoSearch: '5-10-5 pro agility shuttle' },
      { id: 'sport-drill', name: 'Sport-Specific Drill (Drilling)', sets: 1, durationSeconds: 600, restSeconds: 0, loadGuidance: 'positional drilling, no live', cues: ['Movement at 70-80% intensity', 'No sparring yet', 'Test the knee under sport demand'], videoSearch: '' },
    ],
  },

  // ── SHOULDER ──────────────────────────────────────────────────────────
  left_shoulder: {
    1: [
      { id: 'pendulum', name: 'Pendulum Swings', sets: 2, reps: 15, restSeconds: 30, loadGuidance: 'bodyweight, gravity-driven', cues: ['Lean forward, let arm hang', 'Small circles each direction', 'Completely relaxed'], videoSearch: 'pendulum exercise shoulder rehab' },
      { id: 'scapular-clock', name: 'Scapular Clock', sets: 2, reps: 8, restSeconds: 30, loadGuidance: 'bodyweight', cues: ['Move shoulder blade up, down, in, out', 'Like the hands of a clock', 'Small ROM'], videoSearch: 'scapular clock exercise' },
      { id: 'isometric-er', name: 'Isometric External Rotation', sets: 3, durationSeconds: 5, reps: 10, restSeconds: 45, loadGuidance: 'wall pressure', cues: ['Elbow at side, 90° bent', 'Press out into wall', 'Hold 5s'], videoSearch: 'isometric external rotation shoulder' },
      { id: 'isometric-flexion', name: 'Isometric Shoulder Flexion', sets: 3, durationSeconds: 5, reps: 10, restSeconds: 45, loadGuidance: 'wall pressure', cues: ['Press fist into wall in front', 'No movement', '50% effort only'], videoSearch: 'isometric shoulder flexion rehab' },
    ],
    2: [
      { id: 'band-er', name: 'Band External Rotation', sets: 3, reps: 15, restSeconds: 60, loadGuidance: 'light band', cues: ['Elbow tucked at 90°', 'Rotate hand outward', 'Slow control both directions'], videoSearch: 'band external rotation rotator cuff' },
      { id: 'band-ir', name: 'Band Internal Rotation', sets: 3, reps: 15, restSeconds: 60, loadGuidance: 'light band', cues: ['Elbow tucked', 'Rotate hand toward belly', 'Don\'t shrug'], videoSearch: 'band internal rotation shoulder' },
      { id: 'scaption-light', name: 'Light Scaption Raise', sets: 3, reps: 12, restSeconds: 60, loadGuidance: '1-2kg DB', cues: ['Thumbs up, raise to scapular plane (30° forward)', 'Stop at shoulder height', 'No shrug'], videoSearch: 'scaption raise shoulder rehab' },
      { id: 'prone-y-t', name: 'Prone Y-T Raises', sets: 3, reps: 10, restSeconds: 60, loadGuidance: 'bodyweight', cues: ['Face down on bench', 'Y-shape then T-shape', 'Squeeze shoulder blades'], videoSearch: 'prone Y T raise' },
      { id: 'wall-slide', name: 'Wall Slides', sets: 2, reps: 12, restSeconds: 45, loadGuidance: 'bodyweight', cues: ['Forearms on wall', 'Slide up and down', 'Keep contact throughout'], videoSearch: 'wall slide shoulder mobility' },
    ],
    3: [
      { id: 'db-press-neutral', name: 'Neutral-Grip DB Press (Limited ROM)', sets: 4, reps: 10, restSeconds: 90, loadGuidance: 'moderate DB, 50% normal', cues: ['Palms facing each other', 'Stop just before pain', 'No lockout if painful'], videoSearch: 'neutral grip dumbbell press' },
      { id: 'face-pull', name: 'Face Pulls', sets: 4, reps: 15, restSeconds: 90, loadGuidance: 'cable or band', cues: ['Pull to forehead level', 'Elbows high', 'Squeeze rear delts'], videoSearch: 'face pull cable' },
      { id: 'cable-row-neutral', name: 'Neutral-Grip Cable Row', sets: 3, reps: 12, restSeconds: 90, loadGuidance: 'moderate', cues: ['Squeeze shoulder blades', 'Keep shoulders down', 'Pause at full retraction'], videoSearch: 'neutral grip cable row' },
      { id: 'hsr-er', name: 'Heavy-Slow ER (Side-Lying)', sets: 4, reps: 10, restSeconds: 120, loadGuidance: 'moderate DB, 3s up / 3s down', cues: ['Side-lying, top arm', 'Tempo is the work', 'Shoulder pain ≤3/10'], evidenceNote: 'HSR is gold-standard for tendinopathy (Kongsgaard 2009)', videoSearch: 'heavy slow resistance shoulder' },
    ],
    4: [
      { id: 'incline-db-press', name: 'Incline DB Press (Full ROM)', sets: 4, reps: 8, restSeconds: 120, loadGuidance: '70% normal weight', cues: ['Full pain-free ROM', 'Don\'t flare elbows', 'Tempo 2-1-X'], videoSearch: 'incline dumbbell press form' },
      { id: 'pull-up-neutral', name: 'Neutral-Grip Pull-Up', sets: 3, reps: 6, restSeconds: 120, loadGuidance: 'bodyweight or assisted', cues: ['Palms facing each other', 'Full hang at bottom', 'Chin to bar'], videoSearch: 'neutral grip pull up' },
      { id: 'overhead-press-light', name: 'Light Overhead Press', sets: 3, reps: 8, restSeconds: 120, loadGuidance: '60% normal', cues: ['Stop just below sticking point', 'Brace core', 'Test ROM weekly'], videoSearch: 'overhead press form' },
      { id: 'turkish-getup-light', name: 'Light Turkish Get-Up', sets: 3, reps: 3, restSeconds: 120, loadGuidance: 'light KB', cues: ['Eyes on bell whole time', 'Slow and deliberate', 'Tests stability under load'], videoSearch: 'turkish getup tutorial' },
    ],
    5: [
      { id: 'overhead-press-full', name: 'Overhead Press (Full Load)', sets: 4, reps: 5, restSeconds: 150, loadGuidance: '85% normal', cues: ['Full lockout overhead', 'No pain through ROM', 'Build to 90%+ over weeks'], videoSearch: 'overhead press form' },
      { id: 'mb-throw-overhead', name: 'Overhead Med Ball Throw', sets: 4, reps: 6, restSeconds: 90, loadGuidance: '4-6kg ball', cues: ['Throw against wall', 'Catch and reset', 'Build to explosive'], videoSearch: 'overhead medicine ball throw' },
      { id: 'pushup-clap', name: 'Clap Push-Up Progression', sets: 3, reps: 5, restSeconds: 120, loadGuidance: 'bodyweight, plyo', cues: ['Push hard off floor', 'Quick clap, soft land', 'Quality over reps'], videoSearch: 'plyometric push up progression' },
      { id: 'sport-pushing', name: 'Sport-Specific Drill', sets: 1, durationSeconds: 600, restSeconds: 0, loadGuidance: 'positional, sub-max', cues: ['Pummeling / clinch / shadow', 'Build to 80% intensity', 'Test the shoulder at sport demand'], videoSearch: '' },
    ],
  },

  // ── LOWER BACK ────────────────────────────────────────────────────────
  lower_back: {
    1: [
      { id: 'mckenzie-prone-ext', name: 'Prone Press-Up (McKenzie)', sets: 2, reps: 10, restSeconds: 30, loadGuidance: 'bodyweight', cues: ['Lie face down, press up on hands', 'Hips on floor', 'Stop if pain radiates down leg'], videoSearch: 'mckenzie press up extension' },
      { id: 'cat-cow', name: 'Cat-Cow', sets: 2, reps: 10, restSeconds: 30, loadGuidance: 'bodyweight', cues: ['Slow segmental movement', 'Breathe with each rep', 'Pain-free range only'], videoSearch: 'cat cow stretch' },
      { id: 'pelvic-tilt', name: 'Supine Pelvic Tilts', sets: 2, reps: 15, restSeconds: 30, loadGuidance: 'bodyweight', cues: ['Knees bent, feet flat', 'Tilt pelvis back, flatten low back', 'Engage core gently'], videoSearch: 'pelvic tilt low back rehab' },
      { id: 'walking', name: 'Walking (Pain-Free)', sets: 1, durationSeconds: 600, restSeconds: 0, loadGuidance: 'easy pace', cues: ['10 minutes', 'Stop if pain increases', 'Movement is medicine for back'], videoSearch: '' },
    ],
    2: [
      { id: 'mcgill-bigthree-curlup', name: 'McGill Curl-Up', sets: 3, reps: 8, durationSeconds: 8, restSeconds: 45, loadGuidance: 'bodyweight', cues: ['One leg bent, hands under low back', 'Lift head and shoulders', 'Hold 8s'], evidenceNote: 'McGill Big 3 — gold-standard back rehab (McGill 2007)', videoSearch: 'mcgill curl up big three' },
      { id: 'mcgill-bigthree-side-plank', name: 'Side Plank (McGill)', sets: 3, durationSeconds: 20, restSeconds: 45, loadGuidance: 'from knees if needed', cues: ['Stack feet or knees', 'Hips up, body straight', 'Build duration weekly'], evidenceNote: 'McGill Big 3', videoSearch: 'side plank mcgill big three' },
      { id: 'mcgill-bigthree-bird-dog', name: 'Bird Dog', sets: 3, reps: 8, durationSeconds: 5, restSeconds: 45, loadGuidance: 'bodyweight', cues: ['Opposite arm and leg', 'No hip rotation', 'Hold 5s each rep'], evidenceNote: 'McGill Big 3', videoSearch: 'bird dog exercise mcgill' },
      { id: 'glute-bridge-march', name: 'Glute Bridge March', sets: 3, reps: 10, restSeconds: 60, loadGuidance: 'bodyweight', cues: ['Bridge up first', 'March knees up alternating', 'No hip drop'], videoSearch: 'glute bridge march' },
    ],
    3: [
      { id: 'goblet-squat', name: 'Goblet Squat (Light)', sets: 4, reps: 10, restSeconds: 90, loadGuidance: '50% normal', cues: ['Brace before each rep', 'Pain-free depth', 'Slow tempo'], videoSearch: 'goblet squat form' },
      { id: 'kb-deadlift-light', name: 'KB Deadlift (Light)', sets: 4, reps: 8, restSeconds: 90, loadGuidance: 'light KB', cues: ['Hip hinge pattern', 'Long spine', 'Brace through whole rep'], videoSearch: 'kettlebell deadlift form' },
      { id: 'farmers-carry', name: 'Farmers Carry', sets: 3, durationSeconds: 30, restSeconds: 90, loadGuidance: 'moderate DBs', cues: ['Tall posture', 'Brace core', 'Don\'t lean side to side'], videoSearch: 'farmers carry form' },
      { id: 'reverse-lunge', name: 'Reverse Lunge', sets: 3, reps: 10, restSeconds: 90, loadGuidance: 'bodyweight or light DB', cues: ['Step back, drop straight down', 'Less spinal load than forward lunge', 'Knee under hip'], videoSearch: 'reverse lunge form' },
      { id: 'pallof-press', name: 'Pallof Press', sets: 3, reps: 12, restSeconds: 60, loadGuidance: 'cable or band', cues: ['Resist rotation', 'Press out, hold 2s', 'Brace hard'], evidenceNote: 'Anti-rotation = #1 transferable core skill', videoSearch: 'pallof press anti rotation' },
    ],
    4: [
      { id: 'trap-bar-deadlift', name: 'Trap Bar Deadlift', sets: 4, reps: 6, restSeconds: 120, loadGuidance: '70% normal', cues: ['Less spinal flexion than barbell DL', 'Drive floor away', 'Brace hard'], videoSearch: 'trap bar deadlift form' },
      { id: 'front-squat-light', name: 'Front Squat (Light)', sets: 3, reps: 6, restSeconds: 120, loadGuidance: '60% normal', cues: ['Upright torso', 'Builds back resilience without spinal compression', 'Tempo 3-1-1'], videoSearch: 'front squat form' },
      { id: 'rdl-light', name: 'Romanian Deadlift (Moderate)', sets: 3, reps: 8, restSeconds: 120, loadGuidance: '60% normal', cues: ['Hip hinge focus', 'Bar close to body', 'Hamstring stretch but no low-back strain'], videoSearch: 'romanian deadlift form' },
      { id: 'suitcase-carry', name: 'Suitcase Carry', sets: 3, durationSeconds: 30, restSeconds: 90, loadGuidance: 'heavy DB, one side', cues: ['Don\'t lean toward weight', 'Brace hard', 'Anti-lateral flexion'], videoSearch: 'suitcase carry' },
    ],
    5: [
      { id: 'deadlift-progression', name: 'Conventional Deadlift (Progressive)', sets: 4, reps: 5, restSeconds: 180, loadGuidance: 'build from 70% to 90% over weeks', cues: ['Reset every rep', 'Brace before pull', 'Volume comes last'], videoSearch: 'deadlift form coaching' },
      { id: 'back-squat-progression', name: 'Back Squat (Progressive)', sets: 4, reps: 5, restSeconds: 180, loadGuidance: 'build to 85% normal', cues: ['Tight back', 'Pain-free depth', 'Cue from coach if available'], videoSearch: 'back squat form' },
      { id: 'mb-rotational-throw', name: 'Rotational Med Ball Throw', sets: 4, reps: 6, restSeconds: 90, loadGuidance: '4-6kg', cues: ['Hip drives rotation, not low back', 'Throw to wall, catch, reset', 'Power through hips'], videoSearch: 'rotational med ball throw' },
      { id: 'sport-grappling', name: 'Sport-Specific Drilling', sets: 1, durationSeconds: 900, restSeconds: 0, loadGuidance: 'positional, no spazz', cues: ['Drilling at 70%', 'No live rolling yet', 'Test the back at sport demand'], videoSearch: '' },
    ],
  },

  // ── ANKLE ─────────────────────────────────────────────────────────────
  left_ankle: {
    1: [
      { id: 'ankle-alphabet', name: 'Ankle Alphabet', sets: 2, reps: 1, restSeconds: 30, loadGuidance: 'bodyweight, slow', cues: ['Trace letters A-Z with toe', 'Pain-free range', 'Builds ROM gently'], videoSearch: 'ankle alphabet rehab' },
      { id: 'isometric-inv-ev', name: 'Isometric Inversion/Eversion', sets: 3, durationSeconds: 5, reps: 10, restSeconds: 30, loadGuidance: 'wall pressure', cues: ['Press foot into wall both directions', 'No movement', 'Builds tendon load tolerance'], videoSearch: 'ankle isometric rehab' },
      { id: 'towel-scrunches', name: 'Towel Scrunches', sets: 3, reps: 15, restSeconds: 30, loadGuidance: 'bodyweight', cues: ['Bunch towel under toes', 'Builds intrinsic foot strength'], videoSearch: 'towel scrunches foot rehab' },
    ],
    2: [
      { id: 'calf-raise-double', name: 'Double-Leg Calf Raise', sets: 3, reps: 15, restSeconds: 60, loadGuidance: 'bodyweight', cues: ['Full ROM up and down', 'Slow tempo', 'Both feet'], videoSearch: 'double leg calf raise' },
      { id: 'heel-walks', name: 'Heel Walks', sets: 2, durationSeconds: 30, restSeconds: 45, loadGuidance: 'bodyweight', cues: ['Walk on heels only', 'Strengthens dorsiflexors'], videoSearch: 'heel walks rehab' },
      { id: 'toe-walks', name: 'Toe Walks', sets: 2, durationSeconds: 30, restSeconds: 45, loadGuidance: 'bodyweight', cues: ['Walk on balls of feet', 'Strengthens calves'], videoSearch: 'toe walks rehab' },
      { id: 'single-leg-balance', name: 'Single-Leg Balance', sets: 3, durationSeconds: 30, restSeconds: 45, loadGuidance: 'bodyweight', cues: ['Eyes open then closed', 'Builds proprioception', 'Critical for ankle re-injury prevention'], videoSearch: 'single leg balance proprioception' },
    ],
    3: [
      { id: 'calf-raise-single', name: 'Single-Leg Calf Raise', sets: 4, reps: 12, restSeconds: 90, loadGuidance: 'bodyweight, full ROM', cues: ['Use hand for balance only', 'Full stretch at bottom', '3s eccentric'], videoSearch: 'single leg calf raise' },
      { id: 'eccentric-heel-drop', name: 'Eccentric Heel Drops (Alfredson)', sets: 3, reps: 15, restSeconds: 90, loadGuidance: 'bodyweight, off step', cues: ['Lift up with both feet', 'Lower with injured foot only', '3s descent'], evidenceNote: 'Alfredson protocol — gold-standard for Achilles tendinopathy', videoSearch: 'alfredson protocol heel drops' },
      { id: 'lateral-band-walks', name: 'Lateral Band Walks', sets: 3, reps: 15, restSeconds: 60, loadGuidance: 'light band', cues: ['Band around ankles', 'Step sideways', 'Tension throughout'], videoSearch: 'lateral band walk rehab' },
      { id: 'bosu-balance', name: 'Bosu Balance Work', sets: 3, durationSeconds: 30, restSeconds: 60, loadGuidance: 'bodyweight, unstable', cues: ['Stand on dome side', 'Add small squats', 'Builds ankle stability'], videoSearch: 'bosu ball balance' },
    ],
    4: [
      { id: 'jump-rope-low', name: 'Jump Rope (Low Amplitude)', sets: 3, durationSeconds: 60, restSeconds: 90, loadGuidance: 'bodyweight', cues: ['Tiny bounces 1-2 inches', 'Land soft on balls of feet', 'Build duration over weeks'], videoSearch: 'jump rope basics' },
      { id: 'pogo-jumps-2', name: 'Pogo Jumps', sets: 4, reps: 15, restSeconds: 60, loadGuidance: 'bodyweight', cues: ['Stiff ankles, springy', 'Soft landings', 'Reactive strength'], videoSearch: 'pogo jumps plyometric' },
      { id: 'lateral-line-hops', name: 'Lateral Line Hops', sets: 3, reps: 20, restSeconds: 90, loadGuidance: 'bodyweight', cues: ['Side-to-side over a line', 'Quick feet', 'Pain-free landings'], videoSearch: 'lateral line hops agility' },
      { id: 'single-leg-hop-stick', name: 'Single-Leg Hop and Stick', sets: 3, reps: 6, restSeconds: 90, loadGuidance: 'bodyweight', cues: ['Hop forward, stick landing for 2s', 'Soft knee on landing', 'Builds confidence'], videoSearch: 'single leg hop and stick' },
    ],
    5: [
      { id: 'cutting-drills', name: 'Cutting / COD Drills', sets: 4, reps: 4, restSeconds: 120, loadGuidance: 'bodyweight, build to max', cues: ['Plant and cut', 'Both directions', 'Build from 70% to max effort'], videoSearch: 'cutting drills agility' },
      { id: 'box-jump-low-2', name: 'Low Box Jump', sets: 4, reps: 5, restSeconds: 120, loadGuidance: 'bodyweight, 12-18in', cues: ['Stick landing', 'Step down', 'Build height over weeks'], videoSearch: 'box jump form' },
      { id: 'depth-drop', name: 'Depth Drop (Stick)', sets: 4, reps: 5, restSeconds: 120, loadGuidance: 'bodyweight, low box', cues: ['Step off box, stick landing', 'Don\'t jump up after', 'Trains landing mechanics'], videoSearch: 'depth drop landing' },
      { id: 'sport-footwork', name: 'Sport-Specific Footwork', sets: 1, durationSeconds: 900, restSeconds: 0, loadGuidance: 'sub-max', cues: ['Shadow boxing, footwork drills', 'Lateral / pivot / cut', 'Test the ankle at sport demand'], videoSearch: '' },
    ],
  },
};

// Mirror left → right for all paired regions
function buildMirroredLibrary(): RehabLibrary {
  const lib: RehabLibrary = { ...REHAB_LIBRARY };
  const pairs: [BodyRegion, BodyRegion][] = [
    ['left_knee', 'right_knee'],
    ['left_shoulder', 'right_shoulder'],
    ['left_ankle', 'right_ankle'],
  ];
  for (const [left, right] of pairs) {
    if (lib[left] && !lib[right]) {
      lib[right] = lib[left];
    }
  }
  return lib;
}

const FULL_REHAB_LIBRARY = buildMirroredLibrary();

// ---------------------------------------------------------------------------
// Phase-level prescriptions
// ---------------------------------------------------------------------------

const PHASE_META: Record<RehabPhaseNumber, { name: string; goal: string; painCap: number; durationMins: number }> = {
  1: { name: 'Protected Movement',       goal: 'Calm the tissue. Protect, mobilize gently, prevent atrophy.',                    painCap: 3,  durationMins: 15 },
  2: { name: 'Controlled Loading',       goal: 'Reintroduce load. Build the foundation for strength rebuilding.',                painCap: 4,  durationMins: 25 },
  3: { name: 'Progressive Strengthening',goal: 'Restore full strength. Progressive overload through pain-free ROM.',            painCap: 4,  durationMins: 35 },
  4: { name: 'Integration',              goal: 'Reintroduce compound lifts and sport-adjacent movement at sub-max intensity.',   painCap: 3,  durationMins: 45 },
  5: { name: 'Return to Sport',          goal: 'Restore sport-specific demands. Plyometrics, contact, full intensity testing.',  painCap: 2,  durationMins: 50 },
};

const PHASE_RED_FLAGS: string[] = [
  'Sharp pain >5/10 during exercise — stop and reassess',
  'Pain that doesn\'t settle within 24h — too much load',
  'Increasing morning stiffness day-over-day — back off',
  'New radiating pain or numbness — see a clinician',
  'Visible swelling that doesn\'t reduce with rest/ice',
];

const POST_SESSION_GUIDANCE: Record<RehabPhaseNumber, string> = {
  1: 'Apply ice if there\'s post-exercise inflammation. Note any pain spike — should be back to baseline within 1h.',
  2: 'Pain during exercise should stay ≤4/10 and return to baseline within 24h. If it doesn\'t, drop the load 20%.',
  3: 'You should be able to do these without spiking morning stiffness. If stiffness increases day-over-day, hold the volume.',
  4: 'You\'re reintroducing real training load. Watch for signs of compensation in the rest of your body — those\'re early warning signs.',
  5: 'Track 24h symptom response after every session. Two consecutive bad responses = drop back to phase 4 work.',
};

// ---------------------------------------------------------------------------
// Generic fallback exercises (for regions without a deep library)
// ---------------------------------------------------------------------------

function genericFallback(phase: RehabPhaseNumber, region: BodyRegion): RehabExercise[] {
  switch (phase) {
    case 1:
      return [
        { id: 'gentle-rom', name: `Gentle ROM — ${labelRegion(region)}`, sets: 2, reps: 10, restSeconds: 30, loadGuidance: 'bodyweight, pain-free', cues: ['Move only as far as pain-free', 'Slow controlled', 'Stop at first hint of pain'], videoSearch: `${region} gentle ROM rehab` },
        { id: 'isometric-hold', name: 'Pain-Free Isometric Hold', sets: 3, durationSeconds: 5, reps: 8, restSeconds: 45, loadGuidance: '50% effort', cues: ['Press into a stable surface', 'Hold 5s', 'No movement'], videoSearch: `${region} isometric exercise` },
      ];
    case 2:
      return [
        { id: 'light-resistance', name: `Light Resistance — ${labelRegion(region)}`, sets: 3, reps: 12, restSeconds: 60, loadGuidance: 'light band or 50% normal', cues: ['Slow eccentric', 'Pain-free range', 'Build reps before load'], videoSearch: `${region} light resistance rehab` },
        { id: 'unaffected-training', name: 'Train Unaffected Areas', sets: 1, durationSeconds: 1800, restSeconds: 0, loadGuidance: 'normal load', cues: ['Full session for body parts not affected', 'Maintain training stimulus elsewhere'], videoSearch: '' },
      ];
    case 3:
      return [
        { id: 'progressive-load', name: `Progressive Load — ${labelRegion(region)}`, sets: 4, reps: 10, restSeconds: 90, loadGuidance: '70% normal', cues: ['Tempo 3-1-1', 'Pain ≤3/10', 'Build weight weekly'], videoSearch: `${region} progressive loading rehab` },
      ];
    case 4:
      return [
        { id: 'compound-light', name: 'Compound Movements (Sub-Max)', sets: 4, reps: 6, restSeconds: 120, loadGuidance: '70-80% normal', cues: ['Reintroduce big lifts', 'Pain-free ROM', 'Test under load'], videoSearch: 'compound lifts rehab' },
      ];
    case 5:
      return [
        { id: 'sport-test', name: 'Sport-Specific Test', sets: 1, durationSeconds: 600, restSeconds: 0, loadGuidance: 'sub-max → max', cues: ['Test the affected area at sport demand', 'Build from 70% to 100%', 'Track 24h response'], videoSearch: '' },
      ];
  }
}

function labelRegion(region: BodyRegion): string {
  const map: Record<BodyRegion, string> = {
    neck: 'Neck',
    left_shoulder: 'Left Shoulder', right_shoulder: 'Right Shoulder',
    chest: 'Chest', upper_back: 'Upper Back', lower_back: 'Lower Back', core: 'Core',
    left_elbow: 'Left Elbow', right_elbow: 'Right Elbow',
    left_wrist: 'Left Wrist', right_wrist: 'Right Wrist',
    left_hip: 'Left Hip', right_hip: 'Right Hip',
    left_knee: 'Left Knee', right_knee: 'Right Knee',
    left_ankle: 'Left Ankle', right_ankle: 'Right Ankle',
  };
  return map[region];
}

// ---------------------------------------------------------------------------
// Warm-Up / Cool-Down
// ---------------------------------------------------------------------------

function warmUpFor(region: BodyRegion, phase: RehabPhaseNumber): string[] {
  const generic = ['5 min easy cardio (bike, walk, light row)', 'Joint circles for unaffected areas'];
  const region_specific: Partial<Record<BodyRegion, string[]>> = {
    left_knee: ['Stationary bike 5-8 min, easy resistance', 'Glute activation: clamshells x 10/side', 'Quad sets x 10'],
    right_knee: ['Stationary bike 5-8 min, easy resistance', 'Glute activation: clamshells x 10/side', 'Quad sets x 10'],
    left_shoulder: ['Pendulums x 10 each direction', 'Scapular CARs x 5 each direction', 'Wall slides x 10'],
    right_shoulder: ['Pendulums x 10 each direction', 'Scapular CARs x 5 each direction', 'Wall slides x 10'],
    lower_back: ['Cat-cow x 10', 'Bird-dog x 8/side', 'Glute bridges x 10'],
    left_ankle: ['Ankle alphabet', 'Calf stretch 30s', 'Single-leg balance x 30s'],
    right_ankle: ['Ankle alphabet', 'Calf stretch 30s', 'Single-leg balance x 30s'],
  };
  if (phase >= 4) {
    return [...generic, ...(region_specific[region] || []), 'Movement-specific prep (pogo jumps, light plyo if appropriate)'];
  }
  return [...generic, ...(region_specific[region] || [])];
}

function coolDownFor(region: BodyRegion, phase: RehabPhaseNumber): string[] {
  const generic = ['Slow walking 3 min', 'Box breathing 2 min'];
  if (phase <= 2) {
    return [...generic, 'Ice 10-15 min if any inflammation', 'Gentle stretching of unaffected areas'];
  }
  return [...generic, 'Foam roll unaffected areas', `Static stretch ${labelRegion(region)} (gentle, pain-free)`];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate today's rehab session for a logged injury.
 * Optionally accepts a phase override (when the user manually advanced).
 */
export function generateRehabSession(
  injury: InjuryEntry,
  phaseOverride?: RehabPhaseNumber
): RehabSession {
  const classification = classifyInjury(injury);
  const timeline = getInjuryTimeline(injury);
  const derivedPhase = mapClassificationToRehabPhase(classification, timeline.daysSinceInjury);
  const phase = phaseOverride ?? derivedPhase;

  const meta = PHASE_META[phase];
  const exercises = FULL_REHAB_LIBRARY[injury.bodyRegion]?.[phase]
    ?? genericFallback(phase, injury.bodyRegion);

  return {
    injuryId: injury.id,
    bodyRegion: injury.bodyRegion,
    tissueType: classification.tissueType,
    phase,
    phaseName: meta.name,
    phaseGoal: meta.goal,
    estimatedMinutes: meta.durationMins,
    painCap: meta.painCap,
    warmUp: warmUpFor(injury.bodyRegion, phase),
    exercises,
    coolDown: coolDownFor(injury.bodyRegion, phase),
    postSessionGuidance: POST_SESSION_GUIDANCE[phase],
    redFlags: PHASE_RED_FLAGS,
  };
}

/**
 * Build a daily rehab plan with motivational framing and progress context.
 */
export function getDailyRehabPlan(
  injury: InjuryEntry,
  state?: RehabState
): DailyRehabPlan {
  const classification = classifyInjury(injury);
  const timeline = getInjuryTimeline(injury);
  const derivedPhase = mapClassificationToRehabPhase(classification, timeline.daysSinceInjury);
  const phase = state?.phaseOverride ?? derivedPhase;

  const session = generateRehabSession(injury, phase);

  // Days in current phase: count check-ins at this phase, fallback to 1
  const daysInPhase = state?.checkIns.filter(c => {
    // We don't store phase on check-in; approximate by date span
    const days = (Date.now() - new Date(c.date).getTime()) / (1000 * 60 * 60 * 24);
    return days <= 30;
  }).length || 1;

  const focus = focusForPhase(phase, classification.tissueType);
  const cue = motivationalCueForPhase(phase);
  const milestone = nextMilestone(phase, timeline.estimatedDaysRemaining);

  return {
    injuryId: injury.id,
    date: new Date().toISOString().slice(0, 10),
    phase,
    phaseName: PHASE_META[phase].name,
    daysSinceInjury: timeline.daysSinceInjury,
    daysInPhase,
    percentHealed: timeline.percentHealed,
    session,
    todaysFocus: focus,
    motivationalCue: cue,
    nextMilestone: milestone,
  };
}

function focusForPhase(phase: RehabPhaseNumber, tissue: TissueType): string {
  if (phase === 1) return 'Calm the tissue. Move what you can without pain. No heroics today.';
  if (phase === 2) {
    if (tissue === 'tendon') return 'Heavy slow resistance and isometrics. Tendons love load — give it slow, controlled load.';
    return 'Reintroduce load. Quality reps, slow eccentrics, pain ≤4/10.';
  }
  if (phase === 3) return 'Build the strength back. Progressive overload through pain-free ROM. The tissue is ready for work.';
  if (phase === 4) return 'Integrate compound lifts and sport-adjacent movement. You\'re training again — just smarter.';
  return 'Sport-specific demands. Plyometrics, contact, full intensity testing. Earn the return.';
}

function motivationalCueForPhase(phase: RehabPhaseNumber): string {
  switch (phase) {
    case 1: return 'Patience is the work. Every elite athlete has been here.';
    case 2: return 'Loading is healing. Tissues adapt to demand.';
    case 3: return 'You\'re past the worst. Stack the small wins.';
    case 4: return 'You\'re a trainee with a constraint, not an injured person. Train.';
    case 5: return 'The final test. Sport demand at full intensity. Earn it.';
  }
}

function nextMilestone(phase: RehabPhaseNumber, daysLeft: { min: number; max: number }): string {
  const range = daysLeft.min === daysLeft.max ? `${daysLeft.min}d` : `${daysLeft.min}-${daysLeft.max}d`;
  switch (phase) {
    case 1: return `Phase 2 (Controlled Loading) in ~${range}`;
    case 2: return `Phase 3 (Strengthening) — pain-free at light resistance`;
    case 3: return `Phase 4 (Integration) — 70% load pain-free`;
    case 4: return `Phase 5 (Return to Sport) — 90% load + compound lifts`;
    case 5: return `Full clearance — pain-free at 100% sport demand`;
  }
}

/**
 * Evaluate whether the user can advance to the next phase.
 * Looks at recent check-ins + the criteria from injury-science.
 */
export function evaluatePhaseAdvancement(
  injury: InjuryEntry,
  state: RehabState,
  recentCheckInDays: number = 5
): PhaseAdvancementResult {
  const classification = classifyInjury(injury);
  const timeline = getInjuryTimeline(injury);
  const currentPhase = state.phaseOverride
    ?? mapClassificationToRehabPhase(classification, timeline.daysSinceInjury);

  if (currentPhase >= 5) {
    return {
      canAdvance: false,
      currentPhase,
      proposedPhase: 5,
      metCriteria: ['You\'re in the final phase'],
      unmetCriteria: [],
      recommendation: 'Continue sport-specific testing until pain-free at 100% intensity, then mark injury resolved.',
    };
  }

  const cutoff = Date.now() - recentCheckInDays * 24 * 60 * 60 * 1000;
  const recent = state.checkIns
    .filter(c => new Date(c.date).getTime() >= cutoff)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const met: string[] = [];
  const unmet: string[] = [];

  // Need at least 3 recent check-ins
  if (recent.length < 3) {
    unmet.push(`Need at least 3 check-ins in the last ${recentCheckInDays} days (have ${recent.length})`);
  } else {
    met.push(`${recent.length} check-ins logged`);
  }

  // Criteria depend on current phase
  if (currentPhase === 1) {
    if (recent.every(c => c.painAtRest <= 3)) met.push('Pain at rest ≤3/10');
    else unmet.push('Pain at rest must be ≤3/10 across check-ins');
    if (recent.every(c => c.swellingLevel === 'none' || c.swellingLevel === 'mild')) met.push('Swelling controlled');
    else unmet.push('Swelling must be none/mild to advance');
  }
  if (currentPhase === 2) {
    if (recent.every(c => c.painDuringExercise <= 4)) met.push('Pain during exercise ≤4/10');
    else unmet.push('Pain during exercise must be ≤4/10');
    if (recent.every(c => c.painAfter24h <= 3)) met.push('Pain returns to baseline within 24h');
    else unmet.push('Pain must return to baseline within 24h (Silbernagel rule)');
    if (recent.every(c => c.romPercent >= 75)) met.push('ROM ≥75% of uninjured side');
    else unmet.push('ROM must be ≥75% of uninjured side');
  }
  if (currentPhase === 3) {
    if (recent.every(c => c.painDuringExercise <= 3)) met.push('Pain during exercise ≤3/10');
    else unmet.push('Pain during exercise must be ≤3/10');
    if (recent.every(c => c.romPercent >= 90)) met.push('ROM ≥90% of uninjured side');
    else unmet.push('ROM must be ≥90% of uninjured side');
    if (recent.filter(c => c.completedSession).length >= 3) met.push('3+ completed sessions in last 5 days');
    else unmet.push('Need 3+ completed sessions in last 5 days');
  }
  if (currentPhase === 4) {
    if (recent.every(c => c.painDuringExercise <= 2)) met.push('Pain during exercise ≤2/10');
    else unmet.push('Pain during exercise must be ≤2/10 to enter Return to Sport');
    if (recent.every(c => c.painAfter24h <= 1)) met.push('No 24h symptom flare');
    else unmet.push('No 24h symptom flare across check-ins');
    if (recent.every(c => c.romPercent >= 95)) met.push('ROM ≥95% of uninjured side');
    else unmet.push('ROM must be ≥95% to enter sport demand');
  }

  const canAdvance = unmet.length === 0 && recent.length >= 3;
  const proposedPhase = canAdvance ? ((currentPhase + 1) as RehabPhaseNumber) : currentPhase;

  let recommendation: string;
  if (canAdvance) {
    recommendation = `You\'ve hit every gate for ${PHASE_META[currentPhase].name}. Advance to ${PHASE_META[proposedPhase].name}.`;
  } else if (recent.length < 3) {
    recommendation = `Log more check-ins to evaluate readiness. We need a multi-day pattern, not a snapshot.`;
  } else {
    recommendation = `Stay in ${PHASE_META[currentPhase].name}. The unmet gates protect you from re-injury — they\'re not arbitrary.`;
  }

  let warning: string | undefined;
  if (recent.some(c => c.painDuringExercise >= 6) || recent.some(c => c.painAfter24h >= 5)) {
    warning = 'High pain values detected in recent check-ins — consider stepping back a phase or seeing a clinician.';
  }

  return { canAdvance, currentPhase, proposedPhase, metCriteria: met, unmetCriteria: unmet, recommendation, warning };
}

/**
 * Get a phased timeline view showing all 5 phases with current/done/upcoming.
 */
export function getPhasedTimeline(injury: InjuryEntry, state?: RehabState): {
  phases: { phase: RehabPhaseNumber; name: string; status: 'completed' | 'current' | 'upcoming'; estimatedDays: number }[];
} {
  const classification = classifyInjury(injury);
  const timeline = getInjuryTimeline(injury);
  const currentPhase = state?.phaseOverride
    ?? mapClassificationToRehabPhase(classification, timeline.daysSinceInjury);

  const totalDays = classification.estimatedHealDays.max;
  const phaseDayEstimates: Record<RehabPhaseNumber, number> = {
    1: Math.round(totalDays * 0.15),
    2: Math.round(totalDays * 0.35),
    3: Math.round(totalDays * 0.20),
    4: Math.round(totalDays * 0.20),
    5: Math.round(totalDays * 0.10),
  };

  return {
    phases: ([1, 2, 3, 4, 5] as RehabPhaseNumber[]).map(p => ({
      phase: p,
      name: PHASE_META[p].name,
      status: p < currentPhase ? 'completed' : p === currentPhase ? 'current' : 'upcoming',
      estimatedDays: phaseDayEstimates[p],
    })),
  };
}

/**
 * Return-to-sport functional tests for the body region.
 * These gate the final clearance to full sport.
 */
export interface FunctionalTest {
  id: string;
  name: string;
  description: string;
  passingCriterion: string;
  videoSearch: string;
}

export function getReturnToSportTests(region: BodyRegion): FunctionalTest[] {
  const lowerBody = ['left_knee', 'right_knee', 'left_hip', 'right_hip', 'left_ankle', 'right_ankle'].includes(region);
  const upperBody = ['left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow', 'chest', 'upper_back'].includes(region);

  if (lowerBody) {
    return [
      { id: 'single-leg-hop', name: 'Single-Leg Hop for Distance', description: 'Hop forward as far as possible on one leg, stick the landing.', passingCriterion: '≥90% of uninjured side distance', videoSearch: 'single leg hop test' },
      { id: 'triple-hop', name: 'Triple Hop', description: 'Three consecutive forward hops on one leg.', passingCriterion: '≥90% of uninjured side total distance', videoSearch: 'triple hop test' },
      { id: 'crossover-hop', name: 'Crossover Hop', description: 'Three crossover hops on one leg over a line.', passingCriterion: '≥90% of uninjured side, no instability', videoSearch: 'crossover hop test' },
      { id: 'shuttle', name: '5-10-5 Shuttle', description: 'Pro agility shuttle test for change of direction.', passingCriterion: 'Within 10% of pre-injury time, no compensation', videoSearch: '5-10-5 shuttle test' },
      { id: 'depth-jump', name: 'Depth Jump (Reactive)', description: 'Step off a 12-inch box, land, and jump as high as possible.', passingCriterion: 'Confident landing, no pain, RSI within 10% of uninjured side', videoSearch: 'depth jump reactive strength' },
    ];
  }

  if (upperBody) {
    return [
      { id: 'closed-kinetic-test', name: 'Closed Kinetic Chain UE Test', description: '15s as many touches as possible between two lines (15in apart) in plank position.', passingCriterion: '≥90% of uninjured side touches', videoSearch: 'closed kinetic chain upper extremity test' },
      { id: 'mb-throw-test', name: 'Seated Med Ball Throw', description: 'Seated, throw 4kg ball from chest as far as possible.', passingCriterion: '≥90% of uninjured side distance', videoSearch: 'seated medicine ball throw test' },
      { id: 'pushup-max', name: '60s Push-Up Max', description: 'Max push-ups in 60 seconds.', passingCriterion: 'Within 10% of pre-injury count', videoSearch: 'push up endurance test' },
      { id: 'pull-up-max', name: 'Max Pull-Ups', description: 'Max consecutive pull-ups.', passingCriterion: 'Within 15% of pre-injury count', videoSearch: 'pull up max test' },
    ];
  }

  // Trunk / core
  return [
    { id: 'plank', name: 'Plank Hold', description: 'Front plank with neutral spine.', passingCriterion: '≥60s pain-free', videoSearch: 'plank hold form' },
    { id: 'side-plank', name: 'Side Plank Hold', description: 'Side plank both sides.', passingCriterion: '≥45s each side pain-free', videoSearch: 'side plank form' },
    { id: 'pallof-test', name: 'Pallof Hold', description: 'Hold band in extended position 30s, resist rotation.', passingCriterion: '30s each side, no shake/cheating', videoSearch: 'pallof hold' },
  ];
}

/**
 * Helper to create a fresh rehab state when user starts a rehab plan.
 */
export function createInitialRehabState(injuryId: string): RehabState {
  return {
    injuryId,
    startedAt: new Date().toISOString(),
    checkIns: [],
  };
}

/**
 * Helper to create a check-in with a generated id.
 */
export function buildCheckIn(input: Omit<RehabCheckIn, 'id'>): RehabCheckIn {
  return { id: `chk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...input };
}
