# Spec: Social Leaderboards ("Crews") — v0

Status: SCOPED — decisions locked, ready to build · 2026-06-11 · Owner: Ibra

**Confirmed decisions:**
1. Rank metric: **weekly sessions completed** (streak tiebreaker, XP secondary). ✅
2. Scope: **crews only** — no global board in v0. ✅
3. Identity: editable display name, defaults to profile name (pseudonymous-capable). ✅ (default)
4. Entry point: **Explore tile only** for P0. ✅ (default)

## 1. Goal

Turn the existing solo gamification (XP, streak, consistency) into **social accountability**: a user joins a small group of people they actually train with (their gym / partners) and competes on **showing up**, refreshed weekly. The retention lever is "I won't skip, my crew will see the gap."

Modeled on community-scoped leaderboards (Whop): rank **contribution/consistency**, not raw output, inside a **bounded cohort**, not the planet.

## 2. Non-goals (v0)

- ❌ Global/world leaderboard (demotivating noise + cheating magnet).
- ❌ Ranking on volume / 1RM / "strongest" (unfair across body sizes, gameable, off-ethos).
- ❌ A full friends graph / follow system / feed / comments.
- ❌ Server-side recomputation of metrics from raw logs (privacy + cost). We rank a small set of self-reported, sync-pushed metrics.
- ❌ Hard anti-cheat (server validation of every metric). v0 leans on "you know these people."

## 3. Key decisions

### 3.1 Metric: weekly consistency (not strength)
Rank within a crew by a **Consistency Score for the current ISO week**, reset every Monday (local week, reuse `localMondayKey`):
- `sessionsThisWeek` — lifting workouts + combat + cardio `TrainingSession`s completed this week (the universal-streak sources already counted in `addTrainingSession`).
- `currentStreak` — tiebreaker / secondary column.
- Optional later: `% of planned sessions hit` (needs the plan; defer).

