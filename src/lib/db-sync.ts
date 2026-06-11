// Database sync utility - syncs Zustand store with Vercel Postgres
// Falls back gracefully to localStorage-only when DB is not configured

import { recordSyncSuccess, recordSyncFailure } from './data-safety';
import { calculateLevel } from './gamification';

const SYNC_DEBOUNCE_MS = 3000; // Debounce saves to avoid hammering the DB
const SYNC_MAX_WAIT_MS = 15000; // Max wait before forcing a sync (prevents starvation)
const SYNC_QUEUE_KEY = 'roots-gains-sync-queue-v1'; // localStorage key for queue persistence

let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let maxWaitTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingPayload: { userId: string; data: Record<string, unknown> } | null = null;

// ── localStorage-backed sync queue ──────────────────────────────────────────

function loadQueueFromStorage(): Array<{ qid?: string; userId: string; data: Record<string, unknown>; lastSyncAt?: number }> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueueToStorage(queue: Array<{ qid?: string; userId: string; data: Record<string, unknown>; lastSyncAt?: number }>): void {
  if (typeof window === 'undefined') return;
  try {
    if (queue.length === 0) {
      localStorage.removeItem(SYNC_QUEUE_KEY);
    } else {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    }
  } catch {
    // Quota exceeded — not critical, the in-memory queue still works
  }
}

