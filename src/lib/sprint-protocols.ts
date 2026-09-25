/**
 * Sprint & air-bike protocols — energy-system conditioning that runs as its
 * own session or as a finisher after lifting.
 *
 * Each protocol is defined by what it trains, not by how it feels:
 *   alactic   ≤10 s all-out, long rest     → peak power, PCr system
 *   rsa       ≤6 s all-out, short rest     → repeated-sprint ability
 *   glycolytic 30 s all-out, 4 min rest    → anaerobic capacity + VO2 (SIT)
 *   aerobic   minutes at 85–95 % HRmax     → VO2max
 *   base      conversational               → aerobic base / recovery flush
 *
 * Key references
 *   Bogdanis et al. 1995/1996 — PCr resynthesis ≈ 50 % at 30 s, ≈ 90 % by ~3 min
 *   Bishop, Girard & Mendez-Villanueva 2011 — RSA: ≤ 10 s sprints, < 60 s rest
 *   Gibala et al. 2006; Burgomaster et al. 2008 — 4–6 × 30 s SIT ≈ endurance training
 *   Helgerud et al. 2007 — 4 × 4 min @ 90–95 % HRmax raises VO2max
 *   Foster et al. 2001 — session-RPE load = RPE × minutes (feeds ACWR)
 *   Wilson et al. 2012 — interference is mostly a LOWER-BODY, high-volume
 *     endurance problem; short sprints interfere least
 */

export type SprintSystem = 'alactic' | 'rsa' | 'glycolytic' | 'aerobic' | 'base' | 'mixed';
export type SprintModality = 'air_bike' | 'run' | 'row' | 'ski';

export interface SprintBlock {
  reps: number;
  workS: number;
  restS: number;
  /** Repeat the whole block this many times with `setRestS` between. */
  sets?: number;
  setRestS?: number;
  /** What to do in the work interval (shown big on the timer). */
  workCue: string;
  restCue: string;
  /** Short efforts inside a long work interval (fight-round surges). */
  surgeEveryS?: number;
  surgeS?: number;
}

export interface SprintProtocol {
  id: string;
  name: string;
  system: SprintSystem;
  /** One line: what it's for, in athlete language. */
  purpose: string;
  block: SprintBlock;
  warmupS: number;
  warmupCue: string;
  cooldownS: number;
  /** Expected session RPE (CR-10) — the default the athlete confirms after. */
  rpe: number;
  modalities: SprintModality[];
  /** Air bike specifics: seat, arms, how to hit it. */
  bikeCue?: string;
  science: string;
  cautions: string[];
  /** Fits after lifting without wrecking the next day. */
  finisherOk: boolean;
}

