import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

const SYSTEM_PROMPT = `You are a nutrition analysis assistant for a fitness and lifting app.
All portions should be in grams (g) or milliliters (ml). Use kcal for calories.
If shown a nutrition label, extract the exact values from the label.

ALWAYS respond with valid JSON in this exact format:
{
  "name": "Food name (portion size in g/ml)",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "confidence": "high" | "medium" | "low",
  "notes": "optional brief note about the estimate"
}

If you cannot identify the food or the description is unclear, respond with:
{
  "name": "",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "confidence": "low",
  "notes": "Could not identify food"
}`;

function parseAIResponse(content: string) {
  let jsonStr = content.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr);

  return {
    name: parsed.name || 'Unknown food',
    calories: Math.round(parsed.calories || 0),
    protein: Math.round(parsed.protein || 0),
    carbs: Math.round(parsed.carbs || 0),
    fat: Math.round(parsed.fat || 0),
    confidence: parsed.confidence || 'low',
    notes: parsed.notes || '',
  };
}

/**
 * POST /api/nutrition/analyze
 *
 * Two modes:
 * 1. Image: { image: string (base64 data URL) }  — analyzes a food photo
 * 2. Text:  { text: string }                      — estimates macros from a description
 *
 * Returns: { name, calories, protein, carbs, fat, confidence, notes }
 */
export async function POST(request: NextRequest) {
  // Require authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit: 10 analyses per minute per IP
  const ip = getClientIP(request);
  const { limited } = rateLimit(`nutrition:${ip}`, 10, 60 * 1000);
  if (limited) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Food recognition is not configured. Add OPENAI_API_KEY to your environment.' },
      { status: 501 }
    );
  }

  let body: { image?: string; text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { image, text } = body;

  // ── Text-based analysis ──────────────────────────────────────────────────
  if (text && typeof text === 'string') {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 500) {
      return NextResponse.json({ error: 'Description must be 1-500 characters.' }, { status: 400 });
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: `Estimate the nutrition for this food: "${trimmed}". If a portion size isn't specified, use a typical single serving. Return JSON only.`,
            },
          ],
          max_tokens: 300,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error('OpenAI API error:', response.status, errText);
        const userMessage = response.status === 429
          ? 'OpenAI rate limit reached. Wait a moment and try again.'
          : response.status === 401
          ? 'OpenAI API key is invalid. Check your OPENAI_API_KEY.'
          : 'AI analysis failed. Try again in a moment.';
        return NextResponse.json({ error: userMessage }, { status: 502 });
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim() || '';
      return NextResponse.json(parseAIResponse(content));
    } catch (err: any) {
      console.error('Nutrition text analysis error:', err);
      return NextResponse.json(
        { error: 'Analysis failed. Please try again.' },
        { status: 500 }
      );
    }
  }

  // ── Image-based analysis ─────────────────────────────────────────────────
  if (!image || typeof image !== 'string') {
    return NextResponse.json({ error: 'Provide either "text" or "image" in the request body.' }, { status: 400 });
  }

  // Reject images larger than 4MB base64 (~3MB binary)
  if (image.length > 4 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image too large. Maximum size is 3MB.' }, { status: 413 });
  }

  // Validate it looks like a data URL or raw base64
  const isDataUrl = image.startsWith('data:image/');
  if (!isDataUrl && image.length < 100) {
    return NextResponse.json({ error: 'Invalid image data.' }, { status: 400 });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this food image or nutrition label. Estimate the macros for a typical portion size. Return JSON only.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: isDataUrl ? image : `data:image/jpeg;base64,${image}`,
                  detail: 'low',
                },
              },
            ],
          },
        ],
        max_tokens: 300,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('OpenAI API error:', response.status, errText);
      const userMessage = response.status === 429
        ? 'OpenAI rate limit reached. Wait a moment and try again.'
        : response.status === 401
        ? 'OpenAI API key is invalid. Check your OPENAI_API_KEY.'
        : 'AI analysis failed. Try again in a moment.';
      return NextResponse.json({ error: userMessage }, { status: 502 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';
    return NextResponse.json(parseAIResponse(content));
  } catch (err: any) {
    console.error('Nutrition analysis error:', err);
    return NextResponse.json(
      { error: 'Analysis failed. Please try again with a clearer image.' },
      { status: 500 }
    );
  }
}
