import { v4 as uuidv4 } from 'uuid';
import {
  WorkoutLog,
  WeeklySummary,
  ExerciseResponseProfile,
  StickingPointAnalysis,
  WearableData
} from './types';

// AI Coach module for Grappler Gains
// Generates weekly summaries, exercise response profiles, sticking point analysis,
// and contextual coach messages based on training data.

// --- Helpers ---

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getLogsInRange(logs: WorkoutLog[], start: Date, end: Date): WorkoutLog[] {
  return logs.filter(log => {
    const logDate = new Date(log.date);
    return logDate >= start && logDate <= end;
  });
}

function countPRs(logs: WorkoutLog[]): number {
  let prs = 0;
  for (const log of logs) {
    for (const ex of log.exercises) {
      if (ex.personalRecord) prs++;
    }
  }
  return prs;
}

function difficultyToNumeric(d: string): number {
  switch (d) {
    case 'too_easy': return 1;
    case 'just_right': return 2;
    case 'challenging': return 3;
    case 'too_hard': return 4;
    default: return 2;
  }
}

// --- Public Functions ---

/**
 * Generate a weekly summary from the past 7 days of workout logs.
 * Optionally incorporates wearable data for sleep/recovery insights.
 */
export function generateWeeklySummary(
  logs: WorkoutLog[],
  wearableData?: WearableData[]
): WeeklySummary {
  const weekEnd = new Date();
  const weekStart = daysAgo(7);

  const weekLogs = getLogsInRange(logs, weekStart, weekEnd);
  const completedLogs = weekLogs.filter(l => l.completed);

  const totalSessions = completedLogs.length;
  const totalVolume = completedLogs.reduce((sum, l) => sum + l.totalVolume, 0);
  const avgRPE = totalSessions > 0
    ? Math.round((completedLogs.reduce((sum, l) => sum + l.overallRPE, 0) / totalSessions) * 10) / 10
    : 0;
  const prsHit = countPRs(completedLogs);

  // Wearable aggregation
  let avgSleepScore: number | null = null;
  let avgRecoveryScore: number | null = null;

  if (wearableData && wearableData.length > 0) {
    const weekWearable = wearableData.filter(w => {
      const d = new Date(w.date);
      return d >= weekStart && d <= weekEnd;
    });

    const sleepEntries = weekWearable.filter(w => w.sleepScore !== null);
    if (sleepEntries.length > 0) {
      avgSleepScore = Math.round(
        sleepEntries.reduce((sum, w) => sum + (w.sleepScore ?? 0), 0) / sleepEntries.length
      );
    }

    const recoveryEntries = weekWearable.filter(w => w.recoveryScore !== null);
    if (recoveryEntries.length > 0) {
      avgRecoveryScore = Math.round(
        recoveryEntries.reduce((sum, w) => sum + (w.recoveryScore ?? 0), 0) / recoveryEntries.length
      );
    }
  }

  // --- Strengths ---
  const strengths: string[] = [];

  if (prsHit > 0) {
    strengths.push(`Hit ${prsHit} PR${prsHit > 1 ? 's' : ''} this week`);
  }

  if (totalSessions >= 3) {
    strengths.push(`Consistent training - ${totalSessions} sessions completed`);
  }

  if (avgRPE > 0 && avgRPE >= 7 && avgRPE <= 8.5) {
    strengths.push('RPE management on point - training in the productive zone');
  }

  if (totalVolume > 0) {
    strengths.push(`Total volume: ${totalVolume.toLocaleString()} across all sessions`);
  }

  const checkInCount = completedLogs.filter(l => l.preCheckIn).length;
  if (checkInCount === totalSessions && totalSessions > 0) {
    strengths.push('Completed pre-workout check-in for every session');
  }

  if (avgSleepScore !== null && avgSleepScore >= 75) {
    strengths.push(`Good sleep this week (avg score: ${avgSleepScore})`);
  }

  if (avgRecoveryScore !== null && avgRecoveryScore >= 70) {
    strengths.push(`Solid recovery scores (avg: ${avgRecoveryScore})`);
  }

  // --- Areas to Improve ---
  const areasToImprove: string[] = [];

  if (avgRPE > 9) {
    areasToImprove.push(
      `Average RPE of ${avgRPE} suggests you're pushing too hard - leave 1-2 reps in reserve`
    );
  }

  if (totalSessions < 2 && totalSessions > 0) {
    areasToImprove.push(
      `Only ${totalSessions} session this week - try to hit at least 2-3 for meaningful progress`
    );
  }

  if (totalSessions === 0) {
    areasToImprove.push('No completed sessions this week - even one session is better than none');
  }

  if (checkInCount < totalSessions && totalSessions > 0) {
    areasToImprove.push(
      `Only ${checkInCount}/${totalSessions} sessions had a pre-workout check-in - these help optimize your training`
    );
  }

  if (avgSleepScore !== null && avgSleepScore < 60) {
    areasToImprove.push(
      `Average sleep score of ${avgSleepScore} is low - prioritize sleep for better recovery`
    );
  }

  if (avgRecoveryScore !== null && avgRecoveryScore < 50) {
    areasToImprove.push(
      `Recovery score averaging ${avgRecoveryScore} - consider a lighter week or more rest days`
    );
  }

  const highSoreness = completedLogs.filter(l => l.soreness >= 7).length;
  if (highSoreness >= 2) {
    areasToImprove.push(
      `High soreness reported in ${highSoreness} sessions - may need to manage volume better`
    );
  }

  // --- Recommendation ---
  let recommendation = '';

  if (totalSessions === 0) {
    recommendation =
      'No training logged this week. Life happens - the key is getting back on the mat and in the gym. ' +
      'Start with a lighter session to ease back in rather than trying to make up for lost time.';
  } else if (avgRPE > 9 && highSoreness >= 2) {
    recommendation =
      'You pushed hard this week with high RPE and soreness. Consider starting next week with a slight deload ' +
      'or at minimum dropping your working weights by 5-10% for the first session. Recovery is where gains happen.';
  } else if (prsHit >= 2 && avgRPE <= 8.5) {
    recommendation =
      'Great week - you hit PRs while keeping intensity manageable. This is the sweet spot. ' +
      'Keep riding this wave but stay disciplined with RPE. Progressive overload does not mean maxing out every session.';
  } else if (totalSessions >= 3 && avgRPE >= 7 && avgRPE <= 8.5) {
    recommendation =
      'Solid, consistent week of training. You are building a good foundation. ' +
      'Focus on adding small increments of weight or reps next week. Consistency beats intensity over time.';
  } else if (avgRPE < 6.5 && totalSessions >= 2) {
    recommendation =
      'Your RPE is on the low side - you may not be pushing hard enough to drive adaptation. ' +
      'Try bumping up the weight slightly on your main lifts or adding a set to your accessory work.';
  } else {
    recommendation =
      'Decent week of training. Keep showing up, tracking your workouts, and listening to your body. ' +
      'Small, consistent progress compounds over time. Focus on executing each rep with intent.';
  }

  // --- Next Week Focus ---
  let nextWeekFocus = '';

  if (avgRPE > 9) {
    nextWeekFocus = 'Dial back intensity - aim for RPE 7-8 on main lifts and focus on quality reps';
  } else if (totalSessions < 2) {
    nextWeekFocus = 'Priority one: get to the gym consistently. Three sessions minimum.';
  } else if (prsHit > 0) {
    nextWeekFocus = 'Consolidate your PRs - repeat similar weights and aim for cleaner reps with lower RPE';
  } else if (avgSleepScore !== null && avgSleepScore < 60) {
    nextWeekFocus = 'Focus on recovery: aim for 7+ hours of sleep and manage training stress';
  } else {
    nextWeekFocus = 'Continue progressive overload on main lifts. Add a small increment or 1 rep where possible.';
  }

  return {
    id: uuidv4(),
    weekStart,
    weekEnd,
    totalSessions,
    totalVolume,
    avgRPE,
    avgSleepScore,
    avgRecoveryScore,
    prsHit,
    strengths,
    areasToImprove,
    recommendation,
    nextWeekFocus,
    generatedAt: new Date()
  };
}

