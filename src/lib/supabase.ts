import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types for Supabase
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          age: number;
          experience_level: string;
          equipment: string;
          goal_focus: string;
          sessions_per_week: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          age: number;
          experience_level: string;
          equipment: string;
          goal_focus: string;
          sessions_per_week: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          age?: number;
          experience_level?: string;
          equipment?: string;
          goal_focus?: string;
          sessions_per_week?: number;
          updated_at?: string;
        };
      };
      baseline_lifts: {
        Row: {
          id: string;
          user_id: string;
          squat: number | null;
          deadlift: number | null;
          bench_press: number | null;
          overhead_press: number | null;
          barbell_row: number | null;
          pull_up: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          squat?: number | null;
          deadlift?: number | null;
          bench_press?: number | null;
          overhead_press?: number | null;
          barbell_row?: number | null;
          pull_up?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          squat?: number | null;
          deadlift?: number | null;
          bench_press?: number | null;
          overhead_press?: number | null;
          barbell_row?: number | null;
          pull_up?: number | null;
          updated_at?: string;
        };
      };
      mesocycles: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          start_date: string;
          end_date: string;
          weeks: Json;
          goal_focus: string;
          split_type: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          start_date: string;
          end_date: string;
          weeks: Json;
          goal_focus: string;
          split_type: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          end_date?: string;
          weeks?: Json;
          status?: string;
        };
      };
      workout_logs: {
        Row: {
          id: string;
          user_id: string;
          mesocycle_id: string;
          session_id: string;
          date: string;
          exercises: Json;
          total_volume: number;
          duration: number;
          overall_rpe: number;
          soreness: number;
          energy: number;
          notes: string | null;
          completed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mesocycle_id: string;
          session_id: string;
          date: string;
          exercises: Json;
          total_volume: number;
          duration: number;
          overall_rpe: number;
          soreness: number;
          energy: number;
          notes?: string | null;
          completed?: boolean;
          created_at?: string;
        };
        Update: {
          exercises?: Json;
          total_volume?: number;
          duration?: number;
          overall_rpe?: number;
          soreness?: number;
          energy?: number;
          notes?: string | null;
          completed?: boolean;
        };
      };
      gamification_stats: {
        Row: {
          id: string;
          user_id: string;
          total_points: number;
          level: number;
          current_streak: number;
          longest_streak: number;
          total_workouts: number;
          total_volume: number;
          personal_records: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          total_points?: number;
          level?: number;
          current_streak?: number;
          longest_streak?: number;
          total_workouts?: number;
          total_volume?: number;
          personal_records?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          total_points?: number;
          level?: number;
          current_streak?: number;
          longest_streak?: number;
          total_workouts?: number;
          total_volume?: number;
          personal_records?: number;
          updated_at?: string;
        };
      };
      user_badges: {
        Row: {
          id: string;
          user_id: string;
          badge_id: string;
          earned_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          badge_id: string;
          earned_at?: string;
        };
        Update: never;
      };
      strength_progress: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          exercise_id: string;
          exercise_name: string;
          estimated_1rm: number;
          actual_weight: number;
          reps: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          exercise_id: string;
          exercise_name: string;
          estimated_1rm: number;
          actual_weight: number;
          reps: number;
          created_at?: string;
        };
        Update: never;
      };
    };
  };
}
