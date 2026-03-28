import { describe, it, expect } from 'vitest';
import {
  buildRecoveryProfile,
  projectReadiness,
  findOptimalTrainingWindow,
  updateRecoveryProfile,
  type RecoveryProfile,
} from '@/lib/adaptive-readiness';
import type { WorkoutLog, TrainingSession } from '@/lib/types';

// ── Helper factories ──────────────────────────────────────────────────────

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
    preCheckIn: undefined,
    ...overrides,
  } as WorkoutLog;
}

function makeDefaultProfile(): RecoveryProfile {
  return {
    userId: 'test-user',
    avgRecoveryHours: 48,
    recoveryByIntensity: { light: 24, moderate: 36, hard: 48, max: 72 },
    sorenessSensitivity: 0.5,
    sleepImpact: 0.5,
    ageDecayFactor: 1.0,
    dataPoints: 25,
    confidence: 'high',
    lastUpdated: new Date().toISOString(),
  };
}

function makeTrainingSession(overrides: Partial<TrainingSession> = {}): TrainingSession {
  return {
    id: 'ts-1',
    date: new Date(),
    type: 'bjj',
    category: 'grappling',
    duration: 60,
    perceivedExertion: 7,
    ...overrides,
  } as TrainingSession;
}

// ── buildRecoveryProfile ──────────────────────────────────────────────────

describe('buildRecoveryProfile', () => {
  it('should return population defaults for empty logs', () => {
    const profile = buildRecoveryProfile([], []);
    expect(profile.avgRecoveryHours).toBe(48);
    expect(profile.confidence).toBe('low');
    expect(profile.dataPoints).toBe(0);
  });

  it('should return population defaults for single workout log', () => {
    const logs = [makeWorkoutLog()];
    const profile = buildRecoveryProfile(logs, []);
    // Single workout = 0 pairs = defaults
    expect(profile.confidence).toBe('low');
  });

  it('should build profile from consecutive workout logs', () => {
    const now = new Date();
    const logs: WorkoutLog[] = [];
    // Create 15 workout logs, each 24 hours apart
    for (let i = 0; i < 15; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      logs.push(makeWorkoutLog({
        id: `log-${i}`,
        date: date,
        overallRPE: 7,
        energy: 7,
        soreness: 3,
        preCheckIn: {
          soreness: 2,
          sleepQuality: 4,
          motivation: 4,
          stress: 2,
        } as any,
      }));
    }
    const profile = buildRecoveryProfile(logs, []);
    expect(profile.dataPoints).toBeGreaterThan(0);
    expect(profile.avgRecoveryHours).toBeGreaterThan(0);
  });

  it('should incorporate training sessions into observations', () => {
    const now = new Date();
    const sessions: TrainingSession[] = [];
    for (let i = 0; i < 15; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      sessions.push(makeTrainingSession({
        id: `ts-${i}`,
        date: date,
        perceivedExertion: 6,
      }));
    }
    const profile = buildRecoveryProfile([], sessions);
    expect(profile.dataPoints).toBeGreaterThan(0);
  });

  it('should skip unreasonably short gaps (< 2h)', () => {
    const now = new Date();
    const logs = [
      makeWorkoutLog({ id: 'l1', date: now, overallRPE: 7 }),
      makeWorkoutLog({ id: 'l2', date: new Date(now.getTime() + 30 * 60000), overallRPE: 7 }),
    ];
    const profile = buildRecoveryProfile(logs, []);
    // 30 min gap should be skipped
    expect(profile.dataPoints).toBe(0);
  });

  it('should skip very long gaps (> 7 days)', () => {
    const now = new Date();
    const logs = [
      makeWorkoutLog({ id: 'l1', date: now, overallRPE: 7 }),
      makeWorkoutLog({ id: 'l2', date: new Date(now.getTime() - 10 * 24 * 3600000), overallRPE: 7 }),
    ];
    const profile = buildRecoveryProfile(logs, []);
    expect(profile.dataPoints).toBe(0);
  });

  it('should set confidence based on data point count', () => {
    const now = new Date();
    const logs: WorkoutLog[] = [];
    // Create enough for 'medium' confidence (10+ pairs)
    for (let i = 0; i < 12; i++) {
      logs.push(makeWorkoutLog({
        id: `log-${i}`,
        date: new Date(now.getTime() - i * 24 * 3600000),
        overallRPE: 7,
      }));
    }
    const profile = buildRecoveryProfile(logs, []);
    expect(['medium', 'high']).toContain(profile.confidence);
  });

  it('should have recovery by intensity buckets', () => {
    const profile = buildRecoveryProfile([], []);
    expect(profile.recoveryByIntensity).toHaveProperty('light');
    expect(profile.recoveryByIntensity).toHaveProperty('moderate');
    expect(profile.recoveryByIntensity).toHaveProperty('hard');
    expect(profile.recoveryByIntensity).toHaveProperty('max');
  });

  it('should have all profile fields defined', () => {
    const profile = buildRecoveryProfile([], []);
    expect(profile.sorenessSensitivity).toBeGreaterThanOrEqual(0);
    expect(profile.sorenessSensitivity).toBeLessThanOrEqual(1);
    expect(profile.sleepImpact).toBeGreaterThanOrEqual(0);
    expect(profile.sleepImpact).toBeLessThanOrEqual(1);
    expect(profile.ageDecayFactor).toBeGreaterThan(0);
    expect(profile.lastUpdated).toBeTruthy();
  });
});

