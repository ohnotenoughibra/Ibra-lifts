import { NextRequest, NextResponse } from 'next/server';

// Handle Whoop OAuth2 callback - exchange code for tokens
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Check for OAuth errors
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
  const redirectUri = `${appUrl}/api/whoop/callback`;

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
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Whoop token exchange failed:', errorText);
      return NextResponse.redirect(
        `${appUrl}?whoop_error=token_exchange_failed`
      );
    }

    const tokenData = await tokenResponse.json();
    // tokenData: { access_token, refresh_token, expires_in, token_type, scope }

    // Redirect back to app with tokens stored in cookies (httpOnly for security)
    const response = NextResponse.redirect(
      `${appUrl}?whoop_connected=true`
    );

    // Store tokens in httpOnly cookies
    response.cookies.set('whoop_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in || 3600,
      path: '/',
    });

    if (tokenData.refresh_token) {
      response.cookies.set('whoop_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });
    }

    // Clear the state cookie
    response.cookies.delete('whoop_oauth_state');

    return response;
  } catch (err) {
    console.error('Whoop callback error:', err);
    return NextResponse.redirect(
      `${appUrl}?whoop_error=callback_failed`
    );
  }
}
