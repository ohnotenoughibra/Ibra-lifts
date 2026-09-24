# Workouts, Variety, Templates, Live Workout & Swap — Audit

**Date:** 2026-09-24 · **Version audited:** v2.11.1 (c2886c2)
**Method:** read-only. Library + generator bundled with esbuild and executed (8 profiles × 60–200 mesocycles); swap function run against all 204 exercises; live-workout bugs reproduced with vitest against the real store (existing suite: 754/754 pass, but zero coverage of ActiveWorkout / useRestTimer). Key lines re-verified by hand.
Tags: **[RUN]** measured by executing code · **[CODE]** read from source.

---

## TL;DR — the 10 things that matter

| # | Sev | Area | Finding |
|---|---|---|---|
| 1 | Critical | Generator | Exercises re-randomised **every week** of a block → progressive overload can't work |
| 2 | Critical | Generator | 60-min default time budget deletes **all** isolation work (0% of 3,200 sessions) |
| 3 | Critical | Live | Low-readiness throttle desyncs session vs logs → sets saved to the **wrong exercise** |
| 4 | Critical | Live | Pause→resume resets position and **re-applies the throttle** (rest 180→216→259s) |
| 5 | Critical | Live | Skipping an exercise writes completed 0×0 sets → next session prefilled 0×0 + fake "too hard" |
| 6 | Critical | Templates | Templates ignore their own settings (PPL = full body, "Bodyweight Only" gives barbell work) |
| 7 | High | Swap | Hard cap of 8, no search, no "more"; 86% of shown slots are near-clones of the original |
| 8 | High | Swap | Swapping mid-exercise wipes already-completed sets |
| 9 | High | Variety | Only 99/204 exercises ever picked; top-10 fill 47–76% of all slots; rows ~0% on hypertrophy U/L |
| 10 | High | Data | Pattern taxonomy too coarse + mis-tagged (calf raise = `push`, leg curl = `pull`); `grapplerFriendly` true on 203/204 |

---

## 1. Exercise selection & variety (`src/lib/workout-generator.ts`)

**Library [RUN]:** 204 exercises (docs claim ~250). compound 94 · isolation 67 · grappling 18 · power 16 · grip 9. Patterns: push 61, pull 53, squat 32, hinge 21, explosive 18, rotation 11, carry 8. Kettlebell 6, landmine 4, trap bar 1. Unilateral only 22. No `neck` muscle group (`types.ts:90`). Duplicate id `towel-pull-up` (`exercises.ts:593` and `:4463`).
Missing: sled push/drag (referenced by conditioning templates!), Cossack/lateral lunge, Bulgarian split squat, single-arm cable/landmine row, tibialis raise, hip airplane, jerk, trap-bar jump, rotational med-ball throws.

### C1 — New exercises every week [CODE+RUN]
`usedExerciseIds` is created inside `generateMesocycleWeek` (`:1098`) and picks are `weightedShuffle` (`:539`). Week 2–4 slots match week 1 only 31–68% of the time. Rep progression (`:1202`) and history prefill assume the same lift each week.
**Fix:** select once for week 1, clone to weeks 2..N changing only sets/reps/intensity. Rotate variants **between** blocks.

### C2 — Time budget nukes isolation [RUN]
`fitSessionToTimeLimit` step 2 (`:943`) drops *every* isolation exercise in one filter. At the 60-min fallback, 4-day hypertrophy U/L = 3 compounds/session (40–52 min actual). Weekly direct sets: biceps 2.7, triceps 1.7, calves 0.
**Fix:** trim one lowest-priority exercise at a time; guarantee ≥1 isolation per target muscle; fill back up to budget.

### H1 — Two-thirds of the library is dead [RUN]
99/204 ever picked across 8 profiles (27–53 per profile). Consecutive blocks share 81–90% of exercises. Never picked: goblet squat, RDL, hip thrust, leg press, face pull, all curls, all calf raises, Pallof press, plank, lunges…
Causes: isolation only for hypertrophy/balanced (`:800`); muscle-count bonus in scoring (`:735`) makes snatch-grip DL beat RDL (32% of grappler sessions); declared `accessories` slot (`:359`) unused.
**Fix:** accessory slots for every goal, drop muscle-count bonus, penalise lifts used in the last 1–2 blocks (`mesocycleHistory`).

