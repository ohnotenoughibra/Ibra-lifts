/**
 * Periodized Nutrition Planner — annual diet phase sequencing engine.
 *
 * Generates a multi-month nutrition plan by:
 *   1. Working backward from competition dates (hard constraints)
 *   2. Coupling nutrition phases to training mesocycle types
 *   3. Inserting mandatory maintenance windows between phases
 *   4. Scheduling diet breaks during extended cuts (MATADOR protocol)
 *   5. Detecting metabolic adaptation and recommending phase transitions
 *
 * Design principles:
 *   - First principles: every phase exists because biology demands it
 *   - Unregretted user seconds: system infers the plan, user confirms with one tap
 *   - Pure functions, zero side effects (Tier 1 engine)
 *
 * References:
 *   - Helms et al. 2019: Sustainable nutrition paradigm, 4:1 mass-to-cut ratio
 *   - Israetel/RP Strength 2019: Scientific Principles of Hypertrophy Training
 *   - Byrne et al. 2017 (MATADOR): 2-week diet breaks preserve metabolic rate
 *   - Trexler et al. 2014: Metabolic adaptation to weight loss (10-15% TDEE reduction)
 *   - Garthe et al. 2011: 0.7% BW/week optimal cutting rate for athletes
 *   - ISSN 2025: Position stand on MMA/combat sport nutrition
 *   - Helms et al. 2014: Protein 2.3-3.1 g/kg for lean athletes in deficit
 *   - Hector & Phillips 2018: Protein needs scale with deficit severity
 */

import type {
  NutritionPhaseType,
  PlannedNutritionPhase,
  NutritionPeriodPlan,
  ActivePhaseContext,
  PhaseTransitionReason,
  BlockFocus,
  CompetitionEvent,
  CompletedDietPhase,
  BiologicalSex,
  WeeklyCheckIn,
  BodyWeightEntry,
} from './types';
import { toLocalDateStr } from './utils';

// ── Constants (evidence-based) ──────────────────────────────────────────────

/** Minimum weeks of maintenance between any two non-maintenance phases.
 *  Hormonal recovery requires ≥2 weeks at TDEE (Helms et al. 2019). */
const MIN_MAINTENANCE_WEEKS = 2;
const MAX_MAINTENANCE_WEEKS = 4;

/** Maximum weeks in continuous deficit before a mandatory diet break.
 *  MATADOR protocol: ~2 weeks dieting, 2 weeks break. Practical minimum: 6 weeks. */
const MAX_DEFICIT_WEEKS_BEFORE_BREAK = 6;

/** Diet break duration (at TDEE) to counteract adaptive thermogenesis. */
const DIET_BREAK_WEEKS = 2; // Byrne et al. 2017

/** Minimum massing-to-cutting ratio (Helms recommendation: 4:1 minimum). */
const MIN_MASS_TO_CUT_RATIO = 4;

/** Maximum weeks for each phase type. */
const MAX_PHASE_WEEKS: Record<NutritionPhaseType, number> = {
  massing: 20,         // 5 months max before reassessing
  maintenance: 6,      // 6 weeks max (transition, not permanent)
  mini_cut: 6,         // Short by definition
  fat_loss: 16,        // Absolute max before mandatory diet break or phase change
  diet_break: 2,       // Always 1-2 weeks
  fight_camp: 16,      // Longest reasonable fight camp (usually 8-12)
  recovery: 4,         // Post-comp recovery, then move to massing or maintenance
};

/** Minimum weeks per phase. */
const MIN_PHASE_WEEKS: Record<NutritionPhaseType, number> = {
  massing: 8,          // Minimum to see meaningful hypertrophy
  maintenance: 2,      // Minimum for hormonal recalibration
  mini_cut: 3,         // Too short = no meaningful fat loss
  fat_loss: 6,         // Minimum for measurable body composition change
  diet_break: 1,       // 1 week minimum for metabolic benefit
  fight_camp: 4,       // Minimum viable fight prep
  recovery: 2,         // Minimum post-comp recovery
};