/**
 * Build a response profile for a specific exercise based on historical workout logs.
 * Analyzes pump ratings, joint pain frequency, strength progression, volume response,
 * and determines the best rep range.
 */
export function generateExerciseProfile(
  exerciseId: string,
  exerciseName: string,
  logs: WorkoutLog[]
): ExerciseResponseProfile {
  // Collect all exercise entries matching this exercise across all logs
  const entries: { log: WorkoutLog; exerciseLog: (typeof logs[0]['exercises'])[0] }[] = [];

  for (const log of logs) {
    for (const ex of log.exercises) {
      if (ex.exerciseId === exerciseId) {
        entries.push({ log, exerciseLog: ex });
      }
    }
  }

  const totalSessions = entries.length;

  // --- Average pump rating ---
  const pumpEntries = entries.filter(e => e.exerciseLog.feedback?.pumpRating !== undefined);
  const avgPumpRating = pumpEntries.length > 0
    ? Math.round(
        (pumpEntries.reduce((sum, e) => sum + (e.exerciseLog.feedback?.pumpRating ?? 0), 0) /
          pumpEntries.length) *
          10
      ) / 10
    : 0;

  // --- Average difficulty (numeric 1-4) ---
  const diffEntries = entries.filter(e => e.exerciseLog.feedback?.difficulty !== undefined);
  const avgDifficulty = diffEntries.length > 0
    ? Math.round(
        (diffEntries.reduce(
          (sum, e) => sum + difficultyToNumeric(e.exerciseLog.feedback?.difficulty ?? 'just_right'),
          0
        ) /
          diffEntries.length) *
          10
      ) / 10
    : 2;

  // --- Joint pain frequency ---
  const feedbackEntries = entries.filter(e => e.exerciseLog.feedback !== undefined);
  const jointPainFrequency = feedbackEntries.length > 0
    ? Math.round(
        (feedbackEntries.filter(e => e.exerciseLog.feedback?.jointPain).length /
          feedbackEntries.length) *
          100
      ) / 100
    : 0;

  // --- Strength gain rate (% per week from estimated1RM progression) ---
  const rmEntries = entries
    .filter(e => e.exerciseLog.estimated1RM !== undefined && e.exerciseLog.estimated1RM > 0)
    .sort((a, b) => new Date(a.log.date).getTime() - new Date(b.log.date).getTime());

  let strengthGainRate = 0;
  if (rmEntries.length >= 2) {
    const first = rmEntries[0];
    const last = rmEntries[rmEntries.length - 1];
    const firstRM = first.exerciseLog.estimated1RM!;
    const lastRM = last.exerciseLog.estimated1RM!;
    const weeksSpan =
      (new Date(last.log.date).getTime() - new Date(first.log.date).getTime()) /
      (7 * 24 * 60 * 60 * 1000);

    if (weeksSpan > 0 && firstRM > 0) {
      strengthGainRate = Math.round(((lastRM - firstRM) / firstRM / weeksSpan) * 100 * 100) / 100;
    }
  }

  // --- Volume response ---
  // Compare sessions with higher vs lower set counts and see which yielded better pump/difficulty balance
  let volumeResponse: 'high' | 'moderate' | 'low' = 'moderate';
  if (pumpEntries.length >= 4) {
    const sorted = [...pumpEntries].sort(
      (a, b) => a.exerciseLog.sets.length - b.exerciseLog.sets.length
    );
    const lowerHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const upperHalf = sorted.slice(Math.floor(sorted.length / 2));

    const avgPumpLow =
      lowerHalf.reduce((s, e) => s + (e.exerciseLog.feedback?.pumpRating ?? 0), 0) /
      lowerHalf.length;
    const avgPumpHigh =
      upperHalf.reduce((s, e) => s + (e.exerciseLog.feedback?.pumpRating ?? 0), 0) /
      upperHalf.length;

    const pumpDelta = avgPumpHigh - avgPumpLow;
    if (pumpDelta > 1) {
      volumeResponse = 'high';
    } else if (pumpDelta < 0.3) {
      volumeResponse = 'low';
    }
  }

  // --- Best rep range ---
  // Find the rep range with the best sets (highest estimated1RM or highest pump)
  const repBuckets: Record<string, { count: number; totalPump: number; totalRM: number }> = {};

  for (const entry of entries) {
    for (const set of entry.exerciseLog.sets) {
      if (!set.completed) continue;
      let bucket: string;
      if (set.reps <= 5) bucket = '1-5';
      else if (set.reps <= 8) bucket = '6-8';
      else if (set.reps <= 12) bucket = '9-12';
      else bucket = '13+';

      if (!repBuckets[bucket]) {
        repBuckets[bucket] = { count: 0, totalPump: 0, totalRM: 0 };
      }
      repBuckets[bucket].count++;
      repBuckets[bucket].totalPump += entry.exerciseLog.feedback?.pumpRating ?? 0;
      repBuckets[bucket].totalRM += entry.exerciseLog.estimated1RM ?? 0;
    }
  }

  let bestRepRange = '6-8'; // default
  let bestScore = -1;
  for (const [range, data] of Object.entries(repBuckets)) {
    // Score = weighted combination of average pump and frequency
    const avgPump = data.count > 0 ? data.totalPump / data.count : 0;
    const score = avgPump * 2 + data.count * 0.5;
    if (score > bestScore) {
      bestScore = score;
      bestRepRange = range;
    }
  }

  // --- Recommendation ---
  let recommendation: 'increase' | 'maintain' | 'decrease' | 'swap' = 'maintain';

  if (jointPainFrequency > 0.4) {
    recommendation = 'swap';
  } else if (strengthGainRate > 1 && avgPumpRating >= 3) {
    recommendation = 'increase';
  } else if (strengthGainRate < -0.5 || avgPumpRating < 2) {
    recommendation = 'decrease';
  } else if (avgDifficulty >= 3.5 && jointPainFrequency > 0.2) {
    recommendation = 'decrease';
  }

  return {
    exerciseId,
    exerciseName,
    totalSessions,
    avgPumpRating,
    avgDifficulty,
    jointPainFrequency,
    strengthGainRate,
    volumeResponse,
    bestRepRange,
    recommendation,
    lastUpdated: new Date()
  };
}

