import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { auth } from '@/lib/auth';
import { rateLimitDaily } from '@/lib/rate-limit';
import {
  AI_MODEL, PARSE_SYSTEM, SUGGEST_SYSTEM, ParseRequestSchema, SuggestRequestSchema,
  ParseResultSchema, SuggestResultSchema, parseUserText, suggestUserText, sanitizeItems,
} from '@/lib/nutrition-ai';

/**
 * POST /api/nutrition/ai — Claude for the food log.
 *
 *   { mode: 'parse', text?, image? }  → { items[], mealType, clarification }
 *   { mode: 'suggest', slot, macros, diet, dislikes, cookingTime, recent } → { meals[] }
 *
 * Signed-in only, 40 calls per user per day (Postgres-backed, like ai-coach).
 * Needs ANTHROPIC_API_KEY; without it the client falls back to search/recipes.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DAILY_LIMIT = 40;

/**
 * Server-side refusal fallback: a declined request is re-run on Anthropic's
 * recommended model for that refusal category. SDK 0.104 only types the
 * array form, so the "default" mode is spread in untyped.
 */
const REFUSAL_FALLBACK = { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } as object;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI logging is not configured', fallback: true }, { status: 503 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }
  const mode = (body as { mode?: string })?.mode;

  const parseReq = mode === 'parse' ? ParseRequestSchema.safeParse(body) : null;
  const suggestReq = mode === 'suggest' ? SuggestRequestSchema.safeParse(body) : null;
  if (!(parseReq?.success || suggestReq?.success)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { limited, remaining } = await rateLimitDaily(`nutrition-ai:${session.user.id}`, DAILY_LIMIT);
  if (limited) {
    return NextResponse.json({ error: `Daily AI limit reached (${DAILY_LIMIT}). Search and recipes still work.`, rateLimited: true }, { status: 429 });
  }

  const client = new Anthropic({ apiKey });
  try {
    if (parseReq?.success) {
      const r = parseReq.data;
      const content: Anthropic.Beta.BetaContentBlockParam[] = [];
      if (r.image) content.push({ type: 'image', source: { type: 'base64', media_type: r.image.mediaType, data: r.image.data } });
      content.push({ type: 'text', text: parseUserText(r.text, !!r.image) });
      const msg = await client.beta.messages.parse({
        model: AI_MODEL,
        max_tokens: 16000,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'low', format: betaZodOutputFormat(ParseResultSchema) },
        ...REFUSAL_FALLBACK,
        system: PARSE_SYSTEM,
        messages: [{ role: 'user', content }],
      });
      if (msg.stop_reason === 'refusal') return NextResponse.json({ error: 'Could not analyse that — try describing it in words' }, { status: 422 });
      if (!msg.parsed_output) return NextResponse.json({ error: 'AI returned an unreadable answer — try again' }, { status: 502 });
      const out = msg.parsed_output;
      return NextResponse.json({ ...out, items: sanitizeItems(out.items), remaining });
    }

    const r = suggestReq!.data!;
    const msg = await client.beta.messages.parse({
      model: AI_MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: betaZodOutputFormat(SuggestResultSchema) },
      ...REFUSAL_FALLBACK,
      system: SUGGEST_SYSTEM,
      messages: [{ role: 'user', content: suggestUserText(r) }],
    });
    if (msg.stop_reason === 'refusal') return NextResponse.json({ error: 'No suggestions for that request' }, { status: 422 });
    if (!msg.parsed_output) return NextResponse.json({ error: 'AI returned an unreadable answer — try again' }, { status: 502 });
    return NextResponse.json({ meals: msg.parsed_output.meals.slice(0, 4), remaining });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return NextResponse.json({ error: 'AI is busy — try again in a minute' }, { status: 503 });
    if (err instanceof Anthropic.APIError) {
      console.error('nutrition-ai API error', err.status, err.message);
      return NextResponse.json({ error: 'AI unavailable right now' }, { status: 502 });
    }
    console.error('nutrition-ai error', err);
    return NextResponse.json({ error: 'AI unavailable right now' }, { status: 502 });
  }
}
