import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/debug/sync-status
 *
 * Production-safe sync diagnostic: shows data counts stored on the server
 * so we can compare with what the client sees.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    }

    const userId = session.user.id;
    const { rows } = await sql`
      SELECT data, updated_at FROM user_store WHERE user_id = ${userId}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ server: null, message: 'No data on server' });
    }

    const data = rows[0].data as Record<string, unknown>;
    const meals = Array.isArray(data?.meals) ? data.meals : [];
    const waterLog = (data?.waterLog && typeof data.waterLog === 'object') ? data.waterLog as Record<string, unknown> : {};
    const supplementIntakes = Array.isArray(data?.supplementIntakes) ? data.supplementIntakes : [];
    const supplementStack = Array.isArray(data?.supplementStack) ? data.supplementStack : [];
    const workoutLogs = Array.isArray(data?.workoutLogs) ? data.workoutLogs : [];
    const mealStamps = Array.isArray(data?.mealStamps) ? data.mealStamps : [];
    const quickAccessPins = Array.isArray(data?._quickAccessPins) ? data._quickAccessPins : [];

    return NextResponse.json({
      serverUpdatedAt: rows[0].updated_at,
      lastSyncAt: data?.lastSyncAt,
      _lastDevice: data?._lastDevice,
      _lastDeviceUA: data?._lastDeviceUA ? String(data._lastDeviceUA).slice(0, 80) : null,
      counts: {
        meals: meals.length,
        mealsLast3: meals.slice(-3).map((m: Record<string, unknown>) => ({
          id: String(m.id).slice(0, 8),
          date: m.date,
          name: m.name || m.description || '(unnamed)',
        })),
        waterLogDays: Object.keys(waterLog).length,
        waterLogRecent: Object.entries(waterLog).slice(-5).map(([date, val]) => ({ date, glasses: val })),
        supplementIntakes: supplementIntakes.length,
        supplementStack: supplementStack.length,
        workoutLogs: workoutLogs.length,
        mealStamps: mealStamps.length,
        quickAccessPins: quickAccessPins.length,
        pinValues: quickAccessPins,
      },
      hasFields: {
        meals: Array.isArray(data?.meals),
        waterLog: !!data?.waterLog,
        supplementIntakes: Array.isArray(data?.supplementIntakes),
        supplementStack: Array.isArray(data?.supplementStack),
        macroTargets: !!data?.macroTargets,
        activeDietPhase: !!data?.activeDietPhase,
        nutritionPeriodPlan: !!data?.nutritionPeriodPlan,
        combatNutritionProfile: !!data?.combatNutritionProfile,
        mealStamps: Array.isArray(data?.mealStamps),
        mealReminders: !!data?.mealReminders,
        _quickAccessPins: Array.isArray(data?._quickAccessPins),
      },
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('Sync status error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