// ── projectReadiness ──────────────────────────────────────────────────────

describe('projectReadiness', () => {
  const profile = makeDefaultProfile();

  it('should project readiness at multiple time points', () => {
    const projections = projectReadiness(
      {
        lastWorkoutDate: new Date(Date.now() - 6 * 3600000).toISOString(), // 6h ago
        lastWorkoutRPE: 7,
        lastWorkoutVolume: 10000,
      },
      profile,
      [0, 12, 24, 48],
    );
    expect(projections).toHaveLength(4);
  });

  it('should show increasing readiness over time', () => {
    const projections = projectReadiness(
      {
        lastWorkoutDate: new Date(Date.now() - 2 * 3600000).toISOString(), // 2h ago
        lastWorkoutRPE: 8,
        lastWorkoutVolume: 15000,
      },
      profile,
      [0, 6, 12, 24, 48],
    );
    for (let i = 1; i < projections.length; i++) {
      expect(projections[i].projectedReadiness).toBeGreaterThanOrEqual(
        projections[i - 1].projectedReadiness
      );
    }
  });

  it('should project higher readiness with good sleep quality', () => {
    const withGoodSleep = projectReadiness(
      {
        lastWorkoutDate: new Date(Date.now() - 6 * 3600000).toISOString(),
        lastWorkoutRPE: 7,
        lastWorkoutVolume: 10000,
        sleepQuality: 5,
      },
      profile,
      [24],
    );
    const withBadSleep = projectReadiness(
      {
        lastWorkoutDate: new Date(Date.now() - 6 * 3600000).toISOString(),
        lastWorkoutRPE: 7,
        lastWorkoutVolume: 10000,
        sleepQuality: 1,
      },
      profile,
      [24],
    );
    expect(withGoodSleep[0].projectedReadiness).toBeGreaterThan(
      withBadSleep[0].projectedReadiness
    );
  });

  it('should project lower readiness with high soreness', () => {
    const noSoreness = projectReadiness(
      {
        lastWorkoutDate: new Date(Date.now() - 6 * 3600000).toISOString(),
        lastWorkoutRPE: 7,
        lastWorkoutVolume: 10000,
        soreness: 1,
      },
      profile,
      [24],
    );
    const highSoreness = projectReadiness(
      {
        lastWorkoutDate: new Date(Date.now() - 6 * 3600000).toISOString(),
        lastWorkoutRPE: 7,
        lastWorkoutVolume: 10000,
        soreness: 5,
      },
      profile,
      [24],
    );
    expect(noSoreness[0].projectedReadiness).toBeGreaterThan(
      highSoreness[0].projectedReadiness
    );
  });

  it('should return readiness between 0 and 100', () => {
    const projections = projectReadiness(
      {
        lastWorkoutDate: new Date(Date.now() - 3600000).toISOString(),
        lastWorkoutRPE: 10,
        lastWorkoutVolume: 20000,
      },
      profile,
      [0, 1, 12, 24, 48, 72, 96],
    );
    for (const p of projections) {
      expect(p.projectedReadiness).toBeGreaterThanOrEqual(0);
      expect(p.projectedReadiness).toBeLessThanOrEqual(100);
    }
  });

  it('should have decreasing confidence for further projections', () => {
    const projections = projectReadiness(
      {
        lastWorkoutDate: new Date(Date.now() - 6 * 3600000).toISOString(),
        lastWorkoutRPE: 7,
        lastWorkoutVolume: 10000,
      },
      profile,
      [0, 24, 48, 96],
    );
    for (let i = 1; i < projections.length; i++) {
      expect(projections[i].confidence).toBeLessThanOrEqual(projections[i - 1].confidence);
    }
  });

  it('should use lower recovery time for light RPE', () => {
    const lightRPE = projectReadiness(
      {
        lastWorkoutDate: new Date(Date.now() - 6 * 3600000).toISOString(),
        lastWorkoutRPE: 3,
        lastWorkoutVolume: 5000,
      },
      profile,
      [12],
    );
    const maxRPE = projectReadiness(
      {
        lastWorkoutDate: new Date(Date.now() - 6 * 3600000).toISOString(),
        lastWorkoutRPE: 10,
        lastWorkoutVolume: 20000,
      },
      profile,
      [12],
    );
    expect(lightRPE[0].projectedReadiness).toBeGreaterThan(maxRPE[0].projectedReadiness);
  });
});

// ── findOptimalTrainingWindow ─────────────────────────────────────────────

