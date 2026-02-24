# Rootsler Gains Pre-Launch Audit

**Date:** 2026-02-10
**Scope:** Full codebase review — training logic, UX, safety, feature completeness, competitive positioning
**Verdict:** Not launch-ready. Several critical issues must be resolved before real users touch this.

---

## 1. Training Logic & Hypertrophy Validity

### Critical Issues

**1.1 "Back" and "Lats" are separate muscle groups — double-counting volume**
`workout-generator.ts:29-43`

The volume landmarks define both `back` (MEV 8, MAV 16, MRV 22) and `lats` (MEV 6, MAV 14, MRV 20) as independent muscle groups. Lats *are* back muscles. Any pulling exercise (rows, pulldowns, pull-ups) will hit both, causing the app to count the same sets twice toward two separate volume targets.

RP treats "back" as a single muscle group for volume tracking. This double-counting inflates the perceived weekly volume by 30-50% for posterior chain work, which means:
- The VolumeHeatMap shows misleadingly high "back" coverage
- Block suggestion engine may classify back as "optimal" when it's actually undertrained
- Users will undershoot actual back volume while the app tells them they're fine

**Recommendation:** Merge `back` and `lats` into a single `back` group. If you want to preserve the distinction, use sub-categories (upper back vs lats) but count them toward a single volume target.

**1.2 Volume landmarks are static — no individualization**
`workout-generator.ts:29-44`

The landmarks are hardcoded population averages. A 145lb female beginner and a 220lb advanced male lifter get the same MEV/MAV/MRV for every muscle group. RP's entire value proposition is that these landmarks are *individualized* and *adjusted over time* based on performance, soreness, and pump data.

The app collects pump ratings and difficulty feedback per exercise. This data exists but is never used to shift the volume landmarks for individual users across mesocycles.

**Recommendation:** Implement a `personalizedLandmarks` store entry that starts at population defaults and adjusts ±1-2 sets/muscle/week based on accumulated feedback data across mesocycles. This is the single highest-leverage feature for hypertrophy programming accuracy.

**1.3 No per-muscle-group volume enforcement during generation**
`workout-generator.ts:606-967`

The mesocycle generator picks exercises and assigns sets based on workout type prescriptions, experience scaling, and time constraints. But there is no step that tallies up the resulting weekly sets per muscle group and checks whether each group falls between MEV and MRV.

Result: A generated mesocycle can easily undershoot MEV for small muscle groups (rear delts, calves, biceps) or overshoot MRV for frequently-hit groups (front delts via all pressing, triceps via every push exercise).

**Recommendation:** Add a post-generation validation pass: `validateMuscleGroupVolume(weeks)` that counts per-muscle weekly sets and adds/removes isolation exercises to bring undertrained groups above MEV and overtrained groups below MRV.

**1.4 No double progression model**
The app uses percentage-of-1RM and RPE-based weight jumps but doesn't implement double progression (increase reps within target range first, then increase weight and reset to bottom of range). This is the standard RP approach for hypertrophy and is more practical for intermediate lifters who can't add weight every session.

The current model (`auto-adjust.ts:162-267`) adjusts weight by 5-10% based on difficulty feedback, but this is coarser than tracking rep progression within a set rep range.

**Recommendation:** Add double progression tracking: if prescribed 8-12 reps and the user hits 12 reps on all sets, suggest weight increase and reset target to 8 reps.

### Medium Priority Issues

**1.5 DUP is valid but not RP-style hypertrophy programming**
The app defaults intermediates/advanced to Daily Undulating Periodization (strength/hypertrophy/power rotation within a week). RP's approach is phase-based accumulation: all sessions in a mesocycle focus on hypertrophy with progressive volume overload, not alternating between strength and power days.

DUP is evidence-based and effective. But marketing the app as "RP-inspired" while using DUP will confuse users familiar with RP. The difference matters because:
- DUP splits training stimulus across goals (some sessions are strength-focused at 3-5 reps)
- RP concentrates all stimulus on hypertrophy (5-30 rep range, all sets near failure)

**Recommendation:** If hypertrophy is the selected goal, keep ALL sessions as hypertrophy-type. Offer DUP as a separate periodization option for users who want mixed goals.

**1.6 Random rep targets within range**
`workout-generator.ts:436` — `targetReps: randomBetween(config.reps[0], config.reps[1])`

Each set gets a random rep target within the prescribed range. RP programs specific rep targets that progress across the mesocycle (start at higher reps/lower weight, end at lower reps/higher weight). Random selection wastes the opportunity for structured progression.

**Recommendation:** Replace random rep selection with a progressive model: Week 1 targets upper end of range, Week 4 targets lower end.

