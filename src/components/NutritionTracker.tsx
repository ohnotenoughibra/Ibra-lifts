'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  LayoutDashboard,
  GraduationCap,
  Zap,
  X,
} from 'lucide-react';
import { cn, localDayKey } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { useNutrition } from '@/hooks/useNutrition';
import NutritionDashboard from './nutrition/NutritionDashboard';
import NutritionLogSheet from './nutrition/NutritionLogSheet';
import NutritionCoach from './nutrition/NutritionCoach';
import NutritionInsights from './nutrition/NutritionInsights';

// 'log' is no longer a tab — logging is a bottom sheet opened from the dashboard
// FAB, so you never leave "Today" to add a meal.
type Tab = 'dashboard' | 'review' | 'coach';

interface NutritionTrackerProps {
  onClose: () => void;
}

export default function NutritionTracker({ onClose }: NutritionTrackerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showLog, setShowLog] = useState(false);

  // Date navigation
  // Local calendar day — useNutrition keys meals by local day, so the picker
  // must agree or an evening-logged meal vanishes from the day it was entered
  const [selectedDate, setSelectedDate] = useState(() => localDayKey());
  const todayStr = localDayKey();
  const isToday = selectedDate === todayStr;

  const navigateDate = (direction: -1 | 1) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + direction);
    const newStr = localDayKey(d);
    if (newStr <= todayStr) setSelectedDate(newStr);
  };

  const selectedDateFormatted = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const nutrition = useNutrition(selectedDate);
  const activeDietPhase = useAppStore(s => s.activeDietPhase);
  const phaseLabel = activeDietPhase?.isActive ? activeDietPhase.goal : null;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Today', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'review', label: 'Review', icon: <Zap className="w-4 h-4" /> },
    { id: 'coach', label: 'Coach', icon: <GraduationCap className="w-4 h-4" /> },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-grappler-900 pb-24 safe-area-top"
    >
      {/* Header */}
      <div className="sticky top-0 z-20 bg-grappler-900 border-b border-grappler-800">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            aria-label="Go back"
            onClick={onClose}
            className="flex items-center gap-1 text-grappler-400 hover:text-grappler-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>

          {/* Date navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigateDate(-1)}
              className="p-1 text-grappler-400 hover:text-grappler-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => !isToday && setSelectedDate(todayStr)}
              className={cn(
                'text-xs px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors',
                isToday ? 'text-primary-400 font-semibold' : 'text-grappler-400 hover:text-grappler-200 bg-grappler-800'
              )}
            >
              <CalendarDays className="w-3 h-3" />
              {isToday ? 'Today' : selectedDateFormatted}
            </button>
            <button
              onClick={() => navigateDate(1)}
              disabled={isToday}
              className={cn(
                'p-1 transition-colors',
                isToday ? 'text-grappler-700 cursor-not-allowed' : 'text-grappler-400 hover:text-grappler-200'
              )}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="w-16 flex justify-end">
            {phaseLabel && (
              <span className={cn(
                'text-xs font-semibold px-2 py-0.5 rounded-full capitalize',
                phaseLabel === 'cut' ? 'bg-red-500/20 text-red-400' :
                phaseLabel === 'bulk' ? 'bg-emerald-500/20 text-emerald-400' :
                'bg-blue-500/20 text-blue-400'
              )}>
                {phaseLabel}
              </span>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex px-4 gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-all border-b-2',
                activeTab === tab.id
                  ? 'text-primary-400 border-primary-400'
                  : 'text-grappler-500 border-transparent hover:text-grappler-300'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 pt-4">
        {activeTab === 'dashboard' && (
          <NutritionDashboard
            nutrition={nutrition}
            onOpenLog={() => setShowLog(true)}
          />
        )}
        {activeTab === 'review' && (
          <NutritionInsights
            todayMeals={nutrition.meals}
            allMeals={nutrition.allMeals}
            targets={nutrition.targets}
            remaining={nutrition.remaining}
            totals={nutrition.totals}
            macroTargets={nutrition.macroTargets}
            mealHistoryIndex={nutrition.mealHistoryIndex}
          />
        )}
        {activeTab === 'coach' && (
          <NutritionCoach nutrition={nutrition} />
        )}
      </div>

      {/* Log — a bottom sheet over whatever you're looking at, so logging never
          requires leaving the dashboard. */}
      <AnimatePresence>
        {showLog && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center"
            onClick={() => setShowLog(false)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg max-h-[88vh] bg-grappler-900 rounded-t-2xl flex flex-col overlay-safe"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-grappler-800 flex-shrink-0">
                <span className="text-base font-bold text-grappler-100">Log food</span>
                <button onClick={() => setShowLog(false)} className="p-1.5 text-grappler-400 hover:text-grappler-200" aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto px-4 py-4 flex-1">
                <NutritionLogSheet nutrition={nutrition} selectedDate={selectedDate} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
