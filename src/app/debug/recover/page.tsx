'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

/**
 * /debug/recover — Emergency data recovery page
 *
 * Opens on the phone. Reads localStorage ('roots-gains-storage'),
 * shows what's there, and lets you push it back to the server
 * AND re-write localStorage so the app picks it up on reload.
 */
export default function RecoverPage() {
  const { data: session } = useSession();
  const [localData, setLocalData] = useState<Record<string, unknown> | null>(null);
  const [rawParsed, setRawParsed] = useState<Record<string, unknown> | null>(null);
  const [stats, setStats] = useState<{
    isOnboarded: boolean;
    hasUser: boolean;
    userName: string;
    workoutLogs: number;
    hasMesocycle: boolean;
    mesocycleHistory: number;
    hasGamification: boolean;
    totalXP: number;
    level: number;
    currentStreak: number;
    meals: number;
    hasBaselineLifts: boolean;
    rawSizeKB: number;
  } | null>(null);
  const [status, setStatus] = useState<'idle' | 'scanned' | 'pushing' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [backups, setBackups] = useState<Array<{ id: number; workout_count: number; created_at: string; size_bytes: number }>>([]);
  const [backupStatus, setBackupStatus] = useState<'idle' | 'loading' | 'loaded' | 'restoring' | 'restored' | 'error'>('idle');
  const [oldDbStatus, setOldDbStatus] = useState<'idle' | 'pulling' | 'done' | 'error'>('idle');
  const [oldDbResult, setOldDbResult] = useState<Record<string, unknown> | null>(null);
  const [connString, setConnString] = useState('');

  const loadBackups = useCallback(async () => {
    setBackupStatus('loading');
    try {
      const res = await fetch('/api/sync/backups');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setBackups(data.backups || []);
      setBackupStatus('loaded');
    } catch {
      setBackupStatus('error');
    }
  }, []);

  const restoreBackup = useCallback(async (backupId: number) => {
    setBackupStatus('restoring');
    try {
      const res = await fetch('/api/sync/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupId }),
      });
      if (!res.ok) throw new Error('Restore failed');
      setBackupStatus('restored');
    } catch {
      setBackupStatus('error');
    }
  }, []);

  const pullOldDb = useCallback(async () => {
    if (!connString) return;
    setOldDbStatus('pulling');
    try {
      const res = await fetch('/api/debug/pull-old-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString: connString }),
      });
      const data = await res.json();
      setOldDbResult(data);
      if (res.ok && data.restoredToCurrentDb) {
        setOldDbStatus('done');
      } else {
        setOldDbStatus('error');
      }
    } catch (e) {
      setOldDbResult({ error: e instanceof Error ? e.message : String(e) });
      setOldDbStatus('error');
    }
  }, [connString]);

  const scanLocal = () => {
    try {
      const raw = localStorage.getItem('roots-gains-storage');
      if (!raw) {
        setStatus('error');
        setErrorMsg('No localStorage data found. Browser storage may have been cleared.');
        return;
      }
      const parsed = JSON.parse(raw);
      setRawParsed(parsed);
      // Zustand persist wraps the data in { state: { ... }, version: N }
      const state = parsed?.state || parsed;
      setLocalData(state);
      setStats({
        isOnboarded: !!state?.isOnboarded,
        hasUser: !!state?.user,
        userName: state?.user?.name || '(none)',
        workoutLogs: Array.isArray(state?.workoutLogs) ? state.workoutLogs.length : 0,
        hasMesocycle: !!state?.currentMesocycle,
        mesocycleHistory: Array.isArray(state?.mesocycleHistory) ? state.mesocycleHistory.length : 0,
        hasGamification: !!state?.gamificationStats,
        totalXP: state?.gamificationStats?.totalXP || state?.gamificationStats?.totalPoints || 0,
        level: state?.gamificationStats?.level || 0,
        currentStreak: state?.gamificationStats?.currentStreak || 0,
        meals: Array.isArray(state?.meals) ? state.meals.length : 0,
        hasBaselineLifts: !!state?.baselineLifts,
        rawSizeKB: Math.round(new Blob([raw]).size / 1024),
      });
      setStatus('scanned');
    } catch (e) {
      setStatus('error');
      setErrorMsg(`Failed to read localStorage: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const pushToServer = async () => {
    if (!localData || !session?.user?.id) return;
    setStatus('pushing');
    try {
      // 1. Update the user.updatedAt to NOW so the app treats this as current
      const dataToRestore = { ...localData };
      if (dataToRestore.user && typeof dataToRestore.user === 'object') {
        dataToRestore.user = { ...(dataToRestore.user as Record<string, unknown>), updatedAt: new Date().toISOString() };
      }

      // 2. Write to localStorage in the Zustand persist format
      //    This ensures the app hydrates with this data on next load
      const persistWrapper = {
        state: dataToRestore,
        version: rawParsed?.version ?? 0,
      };
      localStorage.setItem('roots-gains-storage', JSON.stringify(persistWrapper));

      // 3. Push to server via force-restore (bypasses all guards)
      const res = await fetch('/api/debug/force-restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataToRestore }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      setStatus('done');
    } catch (e) {
      setStatus('error');
      setErrorMsg(`Push failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className="min-h-screen bg-grappler-950 text-grappler-100 p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-2">Data Recovery</h1>
      <p className="text-sm text-grappler-400 mb-6">
        This reads your phone&apos;s local storage and writes it to both the server and localStorage so the app picks it up.
      </p>

      {!session?.user ? (
        <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4 text-sm text-red-300">
          You need to be logged in. Open the app normally and log in first, then come back to this page.
        </div>
      ) : (
        <>
          <div className="text-xs text-grappler-500 mb-4">
            Logged in as: {session.user.email} ({session.user.id})
          </div>

          {status === 'idle' && (
            <button
              onClick={scanLocal}
              className="w-full py-4 rounded-xl bg-amber-600 text-white font-bold text-base active:bg-amber-700 transition-colors"
            >
              Step 1: Scan Local Storage
            </button>
          )}

          {status === 'scanned' && stats && (
            <div className="space-y-4">
              <div className="bg-grappler-900 border border-grappler-700 rounded-xl p-4 space-y-2">
                <p className="font-bold text-green-400 text-sm">Found local data! ({stats.rawSizeKB} KB)</p>
                <div className="text-xs space-y-1 text-grappler-300">
                  {stats.hasUser && <p>&#10003; Profile: {stats.userName}</p>}
                  {stats.workoutLogs > 0 && <p>&#10003; {stats.workoutLogs} workout logs</p>}
                  {stats.hasMesocycle && <p>&#10003; Active training program</p>}
                  {stats.mesocycleHistory > 0 && <p>&#10003; {stats.mesocycleHistory} past training programs</p>}
                  {stats.hasGamification && (
                    <p>&#10003; Gamification: Level {stats.level}, {stats.totalXP} XP, {stats.currentStreak} day streak</p>
                  )}
                  {stats.meals > 0 && <p>&#10003; {stats.meals} meal entries</p>}
                  {stats.hasBaselineLifts && <p>&#10003; Baseline lifts saved</p>}
                  {!stats.hasUser && stats.workoutLogs === 0 && <p className="text-amber-400">Local storage exists but appears empty.</p>}
                </div>
              </div>

              <button
                onClick={pushToServer}
                className="w-full py-4 rounded-xl bg-green-600 text-white font-bold text-base active:bg-green-700 transition-colors"
              >
                Step 2: Restore Data
              </button>

              <button
                onClick={scanLocal}
                className="w-full py-2 text-sm text-grappler-400 underline"
              >
                Re-scan
              </button>
            </div>
          )}

          {status === 'pushing' && (
            <div className="text-center py-8 text-amber-300 text-sm">
              <div className="animate-spin inline-block w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full mb-3" />
              <p>Writing to localStorage + server...</p>
            </div>
          )}

          {status === 'done' && (
            <div className="space-y-4">
              <div className="bg-green-900/30 border border-green-500/30 rounded-xl p-4 text-center">
                <p className="text-green-400 font-bold text-lg mb-1">Data Restored!</p>
                <p className="text-sm text-grappler-300">
                  Written to both localStorage and the server. Open the app — it will load this data.
                </p>
              </div>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full py-4 rounded-xl bg-primary-500 text-white font-bold text-base"
              >
                Go to App
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-400 font-bold text-sm mb-1">Error</p>
                <p className="text-xs text-red-300">{errorMsg}</p>
              </div>
              <button
                onClick={() => { setStatus('idle'); setErrorMsg(''); }}
                className="w-full py-3 rounded-xl bg-grappler-800 text-grappler-200 font-medium text-sm"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Old Database Recovery */}
          <div className="mt-8 pt-6 border-t border-grappler-700">
            <h2 className="text-lg font-bold mb-2">Recover from Old Database</h2>
            <p className="text-xs text-grappler-400 mb-4">
              Paste your old Neon connection string to pull all data from a previous database.
            </p>

            {oldDbStatus === 'idle' && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={connString}
                  onChange={(e) => setConnString(e.target.value)}
                  placeholder="postgresql://user:pass@host/db?sslmode=require"
                  className="w-full px-3 py-3 rounded-xl bg-grappler-900 border border-grappler-700 text-grappler-100 text-xs font-mono placeholder:text-grappler-600"
                />
                <button
                  onClick={pullOldDb}
                  disabled={!connString.startsWith('postgresql://')}
                  className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold text-base active:bg-blue-700 transition-colors disabled:opacity-40"
                >
                  Pull Data from Old Database
                </button>
              </div>
            )}

            {oldDbStatus === 'pulling' && (
              <div className="text-center py-8 text-blue-300 text-sm">
                <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full mb-3" />
                <p>Connecting to old database and pulling data...</p>
              </div>
            )}

            {oldDbStatus === 'done' && oldDbResult && (
              <div className="space-y-4">
                <div className="bg-green-900/30 border border-green-500/30 rounded-xl p-4 space-y-2">
                  <p className="text-green-400 font-bold text-sm">Data recovered and restored!</p>
                  <p className="text-xs text-grappler-400">Restored {oldDbResult.restoredSizeKB as number || '?'} KB to server</p>
                  {oldDbResult.userStore && typeof oldDbResult.userStore === 'object' ? (
                    <div className="text-xs text-grappler-300 space-y-0.5">
                      {(oldDbResult.userStore as Record<string, unknown>).hasUser ? (
                        <p>&#10003; Profile: {String((oldDbResult.userStore as Record<string, unknown>).userName || '')}</p>
                      ) : null}
                      {Number((oldDbResult.userStore as Record<string, unknown>).workoutLogs) > 0 ? (
                        <p>&#10003; {String((oldDbResult.userStore as Record<string, unknown>).workoutLogs)} workout logs</p>
                      ) : null}
                      {Number((oldDbResult.userStore as Record<string, unknown>).meals) > 0 ? (
                        <p>&#10003; {String((oldDbResult.userStore as Record<string, unknown>).meals)} meals</p>
                      ) : null}
                      {(oldDbResult.userStore as Record<string, unknown>).hasBaselineLifts ? <p>&#10003; Baseline lifts</p> : null}
                      {(oldDbResult.userStore as Record<string, unknown>).hasMesocycle ? <p>&#10003; Active training program</p> : null}
                      {(oldDbResult.userStore as Record<string, unknown>).hasGamification ? (
                        <p>&#10003; XP: {String((oldDbResult.userStore as Record<string, unknown>).gamificationXP)}, Level {String((oldDbResult.userStore as Record<string, unknown>).gamificationLevel)}, {String((oldDbResult.userStore as Record<string, unknown>).personalRecords)} PRs</p>
                      ) : null}
                    </div>
                  ) : null}
                  {oldDbResult.reconstructedFromTables ? (
                    <p className="text-xs text-amber-400">Reconstructed from individual DB tables (no user_store blob found)</p>
                  ) : null}
                </div>
                <p className="text-xs text-grappler-400 text-center">Open the app — all your data should load from the server on first sync.</p>
                <button
                  onClick={() => window.location.href = '/'}
                  className="w-full py-4 rounded-xl bg-primary-500 text-white font-bold text-base"
                >
                  Go to App
                </button>
              </div>
            )}

            {oldDbStatus === 'error' && (
              <div className="space-y-3">
                <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4">
                  <p className="text-red-400 font-bold text-sm mb-1">Recovery failed</p>
                  <pre className="text-xs text-red-300 whitespace-pre-wrap overflow-auto max-h-60">
                    {JSON.stringify(oldDbResult, null, 2)}
                  </pre>
                </div>
                <button
                  onClick={() => { setOldDbStatus('idle'); setOldDbResult(null); }}
                  className="w-full py-3 rounded-xl bg-grappler-800 text-grappler-200 font-medium text-sm"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>

          {/* Backups */}
          <div className="mt-8 pt-6 border-t border-grappler-700">
            <h2 className="text-lg font-bold mb-2">Server Backups</h2>
            {backupStatus === 'idle' && (
              <button
                onClick={loadBackups}
                className="w-full py-3 rounded-xl bg-grappler-800 text-grappler-200 font-medium text-sm"
              >
                Load Available Backups
              </button>
            )}
            {backupStatus === 'loading' && <p className="text-xs text-grappler-400">Loading...</p>}
            {backupStatus === 'loaded' && (
              backups.length === 0 ? (
                <p className="text-xs text-grappler-400">No backups available yet.</p>
              ) : (
                <div className="space-y-2">
                  {backups.map(b => (
                    <div key={b.id} className="flex items-center justify-between bg-grappler-900 rounded-lg p-3">
                      <div className="text-xs">
                        <p className="text-grappler-200">{new Date(b.created_at).toLocaleString()}</p>
                        <p className="text-grappler-400">{b.workout_count} workouts, {Math.round(b.size_bytes / 1024)} KB</p>
                      </div>
                      <button
                        onClick={() => restoreBackup(b.id)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}
            {backupStatus === 'restoring' && <p className="text-xs text-blue-300">Restoring...</p>}
            {backupStatus === 'restored' && (
              <div className="space-y-3">
                <p className="text-xs text-green-400">Backup restored! Refresh the app.</p>
                <button
                  onClick={() => window.location.href = '/'}
                  className="w-full py-3 rounded-xl bg-primary-500 text-white font-bold text-sm"
                >
                  Go to App
                </button>
              </div>
            )}
            {backupStatus === 'error' && (
              <button
                onClick={() => { setBackupStatus('idle'); }}
                className="text-xs text-amber-400 underline"
              >
                Failed — try again
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
