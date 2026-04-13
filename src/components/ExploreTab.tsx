'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dumbbell, Layers, Sparkles, Calendar,
  TrendingUp, BarChart3, Target, Calculator, Activity,
  Heart, Shield, Zap, Watch,
  Apple, Grip, Flame, Gauge,
  Swords, Navigation, Move,
  Search, Pin, Check,
  Hammer, Eye,
  BookOpen, Timer, Thermometer,
  BookMarked, MessageCircle,
  ChevronDown, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticMedium } from '@/lib/haptics';
import { useAppStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { useCurrentTier } from '@/lib/useFeatureAccess';
import { getTopTools } from '@/lib/tool-affinity';
import type { OverlayView } from './dashboard-types';

// ─── Tool & Category Types ──────────────────────────────────────────────────

export interface Tool {
  id: NonNullable<OverlayView>;
  label: string;
  desc: string;
  longDesc: string;
  keywords: string;
  icon: React.ElementType;
  color: string;
  isPro?: boolean;
}

interface Category {
  title: string;
  icon: React.ElementType;
  accent: string;
  tools: Tool[];
}

// ─── Tool Database ──────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  {
    title: 'BUILD',
    icon: Hammer,
    accent: 'text-primary-400',
    tools: [
      { id: 'builder', label: 'Workout Builder', desc: 'Create custom sessions', longDesc: 'Design sessions from 300+ exercises with sets, reps, and RPE targets', keywords: 'create make design gym routine plan workout session custom build program training', icon: Dumbbell, color: 'from-primary-500/20 to-primary-500/5 text-primary-400' },
      { id: 'templates', label: 'Templates', desc: 'Save & reuse workouts', longDesc: 'Save any workout as a reusable template — load it in one tap', keywords: 'save reuse preset routine copy duplicate favorite bookmark', icon: Layers, color: 'from-blue-500/20 to-blue-500/5 text-blue-400', isPro: true },
      { id: 'program_browser', label: 'Program Browser', desc: 'Browse & preview training blocks', longDesc: 'Browse all program types, preview workouts, get AI suggestions, and queue your next block', keywords: 'auto generate smart suggest recommend ai mesocycle block plan program browse preview next', icon: Sparkles, color: 'from-sky-500/20 to-sky-500/5 text-sky-400' },
      { id: 'periodization', label: 'Periodization', desc: 'Plan your training phases', longDesc: 'Plan mesocycles with deload weeks, peak phases, and volume waves', keywords: 'phase cycle calendar deload peak taper block mesocycle schedule week', icon: Calendar, color: 'from-teal-500/20 to-teal-500/5 text-teal-400', isPro: true },
      { id: 'one_rm', label: '1RM Calculator', desc: 'Estimate your max', longDesc: 'Estimate your one-rep max from any rep range using validated formulas', keywords: 'one rep max calculator estimate weight heavy bench squat deadlift press strength', icon: Calculator, color: 'from-cyan-500/20 to-cyan-500/5 text-cyan-400' },
      { id: 'plate_calc', label: 'Plate Calculator', desc: 'Which plates to load', longDesc: 'Enter a target weight and see exactly which plates to load on each side of the bar', keywords: 'plate calculator barbell loading weight plates per side warm up ramp', icon: Calculator, color: 'from-amber-500/20 to-amber-500/5 text-amber-400' },
      { id: 'movement_library', label: 'Exercise Library', desc: 'Browse & add exercises', longDesc: 'Searchable exercise database with form cues, muscle targets, and alternatives. Add custom exercises not in the database.', keywords: 'exercise library reference form cues technique how to movement muscles create new custom machine cable dumbbell barbell add', icon: BookOpen, color: 'from-indigo-500/20 to-indigo-500/5 text-indigo-400' },
      { id: 'warm_up', label: 'Warm-Up Protocols', desc: 'Dynamic warm-ups for sessions', longDesc: 'Follow guided warm-up sequences tailored to your upcoming workout — dynamic stretches, activation drills, and ramp-up sets', keywords: 'warm up warmup dynamic stretch activation ramp prep routine movement prep pre workout', icon: Flame, color: 'from-orange-500/20 to-orange-500/5 text-orange-400' },
      { id: 'knowledge_hub', label: 'Knowledge Hub', desc: 'Science-backed training articles', longDesc: 'Browse a curated library of science-backed articles on strength, nutrition, recovery, and combat sports training', keywords: 'articles knowledge learn science research evidence based tips education read study training insights', icon: BookMarked, color: 'from-indigo-500/20 to-indigo-500/5 text-indigo-400' },
      { id: 'corner_coach', label: 'Corner Coach', desc: 'Between-set coaching cues', longDesc: 'Get contextual coaching cues and reminders between sets — form tips, breathing cues, and motivational prompts', keywords: 'coach cue tip reminder form technique between sets rest advice guidance corner', icon: MessageCircle, color: 'from-violet-500/20 to-violet-500/5 text-violet-400' },
    ],
  },
  {
    title: 'TRACK',
    icon: Flame,
    accent: 'text-orange-400',
    tools: [
      { id: 'grappling', label: 'Grappling', desc: 'BJJ & wrestling tracking', longDesc: 'Session tracker with technique notes, sparring rounds, and mat time', keywords: 'bjj jiu jitsu wrestling mma roll mat submission martial arts grapple training', icon: Navigation, color: 'from-blue-500/20 to-blue-500/5 text-blue-400', isPro: true },
      { id: 'mobility', label: 'Mobility', desc: 'Stretching & ROM tracking', longDesc: 'Body check-in with stretching protocols, ROM tracking, and soreness logging', keywords: 'stretch flexible warm up cool down rom range motion yoga foam roll mobility joint stiff tight', icon: Move, color: 'from-teal-500/20 to-teal-500/5 text-teal-400', isPro: true },
      { id: 'grip_strength', label: 'Grip Strength', desc: 'Crush, pinch & hang', longDesc: 'Crush, pinch, and hang protocols for combat grip and deadlift lockout', keywords: 'grip hand forearm wrist crush pinch hang deadlift farmer carry hold squeeze', icon: Grip, color: 'from-slate-500/20 to-slate-500/5 text-slate-400', isPro: true },
      { id: 'nutrition', label: 'Nutrition', desc: 'Macros & meal tracking', longDesc: 'Full macro tracking with daily targets and cutting/bulking protocols', keywords: 'food eat diet meal calories macros protein carbs fat water hydration drink weight cut bulk lean gain lose breakfast lunch dinner snack track log fiber sugar sodium', icon: Apple, color: 'from-green-500/20 to-green-500/5 text-green-400' },
      { id: 'competition', label: 'Fight Prep', desc: 'Peak & cut for comp', longDesc: 'Competition peaking with taper protocols, weight cut management, rehydration plans, and fight-day fueling', keywords: 'meet competition event peak taper fight tournament game match powerlifting mma boxing weigh in weight cut rehydrate refeed combat sport muay thai ufc fighters mind mental confidence', icon: Swords, color: 'from-red-500/20 to-red-500/5 text-red-400', isPro: true },
      { id: 'conditioning', label: 'Conditioning', desc: 'Cardio & interval sessions', longDesc: 'Build and run combat-sport conditioning — EMOM, Tabata, AMRAP, custom circuits, shark tanks, and intervals with execution timer', keywords: 'conditioning cardio interval emom tabata amrap circuit shark tank gpp endurance stamina aerobic anaerobic hiit builder custom create timer', icon: Timer, color: 'from-orange-500/20 to-orange-500/5 text-orange-400', isPro: true },
      { id: 'training_journal', label: 'Training Journal', desc: 'Session notes & reflections', longDesc: 'Log session notes, reflections, and personal insights after every workout — build a searchable training diary over time', keywords: 'journal notes reflect diary log write session recap thoughts training', icon: BookOpen, color: 'from-amber-500/20 to-amber-500/5 text-amber-400', isPro: true },
    ],
  },
  {
    title: 'ANALYZE',
    icon: Eye,
    accent: 'text-pink-400',
    tools: [
      { id: 'overload', label: 'Progression', desc: 'Track overload over time', longDesc: 'Track if you\'re adding weight, reps, or sets over time', keywords: 'progressive overload increase weight reps sets volume stronger gains', icon: TrendingUp, color: 'from-green-500/20 to-green-500/5 text-green-400' },
      { id: 'strength', label: 'Strength Analysis', desc: 'Sticking points & PRs', longDesc: 'e1RM trends, PR tracking, and sticking-point detection with accessory recommendations', keywords: 'pr personal record max strength chart graph trend lift heavy strong e1rm estimated sticking point weak', icon: BarChart3, color: 'from-red-500/20 to-red-500/5 text-red-400', isPro: true },
      { id: 'profiler', label: 'Exercise Profiler', desc: 'Per-exercise deep dive', longDesc: 'Volume, intensity, frequency, and performance over time per exercise', keywords: 'history stats analytics individual exercise detail performance data sets reps', icon: Target, color: 'from-blue-500/20 to-blue-500/5 text-blue-400', isPro: true },
      { id: 'volume_map', label: 'Volume & Balance', desc: 'Muscle volume & split', longDesc: 'Weekly sets per muscle group against science-based volume landmarks. Includes push/pull ratios and imbalance detection.', keywords: 'muscle group heatmap chest back legs arms shoulders volume sets weekly body part split balance ratio push pull upper lower neglected imbalance', icon: Activity, color: 'from-pink-500/20 to-pink-500/5 text-pink-400', isPro: true },
      { id: 'training_load', label: 'Training Load', desc: 'ACWR & load tracking', longDesc: 'Acute:Chronic Workload Ratio — weekly load trends, 28-day heatmap, and injury risk zones', keywords: 'acwr load training volume weekly chronic acute ratio overtraining injury risk workload heatmap', icon: Gauge, color: 'from-amber-500/20 to-amber-500/5 text-amber-400', isPro: true },
    ],
  },
  {
    title: 'BODY',
    icon: Heart,
    accent: 'text-rose-400',
    tools: [
      { id: 'recovery', label: 'Recovery Hub', desc: 'Readiness, fatigue & recovery', longDesc: 'Composite readiness score from sleep, stress, and soreness. Includes fatigue debt tracking, smart deload recommendations, and personalized recovery protocols.', keywords: 'rest day off readiness soreness sore tired recover how do i feel ready sleep stress nap meditation relax nervous cns overtraining burnout advice tips fatigue exhausted worn out energy low deload debt accumulated breathing breathe wellness habits', icon: Heart, color: 'from-rose-500/20 to-rose-500/5 text-rose-400', isPro: true },
      { id: 'wearable', label: 'Wearable', desc: 'Whoop, Fit & Health', longDesc: 'Sync Whoop data, connect Google Fit, or import Apple Health exports. View strain, HR trends, sleep, and recovery scores from any source.', keywords: 'whoop wearable heart rate sync strain recovery hrv connect watch garmin oura fitness tracker auto import combat session zone bpm pulse cardio aerobic anaerobic vo2 google fit apple health iphone android', icon: Watch, color: 'from-purple-500/20 to-purple-500/5 text-purple-400', isPro: true },
      { id: 'injury', label: 'Injury Log', desc: 'Track & manage injuries', longDesc: 'Track injuries by body region and get automatic workout modifications', keywords: 'hurt pain injury rehab rehabilitation shoulder knee back elbow wrist hip joint muscle pull strain', icon: Shield, color: 'from-sky-500/20 to-sky-500/5 text-sky-400', isPro: true },
      { id: 'illness', label: 'Illness Log', desc: 'Symptoms & return-to-train', longDesc: 'Log symptoms, get evidence-based training restrictions via the Neck Check protocol, track daily recovery check-ins, and follow graduated return-to-training phases. Automatically adjusts workout intensity, freezes streaks, and modifies your mesocycle.', keywords: 'sick illness cold flu fever cough sore throat headache nausea vomiting diarrhea fatigue tired unwell symptom recovery neck check return training', icon: Thermometer, color: 'from-rose-500/20 to-rose-500/5 text-rose-400', isPro: true },
      { id: 'cycle_tracking', label: 'Cycle Tracking', desc: 'Menstrual cycle phases', longDesc: 'Log cycle phases to optimize training around hormonal fluctuations', keywords: 'period menstrual cycle female women hormone luteal follicular ovulation pms', icon: Activity, color: 'from-pink-500/20 to-pink-500/5 text-pink-400', isPro: true },
    ],
  },
];

