import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/nutrition/lookup?barcode=XXX
 * Proxies to Open Food Facts API to look up a product by barcode.
 * Open Food Facts is free, no API key needed.
 */
export async function GET(req: NextRequest) {
  const barcode = req.nextUrl.searchParams.get('barcode');
  if (!barcode || !/^\d{4,16}$/.test(barcode)) {
    return NextResponse.json({ error: 'Invalid barcode' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,brands,nutriments,serving_size,image_front_small_url`,
      {
        headers: { 'User-Agent': 'IbraLifts/1.0 (fitness PWA)' },
        next: { revalidate: 86400 }, // Cache for 24h
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const data = await res.json();
    if (data.status !== 1 || !data.product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const p = data.product;
    const n = p.nutriments || {};

    // Normalize to per-serving values (Open Food Facts uses per 100g by default)
    // Prefer per-serving if available, otherwise use per 100g
    const calories = Math.round(n['energy-kcal_serving'] || n['energy-kcal_100g'] || 0);
    const protein = Math.round((n.proteins_serving || n.proteins_100g || 0) * 10) / 10;
    const carbs = Math.round((n.carbohydrates_serving || n.carbohydrates_100g || 0) * 10) / 10;
    const fat = Math.round((n.fat_serving || n.fat_100g || 0) * 10) / 10;

    return NextResponse.json({
      name: p.product_name || 'Unknown Product',
      brand: p.brands || undefined,
      calories,
      protein,
      carbs,
      fat,
      servingSize: p.serving_size || '100g',
      imageUrl: p.image_front_small_url || undefined,
      barcode,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to look up product' }, { status: 500 });
  }
}
