'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Flame, BarChart3, Info } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getExerciseById } from '@/lib/exercises';
import { cn } from '@/lib/utils';
import type { MuscleGroup, WorkoutLog } from '@/lib/types';

interface VolumeHeatMapProps {
  onClose: () => void;
}

type TimePeriod = 'week' | 'month' | 'all';

const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'quadriceps', 'hamstrings', 'glutes', 'calves',
  'core', 'forearms', 'traps', 'lats', 'full_body',
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
  lats: 'Lats',
  full_body: 'Full Body',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Returns a heat color from blue (cold/low) through yellow (medium) to red (hot/high).
 * `ratio` is 0..1 where 0 = no volume, 1 = max volume.
 */
function getHeatColor(ratio: number): string {
  const clamped = Math.max(0, Math.min(1, ratio));
  if (clamped === 0) return '#1e3a5f'; // dark blue-gray for untrained

  if (clamped <= 0.5) {
    // blue -> yellow
    const t = clamped / 0.5;
    const r = Math.round(30 + t * 225);
    const g = Math.round(100 + t * 155);
    const b = Math.round(200 - t * 180);
    return `rgb(${r}, ${g}, ${b})`;
  }
  // yellow -> red
  const t = (clamped - 0.5) / 0.5;
  const r = Math.round(255);
  const g = Math.round(255 - t * 210);
  const b = Math.round(20 - t * 20);
  return `rgb(${r}, ${g}, ${b})`;
}

function filterLogsByPeriod(logs: WorkoutLog[], period: TimePeriod): WorkoutLog[] {
  if (period === 'all') return logs;
  const now = new Date();
  const cutoff = new Date(now);
  if (period === 'week') {
    cutoff.setDate(cutoff.getDate() - 7);
  } else {
    cutoff.setDate(cutoff.getDate() - 30);
  }
  return logs.filter(log => new Date(log.date).getTime() >= cutoff.getTime());
}

function computeMuscleVolumes(logs: WorkoutLog[]): Record<MuscleGroup, number> {
  const volumes: Record<MuscleGroup, number> = {} as Record<MuscleGroup, number>;
  for (const mg of MUSCLE_GROUPS) {
    volumes[mg] = 0;
  }

  for (const log of logs) {
    for (const ex of log.exercises) {
      const exerciseData = getExerciseById(ex.exerciseId);
      if (!exerciseData) continue;

      const setVolume = ex.sets.reduce((sum, set) => {
        return sum + (set.completed ? set.weight * set.reps : 0);
      }, 0);

      // Primary muscles get full volume credit
      for (const muscle of exerciseData.primaryMuscles) {
        if (muscle in volumes) {
          volumes[muscle] += setVolume;
        }
      }
      // Secondary muscles get 50% volume credit
      for (const muscle of exerciseData.secondaryMuscles) {
        if (muscle in volumes) {
          volumes[muscle] += setVolume * 0.5;
        }
      }
    }
  }

  return volumes;
}

function formatVolume(vol: number): string {
  if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
  if (vol >= 1000) return `${(vol / 1000).toFixed(1)}k`;
  return Math.round(vol).toLocaleString();
}

// SVG body region definitions: each maps a muscle group to SVG shapes
// Coordinates are for a 200x400 viewBox front-view body outline
interface BodyRegionDef {
  muscle: MuscleGroup;
  label: string;
  // Center position for tooltip/label
  cx: number;
  cy: number;
}

const BODY_REGIONS: BodyRegionDef[] = [
  { muscle: 'traps', label: 'Traps', cx: 100, cy: 88 },
  { muscle: 'shoulders', label: 'Shoulders', cx: 55, cy: 105 },
  { muscle: 'chest', label: 'Chest', cx: 100, cy: 125 },
  { muscle: 'biceps', label: 'Biceps', cx: 40, cy: 150 },
  { muscle: 'triceps', label: 'Triceps', cx: 160, cy: 150 },
  { muscle: 'forearms', label: 'Forearms', cx: 35, cy: 195 },
  { muscle: 'lats', label: 'Lats', cx: 68, cy: 148 },
  { muscle: 'core', label: 'Core', cx: 100, cy: 175 },
  { muscle: 'quadriceps', label: 'Quads', cx: 82, cy: 260 },
  { muscle: 'hamstrings', label: 'Hamstrings', cx: 118, cy: 275 },
  { muscle: 'glutes', label: 'Glutes', cx: 100, cy: 220 },
  { muscle: 'calves', label: 'Calves', cx: 85, cy: 330 },
];

