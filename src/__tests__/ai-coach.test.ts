import { describe, it, expect } from 'vitest';
import {
  generateWeeklySummary,
  getCoachMessage,
  generateExerciseProfile,
} from '@/lib/ai-coach';
import type { WorkoutLog, WearableData } from '@/lib/types';

// ── Helper factories ──────────────────────────────────────────────────────

function makeWorkoutLog(daysAgo: number, overrides: Partial<WorkoutLog> = {}): WorkoutLog {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    id: `log-${daysAgo}-${Math.random().toString(36).slice(2, 6)}`,
    date: date.toISOString(),
    completed: true,
    exercises: overrides.exercises || [
      {
        exerciseId: 'bench-press',
        exerciseName: 'Bench Press',
        sets: [
          { weight: 100, reps: 8, rpe: 7, completed: true },
          { weight: 100, reps: 8, rpe: 8, completed: true },
        ],
        personalRecord: false,
        feedback: undefined,
      },
    ],
    totalVolume: 5000,
    duration: 60,
    overallRPE: 7,
    energy: 7,
    soreness: 3,
    notes: '',
    preCheckIn: undefined,
    postFeedback: undefined,
    ...overrides,
  } as WorkoutLog;
}

function makeWearable(daysAgo: number, overrides: Partial<WearableData> = {}): WearableData {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    date: date.toISOString(),
    sleepScore: 75,
    recoveryScore: 70,
    restingHR: 60,
    hrv: 50,
    ...overrides,
  } as WearableData;
}

// ── generateWeeklySummary ─────────────────────────────────────────────────