export async function loadFromDatabase(userId: string): Promise<{ data: Record<string, unknown>; serverUpdatedAt: string | null } | null> {
  try {
    const res = await fetch(`/api/sync?userId=${encodeURIComponent(userId)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.data) return null;
    return { data: json.data, serverUpdatedAt: json.serverUpdatedAt || null };
  } catch {
    // DB not configured or network error - that's fine, use localStorage
    if (process.env.NODE_ENV === 'development') {
      console.log('[db-sync] Database not available, using localStorage only');
    }
    return null;
  }
}

/**
 * Normalize workoutLogs: ensures every set in a completed workout has `completed: true`.
 * Imported/DB-inserted workouts may lack this field, which breaks ~50 places
 * in the codebase that filter on `set.completed`.
 */
export function normalizeWorkoutLogs(data: Record<string, unknown>): Record<string, unknown> {
  const logs = data.workoutLogs;
  if (!Array.isArray(logs) || logs.length === 0) return data;

  let mutated = false;
  for (const log of logs as Array<Record<string, unknown>>) {
    // Only normalize completed workouts (active workouts may have incomplete sets)
    if (!log.completed) continue;
    const exercises = log.exercises as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(exercises)) continue;
    for (const ex of exercises) {
      const sets = ex.sets as Array<Record<string, unknown>> | undefined;
      if (!Array.isArray(sets)) continue;
      for (const set of sets) {
        if (set.completed === undefined && set.weight != null && set.reps != null) {
          set.completed = true;
          mutated = true;
        }
      }
    }
  }

  return mutated ? { ...data, workoutLogs: logs } : data;
}

/**
 * Resolve conflicts between local and remote data.
 *
 * Strategy:
 *   - Array fields: ALWAYS union merge by ID (never drop entries from either side)
 *   - Object fields (waterLog): ALWAYS deep merge (keep all date keys from both sides)
 *   - Scalar fields: prefer whichever side has the newer lastSyncAt
 */
export function resolveConflicts(
  local: Record<string, unknown>,
  remote: Record<string, unknown>
): Record<string, unknown> {
  if (!remote) return normalizeWorkoutLogs(local);
  if (!local) return normalizeWorkoutLogs(remote);

  const merged: Record<string, unknown> = { ...remote };

  // ── Array fields: union merge by ID — entries from BOTH sides are kept ──
  const arrayFields = [
    'workoutLogs', 'meals', 'bodyWeightLog', 'bodyComposition',
    'injuryLog', 'hrSessions', 'trainingSessions', 'customExercises', 'sessionTemplates',
    'quickLogs', 'gripTests', 'gripExerciseLogs', 'illnessLogs', 'workoutSkips',
    'cycleLogs', 'weeklyCheckIns', 'competitions', 'supplementIntakes',
    'mentalCheckIns', 'confidenceLedger', 'featureFeedback',
    'weightCutPlans', 'fightCampPlans', 'supplementStack', 'activeSupplements',
    'dietPhaseHistory',
    // Previously missing — remote silently overwrote local:
    'mesocycleHistory', 'mesocycleQueue',
    'seenInsights', 'dismissedInsights', 'readArticles', 'bookmarkedArticles',
    'mealStamps',
  ];

  for (const field of arrayFields) {
    const localArr = local[field];
    const remoteArr = remote[field];
    if (Array.isArray(localArr) && Array.isArray(remoteArr)) {
      // Primitive arrays (string[], number[]): Set union
      if (remoteArr.length > 0 && typeof remoteArr[0] !== 'object') {
        merged[field] = Array.from(new Set([...remoteArr, ...localArr]));
        continue;
      }
      if (localArr.length > 0 && typeof localArr[0] !== 'object') {
        merged[field] = Array.from(new Set([...remoteArr, ...localArr]));
        continue;
      }
      // Object arrays: union by ID, prefer newer entry for conflicts
      // Tombstone rule: if either side has _deleted, the tombstone wins
      const map = new Map<string, Record<string, unknown>>();
      const getKey = (item: Record<string, unknown>): string =>
        item.id != null ? String(item.id) : JSON.stringify(item);
      for (const item of remoteArr as Array<Record<string, unknown>>) {
        map.set(getKey(item), item);
      }
      for (const item of localArr as Array<Record<string, unknown>>) {
        const key = getKey(item);
        const existing = map.get(key);
        if (!existing) {
          map.set(key, item);
        } else {
          // Tombstone rule: deletion beats any STALE copy — but an explicit
          // revival (a live copy stamped AFTER the deletion, i.e. an undo)
          // wins. Without the revival branch, undoing "Block deleted" or a
          // consumed queue entry restored live snapshots that every later
          // merge silently re-deleted (and the GC then made permanent).
          const eitherDeleted = item._deleted || existing._deleted;
          if (eitherDeleted) {
            if (item._deleted && existing._deleted) {
              // Both tombstoned — keep the newer tombstone
              map.set(key, ((item._deletedAt as number) || 0) >= ((existing._deletedAt as number) || 0) ? item : existing);
            } else {
              const tombstone = (item._deleted ? item : existing) as Record<string, unknown>;
              const live = (item._deleted ? existing : item) as Record<string, unknown>;
              const liveTs = new Date((live.updatedAt || 0) as string).getTime();
              const tombTs = (tombstone._deletedAt as number) || 0;
              // Revival requires a stamp strictly after the deletion — ordinary
              // pre-deletion copies still lose to the tombstone
              map.set(key, liveTs > tombTs ? live : tombstone);
            }
          } else {
            // Status finality rule: "resolved" beats "active"/"recovering"
            // (same principle as tombstones — once resolved, never un-resolve).
            // Injuries use a boolean `resolved` field; illness/plan entries use
            // a string `status: 'resolved'`. Recognize BOTH, otherwise a healed
            // injury gets resurrected by the newer-timestamp fallback on refresh.
            const isResolved = (e: Record<string, unknown>) =>
              e.resolved === true || e.status === 'resolved';
            const itemResolved = isResolved(item as Record<string, unknown>);
            const existingResolved = isResolved(existing as Record<string, unknown>);
            if (itemResolved && !existingResolved) {
              map.set(key, item);
            } else if (!itemResolved && existingResolved) {
              // Keep existing resolved entry
            } else {
              // Neither or both resolved — prefer the newer entry
              const localDate = new Date((item.updatedAt || item.date || 0) as string).getTime();
              const remoteDate = new Date((existing.updatedAt || existing.date || 0) as string).getTime();
              if (localDate > remoteDate) {
                map.set(key, item);
              }
            }
          }
        }
      }
      // GC tombstones older than 30 days
      const gcCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const mergedArr = Array.from(map.values()).filter(item =>
        !item._deleted || !item._deletedAt || (item._deletedAt as number) > gcCutoff
      );
      merged[field] = mergedArr;
    } else if (Array.isArray(localArr)) {
      merged[field] = localArr;
    }
  }

  // ── Object fields (date-keyed): ALWAYS deep merge both sides ──
  // Keeps all date keys from both devices. For same-date conflicts,
  // the newer side wins (by lastSyncAt).
  const objectFields = ['waterLog'];
  const localSync = (local.lastSyncAt || 0) as number;
  const remoteSync = (remote.lastSyncAt || 0) as number;
  for (const field of objectFields) {
    const localObj = local[field];
    const remoteObj = remote[field];
    if (localObj && typeof localObj === 'object' && !Array.isArray(localObj) &&
        remoteObj && typeof remoteObj === 'object' && !Array.isArray(remoteObj)) {
      // Newer side goes last (overwrites conflicts)
      merged[field] = localSync > remoteSync
        ? { ...remoteObj as object, ...localObj as object }
        : { ...localObj as object, ...remoteObj as object };
    } else if (localObj && typeof localObj === 'object' && !Array.isArray(localObj)) {
      merged[field] = localObj;
    }
  }

  // ── User profile: field-level merge when _fieldTimestamps exist ──
  // Each field picks the side with the newer per-field timestamp. Falls back
  // to whole-object updatedAt comparison when no field timestamps exist.
  const localUser = local.user as Record<string, unknown> | undefined;
  const remoteUser = remote.user as Record<string, unknown> | undefined;
  if (localUser && remoteUser) {
    const localFT = (localUser._fieldTimestamps || {}) as Record<string, number>;
    const remoteFT = (remoteUser._fieldTimestamps || {}) as Record<string, number>;
    const hasFieldTimestamps = Object.keys(localFT).length > 0 || Object.keys(remoteFT).length > 0;

    if (hasFieldTimestamps) {
      // Field-level merge: start from remote, overlay local fields that are newer
      const mergedUser: Record<string, unknown> = { ...remoteUser };
      const mergedFT: Record<string, number> = { ...remoteFT };
      for (const key of Object.keys(localUser)) {
        if (key === '_fieldTimestamps') continue;
        const localTs = localFT[key] || 0;
        const remoteTs = remoteFT[key] || 0;
        if (localTs > remoteTs) {
          mergedUser[key] = localUser[key];
          mergedFT[key] = localTs;
        }
      }
      // Ensure local-only fields are preserved
      for (const key of Object.keys(localFT)) {
        if (!(key in remoteFT) || localFT[key] > (remoteFT[key] || 0)) {
          mergedFT[key] = localFT[key];
        }
      }
      mergedUser._fieldTimestamps = mergedFT;
      // updatedAt = max of both sides
      const localUpdated = new Date((localUser.updatedAt || 0) as string).getTime();
      const remoteUpdated = new Date((remoteUser.updatedAt || 0) as string).getTime();
      mergedUser.updatedAt = localUpdated > remoteUpdated ? localUser.updatedAt : remoteUser.updatedAt;
      merged.user = mergedUser;
    } else {
      // Fallback: whole-object, prefer newer updatedAt
      const localUserTs = new Date((localUser.updatedAt || 0) as string).getTime();
      const remoteUserTs = new Date((remoteUser.updatedAt || 0) as string).getTime();
      if (localUserTs > remoteUserTs) {
        merged.user = localUser;
      }
    }
  } else if (localUser) {
    merged.user = localUser;
  }

  // ── gamificationStats: merge event-based fields + union badges ──
  // Streak, XP, level, totalWorkouts, totalVolume, personalRecords are now
  // COMPUTED from workoutLogs on every render (see computed-gamification.ts).
  // The merge only needs to handle badges (union) and event counters (max).
  const localGS = local.gamificationStats as Record<string, unknown> | undefined;
  const remoteGS = remote.gamificationStats as Record<string, unknown> | undefined;
  if (localGS && remoteGS) {
    const localPts = (localGS.totalPoints as number) || 0;
    const remotePts = (remoteGS.totalPoints as number) || 0;
    const localAsOf = (localGS.pointsAsOf as number) || 0;
    const remoteAsOf = (remoteGS.pointsAsOf as number) || 0;

    // Timestamp-aware XP: the side that WROTE totalPoints most recently is
    // authoritative. Plain max() made XP reductions impossible to propagate —
    // undoing a block-completion bonus on one device snapped back to the
    // cloud's stale higher value on the next pull.
    // LWW applies only when BOTH sides are stamped. A mixed fleet (stale PWA
    // client without pointsAsOf vs updated one) falls back to max() — a
    // one-sided stamp must never discard XP a legacy device legitimately
    // earned. The stamp survives only when the stamped side's value won.
    let mergedPts: number;
    let mergedAsOf: number;
    if (localAsOf > 0 && remoteAsOf > 0) {
      mergedPts = localAsOf >= remoteAsOf ? localPts : remotePts;
      mergedAsOf = Math.max(localAsOf, remoteAsOf);
    } else {
      mergedPts = Math.max(localPts, remotePts);
      const stampedSideWon = (localAsOf > 0 && localPts >= remotePts) || (remoteAsOf > 0 && remotePts >= localPts);
      mergedAsOf = stampedSideWon ? Math.max(localAsOf, remoteAsOf) : 0;
    }

    // Base: the XP-authoritative side wins non-computed fields too
    const localWins = (localAsOf > 0 && remoteAsOf > 0) ? localAsOf >= remoteAsOf : localPts >= remotePts;
    const winner = localWins ? localGS : remoteGS;
    const loser  = localWins ? remoteGS : localGS;

    // Union-merge badges by badgeId so no badge is ever lost
    const winnerBadges = Array.isArray(winner.badges) ? winner.badges as Array<Record<string, unknown>> : [];
    const loserBadges  = Array.isArray(loser.badges)  ? loser.badges  as Array<Record<string, unknown>> : [];
    const badgeMap = new Map<string, Record<string, unknown>>();
    for (const b of loserBadges)  badgeMap.set(String(b.badgeId ?? b.id), b);
    for (const b of winnerBadges) badgeMap.set(String(b.badgeId ?? b.id), b);

    merged.gamificationStats = {
      ...winner,
      totalPoints: mergedPts,
      ...(mergedAsOf > 0 ? { pointsAsOf: mergedAsOf } : {}),
      level: calculateLevel(mergedPts),
      badges: Array.from(badgeMap.values()),
      // Event counters: take max from both sides
      comebackCount: Math.max((localGS.comebackCount as number) || 0, (remoteGS.comebackCount as number) || 0),
      challengesCompleted: Math.max((localGS.challengesCompleted as number) || 0, (remoteGS.challengesCompleted as number) || 0),
      smartRestDays: Math.max((localGS.smartRestDays as number) || 0, (remoteGS.smartRestDays as number) || 0),
      // Streak/XP/totalWorkouts/totalVolume/personalRecords are NOT merged —
      // they're computed from workoutLogs on every render. Any value stored
      // here is just a cache that the computed hook will override.
    };
  } else if (localGS) {
    merged.gamificationStats = localGS;
  }

  // ── baselineLifts: prefer whichever side has the newer updatedAt ──
  // Prevents cloud sync from overwriting local baseline lift edits.
  const localBL = local.baselineLifts as Record<string, unknown> | undefined;
  const remoteBL = remote.baselineLifts as Record<string, unknown> | undefined;
  if (localBL && remoteBL) {
    const localBLTs = new Date((localBL.updatedAt || 0) as string).getTime();
    const remoteBLTs = new Date((remoteBL.updatedAt || 0) as string).getTime();
    if (localBLTs >= remoteBLTs) {
      merged.baselineLifts = localBL;
    }
  } else if (localBL) {
    merged.baselineLifts = localBL;
  }

  // ── Object fields with updatedAt: prefer whichever side is newer ──
  // These are critical structured fields that can regress if the wrong side wins.
  // Each gets its own updatedAt-based merge (like user and baselineLifts above).
  const updatedAtFields = ['currentMesocycle', 'activeDietPhase', 'macroTargets',
    'muscleEmphasis', 'activeEquipmentProfile', 'combatNutritionProfile',
    'notificationPreferences', 'onboardingData', 'subscription', 'nutritionPeriodPlan'];
  for (const field of updatedAtFields) {
    const localVal = local[field] as Record<string, unknown> | undefined;
    const remoteVal = remote[field] as Record<string, unknown> | undefined;
    if (localVal && remoteVal) {
      // Prefer the side with the newer updatedAt; fall back to lastSyncAt comparison
      const localTs = new Date((localVal.updatedAt || 0) as string).getTime();
      const remoteTs = new Date((remoteVal.updatedAt || 0) as string).getTime();
      if (localTs > 0 || remoteTs > 0) {
        merged[field] = localTs >= remoteTs ? localVal : remoteVal;
      } else {
        // No updatedAt on either side — fall back to lastSyncAt
        merged[field] = localSync >= remoteSync ? localVal : remoteVal;
      }
    } else if (localVal) {
      merged[field] = localVal;
    }
  }

  // ── Block lifecycle reconciliation ──
  // The updatedAtFields rule above can only pick a non-null currentMesocycle
  // (merged starts as {...remote}, and null local values never overwrite it).
  // Every way of clearing the current block (stop, complete, switch, delete)
  // ARCHIVES it into mesocycleHistory with a fresh updatedAt — so the merged
  // history is the source of truth for "this block ended":
  //
  // (a) Terminal finality: if the merged current block also exists in history
  //     with a terminal state (stopped/completed/_deleted) stamped at-or-after
  //     the current copy, the archive is the newer truth → current goes null.
  //     Without this, "Stop early" never survived a sync round-trip.
  // (b) Resurrection dedup: if the current copy is strictly NEWER than the
  //     archived one, an undo restored the block to active — drop the stale
  //     archive so the block doesn't exist as both active and completed.
  //
  // Legacy entries without timestamps are left alone (can't order them safely).
  {
    const cur = merged.currentMesocycle as Record<string, unknown> | null | undefined;
    const hist = merged.mesocycleHistory as Array<Record<string, unknown>> | undefined;
    if (cur && Array.isArray(hist)) {
      const isTerminal = (e: Record<string, unknown>) =>
        e._deleted === true || e.status === 'stopped' || e.status === 'completed';
      // If duplicates with the same id exist (one-sided legacy arrays), order
      // by the NEWEST terminal stamp so a stale early archive can't win
      const archives = hist
        .filter(e => e.id === cur.id && isTerminal(e))
        .sort((a, b) => new Date((b.updatedAt || 0) as string).getTime() - new Date((a.updatedAt || 0) as string).getTime());
      const archived = archives[0];
      if (archived) {
        const curTs = new Date((cur.updatedAt || 0) as string).getTime();
        const histTs = new Date((archived.updatedAt || 0) as string).getTime();
        if (histTs > 0 && histTs >= curTs) {
          merged.currentMesocycle = null;            // (a) the block was ended
        } else if (cur._revivedAt && curTs > 0 && curTs > histTs) {
          // (b) an explicit undo restored this block to active — drop the stale
          // archive. Gated on _revivedAt (set ONLY by undoBlockAction): a
          // routine offline edit also re-stamps updatedAt, and without the gate
          // it would permanently erase a 'completed' record (and the +200 XP
          // context) just for swapping an exercise after the block ended.
          merged.mesocycleHistory = hist.filter(e => e.id !== cur.id || !isTerminal(e));
        }
        // No marker / both unstamped → keep both copies; rule (a) re-evaluates
        // on every merge once the archive side carries the newer stamp.
      }
    }
  }

  // ── Scalar fields: prefer whichever side synced last ──
  const specialFields = new Set([
    ...arrayFields, ...objectFields, ...updatedAtFields,
    'lastSyncAt', 'user', 'gamificationStats', 'baselineLifts',
  ]);
  if (localSync > remoteSync) {
    for (const key of Object.keys(local)) {
      if (!specialFields.has(key) && local[key] !== undefined) {
        merged[key] = local[key];
      }
    }
  }

  return normalizeWorkoutLogs(merged);
}

/**
 * Queue a sync request using Background Sync API if available,
 * otherwise fall back to a localStorage-persisted queue.
 */
async function queueForBackgroundSync(userId: string, data: Record<string, unknown>, qid?: string): Promise<void> {
  // Try Background Sync API (caches the request for the SW to replay)
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      // Store payload in a dedicated cache for the SW to read
      const syncCache = await caches.open('roots-gains-sync-queue');
      const key = `/api/sync?bg=${userId}-${Date.now()}`;
      await syncCache.put(
        new Request(key),
        new Response(JSON.stringify({ userId, data, lastSyncAt: Date.now() }), {
          headers: { 'Content-Type': 'application/json' },
        })
      );
      await (reg as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-store');
      if (process.env.NODE_ENV === 'development') {
        console.log('[db-sync] Queued for background sync');
      }
      return;
    } catch {
      // Background Sync not supported or failed — fall through to localStorage queue
    }
  }

  // Fallback: localStorage-persisted queue (survives page refresh).
  // Each payload is a FULL state snapshot, so keeping N of them per user just
  // multiplies a ~500KB blob toward the 5MB quota for no benefit — the server
  // merge is idempotent and per-user, so the newest snapshot subsumes older
  // ones. Coalesce: replace any existing entry for this user with the latest.
  // Stamp lastSyncAt at queue time (not flush) so a snapshot's scalars can't
  // later beat a fresher save that happened while this sat in the queue.
  const queue = loadQueueFromStorage().filter(e => e.userId !== userId);
  queue.push({ qid, userId, data, lastSyncAt: Date.now() });
  saveQueueToStorage(queue);
  if (process.env.NODE_ENV === 'development') {
    console.log('[db-sync] Offline — queued in localStorage for later sync');
  }
}

/** Actually perform the sync POST */
async function doSync(userId: string, data: Record<string, unknown>): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await queueForBackgroundSync(userId, data);
    return;
  }

  const res = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, data, lastSyncAt: Date.now() }),
  });
  if (res.ok) {
    const body = await res.json().catch(() => ({}));
    if (body.blocked) {
      console.warn(`[db-sync] Sync BLOCKED by server (${body.reason || 'safety guard'}) — ` +
        `server score: ${body.serverScore}, incoming: ${body.incomingScore}`);
      recordSyncFailure();
    } else {
      recordSyncSuccess();
      if (process.env.NODE_ENV === 'development') {
        console.log('[db-sync] Data synced to database');
      }
    }
  } else {
    recordSyncFailure();
  }
}

/**
 * Save data to the database with debounce + max-wait to prevent starvation.
 *
 * - Resets a short debounce timer on every call (coalesces rapid changes)
 * - Guarantees a sync fires within SYNC_MAX_WAIT_MS of the first unsynced change
 */
export function saveToDatabase(userId: string, data: Record<string, unknown>): void {
  pendingPayload = { userId, data };

  // Reset the short debounce timer
  if (syncTimeout) clearTimeout(syncTimeout);

  const flush = async () => {
    if (!pendingPayload) return;
    const { userId: uid, data: payload } = pendingPayload;
    pendingPayload = null;

    // Clear both timers
    if (syncTimeout) { clearTimeout(syncTimeout); syncTimeout = null; }
    if (maxWaitTimeout) { clearTimeout(maxWaitTimeout); maxWaitTimeout = null; }

    try {
      await doSync(uid, payload);
    } catch {
      await queueForBackgroundSync(uid, payload);
    }
  };

  // Short debounce — coalesces rapid successive saves
  syncTimeout = setTimeout(flush, SYNC_DEBOUNCE_MS);

  // Max-wait — guarantees sync fires even under continuous rapid saves
  if (!maxWaitTimeout) {
    maxWaitTimeout = setTimeout(flush, SYNC_MAX_WAIT_MS);
  }
}

/** Flush any pending syncs that queued while offline (from localStorage + memory) */
export async function flushSyncQueue(): Promise<void> {
  const queue = loadQueueFromStorage();
  if (queue.length === 0) return;

  // Merge all queued entries per userId instead of keeping only the last one.
  // This prevents data loss when multiple changes are queued while offline.
  // Carry each entry's ORIGINAL lastSyncAt (stamped at queue time) — using a
  // flush-time Date.now() would let a stale queued snapshot's scalars beat a
  // fresher save that landed while it sat in the queue.
  const mergedByUser = new Map<string, Record<string, unknown>>();
  const stampByUser = new Map<string, number>();
  for (const item of queue) {
    const existing = mergedByUser.get(item.userId);
    const stamp = item.lastSyncAt ?? Date.now();
    if (!existing) {
      mergedByUser.set(item.userId, item.data);
      stampByUser.set(item.userId, stamp);
    } else {
      // Merge: union arrays, prefer newer scalars; keep the newest stamp
      mergedByUser.set(item.userId, resolveConflicts(existing, item.data));
      stampByUser.set(item.userId, Math.max(stampByUser.get(item.userId) ?? 0, stamp));
    }
  }

  const failedQueue: Array<{ userId: string; data: Record<string, unknown>; lastSyncAt: number }> = [];

  for (const [userId, data] of Array.from(mergedByUser.entries())) {
    const lastSyncAt = stampByUser.get(userId) ?? Date.now();
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, data, lastSyncAt }),
      });
      // fetch resolves on 4xx/5xx — a 401 (expired session), 429 (rate
      // limit) or 500 must NOT count as delivered, or the queued offline
      // workout is silently discarded. Re-queue and retry next visit.
      if (!res.ok) {
        failedQueue.push({ userId, data, lastSyncAt });
        recordSyncFailure();
        continue;
      }
      recordSyncSuccess();
      if (process.env.NODE_ENV === 'development') {
        console.log(`[db-sync] Flushed queued sync for ${userId}`);
      }
    } catch {
      failedQueue.push({ userId, data, lastSyncAt });
    }
  }

  // Persist any failed items back
  saveQueueToStorage(failedQueue);
}

/**
 * Immediately flush any pending debounced sync.
 * Called when the page is about to be hidden (app backgrounded, tab closed, etc.)
 * so we don't lose data that was waiting on the debounce timer.
 *
 * Strategy: ALWAYS persist to localStorage queue first (survives page kill),
 * then attempt network delivery as best-effort. On next visit, flushSyncQueue
 * will push any queued data that didn't make it.
 */
export function flushPendingSync(): void {
  if (!pendingPayload) return;
  const { userId, data } = pendingPayload;
  pendingPayload = null;

  // Clear debounce timers
  if (syncTimeout) { clearTimeout(syncTimeout); syncTimeout = null; }
  if (maxWaitTimeout) { clearTimeout(maxWaitTimeout); maxWaitTimeout = null; }

  // ALWAYS queue first — this is the safety net. Even if the keepalive
  // fetch succeeds, flushSyncQueue on next visit harmlessly merges
  // (server-side merge is idempotent). The qid lets the success handler
  // remove exactly THIS entry — queue.pop() removed whichever entry was
  // last, deleting an unrelated unsent payload when the Background Sync
  // API path was taken (this entry never enters localStorage there).
  const flushQid = `flush-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  queueForBackgroundSync(userId, data, flushQid);

  // Best-effort network delivery (may not complete before page kill)
  const payload = JSON.stringify({ userId, data, lastSyncAt: Date.now() });

  // Try fetch with keepalive (survives page unload, up to ~64KB in most browsers)
  // For large payloads this may fail, but the localStorage queue has our back.
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).then(async (res) => {
        if (res.ok) {
          // Success — remove exactly the entry this flush queued (by qid).
          // If it went to the Background Sync cache instead, this is a no-op
          // and the SW replay's idempotent merge absorbs the duplicate.
          const queue = loadQueueFromStorage();
          const remaining = queue.filter(item => item.qid !== flushQid);
          if (remaining.length !== queue.length) {
            saveQueueToStorage(remaining);
          }
          recordSyncSuccess();
        }
      }).catch(() => {
        // Network failed — queue already persisted, will retry on next visit
      });
    } catch {
      // fetch itself threw (e.g., page already unloading) — queue is persisted
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[db-sync] Flushed pending sync (queued + best-effort fetch)');
  }
}

