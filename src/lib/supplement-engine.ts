/**
 * Supplement Engine — tiered, evidence-based supplement framework for athletes.
 *
 * Three tiers:
 *   Tier 1 (Essential): daily for all athletes, strong evidence
 *   Tier 2 (Situational): based on training phase, competition proximity
 *   Tier 3 (Optional): advanced, moderate evidence, individual response
 *
 * Combat-sport-specific considerations:
 *   - Creatine paused before weigh-in (1-3kg water weight)
 *   - Caffeine cycled to maintain sensitivity
 *   - Sodium bicarbonate for multi-round fights
 *   - Collagen for joint health in grapplers
 *   - Anti-doping warnings for tested athletes
 *
 * References:
 *   - Kreider et al. 2017: ISSN position stand on creatine
 *   - Calder 2017: omega-3 and inflammation
 *   - Owens et al. 2018: vitamin D in athletes
 *   - Shaw et al. 2017: collagen + vitamin C for tendon/ligament
 *   - Wankhede et al. 2015: ashwagandha (KSM-66)
 */

import type {
  SupplementRecommendation,
  SupplementTier,
  SupplementMacros,
  SupplementIntake,
  UserSupplement,
} from './types';
import { toLocalDateStr } from './utils';

// ── Supplement Macro Database ───────────────────────────────────────────────
// Per-serving macro data for supplements that contribute meaningful nutrition.
// Based on typical product labels (hydrolyzed collagen, whey protein, etc.)
// Users can override these with their specific product's values.

export const SUPPLEMENT_MACROS: Record<string, SupplementMacros & { servingLabel: string }> = {
  collagen: {
    // 15-20g hydrolyzed collagen peptides per serving
    calories: 70,
    protein: 18,   // collagen peptides are ~90% protein by weight
    carbs: 0,
    fat: 0,
    servingLabel: '1 scoop (20g)',
  },
  creatine: {
    // 5g creatine monohydrate — negligible macros
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    servingLabel: '1 scoop (5g)',
  },
  omega3: {
    // 2 softgels — ~18 kcal from fish oil fat
    calories: 18,
    protein: 0,
    carbs: 0,
    fat: 2,
    servingLabel: '2 softgels',
  },
  vitamin_d: { calories: 0, protein: 0, carbs: 0, fat: 0, servingLabel: '1 softgel' },
  magnesium: { calories: 0, protein: 0, carbs: 0, fat: 0, servingLabel: '2 capsules' },
  caffeine: { calories: 0, protein: 0, carbs: 0, fat: 0, servingLabel: '1 capsule / 1 espresso' },
  beta_alanine: { calories: 0, protein: 0, carbs: 0, fat: 0, servingLabel: '1 scoop (3.2g)' },
  sodium_bicarbonate: { calories: 0, protein: 0, carbs: 0, fat: 0, servingLabel: '0.3g/kg split dose' },
  electrolytes: {
    // Most electrolyte mixes have trace carbs from flavor
    calories: 10,
    protein: 0,
    carbs: 2,
    fat: 0,
    servingLabel: '1 packet / 1 scoop',
  },
  tart_cherry: {
    // 30ml juice concentrate
    calories: 45,
    protein: 0,
    carbs: 11,
    fat: 0,
    servingLabel: '30ml concentrate',
  },
  ashwagandha: { calories: 0, protein: 0, carbs: 0, fat: 0, servingLabel: '1 capsule (600mg)' },
  zinc: { calories: 0, protein: 0, carbs: 0, fat: 0, servingLabel: '1 capsule (30mg)' },
  iron: { calories: 0, protein: 0, carbs: 0, fat: 0, servingLabel: '1 capsule' },
  citrulline: { calories: 0, protein: 0, carbs: 0, fat: 0, servingLabel: '1 scoop (8g)' },
  hmb: { calories: 0, protein: 0, carbs: 0, fat: 0, servingLabel: '3 capsules (3g)' },
};

// ── Complete Supplement Database ─────────────────────────────────────────────

