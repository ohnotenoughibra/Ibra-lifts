// Core User Types
export type BiologicalSex = 'male' | 'female';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type Equipment = 'full_gym' | 'home_gym' | 'minimal';
export type EquipmentType =
  | 'barbell' | 'dumbbell' | 'kettlebell' | 'cable' | 'machine'
  | 'bodyweight' | 'pull_up_bar' | 'bench' | 'resistance_band'
  | 'ez_bar' | 'trap_bar' | 'landmine' | 'dip_station'
  | 'ab_wheel' | 'medicine_ball' | 'battle_ropes' | 'box';
// Equipment presets for quick switching between locations
export type EquipmentProfileName = 'gym' | 'home' | 'travel' | 'custom';

export interface EquipmentProfile {
  name: EquipmentProfileName;
  label: string;
  equipment: EquipmentType[];
}

export const DEFAULT_EQUIPMENT_PROFILES: EquipmentProfile[] = [
  {
    name: 'gym',
    label: 'Full Gym',
    equipment: ['barbell', 'dumbbell', 'kettlebell', 'cable', 'machine', 'bench', 'pull_up_bar', 'dip_station', 'ez_bar', 'trap_bar', 'landmine', 'ab_wheel', 'medicine_ball', 'battle_ropes', 'box', 'resistance_band'],
  },
  {
    name: 'home',
    label: 'Home Gym',
    equipment: ['barbell', 'dumbbell', 'bench', 'pull_up_bar', 'kettlebell', 'resistance_band', 'ab_wheel'],
  },
  {
    name: 'travel',
    label: 'Travel / Minimal',
    equipment: ['bodyweight', 'resistance_band'],
  },
];

export type GoalFocus = 'strength' | 'hypertrophy' | 'balanced' | 'power' | 'strength_endurance';
export type SessionsPerWeek = 1 | 2 | 3 | 4 | 5 | 6;
export type WeightUnit = 'lbs' | 'kg';

// Wearable usage preference
export type WearableUsage = 'whoop' | 'other_wearable' | 'no_wearable';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  age: number;
  bodyWeightKg?: number;       // body weight in kilograms (for nutrition, relative strength)
  heightCm?: number;           // height in centimetres
  sex?: BiologicalSex;         // for BMR calculation (Mifflin-St Jeor)
  experienceLevel: ExperienceLevel;
  equipment: Equipment;
  availableEquipment: EquipmentType[];
  goalFocus: GoalFocus;
  sessionsPerWeek: SessionsPerWeek;
  sessionDurationMinutes: number;
  weightUnit: WeightUnit;
  trainingIdentity: TrainingIdentity;
  combatSport?: CombatSport;
  combatSports?: CombatSport[]; // Multiple sports (e.g., BJJ + Muay Thai)
  trainingDays?: number[]; // 0=Sun, 1=Mon, ... 6=Sat
  combatTrainingDays?: CombatTrainingDay[]; // Combat sport schedule
  // Wearable preferences
  wearableUsage?: WearableUsage;
  wearableProvider?: WearableProvider;
  disclaimerAcceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  _fieldTimestamps?: Record<string, number>;
}

// Baseline lift estimates for programming
export interface BaselineLifts {
  id: string;
  userId: string;
  squat: number | null;
  deadlift: number | null;
  benchPress: number | null;
  overheadPress: number | null;
  barbellRow: number | null;
  pullUp: number | null; // weighted or bodyweight reps
  createdAt: Date;
  updatedAt: Date;
}

// Exercise Database Types
export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'quadriceps' | 'hamstrings' | 'glutes' | 'calves'
  | 'core' | 'forearms' | 'traps' | 'full_body';

export type ExerciseCategory =
  | 'compound' | 'isolation' | 'power' | 'grappling_specific' | 'grip';

export type MovementPattern =
  | 'push' | 'pull' | 'squat' | 'hinge' | 'carry' | 'rotation' | 'explosive';

export type ExerciseMeasurement = 'reps' | 'time' | 'distance';

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  movementPattern: MovementPattern;
  equipmentRequired: Equipment[];
  equipmentTypes: EquipmentType[];
  grapplerFriendly: boolean;
  aestheticValue: number; // 1-10 scale for how much it contributes to aesthetics
  strengthValue: number; // 1-10 scale for how much it contributes to strength
  description: string;
  cues: string[];
  videoUrl?: string;
  measurementType?: ExerciseMeasurement; // 'reps' (default), 'time' (seconds), 'distance'
  isUnilateral?: boolean; // true = performed one side at a time; reps are per side
}

// Workout Programming Types
export type WorkoutType = 'strength' | 'hypertrophy' | 'power' | 'strength_endurance';
export type SplitType = 'full_body' | 'upper_lower' | 'push_pull_legs' | 'grappler_hybrid' | 'striker_power' | 'wrestler_strength' | 'mma_hybrid';

export interface SetPrescription {
  targetReps: number;
  minReps: number;
  maxReps: number;
  rpe: number; // Rate of Perceived Exertion 1-10
  restSeconds: number;
  tempo?: string; // e.g., "3-1-2-0" (eccentric-pause-concentric-pause)
  percentageOf1RM?: number;
}

export interface ExercisePrescription {
  exerciseId: string;
  exercise: Exercise;
  sets: number;
  prescription: SetPrescription;
  notes?: string;
  alternatives?: string[]; // Alternative exercise IDs
}

export interface WorkoutSession {
  id: string;
  name: string;
  type: WorkoutType;
  dayNumber: number; // 1, 2, or 3 in the week
  exercises: ExercisePrescription[];
  estimatedDuration: number; // minutes
  warmUp: string[];
  coolDown: string[];
}

// Mesocycle Types
export interface MesocycleWeek {
  weekNumber: number;
  isDeload: boolean;
  volumeMultiplier: number; // 0.5 for deload, 1.0-1.2 for normal
  intensityMultiplier: number;
  sessions: WorkoutSession[];
}

export interface Mesocycle {
  id: string;
  userId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  weeks: MesocycleWeek[];
  goalFocus: GoalFocus;
  splitType: SplitType;
  status: 'active' | 'completed' | 'upcoming';
  volumeWarnings?: string[];
  createdAt: Date;
  updatedAt?: string; // ISO string — used by sync merge to prefer newer side
  _deleted?: boolean;
  _deletedAt?: number;
}

// Queue for planning upcoming mesocycles
export interface PlannedMesocycle {
  id: string;
  name: string;
  focus: GoalFocus;
  weeks: number;
  periodization?: 'linear' | 'undulating' | 'block' | 'conjugate';
  sessionsPerWeek?: SessionsPerWeek;
  sessionDurationMinutes?: number;
  notes?: string;
  createdAt: Date;
}

// Workout Logging Types
export interface SetLog {
  setNumber: number;
  weight: number;
  reps: number;
  rpe: number;
  completed: boolean;
  notes?: string;
}

export interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  sets: SetLog[];
  personalRecord: boolean;
  estimated1RM?: number;
  feedback?: ExerciseFeedback;
}

// Pre-workout check-in (like RP app)
export interface PreWorkoutCheckIn {
  sleepQuality: number;    // 1-5 (terrible to great)
  sleepHours: number;      // hours slept
  nutrition: 'fasted' | 'light_meal' | 'full_meal' | 'heavy_meal';
  stress: number;          // 1-5
  soreness: number;        // 1-5 (none to severe)
  motivation: number;      // 1-5
  notes?: string;          // free text like "ate pizza last night"
}

// Per-exercise feedback (after last set of each exercise - RP style)
export interface ExerciseFeedback {
  exerciseId: string;
  pumpRating: number;      // 1-5 (no pump to best pump ever)
  difficulty: 'too_easy' | 'just_right' | 'challenging' | 'too_hard';
  jointPain: boolean;
  jointPainLocation?: string;
  wantToSwap: boolean;     // flag to try a different exercise next time
  notes?: string;
}

// Post-workout feedback
export interface PostWorkoutFeedback {
  overallRPE: number;
  overallPerformance: 'worse_than_expected' | 'as_expected' | 'better_than_expected';
  soreness: number;
  energy: number;
  mood: number;            // 1-5
  wouldRepeat: boolean;    // did you enjoy this session?
  notes?: string;
}

// Auto-adjustment result from the engine
export interface WorkoutAdjustment {
  exerciseId: string;
  exerciseName: string;
  adjustmentType: 'weight' | 'sets' | 'reps' | 'swap' | 'deload';
  oldValue: number;
  newValue: number;
  reason: string;
}

export interface WorkoutLog {
  id: string;
  userId: string;
  mesocycleId: string;
  sessionId: string;
  weekNumber?: number;  // Position-based tracking (survives mesocycle regeneration)
  dayNumber?: number;   // Position-based tracking (survives mesocycle regeneration)
  date: Date;
  exercises: ExerciseLog[];
  totalVolume: number; // weight x reps
  duration: number; // minutes
  preCheckIn?: PreWorkoutCheckIn;
  postFeedback?: PostWorkoutFeedback;
  adjustmentsApplied?: WorkoutAdjustment[];
  overallRPE: number;
  soreness: number; // 1-10
  energy: number; // 1-10
  notes?: string;
  completed: boolean;
  // Whoop-correlated heart rate data (auto-matched by time overlap)
  whoopHR?: {
    avgHR: number;
    maxHR: number;
    strain: number;
    calories: number;
    zones?: { zone: number; minutes: number }[];
  };
  _deleted?: boolean;
  _deletedAt?: number;
}

// Gamification Types
export type BadgeCategory = 'strength' | 'consistency' | 'volume' | 'milestone' | 'special' | 'wellness';

// Wellness tracking types
export type WellnessDomain = 'supplements' | 'nutrition' | 'water' | 'sleep' | 'mobility' | 'mental' | 'breathing';

export interface WellnessStreaks {
  supplements: number;    // Consecutive days logging all supplements
  nutrition: number;      // Consecutive days logging meals + hitting macros
  water: number;          // Consecutive days hitting water target
  sleep: number;          // Consecutive days logging sleep
  mobility: number;       // Consecutive days doing mobility work
  mental: number;         // Consecutive days doing mental check-in
  breathing: number;      // Consecutive days doing breathing protocols
  overall: number;        // Consecutive days completing 4+ domains
  longestOverall: number; // Best overall wellness streak ever
}

export interface WellnessDay {
  date: string;           // ISO date
  domains: WellnessDomain[];  // Which domains were completed
  multiplier: number;     // The multiplier earned that day
  xpEarned: number;       // Total wellness XP earned that day
}

export interface WellnessStats {
  streaks: WellnessStreaks;
  totalWellnessXP: number;
  wellnessDays: WellnessDay[];       // History of daily wellness completions
  lastWellnessDate: string | null;   // ISO date of last wellness XP award
  currentMultiplier: number;         // Today's training XP multiplier (1.0 - 2.0)
  // Per-domain daily tracking to prevent double-awards
  todayCompleted: Record<string, WellnessDomain[]>; // dateStr -> domains completed
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  requirement: string;
  points: number;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: Date;
  badge: Badge;
}

export interface GamificationStats {
  id: string;
  userId: string;
  totalPoints: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  totalWorkouts: number;
  totalVolume: number;
  personalRecords: number;
  badges: UserBadge[];
  // Extended engagement tracking
  weeklyChallenge: WeeklyChallenge | null;
  streakShield: StreakShield;
  comebackCount: number;         // Total times user came back after 7+ day absence
  totalTrainingSessions: number;  // Combat/cardio training sessions count
  dualTrainingDays: number;       // Days with both lifting + training
  challengesCompleted: number;    // Total weekly challenges completed
  lastActiveDate: string | null;  // ISO date string of last activity
  smartRestDays: number;          // Total smart rest days (rested when readiness low)
  lastSmartRestDate: string | null; // Prevents double-awarding same day
  // Wellness gamification
  wellnessStats: WellnessStats;
}

// Weekly Challenge system
export interface WeeklyChallengeGoal {
  id: string;
  type: 'workouts' | 'volume' | 'prs' | 'sessions' | 'dual_days';
  target: number;
  current: number;
  description: string;
  xpReward: number;
  completed: boolean;
}

export interface WeeklyChallenge {
  id: string;
  weekStart: string;   // ISO date (Monday)
  goals: WeeklyChallengeGoal[];
  allCompleteBonus: number;    // Bonus XP for completing all 3
  allCompleteBonusClaimed: boolean;
}

// Streak Shield (freeze) system
export interface StreakShield {
  available: number;        // Shields available (max 2)
  lastRefillDate: string;   // ISO date of last weekly refill
  usedDates: string[];      // ISO dates when shields were auto-used
}
export interface StrengthProgress {
  date: Date;
  exerciseId: string;
  exerciseName: string;
  estimated1RM: number;
  actualWeight: number;
  reps: number;
}

export interface VolumeProgress {
  date: Date;
  weekNumber: number;
  totalVolume: number;
  muscleGroupVolume: Record<MuscleGroup, number>;
}

export interface ProgressInsight {
  type: 'strength' | 'volume' | 'consistency' | 'suggestion';
  message: string;
  metric?: number;
  comparison?: number;
  trend: 'up' | 'down' | 'stable';
}

// Knowledge/Educational Content Types
export type ContentCategory =
  | 'muscle_science' | 'lifting_technique' | 'periodization'
  | 'recovery' | 'nutrition' | 'dieting' | 'grappling' | 'motivation'
  | 'striking' | 'mma' | 'general_fitness';