/** Phase-specific nutrition parameters. */
const PHASE_PARAMS: Record<NutritionPhaseType, {
  calorieFactor: number;              // multiplier on TDEE
  targetRateKgPerWeek: number;        // expected weight change
  proteinGKg: number;                 // protein g/kg
  pairedTrainingFocus: BlockFocus;    // recommended training block
}> = {
  massing: {
    calorieFactor: 1.10,              // +10% surplus (conservative, for trained athletes)
    targetRateKgPerWeek: 0.25,        // ~0.5% BW/month for intermediate+ lifters
    proteinGKg: 1.8,                  // Lower end sufficient in surplus (Helms 2014)
    pairedTrainingFocus: 'hypertrophy',
  },
  maintenance: {
    calorieFactor: 1.0,
    targetRateKgPerWeek: 0,
    proteinGKg: 2.0,
    pairedTrainingFocus: 'strength',   // Maintain/express gains at maintenance
  },
  mini_cut: {
    calorieFactor: 0.78,              // ~22% deficit (aggressive but short)
    targetRateKgPerWeek: -0.7,        // ~0.8-1% BW/week
    proteinGKg: 2.8,                  // High end to preserve muscle (Helms 2014)
    pairedTrainingFocus: 'strength',   // Maintain strength, reduce volume
  },
  fat_loss: {
    calorieFactor: 0.82,              // ~18% deficit (moderate, sustainable)
    targetRateKgPerWeek: -0.5,        // ~0.5-0.7% BW/week (Garthe 2011)
    proteinGKg: 2.5,                  // Mid-high range for deficit
    pairedTrainingFocus: 'strength',
  },
  diet_break: {
    calorieFactor: 1.0,               // Back to TDEE
    targetRateKgPerWeek: 0,
    proteinGKg: 2.2,
    pairedTrainingFocus: 'strength',
  },
  fight_camp: {
    calorieFactor: 0.85,              // Delegates to fight-camp-engine for fine-grained phases
    targetRateKgPerWeek: -0.5,
    proteinGKg: 2.8,
    pairedTrainingFocus: 'peaking',
  },
  recovery: {
    calorieFactor: 1.08,              // Slight surplus for recovery (reverse diet)
    targetRateKgPerWeek: 0.15,
    proteinGKg: 2.0,
    pairedTrainingFocus: 'base_building',
  },
};

// ── Plan Generation ─────────────────────────────────────────────────────────

export interface PlannerInput {
  /** Upcoming competitions, sorted by date ascending */
  competitions: CompetitionEvent[];
  /** Current body weight in kg */
  currentWeightKg: number;
  /** Current estimated body fat % (null if unknown) */
  bodyFatPercent: number | null;
  /** Biological sex for parameter adjustments */
  sex: BiologicalSex;
  /** History of completed diet phases */
  dietPhaseHistory: CompletedDietPhase[];
  /** Current training block focus (if active) */
  currentTrainingFocus: BlockFocus | null;
  /** Whether user identifies as combat athlete */
  isCombatAthlete: boolean;
  /** Planning horizon in weeks (default: 52) */
  horizonWeeks?: number;
}

/**
 * Generate a periodized nutrition plan from current state and competition schedule.
 *
 * Algorithm:
 * 1. Identify competition-anchored segments (fight camp phases working backward)
 * 2. Fill off-season gaps with massing + mini-cut cycles
 * 3. Insert mandatory maintenance windows between phases
 * 4. Mark diet breaks in extended deficit phases
 */