export const SUPPLEMENT_DATABASE: SupplementRecommendation[] = [
  // ── TIER 1: Essential (daily for all athletes) ──────────────────────────
  {
    id: 'creatine',
    name: 'Creatine Monohydrate',
    tier: 'essential',
    doseRange: '3-5g/day',
    timing: 'Anytime with a meal (consistency > timing)',
    frequency: 'Daily',
    evidence: 'Kreider et al. 2017 (ISSN) — most studied, safest ergogenic aid. Improves strength, power output, and recovery.',
    combatNotes: 'PAUSE 7 days before weigh-in — creatine holds 1-3kg water weight. Resume immediately after weigh-in. No loading phase needed; 3-5g daily saturates in ~3-4 weeks.',
    pauseBeforeWeighIn: 7,
    bannedSubstanceRisk: false,
  },
  {
    id: 'omega3',
    name: 'Omega-3 (EPA + DHA)',
    tier: 'essential',
    doseRange: '2-3g combined EPA+DHA daily',
    timing: 'With meals containing fat (enhances absorption)',
    frequency: 'Daily',
    evidence: 'Calder 2017 — anti-inflammatory, neuroprotective. Ochi et al. 2018 — may reduce exercise-induced muscle damage.',
    combatNotes: 'Non-negotiable for athletes taking head impacts (BJJ, MMA, boxing). Neuroprotective effect is important. Use fish oil or algae-based (for vegetarians). Look for high EPA:DHA ratio.',
    bannedSubstanceRisk: false,
  },
  {
    id: 'vitamin_d',
    name: 'Vitamin D3',
    tier: 'essential',
    doseRange: '2000-5000 IU/day (adjust based on blood levels)',
    timing: 'Morning with fat-containing meal',
    frequency: 'Daily',
    evidence: 'Owens et al. 2018 — 56% of athletes are deficient. Affects immune function, bone health, muscle recovery, and mood.',
    combatNotes: 'Higher dose needed if: indoor training, dark skin, northern latitude, or winter. Test 25(OH)D levels annually — target 40-60 ng/mL. Essential for bone health under high-impact training.',
    bannedSubstanceRisk: false,
  },
  {
    id: 'magnesium',
    name: 'Magnesium Glycinate',
    tier: 'essential',
    doseRange: '200-400mg elemental magnesium',
    timing: '30-60 minutes before bed',
    frequency: 'Daily',
    evidence: 'Zhang et al. 2017 — improves sleep quality. Volpe 2015 — athletes lose significant Mg through sweat.',
    combatNotes: 'Use GLYCINATE form for sleep (not oxide — poor absorption and GI issues). Critical for fighters who sweat heavily. Supports muscle relaxation, sleep quality, and recovery. Part of ZMA stack with zinc.',
    bannedSubstanceRisk: false,
  },

  // ── TIER 2: Situational (based on training phase) ──────────────────────
  {
    id: 'caffeine',
    name: 'Caffeine',
    tier: 'situational',
    doseRange: '3-6mg/kg body weight',
    timing: '30-60 minutes pre-session',
    frequency: 'Competition and hard sparring days only (cycle: 5 on, 2 off)',
    evidence: 'Goldstein et al. 2010 (ISSN) — improves power output, endurance, and reaction time at 3-6mg/kg.',
    combatNotes: 'Use for competition and hard sparring ONLY — do not build daily tolerance. Cycle: 5 days on, 2 off to maintain sensitivity. AVOID before evening grappling (half-life 5-6hrs disrupts sleep). For a 77kg fighter: 230-460mg. Start low, assess tolerance.',
    bannedSubstanceRisk: false,
    contraindications: ['Anxiety disorders', 'Sleep issues', 'Evening training'],
  },
  {
    id: 'beta_alanine',
    name: 'Beta-Alanine',
    tier: 'situational',
    doseRange: '3.2-6.4g/day (split into 2-3 doses)',
    timing: 'Any time — split doses to minimize tingling',
    frequency: 'Daily (takes 4+ weeks to saturate carnosine stores)',
    evidence: 'Hobson et al. 2012 — buffers muscle pH during high-intensity exercise lasting 1-4 minutes. Most relevant for repeated high-intensity bouts.',
    combatNotes: 'Best for multi-round fights and high-rep grappling exchanges. The tingling (paresthesia) is harmless — reduce dose per serving if uncomfortable. Takes 4+ weeks of daily use to work. Not useful as a one-time pre-workout.',
    bannedSubstanceRisk: false,
  },
  {
    id: 'sodium_bicarbonate',
    name: 'Sodium Bicarbonate',
    tier: 'situational',
    doseRange: '0.2-0.3g/kg body weight',
    timing: '60-90 minutes before competition (split dose over 30 minutes)',
    frequency: 'Competition day only',
    evidence: 'Carr et al. 2011 — buffers blood pH, improving repeated high-intensity performance. Meta-analyses show 2-3% improvement in repeated sprint ability.',
    combatNotes: 'GI distress is the major issue — MUST trial multiple times in training before using in competition. Split the dose over 30min with plenty of water. Take with a small carb-rich snack. Some athletes tolerate sodium citrate better. For a 77kg fighter: ~15-23g.',
    bannedSubstanceRisk: false,
    contraindications: ['History of GI issues', 'Sodium-restricted diet'],
  },
  {
    id: 'collagen',
    name: 'Collagen + Vitamin C',
    tier: 'situational',
    doseRange: '15-20g hydrolyzed collagen + 50mg vitamin C',
    timing: '30-60 minutes BEFORE training',
    frequency: 'Daily, especially on grappling/sparring days',
    evidence: 'Shaw et al. 2017 — 15g collagen + vitamin C 1hr before exercise doubled collagen synthesis markers in engineered ligaments.',
    combatNotes: 'Not optional for grapplers and MMA fighters. Joint stress in BJJ/wrestling is extreme. Vitamin C is required for collagen synthesis — take them together. Timing matters: must be before training, not after. Use hydrolyzed form for absorption.',
    bannedSubstanceRisk: false,
  },
  {
    id: 'electrolytes',
    name: 'Electrolyte Mix',
    tier: 'situational',
    doseRange: '500-1500mg sodium + 200mg potassium + 50mg magnesium per liter',
    timing: 'During sessions >60 minutes and post-training',
    frequency: 'Training days',
    evidence: 'Sawka et al. 2007 (ACSM) — fluid replacement guidelines. Baker et al. 2016 — sweat electrolyte losses in athletes.',
    combatNotes: 'Custom mix is better than commercial sports drinks (usually too much sugar, not enough sodium). For hot gyms or gi training: increase to 1000-1500mg sodium/L. Weigh before/after training to calibrate personal sweat rate.',
    bannedSubstanceRisk: false,
  },
  {
    id: 'tart_cherry',
    name: 'Tart Cherry Extract',
    tier: 'situational',
    doseRange: '480mg capsules or 30ml juice concentrate',
    timing: 'Evening / post-training',
    frequency: 'Daily during hard training blocks, tournament weekends',
    evidence: 'Howatson et al. 2010 — reduced DOMS and inflammatory markers. Contains natural melatonin.',
    combatNotes: 'Dual benefit: anti-inflammatory + natural sleep aid (melatonin content). Especially useful during tournament weekends with multiple matches. The juice concentrate has more evidence than capsules.',
    bannedSubstanceRisk: false,
  },

  // ── TIER 3: Optional/Advanced ──────────────────────────────────────────
  {
    id: 'ashwagandha',
    name: 'Ashwagandha (KSM-66)',
    tier: 'optional',
    doseRange: '600mg/day',
    timing: 'Morning or evening',
    frequency: 'Daily during high-stress periods (fight camp)',
    evidence: 'Wankhede et al. 2015 — improved strength and recovery. Salve et al. 2019 — reduced cortisol by 11-32%.',
    combatNotes: 'Best used during fight camp when stress/cortisol is highest. Use KSM-66 extract specifically (most studied). Stop 2 weeks before drug testing if concerned (some banned substance lists are overly broad).',
    bannedSubstanceRisk: false,
    contraindications: ['Pre-existing thyroid conditions — consult your doctor (limited case-report evidence of thyroid hormone elevation; healthy individuals unaffected)'],
  },
  {
    id: 'zinc',
    name: 'Zinc',
    tier: 'optional',
    doseRange: '15-30mg/day',
    timing: 'Evening with magnesium (ZMA stack)',
    frequency: 'Daily, especially during cuts',
    evidence: 'Kilic et al. 2006 — zinc supplementation prevented testosterone decline during intense training.',
    combatNotes: 'Important for male athletes during caloric restriction. Only supplement if diet is insufficient (common during cuts). Pairs well with magnesium as ZMA. Do not take with calcium or iron (absorption competition).',
    bannedSubstanceRisk: false,
  },
  {
    id: 'iron',
    name: 'Iron',
    tier: 'optional',
    doseRange: '18-65mg/day (ONLY if deficient)',
    timing: 'Morning on empty stomach with vitamin C (enhances absorption)',
    frequency: 'As directed by physician',
    evidence: 'Sim et al. 2019 — iron deficiency common in female athletes (up to 35%). Impairs endurance and recovery.',
    combatNotes: 'FEMALE FIGHTERS: test serum ferritin annually. Do NOT supplement blindly — iron overload causes organ damage. Target ferritin >30 ng/mL (>50 for optimal performance). Avoid taking with coffee, tea, or calcium.',
    bannedSubstanceRisk: false,
    contraindications: ['Hemochromatosis', 'Never supplement without blood test'],
  },
  {
    id: 'citrulline',
    name: 'Citrulline Malate',
    tier: 'optional',
    doseRange: '6-8g',
    timing: '30-60 minutes pre-workout',
    frequency: 'Lifting days',
    evidence: 'Perez-Guisado & Jakeman 2010 — improved high-intensity exercise performance and reduced DOMS.',
    combatNotes: 'Primarily useful for lifting sessions (blood flow, pump). Less relevant for grappling. Take 30-60 min pre-lifting on 2:1 citrulline:malate ratio. The "pump" can feel good but is not the primary benefit.',
    bannedSubstanceRisk: false,
  },
  {
    id: 'hmb',
    name: 'HMB (Beta-Hydroxy Beta-Methylbutyrate)',
    tier: 'optional',
    doseRange: '3g/day (split into 3x1g doses)',
    timing: 'With meals, spread throughout the day',
    frequency: 'During aggressive cuts only',
    evidence: 'Wilson et al. 2014 — may preserve lean mass during caloric restriction. Effect size is modest.',
    combatNotes: 'Only worthwhile during aggressive fight camp cuts (>20% deficit). Moderate evidence at best. Use free acid form (HMB-FA) for better absorption. Not a miracle supplement — diet and training matter 100x more.',
    bannedSubstanceRisk: false,
  },
];