export type ArticleDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface KnowledgeArticle {
  id: string;
  title: string;
  tldr: string; // One-line summary shown on cards and article headers
  content: string;
  category: ContentCategory;
  tags: string[];
  readTime: number; // minutes
  source?: string;
  publishedAt: Date;
  difficulty?: ArticleDifficulty;
  keyTakeaways?: string[];           // 3-5 bullet distilled summary
  relatedArticleIds?: string[];      // IDs of related articles
  applyCta?: { label: string; overlayId: string }; // "Apply This" CTA linking to app feature
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  icon: string;
  articleIds: string[];               // Ordered sequence of articles
  difficulty: ArticleDifficulty;
}

export interface KnowledgeTip {
  id: string;
  content: string;
  category: ContentCategory;
  exerciseId?: string; // If tip is specific to an exercise
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Body Weight Tracking
export interface BodyWeightEntry {
  id: string;
  date: Date;
  weight: number;
  unit: WeightUnit;
  notes?: string;
  _deleted?: boolean;
  _deletedAt?: number;
}

// Quick logging entries (water, sleep, energy, readiness, mobility)
export type QuickLogType = 'water' | 'sleep' | 'energy' | 'readiness' | 'mobility' | 'custom';

export interface QuickLog {
  id: string;
  type: QuickLogType | string;
  value: number | string;
  unit?: string;
  timestamp: Date;
  notes?: string;
  _deleted?: boolean;
  _deletedAt?: number;
}

// Grip strength tracking
export interface GripTest {
  id: string;
  type: 'hang_time' | 'dynamometer';
  value: number; // seconds for hang_time, lbs for dynamometer
  hand?: 'left' | 'right' | 'both';
  date: Date;
  notes?: string;
}

export interface GripExerciseLog {
  id: string;
  exerciseId: string;
  date: Date;
  value: number; // primary metric (time, reps, or distance depending on exercise)
  weight?: number;
  reps?: number;
  distance?: number;
  notes?: string;
}

// Superset / Circuit support
export interface SupersetGroup {
  id: string;
  exerciseIds: string[];
  type: 'superset' | 'circuit' | 'dropset';
  restBetweenExercises: number; // seconds
  restAfterGroup: number; // seconds
}

// Nutrition & Macro Tracking
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_workout' | 'post_workout';

export interface MacroTargets {
  calories: number;
  protein: number;   // grams
  carbs: number;     // grams
  fat: number;       // grams
}

export interface MealEntry {
  id: string;
  date: Date;
  mealType: MealType;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portion?: string;  // e.g. "1 cup", "200g", "2 scoops"
  notes?: string;
  _deleted?: boolean;
  _deletedAt?: number;
}

export interface DailyNutrition {
  date: string; // YYYY-MM-DD
  meals: MealEntry[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  waterLiters: number;
}

// Meal Reminder Settings
export interface MealReminderSettings {
  enabled: boolean;
  reminderTimes: {
    breakfast: string; // HH:MM format
    lunch: string;
    dinner: string;
  };
  enabledMeals: {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
  };
}

// Wearable / Health Integration (Whoop-first)
export type WearableProvider = 'whoop' | 'apple_health' | 'google_fit' | 'oura' | 'garmin';

export interface WearableData {
  id: string;
  date: Date;
  provider: WearableProvider;
  hrv: number | null;           // Heart rate variability (ms)
  restingHR: number | null;     // Resting heart rate (bpm)
  sleepScore: number | null;    // 0-100
  sleepHours: number | null;
  recoveryScore: number | null; // 0-100 (Whoop recovery)
  strain: number | null;        // 0-21 (Whoop strain)
  respiratoryRate: number | null;
  skinTemp: number | null;
  caloriesBurned: number | null;
  spo2: number | null;              // Blood oxygen % (Whoop 4.0+)
  sleepEfficiency: number | null;   // % of time in bed actually asleep
  deepSleepMinutes: number | null;  // Slow wave sleep (minutes)
  remSleepMinutes: number | null;   // REM sleep (minutes)
  sleepDisturbances: number | null; // Number of wake events during sleep
  lightSleepMinutes: number | null; // Light sleep (minutes)
  sleepCycleCount: number | null;   // Number of complete sleep cycles
  sleepConsistency: number | null;  // % consistency of sleep/wake times
  sleepNeededHours: number | null;  // Total sleep need (baseline + debt + strain)
  avgHeartRate: number | null;      // Cycle average heart rate (bpm)
  maxHeartRate: number | null;      // Cycle max heart rate (bpm)
  notes?: string;
}

// Individual Whoop workout entry (multiple per day possible)
export interface WhoopWorkout {
  id: string;
  sportId: number;
  sportName: string;
  start: Date;
  end: Date;
  strain: number | null;
  avgHR: number | null;
  maxHR: number | null;
  calories: number | null;
  distanceMeters: number | null;
  zones: { zone: number; minutes: number }[];
}

// Whoop body measurement snapshot
export interface WhoopBodyMeasurement {
  heightMeters: number | null;
  weightKg: number | null;
  maxHeartRate: number | null;
}

export interface WearableSettings {
  provider: WearableProvider;
  connected: boolean;
  lastSync: Date | null;
  autoAdjustFromRecovery: boolean; // Use recovery score to auto-adjust workout intensity
}

// Competition / Event Prep
export type CompetitionType = 'bjj_tournament' | 'wrestling_meet' | 'mma_fight' | 'kickboxing_fight' | 'muay_thai_fight' | 'boxing_match' | 'aesthetic_event' | 'strength_meet' | 'custom';

export interface CompetitionEvent {
  id: string;
  name: string;
  type: CompetitionType;
  date: Date;
  weightClass?: number;         // target weight in user's unit
  currentWeight?: number;
  notes?: string;
  peakingWeeks: number;         // weeks of peaking phase before event
  taperStart?: Date;
  isActive: boolean;
  _deleted?: boolean;
  _deletedAt?: number;
}

// Deload & Mobility
export type MobilityFocus = 'hips' | 'shoulders' | 'thoracic' | 'ankles' | 'full_body' | 'neck' | 'wrists';

export interface MobilityRoutine {
  id: string;
  name: string;
  focus: MobilityFocus[];
  duration: number; // minutes
  exercises: MobilityExercise[];
  forGrapplers: boolean;
}

export interface MobilityExercise {
  name: string;
  duration: number;    // seconds
  sets: number;
  description: string;
  breathingCue?: string;
  videoUrl?: string;   // YouTube URL for form reference
}

// Exercise Response Profiling
export interface ExerciseResponseProfile {
  exerciseId: string;
  exerciseName: string;
  totalSessions: number;
  avgPumpRating: number;
  avgDifficulty: number;      // numeric 1-4
  jointPainFrequency: number; // 0-1 ratio
  strengthGainRate: number;   // % per week
  volumeResponse: 'high' | 'moderate' | 'low'; // how well user responds to volume on this exercise
  bestRepRange: string;       // e.g., "6-8" or "10-12"
  recommendation: 'increase' | 'maintain' | 'decrease' | 'swap';
  lastUpdated: Date;
}

// Strength Curve & Sticking Point Analysis
export interface StickingPointAnalysis {
  exerciseId: string;
  exerciseName: string;
  avgRPE: number;
  failureReps: number[];      // which rep numbers tend to fail
  rpeByWeight: { weight: number; avgRPE: number }[];
  suggestedAccessories: string[];
  stickingPoint: 'bottom' | 'mid_range' | 'lockout' | 'unknown';
  analysis: string;
}

// AI Coach Weekly Summary
export interface WeeklySummary {
  id: string;
  weekStart: Date;
  weekEnd: Date;
  totalSessions: number;
  totalVolume: number;
  avgRPE: number;
  avgSleepScore: number | null;
  avgRecoveryScore: number | null;
  prsHit: number;
  strengths: string[];
  areasToImprove: string[];
  recommendation: string;
  nextWeekFocus: string;
  nutritionAdherence?: number; // 0-100%
  generatedAt: Date;
}

// Injury / Pain Logging
export type BodyRegion =
  | 'neck' | 'left_shoulder' | 'right_shoulder' | 'upper_back' | 'lower_back'
  | 'left_elbow' | 'right_elbow' | 'left_wrist' | 'right_wrist'
  | 'left_hip' | 'right_hip' | 'left_knee' | 'right_knee'
  | 'left_ankle' | 'right_ankle' | 'chest' | 'core';

export type PainSeverity = 1 | 2 | 3 | 4 | 5;
export type PainType = 'sharp' | 'dull' | 'burning' | 'stiffness' | 'clicking' | 'numbness';

export interface InjuryEntry {
  id: string;
  date: Date;
  bodyRegion: BodyRegion;
  severity: PainSeverity;
  painType: PainType;
  duringExercise?: string;
  notes?: string;
  resolved: boolean;
  resolvedDate?: Date;
  _deleted?: boolean;
  _deletedAt?: number;
}

// Custom Exercise
export interface CustomExercise extends Exercise {
  isCustom: true;
  createdAt: Date;
}

// Session Templates
export interface SessionTemplate {
  id: string;
  name: string;
  createdAt: Date;
  session: WorkoutSession;
  timesUsed: number;
  lastUsed?: Date;
}

// Heart Rate Zone Training
export type HRZone = 'zone1' | 'zone2' | 'zone3' | 'zone4' | 'zone5';

export interface HRZoneConfig {
  maxHR: number;
  restingHR: number;
  zones: {
    zone1: { min: number; max: number; name: string };
    zone2: { min: number; max: number; name: string };
    zone3: { min: number; max: number; name: string };
    zone4: { min: number; max: number; name: string };
    zone5: { min: number; max: number; name: string };
  };
}

export interface HRSession {
  id: string;
  date: Date;
  type: 'grappling_cardio' | 'steady_state' | 'intervals' | 'recovery';
  duration: number;
  avgHR: number;
  maxHR: number;
  timeInZones: Record<HRZone, number>; // seconds per zone
  caloriesBurned: number;
  notes?: string;
}

// Theme
export type ThemeMode = 'dark' | 'light';
export type ColorTheme = 'steel' | 'rose' | 'emerald' | 'amber';

// Training Session Tracking (unified system for all activity types)
// Activity Categories - broad groupings of training types
export type ActivityCategory = 'grappling' | 'striking' | 'mma' | 'cardio' | 'outdoor' | 'recovery' | 'other';

// Activity Types - specific training modalities
export type ActivityType =
  // Grappling
  | 'bjj_gi' | 'bjj_nogi' | 'wrestling' | 'judo' | 'sambo'
  // Striking
  | 'boxing' | 'kickboxing' | 'muay_thai' | 'karate' | 'taekwondo'
  // MMA
  | 'mma'
  // Cardio
  | 'running' | 'cycling' | 'swimming' | 'rowing' | 'jump_rope' | 'elliptical'
  // Outdoor
  | 'hiking' | 'skiing' | 'snowboarding' | 'rock_climbing' | 'surfing'
  // Recovery
  | 'yoga' | 'stretching' | 'mobility' | 'sauna' | 'cold_plunge'
  // Other
  | 'other';

// Session timing relative to lifting
export type SessionTiming = 'standalone' | 'before_lifting' | 'after_lifting' | 'same_day_separate';

// Intensity levels (applicable to all activity types)
export type TrainingIntensity = 'light_flow' | 'moderate' | 'hard_sparring' | 'competition_prep';

// Map activity types to their categories
export const ACTIVITY_CATEGORY_MAP: Record<ActivityType, ActivityCategory> = {
  // Grappling
  bjj_gi: 'grappling',
  bjj_nogi: 'grappling',
  wrestling: 'grappling',
  judo: 'grappling',
  sambo: 'grappling',
  // Striking
  boxing: 'striking',
  kickboxing: 'striking',
  muay_thai: 'striking',
  karate: 'striking',
  taekwondo: 'striking',
  // MMA
  mma: 'mma',
  // Cardio
  running: 'cardio',
  cycling: 'cardio',
  swimming: 'cardio',
  rowing: 'cardio',
  jump_rope: 'cardio',
  elliptical: 'cardio',
  // Outdoor
  hiking: 'outdoor',
  skiing: 'outdoor',
  snowboarding: 'outdoor',
  rock_climbing: 'outdoor',
  surfing: 'outdoor',
  // Recovery
  yoga: 'recovery',
  stretching: 'recovery',
  mobility: 'recovery',
  sauna: 'recovery',
  cold_plunge: 'recovery',
  // Other
  other: 'other',
};

// Activity display labels
export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  bjj_gi: 'BJJ (Gi)',
  bjj_nogi: 'BJJ (No-Gi)',
  wrestling: 'Wrestling',
  judo: 'Judo',
  sambo: 'Sambo',
  boxing: 'Boxing',
  kickboxing: 'Kickboxing',
  muay_thai: 'Muay Thai',
  karate: 'Karate',
  taekwondo: 'Taekwondo',
  mma: 'MMA',
  running: 'Running',
  cycling: 'Cycling',
  swimming: 'Swimming',
  rowing: 'Rowing',
  jump_rope: 'Jump Rope',
  elliptical: 'Elliptical',
  hiking: 'Hiking',
  skiing: 'Skiing',
  snowboarding: 'Snowboarding',
  rock_climbing: 'Rock Climbing',
  surfing: 'Surfing',
  yoga: 'Yoga',
  stretching: 'Stretching',
  mobility: 'Mobility',
  sauna: 'Sauna',
  cold_plunge: 'Cold Plunge',
  other: 'Other',
};

// Intensity display labels
export const INTENSITY_LABELS: Record<TrainingIntensity, string> = {
  light_flow: 'Light / Flow',
  moderate: 'Moderate',
  hard_sparring: 'Hard / Sparring',
  competition_prep: 'Competition Prep',
};

// Timing display labels
export const TIMING_LABELS: Record<SessionTiming, string> = {
  standalone: 'Standalone Session',
  before_lifting: 'Before Lifting',
  after_lifting: 'After Lifting',
  same_day_separate: 'Same Day (Separate)',
};

// Unified Training Session interface
export interface TrainingSession {
  id: string;
  date: Date;
  category: ActivityCategory;
  type: ActivityType;
  // Intensity tracking - planned vs actual allows editing after session
  plannedIntensity: TrainingIntensity;
  actualIntensity?: TrainingIntensity; // Set after session if different from planned
  // Timing relative to lifting
  timing?: SessionTiming;
  /** Hour of day the session started (0-23). Used for inter-session timing calculations. */
  sessionHour?: number;
  duration: number; // minutes
  rounds?: number;
  roundDuration?: number; // minutes per round
  techniques?: string; // what was drilled
  // Combat sport specific
  submissions?: number; // landed (grappling)
  taps?: number; // got tapped (grappling)
  knockdowns?: number; // striking
  // Cardio specific
  distance?: number; // km or miles
  pace?: number; // min/km or min/mile
  elevation?: number; // meters
  // General
  notes?: string;
  bodyweightBefore?: number;
  bodyweightAfter?: number;
  perceivedExertion: number; // 1-10
  // Pre-session check-in (matches strength workout check-in)
  preCheckIn?: PreWorkoutCheckIn;
  // Whoop-synced HR data (auto-populated when imported from Whoop)
  whoopHR?: {
    avgHR: number;
    maxHR: number;
    strain: number;
    calories: number;
    zones?: { zone: number; minutes: number }[];
  };
  whoopWorkoutId?: string; // links back to the Whoop workout for dedup
  _deleted?: boolean;
  _deletedAt?: number;
}

// Legacy type aliases for backward compatibility
/** @deprecated Use ActivityType instead */
export type GrapplingType = ActivityType;
/** @deprecated Use TrainingIntensity instead */
export type GrapplingIntensity = TrainingIntensity;
/** @deprecated Use TrainingSession instead */
export interface GrapplingSession extends TrainingSession {}

// Body Composition
export interface BodyCompositionEntry {
  id: string;
  date: Date;
  weight: number;
  bodyFatPercent?: number;
  bmi?: number;
  unit: WeightUnit;
  chest?: number;     // cm
  arms?: number;      // cm
  waist?: number;     // cm
  neck?: number;      // cm
  hip?: number;       // cm
  legs?: number;      // cm
  notes?: string;
}

// Muscle Emphasis for per-muscle-group mesocycle customization
export type MuscleEmphasis = 'focus' | 'maintain' | 'ignore';

export interface MuscleGroupConfig {
  chest: MuscleEmphasis;
  back: MuscleEmphasis;
  shoulders: MuscleEmphasis;
  biceps: MuscleEmphasis;
  triceps: MuscleEmphasis;
  quadriceps: MuscleEmphasis;
  hamstrings: MuscleEmphasis;
  glutes: MuscleEmphasis;
  calves: MuscleEmphasis;
  core: MuscleEmphasis;
}

// User identity — what kind of athlete are they
export type TrainingIdentity = 'combat' | 'recreational' | 'general_fitness';

// Combat sport sub-types
export type CombatSport = 'mma' | 'grappling_gi' | 'grappling_nogi' | 'striking';

// Combat training schedule — which days and how hard
export type CombatIntensity = 'light' | 'moderate' | 'hard';

export type CombatTimeOfDay = 'morning' | 'afternoon' | 'evening';

export interface CombatTrainingDay {
  day: number;           // 0=Sun, 1=Mon, ... 6=Sat
  intensity: CombatIntensity;
  label?: string;        // e.g., "Sparring", "Drilling", "Competition prep"
  timeOfDay?: CombatTimeOfDay; // For multiple sessions per day
}

// ── Combat Athlete Nutrition Profile ────────────────────────────────────────
// Extended profile for nutrition engine — combat-specific fields are optional
// and only used when trainingIdentity === 'combat'.

export type WeighInType = 'same_day' | 'day_before' | '2hr_before' | 'tournament_morning';
export type DietaryRestriction = 'halal' | 'kosher' | 'vegetarian' | 'vegan' | 'dairy_free' | 'gluten_free';
export type MealPrepAbility = 'none' | 'basic' | 'advanced';
export type CutExperience = 'none' | 'some' | 'experienced';
export type MenstrualStatus = 'regular' | 'irregular' | 'amenorrheic' | 'not_applicable';
export type NutritionGoal = 'fight_prep' | 'maintain_weight_class' | 'move_up' | 'move_down' | 'off_season_growth' | 'general_fitness';
export type NutritionTimeframe = 'short_notice' | 'full_camp' | 'long_term';
export type OccupationType = 'sedentary' | 'lightly_active' | 'active' | 'very_active';

export interface CombatAthleteNutritionProfile {
  // Competition (combat-specific — optional for non-combat users)
  weightClassKg?: number;
  walkAroundWeightKg?: number;
  weighInType?: WeighInType;
  rehydrationTimeHours?: number;       // hours between weigh-in and competition
  isTestedAthlete?: boolean;           // affects supplement recommendations
  competitionType?: 'single_fight' | 'tournament' | 'none';

