'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import {
  ChevronLeft,
  Heart,
  AlertTriangle,
  AlertCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  Battery,
  Moon,
  Activity,
  Zap,
  Target,
  Lightbulb,
  Shield,
  Sparkles,
} from 'lucide-react';
import { analyzeRecovery, getRecoveryTips, type RecoveryCoachAnalysis, type AlertPriority } from '@/lib/recovery-coach';
import { cn } from '@/lib/utils';

interface RecoveryCoachProps {
  onClose: () => void;
}

export default function RecoveryCoach({ onClose }: RecoveryCoachProps) {
  const {
    latestWhoopData,
    workoutLogs,
    trainingSessions,
    injuryLog,
    user,
  } = useAppStore();

  // Create a simple history from latest whoop data for now
  const whoopHistory = latestWhoopData ? [latestWhoopData] : [];

  const analysis = useMemo<RecoveryCoachAnalysis>(() => {
    return analyzeRecovery(
      latestWhoopData,
      whoopHistory,
      workoutLogs,
      trainingSessions,
      injuryLog,
      user
    );
  }, [latestWhoopData, whoopHistory, workoutLogs, trainingSessions, injuryLog, user]);

  const tips = useMemo(() => getRecoveryTips(analysis), [analysis]);

  const getReadinessColor = (category: RecoveryCoachAnalysis['readiness']['category']) => {
    switch (category) {
      case 'optimal': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'ready': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
      case 'moderate': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'compromised': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'rest_recommended': return 'bg-red-500/20 text-red-400 border-red-500/50';
    }
  };

  const getReadinessLabel = (category: RecoveryCoachAnalysis['readiness']['category']) => {
    switch (category) {
      case 'optimal': return 'Optimal';
      case 'ready': return 'Ready';
      case 'moderate': return 'Moderate';
      case 'compromised': return 'Compromised';
      case 'rest_recommended': return 'Rest Needed';
    }
  };

  const getAlertIcon = (priority: AlertPriority) => {
    switch (priority) {
      case 'critical': return AlertTriangle;
      case 'warning': return AlertCircle;
      case 'info': return Info;
    }
  };

  const getAlertColor = (priority: AlertPriority) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/20 border-red-500/50 text-red-400';
      case 'warning': return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400';
      case 'info': return 'bg-blue-500/20 border-blue-500/50 text-blue-400';
    }
  };

  const getTrendIcon = (trend: 'improving' | 'stable' | 'declining' | 'unknown') => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-400" />;
      case 'stable': return <Minus className="w-4 h-4 text-gray-400" />;
      default: return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className="min-h-screen bg-grappler-900 bg-mesh pb-20"
    >
      {/* Header */}
      <header className="sticky top-0 z-40 bg-grappler-900/80 backdrop-blur-xl border-b border-grappler-800">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="btn btn-ghost btn-sm p-1">
              <ChevronLeft className="w-5 h-5 text-grappler-200" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-400" />
              </div>
              <div>
                <h1 className="font-bold text-grappler-50 text-lg leading-tight">
                  Recovery Coach
                </h1>
                <p className="text-xs text-grappler-500">
                  AI-powered recovery insights
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        {/* Training Readiness Score */}
        <div className={cn(
          'rounded-xl p-4 border',
          getReadinessColor(analysis.readiness.category)
        )}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Battery className="w-5 h-5" />
              <span className="font-semibold">Training Readiness</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold">{analysis.readiness.score}</span>
              <span className="text-sm opacity-70">/100</span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <span className={cn(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              getReadinessColor(analysis.readiness.category)
            )}>
              {getReadinessLabel(analysis.readiness.category)}
            </span>
          </div>

          <p className="text-sm opacity-80 mb-3">{analysis.readiness.recommendation}</p>

          {analysis.readiness.suggestedWorkoutMod && (
            <div className="bg-black/20 rounded-lg p-2">
              <p className="text-xs flex items-start gap-1.5">
                <Target className="w-3 h-3 mt-0.5 shrink-0" />
                <span><strong>Today&apos;s adjustment:</strong> {analysis.readiness.suggestedWorkoutMod}</span>
              </p>
            </div>
          )}

          {/* Readiness Factors */}
          <div className="mt-4 pt-3 border-t border-white/10">
            <p className="text-xs font-medium mb-2">Factors:</p>
            <div className="space-y-1">
              {analysis.readiness.factors.map((factor, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="opacity-70">{factor.name}</span>
                  <span className={cn(
                    'font-medium',
                    factor.impact === 'positive' ? 'text-green-400' :
                      factor.impact === 'negative' ? 'text-red-400' : 'text-gray-400'
                  )}>
                    {factor.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Alerts */}
        {analysis.alerts.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-grappler-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              Active Alerts
            </h2>

            <AnimatePresence mode="popLayout">
              {analysis.alerts.map((alert) => {
                const AlertIcon = getAlertIcon(alert.priority);
                return (
                  <motion.div
                    key={alert.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={cn(
                      'rounded-xl p-4 border',
                      getAlertColor(alert.priority)
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <AlertIcon className="w-5 h-5 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-sm mb-1">{alert.title}</h3>
                        <p className="text-xs opacity-80 mb-3">{alert.message}</p>
                        <ul className="space-y-1">
                          {alert.actionItems.map((item, idx) => (
                            <li key={idx} className="text-xs flex items-start gap-1.5 opacity-70">
                              <span>•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Insights */}
        {analysis.insights.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-grappler-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary-400" />
              Current Metrics
            </h2>

            <div className="grid gap-3">
              {analysis.insights.map((insight, idx) => (
                <div
                  key={idx}
                  className="bg-grappler-800 rounded-xl p-3 border border-grappler-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-grappler-200">{insight.metric}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{insight.value}</span>
                      {getTrendIcon(insight.trend)}
                    </div>
                  </div>
                  <p className="text-xs text-grappler-400">{insight.interpretation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weekly Trends */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-grappler-200 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            7-Day Averages
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-grappler-800 rounded-xl p-3 border border-grappler-700 text-center">
              <Heart className="w-5 h-5 text-red-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-white">
                {analysis.weeklyTrend.avgRecovery.toFixed(0)}%
              </p>
              <p className="text-xs text-grappler-400">Avg Recovery</p>
            </div>

            <div className="bg-grappler-800 rounded-xl p-3 border border-grappler-700 text-center">
              <Moon className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-white">
                {analysis.weeklyTrend.avgSleep.toFixed(1)}h
              </p>
              <p className="text-xs text-grappler-400">Avg Sleep</p>
            </div>

            <div className="bg-grappler-800 rounded-xl p-3 border border-grappler-700 text-center">
              <Zap className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-white">
                {analysis.weeklyTrend.avgStrain.toFixed(1)}
              </p>
              <p className="text-xs text-grappler-400">Avg Strain</p>
            </div>

            <div className="bg-grappler-800 rounded-xl p-3 border border-grappler-700 text-center">
              <Shield className="w-5 h-5 text-lime-400 mx-auto mb-1" />
              <p className="text-lg font-bold text-white">
                {analysis.weeklyTrend.trainingLoad}
              </p>
              <p className="text-xs text-grappler-400">Sessions</p>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {analysis.recommendations.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-grappler-200 flex items-center gap-2">
              <Target className="w-4 h-4 text-primary-400" />
              Today&apos;s Recommendations
            </h2>

            <div className="bg-grappler-800 rounded-xl p-4 border border-grappler-700">
              <ul className="space-y-2">
                {analysis.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-grappler-200">
                    <span className="text-primary-400">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Recovery Tips */}
        {tips.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-grappler-200 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-400" />
              Recovery Tips
            </h2>

            <div className="bg-grappler-800/50 rounded-xl p-4 border border-grappler-700">
              <ul className="space-y-2">
                {tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-grappler-400">
                    <span className="text-yellow-400/70">💡</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!latestWhoopData && analysis.insights.length === 0 && (
          <div className="bg-grappler-800/50 rounded-xl p-6 text-center">
            <Activity className="w-10 h-10 text-grappler-500 mx-auto mb-3" />
            <h3 className="font-semibold text-grappler-200 mb-1">Connect Wearable for Full Insights</h3>
            <p className="text-sm text-grappler-400">
              Link your Whoop to get personalized recovery recommendations based on your HRV, sleep, and strain data.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
