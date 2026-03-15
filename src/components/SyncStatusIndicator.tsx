'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Smartphone,
  Monitor,
  Tablet,
  Loader2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import type { SyncStatus } from '@/lib/useDbSync';

interface SyncStatusIndicatorProps {
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  deviceType: 'phone' | 'tablet' | 'desktop';
  isAuthenticated: boolean;
  onForceSync: () => void;
  syncFailureCount?: number;
}

interface ServerCounts {
  meals: number;
  workouts: number;
  lastDevice: string | null;
  serverUpdatedAt: string | null;
}

function getRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

const DeviceIcon = {
  phone: Smartphone,
  tablet: Tablet,
  desktop: Monitor,
} as const;

export default function SyncStatusIndicator({
  syncStatus,
  lastSyncedAt,
  deviceType,
  isAuthenticated,
  onForceSync,
  syncFailureCount = 0,
}: SyncStatusIndicatorProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [serverCounts, setServerCounts] = useState<ServerCounts | null>(null);
  const [fetchingServer, setFetchingServer] = useState(false);

  const localCounts = useCallback(() => {
    const s = useAppStore.getState();
    return {
      meals: (s.meals ?? []).filter(m => !m._deleted).length,
      workouts: (s.workoutLogs ?? []).filter(w => !w._deleted).length,
    };
  }, []);

  // Fetch server counts when popup opens
  useEffect(() => {
    if (!showDetail) return;
    setFetchingServer(true);
    fetch('/api/debug/sync-status')
      .then(r => r.json())
      .then(data => {
        if (data.counts) {
          setServerCounts({
            meals: data.counts.meals ?? 0,
            workouts: data.counts.workoutLogs ?? 0,
            lastDevice: data._lastDevice ?? null,
            serverUpdatedAt: data.serverUpdatedAt ?? null,
          });
        }
      })
      .catch(() => setServerCounts(null))
      .finally(() => setFetchingServer(false));
  }, [showDetail]);

  const handleForceSync = useCallback(() => {
    const syncPromise = onForceSync();
    Promise.resolve(syncPromise).then(() => {
      // Re-fetch server counts after sync
      fetch('/api/debug/sync-status')
        .then(r => r.json())
        .then(data => {
          if (data.counts) {
            setServerCounts({
              meals: data.counts.meals ?? 0,
              workouts: data.counts.workoutLogs ?? 0,
              lastDevice: data._lastDevice ?? null,
              serverUpdatedAt: data.serverUpdatedAt ?? null,
            });
          }
        })
        .catch(() => {});
    }).catch(() => {});
  }, [onForceSync]);

  if (!isAuthenticated) return null;

  const CurrentDeviceIcon = DeviceIcon[deviceType];
  const local = showDetail ? localCounts() : null;

  const statusConfig = {
    idle: { dot: 'bg-green-400', label: 'Synced' },
    syncing: { dot: 'bg-blue-400 animate-pulse', label: 'Syncing...' },
    success: { dot: 'bg-green-400', label: 'Synced' },
    error: { dot: 'bg-red-400', label: 'Sync error' },
    offline: { dot: 'bg-yellow-400', label: 'Offline' },
  };

  const config = statusConfig[syncStatus];

  const hasMismatch = local && serverCounts &&
    (local.meals !== serverCounts.meals || local.workouts !== serverCounts.workouts);

  return (
    <>
      {/* Compact badge — tappable */}
      <button
        onClick={() => setShowDetail(true)}
        className="flex items-center gap-1 bg-grappler-800/60 hover:bg-grappler-800 border border-grappler-700/50 rounded-full px-1.5 py-1 transition-colors"
        title={lastSyncedAt ? getRelativeTime(lastSyncedAt) : config.label}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', config.dot)} />
        {syncStatus === 'syncing' ? (
          <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
        ) : syncStatus === 'offline' ? (
          <CloudOff className="w-3 h-3 text-yellow-400" />
        ) : (
          <Cloud className="w-3 h-3 text-grappler-400" />
        )}
      </button>

      {/* Detail popup */}
      <AnimatePresence>
        {showDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
            role="dialog"
            aria-modal="true"
            aria-label="Cloud sync status"
            onClick={() => setShowDetail(false)}
            onTouchEnd={(e) => { if (e.target === e.currentTarget) setShowDetail(false); }}
            onKeyDown={(e) => { if (e.key === 'Escape') setShowDetail(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm max-h-[70vh] overflow-y-auto bg-grappler-900 border border-grappler-700 rounded-2xl"
            >
              {/* Header */}
              <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-primary-400" />
                  <h3 className="text-sm font-semibold text-grappler-100">Cloud Sync</h3>
                </div>
                <button onClick={() => setShowDetail(false)} className="p-1.5 -mr-1 text-grappler-500 hover:text-grappler-300">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status + comparison */}
              <div className="px-4 pb-3 space-y-3">
                {/* Status row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={cn('w-2 h-2 rounded-full', config.dot)} />
                    <span className={cn(
                      'text-xs font-medium',
                      syncStatus === 'error' ? 'text-red-400' :
                      syncStatus === 'offline' ? 'text-yellow-400' :
                      syncStatus === 'syncing' ? 'text-blue-400' :
                      'text-green-400'
                    )}>
                      {config.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-grappler-400">
                    {lastSyncedAt && <span>{getRelativeTime(lastSyncedAt)}</span>}
                    <div className="flex items-center gap-1">
                      <CurrentDeviceIcon className="w-3 h-3" />
                      <span className="capitalize">{deviceType}</span>
                    </div>
                  </div>
                </div>

                {syncFailureCount >= 3 && (
                  <p className="text-xs text-red-400">
                    Sync failed {syncFailureCount}x — tap Sync Now to retry
                  </p>
                )}

                {/* Local vs Server comparison */}
                {local && (
                  <div className="bg-grappler-800/50 rounded-xl p-3 space-y-1.5">
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      <span className="text-grappler-500"></span>
                      <span className="text-grappler-400 text-center">This device</span>
                      <span className="text-grappler-400 text-center">Server</span>

                      <span className="text-grappler-400">Meals</span>
                      <span className="text-grappler-200 text-center font-medium">{local.meals}</span>
                      <span className={cn('text-center font-medium', fetchingServer ? 'text-grappler-500' :
                        serverCounts && serverCounts.meals !== local.meals ? 'text-yellow-400' : 'text-grappler-200'
                      )}>
                        {fetchingServer ? '...' : serverCounts ? serverCounts.meals : '—'}
                      </span>

                      <span className="text-grappler-400">Workouts</span>
                      <span className="text-grappler-200 text-center font-medium">{local.workouts}</span>
                      <span className={cn('text-center font-medium', fetchingServer ? 'text-grappler-500' :
                        serverCounts && serverCounts.workouts !== local.workouts ? 'text-yellow-400' : 'text-grappler-200'
                      )}>
                        {fetchingServer ? '...' : serverCounts ? serverCounts.workouts : '—'}
                      </span>
                    </div>

                    {hasMismatch && (
                      <p className="text-xs text-yellow-400 pt-1">
                        {local && serverCounts && (serverCounts.meals > local.meals || serverCounts.workouts > local.workouts)
                          ? 'Server has newer data — tap Sync Now to pull it'
                          : 'Local data not backed up — tap Sync Now to sync'}
                      </p>
                    )}

                    {serverCounts?.lastDevice && (
                      <p className="text-xs text-grappler-500 pt-0.5">
                        Last synced from: {serverCounts.lastDevice}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="px-4 pb-4 flex gap-2">
                <button
                  onClick={handleForceSync}
                  disabled={syncStatus === 'syncing' || syncStatus === 'offline'}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all',
                    hasMismatch
                      ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border border-yellow-500/20'
                      : syncStatus === 'syncing' || syncStatus === 'offline'
                        ? 'bg-grappler-800 text-grappler-500 cursor-not-allowed'
                        : 'bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 border border-primary-500/20'
                  )}
                >
                  {syncStatus === 'syncing' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {syncStatus === 'syncing' ? 'Syncing...' : hasMismatch ? 'Sync Now!' : 'Sync Now'}
                </button>
                <button
                  onClick={() => setShowDetail(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-grappler-400 hover:text-grappler-200 bg-grappler-800/50 hover:bg-grappler-800 transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
