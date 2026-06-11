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