  // Dietary preferences (universal)
  dietaryRestrictions?: DietaryRestriction[];
  mealPrepAbility?: MealPrepAbility;

  // History & safety (universal)
  previousCutExperience?: CutExperience;
  hasEatingDisorderHistory?: boolean;  // gates aggressive cut features
  menstrualStatus?: MenstrualStatus;

  // Goal (universal — NutritionGoal covers both combat and general paths)
  nutritionGoal?: NutritionGoal;
  timeframe?: NutritionTimeframe;

  // Activity (universal — refines TDEE beyond training sessions)
  occupation?: OccupationType;
}

// ── Weight Cut Types ───────────────────────────────────────────────────────

export type WeightCutPhase =
  | 'not_started'
  | 'chronic_loss'      // 10-4 weeks: caloric deficit for fat loss
  | 'acute_reduction'   // 7-2 days: low-residue, glycogen depletion, water loading
  | 'water_cut'         // 24-2hrs: dehydration protocol
  | 'rehydration'       // post weigh-in: fluid + glycogen recovery
  | 'fight_ready'       // fully rehydrated, ready to compete
  | 'completed';

export type WeightCutSafetyLevel = 'safe' | 'caution' | 'danger' | 'critical';

export interface WeightCutPlan {
  id: string;
  competitionId: string;
  competitionDate: string;           // ISO date
  targetWeightKg: number;
  startWeightKg: number;
  currentPhase: WeightCutPhase;
  phaseStartDate: string;            // ISO date — when current phase began
  weighInType: WeighInType;
  rehydrationTimeHours: number;

