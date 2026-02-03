import { NextRequest, NextResponse } from 'next/server';

function getAppUrl(request: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  const host = request.headers.get('host');
  if (host) {
    const proto = host.includes('localhost') ? 'http' : 'https';
    return `${proto}://${host}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

// Handle Whoop OAuth2 callback - exchange code for tokens
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const appUrl = getAppUrl(request);

  if (error) {
    return NextResponse.redirect(
      `${appUrl}?whoop_error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}?whoop_error=no_code`);
  }

  // Validate CSRF state
  const storedState = request.cookies.get('whoop_oauth_state')?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${appUrl}?whoop_error=invalid_state`);
  }

  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;

  // Use the EXACT redirect_uri from the auth step
  const storedRedirectUri = request.cookies.get('whoop_redirect_uri')?.value;
  const redirectUri = storedRedirectUri || `${appUrl}/api/whoop/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}?whoop_error=missing_credentials`);
  }

  try {
    // Exchange code for token - credentials in body per Whoop docs
    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch(
      'https://api.prod.whoop.com/oauth/oauth2/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenBody,
      }
    );

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error('Whoop token exchange failed:', tokenResponse.status, errorBody);
      console.error('Used redirect_uri:', redirectUri);
      console.error('Used client_id:', clientId?.substring(0, 8) + '...');
      // Pass the status code and snippet of error to frontend for debugging
      const shortError = encodeURIComponent(
        `token_${tokenResponse.status}_${errorBody.substring(0, 100)}`
      );
      return NextResponse.redirect(`${appUrl}?whoop_error=${shortError}`);
    }

    const tokenData = await tokenResponse.json();

    const response = NextResponse.redirect(`${appUrl}?whoop_connected=true`);

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
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });
    }

    response.cookies.delete('whoop_oauth_state');
    response.cookies.delete('whoop_redirect_uri');

    return response;
  } catch (err: any) {
    console.error('Whoop callback error:', err);
    return NextResponse.redirect(
      `${appUrl}?whoop_error=${encodeURIComponent(`exception_${err.message?.substring(0, 80)}`)}`
    );
  }
}
