import { CombatTrainingDay, CombatIntensity, WorkoutSession, WorkoutType } from './types';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Recovery cost of each combat intensity level (arbitrary units 0-10).
 * Hard = sparring/comp rounds, Moderate = regular class, Light = drilling/technique
 */
const COMBAT_COST: Record<CombatIntensity, number> = {
  light: 2,
  moderate: 5,
  hard: 8,
};

/**
 * Recovery cost of each workout type.
 * Strength (heavy CNS load) > Power (explosive) > Hypertrophy (metabolic stress)
 */
const WORKOUT_COST: Record<WorkoutType, number> = {
  strength: 8,
  power: 6,
  hypertrophy: 5,
};

interface DayPlan {
  day: number;           // 0-6
  dayName: string;
  isLiftDay: boolean;
  isRestDay: boolean;
  combatTraining?: CombatTrainingDay;
  suggestedWorkoutType?: WorkoutType;
  intensityModifier: number; // 0.5-1.0 — multiply RPE/volume by this
  reason?: string;          // Why we chose this intensity
}

export interface WeekPlan {
  days: DayPlan[];
  warnings: string[];
  tips: string[];
}

/**
 * Build an optimal weekly plan that accounts for recovery between sessions.
 * This is the core "AI coach" scheduler.
 */
export function buildWeekPlan(
  trainingDays: number[],
  combatTrainingDays: CombatTrainingDay[],
  sessions: WorkoutSession[],
): WeekPlan {
  const combatMap = new Map<number, CombatTrainingDay>();
  for (const cd of combatTrainingDays) {
    combatMap.set(cd.day, cd);
  }

  const warnings: string[] = [];
  const tips: string[] = [];

  // Sort sessions by intensity cost (heaviest first — we want those on freshest days)
  const sortedSessions = [...sessions].sort(
    (a, b) => WORKOUT_COST[b.type] - WORKOUT_COST[a.type]
  );

  // Score each training day by how "fresh" you'll be
  const dayFreshness: { day: number; freshness: number }[] = trainingDays.map(day => {
    let freshness = 10; // Start fully fresh

    // Check previous day
    const prevDay = day === 0 ? 6 : day - 1;
    const prevCombat = combatMap.get(prevDay);
    if (prevCombat) {
      freshness -= COMBAT_COST[prevCombat.intensity] * 0.7; // Reduced by 30% with sleep
    }
    if (trainingDays.includes(prevDay)) {
      freshness -= 3; // Back-to-back lifting
    }

    // Check two days ago (still some residual fatigue)
    const prevPrevDay = prevDay === 0 ? 6 : prevDay - 1;
    const prevPrevCombat = combatMap.get(prevPrevDay);
    if (prevPrevCombat && prevPrevCombat.intensity === 'hard') {
      freshness -= 1.5;
    }

    // Same-day combat training
    const sameDayCombat = combatMap.get(day);
    if (sameDayCombat) {
      freshness -= COMBAT_COST[sameDayCombat.intensity] * 0.4; // Lifting first, then sport
    }

    return { day, freshness: Math.max(1, freshness) };
  });

  // Sort by freshness descending — assign heaviest sessions to freshest days
  dayFreshness.sort((a, b) => b.freshness - a.freshness);

  // Create the session assignments
  const dayAssignments = new Map<number, { session: WorkoutSession; freshness: number }>();
  for (let i = 0; i < sortedSessions.length && i < dayFreshness.length; i++) {
    dayAssignments.set(dayFreshness[i].day, {
      session: sortedSessions[i],
      freshness: dayFreshness[i].freshness,
    });
  }

  // Build the full 7-day plan
  const days: DayPlan[] = Array.from({ length: 7 }, (_, i) => {
    const isLiftDay = trainingDays.includes(i);
    const combatTraining = combatMap.get(i);
    const assignment = dayAssignments.get(i);
    const isRestDay = !isLiftDay && !combatTraining;

    let intensityModifier = 1.0;
    let reason: string | undefined;

    if (isLiftDay && assignment) {
      // Reduce intensity based on freshness
      if (assignment.freshness < 5) {
        intensityModifier = 0.7;
        reason = 'Auto-reduced: low recovery from prior training';
      } else if (assignment.freshness < 7) {
        intensityModifier = 0.85;
        reason = 'Slightly reduced: moderate fatigue from schedule';
      }

      // Specific warnings
      const prevDay = i === 0 ? 6 : i - 1;
      const prevCombat = combatMap.get(prevDay);
      if (prevCombat?.intensity === 'hard') {
        warnings.push(
          `${DAY_SHORT[i]} lift after hard ${DAY_SHORT[prevDay]} training — volume reduced to ${Math.round(intensityModifier * 100)}%`
        );
      }
    }

    return {
      day: i,
      dayName: DAY_NAMES[i],
      isLiftDay,
      isRestDay,
      combatTraining,
      suggestedWorkoutType: assignment?.session.type,
      intensityModifier,
      reason,
    };
  });

  // Generate tips
  const restDays = days.filter(d => d.isRestDay);
  const totalTrainingDays = days.filter(d => d.isLiftDay || d.combatTraining);
  if (restDays.length === 0) {
    warnings.push('No rest days this week — recovery will be challenging');
  }
  if (restDays.length >= 2) {
    tips.push(`${restDays.length} rest days — good recovery balance`);
  }
  if (totalTrainingDays.length >= 6) {
    tips.push('High training frequency — nutrition and sleep are critical');
  }

  return { days, warnings, tips };
}

