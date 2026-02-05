# Roots Gains — Quick Start Guide

## Local Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
git clone https://github.com/ohnotenoughibra/Ibra-lifts.git
cd Ibra-lifts
npm install
cp .env.example .env.local
npm run dev
```

The app runs at `http://localhost:3000`. No database, no API keys — everything works locally with localStorage.

### First Run

1. You'll see the **onboarding flow**
2. Pick your combat sport (BJJ, MMA, wrestling, striking, or general fitness)
3. Set experience level (beginner/intermediate/advanced)
4. Choose training days per week (1-6) and session duration
5. Select your goal (strength, hypertrophy, balanced, power)
6. Pick available equipment (full gym, home gym, minimal, bodyweight)
7. Optionally enter baseline lifts (squat, bench, deadlift, OHP)
8. App generates your first mesocycle and drops you into the dashboard

### Development Commands

```bash
npm run dev       # Start dev server (http://localhost:3000)
npm run build     # Production build
npm run start     # Run production build locally
npm run lint      # Run ESLint
```

---

## Production Deployment (Vercel)

### Option A: Dashboard Deploy

1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Deploy — it works immediately with localStorage (no env vars needed)

### Option B: CLI Deploy

```bash
npm i -g vercel
vercel login
vercel deploy --prod
```

### Required for Production Auth

Generate an auth secret and add it to Vercel environment variables:

```bash
npx auth secret
```

Copy the output and add it as `AUTH_SECRET` in Vercel > Settings > Environment Variables.

Without this, login/registration won't work in production. The app still works without auth (localStorage only), but users can't create accounts or sync across devices.

---

## Optional Integrations

### Vercel Postgres (Cloud Sync)

Lets users sync data across devices and browsers.

1. Vercel dashboard > your project > **Storage** tab
2. Click **Create Database** > **Postgres**
3. Select the free Hobby plan
4. Click **Connect** to link it to your project
5. All `POSTGRES_*` env variables are set automatically
6. Redeploy — the app detects the database and enables cloud sync

The app is local-first. If the database goes down, everything still works via localStorage. Data syncs when connectivity returns.

### Resend (Password Reset Emails)

