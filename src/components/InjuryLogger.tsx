'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Plus,
  Check,
  X,
  AlertTriangle,
  Activity,
  Heart,
  Trash2,
  Shield,
  TrendingUp,
  Target,
  Dumbbell,
  Info,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import {
  BodyRegion,
  PainSeverity,
  PainType,
  InjuryEntry,
} from '@/lib/types';
import { analyzeInjuryRisks, getPrehabRecommendations, type InjuryAnalysis, type RiskLevel } from '@/lib/injury-prevention';
import { classifyInjury, getInjuryTimeline } from '@/lib/injury-science';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface InjuryLoggerProps {
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BODY_REGIONS: { id: BodyRegion; label: string }[] = [
  { id: 'neck', label: 'Neck' },
  { id: 'left_shoulder', label: 'Left Shoulder' },
  { id: 'right_shoulder', label: 'Right Shoulder' },
  { id: 'chest', label: 'Chest' },
  { id: 'upper_back', label: 'Upper Back' },
  { id: 'lower_back', label: 'Lower Back' },
  { id: 'core', label: 'Core' },
  { id: 'left_elbow', label: 'Left Elbow' },
  { id: 'right_elbow', label: 'Right Elbow' },
  { id: 'left_wrist', label: 'Left Wrist' },
  { id: 'right_wrist', label: 'Right Wrist' },
  { id: 'left_hip', label: 'Left Hip' },
  { id: 'right_hip', label: 'Right Hip' },
  { id: 'left_knee', label: 'Left Knee' },
  { id: 'right_knee', label: 'Right Knee' },
  { id: 'left_ankle', label: 'Left Ankle' },
  { id: 'right_ankle', label: 'Right Ankle' },
];

const SEVERITY_LABELS: Record<PainSeverity, string> = {
  1: 'Mild',
  2: 'Noticeable',
  3: 'Moderate',
  4: 'Significant',
  5: 'Severe',
};

const PAIN_TYPES: { id: PainType; label: string }[] = [
  { id: 'sharp', label: 'Sharp' },
  { id: 'dull', label: 'Dull' },
  { id: 'burning', label: 'Burning' },
  { id: 'stiffness', label: 'Stiffness' },
  { id: 'clicking', label: 'Clicking' },
  { id: 'numbness', label: 'Numbness' },
];

/** Map body regions to muscle groups that should be avoided or modified. */
const REGION_EXERCISE_WARNINGS: Record<BodyRegion, string> = {
  neck: 'neck and upper trap exercises',
  left_shoulder: 'left shoulder pressing and lateral raises',
  right_shoulder: 'right shoulder pressing and lateral raises',
  upper_back: 'rowing and upper back exercises',
  lower_back: 'deadlifts, squats, and spinal loading exercises',
  left_elbow: 'left arm pressing and curling movements',
  right_elbow: 'right arm pressing and curling movements',
  left_wrist: 'left grip-intensive and wrist-loading exercises',
  right_wrist: 'right grip-intensive and wrist-loading exercises',
  left_hip: 'left leg squatting and hip hinge movements',
  right_hip: 'right leg squatting and hip hinge movements',
  left_knee: 'left leg squats, lunges, and leg extensions',
  right_knee: 'right leg squats, lunges, and leg extensions',
  left_ankle: 'left leg calf raises and standing exercises',
  right_ankle: 'right leg calf raises and standing exercises',
  chest: 'chest pressing and fly movements',
  core: 'core-intensive and heavy bracing exercises',
};

/**
 * Body map region positions (percentage-based) for the front-view silhouette.
 * Each region is placed relative to a 200x300 container.
 */
const BODY_MAP_POSITIONS: Record<BodyRegion, { top: string; left: string }> = {
  neck:            { top: '10%',  left: '50%' },
  left_shoulder:   { top: '17%',  left: '30%' },
  right_shoulder:  { top: '17%',  left: '70%' },
  chest:           { top: '24%',  left: '50%' },
  upper_back:      { top: '20%',  left: '50%' },
  core:            { top: '36%',  left: '50%' },
  lower_back:      { top: '42%',  left: '50%' },
  left_elbow:      { top: '35%',  left: '18%' },
  right_elbow:     { top: '35%',  left: '82%' },
  left_wrist:      { top: '48%',  left: '14%' },
  right_wrist:     { top: '48%',  left: '86%' },
  left_hip:        { top: '50%',  left: '38%' },
  right_hip:       { top: '50%',  left: '62%' },
  left_knee:       { top: '68%',  left: '38%' },
  right_knee:      { top: '68%',  left: '62%' },
  left_ankle:      { top: '86%',  left: '38%' },
  right_ankle:     { top: '86%',  left: '62%' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function severityColor(severity: PainSeverity): string {
  if (severity <= 2) return 'bg-green-500';
  if (severity === 3) return 'bg-yellow-500';
  return 'bg-red-500';
}

function severityTextColor(severity: PainSeverity): string {
  if (severity <= 2) return 'text-green-400';
  if (severity === 3) return 'text-yellow-400';
  return 'text-red-400';
}

function severityBadgeBg(severity: PainSeverity): string {
  if (severity <= 2) return 'bg-green-500/20 text-green-400';
  if (severity === 3) return 'bg-yellow-500/20 text-yellow-400';
  return 'bg-red-500/20 text-red-400';
}

function regionLabel(region: BodyRegion): string {
  return BODY_REGIONS.find((r) => r.id === region)?.label ?? region;
}

function daysSince(date: Date): number {
  const d = new Date(date);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InjuryLogger({ onClose }: InjuryLoggerProps) {
  const { injuryLog, addInjury, resolveInjury, deleteInjury, workoutLogs, trainingSessions, latestWhoopData, user } = useAppStore();

  // UI state
  const [showAddForm, setShowAddForm] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [activeTab, setActiveTab] = useState<'log' | 'prevention'>('prevention');
  const [expandedInjuryId, setExpandedInjuryId] = useState<string | null>(null);

  // Injury prevention analysis
  const analysis = useMemo<InjuryAnalysis>(() => {
    return analyzeInjuryRisks(
      workoutLogs,
      trainingSessions,
      injuryLog,
      latestWhoopData,
      user
    );
  }, [workoutLogs, trainingSessions, injuryLog, latestWhoopData, user]);

  const prehabExercises = useMemo(() => {
    return getPrehabRecommendations(analysis);
  }, [analysis]);

  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case 'critical': return 'text-red-400 bg-red-500/20 border-red-500/50';
      case 'high': return 'text-blue-400 bg-blue-500/20 border-blue-500/50';
      case 'moderate': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
      case 'low': return 'text-green-400 bg-green-500/20 border-green-500/50';
    }
  };

  const getRiskLabel = (level: RiskLevel) => {
    switch (level) {
      case 'critical': return 'Critical Risk';
      case 'high': return 'High Risk';
      case 'moderate': return 'Moderate Risk';
      case 'low': return 'Low Risk';
    }
  };

  // Form state
  const [formRegion, setFormRegion] = useState<BodyRegion>('neck');
  const [formSeverity, setFormSeverity] = useState<PainSeverity>(2);
  const [formPainType, setFormPainType] = useState<PainType>('dull');
  const [formExercise, setFormExercise] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Derived
  const activeInjuries = injuryLog.filter((i) => !i.resolved);
  const resolvedInjuries = injuryLog
    .filter((i) => i.resolved)
    .sort(
      (a, b) =>
        new Date(b.resolvedDate ?? b.date).getTime() -
        new Date(a.resolvedDate ?? a.date).getTime(),
    );

  // Map from region to worst active severity for body map colouring
  const activeRegionSeverity: Partial<Record<BodyRegion, PainSeverity>> = {};
  activeInjuries.forEach((inj) => {
    const current = activeRegionSeverity[inj.bodyRegion];
    if (!current || inj.severity > current) {
      activeRegionSeverity[inj.bodyRegion] = inj.severity;
    }
  });

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const openFormForRegion = (region: BodyRegion) => {
    setFormRegion(region);
    setFormSeverity(2);
    setFormPainType('dull');
    setFormExercise('');
    setFormNotes('');
    setShowAddForm(true);
  };

  const openFormBlank = () => {
    setFormRegion('neck');
    setFormSeverity(2);
    setFormPainType('dull');
    setFormExercise('');
    setFormNotes('');
    setShowAddForm(true);
  };

  const handleSave = () => {
    addInjury({
      date: new Date(),
      bodyRegion: formRegion,
      severity: formSeverity,
      painType: formPainType,
      duringExercise: formExercise || undefined,
      notes: formNotes || undefined,
      resolved: false,
    });
    setShowAddForm(false);
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className="min-h-screen bg-grappler-900 bg-mesh pb-20"
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-grappler-900/80 backdrop-blur-xl border-b border-grappler-800">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button aria-label="Go back" onClick={onClose} className="btn btn-ghost btn-sm p-1">
              <ChevronLeft className="w-5 h-5 text-grappler-200" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                <Heart className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h1 className="font-bold text-grappler-50 text-lg leading-tight">
                  Injury &amp; Pain Log
                </h1>
                <p className="text-xs text-grappler-500">
                  Track &amp; manage injuries
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={openFormBlank}
            className="btn btn-primary btn-sm gap-1"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 pt-2 flex gap-2">
          <button
            onClick={() => setActiveTab('prevention')}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2',
              activeTab === 'prevention'
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/50'
                : 'bg-grappler-800 text-grappler-400 border border-grappler-700 hover:border-grappler-600'
            )}
          >
            <Shield className="w-4 h-4" />
            Prevention
          </button>
          <button
            onClick={() => setActiveTab('log')}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2',
              activeTab === 'log'
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/50'
                : 'bg-grappler-800 text-grappler-400 border border-grappler-700 hover:border-grappler-600'
            )}
          >
            <Heart className="w-4 h-4" />
            Injury Log
            {activeInjuries.length > 0 && (
              <span className="bg-red-500/20 text-red-400 text-xs px-1.5 py-0.5 rounded-full">
                {activeInjuries.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        {/* ══════════════════════════════════════════════════════════════ */}
        {/* PREVENTION TAB */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'prevention' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Overall Risk Status */}
            <div className={cn(
              'rounded-xl p-4 border',
              getRiskColor(analysis.overallRisk)
            )}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  <span className="font-semibold">{getRiskLabel(analysis.overallRisk)}</span>
                </div>
                <span className="text-2xl font-bold">{Math.round((analysis.weeklyLoadScore + analysis.recoveryScore + analysis.muscleBalanceScore) / 3)}/100</span>
              </div>
              <p className="text-sm opacity-80">
                {analysis.overallRisk === 'low' && 'Your training load and recovery are well balanced. Keep it up!'}
                {analysis.overallRisk === 'moderate' && 'Some risk factors detected. Review recommendations below.'}
                {analysis.overallRisk === 'high' && 'Multiple risk factors present. Consider adjusting your training.'}
                {analysis.overallRisk === 'critical' && 'High injury risk detected. Immediate attention recommended.'}
              </p>
            </div>

            {/* Risk Factors */}
            {analysis.risks.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-grappler-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  Risk Factors Detected
                </h3>
                {analysis.risks.map((risk, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'rounded-xl p-4 border',
                      getRiskColor(risk.riskLevel)
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm">{risk.title}</h4>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-black/20">
                        {risk.category}
                      </span>
                    </div>
                    <p className="text-xs opacity-80 mb-3">{risk.description}</p>
                    <div className="bg-black/20 rounded-lg p-2 space-y-1">
                      {risk.recommendations.map((rec, recIdx) => (
                        <p key={recIdx} className="text-xs font-medium flex items-start gap-1.5">
                          <Target className="w-3 h-3 mt-0.5 shrink-0" />
                          {rec}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Positive Factors */}
            {analysis.positiveFactors.length > 0 && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-green-400 flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4" />
                  Positive Factors
                </h3>
                <ul className="space-y-2">
                  {analysis.positiveFactors.map((factor, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-green-300">
                      <Check className="w-4 h-4 shrink-0" />
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Prehab Recommendations */}
            {prehabExercises.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-grappler-200 flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-primary-400" />
                  Recommended Prehab Exercises
                </h3>
                <div className="grid gap-2">
                  {prehabExercises.map((exercise, idx) => (
                    <div
                      key={idx}
                      className="bg-grappler-800 rounded-xl p-3 border border-grappler-700"
                    >
                      <h4 className="font-medium text-sm text-grappler-100 mb-2">{exercise.exercise}</h4>
                      <div className="flex items-center gap-3 text-xs text-grappler-400 mb-2">
                        <span className="bg-grappler-700 px-2 py-0.5 rounded">{exercise.sets}</span>
                        <span>&middot;</span>
                        <span>{exercise.frequency}</span>
                      </div>
                      <p className="text-xs text-primary-400/80 flex items-start gap-1">
                        <Info className="w-3 h-3 mt-0.5 shrink-0" />
                        {exercise.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Risks State */}
            {analysis.risks.length === 0 && analysis.positiveFactors.length === 0 && (
              <div className="bg-grappler-800/50 rounded-xl p-6 text-center">
                <Shield className="w-10 h-10 text-green-400 mx-auto mb-3" />
                <h3 className="font-semibold text-grappler-100 mb-1">All Clear!</h3>
                <p className="text-sm text-grappler-400">
                  No significant injury risks detected. Keep training smart!
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* INJURY LOG TAB */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'log' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
        {/* ── Load Management Alerts ───────────────────────────────────── */}
        <AnimatePresence>
          {activeInjuries.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2"
            >
              {activeInjuries.map((inj) => (
                <div
                  key={`alert-${inj.id}`}
                  className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3"
                >
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-300 leading-relaxed">
                    <span className="font-semibold text-red-200">
                      {regionLabel(inj.bodyRegion)}
                    </span>{' '}
                    &mdash; Exercises targeting{' '}
                    {REGION_EXERCISE_WARNINGS[inj.bodyRegion]} should be
                    modified or avoided.
                  </p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Body Map ─────────────────────────────────────────────────── */}
        <div className="bg-grappler-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-grappler-200 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary-400" />
            Body Map
          </h2>
          <p className="text-xs text-grappler-400 mb-4">
            Tap a region to log pain or injury
          </p>

          {/* Silhouette container */}
          <div className="relative mx-auto" style={{ width: 200, height: 300 }}>
            {/* Body outline -- simplified front-view figure using CSS shapes */}
            <div className="absolute inset-0 flex flex-col items-center">
              {/* Head */}
              <div className="w-10 h-10 rounded-full border-2 border-grappler-600 mt-0" />
              {/* Neck connector */}
              <div className="w-2 h-2 bg-grappler-600 rounded-sm" />
              {/* Torso */}
              <div className="w-20 h-24 border-2 border-grappler-600 rounded-lg" />
              {/* Hips */}
              <div className="w-16 h-4 border-2 border-t-0 border-grappler-600 rounded-b-lg" />
              {/* Legs container */}
              <div className="flex gap-3 mt-0">
                {/* Left leg */}
                <div className="w-5 h-28 border-2 border-grappler-600 rounded-b-lg" />
                {/* Right leg */}
                <div className="w-5 h-28 border-2 border-grappler-600 rounded-b-lg" />
              </div>
            </div>

            {/* Arms (absolute) */}
            {/* Left arm */}
            <div
              className="absolute w-4 h-16 border-2 border-grappler-600 rounded-b-lg"
              style={{ top: '16%', left: '12%', transform: 'rotate(10deg)' }}
            />
            {/* Right arm */}
            <div
              className="absolute w-4 h-16 border-2 border-grappler-600 rounded-b-lg"
              style={{ top: '16%', right: '12%', transform: 'rotate(-10deg)' }}
            />

            {/* Clickable region dots */}
            {BODY_REGIONS.map((region) => {
              const pos = BODY_MAP_POSITIONS[region.id];
              const severity = activeRegionSeverity[region.id];

              return (
                <button
                  key={region.id}
                  onClick={() => openFormForRegion(region.id)}
                  className="absolute flex items-center justify-center group"
                  style={{
                    top: pos.top,
                    left: pos.left,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10,
                  }}
                  title={region.label}
                >
                  {/* Pulse ring for active injuries */}
                  {severity && (
                    <span
                      className={`absolute w-6 h-6 rounded-full animate-ping opacity-30 ${severityColor(severity)}`}
                    />
                  )}
                  {/* Dot */}
                  <span
                    className={`relative w-4 h-4 rounded-full border-2 transition-all duration-200
                      ${
                        severity
                          ? `${severityColor(severity)} border-transparent shadow-lg`
                          : 'bg-grappler-700 border-grappler-500 group-hover:border-primary-400 group-hover:bg-grappler-600'
                      }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-grappler-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              Mild
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              Moderate
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              Severe
            </div>
          </div>
        </div>

        {/* ── Add Injury Form ──────────────────────────────────────────── */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-grappler-800 rounded-xl p-4 space-y-4 border border-grappler-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-grappler-50 text-sm">
                    Log New Injury
                  </h3>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="p-1 rounded hover:bg-grappler-700 text-grappler-400 hover:text-grappler-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body Region */}
                <div>
                  <label className="text-xs text-grappler-400 mb-1.5 block">
                    Body Region
                  </label>
                  <select
                    value={formRegion}
                    onChange={(e) => setFormRegion(e.target.value as BodyRegion)}
                    className="input w-full"
                  >
                    {BODY_REGIONS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pain Severity */}
                <div>
                  <label className="text-xs text-grappler-400 mb-1.5 block">
                    Pain Severity
                  </label>
                  <div className="flex gap-2">
                    {([1, 2, 3, 4, 5] as PainSeverity[]).map((sev) => (
                      <button
                        key={sev}
                        onClick={() => setFormSeverity(sev)}
                        className={`flex-1 py-2 rounded-lg text-center text-xs font-medium transition-all duration-200 border ${
                          formSeverity === sev
                            ? sev <= 2
                              ? 'bg-green-500/20 border-green-500/50 text-green-400'
                              : sev === 3
                                ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                                : 'bg-red-500/20 border-red-500/50 text-red-400'
                            : 'bg-grappler-700 border-grappler-600 text-grappler-400 hover:border-grappler-500'
                        }`}
                      >
                        <span className="block text-base font-bold">{sev}</span>
                        <span className="block mt-0.5 leading-tight">
                          {SEVERITY_LABELS[sev]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pain Type */}
                <div>
                  <label className="text-xs text-grappler-400 mb-1.5 block">
                    Pain Type
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PAIN_TYPES.map((pt) => (
                      <button
                        key={pt.id}
                        onClick={() => setFormPainType(pt.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                          formPainType === pt.id
                            ? 'bg-primary-500/20 border-primary-500/50 text-primary-400'
                            : 'bg-grappler-700 border-grappler-600 text-grappler-400 hover:border-grappler-500'
                        }`}
                      >
                        {pt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Exercise that triggered it */}
                <div>
                  <label className="text-xs text-grappler-400 mb-1.5 block">
                    During Exercise (optional)
                  </label>
                  <input
                    type="text"
                    value={formExercise}
                    onChange={(e) => setFormExercise(e.target.value)}
                    placeholder="e.g., Bench Press, Deadlift, Rolling..."
                    className="input w-full"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs text-grappler-400 mb-1.5 block">
                    Notes (optional)
                  </label>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Any additional details about the pain..."
                    rows={2}
                    className="input w-full resize-none"
                  />
                </div>

                {/* Save */}
                <button
                  onClick={handleSave}
                  className="btn btn-primary w-full gap-2"
                >
                  <Check className="w-4 h-4" />
                  Save Injury
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Active Injuries ──────────────────────────────────────────── */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-grappler-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            Active Injuries
            {activeInjuries.length > 0 && (
              <span className="ml-auto text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                {activeInjuries.length}
              </span>
            )}
          </h2>

          {activeInjuries.length === 0 && (
            <div className="bg-grappler-800/50 rounded-xl p-6 text-center">
              <Heart className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-grappler-400">
                No active injuries. Stay healthy!
              </p>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {activeInjuries.map((injury) => {
              const timeline = getInjuryTimeline(injury);
              const classification = classifyInjury(injury);
              const isExpanded = expandedInjuryId === injury.id;

              return (
              <motion.div
                key={injury.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-grappler-800 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-grappler-50 text-sm">
                        {regionLabel(injury.bodyRegion)}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityBadgeBg(injury.severity)}`}
                      >
                        {SEVERITY_LABELS[injury.severity]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-grappler-400">
                      <span className="capitalize">{injury.painType} pain</span>
                      <span>&middot;</span>
                      <span>{timeline.tissueLabel}</span>
                      <span>&middot;</span>
                      <span>
                        {daysSince(injury.date) === 0
                          ? 'Today'
                          : daysSince(injury.date) === 1
                            ? '1 day ago'
                            : `${daysSince(injury.date)} days ago`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => resolveInjury(injury.id)}
                      className="p-1.5 rounded-lg hover:bg-green-500/20 text-grappler-400 hover:text-green-400 transition-colors"
                      title="Mark Resolved"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteInjury(injury.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-grappler-400 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Heal Timeline Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-primary-400 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeline.phaseLabel}
                    </span>
                    <span className="text-grappler-400">
                      {timeline.estimatedDaysRemaining.max > 0
                        ? `~${timeline.estimatedDaysRemaining.min}-${timeline.estimatedDaysRemaining.max} days remaining`
                        : 'May be healed — test carefully'}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-grappler-700 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        timeline.percentHealed >= 85 ? 'bg-green-500' :
                        timeline.percentHealed >= 50 ? 'bg-yellow-500' :
                        'bg-blue-500'
                      )}
                      style={{ width: `${Math.min(100, timeline.percentHealed)}%` }}
                    />
                  </div>
                  <p className="text-xs text-grappler-500">
                    {timeline.percentHealed}% through estimated recovery ({classification.estimatedHealDays.min}-{classification.estimatedHealDays.max} days)
                  </p>
                </div>

                {/* Expand/Collapse Science Details */}
                <button
                  onClick={() => setExpandedInjuryId(isExpanded ? null : injury.id)}
                  className="w-full flex items-center justify-between text-xs text-primary-400 hover:text-primary-300 transition-colors"
                >
                  <span>Recovery protocol &amp; guidelines</span>
                  <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </motion.span>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-3"
                    >
                      {/* Current Phase Description */}
                      <div className="bg-grappler-700/50 rounded-lg p-3">
                        <p className="text-xs text-grappler-200 leading-relaxed">
                          {classification.phaseDescription}
                        </p>
                      </div>

                      {/* Loading Guidelines */}
                      <div>
                        <h4 className="text-xs font-semibold text-grappler-200 mb-1.5">Loading Guidelines</h4>
                        <ul className="space-y-1">
                          {classification.loadingGuidelines.map((g, idx) => (
                            <li key={idx} className="text-xs text-grappler-400 flex items-start gap-1.5">
                              <Target className="w-3 h-3 mt-0.5 shrink-0 text-primary-400" />
                              {g}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Return Protocol Phases */}
                      <div>
                        <h4 className="text-xs font-semibold text-grappler-200 mb-2">Return-to-Training Protocol</h4>
                        <div className="space-y-2">
                          {classification.returnProtocol.map((p) => {
                            const isCurrent = classification.currentPhase === ['acute', 'subacute', 'remodeling', 'return_to_sport'][p.phase - 1];
                            return (
                              <div
                                key={p.phase}
                                className={cn(
                                  'rounded-lg p-2.5 border text-xs',
                                  isCurrent
                                    ? 'bg-primary-500/10 border-primary-500/40'
                                    : 'bg-grappler-700/30 border-grappler-700'
                                )}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className={cn('font-medium', isCurrent ? 'text-primary-400' : 'text-grappler-300')}>
                                    Phase {p.phase}: {p.name}
                                  </span>
                                  <span className="text-grappler-500">
                                    {p.durationDays.min}-{p.durationDays.max}d
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-grappler-400 mb-1">
                                  <span>Volume: {p.volumeLimit}%</span>
                                  <span>Intensity: {p.intensityLimit}%</span>
                                </div>
                                {isCurrent && (
                                  <div className="mt-1.5 space-y-0.5">
                                    {p.criteria.map((c, ci) => (
                                      <p key={ci} className="text-xs text-primary-300/80">
                                        Criteria: {c}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Exercise Restrictions */}
                      {classification.avoidExerciseIds.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-red-400 mb-1">Avoid These Exercises</h4>
                          <div className="flex flex-wrap gap-1">
                            {classification.avoidExerciseIds.slice(0, 6).map(id => (
                              <span key={id} className="px-2 py-0.5 bg-red-500/15 text-red-400 rounded text-xs">
                                {id.replace(/-/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {classification.modifiedExercises.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-yellow-400 mb-1">Modify These Exercises</h4>
                          {classification.modifiedExercises.map((m, idx) => (
                            <p key={idx} className="text-xs text-grappler-400">
                              <span className="text-yellow-300 capitalize">{m.exerciseId.replace(/-/g, ' ')}</span>: {m.modification}
                            </p>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {injury.duringExercise && (
                  <p className="text-xs text-grappler-400">
                    <span className="text-grappler-500">Triggered by:</span>{' '}
                    {injury.duringExercise}
                  </p>
                )}

                {injury.notes && (
                  <p className="text-xs text-grappler-400 italic">
                    {injury.notes}
                  </p>
                )}
              </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* ── Resolved Injuries ────────────────────────────────────────── */}
        {resolvedInjuries.length > 0 && (
          <div className="space-y-3">
            <button
              onClick={() => setShowResolved(!showResolved)}
              className="w-full flex items-center justify-between text-sm font-semibold text-grappler-400 hover:text-grappler-200 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                Resolved Injuries ({resolvedInjuries.length})
              </span>
              <motion.span
                animate={{ rotate: showResolved ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-grappler-500"
              >
                <ChevronLeft className="w-4 h-4 -rotate-90" />
              </motion.span>
            </button>

            <AnimatePresence>
              {showResolved && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-2"
                >
                  {resolvedInjuries.map((injury) => (
                    <div
                      key={injury.id}
                      className="bg-grappler-800/50 rounded-xl p-3 flex items-start justify-between opacity-70"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-grappler-200 text-sm">
                            {regionLabel(injury.bodyRegion)}
                          </h3>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityBadgeBg(injury.severity)}`}
                          >
                            {SEVERITY_LABELS[injury.severity]}
                          </span>
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                            Resolved
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-grappler-500">
                          <span className="capitalize">{injury.painType}</span>
                          <span>&middot;</span>
                          <span>
                            Logged{' '}
                            {new Date(injury.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          {injury.resolvedDate && (
                            <>
                              <span>&middot;</span>
                              <span>
                                Resolved{' '}
                                {new Date(injury.resolvedDate).toLocaleDateString(
                                  'en-US',
                                  { month: 'short', day: 'numeric' },
                                )}
                              </span>
                            </>
                          )}
                        </div>
                        {injury.duringExercise && (
                          <p className="text-xs text-grappler-500">
                            During: {injury.duringExercise}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteInjury(injury.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-grappler-500 hover:text-red-400 transition-colors shrink-0"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
