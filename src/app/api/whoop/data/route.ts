import { NextRequest, NextResponse } from 'next/server';

const WHOOP_API = 'https://api.prod.whoop.com/developer/v1';

async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
} | null> {
  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const response = await fetch(
      'https://api.prod.whoop.com/oauth/oauth2/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
        }),
      }
    );
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

async function whoopFetch(
  endpoint: string,
  accessToken: string,
  params?: Record<string, string>
): Promise<{ data: any; error?: string }> {
  try {
    const url = new URL(`${WHOOP_API}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return { data: null, error: `${endpoint}: ${response.status} ${body.substring(0, 100)}` };
    }

    const json = await response.json();
    return { data: json };
  } catch (err: any) {
    return { data: null, error: `${endpoint}: ${err.message || 'fetch failed'}` };
  }
}

// POST /api/whoop/data - Fetch Whoop data (token sent in body)
export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body', connected: false }, { status: 400 });
  }

  const accessToken = body.access_token;
  const refreshToken = body.refresh_token;

  if (!accessToken) {
    return NextResponse.json({ error: 'No access token', connected: false }, { status: 401 });
  }

  // First, test the token with a simple profile call
  const profileResult = await whoopFetch('/user/profile/basic', accessToken);

  // If profile fails with auth error, try refreshing token
  if (profileResult.error && profileResult.error.includes('401') && refreshToken) {
    const newTokens = await refreshAccessToken(refreshToken);
    if (newTokens) {
      return NextResponse.json({
        connected: false,
        error: 'token_refreshed',
        new_access_token: newTokens.access_token,
        new_refresh_token: newTokens.refresh_token || refreshToken,
        new_expires_in: newTokens.expires_in,
      });
    }
    return NextResponse.json({
      error: 'Token expired and refresh failed. Please reconnect.',
      connected: false,
    });
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  const startStr = startDate.toISOString();
  const endStr = endDate.toISOString();

  // Fetch all data in parallel - each call handles its own errors
  const [recoveryResult, cyclesResult, sleepResult, workoutsResult, bodyResult] = await Promise.all([
    whoopFetch('/recovery', accessToken, { start: startStr, end: endStr, limit: '7' }),
    whoopFetch('/cycle', accessToken, { start: startStr, end: endStr, limit: '7' }),
    whoopFetch('/activity/sleep', accessToken, { start: startStr, end: endStr, limit: '7' }),
    whoopFetch('/activity/workout', accessToken, { start: startStr, end: endStr, limit: '10' }),
    whoopFetch('/body_measurement', accessToken),
  ]);

  // Collect any per-endpoint errors for debugging
  const errors = [
    profileResult.error,
    recoveryResult.error,
    cyclesResult.error,
    sleepResult.error,
    workoutsResult.error,
    bodyResult.error,
  ].filter(Boolean);

  return NextResponse.json({
    connected: true,
    profile: profileResult.data,
    recovery: recoveryResult.data?.records || [],
    cycles: cyclesResult.data?.records || [],
    sleep: sleepResult.data?.records || [],
    workouts: workoutsResult.data?.records || [],
    body: bodyResult.data,
    lastSync: new Date().toISOString(),
    ...(errors.length > 0 ? { warnings: errors } : {}),
  });
}

// DELETE /api/whoop/data - Just returns disconnected status
export async function DELETE() {
  return NextResponse.json({ connected: false, message: 'Disconnected' });
}
