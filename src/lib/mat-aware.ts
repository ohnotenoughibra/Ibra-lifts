/**
 * mat-aware — lets the athlete's mat schedule shape the lifting it sits next to.
 *
 * Until now mat load only changed the block when it was generated (a flat
 * volume cut) and showed banners; the session you actually started was the
 * same whether you sparred hard yesterday or are fighting on Saturday.
 *
 *   matContext()         what's around today: hard mats yesterday / today /
 *                        tomorrow (scheduled or logged), days to competition
 *   sessionLegLoad()     share of a session's sets that load the legs hard
 *   pickTodaysSession()  among this week's remaining sessions, prefer the one
 *                        that fits the mats (low leg load next to hard mats)
 *   planMatAdjustment()  what to change in the started session: a fight-week
 *                        taper, or legs/grip −1 set around hard sparring
 *
 * Evidence: concurrent-training interference is mostly lower-body and
 * dose-dependent (Wilson et al. 2012); taper = cut volume 40–60 %, keep
 * intensity (Bosquet et al. 2007).
 */
import type {
  CombatTrainingDay, CompetitionEvent, Exercise, TrainingSession, UserProfile, WorkoutSession,
} from './types';

const DAY_MS = 864e5;
const COMBAT = new Set(['grappling', 'mma', 'striking']);

export interface MatContext {
  hardYesterday: boolean;
  hardToday: boolean;
  hardTomorrow: boolean;
  /** Days until the next upcoming competition (0 = today), null if none. */
  daysToCompetition: number | null;
  /** Human reason for the most relevant mat fact. */
  label: string | null;
}

const isHardLogged = (s: TrainingSession) =>
  COMBAT.has(s.category) &&
  ['hard_sparring', 'competition_prep'].includes((s.actualIntensity ?? s.plannedIntensity) as string);

function dayStart(d: Date): number {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime();
}

export function matContext(opts: {
  user: Pick<UserProfile, 'combatTrainingDays'> | null | undefined;
  trainingSessions?: TrainingSession[];
  competitions?: CompetitionEvent[];
  now?: Date;
}): MatContext {
  const now = opts.now ?? new Date();
  const today = now.getDay();
  const sched: CombatTrainingDay[] = opts.user?.combatTrainingDays ?? [];
  const hardOn = (weekday: number) => sched.some(d => d.day === weekday && d.intensity === 'hard');

  const t0 = dayStart(now);
  const logged = (opts.trainingSessions ?? []).filter(s => !s._deleted && isHardLogged(s));
  const loggedOn = (start: number) => logged.some(s => {
    const t = new Date(s.date).getTime();
    return t >= start && t < start + DAY_MS;
  });

  const hardYesterday = loggedOn(t0 - DAY_MS) || hardOn((today + 6) % 7);
  const hardToday = loggedOn(t0) || hardOn(today);
  const hardTomorrow = hardOn((today + 1) % 7);

  const upcoming = (opts.competitions ?? [])
    .filter(c => !c._deleted && c.isActive !== false)
    .map(c => Math.round((dayStart(new Date(c.date)) - t0) / DAY_MS))
    .filter(d => d >= 0)
    .sort((a, b) => a - b);
  const daysToCompetition = upcoming.length ? upcoming[0] : null;

  const label = daysToCompetition !== null && daysToCompetition <= 7
    ? (daysToCompetition === 0 ? 'Competition today' : `Competition in ${daysToCompetition} day${daysToCompetition === 1 ? '' : 's'}`)
    : hardTomorrow ? 'Hard sparring tomorrow'
    : hardToday ? 'Hard sparring today'
    : hardYesterday ? 'Hard sparring yesterday'
    : null;

  return { hardYesterday, hardToday, hardTomorrow, daysToCompetition, label };
}

// ── Leg load ───────────────────────────────────────────────────────────────

type Ex = Pick<Exercise, 'movementPattern' | 'category' | 'primaryMuscles'>;
const LEG_MUSCLES = new Set(['quadriceps', 'hamstrings', 'glutes']);

export function isHeavyLeg(e: Ex): boolean {
  const legs = e.primaryMuscles.some(m => LEG_MUSCLES.has(m));
  if (!legs) return false;
  return e.category === 'compound' || e.category === 'power' || e.movementPattern === 'squat' || e.movementPattern === 'hinge';
}
const isGrip = (e: Ex) => e.category === 'grip' || e.primaryMuscles.includes('forearms');

