# Changelog

All notable changes to Roots Gains are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/) · versions follow semver.

## [2.12.0] - 2026-09-24

**Guardrails and demolition: tests that pin the known bugs, and ~8,500 lines of UI nobody could reach.**

Phase 0 of the workouts/swap/live/UX overhaul (`tasks/plan-2026-09-24-workouts-ux.md`).

### Added
- **Exercise-id integrity tests.** Engines reference library exercises by string id, and a typo doesn't throw — the lookup just finds nothing. Exact lookups (benchmarks, recommender, plyo pairings, every session-template spec) must hit a real id; fuzzy injury tokens must match at least one exercise, or they protect nobody.
- **Seeded generator invariants.** `Math.random` is pinned to a seeded PRNG so a generated block is reproducible. Across 4 profiles × 5 seeds: well-formed sessions, real ids only, no exercise twice in a session. Two `it.fails` tests document known bugs — exercises re-randomised every week, and a 60-minute hypertrophy week with zero isolation work — and will flip when they're fixed.
- **Live workout E2E** (`e2e/live-workout.spec.ts`): start → check-in → log → rest → undo → swap → finish. Shared `onboard()` moved to `e2e/helpers.ts`.

### Fixed
- **Combat benchmarks never matched a single log.** They were keyed on `barbell-bench-press`, `barbell-squat`, `barbell-deadlift`, `barbell-overhead-press`; the library ids are `bench-press`, `back-squat`, `deadlift`, `overhead-press`.
- **Incline bench wasn't avoided for chest injuries.** The avoid token `incline-press` matched no exercise; it's now `incline-bench`. Likewise `bent-row` (matched nothing) → `pendlay-row` for upper/lower back, and the shoulder risk check's `dips` → `dip`.
- Insight alternatives in `exercise-recommender` pointed at five ids that don't exist.

### Removed
- **17 components that no entry point could open** (or that nothing imported): CircuitBuilder, SplitAnalyzer, FightersMind, PlateCalculator (the in-workout MiniPlateCalc stays), CommunityShare, ExerciseProfiler, WellnessXP dashboard + overlay, CornerCoachInfo, AutoThrottleInfo, ProgressCharts, ExerciseDetail, WeeklyMomentum, InsightCard, DashboardInsights, StatusBar, CoachCue — plus `lib/dashboard-insights.ts`. Overlay ids 58 → 40. Shipped JS chunks 6.6 MB → 6.2 MB.
- **The "Worth it? 👍/👎" toast** after closing a tool. Product analytics isn't the athlete's job.

### Parked
- PhotoProgress, TrainingLoadDashboard, BreathingProtocols, HRZoneTraining, OneRepMaxCalc are unwired but kept — they get merged into their new homes in the tab restructure (see `src/components/CLAUDE.md`).

## [2.11.1] - 2026-08-24

**Carryover headlines the weight on the bar, and old logs get their units back.**

### Changed
- **Carryover now leads with working weight rather than estimated 1RM.** The trap bar example read "+63.1 kg" when what you'd actually noticed was +50 kg on the bar. e1RM is the fairer comparison across differing rep schemes, so it's kept in the detail line — but the headline is now the number you'd recognise. A carryover also has to clear the threshold on *both* measures now, so a single heavy low-rep set can't manufacture a story on its own.

### Fixed
- **Historical workout logs are backfilled with a weight unit** (schema v4 → v5). v2.11.0 stamped new logs but left the back catalogue ambiguous. The migration fills them in with the athlete's current setting — correct for everyone who never switched, and no worse than the status quo for anyone who did. Idempotent, and never overwrites a log that already knows its unit. Extracted from the inline migrate hook so it could be tested: a migration that silently mangles a training history is exactly the kind of thing that needs one.

## [2.11.0] - 2026-08-24

**Carryover: what your dropped lifts did for the ones you kept.**

### Added
- **Carryover analysis** in Strength Analysis. Every strength stat in the app was per-exercise, which meant it couldn't tell two very different stories apart: "you got weaker at this" and "you stopped doing this and the strength moved somewhere else." A dormant lift even read as a plateau. Now, when a lift goes quiet for 6+ weeks and a lift sharing its movement pattern keeps climbing, the app says so:

  > **Trap Bar Deadlift → Conventional Deadlift · +63.1 kg**
  > No Trap Bar Deadlift in 5 months. Over the same stretch Conventional Deadlift went from 163.9 to 227 kg estimated 1RM. Both are hinge patterns sharing glutes and back — that strength didn't go anywhere, it moved.

  Two lifts count as related only when they share a movement pattern *and* at least one primary muscle — conservative enough to link the two deadlifts without claiming a bench press carries over to a squat. Comparisons run on RPE-aware estimated 1RM, normalized to kilograms. It stays silent when the related lift didn't actually move, when both lifts were dropped, or when there isn't enough history — a manufactured insight is worse than none.

### Fixed
- **Workout logs never recorded which unit their weights were in.** Body-weight entries have always carried a `unit`; workout logs never did. For anyone who switched kg↔lbs, a 100 logged in March and a 100 logged in June were indistinguishable, and every trend, PR and estimated 1RM silently mixed them. New logs are stamped with the unit; older ones fall back to the athlete's current setting, which is correct for everyone who never switched.

## [2.10.0] - 2026-08-09

