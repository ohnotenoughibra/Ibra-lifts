# Rootsler Gains — Implementation Plan

All issues from `LAUNCH_AUDIT.md`, sequenced by dependency order and priority. 4 phases, ~30 tasks.

---

## Phase 0: Foundation Fixes (Do First — Everything Else Depends on These)

These touch core types and infrastructure. Get them wrong and every subsequent phase breaks.

---

### 0.1 Fix the test suite

**Why first:** We need tests running before making any logic changes, so we can verify correctness as we go.

**Root cause:** `vitest.config.ts` imports from `'vitest/config'` which doesn't exist in vitest 4.x. The subpath export was added in vitest 5.x but `package.json` pins `"vitest": "^4.0.18"`.

**Files:**
- `vitest.config.ts` line 1 — change `import { defineConfig } from 'vitest/config'` to `import { defineConfig } from 'vite'`
- OR upgrade vitest to 5.x in `package.json` (riskier — may need test updates)

**Steps:**
1. Change the import in `vitest.config.ts` to use `'vite'` instead of `'vitest/config'`
2. Run `npm install` to ensure dependencies resolve
3. Run `npx vitest run` and confirm all 7 existing test files pass
4. Fix any test failures introduced by the dependency resolution

**Verify:** `npx vitest run` completes with 0 failures.

---

### 0.2 Merge "back" and "lats" into a single muscle group

**Why early:** This changes the `MuscleGroup` union type, which propagates to the exercise database, volume landmarks, volume tracking, components, and everything that references muscle groups. Every subsequent change (volume validation, landmark personalization) depends on the muscle list being correct.

**Files to change (11 files, ~25 edits):**

| File | What to change |
|------|---------------|
| `src/lib/types.ts:88` | Remove `'lats'` from `MuscleGroup` union type |
| `src/lib/workout-generator.ts:42` | Remove `lats` entry from `VOLUME_LANDMARKS`. Adjust `back` values if needed (keep back at MEV 8, MAV 16, MRV 22 — already accounts for lats) |
| `src/lib/workout-generator.ts:635,639` | Remove `'lats'` from upper body muscle list — it's now just `'back'` |
| `src/lib/workout-generator.ts:1141` | Remove `lats: 0` from `volumeByMuscle` initialization |
| `src/lib/exercises.ts` (~18 exercises) | Replace every `'lats'` in `primaryMuscles`/`secondaryMuscles` arrays with `'back'`. Where an exercise has both `'back'` and `'lats'`, consolidate to just `'back'`. Exercises to update: lat-pulldown, cable-row, bent-row, pull-up, chin-up, seated-row, t-bar-row, single-arm-row, inverted-row, face-pull, dead-hang, and any others found with grep |
| `src/components/CustomExerciseCreator.tsx:31` | Remove `'lats'` from muscle group selection array |
| `src/components/VolumeHeatMap.tsx:19` | Remove `'lats'` from muscle group array |
| `src/components/WorkoutBuilder.tsx:93` | Change `['chest', 'back', 'lats', 'shoulders']` to `['chest', 'back', 'shoulders']` |
| `src/components/WorkoutHistory.tsx:95` | Remove `'lats'` from `orderedMuscles` array |
| `src/lib/block-suggestion.ts` | Check if `lats` is referenced in muscle analysis — update any references |
| `src/lib/mobility.ts:765` | Dead Hang exercise — replace `'lats'` with `'back'` |

**Steps:**
1. Update `types.ts` — remove `'lats'` from the union type
2. Update `workout-generator.ts` — remove lats from landmarks, upper body list, volume init
3. Update `exercises.ts` — bulk replace `'lats'` with `'back'`, deduplicate where both appear
4. Update all 4 components — remove `'lats'` from UI arrays
5. Update `block-suggestion.ts` and `mobility.ts`
6. Run TypeScript compiler to catch any remaining `'lats'` references: `npx tsc --noEmit`
7. Run tests

**Verify:** `npx tsc --noEmit` passes. `grep -r "'lats'" src/` returns zero results. Tests pass.

---

### 0.3 Add age and bodyweight to onboarding

**Why early:** The performance engine, nutrition system, and safety guards all depend on having these values.

**Files to change (5 files):**

