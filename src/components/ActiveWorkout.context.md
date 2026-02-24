# ActiveWorkout.tsx — Structural Map

~4,100 lines. The largest component. Do NOT read entirely.

## Section Index

| Section | Lines | What's There |
|---------|-------|-------------|
| Imports | 1–61 | React, Framer Motion, store, 15+ engine imports |
| MiniPlateCalc | 62–130 | Inline plate calculator (sub-component) |
| ActiveWorkout function | 131–4103 | Main component |
| Store access | 137–164 | useAppStore with useShallow + individual selectors |
| Local state | 166–231 | ~65 useState hooks (!) |
| Swipe handlers | 233–250 | Left/right swipe for exercise navigation |
| Pre-workout check-in | 279–330 | Sleep, nutrition, stress, soreness, motivation |
| Timer effects | 334–405 | Duration timer + rest timer with haptic feedback |
| PR detection | 407–430 | Memoized personal record checking |
| Set value handlers | 433–510 | updateSetValue, setExactValue, tempo controls |
| completeSet | 512–680 | Core set completion logic + coach messages |
| Exercise feedback | 682–790 | Post-exercise difficulty/pain/form feedback |
| Pre-check-in submit | 724–803 | Processes check-in → throttle → warm-up → grappling |
| Inline feedback | 792–808 | Quick difficulty rating |
| Undo/Extra sets | 810–855 | Undo last set, add extra set |
| Helper functions | 854–1100 | Format time, volume calc, equipment, exercise lists |
| Weight suggestions | 1012–1100 | RPE-based weight suggestions, first-time estimates |
| JSX: Overview screen | ~1100–2200 | Pre-workout overview, exercise list, check-in form |
| JSX: Active exercise | ~2200–3400 | Set logging, timer, rest overlay, plate calc |
| JSX: Completion modal | ~3400–3700 | Workout summary, PR celebration, feedback |
| JSX: Modals | ~3700–4103 | Swap, add exercise, history, cancel confirm |

## Key State Variables

### Navigation
- `currentExerciseIndex` / `currentSetIndex` — Position in workout
- `showOverview` — Overview vs active exercise view

### Rest Timer
- `isResting` / `restEndTime` — Rest period state
- `restMinimized` — Collapse rest overlay

### Modals
- `showFinishModal` — Completion screen
- `showSwapModal` — Exercise swap picker
- `showAddExerciseModal` — Add bonus exercise
- `showHistoryModal` — Exercise history
- `showCancelConfirm` — Cancel workout confirmation
- `showRPEInfo` — RPE explainer
- `formCheckExercise` — YouTube form check video

### Features
- `throttleResult` / `throttleApplied` — Readiness throttle state
- `coachMessages` — Corner coach messages between sets
- `warmUpProtocol` / `showWarmUp` — Smart warm-up
- `tempoState` / `tempoPrescription` — Tempo training metronome
- `supersetCandidates` — Detected superset opportunities
- `rpeRegulation` — RPE regulation warnings

### Workout Context
- `checkIn` — Pre-workout check-in data
- `exerciseFeedback` — Per-exercise feedback
- `feedback` — Post-workout overall feedback
- `grapplingToday` — Same-day grappling intensity
- `whoopApplied` / `whoopFollowed` — Whoop integration tracking

## Core Flow

```
1. showOverview = true
   → Pre-workout check-in (sleep, nutrition, stress, soreness)
   → submitPreCheckIn() applies:
     - Readiness throttle (volume/intensity reduction if low readiness)
     - Smart warm-up generation for first compound
     - Grappling interference detection
     - Critical readiness warning if score < 30

2. showOverview = false, exercise navigation
   → currentExerciseIndex + currentSetIndex track position
   → User logs weight/reps/RPE per set
   → completeSet() handles:
     - PR detection (weight, volume, e1RM)
     - Confetti + haptics on PR
     - Corner coach message generation
     - Rest timer start
     - Auto-advance to next set/exercise

3. All exercises done → showFinishModal
   → Post-workout feedback (feeling, notes)
   → Duration override option
   → Calls store.completeWorkout()
```

## Engine Integrations

| Engine | Usage in ActiveWorkout |
|--------|----------------------|
| `auto-adjust` | Readiness calculation, weight suggestions, personal baseline |
| `readiness-throttle` | Volume/intensity gates based on readiness score |
| `corner-coach` | Between-set motivational/tactical messages |
| `rpe-regulator` | Warns when RPE is chronically too high |
| `warmup-generator` | Smart warm-up for first compound exercise |
| `superset-engine` | Detects superset opportunities in exercise list |
| `tempo-engine` | Tempo metronome (eccentric/pause/concentric timing) |
| `injury-science` | Active injury adaptations |
| `weight-estimator` | First-time weight estimation for new exercises |
| `exercises` | Exercise library, alternatives, recommendations |
| `workout-generator` | 1RM calculation |
| `knowledge` | Random training tips during rest |
