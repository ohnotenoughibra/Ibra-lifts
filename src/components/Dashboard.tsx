'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
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
import type { WorkoutLog } from '@/lib/types';
import { getMotivationalMessage, getLevelTitle, levelProgress, pointsToNextLevel } from '@/lib/gamification';
import { shouldDeload } from '@/lib/auto-adjust';
import { generateQuickWorkout } from '@/lib/workout-generator';
import { exportToCSV, exportToJSON, downloadFile, exportFullBackup, importFullBackup, readFileAsText } from '@/lib/data-export';
// Core tabs — always loaded
import WorkoutView from './WorkoutView';
import ProgressCharts from './ProgressCharts';
import KnowledgeHub from './KnowledgeHub';
import ProfileSettings from './ProfileSettings';
import ActiveWorkout from './ActiveWorkout';
import WorkoutHistory from './WorkoutHistory';
import TrainingCalendar from './TrainingCalendar';
import ThemeToggle from './ThemeToggle';

// Overlay components — lazy-loaded (only when opened)
function OverlaySkeleton() {
  return (
    <div className="min-h-screen bg-grappler-950 animate-pulse">
      <div className="sticky top-0 z-10 bg-grappler-950/95 border-b border-grappler-800 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-grappler-800" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-40 bg-grappler-800 rounded" />
          <div className="h-3 w-56 bg-grappler-800/60 rounded" />
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div className="h-32 bg-grappler-800/50 rounded-xl" />
        <div className="h-24 bg-grappler-800/50 rounded-xl" />
        <div className="h-24 bg-grappler-800/50 rounded-xl" />
      </div>
    </div>
  );
}

const BodyWeightTracker = dynamic(() => import('./BodyWeightTracker'), { loading: () => <OverlaySkeleton /> });
const WorkoutBuilder = dynamic(() => import('./WorkoutBuilder'), { loading: () => <OverlaySkeleton /> });
const NutritionTracker = dynamic(() => import('./NutritionTracker'), { loading: () => <OverlaySkeleton /> });
const WearableIntegration = dynamic(() => import('./WearableIntegration'), { loading: () => <OverlaySkeleton /> });
const CompetitionPrep = dynamic(() => import('./CompetitionPrep'), { loading: () => <OverlaySkeleton /> });
const MobilityWorkouts = dynamic(() => import('./MobilityWorkouts'), { loading: () => <OverlaySkeleton /> });
const WeeklyCoach = dynamic(() => import('./WeeklyCoach'), { loading: () => <OverlaySkeleton /> });
const ExerciseProfiler = dynamic(() => import('./ExerciseProfiler'), { loading: () => <OverlaySkeleton /> });
const StrengthAnalysis = dynamic(() => import('./StrengthAnalysis'), { loading: () => <OverlaySkeleton /> });
const PeriodizationCalendar = dynamic(() => import('./PeriodizationCalendar'), { loading: () => <OverlaySkeleton /> });
const RecoveryDashboard = dynamic(() => import('./RecoveryDashboard'), { loading: () => <OverlaySkeleton /> });
const InjuryLogger = dynamic(() => import('./InjuryLogger'), { loading: () => <OverlaySkeleton /> });
const ProgressiveOverload = dynamic(() => import('./ProgressiveOverload'), { loading: () => <OverlaySkeleton /> });
const CustomExerciseCreator = dynamic(() => import('./CustomExerciseCreator'), { loading: () => <OverlaySkeleton /> });
const OneRepMaxCalc = dynamic(() => import('./OneRepMaxCalc'), { loading: () => <OverlaySkeleton /> });
const HRZoneTraining = dynamic(() => import('./HRZoneTraining'), { loading: () => <OverlaySkeleton /> });
const SessionTemplates = dynamic(() => import('./SessionTemplates'), { loading: () => <OverlaySkeleton /> });
const VolumeHeatMap = dynamic(() => import('./VolumeHeatMap'), { loading: () => <OverlaySkeleton /> });
const GrapplingTracker = dynamic(() => import('./GrapplingTracker'), { loading: () => <OverlaySkeleton /> });

