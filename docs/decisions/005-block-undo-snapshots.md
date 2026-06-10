# 005: In-Memory Snapshot Stack for Block Undo

**Date**: 2026-06-10
**Status**: Active

## Context
The Train tab rework made block lifecycle actions (complete, stop, switch, delete, add/remove week) one-tap with no confirm dialogs. That only works if every action is instantly reversible. Options: (1) command pattern with hand-written inverse actions per operation, (2) a persisted event log with replay, (3) whole-slice state snapshots held in memory.

## Decision
Wrap every block action in `withBlockUndo` (`store.ts`), which pushes a `BlockUndoEntry` — references to 6 state slices (`currentMesocycle`, `mesocycleHistory`, `mesocycleQueue`, `workoutLogs`, `gamificationStats`, `user`) — onto an in-memory `blockUndoStack` (10 entries max). `undoBlockAction(expectedId?)` restores the snapshot wholesale.

## Rationale
Store state is immutable (every `set()` builds fresh objects), so a snapshot is six object references — O(1), no deep clone, no serialization. Inverse actions would be error-prone: `completeMesocycle` awards XP, checks badges, bumps level, and may auto-generate a successor block; writing and maintaining a correct inverse for that cascade is exactly the kind of code that rots. Restoring a snapshot reverts all of it in one step. A module-level depth guard makes nested actions (switch = stop + advance) collapse into a single undo entry.

## Consequences
- Pro: one undo reverts XP, badges, level, queue, history, and profile config together — no partial reverts
- Pro: snapshots are free (references), so wrapping every action costs nothing
- Pro: entry `id` binding means a stale undo toast can never pop a newer, unrelated action; guarded no-ops drop their phantom entry instead of polluting the stack
- Con: undo does not survive a reload — intentional; a stale undo after reload/sync is more dangerous than no undo
- Con: cloud sync can resurrect undone state across devices (union merge, XP max-merge) — known holes tracked as P0 in `TODOS.md`
- Mitigation: the stack is excluded from persistence and cleared on logout, so undo can never restore a previous account's data; undo re-stamps `updatedAt` and flags `_syncUrgent` so the restored state wins the next merge where timestamps are honored
