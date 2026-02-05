import { WorkoutLog, WeightUnit } from './types';
import { useAppStore } from './store';

// Export workout data as CSV
export function exportToCSV(logs: WorkoutLog[], weightUnit: WeightUnit): string {
  const headers = ['Date', 'Session', 'Exercise', 'Set', `Weight (${weightUnit})`, 'Reps', 'RPE', 'Completed', '1RM Est', 'Volume'];
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

// Full app backup — exports all persistent state for restore/transfer
export function exportFullBackup(): string {
  const state = useAppStore.getState();
  const backup = {
    _version: 1,
    _exportedAt: new Date().toISOString(),
    _app: 'roots-gains',
    user: state.user,
    isOnboarded: state.isOnboarded,
    baselineLifts: state.baselineLifts,
    currentMesocycle: state.currentMesocycle,
    mesocycleHistory: state.mesocycleHistory,
    workoutLogs: state.workoutLogs,
    gamificationStats: state.gamificationStats,
    bodyWeightLog: state.bodyWeightLog,
    injuryLog: state.injuryLog,
    customExercises: state.customExercises,
    sessionTemplates: state.sessionTemplates,
    hrSessions: state.hrSessions,
    trainingSessions: state.trainingSessions,
    meals: state.meals,
    macroTargets: state.macroTargets,
    waterLog: state.waterLog,
    bodyComposition: state.bodyComposition,
    muscleEmphasis: state.muscleEmphasis,
    activeEquipmentProfile: state.activeEquipmentProfile,
    themeMode: state.themeMode,
  };
  return JSON.stringify(backup, null, 2);
}

// Validate and import a full backup
export function importFullBackup(jsonString: string): { success: boolean; error?: string; stats?: { workouts: number; exercises: number; templates: number } } {
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

    if (data.user) update.user = data.user;
    if (data.isOnboarded !== undefined) update.isOnboarded = data.isOnboarded;
    if (data.isOnboarded) update.isAuthenticated = true;
    if (data.baselineLifts) update.baselineLifts = data.baselineLifts;
    if (data.currentMesocycle) update.currentMesocycle = data.currentMesocycle;
    if (Array.isArray(data.mesocycleHistory)) update.mesocycleHistory = data.mesocycleHistory;
    if (Array.isArray(data.workoutLogs)) update.workoutLogs = data.workoutLogs;
    if (data.gamificationStats) update.gamificationStats = data.gamificationStats;
    if (Array.isArray(data.bodyWeightLog)) update.bodyWeightLog = data.bodyWeightLog;
    if (Array.isArray(data.injuryLog)) update.injuryLog = data.injuryLog;
    if (Array.isArray(data.customExercises)) update.customExercises = data.customExercises;
    if (Array.isArray(data.sessionTemplates)) update.sessionTemplates = data.sessionTemplates;
    if (Array.isArray(data.hrSessions)) update.hrSessions = data.hrSessions;
    // Support both old (grapplingSessions) and new (trainingSessions) format for backward compatibility
    if (Array.isArray(data.trainingSessions)) update.trainingSessions = data.trainingSessions;
    else if (Array.isArray(data.grapplingSessions)) update.trainingSessions = data.grapplingSessions;
    if (Array.isArray(data.meals)) update.meals = data.meals;
    if (data.macroTargets) update.macroTargets = data.macroTargets;
    if (data.waterLog && typeof data.waterLog === 'object') update.waterLog = data.waterLog;
    if (Array.isArray(data.bodyComposition)) update.bodyComposition = data.bodyComposition;
    if (data.muscleEmphasis !== undefined) update.muscleEmphasis = data.muscleEmphasis;
    if (data.activeEquipmentProfile) update.activeEquipmentProfile = data.activeEquipmentProfile;
    if (data.themeMode) update.themeMode = data.themeMode;

    // Apply the update
    useAppStore.setState(update);

    return {
      success: true,
      stats: {
        workouts: data.workoutLogs?.length ?? 0,
        exercises: data.customExercises?.length ?? 0,
        templates: data.sessionTemplates?.length ?? 0,
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
