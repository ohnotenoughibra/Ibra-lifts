import { NextRequest, NextResponse } from 'next/server';
import { getAppUrl } from '@/lib/whoop';
import { auth } from '@/lib/auth';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

// ---------------------------------------------------------------------------
// Google Fit REST API Integration
// ---------------------------------------------------------------------------
// Google Fit provides a proper REST API with OAuth2, so this works from web.
// Endpoints:
//   GET ?action=auth-url    → returns Google OAuth URL for Fit scopes
//   GET ?action=callback&code=X → exchanges code for tokens, stores in localStorage via HTML
//   GET ?action=data        → fetches health data (tokens in Authorization header)
// ---------------------------------------------------------------------------

const GOOGLE_FIT_SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
  'https://www.googleapis.com/auth/fitness.sleep.read',
  'https://www.googleapis.com/auth/fitness.body.read',
].join(' ');

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const FITNESS_API_BASE = 'https://www.googleapis.com/fitness/v1/users/me';

// ---------------------------------------------------------------------------
// Helper: safe inline JSON for script injection
// ---------------------------------------------------------------------------
function safeInlineJSON(value: string): string {
  return JSON.stringify(value).replace(/<\//g, '<\\/');
}

// ---------------------------------------------------------------------------
// Helper: fetch from Google Fit API
// ---------------------------------------------------------------------------
async function fitFetch(
  endpoint: string,
  accessToken: string,
  options?: { method?: string; body?: string }
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Google Fit API responses are untyped
): Promise<{ data: any; error?: string }> {
  try {
    const res = await fetch(`${FITNESS_API_BASE}${endpoint}`, {
      method: options?.method || 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      ...(options?.body ? { body: options.body } : {}),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { data: null, error: `${endpoint}: HTTP ${res.status} — ${body.substring(0, 200)}` };
    }
    return { data: await res.json() };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'network error';
    return { data: null, error: `${endpoint}: ${message}` };
  }
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  // ── action=auth-url ────────────────────────────────────────────────────
  if (action === 'auth-url') {
    const clientId = process.env.GOOGLE_FIT_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: 'Google Fit integration is not configured. Set GOOGLE_FIT_CLIENT_ID.' },
        { status: 500 }
      );
    }

    const appUrl = getAppUrl(request);
    const redirectUri = `${appUrl}/api/google-fit?action=callback`;

    // Generate state server-side and include in response for client to store
    const stateBytes = new Uint8Array(24);
    crypto.getRandomValues(stateBytes);
    const state = 'gfit_' + Array.from(stateBytes, (b) => b.toString(16).padStart(2, '0')).join('');

    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', GOOGLE_FIT_SCOPES);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    // Store state in HttpOnly cookie for server-side CSRF validation
    const response = NextResponse.json({ url: authUrl.toString(), state });
    response.cookies.set('gfit_oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/api/google-fit',
    });
    return response;
  }

  // ── action=callback ────────────────────────────────────────────────────
  if (action === 'callback') {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const returnedState = searchParams.get('state');
    const appUrl = getAppUrl(request);
    const redirectUri = `${appUrl}/api/google-fit?action=callback`;

    if (error) {
      return NextResponse.redirect(
        `${appUrl}?gfit_error=${encodeURIComponent(error)}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${appUrl}?gfit_error=${encodeURIComponent('No authorization code received.')}`
      );
    }

    // Server-side CSRF state validation via HttpOnly cookie
    const savedState = request.cookies.get('gfit_oauth_state')?.value;
    if (!savedState || !returnedState || savedState !== returnedState) {
      return NextResponse.redirect(
        `${appUrl}?gfit_error=${encodeURIComponent('Security check failed (state mismatch). Please try again.')}`
      );
    }

    const clientId = process.env.GOOGLE_FIT_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_FIT_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${appUrl}?gfit_error=${encodeURIComponent('Server misconfigured: missing Google Fit credentials.')}`
      );
    }

    try {
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenRes.ok) {
        const body = await tokenRes.text().catch(() => '');
        console.error('Google Fit token exchange failed:', tokenRes.status, body);
        return NextResponse.redirect(
          `${appUrl}?gfit_error=${encodeURIComponent('Token exchange failed. Please try again.')}`
        );
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token || '';
      const refreshToken = tokenData.refresh_token || '';
      const expiresAt = String(Date.now() + (tokenData.expires_in || 3600) * 1000);

      if (!accessToken) {
        return NextResponse.redirect(
          `${appUrl}?gfit_error=${encodeURIComponent('Google returned an empty access token.')}`
        );
      }

      // Store tokens client-side via a minimal HTML page
      // Tokens are passed via short-lived inline script, page immediately redirects
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Connecting Google Fit...</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0;
           display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .loader { text-align: center; }
    .spinner { width: 32px; height: 32px; border: 3px solid #334155; border-top: 3px solid #4285f4;
               border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { font-size: 14px; opacity: 0.7; }
  </style>
</head>
<body>
<div class="loader">
  <div class="spinner"></div>
  <p>Connecting Google Fit&hellip;</p>
</div>
<script>
(function() {
  try {
    localStorage.setItem('gfit_access_token', ${safeInlineJSON(accessToken)});
    localStorage.setItem('gfit_refresh_token', ${safeInlineJSON(refreshToken)});
    localStorage.setItem('gfit_token_expires', ${safeInlineJSON(expiresAt)});
  } catch(e) {}
  window.location.replace(${safeInlineJSON(appUrl)} + '?gfit_connected=true');
})();
</script>
</body>
</html>`;

      // Clear the state cookie and set no-cache headers
      const response = new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      response.cookies.delete('gfit_oauth_state');
      return response;
    } catch (err: unknown) {
      console.error('Google Fit callback exception:', err);
      const message = err instanceof Error ? err.message.substring(0, 100) : 'unknown error';
      return NextResponse.redirect(
        `${appUrl}?gfit_error=${encodeURIComponent(message)}`
      );
    }
  }

  // ── action=data ────────────────────────────────────────────────────────
  if (action === 'data') {
    // Require authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { limited } = rateLimit(`gfit-data:${session.user.id}`, 10, 60 * 1000);
    if (limited) {
      return NextResponse.json(
        { connected: false, error: 'Too many requests. Please wait.' },
        { status: 429 }
      );
    }

    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.replace('Bearer ', '') || '';
    if (!accessToken) {
      return NextResponse.json({ connected: false, error: 'No access token.' }, { status: 401 });
    }

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const startTimeNanos = String(weekAgo * 1_000_000);
    const endTimeNanos = String(now * 1_000_000);

    // Fetch data sources in parallel
    const [stepsResult, heartRateResult, sleepResult] = await Promise.all([
      // Steps: aggregate by day
      fitFetch('/dataset:aggregate', accessToken, {
        method: 'POST',
        body: JSON.stringify({
          aggregateBy: [{ dataTypeName: 'com.google.step_count.delta' }],
          bucketByTime: { durationMillis: 86400000 },
          startTimeMillis: weekAgo,
          endTimeMillis: now,
        }),
      }),
      // Heart rate: raw data points
      fitFetch(
        `/dataSources/derived:com.google.heart_rate.bpm:com.google.android.gms:merge_heart_rate_bpm/datasets/${startTimeNanos}-${endTimeNanos}`,
        accessToken
      ),
      // Sleep: sessions
      fitFetch(
        `/sessions?startTime=${new Date(weekAgo).toISOString()}&endTime=${new Date(now).toISOString()}&activityType=72`,
        accessToken
      ),
    ]);

    // Parse steps by day
    const stepsByDay: Record<string, number> = {};
    if (stepsResult.data?.bucket) {
      for (const bucket of stepsResult.data.bucket) {
        const dateKey = new Date(parseInt(bucket.startTimeMillis)).toISOString().substring(0, 10);
        const steps = bucket.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal || 0;
        stepsByDay[dateKey] = (stepsByDay[dateKey] || 0) + steps;
      }
    }

    // Parse heart rate — compute resting HR (lowest 10th percentile over sleep windows)
    const hrValues: { time: number; bpm: number }[] = [];
    if (heartRateResult.data?.point) {
      for (const pt of heartRateResult.data.point) {
        const bpm = pt.value?.[0]?.fpVal;
        const time = parseInt(pt.startTimeNanos) / 1_000_000;
        if (bpm && bpm > 30 && bpm < 220) {
          hrValues.push({ time, bpm });
        }
      }
    }

    // Compute daily resting HR (10th percentile) and average HR
    const hrByDay: Record<string, { values: number[] }> = {};
    for (const hr of hrValues) {
      const dateKey = new Date(hr.time).toISOString().substring(0, 10);
      if (!hrByDay[dateKey]) hrByDay[dateKey] = { values: [] };
      hrByDay[dateKey].values.push(hr.bpm);
    }

    const restingHRByDay: Record<string, number> = {};
    const avgHRByDay: Record<string, number> = {};
    for (const [day, data] of Object.entries(hrByDay)) {
      const sorted = [...data.values].sort((a, b) => a - b);
      const p10Index = Math.max(0, Math.floor(sorted.length * 0.1));
      restingHRByDay[day] = Math.round(sorted[p10Index]);
      avgHRByDay[day] = Math.round(data.values.reduce((s, v) => s + v, 0) / data.values.length);
    }

    // Parse sleep sessions
    const sleepByDay: Record<string, { hours: number; efficiency: number | null }> = {};
    if (sleepResult.data?.session) {
      for (const session of sleepResult.data.session) {
        const startMs = parseInt(session.startTimeMillis);
        const endMs = parseInt(session.endTimeMillis);
        const durationHours = (endMs - startMs) / 3600000;
        if (durationHours > 0 && durationHours < 24) {
          const dateKey = new Date(endMs).toISOString().substring(0, 10);
          sleepByDay[dateKey] = {
            hours: Math.round(durationHours * 10) / 10,
            efficiency: null, // Google Fit doesn't provide efficiency directly
          };
        }
      }
    }

    // Build unified day entries
    const allDays = new Set([
      ...Object.keys(stepsByDay),
      ...Object.keys(restingHRByDay),
      ...Object.keys(sleepByDay),
    ]);

    const days: Array<{
      date: string;
      steps: number | null;
      restingHR: number | null;
      avgHR: number | null;
      sleepHours: number | null;
      sleepEfficiency: number | null;
    }> = [];

    for (const day of Array.from(allDays).sort()) {
      days.push({
        date: day,
        steps: stepsByDay[day] ?? null,
        restingHR: restingHRByDay[day] ?? null,
        avgHR: avgHRByDay[day] ?? null,
        sleepHours: sleepByDay[day]?.hours ?? null,
        sleepEfficiency: sleepByDay[day]?.efficiency ?? null,
      });
    }

    const warnings = [stepsResult.error, heartRateResult.error, sleepResult.error].filter(Boolean);

    return NextResponse.json({
      connected: true,
      days,
      lastSync: new Date().toISOString(),
      ...(warnings.length > 0 ? { warnings } : {}),
    });
  }

  return NextResponse.json({ error: 'Invalid action. Use: auth-url, callback, data.' }, { status: 400 });
}

// ── POST /api/google-fit — Token refresh ──────────────────────────────────
// Moved to POST to prevent refresh tokens from appearing in URLs/logs
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const refreshToken = body.refresh_token;
    if (!refreshToken || typeof refreshToken !== 'string') {
      return NextResponse.json({ error: 'No refresh token.' }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_FIT_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_FIT_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
    }

    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Refresh failed.' }, { status: 401 });
    }

    const data = await res.json();
    return NextResponse.json({
      access_token: data.access_token,
      expires_in: data.expires_in || 3600,
    });
  } catch {
    return NextResponse.json({ error: 'Refresh failed.' }, { status: 500 });
  }
}
