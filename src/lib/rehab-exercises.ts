/**
 * Rehab exercise database — Tier 0 data module
 *
 * Pure data: keyed by (BodyRegion → RehabPhaseNumber) with phase-appropriate
 * exercise prescriptions. Imported by `rehab-engine.ts`.
 *
 * No internal imports beyond `types.ts` (BodyRegion).
 *
 * Evidence sources:
 *   - Bleakley 2012   POLICE protocol (acute phase)
 *   - Khan & Scott 2009  Mechanotherapy / progressive loading
 *   - Cook & Purdam 2009  Tendinopathy continuum
 *   - Kongsgaard 2009     Heavy Slow Resistance for tendons
 *   - Alfredson protocol  Eccentric heel drops for Achilles
 *   - McGill 2007         Big 3 for low back
 *   - Al Attar 2017       Nordics reduce hamstring re-injury risk
 */

import type { BodyRegion } from './types';

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

export type RehabLibrary = Partial<Record<BodyRegion, Record<RehabPhaseNumber, RehabExercise[]>>>;

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------

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

// Mirror left → right for paired regions
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

export const FULL_REHAB_LIBRARY: RehabLibrary = buildMirroredLibrary();