/**
 * Immediately flush any pending debounced sync via fetch (not sendBeacon).
 * Called after critical mutations (completeWorkout, addMeal, etc.) to ensure
 * data reaches the server within seconds instead of waiting for debounce.
 */
export async function flushImmediateSync(): Promise<void> {
  if (!pendingPayload) return;
  const { userId, data } = pendingPayload;
  pendingPayload = null;

  if (syncTimeout) { clearTimeout(syncTimeout); syncTimeout = null; }
  if (maxWaitTimeout) { clearTimeout(maxWaitTimeout); maxWaitTimeout = null; }

  try {
    await doSync(userId, data);
  } catch {
    await queueForBackgroundSync(userId, data);
  }
}

/**
 * Force-push current data to cloud immediately (non-debounced).
 * Used by the manual "Sync Now" button to ensure local data reaches the server.
 */
export async function forcePushToCloud(userId: string, data: Record<string, unknown>): Promise<void> {
  // Cancel any pending debounced sync since we're pushing now
  if (syncTimeout) { clearTimeout(syncTimeout); syncTimeout = null; }
  if (maxWaitTimeout) { clearTimeout(maxWaitTimeout); maxWaitTimeout = null; }
  pendingPayload = null;

  await doSync(userId, data);
}

export async function initDatabase(): Promise<boolean> {
  try {
    const res = await fetch('/api/sync/init', { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}