| File | What to change |
|------|---------------|
| `src/lib/types.ts:48` | Add `bodyWeightKg?: number` to `UserProfile` interface |
| `src/lib/types.ts:946` | Add `bodyWeightKg?: number` to `OnboardingData` interface |
| `src/components/Onboarding.tsx` | **Step 1 UI:** Add age number input (the field exists in the type but the UI doesn't ask for it) and bodyweight input with unit toggle (kg/lbs). Add validation in `canProceed()` for step 1: age must be > 0, bodyweight must be > 0 |
| `src/lib/store.ts:530-591` | In `completeOnboarding`: map `onboardingData.bodyWeightKg` to `user.bodyWeightKg`. The `age` mapping already exists at line 538 |
| `src/components/ProfileSettings.tsx` | Add editable fields for age and bodyweight so users can update them later |

**Steps:**
1. Add `bodyWeightKg` to both interfaces in `types.ts`
2. Update `Onboarding.tsx` Step 1 to include age and bodyweight fields. Age: simple number input, placeholder "Age". Bodyweight: number input with a lbs/kg toggle. If user enters lbs, convert to kg on save (divide by 2.205)
3. Update `canProceed()` step 1 validation: require `age >= 14` and `bodyWeightKg > 0`
4. Update `store.ts` `completeOnboarding` to map the new field
5. Update `ProfileSettings.tsx` to allow editing
6. Add smart defaults in the `useEffect` block (line 79-90): default age to 25, bodyweight to null (must be entered)

**Verify:** Complete onboarding flow. Check that `user.age` and `user.bodyWeightKg` are populated in the store after completion.

---

## Phase 1: Safety & Legal (Highest Liability, Low Implementation Effort)

---

### 1.1 Add medical disclaimer screen

**File:** `src/components/Onboarding.tsx`

**Steps:**
1. Change `TOTAL_STEPS` from 3 to 4
2. Add a new Step 0 (before current Step 1) that displays:
   - Health disclaimer text
   - "This app provides general fitness programming and is not a substitute for medical advice. Consult a physician before starting any exercise program."
   - "By proceeding, you acknowledge that you exercise at your own risk."
   - Checkbox: "I understand and accept"
3. `canProceed()` for the new step 0: checkbox must be checked
4. Renumber existing steps (1→2, 2→3, 3→4)
5. Store acceptance in `onboardingData` (add `disclaimerAccepted: boolean` to `OnboardingData` in `types.ts`)
6. Store acceptance timestamp in `UserProfile` (add `disclaimerAcceptedAt?: Date`)

**Verify:** Cannot proceed past first screen without checking the box. Acceptance is persisted.

---

### 1.2 Add age gate

**File:** `src/components/Onboarding.tsx`

**Steps:**
1. In the age input (added in 0.3), add validation: if age < 16, show a blocking message: "You must be at least 16 years old to use this app, or have parental consent."
2. Add a "I have parental consent" checkbox that appears only when age is 14-15
3. If age < 14, block entirely — no consent override
4. Store consent in `onboardingData` (add `parentalConsent?: boolean`)

**Verify:** Enter age 13 → blocked. Age 15 → blocked until consent checkbox. Age 16+ → proceeds normally.

---

### 1.3 Guard beginners from power training

**File:** `src/lib/workout-generator.ts`

**Steps:**
1. In `generateMesocycleWeek` (line 846-855), after determining `workoutTypes`:
```typescript
// Safety: beginners should not do power training
if (experienceLevel === 'beginner') {
  workoutTypes = workoutTypes.map(t => t === 'power' ? 'hypertrophy' : t);
}
```
2. In `WORKOUT_PRESCRIPTIONS.power` (line 76), add a comment noting this is only for intermediate+ users
3. In the onboarding UI, if experience is "beginner" and goal is "power", show a note: "Power training will be introduced after your first training block. Starting with hypertrophy for safety."

**Verify:** Generate a mesocycle with `experienceLevel: 'beginner'` and `sessionsPerWeek: 3`. Confirm no power-type sessions appear.

---

### 1.4 Add joint pain escalation logic

**File:** `src/lib/auto-adjust.ts`

**Steps:**
1. Add a new exported function:
```typescript
export function getJointPainHistory(
  exerciseId: string,
  recentLogs: WorkoutLog[]
): { count: number; bodyRegion: string | null; shouldForceSwap: boolean; shouldRecommendRest: boolean }
```
2. Logic: scan `recentLogs` for `feedback.jointPain === true` on the same `exerciseId`. Count occurrences.
   - 1 occurrence → recommend swap (existing behavior)
   - 2 occurrences in same mesocycle → `shouldForceSwap: true`
   - 3+ occurrences in same body region across any exercise → `shouldRecommendRest: true`
3. In `applyAdjustmentsToSession` (line 340), call `getJointPainHistory` and:
   - If `shouldForceSwap`, auto-swap the exercise to the first alternative
   - If `shouldRecommendRest`, add a critical adjustment with reason "Repeated joint pain in {region} — consider a rest day and consult the injury logger"
4. **File:** `src/components/ActiveWorkout.tsx` — when `shouldForceSwap` is true, show a prominent warning banner instead of a dismissible suggestion

**Verify:** Write a test in `auto-adjust.test.ts` that simulates 2 joint pain reports and confirms `shouldForceSwap` is true.

---

### 1.5 Add critical readiness interstitial

**File:** `src/components/ActiveWorkout.tsx`

**Steps:**
1. In the workout overview screen (shown before starting exercises), check if readiness score is < 30
2. If critical: show a full-screen overlay with:
   - "Your recovery is compromised"
   - List of low-scoring factors
   - "Consider resting today" button (cancels workout)
   - "I understand the risk — train anyway" button (continues, logs that the user overrode the warning)
3. Store the override decision in the workout log for trend analysis

**Verify:** Set up a scenario with poor sleep/high stress/low motivation in pre-check-in. Confirm overlay appears.

---

## Phase 2: Core Hypertrophy Logic Fixes (The Programming Engine)

---

### 2.1 When goal is hypertrophy, use all-hypertrophy sessions

**File:** `src/lib/workout-generator.ts`

**Steps:**
1. Add a new constant after `UNDULATING_SCHEMES` (line 207):
```typescript
const HYPERTROPHY_FOCUSED_SCHEMES: Record<number, WorkoutType[]> = {
  1: ['hypertrophy'],
  2: ['hypertrophy', 'hypertrophy'],
  3: ['hypertrophy', 'hypertrophy', 'hypertrophy'],
  4: ['hypertrophy', 'hypertrophy', 'hypertrophy', 'hypertrophy'],
  5: ['hypertrophy', 'hypertrophy', 'hypertrophy', 'hypertrophy', 'hypertrophy'],
  6: ['hypertrophy', 'hypertrophy', 'hypertrophy', 'hypertrophy', 'hypertrophy', 'hypertrophy'],
};
```
2. Similarly, add `STRENGTH_FOCUSED_SCHEMES` (all strength) and `POWER_FOCUSED_SCHEMES` (all power)
3. In `generateMesocycleWeek` (lines 847-855), modify the undulating branch:
```typescript
} else {
  // Undulating: use goal-specific schemes when goal is focused,
  // use DUP rotation only for 'balanced' goal
  if (goalFocus === 'hypertrophy') {
    workoutTypes = HYPERTROPHY_FOCUSED_SCHEMES[sessionsPerWeek];
  } else if (goalFocus === 'strength') {
    workoutTypes = STRENGTH_FOCUSED_SCHEMES[sessionsPerWeek];
  } else {
    // 'balanced' and 'power' keep DUP for variety
    workoutTypes = UNDULATING_SCHEMES[sessionsPerWeek];
  }
}
```
4. Keep the user's ability to manually select "undulating" periodization in onboarding to override this
5. Update the `MOVEMENT_PATTERNS_PER_SESSION` for hypertrophy-focused splits to ensure balanced movement pattern coverage across all-hypertrophy sessions (vary push/pull/squat/hinge patterns across days)

**Verify:** Generate a mesocycle with `goalFocus: 'hypertrophy'`, `sessionsPerWeek: 4`, `periodizationType: undefined`. Confirm all 4 sessions per week are type `'hypertrophy'`. Then generate with `goalFocus: 'balanced'` and confirm DUP is still used.

---

### 2.2 Add per-muscle-group volume validation to the generator

**File:** `src/lib/workout-generator.ts`

**Steps:**
1. Add a new function after `analyzeMuscleGroupVolume` (line 1161):
```typescript
export function validateAndFixMuscleVolume(
  weeks: MesocycleWeek[],
  landmarks: typeof VOLUME_LANDMARKS,
  availableExercises: Exercise[],
  equipment: Equipment
): { weeks: MesocycleWeek[]; warnings: string[] }
```
2. Logic for each non-deload week:
   a. Call `analyzeMuscleGroupVolume` on the week's sessions to get per-muscle set counts
   b. For each muscle group, compare weekly sets to MEV and MRV from landmarks
   c. **Undertrained (below MEV):** Find an isolation exercise for that muscle from `availableExercises`. Add it to the session with the fewest exercises, with 3 sets. Repeat until MEV is met or no more exercises available
   d. **Overtrained (above MRV):** Remove sets from the exercise contributing the most volume to that muscle group (reduce by 1 set at a time, minimum 2 sets per exercise). If still over, remove the lowest-scored isolation exercise for that muscle
   e. Collect warnings for any muscle group that couldn't be brought into range
3. In `generateMesocycle` (line 969), call `validateAndFixMuscleVolume` before the return statement:
```typescript
const { weeks: validatedWeeks, warnings } = validateAndFixMuscleVolume(
  mesocycleWeeks, VOLUME_LANDMARKS,
  getExercisesByGranularEquipment(equipment, availableEquipment), equipment
);
// Store warnings in mesocycle metadata for display
```
4. Add a `volumeWarnings?: string[]` field to the `Mesocycle` interface in `types.ts`
5. **File:** `src/components/WorkoutView.tsx` — display volume warnings (if any) as an info banner at the top of the program view

**Verify:** Write a test that generates a mesocycle with minimal equipment (bodyweight only) and confirms no muscle group exceeds MRV. Write another test that confirms a 1-session/week full body plan meets MEV for at least the major groups.

---

### 2.3 Implement double progression

**Files:** `src/lib/auto-adjust.ts`, `src/lib/types.ts`

**Steps:**
1. Add to `types.ts`:
```typescript
export interface ProgressionState {
  exerciseId: string;
  currentWeight: number;
  targetRepRange: [number, number]; // e.g., [8, 12]
  lastRepsAchieved: number[];      // reps per set in last session
  readyToProgress: boolean;        // true if all sets hit top of range
}
```
2. Add a new function to `auto-adjust.ts`:
```typescript
export function evaluateDoubleProgression(
  exerciseId: string,
  targetRepRange: [number, number],
  previousLogs: WorkoutLog[],
  weightIncrement: number // 2.5 for kg, 5 for lbs
): { action: 'increase_weight' | 'increase_reps' | 'maintain' | 'decrease_weight';
     newWeight?: number;
     reason: string }
```
3. Logic:
   - Find most recent log for this exercise
   - If all completed sets achieved `targetRepRange[1]` (top of range) → `increase_weight` by `weightIncrement`, reset target reps to `targetRepRange[0]` (bottom of range)
   - If all sets achieved at least `targetRepRange[0]` but not all hit the top → `increase_reps` (maintain weight, aim for +1 rep next time)
   - If any set failed to reach `targetRepRange[0]` → `maintain` (same weight, same target)
   - If 2+ consecutive sessions failed to reach bottom of range → `decrease_weight` by `weightIncrement`
4. **File:** `src/components/ActiveWorkout.tsx` — integrate double progression suggestions alongside the existing `getSuggestedWeight` logic. Show "Hit 12 reps on all sets? Weight goes up next time!" as a motivational cue when the user is close

**Verify:** Write tests covering each progression scenario.

---

### 2.4 Progressive rep targets across the mesocycle

**File:** `src/lib/workout-generator.ts`

**Steps:**
1. Replace the random rep target logic in `createSetPrescription` (line 436):
```typescript
// Before (random):
targetReps: randomBetween(config.reps[0], config.reps[1]),

// After (progressive):
// weekNumber determines where in the rep range we target
// Week 1: top of range (lighter, higher reps — accumulation)
// Final week before deload: bottom of range (heavier, lower reps — intensification)
```
2. `createSetPrescription` needs a new parameter: `weekNumber` and `totalWeeks`
3. Calculate:
```typescript
const repRangeSpread = config.reps[1] - config.reps[0];
const progressFraction = (weekNumber - 1) / Math.max(1, totalWeeks - 2); // 0 to 1
const targetReps = Math.round(config.reps[1] - progressFraction * repRangeSpread);
```
4. This means Week 1 of a hypertrophy block targets ~12 reps, Week 4 targets ~6 reps
5. Thread `weekNumber` and `totalWeeks` through `generateWorkoutSession` → `createSetPrescription`

**Verify:** Generate a 5-week mesocycle. Check that week 1 hypertrophy sessions target ~12 reps and week 4 targets ~6 reps.

---

### 2.5 Reduce beginner linear progression rate

**File:** `src/lib/workout-generator.ts:869-871`

**Steps:**
1. Change:
```typescript
// Before:
volumeMultiplier = 1 + (weekNumber - 1) * 0.05;
intensityMultiplier = 1 + (weekNumber - 1) * 0.02;

// After:
volumeMultiplier = 1 + (weekNumber - 1) * 0.03;  // 3% per week instead of 5%
intensityMultiplier = 1 + (weekNumber - 1) * 0.015; // 1.5% per week instead of 2%
```

**Verify:** Generate a 5-week beginner mesocycle. Week 4 volume should be ~9% above week 1, not ~20%.

---

### 2.6 Fix calves MEV

**File:** `src/lib/workout-generator.ts:38`

**Steps:**
1. Change `calves: { mev: 6, mav: 12, mrv: 18 }` to `calves: { mev: 4, mav: 10, mrv: 16 }`
2. Consistent with RP recommendations for calves

**Verify:** Trivial — visual check.

---

## Phase 3: UX & Quality of Life

---

### 3.1 Add warm-up set calculation

**File:** `src/lib/workout-generator.ts`

**Steps:**
1. Add a new exported function:
```typescript
export function generateWarmUpSets(
  workingWeight: number,
  workingReps: number,
  weightUnit: 'kg' | 'lbs'
): { weight: number; reps: number; note: string }[]
```
2. Logic:
```typescript
const barWeight = weightUnit === 'kg' ? 20 : 45;
const increment = weightUnit === 'kg' ? 2.5 : 5;
const sets = [];
if (workingWeight > barWeight * 2) {
  sets.push({ weight: barWeight, reps: 10, note: 'Empty bar — groove the pattern' });
  sets.push({ weight: round(workingWeight * 0.5, increment), reps: 5, note: 'Light warm-up' });
  sets.push({ weight: round(workingWeight * 0.7, increment), reps: 3, note: 'Medium warm-up' });
  sets.push({ weight: round(workingWeight * 0.85, increment), reps: 1, note: 'Heavy single — prime the nervous system' });
} else if (workingWeight > barWeight) {
  sets.push({ weight: barWeight, reps: 8, note: 'Empty bar' });
  sets.push({ weight: round(workingWeight * 0.7, increment), reps: 5, note: 'Warm-up' });
} else {
  sets.push({ weight: 0, reps: 10, note: 'Bodyweight movement warm-up' });
}
return sets;
```
3. **File:** `src/components/ActiveWorkout.tsx` — for the first compound exercise in a session, show the warm-up sets as collapsible UI above the working sets. Only show for exercises where the user has a known working weight (from previous session data)

**Verify:** With a working weight of 225 lbs, confirm warm-up sets generate: 45x10, 115x5, 160x3, 190x1.

---

### 3.2 Add "Skip check-in" option

**File:** `src/components/ActiveWorkout.tsx`

**Steps:**
1. In the pre-workout check-in section, add a "Skip" button
2. Add a "Don't ask again this week" checkbox
3. Store skip preference in localStorage with a 7-day expiry
4. When skipped, the readiness score is set to null (neutral — no adjustments applied)

**Verify:** Click skip. Confirm workout loads without adjustments. Re-open workout next day, confirm check-in still skipped if "Don't ask again" was checked.

---

### 3.3 Consistent session naming

**File:** `src/lib/workout-generator.ts:670-684`

**Steps:**
1. Replace random session names with structured naming:
```typescript
const sessionName = `Week ${weekNumber} / Day ${dayNumber} — ${capitalize(type)}`;
// e.g., "Week 2 / Day 1 — Hypertrophy"
```
2. Keep the fun names as subtitles in the UI if desired, but the primary name should be navigable

---

### 3.4 Reduce feature clutter for free users

**File:** `src/components/Dashboard.tsx`

**Steps:**
1. Find where overlay tiles/menu items are rendered for locked features
2. For free tier users: show at most 3 locked feature teasers (the most relevant to their goal)
3. Collapse all other locked features into a single "See all Pro features" link
4. Ensure the free experience feels complete — the home tab, workout view, progress tab, and profile should all feel finished, not crippled

---

### 3.5 Add baseline lift collection in onboarding (optional step)

**File:** `src/components/Onboarding.tsx`

**Steps:**
1. After the new step with age/bodyweight, add an optional step: "Estimate Your Lifts"
2. Show 4-5 key exercises (squat, bench, deadlift, overhead press, row) with weight inputs
3. "I'm new — skip this" button that auto-estimates conservative working weights based on bodyweight:
   - Squat: 0.5x bodyweight
   - Bench: 0.4x bodyweight
   - Deadlift: 0.6x bodyweight
   - OHP: 0.3x bodyweight
   - Row: 0.4x bodyweight
4. These flow into `baselineLifts` in the store and are used to calculate initial working weights from %1RM prescriptions

---

## Phase 4: Testing & Polish

---

### 4.1 Write tests for all new logic

**Files:** `src/__tests__/`

New test files to create:
| Test file | Covers |
|-----------|--------|
| `volume-validation.test.ts` | Per-muscle volume validation (2.2) |
| `double-progression.test.ts` | Double progression model (2.3) |
| `joint-pain-escalation.test.ts` | Joint pain history and forced swaps (1.4) |
| `warm-up-sets.test.ts` | Warm-up set calculation (3.1) |
| `beginner-safety.test.ts` | No power for beginners (1.3), age gate logic |

Extend existing tests:
| Test file | Add tests for |
|-----------|--------------|
| `auto-adjust.test.ts` | Double progression, joint pain escalation |
| `workout-generator.test.ts` (create) | Hypertrophy-goal all-hypertrophy sessions, progressive rep targets, beginner progression rate, volume validation |

### 4.2 Run full test suite and fix failures

After all changes, run `npx vitest run` and fix everything.

### 4.3 TypeScript strict check

Run `npx tsc --noEmit` and resolve all type errors.

### 4.4 Manual smoke test

Walk through the full user journey:
1. Fresh onboarding (check disclaimer, age gate, age/weight collection)
2. Generate mesocycle as beginner with hypertrophy goal (confirm no power sessions, progressive reps)
3. Start a workout (confirm warm-up sets, check-in skip works)
4. Log a session with joint pain (confirm escalation)
5. Complete 3 sessions (confirm double progression kicks in)
6. Check volume heatmap (confirm no "lats" group, back volume looks correct)

---

## Execution Order (Dependency-Aware)

```
Week 1: Foundation
├── 0.1 Fix vitest                     (0.5 day)
├── 0.2 Merge back/lats                (1 day)
├── 0.3 Add age/bodyweight onboarding  (0.5 day)
└── Run tests, confirm clean state

Week 1-2: Safety
├── 1.1 Medical disclaimer             (0.5 day)
├── 1.2 Age gate                       (0.25 day)
├── 1.3 Beginner power guard           (0.25 day)
├── 1.4 Joint pain escalation          (0.5 day)
└── 1.5 Critical readiness interstitial (0.5 day)

Week 2-3: Core Logic
├── 2.1 Hypertrophy-focused sessions   (0.5 day)  ← depends on 0.2
├── 2.2 Per-muscle volume validation   (1-1.5 days) ← depends on 0.2
├── 2.3 Double progression             (1 day)
├── 2.4 Progressive rep targets        (0.5 day)
├── 2.5 Beginner progression rate      (0.25 day)
└── 2.6 Fix calves MEV                 (5 min)

Week 3-4: UX & Polish
├── 3.1 Warm-up set calculation        (0.5 day)
├── 3.2 Skip check-in option           (0.25 day)
├── 3.3 Consistent session naming      (0.25 day)
├── 3.4 Reduce feature clutter         (0.5 day)
├── 3.5 Baseline lift collection       (0.5 day)
├── 4.1 Write all new tests            (1 day)
├── 4.2 Full test suite pass           (0.5 day)
├── 4.3 TypeScript strict check        (0.25 day)
└── 4.4 Manual smoke test              (0.5 day)
```

**Total estimated effort:** ~12-14 working days for a single developer

---

## What NOT to Do

- Do NOT start volume validation (2.2) before merging back/lats (0.2) — the muscle list must be correct first
- Do NOT add individualized volume landmarks yet — that's a post-launch enhancement that requires multiple mesocycles of user data to calibrate
- Do NOT refactor `store.ts` into smaller modules now — it's a maintenance issue, not a launch blocker
- Do NOT cut features (illness engine, gamification badges, etc.) — they're already built. Just don't promote them heavily at launch
- Do NOT add MV (Maintenance Volume) landmarks yet — the existing deload/cut volume reduction works well enough for launch
