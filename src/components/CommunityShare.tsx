'use client';

import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import {
  ArrowLeft,
  Share2,
  Trophy,
  Flame,
  Star,
  TrendingUp,
  Dumbbell,
  Copy,
  Check,
  Image,
  Users,
  Award,
  Target,
  Zap,
  Calendar,
  BarChart3,
  ChevronRight,
} from 'lucide-react';
import { cn, formatNumber, formatDate, getRelativeTime } from '@/lib/utils';
import { getLevelTitle } from '@/lib/gamification';
import { detectFightCampPhase, getPhaseConfig } from '@/lib/fight-camp-engine';
import { Apple } from 'lucide-react';

type ShareTab = 'summary' | 'pr' | 'badge' | 'milestone' | 'nutrition';

interface CommunityShareProps {
  onClose: () => void;
}

export default function CommunityShare({ onClose }: CommunityShareProps) {
  const {
    user, gamificationStats, workoutLogs, currentMesocycle, mesocycleHistory, bodyWeightLog,
    meals, competitions, trainingSessions,
  } = useAppStore();
  const [activeTab, setActiveTab] = useState<ShareTab>('summary');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const weightUnit = user?.weightUnit || 'lbs';

  // Build shareable data
  const stats = useMemo(() => {
    const totalVolume = workoutLogs.reduce((sum, l) => sum + l.totalVolume, 0);
    const totalDuration = workoutLogs.reduce((sum, l) => sum + l.duration, 0);
    const avgRPE = workoutLogs.length > 0
      ? +(workoutLogs.reduce((s, l) => s + (l.overallRPE || 7), 0) / workoutLogs.length).toFixed(1)
      : 0;

    // PRs: find exercises where personalRecord is true
    const prLogs: { exerciseName: string; weight: number; reps: number; date: Date; e1rm: number }[] = [];
    for (const log of workoutLogs) {
      for (const ex of log.exercises) {
        if (ex.personalRecord) {
          const bestSet = ex.sets
            .filter(s => s.completed)
            .sort((a, b) => {
              const a1rm = a.weight / (1.0278 - 0.0278 * a.reps);
              const b1rm = b.weight / (1.0278 - 0.0278 * b.reps);
              return b1rm - a1rm;
            })[0];
          if (bestSet && bestSet.weight > 0) {
            prLogs.push({
              exerciseName: ex.exerciseName,
              weight: bestSet.weight,
              reps: bestSet.reps,
              date: new Date(log.date),
              e1rm: bestSet.reps === 1 ? bestSet.weight : Math.round(bestSet.weight / (1.0278 - 0.0278 * bestSet.reps)),
            });
          }
        }
      }
    }
    // Deduplicate by exercise, keep the best
    const bestPRs = new Map<string, typeof prLogs[0]>();
    for (const pr of prLogs) {
      const existing = bestPRs.get(pr.exerciseName);
      if (!existing || pr.e1rm > existing.e1rm) {
        bestPRs.set(pr.exerciseName, pr);
      }
    }

    // Weekly stats (last 4 weeks)
    const fourWeeksAgo = Date.now() - 28 * 24 * 60 * 60 * 1000;
    const recentLogs = workoutLogs.filter(l => new Date(l.date).getTime() > fourWeeksAgo);
    const weeksActive = recentLogs.length > 0 ? Math.ceil((Date.now() - new Date(recentLogs[0].date).getTime()) / (7 * 24 * 60 * 60 * 1000)) || 1 : 0;
    const avgPerWeek = weeksActive > 0 ? +(recentLogs.length / weeksActive).toFixed(1) : 0;

    return {
      totalVolume,
      totalDuration,
      avgRPE,
      bestPRs: Array.from(bestPRs.values()).sort((a, b) => b.e1rm - a.e1rm),
      recentLogs,
      avgPerWeek,
    };
  }, [workoutLogs]);

  // Nutrition & fight camp stats
  const nutritionStats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekMeals = (meals || []).filter(m => new Date(m.date).getTime() > weekAgo);
    const daysWithMeals = new Set(weekMeals.map(m => new Date(m.date).toDateString())).size;
    const avgCals = daysWithMeals > 0 ? Math.round(weekMeals.reduce((s, m) => s + m.calories, 0) / daysWithMeals) : 0;
    const avgProtein = daysWithMeals > 0 ? Math.round(weekMeals.reduce((s, m) => s + m.protein, 0) / daysWithMeals) : 0;
    const weekSessions = (trainingSessions || []).filter(s => new Date(s.date).getTime() > weekAgo);
    const trainingHrs = +(weekSessions.reduce((s, t) => s + t.duration, 0) / 60).toFixed(1);

    // Fight camp phase
    const now = Date.now();
    const nextComp = (competitions || [])
      .filter(c => c.isActive && new Date(c.date).getTime() > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] || null;
    const daysOut = nextComp ? Math.ceil((new Date(nextComp.date).getTime() - now) / (1000 * 60 * 60 * 24)) : null;
    const phase = user?.trainingIdentity === 'combat' && daysOut != null ? detectFightCampPhase(daysOut) : null;
    const phaseConfig = phase && phase !== 'off_season' ? getPhaseConfig(phase, (user?.sex || 'male') as 'male' | 'female') : null;

    // Body weight change
    const recentWeights = (bodyWeightLog || []).filter(w => new Date(w.date).getTime() > weekAgo);
    const weightDelta = recentWeights.length >= 2
      ? +(recentWeights[recentWeights.length - 1].weight - recentWeights[0].weight).toFixed(1)
      : null;

    return { avgCals, avgProtein, daysWithMeals, trainingHrs, phase, phaseConfig, nextComp, daysOut, weightDelta };
  }, [meals, trainingSessions, competitions, bodyWeightLog, user]);

  const buildNutritionShare = () => {
    const lines = [
      `${user?.name || 'Athlete'}'s Weekly Nutrition`,
      ``,
      `Avg ${nutritionStats.avgCals} cal/day | ${nutritionStats.avgProtein}g protein/day`,
      `${nutritionStats.daysWithMeals} days tracked | ${nutritionStats.trainingHrs}h training`,
    ];
    if (nutritionStats.weightDelta != null) {
      const dir = nutritionStats.weightDelta > 0 ? '+' : '';
      lines.push(`Weight: ${dir}${nutritionStats.weightDelta} ${weightUnit} this week`);
    }
    if (nutritionStats.phaseConfig && nutritionStats.daysOut != null) {
      lines.push(`\nFight Camp: ${nutritionStats.phaseConfig.name.split('(')[0].trim()} — ${nutritionStats.daysOut}d out`);
      lines.push(`Focus: ${nutritionStats.phaseConfig.focus}`);
    }
    lines.push(`\n-- Roots Gains`);
    return lines.join('\n');
  };

  const handleShare = async (text: string, id: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Build text for different card types
  const buildProgressSummary = () => {
    const lines = [
      `${user?.name || 'Athlete'}'s Training Summary`,
      ``,
      `Level ${gamificationStats.level} ${getLevelTitle(gamificationStats.level)}`,
      `${gamificationStats.totalWorkouts} workouts | ${formatNumber(Math.round(stats.totalVolume))} ${weightUnit} total volume`,
      `${gamificationStats.currentStreak} day streak | ${gamificationStats.personalRecords} PRs`,
      ``,
    ];
    if (stats.bestPRs.length > 0) {
      lines.push('Top Lifts:');
      for (const pr of stats.bestPRs.slice(0, 4)) {
        lines.push(`  ${pr.exerciseName}: ${pr.weight} ${weightUnit} x ${pr.reps} (e1RM: ${pr.e1rm})`);
      }
      lines.push('');
    }
    if (currentMesocycle) {
      lines.push(`Current Block: ${currentMesocycle.name} (${currentMesocycle.goalFocus})`);
    }
    lines.push(`\n-- Roots Gains`);
    return lines.filter(Boolean).join('\n');
  };

  const buildPRShare = (pr: typeof stats.bestPRs[0]) => {
    return [
      `New PR!`,
      `${pr.exerciseName}: ${pr.weight} ${weightUnit} x ${pr.reps}`,
      `Estimated 1RM: ${pr.e1rm} ${weightUnit}`,
      ``,
      `-- Roots Gains`,
    ].join('\n');
  };

  const buildBadgeShare = (badge: { badge: { name: string; description: string; icon: string; points: number }; earnedAt: Date }) => {
    return [
      `Badge Unlocked! ${badge.badge.icon}`,
      `${badge.badge.name}`,
      `"${badge.badge.description}"`,
      `+${badge.badge.points} XP`,
      ``,
      `-- Roots Gains`,
    ].join('\n');
  };

  const buildMilestoneShare = () => {
    const milestones: string[] = [];
    if (gamificationStats.totalWorkouts > 0 && gamificationStats.totalWorkouts % 10 === 0) {
      milestones.push(`${gamificationStats.totalWorkouts} workouts completed!`);
    }
    if (gamificationStats.currentStreak >= 7) {
      milestones.push(`${gamificationStats.currentStreak} day training streak!`);
    }
    if (gamificationStats.personalRecords >= 5) {
      milestones.push(`${gamificationStats.personalRecords} personal records set!`);
    }
    if (mesocycleHistory.length > 0) {
      milestones.push(`${mesocycleHistory.length + (currentMesocycle ? 1 : 0)} training blocks completed!`);
    }
    return [
      `Training Milestones`,
      ``,
      ...milestones.map(m => `  ${m}`),
      ``,
      `Level ${gamificationStats.level} ${getLevelTitle(gamificationStats.level)}`,
      `${formatNumber(gamificationStats.totalPoints)} XP earned`,
      ``,
      `-- Roots Gains`,
    ].join('\n');
  };

  const tabs = [
    { id: 'summary' as ShareTab, label: 'Summary', icon: BarChart3 },
    { id: 'nutrition' as ShareTab, label: 'Nutrition', icon: Apple },
    { id: 'pr' as ShareTab, label: 'PRs', icon: Trophy },
    { id: 'badge' as ShareTab, label: 'Badges', icon: Award },
    { id: 'milestone' as ShareTab, label: 'Milestones', icon: Target },
  ];

  return (
    <div className="min-h-screen bg-grappler-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-grappler-950/95 backdrop-blur-lg border-b border-grappler-800">
        <div className="p-4 flex items-center gap-3">
          <button aria-label="Go back" onClick={onClose} className="p-2 -ml-2 rounded-xl hover:bg-grappler-800">
            <ArrowLeft className="w-5 h-5 text-grappler-300" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-grappler-50 text-lg">Share Progress</h1>
            <p className="text-xs text-grappler-400">Share your achievements with the Roots Collective</p>
          </div>
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pb-3">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-grappler-800 text-grappler-400 hover:text-grappler-200'
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Progress Card Preview */}
            <div className="bg-gradient-to-br from-grappler-800 to-grappler-850 border border-grappler-700 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
                  <Dumbbell className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-grappler-50">{user?.name || 'Athlete'}</h3>
                  <p className="text-xs text-grappler-400">
                    Level {gamificationStats.level} {getLevelTitle(gamificationStats.level)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Workouts', value: gamificationStats.totalWorkouts, icon: Target, color: 'text-green-400' },
                  { label: 'Streak', value: gamificationStats.currentStreak, icon: Flame, color: 'text-blue-400' },
                  { label: 'PRs', value: gamificationStats.personalRecords, icon: Trophy, color: 'text-yellow-400' },
                  { label: 'Badges', value: gamificationStats.badges.length, icon: Award, color: 'text-purple-400' },
                ].map(stat => (
                  <div key={stat.label} className="text-center bg-grappler-900/50 rounded-lg p-2">
                    <stat.icon className={cn('w-4 h-4 mx-auto mb-1', stat.color)} />
                    <p className="text-sm font-bold text-grappler-100">{stat.value}</p>
                    <p className="text-xs text-grappler-500">{stat.label}</p>
                  </div>
                ))}
              </div>

              {stats.bestPRs.length > 0 && (
                <div>
                  <p className="text-xs text-grappler-500 uppercase tracking-wide mb-2">Top Lifts</p>
                  <div className="space-y-1.5">
                    {stats.bestPRs.slice(0, 3).map(pr => (
                      <div key={pr.exerciseName} className="flex items-center justify-between bg-grappler-900/50 rounded-lg px-3 py-2">
                        <span className="text-xs text-grappler-300">{pr.exerciseName}</span>
                        <span className="text-xs font-bold text-grappler-100">{pr.e1rm} {weightUnit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-grappler-700/50">
                <span className="text-xs text-grappler-500">
                  {formatNumber(gamificationStats.totalPoints)} XP
                  {currentMesocycle ? ` | ${currentMesocycle.name}` : ''}
                </span>
                <span className="text-xs text-grappler-600">Roots Gains</span>
              </div>
            </div>

            {/* Share button */}
            <button
              onClick={() => handleShare(buildProgressSummary(), 'summary')}
              className="btn btn-primary w-full gap-2"
            >
              {copiedId === 'summary' ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {copiedId === 'summary' ? 'Copied!' : 'Share Progress Summary'}
            </button>

            {/* Quick share: recent workout */}
            {workoutLogs.length > 0 && (
              <div>
                <p className="text-xs text-grappler-500 uppercase tracking-wide mb-2">Recent Workouts</p>
                <div className="space-y-2">
                  {workoutLogs.slice(-3).reverse().map(log => {
                    const shareText = [
                      `Workout Complete!`,
                      `${log.exercises.length} exercises | ${formatNumber(log.totalVolume)} ${weightUnit} volume | ${log.duration}m`,
                      ``,
                      ...log.exercises.map(ex => `  ${ex.exerciseName}${ex.personalRecord ? ' (PR!)' : ''}`),
                      ``,
                      `-- Roots Gains`,
                    ].join('\n');

                    return (
                      <div key={log.id} className="flex items-center gap-3 bg-grappler-800/50 rounded-xl p-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-grappler-200 truncate">
                            {log.exercises.length} exercises | {formatNumber(Math.round(log.totalVolume))} {weightUnit}
                          </p>
                          <p className="text-xs text-grappler-500">{formatDate(log.date)}</p>
                        </div>
                        <button
                          onClick={() => handleShare(shareText, log.id)}
                          className="p-2 rounded-lg bg-grappler-700 hover:bg-grappler-600 transition-colors flex-shrink-0"
                        >
                          {copiedId === log.id ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4 text-grappler-300" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Weekly consistency share */}
            {stats.avgPerWeek > 0 && (
              <div className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-grappler-200 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary-400" />
                    Consistency
                  </h4>
                  <button
                    onClick={() => handleShare(
                      `Training Consistency\n\n${stats.avgPerWeek} workouts/week (last 4 weeks)\n${gamificationStats.currentStreak} day streak\n${gamificationStats.totalWorkouts} total workouts\n\n-- Roots Gains`,
                      'consistency'
                    )}
                    className="p-1.5 rounded-lg bg-grappler-700 hover:bg-grappler-600 transition-colors"
                  >
                    {copiedId === 'consistency' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Share2 className="w-3.5 h-3.5 text-grappler-300" />}
                  </button>
                </div>
                <p className="text-lg font-bold text-grappler-100">{stats.avgPerWeek} <span className="text-sm font-normal text-grappler-400">workouts/week</span></p>
                <p className="text-xs text-grappler-500">Last 4 weeks average</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Nutrition Tab */}
        {activeTab === 'nutrition' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Nutrition overview card */}
            <div className="bg-gradient-to-br from-green-900/30 to-grappler-850 border border-green-500/20 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <Apple className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-grappler-50">Weekly Nutrition</h3>
                  <p className="text-xs text-grappler-400">
                    {nutritionStats.daysWithMeals} day{nutritionStats.daysWithMeals !== 1 ? 's' : ''} tracked this week
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-grappler-900/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-green-400">{nutritionStats.avgCals}</p>
                  <p className="text-xs text-grappler-500">Avg cal/day</p>
                </div>
                <div className="bg-grappler-900/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-blue-400">{nutritionStats.avgProtein}g</p>
                  <p className="text-xs text-grappler-500">Avg protein/day</p>
                </div>
                <div className="bg-grappler-900/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-yellow-400">{nutritionStats.trainingHrs}h</p>
                  <p className="text-xs text-grappler-500">Training this week</p>
                </div>
                <div className="bg-grappler-900/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-grappler-200">
                    {nutritionStats.weightDelta != null
                      ? `${nutritionStats.weightDelta > 0 ? '+' : ''}${nutritionStats.weightDelta} ${weightUnit}`
                      : '—'}
                  </p>
                  <p className="text-xs text-grappler-500">Weight change</p>
                </div>
              </div>

              {nutritionStats.phaseConfig && nutritionStats.daysOut != null && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-red-300">
                      {nutritionStats.phaseConfig.name.split('(')[0].trim()} — {nutritionStats.daysOut}d out
                    </p>
                    <p className="text-xs text-grappler-400 truncate">{nutritionStats.phaseConfig.focus}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-grappler-700/50">
                <span className="text-xs text-grappler-500">
                  {nutritionStats.avgCals > 0 ? `${nutritionStats.avgProtein}g protein · ${nutritionStats.trainingHrs}h training` : 'Start logging meals to share'}
                </span>
                <span className="text-xs text-grappler-600">Roots Gains</span>
              </div>
            </div>

            {/* Share button */}
            <button
              onClick={() => handleShare(buildNutritionShare(), 'nutrition')}
              disabled={nutritionStats.daysWithMeals === 0}
              className="btn btn-primary w-full gap-2 disabled:opacity-40"
            >
              {copiedId === 'nutrition' ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {copiedId === 'nutrition' ? 'Copied!' : 'Share Nutrition Summary'}
            </button>
          </motion.div>
        )}

        {/* PR Tab */}
        {activeTab === 'pr' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {stats.bestPRs.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-10 h-10 text-grappler-600 mx-auto mb-3" />
                <p className="text-sm text-grappler-400">No PRs yet — keep training!</p>
              </div>
            ) : (
              stats.bestPRs.map(pr => (
                <div key={pr.exerciseName} className="card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-grappler-100 text-sm">{pr.exerciseName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-lg font-bold text-primary-400">{pr.weight} {weightUnit}</span>
                        <span className="text-grappler-500">x</span>
                        <span className="text-lg font-bold text-grappler-200">{pr.reps}</span>
                      </div>
                      <p className="text-xs text-grappler-500 mt-1">
                        e1RM: {pr.e1rm} {weightUnit} | {getRelativeTime(pr.date)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleShare(buildPRShare(pr), `pr-${pr.exerciseName}`)}
                      className="p-2.5 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors"
                    >
                      {copiedId === `pr-${pr.exerciseName}` ? (
                        <Check className="w-5 h-5 text-green-400" />
                      ) : (
                        <Share2 className="w-5 h-5 text-yellow-400" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {/* Badge Tab */}
        {activeTab === 'badge' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {gamificationStats.badges.length === 0 ? (
              <div className="text-center py-12">
                <Award className="w-10 h-10 text-grappler-600 mx-auto mb-3" />
                <p className="text-sm text-grappler-400">Complete workouts to earn badges!</p>
              </div>
            ) : (
              gamificationStats.badges.map(ub => (
                <div key={ub.id} className="card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{ub.badge.icon}</span>
                      <div>
                        <p className="font-medium text-grappler-100 text-sm">{ub.badge.name}</p>
                        <p className="text-xs text-grappler-400">{ub.badge.description}</p>
                        <p className="text-xs text-grappler-500 mt-0.5">
                          +{ub.badge.points} XP | {getRelativeTime(ub.earnedAt)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleShare(buildBadgeShare(ub), `badge-${ub.id}`)}
                      className="p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 transition-colors"
                    >
                      {copiedId === `badge-${ub.id}` ? (
                        <Check className="w-5 h-5 text-green-400" />
                      ) : (
                        <Share2 className="w-5 h-5 text-purple-400" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {/* Milestone Tab */}
        {activeTab === 'milestone' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Milestone cards */}
            <div className="space-y-3">
              {[
                { label: 'Total Workouts', value: gamificationStats.totalWorkouts, icon: Target, color: 'from-green-500/20 to-emerald-500/10 border-green-500/20', textColor: 'text-green-400' },
                { label: 'Training Streak', value: `${gamificationStats.currentStreak} days`, icon: Flame, color: 'from-blue-500/20 to-sky-500/10 border-blue-500/20', textColor: 'text-blue-400' },
                { label: 'Personal Records', value: gamificationStats.personalRecords, icon: Trophy, color: 'from-yellow-500/20 to-sky-500/10 border-yellow-500/20', textColor: 'text-yellow-400' },
                { label: 'Total Volume', value: `${formatNumber(Math.round(stats.totalVolume))} ${weightUnit}`, icon: BarChart3, color: 'from-primary-500/20 to-sky-500/10 border-primary-500/20', textColor: 'text-primary-400' },
                { label: 'Longest Streak', value: `${gamificationStats.longestStreak} days`, icon: Zap, color: 'from-purple-500/20 to-violet-500/10 border-purple-500/20', textColor: 'text-purple-400' },
                { label: 'Blocks Completed', value: mesocycleHistory.length, icon: Calendar, color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/20', textColor: 'text-cyan-400' },
              ].map(milestone => (
                <div
                  key={milestone.label}
                  className={cn('bg-gradient-to-r border rounded-xl p-4 flex items-center justify-between', milestone.color)}
                >
                  <div className="flex items-center gap-3">
                    <milestone.icon className={cn('w-5 h-5', milestone.textColor)} />
                    <div>
                      <p className="text-xs text-grappler-400">{milestone.label}</p>
                      <p className={cn('text-lg font-bold', milestone.textColor)}>{milestone.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Share all milestones */}
            <button
              onClick={() => handleShare(buildMilestoneShare(), 'milestones')}
              className="btn btn-primary w-full gap-2"
            >
              {copiedId === 'milestones' ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {copiedId === 'milestones' ? 'Copied!' : 'Share Milestones'}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