export default function VolumeHeatMap({ onClose }: VolumeHeatMapProps) {
  const { workoutLogs, user } = useAppStore();
  const unit = user?.weightUnit || 'lbs';
  const [period, setPeriod] = useState<TimePeriod>('all');
  const [hoveredMuscle, setHoveredMuscle] = useState<MuscleGroup | null>(null);

  const filteredLogs = useMemo(
    () => filterLogsByPeriod(workoutLogs, period),
    [workoutLogs, period]
  );

  const muscleVolumes = useMemo(
    () => computeMuscleVolumes(filteredLogs),
    [filteredLogs]
  );

  const maxVolume = useMemo(() => {
    const vals = Object.values(muscleVolumes).filter(v => v > 0);
    return vals.length > 0 ? Math.max(...vals) : 1;
  }, [muscleVolumes]);

  // Sort muscle groups by volume descending for the breakdown list
  const sortedMuscles = useMemo(() => {
    return [...MUSCLE_GROUPS]
      .filter(mg => mg !== 'full_body')
      .sort((a, b) => muscleVolumes[b] - muscleVolumes[a]);
  }, [muscleVolumes]);

  const hasData = workoutLogs.length > 0;

  function getColorForMuscle(muscle: MuscleGroup): string {
    return getHeatColor(maxVolume > 0 ? muscleVolumes[muscle] / maxVolume : 0);
  }

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
          <button
            onClick={onClose}
            className="p-2 -ml-2 rounded-lg hover:bg-grappler-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-grappler-200" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-grappler-50">Volume Heat Map</h1>
            <p className="text-xs text-grappler-400">Training volume by muscle group</p>
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <Flame className="w-12 h-12 text-grappler-600 mb-4" />
          <h2 className="text-lg font-semibold text-grappler-200 mb-2">No Data Yet</h2>
          <p className="text-grappler-400 text-sm max-w-xs">
            Complete some workouts to see your training volume mapped across muscle groups.
          </p>
        </div>
      ) : (
        <motion.div
          className="px-4 py-4 space-y-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Period Selector */}
          <motion.div variants={itemVariants} className="flex gap-2">
            {([
              { key: 'week' as TimePeriod, label: 'Last Week' },
              { key: 'month' as TimePeriod, label: 'Last Month' },
              { key: 'all' as TimePeriod, label: 'All Time' },
            ]).map(opt => (
              <button
                key={opt.key}
                onClick={() => setPeriod(opt.key)}
                className={cn(
                  'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors',
                  period === opt.key
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/40'
                    : 'bg-grappler-800 text-grappler-400 border border-grappler-700'
                )}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>

          {/* Body Heat Map SVG */}
          <motion.div variants={itemVariants} className="card p-4">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-primary-400" />
              <h2 className="text-base font-semibold text-grappler-50">Body Map</h2>
            </div>

            <div className="flex justify-center">
              <svg
                viewBox="0 0 200 400"
                className="w-full max-w-[280px] h-auto"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Body outline - head */}
                <ellipse cx="100" cy="40" rx="22" ry="28" fill="#1a1a2e" stroke="#334155" strokeWidth="1" />

                {/* Neck */}
                <rect x="92" y="65" width="16" height="15" rx="3" fill="#1a1a2e" stroke="#334155" strokeWidth="0.8" />

                {/* Traps */}
                <path
                  d="M75 80 L92 80 L92 95 L75 100 Z"
                  fill={getColorForMuscle('traps')}
                  stroke="#334155"
                  strokeWidth="0.8"
                  opacity={0.85}
                  onMouseEnter={() => setHoveredMuscle('traps')}
                  onMouseLeave={() => setHoveredMuscle(null)}
                  className="cursor-pointer transition-opacity hover:opacity-100"
                />
                <path
                  d="M125 80 L108 80 L108 95 L125 100 Z"
                  fill={getColorForMuscle('traps')}
                  stroke="#334155"
                  strokeWidth="0.8"
                  opacity={0.85}
                  onMouseEnter={() => setHoveredMuscle('traps')}
                  onMouseLeave={() => setHoveredMuscle(null)}
                  className="cursor-pointer transition-opacity hover:opacity-100"
                />

                {/* Shoulders - left */}
                <ellipse
                  cx="55" cy="105" rx="18" ry="14"
                  fill={getColorForMuscle('shoulders')}
                  stroke="#334155"
                  strokeWidth="0.8"
                  opacity={0.85}
                  onMouseEnter={() => setHoveredMuscle('shoulders')}
                  onMouseLeave={() => setHoveredMuscle(null)}
                  className="cursor-pointer transition-opacity hover:opacity-100"
                />
                {/* Shoulders - right */}
                <ellipse
                  cx="145" cy="105" rx="18" ry="14"
                  fill={getColorForMuscle('shoulders')}
                  stroke="#334155"
                  strokeWidth="0.8"
                  opacity={0.85}
                  onMouseEnter={() => setHoveredMuscle('shoulders')}
                  onMouseLeave={() => setHoveredMuscle(null)}
                  className="cursor-pointer transition-opacity hover:opacity-100"
                />

                {/* Chest */}
                <path
                  d="M72 100 L128 100 L132 115 Q132 140 100 142 Q68 140 68 115 Z"
                  fill={getColorForMuscle('chest')}
                  stroke="#334155"
                  strokeWidth="0.8"
                  opacity={0.85}
                  onMouseEnter={() => setHoveredMuscle('chest')}
                  onMouseLeave={() => setHoveredMuscle(null)}
                  className="cursor-pointer transition-opacity hover:opacity-100"
                />

                {/* Lats - left */}
                <path
                  d="M68 120 L58 135 L62 162 L72 158 L72 130 Z"
                  fill={getColorForMuscle('lats')}
                  stroke="#334155"
                  strokeWidth="0.8"
                  opacity={0.85}
                  onMouseEnter={() => setHoveredMuscle('lats')}
                  onMouseLeave={() => setHoveredMuscle(null)}
                  className="cursor-pointer transition-opacity hover:opacity-100"
                />
                {/* Lats - right */}
                <path
                  d="M132 120 L142 135 L138 162 L128 158 L128 130 Z"
                  fill={getColorForMuscle('lats')}
                  stroke="#334155"
                  strokeWidth="0.8"
                  opacity={0.85}
                  onMouseEnter={() => setHoveredMuscle('lats')}
                  onMouseLeave={() => setHoveredMuscle(null)}
                  className="cursor-pointer transition-opacity hover:opacity-100"
                />

                {/* Biceps - left */}
                <ellipse
                  cx="40" cy="148" rx="10" ry="22"
                  fill={getColorForMuscle('biceps')}
                  stroke="#334155"
                  strokeWidth="0.8"
                  opacity={0.85}
                  onMouseEnter={() => setHoveredMuscle('biceps')}
                  onMouseLeave={() => setHoveredMuscle(null)}
                  className="cursor-pointer transition-opacity hover:opacity-100"
                />
                {/* Biceps - right */}
                <ellipse
                  cx="160" cy="148" rx="10" ry="22"
                  fill={getColorForMuscle('biceps')}
                  stroke="#334155"
                  strokeWidth="0.8"
                  opacity={0.85}
                  onMouseEnter={() => setHoveredMuscle('biceps')}
                  onMouseLeave={() => setHoveredMuscle(null)}
                  className="cursor-pointer transition-opacity hover:opacity-100"
                />

                {/* Triceps - left (behind biceps, shown as side sliver) */}
                <path
                  d="M48 130 L52 128 L52 168 L48 170 Z"
                  fill={getColorForMuscle('triceps')}
                  stroke="#334155"
                  strokeWidth="0.6"
                  opacity={0.85}
                  onMouseEnter={() => setHoveredMuscle('triceps')}
                  onMouseLeave={() => setHoveredMuscle(null)}
                  className="cursor-pointer transition-opacity hover:opacity-100"
                />
                {/* Triceps - right */}
                <path
                  d="M152 130 L148 128 L148 168 L152 170 Z"
                  fill={getColorForMuscle('triceps')}
                  stroke="#334155"
                  strokeWidth="0.6"
                  opacity={0.85}
                  onMouseEnter={() => setHoveredMuscle('triceps')}
                  onMouseLeave={() => setHoveredMuscle(null)}
                  className="cursor-pointer transition-opacity hover:opacity-100"
                />

                {/* Forearms - left */}
                <ellipse
                  cx="34" cy="198" rx="8" ry="25"
                  fill={getColorForMuscle('forearms')}
                  stroke="#334155"
                  strokeWidth="0.8"
                  opacity={0.85}
                  onMouseEnter={() => setHoveredMuscle('forearms')}
                  onMouseLeave={() => setHoveredMuscle(null)}
                  className="cursor-pointer transition-opacity hover:opacity-100"
                />
                {/* Forearms - right */}
                <ellipse
                  cx="166" cy="198" rx="8" ry="25"
                  fill={getColorForMuscle('forearms')}
                  stroke="#334155"
                  strokeWidth="0.8"
                  opacity={0.85}
                  onMouseEnter={() => setHoveredMuscle('forearms')}
                  onMouseLeave={() => setHoveredMuscle(null)}
                  className="cursor-pointer transition-opacity hover:opacity-100"
                />

                {/* Core / Abs */}
                <rect
                  x="78" y="142" width="44" height="56" rx="8"
                  fill={getColorForMuscle('core')}
                  stroke="#334155"
                  strokeWidth="0.8"
                  opacity={0.85}
                  onMouseEnter={() => setHoveredMuscle('core')}
                  onMouseLeave={() => setHoveredMuscle(null)}
                  className="cursor-pointer transition-opacity hover:opacity-100"
                />

                {/* Glutes */}
                <path
                  d="M75 200 L125 200 Q130 215 125 230 L75 230 Q70 215 75 200 Z"
                  fill={getColorForMuscle('glutes')}
                  stroke="#334155"
                  strokeWidth="0.8"
                  opacity={0.85}
                  onMouseEnter={() => setHoveredMuscle('glutes')}
                  onMouseLeave={() => setHoveredMuscle(null)}
                  className="cursor-pointer transition-opacity hover:opacity-100"
                />

                {/* Quadriceps - left */}
                <path
                  d="M75 232 L95 232 L92 300 L78 300 Z"
                  fill={getColorForMuscle('quadriceps')}
                  stroke="#334155"
                  strokeWidth="0.8"
                  opacity={0.85}
                  onMouseEnter={() => setHoveredMuscle('quadriceps')}
                  onMouseLeave={() => setHoveredMuscle(null)}
                  className="cursor-pointer transition-opacity hover:opacity-100"
                />
                {/* Quadriceps - right */}
                <path
                  d="M105 232 L125 232 L122 300 L108 300 Z"
                  fill={getColorForMuscle('quadriceps')}
                  stroke="#334155"
                  strokeWidth="0.8"
                  opacity={0.85}
                  onMouseEnter={() => setHoveredMuscle('quadriceps')}
                  onMouseLeave={() => setHoveredMuscle(null)}
                  className="cursor-pointer transition-opacity hover:opacity-100"
                />

                {/* Hamstrings - left (visible on inner edge) */}
                <path
                  d="M95 240 L100 240 L98 295 L93 295 Z"
                  fill={getColorForMuscle('hamstrings')}
                  stroke="#334155"
                  strokeWidth="0.6"
                  opacity={0.85}
                  onMouseEnter={() => setHoveredMuscle('hamstrings')}
                  onMouseLeave={() => setHoveredMuscle(null)}
                  className="cursor-pointer transition-opacity hover:opacity-100"
                />
                {/* Hamstrings - right */}
                <path
                  d="M100 240 L107 240 L107 295 L102 295 Z"
                  fill={getColorForMuscle('hamstrings')}
                  stroke="#334155"
                  strokeWidth="0.6"
                  opacity={0.85}
                  onMouseEnter={() => setHoveredMuscle('hamstrings')}
                  onMouseLeave={() => setHoveredMuscle(null)}
                  className="cursor-pointer transition-opacity hover:opacity-100"
                />

                {/* Calves - left */}
                <ellipse
                  cx="85" cy="330" rx="9" ry="24"
                  fill={getColorForMuscle('calves')}
                  stroke="#334155"
                  strokeWidth="0.8"
                  opacity={0.85}
                  onMouseEnter={() => setHoveredMuscle('calves')}
                  onMouseLeave={() => setHoveredMuscle(null)}
                  className="cursor-pointer transition-opacity hover:opacity-100"
                />
                {/* Calves - right */}
                <ellipse
                  cx="115" cy="330" rx="9" ry="24"
                  fill={getColorForMuscle('calves')}
                  stroke="#334155"
                  strokeWidth="0.8"
                  opacity={0.85}
                  onMouseEnter={() => setHoveredMuscle('calves')}
                  onMouseLeave={() => setHoveredMuscle(null)}
                  className="cursor-pointer transition-opacity hover:opacity-100"
                />

                {/* Feet outlines */}
                <ellipse cx="85" cy="360" rx="10" ry="6" fill="#1a1a2e" stroke="#334155" strokeWidth="0.6" />
                <ellipse cx="115" cy="360" rx="10" ry="6" fill="#1a1a2e" stroke="#334155" strokeWidth="0.6" />

                {/* Hands */}
                <ellipse cx="30" cy="228" rx="6" ry="8" fill="#1a1a2e" stroke="#334155" strokeWidth="0.6" />
                <ellipse cx="170" cy="228" rx="6" ry="8" fill="#1a1a2e" stroke="#334155" strokeWidth="0.6" />
              </svg>
            </div>

            {/* Hover tooltip */}
            {hoveredMuscle && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 text-center"
              >
                <span className="inline-flex items-center gap-2 bg-grappler-800 rounded-full px-4 py-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getColorForMuscle(hoveredMuscle) }}
                  />
                  <span className="text-sm font-medium text-grappler-50">
                    {MUSCLE_LABELS[hoveredMuscle]}
                  </span>
                  <span className="text-sm text-grappler-400">
                    {formatVolume(muscleVolumes[hoveredMuscle])} {unit}
                  </span>
                </span>
              </motion.div>
            )}
          </motion.div>

          {/* Color Legend */}
          <motion.div variants={itemVariants} className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-primary-400" />
              <h3 className="text-sm font-semibold text-grappler-50">Color Scale</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-grappler-400 whitespace-nowrap">Low</span>
              <div className="flex-1 h-4 rounded-full overflow-hidden flex">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-full"
                    style={{ backgroundColor: getHeatColor((i + 1) / 20) }}
                  />
                ))}
              </div>
              <span className="text-xs text-grappler-400 whitespace-nowrap">High</span>
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-grappler-500">Cool / Untrained</span>
              <span className="text-[10px] text-grappler-500">Hot / High Volume</span>
            </div>
          </motion.div>

          {/* Volume Breakdown List */}
          <motion.div variants={itemVariants} className="card p-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary-400" />
              <h2 className="text-base font-semibold text-grappler-50">Volume Breakdown</h2>
            </div>

            <div className="space-y-3">
              {sortedMuscles.map((muscle, index) => {
                const vol = muscleVolumes[muscle];
                const ratio = maxVolume > 0 ? vol / maxVolume : 0;
                const color = getHeatColor(ratio);

                return (
                  <motion.div
                    key={muscle}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm text-grappler-200 font-medium">
                          {MUSCLE_LABELS[muscle]}
                        </span>
                      </div>
                      <span className="text-sm text-grappler-400 tabular-nums">
                        {formatVolume(vol)} {unit}
                      </span>
                    </div>
                    <div className="h-2 bg-grappler-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(ratio * 100, vol > 0 ? 2 : 0)}%` }}
                        transition={{ duration: 0.6, delay: index * 0.03, ease: 'easeOut' }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Total volume summary */}
            <div className="mt-4 pt-4 border-t border-grappler-700/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-grappler-300">Total Tracked Volume</span>
                <span className="text-sm font-bold text-grappler-50">
                  {formatVolume(
                    sortedMuscles.reduce((sum, mg) => sum + muscleVolumes[mg], 0)
                  )}{' '}
                  {unit}
                </span>
              </div>
              <p className="text-xs text-grappler-500 mt-1">
                Secondary muscles counted at 50% volume credit
              </p>
            </div>
          </motion.div>

          {/* Muscle imbalance insight */}
          {sortedMuscles.length > 2 && muscleVolumes[sortedMuscles[0]] > 0 && (
            <motion.div variants={itemVariants} className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-yellow-400" />
                <h3 className="text-sm font-semibold text-grappler-50">Balance Insight</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <span className="text-emerald-400 mt-0.5 flex-shrink-0">&#x25B2;</span>
                  <p className="text-grappler-300">
                    <span className="text-grappler-100 font-medium">{MUSCLE_LABELS[sortedMuscles[0]]}</span>{' '}
                    has the highest volume at{' '}
                    <span className="text-grappler-100 font-medium">
                      {formatVolume(muscleVolumes[sortedMuscles[0]])} {unit}
                    </span>
                  </p>
                </div>
                {muscleVolumes[sortedMuscles[sortedMuscles.length - 1]] === 0 ? (
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">&#x25BC;</span>
                    <p className="text-grappler-300">
                      <span className="text-grappler-100 font-medium">
                        {MUSCLE_LABELS[sortedMuscles[sortedMuscles.length - 1]]}
                      </span>{' '}
                      has zero recorded volume — consider adding exercises that target it.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-sm">
                    <span className="text-yellow-400 mt-0.5 flex-shrink-0">&#x25BC;</span>
                    <p className="text-grappler-300">
                      <span className="text-grappler-100 font-medium">
                        {MUSCLE_LABELS[sortedMuscles[sortedMuscles.length - 1]]}
                      </span>{' '}
                      has the lowest volume at{' '}
                      <span className="text-grappler-100 font-medium">
                        {formatVolume(muscleVolumes[sortedMuscles[sortedMuscles.length - 1]])} {unit}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
