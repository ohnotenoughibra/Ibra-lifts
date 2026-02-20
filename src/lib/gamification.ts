import { Badge, BadgeCategory, GamificationStats, WeeklyChallenge, WeeklyChallengeGoal, WorkoutLog, TrainingIdentity } from './types';
import { v4 as uuidv4 } from 'uuid';

// Badge definitions — 52 total badges across 5 categories
export const badges: Badge[] = [
  // ═══════════════════════════════════════════
  // STRENGTH BADGES (10)
  // ═══════════════════════════════════════════
  {
    id: 'first-pr',
    name: 'PR Crusher',
    description: 'Hit your first personal record',
    icon: '🏆',
    category: 'strength',
    requirement: 'personal_records >= 1',
    points: 100
  },
  {
    id: 'pr-streak-5',
    name: 'Strength Rising',
    description: 'Hit 5 personal records',
    icon: '💪',
    category: 'strength',
    requirement: 'personal_records >= 5',
    points: 250
  },
  {
    id: 'pr-streak-10',
    name: 'PR Hunter',
    description: 'Hit 10 personal records',
    icon: '🎯',
    category: 'strength',
    requirement: 'personal_records >= 10',
    points: 350
  },
  {
    id: 'pr-streak-20',
    name: 'Strength Beast',
    description: 'Hit 20 personal records',
    icon: '🦁',
    category: 'strength',
    requirement: 'personal_records >= 20',
    points: 500
  },
  {
    id: 'pr-streak-50',
    name: 'PR Machine',
    description: 'Hit 50 personal records',
    icon: '⚙️',
    category: 'strength',
    requirement: 'personal_records >= 50',
    points: 1000
  },
  {
    id: 'pr-streak-100',
    name: 'PR Legend',
    description: 'Hit 100 personal records',
    icon: '👑',
    category: 'strength',
    requirement: 'personal_records >= 100',
    points: 2500
  },
  {
    id: 'double-bodyweight-deadlift',
    name: 'Deadlift King',
    description: 'Deadlift double your bodyweight',
    icon: '🫅',
    category: 'strength',
    requirement: 'deadlift_ratio >= 2.0',
    points: 1000
  },
  {
    id: '1rm-increase-10',
    name: 'Progress Maker',
    description: 'Increase any 1RM by 10%',
    icon: '📈',
    category: 'strength',
    requirement: '1rm_increase >= 10',
    points: 300
  },
  {
    id: '1rm-increase-20',
    name: 'Transformation',
    description: 'Increase any 1RM by 20%',
    icon: '🚀',
    category: 'strength',
    requirement: '1rm_increase >= 20',
    points: 750
  },
  {
    id: '1rm-increase-50',
    name: 'New Athlete',
    description: 'Increase any 1RM by 50%',
    icon: '🔥',
    category: 'strength',
    requirement: '1rm_increase >= 50',
    points: 2000
  },

  // ═══════════════════════════════════════════
  // CONSISTENCY BADGES (12)
  // ═══════════════════════════════════════════
  {
    id: 'first-workout',
    name: 'First Step',
    description: 'Complete your first workout',
    icon: '👟',
    category: 'consistency',
    requirement: 'total_workouts >= 1',
    points: 50
  },
  {
    id: 'week-warrior',
    name: 'Week Warrior',
    description: 'Complete all workouts in a week',
    icon: '⚔️',
    category: 'consistency',
    requirement: 'weekly_completion >= 1',
    points: 150
  },
  {
    id: 'streak-7',
    name: 'Weekly Streak',
    description: 'Maintain a 7-day training streak',
    icon: '🔥',
    category: 'consistency',
    requirement: 'streak >= 7',
    points: 200
  },
  {
    id: 'streak-14',
    name: 'Two Week Terror',
    description: 'Maintain a 14-day training streak',
    icon: '🔥',
    category: 'consistency',
    requirement: 'streak >= 14',
    points: 350
  },
  {
    id: 'streak-30',
    name: 'Monthly Dedication',
    description: 'Maintain a 30-day training streak',
    icon: '🌟',
    category: 'consistency',
    requirement: 'streak >= 30',
    points: 500
  },
  {
    id: 'streak-60',
    name: 'Two Month Beast',
    description: 'Maintain a 60-day training streak',
    icon: '💪',
    category: 'consistency',
    requirement: 'streak >= 60',
    points: 1000
  },
  {
    id: 'streak-90',
    name: 'Unbreakable',
    description: 'Maintain a 90-day training streak',
    icon: '💎',
    category: 'consistency',
    requirement: 'streak >= 90',
    points: 1500
  },
  {
    id: 'streak-180',
    name: 'Half Year Hero',
    description: 'Maintain a 180-day training streak',
    icon: '🛡️',
    category: 'consistency',
    requirement: 'streak >= 180',
    points: 3000
  },
  {
    id: 'streak-365',
    name: 'Year of Discipline',
    description: 'Maintain a 365-day training streak',
    icon: '🏰',
    category: 'consistency',
    requirement: 'streak >= 365',
    points: 5000
  },
  {
    id: 'mesocycle-complete',
    name: 'Block Finisher',
    description: 'Complete a full mesocycle',
    icon: '🎯',
    category: 'consistency',
    requirement: 'mesocycles_completed >= 1',
    points: 400
  },
  {
    id: 'mesocycle-master',
    name: 'Periodization Pro',
    description: 'Complete 5 mesocycles',
    icon: '🏅',
    category: 'consistency',
    requirement: 'mesocycles_completed >= 5',
    points: 2000
  },
  {
    id: 'mesocycle-legend',
    name: 'Program Architect',
    description: 'Complete 10 mesocycles',
    icon: '🏗️',
    category: 'consistency',
    requirement: 'mesocycles_completed >= 10',
    points: 4000
  },

  // ═══════════════════════════════════════════
  // VOLUME BADGES (6)
  // ═══════════════════════════════════════════
  {
    id: 'volume-10k',
    name: 'Volume Seeker',
    description: 'Lift 10,000 total volume',
    icon: '📊',
    category: 'volume',
    requirement: 'total_volume >= 10000',
    points: 100
  },
  {
    id: 'volume-50k',
    name: 'Volume Grinder',
    description: 'Lift 50,000 total volume',
    icon: '⚒️',
    category: 'volume',
    requirement: 'total_volume >= 50000',
    points: 200
  },
  {
    id: 'volume-100k',
    name: 'Volume Crusher',
    description: 'Lift 100,000 total volume',
    icon: '📦',
    category: 'volume',
    requirement: 'total_volume >= 100000',
    points: 300
  },
  {
    id: 'volume-250k',
    name: 'Volume Machine',
    description: 'Lift 250,000 total volume',
    icon: '🏭',
    category: 'volume',
    requirement: 'total_volume >= 250000',
    points: 500
  },
  {
    id: 'volume-500k',
    name: 'Volume Legend',
    description: 'Lift 500,000 total volume',
    icon: '🏛️',
    category: 'volume',
    requirement: 'total_volume >= 500000',
    points: 750
  },
  {
    id: 'volume-1m',
    name: 'Million Pound Club',
    description: 'Lift 1,000,000 total volume',
    icon: '💰',
    category: 'volume',
    requirement: 'total_volume >= 1000000',
    points: 2000
  },

  // ═══════════════════════════════════════════
  // MILESTONE BADGES (12)
  // ═══════════════════════════════════════════
  {
    id: 'workouts-10',
    name: 'Getting Started',
    description: 'Complete 10 workouts',
    icon: '🌱',
    category: 'milestone',
    requirement: 'total_workouts >= 10',
    points: 100
  },
  {
    id: 'workouts-25',
    name: 'Quarter Century',
    description: 'Complete 25 workouts',
    icon: '🌿',
    category: 'milestone',
    requirement: 'total_workouts >= 25',
    points: 200
  },
  {
    id: 'workouts-50',
    name: 'Committed',
    description: 'Complete 50 workouts',
    icon: '🌳',
    category: 'milestone',
    requirement: 'total_workouts >= 50',
    points: 300
  },
  {
    id: 'workouts-75',
    name: 'Three Quarters',
    description: 'Complete 75 workouts',
    icon: '🌲',
    category: 'milestone',
    requirement: 'total_workouts >= 75',
    points: 400
  },
  {
    id: 'workouts-100',
    name: 'Century Club',
    description: 'Complete 100 workouts',
    icon: '💯',
    category: 'milestone',
    requirement: 'total_workouts >= 100',
    points: 500
  },
  {
    id: 'workouts-200',
    name: 'Double Century',
    description: 'Complete 200 workouts',
    icon: '🏋️',
    category: 'milestone',
    requirement: 'total_workouts >= 200',
    points: 1000
  },
  {
    id: 'workouts-365',
    name: 'Year of Iron',
    description: 'Complete 365 workouts',
    icon: '📅',
    category: 'milestone',
    requirement: 'total_workouts >= 365',
    points: 2500
  },
  {
    id: 'workouts-500',
    name: 'Iron Veteran',
    description: 'Complete 500 workouts',
    icon: '🎖️',
    category: 'milestone',
    requirement: 'total_workouts >= 500',
    points: 3500
  },
  {
    id: 'level-5',
    name: 'Rising Star',
    description: 'Reach level 5',
    icon: '⭐',
    category: 'milestone',
    requirement: 'level >= 5',
    points: 200
  },
  {
    id: 'level-10',
    name: 'Veteran',
    description: 'Reach level 10',
    icon: '🌟',
    category: 'milestone',
    requirement: 'level >= 10',
    points: 500
  },
  {
    id: 'level-25',
    name: 'Elite',
    description: 'Reach level 25',
    icon: '✨',
    category: 'milestone',
    requirement: 'level >= 25',
    points: 2000
  },
  {
    id: 'level-40',
    name: 'Transcendent',
    description: 'Reach level 40',
    icon: '🌠',
    category: 'milestone',
    requirement: 'level >= 40',
    points: 5000
  },

  // ═══════════════════════════════════════════
  // SPECIAL BADGES (12)
  // ═══════════════════════════════════════════
  {
    id: 'grappler-grip',
    name: 'Iron Grip',
    description: 'Complete 20 grip-focused exercises',
    icon: '🤜',
    category: 'special',
    requirement: 'grip_exercises >= 20',
    points: 300
  },
  {
    id: 'turkish-master',
    name: 'Turkish Master',
    description: 'Perform 50 Turkish Get-Ups',
    icon: '🇹🇷',
    category: 'special',
    requirement: 'turkish_getups >= 50',
    points: 400
  },
  {
    id: 'balanced-athlete',
    name: 'Balanced Athlete',
    description: 'Train all muscle groups evenly for a month',
    icon: '⚖️',
    category: 'special',
    requirement: 'balanced_training >= 30',
    points: 500
  },
  {
    id: 'early-bird',
    name: 'Early Bird',
    description: 'Complete 10 workouts before 7 AM',
    icon: '🌅',
    category: 'special',
    requirement: 'early_workouts >= 10',
    points: 200
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Complete 10 workouts after 9 PM',
    icon: '🦉',
    category: 'special',
    requirement: 'late_workouts >= 10',
    points: 200
  },
  {
    id: 'perfect-week',
    name: 'Perfect Execution',
    description: 'Complete all prescribed sets and reps for a week',
    icon: '✅',
    category: 'special',
    requirement: 'perfect_weeks >= 1',
    points: 300
  },
  // Combat / Training session badges
  {
    id: 'mat-rat-10',
    name: 'Mat Rat',
    description: 'Log 10 training sessions',
    icon: '🥋',
    category: 'special',
    requirement: 'training_sessions >= 10',
    points: 100
  },
  {
    id: 'mat-rat-50',
    name: 'Seasoned Fighter',
    description: 'Log 50 training sessions',
    icon: '🥊',
    category: 'special',
    requirement: 'training_sessions >= 50',
    points: 400
  },
  {
    id: 'mat-rat-100',
    name: 'Warrior',
    description: 'Log 100 training sessions',
    icon: '⚔️',
    category: 'special',
    requirement: 'training_sessions >= 100',
    points: 800
  },
  {
    id: 'dual-threat-30',
    name: 'Dual Threat',
    description: 'Train both lifting + combat/cardio on the same day 30 times',
    icon: '🔱',
    category: 'special',
    requirement: 'dual_training_days >= 30',
    points: 500
  },
  // Comeback badges
  {
    id: 'comeback-1',
    name: 'Comeback Kid',
    description: 'Return to training after a 7+ day break',
    icon: '💫',
    category: 'special',
    requirement: 'comebacks >= 1',
    points: 150
  },
  {
    id: 'comeback-3',
    name: 'Resilient',
    description: 'Come back 3 times — you never quit',
    icon: '🔄',
    category: 'special',
    requirement: 'comebacks >= 3',
    points: 400
  },
  // Weekly challenge badges
  {
    id: 'challenge-1',
    name: 'Challenge Accepted',
    description: 'Complete your first weekly challenge',
    icon: '🎪',
    category: 'special',
    requirement: 'challenges_completed >= 1',
    points: 100
  },
  {
    id: 'challenge-4',
    name: 'Monthly Challenger',
    description: 'Complete 4 weekly challenges',
    icon: '🏆',
    category: 'special',
    requirement: 'challenges_completed >= 4',
    points: 300
  },
  {
    id: 'challenge-12',
    name: 'Quarterly Champion',
    description: 'Complete 12 weekly challenges',
    icon: '👑',
    category: 'special',
    requirement: 'challenges_completed >= 12',
    points: 750
  },
  {
    id: 'challenge-52',
    name: 'Year of Challenges',
    description: 'Complete 52 weekly challenges',
    icon: '🌍',
    category: 'special',
    requirement: 'challenges_completed >= 52',
    points: 3000
  },
];

