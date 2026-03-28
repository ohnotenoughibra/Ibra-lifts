import { describe, it, expect } from 'vitest';
import {
  calculateEnhancedACWR,
  calculateIntensityHeatmap,
  calculateRHRTrend,
  calculateHRVDeviation,
  calculateSympatheticLoad,
  calculateNeuromuscularStrain,
  calculateSleepConsistency,
} from '@/lib/fatigue-metrics';
import type { WorkoutLog, WearableData, TrainingSession } from '@/lib/types';

// ── Helper factories ──────────────────────────────────────────────────────

function makeWorkoutLog(daysAgo: number, overrides: Partial<WorkoutLog> = {}): WorkoutLog {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    id: `log-${daysAgo}`,
    date: date.toISOString(),
    completed: true,
    exercises: overrides.exercises || [],
    totalVolume: 10000,
    overallRPE: 7,
    soreness: 4,
    energy: 7,
    duration: 60,
    notes: '',
    ...overrides,
  } as WorkoutLog;
}

function makeWearable(daysAgo: number, overrides: Partial<WearableData> = {}): WearableData {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    date: date.toISOString(),
    restingHR: 60,
    hrv: 50,
    sleepScore: 75,
    recoveryScore: 70,
    sleepConsistency: null,
    ...overrides,
  } as WearableData;
}

function makeTrainingSession(daysAgo: number, overrides: Partial<TrainingSession> = {}): TrainingSession {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    id: `ts-${daysAgo}`,
    date: date.toISOString(),
    type: 'bjj',
    category: 'grappling',
    duration: 60,
    perceivedExertion: 7,
    ...overrides,
  } as TrainingSession;
}

// ── calculateEnhancedACWR ─────────────────────────────────────────────────

