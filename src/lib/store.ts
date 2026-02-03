import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  UserProfile,
  BaselineLifts,
  Mesocycle,
  WorkoutLog,
  GamificationStats,
  OnboardingData,
  GoalFocus,
  Equipment,
  ExperienceLevel,
  WorkoutSession,
  ExerciseLog,
  WeightUnit,
  PreWorkoutCheckIn,
  PostWorkoutFeedback,
  ExerciseFeedback,
  WorkoutAdjustment,
  BodyWeightEntry,
  InjuryEntry,
  CustomExercise,
  SessionTemplate,
  ThemeMode,
  HRSession
} from './types';
import { generateMesocycle } from './workout-generator';
import { calculateLevel, calculateWorkoutPoints, checkNewBadges, badges } from './gamification';
import { getSuggestedWeight } from './auto-adjust';
import { getExerciseById } from './exercises';
import { v4 as uuidv4 } from 'uuid';

interface AppState {
  // User state
  user: UserProfile | null;
  isAuthenticated: boolean;
  isOnboarded: boolean;

  // Onboarding
  onboardingData: OnboardingData;

  // Baseline lifts
  baselineLifts: BaselineLifts | null;

  // Current mesocycle
  currentMesocycle: Mesocycle | null;
  mesocycleHistory: Mesocycle[];

  // Workout state
  activeWorkout: {
    session: WorkoutSession;
    exerciseLogs: ExerciseLog[];
    startTime: Date;
    preCheckIn?: PreWorkoutCheckIn;
  } | null;
  workoutLogs: WorkoutLog[];

  // Gamification
  gamificationStats: GamificationStats;

  // Body weight tracking
  bodyWeightLog: BodyWeightEntry[];

  // Injury tracking
  injuryLog: InjuryEntry[];

  // Custom exercises
  customExercises: CustomExercise[];

  // Session templates
  sessionTemplates: SessionTemplate[];

  // Heart rate sessions
  hrSessions: HRSession[];

  // Theme
  themeMode: ThemeMode;

  // UI state
  showTip: boolean;
  currentTipId: string | null;

  // Actions
  setUser: (user: UserProfile | null) => void;
  setAuthenticated: (auth: boolean) => void;
  updateOnboardingData: (data: Partial<OnboardingData>) => void;
  completeOnboarding: () => void;
  setBaselineLifts: (lifts: BaselineLifts) => void;

  // Mesocycle actions
  generateNewMesocycle: (weeks?: number) => void;
  completeMesocycle: () => void;

  // Workout actions
  startWorkout: (session: WorkoutSession) => void;
  setPreCheckIn: (checkIn: PreWorkoutCheckIn) => void;
  updateExerciseLog: (exerciseIndex: number, log: ExerciseLog) => void;
  updateExerciseFeedback: (exerciseIndex: number, feedback: ExerciseFeedback) => void;
  swapExercise: (exerciseIndex: number, newExerciseId: string, newExerciseName: string) => void;
  completeWorkout: (feedback: { overallRPE: number; soreness: number; energy: number; notes?: string; postFeedback?: PostWorkoutFeedback }) => void;
  cancelWorkout: () => void;
  getWeightUnit: () => WeightUnit;
  convertWeight: (weight: number, to: WeightUnit) => number;

  // Gamification actions
  awardPoints: (points: number, reason: string) => void;
  checkAndAwardBadges: () => void;

  // Workout log editing
  updateWorkoutLog: (logId: string, updates: Partial<WorkoutLog>) => void;
  deleteWorkoutLog: (logId: string) => void;

  // Body weight actions
  addBodyWeight: (weight: number, notes?: string) => void;
  deleteBodyWeight: (id: string) => void;

  // Injury actions
  addInjury: (injury: Omit<InjuryEntry, 'id'>) => void;
  resolveInjury: (id: string) => void;
  deleteInjury: (id: string) => void;

  // Custom exercise actions
  addCustomExercise: (exercise: Omit<CustomExercise, 'isCustom' | 'createdAt'>) => void;
  deleteCustomExercise: (id: string) => void;

  // Session template actions
  saveAsTemplate: (name: string, session: WorkoutSession) => void;
  deleteTemplate: (id: string) => void;
  useTemplate: (id: string) => void;

  // HR session actions
  addHRSession: (session: Omit<HRSession, 'id'>) => void;

