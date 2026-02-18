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

---

# Workflow Orchestration

## 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately – don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

## 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

## 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

## 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

## 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes – don't over-engineer
- Challenge your own work before presenting it

## 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests – then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

# Task Management
1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

# Core Principles
- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
