# UX Audit: Program & Progress Sections

## Executive Verdict

The engine underneath is strong — science-based periodization, auto-regulation, Whoop integration, detailed logging. But **the UI is failing the engine**. What you've built is a powerlifting spreadsheet wearing a dark theme. The information architecture is flat, the hierarchy is unclear, and users have to work too hard to get the dopamine hit they earned.

This is an honest audit. Here's what's broken, what's mediocre, and what needs to happen to make this best-in-class.

---

## PART 1: PROGRAM SECTION — CRITICAL ISSUES

### Problem 1: The Empty State is a Dead End

**Current:** A sad dumbbell icon, "No Active Program", and two buttons — "Customize & Generate" and "Quick Generate (Default)".

**Why this is bad:** This is the single most important moment in the app — the user's first interaction with programming. You're giving them a binary choice with zero context. "Quick Generate" tells them nothing. "Customize & Generate" opens a muscle emphasis picker that assumes they know what MEV/MAV/MRV means. There's no onboarding, no guided path, no progressive disclosure.

**What to do:**
- Replace with a 3-step guided flow: (1) Pick your goal (Get Stronger / Build Muscle / Both), (2) How many days can you train? (visual day picker, not a dropdown), (3) Any muscle priorities? (body map tap targets, not a settings panel)
- Show a preview of the generated program before committing — "Here's what Week 1 looks like"
- Add a "Start with a Template" option showing 3-4 curated programs (e.g., "5-Day Hypertrophy", "3-Day Full Body Strength", "Grappler Hybrid") as visual cards with descriptions
- Kill the "Quick Generate (Default)" button — defaults should be smart, not lazy

### Problem 2: Week-by-Week Accordion is the Wrong Pattern

**Current:** Nested accordions — expand a week, then expand a session, then scan a flat exercise list. Every session card looks identical.

**Why this is bad:** Users don't think in "Week 3, Session 2". They think "What's my next workout?" The accordion pattern forces them to hunt. On a 5-week, 4-session mesocycle, that's 20 collapsible items. Nobody wants that.

**What to do:**
- **Default view: "Next Up" card.** A single prominent card showing the next unfinished session — exercise names, estimated duration, "Start Workout" button front and center. This is the 80% use case. Serve it instantly.
- **Secondary view: Full calendar/grid.** A compact week x session grid showing completion status at a glance (checkmarks, "today" highlight, upcoming dimmed). Tappable to drill into session details.
- **Kill the nested accordion.** Replace with a horizontal swipeable week carousel where each week shows its sessions as a compact row. Think Spotify's playlist view, not a file tree.
- **Visual differentiation per session type.** Strength/Hypertrophy/Power sessions should have dramatically different visual treatments — not just a tiny colored icon. Use gradient backgrounds, bold type treatments, or edge accents per type.

### Problem 3: No Sense of Progress Within the Program

**Current:** The program view shows what's planned. There's a `completedSessionIds` set that checks things off. That's it.

**Why this is bad:** Users can't see at a glance: "I'm 60% through this block." There's no momentum indicator. No "3 sessions left this week" nudge. No visual feedback loop connecting effort to progress.

**What to do:**
- **Add a mesocycle progress ring** at the top of the program view — sessions completed / total sessions, with percentage. Animate it on completion.
- **Show weekly completion bars** — 3/4 sessions done this week, compact horizontal bar.
- **"On Track" / "Behind" / "Ahead" status badge** based on expected pace vs actual completion.
- **Streak integration** — "5 sessions in a row without missing" tied to the current block, not just global streak.

### Problem 4: Exercise Swap Has No Undo and Poor Discoverability

**Current:** Users can swap exercises via a dropdown. No confirmation, no undo, no preview of what the swap means.

**Why this is bad:** One wrong tap and your program is modified with no way back. The save-as-template banner pops up after a swap which is confusing — users didn't ask to save a template, they just wanted a different exercise.