// Level thresholds — 50 levels
// Curve designed so an active user (~1,300 XP/week) reaches max in ~2 years
// and a casual user (~700 XP/week) in ~3.5 years
export const levelThresholds: number[] = [
  0,        // Level 1
  100,      // Level 2
  250,      // Level 3
  450,      // Level 4
  700,      // Level 5
  1000,     // Level 6
  1400,     // Level 7
  1900,     // Level 8
  2500,     // Level 9
  3200,     // Level 10
  4000,     // Level 11
  4900,     // Level 12
  5900,     // Level 13
  7000,     // Level 14
  8200,     // Level 15
  9600,     // Level 16
  11000,    // Level 17
  12600,    // Level 18
  14200,    // Level 19
  16000,    // Level 20
  18000,    // Level 21
  20000,    // Level 22
  22200,    // Level 23
  24600,    // Level 24
  27000,    // Level 25
  29600,    // Level 26
  32400,    // Level 27
  35200,    // Level 28
  38200,    // Level 29
  41400,    // Level 30
  44700,    // Level 31
  48200,    // Level 32
  51800,    // Level 33
  55600,    // Level 34
  59500,    // Level 35
  63600,    // Level 36
  67800,    // Level 37
  72300,    // Level 38
  76900,    // Level 39
  81600,    // Level 40
  86500,    // Level 41
  91700,    // Level 42
  97000,    // Level 43
  102500,   // Level 44
  108000,   // Level 45
  114000,   // Level 46
  120000,   // Level 47
  126500,   // Level 48
  133000,   // Level 49
  140000,   // Level 50
];

