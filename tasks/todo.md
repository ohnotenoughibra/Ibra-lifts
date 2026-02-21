# Roots Gains — First-Principles Audit & Vision

## Current App Scorecard

| Domain | Score | Verdict |
|--------|-------|---------|
| Core Tracking | 9/10 | Exceptional |
| Combat Specialization | 9/10 | Excellent (fight camp, weight cuts, sport METs) |
| Periodization | 9/10 | Excellent (mesocycles, auto-regulation, deload) |
| Nutrition | 10/10 | Best-in-class (RED-S, energy availability, phase-aware) |
| Recovery & Readiness | 8/10 | Very good (Whoop, adaptive throttle) |
| Gamification | 8/10 | Very good (XP, badges, streaks — but generic) |
| Mobile UX | 7.5/10 | Good bones, needs polish |
| Social & Community | 4/10 | **WEAK** — leaderboard structure exists, zero live features |
| Video & Form | 0/10 | **MISSING** |
| AI Coaching | 2/10 | **Rule-based only** — no LLM |

---

## The 10 Features That Would Make This Legendary

### 1. AI Coach (Claude-Powered Weekly Narratives)
**What:** Real AI coaching via Claude API — personalized weekly summaries, natural language Q&A, program adjustments based on individual response patterns.
**Why:** Current "AI Coach" is rule-based templates. Users paying €19.99/mo expect a real coach. Claude API calls for narrative would 10x perceived value.
**Where:** New `src/lib/ai-coach-llm.ts` + Claude API route + weekly digest UI

### 2. Fight Film Room (Video Upload + Analysis)
**What:** Upload sparring/fight footage. Tag rounds, strikes, positions. Track patterns across fights.
**Why:** Combat athletes obsess over film. Missing this = they go to YouTube/notes apps, breaking flow. No competitor does this.
**Where:** New tool in Explore → `FightFilmRoom.tsx` + video upload API

### 3. Live Gym Leaderboard (Real Social)
**What:** Gym invite codes, live activity feed, head-to-head battles, real-time leaderboard.
**Why:** Leaderboard types already defined in `leaderboard.ts` but NO backend syncs them. Without real social, users go to Strava/Discord.
**Where:** `src/app/api/leaderboard/` + WebSocket or polling + `GymFeed.tsx`

### 4. Technique Journal
**What:** Log drills, concepts, positions practiced. Track what you actually PRACTICED (not just lifted).
**Why:** #1 missing feature for BJJ/MMA athletes. Every serious martial artist keeps a training journal. App tracks sessions but not technique.
**Where:** New tool → `TechniqueJournal.tsx` + journal entries in store

### 5. Sparring Analytics
**What:** Log rounds, partners, outcomes, positions. Visualize patterns — who taps you, weak positions, finish rate.
**Why:** Sparring IS the sport. Reveals patterns invisible without data. Unique differentiator.
**Where:** New tool → `SparringTracker.tsx` + analytics dashboard

### 6. Dynamic Program Adaptation
**What:** Auto-adjust mesocycle mid-block based on Whoop recovery, missed sessions, injury status, life stress.
**Why:** Current programs are static once generated. A coach would say "you had 3 bad sleep nights, let's dial back Thursday." The app should too.
**Where:** Enhance `workout-generator.ts` + new `adaptive-program.ts`

### 7. Competition Hub (Tournament Finder + Results Log)
**What:** Find local tournaments, log results (W/L/submission type), track competitive record, post-fight analysis.
**Why:** Fight Prep helps you prepare but nowhere to log RESULTS. Combat sports revolve around competition.
**Where:** Enhanced `CompetitionPrep.tsx` + `CompetitionLog.tsx` + results store

### 8. Body Composition Forecasting
**What:** Predict "you'll hit 170lbs by March 15" based on current cutting pace. Dynamic recomp modeling.
**Why:** Fight athletes plan around weight classes. Eliminates guesswork. Shows if current plan will land on target.
**Where:** Enhance `BodyWeightTracker.tsx` + new `weight-forecast.ts`

### 9. Mental Game Module
**What:** Pre-fight visualization, breathing protocols, confidence tracking, fight readiness score (physical + mental).
**Why:** Combat psychology is 50% of performance. No competitor integrates mental prep with physical training.
**Where:** New tool → `MentalGame.tsx` + `mental-prep.ts`

### 10. Coach Portal
**What:** Coaches see athlete data, annotate workouts, adjust programs. Athletes share access via code.
**Why:** Combat athletes train under coaches. If the COACH adopts the app, entire teams follow. Opens B2B channel.
**Where:** New role system + `CoachDashboard.tsx` + shared data API

---

## Mobile UX Fixes (Ship Immediately)

### Critical (This Week)
- [x] Fix excess scroll on short-content tabs (min-h-screen → 100dvh)
- [ ] Typography: Change all `text-[10px]` → `text-xs` (12px min) — WCAG AA violation
- [ ] Enable user zoom: `maximumScale: 5, userScalable: true` in layout.tsx
- [ ] Add visible X close button to all modals/overlays

### High Priority (Next 2 Weeks)
- [ ] Swipe-to-dismiss on modals (use existing use-swipe.ts)
- [ ] Android back button closes modals (popstate listener)
- [ ] Touch targets: Increase all py-1/px-2.5 filter buttons to py-2/px-3 (≥44px)
- [ ] Add viewport-fit: "cover" for notch support

### Medium Priority
- [ ] Generate WebP versions of PNG icons
- [ ] Add loading="lazy" to photo components
- [ ] FAB safe-area-inset-right padding
- [ ] Expand haptic feedback to more confirmatory actions

---

## Backlog
- [ ] Explore: Combat-identity tools (Technique Journal, Sparring Rounds, Competition Log)
- [ ] Explore: Medium-impact tools (Game Plan, Conditioning, Belt/Rank Progress)
- [ ] Explore: Contextual surfacing ("Suggested for you" row)
- [ ] Combat-specific gamification badges (first tournament win, belt promotion, 100 rounds sparred)
- [ ] Seasonal/limited-time challenges (Summer Strength League, etc.)

---

## Completed
- [x] Progress Tab Redesign — Dashboard/Progress/History/Body restructure
- [x] Profile Tab Redesign v2.2.0
- [x] Weekly session overflow UX
- [x] Wearable tool added back to Explore tab Body category
- [x] RPE formula rewrite
- [x] Stale Whoop data update on re-sync
- [x] Stale pin IDs cleanup
- [x] AI builder in BlockQueue New Block flow
- [x] Explorer Tab Redesign (4 categories, 22 tools)
- [x] XP curve rebalanced
- [x] Session card redesign