**What to do:**
- Add a 5-second undo toast after every swap: "Swapped Bench Press for Dumbbell Press. Undo?"
- Show a comparison before confirming: old exercise vs new exercise, with muscle groups and difficulty side by side
- Separate "modify program" from "save as template" — template saving should be an explicit action in settings, not an auto-prompt

### Problem 5: Periodization Info Card is Wasted Space

**Current:** A static info card that says "Undulating Periodization" with a one-line explanation. Always visible. Never changes.

**Why this is bad:** After the user reads it once, it becomes dead real estate taking up valuable viewport space on mobile. It's also overly technical for most users.

**What to do:**
- Make it dismissible (show once, remember the dismissal)
- Or move it to a "?" icon tooltip on the program header
- Replace the space with something dynamic — like a "This Week's Focus" card that changes based on the current week's periodization phase

### Problem 6: Program Settings Panel is Buried

**Current:** Settings icon in the header opens a panel for regenerating the program with different weeks/sessions.

**Why this is bad:** The gear icon is overloaded in app UX — users won't find program-specific settings there. The regenerate flow is also dangerous (potential data loss) hidden behind a casual icon.

**What to do:**
- Move program customization into a dedicated "Edit Program" action with a clear destructive action warning
- Show impact preview: "This will replace your current 5-week block. 8 workouts logged will be preserved."
- Add "Extend Block" as a separate, non-destructive action (add weeks to current mesocycle)

---

## PART 2: PROGRESS SECTION — CRITICAL ISSUES

### Problem 7: Information Hierarchy is Flat and Overwhelming

**Current:** The Progress tab opens to: Quick Stats (2 cards) → Relative Strength → Insights list → 5 chart tabs → chart content. Then below the charts: Weekly Challenge → E1RM Trends → Body Recomp → Streak Heatmap.

**Why this is bad:** This is a vertical scroll dump. Everything has equal visual weight. The user's eyes have nowhere to land. There's no clear answer to "How am I doing?" — the single most important question a progress screen should answer.

**What to do:**
- **Lead with a single "Performance Score" or "Training Grade".** A composite metric (0-100 or A-F) that synthesizes consistency, volume trend, strength progress, and recovery. This gives users an instant emotional read. Think Whoop's recovery score, but for training quality.
- **Stack rank the information:**
  1. Performance Score + one-line trend summary
  2. This Week vs Last Week (compact comparison strip)
  3. Key lifts trending (top 3, up/down arrows, inline sparklines — not full charts)
  4. Deep-dive charts (hidden behind "See Details" or a swipe gesture)
- **Push Weekly Challenge and Streak Heatmap above the charts.** These are engagement hooks. They should be visible before the user has to scroll past a chart they might not understand.

### Problem 8: Charts Are Dense, Passive, and Generic

**Current:** 5 chart tabs (Strength, Volume, Distribution, Frequency, Recovery), each rendering a full Recharts visualization. Default is Strength showing estimated 1RM lines for 4 exercises.

**Why this is bad:**
- On mobile, 5 tabs with scrollable chips is a lot of friction
- Charts don't tell users what to DO — they just show data
- The strength chart shows 4 exercises but doesn't highlight which one is progressing fastest or stalling
- Volume chart shows "Week 12" labels — meaningless without date context
- Distribution pie chart is misleading (arms get double-counted from biceps + triceps)
- Recovery chart requires Whoop — for most users this tab is just empty

**What to do:**
- **Replace tabs with a single scrollable insight feed.** Each "card" is a mini-visualization with context:
  - "Your Squat is up 12% this month" + sparkline
  - "Volume dipped 18% last week — intentional deload?" + mini bar chart
  - "You're training chest 2x more than back — consider balance" + mini pie
  - "4 workouts this week, up from 3 last week" + dot indicator
- **Each card should have a CTA:** "View Full Chart" expands inline or navigates to detail view
- **Kill the Recovery tab for non-Whoop users.** Don't show empty states for features that require hardware. If no wearable is connected, replace with a subjective recovery tracker (RPE-based recovery estimate from post-workout feedback).
- **Add annotations to charts.** Mark deload weeks, PRs, missed sessions. A line chart without context is just a squiggly line.

