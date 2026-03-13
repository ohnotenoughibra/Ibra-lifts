/**
 * Fight Camp Nutrition Engine — periodized nutrition phasing for combat athletes.
 *
 * Automatically determines the nutrition phase based on proximity to competition
 * and generates phase-specific macro targets, recommendations, and warnings.
 *
 * Phases:
 *   off_season        → recovery + growth (post-competition)
 *   base_camp         → build performance base (10-8 weeks out)
 *   intensification   → lean out gradually (8-4 weeks out)
 *   fight_camp_peak   → final body comp push (4-2 weeks out)
 *   fight_week        → water/sodium/glycogen manipulation (7-2 days)
 *   weigh_in_day      → final dehydration + weigh-in
 *   fight_day         → rehydration + performance fueling
 *   tournament_day    → multi-match sustained energy
 *   post_competition  → recovery protocol (3-7 days post)
 *
 * Non-combat athletes: this engine is not used. They stay on the standard
 * diet-coach.ts cut/maintain/bulk phases.
 *
 * References:
 *   - Reale et al. 2017: Nutrition for combat sports
 *   - Petrizzo et al. 2017: Combat athlete nutrition review
 *   - Burke et al. 2011: Fuel for the work required
 */

import type {
  FightCampPhase, FightCampPhaseConfig, MacroTargets, BiologicalSex,
  CompetitionEvent,
} from './types';

// ── Phase Detection ──────────────────────────────────────────────────────────

/**
 * Determine the current fight camp nutrition phase based on days to competition.
 * Returns 'off_season' if no competition is upcoming or >10 weeks out.
 */
export function detectFightCampPhase(
  daysToCompetition: number | null,
  isPostCompetition: boolean = false,
  isTournament: boolean = false,
): FightCampPhase {
  if (isPostCompetition) return 'post_competition';
  if (daysToCompetition == null || daysToCompetition > 70) return 'off_season';
  if (daysToCompetition > 56) return 'base_camp';        // 10-8 weeks
  if (daysToCompetition > 28) return 'intensification';   // 8-4 weeks
  if (daysToCompetition > 7) return 'fight_camp_peak';    // 4-1 week
  if (daysToCompetition > 1) return 'fight_week';         // 7-2 days
  if (daysToCompetition === 1) return 'weigh_in_day';
  if (daysToCompetition === 0) return isTournament ? 'tournament_day' : 'fight_day';
  // Negative = post competition
  return 'post_competition';
}

// ── Phase Configuration ──────────────────────────────────────────────────────

export interface PhaseNutritionConfig {
  phase: FightCampPhase;
  name: string;
  calorieStrategy: string;
  proteinGKg: { min: number; max: number };
  carbsGKg: { min: number; max: number };
  fatGKg: { min: number; max: number };
  focus: string;
  recommendations: string[];
  restrictions: string[];
  warnings: string[];
  /** Multiplier applied to base TDEE for this phase. */
  calorieFactor: number;
}

/**
 * Get the nutrition configuration for a fight camp phase.
 * All values are combat-sport-specific and sex-adjusted.
 */
