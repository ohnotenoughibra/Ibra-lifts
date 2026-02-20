'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Cloud,
  Smartphone,
  GitMerge,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Calendar,
  Trophy,
  BarChart3,
} from 'lucide-react';
import { cn, formatDate, formatNumber } from '@/lib/utils';

export interface SyncConflict {
  localData: Record<string, unknown>;
  remoteData: Record<string, unknown>;
  localUpdatedAt: Date;
  remoteUpdatedAt: Date;
  conflictFields: ConflictField[];
}

interface ConflictField {
  field: string;
  label: string;
  localValue: string;
  remoteValue: string;
  localDetail?: string;
  remoteDetail?: string;
}

type Resolution = 'local' | 'remote' | 'merge';

interface SyncConflictResolverProps {
  conflict: SyncConflict;
  onResolve: (resolution: Resolution) => void;
  onDismiss: () => void;
}

export function buildConflictFields(
  local: Record<string, unknown>,
  remote: Record<string, unknown>
): ConflictField[] {
  const fields: ConflictField[] = [];

  // Compare workout logs count
  const localLogs = Array.isArray(local.workoutLogs) ? local.workoutLogs : [];
  const remoteLogs = Array.isArray(remote.workoutLogs) ? remote.workoutLogs : [];
  if (localLogs.length !== remoteLogs.length) {
    fields.push({
      field: 'workoutLogs',
      label: 'Workout Logs',
      localValue: `${localLogs.length} workouts`,
      remoteValue: `${remoteLogs.length} workouts`,
      localDetail: localLogs.length > 0 ? `Latest: ${formatDate((localLogs[localLogs.length - 1] as Record<string, unknown>).date as string)}` : undefined,
      remoteDetail: remoteLogs.length > 0 ? `Latest: ${formatDate((remoteLogs[remoteLogs.length - 1] as Record<string, unknown>).date as string)}` : undefined,
    });
  }

  // Compare gamification stats
  const localStats = local.gamificationStats as Record<string, unknown> | undefined;
  const remoteStats = remote.gamificationStats as Record<string, unknown> | undefined;
  if (localStats && remoteStats) {
    if (localStats.totalPoints !== remoteStats.totalPoints || localStats.level !== remoteStats.level) {
      fields.push({
        field: 'gamificationStats',
        label: 'Progress & Level',
        localValue: `Level ${localStats.level} (${formatNumber(localStats.totalPoints as number)} XP)`,
        remoteValue: `Level ${remoteStats.level} (${formatNumber(remoteStats.totalPoints as number)} XP)`,
        localDetail: `Streak: ${localStats.currentStreak} | PRs: ${localStats.personalRecords}`,
        remoteDetail: `Streak: ${remoteStats.currentStreak} | PRs: ${remoteStats.personalRecords}`,
      });
    }
  }

  // Compare current mesocycle
  const localMeso = local.currentMesocycle as Record<string, unknown> | undefined;
  const remoteMeso = remote.currentMesocycle as Record<string, unknown> | undefined;
  if (localMeso && remoteMeso && localMeso.id !== remoteMeso.id) {
    fields.push({
      field: 'currentMesocycle',
      label: 'Training Program',
      localValue: (localMeso.name as string) || 'Unknown',
      remoteValue: (remoteMeso.name as string) || 'Unknown',
    });
  }

  // Compare session templates
  const localTemplates = Array.isArray(local.sessionTemplates) ? local.sessionTemplates : [];
  const remoteTemplates = Array.isArray(remote.sessionTemplates) ? remote.sessionTemplates : [];
  if (localTemplates.length !== remoteTemplates.length) {
    fields.push({
      field: 'sessionTemplates',
      label: 'Saved Templates',
      localValue: `${localTemplates.length} templates`,
      remoteValue: `${remoteTemplates.length} templates`,
    });
  }

  // Compare body weight log
  const localBW = Array.isArray(local.bodyWeightLog) ? local.bodyWeightLog : [];
  const remoteBW = Array.isArray(remote.bodyWeightLog) ? remote.bodyWeightLog : [];
  if (localBW.length !== remoteBW.length) {
    fields.push({
      field: 'bodyWeightLog',
      label: 'Body Weight Log',
      localValue: `${localBW.length} entries`,
      remoteValue: `${remoteBW.length} entries`,
    });
  }

  return fields;
}

