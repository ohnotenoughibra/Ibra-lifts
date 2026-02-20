# First-Principles Audit: Roots Gains

*Updated: Includes both the Product/Engineering audit (Phases 0-5) and the UX/UI audit (Phases A-E).*

---

# PART I — Product & Engineering Audit

## The Core Finding

**Roots Gains is a world-class periodized strength app wearing a combat sports costume.**

The lifting engine is legitimately excellent — undulating periodization, auto-regulation, RP-style volume landmarks, readiness throttling. Better than 95% of fitness apps.

But the combat sport integration is a logging layer. You can *record* that you rolled for 90 minutes, but the app doesn't *think* about what that means for tomorrow's deadlift. The nutrition engine is the opposite — genuinely elite for fighters. Nine fight-camp phases, weight-cut protocols, energy availability tracking.

## Product Scorecard

| Domain | Grade | Verdict |
|--------|-------|---------|
| Periodized Strength Programming | A | Best-in-class |
| Fight-Camp Nutrition & Weight Cuts | A | Genuine competitive advantage |
| Gamification & Engagement | B+ | Solid after rebalance |
| Readiness & Recovery (Whoop) | B | Good foundation, weak sport integration |
| Combat Sport Training Integration | D+ | Logging only. No intelligence |
| Conditioning / Work Capacity | F | Doesn't exist |
| Social / Community | F | Screenshot cards. That's it |

## Product Phases (IMPLEMENTED)

- [x] **Phase 0**: useShallow() on 7 components, lazy-load ProfileSettings + ActiveWorkout
- [x] **Phase 1**: Concurrent training engine (844 lines), sport-specific splits, conditioning templates
- [x] **Phase 2**: Gym leaderboard engine, challenge battles system
- [x] **Phase 3**: Exercise recommender, injury pattern detection, adaptive readiness model

## Product Phases (REMAINING)

### Phase 4: Technical Foundation (3-4 weeks)
- [ ] Slice Zustand store into domain stores
- [ ] Database schema versioning
- [ ] Component + API route tests
- [ ] PayPal webhook signature verification

### Phase 5: Monetization & Growth (2-3 weeks)
- [ ] Simplify feature gates (39 → ~15)
- [ ] Coach subscription tier
- [ ] Referral program

---

# PART II — UX/UI Audit

## The Core Question

*"A fighter opens this app in the locker room with chalk on their hands. They have 3 seconds of attention. What do they see, and how fast can they do the ONE thing they came to do?"*

---

## The Honest Truth

**This app has the information density of a Bloomberg terminal on a 375px phone screen.**

Every screen tries to be a dashboard. HomeTab alone has readiness scores, workout launchers, nutrition banners, fight camp phases, coaching lines, 1RM trends, body recomp cards, weekly challenges, streak heatmaps, and soreness check-ins — all fighting for attention on the same scroll. A user who just wants to start their workout has to scroll past 4-5 cards and navigate through up to 5 nested modals before they touch a weight.

The design system underneath is legitimately good — glassmorphic cards, proper touch targets (56px), 4 color themes, dark/light mode, haptic feedback, skeleton loading. But good paint on a cluttered room is still a cluttered room.

**The fundamental UX problem: the app was designed feature-by-feature, not flow-by-flow.**

---

## UX Scorecard

| Domain | Grade | Verdict |
|--------|-------|---------|
| Design System & Visual Language | A- | Cohesive. Glassmorphism, 4 themes, proper tokens |
| Touch Targets & Mobile Basics | A- | 56px buttons, safe areas, numeric keypads |
| Haptic Feedback | B+ | 4 vibration patterns. Tasteful |
| Loading States & Skeletons | B+ | Tab-specific skeletons, no layout shift |
| Error Handling & Recovery | B | Error boundaries, toast system, sync conflict UI |
| Onboarding | B | 4 clean steps, but no "wow" moment |
| Information Architecture | D+ | Every screen is a dashboard. No hierarchy |
| Cognitive Load | D | Too many decisions on every screen |
| Navigation Depth | D | 5+ modal layers to start a workout |
| Gesture Support | F | Zero swipe gestures in a mobile-first app |
| Color Contrast (a11y) | D+ | text-grappler-500 on dark bg fails WCAG AA |
| Keyboard/Screen Reader | D | No focus traps, no roving tabindex in modals |
| Pull-to-Refresh | F | Missing entirely |

---