export function getPhaseConfig(
  phase: FightCampPhase,
  sex: BiologicalSex = 'male',
  needsWeightCut: boolean = false,
): PhaseNutritionConfig {
  const isFemale = sex === 'female';

  const configs: Record<FightCampPhase, PhaseNutritionConfig> = {
    off_season: {
      phase: 'off_season',
      name: 'Off Season',
      calorieStrategy: '10-15% above TDEE',
      proteinGKg: { min: 1.8, max: 2.2 },
      carbsGKg: { min: 5, max: 7 },
      fatGKg: { min: 1.0, max: 1.2 },
      focus: 'Recovery, muscle growth, mental reset',
      calorieFactor: isFemale ? 1.10 : 1.12,
      recommendations: [
        'Focus on muscle gain and injury rehab',
        'Enjoy food variety — no strict restrictions',
        'Address any nutritional deficiencies (get bloodwork)',
        'Prioritize sleep and stress management',
        'Build strength base for next camp',
      ],
      restrictions: [],
      warnings: [],
    },

    base_camp: {
      phase: 'base_camp',
      name: 'Base Camp (10-8 weeks out)',
      calorieStrategy: 'Maintenance to slight surplus',
      proteinGKg: { min: 2.0, max: 2.4 },
      carbsGKg: { min: 4, max: 6 },
      fatGKg: { min: 0.8, max: 1.0 },
      focus: 'Training fuel, volume tolerance, skill acquisition',
      calorieFactor: 1.0,
      recommendations: [
        'Fuel training adequately — this is your performance base',
        'Establish meal prep routine and competition-day meals',
        'Begin tracking macros consistently',
        'Minimize processed foods, prioritize whole foods',
        'Start collagen + vitamin C protocol for joint health',
      ],
      restrictions: ['Minimize alcohol', 'Limit processed food'],
      warnings: [],
    },

    intensification: {
      phase: 'intensification',
      name: 'Intensification (8-4 weeks out)',
      calorieStrategy: needsWeightCut ? '10-20% deficit' : 'Maintenance',
      proteinGKg: { min: 2.4, max: 2.8 }, // Protein targets equal for both sexes during deficit; females may need equal or higher protein at low EA (Lowery et al. 2023, Mountjoy et al. 2023)
      carbsGKg: { min: 3, max: 5 },
      fatGKg: { min: 0.7, max: 0.9 },
      focus: 'Body composition, maintain training intensity',
      calorieFactor: needsWeightCut ? 0.85 : 1.0,
      recommendations: [
        'Strict macro tracking — every meal counts',
        needsWeightCut ? 'Gradual caloric reduction to lose fat, not just water' : 'Maintain weight, focus on performance',
        'Periodize carbs around training (more on hard days, less on rest)',
        'Protein distribution: 4-5 meals with 30-40g each',
        'Monitor energy levels and training performance',
      ],
      restrictions: ['No alcohol', 'No eating out (control your macros)', 'Limit sodium variability'],
      warnings: needsWeightCut
        ? ['Monitor energy availability (>30 kcal/kg FFM)', 'Watch for mood/sleep disruption']
        : [],
    },

    fight_camp_peak: {
      phase: 'fight_camp_peak',
      name: 'Fight Camp Peak (4-2 weeks out)',
      calorieStrategy: needsWeightCut ? '15-25% deficit' : 'Slight surplus on training days',
      proteinGKg: { min: 2.8, max: 3.1 }, // Protein targets equal for both sexes during deficit; females may need equal or higher protein at low EA (Lowery et al. 2023, Mountjoy et al. 2023)
      carbsGKg: { min: 2.5, max: 4 },
      fatGKg: { min: 0.7, max: 0.8 },
      focus: 'Preserve muscle, sharpen weight',
      calorieFactor: needsWeightCut ? 0.78 : 1.02,
      recommendations: [
        'Strict meal prep — no surprises',
        'Weigh daily (AM, fasted, post-void)',
        'Protein at maximum: preserve every gram of lean mass',
        'Carbs only around training sessions',
        'Begin planning water/sodium protocol if cutting weight',
      ],
      restrictions: ['Strict meal prep only', 'No dining out', 'No alcohol', 'Minimize sodium variability'],
      warnings: [
        'Performance may dip — this is normal during aggressive deficit',
        'If training performance drops >15%, increase carbs on training days',
        'Monitor sleep quality — poor sleep accelerates muscle loss',
      ],
    },

    fight_week: {
      phase: 'fight_week',
      name: 'Fight Week (7-2 days out)',
      calorieStrategy: 'Controlled protocol — see weight cut engine',
      proteinGKg: { min: 3.0, max: 3.1 }, // Protein targets equal for both sexes during deficit; females may need equal or higher protein at low EA (Lowery et al. 2023, Mountjoy et al. 2023)
      carbsGKg: { min: 0.5, max: 2.0 },
      fatGKg: { min: 0.5, max: 0.7 },
      focus: 'Water/sodium/glycogen manipulation',
      calorieFactor: 0.7,
      recommendations: [
        'Follow the weight cut protocol precisely',
        'Water loading → taper protocol active',
        'Sodium loading → restriction protocol active',
        'Low-fiber, low-residue foods to reduce gut content',
        'Reduce training volume 30-50% — stay sharp, not fatigued',
        'Prioritize sleep above all else',
      ],
      restrictions: ['Low fiber (<10g)', 'Controlled sodium', 'No new foods', 'No alcohol'],
      warnings: [
        'PROFESSIONAL SUPERVISION RECOMMENDED for water cuts >5% BW',
        'Monitor: resting HR, urine color, mental clarity, mood',
        'STOP if: confusion, HR >100 resting, inability to urinate, severe cramping',
      ],
    },

    weigh_in_day: {
      phase: 'weigh_in_day',
      name: 'Weigh-In Day',
      calorieStrategy: 'Pre weigh-in: nothing. Post weigh-in: rehydration protocol',
      proteinGKg: { min: 1.5, max: 2.0 },
      carbsGKg: { min: 8, max: 10 },
      fatGKg: { min: 0.3, max: 0.5 },
      focus: 'Make weight → begin rehydration immediately',
      calorieFactor: 1.5, // aggressive refeeding post weigh-in
      recommendations: [
        'Final weigh-in protocol: nothing until after stepping on the scale',
        'Immediately after weigh-in: begin rehydration (sip ORS, do not chug)',
        'First 2 hours: 1-1.5L fluid + electrolytes + light carbs',
        'Eat every 1-2 hours: rice, chicken, banana, sports drink',
        'Target glycogen supercompensation: 8-10 g/kg carbs over 12-24hrs',
        'Avoid fiber, dairy, and high-fat foods (slow gastric emptying)',
      ],
      restrictions: ['No fiber', 'No dairy', 'Minimal fat', 'Familiar foods only'],
      warnings: [
        'Do NOT chug water — sip slowly (hyponatremia risk)',
        'Monitor urine color — aim for pale yellow before competition',
        'Prioritize 8-9 hours of sleep tonight',
      ],
    },

    fight_day: {
      phase: 'fight_day',
      name: 'Fight Day',
      calorieStrategy: 'High carb, moderate protein, low fat — performance focus',
      proteinGKg: { min: 1.5, max: 2.0 },
      carbsGKg: { min: 6, max: 8 },
      fatGKg: { min: 0.3, max: 0.5 },
      focus: 'Maximize performance — you should feel full and strong',
      calorieFactor: 1.3,
      recommendations: [
        'Last solid meal 3-4 hours before fight',
        'Meal: white rice + lean protein + small amount of honey/jam',
        'Sip water + electrolytes throughout the day',
        'Light snack 1-2 hours before: banana, rice cake, sports drink',
        'You should feel full, hydrated, and energized — not bloated',
        'Body weight should be 5-8% above weigh-in weight',
      ],
      restrictions: ['No fiber', 'No heavy fats', 'No spicy food', 'Nothing new'],
      warnings: ['NEVER try new foods on fight day', 'If GI distress: switch to liquid nutrition'],
    },

    tournament_day: {
      phase: 'tournament_day',
      name: 'Tournament Day',
      calorieStrategy: 'Sustained energy across multiple matches',
      proteinGKg: { min: 1.5, max: 2.0 },
      carbsGKg: { min: 6, max: 10 },
      fatGKg: { min: 0.3, max: 0.5 },
      focus: 'Sustained energy — fueling between matches is critical',
      calorieFactor: 1.4,
      recommendations: [
        'Pre-first-match (3-4hrs before): 500-600cal meal (rice + chicken + banana)',
        'Between matches (every 30-60min): 100-200cal (dates, rice cakes, sports drink)',
        'Sip 200-400ml water + electrolytes between matches',
        'Post-final-match: large recovery meal within 60 minutes',
        'Pack all food the night before — do not rely on venue food',
        'Practice this exact protocol in training before tournament',
      ],
      restrictions: ['No fiber', 'No dairy', 'No heavy meals between matches'],
      warnings: ['Dehydration is cumulative across matches — track water intake', 'If you feel lightheaded between matches: electrolyte drink + dates immediately'],
    },

    post_competition: {
      phase: 'post_competition',
      name: 'Post-Competition Recovery',
      calorieStrategy: 'Maintenance to slight surplus — recovery focus',
      proteinGKg: { min: 1.8, max: 2.2 },
      carbsGKg: { min: 5, max: 7 },
      fatGKg: { min: 1.0, max: 1.2 },
      focus: 'Physical and mental recovery',
      calorieFactor: 1.1,
      recommendations: [
        'Day 1: high omega-3, tart cherry, adequate protein, extra sleep',
        'Days 2-5: anti-inflammatory foods, gentle movement, sauna if desired',
        'No strict dieting for at least 1 week — let your body recover',
        'Address any injuries before returning to hard training',
        'Mental health check: decompress, celebrate, then plan next steps',
        'Gradually return to normal training over 1-2 weeks',
      ],
      restrictions: [],
      warnings: ['Do NOT crash diet immediately after competition', 'Post-competition depression is real — reach out if mood is persistently low'],
    },
  };

  return configs[phase];
}