### Problem 9: Mesocycle History is an Afterthought

**Current:** Completed mesocycles appear as clickable cards at the bottom of ProgressCharts. They show name, weeks, goal focus, session count, volume, PRs.

**Why this is bad:** This is buried. Users who've completed 3+ blocks can't easily compare Block 1 vs Block 3 performance. There's no "journey" narrative — just a list of old blocks.

**What to do:**
- **Create a "Training Timeline" view.** A horizontal timeline showing each mesocycle as a segment, with volume and strength overlaid as a continuous line across blocks. This shows the long arc of progress.
- **Add block-over-block comparison.** Side-by-side stat cards: "Block 2 vs Block 1: +15% volume, +8% squat 1RM, -0.5 average RPE"
- **Promote this to a top-level sub-tab** alongside Charts, Workouts, Calendar, Body Weight. Call it "Blocks" or "Journey".

### Problem 10: The Sub-Navigation Has Too Many Concerns

**Current:** 4 sub-tabs: Progress, Workouts, Calendar, Body Weight. Plus an export button.

**Why this is bad:**
- "Progress" and "Workouts" are confusing names — workouts ARE progress
- "Calendar" and "Body Weight" are niche views that most users visit rarely
- Export is a utility action, not a view — it shouldn't be at the same level as content tabs

**What to do:**
- Rename for clarity: "Overview" (charts + insights), "History" (workout log), "Calendar" (keep), "Body" (weight + body composition)
- Move Export/Import into a settings or "..." overflow menu
- Consider merging Calendar into Overview as the streak heatmap already serves a similar purpose

### Problem 11: Workout History Editing is Powerful but Hidden

**Current:** WorkoutHistory supports inline editing of past workouts — edit sets, add exercises, change RPE, duplicate workouts.

**Why this is bad:** This is a genuinely great feature that users will never discover. There's no visual affordance suggesting "tap to edit" on a past workout. The expand → edit flow is invisible.

**What to do:**
- Add a subtle "Edit" icon on each workout card
- On first visit to history, show a one-time tooltip: "Tap any workout to view details or make corrections"
- Add swipe-to-reveal actions (edit, duplicate, share) for quicker access on mobile

### Problem 12: Body Recomp Card Needs More Context

**Current:** Shows weight delta and volume delta over 4 weeks with a one-line interpretation ("Losing weight while lifting more — solid recomp!").

**Why this is bad:** 4 weeks is arbitrary and not configurable. The interpretation is simplistic — it doesn't account for goal (cutting vs bulking). "Volume up, weight up" might be great for a bulk, bad for a cut.

**What to do:**
- Let users set their current phase (Cut, Bulk, Maintain, Recomp) and tailor the interpretation
- Show a longer trendline (8-12 weeks) with the 4-week window highlighted
- Add estimated lean mass change if both body weight and strength data are available (rough proxy)

---

## PART 3: CROSS-CUTTING ISSUES

### Problem 13: No Connection Between Program and Progress

**Current:** Program section and Progress section are separate tabs with no cross-linking. Completing a workout in the Program doesn't surface on the Progress tab beyond being another data point.

**Why this is bad:** This is the biggest missed opportunity. The program creates the structure. Progress should reflect how the user is performing against that structure. Right now they're disconnected silos.

**What to do:**
- **On the Program tab:** Add per-exercise mini-trends inline. Under each prescribed exercise, show: "Last time: 185 x 8 @ RPE 7 | Suggested: 190 x 8". This already exists in ActiveWorkout but should be visible in the program preview.
- **On the Progress tab:** Add a "Current Block Performance" section showing: sessions completed vs planned, volume vs target, RPE trend within this block, whether you're on track to beat last block.
- **After completing a workout:** Show a "Session Recap" card on the Progress tab — not just append to history, but highlight it: "You just hit 3 PRs in your Upper Strength session. Volume: 12,400 lbs."

### Problem 14: Gamification is Scattered

**Current:** Weekly challenges on Progress tab, streak on heatmap, XP/levels somewhere in gamification stats, badges awarded silently.