export function generateNutritionPlan(input: PlannerInput): NutritionPeriodPlan {
  const {
    competitions,
    currentWeightKg,
    bodyFatPercent,
    sex,
    dietPhaseHistory,
    isCombatAthlete,
    horizonWeeks = 52,
  } = input;

  const today = new Date();
  const todayStr = toLocalDateStr(today);
  const horizonEnd = addWeeks(today, horizonWeeks);
  const phases: PlannedNutritionPhase[] = [];

  // Sort active competitions by date
  const activeComps = competitions
    .filter(c => c.isActive && toDate(c.date) > today)
    .sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime());

  // Build competition-anchored segments first
  const compSegments = activeComps.map(comp => buildCompSegment(comp, currentWeightKg));

  // Fill the timeline
  let cursor = today;

  // Start with recovery if we just finished a competition
  const recentCut = dietPhaseHistory
    .filter(p => p.goal === 'cut')
    .sort((a, b) => b.endDate.localeCompare(a.endDate))[0];

  const justFinishedComp = recentCut &&
    daysBetween(new Date(recentCut.endDate), today) < 14;

  if (justFinishedComp) {
    const recoveryPhase = createPhase('recovery', cursor, 3,
      'Post-competition recovery — reverse diet and hormonal reset');
    phases.push(recoveryPhase);
    cursor = new Date(recoveryPhase.endDate);
    cursor.setDate(cursor.getDate() + 1);
  }

  // For each competition, plan backward
  for (let i = 0; i < compSegments.length; i++) {
    const segment = compSegments[i];
    const compDate = toDate(activeComps[i].date);
    const fightCampStart = parseDate(segment.fightCampStart);

    // Fill gap between cursor and fight camp start
    const gapWeeks = weeksBetween(cursor, fightCampStart);

    if (gapWeeks >= MIN_PHASE_WEEKS.massing + MIN_MAINTENANCE_WEEKS) {
      // Enough time for a massing block + transition
      const massingWeeks = Math.min(
        gapWeeks - MIN_MAINTENANCE_WEEKS,
        MAX_PHASE_WEEKS.massing
      );

      // Massing phase
      const massingPhase = createPhase('massing', cursor, massingWeeks,
        `Build muscle mass before ${activeComps[i].name} prep`,
        activeComps[i].id);
      phases.push(massingPhase);
      cursor = new Date(massingPhase.endDate);
      cursor.setDate(cursor.getDate() + 1);

      // Maintenance transition into fight camp
      const maintenanceWeeks = Math.min(
        weeksBetween(cursor, fightCampStart),
        MAX_MAINTENANCE_WEEKS
      );
      if (maintenanceWeeks >= MIN_MAINTENANCE_WEEKS) {
        const maintPhase = createPhase('maintenance', cursor, maintenanceWeeks,
          'Hormonal recalibration before fight camp deficit');
        phases.push(maintPhase);
        cursor = new Date(maintPhase.endDate);
        cursor.setDate(cursor.getDate() + 1);
      }
    } else if (gapWeeks >= MIN_MAINTENANCE_WEEKS) {
      // Just enough for maintenance
      const maintPhase = createPhase('maintenance', cursor, Math.min(gapWeeks, MAX_MAINTENANCE_WEEKS),
        'Maintenance hold before fight camp');
      phases.push(maintPhase);
      cursor = new Date(maintPhase.endDate);
      cursor.setDate(cursor.getDate() + 1);
    }

    // Fight camp phase
    const campWeeks = Math.max(
      MIN_PHASE_WEEKS.fight_camp,
      weeksBetween(cursor, compDate)
    );
    const fightCampPhase = createPhase('fight_camp', cursor, campWeeks,
      `${activeComps[i].name} preparation`,
      activeComps[i].id);

    // Check if diet break needed in long fight camps
    if (campWeeks > MAX_DEFICIT_WEEKS_BEFORE_BREAK) {
      fightCampPhase.dietBreakRecommended = true;
    }

    // Adjust calorie factor if significant weight cut needed
    if (activeComps[i].weightClass && activeComps[i].currentWeight) {
      const weightToLose = activeComps[i].currentWeight! - activeComps[i].weightClass!;
      if (weightToLose > 0) {
        // More aggressive deficit if more weight to lose
        const deficitSeverity = Math.min(0.25, (weightToLose / currentWeightKg) * 0.8);
        fightCampPhase.calorieFactor = Math.max(0.75, 1 - deficitSeverity);
        fightCampPhase.proteinGKg = Math.min(3.1, 2.5 + deficitSeverity * 2);
      }
    }

    phases.push(fightCampPhase);
    cursor = new Date(fightCampPhase.endDate);
    cursor.setDate(cursor.getDate() + 1);

    // Post-comp recovery (if not last comp or there's time)
    const nextCompStart = i < compSegments.length - 1
      ? parseDate(compSegments[i + 1].fightCampStart)
      : horizonEnd;
    const recoveryGap = weeksBetween(cursor, nextCompStart);

    if (recoveryGap >= MIN_PHASE_WEEKS.recovery) {
      const recWeeks = Math.min(MIN_PHASE_WEEKS.recovery + 1, recoveryGap);
      const recPhase = createPhase('recovery', cursor, recWeeks,
        `Post-competition recovery after ${activeComps[i].name}`);
      phases.push(recPhase);
      cursor = new Date(recPhase.endDate);
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  // Fill remaining time after all competitions (or if no competitions)
  const remainingWeeks = weeksBetween(cursor, horizonEnd);

  if (remainingWeeks >= MIN_PHASE_WEEKS.massing) {
    // No competition pressure: run massing blocks with periodic mini-cuts
    const offSeasonPhases = buildOffSeasonCycle(
      cursor,
      remainingWeeks,
      bodyFatPercent,
      dietPhaseHistory,
    );
    phases.push(...offSeasonPhases);
  } else if (remainingWeeks >= MIN_MAINTENANCE_WEEKS) {
    phases.push(createPhase('maintenance', cursor, remainingWeeks,
      'Maintenance to close out planning horizon'));
  }

  return {
    id: generateId(),
    createdAt: todayStr,
    updatedAt: todayStr,
    phases,
    activePhaseIndex: 0,
    weeksIntoActivePhase: 0,
    status: 'active',
  };
}

// ── Off-Season Cycle Builder ────────────────────────────────────────────────

/**
 * Builds the off-season phase cycle: massing → maintenance → mini-cut → maintenance → repeat.
 * Follows the Helms 4:1 mass-to-cut ratio.
 */
function buildOffSeasonCycle(
  startDate: Date,
  totalWeeks: number,
  bodyFatPercent: number | null,
  history: CompletedDietPhase[],
): PlannedNutritionPhase[] {
  const phases: PlannedNutritionPhase[] = [];
  let cursor = new Date(startDate.getTime());
  let remaining = totalWeeks;

  // Determine starting phase based on body fat and history
  let startWithCut = false;
  if (bodyFatPercent !== null && bodyFatPercent > 18) {
    // Above 18% BF: start with fat loss to improve p-ratio before massing
    startWithCut = true;
  }

  while (remaining >= MIN_PHASE_WEEKS.massing) {
    if (startWithCut && remaining >= MIN_PHASE_WEEKS.fat_loss + MIN_MAINTENANCE_WEEKS) {
      // Fat loss phase first
      const cutWeeks = Math.min(12, remaining - MIN_MAINTENANCE_WEEKS);
      const cutPhase = createPhase('fat_loss', cursor, cutWeeks,
        'Reduce body fat to improve insulin sensitivity before massing');
      if (cutWeeks > MAX_DEFICIT_WEEKS_BEFORE_BREAK) {
        cutPhase.dietBreakRecommended = true;
      }
      phases.push(cutPhase);
      cursor = new Date(cutPhase.endDate);
      cursor.setDate(cursor.getDate() + 1);
      remaining -= cutWeeks;
      startWithCut = false; // Only cut first once

      // Maintenance after cut
      if (remaining >= MIN_MAINTENANCE_WEEKS) {
        const maintWeeks = Math.min(MAX_MAINTENANCE_WEEKS, remaining);
        phases.push(createPhase('maintenance', cursor, maintWeeks,
          'Hormonal recalibration after fat loss phase'));
        cursor = addWeeks(cursor, maintWeeks);
        cursor.setDate(cursor.getDate() + 1);
        remaining -= maintWeeks;
      }
      continue;
    }

    // Standard cycle: mass → maintenance → mini-cut → maintenance
    // One full cycle ≈ massingWeeks + 2 + miniCutWeeks + 2

    // Massing block (Helms: 4-8 months ideal, we'll do 8-16 weeks per block)
    const massingWeeks = Math.min(
      16,
      Math.max(MIN_PHASE_WEEKS.massing, remaining - 8) // Leave room for cut cycle
    );
    if (massingWeeks < MIN_PHASE_WEEKS.massing) break;

    phases.push(createPhase('massing', cursor, massingWeeks,
      'Hypertrophy-focused caloric surplus — maximize muscle gain'));
    cursor = addWeeks(cursor, massingWeeks);
    cursor.setDate(cursor.getDate() + 1);
    remaining -= massingWeeks;

    // Maintenance transition
    if (remaining >= MIN_MAINTENANCE_WEEKS) {
      const maintWeeks = Math.min(MIN_MAINTENANCE_WEEKS, remaining);
      phases.push(createPhase('maintenance', cursor, maintWeeks,
        'Mandatory maintenance — let hormones recalibrate'));
      cursor = addWeeks(cursor, maintWeeks);
      cursor.setDate(cursor.getDate() + 1);
      remaining -= maintWeeks;
    } else break;

    // Mini-cut (per Helms 4:1 ratio: massing/4 = cut duration)
    const miniCutWeeks = Math.min(
      Math.ceil(massingWeeks / MIN_MASS_TO_CUT_RATIO),
      MAX_PHASE_WEEKS.mini_cut,
      remaining - MIN_MAINTENANCE_WEEKS
    );
    if (miniCutWeeks >= MIN_PHASE_WEEKS.mini_cut) {
      phases.push(createPhase('mini_cut', cursor, miniCutWeeks,
        'Clean up body fat gained during massing — aggressive but short'));
      cursor = addWeeks(cursor, miniCutWeeks);
      cursor.setDate(cursor.getDate() + 1);
      remaining -= miniCutWeeks;

      // Maintenance after mini-cut
      if (remaining >= MIN_MAINTENANCE_WEEKS) {
        const maintWeeks = Math.min(MIN_MAINTENANCE_WEEKS, remaining);
        phases.push(createPhase('maintenance', cursor, maintWeeks,
          'Settle into new body composition before next massing block'));
        cursor = addWeeks(cursor, maintWeeks);
        cursor.setDate(cursor.getDate() + 1);
        remaining -= maintWeeks;
      }
    }
  }

  // If there's leftover time that doesn't fit a full cycle, fill with maintenance
  if (remaining > 0) {
    phases.push(createPhase('maintenance', cursor, remaining,
      'Maintenance to close out planning horizon'));
  }

  return phases;
}

// ── Competition Segment Builder ─────────────────────────────────────────────

interface CompSegment {
  fightCampStart: string;       // ISO date
  competitionDate: string;      // ISO date
  campWeeks: number;
}

function buildCompSegment(
  comp: CompetitionEvent,
  currentWeightKg: number,
): CompSegment {
  const compDate = toDate(comp.date);

  // Determine fight camp duration based on weight to cut
  let campWeeks = 8; // Default 8-week camp
  if (comp.weightClass && comp.currentWeight) {
    const weightDiff = comp.currentWeight - comp.weightClass;
    if (weightDiff > 8) campWeeks = 12;       // Significant cut: 12 weeks
    else if (weightDiff > 5) campWeeks = 10;  // Moderate cut: 10 weeks
    else if (weightDiff > 2) campWeeks = 8;   // Light cut: 8 weeks
    else campWeeks = 6;                        // Minimal/no cut: 6 weeks
  }

  // Camp starts campWeeks before competition
  const campStart = new Date(compDate.getTime());
  campStart.setDate(campStart.getDate() - campWeeks * 7);

  return {
    fightCampStart: toLocalDateStr(campStart),
    competitionDate: toLocalDateStr(compDate),
    campWeeks,
  };
}

// ── Active Phase Context ────────────────────────────────────────────────────

/**
 * Get the current phase context for display/integration.
 * Returns null if no plan is active.
 *
 * This is the function that daily-directive.ts and DietCoach.tsx call
 * to get "where am I right now?" in the periodization plan.
 */
export function getActivePhaseContext(
  plan: NutritionPeriodPlan | null,
  bodyWeightLog: BodyWeightEntry[],
  weeklyCheckIns: WeeklyCheckIn[],
  competitions: CompetitionEvent[],
): ActivePhaseContext | null {
  if (!plan || plan.phases.length === 0) return null;

  const today = new Date();
  const todayStr = toLocalDateStr(today);

  // Find the current phase (the one whose date range contains today)
  let activeIndex = plan.activePhaseIndex;
  for (let i = 0; i < plan.phases.length; i++) {
    if (todayStr >= plan.phases[i].startDate && todayStr <= plan.phases[i].endDate) {
      activeIndex = i;
      break;
    }
  }

  const phase = plan.phases[activeIndex];
  if (!phase) return null;

  const startDate = new Date(phase.startDate);
  const endDate = new Date(phase.endDate);
  const weeksCompleted = Math.max(0, weeksBetween(startDate, today));
  const weeksRemaining = Math.max(0, weeksBetween(today, endDate));

  // Build label
  const phaseLabels: Record<NutritionPhaseType, string> = {
    massing: 'Massing',
    maintenance: 'Maintenance',
    mini_cut: 'Mini-Cut',
    fat_loss: 'Fat Loss',
    diet_break: 'Diet Break',
    fight_camp: 'Fight Camp',
    recovery: 'Recovery',
  };
  const label = `Week ${weeksCompleted + 1} of ${phase.plannedWeeks} · ${phaseLabels[phase.type]}`;

  // Build look-ahead (next competition or next phase transition)
  let lookAhead: string | null = null;
  const nextComp = competitions
    .filter(c => c.isActive && toDate(c.date) > today)
    .sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime())[0];
  if (nextComp) {
    const daysToComp = daysBetween(today, toDate(nextComp.date));
    const weeksToComp = Math.floor(daysToComp / 7);
    if (weeksToComp > 0) {
      lookAhead = `${weeksToComp} weeks to ${nextComp.name}`;
    } else {
      lookAhead = `${daysToComp} days to ${nextComp.name}`;
    }
  } else if (weeksRemaining <= 2 && activeIndex < plan.phases.length - 1) {
    const nextPhase = plan.phases[activeIndex + 1];
    lookAhead = `Next: ${phaseLabels[nextPhase.type]} (${nextPhase.plannedWeeks} weeks)`;
  }

  // Check if transition is recommended
  const { recommended, reason, nextPhaseType } = checkPhaseTransition(
    phase, weeksCompleted, bodyWeightLog, weeklyCheckIns
  );

  return {
    phase,
    weeksCompleted,
    weeksRemaining,
    label,
    lookAhead,
    transitionRecommended: recommended,
    transitionReason: reason,
    recommendedNextPhase: nextPhaseType,
  };
}

