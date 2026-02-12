# Implementation Plan: Program & Progress UX Overhaul

3 phases. 19 changes. Every one mapped to exact files, lines, and components.

---

## PHASE 1: Quick Wins

Ship these in 1-2 sessions. Each is a contained change in 1-2 files. No new dependencies. No store refactors. Maximum impact per line of code changed.

---

### 1.1 — Mesocycle Progress Ring

**Priority:** P0 — The single highest-impact, lowest-effort change available.

**Problem:** Users open the Program tab and have zero sense of where they are in the block. The header just shows "Hypertrophy Block — 5 weeks, 3 sessions/week, hypertrophy focus" as flat text.

**File:** `src/components/WorkoutView.tsx`

**Where:** Lines 239-273 (the header section between `return` and `{/* Program Settings Panel */}`)

**What exists now:**
```tsx
// Line 241-246
<div>
  <h2 className="text-xl font-bold text-grappler-50">{currentMesocycle.name}</h2>
  <p className="text-sm text-grappler-400">
    {currentMesocycle.weeks.length} weeks • {currentMesocycle.weeks[0]?.sessions?.length || 0} sessions/week • {currentMesocycle.goalFocus} focus
  </p>
</div>
```

**What to build:**
- Calculate `totalSessions` = sum of `week.sessions.length` across all weeks
- Calculate `completedCount` = `completedSessionIds.size` (already computed at line 45-51)
- Calculate `percentage` = `Math.round((completedCount / totalSessions) * 100)`
- Render an SVG progress ring (60x60px) next to the header text
- Ring uses `stroke-dasharray` + `stroke-dashoffset` for the arc
- Percentage number centered inside the ring
- Color: green at 100%, primary at >50%, yellow at <50%
- Below the ring: `{completedCount}/{totalSessions} sessions`

**Data already available:**
- `completedSessionIds` (line 45-51) — Set of completed session IDs
- `currentMesocycle.weeks` — array of weeks, each with `.sessions` array

