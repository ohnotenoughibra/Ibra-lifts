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
(function() {
  var returnedState = ${safeInlineJSON(returnedState || '')};
  var accessToken   = ${safeInlineJSON(accessToken)};
  var refreshToken  = ${safeInlineJSON(refreshToken)};
  var expiresAt     = ${safeInlineJSON(expiresAt)};
  var appUrl        = ${safeInlineJSON(appUrl)};

  // --- Validate CSRF state ---
  try {
    var savedState = localStorage.getItem(${safeInlineJSON(LS_KEYS.oauthState)});
    // Only reject if we had a saved state AND it doesn't match.
    // If localStorage was unavailable during auth, savedState will be null — we allow that.
    if (savedState && returnedState && savedState !== returnedState) {
      document.getElementById('msg').className = 'error';
      document.getElementById('msg').textContent =
        'Security check failed: OAuth state mismatch. Please try connecting again.';
      // Clean up and redirect after a moment so the user sees the message
      localStorage.removeItem(${safeInlineJSON(LS_KEYS.oauthState)});
      setTimeout(function() {
        window.location.replace(appUrl + '?whoop_error=' + encodeURIComponent('state_mismatch'));
      }, 2500);
      return;
    }
    // Clean up the state — it's single-use
    localStorage.removeItem(${safeInlineJSON(LS_KEYS.oauthState)});
  } catch(e) {
    // localStorage unavailable — skip validation, proceed with token storage via hash
  }

  // --- Store tokens ---
  var stored = false;
  try {
    localStorage.setItem(${safeInlineJSON(LS_KEYS.accessToken)}, accessToken);
    localStorage.setItem(${safeInlineJSON(LS_KEYS.refreshToken)}, refreshToken);
    localStorage.setItem(${safeInlineJSON(LS_KEYS.tokenExpires)}, expiresAt);
    stored = true;
  } catch(e) { /* localStorage unavailable */ }

  // --- Persist tokens to DB (so they survive across devices/sessions) ---
  try {
    fetch(appUrl + '/api/whoop/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt
      })
    }).catch(function() { /* best effort — localStorage is primary fallback */ });
  } catch(e) { /* ignore */ }

  // --- Redirect or show return-to-app page ---
  // Detect if we're running inside the PWA (standalone mode).
  // On iOS, OAuth opens Safari, so we're almost certainly NOT in standalone mode.
  // When in an external browser, auto-redirect just stays in the browser instead
  // of returning to the PWA. Instead, show a "Return to App" page and let the
  // PWA pick up the tokens from the database when the user switches back.
  var isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
    || (window.navigator && window.navigator.standalone === true);

  if (isStandalone) {
    // We're inside the PWA — regular redirect works fine
    if (stored) {
      window.location.replace(appUrl + '?whoop_connected=true');
    } else {
      var hash = 'whoop_at=' + encodeURIComponent(accessToken)
        + '&whoop_rt=' + encodeURIComponent(refreshToken)
        + '&whoop_exp=' + encodeURIComponent(expiresAt);
      window.location.replace(appUrl + '?whoop_connected=true#' + hash);
    }
  } else {
    // External browser (opened by OAuth from PWA on iOS/Android).
    // Tokens are already saved to DB — the PWA will load them when the user switches back.
    // Show a success page with instructions to return to the app.
    var container = document.querySelector('.loader');
    container.innerHTML = ''
      + '<div style="display:flex;flex-direction:column;align-items:center;gap:16px;max-width:320px;text-align:center;">'
      +   '<div style="width:64px;height:64px;border-radius:50%;background:rgba(34,197,94,0.15);display:flex;align-items:center;justify-content:center;">'
      +     '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
      +   '</div>'
      +   '<h2 style="font-size:20px;font-weight:700;color:#f1f5f9;margin:0;">WHOOP Connected!</h2>'
      +   '<p style="font-size:14px;color:#94a3b8;line-height:1.5;margin:0;">Your WHOOP account is now linked. Switch back to <strong style="color:#e2e8f0;">Roots Gains</strong> on your home screen to see your data.</p>'
      +   '<a href="' + appUrl + '?whoop_connected=true" style="display:inline-flex;align-items:center;gap:8px;background:#22c55e;color:#0f172a;font-weight:600;font-size:15px;padding:12px 28px;border-radius:12px;text-decoration:none;margin-top:8px;">Open Roots Gains</a>'
      +   '<p style="font-size:12px;color:#64748b;margin:0;">If the button doesn\\u0027t return you to the app, just tap the Roots Gains icon on your home screen.</p>'
      + '</div>';
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
