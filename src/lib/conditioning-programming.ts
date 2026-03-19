/**
 * conditioning-programming.ts — Prescriptive conditioning programming for combat athletes
 *
 * Generates periodized conditioning blocks with progressive overload, matching
 * templates to training phases and energy-system targets. Designed to sit
 * alongside the lifting mesocycle so combat athletes can train both without
 * interference.
 *
 * Science references:
 * - Seiler 2010: Polarized training model (80/20 easy/hard distribution)
 * - Buchheit & Laursen 2013: High-intensity interval training prescription
 * - Garcia-Pallares et al. 2010: Periodized conditioning for combat sports
 * - Franchini et al. 2011: Energy system contributions in grappling
 *
 * Tier 1 engine — imports Tier 0 only (conditioning-templates.ts)
 * Pure functions only — no React, no store, no side effects.
 */

import {
  getConditioningTemplates,
  getTemplatesForSport,
  type ConditioningTemplate,
  type ConditioningType,
} from './conditioning-templates';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EnergySystem = 'aerobic' | 'glycolytic' | 'phosphagen';
export type ConditioningPhase = 'base' | 'build' | 'peak' | 'taper';
export type ConditioningGoal =
  | 'general_fitness'
  | 'fight_prep'
  | 'weight_class_endurance'
  | 'recovery_capacity';

export interface PrescribedConditioningSession {
  dayOfWeek: number; // 0 = Sun … 6 = Sat
  templateId: string;
  type: string;
  targetEnergySystem: EnergySystem;
  rounds: number;
  workInterval: number; // seconds
  restInterval: number; // seconds
  targetRPE: number; // 1-10
  progressionFromLastWeek: string;
  estimatedDuration: number; // minutes
  estimatedLoad: number; // 0-100
}

export interface ConditioningPrescription {
  weekNumber: number;
  phase: ConditioningPhase;
  sessionsPerWeek: number;
  sessions: PrescribedConditioningSession[];
  weeklyLoadTarget: number; // sum of session loads
  notes: string;
}

export interface ConditioningBlock {
  id: string;
  name: string;
  goal: ConditioningGoal;
  sport: string;
  totalWeeks: number;
  currentWeek: number;
  weeks: ConditioningPrescription[];
  startDate: string; // ISO date
}

export interface GenerateBlockParams {
  goal: ConditioningGoal;
  sport: string;
  totalWeeks: number; // 4-12
  sessionsPerWeek: number; // 2-5
  liftingDays: number[]; // days occupied by lifting
  combatDays: number[]; // days occupied by combat training
  startDate: string; // ISO date
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced';
}

