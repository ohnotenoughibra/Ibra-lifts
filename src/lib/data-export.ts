import { WorkoutLog, WeightUnit } from './types';
import { useAppStore } from './store';

// Export workout data as CSV
export function exportToCSV(logs: WorkoutLog[], weightUnit: WeightUnit): string {
  const headers = ['Date', 'Session', 'Exercise', 'Set', `Weight (${weightUnit})`, 'Reps', 'RPE', 'Completed', 'PR', '1RM Est', 'Volume'];
  const rows: string[][] = [];

  for (const log of logs) {
    const date = new Date(log.date).toLocaleDateString();
    for (const exercise of log.exercises) {
      for (const set of exercise.sets) {
        rows.push([
          date,
          log.sessionId,
          exercise.exerciseName,
          String(set.setNumber),
          String(set.weight),
          String(set.reps),
          String(set.rpe),
          set.completed ? 'Yes' : 'No',
          exercise.personalRecord ? 'PR' : '',
          exercise.estimated1RM ? String(Math.round(exercise.estimated1RM)) : '',
          String(set.completed ? set.weight * set.reps : 0)
        ]);
      }
    }
  }

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}

// Export workout data as JSON
export function exportToJSON(logs: WorkoutLog[]): string {
  const exportData = logs.map(log => ({
    date: new Date(log.date).toISOString(),
    duration: log.duration,
    totalVolume: log.totalVolume,
    overallRPE: log.overallRPE,
    exercises: log.exercises.map(ex => ({
      name: ex.exerciseName,
      sets: ex.sets.map(s => ({
        weight: s.weight,
        reps: s.reps,
        rpe: s.rpe,
        completed: s.completed
      })),
      personalRecord: ex.personalRecord,
      estimated1RM: ex.estimated1RM,
      feedback: ex.feedback ? {
        pumpRating: ex.feedback.pumpRating,
        difficulty: ex.feedback.difficulty,
        jointPain: ex.feedback.jointPain
      } : undefined
    })),
    preCheckIn: log.preCheckIn,
    postFeedback: log.postFeedback,
    notes: log.notes
  }));

  return JSON.stringify(exportData, null, 2);
}

// Trigger file download in browser
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Full app backup — exports ALL persistent state for restore/transfer.
// Mirrors the store's partialize() exactly so nothing is ever missed.
export function exportFullBackup(): string {
  const state = useAppStore.getState();
  const backup = {
    _version: 3,
    _exportedAt: new Date().toISOString(),
    _app: 'roots-gains',
    // ── Auth & profile ──
    user: state.user,
    isOnboarded: state.isOnboarded,
    onboardingData: state.onboardingData,
    baselineLifts: state.baselineLifts,
    // ── Training program ──
    currentMesocycle: state.currentMesocycle,
    mesocycleHistory: state.mesocycleHistory,
    activeWorkout: state.activeWorkout,
    // ── Workout logs ──
    workoutLogs: state.workoutLogs,
    trainingSessions: state.trainingSessions,
    hrSessions: state.hrSessions,
    // ── Gamification ──
    gamificationStats: state.gamificationStats,
    // ── Body tracking ──
    bodyWeightLog: state.bodyWeightLog,
    bodyComposition: state.bodyComposition,
    // ── Nutrition ──
    meals: state.meals,
    macroTargets: state.macroTargets,
    waterLog: state.waterLog,
    activeDietPhase: state.activeDietPhase,
    weeklyCheckIns: state.weeklyCheckIns,
    mealReminders: state.mealReminders,
    // ── Health & recovery ──
    injuryLog: state.injuryLog,
    illnessLogs: state.illnessLogs,
    workoutSkips: state.workoutSkips,
    // ── Quick logs & grip ──
    quickLogs: state.quickLogs,
    gripTests: state.gripTests,
    gripExerciseLogs: state.gripExerciseLogs,
    // ── Customisation ──
    customExercises: state.customExercises,
    sessionTemplates: state.sessionTemplates,
    muscleEmphasis: state.muscleEmphasis,
    activeEquipmentProfile: state.activeEquipmentProfile,
    competitions: state.competitions,
    themeMode: state.themeMode,
  };
  return JSON.stringify(backup, null, 2);
}