// ── Phase Transition Detection ──────────────────────────────────────────────

/**
 * Detect whether the current phase should end based on biometric signals.
 *
 * Biology-driven transitions, not arbitrary timers:
 * - Weight loss stalled for 2+ weeks despite >80% adherence → metabolic adaptation
 * - Performance declining >10% → deficit too aggressive
 * - Adherence <60% for 2 consecutive weeks → phase is unsustainable
 * - Body fat above 18-20% during massing → time to cut
 * - Planned duration reached → natural transition
 */
function checkPhaseTransition(
  phase: PlannedNutritionPhase,
  weeksCompleted: number,
  bodyWeightLog: BodyWeightEntry[],
  weeklyCheckIns: WeeklyCheckIn[],
): {
  recommended: boolean;
  reason: PhaseTransitionReason | null;
  nextPhaseType: NutritionPhaseType | null;
} {
  // Duration-based transition
  if (weeksCompleted >= phase.plannedWeeks) {
    const nextType = getNextPhaseAfter(phase.type);
    return {
      recommended: true,
      reason: 'phase_duration_complete',
      nextPhaseType: nextType,
    };
  }

  // Only check biometric signals after minimum 2 weeks in phase
  if (weeksCompleted < 2) {
    return { recommended: false, reason: null, nextPhaseType: null };
  }

  // For deficit phases: check for metabolic adaptation (weight stall)
  if (phase.type === 'fat_loss' || phase.type === 'mini_cut' || phase.type === 'fight_camp') {
    const recentCheckIns = weeklyCheckIns
      .filter(c => c.phaseId === phase.id)
      .sort((a, b) => b.weekNumber - a.weekNumber)
      .slice(0, 3);

    // Stall detection: weight change near zero for 2+ consecutive weeks despite adherence
    if (recentCheckIns.length >= 2) {
      const allStalled = recentCheckIns.slice(0, 2).every(c =>
        Math.abs(c.weightChange) < 0.15 // Less than 150g change
      );
      const goodAdherence = recentCheckIns.slice(0, 2).every(c =>
        c.adherenceScore >= 80
      );

      if (allStalled && goodAdherence) {
        return {
          recommended: true,
          reason: 'metabolic_adaptation',
          nextPhaseType: 'diet_break',
        };
      }
    }

    // Adherence breakdown: <60% for 2 consecutive weeks
    if (recentCheckIns.length >= 2) {
      const lowAdherence = recentCheckIns.slice(0, 2).every(c =>
        c.adherenceScore < 60
      );
      if (lowAdherence) {
        return {
          recommended: true,
          reason: 'adherence_breakdown',
          nextPhaseType: 'maintenance',
        };
      }
    }
  }

  // For massing phases: check if body weight is climbing too fast (excess fat gain)
  if (phase.type === 'massing' && bodyWeightLog.length >= 4) {
    const recent = bodyWeightLog.slice(-4);
    const oldest = recent[0];
    const newest = recent[recent.length - 1];
    const weeklyRate = getWeightKg(newest) - getWeightKg(oldest);
    // If gaining >0.5kg/week (much faster than 0.25 target), flag it
    if (weeklyRate > 0.5 * 4) { // Over 4 weeks
      return {
        recommended: true,
        reason: 'body_fat_threshold',
        nextPhaseType: 'maintenance',
      };
    }
  }

  return { recommended: false, reason: null, nextPhaseType: null };
}

