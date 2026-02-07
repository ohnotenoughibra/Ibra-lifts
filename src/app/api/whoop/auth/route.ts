import { NextResponse } from 'next/server';
import {
  getAppUrl,
  WHOOP_AUTH_URL,
  WHOOP_SCOPES,
  safeInlineJSON,
} from '@/lib/whoop';

/**
 * GET /api/whoop/auth
 *
 * Initiates the Whoop OAuth2 flow.
 * Returns an HTML page that:
 *   1. Generates a cryptographic-quality random state parameter
 *   2. Stores it in localStorage for CSRF validation on return
 *   3. Redirects the browser to Whoop's authorization server
 *
 * We return HTML instead of a 302 redirect so we can generate and persist
 * the state parameter client-side — avoiding cookie issues on Vercel.
 */
export async function GET(request: Request) {
  const clientId = process.env.WHOOP_CLIENT_ID;
  const appUrl = getAppUrl(request);
  const redirectUri = `${appUrl}/api/whoop/callback`;
  // When the connect button detects PWA standalone mode, it passes ?from=pwa.
  // We thread this through the OAuth state parameter so the callback knows
  // to show a "return to app" page instead of auto-redirecting.
  const fromPwa = new URL(request.url).searchParams.get('from') === 'pwa';

  if (!clientId) {
    return NextResponse.json(
      {
        error: 'Whoop integration is not configured. Set WHOOP_CLIENT_ID in environment variables.',
        detectedUrl: appUrl,
      },
      { status: 500 }
    );
  }

  // Build the HTML page that will handle client-side state generation + redirect
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Connecting to Whoop...</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0;
           display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .loader { text-align: center; }
    .spinner { width: 32px; height: 32px; border: 3px solid #334155; border-top: 3px solid #22c55e;
               border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { font-size: 14px; opacity: 0.7; }
  </style>
</head>
<body>
<div class="loader">
  <div class="spinner"></div>
  <p>Redirecting to Whoop&hellip;</p>
</div>
<script>
(function() {
  // Generate a random state string using crypto API when available
  var arr = new Uint8Array(24);
  try { crypto.getRandomValues(arr); } catch(e) {
    for (var i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  var fromPwa = ${safeInlineJSON(fromPwa)};
  var stateRandom = 'whoop_' + Array.from(arr, function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  var state = (fromPwa ? 'pwa:' : '') + stateRandom;

  // Store the random part only — the callback strips the 'pwa:' prefix before comparing
  try { localStorage.setItem('whoop_oauth_state', stateRandom); } catch(e) {
    // If localStorage is unavailable we still proceed — state validation
    // will be skipped on return (better UX than blocking the flow).
  }

  var url = ${safeInlineJSON(WHOOP_AUTH_URL)}
    + '?client_id='    + encodeURIComponent(${safeInlineJSON(clientId)})
    + '&redirect_uri=' + encodeURIComponent(${safeInlineJSON(redirectUri)})
    + '&response_type=code'
    + '&scope='        + encodeURIComponent(${safeInlineJSON(WHOOP_SCOPES)})
    + '&state='        + encodeURIComponent(state);

  window.location.replace(url);
})();
</script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
