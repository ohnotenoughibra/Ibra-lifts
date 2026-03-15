/**
 * Smart Block Suggestion Engine
 *
 * Analyzes current mesocycle performance, training trends, and recovery
 * data to recommend what the next training block should focus on.
 *
 * Science references:
 * - Zourdos et al. 2016: Daily 1RM tracking for autoregulation
 * - Haff & Triplett 2016: Periodization theory (Essentials of S&C)
 * - Israetel et al. 2019: Scientific Principles of Hypertrophy Training
 * - Stone et al. 2007: Block periodization model for strength athletes
 */

import type {
  BlockSuggestion,
  BlockFocus,
  Mesocycle,
  WorkoutLog,
  TrainingSession,
  InjuryEntry,
  WearableData,
  MealEntry,
  UserProfile,
  GoalFocus,
  MuscleGroup,
  NutritionPeriodPlan,
  PlannedMesocycle,
} from './types';
import { getExerciseById } from './exercises';
import { getRecommendedTrainingFocus, getActivePhaseContext } from './periodization-planner';
import { toLocalDateStr } from './utils';

/** Filter out soft-deleted items */
function active<T>(arr: T[]): T[] {
  return arr.filter(item => !(item as Record<string, unknown>)._deleted);
}

// ── Analysis Helpers ────────────────────────────────────────────────────

interface PerformanceTrend {
  exerciseId: string;
  exerciseName: string;
  estimated1RMs: { date: string; value: number }[];
  trend: 'progressing' | 'plateau' | 'declining';
  trendPercent: number; // positive = improving
}

interface MuscleGroupAnalysis {
  muscle: MuscleGroup;
  weeklySetCount: number;
  avgPumpRating: number;
  avgDifficulty: number;
  prCount: number;
  status: 'undertrained' | 'optimal' | 'high_volume';
}

// Brzycki 1993, validated across all rep ranges (Reynolds et al. 2006, Pereira et al. 2020)
function calculateE1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight / (1.0278 - 0.0278 * reps);
}

function analyzeStrengthTrends(logs: WorkoutLog[]): PerformanceTrend[] {
  // Group best e1RM per exercise per session
  const exerciseData = new Map<string, { date: string; e1rm: number; name: string }[]>();

  for (const log of logs) {
    const dateStr = toLocalDateStr(log.date);
    for (const ex of log.exercises) {
      let bestE1RM = 0;
      for (const set of ex.sets) {
        if (set.completed && set.weight > 0 && set.reps > 0) {
          const e1rm = calculateE1RM(set.weight, set.reps);
          if (e1rm > bestE1RM) bestE1RM = e1rm;
        }
      }
      if (bestE1RM > 0) {
        const existing = exerciseData.get(ex.exerciseId) || [];
        existing.push({ date: dateStr, e1rm: bestE1RM, name: ex.exerciseName });
        exerciseData.set(ex.exerciseId, existing);
      }
    }
  }

  const trends: PerformanceTrend[] = [];

  for (const [exerciseId, data] of Array.from(exerciseData.entries())) {
    if (data.length < 2) continue;

    // Sort by date
    data.sort((a, b) => a.date.localeCompare(b.date));

    // Compare first half vs second half average
    const midpoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midpoint);
    const secondHalf = data.slice(midpoint);

    const firstAvg = firstHalf.reduce((s, d) => s + d.e1rm, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, d) => s + d.e1rm, 0) / secondHalf.length;

    const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;

    let trend: PerformanceTrend['trend'];
    if (changePercent > 2) trend = 'progressing';
    else if (changePercent < -2) trend = 'declining';
    else trend = 'plateau';

    trends.push({
      exerciseId,
      exerciseName: data[0].name,
      estimated1RMs: data.map(d => ({ date: d.date, value: Math.round(d.e1rm) })),
      trend,
      trendPercent: Math.round(changePercent * 10) / 10,
    });
  }

  return trends;
}

