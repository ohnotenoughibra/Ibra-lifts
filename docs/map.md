# Codebase Map

Living map of how the pieces connect. When you need to change something, look here first.

---

## Workout System

| Piece | File | Purpose |
|-------|------|---------|
| Generator | `src/lib/workout-generator.ts` | Creates mesocycles (4-12 week periodized blocks) from user profile |
| Auto-adjust | `src/lib/auto-adjust.ts` | Modifies next session's sets/reps/weight based on RPE feedback + wearable data |
| Active session | `src/components/ActiveWorkout.tsx` | The workout execution UI (timer, set logging, swaps, supersets) |
| Builder | `src/components/WorkoutBuilder.tsx` | Custom workout creation |
| History | `src/components/WorkoutHistory.tsx` | Past workout browser |
| Templates | `src/components/SessionTemplates.tsx` | Save/load workout templates |
| State | `src/lib/store.ts` lines 1452-2090 | Workout slice: startWorkout → updateLog → completeWorkout |
| Exercises | `src/lib/exercises.ts` | Exercise database (~250 exercises with muscle targets, equipment, cues) |
| Schedule | `src/lib/smart-schedule.ts` | Weekly calendar builder, dual-session planning |
| Deload | `src/lib/smart-deload.ts` | Fatigue debt calculation, deload timing/intensity |
| Tempo | `src/lib/tempo-engine.ts` | Eccentric/concentric/pause prescriptions |
| Supersets | `src/lib/superset-engine.ts` | Agonist/antagonist pairing logic |
| Weight est. | `src/lib/weight-estimator.ts` | 1RM → target rep range weight estimation (Brzycki) |

**Flow**: User profile → `workout-generator` creates mesocycle → user executes in `ActiveWorkout` → results stored in `workoutLogs` → `auto-adjust` modifies next session → `smart-deload` recommends deload when fatigue accumulates

---

## Nutrition System

| Piece | File | Purpose |
|-------|------|---------|
| Tracker UI | `src/components/NutritionTracker.tsx` | Meal logging, macro dashboard, water tracking |
| Diet Coach | `src/lib/diet-coach.ts` | BMR (Mifflin-St Jeor / Cunningham), TDEE, macro targets, RED-S warnings |
| Diet Coach UI | `src/components/DietCoach.tsx` | Diet phase management, weekly check-ins |
| Contextual | `src/lib/contextual-nutrition.ts` | Pre/intra/post workout fuel, illness-aware adjustments |
| Sport nutrition | `src/lib/sport-nutrition-engine.ts` | Combat sport phase selection, vegan/keto macros |
| Fight camp | `src/lib/fight-camp-engine.ts` | Competition nutrition phasing (off-season → weigh-in → fight day) |
| Periodization | `src/lib/periodization-planner.ts` | Annual nutrition phase sequencing (massing → maintenance → cut cycles), training-nutrition coupling |
| Weight cut | `src/lib/weight-cut-engine.ts` | Safe phased cuts (0.7% BW/week), energy availability floor |
| Electrolytes | `src/lib/electrolyte-engine.ts` | Sweat rate estimation, intra-training sodium/carbs |
| Supplements | `src/lib/supplement-engine.ts` | Evidence-based stack (creatine, beta-alanine), competition pauses |
| Barcode scanner | `src/lib/barcode-scanner.ts` | Barcode-based nutrition lookup via Open Food Facts API |
| State | `src/lib/store.ts` lines 3017-3163 | Nutrition slice: meals, macroTargets, waterLog, dietPhase |

**Flow**: `periodization-planner` generates annual phase plan → `diet-coach` calculates targets per phase → user logs meals in `NutritionTracker` → `contextual-nutrition` adjusts around sessions → `fight-camp-engine` overrides during competition prep → `weight-cut-engine` enforces safety floors → `block-suggestion` recommends training blocks aligned to nutrition phase

---

## Recovery & Readiness

