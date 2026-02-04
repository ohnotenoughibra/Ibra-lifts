import { NextRequest, NextResponse } from 'next/server';
import { generateMesocycle, generateQuickWorkout } from '@/lib/workout-generator';
import { z } from 'zod';

const workoutRequestSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  goalFocus: z.enum(['strength', 'hypertrophy', 'balanced', 'power']),
  equipment: z.enum(['full_gym', 'home_gym', 'minimal']),
  sessionsPerWeek: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
  weeks: z.number().int().min(1).max(12).optional().default(5),
  quickWorkout: z.boolean().optional().default(false),
  duration: z.number().int().min(10).max(120).optional().default(30),
  periodizationType: z.enum(['linear', 'undulating', 'block']).optional().default('undulating'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = workoutRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues.map(i => i.message).join('; ') },
        { status: 400 }
      );
    }

    const { userId, goalFocus, equipment, sessionsPerWeek, weeks, quickWorkout, duration, periodizationType } = parsed.data;

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
      weeks,
      periodizationType,
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
          sessionsPerWeek: '1-6 (required)',
          weeks: 'number (optional, default: 5)',
          quickWorkout: 'boolean (optional, default: false)',
          duration: 'number (optional, for quick workout, default: 30)'
        }
      }
    }
  });
}
