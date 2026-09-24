/**
 * Power primer — a short, first-in-session block of jumps and throws that
 * supports the mat instead of competing with it.
 *
 * Evidence it follows:
 * - Power is trained fresh: plyometric/ballistic work goes FIRST, low volume,
 *   stopped before output drops (Ramirez-Campillo 2018; Markovic 2007).
 * - ~2 exposures/week improve jump height and rate of force development in
 *   combat athletes; more adds fatigue without adding power.
 * - Low-eccentric options (box jump with step-down, med-ball throws/passes,
 *   swings) give the power stimulus with little muscle damage — used when hard
 *   sparring is close. Depth/reactive jumps are kept away from it.
 * - BJJ transfer: hip extension (shots, bridging, stand-ups), rotation
 *   (scrambles, finishing), horizontal push (frames, shucks).
 */
import type { Exercise, EquipmentType, ExercisePrescription } from './types';
import { getExerciseById } from './exercises';

export type PrimerQuality = 'hip' | 'rotation' | 'push';
export type PrimerFocus = 'lower' | 'upper' | 'full';

interface Drill { id: string; quality: PrimerQuality; lowDamage: boolean; reactive?: boolean; reps: number; perSide?: boolean }

// Ordered by preference within each quality.
const DRILLS: Drill[] = [
  { id: 'broad-jump', quality: 'hip', lowDamage: false, reps: 3 },
  { id: 'box-jump', quality: 'hip', lowDamage: true, reps: 3 },
  { id: 'kettlebell-swing', quality: 'hip', lowDamage: true, reps: 8 },
  { id: 'jump-squat', quality: 'hip', lowDamage: false, reps: 4 },
  { id: 'depth-jump', quality: 'hip', lowDamage: false, reactive: true, reps: 3 },
  { id: 'med-ball-rotational-throw', quality: 'rotation', lowDamage: true, reps: 4, perSide: true },
  { id: 'medicine-ball-slam', quality: 'rotation', lowDamage: true, reps: 5 },
  { id: 'med-ball-chest-pass', quality: 'push', lowDamage: true, reps: 5 },
  { id: 'plyo-push-up', quality: 'push', lowDamage: true, reps: 4 },
];

/** Every exercise the primer can use — for recency and history lookups. */
export const PRIMER_DRILL_IDS: ReadonlySet<string> = new Set(DRILLS.map(d => d.id));

export interface PrimerContext {
  /** Readiness band from the throttle ('peak' | 'green' | 'yellow' | 'orange' | 'red'). */
  readiness?: 'peak' | 'green' | 'yellow' | 'orange' | 'red';
  /** Mat/sport sessions logged or planned in the current 7-day window. */
  matSessionsThisWeek?: number;
  /** Hard sparring within ±24 h of this session. */
  hardSparringNear?: boolean;
  focus?: PrimerFocus;
  availableEquipment?: EquipmentType[];
  /** Primer exercise ids used in the previous primer — rotated when possible. */
  recentIds?: string[];
  /** Hidden ("don't recommend") exercise ids. */
  hiddenIds?: string[];
}

export interface PowerPrimer {
  exercises: ExercisePrescription[];
  /** Foot contacts + throws in this primer (for load tracking). */
  contacts: number;
  /** Why it looks the way it does — shown to the athlete. */
  reason: string;
}

function usable(ex: Exercise | undefined, eq?: EquipmentType[]): ex is Exercise {
  if (!ex) return false;
  if (!eq || eq.length === 0) return true;
  return (ex.equipmentTypes ?? []).every(t => t === 'bodyweight' || eq.includes(t));
}

export function buildPowerPrimer(ctx: PrimerContext = {}): PowerPrimer | null {
  const { readiness = 'green', matSessionsThisWeek = 0, hardSparringNear = false, focus = 'full' } = ctx;
  if (readiness === 'red') return null;

  const reduced = readiness === 'orange' || matSessionsThisWeek >= 4;
  const qualities: PrimerQuality[] = reduced
    ? [focus === 'upper' ? 'push' : 'hip']
    : focus === 'lower' ? ['hip', 'rotation']
    : focus === 'upper' ? ['push', 'rotation']
    : ['hip', 'rotation', 'push'];

  const lowDamageOnly = hardSparringNear || reduced;
  const hidden = new Set(ctx.hiddenIds ?? []);
  const recent = new Set(ctx.recentIds ?? []);

  const picks: { drill: Drill; ex: Exercise }[] = [];
  for (const q of qualities) {
    const candidates = DRILLS
      .filter(d => d.quality === q && !hidden.has(d.id) && !d.reactive)
      .filter(d => !lowDamageOnly || d.lowDamage)
      .map(d => ({ drill: d, ex: getExerciseById(d.id) }))
      .filter((c): c is { drill: Drill; ex: Exercise } => usable(c.ex, ctx.availableEquipment));
    if (candidates.length === 0) continue;
    const fresh = candidates.find(c => !recent.has(c.drill.id));
    picks.push(fresh ?? candidates[0]);
  }
  if (picks.length === 0) return null;

  const sets = reduced ? 2 : 3;
  const exercises: ExercisePrescription[] = picks.map(({ drill, ex }) => ({
    exerciseId: ex.id,
    exercise: ex,
    sets,
    prescription: {
      targetReps: drill.reps, minReps: drill.reps, maxReps: drill.reps,
      rpe: 7, restSeconds: 75,
    },
    notes: `Power primer — max intent, full recovery between sets${drill.perSide ? ', reps per side' : ''}. Stop if it slows down.`,
  }) as ExercisePrescription);
  const contacts = picks.reduce((n, p) => n + sets * p.drill.reps * (p.drill.perSide ? 2 : 1), 0);

  const why: string[] = [];
  if (reduced) why.push(readiness === 'orange' ? 'readiness is low' : `${matSessionsThisWeek} mat sessions this week`);
  if (hardSparringNear) why.push('hard sparring is close — low-impact options only');
  const reason = why.length
    ? `Trimmed: ${why.join('; ')}.`
    : `${picks.length} drills, ${contacts} contacts — hips, rotation${qualities.includes('push') ? ' and push' : ''} for the mat.`;
  return { exercises, contacts, reason };
}
