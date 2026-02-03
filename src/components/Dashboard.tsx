'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import {
  Dumbbell,
  Calendar,
  Trophy,
  BarChart3,
  BookOpen,
  User,
  Play,
  ChevronRight,
  Flame,
  Target,
  Zap,
  Star,
  TrendingUp,
  Clock,
  AlertTriangle,
  Download,
  FileJson,
  FileSpreadsheet,
  History,
  Brain,
  Activity,
  Apple,
  Leaf,
  Trophy as TrophyIcon,
  Crosshair,
  Scaling,
  HeartPulse,
  Siren,
  Calculator,
  ListPlus,
  Layers,
  LayoutGrid,
  Sun,
  Moon,
  Shield
} from 'lucide-react';
import { cn, formatNumber, formatDate } from '@/lib/utils';
import { getMotivationalMessage, getLevelTitle, levelProgress, pointsToNextLevel } from '@/lib/gamification';
import { shouldDeload } from '@/lib/auto-adjust';
import { generateQuickWorkout } from '@/lib/workout-generator';
import { exportToCSV, exportToJSON, downloadFile } from '@/lib/data-export';
import WorkoutView from './WorkoutView';
import ProgressCharts from './ProgressCharts';
import KnowledgeHub from './KnowledgeHub';
import ProfileSettings from './ProfileSettings';
import ActiveWorkout from './ActiveWorkout';
import WorkoutHistory from './WorkoutHistory';
import TrainingCalendar from './TrainingCalendar';
import BodyWeightTracker from './BodyWeightTracker';
import WorkoutBuilder from './WorkoutBuilder';
import NutritionTracker from './NutritionTracker';
import WearableIntegration from './WearableIntegration';
import CompetitionPrep from './CompetitionPrep';
import MobilityWorkouts from './MobilityWorkouts';
import WeeklyCoach from './WeeklyCoach';
import ExerciseProfiler from './ExerciseProfiler';
import StrengthAnalysis from './StrengthAnalysis';
import PeriodizationCalendar from './PeriodizationCalendar';
import RecoveryDashboard from './RecoveryDashboard';
import InjuryLogger from './InjuryLogger';
import ProgressiveOverload from './ProgressiveOverload';
import CustomExerciseCreator from './CustomExerciseCreator';
import OneRepMaxCalc from './OneRepMaxCalc';
import HRZoneTraining from './HRZoneTraining';
import SessionTemplates from './SessionTemplates';
import VolumeHeatMap from './VolumeHeatMap';
import GrapplingTracker from './GrapplingTracker';
import ThemeToggle from './ThemeToggle';