## PHASE A: Ruthlessly Simplify the Home Screen (2 weeks)
*The home screen is where users decide if they keep using the app.*

### Problem
HomeTab.tsx is 2,765 lines showing 10+ information cards. Users scroll past readiness, nutrition banners, coaching lines, body recomp, weekly challenges, and streak heatmaps just to find the "Start Workout" button.

### Action Points
- [ ] **The "3-Second Rule"**: The home screen shows exactly 3 things above the fold:
  1. **Readiness ring** (single number, color-coded) — "How ready am I?"
  2. **Start Workout button** (massive, unmissable) — "What do I do?"
  3. **Streak counter** — "Am I on track?"
  Everything else goes below the fold or into sub-screens.

- [ ] **Kill the feed pattern**: The tiered alert system (critical → regular → dismissible) turns the home screen into a notification inbox. Replace with a single contextual coaching line that adapts: *"Recovery low — today's session auto-adjusted to 80%"* instead of 3 separate cards for readiness + deload + coaching.

- [ ] **Collapse 1RM trends, body recomp, streak heatmap** into a single "Progress" summary card with a "See details" link to the Progress tab. These are analytics, not actions.

- [ ] **Move nutrition banners to the Nutrition tab** where they belong. A meal reminder on the Home screen is a distraction when the user came to lift.