  // Phase-specific tracking
  waterLoadStarted: boolean;
  sodiumLoadStarted: boolean;
  carbDepletionStarted: boolean;

  // Safety
  safetyLevel: WeightCutSafetyLevel;
  safetyAlerts: string[];
  maxWaterCutPercent: number;        // hard cap (default 6% BW)

  // Daily logs during cut
  dailyLogs: WeightCutDailyLog[];

  isActive: boolean;
  createdAt: string;
}

export interface WeightCutDailyLog {
  date: string;                      // ISO date
  morningWeight: number;             // kg, fasted post-void
  eveningWeight?: number;
  waterIntakeMl: number;
  sodiumIntakeMg: number;
  carbsG: number;
  fiberG?: number;
  saunaMinutes?: number;
  hotBathMinutes?: number;
  urineColor?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; // 1=clear, 8=dark brown
  restingHR?: number;
  moodScore?: 1 | 2 | 3 | 4 | 5;
  energyScore?: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

// ── Fight Camp Nutrition Types ─────────────────────────────────────────────

export type FightCampPhase =
  | 'off_season'
  | 'base_camp'          // 10-8 weeks out
  | 'intensification'    // 8-4 weeks out
  | 'fight_camp_peak'    // 4-2 weeks out
  | 'fight_week'         // 7-2 days out
  | 'weigh_in_day'
  | 'fight_day'
  | 'tournament_day'
  | 'post_competition';

export interface FightCampNutritionPlan {
  id: string;
  competitionId: string;
  currentPhase: FightCampPhase;
  phases: FightCampPhaseConfig[];
  isActive: boolean;
  createdAt: string;
}

export interface FightCampPhaseConfig {
  phase: FightCampPhase;
  startDate: string;
  endDate: string;
  calorieStrategy: string;           // e.g., '10-15% surplus', '20% deficit'
  proteinGKg: { min: number; max: number };
  carbsGKg: { min: number; max: number };
  fatGKg: { min: number; max: number };
  focus: string;
  restrictions: string[];
  warnings: string[];
}

// ── Supplement Tracking Types ──────────────────────────────────────────────

export type SupplementTier = 'essential' | 'situational' | 'optional';

export interface SupplementRecommendation {
  id: string;
  name: string;
  tier: SupplementTier;
  doseRange: string;                 // e.g., '3-5g/day'
  timing: string;                    // e.g., 'anytime with meal'
  frequency: string;                 // e.g., 'daily', 'training days only'
  evidence: string;                  // key citation
  combatNotes: string;               // combat-sport-specific advice
  pauseBeforeWeighIn?: number;       // days to stop before weigh-in (e.g., creatine = 7)
  bannedSubstanceRisk: boolean;      // WADA/USADA concern
  contraindications?: string[];
}

// ── Supplement Intake Tracking Types ──────────────────────────────────────────

/** Macro content per serving of a supplement (for auto-adding to nutrition) */
export interface SupplementMacros {
  calories: number;
  protein: number;   // grams
  carbs: number;     // grams
  fat: number;       // grams
}

/** A single logged supplement intake */
export interface SupplementIntake {
  id: string;
  supplementId: string;
  name: string;
  date: string;         // YYYY-MM-DD
  time: string;         // HH:MM
  servings: number;     // 1 scoop, 2 capsules, etc.
  macrosPerServing: SupplementMacros | null;  // null = no macros (e.g., vitamin D capsule)
  autoLoggedToMeals: boolean;                 // true if macros were auto-added to nutrition
  mealEntryId?: string;                       // reference to the auto-created MealEntry
}

/** User's personal supplement stack — what they're currently taking */
export interface UserSupplement {
  supplementId: string;
  name: string;
  customDose?: string;                        // user can override default dose
  macrosPerServing: SupplementMacros | null;   // user can set their specific product's macros
  servingsPerDose: number;                    // e.g., 2 scoops
  enabled: boolean;                           // toggle on/off without deleting
  timingSlot: 'morning' | 'pre_workout' | 'post_workout' | 'evening' | 'with_meal';
}

// ── Energy Availability Types ──────────────────────────────────────────────

export type EnergyAvailabilityStatus = 'adequate' | 'caution' | 'low' | 'critical';

export interface EnergyAvailabilityResult {
  ea: number;                        // kcal/kg FFM
  status: EnergyAvailabilityStatus;
  message: string;
  leanMassKg: number;
  exerciseCostKcal: number;
}

// ── Performance Readiness (Nutrition) Types ────────────────────────────────

export interface NutritionReadiness {
  score: number;                     // 0-100
  level: 'ready' | 'needs_attention' | 'at_risk';
  components: {
    nutritionAdherence: number;      // 0-100
    hydration: number;               // 0-100
    weightStatus: number;            // 0-100
    energyAvailability: number;      // 0-100
  };
  bottleneck: string;
  actionItem: string;
}

// ── Electrolyte Types ──────────────────────────────────────────────────────

export interface ElectrolyteNeeds {
  fluidLossL: number;
  replacementFluidL: number;
  sodiumMg: number;
  potassiumMg: number;
  magnesiumMg: number;
  timing: string;
}

// ── Periodized Nutrition Planning ────────────────────────────────────────────

/**
 * Nutrition phase types — each represents a distinct physiological purpose.
 *
 * massing:      Caloric surplus for muscle gain. Paired with hypertrophy training.
 * maintenance:  TDEE calories. Mandatory between phases for hormonal recalibration.
 * mini_cut:     Short aggressive deficit (3-6 weeks) between massing blocks.
 * fat_loss:     Moderate deficit (8-16 weeks) for significant body composition change.
 * diet_break:   1-2 weeks at TDEE during extended cuts to counteract metabolic adaptation.
 * fight_camp:   Competition prep — delegates to fight-camp-engine when active.
 * recovery:     Post-competition or post-cut reverse diet.
 *
 * References:
 *   - Helms et al. 2019: Sustainable nutrition paradigm in physique sport
 *   - Israetel/RP Strength: Mesocycle-aligned nutrition phases
 *   - Byrne et al. 2017 (MATADOR): Intermittent energy restriction preserves FFM
 *   - ISSN 2025: Position stand on nutrition for MMA and combat sports
 */
export type NutritionPhaseType =
  | 'massing'
  | 'maintenance'
  | 'mini_cut'
  | 'fat_loss'
  | 'diet_break'
  | 'fight_camp'
  | 'recovery';

/** Why the system recommends transitioning to a new phase. */
export type PhaseTransitionReason =
  | 'phase_duration_complete'     // Planned duration reached
  | 'competition_approaching'     // Fight/tournament date forces phase change
  | 'body_fat_threshold'          // BF% reached upper/lower bound
  | 'metabolic_adaptation'        // Weight loss stalled despite adherence
  | 'performance_decline'         // Strength dropping >10% during deficit
  | 'adherence_breakdown'         // <60% adherence for 2+ weeks
  | 'weight_target_reached'       // Hit goal weight
  | 'recovery_complete'           // Post-comp recovery period finished
  | 'manual_override';            // User chose to switch

/** A single planned nutrition phase within an annual periodization plan. */
export interface PlannedNutritionPhase {
  id: string;
  type: NutritionPhaseType;
  startDate: string;              // ISO date
  endDate: string;                // ISO date
  plannedWeeks: number;
  /** Calorie target relative to TDEE: e.g. 1.10 = 10% surplus, 0.80 = 20% deficit */
  calorieFactor: number;
  /** Target rate of weight change (kg/week). Negative = loss, 0 = maintain, positive = gain */
  targetRateKgPerWeek: number;
  /** Protein target g/kg bodyweight */
  proteinGKg: number;
  /** Recommended training block to pair with this phase */
  pairedTrainingFocus: BlockFocus;
  /** Why this phase was recommended */
  reasoning: string;
  /** Linked competition ID if this phase serves a competition */
  competitionId?: string;
  /** Whether a diet break should be inserted at the midpoint */
  dietBreakRecommended: boolean;
}

/** The full annual periodization plan. */
export interface NutritionPeriodPlan {
  id: string;
  createdAt: string;              // ISO date
  updatedAt: string;              // ISO date
  phases: PlannedNutritionPhase[];
  /** Index into phases[] for the currently active phase */
  activePhaseIndex: number;
  /** Weeks completed within the active phase */
  weeksIntoActivePhase: number;
  /** Current status of the plan */
  status: 'active' | 'needs_review' | 'completed';
}

/** Snapshot of the current phase for display/integration. */
export interface ActivePhaseContext {
  phase: PlannedNutritionPhase;
  weeksCompleted: number;
  weeksRemaining: number;
  /** e.g. "Week 3 of 8 · Massing" */
  label: string;
  /** e.g. "14 weeks to fight camp" */
  lookAhead: string | null;
  /** Whether the system recommends transitioning now */
  transitionRecommended: boolean;
  transitionReason: PhaseTransitionReason | null;
  /** The recommended next phase if transition is warranted */
  recommendedNextPhase: NutritionPhaseType | null;
}

// ── Diet Phase / Nutrition Coaching ─────────────────────────────────────────
export type DietGoal = 'cut' | 'maintain' | 'bulk';

export interface DietPhase {
  id: string;
  goal: DietGoal;
  startDate: string;          // ISO date string
  startWeightKg: number;
  targetRatePerWeek: number;  // kg/week: negative for cut, 0 for maintain, positive for bulk
  currentMacros: MacroTargets;
  weeksCompleted: number;
  isActive: boolean;
  updatedAt?: string; // ISO string — used by sync merge to prefer newer side
}

export interface CompletedDietPhase {
  id: string;
  goal: DietGoal;
  startDate: string;           // ISO date string
  endDate: string;             // ISO date string
  startWeightKg: number;
  endWeightKg: number;
  weeksCompleted: number;
  finalMacros: MacroTargets;
  totalWeightChangeKg: number; // negative = lost, positive = gained
}

export interface WeeklyCheckIn {
  id: string;
  phaseId: string;
  weekNumber: number;
  date: string;               // ISO date string
  averageWeightKg: number;
  weightChange: number;       // vs previous week
  adherenceScore: number;     // 0-100 (% of days logged)
  adjustmentMade: 'increase' | 'decrease' | 'maintain';
  newMacros: MacroTargets;
  notes?: string;
}

// Form Types for Onboarding
export interface OnboardingData {
  step: number;
  name: string;
  age: number;
  bodyWeightKg?: number;
  heightCm?: number;
  sex?: BiologicalSex;
  disclaimerAccepted?: boolean;
  parentalConsent?: boolean;
  experienceLevel: ExperienceLevel;
  equipment: Equipment;
  availableEquipment: EquipmentType[];
  goalFocus: GoalFocus;
  sessionsPerWeek: SessionsPerWeek;
  sessionDurationMinutes: number;
  weightUnit: WeightUnit;
  baselineLifts: Partial<BaselineLifts>;
  trainingIdentity: TrainingIdentity;
  combatSport?: CombatSport;
  combatSports?: CombatSport[]; // Multiple sports (e.g., BJJ + Muay Thai)
  mesoCycleWeeks?: number; // 4-12 weeks, defaults to 5
  trainingDays?: number[]; // 0=Sun, 1=Mon, ... 6=Sat
  combatTrainingDays?: CombatTrainingDay[]; // Combat sport schedule
  // Wearable preferences
  wearableUsage?: WearableUsage;
  wearableProvider?: WearableProvider;
  // Periodization style choice (auto-selected by default based on experience)
  periodizationStyle?: 'linear' | 'undulating' | 'block' | 'conjugate';
}

// ── Performance Engine Types ────────────────────────────────────────────────
export type ReadinessLevel = 'peak' | 'good' | 'moderate' | 'low' | 'critical';

export interface ReadinessFactor {
  source: 'sleep' | 'nutrition' | 'stress' | 'recovery' | 'injury' | 'training_load' | 'hydration' | 'age' | 'hrv' | 'soreness' | 'illness';
  label: string;
  score: number;        // 0-100
  weight: number;       // importance 0-1 (redistributed if not tracked)
  available: boolean;   // false if user doesn't track this metric
  detail?: string;
}

export interface ReadinessScore {
  overall: number;                // 0-100
  level: ReadinessLevel;
  factors: ReadinessFactor[];
  volumeModifier: number;         // 0.5-1.15
  intensityModifier: number;      // 0.7-1.05
  recommendations: string[];
}

// ── Injury Science Types ────────────────────────────────────────────────────
export type TissueType = 'muscle' | 'tendon' | 'ligament' | 'joint' | 'bone' | 'nerve';

export interface ReturnToTrainingPhase {
  phase: number;
  name: string;
  durationDays: { min: number; max: number };
  criteria: string[];
  allowedActivities: string[];
  intensityLimit: number;   // 0-100 %
  volumeLimit: number;      // 0-100 %
}

export interface InjuryClassification {
  tissueType: TissueType;
  estimatedHealDays: { min: number; max: number };
  currentPhase: 'acute' | 'subacute' | 'remodeling' | 'return_to_sport';
  phaseDescription: string;
  loadingGuidelines: string[];
  avoidExerciseIds: string[];
  modifiedExercises: { exerciseId: string; modification: string }[];
  returnProtocol: ReturnToTrainingPhase[];
}

// ── Block Suggestion Types ──────────────────────────────────────────────────
export type BlockFocus = 'strength' | 'hypertrophy' | 'power' | 'deload' | 'peaking' | 'base_building';

export interface BlockSuggestion {
  recommendedFocus: BlockFocus;
  confidence: number;           // 0-100
  reasoning: string[];
  alternativeFocus?: BlockFocus;
  alternativeReason?: string;
  suggestedWeeks: number;
  keyMetrics: { label: string; value: string; trend: 'up' | 'down' | 'stable' }[];
  weakPoints: string[];         // muscle groups needing attention
  strongPoints: string[];       // muscle groups performing well
  isFromQueue?: boolean;        // true when suggestion comes from user's queued blocks
}

// ── Workout Skip Types ─────────────────────────────────────────────────────
export type SkipReason =
  | 'schedule_conflict'
  | 'fatigue'
  | 'soreness'
  | 'illness'
  | 'injury'
  | 'mental_health'
  | 'travel'
  | 'other';

export interface WorkoutSkip {
  id: string;
  date: string;
  scheduledSessionId?: string;
  reason: SkipReason;
  notes?: string;
  rescheduled: boolean;
  rescheduledTo?: string;
  illnessLogId?: string;
}

// ── Illness Logging Types ──────────────────────────────────────────────────
export type IllnessSymptomLocation = 'above_neck' | 'below_neck' | 'systemic';

export type IllnessSymptom =
  // Above neck
  | 'runny_nose' | 'sore_throat' | 'sneezing' | 'headache'
  // Below neck
  | 'cough' | 'chest_congestion' | 'shortness_of_breath'
  // Systemic
  | 'fever' | 'chills' | 'body_aches' | 'fatigue'
  | 'nausea' | 'diarrhea' | 'vomiting' | 'dizziness' | 'loss_of_appetite';

export type IllnessSeverity = 'mild' | 'moderate' | 'severe';

export type IllnessStatus = 'active' | 'recovering' | 'resolved';

export type ReturnToTrainingPhaseType = 'test_day' | 'building_back' | 'full_return';

export interface IllnessDailyCheckin {
  date: string;
  symptoms: IllnessSymptom[];
  severity: IllnessSeverity;
  hasFever: boolean;
  temperature?: number;
  energyLevel: 1 | 2 | 3 | 4 | 5;
  appetiteLevel: 1 | 2 | 3 | 4 | 5;
  sleepQuality: 1 | 2 | 3 | 4 | 5;
}

export interface IllnessLog {
  id: string;
  startDate: string;
  endDate?: string;
  symptoms: IllnessSymptom[];
  severity: IllnessSeverity;
  hasFever: boolean;
  temperature?: number;
  dailyCheckins: IllnessDailyCheckin[];
  status: IllnessStatus;
  returnToTrainingPhase?: ReturnToTrainingPhaseType;
  doctorVisit: boolean;
  medication?: string;
  notes?: string;
  updatedAt?: string; // ISO string — used by sync merge to prefer newer side
  _deleted?: boolean;
  _deletedAt?: number;
}

export interface IllnessTrainingRecommendation {
  canTrain: boolean;
  maxIntensityPercent: number;    // 0-100
  maxVolumePercent: number;       // 0-100
  maxDurationMinutes: number;
  rpeCap: number;
  message: string;
  detailedReason: string;
  suggestedActivities: string[];
  returnPhase?: ReturnToTrainingPhaseType;
}

// ── Subscription Types ─────────────────────────────────────────────────────
export type SubscriptionTier = 'free' | 'pro';
export type SubscriptionSource = 'paypal' | 'sepa' | 'gym' | 'trial';
export type SubscriptionPaymentStatus = 'active' | 'grace' | 'expired' | 'cancelled';

export interface Subscription {
  tier: SubscriptionTier;
  source: SubscriptionSource;
  status: SubscriptionPaymentStatus;
  currentPeriodStart: string; // ISO date
  currentPeriodEnd: string;   // ISO date
  paypalSubscriptionId?: string;
  graceEndsAt?: string;       // ISO date — 14-day grace after expiry
}

// ── Notification Types ─────────────────────────────────────────────────────
export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPreferences {
  enabled: boolean;
  pushEnabled: boolean;
  pushSubscription: PushSubscriptionData | null;
  trainingReminders: boolean;
  streakAlerts: boolean;
  challengeUpdates: boolean;
  dailyLoginReminder: boolean;
  prCelebrations: boolean;
  recoveryAlerts: boolean;
  nutritionNudges: boolean;
  reminderTime: string; // HH:MM
}

// ── Daily Login Bonus Types ────────────────────────────────────────────────
export interface DailyLoginBonus {
  lastClaimedDate: string | null; // YYYY-MM-DD
  consecutiveDays: number;        // 1-7, resets after 7
  totalClaimed: number;           // lifetime total XP from login bonuses
}

// ── Fighter's Mind — Mental Check-in Types ──────────────────────────────────

export type MentalCheckInContext = 'pre_training' | 'post_training' | 'standalone' | 'pre_competition' | 'post_competition';

export interface MentalCheckIn {
  id: string;
  date: string;                     // ISO date
  timestamp: string;                // ISO datetime
  context: MentalCheckInContext;

