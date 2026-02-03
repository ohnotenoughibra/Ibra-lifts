import { NextRequest, NextResponse } from 'next/server';

// Handle Whoop OAuth2 callback - exchange code for tokens
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Auto-detect app URL from the request
  const requestUrl = new URL(request.url);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${requestUrl.protocol}//${requestUrl.host}`;

  // Check for OAuth errors from Whoop
  if (error) {
    return NextResponse.redirect(
      `${appUrl}?whoop_error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${appUrl}?whoop_error=no_code`
    );
  }

  // Validate CSRF state
  const storedState = request.cookies.get('whoop_oauth_state')?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      `${appUrl}?whoop_error=invalid_state`
    );
  }

  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;

  // Use the EXACT same redirect_uri that was used in the auth request
  // This is critical - Whoop requires an exact match
  const storedRedirectUri = request.cookies.get('whoop_redirect_uri')?.value;
  const redirectUri = storedRedirectUri || `${appUrl}/api/whoop/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${appUrl}?whoop_error=missing_credentials`
    );
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch(
      'https://api.prod.whoop.com/oauth/oauth2/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error('Whoop token exchange failed:', tokenResponse.status, errorBody);
      console.error('redirect_uri used:', redirectUri);
      return NextResponse.redirect(
        `${appUrl}?whoop_error=${encodeURIComponent(`token_exchange_failed_${tokenResponse.status}`)}`
      );
    }

    const tokenData = await tokenResponse.json();

    // Redirect back to app with tokens stored in cookies
    const response = NextResponse.redirect(
      `${appUrl}?whoop_connected=true`
    );

    // Store tokens in httpOnly cookies
    response.cookies.set('whoop_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: tokenData.expires_in || 3600,
      path: '/',
    });

    if (tokenData.refresh_token) {
      response.cookies.set('whoop_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });
    }

    // Clear temp cookies
    response.cookies.delete('whoop_oauth_state');
    response.cookies.delete('whoop_redirect_uri');

    return response;
  } catch (err) {
    console.error('Whoop callback error:', err);
    return NextResponse.redirect(
      `${appUrl}?whoop_error=callback_failed`
    );
  }
}