/**
 * Analyze sticking points for a given exercise by examining RPE patterns,
 * failure reps, and weight ranges. Suggests accessory work to address weaknesses.
 */
export function analyzeStickingPoints(
  exerciseId: string,
  exerciseName: string,
  logs: WorkoutLog[]
): StickingPointAnalysis {
  // Gather all sets for this exercise
  const allSets: { weight: number; reps: number; rpe: number; setNumber: number }[] = [];

  for (const log of logs) {
    for (const ex of log.exercises) {
      if (ex.exerciseId === exerciseId) {
        for (const set of ex.sets) {
          if (set.completed) {
            allSets.push({
              weight: set.weight,
              reps: set.reps,
              rpe: set.rpe,
              setNumber: set.setNumber
            });
          }
        }
      }
    }
  }

  // --- Average RPE across all sets ---
  const avgRPE = allSets.length > 0
    ? Math.round((allSets.reduce((sum, s) => sum + s.rpe, 0) / allSets.length) * 10) / 10
    : 0;

  // --- Failure reps: which rep numbers tend to have the highest RPE (9.5+) ---
  const highRPESets = allSets.filter(s => s.rpe >= 9.5);
  const failureReps = Array.from(new Set(highRPESets.map(s => s.reps))).sort((a, b) => a - b);

  // --- RPE by weight bucket ---
  const weightMap = new Map<number, { totalRPE: number; count: number }>();
  for (const set of allSets) {
    // Round weight to nearest 5 for bucketing
    const bucket = Math.round(set.weight / 5) * 5;
    const existing = weightMap.get(bucket) ?? { totalRPE: 0, count: 0 };
    existing.totalRPE += set.rpe;
    existing.count++;
    weightMap.set(bucket, existing);
  }

  const rpeByWeight = Array.from(weightMap.entries())
    .map(([weight, data]) => ({
      weight,
      avgRPE: Math.round((data.totalRPE / data.count) * 10) / 10
    }))
    .sort((a, b) => a.weight - b.weight);

  // --- Determine sticking point ---
  // Heuristic: if failures happen at low reps (1-3), likely bottom-of-lift issue.
  // Mid-rep failures (4-7) suggest mid-range weakness.
  // Late failures (8+) suggest lockout weakness.
  let stickingPoint: 'bottom' | 'mid_range' | 'lockout' | 'unknown' = 'unknown';

  if (failureReps.length > 0) {
    const avgFailRep = failureReps.reduce((s, r) => s + r, 0) / failureReps.length;

    if (avgFailRep <= 3) {
      stickingPoint = 'bottom';
    } else if (avgFailRep <= 7) {
      stickingPoint = 'mid_range';
    } else {
      stickingPoint = 'lockout';
    }
  }

  // Also look at RPE pattern within sets - if later sets in a workout have disproportionately
  // higher RPE, it may indicate a muscular endurance issue (lockout fatigue)
  if (stickingPoint === 'unknown' && allSets.length >= 6) {
    const earlySetRPE = allSets
      .filter(s => s.setNumber <= 2)
      .reduce((sum, s) => sum + s.rpe, 0) /
      Math.max(1, allSets.filter(s => s.setNumber <= 2).length);
    const lateSetRPE = allSets
      .filter(s => s.setNumber >= 3)
      .reduce((sum, s) => sum + s.rpe, 0) /
      Math.max(1, allSets.filter(s => s.setNumber >= 3).length);

    if (lateSetRPE - earlySetRPE > 1.5) {
      stickingPoint = 'lockout';
    } else if (earlySetRPE > 8.5) {
      stickingPoint = 'bottom';
    }
  }

  // --- Suggested accessories based on sticking point ---
  const suggestedAccessories: string[] = [];
  let analysis = '';

  switch (stickingPoint) {
    case 'bottom':
      suggestedAccessories.push(
        'Paused reps (2-3 second pause at the bottom)',
        'Tempo work (3-1-2-0 tempo)',
        'Deficit variations for increased ROM',
        'Isometric holds at the weakest position'
      );
      analysis =
        `${exerciseName}: You appear to struggle off the bottom of the movement. ` +
        'This typically indicates a lack of strength at lengthened positions or poor bracing at the start of the concentric. ' +
        'Incorporate paused reps and tempo work to build strength in the hole. ' +
        'For grapplers, this translates to being stronger from disadvantaged positions.';
      break;

    case 'mid_range':
      suggestedAccessories.push(
        'Pin work (press/pull from pins at sticking point height)',
        'Accommodating resistance (bands or chains)',
        'Partial reps through the sticking zone',
        'Accessory isolation for the muscle group that fails mid-range'
      );
      analysis =
        `${exerciseName}: Your sticking point appears to be in the mid-range of the lift. ` +
        'This often indicates the transition between primary movers is the weak link. ' +
        'Pin work and accommodating resistance (bands/chains) will teach you to accelerate through this zone. ' +
        'This is common in compound lifts where leverage changes significantly.';
      break;

    case 'lockout':
      suggestedAccessories.push(
        'Board press / Block pulls / Rack pulls from above the knee',
        'Heavy holds and overloaded lockouts',
        'Tricep-focused work (close-grip bench, JM press)',
        'Glute-focused hip thrusts (for deadlift lockout)'
      );
      analysis =
        `${exerciseName}: You tend to struggle at lockout. ` +
        'This suggests the muscles responsible for the final portion of the lift need more targeted work. ' +
        'Heavy partial-range work and overloaded holds will build confidence and strength at the top. ' +
        'For grapplers, lockout strength is crucial for finishing takedowns and controlling position.';
      break;

    case 'unknown':
    default:
      suggestedAccessories.push(
        'General volume increase on the lift',
        'Variations at different tempos',
        'Unilateral work to address asymmetries'
      );
      analysis =
        `${exerciseName}: Not enough data to pinpoint a specific sticking point yet. ` +
        'Continue logging your sets with accurate RPE ratings, especially on heavier attempts. ' +
        'In the meantime, general practice with varied tempos and rep ranges will build overall strength.';
      break;
  }

  return {
    exerciseId,
    exerciseName,
    avgRPE,
    failureReps,
    rpeByWeight,
    suggestedAccessories,
    stickingPoint,
    analysis
  };
}

