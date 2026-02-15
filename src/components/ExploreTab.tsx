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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticMedium } from '@/lib/haptics';
import { useAppStore } from '@/lib/store';
import type { OverlayView } from './dashboard-types';

interface Tool {
  id: NonNullable<OverlayView>;
  label: string;
  desc: string;
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
      { id: 'builder', label: 'Workout Builder', desc: 'Create custom sessions', keywords: 'create make design gym routine plan workout session custom build program training', icon: Dumbbell, color: 'from-primary-500/20 to-primary-500/5 text-primary-400' },
      { id: 'templates', label: 'Templates', desc: 'Save & reuse workouts', keywords: 'save reuse preset routine copy duplicate favorite bookmark', icon: Layers, color: 'from-blue-500/20 to-blue-500/5 text-blue-400', isPro: true },
      { id: 'custom_exercise', label: 'Custom Exercise', desc: 'Add your own moves', keywords: 'create new exercise movement add custom machine cable dumbbell barbell', icon: PlusSquare, color: 'from-violet-500/20 to-violet-500/5 text-violet-400', isPro: true },
      { id: 'block_suggestion', label: 'AI Program', desc: 'Auto-generate a block', keywords: 'auto generate smart suggest recommend ai mesocycle block plan program', icon: Sparkles, color: 'from-sky-500/20 to-sky-500/5 text-sky-400', isPro: true },
      { id: 'periodization', label: 'Periodization', desc: 'Plan training phases', keywords: 'phase cycle calendar deload peak taper block mesocycle schedule week', icon: Calendar, color: 'from-teal-500/20 to-teal-500/5 text-teal-400', isPro: true },
      { id: 'overload', label: 'Progression', desc: 'Track overload strategy', keywords: 'progressive overload increase weight reps sets volume stronger gains', icon: TrendingUp, color: 'from-green-500/20 to-green-500/5 text-green-400' },
      { id: 'grip_strength', label: 'Grip Strength', desc: 'Grip training protocol', keywords: 'grip hand forearm wrist crush pinch hang deadlift farmer carry hold squeeze', icon: Grip, color: 'from-slate-500/20 to-slate-500/5 text-slate-400', isPro: true },
    ],
  },
  {
    title: 'Analyze',
    icon: Eye,
    accent: 'text-pink-400',
    tools: [
      { id: 'strength', label: 'Strength', desc: 'e1RM trends & PRs', keywords: 'pr personal record max strength chart graph trend lift heavy strong e1rm estimated', icon: BarChart3, color: 'from-red-500/20 to-red-500/5 text-red-400', isPro: true },
      { id: 'profiler', label: 'Exercise Profiler', desc: 'Per-exercise deep dive', keywords: 'history stats analytics individual exercise detail performance data sets reps', icon: Target, color: 'from-blue-500/20 to-blue-500/5 text-blue-400', isPro: true },
      { id: 'volume_map', label: 'Volume Map', desc: 'Muscle group volume', keywords: 'muscle group heatmap chest back legs arms shoulders volume sets weekly body part', icon: Activity, color: 'from-pink-500/20 to-pink-500/5 text-pink-400', isPro: true },
      { id: 'one_rm', label: '1RM Calculator', desc: 'Estimate your max', keywords: 'one rep max calculator estimate weight heavy bench squat deadlift press strength', icon: Calculator, color: 'from-cyan-500/20 to-cyan-500/5 text-cyan-400' },
    ],
  },
  {
    title: 'Recover',
    icon: Heart,
    accent: 'text-rose-400',
    tools: [
      { id: 'recovery', label: 'Recovery', desc: 'Readiness check-in', keywords: 'rest day off readiness soreness sore tired recover how do i feel ready', icon: Heart, color: 'from-rose-500/20 to-rose-500/5 text-rose-400', isPro: true },
      { id: 'recovery_coach', label: 'Recovery Coach', desc: 'Sleep & stress tips', keywords: 'sleep stress rest nap meditation relax nervous cns overtraining burnout advice tips', icon: Moon, color: 'from-indigo-500/20 to-indigo-500/5 text-indigo-400', isPro: true },
      { id: 'hr_zones', label: 'HR Zones', desc: 'Heart rate training', keywords: 'heart rate cardio aerobic anaerobic zone bpm pulse conditioning endurance vo2', icon: Activity, color: 'from-red-500/20 to-red-500/5 text-red-400', isPro: true },
      { id: 'injury', label: 'Injury Log', desc: 'Track & manage injuries', keywords: 'hurt pain injury rehab rehabilitation shoulder knee back elbow wrist hip joint muscle pull strain', icon: Shield, color: 'from-sky-500/20 to-sky-500/5 text-sky-400', isPro: true },
      { id: 'illness', label: 'Illness Log', desc: 'Log sick days', keywords: 'sick cold flu fever cough covid ill unwell doctor symptom medicine', icon: Thermometer, color: 'from-blue-500/20 to-blue-500/5 text-blue-400', isPro: true },
      { id: 'fatigue', label: 'Fatigue', desc: 'Monitor fatigue levels', keywords: 'tired exhausted worn out energy low deload overtraining fatigue debt accumulated', icon: Zap, color: 'from-yellow-500/20 to-yellow-500/5 text-yellow-400', isPro: true },
    ],
  },
  {
    title: 'Fuel & Body',
    icon: Salad,
    accent: 'text-green-400',
    tools: [
      { id: 'nutrition', label: 'Nutrition', desc: 'Macros & meal planning', keywords: 'food eat diet meal calories macros protein carbs fat water hydration drink weight cut bulk lean gain lose breakfast lunch dinner snack track log fiber sugar sodium', icon: Apple, color: 'from-green-500/20 to-green-500/5 text-green-400', isPro: true },
      { id: 'fight_camp', label: 'Fight Camp Fuel', desc: 'Combat sport nutrition', keywords: 'mma boxing fight weigh in weight cut rehydrate refeed combat sport muay thai ufc diet food eat', icon: Flame, color: 'from-orange-500/20 to-orange-500/5 text-orange-400', isPro: true },
      { id: 'cycle_tracking', label: 'Cycle Tracking', desc: 'Menstrual cycle log', keywords: 'period menstrual cycle female women hormone luteal follicular ovulation pms', icon: Activity, color: 'from-pink-500/20 to-pink-500/5 text-pink-400', isPro: true },
    ],
  },
  {
    title: 'Sport & Social',
    icon: Trophy,
    accent: 'text-blue-400',
    tools: [
      { id: 'competition', label: 'Competition Prep', desc: 'Peak for your event', keywords: 'meet competition event peak taper fight tournament game match powerlifting', icon: Swords, color: 'from-red-500/20 to-red-500/5 text-red-400', isPro: true },
      { id: 'grappling', label: 'Grappling', desc: 'BJJ & wrestling tools', keywords: 'bjj jiu jitsu wrestling mma roll mat submission martial arts grapple training', icon: Navigation, color: 'from-blue-500/20 to-blue-500/5 text-blue-400', isPro: true },
      { id: 'mobility', label: 'Mobility', desc: 'Stretching & ROM', keywords: 'stretch flexible warm up cool down rom range motion yoga foam roll mobility joint stiff tight', icon: Move, color: 'from-teal-500/20 to-teal-500/5 text-teal-400', isPro: true },
      { id: 'wearable', label: 'Wearables', desc: 'Connect your device', keywords: 'whoop apple watch garmin fitbit oura ring wearable device sync connect tracker', icon: Watch, color: 'from-purple-500/20 to-purple-500/5 text-purple-400', isPro: true },
      { id: 'coach', label: 'Weekly Coach', desc: 'AI training feedback', keywords: 'coach advice tips feedback review summary weekly insight recommendation ai smart', icon: MessageSquare, color: 'from-primary-500/20 to-primary-500/5 text-primary-400', isPro: true },
      { id: 'community_share', label: 'Share', desc: 'Share with friends', keywords: 'share export screenshot post social media friends community brag show results', icon: Users, color: 'from-sky-500/20 to-sky-500/5 text-sky-400', isPro: true },
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
const MAX_RECENT = 4;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { return JSON.parse(localStorage.getItem(key) || '') as T; }
  catch { return fallback; }
}

interface ExploreTabProps {
  onNavigate: (view: OverlayView) => void;
}

export default function ExploreTab({ onNavigate }: ExploreTabProps) {
  const [search, setSearch] = useState('');
  const [recentIds, setRecentIds] = useState<string[]>(() => readJson(STORAGE_KEY_RECENT, []));
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => readJson(STORAGE_KEY_PINNED, []));
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

  // Persist pinned to localStorage via effect (pinning doesn't unmount)
  useEffect(() => { localStorage.setItem(STORAGE_KEY_PINNED, JSON.stringify(pinnedIds)); }, [pinnedIds]);

  const handleNavigate = useCallback((id: NonNullable<OverlayView>) => {
    // Persist recent synchronously — onNavigate unmounts this component
    // before a useEffect would fire
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
  }, []);

  const recentTools = useMemo(() =>
    recentIds.map(id => TOOL_MAP.get(id)).filter(Boolean) as Tool[],
    [recentIds]
  );

  const pinnedTools = useMemo(() =>
    pinnedIds.map(id => TOOL_MAP.get(id)).filter(Boolean) as Tool[],
    [pinnedIds]
  );

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return CATEGORIES;
    const q = search.toLowerCase().trim();
    const words = q.split(/\s+/);
    return CATEGORIES.map(cat => ({
      ...cat,
      tools: cat.tools.filter(t => {
        const haystack = `${t.label} ${t.desc} ${t.keywords}`.toLowerCase();
        // Every search word must appear somewhere in label+desc+keywords
        return words.every(w => haystack.includes(w));
      }),
    })).filter(cat => cat.tools.length > 0);
  }, [search]);

  const isSearching = search.trim().length > 0;

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

      {/* Suggested for you */}
      {!isSearching && suggestedTools.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-primary-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> Suggested for you
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {suggestedTools.map(tool => (
              <ToolButton key={tool.id} tool={tool} onNavigate={handleNavigate} isPinned={pinnedIds.includes(tool.id)} onTogglePin={togglePin} />
            ))}
          </div>
        </div>
      )}

      {/* Pinned tools */}
      {!isSearching && pinnedTools.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-grappler-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Pin className="w-3 h-3" /> Pinned
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {pinnedTools.map(tool => (
              <ToolButton key={tool.id} tool={tool} onNavigate={handleNavigate} isPinned onTogglePin={togglePin} />
            ))}
          </div>
        </div>
      )}

      {/* Recently used */}
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
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category grids */}
      {filteredCategories.map(category => (
        <div key={category.title}>
          <p className="text-xs font-semibold text-grappler-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <category.icon className={cn('w-3.5 h-3.5', category.accent)} />
            {category.title}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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

      {filteredCategories.length === 0 && isSearching && (
        <div className="text-center py-8">
          <p className="text-sm text-grappler-500">No tools matching &ldquo;{search}&rdquo;</p>
        </div>
      )}
    </div>
  );
}

const LONG_PRESS_MS = 500;

function ToolButton({ tool, onNavigate, isPinned, onTogglePin }: {
  tool: Tool;
  onNavigate: (id: NonNullable<OverlayView>) => void;
  isPinned: boolean;
  onTogglePin: (id: string) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

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
      className={cn(
        'relative flex flex-col items-center justify-center gap-1 p-4 sm:p-3 rounded-xl bg-gradient-to-b border border-grappler-800/50 min-h-[5.5rem]',
        'hover:border-grappler-700 active:scale-95 transition-all select-none',
        tool.color
      )}
    >
      {isPinned && (
        <Pin className="absolute top-1.5 right-1.5 w-2.5 h-2.5 text-grappler-500" />
      )}
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
      <span className="text-[10px] text-grappler-500 text-center leading-tight line-clamp-1">
        {tool.desc}
      </span>
    </button>
  );
}