/**
 * Given a phase type that just ended, what should come next?
 * This encodes the mandatory phase transition rules.
 */
function getNextPhaseAfter(type: NutritionPhaseType): NutritionPhaseType {
  switch (type) {
    case 'massing':     return 'maintenance';  // Always transition through maintenance
    case 'mini_cut':    return 'maintenance';   // Recover before next block
    case 'fat_loss':    return 'maintenance';   // Hormonal recovery
    case 'fight_camp':  return 'recovery';      // Post-comp recovery
    case 'diet_break':  return 'fat_loss';      // Resume cut after break
    case 'recovery':    return 'massing';       // Build back up
    case 'maintenance': return 'massing';       // Default to growth
    default:            return 'maintenance';
  }
}

// ── Training-Nutrition Coupling ─────────────────────────────────────────────

/**
 * Get the recommended training block focus for a given nutrition phase.
 *
 * First principles:
 * - Surplus + high volume = hypertrophy (optimal environment for muscle growth)
 * - Deficit + reduced volume + maintain intensity = strength (preserve muscle)
 * - Maintenance + moderate volume = strength or power (express gains)
 * - Fight camp = peaking (sport-specific preparation)
 *
 * Reference: Israetel 2019, Stone et al. 2007 block periodization
 */
export function getRecommendedTrainingFocus(
  phaseType: NutritionPhaseType,
  weeksInPhase: number,
  totalPhaseWeeks: number,
): BlockFocus {
  switch (phaseType) {
    case 'massing':
      // Hypertrophy is the primary focus during surplus
      return 'hypertrophy';

    case 'maintenance':
      // Strength or power — express gains built during massing
      return weeksInPhase < 2 ? 'strength' : 'power';

    case 'mini_cut':
    case 'fat_loss':
      // Strength focus to preserve muscle. Reduce volume, maintain intensity.
      return 'strength';

    case 'diet_break':
      // Keep training as-is — brief maintenance window
      return 'strength';

    case 'fight_camp':
      // Phase within fight camp: early = strength, late = peaking
      if (weeksInPhase < totalPhaseWeeks * 0.6) return 'strength';
      return 'peaking';

    case 'recovery':
      // Low stress base building
      return 'base_building';

    default:
      return 'strength';
  }
}

