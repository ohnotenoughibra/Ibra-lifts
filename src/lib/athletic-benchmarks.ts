/**
 * Athletic Benchmarks — quantified athleticism for combat athletes
 *
 * Six standardized tests that profile the four-pillar athleticism of a combat
 * athlete: force production, speed-strength, change-of-direction, anaerobic
 * power, grip endurance, and upper-body work capacity.
 *
 * Tests:
 *   1. Vertical Jump          (cm)        speed-strength of legs
 *   2. Broad Jump             (m)         horizontal force production
 *   3. 5-10-5 Pro Agility     (s)         change of direction
 *   4. 10m Sprint             (s)         acceleration / pure speed
 *   5. Dead Hang              (s)         grip endurance
 *   6. Push-Ups in 60s        (reps)      upper-body work capacity
 *
 * Sources:
 *   - NSCA Strength & Conditioning Manual (norms)
 *   - James et al. 2017 — Combat sport performance testing
 *   - Markovic 2007    — Vertical jump as predictor of athletic performance
 *   - Sheppard 2006    — Change of direction in athletes
 */

export type BenchmarkId =
  | 'vertical_jump'
  | 'broad_jump'
  | 'shuttle_5_10_5'
  | 'sprint_10m'
  | 'dead_hang'
  | 'pushup_60s';

export type BenchmarkUnit = 'cm' | 'm' | 's' | 'reps';

export interface BenchmarkSpec {
  id: BenchmarkId;
  name: string;
  shortName: string;
  unit: BenchmarkUnit;
  higherIsBetter: boolean;     // sprints/shuttle: false. jumps/reps/hang: true
  category: 'force' | 'velocity' | 'capacity' | 'durability';
  description: string;
  protocol: string[];
  // Tier thresholds (combat athlete norms — male intermediate baseline)
  tiers: {
    elite: number;
    advanced: number;
    intermediate: number;
    beginner: number;
  };
  // What this test predicts in a fight context
  combatRelevance: string;
  // If user is weak here, what training fixes it
  improvedBy: string[];
}

export interface BenchmarkResult {
  id: string;
  benchmarkId: BenchmarkId;
  date: string;                 // ISO
  value: number;
  bodyweightKg?: number;        // some tests benefit from BW context
  notes?: string;
}

export interface BenchmarkSummary {
  benchmarkId: BenchmarkId;
  best: number;
  latest: number;
  tier: 'elite' | 'advanced' | 'intermediate' | 'beginner' | 'untested';
  changeAllTime: number;        // signed change from first to latest
  changeLast90Days: number;     // signed change in last 90d
  results: BenchmarkResult[];
}

// ---------------------------------------------------------------------------
// Specs
// ---------------------------------------------------------------------------

