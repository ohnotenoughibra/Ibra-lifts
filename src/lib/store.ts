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
  Exercise,
  CustomExercise,
  SessionTemplate,
  ThemeMode,
  ColorTheme,
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
  CompletedDietPhase,
  WeeklyCheckIn,
  MealReminderSettings,
  WeeklyChallenge,
  StreakShield,
  IllnessLog,
  IllnessDailyCheckin,
  IllnessSymptom,
  IllnessSeverity,
  WorkoutSkip,
  SkipReason,
  Subscription,
  NotificationPreferences,
  DailyLoginBonus,
  PlannedMesocycle,
  WeightCutPlan,
  WeightCutDailyLog,
  CombatAthleteNutritionProfile,
  FightCampNutritionPlan,
  SupplementRecommendation,
  SupplementIntake,
  UserSupplement,
  MentalCheckIn,
  ConfidenceLedgerEntry,
  FeatureFeedback,
  WellnessDomain,
  WellnessStats,
} from './types';
import type { CycleLog } from './female-athlete';
import type { SyncConflict } from '@/components/SyncConflictResolver';
import { resolveConflicts } from './db-sync';
import { generateMesocycle, autoregulateSession } from './workout-generator';
import { calculateLevel, calculateWorkoutPoints, checkNewBadges, badges, generateWeeklyChallenge, isCurrentWeek, detectComeback, shouldRefillShield, pointRewards, calculateStreak, defaultWellnessStats, calculateWellnessMultiplier, updateWellnessStreaks, calculateWellnessXP, checkWellnessBadges } from './gamification';
import { getSuggestedWeight, getPreviousSessionSets, whoopRecoveryToReadiness, matchWhoopWorkout, calculatePersonalBaseline } from './auto-adjust';
import { detectFightCampPhase, generateFightCampTimeline } from './fight-camp-engine';
import { getActiveInjuryAdaptations } from './injury-science';
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
  mesocycleQueue: PlannedMesocycle[];

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

  // Illness tracking
  illnessLogs: IllnessLog[];

  // Workout skips
  workoutSkips: WorkoutSkip[];

  // Cycle tracking (female athlete)
  cycleLogs: CycleLog[];

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
  colorTheme: ColorTheme;

  // Nutrition
  meals: MealEntry[];
  macroTargets: MacroTargets;
  waterLog: Record<string, number>; // dateStr -> glasses

  // Diet coaching
  activeDietPhase: DietPhase | null;
  dietPhaseHistory: CompletedDietPhase[];
  weeklyCheckIns: WeeklyCheckIn[];

  // Meal reminders
  mealReminders: MealReminderSettings;

  // Body composition
  bodyComposition: BodyCompositionEntry[];

  // Muscle emphasis for mesocycle customization
  muscleEmphasis: MuscleGroupConfig | null;

  // Active equipment profile for quick-switching gym/home/travel
  activeEquipmentProfile: EquipmentProfileName;
  // Custom home gym equipment (user picks exactly what they own)
  homeGymEquipment: EquipmentType[];

  // Competitions
  competitions: CompetitionEvent[];

  // Weight Cut Plans (combat athletes)
  weightCutPlans: WeightCutPlan[];

  // Combat Athlete Nutrition Profile (extended profile for nutrition engine)
  combatNutritionProfile: CombatAthleteNutritionProfile | null;

  // Fight Camp Plans (periodized nutrition for competition prep)
  fightCampPlans: FightCampNutritionPlan[];

  // Active supplements (user's current supplement protocol)
  activeSupplements: SupplementRecommendation[];

  // Smart supplement tracking
  supplementStack: UserSupplement[];     // user's personal stack with timing + custom macros
  supplementIntakes: SupplementIntake[];  // daily intake log (what was actually taken)

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
    wellnessMultiplier?: number;
  } | null;

  // Sync conflict resolution
  syncConflict: SyncConflict | null;
  pendingRemoteData: Record<string, unknown> | null;

  // Subscription
  subscription: Subscription | null;

  // Notifications
  notificationPreferences: NotificationPreferences;

  // Daily login bonus
  dailyLoginBonus: DailyLoginBonus;

  // Fighter's Mind — mental check-ins & confidence ledger
  mentalCheckIns: MentalCheckIn[];
  confidenceLedger: ConfidenceLedgerEntry[];
  featureFeedback: FeatureFeedback[];

  // Knowledge library
  seenInsights: string[];
  dismissedInsights: string[];
  readArticles: string[];
  bookmarkedArticles: string[];
  lastInsightDate: string | null;

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
  generateNewMesocycle: (weeks?: number, sessionDurationMinutes?: number, periodizationStyle?: 'linear' | 'undulating' | 'block') => void;
  completeMesocycle: () => void;
  undoValidateBlock: (mesocycleId: string) => boolean;
  deleteMesocycle: (mesocycleId: string) => void;
  addToMesocycleQueue: (block: Omit<PlannedMesocycle, 'id' | 'createdAt'>) => void;
  updateMesocycleInQueue: (id: string, updates: Partial<Omit<PlannedMesocycle, 'id' | 'createdAt'>>) => void;
  removeFromMesocycleQueue: (id: string) => void;
  reorderMesocycleQueue: (fromIndex: number, toIndex: number) => void;
  advanceMesocycleQueue: () => void;
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
  addBonusExercise: (exercise: Exercise, sets: number, reps: number) => void;
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
  awardSmartRest: () => { awarded: boolean; points: number };
  ensureWeeklyChallenge: () => void;
  checkAndAwardBadges: () => void;

  // Wellness gamification actions
  awardWellnessXP: (domain: WellnessDomain, details?: {
    supplementCount?: number;
    stackSize?: number;
    mealsLogged?: number;
    macrosHit?: boolean;
  }) => { points: number; breakdown: { reason: string; points: number }[]; newMultiplier: number };
  getWellnessMultiplier: () => number;
  getTodayWellnessDomains: () => WellnessDomain[];

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
  addCycleLog: (log: Omit<CycleLog, 'id'>) => void;
  updateCycleLog: (id: string, updates: Partial<CycleLog>) => void;
  deleteCycleLog: (id: string) => void;

  // Grip strength actions
  addGripTest: (test: Omit<GripTest, 'id'>) => void;
  addGripExerciseLog: (log: Omit<GripExerciseLog, 'id'>) => void;
  deleteGripTest: (id: string) => void;
  deleteGripExerciseLog: (id: string) => void;

  // Injury actions
  addInjury: (injury: Omit<InjuryEntry, 'id'>) => void;
  resolveInjury: (id: string) => void;
  deleteInjury: (id: string) => void;

  // Illness actions
  logIllness: (illness: Omit<IllnessLog, 'id' | 'dailyCheckins' | 'status'>) => void;
  updateIllnessCheckin: (illnessId: string, checkin: IllnessDailyCheckin) => void;
  updateIllnessStatus: (illnessId: string, status: IllnessLog['status'], endDate?: string) => void;
  resolveIllness: (illnessId: string) => void;
  deleteIllness: (illnessId: string) => void;
  getActiveIllness: () => IllnessLog | null;

  // Workout skip actions
  skipWorkout: (skip: Omit<WorkoutSkip, 'id'>) => string;
  deleteSkip: (skipId: string) => void;

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
  setColorTheme: (theme: ColorTheme) => void;

  // Nutrition actions
  addMeal: (meal: Omit<MealEntry, 'id'>) => void;
  updateMeal: (id: string, updates: Partial<MealEntry>) => void;
  deleteMeal: (id: string) => void;
  setMacroTargets: (targets: MacroTargets) => void;
  setWaterGlasses: (date: string, glasses: number) => void;

  // Diet coaching actions
  startDietPhase: (phase: Omit<DietPhase, 'id'>) => void;
  endDietPhase: () => void;
  addWeeklyCheckIn: (checkIn: Omit<WeeklyCheckIn, 'id'>) => void;
  incrementPhaseWeek: () => void;
  deleteDietPhaseFromHistory: (id: string) => void;
  editDietPhaseInHistory: (id: string, updates: Partial<CompletedDietPhase>) => void;

  // Meal reminder actions
  setMealReminders: (settings: Partial<MealReminderSettings>) => void;

  // Body composition actions
  addBodyComposition: (entry: Omit<BodyCompositionEntry, 'id'>) => void;
  deleteBodyComposition: (id: string) => void;

  // Equipment profile actions
  setActiveEquipmentProfile: (profile: EquipmentProfileName) => void;
  setHomeGymEquipment: (equipment: EquipmentType[]) => void;
  getActiveEquipment: () => EquipmentType[];

  // Competition actions
  addCompetition: (event: Omit<CompetitionEvent, 'id'>) => void;
  deleteCompetition: (id: string) => void;

  // Weight Cut Plan actions
  createWeightCutPlan: (plan: Omit<WeightCutPlan, 'id' | 'createdAt'>) => string;
  updateWeightCutPlan: (id: string, updates: Partial<WeightCutPlan>) => void;
  deleteWeightCutPlan: (id: string) => void;
  addWeightCutDailyLog: (planId: string, log: WeightCutDailyLog) => void;

  // Combat Nutrition Profile actions
  setCombatNutritionProfile: (profile: CombatAthleteNutritionProfile) => void;
  updateCombatNutritionProfile: (updates: Partial<CombatAthleteNutritionProfile>) => void;

  // Fight Camp Plan actions
  createFightCampPlan: (plan: Omit<FightCampNutritionPlan, 'id' | 'createdAt'>) => string;
  updateFightCampPlan: (id: string, updates: Partial<FightCampNutritionPlan>) => void;
  deleteFightCampPlan: (id: string) => void;

  // Supplement actions
  setActiveSupplements: (supplements: SupplementRecommendation[]) => void;
  addActiveSupplement: (supplement: SupplementRecommendation) => void;
  removeActiveSupplement: (supplementId: string) => void;

  // Smart supplement tracking actions
  setSupplementStack: (stack: UserSupplement[]) => void;
  updateSupplementInStack: (supplementId: string, updates: Partial<UserSupplement>) => void;
  logSupplementIntake: (intake: Omit<SupplementIntake, 'id' | 'autoLoggedToMeals' | 'mealEntryId'>) => void;
  removeSupplementIntake: (intakeId: string) => void;

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

  // Subscription actions
  setSubscription: (sub: Subscription | null) => void;

  // Notification actions
  setNotificationPreferences: (prefs: Partial<NotificationPreferences>) => void;

  // Daily login bonus actions
  claimDailyLoginBonus: () => { points: number; day: number; isMysteryDay: boolean } | null;

  // Fighter's Mind actions
  addMentalCheckIn: (checkIn: Omit<MentalCheckIn, 'id'>) => void;
  deleteMentalCheckIn: (id: string) => void;
  addConfidenceEntry: (entry: Omit<ConfidenceLedgerEntry, 'id'>) => void;
  deleteConfidenceEntry: (id: string) => void;
  addFeatureFeedback: (feature: string, rating: 'up' | 'down') => void;

  // Knowledge library actions
  markInsightSeen: (id: string) => void;
  dismissInsight: (id: string) => void;
  markArticleRead: (id: string) => void;
  toggleBookmarkArticle: (id: string) => void;
  setLastInsightDate: (date: string) => void;

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
  weightUnit: 'kg',
  baselineLifts: {},
  trainingIdentity: 'combat',
  wearableUsage: undefined,
  wearableProvider: undefined,
};

