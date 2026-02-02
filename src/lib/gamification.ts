import { Badge, BadgeCategory, GamificationStats, WorkoutLog } from './types';

// Badge definitions
export const badges: Badge[] = [
  // STRENGTH BADGES
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
    id: 'pr-streak-20',
    name: 'Strength Beast',
    description: 'Hit 20 personal records',
    icon: '🦁',
    category: 'strength',
    requirement: 'personal_records >= 20',
    points: 500
  },
  {
    id: 'double-bodyweight-deadlift',
    name: 'Deadlift King',
    description: 'Deadlift double your bodyweight',
    icon: '👑',
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

  // CONSISTENCY BADGES
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
    description: 'Maintain a 7-day workout streak',
    icon: '🔥',
    category: 'consistency',
    requirement: 'streak >= 7',
    points: 200
  },
  {
    id: 'streak-30',
    name: 'Monthly Dedication',
    description: 'Maintain a 30-day workout streak',
    icon: '🌟',
    category: 'consistency',
    requirement: 'streak >= 30',
    points: 500
  },
  {
    id: 'streak-90',
    name: 'Unbreakable',
    description: 'Maintain a 90-day workout streak',
    icon: '💎',
    category: 'consistency',
    requirement: 'streak >= 90',
    points: 1500
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

  // VOLUME BADGES
  {
    id: 'volume-10k',
    name: 'Volume Seeker',
    description: 'Lift 10,000 lbs total volume',
    icon: '📊',
    category: 'volume',
    requirement: 'total_volume >= 10000',
    points: 100
  },
  {
    id: 'volume-100k',
    name: 'Volume Crusher',
    description: 'Lift 100,000 lbs total volume',
    icon: '📦',
    category: 'volume',
    requirement: 'total_volume >= 100000',
    points: 300
  },
  {
    id: 'volume-500k',
    name: 'Volume Legend',
    description: 'Lift 500,000 lbs total volume',
    icon: '🏛️',
    category: 'volume',
    requirement: 'total_volume >= 500000',
    points: 750
  },
  {
    id: 'volume-1m',
    name: 'Million Pound Club',
    description: 'Lift 1,000,000 lbs total volume',
    icon: '💰',
    category: 'volume',
    requirement: 'total_volume >= 1000000',
    points: 2000
  },

  // MILESTONE BADGES
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
    id: 'workouts-50',
    name: 'Committed',
    description: 'Complete 50 workouts',
    icon: '🌳',
    category: 'milestone',
    requirement: 'total_workouts >= 50',
    points: 300
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
    id: 'workouts-365',
    name: 'Year of Iron',
    description: 'Complete 365 workouts',
    icon: '📅',
    category: 'milestone',
    requirement: 'total_workouts >= 365',
    points: 2500
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

  // SPECIAL BADGES
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
  }
];

// Level thresholds (XP required to reach each level)
export const levelThresholds: number[] = [
  0,      // Level 1
  100,    // Level 2
  250,    // Level 3
  450,    // Level 4
  700,    // Level 5
  1000,   // Level 6
  1400,   // Level 7
  1900,   // Level 8
  2500,   // Level 9
  3200,   // Level 10
  4000,   // Level 11
  5000,   // Level 12
  6200,   // Level 13
  7600,   // Level 14
  9200,   // Level 15
  11000,  // Level 16
  13000,  // Level 17
  15500,  // Level 18
  18500,  // Level 19
  22000,  // Level 20
  26000,  // Level 21
  30500,  // Level 22
  35500,  // Level 23
  41000,  // Level 24
  47000,  // Level 25
  54000,  // Level 26
  62000,  // Level 27
  71000,  // Level 28
  81000,  // Level 29
  92000,  // Level 30
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
  perfectRPE: 15, // Hit target RPE exactly
  streakBonus: 10, // Per day of streak
  mesocycleComplete: 200,
  deloadCompliance: 50, // For actually taking the deload
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
  currentStreak: number
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
  }
): Badge[] {
  const earnedBadgeIds = new Set(stats.badges.map(b => b.badgeId));
  const newBadges: Badge[] = [];

  for (const badge of badges) {
    if (earnedBadgeIds.has(badge.id)) continue;

    let earned = false;

    // Check requirement
    const req = badge.requirement;

    if (req.includes('personal_records')) {
      const threshold = parseInt(req.split('>=')[1].trim());
      earned = userMetrics.personalRecords >= threshold;
    }
    else if (req.includes('total_workouts')) {
      const threshold = parseInt(req.split('>=')[1].trim());
      earned = userMetrics.totalWorkouts >= threshold;
    }
    else if (req.includes('streak')) {
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

  // Sort by date descending
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

    // Allow for rest days (max 2 days gap)
    if (daysDiff <= 2) {
      streak++;
      currentDate = logDate;
    } else {
      break;
    }
  }

  return streak;
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

  // Default messages
  const defaults = [
    'Every rep counts. Let\'s get after it!',
    'The only bad workout is the one that didn\'t happen.',
    'Grapplers are built in the weight room.',
    'Strength is earned, never given.',
    'Train like a champion today!'
  ];

  const allMessages = messages.length > 0 ? messages : defaults;
  return allMessages[Math.floor(Math.random() * allMessages.length)];
}

// Level titles based on level
export function getLevelTitle(level: number): string {
  if (level >= 30) return 'Legendary Grappler';
  if (level >= 25) return 'Master';
  if (level >= 20) return 'Elite Athlete';
  if (level >= 15) return 'Seasoned Veteran';
  if (level >= 10) return 'Dedicated Lifter';
  if (level >= 7) return 'Committed Athlete';
  if (level >= 5) return 'Rising Warrior';
  if (level >= 3) return 'Apprentice';
  return 'Novice';
}
