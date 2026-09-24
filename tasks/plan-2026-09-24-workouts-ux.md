# Plan — Workouts, Swap, Live Workout & UX overhaul

**Source:** `tasks/audit-2026-09-24-workouts.md` (Part 1 = workouts/swap/live, Part 2 = UX).
**Shape:** 8 phases, 16 PRs, each shippable on its own as a semver release (v2.12 → v2.19).
**Rules for every PR:** regression test for every bug fixed · `npm test` + `tsc` + `npm run build` green · e2e for any flow touched · CHANGELOG entry · update `docs/map.md` / module CLAUDE.md when structure changes.
**Sizes:** S ≈ half day · M ≈ 1–2 days · L ≈ 3–5 days (focused sessions).

## Why this order
1. **Guardrails + delete dead code first** — less surface to refactor, tests catch regressions in everything after.
2. **Stop data corruption** before anything cosmetic — every day it ships, bad logs accumulate.
3. **Exercise data foundation** (sub-patterns, tags) is a prerequisite for *both* swap v2 and generator variety — do it once.
4. **Swap before generator** — smaller, user-visible fast, and swap history becomes an input to the generator.
5. **Live-workout split before live-workout features** — adding supersets/reorder into a 4.7k-line component is how the current bugs got there.
6. **UX shell last** — it re-homes screens that earlier phases will have merged/deleted.

---

## Phase 0 — Guardrails & demolition · v2.12.0

### PR 1 · Test harness (S)
- [ ] `src/__tests__/exercise-ids.test.ts`: scan all `src/**/*.ts(x)` for exercise-id literals + template refs → assert each exists in `exercises` (fails today: `progress-analytics`, `exercise-recommender`, `injury-science`, `injury-prevention`, `plyometric-engine`). Mark known failures `.todo` until PR 6.
- [ ] Assert no duplicate ids in `exercises` (fails today: `towel-pull-up`).
- [ ] `e2e/live-workout.spec.ts`: start → log 2 sets → swap → finish. Smoke baseline for Phases 1 & 6.
- [ ] Generator snapshot test: seeded RNG, 3 profiles → assert invariants (not exact output).
- **Prereq:** make `weightedShuffle` accept an injectable seeded RNG.

### PR 2 · Delete unreachable UI (M, ~15k LOC removed)
- [ ] Delete never-imported: `ProgressCharts`, `ExerciseDetail`, `WeeklyMomentum`, `InsightCard`, `DashboardInsights`, `StatusBar`, `CoachCue`.
- [ ] Delete unreachable overlays + their `OverlayView` ids: CircuitBuilder, SplitAnalyzer, FightersMind, PlateCalculator (MiniPlateCalc stays), CommunityShare, ExerciseProfiler, RecoveryCoach/RecoveryHub, WellnessXP dashboard+overlay, CornerCoachInfo, AutoThrottleInfo.
- [ ] **Park, don't delete** (move to `src/components/_parked/`, excluded from build) for later merge: PhotoProgress, BreathingProtocols, TrainingLoadDashboard, HRZoneTraining, GripStrengthModule, PeriodizationCalendar, OneRepMaxCalc.
- [ ] Kill the tool-close 👍/👎 feedback overlay (`Dashboard.tsx:~404`) → fire an analytics event instead.
- [ ] Remove orphaned store slices/lib fns only used by deleted UI (check with grep + tsc).
- **Accept:** build size reported before/after; 58 → ≤35 overlay ids; all tests green.

---

## Phase 1 — Stop data corruption · v2.12.x

