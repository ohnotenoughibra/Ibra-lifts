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
  Users,
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
  /** Which top-level tab this tile belongs to. Drives 3-tab nav split. */
  tab?: 'train' | 'body';
  /** Hide for users whose sex doesn't match. Currently only 'female' (cycle tracking). */
  gendered?: 'female';
}

interface Category {
  title: string;
  icon: React.ElementType;
  accent: string;
  tools: Tool[];
}

// ─── Tool Database (post-audit cull: 32 → 14) ──────────────────────────────
//
// Demoted to deep-link only (engine + overlay still wired, no tile):
//   templates, periodization, one_rm, plate_calc, warm_up, plyometrics,
//   energy_systems (merged into conditioning), grip_strength, rehab,
//   injury_aware_workout, training_load, wearable, training_journal,
//   corner_coach, overload (folded into strength), profiler (folded into strength)
//
// Each tool now declares `tab: 'train' | 'body'` to drive the new 3-tab nav.

const CATEGORIES: Category[] = [
  {
    title: 'TRAIN',
    icon: Flame,
    accent: 'text-orange-400',
    tools: [
      { id: 'program_browser', label: 'Programs', desc: 'Browse, preview, queue', longDesc: 'Mesocycles, periodization view, AI block suggestions, queue your next block. Speed-Strength (plyometric) and Energy Systems blocks live here as program presets.', keywords: 'program browser mesocycle block plan periodization deload peak taper schedule plyometric speed strength', icon: Sparkles, color: 'from-sky-500/20 to-sky-500/5 text-sky-400', tab: 'train' },
      { id: 'builder', label: 'Builder', desc: 'Custom one-off session', longDesc: 'Design a one-off session from 300+ exercises with sets, reps, and RPE. Save as template inline.', keywords: 'create make design custom build workout session template save', icon: Dumbbell, color: 'from-primary-500/20 to-primary-500/5 text-primary-400', tab: 'train' },
      { id: 'conditioning', label: 'Cardio', desc: 'Z2, threshold, RSA, intervals', longDesc: 'All cardio in one place: Zone 2 base, Norwegian 4×4, repeated sprint ability, EMOM, Tabata, AMRAP, shark tanks, custom circuits. HR zones calculated.', keywords: 'cardio conditioning zone 2 z2 threshold norwegian 4x4 vo2max rsa repeated sprint tempo aerobic anaerobic emom tabata amrap circuit shark tank intervals heart rate', icon: Heart, color: 'from-rose-500/20 to-rose-500/5 text-rose-400', tab: 'train', isPro: true },
      { id: 'mobility', label: 'Mobility', desc: 'Stretching & ROM', longDesc: 'Body check-in with stretching protocols, ROM tracking, and soreness logging.', keywords: 'stretch flexible rom range motion yoga foam roll mobility joint stiff tight', icon: Move, color: 'from-teal-500/20 to-teal-500/5 text-teal-400', tab: 'train', isPro: true },
      { id: 'grappling', label: 'Mat Sessions', desc: 'BJJ, wrestling, sparring', longDesc: 'Session tracker with technique notes and mat time. For round-count CTE-load tracking, see Sparring Load.', keywords: 'bjj jiu jitsu wrestling mma roll mat submission martial arts grappling drilling', icon: Navigation, color: 'from-blue-500/20 to-blue-500/5 text-blue-400', tab: 'train', isPro: true },
      { id: 'sparring_tracker', label: 'Sparring Load', desc: 'Round-count CTE risk', longDesc: 'Live sparring rounds tracked separately from mat time. Effective hard rounds (intensity-weighted), ACWR spike detection, CTE-zone alerts. Top-3 concussion risk metric for combat athletes.', keywords: 'sparring rounds rolling live boxing kickboxing muay thai mma cte concussion head trauma load risk overload taper hard fighting', icon: Shield, color: 'from-rose-500/20 to-rose-500/5 text-rose-400', tab: 'train', isPro: true },
      { id: 'technique_log', label: 'Technique Log', desc: 'Drilling reps tracker', longDesc: 'Log drilling reps by technique. Skill compounds with reps — track which moves you\'ve drilled 100, 500, 2000, 10000 times. Greg Jackson mastery rule, made trackable.', keywords: 'technique drilling reps skill mastery move single leg double pass guard sweep submission jab cross combo combat', icon: Target, color: 'from-amber-500/20 to-amber-500/5 text-amber-400', tab: 'train', isPro: true },
      { id: 'camp_timeline', label: 'Camp Timeline', desc: '10-week fight camp at a glance', longDesc: 'Visualize the full fight camp: off-season → base → intensification → peak → fight week. Current phase prescription, days to fight, deload alignment.', keywords: 'fight camp timeline phase week peak base intensification taper fight day weigh in countdown competition tournament', icon: Swords, color: 'from-red-500/20 to-red-500/5 text-red-400', tab: 'train', isPro: true },
      { id: 'movement_library', label: 'Exercise Library', desc: 'Browse & add exercises', longDesc: 'Searchable exercise database with form cues, muscle targets, and alternatives. Add custom exercises not in the database.', keywords: 'exercise library reference form cues movement muscles custom add', icon: BookOpen, color: 'from-indigo-500/20 to-indigo-500/5 text-indigo-400', tab: 'train' },
      { id: 'knowledge_hub', label: 'Knowledge', desc: 'Science-backed articles', longDesc: 'Curated library of science-backed articles on strength, nutrition, recovery, and combat sports training.', keywords: 'articles knowledge learn science research evidence based study insights', icon: BookMarked, color: 'from-indigo-500/20 to-indigo-500/5 text-indigo-400', tab: 'train' },
      { id: 'competition', label: 'Fight Prep', desc: 'Peak, cut, taper', longDesc: 'Competition peaking with taper protocols, weight cut management, rehydration plans, and fight-day fueling.', keywords: 'meet competition event peak taper fight tournament weigh in weight cut rehydrate refeed combat sport mma boxing muay thai', icon: Swords, color: 'from-red-500/20 to-red-500/5 text-red-400', tab: 'train', isPro: true },
    ],
  },
  {
    title: 'BODY',
    icon: Heart,
    accent: 'text-rose-400',
    tools: [
      { id: 'recovery', label: 'Recovery', desc: 'Readiness, fatigue, deload', longDesc: 'Composite readiness from sleep, stress, soreness, HRV. Fatigue debt, smart deload recommendations, recovery protocols. Wearable data flows here.', keywords: 'rest readiness soreness recover ready sleep stress fatigue deload hrv whoop wearable', icon: Heart, color: 'from-rose-500/20 to-rose-500/5 text-rose-400', tab: 'body', isPro: true },
      { id: 'nutrition', label: 'Nutrition', desc: 'Macros & meal tracking', longDesc: 'Full macro tracking with daily targets and cutting/bulking protocols.', keywords: 'food eat diet meal calories macros protein carbs fat water hydration weight cut bulk', icon: Apple, color: 'from-green-500/20 to-green-500/5 text-green-400', tab: 'body' },
      { id: 'strength', label: 'Strength', desc: 'PRs, progression, sticking points', longDesc: 'e1RM trends, PR tracking, sticking-point detection, progression over time, per-exercise deep-dive.', keywords: 'pr personal record max strength progression overload chart trend e1rm sticking point weak profiler', icon: BarChart3, color: 'from-red-500/20 to-red-500/5 text-red-400', tab: 'body', isPro: true },
      { id: 'volume_map', label: 'Volume & Balance', desc: 'Muscle volume + ratios', longDesc: 'Weekly sets per muscle group against MEV/MAV/MRV landmarks. Push/pull ratios and imbalance detection.', keywords: 'muscle group heatmap volume sets weekly body part split balance ratio push pull imbalance mev mav mrv', icon: Activity, color: 'from-pink-500/20 to-pink-500/5 text-pink-400', tab: 'body', isPro: true },
      { id: 'athletic_benchmarks', label: 'Benchmarks', desc: 'Vertical, sprint, shuttle, hang', longDesc: 'Six tested attributes with tier classification and weakest-link auto-routing to the right training tool.', keywords: 'benchmark test athletic vertical jump broad sprint shuttle agility hang push up combat fitness assessment combine attributes weakest', icon: BarChart3, color: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400', tab: 'body', isPro: true },
      { id: 'injury', label: 'Setbacks', desc: 'Injury & illness', longDesc: 'Track injuries by body region. Launch phased Rehab Plan or generate an Injury-Aware Workout. Illness logging with Neck Check return-to-training is one tap away.', keywords: 'hurt pain injury rehab illness sick cold flu fever symptom shoulder knee back elbow wrist hip joint muscle strain return train neck check', icon: Shield, color: 'from-sky-500/20 to-sky-500/5 text-sky-400', tab: 'body', isPro: true },
      { id: 'cycle_tracking', label: 'Cycle', desc: 'Menstrual cycle phases', longDesc: 'Log cycle phases to optimize training around hormonal fluctuations.', keywords: 'period menstrual cycle female women hormone luteal follicular ovulation pms', icon: Activity, color: 'from-pink-500/20 to-pink-500/5 text-pink-400', tab: 'body', isPro: true, gendered: 'female' },
      { id: 'coach_report', label: 'Coach Report', desc: 'Share status with your coach', longDesc: 'Read-only snapshot of your training, recovery, body weight, and active injuries — share via native share or copy as text. Keep your coach in the loop.', keywords: 'coach trainer share send report summary status update injury weight', icon: Users, color: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400', tab: 'body' },
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
  /** When set, only renders tools whose `tab` matches. Used by the Train and Body tabs to embed filtered tool sections. */
  filterTab?: 'train' | 'body';
}

export default function ExploreTab({ onNavigate, filterTab }: ExploreTabProps) {
  const [search, setSearch] = useState('');
  const [pinnedIds, setPinnedIds] = useState<string[]>(readPins);
  const [usageMap, setUsageMap] = useState<Record<string, number>>(() => readJson(STORAGE_KEY_USAGE, {}));
  const [allToolsExpanded, setAllToolsExpanded] = useState(false);

  const tier = useCurrentTier();
  const isFree = tier !== 'pro';

  // Tab-scoped views — when embedded inside Train or Body tab, only show that subset.
  const visibleCategories = useMemo(
    () => filterTab ? CATEGORIES.filter(c => c.tools.some(t => t.tab === filterTab)).map(c => ({ ...c, tools: c.tools.filter(t => t.tab === filterTab) })) : CATEGORIES,
    [filterTab]
  );
  const visibleTools = useMemo(
    () => filterTab ? ALL_TOOLS.filter(t => t.tab === filterTab) : ALL_TOOLS,
    [filterTab]
  );

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
    const all = getRightNowSuggestions({
      hasTrainedToday,
      hoursSinceLastWorkout,
      hasActiveInjury,
      hasActiveCut,
      daysToCompetition,
      mealsLoggedToday,
      isRestDay,
      hasActiveProgram,
    }, pinSet);
    // Scope to the active tab when embedded inside Train or Body
    if (!filterTab) return all;
    return all.filter(s => {
      const tool = TOOL_MAP.get(s.toolId);
      return tool?.tab === filterTab;
    });
  }, [workoutLogs, trainingSessions, meals, injuryLog, competitions, weightCutPlans, currentMesocycle, pinnedIds, filterTab]);

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

  const pinnedTools = useMemo(() => {
    const all = pinnedIds.map(id => TOOL_MAP.get(id)).filter(Boolean) as Tool[];
    return filterTab ? all.filter(t => t.tab === filterTab) : all;
  }, [pinnedIds, filterTab]);

  // Search
  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase().trim();
    const words = q.split(/\s+/);
    const scored: { tool: Tool; score: number }[] = [];
    for (const tool of visibleTools) {
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
  }, [search, pinnedIds, visibleTools]);

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
                      'w-full flex items-center gap-3.5 p-4 rounded-lg bg-gradient-to-r border',
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

      {/* ─── ROLE-BASED RECOMMENDATIONS — only on the Train tab (these are all train-affinity tools) ─── */}
      {!pinMode && !isSearching && isCombatAthlete && filterTab !== 'body' && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-grappler-400 uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            For Fighters
          </p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: 'grappling' as NonNullable<OverlayView>, label: 'Mat Sessions', desc: 'Log rolls & sparring', icon: Shield, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
              { id: 'competition' as NonNullable<OverlayView>, label: 'Fight Prep', desc: 'Competition timeline', icon: Swords, color: 'text-red-400 bg-red-500/10 border-red-500/20' },
              { id: 'conditioning' as NonNullable<OverlayView>, label: 'Cardio', desc: 'Round-ready intervals', icon: Flame, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
              { id: 'sparring_tracker' as NonNullable<OverlayView>, label: 'Sparring Load', desc: 'CTE risk tracker', icon: Target, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
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
                All {visibleTools.length} tools
              </span>
              <span className="text-xs text-grappler-500">
                {tier === 'pro'
                  ? 'all unlocked'
                  : `${visibleTools.filter(t => !t.isPro).length} free / ${visibleTools.filter(t => t.isPro).length} Pro`
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
                  {visibleTools.map(tool => (
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
      {pinMode && visibleCategories.map(category => (
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
