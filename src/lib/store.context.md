# store.ts — Structural Map

~3,700 lines. Do NOT read entirely. Use this map to navigate.

## Section Index

| Section | Lines | What's There |
|---------|-------|-------------|
| Imports | 1–83 | Engine imports (~15 engines) |
| AppState interface | 84–484 | All state field definitions |
| Initial values | 486–617 | Default state, onboarding template |
| User/Auth actions | 619–739 | setUser, logout, onboarding |
| Equipment actions | 743–781 | Equipment profile switching |
| Mesocycle actions | 1092–1451 | Generate, complete, queue, migrate |
| Workout actions | 1452–2090 | Start, log, swap, complete, cancel |
| Gamification actions | 2091–2657 | Points, badges, streaks, wellness XP |
| Health tracking | 2658–2975 | Body weight, quick logs, cycle, grip, injury, illness, skips |
| Theme/Nutrition | 3013–3163 | Theme, meals, macros, water, diet phases |
| Other actions | 3164–3342 | Body comp, sync conflicts, subscriptions, mental, knowledge, tips |
| System/Reset | 3343–3500 | resetStore, cleanup |
| Storage config | 3427–3545 | Custom localStorage/IndexedDB strategy |
| Migration | 3571–3619 | Version 0→3 data migrations |
| Partialize | 3620–3678 | Which fields persist (and which don't) |
| Selector hooks | 3683–3693+ | useUser(), useActiveWorkout(), etc. |

## State Domains (AppState interface, lines 84–484)

### User & Auth (85–88)
`user`, `isAuthenticated`, `isOnboarded`, `onboardingData`

### Training Program (93–98)
`baselineLifts`, `currentMesocycle`, `mesocycleHistory`, `mesocycleQueue`

### Workout Execution (101–110)
`activeWorkout` (session + exerciseLogs + startTime + preCheckIn), `workoutMinimized`, `workoutLogs`

### Gamification (112–113)
`gamificationStats` (points, level, streak, badges, wellness, challenges)

### Health Tracking (115–170)
`bodyWeightLog`, `quickLogs` (water/sleep/energy/readiness/mobility), `gripTests`, `injuryLog`, `illnessLogs`, `workoutSkips`, `cycleLogs`, `bodyComposition`

### Exercise & Templates (137–147)
`customExercises`, `sessionTemplates`, `hrSessions`, `trainingSessions`

### Equipment & UI (149–175)
`themeMode`, `colorTheme`, `activeEquipmentProfile`, `homeGymEquipment`, `muscleEmphasis`

### Nutrition (153–165)
`meals`, `macroTargets`, `waterLog`, `activeDietPhase`, `dietPhaseHistory`, `weeklyCheckIns`, `mealReminders`

### Combat (177–195)
`competitions`, `weightCutPlans`, `combatNutritionProfile`, `fightCampPlans`, `activeSupplements`, `supplementStack`, `supplementIntakes`

### Wearables (196–199)
`latestWhoopData`, `wearableHistory`, `whoopWorkouts`

### Mental & Knowledge (230–240)
`mentalCheckIns`, `confidenceLedger`, `featureFeedback`, `seenInsights`, `readArticles`, `bookmarkedArticles`

### System (201–244)
`isOnline`, `lastSyncAt`, `lastCompletedWorkout` (transient), `syncConflict`, `subscription`, `notificationPreferences`, `dailyLoginBonus`

## Workout State Machine

```
null (no workout)
  │ startWorkout()
  ▼
activeWorkout {session, exerciseLogs, startTime}
  │ updateExerciseLog()  — log sets/reps/weight
  │ updateExerciseFeedback() — mark PRs
  │ swapExercise() — substitute exercise
  │ addBonusExercise() — unplanned additions
  │ pauseWorkout() / resumeWorkout()
  │
  ├── completeWorkout()
  │     → Calculate volume, duration, PRs
  │     → Match Whoop HR data
  │     → Create WorkoutLog entry
  │     → Recalculate streak (lifting + training + mobility)
  │     → Award points + check badges
  │     → Set lastCompletedWorkout (transient toast)
  │     → Clear activeWorkout
  │
  └── cancelWorkout()
        → Clear activeWorkout, no logging
```

## Storage Strategy (lines 3427–3545)

```
Write priority:
  1. localStorage (primary)
  2. localStorage with -backup suffix (corruption recovery)
  3. IndexedDB (when localStorage full)

Auto-prune: triggers at ~4.5MB to stay under 5MB limit

Recovery: if primary corrupted, tries backup, then IndexedDB, then server sync
```

## Persistence Rules (partialize, lines 3620–3678)

**NOT persisted** (cleared on refresh):
- `activeWorkout` — in-flight workout state
- `lastCompletedWorkout` — transient toast data
- `syncConflict` — resolved immediately
- `pendingRemoteData` — merged or discarded

**Everything else persists** to localStorage.

## How to Add New State

1. Add field to `AppState` interface (line 84–484)
2. Set initial value in store creation (line 537–617)
3. Create action using `set()` or `set((state) => ...)`
4. Update `partialize` (line 3620) if field should persist
5. Export selector hook (line 3683+) if frequently read
6. If synced to server: add to sync payload in `db-sync.ts`

## Migration (lines 3571–3619)

Current version: **3**

| Version | Migration |
|---------|-----------|
| 0→1 | Normalize exercise field to standard |
| 1→2 | Ensure sessionId on mesocycle blocks |
| 2→3 | Recalculate streak on load (logic change) |

When adding a migration: increment version, add case to switch, handle forward migration only.
