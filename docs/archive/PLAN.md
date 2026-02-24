# NEXT PHASE — Explore Tab & Tool Intelligence Upgrades

Based on the full Explore audit. 6 steps, ordered by impact/effort.

---

## Step 1: Explore Tab UX Polish
**Files:** `ExploreTab.tsx`
**Effort:** ~1 hour

1. **PRO badge** — Add a tiny "PRO" pill (top-right of card) on all 23 gated tools. Users currently tap → paywall → bounce. Show it upfront so they know.
2. **"Suggested for you" row** — New top section before Pinned/Recent:
   - Read `user.trainingIdentity` and `workoutLogs.length` from store
   - Combat athlete → surface Grappling, Mobility, Competition Prep, Fight Camp Fuel
   - General fitness → Strength, Volume Map, Progression, Recovery
   - New user (0 workouts) → Workout Builder, AI Program, 1RM Calculator
   - Show max 4 tools as highlighted cards with a "For You" header
3. **Move Grip Strength** from "Fuel & Body" → "Build" (it's a training tool, not nutrition)
4. **Category header icons** — Add a small icon + left color accent per category title for visual hierarchy
5. **Pin onboarding** — Show a one-time dismissible hint below search: "Long-press any tool to pin it"

---

## Step 2: Grappling Tracker — Technique Logging
**Files:** `GrapplingTracker.tsx`, `types.ts`, new `src/lib/technique-data.ts`
**Effort:** ~2-3 hours

1. **Technique database** — Create `technique-data.ts` with:
   - Submissions: armbar, triangle, RNC, guillotine, kimura, americana, heel hook, kneebar, darce, anaconda, ezekiel, omoplata, gogoplata, calf slicer, wristlock
   - Positions: mount, back mount, side control, half guard, closed guard, open guard, butterfly, de la riva, x-guard, turtle, north-south, knee on belly, standing
   - Takedowns: single-leg, double-leg, ankle pick, body lock, arm drag, snap down, uchi-mata, osoto-gari, seoi-nage, fireman's carry
   - Sweeps: scissor, hip bump, flower, pendulum, butterfly, x-guard, berimbolo
   - Grouped by category with display labels
2. **Session technique logging** — After logging a grappling session:
   - Tag-based selector: "What did you work on?" with chips for techniques
   - Separate sections: Drilled / Hit in sparring / Got caught by
   - Quick-add with autocomplete search
3. **Technique heatmap** — Show which techniques haven't been drilled recently
   - "You haven't worked back takes in 3 weeks"
   - Weekly distribution: positions drilled, submissions attempted
4. **Sparring round logging** — Optional per-session:
   - Number of rounds, round duration, intensity per round
   - Quick "W/L/Draw" per round for competitive tracking

---

## Step 3: Strength Analysis — Accessory Suggestions
**Files:** `StrengthAnalysis.tsx`, new `src/lib/sticking-point-data.ts`
**Effort:** ~1-2 hours

1. **Sticking point → accessory mapping** — Create data file:
   - Squat bottom → pause squats, tempo squats, pin squats, front squats, goblet squats
   - Squat mid-range → box squats, belt squats, SSB squats
   - Squat lockout → rack pulls above knee, hip thrusts, reverse band squats
   - Bench bottom → spoto press, larsen press, wide-grip bench, DB bench
   - Bench mid-range → close-grip bench, tempo bench
   - Bench lockout → board press, floor press, pin press, JM press, tricep dips
   - Deadlift floor → deficit deadlifts, paused deadlifts, snatch-grip deads
   - Deadlift lockout → rack pulls, block pulls, hip thrusts, Romanian DL
   - OHP lockout → Z-press, pin press, push press
   - Row strength → Kroc rows, chest-supported rows, seal rows
   - Each accessory: name, description, why it helps, sets/reps recommendation
2. **Form cues per sticking point** — Short coaching text:
   - "Bottom squat weakness often means weak quads or poor ankle mobility"
   - "Bench lockout failure suggests tricep weakness or loss of back tightness"
3. **"Add to program" action** — Button to insert suggested accessory into the current mesocycle as an optional exercise

---

## Step 4: Volume Map — Gap Recommendations
**Files:** `VolumeHeatMap.tsx`
**Effort:** ~1 hour

1. **Below MEV recommendations** — When a muscle is under-trained:
   - Show text: "Shoulders: 4 sets this week (MEV: 8). Add lateral raises or face pulls"
   - Map each muscle to 2-3 recommended exercises from the exercise database
2. **Above MRV warnings** — When overreaching:
   - Show text: "Back: 22 sets this week (MRV: 18). Consider dropping 4 sets"
   - Suggest which exercises to reduce (lowest-priority ones first)
3. **"Fix gaps" button** — Generates a quick 15-20 min accessory session targeting all muscles below MEV
   - Uses exercise database to pick exercises
   - Pre-fills sets/reps and adds to workout builder

---

## Step 5: Soreness → Readiness Score Integration
**Files:** `performance-engine.ts` (readiness calculation), `daily-directive.ts`
**Effort:** ~1-2 hours

1. **Feed soreness into readiness** — Check today's soreness quickLog:
   - No soreness logged or "none" → neutral (no impact)
   - Mild soreness in 1-2 areas → -3 readiness points
   - Moderate soreness → -6 points
   - Severe soreness → -12 points
   - Multiple severe areas → -15 points, flag as "needs rest"
2. **Smart training suggestions** — In daily directive:
   - Sore legs + leg day scheduled → "Consider swapping to upper body today"
   - Sore shoulders + push day → "Swap OHP for landmine press or skip pressing"
   - Multiple areas severe → suggest pure mobility/recovery day
3. **Soreness trend detection** — Analyze last 14 days of soreness logs:
   - Pattern: "Your lower back is sore after every Sunday" → surface as an insight
   - Chronic area: "Shoulders have been sore 5 of last 7 days — consider reducing pressing volume"

---

## Step 6: Injury → Workout Warnings
**Files:** `store.ts` (injury state access), `ActiveWorkout.tsx`, new `src/lib/injury-exercise-map.ts`
**Effort:** ~2 hours

1. **Body region → risky exercise mapping** — Create data file:
   - Shoulder injury → flag: OHP, lateral raises, upright rows, bench press, dips
   - Knee injury → flag: squats, lunges, leg extensions, jumping
   - Lower back → flag: deadlifts, bent-over rows, good mornings
   - Elbow → flag: skull crushers, preacher curls, dips
   - Each flagged exercise has: risk level (caution/avoid), reason, suggested swap
2. **Workout start warning** — When starting a workout with active injuries:
   - Yellow banner: "You have an active right shoulder injury (moderate). 2 exercises in this session target that area."
   - Per-exercise warning icon in the exercise list
3. **In-session swap suggestions** — When reaching a flagged exercise:
   - Show swap button: "This exercise may aggravate your shoulder. Try chest-supported rows instead?"
   - One-tap swap that replaces the exercise for this session only
