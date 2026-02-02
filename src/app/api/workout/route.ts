import { NextRequest, NextResponse } from 'next/server';
import { generateMesocycle, generateQuickWorkout } from '@/lib/workout-generator';
import { GoalFocus, Equipment, SessionsPerWeek } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      goalFocus,
      equipment,
      sessionsPerWeek,
      weeks = 5,
      quickWorkout = false,
      duration = 30
    } = body;

    // Validate required fields
    if (!userId || !goalFocus || !equipment || !sessionsPerWeek) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate enum values
    const validGoalFocus: GoalFocus[] = ['strength', 'hypertrophy', 'balanced', 'power'];
    const validEquipment: Equipment[] = ['full_gym', 'home_gym', 'minimal'];
    const validSessions: SessionsPerWeek[] = [2, 3];

    if (!validGoalFocus.includes(goalFocus)) {
      return NextResponse.json(
        { success: false, error: 'Invalid goal focus' },
        { status: 400 }
      );
    }

    if (!validEquipment.includes(equipment)) {
      return NextResponse.json(
        { success: false, error: 'Invalid equipment type' },
        { status: 400 }
      );
    }

    if (!validSessions.includes(sessionsPerWeek)) {
      return NextResponse.json(
        { success: false, error: 'Invalid sessions per week' },
        { status: 400 }
      );
    }

    // Generate workout
    if (quickWorkout) {
      const workout = generateQuickWorkout(equipment, duration, goalFocus);
      return NextResponse.json({
        success: true,
        data: workout,
        message: 'Quick workout generated successfully'
      });
    }

    const mesocycle = generateMesocycle({
      userId,
      goalFocus,
      equipment,
      sessionsPerWeek,
      weeks
    });

    return NextResponse.json({
      success: true,
      data: mesocycle,
      message: 'Mesocycle generated successfully'
    });

  } catch (error) {
    console.error('Workout generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate workout' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Workout API is running',
    endpoints: {
      POST: {
        description: 'Generate a new mesocycle or quick workout',
        body: {
          userId: 'string (required)',
          goalFocus: 'strength | hypertrophy | balanced | power (required)',
          equipment: 'full_gym | home_gym | minimal (required)',
          sessionsPerWeek: '2 | 3 (required)',
          weeks: 'number (optional, default: 5)',
          quickWorkout: 'boolean (optional, default: false)',
          duration: 'number (optional, for quick workout, default: 30)'
        }
      }
    }
  });
}
