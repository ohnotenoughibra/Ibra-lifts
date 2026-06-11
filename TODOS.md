# TODOS

## Completed

### Sync merge cannot represent "block stopped" or honor undo (was P0)
**Completed:** v2.1.1 (2026-06-10) — branch fix/sync-merge-block-lifecycle
All three holes closed in `resolveConflicts` (terminal-finality + resurrection-dedup
rules keyed on archive `updatedAt` stamps; timestamp-aware XP via `pointsAsOf`)
plus queue tombstones end-to-end. 12 merge round-trip tests + 3 store tests.

### Remove-week can shift workout-log attribution (was P1)
**Completed:** v2.1.1 (2026-06-10)
`ScheduleSheet` prefers the last UNTRAINED week; explicit confirm when every
removable week has logged sessions.

### Bootstrap a browser E2E framework for Train flows (was P1)
**Completed:** v2.1.1 (2026-06-10)
Playwright (`npm run test:e2e`, Pixel 5 / Chromium, auto-boots dev server).
6 tests cover hero, schedule sheet, stop→undo, queue→switch, exercise-remove
undo, and the zero-work completion guard.

## UI Performance


## Data Correctness



## Infra



### P2 batch (see tasks/audit-2026-06-11.md for full list)
**Priority:** P2
Push send ownership, first-sync pro self-grant, per-instance rate limiter, Whoop
token crypto fail-closed + deletion cascade, SW API-cache logout purge, sync-queue
quota/full-snapshot/stamp-at-queue-time, Sentry userId scrubbing, NaN volume guard,
pause-duration edge, localStorage silent failures, 37 aria-labels, unbounded
WorkoutHistory list, manifest id/scope, SW fetch timeouts, queue order sync.

### Audit P1s completed in v2.2.0 (2026-06-11)
Selector re-render storms (14 components), UTC date-keying family (one
localDayKey helper + sweep), uncapped Brzycki e1RM, dependency vulns
(20→4; rest need Next major), skipWaiting mid-workout reload. See
tasks/audit-2026-06-11.md for the P2 batch still outstanding.
