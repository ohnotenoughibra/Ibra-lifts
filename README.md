# Grappler Gains

A science-based workout app designed for combat athletes (BJJ, wrestling, MMA) with limited lifting time. Built with Next.js, React, and Tailwind CSS.

## Features

### Core Training Features
- **Undulating Periodization**: Automatically varies training intensity (strength/hypertrophy/power) within each week for optimal gains
- **Grappler-Specific Programming**: Exercises chosen for functional carryover to grappling (deadlifts, rows, Turkish get-ups, grip work)
- **2-3 Sessions/Week**: Designed for athletes who need to balance lifting with mat time
- **Smart Progression**: RPE-based autoregulation with automatic deload suggestions

### Workout Types
- **Strength Days** (85-95% 1RM, 3-5 reps): Heavy compounds for maximal force production
- **Hypertrophy Days** (65-85% 1RM, 6-12 reps): Moderate volume for muscle growth
- **Power Days** (40-60% 1RM, explosive): Speed-strength for athletic performance

### Goal Options
- **Strength Focus**: Heavier loads, lower reps, compound-dominant
- **Aesthetics Focus**: Higher volume, more isolation work, emphasis on muscle definition
- **Balanced (Recommended)**: Best of both worlds, optimized for grappling performance

### Gamification System
- **Points**: Earn XP for completing workouts, hitting PRs, maintaining streaks
- **Levels**: Progress from Novice to Legendary Grappler
- **Badges**: 30+ achievements including "PR Crusher", "Iron Grip", "Turkish Master"
- **Streaks**: Track consistency with daily/weekly streak counters

### Analytics & Progress
- **Strength Tracking**: Estimated 1RM progress over time per exercise
- **Volume Analysis**: Weekly/monthly volume trends with muscle group breakdown
- **Insights**: AI-generated observations about your progress
- **PR Detection**: Automatic personal record recognition with celebrations

### Knowledge Hub
- **Science-Based Tips**: Pop-up tips during workouts based on current research
- **Educational Articles**: Deep dives on periodization, hypertrophy science, grappler-specific training
- **Form Cues**: Exercise-specific coaching cues from evidence-based sources

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: React 18 + Tailwind CSS
- **State Management**: Zustand with persistence
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Database**: Vercel Postgres (optional - works offline with localStorage)
- **Deployment**: Vercel

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/grappler-gains.git
cd grappler-gains

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

### Environment Variables

No env variables needed for local development. The app uses localStorage.

For cloud storage with Vercel Postgres, the env vars are **auto-set** when you add a database in the Vercel dashboard (see deployment steps below).

## Deployment on Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/grappler-gains)

### Manual Deployment

1. Push your code to GitHub
2. Import the project in Vercel
3. Deploy! (works immediately with localStorage)

### Adding Vercel Postgres (Optional - for cloud storage)

1. In your Vercel project dashboard, go to **Storage** tab
2. Click **Create Database** > **Postgres**
3. Select the free "Hobby" plan
4. Click **Connect** to link it to your project
5. Vercel automatically sets all `POSTGRES_*` env variables
6. Redeploy - the app will auto-detect the database and sync data

No manual env variable setup needed. Vercel handles it all.

## Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   │   ├── workout/       # Workout generation
│   │   ├── progress/      # Progress calculations
│   │   └── sync/          # Cloud sync (Vercel Postgres)
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── ActiveWorkout.tsx  # In-workout UI
│   ├── Dashboard.tsx      # Main dashboard
│   ├── KnowledgeHub.tsx   # Educational content
│   ├── LoadingScreen.tsx  # Loading state
│   ├── Onboarding.tsx     # User onboarding flow
│   ├── ProfileSettings.tsx# User profile & badges
│   ├── ProgressCharts.tsx # Analytics & charts
│   └── WorkoutView.tsx    # Program overview
└── lib/                   # Core logic
    ├── exercises.ts       # Exercise database (50+ exercises)
    ├── gamification.ts    # Points, badges, levels
    ├── knowledge.ts       # Tips & articles
    ├── store.ts           # Zustand state management
    ├── db.ts              # Vercel Postgres client
    ├── types.ts           # TypeScript types
    ├── utils.ts           # Utility functions
    └── workout-generator.ts# Periodization logic
```

## Scientific Basis

This app is built on evidence-based training principles from 2023-2025 research:

### Periodization
- Daily Undulating Periodization (DUP) produces superior strength gains in trained individuals compared to linear models (Grgic et al., 2024)
- Particularly effective for athletes training 2-3x per week

### Hypertrophy
- 10-20 sets per muscle group per week is optimal
- Training at long muscle lengths produces superior hypertrophy (2024-2025 studies)
- 3-4 second eccentrics increase muscle growth per set

### Grappling-Specific
- Posterior chain strength (deadlifts, rows) directly transfers to grappling
- Grip endurance often determines late-match outcomes
- Turkish Get-Ups train every ground position

## Customization

### Adding Exercises

Edit `src/lib/exercises.ts`:

```typescript
{
  id: 'your-exercise',
  name: 'Your Exercise Name',
  category: 'compound', // or 'isolation', 'power', 'grappling_specific', 'grip'
  primaryMuscles: ['back', 'lats'],
  secondaryMuscles: ['biceps'],
  movementPattern: 'pull',
  equipmentRequired: ['full_gym', 'home_gym'],
  grapplerFriendly: true,
  aestheticValue: 8,
  strengthValue: 9,
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
  icon: '🏆',
  category: 'strength',
  requirement: 'personal_records >= 10',
  points: 500
}
```

### Adding Knowledge Content

Edit `src/lib/knowledge.ts` to add tips or articles.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - feel free to use this for your own projects!

## Acknowledgments

- Training science from Dr. Mike Israetel, Dr. Eric Helms, and other researchers
- Grappling insights from athletes like Gordon Ryan and John Danaher
- UI inspiration from Renaissance Periodization app

---

Built with 💪 for grapplers who want to get stronger without sacrificing mat time.
