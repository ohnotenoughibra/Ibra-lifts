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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WearableData, WearableProvider } from '@/lib/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LS_KEYS = {
  accessToken: 'whoop_access_token',
  refreshToken: 'whoop_refresh_token',
  tokenExpires: 'whoop_token_expires',
  oauthState: 'whoop_oauth_state',
} as const;

/** Buffer before expiry to trigger proactive refresh (5 minutes) */
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

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
  if (strain >= 14) return 'text-orange-400';
  if (strain >= 10) return 'text-yellow-400';
  return 'text-blue-400';
}

function trendIcon(current: number, previous: number) {
  if (current > previous) return <TrendingUp className="w-3.5 h-3.5 text-green-400" />;
  if (current < previous) return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-grappler-500" />;
}

/** Check if the stored access token is expired or about to expire */
function isTokenExpired(): boolean {
  try {
    const expiresStr = localStorage.getItem(LS_KEYS.tokenExpires);
    if (!expiresStr) return true;
    const expiresAt = parseInt(expiresStr, 10);
    if (isNaN(expiresAt)) return true;
    return Date.now() >= expiresAt - TOKEN_EXPIRY_BUFFER_MS;
  } catch {
    return true;
  }
}

/** Read a token from localStorage safely */
function getToken(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Store a token in localStorage safely */
function setToken(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch { /* best effort */ }
}

/** Clear all Whoop tokens from localStorage */
function clearTokens(): void {
  try {
    localStorage.removeItem(LS_KEYS.accessToken);
    localStorage.removeItem(LS_KEYS.refreshToken);
    localStorage.removeItem(LS_KEYS.tokenExpires);
    localStorage.removeItem(LS_KEYS.oauthState);
  } catch { /* best effort */ }
}

// ---------------------------------------------------------------------------
// Transform Whoop API data into our WearableData format
// ---------------------------------------------------------------------------

interface WhoopApiResponse {
  connected: boolean;
  profile?: any;
  recovery?: any[];
  cycles?: any[];
  sleep?: any[];
  workouts?: any[];
  body?: any;
  lastSync?: string;
  error?: string;
  requiresReconnect?: boolean;
  // Inline token refresh — no second round-trip needed
  new_access_token?: string;
  new_refresh_token?: string;
  new_expires_in?: number;
  warnings?: string[];
}

function transformWhoopData(apiData: WhoopApiResponse): WearableData[] {
  const dataMap = new Map<string, Partial<WearableData>>();

  // Process cycles (strain, calories)
  if (apiData.cycles) {
    for (const cycle of apiData.cycles) {
      const dateKey = cycle.start?.substring(0, 10);
      if (!dateKey) continue;
      const existing = dataMap.get(dateKey) || {};
      dataMap.set(dateKey, {
        ...existing,
        id: cycle.id?.toString() || dateKey,
        date: new Date(cycle.start),
        provider: 'whoop' as WearableProvider,
        strain: cycle.score?.strain ?? null,
        caloriesBurned: cycle.score?.kilojoule
          ? Math.round(cycle.score.kilojoule * 0.239006)
          : null,
      });
    }
  }

  // Process recovery (recovery score, HRV, resting HR, resp rate, skin temp)
  if (apiData.recovery) {
    for (const rec of apiData.recovery) {
      const dateKey = rec.created_at?.substring(0, 10) || rec.cycle?.start?.substring(0, 10);
      if (!dateKey) continue;
      const existing = dataMap.get(dateKey) || {};
      dataMap.set(dateKey, {
        ...existing,
        id: existing.id || rec.cycle_id?.toString() || dateKey,
        date: existing.date || new Date(dateKey),
        provider: 'whoop' as WearableProvider,
        recoveryScore: rec.score?.recovery_score ?? null,
        hrv: rec.score?.hrv_rmssd_milli
          ? Math.round(rec.score.hrv_rmssd_milli)
          : null,
        restingHR: rec.score?.resting_heart_rate
          ? Math.round(rec.score.resting_heart_rate)
          : null,
        respiratoryRate: rec.score?.respiratory_rate ?? null,
        skinTemp: rec.score?.skin_temp_celsius != null
          ? Math.round((rec.score.skin_temp_celsius * 9 / 5) * 10) / 10
          : null,
      });
    }
  }

  // Process sleep
  if (apiData.sleep) {
    for (const sl of apiData.sleep) {
      const dateKey = sl.start?.substring(0, 10);
      if (!dateKey) continue;
      const existing = dataMap.get(dateKey) || {};
      const totalSleepMs = sl.score?.stage_summary?.total_in_bed_time_milli ?? 0;
      const sleepHours = totalSleepMs > 0
        ? Math.round((totalSleepMs / 3600000) * 10) / 10
        : null;

      dataMap.set(dateKey, {
        ...existing,
        date: existing.date || new Date(dateKey),
        provider: 'whoop' as WearableProvider,
        sleepScore: sl.score?.sleep_performance_percentage ?? null,
        sleepHours,
      });
    }
  }

  return Array.from(dataMap.values())
    .filter((d): d is WearableData => d.date != null && d.id != null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WearableIntegration({ onClose }: WearableIntegrationProps) {
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
  const fetchInFlight = useRef(false);

  // ------------------------------------------------------------------
  // Core data fetcher — handles token refresh inline
  // ------------------------------------------------------------------
  const fetchWhoopData = useCallback(async () => {
    // Prevent concurrent fetches
    if (fetchInFlight.current) return;
    fetchInFlight.current = true;

    const accessToken = getToken(LS_KEYS.accessToken);
    const refreshToken = getToken(LS_KEYS.refreshToken);

    if (!accessToken) {
      setIsConnected(false);
      setIsLoading(false);
      fetchInFlight.current = false;
      return;
    }

    try {
      setIsSyncing(true);
      setError(null);

      const res = await fetch('/api/whoop/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        }),
      });

      // Handle non-JSON responses (e.g., 502 from Vercel)
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Server returned ${res.status}. Please try again.`);
      }

      const data: WhoopApiResponse = await res.json();

      // --- Handle inline token refresh ---
      // The server refreshed our token and still returned data — update localStorage
      if (data.new_access_token) {
        setToken(LS_KEYS.accessToken, data.new_access_token);
        if (data.new_refresh_token) {
          setToken(LS_KEYS.refreshToken, data.new_refresh_token);
        }
        if (data.new_expires_in) {
          setToken(LS_KEYS.tokenExpires, String(Date.now() + data.new_expires_in * 1000));
        }
      }

      // --- Handle response ---
      if (data.connected) {
        setIsConnected(true);
        setWhoopProfile(data.profile);
        setWearableData(transformWhoopData(data));
        setLastSync(new Date());

        // Show warnings if some endpoints had issues (partial data)
        if (data.warnings && data.warnings.length > 0) {
          setError(`Some data unavailable: ${data.warnings[0]}`);
        }
      } else {
        // Connection failed
        setIsConnected(false);

        if (data.requiresReconnect) {
          // Tokens are dead — clear everything and show reconnect prompt
          clearTokens();
          setError(data.error || 'Session expired. Please reconnect your Whoop.');
        } else if (data.error) {
          setError(data.error);
        }
      }
    } catch (err: any) {
      setIsConnected(false);
      setError(`Failed to fetch Whoop data: ${err.message || 'network error'}`);
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
      setError(`Whoop connection failed: ${decodeURIComponent(rawError)}`);
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
  // Derived data
  // ------------------------------------------------------------------
  const today = wearableData.length > 0 ? wearableData[wearableData.length - 1] : null;
  const yesterday = wearableData.length >= 2 ? wearableData[wearableData.length - 2] : null;

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
    window.location.href = '/api/whoop/auth';
  };

  const handleDisconnect = () => {
    clearTokens();
    setIsConnected(false);
    setWearableData([]);
    setWhoopProfile(null);
    setLastSync(null);
    setError(null);
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

  const strainPct = today?.strain != null ? Math.min((today.strain / 21) * 100, 100) : 0;

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
      className="min-h-screen bg-grappler-900 bg-mesh pb-20"
    >
      {/* Header */}
      <header className="sticky top-0 z-40 bg-grappler-900/80 backdrop-blur-xl border-b border-grappler-800">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="btn btn-ghost btn-sm p-1">
              <ChevronLeft className="w-5 h-5 text-grappler-200" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <h1 className="font-bold text-grappler-50 text-lg leading-tight">Whoop</h1>
                <p className="text-xs text-grappler-500">
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
                <p className="text-xs text-grappler-500">
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

        {/* Today's Metrics */}
        {isConnected && today && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-sm font-semibold text-grappler-400 uppercase tracking-wider mb-3">
                Today&apos;s Metrics
              </h2>

              <div className="grid grid-cols-2 gap-3">
                {/* Recovery Score */}
                <div
                  className={cn(
                    'bg-grappler-800 rounded-xl p-4 border col-span-2',
                    recoveryBorder(today.recoveryScore ?? 0),
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-grappler-400 flex items-center gap-1.5">
                      <Battery className="w-4 h-4" />
                      Recovery
                    </span>
                    <span
                      className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded-full',
                        recoveryBg(today.recoveryScore ?? 0),
                        recoveryColor(today.recoveryScore ?? 0),
                      )}
                    >
                      {recoveryLabel(today.recoveryScore ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-end gap-2">
                    <span
                      className={cn(
                        'text-4xl font-bold',
                        recoveryColor(today.recoveryScore ?? 0),
                      )}
                    >
                      {today.recoveryScore ?? '--'}
                    </span>
                    <span className="text-grappler-500 text-sm pb-1">/ 100</span>
                  </div>
                  <div className="mt-3 h-2 bg-grappler-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${today.recoveryScore ?? 0}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={cn(
                        'h-full rounded-full',
                        (today.recoveryScore ?? 0) >= 67
                          ? 'bg-gradient-to-r from-green-500 to-green-400'
                          : (today.recoveryScore ?? 0) >= 34
                            ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                            : 'bg-gradient-to-r from-red-500 to-red-400',
                      )}
                    />
                  </div>
                </div>

                {/* Strain */}
                <div className="bg-grappler-800 rounded-xl p-4">
                  <span className="text-sm text-grappler-400 flex items-center gap-1.5 mb-2">
                    <Zap className="w-4 h-4" />
                    Strain
                  </span>
                  <p className={cn('text-2xl font-bold', strainColor(today.strain ?? 0))}>
                    {today.strain?.toFixed(1) ?? '--'}
                  </p>
                  <span className="text-xs text-grappler-500">/ 21.0</span>
                  <div className="mt-2 h-1.5 bg-grappler-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${strainPct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 via-yellow-400 to-red-500"
                    />
                  </div>
                </div>

                {/* HRV */}
                <div className="bg-grappler-800 rounded-xl p-4">
                  <span className="text-sm text-grappler-400 flex items-center gap-1.5 mb-2">
                    <Activity className="w-4 h-4" />
                    HRV
                  </span>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-grappler-50">
                      {today.hrv ?? '--'}
                    </p>
                    {yesterday?.hrv != null &&
                      today.hrv != null &&
                      trendIcon(today.hrv, yesterday.hrv)}
                  </div>
                  <span className="text-xs text-grappler-500">ms</span>
                </div>

                {/* Resting HR */}
                <div className="bg-grappler-800 rounded-xl p-4">
                  <span className="text-sm text-grappler-400 flex items-center gap-1.5 mb-2">
                    <Heart className="w-4 h-4" />
                    Resting HR
                  </span>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-grappler-50">
                      {today.restingHR ?? '--'}
                    </p>
                    {yesterday?.restingHR != null &&
                      today.restingHR != null &&
                      trendIcon(yesterday.restingHR, today.restingHR)}
                  </div>
                  <span className="text-xs text-grappler-500">bpm</span>
                </div>

                {/* Sleep */}
                <div className="bg-grappler-800 rounded-xl p-4">
                  <span className="text-sm text-grappler-400 flex items-center gap-1.5 mb-2">
                    <Moon className="w-4 h-4" />
                    Sleep
                  </span>
                  <p className="text-2xl font-bold text-grappler-50">
                    {today.sleepScore ?? '--'}
                  </p>
                  <span className="text-xs text-grappler-500">
                    {today.sleepHours != null
                      ? `${today.sleepHours.toFixed(1)} hrs`
                      : '-- hrs'}
                  </span>
                </div>

                {/* Respiratory Rate */}
                <div className="bg-grappler-800 rounded-xl p-4">
                  <span className="text-sm text-grappler-400 flex items-center gap-1.5 mb-2">
                    <Wind className="w-4 h-4" />
                    Resp. Rate
                  </span>
                  <p className="text-2xl font-bold text-grappler-50">
                    {today.respiratoryRate?.toFixed(1) ?? '--'}
                  </p>
                  <span className="text-xs text-grappler-500">rpm</span>
                </div>

                {/* Skin Temp */}
                <div className="bg-grappler-800 rounded-xl p-4">
                  <span className="text-sm text-grappler-400 flex items-center gap-1.5 mb-2">
                    <Thermometer className="w-4 h-4" />
                    Skin Temp
                  </span>
                  <p className="text-2xl font-bold text-grappler-50">
                    {today.skinTemp != null
                      ? `${today.skinTemp >= 0 ? '+' : ''}${today.skinTemp.toFixed(1)}`
                      : '--'}
                  </p>
                  <span className="text-xs text-grappler-500">&deg;F deviation</span>
                </div>

                {/* Calories */}
                <div className="bg-grappler-800 rounded-xl p-4">
                  <span className="text-sm text-grappler-400 flex items-center gap-1.5 mb-2">
                    <Zap className="w-4 h-4" />
                    Calories
                  </span>
                  <p className="text-2xl font-bold text-grappler-50">
                    {today.caloriesBurned?.toLocaleString() ?? '--'}
                  </p>
                  <span className="text-xs text-grappler-500">kcal</span>
                </div>
              </div>
            </motion.div>

            {/* 7-Day Recovery Trend */}
            {chartData.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="card p-4"
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-grappler-200">
                    7-Day Recovery Trend
                  </h3>
                  <span className="text-xs text-grappler-500">
                    Avg:{' '}
                    <span className={cn('font-medium', recoveryColor(avgRecovery))}>
                      {avgRecovery}%
                    </span>
                  </span>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="recoveryGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="day"
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        labelStyle={{ color: '#e2e8f0' }}
                        formatter={(value: any) => [`${value}%`, 'Recovery']}
                      />
                      <Area
                        type="monotone"
                        dataKey="recovery"
                        stroke="#22c55e"
                        strokeWidth={2}
                        fill="url(#recoveryGradient)"
                        dot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }}
                        activeDot={{
                          r: 6,
                          fill: '#22c55e',
                          stroke: '#fff',
                          strokeWidth: 2,
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

            {/* Training Readiness */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={cn('card p-4 border', readiness.bg)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{readiness.icon}</div>
                <div>
                  <h3 className={cn('font-semibold text-sm', readiness.accent)}>
                    {readiness.title}
                  </h3>
                  <p className="text-sm text-grappler-300 mt-1 leading-relaxed">
                    {readiness.message}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Auto-Adjust Toggle */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="card p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <p className="text-sm font-medium text-grappler-100">
                    Auto-adjust workout intensity
                  </p>
                  <p className="text-xs text-grappler-500 mt-0.5">
                    Automatically scale volume and load based on your recovery score
                  </p>
                </div>
                <button
                  onClick={() => setAutoAdjust(!autoAdjust)}
                  className={cn(
                    'relative w-12 h-7 rounded-full transition-colors duration-200 flex-shrink-0',
                    autoAdjust ? 'bg-green-500' : 'bg-grappler-600',
                  )}
                  role="switch"
                  aria-checked={autoAdjust}
                >
                  <motion.div
                    className="absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md"
                    animate={{ x: autoAdjust ? 20 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
            </motion.div>
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
                <p className="text-xs text-grappler-500">
                  Log your metrics manually if you prefer not to connect your device.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-grappler-400 mb-1 block">
                      Recovery (0-100)
                    </label>
                    <input
                      type="number"
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
                      type="number"
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
                      type="number"
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
                      type="number"
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
                      type="number"
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
