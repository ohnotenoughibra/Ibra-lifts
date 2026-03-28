# Architecture Guide

## System Overview

Combat-sport-focused fitness PWA. **Local-first, cloud-optional**. All data persists to localStorage via Zustand immediately. Cloud sync is unlocked by authentication but never required.

## Data Flow

```
User action (tap "Complete Set")
  │
  ▼
React Component (ActiveWorkout.tsx)
  │ calls store action
  ▼
Zustand Store (store.ts)
  │ setState() → localStorage (immediate)
  ▼
db-sync.ts (debounce 3s, max 15s)
  │ POST /api/sync
  ▼
API Route (src/app/api/sync/route.ts)
  │ richness check → backup → upsert
  ▼
Vercel Postgres (user_store JSONB)
```

If offline: writes queue in localStorage + Background Sync API. Flushed on reconnection.

## Architecture Layers

### 1. Presentation (`src/components/`, `src/app/`)

- **Root layout** (`app/layout.tsx`): PWA metadata, viewport, analytics wrapper
- **Root page** (`app/page.tsx`): Orchestrator — hydrates store, resolves auth session, triggers DB load + Whoop sync, shows loading screen until ready
- **Dashboard**: Tab-based navigation (Home, Training, Nutrition, Analytics, Wearables, Settings)
- **Providers** (`Providers.tsx`): NextAuth SessionProvider wrapper

### 2. State (`src/lib/store.ts`)

Zustand store (~3700 lines) with localStorage persistence. See `src/lib/store.context.md` for structural map.

Key characteristics:
- **Immediate persistence**: Every state change writes to localStorage
- **Version migrations**: Schema versioning with forward migration
- **Selective partialize**: Transient state (activeWorkout, syncConflict) excluded from persistence
- **Custom storage**: localStorage primary → localStorage backup → IndexedDB fallback → auto-prune at 4.5MB

### 3. Business Logic (`src/lib/`)

Pure function engines. See `src/lib/CLAUDE.md` for full inventory.

**Critical pattern**: 95% of business logic is pure functions with zero side effects. Only store.ts, hooks, and db-sync have side effects. This means engines are testable, composable, and safe to call from anywhere.

### 4. API (`src/app/api/`)

Next.js route handlers. See `src/app/api/CLAUDE.md` for details.

### 5. Database (Vercel Postgres)

**Monolithic JSONB sync** — the entire store is serialized as one JSONB blob in `user_store`. Individual tables exist only for auth (`auth_users`), gamification leaderboard (`gamification_stats`), subscriptions, and backups.

This is intentional: local-first means the client is the source of truth. The server is a backup with conflict resolution, not a normalized relational database.

## Authentication

- **Provider**: NextAuth 5 with Credentials (email/password), magic link, Google, Apple
- **Session**: JWT, 30-day expiry
- **Edge middleware** (`middleware.ts`): Protects routes using edge-safe config (no Node.js deps)
- **Account lockout**: 1 min (5 attempts), 5 min (10), 15 min (15+)
- **Guest mode**: App fully functional without auth — auth unlocks cloud sync

## Sync Model

### Save (client → server)
1. Zustand change triggers debounced save (3s delay, 15s max wait)
2. POST `/api/sync` with full store state
3. Server runs **richness check** — blocks if incoming data would lose >20% of server's data richness (prevents corrupted localStorage from wiping cloud)
4. Atomic transaction: backup existing → upsert new → update gamification stats
5. Heartbeat: safety-net push every 5 min regardless of changes

### Load (server → client)
1. On app load, `useDbSync` fetches GET `/api/sync`
2. If local and remote data conflict: `resolveConflicts()` merges
3. **Array fields** (workouts, meals): union merge by ID — never drops entries
4. **Object fields** (waterLog): deep merge all keys
5. **Scalars**: prefer newer `lastSyncAt`

### Offline
- Writes queue in localStorage + Background Sync API
- Service Worker replays queued POSTs on reconnection
- Focus-based resync: re-fetches when tab regains focus (30s cooldown)

## External Integrations

| Integration | Protocol | Files |
|-------------|----------|-------|
| **Whoop** | OAuth2 → REST API | `whoop.ts`, `useWhoopSync.ts`, `app/api/whoop/*` |
| **Claude AI** | REST API (`@anthropic-ai/sdk`) | `ai-coach-client.ts`, `app/api/ai-coach/route.ts` |
| **Google Fit** | OAuth2 → REST API | `health-import.ts`, `app/api/google-fit/route.ts` |
| **Web Push** | VAPID (`web-push`) | `push-subscription.ts`, `app/api/push/route.ts` |
| **OpenFoodFacts** | REST API | `barcode-lookup.ts` (cached) |
| **PayPal** | REST API + Webhooks | `subscription.ts`, `app/api/subscription/*` |
| **Sentry** | SDK instrumentation | `sentry.*.config.ts`, `instrumentation.ts` |
| **Vercel Analytics** | Auto-instrumented | `layout.tsx` |

### Whoop Token Persistence
Tokens stored in BOTH localStorage AND Postgres. If localStorage is evicted (iOS PWA), tokens are restored from server on next app load. Survives phone restarts, cache clears, PWA re-installs.

## PWA

- **Service Worker** (`public/sw.js`): Cache-first for static assets, network-first for pages, never caches `/api/sync`
- **Background Sync**: Queued writes replay on reconnection
- **Install prompt**: Shown after first workout logged
- **Push notifications**: VAPID-based via `web-push` library. Requested after 3rd workout. Preferences managed in `NotificationSettings.tsx`
- **Update flow**: "Update available" banner → user clicks → SW skipWaiting → reload

## Subscription Tiers

- **Free**: Basic workout tracking, single mesocycle, streaks, 1RM calculator
- **Pro**: Full history, multiple programs, AI coach, nutrition, Whoop, weight cuts, fight camp, supplements
- **Resolution order**: Owner bypass → active subscription → 14-day grace → trial → free

## Key Design Decisions

1. **Local-first over server-first**: User owns their data. Cloud is backup, not source of truth
2. **JSONB blob over normalized tables**: Simpler sync, matches Zustand shape, avoids ORM complexity
3. **Hybrid AI coaching**: Rule-based `ai-coach.ts` for offline/instant fallback; Claude-powered `/api/ai-coach` for deep personalized coaching (rate-limited 3/day, requires `ANTHROPIC_API_KEY`)
4. **Zustand over Redux**: Less boilerplate, simpler mental model, built-in persistence
5. **Monolithic components over micro-components**: ActiveWorkout.tsx is 3500 lines because splitting would scatter related workout logic across dozens of files with complex prop drilling. The tradeoff is intentional
