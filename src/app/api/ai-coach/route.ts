import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

// --- Types ---

export interface CoachingResponse {
  narrative: string;
  adjustments: string[];
  warnings: string[];
  motivation: string;
}

// --- Validation ---

const workoutSummarySchema = z.object({
  exerciseName: z.string().max(100),
  totalVolume: z.number(),
  avgRPE: z.number(),
  sets: z.number(),
  personalRecord: z.boolean().optional(),
});

const injurySchema = z.object({
  bodyRegion: z.string().max(50),
  severity: z.number().min(1).max(5),
  painType: z.string().max(50),
  resolved: z.boolean(),
});

// Validate Claude's response shape
const coachingResponseSchema = z.object({
  narrative: z.string(),
  adjustments: z.array(z.string()),
  warnings: z.array(z.string()),
  motivation: z.string(),
});

const requestSchema = z.object({
  workouts: z.array(z.object({
    date: z.string(),
    exercises: z.array(workoutSummarySchema),
    totalVolume: z.number(),
    overallRPE: z.number(),
    soreness: z.number(),
    energy: z.number(),
    duration: z.number(),
    completed: z.boolean(),
  })).max(14),
  nutritionAdherence: z.number().min(0).max(100).nullable().optional(),
  macroTargets: z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
  }).nullable().optional(),
  readinessScores: z.array(z.object({
    date: z.string(),
    overall: z.number(),
    level: z.string(),
  })).optional(),
  activeInjuries: z.array(injurySchema).optional(),
  goals: z.object({
    goalFocus: z.string(),
    combatSport: z.string().optional(),
    combatSports: z.array(z.string()).optional(),
    experienceLevel: z.string(),
    bodyWeightKg: z.number().optional(),
    sessionsPerWeek: z.number().optional(),
  }).optional(),
  wearable: z.object({
    avgSleepScore: z.number().nullable().optional(),
    avgRecoveryScore: z.number().nullable().optional(),
    avgHRV: z.number().nullable().optional(),
    avgRestingHR: z.number().nullable().optional(),
  }).nullable().optional(),
  activeDietPhase: z.object({
    goal: z.string(),
    targetRatePerWeek: z.number(),
    weeksCompleted: z.number(),
  }).nullable().optional(),
});

// --- System Prompt ---

const SYSTEM_PROMPT = `You are a world-class strength & conditioning coach who specializes in combat sports (MMA, Brazilian Jiu-Jitsu, Muay Thai, Boxing, Wrestling, Judo). You have 20+ years of experience training professional fighters and competitive grapplers.

Your coaching philosophy:
- Evidence-based: cite principles from sport science when relevant (periodization, RPE management, supercompensation, concurrent training interference)
- Direct and honest: no fluff, no generic motivational quotes. Tell the athlete exactly what they need to hear
- Practical: every recommendation must be actionable this week
- Combat-sport-aware: understand that gym work serves the sport. Strength training supports fight performance, not the other way around
- Injury-conscious: always factor in active injuries and pain. Never recommend training through warning signs
- Recovery-focused: understand that adaptation happens during recovery, not during training

When analyzing the athlete's data:
1. Look at training volume trends (are they accumulating too much fatigue?)
2. Check RPE patterns (are they grinding every session or leaving reps in reserve?)
3. Evaluate recovery signals (sleep, readiness, soreness trends)
4. Consider their competition schedule and training phase
5. Factor in nutrition adherence relative to their goals
6. Account for any active injuries

Response format — you MUST return valid JSON matching this exact structure:
{
  "narrative": "A 2-4 sentence overview of the athlete's current training state. Reference their actual data. Be specific about what you see.",
  "adjustments": ["Array of 2-5 specific, actionable adjustments for next week. Each should be concrete (e.g., 'Drop working weight on squat by 5-10% — your RPE has been 9+ for three sessions straight')"],
  "warnings": ["Array of 0-3 warnings about injury risk, overtraining, under-recovery, or nutrition issues. Only include if genuinely warranted by the data. Empty array if no concerns."],
  "motivation": "One sentence of direct, earned acknowledgment. Only praise what the data actually shows. No empty hype."
}

CRITICAL: Return ONLY the JSON object. No markdown, no code fences, no explanation outside the JSON.`;

// --- Route Config ---

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// --- Handler ---

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // 2. Rate limit: 3 per user per day (24h window)
    const { limited, remaining } = rateLimit(
      `ai-coach:${userId}`,
      3,
      24 * 60 * 60 * 1000
    );

    if (limited) {
      return NextResponse.json(
        { error: 'Rate limited — 3 AI coaching sessions per day. Try again tomorrow.', rateLimited: true },
        { status: 429 }
      );
    }

    // 3. Validate API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI coaching unavailable — API not configured', fallback: true },
        { status: 503 }
      );
    }

    // 4. Parse + validate body
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // 5. Build user message from athlete data
    const userMessage = buildUserMessage(data);

    // 6. Call Claude
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    // 7. Extract text response
    const textBlock = message.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json(
        { error: 'AI returned unexpected response format', fallback: true },
        { status: 502 }
      );
    }

    // 8. Parse and validate JSON response with Zod
    let coaching: CoachingResponse;
    try {
      let raw: unknown;
      try {
        raw = JSON.parse(textBlock.text);
      } catch {
        // Try extracting JSON from markdown code fences as fallback
        const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          raw = JSON.parse(jsonMatch[0]);
        } else {
          return NextResponse.json(
            { error: 'AI response was not valid JSON', fallback: true },
            { status: 502 }
          );
        }
      }
      coaching = coachingResponseSchema.parse(raw);
    } catch {
      return NextResponse.json(
        { error: 'AI response missing required fields', fallback: true },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      data: coaching,
      remaining,
    });
  } catch (error) {
    console.error('[ai-coach] Error:', error);

    // Surface Anthropic-specific errors
    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        return NextResponse.json(
          { error: 'AI service temporarily overloaded. Try again in a few minutes.', fallback: true },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: 'AI service error', fallback: true },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', fallback: true },
      { status: 500 }
    );
  }
}