export const ALL_TOOLS = CATEGORIES.flatMap(c => c.tools);
export const TOOL_MAP = new Map<string, Tool>(ALL_TOOLS.map(t => [t.id, t]));
export const PINNED_STORAGE_KEY = 'roots-explore-pinned';

const STORAGE_KEY_RECENT = 'roots-explore-recent';
const STORAGE_KEY_PINNED = PINNED_STORAGE_KEY;
const STORAGE_KEY_USAGE = 'roots-explore-usage';
const MAX_PINNED = 4;
const PIN_SYNC_EVENT = 'roots-pins-changed';

/** Read pins fresh from localStorage — filters out stale IDs that no longer exist in TOOL_MAP */
export function readPins(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY_PINNED) || '[]') as string[];
    const valid = raw.filter(id => TOOL_MAP.has(id));
    if (valid.length !== raw.length) {
      localStorage.setItem(STORAGE_KEY_PINNED, JSON.stringify(valid));
    }
    return valid;
  }
  catch { return []; }
}

/** Write pins + fire sync event so all mounted components update */
export function writePins(ids: string[]) {
  localStorage.setItem(STORAGE_KEY_PINNED, JSON.stringify(ids));
  window.dispatchEvent(new Event(PIN_SYNC_EVENT));
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { return JSON.parse(localStorage.getItem(key) || '') as T; }
  catch { return fallback; }
}