**Cross-system injury audit, plus the Knowledge and nutrition passes.**

### Fixed
- **Injury throttling was scaling RPE by a %1RM limit.** `intensityLimit` is a cap on percentage-of-1RM; the code multiplied it into RPE, a 0-10 subjective effort scale. An RPE 8 squat under a 20% limit came out as **RPE 1.6** — not a number anyone can act on, and the load itself was never reduced so the cue was impossible to follow anyway. Intensity is now throttled on `percentageOf1RM` where it belongs, and RPE is capped at a genuinely submaximal 6 rather than scaled. Same category error as the %HRR/%HRmax bug in v2.9.1.
- **Editing a session mid-workout escaped the injury filter.** Adaptations were applied once inside `startWorkout` and baked into the session. `swapExercise` spread the replaced exercise's prescription, so swapping *away* from a flagged movement carried its reduced sets, capped RPE and "Caution: active injury" note onto the safe replacement — and swapping *into* a contraindicated movement got no throttle at all. `addBonusExercise` was never checked either. All three now share one function, so the session stays in adaptation as the athlete edits it, and clearing an injury fully restores the original prescription.
- **`.btn-primary` failed WCAG AA — 66 call sites.** White on `primary-500` measures 3.68:1. The v2.9.0 contrast pass fixed 38 inline literals and missed the shared class, which is the app's main CTA style, so every primary button in the product was under the floor. Now `primary-600` at 5.17:1. Every tab plus the nutrition tracker measures zero contrast failures.
- **Two Knowledge articles disagreed about the same fact**, and both were imperial-only in a kg-default app: daily weight fluctuation was given as "2-4 lbs" in one and "1-3 lbs" in another. Both now read "1-2 kg (2-4 lbs)".
- **Contextual nutrition targets didn't add up to their own macros.** Deriving fat by rounding (and the hormonal fat floor clamping it) left the ring showing 2375 kcal against P200/C238/F69, which sums to 2373. Reconciled the same way `calculateMacros` already does.

### Verified clean
The main block generator is injury-blind by design — blocks are plans, and the filter runs at session start (`startWorkout`, `smart-pick`, `ActiveWorkout`), so the rehab plan and the training plan don't contradict each other. Knowledge base structure: 252 ids, no duplicates, zero dangling cross-references.

## [2.9.2] - 2026-08-09

**Rehab audit: the app could tell you to back off, but never let you.**

### Fixed
- **A flare-up couldn't move you back a phase.** With pain at 8/10 during exercise and 7/10 at 24 hours, the engine raised "consider stepping back a phase" — and then nothing could act on it. `advanceRehabPhase` was the only writer of the phase, and it only ever moved forward; no decrement path existed in the engine, the store or the UI. Because the phase override is sticky, the plan kept serving Phase 4 Integration work (45 min, pain cap 3) to someone who should have been on Phase 3 (35 min, pain cap 4). The only escape was resolving the injury outright.

  The engine now proposes a step-back, and the warning carries a button that takes it. It requires a *pattern* — more than half of recent check-ins showing elevated pain — so one honest bad day doesn't demote you. Demoting people for bad days teaches them to stop logging bad days. The store action is renamed `setRehabPhase`, since it now moves both directions.

- **"Gates Met" showed green ticks for gates never assessed.** `recent.every(...)` returns true on an empty array, so an athlete who had logged nothing was shown "Pain during exercise ≤3/10 ✓" and "ROM ≥90% of uninjured side ✓" under a green heading. Advancement was correctly blocked, so nobody was hurt by it — but telling an injured athlete they've cleared pain and range-of-motion gates they've never been measured against is the wrong direction to be wrong in. Gates now require the minimum check-in count before they can report as met.

### Verified clean
Barcode/OpenFoodFacts parsing (NaN trust boundary, serving-vs-100g presence check, transient errors not cached) and the illness neck check (fever short-circuits to rest for myocarditis risk, GI to rest, correct precedence).

## [2.9.1] - 2026-08-09

**Math & science audit: the formulas were right, two of them were wired up wrong.**

Checked the physiology engines against the papers they cite. Nine formulas verified correct — Mifflin-St Jeor, Cunningham, Tanaka, the Karvonen algebra, EWMA-ACWR, all three electrolyte molar conversions, the IOC energy-availability thresholds, protein/fat targets, and the readiness weighting (which sums to exactly 1.00). Four findings, fixed here.

### Fixed
- **The Zone 2 base protocol was prescribing tempo intensity.** The zone table carried the %HRmax boundaries (50/60/70/80/90) but ran them through the Karvonen heart-rate-reserve formula — a different scale. "Aerobic Base" came out at 60-70% of reserve, or roughly 73-80% of max HR: for a 30-year-old that's 136-149 bpm where it should be ~117-136. A Zone 2 session exists to sit below the aerobic threshold, and running it 24 bpm hot turns easy aerobic volume into accumulated fatigue — the exact error the protocol is designed to prevent. Zones re-anchored to the %HRR equivalents of the standard physiological bands, and the protocol copy now matches the table instead of contradicting it.
- **After the weigh-in, the app told a dehydrated fighter to drink nothing.** `getWaterProtocol` matched days 7 down to 1 explicitly and fell through to a zero branch, and the dashboard clamped a past event to day 0 — so the water card read "0 ml / nothing until after weigh-in" indefinitely, right through the rehydration window. Sodium had the same gap, restricting exactly when it should be restoring. Both now branch into a rehydration phase, and the timed four-phase protocol (Sawka et al. 2007, 150% replacement) that was already written — and imported into the dashboard but never called — now actually renders.
- **Energy Availability was computed two different ways.** EA = (intake − exercise cost) / fat-free mass. The Diet Coach passed a real exercise cost; the body-weight tracker hardcoded zero. Same 80 kg athlete at 12% body fat on 2400 kcal read 34.1 ("caution") on one screen and 25.6 ("RED-S risk") on the other — a safety metric disagreeing with itself and erring toward reassurance. The tracker now passes the training cost it was already importing.
- **Sweat rate scaled with body mass instead of surface area.** Heat dissipation scales ~BW^0.67, so the linear model over-predicted fluid *and* sodium by 19% at 120 kg — and heavyweights are a core user of a combat-sports app.

