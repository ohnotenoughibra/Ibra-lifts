'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Plus,
  Check,
  X,
  Clock,
  Flame,
  Target,
  Calendar,
  Trash2,
  Dumbbell,
  TrendingUp,
  Award,
  ChevronDown,
  Moon,
  Brain,
  Zap,
  Utensils,
  BarChart3,
  Weight,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import {
  ActivityType,
  TrainingIntensity,
  TrainingSession,
  SessionTiming,
  PreWorkoutCheckIn,
  ACTIVITY_CATEGORY_MAP,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface GrapplingTrackerProps {
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTIVITY_TYPES: { id: ActivityType; label: string; short: string }[] = [
  { id: 'bjj_gi', label: 'BJJ Gi', short: 'Gi' },
  { id: 'bjj_nogi', label: 'BJJ No-Gi', short: 'NoGi' },
  { id: 'wrestling', label: 'Wrestling', short: 'Wres' },
  { id: 'mma', label: 'MMA', short: 'MMA' },
  { id: 'judo', label: 'Judo', short: 'Judo' },
  { id: 'boxing', label: 'Boxing', short: 'Box' },
  { id: 'kickboxing', label: 'Kickboxing', short: 'KB' },
  { id: 'muay_thai', label: 'Muay Thai', short: 'MT' },
  { id: 'running', label: 'Running', short: 'Run' },
  { id: 'cycling', label: 'Cycling', short: 'Cyc' },
  { id: 'swimming', label: 'Swimming', short: 'Swm' },
  { id: 'hiking', label: 'Hiking', short: 'Hike' },
  { id: 'yoga', label: 'Yoga', short: 'Yoga' },
  { id: 'other', label: 'Other', short: 'Other' },
];

const INTENSITY_OPTIONS: { id: TrainingIntensity; label: string; color: string }[] = [
  { id: 'light_flow', label: 'Light / Flow', color: 'bg-green-500/20 text-green-400 border-green-500/50' },
  { id: 'moderate', label: 'Moderate', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  { id: 'hard_sparring', label: 'Hard Sparring', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
  { id: 'competition_prep', label: 'Comp Prep', color: 'bg-red-500/20 text-red-400 border-red-500/50' },
];

const TIMING_OPTIONS: { id: SessionTiming; label: string }[] = [
  { id: 'standalone', label: 'Standalone' },
  { id: 'before_lifting', label: 'Before Lifting' },
  { id: 'after_lifting', label: 'After Lifting' },
  { id: 'same_day_separate', label: 'Same Day' },
];

function typeLabel(type: ActivityType): string {
  return ACTIVITY_TYPES.find((t) => t.id === type)?.label ?? type;
}

function typeShort(type: ActivityType): string {
  return ACTIVITY_TYPES.find((t) => t.id === type)?.short ?? type;
}

function intensityLabel(intensity: TrainingIntensity): string {
  return INTENSITY_OPTIONS.find((i) => i.id === intensity)?.label ?? intensity;
}

function intensityColor(intensity: TrainingIntensity): string {
  return INTENSITY_OPTIONS.find((i) => i.id === intensity)?.color ?? '';
}

function typeBadgeColor(type: ActivityType): string {
  switch (type) {
    // Grappling
    case 'bjj_gi': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    case 'bjj_nogi': return 'bg-teal-500/20 text-teal-400 border-teal-500/40';
    case 'wrestling': return 'bg-sky-500/20 text-sky-400 border-sky-500/40';
    case 'judo': return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
    case 'sambo': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40';
    // Striking
    case 'boxing': return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
    case 'kickboxing': return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
    case 'muay_thai': return 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/40';
    case 'karate': return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
    case 'taekwondo': return 'bg-violet-500/20 text-violet-400 border-violet-500/40';
    // MMA
    case 'mma': return 'bg-red-500/20 text-red-400 border-red-500/40';
    // Cardio
    case 'running': return 'bg-sky-500/20 text-sky-400 border-sky-500/40';
    case 'cycling': return 'bg-lime-500/20 text-lime-400 border-lime-500/40';
    case 'swimming': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40';
    case 'rowing': return 'bg-slate-500/20 text-slate-400 border-slate-500/40';
    // Outdoor
    case 'hiking': return 'bg-green-500/20 text-green-400 border-green-500/40';
    case 'skiing': return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
    case 'rock_climbing': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
    // Recovery
    case 'yoga': return 'bg-pink-500/20 text-pink-400 border-pink-500/40';
    case 'stretching': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    case 'mobility': return 'bg-teal-500/20 text-teal-400 border-teal-500/40';
    default: return 'bg-grappler-600/30 text-grappler-300 border-grappler-500/40';
  }
}

function rpeColor(rpe: number): string {
  if (rpe <= 3) return 'text-green-400';
  if (rpe <= 5) return 'text-yellow-400';
  if (rpe <= 7) return 'text-blue-400';
  return 'text-red-400';
}

function rpeBarColor(rpe: number): string {
  if (rpe <= 3) return 'bg-green-500';
  if (rpe <= 5) return 'bg-yellow-500';
  if (rpe <= 7) return 'bg-blue-500';
  return 'bg-red-500';
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function isThisWeek(date: Date): boolean {
  const d = new Date(date);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday-based
  startOfWeek.setHours(0, 0, 0, 0);
  return d >= startOfWeek;
}

function daysSince(date: Date): number {
  const d = new Date(date);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GrapplingTracker({ onClose }: GrapplingTrackerProps) {
  const {
    trainingSessions,
    addTrainingSession,
    updateTrainingSession,
    deleteTrainingSession,
    workoutLogs,
    user,
  } = useAppStore();

  // UI state
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'log' | 'combat' | 'lifting'>('log');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [editingIntensityId, setEditingIntensityId] = useState<string | null>(null);
  const [statsPeriod, setStatsPeriod] = useState<'30d' | '3m' | 'year' | 'all'>('all');

  // Form state
  const [formType, setFormType] = useState<ActivityType>('bjj_nogi');
  const [formIntensity, setFormIntensity] = useState<TrainingIntensity>('moderate');
  const [formTiming, setFormTiming] = useState<SessionTiming>('standalone');
  const [formDuration, setFormDuration] = useState(60);
  const [formRounds, setFormRounds] = useState<number | undefined>(undefined);
  const [formRoundDuration, setFormRoundDuration] = useState<number | undefined>(undefined);
  const [formRPE, setFormRPE] = useState(6);
  const [formTechniques, setFormTechniques] = useState('');
  const [formSubmissions, setFormSubmissions] = useState<number | undefined>(undefined);
  const [formTaps, setFormTaps] = useState<number | undefined>(undefined);
  const [formNotes, setFormNotes] = useState('');
  // Pre-session check-in state
  const [formSleepQuality, setFormSleepQuality] = useState(3);
  const [formSleepHours, setFormSleepHours] = useState(7);
  const [formNutrition, setFormNutrition] = useState<PreWorkoutCheckIn['nutrition']>('light_meal');
  const [formStress, setFormStress] = useState(2);
  const [formSoreness, setFormSoreness] = useState(2);
  const [formMotivation, setFormMotivation] = useState(3);
  const [showCheckIn, setShowCheckIn] = useState(true);

  // Derived data
  const sortedSessions = useMemo(() => {
    return [...trainingSessions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [trainingSessions]);

  const weeklyTraining = useMemo(
    () => trainingSessions.filter((s) => isThisWeek(s.date)),
    [trainingSessions]
  );

  const weeklyLifting = useMemo(
    () => workoutLogs.filter((w) => isThisWeek(w.date)),
    [workoutLogs]
  );

  const totalMatTime = useMemo(
    () => trainingSessions.reduce((sum, s) => sum + s.duration, 0),
    [trainingSessions]
  );

  const totalLiftingTime = useMemo(
    () => workoutLogs.reduce((sum, w) => sum + (w.duration || 0), 0),
    [workoutLogs]
  );

  const avgRPE = useMemo(() => {
    if (trainingSessions.length === 0) return 0;
    const total = trainingSessions.reduce((sum, s) => sum + s.perceivedExertion, 0);
    return Math.round((total / trainingSessions.length) * 10) / 10;
  }, [trainingSessions]);

  const totalSubmissions = useMemo(
    () => trainingSessions.reduce((sum, s) => sum + (s.submissions ?? 0), 0),
    [trainingSessions]
  );

  // Sessions per week (average)
  const sessionsPerWeek = useMemo(() => {
    if (trainingSessions.length < 2) return trainingSessions.length;
    const dates = trainingSessions.map((s) => new Date(s.date).getTime());
    const earliest = Math.min(...dates);
    const latest = Math.max(...dates);
    const weeks = Math.max(1, (latest - earliest) / (7 * 24 * 60 * 60 * 1000));
    return Math.round((trainingSessions.length / weeks) * 10) / 10;
  }, [trainingSessions]);

  // -----------------------------------------------------------------------
  // Period-filtered stats
  // -----------------------------------------------------------------------

  const periodCutoff = useMemo(() => {
    const now = new Date();
    switch (statsPeriod) {
      case '30d': return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
      case '3m': return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      case 'year': return new Date(now.getFullYear(), 0, 1);
      case 'all': return new Date(0);
    }
  }, [statsPeriod]);

  const filteredCombat = useMemo(
    () => trainingSessions.filter(s => new Date(s.date) >= periodCutoff),
    [trainingSessions, periodCutoff]
  );

  const filteredLifting = useMemo(
    () => workoutLogs.filter(w => new Date(w.date) >= periodCutoff),
    [workoutLogs, periodCutoff]
  );

  const filteredCombatTime = useMemo(
    () => filteredCombat.reduce((sum, s) => sum + s.duration, 0),
    [filteredCombat]
  );

  const filteredLiftingTime = useMemo(
    () => filteredLifting.reduce((sum, w) => sum + (w.duration || 0), 0),
    [filteredLifting]
  );

  const filteredLiftingVolume = useMemo(
    () => filteredLifting.reduce((sum, w) => sum + (w.totalVolume || 0), 0),
    [filteredLifting]
  );

  // Monthly breakdown — builds an array of { month: 'Jan', year: 2025, combatMins, liftingMins, combatSessions, liftingSessions }
  const monthlyBreakdown = useMemo(() => {
    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const map = new Map<string, { month: string; year: number; combatMins: number; liftingMins: number; combatSessions: number; liftingSessions: number }>();

    const ensureEntry = (d: Date) => {
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!map.has(key)) {
        map.set(key, { month: MONTH_NAMES[d.getMonth()], year: d.getFullYear(), combatMins: 0, liftingMins: 0, combatSessions: 0, liftingSessions: 0 });
      }
      return map.get(key)!;
    };

    for (const s of filteredCombat) {
      const entry = ensureEntry(new Date(s.date));
      entry.combatMins += s.duration;
      entry.combatSessions += 1;
    }

    for (const w of filteredLifting) {
      const entry = ensureEntry(new Date(w.date));
      entry.liftingMins += w.duration || 0;
      entry.liftingSessions += 1;
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return MONTH_NAMES.indexOf(a.month) - MONTH_NAMES.indexOf(b.month);
    });
  }, [filteredCombat, filteredLifting]);

  // Yearly breakdown
  const yearlyBreakdown = useMemo(() => {
    const map = new Map<number, { year: number; combatMins: number; liftingMins: number; combatSessions: number; liftingSessions: number }>();

    const ensureEntry = (y: number) => {
      if (!map.has(y)) map.set(y, { year: y, combatMins: 0, liftingMins: 0, combatSessions: 0, liftingSessions: 0 });
      return map.get(y)!;
    };

    for (const s of trainingSessions) {
      const entry = ensureEntry(new Date(s.date).getFullYear());
      entry.combatMins += s.duration;
      entry.combatSessions += 1;
    }
    for (const w of workoutLogs) {
      const entry = ensureEntry(new Date(w.date).getFullYear());
      entry.liftingMins += w.duration || 0;
      entry.liftingSessions += 1;
    }

    return Array.from(map.values()).sort((a, b) => a.year - b.year);
  }, [trainingSessions, workoutLogs]);

  // Combat-specific: filtered avg RPE, submissions, type breakdown
  const filteredAvgRPE = useMemo(() => {
    if (filteredCombat.length === 0) return 0;
    return Math.round((filteredCombat.reduce((s, x) => s + x.perceivedExertion, 0) / filteredCombat.length) * 10) / 10;
  }, [filteredCombat]);

  const filteredSubmissions = useMemo(
    () => filteredCombat.reduce((s, x) => s + (x.submissions ?? 0), 0),
    [filteredCombat]
  );

  // Lifting-specific: filtered avg RPE, avg duration
  const filteredLiftingAvgRPE = useMemo(() => {
    if (filteredLifting.length === 0) return 0;
    return Math.round((filteredLifting.reduce((s, w) => s + w.overallRPE, 0) / filteredLifting.length) * 10) / 10;
  }, [filteredLifting]);

  const filteredLiftingAvgDuration = useMemo(() => {
    if (filteredLifting.length === 0) return 0;
    return Math.round(filteredLifting.reduce((s, w) => s + (w.duration || 0), 0) / filteredLifting.length);
  }, [filteredLifting]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const resetForm = () => {
    setFormType('bjj_nogi');
    setFormIntensity('moderate');
    setFormTiming('standalone');
    setFormDuration(60);
    setFormRounds(undefined);
    setFormRoundDuration(undefined);
    setFormRPE(6);
    setFormTechniques('');
    setFormSubmissions(undefined);
    setFormTaps(undefined);
    setFormNotes('');
    // Reset check-in
    setFormSleepQuality(3);
    setFormSleepHours(7);
    setFormNutrition('light_meal');
    setFormStress(2);
    setFormSoreness(2);
    setFormMotivation(3);
    setShowCheckIn(true);
  };

  const handleSave = () => {
    addTrainingSession({
      date: new Date(),
      category: ACTIVITY_CATEGORY_MAP[formType] || 'other',
      type: formType,
      plannedIntensity: formIntensity,
      timing: formTiming,
      duration: formDuration,
      rounds: formRounds,
      roundDuration: formRoundDuration,
      techniques: formTechniques || undefined,
      submissions: formSubmissions,
      taps: formTaps,
      notes: formNotes || undefined,
      perceivedExertion: formRPE,
      preCheckIn: {
        sleepQuality: formSleepQuality,
        sleepHours: formSleepHours,
        nutrition: formNutrition,
        stress: formStress,
        soreness: formSoreness,
        motivation: formMotivation,
      },
    });
    setShowAddForm(false);
    resetForm();
  };

  // Handle editing actual intensity after session
  const handleUpdateIntensity = (sessionId: string, newIntensity: TrainingIntensity) => {
    updateTrainingSession(sessionId, { actualIntensity: newIntensity });
    setEditingIntensityId(null);
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
      {/* Header */}
      <header className="sticky top-0 z-40 bg-grappler-900/80 backdrop-blur-xl border-b border-grappler-800">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button aria-label="Go back" onClick={onClose} className="btn btn-ghost btn-sm p-1">
              <ChevronLeft className="w-5 h-5 text-grappler-200" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h1 className="font-bold text-grappler-50 text-lg leading-tight">
                  Training Log
                </h1>
                <p className="text-xs text-grappler-400">
                  Sessions &amp; stats
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => { resetForm(); setShowAddForm(true); }}
            className="btn btn-sm gap-1 bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500 shadow-lg shadow-emerald-500/25"
          >
            <Plus className="w-4 h-4" />
            Log
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-4 pb-2 flex gap-1.5">
          {([
            { id: 'log', label: 'Sessions', color: 'emerald' },
            { id: 'combat', label: 'Combat', color: 'emerald' },
            { id: 'lifting', label: 'Lifting', color: 'primary' },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? tab.color === 'primary'
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/40'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-grappler-400 hover:text-grappler-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        {/* Weekly Summary Bar */}
        <div className="bg-grappler-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-grappler-200 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            This Week
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {/* Grappling this week */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-emerald-400">{weeklyTraining.length}</div>
              <div className="text-xs text-grappler-400 mt-0.5">Grappling</div>
              <div className="text-xs text-emerald-500/70 mt-0.5">
                {weeklyTraining.reduce((s, g) => s + g.duration, 0)}m on mat
              </div>
            </div>
            {/* Lifting this week */}
            <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-primary-400">{weeklyLifting.length}</div>
              <div className="text-xs text-grappler-400 mt-0.5">Lifting</div>
              <div className="text-xs text-primary-500/70 mt-0.5">
                {weeklyLifting.reduce((s, w) => s + (w.duration || 0), 0)}m in gym
              </div>
            </div>
          </div>
          {/* Combined weekly bar */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-2.5 bg-grappler-700 rounded-full overflow-hidden flex">
              {weeklyTraining.length + weeklyLifting.length > 0 && (
                <>
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{
                      width: `${(weeklyTraining.length / (weeklyTraining.length + weeklyLifting.length)) * 100}%`,
                    }}
                  />
                  <div
                    className="h-full bg-primary-500 transition-all duration-500"
                    style={{
                      width: `${(weeklyLifting.length / (weeklyTraining.length + weeklyLifting.length)) * 100}%`,
                    }}
                  />
                </>
              )}
            </div>
            <span className="text-xs text-grappler-400 whitespace-nowrap">
              {weeklyTraining.length + weeklyLifting.length} total
            </span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-grappler-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Grappling
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary-500" />
              Lifting
            </div>
          </div>
        </div>

        {/* All-Time Totals */}
        {(totalMatTime > 0 || totalLiftingTime > 0) && (
          <div className="flex gap-3">
            <div className="flex-1 bg-grappler-800 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-sm font-bold text-grappler-100">{formatDuration(totalMatTime)}</div>
                <div className="text-xs text-grappler-400 uppercase tracking-wider">Mat time all-time</div>
              </div>
            </div>
            <div className="flex-1 bg-grappler-800 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary-500/15 flex items-center justify-center flex-shrink-0">
                <Dumbbell className="w-4 h-4 text-primary-400" />
              </div>
              <div>
                <div className="text-sm font-bold text-grappler-100">{formatDuration(totalLiftingTime)}</div>
                <div className="text-xs text-grappler-400 uppercase tracking-wider">Lifting all-time</div>
              </div>
            </div>
          </div>
        )}

        {/* Add Session Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-grappler-800 rounded-xl p-4 space-y-4 border border-emerald-500/30">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-grappler-50 text-sm">
                    Log Grappling Session
                  </h3>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="p-1 rounded hover:bg-grappler-700 text-grappler-400 hover:text-grappler-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Pre-Session Check-in */}
                <div className="bg-grappler-900/50 rounded-xl p-3 border border-grappler-700">
                  <button
                    onClick={() => setShowCheckIn(!showCheckIn)}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-medium text-grappler-200">Pre-Session Check-in</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-grappler-500 transition-transform ${showCheckIn ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showCheckIn && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 space-y-3">
                          {/* Sleep Quality */}
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Moon className="w-3 h-3 text-purple-400" />
                              <span className="text-xs text-grappler-400">Sleep Quality</span>
                            </div>
                            <div className="flex gap-1.5">
                              {[1, 2, 3, 4, 5].map((val) => (
                                <button
                                  key={val}
                                  onClick={() => setFormSleepQuality(val)}
                                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    formSleepQuality === val
                                      ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                                      : 'bg-grappler-700 text-grappler-400 border border-grappler-600 hover:border-grappler-500'
                                  }`}
                                >
                                  {val === 1 ? '😫' : val === 2 ? '😴' : val === 3 ? '😐' : val === 4 ? '😊' : '🤩'}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Sleep Hours */}
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Clock className="w-3 h-3 text-blue-400" />
                              <span className="text-xs text-grappler-400">Hours Slept</span>
                            </div>
                            <div className="flex gap-1.5">
                              {[5, 6, 7, 8, 9].map((hrs) => (
                                <button
                                  key={hrs}
                                  onClick={() => setFormSleepHours(hrs)}
                                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    formSleepHours === hrs
                                      ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                                      : 'bg-grappler-700 text-grappler-400 border border-grappler-600 hover:border-grappler-500'
                                  }`}
                                >
                                  {hrs}h
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Nutrition */}
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Utensils className="w-3 h-3 text-blue-400" />
                              <span className="text-xs text-grappler-400">Nutrition</span>
                            </div>
                            <div className="grid grid-cols-4 gap-1.5">
                              {[
                                { id: 'fasted', label: 'Fasted' },
                                { id: 'light_meal', label: 'Light' },
                                { id: 'full_meal', label: 'Full' },
                                { id: 'heavy_meal', label: 'Heavy' },
                              ].map((opt) => (
                                <button
                                  key={opt.id}
                                  onClick={() => setFormNutrition(opt.id as PreWorkoutCheckIn['nutrition'])}
                                  className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    formNutrition === opt.id
                                      ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                                      : 'bg-grappler-700 text-grappler-400 border border-grappler-600 hover:border-grappler-500'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Stress + Soreness + Motivation in one row */}
                          <div className="grid grid-cols-3 gap-2">
                            {/* Stress */}
                            <div>
                              <div className="flex items-center gap-1 mb-1">
                                <Brain className="w-3 h-3 text-red-400" />
                                <span className="text-xs text-grappler-400">Stress</span>
                              </div>
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((val) => (
                                  <button
                                    key={val}
                                    onClick={() => setFormStress(val)}
                                    className={`flex-1 py-1 rounded text-xs font-medium transition-all ${
                                      formStress === val
                                        ? 'bg-red-500/30 text-red-300 border border-red-500/50'
                                        : 'bg-grappler-700 text-grappler-500 border border-grappler-600'
                                    }`}
                                  >
                                    {val}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Soreness */}
                            <div>
                              <div className="flex items-center gap-1 mb-1">
                                <Flame className="w-3 h-3 text-yellow-400" />
                                <span className="text-xs text-grappler-400">Soreness</span>
                              </div>
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((val) => (
                                  <button
                                    key={val}
                                    onClick={() => setFormSoreness(val)}
                                    className={`flex-1 py-1 rounded text-xs font-medium transition-all ${
                                      formSoreness === val
                                        ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50'
                                        : 'bg-grappler-700 text-grappler-500 border border-grappler-600'
                                    }`}
                                  >
                                    {val}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Motivation */}
                            <div>
                              <div className="flex items-center gap-1 mb-1">
                                <Zap className="w-3 h-3 text-green-400" />
                                <span className="text-xs text-grappler-400">Energy</span>
                              </div>
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((val) => (
                                  <button
                                    key={val}
                                    onClick={() => setFormMotivation(val)}
                                    className={`flex-1 py-1 rounded text-xs font-medium transition-all ${
                                      formMotivation === val
                                        ? 'bg-green-500/30 text-green-300 border border-green-500/50'
                                        : 'bg-grappler-700 text-grappler-500 border border-grappler-600'
                                    }`}
                                  >
                                    {val}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Type selector */}
                <div>
                  <label className="text-xs text-grappler-400 mb-1.5 block">Type</label>
                  <div className="flex flex-wrap gap-2">
                    {ACTIVITY_TYPES.map((gt) => (
                      <button
                        key={gt.id}
                        onClick={() => setFormType(gt.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                          formType === gt.id
                            ? typeBadgeColor(gt.id)
                            : 'bg-grappler-700 border-grappler-600 text-grappler-400 hover:border-grappler-500'
                        }`}
                      >
                        {gt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Intensity selector */}
                <div>
                  <label className="text-xs text-grappler-400 mb-1.5 block">Intensity</label>
                  <div className="grid grid-cols-2 gap-2">
                    {INTENSITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setFormIntensity(opt.id)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 border ${
                          formIntensity === opt.id
                            ? opt.color
                            : 'bg-grappler-700 border-grappler-600 text-grappler-400 hover:border-grappler-500'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="text-xs text-grappler-400 mb-1.5 block">
                    Duration (minutes)
                  </label>
                  <div className="flex items-center gap-2">
                    {[30, 45, 60, 90, 120].map((d) => (
                      <button
                        key={d}
                        onClick={() => setFormDuration(d)}
                        className={`flex-1 py-2 rounded-lg text-center text-xs font-medium transition-all duration-200 border ${
                          formDuration === d
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                            : 'bg-grappler-700 border-grappler-600 text-grappler-400 hover:border-grappler-500'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    value={formDuration}
                    onChange={(e) => setFormDuration(Number(e.target.value) || 0)}
                    className="input w-full mt-2 text-sm"
                    placeholder="Custom duration"
                    min={1}
                    max={300}
                  />
                </div>

                {/* Rounds + Round Duration */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-grappler-400 mb-1.5 block">
                      Rounds (optional)
                    </label>
                    <input
                      type="number"
                      value={formRounds ?? ''}
                      onChange={(e) => setFormRounds(e.target.value ? Number(e.target.value) : undefined)}
                      className="input w-full text-sm"
                      placeholder="e.g. 6"
                      min={0}
                      max={30}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-grappler-400 mb-1.5 block">
                      Round Length (min)
                    </label>
                    <input
                      type="number"
                      value={formRoundDuration ?? ''}
                      onChange={(e) => setFormRoundDuration(e.target.value ? Number(e.target.value) : undefined)}
                      className="input w-full text-sm"
                      placeholder="e.g. 5"
                      min={1}
                      max={30}
                    />
                  </div>
                </div>

                {/* RPE slider */}
                <div>
                  <label className="text-xs text-grappler-400 mb-1.5 flex items-center justify-between">
                    <span>Perceived Exertion (RPE)</span>
                    <span className={`font-bold text-sm ${rpeColor(formRPE)}`}>{formRPE}/10</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={formRPE}
                    onChange={(e) => setFormRPE(Number(e.target.value))}
                    className="w-full h-2 bg-grappler-700 rounded-full appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-xs text-grappler-600 mt-1">
                    <span>Easy</span>
                    <span>Moderate</span>
                    <span>Max</span>
                  </div>
                </div>

                {/* Submissions / Taps */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-grappler-400 mb-1.5 block">
                      Subs Landed
                    </label>
                    <input
                      type="number"
                      value={formSubmissions ?? ''}
                      onChange={(e) => setFormSubmissions(e.target.value ? Number(e.target.value) : undefined)}
                      className="input w-full text-sm"
                      placeholder="0"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-grappler-400 mb-1.5 block">
                      Times Tapped
                    </label>
                    <input
                      type="number"
                      value={formTaps ?? ''}
                      onChange={(e) => setFormTaps(e.target.value ? Number(e.target.value) : undefined)}
                      className="input w-full text-sm"
                      placeholder="0"
                      min={0}
                    />
                  </div>
                </div>

                {/* Techniques drilled */}
                <div>
                  <label className="text-xs text-grappler-400 mb-1.5 block">
                    Techniques Drilled (optional)
                  </label>
                  <input
                    type="text"
                    value={formTechniques}
                    onChange={(e) => setFormTechniques(e.target.value)}
                    placeholder="e.g. Arm bars, guard passing, takedowns..."
                    className="input w-full text-sm"
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
                    placeholder="How did the session go? Key takeaways..."
                    rows={2}
                    className="input w-full resize-none text-sm"
                  />
                </div>

                {/* Save */}
                <button
                  onClick={handleSave}
                  className="w-full gap-2 btn bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500 shadow-lg shadow-emerald-500/25"
                >
                  <Check className="w-4 h-4" />
                  Save Session
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Content: Sessions Log */}
        {activeTab === 'log' && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-grappler-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Session History
              {sortedSessions.length > 0 && (
                <span className="ml-auto text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                  {sortedSessions.length}
                </span>
              )}
            </h2>

            {sortedSessions.length === 0 && (
              <div className="bg-grappler-800/50 rounded-xl p-8 text-center">
                <Target className="w-10 h-10 text-emerald-400/50 mx-auto mb-3" />
                <p className="text-sm text-grappler-400 mb-1">
                  No grappling sessions logged yet.
                </p>
                <p className="text-xs text-grappler-400">
                  Tap &quot;Log&quot; to record your first mat session.
                </p>
              </div>
            )}

            <AnimatePresence mode="popLayout">
              {sortedSessions.map((session) => {
                const isExpanded = expandedSessionId === session.id;
                return (
                  <motion.div
                    key={session.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-grappler-800 rounded-xl overflow-hidden"
                  >
                    {/* Session row */}
                    <button
                      onClick={() =>
                        setExpandedSessionId(isExpanded ? null : session.id)
                      }
                      className="w-full p-4 flex items-center gap-3 text-left hover:bg-grappler-750 transition-colors"
                    >
                      {/* Type badge */}
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-md border whitespace-nowrap ${typeBadgeColor(session.type)}`}
                      >
                        {typeShort(session.type)}
                      </span>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-grappler-100 truncate">
                            {typeLabel(session.type)}
                          </span>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded border font-medium ${intensityColor((session.actualIntensity || session.plannedIntensity))}`}
                          >
                            {intensityLabel((session.actualIntensity || session.plannedIntensity))}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-grappler-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(session.duration)}
                          </span>
                          {session.rounds && (
                            <span>
                              {session.rounds} rds
                              {session.roundDuration ? ` x ${session.roundDuration}m` : ''}
                            </span>
                          )}
                          <span>&middot;</span>
                          <span>
                            RPE <span className={rpeColor(session.perceivedExertion)}>{session.perceivedExertion}</span>
                          </span>
                        </div>
                      </div>

                      {/* Date + expand */}
                      <div className="text-right shrink-0 flex items-center gap-2">
                        <div>
                          <div className="text-xs text-grappler-400">
                            {daysSince(session.date) === 0
                              ? 'Today'
                              : daysSince(session.date) === 1
                                ? 'Yesterday'
                                : new Date(session.date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                          </div>
                        </div>
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="w-4 h-4 text-grappler-500" />
                        </motion.div>
                      </div>
                    </button>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-3 border-t border-grappler-700/50 pt-3">
                            {/* Sub / Tap row */}
                            {(session.submissions !== undefined || session.taps !== undefined) && (
                              <div className="flex gap-3">
                                {session.submissions !== undefined && (
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <Award className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-grappler-300">
                                      {session.submissions} sub{session.submissions !== 1 ? 's' : ''} landed
                                    </span>
                                  </div>
                                )}
                                {session.taps !== undefined && (
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <X className="w-3.5 h-3.5 text-red-400" />
                                    <span className="text-grappler-300">
                                      Tapped {session.taps}x
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {session.techniques && (
                              <div>
                                <span className="text-xs uppercase tracking-wider text-grappler-400 font-semibold">
                                  Techniques
                                </span>
                                <p className="text-xs text-grappler-300 mt-0.5">
                                  {session.techniques}
                                </p>
                              </div>
                            )}

                            {session.notes && (
                              <div>
                                <span className="text-xs uppercase tracking-wider text-grappler-400 font-semibold">
                                  Notes
                                </span>
                                <p className="text-xs text-grappler-400 italic mt-0.5">
                                  {session.notes}
                                </p>
                              </div>
                            )}

                            {/* Whoop HR data (auto-synced) */}
                            {session.whoopHR && (
                              <div className="bg-grappler-900/50 rounded-lg p-3 space-y-2">
                                <span className="text-xs uppercase tracking-wider text-primary-400 font-semibold flex items-center gap-1">
                                  <Flame className="w-3 h-3" /> Whoop Data
                                </span>
                                <div className="grid grid-cols-4 gap-2 text-xs">
                                  <div className="text-center">
                                    <div className="text-grappler-500">Avg HR</div>
                                    <div className="text-grappler-200 font-medium">{session.whoopHR.avgHR}</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-grappler-500">Max HR</div>
                                    <div className="text-grappler-200 font-medium">{session.whoopHR.maxHR}</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-grappler-500">Strain</div>
                                    <div className="text-grappler-200 font-medium">{session.whoopHR.strain.toFixed(1)}</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-grappler-500">Cal</div>
                                    <div className="text-grappler-200 font-medium">{session.whoopHR.calories}</div>
                                  </div>
                                </div>
                                {session.whoopHR.zones && session.whoopHR.zones.length > 0 && (
                                  <div className="flex h-2 rounded-full overflow-hidden gap-px mt-1">
                                    {session.whoopHR.zones.map((z) => {
                                      const colors = ['#94a3b8','#3b82f6','#22c55e','#f59e0b','#ef4444','#dc2626'];
                                      const total = session.whoopHR!.zones!.reduce((s, zn) => s + zn.minutes, 0);
                                      return total > 0 ? (
                                        <div
                                          key={z.zone}
                                          className="rounded-sm"
                                          style={{ width: `${(z.minutes / total) * 100}%`, backgroundColor: colors[z.zone] || '#666' }}
                                          title={`Zone ${z.zone}: ${z.minutes.toFixed(0)}m`}
                                        />
                                      ) : null;
                                    })}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* RPE bar */}
                            <div>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-grappler-500">RPE</span>
                                <span className={`font-bold ${rpeColor(session.perceivedExertion)}`}>
                                  {session.perceivedExertion}/10
                                </span>
                              </div>
                              <div className="h-1.5 bg-grappler-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${rpeBarColor(session.perceivedExertion)}`}
                                  style={{ width: `${session.perceivedExertion * 10}%` }}
                                />
                              </div>
                            </div>

                            {/* Delete */}
                            <div className="flex justify-end">
                              <button
                                onClick={() => deleteTrainingSession(session.id)}
                                className="flex items-center gap-1.5 text-xs text-grappler-400 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* ━━━ Tab Content: Combat Stats ━━━ */}
        {activeTab === 'combat' && (
          <div className="space-y-4">
            {/* Period selector */}
            <div className="flex gap-1.5 bg-grappler-800 rounded-xl p-1.5">
              {([
                { id: '30d', label: '30 Days' },
                { id: '3m', label: '3 Months' },
                { id: 'year', label: 'This Year' },
                { id: 'all', label: 'All Time' },
              ] as const).map(p => (
                <button
                  key={p.id}
                  onClick={() => setStatsPeriod(p.id)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    statsPeriod === p.id
                      ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                      : 'text-grappler-500 hover:text-grappler-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Hero stat: Total Mat Time */}
            <div className="bg-gradient-to-br from-emerald-500/10 via-grappler-800 to-grappler-800 rounded-2xl p-5 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400/80 uppercase tracking-wider">Total Mat Time</span>
              </div>
              <div className="text-4xl font-black text-grappler-50 tracking-tight">
                {filteredCombatTime >= 60
                  ? <>{Math.floor(filteredCombatTime / 60)}<span className="text-lg font-semibold text-grappler-400">h </span>{filteredCombatTime % 60 > 0 && <>{filteredCombatTime % 60}<span className="text-lg font-semibold text-grappler-400">m</span></>}</>
                  : <>{filteredCombatTime}<span className="text-lg font-semibold text-grappler-400">m</span></>
                }
              </div>
              <p className="text-xs text-grappler-400 mt-1">
                {filteredCombat.length} session{filteredCombat.length !== 1 ? 's' : ''}
                {filteredCombat.length > 0 && ` · avg ${Math.round(filteredCombatTime / filteredCombat.length)}m per session`}
              </p>
            </div>

            {/* Quick stat cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-grappler-800 rounded-xl p-3 text-center">
                <div className={`text-lg font-bold ${filteredAvgRPE > 0 ? rpeColor(filteredAvgRPE) : 'text-grappler-400'}`}>
                  {filteredAvgRPE > 0 ? filteredAvgRPE : '--'}
                </div>
                <div className="text-xs text-grappler-400 mt-0.5">Avg RPE</div>
              </div>
              <div className="bg-grappler-800 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-grappler-100">
                  {sessionsPerWeek > 0 ? sessionsPerWeek : '--'}
                </div>
                <div className="text-xs text-grappler-400 mt-0.5">Per Week</div>
              </div>
              <div className="bg-grappler-800 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-emerald-400">
                  {filteredSubmissions > 0 ? filteredSubmissions : '--'}
                </div>
                <div className="text-xs text-grappler-400 mt-0.5">Subs</div>
              </div>
            </div>

            {/* Monthly breakdown chart */}
            {monthlyBreakdown.length > 0 && (
              <div className="bg-grappler-800 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                  Monthly Mat Time
                </h3>
                <div className="space-y-1.5">
                  {monthlyBreakdown.slice(-6).map((m) => {
                    const maxMins = Math.max(...monthlyBreakdown.slice(-6).map(x => x.combatMins), 1);
                    const pct = Math.round((m.combatMins / maxMins) * 100);
                    return (
                      <div key={`${m.year}-${m.month}`} className="flex items-center gap-2">
                        <span className="text-xs text-grappler-400 w-14 text-right font-medium">
                          {m.month} {m.year !== new Date().getFullYear() ? `'${String(m.year).slice(2)}` : ''}
                        </span>
                        <div className="flex-1 h-5 bg-grappler-700/50 rounded overflow-hidden relative">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(pct, 2)}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className="h-full bg-emerald-500/40 rounded"
                          />
                          <span className="absolute inset-0 flex items-center px-2 text-xs font-semibold text-grappler-200">
                            {formatDuration(m.combatMins)} · {m.combatSessions}s
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Yearly totals */}
            {yearlyBreakdown.length > 1 && (
              <div className="bg-grappler-800 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  Yearly Mat Time
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {yearlyBreakdown.map(y => (
                    <div key={y.year} className="bg-grappler-700/40 rounded-lg p-3">
                      <div className="text-xs text-grappler-400 font-medium">{y.year}</div>
                      <div className="text-lg font-bold text-emerald-400">{formatDuration(y.combatMins)}</div>
                      <div className="text-xs text-grappler-400">{y.combatSessions} sessions</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Type breakdown */}
            {filteredCombat.length > 0 && (
              <div className="bg-grappler-800 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  By Discipline
                </h3>
                <div className="space-y-2">
                  {ACTIVITY_TYPES.map((gt) => {
                    const sessions = filteredCombat.filter(s => s.type === gt.id);
                    if (sessions.length === 0) return null;
                    const mins = sessions.reduce((sum, s) => sum + s.duration, 0);
                    const pct = Math.round((sessions.length / filteredCombat.length) * 100);
                    return (
                      <div key={gt.id}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-grappler-300 flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${
                              gt.id === 'bjj_gi' ? 'bg-emerald-500' :
                              gt.id === 'bjj_nogi' ? 'bg-teal-500' :
                              gt.id === 'wrestling' ? 'bg-sky-500' :
                              gt.id === 'mma' ? 'bg-red-500' :
                              gt.id === 'judo' ? 'bg-blue-500' :
                              gt.id === 'boxing' ? 'bg-orange-500' :
                              gt.id === 'kickboxing' ? 'bg-amber-500' :
                              gt.id === 'muay_thai' ? 'bg-rose-500' :
                              'bg-grappler-500'
                            }`} />
                            {gt.label}
                          </span>
                          <span className="text-grappler-500">
                            {sessions.length} · {formatDuration(mins)}
                          </span>
                        </div>
                        <div className="h-1.5 bg-grappler-700 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className={`h-full rounded-full ${
                              gt.id === 'bjj_gi' ? 'bg-emerald-500' :
                              gt.id === 'bjj_nogi' ? 'bg-teal-500' :
                              gt.id === 'wrestling' ? 'bg-sky-500' :
                              gt.id === 'mma' ? 'bg-red-500' :
                              gt.id === 'judo' ? 'bg-blue-500' :
                              gt.id === 'boxing' ? 'bg-orange-500' :
                              gt.id === 'kickboxing' ? 'bg-amber-500' :
                              gt.id === 'muay_thai' ? 'bg-rose-500' :
                              'bg-grappler-500'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Intensity distribution */}
            {filteredCombat.length > 0 && (
              <div className="bg-grappler-800 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5 text-blue-400" />
                  Intensity Distribution
                </h3>
                <div className="grid grid-cols-4 gap-1.5">
                  {INTENSITY_OPTIONS.map((opt) => {
                    const count = filteredCombat.filter(
                      (s) => (s.actualIntensity || s.plannedIntensity) === opt.id
                    ).length;
                    const pct = filteredCombat.length > 0 ? Math.round((count / filteredCombat.length) * 100) : 0;
                    return (
                      <div
                        key={opt.id}
                        className={`rounded-lg p-2 border text-center ${
                          count > 0 ? opt.color : 'bg-grappler-700/50 border-grappler-600/50 text-grappler-500'
                        }`}
                      >
                        <div className="text-base font-bold">{count}</div>
                        <div className="text-[9px] font-medium mt-0.5 leading-tight">{opt.label}</div>
                        {count > 0 && <div className="text-[9px] opacity-60 mt-0.5">{pct}%</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty state */}
            {filteredCombat.length === 0 && (
              <div className="text-center py-10">
                <Target className="w-10 h-10 text-grappler-700 mx-auto mb-3" />
                <p className="text-sm text-grappler-400 font-medium">No combat sessions in this period</p>
                <p className="text-xs text-grappler-400 mt-1">Log sessions in the Sessions tab to see your stats here</p>
              </div>
            )}
          </div>
        )}

        {/* ━━━ Tab Content: Lifting Stats ━━━ */}
        {activeTab === 'lifting' && (
          <div className="space-y-4">
            {/* Period selector */}
            <div className="flex gap-1.5 bg-grappler-800 rounded-xl p-1.5">
              {([
                { id: '30d', label: '30 Days' },
                { id: '3m', label: '3 Months' },
                { id: 'year', label: 'This Year' },
                { id: 'all', label: 'All Time' },
              ] as const).map(p => (
                <button
                  key={p.id}
                  onClick={() => setStatsPeriod(p.id)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    statsPeriod === p.id
                      ? 'bg-primary-500/20 text-primary-400 shadow-sm'
                      : 'text-grappler-500 hover:text-grappler-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Hero stat: Total Gym Time */}
            <div className="bg-gradient-to-br from-primary-500/10 via-grappler-800 to-grappler-800 rounded-2xl p-5 border border-primary-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Dumbbell className="w-4 h-4 text-primary-400" />
                <span className="text-xs font-semibold text-primary-400/80 uppercase tracking-wider">Total Gym Time</span>
              </div>
              <div className="text-4xl font-black text-grappler-50 tracking-tight">
                {filteredLiftingTime >= 60
                  ? <>{Math.floor(filteredLiftingTime / 60)}<span className="text-lg font-semibold text-grappler-400">h </span>{filteredLiftingTime % 60 > 0 && <>{filteredLiftingTime % 60}<span className="text-lg font-semibold text-grappler-400">m</span></>}</>
                  : <>{filteredLiftingTime}<span className="text-lg font-semibold text-grappler-400">m</span></>
                }
              </div>
              <p className="text-xs text-grappler-400 mt-1">
                {filteredLifting.length} session{filteredLifting.length !== 1 ? 's' : ''}
                {filteredLifting.length > 0 && ` · avg ${filteredLiftingAvgDuration}m per session`}
              </p>
            </div>

            {/* Quick stat cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-grappler-800 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-primary-400">
                  {filteredLiftingVolume > 0 ? `${Math.round(filteredLiftingVolume / 1000)}k` : '--'}
                </div>
                <div className="text-xs text-grappler-400 mt-0.5">Volume ({user?.weightUnit || 'kg'})</div>
              </div>
              <div className="bg-grappler-800 rounded-xl p-3 text-center">
                <div className={`text-lg font-bold ${filteredLiftingAvgRPE > 0 ? rpeColor(filteredLiftingAvgRPE) : 'text-grappler-400'}`}>
                  {filteredLiftingAvgRPE > 0 ? filteredLiftingAvgRPE : '--'}
                </div>
                <div className="text-xs text-grappler-400 mt-0.5">Avg RPE</div>
              </div>
              <div className="bg-grappler-800 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-grappler-100">
                  {filteredLiftingAvgDuration > 0 ? filteredLiftingAvgDuration : '--'}
                  {filteredLiftingAvgDuration > 0 && <span className="text-xs text-grappler-400">m</span>}
                </div>
                <div className="text-xs text-grappler-400 mt-0.5">Avg Duration</div>
              </div>
            </div>

            {/* Monthly breakdown chart */}
            {monthlyBreakdown.length > 0 && (
              <div className="bg-grappler-800 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5 text-primary-400" />
                  Monthly Gym Time
                </h3>
                <div className="space-y-1.5">
                  {monthlyBreakdown.slice(-6).map((m) => {
                    const maxMins = Math.max(...monthlyBreakdown.slice(-6).map(x => x.liftingMins), 1);
                    const pct = Math.round((m.liftingMins / maxMins) * 100);
                    return (
                      <div key={`${m.year}-${m.month}`} className="flex items-center gap-2">
                        <span className="text-xs text-grappler-400 w-14 text-right font-medium">
                          {m.month} {m.year !== new Date().getFullYear() ? `'${String(m.year).slice(2)}` : ''}
                        </span>
                        <div className="flex-1 h-5 bg-grappler-700/50 rounded overflow-hidden relative">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(pct, 2)}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className="h-full bg-primary-500/40 rounded"
                          />
                          <span className="absolute inset-0 flex items-center px-2 text-xs font-semibold text-grappler-200">
                            {formatDuration(m.liftingMins)} · {m.liftingSessions}s
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Yearly totals */}
            {yearlyBreakdown.length > 1 && (
              <div className="bg-grappler-800 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-primary-400" />
                  Yearly Gym Time
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {yearlyBreakdown.map(y => (
                    <div key={y.year} className="bg-grappler-700/40 rounded-lg p-3">
                      <div className="text-xs text-grappler-400 font-medium">{y.year}</div>
                      <div className="text-lg font-bold text-primary-400">{formatDuration(y.liftingMins)}</div>
                      <div className="text-xs text-grappler-400">{y.liftingSessions} sessions</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Volume trend — monthly */}
            {filteredLifting.length > 0 && monthlyBreakdown.length > 0 && (
              <div className="bg-grappler-800 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Weight className="w-3.5 h-3.5 text-primary-400" />
                  Monthly Volume
                </h3>
                <div className="space-y-1.5">
                  {(() => {
                    // Build monthly volume from filtered lifting
                    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const volMap = new Map<string, { label: string; volume: number }>();
                    for (const w of filteredLifting) {
                      const d = new Date(w.date);
                      const key = `${d.getFullYear()}-${d.getMonth()}`;
                      if (!volMap.has(key)) volMap.set(key, { label: `${MONTH_NAMES[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ` '${String(d.getFullYear()).slice(2)}` : ''}`, volume: 0 });
                      volMap.get(key)!.volume += w.totalVolume || 0;
                    }
                    const entries = Array.from(volMap.values()).slice(-6);
                    const maxVol = Math.max(...entries.map(e => e.volume), 1);
                    return entries.map((e) => (
                      <div key={e.label} className="flex items-center gap-2">
                        <span className="text-xs text-grappler-400 w-14 text-right font-medium">{e.label}</span>
                        <div className="flex-1 h-5 bg-grappler-700/50 rounded overflow-hidden relative">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(Math.round((e.volume / maxVol) * 100), 2)}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className="h-full bg-primary-500/30 rounded"
                          />
                          <span className="absolute inset-0 flex items-center px-2 text-xs font-semibold text-grappler-200">
                            {e.volume >= 1000 ? `${(e.volume / 1000).toFixed(1)}k` : e.volume} {user?.weightUnit || 'kg'}
                          </span>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* Grappling vs Lifting comparison */}
            {(filteredCombat.length > 0 || filteredLifting.length > 0) && (
              <div className="bg-grappler-800 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-grappler-400 uppercase tracking-wider mb-3">
                  Combat vs Lifting Split
                </h3>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 text-center">
                    <div className="text-xl font-bold text-emerald-400">{formatDuration(filteredCombatTime)}</div>
                    <div className="text-xs text-grappler-400">{filteredCombat.length} sessions</div>
                  </div>
                  <div className="text-grappler-600 text-sm">vs</div>
                  <div className="flex-1 text-center">
                    <div className="text-xl font-bold text-primary-400">{formatDuration(filteredLiftingTime)}</div>
                    <div className="text-xs text-grappler-400">{filteredLifting.length} sessions</div>
                  </div>
                </div>
                {filteredCombatTime + filteredLiftingTime > 0 && (
                  <div className="h-2.5 bg-grappler-700 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(filteredCombatTime / (filteredCombatTime + filteredLiftingTime)) * 100}%` }} />
                    <div className="h-full bg-primary-500 transition-all duration-500" style={{ width: `${(filteredLiftingTime / (filteredCombatTime + filteredLiftingTime)) * 100}%` }} />
                  </div>
                )}
                <div className="flex items-center justify-between mt-2 text-xs text-grappler-400">
                  <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Combat</div>
                  <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary-500" />Lifting</div>
                </div>
              </div>
            )}

            {/* Empty state */}
            {filteredLifting.length === 0 && (
              <div className="text-center py-10">
                <Dumbbell className="w-10 h-10 text-grappler-700 mx-auto mb-3" />
                <p className="text-sm text-grappler-400 font-medium">No lifting sessions in this period</p>
                <p className="text-xs text-grappler-400 mt-1">Complete workouts to see your lifting stats here</p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