  // Core mental state (1-5 scales — matches existing pre/post check-in UX)
  energy: number;                   // 1-5: drained → charged
  focus: number;                    // 1-5: scattered → locked in
  confidence: number;               // 1-5: doubtful → certain
  composure: number;                // 1-5: anxious → calm

  // Optional deeper reflection
  triggers?: string;                // "What triggered me?" / "What threw me off?"
  flow?: string;                    // "When did I flow?" / "What clicked?"
  selfTalk?: 'positive' | 'negative' | 'neutral'; // Inner voice quality
  word?: string;                    // One word for the session (raw, unfiltered)

  // Linkable to workout/training for correlation
  linkedWorkoutId?: string;         // WorkoutLog.id
  linkedTrainingSessionId?: string; // TrainingSession.id
}

// Confidence Ledger entry — auto-generated or manual
export type ConfidenceEntryType = 'pr' | 'streak' | 'breakthrough' | 'win' | 'good_round' | 'technique' | 'comeback' | 'manual';

export interface ConfidenceLedgerEntry {
  id: string;
  date: string;                     // ISO date
  type: ConfidenceEntryType;
  title: string;                    // "Hit 315 squat PR", "5-round sparring no gas"
  detail?: string;                  // Optional longer reflection
  impact: number;                   // 1-5: how much this matters to you
  autoGenerated: boolean;           // true = system detected, false = user entered
  sourceId?: string;                // WorkoutLog.id or TrainingSession.id that triggered it
}

// ── Feature Feedback Signal ──────────────────────────────────────────────────

export interface FeatureFeedback {
  id: string;
  feature: string;              // overlay ID or feature name
  rating: 'up' | 'down';       // thumbs up/down
  timestamp: string;            // ISO datetime
}

// ── New User Guide ──────────────────────────────────────────────────────────
export interface GuideStep {
  id: string;
  title: string;
  description: string;
  highlightArea: string;        // selector or overlay id
  tip?: string;
}
