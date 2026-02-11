# Ibra-Lifts (Roots Gains)

Combat-sport-focused fitness PWA built with Next.js 14, TypeScript, Tailwind CSS, and Zustand.

## Architecture

- **Framework**: Next.js 14 (App Router) at `src/app/`
- **State**: Zustand store at `src/lib/store.ts` (~3000 lines — read selectively, not all at once)
- **Components**: `src/components/` — many are large (1000+ lines); read only what you need
- **API Routes**: `src/app/api/` — auth, sync, subscriptions, whoop, workout, progress
- **Libraries**: `src/lib/` — business logic engines (diet-coach, ai-coach, workout-generator, etc.)

## Important: Large Files

This codebase has several very large files. **Do NOT read these entirely unless you specifically need them**:

| File | Lines | What it contains |
|------|-------|-----------------|
| `src/lib/exercises.ts` | ~3,900 | Exercise database (static data) |
| `src/lib/store.ts` | ~3,000 | Zustand store with all app state |
| `src/lib/knowledge.ts` | ~2,100 | Static knowledge base |
| `src/components/ActiveWorkout.tsx` | ~3,500 | Workout session UI |
| `src/components/NutritionTracker.tsx` | ~2,700 | Nutrition tracking UI |
| `package-lock.json` | ~12,000 | Auto-generated, never read this |

When working on a task, read only the specific functions/sections you need using line offsets.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm test             # Vitest tests
```

## Tips for Claude

- When the user sends images (logos, screenshots), keep file reads minimal to stay within context limits
- Use grep/search to find specific code rather than reading entire large files
- The "AI coach" modules (`ai-coach.ts`, `diet-coach.ts`) are rule-based, not LLM-powered
- Auth uses NextAuth with credentials provider
- Database is Vercel Postgres via `@vercel/postgres`
- Payments via PayPal subscriptions
