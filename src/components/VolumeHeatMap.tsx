'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, BarChart3, Info, TrendingUp, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getExerciseById, getExercisesByMuscle } from '@/lib/exercises';
import { VOLUME_LANDMARKS } from '@/lib/workout-generator';
import { cn } from '@/lib/utils';
import type { MuscleGroup, WorkoutLog } from '@/lib/types';

/** Pick 2-3 top exercises for a muscle, preferring compounds then isolation. */
function getExerciseSuggestionsForMuscle(muscle: MuscleGroup): string[] {
  const exercises = getExercisesByMuscle(muscle);
  // Prefer exercises where this muscle is primary
  const primary = exercises.filter(e => e.primaryMuscles.includes(muscle));
  const sorted = primary.sort((a, b) => (b.strengthValue || 0) - (a.strengthValue || 0));
  return sorted.slice(0, 3).map(e => e.name);
}

interface VolumeHeatMapProps {
  onClose: () => void;
}

const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'quadriceps', 'hamstrings', 'glutes', 'calves',
  'core', 'forearms', 'traps', 'full_body',
];

const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quadriceps: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
  forearms: 'Forearms',
  traps: 'Traps',
  full_body: 'Full Body',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

type VolumeZone = 'untrained' | 'below_mev' | 'mev_to_mav' | 'mav_to_mrv' | 'above_mrv';

function getVolumeZone(sets: number, landmarks: { mev: number; mav: number; mrv: number }): VolumeZone {
  if (sets === 0) return 'untrained';
  if (sets < landmarks.mev) return 'below_mev';
  if (sets <= landmarks.mav) return 'mev_to_mav';
  if (sets <= landmarks.mrv) return 'mav_to_mrv';
  return 'above_mrv';
}

function getZoneColor(zone: VolumeZone): string {
  switch (zone) {
    case 'untrained': return 'text-grappler-500';
    case 'below_mev': return 'text-red-400';
    case 'mev_to_mav': return 'text-yellow-400';
    case 'mav_to_mrv': return 'text-emerald-400';
    case 'above_mrv': return 'text-red-400';
  }
}

function getZoneLabel(zone: VolumeZone): string {
  switch (zone) {
    case 'untrained': return 'Untrained';
    case 'below_mev': return 'Below MEV';
    case 'mev_to_mav': return 'Maintenance';
    case 'mav_to_mrv': return 'Optimal Growth';
    case 'above_mrv': return 'Overreaching';
  }
}

function getZoneBgColor(zone: VolumeZone): string {
  switch (zone) {
    case 'untrained': return 'bg-grappler-700';
    case 'below_mev': return 'bg-red-500/20';
    case 'mev_to_mav': return 'bg-yellow-500/20';
    case 'mav_to_mrv': return 'bg-emerald-500/20';
    case 'above_mrv': return 'bg-red-500/20';
  }
}

/**
 * Compute weekly set counts per muscle group from the last 7 days of workout logs.
 * Primary muscles get full set credit; secondary muscles get 0.5 set credit.
 */
function computeWeeklySetVolume(logs: WorkoutLog[]): Record<MuscleGroup, number> {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const volumes: Record<MuscleGroup, number> = {} as Record<MuscleGroup, number>;
  for (const mg of MUSCLE_GROUPS) {
    volumes[mg] = 0;
  }

  const weekLogs = logs.filter(log => new Date(log.date).getTime() >= weekAgo.getTime());

  for (const log of weekLogs) {
    for (const ex of log.exercises) {
      const exerciseData = getExerciseById(ex.exerciseId);
      if (!exerciseData) continue;

      // Count completed sets only
      const completedSets = ex.sets.filter(s => s.completed).length;

      // Primary muscles get full set credit
      for (const muscle of exerciseData.primaryMuscles) {
        if (muscle in volumes) {
          volumes[muscle] += completedSets;
        }
      }
      // Secondary muscles get half set credit
      for (const muscle of exerciseData.secondaryMuscles) {
        if (muscle in volumes) {
          volumes[muscle] += completedSets * 0.5;
        }
      }
    }
  }

  return volumes;
}

interface MuscleVolumeData {
  muscle: MuscleGroup;
  label: string;
  sets: number;
  landmarks: { mev: number; mav: number; mrv: number };
  zone: VolumeZone;
  /** Distance from optimal center of MAV-MRV range; lower = closer to optimal */
  optimalGap: number;
}

