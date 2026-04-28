import { NextRequest, NextResponse } from 'next/server';
import { getAppUrl, WHOOP_TOKEN_URL, safeInlineJSON, LS_KEYS } from '@/lib/whoop';

/**
 * GET /api/whoop/callback
 *
 * Whoop redirects here after the user authorizes (or denies) access.
 * We exchange the authorization code for tokens, then return an HTML page that:
 *   1. Validates the state parameter against what we stored in localStorage
 *   2. Stores the tokens in localStorage
 *   3. Redirects to the app with a success indicator
 *
 * If localStorage fails, tokens are passed via URL hash (fragment) as a fallback.
 * Hash fragments are never sent to the server, so tokens stay client-side.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const returnedState = searchParams.get('state');
  const appUrl = getAppUrl(request);
  const redirectUri = `${appUrl}/api/whoop/callback`;

  // --- Error from Whoop (user denied, etc.) ---
  if (error) {
    const errorDesc = searchParams.get('error_description') || error;
    return redirectWithError(appUrl, errorDesc);
  }

  // --- Missing authorization code ---
  if (!code) {
    return redirectWithError(appUrl, 'No authorization code received from Whoop.');
  }

  // --- Missing server credentials ---
  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return redirectWithError(appUrl, 'Server misconfigured: missing WHOOP_CLIENT_ID or WHOOP_CLIENT_SECRET.');
  }

  // --- Exchange authorization code for tokens ---
  try {
    const tokenRes = await fetch(WHOOP_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text().catch(() => '');
      console.error('Whoop token exchange failed:', tokenRes.status, body);
      return redirectWithError(
        appUrl,
        `Token exchange failed (HTTP ${tokenRes.status}). Please try connecting again.`
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token || '';
    const refreshToken = tokenData.refresh_token || '';
    const expiresAt = String(Date.now() + (tokenData.expires_in || 3600) * 1000);

    if (!accessToken) {
      return redirectWithError(appUrl, 'Whoop returned an empty access token. Please try again.');
    }

    // Return an HTML page that validates state, stores tokens, and redirects.
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Connecting Whoop...</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0;
           display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .loader { text-align: center; }
    .spinner { width: 32px; height: 32px; border: 3px solid #334155; border-top: 3px solid #22c55e;
               border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { font-size: 14px; opacity: 0.7; }
    .error { color: #f87171; }
  </style>
</head>
<body>
<div class="loader">
  <div class="spinner"></div>
  <p id="msg">Connecting your Whoop&hellip;</p>
</div>
<script>
(async function() {
  var returnedState = ${safeInlineJSON(returnedState || '')};
  var accessToken   = ${safeInlineJSON(accessToken)};
  var refreshToken  = ${safeInlineJSON(refreshToken)};
  var expiresAt     = ${safeInlineJSON(expiresAt)};
  var appUrl        = ${safeInlineJSON(appUrl)};

  // --- Detect PWA origin ---
  // The connect button in the PWA detects standalone mode (100% reliable there)
  // and threads a 'pwa:' prefix into the OAuth state parameter. We use that to
  // decide whether to redirect (browser) or show a return-to-app page (PWA).
  var fromPwa = returnedState && returnedState.indexOf('pwa:') === 0;

  // --- Validate CSRF state ---
  // Strip the 'pwa:' prefix before comparing with localStorage.
  // Note: PWA and the iOS in-app browser have separate localStorage, so
  // savedState will be null when coming from a PWA — we allow that.
  var stateForValidation = fromPwa ? returnedState.substring(4) : returnedState;
  try {
    var savedState = localStorage.getItem(${safeInlineJSON(LS_KEYS.oauthState)});
    if (savedState && stateForValidation && savedState !== stateForValidation) {
      document.getElementById('msg').className = 'error';
      document.getElementById('msg').textContent =
        'Security check failed: OAuth state mismatch. Please try connecting again.';
      localStorage.removeItem(${safeInlineJSON(LS_KEYS.oauthState)});
      setTimeout(function() {
        window.location.replace(appUrl + '?whoop_error=' + encodeURIComponent('state_mismatch'));
      }, 2500);
      return;
    }
    localStorage.removeItem(${safeInlineJSON(LS_KEYS.oauthState)});
  } catch(e) {
    // localStorage unavailable — skip validation
  }

  // --- Store tokens in localStorage ---
  var stored = false;
  try {
    localStorage.setItem(${safeInlineJSON(LS_KEYS.accessToken)}, accessToken);
    localStorage.setItem(${safeInlineJSON(LS_KEYS.refreshToken)}, refreshToken);
    localStorage.setItem(${safeInlineJSON(LS_KEYS.tokenExpires)}, expiresAt);
    stored = true;
  } catch(e) { /* localStorage unavailable */ }

  // --- Persist tokens to DB (AWAIT completion for PWA flow) ---
  // For PWA users, the DB is the ONLY way tokens get back to the PWA
  // (separate localStorage). We must wait for it to complete.
  try {
    await fetch(appUrl + '/api/whoop/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt
      })
    });
  } catch(e) { /* best effort */ }

  // --- Route: PWA shows return-to-app page, browser redirects normally ---
  if (fromPwa) {
    // We're in the iOS in-app browser (or Android Custom Tab) opened by the PWA.
    // Redirecting would load the app here with fresh state and show onboarding.
    // Instead, show a success page. The PWA will auto-load tokens from DB
    // via visibilitychange when the user switches back.
    var container = document.querySelector('.loader');
    container.innerHTML = ''
      + '<div style="display:flex;flex-direction:column;align-items:center;gap:20px;max-width:320px;text-align:center;">'
      +   '<div style="width:72px;height:72px;border-radius:50%;background:rgba(34,197,94,0.15);display:flex;align-items:center;justify-content:center;">'
      +     '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
      +   '</div>'
      +   '<h2 style="font-size:22px;font-weight:700;color:#f1f5f9;margin:0;">WHOOP Connected!</h2>'
      +   '<p style="font-size:14px;color:#94a3b8;line-height:1.6;margin:0;">Your account is linked. Close this browser to return to <strong style="color:#e2e8f0;">Ibra Lifts</strong> \\u2014 your data will load automatically.</p>'
      +   '<button onclick="try{window.close()}catch(e){};setTimeout(function(){window.location.replace(\\'' + appUrl + '?whoop_connected=true\\')},300)" style="display:block;width:100%;padding:14px;background:#22c55e;color:#0f172a;font-size:16px;font-weight:700;border:none;border-radius:12px;cursor:pointer;">Return to App</button>'
      +   '<p style="font-size:12px;color:#64748b;margin:0;">Or swipe down to close this browser.</p>'
      + '</div>';
  } else if (stored) {
    // Normal browser flow — redirect to app
    window.location.replace(appUrl + '?whoop_connected=true');
  } else {
    // Fallback: pass tokens via URL hash (never sent to server)
    var hash = 'whoop_at=' + encodeURIComponent(accessToken)
      + '&whoop_rt=' + encodeURIComponent(refreshToken)
      + '&whoop_exp=' + encodeURIComponent(expiresAt);
    window.location.replace(appUrl + '?whoop_connected=true#' + hash);
  }
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
  } catch (err: any) {
    console.error('Whoop callback exception:', err);
    return redirectWithError(
      appUrl,
      `Connection failed: ${err.message?.substring(0, 100) || 'unknown error'}. Please try again.`
    );
  }
}

/** Helper: redirect to app with an error message */
function redirectWithError(appUrl: string, message: string): NextResponse {
  return NextResponse.redirect(
    `${appUrl}?whoop_error=${encodeURIComponent(message)}`
  );
}
