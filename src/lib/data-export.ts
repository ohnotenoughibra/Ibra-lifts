import { WorkoutLog, WeightUnit } from './types';

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