### H2 — Coarse patterns [RUN]
`pull` doesn't separate vertical/horizontal → rows are 0.2% of compound pulls (hyp U/L). 40% of hypertrophy lower days have ≥2 barbell squat variants.
**Fix:** sub-patterns: h-push, v-push, h-pull, v-pull, knee-dominant, single-leg, hinge, anti-rotation, rotation, carry, isolation-by-muscle. Max 1 per sub-pattern per session.

### H3 — Isolation stacking [RUN]
74% of 90-min sessions repeat a muscle in isolation picks (e.g. 4 curls). `coveredMuscles` not updated during selection. **Fix:** greedy pick + re-score after each pick.

### H4 — Combat work never shows up [RUN]
Neck 0.0% of sessions; strikers 3-day: rotation 3.7%, unilateral 0.4%. Combat splits only kick in at ≥4 days; `wrestler_strength` unreachable (`:508`).
**Fix:** mandatory combat slots (neck / grip / anti-rotation / unilateral) independent of split.

### Medium
- M1 Mis-tagged patterns: leg extension, calf raise, plank, ab wheel, dead bug = `push`; leg curl, Nordic, hanging leg raise, cable crunch = `pull`; adductor/abductor = `squat`; dead hang, plate pinch = `carry`.
- M2 No favourites / exclusions; injuries not considered at generation time (only at workout start).
- M3 Broken exercise IDs referenced in code: `progress-analytics.ts:403-418` (benchmarks never match), `exercise-recommender.ts:405-409`, `injury-science.ts:143-167`, `injury-prevention.ts:44-53`, `plyometric-engine.ts:113-144` (13 unknown). **Add a vitest that validates every id literal.**
- Low: deload always last week even in 8-wk blocks (`:1268`); grip picks not added to `usedExerciseIds` (`:813`); bogus superset pairs (`superset-engine.ts:47-56`).

## 2. Templates

Inventory: SessionTemplates 16 programs + 9 grappling + 20 quick; WorkoutBuilder 27 mesocycle templates; 12 conditioning. The 27 builder templates collapse to **13 unique generator inputs** [RUN].

### C3 — Templates are labels, not programs
- `SessionTemplates.handleStartProgram` (`:702`) passes only `weeks` → "block" periodization programs run undulating. It also permanently overwrites `user.goalFocus` / `sessionsPerWeek` (`:939`) without confirmation.
- "Push / Pull / Legs" has `sessions: 3` (`WorkoutBuilder.tsx:83`) → `determineSplitType(3)` = full body [RUN].
- "Bodyweight Only" (`:405`) / "Home Gym Essentials" (`:393`) don't set equipment → bench, deadlift, SSB squat [RUN].
- "Chest & Back Focus", "Leg Specialization" pass no emphasis = identical to "Volume Block".
**Fix:** one data-driven `ProgramTemplate` schema: split, day roles (slot list per day), pinned lifts, equipment, emphasis, periodization, session length. Generator consumes it. Goal overrides scoped to the block.

### Medium
- Two catalogs with overlapping names and different behaviour (SessionTemplates vs WorkoutBuilder); 6 tabs still (open since March).
- ProgramBrowser preview is random → the block you start ≠ the preview.
- Unknown template IDs silently dropped (`SessionTemplates.tsx:46`); "no equipment" templates include ab wheel/pull-ups.
- Gaps: no strength-endurance program, no 2-day combat plan, no 30/45-min variants, no KB-only/band-only, Fight Camp not linked to `fight-camp-engine` / competition date, conditioning exercises are free text not library IDs.

## 3. Live workout (`ActiveWorkout.tsx`, 4,666 lines)

### C4 — Throttle desyncs logs [RUN-test]
`:889` replaces `session.exercises` with the throttled list but keeps old `exerciseLogs`. Orange removes isolations → exercises `[deadlift, sumo-dl]` vs logs `[deadlift, bicep-curl, sumo-dl]`. Sumo DL sets are saved as Bicep Curl; workout never reads as complete (`:1011`). Also direct `useAppStore.setState` from a component.
**Fix:** store action that rebuilds logs from the throttled list keyed by exerciseId.

### C5 — Pause/resume resets & double-throttles [RUN-test]
"Pause & Browse" unmounts the component (`Dashboard.tsx:611`) → overview reappears, index back to 1/1, rest timer + undo lost, and Start re-throttles the already-throttled session (yellow rest 180→216→259s; orange sets 3→2).
**Fix:** persist `currentExerciseIndex`, `currentSetIndex`, `overviewDone`, `restEndTime`, throttle result in `activeWorkout`; always throttle from `baseSession`.

