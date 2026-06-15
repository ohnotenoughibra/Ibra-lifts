# Changelog

All notable changes to Roots Gains are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/) · versions follow semver.

## [2.5.2] - 2026-06-15

**Wrong macros on a scanned food? Fix them once — the correction sticks for every future scan.**

### Added
- **Edit a scanned product's macros.** Barcode data comes from OpenFoodFacts, which is community-edited and often wrong (mislabeled serving sizes, bad per-100g values). Now when you scan a food, you can tap "Wrong? Fix it", correct the calories/protein/carbs/fat, and log the right numbers. The fix is saved per barcode and re-applied automatically every time you scan that product again — so you only ever fix it once. Corrected foods show a "your numbers" badge.

### Fixed
- Removed two duplicate entries (avocado, edamame) from the food keyword matcher. No macro impact — the food database was already accurate (audited: every entry's calories reconcile with its protein/carbs/fat, and top foods check out against USDA). Note: a scanned/typed honey showing "34c" is not a data bug — 1 tbsp is correctly 17c; 34c is the 2-serving (2 tbsp) selection.

### For contributors
- `barcode-lookup.ts` gains a localStorage-backed override store (`getBarcodeOverride`/`setBarcodeOverride`/`clearBarcodeOverride`) applied via `withOverride()` at every `found` resolution (fresh, cache hit, stale). Overrides pass through the same `finiteNum` NaN guard as remote payloads. `BarcodeScanner` found-card gets an inline edit mode; `BarcodeProduct.corrected` flags overridden macros. Fixed a pre-existing date-flaky `shouldRefillShield` test (computed Monday via UTC `toISOString()` vs the implementation's local `localMondayKey`).

## [2.5.1] - 2026-06-15

**Nutrition gets simpler: log without leaving home, and the app tells you what to eat to finish your day.**

### Changed
- **Logging is now a slide-up sheet** you open from a button on the dashboard — no more switching to a separate "Log" tab to add a meal. The nutrition area is now three tabs (Today / Review / Coach) instead of four.
- **"Finish your day"** — your dashboard now suggests a few foods from your history that best close your remaining calories and protein, each one tap to log.

### For contributors
- `NutritionTracker` collapses the Log tab into a bottom-sheet (FAB-triggered) over the dashboard. `getSuggestions` exported from NutritionInsights and reused on the dashboard with a one-tap `addMeal`. Remaining IA rebuild items tracked in tasks/audit-nutrition.md.

## [2.5.0] - 2026-06-15

**Nutrition math, audited and made honest: your calorie number now always matches your macros, and the app stops giving you two different targets.**

A science + math audit of the whole nutrition engine. The headline: the app used to show different calorie targets in different places and could mark a perfectly-eaten training day as "over." Fixed.

### Fixed
- **Your calories now match your macros, exactly.** The calorie ring used to drift from protein + carbs + fat (you could see "1,500 kcal" while the macros added up to 1,100). They're now reconciled to always agree.
- **One target, everywhere.** Your periodized plan (mini-cut, fat-loss, massing) now actually drives your numbers instead of silently collapsing to a generic cut/bulk. And your adherence report is now scored against the *training-day-adjusted* target you were told to hit — no more getting dinged "over" for eating exactly right on a hard day.
- **Saner numbers at the edges.** Lighter or higher-body-fat athletes on an aggressive cut no longer get absurd protein targets with near-zero carbs (protein is now anchored to lean mass, with a hard ceiling).
- **Safer cuts.** The calorie generator now respects the same RED-S energy-availability floor its own warning uses (30 kcal/kg), so it won't hand you a plan it then flags as risky.
- **Science corrections:** two-a-day carb refeed was ~10× too high (now a sensible front-loaded amount); combat caffeine dose raised to the actually-effective 3 mg/kg; fat floor is now a true hormonal-health minimum; protein is capped at the evidence ceiling on hard days; a few supplement/timing fixes.

### Changed
- **Protein-left headline** under the calorie ring — your real number, not buried in a bar.
- **A log button right on the nutrition dashboard** — add a meal without hunting for the Log tab.

### For contributors
- `calculateMacros` gained authoritative `calorieFactor`/`proteinGKg` overrides + calorie↔macro reconciliation + LBM-anchored protein; shared `weeklyExerciseCostPerDay`. Fixes across periodization-planner, sport-nutrition-engine, contextual-nutrition. Adherence reads effective targets. +6 precision tests (658 total). Full audit + the deferred nutrition UI/IA rebuild in tasks/audit-nutrition.md.

## [2.4.2] - 2026-06-12

**Your crew standing now greets you on the home screen, and last week's winner gets their due.**

### Added
- **Crew standing on Today.** If you're in a crew, the home screen shows where you rank this week ("you're #2 of 6 this week", or 👑 when you're leading) — one tap to the full board.
- **Last week's winner.** Each crew now shows who topped the board last week. It's finalized automatically the first time anyone in the crew trains in the new week.

### For contributors
- `crew_week_winners` snapshot table (FK cascade), lazily finalized in the metrics route the first sync of a new week (idempotent via PK + ON CONFLICT DO NOTHING). GET returns each crew's most recent winner. New `CrewNudge` home component. +1 test (prevWeekKey). Deferred items noted in tasks/spec-social-leaderboards.md.

## [2.4.1] - 2026-06-11

**Crew standings now stay live without anyone opening the leaderboard.**

### Changed
- **Crews update in the background.** Your weekly numbers now push to your crews shortly after you train (debounced), so your crewmates see your real standing without you having to open the Crews screen. Only happens if you're in a crew, and only your name + weekly consistency are ever shared.

## [2.4.0] - 2026-06-11

**Crews: train with your gym and see who shows up the most each week.**

Your first social feature. Start a crew with your training partners, join with a 6-character code, and compete on a weekly leaderboard — ranked by sessions completed, reset every Monday.

### Added
- **Crews + weekly leaderboard.** Find "Crews" in the Progress tab. Create a crew or join one with a code, then see your group ranked by how many sessions (lifting + combat + cardio) everyone completed this week. #1 gets the crown; the board resets Monday so everyone gets a fresh shot. It ranks consistency, not who lifts most — so it's fair whatever your size.
- **Private by design.** Joining is the opt-in. Only your name and your weekly consistency numbers are shared, and only with that crew — nothing else (body weight, lifts, injuries) ever leaves your device's data. Leave anytime; the owner can delete the crew; deleting your account removes you from every crew.

### For contributors
- Server-authoritative `crews` / `crew_members` tables (lazy `CREATE TABLE IF NOT EXISTS`, FK cascade) — crews are not in the per-user sync blob. Routes: create/join/leave/delete + a metrics push that piggybacks on the leaderboard open. Auth-gated, rate-limited, server-side clamps as light anti-cheat; account-delete cascade extended. Spec + roadmap in tasks/spec-social-leaderboards.md. +6 tests.

## [2.3.1] - 2026-06-11

**A removed injury stops flagging your exercises, and the Assault Bike joins the cardio list.**

### Fixed
- **Healed/removed injury no longer flags exercises.** If you marked an injury done and still saw "active injury — N exercises flagged" during a workout, that's fixed. A removed injury was still being treated as active everywhere flags are computed (the workout warnings, the auto volume/intensity adjustment, the smart session pick). Now only injuries that are neither resolved nor deleted count.

### Added
- **Assault Bike** is now a cardio type you can schedule and log, alongside running, cycling, rowing, and the rest.

## [2.3.0] - 2026-06-11

**Cardio is now a first-class part of your week: schedule it, see it on your plan, and log it.**

You can plan recurring cardio sessions that show up on your training week right next to lifting and combat days, and log a cardio session in a few taps.

### Added
- **Schedule cardio on your plan.** Open the Train tab and you'll see a "This week" strip showing your lifting, combat, and now cardio days at a glance. Tap any day (or the "Cardio" link) to plan a session: pick the type (running, cycling, swimming, rowing, jump rope, elliptical), intensity, duration, and an optional label like "Zone 2 base" or "Intervals." Cardio days appear in sky blue.
- **Log a cardio session.** A quick form for type, duration, distance, and intensity drops the session straight into your training history and streak.
- **Your plan accounts for it.** A hard cardio session the day before a lift now nudges that lift's suggested intensity down, the same way hard sparring does — so the week stays recoverable.

### For contributors
- New `ScheduledCardioDay` type + `user.scheduledCardio`. `buildWeekPlan` takes an optional `scheduledCardio` arg (cardio bucket + `CARDIO_COST` freshness) — backward compatible. `WeeklyCalendar` revived from orphan onto the Train tab with a cardio tile + tappable days. New `CardioPlanner` overlay (schedule editor + log form). +5 scheduling tests.

## [2.2.4] - 2026-06-11

**A first-principles cleanup of Today, Progress (formerly "Body"), and Settings: less clutter, no footguns, start your workout in one tap.**

A bold audit of the three core screens. The theme is subtraction: ~950 lines of code that shipped to your phone but never showed anything are gone, the most-used screens lead with what matters, and three Settings traps are closed.

### Changed
- **Today leads with your workout.** The Start button now sits right under your readiness ring instead of eight cards down. Your readiness score is shown once (it used to appear up to four times on one screen), and the "one thing" nudge is hidden when it would just repeat "start your workout."
- **"Body" tab is now "Progress."** It was a mix of strength analytics, body tracking, and history — "Progress" describes that honestly.
- **Progress stops being an endless scroll.** The full weight tracker and full workout history are now one tap to open instead of stacked inline, so you reach everything faster.

### Fixed
- **Changing your training days no longer wipes your block by surprise.** Tapping a new days/week count used to silently rebuild your current training block. It now asks first.
- **Google Fit / Apple Health stop pretending.** Those buttons used to say "Connected" without ever connecting. They now open the real device-setup screen.
- **Notification settings are finally reachable** — there's now a Notifications section in Settings.
- **The Danger Zone looks dangerous.** Reset and Delete Account were styled as quietly as the harmless buttons; Delete is now solid red and clearly separated.

### For contributors
- Removed ~950 lines of never-rendered code: 8 dead cards + dead imports/state in ProgressTab, dead imports + an unreachable repair banner + dead state in HomeTab. Settings: duplicate weight-unit field removed; ProfileSettings gained an onNavigate prop. Audit + remaining waves in tasks/audit-today-body-settings.md.

## [2.2.3] - 2026-06-11

**The "new version available" banner stops hiding behind your phone's notch.**

### Fixed
- **Update banner placement**: the "A new version is available" bar was pinned to the very top of the screen, so on phones with a notch or status bar its Update button tucked up underneath and was hard to tap. The bar's content now sits below the safe area; the colored bar still reaches the top edge. No change on screens without a notch.

## [2.2.2] - 2026-06-11

**The barcode scanner stops crying "not found" when the food database just hiccupped.**

Christoph reported scans that found the product but threw an error, plus the camera occasionally getting stuck. Both fixed, with a guard so bad data from the food database can't corrupt your macros.

### Fixed
- **Barcode scan reliability**: a slow or rate-limited OpenFoodFacts response no longer shows up as "product not found" (and no longer gets cached as missing for a week). The scanner retries once, distinguishes a network hiccup from a genuinely-unknown barcode, and gives you a Retry button instead of a dead end.
- **Camera no longer gets stuck**: the camera is released cleanly between scans, so "Scan again" and "Retry" can't leave it locked ("camera already in use") on mobile.
- **Bad food data can't poison your log**: non-numeric macro values from the food database are now read as zero instead of NaN, which previously could corrupt your daily totals.

### For contributors
- `lookupBarcode` returns a `BarcodeLookupResult` discriminated union (found | not_found | error); transient failures are never cached, so a flaky network can't poison a real product as not-found for 7 days. Timeouts fail fast (no ~16s double-wait). Camera lifecycle now stores a promise-returning `stop()` and releases the prior instance on scanner re-entry. +14 barcode-lookup tests.

## [2.2.1] - 2026-06-11

**Hardening pass: closes the security and reliability gaps the audit found across notifications, sync, and offline storage.**

Backend and PWA fixes from the audit. No new features — these make the existing ones safer and more reliable.

### Fixed
- **Push notifications** can now only be sent to a device registered to your own account (previously the endpoint wasn't ownership-checked), and account deletion now removes your notification and Whoop tokens too.
- **Subscription tier** is server-authoritative — a client can no longer self-grant Pro on first sync.
- **Offline sync is sturdier**: queued workouts no longer pile up toward the storage limit, and a stale queued copy can't overwrite a newer save.
- **Shared-device privacy**: signing out now clears cached API responses, and the app never caches auth/session responses to disk.
- **Flaky-connection UX**: page and data fetches time out and fall back to cache instead of hanging on a blank screen.
- **Accessibility**: 33 icon-only buttons (close, back, skip, share, ...) now announce their action to screen readers.

### For contributors
- AI-coach rate limit is now Postgres-backed (global across serverless instances). Third-party tokens fail closed in production without an encryption key. Sentry strips identifiers from trace URLs. Queue reorder carries an explicit position that survives sync. WorkoutHistory defaults to 90 days. +4 tests.

## [2.2.0] - 2026-06-11

**The whole app now agrees on what day it is — and your lifts stop reporting fake PRs.**
**The biggest screens got noticeably snappier, and security/data-loss holes from the audit are closed.**

A full audit of everything outside the Train tab turned up a cluster of issues that affect daily use. This release fixes the ones that touch correctness and speed.

### Fixed
- **"Today" is now your local day everywhere.** Wellness XP, streaks, nutrition, water, supplements, daily login, and weekly progress all rolled over at UTC midnight — so for anyone in the Americas, an evening workout or meal often counted toward the wrong day, silently denying XP or breaking streaks. Now every "day" is your local calendar day. Competition countdowns and fight-camp phases are fixed too, so weigh-in and fight-day guidance shows on the right day.
- **No more impossible PRs.** High-rep sets (especially bodyweight moves like push-ups) could compute absurd estimated 1-rep-maxes and plant permanent fake personal records. The estimate is now capped to a sane range.
- **Faster Home, Dashboard, and live workout.** These re-rendered on every single background update; they now update only when their own data changes.
- **Security**: closed an unauthenticated endpoint that exposed account data, and a path that could leak a sign-in token.
- **Offline workouts no longer lost** to a server hiccup during sync; and deploys no longer force-reload you mid-set (an update banner now lets you choose when to refresh).
- **AI Coach restored** (was silently falling back to canned advice).

### For contributors
- Shared local-day helpers (`localDayKey`/`localMondayKey`/`parseLocalDate`) and a single `estimate1RM`; 48 new tests. Dependency vulnerabilities patched 20 → 4 (remaining require the Next.js major upgrade, tracked in TODOS).

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
