/**
 * Plyometric / Speed-Strength Engine
 *
 * 6-week periodized plyometric program built on Verkhoshansky's shock-method
 * methodology. Distinct from the existing "power" lifting day (which is
 * barbell-flavored, 3-6 reps explosive). This is jump training — the missing
 * piece for combat athletes who need RFD (rate of force development), reactive
 * strength, and explosive power transfer.
 *
 * Periodization (Verkhoshansky / Bompa):
 *   Week 1-2: Extensive Acclimation     — 80-120 contacts, low intensity
 *   Week 3-4: Intensive Loading         — 60-80 contacts, medium intensity
 *   Week 5:   Reactive / Shock          — 40-60 contacts, high intensity (depth jumps)
 *   Week 6:   Contrast / Peak           — 30-50 contacts, paired with heavy lifts (PAP)
 *
 * Volume floors and intensity progressions follow:
 *   - Newton & Kraemer 1994 — Mixed methods superiority
 *   - Cormie et al. 2011    — Power training periodization
 *   - Verkhoshansky 1969    — Shock method origin
 *   - Tillin & Bishop 2009  — Post-activation potentiation
 *   - Flanagan & Comyns 2008 — Reactive Strength Index
 *
 * Critical safety rules:
 *   - Depth jumps require 1.5x bodyweight back squat strength prerequisite
 *   - 48h between high-intensity plyo sessions
 *   - Contact volume is the load — count every ground contact
 */

import { v4 as uuidv4 } from 'uuid';
import type { TrainingIdentity, WorkoutSession, ExercisePrescription, Exercise } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlyoCategory = 'extensive' | 'intensive' | 'reactive' | 'shock' | 'contrast';
export type PlyoBodyFocus = 'lower' | 'upper' | 'full';
export type PlyoExperience = 'beginner' | 'intermediate' | 'advanced';

export interface PlyoExercise {
  id: string;
  name: string;
  category: PlyoCategory;
  bodyFocus: 'lower' | 'upper' | 'full';
  sets: number;
  reps: number;
  contactsPerSet: number;        // ground contacts per set (for volume tracking)
  restSeconds: number;
  loadGuidance: string;
  cues: string[];
  videoSearch: string;
  contrastPairWith?: string;     // exercise id to pair with for PAP (week 6)
  intensityScore: number;        // 1-10
}

export interface PlyoSession {
  id: string;
  weekNumber: number;
  sessionNumber: number;        // session within the week (1, 2, or 3)
  phase: 'extensive' | 'intensive' | 'reactive' | 'contrast';
  phaseLabel: string;
  totalContacts: number;
  estimatedMinutes: number;
  warmUp: string[];
  exercises: PlyoExercise[];
  coolDown: string[];
  notes: string[];
}

export interface PlyoBlock {
  id: string;
  name: string;
  bodyFocus: PlyoBodyFocus;
  experience: PlyoExperience;
  weeks: number;
  sessionsPerWeek: number;
  startedAt: string;
  sessions: PlyoSession[];
  prerequisites: string[];
  expectedAdaptations: string[];
  rsiPretestSuggestion: string;
}

export interface PlyoBlockOptions {
  bodyFocus: PlyoBodyFocus;
  experience: PlyoExperience;
  trainingIdentity?: TrainingIdentity;
  weeks?: number;               // default 6
  sessionsPerWeek?: number;     // default 2 (combat athletes can't do 3+)
}

export interface RSITestProtocol {
  setupCues: string[];
  performance: string[];
  measurement: string[];
  goodScoreRange: { excellent: number; good: number; fair: number };
  formula: string;
}

// ---------------------------------------------------------------------------
// Exercise Library
// ---------------------------------------------------------------------------