### C6 — Skip poisons history [RUN-test]
`handleSkipExercise` (`:841`) marks remaining sets `completed:true` at 0×0 and writes `difficulty:'too_hard'`. `getPreviousSessionSets` (`auto-adjust.ts:517`) → next session prefilled 0×0.
**Fix:** `skipped:true, completed:false`, no feedback; ignore skipped/zero sets in history lookups.

### High
- **H5 Warm-ups, superset suggestions and throttle notice never render** — built in `submitPreCheckIn` on the same tap that hides the overview (`:2279`), drawn only inside the overview.
- **H6 Rest timer can't alert when locked** — countdown is timestamp-based (good, `useRestTimer.ts:17`) but alerts use `new Notification()` from page JS (throws on Android Chrome, frozen on iOS); no Wake Lock; timer not persisted.
  **Fix:** Wake Lock API during session, alerts via service worker (`lib/notifications.ts`), persist `restEndTime`.
- **H7 Whole screen re-renders every second** — `forceUpdate` tick (`:399`), Whoop readiness recomputed each tick (`:313`), every stepper tap synchronously serialises the entire store to localStorage (`store.ts:4792`). 54 `useState`, 12 hooks after an early `return null` (`:432`) — Rules-of-Hooks violation.
  **Fix:** split into Overview / SetLogger / RestOverlay / FinishModal; isolate tick into `<Elapsed/>`; debounce persistence except on set complete.
- **H8 No delete set / remove exercise / reorder**; editing a completed set doesn't recompute PR/e1RM.

### Medium / Low
- Typed values can be lost on iOS (BufferedNumberInput commits on blur only).
- RPE picker 6–10 whole numbers; targets use 7.5/8.5. Prefilled RPE saved as if user-rated → corrupts `rpe-regulator`.
- History prefill & PR checks ignore `log.weightUnit`; bodyweight fallback assumes lbs (`store.ts:101`) → pull-up prefilled 176.4 "kg".
- "Next:" hint wrong before final set (`:2979`); Recovered→Discard deletes with one tap (`:1427`).
- No ±30s rest, no per-exercise rest defaults, only "+" quick-adjust buttons, PR celebration repeats per set, uncleared timeouts, index keys on sets (`:3631`).
- Missing vs Strong/Hevy/RP: previous-performance column, real warm-up sets, superset/circuit mode, drop/failure set types, notes, reorder, per-exercise finish summary.

## 4. Exercise swap

**Paths:** ActiveWorkout in-set (`:1042`) & overview (`:2311`) → `getRecommendedAlternatives(…, 8, profileEquipment)`; ProgramExerciseCard (`:37`) → same, cap 8, **no gym-profile filter**. Dead implementations: `getAlternativesForExercise` (`exercises.ts:4531`, computed and discarded at `ActiveWorkout.tsx:1034`), `findAlternatives` (`workout-generator.ts:984`, writes a field no UI reads), `getExerciseSubstitutions` (`injury-intelligence.ts:559`, injury-aware, **zero callers**), hardcoded list in `exercise-recommender.ts:397`.

**Measured [RUN]:** the pool isn't small — the ranking + cap is the problem.

| Profile | Uncapped min / median / max | < 8 candidates |
|---|---|---|
| Full gym | 14 / 100 / 181 | 0 |
| Home | 9 / 71 / 133 | 0 |
| Travel | 4 / 28 / 44 | 24 |

2,556 relevant candidates hidden behind the cap; for 136/204 exercises the cut falls mid-tie (arbitrary). 86% of shown slots are the same pattern as the original: Back Squat → Deficit/Pause/Pin/SSB/Box (all 98). Pull-Up → Barbell Row & T-Bar Row score 100, above Chin-Up (95).

### Why it feels limited
1. `.slice(0, limit)` (`exercises.ts:4701`), all callers pass 8; no search, no filters, no "show more". "Show all" link only appears on zero results and is still capped.
2. Near-clones dominate (7 patterns × 13 muscles → everything scores 95–100).
3. `+10 grapplerFriendly` (`:4667`) applies to 203/204 — pure noise.
4. `RELATED_PATTERNS` treats push↔pull as related + any-muscle-overlap → rows ranked for Neck Extension, band row for Barbell Curl.
5. Equipment filter is binary; no "same implement / different implement" diversity.
6. **Custom exercises can't swap in or out** — only built-in `exercises` searched (not `getAllExercises()`); swapping from a custom returns 0 and shows a wrong "no equipment" message.
7. `isUnilateral` field ignored (guessed from name).
8. Exercises already in today's session not excluded.

