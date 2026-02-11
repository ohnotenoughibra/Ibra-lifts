'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Download, ChevronRight, X, Check, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  APP_VERSION,
  isUpgrade,
  isFirstInstall,
  isUpgradeDismissed,
  dismissUpgrade,
  getStoredVersion,
  getChangesSinceVersion,
  hasBreakingChanges,
  runStartupMigration,
} from '@/lib/app-version';
import { exportFullBackup, downloadFile } from '@/lib/data-export';

export default function VersionUpgradePopup() {
  const [show, setShow] = useState(false);
  const [migrationRan, setMigrationRan] = useState(false);
  const [backedUp, setBackedUp] = useState(false);
  const previousVersion = getStoredVersion() || '1.0.0';
  const changes = getChangesSinceVersion(previousVersion);
  const breaking = hasBreakingChanges(previousVersion);

  useEffect(() => {
    // Run migration on mount — always, regardless of popup
    const result = runStartupMigration();
    if (result) {
      setMigrationRan(true);
    }

    // Only show popup for breaking changes or major version bumps.
    // Non-breaking updates (patches, new features) migrate silently.
    if (isUpgrade() && !isFirstInstall() && !isUpgradeDismissed()) {
      if (breaking) {
        const timer = setTimeout(() => setShow(true), 500);
        return () => clearTimeout(timer);
      }
      // Non-breaking: silently dismiss so user isn't interrupted
      dismissUpgrade();
    }
  }, [breaking]);

  const handleBackup = () => {
    const backup = exportFullBackup();
    const date = new Date().toISOString().split('T')[0];
    downloadFile(backup, `roots-gains-backup-pre-${APP_VERSION}-${date}.json`, 'application/json');
    setBackedUp(true);
  };

  const handleDismiss = () => {
    dismissUpgrade();
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-grappler-900 rounded-2xl w-full max-w-md border border-grappler-700 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-br from-primary-500/20 to-accent-500/10 p-6 border-b border-grappler-800">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-grappler-50">New Version Available</h2>
                    <p className="text-sm text-grappler-400">
                      v{previousVersion} → v{APP_VERSION}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="p-1.5 rounded-lg text-grappler-500 hover:text-grappler-300 hover:bg-grappler-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Breaking changes warning */}
              {breaking && (
                <div className="flex items-start gap-3 bg-sky-500/10 border border-sky-500/30 rounded-xl p-3">
                  <AlertTriangle className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-sky-300">Data format changes</p>
                    <p className="text-xs text-sky-400/80 mt-0.5">
                      This update includes changes to how your data is stored. We strongly recommend backing up before continuing.
                    </p>
                  </div>
                </div>
              )}

              {/* Backup recommendation */}
              <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-300">Back up your data</p>
                  <p className="text-xs text-blue-400/80 mt-0.5">
                    We recommend downloading a backup before using the new version, just in case.
                  </p>
                  <button
                    onClick={handleBackup}
                    disabled={backedUp}
                    className={cn(
                      'mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      backedUp
                        ? 'bg-green-500/20 text-green-300'
                        : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                    )}
                  >
                    {backedUp ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Backup downloaded
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        Download Backup
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Migration status */}
              {migrationRan && (
                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl px-3 py-2.5">
                  <Check className="w-4 h-4 text-green-400" />
                  <p className="text-xs text-green-300">Your data has been automatically updated to the new format.</p>
                </div>
              )}

              {/* What's new */}
              <div>
                <h3 className="text-sm font-semibold text-grappler-200 mb-3">What&apos;s New</h3>
                <div className="space-y-3">
                  {changes.map((ver) => (
                    <div key={ver.version} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-primary-400">v{ver.version}</span>
                        <span className="text-xs text-grappler-500">{ver.releasedAt}</span>
                      </div>
                      <ul className="space-y-1">
                        {ver.highlights.map((h, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-grappler-300">
                            <ChevronRight className="w-3 h-3 text-primary-400 flex-shrink-0 mt-0.5" />
                            {h}
                          </li>
                        ))}
                      </ul>
                      {ver.migrationNotes && (
                        <p className="text-xs text-grappler-500 mt-1 pl-5">{ver.migrationNotes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-grappler-800">
              <button
                onClick={handleDismiss}
                className="btn btn-primary w-full gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Got it, let&apos;s go
              </button>
              <p className="text-center text-xs text-grappler-600 mt-2">
                Roots Gains v{APP_VERSION}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
