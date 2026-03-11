# Full Workout System Audit — First Principles

**Date:** 2026-03-04
**Scope:** Every calculation, formula, UX flow, and edge case in the live workout system
**Philosophy:** Steve Jobs / Elon Musk — zero tolerance for wrong math, bad UX, or cargo-cult engineering

---

## Executive Summary

**The workout system has strong bones but critical math errors, dead code paths, and UX friction that undermine its ambition.** The app has more sport science depth than any competitor — but that depth is wasted when formulas contradict each other, stub functions pretend to work, and the UI makes users scroll to complete a set.

### By the Numbers
- **12 CRITICAL issues** (wrong math, dead features, data corruption)
- **~30 MODERATE issues** (suboptimal logic, UX friction, missing validation)
- **~20 MINOR issues** (cosmetic, edge cases, nice-to-haves)
- **8 CRITICAL UX issues** (workflow blockers, missing core features)

---

## TIER 1: CRITICAL — These Are Actively Wrong

### 1. Two Different 1RM Formulas Produce Different Numbers
**Files:** `weight-estimator.ts` (Epley), `store.ts` + `workout-generator.ts` (Brzycki)
**Impact:** A user who squats 100kg×5 gets 1RM of 116.7kg (Epley) or 112.5kg (Brzycki) depending on which code path runs. Weight suggestions drift by ~4% across the app. The round-trip doesn't close: estimate 1RM with Brzycki → calculate working weight with Epley → you get 96.4kg, not 100kg.
**Fix:** Standardize on Brzycki everywhere. It's already used in 2 of 3 locations.

### 2. RPE Scaled by Multiplication Instead of Addition
**File:** `workout-generator.ts:1079`
**Impact:** RPE 7 × 1.045 = 7.315. RPE 9.5 × 1.045 = 9.93. Athletes report RPE in 0.5 increments. The non-linear scaling means low-RPE exercises progress less than high-RPE ones — backwards. Every prescribed RPE in every generated mesocycle has nonsensical decimal values.
**Fix:** RPE should increase additively: `rpe + (weekNumber - 1) * 0.5`

### 3. Weight Adjustments Calculated But Never Applied
**File:** `auto-adjust.ts:370-398`
**Impact:** The RPE-based weight adjustment system (`calculateExerciseAdjustments`) computes weight changes based on feedback, pushes them to an array, but `applyAdjustmentsToSession` only reads `adjustmentType === 'sets'` — weight adjustments are silently dropped. The entire per-exercise auto-regulation feature is dead code.
**Fix:** Handle `adjustmentType === 'weight'` in the application loop.

### 4. Volume Individualization Is a Complete Stub
**File:** `volume-landmarks.ts:247-258`
**Impact:** `estimateStrengthDelta()` always returns 0 or 1. MEV = lowest training week (wrong), MAV = least sore week (wrong), MRV = always population default. The individualization engine — the feature that makes this app unique — is fiction. The Bayesian blending with defaults masks it, but "personalized volume landmarks" are just static numbers.
**Fix:** Actually compare week-over-week average weight per muscle to measure strength progression.

### 5. Fatigue Scoring Is Unit-Biased (kg vs lbs)
**File:** `smart-deload.ts:239-246`
**Impact:** Volume score uses `avgVolumePerSet / 100`. A 225lb×5 set = 1125 volume → score 11.25. Same lift in kg: 100×5 = 500 → score 5. **Metric users get 2.2× lower fatigue scores**, meaning delayed deload recommendations, more accumulated fatigue, higher injury risk.
**Fix:** Normalize by unit, or better: use volume relative to the user's own historical average.

### 6. RPE-to-%1RM Table Is for 1-Rep Only
**File:** `rpe-regulator.ts:31-43`
**Impact:** The Helms RPE chart for singles is applied to all rep ranges. RPE 9 at 1 rep = 95.5% 1RM. RPE 9 at 5 reps = ~85% 1RM. The engine underestimates 1RM by ~12% for typical training sets, making all weight drop/bump suggestions wrong by 5-10%.
**Fix:** Use the full 2D Helms/Zourdos RPE×Reps lookup table.