### Swap behaviour bugs
- **`swapExercise` sets every set `completed:false`** (`store.ts:2220`) → swapping mid-exercise wipes done sets.
- In-workout swap: today only, **no undo**; program swap: one session only, no "rest of block", skips injury re-throttle.
- Swap reason never captured; `wantToSwap`/`jointPain` feedback produces `adjustmentType:'swap'` that nothing consumes → the generator never learns.

### Target design
Swap sheet = **search bar (whole library incl. custom, name + muscle) + equipment/pattern chips + grouped results**:
1. Closest match (same sub-pattern, ≥50% primary overlap)
2. Same muscle, different tool/angle
3. Available with today's gear · 4. Needs other equipment (greyed)
"Show more" per group, collapse near-duplicates (≤2 per name stem). After pick: reason chip (Busy / Pain / Preference / No equipment) + scope (Today / Rest of block) + undo toast. Pain routes through `getExerciseSubstitutions`. Log swaps → generator down-ranks swapped-out lifts.

Scoring sketch (fits current `Exercise` fields):
```ts
s  = 35*jaccard(primary) + 10*jaccard(primary+secondary)
   + (sameSubPattern ? 25 : samePattern ? 15 : 0)
   + (sameCategory ? 8 : 0) + (sameMeasurementType ? 4 : -15)
   + (6 - min(6, |strengthValue diff|))
   + (differentImplement ? 5 : 3)            // favour real variety
   - (injuryRiskySubPattern ? 40 : 0)
   + min(8, 2*timesLogged) + (favourite ? 6 : 0) - (recentlySwappedOut ? 20 : 0)
```
Delete the three dead implementations so there is exactly one ranking.

---

## Recommended build order

**Sprint 1 — stop corrupting data (small, store-level, each with a regression test)**
1. Live C4 throttle/log desync · C5 persist session position + throttle-once · C6 skip semantics
2. `swapExercise` keep completed sets + in-workout undo
3. Generator C1 (lock exercises per block) + C2 (incremental time trimming)

**Sprint 2 — swap that feels good**
4. Data fixes: sub-patterns, re-tag mis-labelled exercises, remove `grapplerFriendly` bonus, dedupe `towel-pull-up`, drop push↔pull relation
5. New swap sheet: search + grouped scored results + custom exercises + reason/scope + injury-aware
6. ID-validation vitest across all source files

**Sprint 3 — variety & templates**
7. Accessory/isolation slots for all goals, block-to-block rotation, combat slots (neck/grip/anti-rot/unilateral), greedy re-scoring
8. Unified data-driven `ProgramTemplate` schema; merge the two catalogs; fix PPL/Bodyweight/Emphasis templates; add 2-day, 30/45-min, KB/band-only, fight-camp-linked templates
9. Expand library (~40 exercises: sled, Cossack, BSS, SA rows, tib raise, hip airplane, jerk, med-ball throws, KB hinges, machine hinges, neck)

**Sprint 4 — live workout polish**
10. Split ActiveWorkout; isolate the 1s tick; debounce persistence
11. Wake Lock + SW rest alerts; ±30s + per-exercise rest defaults
12. Warm-up sets as real sets; delete/reorder; superset mode; notes; prev-performance column; half-step RPE; unit-aware history

---

# Part 2 — General UX: friction & bloat

**Method:** code-traced (not click-tested). Reachability computed by grepping every `OverlayView` id for an entry point (`onNavigate('x')`, tool registry, knowledge links) and every component for an importer.

## U1 — ~20 wired-but-unreachable features (Critical: dead weight) 
These are registered in `Dashboard.tsx` as overlays but **nothing opens them** (not in Tools grid, no button, no link):

