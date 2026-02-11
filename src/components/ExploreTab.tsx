'use client';

import { motion } from 'framer-motion';
import {
  Dumbbell, Layers, PlusSquare, Sparkles, Calendar,
  TrendingUp, BarChart3, Target, Calculator, Activity,
  Heart, Shield, Thermometer, Zap, Moon,
  Apple, Grip,
  Swords, Navigation, Move, Watch,
  Users, MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OverlayView } from './dashboard-types';

interface Tool {
  id: NonNullable<OverlayView>;
  label: string;
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
      { id: 'builder', label: 'Workout Builder', icon: Dumbbell, color: 'from-primary-500/20 to-primary-500/5 text-primary-400' },
      { id: 'templates', label: 'Templates', icon: Layers, color: 'from-blue-500/20 to-blue-500/5 text-blue-400' },
      { id: 'custom_exercise', label: 'Custom Exercise', icon: PlusSquare, color: 'from-violet-500/20 to-violet-500/5 text-violet-400' },
      { id: 'block_suggestion', label: 'AI Program', icon: Sparkles, color: 'from-sky-500/20 to-sky-500/5 text-sky-400' },
      { id: 'periodization', label: 'Periodization', icon: Calendar, color: 'from-teal-500/20 to-teal-500/5 text-teal-400' },
      { id: 'overload', label: 'Progression', icon: TrendingUp, color: 'from-green-500/20 to-green-500/5 text-green-400' },
    ],
  },
  {
    title: 'Analyze',
    tools: [
      { id: 'strength', label: 'Strength', icon: BarChart3, color: 'from-red-500/20 to-red-500/5 text-red-400' },
      { id: 'profiler', label: 'Exercise Profiler', icon: Target, color: 'from-blue-500/20 to-blue-500/5 text-blue-400' },
      { id: 'volume_map', label: 'Volume Map', icon: Activity, color: 'from-pink-500/20 to-pink-500/5 text-pink-400' },
      { id: 'one_rm', label: '1RM Calculator', icon: Calculator, color: 'from-cyan-500/20 to-cyan-500/5 text-cyan-400' },
    ],
  },
  {
    title: 'Recover',
    tools: [
      { id: 'recovery', label: 'Recovery', icon: Heart, color: 'from-rose-500/20 to-rose-500/5 text-rose-400' },
      { id: 'recovery_coach', label: 'Recovery Coach', icon: Moon, color: 'from-indigo-500/20 to-indigo-500/5 text-indigo-400' },
      { id: 'hr_zones', label: 'HR Zones', icon: Activity, color: 'from-red-500/20 to-red-500/5 text-red-400' },
      { id: 'injury', label: 'Injury Log', icon: Shield, color: 'from-sky-500/20 to-sky-500/5 text-sky-400' },
      { id: 'illness', label: 'Illness Log', icon: Thermometer, color: 'from-blue-500/20 to-blue-500/5 text-blue-400' },
      { id: 'fatigue', label: 'Fatigue', icon: Zap, color: 'from-yellow-500/20 to-yellow-500/5 text-yellow-400' },
    ],
  },
  {
    title: 'Fuel & Body',
    tools: [
      { id: 'nutrition', label: 'Nutrition', icon: Apple, color: 'from-green-500/20 to-green-500/5 text-green-400' },
      { id: 'grip_strength', label: 'Grip Strength', icon: Grip, color: 'from-slate-500/20 to-slate-500/5 text-slate-400' },
      { id: 'cycle_tracking', label: 'Cycle Tracking', icon: Activity, color: 'from-pink-500/20 to-pink-500/5 text-pink-400' },
    ],
  },
  {
    title: 'Sport & Social',
    tools: [
      { id: 'competition', label: 'Competition Prep', icon: Swords, color: 'from-red-500/20 to-red-500/5 text-red-400' },
      { id: 'grappling', label: 'Grappling', icon: Navigation, color: 'from-blue-500/20 to-blue-500/5 text-blue-400' },
      { id: 'mobility', label: 'Mobility', icon: Move, color: 'from-teal-500/20 to-teal-500/5 text-teal-400' },
      { id: 'wearable', label: 'Wearables', icon: Watch, color: 'from-purple-500/20 to-purple-500/5 text-purple-400' },
      { id: 'coach', label: 'Weekly Coach', icon: MessageSquare, color: 'from-primary-500/20 to-primary-500/5 text-primary-400' },
      { id: 'community_share', label: 'Share', icon: Users, color: 'from-sky-500/20 to-sky-500/5 text-sky-400' },
    ],
  },
];

interface ExploreTabProps {
  onNavigate: (view: OverlayView) => void;
}

export default function ExploreTab({ onNavigate }: ExploreTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-grappler-50">Explore</h2>
        <p className="text-sm text-grappler-400">All your training tools in one place</p>
      </div>

      {CATEGORIES.map((category, catIdx) => (
        <div key={category.title}>
          <p className="text-xs font-semibold text-grappler-500 uppercase tracking-wider mb-2">
            {category.title}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {category.tools.map((tool, toolIdx) => (
              <motion.button
                key={tool.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: catIdx * 0.05 + toolIdx * 0.02 }}
                onClick={() => onNavigate(tool.id)}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gradient-to-b border border-grappler-800/50',
                  'hover:border-grappler-700 active:scale-95 transition-all',
                  tool.color
                )}
              >
                <tool.icon className="w-5 h-5" />
                <span className="text-xs font-medium text-grappler-200 text-center leading-tight">
                  {tool.label}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
