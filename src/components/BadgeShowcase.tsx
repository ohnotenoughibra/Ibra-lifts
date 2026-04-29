'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { badges as allBadges, getBadgesByCategory } from '@/lib/gamification';
import { ArrowLeft, Trophy, Lock, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BadgeCategory } from '@/lib/types';

const CATEGORIES: { id: BadgeCategory; label: string; color: string }[] = [
  { id: 'strength', label: 'Strength', color: 'text-red-400' },
  { id: 'consistency', label: 'Consistency', color: 'text-green-400' },
  { id: 'volume', label: 'Volume', color: 'text-blue-400' },
  { id: 'milestone', label: 'Milestones', color: 'text-yellow-400' },
  { id: 'special', label: 'Special', color: 'text-purple-400' },
  { id: 'wellness', label: 'Wellness', color: 'text-cyan-400' },
];

export default function BadgeShowcase({ onClose }: { onClose: () => void }) {
  const { gamificationStats } = useAppStore();
  const [activeCategory, setActiveCategory] = useState<BadgeCategory | 'all'>('all');
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);

  const earnedBadgeIds = useMemo(
    () => new Set(gamificationStats.badges.map(b => b.badgeId)),
    [gamificationStats.badges]
  );

  const displayBadges = useMemo(() => {
    const badges = activeCategory === 'all' ? allBadges : getBadgesByCategory(activeCategory);
    return badges.map(badge => ({
      ...badge,
      earned: earnedBadgeIds.has(badge.id),
      earnedAt: gamificationStats.badges.find(b => b.badgeId === badge.id)?.earnedAt,
    }));
  }, [activeCategory, earnedBadgeIds, gamificationStats.badges]);

  const earnedCount = displayBadges.filter(b => b.earned).length;
  const totalCount = displayBadges.length;

  return (
    <div className="min-h-screen bg-grappler-950 pb-24 safe-area-top">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-grappler-950 border-b border-grappler-800">
        <div className="flex items-center gap-3 p-4">
          <button onClick={onClose} className="p-2 -ml-2 hover:bg-grappler-800 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-grappler-300" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-grappler-100 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Badge Showcase
            </h1>
            <p className="text-xs text-grappler-400">{earnedCount} / {totalCount} earned</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-3">
          <div className="w-full h-2 bg-grappler-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full transition-all duration-700"
              style={{ width: `${totalCount > 0 ? (earnedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Category filter */}
        <div className="flex gap-1.5 overflow-x-auto px-4 pb-3 scrollbar-none">
          <button
            onClick={() => setActiveCategory('all')}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
              activeCategory === 'all' ? 'bg-primary-500 text-white' : 'bg-grappler-800 text-grappler-400'
            )}
          >
            All ({allBadges.length})
          </button>
          {CATEGORIES.map(cat => {
            const count = getBadgesByCategory(cat.id).length;
            const earned = getBadgesByCategory(cat.id).filter(b => earnedBadgeIds.has(b.id)).length;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                  activeCategory === cat.id ? 'bg-primary-500 text-white' : 'bg-grappler-800 text-grappler-400'
                )}
              >
                {cat.label} ({earned}/{count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Badge Grid */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3">
          {displayBadges.map((badge, i) => (
            <motion.button
              key={badge.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02 }}
              onClick={() => {
                setSelectedBadge(selectedBadge === badge.id ? null : badge.id);
                if (badge.earned && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                  navigator.vibrate(30);
                }
              }}
              className={cn(
                'relative flex flex-col items-center p-3 rounded-xl border transition-all text-center',
                badge.earned
                  ? 'bg-grappler-800/60 border-grappler-700 hover:border-grappler-600'
                  : 'bg-grappler-900/50 border-grappler-800/50 opacity-50'
              )}
            >
              {/* Badge icon */}
              <div className={cn(
                'text-3xl mb-1.5',
                !badge.earned && 'grayscale blur-[1px]'
              )}>
                {badge.earned ? badge.icon : <Lock className="w-7 h-7 text-grappler-600 mx-auto" />}
              </div>

              {/* Name */}
              <p className={cn(
                'text-xs font-semibold leading-tight',
                badge.earned ? 'text-grappler-200' : 'text-grappler-600'
              )}>
                {badge.earned ? badge.name : '???'}
              </p>

              {/* Points */}
              <p className={cn(
                'text-[9px] mt-0.5',
                badge.earned ? 'text-yellow-400' : 'text-grappler-700'
              )}>
                {badge.points} pts
              </p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Selected badge detail */}
      <AnimatePresence>
        {selectedBadge && (() => {
          const badge = displayBadges.find(b => b.id === selectedBadge);
          if (!badge) return null;
          return (
            <motion.div
              key="badge-detail"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-8"
            >
              <div className={cn(
                'rounded-lg p-5 border shadow-2xl',
                badge.earned
                  ? 'bg-grappler-800 border-grappler-600'
                  : 'bg-grappler-900 border-grappler-700'
              )}>
                <div className="flex items-center gap-4">
                  <div className="text-4xl">
                    {badge.earned ? badge.icon : <Lock className="w-10 h-10 text-grappler-600" />}
                  </div>
                  <div className="flex-1">
                    <h3 className={cn('font-bold text-lg', badge.earned ? 'text-grappler-100' : 'text-grappler-500')}>
                      {badge.name}
                    </h3>
                    <p className="text-sm text-grappler-400">{badge.description}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-yellow-400 font-medium">{badge.points} pts</span>
                      <span className="text-xs text-grappler-600 capitalize">{badge.category}</span>
                      {badge.earned && badge.earnedAt && (
                        <span className="text-xs text-grappler-400">
                          Earned {new Date(badge.earnedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {badge.earned && (
                      <button
                        onClick={async () => {
                          const text = `${badge.icon} I earned the "${badge.name}" badge!\n${badge.description}\n\n— Ibra Lifts`;
                          try {
                            if (typeof navigator !== 'undefined' && navigator.share) {
                              await navigator.share({ text });
                            } else {
                              await (navigator as Navigator).clipboard.writeText(text);
                            }
                          } catch { /* user cancelled or clipboard unavailable */ }
                        }}
                        className="mt-2 flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                      >
                        <Share2 className="w-3 h-3" /> Share
                      </button>
                    )}
                    {!badge.earned && (
                      <p className="text-xs text-grappler-600 mt-1 italic">
                        Requirement: {badge.requirement.replace(/_/g, ' ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