export const SPRINT_PROTOCOLS: SprintProtocol[] = [
  {
    id: 'alactic-8x8',
    name: 'Alactic Power 8 × 8 s',
    system: 'alactic',
    purpose: 'Top-end explosiveness for shots and scrambles, with almost no fatigue cost.',
    block: { reps: 8, workS: 8, restS: 112, workCue: 'ALL-OUT', restCue: 'Easy spin — full recovery' },
    warmupS: 300, warmupCue: 'Easy → moderate, 2 short builds',
    cooldownS: 180, rpe: 6,
    modalities: ['air_bike', 'run', 'row', 'ski'],
    bikeCue: 'Seated, drive arms and legs together; hit max RPM within 2–3 s.',
    science: 'Efforts under ~10 s run mostly on phosphocreatine, which needs ~2 min to refill (Bogdanis 1995). Long rest keeps every rep at true max power — power training, not conditioning.',
    cautions: ['If rep 6 is clearly slower than rep 1, stop — the point is quality.'],
    finisherOk: true,
  },
  {
    id: 'rsa-2x6x6',
    name: 'Repeated Sprints 2 × 6 × 6 s',
    system: 'rsa',
    purpose: 'Keep producing bursts when you are already tired — scramble after scramble.',
    block: { reps: 6, workS: 6, restS: 24, sets: 2, setRestS: 240, workCue: 'ALL-OUT', restCue: 'Easy spin' },
    warmupS: 420, warmupCue: 'Progressive 5 min + 3 × 5 s builds',
    cooldownS: 240, rpe: 8,
    modalities: ['air_bike', 'run', 'row'],
    bikeCue: 'Stay seated; every sprint is a start from low RPM.',
    science: 'Short sprints with < 30 s recovery train phosphocreatine recovery and aerobic contribution to repeated efforts — the defining RSA pattern (Bishop et al. 2011).',
    cautions: ['Not within 24 h before hard sparring.'],
    finisherOk: true,
  },
  {
    id: 'scramble-10x15',
    name: 'Scramble Repeats 10 × 15/45',
    system: 'mixed',
    purpose: 'Grappling-paced bursts: hard 15 s, recover 45 s, ten times.',
    block: { reps: 10, workS: 15, restS: 45, workCue: 'HARD (9/10)', restCue: 'Easy — breathe through the nose' },
    warmupS: 300, warmupCue: 'Easy → moderate',
    cooldownS: 180, rpe: 8,
    modalities: ['air_bike', 'row', 'ski', 'run'],
    bikeCue: 'Hard but repeatable — the last rep should match the first.',
    science: 'Mirrors the effort:pause structure of grappling exchanges; hard-not-maximal 15 s work mixes glycolytic and aerobic contribution.',
    cautions: [],
    finisherOk: true,
  },
  {
    id: 'sit-5x30',
    name: 'Sprint Intervals 5 × 30 s',
    system: 'glycolytic',
    purpose: 'Big bang for time: anaerobic capacity and VO2max in ~25 min.',
    block: { reps: 5, workS: 30, restS: 240, workCue: 'ALL-OUT', restCue: 'Very easy spin — keep moving' },
    warmupS: 420, warmupCue: 'Progressive 5 min + 2 × 10 s builds',
    cooldownS: 300, rpe: 9,
    modalities: ['air_bike', 'row', 'run'],
    bikeCue: 'Everything in the first 10 s, then hold on. Arms matter.',
    science: '4–6 all-out 30 s efforts with ~4 min recovery produce endurance adaptations similar to far longer training (Gibala 2006; Burgomaster 2008).',
    cautions: ['Very demanding — not after heavy squats/deadlifts, not within 48 h of competition.', 'Stop if dizzy or nauseous.'],
    finisherOk: false,
  },
  {
    id: 'norwegian-4x4',
    name: 'Norwegian 4 × 4 min',
    system: 'aerobic',
    purpose: 'Raise the ceiling — VO2max, the engine behind every late round.',
    block: { reps: 4, workS: 240, restS: 180, workCue: '85–95 % HRmax', restCue: 'Active recovery ~70 %' },
    warmupS: 600, warmupCue: 'Progressive 10 min',
    cooldownS: 300, rpe: 8,
    modalities: ['air_bike', 'run', 'row', 'ski'],
    bikeCue: 'Settle into a pace you can hold for 4 min; last minute should bite.',
    science: '4 × 4 min at 90–95 % HRmax with 3 min active recovery improved VO2max more than steady work (Helgerud et al. 2007).',
    cautions: ['A full session — not a finisher.'],
    finisherOk: false,
  },
  {
    id: 'fight-rounds-5x5',
    name: 'Fight Rounds 5 × 5 min',
    system: 'mixed',
    purpose: 'Rolling-pace rounds with surges — conditioning that feels like a match.',
    block: { reps: 5, workS: 300, restS: 60, workCue: 'Steady 6/10', restCue: 'Between rounds', surgeEveryS: 60, surgeS: 10 },
    warmupS: 300, warmupCue: 'Easy → moderate',
    cooldownS: 240, rpe: 7,
    modalities: ['air_bike', 'row', 'ski'],
    bikeCue: 'Steady pace; on each SURGE go hard for 10 s, then settle back.',
    science: 'Match-length rounds at moderate intensity with short high-intensity bursts reproduce the intermittent demand of grappling.',
    cautions: [],
    finisherOk: false,
  },
  {
    id: 'emom-10x10',
    name: 'Finisher EMOM 10 min',
    system: 'alactic',
    purpose: 'A 10-minute finisher: 10 s sprint at the top of every minute.',
    block: { reps: 10, workS: 10, restS: 50, workCue: 'SPRINT', restCue: 'Easy spin' },
    warmupS: 120, warmupCue: 'Easy spin — you are already warm',
    cooldownS: 120, rpe: 6,
    modalities: ['air_bike', 'row', 'ski', 'run'],
    bikeCue: 'Hard and fast; keep every sprint crisp.',
    science: 'Short sprints with ~1:5 work:rest stay mostly alactic, so they add power work with little interference with strength (Wilson 2012).',
    cautions: [],
    finisherOk: true,
  },
  {
    id: 'zone2-flush-20',
    name: 'Zone 2 Flush 20 min',
    system: 'base',
    purpose: 'Easy aerobic work — recovery and base without adding fatigue.',
    block: { reps: 1, workS: 1200, restS: 0, workCue: 'Conversational — nose breathing', restCue: '' },
    warmupS: 0, warmupCue: '',
    cooldownS: 0, rpe: 3,
    modalities: ['air_bike', 'run', 'row', 'ski'],
    bikeCue: 'Low, steady RPM; you should be able to talk in full sentences.',
    science: 'Low-intensity aerobic work (~60–70 % HRmax) builds capillary and mitochondrial density and aids recovery.',
    cautions: [],
    finisherOk: true,
  },
];