function analyzeMuscleGroups(logs: WorkoutLog[]): MuscleGroupAnalysis[] {
  const weekCount = Math.max(1, Math.ceil(logs.length / 4)); // rough estimate
  const muscleData = new Map<MuscleGroup, {
    sets: number;
    pumpRatings: number[];
    difficulties: number[];
    prs: number;
  }>();

  for (const log of logs) {
    for (const ex of log.exercises) {
      const exercise = getExerciseById(ex.exerciseId);
      if (!exercise) continue;

      const completedSets = ex.sets.filter(s => s.completed).length;
      const difficultyMap = { too_easy: 1, just_right: 2, challenging: 3, too_hard: 4 };

      for (const muscle of exercise.primaryMuscles) {
        const existing = muscleData.get(muscle) || { sets: 0, pumpRatings: [], difficulties: [], prs: 0 };
        existing.sets += completedSets;
        if (ex.feedback?.pumpRating) existing.pumpRatings.push(ex.feedback.pumpRating);
        if (ex.feedback?.difficulty) existing.difficulties.push(difficultyMap[ex.feedback.difficulty] || 2);
        if (ex.personalRecord) existing.prs++;
        muscleData.set(muscle, existing);
      }

      // Secondary muscles get half credit
      for (const muscle of exercise.secondaryMuscles) {
        const existing = muscleData.get(muscle) || { sets: 0, pumpRatings: [], difficulties: [], prs: 0 };
        existing.sets += Math.floor(completedSets * 0.5);
        muscleData.set(muscle, existing);
      }
    }
  }

  const analyses: MuscleGroupAnalysis[] = [];

  for (const [muscle, data] of Array.from(muscleData.entries())) {
    const weeklySets = data.sets / weekCount;
    const avgPump = data.pumpRatings.length > 0
      ? data.pumpRatings.reduce((s, v) => s + v, 0) / data.pumpRatings.length
      : 0;
    const avgDiff = data.difficulties.length > 0
      ? data.difficulties.reduce((s, v) => s + v, 0) / data.difficulties.length
      : 0;

    // MEV/MAV/MRV boundaries (simplified)
    let status: MuscleGroupAnalysis['status'];
    if (weeklySets < 8) status = 'undertrained';
    else if (weeklySets <= 18) status = 'optimal';
    else status = 'high_volume';

    analyses.push({
      muscle,
      weeklySetCount: Math.round(weeklySets),
      avgPumpRating: Math.round(avgPump * 10) / 10,
      avgDifficulty: Math.round(avgDiff * 10) / 10,
      prCount: data.prs,
      status,
    });
  }

  return analyses;
}

function calculateFatigueScore(logs: WorkoutLog[]): number {
  if (logs.length === 0) return 0;

  // Recent RPE trend (last 4 sessions)
  const recent = logs.slice(-4);
  const avgRPE = recent.reduce((s, l) => s + l.overallRPE, 0) / recent.length;

  // Soreness trend
  const avgSoreness = recent.reduce((s, l) => s + l.soreness, 0) / recent.length;

  // Performance trend (worse_than_expected vs better_than_expected)
  const perfScores: number[] = recent.map(l => {
    if (!l.postFeedback) return 0;
    if (l.postFeedback.overallPerformance === 'worse_than_expected') return -1;
    if (l.postFeedback.overallPerformance === 'better_than_expected') return 1;
    return 0;
  });
  const avgPerf = perfScores.reduce((s, v) => s + v, 0) / perfScores.length;

  // Fatigue score: 0 (fresh) to 100 (exhausted)
  let fatigue = 0;
  fatigue += Math.max(0, (avgRPE - 7) * 20); // RPE 7=0, 8=20, 9=40, 10=60
  fatigue += Math.max(0, (avgSoreness - 5) * 8); // Soreness 5=0, 7=16, 10=40
  fatigue += avgPerf < 0 ? 15 : 0; // Declining performance

  return Math.min(100, Math.round(fatigue));
}

// ── Main Suggestion Engine ──────────────────────────────────────────────

