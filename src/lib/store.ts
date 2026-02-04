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
  GrapplingSession,
  MealEntry,
  MacroTargets,
  MuscleGroupConfig,
  WearableData,
  CompetitionEvent
} from './types';
import { generateMesocycle } from './workout-generator';
import { calculateLevel, calculateWorkoutPoints, checkNewBadges, badges } from './gamification';
import { getSuggestedWeight, getPreviousSessionSets, whoopRecoveryToReadiness } from './auto-adjust';
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

  // Injury tracking
  injuryLog: InjuryEntry[];

  // Custom exercises
  customExercises: CustomExercise[];

  // Session templates
  sessionTemplates: SessionTemplate[];

  // Heart rate sessions
  hrSessions: HRSession[];

  // Grappling sessions
  grapplingSessions: GrapplingSession[];

  // Theme
  themeMode: ThemeMode;

  // Nutrition
  meals: MealEntry[];
  macroTargets: MacroTargets;
  waterLog: Record<string, number>; // dateStr -> glasses

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
  } | null;

  // UI state
  showTip: boolean;
  currentTipId: string | null;

  // Actions
  setUser: (user: UserProfile | null) => void;
  setAuthenticated: (auth: boolean) => void;
  updateOnboardingData: (data: Partial<OnboardingData>) => void;
  completeOnboarding: () => void;
  setBaselineLifts: (lifts: BaselineLifts) => void;

  // Muscle emphasis actions
  setMuscleEmphasis: (config: MuscleGroupConfig) => void;

  // Mesocycle actions
  generateNewMesocycle: (weeks?: number, sessionDurationMinutes?: number) => void;
  completeMesocycle: () => void;

  // Workout actions
  startWorkout: (session: WorkoutSession) => void;
  setPreCheckIn: (checkIn: PreWorkoutCheckIn) => void;
  updateExerciseLog: (exerciseIndex: number, log: ExerciseLog) => void;
  updateExerciseFeedback: (exerciseIndex: number, feedback: ExerciseFeedback) => void;
  swapExercise: (exerciseIndex: number, newExerciseId: string, newExerciseName: string) => void;
  adaptWorkoutToProfile: (profile: EquipmentProfileName) => void;
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

  // Grappling session actions
  addGrapplingSession: (session: Omit<GrapplingSession, 'id'>) => void;
  deleteGrapplingSession: (id: string) => void;

  // Theme actions
  setThemeMode: (mode: ThemeMode) => void;

  // Nutrition actions
  addMeal: (meal: Omit<MealEntry, 'id'>) => void;
  deleteMeal: (id: string) => void;
  setMacroTargets: (targets: MacroTargets) => void;
  setWaterGlasses: (date: string, glasses: number) => void;

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
  applyWhoopAdjustment: () => void;

  // Online status
  setOnline: (online: boolean) => void;

  // Post-workout summary actions
  dismissWorkoutSummary: () => void;

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
  availableEquipment: DEFAULT_EQUIPMENT_PROFILES[0].equipment,
  goalFocus: 'balanced',
  sessionsPerWeek: 3,
  sessionDurationMinutes: 60,
  weightUnit: 'lbs',
  baselineLifts: {},
  trainingIdentity: 'combat',
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
      grapplingSessions: [],
      themeMode: 'dark' as ThemeMode,
      meals: [],
      macroTargets: { calories: 2500, protein: 200, carbs: 280, fat: 80 },
      waterLog: {},
      bodyComposition: [],
      muscleEmphasis: null,
      activeEquipmentProfile: 'gym' as EquipmentProfileName,
      competitions: [],
      latestWhoopData: null,
      isOnline: true,
      lastSyncAt: null,
      lastCompletedWorkout: null,
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
          availableEquipment: onboardingData.availableEquipment || DEFAULT_EQUIPMENT_PROFILES[0].equipment,
          goalFocus: onboardingData.goalFocus,
          sessionsPerWeek: onboardingData.sessionsPerWeek,
          sessionDurationMinutes: onboardingData.sessionDurationMinutes || 60,
          weightUnit: onboardingData.weightUnit || 'lbs',
          trainingIdentity: onboardingData.trainingIdentity || 'combat',
          combatSport: onboardingData.combatSport,
          trainingDays: onboardingData.trainingDays,
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

      applyWhoopAdjustment: () => {
        const { activeWorkout, latestWhoopData } = get();
        if (!activeWorkout || !latestWhoopData) return;

        // Calculate readiness from Whoop data
        const readiness = whoopRecoveryToReadiness({
          recoveryScore: latestWhoopData.recoveryScore ?? undefined,
          hrvMs: latestWhoopData.hrv ?? undefined,
          sleepScore: latestWhoopData.sleepScore ?? undefined,
          strainScore: latestWhoopData.strain ?? undefined,
        });

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

        // Generate new mesocycle with granular equipment
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
            session,
            baseSession: JSON.parse(JSON.stringify(session)), // Deep clone as immutable base
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
        const { activeWorkout, workoutLogs, gamificationStats, currentMesocycle, user } = get();
        if (!activeWorkout || !user) return;
        // Mesocycle can be null for template/quick workouts — still log the workout

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
          completed: true
        };

        // Calculate date-aware streak
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

        const alreadyWorkedOutToday = workoutLogs.some(log => fmtDate(new Date(log.date)) === todayStr);

        let newStreak: number;
        if (alreadyWorkedOutToday) {
          // Already trained today — don't double-count
          newStreak = gamificationStats.currentStreak;
        } else {
          const lastLog = workoutLogs.length > 0
            ? workoutLogs.reduce((latest, log) => new Date(log.date) > new Date(latest.date) ? log : latest)
            : null;
          if (!lastLog) {
            newStreak = 1; // first workout ever
          } else {
            const lastDateStr = fmtDate(new Date(lastLog.date));
            newStreak = lastDateStr === yesterdayStr
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

      // Grappling session actions
      addGrapplingSession: (session) => {
        const { grapplingSessions } = get();
        set({ grapplingSessions: [...grapplingSessions, { ...session, id: uuidv4() }] });
      },

      deleteGrapplingSession: (id) => {
        const { grapplingSessions } = get();
        set({ grapplingSessions: grapplingSessions.filter(s => s.id !== id) });
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
          grapplingSessions: [],
          themeMode: 'dark' as ThemeMode,
          meals: [],
          macroTargets: { calories: 2500, protein: 200, carbs: 280, fat: 80 },
          waterLog: {},
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
      name: 'grappler-gains-storage',
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
              // Approaching limit - prune old workout logs (keep last 50)
              const data = value as any;
              if (data?.state?.workoutLogs?.length > 50) {
                data.state.workoutLogs = data.state.workoutLogs.slice(-50);
              }
              if (data?.state?.meals?.length > 200) {
                data.state.meals = data.state.meals.slice(-200);
              }
              if (data?.state?.mesocycleHistory?.length > 10) {
                data.state.mesocycleHistory = data.state.mesocycleHistory.slice(-10);
              }
              localStorage.setItem(name, JSON.stringify(data));
            } else {
              localStorage.setItem(name, json);
            }
          } catch (e: any) {
            if (e?.name === 'QuotaExceededError' || e?.code === 22) {
              // Emergency pruning
              try {
                const data = (value as any);
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
        injuryLog: state.injuryLog,
        customExercises: state.customExercises,
        sessionTemplates: state.sessionTemplates,
        hrSessions: state.hrSessions,
        grapplingSessions: state.grapplingSessions,
        themeMode: state.themeMode,
        meals: state.meals,
        macroTargets: state.macroTargets,
        waterLog: state.waterLog,
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