1. Sign up at [resend.com](https://resend.com)
2. Get your API key from the dashboard
3. Add `RESEND_API_KEY` to Vercel environment variables
4. Redeploy

Without this, the "Forgot Password" flow won't send emails. Users can still log in normally.

### Whoop (Wearable Integration)

Pulls HRV, recovery score, sleep quality, and strain data. Adjusts workout intensity automatically.

1. Go to [developer-dashboard.whoop.com](https://developer-dashboard.whoop.com)
2. Create an application
3. Set the callback URL to `https://your-app.vercel.app/api/whoop/callback`
4. Add `WHOOP_CLIENT_ID` and `WHOOP_CLIENT_SECRET` to Vercel env vars
5. Redeploy

Users connect Whoop from the app's wearable integration page.

### OpenAI (Food Recognition)

Enables camera-based food logging in the nutrition tracker.

1. Get an API key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Add `OPENAI_API_KEY` to Vercel env vars
3. Redeploy

Without this, users can still log meals manually with full macro tracking.

---

## Architecture

### How Data Flows

```
User Action
  -> React Component (UI)
    -> Zustand Store (state + localStorage)
      -> Vercel Postgres (optional cloud backup)
```

The app is **local-first**. All state lives in Zustand, persisted to localStorage. If a Postgres database is connected, the app syncs state to the cloud on save and loads from cloud on login. Conflicts are resolved via a dedicated UI (`SyncConflictResolver.tsx`).

### State Management

All app state lives in a single Zustand store (`src/lib/store.ts`). Key slices:

| State | What It Holds |
|-------|--------------|
| `user` | Profile, settings, training preferences |
| `currentMesocycle` | Active program with weeks and sessions |
| `activeWorkout` | In-progress workout (exercise logs, timer, feedback) |
| `workoutLogs` | Completed workout history |
| `gamificationStats` | Points, level, badges, streaks |
| `trainingSessions` | Grappling/striking/cardio sessions |
| `meals` | Nutrition logs |
| `injuries` | Injury/pain tracking |
| `bodyWeightLog` | Weight entries over time |

### Key Modules

| File | Purpose |
|------|---------|
| `workout-generator.ts` | Generates mesocycles with DUP periodization |
| `auto-adjust.ts` | RPE-based weight progression + readiness scoring |
| `gamification.ts` | Points calculation, badge checking, level titles |
| `recovery-coach.ts` | Analyzes sleep, HRV, soreness for recovery alerts |
| `smart-schedule.ts` | Recommends today's training based on recovery + history |
| `contextual-nutrition.ts` | Adjusts macros by training type and recovery score |
| `injury-prevention.ts` | Detects overuse patterns and muscle imbalances |
| `exercises.ts` | 50+ exercises with muscles, equipment, cues |
| `db-sync.ts` | localStorage <-> Postgres sync with conflict resolution |

### Component Map

**Core tabs** (always loaded):
- `Dashboard.tsx` — Main shell, tab navigation, floating action button
- `WorkoutView.tsx` — Program overview, session selection, mesocycle management
- `ProgressCharts.tsx` — Analytics, 1RM trends, volume analysis
- `WorkoutHistory.tsx` — Past workout log list
- `TrainingCalendar.tsx` — Calendar view with inline workout editing
- `KnowledgeHub.tsx` — Tips and educational content
- `ProfileSettings.tsx` — User settings, equipment profiles, theme toggle
- `ActiveWorkout.tsx` — Live workout tracker (replaces dashboard when active)

**Overlay components** (lazy-loaded on demand):
- `NutritionTracker.tsx` — Meal logging, macros, contextual recommendations
- `GrapplingTracker.tsx` — Combat session logging (BJJ, MMA, striking, cardio)
- `WearableIntegration.tsx` — Whoop connection, HR data, recovery dashboard
- `CompetitionPrep.tsx` — Competition planning, weight cut tracking, peaking
- `RecoveryDashboard.tsx` — Recovery trends, sleep analysis, readiness scoring
- `InjuryLogger.tsx` — Injury/pain tracking by body region
- `MobilityWorkouts.tsx` — Pre-built mobility routines
- `WorkoutBuilder.tsx` — Custom workout creation
- `SessionTemplates.tsx` — Save and reuse favorite workouts
- `StrengthAnalysis.tsx` — Detailed strength progress per exercise
- `VolumeHeatMap.tsx` — Muscle group volume distribution
- `OneRepMaxCalc.tsx` — 1RM estimation calculator
- `GripStrengthModule.tsx` — Grip-specific tracking
- `HRZoneTraining.tsx` — Heart rate zone analysis
- `ExerciseProfiler.tsx` — Exercise response profiling
- `WeeklyCoach.tsx` — AI weekly training summaries
- `RecoveryCoach.tsx` — Recovery recommendations
- `BodyWeightTracker.tsx` — Weight and body composition tracking
- `CustomExerciseCreator.tsx` — Add custom exercises to the database
- `ProgressiveOverload.tsx` — Overload tracking visualization
- `PeriodizationCalendar.tsx` — Mesocycle phase overview
- `MesocycleReport.tsx` — Post-program analysis
- `CommunityShare.tsx` — Social sharing features
- `QuickActions.tsx` — Shortcut buttons

---

## API Routes

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/auth/[...nextauth]` | * | No | NextAuth handler (login/logout) |
| `/api/auth/register` | POST | No | User registration (rate limited) |
| `/api/auth/reset-password` | POST | No | Password reset flow |
| `/api/workout` | POST | Yes | Generate mesocycle or quick workout |
| `/api/progress` | POST | Yes | Calculate 1RM, get adjustment suggestions |
| `/api/sync` | GET/POST | Yes | Load/save user state to Postgres |
| `/api/sync/init` | GET | Yes | Initialize database tables |
| `/api/nutrition/analyze` | POST | Yes | AI food recognition (requires OpenAI key) |
| `/api/whoop/auth` | GET | Yes | Start Whoop OAuth flow |
| `/api/whoop/callback` | GET | No | Whoop OAuth callback |
| `/api/whoop/data` | GET | Yes | Fetch Whoop recovery/sleep/strain |
| `/api/whoop/tokens` | POST | Yes | Refresh Whoop access tokens |

---

## PWA / Offline

The app is a Progressive Web App. Users can install it to their home screen on mobile or desktop.

- **Service Worker** (`public/sw.js`): Caches app shell and static assets. Network-first for pages, cache-first for assets. Background sync replays failed requests when connectivity returns.
- **Manifest** (`public/manifest.json`): Standalone display, portrait orientation, custom theme colors.
- **Install Prompt**: Shown on first visit (can be dismissed). Stored in localStorage.

All core features work offline. Workout logging, nutrition tracking, progress charts — everything runs on localStorage. Cloud sync happens automatically when the user comes back online.

---

## Data & Storage

### localStorage Limits

The app monitors storage size and automatically prunes old data when approaching the 5MB browser limit:

- **Soft limit (4.5MB):** Trims to last 50 workouts, 200 meals, 10 mesocycles. Shows a warning.
- **Hard limit (quota exceeded):** Emergency trim to last 20 workouts, 50 meals, 3 mesocycles.

Users should export backups regularly if training heavily (3+ sessions/day could hit limits in a few months).

### Backup & Restore

Available from the History tab > Export button:

- **CSV** — Workout logs for spreadsheet analysis
- **JSON** — Workout logs in structured format
- **Full Backup** — Complete app state (all data, settings, mesocycles, meals, everything)
- **Import** — Restore from a full backup JSON file

### PDF Export

Full mesocycle programs can be exported as PDF from the Program tab, with all weeks, sessions, exercises, sets, and rep ranges.

---

## Security

- Passwords hashed with bcrypt (12 rounds)
- Auth via NextAuth.js 5 with JWT sessions
- API routes require authentication (except auth endpoints)
- Rate limiting on registration (5/min) and nutrition analysis (10/min)
- Security headers configured in `next.config.js` (CSP, HSTS, X-Frame-Options)
- Input validation with Zod schemas on API routes
- No PII in server logs

---

## Troubleshooting

**Blank screen after editing a workout in calendar:**
Fixed in the latest version. If you see this, hard refresh (Ctrl+Shift+R) to clear the service worker cache.

**"Keep me signed in" not working:**
Make sure `AUTH_SECRET` is set in your Vercel environment variables.

**Whoop not connecting:**
Check that the callback URL in the Whoop developer dashboard exactly matches `https://your-domain.vercel.app/api/whoop/callback`.

**Data not syncing across devices:**
Verify Vercel Postgres is connected (Storage tab in Vercel dashboard). The app falls back to localStorage-only if no database is configured.

**localStorage full warning:**
Export a full backup from History > Export, then the app will auto-prune old data. Consider connecting Vercel Postgres for cloud storage.
