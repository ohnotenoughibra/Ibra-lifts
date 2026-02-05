import type {
  WorkoutLog,
  GrapplingSession,
  WearableData,
  UserProfile,
  InjuryEntry,
} from './types';

export type AlertPriority = 'info' | 'warning' | 'critical';
export type AlertCategory = 'recovery' | 'sleep' | 'training' | 'nutrition' | 'strain';

export interface RecoveryAlert {
  id: string;
  category: AlertCategory;
  priority: AlertPriority;
  title: string;
  message: string;
  actionItems: string[];
  timestamp: Date;
  dismissed?: boolean;
}

export interface RecoveryInsight {
  metric: string;
  value: number | string;
  trend: 'improving' | 'stable' | 'declining' | 'unknown';
  interpretation: string;
}

export interface TrainingReadiness {
  score: number; // 0-100
  category: 'optimal' | 'ready' | 'moderate' | 'compromised' | 'rest_recommended';
  factors: {
    name: string;
    impact: 'positive' | 'neutral' | 'negative';
    value: string;
  }[];
  recommendation: string;
  suggestedWorkoutMod: string | null;
}

export interface RecoveryCoachAnalysis {
  alerts: RecoveryAlert[];
  insights: RecoveryInsight[];
  readiness: TrainingReadiness;
  weeklyTrend: {
    avgRecovery: number;
    avgSleep: number;
    avgStrain: number;
    trainingLoad: number;
  };
  recommendations: string[];
}

/**
 * Main recovery analysis function
 */