**1.7 Linear progression rate for beginners is aggressive**
`workout-generator.ts:870` — `volumeMultiplier = 1 + (weekNumber - 1) * 0.05`

5% weekly volume increase means +20% by week 4 in a 5-week block. True beginners who have never trained before will struggle with this ramp, especially in compound movements where technique is still developing. This risks early burnout and form degradation.

**Recommendation:** Reduce beginner linear progression to 2-3% per week. Let the autoregulation system handle faster progressors.

**1.8 Calves MEV of 6 is high**
Most hypertrophy literature (including RP) puts calves MEV at 4 sets/week. Starting at 6 means some lifters will be doing unnecessary calf volume from day one, especially beginners.

### Nice-to-Have Improvements

**1.9 No Maintenance Volume (MV) defined**
During cuts or deload blocks, knowing the minimum volume to maintain muscle (MV, typically 4-6 sets/muscle/week) would help the cut modifier (`DIET_PHASE_MODIFIERS`) make smarter decisions rather than applying a flat 20% volume reduction.

**1.10 `shouldDeload()` is calendar-blind**
`auto-adjust.ts:499-533` — The deload check analyzes the most recent 5 sessions but doesn't know when those sessions occurred. A lifter training once per week needs 5 weeks of data before the check is meaningful. A lifter training 6x/week gets checked after less than a week. Add a minimum time window (e.g., 2 weeks) before the deload check triggers.

---

## 2. User Experience & Clarity

### Critical Issues

**2.1 Age is not collected during onboarding**
The `OnboardingData` type includes `age: number` but the 3-step onboarding UI never asks for it. This means:
- The performance engine's age-based recovery factor (`performance-engine.ts:431-459`) gets null data
- A 55-year-old lifter gets the same recovery assumptions as a 22-year-old
- The protein recommendations (g/kg bodyweight) can't be calculated

**Recommendation:** Add age input to Step 1. It's 1 field. Not collecting it is a data gap with safety implications.

**2.2 Bodyweight is not collected during onboarding**
No weight/bodyweight field exists in onboarding. This means:
- Nutrition macros (1.6-2.2g/kg protein) cannot be calculated
- BMR/TDEE estimates are impossible
- Relative strength metrics are unavailable
- The diet coach has no baseline

**Recommendation:** Add bodyweight to onboarding Step 1. Required field.

**2.3 Feature overload — 48 overlay components**
The Dashboard manages 48 lazy-loaded feature overlays. For a new user, the sheer number of features (nutrition, wearables, AI coaching, competition prep, grappling tracker, grip strength, mobility, HR zones, community sharing, knowledge hub...) creates massive decision fatigue.

Most of these features are gated behind Pro/Elite subscriptions, but the UI still shows them as locked tiles or menu items. This makes the free tier feel like a demo rather than a complete experience.

**Recommendation:** Hide locked features entirely for free users, or collapse them into a single "Upgrade to unlock more" section. Show at most 3-4 locked features that are most relevant to the user's goal. The free experience should feel complete, not crippled.

### Medium Priority Issues

**2.4 97KB store.ts is a maintainability red flag**
The entire app state — 100+ actions, all persistence logic, all computed values — lives in one file. This isn't a UX issue for users, but it's a DX issue that will slow down every future change and increase bug risk.

**2.5 No "Skip" path for pre-workout check-in**
The ActiveWorkout component has a pre-workout check-in flow. Users who train consistently and don't want to rate their sleep/stress/nutrition every session will find this friction annoying by week 2. The fastest path to workout completion should be zero taps from "Start Workout" to "Log First Set."

**Recommendation:** Add a "Skip check-in" option with a "Don't show again this week" toggle.

**2.6 Warm-up instructions are generic text, not calculated**
`workout-generator.ts:791-824` — Warm-up is a static list of stretches + "Gradually increase load over 3-4 warm-up sets." For a beginner who doesn't know how to warm up to a 225lb squat, this is useless. The app knows the working weight and could calculate warm-up sets (e.g., bar x 10, 135 x 5, 185 x 3, 205 x 1).

**Recommendation:** Generate specific warm-up set prescriptions (weight + reps) based on the first exercise's working weight.

**2.7 Onboarding doesn't collect baseline lifts**
The `OnboardingData` type includes `baselineLifts: Partial<BaselineLifts>` but the 3-step onboarding UI doesn't appear to collect them. Without baseline lifts, the app can't calculate working weights from %1RM prescriptions for the first mesocycle. Users must manually figure out what weight to use for every exercise in their first session.

**Recommendation:** Add an optional "Estimate your lifts" step in onboarding, with a "I'm new — skip this" path that uses conservative bodyweight-based estimates.

