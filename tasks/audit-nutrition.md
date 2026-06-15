# Nutrition audit — science, math, UI/UX (2026-06-15)

Three deep audits (core energy/macro math · nutrition-science engines · UI/UX). Verdict: **the engines are well-sourced, real science — not cargo cult — but the app had no single answer for "what's my target today," which guaranteed contradictory numbers on screen.** That's the root of "not precise."

## FIXED (shipped v2.5.0, branch fix/nutrition-precision-and-ui)

### Math / correctness (diet-coach.ts)
- **Single source of truth.** `calculateMacros` now accepts `calorieFactor` + `proteinGKg` overrides; the periodization consumer (`DietCoach.tsx`) passes the phase's `calorieFactor`/`proteinGKg`/`deficitSeverity`. Previously every periodized phase silently collapsed to generic `tdee×0.8`/`×1.12` and the planner's protein curve was dead code.
- **Calories == macro sum.** Returned calories are now reconciled from the rounded macros, so the ring always equals protein×4 + carbs×4 + fat×9 (was: "1500 kcal" while macros summed to 1100). Locked by a test sweeping all goals/sexes/weights.
- **LBM-anchored protein for higher body-fat.** The BF>25 lean-mass branch was shadowed by the severity check → a 60kg/35%BF athlete on an aggressive cut got 3.1 g/kg total = 186g + ~0 carbs. Now anchored to ~2.6 g/kg LBM; lean athletes still get the 3.1 g/kg target. Hard ceiling at 3.5 g/kg LBM.
- **EA floor 25 → 30** kcal/kg FFM — the generator no longer hands back a plan its own RED-S widget flags.
- **lbs factor** `2.205` → `2.2046226218` (and `0.453592` → `0.45359237`).
- Shared `weeklyExerciseCostPerDay` helper (one source for the EA floor; was computed in 3 places).

### Nutrition-science engines
- periodization: massing protein 1.8 → 2.0 (matches downstream); maintenance-week cap `MIN`→`MAX` typo.
- sport-nutrition: two-a-day carbs were ~10× too high (75g/hr × 4h = 300g, a misread Burke citation) → front-loaded bolus; combat caffeine 2.5 → 3 mg/kg (was sub-ergogenic).
- contextual-nutrition: fat floor now g/kg (0.7) not a % of base (comment said 20%, code was 50%); protein clamped to 3.1 g/kg ceiling (multipliers could stack to 4 g/kg); beta-alanine removed from pure-strength days (wrong energy system) → creatine.

### UI trust + quick wins
- **Adherence scored against the EFFECTIVE (adjusted) target**, not base — the report card was marking a perfectly-eaten training day as "over."
- **Protein-left headline** under the calorie ring (the athlete's real KPI).
- **Persistent log FAB** on the dashboard — logging is now one tap from the screen you land on.

## UI/IA rebuild — partially shipped (v2.5.1)
- [x] **Logging is a bottom sheet from the dashboard FAB** — no more switching to a "Log" tab. 4 tabs → 3 (Today / Review / Coach).
- [x] **"Finish your day" strip on the home screen** — one-tap foods from your history that best close the remaining gap (reuses `getSuggestions`). The "know what to eat next" loop now closes on Today.
- [x] Protein-left headline + log FAB (v2.5.0).
- [ ] Move the context-adjustment banner BELOW the ring (still above; it's a compact pill).
- [ ] One-tap favorites/stamps skip the portion sheet (log at last-used portion).
- [ ] Demote Insights+Trends fully to a Weekly Review; DietCoach → triggered setup/check-in flow.
- [ ] Fold FightCampNutrition into the phase/contextual engine (still a separate overlay).
- [ ] De-dup supplements to one home.

## DEFERRED — the remaining big UI/IA pieces (need the founder's eyes, can't visually verify behind auth)
The information architecture is the remaining disease: **two nutrition homes (tracker + DietCoach), a 4th parallel engine (FightCampNutrition), the daily loop (log / see / guidance) split across 3 tabs, supplements in 3 places, 3-deep nesting.** The bold target:
- Collapse the 4 tabs → **one scrolling home**: ring (kcal-left + protein-left) → one-line context chip *below* the ring (move the adjustment banner down) → macro bars/water → a "finish your day" strip (one-tap foods that close the gap, reuse `getSuggestions`) → meals. Log sheet over home via the FAB; one-tap favorites skip the portion sheet (log at last-used portion).
- Demote Insights + Trends to a **Weekly Review** (not daily tabs).
- DietCoach → a triggered **setup + weekly check-in flow** (reuse `checkInDue`), not a permanent tab.
- Fold **FightCampNutrition** into the phase/contextual engine (one brain, one number).
- De-dup supplements to one home.

This is L-effort and reshapes navigation; do it as a focused pass with the live app visible.
