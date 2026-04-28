/**
 * Sparring Tracker — round-count load, separate from mat session time.
 *
 * Why: round counts are a top-3 CTE / concussion risk metric for combat
 * athletes and weren't tracked. Total mat-time conflates technical drilling
 * with live exchanges. Hardware says: 40+ live rounds/week and rapid spikes
 * are where injury and brain trauma cluster.
 *
 * Sources:
 *   - Lystad et al. 2014 — Concussion incidence in MMA: 41-78% per career
 *   - Yates et al. 2020 — Cumulative head impact exposure in combat sports
 *   - McKee et al. 2009 — CTE in athletes with repetitive head trauma
 *   - Bahr & Krosshaug 2005 — Acute:chronic load in injury risk
 */

export type SparringDiscipline =
  | 'bjj_gi'
  | 'bjj_nogi'
  | 'wrestling'
  | 'judo'
  | 'boxing'
  | 'kickboxing'
  | 'muay_thai'
  | 'mma'
  | 'mixed';

export type SparringIntensity =
  | 'technical'      // flow / cooperative / no power
  | 'moderate'       // 60-70% power, working partners
  | 'hard'           // 80%+ power, fighting on
  | 'competition';   // simulated comp / pre-fight

export type PartnerLevel = 'lower' | 'similar' | 'higher';

export interface SparringRound {
  id: string;
  date: string;            // ISO
  discipline: SparringDiscipline;
  rounds: number;          // number of rounds
  minutesPerRound: number; // duration of each round
  intensity: SparringIntensity;
  partnerLevel?: PartnerLevel;
  partnerName?: string;
  notes?: string;
}

export interface SparringLoadAssessment {
  weeklyRounds: number;
  weeklyHardRounds: number;       // 'hard' or 'competition' only
  fourWeekAverage: number;
  acwrRatio: number;              // acute / chronic
  risk: 'low' | 'moderate' | 'elevated' | 'critical';
  message: string;
  recommendation: string;
}

// ── Constants from sport-science literature ────────────────────────────

/** Weekly hard rounds at which CTE/concussion risk steepens (NSCA, Yates 2020). */
const HARD_ROUND_OVERLOAD_THRESHOLD = 40;
const HARD_ROUND_HIGH_THRESHOLD = 25;

/** ACWR spike threshold (Gabbett 2016). */
const ACWR_SPIKE = 1.5;
const ACWR_HIGH = 1.3;

/** Intensity weighting for "effective hard rounds" — moderate = 0.5, hard = 1.0, comp = 1.2 */
const INTENSITY_WEIGHT: Record<SparringIntensity, number> = {
  technical: 0.0,    // not counted toward CTE load
  moderate: 0.5,
  hard: 1.0,
  competition: 1.2,
};

// ── Helpers ─────────────────────────────────────────────────────────────

export function buildSparringRound(input: Omit<SparringRound, 'id'>): SparringRound {
  return { id: `spar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...input };
}

const DAYS_AGO = (n: number) => Date.now() - n * 24 * 60 * 60 * 1000;

/**
 * Sum effective hard rounds in a window, weighted by intensity.
 */
export function getEffectiveHardRounds(rounds: SparringRound[], windowDays: number): number {
  const cutoff = DAYS_AGO(windowDays);
  return rounds
    .filter(r => new Date(r.date).getTime() >= cutoff)
    .reduce((s, r) => s + r.rounds * INTENSITY_WEIGHT[r.intensity], 0);
}

/**
 * Weekly round count (raw, all intensities including technical).
 */
export function getWeeklyRoundCount(rounds: SparringRound[], windowDays: number = 7): number {
  const cutoff = DAYS_AGO(windowDays);
  return rounds
    .filter(r => new Date(r.date).getTime() >= cutoff)
    .reduce((s, r) => s + r.rounds, 0);
}

/**
 * Full load assessment with risk tier and actionable recommendation.
 */
export function assessSparringLoad(rounds: SparringRound[]): SparringLoadAssessment {
  const weeklyRounds = getWeeklyRoundCount(rounds, 7);
  const weeklyHardRounds = Math.round(getEffectiveHardRounds(rounds, 7));

  // Chronic = 4-week average per week
  const fourWeekTotal = getEffectiveHardRounds(rounds, 28);
  const fourWeekAverage = fourWeekTotal / 4;

  const acwrRatio = fourWeekAverage > 0 ? weeklyHardRounds / fourWeekAverage : 0;

  // Risk classification — combines absolute load + ACWR spike
  let risk: SparringLoadAssessment['risk'] = 'low';
  let message = '';
  let recommendation = '';

  if (weeklyHardRounds >= HARD_ROUND_OVERLOAD_THRESHOLD) {
    risk = 'critical';
    message = `${weeklyHardRounds} effective hard rounds this week — CTE risk zone.`;
    recommendation = 'Schedule a deload sparring week (≤10 hard rounds) and prioritize technical drilling.';
  } else if (weeklyHardRounds >= HARD_ROUND_HIGH_THRESHOLD) {
    risk = 'elevated';
    message = `${weeklyHardRounds} effective hard rounds this week — sustainable only short-term.`;
    recommendation = 'Cap next 7 days at ≤20 hard rounds. Add an extra rest day if soreness/headaches appear.';
  } else if (acwrRatio >= ACWR_SPIKE && fourWeekAverage > 5) {
    risk = 'elevated';
    message = `Sparring load spike — ${acwrRatio.toFixed(1)}× your 4-week average.`;
    recommendation = 'Walk it back. Spikes >1.5× over chronic load drive most acute injuries.';
  } else if (acwrRatio >= ACWR_HIGH && fourWeekAverage > 5) {
    risk = 'moderate';
    message = `Trending up — ${acwrRatio.toFixed(1)}× your 4-week average.`;
    recommendation = 'Sustainable, but watch the next 2 weeks. Don\'t add another high week.';
  } else {
    risk = 'low';
    message = weeklyRounds === 0
      ? 'No sparring this week.'
      : `${weeklyHardRounds} effective hard rounds — comfortably in zone.`;
    recommendation = weeklyRounds === 0
      ? 'Drilling-only weeks build skill but technique decays without live application. Aim for some live work each week.'
      : 'Sustainable load. Keep stacking weeks.';
  }

  return {
    weeklyRounds,
    weeklyHardRounds,
    fourWeekAverage: Math.round(fourWeekAverage),
    acwrRatio,
    risk,
    message,
    recommendation,
  };
}

// ── Pretty labels ──────────────────────────────────────────────────────

export const DISCIPLINES: { id: SparringDiscipline; label: string }[] = [
  { id: 'bjj_nogi',    label: 'BJJ (No-Gi)' },
  { id: 'bjj_gi',      label: 'BJJ (Gi)' },
  { id: 'wrestling',   label: 'Wrestling' },
  { id: 'judo',        label: 'Judo' },
  { id: 'boxing',      label: 'Boxing' },
  { id: 'kickboxing',  label: 'Kickboxing' },
  { id: 'muay_thai',   label: 'Muay Thai' },
  { id: 'mma',         label: 'MMA' },
  { id: 'mixed',       label: 'Mixed' },
];

export const INTENSITY_LABELS: Record<SparringIntensity, { label: string; description: string }> = {
  technical:   { label: 'Technical',   description: 'Flow, cooperative, no power' },
  moderate:    { label: 'Moderate',    description: '60-70% power, working partner' },
  hard:        { label: 'Hard',        description: '80%+ power, fighting on' },
  competition: { label: 'Competition', description: 'Simulated comp / pre-fight' },
};