**Implementation detail:**
- Create a `ProgressRing` inline function component (no new file needed, it's ~30 lines of SVG)
- Insert between line 240 (`<div className="flex items-center justify-between">`) and the existing `<div>` with the title
- Wrap title + ring in a flex container with `gap-4`

**Estimated lines of code:** ~40

---

### 1.2 — "Next Up" Hero Card

**Priority:** P0 — Answers the #1 question: "What's my next workout?"

**Problem:** Users must expand week accordions and scan sessions to find their next unfinished workout. On a 5-week block, that's digging through up to 20 items.

**File:** `src/components/WorkoutView.tsx`

**Where:** Insert between line 403 (end of periodization info card) and line 405 (`{/* Weeks */}`)

**What to build:**
- New `NextUpCard` component (inline, not a new file)
- Logic: iterate `currentMesocycle.weeks` in order, find the first session where `!completedSessionIds.has(session.id)`
- If found, render a prominent card:
  - Session type badge (Strength/Hypertrophy/Power) with matching gradient background
  - Session name as title
  - Exercise list (names only, compact)
  - Estimated duration
  - Large "Start Workout" button (full-width, primary color)
  - Subtle text: "Week {n}, Session {m}" for context
- If all sessions completed: show "Block Complete" celebration card with CTA to generate next block

**Data flow:**
- `completedSessionIds` already exists (line 45-51)
- `currentMesocycle.weeks[].sessions[]` has all session data
- `startWorkout` function available (line 42)
- Session type icon/color functions exist (lines 221-235)

**Implementation detail:**
- The existing accordion (`WeekCard` at line 407) stays but becomes secondary — collapsed by default
- Add a toggle: "View Full Program" text button that expands the accordion view
- Default: only show `NextUpCard` + collapsed week overview

**Estimated lines of code:** ~80

---

### 1.3 — Reorder Progress Tab: Weekly Challenge + Streak First

**Priority:** P0 — Engagement hooks are buried below charts nobody scrolls to.

**Problem:** `WeeklyChallengeCard`, `E1rmTrendsCard`, `BodyRecompCard`, and `StreakHeatmap` all render AFTER `ProgressCharts` (which is already a long component with 5 chart tabs). Most users never scroll down to see them.

**File:** `src/components/ProgressTab.tsx`

**Where:** Lines 631-648 (the `{view === 'charts' && (...)}` block)

**Current order (line 631-648):**
```tsx
{view === 'charts' && (
  <div className="space-y-4">
    <ProgressCharts onViewReport={onViewReport} />           // Line 633
    <div className="pt-2">                                     // Line 636
      <h3>Insights & Trends</h3>                              // Line 637
      <WeeklyChallengeCard ... />                              // Line 642
      <E1rmTrendsCard ... />                                   // Line 643
      <BodyRecompCard ... />                                   // Line 644
      <StreakHeatmap ... />                                     // Line 645
    </div>
  </div>
)}
```

**New order:**
```tsx
{view === 'charts' && (
  <div className="space-y-4">
    <WeeklyChallengeCard gamificationStats={gamificationStats} />
    <StreakHeatmap workoutLogs={workoutLogs} />
    <E1rmTrendsCard workoutLogs={workoutLogs} weightUnit={weightUnit} />
    <BodyRecompCard workoutLogs={workoutLogs} bodyWeightLog={bodyWeightLog} weightUnit={weightUnit} />
    <ProgressCharts onViewReport={onViewReport} />
  </div>
)}
```

**Why this order:**
1. Weekly Challenge — active engagement loop, users want to check goal progress
2. Streak Heatmap — visual dopamine, shows consistency at a glance
3. E1RM Trends — top lifts trending up/down, quick emotional read
4. Body Recomp — weight + volume correlation
5. Charts — deep dive for users who want detail

**Also:** Remove the `<h3>Insights & Trends</h3>` header — it adds nothing. The cards are self-explanatory.

**Estimated lines of code:** ~5 lines changed (reorder only)

---

### 1.4 — Exercise Swap Undo Toast

**Priority:** P1 — Safety net for accidental program changes.

**Files:**
- `src/components/WorkoutView.tsx` (lines 174-181, swap handler)
- `src/lib/store.ts` (lines 1449-1480, `swapProgramExercise` action)

**What exists now (WorkoutView.tsx:174-181):**
```tsx
const handleSwapExercise = (weekIndex, sessionId, exerciseIndex, newExerciseId) => {
  swapProgramExercise(weekIndex, sessionId, exerciseIndex, newExerciseId);
  if (!programModified) {
    setProgramModified(true);
    setTimeout(() => setShowSaveTemplateBanner(true), 500);
  }
};
```

**What to build:**

**Step 1 — Store (store.ts):** Add `lastSwap` state to track the previous exercise:
- Before replacing the exercise in `swapProgramExercise`, capture the old `exerciseId`
- Store it as `lastSwap: { weekIndex, sessionId, exerciseIndex, oldExerciseId, newExerciseId } | null`
- Add `undoSwap()` action that uses `lastSwap` to call `swapProgramExercise(weekIndex, sessionId, exerciseIndex, oldExerciseId)` and then sets `lastSwap` to null

**Step 2 — UI (WorkoutView.tsx):** Add undo toast:
- After a swap, show a fixed-bottom toast with: "Swapped to {newExerciseName}. Undo?" + undo button
- 5-second auto-dismiss with `setTimeout`
- Undo button calls `undoSwap()` from store
- Use `AnimatePresence` for slide-up/fade animation (already imported)

**Step 3 — Remove auto-template-save prompt:**
- Remove the `setTimeout(() => setShowSaveTemplateBanner(true), 500)` from `handleSwapExercise`
- Template save should be an explicit action, not an auto-prompt on every swap

**Estimated lines of code:** ~50 (20 store, 30 component)

---

### 1.5 — Rename Progress Sub-Tabs

**Priority:** P1 — Quick clarity improvement.

**File:** `src/components/ProgressTab.tsx`

**Where:** Lines 529-533 (tab array definition)

**Current:**
```tsx
{ id: 'charts', label: 'Progress' },
{ id: 'log', label: 'Workouts' },
{ id: 'calendar', label: 'Calendar' },
{ id: 'weight', label: 'Body Weight' },
```

**New:**
```tsx
{ id: 'charts', label: 'Overview' },
{ id: 'log', label: 'History' },
{ id: 'calendar', label: 'Calendar' },
{ id: 'weight', label: 'Body' },
```

**Also:** Move the Export/Import button (line 549-556) into an overflow "..." menu. Currently it's at the same visual level as content tabs, which is wrong. Create a small `MoreMenu` dropdown with Export CSV, Export JSON, Export Backup, Import Backup options — the same options currently in the expanded panel (lines 587-627), just behind a `...` icon instead of a download icon at tab level.

**Estimated lines of code:** ~10 (rename) + ~30 (overflow menu refactor)

---

### 1.6 — Dismissible Periodization Info Card

**Priority:** P2 — Quick viewport space reclaim.

**File:** `src/components/WorkoutView.tsx`

**Where:** Lines 390-403 (the static info card)

**What to build:**
- Add `showPeriodizationInfo` state, defaulting to `true`
- Check `localStorage.getItem('dismissedPeriodizationInfo')` on mount
- Add an `X` close button to the card
- On dismiss: set state to false + `localStorage.setItem('dismissedPeriodizationInfo', 'true')`
- Replace with a dynamic "This Week's Focus" card:
  - Determine current week index (find week with incomplete sessions)
  - Show: "Week {n}: {type} Focus — {one-line description based on session types this week}"
  - This card changes as users progress, making it always relevant

**Estimated lines of code:** ~25

---

### 1.7 — Lazy-Load Chart Data Computation

**Priority:** P2 — Performance.

**File:** `src/components/ProgressCharts.tsx`

**Current state:** Charts already use conditional rendering (`{activeView === 'strength' && (...)}`), so only one chart DOM renders at a time. But the `useMemo` computations for ALL chart data (`strengthData`, `volumeData`, `muscleDistribution`, `recoveryTrend`) run on every render regardless of which tab is active (lines 52-183).

**What to build:**
- Wrap each data computation in a check: only compute if `activeView` matches
- Or split into separate `useMemo` hooks with `activeView` in the dependency array
- For the non-active tabs, return empty/cached data
- This prevents recomputing strength progression data when the user is looking at the distribution pie chart

**Alternative approach:** Use `React.lazy` + `Suspense` for each chart section as a separate micro-component. This defers both the computation and the Recharts bundle per chart.

**Estimated lines of code:** ~20 (conditional memos) or ~40 (lazy split)

---

## PHASE 1 SUMMARY

| # | Change | File(s) | Lines Changed | Risk |
|---|--------|---------|---------------|------|
| 1.1 | Progress Ring | WorkoutView.tsx | ~40 new | None |
| 1.2 | Next Up Card | WorkoutView.tsx | ~80 new | Low — additive |
| 1.3 | Reorder Progress | ProgressTab.tsx | ~5 changed | None |
| 1.4 | Swap Undo Toast | WorkoutView.tsx + store.ts | ~50 new | Low — store addition |
| 1.5 | Rename Tabs | ProgressTab.tsx | ~40 changed | None |
| 1.6 | Dismissible Info | WorkoutView.tsx | ~25 changed | None |
| 1.7 | Lazy Chart Data | ProgressCharts.tsx | ~20 changed | Low |

**Total Phase 1:** ~260 lines. Zero new files. Zero new dependencies. All backward-compatible.

---

## PHASE 2: Medium Effort, High Impact

Each of these touches 2-3 files and may require new components. Ship in 2-4 sessions.

---

### 2.1 — Scrollable Insight Cards (Replace Chart Tab Default)

**Priority:** P0 for Phase 2

**Problem:** The 5-tab chart system is passive data. Users see squiggly lines with no interpretation, no calls to action.

**Files:**
- `src/components/ProgressCharts.tsx` (major refactor of lines 319-682)
- New: `src/components/InsightCard.tsx` (small, reusable card component)

**What to build:**

A new `InsightFeed` component that replaces the chart tabs as the default view. Each card is a mini-insight with a sparkline and context:

**Card types to implement:**

1. **Strength Trend Card** — For each of the top 3 exercises by frequency:
   - Title: "{Exercise} estimated 1RM"
   - Sparkline: last 6 data points from `strengthData[exerciseName]`
   - Delta: "+12 lbs (+8%) this month"
   - Color: green if up, red if down, gray if flat
   - CTA: "View Details" → expands full strength chart inline

2. **Volume Trend Card** — Weekly volume comparison:
   - Title: "Weekly Volume"
   - Mini bar chart: last 4 weeks
   - Delta: "Up 18% from last week" or "Down 12% — deload week?"
   - Data source: `volumeData` (already computed, lines 108-137)

3. **Muscle Balance Card** — Distribution alert:
   - Only shown if imbalance detected (e.g., chest sets > 2x back sets)
   - Title: "Muscle Balance"
   - Mini horizontal bars showing top 4 muscle groups
   - Message: "You're hitting chest 2x more than back — consider adding rows"
   - Data source: `muscleDistribution` (already computed, lines 140-167)

4. **Frequency Card** — Sessions this week:
   - Title: "Training Frequency"
   - Dot grid showing this week (filled dots = workout days)
   - Comparison: "4 sessions this week, up from 3 last week"

5. **Recovery Card** (only if Whoop connected):
   - Title: "Recovery Trend"
   - Sparkline: last 7 days recovery %
   - Message: from existing `insights` logic (lines 224-283)

**Implementation approach:**
- Keep the existing chart tabs accessible via a "See All Charts" link at the bottom of the insight feed
- Each insight card is ~40-60 lines (SVG sparkline + text + CTA)
- Sparklines: pure SVG `<polyline>`, no Recharts dependency. 6-8 data points, 80x30px.

**Estimated lines of code:** ~300 new (InsightCard component + InsightFeed integration)

---

### 2.2 — Current Block Performance Section

**Priority:** P0 for Phase 2

**Problem:** Progress tab has no awareness of the active mesocycle. It shows global stats but never answers "How am I doing in THIS block?"

**Files:**
- `src/components/ProgressTab.tsx` (add new section in the `charts` view)
- `src/components/BlockPerformance.tsx` (new component, ~150 lines)

**What to build:**

A `BlockPerformance` card at the top of the Progress Overview tab showing:

1. **Block progress bar** — `{completed}/{total} sessions` with percentage
2. **Volume this block vs last block** — Compare `workoutLogs.filter(l => l.mesocycleId === currentMesocycle.id)` total volume against `mesocycleHistory[last].id` logs
3. **Average RPE this block** — Mean of all `workoutLogs[].averageRPE` for current block
4. **PRs this block** — Count of personal records within this mesocycle's logs
5. **Pace indicator** — "On Track" / "Behind" / "Ahead" badge based on:
   - Expected completion: `(weeksElapsed / totalWeeks) * totalSessions`
   - Actual: `completedCount`
   - Ahead if actual > expected, Behind if actual < expected - 1

**Data sources (all available):**
- `currentMesocycle` — from store (has `.id`, `.weeks`, `.startDate`)
- `workoutLogs.filter(l => l.mesocycleId === currentMesocycle.id)` — this block's logs
- `mesocycleHistory` — for block-over-block comparison
- `gamificationStats.personalRecords` — need to scope to current block (may need to count PRs from logs directly)

**Where to render:** In `ProgressTab.tsx`, inside the `{view === 'charts' && (...)}` block, ABOVE `WeeklyChallengeCard` (after Phase 1 reorder). This becomes the first thing users see.

**Estimated lines of code:** ~150

---

### 2.3 — Per-Exercise Mini-Trends in Program Preview

**Priority:** P1 for Phase 2

**Problem:** Users have to start a workout to see their last performance on an exercise. The program preview shows prescriptions but not history.

**File:** `src/components/WorkoutView.tsx`

**Where:** `ExerciseCard` component (lines 817-930)

**What exists now (lines 841-876):**
The card shows exercise name, sets x reps @ RPE, rest time, and %1RM. It has `getAltHistory()` (lines 827-839) that fetches the last performance for an exercise — but this is only used for alternatives, not for the main exercise.

**What to build:**

Below the prescription line (`{ex.sets} x {ex.prescription.targetReps} reps @ RPE {ex.prescription.rpe}`), add a "Last time" line:

```tsx
const lastPerf = getAltHistory(ex.exerciseId);
// ...
{lastPerf && (
  <p className="text-xs text-grappler-500 mt-0.5">
    Last: {lastPerf.weight}{weightUnit} x {lastPerf.reps} • {formatRelativeDate(lastPerf.date)}
  </p>
)}
```

**Enhancement:** Add a suggested weight based on the same logic used in `ActiveWorkout`:
- If last RPE < 7: suggest +10lbs
- If last RPE 7-8: suggest +5lbs
- If last RPE 9+: suggest same weight

This turns the program preview from "what's prescribed" to "what you should lift" — actionable before the user even starts.

**Estimated lines of code:** ~20

---

### 2.4 — Upgrade Gamification Visibility in Header

**Priority:** P1 for Phase 2

**Problem:** Gamification elements are scattered. The header in Dashboard.tsx (lines 400-446) already shows level, streak, and points — but it's minimal and doesn't feel like a progression system.

**File:** `src/components/Dashboard.tsx`

**Where:** Lines 400-446 (header section)

**What to build:**

Enhance the existing header elements:

1. **XP progress bar** — Currently a 12px-wide bar (line ~420). Make it wider (full header width), with level-up animation when XP crosses a threshold. Show "247 / 500 XP to Level 8" on tap.

2. **Streak fire animation** — Currently a static `<Flame>` icon (line ~430). Add a subtle pulse animation when streak >= 3. Show "Personal best!" badge when current streak approaches longest streak.

3. **Weekly Challenge mini-indicator** — Add a small "2/3" badge next to the streak or as a separate pip showing weekly challenge progress without needing to navigate to Progress tab.

**Also:** Create a `BadgeShowcase` component accessible from the profile/settings area:
- Grid of all possible badges (from `src/lib/gamification.ts`)
- Earned badges in full color with earn date
- Locked badges as silhouettes with "Do X to unlock" tooltips
- This doesn't need to be in the header — it's a profile-level feature

**Estimated lines of code:** ~60 (header enhancement) + ~120 (BadgeShowcase)

---

### 2.5 — Guided Program Generation (3-Step Flow)

**Priority:** P1 for Phase 2

**Problem:** Empty state (WorkoutView.tsx:188-219) shows two confusing buttons. "Customize & Generate" opens `MuscleEmphasisPicker` which is a power-user settings panel, not a guided onboarding flow.

**File:** `src/components/WorkoutView.tsx`

**Where:** Lines 188-219 (the `if (!currentMesocycle)` block)

**What to build:**

Replace the empty state with a `ProgramWizard` component (inline or new file):

**Step 1 — Goal Selection:**
- 3 large tappable cards:
  - "Get Stronger" (strength icon, "Low reps, heavy weights, compound lifts")
  - "Build Muscle" (muscle icon, "Higher reps, moderate weights, volume focus")
  - "Both" (balanced icon, "Undulating periodization — best of both")
- Maps to existing `goalFocus` type: `'strength' | 'hypertrophy' | 'balanced'`

**Step 2 — Schedule:**
- Visual day picker: 7 circles (M T W T F S S)
- User taps to select training days (2-6)
- Shows: "3 days selected — Full Body recommended" or "5 days — Push/Pull/Legs recommended"
- Maps to existing `sessionsPerWeek` type

**Step 3 — Priorities (optional):**
- Simplified version of `MuscleEmphasisPicker`
- Body silhouette with tappable muscle groups
- Or simple toggle cards: "Upper Body Focus", "Lower Body Focus", "Balanced"
- "Skip" button for users who don't care
- Maps to existing `muscleEmphasis` config

**Step 4 — Preview + Confirm:**
- Show Week 1 preview (session names, exercise counts, estimated duration)
- "Generate Program" button
- "Adjust" link back to previous steps

**The existing `MuscleEmphasisPicker` (lines 632-750+) stays as an advanced option accessible from program settings, not the primary flow.**

**Estimated lines of code:** ~200

---

### 2.6 — Workout History Edit Affordances

**Priority:** P2 for Phase 2

**Problem:** WorkoutHistory has powerful inline editing but zero visual affordance. Users don't know they can tap to expand, or that "Edit Workout" exists.

**File:** `src/components/WorkoutHistory.tsx`

**Where:** Lines 560-925 (workout card rendering)

**What to build:**

1. **Pencil icon on each card header** (line ~580):
   - Small `<Pencil>` icon in the card's top-right corner
   - Opacity 40%, hoverable to 100%
   - Tapping it expands the card AND enters edit mode directly

2. **First-visit tooltip:**
   - Check `localStorage.getItem('historyEditTooltipSeen')`
   - If not seen, show a floating tooltip on the first workout card: "Tap any workout to view details and make edits"
   - Dismiss on tap + set localStorage flag

3. **Swipe-to-reveal actions (stretch goal):**
   - On mobile: left-swipe reveals Edit, Duplicate, Delete buttons
   - Uses CSS `transform` + touch events (or a library like `react-swipeable`)
   - This is lower priority — the icon + tooltip solve 80% of discoverability

**Estimated lines of code:** ~60

---

## PHASE 2 SUMMARY

| # | Change | File(s) | Lines | Risk |
|---|--------|---------|-------|------|
| 2.1 | Insight Cards | ProgressCharts.tsx + new InsightCard.tsx | ~300 | Medium — rethinks chart UX |
| 2.2 | Block Performance | ProgressTab.tsx + new BlockPerformance.tsx | ~150 | Low — additive |
| 2.3 | Exercise Mini-Trends | WorkoutView.tsx (ExerciseCard) | ~20 | None |
| 2.4 | Gamification Header | Dashboard.tsx + new BadgeShowcase.tsx | ~180 | Low |
| 2.5 | Program Wizard | WorkoutView.tsx + inline ProgramWizard | ~200 | Medium — replaces empty state |
| 2.6 | History Edit UX | WorkoutHistory.tsx | ~60 | None |

**Total Phase 2:** ~910 lines. 2 new small components. No new dependencies.

---

## PHASE 3: Bigger Bets

These are architectural additions that create new experiences. Ship over 3-6 sessions.

---

### 3.1 — Training Timeline (Block-over-Block Visualization)

**Priority:** P0 for Phase 3

**Problem:** Users who've completed 2+ mesocycles can't see their long-term arc. Mesocycle history is a list of cards at the bottom of ProgressCharts.

**Files:**
- New: `src/components/TrainingTimeline.tsx` (~250 lines)
- `src/components/ProgressTab.tsx` (add new sub-tab)

**What to build:**

A horizontal timeline visualization:
- X-axis: time (weeks/months)
- Segments: each mesocycle as a colored block (color by goalFocus)
- Overlay line: total volume trend across all blocks
- Overlay dots: PR events
- Tappable segments: opens `MesocycleReport` for that block

**Block-over-block comparison table:**
- Auto-compare latest block vs previous
- Columns: Volume, Avg RPE, Sessions Completed, PRs, Duration
- Delta indicators: +/-% for each metric

**Integration:**
- Add "Journey" as a 5th sub-tab in ProgressTab.tsx (after "Body")
- Only show if `mesocycleHistory.length >= 1`

**Estimated lines of code:** ~250

---

### 3.2 — Composite Performance Score

**Priority:** P0 for Phase 3

**Problem:** The Progress tab has no single answer to "Am I getting better?" Users see charts, stats, insights — but no synthesized verdict.

**Files:**
- New: `src/lib/performance-score.ts` (~100 lines)
- `src/components/ProgressTab.tsx` or `src/components/ProgressCharts.tsx` (render the score)

**What to build:**

A `calculatePerformanceScore()` function that returns 0-100:

**Inputs (weighted):**
- Consistency (30%): sessions completed vs planned this block, streak status
- Strength Progress (25%): average 1RM trend across top exercises (up = good)
- Volume Progression (20%): week-over-week volume trend (positive = good, but not too aggressive)
- Recovery (15%): average post-workout RPE and soreness (lower = better recovered)
- Engagement (10%): challenge completion, logging completeness

**Output:**
- Score: 0-100
- Grade: A+ (90-100), A (80-89), B+ (70-79), B (60-69), C (50-59), D (<50)
- Trend: up/down/stable vs last week
- One-line summary: "Strong consistency and volume progression. Strength gains slightly stalled — consider increasing intensity."

**UI:**
- Large circular score display (similar to Whoop's recovery score)
- Color gradient: green (80+), primary (60-79), yellow (40-59), red (<40)
- Rendered at the very top of Progress Overview, before everything else
- Tappable to expand score breakdown showing each component

**Estimated lines of code:** ~100 (logic) + ~80 (UI)

---

### 3.3 — Phase-Aware Body Recomp

**Priority:** P1 for Phase 3

**Problem:** The `BodyRecompCard` (ProgressTab.tsx:113-181) gives the same interpretation regardless of whether the user is cutting, bulking, or maintaining.

**Files:**
- `src/lib/types.ts` (add `trainingPhase` to User type)
- `src/lib/store.ts` (add `setTrainingPhase` action)
- `src/components/ProgressTab.tsx` (update `BodyRecompCard`)

**What to build:**

1. **Add `trainingPhase` to User type:** `'cut' | 'bulk' | 'maintain' | 'recomp' | null`
2. **Phase selector in BodyRecompCard:** Small toggle strip at top of card
3. **Phase-aware interpretation (replace lines 170-177):**
   - Cut: Weight down + volume stable = "Perfect cut — preserving strength while losing weight"
   - Cut: Weight down + volume down = "Watch your volume — strength loss during a cut is normal but minimize it"
   - Bulk: Weight up + volume up = "Clean bulk — weight and strength both climbing"
   - Bulk: Weight up + volume flat = "Weight gain without strength gains — check nutrition quality"
   - Maintain: Weight stable + volume up = "Recomping nicely — getting stronger at the same weight"
4. **Longer trendline:** Extend from 4 weeks to 8 weeks. Show a mini line chart of body weight with a 4-week moving average.

**Estimated lines of code:** ~80

---

### 3.4 — Badge Showcase with Locked Silhouettes

**Priority:** P2 for Phase 3

**Files:**
- New: `src/components/BadgeShowcase.tsx` (~200 lines)
- `src/lib/gamification.ts` (reference for badge definitions)
- `src/components/Dashboard.tsx` (add route to showcase)

**What to build:**

A full-screen overlay (similar to `ProgressiveOverload` pattern — rendered in Dashboard as an overlay view):

1. **Badge grid:** 4 columns on mobile, each badge as a 60x60 card
2. **Earned badges:** Full color icon + name + earn date
3. **Locked badges:** Grayscale silhouette + "???" name + "Bench your bodyweight to unlock" requirement text
4. **Categories:** Strength, Consistency, Volume, Milestones, Special
5. **Progress indicators on locked badges:** If partially complete (e.g., "50 workouts done, need 100"), show a mini progress bar

**Badge data:** Already defined in `src/lib/gamification.ts` — use the same badge definitions, just surface them visually.

**Estimated lines of code:** ~200

---

### 3.5 — Chart Annotations (PRs, Deloads, Missed Sessions)

**Priority:** P2 for Phase 3

**File:** `src/components/ProgressCharts.tsx`

**Where:** Lines 417-460 (strength chart), 460-500 (volume chart)

**What to build:**

Recharts supports `ReferenceLine`, `ReferenceDot`, and `ReferenceArea` components:

1. **PR markers on strength chart:** When a data point represents a PR (higher than all previous), render a `ReferenceDot` with a star icon
2. **Deload week shading on volume chart:** If a week's volume is <70% of the previous week, shade it with a `ReferenceArea` in green (indicating intentional deload)
3. **Missed session indicators:** On the frequency chart, add red dots for weeks where actual sessions < planned sessions

**Data needed:**
- PR detection: compare each `estimated1RM` data point against running max
- Deload detection: compare week-over-week volume (already in `volumeData`)
- Missed sessions: compare `volumeData[].workouts` against `currentMesocycle.weeks[0].sessions.length`

**Estimated lines of code:** ~60

---

### 3.6 — Post-Workout Session Recap Card

**Priority:** P2 for Phase 3

**Problem:** After completing a workout, the data just goes into the log. There's no celebration, no summary card highlighting what the user just accomplished.

**Files:**
- `src/lib/store.ts` (add `lastCompletedWorkout` state)
- `src/components/ProgressTab.tsx` (render recap card)
- New: `src/components/SessionRecap.tsx` (~100 lines)

**What to build:**

1. **Store:** When `completeWorkout()` runs, save `lastCompletedWorkout: { logId, timestamp }` in state
2. **SessionRecap card:** Rendered at the top of Progress Overview if `lastCompletedWorkout` exists and was within last 2 hours:
   - "Session Complete" header with confetti animation
   - Session name + duration
   - Total volume lifted
   - PRs hit (count + which exercises)
   - XP earned
   - "View Full Log" link → scrolls to that workout in History
   - Dismiss button (clears `lastCompletedWorkout`)

**Estimated lines of code:** ~100

---

## PHASE 3 SUMMARY

| # | Change | File(s) | Lines | Risk |
|---|--------|---------|-------|------|
| 3.1 | Training Timeline | New TrainingTimeline.tsx + ProgressTab.tsx | ~250 | Medium — new visualization |
| 3.2 | Performance Score | New performance-score.ts + ProgressCharts.tsx | ~180 | Medium — new metric |
| 3.3 | Phase-Aware Recomp | types.ts + store.ts + ProgressTab.tsx | ~80 | Low |
| 3.4 | Badge Showcase | New BadgeShowcase.tsx + Dashboard.tsx | ~200 | Low |
| 3.5 | Chart Annotations | ProgressCharts.tsx | ~60 | Low |
| 3.6 | Session Recap | store.ts + new SessionRecap.tsx + ProgressTab.tsx | ~100 | Low |

**Total Phase 3:** ~870 lines. 3-4 new files. No new dependencies.

---

## FULL PROJECT SUMMARY

| Phase | Changes | Total Lines | New Files | Dependencies |
|-------|---------|-------------|-----------|-------------|
| 1 | 7 quick wins | ~260 | 0 | 0 |
| 2 | 6 medium bets | ~910 | 2 | 0 |
| 3 | 6 bigger bets | ~870 | 3-4 | 0 |
| **Total** | **19 changes** | **~2,040** | **5-6** | **0** |

Zero new npm dependencies. Everything built with existing Tailwind + Recharts + Framer Motion + SVG.

---

## EXECUTION ORDER RECOMMENDATION

If you want maximum user-facing impact with minimum risk, do these first:

1. **1.3** (reorder progress) — 5 minutes, zero risk
2. **1.5** (rename tabs) — 10 minutes, zero risk
3. **1.1** (progress ring) — 30 minutes, zero risk
4. **1.2** (next up card) — 45 minutes, low risk
5. **1.6** (dismissible info) — 15 minutes, zero risk
6. **2.3** (exercise mini-trends) — 15 minutes, zero risk
7. **1.4** (swap undo) — 30 minutes, low risk

These 7 changes (~240 lines) would transform the experience of both sections without touching any critical paths.