// Validate and import a full backup
export function importFullBackup(jsonString: string): { success: boolean; error?: string; stats?: { workouts: number; exercises: number; templates: number; meals: number; trainingSessions: number } } {
  try {
    const data = JSON.parse(jsonString);

    // Basic validation
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Invalid file — not a JSON object' };
    }

    // Check if it's a roots-gains backup (also accept legacy grappler-gains backups)
    if (data._app !== 'roots-gains' && data._app !== 'grappler-gains' && !data.workoutLogs && !data.user) {
      return { success: false, error: 'This file is not a Roots Gains backup' };
    }

    // Validate critical arrays
    if (data.workoutLogs && !Array.isArray(data.workoutLogs)) {
      return { success: false, error: 'Invalid backup — workoutLogs is not an array' };
    }

    const state = useAppStore.getState();

    // Build update object — only include fields that exist in the backup
    const update: Record<string, unknown> = {};

    // ── Auth & profile ──
    if (data.user) update.user = data.user;
    if (data.isOnboarded !== undefined) update.isOnboarded = data.isOnboarded;
    if (data.isOnboarded) update.isAuthenticated = true;
    if (data.onboardingData) update.onboardingData = data.onboardingData;
    if (data.baselineLifts) update.baselineLifts = data.baselineLifts;
    // ── Training program ──
    if (data.currentMesocycle) update.currentMesocycle = data.currentMesocycle;
    if (Array.isArray(data.mesocycleHistory)) update.mesocycleHistory = data.mesocycleHistory;
    if (data.activeWorkout) update.activeWorkout = data.activeWorkout;
    // ── Workout logs ──
    if (Array.isArray(data.workoutLogs)) update.workoutLogs = data.workoutLogs;
    // Support both old (grapplingSessions) and new (trainingSessions) format
    if (Array.isArray(data.trainingSessions)) update.trainingSessions = data.trainingSessions;
    else if (Array.isArray(data.grapplingSessions)) update.trainingSessions = data.grapplingSessions;
    if (Array.isArray(data.hrSessions)) update.hrSessions = data.hrSessions;
    // ── Gamification ──
    if (data.gamificationStats) update.gamificationStats = data.gamificationStats;
    // ── Body tracking ──
    if (Array.isArray(data.bodyWeightLog)) update.bodyWeightLog = data.bodyWeightLog;
    if (Array.isArray(data.bodyComposition)) update.bodyComposition = data.bodyComposition;
    // ── Nutrition (meals, macros, water, diet, reminders) ──
    if (Array.isArray(data.meals)) update.meals = data.meals;
    if (data.macroTargets) update.macroTargets = data.macroTargets;
    if (data.waterLog && typeof data.waterLog === 'object') update.waterLog = data.waterLog;
    if (data.activeDietPhase) update.activeDietPhase = data.activeDietPhase;
    if (Array.isArray(data.weeklyCheckIns)) update.weeklyCheckIns = data.weeklyCheckIns;
    if (data.mealReminders) update.mealReminders = data.mealReminders;
    // ── Health & recovery ──
    if (Array.isArray(data.injuryLog)) update.injuryLog = data.injuryLog;
    if (Array.isArray(data.illnessLogs)) update.illnessLogs = data.illnessLogs;
    if (Array.isArray(data.workoutSkips)) update.workoutSkips = data.workoutSkips;
    // ── Quick logs & grip ──
    if (Array.isArray(data.quickLogs)) update.quickLogs = data.quickLogs;
    if (Array.isArray(data.gripTests)) update.gripTests = data.gripTests;
    if (Array.isArray(data.gripExerciseLogs)) update.gripExerciseLogs = data.gripExerciseLogs;
    // ── Customisation ──
    if (Array.isArray(data.customExercises)) update.customExercises = data.customExercises;
    if (Array.isArray(data.sessionTemplates)) update.sessionTemplates = data.sessionTemplates;
    if (data.muscleEmphasis !== undefined) update.muscleEmphasis = data.muscleEmphasis;
    if (data.activeEquipmentProfile) update.activeEquipmentProfile = data.activeEquipmentProfile;
    if (Array.isArray(data.competitions)) update.competitions = data.competitions;
    if (data.themeMode) update.themeMode = data.themeMode;

    // Apply the update
    useAppStore.setState(update);

    // Recalculate derived stats from imported workout data
    // This ensures streaks, PR flags, heat map, and gamification stats are accurate
    // even if the backup had stale or missing gamification data
    if (Array.isArray(data.workoutLogs) && data.workoutLogs.length > 0) {
      // First recalculate PR flags (which exercise logs are actual PRs)
      // then recalculate gamification stats (streak, totals, PR count)
      // recalculatePRs triggers recalculateGamificationStats internally
      queueMicrotask(() => {
        useAppStore.getState().recalculatePRs();
      });
    }

    return {
      success: true,
      stats: {
        workouts: data.workoutLogs?.length ?? 0,
        exercises: data.customExercises?.length ?? 0,
        templates: data.sessionTemplates?.length ?? 0,
        meals: data.meals?.length ?? 0,
        trainingSessions: data.trainingSessions?.length ?? 0,
      }
    };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to parse backup file' };
  }
}

// Read a file selected by the user and return its text content
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// Export summary stats
export function exportSummary(logs: WorkoutLog[]): string {
  const totalWorkouts = logs.length;
  const totalVolume = logs.reduce((sum, l) => sum + l.totalVolume, 0);
  const totalDuration = logs.reduce((sum, l) => sum + l.duration, 0);
  const avgRPE = totalWorkouts > 0 ? logs.reduce((sum, l) => sum + l.overallRPE, 0) / totalWorkouts : 0;
  const totalPRs = logs.reduce((sum, l) => sum + l.exercises.filter(e => e.personalRecord).length, 0);

  // Exercise frequency
  const exerciseFreq: Record<string, number> = {};
  for (const log of logs) {
    for (const ex of log.exercises) {
      exerciseFreq[ex.exerciseName] = (exerciseFreq[ex.exerciseName] || 0) + 1;
    }
  }

  const topExercises = Object.entries(exerciseFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const summary = {
    overview: {
      totalWorkouts,
      totalVolume: Math.round(totalVolume),
      totalDuration,
      averageRPE: Math.round(avgRPE * 10) / 10,
      totalPRs,
      dateRange: totalWorkouts > 0 ? {
        from: new Date(logs[0].date).toISOString(),
        to: new Date(logs[logs.length - 1].date).toISOString()
      } : null
    },
    topExercises: topExercises.map(([name, count]) => ({ name, sessions: count }))
  };

  return JSON.stringify(summary, null, 2);
}
