# Lessons Learned

<!-- Updated after corrections. Review at session start. -->

## Display & Units
- **Water**: Always display in liters (glasses × 0.25), never raw glass count
- **Protein messages**: Show actual grams (e.g. 70/156g) not just percentages — users need actionable numbers

## Light Mode
- `text-grappler-400/500/600` must map to dark enough values (slate-600/500/500 minimum) for readability on white
- Glassmorphic `white/[0.0x]` patterns are invisible in light mode — override with slate-tinted colors
- Badge styles need explicit light-mode overrides (pastel bg + darker text)

## UX Patterns
- Never hide actionable info behind overlays — weight bump suggestions must be visible during rest timer
- Full-screen overlays should always be minimizable so users can check underlying content
- Fixed bottom buttons for primary actions (Complete Set) — never make users scroll to act
- Pre-fill everything possible (RPE from prescription, weight from history, reps from target)
- Show results BEFORE asking for feedback (workout summary → then optional survey)
- Destructive actions (replacing mesocycle) MUST have confirmation dialogs

## Formula Consistency
- **Brzycki formula** is the standard for 1RM across the codebase: `weight / (1.0278 - 0.0278 * reps)`
- Always clamp reps to max 12 for 1RM estimation (both Brzycki and Epley degrade past ~12)
- RPE progresses **additively** (e.g., +0.5/week), never multiplicatively
- RPE values should be in 0.5 increments only (6, 6.5, 7, 7.5, etc.)
- Unit-sensitive calculations must normalize for kg vs lbs (fatigue scoring, volume thresholds)

## Sync / Multi-Device
- **Never restore `lastSyncAt` from the server** — always set it to `Date.now()` after pull. Restoring a stale timestamp causes the scalar merge to pick the wrong device as "winner"
- **Always use `Date.now()` in push payloads** for `lastSyncAt`, never read from store (which may have stale value from another device's push)
- **Server-side merge is essential** — the POST endpoint must merge incoming with existing data using `resolveConflicts`, not blindly overwrite. Otherwise a stale device can overwrite newer data
- **Critical fields need `updatedAt`** — any structured object that can change independently across devices (currentMesocycle, activeDietPhase, etc.) should have `updatedAt` for merge priority

- **Tombstones for array deletes** — use `_deleted: true` + `_deletedAt: timestamp` instead of `.filter()` removal. Filter tombstones at read time (selectors/hooks). GC tombstones >30 days in sync merge
- **Field-level timestamps on UserProfile** — `_fieldTimestamps: Record<string, number>` enables per-field merge so editing name on laptop doesn't overwrite training days changed on phone
- **Heartbeat must pull after push** — push-only heartbeat leaves devices stale; pull after push so changes propagate within the heartbeat interval
- **Mesocycle regeneration must auto-migrate logs** — `generateNewMesocycle()` creates new session IDs which orphan workout logs. Always call `migrateWorkoutLogsToMesocycle(oldId, newId)` after

## Store Patterns
- `updateExerciseLog` validates bounds and sanitizes inputs (no negative reps/weight, RPE capped 0-10)
- Pause/resume tracks `pausedAt` timestamp + `totalPausedMs` accumulator for accurate duration
- Swap/bonus exercises should prefill weights from `getSuggestedWeight` and reps from prescription