Why consistency: fair across weight classes (a flyweight can be #1), drives real results, matches the app's ethos, and is the honest analog of Whop's engagement leaderboards. XP is available too but is a noisier blend; lead with sessions, show XP as a secondary stat.

### 3.2 Cohort: Crews via join code (not global, no friends graph)
- A **Crew** = a named group (e.g. "10th Planet AM", "Ibra's partners") created by any user, joined via a 6-char **share code**.
- A user can be in **N crews** (their gym + their partners + a challenge crew). v0 cap: 5 crews/user.
- Crew size cap v0: 50 members (keeps the board meaningful + query cheap).

### 3.3 Privacy: opt-in, per nothing-leaks-by-default
- Joining a crew is the opt-in. Being in a crew means your **display name + weekly consistency metrics** are visible to that crew only. Nothing else (no body weight, no lifts, no injuries) ever leaves the per-user blob.
- A user sets a **leaderboard display name** (defaults to profile name; editable) — they can stay pseudonymous.
- Leave-crew + delete-crew (owner) fully remove the row. Account deletion cascades (extend the existing `/api/auth/account` delete cascade).

### 3.4 Anti-cheat posture (v0: social, not cryptographic)
Metrics are client-computed and pushed, so they're spoofable. v0 accepts this because crews are people you know (social pressure). Mitigations that are cheap and worth doing now:
- Clamp server-side to sane bounds (`sessionsThisWeek` capped at, say, 21/week; reject negatives).
- Store `metrics_updated_at`; a member who hasn't synced in 8+ days is shown greyed/"stale", not removed.
Hard validation (server recomputes from logs) is a deliberate later phase, gated on whether cheating actually happens.

## 4. Data model (Vercel Postgres, `CREATE TABLE IF NOT EXISTS` like `push_subscriptions`)

```sql
CREATE TABLE IF NOT EXISTS crews (
  id          TEXT PRIMARY KEY,             -- uuid
  name        TEXT NOT NULL,
  join_code   TEXT UNIQUE NOT NULL,         -- 6-char A-Z0-9, ambiguous chars removed
  owner_id    TEXT NOT NULL,                -- session.user.id
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crew_members (
  crew_id            TEXT NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  user_id            TEXT NOT NULL,         -- session.user.id
  display_name       TEXT NOT NULL,
  -- denormalized weekly metrics, refreshed by the member's client on sync
  week_key           TEXT,                  -- localMondayKey of the metrics below
  sessions_this_week INT  DEFAULT 0,
  current_streak     INT  DEFAULT 0,
  total_points       INT  DEFAULT 0,        -- secondary stat
  metrics_updated_at TIMESTAMPTZ,
  joined_at          TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (crew_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_crew_members_user ON crew_members(user_id);
```

Rank query = `SELECT ... FROM crew_members WHERE crew_id = $1 AND week_key = $thisWeek ORDER BY sessions_this_week DESC, current_streak DESC LIMIT 50`. Cheap, indexed, no blob scans.

## 5. API (Next.js route handlers, `auth()` + `session.user.id`, matching sync/push patterns)

- `POST /api/crews` — create crew `{name}` → returns `{id, joinCode}`. (cap 5 owned)
- `POST /api/crews/join` — `{joinCode}` → adds caller to crew (cap checks). Returns crew.
- `POST /api/crews/leave` — `{crewId}`.
- `DELETE /api/crews/:id` — owner only; cascades members.
- `POST /api/crews/metrics` — `{displayName, weekKey, sessionsThisWeek, currentStreak, totalPoints}` upsert into every crew the caller belongs to. Server clamps + stamps `metrics_updated_at`. Called from the client right after a successful store sync (piggyback on `useDbSync`).
- `GET /api/crews` — caller's crews + each crew's ranked standings (top 50 + caller's rank).

All verify `userId === session.user.id`. All wrapped in the existing rate-limit helper.

## 6. Client wiring

- New `src/lib/crews-client.ts` (fetch helpers) + a `crews` slice or local component state (do NOT put crews in the synced JSONB blob — it's server-authoritative, queried live).
- Metrics push: after `useDbSync` completes a successful sync, compute `{sessionsThisWeek (from workoutLogs+trainingSessions in localMondayKey week), currentStreak, totalPoints}` and `POST /api/crews/metrics`. One call, fire-and-forget, rate-limited.
- Privacy: only fires if the user is in ≥1 crew.

## 7. UI

- New **`CrewsLeaderboard.tsx`** overlay (`'crews'` OverlayView):
  - Empty state: "Train with your gym? Create a crew or join with a code."
  - Crew tabs (if in multiple). Each shows a ranked list: rank · display name · sessions this week (big) · streak · XP (secondary). Caller's row highlighted. "Stale" members greyed.
  - Create-crew + join-by-code sheet (share the code via native share).
- **Entry point**: a tile in the Progress tab's durability/Explore grid ("Crews — train with your gym") and/or a row on the Home tab when in a crew ("Your crew · you're #2 this week"). Start with the Explore tile only (low risk).

## 8. Phasing

- **P0 (MVP, this spec):** crews + join codes + weekly sessions leaderboard + opt-in + metrics-on-sync + one overlay + one entry tile. Owner delete, member leave, account-delete cascade. Server clamps.
- **P1:** "you're #2 this week" Home nudge; weekly winner badge (reuse gamification badges); push notification "the crew is pulling ahead." 
- **P2:** `% planned sessions hit` metric; per-week history; weight-class strength board (relative strength) as a *separate, opt-in* board; harder anti-cheat if cheating is observed.

## 9. Effort

- Backend (4 tables-worth of routes + db-init entry): human ~1–1.5 days / CC ~45 min.
- Client (fetch lib + sync piggyback + overlay UI + entry tile): human ~1.5–2 days / CC ~1–1.5 hr.
- Total P0: human ~3–4 days / CC ~2–3 hr across verified waves. Biggest feature on the board this session.

## 10. Open decisions for Ibra

1. **Metric**: lead with weekly *sessions completed* (recommended) — or weekly *XP*, or *streak*?
2. **Scope**: crews-only for v0 (recommended), or also a global/weight-class board?
3. **Identity**: real profile name by default, or force a chosen display name (more privacy)?
4. **Entry point**: Explore tile only (recommended), or also a Home-tab crew nudge in P0?