/**
 * Get a human-readable weekly summary for notifications or display.
 */
export function getWeeklySummary(
  trainingDays: number[],
  combatTrainingDays: CombatTrainingDay[],
): string {
  const plan = buildWeekPlan(trainingDays, combatTrainingDays, []);
  const liftDays = plan.days.filter(d => d.isLiftDay).map(d => DAY_SHORT[d.day]);
  const hardDays = plan.days.filter(d => d.combatTraining?.intensity === 'hard').map(d => DAY_SHORT[d.day]);
  const restDays = plan.days.filter(d => d.isRestDay).map(d => DAY_SHORT[d.day]);

  let summary = `This week: ${liftDays.length} lifting sessions (${liftDays.join(', ')})`;
  if (hardDays.length > 0) {
    summary += ` | Hard sport training: ${hardDays.join(', ')}`;
  }
  if (restDays.length > 0) {
    summary += ` | Rest: ${restDays.join(', ')}`;
  }
  return summary;
}

/**
 * Determine if today is a good day to train based on the schedule.
 * Returns a recommendation for the user.
 */
export function getTodayRecommendation(
  trainingDays: number[],
  combatTrainingDays: CombatTrainingDay[],
  whoopRecovery?: number, // 0-100%
  sleepHours?: number,
): { shouldTrain: boolean; message: string; intensity: 'full' | 'reduced' | 'skip' } {
  const today = new Date().getDay(); // 0=Sun
  const isLiftDay = trainingDays.includes(today);
  const combatToday = combatTrainingDays.find(d => d.day === today);

  // Yesterday's activity
  const yesterday = today === 0 ? 6 : today - 1;
  const combatYesterday = combatTrainingDays.find(d => d.day === yesterday);
  const liftedYesterday = trainingDays.includes(yesterday);

  if (!isLiftDay) {
    if (combatToday) {
      return {
        shouldTrain: false,
        message: `${combatToday.intensity} ${combatToday.intensity === 'hard' ? 'sparring' : 'training'} day — focus on your sport`,
        intensity: 'skip',
      };
    }
    return {
      shouldTrain: false,
      message: 'Rest day — recover and prepare for your next session',
      intensity: 'skip',
    };
  }

  // It's a lift day — check recovery factors
  let intensityAdvice: 'full' | 'reduced' | 'skip' = 'full';
  const factors: string[] = [];

  // Whoop recovery data
  if (whoopRecovery !== undefined) {
    if (whoopRecovery < 33) {
      intensityAdvice = 'reduced';
      factors.push(`Low recovery (${whoopRecovery}%)`);
    } else if (whoopRecovery < 50) {
      intensityAdvice = 'reduced';
      factors.push(`Below average recovery (${whoopRecovery}%)`);
    }
  }

  // Sleep check
  if (sleepHours !== undefined && sleepHours < 6) {
    intensityAdvice = 'reduced';
    factors.push(`Low sleep (${sleepHours}h)`);
  }

  // Hard combat yesterday
  if (combatYesterday?.intensity === 'hard') {
    intensityAdvice = 'reduced';
    factors.push('Hard training yesterday');
  }

  // Back-to-back lifting
  if (liftedYesterday) {
    factors.push('Consecutive lift day — different muscle groups programmed');
  }

  // Also doing combat today
  if (combatToday?.intensity === 'hard') {
    intensityAdvice = 'reduced';
    factors.push('Hard sport training also today');
  }

  if (intensityAdvice === 'reduced') {
    return {
      shouldTrain: true,
      message: `Train today but at reduced intensity. ${factors.join('. ')}.`,
      intensity: 'reduced',
    };
  }

  return {
    shouldTrain: true,
    message: factors.length > 0
      ? `Good to train. Note: ${factors.join('. ')}.`
      : 'Full training day — you\'re fresh and ready!',
    intensity: 'full',
  };
}
