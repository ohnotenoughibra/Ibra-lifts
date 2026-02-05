import {
  WorkoutLog,
  ExerciseLog,
  ExerciseFeedback,
  PreWorkoutCheckIn,
  PostWorkoutFeedback,
  WorkoutAdjustment,
  WorkoutSession,
  ExercisePrescription,
  WhoopWorkout,
  WearableData
} from './types';

// RP-style auto-adjustment engine
// Analyzes previous workout feedback and adjusts next workout parameters

export interface ReadinessScore {
  score: number; // 0-100
  factors: string[];
  recommendation: 'reduce' | 'maintain' | 'increase';
}

// Personal baseline for HRV and RHR (calculated from rolling average)
export interface PersonalBaseline {
  hrvBaseline: number | null;  // 7-14 day rolling average HRV
  rhrBaseline: number | null;  // 7-14 day rolling average RHR
  hrvStdDev: number | null;    // Standard deviation for HRV
  rhrStdDev: number | null;    // Standard deviation for RHR
}

/**
 * Calculate personal baseline from wearable history (7-14 day rolling average).
 * This is more scientifically accurate than using absolute thresholds since
 * HRV and RHR vary significantly between individuals.
 */
export function calculatePersonalBaseline(wearableHistory: WearableData[]): PersonalBaseline {
  // Use last 14 days of data
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const recentData = wearableHistory.filter(w => {
    const date = new Date(w.date);
    return date >= fourteenDaysAgo;
  });

  // Extract valid HRV values
  const hrvValues = recentData
    .filter(w => w.hrv !== null && w.hrv > 0)
    .map(w => w.hrv!);

  // Extract valid RHR values
  const rhrValues = recentData
    .filter(w => w.restingHR !== null && w.restingHR > 0)
    .map(w => w.restingHR!);

  // Calculate HRV baseline and standard deviation
  let hrvBaseline: number | null = null;
  let hrvStdDev: number | null = null;
  if (hrvValues.length >= 3) {
    hrvBaseline = hrvValues.reduce((sum, v) => sum + v, 0) / hrvValues.length;
    const hrvVariance = hrvValues.reduce((sum, v) => sum + Math.pow(v - hrvBaseline!, 2), 0) / hrvValues.length;
    hrvStdDev = Math.sqrt(hrvVariance);
  }

  // Calculate RHR baseline and standard deviation
  let rhrBaseline: number | null = null;
  let rhrStdDev: number | null = null;
  if (rhrValues.length >= 3) {
    rhrBaseline = rhrValues.reduce((sum, v) => sum + v, 0) / rhrValues.length;
    const rhrVariance = rhrValues.reduce((sum, v) => sum + Math.pow(v - rhrBaseline!, 2), 0) / rhrValues.length;
    rhrStdDev = Math.sqrt(rhrVariance);
  }

  return { hrvBaseline, rhrBaseline, hrvStdDev, rhrStdDev };
}

