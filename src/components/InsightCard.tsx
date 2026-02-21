'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Lightbulb, BookOpen, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { pickContextualInsight, getTodayKey } from '@/lib/knowledge-engine';
import type { InsightPickerInput } from '@/lib/knowledge-engine';
import { insights, categoryInfo } from '@/lib/knowledge';
import type { TodayType } from '@/lib/daily-directive';

interface InsightCardProps {
  todayType: TodayType;
  readinessScore: number;
  isDeload: boolean;
  hasFightCamp: boolean;
  hasActiveInjury: boolean;
  activeDietPhase: 'cut' | 'bulk' | 'maintain' | null;
  mesocycleWeek: number | null;
  hasCompletedWorkoutToday: boolean;
  onOpenLibrary?: () => void;
}

export default function InsightCard({
  todayType,
  readinessScore,
  isDeload,
  hasFightCamp,
  hasActiveInjury,
  activeDietPhase,
  mesocycleWeek,
  hasCompletedWorkoutToday,
  onOpenLibrary,
}: InsightCardProps) {
  const {
    seenInsights, dismissedInsights, bookmarkedArticles,
    markInsightSeen, dismissInsight, lastInsightDate, setLastInsightDate,
  } = useAppStore(
    useShallow(s => ({
      seenInsights: s.seenInsights,
      dismissedInsights: s.dismissedInsights,
      bookmarkedArticles: s.bookmarkedArticles,
      markInsightSeen: s.markInsightSeen,
      dismissInsight: s.dismissInsight,
      lastInsightDate: s.lastInsightDate,
      setLastInsightDate: s.setLastInsightDate,
    }))
  );

  const [dismissed, setDismissed] = useState(false);

  const todayKey = getTodayKey();

  const insight = useMemo(() => {
    const input: InsightPickerInput = {
      todayType,
      readinessScore,
      isDeload,
      hasFightCamp,
      hasActiveInjury,
      activeDietPhase,
      mesocycleWeek,
      hasCompletedWorkoutToday,
      seenInsightIds: seenInsights,
      dismissedInsightIds: dismissedInsights,
      bookmarkedInsightIds: bookmarkedArticles,
    };
    return pickContextualInsight(insights, input);
    // Only recompute on day change or meaningful state change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayType, readinessScore, isDeload, hasFightCamp, hasActiveInjury, activeDietPhase, todayKey]);

  // Mark as seen on first render of today's insight
  if (insight && lastInsightDate !== todayKey) {
    markInsightSeen(insight.id);
    setLastInsightDate(todayKey);
  }

  const handleDismiss = () => {
    if (insight) {
      dismissInsight(insight.id);
    }
    setDismissed(true);
  };

  const handleSwipeDismiss = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100) {
      handleDismiss();
    }
  };

  if (!insight || dismissed) return null;

  const catInfo = categoryInfo[insight.category];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -200 }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleSwipeDismiss}
        className="card px-3.5 py-3 border-l-2 border-l-amber-400/60 cursor-grab active:cursor-grabbing"
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400/80">
              {catInfo?.name || 'Insight'}
            </span>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 -m-1 text-grappler-600 hover:text-grappler-400 transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <p className="text-sm font-semibold text-grappler-100 mt-1.5 leading-snug">
          {insight.headline}
        </p>
        <p className="text-xs text-grappler-400 mt-1 leading-relaxed">
          {insight.body}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between mt-2.5">
          {insight.source && (
            <span className="text-xs text-grappler-600 truncate max-w-[60%]">
              {insight.source}
            </span>
          )}
          {!insight.source && <span />}
          {onOpenLibrary && (
            <button
              onClick={onOpenLibrary}
              className="flex items-center gap-1 text-xs text-primary-400 font-medium hover:text-primary-300 transition-colors"
            >
              <BookOpen className="w-3 h-3" />
              More
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