// ── Phase Transition Detection ───────────────────────────────────────────────

/**
 * Check if the athlete should transition to a new phase and generate a notification.
 */
export function checkPhaseTransition(
  currentPhase: FightCampPhase,
  daysToCompetition: number | null,
  isTournament: boolean = false,
): { shouldTransition: boolean; newPhase: FightCampPhase; message: string } | null {
  const detectedPhase = detectFightCampPhase(daysToCompetition, false, isTournament);

  if (detectedPhase === currentPhase) return null;

  const config = getPhaseConfig(detectedPhase);
  return {
    shouldTransition: true,
    newPhase: detectedPhase,
    message: `Entering ${config.name}. Focus: ${config.focus}. ${config.warnings.length > 0 ? 'Warning: ' + config.warnings[0] : ''}`,
  };
}

// ── Macro Generation for Phase ───────────────────────────────────────────────

/**
 * Generate macro targets for a specific fight camp phase.
 * Applies the phase's calorie factor to the base TDEE.
 */
export function generatePhaseMacros(
  baseTDEE: number,
  bodyWeightKg: number,
  phase: FightCampPhase,
  sex: BiologicalSex = 'male',
  needsWeightCut: boolean = false,
): MacroTargets {
  const config = getPhaseConfig(phase, sex, needsWeightCut);

  const calories = Math.round(baseTDEE * config.calorieFactor);

  // Use midpoint of protein and fat ranges, fill rest with carbs
  const proteinGKg = (config.proteinGKg.min + config.proteinGKg.max) / 2;
  const fatGKg = (config.fatGKg.min + config.fatGKg.max) / 2;

  const protein = Math.round(bodyWeightKg * proteinGKg);
  const fat = Math.round(bodyWeightKg * fatGKg);

  const proteinCal = protein * 4;
  const fatCal = fat * 9;
  const carbCal = Math.max(0, calories - proteinCal - fatCal);
  const carbs = Math.round(carbCal / 4);

  return { calories, protein, carbs, fat };
}

