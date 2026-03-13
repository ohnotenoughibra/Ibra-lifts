import type {
  WorkoutLog,
  InjuryEntry,
  BodyRegion,
  TrainingSession,
  WearableData,
  UserProfile,
  Exercise,
} from './types';
import { getExerciseById } from './exercises';

/** Filter out soft-deleted items */
function active<T>(arr: T[]): T[] {
  return arr.filter(item => !(item as Record<string, unknown>)._deleted);
}

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface InjuryRisk {
  id: string;
  category: 'overuse' | 'imbalance' | 'recovery' | 'technique' | 'volume';
  bodyRegion: BodyRegion | 'general';
  riskLevel: RiskLevel;
  title: string;
  description: string;
  recommendations: string[];
  relatedExercises?: string[];
  dataPoints?: string[];
}

export interface InjuryAnalysis {
  overallRisk: RiskLevel;
  risks: InjuryRisk[];
  positiveFactors: string[];
  weeklyLoadScore: number; // 0-100
  recoveryScore: number; // 0-100
  muscleBalanceScore: number; // 0-100
}

// High-risk movement patterns for common grappling injuries
const HIGH_RISK_PATTERNS = {
  neck: ['neck-curl', 'shrug', 'upright-row'],
  shoulder: ['overhead-press', 'lateral-raise', 'bench-press', 'dips'],
  elbow: ['skull-crusher', 'preacher-curl', 'tricep-extension'],
  wrist: ['wrist-curl', 'reverse-wrist-curl'],
  knee: ['leg-extension', 'leg-press', 'squat', 'lunges'],
  lower_back: ['deadlift', 'romanian-deadlift', 'good-morning', 'bent-row'],
};

// Muscle groups that need balance
const BALANCE_PAIRS: [string[], string[], string][] = [
  [['bench-press', 'dumbbell-press', 'push-up', 'incline-press'], ['bent-row', 'cable-row', 'pull-up', 'lat-pulldown'], 'Push/Pull'],
  [['quad-based', 'leg-extension', 'squat', 'leg-press'], ['hamstring-curl', 'romanian-deadlift', 'good-morning'], 'Quad/Hamstring'],
  [['bicep-curl', 'hammer-curl', 'preacher-curl'], ['skull-crusher', 'tricep-pushdown', 'dips'], 'Bicep/Tricep'],
];

/**
 * Analyze workout logs and detect injury risks.
 */
