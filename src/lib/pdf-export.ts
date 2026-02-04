import { jsPDF } from 'jspdf';
import { Mesocycle, WorkoutLog, WeightUnit } from './types';

// Colors
const COLORS = {
  dark: [15, 23, 42] as [number, number, number],
  cardBg: [30, 41, 59] as [number, number, number],
  primary: [99, 102, 241] as [number, number, number],
  accent: [168, 85, 247] as [number, number, number],
  text: [226, 232, 240] as [number, number, number],
  muted: [148, 163, 184] as [number, number, number],
  green: [34, 197, 94] as [number, number, number],
  yellow: [234, 179, 8] as [number, number, number],
  red: [239, 68, 68] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  black: [0, 0, 0] as [number, number, number],
};

function formatDateShort(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Export the current mesocycle program as a clean PDF
 */
export function exportProgramPdf(mesocycle: Mesocycle, weightUnit: WeightUnit = 'lbs') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = margin;

  // -- Helper: add new page if needed --
  function checkPage(needed: number) {
    if (y + needed > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage();
      y = margin;
    }
  }

  // -- Title --
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 0, pageW, 40, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(mesocycle.name, margin, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.muted);
  const subtitle = `${mesocycle.weeks.length} weeks • ${mesocycle.weeks[0]?.sessions?.length || 0} sessions/week • ${mesocycle.goalFocus} focus`;
  doc.text(subtitle, margin, 26);
  const dateRange = `${formatDateShort(mesocycle.startDate)} – ${formatDateShort(mesocycle.endDate)}`;
  doc.text(dateRange, margin, 33);
  y = 48;

  // -- Weeks --
  for (const week of mesocycle.weeks) {
    checkPage(20);
    // Week header
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const weekLabel = week.isDeload
      ? `Week ${week.weekNumber} — DELOAD`
      : `Week ${week.weekNumber}`;
    doc.text(weekLabel, margin + 3, y + 5.5);
    y += 12;

    for (const session of week.sessions) {
      checkPage(20);
      // Session header
      doc.setFillColor(240, 240, 245);
      doc.roundedRect(margin, y, contentW, 7, 1, 1, 'F');
      doc.setTextColor(...COLORS.dark);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${session.name}`, margin + 3, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      const sessionMeta = `${session.type.toUpperCase()} • ~${session.estimatedDuration} min`;
      doc.text(sessionMeta, pageW - margin - doc.getTextWidth(sessionMeta), y + 5);
      y += 10;

      // Table header
      checkPage(8);
      doc.setFillColor(226, 232, 240);
      doc.rect(margin, y, contentW, 6, 'F');
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      const cols = [margin + 2, margin + 70, margin + 90, margin + 110, margin + 130, margin + 150];
      doc.text('Exercise', cols[0], y + 4);
      doc.text('Sets', cols[1], y + 4);
      doc.text('Reps', cols[2], y + 4);
      doc.text('RPE', cols[3], y + 4);
      doc.text('Rest', cols[4], y + 4);
      doc.text('Tempo', cols[5], y + 4);
      y += 7;

      // Exercise rows
      for (const ex of session.exercises) {
        checkPage(7);
        doc.setTextColor(...COLORS.dark);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');

        // Zebra stripe
        if (session.exercises.indexOf(ex) % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y - 0.5, contentW, 6, 'F');
        }

        // Truncate long exercise names
        const name = ex.exercise.name.length > 32
          ? ex.exercise.name.substring(0, 30) + '...'
          : ex.exercise.name;
        doc.text(name, cols[0], y + 3.5);
        doc.text(String(ex.sets), cols[1], y + 3.5);
        doc.text(`${ex.prescription.minReps}-${ex.prescription.maxReps}`, cols[2], y + 3.5);
        doc.text(String(ex.prescription.rpe), cols[3], y + 3.5);
        doc.text(`${Math.round(ex.prescription.restSeconds / 60)}m`, cols[4], y + 3.5);
        doc.text(ex.prescription.tempo || '-', cols[5], y + 3.5);
        y += 6;
      }
      y += 4;
    }
    y += 4;
  }

  // -- Footer --
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(`Roots Gains — ${mesocycle.name}`, margin, doc.internal.pageSize.getHeight() - 6);
    doc.text(`Page ${i}/${totalPages}`, pageW - margin - 20, doc.internal.pageSize.getHeight() - 6);
  }

  doc.save(`${mesocycle.name.replace(/\s+/g, '_')}_program.pdf`);
}

/**
 * Export workout history as a clean PDF
 */
export function exportWorkoutHistoryPdf(logs: WorkoutLog[], weightUnit: WeightUnit = 'lbs') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = margin;

  function checkPage(needed: number) {
    if (y + needed > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage();
      y = margin;
    }
  }

  // -- Title --
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 0, pageW, 32, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Workout History', margin, 16);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.muted);
  doc.text(`${logs.length} workouts • Exported ${formatDateShort(new Date())}`, margin, 24);
  y = 38;

  // Sort newest first
  const sorted = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  for (const log of sorted) {
    checkPage(25);

    // Workout header bar
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, y, contentW, 9, 1.5, 1.5, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(formatDateShort(log.date), margin + 3, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const summary = `${log.exercises.length} exercises • ${log.duration} min • ${Math.round(log.totalVolume).toLocaleString()} ${weightUnit} volume • RPE ${log.overallRPE}`;
    doc.text(summary, pageW - margin - doc.getTextWidth(summary) - 1, y + 6);
    y += 13;

    // Pre-check-in
    if (log.preCheckIn) {
      checkPage(8);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y, contentW, 6, 1, 1, 'F');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Pre: Sleep ${log.preCheckIn.sleepQuality}/5 (${log.preCheckIn.sleepHours}h) • Stress ${log.preCheckIn.stress}/5 • Motivation ${log.preCheckIn.motivation}/5`,
        margin + 2, y + 4
      );
      y += 8;
    }

    // Exercises
    for (const ex of log.exercises) {
      checkPage(10);
      doc.setTextColor(...COLORS.dark);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      const prTag = ex.personalRecord ? ' ★ PR' : '';
      doc.text(`${ex.exerciseName}${prTag}`, margin + 2, y + 4);

      if (ex.estimated1RM) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(`Est. 1RM: ${Math.round(ex.estimated1RM)} ${weightUnit}`, pageW - margin - 30, y + 4);
      }
      y += 6;

      // Sets table
      checkPage(5 + ex.sets.length * 5);
      doc.setFillColor(226, 232, 240);
      doc.rect(margin + 4, y, contentW - 8, 5, 'F');
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('Set', margin + 6, y + 3.5);
      doc.text(`Weight (${weightUnit})`, margin + 20, y + 3.5);
      doc.text('Reps', margin + 50, y + 3.5);
      doc.text('RPE', margin + 68, y + 3.5);
      doc.text('Status', margin + 85, y + 3.5);
      y += 6;

      for (const set of ex.sets) {
        checkPage(5);
        doc.setFont('helvetica', 'normal');
        const setColor = set.completed ? COLORS.dark : [156, 163, 175] as [number, number, number];
        doc.setTextColor(...setColor);
        doc.setFontSize(7);

        if (ex.sets.indexOf(set) % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin + 4, y - 0.5, contentW - 8, 5, 'F');
          doc.setTextColor(...setColor);
        }

        doc.text(String(set.setNumber), margin + 8, y + 3);
        doc.text(String(set.weight), margin + 25, y + 3);
        doc.text(String(set.reps), margin + 53, y + 3);
        doc.text(String(set.rpe), margin + 70, y + 3);
        doc.text(set.completed ? 'Done' : 'Skipped', margin + 85, y + 3);
        y += 5;
      }

      // Exercise feedback
      if (ex.feedback) {
        checkPage(5);
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        const fb = `Pump: ${ex.feedback.pumpRating}/5 • Difficulty: ${ex.feedback.difficulty.replace('_', ' ')}${ex.feedback.jointPain ? ' • Joint pain' : ''}`;
        doc.text(fb, margin + 6, y + 3);
        y += 5;
      }
      y += 2;
    }

    // Post feedback
    if (log.postFeedback) {
      checkPage(8);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y, contentW, 6, 1, 1, 'F');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Post: ${log.postFeedback.overallPerformance.replace(/_/g, ' ')} • Mood ${log.postFeedback.mood}/5 • Energy ${log.postFeedback.energy}/10 • ${log.postFeedback.wouldRepeat ? 'Enjoyed' : 'Didn\'t enjoy'}`,
        margin + 2, y + 4
      );
      y += 8;
    }

    // Notes
    if (log.notes) {
      checkPage(7);
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`Notes: ${log.notes.substring(0, 120)}`, margin + 2, y + 3);
      y += 6;
    }

    y += 6;
  }

  // -- Footer --
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text('Roots Gains — Workout History', margin, doc.internal.pageSize.getHeight() - 6);
    doc.text(`Page ${i}/${totalPages}`, pageW - margin - 20, doc.internal.pageSize.getHeight() - 6);
  }

  doc.save(`workout_history_${new Date().toISOString().substring(0, 10)}.pdf`);
}
