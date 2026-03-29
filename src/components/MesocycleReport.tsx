'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Target,
  TrendingUp,
  TrendingDown,
  Clock,
  Dumbbell,
  Star,
  BarChart3,
  ChevronLeft,
  Zap,
  Minus,
  Award,
  Calendar,
  Activity,
  Heart,
  Brain,
  Flame,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Mesocycle, WorkoutLog, WeightUnit } from '@/lib/types';
import {
  generateMesocycleReport,
  formatVolume,
  formatDuration,
  MesocycleReport as ReportType,
} from '@/lib/mesocycle-report';

interface MesocycleReportProps {
  mesocycle: Mesocycle;
  workoutLogs: WorkoutLog[];
  previousMesocycle?: Mesocycle | null;
  weightUnit: WeightUnit;
  onClose: () => void;
  onDelete?: (mesocycleId: string) => void;
}

function DeltaBadge({ value, suffix = '', invert = false }: { value: number; suffix?: string; invert?: boolean }) {
  const positive = invert ? value < 0 : value > 0;
  const negative = invert ? value > 0 : value < 0;
  if (value === 0) return <span className="text-xs text-grappler-400 flex items-center gap-0.5"><Minus className="w-3 h-3" />same</span>;
  return (
    <span className={cn('text-xs font-medium flex items-center gap-0.5', positive ? 'text-green-400' : negative ? 'text-red-400' : 'text-grappler-400')}>
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {value > 0 ? '+' : ''}{value}{suffix}
    </span>
  );
}

function StatCard({ label, value, sub, icon: Icon, color = 'text-primary-400' }: {
  label: string;
  value: string | number;
  sub?: React.ReactNode;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="bg-grappler-800/50 rounded-xl p-3 text-center">
      <Icon className={cn('w-4 h-4 mx-auto mb-1', color)} />
      <p className="text-lg font-bold text-grappler-100">{value}</p>
      <p className="text-xs text-grappler-400 uppercase tracking-wide">{label}</p>
      {sub && <div className="mt-0.5">{sub}</div>}
    </div>
  );
}