export function analyzeInjuryRisks(
  workoutLogs: WorkoutLog[],
  trainingHistory: TrainingSession[],
  injuries: InjuryEntry[],
  whoopData: WearableData | null,
  user: UserProfile | null
): InjuryAnalysis {
  workoutLogs = active(workoutLogs);
  trainingHistory = active(trainingHistory);
  injuries = active(injuries);

  const risks: InjuryRisk[] = [];
  const positiveFactors: string[] = [];

  // Get last 14 days of data
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const recentLogs = workoutLogs.filter(
    log => new Date(log.date) >= twoWeeksAgo
  );

  const recentTraining = trainingHistory.filter(
    s => new Date(s.date) >= twoWeeksAgo
  );

  const activeInjuries = injuries.filter(i => !i.resolved);

  // === 1. VOLUME ANALYSIS ===
  const { volumeRisks, weeklyLoadScore } = analyzeVolume(recentLogs, recentTraining);
  risks.push(...volumeRisks);

  // === 1b. ACWR (Acute:Chronic Workload Ratio) - Key injury predictor ===
  // Uses 4 weeks of data to compare acute vs chronic load (Gabbett research)
  const { acwr, acwrRisk } = calculateACWR(workoutLogs, trainingHistory);
  if (acwrRisk) {
    risks.push(acwrRisk);
  }

  // === 2. ACTIVE INJURY RISKS ===
  const injuryRisks = analyzeActiveInjuries(activeInjuries, recentLogs);
  risks.push(...injuryRisks);

  // === 3. MUSCLE IMBALANCE DETECTION ===
  const { balanceRisks, muscleBalanceScore } = analyzeMuscleBalance(recentLogs);
  risks.push(...balanceRisks);

  // === 4. RECOVERY ANALYSIS ===
  const { recoveryRisks, recoveryScore } = analyzeRecovery(whoopData, recentLogs, recentTraining);
  risks.push(...recoveryRisks);

  // === 5. OVERUSE PATTERN DETECTION ===
  const overuseRisks = detectOverusePatterns(recentLogs, recentTraining);
  risks.push(...overuseRisks);

  // === 6. COMBAT/TRAINING-SPECIFIC RISKS ===
  const combatRisks = analyzeCombatTrainingRisks(recentTraining, activeInjuries);
  risks.push(...combatRisks);

  // === POSITIVE FACTORS ===
  if (recentLogs.length >= 3 && recentLogs.length <= 5) {
    positiveFactors.push('Good training frequency (3-5 sessions/week)');
  }

  if (muscleBalanceScore >= 70) {
    positiveFactors.push('Well-balanced training program');
  }

  if (recoveryScore >= 70) {
    positiveFactors.push('Good recovery indicators');
  }

  if (activeInjuries.length === 0) {
    positiveFactors.push('No active injuries reported');
  }

  // ACWR in sweet spot is a positive factor
  if (acwr !== null && acwr >= 0.8 && acwr <= 1.3) {
    positiveFactors.push(`ACWR ${acwr.toFixed(2)} — in the optimal training zone`);
  }

  // Check for reduced volume weeks (simulating deload detection)
  if (recentLogs.length > 0) {
    const avgSetsPerSession = recentLogs.reduce((sum, log) =>
      sum + log.exercises.reduce((s, ex) => s + ex.sets.filter(set => set.completed).length, 0), 0
    ) / recentLogs.length;
    if (avgSetsPerSession < 12) {
      positiveFactors.push('Including lower-volume recovery sessions');
    }
  }

  // Calculate overall risk
  const overallRisk = calculateOverallRisk(risks);

  return {
    overallRisk,
    risks: risks.sort((a, b) => riskLevelValue(b.riskLevel) - riskLevelValue(a.riskLevel)),
    positiveFactors,
    weeklyLoadScore,
    recoveryScore,
    muscleBalanceScore,
  };
}

function riskLevelValue(level: RiskLevel): number {
  switch (level) {
    case 'critical': return 4;
    case 'high': return 3;
    case 'moderate': return 2;
    case 'low': return 1;
    default: return 0;
  }
}

function calculateOverallRisk(risks: InjuryRisk[]): RiskLevel {
  if (risks.some(r => r.riskLevel === 'critical')) return 'critical';
  if (risks.filter(r => r.riskLevel === 'high').length >= 2) return 'critical';
  if (risks.some(r => r.riskLevel === 'high')) return 'high';
  if (risks.filter(r => r.riskLevel === 'moderate').length >= 3) return 'high';
  if (risks.some(r => r.riskLevel === 'moderate')) return 'moderate';
  return 'low';
}

