// ---------------------------------------------------------------------------
// Shared Whoop OAuth & API utilities
// Used by /api/whoop/auth, /api/whoop/callback, and /api/whoop/data
// ---------------------------------------------------------------------------

export const WHOOP_API_BASE = 'https://api.prod.whoop.com/developer/v2';
export const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';
export const WHOOP_AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';

export const WHOOP_SCOPES = [
  'read:recovery',
  'read:cycles',
  'read:sleep',
  'read:workout',
  'read:profile',
  'read:body_measurement',
  'offline',
].join(' ');

// localStorage keys used on the client
export const LS_KEYS = {
  accessToken: 'whoop_access_token',
  refreshToken: 'whoop_refresh_token',
  tokenExpires: 'whoop_token_expires',
  oauthState: 'whoop_oauth_state',
} as const;

/**
 * Detect the canonical app URL from the incoming request.
 * Priority: NEXT_PUBLIC_APP_URL > x-forwarded-host > host header > VERCEL_URL > localhost
 */
export function getAppUrl(request: Request): string {
  // 1. Explicit env var (most reliable for production)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }

  // 2. Vercel sets x-forwarded-host on every request
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  // 3. Standard host header
  const host = request.headers.get('host');
  if (host) {
    const proto = host.includes('localhost') ? 'http' : 'https';
    return `${proto}://${host}`;
  }

  // 4. VERCEL_URL env var (available at build/runtime on Vercel)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // 5. Fallback for local dev
  return 'http://localhost:3000';
}

/**
 * Exchange a refresh token for a new access token.
 * Returns null if refresh fails (caller should prompt reconnect).
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
} | null> {
  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch(WHOOP_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken,
      expires_in: data.expires_in || 3600,
    };
  } catch {
    return null;
  }
}

/**
 * Make an authenticated GET request to the Whoop Developer API.
 * Returns { data, error } — never throws.
 */
export async function whoopFetch(
  endpoint: string,
  accessToken: string,
  params?: Record<string, string>
): Promise<{ data: any; error?: string }> {
  try {
    const url = new URL(`${WHOOP_API_BASE}${endpoint}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return {
        data: null,
        error: `${endpoint}: HTTP ${res.status} — ${body.substring(0, 120)}`,
      };
    }

    return { data: await res.json() };
  } catch (err: any) {
    return {
      data: null,
      error: `${endpoint}: ${err.message || 'network error'}`,
    };
  }
}

/** Whoop's per-page maximum. */
const PAGE_LIMIT = '25';
/** Safety cap: 8 pages × 25 = 200 records per collection (60 days of 2-a-days fits). */
const MAX_PAGES = 8;

export function clampDays(raw: unknown): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) return 7;
  return Math.min(60, n);
}

/**
 * Fetch every page of a Whoop collection in the window (follows `next_token`).
 * Returns `{ data: { records } }` like a single-page whoopFetch; an error on a
 * later page keeps the records already fetched and reports the error.
 */
export async function whoopFetchAll(
  endpoint: string,
  accessToken: string,
  range: { start: string; end: string },
): Promise<{ data: { records: unknown[] } | null; error?: string }> {
  const records: unknown[] = [];
  let nextToken: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const params: Record<string, string> = { ...range, limit: PAGE_LIMIT };
    if (nextToken) params.nextToken = nextToken;
    const res = await whoopFetch(endpoint, accessToken, params);
    if (res.error) return page === 0 ? { data: null, error: res.error } : { data: { records }, error: res.error };
    records.push(...(res.data?.records ?? []));
    nextToken = res.data?.next_token || undefined;
    if (!nextToken) break;
  }
  return { data: { records } };
}

/**
 * Safely embed a value in an inline <script> tag.
 * JSON.stringify handles most cases, but we also replace the </script>
 * attack vector to prevent XSS via closing script tags.
 */
export function safeInlineJSON(value: string): string {
  return JSON.stringify(value).replace(/<\//g, '<\\/');
}