### 7. `baselineLifts` Accepted But Never Used
**File:** `workout-generator.ts:401, 1122`
**Impact:** Users enter their squat/bench/deadlift 1RMs during onboarding. The generator accepts this data, creates `percentageOf1RM` values, but never calls `calculateWorkingWeight()` to resolve them into actual kg/lbs. Users see "82% of 1RM" instead of "165kg."
**Fix:** During generation, resolve percentage prescriptions to actual weights for exercises matching baseline lifts.

### 8. Split Type Always Returns 'full_body' for Exercise Selection
**File:** `workout-generator.ts:650`
**Impact:** `determineSplitType(0, ...)` passes 0 sessions/week, always hitting the `<= 3` branch. A 6-day PPL user gets full-body movement patterns for exercise selection. The split-specific pattern tables are dead code for anyone training 4+ days/week.
**Fix:** Pass actual `sessionsPerWeek` to `determineSplitType`.

### 9. Linear Volume Multiplier Uncapped — Explodes on Long Blocks
**File:** `workout-generator.ts:1004`
**Impact:** Week 11 of a 12-week block: `volumeMultiplier = 1.30` (30% increase). Combined with experience/sex modifiers, can reach 1.72× base volume. The validator trims to MRV by gutting session design. 8+ week mesocycles prescribe unsustainable volume.
**Fix:** Cap `volumeMultiplier` at 1.15-1.20, or use an asymptotic curve.

### 10. No Pause Time Tracking — Duration Includes All Paused Time
**File:** `store.ts:1837-1839, 2095-2097`
**Impact:** `pauseWorkout()` only toggles `workoutMinimized`. A 45-min workout with a 30-min lunch break shows as 75 minutes. This corrupts workout logs, Whoop HR correlation, and all duration-based analytics for every user who ever minimizes mid-workout.
**Fix:** Add `pausedAt` timestamp + `totalPausedMs` accumulator. Subtract from elapsed time in `completeWorkout()`.

### 11. Consecutive Overload Detection Is Broken
**File:** `smart-deload.ts:344-359`
**Impact:** A "deload week" is defined as scoring below 65% of the overall average — but the average includes the overload weeks, so it's almost always below the threshold. The function almost never detects that a deload happened, causing the "4+ weeks without deload" trigger to fire perpetually after 4 weeks of any training.
**Fix:** Detect deloads as scoring below 50% of the peak week's score, not 50% of the average.

### 12. No Brzycki High-Rep Guard — Division by Zero at 37 Reps
**File:** `weight-estimator.ts`, `workout-generator.ts:1197`
**Impact:** Brzycki formula: `weight / (1.0278 - 0.0278 * reps)`. At 37 reps → denominator = 0 → Infinity. At 38+ reps → negative 1RM. Both formulas produce garbage past ~12 reps.
**Fix:** Clamp reps to 12 for 1RM estimation. Return 0 for reps ≤ 0.

---

## TIER 2: MODERATE — Suboptimal but Not Broken

### Auto-Adjust Engine
| Issue | File | Impact |
|-------|------|--------|
| "too_easy" and "challenging" apply same 5% increase | auto-adjust.ts:178-213 | No differentiation between feedback levels |
| Uses max weight across ALL sets (incl. failed) | auto-adjust.ts:171-173 | Failed attempts used as basis for adjustment |
| "just_right" does literally nothing | auto-adjust.ts:214-216 | Users who consistently report "just right" never progress |
| RPE 6.5-9.0 (entire working range) gets zero adjustment | auto-adjust.ts:298-305 | Auto-regulation ignores the productive training range |
| Compounding multipliers can reduce volume by 50% in one session (clamped at 70%) but no cross-session regression protection | auto-adjust.ts:274-329 | Three bad days → 66% volume loss with no bounce-back |
| `previousLogs` always passed as empty array | auto-adjust.ts:357-361 | Historical trend data never reaches the engine |
| `evaluateDoubleProgression` uses first set's weight, not max | auto-adjust.ts:586 | Ramped sets pollute double progression logic |
| Whoop recovery overwrites baseline then adds HRV/sleep again (double-counting) | auto-adjust.ts:693-698 | Scores become more extreme than intended |