// ── Supplement Selection Logic ───────────────────────────────────────────────

export interface SupplementPlan {
  daily: SupplementRecommendation[];
  trainingDay: SupplementRecommendation[];
  competitionDay: SupplementRecommendation[];
  warnings: string[];
}

/**
 * Generate a personalized supplement plan based on context.
 */
export function getSupplementPlan({
  isCombatAthlete = false,
  isTestedAthlete = false,
  isInCut = false,
  daysToCompetition,
  trainingDayType,
  sex,
}: {
  isCombatAthlete?: boolean;
  isTestedAthlete?: boolean;
  isInCut?: boolean;
  daysToCompetition?: number;
  trainingDayType?: string;
  sex?: string;
}): SupplementPlan {
  const warnings: string[] = [];
  const daily: SupplementRecommendation[] = [];
  const trainingDay: SupplementRecommendation[] = [];
  const competitionDay: SupplementRecommendation[] = [];

  const db = SUPPLEMENT_DATABASE;

  // Tier 1 — always recommended
  const creatine = db.find(s => s.id === 'creatine')!;
  const omega3 = db.find(s => s.id === 'omega3')!;
  const vitD = db.find(s => s.id === 'vitamin_d')!;
  const magnesium = db.find(s => s.id === 'magnesium')!;

  // Check if creatine should be paused for weigh-in
  if (daysToCompetition != null && daysToCompetition <= (creatine.pauseBeforeWeighIn ?? 7) && isCombatAthlete) {
    warnings.push(`PAUSE creatine now — ${daysToCompetition} days to competition. It holds 1-3kg water weight. Resume immediately after weigh-in.`);
  } else {
    daily.push(creatine);
  }

  daily.push(omega3, vitD, magnesium);

  // Tier 2 — contextual
  const collagen = db.find(s => s.id === 'collagen')!;
  const electrolytes = db.find(s => s.id === 'electrolytes')!;
  const caffeine = db.find(s => s.id === 'caffeine')!;
  const betaAlanine = db.find(s => s.id === 'beta_alanine')!;
  const bicarb = db.find(s => s.id === 'sodium_bicarbonate')!;
  const tartCherry = db.find(s => s.id === 'tart_cherry')!;

  // Collagen for grappling/combat athletes
  if (isCombatAthlete || trainingDayType?.includes('grappling') || trainingDayType?.includes('wrestling')) {
    trainingDay.push(collagen);
  }

  // Electrolytes for training days
  trainingDay.push(electrolytes);

  // Caffeine for competition
  competitionDay.push(caffeine);

  // Beta-alanine during fight camp (needs 4+ weeks to work)
  if (isCombatAthlete && daysToCompetition != null && daysToCompetition > 28) {
    daily.push(betaAlanine);
  }

  // Sodium bicarbonate for competition only
  competitionDay.push(bicarb);

  // Tart cherry for recovery
  if (isCombatAthlete) {
    daily.push(tartCherry);
  }

  // Tier 3 — specific contexts
  if (isInCut) {
    const zinc = db.find(s => s.id === 'zinc')!;
    daily.push(zinc);

    // HMB only during aggressive cuts
    const hmb = db.find(s => s.id === 'hmb')!;
    if (isCombatAthlete && daysToCompetition != null && daysToCompetition < 42) {
      daily.push(hmb);
      warnings.push('HMB added for lean mass preservation during aggressive cut. Moderate evidence — diet adherence matters more.');
    }
  }

  if (sex === 'female') {
    const iron = db.find(s => s.id === 'iron')!;
    warnings.push('Female athletes: test serum ferritin annually. Iron supplementation only if deficient (ferritin <30 ng/mL).');
    // Don't auto-add iron — requires blood test first
  }

  // Anti-doping warnings
  if (isTestedAthlete) {
    warnings.push(
      'TESTED ATHLETE: Only use supplements with third-party testing (NSF Certified for Sport, Informed Sport, or BSCG).',
      'Up to 25% of supplements contain undeclared banned substances. Check every product at GlobalDRO.com.',
    );
  }

  return { daily, trainingDay, competitionDay, warnings };
}

