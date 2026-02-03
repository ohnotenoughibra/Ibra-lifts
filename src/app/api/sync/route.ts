import { NextRequest, NextResponse } from 'next/server';
import {
  isDatabaseAvailable,
  initializeDatabase,
  upsertProfile,
  insertWorkoutLog,
  upsertGamificationStats,
  insertStrengthProgress,
  getWorkoutLogs,
  getStrengthProgress
} from '@/lib/db';

// POST: Sync local data to Vercel Postgres
export async function POST(request: NextRequest) {
  try {
    const dbAvailable = await isDatabaseAvailable();
    if (!dbAvailable) {
      return NextResponse.json({
        success: false,
        error: 'Database not configured. App is running in local-only mode.',
        localOnly: true
      });
    }

    // Initialize tables if needed
    await initializeDatabase();

    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'syncProfile': {
        const result = await upsertProfile({
          id: data.id,
          email: data.email || '',
          name: data.name,
          age: data.age,
          experience_level: data.experienceLevel,
          equipment: data.equipment,
          goal_focus: data.goalFocus,
          sessions_per_week: data.sessionsPerWeek
        });
        return NextResponse.json({ success: result.success });
      }

      case 'syncWorkoutLog': {
        const result = await insertWorkoutLog({
          id: data.id,
          user_id: data.userId,
          mesocycle_id: data.mesocycleId,
          session_id: data.sessionId,
          date: new Date(data.date).toISOString().split('T')[0],
          exercises: data.exercises,
          total_volume: data.totalVolume,
          duration: data.duration,
          overall_rpe: data.overallRPE,
          soreness: data.soreness,
          energy: data.energy,
          notes: data.notes || null,
          completed: data.completed
        });
        return NextResponse.json({ success: result.success });
      }

      case 'syncGamification': {
        const result = await upsertGamificationStats({
          id: data.id,
          user_id: data.userId,
          total_points: data.totalPoints,
          level: data.level,
          current_streak: data.currentStreak,
          longest_streak: data.longestStreak,
          total_workouts: data.totalWorkouts,
          total_volume: data.totalVolume,
          personal_records: data.personalRecords
        });
        return NextResponse.json({ success: result.success });
      }

      case 'syncStrengthProgress': {
        const result = await insertStrengthProgress({
          id: data.id,
          user_id: data.userId,
          date: data.date,
          exercise_id: data.exerciseId,
          exercise_name: data.exerciseName,
          estimated_1rm: data.estimated1RM,
          actual_weight: data.actualWeight,
          reps: data.reps
        });
        return NextResponse.json({ success: result.success });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid sync action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { success: false, error: 'Sync failed - data is safe locally' },
      { status: 500 }
    );
  }
}

// GET: Fetch data from cloud
export async function GET(request: NextRequest) {
  try {
    const dbAvailable = await isDatabaseAvailable();
    if (!dbAvailable) {
      return NextResponse.json({
        success: false,
        localOnly: true,
        message: 'Database not configured. Using local storage.'
      });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId required' },
        { status: 400 }
      );
    }

    switch (type) {
      case 'workoutLogs': {
        const result = await getWorkoutLogs(userId);
        return NextResponse.json({ success: true, data: result.data });
      }
      case 'strengthProgress': {
        const exerciseId = searchParams.get('exerciseId') || undefined;
        const result = await getStrengthProgress(userId, exerciseId);
        return NextResponse.json({ success: true, data: result.data });
      }
      default:
        return NextResponse.json({
          success: true,
          message: 'Sync API available',
          dbConnected: true
        });
    }
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