export function getSprintProtocol(id: string): SprintProtocol | undefined {
  return SPRINT_PROTOCOLS.find(p => p.id === id);
}

// ── Timeline ───────────────────────────────────────────────────────────────

export type StepPhase = 'warmup' | 'work' | 'rest' | 'set_rest' | 'cooldown';

export interface TimelineStep {
  phase: StepPhase;
  seconds: number;
  label: string;
  /** 1-based rep / set counters for work & rest steps. */
  rep?: number;
  set?: number;
}

/** Flatten a protocol into timed steps. No trailing rest after the last rep. */
export function buildTimeline(p: SprintProtocol): TimelineStep[] {
  const out: TimelineStep[] = [];
  if (p.warmupS > 0) out.push({ phase: 'warmup', seconds: p.warmupS, label: p.warmupCue || 'Warm-up' });
  const sets = p.block.sets ?? 1;
  for (let s = 1; s <= sets; s++) {
    for (let r = 1; r <= p.block.reps; r++) {
      out.push({ phase: 'work', seconds: p.block.workS, label: p.block.workCue, rep: r, set: s });
      const last = r === p.block.reps;
      if (!last && p.block.restS > 0) out.push({ phase: 'rest', seconds: p.block.restS, label: p.block.restCue, rep: r, set: s });
    }
    if (s < sets && (p.block.setRestS ?? 0) > 0) out.push({ phase: 'set_rest', seconds: p.block.setRestS!, label: 'Between sets — easy', set: s });
  }
  if (p.cooldownS > 0) out.push({ phase: 'cooldown', seconds: p.cooldownS, label: 'Cool-down — easy spin' });
  return out;
}

export function totalSeconds(p: SprintProtocol): number {
  return buildTimeline(p).reduce((t, s) => t + s.seconds, 0);
}

/** Seconds of hard work (what the protocol is really "made of"). */
export function workSeconds(p: SprintProtocol): number {
  return p.block.reps * (p.block.sets ?? 1) * p.block.workS;
}

/**
 * Where the clock is: `elapsed` seconds since start (pauses excluded by the
 * caller). Returns the step, seconds left in it, and whether we're done.
 */
