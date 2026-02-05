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

export type GoalFocus = 'strength' | 'hypertrophy' | 'balanced' | 'power';
export type SessionsPerWeek = 1 | 2 | 3 | 4 | 5 | 6;
export type WeightUnit = 'lbs' | 'kg';

// Wearable usage preference
export type WearableUsage = 'whoop' | 'other_wearable' | 'no_wearable';

export type BiologicalSex = 'male' | 'female';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  age: number;
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
  trainingDays?: number[]; // 0=Sun, 1=Mon, ... 6=Sat
  combatTrainingDays?: CombatTrainingDay[]; // Combat sport schedule
  // Wearable preferences
  wearableUsage?: WearableUsage;
  wearableProvider?: WearableProvider;
  createdAt: Date;
  updatedAt: Date;
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
  | 'core' | 'forearms' | 'traps' | 'lats' | 'full_body';

export type ExerciseCategory =
  | 'compound' | 'isolation' | 'power' | 'grappling_specific' | 'grip';

export type MovementPattern =
  | 'push' | 'pull' | 'squat' | 'hinge' | 'carry' | 'rotation' | 'explosive';

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
}

// Workout Programming Types
export type WorkoutType = 'strength' | 'hypertrophy' | 'power';
export type SplitType = 'full_body' | 'upper_lower' | 'push_pull_legs' | 'grappler_hybrid';

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
}

// Gamification Types
export type BadgeCategory = 'strength' | 'consistency' | 'volume' | 'milestone' | 'special';

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
}

// Analytics Types
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
  | 'recovery' | 'nutrition' | 'grappling' | 'motivation'
  | 'striking' | 'mma' | 'general_fitness';

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: ContentCategory;
  tags: string[];
  readTime: number; // minutes
  source?: string;
  publishedAt: Date;
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
  notes?: string;
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

// Wearable / Health Integration (Whoop-first)
export type WearableProvider = 'whoop' | 'apple_health' | 'oura' | 'garmin';

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
export type PainType = 'sharp' | 'dull' | 'burning' | 'stiffness' | 'clicking';

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
  unit: WeightUnit;
  chest?: number;     // cm
  arms?: number;      // cm
  waist?: number;     // cm
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

export interface CombatTrainingDay {
  day: number;           // 0=Sun, 1=Mon, ... 6=Sat
  intensity: CombatIntensity;
  label?: string;        // e.g., "Sparring", "Drilling", "Competition prep"
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
  biologicalSex?: BiologicalSex;
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
  trainingDays?: number[]; // 0=Sun, 1=Mon, ... 6=Sat
  combatTrainingDays?: CombatTrainingDay[]; // Combat sport schedule
  // Wearable preferences
  wearableUsage?: WearableUsage;
  wearableProvider?: WearableProvider;
}