// Calculate athlete readiness from pre-workout check-in
export function calculateReadiness(checkIn: PreWorkoutCheckIn): ReadinessScore {
  const factors: string[] = [];
  let score = 50; // baseline

  // Sleep quality (big factor - accounts for up to 20 points)
  const sleepScore = (checkIn.sleepQuality / 5) * 20;
  score += sleepScore - 10;
  if (checkIn.sleepQuality <= 2) factors.push('Poor sleep quality detected');
  if (checkIn.sleepQuality >= 4) factors.push('Good sleep quality');

  // Sleep hours (7-9 is optimal)
  if (checkIn.sleepHours >= 7 && checkIn.sleepHours <= 9) {
    score += 10;
    factors.push('Adequate sleep duration');
  } else if (checkIn.sleepHours < 6) {
    score -= 15;
    factors.push('Sleep deprived - consider reducing volume');
  } else if (checkIn.sleepHours < 7) {
    score -= 5;
    factors.push('Slightly under-slept');
  }

  // Nutrition
  switch (checkIn.nutrition) {
    case 'full_meal':
      score += 10;
      factors.push('Well-fueled');
      break;
    case 'light_meal':
      score += 5;
      factors.push('Light nutrition - adequate');
      break;
    case 'fasted':
      score -= 10;
      factors.push('Training fasted - may affect performance');
      break;
    case 'heavy_meal':
      score -= 5;
      factors.push('Heavy meal - may feel sluggish');
      break;
  }

  // Stress (1-5, lower is better for training)
  if (checkIn.stress >= 4) {
    score -= 15;
    factors.push('High stress - prioritize recovery');
  } else if (checkIn.stress <= 2) {
    score += 10;
    factors.push('Low stress - great for performance');
  }

  // Soreness (1-5, lower is better)
  if (checkIn.soreness >= 4) {
    score -= 20;
    factors.push('High soreness - reduce volume or deload');
  } else if (checkIn.soreness >= 3) {
    score -= 10;
    factors.push('Moderate soreness - adjust intensity');
  } else if (checkIn.soreness <= 1) {
    score += 5;
    factors.push('Fully recovered');
  }

  // Motivation (1-5)
  if (checkIn.motivation >= 4) {
    score += 5;
    factors.push('High motivation');
  } else if (checkIn.motivation <= 2) {
    score -= 10;
    factors.push('Low motivation - possible accumulated fatigue');
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  let recommendation: 'reduce' | 'maintain' | 'increase';
  if (score < 35) recommendation = 'reduce';
  else if (score > 65) recommendation = 'increase';
  else recommendation = 'maintain';

  return { score, factors, recommendation };
}

// Calculate adjustments based on exercise-level feedback from previous session
export function calculateExerciseAdjustments(
  exerciseLog: ExerciseLog,
  feedback: ExerciseFeedback | undefined,
  previousLogs: ExerciseLog[]
): WorkoutAdjustment[] {
  const adjustments: WorkoutAdjustment[] = [];

  if (!feedback) return adjustments;

  const lastWeight = exerciseLog.sets.length > 0
    ? exerciseLog.sets.reduce((max, s) => Math.max(max, s.weight), 0)
    : 0;
  const lastSets = exerciseLog.sets.length;

  // Difficulty-based weight adjustment
  switch (feedback.difficulty) {
    case 'too_easy':
      // Increase weight by 5-10%
      const easyIncrease = Math.max(5, Math.round(lastWeight * 0.05 / 5) * 5);
      adjustments.push({
        exerciseId: feedback.exerciseId,
        exerciseName: exerciseLog.exerciseName,
        adjustmentType: 'weight',
        oldValue: lastWeight,
        newValue: lastWeight + easyIncrease,
        reason: 'Previous session was too easy - increasing weight'
      });
      break;
    case 'too_hard':
      // Decrease weight by 5-10%
      const hardDecrease = Math.max(5, Math.round(lastWeight * 0.07 / 5) * 5);
      adjustments.push({
        exerciseId: feedback.exerciseId,
        exerciseName: exerciseLog.exerciseName,
        adjustmentType: 'weight',
        oldValue: lastWeight,
        newValue: Math.max(0, lastWeight - hardDecrease),
        reason: 'Previous session was too hard - reducing weight for quality reps'
      });
      break;
    case 'challenging':
      // Perfect - small increase (2.5-5%)
      const challengeIncrease = Math.max(2.5, Math.round(lastWeight * 0.025 / 2.5) * 2.5);
      adjustments.push({
        exerciseId: feedback.exerciseId,
        exerciseName: exerciseLog.exerciseName,
        adjustmentType: 'weight',
        oldValue: lastWeight,
        newValue: lastWeight + challengeIncrease,
        reason: 'Good challenge level - progressive overload'
      });
      break;
    case 'just_right':
      // Maintain for this session, tiny bump
      break;
  }

  // Pump-based set adjustment (RP-style MV/MEV/MRV concept)
  if (feedback.pumpRating <= 2 && feedback.difficulty !== 'too_hard') {
    // Low pump and not too hard = probably need more volume
    adjustments.push({
      exerciseId: feedback.exerciseId,
      exerciseName: exerciseLog.exerciseName,
      adjustmentType: 'sets',
      oldValue: lastSets,
      newValue: Math.min(lastSets + 1, 6),
      reason: 'Low stimulus - adding a set for more muscle activation'
    });
  } else if (feedback.pumpRating >= 5 && feedback.difficulty === 'too_hard') {
    // Great pump but too hard = might be at MRV, drop a set
    adjustments.push({
      exerciseId: feedback.exerciseId,
      exerciseName: exerciseLog.exerciseName,
      adjustmentType: 'sets',
      oldValue: lastSets,
      newValue: Math.max(lastSets - 1, 2),
      reason: 'Maximum recoverable volume reached - reducing sets'
    });
  }

  // Joint pain = swap recommendation
  if (feedback.jointPain) {
    adjustments.push({
      exerciseId: feedback.exerciseId,
      exerciseName: exerciseLog.exerciseName,
      adjustmentType: 'swap',
      oldValue: 0,
      newValue: 0,
      reason: `Joint pain reported${feedback.jointPainLocation ? ` in ${feedback.jointPainLocation}` : ''} - recommend exercise swap`
    });
  }

  // Want to swap flag
  if (feedback.wantToSwap) {
    adjustments.push({
      exerciseId: feedback.exerciseId,
      exerciseName: exerciseLog.exerciseName,
      adjustmentType: 'swap',
      oldValue: 0,
      newValue: 0,
      reason: 'User requested exercise swap'
    });
  }

  return adjustments;
}

// Calculate session-level adjustments from post-workout feedback
export function calculateSessionAdjustments(
  postFeedback: PostWorkoutFeedback,
  readinessScore: ReadinessScore
): { volumeMultiplier: number; intensityMultiplier: number; message: string } {
  let volumeMultiplier = 1.0;
  let intensityMultiplier = 1.0;
  const messages: string[] = [];

  // Performance vs expectations
  switch (postFeedback.overallPerformance) {
    case 'worse_than_expected':
      volumeMultiplier *= 0.9;
      intensityMultiplier *= 0.95;
      messages.push('Below expected performance - slight reduction applied');
      break;
    case 'better_than_expected':
      volumeMultiplier *= 1.05;
      intensityMultiplier *= 1.02;
      messages.push('Exceeding expectations - small progression applied');
      break;
    case 'as_expected':
      // Normal progression
      volumeMultiplier *= 1.02;
      messages.push('On track - standard progression');
      break;
  }

  // High RPE session
  if (postFeedback.overallRPE >= 9.5) {
    volumeMultiplier *= 0.9;
    messages.push('Very high session RPE - reducing next session volume');
  } else if (postFeedback.overallRPE <= 6) {
    volumeMultiplier *= 1.05;
    intensityMultiplier *= 1.02;
    messages.push('Low session RPE - can handle more');
  }

  // Energy level
  if (postFeedback.energy <= 2) {
    volumeMultiplier *= 0.85;
    messages.push('Very low post-workout energy - significant fatigue detected');
  }

  // Mood (low mood after training can indicate overreaching)
  if (postFeedback.mood <= 2) {
    volumeMultiplier *= 0.9;
    messages.push('Low mood post-training may indicate accumulated fatigue');
  }

  // Readiness-based further adjustment
  if (readinessScore.recommendation === 'reduce') {
    volumeMultiplier *= 0.9;
    intensityMultiplier *= 0.95;
    messages.push('Pre-workout readiness was low');
  } else if (readinessScore.recommendation === 'increase') {
    volumeMultiplier *= 1.03;
  }

  // Clamp multipliers to reasonable ranges
  volumeMultiplier = Math.max(0.7, Math.min(1.2, volumeMultiplier));
  intensityMultiplier = Math.max(0.85, Math.min(1.1, intensityMultiplier));

  return {
    volumeMultiplier,
    intensityMultiplier,
    message: messages.join('. ')
  };
}

// Apply adjustments to a workout session
export function applyAdjustmentsToSession(
  session: WorkoutSession,
  previousLog: WorkoutLog | null,
  preCheckIn: PreWorkoutCheckIn | null
): { adjustedSession: WorkoutSession; adjustments: WorkoutAdjustment[]; readiness: ReadinessScore | null } {
  const allAdjustments: WorkoutAdjustment[] = [];
  let adjustedSession = { ...session };
  let readiness: ReadinessScore | null = null;

  // Calculate readiness if check-in provided
  if (preCheckIn) {
    readiness = calculateReadiness(preCheckIn);
  }

  // Get exercise-level adjustments from previous workout
  if (previousLog) {
    for (const exerciseLog of previousLog.exercises) {
      const exerciseAdjustments = calculateExerciseAdjustments(
        exerciseLog,
        exerciseLog.feedback,
        []
      );
      allAdjustments.push(...exerciseAdjustments);
    }

    // Get session-level adjustments
    if (previousLog.postFeedback && readiness) {
      const sessionAdj = calculateSessionAdjustments(previousLog.postFeedback, readiness);

      // Apply volume and intensity multipliers to all exercises
      adjustedSession = {
        ...adjustedSession,
        exercises: adjustedSession.exercises.map(ex => {
          // Find matching exercise adjustment
          const exerciseAdj = allAdjustments.filter(a => a.exerciseId === ex.exerciseId);

          let adjustedSets = ex.sets;
          let adjustedRPE = ex.prescription.rpe;

          // Apply exercise-specific adjustments
          for (const adj of exerciseAdj) {
            if (adj.adjustmentType === 'sets') {
              adjustedSets = adj.newValue;
            }
          }

          // Apply session-level multipliers
          adjustedSets = Math.max(2, Math.round(adjustedSets * sessionAdj.volumeMultiplier));
          adjustedRPE = Math.max(5, Math.min(10, adjustedRPE * sessionAdj.intensityMultiplier));

          return {
            ...ex,
            sets: adjustedSets,
            prescription: {
              ...ex.prescription,
              rpe: Math.round(adjustedRPE * 10) / 10
            }
          };
        })
      };
    }

    // Apply readiness-only adjustments (no previous feedback)
    if (!previousLog.postFeedback && readiness) {
      if (readiness.recommendation === 'reduce') {
        adjustedSession = {
          ...adjustedSession,
          exercises: adjustedSession.exercises.map(ex => ({
            ...ex,
            sets: Math.max(2, ex.sets - 1),
            prescription: {
              ...ex.prescription,
              rpe: Math.max(5, ex.prescription.rpe - 1)
            }
          }))
        };
      }
    }
  }

  // If no previous log but we have readiness, adjust based on readiness alone
  if (!previousLog && readiness) {
    if (readiness.recommendation === 'reduce') {
      adjustedSession = {
        ...adjustedSession,
        exercises: adjustedSession.exercises.map(ex => ({
          ...ex,
          sets: Math.max(2, ex.sets - 1),
          prescription: {
            ...ex.prescription,
            rpe: Math.max(5, ex.prescription.rpe - 1)
          }
        }))
      };
      allAdjustments.push({
        exerciseId: 'session',
        exerciseName: 'All exercises',
        adjustmentType: 'deload',
        oldValue: 0,
        newValue: 0,
        reason: 'Low readiness score - reducing volume and intensity'
      });
    }
  }

  return { adjustedSession, adjustments: allAdjustments, readiness };
}

// Get suggested weight for next session based on previous performance
export function getSuggestedWeight(
  exerciseId: string,
  previousLogs: WorkoutLog[]
): number | null {
  // Find the most recent log containing this exercise (search from newest to oldest)
  const sortedLogs = [...previousLogs].reverse();
  for (const log of sortedLogs) {
    const exerciseLog = log.exercises.find(e => e.exerciseId === exerciseId);
    if (exerciseLog && exerciseLog.sets.length > 0) {
      // Get the working weight (highest weight used)
      const maxWeight = exerciseLog.sets.reduce((max, s) => Math.max(max, s.weight), 0);

      // If they had feedback
      if (exerciseLog.feedback) {
        switch (exerciseLog.feedback.difficulty) {
          case 'too_easy':
            return maxWeight + Math.max(5, Math.round(maxWeight * 0.05 / 5) * 5);
          case 'too_hard':
            return Math.max(0, maxWeight - Math.max(5, Math.round(maxWeight * 0.07 / 5) * 5));
          case 'challenging':
            return maxWeight + Math.max(2.5, Math.round(maxWeight * 0.025 / 2.5) * 2.5);
          default:
            return maxWeight;
        }
      }

      return maxWeight;
    }
  }
  return null;
}

// Get per-set weight/reps from the most recent session for an exercise
// Used to prefill each set individually instead of using the same weight for all
export function getPreviousSessionSets(
  exerciseId: string,
  previousLogs: WorkoutLog[]
): { weight: number; reps: number }[] | null {
  const sortedLogs = [...previousLogs].reverse();
  for (const log of sortedLogs) {
    const exerciseLog = log.exercises.find(e => e.exerciseId === exerciseId);
    if (exerciseLog && exerciseLog.sets.length > 0) {
      const completedSets = exerciseLog.sets.filter(s => s.completed);
      if (completedSets.length === 0) continue;
      return completedSets.map(s => ({ weight: s.weight, reps: s.reps }));
    }
  }
  return null;
}

// Determine if a deload is needed based on accumulated fatigue signals
export function shouldDeload(recentLogs: WorkoutLog[]): { needed: boolean; reason: string } {
  if (recentLogs.length < 3) return { needed: false, reason: '' };

  const recent = recentLogs.slice(0, 5);

  // Check for declining performance
  const avgRPE = recent.reduce((sum, l) => sum + l.overallRPE, 0) / recent.length;
  const avgEnergy = recent.reduce((sum, l) => sum + l.energy, 0) / recent.length;
  const avgSoreness = recent.reduce((sum, l) => sum + l.soreness, 0) / recent.length;

  if (avgRPE >= 9 && avgSoreness >= 7) {
    return { needed: true, reason: 'Consistently high RPE with high soreness - accumulated fatigue detected' };
  }

  if (avgEnergy <= 3 && avgRPE >= 8) {
    return { needed: true, reason: 'Low energy with high perceived effort - recovery capacity may be compromised' };
  }

  // Check post-workout feedback if available
  const feedbackLogs = recent.filter(l => l.postFeedback);
  if (feedbackLogs.length >= 3) {
    const worseThanExpected = feedbackLogs.filter(l => l.postFeedback?.overallPerformance === 'worse_than_expected');
    if (worseThanExpected.length >= 2) {
      return { needed: true, reason: 'Multiple sessions below expected performance - consider a deload week' };
    }

    const avgMood = feedbackLogs.reduce((sum, l) => sum + (l.postFeedback?.mood || 3), 0) / feedbackLogs.length;
    if (avgMood <= 2) {
      return { needed: true, reason: 'Consistently low training mood - possible overreaching' };
    }
  }

  return { needed: false, reason: '' };
}

// Convert Whoop recovery score to readiness adjustments
// Now uses personal baseline for HRV/RHR instead of absolute thresholds
export function whoopRecoveryToReadiness(
  whoopData: {
    recoveryScore?: number; // 0-100
    hrvMs?: number;
    restingHR?: number;
    sleepScore?: number; // 0-100
    skinTempC?: number;
    respiratoryRate?: number;
    strainScore?: number; // 0-21
    spo2?: number; // 90-100%
    sleepEfficiency?: number; // 0-100%
    deepSleepMinutes?: number;
    sleepHours?: number;
    sleepNeededHours?: number;
    sleepConsistency?: number; // 0-100%
    sleepDisturbances?: number;
  },
  baseline?: PersonalBaseline | null
): ReadinessScore {
  const factors: string[] = [];
  let score = 50;

  if (whoopData.recoveryScore !== undefined) {
    // Whoop recovery is 0-100, map it directly
    score = whoopData.recoveryScore;
    if (whoopData.recoveryScore >= 67) factors.push(`Whoop recovery: ${whoopData.recoveryScore}% (green)`);
    else if (whoopData.recoveryScore >= 34) factors.push(`Whoop recovery: ${whoopData.recoveryScore}% (yellow)`);
    else factors.push(`Whoop recovery: ${whoopData.recoveryScore}% (red — consider rest day)`);
  }

  // HRV Analysis - compare to personal baseline (scientifically accurate)
  if (whoopData.hrvMs !== undefined) {
    if (baseline?.hrvBaseline && baseline.hrvStdDev) {
      // Compare to personal baseline using standard deviations
      const deviation = whoopData.hrvMs - baseline.hrvBaseline;
      const deviationPercent = (deviation / baseline.hrvBaseline) * 100;

      if (deviation > baseline.hrvStdDev) {
        // HRV is 1+ std dev above personal baseline = well recovered
        score += 5;
        factors.push(`HRV: ${whoopData.hrvMs}ms (+${deviationPercent.toFixed(0)}% above your baseline — excellent recovery)`);
      } else if (deviation < -baseline.hrvStdDev * 1.5) {
        // HRV is 1.5+ std dev below baseline = poor recovery
        score -= 10;
        factors.push(`HRV: ${whoopData.hrvMs}ms (${deviationPercent.toFixed(0)}% below your baseline — recovery impaired)`);
      } else if (deviation < -baseline.hrvStdDev * 0.5) {
        // HRV is moderately below baseline
        score -= 5;
        factors.push(`HRV: ${whoopData.hrvMs}ms (slightly below your ${baseline.hrvBaseline.toFixed(0)}ms baseline)`);
      } else {
        factors.push(`HRV: ${whoopData.hrvMs}ms (within your normal range)`);
      }
    } else {
      // No baseline available - use population averages as fallback with note
      // Research shows athletic population HRV typically 55-105ms
      if (whoopData.hrvMs > 90) {
        score += 3;
        factors.push(`HRV: ${whoopData.hrvMs}ms (good — baseline data building)`);
      } else if (whoopData.hrvMs < 35) {
        score -= 5;
        factors.push(`HRV: ${whoopData.hrvMs}ms (low — baseline data building)`);
      } else {
        factors.push(`HRV: ${whoopData.hrvMs}ms (building your baseline)`);
      }
    }
  }

  if (whoopData.sleepScore !== undefined) {
    if (whoopData.sleepScore >= 85) { score += 5; factors.push(`Sleep score: ${whoopData.sleepScore}%`); }
    else if (whoopData.sleepScore < 50) { score -= 10; factors.push(`Poor sleep: ${whoopData.sleepScore}%`); }
  }

  if (whoopData.strainScore !== undefined && whoopData.strainScore > 15) {
    score -= 10;
    factors.push(`High previous strain: ${whoopData.strainScore.toFixed(1)}`);
  }

  // --- New metrics from Whoop API v2 ---

  // Deep sleep: critical for muscle recovery and growth hormone release
  if (whoopData.deepSleepMinutes !== undefined) {
    if (whoopData.deepSleepMinutes >= 60) {
      score += 5;
      factors.push(`Deep sleep: ${whoopData.deepSleepMinutes}min (excellent)`);
    } else if (whoopData.deepSleepMinutes < 30) {
      score -= 8;
      factors.push(`Low deep sleep: ${whoopData.deepSleepMinutes}min — recovery impaired`);
    }
  }

  // Sleep efficiency: time asleep vs time in bed
  if (whoopData.sleepEfficiency !== undefined) {
    if (whoopData.sleepEfficiency >= 90) {
      score += 3;
    } else if (whoopData.sleepEfficiency < 75) {
      score -= 5;
      factors.push(`Low sleep efficiency: ${whoopData.sleepEfficiency.toFixed(0)}%`);
    }
  }

  // Sleep debt: actual hours vs needed hours
  if (whoopData.sleepHours !== undefined && whoopData.sleepNeededHours !== undefined) {
    const debt = whoopData.sleepHours - whoopData.sleepNeededHours;
    if (debt < -1.5) {
      score -= 10;
      factors.push(`Sleep debt: ${debt.toFixed(1)}hrs under your need`);
    } else if (debt < -0.5) {
      score -= 4;
      factors.push(`Mild sleep debt: ${Math.abs(debt).toFixed(1)}hrs short`);
    }
  }

  // Sleep consistency: irregular schedules hurt recovery
  if (whoopData.sleepConsistency !== undefined && whoopData.sleepConsistency < 60) {
    score -= 4;
    factors.push(`Irregular sleep schedule (${whoopData.sleepConsistency.toFixed(0)}% consistency)`);
  }

  // SpO2: low blood oxygen indicates altitude, illness, or overtraining
  if (whoopData.spo2 !== undefined && whoopData.spo2 < 95) {
    score -= 8;
    factors.push(`Low SpO2: ${whoopData.spo2.toFixed(0)}% — possible illness or overtraining`);
  }

  // Resting HR Analysis - compare to personal baseline (scientifically accurate)
  if (whoopData.restingHR !== undefined) {
    if (baseline?.rhrBaseline && baseline.rhrStdDev) {
      // Compare to personal baseline - elevated RHR signals incomplete recovery
      const deviation = whoopData.restingHR - baseline.rhrBaseline;
      const deviationPercent = (deviation / baseline.rhrBaseline) * 100;

      if (deviation > baseline.rhrStdDev * 1.5) {
        // RHR is 1.5+ std dev above baseline = poor recovery / stress
        score -= 8;
        factors.push(`Resting HR: ${whoopData.restingHR}bpm (+${deviationPercent.toFixed(0)}% above your baseline — incomplete recovery)`);
      } else if (deviation > baseline.rhrStdDev) {
        // RHR is moderately elevated
        score -= 4;
        factors.push(`Resting HR: ${whoopData.restingHR}bpm (slightly elevated from your ${baseline.rhrBaseline.toFixed(0)}bpm baseline)`);
      } else if (deviation < -baseline.rhrStdDev) {
        // RHR is below baseline = well recovered
        score += 3;
        factors.push(`Resting HR: ${whoopData.restingHR}bpm (below your baseline — well recovered)`);
      } else {
        factors.push(`Resting HR: ${whoopData.restingHR}bpm (within your normal range)`);
      }
    } else {
      // No baseline available - use minimal population-based adjustments with note
      // Note: These are very conservative since individual variation is huge
      if (whoopData.restingHR > 80) {
        score -= 3;
        factors.push(`Resting HR: ${whoopData.restingHR}bpm (baseline data building)`);
      } else if (whoopData.restingHR < 45) {
        score += 2;
        factors.push(`Resting HR: ${whoopData.restingHR}bpm (building your baseline)`);
      } else {
        factors.push(`Resting HR: ${whoopData.restingHR}bpm (building your baseline)`);
      }
    }
  }

  // Sleep disturbances: fragmented sleep reduces recovery quality
  if (whoopData.sleepDisturbances !== undefined && whoopData.sleepDisturbances > 10) {
    score -= 4;
    factors.push(`Restless night: ${whoopData.sleepDisturbances} disturbances`);
  }

  score = Math.max(0, Math.min(100, score));

  let recommendation: 'reduce' | 'maintain' | 'increase';
  if (score < 35) recommendation = 'reduce';
  else if (score > 65) recommendation = 'increase';
  else recommendation = 'maintain';

  return { score, factors, recommendation };
}

// Merge manual pre-check-in readiness with Whoop-derived readiness
export function mergeReadinessScores(manual: ReadinessScore | null, whoop: ReadinessScore | null): ReadinessScore {
  if (!manual && !whoop) return { score: 50, factors: [], recommendation: 'maintain' };
  if (!manual) return whoop!;
  if (!whoop) return manual;

  // Weighted average: 40% manual, 60% Whoop (objective data gets more weight)
  const score = Math.round(manual.score * 0.4 + whoop.score * 0.6);
  const factors = [...whoop.factors, ...manual.factors];

  let recommendation: 'reduce' | 'maintain' | 'increase';
  if (score < 35) recommendation = 'reduce';
  else if (score > 65) recommendation = 'increase';
  else recommendation = 'maintain';

  return { score, factors, recommendation };
}

/**
 * Match a Whoop workout to an app workout log by time overlap.
 * Finds the Whoop workout whose time window best overlaps with the app log's
 * start/end window (start = log.date - duration, end = log.date).
 * Returns the HR data to attach to the log, or undefined if no match.
 */
export function matchWhoopWorkout(
  logDate: Date,
  logDurationMinutes: number,
  whoopWorkouts: WhoopWorkout[],
): WorkoutLog['whoopHR'] | undefined {
  if (!whoopWorkouts || whoopWorkouts.length === 0) return undefined;

  const logEnd = new Date(logDate).getTime();
  const logStart = logEnd - logDurationMinutes * 60 * 1000;

  // Allow 30-minute tolerance on each side for matching
  const TOLERANCE_MS = 30 * 60 * 1000;

  let bestMatch: WhoopWorkout | undefined;
  let bestOverlap = 0;

  for (const ww of whoopWorkouts) {
    const wwStart = new Date(ww.start).getTime();
    const wwEnd = new Date(ww.end).getTime();

    // Calculate overlap between [logStart-tol, logEnd+tol] and [wwStart, wwEnd]
    const overlapStart = Math.max(logStart - TOLERANCE_MS, wwStart);
    const overlapEnd = Math.min(logEnd + TOLERANCE_MS, wwEnd);
    const overlap = Math.max(0, overlapEnd - overlapStart);

    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      bestMatch = ww;
    }
  }

  // Require at least 10 minutes of overlap to count as a match
  if (!bestMatch || bestOverlap < 10 * 60 * 1000) return undefined;

  return {
    avgHR: bestMatch.avgHR ?? 0,
    maxHR: bestMatch.maxHR ?? 0,
    strain: bestMatch.strain ?? 0,
    calories: bestMatch.calories ?? 0,
    zones: bestMatch.zones.length > 0 ? bestMatch.zones : undefined,
  };
}
