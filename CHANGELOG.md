# Changelog

All notable changes to Roots Gains are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/) · versions follow semver.

## [2.1.1] - 2026-06-11

**"Stop block" and undo now survive cloud sync — and two security holes are closed.**
**Your offline workouts can no longer be silently discarded by a server hiccup.**

The v2.1.0 ship deferred its sync-layer work to a dedicated follow-up; this is it, plus the urgent findings from a full audit of the rest of the app.

### Fixed
- **Stopping or switching a block now sticks across devices.** Previously the cloud's copy resurrected a stopped block on the next sync; undoing a completion couldn't restore your XP across devices; and consumed queue entries came back from the cloud. The sync merge now understands the block lifecycle end-to-end — including undo.
- **Security: closed an unauthenticated debug endpoint** that could read and modify any account's training data by email address, and stopped the magic-link sign-in token from being returned to the caller when email sending is unconfigured.
- **Offline workouts no longer vanish on server errors.** The sync queue treated any server response — including "session expired" — as delivered and deleted the queued workout. Entries now clear only on confirmed success and retry otherwise.
- **AI Coach works again.** The Claude model ID was invalid, so every coaching request silently fell back to canned rules. Real Claude-powered weekly analysis is back.
- **Removing a trained week now warns you** that past sessions may shift weeks, and prefers removing untrained weeks automatically.

### Added
- **Browser test suite (Playwright)**: 6 end-to-end tests covering the Train tab's tap flows — today hero, schedule sheet, stop→undo, queue→switch, exercise-remove undo, and the XP-farm guard. `npm run test:e2e`.
- 23 new sync-merge round-trip tests locking in the lifecycle, XP, and tombstone semantics.

## [2.1.0] - 2026-06-10

**The Train tab now answers one question — "what am I doing today?" — in one tap.**
**Every block action is undoable, and stopping or switching a mesocycle is finally a first-class move.**

The old Train tab stacked eight widgets above today's workout. The rework puts today's session at the top with one Start button, compresses the block into a single progress strip, and moves everything else exactly one tap away. Managing your training blocks — complete, stop early, switch to a queued block, browse past reports — lives in one Blocks sheet, and every action can be undone on the spot.

### Added
- **Today hero**: today's session with exercise preview and one Start button. Adapts to your state — Resume when a workout is paused, "Done for today" with what's next after you train, a celebration with next-block CTA when the block is finished.
- **Block strip**: block name, week position, fight countdown, and a segmented per-week progress bar. Tap for the full schedule (volume wave, weeks, session start, exercise editing, add/remove weeks).
- **Blocks manager**: one home for the block lifecycle — complete or stop the current block (no confirm dialogs, everything undoable), start or switch to queued blocks, browse past blocks with full reports and status badges.
- **Switch block**: jump to a queued block mid-mesocycle. The abandoned block is archived honestly as "stopped" — never falsely "completed" — and the whole switch is one undo.
- **Undo everything**: block creation, completion, stop, switch, delete, week add/remove, and exercise removal all get an undo toast. Undo restores your XP, badges, level, and training preferences too.
- **Block composer polish**: the Muscles picker now keeps your focus/length/days/wave choices, and the volume preview matches what the generator actually builds.

### Fixed
- **Stopping a block could never be done before** — abandoning a block via the composer silently mislabeled it "completed", inflating completion badges. Stopped blocks now carry truthful status everywhere.
- **Completing a block you never trained in no longer awards the +200 XP bonus** (and no longer counts toward completion badges) — the bonus requires real logged work.
- **Logging out now clears in-memory undo history** — previously an undo after re-login could restore the prior account's data into the new account.
- **The intensity heatmap put workouts on the wrong day** for anyone west of UTC (today's session only appeared after ~8pm). Days are now keyed to your local calendar, including across DST changes.
- **The Train tab re-rendered on every store update** (any meal log, any sync) due to a selector bug — now it only re-renders when its own data changes. Block reports and exercise alternatives are also no longer recomputed on every render.
- **"Last performance" hints no longer show weights from sets you skipped.**
- **Injury-aware workouts could occasionally include lunges for a knee injury** — the avoid-list matcher missed singular/variant exercise names. All lunge variants are now excluded for knee regions.
- Deleted workouts no longer count toward session completion or "done for today".
- Weekly challenge and subscription test expectations aligned with current product behavior (meal logging and the program browser are free).

### Changed
- Keyboard and screen-reader support across the new Train surfaces: Escape closes every sheet, segmented controls expose pressed state, icon buttons have accessible names and 44px tap targets.
- Deload weeks render teal consistently across the composer preview, schedule, and reports.
