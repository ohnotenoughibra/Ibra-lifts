'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Target,
  Trophy,
  Clock,
  ChevronLeft,
  Plus,
  Trash2,
  ChevronRight,
  Scale,
  Flame,
  Zap,
  X,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CompetitionType, CompetitionEvent, WeighInType } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import { detectFightCampPhase, getPhaseConfig, generatePhaseMacros } from '@/lib/fight-camp-engine';
import { detectWeightCutPhase, assessWeightCutSafety, getWaterProtocol, getSodiumProtocol } from '@/lib/weight-cut-engine';
import { calculateElectrolyteNeeds } from '@/lib/electrolyte-engine';
import WeightCutDashboard from './WeightCutDashboard';

interface CompetitionPrepProps {
  onClose: () => void;
}

const COMPETITION_TYPE_LABELS: Record<CompetitionType, string> = {
  bjj_tournament: 'BJJ Tournament',
  wrestling_meet: 'Wrestling Meet',
  mma_fight: 'MMA Fight',
  kickboxing_fight: 'Kickboxing Fight',
  muay_thai_fight: 'Muay Thai Fight',
  boxing_match: 'Boxing Match',
  aesthetic_event: 'Aesthetic Event',
  strength_meet: 'Strength Meet',
  custom: 'Custom Event',
};

type Phase = 'base' | 'intensification' | 'peaking' | 'taper' | 'event_week';

