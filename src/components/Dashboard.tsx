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

// Rest day tips by training identity / sport
function getRestDayTip(identity?: string, sport?: string): { tip: string; category: string } {
  const combatTips = [
    { tip: 'Do 10 min of light flow rolling or shadow work to keep your movement patterns sharp.', category: 'Active Recovery' },
    { tip: 'Spend 15 min on hip openers and thoracic spine mobility — your guard game will thank you.', category: 'Mobility' },
    { tip: 'Foam roll your lats, hip flexors, and calves for 10 min to speed up recovery.', category: 'Soft Tissue' },
    { tip: 'Practice breathing drills: 4-7-8 pattern for 5 min to lower cortisol and improve recovery.', category: 'Recovery' },
    { tip: 'Light grip work with a stress ball or rice bucket — maintains grip endurance without fatigue.', category: 'Maintenance' },
    { tip: 'Cold exposure (2-3 min cold shower) can reduce inflammation from training.', category: 'Recovery' },
  ];
  const strikingTips = [
    { tip: 'Shadow box at 30% intensity for 10 min — keep your timing sharp without loading the body.', category: 'Active Recovery' },
    { tip: 'Focus on shoulder and hip mobility today. Strikers lose rotation range faster than you think.', category: 'Mobility' },
    { tip: 'Foam roll your hip flexors, calves, and forearms for faster recovery between sessions.', category: 'Soft Tissue' },
  ];
  const generalTips = [
    { tip: 'A 20-min walk keeps blood flowing to recovering muscles without adding stress.', category: 'Active Recovery' },
    { tip: 'Stretch your hip flexors and chest — sitting all day tightens what lifting already loads.', category: 'Mobility' },
    { tip: 'Prioritize 7-9 hours of sleep tonight. Growth hormone peaks during deep sleep.', category: 'Recovery' },
    { tip: 'Hydrate well — aim for at least half your bodyweight (lbs) in ounces of water.', category: 'Nutrition' },
    { tip: 'Foam roll major muscle groups for 10 min — it reduces next-day soreness significantly.', category: 'Soft Tissue' },
  ];

  if (identity === 'combat') {
    const pool = sport === 'striking' ? [...combatTips, ...strikingTips] : combatTips;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return generalTips[Math.floor(Math.random() * generalTips.length)];
}

// Home Tab Content
function HomeTab({ onNavigate }: { onNavigate: (view: OverlayView) => void }) {
  const {
    user, gamificationStats, currentMesocycle, workoutLogs, startWorkout,
    lastCompletedWorkout, dismissWorkoutSummary, generateNewMesocycle
  } = useAppStore();
  const [showMoreTools, setShowMoreTools] = useState(false);

  const motivationalMessage = getMotivationalMessage(gamificationStats);
  const progress = levelProgress(gamificationStats.totalPoints);
  const pointsNeeded = pointsToNextLevel(gamificationStats.totalPoints);
  const weightUnit = user?.weightUnit || 'lbs';

  // Deload detection
  const deloadCheck = workoutLogs.length >= 3 ? shouldDeload(workoutLogs.slice(-5)) : null;

  // Get next workout — find the first uncompleted session in the mesocycle
  const getNextWorkout = () => {
    if (!currentMesocycle) return null;

    const completedSessionIds = new Set(
      workoutLogs
        .filter(log => log.mesocycleId === currentMesocycle.id)
        .map(log => log.sessionId)
    );

    for (const week of currentMesocycle.weeks) {
      for (const session of week.sessions) {
        if (!completedSessionIds.has(session.id)) {
          return { session, weekNumber: week.weekNumber, isDeload: week.isDeload };
        }
      }
    }
    return null;
  };

  const nextWorkoutInfo = getNextWorkout();
  const nextWorkout = nextWorkoutInfo?.session ?? null;

  // Mesocycle progress calculation
  const mesocycleProgress = (() => {
    if (!currentMesocycle) return null;
    const totalSessions = currentMesocycle.weeks.reduce((sum, w) => sum + w.sessions.length, 0);
    const completedSessionIds = new Set(
      workoutLogs
        .filter(log => log.mesocycleId === currentMesocycle.id)
        .map(log => log.sessionId)
    );
    const completedCount = currentMesocycle.weeks.reduce((sum, w) =>
      sum + w.sessions.filter(s => completedSessionIds.has(s.id)).length, 0
    );
    return { total: totalSessions, completed: completedCount, percent: totalSessions > 0 ? Math.round((completedCount / totalSessions) * 100) : 0 };
  })();

  // Weekly consistency: how many days this week had a workout
  const weeklyConsistency = (() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const daysThisWeek = new Set(
      workoutLogs
        .filter(log => new Date(log.date) >= startOfWeek)
        .map(log => new Date(log.date).toDateString())
    );
    return { done: daysThisWeek.size, target: user?.sessionsPerWeek || 3 };
  })();

  // Training load warning for combat athletes
  const trainingLoadWarning = (() => {
    if (user?.trainingIdentity !== 'combat') return null;
    const last7Days = workoutLogs.filter(log => {
      const diff = (Date.now() - new Date(log.date).getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 7;
    });
    const avgRPE = last7Days.length > 0
      ? last7Days.reduce((sum, l) => sum + (l.overallRPE || 7), 0) / last7Days.length
      : 0;
    const highVolumeDays = last7Days.filter(l => l.totalVolume > 15000).length;

    if (avgRPE >= 9 && last7Days.length >= 3) {
      return 'High average RPE this week. Consider lighter lifting before your next mat session.';
    }
    if (highVolumeDays >= 3) {
      return 'Heavy lifting volume this week — watch for accumulated fatigue on the mats.';
    }
    if (last7Days.length >= (user?.sessionsPerWeek || 3) + 1) {
      return 'More lifting sessions than planned this week. Make sure you have enough recovery for sport training.';
    }
    return null;
  })();

  // Check if today is a rest day (no workout logged today)
  const todayStr = new Date().toDateString();
  const isRestDay = !workoutLogs.some(log => new Date(log.date).toDateString() === todayStr) && !nextWorkoutInfo;
  const restDayTip = isRestDay ? getRestDayTip(user?.trainingIdentity, user?.combatSport) : null;

  // Estimated 1RM trends for key lifts
  const e1rmTrends = (() => {
    const keyLifts = ['barbell-back-squat', 'conventional-deadlift', 'barbell-bench-press', 'overhead-press'];
    const trends: { name: string; current: number; previous: number; exerciseId: string }[] = [];

    for (const liftId of keyLifts) {
      const logsWithLift = workoutLogs
        .filter(log => log.exercises.some(ex => ex.exerciseId === liftId))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (logsWithLift.length >= 1) {
        const getE1rm = (log: WorkoutLog) => {
          const ex = log.exercises.find(e => e.exerciseId === liftId);
          if (!ex) return 0;
          const bestSet = ex.sets.filter(s => s.completed).sort((a, b) => {
            const a1rm = a.weight / (1.0278 - 0.0278 * a.reps);
            const b1rm = b.weight / (1.0278 - 0.0278 * b.reps);
            return b1rm - a1rm;
          })[0];
          if (!bestSet || bestSet.weight === 0) return 0;
          return bestSet.reps === 1 ? bestSet.weight : Math.round(bestSet.weight / (1.0278 - 0.0278 * bestSet.reps));
        };

        const current = getE1rm(logsWithLift[0]);
        const previous = logsWithLift.length >= 2 ? getE1rm(logsWithLift[1]) : current;
        if (current > 0) {
          const name = liftId.replace(/^barbell-|^conventional-/g, '').replace(/-/g, ' ');
          trends.push({ name: name.charAt(0).toUpperCase() + name.slice(1), current, previous, exerciseId: liftId });
        }
      }
    }
    return trends;
  })();

  // Quick workout handler
  const handleQuickWorkout = () => {
    if (!user) return;
    const quickSession = generateQuickWorkout(user.equipment, 30, user.goalFocus, user.availableEquipment, user.trainingIdentity);
    startWorkout(quickSession);
  };

  // Handle mesocycle completion — auto-generate next
  const handleGenerateNext = () => {
    generateNewMesocycle();
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
      {/* Post-Workout Summary Card */}
      <AnimatePresence>
        {lastCompletedWorkout && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/30 rounded-2xl p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="font-bold text-green-300 text-sm">Workout Complete!</h3>
                  <p className="text-xs text-green-400/70">+{lastCompletedWorkout.points} XP earned</p>
                </div>
              </div>
              <button
                onClick={dismissWorkoutSummary}
                className="text-grappler-500 hover:text-grappler-300 text-xs px-2 py-1"
              >
                Dismiss
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="text-center">
                <p className="text-lg font-bold text-grappler-100">{lastCompletedWorkout.log.exercises.length}</p>
                <p className="text-[10px] text-grappler-400">Exercises</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-grappler-100">{formatNumber(lastCompletedWorkout.log.totalVolume)}</p>
                <p className="text-[10px] text-grappler-400">Volume ({weightUnit})</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-grappler-100">{lastCompletedWorkout.log.duration}m</p>
                <p className="text-[10px] text-grappler-400">Duration</p>
              </div>
            </div>
            {lastCompletedWorkout.hadPR && (
              <div className="mt-3 flex items-center gap-2 bg-yellow-500/10 rounded-lg px-3 py-2">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-medium text-yellow-300">New Personal Record!</span>
              </div>
            )}
            <div className="mt-3 flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-grappler-300">{lastCompletedWorkout.newStreak} day streak</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Training Load Warning for Combat Athletes */}
      {trainingLoadWarning && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-300 text-sm">Training Load</h3>
              <p className="text-xs text-amber-400/80 mt-1">{trainingLoadWarning}</p>
            </div>
          </div>
        </motion.div>
      )}

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
                <p className="text-xs text-white/70 font-medium uppercase tracking-wide">
                  {nextWorkoutInfo ? `Week ${nextWorkoutInfo.weekNumber}${nextWorkoutInfo.isDeload ? ' · Deload' : ''}` : 'Next Workout'}
                </p>
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
      ) : currentMesocycle && mesocycleProgress && mesocycleProgress.completed === mesocycleProgress.total ? (
        /* Mesocycle Complete — Prompt to generate next */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-5 text-center bg-gradient-to-br from-primary-500/10 to-accent-500/10 border border-primary-500/20"
        >
          <Trophy className="w-10 h-10 text-primary-400 mx-auto mb-2" />
          <h3 className="font-bold text-grappler-100 text-sm">Block Complete!</h3>
          <p className="text-xs text-grappler-400 mt-1 mb-4">
            You finished all {mesocycleProgress.total} sessions in {currentMesocycle.name}.
          </p>
          <button
            onClick={handleGenerateNext}
            className="btn btn-primary btn-md gap-2"
          >
            <Zap className="w-4 h-4" />
            Generate Next Block
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

      {/* Mesocycle Progress Bar */}
      {mesocycleProgress && currentMesocycle && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-grappler-200 flex items-center gap-2">
              <Target className="w-4 h-4 text-primary-400" />
              {currentMesocycle.name}
            </h3>
            <span className="text-xs text-grappler-400">{mesocycleProgress.completed}/{mesocycleProgress.total} sessions</span>
          </div>
          <div className="w-full h-2.5 bg-grappler-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${mesocycleProgress.percent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
            />
          </div>
          <p className="text-[10px] text-grappler-500 mt-1.5">{mesocycleProgress.percent}% complete</p>
        </div>
      )}

      {/* Weekly Consistency + Stats Row */}
      <div className="grid grid-cols-4 gap-2.5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="stat-card items-center text-center"
        >
          <BarChart3 className="w-5 h-5 mb-1 text-primary-400" />
          <p className="stat-value">{weeklyConsistency.done}/{weeklyConsistency.target}</p>
          <p className="stat-label">This Week</p>
        </motion.div>
        {[
          { icon: Flame, value: gamificationStats.currentStreak, label: 'Streak', color: 'text-orange-500' },
          { icon: Trophy, value: gamificationStats.personalRecords, label: 'PRs', color: 'text-yellow-500' },
          { icon: Target, value: gamificationStats.totalWorkouts, label: 'Workouts', color: 'text-green-500' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * (i + 1) }}
            className="stat-card items-center text-center"
          >
            <stat.icon className={cn('w-5 h-5 mb-1', stat.color)} />
            <p className="stat-value">{stat.value}</p>
            <p className="stat-label">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Estimated 1RM Trends */}
      {e1rmTrends.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-grappler-200 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent-400" />
            Estimated 1RM
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {e1rmTrends.map((lift) => {
              const diff = lift.current - lift.previous;
              const isUp = diff > 0;
              return (
                <div key={lift.exerciseId} className="flex items-center justify-between bg-grappler-800/50 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-xs text-grappler-400 capitalize">{lift.name}</p>
                    <p className="text-sm font-bold text-grappler-100">{lift.current} {weightUnit}</p>
                  </div>
                  {diff !== 0 && (
                    <span className={cn('text-xs font-medium', isUp ? 'text-green-400' : 'text-red-400')}>
                      {isUp ? '+' : ''}{diff}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rest Day Tip */}
      {restDayTip && (
        <div className="card p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Leaf className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-emerald-400 font-medium uppercase tracking-wide">{restDayTip.category}</p>
              <p className="text-sm text-grappler-300 mt-1">{restDayTip.tip}</p>
            </div>
          </div>
        </div>
      )}

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