// ─── "Right Now" Suggestion Engine ──────────────────────────────────────────

interface RightNowContext {
  hasTrainedToday: boolean;
  hoursSinceLastWorkout: number;
  hasActiveInjury: boolean;
  hasActiveCut: boolean;
  daysToCompetition: number | null;
  mealsLoggedToday: number;
  isRestDay: boolean;
  hasActiveProgram: boolean;
}

interface RightNowSuggestion {
  toolId: string;
  reason: string;
  gradient: string;
}

// Gradient palettes for Right Now cards — visually distinct per tool domain
const GRADIENTS: Record<string, string> = {
  recovery: 'from-rose-600/30 via-rose-500/15 to-rose-900/10 border-rose-500/30',
  nutrition: 'from-green-600/30 via-green-500/15 to-green-900/10 border-green-500/30',
  warm_up: 'from-orange-600/30 via-orange-500/15 to-orange-900/10 border-orange-500/30',
  builder: 'from-primary-600/30 via-primary-500/15 to-primary-900/10 border-primary-500/30',
  competition: 'from-red-600/30 via-red-500/15 to-red-900/10 border-red-500/30',
  injury: 'from-sky-600/30 via-sky-500/15 to-sky-900/10 border-sky-500/30',
  mobility: 'from-teal-600/30 via-teal-500/15 to-teal-900/10 border-teal-500/30',
  knowledge_hub: 'from-indigo-600/30 via-indigo-500/15 to-indigo-900/10 border-indigo-500/30',
  conditioning: 'from-orange-600/30 via-orange-500/15 to-orange-900/10 border-orange-500/30',
  training_journal: 'from-amber-600/30 via-amber-500/15 to-amber-900/10 border-amber-500/30',
};

