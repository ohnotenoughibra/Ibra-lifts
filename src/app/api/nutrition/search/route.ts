import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/nutrition/search?q=chicken+breast
 * Searches Open Food Facts for food products by text query.
 * Returns top 10 results with nutrition data.
 * Free API, no key needed.
 */
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q');
  if (!query || query.trim().length < 2) {
    return NextResponse.json({ error: 'Query too short' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10&fields=product_name,brands,nutriments,serving_size,code,image_front_small_url`,
      {
        headers: { 'User-Agent': 'IbraLifts/1.0 (fitness PWA)' },
        next: { revalidate: 3600 }, // Cache for 1h
      }
    );

    if (!res.ok) {
      return NextResponse.json([], { status: 200 });
    }

    const data = await res.json();
    const products = data.products || [];

    const results = products
      .filter((p: Record<string, unknown>) => {
        const n = p.nutriments as Record<string, number> | undefined;
        // Only include products with at least calorie data
        return n && (n['energy-kcal_100g'] || n['energy-kcal_serving']);
      })
      .map((p: Record<string, unknown>) => {
        const n = p.nutriments as Record<string, number>;
        const calories = Math.round(n['energy-kcal_serving'] || n['energy-kcal_100g'] || 0);
        const protein = Math.round((n.proteins_serving || n.proteins_100g || 0) * 10) / 10;
        const carbs = Math.round((n.carbohydrates_serving || n.carbohydrates_100g || 0) * 10) / 10;
        const fat = Math.round((n.fat_serving || n.fat_100g || 0) * 10) / 10;

        const name = (p.product_name as string) || 'Unknown';
        const brand = (p.brands as string) || undefined;

        return {
          name: brand ? `${name} (${brand})` : name,
          brand,
          calories,
          protein,
          carbs,
          fat,
          servingSize: (p.serving_size as string) || '100g',
          imageUrl: (p.image_front_small_url as string) || undefined,
          barcode: (p.code as string) || '',
        };
      })
      .slice(0, 10);

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
