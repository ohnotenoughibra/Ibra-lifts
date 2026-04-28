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
import { FULL_REHAB_LIBRARY, type RehabExercise, type RehabPhaseNumber } from './rehab-exercises';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Re-export for callers that imported these from rehab-engine
export type { RehabPhaseNumber, RehabExercise };

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

// Phase mapping constants
// Remodeling window matches injury-science.ts getPhaseFromDays (50% start, 85% end of total heal time)
const REMODEL_WINDOW_START_RATIO = 0.5;
const REMODEL_WINDOW_END_RATIO = 0.85;
// Within remodeling, switch from phase 3 (early strengthening) to phase 4 (integration)
// at 60% through the window — gives 2/3 of remodeling to strength rebuilding before adding compound integration work
const PHASE_3_TO_4_SPLIT_RATIO = 0.6;

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
      const totalDays = classification.estimatedHealDays.max;
      const remodelStart = totalDays * REMODEL_WINDOW_START_RATIO;
      const remodelEnd = totalDays * REMODEL_WINDOW_END_RATIO;
      const ratio = (daysSinceInjury - remodelStart) / (remodelEnd - remodelStart);
      return ratio > PHASE_3_TO_4_SPLIT_RATIO ? 4 : 3;
    }
    case 'return_to_sport':
      return 5;
  }
}


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

// Phase advancement gate constants
const DEFAULT_RECENT_CHECKIN_WINDOW_DAYS = 5; // Look back this many days for "recent" check-ins
const MIN_RECENT_CHECKINS = 3;                // Need at least this many check-ins to evaluate (avoid single-data-point decisions)

// Phase-specific gates: every value must be met across all recent check-ins to advance
interface PhaseGate {
  painAtRestMax?: number;
  painDuringExerciseMax?: number;
  painAfter24hMax?: number;
  romPercentMin?: number;
  swellingMaxLevel?: ('none' | 'mild')[];
  minCompletedSessions?: number;
  metMessages: Record<string, string>;
  unmetMessages: Record<string, string>;
}

const PHASE_GATES: Record<RehabPhaseNumber, PhaseGate> = {
  1: {
    painAtRestMax: 3,
    swellingMaxLevel: ['none', 'mild'],
    metMessages: {
      painAtRest: 'Pain at rest ≤3/10',
      swelling: 'Swelling controlled',
    },
    unmetMessages: {
      painAtRest: 'Pain at rest must be ≤3/10 across check-ins',
      swelling: 'Swelling must be none/mild to advance',
    },
  },
  2: {
    painDuringExerciseMax: 4,
    painAfter24hMax: 3,
    romPercentMin: 75,
    metMessages: {
      painExercise: 'Pain during exercise ≤4/10',
      pain24h: 'Pain returns to baseline within 24h',
      rom: 'ROM ≥75% of uninjured side',
    },
    unmetMessages: {
      painExercise: 'Pain during exercise must be ≤4/10',
      pain24h: 'Pain must return to baseline within 24h (Silbernagel rule)',
      rom: 'ROM must be ≥75% of uninjured side',
    },
  },
  3: {
    painDuringExerciseMax: 3,
    romPercentMin: 90,
    minCompletedSessions: 3,
    metMessages: {
      painExercise: 'Pain during exercise ≤3/10',
      rom: 'ROM ≥90% of uninjured side',
      sessions: '3+ completed sessions in last 5 days',
    },
    unmetMessages: {
      painExercise: 'Pain during exercise must be ≤3/10',
      rom: 'ROM must be ≥90% of uninjured side',
      sessions: 'Need 3+ completed sessions in last 5 days',
    },
  },
  4: {
    painDuringExerciseMax: 2,
    painAfter24hMax: 1,
    romPercentMin: 95,
    metMessages: {
      painExercise: 'Pain during exercise ≤2/10',
      pain24h: 'No 24h symptom flare',
      rom: 'ROM ≥95% of uninjured side',
    },
    unmetMessages: {
      painExercise: 'Pain during exercise must be ≤2/10 to enter Return to Sport',
      pain24h: 'No 24h symptom flare across check-ins',
      rom: 'ROM must be ≥95% to enter sport demand',
    },
  },
  5: {
    metMessages: {},
    unmetMessages: {},
  },
};

/**
 * Evaluate whether the user can advance to the next phase.
 * Looks at recent check-ins + the criteria from injury-science.
 */
export function evaluatePhaseAdvancement(
  injury: InjuryEntry,
  state: RehabState,
  recentCheckInDays: number = DEFAULT_RECENT_CHECKIN_WINDOW_DAYS
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

  if (recent.length < MIN_RECENT_CHECKINS) {
    unmet.push(`Need at least ${MIN_RECENT_CHECKINS} check-ins in the last ${recentCheckInDays} days (have ${recent.length})`);
  } else {
    met.push(`${recent.length} check-ins logged`);
  }

  // Apply data-driven gate checks
  const gate = PHASE_GATES[currentPhase];
  if (gate.painAtRestMax !== undefined) {
    if (recent.every(c => c.painAtRest <= gate.painAtRestMax!)) met.push(gate.metMessages.painAtRest);
    else unmet.push(gate.unmetMessages.painAtRest);
  }
  if (gate.painDuringExerciseMax !== undefined) {
    if (recent.every(c => c.painDuringExercise <= gate.painDuringExerciseMax!)) met.push(gate.metMessages.painExercise);
    else unmet.push(gate.unmetMessages.painExercise);
  }
  if (gate.painAfter24hMax !== undefined) {
    if (recent.every(c => c.painAfter24h <= gate.painAfter24hMax!)) met.push(gate.metMessages.pain24h);
    else unmet.push(gate.unmetMessages.pain24h);
  }
  if (gate.romPercentMin !== undefined) {
    if (recent.every(c => c.romPercent >= gate.romPercentMin!)) met.push(gate.metMessages.rom);
    else unmet.push(gate.unmetMessages.rom);
  }
  if (gate.swellingMaxLevel) {
    if (recent.every(c => gate.swellingMaxLevel!.includes(c.swellingLevel as 'none' | 'mild'))) met.push(gate.metMessages.swelling);
    else unmet.push(gate.unmetMessages.swelling);
  }
  if (gate.minCompletedSessions !== undefined) {
    if (recent.filter(c => c.completedSession).length >= gate.minCompletedSessions) met.push(gate.metMessages.sessions);
    else unmet.push(gate.unmetMessages.sessions);
  }

  const canAdvance = unmet.length === 0 && recent.length >= MIN_RECENT_CHECKINS;
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