### PR 3 · Live-workout state correctness (M)
- [ ] **C4** New store action `applyThrottleToActiveWorkout(result)` — rebuilds `exerciseLogs` from throttled list keyed by `exerciseId`, trims set counts. Remove `useAppStore.setState` from `ActiveWorkout.tsx:~889`.
- [ ] **C5** Persist in `activeWorkout`: `baseSession`, `currentExerciseIndex`, `currentSetIndex`, `overviewDone`, `restEndTime`, `throttleResult`. Throttle is always computed from `baseSession` (idempotent). Resume skips overview.
- [ ] **C6** Skip = `{ skipped: true, completed: false }`, no feedback write. `getPreviousSessionSets` + PR/e1RM lookups ignore skipped and zero sets.
- [ ] **Swap bug** `swapExercise`: keep completed sets, rewrite only pending ones; add in-workout undo toast (reuse program-swap undo pattern).
- [ ] Unit-aware history prefill + PR checks (use `log.weightUnit`); bodyweight fallback → kg (`store.ts:~101`).
- [ ] RPE: store `rpeSource: 'user' | 'prefill'`; regulator ignores prefill.
- [ ] Recovered → Discard gets a confirm; clear PR/tip timeouts on unmount.
- **Tests:** the 3 reproductions from the audit become permanent regression tests (throttle desync, double-throttle, skip→0×0), + swap-mid-exercise keeps sets.

### PR 4 · Generator & template correctness (M)
- [ ] **C1** Select exercises once per block (week 1), clone to weeks 2..N; only sets/reps/intensity progress.
- [ ] **C2** `fitSessionToTimeLimit`: drop one lowest-priority item at a time; guarantee ≥1 isolation per target muscle; refill up to budget.
- [ ] **C3 quick fixes:** pass template periodization through `handleStartProgram`; PPL `sessions: 3` → correct split mapping; "Bodyweight Only"/"Home Gym" set equipment; goal override scoped to the block (like `advanceMesocycleQueue`) + confirm sheet.
- [ ] Deload position configurable (not always last week in 8-wk blocks).
- **Tests:** invariants — same exercise ids across weeks of a block; isolation present at 60 min for hypertrophy; bodyweight template contains zero barbell exercises.

---

## Phase 2 — Exercise data foundation · v2.13.0

### PR 5 · Taxonomy & data cleanup (M)
- [ ] Add `subPattern` to `Exercise`: `h_push | v_push | h_pull | v_pull | squat | single_leg | hinge | carry | rotation | anti_rotation | anti_extension | explosive | isolation_<muscle> | grip | neck`.
- [ ] Re-tag all 204 (fix calf raise/leg ext/plank = push, leg curl/Nordic = pull, adductors = squat, hangs = carry). Script-assisted, human-reviewed table in the PR.
- [ ] Add `neck` muscle group; fill `isUnilateral` properly; drop `grapplerFriendly` (true on 203/204) or redefine it meaningfully.
- [ ] Dedupe `towel-pull-up` → rename second to `towel-pull-up-grip` + log migration (schema v5 → v6).
- [ ] Fix broken ids in 5 lib files via an alias map; un-`.todo` PR 1's tests.

### PR 6 · Library expansion (M)
- [ ] +~40 exercises: sled push/drag, Cossack, lateral lunge, Bulgarian split squat, SA cable/landmine/DB rows (seal row, chest-supported), tib raise, hip airplane, push jerk, trap-bar jump, med-ball scoop/shot-put/slam variants, KB swing/single-leg RDL/clean, machine hinges (back extension variants), neck (4-way, harness), Pallof variants, Copenhagen plank, band-only and KB-only options per pattern.
- [ ] Coverage test: every sub-pattern has ≥3 options for each equipment preset (full / home / travel).
- [ ] Conditioning templates reference library ids instead of free text.

---

## Phase 3 — Swap v2 · v2.14.0

### PR 7 · One swap engine (M)
- [ ] `src/lib/swap-engine.ts`: scored similarity (sub-pattern, primary/secondary Jaccard, category, measurement type, loadability, implement diversity, injury contraindication, history, favourites, recently-swapped-out penalty). Groups: Closest / Same muscle, other tool / Available today / Needs other gear.
- [ ] Searches `getAllExercises()` (custom included), excludes exercises already in session, collapses near-duplicates (≤2 per name stem).
- [ ] Delete `getAlternativesForExercise`, `findAlternatives`, hardcoded `exercise-recommender` list; route pain through `getExerciseSubstitutions` logic inside the engine.
- **Tests:** Pull-Up → Chin-Up/Lat Pulldown rank above rows; Back Squat top 5 contains ≥2 different implements; every exercise returns ≥8 candidates on Travel profile or shows search; custom exercise swaps both ways.