- [ ] **Reduce the start-workout flow from 6 screens to 2**:
  - Screen 1: Tap "Start Workout" → immediately see today's exercises with a single-tap "Let's Go"
  - Screen 2: Optional pre-check-in (collapsed by default, expand if they want to log sleep/stress)
  - Kill: Grappling question modal (auto-detect from today's logged sessions), location confirm (remember last choice), warm-up modal (show inline, not as a gate)

## PHASE B: Add Gesture Navigation (1-2 weeks)
*This is a mobile app used with sweaty hands. Buttons are harder than swipes.*

### Problem
Zero swipe gestures in the entire app. Users tap through exercises one at a time. No pull-to-refresh. No swipe-to-dismiss on modals. No horizontal swipe between tabs.

### Action Points
- [ ] **Swipe between exercises during workout**: Horizontal swipe left/right to move between exercises in ActiveWorkout. This is the most-used navigation in the app — every set involves checking the next exercise. Currently requires tapping small ChevronLeft/ChevronRight buttons.

- [ ] **Swipe to dismiss modals/overlays**: All bottom-sheet modals should support swipe-down-to-close. The pattern is standard in every mobile app. Currently, users must find and tap X buttons.

- [ ] **Swipe between tabs**: Horizontal swipe to move between Home/Program/Explore/Progress/Profile. The bottom nav stays — swipe is supplementary.

- [ ] **Pull-to-refresh on Home**: Trigger a sync + readiness refresh. Users expect this on every mobile app.

- [ ] **Swipe to delete meals/sessions**: In NutritionTracker and GrapplingTracker, swipe-left on a logged item to reveal delete. Currently requires tapping into the item, finding the delete button.

## PHASE C: Reduce Cognitive Load on Every Screen (2-3 weeks)
*Fewer choices = faster decisions = happier users.*

### Problem — WorkoutView
The program tab is an accordion of accordions. Week → Session → Exercise list, all expandable. With a 4-week mesocycle of 4 sessions each, that's 16 expandable items nested 3 levels deep. Users lose their place.

### Action Points
- [ ] **Replace accordions with a horizontal week selector**: Pill buttons for "Week 1 / Week 2 / Week 3 / Week 4" at the top. Selected week shows its sessions as cards. No nesting.

- [ ] **Session cards show only essentials**: Session name, workout type badge, exercise count, "Start" button. Tap the card to see exercises — don't auto-expand everything.

### Problem — NutritionTracker
4 sub-tabs (Nutrition / Meal Presets / Shopping List / Progress) inside a main tab. The Add Meal form has food search, portion scaling, macro inputs, meal type picker — all visible at once.

### Action Points
- [ ] **Kill the Shopping List sub-tab**: Zero users asked for this. It adds UI weight.
- [ ] **Merge Meal Presets into the Add Meal flow**: When typing a food name, show presets as suggestions. Don't make it a separate tab.
- [ ] **Progressive form disclosure**: Add Meal starts with just food name + meal type. Macros auto-fill from the database. Advanced fields (portion scaling, custom macros) hide behind "More details".

### Problem — ExploreTab
27+ tools in a category grid. This is a settings dump disguised as a discovery feature.

### Action Points
- [ ] **Top 4 pinned tools, nothing else above the fold**: If the user pinned their tools, respect that. Show pinned tools and a search bar. Categories are below for discovery.
- [ ] **Remove "Suggested for You"**: It's algorithmic noise. Let users discover through search and categories.

### Problem — ActiveWorkout
55 useState hooks. 5+ nested modal layers before the workout begins.

### Action Points
- [ ] **Pre-workout flow**: One screen, not 5 modals. Show exercise list + optional check-in toggle + "Start" button. Equipment profile remembered from last time.
- [ ] **During-workout simplification**: The main exercise view shows weight input, rep input, and complete button. Everything else (tempo, RPE info, exercise history, form video) is behind a single "..." overflow menu per exercise.
- [ ] **Rest timer**: Keep the full-screen timer (it's well-designed), but add a "tap anywhere to dismiss" instead of requiring the Minimize button.

## PHASE D: Fix Accessibility & Contrast (1-2 weeks)
*Legal liability and ~15% of users.*

### Problem
- `text-grappler-500` on `bg-grappler-800` fails WCAG AA for small text (4.5:1 required, ~3.2:1 actual)
- No focus traps in modals — Tab key escapes modals and reaches underlying content
- No `aria-label` on most icon-only buttons
- No roving tabindex in radio-button groups (RPE selector, mood selector)
- 10px text (`text-[10px]`) used in multiple places — too small for mobile

### Action Points
- [ ] **Bump secondary text from `text-grappler-500` to `text-grappler-400`** across all small text (grep for `text-xs text-grappler-500` and `text-[10px] text-grappler-500`)
- [ ] **Minimum font size: 12px** — eliminate all `text-[10px]` instances
- [ ] **Focus trap on all modals**: When a modal opens, Tab should cycle within it. When it closes, focus returns to the trigger.
- [ ] **aria-label on all icon-only buttons**: Every button with just an icon (`<X>`, `<ChevronLeft>`, `<Plus>`, `<Minus>`) needs a label.
- [ ] **Roving tabindex on selector groups**: RPE picker (5-10), mood picker (1-5), feeling picker — arrow keys should move between options.

## PHASE E: Interaction Polish (1-2 weeks)
*The details that separate "good app" from "app I love."*

### Action Points
- [ ] **Micro-animations on data changes**: When weight/reps change, the number should animate (count up/down) instead of instant swap. Small touch, huge perceived quality.

- [ ] **Success states after logging**: When a meal is logged or a set is completed, show a brief green checkmark animation instead of just updating a list. The user needs to feel their action was received.

- [ ] **Contextual keyboard types**: Ensure all weight inputs use `inputMode="decimal"`, all rep inputs use `inputMode="numeric"`, all text notes use `inputMode="text"`. Some inputs currently fall back to default keyboard.

- [ ] **Reduce motion for accessibility**: Respect `prefers-reduced-motion` media query. Currently 1,300+ framer-motion animations with no reduced-motion fallback.

- [ ] **Skeleton-to-content transition**: Instead of skeleton → instant content (jarring), fade the content in over 200ms when data loads. Use `animate-fade-in` with a slight delay.

- [ ] **Smart number pad**: For the weight/reps stepper in ActiveWorkout, add quick-select pills: "+2.5", "+5", "+10" for weight. Saves 3-5 taps per set for the most common increments.

---

## The 80/20

If you could only do THREE things:

1. **3-Second Home Screen** (Phase A) — Readiness ring, Start Workout, streak. Nothing else above the fold. This is the difference between a user who opens the app daily and one who opens it once.

2. **Swipe between exercises** (Phase B) — The single most-used interaction in the app. Making it a gesture instead of a button press cuts friction on 200+ interactions per workout.

3. **Fix text contrast** (Phase D) — The cheapest fix with the broadest impact. A global find-and-replace from `text-grappler-500` to `text-grappler-400` on small text fixes readability for every user.

---

## What to Kill

- **Shopping List sub-tab in Nutrition** — Zero users asked for this. It's feature bloat.
- **"Suggested for You" in Explore** — Algorithmic noise. Users know what they want.
- **Warm-up modal as a gate** — Show it inline, don't block the workout start.
- **Grappling question modal** — Auto-detect from today's training sessions.
- **5-level nested accordions in WorkoutView** — Replace with horizontal week pills.
- **10px text everywhere** — Unreadable on phone screens. 12px minimum.

---

*"The best interface is the one that gets out of the way and lets you train."*
