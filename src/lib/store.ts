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
  EquipmentType,
  EquipmentProfileName,
  DEFAULT_EQUIPMENT_PROFILES,
  ExperienceLevel,
  WorkoutSession,
  ExerciseLog,
  WeightUnit,
  PreWorkoutCheckIn,
  PostWorkoutFeedback,
  ExerciseFeedback,
  WorkoutAdjustment,
  BodyWeightEntry,
  BodyCompositionEntry,
  InjuryEntry,
  CustomExercise,
  SessionTemplate,
  ThemeMode,
  HRSession,
  TrainingSession,
  MealEntry,
  MacroTargets,
  MuscleGroupConfig,
  WearableData,
  CompetitionEvent,
  WhoopWorkout,
  QuickLog,
  GripTest,
  GripExerciseLog,
  ACTIVITY_CATEGORY_MAP,
  DietPhase,
  WeeklyCheckIn,
  MealReminderSettings,
} from './types';
import type { SyncConflict } from '@/components/SyncConflictResolver';
import { resolveConflicts } from './db-sync';
import { generateMesocycle, autoregulateSession } from './workout-generator';
import { calculateLevel, calculateWorkoutPoints, checkNewBadges, badges } from './gamification';
import { getSuggestedWeight, getPreviousSessionSets, whoopRecoveryToReadiness, matchWhoopWorkout, calculatePersonalBaseline } from './auto-adjust';
import { getExerciseById, getAlternativesForExercise, exercises as allExercises } from './exercises';
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
    baseSession: WorkoutSession; // Original session before any location adaptations
    exerciseLogs: ExerciseLog[];
    startTime: Date;
    preCheckIn?: PreWorkoutCheckIn;
  } | null;
  workoutLogs: WorkoutLog[];

  // Gamification
  gamificationStats: GamificationStats;

  // Body weight tracking
  bodyWeightLog: BodyWeightEntry[];

  // Quick logging (water, sleep, energy, readiness, mobility)
  quickLogs: QuickLog[];

  // Grip strength tracking
  gripTests: GripTest[];
  gripExerciseLogs: GripExerciseLog[];

  // Injury tracking
  injuryLog: InjuryEntry[];

  // Custom exercises
  customExercises: CustomExercise[];

  // Session templates
  sessionTemplates: SessionTemplate[];

  // Heart rate sessions
  hrSessions: HRSession[];

  // Training sessions (unified: grappling, striking, cardio, outdoor, etc.)
  trainingSessions: TrainingSession[];

  // Theme
  themeMode: ThemeMode;

  // Nutrition
  meals: MealEntry[];
  macroTargets: MacroTargets;
  waterLog: Record<string, number>; // dateStr -> glasses

  // Diet coaching
  activeDietPhase: DietPhase | null;
  weeklyCheckIns: WeeklyCheckIn[];

  // Meal reminders
  mealReminders: MealReminderSettings;

  // Body composition
  bodyComposition: BodyCompositionEntry[];

  // Muscle emphasis for mesocycle customization
  muscleEmphasis: MuscleGroupConfig | null;

  // Active equipment profile for quick-switching gym/home/travel
  activeEquipmentProfile: EquipmentProfileName;

  // Competitions
  competitions: CompetitionEvent[];

  // Whoop / wearable data
  latestWhoopData: WearableData | null;
  wearableHistory: WearableData[]; // 7-day trend for multi-day analysis
  whoopWorkouts: WhoopWorkout[]; // Recent Whoop-tracked workouts for HR correlation

  // Offline queue
  isOnline: boolean;

  // Sync metadata
  lastSyncAt: number | null;

  // Post-workout summary (transient, not persisted)
  lastCompletedWorkout: {
    log: WorkoutLog;
    points: number;
    hadPR: boolean;
    newStreak: number;
    newBadges: { id: string; name: string; icon: string; points: number }[];
  } | null;

  // Sync conflict resolution
  syncConflict: SyncConflict | null;
  pendingRemoteData: Record<string, unknown> | null;

  // UI state
  showTip: boolean;
  currentTipId: string | null;

  // Actions
  setUser: (user: UserProfile | null) => void;
  setAuthenticated: (auth: boolean) => void;
  updateOnboardingData: (data: Partial<OnboardingData>) => void;
  completeOnboarding: (authUserId?: string) => void;
  setAuthUserId: (id: string) => void;
  logout: () => void;
  restartOnboarding: () => void;
  setBaselineLifts: (lifts: BaselineLifts) => void;

  // Muscle emphasis actions
  setMuscleEmphasis: (config: MuscleGroupConfig) => void;

  // Mesocycle actions
  generateNewMesocycle: (weeks?: number, sessionDurationMinutes?: number) => void;
  completeMesocycle: () => void;
  deleteMesocycle: (mesocycleId: string) => void;
  migrateWorkoutLogsToMesocycle: (fromMesocycleId: string, toMesocycleId: string) => void;
  getCurrentMesocycleLogCount: () => number;
  getImportableWorkoutLogs: () => {
    currentMesocycle: WorkoutLog[];
    otherMesocycles: WorkoutLog[];
    orphaned: WorkoutLog[];
    total: number;
    importable: WorkoutLog[];
  };
  importWorkoutLogsToCurrentMesocycle: (logIds: string[]) => void;

  // Workout actions
  startWorkout: (session: WorkoutSession) => void;
  setPreCheckIn: (checkIn: PreWorkoutCheckIn) => void;
  updateExerciseLog: (exerciseIndex: number, log: ExerciseLog) => void;
  updateExerciseFeedback: (exerciseIndex: number, feedback: ExerciseFeedback) => void;
  swapExercise: (exerciseIndex: number, newExerciseId: string, newExerciseName: string) => void;
  swapProgramExercise: (weekIndex: number, sessionId: string, exerciseIndex: number, newExerciseId: string) => void;
  adaptWorkoutToProfile: (profile: EquipmentProfileName) => void;
  completeWorkout: (feedback: { overallRPE: number; soreness: number; energy: number; notes?: string; postFeedback?: PostWorkoutFeedback; durationOverride?: number }) => void;
  cancelWorkout: () => void;
  getWeightUnit: () => WeightUnit;
  convertWeight: (weight: number, to: WeightUnit) => number;

  // Gamification actions
  recalculateGamificationStats: () => void;
  recalculatePRs: () => void;
  awardPoints: (points: number, reason: string) => void;
  checkAndAwardBadges: () => void;

  // Workout log editing
  updateWorkoutLog: (logId: string, updates: Partial<WorkoutLog>) => void;
  deleteWorkoutLog: (logId: string) => void;
  addPastWorkout: (workout: {
    date: Date;
    exercises: ExerciseLog[];
    duration: number;
    overallRPE?: number;
    notes?: string;
  }) => void;

  // Body weight actions
  addBodyWeight: (weight: number, notes?: string) => void;
  deleteBodyWeight: (id: string) => void;

  // Quick log actions
  addQuickLog: (log: Omit<QuickLog, 'id'>) => void;
  deleteQuickLog: (id: string) => void;

  // Grip strength actions
  addGripTest: (test: Omit<GripTest, 'id'>) => void;
  addGripExerciseLog: (log: Omit<GripExerciseLog, 'id'>) => void;
  deleteGripTest: (id: string) => void;
  deleteGripExerciseLog: (id: string) => void;

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

  // Training session actions (unified system)
  addTrainingSession: (session: Omit<TrainingSession, 'id'>) => void;
  updateTrainingSession: (id: string, updates: Partial<TrainingSession>) => void;
  deleteTrainingSession: (id: string) => void;

  // Theme actions
  setThemeMode: (mode: ThemeMode) => void;

  // Nutrition actions
  addMeal: (meal: Omit<MealEntry, 'id'>) => void;
  deleteMeal: (id: string) => void;
  setMacroTargets: (targets: MacroTargets) => void;
  setWaterGlasses: (date: string, glasses: number) => void;

  // Diet coaching actions
  startDietPhase: (phase: Omit<DietPhase, 'id'>) => void;
  endDietPhase: () => void;
  addWeeklyCheckIn: (checkIn: Omit<WeeklyCheckIn, 'id'>) => void;
  incrementPhaseWeek: () => void;

  // Meal reminder actions
  setMealReminders: (settings: Partial<MealReminderSettings>) => void;

  // Body composition actions
  addBodyComposition: (entry: Omit<BodyCompositionEntry, 'id'>) => void;
  deleteBodyComposition: (id: string) => void;

  // Equipment profile actions
  setActiveEquipmentProfile: (profile: EquipmentProfileName) => void;
  getActiveEquipment: () => EquipmentType[];

  // Competition actions
  addCompetition: (event: Omit<CompetitionEvent, 'id'>) => void;
  deleteCompetition: (id: string) => void;

  // Whoop actions
  setLatestWhoopData: (data: WearableData | null) => void;
  setWearableHistory: (data: WearableData[]) => void;
  setWhoopWorkouts: (data: WhoopWorkout[]) => void;
  applyWhoopAdjustment: () => void;

  // Online status
  setOnline: (online: boolean) => void;

  // Post-workout summary actions
  dismissWorkoutSummary: () => void;

  // Sync conflict actions
  resolveSyncConflict: (resolution: 'local' | 'remote' | 'merge') => void;
  dismissSyncConflict: () => void;

  // UI actions
  setShowTip: (show: boolean) => void;
  setCurrentTipId: (id: string | null) => void;

  // Reset
  resetStore: () => void;
}

