import { describe, it, expect } from 'vitest';
import {
  calculateReadiness,
  calculateExerciseAdjustments,
  calculateSessionAdjustments,
  shouldDeload,
  getSuggestedWeight,
  getPreviousSessionSets,
  whoopRecoveryToReadiness,
  calculatePersonalBaseline,
  mergeReadinessScores,
} from '@/lib/auto-adjust';
import type { PreWorkoutCheckIn, PostWorkoutFeedback, WorkoutLog, ExerciseLog } from '@/lib/types';

// ── calculateReadiness ──────────────────────────────────────────────────────

describe('calculateReadiness', () => {
  const goodCheckIn: PreWorkoutCheckIn = {
    sleepQuality: 4,
    sleepHours: 8,
    nutrition: 'full_meal',
    stress: 2,
    soreness: 1,
    motivation: 4,
  };

  const poorCheckIn: PreWorkoutCheckIn = {
    sleepQuality: 1,
    sleepHours: 4,
    nutrition: 'fasted',
    stress: 5,
    soreness: 5,
    motivation: 1,
  };

  it('returns high score for good check-in', () => {
    const result = calculateReadiness(goodCheckIn);
    expect(result.score).toBeGreaterThan(65);
    expect(result.recommendation).toBe('increase');
  });

  it('returns low score for poor check-in', () => {
    const result = calculateReadiness(poorCheckIn);
    expect(result.score).toBeLessThan(35);
    expect(result.recommendation).toBe('reduce');
  });

  it('clamps score between 0 and 100', () => {
    const extremeGood = { ...goodCheckIn, sleepQuality: 5, sleepHours: 9, stress: 1 };
    const extremeBad = { ...poorCheckIn, sleepQuality: 1, sleepHours: 3, stress: 5 };
    expect(calculateReadiness(extremeGood).score).toBeLessThanOrEqual(100);
    expect(calculateReadiness(extremeBad).score).toBeGreaterThanOrEqual(0);
  });

  it('penalizes sleep deprivation', () => {
    const normal = calculateReadiness({ ...goodCheckIn, sleepHours: 8 });
    const deprived = calculateReadiness({ ...goodCheckIn, sleepHours: 4 });
    expect(deprived.score).toBeLessThan(normal.score);
  });

  it('includes relevant factors in output', () => {
    const result = calculateReadiness(poorCheckIn);
    expect(result.factors.length).toBeGreaterThan(0);
    expect(result.factors.some(f => f.toLowerCase().includes('sleep'))).toBe(true);
  });

  it('penalizes fasted training', () => {
    const fed = calculateReadiness({ ...goodCheckIn, nutrition: 'full_meal' });
    const fasted = calculateReadiness({ ...goodCheckIn, nutrition: 'fasted' });
    expect(fasted.score).toBeLessThan(fed.score);
  });
});

// ── calculateExerciseAdjustments ────────────────────────────────────────────