/** Share of the session's sets (0–1) that are heavy lower-body work. */
export function sessionLegLoad(session: Pick<WorkoutSession, 'exercises'>): number {
  let legs = 0; let total = 0;
  for (const ex of session.exercises) {
    total += ex.sets;
    if (isHeavyLeg(ex.exercise)) legs += ex.sets;
  }
  return total > 0 ? legs / total : 0;
}

// ── Session order ──────────────────────────────────────────────────────────

export interface SessionChoice<T> { entry: T; reason: string | null }

/**
 * `candidates` are this week's remaining sessions in plan order. Next to hard
 * mats, start the one with the least leg load if it's meaningfully lighter
 * (≥ 15 percentage points); otherwise keep the plan's order.
 */
export function pickTodaysSession<T extends { session: Pick<WorkoutSession, 'exercises' | 'name'> }>(
  candidates: T[], ctx: MatContext,
): SessionChoice<T> | null {
  if (candidates.length === 0) return null;
  const first = candidates[0];
  const nearHard = ctx.hardTomorrow || ctx.hardToday || ctx.hardYesterday;
  if (!nearHard || candidates.length === 1) return { entry: first, reason: null };
  const firstLoad = sessionLegLoad(first.session);
  let best = first; let bestLoad = firstLoad;
  for (const c of candidates.slice(1)) {
    const l = sessionLegLoad(c.session);
    if (l < bestLoad) { best = c; bestLoad = l; }
  }
  if (best === first || firstLoad - bestLoad < 0.15) return { entry: first, reason: null };
  return { entry: best, reason: `${ctx.label ?? 'Hard sparring nearby'} — lighter-legs session moved up` };
}

// ── In-session adjustment ──────────────────────────────────────────────────

export interface MatAdjustmentPlan {
  kind: 'taper' | 'mat';
  session: WorkoutSession;
  reason: string;
  /** e.g. "−6 sets · RPE ≤ 8" */
  summary: string;
}

/**
 * - Fight week (≤ 7 days): taper — every exercise to ~half its sets (min 1;
 *   first two lifts keep ≥ 2), RPE capped at 8 (intensity stays, fatigue goes).
 *   ≤ 2 days out: heavy leg work also capped at RPE 7.
 * - Hard sparring yesterday / today / tomorrow: heavy-leg and grip exercises
 *   −1 set (never below 2) and RPE −0.5. Upper body untouched.
 * Returns null when nothing applies.
 */
export function planMatAdjustment(session: WorkoutSession, ctx: MatContext): MatAdjustmentPlan | null {
  const d = ctx.daysToCompetition;
  if (d !== null && d <= 7) {
    let removed = 0;
    const exercises = session.exercises.map((ex, i) => {
      const keepMin = i < 2 ? 2 : 1;
      const sets = Math.max(Math.min(keepMin, ex.sets), Math.round(ex.sets * 0.5));
      removed += ex.sets - sets;
      const cap = d <= 2 && isHeavyLeg(ex.exercise) ? 7 : 8;
      return { ...ex, sets, prescription: { ...ex.prescription, rpe: Math.min(ex.prescription.rpe, cap) } };
    });
    return {
      kind: 'taper',
      session: { ...session, exercises },
      reason: `${ctx.label} — fight-week taper: volume down, intensity kept`,
      summary: `−${removed} sets · RPE ≤ 8`,
    };
  }
  if (ctx.hardYesterday || ctx.hardToday || ctx.hardTomorrow) {
    let removed = 0;
    let touched = 0;
    const exercises = session.exercises.map(ex => {
      if (!isHeavyLeg(ex.exercise) && !isGrip(ex.exercise)) return ex;
      touched++;
      const sets = ex.sets > 2 ? ex.sets - 1 : ex.sets;
      removed += ex.sets - sets;
      return { ...ex, sets, prescription: { ...ex.prescription, rpe: Math.max(6, ex.prescription.rpe - 0.5) } };
    });
    if (touched === 0) return null;
    return {
      kind: 'mat',
      session: { ...session, exercises },
      reason: `${ctx.label} — legs & grip eased`,
      summary: removed > 0 ? `−${removed} set${removed === 1 ? '' : 's'} on legs & grip · RPE −0.5` : 'RPE −0.5 on legs & grip',
    };
  }
  return null;
}