### Nice-to-Have

**2.8 Session names are random**
`workout-generator.ts:670-674` — Names like "Heavy Foundation" or "Explosive Power" are picked randomly. Consistent, date-based naming (e.g., "Week 2 / Day 1 — Upper Hypertrophy") would be more navigable when reviewing past sessions.

---

## 3. Safety & Responsibility

### Critical Issues

**3.1 No medical disclaimer or terms of service acceptance**
There is no health disclaimer shown during onboarding, registration, or first workout. The only mentions of medical consultation are buried inside injury analysis code (`injury-prevention.ts:428`, `injury-science.ts:27`).

For a fitness app that prescribes exercises at RPE 9.5 (near maximal effort), this is a legal liability. If a user injures themselves following the app's programming, you have no documented acknowledgment that they understood the risks.

**Recommendation:** Add a mandatory disclaimer acceptance screen during onboarding. Text should include: "This app is not a substitute for medical advice. Consult a physician before starting any exercise program. By proceeding, you acknowledge that you train at your own risk."

**3.2 No age gate or minor protection**
No age validation anywhere in the app. The `UserProfile.age` field is optional and never validated. A 13-year-old could use the app and receive prescriptions for heavy deadlifts at RPE 9.5 with 85-95% of 1RM. Power training with explosive tempos ("1-0-X-0" — fast eccentrics) is particularly risky for developing bodies.

**Recommendation:** Require age input. Block users under 16 or require parental consent. For users under 18, disable power training type and cap RPE at 8.

**3.3 Joint pain feedback doesn't force protective action**
`auto-adjust.ts:242-252` — When a user reports joint pain on an exercise, the system generates a "swap recommendation" adjustment. But the user can dismiss it and continue with the same exercise. There's no escalation for repeated joint pain reports.

**Recommendation:** If joint pain is reported on the same exercise 2+ times within a mesocycle, automatically swap the exercise and alert the user with a prominent warning. On the 3rd report for the same body region, recommend a rest day with a link to the injury logger.

**3.4 Power training prescribed to beginners**
When a beginner selects "balanced" goal with 3+ sessions/week, DUP assigns power days (explosive movements, 2-5 reps, fast tempos). The experience modifier reduces RPE by 1.5, but the fundamental risk of explosive training with poor technique remains.

**Recommendation:** For beginners, replace power days with additional hypertrophy days. Introduce power training only after the user completes at least 2 mesocycles.

### Medium Priority Issues

**3.5 No form check prompts**
The app prescribes complex compound movements (Olympic-style lifts could be selected from the exercise pool) without any form verification mechanism. Even a simple "Have you performed this exercise before?" prompt would help.

**3.6 Competition prep for untested athletes**
The competition prep module (`CompetitionPrep.tsx`) includes peaking and tapering protocols. There's no check for whether the user has ever competed or has adequate training history. An enthusiastic beginner could use this to dangerously peak for a competition after 2 months of training.

**3.7 Recovery score of 0 doesn't block training**
When the performance engine returns a "critical" readiness (<30), the app shows a recommendation to rest but doesn't prevent starting a workout. A user in a compromised state (sleep deprived, sick, highly stressed) can still launch into a heavy strength session.

**Recommendation:** Show a prominent interstitial warning when readiness is critical. Require explicit "I understand the risk" confirmation before proceeding.

---

## 4. Feature Completeness & Gaps

### Must-Have Before Launch

| Gap | Impact | Effort |
|-----|--------|--------|
| Medical/legal disclaimer | Legal liability | Low — 1 screen |
| Age + bodyweight collection in onboarding | Breaks nutrition, recovery, safety systems | Low — 2 fields |
| Per-muscle volume validation in generator | Core hypertrophy logic is incomplete | Medium |
| Back/lats muscle group merge | Volume tracking is misleading | Medium |
| Tests must actually run | Cannot verify correctness of any logic | Medium — fix vitest config |

### Should Have Before Launch

| Gap | Impact | Effort |
|-----|--------|--------|
| Double progression model | Missing core hypertrophy progression strategy | Medium |
| Warm-up set calculation | Beginner safety | Low-Medium |
| Joint pain escalation | Injury prevention gap | Low |
| Beginner power training guard | Safety | Low |
| Individualized volume landmarks | Key differentiator for hypertrophy accuracy | High |

### Defer Post-Launch

| Feature | Reason to Defer |
|---------|----------------|
| Community sharing | Nice-to-have, not core |
| Grip strength module | Niche feature |
| HR zone training | Requires wearable, small user base |
| PDF export | Low usage pre-launch |
| Knowledge hub | Content can be added incrementally |

