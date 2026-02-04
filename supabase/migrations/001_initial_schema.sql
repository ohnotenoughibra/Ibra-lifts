-- Roots Gains Database Schema
-- Run this in your Supabase SQL editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 16 AND age <= 100),
    experience_level TEXT NOT NULL CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
    equipment TEXT NOT NULL CHECK (equipment IN ('full_gym', 'home_gym', 'minimal')),
    goal_focus TEXT NOT NULL CHECK (goal_focus IN ('strength', 'hypertrophy', 'balanced', 'power')),
    sessions_per_week INTEGER NOT NULL CHECK (sessions_per_week IN (2, 3)),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Baseline lifts for 1RM estimates
CREATE TABLE IF NOT EXISTS baseline_lifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    squat NUMERIC,
    deadlift NUMERIC,
    bench_press NUMERIC,
    overhead_press NUMERIC,
    barbell_row NUMERIC,
    pull_up NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Mesocycles (training blocks)
CREATE TABLE IF NOT EXISTS mesocycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    weeks JSONB NOT NULL, -- Stores full week/session structure
    goal_focus TEXT NOT NULL CHECK (goal_focus IN ('strength', 'hypertrophy', 'balanced', 'power')),
    split_type TEXT NOT NULL CHECK (split_type IN ('full_body', 'upper_lower', 'push_pull_legs', 'grappler_hybrid')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'upcoming')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout logs
CREATE TABLE IF NOT EXISTS workout_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    mesocycle_id UUID REFERENCES mesocycles(id) ON DELETE SET NULL,
    session_id TEXT NOT NULL,
    date DATE NOT NULL,
    exercises JSONB NOT NULL, -- Stores exercise logs with sets
    total_volume NUMERIC NOT NULL DEFAULT 0,
    duration INTEGER NOT NULL DEFAULT 0, -- minutes
    overall_rpe NUMERIC NOT NULL CHECK (overall_rpe >= 1 AND overall_rpe <= 10),
    soreness INTEGER NOT NULL CHECK (soreness >= 1 AND soreness <= 10),
    energy INTEGER NOT NULL CHECK (energy >= 1 AND energy <= 10),
    notes TEXT,
    completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gamification stats
CREATE TABLE IF NOT EXISTS gamification_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    total_points INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    total_workouts INTEGER NOT NULL DEFAULT 0,
    total_volume NUMERIC NOT NULL DEFAULT 0,
    personal_records INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- User badges (earned achievements)
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    badge_id TEXT NOT NULL,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- Strength progress tracking
CREATE TABLE IF NOT EXISTS strength_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    exercise_id TEXT NOT NULL,
    exercise_name TEXT NOT NULL,
    estimated_1rm NUMERIC NOT NULL,
    actual_weight NUMERIC NOT NULL,
    reps INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date ON workout_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_mesocycles_user_status ON mesocycles(user_id, status);
CREATE INDEX IF NOT EXISTS idx_strength_progress_user_exercise ON strength_progress(user_id, exercise_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);

-- Row Level Security (RLS) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE baseline_lifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesocycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE strength_progress ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only read/write their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Baseline lifts: Users can only access their own
CREATE POLICY "Users can view own baseline lifts" ON baseline_lifts
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own baseline lifts" ON baseline_lifts
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own baseline lifts" ON baseline_lifts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Mesocycles: Users can only access their own
CREATE POLICY "Users can view own mesocycles" ON mesocycles
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own mesocycles" ON mesocycles
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own mesocycles" ON mesocycles
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own mesocycles" ON mesocycles
    FOR DELETE USING (auth.uid() = user_id);

-- Workout logs: Users can only access their own
CREATE POLICY "Users can view own workout logs" ON workout_logs
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workout logs" ON workout_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workout logs" ON workout_logs
    FOR UPDATE USING (auth.uid() = user_id);

-- Gamification stats: Users can only access their own
CREATE POLICY "Users can view own gamification stats" ON gamification_stats
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own gamification stats" ON gamification_stats
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own gamification stats" ON gamification_stats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User badges: Users can only access their own
CREATE POLICY "Users can view own badges" ON user_badges
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own badges" ON user_badges
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Strength progress: Users can only access their own
CREATE POLICY "Users can view own strength progress" ON strength_progress
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own strength progress" ON strength_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_baseline_lifts_updated_at
    BEFORE UPDATE ON baseline_lifts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gamification_stats_updated_at
    BEFORE UPDATE ON gamification_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Profile will be created through onboarding flow
    RETURN NEW;
END;
$$ language 'plpgsql' security definer;

-- Optional: Trigger to handle new auth user
-- CREATE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW
--     EXECUTE FUNCTION public.handle_new_user();
