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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const appUrl = getAppUrl(request);
  const redirectUri = `${appUrl}/api/whoop/callback`;

  if (error) {
    return NextResponse.redirect(
      `${appUrl}?whoop_error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}?whoop_error=no_code`);
  }

  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}?whoop_error=missing_credentials`);
  }

  try {
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
      const detail = encodeURIComponent(
        `token_${tokenResponse.status}: ${errorBody.substring(0, 120)}`
      );
      return NextResponse.redirect(`${appUrl}?whoop_error=${detail}`);
    }

    const tokenData = await tokenResponse.json();

    // Return an HTML page that stores tokens in localStorage then redirects.
    // Vercel's NextResponse.redirect() doesn't reliably set cookies,
    // so we use client-side storage instead.
    const html = `<!DOCTYPE html>
<html>
<head><title>Connecting Whoop...</title></head>
<body>
<p>Connecting your Whoop... please wait.</p>
<script>
  try {
    localStorage.setItem('whoop_access_token', ${JSON.stringify(tokenData.access_token)});
    localStorage.setItem('whoop_refresh_token', ${JSON.stringify(tokenData.refresh_token || '')});
    localStorage.setItem('whoop_token_expires', ${JSON.stringify(String(Date.now() + (tokenData.expires_in || 3600) * 1000))});
    window.location.href = ${JSON.stringify(appUrl + '?whoop_connected=true')};
  } catch(e) {
    document.body.innerHTML = '<p>Failed to store tokens: ' + e.message + '</p>';
  }
</script>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (err: any) {
    console.error('Whoop callback exception:', err);
    return NextResponse.redirect(
      `${appUrl}?whoop_error=${encodeURIComponent(`exception: ${err.message?.substring(0, 80)}`)}`
    );
  }
}