**Why this is bad:** Gamification only works when it's cohesive and visible. Scattering it across different components kills the loop. Users don't see their level, don't feel their streak, and never check their badges because there's no dedicated surface.

**What to do:**
- **Create a persistent "status bar"** at the top of the app (or on the profile/header): Level badge + XP progress bar + streak fire icon with count. Always visible. Always updating.
- **Badge showcase.** A dedicated section (could be in profile) showing earned badges in a visual grid. Locked badges shown as silhouettes with "requirements to unlock" tooltips. This is the trophy case.
- **Weekly Challenge card should be on the home/dashboard level**, not buried under Progress → Charts scroll.

### Problem 15: Mobile Performance Risk

**Current:** ProgressCharts renders 5 chart types via Recharts. ActiveWorkout is 3,500 lines. ProgressTab loads ProgressCharts, WorkoutHistory, TrainingCalendar, and BodyWeightTracker.

**Why this is bad:** On mid-range phones (the reality for most fitness app users), this will jank. Recharts is heavy. Rendering all chart data on mount — even if only one tab is visible — wastes CPU cycles.

**What to do:**
- Lazy-load chart content per tab (only render the active chart, not all 5)
- Virtualize workout history (only render visible log cards)
- Split ActiveWorkout into sub-components and lazy-load modals
- Consider lighter chart alternatives for mobile (sparklines via SVG, not full Recharts) for the overview cards

---

## PART 4: PRIORITY IMPLEMENTATION PLAN

### Phase 1: Quick Wins (High Impact, Lower Effort)

| # | Change | Impact |
|---|--------|--------|
| 1 | Add mesocycle progress ring to Program header | Users instantly see block progress |
| 2 | Add "Next Up" card as default Program view | Eliminates accordion hunting |
| 3 | Move Weekly Challenge above charts | Engagement hook gets visibility |
| 4 | Add undo toast for exercise swaps | Prevents accidental program changes |
| 5 | Rename Progress sub-tabs (Overview/History/Calendar/Body) | Reduces confusion |
| 6 | Make periodization info card dismissible | Reclaims mobile viewport space |
| 7 | Lazy-load chart tabs (render only active) | Performance improvement |

### Phase 2: Medium Effort, High Impact

| # | Change | Impact |
|---|--------|--------|
| 8 | Replace chart tabs with scrollable insight cards | Progress becomes actionable, not just data |
| 9 | Add "Current Block Performance" to Progress overview | Connects program to progress |
| 10 | Add per-exercise mini-trends in Program session preview | Users see suggestions before starting |
| 11 | Persistent XP/level/streak status bar | Gamification becomes cohesive |
| 12 | Guided program generation flow (3-step) | Onboarding becomes intuitive |
| 13 | Add workout edit affordances (icons, tooltips, swipe) | Hidden power features get discovered |

### Phase 3: Bigger Bets

| # | Change | Impact |
|---|--------|--------|
| 14 | Training Timeline (mesocycle-over-mesocycle visualization) | Long-term progress narrative |
| 15 | Composite "Performance Score" | Single number emotional read |
| 16 | Phase-aware Body Recomp (cut/bulk/maintain context) | Personalized interpretation |
| 17 | Badge showcase with locked badge silhouettes | Trophy case engagement loop |
| 18 | Chart annotations (PRs, deloads, missed sessions) | Charts tell stories, not just show data |
| 19 | Post-workout Session Recap card | Celebrates effort immediately |

---

## Summary

The backend intelligence of this app is legitimately impressive — the periodization engine, auto-regulation, Whoop integration, and combat sport adjustments are features that premium apps charge $30/month for. But the presentation layer is underselling it. The program section makes users work too hard to find their next workout. The progress section drowns them in charts without telling them what it means.

The north star: **Every screen should answer one question instantly.** Program: "What's my next workout?" Progress: "Am I getting better?" If the user has to scroll, tap, or think to get that answer, the UI has failed.

Build for the person who just finished rolling at BJJ, is sweaty, has 3 seconds of attention, and wants to know what to lift and whether it's working. That's the user. Serve them.
