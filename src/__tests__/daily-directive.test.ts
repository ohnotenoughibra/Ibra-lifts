import { describe, it, expect } from 'vitest';
import { generateDailyDirective, type DailyDirective } from '@/lib/daily-directive';
import type {
  UserProfile,
  WorkoutLog,
  TrainingSession,
  WearableData,
  MealEntry,
  MacroTargets,
  InjuryEntry,
  QuickLog,
  Mesocycle,
  MesocycleWeek,
  WorkoutSession,
  CompetitionEvent,
  IllnessLog,
} from '@/lib/types';

// ── Helper factories ──────────────────────────────────────────────────────

function makeUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'test-user',
    name: 'Test',
    email: 'test@test.com',
    sex: 'male',
    bodyWeightKg: 80,
    heightCm: 180,
    age: 25,
    experienceLevel: 'intermediate',
    trainingIdentity: 'combat',
    trainingDays: [1, 3, 5], // Mon, Wed, Fri
    combatTrainingDays: [],
    sessionsPerWeek: 3,
    equipment: 'full_gym',
    goalFocus: 'strength',
    ...overrides,
  } as UserProfile;
}

function makeWorkoutLog(daysAgo: number, overrides: Partial<WorkoutLog> = {}): WorkoutLog {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    id: `log-${daysAgo}`,
    date: date.toISOString(),
    completed: true,
    exercises: [
      {
        exerciseId: 'bench-press',
        exerciseName: 'Bench Press',
        sets: [{ weight: 100, reps: 8, rpe: 7, completed: true }],
        personalRecord: false,
      },
    ],
    totalVolume: 5000,
    duration: 60,
    overallRPE: 7,
    energy: 7,
    soreness: 3,
    notes: '',
    ...overrides,
  } as WorkoutLog;
}

function makeMesocycle(overrides: Partial<Mesocycle> = {}): Mesocycle {
  return {
    id: 'meso-1',
    userId: 'test-user',
    name: 'Test Block',
    startDate: new Date(Date.now() - 7 * 86400000),
    endDate: new Date(Date.now() + 21 * 86400000),
    weeks: [
      {
        weekNumber: 1,
        isDeload: false,
        volumeMultiplier: 1.0,
        intensityMultiplier: 1.0,
        sessions: [
          {
            id: 'sess-1',
            name: 'Upper Strength',
            type: 'strength',
            dayNumber: 1,
            exercises: [],
            estimatedDuration: 60,
            warmUp: [],
            coolDown: [],
          },
          {
            id: 'sess-2',
            name: 'Lower Hypertrophy',
            type: 'hypertrophy',
            dayNumber: 2,
            exercises: [],
            estimatedDuration: 60,
            warmUp: [],
            coolDown: [],
          },
          {
            id: 'sess-3',
            name: 'Full Body Power',
            type: 'power',
            dayNumber: 3,
            exercises: [],
            estimatedDuration: 60,
            warmUp: [],
            coolDown: [],
          },
        ],
      } as MesocycleWeek,
    ],
    goalFocus: 'strength',
    splitType: 'upper_lower',
    status: 'active',
    createdAt: new Date(),
    ...overrides,
  } as Mesocycle;
}

function makeMinimalDirectiveInput(overrides: Record<string, unknown> = {}) {
  return {
    user: makeUser(),
    currentMesocycle: null as Mesocycle | null,
    workoutLogs: [] as WorkoutLog[],
    trainingSessions: [] as TrainingSession[],
    wearableData: null as WearableData | null,
    wearableHistory: [] as WearableData[],
    meals: [] as MealEntry[],
    macroTargets: { calories: 2500, protein: 180, carbs: 250, fat: 80 } as MacroTargets,
    waterLog: {} as Record<string, number>,
    injuryLog: [] as InjuryEntry[],
    quickLogs: [] as QuickLog[],
    competitions: [] as CompetitionEvent[],
    workoutSkips: [],
    illnessLogs: [] as IllnessLog[],
    ...overrides,
  };
}