export function analyzeRecovery(
  whoopData: WearableData | null,
  whoopHistory: WearableData[],
  workoutLogs: WorkoutLog[],
  grapplingSessions: GrapplingSession[],
  injuries: InjuryEntry[],
  user: UserProfile | null
): RecoveryCoachAnalysis {
  const alerts: RecoveryAlert[] = [];
  const insights: RecoveryInsight[] = [];
  const recommendations: string[] = [];

  // Get recent data (last 7 days)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const recentWorkouts = workoutLogs.filter(w => new Date(w.date) >= oneWeekAgo);
  const recentGrappling = grapplingSessions.filter(g => new Date(g.date) >= oneWeekAgo);
  const recentWhoop = whoopHistory.filter(w => new Date(w.date) >= oneWeekAgo);

  // Calculate weekly stats
  const weeklyTrend = calculateWeeklyTrend(recentWhoop, recentWorkouts, recentGrappling);

  // Generate readiness score
  const readiness = calculateReadiness(whoopData, recentWorkouts, recentGrappling, injuries);

  // Current day alerts
  if (whoopData) {
    const recovery = whoopData.recoveryScore ?? 50;
    const sleep = whoopData.sleepHours ?? 7;
    const strain = whoopData.strain ?? 10;
    const hrv = whoopData.hrv ?? 50;
    const rhr = whoopData.restingHR ?? 60;

    // Recovery alerts
    if (recovery < 33) {
      alerts.push({
        id: 'critical-recovery',
        category: 'recovery',
        priority: 'critical',
        title: 'Low Recovery Score',
        message: `Your recovery is at ${recovery}%. Your body needs rest to avoid injury and overtraining.`,
        actionItems: [
          'Consider skipping intense training today',
          'Focus on sleep quality tonight',
          'Hydrate extra (100+ oz water)',
          'Light mobility or walk is okay',
        ],
        timestamp: new Date(),
      });
    } else if (recovery < 50) {
      alerts.push({
        id: 'low-recovery',
        category: 'recovery',
        priority: 'warning',
        title: 'Below Average Recovery',
        message: `Recovery at ${recovery}%. Take it easier today.`,
        actionItems: [
          'Reduce training intensity by 20-30%',
          'Focus on technique over hard rolling',
          'Skip any PR attempts',
        ],
        timestamp: new Date(),
      });
    }

    // Sleep alerts
    if (sleep < 5) {
      alerts.push({
        id: 'critical-sleep',
        category: 'sleep',
        priority: 'critical',
        title: 'Severely Insufficient Sleep',
        message: `Only ${sleep.toFixed(1)} hours of sleep. This significantly impairs performance and recovery.`,
        actionItems: [
          'Coordination and reaction time are impaired',
          'Risk of injury is elevated',
          'Consider light training only or rest',
          'Aim for 9+ hours tonight to catch up',
        ],
        timestamp: new Date(),
      });
    } else if (sleep < 6) {
      alerts.push({
        id: 'low-sleep',
        category: 'sleep',
        priority: 'warning',
        title: 'Insufficient Sleep',
        message: `${sleep.toFixed(1)} hours of sleep is below optimal. Performance will be affected.`,
        actionItems: [
          'Take it easy on complex movements',
          'Extra warm-up recommended',
          'Prioritize sleep tonight',
        ],
        timestamp: new Date(),
      });
    }

    // Strain alerts
    if (strain > 18 && recovery < 50) {
      alerts.push({
        id: 'high-strain-low-recovery',
        category: 'strain',
        priority: 'warning',
        title: 'High Strain on Low Recovery',
        message: 'Yesterday\'s strain was high but your recovery hasn\'t caught up.',
        actionItems: [
          'Active recovery day recommended',
          'Light mobility, stretching, or walking',
          'Avoid adding more training stress',
        ],
        timestamp: new Date(),
      });
    }

    // HRV insights
    if (hrv) {
      const avgHrv = recentWhoop.reduce((sum, w) => sum + (w.hrv ?? 0), 0) / Math.max(recentWhoop.length, 1);
      const hrvTrend = hrv > avgHrv * 1.1 ? 'improving' : hrv < avgHrv * 0.9 ? 'declining' : 'stable';

      insights.push({
        metric: 'HRV',
        value: `${hrv}ms`,
        trend: hrvTrend,
        interpretation: hrvTrend === 'improving'
          ? 'Your nervous system is recovering well'
          : hrvTrend === 'declining'
            ? 'Accumulated stress detected - consider more rest'
            : 'Nervous system is stable',
      });
    }

    // RHR insights
    if (rhr) {
      const avgRhr = recentWhoop.reduce((sum, w) => sum + (w.restingHR ?? 0), 0) / Math.max(recentWhoop.length, 1);
      const rhrTrend = rhr < avgRhr * 0.95 ? 'improving' : rhr > avgRhr * 1.05 ? 'declining' : 'stable';

      insights.push({
        metric: 'Resting HR',
        value: `${rhr} bpm`,
        trend: rhrTrend,
        interpretation: rhrTrend === 'improving'
          ? 'Cardiovascular fitness improving'
          : rhrTrend === 'declining'
            ? 'Elevated RHR may indicate fatigue or illness'
            : 'Heart rate is consistent',
      });
    }

    // Recovery insight
    insights.push({
      metric: 'Recovery',
      value: `${recovery}%`,
      trend: recovery >= 67 ? 'improving' : recovery >= 50 ? 'stable' : 'declining',
      interpretation: recovery >= 67
        ? 'Great day to push hard!'
        : recovery >= 50
          ? 'Moderate intensity recommended'
          : 'Focus on recovery activities',
    });
  }

  // Training load alerts
  const totalSessions = recentWorkouts.length + recentGrappling.length;
  if (totalSessions >= 7) {
    alerts.push({
      id: 'high-frequency',
      category: 'training',
      priority: 'warning',
      title: 'High Training Frequency',
      message: `${totalSessions} training sessions in the past week. Monitor for overtraining signs.`,
      actionItems: [
        'Ensure at least 1-2 full rest days',
        'Check for persistent fatigue or soreness',
        'Consider a deload week soon',
      ],
      timestamp: new Date(),
    });
  }

  // Check for consecutive hard days
  const sortedSessions = [...recentWorkouts.map(w => ({ date: w.date, hard: w.overallRPE >= 7 })),
  ...recentGrappling.map(g => ({ date: g.date, hard: g.intensity === 'hard_sparring' || g.intensity === 'competition_prep' }))]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let consecutiveHard = 0;
  for (const session of sortedSessions) {
    if (session.hard) consecutiveHard++;
    else break;
  }

  if (consecutiveHard >= 3) {
    alerts.push({
      id: 'consecutive-hard-days',
      category: 'training',
      priority: 'warning',
      title: 'Multiple Hard Training Days',
      message: `${consecutiveHard} consecutive hard training days. Risk of accumulated fatigue.`,
      actionItems: [
        'Schedule a light or rest day',
        'Focus on mobility and recovery',
        'Reduce intensity on next session',
      ],
      timestamp: new Date(),
    });
  }

  // Active injury considerations
  const activeInjuries = injuries.filter(i => !i.resolved);
  if (activeInjuries.length > 0) {
    alerts.push({
      id: 'active-injuries',
      category: 'training',
      priority: 'info',
      title: 'Training with Active Injuries',
      message: `${activeInjuries.length} active injury/pain point(s) logged.`,
      actionItems: [
        'Warm up thoroughly before training',
        'Avoid exercises that aggravate the area',
        'Consider reducing training volume',
        'Ice and elevate after training if needed',
      ],
      timestamp: new Date(),
    });
  }

  // Generate recommendations based on all factors
  if (readiness.score >= 80) {
    recommendations.push('Great day to push hard - high intensity training recommended');
    recommendations.push('Good day for testing PRs or competition prep');
  } else if (readiness.score >= 60) {
    recommendations.push('Normal training day - maintain your program');
    recommendations.push('Focus on quality over pushing limits');
  } else if (readiness.score >= 40) {
    recommendations.push('Reduce intensity by 20-30%');
    recommendations.push('Technical work over hard sparring');
    recommendations.push('Consider extra warm-up time');
  } else {
    recommendations.push('Active recovery or complete rest recommended');
    recommendations.push('Light yoga, stretching, or walking');
    recommendations.push('Focus on sleep and nutrition');
  }

  // Add nutrition recommendations
  if (whoopData && (whoopData.recoveryScore ?? 50) < 50) {
    recommendations.push('Anti-inflammatory foods: berries, fatty fish, leafy greens');
    recommendations.push('Extra hydration with electrolytes');
  }

  return {
    alerts: alerts.sort((a, b) => priorityValue(b.priority) - priorityValue(a.priority)),
    insights,
    readiness,
    weeklyTrend,
    recommendations,
  };
}

