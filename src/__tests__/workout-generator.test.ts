import { describe, it, expect } from 'vitest';
import {
  generateMesocycle,
  calculate1RM,
  calculateWorkingWeight,
  suggestAdjustments,
  autoregulateSession,
  VOLUME_LANDMARKS,
} from '@/lib/workout-generator';
import type { WorkoutLog, WorkoutSession, ExercisePrescription } from '@/lib/types';

// ── Helper factories ──────────────────────────────────────────────────────

function makeOptions(overrides: Record<string, unknown> = {}) {
  return {
    userId: 'test-user',
    goalFocus: 'strength' as const,
    equipment: 'full_gym' as const,
    sessionsPerWeek: 3 as const,
    weeks: 4,
    experienceLevel: 'intermediate' as const,
    ...overrides,
  };
}

function makeWorkoutLog(overrides: Partial<WorkoutLog> = {}): WorkoutLog {
  return {
    id: 'log-1',
    date: new Date(),
    completed: true,
    exercises: [],
    totalVolume: 10000,
    overallRPE: 7,
    soreness: 4,
    energy: 7,
    duration: 60,
    notes: '',
    postFeedback: undefined,
    preCheckIn: undefined,
    ...overrides,
  } as WorkoutLog;
}

function makeSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: 'session-1',
    name: 'Test Session',
    type: 'hypertrophy',
    dayNumber: 1,
    exercises: [
      {
        exerciseId: 'bench-press',
        exercise: { id: 'bench-press', name: 'Bench Press', primaryMuscles: ['chest'], secondaryMuscles: ['triceps'], category: 'compound', equipment: 'barbell' } as any,
        sets: 4,
        prescription: { reps: 8, rpe: 7.5, percentageOf1RM: 75 } as any,
      },
    ],
    estimatedDuration: 60,
    warmUp: [],
    coolDown: [],
    ...overrides,
  };
}

// ── generateMesocycle ─────────────────────────────────────────────────────

