'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Dumbbell, Layers, PlusSquare, Sparkles, Calendar,
  TrendingUp, BarChart3, Target, Calculator, Activity,
  Heart, Shield, Thermometer, Zap, Moon,
  Apple, Grip, Flame,
  Swords, Navigation, Move, Watch,
  Users, MessageSquare, Search, Clock, Pin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OverlayView } from './dashboard-types';

interface Tool {
  id: NonNullable<OverlayView>;
  label: string;
  desc: string;
  icon: React.ElementType;
  color: string;
}

interface Category {
  title: string;
  tools: Tool[];
}

const CATEGORIES: Category[] = [
  {
    title: 'Build',
    tools: [
      { id: 'builder', label: 'Workout Builder', desc: 'Create custom sessions', icon: Dumbbell, color: 'from-primary-500/20 to-primary-500/5 text-primary-400' },
      { id: 'templates', label: 'Templates', desc: 'Save & reuse workouts', icon: Layers, color: 'from-blue-500/20 to-blue-500/5 text-blue-400' },
      { id: 'custom_exercise', label: 'Custom Exercise', desc: 'Add your own moves', icon: PlusSquare, color: 'from-violet-500/20 to-violet-500/5 text-violet-400' },
      { id: 'block_suggestion', label: 'AI Program', desc: 'Auto-generate a block', icon: Sparkles, color: 'from-sky-500/20 to-sky-500/5 text-sky-400' },
      { id: 'periodization', label: 'Periodization', desc: 'Plan training phases', icon: Calendar, color: 'from-teal-500/20 to-teal-500/5 text-teal-400' },
      { id: 'overload', label: 'Progression', desc: 'Track overload strategy', icon: TrendingUp, color: 'from-green-500/20 to-green-500/5 text-green-400' },
    ],
  },
  {
    title: 'Analyze',
    tools: [
      { id: 'strength', label: 'Strength', desc: 'e1RM trends & PRs', icon: BarChart3, color: 'from-red-500/20 to-red-500/5 text-red-400' },
      { id: 'profiler', label: 'Exercise Profiler', desc: 'Per-exercise deep dive', icon: Target, color: 'from-blue-500/20 to-blue-500/5 text-blue-400' },
      { id: 'volume_map', label: 'Volume Map', desc: 'Muscle group volume', icon: Activity, color: 'from-pink-500/20 to-pink-500/5 text-pink-400' },
      { id: 'one_rm', label: '1RM Calculator', desc: 'Estimate your max', icon: Calculator, color: 'from-cyan-500/20 to-cyan-500/5 text-cyan-400' },
    ],
  },
  {
    title: 'Recover',
    tools: [
      { id: 'recovery', label: 'Recovery', desc: 'Readiness check-in', icon: Heart, color: 'from-rose-500/20 to-rose-500/5 text-rose-400' },
      { id: 'recovery_coach', label: 'Recovery Coach', desc: 'Sleep & stress tips', icon: Moon, color: 'from-indigo-500/20 to-indigo-500/5 text-indigo-400' },
      { id: 'hr_zones', label: 'HR Zones', desc: 'Heart rate training', icon: Activity, color: 'from-red-500/20 to-red-500/5 text-red-400' },
      { id: 'injury', label: 'Injury Log', desc: 'Track & manage injuries', icon: Shield, color: 'from-sky-500/20 to-sky-500/5 text-sky-400' },
      { id: 'illness', label: 'Illness Log', desc: 'Log sick days', icon: Thermometer, color: 'from-blue-500/20 to-blue-500/5 text-blue-400' },
      { id: 'fatigue', label: 'Fatigue', desc: 'Monitor fatigue levels', icon: Zap, color: 'from-yellow-500/20 to-yellow-500/5 text-yellow-400' },
    ],
  },
  {
    title: 'Fuel & Body',
    tools: [
      { id: 'nutrition', label: 'Nutrition', desc: 'Macros & meal planning', icon: Apple, color: 'from-green-500/20 to-green-500/5 text-green-400' },
      { id: 'fight_camp', label: 'Fight Camp Fuel', desc: 'Combat sport nutrition', icon: Flame, color: 'from-orange-500/20 to-orange-500/5 text-orange-400' },
      { id: 'grip_strength', label: 'Grip Strength', desc: 'Grip training protocol', icon: Grip, color: 'from-slate-500/20 to-slate-500/5 text-slate-400' },
      { id: 'cycle_tracking', label: 'Cycle Tracking', desc: 'Menstrual cycle log', icon: Activity, color: 'from-pink-500/20 to-pink-500/5 text-pink-400' },
    ],
  },
  {
    title: 'Sport & Social',
    tools: [
      { id: 'competition', label: 'Competition Prep', desc: 'Peak for your event', icon: Swords, color: 'from-red-500/20 to-red-500/5 text-red-400' },
      { id: 'grappling', label: 'Grappling', desc: 'BJJ & wrestling tools', icon: Navigation, color: 'from-blue-500/20 to-blue-500/5 text-blue-400' },
      { id: 'mobility', label: 'Mobility', desc: 'Stretching & ROM', icon: Move, color: 'from-teal-500/20 to-teal-500/5 text-teal-400' },
      { id: 'wearable', label: 'Wearables', desc: 'Connect your device', icon: Watch, color: 'from-purple-500/20 to-purple-500/5 text-purple-400' },
      { id: 'coach', label: 'Weekly Coach', desc: 'AI training feedback', icon: MessageSquare, color: 'from-primary-500/20 to-primary-500/5 text-primary-400' },
      { id: 'community_share', label: 'Share', desc: 'Share with friends', icon: Users, color: 'from-sky-500/20 to-sky-500/5 text-sky-400' },
    ],
  },
];

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

  // Persist to localStorage
  useEffect(() => { localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(recentIds)); }, [recentIds]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_PINNED, JSON.stringify(pinnedIds)); }, [pinnedIds]);

  const handleNavigate = useCallback((id: NonNullable<OverlayView>) => {
    // Track recently used
    setRecentIds(prev => {
      const filtered = prev.filter(r => r !== id);
      return [id, ...filtered].slice(0, MAX_RECENT);
    });
    onNavigate(id);
  }, [onNavigate]);

  const togglePin = useCallback((id: string) => {
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
    const q = search.toLowerCase();
    return CATEGORIES.map(cat => ({
      ...cat,
      tools: cat.tools.filter(t =>
        t.label.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q)
      ),
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
          <p className="text-xs font-semibold text-grappler-400 uppercase tracking-wider mb-2.5">
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

function ToolButton({ tool, onNavigate, isPinned, onTogglePin }: {
  tool: Tool;
  onNavigate: (id: NonNullable<OverlayView>) => void;
  isPinned: boolean;
  onTogglePin: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onNavigate(tool.id)}
      onContextMenu={(e) => { e.preventDefault(); onTogglePin(tool.id); }}
      className={cn(
        'relative flex flex-col items-center justify-center gap-1 p-4 sm:p-3 rounded-xl bg-gradient-to-b border border-grappler-800/50 min-h-[5.5rem]',
        'hover:border-grappler-700 active:scale-95 transition-all',
        tool.color
      )}
    >
      {isPinned && (
        <Pin className="absolute top-1.5 right-1.5 w-2.5 h-2.5 text-grappler-500" />
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