const initialOnboardingData: OnboardingData = {
  step: 1,
  name: '',
  age: 0,
  heightCm: undefined,
  sex: undefined,
  experienceLevel: 'intermediate',
  equipment: 'full_gym',
  availableEquipment: DEFAULT_EQUIPMENT_PROFILES[0].equipment,
  goalFocus: 'balanced',
  sessionsPerWeek: 3,
  sessionDurationMinutes: 60,
  weightUnit: 'lbs',
  baselineLifts: {},
  trainingIdentity: 'combat',
  wearableUsage: undefined,
  wearableProvider: undefined,
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
      quickLogs: [],
      gripTests: [],
      gripExerciseLogs: [],
      injuryLog: [],
      customExercises: [],
      sessionTemplates: [],
      hrSessions: [],
      trainingSessions: [],
      themeMode: 'dark' as ThemeMode,
      meals: [],
      macroTargets: { calories: 2500, protein: 200, carbs: 280, fat: 80 },
      waterLog: {},
      activeDietPhase: null,
      weeklyCheckIns: [],
      mealReminders: {
        enabled: false,
        reminderTimes: { breakfast: '08:00', lunch: '12:30', dinner: '19:00' },
        enabledMeals: { breakfast: true, lunch: true, dinner: true },
      },
      bodyComposition: [],
      muscleEmphasis: null,
      activeEquipmentProfile: 'gym' as EquipmentProfileName,
      competitions: [],
      latestWhoopData: null,
      wearableHistory: [],
      whoopWorkouts: [],
      isOnline: true,
      lastSyncAt: null,
      lastCompletedWorkout: null,
      syncConflict: null,
      pendingRemoteData: null,
      showTip: true,
      currentTipId: null,

      // User actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setAuthenticated: (auth) => set({ isAuthenticated: auth }),

      updateOnboardingData: (data) =>
        set((state) => ({
          onboardingData: { ...state.onboardingData, ...data }
        })),

      // Set the auth user ID into the existing user profile (for returning users)
      setAuthUserId: (id) => {
        const { user } = get();
        if (user && user.id !== id) {
          set({ user: { ...user, id, updatedAt: new Date() } });
        }
      },

      logout: () => {
        get().resetStore();
      },

      restartOnboarding: () => {
        // Keep user data, workouts, history — just re-enter onboarding to reconfigure
        // Pre-fill onboarding data from current user profile so they can tweak, not start blank
        const { user, onboardingData } = get();
        if (user) {
          set({
            isOnboarded: false,
            onboardingData: {
              ...onboardingData,
              name: user.name,
              age: user.age,
              heightCm: user.heightCm,
              sex: user.sex,
              experienceLevel: user.experienceLevel,
              goalFocus: user.goalFocus,
              sessionsPerWeek: user.sessionsPerWeek,
              sessionDurationMinutes: user.sessionDurationMinutes,
              equipment: user.equipment,
              trainingIdentity: user.trainingIdentity,
              combatSport: user.combatSport,
              weightUnit: user.weightUnit,
            },
          });
        } else {
          set({ isOnboarded: false });
        }
      },

      completeOnboarding: (authUserId) => {
        const { onboardingData } = get();

        // Create user profile — use auth user ID if available
        const user: UserProfile = {
          id: authUserId || uuidv4(),
          email: '', // Will be populated from session
          name: onboardingData.name,
          age: onboardingData.age,
          heightCm: onboardingData.heightCm,
          sex: onboardingData.sex,
          experienceLevel: onboardingData.experienceLevel,
          equipment: onboardingData.equipment,
          availableEquipment: onboardingData.availableEquipment || DEFAULT_EQUIPMENT_PROFILES[0].equipment,
          goalFocus: onboardingData.goalFocus,
          sessionsPerWeek: onboardingData.sessionsPerWeek,
          sessionDurationMinutes: onboardingData.sessionDurationMinutes || 60,
          weightUnit: onboardingData.weightUnit || 'lbs',
          trainingIdentity: onboardingData.trainingIdentity || 'combat',
          combatSport: onboardingData.combatSport,
          trainingDays: onboardingData.trainingDays,
          combatTrainingDays: onboardingData.combatTrainingDays,
          // Wearable preferences
          wearableUsage: onboardingData.wearableUsage,
          wearableProvider: onboardingData.wearableProvider,
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

        // Generate first mesocycle with user's preferred duration
        get().generateNewMesocycle(5, onboardingData.sessionDurationMinutes || 60);
      },

      setBaselineLifts: (lifts) => set({ baselineLifts: lifts }),

      // Muscle emphasis actions
      setMuscleEmphasis: (config) => set({ muscleEmphasis: config }),

      // Equipment profile actions
      setActiveEquipmentProfile: (profile) => {
        set({ activeEquipmentProfile: profile });
        // Also update user's availableEquipment from profile
        const { user } = get();
        if (user) {
          const preset = DEFAULT_EQUIPMENT_PROFILES.find(p => p.name === profile);
          if (preset) {
            set({ user: { ...user, availableEquipment: preset.equipment, updatedAt: new Date() } });
          }
        }
      },
      getActiveEquipment: () => {
        const { user, activeEquipmentProfile } = get();
        if (user?.availableEquipment?.length) return user.availableEquipment;
        const preset = DEFAULT_EQUIPMENT_PROFILES.find(p => p.name === activeEquipmentProfile);
        return preset?.equipment || DEFAULT_EQUIPMENT_PROFILES[0].equipment;
      },

      // Competition actions
      addCompetition: (event) => {
        const { competitions } = get();
        set({ competitions: [...competitions, { ...event, id: uuidv4() }] });
      },

      deleteCompetition: (id) => {
        const { competitions } = get();
        set({ competitions: competitions.filter(c => c.id !== id) });
      },

      // Whoop actions
      setLatestWhoopData: (data) => set({ latestWhoopData: data }),
      setWearableHistory: (data) => set({ wearableHistory: data }),
      setWhoopWorkouts: (data) => set({ whoopWorkouts: data }),

      applyWhoopAdjustment: () => {
        const { activeWorkout, latestWhoopData, wearableHistory } = get();
        if (!activeWorkout || !latestWhoopData) return;

        // Calculate personal baseline from wearable history for accurate HRV/RHR comparison
        const personalBaseline = calculatePersonalBaseline(wearableHistory);

        // Calculate readiness from Whoop data (uses personal baseline for HRV/RHR)
        const readiness = whoopRecoveryToReadiness({
          recoveryScore: latestWhoopData.recoveryScore ?? undefined,
          hrvMs: latestWhoopData.hrv ?? undefined,
          restingHR: latestWhoopData.restingHR ?? undefined,
          sleepScore: latestWhoopData.sleepScore ?? undefined,
          strainScore: latestWhoopData.strain ?? undefined,
          spo2: latestWhoopData.spo2 ?? undefined,
          sleepEfficiency: latestWhoopData.sleepEfficiency ?? undefined,
          deepSleepMinutes: latestWhoopData.deepSleepMinutes ?? undefined,
          sleepHours: latestWhoopData.sleepHours ?? undefined,
          sleepNeededHours: latestWhoopData.sleepNeededHours ?? undefined,
          sleepConsistency: latestWhoopData.sleepConsistency ?? undefined,
          sleepDisturbances: latestWhoopData.sleepDisturbances ?? undefined,
        }, personalBaseline);

        if (readiness.recommendation === 'maintain') return;

        const updatedExercises = activeWorkout.session.exercises.map(ex => {
          if (readiness.recommendation === 'reduce') {
            return {
              ...ex,
              sets: Math.max(2, ex.sets - 1),
              prescription: {
                ...ex.prescription,
                rpe: Math.max(5, ex.prescription.rpe - 1),
              },
            };
          } else {
            // increase
            return {
              ...ex,
              sets: ex.sets + 1,
              prescription: {
                ...ex.prescription,
                rpe: Math.min(10, ex.prescription.rpe + 0.5),
              },
            };
          }
        });

        const updatedSession = { ...activeWorkout.session, exercises: updatedExercises };
        const updatedLogs = activeWorkout.exerciseLogs.map((log, i) => {
          const newEx = updatedExercises[i];
          const currentSets = log.sets;
          if (readiness.recommendation === 'reduce') {
            // Remove last set if needed
            return {
              ...log,
              sets: currentSets.slice(0, newEx.sets).map(s => ({
                ...s,
                rpe: newEx.prescription.rpe,
              })),
            };
          } else {
            // Add an extra set
            const lastSet = currentSets[currentSets.length - 1];
            return {
              ...log,
              sets: [
                ...currentSets.map(s => ({ ...s, rpe: newEx.prescription.rpe })),
                { ...lastSet, setNumber: currentSets.length + 1, completed: false, rpe: newEx.prescription.rpe },
              ],
            };
          }
        });

        set({
          activeWorkout: {
            ...activeWorkout,
            session: updatedSession,
            exerciseLogs: updatedLogs,
          },
        });
      },

      // Mesocycle actions
      generateNewMesocycle: (weeks = 5, sessionDurationMinutes) => {
        const { user, currentMesocycle, mesocycleHistory, baselineLifts, muscleEmphasis } = get();
        if (!user) return;
        // Fall back to user's stored preference if no explicit duration passed
        const duration = sessionDurationMinutes ?? user.sessionDurationMinutes ?? 60;

        // Archive current mesocycle if exists
        if (currentMesocycle) {
          set({
            mesocycleHistory: [
              ...mesocycleHistory,
              { ...currentMesocycle, status: 'completed' as const }
            ]
          });
        }

        // Calculate sport training load from combatTrainingDays for adaptive volume scaling
        let sportSessionsPerWeek: number | undefined;
        let avgSportIntensity: 'light' | 'moderate' | 'hard' | undefined;

        if (user.trainingIdentity === 'combat' && user.combatTrainingDays && user.combatTrainingDays.length > 0) {
          sportSessionsPerWeek = user.combatTrainingDays.length;

          // Calculate average intensity
          const intensityScores = user.combatTrainingDays.map(d => {
            switch (d.intensity) {
              case 'light': return 1;
              case 'moderate': return 2;
              case 'hard': return 3;
              default: return 2;
            }
          });
          const avgScore = intensityScores.reduce((a, b) => a + b, 0) / intensityScores.length;

          if (avgScore <= 1.5) avgSportIntensity = 'light';
          else if (avgScore <= 2.5) avgSportIntensity = 'moderate';
          else avgSportIntensity = 'hard';
        }

        // Get active diet phase to influence training programming
        const { activeDietPhase } = get();

        // Generate new mesocycle with granular equipment, sport load, and diet phase scaling
        const newMesocycle = generateMesocycle({
          userId: user.id,
          goalFocus: user.goalFocus,
          equipment: user.equipment,
          availableEquipment: user.availableEquipment || get().getActiveEquipment(),
          sessionsPerWeek: user.sessionsPerWeek,
          weeks,
          baselineLifts: baselineLifts || undefined,
          muscleEmphasis: muscleEmphasis || undefined,
          sessionDurationMinutes: duration,
          trainingIdentity: user.trainingIdentity,
          combatSport: user.combatSport,
          experienceLevel: user.experienceLevel,
          sex: user.sex,
          dietGoal: activeDietPhase?.isActive ? activeDietPhase.goal : undefined,
          sportSessionsPerWeek,
          avgSportIntensity,
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

      deleteMesocycle: (mesocycleId) => {
        const { mesocycleHistory, workoutLogs } = get();
        set({
          mesocycleHistory: mesocycleHistory.filter(m => m.id !== mesocycleId),
          workoutLogs: workoutLogs.filter(l => l.mesocycleId !== mesocycleId),
        });
      },

      migrateWorkoutLogsToMesocycle: (fromMesocycleId, toMesocycleId) => {
        const { workoutLogs, currentMesocycle, mesocycleHistory } = get();

        // Get target mesocycle (could be current or in history)
        const targetMeso = currentMesocycle?.id === toMesocycleId
          ? currentMesocycle
          : mesocycleHistory.find(m => m.id === toMesocycleId);

        if (!targetMeso) {
          // Simple migration without session matching
          set({
            workoutLogs: workoutLogs.map(log =>
              log.mesocycleId === fromMesocycleId
                ? { ...log, mesocycleId: toMesocycleId }
                : log
            ),
          });
          return;
        }

        // Get source mesocycle for type matching
        const sourceMeso = mesocycleHistory.find(m => m.id === fromMesocycleId);

        // Get all sessions from target mesocycle
        const allSessions = targetMeso.weeks.flatMap(week => week.sessions);

        // Track which sessions are already used
        const usedSessionIds = new Set(
          workoutLogs
            .filter(log => log.mesocycleId === toMesocycleId)
            .map(log => log.sessionId)
        );

        // Get workout type from source mesocycle
        const getWorkoutType = (sessionId: string): 'strength' | 'hypertrophy' | 'power' | null => {
          if (sourceMeso) {
            for (const week of sourceMeso.weeks) {
              const session = week.sessions.find(s => s.id === sessionId);
              if (session) return session.type;
            }
          }
          return null;
        };

        const updatedLogs = workoutLogs.map(log => {
          if (log.mesocycleId !== fromMesocycleId) return log;

          const workoutType = getWorkoutType(log.sessionId);

          // Find matching session in target (prefer same type)
          let matchingSession = allSessions.find(
            s => s.type === workoutType && !usedSessionIds.has(s.id)
          );

          if (!matchingSession) {
            matchingSession = allSessions.find(s => !usedSessionIds.has(s.id));
          }

          if (matchingSession) {
            usedSessionIds.add(matchingSession.id);
            return {
              ...log,
              mesocycleId: toMesocycleId,
              sessionId: matchingSession.id,
            };
          }

          return { ...log, mesocycleId: toMesocycleId };
        });

        set({ workoutLogs: updatedLogs });

        // Recalculate PRs and gamification stats after migration
        get().recalculatePRs();
      },

      getCurrentMesocycleLogCount: () => {
        const { currentMesocycle, workoutLogs } = get();
        if (!currentMesocycle) return 0;
        return workoutLogs.filter(log => log.mesocycleId === currentMesocycle.id).length;
      },

      // Get recent workout logs that could be imported (from last 30 days, not in current mesocycle)
      getImportableWorkoutLogs: () => {
        const { currentMesocycle, workoutLogs, mesocycleHistory } = get();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Get all mesocycle IDs (current + history)
        const knownMesocycleIds = new Set<string>();
        if (currentMesocycle) knownMesocycleIds.add(currentMesocycle.id);
        mesocycleHistory.forEach(m => knownMesocycleIds.add(m.id));

        // Find logs from last 30 days
        const recentLogs = workoutLogs.filter(log => {
          const logDate = new Date(log.date);
          return logDate >= thirtyDaysAgo;
        });

        // Separate into current mesocycle, other known mesocycles, and orphaned
        const currentMesoLogs = currentMesocycle
          ? recentLogs.filter(log => log.mesocycleId === currentMesocycle.id)
          : [];
        const otherMesoLogs = recentLogs.filter(log =>
          log.mesocycleId !== currentMesocycle?.id &&
          knownMesocycleIds.has(log.mesocycleId)
        );
        const orphanedLogs = recentLogs.filter(log =>
          !knownMesocycleIds.has(log.mesocycleId) || log.mesocycleId === 'standalone'
        );

        return {
          currentMesocycle: currentMesoLogs,
          otherMesocycles: otherMesoLogs,
          orphaned: orphanedLogs,
          total: recentLogs.length,
          importable: [...otherMesoLogs, ...orphanedLogs],
        };
      },

      // Import workout logs into current mesocycle with intelligent session matching
      importWorkoutLogsToCurrentMesocycle: (logIds: string[]) => {
        const { currentMesocycle, workoutLogs, mesocycleHistory } = get();
        if (!currentMesocycle) return;

        // Get all sessions from current mesocycle (flattened)
        const allSessions = currentMesocycle.weeks.flatMap(week => week.sessions);

        // Track which sessions are already completed in current mesocycle
        const completedSessionIds = new Set(
          workoutLogs
            .filter(log => log.mesocycleId === currentMesocycle.id)
            .map(log => log.sessionId)
        );

        // Get logs to import
        const logsToImport = workoutLogs.filter(log => logIds.includes(log.id));

        // Try to determine workout type from the old mesocycle or exercises
        const getWorkoutType = (log: WorkoutLog): 'strength' | 'hypertrophy' | 'power' | null => {
          // First, try to find the original session in mesocycle history
          for (const meso of mesocycleHistory) {
            for (const week of meso.weeks) {
              const session = week.sessions.find(s => s.id === log.sessionId);
              if (session) return session.type;
            }
          }
          // If we have exercises, infer from rep ranges (rough heuristic)
          if (log.exercises.length > 0) {
            const avgReps = log.exercises.reduce((sum, ex) => {
              const completedSets = ex.sets.filter(s => s.completed);
              if (completedSets.length === 0) return sum;
              return sum + completedSets.reduce((s, set) => s + set.reps, 0) / completedSets.length;
            }, 0) / log.exercises.length;

            if (avgReps <= 5) return 'strength';
            if (avgReps <= 12) return 'hypertrophy';
            return 'power';
          }
          return null;
        };

        // Assign sessions to imported logs
        const usedSessionIds = new Set<string>(completedSessionIds);
        const updatedLogs = workoutLogs.map(log => {
          if (!logIds.includes(log.id)) return log;

          const workoutType = getWorkoutType(log);

          // Find a matching session (prefer same type, then any available)
          let matchingSession = allSessions.find(
            s => s.type === workoutType && !usedSessionIds.has(s.id)
          );

          // If no type match, use any available session
          if (!matchingSession) {
            matchingSession = allSessions.find(s => !usedSessionIds.has(s.id));
          }

          if (matchingSession) {
            usedSessionIds.add(matchingSession.id);
            return {
              ...log,
              mesocycleId: currentMesocycle.id,
              sessionId: matchingSession.id,
            };
          }

          // No available session - just update mesocycleId
          return { ...log, mesocycleId: currentMesocycle.id };
        });

        set({ workoutLogs: updatedLogs });

        // Recalculate PRs and gamification stats after import
        get().recalculatePRs();
      },

      // Workout actions
      startWorkout: (session) => {
        const { workoutLogs, user } = get();

        // Autoregulate: adjust session based on recent feedback (intermediate+ only)
        let activeSession = session;
        if (user && user.experienceLevel !== 'beginner' && workoutLogs.length >= 2) {
          const recent = workoutLogs.slice(-3); // last 3 workouts
          const { session: adjusted } = autoregulateSession(session, recent);
          activeSession = adjusted;
        }

        // Pre-fill weights from previous session using auto-adjust
        const exerciseLogs = activeSession.exercises.map((ex) => {
          const suggestedWeight = getSuggestedWeight(ex.exerciseId, workoutLogs);
          // Get per-set data from previous session to prefill reps individually
          const previousSets = getPreviousSessionSets(ex.exerciseId, workoutLogs);
          return {
            exerciseId: ex.exerciseId,
            exerciseName: ex.exercise.name,
            sets: Array.from({ length: ex.sets }, (_, i) => ({
              setNumber: i + 1,
              weight: previousSets?.[i]?.weight ?? suggestedWeight ?? 0,
              reps: previousSets?.[i]?.reps ?? ex.prescription.targetReps,
              rpe: ex.prescription.rpe,
              completed: false
            })),
            personalRecord: false
          };
        });

        set({
          activeWorkout: {
            session: activeSession,
            baseSession: JSON.parse(JSON.stringify(session)), // Deep clone original as immutable base
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

      swapProgramExercise: (weekIndex, sessionId, exerciseIndex, newExerciseId) => {
        const { currentMesocycle } = get();
        if (!currentMesocycle) return;

        const newExercise = getExerciseById(newExerciseId);
        if (!newExercise) return;

        const updatedWeeks = currentMesocycle.weeks.map((week, wIdx) => {
          if (wIdx !== weekIndex) return week;
          return {
            ...week,
            sessions: week.sessions.map(session => {
              if (session.id !== sessionId) return session;
              const updatedExercises = [...session.exercises];
              const oldPrescription = updatedExercises[exerciseIndex];
              updatedExercises[exerciseIndex] = {
                ...oldPrescription,
                exerciseId: newExerciseId,
                exercise: newExercise,
              };
              return { ...session, exercises: updatedExercises };
            }),
          };
        });

        set({
          currentMesocycle: {
            ...currentMesocycle,
            weeks: updatedWeeks,
          },
        });
      },

      adaptWorkoutToProfile: (profile) => {
        const { activeWorkout, workoutLogs } = get();
        if (!activeWorkout) return;

        const preset = DEFAULT_EQUIPMENT_PROFILES.find(p => p.name === profile);
        if (!preset) return;
        const profileEquipment = preset.equipment;

        // Update profile state
        set({ activeEquipmentProfile: profile });
        const { user } = get();
        if (user) {
          set({ user: { ...user, availableEquipment: profileEquipment, updatedAt: new Date() } });
        }

        // Always adapt from the ORIGINAL base session — not the last adapted state.
        // This prevents exercises getting "stuck" when switching back and forth.
        const baseExercises = activeWorkout.baseSession.exercises;

        const isExerciseCompatible = (ex: { equipmentTypes?: EquipmentType[] }) => {
          const eqTypes = ex.equipmentTypes || [];
          if (eqTypes.length === 0) return true;
          return eqTypes.every(et => et === 'bodyweight' || profileEquipment.includes(et));
        };

        const updatedExercises = [...baseExercises];
        const usedIds = new Set<string>();
        let changed = false;

        // Rebuild exercise logs to match the base session structure
        const updatedLogs = baseExercises.map((ex, i) => {
          const existingLog = activeWorkout.exerciseLogs[i];
          return {
            exerciseId: ex.exerciseId,
            exerciseName: ex.exercise.name,
            sets: existingLog
              ? existingLog.sets.map(s => ({ ...s }))
              : Array.from({ length: ex.sets }, (_, si) => ({
                  setNumber: si + 1,
                  weight: getSuggestedWeight(ex.exerciseId, workoutLogs) || 0,
                  reps: ex.prescription.targetReps,
                  rpe: ex.prescription.rpe,
                  completed: false,
                })),
            personalRecord: false as boolean,
          };
        });

        for (let i = 0; i < updatedExercises.length; i++) {
          const ex = updatedExercises[i];
          usedIds.add(ex.exerciseId);

          if (isExerciseCompatible(ex.exercise)) continue;

          // Original exercise incompatible — find the best compatible alternative
          const currentMuscles = ex.exercise.primaryMuscles;
          const currentPattern = ex.exercise.movementPattern;

          const compatibleAlts = allExercises
            .filter(alt =>
              alt.id !== ex.exerciseId &&
              !usedIds.has(alt.id) &&
              isExerciseCompatible(alt) &&
              alt.primaryMuscles.some(m => currentMuscles.includes(m))
            )
            .sort((a, b) => {
              const aOverlap = a.primaryMuscles.filter(m => currentMuscles.includes(m)).length;
              const bOverlap = b.primaryMuscles.filter(m => currentMuscles.includes(m)).length;
              if (bOverlap !== aOverlap) return bOverlap - aOverlap;
              const aPattern = a.movementPattern === currentPattern ? 1 : 0;
              const bPattern = b.movementPattern === currentPattern ? 1 : 0;
              return bPattern - aPattern;
            });

          const compatibleAlt = compatibleAlts[0];

          if (compatibleAlt) {
            usedIds.add(compatibleAlt.id);
            updatedExercises[i] = {
              ...ex,
              exerciseId: compatibleAlt.id,
              exercise: compatibleAlt,
            };
            const suggestedWeight = getSuggestedWeight(compatibleAlt.id, workoutLogs);
            updatedLogs[i] = {
              exerciseId: compatibleAlt.id,
              exerciseName: compatibleAlt.name,
              sets: updatedLogs[i].sets.map(s => ({
                ...s,
                weight: suggestedWeight || 0,
                completed: false,
              })),
              personalRecord: false,
            };
            changed = true;
          }
        }

        // Check if we need to update (either exercises changed or we're restoring originals)
        const currentIds = activeWorkout.session.exercises.map(e => e.exerciseId).join(',');
        const newIds = updatedExercises.map(e => e.exerciseId).join(',');
        if (changed || currentIds !== newIds) {
          const updatedSession = { ...activeWorkout.baseSession, exercises: updatedExercises };
          set({
            activeWorkout: {
              ...activeWorkout,
              session: updatedSession,
              exerciseLogs: updatedLogs,
            }
          });
        }
      },

      completeWorkout: (feedback) => {
        const { activeWorkout, workoutLogs, gamificationStats, currentMesocycle, user, trainingSessions } = get();
        if (!activeWorkout || !user) return;
        // Mesocycle can be null for template/quick workouts — still log the workout

        // Calculate total volume
        const totalVolume = activeWorkout.exerciseLogs.reduce((total, ex) => {
          return total + ex.sets.reduce((setTotal, set) => {
            return setTotal + (set.completed ? set.weight * set.reps : 0);
          }, 0);
        }, 0);

        // Calculate duration — use override if provided (retroactive logging)
        const duration = feedback.durationOverride ?? Math.round(
          (new Date().getTime() - activeWorkout.startTime.getTime()) / 1000 / 60
        );

        // Check for PRs
        const hadPR = activeWorkout.exerciseLogs.some((ex) => ex.personalRecord);

        // Auto-correlate with Whoop workout HR data if available
        const { whoopWorkouts } = get();
        const whoopHR = matchWhoopWorkout(new Date(), duration, whoopWorkouts);

        // Create workout log
        const workoutLog: WorkoutLog = {
          id: uuidv4(),
          userId: user.id,
          mesocycleId: currentMesocycle?.id || 'standalone',
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
          completed: true,
          whoopHR,
        };

        // Calculate date-aware streak (respects trainingIdentity)
        const fmtDate = (d: Date) => {
          const dt = new Date(d);
          return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        };
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = fmtDate(today);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = fmtDate(yesterday);

        // Collect all training dates - include training sessions if user does combat/general fitness
        const includeOtherSessions = user.trainingIdentity === 'combat' || user.trainingIdentity === 'general_fitness';
        const allTrainingDates = new Set<string>();

        // Add all workout log dates
        workoutLogs.forEach(log => allTrainingDates.add(fmtDate(new Date(log.date))));

        // Add training session dates if applicable
        if (includeOtherSessions && trainingSessions.length > 0) {
          trainingSessions.forEach(session => allTrainingDates.add(fmtDate(new Date(session.date))));
        }

        const alreadyTrainedToday = allTrainingDates.has(todayStr);

        let newStreak: number;
        if (alreadyTrainedToday) {
          // Already trained today — don't double-count
          newStreak = gamificationStats.currentStreak;
        } else {
          // Get all dates sorted descending to find the last training date
          const sortedDates = Array.from(allTrainingDates).sort().reverse();
          const lastTrainingDate = sortedDates[0] || null;

          if (!lastTrainingDate) {
            newStreak = 1; // first training ever
          } else {
            newStreak = lastTrainingDate === yesterdayStr
              ? gamificationStats.currentStreak + 1
              : 1; // gap — reset streak
          }
        }

        // Calculate points
        const { points, breakdown } = calculateWorkoutPoints(
          workoutLog,
          hadPR,
          newStreak
        );

        // Update stats
        const newTotalWorkouts = gamificationStats.totalWorkouts + 1;
        const newTotalVolume = gamificationStats.totalVolume + totalVolume;
        const newTotalPoints = gamificationStats.totalPoints + points;
        const newPRs = gamificationStats.personalRecords + (hadPR ? 1 : 0);

        set({
          activeWorkout: null,
          workoutLogs: [...workoutLogs, workoutLog],
          lastCompletedWorkout: {
            log: workoutLog,
            points,
            hadPR,
            newStreak: newStreak,
            newBadges: [], // Will be populated by checkAndAwardBadges
          },
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
      recalculateGamificationStats: () => {
        const { workoutLogs, trainingSessions, gamificationStats, user } = get();

        // Recalculate total workouts
        const totalWorkouts = workoutLogs.length;

        // Recalculate total volume (fall back to computing from sets for old backups missing totalVolume)
        const totalVolume = workoutLogs.reduce((sum, log) => {
          if (log.totalVolume > 0) return sum + log.totalVolume;
          // Compute from sets for old imports
          return sum + log.exercises.reduce((exSum, ex) =>
            exSum + ex.sets.reduce((setSum, set) =>
              setSum + ((set.completed !== false && set.weight > 0 && set.reps > 0) ? set.weight * set.reps : 0), 0), 0);
        }, 0);

        // Recalculate PRs
        const personalRecords = workoutLogs.reduce((sum, log) =>
          sum + log.exercises.filter(ex => ex.personalRecord).length, 0
        );

        // Recalculate streak based on all training dates
        const fmtDate = (d: Date) => {
          const dt = new Date(d);
          return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        };

        const includeOtherSessions = user?.trainingIdentity === 'combat' || user?.trainingIdentity === 'general_fitness';
        const allTrainingDates = new Set<string>();
        workoutLogs.forEach(log => allTrainingDates.add(fmtDate(new Date(log.date))));
        if (includeOtherSessions) {
          trainingSessions.forEach(s => allTrainingDates.add(fmtDate(new Date(s.date))));
        }

        // Calculate current streak and longest historical streak from sorted dates
        const sortedDates = Array.from(allTrainingDates).sort().reverse(); // newest first
        let currentStreak = 0;
        let longestStreak = 0;

        if (sortedDates.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayStr = fmtDate(today);
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = fmtDate(yesterday);

          // Current streak: only counts if trained today or yesterday
          if (sortedDates[0] === todayStr || sortedDates[0] === yesterdayStr) {
            currentStreak = 1;
            let prevDate = new Date(sortedDates[0]);

            for (let i = 1; i < sortedDates.length; i++) {
              const checkDate = new Date(sortedDates[i]);
              const diffDays = Math.floor((prevDate.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24));

              if (diffDays === 1) {
                currentStreak++;
                prevDate = checkDate;
              } else {
                break;
              }
            }
          }

          // Longest historical streak: scan all dates (oldest first) to find best run
          const chronological = [...sortedDates].reverse(); // oldest first
          let runLength = 1;
          longestStreak = 1;

          for (let i = 1; i < chronological.length; i++) {
            const prev = new Date(chronological[i - 1]);
            const curr = new Date(chronological[i]);
            const diffDays = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
              runLength++;
            } else {
              runLength = 1;
            }
            if (runLength > longestStreak) {
              longestStreak = runLength;
            }
          }
        }

        set({
          gamificationStats: {
            ...gamificationStats,
            totalWorkouts,
            totalVolume,
            personalRecords,
            currentStreak,
            longestStreak,
          }
        });

        // Also check for badges
        get().checkAndAwardBadges();
      },

      recalculatePRs: () => {
        const { workoutLogs } = get();
        if (workoutLogs.length === 0) return;

        // Sort logs by date (oldest first) to process in chronological order
        const sortedLogs = [...workoutLogs].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Track best estimated 1RM for each exercise
        const bestE1RMs: Record<string, number> = {};

        // Calculate estimated 1RM using Brzycki formula
        const calcE1RM = (weight: number, reps: number) => {
          if (reps === 0 || weight === 0) return 0;
          if (reps === 1) return weight;
          return Math.round(weight / (1.0278 - 0.0278 * reps));
        };

        // Process each log and update PR flags
        const updatedLogs = sortedLogs.map(log => {
          const updatedExercises = log.exercises.map(ex => {
            // Find best set in this exercise
            let bestSetE1RM = 0;
            for (const set of ex.sets) {
              // For old backups, sets may not have 'completed' flag — treat as completed if weight+reps exist
              const isCompleted = set.completed !== false && set.weight > 0 && set.reps > 0;
              if (isCompleted) {
                const e1rm = calcE1RM(set.weight, set.reps);
                if (e1rm > bestSetE1RM) {
                  bestSetE1RM = e1rm;
                }
              }
            }

            // Check if this is a PR
            const previousBest = bestE1RMs[ex.exerciseId] || 0;
            const isPR = bestSetE1RM > 0 && bestSetE1RM > previousBest;

            // Update best for this exercise
            if (bestSetE1RM > previousBest) {
              bestE1RMs[ex.exerciseId] = bestSetE1RM;
            }

            // Update estimated1RM on the exercise
            return {
              ...ex,
              personalRecord: isPR,
              estimated1RM: bestSetE1RM > 0 ? bestSetE1RM : ex.estimated1RM,
            };
          });

          return { ...log, exercises: updatedExercises };
        });

        // Re-sort back to original order (newest first for display)
        const finalLogs = updatedLogs.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        // Batch the workoutLogs update — gamification recalc runs on next tick
        // to avoid cascading set() calls that cause blank-screen re-render storms
        set({ workoutLogs: finalLogs });

        // Defer gamification recalc to avoid synchronous cascading set() calls
        // (recalculateGamificationStats -> checkAndAwardBadges -> set())
        // which cause rapid re-renders that break AnimatePresence transitions
        queueMicrotask(() => {
          get().recalculateGamificationStats();
        });
      },

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
        const { gamificationStats, workoutLogs, mesocycleHistory, lastCompletedWorkout } = get();

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

          // Update gamification stats and also add badges to lastCompletedWorkout for display
          const updates: Partial<AppState> = {
            gamificationStats: {
              ...gamificationStats,
              badges: [...gamificationStats.badges, ...newUserBadges],
              totalPoints: gamificationStats.totalPoints + additionalPoints,
              level: calculateLevel(gamificationStats.totalPoints + additionalPoints)
            }
          };

          // If there's a pending workout summary, add the badges to it for display
          if (lastCompletedWorkout) {
            updates.lastCompletedWorkout = {
              ...lastCompletedWorkout,
              newBadges: newBadges.map(b => ({
                id: b.id,
                name: b.name,
                icon: b.icon,
                points: b.points
              }))
            };
          }

          set(updates);
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

      addPastWorkout: (workout) => {
        const { workoutLogs, user, gamificationStats } = get();
        if (!user) return;

        // Calculate total volume
        const totalVolume = workout.exercises.reduce((total, ex) =>
          total + ex.sets.reduce((setTotal, set) =>
            setTotal + (set.completed ? set.weight * set.reps : 0), 0
          ), 0
        );

        // Create workout log
        const workoutLog: WorkoutLog = {
          id: uuidv4(),
          userId: user.id,
          mesocycleId: 'standalone', // Not part of a mesocycle
          sessionId: `past-${uuidv4()}`,
          date: workout.date,
          exercises: workout.exercises,
          totalVolume,
          duration: workout.duration,
          overallRPE: workout.overallRPE ?? 7,
          soreness: 5,
          energy: 5,
          notes: workout.notes,
          completed: true,
        };

        set({ workoutLogs: [...workoutLogs, workoutLog] });

        // Recalculate PRs and gamification stats to properly account for this past workout
        get().recalculatePRs();
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

      // Quick log actions
      addQuickLog: (log) => {
        const { quickLogs } = get();
        const entry: QuickLog = {
          ...log,
          id: uuidv4(),
        };
        set({ quickLogs: [...quickLogs, entry] });
      },

      deleteQuickLog: (id) => {
        const { quickLogs } = get();
        set({ quickLogs: quickLogs.filter(l => l.id !== id) });
      },

      // Grip strength actions
      addGripTest: (test) => {
        const { gripTests } = get();
        const entry: GripTest = {
          ...test,
          id: uuidv4(),
        };
        set({ gripTests: [...gripTests, entry] });
      },

      addGripExerciseLog: (log) => {
        const { gripExerciseLogs } = get();
        const entry: GripExerciseLog = {
          ...log,
          id: uuidv4(),
        };
        set({ gripExerciseLogs: [...gripExerciseLogs, entry] });
      },

      deleteGripTest: (id) => {
        const { gripTests } = get();
        set({ gripTests: gripTests.filter(t => t.id !== id) });
      },

      deleteGripExerciseLog: (id) => {
        const { gripExerciseLogs } = get();
        set({ gripExerciseLogs: gripExerciseLogs.filter(l => l.id !== id) });
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

      // Training session actions (unified system for grappling, striking, cardio, etc.)
      addTrainingSession: (session) => {
        const { trainingSessions, workoutLogs, gamificationStats, user } = get();
        // Auto-determine category from type if not provided
        const category = session.category || ACTIVITY_CATEGORY_MAP[session.type] || 'other';

        const newSession = {
          ...session,
          id: uuidv4(),
          category,
        };

        // Update streak if user does combat/general fitness training
        const includeInStreak = user && (user.trainingIdentity === 'combat' || user.trainingIdentity === 'general_fitness');

        if (includeInStreak) {
          // Calculate streak including this new session
          const fmtDate = (d: Date) => {
            const dt = new Date(d);
            return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
          };
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayStr = fmtDate(today);
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = fmtDate(yesterday);

          // Collect all existing training dates
          const allTrainingDates = new Set<string>();
          workoutLogs.forEach(log => allTrainingDates.add(fmtDate(new Date(log.date))));
          trainingSessions.forEach(s => allTrainingDates.add(fmtDate(new Date(s.date))));

          const sessionDateStr = fmtDate(new Date(session.date));
          const alreadyTrainedOnSessionDate = allTrainingDates.has(sessionDateStr);

          let newStreak = gamificationStats.currentStreak;
          if (!alreadyTrainedOnSessionDate) {
            // This session is on a new day - check streak continuity
            const sortedDates = Array.from(allTrainingDates).sort().reverse();
            const lastTrainingDate = sortedDates[0] || null;

            if (!lastTrainingDate) {
              newStreak = 1; // first training ever
            } else if (sessionDateStr === todayStr && lastTrainingDate === yesterdayStr) {
              newStreak = gamificationStats.currentStreak + 1;
            } else if (sessionDateStr === todayStr && lastTrainingDate !== todayStr) {
              // Training today but gap from last session
              newStreak = 1;
            }
          }

          set({
            trainingSessions: [...trainingSessions, newSession],
            gamificationStats: {
              ...gamificationStats,
              currentStreak: newStreak,
              longestStreak: Math.max(gamificationStats.longestStreak, newStreak),
            }
          });
        } else {
          set({
            trainingSessions: [...trainingSessions, newSession]
          });
        }
      },

      updateTrainingSession: (id, updates) => {
        const { trainingSessions } = get();
        set({
          trainingSessions: trainingSessions.map(s =>
            s.id === id ? { ...s, ...updates } : s
          )
        });
      },

      deleteTrainingSession: (id) => {
        const { trainingSessions } = get();
        set({ trainingSessions: trainingSessions.filter(s => s.id !== id) });
      },

      // Theme actions
      setThemeMode: (mode) => set({ themeMode: mode }),

      // Nutrition actions
      addMeal: (meal) => {
        const { meals } = get();
        set({ meals: [...meals, { ...meal, id: uuidv4() }] });
      },

      deleteMeal: (id) => {
        const { meals } = get();
        set({ meals: meals.filter(m => m.id !== id) });
      },

      setMacroTargets: (targets) => set({ macroTargets: targets }),

      setWaterGlasses: (date, glasses) => {
        const { waterLog } = get();
        set({ waterLog: { ...waterLog, [date]: glasses } });
      },

      // Diet coaching actions
      startDietPhase: (phase) => {
        const { mealReminders } = get();
        set({
          activeDietPhase: { ...phase, id: uuidv4() },
          macroTargets: phase.currentMacros,
          // Auto-enable meal reminders when starting a diet phase
          mealReminders: { ...mealReminders, enabled: true },
        });
      },

      endDietPhase: () => {
        set({ activeDietPhase: null });
      },

      addWeeklyCheckIn: (checkIn) => {
        const { weeklyCheckIns } = get();
        set({
          weeklyCheckIns: [...weeklyCheckIns, { ...checkIn, id: uuidv4() }],
          macroTargets: checkIn.newMacros,
        });
      },

      incrementPhaseWeek: () => {
        const { activeDietPhase } = get();
        if (activeDietPhase) {
          set({
            activeDietPhase: {
              ...activeDietPhase,
              weeksCompleted: activeDietPhase.weeksCompleted + 1,
            },
          });
        }
      },

      // Meal reminder actions
      setMealReminders: (settings) => {
        const { mealReminders } = get();
        set({ mealReminders: { ...mealReminders, ...settings } });
      },

      // Body composition actions
      addBodyComposition: (entry) => {
        const { bodyComposition } = get();
        set({ bodyComposition: [...bodyComposition, { ...entry, id: uuidv4() }] });
      },

      deleteBodyComposition: (id) => {
        const { bodyComposition } = get();
        set({ bodyComposition: bodyComposition.filter(e => e.id !== id) });
      },

      // Online status
      setOnline: (online) => set({ isOnline: online }),

      // Post-workout summary actions
      dismissWorkoutSummary: () => set({ lastCompletedWorkout: null }),

      // Sync conflict actions
      resolveSyncConflict: (resolution) => {
        const { pendingRemoteData, syncConflict } = get();
        if (!pendingRemoteData || !syncConflict) {
          set({ syncConflict: null, pendingRemoteData: null });
          return;
        }

        if (resolution === 'local') {
          // Keep local data, overwrite remote on next sync
          set({ syncConflict: null, pendingRemoteData: null });
        } else if (resolution === 'remote') {
          // Use remote data
          const fieldsToMerge: Record<string, unknown> = {};
          if (pendingRemoteData.workoutLogs) fieldsToMerge.workoutLogs = pendingRemoteData.workoutLogs;
          if (pendingRemoteData.bodyWeightLog) fieldsToMerge.bodyWeightLog = pendingRemoteData.bodyWeightLog;
          if (pendingRemoteData.gamificationStats) fieldsToMerge.gamificationStats = pendingRemoteData.gamificationStats;
          if (pendingRemoteData.injuryLog) fieldsToMerge.injuryLog = pendingRemoteData.injuryLog;
          if (pendingRemoteData.customExercises) fieldsToMerge.customExercises = pendingRemoteData.customExercises;
          if (pendingRemoteData.sessionTemplates) fieldsToMerge.sessionTemplates = pendingRemoteData.sessionTemplates;
          if (pendingRemoteData.hrSessions) fieldsToMerge.hrSessions = pendingRemoteData.hrSessions;
          if (pendingRemoteData.trainingSessions) fieldsToMerge.trainingSessions = pendingRemoteData.trainingSessions;
          if (pendingRemoteData.currentMesocycle) fieldsToMerge.currentMesocycle = pendingRemoteData.currentMesocycle;
          if (pendingRemoteData.mesocycleHistory) fieldsToMerge.mesocycleHistory = pendingRemoteData.mesocycleHistory;
          if (pendingRemoteData.baselineLifts) fieldsToMerge.baselineLifts = pendingRemoteData.baselineLifts;
          if (pendingRemoteData.user) fieldsToMerge.user = pendingRemoteData.user;
          set({ ...fieldsToMerge, syncConflict: null, pendingRemoteData: null });
        } else {
          // Smart merge: union arrays, prefer newest for scalars
          const localState = get();
          const localData: Record<string, unknown> = {
            workoutLogs: localState.workoutLogs,
            bodyWeightLog: localState.bodyWeightLog,
            gamificationStats: localState.gamificationStats,
            injuryLog: localState.injuryLog,
            customExercises: localState.customExercises,
            sessionTemplates: localState.sessionTemplates,
            hrSessions: localState.hrSessions,
            trainingSessions: localState.trainingSessions,
            currentMesocycle: localState.currentMesocycle,
            mesocycleHistory: localState.mesocycleHistory,
            lastSyncAt: localState.lastSyncAt || 0,
            user: localState.user,
          };
          const merged = resolveConflicts(localData, pendingRemoteData);
          const updates: Record<string, unknown> = {};
          if (merged.workoutLogs) updates.workoutLogs = merged.workoutLogs;
          if (merged.bodyWeightLog) updates.bodyWeightLog = merged.bodyWeightLog;
          if (merged.gamificationStats) updates.gamificationStats = merged.gamificationStats;
          if (merged.injuryLog) updates.injuryLog = merged.injuryLog;
          if (merged.customExercises) updates.customExercises = merged.customExercises;
          if (merged.sessionTemplates) updates.sessionTemplates = merged.sessionTemplates;
          if (merged.hrSessions) updates.hrSessions = merged.hrSessions;
          if (merged.trainingSessions) updates.trainingSessions = merged.trainingSessions;
          set({ ...updates, syncConflict: null, pendingRemoteData: null });
        }
      },
      dismissSyncConflict: () => set({ syncConflict: null, pendingRemoteData: null }),

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
          quickLogs: [],
          gripTests: [],
          gripExerciseLogs: [],
          injuryLog: [],
          customExercises: [],
          sessionTemplates: [],
          hrSessions: [],
          trainingSessions: [],
          themeMode: 'dark' as ThemeMode,
          meals: [],
          macroTargets: { calories: 2500, protein: 200, carbs: 280, fat: 80 },
          waterLog: {},
          activeDietPhase: null,
          weeklyCheckIns: [],
          mealReminders: {
            enabled: false,
            reminderTimes: { breakfast: '08:00', lunch: '12:30', dinner: '19:00' },
            enabledMeals: { breakfast: true, lunch: true, dinner: true },
          },
          bodyComposition: [],
          muscleEmphasis: null,
          competitions: [],
          isOnline: true,
          lastSyncAt: null,
          showTip: true,
          currentTipId: null
        })
    }),
    {
      name: 'roots-gains-storage',
      storage: {
        getItem: (name: string) => {
          try {
            const item = localStorage.getItem(name);
            return item ? JSON.parse(item) : null;
          } catch {
            return null;
          }
        },
        setItem: (name: string, value: unknown) => {
          try {
            const json = JSON.stringify(value);
            // Check if we're approaching the limit (5MB typical)
            const currentSize = new Blob([json]).size;
            if (currentSize > 4.5 * 1024 * 1024) {
              // Approaching limit — clone via JSON to avoid mutating live store
              console.warn('[storage] Data approaching localStorage limit — pruning old entries. Consider exporting a backup.');
              const data = JSON.parse(json);
              if (data?.state?.workoutLogs?.length > 50) {
                data.state.workoutLogs = data.state.workoutLogs.slice(-50);
              }
              if (data?.state?.meals?.length > 200) {
                data.state.meals = data.state.meals.slice(-200);
              }
              if (data?.state?.mesocycleHistory?.length > 10) {
                data.state.mesocycleHistory = data.state.mesocycleHistory.slice(-10);
              }
              // Surface warning to the user via store state
              if (data?.state) {
                data.state._storageWarning = 'Storage is nearly full. Old workout logs and meals have been trimmed. Export a backup to avoid data loss.';
              }
              localStorage.setItem(name, JSON.stringify(data));
            } else {
              localStorage.setItem(name, json);
            }
          } catch (e: any) {
            if (e?.name === 'QuotaExceededError' || e?.code === 22) {
              // Emergency pruning — clone to avoid mutating live store
              try {
                const data = JSON.parse(JSON.stringify(value));
                if (data?.state) {
                  if (data.state.workoutLogs?.length > 20) data.state.workoutLogs = data.state.workoutLogs.slice(-20);
                  if (data.state.meals?.length > 50) data.state.meals = data.state.meals.slice(-50);
                  if (data.state.mesocycleHistory?.length > 3) data.state.mesocycleHistory = data.state.mesocycleHistory.slice(-3);
                  if (data.state.bodyComposition?.length > 30) data.state.bodyComposition = data.state.bodyComposition.slice(-30);
                }
                localStorage.setItem(name, JSON.stringify(data));
              } catch {
                // Last resort: clear and save fresh
                console.error('localStorage full — clearing old data');
                localStorage.removeItem(name);
                localStorage.setItem(name, JSON.stringify(value));
              }
            }
          }
        },
        removeItem: (name: string) => {
          try {
            localStorage.removeItem(name);
          } catch {}
        },
      },
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isOnboarded: state.isOnboarded,
        onboardingData: state.onboardingData,
        baselineLifts: state.baselineLifts,
        currentMesocycle: state.currentMesocycle,
        mesocycleHistory: state.mesocycleHistory,
        activeWorkout: state.activeWorkout,
        workoutLogs: state.workoutLogs,
        gamificationStats: state.gamificationStats,
        bodyWeightLog: state.bodyWeightLog,
        quickLogs: state.quickLogs,
        gripTests: state.gripTests,
        gripExerciseLogs: state.gripExerciseLogs,
        injuryLog: state.injuryLog,
        customExercises: state.customExercises,
        sessionTemplates: state.sessionTemplates,
        hrSessions: state.hrSessions,
        trainingSessions: state.trainingSessions,
        themeMode: state.themeMode,
        meals: state.meals,
        macroTargets: state.macroTargets,
        waterLog: state.waterLog,
        activeDietPhase: state.activeDietPhase,
        weeklyCheckIns: state.weeklyCheckIns,
        mealReminders: state.mealReminders,
        bodyComposition: state.bodyComposition,
        muscleEmphasis: state.muscleEmphasis,
        competitions: state.competitions,
        lastSyncAt: state.lastSyncAt,
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