function analyzeVolume(logs: WorkoutLog[], trainingSessions: TrainingSession[]): {
  volumeRisks: InjuryRisk[];
  weeklyLoadScore: number;
} {
  const risks: InjuryRisk[] = [];

  // Count total weekly sessions
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const weekLogs = logs.filter(l => new Date(l.date) >= oneWeekAgo);
  const weekTraining = trainingSessions.filter(s => new Date(s.date) >= oneWeekAgo);

  const totalSessions = weekLogs.length + weekTraining.length;
  const trainingMinutes = weekTraining.reduce((sum, s) => sum + s.duration, 0);

  // Weekly load score (optimal is 4-6 sessions, 2-4 hours grappling)
  let weeklyLoadScore = 100;

  if (totalSessions > 8) {
    risks.push({
      id: 'high-volume-week',
      category: 'volume',
      bodyRegion: 'general',
      riskLevel: 'high',
      title: 'High Training Volume',
      description: `${totalSessions} training sessions this week is significantly above optimal.`,
      recommendations: [
        'Consider taking 1-2 rest days',
        'Reduce intensity on remaining sessions',
        'Focus on recovery: sleep, nutrition, mobility',
      ],
    });
    weeklyLoadScore -= 30;
  } else if (totalSessions > 6) {
    risks.push({
      id: 'elevated-volume',
      category: 'volume',
      bodyRegion: 'general',
      riskLevel: 'moderate',
      title: 'Elevated Training Volume',
      description: `${totalSessions} sessions this week. Monitor for fatigue.`,
      recommendations: [
        'Ensure adequate sleep (7-9 hours)',
        'May need an extra rest day soon',
      ],
    });
    weeklyLoadScore -= 15;
  }

  if (trainingMinutes > 300) {
    risks.push({
      id: 'high-training-volume',
      category: 'volume',
      bodyRegion: 'general',
      riskLevel: 'moderate',
      title: 'High Combat Training Volume',
      description: `${Math.round(trainingMinutes / 60)} hours of combat training this week.`,
      recommendations: [
        'Focus on technique over intensity',
        'Include more drilling, less live sparring',
        'Prioritize neck and shoulder mobility',
      ],
    });
    weeklyLoadScore -= 15;
  }

  // Check for sudden volume spikes
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const prevWeekLogs = logs.filter(l => {
    const d = new Date(l.date);
    return d >= twoWeeksAgo && d < oneWeekAgo;
  });

  if (weekLogs.length >= prevWeekLogs.length * 1.5 && prevWeekLogs.length > 0) {
    risks.push({
      id: 'volume-spike',
      category: 'volume',
      bodyRegion: 'general',
      riskLevel: 'high',
      title: 'Sudden Volume Increase',
      description: 'Training volume increased by 50%+ from last week.',
      recommendations: [
        'Gradual increases (10-20%/week) are safer',
        'Consider adding rest days',
        'Prioritize sleep and recovery',
      ],
    });
    weeklyLoadScore -= 25;
  }

  return { volumeRisks: risks, weeklyLoadScore: Math.max(0, weeklyLoadScore) };
}

/**
 * Calculate Acute:Chronic Workload Ratio (ACWR) - a key injury prediction metric.
 *
 * Coupled ACWR via EWMA (Williams et al. 2017, Borgstrom et al. 2024).
 * Thresholds validated with this methodology (Gabbett 2016).
 *
 * Uses exponentially weighted moving averages (EWMA) to compute coupled ACWR:
 * - Acute EWMA:  lambda_a = 2/(7+1)  = 0.25,  applied daily
 * - Chronic EWMA: lambda_c = 2/(28+1) = ~0.069, applied daily
 * - EWMA_today = load_today * lambda + EWMA_yesterday * (1 - lambda)
 * - ACWR = acute_EWMA / chronic_EWMA
 *
 * Risk zones (Gabbett 2016):
 * - 0.8-1.3: "Sweet spot" - low injury risk, optimal training adaptation
 * - 1.3-1.5: Moderate risk - caution advised
 * - >1.5: High risk - significantly elevated injury probability
 * - <0.8: Undertraining - may lose fitness, also slightly elevated injury risk
 */
