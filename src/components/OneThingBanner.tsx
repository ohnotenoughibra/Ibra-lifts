'use client';

import { motion } from 'framer-motion';
import {
  Moon, Sun, Zap, Shield, Apple, Leaf, Dumbbell, Target,
  Play, Droplets, Check, Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OneThing } from '@/lib/one-thing';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Moon, Sun, Zap, Shield, Apple, Leaf, Dumbbell, Target,
  Play, Droplets, Check, Trophy,
};

interface OneThingBannerProps {
  oneThing: OneThing;
  onAction?: () => void;
}

export default function OneThingBanner({ oneThing, onAction }: OneThingBannerProps) {
  const { message, subtext, icon, color, action } = oneThing;
  const IconComponent = ICON_MAP[icon] || Zap;

  // Derive background gradient from the color class
  const bgClass = color.includes('green') ? 'from-green-500/10 to-green-500/5 border-green-500/20'
    : color.includes('blue') ? 'from-blue-500/10 to-blue-500/5 border-blue-500/20'
    : color.includes('orange') ? 'from-orange-500/10 to-orange-500/5 border-orange-500/20'
    : color.includes('amber') ? 'from-amber-500/10 to-amber-500/5 border-amber-500/20'
    : color.includes('yellow') ? 'from-yellow-500/10 to-yellow-500/5 border-yellow-500/20'
    : color.includes('primary') ? 'from-primary-500/10 to-primary-500/5 border-primary-500/20'
    : 'from-grappler-700/40 to-grappler-800/40 border-grappler-600/30';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      onClick={onAction}
      className={cn(
        'w-full rounded-lg bg-gradient-to-r border px-4 py-3.5',
        'flex items-center gap-3',
        bgClass,
        onAction && 'cursor-pointer active:scale-[0.98] transition-transform',
      )}
    >
      {/* Icon */}
      <div className={cn('flex-shrink-0', color)}>
        <IconComponent className="w-5 h-5" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold leading-tight', color === 'text-grappler-300' || color === 'text-grappler-400' ? 'text-grappler-200' : 'text-grappler-100')}>
          {message}
        </p>
        {subtext && (
          <p className="text-xs text-grappler-400 mt-0.5 leading-tight">{subtext}</p>
        )}
      </div>

      {/* Action button */}
      {action && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAction?.();
          }}
          className={cn(
            'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap',
            'active:scale-95 transition-transform',
            color.includes('green') ? 'bg-green-500/20 text-green-300'
              : color.includes('blue') ? 'bg-blue-500/20 text-blue-300'
              : color.includes('orange') ? 'bg-orange-500/20 text-orange-300'
              : color.includes('amber') ? 'bg-amber-500/20 text-amber-300'
              : color.includes('primary') ? 'bg-primary-500/20 text-primary-300'
              : 'bg-grappler-600/30 text-grappler-300',
          )}
        >
          {action}
        </button>
      )}
    </motion.div>
  );
}
