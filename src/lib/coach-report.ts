/**
 * Coach Report — read-only text summary an athlete can share with their coach.
 *
 * v1: text export (clipboard / share). v2 (later): server-hosted URL.
 *
 * The audit identified this as a fighter-product gap: a fighter has a coach,
 * the coach has zero visibility into load, readiness, weight cut, injury state.
 * This is the minimum-viable share surface — text the coach can paste anywhere.
 */

import type {
  WorkoutLog, TrainingSession, InjuryEntry, IllnessLog, BodyWeightEntry, UserProfile,
} from './types';

export interface CoachReportInput {
  user: UserProfile | null;
  workoutLogs: WorkoutLog[];
  trainingSessions: TrainingSession[];
  injuryLog: InjuryEntry[];
  illnessLogs: IllnessLog[];
  bodyWeightLog: BodyWeightEntry[];
  currentStreak: number;
  recoveryScore: number | null;
  daysToCompetition: number | null;
  competitionType?: string;
  weightCutTarget?: number;
}

const DAYS = (n: number) => Date.now() - n * 24 * 60 * 60 * 1000;

function fmt(value: number | string | null | undefined, fallback: string = '—'): string {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

/**
 * Build a structured plain-text Coach Report. Sections: identity, current
 * status, last 7 days, last 30 days, injuries, illness, body weight, fight prep.
 */
export function buildCoachReport(input: CoachReportInput): string {
  const lines: string[] = [];
  const today = new Date().toLocaleDateString();
  const name = input.user?.name ?? 'Athlete';
  const sport = input.user?.combatSport ?? 'combat';

  lines.push(`COACH REPORT · ${name} · ${today}`);
  lines.push('═'.repeat(46));
  lines.push('');

  // ── ATHLETE ──
  lines.push('ATHLETE');
  lines.push(`  Name:          ${fmt(input.user?.name)}`);
  lines.push(`  Sport:         ${sport}`);
  lines.push(`  Bodyweight:    ${input.bodyWeightLog.length > 0 ? `${input.bodyWeightLog[input.bodyWeightLog.length - 1].weight}kg (latest)` : '—'}`);
  lines.push(`  Streak:        ${input.currentStreak} days`);
  lines.push('');

  // ── CURRENT STATUS ──
  lines.push('CURRENT STATUS');
  lines.push(`  Recovery:      ${fmt(input.recoveryScore)}/100`);
  if (input.daysToCompetition !== null && input.daysToCompetition !== undefined) {
    lines.push(`  Competition:   ${input.competitionType ?? 'event'} in ${input.daysToCompetition} days`);
    if (input.weightCutTarget !== undefined) {
      lines.push(`  Weight cut:    target ${input.weightCutTarget}kg`);
    }
  } else {
    lines.push(`  Competition:   none scheduled`);
  }
  lines.push('');

  // ── LAST 7 DAYS LOAD ──
  const last7Workouts = input.workoutLogs.filter(l => new Date(l.date).getTime() >= DAYS(7));
  const last7Sessions = input.trainingSessions.filter(s => new Date(s.date).getTime() >= DAYS(7));
  const last7Volume = last7Workouts.reduce((s, l) => s + (l.totalVolume ?? 0), 0);
  const last7CombatHours = last7Sessions.reduce((s, x) => s + (x.duration ?? 0), 0) / 60;
  const last7AvgRPE = last7Workouts.length > 0
    ? (last7Workouts.reduce((s, l) => s + (l.overallRPE ?? 0), 0) / last7Workouts.length).toFixed(1)
    : '—';

  lines.push('LAST 7 DAYS');
  lines.push(`  Lift sessions: ${last7Workouts.length}`);
  lines.push(`  Lift volume:   ${Math.round(last7Volume).toLocaleString()} kg-reps`);
  lines.push(`  Avg RPE:       ${last7AvgRPE}/10`);
  lines.push(`  Mat sessions:  ${last7Sessions.length}  (${last7CombatHours.toFixed(1)}h)`);
  lines.push('');

  // ── LAST 30 DAYS TREND ──
  const last30Workouts = input.workoutLogs.filter(l => new Date(l.date).getTime() >= DAYS(30));
  const last30Sessions = input.trainingSessions.filter(s => new Date(s.date).getTime() >= DAYS(30));
  lines.push('LAST 30 DAYS');
  lines.push(`  Total sessions: ${last30Workouts.length} lift, ${last30Sessions.length} mat`);
  lines.push(`  Per week avg:   ${(last30Workouts.length / 4.3).toFixed(1)} lift, ${(last30Sessions.length / 4.3).toFixed(1)} mat`);
  lines.push('');

  // ── ACTIVE INJURIES ──
  const activeInjuries = input.injuryLog.filter(i => !i.resolved && !i._deleted);
  lines.push('ACTIVE INJURIES');
  if (activeInjuries.length === 0) {
    lines.push('  None');
  } else {
    for (const i of activeInjuries) {
      const days = Math.floor((Date.now() - new Date(i.date).getTime()) / (1000 * 60 * 60 * 24));
      lines.push(`  ${i.bodyRegion.replace(/_/g, ' ')}, ${i.painType} pain, severity ${i.severity}/5, day ${days}`);
    }
  }
  lines.push('');

  // ── ILLNESS ──
  const activeIllness = input.illnessLogs.filter(il => !il._deleted && il.status !== 'resolved');
  if (activeIllness.length > 0) {
    lines.push('ACTIVE ILLNESS');
    for (const il of activeIllness) {
      lines.push(`  ${il.severity} · started ${new Date(il.startDate).toLocaleDateString()}`);
    }
    lines.push('');
  }

  // ── BODY WEIGHT TREND ──
  if (input.bodyWeightLog.length >= 2) {
    const sorted = [...input.bodyWeightLog].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const last = sorted[sorted.length - 1];
    const twoWeeksAgo = sorted.find(e => new Date(e.date).getTime() >= DAYS(14));
    if (twoWeeksAgo) {
      const delta = last.weight - twoWeeksAgo.weight;
      const sign = delta > 0 ? '+' : '';
      lines.push('BODY WEIGHT');
      lines.push(`  Latest:        ${last.weight}kg (${sign}${delta.toFixed(1)}kg in 14d)`);
      lines.push('');
    }
  }

  lines.push('─'.repeat(46));
  lines.push('Generated by Ibra Lifts');

  return lines.join('\n');
}

/**
 * Copy text to clipboard. Returns success boolean.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Use the native share API if available (mobile), else fall back to clipboard.
 */
export async function shareCoachReport(text: string, athleteName: string = 'Athlete'): Promise<'shared' | 'clipboard' | 'failed'> {
  if (typeof navigator === 'undefined') return 'failed';
  // Native share (mobile/PWA)
  const navWithShare = navigator as Navigator & { share?: (data: { title?: string; text?: string }) => Promise<void> };
  if (navWithShare.share) {
    try {
      await navWithShare.share({ title: `Coach Report — ${athleteName}`, text });
      return 'shared';
    } catch {
      // user cancelled or share failed — fall through to clipboard
    }
  }
  const ok = await copyToClipboard(text);
  return ok ? 'clipboard' : 'failed';
}
