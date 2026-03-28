/**
 * OpenFoodFacts barcode lookup with localStorage caching for offline use.
 *
 * API docs: https://wiki.openfoodfacts.org/API
 * No API key required — the API is free and open.
 */

const CACHE_KEY = 'barcode_cache';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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
 * Look up a barcode via OpenFoodFacts.
 * Returns the product info or null if not found / network error.
 * Results are cached in localStorage for offline access.
 */
export async function lookupBarcode(barcode: string): Promise<BarcodeProduct | null> {
  // Check cache first
  const cached = getCached(barcode);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!res.ok) {
      setCache(barcode, null);
      return null;
    }

    const data = await res.json();

    if (data.status !== 1 || !data.product) {
      setCache(barcode, null);
      return null;
    }

    const p = data.product;
    const nutriments = p.nutriments ?? {};

    // Prefer per-serving values, fall back to per-100g
    const hasServing = typeof nutriments['energy-kcal_serving'] === 'number';
    const suffix = hasServing ? '_serving' : '_100g';

    const product: BarcodeProduct = {
      barcode,
      name: p.product_name || p.product_name_en || 'Unknown product',
      brand: p.brands || '',
      servingSize: p.serving_size || (hasServing ? '' : '100 g'),
      macros: {
        calories: Math.round(nutriments[`energy-kcal${suffix}`] ?? 0),
        protein: Math.round((nutriments[`proteins${suffix}`] ?? 0) * 10) / 10,
        carbs: Math.round((nutriments[`carbohydrates${suffix}`] ?? 0) * 10) / 10,
        fat: Math.round((nutriments[`fat${suffix}`] ?? 0) * 10) / 10,
      },
      imageUrl: p.image_front_small_url || p.image_front_url || undefined,
    };

    setCache(barcode, product);
    return product;
  } catch {
    // Network error — check cache even if expired as offline fallback
    const cache = getCache();
    const entry = cache[barcode];
    if (entry?.product) return entry.product;

    return null;
  }
}
