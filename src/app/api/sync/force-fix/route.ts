import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * GET /api/sync/force-fix
 *
 * Standalone sync page that bypasses ALL cached app code.
 * Two buttons:
 *   "Push to Cloud"  — sends this device's localStorage to the server
 *   "Pull from Cloud" — overwrites this device's localStorage with server data
 *
 * Use PUSH on the device with correct data (phone).
 * Use PULL on devices that need to catch up (laptop).
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse(
        `<html><body style="background:#111;color:#fff;font-family:system-ui;padding:40px">
        <h2>Not logged in</h2><p>Open the app first, log in, then come back to this URL.</p>
        </body></html>`,
        { headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' } }
      );
    }

    const userId = session.user.id;

    // Get server state summary
    let serverSummary = 'No data on server';
    try {
      const { rows } = await sql`SELECT data FROM user_store WHERE user_id = ${userId}`;
      if (rows.length > 0 && rows[0].data) {
        const d = rows[0].data as Record<string, unknown>;
        const g = (d.gamificationStats || {}) as Record<string, unknown>;
        const u = (d.user || {}) as Record<string, unknown>;
        serverSummary = `Level ${g.level || '?'} • ${g.totalPoints || 0} XP • Streak ${g.currentStreak || 0} • ${(Array.isArray(d.workoutLogs) ? d.workoutLogs.length : 0)} workouts • ${(Array.isArray(d.meals) ? d.meals.length : 0)} meals • Name: ${u.name || '?'}`;
      }
    } catch { /* table may not exist */ }

    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Force Sync</title></head>
<body style="background:#111;color:#fff;font-family:system-ui;padding:20px;max-width:500px;margin:0 auto">
<h2 style="margin-bottom:4px">Force Sync</h2>
<p style="color:#999;font-size:13px;margin-top:0">Bypasses cached app code. Works on any browser.</p>

<div style="background:#1a1a2e;border:1px solid #333;border-radius:12px;padding:16px;margin:16px 0">
  <p style="color:#999;font-size:11px;text-transform:uppercase;margin:0 0 8px">This Device (localStorage)</p>
  <p id="local-summary" style="font-size:13px;margin:0">Loading...</p>
</div>

<div style="background:#1a2e1a;border:1px solid #333;border-radius:12px;padding:16px;margin:16px 0">
  <p style="color:#999;font-size:11px;text-transform:uppercase;margin:0 0 8px">Server (Cloud)</p>
  <p style="font-size:13px;margin:0">${serverSummary}</p>
</div>

<div id="status" style="padding:12px;border-radius:8px;background:#222;margin:16px 0;font-size:13px;display:none"></div>

<button id="btn-push" onclick="doPush()" style="width:100%;padding:14px;border-radius:12px;border:1px solid #f59e0b;background:#f59e0b22;color:#f59e0b;font-size:14px;font-weight:600;cursor:pointer;margin:8px 0">
  ⬆ Push This Device → Cloud
</button>
<p style="color:#777;font-size:11px;text-align:center;margin:2px 0 16px">Use on the device with CORRECT data (your phone)</p>

<button id="btn-pull" onclick="doPull()" style="width:100%;padding:14px;border-radius:12px;border:1px solid #3b82f6;background:#3b82f622;color:#3b82f6;font-size:14px;font-weight:600;cursor:pointer;margin:8px 0">
  ⬇ Pull Cloud → This Device
</button>
<p style="color:#777;font-size:11px;text-align:center;margin:2px 0 16px">Use on devices that need to catch up (your laptop)</p>

<button onclick="clearCaches()" style="width:100%;padding:10px;border-radius:12px;border:1px solid #555;background:transparent;color:#999;font-size:12px;cursor:pointer;margin:8px 0">
  Clear Caches & Service Workers
</button>

<script>
var STORAGE_KEY = 'roots-gains-storage';
var USER_ID = '${userId}';

