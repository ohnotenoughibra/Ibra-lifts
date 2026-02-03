// Core User Types
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type Equipment = 'full_gym' | 'home_gym' | 'minimal';
export type GoalFocus = 'strength' | 'hypertrophy' | 'balanced' | 'power';
export type SessionsPerWeek = 2 | 3;
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