// --- Helpers ---

function buildUserMessage(data: z.infer<typeof requestSchema>): string {
  const parts: string[] = [];

  // Athlete profile
  if (data.goals) {
    const g = data.goals;
    const sports = g.combatSports?.join(', ') || g.combatSport || 'combat sports';
    parts.push(
      `ATHLETE PROFILE: ${g.experienceLevel} level, training ${sports}. ` +
      `Goal focus: ${g.goalFocus}. ` +
      `${g.bodyWeightKg ? `Body weight: ${g.bodyWeightKg}kg. ` : ''}` +
      `${g.sessionsPerWeek ? `Target: ${g.sessionsPerWeek} gym sessions/week.` : ''}`
    );
  }

  // Diet phase
  if (data.activeDietPhase) {
    const dp = data.activeDietPhase;
    parts.push(
      `CURRENT DIET PHASE: ${dp.goal} (week ${dp.weeksCompleted}). ` +
      `Target rate: ${dp.targetRatePerWeek > 0 ? '+' : ''}${dp.targetRatePerWeek}kg/week.`
    );
  }

  // Macro targets
  if (data.macroTargets) {
    const mt = data.macroTargets;
    parts.push(
      `MACRO TARGETS: ${mt.calories}kcal — ${mt.protein}g protein, ${mt.carbs}g carbs, ${mt.fat}g fat.`
    );
  }

  // Nutrition adherence
  if (data.nutritionAdherence != null) {
    parts.push(`NUTRITION ADHERENCE (last 7 days): ${data.nutritionAdherence}%.`);
  }

  // Workouts
  if (data.workouts.length > 0) {
    parts.push(`TRAINING LOG (last ${data.workouts.length} sessions):`);
    for (const w of data.workouts) {
      const prs = w.exercises.filter(e => e.personalRecord).length;
      const exerciseNames = w.exercises.map(e => e.exerciseName).join(', ');
      parts.push(
        `  ${w.date}: ${w.exercises.length} exercises (${exerciseNames}). ` +
        `Volume: ${w.totalVolume.toLocaleString()}. RPE: ${w.overallRPE}. ` +
        `Duration: ${w.duration}min. Energy: ${w.energy}/10. Soreness: ${w.soreness}/10.` +
        `${prs > 0 ? ` PRs: ${prs}.` : ''}` +
        `${!w.completed ? ' [INCOMPLETE]' : ''}`
      );
    }
  } else {
    parts.push('TRAINING LOG: No workouts logged in the last 7 days.');
  }

  // Readiness scores
  if (data.readinessScores && data.readinessScores.length > 0) {
    const avgReadiness = Math.round(
      data.readinessScores.reduce((s, r) => s + r.overall, 0) / data.readinessScores.length
    );
    parts.push(
      `READINESS: Average ${avgReadiness}/100 over ${data.readinessScores.length} days. ` +
      `Latest: ${data.readinessScores[data.readinessScores.length - 1].overall}/100 (${data.readinessScores[data.readinessScores.length - 1].level}).`
    );
  }

  // Wearable data
  if (data.wearable) {
    const w = data.wearable;
    const wearableParts: string[] = [];
    if (w.avgSleepScore != null) wearableParts.push(`sleep: ${w.avgSleepScore}/100`);
    if (w.avgRecoveryScore != null) wearableParts.push(`recovery: ${w.avgRecoveryScore}/100`);
    if (w.avgHRV != null) wearableParts.push(`HRV: ${w.avgHRV}ms`);
    if (w.avgRestingHR != null) wearableParts.push(`resting HR: ${w.avgRestingHR}bpm`);
    if (wearableParts.length > 0) {
      parts.push(`WEARABLE (7-day avg): ${wearableParts.join(', ')}.`);
    }
  }

  // Active injuries
  if (data.activeInjuries && data.activeInjuries.length > 0) {
    parts.push('ACTIVE INJURIES:');
    for (const inj of data.activeInjuries) {
      parts.push(
        `  ${inj.bodyRegion}: severity ${inj.severity}/5, ${inj.painType} pain. ` +
        `${inj.resolved ? '(resolving)' : '(active)'}`
      );
    }
  }

  parts.push('\nAnalyze this data and provide your coaching assessment.');

  return parts.join('\n');
}