| Feature | LOC | Verdict |
|---|---|---|
| CircuitBuilder | 1,345 | Kill (templates/conditioning cover it) |
| SplitAnalyzer | 1,298 | Kill (Volume & Balance covers it) |
| HRZoneTraining | 1,252 | Kill or fold into Cardio |
| PhotoProgress | 1,206 | Merge into Progress (useful) |
| BreathingProtocols | 928 | Merge into Recovery |
| FightersMind | 919 | Kill |
| OneRepMaxCalc | 740 | Merge: e1RM already inline; make it a sheet from exercise detail |
| CustomExerciseCreator | 656 | **Expose** — belongs in Exercise Library + swap search "Create X" |
| PlateCalculator | 621 | Kill (MiniPlateCalc already in rest overlay) |
| CommunityShare | 618 | Kill (share card exists post-workout) |
| ExerciseProfiler | 495 | Kill |
| RecoveryCoach / RecoveryHub | 492 | Kill (Recovery tool covers it) |
| TrainingLoadDashboard | 377 | Merge into Progress |
| WellnessXP dashboard + overlay | 241 | Kill |
| CornerCoachInfo / AutoThrottleInfo | 362 | Kill (explainers; inline a "why?" link instead) |
| GripStrengthModule, PeriodizationCalendar | 1,429 | Only reachable from Knowledge articles → merge or kill |

Plus **7 components never imported at all** (~2,400 LOC): `ProgressCharts` (1,092), `ExerciseDetail` (538), `WeeklyMomentum`, `InsightCard`, `DashboardInsights`, `StatusBar`, `CoachCue`.
**Total removable/mergeable: ~14–16k LOC** (~20% of the component layer), 58 overlay ids → ~25.

## U2 — "Was this useful?" feedback after closing tools (High)
`Dashboard.tsx:404` pops a 👍/👎 overlay when leaving any non-"routine" tool (once per session). It's product-analytics friction pushed onto the user. **Kill it**; use Vercel Analytics events instead.

## U3 — Finish-workout form is a questionnaire (High)
Finish → optional volume-gap interstitial (`ActiveWorkout.tsx:2874`) → modal with **6 inputs**: vs-expected, overall RPE slider, soreness, mood, enjoyed, notes (`~:4460-4600`) → celebration phase (share, fight card) → first time only: 8-slide NewUserGuide (`Dashboard.tsx:478`).
**Fix:** Finish = 1 tap saves with defaults (session RPE derived from set RPEs). Show one optional row: 😣 😐 🙂 💪 + "add note". Move volume-gap to the summary as a line, not a gate. Kill the 8-slide guide (or 3 contextual coach-marks the first time each surface is seen).

## U4 — Start-workout path: ~5 taps, target 2 (Medium)
Today → Start → **chooser sheet** (My plan / Smart pick / Custom) → overview + check-in (Great/Good/Okay/Rough + optional sleep/stress/soreness) → Start Workout → set 1.
**Fix:** the primary button starts the planned session directly; "Other options" is a secondary link. Check-in becomes a 1-row inline chip on the first exercise screen (default = "Good", or Whoop-derived), not a gate. Combined with the audit-part-1 bug fixes, the overview can be skipped entirely on resume.

## U5 — Today screen still stacks up to ~10 sections (Medium)
Order in `HomeTab.tsx:1816-2444`: hero readiness ring → critical alerts → skip banner → action card → OneThing banner → 2 feed cards → crew nudge → restrictions → nutrition strip → 2 inline insights → combat-load alert → tool dock. Good progress already (several duplicates removed), but the **hero ring sits above the action**.
**Target Today = 4 things:** (1) Today's session card with Start as the dominant button (readiness as a chip on it), (2) at most one contextual alert (merge alerts/skip/restrictions/combat-load/OneThing into a single priority-ranked slot), (3) nutrition strip, (4) tool dock. Crew nudge + insights → Progress.

## U6 — Tools tab: 21 tools, cut to ~12 (Medium)
Keep (core for a combat lifter): Programs, Builder, Cardio, Mat Sessions, Exercise Library, Fight Prep, Recovery, Nutrition, Strength, Setbacks, Wearable.
Merge: Sparring Load + Technique Log → Mat Sessions tabs; Camp Timeline → Fight Prep; Mobility → Recovery; Volume & Balance + Benchmarks + Coach Report → Progress tab; Knowledge → contextual "why?" links, not a tool.
Demote: Crews (social, behind profile); Cycle (only shown when enabled in settings).

## U7 — Readability & tap targets (Medium)
- **161 uses of 8–10px text** (`text-[10px]` ×127, `[9px]` ×28, `[8px]` ×6). Floor at 12px; anything mid-set ≥14px.
- **16 buttons at 24–32px** (e.g. check-in sleep ± `w-6 h-6`, `ActiveWorkout.tsx:~1548`). Minimum 44px.
- **49 files roll their own `fixed inset-0` modal, only 14 use a bottom sheet** → inconsistent close/back/swipe. Build one `<Sheet>` primitive (drag-to-dismiss, back-button closes, focus trap) and migrate.

