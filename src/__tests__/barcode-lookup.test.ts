import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { lookupBarcode } from '@/lib/barcode-lookup';

// A minimal OpenFoodFacts-shaped product payload.
const OFF_PRODUCT = {
  status: 1,
  product: {
    product_name: 'Test Bar',
    brands: 'TestBrand',
    serving_size: '40 g',
    nutriments: {
      'energy-kcal_serving': 180,
      'proteins_serving': 20,
      'carbohydrates_serving': 12,
      'fat_serving': 6,
    },
  },
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('lookupBarcode', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns found and caches a successful lookup', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(OFF_PRODUCT));

    const result = await lookupBarcode('111');
    expect(result.status).toBe('found');
    if (result.status === 'found') {
      expect(result.product.name).toBe('Test Bar');
      expect(result.product.macros.calories).toBe(180);
      expect(result.product.macros.protein).toBe(20);
    }

    // Second call is served from cache — fetch not hit again.
    const cached = await lookupBarcode('111');
    expect(cached.status).toBe('found');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('treats a 404 as not_found and caches it', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}, 404));

    const result = await lookupBarcode('404bar');
    expect(result.status).toBe('not_found');

    // Cached — a known-missing barcode does not re-hit the network.
    const again = await lookupBarcode('404bar');
    expect(again.status).toBe('not_found');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('treats status:0 body as not_found', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ status: 0 }));
    const result = await lookupBarcode('zero');
    expect(result.status).toBe('not_found');
  });

  it('returns error (NOT not_found) on a persistent 5xx, and does not cache it', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}, 503));

    const result = await lookupBarcode('flaky');
    // The key bug fix: a transient DB failure must NOT masquerade as not_found.
    expect(result.status).toBe('error');
    // Retried once → two fetches for one lookup.
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // Not cached: a later (recovered) lookup must be able to succeed.
    fetchSpy.mockResolvedValue(jsonResponse(OFF_PRODUCT));
    const recovered = await lookupBarcode('flaky');
    expect(recovered.status).toBe('found');
  });

  it('recovers within a single call when the first attempt 5xxs and the retry succeeds', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({}, 500))
      .mockResolvedValueOnce(jsonResponse(OFF_PRODUCT));

    const result = await lookupBarcode('retry-wins');
    expect(result.status).toBe('found');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('returns error on network rejection without caching a false not_found', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    const result = await lookupBarcode('offline');
    expect(result.status).toBe('error');
  });

  it('surfaces a timeout-specific message and fails fast (no retry) when the request aborts', async () => {
    const timeoutErr = Object.assign(new Error('timed out'), { name: 'TimeoutError' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(timeoutErr);
    const result = await lookupBarcode('slowbar');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.message).toBe('The food database timed out');
    }
    // A timeout already consumed the full budget — don't double the wait.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('retries a 429 rate-limit and reports the status in the error message', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}, 429));
    const result = await lookupBarcode('ratelimited');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.message).toBe('Food database error (429)');
    }
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('reports the status in the error message on a persistent 5xx', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}, 503));
    const result = await lookupBarcode('down5xx');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.message).toBe('Food database error (503)');
    }
  });

  it('treats a 200 response with status:1 but no product as not_found', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ status: 1 }));
    const result = await lookupBarcode('noproduct');
    expect(result.status).toBe('not_found');
  });

  it('falls back to a stale cached product when the API persistently 5xxs', async () => {
    const eightDaysMs = 8 * 24 * 60 * 60 * 1000;
    const staleProduct = {
      barcode: 'stale5xx',
      name: 'Stale 5xx Bar',
      brand: '',
      servingSize: '40 g',
      macros: { calories: 150, protein: 15, carbs: 10, fat: 5 },
    };
    localStorage.setItem(
      'barcode_cache',
      JSON.stringify({ stale5xx: { product: staleProduct, timestamp: Date.now() - eightDaysMs } }),
    );
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}, 503));
    const result = await lookupBarcode('stale5xx');
    expect(result.status).toBe('found');
    if (result.status === 'found') {
      expect(result.product.name).toBe('Stale 5xx Bar');
    }
  });

  it('falls back to a stale cached product when a live lookup fails (offline resilience)', async () => {
    // Seed an EXPIRED cache entry (older than the 7-day TTL) holding a real
    // product. getCached() ignores it (expired), so the network is attempted;
    // when the network fails, the stale entry should still rescue the user.
    const eightDaysMs = 8 * 24 * 60 * 60 * 1000;
    const staleProduct = {
      barcode: 'stale1',
      name: 'Stale Bar',
      brand: '',
      servingSize: '40 g',
      macros: { calories: 150, protein: 15, carbs: 10, fat: 5 },
    };
    localStorage.setItem(
      'barcode_cache',
      JSON.stringify({ stale1: { product: staleProduct, timestamp: Date.now() - eightDaysMs } }),
    );

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    const result = await lookupBarcode('stale1');
    expect(result.status).toBe('found');
    if (result.status === 'found') {
      expect(result.product.name).toBe('Stale Bar');
    }
  });

  it('coerces non-numeric / junk macro values to finite numbers (never NaN)', async () => {
    // OpenFoodFacts is community-edited and can return strings, empty strings,
    // or garbage. A single NaN here would poison every meal-log total it feeds.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        status: 1,
        product: {
          product_name: 'Junk Macros Bar',
          nutriments: {
            'energy-kcal_serving': '210',      // numeric string → 210
            'proteins_serving': 'not-a-number', // junk → 0
            'carbohydrates_serving': '',        // empty → 0
            'fat_serving': 7.4,                 // real number → 7.4
          },
        },
      }),
    );
    const result = await lookupBarcode('junkmacros');
    expect(result.status).toBe('found');
    if (result.status === 'found') {
      const m = result.product.macros;
      expect(m.calories).toBe(210);
      expect(m.protein).toBe(0);
      expect(m.carbs).toBe(0);
      expect(m.fat).toBe(7.4);
      // Critically: nothing is NaN.
      expect(Number.isNaN(m.calories + m.protein + m.carbs + m.fat)).toBe(false);
    }
  });

  it('falls back to per-100g macros when no per-serving values exist', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        status: 1,
        product: {
          product_name: 'Per100 Bar',
          nutriments: {
            'energy-kcal_100g': 400,
            'proteins_100g': 30,
            'carbohydrates_100g': 40,
            'fat_100g': 10,
          },
        },
      }),
    );
    const result = await lookupBarcode('per100');
    expect(result.status).toBe('found');
    if (result.status === 'found') {
      expect(result.product.macros.calories).toBe(400);
      expect(result.product.servingSize).toBe('100 g');
    }
  });
});
