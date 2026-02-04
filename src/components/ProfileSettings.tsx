'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import {
  User,
  Settings,
  Trophy,
  Star,
  Medal,
  LogOut,
  ChevronRight,
  Target,
  Dumbbell,
  Calendar,
  Edit2,
  Save,
  X,
  DoorOpen
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';
import { getLevelTitle, levelProgress, pointsToNextLevel, badges } from '@/lib/gamification';

export default function ProfileSettings() {
  const { user, gamificationStats, baselineLifts, resetStore, setUser } = useAppStore();
  const weightUnit = user?.weightUnit || 'lbs';
  const [showBadges, setShowBadges] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const progress = levelProgress(gamificationStats.totalPoints);
  const pointsNeeded = pointsToNextLevel(gamificationStats.totalPoints);

  const earnedBadgeIds = new Set(gamificationStats.badges.map(b => b.badgeId));

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 text-center"
      >
        <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-xl font-bold text-grappler-50">{user?.name || 'Athlete'}</h2>
        <p className="text-grappler-400 text-sm mb-4">
          Level {gamificationStats.level} {getLevelTitle(gamificationStats.level)}
        </p>

        {/* Level Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-grappler-400 mb-1">
            <span>{formatNumber(gamificationStats.totalPoints)} XP</span>
            <span>{formatNumber(pointsNeeded)} to Level {gamificationStats.level + 1}</span>
          </div>
          <div className="progress-bar">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="progress-bar-fill bg-gradient-to-r from-primary-500 to-accent-500"
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-grappler-800/50 rounded-lg p-3">
            <p className="text-xl font-bold text-grappler-50">{gamificationStats.totalWorkouts}</p>
            <p className="text-xs text-grappler-400">Workouts</p>
          </div>
          <div className="bg-grappler-800/50 rounded-lg p-3">
            <p className="text-xl font-bold text-grappler-50">{gamificationStats.personalRecords}</p>
            <p className="text-xs text-grappler-400">PRs</p>
          </div>
          <div className="bg-grappler-800/50 rounded-lg p-3">
            <p className="text-xl font-bold text-grappler-50">{gamificationStats.badges.length}</p>
            <p className="text-xs text-grappler-400">Badges</p>
          </div>
        </div>
      </motion.div>

      {/* Settings Section */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-grappler-700">
          <h3 className="font-medium text-grappler-200">Profile Settings</h3>
        </div>

        {/* User Info */}
        <div className="divide-y divide-grappler-700">
          <SettingRow
            icon={User}
            label="Name"
            value={user?.name || 'Not set'}
          />
          <SettingRow
            icon={Calendar}
            label="Age"
            value={`${user?.age || 0} years`}
          />
          <SettingRow
            icon={Target}
            label="Goal Focus"
            value={user?.goalFocus || 'Balanced'}
            className="capitalize"
          />
          <SettingRow
            icon={Dumbbell}
            label="Equipment"
            value={user?.equipment?.replace('_', ' ') || 'Full Gym'}
            className="capitalize"
          />
          <SettingRow
            icon={Calendar}
            label="Sessions/Week"
            value={`${user?.sessionsPerWeek || 3} sessions`}
          />
        </div>
      </div>

      {/* Training Day Schedule */}
      {user && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-grappler-700">
            <h3 className="font-medium text-grappler-200">Training Schedule</h3>
            <p className="text-xs text-grappler-500 mt-1">Tap days you plan to lift</p>
          </div>
          <div className="p-4 flex gap-2 justify-between">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => {
              const selected = user.trainingDays?.includes(i) ?? false;
              return (
                <button
                  key={day}
                  onClick={() => {
                    const current = user.trainingDays || [];
                    const next = selected
                      ? current.filter(d => d !== i)
                      : [...current, i].sort();
                    setUser({ ...user, trainingDays: next, updatedAt: new Date() });
                  }}
                  className={cn(
                    'w-10 h-10 rounded-full text-xs font-medium transition-all',
                    selected
                      ? 'bg-primary-500 text-white'
                      : 'bg-grappler-800 text-grappler-500 hover:text-grappler-300'
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Baseline Lifts */}
      {baselineLifts && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-grappler-700">
            <h3 className="font-medium text-grappler-200">Baseline Lifts (1RM)</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4">
            {[
              { label: 'Squat', value: baselineLifts.squat },
              { label: 'Deadlift', value: baselineLifts.deadlift },
              { label: 'Bench Press', value: baselineLifts.benchPress },
              { label: 'OHP', value: baselineLifts.overheadPress },
            ].map((lift) => (
              <div key={lift.label} className="bg-grappler-800/50 rounded-lg p-3">
                <p className="text-xs text-grappler-400 mb-1">{lift.label}</p>
                <p className="text-lg font-bold text-grappler-100">
                  {lift.value ? `${lift.value} ${weightUnit}` : 'Not set'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Badges Section */}
      <button
        onClick={() => setShowBadges(!showBadges)}
        className="w-full card p-4 flex items-center justify-between hover:bg-grappler-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
            <Trophy className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-left">
            <p className="font-medium text-grappler-100">Badges & Achievements</p>
            <p className="text-sm text-grappler-400">
              {gamificationStats.badges.length} earned of {badges.length}
            </p>
          </div>
        </div>
        <ChevronRight className={cn(
          'w-5 h-5 text-grappler-400 transition-transform',
          showBadges && 'rotate-90'
        )} />
      </button>

      {/* Badges List */}
      {showBadges && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="card p-4 space-y-4"
        >
          {/* Earned Badges */}
          <div>
            <h4 className="text-sm font-medium text-grappler-300 mb-3">Earned Badges</h4>
            {gamificationStats.badges.length > 0 ? (
              <div className="grid grid-cols-4 gap-3">
                {gamificationStats.badges.map((userBadge) => (
                  <div
                    key={userBadge.id}
                    className="text-center"
                  >
                    <div className="w-14 h-14 bg-grappler-700 rounded-xl flex items-center justify-center mx-auto mb-1 text-2xl">
                      {userBadge.badge.icon}
                    </div>
                    <p className="text-xs text-grappler-300 truncate">
                      {userBadge.badge.name}
                    </p>
                    <p className="text-xs text-primary-400">
                      +{userBadge.badge.points}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-grappler-500">Complete workouts to earn badges!</p>
            )}
          </div>

          {/* Locked Badges */}
          <div>
            <h4 className="text-sm font-medium text-grappler-300 mb-3">Available Badges</h4>
            <div className="grid grid-cols-4 gap-3">
              {badges.filter(b => !earnedBadgeIds.has(b.id)).slice(0, 8).map((badge) => (
                <div
                  key={badge.id}
                  className="text-center opacity-50"
                >
                  <div className="w-14 h-14 bg-grappler-800 rounded-xl flex items-center justify-center mx-auto mb-1 text-2xl grayscale">
                    {badge.icon}
                  </div>
                  <p className="text-xs text-grappler-500 truncate">
                    {badge.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats Summary */}
      <div className="card p-4">
        <h3 className="font-medium text-grappler-200 mb-4">Lifetime Stats</h3>
        <div className="space-y-3">
          <StatRow
            icon={Dumbbell}
            label="Total Volume"
            value={`${formatNumber(gamificationStats.totalVolume)} ${weightUnit}`}
          />
          <StatRow
            icon={Star}
            label="Total Points"
            value={formatNumber(gamificationStats.totalPoints)}
          />
          <StatRow
            icon={Medal}
            label="Longest Streak"
            value={`${gamificationStats.longestStreak} days`}
          />
        </div>
      </div>

      {/* Sign Out */}
      <div className="card p-4">
        <button
          onClick={() => {
            signOut({ callbackUrl: '/login' });
          }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-grappler-700 text-grappler-200 font-medium text-sm hover:bg-grappler-600 transition-colors"
        >
          <DoorOpen className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {/* Danger Zone */}
      <div className="card p-4 border border-red-500/30">
        <h3 className="font-medium text-red-400 mb-2">Reset Data</h3>
        <p className="text-sm text-grappler-400 mb-4">
          This will erase all your progress, workouts, and achievements. Your account will remain — only training data is deleted.
        </p>
        <button
          onClick={() => {
            if (confirm('Are you sure? This cannot be undone!')) {
              resetStore();
            }
          }}
          className="btn btn-danger btn-sm gap-2"
        >
          <LogOut className="w-4 h-4" />
          Reset All Data
        </button>
      </div>
    </div>
  );
}

function SettingRow({
  icon: Icon,
  label,
  value,
  className
}: {
  icon: any;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-grappler-400" />
        <span className="text-grappler-300">{label}</span>
      </div>
      <span className={cn('text-grappler-100', className)}>{value}</span>
    </div>
  );
}

function StatRow({
  icon: Icon,
  label,
  value
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-grappler-500" />
        <span className="text-sm text-grappler-400">{label}</span>
      </div>
      <span className="font-medium text-grappler-200">{value}</span>
    </div>
  );
}