function calculateACWR(logs: WorkoutLog[], trainingSessions: TrainingSession[]): {
  acwr: number | null;
  acwrRisk: InjuryRisk | null;
  acuteLoad: number;
  chronicLoad: number;
} {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // EWMA decay constants
  const LAMBDA_ACUTE = 2 / (7 + 1);    // 0.25
  const LAMBDA_CHRONIC = 2 / (28 + 1);  // ~0.069

  // Build a per-day load array for the last 28 days, oldest first
  const dailyLoads: number[] = [];
  for (let daysAgo = 27; daysAgo >= 0; daysAgo--) {
    const dayStart = new Date(now);
    dayStart.setDate(dayStart.getDate() - daysAgo);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // Sum workout volume for this day
    const dayLiftingLoad = logs
      .filter(l => {
        const d = new Date(l.date);
        d.setHours(0, 0, 0, 0);
        return d >= dayStart && d < dayEnd;
      })
      .reduce((sum, l) => sum + l.totalVolume, 0);

    // Sum training session load (duration x intensity factor)
    const dayTrainingLoad = trainingSessions
      .filter(s => {
        const d = new Date(s.date);
        d.setHours(0, 0, 0, 0);
        return d >= dayStart && d < dayEnd;
      })
      .reduce((sum, s) => {
        const intensity = s.actualIntensity || s.plannedIntensity;
        const intensityMultiplier =
          intensity === 'light_flow' ? 0.5 :
          intensity === 'moderate' ? 0.75 :
          intensity === 'hard_sparring' ? 1.0 :
          intensity === 'competition_prep' ? 1.25 : 0.75;
        return sum + (s.duration * intensityMultiplier * 100); // Scale to be comparable with lifting volume
      }, 0);

    dailyLoads.push(dayLiftingLoad + dayTrainingLoad);
  }

  // Compute EWMA sequentially over the 28-day window
  let acuteEWMA = dailyLoads[0];
  let chronicEWMA = dailyLoads[0];

  for (let i = 1; i < dailyLoads.length; i++) {
    acuteEWMA = dailyLoads[i] * LAMBDA_ACUTE + acuteEWMA * (1 - LAMBDA_ACUTE);
    chronicEWMA = dailyLoads[i] * LAMBDA_CHRONIC + chronicEWMA * (1 - LAMBDA_CHRONIC);
  }

  const acuteLoad = acuteEWMA;
  const chronicLoad = chronicEWMA;

  // Need at least some chronic load data to calculate meaningful ACWR
  // With EWMA, a very small chronic value means insufficient training history
  if (chronicLoad < 50) {
    return { acwr: null, acwrRisk: null, acuteLoad, chronicLoad };
  }

  const acwr = acuteLoad / chronicLoad;

  // Generate risk based on ACWR
  let acwrRisk: InjuryRisk | null = null;

  if (acwr > 1.5) {
    acwrRisk = {
      id: 'high-acwr',
      category: 'volume',
      bodyRegion: 'general',
      riskLevel: acwr > 2.0 ? 'critical' : 'high',
      title: 'Dangerous Workload Spike',
      description: `ACWR of ${acwr.toFixed(2)} (>1.5 = high injury risk). Training load has increased too rapidly.`,
      recommendations: [
        'Reduce training volume by 20-30% this week',
        'Avoid high-intensity sessions for 3-5 days',
        'Gradual load increases (<10%/week) are safer',
        'Research shows ACWR >1.5 dramatically increases injury risk',
      ],
      dataPoints: [
        `This week: ${Math.round(acuteLoad).toLocaleString()} load units`,
        `4-week avg: ${Math.round(chronicLoad).toLocaleString()} load units`,
      ],
    };
  } else if (acwr > 1.3) {
    acwrRisk = {
      id: 'elevated-acwr',
      category: 'volume',
      bodyRegion: 'general',
      riskLevel: 'moderate',
      title: 'Elevated Workload Ratio',
      description: `ACWR of ${acwr.toFixed(2)} is in the caution zone (1.3-1.5).`,
      recommendations: [
        'Monitor for signs of fatigue and soreness',
        'Consider maintaining (not increasing) volume this week',
        'Extra focus on recovery: sleep, nutrition, mobility',
      ],
      dataPoints: [
        `This week: ${Math.round(acuteLoad).toLocaleString()} load units`,
        `4-week avg: ${Math.round(chronicLoad).toLocaleString()} load units`,
      ],
    };
  } else if (acwr < 0.8 && acuteLoad > 0) {
    acwrRisk = {
      id: 'low-acwr',
      category: 'volume',
      bodyRegion: 'general',
      riskLevel: 'low',
      title: 'Undertraining Warning',
      description: `ACWR of ${acwr.toFixed(2)} (<0.8) - training less than your body is adapted to.`,
      recommendations: [
        'You may be losing fitness adaptations',
        'If intentional deload, this is fine for 1 week',
        'Otherwise, gradually return to normal training',
      ],
      dataPoints: [
        `This week: ${Math.round(acuteLoad).toLocaleString()} load units`,
        `4-week avg: ${Math.round(chronicLoad).toLocaleString()} load units`,
      ],
    };
  }

  return { acwr, acwrRisk, acuteLoad, chronicLoad };
}

