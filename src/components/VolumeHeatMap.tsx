'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronDown, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Zap, Minus, Info } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getExerciseById, getExercisesByMuscle } from '@/lib/exercises';
import { VOLUME_LANDMARKS } from '@/lib/workout-generator';
import { analyzeVolumeLandmarks, type MuscleLandmarks } from '@/lib/volume-landmarks';
import { cn } from '@/lib/utils';
import type { MuscleGroup, WorkoutLog } from '@/lib/types';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Anatomical order — never changes, spatial consistency for users */
const MUSCLE_ORDER: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'quadriceps', 'hamstrings',
  'glutes', 'biceps', 'triceps', 'calves', 'core', 'traps', 'forearms',
];

const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest', back: 'Back', shoulders: 'Shoulders',
  biceps: 'Biceps', triceps: 'Triceps', quadriceps: 'Quads',
  hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves',
  core: 'Core', forearms: 'Forearms', traps: 'Traps', full_body: 'Full Body',
};

type VolumeZone = 'not_targeted' | 'below_mev' | 'mev_to_mav' | 'mav_to_mrv' | 'above_mrv';

interface MuscleVolumeData {
  muscle: MuscleGroup;
  label: string;
  sets: number;
  prevSets: number;
  delta: number;
  landmarks: MuscleLandmarks;
  zone: VolumeZone;
}

// ─── Zone Styling — orange for overreaching, red only for under ─────────────

const ZONE_CONFIG: Record<VolumeZone, {
  label: string; color: string; bgColor: string;
  barBg: string; fillColor: string; borderColor: string;
}> = {
  not_targeted: {
    label: 'Not targeted', color: 'text-grappler-400', bgColor: 'bg-grappler-700',
    barBg: 'bg-grappler-700/30', fillColor: 'bg-grappler-500', borderColor: 'border-grappler-600/30',
  },
  below_mev: {
    label: 'Below MEV', color: 'text-red-400', bgColor: 'bg-red-500/15',
    barBg: 'bg-red-500/10', fillColor: 'bg-red-500', borderColor: 'border-red-500/30',
  },
  mev_to_mav: {
    label: 'Maintenance', color: 'text-yellow-400', bgColor: 'bg-yellow-500/15',
    barBg: 'bg-yellow-500/10', fillColor: 'bg-yellow-500', borderColor: 'border-yellow-500/30',
  },
  mav_to_mrv: {
    label: 'Optimal', color: 'text-emerald-400', bgColor: 'bg-emerald-500/15',
    barBg: 'bg-emerald-500/10', fillColor: 'bg-emerald-500', borderColor: 'border-emerald-500/30',
  },
  above_mrv: {
    label: 'Overreaching', color: 'text-orange-400', bgColor: 'bg-orange-500/15',
    barBg: 'bg-orange-500/10', fillColor: 'bg-orange-500', borderColor: 'border-orange-500/30',
  },
};

