import { Mesocycle, WorkoutLog, ExerciseLog, WeightUnit } from './types';
import { getExerciseById } from './exercises';

/** Filter out soft-deleted items */
function active<T>(arr: T[]): T[] {
  return arr.filter(item => !(item as Record<string, unknown>)._deleted);
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface ExerciseSummary {
  exerciseId: string;
  exerciseName: string;
  totalSets: number;
  totalReps: number;
  totalVolume: number;       // weight × reps
  bestWeight: number;
  best1RM: number;
  avgRPE: number;
  hadPR: boolean;
  sessions: number;          // how many workouts included this exercise
}

export interface WeekSummary {
  weekNumber: number;
  isDeload: boolean;
  workoutsCompleted: number;
  workoutsPlanned: number;
  totalVolume: number;
  avgRPE: number;
  prsHit: number;
  avgSleepQuality: number | null;
  avgMotivation: number | null;
}

export interface MesocycleReport {
  mesocycle: Mesocycle;

  // Completion
  workoutsCompleted: number;
  workoutsPlanned: number;
  completionRate: number;    // 0–100

  // Duration
  startDate: Date;
  endDate: Date;
  durationDays: number;

  // Volume
  totalVolume: number;
  avgVolumePerSession: number;
  volumeByWeek: number[];    // for trend chart

  // Intensity
  avgRPE: number;
  avgRPEByWeek: number[];

  // Time
  totalDuration: number;     // minutes across all sessions
  avgDuration: number;       // per session

  // PRs
  totalPRs: number;
  prExercises: string[];     // exercise names that had PRs

  // Exercises
  topExercisesByVolume: ExerciseSummary[];  // top 5
  allExercises: ExerciseSummary[];

  // Check-in averages
  avgSleepQuality: number | null;
  avgStress: number | null;
  avgSoreness: number | null;
  avgMotivation: number | null;
  avgEnergy: number | null;

  // Post-workout mood
  avgPerformanceRating: number | null;     // mapped from postFeedback
  avgPostSoreness: number | null;

  // Week-by-week breakdown
  weekSummaries: WeekSummary[];

  // Comparison to previous (null if first block)
  comparison: {
    prevName: string;
    volumeDelta: number;       // absolute
    volumeDeltaPct: number;    // percent
    rpeDelta: number;
    sessionsDelta: number;
    prsDelta: number;
  } | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function calc1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight / (1.0278 - 0.0278 * reps));
}

function getWeekNumber(mesocycle: Mesocycle, logDate: Date): number {
  const start = new Date(mesocycle.startDate).getTime();
  const logTime = new Date(logDate).getTime();
  const daysSinceStart = Math.floor((logTime - start) / (1000 * 60 * 60 * 24));
  return Math.min(Math.floor(daysSinceStart / 7), mesocycle.weeks.length - 1);
}

// ── Main Generator ─────────────────────────────────────────────────────────

