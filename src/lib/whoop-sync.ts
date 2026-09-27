/**
 * syncWhoop — the ONE Whoop sync used by the background hook and the
 * Wearable screen.
 *
 * Why this exists (audit 2026-09-24): the background sync had its own
 * transform, never auto-imported mat sessions, skipped for 15 min after any
 * fetch, did no proactive token refresh, and swallowed every error — so the
 * only way to see fresh data was to open Wearable. Two independent syncs also
 * raced on Whoop's single-use refresh tokens. One in-flight promise now
 * serialises every caller.
 */
import { useAppStore } from './store';
import {
  LS_KEYS, getToken, setToken, clearTokens, isTokenExpired,
  transformWhoopData, transformWhoopWorkouts, transformWhoopBody, autoImportCombatWorkouts,
  type WhoopApiResponse, type AutoImportResult,
} from './whoop-client';
import { mergeWearableHistory, mergeWhoopWorkouts, syncWindowDays } from './whoop-history';
import { backfillLiftWhoopHR } from './whoop-training';
import type { WearableData, WhoopWorkout, WhoopBodyMeasurement } from './types';

export interface WhoopSyncResult {
  status: 'ok' | 'skipped' | 'not_connected' | 'reconnect' | 'error';
  error?: string;
  api?: WhoopApiResponse;
  data?: WearableData[];
  workouts?: WhoopWorkout[];
  body?: WhoopBodyMeasurement | null;
  importResult?: AutoImportResult;
  /** Lifting logs that got (or refreshed) their Whoop HR/strain this sync. */
  liftsLinked?: number;
  warnings?: string[];
}

/** Combat workouts auto-import as mat sessions only from this far back. */
const IMPORT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Re-fetch at most this often unless forced (was 15 min). */
export const WHOOP_MIN_INTERVAL_MS = 5 * 60 * 1000;

let inflight: Promise<WhoopSyncResult> | null = null;

async function restoreTokensFromDb(): Promise<boolean> {
  try {
    const res = await fetch('/api/whoop/tokens', { credentials: 'include' });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.tokens?.access_token) {
      setToken(LS_KEYS.accessToken, data.tokens.access_token);
      if (data.tokens.refresh_token) setToken(LS_KEYS.refreshToken, data.tokens.refresh_token);
      if (data.tokens.expires_at) setToken(LS_KEYS.tokenExpires, data.tokens.expires_at);
      return true;
    }
  } catch { /* not signed in / offline */ }
  return false;
}

function saveTokensToDb(at: string, rt: string, exp: string) {
  fetch('/api/whoop/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ access_token: at, refresh_token: rt, expires_at: exp }),
  }).catch(() => { /* best effort */ });
}