const CONFIDENCE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: 'Pop.', color: 'text-grappler-400', bg: 'bg-grappler-700' },
  medium: { label: 'Med', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  high: { label: 'You', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getVolumeZone(sets: number, lm: { mev: number; mav: number; mrv: number }): VolumeZone {
  if (sets === 0) return 'not_targeted';
  if (sets < lm.mev) return 'below_mev';
  if (sets <= lm.mav) return 'mev_to_mav';
  if (sets <= lm.mrv) return 'mav_to_mrv';
  return 'above_mrv';
}

function computeSetVolume(logs: WorkoutLog[], daysBack: number): Record<MuscleGroup, number> {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - daysBack);

  const volumes = {} as Record<MuscleGroup, number>;
  for (const mg of MUSCLE_ORDER) volumes[mg] = 0;

  const filtered = logs.filter(log => new Date(log.date).getTime() >= cutoff.getTime());

  for (const log of filtered) {
    for (const ex of log.exercises) {
      const exerciseData = getExerciseById(ex.exerciseId);
      if (!exerciseData) continue;
      const completedSets = ex.sets.filter(s => s.completed).length;
      for (const muscle of exerciseData.primaryMuscles) {
        if (muscle in volumes) volumes[muscle] += completedSets;
      }
      // Secondary muscles: 0.33x credit (conservative — Barbalho et al. 2020)
      for (const muscle of exerciseData.secondaryMuscles) {
        if (muscle in volumes) volumes[muscle] += completedSets * 0.33;
      }
    }
  }
  return volumes;
}

function getExerciseSuggestions(muscle: MuscleGroup): string[] {
  const exercises = getExercisesByMuscle(muscle);
  const primary = exercises.filter(e => e.primaryMuscles.includes(muscle));
  return primary.sort((a, b) => (b.strengthValue || 0) - (a.strengthValue || 0)).slice(0, 2).map(e => e.name);
}

function formatSets(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

// ─── Animation ──────────────────────────────────────────────────────────────

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

// ─── Main Component ─────────────────────────────────────────────────────────

interface VolumeHeatMapProps { onClose: () => void }

export default function VolumeHeatMap({ onClose }: VolumeHeatMapProps) {
  const { workoutLogs, currentMesocycle } = useAppStore();
  const [expandedMuscle, setExpandedMuscle] = useState<MuscleGroup | null>(null);

  // Single data source: personalized landmarks for everything
  const personalLandmarks = useMemo(
    () => analyzeVolumeLandmarks(workoutLogs, VOLUME_LANDMARKS),
    [workoutLogs],
  );

  // Current week + previous week volumes for delta comparison
  const thisWeek = useMemo(() => computeSetVolume(workoutLogs, 7), [workoutLogs]);
  const prevWeek = useMemo(() => {
    const now = new Date();
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const filtered = workoutLogs.filter(log => {
      const d = new Date(log.date).getTime();
      return d >= twoWeeksAgo.getTime() && d < oneWeekAgo.getTime();
    });

    const volumes = {} as Record<MuscleGroup, number>;
    for (const mg of MUSCLE_ORDER) volumes[mg] = 0;
    for (const log of filtered) {
      for (const ex of log.exercises) {
        const exerciseData = getExerciseById(ex.exerciseId);
        if (!exerciseData) continue;
        const completedSets = ex.sets.filter(s => s.completed).length;
        for (const muscle of exerciseData.primaryMuscles) {
          if (muscle in volumes) volumes[muscle] += completedSets;
        }
        for (const muscle of exerciseData.secondaryMuscles) {
          if (muscle in volumes) volumes[muscle] += completedSets * 0.33;
        }
      }
    }
    return volumes;
  }, [workoutLogs]);

  // Build muscle data in stable anatomical order
  const muscleData: MuscleVolumeData[] = useMemo(() => {
    return MUSCLE_ORDER.map(mg => {
      const lm = personalLandmarks.muscles[mg] || { mev: 4, mav: 10, mrv: 16, confidence: 'low' as const, dataWeeks: 0 };
      const sets = Math.round(thisWeek[mg] * 10) / 10;
      const pSets = Math.round(prevWeek[mg] * 10) / 10;
      return {
        muscle: mg,
        label: MUSCLE_LABELS[mg],
        sets,
        prevSets: pSets,
        delta: Math.round((sets - pSets) * 10) / 10,
        landmarks: lm,
        zone: getVolumeZone(sets, lm),
      };
    });
  }, [personalLandmarks, thisWeek, prevWeek]);

  const hasData = workoutLogs.length > 0;

  // Summary: count by zone
  const summary = useMemo(() => {
    const optimal = muscleData.filter(d => d.zone === 'mav_to_mrv').length;
    const maintenance = muscleData.filter(d => d.zone === 'mev_to_mav').length;
    const low = muscleData.filter(d => d.zone === 'below_mev').length;
    const over = muscleData.filter(d => d.zone === 'above_mrv').length;
    const notTargeted = muscleData.filter(d => d.zone === 'not_targeted').length;
    return { optimal, maintenance, low, over, notTargeted };
  }, [muscleData]);

  // Verdict — wins first, then problems
  const verdict = useMemo(() => {
    const aboveMrv = muscleData.filter(d => d.zone === 'above_mrv');
    const belowMev = muscleData.filter(d => d.zone === 'below_mev');
    const allOptimal = summary.optimal === muscleData.length;

    // Overreaching is urgent — surface it
    if (aboveMrv.length > 0) {
      const worst = aboveMrv.reduce((a, b) => (a.sets - a.landmarks.mrv > b.sets - b.landmarks.mrv ? a : b));
      const setsOver = Math.ceil(worst.sets - worst.landmarks.mrv);
      return {
        status: 'danger' as const,
        headline: `${worst.label}: ${setsOver} set${setsOver > 1 ? 's' : ''} over MRV`,
        detail: aboveMrv.length > 1
          ? `${aboveMrv.length} groups past recovery capacity. Scale back or deload.`
          : `${formatSets(worst.sets)} sets vs ${worst.landmarks.mrv} MRV. Fatigue outpacing recovery.`,
        color: 'text-orange-400',
        bg: 'bg-orange-500/10 border-orange-500/30',
        icon: AlertTriangle,
      };
    }
    // Celebrate when things are going well
    if (allOptimal) {
      return {
        status: 'optimal' as const,
        headline: 'Every muscle in the growth zone',
        detail: 'Volume distribution is dialed in. Maintain this and focus on progressive overload.',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/30',
        icon: CheckCircle,
      };
    }
    if (summary.optimal > 0 && belowMev.length === 0) {
      return {
        status: 'good' as const,
        headline: `${summary.optimal} muscle${summary.optimal > 1 ? 's' : ''} in optimal range`,
        detail: summary.maintenance > 0
          ? `${summary.maintenance} at maintenance — bump toward MAV for more growth.`
          : 'On track. No critical gaps.',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/30',
        icon: CheckCircle,
      };
    }
    if (belowMev.length > 0) {
      const worst = belowMev.reduce((a, b) => (a.landmarks.mev - a.sets > b.landmarks.mev - b.sets ? a : b));
      const needed = Math.ceil(worst.landmarks.mev - worst.sets);
      return {
        status: 'warning' as const,
        headline: `${worst.label}: ${needed} more set${needed > 1 ? 's' : ''} to reach MEV`,
        detail: belowMev.length > 1
          ? `${belowMev.length} groups below minimum effective volume.`
          : `${formatSets(worst.sets)} of ${worst.landmarks.mev} MEV. Stimulus is too low for adaptation.`,
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10 border-yellow-500/30',
        icon: AlertTriangle,
      };
    }
    return {
      status: 'good' as const,
      headline: 'Volume on track',
      detail: `${summary.optimal} optimal, ${summary.maintenance} maintenance.`,
      color: 'text-grappler-200',
      bg: 'bg-grappler-700/50 border-grappler-600/30',
      icon: CheckCircle,
    };
  }, [muscleData, summary]);

  // Mesocycle context
  const mesocycleInfo = useMemo(() => {
    if (!currentMesocycle) return null;
    return {
      name: currentMesocycle.name || 'Current Block',
      weekCount: currentMesocycle.weeks?.length || 0,
    };
  }, [currentMesocycle]);

  // Split muscles into zones for grouped display
  const { optimalMuscles, maintenanceMuscles, actionMuscles, notTargetedMuscles } = useMemo(() => ({
    optimalMuscles: muscleData.filter(d => d.zone === 'mav_to_mrv'),
    maintenanceMuscles: muscleData.filter(d => d.zone === 'mev_to_mav'),
    actionMuscles: muscleData.filter(d => d.zone === 'below_mev' || d.zone === 'above_mrv'),
    notTargetedMuscles: muscleData.filter(d => d.zone === 'not_targeted'),
  }), [muscleData]);

  return (
    <motion.div
      className="min-h-screen bg-grappler-900 pb-24 safe-area-top safe-area-bottom"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-grappler-900/95 backdrop-blur-sm border-b border-grappler-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <button aria-label="Go back" onClick={onClose}
            className="p-2 -ml-2 rounded-lg hover:bg-grappler-800 transition-colors">
            <ChevronLeft className="w-5 h-5 text-grappler-200" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-grappler-50">Weekly Volume</h1>
            <p className="text-xs text-grappler-400">
              Personalized MEV / MAV / MRV landmarks
            </p>
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <TrendingUp className="w-12 h-12 text-grappler-600 mb-4" />
          <h2 className="text-lg font-semibold text-grappler-200 mb-2">No Data Yet</h2>
          <p className="text-grappler-400 text-sm max-w-xs">
            Complete some workouts to see your weekly volume tracked against personalized landmarks.
          </p>
        </div>
      ) : (
        <motion.div className="px-4 py-4 space-y-4" variants={stagger} initial="hidden" animate="visible">

          {/* 1. VERDICT */}
          <motion.div variants={fadeUp} className={cn('card p-4 border', verdict.bg)}>
            <div className="flex items-start gap-3">
              <verdict.icon className={cn('w-6 h-6 mt-0.5 flex-shrink-0', verdict.color)} />
              <div className="min-w-0">
                <h2 className={cn('text-base font-bold leading-snug', verdict.color)}>
                  {verdict.headline}
                </h2>
                <p className="text-sm text-grappler-300 mt-1">{verdict.detail}</p>
              </div>
            </div>
            {/* Summary strip */}
            <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-grappler-700/50">
              <SummaryPill count={summary.optimal} label="Optimal" color="text-emerald-400" />
              <SummaryPill count={summary.maintenance} label="Maint." color="text-yellow-400" />
              <SummaryPill count={summary.low} label="Low" color="text-red-400" />
              <SummaryPill count={summary.over} label="Over" color="text-orange-400" />
            </div>
          </motion.div>

          {/* 2. VOLUME BARS — grouped by zone, wins first */}
          {/* Optimal muscles first — positive reinforcement */}
          {optimalMuscles.length > 0 && (
            <motion.div variants={fadeUp} className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-emerald-400">Growth Zone</h3>
                <span className="text-xs text-grappler-500">{optimalMuscles.length} muscle{optimalMuscles.length > 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-1">
                {optimalMuscles.map((d, i) => (
                  <MuscleRow key={d.muscle} data={d} index={i}
                    expanded={expandedMuscle === d.muscle}
                    onToggle={() => setExpandedMuscle(expandedMuscle === d.muscle ? null : d.muscle)} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Maintenance */}
          {maintenanceMuscles.length > 0 && (
            <motion.div variants={fadeUp} className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-yellow-400" />
                <h3 className="text-sm font-semibold text-yellow-400">Maintenance</h3>
                <span className="text-xs text-grappler-500">{maintenanceMuscles.length} muscle{maintenanceMuscles.length > 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-1">
                {maintenanceMuscles.map((d, i) => (
                  <MuscleRow key={d.muscle} data={d} index={i}
                    expanded={expandedMuscle === d.muscle}
                    onToggle={() => setExpandedMuscle(expandedMuscle === d.muscle ? null : d.muscle)} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Action needed — below MEV or above MRV */}
          {actionMuscles.length > 0 && (
            <motion.div variants={fadeUp} className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-grappler-50">Needs Attention</h3>
                <span className="text-xs text-grappler-500">{actionMuscles.length} muscle{actionMuscles.length > 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-1">
                {actionMuscles.map((d, i) => (
                  <MuscleRow key={d.muscle} data={d} index={i}
                    expanded={expandedMuscle === d.muscle}
                    onToggle={() => setExpandedMuscle(expandedMuscle === d.muscle ? null : d.muscle)} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Not targeted — collapsed, low-key */}
          {notTargetedMuscles.length > 0 && (
            <NotTargetedSection muscles={notTargetedMuscles} />
          )}

          {/* Mesocycle context */}
          {mesocycleInfo && (
            <motion.div variants={fadeUp} className="card p-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-grappler-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-grappler-400">
                  <span className="text-grappler-200 font-medium">{mesocycleInfo.name}</span> — {mesocycleInfo.weekCount} week{mesocycleInfo.weekCount !== 1 ? 's' : ''} planned.
                  Volume should climb from MEV toward MRV across weeks, then deload.
                </p>
              </div>
            </motion.div>
          )}

          {/* Legend */}
          <motion.div variants={fadeUp} className="card p-3">
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
              <LegendItem color="bg-red-500/60" label="Below MEV" sublabel="insufficient" />
              <LegendItem color="bg-yellow-500/60" label="MEV–MAV" sublabel="maintenance" />
              <LegendItem color="bg-emerald-500/60" label="MAV–MRV" sublabel="growth" />
              <LegendItem color="bg-orange-500/60" label="Above MRV" sublabel="overreaching" />
            </div>
            <p className="text-xs text-grappler-500 mt-2">
              MEV = Min Effective Volume &bull; MAV = Max Adaptive Volume &bull; MRV = Max Recoverable Volume
            </p>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function SummaryPill({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div className="text-center">
      <div className={cn('text-sm font-bold', color)}>{count}</div>
      <div className="text-xs text-grappler-500">{label}</div>
    </div>
  );
}

function LegendItem({ color, label, sublabel }: { color: string; label: string; sublabel: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('w-3 h-3 rounded-sm', color)} />
      <span className="text-grappler-300">{label} <span className="text-grappler-500">({sublabel})</span></span>
    </div>
  );
}

/** Individual muscle row: bar + zone + delta + expandable detail */
function MuscleRow({
  data, index, expanded, onToggle,
}: {
  data: MuscleVolumeData; index: number; expanded: boolean; onToggle: () => void;
}) {
  const { muscle, label, sets, delta, landmarks, zone } = data;
  const { mev, mav, mrv, confidence } = landmarks;
  const zoneConf = ZONE_CONFIG[zone];
  const conf = CONFIDENCE_BADGE[confidence];

  // Bar: 0 to mrv * 1.25 (show overflow)
  const barMax = mrv * 1.25;
  const mevPct = (mev / barMax) * 100;
  const mavPct = (mav / barMax) * 100;
  const mrvPct = (mrv / barMax) * 100;
  const fillPct = Math.min((sets / barMax) * 100, 100);
  const markerPct = Math.min((sets / barMax) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="py-1.5"
    >
      {/* Header: name, confidence badge, delta, set count */}
      <button onClick={onToggle} className="w-full flex items-center justify-between mb-1 group">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('text-sm font-medium', zoneConf.color)}>{label}</span>
          <span className={cn('text-[10px] px-1 py-0.5 rounded font-medium', conf.bg, conf.color)}>
            {conf.label}
          </span>
          <span className={cn('text-[10px] px-1 py-0.5 rounded-full font-medium', zoneConf.bgColor, zoneConf.color)}>
            {zoneConf.label}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Week-over-week delta */}
          {delta !== 0 && (
            <span className={cn('text-xs flex items-center gap-0.5',
              delta > 0 ? 'text-emerald-400' : 'text-red-400'
            )}>
              {delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {delta > 0 ? '+' : ''}{formatSets(delta)}
            </span>
          )}
          {delta === 0 && sets > 0 && (
            <span className="text-xs text-grappler-500 flex items-center gap-0.5">
              <Minus className="w-3 h-3" />
            </span>
          )}
          <span className="text-sm tabular-nums text-grappler-200 font-semibold">
            {formatSets(sets)} <span className="text-grappler-400 font-normal text-xs">sets</span>
          </span>
        </div>
      </button>

      {/* Zone bar with landmark ticks */}
      <div className="relative h-4 rounded-md overflow-hidden bg-grappler-800/80">
        {/* Zone bands */}
        <div className="absolute inset-y-0 left-0 bg-red-500/10" style={{ width: `${mevPct}%` }} />
        <div className="absolute inset-y-0 bg-yellow-500/10" style={{ left: `${mevPct}%`, width: `${mavPct - mevPct}%` }} />
        <div className="absolute inset-y-0 bg-emerald-500/10" style={{ left: `${mavPct}%`, width: `${mrvPct - mavPct}%` }} />
        <div className="absolute inset-y-0 bg-orange-500/10" style={{ left: `${mrvPct}%`, right: 0 }} />

        {/* Fill bar */}
        <motion.div
          className={cn('absolute inset-y-0 left-0 rounded-md', zoneConf.fillColor)}
          style={{ opacity: 0.65 }}
          initial={{ width: 0 }}
          animate={{ width: `${fillPct}%` }}
          transition={{ duration: 0.6, delay: index * 0.03, ease: 'easeOut' }}
        />

        {/* Tick marks */}
        <div className="absolute inset-y-0 w-px bg-red-400/50" style={{ left: `${mevPct}%` }} />
        <div className="absolute inset-y-0 w-px bg-yellow-400/50" style={{ left: `${mavPct}%` }} />
        <div className="absolute inset-y-0 w-px bg-orange-400/50" style={{ left: `${mrvPct}%` }} />

        {/* Current position marker — white diamond */}
        {sets > 0 && (
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-sm rotate-45 shadow-md shadow-white/20 border border-white/60 z-10"
            style={{ left: `${markerPct}%`, marginLeft: '-4px' }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.03 + 0.3, type: 'spring', stiffness: 300 }}
          />
        )}
      </div>

      {/* Landmark numbers — only show MEV and MRV to reduce clutter */}
      <div className="relative h-3 mt-0.5">
        <span className="absolute text-[10px] text-grappler-500 tabular-nums" style={{ left: `${mevPct}%`, transform: 'translateX(-50%)' }}>{mev}</span>
        <span className="absolute text-[10px] text-grappler-500 tabular-nums" style={{ left: `${mavPct}%`, transform: 'translateX(-50%)' }}>{mav}</span>
        <span className="absolute text-[10px] text-grappler-500 tabular-nums" style={{ left: `${mrvPct}%`, transform: 'translateX(-50%)' }}>{mrv}</span>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1 bg-grappler-800/50 rounded-lg p-3 text-xs space-y-2">
              {/* Landmark grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-red-400 font-semibold">{mev}</div>
                  <div className="text-grappler-500">MEV</div>
                </div>
                <div>
                  <div className="text-yellow-400 font-semibold">{mav}</div>
                  <div className="text-grappler-500">MAV</div>
                </div>
                <div>
                  <div className="text-orange-400 font-semibold">{mrv}</div>
                  <div className="text-grappler-500">MRV</div>
                </div>
              </div>

              <div className="border-t border-grappler-700/50 pt-2">
                <MuscleGuidance zone={zone} sets={sets} mev={mev} mav={mav} mrv={mrv} muscle={muscle} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** Zone-specific guidance text — positive framing */
function MuscleGuidance({ zone, sets, mev, mav, mrv, muscle }: {
  zone: VolumeZone; sets: number; mev: number; mav: number; mrv: number; muscle: MuscleGroup;
}) {
  const suggestions = getExerciseSuggestions(muscle);
  const suggestionText = suggestions.length > 0 ? ` Try ${suggestions.join(' or ')}.` : '';

  switch (zone) {
    case 'not_targeted':
      return (
        <p className="text-grappler-400">
          No direct sets this week. If this muscle is a priority, aim for <span className="text-grappler-200 font-medium">{mev}+ sets</span>.{suggestionText}
        </p>
      );
    case 'below_mev':
      return (
        <p className="text-grappler-400">
          <span className="text-grappler-200 font-medium">{Math.ceil(mev - sets)} more set{Math.ceil(mev - sets) > 1 ? 's' : ''}</span> to reach MEV. Below this, stimulus is too low for meaningful adaptation.{suggestionText}
        </p>
      );
    case 'mev_to_mav':
      return (
        <p className="text-grappler-400">
          Holding muscle. Add <span className="text-grappler-200 font-medium">{Math.ceil(mav - sets)} sets</span> to enter the growth zone where gains accelerate.
        </p>
      );
    case 'mav_to_mrv':
      return (
        <p className="text-grappler-400">
          In the sweet spot. <span className="text-emerald-400 font-medium">{Math.ceil(mrv - sets)} sets</span> of headroom before MRV. Maintain this and focus on progressive overload.
        </p>
      );
    case 'above_mrv':
      return (
        <p className="text-grappler-400">
          <span className="text-orange-400 font-medium">{Math.ceil(sets - mrv)} set{Math.ceil(sets - mrv) > 1 ? 's' : ''}</span> past your recovery limit. Drop volume or take a deload — more isn&apos;t better past this point.
        </p>
      );
  }
}

/** Collapsed section for muscles with zero volume */
function NotTargetedSection({ muscles }: { muscles: MuscleVolumeData[] }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div variants={fadeUp} className="card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-grappler-400">Not targeted this week</span>
          <span className="text-xs text-grappler-500">{muscles.length}</span>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-grappler-500 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 flex flex-wrap gap-2">
              {muscles.map(d => (
                <span key={d.muscle} className="text-xs bg-grappler-800 text-grappler-400 px-2.5 py-1 rounded-full">
                  {d.label}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
