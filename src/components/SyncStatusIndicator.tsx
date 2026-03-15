'use client';

import { useState, useCallback } from 'react';
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
  Database,
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
  const [syncReceipt, setSyncReceipt] = useState<{ meals: number; waterDays: number; workouts: number; sessions: number } | null>(null);

  const handleForceSync = useCallback(() => {
    setSyncReceipt(null);
    // Fire and forget — don't block the UI
    const syncPromise = onForceSync();
    // Wait for completion in the background, then show receipt
    Promise.resolve(syncPromise).then(() => {
      const s = useAppStore.getState();
      setSyncReceipt({
        meals: (s.meals ?? []).filter(m => !m._deleted).length,
        waterDays: s.waterLog ? Object.keys(s.waterLog).length : 0,
        workouts: (s.workoutLogs ?? []).filter(w => !w._deleted).length,
        sessions: (s.trainingSessions ?? []).filter(t => !t._deleted).length,
      });
    }).catch(() => {});
  }, [onForceSync]);

  // Don't show for unauthenticated users
  if (!isAuthenticated) return null;

  const CurrentDeviceIcon = DeviceIcon[deviceType];

  const statusConfig = {
    idle: { dot: 'bg-green-400', label: 'Synced' },
    syncing: { dot: 'bg-blue-400 animate-pulse', label: 'Syncing...' },
    success: { dot: 'bg-green-400', label: 'Synced' },
    error: { dot: 'bg-red-400', label: 'Sync error' },
    offline: { dot: 'bg-yellow-400', label: 'Offline' },
  };

  const config = statusConfig[syncStatus];

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
            className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Cloud sync status"
            onClick={() => setShowDetail(false)}
            onTouchEnd={(e) => { if (e.target === e.currentTarget) setShowDetail(false); }}
            onKeyDown={(e) => { if (e.key === 'Escape') setShowDetail(false); }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-grappler-900 border border-grappler-700 rounded-2xl"
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

              {/* Status rows */}
              <div className="px-4 pb-3 space-y-2">
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

                {/* Sync receipt */}
                {syncReceipt && (
                  <div className="flex items-center gap-3 text-xs text-grappler-300">
                    <Database className="w-3 h-3 text-primary-400 flex-shrink-0" />
                    <span>{syncReceipt.meals} meals · {syncReceipt.workouts} workouts · {syncReceipt.sessions} sessions</span>
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
                    syncStatus === 'syncing' || syncStatus === 'offline'
                      ? 'bg-grappler-800 text-grappler-500 cursor-not-allowed'
                      : 'bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 border border-primary-500/20'
                  )}
                >
                  {syncStatus === 'syncing' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
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
