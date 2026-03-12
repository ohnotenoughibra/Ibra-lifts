# Sport Scientist Feedback Audit

**Date**: 2026-03-11
**Source**: External sport scientist review

## Validated Strengths

1. **Workout execution UI** — Tempo/weight/RPE tracking is best-in-class
2. **Science Hub** — Evidence-based articles, well-curated
3. **Exercise search by muscle group** — Works well
4. **Performance tips** — Good engagement, credible content
5. **Superset engine exists** — `src/lib/superset-engine.ts` is built but not discoverable in UI

## Valid Criticisms

### P0 — Fix Now
- [x] **Template quality**: PPL, Upper/Lower, Full Body 3x templates rewritten with correct exercises, proper set counts (4 compounds, 3 accessories), clean rest periods (120s/180s/90s)
- [x] **Add strength endurance workout type**: Added `strength_endurance` to GoalFocus type — 12-20 reps, 30-60s rest, 40-60% 1RM. Propagated across 30+ files

### P1 — Next Sprint
- [x] **Surface superset UI**: `detectSupersetCandidates` wired into WorkoutBuilder with SupersetPair support and visual pairing
- [x] **Custom exercise name input**: `createCustomExercise()` + registry pattern in exercises.ts, store persistence for custom exercises
- [x] **Weekly calendar view on Home**: WeeklyCalendar.tsx component created, integrated into HomeTab showing Mon-Sun schedule
- [ ] **Program template preview**: Can't view day-by-day content before committing to a mesocycle

### P2 — Polish
- [x] **Clarify "Recreational Lifter" vs "General Fitness"**: Renamed to "Combat Athlete" / "Dedicated Lifter" / "Casual Training" with clear descriptions and "who it's for" text
- [x] **Training day selection in onboarding**: Tap-to-cycle day grid (Rest→Lift→Combat) added to onboarding step 2
- [x] **Round rest periods**: All template rest periods rounded to clean numbers. Diet phase multiplier also re-rounds to 15s increments
- [x] **"+" button tooltip**: First-time tooltip "Start a workout" appears 1.2s after load, auto-dismisses after 6s, persisted to localStorage
- [x] **"Change Workout" CTA on Program page**: "Explore Programs" button added to WorkoutView with Compass icon, navigates to Explore tab

### P3 — Future
- [ ] **Polar & Garmin integration**: Only Whoop exists. Polar/Garmin dominant in combat sports
- [ ] **Endurance & flexibility modules**: App is strength-only. No conditioning, cardio, or mobility

## Key Insight

The science foundation is strong. Templates are the public face of programming knowledge — if they're wrong, nothing else matters. Fix templates first, then surface hidden features (supersets, smart scheduling).
