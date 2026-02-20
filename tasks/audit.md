# First-Principles Audit: Roots Gains

## The Core Question

*"If I were building the ultimate combat-sport training app from scratch today, knowing everything I know — what would I build, and what would I throw away?"*

---

## The Honest Truth

**Roots Gains is a world-class periodized strength app wearing a combat sports costume.**

The lifting engine is legitimately excellent — undulating periodization, auto-regulation, RP-style volume landmarks, readiness throttling. This is better than 95% of fitness apps on the market.

But the combat sport integration? It's a logging layer. You can *record* that you rolled for 90 minutes, but the app doesn't *think* about what that means for tomorrow's deadlift session. A BJJ athlete in fight camp gets the same squat programming as a recreational lifter — the app just suggests "maybe lower volume." That's not combat-sport-first, that's combat-sport-adjacent.

**The nutrition engine is the opposite — genuinely elite for fighters.** Nine fight-camp phases, sport-specific MET values, energy availability tracking, weight-cut protocols. This is the app's hidden weapon.

---

## Scorecard

| Domain | Grade | Verdict |
|--------|-------|---------|
| Periodized Strength Programming | A | Best-in-class. Ship it. |
| Fight-Camp Nutrition & Weight Cuts | A | Genuine competitive advantage |
| Gamification & Engagement | B+ | Solid, just rebalanced (was broken) |
| Readiness & Recovery (Whoop) | B | Good foundation, weak sport integration |
| Combat Sport Training Integration | D+ | Logging only. No intelligence. |
| Conditioning / Work Capacity | F | Doesn't exist |
| Social / Community | F | Cards you can screenshot. That's it. |
| Code Architecture | C+ | Monolith components, god-store, zero memoization |
| Test Coverage | C | Business logic tested, zero UI/E2E |
| Accessibility | D+ | Cosmetic at best |
| Mobile Performance | C | Re-render storms waiting to happen |

---

## PHASE 0: Stop the Bleeding (1-2 weeks)
*Things that are actively hurting the product right now.*

- [ ] **Split ActiveWorkout.tsx** (3,940 lines) into 5+ memoized sub-components
  - ExerciseCard, ExerciseSwapModal, BonusExercisePanel, ThrottleIndicator, TempoTracker
  - This file has 92 hook invocations. It will lag on older phones.
- [ ] **Add `useShallow()` to all store selectors** — every component re-renders on any store change
- [ ] **Zero `React.memo` usage across 70+ components** — wrap the top 10 heaviest
- [ ] **Lazy-load tab content** — Nutrition, Wearables, Competition tabs loaded upfront for no reason

## PHASE 1: Make Combat Training a First-Class Citizen (3-4 weeks)
*The app's identity claim is combat sports. Back it up.*

- [ ] **Concurrent training engine**: When a user logs a hard sparring session, AUTOMATICALLY reduce tomorrow's lifting volume by 15-30%. Right now sport sessions are invisible to the workout generator.
- [ ] **Sport-load scoring**: Quantify combat training fatigue (duration x intensity x type) and feed it into the readiness system alongside Whoop data. A 2-hour wrestling session should show up in readiness.
- [ ] **Sport-specific splits**: Only one combat split exists (`grappler_hybrid`). Build striker-optimized (rotation/power focus), wrestler-optimized (posterior chain/neck), MMA-hybrid splits.
- [ ] **Grip progression dashboard**: Grapplers live and die by grip. Track dead hang PRs, farmer carry PRs, grip endurance over time. The exercises exist but there's no progression view.
- [ ] **Conditioning templates**: No GPP programming exists at all. Add EMOM, Tabata, sled work, shark tank templates. Fighters need work capacity — the app ignores it.

## PHASE 2: Build the Social Layer (3-4 weeks)
*Combat sports are tribal. Solo apps die.*