describe('calculateExerciseAdjustments', () => {
  const exerciseLog: ExerciseLog = {
    exerciseId: 'bench-press',
    exerciseName: 'Bench Press',
    sets: [
      { weight: 100, reps: 8, rpe: 7, completed: true },
      { weight: 100, reps: 8, rpe: 8, completed: true },
    ],
  } as ExerciseLog;

  it('increases weight when too easy', () => {
    const adjustments = calculateExerciseAdjustments(
      exerciseLog,
      { exerciseId: 'bench-press', difficulty: 'too_easy', pumpRating: 3, jointPain: false, wantToSwap: false },
      []
    );
    const weightAdj = adjustments.find(a => a.adjustmentType === 'weight');
    expect(weightAdj).toBeDefined();
    expect(weightAdj!.newValue).toBeGreaterThan(100);
  });

  it('decreases weight when too hard', () => {
    const adjustments = calculateExerciseAdjustments(
      exerciseLog,
      { exerciseId: 'bench-press', difficulty: 'too_hard', pumpRating: 5, jointPain: false, wantToSwap: false },
      []
    );
    const weightAdj = adjustments.find(a => a.adjustmentType === 'weight');
    expect(weightAdj).toBeDefined();
    expect(weightAdj!.newValue).toBeLessThan(100);
  });

  it('progressive overload when challenging', () => {
    const adjustments = calculateExerciseAdjustments(
      exerciseLog,
      { exerciseId: 'bench-press', difficulty: 'challenging', pumpRating: 4, jointPain: false, wantToSwap: false },
      []
    );
    const weightAdj = adjustments.find(a => a.adjustmentType === 'weight');
    expect(weightAdj).toBeDefined();
    expect(weightAdj!.newValue).toBeGreaterThan(100);
  });

  it('adds set when low pump and not too hard', () => {
    const adjustments = calculateExerciseAdjustments(
      exerciseLog,
      { exerciseId: 'bench-press', difficulty: 'just_right', pumpRating: 1, jointPain: false, wantToSwap: false },
      []
    );
    const setAdj = adjustments.find(a => a.adjustmentType === 'sets');
    expect(setAdj).toBeDefined();
    expect(setAdj!.newValue).toBe(3); // 2 sets + 1
  });

  it('removes set when great pump but too hard (MRV)', () => {
    const fourSetLog = {
      ...exerciseLog,
      sets: Array(4).fill({ weight: 100, reps: 8, rpe: 9, completed: true }),
    } as ExerciseLog;
    const adjustments = calculateExerciseAdjustments(
      fourSetLog,
      { exerciseId: 'bench-press', difficulty: 'too_hard', pumpRating: 5, jointPain: false, wantToSwap: false },
      []
    );
    const setAdj = adjustments.find(a => a.adjustmentType === 'sets');
    expect(setAdj).toBeDefined();
    expect(setAdj!.newValue).toBe(3); // 4 sets - 1
  });

  it('recommends swap for joint pain', () => {
    const adjustments = calculateExerciseAdjustments(
      exerciseLog,
      { exerciseId: 'bench-press', difficulty: 'just_right', pumpRating: 3, jointPain: true, jointPainLocation: 'shoulder', wantToSwap: false },
      []
    );
    expect(adjustments.some(a => a.adjustmentType === 'swap')).toBe(true);
  });

  it('returns empty adjustments for no feedback', () => {
    const adjustments = calculateExerciseAdjustments(exerciseLog, undefined, []);
    expect(adjustments).toHaveLength(0);
  });
});

// ── calculateSessionAdjustments ─────────────────────────────────────────────

describe('calculateSessionAdjustments', () => {
  const baseReadiness = { score: 50, factors: [], recommendation: 'maintain' as const };

  it('reduces volume for worse-than-expected performance', () => {
    const result = calculateSessionAdjustments(
      { overallPerformance: 'worse_than_expected', overallRPE: 8, energy: 3, mood: 3 } as PostWorkoutFeedback,
      baseReadiness
    );
    expect(result.volumeMultiplier).toBeLessThan(1.0);
  });

  it('increases volume for better-than-expected performance', () => {
    const result = calculateSessionAdjustments(
      { overallPerformance: 'better_than_expected', overallRPE: 7, energy: 4, mood: 4 } as PostWorkoutFeedback,
      baseReadiness
    );
    expect(result.volumeMultiplier).toBeGreaterThan(1.0);
  });

  it('reduces volume for very high RPE (9.5+)', () => {
    const result = calculateSessionAdjustments(
      { overallPerformance: 'as_expected', overallRPE: 9.5, energy: 3, mood: 3 } as PostWorkoutFeedback,
      baseReadiness
    );
    expect(result.volumeMultiplier).toBeLessThan(1.02);
  });

  it('clamps multipliers within safe bounds', () => {
    const extreme = calculateSessionAdjustments(
      { overallPerformance: 'worse_than_expected', overallRPE: 10, energy: 1, mood: 1 } as PostWorkoutFeedback,
      { score: 10, factors: [], recommendation: 'reduce' }
    );
    expect(extreme.volumeMultiplier).toBeGreaterThanOrEqual(0.7);
    expect(extreme.intensityMultiplier).toBeGreaterThanOrEqual(0.85);
  });
});