export function suggestNextBlock(opts: {
  user: UserProfile | null;
  currentMesocycle: Mesocycle | null;
  mesocycleHistory: Mesocycle[];
  workoutLogs: WorkoutLog[];
  trainingSessions: TrainingSession[];
  injuryLog: InjuryEntry[];
  wearableHistory: WearableData[];
  competitions: { date: Date; type: string }[];
  nutritionPeriodPlan?: NutritionPeriodPlan | null;
  mesocycleQueue?: PlannedMesocycle[];
}): BlockSuggestion {
  opts = {
    ...opts,
    workoutLogs: active(opts.workoutLogs),
    trainingSessions: active(opts.trainingSessions),
    injuryLog: active(opts.injuryLog),
    wearableHistory: active(opts.wearableHistory),
  };

  // ── Queue-first: if user has queued blocks, that IS the plan ──────────
  if (opts.mesocycleQueue && opts.mesocycleQueue.length > 0) {
    const next = opts.mesocycleQueue[0];
    const goalToFocus: Record<GoalFocus, BlockFocus> = {
      strength: 'strength',
      hypertrophy: 'hypertrophy',
      power: 'power',
      balanced: 'base_building',
      strength_endurance: 'base_building',
    };
    return {
      recommendedFocus: goalToFocus[next.focus],
      confidence: 100,
      reasoning: [
        `Your queued block "${next.name}" is up next`,
        `${next.weeks} weeks · ${next.focus} focus · ${next.periodization || 'undulating'} periodization`,
        opts.mesocycleQueue.length > 1
          ? `${opts.mesocycleQueue.length - 1} more block${opts.mesocycleQueue.length > 2 ? 's' : ''} queued after this`
          : 'This is the only block in your queue',
      ],
      suggestedWeeks: next.weeks,
      keyMetrics: [
        { label: 'Source', value: 'Your queue', trend: 'stable' as const },
        { label: 'Queue depth', value: `${opts.mesocycleQueue.length} block${opts.mesocycleQueue.length > 1 ? 's' : ''}`, trend: 'stable' as const },
      ],
      weakPoints: [],
      strongPoints: [],
      isFromQueue: true,
    };
  }

  const reasoning: string[] = [];
  const keyMetrics: BlockSuggestion['keyMetrics'] = [];
  let confidence = 50; // baseline

  // 1. Get recent logs (this mesocycle or last 6 weeks)
  const sixWeeksAgo = new Date();
  sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);
  const recentLogs = opts.workoutLogs.filter(l => new Date(l.date) >= sixWeeksAgo);

  // 2. Analyze strength trends
  const strengthTrends = analyzeStrengthTrends(recentLogs);
  const plateauCount = strengthTrends.filter(t => t.trend === 'plateau').length;
  const decliningCount = strengthTrends.filter(t => t.trend === 'declining').length;
  const progressingCount = strengthTrends.filter(t => t.trend === 'progressing').length;

  keyMetrics.push({
    label: 'Exercises progressing',
    value: `${progressingCount}/${strengthTrends.length}`,
    trend: progressingCount > plateauCount ? 'up' : plateauCount > 0 ? 'stable' : 'down',
  });

  // 3. Analyze muscle groups
  const muscleAnalysis = analyzeMuscleGroups(recentLogs);
  const weakPoints = muscleAnalysis
    .filter(m => m.status === 'undertrained')
    .map(m => m.muscle);
  const strongPoints = muscleAnalysis
    .filter(m => m.prCount > 0 && m.status === 'optimal')
    .map(m => m.muscle);

  // 4. Calculate fatigue
  const fatigue = calculateFatigueScore(recentLogs);
  keyMetrics.push({
    label: 'Fatigue level',
    value: fatigue > 60 ? 'High' : fatigue > 30 ? 'Moderate' : 'Low',
    trend: fatigue > 60 ? 'up' : fatigue > 30 ? 'stable' : 'down',
  });

  // 5. Check injury status
  const activeInjuries = opts.injuryLog.filter(i => !i.resolved);
  const severeInjuries = activeInjuries.filter(i => i.severity >= 4);

  // 6. Check competition proximity
  const now = new Date();
  const upcomingComp = opts.competitions
    .filter(c => new Date(c.date) > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const weeksToComp = upcomingComp
    ? Math.floor((new Date(upcomingComp.date).getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000))
    : null;

  if (weeksToComp != null) {
    keyMetrics.push({
      label: 'Competition',
      value: `${weeksToComp} weeks away`,
      trend: 'stable',
    });
  }

  // 7. Recovery trend
  const avgRecovery = opts.wearableHistory.length > 0
    ? opts.wearableHistory
        .filter(d => d.recoveryScore != null)
        .reduce((s, d) => s + d.recoveryScore!, 0) / opts.wearableHistory.filter(d => d.recoveryScore != null).length
    : null;

  if (avgRecovery != null) {
    keyMetrics.push({
      label: '7-day recovery',
      value: `${Math.round(avgRecovery)}%`,
      trend: avgRecovery > 60 ? 'up' : avgRecovery > 40 ? 'stable' : 'down',
    });
  }

  // 8. Mesocycle history analysis
  const lastBlock = opts.mesocycleHistory[opts.mesocycleHistory.length - 1];
  const currentGoal = opts.currentMesocycle?.goalFocus || opts.user?.goalFocus || 'balanced';
  const lastGoal = lastBlock?.goalFocus;

  // ── Nutrition Phase Awareness ──────────────────────────────────────────
  // If a periodization plan exists, its recommended training focus carries weight.
  let nutritionPhaseRecommendation: BlockFocus | null = null;
  let nutritionPhaseLabel: string | null = null;

  if (opts.nutritionPeriodPlan) {
    const phaseCtx = getActivePhaseContext(
      opts.nutritionPeriodPlan, [], [], [],
    );
    if (phaseCtx) {
      const phase = phaseCtx.phase;
      nutritionPhaseRecommendation = getRecommendedTrainingFocus(
        phase.type, phaseCtx.weeksCompleted, phase.plannedWeeks
      );
      const phaseLabels = {
        massing: 'Massing', maintenance: 'Maintenance', mini_cut: 'Mini-Cut',
        fat_loss: 'Fat Loss', diet_break: 'Diet Break', fight_camp: 'Fight Camp',
        recovery: 'Recovery',
      } as const;
      nutritionPhaseLabel = phaseLabels[phase.type] || phase.type;

      keyMetrics.push({
        label: 'Nutrition phase',
        value: nutritionPhaseLabel,
        trend: 'stable',
      });
    }
  }

  // ── Decision Tree ─────────────────────────────────────────────────────

  let recommendedFocus: BlockFocus;
  let suggestedWeeks = 5;
  let alternativeFocus: BlockFocus | undefined;
  let alternativeReason: string | undefined;

  // DECISION 1: Severe injury → deload
  if (severeInjuries.length > 0) {
    recommendedFocus = 'deload';
    suggestedWeeks = 2;
    reasoning.push(`Severe injury present (${severeInjuries.length}) — prioritize recovery`);
    reasoning.push('Deload block allows healing while maintaining muscle mass');
    confidence = 90;
  }
  // DECISION 2: High fatigue + declining performance → deload
  else if (fatigue > 65 && decliningCount >= 2) {
    recommendedFocus = 'deload';
    suggestedWeeks = 1;
    reasoning.push(`High fatigue (${fatigue}/100) with declining performance in ${decliningCount} exercises`);
    reasoning.push('A deload week will allow supercompensation and renewed progress');
    confidence = 85;
    alternativeFocus = 'base_building';
    alternativeReason = 'If you feel recovered enough, a light base-building block works too';
  }
  // DECISION 3: Competition in 2-4 weeks → peaking
  else if (weeksToComp != null && weeksToComp <= 4 && weeksToComp >= 1) {
    recommendedFocus = 'peaking';
    suggestedWeeks = Math.min(weeksToComp, 4);
    reasoning.push(`Competition in ${weeksToComp} weeks — time to peak`);
    reasoning.push('Reduce volume 30-40%, maintain intensity, sharpen sport skills');
    confidence = 90;
  }
  // DECISION 4: Competition in 5-12 weeks → strength
  else if (weeksToComp != null && weeksToComp <= 12) {
    recommendedFocus = 'strength';
    suggestedWeeks = Math.min(weeksToComp - 3, 6);
    reasoning.push(`Competition in ${weeksToComp} weeks — build maximal strength now`);
    reasoning.push('Strength phase before peaking maximizes competition performance');
    confidence = 80;
    alternativeFocus = 'power';
    alternativeReason = 'Power focus is better if your strength base is already solid';
  }
  // DECISION 5: Many plateaus + low fatigue → change stimulus
  else if (plateauCount >= 3 && fatigue < 40) {
    // If they've been doing the same goal, switch
    if (currentGoal === 'strength' || lastGoal === 'strength') {
      recommendedFocus = 'hypertrophy';
      reasoning.push(`${plateauCount} exercises plateaued — muscle growth phase will build work capacity`);
      reasoning.push('Hypertrophy block provides novel stimulus after strength focus');
    } else if (currentGoal === 'hypertrophy' || lastGoal === 'hypertrophy') {
      recommendedFocus = 'strength';
      reasoning.push(`${plateauCount} exercises plateaued — strength phase will drive neural adaptations`);
      reasoning.push('Expressing strength from new muscle mass breaks hypertrophy plateaus');
    } else {
      recommendedFocus = 'power';
      reasoning.push(`${plateauCount} exercises plateaued — power work provides a fresh stimulus`);
    }
    suggestedWeeks = 5;
    confidence = 75;
  }
  // DECISION 6: Good recovery + low fatigue → can push harder
  else if (avgRecovery != null && avgRecovery > 65 && fatigue < 30) {
    if (currentGoal === 'hypertrophy' || lastGoal === 'hypertrophy') {
      recommendedFocus = 'strength';
      reasoning.push('Recovery is excellent and fatigue is low — prime conditions for strength gains');
    } else {
      recommendedFocus = 'hypertrophy';
      reasoning.push('Recovery is excellent and fatigue is low — push volume for muscle growth');
    }
    suggestedWeeks = 6;
    confidence = 70;
    alternativeFocus = 'power';
    alternativeReason = 'Power block if sport performance is the primary goal';
  }
  // DECISION 7: User goal alignment
  // DECISION 7.5: Nutrition phase coupling (overrides generic goal when plan exists)
  else if (nutritionPhaseRecommendation) {
    recommendedFocus = nutritionPhaseRecommendation;
    reasoning.push(`${nutritionPhaseLabel} phase → ${nutritionPhaseRecommendation} training (nutrition-training coupling)`);
    reasoning.push('Training focus aligned to nutrition phase for optimal adaptation');

    // Offer the user's general goal as alternative
    const goalToFocus: Record<GoalFocus, BlockFocus> = {
      strength: 'strength',
      hypertrophy: 'hypertrophy',
      power: 'power',
      balanced: progressingCount > plateauCount ? 'hypertrophy' : 'strength',
      strength_endurance: 'base_building',
    };
    const goalFocus = goalToFocus[currentGoal];
    if (goalFocus !== recommendedFocus) {
      alternativeFocus = goalFocus;
      alternativeReason = `Your general goal (${currentGoal}) suggests ${goalFocus} instead`;
    }
    suggestedWeeks = 5;
    confidence = 75; // Higher confidence when aligned to nutrition plan
  }
  // DECISION 8: User goal alignment (fallback when no nutrition plan)
  else {
    const goalToFocus: Record<GoalFocus, BlockFocus> = {
      strength: 'strength',
      hypertrophy: 'hypertrophy',
      power: 'power',
      balanced: progressingCount > plateauCount ? 'hypertrophy' : 'strength',
      strength_endurance: 'base_building',
    };
    recommendedFocus = goalToFocus[currentGoal];

    // Block periodization: alternate between phases
    if (lastGoal && recommendedFocus === lastGoal) {
      const rotation: Record<BlockFocus, BlockFocus> = {
        strength: 'hypertrophy',
        hypertrophy: 'strength',
        power: 'strength',
        deload: 'base_building',
        peaking: 'base_building',
        base_building: 'hypertrophy',
      };
      alternativeFocus = rotation[recommendedFocus];
      alternativeReason = 'Alternating training phases prevents accommodation (Stone et al. 2007)';
    }

    reasoning.push(`Goal: ${currentGoal} → ${recommendedFocus} focus`);
    if (progressingCount > 0) {
      reasoning.push(`${progressingCount} exercises still progressing — keep building`);
    }
    suggestedWeeks = 5;
    confidence = 60;
  }

  // Adjust confidence based on data quality
  if (recentLogs.length >= 12) confidence = Math.min(95, confidence + 10);
  else if (recentLogs.length < 4) confidence = Math.max(30, confidence - 20);
  if (opts.wearableHistory.length > 0) confidence = Math.min(95, confidence + 5);

  keyMetrics.push({
    label: 'Plateau count',
    value: `${plateauCount} exercises`,
    trend: plateauCount > 2 ? 'down' : 'stable',
  });

  return {
    recommendedFocus,
    confidence,
    reasoning,
    alternativeFocus,
    alternativeReason,
    suggestedWeeks,
    keyMetrics,
    weakPoints,
    strongPoints,
  };
}

/**
 * Get a simple text summary of the block suggestion for display.
 */
export function getBlockSuggestionSummary(suggestion: BlockSuggestion): string {
  const focusLabels: Record<BlockFocus, string> = {
    strength: 'Strength',
    hypertrophy: 'Hypertrophy',
    power: 'Power',
    deload: 'Deload/Recovery',
    peaking: 'Competition Peaking',
    base_building: 'Base Building',
  };

  return `Next block: ${focusLabels[suggestion.recommendedFocus]} (${suggestion.suggestedWeeks} weeks) — ${suggestion.reasoning[0]}`;
}