function getGradient(toolId: string): string {
  return GRADIENTS[toolId] || 'from-grappler-700/40 via-grappler-700/20 to-grappler-800/10 border-grappler-600/30';
}

function getRightNowSuggestions(ctx: RightNowContext, pinnedIds: Set<string>): RightNowSuggestion[] {
  const suggestions: RightNowSuggestion[] = [];
  const used = new Set<string>();

  const add = (toolId: string, reason: string) => {
    if (used.has(toolId) || pinnedIds.has(toolId)) return;
    if (!TOOL_MAP.has(toolId)) return;
    used.add(toolId);
    suggestions.push({ toolId, reason, gradient: getGradient(toolId) });
  };

  // Priority 1: Competition proximity (highest urgency)
  if (ctx.daysToCompetition !== null && ctx.daysToCompetition <= 30) {
    const days = ctx.daysToCompetition;
    add('competition', days <= 1 ? 'Fight day is here — final prep' : `${days} days to competition`);
    if (ctx.hasActiveCut) {
      add('nutrition', 'Weight cut active — track every meal');
    }
  }

  // Priority 2: Active injury
  if (ctx.hasActiveInjury) {
    add('injury', 'Active injury — log recovery progress');
    add('mobility', 'Injured? Mobility work aids recovery');
  }

  // Priority 3: Active weight cut (no competition)
  if (ctx.hasActiveCut && !used.has('nutrition')) {
    add('nutrition', 'Weight cut active — track your intake');
  }

  // Priority 4: Post-workout window (trained recently)
  if (ctx.hasTrainedToday && ctx.hoursSinceLastWorkout <= 4) {
    const hrs = ctx.hoursSinceLastWorkout;
    add('recovery', hrs <= 1 ? 'Just finished — time to recover' : `Trained ${hrs}h ago — check recovery`);
    if (ctx.mealsLoggedToday === 0) {
      add('nutrition', 'Post-workout nutrition matters — log a meal');
    }
    add('training_journal', 'Session fresh in mind — write it down');
  }

  // Priority 5: Haven't trained today on a training day
  if (!ctx.hasTrainedToday && !ctx.isRestDay && ctx.hasActiveProgram) {
    add('warm_up', 'Training day — warm up before you lift');
    add('builder', 'Build today\'s workout');
  }

  // Priority 6: Haven't logged food today
  if (ctx.mealsLoggedToday === 0 && !used.has('nutrition')) {
    add('nutrition', 'No meals logged today');
  }

  // Priority 7: Rest day
  if (ctx.isRestDay) {
    add('mobility', 'Rest day — perfect for mobility work');
    add('recovery', 'Rest day — check your readiness');
    add('knowledge_hub', 'Rest day — learn something new');
  }

  // Fallback: if we have nothing yet, show helpful defaults
  if (suggestions.length === 0) {
    if (ctx.hasActiveProgram) {
      add('builder', 'Ready to train? Build a session');
    }
    add('knowledge_hub', 'Browse training knowledge');
    add('recovery', 'Check your recovery status');
  }

  return suggestions.slice(0, 3);
}