// ── shouldDeload ────────────────────────────────────────────────────────────

describe('shouldDeload', () => {
  it('returns false for fewer than 3 logs', () => {
    const logs = [
      { overallRPE: 10, energy: 1, soreness: 10 },
      { overallRPE: 10, energy: 1, soreness: 10 },
    ] as WorkoutLog[];
    expect(shouldDeload(logs).needed).toBe(false);
  });

  it('detects deload needed from high RPE + high soreness', () => {
    const logs = Array(5).fill({
      overallRPE: 9.5,
      energy: 3,
      soreness: 8,
    }) as WorkoutLog[];
    const result = shouldDeload(logs);
    expect(result.needed).toBe(true);
    expect(result.reason).toContain('fatigue');
  });

  it('detects deload from low energy + high RPE', () => {
    const logs = Array(5).fill({
      overallRPE: 8.5,
      energy: 2,
      soreness: 5,
    }) as WorkoutLog[];
    const result = shouldDeload(logs);
    expect(result.needed).toBe(true);
  });

  it('detects deload from multiple worse-than-expected sessions', () => {
    const logs = Array(5).fill({
      overallRPE: 7,
      energy: 4,
      soreness: 3,
      postFeedback: { overallPerformance: 'worse_than_expected', mood: 2 },
    }) as WorkoutLog[];
    const result = shouldDeload(logs);
    expect(result.needed).toBe(true);
  });

  it('returns false for normal training data', () => {
    const logs = Array(5).fill({
      overallRPE: 7,
      energy: 4,
      soreness: 3,
      postFeedback: { overallPerformance: 'as_expected', mood: 4 },
    }) as WorkoutLog[];
    const result = shouldDeload(logs);
    expect(result.needed).toBe(false);
  });
});

// ── getSuggestedWeight ──────────────────────────────────────────────────────

describe('getSuggestedWeight', () => {
  it('returns null for no previous data', () => {
    expect(getSuggestedWeight('bench-press', [])).toBeNull();
  });

  it('returns max weight from most recent session', () => {
    const logs: WorkoutLog[] = [{
      id: '1',
      date: new Date().toISOString(),
      exercises: [{
        exerciseId: 'bench-press',
        exerciseName: 'Bench Press',
        sets: [
          { weight: 80, reps: 8, completed: true },
          { weight: 100, reps: 5, completed: true },
        ],
      }],
    }] as unknown as WorkoutLog[];
    expect(getSuggestedWeight('bench-press', logs)).toBe(100);
  });

  it('increases weight when previous feedback was too_easy', () => {
    const logs: WorkoutLog[] = [{
      id: '1',
      date: new Date().toISOString(),
      exercises: [{
        exerciseId: 'bench-press',
        exerciseName: 'Bench Press',
        sets: [{ weight: 100, reps: 8, completed: true }],
        feedback: { exerciseId: 'bench-press', difficulty: 'too_easy', pumpRating: 3, jointPain: false, wantToSwap: false },
      }],
    }] as unknown as WorkoutLog[];
    const suggested = getSuggestedWeight('bench-press', logs);
    expect(suggested).toBeGreaterThan(100);
  });

  it('decreases weight when previous feedback was too_hard', () => {
    const logs: WorkoutLog[] = [{
      id: '1',
      date: new Date().toISOString(),
      exercises: [{
        exerciseId: 'bench-press',
        exerciseName: 'Bench Press',
        sets: [{ weight: 100, reps: 8, completed: true }],
        feedback: { exerciseId: 'bench-press', difficulty: 'too_hard', pumpRating: 5, jointPain: false, wantToSwap: false },
      }],
    }] as unknown as WorkoutLog[];
    const suggested = getSuggestedWeight('bench-press', logs);
    expect(suggested).toBeLessThan(100);
  });
});

