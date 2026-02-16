/**
 * Sport Nutrition Engine — evidence-based, sport-specific performance tips
 *
 * Generates 1-3 actionable coaching tips based on:
 *   - What you're doing today (lift, combat, both, rest)
 *   - Time of day (pre-session, post-session, evening)
 *   - Your sport (grappling, MMA, striking, lifting)
 *   - Your goals (strength, hypertrophy, weight cut, competition)
 *   - Current nutrition status (protein, water, sleep)
 *
 * Evidence sources cited in comments:
 *   - ISSN position stands (protein, creatine, caffeine, beta-alanine)
 *   - Schoenfeld & Aragon 2018 (protein timing meta-analysis)
 *   - Morton et al. 2018 (protein dose-response meta-analysis)
 *   - Helms et al. 2014 (protein during caloric deficit)
 *   - Burke et al. 2011 (carbohydrate and sport performance)
 *   - Judelson et al. 2007 (hydration and strength performance)
 *   - Shaw et al. 2017 (collagen + vitamin C for connective tissue)
 *   - Howatson et al. 2012 (tart cherry and recovery)
 *   - Res et al. 2012 (pre-sleep protein and overnight MPS)
 *   - Reale et al. 2017 (combat sport weight management)
 *   - Grgic et al. 2020 (caffeine and strength meta-analysis)
 *   - Close et al. 2013 (vitamin D in athletes)
 */

import type { TodayType } from './daily-directive';
import type { CombatSport, TrainingIdentity, GoalFocus, DietGoal } from './types';

export interface SportCoachingContext {
  todayType: TodayType;
  hour: number;
  hasTrainedToday: boolean;
  sport?: CombatSport;
  trainingIdentity?: TrainingIdentity;
  goalFocus?: GoalFocus;
  fightCampPhase?: string | null;
  dietGoal?: DietGoal | null;
  proteinSoFar: number;
  proteinTarget: number;
  waterIntake: number;       // glasses/servings logged today
  sleepHours?: number | null;
  bodyWeightKg: number;      // already converted to kg
  sessionIntensity?: string;
  daysToCompetition?: number | null;
  isDeload?: boolean;
}

export interface CoachingTip {
  text: string;
  icon: string;   // lucide icon name
  color: string;  // tailwind color class
  priority: number;
}