// ── Full Fight Camp Timeline ─────────────────────────────────────────────────

/**
 * Generate a complete fight camp nutrition timeline from current date to competition.
 */
export function generateFightCampTimeline(
  competition: CompetitionEvent,
  bodyWeightKg: number,
  sex: BiologicalSex = 'male',
): FightCampPhaseConfig[] {
  const eventDate = new Date(competition.date);
  const now = new Date();
  const totalDays = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const needsWeightCut = competition.weightClass != null && bodyWeightKg > competition.weightClass;

  const phases: FightCampPhaseConfig[] = [];

  // Work backwards from competition date
  const phaseRanges: { phase: FightCampPhase; daysOut: number }[] = [
    { phase: 'fight_day', daysOut: 0 },
    { phase: 'weigh_in_day', daysOut: 1 },
    { phase: 'fight_week', daysOut: 7 },
    { phase: 'fight_camp_peak', daysOut: 28 },
    { phase: 'intensification', daysOut: 56 },
    { phase: 'base_camp', daysOut: 70 },
    { phase: 'off_season', daysOut: totalDays },
  ];

  for (let i = 0; i < phaseRanges.length - 1; i++) {
    const current = phaseRanges[i];
    const next = phaseRanges[i + 1];

    if (totalDays < current.daysOut) continue;

    const startDate = new Date(eventDate);
    startDate.setDate(startDate.getDate() - Math.min(next.daysOut, totalDays));
    const endDate = new Date(eventDate);
    endDate.setDate(endDate.getDate() - current.daysOut);

    const config = getPhaseConfig(current.phase, sex, needsWeightCut);

    phases.push({
      phase: current.phase,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      calorieStrategy: config.calorieStrategy,
      proteinGKg: config.proteinGKg,
      carbsGKg: config.carbsGKg,
      fatGKg: config.fatGKg,
      focus: config.focus,
      restrictions: config.restrictions,
      warnings: config.warnings,
    });
  }

  return phases.reverse(); // chronological order
}
