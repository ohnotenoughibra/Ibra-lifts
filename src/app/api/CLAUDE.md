# src/app/api/ — API Routes

## Auth Pattern

Every authenticated route follows this pattern:

```typescript
const session = await auth();
if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
// User isolation: always filter by session.user.id
```

All routes use `runtime = 'nodejs'` and `dynamic = 'force-dynamic'` (never cached).

## Route Inventory

### Auth (`/api/auth/`)
| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `[...nextauth]/route.ts` | GET, POST | Public | NextAuth handler |
| `register/route.ts` | POST | Public (rate limited: 5/min) | Email/password registration |
| `magic-link/route.ts` | POST, PUT | Public (rate limited: 3/min) | Magic link send + validate |
| `reset-password/route.ts` | POST, PUT | Public (rate limited: 3/min) | Password reset send + validate |
| `verify-email/route.ts` | GET | Public | Email verification |
| `account/route.ts` | DELETE | Authenticated | Account deletion (cascading) |

### Sync (`/api/sync/`)
| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `route.ts` | GET | Authenticated | Load user store from Postgres |
| `route.ts` | POST | Authenticated | Save user store with richness check + backup |
| `backups/route.ts` | GET, POST | Authenticated | List/restore backups |
| `init/route.ts` | POST | Authenticated | Initialize DB tables |
| `recover/route.ts` | — | Authenticated | Data recovery |

### Workout (`/api/workout/`)
| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `route.ts` | POST, GET | Authenticated | Generate mesocycle / quick workout |

### Progress (`/api/progress/`)
| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `route.ts` | POST, GET | Authenticated | Calculate 1RM, suggest adjustments |

### Subscription (`/api/subscription/`)
| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `checkout/route.ts` | POST | Authenticated | Create PayPal subscription |
| `status/route.ts` | GET | Authenticated | Fetch subscription tier |
| `activate/route.ts` | — | Authenticated | Subscription activation |
| `webhook/route.ts` | POST | Public (signature verified) | PayPal webhook handler |

### Whoop (`/api/whoop/`)
| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `auth/route.ts` | GET | Public | OAuth2 initiation |
| `callback/route.ts` | GET | Public | OAuth2 callback, token exchange |
| `data/route.ts` | POST | Token-based (not session) | Fetch Whoop data |
| `tokens/route.ts` | — | — | Token save/restore |

### Debug (`/api/debug/`)
| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `my-data/route.ts` | GET | Authenticated | Dump all user data |
| `force-restore/route.ts` | — | Authenticated | Recovery utilities |

## Response Conventions

```typescript
// Success
{ success: true, data?: any, message?: string }

// Error
{ error: "Human-readable message" }

// Sync POST special case — blocks data regression
{ success: false, blocked: true, reason: "data_regression", serverScore: number, incomingScore: number }

// Webhook — always 200 to prevent PayPal retries
{ received: true }
```

## Database Access

Uses `@vercel/postgres` with SQL template literals (safe from injection):

```typescript
const { rows } = await sql`SELECT * FROM user_store WHERE user_id = ${userId}`;
```

**Key tables**: `auth_users`, `user_store` (JSONB blob), `user_store_backups`, `gamification_stats`, `subscriptions`, `password_reset_tokens`, `email_verification_tokens`

**Patterns**:
- Upsert: `INSERT ... ON CONFLICT DO UPDATE` (user_store, gamification, subscriptions)
- Lazy table creation: `CREATE TABLE IF NOT EXISTS` on first write
- Cascading delete: account deletion removes all dependent rows
- Dual-write: sync POST updates both `user_store` JSONB and `gamification_stats` table

## Rate Limiting

In-memory sliding window (`src/lib/rate-limit.ts`). No external deps.
- `register:${IP}` → 5/min
- `magic-link:${IP}` → 3/min
- `reset:${IP}` → 3/min

IP from `X-Forwarded-For` (Vercel) → `x-real-ip` fallback.

## Data Regression Prevention

Sync POST runs a "richness score" before writing — weights onboarding, profile completeness, workout count, meal count, etc. If incoming data scores 20%+ lower than server, the write is blocked. This prevents corrupted localStorage from wiping cloud data.