describe('generateWeeklySummary', () => {
  it('should generate summary for no logs', () => {
    const summary = generateWeeklySummary([]);
    expect(summary.totalSessions).toBe(0);
    expect(summary.totalVolume).toBe(0);
    expect(summary.avgRPE).toBe(0);
    expect(summary.prsHit).toBe(0);
    expect(summary.recommendation).toContain('No training');
    expect(summary.areasToImprove).toContain('No completed sessions this week - even one session is better than none');
  });

  it('should count only completed logs from last 7 days', () => {
    const logs = [
      makeWorkoutLog(1, { completed: true }),
      makeWorkoutLog(2, { completed: true }),
      makeWorkoutLog(3, { completed: false }), // Not completed
      makeWorkoutLog(10), // Older than 7 days
    ];
    const summary = generateWeeklySummary(logs);
    expect(summary.totalSessions).toBe(2);
  });

  it('should aggregate volume correctly', () => {
    const logs = [
      makeWorkoutLog(1, { totalVolume: 5000 }),
      makeWorkoutLog(2, { totalVolume: 7000 }),
    ];
    const summary = generateWeeklySummary(logs);
    expect(summary.totalVolume).toBe(12000);
  });

  it('should calculate average RPE', () => {
    const logs = [
      makeWorkoutLog(1, { overallRPE: 7 }),
      makeWorkoutLog(2, { overallRPE: 9 }),
    ];
    const summary = generateWeeklySummary(logs);
    expect(summary.avgRPE).toBe(8);
  });

  it('should count PRs', () => {
    const logs = [
      makeWorkoutLog(1, {
        exercises: [
          { exerciseId: 'bench', personalRecord: true, sets: [] } as any,
          { exerciseId: 'squat', personalRecord: true, sets: [] } as any,
        ],
      }),
    ];
    const summary = generateWeeklySummary(logs);
    expect(summary.prsHit).toBe(2);
  });

  it('should include PR strength when PRs hit', () => {
    const logs = [
      makeWorkoutLog(1, {
        exercises: [{ exerciseId: 'bench', personalRecord: true, sets: [] } as any],
      }),
    ];
    const summary = generateWeeklySummary(logs);
    expect(summary.strengths.some(s => s.includes('PR'))).toBe(true);
  });

  it('should flag high RPE as area to improve', () => {
    const logs = [
      makeWorkoutLog(1, { overallRPE: 9.5 }),
      makeWorkoutLog(2, { overallRPE: 9.5 }),
    ];
    const summary = generateWeeklySummary(logs);
    expect(summary.areasToImprove.some(a => a.includes('RPE'))).toBe(true);
  });

  it('should flag low session count as area to improve', () => {
    const logs = [makeWorkoutLog(1)];
    const summary = generateWeeklySummary(logs);
    expect(summary.areasToImprove.some(a => a.includes('Only 1 session'))).toBe(true);
  });

  it('should incorporate wearable sleep data', () => {
    const logs = [makeWorkoutLog(1), makeWorkoutLog(2), makeWorkoutLog(3)];
    const wearable = [
      makeWearable(1, { sleepScore: 90 }),
      makeWearable(2, { sleepScore: 85 }),
    ];
    const summary = generateWeeklySummary(logs, wearable);
    expect(summary.avgSleepScore).not.toBeNull();
    expect(summary.avgSleepScore).toBeGreaterThanOrEqual(85);
  });

  it('should flag low sleep scores', () => {
    const logs = [makeWorkoutLog(1), makeWorkoutLog(2), makeWorkoutLog(3)];
    const wearable = [
      makeWearable(1, { sleepScore: 40 }),
      makeWearable(2, { sleepScore: 45 }),
    ];
    const summary = generateWeeklySummary(logs, wearable);
    expect(summary.areasToImprove.some(a => a.toLowerCase().includes('sleep'))).toBe(true);
  });

  it('should return null for sleep/recovery scores without wearable data', () => {
    const summary = generateWeeklySummary([makeWorkoutLog(1)]);
    expect(summary.avgSleepScore).toBeNull();
    expect(summary.avgRecoveryScore).toBeNull();
  });

  it('should have non-empty recommendation for any input', () => {
    const scenarios = [
      [], // No logs
      [makeWorkoutLog(1)], // Single log
      [makeWorkoutLog(1), makeWorkoutLog(2), makeWorkoutLog(3)], // Multiple
    ];
    for (const logs of scenarios) {
      const summary = generateWeeklySummary(logs);
      expect(summary.recommendation.length).toBeGreaterThan(0);
    }
  });

  it('should recommend deload when RPE is high + soreness is high', () => {
    const logs = [
      makeWorkoutLog(1, { overallRPE: 9.5, soreness: 8 }),
      makeWorkoutLog(2, { overallRPE: 9.5, soreness: 8 }),
      makeWorkoutLog(3, { overallRPE: 9.5, soreness: 8 }),
    ];
    const summary = generateWeeklySummary(logs);
    expect(summary.recommendation.toLowerCase()).toContain('deload');
  });

  it('should have valid generated timestamp', () => {
    const summary = generateWeeklySummary([]);
    expect(summary.generatedAt).toBeInstanceOf(Date);
  });

  it('should have unique id', () => {
    const s1 = generateWeeklySummary([]);
    const s2 = generateWeeklySummary([]);
    expect(s1.id).not.toBe(s2.id);
  });
});

// ── getCoachMessage ───────────────────────────────────────────────────────