describe('calculateEnhancedACWR', () => {
  it('should return no_data for empty logs', () => {
    const result = calculateEnhancedACWR([]);
    expect(result.status).toBe('no_data');
    expect(result.ratio).toBe(0);
    expect(result.acute).toBe(0);
    expect(result.chronic).toBe(0);
  });

  it('should calculate ACWR for consistent training', () => {
    // Train every other day for 28 days
    const logs: WorkoutLog[] = [];
    for (let i = 0; i < 28; i += 2) {
      logs.push(makeWorkoutLog(i, { overallRPE: 7, duration: 60 }));
    }
    const result = calculateEnhancedACWR(logs);
    expect(result.status).not.toBe('no_data');
    expect(result.ratio).toBeGreaterThan(0);
    expect(result.acute).toBeGreaterThan(0);
    expect(result.chronic).toBeGreaterThan(0);
  });

  it('should detect high ACWR when load spikes recently', () => {
    // Low chronic load (1 session/week for 3 weeks) + high acute (daily this week)
    const logs: WorkoutLog[] = [
      makeWorkoutLog(21, { overallRPE: 5, duration: 30 }),
      makeWorkoutLog(14, { overallRPE: 5, duration: 30 }),
      makeWorkoutLog(7, { overallRPE: 5, duration: 30 }),
      // Recent spike
      makeWorkoutLog(0, { overallRPE: 9, duration: 90 }),
      makeWorkoutLog(1, { overallRPE: 9, duration: 90 }),
      makeWorkoutLog(2, { overallRPE: 9, duration: 90 }),
      makeWorkoutLog(3, { overallRPE: 9, duration: 90 }),
      makeWorkoutLog(4, { overallRPE: 9, duration: 90 }),
      makeWorkoutLog(5, { overallRPE: 9, duration: 90 }),
      makeWorkoutLog(6, { overallRPE: 9, duration: 90 }),
    ];
    const result = calculateEnhancedACWR(logs);
    expect(result.ratio).toBeGreaterThan(1.3);
    expect(['high', 'very_high']).toContain(result.status);
  });

  it('should detect low ACWR when recent training drops', () => {
    // High chronic (daily for 3 weeks) + no training this week
    const logs: WorkoutLog[] = [];
    for (let i = 7; i < 28; i++) {
      logs.push(makeWorkoutLog(i, { overallRPE: 7, duration: 60 }));
    }
    const result = calculateEnhancedACWR(logs);
    expect(result.ratio).toBeLessThan(0.8);
    expect(result.status).toBe('low');
  });

  it('should detect optimal ACWR for steady training', () => {
    // Consistent daily training for 28 days
    const logs: WorkoutLog[] = [];
    for (let i = 0; i < 28; i++) {
      logs.push(makeWorkoutLog(i, { overallRPE: 7, duration: 60 }));
    }
    const result = calculateEnhancedACWR(logs);
    // Steady state should be around 1.0
    expect(result.ratio).toBeGreaterThanOrEqual(0.8);
    expect(result.ratio).toBeLessThanOrEqual(1.3);
    expect(result.status).toBe('optimal');
  });

  it('should include training sessions in load calculation', () => {
    const logs: WorkoutLog[] = [makeWorkoutLog(0)];
    const sessions: TrainingSession[] = [makeTrainingSession(1)];
    const withSessions = calculateEnhancedACWR(logs, sessions);
    const withoutSessions = calculateEnhancedACWR(logs);
    expect(withSessions.acute).toBeGreaterThanOrEqual(withoutSessions.acute);
  });

  it('should ignore logs older than 28 days', () => {
    const logs: WorkoutLog[] = [
      makeWorkoutLog(30, { overallRPE: 10, duration: 120 }),
      makeWorkoutLog(0, { overallRPE: 5, duration: 30 }),
    ];
    const result = calculateEnhancedACWR(logs);
    // Old log should not inflate the result
    expect(result.status).not.toBe('no_data');
  });

  it('should clamp ratio to 3.0 maximum', () => {
    // Extreme recent spike with no chronic base
    const logs: WorkoutLog[] = [
      makeWorkoutLog(0, { overallRPE: 10, duration: 180 }),
      makeWorkoutLog(1, { overallRPE: 10, duration: 180 }),
    ];
    const result = calculateEnhancedACWR(logs);
    expect(result.ratio).toBeLessThanOrEqual(3.0);
  });

  it('should handle single workout gracefully', () => {
    const logs: WorkoutLog[] = [makeWorkoutLog(0)];
    const result = calculateEnhancedACWR(logs);
    expect(result.status).not.toBe('no_data');
    expect(result.acute).toBeGreaterThan(0);
  });
});

// ── calculateIntensityHeatmap ─────────────────────────────────────────────

