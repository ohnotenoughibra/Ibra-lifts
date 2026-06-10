import { Zap, Heart, Flame, Target, LucideIcon } from 'lucide-react';
import { WorkoutType } from '@/lib/types';

// Single source for how each workout type renders across the Train surfaces
// (WorkoutView hero, ScheduleSheet rows). Changing a type's icon or palette
// here updates every consumer.
export interface WorkoutTypeUI {
  icon: LucideIcon;
  color: string;        // icon chip: text + bg
  heroBg: string;       // hero card gradient + border
  intensity: string;    // human label
  intensityColor: string;
  intensityBg: string;
}

const FALLBACK: WorkoutTypeUI = {
  icon: Zap,
  color: 'text-red-400 bg-red-500/10',
  heroBg: 'from-red-500/20 to-red-900/10 border-red-500/30',
  intensity: 'Heavy',
  intensityColor: 'text-red-400',
  intensityBg: 'bg-red-500/15',
};

export const WORKOUT_TYPE_UI: Record<WorkoutType, WorkoutTypeUI> = {
  strength: FALLBACK,
  hypertrophy: {
    icon: Heart,
    color: 'text-purple-400 bg-purple-500/10',
    heroBg: 'from-purple-500/20 to-purple-900/10 border-purple-500/30',
    intensity: 'Moderate',
    intensityColor: 'text-purple-400',
    intensityBg: 'bg-purple-500/15',
  },
  power: {
    icon: Flame,
    color: 'text-blue-400 bg-blue-500/10',
    heroBg: 'from-blue-500/20 to-blue-900/10 border-blue-500/30',
    intensity: 'Explosive',
    intensityColor: 'text-blue-400',
    intensityBg: 'bg-blue-500/15',
  },
  strength_endurance: {
    icon: Target,
    color: 'text-amber-400 bg-amber-500/10',
    heroBg: 'from-amber-500/20 to-amber-900/10 border-amber-500/30',
    intensity: 'Endurance',
    intensityColor: 'text-amber-400',
    intensityBg: 'bg-amber-500/15',
  },
};

export function getWorkoutTypeUI(type: WorkoutType | string): WorkoutTypeUI {
  return WORKOUT_TYPE_UI[type as WorkoutType] || FALLBACK;
}