interface SelectTemplateParams {
  phase: ConditioningPhase;
  sport: string;
  energySystem: EnergySystem;
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced';
  excludeIds?: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Intensity multipliers by conditioning type.
 * Higher = more demanding per unit of work. Derived from average HR and
 * lactate responses (Buchheit & Laursen 2013, Table 3).
 */
const TYPE_INTENSITY: Record<ConditioningType, number> = {
  emom: 0.65,
  circuit: 0.70,
  interval: 0.75,
  amrap: 0.80,
  tabata: 0.90,
  shark_tank: 0.95,
};

/**
 * Phase-specific RPE targets.
 * Base builds aerobic capacity at moderate intensity (Seiler 2010 polarized
 * model — 80 % of sessions below VT1). Build and peak push into higher
 * intensities. Taper reduces both volume and intensity.
 */
const PHASE_RPE: Record<ConditioningPhase, { min: number; max: number }> = {
  base: { min: 5, max: 7 },
  build: { min: 6, max: 8 },
  peak: { min: 7, max: 9 },
  taper: { min: 4, max: 6 },
};

/**
 * Preferred template types per phase.
 * Base: steady-state-ish formats (EMOM, circuit).
 * Build: structured intervals and tabata.
 * Peak: sport-specific high-intensity (shark_tank, AMRAP).
 * Taper: light circuits only.
 */
const PHASE_TYPES: Record<ConditioningPhase, ConditioningType[]> = {
  base: ['emom', 'circuit'],
  build: ['tabata', 'interval'],
  peak: ['shark_tank', 'amrap'],
  taper: ['circuit', 'emom'],
};

/**
 * Energy system emphasis by phase.
 * Garcia-Pallares et al. 2010 showed periodized conditioning should shift
 * from aerobic base toward glycolytic / phosphagen as competition nears.
 */
const PHASE_ENERGY: Record<ConditioningPhase, EnergySystem> = {
  base: 'aerobic',
  build: 'glycolytic',
  peak: 'phosphagen',
  taper: 'aerobic',
};

/**
 * Proportion of total block allocated to each phase.
 * Fight-prep blocks lean heavier on build + peak. General fitness has a
 * longer base period.
 */
const GOAL_PHASE_RATIOS: Record<
  ConditioningGoal,
  Record<ConditioningPhase, number>
> = {
  general_fitness: { base: 0.40, build: 0.30, peak: 0.20, taper: 0.10 },
  fight_prep: { base: 0.25, build: 0.30, peak: 0.30, taper: 0.15 },
  weight_class_endurance: { base: 0.35, build: 0.35, peak: 0.20, taper: 0.10 },
  recovery_capacity: { base: 0.50, build: 0.25, peak: 0.15, taper: 0.10 },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map metabolicTarget on templates to our EnergySystem type. */
function metabolicToEnergy(
  metabolic: 'aerobic' | 'anaerobic' | 'mixed'
): EnergySystem {
  if (metabolic === 'aerobic') return 'aerobic';
  if (metabolic === 'anaerobic') return 'glycolytic';
  return 'glycolytic'; // mixed leans glycolytic in practice
}

/** Deterministic-ish ID from block params. */
function generateBlockId(params: GenerateBlockParams): string {
  const slug = `${params.sport}-${params.goal}-${params.totalWeeks}w`;
  const hash = params.startDate.replace(/-/g, '');
  return `cond-${slug}-${hash}`;
}

/** Return the phase for a given week index within the block. */
function phaseForWeek(
  weekIndex: number,
  totalWeeks: number,
  goal: ConditioningGoal
): ConditioningPhase {
  const ratios = GOAL_PHASE_RATIOS[goal];
  const phases: ConditioningPhase[] = ['base', 'build', 'peak', 'taper'];
  let accumulated = 0;
  for (const phase of phases) {
    accumulated += ratios[phase];
    if (weekIndex / totalWeeks < accumulated) return phase;
  }
  return 'taper';
}

/** Clamp a number to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/**
 * Pick the best-matching template for a given session slot.
 *
 * Selection priority:
 * 1. Matches phase-preferred conditioning type
 * 2. Matches sport (or is general)
 * 3. Matches energy system target
 * 4. Hasn't been used this week (via excludeIds)
 * 5. Matches fitness level
 */
export function selectTemplateForSession(
  params: SelectTemplateParams
): ConditioningTemplate {
  const { phase, sport, energySystem, fitnessLevel, excludeIds = [] } = params;
  const sportTemplates = getTemplatesForSport(sport);
  const preferredTypes = PHASE_TYPES[phase];

  // Score each template
  const scored = sportTemplates
    .filter((t) => !excludeIds.includes(t.id))
    .map((t) => {
      let score = 0;

      // +3 if type matches phase preference
      if (preferredTypes.includes(t.type)) score += 3;

      // +2 if energy system matches
      if (metabolicToEnergy(t.metabolicTarget) === energySystem) score += 2;

      // +1 if difficulty matches fitness level
      if (fitnessLevel && t.difficulty === fitnessLevel) score += 1;

      // +1 if sport-specific (not just general)
      if (
        t.targetSport.includes(
          sport.toLowerCase() as 'grappling' | 'striking' | 'mma' | 'general'
        )
      ) {
        score += 1;
      }

      return { template: t, score };
    })
    .sort((a, b) => b.score - a.score);

  // Fallback: if nothing scored, just grab the first sport template
  if (scored.length === 0) {
    const all = getConditioningTemplates();
    return all[0];
  }

  return scored[0].template;
}

/**
 * Calculate a 0-100 load score for a conditioning session.
 *
 * Factors (Buchheit & Laursen 2013, session-RPE model):
 * - rounds: more rounds = more volume
 * - work:rest ratio: higher ratio = less recovery = harder
 * - type intensity multiplier: shark_tank > tabata > amrap > interval > circuit > emom
 * - target RPE: scales the whole thing
 *
 * Formula: baseLoad = rounds * workRestRatio * typeMultiplier * (RPE / 10)
 * Then normalize to 0-100.
 */
export function calculateSessionLoad(
  session: Pick<
    PrescribedConditioningSession,
    'rounds' | 'workInterval' | 'restInterval' | 'type' | 'targetRPE'
  >
): number {
  const workRestRatio =
    session.restInterval > 0
      ? session.workInterval / session.restInterval
      : session.workInterval / 10; // near-zero rest = very demanding

  const typeMultiplier = TYPE_INTENSITY[session.type as ConditioningType] ?? 0.7;
  const rpeScale = session.targetRPE / 10;

  // Raw load — uncapped. Typical values range 1-20 before normalization.
  const rawLoad = session.rounds * workRestRatio * typeMultiplier * rpeScale;

  // Normalize: 20 raw ≈ 100 load. Clamp [0, 100].
  return clamp(Math.round((rawLoad / 20) * 100), 0, 100);
}

/**
 * Apply progressive overload to a session from the previous week.
 *
 * Progression model (Garcia-Pallares et al. 2010):
 * - **Base**: +1 round every 2 weeks (volume accumulation)
 * - **Build**: -5s rest per week (density increase)
 * - **Peak**: +15s work per week (capacity extension)
 * - **Taper**: reduce rounds by 30%, increase rest by 20% (supercompensation)
 */
export function progressSession(
  previous: PrescribedConditioningSession,
  weekNumber: number,
  phase: ConditioningPhase
): PrescribedConditioningSession {
  let { rounds, workInterval, restInterval, targetRPE } = previous;
  let progressionNote = '';

  switch (phase) {
    case 'base':
      // +1 round every 2 weeks
      if (weekNumber % 2 === 0) {
        rounds += 1;
        progressionNote = `+1 round (now ${rounds}) — volume accumulation`;
      } else {
        progressionNote = 'Maintained volume — consolidation week';
      }
      break;

    case 'build':
      // -5s rest each week, minimum 10s
      restInterval = Math.max(10, restInterval - 5);
      progressionNote = `Rest reduced to ${restInterval}s — density increase`;
      break;

    case 'peak':
      // +15s work per week
      workInterval += 15;
      targetRPE = clamp(targetRPE + 0.5, PHASE_RPE.peak.min, PHASE_RPE.peak.max);
      progressionNote = `Work interval extended to ${workInterval}s — capacity push`;
      break;

    case 'taper':
      // Reduce load: fewer rounds, more rest
      rounds = Math.max(1, Math.round(rounds * 0.7));
      restInterval = Math.round(restInterval * 1.2);
      targetRPE = clamp(targetRPE - 1, PHASE_RPE.taper.min, PHASE_RPE.taper.max);
      progressionNote = `Tapered to ${rounds} rounds, ${restInterval}s rest — supercompensation`;
      break;
  }

  const progressed: PrescribedConditioningSession = {
    ...previous,
    rounds,
    workInterval,
    restInterval,
    targetRPE,
    progressionFromLastWeek: progressionNote,
  };

  progressed.estimatedLoad = calculateSessionLoad(progressed);
  progressed.estimatedDuration = estimateSessionDuration(progressed);

  return progressed;
}

/**
 * Return weekdays (0-6) that don't overlap with lifting or combat training.
 *
 * If fewer than 2 open days exist, allow doubling up on the lightest lifting
 * day (first in the array, assumed easiest). Conditioning on the same day as
 * combat is fine for low-intensity base work but avoided for build/peak.
 */
export function getRecommendedConditioningDays(
  liftingDays: number[],
  combatDays: number[]
): number[] {
  const allDays = [0, 1, 2, 3, 4, 5, 6];
  const occupied = new Set([...liftingDays, ...combatDays]);
  const free = allDays.filter((d) => !occupied.has(d));

  if (free.length >= 2) return free;

  // Not enough free days — allow overlap with lifting days (not combat).
  // Combat + hard conditioning = CNS overload (Franchini et al. 2011).
  const liftOnlyDays = liftingDays.filter((d) => !combatDays.includes(d));
  const expanded = [...free, ...liftOnlyDays];

  // Deduplicate and return at least 2
  return Array.from(new Set(expanded)).slice(0, Math.max(2, free.length));
}

// ---------------------------------------------------------------------------
// Block Generation
// ---------------------------------------------------------------------------

/** Estimate session duration in minutes from intervals and rounds. */
function estimateSessionDuration(
  session: Pick<PrescribedConditioningSession, 'rounds' | 'workInterval' | 'restInterval'>
): number {
  const totalSeconds = session.rounds * (session.workInterval + session.restInterval);
  const warmupCooldown = 10; // ~5 min warmup + ~5 min cooldown
  return Math.round(totalSeconds / 60) + warmupCooldown;
}

/** Build a single session prescription from a template. */
function buildSessionFromTemplate(
  template: ConditioningTemplate,
  dayOfWeek: number,
  phase: ConditioningPhase
): PrescribedConditioningSession {
  const rpeRange = PHASE_RPE[phase];
  const targetRPE = Math.round((rpeRange.min + rpeRange.max) / 2 * 10) / 10;

  const session: PrescribedConditioningSession = {
    dayOfWeek,
    templateId: template.id,
    type: template.type,
    targetEnergySystem: PHASE_ENERGY[phase],
    rounds: template.rounds,
    workInterval: template.workInterval ?? 60,
    restInterval: template.restInterval ?? 60,
    targetRPE,
    progressionFromLastWeek: 'Week 1 — baseline',
    estimatedDuration: template.totalDuration,
    estimatedLoad: 0, // filled below
  };

  session.estimatedLoad = calculateSessionLoad(session);
  return session;
}

/** Generate phase notes for a given week. */
function weekNotes(phase: ConditioningPhase, weekNumber: number): string {
  const notes: Record<ConditioningPhase, string> = {
    base: `Base phase (week ${weekNumber}): Build aerobic capacity. Keep RPE moderate. Focus on movement quality over intensity (Seiler 2010 — 80% below VT1).`,
    build: `Build phase (week ${weekNumber}): Increase density. Shorter rest periods, higher work:rest ratios. Glycolytic emphasis (Buchheit & Laursen 2013).`,
    peak: `Peak phase (week ${weekNumber}): Sport-specific intensity. Longer work intervals at near-competition RPE. Phosphagen + glycolytic demands (Garcia-Pallares et al. 2010).`,
    taper: `Taper phase (week ${weekNumber}): Reduce volume 30-40%, maintain intensity. Allow supercompensation before competition or testing.`,
  };
  return notes[phase];
}

/**
 * Generate a full periodized conditioning block.
 *
 * Creates 4-12 weeks of programming with progressive overload, phase
 * transitions, and template selection that avoids scheduling conflicts
 * with lifting and combat training.
 *
 * Phase allocation follows the goal-specific ratios in GOAL_PHASE_RATIOS.
 * Templates are sourced from conditioning-templates.ts and matched to each
 * phase's preferred type and energy system target.
 */
export function generateConditioningBlock(
  params: GenerateBlockParams
): ConditioningBlock {
  const {
    goal,
    sport,
    totalWeeks: rawWeeks,
    sessionsPerWeek: rawSessions,
    liftingDays,
    combatDays,
    startDate,
    fitnessLevel = 'intermediate',
  } = params;

  const totalWeeks = clamp(rawWeeks, 4, 12);
  const sessionsPerWeek = clamp(rawSessions, 2, 5);
  const conditioningDays = getRecommendedConditioningDays(liftingDays, combatDays);

  const weeks: ConditioningPrescription[] = [];

  for (let w = 0; w < totalWeeks; w++) {
    const phase = phaseForWeek(w, totalWeeks, goal);
    const usedTemplateIds: string[] = [];
    const sessions: PrescribedConditioningSession[] = [];

    for (let s = 0; s < sessionsPerWeek; s++) {
      const dayOfWeek = conditioningDays[s % conditioningDays.length];

      if (w === 0) {
        // First week: select from templates
        const template = selectTemplateForSession({
          phase,
          sport,
          energySystem: PHASE_ENERGY[phase],
          fitnessLevel,
          excludeIds: usedTemplateIds,
        });
        usedTemplateIds.push(template.id);
        sessions.push(buildSessionFromTemplate(template, dayOfWeek, phase));
      } else {
        // Subsequent weeks: progress from previous week's session
        const previousSession = weeks[w - 1].sessions[s];
        if (previousSession) {
          const progressed = progressSession(previousSession, w + 1, phase);
          progressed.dayOfWeek = dayOfWeek;
          sessions.push(progressed);
        } else {
          // New session added mid-block (e.g., sessions increased)
          const template = selectTemplateForSession({
            phase,
            sport,
            energySystem: PHASE_ENERGY[phase],
            fitnessLevel,
            excludeIds: usedTemplateIds,
          });
          usedTemplateIds.push(template.id);
          sessions.push(buildSessionFromTemplate(template, dayOfWeek, phase));
        }
      }
    }

    const weeklyLoadTarget = sessions.reduce(
      (sum, s) => sum + s.estimatedLoad,
      0
    );

    weeks.push({
      weekNumber: w + 1,
      phase,
      sessionsPerWeek,
      sessions,
      weeklyLoadTarget,
      notes: weekNotes(phase, w + 1),
    });
  }

  const goalNames: Record<ConditioningGoal, string> = {
    general_fitness: 'General Fitness',
    fight_prep: 'Fight Prep',
    weight_class_endurance: 'Weight Class Endurance',
    recovery_capacity: 'Recovery Capacity',
  };

  return {
    id: generateBlockId(params),
    name: `${goalNames[goal]} — ${totalWeeks} Week Block`,
    goal,
    sport,
    totalWeeks,
    currentWeek: 1,
    weeks,
    startDate,
  };
}
