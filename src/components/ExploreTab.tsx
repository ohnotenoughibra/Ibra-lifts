'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Dumbbell, Layers, Sparkles, Calendar,
  TrendingUp, BarChart3, Target, Calculator, Activity,
  Heart, Shield, Zap, Watch,
  Apple, Grip, Flame, Gauge,
  Swords, Navigation, Move,
  Search, Clock, Pin, Check,
  Hammer, Eye, Wind,
  BookOpen, Timer, Brain, Thermometer,
  BookMarked, Share2, Trophy, MessageCircle,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticMedium } from '@/lib/haptics';
import { useAppStore } from '@/lib/store';
import { useCurrentTier } from '@/lib/useFeatureAccess';
import { getTopTools } from '@/lib/tool-affinity';
import type { OverlayView } from './dashboard-types';

export interface Tool {
  id: NonNullable<OverlayView>;
  label: string;
  desc: string;
  longDesc: string;
  keywords: string;
  icon: React.ElementType;
  color: string;
  isPro?: boolean;
  core?: boolean;
}

interface Category {
  title: string;
  icon: React.ElementType;
  accent: string;
  tools: Tool[];
}

const CATEGORIES: Category[] = [
  {
    title: 'Build',
    icon: Hammer,
    accent: 'text-primary-400',
    tools: [
      { id: 'builder', label: 'Workout Builder', desc: 'Create custom sessions', longDesc: 'Design sessions from 300+ exercises with sets, reps, and RPE targets', keywords: 'create make design gym routine plan workout session custom build program training', icon: Dumbbell, color: 'from-primary-500/20 to-primary-500/5 text-primary-400', core: true },
      { id: 'templates', label: 'Templates', desc: 'Save & reuse workouts', longDesc: 'Save any workout as a reusable template — load it in one tap', keywords: 'save reuse preset routine copy duplicate favorite bookmark', icon: Layers, color: 'from-blue-500/20 to-blue-500/5 text-blue-400', isPro: true },
      { id: 'block_suggestion', label: 'AI Program', desc: 'Auto-generate a block', longDesc: 'Auto-generate a periodized block based on your goals and schedule', keywords: 'auto generate smart suggest recommend ai mesocycle block plan program', icon: Sparkles, color: 'from-sky-500/20 to-sky-500/5 text-sky-400', isPro: true, core: true },
      { id: 'periodization', label: 'Periodization', desc: 'Plan training phases', longDesc: 'Plan mesocycles with deload weeks, peak phases, and volume waves', keywords: 'phase cycle calendar deload peak taper block mesocycle schedule week', icon: Calendar, color: 'from-teal-500/20 to-teal-500/5 text-teal-400', isPro: true },
      { id: 'one_rm', label: '1RM Calculator', desc: 'Estimate your max', longDesc: 'Estimate your one-rep max from any rep range using validated formulas', keywords: 'one rep max calculator estimate weight heavy bench squat deadlift press strength', icon: Calculator, color: 'from-cyan-500/20 to-cyan-500/5 text-cyan-400', core: true },
      { id: 'plate_calc', label: 'Plate Calculator', desc: 'What plates to load', longDesc: 'Enter a target weight and see exactly which plates to load on each side of the bar', keywords: 'plate calculator barbell loading weight plates per side warm up ramp', icon: Calculator, color: 'from-amber-500/20 to-amber-500/5 text-amber-400', core: true },
      { id: 'movement_library', label: 'Exercise Library', desc: 'Browse & add exercises', longDesc: 'Searchable exercise database with form cues, muscle targets, and alternatives. Add custom exercises not in the database.', keywords: 'exercise library reference form cues technique how to movement muscles create new custom machine cable dumbbell barbell add', icon: BookOpen, color: 'from-indigo-500/20 to-indigo-500/5 text-indigo-400' },
      { id: 'warm_up', label: 'Warm-Up Protocols', desc: 'Dynamic warm-up routines for your session', longDesc: 'Follow guided warm-up sequences tailored to your upcoming workout — dynamic stretches, activation drills, and ramp-up sets', keywords: 'warm up warmup dynamic stretch activation ramp prep routine movement prep pre workout', icon: Flame, color: 'from-orange-500/20 to-orange-500/5 text-orange-400' },
    ],
  },
  {
    title: 'Track',
    icon: Flame,
    accent: 'text-orange-400',
    tools: [
      { id: 'grappling', label: 'Grappling', desc: 'BJJ & wrestling tools', longDesc: 'Session tracker with technique notes, sparring rounds, and mat time', keywords: 'bjj jiu jitsu wrestling mma roll mat submission martial arts grapple training', icon: Navigation, color: 'from-blue-500/20 to-blue-500/5 text-blue-400', isPro: true, core: true },
      { id: 'mobility', label: 'Mobility', desc: 'Stretching & ROM', longDesc: 'Body check-in with stretching protocols, ROM tracking, and soreness logging', keywords: 'stretch flexible warm up cool down rom range motion yoga foam roll mobility joint stiff tight', icon: Move, color: 'from-teal-500/20 to-teal-500/5 text-teal-400', isPro: true, core: true },
      { id: 'grip_strength', label: 'Grip Strength', desc: 'Grip training protocol', longDesc: 'Crush, pinch, and hang protocols for combat grip and deadlift lockout', keywords: 'grip hand forearm wrist crush pinch hang deadlift farmer carry hold squeeze', icon: Grip, color: 'from-slate-500/20 to-slate-500/5 text-slate-400', isPro: true },
      { id: 'nutrition', label: 'Nutrition', desc: 'Macros & meal planning', longDesc: 'Full macro tracking with daily targets and cutting/bulking protocols', keywords: 'food eat diet meal calories macros protein carbs fat water hydration drink weight cut bulk lean gain lose breakfast lunch dinner snack track log fiber sugar sodium', icon: Apple, color: 'from-green-500/20 to-green-500/5 text-green-400', isPro: true, core: true },
      { id: 'competition', label: 'Fight Prep', desc: 'Peak & cut for competition', longDesc: 'Competition peaking with taper protocols, weight cut management, rehydration plans, and fight-day fueling', keywords: 'meet competition event peak taper fight tournament game match powerlifting mma boxing weigh in weight cut rehydrate refeed combat sport muay thai ufc', icon: Swords, color: 'from-red-500/20 to-red-500/5 text-red-400', isPro: true, core: true },
      { id: 'conditioning', label: 'Conditioning', desc: 'Cardio & interval protocols', longDesc: 'Build and run combat-sport conditioning — EMOM, Tabata, AMRAP, custom circuits, shark tanks, and intervals with execution timer', keywords: 'conditioning cardio interval emom tabata amrap circuit shark tank gpp endurance stamina aerobic anaerobic hiit builder custom create timer', icon: Timer, color: 'from-orange-500/20 to-orange-500/5 text-orange-400', isPro: true },
      { id: 'training_journal', label: 'Training Journal', desc: 'Session notes, reflections & training journal', longDesc: 'Log session notes, reflections, and personal insights after every workout — build a searchable training diary over time', keywords: 'journal notes reflect diary log write session recap thoughts training', icon: BookOpen, color: 'from-amber-500/20 to-amber-500/5 text-amber-400', isPro: true },
    ],
  },
  {
    title: 'Analyze',
    icon: Eye,
    accent: 'text-pink-400',
    tools: [
      { id: 'overload', label: 'Progression', desc: 'Track overload strategy', longDesc: 'Track if you\'re adding weight, reps, or sets over time', keywords: 'progressive overload increase weight reps sets volume stronger gains', icon: TrendingUp, color: 'from-green-500/20 to-green-500/5 text-green-400' },
      { id: 'strength', label: 'Strength Analysis', desc: 'Sticking points & PRs', longDesc: 'e1RM trends, PR tracking, and sticking-point detection with accessory recommendations', keywords: 'pr personal record max strength chart graph trend lift heavy strong e1rm estimated sticking point weak', icon: BarChart3, color: 'from-red-500/20 to-red-500/5 text-red-400', isPro: true },
      { id: 'profiler', label: 'Exercise Profiler', desc: 'Per-exercise deep dive', longDesc: 'Volume, intensity, frequency, and performance over time per exercise', keywords: 'history stats analytics individual exercise detail performance data sets reps', icon: Target, color: 'from-blue-500/20 to-blue-500/5 text-blue-400', isPro: true },
      { id: 'volume_map', label: 'Volume & Balance', desc: 'Muscle group volume & split', longDesc: 'Weekly sets per muscle group against science-based volume landmarks. Includes push/pull ratios and imbalance detection.', keywords: 'muscle group heatmap chest back legs arms shoulders volume sets weekly body part split balance ratio push pull upper lower neglected imbalance', icon: Activity, color: 'from-pink-500/20 to-pink-500/5 text-pink-400', isPro: true },
      { id: 'training_load', label: 'Training Load', desc: 'ACWR & load tracking', longDesc: 'Acute:Chronic Workload Ratio — weekly load trends, 28-day heatmap, and injury risk zones', keywords: 'acwr load training volume weekly chronic acute ratio overtraining injury risk workload heatmap', icon: Gauge, color: 'from-amber-500/20 to-amber-500/5 text-amber-400', isPro: true },
    ],
  },
  {
    title: 'Body',
    icon: Heart,
    accent: 'text-rose-400',
    tools: [
      { id: 'recovery', label: 'Recovery Hub', desc: 'Readiness, fatigue & recovery', longDesc: 'Composite readiness score from sleep, stress, and soreness. Includes fatigue debt tracking, smart deload recommendations, and personalized recovery protocols.', keywords: 'rest day off readiness soreness sore tired recover how do i feel ready sleep stress nap meditation relax nervous cns overtraining burnout advice tips fatigue exhausted worn out energy low deload debt accumulated', icon: Heart, color: 'from-rose-500/20 to-rose-500/5 text-rose-400', isPro: true, core: true },
      { id: 'wearable', label: 'Wearable', desc: 'Whoop sync & strain data', longDesc: 'Sync Whoop data, view strain and HR trends, auto-import combat sessions, and monitor recovery', keywords: 'whoop wearable heart rate sync strain recovery hrv connect watch garmin oura fitness tracker auto import combat session zone bpm pulse cardio aerobic anaerobic vo2', icon: Watch, color: 'from-purple-500/20 to-purple-500/5 text-purple-400', isPro: true, core: true },
      { id: 'injury', label: 'Injury Log', desc: 'Track & manage injuries', longDesc: 'Track injuries by body region and get automatic workout modifications', keywords: 'hurt pain injury rehab rehabilitation shoulder knee back elbow wrist hip joint muscle pull strain', icon: Shield, color: 'from-sky-500/20 to-sky-500/5 text-sky-400', isPro: true, core: true },
      { id: 'illness', label: 'Illness Log', desc: 'Symptom tracking & return-to-training', longDesc: 'Log symptoms, get evidence-based training restrictions via the Neck Check protocol, track daily recovery check-ins, and follow graduated return-to-training phases. Automatically adjusts workout intensity, freezes streaks, and modifies your mesocycle.', keywords: 'sick illness cold flu fever cough sore throat headache nausea vomiting diarrhea fatigue tired unwell symptom recovery neck check return training', icon: Thermometer, color: 'from-rose-500/20 to-rose-500/5 text-rose-400', isPro: true, core: true },
      { id: 'cycle_tracking', label: 'Cycle Tracking', desc: 'Menstrual cycle log', longDesc: 'Log cycle phases to optimize training around hormonal fluctuations', keywords: 'period menstrual cycle female women hormone luteal follicular ovulation pms', icon: Activity, color: 'from-pink-500/20 to-pink-500/5 text-pink-400', isPro: true },
      { id: 'fighters_mind', label: "Fighter's Mind", desc: 'Mental state & confidence', longDesc: 'Track mental state before and after training, surface patterns in your psychology, and build an evidence-based confidence ledger', keywords: 'mental mind psychology confidence focus composure anxiety stress self talk visualization brain check in mood emotion journal reflect', icon: Brain, color: 'from-violet-500/20 to-violet-500/5 text-violet-400', isPro: true },
      { id: 'breathing', label: 'Breathing', desc: 'Guided breathing protocols', longDesc: 'Interactive breathing timers — box breathing, 4-7-8, Wim Hof, tactical breathing, and more for recovery and performance', keywords: 'breathing breathe meditation calm anxiety relax box wim hof tactical 4-7-8 recovery sleep', icon: Wind, color: 'from-sky-500/20 to-sky-500/5 text-sky-400', isPro: true },
      { id: 'wellness_xp', label: 'Wellness', desc: 'Off-mat habit tracking', longDesc: 'See your supplement, nutrition, water, sleep, and mobility consistency. Training XP scales with how many habits you hit each day.', keywords: 'wellness supplements nutrition water sleep mobility mental streak habits consistency off mat recovery', icon: Activity, color: 'from-teal-500/20 to-teal-500/5 text-teal-400', isPro: false },
    ],
  },
  {
    title: 'Learn',
    icon: BookMarked,
    accent: 'text-indigo-400',
    tools: [
      { id: 'knowledge_hub', label: 'Knowledge Hub', desc: 'Science-backed articles & training insights', longDesc: 'Browse a curated library of science-backed articles on strength, nutrition, recovery, and combat sports training', keywords: 'articles knowledge learn science research evidence based tips education read study training insights', icon: BookMarked, color: 'from-indigo-500/20 to-indigo-500/5 text-indigo-400' },
      { id: 'corner_coach', label: 'Corner Coach', desc: 'Between-set coaching cues', longDesc: 'Get contextual coaching cues and reminders between sets — form tips, breathing cues, and motivational prompts', keywords: 'coach cue tip reminder form technique between sets rest advice guidance corner', icon: MessageCircle, color: 'from-violet-500/20 to-violet-500/5 text-violet-400' },
    ],
  },
  {
    title: 'Social',
    icon: Share2,
    accent: 'text-emerald-400',
    tools: [
      { id: 'community_share', label: 'Community Share', desc: 'Share progress & achievements', longDesc: 'Share your workout summaries, PRs, and achievements with the community or export to social media', keywords: 'share post social community export achievement pr workout summary progress friends', icon: Share2, color: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400' },
      { id: 'badge_showcase', label: 'Badge Showcase', desc: 'View & celebrate your badges', longDesc: 'Browse all earned and upcoming badges — milestones, streaks, PRs, and special achievements', keywords: 'badge achievement trophy milestone reward earned streak unlock celebrate gamification', icon: Trophy, color: 'from-amber-500/20 to-amber-500/5 text-amber-400' },
    ],
  },
];

/** Reduced-mode categories — regroups the 12 core tools into 4 buckets */
const CORE_CATEGORIES: Category[] = [
  {
    title: 'Train',
    icon: Hammer,
    accent: 'text-primary-400',
    tools: [], // populated at runtime from CATEGORIES
  },
  {
    title: 'Track',
    icon: Flame,
    accent: 'text-orange-400',
    tools: [],
  },
  {
    title: 'Recover',
    icon: Heart,
    accent: 'text-rose-400',
    tools: [],
  },
  {
    title: 'Prepare',
    icon: Swords,
    accent: 'text-red-400',
    tools: [],
  },
];

// Map core tool IDs to their reduced-mode category
const CORE_CATEGORY_MAP: Record<string, string> = {
  builder: 'Train',
  block_suggestion: 'Train',
  one_rm: 'Train',
  plate_calc: 'Train',
  nutrition: 'Track',
  grappling: 'Track',
  recovery: 'Recover',
  wearable: 'Recover',
  mobility: 'Recover',
  injury: 'Recover',
  illness: 'Recover',
  competition: 'Prepare',
};

// Build CORE_CATEGORIES tools from ALL_TOOLS at module level
const ALL_TOOLS_FLAT = CATEGORIES.flatMap(c => c.tools);
for (const tool of ALL_TOOLS_FLAT) {
  const catTitle = CORE_CATEGORY_MAP[tool.id];
  if (catTitle) {
    const cat = CORE_CATEGORIES.find(c => c.title === catTitle);
    if (cat) cat.tools.push(tool);
  }
}

export const ALL_TOOLS = CATEGORIES.flatMap(c => c.tools);
export const TOOL_MAP = new Map<string, Tool>(ALL_TOOLS.map(t => [t.id, t]));
export const PINNED_STORAGE_KEY = 'roots-explore-pinned';

const STORAGE_KEY_RECENT = 'roots-explore-recent';
const STORAGE_KEY_PINNED = PINNED_STORAGE_KEY;
const STORAGE_KEY_USAGE = 'roots-explore-usage';
const MAX_RECENT = 4;
const MAX_PINNED = 4;
const PIN_SYNC_EVENT = 'roots-pins-changed';

/** Read pins fresh from localStorage — filters out stale IDs that no longer exist in TOOL_MAP */
export function readPins(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY_PINNED) || '[]') as string[];
    const valid = raw.filter(id => TOOL_MAP.has(id));
    // Auto-clean stale IDs from storage
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

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return 'Just now';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1d ago';
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

