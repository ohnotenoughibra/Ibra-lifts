import { NextResponse } from 'next/server';

// Initiate Whoop OAuth2 authorization flow
export async function GET() {
  const clientId = process.env.WHOOP_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${appUrl}/api/whoop/callback`;

  if (!clientId) {
    return NextResponse.json(
      { error: 'WHOOP_CLIENT_ID not configured' },
      { status: 500 }
    );
  }

  const scopes = [
    'read:recovery',
    'read:cycles',
    'read:sleep',
    'read:workout',
    'read:profile',
    'read:body_measurement',
  ].join(' ');

  // Generate a random state for CSRF protection
  const state = crypto.randomUUID();

  const authUrl = new URL('https://api.prod.whoop.com/oauth/oauth2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('state', state);

  // Set state cookie for CSRF validation on callback
  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set('whoop_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  return response;
}