function analyzeActiveInjuries(injuries: InjuryEntry[], logs: WorkoutLog[]): InjuryRisk[] {
  const risks: InjuryRisk[] = [];

  for (const injury of injuries) {
    // Check if user is training exercises that stress the injured area
    const riskyExercises = HIGH_RISK_PATTERNS[
      injury.bodyRegion.replace('left_', '').replace('right_', '') as keyof typeof HIGH_RISK_PATTERNS
    ];

    if (riskyExercises) {
      const recentlyTrained = logs.some(log =>
        log.exercises.some(ex =>
          riskyExercises.some(risky => ex.exerciseId.includes(risky))
        )
      );

      if (recentlyTrained) {
        risks.push({
          id: `active-injury-${injury.id}`,
          category: 'technique',
          bodyRegion: injury.bodyRegion,
          riskLevel: injury.severity >= 4 ? 'critical' : injury.severity >= 3 ? 'high' : 'moderate',
          title: `Training on Injured ${injury.bodyRegion.replace(/_/g, ' ')}`,
          description: `Active ${injury.painType} pain (${injury.severity}/5) while training exercises that stress this area.`,
          recommendations: [
            'Consider avoiding exercises that stress this area',
            'Use lighter weights and higher reps',
            'Focus on pain-free range of motion',
            injury.severity >= 4 ? 'Strongly consider rest or medical consultation' : 'Monitor closely',
          ],
          relatedExercises: riskyExercises,
        });
      }
    }
  }

  return risks;
}

function analyzeMuscleBalance(logs: WorkoutLog[]): {
  balanceRisks: InjuryRisk[];
  muscleBalanceScore: number;
} {
  const risks: InjuryRisk[] = [];
  let muscleBalanceScore = 100;

  // Count sets per muscle group
  const muscleCounts: Record<string, number> = {};

  for (const log of logs) {
    for (const ex of log.exercises) {
      const exercise = getExerciseById(ex.exerciseId);
      if (exercise) {
        for (const muscle of exercise.primaryMuscles) {
          muscleCounts[muscle] = (muscleCounts[muscle] || 0) + ex.sets.filter(s => s.completed).length;
        }
      }
    }
  }

  // Check push/pull balance
  const pushMuscles = ['Chest', 'Front Delts', 'Triceps'];
  const pullMuscles = ['Back', 'Rear Delts', 'Biceps'];

  const pushSets = pushMuscles.reduce((sum, m) => sum + (muscleCounts[m] || 0), 0);
  const pullSets = pullMuscles.reduce((sum, m) => sum + (muscleCounts[m] || 0), 0);

  if (pushSets > 0 && pullSets > 0) {
    const ratio = pushSets / pullSets;
    if (ratio > 1.5) {
      risks.push({
        id: 'push-pull-imbalance',
        category: 'imbalance',
        bodyRegion: 'left_shoulder',
        riskLevel: ratio > 2 ? 'high' : 'moderate',
        title: 'Push/Pull Imbalance',
        description: `${Math.round(ratio * 100)}% more pushing than pulling volume.`,
        recommendations: [
          'Add more rows, pull-ups, and rear delt work',
          'Balance can prevent shoulder issues common in grapplers',
          'Aim for 1:1 or slightly more pulling',
        ],
        dataPoints: [`Push: ${pushSets} sets`, `Pull: ${pullSets} sets`],
      });
      muscleBalanceScore -= 20;
    } else if (ratio < 0.67) {
      risks.push({
        id: 'pull-push-imbalance',
        category: 'imbalance',
        bodyRegion: 'chest',
        riskLevel: 'moderate',
        title: 'Pull-Heavy Training',
        description: 'Significantly more pulling than pushing volume.',
        recommendations: [
          'Add more pressing movements',
          'Some push work protects shoulders',
        ],
        dataPoints: [`Push: ${pushSets} sets`, `Pull: ${pullSets} sets`],
      });
      muscleBalanceScore -= 10;
    }
  }

  // Check quad/hamstring balance (critical for knee health)
  const quadSets = muscleCounts['Quads'] || 0;
  const hamSets = muscleCounts['Hamstrings'] || 0;

  if (quadSets > 0 && hamSets > 0) {
    const ratio = quadSets / hamSets;
    if (ratio > 2) {
      risks.push({
        id: 'quad-ham-imbalance',
        category: 'imbalance',
        bodyRegion: 'left_knee',
        riskLevel: 'high',
        title: 'Quad/Hamstring Imbalance',
        description: 'Quad-dominant training increases knee injury risk.',
        recommendations: [
          'Add Romanian deadlifts and hamstring curls',
          'Nordic curls are excellent for grapplers',
          'Balanced legs protect knees during guard play',
        ],
        dataPoints: [`Quads: ${quadSets} sets`, `Hamstrings: ${hamSets} sets`],
      });
      muscleBalanceScore -= 25;
    }
  }

  return { balanceRisks: risks, muscleBalanceScore: Math.max(0, muscleBalanceScore) };
}

