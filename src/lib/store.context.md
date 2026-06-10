# store.ts — Structural Map

~5,000 lines. Do NOT read entirely. Use this map to navigate.

## Section Index

| Section | Lines | What's There |
|---------|-------|-------------|
| Imports | 1–115 | Engine imports (~15 engines) |
| BlockUndoEntry | 117–134 | Snapshot shape for block-level undo |
| AppState interface | 136–623 | State fields (137–335) + action signatures (336–623) |
| Initial values | 625–671 | Default state, onboarding template |
| withBlockUndo helper | 672–723 | Undo snapshot wrapper (depth guard, phantom-entry drop) |
| Store creation | 725–824 | Initial state values |
| User/Auth actions | 825–961 | setUser, logout, onboarding |
| Equipment actions | 962–1326 | Equipment profile switching, baselines |
| Mesocycle actions | 1327–1968 | Generate, complete, stop, undo, queue, switch, migrate |
| Workout actions | 1969–2933 | Start, log, swap, complete, cancel; week/exercise editing ~2230–2500 |
| Gamification actions | 2934–3659 | Points, badges, streaks, wellness XP |
| Health tracking | 3660–4115 | Body weight, quick logs, cycle, grip, injury, illness, skips |
| Theme/Nutrition | 4116–4354 | Theme, meals, macros, water, diet phases |
| Other actions | 4355–4551 | Body comp, sync conflicts, subscriptions, mental, knowledge, tips |
| System/Reset | 4552–4651 | resetStore, cleanup |
| Storage config | 4652–4810 | Custom localStorage/IndexedDB strategy |
| Migration | 4811–4930 | Version 0→4 data migrations |
| Partialize | 4931–5014 | Which fields persist (and which don't) |
| Selector hooks | 5016+ | useUser(), useActiveWorkout(), etc. |

## State Domains (AppState interface, lines 136–335)

### User & Auth (138–144)
`user`, `isAuthenticated`, `isOnboarded`, `onboardingData`

### Training Program (146–153)
`baselineLifts`, `currentMesocycle`, `mesocycleHistory`, `mesocycleQueue`, `blockUndoStack` (in-memory only)

### Workout Execution (155–169)
`activeWorkout` (session + exerciseLogs + startTime + preCheckIn), `workoutMinimized`, `workoutLogs`

### Gamification (172)
`gamificationStats` (points, level, streak, badges, wellness, challenges)

### Health Tracking (175–214)
`bodyWeightLog`, `quickLogs` (water/sleep/energy/readiness/mobility), `gripTests`, `injuryLog`, `illnessLogs`, `workoutSkips`, `cycleLogs`, `bodyComposition`

### Exercise & Templates (216–226)
`customExercises`, `sessionTemplates`, `hrSessions`, `trainingSessions`

### Equipment & UI (228–231)
`themeMode`, `colorTheme`, `activeEquipmentProfile`, `homeGymEquipment`, `muscleEmphasis`

### Nutrition (232–260)
`meals`, `macroTargets`, `waterLog`, `activeDietPhase`, `dietPhaseHistory`, `weeklyCheckIns`, `nutritionPeriodPlan`, `mealReminders`

### Combat (262–280)
`competitions`, `weightCutPlans`, `combatNutritionProfile`, `fightCampPlans`, `activeSupplements`, `supplementStack`, `supplementIntakes`

### Wearables (281–285)
`latestWhoopData`, `wearableHistory`, `whoopWorkouts`

### Mental & Knowledge (321–330)
`mentalCheckIns`, `confidenceLedger`, `featureFeedback`, `seenInsights`, `readArticles`, `bookmarkedArticles`

### System (286–320)
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

## Block Lifecycle & Undo (lines 117–134, 672–723, 1327–1640)

Mesocycle status: `active | completed | upcoming | stopped` (see `types.ts`).

```
currentMesocycle (active)
  ├── completeMesocycle()  → archived 'completed' + 200 XP — but ONLY if ≥1
  │                          logged workout; an untrained block archives as
  │                          'stopped' with no XP (anti-farm guard)
  ├── stopMesocycle()      → archived 'stopped', no XP, no auto-successor
  ├── switchToQueuedBlock()→ stopMesocycle() + advanceMesocycleQueue(),
  │                          collapsed into ONE undo entry
  └── generateNewMesocycle() over a live block → old block archived 'stopped'
```

Only `status === 'completed'` (and not `_deleted`) counts toward
"blocks completed" badges.

**Undo system**: every block action (`generateNewMesocycle`, `completeMesocycle`,
`stopMesocycle`, `deleteMesocycle`, `advanceMesocycleQueue`, `switchToQueuedBlock`,
`addWeekToMesocycle`, `removeWeekFromMesocycle`) is wrapped in `withBlockUndo`,
which pushes a `BlockUndoEntry` snapshot of 6 state slices (`currentMesocycle`,
`mesocycleHistory`, `mesocycleQueue`, `workoutLogs`, `gamificationStats`, `user`)
onto `blockUndoStack` before running. Key properties:

- **Reference snapshots** — store state is immutable, so holding references is O(1)
- **10-entry cap**; guarded no-ops (e.g. addWeek at the `MAX_BLOCK_WEEKS` cap) drop
  their phantom entry so they can't evict real history
- **Depth guard** — nested block actions (complete → auto-generate) collapse into
  one entry, so one undo reverts the whole cascade
- `undoBlockAction(expectedId?)` pops the top entry; the `expectedId` check stops a
  stale toast/modal from popping a newer, unrelated action. Returns the entry label
  (for the "Undid: X" toast) or null. Re-stamps `updatedAt` + sets `_syncUrgent`
- **In-memory only** — never persisted (see partialize), cleared on
  logout/resetStore so undo can't restore another account's data
- Exercise removal undo is separate: `insertExerciseIntoSession` is the inverse of
  `removeExerciseFromSession` (powers the "Exercise removed → Undo" toast)

See `docs/decisions/005-block-undo-snapshots.md` for the design rationale.
Known cross-device sync gaps are tracked in `TODOS.md` (P0).

## Storage Strategy (lines 4652–4810)

```
Write priority:
  1. localStorage (primary)
  2. localStorage with -backup suffix (corruption recovery)
  3. IndexedDB (when localStorage full)

Auto-prune: triggers at ~4.5MB to stay under 5MB limit

Recovery: if primary corrupted, tries backup, then IndexedDB, then server sync
```

## Persistence Rules (partialize, lines 4931–5014)

**NOT persisted** (cleared on refresh):
- `activeWorkout` — in-flight workout state
- `blockUndoStack` — in-memory undo snapshots
- `lastCompletedWorkout` — transient toast data
- `syncConflict` — resolved immediately
- `pendingRemoteData` — merged or discarded

**Everything else persists** to localStorage.

## How to Add New State

1. Add field to `AppState` interface (line 136–335)
2. Set initial value in store creation (line 725–824)
3. Create action using `set()` or `set((state) => ...)`
4. Update `partialize` (line 4931) if field should persist
5. Export selector hook (line 5016+) if frequently read
6. If synced to server: add to sync payload in `db-sync.ts`

## Migration (lines 4811–4930)

Current version: **4**

| Version | Migration |
|---------|-----------|
| 0→1 | Normalize exercise field to standard |
| 1→2 | Ensure sessionId on mesocycle blocks |
| 2→3 | Recalculate streak on load (logic change) |
| 3→4 | Add push notification fields to NotificationPreferences |

When adding a migration: increment version, add case to switch, handle forward migration only.