export const BENCHMARK_SPECS: BenchmarkSpec[] = [
  {
    id: 'vertical_jump',
    name: 'Vertical Jump',
    shortName: 'Vert',
    unit: 'cm',
    higherIsBetter: true,
    category: 'velocity',
    description: 'Maximum standing vertical jump from a static position. The classic measure of leg explosive power.',
    protocol: [
      'Stand under a wall, reach as high as possible — mark this baseline',
      'No countermovement run-up. Static start, free arm swing allowed.',
      'Jump as high as possible, mark the highest touch',
      'Vertical = jump touch − reach baseline',
      'Take the best of 3 trials',
    ],
    tiers: { elite: 75, advanced: 60, intermediate: 45, beginner: 30 },
    combatRelevance: 'Predicts knee strike power, takedown explosion, and ability to break grips with hip drive.',
    improvedBy: ['Squat strength → 1.5x BW back squat', 'Plyometrics block (Verkhoshansky)', 'Olympic derivatives (high pulls, hang cleans)', 'Trap-bar jumps with submaximal load'],
  },
  {
    id: 'broad_jump',
    name: 'Broad Jump',
    shortName: 'Broad',
    unit: 'm',
    higherIsBetter: true,
    category: 'velocity',
    description: 'Standing long jump for distance. Measures horizontal force production — most transferable to takedown shot speed.',
    protocol: [
      'Stand behind a line, feet shoulder-width',
      'Arm swing allowed, no run-up',
      'Jump forward as far as possible',
      'Stick the landing — if you fall back or step, it doesn\'t count',
      'Measure from the line to the heel that landed closest',
      'Take the best of 3 trials',
    ],
    tiers: { elite: 2.85, advanced: 2.50, intermediate: 2.20, beginner: 1.85 },
    combatRelevance: 'Direct predictor of double-leg shot speed, hip-throw power, and explosive direction change.',
    improvedBy: ['Broad jumps and bounding work', 'Deadlift strength (posterior chain)', 'Med ball throws — granny toss, slam', 'Contrast training (heavy DL → broad jump)'],
  },
  {
    id: 'shuttle_5_10_5',
    name: '5-10-5 Pro Agility Shuttle',
    shortName: '5-10-5',
    unit: 's',
    higherIsBetter: false,
    category: 'velocity',
    description: 'Classic agility test. Sprint 5y, plant, sprint 10y, plant, sprint 5y. Measures change of direction speed.',
    protocol: [
      'Set up 3 lines: center, 5 yards left, 5 yards right',
      'Start straddling center line, hand on the ground',
      'Sprint right 5y (touch line), sprint left 10y (touch line), sprint right back 5y through center',
      'Best of 2 attempts',
      'Time the moment hand lifts to crossing center on return',
    ],
    tiers: { elite: 4.3, advanced: 4.6, intermediate: 5.0, beginner: 5.5 },
    combatRelevance: 'Predicts ability to change levels, slip and counter, and chain takedown attempts.',
    improvedBy: ['Lateral bounds, change of direction drills', 'Eccentric strength (Nordic curls, RDLs)', 'Single-leg work for deceleration', 'Cone drills, ladder work'],
  },
  {
    id: 'sprint_10m',
    name: '10m Sprint',
    shortName: '10m',
    unit: 's',
    higherIsBetter: false,
    category: 'velocity',
    description: 'Pure acceleration over 10 meters. Combat-specific because most fight movements happen in <10m.',
    protocol: [
      'Mark 10 meters with cones or chalk',
      'Start in 2-point or 3-point stance, no rocking',
      'Sprint maximum effort through the 10m mark',
      'Time start movement to crossing the 10m line',
      'Best of 3 attempts with full rest (3+ min between)',
    ],
    tiers: { elite: 1.7, advanced: 1.85, intermediate: 2.05, beginner: 2.30 },
    combatRelevance: 'Direct measure of takedown shot speed and ability to close distance to clinch.',
    improvedBy: ['Sprint training (wickets, hill sprints)', 'Squat and hip-extension strength', 'Olympic derivatives — clean pulls', 'Resisted sprints (sled, band)'],
  },
  {
    id: 'dead_hang',
    name: 'Dead Hang',
    shortName: 'Hang',
    unit: 's',
    higherIsBetter: true,
    category: 'durability',
    description: 'Maximum time hanging from a pull-up bar. Grip endurance is rate-limiting in grappling.',
    protocol: [
      'Pronated grip (palms forward), shoulder-width',
      'Hang with straight arms — feet off ground',
      'No swinging or kipping',
      'Stop when grip fails — record time',
      'Single attempt per session, fully rested',
    ],
    tiers: { elite: 90, advanced: 70, intermediate: 50, beginner: 30 },
    combatRelevance: 'Late-match grip survival. Wrestlers and jiu-jitsu players with weak grip lose late matches.',
    improvedBy: ['Dead hangs (3-5 sets, build duration)', 'Towel pull-ups', 'Farmers carry (heavy)', 'Thick grip work (Fat Gripz)', 'Crush grippers (high tension)'],
  },
  {
    id: 'pushup_60s',
    name: 'Push-Ups in 60s',
    shortName: 'PU/60s',
    unit: 'reps',
    higherIsBetter: true,
    category: 'capacity',
    description: 'Max strict push-ups in 60 seconds. Upper-body work capacity test — relevant for striking endurance and clinch durability.',
    protocol: [
      'Standard push-up: chest to within fist of floor, full extension at top',
      'Body straight throughout — no sagging or piking',
      'Stop counting when form breaks (sagging hips, partial reps)',
      'Set timer, do as many strict reps as possible in 60 seconds',
      'Rest pauses allowed but the clock keeps running',
    ],
    tiers: { elite: 65, advanced: 50, intermediate: 35, beginner: 20 },
    combatRelevance: 'Striking endurance and clinch fight durability — late-round arms-heavy feeling.',
    improvedBy: ['Bench press strength', 'Push-up volume — daily greasing-the-groove', 'Plyo push-ups', 'Density training (max reps every 30s)'],
  },
];

// ---------------------------------------------------------------------------
// Tier classification
// ---------------------------------------------------------------------------

export function classifyTier(spec: BenchmarkSpec, value: number): BenchmarkSummary['tier'] {
  if (spec.higherIsBetter) {
    if (value >= spec.tiers.elite) return 'elite';
    if (value >= spec.tiers.advanced) return 'advanced';
    if (value >= spec.tiers.intermediate) return 'intermediate';
    if (value >= spec.tiers.beginner) return 'beginner';
    return 'beginner';
  }
  if (value <= spec.tiers.elite) return 'elite';
  if (value <= spec.tiers.advanced) return 'advanced';
  if (value <= spec.tiers.intermediate) return 'intermediate';
  if (value <= spec.tiers.beginner) return 'beginner';
  return 'beginner';
}

export function tierColor(tier: BenchmarkSummary['tier']): string {
  switch (tier) {
    case 'elite': return 'emerald';
    case 'advanced': return 'sky';
    case 'intermediate': return 'amber';
    case 'beginner': return 'rose';
    case 'untested': return 'grappler';
  }
}