export default function MesocycleReport({
  mesocycle,
  workoutLogs,
  previousMesocycle,
  weightUnit,
  onClose,
  onDelete,
}: MesocycleReportProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const report = useMemo(() => {
    return generateMesocycleReport(
      mesocycle,
      workoutLogs,
      previousMesocycle,
      previousMesocycle ? workoutLogs : undefined,
    );
  }, [mesocycle, workoutLogs, previousMesocycle]);

  const unit = weightUnit === 'kg' ? 'kg' : 'lbs';

  // Volume bar chart — simple CSS bars
  const maxWeekVol = Math.max(...report.volumeByWeek, 1);

  const handleDelete = () => {
    onDelete?.(mesocycle.id);
    onClose();
  };

  return (
    <div className="min-h-screen bg-grappler-950 pb-24 safe-area-top">
      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Delete mesocycle confirmation"
          onClick={() => setShowDeleteConfirm(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') setShowDeleteConfirm(false); }}
        >
          <div className="bg-grappler-800 rounded-2xl p-6 max-w-sm w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-grappler-100">Delete Mesocycle?</h3>
            <p className="text-sm text-grappler-400">
              This will permanently delete <span className="text-grappler-200 font-medium">{mesocycle.name}</span> and all {report.workoutsCompleted} workout logs associated with it. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button aria-label="Go back"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 btn btn-md bg-grappler-700 text-grappler-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 btn btn-md bg-red-600 text-white hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-grappler-950/95 backdrop-blur border-b border-grappler-800 p-4">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-grappler-800 flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-grappler-300" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-grappler-100 truncate">Block Report</h1>
            <p className="text-xs text-grappler-400">{mesocycle.name}</p>
          </div>
          {onDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-10 h-10 rounded-xl bg-grappler-800 flex items-center justify-center hover:bg-red-500/20 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-grappler-400 hover:text-red-400" />
            </button>
          )}
          <Trophy className="w-6 h-6 text-primary-400" />
        </div>
      </div>

      <div className="p-4 space-y-4 pb-24">
        {/* Completion Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'rounded-2xl p-5 text-center',
            report.completionRate >= 90
              ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/20'
              : report.completionRate >= 70
                ? 'bg-gradient-to-br from-yellow-500/20 to-sky-500/10 border border-yellow-500/20'
                : 'bg-gradient-to-br from-grappler-800/50 to-grappler-700/30 border border-grappler-700'
          )}
        >
          <div className="text-4xl font-black text-grappler-100">{report.completionRate}%</div>
          <p className="text-xs text-grappler-400 mt-1">
            {report.workoutsCompleted} of {report.workoutsPlanned} sessions completed
          </p>
          <div className="w-full h-2 bg-grappler-700 rounded-full mt-3 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                report.completionRate >= 90 ? 'bg-green-500' : report.completionRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              style={{ width: `${report.completionRate}%` }}
            />
          </div>
          <p className="text-xs text-grappler-400 mt-2">
            {new Date(report.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {' — '}
            {new Date(report.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {' · '}{report.durationDays} days
          </p>
        </motion.div>

        {/* Key Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-2"
        >
          <StatCard
            icon={Dumbbell}
            label="Total Volume"
            value={formatVolume(report.totalVolume)}
            sub={<span className="text-xs text-grappler-400">{unit}</span>}
            color="text-primary-400"
          />
          <StatCard
            icon={Star}
            label="PRs Hit"
            value={report.totalPRs}
            color="text-yellow-400"
          />
          <StatCard
            icon={Activity}
            label="Avg RPE"
            value={report.avgRPE || '—'}
            color="text-blue-400"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-2"
        >
          <StatCard
            icon={Clock}
            label="Total Time"
            value={formatDuration(report.totalDuration)}
            color="text-sky-400"
          />
          <StatCard
            icon={BarChart3}
            label="Avg Volume"
            value={formatVolume(report.avgVolumePerSession)}
            sub={<span className="text-xs text-grappler-400">per session</span>}
            color="text-accent-400"
          />
          <StatCard
            icon={Clock}
            label="Avg Duration"
            value={`${report.avgDuration}m`}
            sub={<span className="text-xs text-grappler-400">per session</span>}
            color="text-emerald-400"
          />
        </motion.div>

        {/* PR List */}
        {report.prExercises.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card p-4"
          >
            <h3 className="text-sm font-semibold text-grappler-200 flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-yellow-400" />
              Personal Records
            </h3>
            <div className="flex flex-wrap gap-2">
              {report.prExercises.map(name => (
                <span key={name} className="px-2.5 py-1 bg-yellow-500/10 text-yellow-400 text-xs rounded-full border border-yellow-500/20">
                  {name}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Volume by Week Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-4"
        >
          <h3 className="text-sm font-semibold text-grappler-200 flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary-400" />
            Volume by Week
          </h3>
          <div className="space-y-2">
            {report.weekSummaries.map((week, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className={cn('text-xs w-12 text-right shrink-0', week.isDeload ? 'text-yellow-400' : 'text-grappler-400')}>
                  {week.isDeload ? 'Deload' : `Wk ${week.weekNumber}`}
                </span>
                <div className="flex-1 h-5 bg-grappler-800 rounded-full overflow-hidden relative">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      week.isDeload ? 'bg-yellow-500/60' : 'bg-gradient-to-r from-primary-500 to-accent-500'
                    )}
                    style={{ width: `${maxWeekVol > 0 ? (report.volumeByWeek[i] / maxWeekVol) * 100 : 0}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-grappler-200">
                    {formatVolume(report.volumeByWeek[i])} {unit}
                  </span>
                </div>
                <span className="text-xs text-grappler-400 w-14 text-right">
                  {week.workoutsCompleted}/{week.workoutsPlanned} done
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* RPE Trend */}
        {report.avgRPEByWeek.some(v => v > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="card p-4"
          >
            <h3 className="text-sm font-semibold text-grappler-200 flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-blue-400" />
              RPE Trend
            </h3>
            <div className="flex items-end gap-1 h-20">
              {report.avgRPEByWeek.map((rpe, i) => {
                const height = rpe > 0 ? (rpe / 10) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col items-center justify-end" style={{ height: '60px' }}>
                      <span className="text-xs text-grappler-400 mb-0.5">{rpe > 0 ? rpe : '—'}</span>
                      <div
                        className={cn(
                          'w-full rounded-t',
                          rpe >= 9 ? 'bg-red-500' : rpe >= 7.5 ? 'bg-blue-500' : rpe >= 6 ? 'bg-yellow-500' : 'bg-green-500'
                        )}
                        style={{ height: `${height}%`, minHeight: rpe > 0 ? '4px' : '0px' }}
                      />
                    </div>
                    <span className="text-xs text-grappler-600">
                      {report.weekSummaries[i]?.isDeload ? 'DL' : `W${i + 1}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Top Exercises */}
        {report.topExercisesByVolume.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card p-4"
          >
            <h3 className="text-sm font-semibold text-grappler-200 flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-accent-400" />
              Top Exercises by Volume
            </h3>
            <div className="space-y-2.5">
              {report.topExercisesByVolume.map((ex, i) => (
                <div key={ex.exerciseId} className="flex items-center gap-3">
                  <span className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                    i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                    i === 1 ? 'bg-grappler-400/20 text-grappler-300' :
                    i === 2 ? 'bg-blue-500/20 text-blue-400' :
                    'bg-grappler-700/50 text-grappler-500'
                  )}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-grappler-200 truncate flex items-center gap-1.5">
                      {ex.exerciseName}
                      {ex.hadPR && <Star className="w-3 h-3 text-yellow-400 shrink-0" />}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-grappler-400">
                      <span>{ex.totalSets} sets</span>
                      <span>{formatVolume(ex.totalVolume)} {unit}</span>
                      <span>Best: {ex.bestWeight}{unit}</span>
                      {ex.best1RM > 0 && <span>e1RM: {ex.best1RM}{unit}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Check-in Averages */}
        {(report.avgSleepQuality !== null || report.avgMotivation !== null || report.avgStress !== null) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="card p-4"
          >
            <h3 className="text-sm font-semibold text-grappler-200 flex items-center gap-2 mb-3">
              <Heart className="w-4 h-4 text-pink-400" />
              Wellbeing Averages
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {report.avgSleepQuality !== null && (
                <div className="bg-grappler-800/40 rounded-lg p-2.5 text-center">
                  <p className="text-xs text-grappler-400">Sleep Quality</p>
                  <p className="text-lg font-bold text-grappler-200">{report.avgSleepQuality}<span className="text-xs text-grappler-400">/5</span></p>
                </div>
              )}
              {report.avgMotivation !== null && (
                <div className="bg-grappler-800/40 rounded-lg p-2.5 text-center">
                  <p className="text-xs text-grappler-400">Motivation</p>
                  <p className="text-lg font-bold text-grappler-200">{report.avgMotivation}<span className="text-xs text-grappler-400">/5</span></p>
                </div>
              )}
              {report.avgStress !== null && (
                <div className="bg-grappler-800/40 rounded-lg p-2.5 text-center">
                  <p className="text-xs text-grappler-400">Stress</p>
                  <p className="text-lg font-bold text-grappler-200">{report.avgStress}<span className="text-xs text-grappler-400">/5</span></p>
                </div>
              )}
              {report.avgSoreness !== null && (
                <div className="bg-grappler-800/40 rounded-lg p-2.5 text-center">
                  <p className="text-xs text-grappler-400">Soreness</p>
                  <p className="text-lg font-bold text-grappler-200">{report.avgSoreness}<span className="text-xs text-grappler-400">/5</span></p>
                </div>
              )}
              {report.avgEnergy !== null && (
                <div className="bg-grappler-800/40 rounded-lg p-2.5 text-center">
                  <p className="text-xs text-grappler-400">Post Energy</p>
                  <p className="text-lg font-bold text-grappler-200">{report.avgEnergy}<span className="text-xs text-grappler-400">/10</span></p>
                </div>
              )}
              {report.avgPostSoreness !== null && (
                <div className="bg-grappler-800/40 rounded-lg p-2.5 text-center">
                  <p className="text-xs text-grappler-400">Post Soreness</p>
                  <p className="text-lg font-bold text-grappler-200">{report.avgPostSoreness}<span className="text-xs text-grappler-400">/10</span></p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Comparison to Previous Block */}
        {report.comparison && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card p-4"
          >
            <h3 className="text-sm font-semibold text-grappler-200 flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-sky-400" />
              vs {report.comparison.prevName}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-grappler-800/40 rounded-lg p-2.5 text-center">
                <p className="text-xs text-grappler-400">Volume</p>
                <DeltaBadge value={report.comparison.volumeDeltaPct} suffix="%" />
                <p className="text-xs text-grappler-600 mt-0.5">{report.comparison.volumeDelta > 0 ? '+' : ''}{formatVolume(report.comparison.volumeDelta)} {unit}</p>
              </div>
              <div className="bg-grappler-800/40 rounded-lg p-2.5 text-center">
                <p className="text-xs text-grappler-400">Avg RPE</p>
                <DeltaBadge value={report.comparison.rpeDelta} invert />
              </div>
              <div className="bg-grappler-800/40 rounded-lg p-2.5 text-center">
                <p className="text-xs text-grappler-400">Sessions</p>
                <DeltaBadge value={report.comparison.sessionsDelta} />
              </div>
              <div className="bg-grappler-800/40 rounded-lg p-2.5 text-center">
                <p className="text-xs text-grappler-400">PRs</p>
                <DeltaBadge value={report.comparison.prsDelta} />
              </div>
            </div>
          </motion.div>
        )}

        {/* Week-by-Week Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="card p-4"
        >
          <h3 className="text-sm font-semibold text-grappler-200 flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-emerald-400" />
            Week Breakdown
          </h3>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-grappler-400 text-xs uppercase tracking-wider">
                  <th className="text-left py-1.5 px-1">Week</th>
                  <th className="text-center py-1.5 px-1">Done</th>
                  <th className="text-right py-1.5 px-1">Volume</th>
                  <th className="text-center py-1.5 px-1">RPE</th>
                  <th className="text-center py-1.5 px-1">PRs</th>
                </tr>
              </thead>
              <tbody>
                {report.weekSummaries.map((week, i) => (
                  <tr
                    key={i}
                    className={cn(
                      'border-t border-grappler-800/50',
                      week.isDeload && 'bg-yellow-500/5'
                    )}
                  >
                    <td className="py-1.5 px-1 font-medium text-grappler-300">
                      {week.isDeload ? 'Deload' : `Week ${week.weekNumber}`}
                    </td>
                    <td className="py-1.5 px-1 text-center text-grappler-400">
                      {week.workoutsCompleted}/{week.workoutsPlanned}
                    </td>
                    <td className="py-1.5 px-1 text-right text-grappler-300 font-medium">
                      {formatVolume(week.totalVolume)}
                    </td>
                    <td className="py-1.5 px-1 text-center text-grappler-400">
                      {week.avgRPE > 0 ? week.avgRPE : '—'}
                    </td>
                    <td className="py-1.5 px-1 text-center">
                      {week.prsHit > 0 ? (
                        <span className="text-yellow-400 font-medium">{week.prsHit}</span>
                      ) : (
                        <span className="text-grappler-600">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Block Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card p-4"
        >
          <h3 className="text-sm font-semibold text-grappler-200 mb-2">Block Details</h3>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-grappler-500">Program</span>
              <span className="text-grappler-300 font-medium">{mesocycle.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-grappler-500">Goal</span>
              <span className="text-grappler-300 capitalize">{mesocycle.goalFocus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-grappler-500">Split</span>
              <span className="text-grappler-300">{mesocycle.splitType.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-grappler-500">Weeks</span>
              <span className="text-grappler-300">{mesocycle.weeks.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-grappler-500">Unique Exercises</span>
              <span className="text-grappler-300">{report.allExercises.length}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