function analyzeRecovery(
  whoopData: WearableData | null,
  logs: WorkoutLog[],
  trainingSessions: TrainingSession[]
): {
  recoveryRisks: InjuryRisk[];
  recoveryScore: number;
} {
  const risks: InjuryRisk[] = [];
  let recoveryScore = 70; // Default if no Whoop data

  if (whoopData) {
    const recovery = whoopData.recoveryScore ?? 50;
    const sleep = whoopData.sleepHours ?? 7;

    recoveryScore = recovery;

    if (recovery < 33) {
      risks.push({
        id: 'low-recovery',
        category: 'recovery',
        bodyRegion: 'general',
        riskLevel: 'high',
        title: 'Low Recovery Score',
        description: `Recovery at ${recovery}% - body needs rest.`,
        recommendations: [
          'Consider a rest or light mobility day',
          'Prioritize 8+ hours of sleep tonight',
          'Focus on nutrition and hydration',
          'If training, reduce intensity significantly',
        ],
      });
    } else if (recovery < 50) {
      risks.push({
        id: 'moderate-recovery',
        category: 'recovery',
        bodyRegion: 'general',
        riskLevel: 'moderate',
        title: 'Below Average Recovery',
        description: `Recovery at ${recovery}% - train smart.`,
        recommendations: [
          'Good day for technique work over hard sparring',
          'Lighter weights, focus on form',
          'Extra mobility work recommended',
        ],
      });
    }

    if (sleep < 6) {
      risks.push({
        id: 'poor-sleep',
        category: 'recovery',
        bodyRegion: 'general',
        riskLevel: 'moderate',
        title: 'Insufficient Sleep',
        description: `Only ${sleep.toFixed(1)} hours of sleep - injury risk elevated.`,
        recommendations: [
          'Reaction time and coordination are impaired',
          'Consider postponing hard training',
          'Prioritize sleep tonight',
        ],
      });
      recoveryScore -= 15;
    }
  }

  // Check for consecutive training days
  const sortedLogs = [...logs, ...trainingSessions.map(s => ({ date: s.date }))]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let consecutiveDays = 0;
  let prevDate: Date | null = null;

  for (const log of sortedLogs) {
    const logDate = new Date(log.date);
    logDate.setHours(0, 0, 0, 0);

    if (prevDate) {
      const dayDiff = (prevDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24);
      if (dayDiff === 1) {
        consecutiveDays++;
      } else {
        break;
      }
    }
    prevDate = logDate;
  }

  if (consecutiveDays >= 5) {
    risks.push({
      id: 'consecutive-days',
      category: 'recovery',
      bodyRegion: 'general',
      riskLevel: 'high',
      title: 'No Rest Days',
      description: `${consecutiveDays}+ consecutive training days without rest.`,
      recommendations: [
        'Take a complete rest day',
        'Active recovery (light walk, stretching) is okay',
        'Rest is when adaptation happens',
      ],
    });
    recoveryScore -= 20;
  } else if (consecutiveDays >= 3) {
    risks.push({
      id: 'consecutive-days-moderate',
      category: 'recovery',
      bodyRegion: 'general',
      riskLevel: 'moderate',
      title: 'Multiple Consecutive Training Days',
      description: `${consecutiveDays} days in a row - consider rest soon.`,
      recommendations: [
        'Plan a rest or light day soon',
        'Monitor for fatigue and soreness',
      ],
    });
    recoveryScore -= 10;
  }

  return { recoveryRisks: risks, recoveryScore: Math.max(0, recoveryScore) };
}