// Show local state summary
(function() {
  var el = document.getElementById('local-summary');
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { el.textContent = 'No data in localStorage'; return; }
    var parsed = JSON.parse(raw);
    var s = parsed.state || {};
    var g = s.gamificationStats || {};
    var u = s.user || {};
    var wl = Array.isArray(s.workoutLogs) ? s.workoutLogs.length : 0;
    var ml = Array.isArray(s.meals) ? s.meals.length : 0;
    el.textContent = 'Level ' + (g.level||'?') + ' • ' + (g.totalPoints||0) + ' XP • Streak ' + (g.currentStreak||0) + ' • ' + wl + ' workouts • ' + ml + ' meals • Name: ' + (u.name||'?');
  } catch(e) { el.textContent = 'Error reading: ' + e.message; }
})();

function showStatus(msg, color) {
  var el = document.getElementById('status');
  el.style.display = 'block';
  el.style.color = color || '#fff';
  el.textContent = msg;
}

async function clearCaches() {
  showStatus('Clearing...', '#999');
  if ('serviceWorker' in navigator) {
    var regs = await navigator.serviceWorker.getRegistrations();
    for (var i = 0; i < regs.length; i++) await regs[i].unregister();
  }
  if ('caches' in window) {
    var keys = await caches.keys();
    for (var i = 0; i < keys.length; i++) await caches.delete(keys[i]);
  }
  showStatus('Caches & service workers cleared!', '#4ade80');
}

async function doPush() {
  try {
    document.getElementById('btn-push').disabled = true;
    showStatus('Reading localStorage...', '#f59e0b');
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { showStatus('No data in localStorage to push!', '#f87171'); return; }
    var parsed = JSON.parse(raw);
    var state = parsed.state;
    if (!state) { showStatus('No state found in localStorage!', '#f87171'); return; }

    showStatus('Pushing to server...', '#f59e0b');
    var res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: USER_ID,
        data: state,
        lastSyncAt: Date.now()
      })
    });
    var result = await res.json();
    if (result.blocked) {
      showStatus('Server blocked the push (data regression protection). Server score: ' + result.serverScore + ', yours: ' + result.incomingScore, '#f87171');
    } else if (result.success) {
      showStatus('Pushed successfully! Server now has this device\\'s data.', '#4ade80');
      setTimeout(function() { location.reload(); }, 2000);
    } else {
      showStatus('Push failed: ' + JSON.stringify(result), '#f87171');
    }
  } catch(e) {
    showStatus('Error: ' + e.message, '#f87171');
  }
}

async function doPull() {
  try {
    document.getElementById('btn-pull').disabled = true;
    showStatus('Fetching from server...', '#3b82f6');

    var res = await fetch('/api/sync/force-pull', { cache: 'no-store' });
    if (!res.ok) { showStatus('Failed to fetch: ' + res.status, '#f87171'); return; }
    var json = await res.json();
    if (!json.data) { showStatus('No data on server!', '#f87171'); return; }

    showStatus('Writing to localStorage...', '#3b82f6');
    var serverData = json.data;
    var raw = localStorage.getItem(STORAGE_KEY);
    var parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 };
    if (!parsed.state) parsed.state = {};

    // Overwrite EVERYTHING from server
    for (var key in serverData) {
      if (key !== '_lastDevice' && key !== '_lastDeviceUA' && key !== '_whoopTokens' && key !== '_quickAccessPins') {
        parsed.state[key] = serverData[key];
      }
    }
    parsed.state.lastSyncAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));

    // Also clear caches so the app loads fresh
    await clearCaches();

    showStatus('Done! All data restored from cloud. Redirecting...', '#4ade80');
    setTimeout(function() { window.location.href = '/'; }, 2000);
  } catch(e) {
    showStatus('Error: ' + e.message, '#f87171');
  }
}
</script>
</body>
</html>`,
      { headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store, no-cache' } }
    );
  } catch (error) {
    console.error('Force fix error:', error);
    return new NextResponse(
      `<html><body style="background:#111;color:#fff;padding:40px"><h2>Error</h2><p>${String(error)}</p></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}