export function generateCoachingTips(ctx: SportCoachingContext): CoachingTip[] {
  const tips: CoachingTip[] = [];
  const bw = ctx.bodyWeightKg || 75;
  const isCombatAthlete = ctx.trainingIdentity === 'combat' || ctx.sport != null;
  const isLiftDay = ctx.todayType === 'lift' || ctx.todayType === 'both';
  const isCombatDay = ctx.todayType === 'combat' || ctx.todayType === 'both';
  const isRestDay = ctx.todayType === 'rest' || (ctx.todayType === 'recovery' && !ctx.hasTrainedToday);
  const isCutting = ctx.dietGoal === 'cut';
  const isBulking = ctx.dietGoal === 'bulk';
  const preSession = !ctx.hasTrainedToday && (isLiftDay || isCombatDay);
  const postSession = ctx.hasTrainedToday;
  const morning = ctx.hour < 12;
  const evening = ctx.hour >= 18;
  const proteinRemaining = Math.round(Math.max(0, ctx.proteinTarget - ctx.proteinSoFar));

  // ─── COMPETITION PROXIMITY — highest priority, overrides everything ───
  // Reale et al. 2017: combat sport weight management guidelines
  if (ctx.daysToCompetition != null && ctx.daysToCompetition <= 14) {
    if (ctx.daysToCompetition <= 0) {
      // Fight day
      tips.push({
        text: 'Last solid meal 3-4hrs before. Liquid carbs (sports drink, dates) 30-60min before.',
        icon: 'zap', color: 'text-yellow-400', priority: 0,
      });
      tips.push({
        text: 'Post weigh-in: oral rehydration salts first, then 1-2g/kg carbs + moderate protein.',
        icon: 'droplets', color: 'text-blue-400', priority: 0,
      });
    } else if (ctx.daysToCompetition <= 2) {
      // 1-2 days out
      tips.push({
        text: `${ctx.daysToCompetition}d out. Low-residue foods only: white rice, eggs, lean protein. No new foods.`,
        icon: 'alert-triangle', color: 'text-amber-400', priority: 0,
      });
      if (isCutting) {
        tips.push({
          text: 'Sodium under 1000mg today. Sip water, don\'t chug. Hot bath tonight for passive water loss.',
          icon: 'thermometer', color: 'text-red-400', priority: 0,
        });
      }
    } else if (ctx.daysToCompetition <= 5) {
      // Fight week
      tips.push({
        text: `${ctx.daysToCompetition}d to comp. Taper water intake gradually. Strict macro adherence.`,
        icon: 'target', color: 'text-primary-400', priority: 0,
      });
    } else if (ctx.daysToCompetition <= 7) {
      // Start of fight week
      if (isCutting) {
        tips.push({
          text: 'Water loading phase: 7-8L/day for 3 days, then taper sharply. Start sodium reduction.',
          icon: 'droplets', color: 'text-blue-400', priority: 0,
        });
      } else {
        tips.push({
          text: `${ctx.daysToCompetition}d out. Lock in nutrition — every meal is rehearsal for fight day.`,
          icon: 'target', color: 'text-primary-400', priority: 1,
        });
      }
    } else {
      // 8-14 days out
      tips.push({
        text: `${ctx.daysToCompetition}d to competition. Tighten macro tracking — precision matters now.`,
        icon: 'target', color: 'text-primary-400', priority: 1,
      });
    }

    // Competition-proximate: return early with just competition tips
    return tips.sort((a, b) => a.priority - b.priority).slice(0, 3);
  }

  // ─── SLEEP ALARM — Judelson et al. 2007: <6hrs = significant performance/injury impact ───
  if (ctx.sleepHours != null && ctx.sleepHours < 6 && !isRestDay) {
    tips.push({
      text: isLiftDay
        ? `${ctx.sleepHours.toFixed(1)}h sleep. Drop top sets 10%, cap RPE at 7. Injury risk jumps 4× under 6hrs.`
        : `${ctx.sleepHours.toFixed(1)}h sleep. Technique-only or light rolls today. Reaction time is impaired.`,
      icon: 'alert-triangle', color: 'text-red-400', priority: 0,
    });
  }

  // ─── PRE-SESSION (haven't trained yet, training day) ───
  if (preSession) {
    // Hydration — Judelson et al. 2007: >2% dehydration = 10-20% strength loss
    if (ctx.waterIntake < 2 && morning) {
      tips.push({
        text: 'Drink 500ml water now. Dehydration >2% body weight drops strength 10-20%.',
        icon: 'droplets', color: 'text-blue-400', priority: 1,
      });
    }

    if (isLiftDay) {
      // Burke et al. 2011: 1-4g/kg carbs 1-4hrs pre-exercise
      const carbTarget = Math.round(bw * 1.5);
      if (morning && ctx.proteinSoFar < 10) {
        tips.push({
          text: `Pre-lift meal: ${carbTarget}g carbs + 30g protein, 2-3hrs before. Glycogen fuels heavy sets.`,
          icon: 'utensils-crossed', color: 'text-orange-400', priority: 2,
        });
      }
      // Grgic et al. 2020: caffeine +3-5% strength
      if (ctx.hour >= 6 && ctx.hour <= 14) {
        const caffDose = Math.round(bw * 4);
        tips.push({
          text: `${caffDose}mg caffeine 30-60min before lifting. Meta-analyses show +3-5% strength output.`,
          icon: 'zap', color: 'text-yellow-400', priority: 5,
        });
      }
      // ISSN creatine position stand: 3-5g daily
      if (ctx.goalFocus === 'strength' || ctx.goalFocus === 'power') {
        tips.push({
          text: 'Creatine 3-5g daily (any time). Most researched supplement — +5-15% strength gains.',
          icon: 'beaker', color: 'text-cyan-400', priority: 7,
        });
      }
    }

    if (isCombatDay) {
      // Combat-specific pre-session
      if (isCombatAthlete && (ctx.sport === 'grappling_gi' || ctx.sport === 'grappling_nogi')) {
        tips.push({
          text: 'Pre-hydrate with electrolytes — gi/nogi = extreme sweat loss. Light meal 2-3hrs before.',
          icon: 'droplets', color: 'text-blue-400', priority: 2,
        });
      } else if (ctx.sport === 'striking' || ctx.sport === 'mma') {
        tips.push({
          text: 'Light carbs + protein 2-3hrs before. Avoid heavy fats — slow digestion affects footwork.',
          icon: 'utensils-crossed', color: 'text-orange-400', priority: 2,
        });
      } else {
        tips.push({
          text: 'Light meal 2-3hrs before training. Carbs for energy, not heavy fats.',
          icon: 'utensils-crossed', color: 'text-orange-400', priority: 2,
        });
      }
      // Lower caffeine dose for combat — jitters affect technique
      if (ctx.hour >= 6 && ctx.hour <= 14) {
        const caffDose = Math.round(bw * 2.5);
        tips.push({
          text: `${caffDose}mg caffeine 30-60min before. Lower dose for combat — jitters hurt technique.`,
          icon: 'zap', color: 'text-yellow-400', priority: 6,
        });
      }
    }

    // Afternoon session, underfueled check
    if (!morning && ctx.proteinSoFar < ctx.proteinTarget * 0.3 && ctx.proteinTarget > 0) {
      tips.push({
        text: `Only ${Math.round(ctx.proteinSoFar)}g protein so far. Eat 30g+ now — don't train underfueled.`,
        icon: 'alert-triangle', color: 'text-amber-400', priority: 1,
      });
    }
  }

  // ─── POST-SESSION ───
  if (postSession) {
    // Schoenfeld & Aragon 2018: 0.4-0.5g/kg protein per meal, within 2hrs post
    const proteinDose = Math.round(bw * 0.4);

    if (isCombatDay && isCombatAthlete) {
      // Combat post-session: rehydration is #1 priority
      // Shirreffs et al. 1996: replace 150% of fluid lost
      tips.push({
        text: `Rehydrate first: 500ml+ water with electrolytes. Then ${proteinDose}g protein + fast carbs within 1hr.`,
        icon: 'droplets', color: 'text-blue-400', priority: 1,
      });
      // Shaw et al. 2017: collagen + vitamin C for connective tissue synthesis
      tips.push({
        text: '15g collagen + vitamin C for joint recovery. Grappling is brutal on connective tissue.',
        icon: 'shield', color: 'text-emerald-400', priority: 4,
      });
    } else if (isLiftDay) {
      // Post-lift protein
      if (proteinRemaining > 20) {
        const mealsLeft = evening ? 1 : ctx.hour < 15 ? 3 : 2;
        tips.push({
          text: `${proteinDose}g protein + carbs within 2hrs. ${proteinRemaining}g left — spread across ${mealsLeft} meal${mealsLeft > 1 ? 's' : ''}.`,
          icon: 'utensils-crossed', color: 'text-green-400', priority: 1,
        });
      }
      // Morton et al. 2018: leucine threshold 2.5-3g per meal
      if (ctx.goalFocus === 'hypertrophy') {
        tips.push({
          text: 'Each meal: 2.5-3g leucine (30-40g animal protein or 45g+ plant). Triggers muscle protein synthesis.',
          icon: 'trending-up', color: 'text-purple-400', priority: 4,
        });
      }
      // Burke et al. 2004: carb replenishment 1-1.2g/kg/hr first 4hrs
      if (ctx.todayType === 'both') {
        const carbReload = Math.round(bw * 1);
        tips.push({
          text: `Double session day: ${carbReload}g carbs/hr for the first 4hrs to replenish glycogen between sessions.`,
          icon: 'flame', color: 'text-orange-400', priority: 2,
        });
      }
    }

    // Res et al. 2012: pre-sleep casein extends overnight MPS
    if (evening) {
      tips.push({
        text: 'Casein protein or cottage cheese before bed extends overnight muscle repair by 22%.',
        icon: 'moon', color: 'text-indigo-400', priority: 4,
      });
    }
  }

  // ─── REST DAY ───
  if (isRestDay) {
    // MPS stays elevated 24-48hrs post-training — protein demand doesn't drop
    if (proteinRemaining > 30) {
      tips.push({
        text: `${proteinRemaining}g protein to go — even on rest days. MPS stays elevated 24-48hrs after training.`,
        icon: 'target', color: 'text-green-400', priority: 2,
      });
    }

    // Howatson et al. 2012: tart cherry juice reduces DOMS and improves sleep
    if (evening) {
      tips.push({
        text: 'Tart cherry juice before bed: 20-30% less DOMS + better sleep quality.',
        icon: 'moon', color: 'text-indigo-400', priority: 3,
      });
    }

    // Close et al. 2013: omega-3 for inflammation; most athletes are vitamin D deficient
    if (morning) {
      tips.push({
        text: '2-3g omega-3 (fish oil or fatty fish) today. Speeds inflammation clearance between sessions.',
        icon: 'heart', color: 'text-red-400', priority: 4,
      });
    }

    // Helms et al. 2014: protein to 2.3-3.1g/kg of lean mass during deficit
    if (isCutting) {
      const cutProtein = Math.round(bw * 2.5);
      tips.push({
        text: `Cutting? Aim for ${cutProtein}g protein/day to preserve muscle. Higher than maintenance needs.`,
        icon: 'scale', color: 'text-purple-400', priority: 2,
      });
    }
  }

  // ─── DELOAD WEEK ───
  if (ctx.isDeload) {
    tips.push({
      text: 'Deload week: maintain protein and sleep. Reduce training volume, not recovery quality.',
      icon: 'heart', color: 'text-green-400', priority: 2,
    });
  }

  // ─── DIET PHASE-SPECIFIC ───
  if (isCutting && !isRestDay) {
    // Higher protein protects muscle during deficit
    if (ctx.proteinSoFar < ctx.proteinTarget * 0.5 && ctx.hour >= 14) {
      tips.push({
        text: `Cutting: protein at ${Math.round((ctx.proteinSoFar / ctx.proteinTarget) * 100)}%. Falling behind risks muscle loss.`,
        icon: 'alert-triangle', color: 'text-amber-400', priority: 2,
      });
    }
  }

  if (isBulking && isLiftDay && postSession) {
    // Caloric surplus window
    const surplus = Math.round(bw * 3.5);
    tips.push({
      text: `Bulking: aim for ~${surplus} kcal surplus today. Post-lift is the best time to push carbs.`,
      icon: 'trending-up', color: 'text-green-400', priority: 3,
    });
  }

  // ─── GOAL-SPECIFIC (lower priority, educational) ───
  if (ctx.goalFocus === 'hypertrophy' && !postSession && !isRestDay && tips.length < 3) {
    // Schoenfeld & Aragon 2018: protein distribution across 4-5 meals
    const perMeal = Math.round(bw * 0.4);
    tips.push({
      text: `Protein distribution: ${perMeal}g across 4-5 meals beats the same total in 2-3. Spread it out.`,
      icon: 'clock', color: 'text-purple-400', priority: 7,
    });
  }

  if (ctx.goalFocus === 'strength' && preSession && tips.length < 3) {
    // Higher carb needs for strength: Slater & Phillips 2011
    tips.push({
      text: `Strength days need more fuel: 5-7g/kg carbs (${Math.round(bw * 5)}-${Math.round(bw * 7)}g). Heavy sets run on glycogen.`,
      icon: 'flame', color: 'text-orange-400', priority: 6,
    });
  }

  // Deduplicate by icon+color (rough, prevents near-identical tips)
  const seen = new Set<string>();
  const unique = tips.filter(t => {
    const key = `${t.icon}-${t.color}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.sort((a, b) => a.priority - b.priority).slice(0, 3);
}