export default function SyncConflictResolver({ conflict, onResolve, onDismiss }: SyncConflictResolverProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState<Resolution | null>(null);

  const resolutionOptions = [
    {
      id: 'local' as Resolution,
      icon: Smartphone,
      title: 'Keep This Device',
      description: 'Use data from this device, overwrite cloud data',
      color: 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
      iconColor: 'text-blue-400',
      detail: `Updated ${formatDate(conflict.localUpdatedAt)}`,
    },
    {
      id: 'remote' as Resolution,
      icon: Cloud,
      title: 'Keep Cloud Data',
      description: 'Use data from the cloud, overwrite this device',
      color: 'from-purple-500/20 to-purple-500/5 border-purple-500/30',
      iconColor: 'text-purple-400',
      detail: `Updated ${formatDate(conflict.remoteUpdatedAt)}`,
    },
    {
      id: 'merge' as Resolution,
      icon: GitMerge,
      title: 'Smart Merge',
      description: 'Combine both — keep all workouts, use newest settings',
      color: 'from-green-500/20 to-green-500/5 border-green-500/30',
      iconColor: 'text-green-400',
      detail: 'Recommended',
    },
  ];

  const fieldIcons: Record<string, typeof Dumbbell> = {
    workoutLogs: Dumbbell,
    gamificationStats: Trophy,
    currentMesocycle: Calendar,
    sessionTemplates: BarChart3,
    bodyWeightLog: BarChart3,
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="w-full max-w-lg bg-grappler-900 border border-grappler-700 rounded-2xl overflow-hidden max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-5 bg-gradient-to-b from-sky-500/10 to-transparent border-b border-grappler-800">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-sky-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-sky-400" />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-grappler-50 text-lg">Sync Conflict Detected</h2>
                <p className="text-xs text-grappler-400 mt-1">
                  Your data on this device differs from the cloud. Choose how to resolve it.
                </p>
              </div>
              <button onClick={onDismiss} className="p-1 text-grappler-500 hover:text-grappler-300">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Conflict details toggle */}
            {conflict.conflictFields.length > 0 && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between bg-grappler-800/50 rounded-xl px-4 py-3"
              >
                <span className="text-xs font-medium text-grappler-300">
                  {conflict.conflictFields.length} difference{conflict.conflictFields.length !== 1 ? 's' : ''} found
                </span>
                {showDetails ? (
                  <ChevronUp className="w-4 h-4 text-grappler-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-grappler-500" />
                )}
              </button>
            )}

            {/* Conflict details */}
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2">
                    {conflict.conflictFields.map(field => {
                      const Icon = fieldIcons[field.field] || BarChart3;
                      return (
                        <div key={field.field} className="bg-grappler-800/30 rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className="w-3.5 h-3.5 text-grappler-400" />
                            <span className="text-xs font-medium text-grappler-200">{field.label}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2">
                              <p className="text-xs text-blue-400 uppercase tracking-wide mb-0.5">This Device</p>
                              <p className="text-xs text-grappler-200 font-medium">{field.localValue}</p>
                              {field.localDetail && <p className="text-xs text-grappler-400 mt-0.5">{field.localDetail}</p>}
                            </div>
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2">
                              <p className="text-xs text-purple-400 uppercase tracking-wide mb-0.5">Cloud</p>
                              <p className="text-xs text-grappler-200 font-medium">{field.remoteValue}</p>
                              {field.remoteDetail && <p className="text-xs text-grappler-400 mt-0.5">{field.remoteDetail}</p>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Resolution options */}
            <div className="space-y-2">
              {resolutionOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => setSelectedResolution(option.id)}
                  className={cn(
                    'w-full bg-gradient-to-r border rounded-xl p-4 text-left transition-all',
                    option.color,
                    selectedResolution === option.id
                      ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-grappler-900'
                      : 'opacity-70 hover:opacity-100'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <option.icon className={cn('w-5 h-5 mt-0.5', option.iconColor)} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-grappler-100">{option.title}</p>
                        {option.id === 'merge' && (
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-medium">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-grappler-400 mt-0.5">{option.description}</p>
                      <p className="text-xs text-grappler-400 mt-1">{option.detail}</p>
                    </div>
                    {selectedResolution === option.id && (
                      <Check className="w-5 h-5 text-primary-400 mt-0.5" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-grappler-800">
            <button
              onClick={() => selectedResolution && onResolve(selectedResolution)}
              disabled={!selectedResolution}
              className={cn(
                'w-full py-3 rounded-xl font-medium text-sm transition-all',
                selectedResolution
                  ? 'bg-primary-500 text-white hover:bg-primary-400'
                  : 'bg-grappler-800 text-grappler-500 cursor-not-allowed'
              )}
            >
              {selectedResolution
                ? `Apply ${selectedResolution === 'merge' ? 'Smart Merge' : selectedResolution === 'local' ? 'Local Data' : 'Cloud Data'}`
                : 'Select a resolution'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