function detectOverusePatterns(logs: WorkoutLog[], trainingSessions: TrainingSession[]): InjuryRisk[] {
  const risks: InjuryRisk[] = [];

  // Track exercise frequency
  const exerciseFrequency: Record<string, number> = {};

  for (const log of logs) {
    for (const ex of log.exercises) {
      exerciseFrequency[ex.exerciseId] = (exerciseFrequency[ex.exerciseId] || 0) + 1;
    }
  }

  // Flag exercises done more than 4x in 2 weeks
  for (const [exerciseId, count] of Object.entries(exerciseFrequency)) {
    if (count >= 5) {
      const exercise = getExerciseById(exerciseId);
      risks.push({
        id: `overuse-${exerciseId}`,
        category: 'overuse',
        bodyRegion: 'general',
        riskLevel: count >= 7 ? 'high' : 'moderate',
        title: `High Frequency: ${exercise?.name || exerciseId}`,
        description: `This exercise was performed ${count} times in 2 weeks.`,
        recommendations: [
          'Consider exercise variety for the same muscle group',
          'Rotate between similar movements',
          'Overuse of one pattern can lead to repetitive strain',
        ],
      });
    }
  }

  return risks;
}

function analyzeCombatTrainingRisks(trainingSessions: TrainingSession[], injuries: InjuryEntry[]): InjuryRisk[] {
  const risks: InjuryRisk[] = [];

  // Check for high-intensity training frequency
  const hardSessions = trainingSessions.filter(s => {
    const intensity = s.actualIntensity || s.plannedIntensity;
    return intensity === 'hard_sparring' || intensity === 'competition_prep';
  });

  if (hardSessions.length >= 4) {
    risks.push({
      id: 'high-intensity-training',
      category: 'volume',
      bodyRegion: 'general',
      riskLevel: hardSessions.length >= 6 ? 'high' : 'moderate',
      title: 'Frequent Hard Sparring',
      description: `${hardSessions.length} hard training sessions in 2 weeks.`,
      recommendations: [
        'Include more flow/light work and drilling',
        'Hard sparring 2-3x/week is typically sufficient',
        'Protect your training partners and yourself',
      ],
    });
  }

  // Check for grappling-specific risks
  const grapplingCategories = ['grappling', 'mma'];
  const hasGrappling = trainingSessions.some(s => grapplingCategories.includes(s.category));

  // Check for striking-specific risks
  const strikingCategories = ['striking', 'mma'];
  const hasStriking = trainingSessions.some(s => strikingCategories.includes(s.category));

  const hasNeckInjury = injuries.some(i => i.bodyRegion === 'neck' && !i.resolved);
  const hasShoulderInjury = injuries.some(i =>
    (i.bodyRegion === 'left_shoulder' || i.bodyRegion === 'right_shoulder') && !i.resolved
  );
  const hasWristInjury = injuries.some(i =>
    (i.bodyRegion === 'left_wrist' || i.bodyRegion === 'right_wrist') && !i.resolved
  );

  if (hasGrappling) {
    if (!hasNeckInjury) {
      risks.push({
        id: 'grappling-neck-prevention',
        category: 'technique',
        bodyRegion: 'neck',
        riskLevel: 'low',
        title: 'Neck Health Reminder',
        description: 'Grapplers are at elevated risk for neck issues.',
        recommendations: [
          'Include neck strengthening exercises',
          'Never force neck bridges - build gradually',
          'Tap early to submissions involving the neck',
        ],
      });
    }

    if (!hasShoulderInjury) {
      risks.push({
        id: 'grappling-shoulder-prevention',
        category: 'technique',
        bodyRegion: 'left_shoulder',
        riskLevel: 'low',
        title: 'Shoulder Health Reminder',
        description: 'Shoulders are vulnerable in grappling.',
        recommendations: [
          'Strengthen rotator cuff regularly',
          'Dont fight kimuras with strength - tap and reset',
          'Include face pulls and external rotation work',
        ],
      });
    }
  }

  if (hasStriking) {
    if (!hasWristInjury) {
      risks.push({
        id: 'striking-wrist-prevention',
        category: 'technique',
        bodyRegion: 'left_wrist',
        riskLevel: 'low',
        title: 'Wrist Health Reminder',
        description: 'Strikers need strong, stable wrists.',
        recommendations: [
          'Always wrap hands properly for heavy bag work',
          'Include wrist strengthening and mobility',
          'Focus on proper punch form to protect wrists',
        ],
      });
    }

    if (!hasShoulderInjury) {
      risks.push({
        id: 'striking-shoulder-prevention',
        category: 'technique',
        bodyRegion: 'left_shoulder',
        riskLevel: 'low',
        title: 'Shoulder Endurance Reminder',
        description: 'Striking requires shoulder endurance.',
        recommendations: [
          'Build shoulder endurance with high-rep work',
          'Strengthen rotator cuff to prevent overuse',
          'Include mobility work for overhead positions',
        ],
      });
    }
  }

  return risks;
}