// ─── Component ──────────────────────────────────────────────────────────────

interface ExploreTabProps {
  onNavigate: (view: OverlayView) => void;
}

export default function ExploreTab({ onNavigate }: ExploreTabProps) {
  const [search, setSearch] = useState('');
  const [pinnedIds, setPinnedIds] = useState<string[]>(readPins);
  const [usageMap, setUsageMap] = useState<Record<string, number>>(() => readJson(STORAGE_KEY_USAGE, {}));
  const [allToolsExpanded, setAllToolsExpanded] = useState(false);

  const tier = useCurrentTier();
  const isFree = tier !== 'pro';

  // Pin edit mode
  const [pinMode, setPinMode] = useState(false);

  // ─── Store data for "Right Now" engine ───
  const {
    workoutLogs,
    meals,
    injuryLog,
    competitions,
    weightCutPlans,
    currentMesocycle,
    trainingSessions,
    user,
  } = useAppStore(useShallow(s => ({
    workoutLogs: s.workoutLogs,
    meals: s.meals,
    injuryLog: s.injuryLog,
    competitions: s.competitions,
    weightCutPlans: s.weightCutPlans,
    currentMesocycle: s.currentMesocycle,
    trainingSessions: s.trainingSessions,
    user: s.user,
  })));

  const isCombatAthlete = user?.trainingIdentity === 'combat';

  // Sync pins with HomeTab
  useEffect(() => {
    const sync = () => setPinnedIds(readPins());
    window.addEventListener(PIN_SYNC_EVENT, sync);
    const onVisible = () => { if (!document.hidden) sync(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener(PIN_SYNC_EVENT, sync);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // ─── "Right Now" context computation ───
  const rightNowSuggestions = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // Hours since last workout
    const allSessions = [
      ...(workoutLogs ?? []).map(w => new Date(w.date).getTime()),
      ...(trainingSessions ?? []).map(t => new Date(t.date).getTime()),
    ].filter(t => !isNaN(t));
    const lastSessionMs = allSessions.length > 0 ? Math.max(...allSessions) : 0;
    const hoursSinceLastWorkout = lastSessionMs > 0
      ? Math.round((now.getTime() - lastSessionMs) / (1000 * 60 * 60))
      : 999;

    // Has trained today
    const hasTrainedToday = allSessions.some(t => {
      const d = new Date(t);
      return d.toISOString().slice(0, 10) === todayStr;
    });

    // Active injuries
    const hasActiveInjury = (injuryLog ?? []).some(
      i => !i.resolved && !i._deleted
    );

    // Active weight cut
    const hasActiveCut = (weightCutPlans ?? []).some(
      p => p.currentPhase !== 'completed' && p.currentPhase !== 'not_started'
    );

    // Days to nearest competition
    let daysToCompetition: number | null = null;
    const activeComps = (competitions ?? []).filter(c => c.isActive && !c._deleted);
    if (activeComps.length > 0) {
      const nearestMs = Math.min(
        ...activeComps.map(c => new Date(c.date).getTime())
      );
      const days = Math.ceil((nearestMs - now.getTime()) / (1000 * 60 * 60 * 24));
      if (days >= 0) daysToCompetition = days;
    }

    // Meals logged today
    const mealsLoggedToday = (meals ?? []).filter(m => {
      if (m._deleted) return false;
      const d = new Date(m.date);
      return d.toISOString().slice(0, 10) === todayStr;
    }).length;

    // Is rest day — heuristic: if user hasn't trained and hoursSinceLastWorkout > 20,
    // check if the mesocycle has sessions remaining this week
    const hasActiveProgram = !!currentMesocycle;
    let isRestDay = false;
    if (currentMesocycle) {
      const msStart = new Date(currentMesocycle.startDate).getTime();
      const weeksSinceStart = Math.floor((now.getTime() - msStart) / (7 * 24 * 60 * 60 * 1000));
      const currentWeek = currentMesocycle.weeks[weeksSinceStart];
      if (currentWeek) {
        // Count how many sessions were logged this week
        const weekStart = new Date(msStart + weeksSinceStart * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        const sessionsThisWeek = (workoutLogs ?? []).filter(w => {
          const d = new Date(w.date).getTime();
          return d >= weekStart.getTime() && d < weekEnd.getTime() && !w._deleted;
        }).length;
        // If user has completed all sessions for this week, rest day
        isRestDay = sessionsThisWeek >= currentWeek.sessions.length;
      } else {
        isRestDay = true; // past the end of the program
      }
    }

    const pinSet = new Set(pinnedIds);
    return getRightNowSuggestions({
      hasTrainedToday,
      hoursSinceLastWorkout,
      hasActiveInjury,
      hasActiveCut,
      daysToCompetition,
      mealsLoggedToday,
      isRestDay,
      hasActiveProgram,
    }, pinSet);
  }, [workoutLogs, trainingSessions, meals, injuryLog, competitions, weightCutPlans, currentMesocycle, pinnedIds]);

  const handleNavigate = useCallback((id: NonNullable<OverlayView>) => {
    setUsageMap(prev => {
      const next = { ...prev, [id]: Date.now() };
      localStorage.setItem(STORAGE_KEY_USAGE, JSON.stringify(next));
      return next;
    });
    // Track recent
    const recentIds: string[] = readJson(STORAGE_KEY_RECENT, []);
    const nextRecent = [id, ...recentIds.filter(r => r !== id)].slice(0, 4);
    localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(nextRecent));
    onNavigate(id);
  }, [onNavigate]);

  const togglePin = useCallback((id: string) => {
    hapticMedium();
    const current = readPins();
    const next = current.includes(id)
      ? current.filter(p => p !== id)
      : [...current, id].slice(0, MAX_PINNED);
    writePins(next);
    setPinnedIds(next);
  }, []);

  const handleCardTap = useCallback((id: NonNullable<OverlayView>) => {
    if (pinMode) {
      togglePin(id);
    } else {
      handleNavigate(id);
    }
  }, [pinMode, togglePin, handleNavigate]);

  const pinnedTools = useMemo(() =>
    pinnedIds.map(id => TOOL_MAP.get(id)).filter(Boolean) as Tool[],
    [pinnedIds]
  );

  // Search
  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase().trim();
    const words = q.split(/\s+/);
    const scored: { tool: Tool; score: number }[] = [];
    for (const tool of ALL_TOOLS) {
      const haystack = `${tool.label} ${tool.desc} ${tool.longDesc} ${tool.keywords}`.toLowerCase();
      if (!words.every(w => haystack.includes(w))) continue;
      let score = 0;
      const labelLower = tool.label.toLowerCase();
      const descLower = `${tool.desc} ${tool.longDesc}`.toLowerCase();
      for (const w of words) {
        if (labelLower.includes(w)) score += 10;
        if (descLower.includes(w)) score += 5;
      }
      if (pinnedIds.includes(tool.id)) score += 3;
      scored.push({ tool, score });
    }
    return scored.sort((a, b) => b.score - a.score).map(s => s.tool);
  }, [search, pinnedIds]);

  const isSearching = search.trim().length > 0;

  return (
    <div className="space-y-5">
      {/* ─── Header ─── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-grappler-50">Mission Control</h2>
          <p className="text-sm text-grappler-400">Tools come to you</p>
        </div>
        <button
          onClick={() => { hapticMedium(); setPinMode(prev => !prev); }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all',
            'active:scale-95 select-none min-h-[40px]',
            pinMode
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
              : 'bg-grappler-800 text-grappler-300 border border-grappler-700'
          )}
          style={{ touchAction: 'manipulation' }}
        >
          <Pin className="w-3.5 h-3.5" />
          {pinMode ? 'Done' : 'Edit Pins'}
        </button>
      </div>

      {/* Pin mode banner */}
      <AnimatePresence>
        {pinMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-primary-500/10 border border-primary-500/30">
              <p className="text-xs text-primary-300">
                Tap any tool to pin/unpin it
              </p>
              <span className="text-xs font-bold text-primary-400">
                {pinnedIds.length}/{MAX_PINNED}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── SECTION 1: RIGHT NOW (hero section) ─── */}
      {!pinMode && !isSearching && rightNowSuggestions.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-grappler-400 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Right Now
          </p>
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {rightNowSuggestions.map((suggestion, i) => {
                const tool = TOOL_MAP.get(suggestion.toolId);
                if (!tool) return null;
                const Icon = tool.icon;
                return (
                  <motion.button
                    key={suggestion.toolId}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ delay: i * 0.06, duration: 0.25 }}
                    onClick={() => handleNavigate(tool.id)}
                    className={cn(
                      'w-full flex items-center gap-3.5 p-4 rounded-2xl bg-gradient-to-r border',
                      'active:scale-[0.98] transition-transform select-none text-left',
                      suggestion.gradient,
                      isFree && tool.isPro && 'opacity-50'
                    )}
                    style={{ touchAction: 'manipulation' }}
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-grappler-100" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-grappler-100">{tool.label}</span>
                        {tool.isPro && (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-500/90 text-[9px] font-bold text-white uppercase tracking-wide">
                            Pro
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-grappler-300 mt-0.5 leading-snug">{suggestion.reason}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-grappler-500 flex-shrink-0" />
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ─── ROLE-BASED RECOMMENDATIONS ─── */}
      {!pinMode && !isSearching && isCombatAthlete && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-grappler-400 uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            For Fighters
          </p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: 'grappling' as NonNullable<OverlayView>, label: 'Mat Sessions', desc: 'Log rolls & sparring', icon: Shield, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
              { id: 'competition' as NonNullable<OverlayView>, label: 'Fight Prep', desc: 'Competition timeline', icon: Swords, color: 'text-red-400 bg-red-500/10 border-red-500/20' },
              { id: 'conditioning' as NonNullable<OverlayView>, label: 'Conditioning', desc: 'Round-ready cardio', icon: Flame, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
              { id: 'fighters_mind' as NonNullable<OverlayView>, label: 'Fighter\'s Mind', desc: 'Mental game', icon: Target, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
            ]).map(tool => (
              <button
                key={tool.id}
                onClick={() => handleNavigate(tool.id)}
                className={cn('flex items-center gap-2.5 p-3 rounded-xl border transition-colors active:scale-[0.98]', tool.color)}
              >
                <tool.icon className="w-4 h-4 flex-shrink-0" />
                <div className="text-left min-w-0">
                  <p className="text-xs font-semibold text-grappler-100">{tool.label}</p>
                  <p className="text-[10px] text-grappler-400 truncate">{tool.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── SECTION 2: PINNED (compact icon row) ─── */}
      {!pinMode && !isSearching && pinnedTools.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-grappler-400 uppercase tracking-wider flex items-center gap-1.5">
            <Pin className="w-3 h-3" /> Pinned
          </p>
          <div className="flex gap-2">
            {pinnedTools.map(tool => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => handleNavigate(tool.id)}
                  className={cn(
                    'w-12 h-12 rounded-xl bg-gradient-to-b flex items-center justify-center',
                    'border-2 border-primary-500/40 active:scale-90 transition-all select-none',
                    tool.color,
                    isFree && tool.isPro && 'opacity-50'
                  )}
                  style={{ touchAction: 'manipulation' }}
                  title={tool.label}
                >
                  <Icon className="w-5 h-5" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── SEARCH BAR (always visible in normal mode) ─── */}
      {!pinMode && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grappler-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search all tools..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-grappler-800/60 border border-grappler-700/50 text-sm text-grappler-200 placeholder:text-grappler-600 focus:outline-none focus:border-primary-500/50 transition-colors"
          />
        </div>
      )}

      {/* ─── Search Results ─── */}
      {!pinMode && isSearching && searchResults && searchResults.length > 0 && (
        <div>
          <p className="text-xs text-grappler-400 mb-2">{searchResults.length} result{searchResults.length === 1 ? '' : 's'}</p>
          <div className="grid grid-cols-3 gap-2">
            {searchResults.map(tool => (
              <ToolCard
                key={tool.id}
                tool={tool}
                isPinned={pinnedIds.includes(tool.id)}
                pinMode={false}
                isFree={isFree}
                onTap={handleCardTap}
              />
            ))}
          </div>
        </div>
      )}

      {!pinMode && isSearching && searchResults && searchResults.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-grappler-500">No tools matching &ldquo;{search}&rdquo;</p>
        </div>
      )}

      {/* ─── SECTION 3: ALL TOOLS (collapsed by default) ─── */}
      {!isSearching && !pinMode && (
        <div>
          <button
            onClick={() => { hapticMedium(); setAllToolsExpanded(prev => !prev); }}
            className="w-full flex items-center justify-between px-3 py-3 rounded-xl bg-grappler-800/40 border border-grappler-700/40 active:scale-[0.98] transition-all select-none"
            style={{ touchAction: 'manipulation' }}
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-grappler-400" />
              <span className="text-sm font-medium text-grappler-300">
                All {ALL_TOOLS.length} tools
              </span>
              <span className="text-xs text-grappler-500">
                {tier === 'pro'
                  ? 'all unlocked'
                  : `${ALL_TOOLS.filter(t => !t.isPro).length} free / ${ALL_TOOLS.filter(t => t.isPro).length} Pro`
                }
              </span>
            </div>
            <motion.div
              animate={{ rotate: allToolsExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4 text-grappler-500" />
            </motion.div>
          </button>

          <AnimatePresence>
            {allToolsExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-3 gap-2 pt-3">
                  {ALL_TOOLS.map(tool => (
                    <ToolCard
                      key={tool.id}
                      tool={tool}
                      isPinned={pinnedIds.includes(tool.id)}
                      pinMode={false}
                      isFree={isFree}
                      onTap={handleCardTap}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ─── PIN MODE: Show all tools in category grids for pinning ─── */}
      {pinMode && CATEGORIES.map(category => (
        <div key={category.title}>
          <p className="text-xs font-semibold text-grappler-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <category.icon className={cn('w-3.5 h-3.5', category.accent)} />
            {category.title}
            <span className="text-grappler-600 font-normal normal-case tracking-normal">&middot; {category.tools.length}</span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            {category.tools.map(tool => (
              <ToolCard
                key={tool.id}
                tool={tool}
                isPinned={pinnedIds.includes(tool.id)}
                pinMode={pinMode}
                isFree={isFree}
                onTap={handleCardTap}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── ToolCard (unchanged behavior) ──────────────────────────────────────────

function ToolCard({ tool, isPinned, pinMode, isFree, onTap }: {
  tool: Tool;
  isPinned: boolean;
  pinMode: boolean;
  isFree: boolean;
  onTap: (id: NonNullable<OverlayView>) => void;
}) {
  return (
    <button
      onClick={() => onTap(tool.id)}
      className={cn(
        'relative flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-gradient-to-b min-h-[4.5rem]',
        'active:scale-95 transition-all select-none',
        pinMode && isPinned && 'border-2 border-primary-500 ring-2 ring-primary-500/30',
        pinMode && !isPinned && 'border-2 border-dashed border-grappler-600',
        !pinMode && isPinned && 'border-2 border-primary-500/40',
        !pinMode && !isPinned && 'border border-grappler-800/50',
        tool.color,
        isFree && tool.isPro && !pinMode && 'opacity-50'
      )}
      style={{ touchAction: 'manipulation' }}
    >
      {pinMode && isPinned && (
        <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center pointer-events-none">
          <Check className="w-3 h-3 text-white" />
        </span>
      )}

      {tool.isPro && !pinMode && (
        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-md bg-amber-500/90 text-[10px] font-bold text-white uppercase tracking-wide shadow-sm pointer-events-none">
          Pro
        </span>
      )}

      {pinMode ? (
        <Pin className={cn('w-5 h-5', isPinned ? 'text-primary-400' : 'text-grappler-500')} />
      ) : (
        <tool.icon className="w-5 h-5" />
      )}

      <span className={cn(
        'text-xs font-medium text-center leading-snug line-clamp-1',
        pinMode && !isPinned ? 'text-grappler-400' : 'text-grappler-200'
      )}>
        {tool.label}
      </span>
      <span className={cn(
        'text-xs text-center leading-tight line-clamp-2',
        pinMode ? (isPinned ? 'text-primary-400' : 'text-grappler-500') : 'text-grappler-400'
      )}>
        {pinMode ? (isPinned ? 'Pinned' : 'Tap to pin') : tool.desc}
      </span>
    </button>
  );
}
