/**
 * Barcode Scanner Engine — Nutrition lookup from barcode scan
 *
 * Uses Open Food Facts API (free, open-source nutrition database with 3M+ products).
 * Pure functions for URL building, response parsing, and macro math.
 * Actual HTTP fetch calls happen in the API route, not here.
 *
 * Data source:
 * - Open Food Facts: https://world.openfoodfacts.org/
 *   License: Open Database License (ODbL)
 *   Coverage: 3M+ products, 180+ countries
 *
 * Nutrition science context:
 * - Helms et al. 2014: Accurate macro tracking critical during deficit phases
 * - Iraki et al. 2019: ±5% macro accuracy sufficient for body composition goals
 * - Roberts et al. 2020: Barcode scanning reduces logging error by ~40% vs manual
 *
 * All functions are pure — no side effects, no store, no React.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface ScannedFood {
  barcode: string;
  name: string;
  brand?: string;
  servingSize: number;    // grams
  servingUnit: string;
  calories: number;       // kcal per serving
  protein: number;        // grams per serving
  carbs: number;          // grams per serving
  fat: number;            // grams per serving
  fiber?: number;         // grams per serving
  sugar?: number;         // grams per serving
  sodium?: number;        // mg per serving
  imageUrl?: string;
  source: 'open_food_facts' | 'usda' | 'manual';
}

export interface NutritionLookupResult {
  found: boolean;
  food?: ScannedFood;
  alternatives?: ScannedFood[];
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// URL Builders
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build the Open Food Facts product lookup URL for a barcode.
 * Returns the v2 JSON endpoint which includes nutriments, images, and serving info.
 */
export function buildOpenFoodFactsUrl(barcode: string): string {
  const sanitized = barcode.replace(/[^0-9]/g, '');
  return `https://world.openfoodfacts.org/api/v2/product/${sanitized}.json`;
}

/**
 * Build the Open Food Facts search URL for a text query.
 * Useful as a fallback when barcode isn't found, or for manual food search.
 */
