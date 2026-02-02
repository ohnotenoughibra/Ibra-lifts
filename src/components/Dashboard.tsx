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
  Clock
} from 'lucide-react';
import { cn, formatNumber, formatDate } from '@/lib/utils';
import { getMotivationalMessage, getLevelTitle, levelProgress, pointsToNextLevel } from '@/lib/gamification';
import WorkoutView from './WorkoutView';
import ProgressCharts from './ProgressCharts';
import KnowledgeHub from './KnowledgeHub';
import ProfileSettings from './ProfileSettings';
import ActiveWorkout from './ActiveWorkout';

type TabType = 'home' | 'program' | 'progress' | 'learn' | 'profile';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const { user, gamificationStats, currentMesocycle, activeWorkout, workoutLogs } = useAppStore();

  if (activeWorkout) {
    return <ActiveWorkout />;
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
              <HomeTab />
            </motion.div>
          )}
          {activeTab === 'program' && (
            <motion.div
              key="program"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <WorkoutView />
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
            { id: 'learn', icon: BookOpen, label: 'Learn' },
            { id: 'profile', icon: User, label: 'Profile' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all',
                activeTab === tab.id
                  ? 'text-primary-400'
                  : 'text-grappler-500 hover:text-grappler-300'
              )}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 w-12 h-0.5 bg-primary-500 rounded-full"
                />
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

// Home Tab Content
function HomeTab() {
  const { user, gamificationStats, currentMesocycle, workoutLogs, startWorkout } = useAppStore();

  const motivationalMessage = getMotivationalMessage(gamificationStats);
  const progress = levelProgress(gamificationStats.totalPoints);
  const pointsNeeded = pointsToNextLevel(gamificationStats.totalPoints);

  // Get next workout
  const getNextWorkout = () => {
    if (!currentMesocycle) return null;

    // Find current week (simplified - would need proper date logic in production)
    const currentWeek = currentMesocycle.weeks[0];
    const nextSession = currentWeek.sessions[0];

    return nextSession;
  };

  const nextWorkout = getNextWorkout();

  return (
    <div className="space-y-6">
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

      {/* Next Workout Card */}
      {nextWorkout && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-grappler-400">Next Workout</p>
              <h3 className="text-lg font-bold text-grappler-50">
                {nextWorkout.name}
              </h3>
            </div>
            <div
              className={cn(
                'px-3 py-1 rounded-full text-sm font-medium',
                nextWorkout.type === 'strength' && 'badge-strength',
                nextWorkout.type === 'hypertrophy' && 'badge-hypertrophy',
                nextWorkout.type === 'power' && 'badge-power'
              )}
            >
              {nextWorkout.type}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-grappler-400 mb-4">
            <span className="flex items-center gap-1">
              <Dumbbell className="w-4 h-4" />
              {nextWorkout.exercises.length} exercises
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              ~{nextWorkout.estimatedDuration} min
            </span>
          </div>

          <button
            onClick={() => startWorkout(nextWorkout)}
            className="btn btn-primary btn-lg w-full gap-2"
          >
            <Play className="w-5 h-5" />
            Start Workout
          </button>
        </motion.div>
      )}

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
            {workoutLogs.slice(-3).reverse().map((log, i) => (
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
                    {formatNumber(log.totalVolume)} lbs
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