// ── whoopRecoveryToReadiness ────────────────────────────────────────────────

describe('whoopRecoveryToReadiness', () => {
  it('maps high recovery (green) to high readiness', () => {
    const result = whoopRecoveryToReadiness({ recoveryScore: 80 });
    expect(result.score).toBeGreaterThan(65);
    expect(result.recommendation).toBe('increase');
  });

  it('maps low recovery (red) to low readiness', () => {
    const result = whoopRecoveryToReadiness({ recoveryScore: 20 });
    expect(result.score).toBeLessThan(35);
    expect(result.recommendation).toBe('reduce');
  });

  it('penalizes high previous strain', () => {
    const lowStrain = whoopRecoveryToReadiness({ recoveryScore: 60, strainScore: 5 });
    const highStrain = whoopRecoveryToReadiness({ recoveryScore: 60, strainScore: 18 });
    expect(highStrain.score).toBeLessThan(lowStrain.score);
  });

  it('uses personal baseline for HRV when available', () => {
    const baseline = { hrvBaseline: 60, rhrBaseline: 55, hrvStdDev: 10, rhrStdDev: 3 };
    const result = whoopRecoveryToReadiness(
      { recoveryScore: 50, hrvMs: 75 },
      baseline
    );
    expect(result.factors.some(f => f.includes('above your baseline'))).toBe(true);
  });

  it('penalizes low deep sleep', () => {
    const goodSleep = whoopRecoveryToReadiness({ recoveryScore: 60, deepSleepMinutes: 70 });
    const poorSleep = whoopRecoveryToReadiness({ recoveryScore: 60, deepSleepMinutes: 20 });
    expect(poorSleep.score).toBeLessThan(goodSleep.score);
  });

  it('penalizes low SpO2', () => {
    const result = whoopRecoveryToReadiness({ recoveryScore: 60, spo2: 92 });
    expect(result.factors.some(f => f.includes('SpO2'))).toBe(true);
  });
});

// ── calculatePersonalBaseline ───────────────────────────────────────────────

describe('calculatePersonalBaseline', () => {
  it('returns null baselines with insufficient data', () => {
    const baseline = calculatePersonalBaseline([]);
    expect(baseline.hrvBaseline).toBeNull();
    expect(baseline.rhrBaseline).toBeNull();
  });

  it('calculates baseline from recent wearable data', () => {
    const data = Array.from({ length: 10 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return { date: d.toISOString(), hrv: 60 + i, restingHR: 55 - i * 0.5 };
    });
    const baseline = calculatePersonalBaseline(data as any);
    expect(baseline.hrvBaseline).toBeGreaterThan(0);
    expect(baseline.rhrBaseline).toBeGreaterThan(0);
    expect(baseline.hrvStdDev).toBeGreaterThan(0);
  });
});

// ── mergeReadinessScores ────────────────────────────────────────────────────

describe('mergeReadinessScores', () => {
  it('returns default for both null', () => {
    const result = mergeReadinessScores(null, null);
    expect(result.score).toBe(50);
    expect(result.recommendation).toBe('maintain');
  });

  it('returns whoop when manual is null', () => {
    const whoop = { score: 80, factors: ['test'], recommendation: 'increase' as const };
    expect(mergeReadinessScores(null, whoop)).toBe(whoop);
  });

  it('weights whoop 60% and manual 40%', () => {
    const manual = { score: 100, factors: [], recommendation: 'increase' as const };
    const whoop = { score: 0, factors: [], recommendation: 'reduce' as const };
    const merged = mergeReadinessScores(manual, whoop);
    expect(merged.score).toBe(40); // 100*0.4 + 0*0.6
  });
});
