'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Dumbbell, Layers, PlusSquare, Sparkles, Calendar,
  TrendingUp, BarChart3, Target, Calculator, Activity,
  Heart, Shield, Thermometer, Zap,
  Apple, Grip, Flame, Gauge,
  Swords, Navigation, Move,
  Search, Clock, Pin,
  Crown, Hammer, Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticMedium } from '@/lib/haptics';
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
      { id: 'builder', label: 'Workout Builder', desc: 'Create custom sessions', longDesc: 'Design sessions from 300+ exercises with sets, reps, and RPE targets', keywords: 'create make design gym routine plan workout session custom build program training', icon: Dumbbell, color: 'from-primary-500/20 to-primary-500/5 text-primary-400' },
      { id: 'templates', label: 'Templates', desc: 'Save & reuse workouts', longDesc: 'Save any workout as a reusable template — load it in one tap', keywords: 'save reuse preset routine copy duplicate favorite bookmark', icon: Layers, color: 'from-blue-500/20 to-blue-500/5 text-blue-400', isPro: true },
      { id: 'block_suggestion', label: 'AI Program', desc: 'Auto-generate a block', longDesc: 'Auto-generate a periodized block based on your goals and schedule', keywords: 'auto generate smart suggest recommend ai mesocycle block plan program', icon: Sparkles, color: 'from-sky-500/20 to-sky-500/5 text-sky-400', isPro: true },
      { id: 'custom_exercise', label: 'Custom Exercise', desc: 'Add your own moves', longDesc: 'Add exercises not in the database — custom machines, cables, or sport moves', keywords: 'create new exercise movement add custom machine cable dumbbell barbell', icon: PlusSquare, color: 'from-violet-500/20 to-violet-500/5 text-violet-400', isPro: true },
      { id: 'periodization', label: 'Periodization', desc: 'Plan training phases', longDesc: 'Plan mesocycles with deload weeks, peak phases, and volume waves', keywords: 'phase cycle calendar deload peak taper block mesocycle schedule week', icon: Calendar, color: 'from-teal-500/20 to-teal-500/5 text-teal-400', isPro: true },
      { id: 'one_rm', label: '1RM Calculator', desc: 'Estimate your max', longDesc: 'Estimate your one-rep max from any rep range using validated formulas', keywords: 'one rep max calculator estimate weight heavy bench squat deadlift press strength', icon: Calculator, color: 'from-cyan-500/20 to-cyan-500/5 text-cyan-400' },
    ],
  },
  {
    title: 'Track',
    icon: Flame,
    accent: 'text-orange-400',
    tools: [
      { id: 'grappling', label: 'Grappling', desc: 'BJJ & wrestling tools', longDesc: 'Session tracker with technique notes, sparring rounds, and mat time', keywords: 'bjj jiu jitsu wrestling mma roll mat submission martial arts grapple training', icon: Navigation, color: 'from-blue-500/20 to-blue-500/5 text-blue-400', isPro: true },
      { id: 'mobility', label: 'Mobility', desc: 'Stretching & ROM', longDesc: 'Body check-in with stretching protocols, ROM tracking, and soreness logging', keywords: 'stretch flexible warm up cool down rom range motion yoga foam roll mobility joint stiff tight', icon: Move, color: 'from-teal-500/20 to-teal-500/5 text-teal-400', isPro: true },
      { id: 'grip_strength', label: 'Grip Strength', desc: 'Grip training protocol', longDesc: 'Crush, pinch, and hang protocols for combat grip and deadlift lockout', keywords: 'grip hand forearm wrist crush pinch hang deadlift farmer carry hold squeeze', icon: Grip, color: 'from-slate-500/20 to-slate-500/5 text-slate-400', isPro: true },
      { id: 'nutrition', label: 'Nutrition', desc: 'Macros & meal planning', longDesc: 'Full macro tracking with daily targets and cutting/bulking protocols', keywords: 'food eat diet meal calories macros protein carbs fat water hydration drink weight cut bulk lean gain lose breakfast lunch dinner snack track log fiber sugar sodium', icon: Apple, color: 'from-green-500/20 to-green-500/5 text-green-400', isPro: true },
      { id: 'competition', label: 'Fight Prep', desc: 'Peak & cut for competition', longDesc: 'Competition peaking with taper protocols, weight cut management, rehydration plans, and fight-day fueling', keywords: 'meet competition event peak taper fight tournament game match powerlifting mma boxing weigh in weight cut rehydrate refeed combat sport muay thai ufc', icon: Swords, color: 'from-red-500/20 to-red-500/5 text-red-400', isPro: true },
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
      { id: 'volume_map', label: 'Volume Map', desc: 'Muscle group volume', longDesc: 'Weekly sets per muscle group against science-based volume landmarks', keywords: 'muscle group heatmap chest back legs arms shoulders volume sets weekly body part', icon: Activity, color: 'from-pink-500/20 to-pink-500/5 text-pink-400', isPro: true },
      { id: 'training_load', label: 'Training Load', desc: 'ACWR & load tracking', longDesc: 'Acute:Chronic Workload Ratio — weekly load trends, 28-day heatmap, and injury risk zones', keywords: 'acwr load training volume weekly chronic acute ratio overtraining injury risk workload heatmap', icon: Gauge, color: 'from-amber-500/20 to-amber-500/5 text-amber-400', isPro: true },
      { id: 'fatigue', label: 'Fatigue', desc: 'Monitor fatigue levels', longDesc: 'Accumulated fatigue debt, smart deload recommendations, and recovery predictions', keywords: 'tired exhausted worn out energy low deload overtraining fatigue debt accumulated', icon: Zap, color: 'from-yellow-500/20 to-yellow-500/5 text-yellow-400', isPro: true },
    ],
  },
  {
    title: 'Body',
    icon: Heart,
    accent: 'text-rose-400',
    tools: [
      { id: 'recovery', label: 'Recovery Hub', desc: 'Readiness & recovery tips', longDesc: 'Composite readiness score from sleep, stress, and soreness with personalized recovery recommendations', keywords: 'rest day off readiness soreness sore tired recover how do i feel ready sleep stress nap meditation relax nervous cns overtraining burnout advice tips', icon: Heart, color: 'from-rose-500/20 to-rose-500/5 text-rose-400', isPro: true },
      { id: 'hr_zones', label: 'HR Zones', desc: 'Heart rate training', longDesc: 'Zone calculator for cardio — from zone 2 aerobic to zone 5 VO2max', keywords: 'heart rate cardio aerobic anaerobic zone bpm pulse conditioning endurance vo2', icon: Activity, color: 'from-red-500/20 to-red-500/5 text-red-400', isPro: true },
      { id: 'injury', label: 'Injury Log', desc: 'Track & manage injuries', longDesc: 'Track injuries by body region and get automatic workout modifications', keywords: 'hurt pain injury rehab rehabilitation shoulder knee back elbow wrist hip joint muscle pull strain', icon: Shield, color: 'from-sky-500/20 to-sky-500/5 text-sky-400', isPro: true },
      { id: 'illness', label: 'Illness Log', desc: 'Log sick days', longDesc: 'Log sick days to track how illness affects your training and recovery', keywords: 'sick cold flu fever cough covid ill unwell doctor symptom medicine', icon: Thermometer, color: 'from-blue-500/20 to-blue-500/5 text-blue-400', isPro: true },
      { id: 'cycle_tracking', label: 'Cycle Tracking', desc: 'Menstrual cycle log', longDesc: 'Log cycle phases to optimize training around hormonal fluctuations', keywords: 'period menstrual cycle female women hormone luteal follicular ovulation pms', icon: Activity, color: 'from-pink-500/20 to-pink-500/5 text-pink-400', isPro: true },
    ],
  },
];