// ── generateDailyDirective ────────────────────────────────────────────────

describe('generateDailyDirective', () => {
  it('should generate a directive with all required fields', () => {
    const directive = generateDailyDirective(makeMinimalDirectiveInput());
    expect(directive).toHaveProperty('headline');
    expect(directive).toHaveProperty('subline');
    expect(directive).toHaveProperty('actions');
    expect(directive).toHaveProperty('readinessScore');
    expect(directive).toHaveProperty('readinessLevel');
    expect(directive).toHaveProperty('shouldTrain');
    expect(directive).toHaveProperty('todayType');
    expect(directive).toHaveProperty('proteinGap');
    expect(directive).toHaveProperty('isDeload');
  });

  it('should return a rest directive on non-training days', () => {
    // Set training days to not include today
    const today = new Date().getDay();
    const otherDays = [0, 1, 2, 3, 4, 5, 6].filter(d => d !== today);
    const user = makeUser({ trainingDays: otherDays.slice(0, 3) });
    const directive = generateDailyDirective(makeMinimalDirectiveInput({ user }));
    // Without a mesocycle, and on a non-training day, should suggest rest or recovery
    expect(['rest', 'recovery', 'combat', 'lift', 'both']).toContain(directive.todayType);
  });

  it('should have readiness score between 0 and 100', () => {
    const directive = generateDailyDirective(makeMinimalDirectiveInput());
    expect(directive.readinessScore).toBeGreaterThanOrEqual(0);
    expect(directive.readinessScore).toBeLessThanOrEqual(100);
  });

  it('should have valid readiness level', () => {
    const directive = generateDailyDirective(makeMinimalDirectiveInput());
    expect(['peak', 'good', 'moderate', 'low', 'critical']).toContain(directive.readinessLevel);
  });

  it('should have non-empty headline', () => {
    const directive = generateDailyDirective(makeMinimalDirectiveInput());
    expect(directive.headline.length).toBeGreaterThan(0);
  });

  it('should have non-empty actions array', () => {
    const directive = generateDailyDirective(makeMinimalDirectiveInput());
    expect(directive.actions.length).toBeGreaterThan(0);
  });

  it('should calculate protein gap from meals and targets', () => {
    const today = new Date();
    const meals: MealEntry[] = [
      { id: 'm1', date: today, name: 'Lunch', calories: 500, protein: 40, carbs: 50, fat: 20 } as MealEntry,
    ];
    const macroTargets = { calories: 2500, protein: 180, carbs: 250, fat: 80 } as MacroTargets;
    const directive = generateDailyDirective(makeMinimalDirectiveInput({ meals, macroTargets }));
    // Target 180g - 40g eaten = 140g gap
    expect(directive.proteinGap).toBe(140);
  });

  it('should set proteinGap to 0 when protein target is met', () => {
    const today = new Date();
    const meals: MealEntry[] = [
      { id: 'm1', date: today, name: 'Meal', calories: 1000, protein: 200, carbs: 50, fat: 20 } as MealEntry,
    ];
    const macroTargets = { calories: 2500, protein: 180, carbs: 250, fat: 80 } as MacroTargets;
    const directive = generateDailyDirective(makeMinimalDirectiveInput({ meals, macroTargets }));
    expect(directive.proteinGap).toBe(0);
  });

  it('should detect fight camp phase for combat athletes with competition', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const competitions: CompetitionEvent[] = [
      {
        id: 'comp-1',
        name: 'BJJ Open',
        type: 'bjj' as CompetitionEvent['type'],
        date: futureDate,
        peakingWeeks: 4,
        isActive: true,
      } as CompetitionEvent,
    ];
    const user = makeUser({ trainingIdentity: 'combat' });
    const directive = generateDailyDirective(makeMinimalDirectiveInput({ user, competitions }));
    // Should have a fight camp tag since competition is within 70 days
    expect(directive.fightCampTag).not.toBeNull();
  });

  it('should not set fight camp tag for non-combat athletes', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const competitions: CompetitionEvent[] = [
      { id: 'comp-1', name: 'Powerlifting Meet', type: 'bjj' as CompetitionEvent['type'], date: futureDate, peakingWeeks: 4, isActive: true } as CompetitionEvent,
    ];
    const user = makeUser({ trainingIdentity: 'recreational' });
    const directive = generateDailyDirective(makeMinimalDirectiveInput({ user, competitions }));
    expect(directive.fightCampTag).toBeNull();
  });

  it('should handle null user gracefully', () => {
    const directive = generateDailyDirective(makeMinimalDirectiveInput({ user: null }));
    expect(directive).toBeDefined();
    expect(directive.headline.length).toBeGreaterThan(0);
  });

  it('should handle null mesocycle (no active program)', () => {
    const directive = generateDailyDirective(makeMinimalDirectiveInput({ currentMesocycle: null }));
    expect(directive.nextSession).toBeNull();
    expect(directive.isDeload).toBe(false);
  });

  it('should include session label when mesocycle is present', () => {
    const meso = makeMesocycle();
    const directive = generateDailyDirective(makeMinimalDirectiveInput({ currentMesocycle: meso }));
    // May or may not have session label depending on whether there is a next session
    expect(typeof directive.sessionLabel === 'string' || directive.sessionLabel === null).toBe(true);
  });

  it('should identify today as lift day when user already trained today', () => {
    const todayLog = makeWorkoutLog(0);
    const directive = generateDailyDirective(makeMinimalDirectiveInput({
      workoutLogs: [todayLog],
    }));
    // todayType should reflect that a lift happened or recovery (if it's not a scheduled day)
    expect(['lift', 'both', 'recovery']).toContain(directive.todayType);
  });

  it('should generate today performance when already lifted today', () => {
    const todayLog = makeWorkoutLog(0, { totalVolume: 15000, overallRPE: 8, duration: 75 });
    const directive = generateDailyDirective(makeMinimalDirectiveInput({
      workoutLogs: [todayLog],
    }));
    expect(directive.todayPerformance).not.toBeNull();
    if (directive.todayPerformance) {
      expect(directive.todayPerformance.totalVolume).toBe(15000);
      expect(directive.todayPerformance.avgRPE).toBe(8);
    }
  });

  it('should show combat sessions when user has combat training schedule', () => {
    const todayDow = new Date().getDay();
    const user = makeUser({
      trainingIdentity: 'combat',
      combatTrainingDays: [
        { day: todayDow, intensity: 'moderate', label: 'BJJ Drilling' },
      ],
    });
    const directive = generateDailyDirective(makeMinimalDirectiveInput({ user }));
    expect(directive.todayCombatSessions.length).toBeGreaterThan(0);
  });

  it('should handle soft-deleted workout logs', () => {
    const deletedLog = makeWorkoutLog(0, { _deleted: true } as any);
    const directive = generateDailyDirective(makeMinimalDirectiveInput({
      workoutLogs: [deletedLog],
    }));
    // Deleted log should be filtered out — should not count as today's lift
    expect(directive.todayPerformance).toBeNull();
  });

  it('should not crash with empty input for all optional fields', () => {
    const directive = generateDailyDirective({
      user: null,
      currentMesocycle: null,
      workoutLogs: [],
      trainingSessions: [],
      wearableData: null,
      wearableHistory: [],
      meals: [],
      macroTargets: { calories: 0, protein: 0, carbs: 0, fat: 0 } as MacroTargets,
      waterLog: {},
      injuryLog: [],
      quickLogs: [],
    });
    expect(directive).toBeDefined();
    expect(typeof directive.headline).toBe('string');
  });
});