export function searchFoodByName(query: string): string {
  return `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=10`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Response Parsing
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse an Open Food Facts API response into our NutritionLookupResult.
 *
 * Handles the many ways OFF data can be incomplete:
 * - Missing nutriments object
 * - Missing serving size (falls back to 100g)
 * - Missing product name (uses barcode as fallback)
 * - Nutriment values as strings or numbers
 *
 * OFF reports nutriments per 100g by default. We normalize to per-serving.
 */
export function parseOpenFoodFactsResponse(data: any): NutritionLookupResult {
  // OFF returns status: 0 for not found, 1 for found
  if (!data || data.status === 0 || !data.product) {
    return {
      found: false,
      error: data?.status_verbose || 'Product not found',
    };
  }

  const product = data.product;
  const nutriments = product.nutriments || {};

  // Determine serving size — OFF stores this inconsistently
  const servingGrams = parseServingSize(product.serving_size, product.serving_quantity);
  const servingUnit = product.serving_size || `${servingGrams}g`;

  // OFF stores values as both per-100g and per-serving.
  // Prefer per-serving if available, otherwise calculate from per-100g.
  const hasPer100g = nutriments['energy-kcal_100g'] !== undefined ||
    nutriments['energy_100g'] !== undefined;
  const hasPerServing = nutriments['energy-kcal_serving'] !== undefined;

  let calories: number;
  let protein: number;
  let carbs: number;
  let fat: number;
  let fiber: number | undefined;
  let sugar: number | undefined;
  let sodium: number | undefined;

  if (hasPerServing) {
    // Use per-serving values directly
    calories = toNum(nutriments['energy-kcal_serving'] ?? nutriments['energy_serving']);
    protein = toNum(nutriments['proteins_serving']);
    carbs = toNum(nutriments['carbohydrates_serving']);
    fat = toNum(nutriments['fat_serving']);
    fiber = toNumOpt(nutriments['fiber_serving']);
    sugar = toNumOpt(nutriments['sugars_serving']);
    sodium = toNumOpt(nutriments['sodium_serving'], 1000); // OFF stores in g, we want mg
  } else if (hasPer100g) {
    // Scale from per-100g to per-serving
    const factor = servingGrams / 100;
    // OFF sometimes stores energy in kJ instead of kcal
    const kcalPer100g = nutriments['energy-kcal_100g']
      ?? (nutriments['energy_100g'] ? nutriments['energy_100g'] / 4.184 : 0);
    calories = round1(toNum(kcalPer100g) * factor);
    protein = round1(toNum(nutriments['proteins_100g']) * factor);
    carbs = round1(toNum(nutriments['carbohydrates_100g']) * factor);
    fat = round1(toNum(nutriments['fat_100g']) * factor);
    fiber = scaleOpt(nutriments['fiber_100g'], factor);
    sugar = scaleOpt(nutriments['sugars_100g'], factor);
    sodium = scaleOpt(nutriments['sodium_100g'], factor * 1000); // g → mg
  } else {
    // No nutrition data at all — still return the product info
    calories = 0;
    protein = 0;
    carbs = 0;
    fat = 0;
  }

  const food: ScannedFood = {
    barcode: product.code || data.code || '',
    name: product.product_name || product.product_name_en || `Product ${product.code || ''}`,
    brand: product.brands || undefined,
    servingSize: servingGrams,
    servingUnit,
    calories: Math.round(calories),
    protein: round1(protein),
    carbs: round1(carbs),
    fat: round1(fat),
    fiber: fiber !== undefined ? round1(fiber) : undefined,
    sugar: sugar !== undefined ? round1(sugar) : undefined,
    sodium: sodium !== undefined ? Math.round(sodium) : undefined,
    imageUrl: product.image_front_small_url || product.image_url || undefined,
    source: 'open_food_facts',
  };

  return { found: true, food };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Serving Size Math
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Scale all macros proportionally to a new serving size in grams.
 *
 * Example: A protein bar has 60g serving with 20g protein.
 * scaleServingSize(bar, 30) → 10g protein (half serving).
 */
export function scaleServingSize(food: ScannedFood, newServingGrams: number): ScannedFood {
  if (food.servingSize <= 0 || newServingGrams <= 0) return food;

  const factor = newServingGrams / food.servingSize;

  return {
    ...food,
    servingSize: newServingGrams,
    servingUnit: `${newServingGrams}g`,
    calories: Math.round(food.calories * factor),
    protein: round1(food.protein * factor),
    carbs: round1(food.carbs * factor),
    fat: round1(food.fat * factor),
    fiber: food.fiber !== undefined ? round1(food.fiber * factor) : undefined,
    sugar: food.sugar !== undefined ? round1(food.sugar * factor) : undefined,
    sodium: food.sodium !== undefined ? Math.round(food.sodium * factor) : undefined,
  };
}

/**
 * Convert a scanned food into the format used by the store's meal logging.
 *
 * Multiplies per-serving macros by the number of servings consumed.
 * This is the bridge between scan → store.addMeal().
 */
export function convertToMealEntry(
  food: ScannedFood,
  servings: number,
): { name: string; calories: number; protein: number; carbs: number; fat: number } {
  const s = Math.max(0, servings);
  return {
    name: food.brand ? `${food.name} (${food.brand})` : food.name,
    calories: Math.round(food.calories * s),
    protein: round1(food.protein * s),
    carbs: round1(food.carbs * s),
    fat: round1(food.fat * s),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Internal Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse OFF serving_size string into grams.
 * OFF format varies wildly: "30g", "1 bar (60g)", "250 ml", "1 portion", etc.
 * Falls back to serving_quantity if available, otherwise 100g default.
 */
function parseServingSize(servingSizeStr?: string, servingQuantity?: number): number {
  // Prefer the numeric serving_quantity field if available
  if (servingQuantity && servingQuantity > 0) {
    return servingQuantity;
  }

  if (!servingSizeStr) return 100; // Default to 100g (per-100g is OFF standard)

  // Try to extract grams: "30g", "30 g", "1 bar (60g)"
  const gramsMatch = servingSizeStr.match(/(\d+(?:\.\d+)?)\s*g(?:r|rams?)?/i);
  if (gramsMatch) {
    const val = parseFloat(gramsMatch[1]);
    if (val > 0) return val;
  }

  // Try ml (assume 1ml ≈ 1g for water-based drinks — rough but better than nothing)
  const mlMatch = servingSizeStr.match(/(\d+(?:\.\d+)?)\s*ml/i);
  if (mlMatch) {
    const val = parseFloat(mlMatch[1]);
    if (val > 0) return val;
  }

  // Try oz (1 oz ≈ 28.35g)
  const ozMatch = servingSizeStr.match(/(\d+(?:\.\d+)?)\s*oz/i);
  if (ozMatch) {
    const val = parseFloat(ozMatch[1]);
    if (val > 0) return round1(val * 28.35);
  }

  return 100; // Fallback
}

/** Safely convert a value to a number, defaulting to 0. */
function toNum(value: any): number {
  if (value === undefined || value === null) return 0;
  const n = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(n) ? 0 : n;
}

/** Convert to number with optional multiplier, returning undefined if absent. */
function toNumOpt(value: any, multiplier = 1): number | undefined {
  if (value === undefined || value === null) return undefined;
  const n = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (isNaN(n)) return undefined;
  return n * multiplier;
}

/** Scale a per-100g value by a factor, returning undefined if absent. */
function scaleOpt(per100gValue: any, factor: number): number | undefined {
  if (per100gValue === undefined || per100gValue === null) return undefined;
  const n = typeof per100gValue === 'string' ? parseFloat(per100gValue) : Number(per100gValue);
  if (isNaN(n)) return undefined;
  return round1(n * factor);
}

/** Round to 1 decimal place. */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