/**
 * Return a contextual coach message based on recent training data and streak.
 * Practical, direct, and non-cheesy.
 */
export function getCoachMessage(logs: WorkoutLog[], streakDays: number): string {
  const now = new Date();
  const threeDaysAgo = daysAgo(3);
  const sevenDaysAgo = daysAgo(7);

  const recentLogs = getLogsInRange(logs, threeDaysAgo, now).filter(l => l.completed);
  const weekLogs = getLogsInRange(logs, sevenDaysAgo, now).filter(l => l.completed);

  // No recent workouts
  if (weekLogs.length === 0) {
    if (streakDays === 0) {
      return (
        "It's been a while since your last session. No need to overthink it - " +
        'just get in, warm up, and do the work. Even a lighter session keeps the habit alive.'
      );
    }
    return (
      "You haven't logged a workout in over a week. " +
      'Momentum matters more than perfection. Get back in and pick up where you left off.'
    );
  }

  // Check for PRs in recent logs
  const recentPRs = countPRs(recentLogs);
  if (recentPRs > 0) {
    return (
      `You hit ${recentPRs} PR${recentPRs > 1 ? 's' : ''} recently. ` +
      'Solid progress. Now consolidate - repeat similar weights next session and focus on clean reps. ' +
      "Don't chase PRs every session; let them come to you."
    );
  }

  // High RPE trend
  const avgRecentRPE = recentLogs.length > 0
    ? recentLogs.reduce((sum, l) => sum + l.overallRPE, 0) / recentLogs.length
    : 0;

  if (avgRecentRPE > 9) {
    return (
      `Your average RPE over the last few sessions is ${avgRecentRPE.toFixed(1)}. ` +
      "That's grinding territory. Back off 5-10% on your working weights next session. " +
      'Productive training happens at RPE 7-8.5 most of the time. Save the grinders for competition.'
    );
  }

  // Low energy trend
  const lowEnergyCount = recentLogs.filter(l => l.energy <= 3).length;
  if (lowEnergyCount >= 2) {
    return (
      'Multiple sessions with low energy recently. Look at your sleep, nutrition, and overall stress. ' +
      'If you are deep into a training block, a deload might be overdue. ' +
      'Recovery is not optional - it is where adaptation happens.'
    );
  }

  // High streak acknowledgment
  if (streakDays > 14) {
    return (
      `${streakDays}-day training streak. That kind of consistency is what separates people who get results ` +
      'from those who just talk about it. Keep the intensity honest and the recovery dialed in.'
    );
  }

  if (streakDays > 7) {
    return (
      `${streakDays} days in a row showing up. Consistency is building. ` +
      'Make sure you are not just accumulating fatigue though - quality over quantity. ' +
      'A rest day is part of the program, not a failure.'
    );
  }

  // High soreness
  const highSorenessRecent = recentLogs.filter(l => l.soreness >= 7).length;
  if (highSorenessRecent >= 2) {
    return (
      'You have been reporting high soreness across multiple sessions. ' +
      'Consider foam rolling, extra sleep, or dropping volume for a session. ' +
      'Training through excessive soreness reduces workout quality and injury risk goes up.'
    );
  }

  // Default - solid training message
  if (weekLogs.length >= 3) {
    return (
      'Good training week so far. Keep logging your sets and RPE accurately - ' +
      "that data is what drives smart adjustments. Stay focused on execution, not just load."
    );
  }

  return (
    'Training is moving along. Remember: the best program is the one you execute consistently. ' +
    'Focus on each rep, track your feedback, and trust the process.'
  );
}