### Workout Generator
| Issue | File | Impact |
|-------|------|--------|
| Deload always last week — no mid-block deloads for 8+ week blocks | workout-generator.ts:1143 | 11 straight training weeks without deload |
| `balanced` goal maps to `power` in quick workouts | workout-generator.ts:1288 | Balanced users get explosive training |
| Block schemes only cover 5 weeks — silently switches to DUP after | workout-generator.ts:250-288 | Block periodization breaks mid-mesocycle |
| RPE generated in 0.1 increments instead of 0.5 | workout-generator.ts:531 | Non-standard RPE values (7.3, 8.7) |
| `findAlternatives` uses old equipment system | workout-generator.ts:886 | Alternatives may require unavailable equipment |

### Readiness/Recovery
| Issue | File | Impact |
|-------|------|--------|
| Red level (readiness <30) still prescribes 40% volume instead of true active recovery | readiness-throttle.ts:95 | Under-recovered athletes still accumulate fatigue |
| Min 2-set floor defeats red-level throttling (3 sets × 0.4 = 1.2 → clamped to 2) | readiness-throttle.ts:183 | Red level gives 50-67% volume, not 40% |
| "Consecutive" fatigue trigger checks "any 2 of 3 weeks" but says "consecutive" | smart-deload.ts:635-641 | Misleading trigger messages |
| RPE fallback only works for first log in a week | smart-deload.ts:258-276 | Silently drops RPE data from later sessions |
| No chronic RPE detection when PRs occasionally occur | rpe-regulator.ts (systemic) | Chronic RPE 9.5 with sporadic PRs goes undetected |
| RPE bump suggestion gated by `avgRpe <= 6` even at high target RPEs | rpe-regulator.ts:96 | Users at target RPE 9 never see bump suggestions |

### Store/Active Workout
| Issue | File | Impact |
|-------|------|--------|
| `activeWorkout` not persisted — refresh kills mid-workout progress | store.ts partialize config | 60-90 minute workout lost on browser refresh |
| No validation in `updateExerciseLog` — accepts any data | store.ts:1555-1568 | Negative reps, out-of-bounds index, RPE > 10 all possible |
| `swapExercise` doesn't prefill suggested weight | store.ts:1595-1603 | User must re-enter weight for known exercises |
| `addBonusExercise` initializes reps to 0 and weight to 0 | store.ts:1650-1656 | No prefill despite engine + history being available |
| Rest timer ring uses wrong exercise's rest duration after advancing | ActiveWorkout.tsx:2760 | Visual ring animation is wrong after exercise transitions |
| "Next: Set X of Y" display is off by one during rest | ActiveWorkout.tsx:2880 | Shows set 4 when next is actually set 3 |
| `calculate1RM(weight, 0)` returns positive number instead of 0 | workout-generator.ts:1197 | 0 reps treated as valid lift |