// Point rewards for various actions
export const pointRewards = {
  completeWorkout: 50,
  completeStrengthDay: 60,
  completeHypertrophyDay: 55,
  completePowerDay: 55,
  hitPR: 100,
  completeAllSets: 25,
  logWithNotes: 10,
  perfectRPE: 15,
  streakBonus: 10,          // Per day of streak (capped at 100)
  mesocycleComplete: 200,
  deloadCompliance: 50,
  weeklyChallenge: 75,      // Per challenge goal completed
  weeklyBonusAll: 150,      // Bonus for completing all 3 goals
  comebackBonus: 100,       // First workout back after 7+ day absence
  trainingSession: 30,      // Logging a training session
  smartRest: 25,            // Resting when readiness is low/critical
};

// Calculate level from total points
export function calculateLevel(totalPoints: number): number {
  for (let i = levelThresholds.length - 1; i >= 0; i--) {
    if (totalPoints >= levelThresholds[i]) {
      return i + 1;
    }
  }
  return 1;
}

// Calculate points needed for next level
export function pointsToNextLevel(totalPoints: number): number {
  const currentLevel = calculateLevel(totalPoints);
  if (currentLevel >= levelThresholds.length) {
    return 0; // Max level
  }
  return levelThresholds[currentLevel] - totalPoints;
}

