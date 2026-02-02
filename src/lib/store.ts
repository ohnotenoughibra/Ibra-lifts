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
  ExerciseLog
} from './types';
import { generateMesocycle } from './workout-generator';
import { calculateLevel, calculateWorkoutPoints, checkNewBadges, badges } from './gamification';
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
  } | null;
  workoutLogs: WorkoutLog[];

  // Gamification
  gamificationStats: GamificationStats;

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
  updateExerciseLog: (exerciseIndex: number, log: ExerciseLog) => void;
  completeWorkout: (feedback: { overallRPE: number; soreness: number; energy: number; notes?: string }) => void;
  cancelWorkout: () => void;

  // Gamification actions
  awardPoints: (points: number, reason: string) => void;
  checkAndAwardBadges: () => void;

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
        set({
          activeWorkout: {
            session,
            exerciseLogs: session.exercises.map((ex) => ({
              exerciseId: ex.exerciseId,
              exerciseName: ex.exercise.name,
              sets: Array.from({ length: ex.sets }, (_, i) => ({
                setNumber: i + 1,
                weight: 0,
                reps: ex.prescription.targetReps,
                rpe: ex.prescription.rpe,
                completed: false
              })),
              personalRecord: false
            })),
            startTime: new Date()
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
        gamificationStats: state.gamificationStats
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