### PR 8 · Swap sheet UI + learning (M)
- [ ] Shared `<SwapSheet>` used by ActiveWorkout (in-set + overview) and ProgramExerciseCard: search bar, equipment/pattern chips, grouped results with "show more", last-performance per candidate, "Create custom exercise" row when search misses (exposes CustomExerciseCreator).
- [ ] After pick: reason chips (Busy / Pain / Preference / No equipment) + scope (Today / Rest of block). Undo toast.
- [ ] Persist `swapHistory`; generator + engine down-rank swapped-out lifts; "Pain" feeds injury log prompt.

---

## Phase 4 — Generator variety · v2.15.0

### PR 9 · Slot-based session builder (L)
- [ ] Day roles define slots by sub-pattern (e.g. Upper: h_push, v_pull, h_pull, v_push, 2× isolation, core). Max 1 per sub-pattern per session.
- [ ] Accessory/isolation slots for every goal (strength & power get fewer, not zero). Remove muscle-count bonus. Greedy pick with re-scoring (fixes isolation stacking).
- [ ] Combat slots every day regardless of split: neck, grip, anti-rotation, unilateral (rotating). Combat splits available at 3 days/week.
- [ ] Block-to-block rotation: penalise ids used in last 1–2 blocks (keep main lifts if user pins them).
- [ ] User preferences: favourites / "never" list / pinned main lifts (settings + from swap history). Injuries applied at generation time.
- **Accept (sim harness from audit, committed as a test script):** ≥60% of library reachable across profiles; row share of compound pulls ≥35% on U/L; neck ≥1×/week for combat profiles; 0 sessions with >1 exercise per sub-pattern.

---

## Phase 5 — Templates · v2.16.0

### PR 10 · Data-driven ProgramTemplate (L)
- [ ] Schema: split, day roles/slots, pinned lifts, equipment preset, muscle emphasis, periodization, weeks, session length, goal.
- [ ] Generator consumes it; merge `SessionTemplates.PROGRAM_TEMPLATES` + `WorkoutBuilder.MESOCYCLE_TEMPLATES` into one catalog (`src/lib/program-templates.ts`), dedupe to real distinct programs.
- [ ] Deterministic preview (seeded) — what you preview is what you start.
- [ ] One browse UI (ProgramBrowser) with filters: days, minutes, equipment, goal. SessionTemplates 6 tabs → gone.
- [ ] New templates: 2-day combat maintenance, 30/45-min versions, KB-only, band-only, strength-endurance, fight camp linked to competition date (`fight-camp-engine`).

---

## Phase 6 — Live workout rebuild · v2.17.0

### PR 11 · Split ActiveWorkout (L, no behaviour change)
- [ ] `live/` folder: `Overview`, `SetLogger`, `RestOverlay`, `FinishSheet`, `SwapSheet` (from PR 8), `useLiveSession` hook reading the store slice from PR 3.
- [ ] 1-second tick isolated in `<Elapsed/>` / `<RestCountdown/>`; memoise Whoop readiness; fix hooks-after-early-return.
- [ ] Debounce localStorage persistence except on set complete / finish.
- **Accept:** e2e from PR 1 passes unchanged; React profiler shows no full-tree re-render per second.

### PR 12 · Rest timer that works on a locked phone (M)
- [ ] Wake Lock during session (with toggle); alerts via service worker `showNotification`; `restEndTime` persisted; vibration where supported.
- [ ] ±30s buttons; per-exercise rest defaults (compound vs isolation, user override remembered).