### Tests
16 new tests covering all four, including one that previously locked in the Zone 2 bug by asserting the wrong coefficients.

## [2.9.0] - 2026-08-08

**Usability pass: the app now tells you what it wants, what costs money, and what it can actually read.**

Eight findings from a hands-on audit of the live app at phone width. All fixed.

### Fixed
- **Onboarding's only button was disabled and never said why.** One `canProceed()` boolean gated eight separate conditions — fail any one and the button greyed out with no message, no field marker, no count. Some conditions lived in a section that didn't exist until the ones above it validated, so the button could sit dead for a reason that wasn't on screen yet. The CTA is now always live: tapping it scrolls to the first unmet field and flashes it, and a line underneath names what's outstanding ("Pick your sport · 6 left").
- **Pro tools looked identical to free ones until the paywall landed.** The Tools grid had no lock icons and no PRO labels — you found out one tap at a time, and 25 of 33 gated features are Pro. Locked tiles now carry a lock + PRO badge with a dimmed icon.
- **Muted text failed WCAG AA, including the bottom nav.** `text-grappler-500` measured 3.75:1 and `-600` measured 2.36:1 against the dark ground, both under the 4.5:1 floor, across 800+ sites — and the inactive nav labels used them, so primary navigation was below the accessibility line. Lifted to `#8b98aa` and `#8493a4`, keeping the 400 > 500 > 600 step. Separately, 38 selected-state chips moved from `primary-500` to `primary-600` (white text on the lighter blue was 3.68:1). Every tab now measures zero contrast failures.
- **The paywall's only exit was a 20px-wide target** — half the 44px minimum on its narrow axis. Now 44 × 44.
- **"All N tools" reported a different N per tab** (11 on Train, 10 on Progress) because the list is context-filtered. Now reads "11 tools here".
- **The Tools empty state pointed at a "Body tab" that doesn't exist** — the nav is Today / Train / Progress / Tools, and BODY is a heading *inside* Tools. Now names a real gesture: "Long-press any tool below to pin it here."
- **The paywall greeted a 90-second-old account with "Welcome back — sign in."** Right for a lapsed subscriber, doubt-inducing right before asking for a card. Now gated on profile age rather than `isOnboarded`: under 24 hours it collapses to a quiet sign-in link.
- **The Today tab wrote the day off while still offering to start it.** At 8pm on an untrained training day the One Thing engine said "Missed today? Tomorrow's a new day" while the Train tab showed a live Start button. It now reads "Still time — a short session counts." and carries the start action, with sleep as the stated fallback.

## [2.8.0] - 2026-08-08

**One unit everywhere, and weight suggestions that finally respect the rep range you're training in.**

### Fixed
- Coaching messages showed `lbs` no matter what your settings said. The Corner Coach between-set line was the worst offender — `+2.5 lbs vs last time` for a kg athlete, from a literal `currentWeight > 100 ? 'lbs' : 'lbs'` placeholder. Every weight the app speaks or prints now carries the unit from your profile.
- Progress photos, grip strength, the hydration tip and the Corner Coach examples were all hardcoded to pounds.
- A profile with no unit set fell back to `lbs` in ~25 places while Onboarding and Settings defaulted to `kg`, so the same athlete could see both. One default now, shared from `lib/units.ts`.

### Changed
- **Weight suggestions now go through estimated 1RM instead of nudging last session's load.** Undulating (DUP) blocks were the visible break: after a power day at 3 reps, a hypertrophy day prescribed at 12 reps still suggested near the power load, because the old model subtracted a flat 2.5% per rep. Load vs reps isn't linear, and the error grew with the size of the swing. Suggestions now convert your last set to an e1RM using the validated Helms/Zourdos RPE chart, then re-express it at today's target reps and RPE.
- The `~% 1RM` label is derived from the prescribed reps and RPE, so it agrees with the weight the app suggests. It used to be drawn at random from the workout-type band — a program could show `~75% 1RM` next to `12 reps @ RPE 7`, which is not a load anyone can lift for those reps.
- Mid-set corrections ("you hit 11 reps, target 8") size the jump from what the set implies about your e1RM rather than always moving one plate increment.
- `workingWeightFrom1RM` is clamped past 12 reps, matching `estimate1RM`. A 20-rep strength-endurance target used to walk off the end of the Brzycki curve.

### Added
- `lib/load-model.ts` — the single source of truth for load ↔ reps ↔ RPE, replacing three competing models that disagreed with each other. Covered by 23 tests.
- `lib/units.ts` + `useWeightUnit()` — one place to resolve, convert and format weights.

