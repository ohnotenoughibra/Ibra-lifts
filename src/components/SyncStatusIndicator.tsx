'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Check,
  AlertCircle,
  Smartphone,
  Monitor,
  Tablet,
  Loader2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
            onKeyDown={(e) => { if (e.key === 'Escape') setShowDetail(false); }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-grappler-900 border border-grappler-700 rounded-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-grappler-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-primary-400" />
                  <h3 className="text-sm font-semibold text-grappler-100">Cloud Sync</h3>
                </div>
                <button onClick={() => setShowDetail(false)} className="p-1 text-grappler-500 hover:text-grappler-300">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status */}
              <div className="p-4 space-y-3">
                {/* Sync status */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-grappler-400">Status</span>
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
                </div>

                {/* Last synced */}
                {lastSyncedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-grappler-400">Last synced</span>
                    <span className="text-xs text-grappler-200">
                      {lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {' '}({getRelativeTime(lastSyncedAt)})
                    </span>
                  </div>
                )}

                {/* Current device */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-grappler-400">This device</span>
                  <div className="flex items-center gap-1.5">
                    <CurrentDeviceIcon className="w-3.5 h-3.5 text-grappler-300" />
                    <span className="text-xs text-grappler-200 capitalize">{deviceType}</span>
                  </div>
                </div>

                {/* Sync failure warning */}
                {syncFailureCount >= 3 && (
                  <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-3 mt-2">
                    <p className="text-xs text-red-300 leading-relaxed font-medium">
                      Sync has failed {syncFailureCount} times. Your data is saved locally and backed up — tap &quot;Sync Now&quot; to retry.
                    </p>
                  </div>
                )}

                {/* Info text */}
                <div className="bg-grappler-800/50 rounded-xl p-3 mt-2">
                  <p className="text-xs text-grappler-400 leading-relaxed">
                    {syncStatus === 'offline'
                      ? 'Changes are saved locally and will sync when you reconnect.'
                      : 'Your data syncs automatically across devices. Switching between phone and computer? Just sign in with the same account — your workouts, progress, and settings follow you.'}
                  </p>
                </div>

                {/* How it works */}
                <div className="space-y-2">
                  <p className="text-xs text-grappler-400 uppercase tracking-wide font-medium">How multi-device sync works</p>
                  <div className="space-y-1.5">
                    {[
                      { icon: Check, text: 'Changes push to cloud within seconds' },
                      { icon: RefreshCw, text: 'Pulls latest data when you switch back to the app' },
                      { icon: AlertCircle, text: 'Conflicts? You choose which data to keep' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <item.icon className="w-3 h-3 text-primary-400 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-grappler-300">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sync now button */}
              <div className="p-4 border-t border-grappler-800">
                <button
                  onClick={() => {
                    onForceSync();
                    setShowDetail(false);
                  }}
                  disabled={syncStatus === 'syncing' || syncStatus === 'offline'}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all',
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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
