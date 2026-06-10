# TODOS

## Sync / Data Layer

### Sync merge cannot represent "block stopped" or honor undo (P0)
**Priority:** P0
**Deferred from:** redesign/train-tab-block-console ship review (2026-06-10), user-approved deferral
**Where:** `src/lib/db-sync.ts` (`resolveConflicts`), `src/lib/store.ts` (`stopMesocycle`, `undoBlockAction`)

Red-team verified, three holes — all bite only across sync round-trips (multi-device / server merge):
1. **Stop never survives sync:** `stopMesocycle` sets `currentMesocycle: null`, but `resolveConflicts` only overwrites when the local value is truthy (`merged = {...remote}` baseline) — the cloud's still-active copy resurrects, duplicated alongside the `stopped` history entry. Fix sketch: persist a `currentMesocycleClearedAt` stamp, or a finality rule (history entry with same id and stopped/completed/deleted status forces `currentMesocycle: null`).
2. **Undo of an archive resurrects from cloud:** `undoBlockAction` restores the pre-action history array without tombstoning the archived copy already pushed via `_syncUrgent` — union merge re-adds it, leaving block X both active AND archived (double-counted stats). Fix sketch: tombstone the removed entry on undo, or dedupe in merge (drop history entries whose id equals `currentMesocycle.id`).
3. **XP undo loses to max-merge:** gamification merge takes `Math.max(localPts, remotePts)` — a reverted +200 snaps back on next pull. Fix sketch: timestamp-aware XP field or an XP event ledger with compensating entries.
Related: queue entries removed/consumed locally resurrect from cloud (no tombstones on `removeFromMesocycleQueue` / `advanceMesocycleQueue`); whole-slice undo restore can clobber a sync merge landing within the undo window.

**Needs:** dedicated branch, merge-layer tests (mergeStates round-trip fixtures), review before touching the highest-blast-radius file in the app.

## Train Tab

### Remove-week can shift workout-log attribution (P1)
**Priority:** P1
**Deferred from:** redesign/train-tab-block-console ship review (2026-06-10), user-approved deferral
**Where:** `src/components/ScheduleSheet.tsx` (`handleRemoveWeek`), `src/lib/session-matching.ts`

Removing the last training week renumbers remaining weeks; logs from the removed week keep their old `weekNumber`/`dayNumber` and position-match different weeks, potentially marking untrained sessions complete. Pre-existing logic, rare trigger (only when the removed week has logs), recoverable via the undo toast. Fix sketch: prefer removing the last log-free week; confirm when all removable weeks have logs; or null orphaned logs' `weekNumber`.

## Testing

### Bootstrap a browser E2E framework for Train flows (P1)
**Priority:** P1
**Deferred from:** ship coverage gate (2026-06-10), user accepted 45% headline coverage
**Where:** new — no component/browser test framework exists

21 of 38 changed codepaths on the Train rework are UI flows (taps, sheets, toasts) untestable without a browser harness; 7 were manually verified via the browse walkthrough. Playwright is the natural fit. Until then, UI regressions rely on manual QA.

## Completed
