/**
 * OpenFoodFacts barcode lookup with localStorage caching for offline use.
 *
 * API docs: https://wiki.openfoodfacts.org/API
 * No API key required — the API is free and open.
 */

const CACHE_KEY = 'barcode_cache';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Lookup tuning. MAX_LOOKUP_ATTEMPTS is load-bearing — the retry-once contract
// (and its test) depend on it, so it lives here as a named source of truth.
const MAX_LOOKUP_ATTEMPTS = 2;
const LOOKUP_TIMEOUT_MS = 8000;
const DEFAULT_LOOKUP_ERROR = "Couldn't reach the food database";

export interface BarcodeProduct {
  barcode: string;
  name: string;
  brand: string;
  servingSize: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  imageUrl?: string;
}

interface CacheEntry {
  product: BarcodeProduct | null;
  timestamp: number;
}

// ── Cache helpers ────────────────────────────────────────────────────────────

function getCache(): Record<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setCache(barcode: string, product: BarcodeProduct | null): void {
  try {
    const cache = getCache();
    cache[barcode] = { product, timestamp: Date.now() };

    // Evict entries older than TTL to prevent unbounded growth
    const now = Date.now();
    for (const key of Object.keys(cache)) {
      if (now - cache[key].timestamp > CACHE_TTL_MS) {
        delete cache[key];
      }
    }

    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

function getCached(barcode: string): BarcodeProduct | null | undefined {
  const cache = getCache();
  const entry = cache[barcode];
  if (!entry) return undefined; // not in cache
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) return undefined; // expired
  return entry.product; // could be null (= "known not-found")
}

// ── Lookup ───────────────────────────────────────────────────────────────────

/**
 * Outcome of a barcode lookup. Distinguishing 'error' from 'not_found' matters:
 * OpenFoodFacts is a free, frequently rate-limited/flaky API, so a transient
 * failure on a REAL product used to surface as "not found" (misleading — the
 * product IS in the database). Now the UI can say "couldn't reach the food
 * database, try again" vs "not in the database, add it manually".
 */
export type BarcodeLookupResult =
  | { status: 'found'; product: BarcodeProduct }
  | { status: 'not_found' }
  | { status: 'error'; message: string };

// OpenFoodFacts is community-edited and notoriously loose with types — a macro
// field can arrive as a string ("12.5"), an empty string, or junk. Coerce to a
// finite number or 0, never NaN. A single NaN here would poison every meal-log
// total it flows into (Math.round(NaN * servings) === NaN), so this guard is
// the trust boundary between the remote payload and the user's nutrition data.
function finiteNum(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseProduct(barcode: string, p: Record<string, unknown>): BarcodeProduct {
  const nutriments = (p.nutriments ?? {}) as Record<string, unknown>;
  // Prefer per-serving values, fall back to per-100g. "Has serving" means the
  // serving energy is actually present and parses to a finite number (not '',
  // null, or junk) — otherwise we'd pick the _serving suffix and read zeros.
  const servingEnergy = nutriments['energy-kcal_serving'];
  const hasServing = servingEnergy != null && servingEnergy !== '' && Number.isFinite(Number(servingEnergy));
  const suffix = hasServing ? '_serving' : '_100g';
  return {
    barcode,
    name: (p.product_name as string) || (p.product_name_en as string) || 'Unknown product',
    brand: (p.brands as string) || '',
    servingSize: (p.serving_size as string) || (hasServing ? '' : '100 g'),
    macros: {
      calories: Math.round(finiteNum(nutriments[`energy-kcal${suffix}`])),
      protein: Math.round(finiteNum(nutriments[`proteins${suffix}`]) * 10) / 10,
      carbs: Math.round(finiteNum(nutriments[`carbohydrates${suffix}`]) * 10) / 10,
      fat: Math.round(finiteNum(nutriments[`fat${suffix}`]) * 10) / 10,
    },
    imageUrl: (p.image_front_small_url as string) || (p.image_front_url as string) || undefined,
  };
}

/**
 * Look up a barcode via OpenFoodFacts. Retries once on a transient failure
 * before giving up. Successful results and confirmed not-founds are cached;
 * transient errors are NOT cached, so a flaky network never poisons a real
 * product as "not found" for 7 days.
 */
export async function lookupBarcode(barcode: string): Promise<BarcodeLookupResult> {
  // Cache hit (product OR known-not-found) short-circuits
  const cached = getCached(barcode);
  if (cached !== undefined) {
    return cached ? { status: 'found', product: cached } : { status: 'not_found' };
  }

  let lastErrorMessage = DEFAULT_LOOKUP_ERROR;
  // Up to two attempts — OpenFoodFacts frequently 5xx/rate-limits on the first hit
  for (let attempt = 0; attempt < MAX_LOOKUP_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
        { signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS) }
      );

      if (!res.ok) {
        // 404 = genuinely unknown barcode (cache it); 429/5xx = transient (retry)
        if (res.status === 404) {
          setCache(barcode, null);
          return { status: 'not_found' };
        }
        lastErrorMessage = `Food database error (${res.status})`;
        continue;
      }

      const data = await res.json();

      if (data.status === 0 || !data.product) {
        setCache(barcode, null);
        return { status: 'not_found' };
      }

      const product = parseProduct(barcode, data.product as Record<string, unknown>);
      setCache(barcode, product);
      return { status: 'found', product };
    } catch (err) {
      // A timeout already consumed the full LOOKUP_TIMEOUT_MS budget. Retrying
      // would double the wait (up to ~16s) before the user sees anything, and
      // they now have an explicit Retry button — so fail fast on timeout and
      // only auto-retry the cheap-to-fail cases (network blip, non-JSON body).
      if (err instanceof Error && err.name === 'TimeoutError') {
        lastErrorMessage = 'The food database timed out';
        break;
      }
      lastErrorMessage = DEFAULT_LOOKUP_ERROR;
    }
  }

  // Both attempts failed. Fall back to a stale cache entry if we have one,
  // otherwise report the error (NOT cached) so a later retry can still succeed.
  const stale = getCache()[barcode]?.product;
  if (stale) return { status: 'found', product: stale };
  return { status: 'error', message: lastErrorMessage };
}
