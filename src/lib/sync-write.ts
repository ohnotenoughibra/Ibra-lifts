/**
 * Server-side write planning for /api/sync POST — pure, so it can be tested
 * without a database.
 *
 * The incoming device copy is merged into the server copy (union by id,
 * tombstones, newest-wins scalars — see db-sync.resolveConflicts), and the
 * data-regression guard checks the MERGED result, not the raw push. The old
 * guard compared the raw push and threw away every push from a device that
 * only holds its trimmed local slice (30 workouts, 7 days of meals) — even
 * though the merge would have lost nothing.
 */
import { resolveConflicts } from './db-sync';

type Doc = Record<string, unknown>;

const len = (v: unknown) => (Array.isArray(v) ? v.filter(x => !(x && typeof x === 'object' && (x as Doc)._deleted)).length : 0);

/** Rough "how much of the athlete's history is in here" score. */
export function richness(d: Doc | null | undefined): number {
  if (!d) return 0;
  let score = 0;
  if (d.isOnboarded) score += 5;
  if (d.user) score += 5;
  if (d.baselineLifts) score += 3;
  if (d.currentMesocycle) score += 3;
  score += len(d.workoutLogs) * 2;
  score += len(d.meals);
  score += len(d.mesocycleHistory) * 2;
  for (const k of ['trainingSessions', 'bodyWeightLog', 'quickLogs', 'bodyComposition', 'injuryLog',
    'illnessLogs', 'cycleLogs', 'competitions', 'mealStamps', 'supplementIntakes', 'mentalCheckIns', 'weeklyCheckIns']) {
    score += len(d[k]);
  }
  const gam = d.gamificationStats as Doc | undefined;
  if (gam) score += (Number(gam.totalXP) || Number(gam.totalPoints) || 0) > 0 ? 5 : 0;
  if (d.waterLog && typeof d.waterLog === 'object') score += Object.keys(d.waterLog as object).length;
  return score;
}

export interface SyncWritePlan {
  merged: Doc;
  blocked: boolean;
  serverScore: number;
  mergedScore: number;
}

export function planSyncWrite(incoming: Doc, server: Doc | null | undefined): SyncWritePlan {
  const clean = { ...incoming };
  delete clean.subscription;       // legacy paywall field
  delete clean._whoopTokens;       // never store plaintext tokens in the document
  const hasServer = !!server && typeof server === 'object' && Object.keys(server).length > 0;
  const merged = hasServer ? resolveConflicts(clean, server as Doc) : clean;
  const serverScore = hasServer ? richness(server as Doc) : 0;
  const mergedScore = richness(merged);
  // After a union merge the result can only shrink through deliberate
  // deletions; a > 20 % drop means something is badly wrong — refuse.
  const blocked = serverScore > 10 && mergedScore < serverScore * 0.8;
  return { merged, blocked, serverScore, mergedScore };
}