/**
 * Get personalized prehab exercises based on analysis.
 */
export function getPrehabRecommendations(analysis: InjuryAnalysis): {
  exercise: string;
  sets: string;
  frequency: string;
  reason: string;
}[] {
  const prehab: ReturnType<typeof getPrehabRecommendations> = [];

  // Base recommendations for all grapplers
  prehab.push({
    exercise: 'Face Pulls',
    sets: '3x15-20',
    frequency: '3x/week',
    reason: 'Shoulder health and posture',
  });

  prehab.push({
    exercise: 'Dead Hang',
    sets: '3x30-60s',
    frequency: 'Daily',
    reason: 'Grip endurance and shoulder decompression',
  });

  // Add based on risks
  const hasShoulderRisk = analysis.risks.some(r =>
    r.bodyRegion === 'left_shoulder' || r.bodyRegion === 'right_shoulder'
  );

  if (hasShoulderRisk) {
    prehab.push({
      exercise: 'External Rotation',
      sets: '3x15',
      frequency: '3x/week',
      reason: 'Rotator cuff strength',
    });
  }

  const hasKneeRisk = analysis.risks.some(r =>
    r.bodyRegion === 'left_knee' || r.bodyRegion === 'right_knee'
  );

  if (hasKneeRisk) {
    prehab.push({
      exercise: 'Nordic Curls',
      sets: '3x5-8',
      frequency: '2x/week',
      reason: 'Hamstring strength for knee protection',
    });
  }

  const hasBackRisk = analysis.risks.some(r =>
    r.bodyRegion === 'lower_back' || r.bodyRegion === 'upper_back'
  );

  if (hasBackRisk) {
    prehab.push({
      exercise: 'Cat-Cow + Bird Dog',
      sets: '2x10 each',
      frequency: 'Daily',
      reason: 'Spine mobility and core stability',
    });
  }

  return prehab;
}
