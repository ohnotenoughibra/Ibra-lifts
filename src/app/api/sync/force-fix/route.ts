import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { calculateLevel } from '@/lib/gamification';

/**
 * GET /api/sync/force-fix?xp=8178&streak=29
 *
 * Nuclear option: fixes BOTH the server AND the browser in one URL visit.
 * If xp/streak params are provided and higher than server values, updates server first.
 * Then clears service workers, writes correct data to localStorage, redirects to app.
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse(
        '<html><body style="background:#111;color:#fff;font-family:system-ui;padding:40px"><h2>Not logged in</h2><p>Open the app first, log in, then come back to this URL.</p></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const { searchParams } = new URL(request.url);
    const manualXP = Number(searchParams.get('xp')) || 0;
    const manualStreak = Number(searchParams.get('streak')) || 0;

    const { rows } = await sql`
      SELECT data FROM user_store WHERE user_id = ${session.user.id}
    `;

    if (rows.length === 0) {
      return new NextResponse(
        '<html><body style="background:#111;color:#fff;font-family:system-ui;padding:40px"><h2>No data found</h2></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const serverData = rows[0].data as Record<string, unknown>;
    const gam = (serverData.gamificationStats || {}) as Record<string, unknown>;
    const currentXP = Number(gam.totalPoints) || 0;
    const currentStreak = Number(gam.currentStreak) || 0;
    const currentLongestStreak = Number(gam.longestStreak) || 0;

    // Fix server data if manual values are higher
    const bestXP = Math.max(currentXP, manualXP);
    const bestStreak = Math.max(currentStreak, manualStreak);
    const bestLongestStreak = Math.max(currentLongestStreak, manualStreak);
    const bestLevel = calculateLevel(bestXP);
    let serverFixed = false;

    if (bestXP > currentXP || bestStreak > currentStreak) {
      const fixedGam = {
        ...gam,
        totalPoints: bestXP,
        level: bestLevel,
        currentStreak: bestStreak,
        longestStreak: bestLongestStreak,
      };
      const fixedData = { ...serverData, gamificationStats: fixedGam };
      const jsonData = JSON.stringify(fixedData);
      await sql`
        UPDATE user_store SET data = ${jsonData}::jsonb, updated_at = NOW()
        WHERE user_id = ${session.user.id}
      `;
      // Re-read for the localStorage write below
      serverData.gamificationStats = fixedGam;
      serverFixed = true;
    }

    const finalGam = serverData.gamificationStats as Record<string, unknown>;
    const serverDataJson = JSON.stringify(serverData);

    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Force Sync</title></head>
<body style="background:#111;color:#fff;font-family:system-ui;padding:40px;max-width:500px;margin:0 auto">
<h2>Force Sync</h2>
<p><strong>Level ${finalGam.level}</strong> &bull; <strong>${finalGam.totalPoints} XP</strong> &bull; Streak <strong>${finalGam.currentStreak}</strong></p>
${serverFixed ? '<p style="color:#4ade80">Server data was corrected!</p>' : ''}
${manualXP === 0 ? '<p style="color:#facc15">Tip: Add ?xp=8178&streak=29 to the URL to fix server values</p>' : ''}
<div id="status" style="padding:16px;border-radius:12px;background:#222;margin:20px 0">Preparing...</div>
<script>
(async function() {
  var status = document.getElementById('status');
  try {
    status.textContent = 'Clearing service workers & caches...';
    if ('serviceWorker' in navigator) {
      var regs = await navigator.serviceWorker.getRegistrations();
      for (var i = 0; i < regs.length; i++) await regs[i].unregister();
    }
    if ('caches' in window) {
      var keys = await caches.keys();
      for (var i = 0; i < keys.length; i++) await caches.delete(keys[i]);
    }

    status.textContent = 'Writing server data to localStorage...';
    var serverData = ${serverDataJson};
    var storageKey = 'roots-gains-storage';
    var raw = localStorage.getItem(storageKey);
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed.state) {
        var fields = ${JSON.stringify([
          'user', 'isAuthenticated', 'isOnboarded', 'onboardingData', 'baselineLifts',
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
          'nutritionPeriodPlan', 'mealStamps',
        ])};
        for (var i = 0; i < fields.length; i++) {
          if (serverData[fields[i]] !== undefined) parsed.state[fields[i]] = serverData[fields[i]];
        }
        parsed.state.lastSyncAt = Date.now();
        localStorage.setItem(storageKey, JSON.stringify(parsed));
      }
    } else {
      // No existing localStorage — create fresh
      var state = {};
      for (var key in serverData) state[key] = serverData[key];
      state.lastSyncAt = Date.now();
      localStorage.setItem(storageKey, JSON.stringify({ state: state, version: 0 }));
    }

    status.innerHTML = '<span style="color:#4ade80">Done! Redirecting in 2 seconds...</span>';
    setTimeout(function() { window.location.href = '/'; }, 2000);
  } catch(e) {
    status.innerHTML = '<span style="color:#f87171">Error: ' + e.message + '</span>';
  }
})();
</script>
</body>
</html>`,
      { headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store, no-cache' } }
    );
  } catch (error) {
    console.error('Force fix error:', error);
    return new NextResponse(
      '<html><body style="background:#111;color:#fff;font-family:system-ui;padding:40px"><h2>Error</h2><p>' + String(error) + '</p></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}
