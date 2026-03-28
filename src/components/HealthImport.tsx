'use client';

// ---------------------------------------------------------------------------
// HealthImport — Apple Health & Google Fit integration UI
// ---------------------------------------------------------------------------
// Provides two integration paths:
//   1. Google Fit: OAuth2 flow (proper web API)
//   2. Apple Health: XML file upload (Health app export)
//
// Both map to the same WearableData interface and feed into the readiness/
// recovery scoring system alongside Whoop data.
// ---------------------------------------------------------------------------

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Activity,
  Heart,
  Moon,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { parseAppleHealthXML, mapGoogleFitToWearableData } from '@/lib/health-import';
import type { WearableData } from '@/lib/types';

// ---------------------------------------------------------------------------
// Google Fit localStorage keys
// ---------------------------------------------------------------------------
const GFIT_LS_KEYS = {
  accessToken: 'gfit_access_token',
  refreshToken: 'gfit_refresh_token',
  tokenExpires: 'gfit_token_expires',
  oauthState: 'gfit_oauth_state',
  lastFetch: 'gfit_last_fetch',
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface HealthImportProps {
  /** Callback after data is imported (e.g., to close modal) */
  onImportComplete?: (data: WearableData[]) => void;
  /** Compact mode for embedding inside WearableIntegration */
  compact?: boolean;
}

type ImportSource = 'apple_health' | 'google_fit';
type ImportStatus = 'idle' | 'loading' | 'success' | 'error';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function HealthImport({ onImportComplete, compact }: HealthImportProps) {
  const [activeSource, setActiveSource] = useState<ImportSource | null>(null);
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [importedData, setImportedData] = useState<WearableData[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setLatestWhoopData = useAppStore((s) => s.setLatestWhoopData);
  const setWearableHistory = useAppStore((s) => s.setWearableHistory);

  // ── Store imported data in the app ──────────────────────────────────────
  const commitData = useCallback(
    (data: WearableData[]) => {
      if (data.length === 0) return;

      // Merge with existing wearable history (don't overwrite Whoop data)
      const existingHistory = useAppStore.getState().wearableHistory;
      const existingDates = new Set(
        existingHistory
          .filter((d) => d.provider === 'whoop')
          .map((d) => new Date(d.date).toISOString().substring(0, 10))
      );

      // Only add days that don't already have Whoop data (Whoop takes priority)
      const newEntries = data.filter(
        (d) => !existingDates.has(new Date(d.date).toISOString().substring(0, 10))
      );

      const merged = [...existingHistory, ...newEntries].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      setWearableHistory(merged);

      // Update latest data if today has new data and no Whoop data
      const todayKey = new Date().toISOString().substring(0, 10);
      const todayEntry = newEntries.find(
        (d) => new Date(d.date).toISOString().substring(0, 10) === todayKey
      );
      const existingToday = useAppStore.getState().latestWhoopData;
      if (todayEntry && (!existingToday || existingToday.provider !== 'whoop')) {
        setLatestWhoopData(todayEntry);
      }

      setImportedData(data);
      onImportComplete?.(data);
    },
    [setLatestWhoopData, setWearableHistory, onImportComplete]
  );

  // ── Google Fit OAuth ────────────────────────────────────────────────────
  const handleGoogleFitConnect = useCallback(async () => {
    setActiveSource('google_fit');
    setStatus('loading');
    setStatusMessage('Preparing Google Fit connection...');

    try {
      const res = await fetch('/api/google-fit?action=auth-url');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to get auth URL');
      }

      const { url, state } = await res.json();

      // Store state for CSRF validation
      try {
        localStorage.setItem(GFIT_LS_KEYS.oauthState, state);
      } catch { /* best effort */ }

      // Redirect to Google OAuth
      window.location.href = url;
    } catch (err: unknown) {
      setStatus('error');
      setStatusMessage(err instanceof Error ? err.message : 'Failed to connect to Google Fit');
    }
  }, []);

  // ── Google Fit data fetch ───────────────────────────────────────────────
  const handleGoogleFitSync = useCallback(async () => {
    setActiveSource('google_fit');
    setStatus('loading');
    setStatusMessage('Fetching Google Fit data...');

    try {
      let accessToken = localStorage.getItem(GFIT_LS_KEYS.accessToken) || '';
      const refreshToken = localStorage.getItem(GFIT_LS_KEYS.refreshToken) || '';
      const expiresAt = localStorage.getItem(GFIT_LS_KEYS.tokenExpires) || '0';

      // Refresh token if expired
      if (accessToken && parseInt(expiresAt) < Date.now() && refreshToken) {
        const refreshRes = await fetch('/api/google-fit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          accessToken = refreshData.access_token;
          localStorage.setItem(GFIT_LS_KEYS.accessToken, accessToken);
          localStorage.setItem(
            GFIT_LS_KEYS.tokenExpires,
            String(Date.now() + (refreshData.expires_in || 3600) * 1000)
          );
        } else {
          throw new Error('Session expired. Please reconnect Google Fit.');
        }
      }

      if (!accessToken) {
        throw new Error('Not connected to Google Fit. Please connect first.');
      }

      const res = await fetch('/api/google-fit?action=data', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          // Clear stale tokens
          localStorage.removeItem(GFIT_LS_KEYS.accessToken);
          localStorage.removeItem(GFIT_LS_KEYS.refreshToken);
          localStorage.removeItem(GFIT_LS_KEYS.tokenExpires);
          throw new Error('Google Fit session expired. Please reconnect.');
        }
        throw new Error('Failed to fetch Google Fit data.');
      }

      const data = await res.json();
      if (!data.connected || !data.days?.length) {
        throw new Error('No data available from Google Fit.');
      }

      const wearableData = mapGoogleFitToWearableData(data.days);
      commitData(wearableData);

      localStorage.setItem(GFIT_LS_KEYS.lastFetch, String(Date.now()));
      setStatus('success');
      setStatusMessage(`Imported ${wearableData.length} days from Google Fit`);
    } catch (err: unknown) {
      setStatus('error');
      setStatusMessage(err instanceof Error ? err.message : 'Failed to sync Google Fit data');
    }
  }, [commitData]);

  // ── Apple Health XML import ─────────────────────────────────────────────
  const handleAppleHealthImport = useCallback(
    async (file: File) => {
      setActiveSource('apple_health');
      setStatus('loading');
      setStatusMessage('Parsing Apple Health export...');

      try {
        // Validate file
        if (!file.name.endsWith('.xml') && !file.name.endsWith('.zip')) {
          throw new Error('Please upload the export.xml file from your Apple Health data export.');
        }

        if (file.size > 500 * 1024 * 1024) {
          throw new Error('File is too large. Try exporting a shorter date range.');
        }

        // Read XML content
        const text = await file.text();

        if (!text.includes('HealthData') && !text.includes('Record')) {
          throw new Error(
            'This does not look like an Apple Health export. ' +
            'Go to Health app > Profile > Export All Health Data.'
          );
        }

        setStatusMessage('Extracting health metrics (this may take a moment)...');

        // Parse in next microtask to allow UI update
        await new Promise((resolve) => setTimeout(resolve, 50));

        const wearableData = parseAppleHealthXML(text, 7);

        if (wearableData.length === 0) {
          throw new Error('No recent health data found in the export. Make sure you have data from the last 7 days.');
        }

        commitData(wearableData);
        setStatus('success');
        setStatusMessage(`Imported ${wearableData.length} days from Apple Health`);
      } catch (err: unknown) {
        setStatus('error');
        setStatusMessage(err instanceof Error ? err.message : 'Failed to parse Apple Health export');
      }
    },
    [commitData]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleAppleHealthImport(file);
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [handleAppleHealthImport]
  );

  // ── Check if Google Fit is connected ────────────────────────────────────
  const isGoogleFitConnected =
    typeof window !== 'undefined' && !!localStorage.getItem(GFIT_LS_KEYS.accessToken);

  const handleGoogleFitDisconnect = useCallback(() => {
    localStorage.removeItem(GFIT_LS_KEYS.accessToken);
    localStorage.removeItem(GFIT_LS_KEYS.refreshToken);
    localStorage.removeItem(GFIT_LS_KEYS.tokenExpires);
    localStorage.removeItem(GFIT_LS_KEYS.lastFetch);
    setStatus('idle');
    setStatusMessage('');
    setImportedData([]);
  }, []);

  // ── Check for OAuth callback on mount ───────────────────────────────────
  // (handled by the API route's HTML page, which stores tokens in localStorage)

  // ── Detect redirect from Google Fit callback ────────────────────────────
  const [hasCheckedCallback, setHasCheckedCallback] = useState(false);
  if (!hasCheckedCallback && typeof window !== 'undefined') {
    setHasCheckedCallback(true);
    const params = new URLSearchParams(window.location.search);
    if (params.get('gfit_connected') === 'true') {
      // Auto-sync after successful OAuth
      setTimeout(() => handleGoogleFitSync(), 500);
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete('gfit_connected');
      window.history.replaceState({}, '', url.toString());
    }
    if (params.get('gfit_error')) {
      setStatus('error');
      setStatusMessage(decodeURIComponent(params.get('gfit_error') || 'Connection failed'));
      setActiveSource('google_fit');
      const url = new URL(window.location.href);
      url.searchParams.delete('gfit_error');
      window.history.replaceState({}, '', url.toString());
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className={cn('space-y-4', compact && 'space-y-3')}>
      {/* Header */}
      {!compact && (
        <div className="text-center">
          <h3 className="text-lg font-semibold text-slate-200">
            Health Data Import
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Connect Google Fit or import Apple Health data
          </p>
        </div>
      )}

      {/* Source Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {/* Google Fit */}
        <button
          onClick={isGoogleFitConnected ? handleGoogleFitSync : handleGoogleFitConnect}
          disabled={status === 'loading'}
          className={cn(
            'relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
            'hover:border-blue-500/50 hover:bg-blue-500/5',
            isGoogleFitConnected
              ? 'border-green-500/30 bg-green-500/5'
              : 'border-slate-700 bg-slate-800/50',
            status === 'loading' && activeSource === 'google_fit' && 'opacity-60 pointer-events-none'
          )}
        >
          {isGoogleFitConnected && (
            <div className="absolute top-2 right-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
            </div>
          )}
          <div className="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center">
            {status === 'loading' && activeSource === 'google_fit' ? (
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            ) : (
              <Activity className="w-5 h-5 text-blue-400" />
            )}
          </div>
          <span className="text-sm font-medium text-slate-200">
            {isGoogleFitConnected ? 'Sync Google Fit' : 'Connect Google Fit'}
          </span>
          <span className="text-xs text-slate-500">
            {isGoogleFitConnected ? 'Tap to refresh data' : 'OAuth2 connection'}
          </span>
          {isGoogleFitConnected && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleGoogleFitDisconnect();
              }}
              className="text-xs text-red-400/60 hover:text-red-400 mt-1"
            >
              Disconnect
            </button>
          )}
        </button>

        {/* Apple Health */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={status === 'loading'}
          className={cn(
            'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
            'hover:border-pink-500/50 hover:bg-pink-500/5',
            'border-slate-700 bg-slate-800/50',
            status === 'loading' && activeSource === 'apple_health' && 'opacity-60 pointer-events-none'
          )}
        >
          <div className="w-10 h-10 rounded-full bg-pink-500/15 flex items-center justify-center">
            {status === 'loading' && activeSource === 'apple_health' ? (
              <Loader2 className="w-5 h-5 text-pink-400 animate-spin" />
            ) : (
              <Upload className="w-5 h-5 text-pink-400" />
            )}
          </div>
          <span className="text-sm font-medium text-slate-200">
            Import Apple Health
          </span>
          <span className="text-xs text-slate-500">
            Upload export.xml
          </span>
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xml"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Status Message */}
      <AnimatePresence mode="wait">
        {status !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border text-sm',
              status === 'loading' && 'border-slate-600 bg-slate-800/50 text-slate-300',
              status === 'success' && 'border-green-500/30 bg-green-500/5 text-green-400',
              status === 'error' && 'border-red-500/30 bg-red-500/5 text-red-400'
            )}
          >
            {status === 'loading' && <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />}
            {status === 'success' && <CheckCircle className="w-4 h-4 flex-shrink-0" />}
            {status === 'error' && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span className="flex-1">{statusMessage}</span>
            {status !== 'loading' && (
              <button
                onClick={() => { setStatus('idle'); setStatusMessage(''); }}
                className="p-0.5 hover:bg-slate-700 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Imported Data Summary */}
      {importedData.length > 0 && status === 'success' && (
        <div className="space-y-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300"
          >
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            View imported data ({importedData.length} days)
          </button>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {importedData
                    .slice()
                    .reverse()
                    .map((day) => {
                      const dateStr = new Date(day.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      });
                      return (
                        <div
                          key={day.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50"
                        >
                          <span className="text-sm font-medium text-slate-300">{dateStr}</span>
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            {day.sleepHours != null && (
                              <span className="flex items-center gap-1">
                                <Moon className="w-3 h-3" />
                                {day.sleepHours}h
                              </span>
                            )}
                            {day.restingHR != null && (
                              <span className="flex items-center gap-1">
                                <Heart className="w-3 h-3" />
                                {day.restingHR}
                              </span>
                            )}
                            {day.hrv != null && (
                              <span className="flex items-center gap-1">
                                <Activity className="w-3 h-3" />
                                {day.hrv}ms
                              </span>
                            )}
                            {day.recoveryScore != null && (
                              <span
                                className={cn(
                                  'font-medium px-1.5 py-0.5 rounded',
                                  day.recoveryScore >= 67
                                    ? 'text-green-400 bg-green-500/10'
                                    : day.recoveryScore >= 34
                                      ? 'text-yellow-400 bg-yellow-500/10'
                                      : 'text-red-400 bg-red-500/10'
                                )}
                              >
                                {day.recoveryScore}%
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Apple Health Instructions */}
      {!compact && (
        <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
          <p className="text-xs text-slate-500 leading-relaxed">
            <strong className="text-slate-400">Apple Health:</strong> Open the Health app on your
            iPhone, tap your profile picture, then &quot;Export All Health Data.&quot; Upload the
            resulting <code className="text-pink-400/80">export.xml</code> file here. Data stays
            on your device and is never sent to our servers.
          </p>
        </div>
      )}
    </div>
  );
}