### PR 13 · Logging power features (L)
- [ ] Real warm-up sets on first compound (from warmup-generator), marked `type: 'warmup'`, excluded from volume.
- [ ] Delete set / add set / remove exercise / reorder (drag), all with undo; stable set ids as keys.
- [ ] Superset/circuit mode (A1/A2 flow, shared rest); set types: drop, failure.
- [ ] Per-set + per-exercise notes; previous-performance column; half-step RPE picker; "−" quick-adjust buttons; PR celebrate only on session-best improvement.
- [ ] iOS input: commit `BufferedNumberInput` on change / read DOM value on Complete.

### PR 14 · 1-tap start & finish (S–M)
- [ ] Finish = 1 tap save with defaults (session RPE derived from sets). One optional row: 😣 😐 🙂 💪 + note. Volume gaps shown in summary, not a gate.
- [ ] Start from Today card goes straight into planned session; chooser demoted to "Other options". Check-in = inline chip on first exercise (default from wearable or "Good").
- [ ] Replace 8-slide NewUserGuide with 3 contextual coach-marks.
- **Accept:** open → first set logged ≤ 2 taps; finish → home ≤ 2 taps (e2e asserts counts).

---

## Phase 7 — UX shell · v2.18.0 → v2.19.0

### PR 15 · Primitives & interruptions (M)
- [ ] `<Sheet>` primitive (drag-dismiss, back button closes, focus trap); migrate the 49 `fixed inset-0` modals progressively (lint rule to block new ones).
- [ ] Type floor 12px (≥14px in live workout); tap targets ≥44px. Codemod `text-[8|9|10px]`, fix 16 tiny buttons.
- [ ] `interruptionQueue` in store: max 1 interruption per app open; none during active workout except PR toast.

### PR 16 · Today + tab restructure (L)
- [ ] Today = 4 blocks: session card (dominant Start, readiness chip) · single priority alert slot (merges alerts/skip/restrictions/combat-load/OneThing) · nutrition strip · tool dock.
- [ ] Tabs: **Today · Train · Progress · Body**; Tools tab removed, its tools re-homed (Train: programs, builder, library, mat sessions+sparring+technique, fight prep+camp timeline, cardio · Progress: strength, volume/balance, benchmarks, photos, training load, reports · Body: recovery+mobility+breathing, nutrition, setbacks, wearable, cycle). Crews + settings under avatar. Global search sheet.
- [ ] Un-park and merge the Phase 0 parked components into their new homes (or delete if unused after 2 releases).

---

## Decisions I've defaulted (change before starting a phase)
| Decision | Default | Alternative |
|---|---|---|
| HR Zones, Grip module, Periodization calendar | Park, then merge into Cardio / Progress | Delete outright |
| Fighter's Mind, Circuit Builder, Split Analyzer | Delete | Park |
| Swap scope default | "Today" | "Rest of block" |
| Tools tab | Remove, re-home | Keep as "More" |
| Check-in before workout | Inline, optional | Keep as gate |
| Exercise lock per block | Locked, user can pin/unpin | Per-week rotation opt-in |

## Tracking
| Phase | PRs | Version | Status |
|---|---|---|---|
| 0 Guardrails & demolition | 1–2 | 2.12.0 | ✅ (branch `phase0/guardrails-demolition`) |
| 1 Data corruption | 3–4 | 2.12.x | ☐ |
| 2 Exercise data | 5–6 | 2.13.0 | ☐ |
| 3 Swap v2 | 7–8 | 2.14.0 | ☐ |
| 4 Generator variety | 9 | 2.15.0 | ☐ |
| 5 Templates | 10 | 2.16.0 | ☐ |
| 6 Live workout | 11–14 | 2.17.0 | ☐ |
| 7 UX shell | 15–16 | 2.18–2.19 | ☐ |

Rough total: ~6–8 focused weeks. Phases 0–1 (~1 week) remove every known data-corruption bug.
