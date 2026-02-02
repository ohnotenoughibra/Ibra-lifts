import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Tailwind CSS class merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date for display
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Format time for display
export function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// Format weight with unit
export function formatWeight(weight: number, unit: 'lbs' | 'kg' = 'lbs'): string {
  return `${weight.toFixed(1)} ${unit}`;
}

// Format large numbers with commas
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

// Format percentage
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// Calculate percentage change
export function percentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

// Get relative time (e.g., "2 days ago")
export function getRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

// Get week number of the year
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Get day of week name
export function getDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

// Generate a random color for charts
export function generateChartColor(index: number): string {
  const colors = [
    '#0ea5e9', // primary blue
    '#d946ef', // accent purple
    '#22c55e', // success green
    '#f59e0b', // warning amber
    '#ef4444', // error red
    '#8b5cf6', // hypertrophy purple
    '#f97316', // power orange
    '#06b6d4', // cyan
    '#ec4899', // pink
    '#84cc16', // lime
  ];
  return colors[index % colors.length];
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Local storage helpers with SSR safety
export const storage = {
  get: <T>(key: string, defaultValue: T): T => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set: <T>(key: string, value: T): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.error('Failed to save to localStorage');
    }
  },
  remove: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch {
      console.error('Failed to remove from localStorage');
    }
  }
};

// RPE to percentage converter
export function rpeToPercentage(rpe: number): number {
  // Based on RPE chart
  const rpeMap: Record<number, number> = {
    10: 100,
    9.5: 97.5,
    9: 95,
    8.5: 92.5,
    8: 90,
    7.5: 87.5,
    7: 85,
    6.5: 82.5,
    6: 80,
    5: 75,
  };
  return rpeMap[rpe] || 85;
}

// Percentage to RPE converter
export function percentageToRpe(percentage: number): number {
  if (percentage >= 100) return 10;
  if (percentage >= 97.5) return 9.5;
  if (percentage >= 95) return 9;
  if (percentage >= 92.5) return 8.5;
  if (percentage >= 90) return 8;
  if (percentage >= 87.5) return 7.5;
  if (percentage >= 85) return 7;
  if (percentage >= 82.5) return 6.5;
  if (percentage >= 80) return 6;
  return 5;
}

// Plate calculator (for loading a barbell)
export function calculatePlates(
  targetWeight: number,
  barWeight: number = 45,
  availablePlates: number[] = [45, 35, 25, 10, 5, 2.5]
): { plates: { weight: number; count: number }[]; achievable: number } {
  const weightPerSide = (targetWeight - barWeight) / 2;
  const plates: { weight: number; count: number }[] = [];
  let remaining = weightPerSide;

  for (const plate of availablePlates) {
    const count = Math.floor(remaining / plate);
    if (count > 0) {
      plates.push({ weight: plate, count });
      remaining -= count * plate;
    }
  }

  const achievablePerSide = weightPerSide - remaining;
  const achievable = barWeight + achievablePerSide * 2;

  return { plates, achievable };
}

// Warm-up set calculator
export function calculateWarmupSets(
  workingWeight: number,
  workingReps: number
): { weight: number; reps: number }[] {
  const warmups: { weight: number; reps: number }[] = [];

  // Empty bar (or 50% of working weight if using light weights)
  const barWeight = Math.min(45, workingWeight * 0.5);
  warmups.push({ weight: barWeight, reps: 10 });

  // Progressive warm-up sets
  const percentages = [0.5, 0.7, 0.85];
  const reps = [8, 5, 3];

  for (let i = 0; i < percentages.length; i++) {
    const weight = Math.round((workingWeight * percentages[i]) / 5) * 5;
    if (weight > barWeight) {
      warmups.push({ weight, reps: reps[i] });
    }
  }

  return warmups;
}

// Validate email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Generate workout session ID based on date and type
export function generateSessionId(date: Date, dayNumber: number): string {
  const dateStr = date.toISOString().split('T')[0];
  return `${dateStr}-day${dayNumber}`;
}

// Calculate total volume from exercise logs
export function calculateTotalVolume(
  exercises: { sets: { weight: number; reps: number; completed: boolean }[] }[]
): number {
  return exercises.reduce((total, exercise) => {
    return total + exercise.sets.reduce((setTotal, set) => {
      return setTotal + (set.completed ? set.weight * set.reps : 0);
    }, 0);
  }, 0);
}

// Get streak status message
export function getStreakMessage(streak: number): string {
  if (streak === 0) return 'Start your streak today!';
  if (streak < 3) return `${streak} day streak - keep it going!`;
  if (streak < 7) return `${streak} days strong! Almost a week!`;
  if (streak < 14) return `${streak} day streak! You're on fire!`;
  if (streak < 30) return `${streak} days! Incredible dedication!`;
  return `${streak} days! Legendary commitment!`;
}