describe('getCoachMessage', () => {
  it('should return comeback message when no recent logs and streak is 0', () => {
    const msg = getCoachMessage([], 0);
    expect(msg).toContain('a while');
  });

  it('should return momentum message when no week logs but streak > 0', () => {
    // Logs older than 7 days
    const logs = [makeWorkoutLog(10)];
    const msg = getCoachMessage(logs, 3);
    expect(msg).toContain('over a week');
  });

  it('should mention PRs when recent logs have PRs', () => {
    const logs = [
      makeWorkoutLog(1, {
        exercises: [
          { exerciseId: 'bench', personalRecord: true, sets: [] } as any,
        ],
      }),
    ];
    const msg = getCoachMessage(logs, 5);
    expect(msg).toContain('PR');
  });

  it('should warn about high RPE', () => {
    const logs = [
      makeWorkoutLog(0, { overallRPE: 9.5 }),
      makeWorkoutLog(1, { overallRPE: 9.5 }),
      makeWorkoutLog(2, { overallRPE: 9.5 }),
    ];
    const msg = getCoachMessage(logs, 5);
    expect(msg).toContain('RPE');
  });

  it('should address low energy', () => {
    const logs = [
      makeWorkoutLog(0, { energy: 2 }),
      makeWorkoutLog(1, { energy: 2 }),
    ];
    const msg = getCoachMessage(logs, 5);
    expect(msg.toLowerCase()).toContain('energy');
  });

  it('should acknowledge long streaks (> 14 days)', () => {
    const logs = [makeWorkoutLog(0), makeWorkoutLog(1), makeWorkoutLog(2)];
    const msg = getCoachMessage(logs, 20);
    expect(msg).toContain('20');
    expect(msg.toLowerCase()).toContain('streak');
  });

  it('should acknowledge moderate streaks (7-14 days)', () => {
    const logs = [makeWorkoutLog(0), makeWorkoutLog(1), makeWorkoutLog(2)];
    const msg = getCoachMessage(logs, 10);
    expect(msg).toContain('10');
  });

  it('should address high soreness', () => {
    const logs = [
      makeWorkoutLog(0, { soreness: 8 }),
      makeWorkoutLog(1, { soreness: 9 }),
    ];
    const msg = getCoachMessage(logs, 5);
    expect(msg.toLowerCase()).toContain('soreness');
  });

  it('should return default message for moderate training', () => {
    const logs = [
      makeWorkoutLog(0, { overallRPE: 7, soreness: 3, energy: 7 }),
      makeWorkoutLog(1, { overallRPE: 7, soreness: 3, energy: 7 }),
      makeWorkoutLog(2, { overallRPE: 7, soreness: 3, energy: 7 }),
    ];
    const msg = getCoachMessage(logs, 3);
    expect(msg.toLowerCase()).toContain('training');
    expect(msg.length).toBeGreaterThan(20);
  });

  it('should always return a non-empty string', () => {
    const scenarios: [WorkoutLog[], number][] = [
      [[], 0],
      [[], 5],
      [[makeWorkoutLog(0)], 0],
      [[makeWorkoutLog(0), makeWorkoutLog(1), makeWorkoutLog(2)], 10],
    ];
    for (const [logs, streak] of scenarios) {
      expect(getCoachMessage(logs, streak).length).toBeGreaterThan(0);
    }
  });
});

// ── generateExerciseProfile ───────────────────────────────────────────────

describe('generateExerciseProfile', () => {
  it('should return profile with zero sessions for exercise with no history', () => {
    const profile = generateExerciseProfile('bench-press', 'Bench Press', []);
    expect(profile.totalSessions).toBe(0);
  });

  it('should count sessions for matching exercise', () => {
    const logs = [
      makeWorkoutLog(1, {
        exercises: [
          {
            exerciseId: 'bench-press',
            exerciseName: 'Bench Press',
            sets: [{ weight: 80, reps: 8, completed: true }],
            personalRecord: false,
          } as any,
        ],
      }),
      makeWorkoutLog(2, {
        exercises: [
          {
            exerciseId: 'bench-press',
            exerciseName: 'Bench Press',
            sets: [{ weight: 85, reps: 8, completed: true }],
            personalRecord: false,
          } as any,
        ],
      }),
    ];
    const profile = generateExerciseProfile('bench-press', 'Bench Press', logs);
    expect(profile.totalSessions).toBe(2);
  });

  it('should not count other exercises', () => {
    const logs = [
      makeWorkoutLog(1, {
        exercises: [
          { exerciseId: 'squat', exerciseName: 'Squat', sets: [], personalRecord: false } as any,
        ],
      }),
    ];
    const profile = generateExerciseProfile('bench-press', 'Bench Press', logs);
    expect(profile.totalSessions).toBe(0);
  });

  it('should return exercise name and id', () => {
    const profile = generateExerciseProfile('bench-press', 'Bench Press', []);
    expect(profile.exerciseId).toBe('bench-press');
    expect(profile.exerciseName).toBe('Bench Press');
  });
});
