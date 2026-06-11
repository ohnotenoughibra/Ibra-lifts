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

### Selector storms — `.filter()` in selectors + whole-store subscriptions (P1)
**Priority:** P1
**From:** general audit 2026-06-11 (see tasks/audit-2026-06-11.md)
HomeTab (default tab), Dashboard (app root), ActiveWorkout (in-workout UI) re-render
on every store write via fresh-ref selectors; ProgressTab ×3; 31 components use
whole-store `useAppStore()`. Fix pattern established in WorkoutView/BlockManagerSheet.

## Data Correctness

### UTC date-keying family — 9 remaining instances (P1)
**Priority:** P1
**From:** general audit 2026-06-11
Wellness XP/streaks, competition dates (fight-day directives!), workout skips,
weekly badge buckets, streak shield, dual-day detection, nutrition day keys,
water/supplements/login rollover, DST streak math. One `localDayKey()` helper +
sweep; fix `utils.ts safeDayKey` (itself UTC) first.

### Brzycki e1RM uncapped — negative/absurd 1RMs and false PRs (P1)
**Priority:** P1
**From:** general audit 2026-06-11
9 call sites; bodyweight backfill amplifies (30-rep push-ups → 430kg e1RM).
Shared calc1RM with rep cap 12 or Epley >10.

## Infra

### Dependency vulnerabilities — 20 (1 critical) (P1)
**Priority:** P1
**From:** general audit 2026-06-11
`npm audit fix` now (jspdf critical, non-breaking); schedule @vercel/postgres 0.10
+ Next 15/16 migration.

### skipWaiting force-reloads mid-workout on deploys (P1)
**Priority:** P1
**From:** general audit 2026-06-11
sw.js:21 + controllerchange reload; update banner is dead code; ChunkLoadErrors
masked in Sentry. Banner-driven activation.

### P2 batch (see tasks/audit-2026-06-11.md for full list)
**Priority:** P2
Push send ownership, first-sync pro self-grant, per-instance rate limiter, Whoop
token crypto fail-closed + deletion cascade, SW API-cache logout purge, sync-queue
quota/full-snapshot/stamp-at-queue-time, Sentry userId scrubbing, NaN volume guard,
pause-duration edge, localStorage silent failures, 37 aria-labels, unbounded
WorkoutHistory list, manifest id/scope, SW fetch timeouts, queue order sync.
