/**
 * Technique Log — combat-athlete drilling tracker
 *
 * Combat athletes spend ~80% of mat time drilling, ~20% live. Drilling
 * reps are where skill compounds. The app already tracks lifting volume
 * to obsessive precision but had no way to log "today I drilled 50
 * single-legs and 30 armdrags." This fixes that.
 *
 * Pure data + helper functions. Tier 0/1.
 */

export type TechniqueCategory =
  | 'takedown'      // wrestling/judo entries: single-leg, double, ankle pick, ouchi, harai
  | 'guard_pass'    // top-game: torreando, knee-cut, x-pass, leg drag, smash
  | 'submission'   // rear naked, armbar, kimura, triangle, heel hook, kneebar
  | 'sweep'         // bottom-game: scissor, butterfly, flower, lumberjack
  | 'escape'        // mount escape, side control escape, back escape
  | 'striking'      // jab, cross, hook, kick, knee, elbow, combo
  | 'clinch'        // pummel, underhook, overhook, plum, body lock
  | 'movement'      // hip escape, technical stand-up, sprawl, footwork
  | 'other';

export interface TechniqueEntry {
  id: string;
  date: string;          // ISO date
  technique: string;     // free-text name
  category: TechniqueCategory;
  reps: number;          // total reps drilled
  partnerName?: string;
  withResistance: boolean; // dummy/cooperative vs partial-resistance
  notes?: string;
}

export interface TechniqueProgress {
  technique: string;
  category: TechniqueCategory;
  totalReps: number;
  sessionsCount: number;
  firstDate: string;
  lastDate: string;
  averageRepsPerSession: number;
  withResistanceRatio: number;  // 0-1
}

// ── Categories metadata for UI ──────────────────────────────────────────
export const TECHNIQUE_CATEGORIES: { id: TechniqueCategory; label: string; example: string }[] = [
  { id: 'takedown',    label: 'Takedown',    example: 'Single-leg, double-leg, ankle pick, ouchi gari' },
  { id: 'guard_pass',  label: 'Guard Pass',  example: 'Torreando, knee cut, X-pass, leg drag' },
  { id: 'submission',  label: 'Submission',  example: 'Rear naked, armbar, triangle, heel hook' },
  { id: 'sweep',       label: 'Sweep',       example: 'Scissor, butterfly, flower, lumberjack' },
  { id: 'escape',      label: 'Escape',      example: 'Mount escape, side control escape, back escape' },
  { id: 'striking',    label: 'Striking',    example: 'Jab-cross, low kick, knee, combos' },
  { id: 'clinch',      label: 'Clinch',      example: 'Pummel, underhook, plum, body lock' },
  { id: 'movement',    label: 'Movement',    example: 'Hip escape, sprawl, footwork, technical standup' },
  { id: 'other',       label: 'Other',       example: 'Anything else worth tracking' },
];

// ── Helpers ─────────────────────────────────────────────────────────────

export function buildTechniqueEntry(input: Omit<TechniqueEntry, 'id'>): TechniqueEntry {
  return { id: `tech-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...input };
}

/**
 * Group entries by technique name, returning aggregated progress.
 */
export function getTechniqueProgress(entries: TechniqueEntry[]): TechniqueProgress[] {
  const groups = new Map<string, TechniqueEntry[]>();
  for (const e of entries) {
    const key = `${e.category}::${e.technique.toLowerCase().trim()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  return Array.from(groups.values()).map(group => {
    const sorted = [...group].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const totalReps = group.reduce((s, e) => s + e.reps, 0);
    const withResCount = group.filter(e => e.withResistance).length;
    return {
      technique: sorted[0].technique,
      category: sorted[0].category,
      totalReps,
      sessionsCount: group.length,
      firstDate: sorted[0].date,
      lastDate: sorted[sorted.length - 1].date,
      averageRepsPerSession: Math.round(totalReps / group.length),
      withResistanceRatio: withResCount / group.length,
    };
  }).sort((a, b) => b.totalReps - a.totalReps);
}

/**
 * Combat athletes who drill with intent compound skill.
 * Threshold heuristics for the UI to encourage volume:
 *   - 100 reps total = familiar
 *   - 500 reps total = working
 *   - 2000 reps total = competition-ready
 *   - 10000 reps total = mastery (Greg Jackson rule)
 */
export function getMasteryTier(totalReps: number): 'new' | 'familiar' | 'working' | 'competition' | 'mastery' {
  if (totalReps < 100) return 'new';
  if (totalReps < 500) return 'familiar';
  if (totalReps < 2000) return 'working';
  if (totalReps < 10000) return 'competition';
  return 'mastery';
}

export function tierLabel(tier: ReturnType<typeof getMasteryTier>): string {
  switch (tier) {
    case 'new': return 'New';
    case 'familiar': return 'Familiar';
    case 'working': return 'Working';
    case 'competition': return 'Comp-Ready';
    case 'mastery': return 'Mastery';
  }
}

/**
 * Total drilling reps in the last N days, summed across all techniques.
 */
export function getRepsInWindow(entries: TechniqueEntry[], days: number): number {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return entries
    .filter(e => new Date(e.date).getTime() >= cutoff)
    .reduce((s, e) => s + e.reps, 0);
}

/**
 * Categories the athlete has been neglecting (no entries in last 14 days).
 * Useful for reminder nudges.
 */
export function getNeglectedCategories(entries: TechniqueEntry[], days: number = 14): TechniqueCategory[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = new Set(
    entries.filter(e => new Date(e.date).getTime() >= cutoff).map(e => e.category)
  );
  // Only flag categories the athlete has historically practiced
  const everPracticed = new Set(entries.map(e => e.category));
  return Array.from(everPracticed).filter(c => !recent.has(c));
}