interface ExploreTabProps {
  onNavigate: (view: OverlayView) => void;
}

export default function ExploreTab({ onNavigate }: ExploreTabProps) {
  const [search, setSearch] = useState('');
  const [recentIds, setRecentIds] = useState<string[]>(() => readJson(STORAGE_KEY_RECENT, []));
  const [pinnedIds, setPinnedIds] = useState<string[]>(readPins);
  const [usageMap, setUsageMap] = useState<Record<string, number>>(() => readJson(STORAGE_KEY_USAGE, {}));
  const [showAllTools, setShowAllTools] = useState(false);

  const tier = useCurrentTier();
  const isFree = tier !== 'pro';

  // PIN MODE — like iOS home screen jiggle mode
  // When true, tapping ANY card toggles its pin. When false, tapping navigates.
  const [pinMode, setPinMode] = useState(false);

  // Track which categories are expanded (all collapsed by default)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const toggleCategory = useCallback((title: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }, []);

  // Sync pins with HomeTab — event-based, no polling
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

  const handleNavigate = useCallback((id: NonNullable<OverlayView>) => {
    setUsageMap(prev => {
      const next = { ...prev, [id]: Date.now() };
      localStorage.setItem(STORAGE_KEY_USAGE, JSON.stringify(next));
      return next;
    });
    setRecentIds(prev => {
      const next = [id, ...prev.filter(r => r !== id)].slice(0, MAX_RECENT);
      localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(next));
      return next;
    });
    onNavigate(id);
  }, [onNavigate]);

  // Always read fresh from localStorage — never stale closures
  const togglePin = useCallback((id: string) => {
    hapticMedium();
    const current = readPins();
    const next = current.includes(id)
      ? current.filter(p => p !== id)
      : [...current, id].slice(0, MAX_PINNED);
    writePins(next);
    setPinnedIds(next);
  }, []);

  // Single handler: in pin mode toggles pin, in normal mode navigates
  const handleCardTap = useCallback((id: NonNullable<OverlayView>) => {
    if (pinMode) {
      togglePin(id);
    } else {
      handleNavigate(id);
    }
  }, [pinMode, togglePin, handleNavigate]);

  const recentTools = useMemo(() =>
    recentIds.map(id => TOOL_MAP.get(id)).filter(Boolean) as Tool[],
    [recentIds]
  );

  // Tool affinity — surfaces tools the user has thumbs-upped
  const featureFeedback = useAppStore(s => s.featureFeedback);
  const topTools = useMemo(() => {
    const top = getTopTools(featureFeedback, 6);
    return top
      .map(t => TOOL_MAP.get(t.toolId))
      .filter(Boolean) as Tool[];
  }, [featureFeedback]);

  // ─── Unified "For You" strip ───
  // Merges RECENT + TOP TOOLS, excludes anything already pinned, dedupes.
  // Each entry carries a reason tag so the UI can show why it's here.
  const forYouTools = useMemo(() => {
    const pinSet = new Set(pinnedIds);
    const seen = new Set<string>();
    const result: { tool: Tool; reason: 'recent' | 'loved' | 'both' }[] = [];

    // Loved tools (from affinity) — check if also recent
    const recentSet = new Set(recentIds);
    for (const tool of topTools) {
      if (pinSet.has(tool.id) || seen.has(tool.id)) continue;
      seen.add(tool.id);
      result.push({ tool, reason: recentSet.has(tool.id) ? 'both' : 'loved' });
    }

    // Recent tools not already added
    for (const tool of recentTools) {
      if (pinSet.has(tool.id) || seen.has(tool.id)) continue;
      seen.add(tool.id);
      result.push({ tool, reason: 'recent' });
    }

    return result.slice(0, 6);
  }, [pinnedIds, recentIds, recentTools, topTools]);

  const pinnedTools = useMemo(() =>
    pinnedIds.map(id => TOOL_MAP.get(id)).filter(Boolean) as Tool[],
    [pinnedIds]
  );

  // Flat ranked search results
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
      if (recentIds.includes(tool.id)) score += 2;
      scored.push({ tool, score });
    }
    return scored.sort((a, b) => b.score - a.score).map(s => s.tool);
  }, [search, pinnedIds, recentIds]);

  // Visible categories — reduced mode shows 4 core categories, full mode shows all
  const visibleCategories = useMemo(() => {
    if (showAllTools || pinMode) return CATEGORIES;
    return CORE_CATEGORIES.filter(c => c.tools.length > 0);
  }, [showAllTools, pinMode]);

  const isSearching = search.trim().length > 0;

  return (
    <div className="space-y-5">
      {/* Header with pin mode toggle */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-grappler-50">Explore</h2>
          <p className="text-sm text-grappler-400">Your training toolkit</p>
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
      {pinMode && (
        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-primary-500/10 border border-primary-500/30">
          <p className="text-xs text-primary-300">
            Tap any tool to pin/unpin it
          </p>
          <span className="text-xs font-bold text-primary-400">
            {pinnedIds.length}/{MAX_PINNED}
          </span>
        </div>
      )}

      {/* Search — hidden in pin mode */}
      {!pinMode && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grappler-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tools..."
            aria-label="Search tools"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-grappler-800/60 border border-grappler-700/50 text-sm text-grappler-200 placeholder:text-grappler-600 focus:outline-none focus:border-primary-500/50 transition-colors"
          />
        </div>
      )}

      {/* Plan summary */}
      {!pinMode && !isSearching && (
        <p className="text-xs text-grappler-500 px-1">
          {showAllTools
            ? (tier === 'pro'
                ? `All ${ALL_TOOLS.length} tools unlocked`
                : `${ALL_TOOLS.filter(t => !t.isPro).length} of ${ALL_TOOLS.length} tools free · ${ALL_TOOLS.filter(t => t.isPro).length} Pro`)
            : `${CORE_CATEGORIES.reduce((n, c) => n + c.tools.length, 0)} core tools · ${ALL_TOOLS.length} total`
          }
        </p>
      )}

      {/* Pinned tools row — shown in normal mode only */}
      {!pinMode && !isSearching && pinnedTools.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-grappler-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Pin className="w-3 h-3" /> Pinned
          </p>
          <div className="grid grid-cols-3 gap-2">
            {pinnedTools.map(tool => (
              <button
                key={tool.id}
                onClick={() => handleNavigate(tool.id)}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl bg-gradient-to-b',
                  'border-2 border-primary-500/40 active:scale-95 transition-all select-none',
                  tool.color,
                  isFree && tool.isPro && 'opacity-50'
                )}
                style={{ touchAction: 'manipulation' }}
              >
                {tool.isPro && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-md bg-amber-500/90 text-[10px] font-bold text-white uppercase tracking-wide shadow-sm pointer-events-none">
                    Pro
                  </span>
                )}
                <tool.icon className="w-5 h-5" />
                <span className="text-xs font-medium text-grappler-200 text-center leading-tight line-clamp-1">
                  {tool.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* For You — unified strip: recent + loved, pinned excluded, zero duplicates */}
      {!pinMode && !isSearching && forYouTools.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-grappler-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-amber-400" /> For You
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {forYouTools.map(({ tool, reason }) => (
              <button
                key={tool.id}
                onClick={() => handleNavigate(tool.id)}
                className={cn(
                  'relative flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-b border border-grappler-800/50 whitespace-nowrap flex-shrink-0',
                  'hover:border-grappler-700 active:scale-95 transition-all',
                  tool.color,
                  isFree && tool.isPro && 'opacity-50'
                )}
              >
                {tool.isPro && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-md bg-amber-500/90 text-[10px] font-bold text-white uppercase tracking-wide shadow-sm pointer-events-none">
                    Pro
                  </span>
                )}
                <tool.icon className="w-4 h-4" />
                <span className="text-xs font-medium text-grappler-200">{tool.label}</span>
                {reason === 'recent' && usageMap[tool.id] && (
                  <span className="text-xs text-grappler-500">{formatTimeAgo(usageMap[tool.id])}</span>
                )}
                {reason === 'loved' && (
                  <Heart className="w-3 h-3 text-pink-400/60" />
                )}
                {reason === 'both' && (
                  <Heart className="w-3 h-3 text-pink-400/60" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search results (normal mode only) */}
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

      {/* Category grids — collapsed by default, tappable header to expand */}
      {(pinMode || !isSearching) && visibleCategories.map(category => {
        // In pin mode, always show expanded so users can pin anything
        const isExpanded = pinMode || expandedCategories.has(category.title);
        return (
          <div key={category.title}>
            <button
              onClick={() => { if (!pinMode) toggleCategory(category.title); }}
              className={cn(
                'w-full flex items-center gap-1.5 text-xs font-semibold text-grappler-400 uppercase tracking-wider mb-2',
                !pinMode && 'active:opacity-70 transition-opacity'
              )}
              style={{ touchAction: 'manipulation' }}
            >
              <category.icon className={cn('w-3.5 h-3.5', category.accent)} />
              {category.title}
              <span className="text-grappler-600 font-normal normal-case tracking-normal">&middot; {category.tools.length}</span>
              {!pinMode && (
                <ChevronDown className={cn(
                  'w-3.5 h-3.5 ml-auto text-grappler-600 transition-transform duration-200',
                  isExpanded && 'rotate-180'
                )} />
              )}
            </button>
            {isExpanded && (
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
            )}
          </div>
        );
      })}

      {/* Show all / Show fewer toggle */}
      {!pinMode && !isSearching && (
        <button
          onClick={() => { hapticMedium(); setShowAllTools(prev => !prev); }}
          className="w-full flex items-center justify-between gap-2 py-2.5 px-3 rounded-xl bg-grappler-800/30 border border-grappler-700/20 hover:bg-grappler-800/50 transition-colors"
          style={{ touchAction: 'manipulation' }}
        >
          <span className="text-xs font-medium text-grappler-500">
            {showAllTools ? 'Show fewer' : 'Show all tools'}
          </span>
          <ChevronDown className={cn(
            'w-4 h-4 text-grappler-500 transition-transform duration-200',
            showAllTools && 'rotate-180'
          )} />
        </button>
      )}
    </div>
  );
}

/**
 * ToolCard — a SINGLE <button> element. No overlapping elements. No absolute positioning.
 * No stopPropagation. No event delegation. Just one button, one tap, one action.
 *
 * In pin mode: shows checkmark if pinned, tap toggles pin state.
 * In normal mode: tap navigates to the tool.
 */
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
        // Pin mode visual states
        pinMode && isPinned && 'border-2 border-primary-500 ring-2 ring-primary-500/30',
        pinMode && !isPinned && 'border-2 border-dashed border-grappler-600',
        // Normal mode visual states
        !pinMode && isPinned && 'border-2 border-primary-500/40',
        !pinMode && !isPinned && 'border border-grappler-800/50',
        tool.color,
        // Dim Pro cards for free users
        isFree && tool.isPro && !pinMode && 'opacity-50'
      )}
      style={{ touchAction: 'manipulation' }}
    >
      {/* Pin mode: checkmark badge (purely decorative, not interactive) */}
      {pinMode && isPinned && (
        <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center pointer-events-none">
          <Check className="w-3 h-3 text-white" />
        </span>
      )}

      {/* Normal mode: PRO badge (purely decorative, not interactive) */}
      {tool.isPro && !pinMode && (
        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-md bg-amber-500/90 text-[10px] font-bold text-white uppercase tracking-wide shadow-sm pointer-events-none">
          Pro
        </span>
      )}

      {/* Pin mode: show pin icon instead of tool icon */}
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