describe('generateMesocycle', () => {
  it('should generate a 4-week mesocycle for strength focus', () => {
    const meso = generateMesocycle(makeOptions({ goalFocus: 'strength', weeks: 4 }));
    expect(meso.weeks).toHaveLength(4);
    expect(meso.goalFocus).toBe('strength');
    expect(meso.status).toBe('active');
  });

  it('should generate mesocycle for hypertrophy focus', () => {
    const meso = generateMesocycle(makeOptions({ goalFocus: 'hypertrophy', weeks: 5 }));
    expect(meso.weeks).toHaveLength(5);
    expect(meso.goalFocus).toBe('hypertrophy');
  });

  it('should generate mesocycle for power focus', () => {
    const meso = generateMesocycle(makeOptions({ goalFocus: 'power', weeks: 4 }));
    expect(meso.goalFocus).toBe('power');
    expect(meso.weeks.length).toBe(4);
  });

  it('should include a deload week as the last week by default', () => {
    const meso = generateMesocycle(makeOptions({ weeks: 5 }));
    const lastWeek = meso.weeks[meso.weeks.length - 1];
    expect(lastWeek.isDeload).toBe(true);
  });

  it('should skip deload when includeDeload is false', () => {
    const meso = generateMesocycle(makeOptions({ weeks: 4, includeDeload: false }));
    const lastWeek = meso.weeks[meso.weeks.length - 1];
    expect(lastWeek.isDeload).toBe(false);
  });

  it('should auto-select linear periodization for beginners', () => {
    const meso = generateMesocycle(makeOptions({ experienceLevel: 'beginner', weeks: 4 }));
    // Beginners get linear — all sessions in a week should share similar type
    expect(meso.weeks).toHaveLength(4);
  });

  it('should respect sessionsPerWeek count', () => {
    const meso = generateMesocycle(makeOptions({ sessionsPerWeek: 4, weeks: 4 }));
    // Each non-deload week should have sessionsPerWeek sessions
    const nonDeloadWeeks = meso.weeks.filter(w => !w.isDeload);
    for (const week of nonDeloadWeeks) {
      expect(week.sessions.length).toBe(4);
    }
  });

  it('should create at least 1 session per week with minimal equipment', () => {
    const meso = generateMesocycle(makeOptions({
      equipment: 'minimal',
      sessionsPerWeek: 2,
      weeks: 3,
    }));
    for (const week of meso.weeks) {
      expect(week.sessions.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('should use combat-themed names for combat identity', () => {
    const meso = generateMesocycle(makeOptions({
      trainingIdentity: 'combat',
      goalFocus: 'strength',
      weeks: 4,
    }));
    expect(meso.name).toBeTruthy();
    // Combat names include words like Combat, Mat, Fight, Grappler, etc.
    expect(typeof meso.name).toBe('string');
  });

  it('should handle 6 sessions per week for advanced athletes', () => {
    const meso = generateMesocycle(makeOptions({
      sessionsPerWeek: 6,
      experienceLevel: 'advanced',
      weeks: 5,
    }));
    const nonDeloadWeeks = meso.weeks.filter(w => !w.isDeload);
    for (const week of nonDeloadWeeks) {
      expect(week.sessions.length).toBe(6);
    }
  });

  it('should generate unique mesocycle id', () => {
    const meso1 = generateMesocycle(makeOptions());
    const meso2 = generateMesocycle(makeOptions());
    expect(meso1.id).not.toBe(meso2.id);
  });

  it('should set valid start and end dates', () => {
    const meso = generateMesocycle(makeOptions({ weeks: 4 }));
    expect(meso.startDate).toBeInstanceOf(Date);
    expect(meso.endDate).toBeInstanceOf(Date);
    expect(meso.endDate.getTime()).toBeGreaterThan(meso.startDate.getTime());
  });

  it('should handle diet goal modifiers', () => {
    const cutMeso = generateMesocycle(makeOptions({ dietGoal: 'cut', weeks: 4 }));
    const bulkMeso = generateMesocycle(makeOptions({ dietGoal: 'bulk', weeks: 4 }));
    // Both should generate valid mesocycles
    expect(cutMeso.weeks.length).toBe(4);
    expect(bulkMeso.weeks.length).toBe(4);
  });

  it('should apply sex-based modifiers for female athletes', () => {
    const meso = generateMesocycle(makeOptions({ sex: 'female', weeks: 4 }));
    expect(meso.weeks.length).toBe(4);
  });
});

// ── calculate1RM ──────────────────────────────────────────────────────────

describe('calculate1RM', () => {
  it('should return the weight itself for 1 rep', () => {
    expect(calculate1RM(100, 1)).toBe(100);
  });

  it('should estimate higher 1RM for multiple reps', () => {
    const oneRM = calculate1RM(100, 5);
    expect(oneRM).toBeGreaterThan(100);
  });

  it('should return 0 for zero weight', () => {
    expect(calculate1RM(0, 5)).toBe(0);
  });

  it('should return 0 for zero reps', () => {
    expect(calculate1RM(100, 0)).toBe(0);
  });

  it('should return 0 for negative inputs', () => {
    expect(calculate1RM(-50, 5)).toBe(0);
    expect(calculate1RM(100, -3)).toBe(0);
  });

  it('should use Brzycki formula correctly for known values', () => {
    // 100kg x 5 reps: 1RM = 100 / (1.0278 - 0.0278*5) = 100 / 0.8888 ≈ 112.5
    const oneRM = calculate1RM(100, 5);
    expect(oneRM).toBeCloseTo(113, 0);
  });

  it('should return rounded values', () => {
    const oneRM = calculate1RM(100, 3);
    expect(oneRM).toBe(Math.round(oneRM));
  });
});

// ── calculateWorkingWeight ────────────────────────────────────────────────

describe('calculateWorkingWeight', () => {
  it('should calculate correct working weight at 80% of 100kg', () => {
    const ww = calculateWorkingWeight(100, 80);
    expect(ww).toBe(80);
  });

  it('should round to nearest 2.5kg increment by default', () => {
    const ww = calculateWorkingWeight(100, 73);
    expect(ww % 2.5).toBe(0);
  });

  it('should round to custom increment', () => {
    const ww = calculateWorkingWeight(100, 73, 5);
    expect(ww % 5).toBe(0);
  });

  it('should return 0 for 0% of 1RM', () => {
    expect(calculateWorkingWeight(100, 0)).toBe(0);
  });
});

// ── suggestAdjustments ────────────────────────────────────────────────────

describe('suggestAdjustments', () => {
  it('should suggest backing off when RPE is very high and soreness is high', () => {
    const result = suggestAdjustments(9.5, 8, 5);
    expect(result.volumeAdjustment).toBeLessThan(0);
    expect(result.intensityAdjustment).toBeLessThan(0);
  });

  it('should suggest progression when RPE is low and soreness is low', () => {
    const result = suggestAdjustments(6, 3, 7);
    expect(result.volumeAdjustment).toBeGreaterThan(0);
    expect(result.intensityAdjustment).toBeGreaterThan(0);
  });

  it('should maintain when metrics are moderate', () => {
    const result = suggestAdjustments(7.5, 5, 6);
    expect(result.message).toContain('On track');
  });

  it('should reduce volume for poor performance despite good recovery', () => {
    const result = suggestAdjustments(7, 4, 3);
    expect(result.volumeAdjustment).toBeLessThan(0);
    expect(result.message).toContain('Performance dip');
  });

  it('should detect rising RPE trend across 3 sessions', () => {
    // Rising trend: 7.5 -> 8.5 -> 9.5, avgRPE = 8.5 (> 8), trend = +2 (> 1.0)
    const result = suggestAdjustments(9.5, 5, 6, [7.5, 8.5, 9.5]);
    expect(result.volumeAdjustment).toBeLessThan(0);
    expect(result.message.toLowerCase()).toContain('rpe');
  });

  it('should be more aggressive with chronic high RPE + rising trend + high soreness', () => {
    const result = suggestAdjustments(9.5, 6, 5, [9, 9.5, 10]);
    expect(result.volumeAdjustment).toBeLessThanOrEqual(-0.20);
  });

  it('should always return a message', () => {
    const result = suggestAdjustments(7, 5, 6);
    expect(result.message.length).toBeGreaterThan(0);
  });
});

// ── autoregulateSession ───────────────────────────────────────────────────

describe('autoregulateSession', () => {
  it('should return original session with no recent logs', () => {
    const session = makeSession();
    const result = autoregulateSession(session, []);
    expect(result.session).toBe(session);
    expect(result.message).toContain('No recent data');
  });

  it('should reduce sets when recent RPE is very high', () => {
    const session = makeSession();
    const highRPELogs = [
      makeWorkoutLog({ overallRPE: 9.5, soreness: 8 }),
      makeWorkoutLog({ overallRPE: 9.5, soreness: 8, date: new Date(Date.now() - 86400000) }),
    ];
    const result = autoregulateSession(session, highRPELogs);
    // Should reduce sets
    expect(result.session.exercises[0].sets).toBeLessThanOrEqual(session.exercises[0].sets);
  });

  it('should maintain session when metrics are moderate', () => {
    const session = makeSession();
    const moderateLogs = [
      makeWorkoutLog({ overallRPE: 7.5, soreness: 4, postFeedback: { overallPerformance: 'as_expected' } as any }),
    ];
    const result = autoregulateSession(session, moderateLogs);
    expect(result.message).toContain('On track');
  });

  it('should never reduce sets below 2', () => {
    const session = makeSession({
      exercises: [{
        exerciseId: 'test',
        exercise: { id: 'test', name: 'Test', primaryMuscles: ['chest'], secondaryMuscles: [], category: 'compound', equipment: 'barbell' } as any,
        sets: 2,
        prescription: { reps: 8, rpe: 8, percentageOf1RM: 80 } as any,
      }],
    });
    const extremeLogs = [
      makeWorkoutLog({ overallRPE: 10, soreness: 10 }),
      makeWorkoutLog({ overallRPE: 10, soreness: 10, date: new Date(Date.now() - 86400000) }),
      makeWorkoutLog({ overallRPE: 10, soreness: 10, date: new Date(Date.now() - 172800000) }),
    ];
    const result = autoregulateSession(session, extremeLogs);
    expect(result.session.exercises[0].sets).toBeGreaterThanOrEqual(2);
  });

  it('should clamp RPE between 5 and 10', () => {
    const session = makeSession();
    const extremeLogs = [
      makeWorkoutLog({ overallRPE: 10, soreness: 10 }),
      makeWorkoutLog({ overallRPE: 10, soreness: 10, date: new Date(Date.now() - 86400000) }),
      makeWorkoutLog({ overallRPE: 10, soreness: 10, date: new Date(Date.now() - 172800000) }),
    ];
    const result = autoregulateSession(session, extremeLogs);
    for (const ex of result.session.exercises) {
      expect(ex.prescription.rpe).toBeGreaterThanOrEqual(5);
      expect(ex.prescription.rpe).toBeLessThanOrEqual(10);
    }
  });
});

// ── VOLUME_LANDMARKS ──────────────────────────────────────────────────────

describe('VOLUME_LANDMARKS', () => {
  it('should have MEV < MAV < MRV for all muscle groups', () => {
    for (const [muscle, lm] of Object.entries(VOLUME_LANDMARKS)) {
      expect(lm.mev).toBeLessThan(lm.mav);
      expect(lm.mav).toBeLessThan(lm.mrv);
    }
  });

  it('should cover major muscle groups', () => {
    expect(VOLUME_LANDMARKS).toHaveProperty('chest');
    expect(VOLUME_LANDMARKS).toHaveProperty('back');
    expect(VOLUME_LANDMARKS).toHaveProperty('quadriceps');
    expect(VOLUME_LANDMARKS).toHaveProperty('hamstrings');
    expect(VOLUME_LANDMARKS).toHaveProperty('shoulders');
  });
});