export default function VolumeHeatMap({ onClose }: VolumeHeatMapProps) {
  const { workoutLogs, currentMesocycle } = useAppStore();
  const [expandedMuscle, setExpandedMuscle] = useState<MuscleGroup | null>(null);

  const weeklySetVolumes = useMemo(
    () => computeWeeklySetVolume(workoutLogs),
    [workoutLogs]
  );

  const muscleData: MuscleVolumeData[] = useMemo(() => {
    return MUSCLE_GROUPS
      .filter(mg => mg !== 'full_body')
      .map(mg => {
        const landmarks = VOLUME_LANDMARKS[mg] || { mev: 4, mav: 10, mrv: 16 };
        const sets = Math.round(weeklySetVolumes[mg] * 10) / 10; // round to 1 decimal
        const zone = getVolumeZone(sets, landmarks);
        // optimal center is midpoint of MAV-MRV
        const optimalCenter = (landmarks.mav + landmarks.mrv) / 2;
        const optimalGap = Math.abs(sets - optimalCenter);

        return {
          muscle: mg,
          label: MUSCLE_LABELS[mg],
          sets,
          landmarks,
          zone,
          optimalGap,
        };
      })
      // Sort: biggest gap from optimal first
      .sort((a, b) => b.optimalGap - a.optimalGap);
  }, [weeklySetVolumes]);

  const hasData = workoutLogs.length > 0;

  // Summary stats
  const summary = useMemo(() => {
    const total = muscleData.length;
    const optimal = muscleData.filter(d => d.zone === 'mav_to_mrv').length;
    const maintenance = muscleData.filter(d => d.zone === 'mev_to_mav').length;
    const belowMev = muscleData.filter(d => d.zone === 'below_mev' || d.zone === 'untrained').length;
    const overreaching = muscleData.filter(d => d.zone === 'above_mrv').length;
    return { total, optimal, maintenance, belowMev, overreaching };
  }, [muscleData]);

  // Current mesocycle week info
  const mesocycleInfo = useMemo(() => {
    if (!currentMesocycle) return null;
    return {
      name: currentMesocycle.name || 'Current Block',
      weekCount: currentMesocycle.weeks?.length || 0,
    };
  }, [currentMesocycle]);

  return (
    <motion.div
      className="min-h-screen bg-grappler-900 pb-24"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-grappler-900/95 backdrop-blur-sm border-b border-grappler-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <button aria-label="Go back"
            onClick={onClose}
            className="p-2 -ml-2 rounded-lg hover:bg-grappler-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-grappler-200" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-grappler-50">Weekly Volume Tracker</h1>
            <p className="text-xs text-grappler-400">
              Sets per muscle group vs. MEV / MAV / MRV landmarks
            </p>
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <BarChart3 className="w-12 h-12 text-grappler-600 mb-4" />
          <h2 className="text-lg font-semibold text-grappler-200 mb-2">No Data Yet</h2>
          <p className="text-grappler-400 text-sm max-w-xs">
            Complete some workouts to see your weekly volume tracked against scientifically-based landmarks.
          </p>
        </div>
      ) : (
        <motion.div
          className="px-4 py-4 space-y-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Summary Cards */}
          <motion.div variants={itemVariants} className="grid grid-cols-4 gap-2">
            <div className="card p-3 text-center">
              <div className="text-lg font-bold text-emerald-400">{summary.optimal}</div>
              <div className="text-xs text-grappler-400 leading-tight mt-0.5">Optimal</div>
            </div>
            <div className="card p-3 text-center">
              <div className="text-lg font-bold text-yellow-400">{summary.maintenance}</div>
              <div className="text-xs text-grappler-400 leading-tight mt-0.5">Maintenance</div>
            </div>
            <div className="card p-3 text-center">
              <div className="text-lg font-bold text-red-400">{summary.belowMev}</div>
              <div className="text-xs text-grappler-400 leading-tight mt-0.5">Below MEV</div>
            </div>
            <div className="card p-3 text-center">
              <div className="text-lg font-bold text-red-400">{summary.overreaching}</div>
              <div className="text-xs text-grappler-400 leading-tight mt-0.5">Over MRV</div>
            </div>
          </motion.div>

          {/* Legend */}
          <motion.div variants={itemVariants} className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-primary-400" />
              <h3 className="text-sm font-semibold text-grappler-50">Volume Zones</h3>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-red-500/60" />
                <span className="text-grappler-300">Below MEV <span className="text-grappler-500">(junk volume)</span></span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-yellow-500/60" />
                <span className="text-grappler-300">MEV-MAV <span className="text-grappler-500">(maintenance)</span></span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-emerald-500/60" />
                <span className="text-grappler-300">MAV-MRV <span className="text-grappler-500">(optimal growth)</span></span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-red-500/80" />
                <span className="text-grappler-300">Above MRV <span className="text-grappler-500">(overreaching)</span></span>
              </div>
            </div>
            <p className="text-xs text-grappler-400 mt-2.5">
              MEV = Minimum Effective Volume &bull; MAV = Maximum Adaptive Volume &bull; MRV = Maximum Recoverable Volume
            </p>
          </motion.div>

          {/* Muscle Group Volume Bars */}
          <motion.div variants={itemVariants} className="card p-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary-400" />
              <h2 className="text-base font-semibold text-grappler-50">Weekly Set Volume</h2>
              <span className="text-xs text-grappler-400 ml-auto">last 7 days</span>
            </div>

            <div className="space-y-1">
              {muscleData.map((data, index) => (
                <MuscleVolumeBar
                  key={data.muscle}
                  data={data}
                  index={index}
                  expanded={expandedMuscle === data.muscle}
                  onToggle={() =>
                    setExpandedMuscle(expandedMuscle === data.muscle ? null : data.muscle)
                  }
                />
              ))}
            </div>
          </motion.div>

          {/* Insights */}
          <motion.div variants={itemVariants} className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary-400" />
              <h3 className="text-sm font-semibold text-grappler-50">Insights</h3>
            </div>
            <div className="space-y-2.5">
              {summary.overreaching > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-grappler-300">
                    <span className="text-red-400 font-medium">{summary.overreaching} muscle group{summary.overreaching > 1 ? 's' : ''}</span>{' '}
                    exceeding MRV. Consider reducing volume to avoid excess fatigue and injury risk.
                  </p>
                </div>
              )}
              {summary.belowMev > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <p className="text-grappler-300">
                    <span className="text-yellow-400 font-medium">{summary.belowMev} muscle group{summary.belowMev > 1 ? 's' : ''}</span>{' '}
                    below MEV. Volume is too low to stimulate meaningful growth.
                  </p>
                </div>
              )}
              {summary.optimal > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-grappler-300">
                    <span className="text-emerald-400 font-medium">{summary.optimal} muscle group{summary.optimal > 1 ? 's' : ''}</span>{' '}
                    in the optimal growth zone (MAV-MRV). Keep it up!
                  </p>
                </div>
              )}
              {summary.optimal === 0 && summary.overreaching === 0 && summary.belowMev === 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <Info className="w-4 h-4 text-grappler-400 mt-0.5 flex-shrink-0" />
                  <p className="text-grappler-300">
                    All muscle groups are in the maintenance range. Push volume toward MAV-MRV for hypertrophy gains.
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Gap Recommendations */}
          {(() => {
            const belowMev = muscleData.filter(d => d.zone === 'below_mev' || d.zone === 'untrained');
            const aboveMrv = muscleData.filter(d => d.zone === 'above_mrv');
            if (belowMev.length === 0 && aboveMrv.length === 0) return null;
            return (
              <motion.div variants={itemVariants} className="card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-grappler-50">Fix Volume Gaps</h3>
                </div>
                <div className="space-y-3">
                  {belowMev.map(d => {
                    const setsNeeded = Math.ceil(d.landmarks.mev - d.sets);
                    const suggestions = getExerciseSuggestionsForMuscle(d.muscle);
                    return (
                      <div key={d.muscle} className="bg-grappler-800/60 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 rounded-full bg-red-400" />
                          <span className="text-sm font-medium text-grappler-100">{d.label}</span>
                          <span className="text-xs text-red-400 ml-auto">
                            +{setsNeeded} sets to MEV
                          </span>
                        </div>
                        <p className="text-xs text-grappler-400">
                          {d.sets === 0 ? 'No sets this week' : `Only ${d.sets} sets`} — need {d.landmarks.mev} minimum.{' '}
                          {suggestions.length > 0 && (
                            <>Add {suggestions.slice(0, 2).join(' or ')}.</>
                          )}
                        </p>
                      </div>
                    );
                  })}
                  {aboveMrv.map(d => {
                    const setsOver = Math.ceil(d.sets - d.landmarks.mrv);
                    return (
                      <div key={d.muscle} className="bg-grappler-800/60 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 rounded-full bg-red-400" />
                          <span className="text-sm font-medium text-grappler-100">{d.label}</span>
                          <span className="text-xs text-red-400 ml-auto">
                            {setsOver} sets over MRV
                          </span>
                        </div>
                        <p className="text-xs text-grappler-400">
                          {d.sets} sets exceeds your MRV of {d.landmarks.mrv}. Drop {setsOver} sets to avoid overreaching.
                        </p>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })()}

          {/* Mesocycle context */}
          {mesocycleInfo && (
            <motion.div variants={itemVariants} className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-grappler-400" />
                <h3 className="text-sm font-semibold text-grappler-50">Current Block</h3>
              </div>
              <p className="text-xs text-grappler-400">
                {mesocycleInfo.name} &mdash; {mesocycleInfo.weekCount} week{mesocycleInfo.weekCount !== 1 ? 's' : ''} planned.
                Volume should progressively increase across weeks (MEV &rarr; MRV), then deload.
              </p>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

/** Individual muscle group volume bar with landmark zones */
function MuscleVolumeBar({
  data,
  index,
  expanded,
  onToggle,
}: {
  data: MuscleVolumeData;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { muscle, label, sets, landmarks, zone } = data;
  const { mev, mav, mrv } = landmarks;

  // The bar represents 0 to mrv * 1.2 (allow some overflow for over-MRV)
  const barMax = mrv * 1.25;

  // Zone boundaries as percentages
  const mevPct = (mev / barMax) * 100;
  const mavPct = (mav / barMax) * 100;
  const mrvPct = (mrv / barMax) * 100;

  // Current fill percentage
  const fillPct = Math.min((sets / barMax) * 100, 100);

  // Determine the fill color based on where the current volume sits
  const fillColor = (() => {
    if (sets === 0) return 'bg-grappler-600';
    if (sets < mev) return 'bg-red-500';
    if (sets <= mav) return 'bg-yellow-500';
    if (sets <= mrv) return 'bg-emerald-500';
    return 'bg-red-500';
  })();

  const fillGlow = (() => {
    if (sets <= mav && sets >= mev) return 'shadow-yellow-500/20';
    if (sets > mav && sets <= mrv) return 'shadow-emerald-500/30';
    return '';
  })();

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="py-2"
    >
      {/* Top row: muscle name, set count, zone badge */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between mb-1.5 group"
      >
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-medium', getZoneColor(zone))}>
            {label}
          </span>
          <span
            className={cn(
              'text-xs px-1.5 py-0.5 rounded-full font-medium',
              getZoneBgColor(zone),
              getZoneColor(zone)
            )}
          >
            {getZoneLabel(zone)}
          </span>
        </div>
        <span className="text-sm tabular-nums text-grappler-200 font-semibold">
          {sets % 1 === 0 ? sets : sets.toFixed(1)} <span className="text-grappler-400 font-normal text-xs">sets</span>
        </span>
      </button>

      {/* The landmark bar */}
      <div className="relative h-5 rounded-md overflow-hidden bg-grappler-800/80">
        {/* Zone background bands */}
        {/* Below MEV zone: 0 to mev */}
        <div
          className="absolute inset-y-0 left-0 bg-red-500/10 border-r border-red-500/30"
          style={{ width: `${mevPct}%` }}
        />
        {/* MEV to MAV zone */}
        <div
          className="absolute inset-y-0 bg-yellow-500/10 border-r border-yellow-500/30"
          style={{ left: `${mevPct}%`, width: `${mavPct - mevPct}%` }}
        />
        {/* MAV to MRV zone (optimal) */}
        <div
          className="absolute inset-y-0 bg-emerald-500/10 border-r border-red-500/30"
          style={{ left: `${mavPct}%`, width: `${mrvPct - mavPct}%` }}
        />
        {/* Above MRV zone */}
        <div
          className="absolute inset-y-0 bg-red-500/8"
          style={{ left: `${mrvPct}%`, right: 0 }}
        />

        {/* Fill bar */}
        <motion.div
          className={cn('absolute inset-y-0 left-0 rounded-md', fillColor, fillGlow && `shadow-lg ${fillGlow}`)}
          style={{ opacity: 0.75 }}
          initial={{ width: 0 }}
          animate={{ width: `${fillPct}%` }}
          transition={{ duration: 0.7, delay: index * 0.04, ease: 'easeOut' }}
        />

        {/* Landmark tick marks */}
        <div
          className="absolute inset-y-0 w-px bg-red-400/60"
          style={{ left: `${mevPct}%` }}
        />
        <div
          className="absolute inset-y-0 w-px bg-yellow-400/60"
          style={{ left: `${mavPct}%` }}
        />
        <div
          className="absolute inset-y-0 w-px bg-red-400/60"
          style={{ left: `${mrvPct}%` }}
        />

        {/* Landmark labels inside bar */}
        <span
          className="absolute top-0.5 text-xs font-medium text-red-400/80 leading-none"
          style={{ left: `${mevPct}%`, transform: 'translateX(2px)' }}
        >
          MEV
        </span>
        <span
          className="absolute top-0.5 text-xs font-medium text-yellow-400/80 leading-none"
          style={{ left: `${mavPct}%`, transform: 'translateX(2px)' }}
        >
          MAV
        </span>
        <span
          className="absolute top-0.5 text-xs font-medium text-red-400/80 leading-none"
          style={{ left: `${mrvPct}%`, transform: 'translateX(2px)' }}
        >
          MRV
        </span>
      </div>

      {/* Landmark numbers below bar */}
      <div className="relative h-3 mt-0.5">
        <span
          className="absolute text-xs text-grappler-400 tabular-nums"
          style={{ left: `${mevPct}%`, transform: 'translateX(-50%)' }}
        >
          {mev}
        </span>
        <span
          className="absolute text-xs text-grappler-400 tabular-nums"
          style={{ left: `${mavPct}%`, transform: 'translateX(-50%)' }}
        >
          {mav}
        </span>
        <span
          className="absolute text-xs text-grappler-400 tabular-nums"
          style={{ left: `${mrvPct}%`, transform: 'translateX(-50%)' }}
        >
          {mrv}
        </span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="mt-1 bg-grappler-800/50 rounded-lg p-3 text-xs space-y-1.5"
        >
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-red-400 font-semibold">{mev}</div>
              <div className="text-grappler-500">MEV</div>
              <div className="text-grappler-600 text-xs">Min Effective</div>
            </div>
            <div>
              <div className="text-yellow-400 font-semibold">{mav}</div>
              <div className="text-grappler-500">MAV</div>
              <div className="text-grappler-600 text-xs">Max Adaptive</div>
            </div>
            <div>
              <div className="text-red-400 font-semibold">{mrv}</div>
              <div className="text-grappler-500">MRV</div>
              <div className="text-grappler-600 text-xs">Max Recoverable</div>
            </div>
          </div>
          <div className="border-t border-grappler-700/50 pt-1.5">
            {zone === 'untrained' && (
              <p className="text-grappler-400">
                No sets logged this week. Aim for at least <span className="text-grappler-200 font-medium">{mev} sets</span> to maintain muscle.
              </p>
            )}
            {zone === 'below_mev' && (
              <p className="text-grappler-400">
                Current volume is below MEV. You need <span className="text-grappler-200 font-medium">{Math.ceil(mev - sets)} more sets</span> to reach the minimum effective threshold.
              </p>
            )}
            {zone === 'mev_to_mav' && (
              <p className="text-grappler-400">
                Maintenance volume. Add <span className="text-grappler-200 font-medium">{Math.ceil(mav - sets)} more sets</span> to enter the optimal growth zone.
              </p>
            )}
            {zone === 'mav_to_mrv' && (
              <p className="text-grappler-400">
                Optimal growth zone. You can add up to <span className="text-grappler-200 font-medium">{Math.ceil(mrv - sets)} more sets</span> before hitting MRV.
              </p>
            )}
            {zone === 'above_mrv' && (
              <p className="text-grappler-400">
                Exceeding MRV by <span className="text-red-400 font-medium">{Math.ceil(sets - mrv)} sets</span>. Accumulated fatigue may outpace recovery. Consider reducing volume or taking a deload.
              </p>
            )}
            {(zone === 'untrained' || zone === 'below_mev') && (() => {
              const suggestions = getExerciseSuggestionsForMuscle(muscle);
              return suggestions.length > 0 ? (
                <p className="text-grappler-500 mt-1.5">
                  Try adding: <span className="text-grappler-300">{suggestions.join(', ')}</span>
                </p>
              ) : null;
            })()}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
