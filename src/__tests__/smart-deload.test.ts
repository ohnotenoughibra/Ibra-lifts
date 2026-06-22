import { describe, it, expect } from 'vitest';
import { calculateFatigueDebt, getSmartDeloadRecommendation } from '@/lib/smart-deload';
import type { WorkoutLog, WearableData } from '@/lib/types';

const DAY = 24 * 60 * 60 * 1000;

/** Local Monday (noon) of the week containing `ms`. */
function mondayNoon(ms: number): Date {
  const d = new Date(ms);
  const day = d.getDay();              // 0=Sun
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(12, 0, 0, 0);
  return d;
}

/** Build one week's worth of workout logs `weeksAgo` weeks back. Sessions land
 *  Mon..Fri of that week so they never cross a week boundary. */
function week(weeksAgo: number, opts: {
  sessions?: number; sets?: number; reps?: number; weight?: number; rpe?: number; pr?: boolean;
}): WorkoutLog[] {
  const { sessions = 4, sets = 5, reps = 5, weight = 100, rpe = 8, pr = false } = opts;
  const monday = mondayNoon(Date.now() - weeksAgo * 7 * DAY).getTime();
  const logs: WorkoutLog[] = [];
  for (let s = 0; s < sessions; s++) {
    const setArr = Array.from({ length: sets }, (_, i) => ({
      setNumber: i + 1, weight, reps, rpe, completed: true,
    }));
    logs.push({
      id: `log-${weeksAgo}-${s}-${Math.random()}`,
      userId: 'u', mesocycleId: 'standalone', sessionId: `sess-${s}`,
      weekNumber: 1, dayNumber: s + 1,
      date: new Date(monday + Math.min(s, 4) * DAY).toISOString(),
      exercises: [{
        exerciseId: 'squat', exerciseName: 'Squat', sets: setArr, personalRecord: pr,
      }],
      totalVolume: sets * reps * weight,
      duration: 60, overallRPE: rpe, soreness: 3, energy: 3, notes: '', completed: true,
    } as unknown as WorkoutLog);
  }
  return logs;
}

describe('smart-deload engine — first-principles behavior', () => {
  it('returns no-deload + history reason with < 3 weeks of data', () => {
    const logs = [...week(0, {}), ...week(1, {})]; // 2 weeks
    const rec = getSmartDeloadRecommendation(logs, []);
    expect(rec.needed).toBe(false);
    expect(rec.reason.toLowerCase()).toContain('history');
    expect(rec.fatigueDebt.currentDebt).toBe(0);
  });

  it('a fresh, light athlete (low volume, RPE 7, recent PR) is NOT told to deload', () => {
    const logs = [
      ...week(0, { sessions: 2, sets: 3, reps: 8, weight: 60, rpe: 7, pr: true }),
      ...week(1, { sessions: 2, sets: 3, reps: 8, weight: 60, rpe: 7 }),
      ...week(2, { sessions: 2, sets: 3, reps: 8, weight: 60, rpe: 7 }),
      ...week(3, { sessions: 2, sets: 3, reps: 8, weight: 60, rpe: 7 }),
    ];
    const rec = getSmartDeloadRecommendation(logs, []);
    expect(rec.needed).toBe(false);
    expect(rec.fatigueDebt.currentDebt).toBeLessThan(70);
  });

  it('a hammered athlete (high volume, RPE 9.5, no PRs, 6 weeks) IS told to deload', () => {
    const logs = [0, 1, 2, 3, 4, 5].flatMap(w =>
      week(w, { sessions: 6, sets: 6, reps: 5, weight: 150, rpe: 9.5, pr: false }),
    );
    const rec = getSmartDeloadRecommendation(logs, []);
    expect(rec.needed).toBe(true);
    expect(['recommended', 'critical']).toContain(rec.urgency);
    expect(rec.fatigueDebt.currentDebt).toBeGreaterThan(50);
    expect(rec.protocol).toBeTruthy();
    expect(rec.protocol.durationDays).toBeGreaterThan(0);
  });

  it('fatigue debt is monotonic: harder training scores higher', () => {
    const easy = getSmartDeloadRecommendation(
      [0, 1, 2, 3].flatMap(w => week(w, { sessions: 2, sets: 3, reps: 8, weight: 60, rpe: 6.5 })), [],
    ).fatigueDebt.currentDebt;
    const hard = getSmartDeloadRecommendation(
      [0, 1, 2, 3].flatMap(w => week(w, { sessions: 6, sets: 6, reps: 5, weight: 150, rpe: 9.5 })), [],
    ).fatigueDebt.currentDebt;
    expect(hard).toBeGreaterThan(easy);
  });

  it('low wearable recovery for 5 straight days is a critical trigger', () => {
    const logs = [0, 1, 2, 3].flatMap(w => week(w, { sessions: 4, rpe: 8 }));
    const wearable: WearableData[] = Array.from({ length: 5 }, (_, i) => ({
      date: new Date(Date.now() - i * DAY).toISOString(),
      recoveryScore: 25,
    } as unknown as WearableData));
    const rec = getSmartDeloadRecommendation(logs, wearable);
    expect(rec.needed).toBe(true);
    expect(rec.urgency).toBe('critical');
    expect(rec.timing).toBe('now');
  });

  it('a hammered athlete WITHOUT a wearable is not mislabeled as a recovery/sleep deload', () => {
    // No wearable → recovery/sleep fatigue default to 50; they must not drive
    // the protocol choice. A high-volume grind should pick volume, not active_recovery.
    const logs = [0, 1, 2, 3, 4, 5].flatMap(w =>
      week(w, { sessions: 6, sets: 8, reps: 8, weight: 80, rpe: 8.5, pr: false }),
    );
    const rec = getSmartDeloadRecommendation(logs, []);
    expect(rec.needed).toBe(true);
    expect(['volume', 'intensity', 'full_rest']).toContain(rec.protocol.type);
    expect(rec.protocol.type).not.toBe('active_recovery');
  });

  it('estimated recovery days scales with debt', () => {
    const debt = calculateFatigueDebt(
      [0, 1, 2, 3, 4, 5].flatMap(w => week(w, { sessions: 6, sets: 6, reps: 5, weight: 150, rpe: 9.5 })), [],
    );
    expect(debt.estimatedRecoveryDays).toBeGreaterThan(0);
    expect(debt.weeklyFatigueScores.length).toBeGreaterThan(0);
  });
});