function priorityValue(priority: AlertPriority): number {
  switch (priority) {
    case 'critical': return 3;
    case 'warning': return 2;
    case 'info': return 1;
    default: return 0;
  }
}

function calculateWeeklyTrend(
  whoopHistory: WearableData[],
  workouts: WorkoutLog[],
  grappling: GrapplingSession[]
): RecoveryCoachAnalysis['weeklyTrend'] {
  const avgRecovery = whoopHistory.length > 0
    ? whoopHistory.reduce((sum, w) => sum + (w.recoveryScore ?? 50), 0) / whoopHistory.length
    : 50;

  const avgSleep = whoopHistory.length > 0
    ? whoopHistory.reduce((sum, w) => sum + (w.sleepHours ?? 7), 0) / whoopHistory.length
    : 7;

  const avgStrain = whoopHistory.length > 0
    ? whoopHistory.reduce((sum, w) => sum + (w.strain ?? 10), 0) / whoopHistory.length
    : 10;

  const trainingLoad = workouts.length + grappling.length;

  return { avgRecovery, avgSleep, avgStrain, trainingLoad };
}

function calculateReadiness(
  whoopData: WearableData | null,
  workouts: WorkoutLog[],
  grappling: GrapplingSession[],
  injuries: InjuryEntry[]
): TrainingReadiness {
  let score = 70; // Default baseline
  const factors: TrainingReadiness['factors'] = [];

  if (whoopData) {
    const recovery = whoopData.recoveryScore ?? 50;
    const sleep = whoopData.sleepHours ?? 7;
    const strain = whoopData.strain ?? 10;

    // Recovery factor (major impact)
    if (recovery >= 67) {
      score += 15;
      factors.push({ name: 'Recovery Score', impact: 'positive', value: `${recovery}%` });
    } else if (recovery < 33) {
      score -= 25;
      factors.push({ name: 'Recovery Score', impact: 'negative', value: `${recovery}%` });
    } else if (recovery < 50) {
      score -= 10;
      factors.push({ name: 'Recovery Score', impact: 'negative', value: `${recovery}%` });
    } else {
      factors.push({ name: 'Recovery Score', impact: 'neutral', value: `${recovery}%` });
    }

    // Sleep factor
    if (sleep >= 7.5) {
      score += 10;
      factors.push({ name: 'Sleep', impact: 'positive', value: `${sleep.toFixed(1)}h` });
    } else if (sleep < 6) {
      score -= 15;
      factors.push({ name: 'Sleep', impact: 'negative', value: `${sleep.toFixed(1)}h` });
    } else {
      factors.push({ name: 'Sleep', impact: 'neutral', value: `${sleep.toFixed(1)}h` });
    }

    // Previous day strain
    if (strain > 18) {
      score -= 10;
      factors.push({ name: 'Yesterday\'s Strain', impact: 'negative', value: `${strain.toFixed(1)}` });
    } else if (strain < 10) {
      score += 5;
      factors.push({ name: 'Yesterday\'s Strain', impact: 'positive', value: `${strain.toFixed(1)}` });
    }
  } else {
    factors.push({ name: 'Whoop Data', impact: 'neutral', value: 'Not connected' });
  }

  // Check recent training volume
  const recentTraining = workouts.length + grappling.length;
  if (recentTraining >= 6) {
    score -= 10;
    factors.push({ name: 'Weekly Volume', impact: 'negative', value: `${recentTraining} sessions` });
  } else if (recentTraining >= 3) {
    factors.push({ name: 'Weekly Volume', impact: 'neutral', value: `${recentTraining} sessions` });
  } else {
    factors.push({ name: 'Weekly Volume', impact: 'positive', value: `${recentTraining} sessions (well rested)` });
  }

  // Active injuries
  const activeInjuries = injuries.filter(i => !i.resolved);
  if (activeInjuries.length > 0) {
    score -= activeInjuries.length * 5;
    factors.push({
      name: 'Active Injuries',
      impact: 'negative',
      value: `${activeInjuries.length} logged`,
    });
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Determine category and recommendation
  let category: TrainingReadiness['category'];
  let recommendation: string;
  let suggestedWorkoutMod: string | null = null;

  if (score >= 80) {
    category = 'optimal';
    recommendation = 'Peak readiness - push hard today!';
  } else if (score >= 65) {
    category = 'ready';
    recommendation = 'Good to go for normal training';
  } else if (score >= 50) {
    category = 'moderate';
    recommendation = 'Train with caution - reduced intensity';
    suggestedWorkoutMod = 'Reduce sets by 20% or RPE by 2';
  } else if (score >= 35) {
    category = 'compromised';
    recommendation = 'Light training or technique work only';
    suggestedWorkoutMod = 'Technical drilling, no hard sparring';
  } else {
    category = 'rest_recommended';
    recommendation = 'Rest day strongly recommended';
    suggestedWorkoutMod = 'Active recovery: yoga, walking, stretching';
  }

  return { score, category, factors, recommendation, suggestedWorkoutMod };
}

/**
 * Get personalized recovery tips based on current state
 */
export function getRecoveryTips(analysis: RecoveryCoachAnalysis): string[] {
  const tips: string[] = [];

  if (analysis.readiness.score < 50) {
    tips.push('Take an Epsom salt bath (20 mins) to help muscles relax');
    tips.push('Try box breathing: 4 sec inhale, 4 sec hold, 4 sec exhale, 4 sec hold');
    tips.push('Reduce screen time 1 hour before bed for better sleep');
  }

  if (analysis.weeklyTrend.avgSleep < 7) {
    tips.push('Set a consistent bedtime alarm to improve sleep hygiene');
    tips.push('Keep bedroom cool (65-68°F) for optimal sleep');
  }

  if (analysis.weeklyTrend.avgStrain > 15) {
    tips.push('Consider scheduling a dedicated recovery day');
    tips.push('Foam rolling for 10 min can help reduce muscle tension');
  }

  // General tips
  tips.push('Protein within 30 min post-workout aids recovery');
  tips.push('Stay hydrated: aim for 0.5-1 oz water per lb bodyweight');

  return tips.slice(0, 5); // Return top 5 tips
}