### Superset/Schedule/Conditioning
| Issue | File | Impact |
|-------|------|--------|
| Chest/biceps listed as antagonist pair (they're not) | superset-engine.ts:48 | Wrong superset pairings |
| Back/shoulders listed as antagonist pair (they're not) | superset-engine.ts:49 | Wrong superset pairings |
| ACWR returns "undertrained" when chronic load is 0 but acute is high (should be danger) | concurrent-training.ts:387 | New users who spike training get the opposite of the correct warning |
| Tabata protocol labeled 'beginner' | conditioning-templates.ts:375 | 170% VO2max protocol given to beginners — injury/rhabdo risk |
| Striking fatigue typed as 'peripheral' only (should include central) | concurrent-training.ts:141 | CNS interference from sparring not detected |
| Scramble Drill `totalDuration` off by 20% (12 min stated, 10 min actual) | conditioning-templates.ts:131 | Wrong time estimates |

### Weight Estimator
| Issue | File | Impact |
|-------|------|--------|
| Deadlift BW multiplier ignores its own defined table, uses squat×1.15 | weight-estimator.ts:308 | Up to 8% underestimation for deadlift exercises |
| Safety margin only for beginners (none for intermediate/advanced on new exercises) | weight-estimator.ts:215 | Experienced lifters get overestimated first-time weights |
| 0 reps treated as 1RM instead of failed lift | weight-estimator.ts:27 | Failed lifts register as max attempts |
| Volume landmarks for biceps/calves/shoulders below current literature | workout-generator.ts:29-43 | Under-prescribing volume for these muscle groups |
| Compound sets counted at full value for all muscles (no fractional attribution) | volume-landmarks.ts:212-225 | Secondary muscles appear over-volumed, reducing isolation work |

---

## TIER 3: UX/UI — CRITICAL

### 1. Complete Set Button Requires Scrolling
**Element:** Complete Set button at bottom of exercise card
**Impact:** Exercise card contains: name, action buttons, prescription, suggestions, set indicators, weight input, plate calc, reps input, RPE selector, tempo metronome, THEN the Complete button. On a standard phone, this requires scrolling past the fold **for every single set**.
**Fix:** Make "Complete Set" fixed at the bottom of the viewport. This is the single biggest UX improvement possible. Strong and Hevy both have inline set completion requiring zero scroll.

### 2. Set Completion Requires 4+ Interactions (Should Be 1)
**Impact:** Weight adjust + reps adjust + RPE select + tap Complete = 4 minimum interactions per set. RPE doesn't carry forward or pre-fill from prescription. If weight/reps/RPE were all pre-filled, a user could complete in 1 tap.
**Fix:** Pre-fill RPE from prescription target. Make RPE collapsible/optional. If everything is pre-filled, 1-tap completion.

### 3. No Workout Summary Before Saving
**Impact:** The finish modal goes straight to a feedback survey (RPE, performance, soreness, energy, mood, enjoyment, notes — 7 fields!) without showing what the user accomplished. No total volume, no PRs, no duration, no per-exercise summary. Users save blindly. Every competitor shows a celebration summary first.
**Fix:** Show workout stats FIRST (duration, volume, PRs, best sets). Make all feedback except session RPE optional and collapsed.

### 4. No Exercise Reorder in WorkoutBuilder
**Impact:** `GripVertical` icon imported but never used. Zero reorder functionality. Exercise order matters enormously (compounds before isolations). Users must delete and re-add to reorder.
**Fix:** Drag-to-reorder or move-up/down buttons.

### 5. No Favorites / Recently Used Exercises
**Impact:** 250+ exercise database with no favorites or recents. Users who build custom workouts search for the same 10 exercises every time — 5-10 extra taps per exercise, per workout.
**Fix:** "Recent" section (last 8-10 logged exercises) + "Favorites" section at top of exercise browser.

### 6. Template System Has 6 Tabs — Decision Paralysis
**Impact:** Programs, Quick, Grappling, Saved, Save, History. Users who just want to start lifting face 6 choices before seeing a workout. "Save" is an action pretending to be a tab.
**Fix:** Collapse to 3 tabs: "Programs" (merge Quick + Grappling as filters), "My Templates" (merge Saved + History), move "Save" to a contextual action.

### 7. Starting a Template Silently Replaces Entire Program
**File:** WorkoutBuilder.tsx `startFromTemplate`
**Impact:** Tapping a mesocycle template silently changes `user.goalFocus`, `user.sessionsPerWeek`, and generates a full new mesocycle. Zero confirmation. A casual browser can accidentally destroy their current program with one tap.
**Fix:** Confirmation modal: "This will start a new X-week program. Your current mesocycle will be replaced. Continue?"

### 8. No "Repeat Last Workout" Action
**Impact:** The #1 action gym users take (per Strong/Hevy analytics) doesn't exist. Users who follow a consistent routine navigate through templates/builders every session. A single "Repeat" button on HomeTab would eliminate this entirely.

---

## TIER 4: UX/UI — MODERATE

| Issue | Impact |
|-------|--------|
| Quick-adjust weight pills (±2.5, ±5, ±10) are ~28px — below 44px minimum for sweaty gym hands | Mis-taps on every weight adjustment |
| Exercise name not sticky during active workout — scrolls out of view | User loses context of which exercise they're on |
| "Set 3 of 4" not shown prominently — must count highlighted pills | Cognitive load per set |
| "Next exercise" info during rest is `text-xs text-grappler-400` — tiny and low-contrast | Wasted rest timer real estate |
| No way to return to workout overview mid-workout | Can't preview upcoming exercises/weights |
| Set completion has no haptic/animation feedback | Missing micro-satisfaction |
| Low contrast on `text-grappler-400` secondary text in bright gym environments | Readability under gym lighting |
| Pre-workout overview is information-dense (Whoop, warm-up, supersets, grappling — all before Start) | Overwhelms beginners |
| No weight preview per exercise in overview | Can't prepare plates/equipment |
| Post-workout feedback requires 7 fields | Survey fatigue after hard workout |
| No rest timer ±30s adjustment buttons | Can't customize rest on the fly |
| No superset execution mode (only detection in overview) | Superset engine is backend-only |
| 0 reps + 0 weight completes a set with no validation or warning | Silent data pollution |
| No per-set notes | Can't record "used belt," "left shoulder tight," etc. |
| Template saved from history uses dummy exercise metadata | Data corruption in saved templates |
| Workout type change in builder doesn't update existing exercises | Silent prescription inconsistency |
| Tiny +/- buttons (12px icons) in WorkoutBuilder steppers | Below minimum touch targets |
| No "Start Empty Workout" option | Missing workflow for experienced lifters |
| No template editing — delete and recreate only | Unnecessary friction |
| No first-time weight estimation in `startWorkout` (shows 0kg for new exercises) | Looks broken for new users |
| Filters default to collapsed in exercise browser | Extra tap every time |

---

## Priority Matrix: What to Fix First

### Wave 1: Math Fixes (Highest Impact, Backend Only)
These silently produce wrong data for every user. Fix these before any feature work.

1. Standardize on Brzycki formula everywhere + add rep clamp
2. Fix RPE multiplication → addition in workout-generator
3. Apply weight adjustments in `applyAdjustmentsToSession`
4. Add pause time tracking in store
5. Fix unit bias in fatigue scoring
6. Fix consecutive overload detection
7. Pass actual sessions/week to `determineSplitType`

### Wave 2: UX Quick Wins (High Impact, Small Changes)
These are 1-2 hour fixes that dramatically improve the experience.

1. Fixed "Complete Set" button at viewport bottom
2. Pre-fill RPE from prescription
3. Add workout summary to finish modal (before feedback)
4. Add 0-reps validation warning
5. Fix rest timer ring to use stored rest duration
6. Fix "Set X of Y" off-by-one
7. Add confirmation dialog for template start

### Wave 3: Feature Gaps
These require more work but fill obvious holes.

1. "Repeat Last Workout" on HomeTab
2. Exercise favorites + recently used
3. Exercise reorder in WorkoutBuilder
4. Simplify template tabs (6 → 3)
5. Persist `activeWorkout` to prevent data loss on refresh
6. Rest timer ±30s buttons

### Wave 4: Engine Completions
These improve the intelligence layer.

1. Implement `estimateStrengthDelta` properly in volume-landmarks
2. Add 2D RPE×Reps lookup table in rpe-regulator
3. Differentiate "too_easy" vs "challenging" weight bumps
4. Add cross-session regression protection
5. Fix antagonist pair definitions in superset-engine
6. Use baseline lifts to resolve actual working weights

---

## What's Actually Good

Credit where due — these are genuinely well-engineered:

- **Per-set weight prefill from previous sessions** — better than Strong's flat last-weight approach
- **Pre-workout check-in with progressive disclosure** — quick feelings or detailed fine-tune, user's choice
- **Real-time PR detection banner** — golden gradient "PR Territory!" as you input is motivating
- **Readiness throttle concept** — the idea of gating workout intensity on readiness is excellent (execution needs fixing)
- **Corner coach messages** — between-set tactical messaging is unique in the market
- **Pause & Browse App** — three-option cancel dialog is better than any competitor
- **Confetti + haptics on PR** — satisfying celebration that matches the moment
- **Evidence-based constants with citations** — inline paper references show genuine sport science commitment

The foundation is strong. The issues are almost all fixable without architectural changes. The biggest risk is the math errors compounding silently over weeks of training, producing bad prescriptions that erode user trust.