export function tierLabel(tier: BenchmarkSummary['tier']): string {
  switch (tier) {
    case 'elite': return 'Elite';
    case 'advanced': return 'Advanced';
    case 'intermediate': return 'Intermediate';
    case 'beginner': return 'Building';
    case 'untested': return 'Not Tested';
  }
}

// ---------------------------------------------------------------------------
// Best / Latest selection helpers
// ---------------------------------------------------------------------------

export function bestResult(results: BenchmarkResult[], spec: BenchmarkSpec): number | null {
  if (results.length === 0) return null;
  return spec.higherIsBetter
    ? Math.max(...results.map(r => r.value))
    : Math.min(...results.map(r => r.value));
}

export function latestResult(results: BenchmarkResult[]): BenchmarkResult | null {
  if (results.length === 0) return null;
  return [...results].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
}

export function summarize(specId: BenchmarkId, results: BenchmarkResult[]): BenchmarkSummary {
  const spec = BENCHMARK_SPECS.find(s => s.id === specId)!;
  const filtered = results.filter(r => r.benchmarkId === specId);

  if (filtered.length === 0) {
    return {
      benchmarkId: specId,
      best: 0,
      latest: 0,
      tier: 'untested',
      changeAllTime: 0,
      changeLast90Days: 0,
      results: [],
    };
  }

  const sorted = [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const best = bestResult(filtered, spec) ?? 0;

  const cutoff90 = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const before90 = sorted.filter(r => new Date(r.date).getTime() < cutoff90);
  const after90 = sorted.filter(r => new Date(r.date).getTime() >= cutoff90);

  let changeLast90 = 0;
  if (before90.length > 0 && after90.length > 0) {
    const prev = before90[before90.length - 1].value;
    const newer = after90[after90.length - 1].value;
    changeLast90 = spec.higherIsBetter ? newer - prev : prev - newer;
  } else if (after90.length >= 2) {
    const prev = after90[0].value;
    const newer = after90[after90.length - 1].value;
    changeLast90 = spec.higherIsBetter ? newer - prev : prev - newer;
  }

  const changeAllTime = spec.higherIsBetter ? last.value - first.value : first.value - last.value;

  return {
    benchmarkId: specId,
    best,
    latest: last.value,
    tier: classifyTier(spec, best),
    changeAllTime,
    changeLast90Days: changeLast90,
    results: sorted,
  };
}

// ---------------------------------------------------------------------------
// Weakest-attribute logic — drives program suggestion
// ---------------------------------------------------------------------------

export interface WeakestRecommendation {
  benchmarkId: BenchmarkId;
  name: string;
  reason: string;
  suggestedTraining: string[];
  suggestedToolId?: 'plyometrics' | 'energy_systems' | 'grip_strength' | 'conditioning';
}

export function findWeakestAttribute(summaries: BenchmarkSummary[]): WeakestRecommendation | null {
  // Score each tested benchmark by how far from elite tier (normalized)
  const tested = summaries.filter(s => s.tier !== 'untested');
  if (tested.length === 0) return null;

  const scored = tested.map(s => {
    const spec = BENCHMARK_SPECS.find(x => x.id === s.benchmarkId)!;
    const distanceFromElite = spec.higherIsBetter
      ? (spec.tiers.elite - s.best) / (spec.tiers.elite - spec.tiers.beginner)
      : (s.best - spec.tiers.elite) / (spec.tiers.beginner - spec.tiers.elite);
    return { spec, summary: s, score: distanceFromElite };
  });

  scored.sort((a, b) => b.score - a.score);
  const weakest = scored[0];
  const spec = weakest.spec;

  let toolId: WeakestRecommendation['suggestedToolId'] | undefined;
  if (spec.id === 'vertical_jump' || spec.id === 'broad_jump' || spec.id === 'sprint_10m') toolId = 'plyometrics';
  else if (spec.id === 'shuttle_5_10_5') toolId = 'plyometrics';
  else if (spec.id === 'dead_hang') toolId = 'grip_strength';
  else if (spec.id === 'pushup_60s') toolId = 'conditioning';

  return {
    benchmarkId: spec.id,
    name: spec.name,
    reason: `Your ${spec.shortName} is your weakest tested attribute. ${spec.combatRelevance}`,
    suggestedTraining: spec.improvedBy,
    suggestedToolId: toolId,
  };
}

// ---------------------------------------------------------------------------
// Test scheduling — when to retest
// ---------------------------------------------------------------------------

export function shouldRetest(summary: BenchmarkSummary): boolean {
  const latest = latestResult(summary.results);
  if (!latest) return true;
  const daysSince = (Date.now() - new Date(latest.date).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= 28; // 4-week minimum between tests
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export function buildResult(input: Omit<BenchmarkResult, 'id'>): BenchmarkResult {
  return { id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...input };
}