/**
 * Get supplements that should be paused near competition.
 */
export function getPreCompetitionPauses(daysToCompetition: number): { supplement: string; reason: string }[] {
  const pauses: { supplement: string; reason: string }[] = [];

  for (const supp of SUPPLEMENT_DATABASE) {
    if (supp.pauseBeforeWeighIn && daysToCompetition <= supp.pauseBeforeWeighIn) {
      pauses.push({
        supplement: supp.name,
        reason: `Pause ${supp.pauseBeforeWeighIn} days before weigh-in. ${supp.combatNotes.split('.')[0]}.`,
      });
    }
  }

  return pauses;
}

// ── Smart Supplement Tracking ───────────────────────────────────────────────

/**
 * Get the macro content for a supplement serving.
 * Uses default database values, but respects user overrides.
 */
export function getSupplementMacros(
  supplementId: string,
  servings: number = 1,
  userOverride?: SupplementMacros | null,
): SupplementMacros | null {
  const macros = userOverride ?? SUPPLEMENT_MACROS[supplementId];
  if (!macros || (macros.calories === 0 && macros.protein === 0 && macros.carbs === 0 && macros.fat === 0)) {
    return null; // No meaningful macros (e.g., vitamin D capsule)
  }
  return {
    calories: Math.round(macros.calories * servings),
    protein: Math.round(macros.protein * servings * 10) / 10,
    carbs: Math.round(macros.carbs * servings * 10) / 10,
    fat: Math.round(macros.fat * servings * 10) / 10,
  };
}

