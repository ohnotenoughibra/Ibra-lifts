'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Thermometer,
  Heart,
  AlertTriangle,
  Check,
  ChevronRight,
  Plus,
  Activity,
  Clock,
  Shield,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type {
  IllnessSymptom,
  IllnessSymptomLocation,
  IllnessSeverity,
  IllnessDailyCheckin,
  IllnessLog,
} from '@/lib/types';
import {
  getSymptomLabel,
  getSymptomsByLocation,
  autoDetectSeverity,
  getIllnessTrainingRecommendation,
  getIllnessDurationDays,
  shouldMarkResolved,
} from '@/lib/illness-engine';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface IllnessLoggerProps {
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SYMPTOM_LOCATION_GROUPS: { location: IllnessSymptomLocation; label: string; icon: string }[] = [
  { location: 'above_neck', label: 'Above Neck', icon: 'head' },
  { location: 'below_neck', label: 'Below Neck', icon: 'chest' },
  { location: 'systemic', label: 'Systemic', icon: 'body' },
];

const SEVERITY_OPTIONS: { value: IllnessSeverity; label: string; color: string }[] = [
  { value: 'mild', label: 'Mild', color: 'bg-green-500/20 border-green-500/50 text-green-400' },
  { value: 'moderate', label: 'Moderate', color: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' },
  { value: 'severe', label: 'Severe', color: 'bg-red-500/20 border-red-500/50 text-red-400' },
];

const LEVEL_LABELS: Record<number, string> = {
  1: 'Very Low',
  2: 'Low',
  3: 'Moderate',
  4: 'Good',
  5: 'Excellent',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function severityBadgeClass(severity: IllnessSeverity): string {
  switch (severity) {
    case 'mild':
      return 'bg-green-500/20 text-green-400';
    case 'moderate':
      return 'bg-yellow-500/20 text-yellow-400';
    case 'severe':
      return 'bg-red-500/20 text-red-400';
  }
}

function statusBadgeClass(status: IllnessLog['status']): string {
  switch (status) {
    case 'active':
      return 'bg-red-500/20 text-red-400';
    case 'recovering':
      return 'bg-yellow-500/20 text-yellow-400';
    case 'resolved':
      return 'bg-green-500/20 text-green-400';
  }
}

function statusLabel(status: IllnessLog['status']): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'recovering':
      return 'Recovering';
    case 'resolved':
      return 'Resolved';
  }
}

// ---------------------------------------------------------------------------
// Symptom Checklist Sub-Component
// ---------------------------------------------------------------------------

function SymptomChecklist({
  selected,
  onToggle,
}: {
  selected: IllnessSymptom[];
  onToggle: (symptom: IllnessSymptom) => void;
}) {
  return (
    <div className="space-y-4">
      {SYMPTOM_LOCATION_GROUPS.map((group) => {
        const symptoms = getSymptomsByLocation(group.location);
        return (
          <div key={group.location}>
            <label className="text-xs text-grappler-400 mb-2 block font-medium uppercase tracking-wide">
              {group.label}
            </label>
            <div className="flex flex-wrap gap-2">
              {symptoms.map((symptom) => {
                const isSelected = selected.includes(symptom);
                return (
                  <button
                    key={symptom}
                    type="button"
                    onClick={() => onToggle(symptom)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border',
                      isSelected
                        ? group.location === 'above_neck'
                          ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                          : group.location === 'below_neck'
                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                            : 'bg-red-500/20 border-red-500/50 text-red-400'
                        : 'bg-grappler-700 border-grappler-600 text-grappler-400 hover:border-grappler-500',
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                    {getSymptomLabel(symptom)}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Level Picker Sub-Component (1-5)
// ---------------------------------------------------------------------------

function LevelPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: 1 | 2 | 3 | 4 | 5;
  onChange: (v: 1 | 2 | 3 | 4 | 5) => void;
}) {
  return (
    <div>
      <label className="text-xs text-grappler-400 mb-1.5 block">
        {label}
        <span className="ml-2 text-grappler-500">({LEVEL_LABELS[value]})</span>
      </label>
      <div className="flex gap-2">
        {([1, 2, 3, 4, 5] as const).map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            className={cn(
              'flex-1 py-2 rounded-lg text-center text-sm font-bold transition-all duration-200 border',
              value === level
                ? level <= 2
                  ? 'bg-red-500/20 border-red-500/50 text-red-400'
                  : level === 3
                    ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                    : 'bg-green-500/20 border-green-500/50 text-green-400'
                : 'bg-grappler-700 border-grappler-600 text-grappler-400 hover:border-grappler-500',
            )}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function IllnessLogger({ onClose }: IllnessLoggerProps) {
  const {
    illnessLogs,
    logIllness,
    updateIllnessCheckin,
    updateIllnessStatus,
    resolveIllness,
    deleteIllness,
    getActiveIllness,
  } = useAppStore();

  // ── UI State ──────────────────────────────────────────────────────────
  const [view, setView] = useState<'main' | 'new' | 'checkin'>('main');
  const [showHistory, setShowHistory] = useState(false);

  // ── New Illness Form State ────────────────────────────────────────────
  const [newSymptoms, setNewSymptoms] = useState<IllnessSymptom[]>([]);
  const [newFever, setNewFever] = useState(false);
  const [newTemperature, setNewTemperature] = useState('');
  const [newDoctorVisit, setNewDoctorVisit] = useState(false);
  const [newNotes, setNewNotes] = useState('');

  // ── Check-In Form State ───────────────────────────────────────────────
  const [checkinSymptoms, setCheckinSymptoms] = useState<IllnessSymptom[]>([]);
  const [checkinSeverity, setCheckinSeverity] = useState<IllnessSeverity>('moderate');
  const [checkinFever, setCheckinFever] = useState(false);
  const [checkinTemperature, setCheckinTemperature] = useState('');
  const [checkinEnergy, setCheckinEnergy] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [checkinAppetite, setCheckinAppetite] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [checkinSleep, setCheckinSleep] = useState<1 | 2 | 3 | 4 | 5>(3);

  // ── Derived Data ──────────────────────────────────────────────────────
  const activeIllness = getActiveIllness();

  const resolvedIllnesses = useMemo(
    () =>
      illnessLogs
        .filter((il) => il.status === 'resolved')
        .sort(
          (a, b) =>
            new Date(b.endDate ?? b.startDate).getTime() -
            new Date(a.endDate ?? a.startDate).getTime(),
        ),
    [illnessLogs],
  );

  const recommendation = useMemo(
    () => (activeIllness ? getIllnessTrainingRecommendation(activeIllness) : null),
    [activeIllness],
  );

  const autoSeverity = useMemo(
    () => autoDetectSeverity(newSymptoms, newFever),
    [newSymptoms, newFever],
  );

  // ── Symptom Toggle Helpers ────────────────────────────────────────────
  const toggleNewSymptom = (symptom: IllnessSymptom) => {
    setNewSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom],
    );
  };

  const toggleCheckinSymptom = (symptom: IllnessSymptom) => {
    setCheckinSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom],
    );
  };

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleLogNewIllness = () => {
    if (newSymptoms.length === 0) return;
    const temp = newTemperature ? parseFloat(newTemperature) : undefined;

    logIllness({
      startDate: new Date().toISOString().split('T')[0],
      symptoms: newSymptoms,
      severity: autoSeverity,
      hasFever: newFever,
      temperature: temp,
      doctorVisit: newDoctorVisit,
      notes: newNotes || undefined,
    });

    // Reset form and return to main view
    setNewSymptoms([]);
    setNewFever(false);
    setNewTemperature('');
    setNewDoctorVisit(false);
    setNewNotes('');
    setView('main');
  };

  const handleSubmitCheckin = () => {
    if (!activeIllness) return;
    const temp = checkinTemperature ? parseFloat(checkinTemperature) : undefined;

    const checkin: IllnessDailyCheckin = {
      date: new Date().toISOString().split('T')[0],
      symptoms: checkinSymptoms,
      severity: checkinSeverity,
      hasFever: checkinFever,
      temperature: temp,
      energyLevel: checkinEnergy,
      appetiteLevel: checkinAppetite,
      sleepQuality: checkinSleep,
    };

    updateIllnessCheckin(activeIllness.id, checkin);

    // Auto-resolve if the check-in indicates full recovery
    if (shouldMarkResolved(checkin)) {
      resolveIllness(activeIllness.id);
    }

    // Reset and go back
    setCheckinSymptoms([]);
    setCheckinSeverity('moderate');
    setCheckinFever(false);
    setCheckinTemperature('');
    setCheckinEnergy(3);
    setCheckinAppetite(3);
    setCheckinSleep(3);
    setView('main');
  };

  const openCheckinForm = () => {
    if (!activeIllness) return;
    // Pre-fill with current illness symptoms
    setCheckinSymptoms([...activeIllness.symptoms]);
    setCheckinSeverity(activeIllness.severity);
    setCheckinFever(activeIllness.hasFever);
    setCheckinTemperature(activeIllness.temperature ? String(activeIllness.temperature) : '');
    const lastCheckin = activeIllness.dailyCheckins[activeIllness.dailyCheckins.length - 1];
    if (lastCheckin) {
      setCheckinEnergy(lastCheckin.energyLevel);
      setCheckinAppetite(lastCheckin.appetiteLevel);
      setCheckinSleep(lastCheckin.sleepQuality);
    }
    setView('checkin');
  };

  const handleMarkRecovering = () => {
    if (!activeIllness) return;
    updateIllnessStatus(activeIllness.id, 'recovering');
  };

  const handleMarkResolved = () => {
    if (!activeIllness) return;
    resolveIllness(activeIllness.id);
  };

  // ── Render ────────────────────────────────────────────────────────────
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
            <button onClick={onClose} className="btn btn-ghost btn-sm p-1">
              <X className="w-5 h-5 text-grappler-200" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Thermometer className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h1 className="font-bold text-grappler-50 text-lg leading-tight">
                  Health &amp; Illness
                </h1>
                <p className="text-xs text-grappler-400">
                  Track illness &amp; recovery
                </p>
              </div>
            </div>
          </div>
          {!activeIllness && view === 'main' && (
            <button
              onClick={() => setView('new')}
              className="btn btn-primary btn-sm gap-1"
            >
              <Plus className="w-4 h-4" />
              Log
            </button>
          )}
        </div>
      </header>

      <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          {/* ════════════════════════════════════════════════════════════ */}
          {/* MAIN VIEW                                                  */}
          {/* ════════════════════════════════════════════════════════════ */}
          {view === 'main' && (
            <motion.div
              key="main"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* ── Active Illness Banner ────────────────────────────── */}
              {activeIllness ? (
                <div className="space-y-4">
                  {/* Status Card */}
                  <div
                    className={cn(
                      'rounded-xl p-4 border',
                      activeIllness.status === 'active'
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-yellow-500/10 border-yellow-500/30',
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle
                          className={cn(
                            'w-5 h-5',
                            activeIllness.status === 'active'
                              ? 'text-red-400'
                              : 'text-yellow-400',
                          )}
                        />
                        <div>
                          <span className="font-semibold text-grappler-50 text-sm">
                            Currently Sick
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={cn(
                                'text-xs px-2 py-0.5 rounded-full font-medium',
                                statusBadgeClass(activeIllness.status),
                              )}
                            >
                              {statusLabel(activeIllness.status)}
                            </span>
                            <span
                              className={cn(
                                'text-xs px-2 py-0.5 rounded-full font-medium',
                                severityBadgeClass(activeIllness.severity),
                              )}
                            >
                              {activeIllness.severity.charAt(0).toUpperCase() +
                                activeIllness.severity.slice(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-grappler-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">
                            Day {getIllnessDurationDays(activeIllness)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Current Symptoms */}
                    <div className="mb-3">
                      <p className="text-xs text-grappler-400 mb-1.5">Current symptoms</p>
                      <div className="flex flex-wrap gap-1.5">
                        {activeIllness.symptoms.map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 bg-grappler-800 text-grappler-300 rounded text-xs"
                          >
                            {getSymptomLabel(s)}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={openCheckinForm}
                        className="btn btn-primary btn-sm flex-1 gap-1"
                      >
                        <Activity className="w-4 h-4" />
                        Daily Check-In
                      </button>
                      {activeIllness.status === 'active' && (
                        <button
                          onClick={handleMarkRecovering}
                          className="btn btn-secondary btn-sm flex-1 gap-1"
                        >
                          <Heart className="w-4 h-4" />
                          Mark Recovering
                        </button>
                      )}
                      {activeIllness.status === 'recovering' && (
                        <button
                          onClick={handleMarkResolved}
                          className="btn btn-secondary btn-sm flex-1 gap-1"
                        >
                          <Check className="w-4 h-4" />
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Training Recommendation */}
                  {recommendation && (
                    <div
                      className={cn(
                        'rounded-xl p-4 border',
                        recommendation.canTrain
                          ? 'bg-green-500/10 border-green-500/30'
                          : 'bg-red-500/10 border-red-500/30',
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Shield
                          className={cn(
                            'w-5 h-5',
                            recommendation.canTrain ? 'text-green-400' : 'text-red-400',
                          )}
                        />
                        <span className="font-semibold text-grappler-50 text-sm">
                          Training Recommendation
                        </span>
                      </div>
                      <p
                        className={cn(
                          'text-sm mb-3',
                          recommendation.canTrain ? 'text-green-300' : 'text-red-300',
                        )}
                      >
                        {recommendation.message}
                      </p>
                      <p className="text-xs text-grappler-400 mb-3 leading-relaxed">
                        {recommendation.detailedReason}
                      </p>

                      {recommendation.canTrain && (
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="bg-grappler-800 rounded-lg p-2 text-center">
                            <p className="text-xs text-grappler-400">Max Volume</p>
                            <p className="text-sm font-bold text-grappler-100">
                              {recommendation.maxVolumePercent}%
                            </p>
                          </div>
                          <div className="bg-grappler-800 rounded-lg p-2 text-center">
                            <p className="text-xs text-grappler-400">Max Intensity</p>
                            <p className="text-sm font-bold text-grappler-100">
                              {recommendation.maxIntensityPercent}%
                            </p>
                          </div>
                          <div className="bg-grappler-800 rounded-lg p-2 text-center">
                            <p className="text-xs text-grappler-400">RPE Cap</p>
                            <p className="text-sm font-bold text-grappler-100">
                              {recommendation.rpeCap}
                            </p>
                          </div>
                        </div>
                      )}

                      {recommendation.suggestedActivities.length > 0 && (
                        <div>
                          <p className="text-xs text-grappler-400 mb-1">Suggested activities</p>
                          <div className="flex flex-wrap gap-1.5">
                            {recommendation.suggestedActivities.map((act) => (
                              <span
                                key={act}
                                className="px-2 py-0.5 bg-grappler-800 text-grappler-300 rounded text-xs"
                              >
                                {act}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Check-In History */}
                  {activeIllness.dailyCheckins.length > 1 && (
                    <div className="card p-4">
                      <h3 className="text-sm font-semibold text-grappler-200 mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary-400" />
                        Check-In History
                      </h3>
                      <div className="space-y-2">
                        {[...activeIllness.dailyCheckins]
                          .reverse()
                          .map((ci, idx) => (
                            <div
                              key={ci.date + idx}
                              className="flex items-center justify-between bg-grappler-800 rounded-lg p-2.5"
                            >
                              <div>
                                <p className="text-xs font-medium text-grappler-200">
                                  {new Date(ci.date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </p>
                                <p className="text-xs text-grappler-400">
                                  {ci.symptoms.length} symptom{ci.symptoms.length !== 1 ? 's' : ''}{' '}
                                  &middot; {ci.severity}
                                </p>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-grappler-400">
                                <span title="Energy">E:{ci.energyLevel}</span>
                                <span title="Appetite">A:{ci.appetiteLevel}</span>
                                <span title="Sleep">S:{ci.sleepQuality}</span>
                                {ci.hasFever && (
                                  <Thermometer className="w-3.5 h-3.5 text-red-400" />
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ── No Active Illness ────────────────────────────── */
                <div className="bg-grappler-800/50 rounded-xl p-6 text-center">
                  <Shield className="w-10 h-10 text-green-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-grappler-100 mb-1">Feeling Healthy</h3>
                  <p className="text-sm text-grappler-400 mb-4">
                    No active illness. If you start feeling unwell, log it to get training
                    recommendations.
                  </p>
                  <button
                    onClick={() => setView('new')}
                    className="btn btn-primary gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Log New Illness
                  </button>
                </div>
              )}

              {/* ── Illness History ─────────────────────────────────── */}
              {resolvedIllnesses.length > 0 && (
                <div className="space-y-3">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="w-full flex items-center justify-between text-sm font-semibold text-grappler-400 hover:text-grappler-200 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-400" />
                      Past Illnesses ({resolvedIllnesses.length})
                    </span>
                    <motion.span
                      animate={{ rotate: showHistory ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-grappler-500"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </motion.span>
                  </button>

                  <AnimatePresence>
                    {showHistory && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-2"
                      >
                        {resolvedIllnesses.map((illness) => {
                          const duration = getIllnessDurationDays(illness);
                          return (
                            <div
                              key={illness.id}
                              className="bg-grappler-800/50 rounded-xl p-3 flex items-start justify-between opacity-70"
                            >
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={cn(
                                      'text-xs px-2 py-0.5 rounded-full font-medium',
                                      severityBadgeClass(illness.severity),
                                    )}
                                  >
                                    {illness.severity.charAt(0).toUpperCase() +
                                      illness.severity.slice(1)}
                                  </span>
                                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                                    Resolved
                                  </span>
                                  <span className="text-xs text-grappler-400">
                                    {duration} day{duration !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-grappler-400">
                                  <span>
                                    {new Date(illness.startDate).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </span>
                                  {illness.endDate && (
                                    <>
                                      <span>&mdash;</span>
                                      <span>
                                        {new Date(illness.endDate).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                        })}
                                      </span>
                                    </>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {illness.symptoms.slice(0, 4).map((s) => (
                                    <span
                                      key={s}
                                      className="px-1.5 py-0.5 bg-grappler-700 text-grappler-400 rounded text-xs"
                                    >
                                      {getSymptomLabel(s)}
                                    </span>
                                  ))}
                                  {illness.symptoms.length > 4 && (
                                    <span className="px-1.5 py-0.5 text-grappler-400 text-xs">
                                      +{illness.symptoms.length - 4} more
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => deleteIllness(illness.id)}
                                className="p-1.5 rounded-lg hover:bg-red-500/20 text-grappler-500 hover:text-red-400 transition-colors shrink-0"
                                title="Delete"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* NEW ILLNESS FORM                                           */}
          {/* ════════════════════════════════════════════════════════════ */}
          {view === 'new' && (
            <motion.div
              key="new"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              <div className="bg-grappler-800 rounded-xl p-4 space-y-5 border border-grappler-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-grappler-50 text-sm">Log New Illness</h3>
                  <button
                    onClick={() => setView('main')}
                    className="p-1 rounded hover:bg-grappler-700 text-grappler-400 hover:text-grappler-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Symptom Picker */}
                <div>
                  <label className="text-xs text-grappler-400 mb-2 block font-medium">
                    What symptoms are you experiencing?
                  </label>
                  <SymptomChecklist selected={newSymptoms} onToggle={toggleNewSymptom} />
                </div>

                {/* Auto-detected Severity */}
                {newSymptoms.length > 0 && (
                  <div>
                    <label className="text-xs text-grappler-400 mb-1.5 block">
                      Auto-detected Severity
                    </label>
                    <div className="flex gap-2">
                      {SEVERITY_OPTIONS.map((opt) => (
                        <div
                          key={opt.value}
                          className={cn(
                            'flex-1 py-2 rounded-lg text-center text-xs font-medium border transition-all',
                            autoSeverity === opt.value
                              ? opt.color
                              : 'bg-grappler-700 border-grappler-600 text-grappler-500',
                          )}
                        >
                          {autoSeverity === opt.value && (
                            <Check className="w-3 h-3 inline mr-1" />
                          )}
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fever Toggle */}
                <div>
                  <label className="text-xs text-grappler-400 mb-1.5 block">Fever</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setNewFever(!newFever)}
                      className={cn(
                        'relative w-12 h-6 rounded-full transition-colors duration-200',
                        newFever ? 'bg-red-500' : 'bg-grappler-600',
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200',
                          newFever ? 'translate-x-6' : 'translate-x-0',
                        )}
                      />
                    </button>
                    <span className="text-sm text-grappler-300">
                      {newFever ? 'Yes' : 'No fever'}
                    </span>
                  </div>
                  <AnimatePresence>
                    {newFever && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 flex items-center gap-2">
                          <Thermometer className="w-4 h-4 text-red-400" />
                          <input
                            type="number"
                            step="0.1"
                            value={newTemperature}
                            onChange={(e) => setNewTemperature(e.target.value)}
                            placeholder="Temperature (optional, e.g. 101.3)"
                            className="input flex-1"
                          />
                          <span className="text-xs text-grappler-400">&deg;F</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Doctor Visit Toggle */}
                <div>
                  <label className="text-xs text-grappler-400 mb-1.5 block">
                    Doctor Visit
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setNewDoctorVisit(!newDoctorVisit)}
                      className={cn(
                        'relative w-12 h-6 rounded-full transition-colors duration-200',
                        newDoctorVisit ? 'bg-primary-500' : 'bg-grappler-600',
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200',
                          newDoctorVisit ? 'translate-x-6' : 'translate-x-0',
                        )}
                      />
                    </button>
                    <span className="text-sm text-grappler-300">
                      {newDoctorVisit ? 'Visited doctor' : 'No doctor visit'}
                    </span>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs text-grappler-400 mb-1.5 block">
                    Notes (optional)
                  </label>
                  <textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Any additional details about how you're feeling..."
                    rows={2}
                    className="input w-full resize-none"
                  />
                </div>

                {/* Submit */}
                <button
                  onClick={handleLogNewIllness}
                  disabled={newSymptoms.length === 0}
                  className={cn(
                    'btn btn-primary w-full gap-2',
                    newSymptoms.length === 0 && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  <Plus className="w-4 h-4" />
                  Log Illness
                </button>
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* DAILY CHECK-IN FORM                                        */}
          {/* ════════════════════════════════════════════════════════════ */}
          {view === 'checkin' && activeIllness && (
            <motion.div
              key="checkin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              <div className="bg-grappler-800 rounded-xl p-4 space-y-5 border border-grappler-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-grappler-50 text-sm">
                    Daily Check-In &mdash; Day {getIllnessDurationDays(activeIllness)}
                  </h3>
                  <button
                    onClick={() => setView('main')}
                    className="p-1 rounded hover:bg-grappler-700 text-grappler-400 hover:text-grappler-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Symptom Checklist */}
                <div>
                  <label className="text-xs text-grappler-400 mb-2 block font-medium">
                    Current Symptoms
                  </label>
                  <SymptomChecklist
                    selected={checkinSymptoms}
                    onToggle={toggleCheckinSymptom}
                  />
                  {checkinSymptoms.length === 0 && (
                    <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      No symptoms selected &mdash; you may be recovered!
                    </p>
                  )}
                </div>

                {/* Severity Picker */}
                <div>
                  <label className="text-xs text-grappler-400 mb-1.5 block">Severity</label>
                  <div className="flex gap-2">
                    {SEVERITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setCheckinSeverity(opt.value)}
                        className={cn(
                          'flex-1 py-2 rounded-lg text-center text-xs font-medium border transition-all',
                          checkinSeverity === opt.value
                            ? opt.color
                            : 'bg-grappler-700 border-grappler-600 text-grappler-400 hover:border-grappler-500',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fever Toggle */}
                <div>
                  <label className="text-xs text-grappler-400 mb-1.5 block">Fever</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCheckinFever(!checkinFever)}
                      className={cn(
                        'relative w-12 h-6 rounded-full transition-colors duration-200',
                        checkinFever ? 'bg-red-500' : 'bg-grappler-600',
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200',
                          checkinFever ? 'translate-x-6' : 'translate-x-0',
                        )}
                      />
                    </button>
                    <span className="text-sm text-grappler-300">
                      {checkinFever ? 'Yes' : 'No fever'}
                    </span>
                  </div>
                  <AnimatePresence>
                    {checkinFever && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 flex items-center gap-2">
                          <Thermometer className="w-4 h-4 text-red-400" />
                          <input
                            type="number"
                            step="0.1"
                            value={checkinTemperature}
                            onChange={(e) => setCheckinTemperature(e.target.value)}
                            placeholder="Temperature (optional)"
                            className="input flex-1"
                          />
                          <span className="text-xs text-grappler-400">&deg;F</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Energy Level */}
                <LevelPicker
                  label="Energy Level"
                  value={checkinEnergy}
                  onChange={setCheckinEnergy}
                />

                {/* Appetite Level */}
                <LevelPicker
                  label="Appetite Level"
                  value={checkinAppetite}
                  onChange={setCheckinAppetite}
                />

                {/* Sleep Quality */}
                <LevelPicker
                  label="Sleep Quality"
                  value={checkinSleep}
                  onChange={setCheckinSleep}
                />

                {/* Submit */}
                <button
                  onClick={handleSubmitCheckin}
                  className="btn btn-primary w-full gap-2"
                >
                  <Check className="w-4 h-4" />
                  Submit Check-In
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