const PLYO_LIBRARY: PlyoExercise[] = [
  // ── Extensive (low intensity, high volume) ────────────────────────────
  { id: 'pogo-jumps',          name: 'Pogo Jumps',                category: 'extensive', bodyFocus: 'lower', sets: 3, reps: 20, contactsPerSet: 20, restSeconds: 60, loadGuidance: 'bodyweight, stiff ankles', cues: ['Tiny bounces 2-3 inches', 'Land on balls of feet', 'Stiff ankle, springy', 'Quality > height'], videoSearch: 'pogo jumps plyometric', intensityScore: 2 },
  { id: 'ankle-hops',          name: 'Ankle Hops',                category: 'extensive', bodyFocus: 'lower', sets: 3, reps: 15, contactsPerSet: 15, restSeconds: 60, loadGuidance: 'bodyweight', cues: ['Drive ankles only', 'No knee bend', 'Quick contact'], videoSearch: 'ankle hops plyometric', intensityScore: 2 },
  { id: 'line-hops-lateral',   name: 'Lateral Line Hops',         category: 'extensive', bodyFocus: 'lower', sets: 3, reps: 20, contactsPerSet: 20, restSeconds: 60, loadGuidance: 'bodyweight, over a line', cues: ['Side to side over a line', 'Quick feet', 'Soft landings'], videoSearch: 'lateral line hops agility', intensityScore: 2 },
  { id: 'line-hops-forward',   name: 'Forward/Back Line Hops',    category: 'extensive', bodyFocus: 'lower', sets: 3, reps: 20, contactsPerSet: 20, restSeconds: 60, loadGuidance: 'bodyweight', cues: ['Hop forward and back over line', 'Stay on balls of feet', 'Reactive contact'], videoSearch: 'forward back line hops', intensityScore: 2 },
  { id: 'jump-rope-double',    name: 'Jump Rope (Double-Leg)',    category: 'extensive', bodyFocus: 'lower', sets: 5, reps: 60, contactsPerSet: 60, restSeconds: 45, loadGuidance: 'bodyweight, 60s rounds', cues: ['Light bounce', 'Tight rope, fast wrists', 'Combat staple'], videoSearch: 'jump rope plyometric', intensityScore: 2 },
  { id: 'skip-for-height',     name: 'Skip for Height',           category: 'extensive', bodyFocus: 'lower', sets: 3, reps: 12, contactsPerSet: 12, restSeconds: 60, loadGuidance: 'bodyweight', cues: ['Drive opposite knee high', 'Reach with arm', 'Quality skip'], videoSearch: 'skip for height plyometric', intensityScore: 3 },
  { id: 'med-ball-chest-pass', name: 'Med Ball Chest Pass',       category: 'extensive', bodyFocus: 'upper', sets: 3, reps: 10, contactsPerSet: 10, restSeconds: 60, loadGuidance: '4-6kg ball, against wall', cues: ['Explode through chest', 'Catch and reset', 'Build to fast'], videoSearch: 'medicine ball chest pass', intensityScore: 3 },

  // ── Intensive (medium intensity, medium volume) ───────────────────────
  { id: 'box-jump',            name: 'Box Jump',                  category: 'intensive', bodyFocus: 'lower', sets: 4, reps: 5, contactsPerSet: 5, restSeconds: 90, loadGuidance: 'bodyweight, 18-24in box', cues: ['Drive arms', 'Land soft on box', 'Step down (don\'t jump off)', 'Full hip extension'], videoSearch: 'box jump form', intensityScore: 5 },
  { id: 'broad-jump',          name: 'Broad Jump',                category: 'intensive', bodyFocus: 'lower', sets: 4, reps: 4, contactsPerSet: 4, restSeconds: 90, loadGuidance: 'bodyweight', cues: ['Triple extension — ankle, knee, hip', 'Reach long', 'Stick landing'], videoSearch: 'broad jump form', intensityScore: 6 },
  { id: 'split-squat-jump',    name: 'Split Squat Jump',          category: 'intensive', bodyFocus: 'lower', sets: 3, reps: 8, contactsPerSet: 8, restSeconds: 90, loadGuidance: 'bodyweight, switch legs in air', cues: ['Drop to lunge', 'Explode up', 'Switch lead leg mid-air'], videoSearch: 'split squat jump', intensityScore: 6 },
  { id: 'tuck-jump',           name: 'Tuck Jump',                 category: 'intensive', bodyFocus: 'lower', sets: 3, reps: 6, contactsPerSet: 6, restSeconds: 90, loadGuidance: 'bodyweight', cues: ['Drive knees to chest', 'Quick contact ground', 'Reset between reps'], videoSearch: 'tuck jump plyometric', intensityScore: 7 },
  { id: 'lateral-bound',       name: 'Lateral Bound',             category: 'intensive', bodyFocus: 'lower', sets: 4, reps: 6, contactsPerSet: 6, restSeconds: 90, loadGuidance: 'bodyweight, side to side', cues: ['Push off outside leg', 'Stick landing 2s', 'Hip drives the bound'], videoSearch: 'lateral bound plyometric', intensityScore: 6 },
  { id: 'bounding',            name: 'Bounding (Long)',           category: 'intensive', bodyFocus: 'lower', sets: 4, reps: 8, contactsPerSet: 8, restSeconds: 120, loadGuidance: 'bodyweight, exaggerated stride', cues: ['Long arms, long legs', 'Hang time on each step', 'Drive opposite knee'], videoSearch: 'bounding running drill', intensityScore: 7 },
  { id: 'single-leg-hop',      name: 'Single-Leg Forward Hop',    category: 'intensive', bodyFocus: 'lower', sets: 3, reps: 5, contactsPerSet: 5, restSeconds: 90, loadGuidance: 'bodyweight, each leg', cues: ['Hop forward, stick 1s', 'Soft knee landing', 'Both legs'], videoSearch: 'single leg hop plyo', intensityScore: 7 },
  { id: 'mb-rotational-throw', name: 'Med Ball Rotational Throw', category: 'intensive', bodyFocus: 'upper', sets: 4, reps: 5, contactsPerSet: 5, restSeconds: 90, loadGuidance: '4-8kg ball', cues: ['Hip drives rotation', 'Throw to wall', 'Both sides'], videoSearch: 'medicine ball rotational throw', intensityScore: 6 },
  { id: 'mb-overhead-slam',    name: 'Med Ball Overhead Slam',    category: 'intensive', bodyFocus: 'full',  sets: 4, reps: 6, contactsPerSet: 6, restSeconds: 90, loadGuidance: '6-10kg ball', cues: ['Full overhead extension', 'Slam with intent', 'Drive lats hard'], videoSearch: 'medicine ball slam', intensityScore: 7 },
  { id: 'plyo-pushup',         name: 'Plyo Push-Up',              category: 'intensive', bodyFocus: 'upper', sets: 3, reps: 6, contactsPerSet: 6, restSeconds: 120, loadGuidance: 'bodyweight, hands leave floor', cues: ['Push hard off floor', 'Soft catch', 'Quality > volume'], videoSearch: 'plyometric push up', intensityScore: 7 },

  // ── Reactive / Shock (high intensity, low volume) ─────────────────────
  { id: 'depth-drop',          name: 'Depth Drop (Stick)',        category: 'reactive',  bodyFocus: 'lower', sets: 4, reps: 4, contactsPerSet: 4, restSeconds: 150, loadGuidance: 'low box 12-18in', cues: ['Step off box, stick landing', 'Don\'t jump up after', 'Trains landing mechanics first'], videoSearch: 'depth drop plyometric', intensityScore: 7 },
  { id: 'depth-jump',          name: 'Depth Jump',                category: 'reactive',  bodyFocus: 'lower', sets: 4, reps: 4, contactsPerSet: 4, restSeconds: 180, loadGuidance: '18-24in box, bounce up max', cues: ['Step off, immediate explosion up', 'Ground contact <0.25s', 'Reach max height', 'PREREQ: 1.5x BW back squat'], videoSearch: 'depth jump plyometric', intensityScore: 9 },
  { id: 'depth-to-broad',      name: 'Depth Jump to Broad Jump',  category: 'reactive',  bodyFocus: 'lower', sets: 3, reps: 4, contactsPerSet: 4, restSeconds: 180, loadGuidance: '18in box → broad jump', cues: ['Drop, immediately broad jump for distance', 'Reactive ground contact', 'Reach long'], videoSearch: 'depth jump broad jump', intensityScore: 9 },
  { id: 'hurdle-hops',         name: 'Hurdle Hops (Reactive)',    category: 'reactive',  bodyFocus: 'lower', sets: 3, reps: 5, contactsPerSet: 5, restSeconds: 150, loadGuidance: '18in hurdles, reactive', cues: ['Quick ground contact between hurdles', 'Hands forward', 'Knees high'], videoSearch: 'hurdle hops plyometric', intensityScore: 8 },
  { id: 'depth-pushup',        name: 'Depth Push-Up',             category: 'reactive',  bodyFocus: 'upper', sets: 3, reps: 4, contactsPerSet: 4, restSeconds: 180, loadGuidance: 'fall from elevated hand position', cues: ['Hands on small boxes', 'Drop into push-up', 'Catch and explode up'], videoSearch: 'depth push up shock', intensityScore: 9 },
  { id: 'reactive-mb-throw',   name: 'Reactive Med Ball Throw',   category: 'reactive',  bodyFocus: 'upper', sets: 4, reps: 6, contactsPerSet: 6, restSeconds: 90, loadGuidance: '4-6kg, partner throws', cues: ['Catch and immediately throw back', 'No reset time', 'Combat-relevant reactivity'], videoSearch: 'reactive medicine ball partner', intensityScore: 7 },

  // ── Contrast (paired with heavy lift for PAP) ─────────────────────────
  { id: 'squat-broad-jump',    name: 'Heavy Squat → Broad Jump',  category: 'contrast',  bodyFocus: 'lower', sets: 4, reps: 3, contactsPerSet: 3, restSeconds: 240, loadGuidance: '85% squat 3 reps, rest 30s, 3 broad jumps', cues: ['Heavy squat first', 'Rest 30-60s for PAP', 'Then 3 max broad jumps', 'Repeat'], videoSearch: 'contrast training squat jump', intensityScore: 9, contrastPairWith: 'back-squat' },
  { id: 'deadlift-vert-jump',  name: 'Heavy DL → Vertical Jump',  category: 'contrast',  bodyFocus: 'lower', sets: 4, reps: 3, contactsPerSet: 3, restSeconds: 240, loadGuidance: '85% DL 1 rep, rest 60s, 3 verticals', cues: ['Single heavy DL pull', 'Rest 60s', 'Max vertical jumps', 'PAP effect'], videoSearch: 'contrast training deadlift jump', intensityScore: 9, contrastPairWith: 'deadlift' },
  { id: 'bench-mb-throw',      name: 'Heavy Bench → MB Throw',    category: 'contrast',  bodyFocus: 'upper', sets: 4, reps: 5, contactsPerSet: 5, restSeconds: 180, loadGuidance: '85% bench 3 reps, rest 60s, 5 throws', cues: ['Heavy bench first', 'Rest 60s', '5 max chest passes', 'PAP for striking power'], videoSearch: 'contrast training bench throw', intensityScore: 8, contrastPairWith: 'bench-press' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function filterForBodyFocus(focus: PlyoBodyFocus, exercises: PlyoExercise[]): PlyoExercise[] {
  if (focus === 'full') return exercises;
  return exercises.filter(e => e.bodyFocus === focus || e.bodyFocus === 'full');
}

function targetContactsForWeek(week: number, experience: PlyoExperience): number {
  // Beginners get ~70% of intermediate, advanced get +20%
  const expMultiplier = experience === 'beginner' ? 0.7 : experience === 'advanced' ? 1.2 : 1.0;
  const base = week <= 2 ? 100 : week <= 4 ? 70 : week === 5 ? 50 : 40;
  return Math.round(base * expMultiplier);
}

function phaseForWeek(week: number): PlyoSession['phase'] {
  if (week <= 2) return 'extensive';
  if (week <= 4) return 'intensive';
  if (week === 5) return 'reactive';
  return 'contrast';
}

function phaseLabel(phase: PlyoSession['phase']): string {
  switch (phase) {
    case 'extensive': return 'Extensive Acclimation';
    case 'intensive': return 'Intensive Loading';
    case 'reactive':  return 'Reactive / Shock';
    case 'contrast':  return 'Contrast / Peak (PAP)';
  }
}

// ---------------------------------------------------------------------------
// Session Builder
// ---------------------------------------------------------------------------

function buildSession(
  week: number,
  sessionNum: number,
  opts: PlyoBlockOptions
): PlyoSession {
  const phase = phaseForWeek(week);
  const targetContacts = targetContactsForWeek(week, opts.experience);
  const focusedPool = filterForBodyFocus(opts.bodyFocus, PLYO_LIBRARY);

  // Pick exercises matching the phase category
  const phaseCategory: PlyoCategory =
    phase === 'extensive' ? 'extensive' :
    phase === 'intensive' ? 'intensive' :
    phase === 'reactive' ? 'reactive' :
    'contrast';

  // For early weeks, mix in some lower-intensity exercises for warmth
  const includeExtensiveBase = phase !== 'extensive';

  let candidates = focusedPool.filter(e => e.category === phaseCategory);

  // Beginner safety: cap reactive/shock for week 5 if they're new
  if (opts.experience === 'beginner' && phase === 'reactive') {
    candidates = candidates.filter(e => e.intensityScore <= 7);
  }

  // Pick 3-4 main exercises, varying by session
  const mainCount = phase === 'reactive' || phase === 'contrast' ? 2 : 3;
  const offset = (sessionNum - 1) * mainCount;
  const main = candidates.slice(offset % Math.max(1, candidates.length))
    .concat(candidates) // wrap
    .slice(0, mainCount);

  // Add extensive primer for non-extensive weeks
  const primer = includeExtensiveBase
    ? focusedPool.filter(e => e.category === 'extensive').slice(0, 1)
    : [];

  // Combine: primer + main
  const exercises = [...primer, ...main];

  // Adjust set/rep volume to hit target contact volume
  const totalContactsPerSet = exercises.reduce((s, ex) => s + ex.contactsPerSet * ex.sets, 0);
  const scalingFactor = totalContactsPerSet > 0 ? targetContacts / totalContactsPerSet : 1;
  const scaled = exercises.map(ex => ({
    ...ex,
    sets: Math.max(2, Math.round(ex.sets * scalingFactor)),
  }));

  const total = scaled.reduce((s, ex) => s + ex.contactsPerSet * ex.sets, 0);
  const estimatedMinutes = phase === 'extensive' ? 25 : phase === 'intensive' ? 35 : 45;

  return {
    id: uuidv4(),
    weekNumber: week,
    sessionNumber: sessionNum,
    phase,
    phaseLabel: phaseLabel(phase),
    totalContacts: total,
    estimatedMinutes,
    warmUp: warmUpForPhase(phase),
    exercises: scaled,
    coolDown: coolDownForPhase(phase),
    notes: notesForPhase(phase, week),
  };
}

function warmUpForPhase(phase: PlyoSession['phase']): string[] {
  const base = ['5 min easy bike or jog', 'Dynamic stretches: leg swings, hip circles, ankle rotations'];
  if (phase === 'extensive') return [...base, 'Pogo bouncing 2 × 20s'];
  if (phase === 'intensive') return [...base, 'Skip for height 3 × 20m', 'A-skips 2 × 20m', 'Bodyweight squat jumps × 5'];
  if (phase === 'reactive') return [...base, 'Skip for height 3 × 20m', 'Tuck jumps × 5', 'Pogo bouncing 2 × 30s', 'Ramp-up: low box jumps × 3'];
  return [...base, 'Activation work', 'Build-up sets to working weight first', 'Submax plyo × 3 to prime'];
}

function coolDownForPhase(_phase: PlyoSession['phase']): string[] {
  return [
    '3 min walk',
    'Calf and quad stretches 30s each',
    'Foam roll 5 min',
    'Box breathing 2 min',
  ];
}

function notesForPhase(phase: PlyoSession['phase'], week: number): string[] {
  if (phase === 'extensive') {
    return [
      'Quality > intensity. Build the foundation.',
      'Land soft. Quick ground contact <0.25s should feel automatic by week 2.',
      `Target: ~${targetContactsForWeek(week, 'intermediate')} ground contacts.`,
    ];
  }
  if (phase === 'intensive') {
    return [
      'Maximum intent on every rep.',
      'Full rest between sets — these are quality reps, not conditioning.',
      'If form breaks, end the set.',
    ];
  }
  if (phase === 'reactive') {
    return [
      'Shock method: ground contacts must be <0.20s.',
      'PREREQUISITE: 1.5x bodyweight back squat for depth jumps.',
      'Stop if landings get sloppy — fatigue ruins the training effect.',
      'Only ONE reactive session per week — 48-72h recovery between.',
    ];
  }
  return [
    'Post-Activation Potentiation (PAP) week.',
    'Heavy lift first → 30-90s rest → explosive plyo.',
    'You should feel "lighter" on the plyo immediately after the heavy lift.',
    'This is the peak of your speed-strength.',
  ];
}

// ---------------------------------------------------------------------------
// Block Generator
// ---------------------------------------------------------------------------

export function generatePlyoBlock(opts: PlyoBlockOptions): PlyoBlock {
  const weeks = opts.weeks ?? 6;
  const sessionsPerWeek = opts.sessionsPerWeek ?? 2;
  const sessions: PlyoSession[] = [];

  for (let w = 1; w <= weeks; w++) {
    for (let s = 1; s <= sessionsPerWeek; s++) {
      sessions.push(buildSession(w, s, opts));
    }
  }

  const prerequisites: string[] = [
    'Pain-free knees, ankles, hips, and lower back',
    'At least 6 months of consistent strength training',
  ];
  if (weeks >= 5) {
    prerequisites.push('Back squat ≥ 1.5× bodyweight (for depth jumps in week 5+)');
  }
  if (opts.experience === 'beginner') {
    prerequisites.push('Beginners should run 4 weeks at most — extend over time');
  }

  return {
    id: uuidv4(),
    name: `${weeks}-Week Speed-Strength Block`,
    bodyFocus: opts.bodyFocus,
    experience: opts.experience,
    weeks,
    sessionsPerWeek,
    startedAt: new Date().toISOString(),
    sessions,
    prerequisites,
    expectedAdaptations: [
      'Vertical jump: +3-5cm in 6 weeks (Cormie 2011)',
      'Reactive Strength Index: +15-25% (Flanagan 2008)',
      'Striking power output: +8-12% (combat-specific transfer)',
      'Rate of force development: +20-30% in first 100ms',
    ],
    rsiPretestSuggestion: 'Test your Reactive Strength Index before week 1 and after week 6 to measure adaptation.',
  };
}

// ---------------------------------------------------------------------------
// RSI Test Protocol
// ---------------------------------------------------------------------------

export function getRSIProtocol(): RSITestProtocol {
  return {
    formula: 'RSI = jump height (m) / ground contact time (s). Higher = more reactive.',
    setupCues: [
      'Use a 30cm (12in) box',
      'Hands on hips throughout — no arm swing',
      'Have a phone-camera or contact mat ready',
    ],
    performance: [
      'Step off the box (don\'t jump off)',
      'On landing, immediately explode straight up for max height',
      'Ground contact must feel <0.25s — like a hot stove',
      'Perform 3 trials, take the best',
    ],
    measurement: [
      'Jump height: in meters (e.g. 0.40m for 40cm)',
      'Ground contact time: in seconds (use slow-mo video, or contact mat)',
      'RSI = height / contact time',
    ],
    goodScoreRange: {
      excellent: 2.5,  // elite athletes
      good: 1.8,       // well-trained
      fair: 1.2,       // recreational
    },
  };
}

// ---------------------------------------------------------------------------
// Workout Session Conversion
// ---------------------------------------------------------------------------

/**
 * Convert a PlyoSession into a WorkoutSession that can be started via the
 * normal startWorkout() flow. Each PlyoExercise becomes a synthetic Exercise.
 */
export function plyoSessionToWorkoutSession(session: PlyoSession): WorkoutSession {
  const exercises: ExercisePrescription[] = session.exercises.map(plyo => {
    const synthetic = {
      id: `plyo-${plyo.id}`,
      name: plyo.name,
      category: 'compound',
      primaryMuscles: plyo.bodyFocus === 'upper' ? ['chest', 'shoulders'] : plyo.bodyFocus === 'lower' ? ['quadriceps', 'glutes'] : ['quadriceps', 'core'],
      secondaryMuscles: ['core'],
      movementPattern: 'explosive',
      equipmentRequired: ['none', 'bodyweight'],
      grapplerFriendly: true,
      description: plyo.loadGuidance,
      cues: plyo.cues,
      videoUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(plyo.videoSearch)}`,
    } as unknown as Exercise;

    return {
      exerciseId: synthetic.id,
      exercise: synthetic,
      sets: plyo.sets,
      prescription: {
        targetReps: plyo.reps,
        minReps: plyo.reps,
        maxReps: plyo.reps,
        rpe: 7,
        restSeconds: plyo.restSeconds,
      },
      notes: plyo.loadGuidance,
    };
  });

  return {
    id: uuidv4(),
    name: `Plyo W${session.weekNumber} S${session.sessionNumber} — ${session.phaseLabel}`,
    type: 'power',
    dayNumber: 1,
    exercises,
    estimatedDuration: session.estimatedMinutes,
    warmUp: session.warmUp,
    coolDown: session.coolDown,
  };
}
