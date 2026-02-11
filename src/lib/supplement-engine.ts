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

import type { SupplementRecommendation, SupplementTier } from './types';

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
    contraindications: ['Thyroid conditions (may increase thyroid hormones)'],
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
