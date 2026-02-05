# Roots Gains

Science-based strength training for martial artists. Built for grapplers, strikers, and MMA fighters who need to get strong without burning out before practice.

**Stack:** Next.js 14 / React 18 / Tailwind CSS / Zustand / Vercel Postgres

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. No database needed for local dev — everything runs on localStorage.

See [QUICKSTART.md](./QUICKSTART.md) for full setup, deployment, and configuration docs.

## What It Does

Roots Gains generates periodized lifting programs (5-12 weeks) using Daily Undulating Periodization. Each week alternates between strength, hypertrophy, and power sessions so you get stronger without accumulating too much fatigue alongside combat training.

### Core Features

- **Smart Programming** — DUP-based mesocycles with auto-progression. RPE feedback adjusts weight automatically. Deload weeks inserted when recovery drops.
- **Combat-Aware Scheduling** — Tracks grappling/striking sessions. Auto-reduces lifting volume on hard sparring days. Avoids heavy deadlifts the day before competition prep.
- **50+ Exercise Database** — Compound-heavy, grappling-relevant exercises with form cues, YouTube links, and equipment alternatives.
- **Whoop Integration** — Pulls HRV, recovery score, sleep data. Adjusts workout intensity based on readiness.
- **Nutrition Tracking** — Contextual macros that adjust based on training type, recovery score, and competition proximity.
- **Gamification** — XP, levels (Novice to Legendary Grappler), 30+ badges, streaks. Keeps you showing up.
- **Full Offline Support** — PWA with service worker. Works without internet. Syncs when back online.

### Everything Else

Progress charts, 1RM tracking, PR detection, volume heatmaps, injury logging, mobility routines, grip strength tracking, competition prep with peaking/tapering, session templates, workout builder, body weight tracking, PDF/CSV export, full backup/restore, weekly AI coach summaries, exercise response profiling, community sharing.

## Training Splits

| Split | Best For |
|-------|----------|
| Full Body | 2-3 days/week, most grapplers |
| Upper/Lower | 4 days/week |
| Push/Pull/Legs | 5-6 days/week |
| Grappler Hybrid | 2-3 days with combat sport integration |

## Workout Types

| Type | Intensity | Reps | Purpose |
|------|-----------|------|---------|
| Strength | 85-95% 1RM | 3-5 | Maximal force production |
| Hypertrophy | 65-85% 1RM | 6-12 | Muscle growth |
| Power | 60-80% 1RM | 3-6, explosive | Speed-strength for combat |

## Project Structure

```
src/
  app/
    api/
      auth/           # Registration, login, password reset
      workout/        # Mesocycle generation
      progress/       # 1RM calculations
      sync/           # Vercel Postgres cloud sync
      whoop/          # Whoop OAuth + data
      nutrition/      # AI food analysis (optional)
    page.tsx          # Entry point (hydration, session, onboarding)
    layout.tsx        # Root layout, PWA meta, providers

  components/         # 38 React components
    Dashboard.tsx     # Main shell, tab routing, FAB
    ActiveWorkout.tsx # Live workout tracker
    WorkoutView.tsx   # Program overview + session picker
    TrainingCalendar.tsx  # Calendar with inline editing
    Onboarding.tsx    # First-run setup flow
    ...               # See QUICKSTART.md for full list

  lib/                # Core logic, 26 modules
    store.ts          # Zustand state (persisted to localStorage)
    exercises.ts      # Exercise database (50+ entries)
    workout-generator.ts  # DUP periodization engine
    auto-adjust.ts    # RPE-based weight progression
    gamification.ts   # Points, levels, badges
    recovery-coach.ts # Recovery alerts + readiness scoring
    smart-schedule.ts # Training day recommendations
    contextual-nutrition.ts  # Macro adjustments by training type
    db-sync.ts        # localStorage <-> Postgres sync
    ...
```

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `AUTH_SECRET` | Yes (prod) | NextAuth JWT signing. Generate with `npx auth secret` |
| `POSTGRES_URL` | No | Auto-set by Vercel when you add a Postgres database |
| `RESEND_API_KEY` | No | Password reset emails via [Resend](https://resend.com) |
| `WHOOP_CLIENT_ID` | No | Whoop wearable integration |
| `WHOOP_CLIENT_SECRET` | No | Whoop wearable integration |
| `OPENAI_API_KEY` | No | Camera-based food recognition |

The app works fully without any env variables in development (localStorage only, no auth).

## Deployment

```bash
# Push to GitHub, then:
vercel deploy --prod
```

Or connect the repo in the Vercel dashboard for automatic deployments on push.

**Adding cloud sync:** Vercel dashboard > Storage > Create Database > Postgres > Connect. All `POSTGRES_*` vars are set automatically. Redeploy and sync is live.

## Scientific Basis

- **Periodization:** DUP produces superior strength gains in trained athletes vs. linear models (Grgic et al., 2024)
- **Volume:** 10-20 sets/muscle group/week is the evidence-based range for hypertrophy (Schoenfeld et al.)
- **Progression:** 5% load increase per wave cycle for intermediate lifters, RPE-gated
- **Recovery:** Personal HRV baselines with rolling 7-day averages, not population norms
- **Nutrition:** Post-workout protein timing has a flexible 2-3 hour window (current meta-analyses), not the old "30-minute anabolic window"
- **Combat sports:** Posterior chain strength transfers directly to grappling; grip endurance determines late-match outcomes

## Customization

### Adding Exercises

Edit `src/lib/exercises.ts`:

```typescript
{
  id: 'your-exercise',
  name: 'Your Exercise Name',
  category: 'compound',
  primaryMuscles: ['back', 'lats'],
  secondaryMuscles: ['biceps'],
  movementPattern: 'pull',
  equipmentRequired: ['full_gym'],
  grapplerFriendly: true,
  description: 'Exercise description',
  cues: ['Form cue 1', 'Form cue 2']
}
```

### Adding Badges

Edit `src/lib/gamification.ts`:

```typescript
{
  id: 'your-badge',
  name: 'Badge Name',
  description: 'How to earn it',
  icon: 'medal-icon',
  category: 'strength',
  requirement: 'personal_records >= 10',
  points: 500
}
```

## License

MIT

---

Built by Roots Collective for athletes who want to get stronger without sacrificing mat time.