/**
 * Get the training volume modifier for the current nutrition phase.
 * During deficits, volume should be reduced to match recovery capacity.
 *
 * Returns a multiplier: 1.0 = normal, 0.7 = 30% reduction, 1.1 = 10% increase.
 */
export function getPhaseVolumeModifier(phaseType: NutritionPhaseType): number {
  switch (phaseType) {
    case 'massing':      return 1.10;   // Push volume during surplus (fuel supports recovery)
    case 'maintenance':  return 1.00;   // Normal volume
    case 'mini_cut':     return 0.70;   // Significant reduction during aggressive deficit
    case 'fat_loss':     return 0.80;   // Moderate reduction
    case 'diet_break':   return 0.90;   // Slightly reduced (still in a cut context)
    case 'fight_camp':   return 0.75;   // Reduced — sport skills take priority
    case 'recovery':     return 0.60;   // Minimal — recovery is the goal
    default:             return 1.00;
  }
}

// ── Phase Parameters for Macro Calculation ──────────────────────────────────

/**
 * Get the nutrition parameters for a phase type.
 * These are used by diet-coach.ts to calculate actual macro targets.
 */
export function getPhaseNutritionParams(phaseType: NutritionPhaseType): {
  calorieFactor: number;
  targetRateKgPerWeek: number;
  proteinGKg: number;
  pairedTrainingFocus: BlockFocus;
} {
  return { ...PHASE_PARAMS[phaseType] };
}