/**
 * Calculate total macros contributed by all supplement intakes for a given date.
 * This is what gets auto-added to the nutrition tracker.
 */
export function getDailySupplementMacros(
  intakes: SupplementIntake[],
  dateStr: string,
): SupplementMacros {
  const dayIntakes = intakes.filter(i => i.date === dateStr);
  return dayIntakes.reduce<SupplementMacros>(
    (acc, intake) => {
      if (!intake.macrosPerServing) return acc;
      return {
        calories: acc.calories + Math.round(intake.macrosPerServing.calories * intake.servings),
        protein: acc.protein + Math.round(intake.macrosPerServing.protein * intake.servings * 10) / 10,
        carbs: acc.carbs + Math.round(intake.macrosPerServing.carbs * intake.servings * 10) / 10,
        fat: acc.fat + Math.round(intake.macrosPerServing.fat * intake.servings * 10) / 10,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

/**
 * Build a default supplement stack based on the user's plan.
 * Maps the SupplementPlan output to UserSupplement entries with timing.
 */
export function buildDefaultStack(plan: SupplementPlan): UserSupplement[] {
  const stack: UserSupplement[] = [];
  const seen = new Set<string>();

  const addSupp = (supp: SupplementRecommendation, slot: UserSupplement['timingSlot']) => {
    if (seen.has(supp.id)) return;
    seen.add(supp.id);
    const macroData = SUPPLEMENT_MACROS[supp.id];
    const hasMacros = macroData && (macroData.calories > 0 || macroData.protein > 0);
    stack.push({
      supplementId: supp.id,
      name: supp.name,
      macrosPerServing: hasMacros ? { calories: macroData.calories, protein: macroData.protein, carbs: macroData.carbs, fat: macroData.fat } : null,
      servingsPerDose: 1,
      enabled: true,
      timingSlot: slot,
    });
  };

  // Map each supplement to its ideal timing
  const timingMap: Record<string, UserSupplement['timingSlot']> = {
    creatine: 'with_meal',
    omega3: 'with_meal',
    vitamin_d: 'morning',
    magnesium: 'evening',
    caffeine: 'pre_workout',
    beta_alanine: 'with_meal',
    collagen: 'pre_workout',       // Shaw et al. 2017: 30-60 min pre-training
    electrolytes: 'pre_workout',
    tart_cherry: 'evening',
    ashwagandha: 'morning',
    zinc: 'evening',
    iron: 'morning',
    citrulline: 'pre_workout',
    hmb: 'with_meal',
    sodium_bicarbonate: 'pre_workout',
  };

  for (const supp of plan.daily) {
    addSupp(supp, timingMap[supp.id] ?? 'with_meal');
  }
  for (const supp of plan.trainingDay) {
    addSupp(supp, timingMap[supp.id] ?? 'pre_workout');
  }

  return stack;
}

/**
 * Get today's supplement checklist — which supplements to take and when.
 * Factors in: day type (training vs rest vs competition), timing slots, enabled status.
 */
export function getTodayChecklist(
  stack: UserSupplement[],
  todayIntakes: SupplementIntake[],
  isTrainingDay: boolean,
): {
  slot: string;
  supplements: {
    supplement: UserSupplement;
    taken: boolean;
    intakeId?: string;
    macros: SupplementMacros | null;
  }[];
}[] {
  const enabled = stack.filter(s => s.enabled);

  // Filter out training-day-only supplements on rest days
  const trainingOnlyIds = new Set(['caffeine', 'citrulline', 'electrolytes', 'sodium_bicarbonate']);
  const applicable = isTrainingDay
    ? enabled
    : enabled.filter(s => !trainingOnlyIds.has(s.supplementId));

  // Group by timing slot
  const slotOrder: UserSupplement['timingSlot'][] = ['morning', 'pre_workout', 'with_meal', 'post_workout', 'evening'];
  const slotLabels: Record<string, string> = {
    morning: 'Morning',
    pre_workout: 'Pre-Workout',
    with_meal: 'With Meal',
    post_workout: 'Post-Workout',
    evening: 'Evening',
  };

  const groups: Map<string, typeof applicable> = new Map();
  for (const supp of applicable) {
    const slot = supp.timingSlot;
    if (!groups.has(slot)) groups.set(slot, []);
    groups.get(slot)!.push(supp);
  }

  return slotOrder
    .filter(slot => groups.has(slot))
    .map(slot => ({
      slot: slotLabels[slot],
      supplements: groups.get(slot)!.map(s => {
        const intake = todayIntakes.find(i => i.supplementId === s.supplementId);
        const macros = getSupplementMacros(s.supplementId, s.servingsPerDose, s.macrosPerServing);
        return {
          supplement: s,
          taken: !!intake,
          intakeId: intake?.id,
          macros,
        };
      }),
    }));
}

/**
 * Get adherence stats for supplement intake over a period.
 */
export function getSupplementAdherence(
  stack: UserSupplement[],
  intakes: SupplementIntake[],
  days: number = 7,
): {
  overall: number;     // 0-100 percentage
  perSupplement: { id: string; name: string; taken: number; expected: number; pct: number }[];
  streak: number;      // consecutive days with 100% adherence
} {
  const enabled = stack.filter(s => s.enabled);
  if (enabled.length === 0) return { overall: 0, perSupplement: [], streak: 0 };

  const today = new Date();
  const perSupplement = enabled.map(s => {
    let taken = 0;
    for (let d = 0; d < days; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      const dateStr = toLocalDateStr(date);
      const wasTaken = intakes.some(i => i.supplementId === s.supplementId && i.date === dateStr);
      if (wasTaken) taken++;
    }
    return {
      id: s.supplementId,
      name: s.name,
      taken,
      expected: days,
      pct: Math.round((taken / days) * 100),
    };
  });

  const totalTaken = perSupplement.reduce((s, p) => s + p.taken, 0);
  const totalExpected = perSupplement.reduce((s, p) => s + p.expected, 0);
  const overall = totalExpected > 0 ? Math.round((totalTaken / totalExpected) * 100) : 0;

  // Calculate streak
  let streak = 0;
  for (let d = 0; d < 365; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    const dateStr = toLocalDateStr(date);
    const allTaken = enabled.every(s =>
      intakes.some(i => i.supplementId === s.supplementId && i.date === dateStr)
    );
    if (allTaken) streak++;
    else break;
  }

  return { overall, perSupplement, streak };
}
