import { sql } from '@vercel/postgres';

// Database helper functions using Vercel Postgres (Neon)
// All data is also persisted locally via Zustand/localStorage as a fallback

export async function initializeDatabase() {
  try {
    // Create tables if they don't exist
    await sql`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        experience_level TEXT NOT NULL,
        equipment TEXT NOT NULL,
        goal_focus TEXT NOT NULL,
        sessions_per_week INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS baseline_lifts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        squat NUMERIC,
        deadlift NUMERIC,
        bench_press NUMERIC,
        overhead_press NUMERIC,
        barbell_row NUMERIC,
        pull_up NUMERIC,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS mesocycles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        weeks JSONB NOT NULL,
        goal_focus TEXT NOT NULL,
        split_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS workout_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        mesocycle_id TEXT,
        session_id TEXT NOT NULL,
        date DATE NOT NULL,
        exercises JSONB NOT NULL,
        total_volume NUMERIC NOT NULL DEFAULT 0,
        duration INTEGER NOT NULL DEFAULT 0,
        overall_rpe NUMERIC NOT NULL,
        soreness INTEGER NOT NULL,
        energy INTEGER NOT NULL,
        notes TEXT,
        completed BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS gamification_stats (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        total_points INTEGER NOT NULL DEFAULT 0,
        level INTEGER NOT NULL DEFAULT 1,
        current_streak INTEGER NOT NULL DEFAULT 0,
        longest_streak INTEGER NOT NULL DEFAULT 0,
        total_workouts INTEGER NOT NULL DEFAULT 0,
        total_volume NUMERIC NOT NULL DEFAULT 0,
        personal_records INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS user_badges (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        badge_id TEXT NOT NULL,
        earned_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, badge_id)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS strength_progress (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date DATE NOT NULL,
        exercise_id TEXT NOT NULL,
        exercise_name TEXT NOT NULL,
        estimated_1rm NUMERIC NOT NULL,
        actual_weight NUMERIC NOT NULL,
        reps INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    return { success: true };
  } catch (error) {
    console.error('Database initialization error:', error);
    return { success: false, error };
  }
}

// Profile operations
export async function upsertProfile(profile: {
  id: string;
  email: string;
  name: string;
  age: number;
  experience_level: string;
  equipment: string;
  goal_focus: string;
  sessions_per_week: number;
}) {
  try {
    await sql`
      INSERT INTO profiles (id, email, name, age, experience_level, equipment, goal_focus, sessions_per_week)
      VALUES (${profile.id}, ${profile.email}, ${profile.name}, ${profile.age},
              ${profile.experience_level}, ${profile.equipment}, ${profile.goal_focus}, ${profile.sessions_per_week})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        age = EXCLUDED.age,
        experience_level = EXCLUDED.experience_level,
        equipment = EXCLUDED.equipment,
        goal_focus = EXCLUDED.goal_focus,
        sessions_per_week = EXCLUDED.sessions_per_week,
        updated_at = NOW()
    `;
    return { success: true };
  } catch (error) {
    console.error('Upsert profile error:', error);
    return { success: false, error };
  }
}

export async function getProfile(userId: string) {
  try {
    const result = await sql`SELECT * FROM profiles WHERE id = ${userId}`;
    return { success: true, data: result.rows[0] || null };
  } catch (error) {
    console.error('Get profile error:', error);
    return { success: false, error, data: null };
  }
}

// Workout log operations
export async function insertWorkoutLog(log: {
  id: string;
  user_id: string;
  mesocycle_id: string;
  session_id: string;
  date: string;
  exercises: any;
  total_volume: number;
  duration: number;
  overall_rpe: number;
  soreness: number;
  energy: number;
  notes: string | null;
  completed: boolean;
}) {
  try {
    await sql`
      INSERT INTO workout_logs (id, user_id, mesocycle_id, session_id, date, exercises,
        total_volume, duration, overall_rpe, soreness, energy, notes, completed)
      VALUES (${log.id}, ${log.user_id}, ${log.mesocycle_id}, ${log.session_id},
        ${log.date}, ${JSON.stringify(log.exercises)}, ${log.total_volume}, ${log.duration},
        ${log.overall_rpe}, ${log.soreness}, ${log.energy}, ${log.notes}, ${log.completed})
    `;
    return { success: true };
  } catch (error) {
    console.error('Insert workout log error:', error);
    return { success: false, error };
  }
}

export async function getWorkoutLogs(userId: string, limit: number = 50) {
  try {
    const result = await sql`
      SELECT * FROM workout_logs
      WHERE user_id = ${userId}
      ORDER BY date DESC
      LIMIT ${limit}
    `;
    return { success: true, data: result.rows };
  } catch (error) {
    console.error('Get workout logs error:', error);
    return { success: false, error, data: [] };
  }
}

// Gamification operations
export async function upsertGamificationStats(stats: {
  id: string;
  user_id: string;
  total_points: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  total_workouts: number;
  total_volume: number;
  personal_records: number;
}) {
  try {
    await sql`
      INSERT INTO gamification_stats (id, user_id, total_points, level, current_streak,
        longest_streak, total_workouts, total_volume, personal_records)
      VALUES (${stats.id}, ${stats.user_id}, ${stats.total_points}, ${stats.level},
        ${stats.current_streak}, ${stats.longest_streak}, ${stats.total_workouts},
        ${stats.total_volume}, ${stats.personal_records})
      ON CONFLICT (user_id) DO UPDATE SET
        total_points = EXCLUDED.total_points,
        level = EXCLUDED.level,
        current_streak = EXCLUDED.current_streak,
        longest_streak = EXCLUDED.longest_streak,
        total_workouts = EXCLUDED.total_workouts,
        total_volume = EXCLUDED.total_volume,
        personal_records = EXCLUDED.personal_records,
        updated_at = NOW()
    `;
    return { success: true };
  } catch (error) {
    console.error('Upsert gamification stats error:', error);
    return { success: false, error };
  }
}

// Strength progress operations
export async function insertStrengthProgress(entry: {
  id: string;
  user_id: string;
  date: string;
  exercise_id: string;
  exercise_name: string;
  estimated_1rm: number;
  actual_weight: number;
  reps: number;
}) {
  try {
    await sql`
      INSERT INTO strength_progress (id, user_id, date, exercise_id, exercise_name,
        estimated_1rm, actual_weight, reps)
      VALUES (${entry.id}, ${entry.user_id}, ${entry.date}, ${entry.exercise_id},
        ${entry.exercise_name}, ${entry.estimated_1rm}, ${entry.actual_weight}, ${entry.reps})
    `;
    return { success: true };
  } catch (error) {
    console.error('Insert strength progress error:', error);
    return { success: false, error };
  }
}

export async function getStrengthProgress(userId: string, exerciseId?: string) {
  try {
    let result;
    if (exerciseId) {
      result = await sql`
        SELECT * FROM strength_progress
        WHERE user_id = ${userId} AND exercise_id = ${exerciseId}
        ORDER BY date DESC
      `;
    } else {
      result = await sql`
        SELECT * FROM strength_progress
        WHERE user_id = ${userId}
        ORDER BY date DESC
      `;
    }
    return { success: true, data: result.rows };
  } catch (error) {
    console.error('Get strength progress error:', error);
    return { success: false, error, data: [] };
  }
}

// Check if database is available (graceful fallback to localStorage)
export async function isDatabaseAvailable(): Promise<boolean> {
  try {
    if (!process.env.POSTGRES_URL) return false;
    await sql`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