// ── Plan Adjustment ─────────────────────────────────────────────────────────

/**
 * Replan from the current phase onward when circumstances change.
 *
 * Triggers:
 * - New competition added
 * - Competition cancelled
 * - Phase transition (user confirmed or auto-detected)
 * - Manual phase override
 *
 * Preserves completed phases, replans from activePhaseIndex onward.
 */
export function replanFromCurrentPhase(
  existingPlan: NutritionPeriodPlan,
  input: PlannerInput,
): NutritionPeriodPlan {
  // Keep completed phases
  const completedPhases = existingPlan.phases.slice(0, existingPlan.activePhaseIndex);

  // Regenerate from now
  const newPlan = generateNutritionPlan(input);

  return {
    ...newPlan,
    id: existingPlan.id, // Keep same plan ID
    createdAt: existingPlan.createdAt,
    phases: [...completedPhases, ...newPlan.phases],
    activePhaseIndex: completedPhases.length,
    weeksIntoActivePhase: 0,
  };
}

/**
 * Advance the active phase to the next one in the plan.
 * Called when user confirms a phase transition.
 */
export function advancePhase(plan: NutritionPeriodPlan): NutritionPeriodPlan {
  const nextIndex = plan.activePhaseIndex + 1;
  if (nextIndex >= plan.phases.length) {
    return { ...plan, status: 'needs_review' };
  }
  return {
    ...plan,
    activePhaseIndex: nextIndex,
    weeksIntoActivePhase: 0,
    updatedAt: toLocalDateStr(new Date()),
  };
}