export const ALL_TOOLS = CATEGORIES.flatMap(c => c.tools);
export const TOOL_MAP = new Map<string, Tool>(ALL_TOOLS.map(t => [t.id, t]));
export const PINNED_STORAGE_KEY = 'roots-explore-pinned';

const STORAGE_KEY_RECENT = 'roots-explore-recent';
const STORAGE_KEY_PINNED = PINNED_STORAGE_KEY;
const STORAGE_KEY_USAGE = 'roots-explore-usage';
const STORAGE_KEY_PIN_HINT = 'roots-explore-pin-hint-shown';
const MAX_RECENT = 4;
const MAX_PINNED = 4;

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
  const [pinHintShown, setPinHintShown] = useState(() => readJson(STORAGE_KEY_PIN_HINT, false));

  // Persist pinned to localStorage
  useEffect(() => { localStorage.setItem(STORAGE_KEY_PINNED, JSON.stringify(pinnedIds)); }, [pinnedIds]);

  // Show pin hint after 2nd tool use if never pinned anything
  const shouldShowPinHint = !pinHintShown && recentIds.length >= 2 && pinnedIds.length === 0;

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

  const togglePin = useCallback((id: string) => {
    hapticMedium();
    setPinnedIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id].slice(0, MAX_PINNED)
    );
    if (!pinHintShown) {
      setPinHintShown(true);
      localStorage.setItem(STORAGE_KEY_PIN_HINT, JSON.stringify(true));
    }
  }, [pinHintShown]);

  const recentTools = useMemo(() =>
    recentIds.map(id => TOOL_MAP.get(id)).filter(Boolean) as Tool[],
    [recentIds]
  );

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

  const isSearching = search.trim().length > 0;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-grappler-50">Explore</h2>
        <p className="text-sm text-grappler-400">Your training toolkit</p>
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

      {/* Pin onboarding hint */}
      {!isSearching && shouldShowPinHint && (
        <p className="text-xs text-grappler-400 px-1">
          <span className="text-grappler-300 font-medium">Tip:</span> Long-press any tool to pin it for quick access
        </p>
      )}

      {/* Pinned tools — max 4, one clean row */}
      {!isSearching && pinnedTools.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-grappler-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Pin className="w-3 h-3" /> Pinned
          </p>
          <div className="grid grid-cols-4 gap-2">
            {pinnedTools.map(tool => (
              <ToolButton key={tool.id} tool={tool} onNavigate={handleNavigate} isPinned onTogglePin={togglePin} compact />
            ))}
          </div>
        </div>
      )}

      {/* Recently used — horizontal scroll strip */}
      {!isSearching && recentTools.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-grappler-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
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
                  <span className="text-[10px] text-grappler-500">{formatTimeAgo(usageMap[tool.id])}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search results */}
      {isSearching && searchResults && searchResults.length > 0 && (
        <div>
          <p className="text-xs text-grappler-400 mb-2">{searchResults.length} result{searchResults.length === 1 ? '' : 's'}</p>
          <div className="grid grid-cols-3 gap-2">
            {searchResults.map(tool => (
              <ToolButton
                key={tool.id}
                tool={tool}
                onNavigate={handleNavigate}
                isPinned={pinnedIds.includes(tool.id)}
                onTogglePin={togglePin}
              />
            ))}
          </div>
        </div>
      )}

      {isSearching && searchResults && searchResults.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-grappler-500">No tools matching &ldquo;{search}&rdquo;</p>
        </div>
      )}

      {/* Category grids — all tools visible, no collapse */}
      {!isSearching && CATEGORIES.map(category => (
        <div key={category.title}>
          <p className="text-xs font-semibold text-grappler-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <category.icon className={cn('w-3.5 h-3.5', category.accent)} />
            {category.title}
            <span className="text-grappler-600 font-normal normal-case tracking-normal">&middot; {category.tools.length}</span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            {category.tools.map(tool => (
              <ToolButton
                key={tool.id}
                tool={tool}
                onNavigate={handleNavigate}
                isPinned={pinnedIds.includes(tool.id)}
                onTogglePin={togglePin}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const LONG_PRESS_MS = 500;

function ToolButton({ tool, onNavigate, isPinned, onTogglePin, compact }: {
  tool: Tool;
  onNavigate: (id: NonNullable<OverlayView>) => void;
  isPinned: boolean;
  onTogglePin: (id: string) => void;
  compact?: boolean;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const touchOrigin = useRef<{ x: number; y: number } | null>(null);
  const [showLongDesc, setShowLongDesc] = useState(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  const startTouch = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchOrigin.current = { x: touch.clientX, y: touch.clientY };
    didLongPress.current = false;
    timerRef.current = setTimeout(() => {
      didLongPress.current = true;
      onTogglePin(tool.id);
    }, LONG_PRESS_MS);
  }, [onTogglePin, tool.id]);

  const moveTouch = useCallback((e: React.TouchEvent) => {
    if (!touchOrigin.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchOrigin.current.x;
    const dy = touch.clientY - touchOrigin.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > 10) {
      clearTimer();
    }
  }, [clearTimer]);

  const endPress = useCallback(() => {
    clearTimer();
    touchOrigin.current = null;
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  // Compact mode for pinned row — icon + label only
  if (compact) {
    return (
      <button
        onClick={() => { if (!didLongPress.current) onNavigate(tool.id); }}
        onContextMenu={(e) => { e.preventDefault(); onTogglePin(tool.id); }}
        onTouchStart={startTouch}
        onTouchEnd={endPress}
        onTouchCancel={endPress}
        onTouchMove={moveTouch}
        className={cn(
          'relative flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl bg-gradient-to-b',
          'border-2 border-primary-500/40',
          'hover:border-primary-500/60 active:scale-95 transition-all select-none',
          tool.color
        )}
      >
        <tool.icon className="w-5 h-5" />
        <span className="text-[11px] font-medium text-grappler-200 text-center leading-tight line-clamp-1">
          {tool.label}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={() => { if (!didLongPress.current) onNavigate(tool.id); }}
      onContextMenu={(e) => { e.preventDefault(); onTogglePin(tool.id); }}
      onTouchStart={startTouch}
      onTouchEnd={endPress}
      onTouchCancel={endPress}
      onTouchMove={moveTouch}
      onMouseEnter={() => setShowLongDesc(true)}
      onMouseLeave={() => setShowLongDesc(false)}
      className={cn(
        'relative flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-gradient-to-b min-h-[4.5rem]',
        'hover:border-grappler-700 active:scale-95 transition-all select-none',
        isPinned
          ? 'border-2 border-primary-500/40'
          : 'border border-grappler-800/50',
        tool.color
      )}
    >
      {isPinned && (
        <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 rounded-full bg-primary-500/20">
          <Pin className="w-2.5 h-2.5 text-primary-400" />
        </span>
      )}
      {!isPinned && tool.isPro && (
        <span className="absolute top-1 right-1 flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-500/20 text-amber-400">
          <Crown className="w-2.5 h-2.5" />
          <span className="text-[8px] font-bold leading-none">PRO</span>
        </span>
      )}
      <tool.icon className="w-5 h-5" />
      <span className="text-xs font-medium text-grappler-200 text-center leading-snug line-clamp-1">
        {tool.label}
      </span>
      <span className="text-[11px] text-grappler-400 text-center leading-tight line-clamp-2">
        {showLongDesc ? tool.longDesc : tool.desc}
      </span>
    </button>
  );
}