| Piece | File | Purpose |
|-------|------|---------|
| Performance engine | `src/lib/performance-engine.ts` | 20-factor readiness score with graceful degradation |
| Adaptive readiness | `src/lib/adaptive-readiness.ts` | Composite model integrating sleep, nutrition, stress, HRV |
| Readiness throttle | `src/lib/readiness-throttle.ts` | Volume/intensity gates (<50 readiness = 30% volume reduction) |
| RPE regulator | `src/lib/rpe-regulator.ts` | Prevents runaway intensity during high fatigue |
| Sleep score | `src/lib/sleep-score.ts` | Sleep quality scoring (consistency, duration, timing) |
| Wellness score | `src/lib/wellness-score.ts` | 6-domain composite (training, nutrition, sleep, stress, recovery, mental) |
| Fatigue metrics | `src/lib/fatigue-metrics.ts` | Central vs peripheral fatigue, muscle-specific tracking |
| Recovery coach | `src/lib/recovery-coach.ts` | Sleep/nutrition/stress recommendations |
| Recovery UI | `src/components/RecoveryCoach.tsx` | Recovery recommendations interface |
| Readiness UI | `src/components/PerformanceReadiness.tsx` | Readiness dashboard |
| Wearable engine | `src/lib/wearable-engine.ts` | Unified multi-wearable abstraction (Whoop, Apple Health, Garmin, Oura) |
| Whoop API | `src/lib/whoop.ts` | Whoop-specific OAuth & API calls |
| Whoop sync | `src/lib/useWhoopSync.ts` | Background Whoop data sync (30-min intervals) |

**Flow**: Wearable API (whoop.ts, etc.) → `wearable-engine` normalizes to common format → merges multi-provider data → `performance-engine` scores readiness (redistributes weights if data missing) → `readiness-throttle` gates workout intensity → `auto-adjust` incorporates into session modifications → `recovery-coach` generates recommendations

---

## Injury & Illness

| Piece | File | Purpose |
|-------|------|---------|
| Injury science | `src/lib/injury-science.ts` | ROM restrictions, return-to-training protocols, safe alternatives |
| Injury prevention | `src/lib/injury-prevention.ts` | Movement pattern analysis, prehab, imbalance detection |
| Injury intelligence | `src/lib/injury-intelligence.ts` | Pain history, body region risk, exercise risk (safe/caution/avoid) |
| Injury patterns | `src/lib/injury-patterns.ts` | Recurring trigger detection, recovery trends |
| Illness engine | `src/lib/illness-engine.ts` | Symptom tracking, training mods (rest vs light), nutrition adjustments |
| Injury UI | `src/components/InjuryLogger.tsx` | Injury logging interface |
| Illness UI | `src/components/IllnessLogger.tsx` | Illness tracking interface |

**Flow**: User logs injury → `injury-science` generates restrictions → `startWorkout` in store applies adaptations (volume/intensity limits, exercise substitutions) → `injury-intelligence` tracks patterns over time → `injury-prevention` flags risk before injury occurs

---

## Gamification

| Piece | File | Purpose |
|-------|------|---------|
| Core engine | `src/lib/gamification.ts` | 52 badges, XP/levels, weekly challenges, streak tracking |
| Engagement | `src/lib/engagement-engine.ts` | Variable-ratio rewards, disengagement detection, nudges |
| Nudges | `src/lib/nudge-engine.ts` | Contextual push notifications, churn prevention |
| Smart notifications | `src/lib/smart-notifications.ts` | Intelligent notification scheduling with habit stacking (Clear 2018) |
| Wellness score | `src/lib/wellness-score.ts` | Multi-domain wellness multiplier (1.0-1.5x XP) |
| State | `src/lib/store.ts` lines 2091-2657 | Gamification slice: points, badges, streaks, challenges |

**Flow**: User completes workout → `gamification` awards points + checks 52 badge conditions → `wellness-score` applies multiplier → `engagement-engine` determines variable rewards → `nudge-engine` schedules retention notifications

---

## Combat Sport Modules

| Piece | File | Purpose |
|-------|------|---------|
| Competition prep | `src/components/CompetitionPrep.tsx` | Competition timeline, weight cut planning |
| Grappling tracker | `src/components/GrapplingTracker.tsx` | BJJ/wrestling session logging |
| Concurrent training | `src/lib/concurrent-training.ts` | ACWR, gym + combat interference, live interference application |
| Conditioning data | `src/lib/conditioning-templates.ts` | Grappler-specific conditioning template data |
| Conditioning engine | `src/lib/conditioning-programming.ts` | Prescriptive conditioning programming with progressive overload |
| Fight camp engine | `src/lib/fight-camp-engine.ts` | Competition within 70 days triggers fight camp mode |
| Female athlete | `src/lib/female-athlete.ts` | Menstrual cycle phases, training/nutrition adjustments, RED-S awareness |

---

## Knowledge & Coaching