/**
 * Insert a diet break at the current position in the plan.
 * Pushes subsequent phases forward by DIET_BREAK_WEEKS.
 */
export function insertDietBreak(
  plan: NutritionPeriodPlan,
): NutritionPeriodPlan {
  const currentPhase = plan.phases[plan.activePhaseIndex];
  if (!currentPhase) return plan;

  const breakStart = new Date();
  const breakPhase = createPhase('diet_break', breakStart, DIET_BREAK_WEEKS,
    'Diet break — metabolic adaptation detected. 2 weeks at maintenance to reset adaptive thermogenesis.');

  // Split current phase: truncate at today, insert break, then resume
  const updatedCurrentPhase: PlannedNutritionPhase = {
    ...currentPhase,
    endDate: toLocalDateStr(new Date(breakStart.getTime() - 86400000)), // yesterday
    plannedWeeks: plan.weeksIntoActivePhase,
  };

  // Resume phase after break
  const resumeStart = addWeeks(breakStart, DIET_BREAK_WEEKS);
  const remainingWeeks = currentPhase.plannedWeeks - plan.weeksIntoActivePhase - DIET_BREAK_WEEKS;

  const phases = [...plan.phases];
  phases[plan.activePhaseIndex] = updatedCurrentPhase;

  // Insert diet break
  phases.splice(plan.activePhaseIndex + 1, 0, breakPhase);

  // Insert resumed phase if there's time left
  if (remainingWeeks > 0) {
    const resumePhase = createPhase(currentPhase.type, resumeStart, remainingWeeks,
      `Resume ${currentPhase.type} after diet break`,
      currentPhase.competitionId);
    phases.splice(plan.activePhaseIndex + 2, 0, resumePhase);
  }

  // Shift all subsequent phase dates forward by DIET_BREAK_WEEKS
  const shiftDays = DIET_BREAK_WEEKS * 7;
  for (let i = plan.activePhaseIndex + 3; i < phases.length; i++) {
    const p = phases[i];
    phases[i] = {
      ...p,
      startDate: toLocalDateStr(new Date(new Date(p.startDate).getTime() + shiftDays * 86400000)),
      endDate: toLocalDateStr(new Date(new Date(p.endDate).getTime() + shiftDays * 86400000)),
    };
  }

  return {
    ...plan,
    phases,
    activePhaseIndex: plan.activePhaseIndex + 1, // Move to diet break
    weeksIntoActivePhase: 0,
    updatedAt: toLocalDateStr(new Date()),
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function createPhase(
  type: NutritionPhaseType,
  startDate: Date,
  weeks: number,
  reasoning: string,
  competitionId?: string,
): PlannedNutritionPhase {
  const params = PHASE_PARAMS[type];
  const endDate = addWeeks(startDate, weeks);
  endDate.setDate(endDate.getDate() - 1); // End date is inclusive

  return {
    id: generateId(),
    type,
    startDate: toLocalDateStr(startDate),
    endDate: toLocalDateStr(endDate),
    plannedWeeks: weeks,
    calorieFactor: params.calorieFactor,
    targetRateKgPerWeek: params.targetRateKgPerWeek,
    proteinGKg: params.proteinGKg,
    pairedTrainingFocus: params.pairedTrainingFocus,
    reasoning,
    competitionId,
    dietBreakRecommended: false,
  };
}

function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

function weeksBetween(a: Date, b: Date): number {
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / (7 * 24 * 60 * 60 * 1000)));
}

function daysBetween(a: Date, b: Date): number {
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000)));
}

function getWeightKg(entry: BodyWeightEntry): number {
  return entry.unit === 'lbs' ? entry.weight * 0.453592 : entry.weight;
}

/** Safely convert a Date | string to Date (handles localStorage serialization). */
function toDate(d: Date | string): Date {
  return typeof d === 'string' ? new Date(d) : new Date(d.getTime());
}

/** Parse an ISO date string to Date. */
function parseDate(s: string): Date {
  return new Date(s);
}

function generateId(): string {
  return `pp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
