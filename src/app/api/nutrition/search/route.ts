import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { mapOffResults, offSearchUrl, type OffProduct } from '@/lib/off-search';

/**
 * GET /api/nutrition/search?q=… — packaged products from OpenFoodFacts
 * (Austrian products first). The built-in library + your own foods are
 * searched on the device; this fills in brands (Spar, Clever, S-Budget,
 * Ja! Natürlich, Milfina…).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 2 || q.length > 80) return NextResponse.json({ foods: [] });
  const { limited } = rateLimit(`off-search:${session.user.id}`, 60, 60 * 1000);
  if (limited) return NextResponse.json({ error: 'Too many searches' }, { status: 429 });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(offSearchUrl(q), {
      headers: { 'User-Agent': 'RootsGains/2 (nutrition search; contact via rootsgains.com)' },
      signal: ctrl.signal,
      next: { revalidate: 86400 },
    });
    if (!res.ok) return NextResponse.json({ foods: [], error: `OpenFoodFacts ${res.status}` }, { status: 502 });
    const data = (await res.json()) as { products?: OffProduct[] };
    return NextResponse.json({ foods: mapOffResults(data.products ?? []) }, {
      headers: { 'Cache-Control': 'private, max-age=3600' },
    });
  } catch {
    return NextResponse.json({ foods: [], error: 'OpenFoodFacts unreachable' }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
