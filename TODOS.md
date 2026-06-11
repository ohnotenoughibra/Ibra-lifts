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

### Audit P2 batch completed in v2.2.1 (2026-06-11)
Push send/subscribe ownership + rate limit, first-sync pro-grant strip,
global (Postgres) AI-coach limit, Whoop token crypto fail-closed + deletion
cascade, SW logout cache purge + no-auth-caching + fetch timeouts, sync-queue
coalescing + stamp-at-queue, localStorage non-quota surfacing, Sentry PII
scrubbing, manifest id/scope, queue-reorder-survives-sync, WorkoutHistory 90d,
33 aria-labels. Remaining from audit: Next.js 15/16 major upgrade (the last
dependency advisories); 30-day tombstone-GC vs >30d-offline resurrection
(documented tradeoff). See tasks/audit-2026-06-11.md.