// Calculate progress percentage to next level
export function levelProgress(totalPoints: number): number {
  const currentLevel = calculateLevel(totalPoints);
  if (currentLevel >= levelThresholds.length) {
    return 100; // Max level
  }
  const currentThreshold = levelThresholds[currentLevel - 1];
  const nextThreshold = levelThresholds[currentLevel];
  const progress = ((totalPoints - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  return Math.min(100, Math.max(0, progress));
}

// Calculate points earned from a workout
export function calculateWorkoutPoints(
  workoutLog: WorkoutLog,
  hadPR: boolean,
  currentStreak: number,
  comebackActive: boolean = false
): { points: number; breakdown: { reason: string; points: number }[] } {
  const breakdown: { reason: string; points: number }[] = [];
  let totalPoints = 0;

  // Base points for completing workout
  const workoutTypePoints = workoutLog.exercises.length > 0 ?
    pointRewards.completeWorkout : 0;
  totalPoints += workoutTypePoints;
  breakdown.push({ reason: 'Workout completed', points: workoutTypePoints });

  // PR bonus
  if (hadPR) {
    totalPoints += pointRewards.hitPR;
    breakdown.push({ reason: 'Personal Record!', points: pointRewards.hitPR });
  }

  // All sets completed bonus
  const allSetsCompleted = workoutLog.exercises.every(ex =>
    ex.sets.every(set => set.completed)
  );
  if (allSetsCompleted) {
    totalPoints += pointRewards.completeAllSets;
    breakdown.push({ reason: 'All sets completed', points: pointRewards.completeAllSets });
  }

  // Notes bonus (encourages detailed logging)
  if (workoutLog.notes && workoutLog.notes.length > 20) {
    totalPoints += pointRewards.logWithNotes;
    breakdown.push({ reason: 'Detailed notes', points: pointRewards.logWithNotes });
  }

  // Streak bonus
  if (currentStreak > 1) {
    const streakPoints = Math.min(currentStreak * pointRewards.streakBonus, 100);
    totalPoints += streakPoints;
    breakdown.push({ reason: `${currentStreak} day streak!`, points: streakPoints });
  }

  // Comeback bonus (2x multiplier on base points)
  if (comebackActive) {
    const bonus = pointRewards.comebackBonus;
    totalPoints += bonus;
    breakdown.push({ reason: 'Comeback bonus!', points: bonus });
  }

  return { points: totalPoints, breakdown };
}

// Check which badges the user has earned
export function checkNewBadges(
  stats: GamificationStats,
  userMetrics: {
    personalRecords: number;
    totalWorkouts: number;
    currentStreak: number;
    totalVolume: number;
    mesocyclesCompleted: number;
    gripExercises: number;
    turkishGetups: number;
    earlyWorkouts: number;
    lateWorkouts: number;
    perfectWeeks: number;
    oneRMIncreases: Record<string, number>;
    deadliftRatio?: number;
    totalTrainingSessions: number;
    dualTrainingDays: number;
    comebackCount: number;
    challengesCompleted: number;
  }
): Badge[] {
  const earnedBadgeIds = new Set(stats.badges.map(b => b.badgeId));
  const newBadges: Badge[] = [];

  for (const badge of badges) {
    if (earnedBadgeIds.has(badge.id)) continue;

    let earned = false;
    const req = badge.requirement;

    if (req.includes('personal_records')) {
      const threshold = parseInt(req.split('>=')[1].trim());
      earned = userMetrics.personalRecords >= threshold;
    }
    else if (req.includes('total_workouts')) {
      const threshold = parseInt(req.split('>=')[1].trim());
      earned = userMetrics.totalWorkouts >= threshold;
    }
    else if (req.startsWith('streak')) {
      const threshold = parseInt(req.split('>=')[1].trim());
      earned = userMetrics.currentStreak >= threshold;
    }
    else if (req.includes('total_volume')) {
      const threshold = parseInt(req.split('>=')[1].trim());
      earned = userMetrics.totalVolume >= threshold;
    }
    else if (req.includes('mesocycles_completed')) {
      const threshold = parseInt(req.split('>=')[1].trim());
      earned = userMetrics.mesocyclesCompleted >= threshold;
    }
    else if (req.includes('grip_exercises')) {
      const threshold = parseInt(req.split('>=')[1].trim());
      earned = userMetrics.gripExercises >= threshold;
    }
    else if (req.includes('turkish_getups')) {
      const threshold = parseInt(req.split('>=')[1].trim());
      earned = userMetrics.turkishGetups >= threshold;
    }
    else if (req.includes('early_workouts')) {
      const threshold = parseInt(req.split('>=')[1].trim());
      earned = userMetrics.earlyWorkouts >= threshold;
    }
    else if (req.includes('late_workouts')) {
      const threshold = parseInt(req.split('>=')[1].trim());
      earned = userMetrics.lateWorkouts >= threshold;
    }
    else if (req.includes('perfect_weeks')) {
      const threshold = parseInt(req.split('>=')[1].trim());
      earned = userMetrics.perfectWeeks >= threshold;
    }
    else if (req.includes('level')) {
      const threshold = parseInt(req.split('>=')[1].trim());
      earned = stats.level >= threshold;
    }
    else if (req.includes('1rm_increase')) {
      const threshold = parseInt(req.split('>=')[1].trim());
      earned = Object.values(userMetrics.oneRMIncreases).some(v => v >= threshold);
    }
    else if (req.includes('deadlift_ratio')) {
      const threshold = parseFloat(req.split('>=')[1].trim());
      earned = (userMetrics.deadliftRatio || 0) >= threshold;
    }
    else if (req.includes('training_sessions')) {
      const threshold = parseInt(req.split('>=')[1].trim());
      earned = userMetrics.totalTrainingSessions >= threshold;
    }
    else if (req.includes('dual_training_days')) {
      const threshold = parseInt(req.split('>=')[1].trim());
      earned = userMetrics.dualTrainingDays >= threshold;
    }
    else if (req.includes('comebacks')) {
      const threshold = parseInt(req.split('>=')[1].trim());
      earned = userMetrics.comebackCount >= threshold;
    }
    else if (req.includes('challenges_completed')) {
      const threshold = parseInt(req.split('>=')[1].trim());
      earned = userMetrics.challengesCompleted >= threshold;
    }
    else if (req.includes('weekly_completion')) {
      // Still handled externally
      earned = false;
    }
    else if (req.includes('balanced_training')) {
      earned = false; // Future implementation
    }

    if (earned) {
      newBadges.push(badge);
    }
  }

  return newBadges;
}

// Get badge by ID
export function getBadgeById(badgeId: string): Badge | undefined {
  return badges.find(b => b.id === badgeId);
}

// Get all badges in a category
export function getBadgesByCategory(category: BadgeCategory): Badge[] {
  return badges.filter(b => b.category === category);
}

// Calculate streak from workout logs
export function calculateStreak(workoutLogs: WorkoutLog[]): number {
  if (workoutLogs.length === 0) return 0;

  const sorted = [...workoutLogs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (const log of sorted) {
    const logDate = new Date(log.date);
    logDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor(
      (currentDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff <= 2) {
      streak++;
      currentDate = logDate;
    } else {
      break;
    }
  }

  return streak;
}

// ═══════════════════════════════════════════
// WEEKLY CHALLENGE SYSTEM
// ═══════════════════════════════════════════

function getMonday(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

export function generateWeeklyChallenge(
  trainingIdentity: TrainingIdentity | undefined,
  stats: GamificationStats,
  recentWeeklyAvg?: {
    workouts: number;
    volume: number;
    prs: number;
    sessions: number;
    dualDays: number;
  },
  sessionsPerWeek: number = 3
): WeeklyChallenge {
  const weekStart = getMonday(new Date());
  const isCombat = trainingIdentity === 'combat' || trainingIdentity === 'general_fitness';

  // Base targets on actual recent performance — stretch by 10-20% to be achievable yet challenging
  const avg = recentWeeklyAvg ?? { workouts: Math.min(2, sessionsPerWeek), volume: 4000 * sessionsPerWeek, prs: 0, sessions: 1, dualDays: 0 };
  const plannedSessions = Math.max(1, sessionsPerWeek);

  // Pool of possible goals per training identity
  type GoalTemplate = { type: WeeklyChallengeGoal['type']; target: number; desc: string; xp: number };

  // Workout targets: capped by the user's actual plan — never exceed sessionsPerWeek
  const workoutTarget = Math.min(plannedSessions, Math.max(1, Math.round(avg.workouts)));

  // Volume targets: per-session average × planned sessions, stretched 10-20%, rounded to 500
  const perSessionVol = avg.workouts > 0 ? avg.volume / avg.workouts : 4000;
  const weeklyVolForPlan = perSessionVol * plannedSessions;
  const volBase = Math.round(weeklyVolForPlan * 1.0 / 500) * 500;   // match plan
  const volStretch = Math.round(weeklyVolForPlan * 1.15 / 500) * 500; // 15% stretch

  // PR targets: always 1 — PRs are rare, shouldn't be forced
  const prTarget = 1;

  const commonGoals: GoalTemplate[] = [
    { type: 'workouts', target: workoutTarget, desc: `Complete ${workoutTarget} lifting session${workoutTarget !== 1 ? 's' : ''}`, xp: 75 },
    { type: 'volume', target: Math.max(1000, volBase), desc: `Lift ${Math.max(1000, volBase).toLocaleString()} kg total volume`, xp: 75 },
    { type: 'volume', target: Math.max(1500, volStretch), desc: `Lift ${Math.max(1500, volStretch).toLocaleString()} kg total volume`, xp: 100 },
    { type: 'prs', target: prTarget, desc: `Hit ${prTarget} personal record`, xp: 100 },
  ];

  // Combat-specific: based on actual training session frequency, capped by plan
  const sessionTarget = Math.max(1, Math.min(plannedSessions, Math.round(avg.sessions)));
  const dualTarget = Math.max(1, Math.min(plannedSessions, Math.round(avg.dualDays) || 1));

  const combatGoals: GoalTemplate[] = [
    { type: 'sessions', target: sessionTarget, desc: `Log ${sessionTarget} training session${sessionTarget !== 1 ? 's' : ''}`, xp: 75 },
    { type: 'dual_days', target: dualTarget, desc: `Train lifting + combat on the same day ${dualTarget} time${dualTarget !== 1 ? 's' : ''}`, xp: 125 },
  ];

  const pool = isCombat ? [...commonGoals, ...combatGoals] : commonGoals;

  // Pick 3 unique goal types
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const usedTypes = new Set<string>();
  const selected: GoalTemplate[] = [];

  for (const goal of shuffled) {
    if (selected.length >= 3) break;
    if (usedTypes.has(goal.type) && selected.length < 2) continue;
    if (!usedTypes.has(goal.type)) {
      usedTypes.add(goal.type);
      selected.push(goal);
    }
  }

  // Ensure we have 3
  while (selected.length < 3) {
    selected.push(commonGoals[selected.length % commonGoals.length]);
  }

  const goals: WeeklyChallengeGoal[] = selected.map(tmpl => {
    return {
      id: uuidv4(),
      type: tmpl.type,
      target: tmpl.target,
      current: 0,
      description: tmpl.desc,
      xpReward: tmpl.xp,
      completed: false,
    };
  });

  return {
    id: uuidv4(),
    weekStart,
    goals,
    allCompleteBonus: pointRewards.weeklyBonusAll,
    allCompleteBonusClaimed: false,
  };
}

export function isCurrentWeek(challenge: WeeklyChallenge): boolean {
  return challenge.weekStart === getMonday(new Date());
}

// ═══════════════════════════════════════════
// COMEBACK DETECTION
// ═══════════════════════════════════════════

export function detectComeback(lastActiveDate: string | null): boolean {
  if (!lastActiveDate) return false;
  const last = new Date(lastActiveDate);
  const now = new Date();
  const daysSince = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  return daysSince >= 7;
}

// ═══════════════════════════════════════════
// STREAK SHIELD
// ═══════════════════════════════════════════

export function shouldRefillShield(lastRefillDate: string): boolean {
  const lastMonday = getMonday(new Date());
  return lastRefillDate < lastMonday;
}

// Generate motivational message based on stats
export function getMotivationalMessage(stats: GamificationStats): string {
  const messages: string[] = [];

  if (stats.currentStreak > 0) {
    messages.push(
      `${stats.currentStreak} day streak - keep the momentum going!`,
      `You're on fire! ${stats.currentStreak} days strong.`,
      `Consistency is key - ${stats.currentStreak} days and counting!`
    );
  }

  if (stats.level >= 10) {
    messages.push(
      'Level 10+ - You\'re in the elite tier now!',
      'Your dedication is inspiring!',
      'A true iron warrior!'
    );
  }

  if (stats.personalRecords > 10) {
    messages.push(
      `${stats.personalRecords} PRs crushed - nothing stops you!`,
      'Your strength keeps growing!',
      'PR machine activated!'
    );
  }

  if (stats.totalWorkouts > 50) {
    messages.push(
      'Over 50 workouts - you\'re a seasoned athlete!',
      'The iron path is your home!',
      'Consistency master!'
    );
  }

  if (stats.comebackCount && stats.comebackCount > 0) {
    messages.push(
      'Champions fall and rise — you always come back!',
      'The comeback is always stronger than the setback.'
    );
  }

  // Default messages
  const defaults = [
    'Every rep counts. Let\'s get after it!',
    'The only bad workout is the one that didn\'t happen.',
    'Champions are built in the weight room.',
    'Strength is earned, never given.',
    'Train like a champion today!'
  ];

  const allMessages = messages.length > 0 ? messages : defaults;
  return allMessages[Math.floor(Math.random() * allMessages.length)];
}

// Level titles based on level (extended to 50)
export function getLevelTitle(level: number): string {
  if (level >= 50) return 'Living Legend';
  if (level >= 45) return 'Grandmaster';
  if (level >= 40) return 'Transcendent';
  if (level >= 35) return 'Legendary Athlete';
  if (level >= 30) return 'Legendary Fighter';
  if (level >= 25) return 'Master';
  if (level >= 20) return 'Elite Athlete';
  if (level >= 15) return 'Seasoned Veteran';
  if (level >= 10) return 'Dedicated Lifter';
  if (level >= 7) return 'Committed Athlete';
  if (level >= 5) return 'Rising Warrior';
  if (level >= 3) return 'Apprentice';
  return 'Novice';
}