const initialStreakShield: StreakShield = {
  available: 1,
  lastRefillDate: new Date().toISOString().split('T')[0],
  usedDates: [],
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
  badges: [],
  weeklyChallenge: null,
  streakShield: initialStreakShield,
  comebackCount: 0,
  totalTrainingSessions: 0,
  dualTrainingDays: 0,
  challengesCompleted: 0,
  lastActiveDate: null,
  smartRestDays: 0,
  lastSmartRestDate: null,
  wellnessStats: defaultWellnessStats,
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
      mesocycleQueue: [],
      activeWorkout: null,
      workoutLogs: [],
      gamificationStats: initialGamificationStats,
      bodyWeightLog: [],
      quickLogs: [],
      gripTests: [],
      gripExerciseLogs: [],
      injuryLog: [],
      illnessLogs: [],
      workoutSkips: [],
      cycleLogs: [],
      customExercises: [],
      sessionTemplates: [],
      hrSessions: [],
      trainingSessions: [],
      themeMode: 'dark' as ThemeMode,
      colorTheme: 'steel' as ColorTheme,
      meals: [],
      macroTargets: { calories: 2500, protein: 200, carbs: 280, fat: 80 },
      waterLog: {},
      activeDietPhase: null,
      dietPhaseHistory: [],
      weeklyCheckIns: [],
      mealReminders: {
        enabled: false,
        reminderTimes: { breakfast: '08:00', lunch: '12:30', dinner: '19:00' },
        enabledMeals: { breakfast: true, lunch: true, dinner: true },
      },
      bodyComposition: [],
      muscleEmphasis: null,
      activeEquipmentProfile: 'gym' as EquipmentProfileName,
      homeGymEquipment: DEFAULT_EQUIPMENT_PROFILES.find(p => p.name === 'home')?.equipment || ['barbell', 'dumbbell', 'bench', 'pull_up_bar', 'kettlebell', 'resistance_band', 'ab_wheel'] as EquipmentType[],
      competitions: [],
      weightCutPlans: [],
      combatNutritionProfile: null,
      fightCampPlans: [],
      activeSupplements: [],
      supplementStack: [],
      supplementIntakes: [],
      latestWhoopData: null,
      wearableHistory: [],
      whoopWorkouts: [],
      isOnline: true,
      lastSyncAt: null,
      lastCompletedWorkout: null,
      syncConflict: null,
      pendingRemoteData: null,
      subscription: null,
      notificationPreferences: {
        enabled: false,
        trainingReminders: true,
        streakAlerts: true,
        challengeUpdates: true,
        dailyLoginReminder: true,
        reminderTime: '09:00',
      },
      dailyLoginBonus: {
        lastClaimedDate: null,
        consecutiveDays: 0,
        totalClaimed: 0,
      },
      mentalCheckIns: [],
      confidenceLedger: [],
      featureFeedback: [],
      seenInsights: [],
      dismissedInsights: [],
      readArticles: [],
      bookmarkedArticles: [],
      lastInsightDate: null,
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
              step: 1,
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
              combatSports: user.combatSports,
              weightUnit: user.weightUnit,
            },
          });
        } else {
          set({ isOnboarded: false });
        }
      },

      completeOnboarding: (authUserId) => {
        const { onboardingData, user: existingUser, gamificationStats: existingGam, baselineLifts: existingBaseline } = get();
        const isReconfigure = !!(existingUser && existingGam && existingGam.totalWorkouts > 0);

        // Preserve existing user ID on reconfigure, otherwise create new
        const userId = isReconfigure ? existingUser.id : (authUserId || uuidv4());

        const user: UserProfile = {
          ...(isReconfigure ? existingUser : {}),
          id: userId,
          email: existingUser?.email || '', // Will be populated from session
          name: onboardingData.name,
          age: onboardingData.age || 25,
          bodyWeightKg: onboardingData.bodyWeightKg,
          heightCm: onboardingData.heightCm,
          sex: onboardingData.sex,
          disclaimerAcceptedAt: onboardingData.disclaimerAccepted ? new Date() : existingUser?.disclaimerAcceptedAt,
          experienceLevel: onboardingData.experienceLevel,
          equipment: onboardingData.equipment,
          availableEquipment: onboardingData.availableEquipment || DEFAULT_EQUIPMENT_PROFILES[0].equipment,
          goalFocus: onboardingData.goalFocus,
          sessionsPerWeek: onboardingData.sessionsPerWeek,
          sessionDurationMinutes: onboardingData.sessionDurationMinutes || 60,
          weightUnit: onboardingData.weightUnit || 'lbs',
          trainingIdentity: onboardingData.trainingIdentity || 'combat',
          combatSport: onboardingData.combatSport,
          combatSports: onboardingData.combatSports,
          trainingDays: onboardingData.trainingDays,
          combatTrainingDays: onboardingData.combatTrainingDays,
          wearableUsage: onboardingData.wearableUsage,
          wearableProvider: onboardingData.wearableProvider,
          createdAt: existingUser?.createdAt || new Date(),
          updatedAt: new Date()
        };

        // On reconfigure, keep existing baseline lifts if user didn't change them
        const bw = onboardingData.bodyWeightKg || 70;
        const baselineLifts: BaselineLifts = {
          id: existingBaseline?.id || uuidv4(),
          userId: user.id,
          squat: onboardingData.baselineLifts.squat || existingBaseline?.squat || Math.round(bw * 0.5),
          deadlift: onboardingData.baselineLifts.deadlift || existingBaseline?.deadlift || Math.round(bw * 0.6),
          benchPress: onboardingData.baselineLifts.benchPress || existingBaseline?.benchPress || Math.round(bw * 0.4),
          overheadPress: onboardingData.baselineLifts.overheadPress || existingBaseline?.overheadPress || Math.round(bw * 0.3),
          barbellRow: onboardingData.baselineLifts.barbellRow || existingBaseline?.barbellRow || Math.round(bw * 0.4),
          pullUp: onboardingData.baselineLifts.pullUp || existingBaseline?.pullUp || null,
          createdAt: existingBaseline?.createdAt || new Date(),
          updatedAt: new Date()
        };

        // On reconfigure, preserve existing gamification (XP, badges, streaks, etc.)
        const gamificationStats: GamificationStats = isReconfigure
          ? { ...existingGam, userId: user.id }
          : { ...initialGamificationStats, id: uuidv4(), userId: user.id };

        set({
          user,
          baselineLifts,
          gamificationStats,
          isOnboarded: true,
          isAuthenticated: true
        });

        // Generate first mesocycle with user's preferred duration and cycle length
        get().generateNewMesocycle(onboardingData.mesoCycleWeeks || 5, onboardingData.sessionDurationMinutes || 60, onboardingData.periodizationStyle);
      },

      setBaselineLifts: (lifts) => set({ baselineLifts: lifts }),

      // Muscle emphasis actions
      setMuscleEmphasis: (config) => set({ muscleEmphasis: config }),

      // Equipment profile actions
      setActiveEquipmentProfile: (profile) => {
        set({ activeEquipmentProfile: profile });
        // Sync user.equipment tier AND user.availableEquipment from profile
        const { user, homeGymEquipment } = get();
        if (user) {
          const equipmentTier: Equipment =
            profile === 'gym' ? 'full_gym' :
            profile === 'home' ? 'home_gym' : 'minimal';
          // For home profile, use user's custom equipment list
          const profileEquipment = profile === 'home'
            ? homeGymEquipment
            : DEFAULT_EQUIPMENT_PROFILES.find(p => p.name === profile)?.equipment || [];
          set({
            user: {
              ...user,
              equipment: equipmentTier,
              availableEquipment: profileEquipment,
              updatedAt: new Date(),
            }
          });
        }
      },
      setHomeGymEquipment: (equipment) => {
        set({ homeGymEquipment: equipment });
        // If currently on home profile, also sync user.availableEquipment
        const { activeEquipmentProfile, user } = get();
        if (activeEquipmentProfile === 'home' && user) {
          set({ user: { ...user, availableEquipment: equipment, updatedAt: new Date() } });
        }
      },
      getActiveEquipment: () => {
        const { user, activeEquipmentProfile, homeGymEquipment } = get();
        if (activeEquipmentProfile === 'home' && homeGymEquipment.length > 0) return homeGymEquipment;
        if (user?.availableEquipment?.length) return user.availableEquipment;
        const preset = DEFAULT_EQUIPMENT_PROFILES.find(p => p.name === activeEquipmentProfile);
        return preset?.equipment || DEFAULT_EQUIPMENT_PROFILES[0].equipment;
      },

      // Competition actions
      addCompetition: (event) => {
        const { competitions, user, bodyWeightLog } = get();
        const compId = uuidv4();
        const newComp = { ...event, id: compId };
        set({ competitions: [...competitions, newComp] });

        // Auto-create fight camp plan for combat athletes
        if (user?.trainingIdentity === 'combat' && newComp.isActive) {
          const daysOut = Math.ceil((new Date(newComp.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (daysOut > 0 && daysOut <= 70) {
            const latestW = bodyWeightLog.length > 0 ? bodyWeightLog[bodyWeightLog.length - 1] : null;
            const bwKg = latestW
              ? (latestW.unit === 'lbs' ? latestW.weight / 2.205 : latestW.weight)
              : (user.bodyWeightKg || 80);
            const sex = (user.sex || 'male') as 'male' | 'female';
            const phase = detectFightCampPhase(daysOut, false, newComp.type === 'bjj_tournament' || newComp.type === 'wrestling_meet');
            const timeline = generateFightCampTimeline(newComp, bwKg, sex);
            get().createFightCampPlan({
              competitionId: compId,
              currentPhase: phase,
              phases: timeline,
              isActive: true,
            });
          }
        }
      },

      deleteCompetition: (id) => {
        const { competitions } = get();
        set({ competitions: competitions.filter(c => c.id !== id) });
      },

      // ── Weight Cut Plan actions ───────────────────────────────────────
      createWeightCutPlan: (plan) => {
        const id = uuidv4();
        const newPlan: WeightCutPlan = {
          ...plan,
          id,
          createdAt: new Date().toISOString(),
        };
        set({ weightCutPlans: [...get().weightCutPlans, newPlan] });
        return id;
      },

      updateWeightCutPlan: (id, updates) => {
        set({
          weightCutPlans: get().weightCutPlans.map(p =>
            p.id === id ? { ...p, ...updates } : p
          ),
        });
      },

      deleteWeightCutPlan: (id) => {
        set({ weightCutPlans: get().weightCutPlans.filter(p => p.id !== id) });
      },

      addWeightCutDailyLog: (planId, log) => {
        set({
          weightCutPlans: get().weightCutPlans.map(p =>
            p.id === planId
              ? { ...p, dailyLogs: [...p.dailyLogs, log] }
              : p
          ),
        });
      },

      // ── Combat Nutrition Profile actions ──────────────────────────────
      setCombatNutritionProfile: (profile) => {
        set({ combatNutritionProfile: profile });
      },

      updateCombatNutritionProfile: (updates) => {
        const current = get().combatNutritionProfile;
        set({
          combatNutritionProfile: current
            ? { ...current, ...updates }
            : updates as CombatAthleteNutritionProfile,
        });
      },

      // ── Fight Camp Plan actions ───────────────────────────────────────
      createFightCampPlan: (plan) => {
        const id = uuidv4();
        const newPlan: FightCampNutritionPlan = {
          ...plan,
          id,
          createdAt: new Date().toISOString(),
        };
        set({ fightCampPlans: [...get().fightCampPlans, newPlan] });
        return id;
      },

      updateFightCampPlan: (id, updates) => {
        set({
          fightCampPlans: get().fightCampPlans.map(p =>
            p.id === id ? { ...p, ...updates } : p
          ),
        });
      },

      deleteFightCampPlan: (id) => {
        set({ fightCampPlans: get().fightCampPlans.filter(p => p.id !== id) });
      },

      // ── Supplement actions ────────────────────────────────────────────
      setActiveSupplements: (supplements) => {
        set({ activeSupplements: supplements });
      },

      addActiveSupplement: (supplement) => {
        const existing = get().activeSupplements;
        if (!existing.some(s => s.id === supplement.id)) {
          set({ activeSupplements: [...existing, supplement] });
        }
      },

      removeActiveSupplement: (supplementId) => {
        set({
          activeSupplements: get().activeSupplements.filter(s => s.id !== supplementId),
        });
      },

      // ── Smart supplement tracking actions ──────────────────────────────
      setSupplementStack: (stack) => {
        set({ supplementStack: stack });
      },

      updateSupplementInStack: (supplementId, updates) => {
        const { supplementStack } = get();
        set({
          supplementStack: supplementStack.map(s =>
            s.supplementId === supplementId ? { ...s, ...updates } : s
          ),
        });
      },

      logSupplementIntake: (intake) => {
        const id = uuidv4();
        let mealEntryId: string | undefined;
        let autoLoggedToMeals = false;

        // Auto-add macros to nutrition tracker if the supplement has meaningful macros
        if (intake.macrosPerServing && (intake.macrosPerServing.protein > 0 || intake.macrosPerServing.calories > 0)) {
          const macros = intake.macrosPerServing;
          const servings = intake.servings;
          mealEntryId = uuidv4();
          const mealEntry = {
            id: mealEntryId,
            date: new Date(`${intake.date}T${intake.time}`),
            mealType: 'snack' as const,
            name: `${intake.name} (supplement)`,
            calories: Math.round(macros.calories * servings),
            protein: Math.round(macros.protein * servings * 10) / 10,
            carbs: Math.round(macros.carbs * servings * 10) / 10,
            fat: Math.round(macros.fat * servings * 10) / 10,
            portion: `${servings} serving${servings !== 1 ? 's' : ''}`,
            notes: 'Auto-logged from supplement tracker',
          };
          const { meals } = get();
          set({ meals: [...meals, mealEntry] });
          autoLoggedToMeals = true;
        }

        set({
          supplementIntakes: [...get().supplementIntakes, {
            ...intake,
            id,
            autoLoggedToMeals,
            mealEntryId,
          }],
        });

        // Award wellness XP for supplement logging
        const today = intake.date;
        const todayIntakes = get().supplementIntakes.filter(i => i.date === today);
        const stackSize = get().supplementStack.length;
        get().awardWellnessXP('supplements', {
          supplementCount: todayIntakes.length,
          stackSize,
        });
      },

      removeSupplementIntake: (intakeId) => {
        const { supplementIntakes, meals } = get();
        const intake = supplementIntakes.find(i => i.id === intakeId);

        // Also remove the auto-logged meal entry if it exists
        const updatedMeals = intake?.mealEntryId
          ? meals.filter(m => m.id !== intake.mealEntryId)
          : meals;

        set({
          supplementIntakes: supplementIntakes.filter(i => i.id !== intakeId),
          meals: updatedMeals,
        });
      },

      // Whoop actions
      setLatestWhoopData: (data) => {
        set({ latestWhoopData: data });

        // Auto-sync wearable sleep → QuickLog (once per day)
        if (data?.sleepHours && data.sleepHours > 0) {
          const today = new Date().toISOString().split('T')[0];
          const { quickLogs } = get();
          const alreadyLogged = quickLogs.some(
            l => l.type === 'sleep' && new Date(l.timestamp).toISOString().split('T')[0] === today
          );
          if (!alreadyLogged) {
            const quality = data.sleepScore ? Math.round(data.sleepScore / 20) : undefined; // 0-100 → 1-5
            set({
              quickLogs: [...get().quickLogs, {
                id: uuidv4(),
                type: 'sleep' as const,
                value: Math.round(data.sleepHours * 10) / 10,
                unit: 'hours',
                timestamp: new Date(),
                notes: quality ? `Quality: ${quality}/5 (wearable)` : 'From wearable',
              }],
            });
          }
        }
      },
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
      generateNewMesocycle: (weeks = 5, sessionDurationMinutes, periodizationStyle?: 'linear' | 'undulating' | 'block') => {
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
          periodizationType: periodizationStyle,
        });

        set({ currentMesocycle: newMesocycle });
      },

      completeMesocycle: () => {
        const { currentMesocycle, mesocycleHistory, gamificationStats, mesocycleQueue } = get();
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

        // If there's a queued mesocycle, use it; otherwise generate default
        if (mesocycleQueue.length > 0) {
          get().advanceMesocycleQueue();
        } else {
          get().generateNewMesocycle();
        }
        get().checkAndAwardBadges();
      },

      undoValidateBlock: (mesocycleId) => {
        const { mesocycleHistory, currentMesocycle, gamificationStats } = get();
        const restored = mesocycleHistory.find(m => m.id === mesocycleId);
        if (!restored) return false;

        // Remove from history, restore as current, delete the auto-generated new mesocycle
        const newHistory = mesocycleHistory.filter(m => m.id !== mesocycleId);

        // If a new mesocycle was auto-generated after validation, remove it
        // The current one was generated right after — delete it
        set({
          mesocycleHistory: newHistory,
          currentMesocycle: { ...restored, status: 'active' as const },
          gamificationStats: {
            ...gamificationStats,
            totalPoints: Math.max(0, gamificationStats.totalPoints - 200),
          },
        });
        return true;
      },

      deleteMesocycle: (mesocycleId) => {
        const { mesocycleHistory, workoutLogs } = get();
        set({
          mesocycleHistory: mesocycleHistory.filter(m => m.id !== mesocycleId),
          workoutLogs: workoutLogs.filter(l => l.mesocycleId !== mesocycleId),
        });
      },

      addToMesocycleQueue: (block) => {
        const { mesocycleQueue } = get();
        set({ mesocycleQueue: [...mesocycleQueue, { ...block, id: uuidv4(), createdAt: new Date() }] });
      },

      updateMesocycleInQueue: (id, updates) => {
        const { mesocycleQueue } = get();
        set({ mesocycleQueue: mesocycleQueue.map(b => b.id === id ? { ...b, ...updates } : b) });
      },

      removeFromMesocycleQueue: (id) => {
        const { mesocycleQueue } = get();
        set({ mesocycleQueue: mesocycleQueue.filter(b => b.id !== id) });
      },

      reorderMesocycleQueue: (fromIndex, toIndex) => {
        const { mesocycleQueue } = get();
        const updated = [...mesocycleQueue];
        const [moved] = updated.splice(fromIndex, 1);
        updated.splice(toIndex, 0, moved);
        set({ mesocycleQueue: updated });
      },

      advanceMesocycleQueue: () => {
        const { mesocycleQueue, user } = get();
        if (mesocycleQueue.length === 0 || !user) return;
        const next = mesocycleQueue[0];
        // Temporarily set user's goalFocus and sessionsPerWeek to the queued mesocycle's values
        const prevGoal = user.goalFocus;
        const prevSessions = user.sessionsPerWeek;
        const overrides: Partial<typeof user> = { goalFocus: next.focus };
        if (next.sessionsPerWeek) overrides.sessionsPerWeek = next.sessionsPerWeek;
        set({ user: { ...user, ...overrides } });
        get().generateNewMesocycle(next.weeks, next.sessionDurationMinutes, next.periodization);
        // Restore original user settings
        const updatedUser = get().user;
        if (updatedUser) set({ user: { ...updatedUser, goalFocus: prevGoal, sessionsPerWeek: prevSessions } });
        // Remove from queue
        set({ mesocycleQueue: mesocycleQueue.slice(1) });
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
        const { workoutLogs, user, injuryLog } = get();

        // Autoregulate: adjust session based on recent feedback (intermediate+ only)
        let activeSession = session;
        if (user && user.experienceLevel !== 'beginner' && workoutLogs.length >= 2) {
          const recent = workoutLogs.slice(-3); // last 3 workouts
          const { session: adjusted } = autoregulateSession(session, recent);
          activeSession = adjusted;
        }

        // Injury-aware adaptation: reduce volume/intensity for injured areas
        const injuryAdaptations = getActiveInjuryAdaptations(injuryLog);
        if (injuryAdaptations.classifications.length > 0) {
          const volLimit = injuryAdaptations.overallVolumeLimit / 100;
          const intLimit = injuryAdaptations.overallIntensityLimit / 100;
          activeSession = {
            ...activeSession,
            exercises: activeSession.exercises.map(ex => {
              // Check if this exercise should be avoided entirely
              const shouldAvoid = injuryAdaptations.allAvoidExercises.some(
                avoidId => ex.exerciseId.includes(avoidId)
              );
              if (shouldAvoid) {
                // Don't remove — just reduce to minimum so user sees it with a note
                return {
                  ...ex,
                  sets: Math.max(1, Math.round(ex.sets * volLimit)),
                  prescription: {
                    ...ex.prescription,
                    rpe: Math.min(ex.prescription.rpe, +(ex.prescription.rpe * intLimit).toFixed(1)),
                  },
                  notes: (ex.notes ? ex.notes + ' | ' : '') + 'Caution: active injury — consider swapping or skipping',
                };
              }
              return ex;
            }),
          };
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

      addBonusExercise: (exercise, sets, reps) => {
        const { activeWorkout } = get();
        if (!activeWorkout) return;

        const prescription = {
          exerciseId: exercise.id,
          exercise,
          sets,
          prescription: {
            targetReps: reps,
            minReps: Math.max(1, reps - 2),
            maxReps: reps + 2,
            rpe: 7,
            restSeconds: 90,
          },
        };

        const newLog: ExerciseLog = {
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          sets: Array.from({ length: sets }, (_, i) => ({
            setNumber: i + 1,
            weight: 0,
            reps: 0,
            rpe: 0,
            completed: false,
          })),
          personalRecord: false,
        };

        set({
          activeWorkout: {
            ...activeWorkout,
            session: {
              ...activeWorkout.session,
              exercises: [...activeWorkout.session.exercises, prescription],
            },
            exerciseLogs: [...activeWorkout.exerciseLogs, newLog],
          },
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
        const { activeWorkout, workoutLogs, homeGymEquipment } = get();
        if (!activeWorkout) return;

        // For home profile use custom equipment, otherwise use preset
        const profileEquipment = profile === 'home'
          ? homeGymEquipment
          : (DEFAULT_EQUIPMENT_PROFILES.find(p => p.name === profile)?.equipment || []);
        if (profileEquipment.length === 0) return;

        // Update profile state + sync user
        const equipmentTier: Equipment =
          profile === 'gym' ? 'full_gym' :
          profile === 'home' ? 'home_gym' : 'minimal';
        set({ activeEquipmentProfile: profile });
        const { user } = get();
        if (user) {
          set({ user: { ...user, equipment: equipmentTier, availableEquipment: profileEquipment, updatedAt: new Date() } });
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

        // Universal streak — counts lifting, combat, AND mobility
        const { quickLogs } = get();
        const allLogs = [...workoutLogs, workoutLog]; // include the workout we just completed
        let newStreak = calculateStreak(allLogs, trainingSessions, quickLogs);
        const todayStr = new Date().toISOString().split('T')[0];
        const fmtDate = (d: Date) => new Date(d).toISOString().split('T')[0];

        // Detect comeback (7+ days since last activity)
        const isComeback = detectComeback(gamificationStats.lastActiveDate || null);
        const newComebackCount = isComeback
          ? (gamificationStats.comebackCount || 0) + 1
          : (gamificationStats.comebackCount || 0);

        // Streak shield: if streak would reset (gap > 1 day) and shield available, preserve streak
        let shieldUsed = false;
        if (newStreak === 1 && gamificationStats.currentStreak > 1 && (gamificationStats.streakShield?.available || 0) > 0) {
          // Would have reset — use shield to save the streak
          newStreak = gamificationStats.currentStreak + 1;
          shieldUsed = true;
        }

        // Refill streak shield weekly
        let updatedShield = gamificationStats.streakShield || initialStreakShield;
        if (shouldRefillShield(updatedShield.lastRefillDate)) {
          updatedShield = { ...updatedShield, available: 1, lastRefillDate: new Date().toISOString().split('T')[0] };
        }
        if (shieldUsed) {
          updatedShield = {
            ...updatedShield,
            available: updatedShield.available - 1,
            usedDates: [...updatedShield.usedDates, todayStr],
          };
        }

        // Check if today is also a training session day (dual training)
        const hasTrainingToday = trainingSessions.some(s => fmtDate(new Date(s.date)) === todayStr);
        const newDualDays = hasTrainingToday
          ? (gamificationStats.dualTrainingDays || 0) + 1
          : (gamificationStats.dualTrainingDays || 0);

        // Calculate points (with comeback bonus)
        const { points: rawPoints, breakdown } = calculateWorkoutPoints(
          workoutLog,
          hadPR,
          newStreak,
          isComeback
        );

        // Apply wellness multiplier to training XP
        const wellnessMultiplier = get().getWellnessMultiplier();
        const points = wellnessMultiplier > 1.0
          ? Math.round(rawPoints * wellnessMultiplier)
          : rawPoints;
        if (wellnessMultiplier > 1.0) {
          breakdown.push({ reason: `Wellness ${wellnessMultiplier.toFixed(1)}x multiplier`, points: points - rawPoints });
        }

        // Update stats
        const newTotalWorkouts = gamificationStats.totalWorkouts + 1;
        const newTotalVolume = gamificationStats.totalVolume + totalVolume;
        const newTotalPoints = gamificationStats.totalPoints + points;
        const newPRs = gamificationStats.personalRecords + (hadPR ? 1 : 0);

        // Update weekly challenge progress
        let weeklyChallenge = gamificationStats.weeklyChallenge;
        if (!weeklyChallenge || !isCurrentWeek(weeklyChallenge)) {
          // Compute recent 4-week averages for realistic challenge targets
          const fourWeeksAgo = new Date();
          fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
          const recentLogs = workoutLogs.filter(l => new Date(l.date) >= fourWeeksAgo);
          const recentSessions = (get().trainingSessions || []).filter(s => new Date(s.date) >= fourWeeksAgo);
          const weeks = Math.max(1, 4);
          const recentWeeklyAvg = {
            workouts: Math.round((recentLogs.length / weeks) * 10) / 10,
            volume: Math.round(recentLogs.reduce((s, l) => s + l.totalVolume, 0) / weeks),
            prs: Math.round((recentLogs.reduce((s, l) => s + l.exercises.filter(e => e.personalRecord).length, 0) / weeks) * 10) / 10,
            sessions: Math.round((recentSessions.length / weeks) * 10) / 10,
            dualDays: Math.round(((gamificationStats.dualTrainingDays || 0) / Math.max(1, gamificationStats.totalWorkouts || 1)) * recentLogs.length / weeks * 10) / 10,
          };
          weeklyChallenge = generateWeeklyChallenge(user.trainingIdentity, gamificationStats, recentWeeklyAvg, user.sessionsPerWeek || 3);
        }
        // Update progress
        weeklyChallenge = {
          ...weeklyChallenge,
          goals: weeklyChallenge.goals.map(g => {
            if (g.completed) return g;
            if (g.type === 'workouts') {
              const newCurrent = g.current + 1;
              return { ...g, current: newCurrent, completed: newCurrent >= g.target };
            }
            if (g.type === 'volume') {
              const newCurrent = g.current + totalVolume;
              return { ...g, current: newCurrent, completed: newCurrent >= g.target };
            }
            if (g.type === 'prs' && hadPR) {
              const newCurrent = g.current + 1;
              return { ...g, current: newCurrent, completed: newCurrent >= g.target };
            }
            if (g.type === 'dual_days' && hasTrainingToday) {
              const newCurrent = g.current + 1;
              return { ...g, current: newCurrent, completed: newCurrent >= g.target };
            }
            return g;
          }),
        };

        // Award XP for completed challenge goals
        let challengeXP = 0;
        let newChallengesCompleted = gamificationStats.challengesCompleted || 0;
        weeklyChallenge.goals.forEach(g => {
          // Check if this goal was JUST completed this workout
          const prevGoal = gamificationStats.weeklyChallenge?.goals.find(pg => pg.id === g.id);
          if (g.completed && prevGoal && !prevGoal.completed) {
            challengeXP += g.xpReward;
            newChallengesCompleted++;
          }
        });
        // All 3 completed bonus
        const allGoalsDone = weeklyChallenge.goals.every(g => g.completed);
        if (allGoalsDone && !weeklyChallenge.allCompleteBonusClaimed) {
          challengeXP += weeklyChallenge.allCompleteBonus;
          weeklyChallenge = { ...weeklyChallenge, allCompleteBonusClaimed: true };
        }

        const finalTotalPoints = newTotalPoints + challengeXP;

        // ── Fighter's Mind: auto-generate mental check-in from post-feedback ──
        const mentalAutoEntries: MentalCheckIn[] = [];
        if (feedback.postFeedback) {
          const pf = feedback.postFeedback;
          // Map existing feedback scales to mental dimensions:
          // mood (1-5) → composure, energy (1-10) → energy (scaled to 1-5)
          const mappedEnergy = Math.max(1, Math.min(5, Math.round(pf.energy / 2)));
          const mappedComposure = pf.mood || 3;
          // performance → confidence: better=5, as_expected=3, worse=2
          const mappedConfidence = pf.overallPerformance === 'better_than_expected' ? 5
            : pf.overallPerformance === 'as_expected' ? 3 : 2;
          // Focus inferred from RPE accuracy — close to moderate = focused, extreme = scattered
          const rpe = pf.overallRPE || 7;
          const mappedFocus = rpe >= 6 && rpe <= 8 ? 4 : rpe >= 5 && rpe <= 9 ? 3 : 2;

          mentalAutoEntries.push({
            id: crypto.randomUUID(),
            date: todayStr,
            timestamp: new Date().toISOString(),
            context: 'post_training',
            energy: mappedEnergy,
            focus: mappedFocus,
            confidence: mappedConfidence,
            composure: mappedComposure,
            selfTalk: pf.overallPerformance === 'better_than_expected' ? 'positive'
              : pf.overallPerformance === 'worse_than_expected' ? 'negative' : 'neutral',
            linkedWorkoutId: workoutLog.id,
            word: pf.notes ? undefined : undefined, // Only from explicit input
          });
        }

        // ── Confidence Ledger: auto-add PR entries ──
        const autoConfidenceEntries: ConfidenceLedgerEntry[] = [];
        if (hadPR) {
          const prExercises = activeWorkout.exerciseLogs
            .filter(e => e.personalRecord)
            .map(e => e.exerciseName);
          autoConfidenceEntries.push({
            id: crypto.randomUUID(),
            date: todayStr,
            type: 'pr',
            title: prExercises.length === 1
              ? `PR on ${prExercises[0]}`
              : `${prExercises.length} PRs: ${prExercises.slice(0, 3).join(', ')}`,
            impact: Math.min(5, 3 + prExercises.length), // More PRs = higher impact
            autoGenerated: true,
            sourceId: workoutLog.id,
          });
        }
        // Comeback = resilience evidence
        if (isComeback) {
          autoConfidenceEntries.push({
            id: crypto.randomUUID(),
            date: todayStr,
            type: 'comeback',
            title: 'Came back after time away',
            detail: `Returned to training after ${gamificationStats.currentStreak === 0 ? '7+' : '7+'} days — you always come back`,
            impact: 4,
            autoGenerated: true,
            sourceId: workoutLog.id,
          });
        }

        set({
          activeWorkout: null,
          workoutLogs: [...workoutLogs, workoutLog],
          mentalCheckIns: [...get().mentalCheckIns, ...mentalAutoEntries],
          confidenceLedger: [...get().confidenceLedger, ...autoConfidenceEntries],
          lastCompletedWorkout: {
            log: workoutLog,
            points: points + challengeXP,
            hadPR,
            newStreak: newStreak,
            newBadges: [], // Will be populated by checkAndAwardBadges
            wellnessMultiplier: wellnessMultiplier > 1.0 ? wellnessMultiplier : undefined,
          },
          gamificationStats: {
            ...gamificationStats,
            totalPoints: finalTotalPoints,
            level: calculateLevel(finalTotalPoints),
            currentStreak: newStreak,
            longestStreak: Math.max(gamificationStats.longestStreak, newStreak),
            totalWorkouts: newTotalWorkouts,
            totalVolume: newTotalVolume,
            personalRecords: newPRs,
            weeklyChallenge,
            streakShield: updatedShield,
            comebackCount: newComebackCount,
            dualTrainingDays: newDualDays,
            challengesCompleted: newChallengesCompleted,
            lastActiveDate: todayStr,
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

        // Recalculate training sessions count and dual training days
        const totalTrainingSessions = trainingSessions.length;
        const workoutDateSet = new Set(workoutLogs.map(log => fmtDate(new Date(log.date))));
        const dualTrainingDays = trainingSessions.filter(s =>
          workoutDateSet.has(fmtDate(new Date(s.date)))
        ).length;

        set({
          gamificationStats: {
            ...gamificationStats,
            totalWorkouts,
            totalVolume,
            personalRecords,
            currentStreak,
            longestStreak,
            totalTrainingSessions,
            dualTrainingDays,
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

      awardSmartRest: () => {
        const { gamificationStats } = get();
        const todayStr = new Date().toISOString().split('T')[0];

        // Already awarded today
        if (gamificationStats.lastSmartRestDate === todayStr) {
          return { awarded: false, points: 0 };
        }

        const pts = pointRewards.smartRest;
        const newTotal = gamificationStats.totalPoints + pts;

        set({
          gamificationStats: {
            ...gamificationStats,
            totalPoints: newTotal,
            level: calculateLevel(newTotal),
            smartRestDays: (gamificationStats.smartRestDays || 0) + 1,
            lastSmartRestDate: todayStr,
          }
        });

        return { awarded: true, points: pts };
      },

      checkAndAwardBadges: () => {
        const { gamificationStats, workoutLogs, mesocycleHistory, lastCompletedWorkout, trainingSessions } = get();

        const metrics = {
          personalRecords: gamificationStats.personalRecords,
          totalWorkouts: gamificationStats.totalWorkouts,
          currentStreak: gamificationStats.currentStreak,
          totalVolume: gamificationStats.totalVolume,
          mesocyclesCompleted: mesocycleHistory.length,
          gripExercises: 0,
          turkishGetups: 0,
          earlyWorkouts: 0,
          lateWorkouts: 0,
          perfectWeeks: 0,
          oneRMIncreases: {},
          totalTrainingSessions: gamificationStats.totalTrainingSessions || trainingSessions.length,
          dualTrainingDays: gamificationStats.dualTrainingDays || 0,
          comebackCount: gamificationStats.comebackCount || 0,
          challengesCompleted: gamificationStats.challengesCompleted || 0,
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

      ensureWeeklyChallenge: () => {
        const { gamificationStats, user, workoutLogs, trainingSessions } = get();
        const planned = user?.sessionsPerWeek || 3;

        // Regenerate if: no challenge, wrong week, OR targets exceed plan (stale from old code)
        const existing = gamificationStats.weeklyChallenge;
        const needsRegen = !existing || !isCurrentWeek(existing) ||
          existing.goals.some(g =>
            (g.type === 'workouts' && g.target > planned) ||
            (g.type === 'prs' && g.target > 2)
          );
        if (needsRegen) {
          const fourWeeksAgo = new Date();
          fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
          const recentLogs = workoutLogs.filter(l => new Date(l.date) >= fourWeeksAgo);
          const recentSessions = (trainingSessions || []).filter(s => new Date(s.date) >= fourWeeksAgo);
          const weeks = Math.max(1, 4);
          const recentWeeklyAvg = {
            workouts: Math.round((recentLogs.length / weeks) * 10) / 10,
            volume: Math.round(recentLogs.reduce((s, l) => s + l.totalVolume, 0) / weeks),
            prs: Math.round((recentLogs.reduce((s, l) => s + l.exercises.filter(e => e.personalRecord).length, 0) / weeks) * 10) / 10,
            sessions: Math.round((recentSessions.length / weeks) * 10) / 10,
            dualDays: 0,
          };
          const challenge = generateWeeklyChallenge(user?.trainingIdentity, gamificationStats, recentWeeklyAvg, user?.sessionsPerWeek || 3);
          set({
            gamificationStats: {
              ...gamificationStats,
              weeklyChallenge: challenge,
            }
          });
        }
        // Also refill streak shield if needed
        const shield = gamificationStats.streakShield || initialStreakShield;
        if (shouldRefillShield(shield.lastRefillDate)) {
          set({
            gamificationStats: {
              ...get().gamificationStats,
              streakShield: { ...shield, available: 1, lastRefillDate: new Date().toISOString().split('T')[0] },
            }
          });
        }
      },

      // ═══ Wellness Gamification Actions ═══

      awardWellnessXP: (domain, details) => {
        const { gamificationStats } = get();
        const today = new Date().toISOString().split('T')[0];
        const ws = gamificationStats.wellnessStats || defaultWellnessStats;
        const todayCompleted = { ...ws.todayCompleted };
        const existingDomains = todayCompleted[today] || [];

        // Skip if this domain was already awarded today
        if (existingDomains.includes(domain)) {
          const currentMultiplier = calculateWellnessMultiplier(existingDomains);
          return { points: 0, breakdown: [], newMultiplier: currentMultiplier };
        }

        // Calculate XP for this domain
        const { points, breakdown } = calculateWellnessXP(domain, details);

        // Update today's completed domains
        const updatedDomains: WellnessDomain[] = [...existingDomains, domain];
        todayCompleted[today] = updatedDomains;

        // Calculate new multiplier
        const newMultiplier = calculateWellnessMultiplier(updatedDomains);

        // Full wellness day bonus (4+ domains, award once)
        let fullDayBonus = 0;
        if (updatedDomains.length >= 4 && existingDomains.length < 4) {
          fullDayBonus = pointRewards.fullWellnessDay;
          breakdown.push({ reason: 'Full wellness day!', points: fullDayBonus });
        }

        // Wellness streak bonus
        const streakBonus = Math.min(
          (ws.streaks.overall || 0) * pointRewards.wellnessStreakBonus,
          50
        );
        if (streakBonus > 0 && updatedDomains.length >= 4 && existingDomains.length < 4) {
          breakdown.push({ reason: `${ws.streaks.overall} day wellness streak`, points: streakBonus });
        }

        const totalPoints = points + fullDayBonus + (updatedDomains.length >= 4 && existingDomains.length < 4 ? streakBonus : 0);

        // Update wellness streaks
        const newStreaks = updateWellnessStreaks(ws.streaks, updatedDomains, ws.lastWellnessDate);

        // Build wellness day record
        const existingDayIndex = ws.wellnessDays.findIndex(d => d.date === today);
        const wellnessDay = {
          date: today,
          domains: updatedDomains,
          multiplier: newMultiplier,
          xpEarned: (existingDayIndex >= 0 ? ws.wellnessDays[existingDayIndex].xpEarned : 0) + totalPoints,
        };
        const updatedDays = existingDayIndex >= 0
          ? ws.wellnessDays.map((d, i) => i === existingDayIndex ? wellnessDay : d)
          : [...ws.wellnessDays.slice(-90), wellnessDay]; // Keep last 90 days

        const newWellnessStats: WellnessStats = {
          streaks: newStreaks,
          totalWellnessXP: ws.totalWellnessXP + totalPoints,
          wellnessDays: updatedDays,
          lastWellnessDate: today,
          currentMultiplier: newMultiplier,
          todayCompleted,
        };

        const newTotalPoints = gamificationStats.totalPoints + totalPoints;

        set({
          gamificationStats: {
            ...gamificationStats,
            totalPoints: newTotalPoints,
            level: calculateLevel(newTotalPoints),
            wellnessStats: newWellnessStats,
          },
        });

        // Check wellness badges
        const beastModeDays = (ws.wellnessDays || []).filter(d => d.multiplier >= 2.0).length
          + (newMultiplier >= 2.0 && existingDayIndex < 0 ? 1 : 0);

        const wellnessBadges = checkWellnessBadges(get().gamificationStats, {
          wellnessDaysCount: updatedDays.filter(d => d.domains.length >= 4).length,
          wellnessStreak: newStreaks.overall,
          supplementStreak: newStreaks.supplements,
          nutritionStreak: newStreaks.nutrition,
          sleepStreak: newStreaks.sleep,
          mobilityStreak: newStreaks.mobility,
          waterStreak: newStreaks.water,
          mentalStreak: newStreaks.mental,
          beastModeDays,
        });

        if (wellnessBadges.length > 0) {
          const currentStats = get().gamificationStats;
          const newUserBadges = wellnessBadges.map(badge => ({
            id: uuidv4(),
            userId: currentStats.userId,
            badgeId: badge.id,
            earnedAt: new Date(),
            badge,
          }));
          const badgePoints = wellnessBadges.reduce((sum, b) => sum + b.points, 0);
          set({
            gamificationStats: {
              ...currentStats,
              badges: [...currentStats.badges, ...newUserBadges],
              totalPoints: currentStats.totalPoints + badgePoints,
              level: calculateLevel(currentStats.totalPoints + badgePoints),
            },
          });
        }

        return { points: totalPoints, breakdown, newMultiplier };
      },

      getWellnessMultiplier: () => {
        const { gamificationStats } = get();
        const ws = gamificationStats.wellnessStats || defaultWellnessStats;
        const today = new Date().toISOString().split('T')[0];
        const todayDomains = ws.todayCompleted[today] || [];
        return calculateWellnessMultiplier(todayDomains);
      },

      getTodayWellnessDomains: () => {
        const { gamificationStats } = get();
        const ws = gamificationStats.wellnessStats || defaultWellnessStats;
        const today = new Date().toISOString().split('T')[0];
        return ws.todayCompleted[today] || [];
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
        const { quickLogs, workoutLogs, trainingSessions, gamificationStats } = get();
        const entry: QuickLog = {
          ...log,
          id: uuidv4(),
        };
        const updatedQuickLogs = [...quickLogs, entry];
        set({ quickLogs: updatedQuickLogs });

        // Sync water quick logs → waterLog Record for nutrition/readiness engines
        // waterLog stores glasses (1 glass = 250ml), QuickActions logs in ml
        if (log.type === 'water' && typeof log.value === 'number') {
          const dateStr = new Date(log.timestamp).toISOString().split('T')[0];
          const { waterLog } = get();
          const existing = waterLog[dateStr] || 0;
          const glassesAdded = log.value / 250; // convert ml → glasses
          set({ waterLog: { ...waterLog, [dateStr]: existing + glassesAdded } });
        }

        // Mobility logs count toward streak — recalculate
        if (log.type === 'mobility') {
          const newStreak = calculateStreak(workoutLogs, trainingSessions, updatedQuickLogs);
          if (newStreak !== gamificationStats.currentStreak) {
            set({
              gamificationStats: {
                ...gamificationStats,
                currentStreak: newStreak,
                longestStreak: Math.max(gamificationStats.longestStreak, newStreak),
                lastActiveDate: new Date().toISOString().split('T')[0],
              },
            });
          }
        }

        // Award wellness XP based on quick log type
        if (log.type === 'water') {
          // Check if water target hit (8 glasses = 2000ml)
          const dateStr = new Date(log.timestamp).toISOString().split('T')[0];
          const totalWater = updatedQuickLogs
            .filter(l => l.type === 'water' && new Date(l.timestamp).toISOString().split('T')[0] === dateStr)
            .reduce((sum, l) => sum + (typeof l.value === 'number' ? l.value : 0), 0);
          if (totalWater >= 2000) { // 2000ml = ~8 glasses
            get().awardWellnessXP('water');
          }
        } else if (log.type === 'sleep') {
          get().awardWellnessXP('sleep');
        } else if (log.type === 'mobility') {
          get().awardWellnessXP('mobility');
        }
      },

      deleteQuickLog: (id) => {
        const { quickLogs } = get();
        set({ quickLogs: quickLogs.filter(l => l.id !== id) });
      },

      // Cycle tracking actions
      addCycleLog: (log) => {
        const { cycleLogs } = get();
        set({ cycleLogs: [...cycleLogs, { ...log, id: uuidv4() }] });
      },
      updateCycleLog: (id, updates) => {
        const { cycleLogs } = get();
        set({ cycleLogs: cycleLogs.map(l => l.id === id ? { ...l, ...updates } : l) });
      },
      deleteCycleLog: (id) => {
        const { cycleLogs } = get();
        set({ cycleLogs: cycleLogs.filter(l => l.id !== id) });
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

      // Illness actions
      logIllness: (illness) => {
        const { illnessLogs } = get();
        const newIllness: IllnessLog = {
          ...illness,
          id: uuidv4(),
          dailyCheckins: [{
            date: illness.startDate,
            symptoms: illness.symptoms,
            severity: illness.severity,
            hasFever: illness.hasFever,
            temperature: illness.temperature,
            energyLevel: 2,
            appetiteLevel: 3,
            sleepQuality: 3,
          }],
          status: 'active',
        };
        set({ illnessLogs: [...illnessLogs, newIllness] });
      },

      updateIllnessCheckin: (illnessId, checkin) => {
        const { illnessLogs } = get();
        set({
          illnessLogs: illnessLogs.map(il =>
            il.id === illnessId
              ? {
                  ...il,
                  symptoms: checkin.symptoms,
                  severity: checkin.severity,
                  hasFever: checkin.hasFever,
                  dailyCheckins: [...il.dailyCheckins.filter(c => c.date !== checkin.date), checkin],
                }
              : il
          ),
        });
      },

      updateIllnessStatus: (illnessId, status, endDate) => {
        const { illnessLogs } = get();
        set({
          illnessLogs: illnessLogs.map(il =>
            il.id === illnessId
              ? { ...il, status, ...(endDate ? { endDate } : {}) }
              : il
          ),
        });
      },

      resolveIllness: (illnessId) => {
        const { illnessLogs } = get();
        set({
          illnessLogs: illnessLogs.map(il =>
            il.id === illnessId
              ? { ...il, status: 'resolved' as const, endDate: new Date().toISOString().split('T')[0] }
              : il
          ),
        });
      },

      deleteIllness: (illnessId) => {
        const { illnessLogs } = get();
        set({ illnessLogs: illnessLogs.filter(il => il.id !== illnessId) });
      },

      getActiveIllness: () => {
        const { illnessLogs } = get();
        return illnessLogs.find(il => il.status === 'active' || il.status === 'recovering') || null;
      },

      // Workout skip actions
      skipWorkout: (skip) => {
        const { workoutSkips } = get();
        const id = uuidv4();
        set({ workoutSkips: [...workoutSkips, { ...skip, id }] });
        return id;
      },

      deleteSkip: (skipId) => {
        const { workoutSkips } = get();
        set({ workoutSkips: workoutSkips.filter(s => s.id !== skipId) });
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

        // Universal streak — always include all activity sources
        {
          const { quickLogs } = get();
          const allSessions = [...trainingSessions, newSession];
          const newStreak = calculateStreak(workoutLogs, allSessions, quickLogs);

          // Check if this is also a lifting day (dual training)
          const fmtDate = (d: Date) => new Date(d).toDateString();
          const sessionDay = fmtDate(new Date(session.date));
          const hasLiftingToday = workoutLogs.some(log => fmtDate(new Date(log.date)) === sessionDay);
          const newDualDays = hasLiftingToday
            ? (gamificationStats.dualTrainingDays || 0) + 1
            : (gamificationStats.dualTrainingDays || 0);

          const updatedStats: GamificationStats = {
            ...gamificationStats,
            currentStreak: newStreak,
            longestStreak: Math.max(gamificationStats.longestStreak, newStreak),
            totalTrainingSessions: (gamificationStats.totalTrainingSessions || 0) + 1,
            dualTrainingDays: newDualDays,
            lastActiveDate: new Date().toISOString().split('T')[0],
          };

          // Update weekly challenge progress for sessions/dual_days
          if (updatedStats.weeklyChallenge && isCurrentWeek(updatedStats.weeklyChallenge)) {
            updatedStats.weeklyChallenge = {
              ...updatedStats.weeklyChallenge,
              goals: updatedStats.weeklyChallenge.goals.map(g => {
                if (g.completed) return g;
                if (g.type === 'sessions') {
                  const newCurrent = g.current + 1;
                  return { ...g, current: newCurrent, completed: newCurrent >= g.target };
                }
                if (g.type === 'dual_days' && hasLiftingToday) {
                  const newCurrent = g.current + 1;
                  return { ...g, current: newCurrent, completed: newCurrent >= g.target };
                }
                return g;
              }),
            };
          }

          set({
            trainingSessions: [...trainingSessions, newSession],
            gamificationStats: updatedStats,
          });

          // Check badges after updating
          queueMicrotask(() => get().checkAndAwardBadges());
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
      setColorTheme: (theme) => set({ colorTheme: theme }),

      // Nutrition actions
      addMeal: (meal) => {
        const { meals, macroTargets } = get();
        const newMeals = [...meals, { ...meal, id: uuidv4() }];
        set({ meals: newMeals });

        // Award wellness XP for nutrition logging
        const today = new Date().toISOString().split('T')[0];
        const todayMeals = newMeals.filter(m => {
          const mealDate = new Date(m.date).toISOString().split('T')[0];
          return mealDate === today;
        });
        const todayTotals = todayMeals.reduce((acc, m) => ({
          calories: acc.calories + (m.calories || 0),
          protein: acc.protein + (m.protein || 0),
          carbs: acc.carbs + (m.carbs || 0),
          fat: acc.fat + (m.fat || 0),
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

        // Check if macros are within 10% of targets
        const macrosHit = macroTargets.protein > 0 &&
          Math.abs(todayTotals.protein - macroTargets.protein) / macroTargets.protein <= 0.10 &&
          Math.abs(todayTotals.calories - macroTargets.calories) / macroTargets.calories <= 0.10;

        if (todayMeals.length >= 2) { // Award after 2+ meals to avoid noise
          get().awardWellnessXP('nutrition', {
            mealsLogged: todayMeals.length,
            macrosHit,
          });
        }
      },

      updateMeal: (id, updates) => {
        const { meals } = get();
        set({ meals: meals.map(m => m.id === id ? { ...m, ...updates } : m) });
      },

      deleteMeal: (id) => {
        const { meals } = get();
        set({ meals: meals.filter(m => m.id !== id) });
      },

      setMacroTargets: (targets) => set({ macroTargets: targets }),

      setWaterGlasses: (date, glasses) => {
        const { waterLog, quickLogs } = get();
        const prev = waterLog[date] || 0;
        set({ waterLog: { ...waterLog, [date]: glasses } });

        // Sync → QuickLog so quick log UI stays in sync
        // Convert glasses delta to ml for QuickLog (1 glass = 250ml)
        const delta = glasses - prev;
        if (delta > 0) {
          set({
            quickLogs: [...quickLogs, {
              id: uuidv4(),
              type: 'water' as const,
              value: Math.round(delta * 250), // glasses → ml
              unit: 'ml',
              timestamp: new Date(),
            }],
          });
        }
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
        const { activeDietPhase, dietPhaseHistory, bodyWeightLog } = get();
        if (activeDietPhase) {
          // Calculate end weight from latest body weight entry
          const latestEntry = bodyWeightLog.length > 0
            ? bodyWeightLog[bodyWeightLog.length - 1]
            : null;
          const endWeightKg = latestEntry
            ? (latestEntry.unit === 'lbs' ? latestEntry.weight * 0.453592 : latestEntry.weight)
            : activeDietPhase.startWeightKg;

          const completed: CompletedDietPhase = {
            id: activeDietPhase.id,
            goal: activeDietPhase.goal,
            startDate: activeDietPhase.startDate,
            endDate: new Date().toISOString().split('T')[0],
            startWeightKg: activeDietPhase.startWeightKg,
            endWeightKg: Math.round(endWeightKg * 10) / 10,
            weeksCompleted: activeDietPhase.weeksCompleted,
            finalMacros: activeDietPhase.currentMacros,
            totalWeightChangeKg: Math.round((endWeightKg - activeDietPhase.startWeightKg) * 10) / 10,
          };
          set({
            activeDietPhase: null,
            dietPhaseHistory: [...dietPhaseHistory, completed],
          });
        } else {
          set({ activeDietPhase: null });
        }
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

      deleteDietPhaseFromHistory: (id) => {
        const { dietPhaseHistory } = get();
        set({ dietPhaseHistory: dietPhaseHistory.filter(p => p.id !== id) });
      },

      editDietPhaseInHistory: (id, updates) => {
        const { dietPhaseHistory } = get();
        set({
          dietPhaseHistory: dietPhaseHistory.map(p =>
            p.id === id ? { ...p, ...updates, id } : p
          ),
        });
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

      // Subscription actions
      setSubscription: (sub) => set({ subscription: sub }),

      // Notification actions
      setNotificationPreferences: (prefs) => {
        const { notificationPreferences } = get();
        set({ notificationPreferences: { ...notificationPreferences, ...prefs } });
      },

      // Daily login bonus actions
      claimDailyLoginBonus: () => {
        const { dailyLoginBonus, gamificationStats } = get();
        const today = new Date().toISOString().split('T')[0];

        // Already claimed today
        if (dailyLoginBonus.lastClaimedDate === today) return null;

        // Determine consecutive day
        let newConsecutive: number;
        if (!dailyLoginBonus.lastClaimedDate) {
          newConsecutive = 1;
        } else {
          const lastDate = new Date(dailyLoginBonus.lastClaimedDate);
          const todayDate = new Date(today);
          const diffMs = todayDate.getTime() - lastDate.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            newConsecutive = dailyLoginBonus.consecutiveDays >= 7 ? 1 : dailyLoginBonus.consecutiveDays + 1;
          } else {
            newConsecutive = 1;
          }
        }

        // XP schedule: 10, 15, 20, 25, 30, 40, 50
        const xpSchedule = [10, 15, 20, 25, 30, 40, 50];
        let points = xpSchedule[Math.min(newConsecutive, 7) - 1];
        const isMysteryDay = newConsecutive === 7;

        // Day 7 mystery bonus: double XP
        if (isMysteryDay) {
          points *= 2;
        }

        set({
          dailyLoginBonus: {
            lastClaimedDate: today,
            consecutiveDays: newConsecutive,
            totalClaimed: dailyLoginBonus.totalClaimed + points,
          },
          gamificationStats: {
            ...gamificationStats,
            totalPoints: gamificationStats.totalPoints + points,
            level: calculateLevel(gamificationStats.totalPoints + points),
          },
        });

        return { points, day: newConsecutive, isMysteryDay };
      },

      // Fighter's Mind actions
      addMentalCheckIn: (checkIn) => {
        const entry: MentalCheckIn = { ...checkIn, id: crypto.randomUUID() };
        set({ mentalCheckIns: [...get().mentalCheckIns, entry] });
        // Award wellness XP for mental check-in
        get().awardWellnessXP('mental');
      },
      deleteMentalCheckIn: (id) => {
        set({ mentalCheckIns: get().mentalCheckIns.filter(c => c.id !== id) });
      },
      addConfidenceEntry: (entry) => {
        const full: ConfidenceLedgerEntry = { ...entry, id: crypto.randomUUID() };
        set({ confidenceLedger: [...get().confidenceLedger, full] });
      },
      deleteConfidenceEntry: (id) => {
        set({ confidenceLedger: get().confidenceLedger.filter(e => e.id !== id) });
      },
      addFeatureFeedback: (feature, rating) => {
        set({ featureFeedback: [...get().featureFeedback, { id: crypto.randomUUID(), feature, rating, timestamp: new Date().toISOString() }] });
      },

      // Knowledge library actions
      markInsightSeen: (id) => {
        const s = get().seenInsights;
        if (!s.includes(id)) set({ seenInsights: [...s, id] });
      },
      dismissInsight: (id) => {
        const s = get().dismissedInsights;
        if (!s.includes(id)) set({ dismissedInsights: [...s, id] });
      },
      markArticleRead: (id) => {
        const s = get().readArticles;
        if (!s.includes(id)) set({ readArticles: [...s, id] });
      },
      toggleBookmarkArticle: (id) => {
        const s = get().bookmarkedArticles;
        set({ bookmarkedArticles: s.includes(id) ? s.filter(a => a !== id) : [...s, id] });
      },
      setLastInsightDate: (date) => set({ lastInsightDate: date }),

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
          mesocycleQueue: [],
          activeWorkout: null,
          workoutLogs: [],
          gamificationStats: initialGamificationStats,
          bodyWeightLog: [],
          quickLogs: [],
          gripTests: [],
          gripExerciseLogs: [],
          injuryLog: [],
          illnessLogs: [],
          workoutSkips: [],
          cycleLogs: [],
          customExercises: [],
          sessionTemplates: [],
          hrSessions: [],
          trainingSessions: [],
          themeMode: 'dark' as ThemeMode,
          colorTheme: 'steel' as ColorTheme,
          meals: [],
          macroTargets: { calories: 2500, protein: 200, carbs: 280, fat: 80 },
          waterLog: {},
          activeDietPhase: null,
          dietPhaseHistory: [],
          weeklyCheckIns: [],
          mealReminders: {
            enabled: false,
            reminderTimes: { breakfast: '08:00', lunch: '12:30', dinner: '19:00' },
            enabledMeals: { breakfast: true, lunch: true, dinner: true },
          },
          bodyComposition: [],
          muscleEmphasis: null,
          competitions: [],
          weightCutPlans: [],
          combatNutritionProfile: null,
          fightCampPlans: [],
          activeSupplements: [],
          supplementStack: [],
          supplementIntakes: [],
          activeEquipmentProfile: 'gym' as const,
          homeGymEquipment: DEFAULT_EQUIPMENT_PROFILES.find(p => p.name === 'home')?.equipment || [] as EquipmentType[],
          latestWhoopData: null,
          wearableHistory: [],
          whoopWorkouts: [],
          isOnline: true,
          lastSyncAt: null,
          subscription: null,
          notificationPreferences: {
            enabled: false,
            trainingReminders: true,
            streakAlerts: true,
            challengeUpdates: true,
            dailyLoginReminder: true,
            reminderTime: '09:00',
          },
          dailyLoginBonus: {
            lastClaimedDate: null,
            consecutiveDays: 0,
            totalClaimed: 0,
          },
          mentalCheckIns: [],
          confidenceLedger: [],
          featureFeedback: [],
          seenInsights: [],
          dismissedInsights: [],
          readArticles: [],
          bookmarkedArticles: [],
          lastInsightDate: null,
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
            if (!item) return null;
            const parsed = JSON.parse(item);
            // Save a backup key so we can recover from corruption
            try { localStorage.setItem(name + '-backup', item); } catch { /* quota */ }
            return parsed;
          } catch (e) {
            // localStorage is corrupted — try the backup key
            console.error('[storage] Failed to parse localStorage, trying backup:', e);
            try {
              const backup = localStorage.getItem(name + '-backup');
              if (backup) {
                const parsed = JSON.parse(backup);
                // Restore the main key from backup
                try { localStorage.setItem(name, backup); } catch { /* quota */ }
                console.log('[storage] Recovered from backup key');
                return parsed;
              }
            } catch { /* backup also corrupted */ }
            // Both corrupted — flag it so the sync pull can recover from server
            console.error('[storage] localStorage corrupted and no backup — will recover from server');
            try { localStorage.removeItem(name); } catch { /* ignore */ }
            return null;
          }
        },
        setItem: (name: string, value: unknown) => {
          try {
            const json = JSON.stringify(value);
            // Check if we're approaching the limit (5MB typical)
            const currentSize = new Blob([json]).size;
            if (currentSize > 4.5 * 1024 * 1024) {
              // Approaching limit — trigger an emergency sync BEFORE pruning
              // so the full dataset is safe on the server
              try {
                const data = JSON.parse(json);
                const userId = data?.state?.user?.id;
                if (userId && typeof navigator !== 'undefined' && navigator.onLine) {
                  // Fire-and-forget sync to preserve full data on server before pruning
                  fetch('/api/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, data: data.state, lastSyncAt: Date.now() }),
                  }).catch(() => { /* best-effort */ });
                }
              } catch { /* ignore sync errors during pruning */ }

              // Now prune — clone via JSON to avoid mutating live store
              console.warn('[storage] Data approaching localStorage limit — synced to server, now pruning old entries.');
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
                data.state._storageWarning = 'Storage is nearly full. Data was synced to the cloud and old entries have been trimmed locally.';
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
      // ── Schema version: bump this when you add/rename/remove persisted fields.
      // Zustand calls `migrate` BEFORE hydrating the store, so the data is safe.
      version: 3,
      migrate: (persisted: unknown, fromVersion: number) => {
        const state = (persisted ?? {}) as Record<string, unknown>;

        if (fromVersion < 2) {
          // v1 → v2: fields added by Sprints 1-9 + earlier additions
          if (!state.illnessLogs) state.illnessLogs = [];
          if (!state.workoutSkips) state.workoutSkips = [];
          if (!state.quickLogs) state.quickLogs = [];
          if (!state.gripTests) state.gripTests = [];
          if (!state.gripExerciseLogs) state.gripExerciseLogs = [];
          if (!state.injuryLog) state.injuryLog = [];
          if (!state.hrSessions) state.hrSessions = [];
          if (!state.bodyComposition) state.bodyComposition = [];
          if (!state.competitions) state.competitions = [];
          if (!state.weightCutPlans) state.weightCutPlans = [];
          if (!state.combatNutritionProfile) state.combatNutritionProfile = null;
          if (!state.fightCampPlans) state.fightCampPlans = [];
          if (!state.activeSupplements) state.activeSupplements = [];
          if (!state.supplementStack) state.supplementStack = [];
          if (!state.supplementIntakes) state.supplementIntakes = [];
          // Migrate blockQueue → mesocycleQueue
          if (state.blockQueue) {
            state.mesocycleQueue = state.blockQueue;
            delete state.blockQueue;
          }
          if (!state.mesocycleQueue) state.mesocycleQueue = [];
          if (!state.weeklyCheckIns) state.weeklyCheckIns = [];
          if (!state.dietPhaseHistory) state.dietPhaseHistory = [];
          if (!state.waterLog || typeof state.waterLog !== 'object') state.waterLog = {};
          if (!state.macroTargets) state.macroTargets = { calories: 0, protein: 0, carbs: 0, fat: 0 };
          if (!state.mealReminders) state.mealReminders = { enabled: false, enabledMeals: { breakfast: true, lunch: true, dinner: true }, reminderTimes: { breakfast: '08:00', lunch: '12:00', dinner: '18:00' } };
          if (!state.cycleLogs) state.cycleLogs = [];
          if (!state.muscleEmphasis) state.muscleEmphasis = null;
          if (!state.activeEquipmentProfile) state.activeEquipmentProfile = 'gym';
          if (!state.homeGymEquipment) state.homeGymEquipment = ['barbell', 'dumbbell', 'bench', 'pull_up_bar', 'kettlebell', 'resistance_band', 'ab_wheel'];
        }

        if (fromVersion < 3) {
          // v2 → v3: Recalculate streak from ALL historical data (lifting + combat + mobility)
          const workoutLogs = (state.workoutLogs || []) as Array<{ date: string }>;
          const trainingSessions = (state.trainingSessions || []) as Array<{ date: string }>;
          const quickLogs = (state.quickLogs || []) as Array<{ type: string; timestamp: string | Date }>;
          const gamStats = (state.gamificationStats || {}) as Record<string, unknown>;

          const recalculated = calculateStreak(
            workoutLogs as never[],
            trainingSessions as never[],
            quickLogs as never[],
          );

          state.gamificationStats = {
            ...gamStats,
            currentStreak: recalculated,
            longestStreak: Math.max(recalculated, (gamStats.longestStreak as number) || 0),
          };
        }
        // Future: if (fromVersion < 4) { ... }

        return state;
      },
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isOnboarded: state.isOnboarded,
        onboardingData: state.onboardingData,
        baselineLifts: state.baselineLifts,
        currentMesocycle: state.currentMesocycle,
        mesocycleHistory: state.mesocycleHistory,
        mesocycleQueue: state.mesocycleQueue,
        activeWorkout: state.activeWorkout,
        workoutLogs: state.workoutLogs,
        gamificationStats: state.gamificationStats,
        bodyWeightLog: state.bodyWeightLog,
        quickLogs: state.quickLogs,
        gripTests: state.gripTests,
        gripExerciseLogs: state.gripExerciseLogs,
        injuryLog: state.injuryLog,
        illnessLogs: state.illnessLogs,
        workoutSkips: state.workoutSkips,
        cycleLogs: state.cycleLogs,
        customExercises: state.customExercises,
        sessionTemplates: state.sessionTemplates,
        hrSessions: state.hrSessions,
        trainingSessions: state.trainingSessions,
        themeMode: state.themeMode,
        colorTheme: state.colorTheme,
        meals: state.meals,
        macroTargets: state.macroTargets,
        waterLog: state.waterLog,
        activeDietPhase: state.activeDietPhase,
        dietPhaseHistory: state.dietPhaseHistory,
        weeklyCheckIns: state.weeklyCheckIns,
        mealReminders: state.mealReminders,
        bodyComposition: state.bodyComposition,
        muscleEmphasis: state.muscleEmphasis,
        competitions: state.competitions,
        weightCutPlans: state.weightCutPlans,
        combatNutritionProfile: state.combatNutritionProfile,
        fightCampPlans: state.fightCampPlans,
        activeSupplements: state.activeSupplements,
        supplementStack: state.supplementStack,
        supplementIntakes: state.supplementIntakes,
        activeEquipmentProfile: state.activeEquipmentProfile,
        homeGymEquipment: state.homeGymEquipment,
        lastSyncAt: state.lastSyncAt,
        subscription: state.subscription,
        notificationPreferences: state.notificationPreferences,
        dailyLoginBonus: state.dailyLoginBonus,
        // Mental / knowledge base tracking (previously missing — lost on refresh)
        mentalCheckIns: state.mentalCheckIns,
        confidenceLedger: state.confidenceLedger,
        featureFeedback: state.featureFeedback,
        seenInsights: state.seenInsights,
        dismissedInsights: state.dismissedInsights,
        readArticles: state.readArticles,
        bookmarkedArticles: state.bookmarkedArticles,
        lastInsightDate: state.lastInsightDate,
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