- [ ] **Gym leaderboards**: Weekly XP rankings within a gym/team. Combat athletes are competitive by nature. This is the single highest-leverage engagement feature you're missing.
- [ ] **Training partner matching**: "Who else is training at 6pm?" or "Who needs a rolling partner this week?"
- [ ] **Challenge battles**: Head-to-head weekly challenges. "Who can hit more volume this week?" Direct competition drives retention.
- [ ] **Coach view**: Let coaches see their athletes' readiness, compliance, and progression. This is how you sell to gyms, not individuals.
- [ ] **Share to Instagram/Stories**: The CommunityShare component generates cards but can't actually share anywhere. Connect to share APIs.

## PHASE 3: Intelligence Layer (2-3 weeks)
*Make the app smarter about the user over time.*

- [ ] **Exercise response profiling**: Which exercises actually drive YOUR progress? Track per-exercise 1RM velocity and correlate with programming choices. The `performance-model.ts` engine exists but isn't connected to recommendations.
- [ ] **Injury pattern detection**: "Your shoulder pain spikes when bench RPE > 8 and you sparred the day before." The data exists in injury logs + workout logs — connect them.
- [ ] **Sport-to-strength correlation**: "Your deadlift PRs coincide with your best competition performances." Build the feedback loop that proves lifting helps fighting.
- [ ] **Personalized readiness decay**: Not everyone recovers at the same rate. Learn the user's recovery curve from Whoop + performance data.

## PHASE 4: Technical Foundation (3-4 weeks)
*Pay the debt before it compounds.*

- [ ] **Slice the Zustand store** (3,241 lines, 381 fields) into domain stores: `useWorkoutStore`, `useNutritionStore`, `useGamificationStore`, `useSyncStore`
- [ ] **Database schema versioning**: Currently creates tables on-demand with no migration strategy. One breaking change = data corruption.
- [ ] **Component tests**: Zero UI tests across 70+ components. Add tests for ActiveWorkout, NutritionTracker, ProfileSettings at minimum.
- [ ] **API route tests**: Auth, sync, subscription routes are untested.
- [ ] **PayPal webhook signature verification**: Currently minimal validation on payment webhooks.
- [ ] **Accessibility audit**: No keyboard navigation, no focus traps in modals, no screen reader support. Legal liability in some markets.

## PHASE 5: Monetization & Growth (2-3 weeks)
*Make the free tier irresistible and the paid tier indispensable.*

- [ ] **Rethink the gate**: 39 gated features is too many. Free users should get full workout execution + gamification + basic nutrition. Gate the intelligence layer (AI coach, exercise profiling, readiness throttle, fight camp nutrition).
- [ ] **Coach subscription tier**: Gyms pay more than individuals. A coach managing 20 athletes at $20/athlete/month > 20 individuals at $10/month.
- [ ] **Referral program**: "Train with a friend, both get 1 month Pro free." Combat athletes train in groups.
- [ ] **Content marketing hook**: Weekly "fight camp nutrition" or "peaking protocol" articles generated from the knowledge engine. SEO play.

---

## The 80/20

If you could only do THREE things:

1. **Concurrent training engine** (Phase 1) — This is the promise of the app. Fulfill it.
2. **Gym leaderboards** (Phase 2) — Retention through competition. Combat athletes can't resist.
3. **Split the monolith components** (Phase 0) — The app will get sluggish as data grows. Fix it now.

Everything else is important but these three determine whether the app is "another fitness app" or "the app for fighters."

---

## What to Kill

- **Menstrual cycle tracking depth**: Keep basic cycle awareness for programming adjustments. Kill the detailed phase tracking UI — period tracking apps do this better. Focus resources elsewhere.
- **PDF export**: Rarely used, adds jsPDF to bundle. Replace with screenshot-shareable cards.
- **Turkish Get-Up badge**: Hyper-specific. Replace with something universal.
- **Over-engineered engagement engine** (1,054 lines): Variable reward schedules, disengagement detection, nudge psychology — this is a fitness app, not a slot machine. Keep streaks and weekly challenges. Kill the behavioral manipulation layer.

---

*"The best product is the one that does fewer things, but does them so well that users can't imagine going back."*
