import { NextRequest, NextResponse } from 'next/server';

const WHOOP_API = 'https://api.prod.whoop.com/developer/v1';

// Refresh expired access token using refresh token
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
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
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

// Fetch data from Whoop API with automatic token refresh
async function whoopFetch(
  endpoint: string,
  accessToken: string,
  refreshToken: string | undefined,
  params?: Record<string, string>
): Promise<{ data: any; newTokens?: { access_token: string; refresh_token?: string; expires_in: number } }> {
  const url = new URL(`${WHOOP_API}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  let response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // If 401 and we have a refresh token, try refreshing
  if (response.status === 401 && refreshToken) {
    const newTokens = await refreshAccessToken(refreshToken);
    if (newTokens) {
      response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${newTokens.access_token}` },
      });
      if (response.ok) {
        const data = await response.json();
        return { data, newTokens };
      }
    }
    throw new Error('Token refresh failed');
  }

  if (!response.ok) {
    throw new Error(`Whoop API error: ${response.status}`);
  }

  const data = await response.json();
  return { data };
}

// GET /api/whoop/data - Fetch all Whoop data for the dashboard
export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get('whoop_access_token')?.value;
  const refreshToken = request.cookies.get('whoop_refresh_token')?.value;

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Not connected to Whoop', connected: false },
      { status: 401 }
    );
  }

  // Date range: last 7 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  const startStr = startDate.toISOString();
  const endStr = endDate.toISOString();

  try {
    // Fetch all data in parallel
    const [profileResult, recoveryResult, cycleResult, sleepResult, workoutResult, bodyResult] =
      await Promise.all([
        whoopFetch('/user/profile/basic', accessToken, refreshToken),
        whoopFetch('/recovery', accessToken, refreshToken, {
          start: startStr,
          end: endStr,
          limit: '7',
        }),
        whoopFetch('/cycle', accessToken, refreshToken, {
          start: startStr,
          end: endStr,
          limit: '7',
        }),
        whoopFetch('/activity/sleep', accessToken, refreshToken, {
          start: startStr,
          end: endStr,
          limit: '7',
        }),
        whoopFetch('/activity/workout', accessToken, refreshToken, {
          start: startStr,
          end: endStr,
          limit: '10',
        }),
        whoopFetch('/body_measurement', accessToken, refreshToken),
      ]);

    // Build the response
    const responseData = {
      connected: true,
      profile: profileResult.data,
      recovery: recoveryResult.data?.records || [],
      cycles: cycleResult.data?.records || [],
      sleep: sleepResult.data?.records || [],
      workouts: workoutResult.data?.records || [],
      body: bodyResult.data,
      lastSync: new Date().toISOString(),
    };

    // If tokens were refreshed, update cookies
    const anyNewTokens =
      profileResult.newTokens ||
      recoveryResult.newTokens ||
      cycleResult.newTokens ||
      sleepResult.newTokens ||
      workoutResult.newTokens ||
      bodyResult.newTokens;

    const response = NextResponse.json(responseData);

    if (anyNewTokens) {
      response.cookies.set('whoop_access_token', anyNewTokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: anyNewTokens.expires_in || 3600,
        path: '/',
      });

      if (anyNewTokens.refresh_token) {
        response.cookies.set('whoop_refresh_token', anyNewTokens.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60,
          path: '/',
        });
      }
    }

    return response;
  } catch (err: any) {
    console.error('Whoop data fetch error:', err);

    // If token is invalid, tell frontend to reconnect
    if (err.message?.includes('Token refresh failed') || err.message?.includes('401')) {
      const response = NextResponse.json(
        { error: 'Whoop session expired. Please reconnect.', connected: false },
        { status: 401 }
      );
      response.cookies.delete('whoop_access_token');
      response.cookies.delete('whoop_refresh_token');
      return response;
    }

    return NextResponse.json(
      { error: 'Failed to fetch Whoop data', connected: false },
      { status: 500 }
    );
  }
}

// DELETE /api/whoop/data - Disconnect Whoop (clear tokens)
export async function DELETE() {
  const response = NextResponse.json({ connected: false, message: 'Disconnected from Whoop' });
  response.cookies.delete('whoop_access_token');
  response.cookies.delete('whoop_refresh_token');
  return response;
}