describe('findOptimalTrainingWindow', () => {
  const profile = makeDefaultProfile();

  it('should find recovery window for recent workout', () => {
    const window = findOptimalTrainingWindow(
      {
        lastWorkoutDate: new Date(Date.now() - 2 * 3600000).toISOString(),
        lastWorkoutRPE: 8,
      },
      profile,
    );
    expect(window.estimatedRecoveryTime).toBeGreaterThan(0);
    expect(window.currentReadiness).toBeGreaterThanOrEqual(0);
    expect(window.currentReadiness).toBeLessThanOrEqual(100);
  });

  it('should show already-ready when workout was long ago', () => {
    const window = findOptimalTrainingWindow(
      {
        lastWorkoutDate: new Date(Date.now() - 72 * 3600000).toISOString(),
        lastWorkoutRPE: 7,
      },
      profile,
    );
    expect(window.estimatedRecoveryTime).toBe(0);
    expect(window.currentReadiness).toBeGreaterThan(70);
  });

  it('should show optimal training window with start <= end', () => {
    const window = findOptimalTrainingWindow(
      {
        lastWorkoutDate: new Date(Date.now() - 6 * 3600000).toISOString(),
        lastWorkoutRPE: 8,
      },
      profile,
    );
    expect(window.optimalTrainingWindow.start).toBeLessThanOrEqual(
      window.optimalTrainingWindow.end
    );
  });

  it('should handle higher minReadiness threshold', () => {
    const window70 = findOptimalTrainingWindow(
      {
        lastWorkoutDate: new Date(Date.now() - 6 * 3600000).toISOString(),
        lastWorkoutRPE: 8,
      },
      profile,
      70,
    );
    const window85 = findOptimalTrainingWindow(
      {
        lastWorkoutDate: new Date(Date.now() - 6 * 3600000).toISOString(),
        lastWorkoutRPE: 8,
      },
      profile,
      85,
    );
    expect(window85.estimatedRecoveryTime).toBeGreaterThanOrEqual(
      window70.estimatedRecoveryTime
    );
  });

  it('should handle soreness affecting recovery time', () => {
    const noSoreness = findOptimalTrainingWindow(
      {
        lastWorkoutDate: new Date(Date.now() - 6 * 3600000).toISOString(),
        lastWorkoutRPE: 7,
        soreness: 1,
      },
      profile,
    );
    const highSoreness = findOptimalTrainingWindow(
      {
        lastWorkoutDate: new Date(Date.now() - 6 * 3600000).toISOString(),
        lastWorkoutRPE: 7,
        soreness: 5,
      },
      profile,
    );
    expect(highSoreness.estimatedRecoveryTime).toBeGreaterThanOrEqual(
      noSoreness.estimatedRecoveryTime
    );
  });

  it('should gracefully handle invalid date', () => {
    const window = findOptimalTrainingWindow(
      {
        lastWorkoutDate: 'invalid-date',
        lastWorkoutRPE: 7,
      },
      profile,
    );
    // Should not throw — uses fallback
    expect(window.currentReadiness).toBeGreaterThanOrEqual(0);
  });
});

// ── updateRecoveryProfile ─────────────────────────────────────────────────

describe('updateRecoveryProfile', () => {
  it('should incrementally update average recovery hours', () => {
    const existing = makeDefaultProfile();
    const updated = updateRecoveryProfile(existing, {
      workoutRPE: 7,
      hoursBetween: 24,
      nextReadiness: 80,
    });
    // Should move avgRecoveryHours slightly toward the new observation
    expect(updated.avgRecoveryHours).not.toBe(existing.avgRecoveryHours);
  });

  it('should update the relevant intensity bucket', () => {
    const existing = makeDefaultProfile();
    const updated = updateRecoveryProfile(existing, {
      workoutRPE: 9, // hard/max bucket
      hoursBetween: 48,
      nextReadiness: 70,
    });
    // Max bucket should have changed
    expect(updated.recoveryByIntensity.max).not.toBe(existing.recoveryByIntensity.max);
  });

  it('should preserve data points count and increment', () => {
    const existing = makeDefaultProfile();
    const updated = updateRecoveryProfile(existing, {
      workoutRPE: 7,
      hoursBetween: 36,
      nextReadiness: 75,
    });
    expect(updated.dataPoints).toBe(existing.dataPoints + 1);
  });

  it('should use EMA with 10% weight on new data', () => {
    const existing = makeDefaultProfile();
    // Inject a very different tau — the avg should move slightly, not jump
    const updated = updateRecoveryProfile(existing, {
      workoutRPE: 7,
      hoursBetween: 100,
      nextReadiness: 50, // Very slow recovery = high tau
    });
    // Should be between existing (48) and something much higher, but close to 48 due to EMA
    expect(updated.avgRecoveryHours).toBeGreaterThan(48);
    expect(updated.avgRecoveryHours).toBeLessThan(80); // EMA dampens the jump
  });

  it('should update sleep impact when sleep data provided', () => {
    const existing = makeDefaultProfile();
    const updated = updateRecoveryProfile(existing, {
      workoutRPE: 7,
      hoursBetween: 36,
      nextReadiness: 80,
      sleepQuality: 5,
    });
    // sleepImpact may change
    expect(typeof updated.sleepImpact).toBe('number');
    expect(updated.sleepImpact).toBeGreaterThanOrEqual(0);
    expect(updated.sleepImpact).toBeLessThanOrEqual(1);
  });
});
