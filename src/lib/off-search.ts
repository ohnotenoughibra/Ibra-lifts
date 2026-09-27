/**
 * off-search — OpenFoodFacts product search, mapped to our per-100 g food shape.
 * The API route proxies the request (OFF asks for a User-Agent and the CSP
 * only allows OFF for barcode lookups); this module is the pure mapping.
 */
import type { FoodServing, Per100g } from './types';

export interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_de?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string | undefined>;
  countries_tags?: string[];
}

export interface OffFood {
  barcode: string;
  name: string;
  brand?: string;
  per100g: Per100g;
  servings: FoodServing[];
  austria: boolean;
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export function mapOffProduct(p: OffProduct): OffFood | null {
  const n = p.nutriments ?? {};
  const kcal = num(n['energy-kcal_100g']) ?? (num(n['energy_100g']) != null ? num(n['energy_100g'])! / 4.184 : null);
  const protein = num(n['proteins_100g']);
  const carbs = num(n['carbohydrates_100g']);
  const fat = num(n['fat_100g']);
  const name = (p.product_name_de || p.product_name || '').trim();
  if (!name || kcal == null || protein == null || carbs == null || fat == null) return null;
  if (kcal > 950 || protein + carbs + fat > 105) return null; // junk rows
  const per100g: Per100g = {
    calories: Math.round(kcal), protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10, fat: Math.round(fat * 10) / 10,
  };
  const fiber = num(n['fiber_100g']); if (fiber != null) per100g.fiber = Math.round(fiber * 10) / 10;
  const sugar = num(n['sugars_100g']); if (sugar != null) per100g.sugar = Math.round(sugar * 10) / 10;
  const salt = num(n['salt_100g']); if (salt != null) per100g.salt = Math.round(salt * 100) / 100;
  const servings: FoodServing[] = [];
  const sq = num(p.serving_quantity);
  if (sq && sq > 0 && sq < 2000) servings.push({ label: p.serving_size?.trim() || `${sq} g`, grams: sq });
  servings.push({ label: '100 g', grams: 100 });
  const brand = p.brands?.split(',')[0]?.trim() || undefined;
  return {
    barcode: String(p.code ?? ''), name, brand, per100g, servings,
    austria: (p.countries_tags ?? []).includes('en:austria'),
  };
}

/** Map + de-duplicate, Austrian products first. */
export function mapOffResults(products: OffProduct[], limit = 15): OffFood[] {
  const seen = new Set<string>();
  const out: OffFood[] = [];
  for (const p of products ?? []) {
    const f = mapOffProduct(p);
    if (!f) continue;
    const key = `${f.name.toLowerCase()}|${(f.brand ?? '').toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out.sort((a, b) => Number(b.austria) - Number(a.austria)).slice(0, limit);
}

export function offSearchUrl(q: string): string {
  const u = new URL('https://world.openfoodfacts.org/cgi/search.pl');
  u.searchParams.set('search_terms', q);
  u.searchParams.set('search_simple', '1');
  u.searchParams.set('action', 'process');
  u.searchParams.set('json', '1');
  u.searchParams.set('page_size', '30');
  u.searchParams.set('lc', 'de');
  u.searchParams.set('cc', 'at');
  u.searchParams.set('fields', 'code,product_name,product_name_de,brands,serving_size,serving_quantity,nutriments,countries_tags');
  return u.toString();
}
