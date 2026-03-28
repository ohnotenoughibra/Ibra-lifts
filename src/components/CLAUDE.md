# src/components/ — UI Components

## Overview

89 component files, ~63,000 lines total. All are client components (`'use client'`). Most access the Zustand store directly via `useAppStore`.

## Large Components (Don't Read Entirely)

| Component | Lines | Has context file? |
|-----------|-------|-------------------|
| `ActiveWorkout.tsx` | ~4,100 | Yes — `ActiveWorkout.context.md` |
| `HomeTab.tsx` | ~2,900 | No |
| `NutritionTracker.tsx` | ~2,500 | No |
| `WearableIntegration.tsx` | ~2,100 | No |
| `ProgressTab.tsx` | ~1,960 | No |
| `GrapplingTracker.tsx` | ~1,630 | No |
| `ProfileSettings.tsx` | ~1,590 | No |
| `DietCoach.tsx` | ~1,550 | No |
| `SessionTemplates.tsx` | ~1,540 | No |

## Component Groups

### Page-Level (rendered as tabs in Dashboard)
- `Dashboard.tsx` (~930) — Tab container, navigation, sync status. Responsive desktop layout with sidebar nav at lg+ breakpoint
- `HomeTab.tsx` (~2,900) — Main landing, daily directive, quick actions
- `ProgressTab.tsx` (~1,960) — Analytics, charts, strength analysis
- `ExploreTab.tsx` (~500) — Feature discovery

### Workout
- `ActiveWorkout.tsx` (~4,100) — Live workout execution (the big one)
- `WorkoutBuilder.tsx` (~1,070) — Custom workout creation
- `WorkoutHistory.tsx` (~1,060) — Past workout browser
- `WorkoutView.tsx` (~1,280) — Workout detail view
- `SessionTemplates.tsx` (~1,540) — Save/load templates
- `CircuitBuilder.tsx` (~1,340) — Circuit/EMOM builder
- `ConditioningSession.tsx` (~1,160) — Conditioning workout logging

### Nutrition
- `NutritionTracker.tsx` (~2,500) — Meal logging, macro dashboard, water
- `BarcodeScanner.tsx` (~310) — Camera barcode scanner, OpenFoodFacts lookup, lazy-loaded
- `DietCoach.tsx` (~1,550) — Diet phase management, weekly check-ins
- `NutritionTrends.tsx` (~435) — Nutrition analytics
- `FightCampNutrition.tsx` (~490) — Competition nutrition
- `SupplementTracker.tsx` (~570) — Supplement stack tracking

### Recovery & Readiness
- `RecoveryCoach.tsx` (~360) — Recovery recommendations
- `RecoveryDashboard.tsx` (~850) — Recovery overview with wearable data
- `WearableIntegration.tsx` (~2,100) — Whoop connection + data display
- `SorenessCheck.tsx` (~630) — Muscle soreness tracking
- `FatigueOverlay.tsx` (~600) — Fatigue warnings

### Dashboard Insights
- `DashboardInsights.tsx` (~160) — Pulse strip: surfaces analysis engine previews (ACWR, fatigue, strength, volume, PRs, recovery) as compact tappable tiles on HomeTab. Uses `dashboard-insights.ts` engine.
- `TrainingLoadDashboard.tsx` (~280) — Full ACWR dashboard with zone bar, weekly load chart, 28-day heatmap, actionable CTAs

### Progress & Analytics
- `ProgressCharts.tsx` (~1,090) — Charts and visualizations
- `ProgressiveOverload.tsx` (~640) — Overload tracking
- `StrengthAnalysis.tsx` (~690) — Strength metrics
- `VolumeHeatMap.tsx` (~660) — Volume distribution
- `MesocycleReport.tsx` (~560) — End-of-block summary
- `MesocycleTimeline.tsx` (~470) — Visual timeline

### Combat Sport
- `CompetitionPrep.tsx` (~1,150) — Competition timeline, weight cut
- `GrapplingTracker.tsx` (~1,630) — BJJ/wrestling session logging
- `FightersMind.tsx` (~920) — Mental check-ins, confidence
- `WeightCutDashboard.tsx` (~350) — Weight cut progress

### Body Tracking
- `BodyWeightTracker.tsx` (~1,290) — Weight logging + trends
- `CycleTracking.tsx` (~350) — Menstrual cycle phases
- `GripStrengthModule.tsx` (~910) — Grip strength metrics
- `PhotoProgress.tsx` (~1,210) — Progress photos
- `InjuryLogger.tsx` (~1,070) — Injury tracking
- `IllnessLogger.tsx` (~1,060) — Illness tracking

### Training Planning
- `PeriodizationCalendar.tsx` (~500) — Calendar view
- `TrainingCalendar.tsx` (~800) — Weekly calendar
- `BlockSuggestion.tsx` (~550) — Next block recommendations
- `SplitAnalyzer.tsx` (~1,300) — Training split analysis

### Knowledge & Coaching
- `KnowledgeHub.tsx` (~490) — Article browser
- `WeeklyCoach.tsx` (~460) — Weekly AI coach summary
- `InsightCard.tsx` (~155) — Contextual insight display
- `CornerCoachInfo.tsx` (~180) — Between-set coaching

### Health & Wearable Import
- `HealthImport.tsx` — Apple Health / Google Fit import UI (file picker for XML, Google Fit OAuth flow)
- `NotificationSettings.tsx` — Push notification preferences (VAPID subscription, per-category toggles)

### Onboarding & Settings
- `Onboarding.tsx` (~680) — Multi-step onboarding flow
- `ProfileSettings.tsx` (~1,590) — Settings page
- `NewUserGuide.tsx` (~270) — First-time user tutorial

### UI Primitives
- `Toast.tsx` (~140) — Toast notifications
- `Skeleton.tsx` (~130) — Loading skeleton
- `LoadingScreen.tsx` (~80) — Full-page loader
- `CardErrorBoundary.tsx` (~39) — Error boundary wrapper
- `StatusBar.tsx` (~100) — App status bar

## Shared Patterns

### Store Access
Components use `useAppStore` with either `useShallow` for multiple fields or individual selectors:

```typescript
// Multiple fields (prevents unnecessary re-renders)
const { user, activeWorkout, workoutLogs } = useAppStore(
  useShallow(s => ({ user: s.user, activeWorkout: s.activeWorkout, workoutLogs: s.workoutLogs }))
);

// Single field (simple selector)
const meals = useAppStore(s => s.meals ?? []);
```

### Toast Pattern
Components import and use a shared toast system:
```typescript
import Toast from './Toast';
const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
```

### Modal Pattern
Modals are inline state-driven (no modal library):
```typescript
const [showModal, setShowModal] = useState(false);
// Render with AnimatePresence + motion.div backdrop
```

### Animation
Framer Motion (`motion`, `AnimatePresence`) is used throughout for transitions, page animations, and gesture handling.

### Icons
All icons from `lucide-react`. No other icon library.

### Mobile-First
- Touch gestures via `useSwipe` hook
- Pull-to-refresh via `usePullRefresh` hook
- Haptic feedback via `haptics.ts`
- Responsive Tailwind classes throughout
