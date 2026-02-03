// Core User Types
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type Equipment = 'full_gym' | 'home_gym' | 'minimal';
export type GoalFocus = 'strength' | 'hypertrophy' | 'balanced' | 'power';
export type SessionsPerWeek = 1 | 2 | 3 | 4 | 5 | 6;
export type WeightUnit = 'lbs' | 'kg';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  age: number;
  experienceLevel: ExperienceLevel;
  equipment: Equipment;
  goalFocus: GoalFocus;
  sessionsPerWeek: SessionsPerWeek;
  weightUnit: WeightUnit;
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
  | 'recovery' | 'nutrition' | 'grappling' | 'motivation';

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
  notes?: string;
}

export interface WearableSettings {
  provider: WearableProvider;
  connected: boolean;
  lastSync: Date | null;
  autoAdjustFromRecovery: boolean; // Use recovery score to auto-adjust workout intensity
}

// Competition / Event Prep
export type CompetitionType = 'bjj_tournament' | 'wrestling_meet' | 'mma_fight' | 'aesthetic_event' | 'strength_meet' | 'custom';

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

// Grappling Session Tracking
export type GrapplingType = 'bjj_gi' | 'bjj_nogi' | 'wrestling' | 'mma' | 'judo' | 'other';
export type GrapplingIntensity = 'light_flow' | 'moderate' | 'hard_sparring' | 'competition_prep';

export interface GrapplingSession {
  id: string;
  date: Date;
  type: GrapplingType;
  intensity: GrapplingIntensity;
  duration: number; // minutes
  rounds?: number;
  roundDuration?: number; // minutes per round
  techniques?: string; // what was drilled
  submissions?: number; // landed
  taps?: number; // got tapped
  notes?: string;
  bodyweightBefore?: number;
  bodyweightAfter?: number;
  perceivedExertion: number; // 1-10
}

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

// Form Types for Onboarding
export interface OnboardingData {
  step: number;
  name: string;
  age: number;
  experienceLevel: ExperienceLevel;
  equipment: Equipment;
  goalFocus: GoalFocus;
  sessionsPerWeek: SessionsPerWeek;
  weightUnit: WeightUnit;
  baselineLifts: Partial<BaselineLifts>;
}
