'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity,
  Heart,
  Moon,
  Zap,
  Battery,
  ChevronLeft,
  RefreshCw,
  Settings,
  TrendingUp,
  TrendingDown,
  Minus,
  Thermometer,
  Wind,
  Loader2,
  ExternalLink,
  AlertCircle,
  Droplets,
  BedDouble,
  Brain,
  Dumbbell,
  Timer,
  Gauge,
  Scale,
  Ruler,
  ChevronDown,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { WearableData, WearableProvider, WhoopWorkout, WhoopBodyMeasurement, ActivityType, ActivityCategory, TrainingIntensity } from '@/lib/types';
import HealthImport from './HealthImport';
import {
  AutoImportResult,
  LS_KEYS,
  WhoopApiResponse,
  autoImportCombatWorkouts,
  clearTokens,
  getToken,
  isTokenExpired,
  setToken,
  transformWhoopBody,
  transformWhoopData,
  transformWhoopWorkouts,
} from '@/lib/whoop-client';
import { syncWhoop } from '@/lib/whoop-sync';
import { resolveWeightUnit } from '@/lib/units';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WearableIntegrationProps {
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function recoveryColor(score: number): string {
  if (score >= 67) return 'text-green-400';
  if (score >= 34) return 'text-yellow-400';
  return 'text-red-400';
}

function recoveryBg(score: number): string {
  if (score >= 67) return 'bg-green-500/20';
  if (score >= 34) return 'bg-yellow-500/20';
  return 'bg-red-500/20';
}

function recoveryBorder(score: number): string {
  if (score >= 67) return 'border-green-500/40';
  if (score >= 34) return 'border-yellow-500/40';
  return 'border-red-500/40';
}

function recoveryLabel(score: number): string {
  if (score >= 67) return 'Green';
  if (score >= 34) return 'Yellow';
  return 'Red';
}

function strainColor(strain: number): string {
  if (strain >= 18) return 'text-red-400';
  if (strain >= 14) return 'text-blue-400';
  if (strain >= 10) return 'text-yellow-400';
  return 'text-blue-400';
}

function trendIcon(current: number, previous: number) {
  if (current > previous) return <TrendingUp className="w-3.5 h-3.5 text-green-400" />;
  if (current < previous) return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-grappler-500" />;
}


// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WearableIntegration({ onClose }: WearableIntegrationProps) {
  const user = useAppStore(s => s.user);
  const weightUnit = resolveWeightUnit(user?.weightUnit);
  const [wearableData, setWearableData] = useState<WearableData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualRecovery, setManualRecovery] = useState('');
  const [manualHRV, setManualHRV] = useState('');
  const [manualRHR, setManualRHR] = useState('');
  const [manualSleepHours, setManualSleepHours] = useState('');
  const [manualStrain, setManualStrain] = useState('');
  const [autoAdjust, setAutoAdjust] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [whoopProfile, setWhoopProfile] = useState<any>(null);
  const [whoopWorkouts, setWhoopWorkouts] = useState<WhoopWorkout[]>([]);
  const [whoopBody, setWhoopBody] = useState<WhoopBodyMeasurement | null>(null);
  const [showSleepDetails, setShowSleepDetails] = useState(false);
  const [showVitals, setShowVitals] = useState(false);
  const [autoImportResult, setAutoImportResult] = useState<AutoImportResult | null>(null);
  const fetchInFlight = useRef(false);

  // ------------------------------------------------------------------
  // DB token persistence helpers (cross-device sign-in)
  // ------------------------------------------------------------------
  const loadTokensFromDb = useCallback(async (): Promise<boolean> => {
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
    } catch { /* DB unavailable */ }
    return false;
  }, []);

  const saveTokensToDb = useCallback((at: string, rt: string, exp: string) => {
    fetch('/api/whoop/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ access_token: at, refresh_token: rt, expires_at: exp }),
    }).catch((err) => { console.error('Failed to save Whoop tokens to DB:', err); });
  }, []);

  const clearTokensFromDb = useCallback(() => {
    fetch('/api/whoop/tokens', { method: 'DELETE', credentials: 'include' }).catch(() => {});
  }, []);

  // ------------------------------------------------------------------
  // Core data fetcher — handles token refresh inline
  // ------------------------------------------------------------------
  const fetchWhoopData = useCallback(async () => {
    // Same sync the background hook runs (lib/whoop-sync) — one code path,
    // one in-flight request, so the two can't race on Whoop's single-use
    // refresh tokens.
    if (fetchInFlight.current) return;
    fetchInFlight.current = true;
    setIsSyncing(true);
    setError(null);
    try {
      const r = await syncWhoop({ force: true });
      if (r.status === 'ok') {
        setIsConnected(true);
        setWhoopProfile(r.api?.profile);
        setWearableData(r.data ?? []);
        setWhoopWorkouts(r.workouts ?? []);
        setWhoopBody(r.body ?? null);
        setLastSync(new Date());
        if (r.importResult && (r.importResult.imported > 0 || r.importResult.updated > 0)) {
          setAutoImportResult(r.importResult);
        }
        if (r.warnings && r.warnings.length > 0) setError(`Some data unavailable: ${r.warnings[0]}`);
      } else {
        setIsConnected(false);
        if (r.error) setError(r.error);
      }
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
      fetchInFlight.current = false;
    }
  }, []);

  // ------------------------------------------------------------------
  // On mount: handle OAuth callback params, then fetch data
  // ------------------------------------------------------------------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // --- Handle OAuth error ---
    if (params.get('whoop_error')) {
      const rawError = params.get('whoop_error')!;
      const safeError = decodeURIComponent(rawError).replace(/<[^>]*>/g, '');
      setError(`Whoop connection failed: ${safeError}`);
      // Clean up URL completely (search params + hash)
      window.history.replaceState({}, '', window.location.pathname);
      setIsLoading(false);
      return;
    }

    // --- Handle OAuth success ---
    if (params.get('whoop_connected') === 'true') {
      // Check URL hash for fallback tokens (if localStorage failed in callback page)
      if (window.location.hash && window.location.hash.length > 1) {
        try {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const at = hashParams.get('whoop_at');
          const rt = hashParams.get('whoop_rt');
          const exp = hashParams.get('whoop_exp');
          if (at) {
            setToken(LS_KEYS.accessToken, at);
            if (rt) setToken(LS_KEYS.refreshToken, rt);
            if (exp) setToken(LS_KEYS.tokenExpires, exp);
          }
        } catch {
          // Hash parse errors — tokens should already be in localStorage from callback
        }
      }
      // Clean up URL completely
      window.history.replaceState({}, '', window.location.pathname);
    }

    fetchWhoopData();
  }, [fetchWhoopData]);

  // ------------------------------------------------------------------
  // PWA resume: auto-detect WHOOP connection when user switches back
  // from the external browser (iOS opens Safari for OAuth). The callback
  // page stores tokens to the DB, so when the PWA regains focus we
  // re-check and connect automatically.
  // ------------------------------------------------------------------
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        !isConnected &&
        !fetchInFlight.current
      ) {
        fetchWhoopData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isConnected, fetchWhoopData]);

  // ------------------------------------------------------------------
  // Background token keep-alive — refresh tokens before they expire
  // even if the user isn't actively syncing. Runs every 30 minutes.
  // ------------------------------------------------------------------
  // (Keep-alive now lives in the shared background sync — a second refresher
  // here raced it on Whoop's single-use refresh tokens.)

  // ------------------------------------------------------------------
  // Derived data
  // ------------------------------------------------------------------
  const today = wearableData.length > 0 ? wearableData[wearableData.length - 1] : null;
  const yesterday = wearableData.length >= 2 ? wearableData[wearableData.length - 2] : null;

  // Compute today's strain independently from workouts (Whoop API doesn't give
  // running cycle strain). This replaces the broken "Live" display.
  const todayKey = new Date().toISOString().substring(0, 10);
  const todayWorkouts = useMemo(() => whoopWorkouts.filter(w => {
    const d = (w.end || w.start);
    return d && new Date(d).toISOString().substring(0, 10) === todayKey;
  }), [whoopWorkouts, todayKey]);

  const todayWorkoutStrain = useMemo(() => {
    if (todayWorkouts.length === 0) return 0;
    // Combine all workout strains using root-sum-of-squares (strain is logarithmic 0-21)
    const strains = todayWorkouts.map(w => w.strain ?? 0).filter(s => s > 0);
    if (strains.length === 0) return 0;
    return Math.min(21, Math.round(Math.sqrt(strains.reduce((sum, s) => sum + s * s, 0)) * 10) / 10);
  }, [todayWorkouts]);

  // For today: prefer cycle strain if available, otherwise use combined workout strain
  const effectiveStrain = today?.strain ?? (todayWorkoutStrain > 0 ? todayWorkoutStrain : 0);

  const chartData = useMemo(
    () =>
      wearableData.map((d) => ({
        day: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
        recovery: d.recoveryScore ?? 0,
        hrv: d.hrv ?? 0,
        strain: d.strain ?? 0,
      })),
    [wearableData],
  );

  const avgRecovery = useMemo(() => {
    const scores = wearableData
      .map((d) => d.recoveryScore)
      .filter((s): s is number => s != null);
    return scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
  }, [wearableData]);

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------
  const handleConnect = () => {
    // Detect PWA standalone mode — 100% reliable when checked inside the PWA.
    // We pass this flag to the auth route so the callback page knows to show
    // a "return to app" page instead of redirecting (which would stay in the
    // iOS in-app browser and load the app with fresh state / onboarding).
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    window.location.href = `/api/whoop/auth${isStandalone ? '?from=pwa' : ''}`;
  };

  const handleDisconnect = () => {
    clearTokens();
    clearTokensFromDb();
    setIsConnected(false);
    setWearableData([]);
    setWhoopWorkouts([]);
    setWhoopBody(null);
    setWhoopProfile(null);
    setLastSync(null);
    setError(null);
    useAppStore.getState().setWhoopWorkouts([]);
  };

  const handleSync = () => {
    fetchWhoopData();
  };

  const handleManualSubmit = () => {
    const newEntry: WearableData = {
      id: `manual-${Date.now()}`,
      date: new Date(),
      provider: 'whoop' as WearableProvider,
      recoveryScore: manualRecovery ? parseInt(manualRecovery) : null,
      hrv: manualHRV ? parseInt(manualHRV) : null,
      restingHR: manualRHR ? parseInt(manualRHR) : null,
      sleepHours: manualSleepHours ? parseFloat(manualSleepHours) : null,
      sleepScore: null,
      strain: manualStrain ? parseFloat(manualStrain) : null,
      respiratoryRate: null,
      skinTemp: null,
      caloriesBurned: null,
      spo2: null,
      sleepEfficiency: null,
      deepSleepMinutes: null,
      remSleepMinutes: null,
      sleepDisturbances: null,
      lightSleepMinutes: null,
      sleepCycleCount: null,
      sleepConsistency: null,
      sleepNeededHours: null,
      avgHeartRate: null,
      maxHeartRate: null,
    };

    setWearableData((prev) => [...prev, newEntry]);
    setShowManualEntry(false);
    setManualRecovery('');
    setManualHRV('');
    setManualRHR('');
    setManualSleepHours('');
    setManualStrain('');
  };

  // ------------------------------------------------------------------
  // Training readiness (derived from today's recovery score)
  // ------------------------------------------------------------------
  const readiness = useMemo(() => {
    const score = today?.recoveryScore ?? 0;
    if (score >= 67) {
      return {
        title: 'Peak Readiness',
        message: 'Full send — your body is recovered. Hit it hard today.',
        accent: 'text-green-400',
        bg: 'bg-green-500/10 border-green-500/30',
        icon: <Zap className="w-5 h-5 text-green-400" />,
      };
    }
    if (score >= 34) {
      return {
        title: 'Moderate Readiness',
        message: 'Moderate intensity recommended. Consider lighter loads or fewer sets.',
        accent: 'text-yellow-400',
        bg: 'bg-yellow-500/10 border-yellow-500/30',
        icon: <Activity className="w-5 h-5 text-yellow-400" />,
      };
    }
    return {
      title: 'Recovery Day',
      message: 'Recovery day recommended. Consider mobility work or light cardio.',
      accent: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/30',
      icon: <Battery className="w-5 h-5 text-red-400" />,
    };
  }, [today]);

  const strainPct = effectiveStrain > 0 ? Math.min((effectiveStrain / 21) * 100, 100) : 0;

  // ------------------------------------------------------------------
  // Loading state
  // ------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="min-h-screen bg-grappler-900 bg-mesh flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-green-400 animate-spin mx-auto mb-3" />
          <p className="text-grappler-400 text-sm">Connecting to Whoop...</p>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className="min-h-screen bg-grappler-900 bg-mesh pb-24 safe-area-top"
    >
      {/* Header */}
      <header className="sticky top-0 z-40 bg-grappler-900 border-b border-grappler-800">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button aria-label="Go back" onClick={onClose} className="-ml-2 w-10 h-10 rounded-lg flex items-center justify-center text-grappler-200 hover:bg-grappler-800 transition-colors flex-shrink-0">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-grappler-50 leading-tight">Whoop</h1>
                <p className="text-xs text-grappler-400">
                  {whoopProfile
                    ? `${whoopProfile.first_name || ''} ${whoopProfile.last_name || ''}`.trim() ||
                      'Connected'
                    : 'Wearable Integration'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected && (
              <button
                onClick={handleSync}
                disabled={isSyncing}
                aria-label="Sync"
                className="btn btn-ghost btn-sm p-1.5"
              >
                <RefreshCw
                  className={cn('w-4 h-4 text-grappler-400', isSyncing && 'animate-spin')}
                />
              </button>
            )}
            <button
              onClick={() => setShowManualEntry(!showManualEntry)}
              className="btn btn-ghost btn-sm p-1.5"
            >
              <Settings className="w-4 h-4 text-grappler-400" />
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-5">
        {/* Error Banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-3"
          >
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-300">{error}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <button
                  onClick={() => setError(null)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Dismiss
                </button>
                {!isConnected && (
                  <button
                    onClick={handleConnect}
                    className="text-xs text-green-400 hover:text-green-300 font-medium"
                  >
                    Reconnect
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Auto-Import Success Banner */}
        {autoImportResult && (autoImportResult.imported > 0 || autoImportResult.updated > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-lime-500/10 border border-lime-500/30 rounded-xl p-3"
          >
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-lime-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-lime-300">
                  {autoImportResult.imported > 0
                    ? `${autoImportResult.imported} Session${autoImportResult.imported > 1 ? 's' : ''} Imported`
                    : ''}
                  {autoImportResult.imported > 0 && autoImportResult.updated > 0 ? ', ' : ''}
                  {autoImportResult.updated > 0
                    ? `${autoImportResult.updated} Session${autoImportResult.updated > 1 ? 's' : ''} Updated`
                    : ''}
                </p>
                <div className="mt-2 space-y-1.5">
                  {autoImportResult.sessions.map((session, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-grappler-400">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-xs font-medium",
                        session.type.includes('bjj') ? 'bg-blue-500/20 text-blue-300' :
                        session.type === 'wrestling' ? 'bg-blue-500/20 text-blue-300' :
                        session.type === 'mma' ? 'bg-red-500/20 text-red-300' :
                        'bg-purple-500/20 text-purple-300'
                      )}>
                        {session.type.replace('_', ' ').toUpperCase()}
                      </span>
                      <span>{session.duration}min</span>
                      <span className="text-grappler-400">•</span>
                      <span className="capitalize">{session.intensity.replace('_', ' ')}</span>
                      {session.detectionMethod === 'heuristic' && (
                        <span className="text-yellow-400/70 text-xs">(auto-detected)</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => setAutoImportResult(null)}
                    className="text-xs text-lime-400 hover:text-lime-300"
                  >
                    Dismiss
                  </button>
                  <span className="text-xs text-grappler-400">
                    View in Grappling Tracker to edit
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Connection Status */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={cn(
            'card p-4 flex items-center justify-between',
            isConnected ? 'border-green-500/30' : 'border-red-500/30',
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-3 h-3 rounded-full',
                isConnected
                  ? 'bg-green-400 shadow-lg shadow-green-400/40'
                  : 'bg-red-400',
              )}
            />
            <div>
              <p className="text-sm font-medium text-grappler-100">
                {isConnected ? 'Connected' : 'Not Connected'}
              </p>
              {isConnected && lastSync && (
                <p className="text-xs text-grappler-400">
                  Last sync{' '}
                  {lastSync.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={isConnected ? handleDisconnect : handleConnect}
            className={cn(
              'btn btn-sm',
              isConnected ? 'btn-secondary' : 'btn-primary',
            )}
          >
            {isConnected ? 'Disconnect' : 'Connect'}
          </button>
        </motion.div>

        {/* Connected Dashboard */}
        {isConnected && today && (
          <>
            {/* ── RECOVERY HERO ── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={cn('rounded-lg p-5 border', readiness.bg)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-grappler-400 uppercase tracking-wider">Recovery</span>
                    <span className="text-xs text-grappler-600">
                      {new Date(today.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-end gap-2 mt-1">
                    <span className={cn('text-5xl font-black tabular-nums', recoveryColor(today.recoveryScore ?? 0))}>
                      {today.recoveryScore ?? '--'}
                    </span>
                    <span className="text-grappler-500 text-base pb-2">%</span>
                  </div>
                  <div className="mt-3 h-2.5 bg-black/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${today.recoveryScore ?? 0}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={cn(
                        'h-full rounded-full',
                        (today.recoveryScore ?? 0) >= 67 ? 'bg-gradient-to-r from-green-500 to-green-400'
                          : (today.recoveryScore ?? 0) >= 34 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                            : 'bg-gradient-to-r from-red-500 to-red-400',
                      )}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 ml-4">
                  <span className={cn(
                    'text-xs font-semibold px-2.5 py-1 rounded-full',
                    recoveryBg(today.recoveryScore ?? 0),
                    recoveryColor(today.recoveryScore ?? 0),
                  )}>
                    {recoveryLabel(today.recoveryScore ?? 0)}
                  </span>
                </div>
              </div>
              {/* Training readiness advice inline */}
              <div className="flex items-center gap-2.5 mt-4 pt-3 border-t border-white/5">
                <div className="shrink-0">{readiness.icon}</div>
                <div>
                  <p className={cn('text-xs font-semibold', readiness.accent)}>{readiness.title}</p>
                  <p className="text-xs text-grappler-400 leading-relaxed">{readiness.message}</p>
                </div>
              </div>
            </motion.div>

            {/* ── KEY METRICS ROW ── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="grid grid-cols-3 gap-2.5"
            >
              {/* Strain */}
              <div className="bg-grappler-800 rounded-xl p-3.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Zap className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs text-grappler-400">Day Strain</span>
                </div>
                <p className={cn('text-xl font-bold', effectiveStrain > 0 ? strainColor(effectiveStrain) : 'text-grappler-500')}>
                  {effectiveStrain.toFixed(1)}
                </p>
                <div className="h-1 bg-grappler-700 rounded-full overflow-hidden mt-1.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${strainPct}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 via-yellow-400 to-red-500"
                  />
                </div>
              </div>
              {/* HRV */}
              <div className="bg-grappler-800 rounded-xl p-3.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Activity className="w-3.5 h-3.5 text-primary-400" />
                  <span className="text-xs text-grappler-400">HRV</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xl font-bold text-grappler-50">{today.hrv ?? '--'}</p>
                  {yesterday?.hrv != null && today.hrv != null && trendIcon(today.hrv, yesterday.hrv)}
                </div>
                <span className="text-xs text-grappler-600">ms</span>
              </div>
              {/* Resting HR */}
              <div className="bg-grappler-800 rounded-xl p-3.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Heart className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-xs text-grappler-400">RHR</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xl font-bold text-grappler-50">{today.restingHR ?? '--'}</p>
                  {yesterday?.restingHR != null && today.restingHR != null && trendIcon(yesterday.restingHR, today.restingHR)}
                </div>
                <span className="text-xs text-grappler-600">bpm</span>
              </div>
            </motion.div>

            {/* ── SLEEP SECTION ── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-grappler-800 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setShowSleepDetails(!showSleepDetails)}
                className="w-full p-4 flex items-center justify-between hover:bg-grappler-750 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Moon className="w-4 h-4 text-purple-400" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-grappler-100">Sleep</p>
                    <p className="text-xs text-grappler-400">
                      {today.sleepHours != null ? `${today.sleepHours.toFixed(1)} hrs` : '--'}
                      {today.sleepScore != null && ` · Score ${today.sleepScore}`}
                      {today.sleepEfficiency != null && ` · ${today.sleepEfficiency.toFixed(0)}% eff.`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {today.sleepNeededHours != null && today.sleepHours != null && (
                    <span className={cn(
                      'text-xs font-semibold px-2 py-0.5 rounded-full',
                      today.sleepHours >= today.sleepNeededHours ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400',
                    )}>
                      {today.sleepHours >= today.sleepNeededHours ? '+' : ''}{(today.sleepHours - today.sleepNeededHours).toFixed(1)}h
                    </span>
                  )}
                  <motion.div animate={{ rotate: showSleepDetails ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-4 h-4 text-grappler-500" />
                  </motion.div>
                </div>
              </button>

              {/* Sleep stage bar (always visible) */}
              {(today.deepSleepMinutes != null || today.remSleepMinutes != null || today.lightSleepMinutes != null) && (
                <div className="px-4 pb-3">
                  {(() => {
                    const deep = today.deepSleepMinutes ?? 0;
                    const rem = today.remSleepMinutes ?? 0;
                    const light = today.lightSleepMinutes ?? 0;
                    const total = deep + rem + light;
                    if (total === 0) return null;
                    return (
                      <>
                        <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                          <div className="rounded-l-full bg-indigo-500" style={{ width: `${(deep / total) * 100}%` }} />
                          <div className="bg-purple-400" style={{ width: `${(rem / total) * 100}%` }} />
                          <div className="rounded-r-full bg-purple-300/40" style={{ width: `${(light / total) * 100}%` }} />
                        </div>
                        <div className="flex justify-between mt-1.5 text-xs">
                          <span className="text-indigo-400">Deep {deep}m</span>
                          <span className="text-purple-400">REM {rem}m</span>
                          <span className="text-purple-300/60">Light {light}m</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Expanded sleep details */}
              <AnimatePresence>
                {showSleepDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 grid grid-cols-2 gap-2.5 border-t border-grappler-700/50 pt-3">
                      {today.sleepConsistency != null && (
                        <div className="bg-grappler-900/50 rounded-lg p-3">
                          <span className="text-xs text-grappler-400 flex items-center gap-1"><Timer className="w-3 h-3" /> Consistency</span>
                          <p className="text-lg font-bold text-grappler-100 mt-0.5">{today.sleepConsistency.toFixed(0)}%</p>
                        </div>
                      )}
                      {today.sleepDisturbances != null && (
                        <div className="bg-grappler-900/50 rounded-lg p-3">
                          <span className="text-xs text-grappler-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Disturbances</span>
                          <p className="text-lg font-bold text-grappler-100 mt-0.5">{today.sleepDisturbances}</p>
                        </div>
                      )}
                      {today.sleepNeededHours != null && (
                        <div className="bg-grappler-900/50 rounded-lg p-3">
                          <span className="text-xs text-grappler-400 flex items-center gap-1"><BedDouble className="w-3 h-3" /> Needed</span>
                          <p className="text-lg font-bold text-grappler-100 mt-0.5">{today.sleepNeededHours.toFixed(1)} hrs</p>
                        </div>
                      )}
                      {today.sleepEfficiency != null && (
                        <div className="bg-grappler-900/50 rounded-lg p-3">
                          <span className="text-xs text-grappler-400 flex items-center gap-1"><Moon className="w-3 h-3" /> Efficiency</span>
                          <p className="text-lg font-bold text-grappler-100 mt-0.5">{today.sleepEfficiency.toFixed(0)}%</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ── VITALS SECTION ── */}
            {(today.respiratoryRate != null || today.spo2 != null || today.skinTemp != null || today.caloriesBurned != null) && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-grappler-800 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setShowVitals(!showVitals)}
                  className="w-full p-4 flex items-center justify-between hover:bg-grappler-750 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <p className="text-sm font-medium text-grappler-100">Vitals & Activity</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {today.caloriesBurned != null && (
                      <span className="text-xs text-grappler-400">{today.caloriesBurned.toLocaleString()} kcal</span>
                    )}
                    <motion.div animate={{ rotate: showVitals ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="w-4 h-4 text-grappler-500" />
                    </motion.div>
                  </div>
                </button>
                <AnimatePresence>
                  {showVitals && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 grid grid-cols-2 gap-2.5 border-t border-grappler-700/50 pt-3">
                        {today.respiratoryRate != null && (
                          <div className="bg-grappler-900/50 rounded-lg p-3">
                            <span className="text-xs text-grappler-400 flex items-center gap-1"><Wind className="w-3 h-3" /> Resp. Rate</span>
                            <p className="text-lg font-bold text-grappler-100 mt-0.5">{today.respiratoryRate.toFixed(1)} <span className="text-xs font-normal text-grappler-400">rpm</span></p>
                          </div>
                        )}
                        {today.skinTemp != null && (
                          <div className="bg-grappler-900/50 rounded-lg p-3">
                            <span className="text-xs text-grappler-400 flex items-center gap-1"><Thermometer className="w-3 h-3" /> Skin Temp</span>
                            <p className="text-lg font-bold text-grappler-100 mt-0.5">{today.skinTemp.toFixed(1)}&deg;F</p>
                          </div>
                        )}
                        {today.spo2 != null && (
                          <div className="bg-grappler-900/50 rounded-lg p-3">
                            <span className="text-xs text-grappler-400 flex items-center gap-1"><Droplets className="w-3 h-3" /> SpO2</span>
                            <p className="text-lg font-bold text-grappler-100 mt-0.5">{today.spo2.toFixed(0)}%</p>
                          </div>
                        )}
                        {today.caloriesBurned != null && (
                          <div className="bg-grappler-900/50 rounded-lg p-3">
                            <span className="text-xs text-grappler-400 flex items-center gap-1"><Zap className="w-3 h-3" /> Calories</span>
                            <p className="text-lg font-bold text-grappler-100 mt-0.5">{today.caloriesBurned.toLocaleString()} <span className="text-xs font-normal text-grappler-400">kcal</span></p>
                          </div>
                        )}
                        {today.avgHeartRate != null && (
                          <div className="bg-grappler-900/50 rounded-lg p-3">
                            <span className="text-xs text-grappler-400 flex items-center gap-1"><Heart className="w-3 h-3" /> Avg HR</span>
                            <p className="text-lg font-bold text-grappler-100 mt-0.5">{today.avgHeartRate} <span className="text-xs font-normal text-grappler-400">bpm</span></p>
                          </div>
                        )}
                        {today.maxHeartRate != null && (
                          <div className="bg-grappler-900/50 rounded-lg p-3">
                            <span className="text-xs text-grappler-400 flex items-center gap-1"><Heart className="w-3 h-3 text-red-400" /> Max HR</span>
                            <p className="text-lg font-bold text-grappler-100 mt-0.5">{today.maxHeartRate} <span className="text-xs font-normal text-grappler-400">bpm</span></p>
                          </div>
                        )}
                        {whoopBody && whoopBody.weightKg != null && (
                          <div className="bg-grappler-900/50 rounded-lg p-3">
                            <span className="text-xs text-grappler-400 flex items-center gap-1"><Scale className="w-3 h-3" /> Weight</span>
                            <p className="text-lg font-bold text-grappler-100 mt-0.5">{weightUnit === 'kg' ? Math.round(whoopBody.weightKg * 10) / 10 : Math.round(whoopBody.weightKg * 2.20462 * 10) / 10} <span className="text-xs font-normal text-grappler-400">{weightUnit}</span></p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ── 7-DAY TREND ── */}
            {chartData.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="card p-4"
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-grappler-200">7-Day Trend</h3>
                  <span className="text-xs text-grappler-400">
                    Avg <span className={cn('font-medium', recoveryColor(avgRecovery))}>{avgRecovery}%</span>
                  </span>
                </div>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="recoveryGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                        labelStyle={{ color: '#e2e8f0' }}
                        formatter={(value: any) => [`${value}%`, 'Recovery']}
                      />
                      <Area type="monotone" dataKey="recovery" stroke="#22c55e" strokeWidth={2} fill="url(#recoveryGradient)" dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            {/* ── AUTO-ADJUST ── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="card p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <p className="text-sm font-medium text-grappler-100">Auto-adjust workouts</p>
                  <p className="text-xs text-grappler-400 mt-0.5">Scale volume &amp; load based on recovery</p>
                </div>
                <button
                  onClick={() => setAutoAdjust(!autoAdjust)}
                  className={cn('relative w-12 h-7 rounded-full transition-colors duration-200 flex-shrink-0', autoAdjust ? 'bg-green-500' : 'bg-grappler-600')}
                  role="switch"
                  aria-checked={autoAdjust}
                >
                  <motion.div className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md" animate={{ x: autoAdjust ? 20 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                </button>
              </div>
            </motion.div>

            {/* ── RECENT WORKOUTS ── */}
            {whoopWorkouts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h2 className="text-sm font-semibold text-grappler-400 uppercase tracking-wider mb-3">
                  Recent Workouts
                </h2>
                <div className="space-y-2.5">
                  {whoopWorkouts.slice(0, 5).map((w) => {
                    const durationMin = Math.round((new Date(w.end).getTime() - new Date(w.start).getTime()) / 60000);
                    return (
                      <div key={w.id} className="bg-grappler-800 rounded-xl p-3.5">
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-2">
                            <Dumbbell className="w-3.5 h-3.5 text-primary-400" />
                            <span className="text-sm font-medium text-grappler-100">{w.sportName}</span>
                          </div>
                          <span className="text-xs text-grappler-400">
                            {new Date(w.start).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 text-center">
                          <div className="bg-grappler-900/50 rounded-lg py-1.5">
                            <p className={cn('text-sm font-bold', strainColor(w.strain ?? 0))}>{w.strain?.toFixed(1) ?? '--'}</p>
                            <p className="text-xs text-grappler-600">Strain</p>
                          </div>
                          <div className="bg-grappler-900/50 rounded-lg py-1.5">
                            <p className="text-sm font-bold text-grappler-100">{w.calories ?? '--'}</p>
                            <p className="text-xs text-grappler-600">kcal</p>
                          </div>
                          <div className="bg-grappler-900/50 rounded-lg py-1.5">
                            <p className="text-sm font-bold text-grappler-100">{w.avgHR ?? '--'}</p>
                            <p className="text-xs text-grappler-600">Avg HR</p>
                          </div>
                          <div className="bg-grappler-900/50 rounded-lg py-1.5">
                            <p className="text-sm font-bold text-grappler-100">{durationMin}</p>
                            <p className="text-xs text-grappler-600">min</p>
                          </div>
                        </div>
                        {w.zones.length > 0 && (
                          <div className="mt-2.5">
                            <div className="flex h-2 rounded-full overflow-hidden gap-px">
                              {w.zones.map((z) => {
                                const totalMin = w.zones.reduce((s, zn) => s + zn.minutes, 0);
                                const pct = totalMin > 0 ? (z.minutes / totalMin) * 100 : 0;
                                const zoneColors = ['#94a3b8', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#ef4444'];
                                return (
                                  <div key={z.zone} className="rounded-sm" style={{ width: `${pct}%`, backgroundColor: zoneColors[z.zone] || '#666' }} />
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* Not Connected State */}
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-8 text-center"
          >
            <div className="w-16 h-16 mx-auto mb-4 bg-grappler-700 rounded-full flex items-center justify-center">
              <Activity className="w-8 h-8 text-grappler-500" />
            </div>
            <h3 className="text-lg font-semibold text-grappler-200 mb-2">
              Connect Your Whoop
            </h3>
            <p className="text-sm text-grappler-400 mb-6 max-w-xs mx-auto">
              Link your Whoop strap to get real recovery data, strain scores, and
              automatic intensity adjustments based on your actual readiness.
            </p>
            <button onClick={handleConnect} className="btn btn-primary btn-md gap-2">
              <ExternalLink className="w-4 h-4" />
              Connect via Whoop
            </button>

            {/* Other health sources */}
            <div className="mt-6 pt-6 border-t border-slate-700/50">
              <p className="text-xs text-grappler-400 mb-4">
                Or import from other sources:
              </p>
              <HealthImport compact />
            </div>

            <p className="text-xs text-grappler-600 mt-4">
              You can also enter data manually using the settings icon above
            </p>
          </motion.div>
        )}

        {/* Manual Entry */}
        <AnimatePresence>
          {showManualEntry && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="card p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-grappler-200">Manual Entry</h3>
                  <button
                    onClick={() => setShowManualEntry(false)}
                    className="text-grappler-500 hover:text-grappler-300"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-grappler-400">
                  Log your metrics manually if you prefer not to connect your device.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-grappler-400 mb-1 block">
                      Recovery (0-100)
                    </label>
                    <input
                      type="number" inputMode="decimal" enterKeyHint="done"
                      min={0}
                      max={100}
                      placeholder="76"
                      value={manualRecovery}
                      onChange={(e) => setManualRecovery(e.target.value)}
                      className="input text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-grappler-400 mb-1 block">HRV (ms)</label>
                    <input
                      type="number" inputMode="decimal" enterKeyHint="done"
                      min={0}
                      placeholder="58"
                      value={manualHRV}
                      onChange={(e) => setManualHRV(e.target.value)}
                      className="input text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-grappler-400 mb-1 block">
                      Resting HR (bpm)
                    </label>
                    <input
                      type="number" inputMode="decimal" enterKeyHint="done"
                      min={0}
                      placeholder="54"
                      value={manualRHR}
                      onChange={(e) => setManualRHR(e.target.value)}
                      className="input text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-grappler-400 mb-1 block">Sleep (hrs)</label>
                    <input
                      type="number" inputMode="decimal" enterKeyHint="done"
                      min={0}
                      step={0.1}
                      placeholder="7.5"
                      value={manualSleepHours}
                      onChange={(e) => setManualSleepHours(e.target.value)}
                      className="input text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-grappler-400 mb-1 block">
                      Strain (0-21)
                    </label>
                    <input
                      type="number" inputMode="decimal" enterKeyHint="done"
                      min={0}
                      max={21}
                      step={0.1}
                      placeholder="14.5"
                      value={manualStrain}
                      onChange={(e) => setManualStrain(e.target.value)}
                      className="input text-sm"
                    />
                  </div>
                </div>

                <button
                  onClick={handleManualSubmit}
                  className="btn btn-primary btn-sm w-full"
                >
                  Save Entry
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
