'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Dumbbell, Layers, PlusSquare, Sparkles, Calendar,
  TrendingUp, BarChart3, Target, Calculator, Activity,
  Heart, Shield, Thermometer, Zap, Moon,
  Apple, Grip, Flame,
  Swords, Navigation, Move, Watch,
  Users, MessageSquare, Search, Clock, Pin,
  Crown, Hammer, Eye, Salad, Trophy,
  ChevronDown, X, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticMedium } from '@/lib/haptics';
import { useAppStore } from '@/lib/store';
import type { OverlayView } from './dashboard-types';

interface Tool {
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

// Free tool IDs — everything else is Pro
const FREE_TOOL_IDS = new Set(['builder', 'one_rm', 'overload']);

const CATEGORIES: Category[] = [
  {
    title: 'Build',
    icon: Hammer,
    accent: 'text-primary-400',
    tools: [
      { id: 'builder', label: 'Workout Builder', desc: 'Create custom sessions', longDesc: 'Design sessions from 300+ exercises with sets, reps, and RPE targets', keywords: 'create make design gym routine plan workout session custom build program training', icon: Dumbbell, color: 'from-primary-500/20 to-primary-500/5 text-primary-400' },
      { id: 'templates', label: 'Templates', desc: 'Save & reuse workouts', longDesc: 'Save any workout as a reusable template — load it in one tap', keywords: 'save reuse preset routine copy duplicate favorite bookmark', icon: Layers, color: 'from-blue-500/20 to-blue-500/5 text-blue-400', isPro: true },
      { id: 'custom_exercise', label: 'Custom Exercise', desc: 'Add your own moves', longDesc: 'Add exercises not in the database — custom machines, cables, or sport moves', keywords: 'create new exercise movement add custom machine cable dumbbell barbell', icon: PlusSquare, color: 'from-violet-500/20 to-violet-500/5 text-violet-400', isPro: true },
      { id: 'block_suggestion', label: 'AI Program', desc: 'Auto-generate a block', longDesc: 'Auto-generate a periodized block based on your goals and schedule', keywords: 'auto generate smart suggest recommend ai mesocycle block plan program', icon: Sparkles, color: 'from-sky-500/20 to-sky-500/5 text-sky-400', isPro: true },
      { id: 'periodization', label: 'Periodization', desc: 'Plan training phases', longDesc: 'Plan mesocycles with deload weeks, peak phases, and volume waves', keywords: 'phase cycle calendar deload peak taper block mesocycle schedule week', icon: Calendar, color: 'from-teal-500/20 to-teal-500/5 text-teal-400', isPro: true },
      { id: 'overload', label: 'Progression', desc: 'Track overload strategy', longDesc: 'Track if you\'re adding weight, reps, or sets over time', keywords: 'progressive overload increase weight reps sets volume stronger gains', icon: TrendingUp, color: 'from-green-500/20 to-green-500/5 text-green-400' },
      { id: 'grip_strength', label: 'Grip Strength', desc: 'Grip training protocol', longDesc: 'Crush, pinch, and hang protocols for combat grip and deadlift lockout', keywords: 'grip hand forearm wrist crush pinch hang deadlift farmer carry hold squeeze', icon: Grip, color: 'from-slate-500/20 to-slate-500/5 text-slate-400', isPro: true },
    ],
  },
  {
    title: 'Analyze',
    icon: Eye,
    accent: 'text-pink-400',
    tools: [
      { id: 'strength', label: 'Strength', desc: 'e1RM trends & PRs', longDesc: 'Track estimated 1RM trends, PRs, and strength curves for every exercise', keywords: 'pr personal record max strength chart graph trend lift heavy strong e1rm estimated', icon: BarChart3, color: 'from-red-500/20 to-red-500/5 text-red-400', isPro: true },
      { id: 'profiler', label: 'Exercise Profiler', desc: 'Per-exercise deep dive', longDesc: 'Volume, intensity, frequency, and performance over time per exercise', keywords: 'history stats analytics individual exercise detail performance data sets reps', icon: Target, color: 'from-blue-500/20 to-blue-500/5 text-blue-400', isPro: true },
      { id: 'volume_map', label: 'Volume Map', desc: 'Muscle group volume', longDesc: 'Weekly sets per muscle group against science-based volume landmarks', keywords: 'muscle group heatmap chest back legs arms shoulders volume sets weekly body part', icon: Activity, color: 'from-pink-500/20 to-pink-500/5 text-pink-400', isPro: true },
      { id: 'one_rm', label: '1RM Calculator', desc: 'Estimate your max', longDesc: 'Estimate your one-rep max from any rep range using validated formulas', keywords: 'one rep max calculator estimate weight heavy bench squat deadlift press strength', icon: Calculator, color: 'from-cyan-500/20 to-cyan-500/5 text-cyan-400' },
    ],
  },
  {
    title: 'Recover',
    icon: Heart,
    accent: 'text-rose-400',
    tools: [
      { id: 'recovery', label: 'Recovery', desc: 'Readiness check-in', longDesc: 'Daily readiness score from sleep, stress, soreness, and 7 other factors', keywords: 'rest day off readiness soreness sore tired recover how do i feel ready', icon: Heart, color: 'from-rose-500/20 to-rose-500/5 text-rose-400', isPro: true },
      { id: 'recovery_coach', label: 'Recovery Coach', desc: 'Sleep & stress tips', longDesc: 'Personalized sleep and recovery tips based on your training load', keywords: 'sleep stress rest nap meditation relax nervous cns overtraining burnout advice tips', icon: Moon, color: 'from-indigo-500/20 to-indigo-500/5 text-indigo-400', isPro: true },
      { id: 'hr_zones', label: 'HR Zones', desc: 'Heart rate training', longDesc: 'Zone calculator for cardio — from zone 2 aerobic to zone 5 VO2max', keywords: 'heart rate cardio aerobic anaerobic zone bpm pulse conditioning endurance vo2', icon: Activity, color: 'from-red-500/20 to-red-500/5 text-red-400', isPro: true },
      { id: 'injury', label: 'Injury Log', desc: 'Track & manage injuries', longDesc: 'Track injuries by body region and get automatic workout modifications', keywords: 'hurt pain injury rehab rehabilitation shoulder knee back elbow wrist hip joint muscle pull strain', icon: Shield, color: 'from-sky-500/20 to-sky-500/5 text-sky-400', isPro: true },
      { id: 'illness', label: 'Illness Log', desc: 'Log sick days', longDesc: 'Log sick days to track how illness affects your training and recovery', keywords: 'sick cold flu fever cough covid ill unwell doctor symptom medicine', icon: Thermometer, color: 'from-blue-500/20 to-blue-500/5 text-blue-400', isPro: true },
      { id: 'fatigue', label: 'Fatigue', desc: 'Monitor fatigue levels', longDesc: 'Monitor accumulated fatigue — know when to push and when to pull back', keywords: 'tired exhausted worn out energy low deload overtraining fatigue debt accumulated', icon: Zap, color: 'from-yellow-500/20 to-yellow-500/5 text-yellow-400', isPro: true },
    ],
  },
  {
    title: 'Fuel & Body',
    icon: Salad,
    accent: 'text-green-400',
    tools: [
      { id: 'nutrition', label: 'Nutrition', desc: 'Macros & meal planning', longDesc: 'Full macro tracking with daily targets and cutting/bulking protocols', keywords: 'food eat diet meal calories macros protein carbs fat water hydration drink weight cut bulk lean gain lose breakfast lunch dinner snack track log fiber sugar sodium', icon: Apple, color: 'from-green-500/20 to-green-500/5 text-green-400', isPro: true },
      { id: 'fight_camp', label: 'Fight Camp Fuel', desc: 'Combat sport nutrition', longDesc: 'Weight cuts, rehydration protocols, and fight-day fueling strategies', keywords: 'mma boxing fight weigh in weight cut rehydrate refeed combat sport muay thai ufc diet food eat', icon: Flame, color: 'from-orange-500/20 to-orange-500/5 text-orange-400', isPro: true },
      { id: 'cycle_tracking', label: 'Cycle Tracking', desc: 'Menstrual cycle log', longDesc: 'Log cycle phases to optimize training around hormonal fluctuations', keywords: 'period menstrual cycle female women hormone luteal follicular ovulation pms', icon: Activity, color: 'from-pink-500/20 to-pink-500/5 text-pink-400', isPro: true },
    ],
  },
  {
    title: 'Sport & Social',
    icon: Trophy,
    accent: 'text-blue-400',
    tools: [
      { id: 'competition', label: 'Competition Prep', desc: 'Peak for your event', longDesc: 'Peaking for meets, fights, and tournaments — taper and weight management', keywords: 'meet competition event peak taper fight tournament game match powerlifting', icon: Swords, color: 'from-red-500/20 to-red-500/5 text-red-400', isPro: true },
      { id: 'grappling', label: 'Grappling', desc: 'BJJ & wrestling tools', longDesc: 'Session tracker with technique notes, sparring rounds, and mat time', keywords: 'bjj jiu jitsu wrestling mma roll mat submission martial arts grapple training', icon: Navigation, color: 'from-blue-500/20 to-blue-500/5 text-blue-400', isPro: true },
      { id: 'mobility', label: 'Mobility', desc: 'Stretching & ROM', longDesc: 'Body check-in with stretching protocols, ROM tracking, and soreness logging', keywords: 'stretch flexible warm up cool down rom range motion yoga foam roll mobility joint stiff tight', icon: Move, color: 'from-teal-500/20 to-teal-500/5 text-teal-400', isPro: true },
      { id: 'wearable', label: 'Wearables', desc: 'Connect your device', longDesc: 'Connect Whoop, Apple Watch, or Garmin for sleep, HRV, and recovery data', keywords: 'whoop apple watch garmin fitbit oura ring wearable device sync connect tracker', icon: Watch, color: 'from-purple-500/20 to-purple-500/5 text-purple-400', isPro: true },
      { id: 'coach', label: 'Weekly Coach', desc: 'AI training feedback', longDesc: 'AI-generated weekly training review with progress insights and adjustments', keywords: 'coach advice tips feedback review summary weekly insight recommendation ai smart', icon: MessageSquare, color: 'from-primary-500/20 to-primary-500/5 text-primary-400', isPro: true },
      { id: 'community_share', label: 'Share', desc: 'Share with friends', longDesc: 'Export workout summaries and PR achievements as shareable cards', keywords: 'share export screenshot post social media friends community brag show results', icon: Users, color: 'from-sky-500/20 to-sky-500/5 text-sky-400', isPro: true },
    ],
  },
];

// Suggested tools by user profile
const SUGGESTIONS: Record<string, NonNullable<OverlayView>[]> = {
  combat: ['grappling', 'mobility', 'competition', 'fight_camp'],
  general: ['strength', 'volume_map', 'overload', 'recovery'],
  new_user: ['builder', 'block_suggestion', 'one_rm', 'overload'],
};

const ALL_TOOLS = CATEGORIES.flatMap(c => c.tools);
const TOOL_MAP = new Map<string, Tool>(ALL_TOOLS.map(t => [t.id, t]));

const STORAGE_KEY_RECENT = 'roots-explore-recent';
const STORAGE_KEY_PINNED = 'roots-explore-pinned';
const STORAGE_KEY_USAGE = 'roots-explore-usage';
const STORAGE_KEY_PIN_HINT = 'roots-explore-pin-hint-shown';
const STORAGE_KEY_NEW_BANNER = 'roots-explore-new-dismissed';
const MAX_RECENT = 4;
const INITIAL_VISIBLE = 3;

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
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => readJson(STORAGE_KEY_PINNED, []));
  const [usageMap, setUsageMap] = useState<Record<string, number>>(() => readJson(STORAGE_KEY_USAGE, {}));
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [newBannerDismissed, setNewBannerDismissed] = useState(() => readJson(STORAGE_KEY_NEW_BANNER, false));
  const [pinHintShown, setPinHintShown] = useState(() => readJson(STORAGE_KEY_PIN_HINT, false));
  const user = useAppStore(s => s.user);
  const workoutLogs = useAppStore(s => s.workoutLogs);

  // "Suggested for you" based on user profile
  const suggestedTools = useMemo(() => {
    let key = 'general';
    if (workoutLogs.length === 0) key = 'new_user';
    else if (user?.trainingIdentity === 'combat') key = 'combat';
    const ids = SUGGESTIONS[key] || SUGGESTIONS.general;
    return ids.map(id => TOOL_MAP.get(id)).filter(Boolean) as Tool[];
  }, [user?.trainingIdentity, workoutLogs.length]);

  // Persist pinned to localStorage
  useEffect(() => { localStorage.setItem(STORAGE_KEY_PINNED, JSON.stringify(pinnedIds)); }, [pinnedIds]);

  // Show pin hint after 2nd tool use if never pinned anything
  const shouldShowPinHint = !pinHintShown && recentIds.length >= 2 && pinnedIds.length === 0;

  const handleNavigate = useCallback((id: NonNullable<OverlayView>) => {
    // Track usage timestamp
    setUsageMap(prev => {
      const next = { ...prev, [id]: Date.now() };
      localStorage.setItem(STORAGE_KEY_USAGE, JSON.stringify(next));
      return next;
    });
    // Persist recent
    setRecentIds(prev => {
      const next = [id, ...prev.filter(r => r !== id)].slice(0, MAX_RECENT);
      localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(next));
      return next;
    });
    onNavigate(id);
  }, [onNavigate]);

  const togglePin = useCallback((id: string) => {
    hapticMedium();
    setPinnedIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id].slice(0, 6)
    );
    // Dismiss pin hint on first pin
    if (!pinHintShown) {
      setPinHintShown(true);
      localStorage.setItem(STORAGE_KEY_PIN_HINT, JSON.stringify(true));
    }
  }, [pinHintShown]);

  const toggleCategory = useCallback((title: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }, []);

  const dismissNewBanner = useCallback(() => {
    setNewBannerDismissed(true);
    localStorage.setItem(STORAGE_KEY_NEW_BANNER, JSON.stringify(true));
  }, []);

  const recentTools = useMemo(() =>
    recentIds.map(id => TOOL_MAP.get(id)).filter(Boolean) as Tool[],
    [recentIds]
  );

  const pinnedTools = useMemo(() =>
    pinnedIds.map(id => TOOL_MAP.get(id)).filter(Boolean) as Tool[],
    [pinnedIds]
  );

  // Flat ranked search results (#8)
  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase().trim();
    const words = q.split(/\s+/);
    const scored: { tool: Tool; score: number }[] = [];
    for (let i = 0; i < ALL_TOOLS.length; i++) {
      const tool = ALL_TOOLS[i];
      const haystack = `${tool.label} ${tool.desc} ${tool.longDesc} ${tool.keywords}`.toLowerCase();
      if (!words.every(w => haystack.includes(w))) continue;
      let score = 0;
      const labelLower = tool.label.toLowerCase();
      const descLower = `${tool.desc} ${tool.longDesc}`.toLowerCase();
      for (let j = 0; j < words.length; j++) {
        if (labelLower.includes(words[j])) score += 10;
        if (descLower.includes(words[j])) score += 5;
      }
      if (pinnedIds.includes(tool.id)) score += 3;
      if (recentIds.includes(tool.id)) score += 2;
      scored.push({ tool, score });
    }
    return scored.sort((a, b) => b.score - a.score).map(s => s.tool);
  }, [search, pinnedIds, recentIds]);

  const isSearching = search.trim().length > 0;
  const hasNoRecentsOrPins = recentTools.length === 0 && pinnedTools.length === 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-grappler-50">Explore</h2>
        <p className="text-sm text-grappler-400">All your training tools in one place</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grappler-500" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tools..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-grappler-800/60 border border-grappler-700/50 text-sm text-grappler-200 placeholder:text-grappler-600 focus:outline-none focus:border-primary-500/50 transition-colors"
        />
      </div>

      {/* What's New banner (#5) */}
      {!isSearching && !newBannerDismissed && (
        <div className="relative flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-teal-500/15 to-primary-500/15 border border-teal-500/30">
          <Sparkles className="w-5 h-5 text-teal-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-teal-300">New: Body Check-In & Soreness Tracking</p>
            <p className="text-[10px] text-grappler-400 mt-0.5">Tap <span className="text-teal-400 font-medium">Mobility</span> to log soreness — it feeds into your readiness score</p>
          </div>
          <button onClick={dismissNewBanner} className="p-1 rounded-lg hover:bg-grappler-800/50 text-grappler-500">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Pin onboarding hint (#9) */}
      {!isSearching && shouldShowPinHint && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-grappler-800/40 border border-grappler-700/30">
          <Info className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
          <p className="text-[10px] text-grappler-400">
            <span className="text-grappler-300 font-medium">Tip:</span> Long-press any tool to pin it for quick access
          </p>
        </div>
      )}

      {/* Suggested for you */}
      {!isSearching && suggestedTools.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-primary-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> Suggested for you
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {suggestedTools.map(tool => (
              <ToolButton key={tool.id} tool={tool} onNavigate={handleNavigate} isPinned={pinnedIds.includes(tool.id)} onTogglePin={togglePin} lastUsed={usageMap[tool.id]} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state — Start here guidance (#7) */}
      {!isSearching && hasNoRecentsOrPins && workoutLogs.length === 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-b from-primary-500/10 to-transparent border border-primary-500/20">
          <p className="text-sm font-semibold text-primary-300 mb-1">Start here</p>
          <p className="text-xs text-grappler-400 mb-3">New to Roots? These tools will get you lifting in minutes.</p>
          <div className="flex gap-2">
            {(['builder', 'block_suggestion'] as const).map(id => {
              const tool = TOOL_MAP.get(id);
              if (!tool) return null;
              return (
                <button
                  key={id}
                  onClick={() => handleNavigate(id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-b border border-grappler-700/50',
                    'hover:border-grappler-600 active:scale-95 transition-all',
                    tool.color
                  )}
                >
                  <tool.icon className="w-4 h-4" />
                  <span className="text-xs font-medium text-grappler-200">{tool.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Pinned tools (#6 — better pin indicator) */}
      {!isSearching && pinnedTools.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-grappler-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Pin className="w-3 h-3" /> Pinned
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {pinnedTools.map(tool => (
              <ToolButton key={tool.id} tool={tool} onNavigate={handleNavigate} isPinned onTogglePin={togglePin} lastUsed={usageMap[tool.id]} />
            ))}
          </div>
        </div>
      )}

      {/* Recently used (#2 — with time-ago badges) */}
      {!isSearching && recentTools.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-grappler-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Recent
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {recentTools.map(tool => (
              <button
                key={tool.id}
                onClick={() => handleNavigate(tool.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-b border border-grappler-800/50 whitespace-nowrap flex-shrink-0',
                  'hover:border-grappler-700 active:scale-95 transition-all',
                  tool.color
                )}
              >
                <tool.icon className="w-4 h-4" />
                <span className="text-xs font-medium text-grappler-200">{tool.label}</span>
                {usageMap[tool.id] && (
                  <span className="text-[9px] text-grappler-600 ml-0.5">{formatTimeAgo(usageMap[tool.id])}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search results: flat ranked list (#8) */}
      {isSearching && searchResults && searchResults.length > 0 && (
        <div>
          <p className="text-xs text-grappler-500 mb-2">{searchResults.length} result{searchResults.length === 1 ? '' : 's'}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {searchResults.map(tool => (
              <ToolButton
                key={tool.id}
                tool={tool}
                onNavigate={handleNavigate}
                isPinned={pinnedIds.includes(tool.id)}
                onTogglePin={togglePin}
                lastUsed={usageMap[tool.id]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Category grids with collapse (#4) */}
      {!isSearching && CATEGORIES.map(category => {
        const isExpanded = expandedCats.has(category.title);
        const visibleTools = isExpanded ? category.tools : category.tools.slice(0, INITIAL_VISIBLE);
        const hiddenCount = category.tools.length - INITIAL_VISIBLE;

        return (
          <div key={category.title}>
            <p className="text-xs font-semibold text-grappler-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <category.icon className={cn('w-3.5 h-3.5', category.accent)} />
              {category.title}
              <span className="text-grappler-600 font-normal normal-case tracking-normal">&middot; {category.tools.length}</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {visibleTools.map(tool => (
                <ToolButton
                  key={tool.id}
                  tool={tool}
                  onNavigate={handleNavigate}
                  isPinned={pinnedIds.includes(tool.id)}
                  onTogglePin={togglePin}
                  lastUsed={usageMap[tool.id]}
                />
              ))}
            </div>
            {hiddenCount > 0 && (
              <button
                onClick={() => toggleCategory(category.title)}
                className="mt-2 flex items-center gap-1 text-[11px] text-grappler-500 hover:text-grappler-300 transition-colors"
              >
                <ChevronDown className={cn('w-3 h-3 transition-transform', isExpanded && 'rotate-180')} />
                {isExpanded ? 'Show less' : `Show ${hiddenCount} more`}
              </button>
            )}
          </div>
        );
      })}

      {isSearching && searchResults && searchResults.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-grappler-500">No tools matching &ldquo;{search}&rdquo;</p>
        </div>
      )}
    </div>
  );
}

const LONG_PRESS_MS = 500;

function ToolButton({ tool, onNavigate, isPinned, onTogglePin, lastUsed }: {
  tool: Tool;
  onNavigate: (id: NonNullable<OverlayView>) => void;
  isPinned: boolean;
  onTogglePin: (id: string) => void;
  lastUsed?: number;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const [showLongDesc, setShowLongDesc] = useState(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  const startPress = useCallback(() => {
    didLongPress.current = false;
    timerRef.current = setTimeout(() => {
      didLongPress.current = true;
      onTogglePin(tool.id);
    }, LONG_PRESS_MS);
  }, [onTogglePin, tool.id]);

  const endPress = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  // Clean up on unmount
  useEffect(() => clearTimer, [clearTimer]);

  return (
    <button
      onClick={() => { if (!didLongPress.current) onNavigate(tool.id); }}
      // Desktop: right-click to pin
      onContextMenu={(e) => { e.preventDefault(); onTogglePin(tool.id); }}
      // Mobile: long-press to pin
      onTouchStart={startPress}
      onTouchEnd={endPress}
      onTouchCancel={endPress}
      onTouchMove={endPress}
      // Desktop: show extended description on hover (#10)
      onMouseEnter={() => setShowLongDesc(true)}
      onMouseLeave={() => setShowLongDesc(false)}
      className={cn(
        'relative flex flex-col items-center justify-center gap-1 p-4 sm:p-3 rounded-xl bg-gradient-to-b min-h-[5.5rem]',
        'hover:border-grappler-700 active:scale-95 transition-all select-none',
        isPinned
          ? 'border-2 border-primary-500/40'
          : 'border border-grappler-800/50',
        tool.color
      )}
    >
      {/* Pin indicator — filled circle badge (#6) */}
      {isPinned && (
        <span className="absolute top-1.5 right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-primary-500/20">
          <Pin className="w-3 h-3 text-primary-400" />
        </span>
      )}
      {/* PRO badge */}
      {!isPinned && tool.isPro && (
        <span className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-500/20 text-amber-400">
          <Crown className="w-2.5 h-2.5" />
          <span className="text-[8px] font-bold leading-none">PRO</span>
        </span>
      )}
      <tool.icon className="w-5 h-5" />
      <span className="text-xs font-medium text-grappler-200 text-center leading-snug line-clamp-1">
        {tool.label}
      </span>
      <span className="text-[10px] text-grappler-500 text-center leading-tight line-clamp-2">
        {showLongDesc ? tool.longDesc : tool.desc}
      </span>
      {/* Usage time-ago badge (#2) */}
      {lastUsed && (
        <span className="absolute bottom-1 left-1.5 text-[8px] text-grappler-600 font-medium">
          {formatTimeAgo(lastUsed)}
        </span>
      )}
    </button>
  );
}
