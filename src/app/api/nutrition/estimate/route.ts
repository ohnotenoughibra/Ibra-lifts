import { NextRequest, NextResponse } from 'next/server';

/**
 * AI Food Estimation API — uses Gemini 2.5 Flash (free tier: 250 req/day)
 * Falls back gracefully if no API key or quota exceeded.
 *
 * POST /api/nutrition/estimate
 * Body: { query: string }
 * Returns: { foods: [{ name, calories, protein, carbs, fat, portion }], source: 'ai' }
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent';

const SYSTEM_PROMPT = `You are a precise nutrition database. Given a food description, return a JSON object with estimated macronutrients.

Rules:
- Use USDA nutrient database values as reference
- If a quantity/weight is specified (e.g., "200g chicken"), calculate macros for that exact amount
- If no quantity is specified, assume a standard serving size and state it in the portion field
- Handle multi-item descriptions: "chicken and rice" = separate items summed
- Handle informal descriptions: "a couple eggs" = 2 eggs
- For restaurant/branded foods, estimate based on typical preparations
- Round calories to nearest integer, macros to 1 decimal place
- Be conservative — slightly underestimate rather than overestimate

Return ONLY valid JSON in this exact format, no markdown:
{
  "foods": [
    {
      "name": "Food name (cleaned up)",
      "portion": "200g" or "1 large" or "1 cup",
      "calories": 165,
      "protein": 31.0,
      "carbs": 0.0,
      "fat": 3.6
    }
  ]
}`;

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return NextResponse.json({ error: 'Query too short' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI estimation not configured' }, { status: 503 });
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: query.trim() }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 512,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[AI Nutrition] Gemini error:', response.status, errText);
      return NextResponse.json({ error: 'AI service unavailable' }, { status: 502 });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 502 });
    }

    const parsed = JSON.parse(text);

    // Validate structure
    if (!parsed.foods || !Array.isArray(parsed.foods) || parsed.foods.length === 0) {
      return NextResponse.json({ error: 'Invalid AI response structure' }, { status: 502 });
    }

    // Sanitize each food item
    const foods = parsed.foods.map((f: Record<string, unknown>) => ({
      name: String(f.name || 'Unknown food').slice(0, 100),
      portion: String(f.portion || '1 serving').slice(0, 50),
      calories: Math.max(0, Math.round(Number(f.calories) || 0)),
      protein: Math.max(0, +(Number(f.protein) || 0).toFixed(1)),
      carbs: Math.max(0, +(Number(f.carbs) || 0).toFixed(1)),
      fat: Math.max(0, +(Number(f.fat) || 0).toFixed(1)),
    }));

    return NextResponse.json({ foods, source: 'ai' });
  } catch (error) {
    console.error('[AI Nutrition] Error:', error);
    return NextResponse.json({ error: 'Estimation failed' }, { status: 500 });
  }
}