type TabType = 'home' | 'program' | 'progress' | 'history' | 'learn' | 'profile';
type OverlayView = 'builder' | 'nutrition' | 'wearable' | 'competition' | 'mobility' | 'coach' | 'profiler' | 'strength' | 'periodization' | 'recovery' | 'injury' | 'overload' | 'custom_exercise' | 'one_rm' | 'hr_zones' | 'templates' | 'volume_map' | 'grappling' | null;

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [overlayView, setOverlayView] = useState<OverlayView>(null);
  const { user, gamificationStats, currentMesocycle, activeWorkout, workoutLogs } = useAppStore();

  if (activeWorkout) {
    return <ActiveWorkout />;
  }

  // Full-screen overlay views
  if (overlayView === 'builder') {
    return <WorkoutBuilder onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'nutrition') {
    return <NutritionTracker onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'wearable') {
    return <WearableIntegration onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'competition') {
    return <CompetitionPrep onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'mobility') {
    return <MobilityWorkouts onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'coach') {
    return <WeeklyCoach onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'profiler') {
    return <ExerciseProfiler onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'strength') {
    return <StrengthAnalysis onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'periodization') {
    return <PeriodizationCalendar onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'recovery') {
    return <RecoveryDashboard onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'injury') {
    return <InjuryLogger onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'overload') {
    return <ProgressiveOverload onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'custom_exercise') {
    return <CustomExerciseCreator onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'one_rm') {
    return <OneRepMaxCalc onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'hr_zones') {
    return <HRZoneTraining onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'templates') {
    return <SessionTemplates onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'volume_map') {
    return <VolumeHeatMap onClose={() => setOverlayView(null)} />;
  }
  if (overlayView === 'grappling') {
    return <GrapplingTracker onClose={() => setOverlayView(null)} />;
  }

  return (
    <div className="min-h-screen bg-grappler-900 bg-mesh pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-grappler-900/80 backdrop-blur-xl border-b border-grappler-800">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-grappler-50">Grappler Gains</h1>
              <p className="text-xs text-grappler-400">
                Level {gamificationStats.level} {getLevelTitle(gamificationStats.level)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="flex items-center gap-1 bg-grappler-800 px-3 py-1.5 rounded-full">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-grappler-200">
                {gamificationStats.currentStreak}
              </span>
            </div>
            <div className="flex items-center gap-1 bg-grappler-800 px-3 py-1.5 rounded-full">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-grappler-200">
                {formatNumber(gamificationStats.totalPoints)}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <HomeTab onNavigate={setOverlayView} />
            </motion.div>
          )}
          {activeTab === 'program' && (
            <motion.div
              key="program"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <WorkoutView onOpenBuilder={() => setOverlayView('builder')} />
            </motion.div>
          )}
          {activeTab === 'progress' && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ProgressCharts />
            </motion.div>
          )}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <HistoryTab />
            </motion.div>
          )}
          {activeTab === 'learn' && (
            <motion.div
              key="learn"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <KnowledgeHub />
            </motion.div>
          )}
          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ProfileSettings />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-grappler-900/95 backdrop-blur-xl border-t border-grappler-800 safe-area-bottom">
        <div className="flex items-center justify-around py-2">
          {[
            { id: 'home', icon: Dumbbell, label: 'Home' },
            { id: 'program', icon: Calendar, label: 'Program' },
            { id: 'progress', icon: BarChart3, label: 'Progress' },
            { id: 'history', icon: History, label: 'History' },
            { id: 'learn', icon: BookOpen, label: 'Learn' },
            { id: 'profile', icon: User, label: 'Profile' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all',
                activeTab === tab.id
                  ? 'text-primary-400'
                  : 'text-grappler-500 hover:text-grappler-300'
              )}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 w-10 h-0.5 bg-primary-500 rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

// History Tab - combines workout history, calendar, body weight, and data export
function HistoryTab() {
  const { workoutLogs, user } = useAppStore();
  const [historyView, setHistoryView] = useState<'log' | 'calendar' | 'weight'>('log');
  const [showExport, setShowExport] = useState(false);
  const weightUnit = user?.weightUnit || 'lbs';

  const handleExportCSV = () => {
    const csv = exportToCSV(workoutLogs, weightUnit);
    const date = new Date().toISOString().split('T')[0];
    downloadFile(csv, `grappler-gains-${date}.csv`, 'text/csv');
  };

  const handleExportJSON = () => {
    const json = exportToJSON(workoutLogs);
    const date = new Date().toISOString().split('T')[0];
    downloadFile(json, `grappler-gains-${date}.json`, 'application/json');
  };

  return (
    <div className="space-y-4">
      {/* Sub-navigation */}
      <div className="flex gap-2">
        {[
          { id: 'log', label: 'Workouts' },
          { id: 'calendar', label: 'Calendar' },
          { id: 'weight', label: 'Body Weight' }
        ].map((view) => (
          <button
            key={view.id}
            onClick={() => setHistoryView(view.id as typeof historyView)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              historyView === view.id
                ? 'bg-primary-500 text-white'
                : 'bg-grappler-800 text-grappler-400 hover:text-grappler-200'
            )}
          >
            {view.label}
          </button>
        ))}
        <button
          onClick={() => setShowExport(!showExport)}
          className="ml-auto p-2 rounded-lg bg-grappler-800 text-grappler-400 hover:text-grappler-200"
          title="Export Data"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Export options */}
      <AnimatePresence>
        {showExport && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="card p-4">
              <p className="text-sm text-grappler-300 mb-3">Export your training data</p>
              <div className="flex gap-3">
                <button
                  onClick={handleExportCSV}
                  disabled={workoutLogs.length === 0}
                  className="btn btn-secondary btn-sm flex-1 gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  CSV
                </button>
                <button
                  onClick={handleExportJSON}
                  disabled={workoutLogs.length === 0}
                  className="btn btn-secondary btn-sm flex-1 gap-2"
                >
                  <FileJson className="w-4 h-4" />
                  JSON
                </button>
              </div>
              {workoutLogs.length === 0 && (
                <p className="text-xs text-grappler-500 mt-2 text-center">Complete a workout first to export data</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {historyView === 'log' && <WorkoutHistory />}
      {historyView === 'calendar' && <TrainingCalendar />}
      {historyView === 'weight' && <BodyWeightTracker />}
    </div>
  );
}

// Home Tab Content
function HomeTab({ onNavigate }: { onNavigate: (view: OverlayView) => void }) {
  const { user, gamificationStats, currentMesocycle, workoutLogs, startWorkout } = useAppStore();

  const motivationalMessage = getMotivationalMessage(gamificationStats);
  const progress = levelProgress(gamificationStats.totalPoints);
  const pointsNeeded = pointsToNextLevel(gamificationStats.totalPoints);

  // Deload detection
  const deloadCheck = workoutLogs.length >= 3 ? shouldDeload(workoutLogs.slice(-5)) : null;

  // Get next workout
  const getNextWorkout = () => {
    if (!currentMesocycle) return null;

    // Find current week (simplified - would need proper date logic in production)
    const currentWeek = currentMesocycle.weeks[0];
    const nextSession = currentWeek.sessions[0];

    return nextSession;
  };

  const nextWorkout = getNextWorkout();

  // Quick workout handler
  const handleQuickWorkout = () => {
    if (!user) return;
    const quickSession = generateQuickWorkout(user.equipment, 30, user.goalFocus);
    startWorkout(quickSession);
  };

  return (
    <div className="space-y-6">
      {/* Deload Alert */}
      {deloadCheck && deloadCheck.needed && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-orange-300 text-sm">Deload Recommended</h3>
              <p className="text-xs text-orange-400/80 mt-1">{deloadCheck.reason}</p>
              <p className="text-xs text-grappler-400 mt-2">
                Consider reducing volume by 40-50% this week for recovery.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Welcome Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-grappler-50">
              Welcome back, {user?.name || 'Athlete'}!
            </h2>
            <p className="text-grappler-400 text-sm mt-1">{motivationalMessage}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary-400">
              Lvl {gamificationStats.level}
            </p>
            <p className="text-xs text-grappler-400">
              {getLevelTitle(gamificationStats.level)}
            </p>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-xs text-grappler-400 mb-1">
            <span>{formatNumber(gamificationStats.totalPoints)} XP</span>
            <span>{formatNumber(pointsNeeded)} to next level</span>
          </div>
          <div className="progress-bar">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, delay: 0.3 }}
              className="progress-bar-fill bg-gradient-to-r from-primary-500 to-accent-500"
            />
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            icon: Flame,
            value: gamificationStats.currentStreak,
            label: 'Day Streak',
            color: 'text-orange-500',
          },
          {
            icon: Trophy,
            value: gamificationStats.personalRecords,
            label: 'PRs Hit',
            color: 'text-yellow-500',
          },
          {
            icon: Target,
            value: gamificationStats.totalWorkouts,
            label: 'Workouts',
            color: 'text-green-500',
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
            className="stat-card items-center text-center"
          >
            <stat.icon className={cn('w-5 h-5 mb-1', stat.color)} />
            <p className="stat-value">{stat.value}</p>
            <p className="stat-label">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Workout Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {/* Next Workout */}
        {nextWorkout && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card p-4"
          >
            <p className="text-xs text-grappler-400 mb-1">Next Workout</p>
            <h3 className="text-sm font-bold text-grappler-50 mb-1 truncate">
              {nextWorkout.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-grappler-400 mb-3">
              <span className="flex items-center gap-1">
                <Dumbbell className="w-3 h-3" />
                {nextWorkout.exercises.length}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                ~{nextWorkout.estimatedDuration}m
              </span>
            </div>
            <button
              onClick={() => startWorkout(nextWorkout)}
              className="btn btn-primary btn-sm w-full gap-1"
            >
              <Play className="w-4 h-4" />
              Start
            </button>
          </motion.div>
        )}

        {/* Quick Workout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card p-4"
        >
          <p className="text-xs text-grappler-400 mb-1">Quick Session</p>
          <h3 className="text-sm font-bold text-grappler-50 mb-1">30-Min Blast</h3>
          <div className="flex items-center gap-2 text-xs text-grappler-400 mb-3">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              4 compounds
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              ~30m
            </span>
          </div>
          <button
            onClick={handleQuickWorkout}
            className="btn btn-secondary btn-sm w-full gap-1"
          >
            <Zap className="w-4 h-4" />
            Quick Start
          </button>
        </motion.div>
      </div>

      {/* Tools & Features Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38 }}
      >
        <h3 className="font-bold text-grappler-50 mb-3">Tools</h3>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Brain, label: 'AI Coach', view: 'coach' as OverlayView, color: 'text-primary-400 bg-primary-500/20' },
            { icon: Activity, label: 'Whoop', view: 'wearable' as OverlayView, color: 'text-green-400 bg-green-500/20' },
            { icon: Apple, label: 'Nutrition', view: 'nutrition' as OverlayView, color: 'text-red-400 bg-red-500/20' },
            { icon: Trophy, label: 'Comp Prep', view: 'competition' as OverlayView, color: 'text-yellow-400 bg-yellow-500/20' },
            { icon: Leaf, label: 'Mobility', view: 'mobility' as OverlayView, color: 'text-emerald-400 bg-emerald-500/20' },
            { icon: Crosshair, label: 'Profiler', view: 'profiler' as OverlayView, color: 'text-purple-400 bg-purple-500/20' },
            { icon: Scaling, label: 'Strength', view: 'strength' as OverlayView, color: 'text-orange-400 bg-orange-500/20' },
            { icon: Dumbbell, label: 'Builder', view: 'builder' as OverlayView, color: 'text-accent-400 bg-accent-500/20' },
            { icon: Calendar, label: 'Periodize', view: 'periodization' as OverlayView, color: 'text-sky-400 bg-sky-500/20' },
            { icon: HeartPulse, label: 'Recovery', view: 'recovery' as OverlayView, color: 'text-pink-400 bg-pink-500/20' },
            { icon: Siren, label: 'Injuries', view: 'injury' as OverlayView, color: 'text-rose-400 bg-rose-500/20' },
            { icon: TrendingUp, label: 'Overload', view: 'overload' as OverlayView, color: 'text-cyan-400 bg-cyan-500/20' },
            { icon: ListPlus, label: 'Custom Ex', view: 'custom_exercise' as OverlayView, color: 'text-indigo-400 bg-indigo-500/20' },
            { icon: Calculator, label: '1RM Calc', view: 'one_rm' as OverlayView, color: 'text-amber-400 bg-amber-500/20' },
            { icon: HeartPulse, label: 'HR Zones', view: 'hr_zones' as OverlayView, color: 'text-red-400 bg-red-500/20' },
            { icon: Layers, label: 'Templates', view: 'templates' as OverlayView, color: 'text-teal-400 bg-teal-500/20' },
            { icon: LayoutGrid, label: 'Vol Map', view: 'volume_map' as OverlayView, color: 'text-fuchsia-400 bg-fuchsia-500/20' },
            { icon: Shield, label: 'Grappling', view: 'grappling' as OverlayView, color: 'text-lime-400 bg-lime-500/20' },
          ].map((tool) => (
            <button
              key={tool.label}
              onClick={() => onNavigate(tool.view)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-grappler-800/60 hover:bg-grappler-700/60 transition-colors"
            >
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', tool.color)}>
                <tool.icon className="w-4.5 h-4.5" />
              </div>
              <span className="text-[10px] font-medium text-grappler-300">{tool.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity */}
      {workoutLogs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card p-6"
        >
          <h3 className="font-bold text-grappler-50 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {workoutLogs.slice(-3).reverse().map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between py-2 border-b border-grappler-700 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-grappler-700 rounded-lg flex items-center justify-center">
                    <Dumbbell className="w-5 h-5 text-grappler-400" />
                  </div>
                  <div>
                    <p className="font-medium text-grappler-200 text-sm">
                      {log.exercises.length} exercises completed
                    </p>
                    <p className="text-xs text-grappler-500">
                      {formatDate(log.date)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-grappler-200">
                    {formatNumber(log.totalVolume)} {user?.weightUnit || 'lbs'}
                  </p>
                  <p className="text-xs text-grappler-500">{log.duration} min</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Badges Preview */}
      {gamificationStats.badges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-grappler-50">Recent Badges</h3>
            <span className="text-sm text-grappler-400">
              {gamificationStats.badges.length} earned
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar py-2">
            {gamificationStats.badges.slice(-5).map((userBadge) => (
              <div
                key={userBadge.id}
                className="flex-shrink-0 w-16 text-center"
              >
                <div className="w-14 h-14 bg-grappler-700 rounded-xl flex items-center justify-center mx-auto mb-1 text-2xl">
                  {userBadge.badge.icon}
                </div>
                <p className="text-xs text-grappler-400 truncate">
                  {userBadge.badge.name}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Current Mesocycle Info */}
      {currentMesocycle && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-grappler-400">Current Block</p>
              <h3 className="font-bold text-grappler-50">{currentMesocycle.name}</h3>
              <p className="text-sm text-grappler-400 mt-1">
                {currentMesocycle.weeks.length} weeks • {currentMesocycle.goalFocus} focus
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-grappler-500" />
          </div>
        </motion.div>
      )}
    </div>
  );
}