interface PhaseInfo {
  name: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

const PHASE_INFO: Record<Phase, PhaseInfo> = {
  base: {
    name: 'Base Phase',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/40',
    icon: <Target className="w-4 h-4" />,
  },
  intensification: {
    name: 'Intensification',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/40',
    icon: <Flame className="w-4 h-4" />,
  },
  peaking: {
    name: 'Peaking',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/40',
    icon: <Zap className="w-4 h-4" />,
  },
  taper: {
    name: 'Taper',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/40',
    icon: <Clock className="w-4 h-4" />,
  },
  event_week: {
    name: 'Event Week',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/40',
    icon: <Trophy className="w-4 h-4" />,
  },
};

const PHASE_RECOMMENDATIONS: Record<Phase, string[]> = {
  base: [
    'Build training volume progressively',
    'Establish baseline PRs and working weights',
    'Caloric surplus is acceptable -- fuel your training',
    'Focus on weak points and technical proficiency',
  ],
  intensification: [
    'Push intensity higher, moderate volume',
    'Dial in your weight -- start tightening nutrition',
    'Practice competition-specific movements',
    'Prioritize recovery between hard sessions',
  ],
  peaking: [
    'Low volume, high intensity singles/doubles',
    'Test openers and competition attempts',
    'Fine-tune weight management strategy',
    'Sharpen technique under heavy loads',
  ],
  taper: [
    'Minimal training volume -- stay sharp, not fatigued',
    'Make weight -- manage hydration and nutrition',
    'Visualize competition scenarios',
    'Prioritize sleep and stress management',
  ],
  event_week: [
    'Light movement only -- nothing strenuous',
    'Mental preparation and visualization',
    'Hydration protocol (rehydrate if cutting weight)',
    'Trust your preparation -- you are ready',
  ],
};

const AESTHETIC_RECOMMENDATIONS: Record<Phase, string[]> = {
  base: [
    'High volume hypertrophy training -- chase the pump',
    'Caloric surplus to fuel muscle growth',
    'Focus on lagging body parts',
    'Progressive overload on all movements',
  ],
  intensification: [
    'Maintain intensity while volume stays high',
    'Begin gradual calorie reduction if needed',
    'Posing practice 2-3 times per week',
    'Increase cardio frequency slowly',
  ],
  peaking: [
    'Maintain muscle fullness -- reduce volume carefully',
    'Refine posing and presentation',
    'Tighten nutrition -- every meal counts',
    'Begin water intake manipulation planning',
  ],
  taper: [
    'Begin carb depletion phase (if applicable)',
    'Reduce training to maintenance only',
    'Water and sodium manipulation protocol',
    'Practice posing daily -- refine transitions',
  ],
  event_week: [
    'Carb load to fill out muscles',
    'Water manipulation -- peak day hydration plan',
    'Final posing rehearsals',
    'Look your best -- trust the process',
  ],
};

const STRIKING_RECOMMENDATIONS: Record<Phase, string[]> = {
  base: [
    'Build conditioning base with road work and bag work',
    'Technical drilling -- focus on combinations and footwork',
    'Strength training 2-3x/week -- explosive power focus',
    'Spar light to work on timing without accumulating damage',
  ],
  intensification: [
    'Increase sparring intensity -- work specific fight scenarios',
    'Dial in your weight -- begin gradual cut if needed',
    'Practice your game plan against different styles',
    'Prioritize recovery between hard sessions',
  ],
  peaking: [
    'Reduce sparring volume -- protect yourself from injury',
    'Maintain conditioning with pad work and bag rounds',
    'Sharpen your best weapons and setups',
    'Mental preparation and visualization work',
  ],
  taper: [
    'Light technical work only -- no hard sparring',
    'Begin weight cut protocol if applicable',
    'Focus on speed and timing, not power',
    'Stay loose -- shadow boxing and stretching',
  ],
  event_week: [
    'Light movement and shadow boxing only',
    'Complete weight cut and rehydration protocol',
    'Mental preparation and visualization',
    'Trust your camp -- you are ready to fight',
  ],
};

function getDaysRemaining(eventDate: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(eventDate);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getWeeksRemaining(eventDate: Date): number {
  return Math.ceil(getDaysRemaining(eventDate) / 7);
}

function getCurrentPhase(event: CompetitionEvent): Phase {
  const daysRemaining = getDaysRemaining(new Date(event.date));
  const weeksRemaining = Math.ceil(daysRemaining / 7);

  if (daysRemaining <= 7) return 'event_week';
  if (weeksRemaining <= 2) return 'taper';
  if (weeksRemaining <= event.peakingWeeks) return 'peaking';
  if (weeksRemaining <= event.peakingWeeks + 3) return 'intensification';
  return 'base';
}

function getPhaseTimeline(event: CompetitionEvent): { phase: Phase; startWeeks: number; endWeeks: number }[] {
  const totalWeeks = getWeeksRemaining(new Date(event.date));
  const peaking = event.peakingWeeks;

  const phases: { phase: Phase; startWeeks: number; endWeeks: number }[] = [];

  // Event week: last 1 week
  phases.push({ phase: 'event_week', startWeeks: 1, endWeeks: 0 });

  // Taper: 1-2 weeks before event week
  phases.push({ phase: 'taper', startWeeks: 3, endWeeks: 1 });

  // Peaking: peakingWeeks before taper
  phases.push({ phase: 'peaking', startWeeks: 3 + peaking, endWeeks: 3 });

  // Intensification: 3 weeks before peaking
  phases.push({ phase: 'intensification', startWeeks: 3 + peaking + 3, endWeeks: 3 + peaking });

  // Base: everything else
  phases.push({ phase: 'base', startWeeks: totalWeeks, endWeeks: 3 + peaking + 3 });

  return phases.reverse();
}

function getWeightProgress(current?: number, target?: number): number {
  if (!current || !target) return 0;
  if (current <= target) return 100;
  const overshoot = current - target;
  const maxOvershoot = target * 0.15; // Assume 15% over is worst case
  return Math.max(0, Math.min(100, 100 - (overshoot / maxOvershoot) * 100));
}

export default function CompetitionPrep({ onClose }: CompetitionPrepProps) {
  const {
    user, competitions: events, addCompetition, deleteCompetition,
    weightCutPlans, createWeightCutPlan, bodyWeightLog, combatNutritionProfile,
  } = useAppStore();
  const weightUnit = user?.weightUnit || 'lbs';
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showWeightCutDashboard, setShowWeightCutDashboard] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<CompetitionType>('bjj_tournament');
  const [formDate, setFormDate] = useState('');
  const [formWeightClass, setFormWeightClass] = useState('');
  const [formPeakingWeeks, setFormPeakingWeeks] = useState(3);
  const [formWeighInType, setFormWeighInType] = useState<WeighInType>('day_before');

  const selectedEvent = events.find((e) => e.id === selectedEventId) || null;
  const isCombatAthlete = user?.trainingIdentity === 'combat';

  const handleAddEvent = () => {
    if (!formName.trim() || !formDate) return;

    addCompetition({
      name: formName.trim(),
      type: formType,
      date: new Date(formDate),
      weightClass: formWeightClass ? parseFloat(formWeightClass) : undefined,
      peakingWeeks: formPeakingWeeks,
      isActive: true,
    });
    setFormName('');
    setFormType('bjj_tournament');
    setFormDate('');
    setFormWeightClass('');
    setFormPeakingWeeks(3);
    setShowAddForm(false);
  };

  const handleDeleteEvent = (id: string) => {
    deleteCompetition(id);
    if (selectedEventId === id) setSelectedEventId(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-grappler-900 overflow-y-auto"
    >
      <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button aria-label="Go back" onClick={onClose} className="btn btn-ghost btn-sm">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-grappler-50 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Event Prep
              </h1>
              <p className="text-sm text-grappler-400">Plan and peak for competitions</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary btn-sm gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Event
          </button>
        </div>

        {/* Add Event Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="bg-grappler-800 rounded-xl p-4 space-y-4 border border-grappler-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-grappler-200">New Event</h3>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="p-1 rounded hover:bg-grappler-700 text-grappler-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Event Name */}
                <div>
                  <label className="text-xs text-grappler-400 mb-1 block">Event Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g., IBJJF Worlds, State Wrestling Finals"
                    className="input"
                    autoFocus
                  />
                </div>

                {/* Event Type */}
                <div>
                  <label className="text-xs text-grappler-400 mb-1 block">Event Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as CompetitionType)}
                    className="input"
                  >
                    {Object.entries(COMPETITION_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="text-xs text-grappler-400 mb-1 block">Event Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="input"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* Weight Class */}
                <div>
                  <label className="text-xs text-grappler-400 mb-1 block">
                    Weight Class (optional)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={formWeightClass}
                    onChange={(e) => setFormWeightClass(e.target.value)}
                    placeholder="e.g., 181"
                    className="input"
                  />
                </div>

                {/* Peaking Weeks */}
                <div>
                  <label className="text-xs text-grappler-400 mb-1 block">
                    Peaking Weeks ({formPeakingWeeks})
                  </label>
                  <input
                    type="range"
                    min={2}
                    max={6}
                    value={formPeakingWeeks}
                    onChange={(e) => setFormPeakingWeeks(parseInt(e.target.value))}
                    className="w-full accent-primary-500"
                  />
                  <div className="flex justify-between text-xs text-grappler-400 mt-1">
                    <span>2 weeks</span>
                    <span>6 weeks</span>
                  </div>
                </div>

                {/* Submit */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="btn btn-secondary btn-sm flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddEvent}
                    className="btn btn-primary btn-sm flex-1"
                    disabled={!formName.trim() || !formDate}
                  >
                    Add Event
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Weight Cut Dashboard (full-screen overlay) */}
        <AnimatePresence>
          {showWeightCutDashboard && (
            <WeightCutDashboard
              competitionId={showWeightCutDashboard}
              onClose={() => setShowWeightCutDashboard(null)}
            />
          )}
        </AnimatePresence>

        {/* Event Detail View */}
        <AnimatePresence mode="wait">
          {selectedEvent ? (
            <EventDetail
              key={selectedEvent.id}
              event={selectedEvent}
              onBack={() => setSelectedEventId(null)}
              onDelete={() => handleDeleteEvent(selectedEvent.id)}
              weightUnit={weightUnit}
              isCombatAthlete={isCombatAthlete}
              weightCutPlan={weightCutPlans.find(p => p.competitionId === selectedEvent.id)}
              onOpenWeightCut={() => setShowWeightCutDashboard(selectedEvent.id)}
              onStartWeightCut={() => {
                if (!selectedEvent.weightClass || !user) return;
                const latestWeight = bodyWeightLog[bodyWeightLog.length - 1];
                const currentKg = latestWeight
                  ? (latestWeight.unit === 'lbs' ? latestWeight.weight / 2.205 : latestWeight.weight)
                  : (user.bodyWeightKg ? user.bodyWeightKg : 80);
                const targetKg = weightUnit === 'lbs' ? selectedEvent.weightClass / 2.205 : selectedEvent.weightClass;
                createWeightCutPlan({
                  competitionId: selectedEvent.id,
                  competitionDate: new Date(selectedEvent.date).toISOString(),
                  targetWeightKg: targetKg,
                  startWeightKg: currentKg,
                  currentPhase: 'not_started',
                  phaseStartDate: new Date().toISOString(),
                  weighInType: formWeighInType,
                  rehydrationTimeHours: formWeighInType === 'day_before' ? 24 : formWeighInType === '2hr_before' ? 2 : 6,
                  waterLoadStarted: false,
                  sodiumLoadStarted: false,
                  carbDepletionStarted: false,
                  safetyLevel: 'safe',
                  safetyAlerts: [],
                  maxWaterCutPercent: 6,
                  dailyLogs: [],
                  isActive: true,
                });
                setShowWeightCutDashboard(selectedEvent.id);
              }}
              combatNutritionProfile={combatNutritionProfile}
              userSex={user?.sex}
            />
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Active Events */}
              {events.length === 0 ? (
                <div className="text-center py-16">
                  <Trophy className="w-12 h-12 text-grappler-600 mx-auto mb-4" />
                  <p className="text-grappler-400 mb-2">No events scheduled</p>
                  <p className="text-sm text-grappler-500">
                    Add an event to start your competition prep plan.
                  </p>
                </div>
              ) : (
                events.map((event, i) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    index={i}
                    onSelect={() => setSelectedEventId(event.id)}
                    onDelete={() => handleDeleteEvent(event.id)}
                    weightUnit={weightUnit}
                  />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ---- Weight Cut Safety Warnings ----
function WeightCutWarnings({ currentWeight, targetWeight, daysRemaining, weightUnit }: { currentWeight: number; targetWeight: number; daysRemaining: number; weightUnit: string }) {
  const toLose = currentWeight - targetWeight;
  const cutPercent = (toLose / currentWeight) * 100;
  const weeksRemaining = Math.max(1, daysRemaining / 7);
  const weeklyLossRate = toLose / weeksRemaining;
  const weeklyLossPercent = (weeklyLossRate / currentWeight) * 100;

  const warnings: { level: 'danger' | 'caution'; message: string }[] = [];

  if (cutPercent > 10) {
    warnings.push({ level: 'danger', message: `Cutting ${cutPercent.toFixed(1)}% of body weight — risk of muscle loss, hormonal disruption, and performance decline.` });
  }
  if (weeklyLossPercent > 1.5) {
    warnings.push({ level: 'danger', message: `Required pace: ${weeklyLossRate.toFixed(1)} ${weightUnit}/week (${weeklyLossPercent.toFixed(1)}%/week). Safe limit is ~1% per week.` });
  } else if (weeklyLossPercent > 1.0) {
    warnings.push({ level: 'caution', message: `Pace: ${weeklyLossRate.toFixed(1)} ${weightUnit}/week (${weeklyLossPercent.toFixed(1)}%/week). Aggressive but manageable with careful nutrition.` });
  }
  if (toLose > 15 && daysRemaining < 14) {
    warnings.push({ level: 'danger', message: `${toLose.toFixed(1)} ${weightUnit} to lose in ${daysRemaining} days requires extreme measures. Consider moving up a weight class.` });
  }
  if (toLose > 5 && daysRemaining < 3) {
    warnings.push({ level: 'danger', message: `Water cut territory — consult a professional. Ensure a rehydration plan is in place.` });
  }

  if (warnings.length === 0) return null;

  const hasDanger = warnings.some(w => w.level === 'danger');

  return (
    <div className={cn(
      'card p-4 border',
      hasDanger ? 'border-red-500/40 bg-red-500/5' : 'border-yellow-500/40 bg-yellow-500/5'
    )}>
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className={cn('w-5 h-5', hasDanger ? 'text-red-400' : 'text-yellow-400')} />
        <h3 className={cn('font-medium', hasDanger ? 'text-red-300' : 'text-yellow-300')}>
          Weight Cut {hasDanger ? 'Warning' : 'Advisory'}
        </h3>
      </div>
      <div className="space-y-2">
        {warnings.map((w, i) => (
          <div key={i} className={cn(
            'flex items-start gap-2 text-sm p-2 rounded-lg',
            w.level === 'danger' ? 'bg-red-500/10 text-red-300' : 'bg-yellow-500/10 text-yellow-300'
          )}>
            <span className="flex-shrink-0 mt-0.5">{w.level === 'danger' ? '\u26A0' : '\u26A1'}</span>
            <span>{w.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Event Card (list view) ----
function EventCard({
  event,
  index,
  onSelect,
  onDelete,
  weightUnit,
}: {
  event: CompetitionEvent;
  index: number;
  onSelect: () => void;
  onDelete: () => void;
  weightUnit: string;
}) {
  const daysRemaining = getDaysRemaining(new Date(event.date));
  const phase = getCurrentPhase(event);
  const phaseInfo = PHASE_INFO[phase];
  const isPast = daysRemaining < 0;
  const weightProgress = getWeightProgress(event.currentWeight, event.weightClass);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        'bg-grappler-800 rounded-xl p-4 border transition-colors',
        isPast ? 'border-grappler-700 opacity-60' : phaseInfo.borderColor
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <button onClick={onSelect} className="text-left flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-grappler-400">
              {COMPETITION_TYPE_LABELS[event.type]}
            </span>
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                phaseInfo.bgColor,
                phaseInfo.color
              )}
            >
              {phaseInfo.name}
            </span>
          </div>
          <h3 className="font-bold text-grappler-50 text-lg">{event.name}</h3>
          <p className="text-sm text-grappler-400 flex items-center gap-1 mt-1">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(event.date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </button>
        <div className="flex items-center gap-2">
          {/* Countdown */}
          <div className="text-right">
            <p
              className={cn(
                'text-3xl font-black',
                isPast ? 'text-grappler-500' : 'text-grappler-50'
              )}
            >
              {isPast ? 0 : daysRemaining}
            </p>
            <p className="text-xs text-grappler-400">
              {isPast ? 'passed' : 'days left'}
            </p>
          </div>
        </div>
      </div>

      {/* Weight Progress */}
      {event.weightClass && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-grappler-400 mb-1">
            <span className="flex items-center gap-1">
              <Scale className="w-3 h-3" />
              {event.currentWeight ? `${event.currentWeight} ${weightUnit}` : 'No weigh-in yet'}
            </span>
            <span>Target: {event.weightClass} {weightUnit}</span>
          </div>
          <div className="h-2 bg-grappler-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${weightProgress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={cn(
                'h-full rounded-full',
                weightProgress >= 100
                  ? 'bg-green-500'
                  : weightProgress >= 60
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              )}
            />
          </div>
        </div>
      )}

      {/* Bottom row */}
      <div className="flex items-center justify-between">
        <button
          onClick={onSelect}
          className="text-sm text-primary-400 flex items-center gap-1 hover:text-primary-300 transition-colors"
        >
          View Details
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 rounded hover:bg-grappler-700 text-grappler-500 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ---- Event Detail View ----
function EventDetail({
  event,
  onBack,
  onDelete,
  weightUnit,
  isCombatAthlete,
  weightCutPlan,
  onOpenWeightCut,
  onStartWeightCut,
  combatNutritionProfile,
  userSex,
}: {
  event: CompetitionEvent;
  onBack: () => void;
  onDelete: () => void;
  weightUnit: string;
  isCombatAthlete?: boolean;
  weightCutPlan?: any;
  onOpenWeightCut: () => void;
  onStartWeightCut: () => void;
  combatNutritionProfile?: any;
  userSex?: string;
}) {
  const daysRemaining = getDaysRemaining(new Date(event.date));
  const weeksRemaining = getWeeksRemaining(new Date(event.date));
  const phase = getCurrentPhase(event);
  const phaseInfo = PHASE_INFO[phase];
  const timeline = getPhaseTimeline(event);
  const isPast = daysRemaining < 0;
  const isAesthetic = event.type === 'aesthetic_event';
  const isStriking = event.type === 'kickboxing_fight' || event.type === 'muay_thai_fight' || event.type === 'boxing_match' || event.type === 'mma_fight';
  const isCombatEvent = isStriking || ['bjj_tournament', 'wrestling_meet'].includes(event.type);
  const recommendations = isAesthetic
    ? AESTHETIC_RECOMMENDATIONS[phase]
    : isStriking
      ? STRIKING_RECOMMENDATIONS[phase]
      : PHASE_RECOMMENDATIONS[phase];
  const weightProgress = getWeightProgress(event.currentWeight, event.weightClass);

  // Fight camp nutrition phase (combat athletes only)
  const fightCampPhase = isCombatEvent && daysRemaining > 0
    ? detectFightCampPhase(daysRemaining, event.type === 'bjj_tournament')
    : null;
  const fightCampConfig = fightCampPhase
    ? getPhaseConfig(fightCampPhase, (userSex as any) || 'male')
    : null;

  // Weight cut safety assessment
  const needsWeightCut = event.weightClass && event.currentWeight && event.currentWeight > event.weightClass;
  const hasWeightCutPlan = !!weightCutPlan;

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className="space-y-5"
    >
      {/* Back button and event title */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-grappler-400 hover:text-grappler-200 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          All Events
        </button>
        <button
          onClick={onDelete}
          className="btn btn-secondary btn-sm gap-1 text-red-400 hover:text-red-300"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>

      {/* Countdown Hero */}
      <div
        className={cn(
          'rounded-xl p-6 text-center border',
          phaseInfo.bgColor,
          phaseInfo.borderColor
        )}
      >
        <p className="text-sm text-grappler-400 mb-1">
          {COMPETITION_TYPE_LABELS[event.type]}
        </p>
        <h2 className="text-2xl font-black text-grappler-50 mb-4">{event.name}</h2>
        <div className="flex items-center justify-center gap-1 mb-2">
          <p
            className={cn(
              'text-6xl font-black tracking-tight',
              isPast ? 'text-grappler-500' : 'text-grappler-50'
            )}
          >
            {isPast ? 0 : daysRemaining}
          </p>
        </div>
        <p className="text-grappler-400 text-sm mb-3">
          {isPast ? 'Event has passed' : `days remaining (${weeksRemaining} weeks)`}
        </p>
        <div className="flex items-center justify-center gap-2">
          <Calendar className="w-4 h-4 text-grappler-400" />
          <span className="text-sm text-grappler-200">
            {new Date(event.date).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* Current Phase Badge */}
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              phaseInfo.bgColor,
              phaseInfo.color
            )}
          >
            {phaseInfo.icon}
          </div>
          <div className="flex-1">
            <p className="text-xs text-grappler-400">Current Phase</p>
            <p className={cn('font-bold text-lg', phaseInfo.color)}>{phaseInfo.name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-grappler-400">
              {isAesthetic ? 'Look your best' : 'Perform your best'}
            </p>
          </div>
        </div>
      </div>

      {/* Weight Progress */}
      {event.weightClass && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Scale className="w-5 h-5 text-primary-400" />
            <h3 className="font-medium text-grappler-200">Weight Progress</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-grappler-800/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-grappler-50">
                {event.currentWeight || '--'}
              </p>
              <p className="text-xs text-grappler-400">Current ({weightUnit})</p>
            </div>
            <div className="bg-grappler-800/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-grappler-50">{event.weightClass}</p>
              <p className="text-xs text-grappler-400">Target ({weightUnit})</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-grappler-400">
              <span>Progress to weight class</span>
              <span>{Math.round(weightProgress)}%</span>
            </div>
            <div className="h-3 bg-grappler-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${weightProgress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={cn(
                  'h-full rounded-full',
                  weightProgress >= 100
                    ? 'bg-green-500'
                    : weightProgress >= 60
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                )}
              />
            </div>
            {event.currentWeight && event.weightClass && event.currentWeight > event.weightClass && (
              <p className="text-xs text-yellow-400 mt-1">
                {(event.currentWeight - event.weightClass).toFixed(1)} {weightUnit} to lose
              </p>
            )}
            {event.currentWeight && event.weightClass && event.currentWeight <= event.weightClass && (
              <p className="text-xs text-green-400 mt-1">On weight or below target</p>
            )}
          </div>
        </div>
      )}

      {/* Weight Cut Safety Warnings */}
      {event.weightClass && event.currentWeight && event.currentWeight > event.weightClass && (
        <WeightCutWarnings
          currentWeight={event.currentWeight}
          targetWeight={event.weightClass}
          daysRemaining={daysRemaining}
          weightUnit={weightUnit}
        />
      )}

      {/* Phase Timeline */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary-400" />
          <h3 className="font-medium text-grappler-200">Training Phase Timeline</h3>
        </div>
        <div className="space-y-2">
          {timeline.map((item) => {
            const info = PHASE_INFO[item.phase];
            const isCurrentPhase = item.phase === phase;

            return (
              <motion.div
                key={item.phase}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border transition-all',
                  isCurrentPhase
                    ? cn(info.bgColor, info.borderColor)
                    : 'border-transparent bg-grappler-800/30'
                )}
              >
                <div
                  className={cn(
                    'w-3 h-3 rounded-full flex-shrink-0',
                    isCurrentPhase ? info.color.replace('text-', 'bg-') : 'bg-grappler-600'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      isCurrentPhase ? info.color : 'text-grappler-400'
                    )}
                  >
                    {info.name}
                    {isCurrentPhase && (
                      <span className="ml-2 text-xs bg-white/10 px-2 py-0.5 rounded-full">
                        You are here
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-grappler-400">
                    {item.endWeeks === 0
                      ? 'Final week'
                      : `${item.endWeeks + 1} - ${item.startWeeks} weeks out`}
                  </p>
                </div>
                <div className={cn('flex-shrink-0', isCurrentPhase ? info.color : 'text-grappler-600')}>
                  {info.icon}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Phase-Specific Recommendations */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-primary-400" />
          <h3 className="font-medium text-grappler-200">
            {isAesthetic ? 'Aesthetic Prep Tips' : 'Training Recommendations'}
          </h3>
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium ml-auto',
              phaseInfo.bgColor,
              phaseInfo.color
            )}
          >
            {phaseInfo.name}
          </span>
        </div>
        <div className="space-y-3">
          {recommendations.map((rec, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-start gap-3 text-sm"
            >
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5',
                  phaseInfo.bgColor,
                  phaseInfo.color
                )}
              >
                {i + 1}
              </div>
              <p className="text-grappler-200">{rec}</p>
            </motion.div>
          ))}
        </div>

        {/* Aesthetic event extra info */}
        {isAesthetic && phase === 'taper' && (
          <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <p className="text-xs text-purple-400 font-medium mb-1">Water Manipulation Note</p>
            <p className="text-xs text-grappler-300">
              Start increasing water intake to 2x normal 5 days out, then taper down.
              Consult with a prep coach for personalized protocols.
            </p>
          </div>
        )}
        {isAesthetic && phase === 'event_week' && (
          <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <p className="text-xs text-purple-400 font-medium mb-1">Carb Load Protocol</p>
            <p className="text-xs text-grappler-300">
              Begin carb loading 2-3 days before the event. Focus on complex carbs, low fiber,
              and moderate sodium. Sip water -- do not chug. You should look full and dry.
            </p>
          </div>
        )}
      </div>

      {/* Fight Camp Nutrition Phase (combat athletes) */}
      {isCombatAthlete && fightCampPhase && fightCampConfig && !isPast && (
        <div className="card p-4 border border-blue-500/30 bg-blue-500/5">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-5 h-5 text-blue-400" />
            <h3 className="font-medium text-blue-300">Fight Camp Nutrition</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-medium ml-auto">
              {fightCampPhase.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-sm text-grappler-300 mb-3">{fightCampConfig.focus}</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-grappler-800/50 rounded-lg p-2 text-center">
              <p className="text-xs text-grappler-400">Protein</p>
              <p className="text-sm font-bold text-grappler-100">
                {fightCampConfig.proteinGKg.min}-{fightCampConfig.proteinGKg.max} g/kg
              </p>
            </div>
            <div className="bg-grappler-800/50 rounded-lg p-2 text-center">
              <p className="text-xs text-grappler-400">Carbs</p>
              <p className="text-sm font-bold text-grappler-100">
                {fightCampConfig.carbsGKg.min}-{fightCampConfig.carbsGKg.max} g/kg
              </p>
            </div>
            <div className="bg-grappler-800/50 rounded-lg p-2 text-center">
              <p className="text-xs text-grappler-400">Fat</p>
              <p className="text-sm font-bold text-grappler-100">
                {fightCampConfig.fatGKg.min}-{fightCampConfig.fatGKg.max} g/kg
              </p>
            </div>
          </div>
          {fightCampConfig.recommendations.length > 0 && (
            <div className="space-y-1">
              {fightCampConfig.recommendations.map((rec: string, i: number) => (
                <p key={i} className="text-xs text-grappler-300 flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">&#x2022;</span>
                  {rec}
                </p>
              ))}
            </div>
          )}
          {fightCampConfig.warnings.length > 0 && (
            <div className="mt-3 space-y-1">
              {fightCampConfig.warnings.map((w: string, i: number) => (
                <p key={i} className="text-xs text-yellow-400 flex items-start gap-2">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  {w}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Weight Cut Plan (combat athletes) */}
      {isCombatAthlete && isCombatEvent && needsWeightCut && !isPast && (
        <div className="card p-4 border border-purple-500/30 bg-purple-500/5">
          <div className="flex items-center gap-2 mb-3">
            <Scale className="w-5 h-5 text-purple-400" />
            <h3 className="font-medium text-purple-300">Weight Cut Protocol</h3>
          </div>
          {hasWeightCutPlan ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-grappler-200">
                    Phase: <span className="font-medium text-purple-300">{weightCutPlan.currentPhase.replace(/_/g, ' ')}</span>
                  </p>
                  <p className="text-xs text-grappler-400">
                    Safety: <span className={cn(
                      'font-medium',
                      weightCutPlan.safetyLevel === 'safe' ? 'text-green-400' :
                      weightCutPlan.safetyLevel === 'caution' ? 'text-yellow-400' :
                      weightCutPlan.safetyLevel === 'danger' ? 'text-red-400' : 'text-red-500'
                    )}>{weightCutPlan.safetyLevel}</span>
                  </p>
                </div>
                <button
                  onClick={onOpenWeightCut}
                  className="btn btn-primary btn-sm"
                >
                  Open Dashboard
                </button>
              </div>
              {weightCutPlan.safetyAlerts.length > 0 && (
                <div className="space-y-1">
                  {weightCutPlan.safetyAlerts.slice(0, 2).map((alert: string, i: number) => (
                    <p key={i} className="text-xs text-yellow-400 flex items-start gap-2">
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      {alert}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-grappler-300">
                You need to lose {event.currentWeight && event.weightClass
                  ? `${(event.currentWeight - event.weightClass).toFixed(1)} ${weightUnit}`
                  : 'weight'} for this event. Start a guided weight cut protocol with safety monitoring.
              </p>
              <button
                onClick={onStartWeightCut}
                className="btn btn-primary btn-sm w-full"
              >
                Start Weight Cut Protocol
              </button>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {event.notes && (
        <div className="card p-4">
          <p className="text-xs text-grappler-400 mb-1">Notes</p>
          <p className="text-sm text-grappler-200">{event.notes}</p>
        </div>
      )}
    </motion.div>
  );
}