describe('calculateIntensityHeatmap', () => {
  it('should return 28 days by default', () => {
    const heatmap = calculateIntensityHeatmap([]);
    expect(heatmap).toHaveLength(28);
  });

  it('should return custom day count', () => {
    const heatmap = calculateIntensityHeatmap([], undefined, 14);
    expect(heatmap).toHaveLength(14);
  });

  it('should have zero intensity for days without workouts', () => {
    const heatmap = calculateIntensityHeatmap([]);
    for (const day of heatmap) {
      expect(day.intensity).toBe(0);
      expect(day.sessions).toBe(0);
    }
  });

  it('should have non-zero intensity on workout days', () => {
    const logs = [makeWorkoutLog(0, { overallRPE: 8, duration: 60 })];
    const heatmap = calculateIntensityHeatmap(logs);
    const today = heatmap[heatmap.length - 1];
    expect(today.intensity).toBeGreaterThan(0);
    expect(today.sessions).toBe(1);
  });

  it('should have intensity values between 0 and 100', () => {
    const logs: WorkoutLog[] = [];
    for (let i = 0; i < 28; i++) {
      logs.push(makeWorkoutLog(i, { overallRPE: 8, duration: 90 }));
    }
    const heatmap = calculateIntensityHeatmap(logs);
    for (const day of heatmap) {
      expect(day.intensity).toBeGreaterThanOrEqual(0);
      expect(day.intensity).toBeLessThanOrEqual(100);
    }
  });

  it('should have valid date strings', () => {
    const heatmap = calculateIntensityHeatmap([]);
    for (const day of heatmap) {
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

// ── calculateRHRTrend ─────────────────────────────────────────────────────

describe('calculateRHRTrend', () => {
  it('should return nulls for empty data', () => {
    const result = calculateRHRTrend([]);
    expect(result.current).toBeNull();
    expect(result.baseline).toBeNull();
    expect(result.status).toBe('normal');
    expect(result.delta).toBe(0);
  });

  it('should return normal status for stable RHR', () => {
    const data = Array.from({ length: 14 }, (_, i) =>
      makeWearable(i, { restingHR: 60 })
    );
    const result = calculateRHRTrend(data);
    expect(result.current).toBe(60);
    expect(result.status).toBe('normal');
    expect(Math.abs(result.delta)).toBeLessThan(1);
  });

  it('should detect elevated RHR', () => {
    const data = [
      ...Array.from({ length: 13 }, (_, i) =>
        makeWearable(i + 1, { restingHR: 60 })
      ),
      makeWearable(0, { restingHR: 64 }), // Current elevated by +4
    ];
    const result = calculateRHRTrend(data);
    expect(result.status).toBe('elevated');
    expect(result.delta).toBeGreaterThan(2);
  });

  it('should detect high RHR', () => {
    const data = [
      ...Array.from({ length: 13 }, (_, i) =>
        makeWearable(i + 1, { restingHR: 58 })
      ),
      makeWearable(0, { restingHR: 66 }), // Current high by +8
    ];
    const result = calculateRHRTrend(data);
    expect(result.status).toBe('high');
    expect(result.delta).toBeGreaterThan(5);
  });

  it('should handle single data point', () => {
    const data = [makeWearable(0, { restingHR: 65 })];
    const result = calculateRHRTrend(data);
    expect(result.current).toBe(65);
    expect(result.delta).toBe(0); // No baseline, delta = 0
  });
});

// ── calculateHRVDeviation ─────────────────────────────────────────────────

describe('calculateHRVDeviation', () => {
  it('should return nulls for empty data', () => {
    const result = calculateHRVDeviation([]);
    expect(result.current).toBeNull();
    expect(result.baseline).toBeNull();
    expect(result.status).toBe('normal');
  });

  it('should return normal status for stable HRV', () => {
    const data = Array.from({ length: 14 }, (_, i) =>
      makeWearable(i, { hrv: 50 })
    );
    const result = calculateHRVDeviation(data);
    expect(result.status).toBe('normal');
    expect(Math.abs(result.deviationPct)).toBeLessThan(5);
  });

  it('should detect suppressed HRV', () => {
    const data = [
      ...Array.from({ length: 13 }, (_, i) =>
        makeWearable(i + 1, { hrv: 50 })
      ),
      makeWearable(0, { hrv: 38 }), // -24% suppressed
    ];
    const result = calculateHRVDeviation(data);
    expect(result.status).toBe('suppressed');
    expect(result.deviationPct).toBeLessThan(-15);
  });

  it('should detect elevated HRV', () => {
    const data = [
      ...Array.from({ length: 13 }, (_, i) =>
        makeWearable(i + 1, { hrv: 50 })
      ),
      makeWearable(0, { hrv: 62 }), // +24% elevated
    ];
    const result = calculateHRVDeviation(data);
    expect(result.status).toBe('elevated');
    expect(result.deviationPct).toBeGreaterThan(15);
  });
});

// ── calculateSympatheticLoad ──────────────────────────────────────────────

describe('calculateSympatheticLoad', () => {
  it('should return 0 for empty data', () => {
    expect(calculateSympatheticLoad([])).toBe(0);
  });

  it('should return low score for healthy metrics', () => {
    const data = Array.from({ length: 14 }, (_, i) =>
      makeWearable(i, { restingHR: 60, hrv: 50, sleepScore: 85 })
    );
    const score = calculateSympatheticLoad(data);
    expect(score).toBeLessThan(30);
  });

  it('should return high score for stress indicators', () => {
    const data = [
      ...Array.from({ length: 13 }, (_, i) =>
        makeWearable(i + 1, { restingHR: 58, hrv: 50, sleepScore: 40 })
      ),
      makeWearable(0, { restingHR: 70, hrv: 30, sleepScore: 35 }),
    ];
    const score = calculateSympatheticLoad(data);
    expect(score).toBeGreaterThan(30);
  });

  it('should return value between 0 and 100', () => {
    const data = Array.from({ length: 14 }, (_, i) =>
      makeWearable(i, { restingHR: 60 + Math.random() * 15, hrv: 30 + Math.random() * 40 })
    );
    const score = calculateSympatheticLoad(data);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ── calculateNeuromuscularStrain ──────────────────────────────────────────

describe('calculateNeuromuscularStrain', () => {
  it('should return 0 for no workouts and no wearable data', () => {
    expect(calculateNeuromuscularStrain([], [])).toBe(0);
  });

  it('should increase with more heavy sets', () => {
    const makeExercises = (rpe: number) => [{
      exerciseId: 'test',
      sets: Array.from({ length: 5 }, () => ({ completed: true, rpe, weight: 100, reps: 5 })),
    }] as any;

    const lightLogs = [makeWorkoutLog(0, { exercises: makeExercises(6) })];
    const heavyLogs = [makeWorkoutLog(0, { exercises: makeExercises(9.5) })];
    const wearable = Array.from({ length: 7 }, (_, i) => makeWearable(i));

    const lightStrain = calculateNeuromuscularStrain(lightLogs, wearable);
    const heavyStrain = calculateNeuromuscularStrain(heavyLogs, wearable);
    expect(heavyStrain).toBeGreaterThan(lightStrain);
  });

  it('should include combat session intensity', () => {
    const wearable = Array.from({ length: 7 }, (_, i) => makeWearable(i));
    const noSessions = calculateNeuromuscularStrain([], wearable);
    const withSessions = calculateNeuromuscularStrain([], wearable, [
      makeTrainingSession(0, { perceivedExertion: 9, category: 'grappling' as any }),
      makeTrainingSession(1, { perceivedExertion: 9, category: 'striking' as any }),
    ]);
    expect(withSessions).toBeGreaterThan(noSessions);
  });

  it('should return value between 0 and 100', () => {
    const logs = Array.from({ length: 7 }, (_, i) => makeWorkoutLog(i));
    const wearable = Array.from({ length: 14 }, (_, i) => makeWearable(i));
    const strain = calculateNeuromuscularStrain(logs, wearable);
    expect(strain).toBeGreaterThanOrEqual(0);
    expect(strain).toBeLessThanOrEqual(100);
  });
});

// ── calculateSleepConsistency ─────────────────────────────────────────────

describe('calculateSleepConsistency', () => {
  it('should use Whoop sleep consistency when available', () => {
    const data = Array.from({ length: 7 }, (_, i) =>
      makeWearable(i, { sleepConsistency: 80 })
    );
    const result = calculateSleepConsistency(data);
    expect(result.score).toBe(80);
    expect(result.status).toBe('consistent');
  });

  it('should classify consistent sleep (>= 75)', () => {
    const data = Array.from({ length: 7 }, (_, i) =>
      makeWearable(i, { sleepConsistency: 85 })
    );
    expect(calculateSleepConsistency(data).status).toBe('consistent');
  });

  it('should classify moderate sleep (50-74)', () => {
    const data = Array.from({ length: 7 }, (_, i) =>
      makeWearable(i, { sleepConsistency: 60 })
    );
    expect(calculateSleepConsistency(data).status).toBe('moderate');
  });

  it('should classify irregular sleep (< 50)', () => {
    const data = Array.from({ length: 7 }, (_, i) =>
      makeWearable(i, { sleepConsistency: 30 })
    );
    expect(calculateSleepConsistency(data).status).toBe('irregular');
  });
});