## [2.7.4] - 2026-06-23

**Onboarding "When you train" rebuilt: no more buggy day selection, and you can pick lift + mat on the same day.**

### Fixed
- Tapping one day changed the selection on *other* days, and the rest-day count could go negative (e.g. "-4 rest"). Cause: the picker cycled Rest→Lift→Combat through two day-lists that could overlap (so days got double-counted), and each tap nudged your weekly count, which re-fired an auto-fill that overwrote your manual selection.

### Changed
- The week picker is now **two simple rows you tap to toggle** — Lift days and Mat/combat days — each independent. A day can be **both lift and mat** (Paul's ask). Rest is whatever's left, so it can never go negative, and your lift count drives weekly volume automatically.

### For contributors
- `Onboarding` step 2: replaced `cycleDayType` (mutually-exclusive cycle + a `sessionsPerWeek`-coupled prefill loop) with independent `toggleLift`/`toggleCombat` immutable set ops; prefill runs once on mount only; rest = `7 - |lift ∪ combat|`; UI is two `dayRow` toggle strips.

## [2.7.3] - 2026-06-22

**Crews: stop the action buttons getting cut off at the bottom on phones.**

### Fixed
- In a crew you joined, the buttons under the leaderboard (Invite, Leave/Delete, New crew, Join another) could be pushed off the bottom of the screen on a phone and were unreachable. Cause: the crew screen put its content in a fixed full-height box inside a scrolling column, which on mobile (with the home indicator / dynamic toolbar) shoved the footer past the visible edge. Now the content sizes naturally and scrolls, with extra bottom clearance — matching the cardio planner overlay that already worked.

## [2.7.2] - 2026-06-22

**Deload engine audit: stop recommending deloads to fresh athletes, and fix two internal inconsistencies.**

### Fixed
- **No more false deloads.** The smart-deload engine was telling people to deload after any 4 consistent training weeks — even a beginner doing light work at RPE 7 with a recent PR — citing "accumulated fatigue" that wasn't there. It was measuring *consistency*, not fatigue. Now that trigger only fires when real fatigue has actually built up. (Scheduled every-few-weeks deloads still come from your training block; this is the reactive, fatigue-driven layer.)
- **The engine no longer disagrees with itself on RPE.** Your fatigue score mapped hard sets exponentially (RPE 9 hurts much more than 7), but the part that picks *which* deload to do mapped them linearly — same week, two different fatigue readings. Unified to one formula.
- **Users without a wearable are no longer mislabeled.** With no Whoop/recovery data, the engine used a neutral placeholder for recovery and sleep — and that placeholder could wrongly become your "main" fatigue driver and push an "active recovery" deload based on data that doesn't exist. It now ignores recovery/sleep unless there's real wearable data.

### For contributors
- `smart-deload.ts`: Trigger 5 gated on `currentDebt >= 45`; shared `rpeToFatigue()` used by both `calculateFatigueDebt` and the protocol classifier; `classifyFatigueType` takes `wearableAvailable` and drops recovery/sleep candidates without data. Added `smart-deload.test.ts` (7 tests) — the engine had zero coverage before. Known follow-up: `FatigueOverlay` passes `performanceProfiles: undefined`, so the declining-strength trigger is inert there while HomeTab includes it.

## [2.7.1] - 2026-06-22

**No more cold paywall when your session quietly expires.**

### Fixed
- Pro/owner access is tied to your signed-in account, but the app is local-first — so if your login session lapsed (or you reinstalled), the app kept showing your data while silently treating you as free, and hit you with the upgrade paywall. Now, if you're signed out, the paywall leads with **"Welcome back — sign in"** (restoring Pro/owner access) above the subscribe options, instead of just trying to sell you a plan you may already own. Honest copy — it doesn't promise Pro to a brand-new user.

### For contributors
- `UpgradePrompt` now reads `useSession()` status + `isOnboarded`; when signed out it renders a sign-in CTA (`/login`) above the billing/checkout in both the modal and inline variants. Root cause: `getEffectiveTier` keys off `session?.user?.email`, which is null on a lapsed session.

## [2.7.0] - 2026-06-19

**Put your own workouts on your week. Schedule a My Workout to weekdays and it shows on your plan.**

### Added
- **Schedule a workout to your week.** Each workout in My Workouts now has a "Schedule" chip — tap it, pick the weekdays you want it on (Mon–Sun), and it repeats every week. A small dot appears on those days in your week strip, and a workout scheduled for *today* floats to the top of My Workouts with a "Today" badge so you can start it in one tap. Each weekday holds one of your workouts (assigning another to a taken day replaces it). This is the bottom-up counterpart to the top-down training blocks: compose your own workouts AND your own week.

### For contributors
- New `user.scheduledWorkouts: ScheduledWorkout[]` ({day, templateId}), saved via the existing `updateUserFields` (no new store action). Pure helpers + 7 tests in `scheduled-workouts.ts` (`toggleScheduledWorkout` enforces one-workout-per-day, `daysForTemplate`, `templateForDay`, `pruneScheduledWorkouts`, `formatScheduledDays`). `MyWorkouts` gains the schedule chip + inline weekday picker + today-first sort; `WeeklyCalendar` takes `scheduledWorkoutDays` and renders a corner dot. Deleting a workout prunes its weekday pins.

## [2.6.1] - 2026-06-19

**Phone polish for the workout builder.**

### Fixed
- The Build screen was cramped and fiddly on a phone. Fixed: the Sets / Reps / RPE / Rest steppers are now a roomy 2×2 grid with proper-sized tap targets (the − / + buttons were tiny before), removed the redundant "Start" button competing with the main action, and the primary button now reads a clean "Save & Start" instead of a label that wrapped to two lines and said "1 exercises". Exercise count / duration still show in the summary above the buttons.

## [2.6.0] - 2026-06-19

**Build your own workouts — and keep them. A "My Workouts" home on the Train tab.**

### Added
- **My Workouts** — a new section on the Train tab for workouts you build yourself. Every workout you make is saved here automatically, so it's something you own and repeat, not a one-off. Each one: tap to start, or edit / duplicate / delete. Shows exercise count, rough duration, and how many times you've done it. "New workout" builds a fresh one from any of the 205 exercises (plus your custom ones).
- **Save-by-default builder.** Building a workout now saves it. "Save & Start" saves it and starts the live session; "Save for later" just keeps it. New workouts open straight on the exercise picker instead of the program-templates screen.
- **Edit a saved workout in place** — "Edit" reopens the builder preloaded with that workout; saving updates it (keeps its name, usage count, and history) instead of making a copy.

### For contributors
- New `MyWorkouts.tsx` (Train-tab section), rendered in both the empty and active block states. `WorkoutBuilder` gains an `editTemplateId` prop (preloads a `SessionTemplate`, defaults new builds to the `browse` view) and a save-by-default `saveWorkout(start)` path replacing the old start-only flow. Store: `saveAsTemplate` now returns the new id and a new `updateTemplate(id, name, session)` action edits in place. Saved workouts reuse the existing `sessionTemplates` storage — no new data model. `WorkoutView`/`Dashboard` widen `onNavigate` to pass the edit-target id as overlay context. 4 new store tests in `session-templates.test.ts`.

## [2.5.2] - 2026-06-15

**Wrong macros on a scanned food? Fix them once — the correction sticks for every future scan.**

### Added
- **Edit a scanned product's macros.** Barcode data comes from OpenFoodFacts, which is community-edited and often wrong (mislabeled serving sizes, bad per-100g values). Now when you scan a food, you can tap "Wrong? Fix it", correct the calories/protein/carbs/fat, and log the right numbers. The fix is saved per barcode and re-applied automatically every time you scan that product again — so you only ever fix it once. Corrected foods show a "your numbers" badge.

### Fixed
- Removed two duplicate entries (avocado, edamame) from the food keyword matcher. No macro impact — the food database was already accurate (audited: every entry's calories reconcile with its protein/carbs/fat, and top foods check out against USDA). Note: a scanned/typed honey showing "34c" is not a data bug — 1 tbsp is correctly 17c; 34c is the 2-serving (2 tbsp) selection.

### For contributors
- `barcode-lookup.ts` gains a localStorage-backed override store (`getBarcodeOverride`/`setBarcodeOverride`/`clearBarcodeOverride`) applied via `withOverride()` at every `found` resolution (fresh, cache hit, stale). Overrides pass through the same `finiteNum` NaN guard as remote payloads. `BarcodeScanner` found-card gets an inline edit mode; `BarcodeProduct.corrected` flags overridden macros. Fixed a pre-existing date-flaky `shouldRefillShield` test (computed Monday via UTC `toISOString()` vs the implementation's local `localMondayKey`).

## [2.5.1] - 2026-06-15

**Nutrition gets simpler: log without leaving home, and the app tells you what to eat to finish your day.**

### Changed
- **Logging is now a slide-up sheet** you open from a button on the dashboard — no more switching to a separate "Log" tab to add a meal. The nutrition area is now three tabs (Today / Review / Coach) instead of four.
- **"Finish your day"** — your dashboard now suggests a few foods from your history that best close your remaining calories and protein, each one tap to log.

### For contributors
- `NutritionTracker` collapses the Log tab into a bottom-sheet (FAB-triggered) over the dashboard. `getSuggestions` exported from NutritionInsights and reused on the dashboard with a one-tap `addMeal`. Remaining IA rebuild items tracked in tasks/audit-nutrition.md.

## [2.5.0] - 2026-06-15

**Nutrition math, audited and made honest: your calorie number now always matches your macros, and the app stops giving you two different targets.**

A science + math audit of the whole nutrition engine. The headline: the app used to show different calorie targets in different places and could mark a perfectly-eaten training day as "over." Fixed.

### Fixed
- **Your calories now match your macros, exactly.** The calorie ring used to drift from protein + carbs + fat (you could see "1,500 kcal" while the macros added up to 1,100). They're now reconciled to always agree.
- **One target, everywhere.** Your periodized plan (mini-cut, fat-loss, massing) now actually drives your numbers instead of silently collapsing to a generic cut/bulk. And your adherence report is now scored against the *training-day-adjusted* target you were told to hit — no more getting dinged "over" for eating exactly right on a hard day.
- **Saner numbers at the edges.** Lighter or higher-body-fat athletes on an aggressive cut no longer get absurd protein targets with near-zero carbs (protein is now anchored to lean mass, with a hard ceiling).
- **Safer cuts.** The calorie generator now respects the same RED-S energy-availability floor its own warning uses (30 kcal/kg), so it won't hand you a plan it then flags as risky.
- **Science corrections:** two-a-day carb refeed was ~10× too high (now a sensible front-loaded amount); combat caffeine dose raised to the actually-effective 3 mg/kg; fat floor is now a true hormonal-health minimum; protein is capped at the evidence ceiling on hard days; a few supplement/timing fixes.

### Changed
- **Protein-left headline** under the calorie ring — your real number, not buried in a bar.
- **A log button right on the nutrition dashboard** — add a meal without hunting for the Log tab.

### For contributors
- `calculateMacros` gained authoritative `calorieFactor`/`proteinGKg` overrides + calorie↔macro reconciliation + LBM-anchored protein; shared `weeklyExerciseCostPerDay`. Fixes across periodization-planner, sport-nutrition-engine, contextual-nutrition. Adherence reads effective targets. +6 precision tests (658 total). Full audit + the deferred nutrition UI/IA rebuild in tasks/audit-nutrition.md.

## [2.4.2] - 2026-06-12

**Your crew standing now greets you on the home screen, and last week's winner gets their due.**

### Added
- **Crew standing on Today.** If you're in a crew, the home screen shows where you rank this week ("you're #2 of 6 this week", or 👑 when you're leading) — one tap to the full board.
- **Last week's winner.** Each crew now shows who topped the board last week. It's finalized automatically the first time anyone in the crew trains in the new week.

### For contributors
- `crew_week_winners` snapshot table (FK cascade), lazily finalized in the metrics route the first sync of a new week (idempotent via PK + ON CONFLICT DO NOTHING). GET returns each crew's most recent winner. New `CrewNudge` home component. +1 test (prevWeekKey). Deferred items noted in tasks/spec-social-leaderboards.md.

## [2.4.1] - 2026-06-11

**Crew standings now stay live without anyone opening the leaderboard.**

### Changed
- **Crews update in the background.** Your weekly numbers now push to your crews shortly after you train (debounced), so your crewmates see your real standing without you having to open the Crews screen. Only happens if you're in a crew, and only your name + weekly consistency are ever shared.

## [2.4.0] - 2026-06-11

**Crews: train with your gym and see who shows up the most each week.**

Your first social feature. Start a crew with your training partners, join with a 6-character code, and compete on a weekly leaderboard — ranked by sessions completed, reset every Monday.

### Added
- **Crews + weekly leaderboard.** Find "Crews" in the Progress tab. Create a crew or join one with a code, then see your group ranked by how many sessions (lifting + combat + cardio) everyone completed this week. #1 gets the crown; the board resets Monday so everyone gets a fresh shot. It ranks consistency, not who lifts most — so it's fair whatever your size.
- **Private by design.** Joining is the opt-in. Only your name and your weekly consistency numbers are shared, and only with that crew — nothing else (body weight, lifts, injuries) ever leaves your device's data. Leave anytime; the owner can delete the crew; deleting your account removes you from every crew.

### For contributors
- Server-authoritative `crews` / `crew_members` tables (lazy `CREATE TABLE IF NOT EXISTS`, FK cascade) — crews are not in the per-user sync blob. Routes: create/join/leave/delete + a metrics push that piggybacks on the leaderboard open. Auth-gated, rate-limited, server-side clamps as light anti-cheat; account-delete cascade extended. Spec + roadmap in tasks/spec-social-leaderboards.md. +6 tests.

## [2.3.1] - 2026-06-11

**A removed injury stops flagging your exercises, and the Assault Bike joins the cardio list.**

### Fixed
- **Healed/removed injury no longer flags exercises.** If you marked an injury done and still saw "active injury — N exercises flagged" during a workout, that's fixed. A removed injury was still being treated as active everywhere flags are computed (the workout warnings, the auto volume/intensity adjustment, the smart session pick). Now only injuries that are neither resolved nor deleted count.

### Added
- **Assault Bike** is now a cardio type you can schedule and log, alongside running, cycling, rowing, and the rest.

## [2.3.0] - 2026-06-11

**Cardio is now a first-class part of your week: schedule it, see it on your plan, and log it.**

You can plan recurring cardio sessions that show up on your training week right next to lifting and combat days, and log a cardio session in a few taps.

### Added
- **Schedule cardio on your plan.** Open the Train tab and you'll see a "This week" strip showing your lifting, combat, and now cardio days at a glance. Tap any day (or the "Cardio" link) to plan a session: pick the type (running, cycling, swimming, rowing, jump rope, elliptical), intensity, duration, and an optional label like "Zone 2 base" or "Intervals." Cardio days appear in sky blue.
- **Log a cardio session.** A quick form for type, duration, distance, and intensity drops the session straight into your training history and streak.
- **Your plan accounts for it.** A hard cardio session the day before a lift now nudges that lift's suggested intensity down, the same way hard sparring does — so the week stays recoverable.

### For contributors
- New `ScheduledCardioDay` type + `user.scheduledCardio`. `buildWeekPlan` takes an optional `scheduledCardio` arg (cardio bucket + `CARDIO_COST` freshness) — backward compatible. `WeeklyCalendar` revived from orphan onto the Train tab with a cardio tile + tappable days. New `CardioPlanner` overlay (schedule editor + log form). +5 scheduling tests.

## [2.2.4] - 2026-06-11

**A first-principles cleanup of Today, Progress (formerly "Body"), and Settings: less clutter, no footguns, start your workout in one tap.**

A bold audit of the three core screens. The theme is subtraction: ~950 lines of code that shipped to your phone but never showed anything are gone, the most-used screens lead with what matters, and three Settings traps are closed.

### Changed
- **Today leads with your workout.** The Start button now sits right under your readiness ring instead of eight cards down. Your readiness score is shown once (it used to appear up to four times on one screen), and the "one thing" nudge is hidden when it would just repeat "start your workout."
- **"Body" tab is now "Progress."** It was a mix of strength analytics, body tracking, and history — "Progress" describes that honestly.
- **Progress stops being an endless scroll.** The full weight tracker and full workout history are now one tap to open instead of stacked inline, so you reach everything faster.

### Fixed
- **Changing your training days no longer wipes your block by surprise.** Tapping a new days/week count used to silently rebuild your current training block. It now asks first.
- **Google Fit / Apple Health stop pretending.** Those buttons used to say "Connected" without ever connecting. They now open the real device-setup screen.
- **Notification settings are finally reachable** — there's now a Notifications section in Settings.
- **The Danger Zone looks dangerous.** Reset and Delete Account were styled as quietly as the harmless buttons; Delete is now solid red and clearly separated.

### For contributors
- Removed ~950 lines of never-rendered code: 8 dead cards + dead imports/state in ProgressTab, dead imports + an unreachable repair banner + dead state in HomeTab. Settings: duplicate weight-unit field removed; ProfileSettings gained an onNavigate prop. Audit + remaining waves in tasks/audit-today-body-settings.md.

## [2.2.3] - 2026-06-11

**The "new version available" banner stops hiding behind your phone's notch.**

### Fixed
- **Update banner placement**: the "A new version is available" bar was pinned to the very top of the screen, so on phones with a notch or status bar its Update button tucked up underneath and was hard to tap. The bar's content now sits below the safe area; the colored bar still reaches the top edge. No change on screens without a notch.

## [2.2.2] - 2026-06-11

**The barcode scanner stops crying "not found" when the food database just hiccupped.**

Christoph reported scans that found the product but threw an error, plus the camera occasionally getting stuck. Both fixed, with a guard so bad data from the food database can't corrupt your macros.

### Fixed
- **Barcode scan reliability**: a slow or rate-limited OpenFoodFacts response no longer shows up as "product not found" (and no longer gets cached as missing for a week). The scanner retries once, distinguishes a network hiccup from a genuinely-unknown barcode, and gives you a Retry button instead of a dead end.
- **Camera no longer gets stuck**: the camera is released cleanly between scans, so "Scan again" and "Retry" can't leave it locked ("camera already in use") on mobile.
- **Bad food data can't poison your log**: non-numeric macro values from the food database are now read as zero instead of NaN, which previously could corrupt your daily totals.

### For contributors
- `lookupBarcode` returns a `BarcodeLookupResult` discriminated union (found | not_found | error); transient failures are never cached, so a flaky network can't poison a real product as not-found for 7 days. Timeouts fail fast (no ~16s double-wait). Camera lifecycle now stores a promise-returning `stop()` and releases the prior instance on scanner re-entry. +14 barcode-lookup tests.

## [2.2.1] - 2026-06-11

**Hardening pass: closes the security and reliability gaps the audit found across notifications, sync, and offline storage.**

Backend and PWA fixes from the audit. No new features — these make the existing ones safer and more reliable.

### Fixed
- **Push notifications** can now only be sent to a device registered to your own account (previously the endpoint wasn't ownership-checked), and account deletion now removes your notification and Whoop tokens too.
- **Subscription tier** is server-authoritative — a client can no longer self-grant Pro on first sync.
- **Offline sync is sturdier**: queued workouts no longer pile up toward the storage limit, and a stale queued copy can't overwrite a newer save.
- **Shared-device privacy**: signing out now clears cached API responses, and the app never caches auth/session responses to disk.
- **Flaky-connection UX**: page and data fetches time out and fall back to cache instead of hanging on a blank screen.
- **Accessibility**: 33 icon-only buttons (close, back, skip, share, ...) now announce their action to screen readers.

### For contributors
- AI-coach rate limit is now Postgres-backed (global across serverless instances). Third-party tokens fail closed in production without an encryption key. Sentry strips identifiers from trace URLs. Queue reorder carries an explicit position that survives sync. WorkoutHistory defaults to 90 days. +4 tests.

## [2.2.0] - 2026-06-11

**The whole app now agrees on what day it is — and your lifts stop reporting fake PRs.**
**The biggest screens got noticeably snappier, and security/data-loss holes from the audit are closed.**

A full audit of everything outside the Train tab turned up a cluster of issues that affect daily use. This release fixes the ones that touch correctness and speed.

### Fixed
- **"Today" is now your local day everywhere.** Wellness XP, streaks, nutrition, water, supplements, daily login, and weekly progress all rolled over at UTC midnight — so for anyone in the Americas, an evening workout or meal often counted toward the wrong day, silently denying XP or breaking streaks. Now every "day" is your local calendar day. Competition countdowns and fight-camp phases are fixed too, so weigh-in and fight-day guidance shows on the right day.
- **No more impossible PRs.** High-rep sets (especially bodyweight moves like push-ups) could compute absurd estimated 1-rep-maxes and plant permanent fake personal records. The estimate is now capped to a sane range.
- **Faster Home, Dashboard, and live workout.** These re-rendered on every single background update; they now update only when their own data changes.
- **Security**: closed an unauthenticated endpoint that exposed account data, and a path that could leak a sign-in token.
- **Offline workouts no longer lost** to a server hiccup during sync; and deploys no longer force-reload you mid-set (an update banner now lets you choose when to refresh).
- **AI Coach restored** (was silently falling back to canned advice).

### For contributors
- Shared local-day helpers (`localDayKey`/`localMondayKey`/`parseLocalDate`) and a single `estimate1RM`; 48 new tests. Dependency vulnerabilities patched 20 → 4 (remaining require the Next.js major upgrade, tracked in TODOS).

## [2.1.1] - 2026-06-11

**"Stop block" and undo now survive cloud sync — and two security holes are closed.**
**Your offline workouts can no longer be silently discarded by a server hiccup.**

The v2.1.0 ship deferred its sync-layer work to a dedicated follow-up; this is it, plus the urgent findings from a full audit of the rest of the app.

### Fixed
- **Stopping or switching a block now sticks across devices.** Previously the cloud's copy resurrected a stopped block on the next sync; undoing a completion couldn't restore your XP across devices; and consumed queue entries came back from the cloud. The sync merge now understands the block lifecycle end-to-end — including undo.
- **Security: closed an unauthenticated debug endpoint** that could read and modify any account's training data by email address, and stopped the magic-link sign-in token from being returned to the caller when email sending is unconfigured.
- **Offline workouts no longer vanish on server errors.** The sync queue treated any server response — including "session expired" — as delivered and deleted the queued workout. Entries now clear only on confirmed success and retry otherwise.
- **AI Coach works again.** The Claude model ID was invalid, so every coaching request silently fell back to canned rules. Real Claude-powered weekly analysis is back.
- **Removing a trained week now warns you** that past sessions may shift weeks, and prefers removing untrained weeks automatically.

### Added
- **Browser test suite (Playwright)**: 6 end-to-end tests covering the Train tab's tap flows — today hero, schedule sheet, stop→undo, queue→switch, exercise-remove undo, and the XP-farm guard. `npm run test:e2e`.
- 23 new sync-merge round-trip tests locking in the lifecycle, XP, and tombstone semantics.

## [2.1.0] - 2026-06-10

**The Train tab now answers one question — "what am I doing today?" — in one tap.**
**Every block action is undoable, and stopping or switching a mesocycle is finally a first-class move.**

The old Train tab stacked eight widgets above today's workout. The rework puts today's session at the top with one Start button, compresses the block into a single progress strip, and moves everything else exactly one tap away. Managing your training blocks — complete, stop early, switch to a queued block, browse past reports — lives in one Blocks sheet, and every action can be undone on the spot.

### Added
- **Today hero**: today's session with exercise preview and one Start button. Adapts to your state — Resume when a workout is paused, "Done for today" with what's next after you train, a celebration with next-block CTA when the block is finished.
- **Block strip**: block name, week position, fight countdown, and a segmented per-week progress bar. Tap for the full schedule (volume wave, weeks, session start, exercise editing, add/remove weeks).
- **Blocks manager**: one home for the block lifecycle — complete or stop the current block (no confirm dialogs, everything undoable), start or switch to queued blocks, browse past blocks with full reports and status badges.
- **Switch block**: jump to a queued block mid-mesocycle. The abandoned block is archived honestly as "stopped" — never falsely "completed" — and the whole switch is one undo.
- **Undo everything**: block creation, completion, stop, switch, delete, week add/remove, and exercise removal all get an undo toast. Undo restores your XP, badges, level, and training preferences too.
- **Block composer polish**: the Muscles picker now keeps your focus/length/days/wave choices, and the volume preview matches what the generator actually builds.

### Fixed
- **Stopping a block could never be done before** — abandoning a block via the composer silently mislabeled it "completed", inflating completion badges. Stopped blocks now carry truthful status everywhere.
- **Completing a block you never trained in no longer awards the +200 XP bonus** (and no longer counts toward completion badges) — the bonus requires real logged work.
- **Logging out now clears in-memory undo history** — previously an undo after re-login could restore the prior account's data into the new account.
- **The intensity heatmap put workouts on the wrong day** for anyone west of UTC (today's session only appeared after ~8pm). Days are now keyed to your local calendar, including across DST changes.
- **The Train tab re-rendered on every store update** (any meal log, any sync) due to a selector bug — now it only re-renders when its own data changes. Block reports and exercise alternatives are also no longer recomputed on every render.
- **"Last performance" hints no longer show weights from sets you skipped.**
- **Injury-aware workouts could occasionally include lunges for a knee injury** — the avoid-list matcher missed singular/variant exercise names. All lunge variants are now excluded for knee regions.
- Deleted workouts no longer count toward session completion or "done for today".
- Weekly challenge and subscription test expectations aligned with current product behavior (meal logging and the program browser are free).

### Changed
- Keyboard and screen-reader support across the new Train surfaces: Escape closes every sheet, segmented controls expose pressed state, icon buttons have accessible names and 44px tap targets.
- Deload weeks render teal consistently across the composer preview, schedule, and reports.
