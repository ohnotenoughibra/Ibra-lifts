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
): Promise<any> {
  const url = new URL(`${WHOOP_API}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`${response.status}`);
  }

  return response.json();
}

// POST /api/whoop/data - Fetch Whoop data (token sent in body to avoid CORS preflight)
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

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  const startStr = startDate.toISOString();
  const endStr = endDate.toISOString();

  try {
    const [profile, recovery, cycles, sleep, workouts, bodyData] = await Promise.all([
      whoopFetch('/user/profile/basic', accessToken).catch(() => null),
      whoopFetch('/recovery', accessToken, { start: startStr, end: endStr, limit: '7' }).catch(() => null),
      whoopFetch('/cycle', accessToken, { start: startStr, end: endStr, limit: '7' }).catch(() => null),
      whoopFetch('/activity/sleep', accessToken, { start: startStr, end: endStr, limit: '7' }).catch(() => null),
      whoopFetch('/activity/workout', accessToken, { start: startStr, end: endStr, limit: '10' }).catch(() => null),
      whoopFetch('/body_measurement', accessToken).catch(() => null),
    ]);

    return NextResponse.json({
      connected: true,
      profile,
      recovery: recovery?.records || [],
      cycles: cycles?.records || [],
      sleep: sleep?.records || [],
      workouts: workouts?.records || [],
      body: bodyData,
      lastSync: new Date().toISOString(),
    });
  } catch (err: any) {
    // If all calls failed, try refreshing
    if (refreshToken) {
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
    }

    return NextResponse.json(
      { error: 'Failed to fetch Whoop data', connected: false },
      { status: 500 }
    );
  }
}

// DELETE /api/whoop/data - Just returns disconnected status
export async function DELETE() {
  return NextResponse.json({ connected: false, message: 'Disconnected' });
}