export function generateMesocycleReport(
  mesocycle: Mesocycle,
  allWorkoutLogs: WorkoutLog[],
  previousMesocycle?: Mesocycle | null,
  previousLogs?: WorkoutLog[],
): MesocycleReport {
  allWorkoutLogs = active(allWorkoutLogs);
  if (previousLogs) previousLogs = active(previousLogs);

  // Filter logs for this mesocycle
  const logs = allWorkoutLogs
    .filter(l => l.mesocycleId === mesocycle.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Total planned sessions
  const workoutsPlanned = mesocycle.weeks.reduce(
    (sum, w) => sum + w.sessions.length, 0
  );

  const workoutsCompleted = logs.length;
  const completionRate = workoutsPlanned > 0
    ? Math.round((workoutsCompleted / workoutsPlanned) * 100)
    : 0;

  // Dates
  const startDate = new Date(mesocycle.startDate);
  const endDate = logs.length > 0
    ? new Date(logs[logs.length - 1].date)
    : new Date(mesocycle.endDate);
  const durationDays = Math.max(1, Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  ));

  // Volume
  const totalVolume = logs.reduce((s, l) => s + (l.totalVolume || 0), 0);
  const avgVolumePerSession = workoutsCompleted > 0
    ? Math.round(totalVolume / workoutsCompleted)
    : 0;

  // Volume by week
  const volumeByWeek: number[] = mesocycle.weeks.map(() => 0);
  logs.forEach(log => {
    const wk = getWeekNumber(mesocycle, new Date(log.date));
    if (wk >= 0 && wk < volumeByWeek.length) {
      volumeByWeek[wk] += log.totalVolume || 0;
    }
  });

  // RPE
  const rpeValues = logs.filter(l => l.overallRPE > 0).map(l => l.overallRPE);
  const avgRPE = rpeValues.length > 0
    ? +(rpeValues.reduce((s, v) => s + v, 0) / rpeValues.length).toFixed(1)
    : 0;

  const avgRPEByWeek: number[] = mesocycle.weeks.map((_, wi) => {
    const weekLogs = logs.filter(l => getWeekNumber(mesocycle, new Date(l.date)) === wi);
    const vals = weekLogs.filter(l => l.overallRPE > 0).map(l => l.overallRPE);
    return vals.length > 0 ? +(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : 0;
  });

  // Duration
  const totalDuration = logs.reduce((s, l) => s + (l.duration || 0), 0);
  const avgDuration = workoutsCompleted > 0
    ? Math.round(totalDuration / workoutsCompleted)
    : 0;

  // PRs
  const prExerciseIds = new Set<string>();
  let totalPRs = 0;
  logs.forEach(log => {
    log.exercises.forEach(ex => {
      if (ex.personalRecord) {
        totalPRs++;
        prExerciseIds.add(ex.exerciseId);
      }
    });
  });
  const prExercises = Array.from(prExerciseIds).map(id => {
    const ex = getExerciseById(id);
    return ex?.name || id.replace(/-/g, ' ');
  });

  // Exercise summaries
  const exerciseMap = new Map<string, ExerciseSummary>();
  logs.forEach(log => {
    log.exercises.forEach(ex => {
      const existing = exerciseMap.get(ex.exerciseId) || {
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        totalSets: 0,
        totalReps: 0,
        totalVolume: 0,
        bestWeight: 0,
        best1RM: 0,
        avgRPE: 0,
        hadPR: false,
        sessions: 0,
      };

      existing.sessions++;
      if (ex.personalRecord) existing.hadPR = true;

      let rpeSum = 0;
      let rpeCount = 0;
      ex.sets.forEach(set => {
        if (set.completed) {
          existing.totalSets++;
          existing.totalReps += set.reps;
          existing.totalVolume += set.weight * set.reps;
          if (set.weight > existing.bestWeight) existing.bestWeight = set.weight;
          const e1rm = calc1RM(set.weight, set.reps);
          if (e1rm > existing.best1RM) existing.best1RM = e1rm;
          if (set.rpe > 0) { rpeSum += set.rpe; rpeCount++; }
        }
      });

      // Running average RPE
      if (rpeCount > 0) {
        const sessionRPE = rpeSum / rpeCount;
        existing.avgRPE = existing.sessions === 1
          ? +sessionRPE.toFixed(1)
          : +((existing.avgRPE * (existing.sessions - 1) + sessionRPE) / existing.sessions).toFixed(1);
      }

      exerciseMap.set(ex.exerciseId, existing);
    });
  });

  const allExercises = Array.from(exerciseMap.values())
    .sort((a, b) => b.totalVolume - a.totalVolume);
  const topExercisesByVolume = allExercises.slice(0, 5);

  // Pre-workout check-in averages
  const checkIns = logs.filter(l => l.preCheckIn).map(l => l.preCheckIn!);
  const avgSleepQuality = checkIns.length > 0
    ? +(checkIns.reduce((s, c) => s + c.sleepQuality, 0) / checkIns.length).toFixed(1)
    : null;
  const avgStress = checkIns.length > 0
    ? +(checkIns.reduce((s, c) => s + c.stress, 0) / checkIns.length).toFixed(1)
    : null;
  const avgSoreness = checkIns.length > 0
    ? +(checkIns.reduce((s, c) => s + c.soreness, 0) / checkIns.length).toFixed(1)
    : null;
  const avgMotivation = checkIns.length > 0
    ? +(checkIns.reduce((s, c) => s + c.motivation, 0) / checkIns.length).toFixed(1)
    : null;

  // Post-workout averages
  const postEnergyValues = logs.filter(l => l.energy > 0).map(l => l.energy);
  const avgEnergy = postEnergyValues.length > 0
    ? +(postEnergyValues.reduce((s, v) => s + v, 0) / postEnergyValues.length).toFixed(1)
    : null;

  const postSorenessValues = logs.filter(l => l.soreness > 0).map(l => l.soreness);
  const avgPostSoreness = postSorenessValues.length > 0
    ? +(postSorenessValues.reduce((s, v) => s + v, 0) / postSorenessValues.length).toFixed(1)
    : null;

  // Performance rating from postFeedback
  const perfMap: Record<string, number> = {
    'worse_than_expected': 1,
    'as_expected': 2,
    'better_than_expected': 3,
  };
  const perfValues = logs
    .filter(l => l.postFeedback?.overallPerformance)
    .map(l => perfMap[l.postFeedback!.overallPerformance] || 2);
  const avgPerformanceRating = perfValues.length > 0
    ? +(perfValues.reduce((s, v) => s + v, 0) / perfValues.length).toFixed(1)
    : null;

  // Week summaries
  const weekSummaries: WeekSummary[] = mesocycle.weeks.map((week, wi) => {
    const weekLogs = logs.filter(l => getWeekNumber(mesocycle, new Date(l.date)) === wi);
    const weekPRs = weekLogs.reduce((sum, l) =>
      sum + l.exercises.filter(ex => ex.personalRecord).length, 0
    );
    const weekCheckIns = weekLogs.filter(l => l.preCheckIn).map(l => l.preCheckIn!);

    return {
      weekNumber: week.weekNumber,
      isDeload: week.isDeload,
      workoutsCompleted: weekLogs.length,
      workoutsPlanned: week.sessions.length,
      totalVolume: weekLogs.reduce((s, l) => s + (l.totalVolume || 0), 0),
      avgRPE: avgRPEByWeek[wi],
      prsHit: weekPRs,
      avgSleepQuality: weekCheckIns.length > 0
        ? +(weekCheckIns.reduce((s, c) => s + c.sleepQuality, 0) / weekCheckIns.length).toFixed(1)
        : null,
      avgMotivation: weekCheckIns.length > 0
        ? +(weekCheckIns.reduce((s, c) => s + c.motivation, 0) / weekCheckIns.length).toFixed(1)
        : null,
    };
  });

  // Comparison to previous mesocycle
  let comparison: MesocycleReport['comparison'] = null;
  if (previousMesocycle && previousLogs) {
    const prevFilteredLogs = previousLogs.filter(l => l.mesocycleId === previousMesocycle.id);
    const prevVolume = prevFilteredLogs.reduce((s, l) => s + (l.totalVolume || 0), 0);
    const prevAvgVol = prevFilteredLogs.length > 0 ? prevVolume / prevFilteredLogs.length : 0;
    const prevRpeValues = prevFilteredLogs.filter(l => l.overallRPE > 0).map(l => l.overallRPE);
    const prevAvgRPE = prevRpeValues.length > 0
      ? +(prevRpeValues.reduce((s, v) => s + v, 0) / prevRpeValues.length).toFixed(1)
      : 0;
    const prevPRs = prevFilteredLogs.reduce((sum, l) =>
      sum + l.exercises.filter(ex => ex.personalRecord).length, 0
    );

    comparison = {
      prevName: previousMesocycle.name,
      volumeDelta: Math.round(totalVolume - prevVolume),
      volumeDeltaPct: prevVolume > 0
        ? Math.round(((totalVolume - prevVolume) / prevVolume) * 100)
        : 0,
      rpeDelta: +(avgRPE - prevAvgRPE).toFixed(1),
      sessionsDelta: workoutsCompleted - prevFilteredLogs.length,
      prsDelta: totalPRs - prevPRs,
    };
  }

  return {
    mesocycle,
    workoutsCompleted,
    workoutsPlanned,
    completionRate,
    startDate,
    endDate,
    durationDays,
    totalVolume,
    avgVolumePerSession,
    volumeByWeek,
    avgRPE,
    avgRPEByWeek,
    totalDuration,
    avgDuration,
    totalPRs,
    prExercises,
    topExercisesByVolume,
    allExercises,
    avgSleepQuality,
    avgStress,
    avgSoreness,
    avgMotivation,
    avgEnergy,
    avgPerformanceRating,
    avgPostSoreness,
    weekSummaries,
    comparison,
  };
}

// ── Format helpers for display ─────────────────────────────────────────────

export function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1000) return `${(vol / 1000).toFixed(1)}k`;
  return vol.toString();
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
