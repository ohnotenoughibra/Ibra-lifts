import { NextRequest, NextResponse } from 'next/server';
import { calculate1RM, suggestAdjustments } from '@/lib/workout-generator';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'calculate1RM': {
        const { weight, reps } = data;
        if (!weight || !reps) {
          return NextResponse.json(
            { success: false, error: 'Weight and reps are required' },
            { status: 400 }
          );
        }
        const estimated1RM = calculate1RM(weight, reps);
        return NextResponse.json({
          success: true,
          data: { estimated1RM, weight, reps }
        });
      }

      case 'suggestAdjustments': {
        const { lastSessionRPE, soreness, performanceRating } = data;
        if (lastSessionRPE === undefined || soreness === undefined || performanceRating === undefined) {
          return NextResponse.json(
            { success: false, error: 'RPE, soreness, and performance rating are required' },
            { status: 400 }
          );
        }
        const suggestions = suggestAdjustments(lastSessionRPE, soreness, performanceRating);
        return NextResponse.json({
          success: true,
          data: suggestions
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Progress API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Progress API is running',
    endpoints: {
      POST: {
        actions: {
          calculate1RM: {
            description: 'Calculate estimated 1RM from weight and reps',
            data: { weight: 'number', reps: 'number' }
          },
          suggestAdjustments: {
            description: 'Get training adjustment suggestions based on feedback',
            data: {
              lastSessionRPE: 'number (1-10)',
              soreness: 'number (1-10)',
              performanceRating: 'number (1-10)'
            }
          }
        }
      }
    }
  });
}
