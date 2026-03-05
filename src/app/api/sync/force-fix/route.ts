import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * GET /api/sync/force-fix
 *
 * Serves a standalone HTML page that:
 * 1. Unregisters the service worker (clears cached JS)
 * 2. Fetches the correct server data
 * 3. Writes it directly to localStorage
 * 4. Redirects to the app
 *
 * This bypasses ALL client-side caching. Just navigate to this URL.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse(
        '<html><body style="background:#111;color:#fff;font-family:system-ui;padding:40px"><h2>Not logged in</h2><p>Open the app first, log in, then come back to this URL.</p></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const { rows } = await sql`
      SELECT data FROM user_store WHERE user_id = ${session.user.id}
    `;

    if (rows.length === 0) {
      return new NextResponse(
        '<html><body style="background:#111;color:#fff;font-family:system-ui;padding:40px"><h2>No data found</h2><p>No cloud data for your account.</p></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const serverData = rows[0].data as Record<string, unknown>;
    const gam = serverData.gamificationStats as Record<string, unknown> | undefined;
    const serverDataJson = JSON.stringify(serverData);

    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Roots Gains — Force Sync</title></head>
<body style="background:#111;color:#fff;font-family:system-ui;padding:40px;max-width:500px;margin:0 auto">
<h2>Force Sync</h2>
<p>Server data: <strong>Level ${gam?.level || '?'}</strong>, <strong>${gam?.totalPoints || 0} XP</strong>, streak <strong>${gam?.currentStreak || 0}</strong></p>
<div id="status" style="padding:16px;border-radius:12px;background:#222;margin:20px 0">Preparing...</div>
<script>
(async function() {
  const status = document.getElementById('status');

  // Step 1: Unregister all service workers
  status.textContent = 'Step 1/3: Clearing service workers...';
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      await reg.unregister();
    }
  }

  // Step 2: Clear all caches
  status.textContent = 'Step 2/3: Clearing caches...';
  if ('caches' in window) {
    const keys = await caches.keys();
    for (const key of keys) {
      await caches.delete(key);
    }
  }

  // Step 3: Write server data to localStorage
  status.textContent = 'Step 3/3: Applying server data...';
  try {
    const serverData = ${serverDataJson};
    const storageKey = 'roots-gains-storage';
    const existing = localStorage.getItem(storageKey);
    if (existing) {
      const parsed = JSON.parse(existing);
      // Merge server data into the Zustand persisted state
      if (parsed.state) {
        const restoreFields = [
          'user', 'isAuthenticated', 'onboardingData', 'baselineLifts',
          'currentMesocycle', 'mesocycleHistory', 'mesocycleQueue', 'workoutLogs', 'gamificationStats',
          'bodyWeightLog', 'injuryLog', 'customExercises', 'sessionTemplates',
          'hrSessions', 'trainingSessions', 'themeMode', 'colorTheme', 'meals', 'macroTargets',
          'waterLog', 'activeDietPhase', 'dietPhaseHistory', 'weeklyCheckIns', 'bodyComposition',
          'muscleEmphasis', 'competitions', 'subscription', 'quickLogs',
          'gripTests', 'gripExerciseLogs', 'activeEquipmentProfile',
          'notificationPreferences', 'workoutSkips', 'illnessLogs', 'cycleLogs',
          'mealReminders', 'dailyLoginBonus',
          'weightCutPlans', 'combatNutritionProfile', 'fightCampPlans',
          'activeSupplements', 'supplementStack', 'supplementIntakes', 'homeGymEquipment',
          'mentalCheckIns', 'confidenceLedger', 'featureFeedback',
          'seenInsights', 'dismissedInsights', 'readArticles', 'bookmarkedArticles', 'lastInsightDate',
          'nutritionPeriodPlan', 'mealStamps', 'isOnboarded',
        ];
        for (const field of restoreFields) {
          if (serverData[field] !== undefined) {
            parsed.state[field] = serverData[field];
          }
        }
        parsed.state.lastSyncAt = Date.now();
        localStorage.setItem(storageKey, JSON.stringify(parsed));
      }
    }

    status.innerHTML = '<span style="color:#4ade80">Done! Redirecting...</span>';
    setTimeout(() => { window.location.href = '/'; }, 1500);
  } catch(e) {
    status.innerHTML = '<span style="color:#f87171">Error: ' + e.message + '</span>';
  }
})();
</script>
</body>
</html>`,
      { headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Force fix error:', error);
    return new NextResponse(
      '<html><body style="background:#111;color:#fff;font-family:system-ui;padding:40px"><h2>Error</h2><p>Something went wrong. Try again.</p></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}