| Piece | File | Purpose |
|-------|------|---------|
| Knowledge base | `src/lib/knowledge.ts` | ~300 articles/tips indexed by category |
| Knowledge engine | `src/lib/knowledge-engine.ts` | Contextual insight picker with spaced repetition |
| AI coach | `src/lib/ai-coach.ts` | Rule-based weekly recommendations (NOT LLM-powered) |
| Daily directive | `src/lib/daily-directive.ts` | "What to do today" combining readiness + schedule + fight camp |
| Corner coach | `src/lib/corner-coach.ts` | Between-set messaging (hype/tactics/warning) |
| Narratives | `src/lib/performance-narratives.ts` | Human-readable performance summaries |

---

## Analytics & Progress

| Piece | File | Purpose |
|-------|------|---------|
| Progress analytics | `src/lib/progress-analytics.ts` | 1RM trends, volume heatmaps, muscle imbalance detection |
| Weekly synthesis | `src/lib/weekly-synthesis.ts` | Weekly performance summary with Whoop integration |
| Mesocycle report | `src/lib/mesocycle-report.ts` | End-of-block summary (volume, intensity, PRs) |
| Volume landmarks | `src/lib/volume-landmarks.ts` | MEV/MAV/MRV per muscle group |
| Force-velocity | `src/lib/force-velocity.ts` | Power/strength profiling |
| Progress UI | `src/components/ProgressCharts.tsx` | Charts and visualizations |
| Strength analysis | `src/components/StrengthAnalysis.tsx` | Detailed strength metrics |

---

## Auth & Sync

| Piece | File | Purpose |
|-------|------|---------|
| Auth config | `src/lib/auth.config.ts` | Edge-safe NextAuth config (Google, Apple, magic link) |
| Auth server | `src/lib/auth.ts` | Full auth with Credentials provider, lockout logic |
| Middleware | `src/middleware.ts` | Edge route protection |
| DB | `src/lib/db.ts` | Vercel Postgres query helpers |
| DB init | `src/lib/db-init.ts` | Schema creation (tables, migrations) |
| DB sync | `src/lib/db-sync.ts` | Conflict resolution, richness scoring, union merge |
| Sync hook | `src/lib/useDbSync.ts` | React hook orchestrating load/save/conflict UI |
| Data safety | `src/lib/data-safety.ts` | Sync failure tracking, snapshot recovery |

---

## Payments

| Piece | File | Purpose |
|-------|------|---------|
| Subscription | `src/lib/subscription.ts` | Simplified feature gates (12 gates, free/pro only) |
| Monetization | `src/lib/monetization-engine.ts` | Usage analytics, upgrade prompts (2-tier, no elite) |
| Feature access | `src/lib/useFeatureAccess.ts` | React hook for subscription gating |
| Checkout API | `src/app/api/subscription/checkout/` | PayPal subscription creation |
| Status API | `src/app/api/subscription/status/` | Tier checking |
| Webhook API | `src/app/api/subscription/webhook/` | PayPal event handling |

---

## Social & Community

| Piece | File | Purpose |
|-------|------|---------|
| Social engine | `src/lib/social-engine.ts` | Gym leaderboard, friend challenges, activity feed |
| Template marketplace | `src/lib/template-marketplace.ts` | Training block template sharing & discovery |

---

## Wearable Integration

| Piece | File | Purpose |
|-------|------|---------|
| Wearable engine | `src/lib/wearable-engine.ts` | Unified multi-wearable abstraction (Whoop, Apple Health, Garmin, Oura) |
| Whoop client | `src/lib/whoop.ts` | Whoop-specific API calls |
| Whoop sync | `src/lib/useWhoopSync.ts` | Background Whoop data sync (30-min intervals) |
| Barcode scanner | `src/lib/barcode-scanner.ts` | Barcode-based nutrition lookup via Open Food Facts API |

---

## Notifications

| Piece | File | Purpose |
|-------|------|---------|
| Smart notifications | `src/lib/smart-notifications.ts` | Intelligent notification scheduling with habit stacking |
| Push notifications | `src/lib/notifications.ts` | Basic push notification scheduling |
| Nudge engine | `src/lib/nudge-engine.ts` | Contextual push notifications, churn prevention |

---

## Rest & Recovery Programming

| Piece | File | Purpose |
|-------|------|---------|
| Rest day programming | `src/lib/rest-day-programming.ts` | Structured rest day prescriptions (mobility, foam rolling, active recovery) |
