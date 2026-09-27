/**
 * AI logging + OpenFoodFacts search (2026-09 nutrition rebuild).
 * The SDK is mocked — these lock the request shape, validation and mapping.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mapOffProduct, mapOffResults, offSearchUrl } from '@/lib/off-search';
import { referenceTable, sanitizeItems, ParseRequestSchema, SuggestRequestSchema, suggestUserText } from '@/lib/nutrition-ai';

const parse = vi.fn();
vi.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error { status = 500; }
  class RateLimitError extends APIError { status = 429; }
  class Anthropic { beta = { messages: { parse } }; static APIError = APIError; static RateLimitError = RateLimitError; }
  return { default: Anthropic };
});
vi.mock('@/lib/auth', () => ({ auth: async () => ({ user: { id: 'u1' } }) }));
const limiter = { limited: false };
vi.mock('@/lib/rate-limit', () => ({
  rateLimitDaily: async () => ({ limited: limiter.limited, remaining: 39 }),
  rateLimit: () => ({ limited: false }),
}));

import { POST } from '@/app/api/nutrition/ai/route';

const post = (body: unknown) => POST(new Request('http://x/api/nutrition/ai', { method: 'POST', body: JSON.stringify(body) }));

beforeEach(() => {
  parse.mockReset();
  limiter.limited = false;
  process.env.ANTHROPIC_API_KEY = 'test';
});

describe('OpenFoodFacts mapping', () => {
  const skyr = {
    code: '9001234', product_name_de: 'Skyr Natur', brands: 'Clever, REWE', serving_size: '150 g', serving_quantity: 150,
    nutriments: { 'energy-kcal_100g': 62, proteins_100g: 11, carbohydrates_100g: 4, fat_100g: 0.2, sugars_100g: 4, salt_100g: 0.1 },
    countries_tags: ['en:austria'],
  };
  it('maps per-100 g, serving and brand', () => {
    expect(mapOffProduct(skyr)).toEqual({
      barcode: '9001234', name: 'Skyr Natur', brand: 'Clever',
      per100g: { calories: 62, protein: 11, carbs: 4, fat: 0.2, sugar: 4, salt: 0.1 },
      servings: [{ label: '150 g', grams: 150 }, { label: '100 g', grams: 100 }], austria: true,
    });
  });
  it('drops rows without macros or with junk values; Austria first; de-duplicates', () => {
    const noKcal = { product_name: 'X', nutriments: { proteins_100g: 1 } };
    const junk = { product_name: 'Y', nutriments: { 'energy-kcal_100g': 5000, proteins_100g: 1, carbohydrates_100g: 1, fat_100g: 1 } };
    const german = { ...skyr, code: '4000', product_name_de: 'Skyr', countries_tags: ['en:germany'] };
    const r = mapOffResults([german, noKcal, junk, skyr, skyr]);
    expect(r.map(f => f.barcode)).toEqual(['9001234', '4000']);
  });
  it('kJ-only products are converted', () => {
    expect(mapOffProduct({ product_name: 'Brot', nutriments: { energy_100g: 1046, proteins_100g: 8, carbohydrates_100g: 40, fat_100g: 1.5 } })!.per100g.calories).toBe(250);
  });
  it('searches with Austrian locale', () => {
    const u = new URL(offSearchUrl('skyr'));
    expect(u.searchParams.get('cc')).toBe('at');
    expect(u.searchParams.get('lc')).toBe('de');
  });
});

describe('prompt helpers', () => {
  it('grounds the parse on matching library foods', () => {
    const t = referenceTable('2 Semmeln mit Schinken und ein Skyr');
    expect(t).toMatch(/Kaisersemmel.*: 280 kcal/);
    expect(t).toMatch(/Skyr natur/);
    expect(t).toMatch(/Beinschinken/);
  });
  it('sanitises model numbers (no kcal far below the macros, no negatives)', () => {
    const [a] = sanitizeItems([{ name: 'Topfen', grams: 250.4, calories: 50, protein: 30, carbs: 10, fat: -1, fiber: 0, confidence: 'high', note: '' }]);
    expect(a).toMatchObject({ grams: 250, fat: 0, calories: 160 });
    const [beer] = sanitizeItems([{ name: 'Bier', grams: 500, calories: 215, protein: 2.5, carbs: 17.5, fat: 0, fiber: 0, confidence: 'high', note: '' }]);
    expect(beer.calories).toBe(215); // alcohol kcal above macros is kept
  });
  it('validates requests', () => {
    expect(ParseRequestSchema.safeParse({ mode: 'parse' }).success).toBe(false);
    expect(ParseRequestSchema.safeParse({ mode: 'parse', text: 'Gröstl' }).success).toBe(true);
    const s = SuggestRequestSchema.parse({ mode: 'suggest', slot: 'pre', macros: { protein: 10, carbs: 60, fat: 3 }, diet: ['halal'] });
    expect(suggestUserText(s)).toMatch(/pre-training.*low fat/);
    expect(suggestUserText(s)).toMatch(/halal/);
  });
});

describe('POST /api/nutrition/ai', () => {
  it('parse: calls Claude with structured output + refusal fallback and returns sanitised items', async () => {
    parse.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      parsed_output: { mealType: 'breakfast', clarification: '', items: [
        { name: 'Kaisersemmel', grams: 100, calories: 280, protein: 9, carbs: 55, fat: 1.5, fiber: 3, confidence: 'high', note: '2 Semmeln' },
      ] },
    });
    const res = await post({ mode: 'parse', text: '2 Semmeln' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items[0]).toMatchObject({ name: 'Kaisersemmel', grams: 100, calories: 280 });
    const req = parse.mock.calls[0][0];
    expect(req.model).toBe('claude-opus-5');
    expect(req.thinking).toEqual({ type: 'adaptive' });
    expect(req.output_config.effort).toBe('low');
    expect(req.output_config.format).toBeTruthy();
    expect(req.fallbacks).toBe('default');
    expect(req.betas).toContain('server-side-fallback-2026-07-01');
    expect(JSON.stringify(req.messages)).toMatch(/Reference table/);
  });

  it('parse with a photo sends an image block first', async () => {
    parse.mockResolvedValueOnce({ stop_reason: 'end_turn', parsed_output: { mealType: 'lunch', clarification: '', items: [] } });
    await post({ mode: 'parse', image: { mediaType: 'image/jpeg', data: 'aGVsbG8=' } });
    const content = parse.mock.calls[0][0].messages[0].content;
    expect(content[0]).toMatchObject({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg' } });
    expect(content[1].type).toBe('text');
  });

  it('suggest returns meals', async () => {
    parse.mockResolvedValueOnce({ stop_reason: 'end_turn', parsed_output: { meals: [{ name: 'Hendl-Reis', minutes: 20, ingredients: [], steps: [], why: '' }] } });
    const res = await post({ mode: 'suggest', slot: 'post', macros: { protein: 50, carbs: 90, fat: 15 } });
    expect((await res.json()).meals[0].name).toBe('Hendl-Reis');
    expect(parse.mock.calls[0][0].output_config.effort).toBe('medium');
  });

  it('refusal → 422, unparseable → 502, bad body → 400, rate limit → 429, no key → 503', async () => {
    parse.mockResolvedValueOnce({ stop_reason: 'refusal', parsed_output: null });
    expect((await post({ mode: 'parse', text: 'x' })).status).toBe(422);
    parse.mockResolvedValueOnce({ stop_reason: 'end_turn', parsed_output: null });
    expect((await post({ mode: 'parse', text: 'x' })).status).toBe(502);
    expect((await post({ mode: 'nope' })).status).toBe(400);
    limiter.limited = true;
    expect((await post({ mode: 'parse', text: 'x' })).status).toBe(429);
    limiter.limited = false;
    delete process.env.ANTHROPIC_API_KEY;
    expect((await post({ mode: 'parse', text: 'x' })).status).toBe(503);
  });
});