type TabType = 'home' | 'program' | 'progress' | 'history' | 'learn' | 'profile';
type OverlayView = 'builder' | 'nutrition' | 'wearable' | 'competition' | 'mobility' | 'coach' | 'profiler' | 'strength' | 'periodization' | 'recovery' | 'injury' | 'overload' | 'custom_exercise' | 'one_rm' | 'hr_zones' | 'templates' | 'volume_map' | 'grappling' | null;

function StreakHeatmap({ workoutLogs }: { workoutLogs: WorkoutLog[] }) {
  const weeks = 12;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build a Set of workout date strings
  const workoutDates = new Set(
    workoutLogs.map(log => {
      const d = new Date(log.date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })
  );

  // Generate grid: 12 weeks x 7 days
  const grid: { date: Date; hasWorkout: boolean; isToday: boolean; isFuture: boolean }[][] = [];
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (weeks * 7 - 1) - startDate.getDay());

  for (let w = 0; w < weeks; w++) {
    const week: typeof grid[0] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + w * 7 + d);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const isFuture = date > today;
      week.push({
        date,
        hasWorkout: workoutDates.has(dateStr),
        isToday: date.getTime() === today.getTime(),
        isFuture,
      });
    }
    grid.push(week);
  }

  // Calculate current streak
  let streak = 0;
  const checkDate = new Date(today);
  while (true) {
    const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
    if (workoutDates.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-grappler-200 uppercase tracking-wide flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" />
          Training Streak
        </h3>
        <div className="flex items-center gap-1.5">
          <span className="text-2xl font-black text-orange-400">{streak}</span>
          <span className="text-xs text-grappler-400">day{streak !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div className="flex gap-[3px]">
        {grid.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day, di) => (
              <div
                key={di}
                className={cn(
                  'w-3 h-3 rounded-sm transition-colors',
                  day.isFuture
                    ? 'bg-grappler-800/30'
                    : day.hasWorkout
                      ? 'bg-green-500'
                      : 'bg-grappler-700/40',
                  day.isToday && 'ring-1 ring-primary-400'
                )}
                title={`${day.date.toLocaleDateString()}${day.hasWorkout ? ' \u2014 trained' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-grappler-500">{weeks * 7} days</span>
        <div className="flex items-center gap-1 text-[10px] text-grappler-500">
          <span>Less</span>
          <div className="w-2.5 h-2.5 rounded-sm bg-grappler-700/40" />
          <div className="w-2.5 h-2.5 rounded-sm bg-green-500/40" />
          <div className="w-2.5 h-2.5 rounded-sm bg-green-500/70" />
          <div className="w-2.5 h-2.5 rounded-sm bg-green-500" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

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

// History Tab - combines workout history, calendar, body weight, and data export/import
function HistoryTab() {
  const { workoutLogs, user } = useAppStore();
  const [historyView, setHistoryView] = useState<'log' | 'calendar' | 'weight'>('log');
  const [showExport, setShowExport] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmImport, setConfirmImport] = useState(false);
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

  const handleExportBackup = () => {
    const backup = exportFullBackup();
    const date = new Date().toISOString().split('T')[0];
    downloadFile(backup, `grappler-gains-backup-${date}.json`, 'application/json');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await readFileAsText(file);
      const result = importFullBackup(text);

      if (result.success) {
        setImportStatus({
          type: 'success',
          message: `Restored ${result.stats?.workouts ?? 0} workouts, ${result.stats?.templates ?? 0} templates`
        });
      } else {
        setImportStatus({ type: 'error', message: result.error || 'Import failed' });
      }
    } catch {
      setImportStatus({ type: 'error', message: 'Could not read file' });
    }

    // Reset file input so the same file can be re-selected
    e.target.value = '';
    setConfirmImport(false);
    setTimeout(() => setImportStatus(null), 5000);
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
          title="Export / Import Data"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Import status toast */}
      <AnimatePresence>
        {importStatus && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              'rounded-xl px-4 py-3 text-sm font-medium',
              importStatus.type === 'success'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            )}
          >
            {importStatus.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export / Import options */}
      <AnimatePresence>
        {showExport && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="card p-4 space-y-4">
              {/* Export section */}
              <div>
                <p className="text-sm text-grappler-300 mb-2 font-medium">Export workout logs</p>
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

              {/* Full backup section */}
              <div className="border-t border-grappler-700 pt-4">
                <p className="text-sm text-grappler-300 mb-1 font-medium">Full backup</p>
                <p className="text-xs text-grappler-500 mb-3">Export everything — workouts, programs, templates, nutrition, settings. Use this to transfer data to another device or keep a backup.</p>
                <div className="flex gap-3">
                  <button
                    onClick={handleExportBackup}
                    className="btn btn-secondary btn-sm flex-1 gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Backup
                  </button>
                </div>
              </div>

              {/* Import section */}
              <div className="border-t border-grappler-700 pt-4">
                <p className="text-sm text-grappler-300 mb-1 font-medium">Restore from backup</p>
                <p className="text-xs text-grappler-500 mb-3">Import a backup file to restore your data. This will overwrite your current data.</p>
                {!confirmImport ? (
                  <button
                    onClick={() => setConfirmImport(true)}
                    className="btn btn-sm w-full gap-2 bg-grappler-700 text-grappler-200 hover:bg-grappler-600"
                  >
                    <FileJson className="w-4 h-4" />
                    Import Backup File
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
                      This will replace all your current data. Make sure to download a backup first.
                    </p>
                    <label className="btn btn-primary btn-sm w-full gap-2 cursor-pointer">
                      <FileJson className="w-4 h-4" />
                      Choose File
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportFile}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={() => setConfirmImport(false)}
                      className="btn btn-sm w-full bg-grappler-700 text-grappler-400 hover:bg-grappler-600"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
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
  const [showMoreTools, setShowMoreTools] = useState(false);

  const motivationalMessage = getMotivationalMessage(gamificationStats);
  const progress = levelProgress(gamificationStats.totalPoints);
  const pointsNeeded = pointsToNextLevel(gamificationStats.totalPoints);

  // Deload detection
  const deloadCheck = workoutLogs.length >= 3 ? shouldDeload(workoutLogs.slice(-5)) : null;

  // Get next workout
  const getNextWorkout = () => {
    if (!currentMesocycle) return null;
    const currentWeek = currentMesocycle.weeks[0];
    const nextSession = currentWeek.sessions[0];
    return nextSession;
  };

  const nextWorkout = getNextWorkout();

  // Quick workout handler
  const handleQuickWorkout = () => {
    if (!user) return;
    const quickSession = generateQuickWorkout(user.equipment, 30, user.goalFocus, user.availableEquipment);
    startWorkout(quickSession);
  };

  // Tools split into featured (top 4) and more
  const featuredTools = [
    { icon: Brain, label: 'AI Coach', view: 'coach' as OverlayView, color: 'text-primary-400 bg-primary-500/20' },
    { icon: Apple, label: 'Nutrition', view: 'nutrition' as OverlayView, color: 'text-red-400 bg-red-500/20' },
    { icon: Leaf, label: 'Mobility', view: 'mobility' as OverlayView, color: 'text-emerald-400 bg-emerald-500/20' },
    { icon: Activity, label: 'Whoop', view: 'wearable' as OverlayView, color: 'text-green-400 bg-green-500/20' },
  ];
  const moreTools = [
    { icon: Trophy, label: 'Comp Prep', view: 'competition' as OverlayView, color: 'text-yellow-400 bg-yellow-500/20' },
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
  ];

  const ToolButton = ({ tool }: { tool: typeof featuredTools[0] }) => (
    <button
      onClick={() => onNavigate(tool.view)}
      className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-grappler-800/60 hover:bg-grappler-700/60 transition-colors"
    >
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', tool.color)}>
        <tool.icon className="w-4.5 h-4.5" />
      </div>
      <span className="text-[10px] font-medium text-grappler-300">{tool.label}</span>
    </button>
  );

  return (
    <div className="space-y-5">
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
            </div>
          </div>
        </motion.div>
      )}

      {/* Hero: Start Next Workout */}
      {nextWorkout ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={() => startWorkout(nextWorkout)}
            className="w-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl p-5 text-left active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/70 font-medium uppercase tracking-wide">Next Workout</p>
                <h2 className="text-xl font-black text-white mt-1">{nextWorkout.name}</h2>
                <div className="flex items-center gap-3 mt-2 text-sm text-white/80">
                  <span className="flex items-center gap-1">
                    <Dumbbell className="w-3.5 h-3.5" />
                    {nextWorkout.exercises.length} exercises
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    ~{nextWorkout.estimatedDuration}m
                  </span>
                </div>
              </div>
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <Play className="w-7 h-7 text-white" />
              </div>
            </div>
          </button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-5 text-center"
        >
          <Dumbbell className="w-10 h-10 text-grappler-600 mx-auto mb-2" />
          <p className="text-sm text-grappler-400 mb-3">No program yet — generate one to get started</p>
          <button
            onClick={handleQuickWorkout}
            className="btn btn-primary btn-md gap-2"
          >
            <Zap className="w-4 h-4" />
            Quick 30-Min Workout
          </button>
        </motion.div>
      )}

      {/* Quick Workout (secondary, only if next workout exists) */}
      {nextWorkout && (
        <button
          onClick={handleQuickWorkout}
          className="w-full card p-3.5 flex items-center gap-3 hover:bg-grappler-700/50 transition-colors"
        >
          <div className="w-10 h-10 bg-accent-500/20 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-accent-400" />
          </div>
          <div className="text-left flex-1">
            <p className="font-medium text-grappler-100 text-sm">Quick 30-Min Workout</p>
            <p className="text-xs text-grappler-500">4 compound exercises</p>
          </div>
          <ChevronRight className="w-4 h-4 text-grappler-500" />
        </button>
      )}

      {/* Compact Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Flame, value: gamificationStats.currentStreak, label: 'Streak', color: 'text-orange-500' },
          { icon: Trophy, value: gamificationStats.personalRecords, label: 'PRs', color: 'text-yellow-500' },
          { icon: Target, value: gamificationStats.totalWorkouts, label: 'Workouts', color: 'text-green-500' },
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

      {/* Training Streak Heatmap */}
      <StreakHeatmap workoutLogs={workoutLogs} />

      {/* Featured Tools (4) + expandable More */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="grid grid-cols-4 gap-2">
          {featuredTools.map((tool) => (
            <ToolButton key={tool.label} tool={tool} />
          ))}
        </div>

        {/* More Tools toggle */}
        <button
          onClick={() => setShowMoreTools(!showMoreTools)}
          className="w-full mt-2 py-2 flex items-center justify-center gap-1 text-xs text-grappler-500 hover:text-grappler-300 transition-colors"
        >
          {showMoreTools ? 'Show Less' : `More Tools (${moreTools.length})`}
          <ChevronRight className={cn('w-3 h-3 transition-transform', showMoreTools && 'rotate-90')} />
        </button>

        <AnimatePresence>
          {showMoreTools && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-4 gap-2 pt-1">
                {moreTools.map((tool) => (
                  <ToolButton key={tool.label} tool={tool} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Recent Activity (compact) */}
      {workoutLogs.length > 0 && (
        <div className="card p-4">
          <h3 className="font-semibold text-grappler-100 text-sm mb-3">Recent</h3>
          <div className="space-y-2">
            {workoutLogs.slice(-3).reverse().map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between py-1.5"
              >
                <div className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-grappler-500" />
                  <span className="text-sm text-grappler-300">{log.exercises.length} exercises</span>
                  <span className="text-xs text-grappler-500">{formatDate(log.date)}</span>
                </div>
                <span className="text-xs text-grappler-400">{log.duration}m</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Block Info (compact) */}
      {currentMesocycle && (
        <div className="card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-grappler-500">Current Block</p>
            <p className="font-medium text-grappler-100 text-sm">{currentMesocycle.name}</p>
          </div>
          <span className="text-xs text-grappler-400">
            {currentMesocycle.weeks.length}w • {currentMesocycle.goalFocus}
          </span>
        </div>
      )}
    </div>
  );
}