export function positionAt(timeline: TimelineStep[], elapsed: number): { index: number; left: number; done: boolean } {
  let t = 0;
  for (let i = 0; i < timeline.length; i++) {
    const end = t + timeline[i].seconds;
    if (elapsed < end) return { index: i, left: Math.ceil(end - elapsed), done: false };
    t = end;
  }
  return { index: timeline.length - 1, left: 0, done: true };
}

/** In a fight-round work step, is this second a surge? */
export function isSurge(step: TimelineStep, p: SprintProtocol, secondsIntoStep: number): boolean {
  const { surgeEveryS, surgeS } = p.block;
  if (step.phase !== 'work' || !surgeEveryS || !surgeS) return false;
  // Last `surgeS` seconds of every `surgeEveryS` window (0:50–1:00, 1:50–2:00 …).
  return secondsIntoStep % surgeEveryS >= surgeEveryS - surgeS;
}

// ── Load ───────────────────────────────────────────────────────────────────

/** Foster session-RPE load (AU) — same unit the ACWR model uses. */
export function sessionLoad(rpe: number, minutes: number): number {
  return Math.round(Math.max(0, rpe) * Math.max(0, minutes));
}

// ── Finisher recommendation ────────────────────────────────────────────────

export interface FinisherContext {
  /** 0–100 readiness (Whoop recovery or app readiness). undefined = unknown. */
  readiness?: number;
  /** Sets done today that loaded the legs hard (squat / hinge / lunge). */
  heavyLowerSets: number;
  /** Days until the next competition, if one is scheduled. */
  daysToCompetition?: number;
  /** Hard mat/sparring session planned within the next 24 h. */
  hardMatWithin24h?: boolean;
  /** Minutes the athlete has left. */
  minutesAvailable?: number;
}

export interface FinisherPick { protocol: SprintProtocol; reason: string }

/**
 * Pick a finisher that helps the athlete without costing tomorrow:
 *   low readiness            → Zone 2 flush (or nothing below 25)
 *   competition ≤ 3 days     → alactic only (sharp, not tired)
 *   hard mats tomorrow       → alactic EMOM
 *   heavy leg day            → alactic EMOM (short sprints interfere least)
 *   otherwise                → repeated sprints, or scramble repeats with time
 */
export function recommendFinisher(ctx: FinisherContext): FinisherPick | null {
  const get = (id: string) => getSprintProtocol(id)!;
  const r = ctx.readiness;
  if (r !== undefined && r < 25) return null;
  if (r !== undefined && r < 45) {
    return { protocol: get('zone2-flush-20'), reason: 'Readiness is low — easy aerobic work helps recovery without adding fatigue.' };
  }
  if (ctx.daysToCompetition !== undefined && ctx.daysToCompetition <= 3) {
    return { protocol: get('alactic-8x8'), reason: 'Competition soon — short all-out sprints keep you sharp without tiring you.' };
  }
  if (ctx.hardMatWithin24h) {
    return { protocol: get('emom-10x10'), reason: 'Hard mats within 24 h — a short alactic finisher leaves your legs fresh.' };
  }
  if (ctx.heavyLowerSets >= 6) {
    return { protocol: get('emom-10x10'), reason: 'Heavy leg day — short sprints add power with the least interference.' };
  }
  const minutes = ctx.minutesAvailable ?? 20;
  const scramble = get('scramble-10x15');
  if (minutes >= Math.ceil(totalSeconds(scramble) / 60)) {
    return { protocol: scramble, reason: 'Fresh legs and time to spare — grappling-paced repeats.' };
  }
  return { protocol: get('emom-10x10'), reason: '10 minutes of sprints — quick power and conditioning.' };
}

export function formatClock(s: number): string {
  const m = Math.floor(Math.max(0, s) / 60);
  const sec = Math.max(0, s) % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
