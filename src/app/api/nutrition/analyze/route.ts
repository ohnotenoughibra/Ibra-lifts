import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/nutrition/analyze
 *
 * Accepts a base64-encoded image of food or a nutrition label and uses
 * OpenAI's vision model to estimate macros. Returns structured JSON.
 *
 * Body: { image: string (base64 data URL) }
 * Returns: { name, calories, protein, carbs, fat, confidence, notes }
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Food recognition is not configured. Add OPENAI_API_KEY to your environment.' },
      { status: 501 }
    );
  }

  let body: { image?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { image } = body;
  if (!image || typeof image !== 'string') {
    return NextResponse.json({ error: 'No image provided.' }, { status: 400 });
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
          {
            role: 'system',
            content: `You are a nutrition analysis assistant for a fitness and lifting app.
When shown food images, identify the food and estimate its nutritional content in English.
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

If the image is unclear or not food, respond with:
{
  "name": "",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "confidence": "low",
  "notes": "Could not identify food in this image"
}`,
          },
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
      return NextResponse.json(
        { error: `AI analysis failed (HTTP ${response.status}). Check your API key.` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';

    // Extract JSON from the response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    return NextResponse.json({
      name: parsed.name || 'Unknown food',
      calories: Math.round(parsed.calories || 0),
      protein: Math.round(parsed.protein || 0),
      carbs: Math.round(parsed.carbs || 0),
      fat: Math.round(parsed.fat || 0),
      confidence: parsed.confidence || 'low',
      notes: parsed.notes || '',
    });
  } catch (err: any) {
    console.error('Nutrition analysis error:', err);
    return NextResponse.json(
      { error: `Analysis failed: ${err.message?.substring(0, 100) || 'unknown error'}` },
      { status: 500 }
    );
  }
}
