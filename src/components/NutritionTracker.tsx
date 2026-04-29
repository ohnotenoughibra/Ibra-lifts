'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  LayoutDashboard,
  UtensilsCrossed,
  GraduationCap,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { useNutrition } from '@/hooks/useNutrition';
import NutritionDashboard from './nutrition/NutritionDashboard';
import NutritionLogSheet from './nutrition/NutritionLogSheet';
import NutritionCoach from './nutrition/NutritionCoach';
import NutritionInsights from './nutrition/NutritionInsights';

type Tab = 'dashboard' | 'log' | 'insights' | 'coach';

interface NutritionTrackerProps {
  onClose: () => void;
}

export default function NutritionTracker({ onClose }: NutritionTrackerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  // Date navigation
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;

  const navigateDate = (direction: -1 | 1) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + direction);
    const newStr = d.toISOString().split('T')[0];
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
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'log', label: 'Log', icon: <UtensilsCrossed className="w-4 h-4" /> },
    { id: 'insights', label: 'Insights', icon: <Zap className="w-4 h-4" /> },
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
            onOpenLog={() => setActiveTab('log')}
          />
        )}
        {activeTab === 'log' && (
          <NutritionLogSheet
            nutrition={nutrition}
            selectedDate={selectedDate}
          />
        )}
        {activeTab === 'insights' && (
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
    </motion.div>
  );
}
