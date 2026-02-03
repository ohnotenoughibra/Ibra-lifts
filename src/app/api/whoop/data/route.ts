import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken, whoopFetch } from '@/lib/whoop';

/**
 * POST /api/whoop/data
 *
 * Fetches the user's Whoop data (recovery, cycles, sleep, workouts, body).
 * Tokens are sent in the request body (localStorage-based, not cookies).
 *
 * Token refresh is handled transparently:
 *   - If the access token is expired (401), we refresh it server-side
 *   - We then immediately fetch data with the new token
 *   - We return the data AND the new tokens in a single response
 *   - This avoids the previous double-round-trip pattern
 */
export async function POST(request: NextRequest) {
  // --- Parse request body ---
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { connected: false, error: 'Invalid request body.' },
      { status: 400 }
    );
  }

  let accessToken: string = body.access_token || '';
  let refreshToken: string = body.refresh_token || '';
  let newTokens: { access_token: string; refresh_token: string; expires_in: number } | null = null;

  if (!accessToken) {
    return NextResponse.json(
      { connected: false, error: 'No access token provided.' },
      { status: 401 }
    );
  }

  // --- Step 1: Test the token with profile endpoint ---
  let profileResult = await whoopFetch('/user/profile/basic', accessToken);

  // --- Step 2: If 401, try refreshing and re-test ---
  if (profileResult.error && profileResult.error.includes('401') && refreshToken) {
    newTokens = await refreshAccessToken(refreshToken);
    if (newTokens) {
      accessToken = newTokens.access_token;
      refreshToken = newTokens.refresh_token;
      // Re-test with the new token
      profileResult = await whoopFetch('/user/profile/basic', accessToken);
    }
  }

  // --- Step 3: If profile still fails with auth error, tokens are dead ---
  if (profileResult.error && profileResult.error.includes('401')) {
    return NextResponse.json({
      connected: false,
      error: 'Your Whoop session has expired. Please reconnect.',
      requiresReconnect: true,
    });
  }

  // --- Step 4: Fetch all data in parallel ---
  const now = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const startStr = weekAgo.toISOString();
  const endStr = now.toISOString();

  const [recoveryResult, cyclesResult, sleepResult, workoutsResult, bodyResult] =
    await Promise.all([
      whoopFetch('/recovery', accessToken, { start: startStr, end: endStr, limit: '7' }),
      whoopFetch('/cycle', accessToken, { start: startStr, end: endStr, limit: '7' }),
      whoopFetch('/activity/sleep', accessToken, { start: startStr, end: endStr, limit: '7' }),
      whoopFetch('/activity/workout', accessToken, { start: startStr, end: endStr, limit: '10' }),
      whoopFetch('/user/measurement/body', accessToken),
    ]);

  // --- Step 5: Collect per-endpoint warnings ---
  const warnings = [
    profileResult.error,
    recoveryResult.error,
    cyclesResult.error,
    sleepResult.error,
    workoutsResult.error,
    bodyResult.error,
  ].filter(Boolean) as string[];

  // --- Step 6: Return data + optional new tokens ---
  return NextResponse.json({
    connected: true,
    profile: profileResult.data,
    recovery: recoveryResult.data?.records || [],
    cycles: cyclesResult.data?.records || [],
    sleep: sleepResult.data?.records || [],
    workouts: workoutsResult.data?.records || [],
    body: bodyResult.data,
    lastSync: now.toISOString(),
    // Include refreshed tokens so the client can update localStorage
    ...(newTokens
      ? {
          new_access_token: newTokens.access_token,
          new_refresh_token: newTokens.refresh_token,
          new_expires_in: newTokens.expires_in,
        }
      : {}),
    ...(warnings.length > 0 ? { warnings } : {}),
  });
}

/**
 * DELETE /api/whoop/data
 *
 * Client-side disconnect confirmation. We don't revoke tokens because
 * Whoop's API doesn't provide a revocation endpoint for developer apps.
 */
export async function DELETE() {
  return NextResponse.json({ connected: false, message: 'Disconnected' });
}