## U8 — Interruption budget (Low–Medium)
Possible on app open: MorningRitual (weekly now — fine), VersionUpgradePopup, UpgradePrompt, NewUserGuide (full-screen takeover), tool-feedback, PR celebrations per set, confetti. No central arbiter, so they can stack.
**Fix:** a tiny `interruptionQueue` in the store — max 1 interruption per app open, never during an active workout except PR toast.

## Proposed structure
**Tabs (4):** Today · Train (plan, programs, library, mat sessions, fight prep) · Progress (strength, volume/balance, benchmarks, photos, history, reports) · Body (recovery incl. mobility/breathing, nutrition, setbacks, wearable). Settings + Crews under the avatar. The "Tools" tab disappears — its contents are distributed where users look for them; search stays as a global ⌘K-style sheet.

## UX build order
1. Delete unreachable + unimported code (U1) — zero user risk, ~15k LOC gone; kill tool-feedback popup (U2).
2. 1-tap finish + inline check-in + direct Start (U3, U4).
3. Today = 4 blocks with single priority alert slot (U5).
4. `<Sheet>` primitive + 12px/44px floors (U7); interruption queue (U8).
5. Re-home Tools into 4 tabs (U6).

---

## Corrections (verified during Phase 0 implementation)
- **M3 broken IDs was overstated.** Only `progress-analytics` (combat benchmarks) and `exercise-recommender` did exact lookups on missing ids. `injury-science` / `injury-prevention` match *fuzzily* by design — but that check found real safety gaps (`incline-press`, `bent-row`, `dips` matched nothing). `plyometric-engine` ids are its own library, not exercise ids. All fixed in v2.12.0.
- **U1:** RecoveryHub / RecoveryCoach are reachable via the Recovery tool (`recovery` overlay renders RecoveryHub). Only the `recovery_coach` / `recovery_hub` alias ids were dead. Kept.
- **U3:** the finish modal shows Session RPE + duration by default; the other questions sit behind "More details". Friction is lower than stated, but the "Got extra time?" volume-gap interstitial before it is real.
- **Observed live (E2E):** "NEW PR!" overlay fires on the very first set ever logged; RPE saved as 9.5 on an untouched set; set-count pill flips 0/2 ↔ 0/4 after a throttled check-in (C4); Esc doesn't close the swap sheet; the full-screen rest overlay blocks all navigation until "Skip Rest".
- **Also found:** `ai-coach-client.ts`, `nudge-engine.ts`, `monetization-engine.ts`, `db.ts` are documented as shipped but imported by nothing.


---

# Part 3 — State continuity ("leave and come back")

**Method:** code sweep for state that resets on unmount/reload (positions, sub-tabs, filters, typed drafts, index keys) + Playwright leave-and-return tests.

## Fixed (2026-09-25)
| Where | Was | Now |
|---|---|---|
| Live workout: moving between exercises | always set 1 (re-logging overwrote a done set) | first open set |
| Live workout: Pause & Browse / reload | overview again, exercise 1/set 1, throttle re-applied | position, overview state, throttle persisted |
| Rest timer | lost on pause/reload; `new Notification()` from page (throws on Android, frozen on iOS) | end time persisted (1 h TTL, cleared on start/finish/cancel); SW notifications; −15/+15 s |
| Main tab + open tool | reload/iOS resume → Today | restored (session storage) incl. tool context |
| Mat session form | always "No-Gi · moderate · 60 min"; typed techniques/notes lost on close | defaults from your last session; techniques/notes drafted 12 h |
| Sparring / technique / rehab notes | lost on close | drafted 12 h, cleared on log |
| Workout Builder (new) | half-built workout lost on close | drafted 24 h, cleared on save |
| Sub-tabs/filters (Nutrition, Injury, Mat Sessions, Journal, Nutrition trends) | reset every open | remembered |

Tests: `use-persistent-state.test.ts` (6), `e2e/continuity.spec.ts` (tab + tool + draft across reload), live e2e (set cursor, pause/resume, rest across pause).

## Remaining
- **170 list keys by array index** — harmless until delete/reorder ships; switch to stable set ids with Phase 6 (delete/reorder sets).
- Drafts not yet persisted: meal logging search (NutritionLogSheet), cycle/photo/benchmark notes, crew name.
- Scroll position inside long overlays (History, Knowledge) resets on close.
- RecoveryHub tab comes from the caller (`initialTab`) — can't remember the last tab without a prop change.