### Overbuilt / Consider Removing

| Feature | Concern |
|---------|---------|
| Illness engine (`illness-engine.ts`, 17KB) | Complex system for a rare event. A simple "I'm sick, skip workouts" toggle would suffice. |
| Diet coach with AI coaching | Three nutrition systems (NutritionTracker, DietCoach, contextual-nutrition) overlap significantly. Consolidate. |
| Gamification (30KB, 30+ badges) | Risk of feeling gimmicky for serious lifters. Keep XP/streaks, cut the badge catalog to 10 meaningful achievements. |

---

## 5. Competitive Reality Check

### vs. RP Hypertrophy App

| Dimension | RP Strength | Rootsler Gains |
|-----------|------------|----------------|
| Per-set autoregulation | Real-time — each set informs the next | Session-level — adjustments apply to next workout |
| Volume tracking | Per-muscle-group, individualized landmarks | Global multiplier, static landmarks |
| Progression model | Double progression (reps then weight) | RPE-based weight jumps |
| Rep range progression | Structured across mesocycle | Random within range |
| Muscle group focus | User-adjustable priority per mesocycle | Emphasis config exists but limited enforcement |
| Deload trigger | Automated based on per-muscle fatigue | Calendar-based (last week) + optional fatigue check |
| Exercise library | Smaller but curated with video demos | 50+ exercises with form cues |
| Price | ~$15/mo | $0 / $9 / $29 |

**Where Rootsler Gains wins:**
- Combat sport integration is genuinely useful and unique — no major competitor does this
- Sport load reduction scaling is evidence-based and smart
- Sex-based modifiers with citations is better than most competitors
- Free tier is generous
- Whoop integration adds real value for recovery management
- Diet phase modifiers are well-implemented
- The injury prevention system with ACWR calculation is impressive

**Where Rootsler Gains is weaker:**
- Core hypertrophy autoregulation is a generation behind RP (session-level vs set-level)
- Volume tracking doesn't enforce per-muscle targets
- No double progression
- The back/lats double-counting undermines volume accuracy
- Feature sprawl dilutes the core experience

### What Will Cause Churn After 2-4 Weeks

1. **Week 1-2:** Users realize there's no way to input their actual working weights during mesocycle generation. They have to manually find the right weight for every exercise in their first session. First impression is "this app doesn't know what I can lift."

2. **Week 2-3:** Advanced lifters notice that the volume doesn't match their expectations — some muscle groups are under-hit, others over-hit, because there's no per-muscle enforcement. They compare to RP and feel the programming is less precise.

3. **Week 3-4:** Non-combat users realize that 60%+ of the feature surface is combat-sport oriented (grappling tracker, combat sport schedule, grappler-friendly scores). The app's identity is confused — it's marketed as a hypertrophy app but built around combat athletes.

4. **Week 4+:** Users who want pure hypertrophy programming get frustrated that every third session is a strength or power day (DUP) instead of continuous hypertrophy work. They switch to RP.

---

## Summary: Top 10 Actions Before Launch

| Priority | Action | Risk if Skipped |
|----------|--------|----------------|
| 1 | Add medical disclaimer + age gate | Legal exposure |
| 2 | Collect age + bodyweight in onboarding | Multiple systems broken |
| 3 | Merge back/lats muscle groups | Volume tracking is wrong |
| 4 | Add per-muscle volume validation to generator | Core hypertrophy logic incomplete |
| 5 | Fix test suite (vitest can't even run) | No confidence in correctness |
| 6 | When goal is "hypertrophy," keep all sessions hypertrophy-type | Misaligned with target audience expectations |
| 7 | Implement double progression | Missing the most practical progression model |
| 8 | Add joint pain escalation logic | Injury liability |
| 9 | Calculate warm-up sets from working weight | Beginner safety |
| 10 | Guard beginners from power training | Safety |

---

## Final Assessment

The engineering quality is high — the code is well-structured, typed, and evidence-based with proper citations. The combat sport integration is genuinely differentiated. The sex-based modifiers and sport load scaling show real domain expertise.

But the core hypertrophy logic has gaps that will be immediately obvious to anyone who has used RP or understands periodization. The volume tracking is undermined by the back/lats split. The progression model lacks double progression. The generator doesn't enforce per-muscle-group volume ranges. And the DUP default is a poor match for users who select "hypertrophy" as their primary goal.

The safety gaps (no disclaimer, no age gate, joint pain ignored) are the most urgent. Everything else is improvable post-launch, but these create real liability.

Ship after fixing items 1-6 from the priority list. Items 7-10 can follow within the first 2 weeks.