function storeRefreshed(d: { new_access_token?: string; new_refresh_token?: string; new_expires_in?: number }, fallbackRt: string) {
  if (!d.new_access_token) return;
  const exp = d.new_expires_in ? String(Date.now() + d.new_expires_in * 1000) : '';
  setToken(LS_KEYS.accessToken, d.new_access_token);
  if (d.new_refresh_token) setToken(LS_KEYS.refreshToken, d.new_refresh_token);
  if (exp) setToken(LS_KEYS.tokenExpires, exp);
  saveTokensToDb(d.new_access_token, d.new_refresh_token || fallbackRt, exp);
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function record(patch: { lastAttemptAt?: string; lastSuccessAt?: string; lastError?: string | null }) {
  const cur = useAppStore.getState().whoopSync ?? {};
  useAppStore.setState({ whoopSync: { ...cur, ...patch, lastError: patch.lastError === null ? undefined : (patch.lastError ?? cur.lastError) } });
}

export function syncWhoop(opts: { force?: boolean } = {}): Promise<WhoopSyncResult> {
  if (inflight) return inflight;
  inflight = run(opts).finally(() => { inflight = null; });
  return inflight;
}

async function run({ force = false }: { force?: boolean }): Promise<WhoopSyncResult> {
  let accessToken = getToken(LS_KEYS.accessToken);
  let refreshToken = getToken(LS_KEYS.refreshToken) || '';
  if (!accessToken && await restoreTokensFromDb()) {
    accessToken = getToken(LS_KEYS.accessToken);
    refreshToken = getToken(LS_KEYS.refreshToken) || '';
  }
  if (!accessToken) return { status: 'not_connected' };

  if (!force) {
    const s = useAppStore.getState();
    const last = s.whoopSync?.lastSuccessAt ? Date.parse(s.whoopSync.lastSuccessAt) : 0;
    const latest = s.latestWhoopData as (WearableData & { date?: string | Date }) | null;
    const latestDay = latest?.date ? new Date(latest.date) : null;
    const hasTodayRecovery = !!latestDay
      && `${latestDay.getFullYear()}-${String(latestDay.getMonth() + 1).padStart(2, '0')}-${String(latestDay.getDate()).padStart(2, '0')}` === todayKey()
      && latest?.recoveryScore != null;
    // Fresh enough AND today's recovery is in → nothing new to get yet.
    if (last && Date.now() - last < WHOOP_MIN_INTERVAL_MS && hasTodayRecovery) return { status: 'skipped' };
  }

  record({ lastAttemptAt: new Date().toISOString() });
  try {
    // Proactive refresh so the data call doesn't start with a dead token.
    if (isTokenExpired() && refreshToken) {
      const r = await fetch('/api/whoop/data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: 'expired_proactive_refresh', refresh_token: refreshToken }),
      });
      if (r.headers.get('content-type')?.includes('application/json')) {
        const d = await r.json();
        if (d.new_access_token) {
          storeRefreshed(d, refreshToken);
          accessToken = d.new_access_token;
          refreshToken = d.new_refresh_token || refreshToken;
        }
      }
    }

    // First sync / after a gap: backfill 60 days so baselines are real.
    const days = syncWindowDays(useAppStore.getState().wearableHistory);
    const fetchData = () => fetch('/api/whoop/data', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken, days }),
    });
    let res = await fetchData();
    if (!res.headers.get('content-type')?.includes('application/json')) {
      const error = `Whoop sync failed (server ${res.status})`;
      record({ lastError: error });
      return { status: 'error', error };
    }
    let api: WhoopApiResponse = await res.json();

    // The server (webhook) may have rotated the single-use refresh token and
    // saved it to the DB — ours is then dead. Retry once with the DB's tokens
    // before calling the connection lost.
    if (!api.connected && api.requiresReconnect) {
      const usedRefresh = refreshToken;
      if (await restoreTokensFromDb()) {
        const dbRefresh = getToken(LS_KEYS.refreshToken) || '';
        const dbAccess = getToken(LS_KEYS.accessToken);
        if (dbAccess && (dbRefresh !== usedRefresh || dbAccess !== accessToken)) {
          accessToken = dbAccess;
          refreshToken = dbRefresh;
          res = await fetchData();
          if (res.headers.get('content-type')?.includes('application/json')) api = await res.json();
        }
      }
    }
    storeRefreshed(api as never, refreshToken);

    if (!api.connected) {
      if ((api as { requiresReconnect?: boolean }).requiresReconnect) {
        clearTokens();
        fetch('/api/whoop/tokens', { method: 'DELETE', credentials: 'include' }).catch(() => {});
        const error = 'Whoop session expired — reconnect in Wearable';
        record({ lastError: error });
        return { status: 'reconnect', error };
      }
      const error = (api as { error?: string }).error || `Whoop sync failed (${res.status})`;
      record({ lastError: error });
      return { status: 'error', error };
    }

    const { data } = transformWhoopData(api);
    const fetchedWorkouts = transformWhoopWorkouts(api);
    const body = transformWhoopBody(api);
    const store = useAppStore.getState();
    // Merge, don't replace — the fetch window is short after the first backfill.
    const history = mergeWearableHistory(store.wearableHistory ?? [], data);
    const workouts = mergeWhoopWorkouts(store.whoopWorkouts ?? [], fetchedWorkouts);
    if (data.length > 0) {
      store.setLatestWhoopData(data[data.length - 1]);
      store.setWearableHistory(history);
    }
    store.setWhoopWorkouts(workouts);
    if (body) store.setWhoopBody(body);
    // Mat sessions from Whoop used to appear only after opening Wearable.
    // Only the last week, as before the backfill: import dedupes by Whoop id
    // alone, so 60 days would duplicate mat sessions the athlete logged by hand.
    const importCutoff = Date.now() - IMPORT_WINDOW_MS;
    const recent = fetchedWorkouts.filter(w => new Date(w.start).getTime() >= importCutoff);
    const importResult = recent.length > 0 ? autoImportCombatWorkouts(recent) : undefined;
    // Link lifts to their Whoop workout now that Whoop has scored it (runs
    // after the mat import so a BJJ session is never claimed by a lift).
    const after = useAppStore.getState();
    const links = backfillLiftWhoopHR(after.workoutLogs, workouts, after.trainingSessions);
    for (const l of links) after.updateWorkoutLog(l.logId, { whoopHR: l.whoopHR });
    record({ lastSuccessAt: new Date().toISOString(), lastError: null });
    return {
      status: 'ok', api, data: history, workouts, body, importResult, liftsLinked: links.length,
      warnings: (api as { warnings?: string[] }).warnings,
    };
  } catch (e) {
    const error = e instanceof Error ? `Whoop sync failed: ${e.message}` : 'Whoop sync failed';
    record({ lastError: error });
    return { status: 'error', error };
  }
}
