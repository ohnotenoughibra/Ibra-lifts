# src/lib/ — Business Logic Engines

## Overview

~70 TypeScript files containing the app's business logic. **95% pure functions with zero side effects.** Only `store.ts`, hooks (`useDbSync`, `useWhoopSync`), and `db-sync.ts` have side effects.

This means: engines are testable, composable, and safe to call from anywhere.

## Dependency Tiers

```
Tier 0 (Data — no internal imports)
  types.ts, exercises.ts, knowledge.ts, sticking-point-data.ts

Tier 1 (Engines — import Tier 0 only)
  diet-coach.ts, workout-generator.ts, gamification.ts, sleep-score.ts,
  performance-engine.ts, injury-science.ts, supplement-engine.ts, etc.

Tier 2 (Orchestrators — import Tier 0-1)
  store.ts (imports ~15 engines), daily-directive.ts, concurrent-training.ts

Tier 3 (Hooks — import all previous)
  useDbSync.ts, useWhoopSync.ts, useFeatureAccess.ts
```

**Rule**: Never import upward. Tier 1 engines must not import store or hooks.

## Large Files (Don't Read Entirely)

| File | Lines | Strategy |
|------|-------|----------|
| `store.ts` | ~3,700 | See `store.context.md` for structural map |
| `exercises.ts` | ~4,600 | Static data. Access via exported filter functions |
| `knowledge.ts` | ~5,500 | Static articles. Use `knowledge-engine.ts` to query |
| `types.ts` | ~1,500 | Type definitions. Grep for specific interfaces |
| `workout-generator.ts` | ~1,500 | Key exports in first 80 lines |
| `gamification.ts` | ~1,500 | Badge database + award logic |

## Key Patterns

### Evidence-Based Constants
Most engines cite scientific papers inline. When modifying thresholds (protein targets, deload timing, RPE ranges), check the reference before changing.

```typescript
// Example from diet-coach.ts
// Protein: 2.3-3.1 g/kg LBM during deficit (Helms et al., 2014)
const DEFICIT_PROTEIN_MIN = 2.3;
```

### Graceful Degradation
Engines handle missing data by redistributing weights rather than failing:
- `performance-engine.ts`: If no wearable → sleep/nutrition weights increase
- `auto-adjust.ts`: If no RPE feedback → uses previous session data
- `diet-coach.ts`: If no body fat % → falls back to Mifflin-St Jeor from Cunningham

### Fight Camp Detection
`fight-camp-engine.ts` triggers when competition is within 70 days. This cascades to nutrition, training volume, supplement timing, and deload scheduling. When working on any feature that affects athletes near competition, check fight camp integration.

### State Machine in Store
Workout lifecycle: `null` → `startWorkout()` → active → `pauseWorkout()` / `resumeWorkout()` → `completeWorkout()` → `null`. See `store.context.md` for details.

## File Inventory by Category

### Core State & Data
- `store.ts` — Zustand store (all app state + actions)
- `types.ts` — TypeScript interfaces for entire domain
- `exercises.ts` — Exercise database (~250 exercises)
- `knowledge.ts` — Knowledge base (~300 articles)

### Workout Generation
- `workout-generator.ts` — Mesocycle creation, auto-regulation
- `auto-adjust.ts` — RPE-based session modifications
- `smart-schedule.ts` — Weekly calendar, dual-session planning
- `smart-deload.ts` — Fatigue debt, deload timing
- `weight-estimator.ts` — 1RM → target weight (Brzycki formula)
- `tempo-engine.ts` — Eccentric/concentric prescriptions
- `superset-engine.ts` — Agonist/antagonist pairing
- `force-velocity.ts` — Power/strength profiling
- `block-suggestion.ts` — Next mesocycle focus recommendation
- `exercise-recommender.ts` — Weak-point-based exercise suggestions

### Nutrition
- `diet-coach.ts` — BMR, TDEE, macros, RED-S warnings
- `contextual-nutrition.ts` — Pre/intra/post fuel, illness-aware
- `sport-nutrition-engine.ts` — Combat sport nutrition phases
- `fight-camp-engine.ts` — Competition nutrition phasing
- `weight-cut-engine.ts` — Safe weight cuts (0.7% BW/week)
- `electrolyte-engine.ts` — Sweat rate, hydration, sodium
- `supplement-engine.ts` — Evidence-based supplement stack

### Recovery & Readiness
- `performance-engine.ts` — 20-factor readiness score
- `adaptive-readiness.ts` — Composite readiness model
- `readiness-throttle.ts` — Volume/intensity gates
- `rpe-regulator.ts` — Intensity runaway prevention
- `sleep-score.ts` — Sleep quality scoring
- `wellness-score.ts` — 6-domain wellness composite
- `fatigue-metrics.ts` — Central vs peripheral fatigue
- `recovery-coach.ts` — Recovery recommendations

### Injury & Illness
- `injury-science.ts` — ROM restrictions, return-to-training
- `injury-prevention.ts` — Imbalance detection, prehab
- `injury-intelligence.ts` — Pain history, exercise risk assessment
- `injury-patterns.ts` — Recurring trigger detection
- `illness-engine.ts` — Symptom tracking, training modifications

### Gamification
- `gamification.ts` — 52 badges, XP/levels, streaks, challenges
- `engagement-engine.ts` — Variable-ratio rewards, churn prevention
- `nudge-engine.ts` — Contextual push notifications

### Coaching & Knowledge
- `ai-coach.ts` — Rule-based weekly recommendations (NOT LLM)
- `daily-directive.ts` — "What to do today" planner
- `corner-coach.ts` — Between-set hype/tactics messaging
- `knowledge-engine.ts` — Contextual insight picker
- `performance-narratives.ts` — Human-readable performance summaries

### Combat Sport
- `concurrent-training.ts` — ACWR, gym + combat interference
- `conditioning-templates.ts` — Grappler-specific conditioning
- `female-athlete.ts` — Cycle tracking, phase-based adjustments

### Analytics
- `dashboard-insights.ts` — Surfaces analysis engine data as ranked dashboard insight tiles (ACWR, fatigue, strength, volume, plateaus, PRs, recovery). Pure functions, used by `DashboardInsights.tsx`.
- `progress-analytics.ts` — 1RM trends, volume heatmaps
- `weekly-synthesis.ts` — Weekly performance summary
- `mesocycle-report.ts` — End-of-block reports
- `volume-landmarks.ts` — MEV/MAV/MRV tracking

### Auth & Sync
- `auth.ts` / `auth.config.ts` — NextAuth setup
- `db.ts` / `db-init.ts` — Vercel Postgres helpers
- `db-sync.ts` — Conflict resolution, union merge
- `useDbSync.ts` — Sync orchestration hook
- `data-safety.ts` — Sync failure tracking

### Integration
- `whoop.ts` — Whoop API calls
- `useWhoopSync.ts` — Background Whoop sync hook
- `subscription.ts` — Feature gates (free/pro)
- `monetization-engine.ts` — Usage analytics, upgrade prompts
- `notifications.ts` — Push notification scheduling

### Utilities
- `utils.ts` — cn() helper, date/weight formatting
- `haptics.ts` — Vibration API wrapper
- `confetti.ts` — Milestone animations
- `rate-limit.ts` — Client-side rate limiting
- `data-export.ts` — CSV/JSON export
- `pdf-export.ts` — PDF generation
- `share-card.ts` — Shareable performance cards
