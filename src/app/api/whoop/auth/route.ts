import { NextResponse } from 'next/server';

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

export async function GET(request: Request) {
  const clientId = process.env.WHOOP_CLIENT_ID;
  const appUrl = getAppUrl(request);
  const redirectUri = `${appUrl}/api/whoop/callback`;

  if (!clientId) {
    return NextResponse.json(
      { error: 'WHOOP_CLIENT_ID not configured', detectedUrl: appUrl },
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
    'offline',
  ].join(' ');

  // Return an HTML page that generates state client-side, stores in localStorage,
  // then redirects to Whoop. This avoids cookie issues on Vercel.
  const html = `<!DOCTYPE html>
<html>
<head><title>Redirecting to Whoop...</title></head>
<body>
<p>Redirecting to Whoop for authorization...</p>
<script>
  var state = 'whoop_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  try { localStorage.setItem('whoop_oauth_state', state); } catch(e) {}
  var url = 'https://api.prod.whoop.com/oauth/oauth2/auth'
    + '?client_id=' + encodeURIComponent(${JSON.stringify(clientId)})
    + '&redirect_uri=' + encodeURIComponent(${JSON.stringify(redirectUri)})
    + '&response_type=code'
    + '&scope=' + encodeURIComponent(${JSON.stringify(scopes)})
    + '&state=' + encodeURIComponent(state);
  window.location.href = url;
</script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}