  // Theme actions
  setThemeMode: (mode: ThemeMode) => void;

  // UI actions
  setShowTip: (show: boolean) => void;
  setCurrentTipId: (id: string | null) => void;

  // Reset
  resetStore: () => void;
}

const initialOnboardingData: OnboardingData = {
  step: 1,
  name: '',
  age: 34,
  experienceLevel: 'intermediate',
  equipment: 'full_gym',
  goalFocus: 'balanced',
  sessionsPerWeek: 3,
  weightUnit: 'lbs',
  baselineLifts: {}
};

const initialGamificationStats: GamificationStats = {
  id: '',
  userId: '',
  totalPoints: 0,
  level: 1,
  currentStreak: 0,
  longestStreak: 0,
  totalWorkouts: 0,
  totalVolume: 0,
  personalRecords: 0,
  badges: []
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isOnboarded: false,
      onboardingData: initialOnboardingData,
      baselineLifts: null,
      currentMesocycle: null,
      mesocycleHistory: [],
      activeWorkout: null,
      workoutLogs: [],
      gamificationStats: initialGamificationStats,
      bodyWeightLog: [],
      injuryLog: [],
      customExercises: [],
      sessionTemplates: [],
      hrSessions: [],
      themeMode: 'dark' as ThemeMode,
      showTip: true,
      currentTipId: null,

      // User actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setAuthenticated: (auth) => set({ isAuthenticated: auth }),

      updateOnboardingData: (data) =>
        set((state) => ({
          onboardingData: { ...state.onboardingData, ...data }
        })),

      completeOnboarding: () => {
        const { onboardingData } = get();

        // Create user profile
        const user: UserProfile = {
          id: uuidv4(),
          email: '', // Will be set from auth
          name: onboardingData.name,
          age: onboardingData.age,
          experienceLevel: onboardingData.experienceLevel,
          equipment: onboardingData.equipment,
          goalFocus: onboardingData.goalFocus,
          sessionsPerWeek: onboardingData.sessionsPerWeek,
          weightUnit: onboardingData.weightUnit || 'lbs',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Create baseline lifts
        const baselineLifts: BaselineLifts = {
          id: uuidv4(),
          userId: user.id,
          squat: onboardingData.baselineLifts.squat || null,
          deadlift: onboardingData.baselineLifts.deadlift || null,
          benchPress: onboardingData.baselineLifts.benchPress || null,
          overheadPress: onboardingData.baselineLifts.overheadPress || null,
          barbellRow: onboardingData.baselineLifts.barbellRow || null,
          pullUp: onboardingData.baselineLifts.pullUp || null,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Initialize gamification
        const gamificationStats: GamificationStats = {
          ...initialGamificationStats,
          id: uuidv4(),
          userId: user.id
        };

        set({
          user,
          baselineLifts,
          gamificationStats,
          isOnboarded: true,
          isAuthenticated: true
        });

        // Generate first mesocycle
        get().generateNewMesocycle();
      },

      setBaselineLifts: (lifts) => set({ baselineLifts: lifts }),

      // Mesocycle actions
      generateNewMesocycle: (weeks = 5) => {
        const { user, currentMesocycle, mesocycleHistory, baselineLifts } = get();
        if (!user) return;

        // Archive current mesocycle if exists
        if (currentMesocycle) {
          set({
            mesocycleHistory: [
              ...mesocycleHistory,
              { ...currentMesocycle, status: 'completed' as const }
            ]
          });
        }

        // Generate new mesocycle
        const newMesocycle = generateMesocycle({
          userId: user.id,
          goalFocus: user.goalFocus,
          equipment: user.equipment,
          sessionsPerWeek: user.sessionsPerWeek,
          weeks,
          baselineLifts: baselineLifts || undefined
        });

        set({ currentMesocycle: newMesocycle });
      },

      completeMesocycle: () => {
        const { currentMesocycle, mesocycleHistory, gamificationStats } = get();
        if (!currentMesocycle) return;

        set({
          mesocycleHistory: [
            ...mesocycleHistory,
            { ...currentMesocycle, status: 'completed' as const }
          ],
          currentMesocycle: null,
          gamificationStats: {
            ...gamificationStats,
            totalPoints: gamificationStats.totalPoints + 200 // Mesocycle completion bonus
          }
        });

        // Generate new mesocycle
        get().generateNewMesocycle();
        get().checkAndAwardBadges();
      },

      // Workout actions
      startWorkout: (session) => {
        const { workoutLogs } = get();
        // Pre-fill weights from previous session using auto-adjust
        const exerciseLogs = session.exercises.map((ex) => {
          const suggestedWeight = getSuggestedWeight(ex.exerciseId, workoutLogs);
          return {
            exerciseId: ex.exerciseId,
            exerciseName: ex.exercise.name,
            sets: Array.from({ length: ex.sets }, (_, i) => ({
              setNumber: i + 1,
              weight: suggestedWeight || 0,
              reps: ex.prescription.targetReps,
              rpe: ex.prescription.rpe,
              completed: false
            })),
            personalRecord: false
          };
        });

        set({
          activeWorkout: {
            session,
            exerciseLogs,
            startTime: new Date()
          }
        });
      },

      setPreCheckIn: (checkIn) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;
        set({
          activeWorkout: {
            ...activeWorkout,
            preCheckIn: checkIn
          }
        });
      },

      updateExerciseLog: (exerciseIndex, log) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        const updatedLogs = [...activeWorkout.exerciseLogs];
        updatedLogs[exerciseIndex] = log;

        set({
          activeWorkout: {
            ...activeWorkout,
            exerciseLogs: updatedLogs
          }
        });
      },

      updateExerciseFeedback: (exerciseIndex, feedback) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        const updatedLogs = [...activeWorkout.exerciseLogs];
        updatedLogs[exerciseIndex] = {
          ...updatedLogs[exerciseIndex],
          feedback
        };

        set({
          activeWorkout: {
            ...activeWorkout,
            exerciseLogs: updatedLogs
          }
        });
      },

      swapExercise: (exerciseIndex, newExerciseId, newExerciseName) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        // Update logs
        const updatedLogs = [...activeWorkout.exerciseLogs];
        const oldLog = updatedLogs[exerciseIndex];
        updatedLogs[exerciseIndex] = {
          ...oldLog,
          exerciseId: newExerciseId,
          exerciseName: newExerciseName,
          sets: oldLog.sets.map(s => ({ ...s, weight: 0, completed: false })),
          personalRecord: false,
          estimated1RM: undefined,
          feedback: undefined
        };

        // Also update the session exercises so the UI reflects the new exercise
        const updatedSession = { ...activeWorkout.session };
        const updatedExercises = [...updatedSession.exercises];
        const oldPrescription = updatedExercises[exerciseIndex];

        // Find the full exercise data from the exercises database
        const foundExercise = getExerciseById(newExerciseId);
        const newExercise = foundExercise || { ...oldPrescription.exercise, id: newExerciseId, name: newExerciseName };

        updatedExercises[exerciseIndex] = {
          ...oldPrescription,
          exerciseId: newExerciseId,
          exercise: newExercise
        };
        updatedSession.exercises = updatedExercises;

        set({
          activeWorkout: {
            ...activeWorkout,
            session: updatedSession,
            exerciseLogs: updatedLogs
          }
        });
      },

      completeWorkout: (feedback) => {
        const { activeWorkout, workoutLogs, gamificationStats, currentMesocycle, user } = get();
        if (!activeWorkout || !currentMesocycle || !user) return;

        // Calculate total volume
        const totalVolume = activeWorkout.exerciseLogs.reduce((total, ex) => {
          return total + ex.sets.reduce((setTotal, set) => {
            return setTotal + (set.completed ? set.weight * set.reps : 0);
          }, 0);
        }, 0);

        // Calculate duration
        const duration = Math.round(
          (new Date().getTime() - activeWorkout.startTime.getTime()) / 1000 / 60
        );

        // Check for PRs
        const hadPR = activeWorkout.exerciseLogs.some((ex) => ex.personalRecord);

        // Create workout log
        const workoutLog: WorkoutLog = {
          id: uuidv4(),
          userId: user.id,
          mesocycleId: currentMesocycle.id,
          sessionId: activeWorkout.session.id,
          date: new Date(),
          exercises: activeWorkout.exerciseLogs,
          totalVolume,
          duration,
          preCheckIn: activeWorkout.preCheckIn,
          postFeedback: feedback.postFeedback,
          overallRPE: feedback.overallRPE,
          soreness: feedback.soreness,
          energy: feedback.energy,
          notes: feedback.notes,
          completed: true
        };

        // Calculate points
        const { points, breakdown } = calculateWorkoutPoints(
          workoutLog,
          hadPR,
          gamificationStats.currentStreak + 1
        );

        // Update stats
        const newTotalWorkouts = gamificationStats.totalWorkouts + 1;
        const newTotalVolume = gamificationStats.totalVolume + totalVolume;
        const newTotalPoints = gamificationStats.totalPoints + points;
        const newStreak = gamificationStats.currentStreak + 1;
        const newPRs = gamificationStats.personalRecords + (hadPR ? 1 : 0);

        set({
          activeWorkout: null,
          workoutLogs: [...workoutLogs, workoutLog],
          gamificationStats: {
            ...gamificationStats,
            totalPoints: newTotalPoints,
            level: calculateLevel(newTotalPoints),
            currentStreak: newStreak,
            longestStreak: Math.max(gamificationStats.longestStreak, newStreak),
            totalWorkouts: newTotalWorkouts,
            totalVolume: newTotalVolume,
            personalRecords: newPRs
          }
        });

        // Check for new badges
        get().checkAndAwardBadges();
      },

      cancelWorkout: () => set({ activeWorkout: null }),

      getWeightUnit: () => {
        const { user } = get();
        return user?.weightUnit || 'lbs';
      },

      convertWeight: (weight, to) => {
        const { user } = get();
        const from = user?.weightUnit || 'lbs';
        if (from === to) return weight;
        if (to === 'kg') return Math.round(weight * 0.453592 * 10) / 10;
        return Math.round(weight / 0.453592 * 10) / 10;
      },

      // Gamification actions
      awardPoints: (points, reason) => {
        const { gamificationStats } = get();
        const newTotal = gamificationStats.totalPoints + points;

        set({
          gamificationStats: {
            ...gamificationStats,
            totalPoints: newTotal,
            level: calculateLevel(newTotal)
          }
        });
      },

      checkAndAwardBadges: () => {
        const { gamificationStats, workoutLogs, mesocycleHistory } = get();

        const metrics = {
          personalRecords: gamificationStats.personalRecords,
          totalWorkouts: gamificationStats.totalWorkouts,
          currentStreak: gamificationStats.currentStreak,
          totalVolume: gamificationStats.totalVolume,
          mesocyclesCompleted: mesocycleHistory.length,
          gripExercises: 0, // Would need to track this
          turkishGetups: 0, // Would need to track this
          earlyWorkouts: 0,
          lateWorkouts: 0,
          perfectWeeks: 0,
          oneRMIncreases: {}
        };

        const newBadges = checkNewBadges(gamificationStats, metrics);

        if (newBadges.length > 0) {
          const newUserBadges = newBadges.map((badge) => ({
            id: uuidv4(),
            userId: gamificationStats.userId,
            badgeId: badge.id,
            earnedAt: new Date(),
            badge
          }));

          const additionalPoints = newBadges.reduce((sum, b) => sum + b.points, 0);

          set({
            gamificationStats: {
              ...gamificationStats,
              badges: [...gamificationStats.badges, ...newUserBadges],
              totalPoints: gamificationStats.totalPoints + additionalPoints,
              level: calculateLevel(gamificationStats.totalPoints + additionalPoints)
            }
          });
        }
      },

      // Workout log editing
      updateWorkoutLog: (logId, updates) => {
        const { workoutLogs } = get();
        const updatedLogs = workoutLogs.map(log =>
          log.id === logId ? { ...log, ...updates } : log
        );
        set({ workoutLogs: updatedLogs });
      },

      deleteWorkoutLog: (logId) => {
        const { workoutLogs } = get();
        set({ workoutLogs: workoutLogs.filter(log => log.id !== logId) });
      },

      // Body weight actions
      addBodyWeight: (weight, notes) => {
        const { bodyWeightLog, user } = get();
        const entry: BodyWeightEntry = {
          id: uuidv4(),
          date: new Date(),
          weight,
          unit: user?.weightUnit || 'lbs',
          notes
        };
        set({ bodyWeightLog: [...bodyWeightLog, entry] });
      },

      deleteBodyWeight: (id) => {
        const { bodyWeightLog } = get();
        set({ bodyWeightLog: bodyWeightLog.filter(e => e.id !== id) });
      },

      // Injury actions
      addInjury: (injury) => {
        const { injuryLog } = get();
        set({ injuryLog: [...injuryLog, { ...injury, id: uuidv4() }] });
      },

      resolveInjury: (id) => {
        const { injuryLog } = get();
        set({
          injuryLog: injuryLog.map(i =>
            i.id === id ? { ...i, resolved: true, resolvedDate: new Date() } : i
          )
        });
      },

      deleteInjury: (id) => {
        const { injuryLog } = get();
        set({ injuryLog: injuryLog.filter(i => i.id !== id) });
      },

      // Custom exercise actions
      addCustomExercise: (exercise) => {
        const { customExercises } = get();
        const custom: CustomExercise = {
          ...exercise,
          isCustom: true,
          createdAt: new Date()
        };
        set({ customExercises: [...customExercises, custom] });
      },

      deleteCustomExercise: (id) => {
        const { customExercises } = get();
        set({ customExercises: customExercises.filter(e => e.id !== id) });
      },

      // Session template actions
      saveAsTemplate: (name, session) => {
        const { sessionTemplates } = get();
        const template: SessionTemplate = {
          id: uuidv4(),
          name,
          createdAt: new Date(),
          session,
          timesUsed: 0
        };
        set({ sessionTemplates: [...sessionTemplates, template] });
      },

      deleteTemplate: (id) => {
        const { sessionTemplates } = get();
        set({ sessionTemplates: sessionTemplates.filter(t => t.id !== id) });
      },

      useTemplate: (id) => {
        const { sessionTemplates } = get();
        const template = sessionTemplates.find(t => t.id === id);
        if (!template) return;

        // Update usage stats
        set({
          sessionTemplates: sessionTemplates.map(t =>
            t.id === id ? { ...t, timesUsed: t.timesUsed + 1, lastUsed: new Date() } : t
          )
        });

        // Start the workout from the template
        get().startWorkout(template.session);
      },

      // HR session actions
      addHRSession: (session) => {
        const { hrSessions } = get();
        set({ hrSessions: [...hrSessions, { ...session, id: uuidv4() }] });
      },

      // Theme actions
      setThemeMode: (mode) => set({ themeMode: mode }),

      // UI actions
      setShowTip: (show) => set({ showTip: show }),
      setCurrentTipId: (id) => set({ currentTipId: id }),

      // Reset
      resetStore: () =>
        set({
          user: null,
          isAuthenticated: false,
          isOnboarded: false,
          onboardingData: initialOnboardingData,
          baselineLifts: null,
          currentMesocycle: null,
          mesocycleHistory: [],
          activeWorkout: null,
          workoutLogs: [],
          gamificationStats: initialGamificationStats,
          bodyWeightLog: [],
          injuryLog: [],
          customExercises: [],
          sessionTemplates: [],
          hrSessions: [],
          themeMode: 'dark' as ThemeMode,
          showTip: true,
          currentTipId: null
        })
    }),
    {
      name: 'grappler-gains-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isOnboarded: state.isOnboarded,
        onboardingData: state.onboardingData,
        baselineLifts: state.baselineLifts,
        currentMesocycle: state.currentMesocycle,
        mesocycleHistory: state.mesocycleHistory,
        workoutLogs: state.workoutLogs,
        gamificationStats: state.gamificationStats,
        bodyWeightLog: state.bodyWeightLog,
        injuryLog: state.injuryLog,
        customExercises: state.customExercises,
        sessionTemplates: state.sessionTemplates,
        hrSessions: state.hrSessions,
        themeMode: state.themeMode
      })
    }
  )
);

// Selector hooks for optimized re-renders
export const useUser = () => useAppStore((state) => state.user);
export const useIsAuthenticated = () => useAppStore((state) => state.isAuthenticated);
export const useIsOnboarded = () => useAppStore((state) => state.isOnboarded);
export const useOnboardingData = () => useAppStore((state) => state.onboardingData);
export const useCurrentMesocycle = () => useAppStore((state) => state.currentMesocycle);
export const useActiveWorkout = () => useAppStore((state) => state.activeWorkout);
export const useWorkoutLogs = () => useAppStore((state) => state.workoutLogs);
export const useGamificationStats = () => useAppStore((state) => state.gamificationStats);
export const useBodyWeightLog = () => useAppStore((state) => state.bodyWeightLog);
